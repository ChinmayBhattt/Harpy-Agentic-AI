import fs from 'fs';
import path from 'path';

export interface TechStackInfo {
  framework: string;
  language: string;
  styling: string;
  runtime: string;
  buildTool: string;
  packageManager: string;
  summary: string;
  isEmptyWorkspace: boolean;
  hasPackageJson: boolean;
  detectedFiles: string[];
}

function listWorkspaceTopFiles(workspaceRoot: string): string[] {
  if (!fs.existsSync(workspaceRoot)) return [];
  const results: string[] = [];
  const walk = (dir: string, relBase: string, depth: number) => {
    if (depth > 2 || results.length >= 60) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
        continue;
      }
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), rel, depth + 1);
      } else {
        results.push(rel);
      }
    }
  };
  walk(workspaceRoot, '', 0);
  return results;
}

/**
 * Analyzes workspace directory and user specifications to determine the effective technology stack.
 * Respects existing project files and honors explicit user instructions when adding/scaffolding apps.
 */
export function detectWorkspaceTechStack(workspaceRoot: string, userPrompt = ''): TechStackInfo {
  const pkgPath = path.join(workspaceRoot, 'package.json');
  const hasPackageJson = fs.existsSync(pkgPath);
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};

  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      dependencies = pkg.dependencies || {};
      devDependencies = pkg.devDependencies || {};
    } catch {}
  }

  const allDeps = { ...devDependencies, ...dependencies };
  const hasExistingDeps = Object.keys(allDeps).length > 0;
  const detectedFiles = listWorkspaceTopFiles(workspaceRoot).filter((f) => f !== 'AGENTS.md');
  const isEmptyWorkspace = detectedFiles.length === 0;
  const pLower = (userPrompt || '').toLowerCase();

  const hasHtmlFiles = detectedFiles.some((f) => /\.(html?|htm)$/i.test(f));
  const hasCssFiles = detectedFiles.some((f) => /\.(css|scss|sass)$/i.test(f));
  const hasJsxTsx = detectedFiles.some((f) => /\.(jsx|tsx)$/i.test(f));
  const hasPythonFiles =
    detectedFiles.some((f) => f.endsWith('.py')) ||
    fs.existsSync(path.join(workspaceRoot, 'requirements.txt')) ||
    fs.existsSync(path.join(workspaceRoot, 'pyproject.toml'));

  // 1. Determine Framework accurately (never force React/Next onto static HTML/CSS requests!)
  let framework = 'Vanilla HTML / CSS / JavaScript';
  const promptMentionsNext = pLower.includes('next.js') || pLower.includes('nextjs') || pLower.includes('next app');
  const promptMentionsReact = pLower.includes('react') || pLower.includes('.jsx') || pLower.includes('.tsx');
  const promptMentionsVue = pLower.includes('vue');
  const promptMentionsSvelte = pLower.includes('svelte');
  const promptMentionsPython = pLower.includes('python') || pLower.includes('fastapi') || pLower.includes('flask') || pLower.includes('django');
  const promptMentionsStaticWeb =
    /\b(index\.html|style\.css|\.html|\.css|html\s*(and|&|\+)?\s*css|vanilla\s*(js|javascript|html)|static\s*(site|page|website))\b/i.test(
      pLower
    );

  if (allDeps['next'] || (!hasHtmlFiles && promptMentionsNext)) {
    framework = 'Next.js (App Router / React)';
  } else if (allDeps['react'] || hasJsxTsx || (!hasHtmlFiles && promptMentionsReact)) {
    framework = 'React SPA (Vite / Modern Web)';
  } else if (allDeps['vue'] || promptMentionsVue) {
    framework = 'Vue.js';
  } else if (allDeps['svelte'] || promptMentionsSvelte) {
    framework = 'Svelte';
  } else if (hasPythonFiles || promptMentionsPython) {
    framework = 'Python';
  } else if (allDeps['express'] || pLower.includes('express')) {
    framework = 'Node.js + Express';
  } else if (hasHtmlFiles || hasCssFiles || promptMentionsStaticWeb || isEmptyWorkspace) {
    framework = 'Vanilla HTML / CSS / JavaScript';
  } else if (hasExistingDeps || hasPackageJson) {
    framework = 'Node.js';
  }

  // 2. Determine Language
  const isTypeScript =
    (!promptMentionsStaticWeb && (pLower.includes('typescript') || pLower.includes('.ts'))) ||
    fs.existsSync(path.join(workspaceRoot, 'tsconfig.json')) ||
    Boolean(allDeps['typescript']);
  const language =
    framework === 'Python'
      ? 'Python'
      : isTypeScript
        ? 'TypeScript'
        : framework.includes('Vanilla')
          ? 'HTML5 / CSS3 / JavaScript'
          : 'JavaScript';

  // 3. Determine Styling
  let styling = 'Standard CSS';
  if (
    pLower.includes('tailwind') ||
    allDeps['tailwindcss'] ||
    fs.existsSync(path.join(workspaceRoot, 'tailwind.config.js')) ||
    fs.existsSync(path.join(workspaceRoot, 'tailwind.config.ts'))
  ) {
    styling = 'Tailwind CSS';
  } else if (pLower.includes('css modules')) {
    styling = 'CSS Modules';
  } else if (hasCssFiles || promptMentionsStaticWeb || framework.includes('Vanilla')) {
    styling = 'Standard CSS';
  }

  // 4. Build Tool & Runtime
  let buildTool = 'Browser Direct / Zero-Build';
  let runtime = 'Modern Browser';
  if (framework.includes('Next.js')) {
    buildTool = 'Next.js';
    runtime = 'Node.js / Modern Browser';
  } else if (framework.includes('React') || framework.includes('Vue') || framework.includes('Svelte') || allDeps['vite']) {
    buildTool = 'Vite';
    runtime = 'Node.js / Modern Browser';
  } else if (framework === 'Python') {
    buildTool = 'Python';
    runtime = 'Python 3';
  } else if (framework.includes('Node.js')) {
    buildTool = 'npm scripts';
    runtime = 'Node.js';
  }

  const summary = `${framework} | ${language} | ${styling} | Build: ${buildTool}`;

  return {
    framework,
    language,
    styling,
    runtime,
    buildTool,
    packageManager: framework === 'Python' ? 'pip' : 'npm',
    summary,
    isEmptyWorkspace,
    hasPackageJson,
    detectedFiles,
  };
}

/**
 * Returns workspace guidelines for the agent without clobbering or polluting user workspace files.
 * Reads existing AGENTS.md if real project files exist; generates context in memory otherwise.
 */
export function ensureAgentsMarkdown(workspaceRoot: string, userPrompt = '', writeToDisk = false): string {
  const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
  const stack = detectWorkspaceTechStack(workspaceRoot, userPrompt);

  const fileListNote =
    stack.detectedFiles.length > 0
      ? `Existing workspace files (${stack.detectedFiles.length}): ${stack.detectedFiles.slice(0, 25).join(', ')}`
      : 'Workspace is currently empty (0 project files).';

  const content = `# Project Architecture & Agent Guidelines

## Detected Workspace Context
- Workspace State: ${fileListNote}
- Framework: ${stack.framework}
- Language: ${stack.language}
- Styling: ${stack.styling}
- Build / Tooling: ${stack.buildTool}

## Core Autonomous Principles
1. FOLLOW THE USER REQUEST EXACTLY: Build or modify ONLY what the user requested. If the user asks for a single file (e.g. \`index.html\` or \`style.css\`), build/modify cleanly without adding unrelated framework boilerplate. If the user asks for an app in a specific framework, honor it.
2. PRESERVE EXISTING FILES: Never delete, clear, or overwrite existing workspace files when creating or editing another file unless the user explicitly instructed you to delete/replace them.
3. SURGICAL EDITS ONLY: Always call \`read_file\` before editing an existing file, and use \`edit_file\` for targeted hunk replacements preserving existing code and functionality. Use \`create_file\` ONLY for files that do not exist yet.
4. COMPLETE & VERIFIED DELIVERABLES: Write complete, functional code (never placeholders like "TODO" or "// rest of code"), then verify all modified/created files pass checks before finishing.
`;

  if (fs.existsSync(agentsPath) && !stack.isEmptyWorkspace) {
    try {
      const existing = fs.readFileSync(agentsPath, 'utf-8');
      // Only reuse user-authored AGENTS.md, not stale Harpy stub files
      if (!existing.includes('# Project Architecture & Agent Guidelines')) {
        return existing;
      }
    } catch {}
  }

  if (writeToDisk && !stack.isEmptyWorkspace) {
    try {
      fs.writeFileSync(agentsPath, content, 'utf-8');
    } catch {}
  }

  return content;
}
