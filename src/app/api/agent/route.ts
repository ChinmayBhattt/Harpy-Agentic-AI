import { NextRequest, NextResponse } from 'next/server';
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
    } = body;

    // Handle abort action
    if (action === 'abort') {
      const ok = AgentLoop.abort(sessionId);
      return NextResponse.json({ success: ok, message: ok ? 'Agent run aborted.' : 'No active run found.' });
    }

    // Handle interactive terminal CLI command
    if (action === 'command') {
      if (!command || typeof command !== 'string') {
        return NextResponse.json({ error: 'Missing command string' }, { status: 400 });
      }
      try {
        const sandbox = new WorkspaceSandbox(userId, sessionId);
        const result = await sandbox.executeCommand(command);
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

    const stream = new ReadableStream({
      async start(controller) {
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
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown agent failure';
          sendEvent({ type: 'error', message });
        } finally {
          try {
            controller.close();
          } catch {}
        }
      },
      cancel() {
        AgentLoop.abort(sessionId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: `Agent Gateway Error: ${message}` }, { status: 500 });
  }
}
