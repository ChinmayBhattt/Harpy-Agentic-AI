import { NextRequest, NextResponse } from 'next/server';
import { AgentLoop } from '@/lib/agent/agentLoop';
import { AgentEvent } from '@/lib/agent/events';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // allow extended runs up to 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prompt, sessionId = `session-${Date.now()}`, userId = 'anonymous', model, apiKey } = body;

    // Handle abort action
    if (action === 'abort') {
      const ok = AgentLoop.abort(sessionId);
      return NextResponse.json({ success: ok, message: ok ? 'Agent run aborted.' : 'No active run found.' });
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
