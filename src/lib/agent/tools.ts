import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import * as diff from 'diff';
import { PlanStep, FileChangeRecord } from './events';

const execAsync = promisify(exec);

// ──────────────────────────────────────────────────────────
// ZOD SCHEMAS FOR TOOLS
// ──────────────────────────────────────────────────────────

export const createPlanSchema = z.object({
  steps: z.array(z.string().min(1)).min(1).describe('Ordered checklist of steps to complete the task'),
});

export const updatePlanSchema = z.object({
  stepId: z.string().describe('ID of the step to update (e.g., step-1, step-2)'),
  status: z.enum(['pending', 'in_progress', 'done']).describe('New status for this step'),
});

export const listDirSchema = z.object({
  path: z.string().default('.').describe('Relative directory path inside the workspace'),
});

export const readFileSchema = z.object({
  path: z.string().describe('Relative path to the file to read'),
  startLine: z.number().int().positive().optional().describe('1-based start line (inclusive)'),
  endLine: z.number().int().positive().optional().describe('1-based end line (inclusive)'),
});

export const writeFileSchema = z.object({
  path: z.string().describe('Relative path to the file to create or overwrite'),
  content: z.string().describe('Complete text content to write to the file'),
});

export const editFileSchema = z.object({
  path: z.string().describe('Relative path to the existing file to edit'),
  oldStr: z.string().describe('Exact string to be replaced (must match existing content)'),
  newStr: z.string().describe('Replacement string'),
});

export const runCommandSchema = z.object({
  command: z.string().describe('Terminal command to execute inside workspace (e.g., npm init -y, npm install)'),
});

// ──────────────────────────────────────────────────────────
// OPENAI TOOL SPECIFICATIONS (FOR GROQ / OPENAI / ANTHROPIC)
// ──────────────────────────────────────────────────────────

export const AGENT_TOOLS_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_plan',
      description: 'Creates a structured step-by-step checklist of tasks required to fulfill the user request.',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ordered list of action items (e.g. ["Initialize project structure", "Install Tailwind CSS", "Create Hero component"])',
          },
        },
        required: ['steps'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_plan',
      description: 'Updates the progress status of a planned step (pending -> in_progress -> done).',
      parameters: {
        type: 'object',
        properties: {
          stepId: { type: 'string', description: 'Step identifier like "step-1"' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
        },
        required: ['stepId', 'status'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_dir',
      description: 'Lists all files and subdirectories in the specified workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path relative to workspace root (defaults to ".")' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Reads the content of a file within the workspace with optional line ranges.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path inside the workspace' },
          startLine: { type: 'integer', description: '1-based starting line number (optional)' },
          endLine: { type: 'integer', description: '1-based ending line number (optional)' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Creates a new file or completely writes over an existing file in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path to create (e.g. "src/components/Header.tsx")' },
          content: { type: 'string', description: 'Complete file contents to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Performs an exact search-and-replace edit on an existing workspace file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path inside workspace' },
          oldStr: { type: 'string', description: 'Exact string to be replaced' },
          newStr: { type: 'string', description: 'New replacement string' },
        },
        required: ['path', 'oldStr', 'newStr'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Executes a sandboxed shell command inside the workspace directory (e.g. npm install, node script.js).',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command line string to run' },
        },
        required: ['command'],
      },
    },
  },
];

// ──────────────────────────────────────────────────────────
// WORKSPACE SANDBOX & SECURITY
// ──────────────────────────────────────────────────────────

export class WorkspaceSandbox {
  public readonly workspaceRoot: string;

  constructor(userId = 'anonymous', sessionId = 'default') {
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'anonymous';
    const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
    
    // Support serverless /tmp on Vercel or cwd on local
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
    );
    const baseDir = isServerless ? '/tmp' : process.cwd();
    this.workspaceRoot = path.join(baseDir, 'workspaces', cleanUserId, cleanSessionId);

    if (!fs.existsSync(this.workspaceRoot)) {
      fs.mkdirSync(this.workspaceRoot, { recursive: true });
    }
  }

  /**
   * Safely resolve a path inside the workspace and reject any path traversal escape attempts
   */
  public resolveSafePath(relPath: string): string {
    const cleanRel = (relPath || '.').trim().replace(/^[/\\]+/, '');
    const absolute = path.resolve(this.workspaceRoot, cleanRel);

    const relative = path.relative(this.workspaceRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Security Violation: Path traversal outside workspace denied: "${relPath}"`);
    }

    // Check for symlink escapes if file exists
    if (fs.existsSync(absolute)) {
      const real = fs.realpathSync(absolute);
      const realRel = path.relative(this.workspaceRoot, real);
      if (realRel.startsWith('..')) {
        throw new Error(`Security Violation: Symlink escape outside workspace denied: "${relPath}"`);
      }
    }

    return absolute;
  }

  /**
   * Run command with security deny-list and timeout
   */
  public async executeCommand(
    command: string,
    timeoutMs = 60000,
    subDir = ''
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const trimmed = command.trim();

    // Security Deny-List
    const blockedPatterns = [
      /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f*|-f[a-zA-Z]*r[a-zA-Z]*)\s+(\/|~|\.\.\/)/i,
      /\bsudo\b/i,
      /\bcurl\b.*\|\s*(sh|bash)/i,
      /\bwget\b.*\|\s*(sh|bash)/i,
      /\b(cat|less|more|tail|head|grep)\s+.*\.env/i,
      /\bchmod\s+777/i,
      /\b(shutdown|reboot|init\s+0)\b/i,
      /\b:\(\)\s*\{/i, // fork bomb
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(trimmed)) {
        throw new Error(`Security Restriction: Command blocked for security reasons: "${command}"`);
      }
    }

    // Ensure workspace directory exists
    if (!fs.existsSync(this.workspaceRoot)) {
      await fs.promises.mkdir(this.workspaceRoot, { recursive: true });
    }

    let executionCwd = this.workspaceRoot;
    if (subDir && typeof subDir === 'string' && subDir !== '~') {
      try {
        const resolved = this.resolveSafePath(subDir);
        if (!fs.existsSync(resolved)) {
          await fs.promises.mkdir(resolved, { recursive: true });
        }
        executionCwd = resolved;
      } catch {
        executionCwd = this.workspaceRoot;
      }
    }

    // Sanitize environment variables so server secrets are NEVER exposed to child processes
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      HOME: this.workspaceRoot,
      USER: 'harpy-agent',
      NODE_ENV: 'development',
    };

    try {
      const { stdout, stderr } = await execAsync(trimmed, {
        cwd: executionCwd,
        env: safeEnv,
        timeout: timeoutMs,
        maxBuffer: 1024 * 512, // 512 KB output max
      });

      return {
        stdout: (stdout || '').slice(-8000), // keep latest 8000 characters
        stderr: (stderr || '').slice(-8000),
        exitCode: 0,
      };
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      return {
        stdout: (execErr.stdout || '').slice(-4000),
        stderr: (execErr.stderr || execErr.message || 'Command failed').slice(-4000),
        exitCode: typeof execErr.code === 'number' ? execErr.code : 1,
      };
    }
  }
}

// ──────────────────────────────────────────────────────────
// AGENT TOOL RUNNER
// ──────────────────────────────────────────────────────────

export class AgentToolRunner {
  private sandbox: WorkspaceSandbox;
  public plan: PlanStep[] = [];
  public filesChanged: Map<string, FileChangeRecord> = new Map();

  constructor(sandbox: WorkspaceSandbox) {
    this.sandbox = sandbox;
  }

  public async executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{
    status: 'success' | 'error';
    resultSummary: string;
    output?: string;
    exitCode?: number;
    filePath?: string;
    lineRange?: string;
    fileChange?: FileChangeRecord;
  }> {
    try {
      switch (name) {
        case 'create_plan': {
          const parsed = createPlanSchema.parse(args);
          this.plan = parsed.steps.map((title, idx) => ({
            id: `step-${idx + 1}`,
            title,
            status: idx === 0 ? ('in_progress' as const) : ('pending' as const),
          }));
          return {
            status: 'success',
            resultSummary: `Created plan with ${this.plan.length} steps`,
            output: JSON.stringify(this.plan),
          };
        }

        case 'update_plan': {
          const parsed = updatePlanSchema.parse(args);
          const cleanTarget = (parsed.stepId || '').toLowerCase().trim();
          let found = false;

          this.plan = this.plan.map((step, idx) => {
            const stepIdNorm = step.id.toLowerCase();
            const stepNum = `${idx + 1}`;
            if (
              stepIdNorm === cleanTarget ||
              cleanTarget === stepNum ||
              cleanTarget === `step ${stepNum}` ||
              cleanTarget === `step-${stepNum}` ||
              step.title.toLowerCase().includes(cleanTarget) ||
              cleanTarget.includes(step.title.toLowerCase())
            ) {
              found = true;
              return { ...step, status: parsed.status };
            }
            return step;
          });

          return {
            status: found ? 'success' : 'error',
            resultSummary: found
              ? `Updated ${parsed.stepId} to ${parsed.status}`
              : `Step ${parsed.stepId} not found in plan`,
            output: JSON.stringify(this.plan),
          };
        }

        case 'list_dir': {
          const parsed = listDirSchema.parse(args);
          const absPath = this.sandbox.resolveSafePath(parsed.path);
          if (!fs.existsSync(absPath)) {
            return { status: 'error', resultSummary: `Directory not found: ${parsed.path}` };
          }

          const entries = fs.readdirSync(absPath, { withFileTypes: true });
          const items = entries.map((e) => ({
            name: e.name,
            isDirectory: e.isDirectory(),
          }));

          return {
            status: 'success',
            resultSummary: `Listed ${items.length} items in ${parsed.path}`,
            output: items.map((i) => `${i.isDirectory ? '[DIR] ' : '      '}${i.name}`).join('\n'),
          };
        }

        case 'read_file': {
          const parsed = readFileSchema.parse(args);
          const absPath = this.sandbox.resolveSafePath(parsed.path);
          if (!fs.existsSync(absPath)) {
            return { status: 'error', resultSummary: `File not found: ${parsed.path}` };
          }

          const content = fs.readFileSync(absPath, 'utf-8');
          const lines = content.split('\n');

          const start = parsed.startLine ? Math.max(1, parsed.startLine) : 1;
          const end = parsed.endLine ? Math.min(lines.length, parsed.endLine) : lines.length;
          const slice = lines.slice(start - 1, end).join('\n');
          const lineRangeStr = `#L${start}-${end}`;

          return {
            status: 'success',
            resultSummary: `Analyzed ${path.basename(parsed.path)} ${lineRangeStr}`,
            output: slice,
            filePath: parsed.path,
            lineRange: lineRangeStr,
          };
        }

        case 'write_file': {
          const parsed = writeFileSchema.parse(args);
          const absPath = this.sandbox.resolveSafePath(parsed.path);

          const parentDir = path.dirname(absPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          const exists = fs.existsSync(absPath);
          const oldContent = exists ? fs.readFileSync(absPath, 'utf-8') : '';
          fs.writeFileSync(absPath, parsed.content, 'utf-8');

          // Compute exact diff lines
          const changes = diff.diffLines(oldContent, parsed.content);
          let added = 0;
          let removed = 0;
          for (const part of changes) {
            if (part.added) added += part.count || 0;
            if (part.removed) removed += part.count || 0;
          }

          const action = exists ? ('edited' as const) : ('created' as const);
          const record: FileChangeRecord = {
            path: parsed.path,
            action,
            addedLines: added,
            removedLines: removed,
            oldContent,
            newContent: parsed.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          this.filesChanged.set(parsed.path, record);

          return {
            status: 'success',
            resultSummary: `${action === 'created' ? 'Created' : 'Edited'} ${parsed.path} +${added} -${removed}`,
            output: `Wrote ${parsed.content.length} bytes to ${parsed.path}`,
            filePath: parsed.path,
            fileChange: record,
          };
        }

        case 'edit_file': {
          const parsed = editFileSchema.parse(args);
          const absPath = this.sandbox.resolveSafePath(parsed.path);

          if (!fs.existsSync(absPath)) {
            return { status: 'error', resultSummary: `File not found: ${parsed.path}` };
          }

          const currentContent = fs.readFileSync(absPath, 'utf-8');
          if (!currentContent.includes(parsed.oldStr)) {
            return {
              status: 'error',
              resultSummary: `Target string not found in ${parsed.path}`,
              output: 'The oldStr must exactly match existing content in the file.',
            };
          }

          const updatedContent = currentContent.replace(parsed.oldStr, parsed.newStr);
          fs.writeFileSync(absPath, updatedContent, 'utf-8');

          const changes = diff.diffLines(currentContent, updatedContent);
          let added = 0;
          let removed = 0;
          for (const part of changes) {
            if (part.added) added += part.count || 0;
            if (part.removed) removed += part.count || 0;
          }

          const record: FileChangeRecord = {
            path: parsed.path,
            action: 'edited',
            addedLines: added,
            removedLines: removed,
            oldContent: currentContent,
            newContent: updatedContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          this.filesChanged.set(parsed.path, record);

          return {
            status: 'success',
            resultSummary: `Edited ${parsed.path} +${added} -${removed}`,
            output: `Updated ${parsed.path}`,
            filePath: parsed.path,
            fileChange: record,
          };
        }

        case 'run_command': {
          const parsed = runCommandSchema.parse(args);
          const res = await this.sandbox.executeCommand(parsed.command);

          const summary = `Ran "${parsed.command}" (exit ${res.exitCode})`;
          const fullOutput = [res.stdout, res.stderr].filter(Boolean).join('\n').trim();

          return {
            status: res.exitCode === 0 ? 'success' : 'error',
            resultSummary: summary,
            output: fullOutput || 'No output produced',
            exitCode: res.exitCode,
          };
        }

        default:
          return { status: 'error', resultSummary: `Unknown tool: ${name}` };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tool execution error';
      return { status: 'error', resultSummary: `Failed to execute ${name}: ${message}` };
    }
  }
}
