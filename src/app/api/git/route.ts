import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

async function runGit(args: string[], cwd: string): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 4,
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err: any) {
    return {
      ok: false,
      stdout: (err?.stdout || '').toString().trim(),
      stderr: (err?.stderr || err?.message || 'Git error').toString().trim(),
    };
  }
}

function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  if (!remoteUrl) return null;
  const clean = remoteUrl.trim().replace(/\.git$/, '');
  const sshMatch = clean.match(/git@github\.com:([^/]+)\/(.+)$/i);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
  const httpsMatch = clean.match(/https?:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/(.+)$/i);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoPath = process.cwd();
    const stateFilter = searchParams.get('state') || 'all';
    const githubToken = req.headers.get('x-github-token') || process.env.GITHUB_TOKEN || '';

    const hasGitDir = fs.existsSync(path.join(repoPath, '.git'));
    if (!hasGitDir) {
      return NextResponse.json({
        success: true,
        repoPath,
        isGitRepo: false,
        branch: 'main',
        branches: ['main'],
        remoteUrl: null,
        githubRepo: null,
        githubError: `Repository at ${repoPath} has no Git repository initialized.`,
        changes: [],
        commits: [],
        pullRequests: [],
      });
    }

    const [branchRes, branchesRes, remoteRes, statusRes, logRes] = await Promise.all([
      runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoPath),
      runGit(['branch', '--format=%(refname:short)'], repoPath),
      runGit(['remote', 'get-url', 'origin'], repoPath),
      runGit(['status', '--porcelain'], repoPath),
      runGit(['log', '-n', '15', '--pretty=format:%h|%an|%ar|%s'], repoPath),
    ]);

    const branch = branchRes.ok && branchRes.stdout ? branchRes.stdout : 'main';
    const branches = branchesRes.ok && branchesRes.stdout
      ? branchesRes.stdout.split('\n').map((b) => b.trim()).filter(Boolean)
      : [branch];
    const remoteUrl = remoteRes.ok ? remoteRes.stdout : null;
    const githubRepo = remoteUrl ? parseGitHubRepo(remoteUrl) : null;

    const changes = statusRes.ok && statusRes.stdout
      ? statusRes.stdout.split('\n').filter(Boolean).map((line) => {
          const code = line.slice(0, 2);
          const filePath = line.slice(3).trim();
          return {
            path: filePath,
            status: code.trim() || 'M',
            staged: code[0] !== ' ' && code[0] !== '?',
          };
        })
      : [];

    const commits = logRes.ok && logRes.stdout
      ? logRes.stdout.split('\n').filter(Boolean).map((line) => {
          const [hash, author, date, ...msgParts] = line.split('|');
          return {
            hash,
            author,
            date,
            message: msgParts.join('|'),
          };
        })
      : [];

    let pullRequests: Array<Record<string, unknown>> = [];
    let githubError: string | null = null;

    if (!remoteUrl || !githubRepo) {
      githubError = `Repository at ${repoPath} has no GitHub remote.`;
    } else {
      try {
        const apiState = stateFilter === 'open' ? 'open' : stateFilter === 'merged' ? 'closed' : 'all';
        const headers: Record<string, string> = {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Harpy-Agentic-AI',
        };
        if (githubToken) {
          headers.Authorization = `Bearer ${githubToken}`;
        }
        const prRes = await fetch(
          `https://api.github.com/repos/${githubRepo.owner}/${githubRepo.repo}/pulls?state=${apiState}&per_page=25`,
          { headers, cache: 'no-store' }
        );
        if (prRes.ok) {
          const rawPrs = await prRes.json();
          if (Array.isArray(rawPrs)) {
            pullRequests = rawPrs
              .filter((pr: any) => (stateFilter === 'merged' ? Boolean(pr.merged_at) : true))
              .map((pr: any) => ({
                id: pr.id,
                number: pr.number,
                title: pr.title,
                state: pr.merged_at ? 'merged' : pr.state,
                author: pr.user?.login || 'unknown',
                avatarUrl: pr.user?.avatar_url,
                headRef: pr.head?.ref || '',
                baseRef: pr.base?.ref || 'main',
                url: pr.html_url,
                body: pr.body || '',
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                draft: Boolean(pr.draft),
              }));
          }
        } else {
          const errJson = await prRes.json().catch(() => ({}));
          githubError =
            errJson?.message ||
            `Unable to fetch GitHub pull requests (${prRes.status}). Repository may be private or rate-limited.`;
        }
      } catch (e: unknown) {
        githubError = e instanceof Error ? e.message : 'Failed to connect to GitHub API.';
      }
    }

    return NextResponse.json({
      success: true,
      repoPath,
      isGitRepo: true,
      branch,
      branches,
      remoteUrl,
      githubRepo,
      githubError,
      changes,
      commits,
      pullRequests,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Git status failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, message, filePath, branchName } = body;
    const repoPath = process.cwd();

    if (action === 'diff') {
      const target = filePath ? ['diff', '--', String(filePath)] : ['diff'];
      const diffRes = await runGit(target, repoPath);
      if (!diffRes.stdout && filePath) {
        const cached = await runGit(['diff', '--cached', '--', String(filePath)], repoPath);
        return NextResponse.json({ success: true, diff: cached.stdout || 'New or untracked file.' });
      }
      return NextResponse.json({ success: true, diff: diffRes.stdout || 'No unstaged diff.' });
    }

    if (action === 'commit') {
      if (!message || !String(message).trim()) {
        return NextResponse.json({ success: false, error: 'Commit message is required.' }, { status: 400 });
      }
      const addRes = await runGit(['add', '-A'], repoPath);
      if (!addRes.ok) {
        return NextResponse.json({ success: false, error: addRes.stderr || 'git add failed' }, { status: 500 });
      }
      const commitRes = await runGit(['commit', '-m', String(message).trim()], repoPath);
      if (!commitRes.ok) {
        return NextResponse.json(
          { success: false, error: commitRes.stderr || commitRes.stdout || 'git commit failed' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, output: commitRes.stdout });
    }

    if (action === 'push') {
      const pushRes = await runGit(['push', 'origin', 'HEAD'], repoPath);
      if (!pushRes.ok) {
        return NextResponse.json(
          { success: false, error: pushRes.stderr || pushRes.stdout || 'git push failed' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, output: pushRes.stdout || pushRes.stderr || 'Pushed successfully.' });
    }

    if (action === 'checkout') {
      if (!branchName || !/^[a-zA-Z0-9._/-]+$/.test(String(branchName))) {
        return NextResponse.json({ success: false, error: 'Invalid branch name.' }, { status: 400 });
      }
      const coRes = await runGit(['checkout', String(branchName)], repoPath);
      if (!coRes.ok) {
        return NextResponse.json({ success: false, error: coRes.stderr || 'Checkout failed' }, { status: 500 });
      }
      return NextResponse.json({ success: true, branch: branchName });
    }

    return NextResponse.json({ success: false, error: `Unknown git action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Git operation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
