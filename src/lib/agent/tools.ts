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
  stepId: z.string().describe('ID or number of the step to update (e.g., step-1, step-2)'),
  status: z.enum(['pending', 'in_progress', 'done']).describe('New status for this step'),
});

export const updateTodosSchema = z.object({
  todos: z.array(
    z.object({
      id: z.string().optional().describe('Step identifier (e.g. step-1)'),
      title: z.string().describe('Imperative title of the task'),
      status: z.enum(['pending', 'in_progress', 'done']).describe('Current status of this task'),
    })
  ).describe('Full list of todos or updated todos list'),
});

export const listDirSchema = z.object({
  path: z.string().default('.').describe('Relative directory path inside the workspace (defaults to ".")'),
});

export const readFileSchema = z.object({
  path: z.string().describe('Relative path to the file to read'),
  startLine: z.number().int().positive().optional().describe('1-based start line (inclusive)'),
  endLine: z.number().int().positive().optional().describe('1-based end line (inclusive)'),
});

export const grepSearchSchema = z.object({
  query: z.string().describe('Substring or regex pattern to search for across project files'),
  path: z.string().optional().default('.').describe('Subdirectory to restrict search to (defaults to root ".")'),
});

export const createFileSchema = z.object({
  path: z.string().describe('Relative file path for the NEW file to create. MUST NOT already exist.'),
  content: z.string().describe('Complete text content to write to the new file'),
});

export const writeFileSchema = z.object({
  path: z.string().describe('Relative file path to write'),
  content: z.string().describe('Complete text content to write to the file'),
});

export const editFileSchema = z.object({
  path: z.string().describe('Relative path to the existing file to edit'),
  old_str: z.string().describe('Exact string to be replaced (must match existing file content exactly once)'),
  new_str: z.string().describe('Replacement string'),
});

export const runCommandSchema = z.object({
  command: z.string().describe('Terminal command to execute inside workspace (e.g., npm install, npm test)'),
});

export const finishSchema = z.object({
  summary: z.string().describe('Executive summary of work accomplished, how to run the project, and files modified'),
});

// ──────────────────────────────────────────────────────────
// OPENAI & AGENT TOOL SPECIFICATIONS
// ──────────────────────────────────────────────────────────

export const AGENT_TOOLS_DEFINITIONS = [
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
      description: 'Reads the content of an existing file within the workspace. Records that the file has been inspected (mandatory before calling edit_file).',
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
      name: 'grep_search',
      description: 'Searches for text or regex patterns across files in the workspace (ignores node_modules and .git).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or regular expression to search for' },
          path: { type: 'string', description: 'Subdirectory path to search within (optional, defaults to ".")' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_file',
      description: 'Creates a brand NEW file in the workspace. FAILS if the file already exists (use edit_file for existing files).',
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
      description: 'Performs an exact search-and-replace edit on an existing workspace file. FAILS if the file was not read with read_file first in this session, or if old_str is not found exactly once.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path inside workspace' },
          old_str: { type: 'string', description: 'Exact string to be replaced (must appear exactly once in file)' },
          new_str: { type: 'string', description: 'New replacement string' },
        },
        required: ['path', 'old_str', 'new_str'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Executes a sandboxed shell command inside the workspace directory (e.g. npm install, npm test, node server.js).',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command line string to run' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_todos',
      description: 'Creates or updates the live todo checklist. Mark each todo pending, in_progress, or done as you work.',
      parameters: {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
              },
              required: ['title', 'status'],
            },
            description: 'The updated list of todo items',
          },
        },
        required: ['todos'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'finish',
      description: 'Marks the mission as finished. FAILS if any todo is incomplete, or if automated build/test verification fails.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Summary of changes made, how to run, and verification results' },
        },
        required: ['summary'],
      },
    },
  },
];

// Tool definitions for Read-Only Plan Mode (no file creation or modification)
export const AGENT_PLAN_TOOLS_DEFINITIONS = AGENT_TOOLS_DEFINITIONS.filter((t) =>
  ['list_dir', 'read_file', 'grep_search', 'update_todos', 'finish'].includes(t.function.name)
);

// ──────────────────────────────────────────────────────────
// WORKSPACE SANDBOX & SECURITY
// ──────────────────────────────────────────────────────────

export function isRiskyCommand(command: string): { isRisky: boolean; reason?: string } {
  const trimmed = command.trim();
  if (/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f*|-f[a-zA-Z]*r[a-zA-Z]*)/i.test(trimmed)) {
    return { isRisky: true, reason: 'Destructive recursive directory removal (rm -rf)' };
  }
  if (/\bgit\s+push\b.*(-f|--force)/i.test(trimmed)) {
    return { isRisky: true, reason: 'Force-pushing git repository changes' };
  }
  if (/\bnpm\s+(i|install)\s+(-g|--global)/i.test(trimmed) || /\byarn\s+global\b/i.test(trimmed)) {
    return { isRisky: true, reason: 'Global package installation' };
  }
  if (/\b(mkfs|dd|fdisk|shutdown|reboot)\b/i.test(trimmed)) {
    return { isRisky: true, reason: 'System-level operational command' };
  }
  return { isRisky: false };
}

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
   * Search workspace files for matching text or regex
   */
  public grepSearch(
    query: string,
    subDir = '.'
  ): { matches: Array<{ file: string; line: number; text: string }>; totalMatches: number } {
    const targetDir = this.resolveSafePath(subDir);
    if (!fs.existsSync(targetDir)) {
      return { matches: [], totalMatches: 0 };
    }

    let regex: RegExp;
    try {
      regex = new RegExp(query, 'i');
    } catch {
      regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const matches: Array<{ file: string; line: number; text: string }> = [];
    const maxMatches = 50;

    const walk = (dir: string) => {
      if (matches.length >= maxMatches) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === '.next' ||
          entry.name === 'dist' ||
          entry.name === 'build'
        ) {
          continue;
        }

        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          try {
            // Only search text files < 1MB
            const stat = fs.statSync(full);
            if (stat.size > 1024 * 1024) continue;

            const content = fs.readFileSync(full, 'utf-8');
            const lines = content.split('\n');
            const relFile = path.relative(this.workspaceRoot, full);

            for (let idx = 0; idx < lines.length; idx++) {
              if (regex.test(lines[idx])) {
                matches.push({
                  file: relFile,
                  line: idx + 1,
                  text: lines[idx].trim().slice(0, 200),
                });
                if (matches.length >= maxMatches) break;
              }
            }
          } catch {}
        }
      }
    };

    walk(targetDir);
    return { matches, totalMatches: matches.length };
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

    // Deny-List for catastrophic exploits
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
        stdout: (stdout || '').slice(-8000),
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
// AGENT TOOL RUNNER WITH GUARDRAILS & VERIFICATION
// ──────────────────────────────────────────────────────────

export class AgentToolRunner {
  public sandbox: WorkspaceSandbox;
  public plan: PlanStep[] = [];
  public filesChanged: Map<string, FileChangeRecord> = new Map();
  public sessionReadFiles: Set<string> = new Set();
  public planMode = false;
  public onPlanUpdate?: (steps: PlanStep[]) => void;
  public onApprovalRequired?: (req: { id: string; command: string; reason: string }) => Promise<boolean>;

  constructor(sandbox: WorkspaceSandbox) {
    this.sandbox = sandbox;
  }

  private normalizeRelPath(p: string): string {
    return (p || '.').trim().replace(/^[/\\]+/, '');
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
      // Map SDK / Claude Code aliases to canonical tools
      let canonicalName = name;
      if (name === 'Read') canonicalName = 'read_file';
      else if (name === 'Edit') canonicalName = 'edit_file';
      else if (name === 'Write') canonicalName = 'create_file';
      else if (name === 'Glob') canonicalName = 'list_dir';
      else if (name === 'Grep') canonicalName = 'grep_search';
      else if (name === 'Bash') canonicalName = 'run_command';
      else if (name === 'TaskCreate' || name === 'TaskUpdate') canonicalName = 'update_todos';

      // In Plan Mode, strictly block any file modifications
      if (this.planMode && (canonicalName === 'create_file' || canonicalName === 'edit_file')) {
        return {
          status: 'error',
          resultSummary: `Blocked ${canonicalName}: Plan Mode is Read-Only`,
          output: `Operation blocked: You are currently in Plan Mode (Read-Only). You cannot create or edit files in Plan Mode. Please formulate your plan using update_todos and wait for the user to approve execution.`,
        };
      }

      switch (canonicalName) {
        case 'create_plan': {
          const parsed = createPlanSchema.parse(args);
          this.plan = parsed.steps.map((title, idx) => ({
            id: `step-${idx + 1}`,
            title,
            status: idx === 0 ? ('in_progress' as const) : ('pending' as const),
          }));
          this.onPlanUpdate?.(this.plan);
          return {
            status: 'success',
            resultSummary: `Formulated execution plan with ${this.plan.length} steps`,
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

          this.onPlanUpdate?.(this.plan);

          return {
            status: found ? 'success' : 'error',
            resultSummary: found
              ? `Updated ${parsed.stepId} to ${parsed.status}`
              : `Step ${parsed.stepId} not found in plan`,
            output: JSON.stringify(this.plan),
          };
        }

        case 'update_todos': {
          let updatedTodos: PlanStep[] = [];
          if (Array.isArray(args.todos)) {
            const parsed = updateTodosSchema.parse(args);
            updatedTodos = parsed.todos.map((t, idx) => ({
              id: t.id || `step-${idx + 1}`,
              title: t.title,
              status: t.status,
            }));
          } else if (args.taskId || args.id || args.stepId) {
            // TaskUpdate / TaskCreate single update compatibility
            const targetId = String(args.taskId || args.id || args.stepId);
            const status = String(args.status || 'in_progress') as 'pending' | 'in_progress' | 'done';
            const subject = String(args.subject || args.title || '');

            let found = false;
            updatedTodos = this.plan.map((s) => {
              if (s.id === targetId || s.title.includes(targetId)) {
                found = true;
                return { ...s, status, ...(subject ? { title: subject } : {}) };
              }
              return s;
            });

            if (!found && subject) {
              updatedTodos.push({
                id: targetId.startsWith('step-') ? targetId : `step-${updatedTodos.length + 1}`,
                title: subject,
                status,
              });
            }
          }

          if (updatedTodos.length > 0) {
            this.plan = updatedTodos;
            this.onPlanUpdate?.(this.plan);
            return {
              status: 'success',
              resultSummary: `Updated todos (${this.plan.filter((s) => s.status === 'done').length}/${this.plan.length} complete)`,
              output: JSON.stringify(this.plan),
            };
          }

          return {
            status: 'error',
            resultSummary: 'No valid todos provided in update_todos call',
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
          const cleanRel = this.normalizeRelPath(parsed.path);
          const absPath = this.sandbox.resolveSafePath(cleanRel);

          if (!fs.existsSync(absPath)) {
            return { status: 'error', resultSummary: `File not found: ${parsed.path}` };
          }

          // Mark file as read in this session (guardrail requirement for edit_file)
          this.sessionReadFiles.add(cleanRel);

          const content = fs.readFileSync(absPath, 'utf-8');
          const lines = content.split('\n');

          const start = parsed.startLine ? Math.max(1, parsed.startLine) : 1;
          const end = parsed.endLine ? Math.min(lines.length, parsed.endLine) : lines.length;
          const slice = lines.slice(start - 1, end).join('\n');
          const lineRangeStr = `#L${start}-${end}`;

          return {
            status: 'success',
            resultSummary: `Analyzed ${path.basename(cleanRel)} ${lineRangeStr}`,
            output: slice,
            filePath: cleanRel,
            lineRange: lineRangeStr,
          };
        }

        case 'grep_search': {
          const parsed = grepSearchSchema.parse(args);
          const res = this.sandbox.grepSearch(parsed.query, parsed.path);

          if (res.matches.length === 0) {
            return {
              status: 'success',
              resultSummary: `No matches found for "${parsed.query}"`,
              output: `No occurrences of "${parsed.query}" found.`,
            };
          }

          const formatted = res.matches
            .map((m) => `${m.file}:${m.line}: ${m.text}`)
            .join('\n');

          return {
            status: 'success',
            resultSummary: `Found ${res.totalMatches} matches for "${parsed.query}"`,
            output: formatted,
          };
        }

        case 'create_file': {
          const rawPath = String(args.path || '');
          const rawContent = String(args.content ?? '');
          const cleanRel = this.normalizeRelPath(rawPath);
          const absPath = this.sandbox.resolveSafePath(cleanRel);

          // GUARDRAIL: create_file must FAIL if the file exists
          if (fs.existsSync(absPath)) {
            return {
              status: 'error',
              resultSummary: `create_file failed: File exists. Use edit_file instead.`,
              output: `File "${cleanRel}" already exists. Use edit_file to modify existing files with targeted search-and-replace edits.`,
              filePath: cleanRel,
            };
          }

          const parentDir = path.dirname(absPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          fs.writeFileSync(absPath, rawContent, 'utf-8');
          this.sessionReadFiles.add(cleanRel);

          const changes = diff.diffLines('', rawContent);
          let added = 0;
          for (const part of changes) {
            if (part.added) added += part.count || 0;
          }

          const record: FileChangeRecord = {
            path: cleanRel,
            action: 'created',
            addedLines: added,
            removedLines: 0,
            oldContent: '',
            newContent: rawContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          this.filesChanged.set(cleanRel, record);

          return {
            status: 'success',
            resultSummary: `Created ${cleanRel} (+${added} lines)`,
            output: `Successfully created ${cleanRel} (${rawContent.length} bytes)`,
            filePath: cleanRel,
            fileChange: record,
          };
        }

        case 'write_file': {
          // write_file compatibility wrapper: redirects existing files to edit_file warning if exists
          const rawPath = String(args.path || '');
          const rawContent = String(args.content ?? '');
          const cleanRel = this.normalizeRelPath(rawPath);
          const absPath = this.sandbox.resolveSafePath(cleanRel);

          const exists = fs.existsSync(absPath);
          if (exists) {
            return {
              status: 'error',
              resultSummary: `write_file blocked: File exists. Use edit_file instead.`,
              output: `File "${cleanRel}" exists. In Antigravity / Claude Code agent mode, you must NOT overwrite entire existing files. Use read_file to inspect it, then call edit_file with exact targeted search-and-replace old_str and new_str.`,
              filePath: cleanRel,
            };
          }

          return await this.executeTool('create_file', { path: cleanRel, content: rawContent });
        }

        case 'edit_file': {
          const rawPath = String(args.path || '');
          const oldStr = String(args.old_str ?? args.oldStr ?? '');
          const newStr = String(args.new_str ?? args.newStr ?? '');

          const cleanRel = this.normalizeRelPath(rawPath);
          const absPath = this.sandbox.resolveSafePath(cleanRel);

          if (!fs.existsSync(absPath)) {
            return {
              status: 'error',
              resultSummary: `File not found: ${cleanRel}`,
              output: `File "${cleanRel}" does not exist. Use create_file to create new files.`,
            };
          }

          // GUARDRAIL 1: edit_file must FAIL if the file was not read first in this session
          if (!this.sessionReadFiles.has(cleanRel)) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: File must be read first.`,
              output: `File "${cleanRel}" has not been read in this session. You must inspect the file with read_file before performing edits.`,
              filePath: cleanRel,
            };
          }

          const currentContent = fs.readFileSync(absPath, 'utf-8');

          // GUARDRAIL 2: edit_file must FAIL if old_str is not found exactly once
          const matches = currentContent.split(oldStr).length - 1;
          if (matches === 0) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: old_str not found in ${cleanRel}.`,
              output: `The old_str was not found in "${cleanRel}". Use read_file to view the exact current contents and ensure whitespace and character sequences match identically.`,
              filePath: cleanRel,
            };
          }

          if (matches > 1) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: old_str found ${matches} times in ${cleanRel}.`,
              output: `The old_str occurred ${matches} times in "${cleanRel}". It must match uniquely (exactly once). Include more surrounding context lines in old_str to make it unambiguous.`,
              filePath: cleanRel,
            };
          }

          // Replace single exact occurrence
          const updatedContent = currentContent.replace(oldStr, newStr);
          fs.writeFileSync(absPath, updatedContent, 'utf-8');

          const changes = diff.diffLines(currentContent, updatedContent);
          let added = 0;
          let removed = 0;
          for (const part of changes) {
            if (part.added) added += part.count || 0;
            if (part.removed) removed += part.count || 0;
          }

          const record: FileChangeRecord = {
            path: cleanRel,
            action: 'edited',
            addedLines: added,
            removedLines: removed,
            oldContent: currentContent,
            newContent: updatedContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          this.filesChanged.set(cleanRel, record);

          return {
            status: 'success',
            resultSummary: `Edited ${cleanRel} (+${added} -${removed})`,
            output: `Successfully updated ${cleanRel}`,
            filePath: cleanRel,
            fileChange: record,
          };
        }

        case 'run_command': {
          const parsed = runCommandSchema.parse(args);
          const riskyCheck = isRiskyCommand(parsed.command);

          // GUARDRAIL: Risky commands require user approval
          if (riskyCheck.isRisky && this.onApprovalRequired) {
            const approved = await this.onApprovalRequired({
              id: `approval_${Date.now()}`,
              command: parsed.command,
              reason: riskyCheck.reason || 'Command poses potential system or repository risk',
            });

            if (!approved) {
              return {
                status: 'error',
                resultSummary: `Command rejected by user: "${parsed.command}"`,
                output: `User declined permission to run risky command: "${parsed.command}". Suggest an alternative approach.`,
                exitCode: 1,
              };
            }
          }

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

        case 'finish': {
          const parsed = finishSchema.parse(args);

          // GUARDRAIL 0: In Execute Mode, finish must FAIL if no application UI/logic was built
          if (!this.planMode) {
            const hasAppFiles = Array.from(this.filesChanged.keys()).some((k) =>
              /(app|page|todo|main)\.(jsx|tsx|js)|index\.html/i.test(k)
            );
            if (!hasAppFiles && this.filesChanged.size > 0) {
              return {
                status: 'error',
                resultSummary: 'finish failed: Core application UI files have not been created yet.',
                output: `Cannot finish yet! You have only created configuration files. You MUST create the actual application components with full working UI (e.g. "index.html" and "src/App.jsx" or "src/app/page.tsx") containing all features requested by the user before calling finish.`,
              };
            }
          }

          // GUARDRAIL 1: finish must FAIL while any todo is incomplete
          const incompleteTodos = this.plan.filter((s) => s.status !== 'done');
          if (incompleteTodos.length > 0) {
            return {
              status: 'error',
              resultSummary: `finish failed: ${incompleteTodos.length} incomplete todos remain.`,
              output: `Cannot finish while todos are still incomplete. Incomplete items:\n${incompleteTodos.map((t) => `- [${t.status.toUpperCase()}] ${t.title}`).join('\n')}\nExecute each remaining task, mark it done with update_todos, and verify before calling finish.`,
            };
          }

          // GUARDRAIL 2: Automatically run project build verification
          const pkgPath = path.join(this.sandbox.workspaceRoot, 'package.json');
          if (fs.existsSync(pkgPath)) {
            let hasBuildScript = false;
            try {
              const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
              hasBuildScript = Boolean(pkgJson?.scripts?.build || pkgJson?.scripts?.test);
            } catch {}

            if (hasBuildScript) {
              const testCmd = 'npm test --if-present && npm run build --if-present';
              const verifyRes = await this.sandbox.executeCommand(testCmd, 60000);
              if (verifyRes.exitCode !== 0) {
                const combined = [verifyRes.stderr, verifyRes.stdout].filter(Boolean).join('\n');
                return {
                  status: 'error',
                  resultSummary: `finish failed: Build verification error (exit ${verifyRes.exitCode}).`,
                  output: `Automated build verification check failed! You must fix the compile / build errors before finishing:\n\n${combined.slice(-2500)}`,
                  exitCode: verifyRes.exitCode,
                };
              }
            }
          }

          return {
            status: 'success',
            resultSummary: 'Mission finished. All todos completed and build verified.',
            output: parsed.summary,
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
