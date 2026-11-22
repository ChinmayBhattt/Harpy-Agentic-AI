import { NextRequest, NextResponse } from 'next/server';
import { BrowserSessionManager } from '@/lib/browser/sessionManager';
import { BrowserSessionState, BrowserStepLog } from '@/lib/browser/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    const clientKey = req.headers.get('x-browserless-key') || searchParams.get('browserlessKey') || undefined;
    const clientWs = req.headers.get('x-browser-ws-endpoint') || searchParams.get('wsEndpoint') || undefined;
    const host = process.env.BROWSERLESS_HOST || 'production-sfo.browserless.io/chromium';
    const customWs =
      clientWs ||
      (clientKey
        ? (clientKey.startsWith('ws://') || clientKey.startsWith('wss://')
            ? clientKey
            : `wss://${host}?token=${clientKey}`)
        : undefined);

    // Ensure session exists
    await BrowserSessionManager.getSession(sessionId, customWs);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          try {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {}
        };

        // Send initial state
        const session = await BrowserSessionManager.getSession(sessionId);
        sendEvent('state', session.state);

        // Subscribe to state and log events
        const unsubscribe = BrowserSessionManager.subscribe(
          sessionId,
          (state: BrowserSessionState) => {
            sendEvent('state', state);
          },
          (log: BrowserStepLog) => {
            sendEvent('log', log);
          }
        );

        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);

        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Browser stream error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
