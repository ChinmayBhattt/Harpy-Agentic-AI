import { NextResponse } from 'next/server';
import { BrowserSessionManager } from '@/lib/browser/sessionManager';
import { BrowserAgent } from '@/lib/browser/agentLoop';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';

    const session = await BrowserSessionManager.getSession(sessionId);

    // If session has no screenshot yet, observe once
    if (!session.state.screenshot) {
      await BrowserSessionManager.observe(sessionId);
    }

    return NextResponse.json({
      success: true,
      state: session.state,
      isRunning: BrowserAgent.isRunning(sessionId),
    });
  } catch (err: any) {
    console.error('Browser GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, sessionId = 'default' } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action parameter' }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────
    // 1. START AGENT AUTONOMOUS MISSION
    // ──────────────────────────────────────────────────────────
    if (action === 'start_agent') {
      const { goal, model, apiKey, maxSteps } = body;
      if (!goal || typeof goal !== 'string') {
        return NextResponse.json({ success: false, error: 'Missing mission goal' }, { status: 400 });
      }

      // Start mission asynchronously so HTTP response is returned immediately
      BrowserAgent.runMission(goal, {
        sessionId,
        model,
        apiKey,
        maxSteps: maxSteps || 12,
      }).catch((err) => {
        console.error('Async browser mission error:', err);
      });

      return NextResponse.json({
        success: true,
        message: `Mission launched: "${goal}"`,
        sessionId,
      });
    }

    // ──────────────────────────────────────────────────────────
    // 2. STOP AGENT MISSION
    // ──────────────────────────────────────────────────────────
    if (action === 'stop_agent') {
      BrowserAgent.stop(sessionId);
      return NextResponse.json({ success: true, message: 'Mission stopped.' });
    }

    // ──────────────────────────────────────────────────────────
    // 3. MANUAL NAVIGATION
    // ──────────────────────────────────────────────────────────
    if (action === 'navigate') {
      const { url } = body;
      if (!url) {
        return NextResponse.json({ success: false, error: 'Missing URL' }, { status: 400 });
      }
      const ok = await BrowserSessionManager.navigate(sessionId, url);
      const session = await BrowserSessionManager.getSession(sessionId);
      return NextResponse.json({ success: ok, state: session.state });
    }

    // ──────────────────────────────────────────────────────────
    // 4. MANUAL INTERACTION (Click, Type, Key, Scroll)
    // ──────────────────────────────────────────────────────────
    if (action === 'manual_action') {
      const { subAction, x, y, index, text, pressEnter, key, direction, amount } = body;

      if (subAction === 'click') {
        const ok = await BrowserSessionManager.click(sessionId, { x, y, index });
        const session = await BrowserSessionManager.getSession(sessionId);
        return NextResponse.json({ success: ok, state: session.state });
      }

      if (subAction === 'type') {
        const ok = await BrowserSessionManager.typeText(
          sessionId,
          { index },
          text || '',
          pressEnter ?? false
        );
        const session = await BrowserSessionManager.getSession(sessionId);
        return NextResponse.json({ success: ok, state: session.state });
      }

      if (subAction === 'press_key') {
        const ok = await BrowserSessionManager.pressKey(sessionId, key || 'Enter');
        const session = await BrowserSessionManager.getSession(sessionId);
        return NextResponse.json({ success: ok, state: session.state });
      }

      if (subAction === 'scroll') {
        const ok = await BrowserSessionManager.scroll(sessionId, direction || 'down', amount || 500);
        const session = await BrowserSessionManager.getSession(sessionId);
        return NextResponse.json({ success: ok, state: session.state });
      }
    }

    // ──────────────────────────────────────────────────────────
    // 5. HISTORY & NAVIGATION CONTROLS
    // ──────────────────────────────────────────────────────────
    if (action === 'history') {
      const { command } = body;
      let ok = false;
      if (command === 'back') ok = await BrowserSessionManager.goBack(sessionId);
      else if (command === 'forward') ok = await BrowserSessionManager.goForward(sessionId);
      else if (command === 'reload') ok = await BrowserSessionManager.reload(sessionId);

      const session = await BrowserSessionManager.getSession(sessionId);
      return NextResponse.json({ success: ok, state: session.state });
    }

    // ──────────────────────────────────────────────────────────
    // 6. CONFIRMATION OF SENSITIVE ACTION
    // ──────────────────────────────────────────────────────────
    if (action === 'confirm') {
      const { allowed } = body;
      if (allowed) {
        BrowserSessionManager.setPendingConfirmation(sessionId, null);
      } else {
        BrowserAgent.stop(sessionId);
      }
      return NextResponse.json({ success: true, allowed });
    }

    // ──────────────────────────────────────────────────────────
    // 7. SET CONTROL MODE (Agent vs Manual)
    // ──────────────────────────────────────────────────────────
    if (action === 'set_mode') {
      const { mode } = body;
      if (mode === 'agent' || mode === 'manual') {
        BrowserSessionManager.setControlMode(sessionId, mode);
        return NextResponse.json({ success: true, mode });
      }
    }

    // ──────────────────────────────────────────────────────────
    // 8. RESET SESSION
    // ──────────────────────────────────────────────────────────
    if (action === 'reset') {
      BrowserAgent.stop(sessionId);
      await BrowserSessionManager.navigate(sessionId, 'https://www.google.com');
      const session = await BrowserSessionManager.getSession(sessionId);
      return NextResponse.json({ success: true, state: session.state });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Browser POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
