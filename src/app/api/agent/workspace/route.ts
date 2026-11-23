import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { WorkspaceSandbox } from '@/lib/agent/tools';

export const dynamic = 'force-dynamic';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileNode[];
}

function buildFileTree(rootDir: string, currentDir: string): FileNode[] {
  if (!fs.existsSync(currentDir)) return [];

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Ignore node_modules, .git, etc. from recursive tree
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relPath,
        isDirectory: true,
        children: buildFileTree(rootDir, fullPath),
      });
    } else {
      const stat = fs.statSync(fullPath);
      nodes.push({
        name: entry.name,
        path: relPath,
        isDirectory: false,
        size: stat.size,
      });
    }
  }

  // Sort directories first, then files alphabetically
  return nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

function addDirectoryToZip(zip: JSZip, rootDir: string, currentDir: string) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, rootDir, fullPath);
    } else {
      const data = fs.readFileSync(fullPath);
      zip.file(relPath, data);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    const userId = searchParams.get('userId') || 'anonymous';
    const action = searchParams.get('action') || 'tree';
    const filePath = searchParams.get('path') || '';

    const sandbox = new WorkspaceSandbox(userId, sessionId);

    // 1. Get Workspace File Tree
    if (action === 'tree') {
      const tree = buildFileTree(sandbox.workspaceRoot, sandbox.workspaceRoot);
      return NextResponse.json({
        success: true,
        workspaceRoot: sandbox.workspaceRoot,
        tree,
      });
    }

    // 2. Read Single File Content
    if (action === 'read') {
      if (!filePath) {
        return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
      }
      const safeAbs = sandbox.resolveSafePath(filePath);
      if (!fs.existsSync(safeAbs)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const content = fs.readFileSync(safeAbs, 'utf-8');
      return NextResponse.json({
        success: true,
        path: filePath,
        content,
      });
    }

    // 3. Download Workspace as ZIP
    if (action === 'zip') {
      const zip = new JSZip();
      addDirectoryToZip(zip, sandbox.workspaceRoot, sandbox.workspaceRoot);

      const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      const cleanProjectName = `harpy-project-${sessionId.replace(/[^a-zA-Z0-9]/g, '-')}`;

      return new Response(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${cleanProjectName}.zip"`,
        },
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Workspace query error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
