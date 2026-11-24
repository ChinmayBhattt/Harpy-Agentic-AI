import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { AgentLoop } from '@/lib/agent/agentLoop';
import { AgentEvent, FileChangeRecord } from '@/lib/agent/events';
import { WorkspaceSandbox } from '@/lib/agent/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed serverless duration on standard Vercel accounts

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      prompt,
      sessionId = `session-${Date.now()}`,
      userId = 'anonymous',
      model,
      apiKey,
      existingFiles,
      command,
      planMode = false,
      approvalId,
      approved,
      filePath,
      oldContent,
      history,
    } = body;

    // Handle abort action
    if (action === 'abort') {
      const ok = AgentLoop.abort(sessionId);
      return NextResponse.json({ success: ok, message: ok ? 'Agent run aborted.' : 'No active run found.' });
    }

    // Handle user approval for risky commands
    if (action === 'approval') {
      if (!approvalId) {
        return NextResponse.json({ error: 'Missing approvalId parameter' }, { status: 400 });
      }
      const resolved = AgentLoop.resolveApproval(approvalId, Boolean(approved));
      return NextResponse.json({ success: resolved, message: resolved ? 'Approval recorded' : 'Approval session expired or not found' });
    }

    // Handle file reversion (revert file to previous state)
    if (action === 'revert_file') {
      if (!filePath) {
        return NextResponse.json({ error: 'Missing filePath parameter' }, { status: 400 });
      }
      try {
        const sandbox = new WorkspaceSandbox(userId, sessionId);
        const absPath = sandbox.resolveSafePath(filePath);
        if (oldContent === undefined || oldContent === null || oldContent === '') {
          if (fs.existsSync(absPath)) {
            fs.unlinkSync(absPath);
          }
        } else {
          fs.writeFileSync(absPath, oldContent, 'utf-8');
        }
        return NextResponse.json({ success: true, message: `Reverted ${filePath} to previous state` });
      } catch (revErr: unknown) {
        const msg = revErr instanceof Error ? revErr.message : 'Reversion failed';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
      }
    }

    // Handle interactive terminal CLI command
    if (action === 'command') {
      if (!command || typeof command !== 'string') {
        return NextResponse.json({ error: 'Missing command string' }, { status: 400 });
      }
      try {
        const sandbox = new WorkspaceSandbox(userId, sessionId);
        const result = await sandbox.executeCommand(command, 60000, body.subDir || '');
        return NextResponse.json({
          success: result.exitCode === 0,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        });
      } catch (cmdErr: unknown) {
        const message = cmdErr instanceof Error ? cmdErr.message : 'Command execution failed';
        return NextResponse.json({
          success: false,
          stdout: '',
          stderr: message,
          exitCode: 1,
        });
      }
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Missing prompt parameter' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    let pingInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        // SSE keepalive ping every 3 seconds to prevent Vercel / proxy timeout "Load failed"
        pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch {}
        }, 3000);

        const sendEvent = (event: AgentEvent) => {
          try {
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {}
        };

        try {
          await AgentLoop.run({
            prompt: prompt.trim(),
            userId,
            sessionId,
            model,
            apiKey,
            existingFiles: Array.isArray(existingFiles) ? (existingFiles as FileChangeRecord[]) : undefined,
            signal: req.signal,
            onEvent: sendEvent,
            planMode: Boolean(planMode),
            history: Array.isArray(history) ? history : undefined,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown agent failure';
          sendEvent({ type: 'error', message });
        } finally {
          if (pingInterval) clearInterval(pingInterval);
          try {
            controller.close();
          } catch {}
        }
      },
      cancel() {
        if (pingInterval) clearInterval(pingInterval);
        AgentLoop.abort(sessionId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: `Agent Gateway Error: ${message}` }, { status: 500 });
  }
}
