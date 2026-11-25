import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import * as diff from 'diff';
import { PlanStep, PlanSpecification, VerificationCheckResult, FileChangeRecord } from './events';

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

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
      description: 'Marks the mission as finished AFTER verification. FAILS if any todo is incomplete, deliverables are missing, existing untouched files were altered, or syntax/build verification fails.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Concise summary of exact changes made, verification checks run, and how to run the project' },
        },
        required: ['summary'],
      },
    },
  },
];

export const submitPlanSchema = z.object({
  summary: z.string(),
  steps: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string(),
      detail: z.string().optional(),
      targetFiles: z.array(z.string()).optional(),
    })
  ),
  filesToCreate: z.array(z.string()).optional(),
  filesToModify: z.array(z.string()).optional(),
  verificationSteps: z.array(z.string()).optional(),
});

// Tool definitions for Read-Only Plan Mode (strictly NO file creation, edits, or shell mutations)
export const AGENT_PLAN_TOOLS_DEFINITIONS = [
  ...AGENT_TOOLS_DEFINITIONS.filter((t) =>
    ['list_dir', 'read_file', 'grep_search', 'update_todos'].includes(t.function.name)
  ),
  {
    type: 'function' as const,
    function: {
      name: 'submit_plan',
      description:
        'Finalize and submit the structured implementation plan for user approval in Plan Mode AFTER read-only workspace exploration is complete.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Concise technical summary of the implementation approach tailored to the user request.',
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                detail: { type: 'string' },
                targetFiles: { type: 'array', items: { type: 'string' } },
              },
              required: ['title'],
            },
            description: 'Ordered step-by-step execution checklist.',
          },
          filesToCreate: {
            type: 'array',
            items: { type: 'string' },
            description: 'Brand-new file paths to create during execution.',
          },
          filesToModify: {
            type: 'array',
            items: { type: 'string' },
            description: 'Existing file paths to surgically edit during execution.',
          },
          verificationSteps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Checks or commands to run after execution.',
          },
        },
        required: ['summary', 'steps'],
      },
    },
  },
];

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

export function detectProtectedFileShellMutation(
  command: string,
  protectedPaths: string[],
  allowedDeleteOrOverwrite: Set<string>
): { blocked: boolean; reason?: string } {
  const normalizedCmd = command.trim();
  for (const relPath of protectedPaths) {
    if (allowedDeleteOrOverwrite.has(relPath)) continue;
    const escaped = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const baseName = path.posix.basename(relPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filePattern = `(?:\\.?/)?(?:${escaped}|${baseName})`;

    const patterns = [
      new RegExp(`(^|[;&|]\\s*)rm\\s+[^;&|]*\\b${filePattern}(\\s|$|[;&|])`, 'i'),
      new RegExp(`(^|[;&|]\\s*)(?:unlink|truncate)\\s+[^;&|]*\\b${filePattern}(\\s|$|[;&|])`, 'i'),
      new RegExp(`(?:^|[^>])>\\|?\\s*['"]?${filePattern}['"]?(?:\\s|$|[;&|])`, 'i'),
      new RegExp(`\\btee\\s+(?:-a\\s+)?[^;&|]*['"]?${filePattern}['"]?(?:\\s|$|[;&|])`, 'i'),
      new RegExp(`\\bsed\\s+-i[^;&|]*['"]?${filePattern}['"]?(?:\\s|$|[;&|])`, 'i'),
      new RegExp(`\\bmv\\s+[^;&|]*\\b${filePattern}(\\s|$|[;&|])`, 'i'),
    ];

    if (patterns.some((re) => re.test(normalizedCmd))) {
      return {
        blocked: true,
        reason: `Command targets protected existing file "${relPath}". Never overwrite or delete existing files via shell commands unless explicitly asked by the user; use read_file + edit_file instead.`,
      };
    }
  }
  return { blocked: false };
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

export interface BaselineFileState {
  content: string;
  hash: string;
}

export interface FileCheckpointEntry {
  tool: string;
  timestamp: string;
  existed: boolean;
  content: string | null;
  hash: string | null;
}

export class AgentToolRunner {
  public sandbox: WorkspaceSandbox;
  public plan: PlanStep[] = [];
  public filesChanged: Map<string, FileChangeRecord> = new Map();
  public sessionReadFiles: Set<string> = new Set();
  public baselineFiles: Map<string, BaselineFileState> = new Map();
  public fileCheckpoints: Map<string, FileCheckpointEntry[]> = new Map();
  public explicitlyAllowedDeletions: Set<string> = new Set();
  public explicitlyAllowedOverwrites: Set<string> = new Set();
  public userGoal = '';
  public submittedPlanSpec?: PlanSpecification;
  public lastVerificationChecks: VerificationCheckResult[] = [];
  public planMode = false;
  public onPlanUpdate?: (steps: PlanStep[]) => void;
  public onApprovalRequired?: (req: { id: string; command: string; reason: string }) => Promise<boolean>;

  constructor(sandbox: WorkspaceSandbox) {
    this.sandbox = sandbox;
  }

  private normalizeRelPath(p: string): string {
    const posix = (p || '.').trim().replace(/\\/g, '/');
    const normalized = path.posix.normalize(posix).replace(/^(\.\/)+/, '').replace(/^\/+/, '');
    return normalized || '.';
  }

  public setUserGoal(goal: string) {
    this.userGoal = goal || '';
    this.explicitlyAllowedDeletions.clear();
    this.explicitlyAllowedOverwrites.clear();
    const g = this.userGoal.toLowerCase();
    for (const rel of this.baselineFiles.keys()) {
      const base = path.posix.basename(rel).toLowerCase();
      const escapedRel = rel.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePattern = `(?:${escapedRel}|${escapedBase})`;
      if (new RegExp(`\\b(?:delete|remove|unlink|drop)\\b[^.!?\\n]{0,40}\\b${namePattern}\\b`, 'i').test(g)) {
        this.explicitlyAllowedDeletions.add(rel);
      }
      if (new RegExp(`\\b(?:overwrite|rewrite|replace\\s+(?:all|entire)|recreate|start\\s+fresh)\\b[^.!?\\n]{0,40}\\b${namePattern}\\b`, 'i').test(g)) {
        this.explicitlyAllowedOverwrites.add(rel);
      }
    }
  }

  public registerBaselineFile(relPath: string, content: string) {
    const clean = this.normalizeRelPath(relPath);
    if (!clean || clean === '.' || clean === 'AGENTS.md') return;
    this.baselineFiles.set(clean, { content, hash: sha256(content) });
    if (this.userGoal) this.setUserGoal(this.userGoal);
  }

  public snapshotDiskBaseline() {
    const walk = (dir: string, relBase: string) => {
      if (!fs.existsSync(dir)) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === '.next' ||
          entry.name === 'dist'
        ) {
          continue;
        }
        const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(abs, rel);
        } else {
          const clean = this.normalizeRelPath(rel);
          if (clean === 'AGENTS.md') continue;
          try {
            const content = fs.readFileSync(abs, 'utf-8');
            if (!this.baselineFiles.has(clean)) {
              this.baselineFiles.set(clean, { content, hash: sha256(content) });
            }
          } catch {}
        }
      }
    };
    walk(this.sandbox.workspaceRoot, '');
    if (this.userGoal) this.setUserGoal(this.userGoal);
  }

  private captureCheckpoint(relPath: string, toolName: string) {
    const clean = this.normalizeRelPath(relPath);
    if (!clean || clean === '.') return;
    try {
      const abs = this.sandbox.resolveSafePath(clean);
      const existed = fs.existsSync(abs);
      const content = existed ? fs.readFileSync(abs, 'utf-8') : null;
      const list = this.fileCheckpoints.get(clean) || [];
      list.push({
        tool: toolName,
        timestamp: new Date().toISOString(),
        existed,
        content,
        hash: content !== null ? sha256(content) : null,
      });
      this.fileCheckpoints.set(clean, list);
    } catch {}
  }

  private snapshotAllProtectedBeforeCommand(): Map<string, string> {
    const snap = new Map<string, string>();
    for (const [rel, state] of this.baselineFiles.entries()) {
      const changed = this.filesChanged.get(rel);
      if (changed && changed.action !== 'deleted' && typeof changed.newContent === 'string') {
        snap.set(rel, changed.newContent);
      } else {
        try {
          const abs = this.sandbox.resolveSafePath(rel);
          snap.set(rel, fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : state.content);
        } catch {
          snap.set(rel, state.content);
        }
      }
    }
    for (const [rel, rec] of this.filesChanged.entries()) {
      if (rec.action !== 'deleted' && typeof rec.newContent === 'string' && !snap.has(rel)) {
        snap.set(rel, rec.newContent);
      }
    }
    return snap;
  }

  public verifyWorkspacePreservation(
    intentionallyTouchedRel?: string,
    preCommandSnapshot?: Map<string, string>
  ): { ok: boolean; violations: string[] } {
    const violations: string[] = [];
    const expectedMap = preCommandSnapshot || new Map<string, string>();

    if (!preCommandSnapshot) {
      for (const [rel, state] of this.baselineFiles.entries()) {
        const rec = this.filesChanged.get(rel);
        if (rec && rec.action !== 'deleted' && typeof rec.newContent === 'string') {
          expectedMap.set(rel, rec.newContent);
        } else if (!rec || rec.action !== 'deleted') {
          expectedMap.set(rel, state.content);
        }
      }
    }

    for (const [rel, expectedContent] of expectedMap.entries()) {
      if (rel === intentionallyTouchedRel) continue;
      if (this.explicitlyAllowedDeletions.has(rel)) continue;
      try {
        const abs = this.sandbox.resolveSafePath(rel);
        if (!fs.existsSync(abs)) {
          fs.mkdirSync(path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, expectedContent, 'utf-8');
          violations.push(`Existing file "${rel}" was unexpectedly deleted and has been automatically restored.`);
          continue;
        }
        const diskContent = fs.readFileSync(abs, 'utf-8');
        if (sha256(diskContent) !== sha256(expectedContent) && !this.explicitlyAllowedOverwrites.has(rel)) {
          fs.writeFileSync(abs, expectedContent, 'utf-8');
          violations.push(`Existing file "${rel}" was unexpectedly overwritten outside targeted edit_file and has been restored.`);
        }
      } catch {}
    }

    return { ok: violations.length === 0, violations };
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
    verificationChecks?: VerificationCheckResult[];
  }> {
    try {
      // Map SDK / Claude Code aliases to canonical tools
      let canonicalName = name;
      if (name === 'Read') canonicalName = 'read_file';
      else if (name === 'Edit' || name === 'MultiEdit') canonicalName = 'edit_file';
      else if (name === 'Write') canonicalName = 'create_file';
      else if (name === 'Glob') canonicalName = 'list_dir';
      else if (name === 'Grep') canonicalName = 'grep_search';
      else if (name === 'Bash') canonicalName = 'run_command';
      else if (name === 'TodoWrite' || name === 'TaskCreate' || name === 'TaskUpdate') canonicalName = 'update_todos';
      else if (name === 'ExitPlanMode') canonicalName = 'submit_plan';

      // In Plan Mode, strictly enforce Read-Only isolation (no file writes, edits, deletions, or shell commands)
      if (
        this.planMode &&
        ['create_file', 'write_file', 'edit_file', 'delete_file', 'run_command'].includes(canonicalName)
      ) {
        return {
          status: 'error',
          resultSummary: `Blocked ${canonicalName}: Plan Mode is strictly Read-Only`,
          output: `Operation blocked: You are in Plan Mode (Read-Only). You MUST NOT create, edit, or delete files or execute shell commands in Plan Mode. Inspect existing files with list_dir/read_file/grep_search, formulate todos with update_todos, and finalize with submit_plan.`,
        };
      }

      switch (canonicalName) {
        case 'submit_plan': {
          const parsed = submitPlanSchema.parse(args);
          this.plan = parsed.steps.map((s, idx) => ({
            id: s.id || `step-${idx + 1}`,
            title: s.title,
            status: 'pending' as const,
            ...(s.detail ? { detail: s.detail } : {}),
            ...(s.targetFiles ? { targetFiles: s.targetFiles } : {}),
          }));
          this.submittedPlanSpec = {
            summary: parsed.summary,
            steps: this.plan,
            filesToCreate: parsed.filesToCreate || [],
            filesToModify: parsed.filesToModify || [],
            verificationSteps: parsed.verificationSteps || [],
            originalPrompt: this.userGoal,
          };
          this.onPlanUpdate?.(this.plan);
          return {
            status: 'success',
            resultSummary: `Submitted implementation plan (${this.plan.length} steps)`,
            output: JSON.stringify(this.submittedPlanSpec, null, 2),
          };
        }

        case 'create_plan': {
          const parsed = createPlanSchema.parse(args);
          this.plan = parsed.steps.map((title, idx) => ({
            id: `step-${idx + 1}`,
            title,
            status: this.planMode ? ('pending' as const) : idx === 0 ? ('in_progress' as const) : ('pending' as const),
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
          const normalizeStatus = (raw: unknown): 'pending' | 'in_progress' | 'done' => {
            const s = String(raw || 'pending').toLowerCase().trim();
            if (s === 'completed' || s === 'done' || s === 'finished') return 'done';
            if (s === 'in_progress' || s === 'active' || s === 'running') return 'in_progress';
            return 'pending';
          };

          let updatedTodos: PlanStep[] = [];
          if (Array.isArray(args.todos) || Array.isArray(args.tasks) || Array.isArray(args.steps)) {
            const rawList = (args.todos || args.tasks || args.steps) as Array<Record<string, unknown>>;
            updatedTodos = rawList
              .filter((t) => t && (t.title || t.content || t.subject || t.activeForm))
              .map((t, idx) => ({
                id: String(t.id || t.taskId || `step-${idx + 1}`),
                title: String(t.title || t.content || t.subject || t.activeForm),
                status: normalizeStatus(t.status),
              }));
          } else if (args.taskId || args.id || args.stepId || args.subject || args.title) {
            const targetId = String(args.taskId || args.id || args.stepId || '');
            const status = normalizeStatus(args.status || (args.taskId ? 'in_progress' : 'pending'));
            const subject = String(args.subject || args.title || args.content || '');

            let found = false;
            updatedTodos = this.plan.map((s) => {
              if (targetId && (s.id === targetId || s.title.toLowerCase().includes(targetId.toLowerCase()))) {
                found = true;
                return { ...s, status, ...(subject ? { title: subject } : {}) };
              }
              return s;
            });

            if (!found && subject) {
              updatedTodos.push({
                id: targetId && targetId.startsWith('step-') ? targetId : `step-${updatedTodos.length + 1}`,
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
          const cleanDir = this.normalizeRelPath(parsed.path);
          const absPath = this.sandbox.resolveSafePath(cleanDir);
          if (!fs.existsSync(absPath)) {
            return { status: 'error', resultSummary: `Directory not found: ${parsed.path}` };
          }

          const entries = fs
            .readdirSync(absPath, { withFileTypes: true })
            .filter((e) => !e.name.startsWith('.harpy') && e.name !== 'node_modules' && e.name !== '.git');
          const items = entries
            .map((e) => ({
              name: e.name,
              isDirectory: e.isDirectory(),
            }))
            .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));

          return {
            status: 'success',
            resultSummary: `Listed ${items.length} items in ${cleanDir}`,
            output:
              items.length > 0
                ? items.map((i) => `${i.isDirectory ? '[DIR] ' : '      '}${i.name}`).join('\n')
                : `(empty directory "${cleanDir}" — 0 files)`,
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
          if (!cleanRel || cleanRel === '.' || cleanRel.endsWith('/')) {
            return {
              status: 'error',
              resultSummary: 'create_file failed: Invalid file path',
              output: `Invalid file path "${rawPath}". Provide a valid relative file path (e.g., "style.css" or "src/app.js").`,
            };
          }

          if (
            /\/\/\s*\.\.\.\s*(?:rest of code|existing code|remaining code)|\/\*\s*\.\.\.\s*(?:rest of|existing)/i.test(
              rawContent
            )
          ) {
            return {
              status: 'error',
              resultSummary: `create_file rejected incomplete placeholder in ${cleanRel}`,
              output: `File "${cleanRel}" contains an ellipsis/placeholder comment ("// ... rest of code"). Write complete, production-ready code without placeholders.`,
              filePath: cleanRel,
            };
          }

          const absPath = this.sandbox.resolveSafePath(cleanRel);

          // GUARDRAIL: create_file must NEVER overwrite an existing file
          if (fs.existsSync(absPath)) {
            return {
              status: 'error',
              resultSummary: `create_file failed: "${cleanRel}" already exists. Use edit_file instead.`,
              output: `PROTECTED EXISTING FILE: "${cleanRel}" already exists on disk. Existing files MUST NEVER be overwritten with create_file. Call read_file("${cleanRel}") first, then apply a targeted change with edit_file.`,
              filePath: cleanRel,
            };
          }

          this.captureCheckpoint(cleanRel, 'create_file');

          const parentDir = path.dirname(absPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }

          fs.writeFileSync(absPath, rawContent, 'utf-8');

          // Post-write disk verification + integrity check across all baseline files
          const diskCheck = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : null;
          if (diskCheck !== rawContent) {
            return {
              status: 'error',
              resultSummary: `create_file verification failed for ${cleanRel}`,
              output: `Disk validation failed immediately after writing "${cleanRel}".`,
              filePath: cleanRel,
            };
          }
          const integrity = this.verifyWorkspacePreservation(cleanRel);
          if (!integrity.ok) {
            return {
              status: 'error',
              resultSummary: `Integrity guard triggered during create_file(${cleanRel})`,
              output: integrity.violations.join('\n'),
              filePath: cleanRel,
            };
          }

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
            output: `Successfully created and verified ${cleanRel} (${rawContent.length} bytes). Existing workspace files preserved intact.`,
            filePath: cleanRel,
            fileChange: record,
          };
        }

        case 'write_file': {
          // Strict non-overwrite parity with create_file
          const rawPath = String(args.path || '');
          const rawContent = String(args.content ?? '');
          const cleanRel = this.normalizeRelPath(rawPath);
          const absPath = this.sandbox.resolveSafePath(cleanRel);

          if (fs.existsSync(absPath)) {
            return {
              status: 'error',
              resultSummary: `write_file blocked: "${cleanRel}" exists. Use edit_file instead.`,
              output: `PROTECTED EXISTING FILE: "${cleanRel}" already exists. NEVER overwrite existing files. Inspect it with read_file("${cleanRel}") and apply targeted edits with edit_file.`,
              filePath: cleanRel,
            };
          }

          return await this.executeTool('create_file', { path: cleanRel, content: rawContent });
        }

        case 'edit_file': {
          const rawPath = String(args.path || '');
          const oldStr = String(args.old_str ?? args.oldStr ?? args.old_string ?? '');
          const newStr = String(args.new_str ?? args.newStr ?? args.new_string ?? '');

          const cleanRel = this.normalizeRelPath(rawPath);
          const absPath = this.sandbox.resolveSafePath(cleanRel);

          if (!fs.existsSync(absPath)) {
            return {
              status: 'error',
              resultSummary: `File not found: ${cleanRel}`,
              output: `File "${cleanRel}" does not exist. Use create_file ONLY to create brand-new files.`,
            };
          }

          // GUARDRAIL 1: edit_file must FAIL if the file was not read first in this session
          if (!this.sessionReadFiles.has(cleanRel)) {
            return {
              status: 'error',
              resultSummary: `edit_file blocked: "${cleanRel}" must be read first.`,
              output: `File "${cleanRel}" has not been read in this session. Call read_file("${cleanRel}") first so you preserve all existing code and functionality.`,
              filePath: cleanRel,
            };
          }

          if (!oldStr) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: old_str cannot be empty.`,
              output: `Provide a non-empty exact old_str snippet copied from read_file("${cleanRel}") plus surrounding context lines.`,
              filePath: cleanRel,
            };
          }

          if (oldStr === newStr) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: new_str is identical to old_str.`,
              output: `No change would be applied to "${cleanRel}". Provide distinct new_str replacement content.`,
              filePath: cleanRel,
            };
          }

          const currentContent = fs.readFileSync(absPath, 'utf-8');

          // GUARDRAIL 2: edit_file must FAIL if old_str is not found exactly once
          const matchCount = currentContent.split(oldStr).length - 1;
          if (matchCount === 0) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: old_str not found in ${cleanRel}.`,
              output: `The exact old_str was not found in "${cleanRel}". Call read_file("${cleanRel}") again and copy exact indentation/newlines.`,
              filePath: cleanRel,
            };
          }

          if (matchCount > 1) {
            return {
              status: 'error',
              resultSummary: `edit_file failed: old_str found ${matchCount} times in ${cleanRel}.`,
              output: `The old_str matched ${matchCount} locations in "${cleanRel}". Include 3-5 surrounding context lines so it matches uniquely once.`,
              filePath: cleanRel,
            };
          }

          // GUARDRAIL 3: Block unrequested whole-file replacement to preserve existing code
          const currentLineCount = currentContent.split('\n').length;
          const oldLineCount = oldStr.split('\n').length;
          if (
            currentLineCount > 15 &&
            oldLineCount >= Math.ceil(currentLineCount * 0.85) &&
            !this.explicitlyAllowedOverwrites.has(cleanRel)
          ) {
            return {
              status: 'error',
              resultSummary: `edit_file blocked whole-file replacement on ${cleanRel}`,
              output: `SURGICAL EDIT REQUIRED: "${cleanRel}" has ${currentLineCount} lines and your old_str spans ${oldLineCount} lines (>=85% of the file). To preserve existing code and functionality, pass ONLY the narrow target section (3-25 lines) in old_str/new_str rather than replacing the entire file.`,
              filePath: cleanRel,
            };
          }

          this.captureCheckpoint(cleanRel, 'edit_file');

          // Safe exact replacement (avoids String.replace $-pattern corruption)
          const matchIdx = currentContent.indexOf(oldStr);
          const updatedContent =
            currentContent.slice(0, matchIdx) + newStr + currentContent.slice(matchIdx + oldStr.length);
          fs.writeFileSync(absPath, updatedContent, 'utf-8');

          // Post-write disk verification + integrity check across all other baseline files
          const diskVerify = fs.readFileSync(absPath, 'utf-8');
          if (diskVerify !== updatedContent) {
            return {
              status: 'error',
              resultSummary: `edit_file verification failed for ${cleanRel}`,
              output: `Disk content mismatch after writing edit to "${cleanRel}".`,
              filePath: cleanRel,
            };
          }
          const integrity = this.verifyWorkspacePreservation(cleanRel);
          if (!integrity.ok) {
            return {
              status: 'error',
              resultSummary: `Integrity guard triggered during edit_file(${cleanRel})`,
              output: integrity.violations.join('\n'),
              filePath: cleanRel,
            };
          }

          // Compare cumulative diff against baseline if edited multiple times in the same run
          const existingRecord = this.filesChanged.get(cleanRel);
          const baselineState = this.baselineFiles.get(cleanRel);
          const diffBaseContent =
            existingRecord?.action === 'created'
              ? ''
              : baselineState
                ? baselineState.content
                : existingRecord?.oldContent ?? currentContent;

          const changes = diff.diffLines(diffBaseContent, updatedContent);
          let added = 0;
          let removed = 0;
          for (const part of changes) {
            if (part.added) added += part.count || 0;
            if (part.removed) removed += part.count || 0;
          }

          const record: FileChangeRecord = {
            path: cleanRel,
            action: existingRecord?.action === 'created' ? 'created' : 'edited',
            addedLines: added,
            removedLines: removed,
            oldContent: diffBaseContent,
            newContent: updatedContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ...(baselineState ? { preExistingHash: baselineState.hash } : {}),
          };

          this.filesChanged.set(cleanRel, record);

          return {
            status: 'success',
            resultSummary: `Edited ${cleanRel} (+${added} -${removed})`,
            output: `Successfully updated and verified ${cleanRel}.`,
            filePath: cleanRel,
            fileChange: record,
          };
        }

        case 'run_command': {
          const parsed = runCommandSchema.parse(args);

          // Block shell commands that attempt to overwrite or delete existing protected workspace files
          const preSnap = this.snapshotAllProtectedBeforeCommand();
          const protectedList = Array.from(this.baselineFiles.keys());
          const shellGuard = detectProtectedFileShellMutation(
            parsed.command,
            protectedList,
            new Set([...this.explicitlyAllowedDeletions, ...this.explicitlyAllowedOverwrites])
          );
          if (shellGuard.blocked) {
            return {
              status: 'error',
              resultSummary: 'Command blocked by existing-file protection',
              output: shellGuard.reason,
              exitCode: 1,
            };
          }

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
          const integrity = this.verifyWorkspacePreservation(undefined, preSnap);
          const summary = `Ran "${parsed.command}" (exit ${res.exitCode})`;
          const fullOutput = [
            res.stdout,
            res.stderr,
            !integrity.ok ? `PROTECTED FILE GUARD:\n${integrity.violations.join('\n')}` : '',
          ]
            .filter(Boolean)
            .join('\n')
            .trim();

          return {
            status: res.exitCode === 0 && integrity.ok ? 'success' : 'error',
            resultSummary: integrity.ok ? summary : `${summary} (protected file restored)`,
            output: fullOutput || 'No output produced',
            exitCode: integrity.ok ? res.exitCode : 1,
          };
        }

        case 'finish': {
          const parsed = finishSchema.parse(args);
          const checks: VerificationCheckResult[] = [];

          // PLAN MODE FINISH: validate structured plan and return without requiring files on disk
          if (this.planMode) {
            if (this.plan.length === 0) {
              return {
                status: 'error',
                resultSummary: 'Plan Mode finish failed: No plan checklist created yet.',
                output: 'You must explore with list_dir/read_file and call update_todos or submit_plan with concrete steps before finishing Plan Mode.',
              };
            }
            if (!this.submittedPlanSpec) {
              this.submittedPlanSpec = {
                summary: parsed.summary,
                steps: this.plan,
                filesToCreate: [],
                filesToModify: [],
                verificationSteps: [],
                originalPrompt: this.userGoal,
              };
            }
            return {
              status: 'success',
              resultSummary: `Plan formulated (${this.plan.length} steps ready for approval)`,
              output: parsed.summary,
            };
          }

          // GUARDRAIL 1: finish must FAIL while any todo is incomplete
          const incompleteTodos = this.plan.filter((s) => s.status !== 'done');
          if (incompleteTodos.length > 0) {
            return {
              status: 'error',
              resultSummary: `finish failed: ${incompleteTodos.length} incomplete todos remain.`,
              output: `Cannot finish while todos are still incomplete. Incomplete items:\n${incompleteTodos.map((t) => `- [${t.status.toUpperCase()}] ${t.title}`).join('\n')}\nComplete every step, verify on disk, mark done with update_todos, then call finish.`,
            };
          }
          checks.push({
            name: 'Plan Checklist Complete',
            passed: true,
            detail: `${this.plan.length} step(s) completed`,
          });

          // GUARDRAIL 2: Check explicitly named files in user prompt + implementation deliverables
          const wantsImplementation =
            /\b(build|create|implement|add|write|make|generate|fix|update|edit|modify|refactor|style|design|develop)\b/i.test(
              this.userGoal
            ) && !/^(what|how|why|explain|describe|list|show)\b/i.test(this.userGoal.trim());

          if (wantsImplementation && this.filesChanged.size === 0) {
            return {
              status: 'error',
              resultSummary: 'finish failed: No file modifications were performed for this build/edit request.',
              output: 'You requested to finish without creating or modifying any files. Use create_file for new files or read_file + edit_file for existing files before finishing.',
            };
          }

          // Verify explicitly named files mentioned in prompt (e.g. "index.html", "style.css") actually exist on disk
          const requestedFileMatches = this.userGoal.match(/\b[a-zA-Z0-9_.-]+\.(html?|css|scss|jsx?|tsx?|py|json)\b/gi) || [];
          const missingRequested: string[] = [];
          for (const fname of requestedFileMatches) {
            const cleanReq = this.normalizeRelPath(fname);
            const existsDirectly = fs.existsSync(this.sandbox.resolveSafePath(cleanReq));
            const existsInSubdir = Array.from(this.filesChanged.keys()).some(
              (p) => path.posix.basename(p).toLowerCase() === fname.toLowerCase()
            ) || Array.from(this.baselineFiles.keys()).some(
              (p) => path.posix.basename(p).toLowerCase() === fname.toLowerCase()
            );
            if (!existsDirectly && !existsInSubdir) {
              missingRequested.push(fname);
            }
          }
          if (missingRequested.length > 0 && !this.explicitlyAllowedDeletions.size) {
            return {
              status: 'error',
              resultSummary: `finish failed: Requested file(s) missing: ${missingRequested.join(', ')}`,
              output: `The user explicitly requested file(s) [${missingRequested.join(', ')}], which do not exist on disk yet. Create or update them before finishing.`,
            };
          }

          // GUARDRAIL 3: Verify existing baseline files were preserved intact
          const preservation = this.verifyWorkspacePreservation();
          if (!preservation.ok) {
            return {
              status: 'error',
              resultSummary: 'finish failed: Protected baseline file integrity violation detected',
              output: preservation.violations.join('\n'),
            };
          }
          if (this.baselineFiles.size > 0) {
            checks.push({
              name: 'Baseline File Preservation',
              passed: true,
              detail: `${this.baselineFiles.size} pre-existing file(s) verified intact`,
            });
          }

          // GUARDRAIL 4: Verify all changed files exist & validate syntax/structure
          const verificationErrors: string[] = [];
          for (const [relPath, rec] of this.filesChanged.entries()) {
            if (rec.action === 'deleted') continue;
            const absPath = this.sandbox.resolveSafePath(relPath);
            if (!fs.existsSync(absPath)) {
              verificationErrors.push(`Missing file on disk: ${relPath}`);
              continue;
            }
            const content = fs.readFileSync(absPath, 'utf-8');
            if (/\.(json)$/i.test(relPath)) {
              try {
                JSON.parse(content);
              } catch (e) {
                verificationErrors.push(`Invalid JSON in ${relPath}: ${e instanceof Error ? e.message : String(e)}`);
              }
            } else if (/\.(js|mjs|cjs)$/i.test(relPath)) {
              const checkRes = await this.sandbox.executeCommand(`node --check "${absPath.replace(/"/g, '\\"')}"`, 15000);
              if (checkRes.exitCode !== 0) {
                verificationErrors.push(`JavaScript syntax error in ${relPath}: ${(checkRes.stderr || checkRes.stdout).trim()}`);
              }
            } else if (/\.css$/i.test(relPath)) {
              let balance = 0;
              for (const ch of content) {
                if (ch === '{') balance++;
                else if (ch === '}') balance--;
                if (balance < 0) break;
              }
              if (balance !== 0) {
                verificationErrors.push(`Unbalanced CSS braces "{ }" in ${relPath}`);
              }
            } else if (/\.html?$/i.test(relPath)) {
              const opensScript = (content.match(/<script\b[^>]*>/gi) || []).length;
              const closesScript = (content.match(/<\/script>/gi) || []).length;
              const opensStyle = (content.match(/<style\b[^>]*>/gi) || []).length;
              const closesStyle = (content.match(/<\/style>/gi) || []).length;
              if (opensScript !== closesScript || opensStyle !== closesStyle) {
                verificationErrors.push(`Unclosed <script> or <style> tag in ${relPath}`);
              }
            }
          }

          if (verificationErrors.length > 0) {
            checks.push({
              name: 'Syntax & File Verification',
              passed: false,
              detail: verificationErrors.join('; '),
            });
            this.lastVerificationChecks = checks;
            return {
              status: 'error',
              resultSummary: `finish failed: ${verificationErrors.length} verification error(s) found.`,
              output: `Fix these verification errors before finishing:\n- ${verificationErrors.join('\n- ')}`,
              verificationChecks: checks,
            };
          }

          if (this.filesChanged.size > 0) {
            checks.push({
              name: 'Syntax & File Verification',
              passed: true,
              detail: `Verified ${this.filesChanged.size} changed file(s) cleanly on disk`,
            });
          }

          // GUARDRAIL 5: Run project build/test script when dependencies exist locally
          const pkgPath = path.join(this.sandbox.workspaceRoot, 'package.json');
          if (fs.existsSync(pkgPath)) {
            let hasBuildScript = false;
            let needsExternalModules = false;
            try {
              const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
              hasBuildScript = Boolean(pkgJson?.scripts?.build || pkgJson?.scripts?.test);
              const depCount =
                Object.keys(pkgJson?.dependencies || {}).length +
                Object.keys(pkgJson?.devDependencies || {}).length;
              needsExternalModules = depCount > 0;
            } catch {}

            const hasNodeModules = fs.existsSync(path.join(this.sandbox.workspaceRoot, 'node_modules'));
            if (hasBuildScript && (!needsExternalModules || hasNodeModules)) {
              const testCmd = 'npm test --if-present && npm run build --if-present';
              const verifyRes = await this.sandbox.executeCommand(testCmd, 60000);
              if (verifyRes.exitCode !== 0) {
                const combined = [verifyRes.stderr, verifyRes.stdout].filter(Boolean).join('\n');
                checks.push({
                  name: 'Build & Test Suite',
                  passed: false,
                  detail: combined.slice(-300),
                });
                this.lastVerificationChecks = checks;
                return {
                  status: 'error',
                  resultSummary: `finish failed: Build verification error (exit ${verifyRes.exitCode}).`,
                  output: `Automated build/test verification failed! Fix these errors before finishing:\n\n${combined.slice(-2500)}`,
                  exitCode: verifyRes.exitCode,
                  verificationChecks: checks,
                };
              }
              checks.push({
                name: 'Build & Test Suite',
                passed: true,
                detail: 'npm test / build passed',
              });
            }
          }

          this.lastVerificationChecks = checks;
          return {
            status: 'success',
            resultSummary: 'Mission verified and finished cleanly.',
            output: parsed.summary,
            verificationChecks: checks,
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
