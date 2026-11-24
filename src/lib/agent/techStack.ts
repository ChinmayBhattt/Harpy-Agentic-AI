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
}

/**
 * Analyzes workspace directory to detect technology stack and framework conventions
 */
export function detectWorkspaceTechStack(workspaceRoot: string): TechStackInfo {
  const pkgPath = path.join(workspaceRoot, 'package.json');
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      dependencies = pkg.dependencies || {};
      devDependencies = pkg.devDependencies || {};
    } catch {}
  }

  const allDeps = { ...devDependencies, ...dependencies };

  let framework = 'Vanilla / Node.js';
  if (allDeps['next']) framework = 'Next.js (App Router / React)';
  else if (allDeps['react']) framework = 'React SPA';
  else if (allDeps['vue']) framework = 'Vue.js';
  else if (allDeps['svelte']) framework = 'Svelte';
  else if (allDeps['express']) framework = 'Node.js + Express';

  const isTypeScript = fs.existsSync(path.join(workspaceRoot, 'tsconfig.json')) || Boolean(allDeps['typescript']);
  const language = isTypeScript ? 'TypeScript' : 'JavaScript (ES Modules)';

  let styling = 'Standard CSS';
  if (allDeps['tailwindcss'] || fs.existsSync(path.join(workspaceRoot, 'tailwind.config.js')) || fs.existsSync(path.join(workspaceRoot, 'tailwind.config.ts'))) {
    styling = 'Tailwind CSS';
  }

  let buildTool = 'npm scripts';
  if (allDeps['vite']) buildTool = 'Vite';
  else if (allDeps['next']) buildTool = 'Next.js Turbopack / Webpack';

  const summary = `${framework} | ${language} | ${styling} | Build: ${buildTool}`;

  return {
    framework,
    language,
    styling,
    runtime: 'Node.js',
    buildTool,
    packageManager: 'npm',
    summary,
  };
}

/**
 * Generates an AGENTS.md file inside the workspace if one does not already exist
 */
export function ensureAgentsMarkdown(workspaceRoot: string): string {
  const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    try {
      return fs.readFileSync(agentsPath, 'utf-8');
    } catch {}
  }

  const stack = detectWorkspaceTechStack(workspaceRoot);
  const content = `# Project Architecture & Agent Guidelines

## Tech Stack (MANDATORY - DO NOT DEVIATE)
- Framework: ${stack.framework}
- Language: ${stack.language}
- Styling: ${stack.styling}
- Build / Dev: ${stack.buildTool}

## Project Directory Structure Conventions
- Keep existing code architecture intact.
- Place reusable UI components in dedicated component folders.
- Follow established project naming conventions.

## Core Rules for Autonomous Operations
1. EXPLORE: Always read relevant files and understand current code before editing.
2. PLAN: Maintain a clear todo list. Execute step by step.
3. EDIT: Use edit_file for existing files. Never overwrite or duplicate existing files.
4. RUN & VERIFY: Run build and lint checks to ensure 0 errors. Fix any failure immediately.
5. FINISH: Only mark complete when all todos are done and build passes.
`;

  try {
    fs.writeFileSync(agentsPath, content, 'utf-8');
  } catch {}

  return content;
}
