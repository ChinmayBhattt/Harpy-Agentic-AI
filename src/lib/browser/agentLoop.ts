import { BrowserSessionManager } from './sessionManager';
import { AgentPlannedAction, BrowserSessionState } from './types';

// Track abort controllers for running missions
const activeAgentAborts = new Map<string, AbortController>();

const BROWSER_AGENT_PROMPT = `You are HARPY BROWSER AGENT, an elite autonomous web navigator.
You interact with web pages through an Observe → Plan → Act → Verify loop.

You will receive:
1. User's Overall Goal
2. Current Page URL and Title
3. Interactive DOM Elements (tagged with indices [1], [2], etc.)
4. Visible Page Text Summary
5. Previous Actions History

Your job is to decide the single best next action to advance toward the goal.

AVAILABLE ACTIONS:
- "navigate": Navigate to a specific URL or perform a search.
  Example: {"action": "navigate", "url": "https://news.ycombinator.com"}
- "click": Click an element by index [X] or selector.
  Example: {"action": "click", "targetIndex": 3}
- "type": Click and type text into an input field [X].
  Example: {"action": "type", "targetIndex": 1, "text": "Next.js 15 features", "pressEnter": true}
- "press_key": Press a special keyboard key like "Enter", "Tab", "Escape", "ArrowDown".
  Example: {"action": "press_key", "key": "Enter"}
- "scroll": Scroll the page "down" or "up".
  Example: {"action": "scroll", "scrollDirection": "down", "scrollAmount": 500}
- "wait": Pause briefly for dynamic content to load.
  Example: {"action": "wait"}
- "ask_confirmation": Ask user for confirmation before sensitive actions (payments, account deletion, personal credentials).
  Example: {"action": "ask_confirmation", "confirmationReason": "Submitting a financial or account form"}
- "finish": The goal is fully achieved. Provide the final synthesized answer.
  Example: {"action": "finish", "result": "The top 3 trending AI repos are: 1. vLLM, 2. LangChain, 3. Browser-Use."}

CRITICAL RULES:
1. ALWAYS output STRICT JSON ONLY. Do not output markdown fences or explanatory text outside the JSON object.
2. Structure your JSON exactly as:
{
  "thought": "Your sharp reasoning explaining what you observe and what you will do",
  "action": "click" | "type" | "navigate" | "scroll" | "press_key" | "wait" | "ask_confirmation" | "finish",
  "targetIndex": number (if clicking or typing into an indexed element),
  "text": string (if typing),
  "pressEnter": boolean (optional, if pressing enter after typing),
  "key": string (if pressing a key),
  "url": string (if navigating),
  "scrollDirection": "down" | "up" (if scrolling),
  "verificationExpectation": "What should happen after this action to prove it succeeded",
  "result": string (final comprehensive answer when action is "finish")
}
3. If you have gathered sufficient information to answer the user's goal, immediately choose "finish" with a comprehensive result.`;

export class BrowserAgent {
  public static isRunning(sessionId = 'default'): boolean {
    return activeAgentAborts.has(sessionId);
  }

  public static stop(sessionId = 'default') {
    const controller = activeAgentAborts.get(sessionId);
    if (controller) {
      controller.abort();
      activeAgentAborts.delete(sessionId);
    }
    const sessions = global.__harpyBrowserSessions!;
    const session = sessions.get(sessionId);
    if (session) {
      session.state.status = 'idle';
      BrowserSessionManager.addLog(sessionId, {
        stepNumber: session.state.currentStep,
        phase: 'SYSTEM',
        action: 'Mission aborted by user',
        status: 'failed',
      });
      BrowserSessionManager.emitState(sessionId);
    }
  }

  public static async runMission(
    goal: string,
    options: {
      sessionId?: string;
      apiKey?: string;
      model?: string;
      maxSteps?: number;
    } = {}
  ): Promise<BrowserSessionState> {
    const sessionId = options.sessionId || 'default';
    const maxSteps = options.maxSteps || 12;

    // Cancel any previous running mission for this session
    this.stop(sessionId);

    const abortController = new AbortController();
    activeAgentAborts.set(sessionId, abortController);

    const session = await BrowserSessionManager.getSession(sessionId);
    session.state.currentGoal = goal;
    session.state.currentStep = 0;
    session.state.maxSteps = maxSteps;
    session.state.status = 'observing';
    session.state.controlMode = 'agent';
    session.state.finalResult = undefined;
    session.state.lastError = undefined;

    BrowserSessionManager.addLog(sessionId, {
      stepNumber: 0,
      phase: 'SYSTEM',
      action: `Initiated Autonomous Flight: "${goal}"`,
      details: `Targeting up to ${maxSteps} autonomous execution cycles.`,
      status: 'success',
    });

    const apiKey =
      (options.apiKey && options.apiKey.trim() !== '' ? options.apiKey.trim() : null) ||
      (process.env.GROQ_API_KEY || '').trim();

    const selectedModel = options.model || 'openai/gpt-oss-120b';

    let step = 0;
    const actionHistory: string[] = [];

    try {
      while (step < maxSteps && !abortController.signal.aborted) {
        step++;
        session.state.currentStep = step;

        // ──────────────────────────────────────────────────────────
        // 1. OBSERVE
        // ──────────────────────────────────────────────────────────
        session.state.status = 'observing';
        BrowserSessionManager.emitState(sessionId);

        const observation = await BrowserSessionManager.observe(sessionId);

        BrowserSessionManager.addLog(sessionId, {
          stepNumber: step,
          phase: 'OBSERVE',
          thought: `Inspecting viewport: "${observation.state.title}" (${observation.elements.length} interactive elements)`,
          details: `Current URL: ${observation.state.url}`,
          status: 'success',
        });

        // ──────────────────────────────────────────────────────────
        // 2. PLAN (Call LLM)
        // ──────────────────────────────────────────────────────────
        session.state.status = 'planning';
        BrowserSessionManager.emitState(sessionId);

        const promptContext = `
USER GOAL: ${goal}

CURRENT PAGE:
- URL: ${observation.state.url}
- Title: ${observation.state.title}

INTERACTIVE ELEMENTS ON SCREEN:
${observation.elements
  .slice(0, 35)
  .map(
    (el) =>
      `[${el.index}] <${el.tag}${el.type ? ` type="${el.type}"` : ''}${
        el.role ? ` role="${el.role}"` : ''
      }> ${el.text ? `"${el.text}"` : ''}${el.isSensitive ? ' [SENSITIVE]' : ''}`
  )
  .join('\n')}

PAGE TEXT EXTRACT (First 1000 chars):
${observation.pageSummary.substring(0, 1000)}

ACTION HISTORY:
${actionHistory.length > 0 ? actionHistory.slice(-5).join('\n') : 'No actions taken yet.'}

Current Step: ${step} of ${maxSteps}. Decide your next action.`;

        let plan: AgentPlannedAction | null = null;

        try {
          plan = await this.callPlannerLLM(promptContext, apiKey, selectedModel);
        } catch (planErr: any) {
          console.error('Planner LLM call failed:', planErr);
          BrowserSessionManager.addLog(sessionId, {
            stepNumber: step,
            phase: 'PLAN',
            thought: 'Failed to obtain plan from model. Retrying with basic search fallback...',
            details: planErr.message,
            status: 'failed',
          });

          // Intelligent fallback: if on blank or initial google, navigate or search
          if (step === 1) {
            plan = {
              thought: 'Navigating directly to Google Search for the user goal.',
              action: 'navigate',
              url: `https://www.google.com/search?q=${encodeURIComponent(goal)}`,
              verificationExpectation: 'Google Search results will load',
            };
          } else {
            break;
          }
        }

        if (!plan) break;

        BrowserSessionManager.addLog(sessionId, {
          stepNumber: step,
          phase: 'PLAN',
          thought: plan.thought || 'Planning next action...',
          action: `Planned: ${plan.action} ${
            plan.targetIndex ? `on element [${plan.targetIndex}]` : plan.url || plan.text || ''
          }`,
          details: plan.verificationExpectation ? `Expects: ${plan.verificationExpectation}` : undefined,
          status: 'success',
        });

        // ──────────────────────────────────────────────────────────
        // SAFETY & CONFIRMATION CHECK
        // ──────────────────────────────────────────────────────────
        const targetElement = plan.targetIndex
          ? observation.elements.find((e) => e.index === plan.targetIndex)
          : null;

        if (
          plan.action === 'ask_confirmation' ||
          targetElement?.isSensitive ||
          (plan.action === 'type' && targetElement?.type === 'password')
        ) {
          session.state.status = 'awaiting_confirmation';
          const confId = `conf_${Date.now()}`;
          BrowserSessionManager.setPendingConfirmation(sessionId, {
            id: confId,
            action: plan.action,
            description:
              plan.confirmationReason ||
              `The agent is about to interact with a potentially sensitive element: ${
                targetElement?.text || targetElement?.name || 'Input field'
              }. Do you authorize this action?`,
            severity: 'high',
            elementIndex: plan.targetIndex,
            url: observation.state.url,
          });

          BrowserSessionManager.addLog(sessionId, {
            stepNumber: step,
            phase: 'CONFIRMATION',
            thought: 'Security boundary: User authorization required before proceeding.',
            details: plan.confirmationReason || 'Sensitive element interaction detected.',
            status: 'pending',
          });

          // Wait until user confirms or denies
          const confirmed = await this.waitForUserConfirmation(sessionId, confId);
          if (!confirmed) {
            BrowserSessionManager.addLog(sessionId, {
              stepNumber: step,
              phase: 'CONFIRMATION',
              action: 'Action denied by user.',
              status: 'failed',
            });
            break;
          }
        }

        // ──────────────────────────────────────────────────────────
        // 3. ACT
        // ──────────────────────────────────────────────────────────
        session.state.status = 'acting';
        BrowserSessionManager.emitState(sessionId);

        let actionSuccess = false;

        if (plan.action === 'finish') {
          session.state.status = 'completed';
          session.state.finalResult = plan.result || 'Mission successfully completed.';
          BrowserSessionManager.addLog(sessionId, {
            stepNumber: step,
            phase: 'VERIFY',
            thought: 'Mission goal achieved. Synthesis delivered.',
            action: 'COMPLETED',
            details: session.state.finalResult,
            status: 'success',
          });
          break;
        } else if (plan.action === 'navigate' && plan.url) {
          actionSuccess = await BrowserSessionManager.navigate(sessionId, plan.url);
          actionHistory.push(`Step ${step}: Navigated to ${plan.url}`);
        } else if (plan.action === 'click' && plan.targetIndex) {
          actionSuccess = await BrowserSessionManager.click(sessionId, { index: plan.targetIndex });
          actionHistory.push(
            `Step ${step}: Clicked element [${plan.targetIndex}] ("${targetElement?.text || ''}")`
          );
        } else if (plan.action === 'type' && plan.targetIndex && typeof plan.text === 'string') {
          actionSuccess = await BrowserSessionManager.typeText(
            sessionId,
            { index: plan.targetIndex },
            plan.text,
            plan.pressEnter ?? false
          );
          actionHistory.push(
            `Step ${step}: Typed "${plan.text}" into [${plan.targetIndex}]${
              plan.pressEnter ? ' and pressed Enter' : ''
            }`
          );
        } else if (plan.action === 'press_key' && plan.key) {
          actionSuccess = await BrowserSessionManager.pressKey(sessionId, plan.key);
          actionHistory.push(`Step ${step}: Pressed key "${plan.key}"`);
        } else if (plan.action === 'scroll') {
          actionSuccess = await BrowserSessionManager.scroll(
            sessionId,
            plan.scrollDirection || 'down',
            plan.scrollAmount || 500
          );
          actionHistory.push(`Step ${step}: Scrolled ${plan.scrollDirection || 'down'}`);
        } else if (plan.action === 'wait') {
          await new Promise((r) => setTimeout(r, 2000));
          actionSuccess = true;
          actionHistory.push(`Step ${step}: Paused for page stability`);
        }

        // ──────────────────────────────────────────────────────────
        // 4. VERIFY
        // ──────────────────────────────────────────────────────────
        session.state.status = 'verifying';
        const postObservation = await BrowserSessionManager.observe(sessionId);

        BrowserSessionManager.addLog(sessionId, {
          stepNumber: step,
          phase: 'VERIFY',
          thought: actionSuccess
            ? `Action executed smoothly. Current page is now "${postObservation.state.title}".`
            : 'Action faced an issue or element was unresponsive.',
          action: actionSuccess ? 'Verified State Transition' : 'Verification Warning',
          details: plan.verificationExpectation,
          status: actionSuccess ? 'success' : 'failed',
        });

        // Small pause between cycles for smooth UI perception
        await new Promise((r) => setTimeout(r, 1200));
      }

      if (session.state.status !== 'completed') {
        session.state.status = 'completed';
        if (!session.state.finalResult) {
          session.state.finalResult = `Autonomous mission reached step limit (${step}/${maxSteps}). Final state: ${session.state.title} (${session.state.url})`;
        }
      }
    } catch (loopErr: any) {
      console.error('Agent loop encountered error:', loopErr);
      session.state.status = 'error';
      session.state.lastError = loopErr.message;
      BrowserSessionManager.addLog(sessionId, {
        stepNumber: step,
        phase: 'SYSTEM',
        action: 'Mission terminated due to error',
        details: loopErr.message,
        status: 'failed',
      });
    } finally {
      activeAgentAborts.delete(sessionId);
      BrowserSessionManager.emitState(sessionId);
    }

    return session.state;
  }

  private static async callPlannerLLM(
    contextPrompt: string,
    apiKey: string,
    modelName: string
  ): Promise<AgentPlannedAction> {
    const candidateModels = [
      modelName,
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'allam-2-7b',
      'llama-3.1-8b-instant',
    ];

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: BROWSER_AGENT_PROMPT },
              { role: 'user', content: contextPrompt },
            ],
            temperature: 0.1,
            max_tokens: 600,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Model ${model} returned ${response.status}: ${JSON.stringify(errData)}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content) as AgentPlannedAction;
        return parsed;
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error('All planner models failed to respond');
  }

  private static async waitForUserConfirmation(
    sessionId: string,
    confId: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const session = global.__harpyBrowserSessions?.get(sessionId);
        if (!session) {
          clearInterval(interval);
          resolve(false);
          return;
        }

        // If confirmation is cleared, check result
        if (!session.state.pendingConfirmation) {
          clearInterval(interval);
          resolve(true);
        }
      }, 500);

      // Max timeout of 3 minutes for confirmation
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, 180000);
    });
  }
}
