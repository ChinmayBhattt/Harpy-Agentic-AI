import { WorkspaceSandbox, AgentToolRunner, AGENT_TOOLS_DEFINITIONS } from './tools';
import { AgentEvent, PlanStep, FileChangeRecord } from './events';

export const activeAgentControllers = new Map<string, AbortController>();

const AGENT_SYSTEM_PROMPT = `You are HARPY AGENT, an elite autonomous AI software engineer and code architect (Google Antigravity / Cursor style).
You have full access to a sandboxed workspace directory to build complete, functional, production-ready software.

Your workflow MUST be structured, rigorous, and completely self-contained:
1. ALWAYS start by calling "create_plan" with a clean, logical checklist of steps (e.g. initialize project, configure dependencies, build core components, add styles, verify build).
2. Before starting each phase, call "update_plan" with status: "in_progress".
3. Write clean, complete, high-quality code. Do NOT leave placeholders, TODOs, or truncated snippets. Write the entire file contents.
4. DEPENDENCIES & PROJECT SETUP:
   - Declare all dependencies, scripts, and libraries completely inside "package.json".
   - Do NOT stall or wait on long "npm install" processes in serverless environments. Proceed directly to building all components, style files, entrypoints, and configurations.
5. Create every single file required for the project (e.g., App component, sub-components, CSS modules, HTML, utils, and README).
6. When editing files, use "edit_file" with precise string matching, or "write_file" if creating or replacing the file.
7. Use "run_command" only for fast verification or syntax validation if needed.
8. When each step is finished, immediately call "update_plan" with status: "done".
9. CRITICAL AUTONOMY DIRECTIVE: Continue calling tools continuously without stopping until EVERY step in your plan has status "done". Do NOT output conversational chit-chat while steps remain incomplete.
10. Once ALL tasks are marked "done", output a comprehensive executive final summary in rich Markdown explaining the architecture, features built, and instructions to run.`;

interface AgentLoopOptions {
  prompt: string;
  userId?: string;
  sessionId: string;
  model?: string;
  apiKey?: string;
  provider?: 'groq' | 'openai' | 'anthropic';
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
  maxSteps?: number;
}

export class AgentLoop {
  public static abort(sessionId: string) {
    const controller = activeAgentControllers.get(sessionId);
    if (controller) {
      controller.abort();
      activeAgentControllers.delete(sessionId);
      return true;
    }
    return false;
  }

  public static async run(options: AgentLoopOptions): Promise<{
    plan: PlanStep[];
    filesChanged: FileChangeRecord[];
    summary: string;
  }> {
    const {
      prompt,
      userId = 'anonymous',
      sessionId,
      model = 'openai/gpt-oss-120b',
      apiKey,
      signal,
      onEvent,
      maxSteps = 40,
    } = options;

    const abortController = new AbortController();
    activeAgentControllers.set(sessionId, abortController);

    // Link incoming external signal to internal controller
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    const sandbox = new WorkspaceSandbox(userId, sessionId);
    const runner = new AgentToolRunner(sandbox);

    const cleanKey = (apiKey && apiKey.trim() !== '')
      ? apiKey.trim()
      : (process.env.GROQ_API_KEY || '').trim();

    if (!cleanKey) {
      const errEv: AgentEvent = {
        type: 'error',
        message: 'No API key configured for Agent Mode. Please configure an API key in System Settings.',
      };
      onEvent(errEv);
      throw new Error(errEv.message);
    }

    // Determine LLM provider & endpoint
    let apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    let headers: Record<string, string> = {
      Authorization: `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    };

    if (cleanKey.startsWith('sk-ant-')) {
      // For Anthropic Claude, we can use OpenAI-compatible proxy or Groq fallback
      apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (cleanKey.startsWith('sk-') && !cleanKey.startsWith('sk-ant-')) {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    }

    // Candidate model with fallback list for tool calling
    const candidateModels = [
      model,
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'qwen/qwen3.8-27b',
      'llama-3.1-8b-instant',
    ].filter(Boolean);

    let chosenModel = candidateModels[0];

    const conversationMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    let stepCount = 0;
    let finalSummary = '';

    try {
      while (stepCount < maxSteps) {
        if (abortController.signal.aborted) {
          onEvent({ type: 'error', message: 'Agent mission was stopped by user.' });
          break;
        }

        stepCount++;
        const thinkingStartTime = Date.now();
        onEvent({ type: 'thinking_start', timestamp: thinkingStartTime });

        let responseData: any = null;
        let lastInferenceError = '';

        for (const testModel of candidateModels) {
          try {
            const res = await fetch(apiEndpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model: testModel,
                messages: conversationMessages,
                tools: AGENT_TOOLS_DEFINITIONS,
                tool_choice: 'auto',
                temperature: 0.2,
                max_tokens: 3000,
              }),
              signal: abortController.signal,
            });

            if (res.ok) {
              responseData = await res.json();
              chosenModel = testModel;
              break;
            }

            const errData = await res.json().catch(() => ({}));
            lastInferenceError = errData?.error?.message || res.statusText || 'Inference error';
            if (res.status === 401) {
              throw new Error(`Authentication failed: ${lastInferenceError}`);
            }
          } catch (fetchErr: unknown) {
            if (abortController.signal.aborted) throw fetchErr;
            lastInferenceError = fetchErr instanceof Error ? fetchErr.message : 'Inference error';
          }
        }

        const thinkingDuration = Math.max(1, Math.round((Date.now() - thinkingStartTime) / 1000));

        if (!responseData || !responseData.choices?.[0]?.message) {
          throw new Error(`Agent model failed to respond: ${lastInferenceError || 'Unknown error'}`);
        }

        const choiceMessage = responseData.choices[0].message;
        conversationMessages.push(choiceMessage);

        const toolCalls = choiceMessage.tool_calls;

        // Extract deep reasoning content or formulate clear execution thought
        const rawReasoning = choiceMessage.reasoning_content || choiceMessage.thought || '';
        let thoughtSummary = typeof rawReasoning === 'string' ? rawReasoning.trim() : '';

        if (!thoughtSummary && choiceMessage.content && toolCalls && toolCalls.length > 0) {
          thoughtSummary = choiceMessage.content.trim();
        }

        if (!thoughtSummary) {
          const activeStep = runner.plan.find((s) => s.status === 'in_progress') || runner.plan.find((s) => s.status === 'pending');
          const stepDesc = activeStep ? `"${activeStep.title}"` : 'workspace files';
          if (toolCalls && toolCalls.length > 0) {
            const firstTool = toolCalls[0]?.function?.name || 'tool';
            thoughtSummary = `Formulating implementation strategy for ${stepDesc}.\nAnalyzing code architecture, component hierarchy, and invoking ${firstTool}.`;
          } else {
            thoughtSummary = `Synthesizing architectural specifications and reviewing file dependencies for ${stepDesc}.`;
          }
        }

        onEvent({
          type: 'thinking_end',
          durationSeconds: thinkingDuration,
          thoughtSummary,
        });

        // If assistant emitted content text, stream it
        if (choiceMessage.content) {
          finalSummary += choiceMessage.content;
          onEvent({ type: 'message_delta', delta: choiceMessage.content });
        }

        // If no tool calls were made, check if there are remaining unfinished tasks in the plan!
        if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
          const unfinishedSteps = runner.plan.filter((s) => s.status !== 'done');
          if (unfinishedSteps.length > 0 && stepCount < maxSteps) {
            const nextStep = runner.plan.find((s) => s.status === 'in_progress') || unfinishedSteps[0];
            if (nextStep.status === 'pending') {
              nextStep.status = 'in_progress';
              onEvent({ type: 'plan', steps: runner.plan });
            }
            conversationMessages.push({
              role: 'user',
              content: `CRITICAL: You still have ${unfinishedSteps.length} unfinished step(s) in your plan checklist. Next target: "${nextStep.title}" (ID: ${nextStep.id}). You MUST continue immediately by invoking the required tool (write_file, edit_file, or run_command) to complete this step. When finished with the step, call update_plan with status: "done". Continue building until ALL steps are done.`,
            });
            continue;
          }
          break;
        }

        // Execute each tool sequentially
        for (const toolCall of toolCalls) {
          if (abortController.signal.aborted) break;

          const toolId = toolCall.id || `call_${Date.now()}`;
          const toolName = toolCall.function?.name || '';
          let toolArgs: Record<string, unknown> = {};

          try {
            toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
          } catch {
            toolArgs = {};
          }

          // Build human-friendly display label
          let displayText = `Calling ${toolName}...`;
          if (toolName === 'create_plan') {
            const count = Array.isArray(toolArgs.steps) ? toolArgs.steps.length : 0;
            displayText = `Formulating execution plan (${count} steps)...`;
          } else if (toolName === 'update_plan') {
            displayText = `Updating task ${toolArgs.stepId || ''} › ${toolArgs.status || ''}`;
          } else if (toolName === 'write_file') {
            displayText = `Creating ${toolArgs.path || 'file'}...`;
          } else if (toolName === 'edit_file') {
            displayText = `Editing ${toolArgs.path || 'file'}...`;
          } else if (toolName === 'read_file') {
            displayText = `Reading ${toolArgs.path || 'file'}...`;
          } else if (toolName === 'run_command') {
            displayText = `Running ${toolArgs.command || 'command'}...`;
          } else if (toolName === 'list_dir') {
            displayText = `Inspecting directory ${toolArgs.path || '.'}...`;
          }

          onEvent({
            type: 'tool_start',
            id: toolId,
            tool: toolName,
            args: toolArgs,
            displayText,
          });

          // Execute tool in sandbox
          const toolResult = await runner.executeTool(toolName, toolArgs);

          // Emit tool_end event
          onEvent({
            type: 'tool_end',
            id: toolId,
            tool: toolName,
            status: toolResult.status,
            resultSummary: toolResult.resultSummary,
            output: toolResult.output,
            exitCode: toolResult.exitCode,
            filePath: toolResult.filePath,
            lineRange: toolResult.lineRange,
          });

          // If plan was updated or created, emit plan event
          if (toolName === 'create_plan' || toolName === 'update_plan') {
            onEvent({
              type: 'plan',
              steps: runner.plan,
            });
          }

          // If file was changed, emit file_changed event
          if (toolResult.fileChange) {
            onEvent({
              type: 'file_changed',
              path: toolResult.fileChange.path,
              action: toolResult.fileChange.action === 'created' ? 'created' : 'edited',
              added: toolResult.fileChange.addedLines,
              removed: toolResult.fileChange.removedLines,
              oldContent: toolResult.fileChange.oldContent,
              newContent: toolResult.fileChange.newContent,
            });
          }

          // Feed tool execution output back to LLM conversation
          conversationMessages.push({
            role: 'tool',
            tool_call_id: toolId,
            name: toolName,
            content: toolResult.output || toolResult.resultSummary,
          });
        }
      }

      const filesChangedList = Array.from(runner.filesChanged.values());

      onEvent({
        type: 'done',
        filesChanged: filesChangedList,
        summary: finalSummary || `Mission completed. ${filesChangedList.length} files created or updated.`,
      });

      return {
        plan: runner.plan,
        filesChanged: filesChangedList,
        summary: finalSummary,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Agent mission error';
      onEvent({ type: 'error', message });
      throw err;
    } finally {
      activeAgentControllers.delete(sessionId);
    }
  }
}
