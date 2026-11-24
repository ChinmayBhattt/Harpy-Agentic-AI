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
 * Analyzes workspace directory and user specifications to determine the effective technology stack.
 * Respects user prompt choices when creating applications, and follows existing project configs when present.
 */
export function detectWorkspaceTechStack(workspaceRoot: string, userPrompt = ''): TechStackInfo {
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
  const hasExistingDeps = Object.keys(allDeps).length > 0;
  const pLower = (userPrompt || '').toLowerCase();

  // 1. Determine Framework
  let framework = 'Modern Web (React / Next.js)';
  if (pLower.includes('next.js') || pLower.includes('nextjs') || pLower.includes('next app') || allDeps['next']) {
    framework = 'Next.js (App Router / React)';
  } else if (pLower.includes('react') || allDeps['react']) {
    framework = 'React SPA (Vite / Modern Web)';
  } else if (pLower.includes('vue') || allDeps['vue']) {
    framework = 'Vue.js';
  } else if (pLower.includes('svelte') || allDeps['svelte']) {
    framework = 'Svelte';
  } else if (pLower.includes('express') || allDeps['express']) {
    framework = 'Node.js + Express';
  } else if (hasExistingDeps) {
    framework = 'Node.js';
  }

  // 2. Determine Language
  const isTypeScript =
    pLower.includes('typescript') ||
    fs.existsSync(path.join(workspaceRoot, 'tsconfig.json')) ||
    Boolean(allDeps['typescript']);
  const language = isTypeScript ? 'TypeScript' : 'JavaScript / TypeScript';

  // 3. Determine Styling
  let styling = 'Tailwind CSS';
  if (pLower.includes('tailwind') || allDeps['tailwindcss'] || fs.existsSync(path.join(workspaceRoot, 'tailwind.config.js')) || fs.existsSync(path.join(workspaceRoot, 'tailwind.config.ts'))) {
    styling = 'Tailwind CSS';
  } else if (pLower.includes('css modules')) {
    styling = 'CSS Modules';
  }

  // 4. Build Tool
  let buildTool = 'Next.js / Vite';
  if (framework.includes('Next.js')) buildTool = 'Next.js Turbopack / Webpack';
  else if (framework.includes('React') || framework.includes('Vue')) buildTool = 'Vite';
  else if (allDeps['vite']) buildTool = 'Vite';

  const summary = `${framework} | ${language} | ${styling} | Build: ${buildTool}`;

  return {
    framework,
    language,
    styling,
    runtime: 'Node.js / Modern Browser',
    buildTool,
    packageManager: 'npm',
    summary,
  };
}

/**
 * Generates an AGENTS.md file inside the workspace aligned with the project's target tech stack.
 */
export function ensureAgentsMarkdown(workspaceRoot: string, userPrompt = ''): string {
  const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
  const stack = detectWorkspaceTechStack(workspaceRoot, userPrompt);

  const content = `# Project Architecture & Agent Guidelines

## Target Tech Stack
- Framework: ${stack.framework}
- Language: ${stack.language}
- Styling: ${stack.styling}
- Build / Tooling: ${stack.buildTool}

## Core Autonomous Principles (Antigravity / Claude Code Style)
1. COMPLETE DELIVERABLES: Always build complete, functional, production-ready code. Never leave placeholders like "TODO", "rest of code here", or half-finished 1-line stubs.
2. FULL ARCHITECTURE: For web applications, construct all necessary files: HTML shell (index.html), core application components (App/Page), interactive state, responsive styling (Tailwind CSS), and configurations (package.json).
3. SURGICAL EDITS: Read files with read_file before modifying existing code. Use edit_file for targeted changes; use create_file only for new files.
4. VERIFY: Ensure the application runs cleanly with zero syntax or runtime errors.
`;

  // Always update AGENTS.md if user provided a specific stack requirement or framework
  if (fs.existsSync(agentsPath)) {
    try {
      const existing = fs.readFileSync(agentsPath, 'utf-8');
      const pLower = (userPrompt || '').toLowerCase();
      const needsUpdate =
        (existing.includes('Vanilla / Node.js') && (stack.framework.includes('Next') || stack.framework.includes('React'))) ||
        pLower.includes('next') ||
        pLower.includes('react') ||
        pLower.includes('vue') ||
        pLower.includes('build') ||
        pLower.includes('app');

      if (needsUpdate) {
        fs.writeFileSync(agentsPath, content, 'utf-8');
        return content;
      }
      return existing;
    } catch {}
  }

  try {
    fs.writeFileSync(agentsPath, content, 'utf-8');
  } catch {}

  return content;
}
