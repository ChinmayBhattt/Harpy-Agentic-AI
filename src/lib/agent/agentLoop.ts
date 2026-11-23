import { WorkspaceSandbox, AgentToolRunner, AGENT_TOOLS_DEFINITIONS } from './tools';
import { AgentEvent, PlanStep, FileChangeRecord } from './events';

export const activeAgentControllers = new Map<string, AbortController>();

interface AgentLoopOptions {
  prompt: string;
  userId?: string;
  sessionId: string;
  model?: string;
  apiKey?: string;
  provider?: 'groq' | 'openai' | 'anthropic';
  existingFiles?: FileChangeRecord[];
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
  maxSteps?: number;
}

function extractFilesFromMarkdown(text: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?(?::|\s+)?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    let filePath = match[1]?.trim();
    let code = match[2];
    if (!filePath) {
      const firstLine = code.split('\n')[0].trim();
      const pathMatch = firstLine.match(/^(?:\/\/|\/\*|#|\/\/ file:|\/\/ filepath:)\s*([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)/i);
      if (pathMatch) {
        filePath = pathMatch[1];
        code = code.split('\n').slice(1).join('\n');
      }
    }
    if (filePath && code && code.trim().length > 0) {
      files.push({ path: filePath.replace(/^[/\\]+/, ''), content: code.trim() });
    }
  }
  return files;
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
      existingFiles,
      signal,
      onEvent,
    } = options;

    const abortController = new AbortController();
    activeAgentControllers.set(sessionId, abortController);

    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    const sandbox = new WorkspaceSandbox(userId, sessionId);
    const runner = new AgentToolRunner(sandbox);

    // Pre-populate existing files so previous workspace work is preserved across prompts!
    if (existingFiles && Array.isArray(existingFiles)) {
      for (const ef of existingFiles) {
        if (ef && ef.path) {
          runner.filesChanged.set(ef.path, ef);
        }
      }
    }

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

    let apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    let headers: Record<string, string> = {
      Authorization: `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    };

    if (cleanKey.startsWith('sk-ant-')) {
      apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (cleanKey.startsWith('sk-') && !cleanKey.startsWith('sk-ant-')) {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    }

    const candidateModels = [
      model,
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'qwen/qwen3.8-27b',
      'llama-3.1-8b-instant',
    ].filter(Boolean);

    // Reusable LLM invoker with model fallback
    const callLLM = async (
      messages: Array<Record<string, unknown>>,
      tools?: Array<Record<string, unknown>>
    ): Promise<any> => {
      let lastInferenceError = '';
      for (const testModel of candidateModels) {
        try {
          const bodyPayload: Record<string, unknown> = {
            model: testModel,
            messages,
            temperature: 0.2,
            max_tokens: 3500,
          };
          if (tools && tools.length > 0) {
            bodyPayload.tools = tools;
            bodyPayload.tool_choice = 'auto';
          }

          const res = await fetch(apiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyPayload),
            signal: abortController.signal,
          });

          if (res.ok) {
            return await res.json();
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
      throw new Error(`Agent model failed to respond: ${lastInferenceError || 'Unknown error'}`);
    };

    try {
      // ──────────────────────────────────────────────────────────
      // PHASE 1: DYNAMIC PLAN FORMULATION (TAILORED TO USER PROMPT)
      // ──────────────────────────────────────────────────────────
      const planThinkingStart = Date.now();
      onEvent({ type: 'thinking_start', timestamp: planThinkingStart });

      const existingFileNames = Array.from(runner.filesChanged.keys());
      const hasExisting = existingFileNames.length > 0;

      let generatedSteps: string[] = [];

      try {
        const planPrompt = [
          {
            role: 'system',
            content: `You are HARPY AGENT, an elite software architect and fullstack code engineer.
Analyze the user's project request and formulate a direct, effective execution plan with 3 to 4 concise steps.
Current workspace existing files: ${hasExisting ? existingFileNames.join(', ') : 'None (new workspace)'}.

IMPORTANT PLANNING RULES:
- If the user asks for specific files or modifications (e.g. "create X", "add dark mode to App", "make this component"), formulate targeted steps specifically for what was requested without destroying unrelated existing files.
- If the user asks to build an entire application, plan 3 to 4 comprehensive steps:
  1. Project setup & configs (package.json, build configs, HTML shell)
  2. Core components & application logic (all required views, sub-components, state)
  3. Styles, responsive design, utilities, and documentation
- Output ONLY a valid JSON array of strings containing the step titles.`,
          },
          { role: 'user', content: prompt },
        ];

        const planRes = await callLLM(planPrompt);
        const rawContent = planRes?.choices?.[0]?.message?.content || '';
        const jsonMatch = rawContent.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            generatedSteps = parsed.map((s) => String(s).trim()).filter(Boolean);
          }
        }
      } catch (e) {
        console.warn('AI plan generation notice:', e);
      }

      if (!generatedSteps || generatedSteps.length === 0) {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('next') || lowerPrompt.includes('portfolio')) {
          generatedSteps = [
            'Initialize Next.js project configuration, package.json, and HTML shell',
            'Implement portfolio showcase sections, hero banner, and project cards',
            'Add interactive contact form, responsive styles, and documentation',
          ];
        } else if (hasExisting) {
          generatedSteps = [
            `Analyze workspace and implement requested features for "${prompt.slice(0, 40)}"`,
            'Verify code integration, styling, and exports',
          ];
        } else {
          generatedSteps = [
            'Initialize project architecture, package.json, and HTML shell',
            'Build core interactive components, state management, and application views',
            'Add polished styling, responsive layout, and documentation',
          ];
        }
      }

      // Keep steps between 2 and 4 to guarantee swift, dependable completion without stalling
      generatedSteps = generatedSteps.slice(0, 4);

      runner.plan = generatedSteps.map((title, idx) => ({
        id: `step-${idx + 1}`,
        title,
        status: idx === 0 ? ('in_progress' as const) : ('pending' as const),
      }));

      const planDuration = Math.max(1, Math.round((Date.now() - planThinkingStart) / 1000));
      onEvent({
        type: 'thinking_end',
        durationSeconds: planDuration,
        thoughtSummary: `Analyzed user specifications: "${prompt}".\nSynthesized comprehensive ${runner.plan.length}-step software development plan.\nPreserving all existing workspace files.`,
      });

      onEvent({ type: 'plan', steps: runner.plan });

      onEvent({
        type: 'tool_end',
        id: `plan_${Date.now()}`,
        tool: 'create_plan',
        status: 'success',
        resultSummary: `Formulated autonomous plan with ${runner.plan.length} steps`,
      });

      // ──────────────────────────────────────────────────────────
      // PHASE 2: SEQUENTIAL STEP-BY-STEP AI EXECUTION (WRITES ALL FILES)
      // ──────────────────────────────────────────────────────────
      const execTools = AGENT_TOOLS_DEFINITIONS.filter((t) =>
        ['write_file', 'edit_file', 'run_command', 'read_file'].includes(t.function.name)
      );

      for (let i = 0; i < runner.plan.length; i++) {
        if (abortController.signal.aborted) break;

        const currentStep = runner.plan[i];
        currentStep.status = 'in_progress';
        onEvent({ type: 'plan', steps: runner.plan });

        const stepStartTime = Date.now();
        onEvent({ type: 'thinking_start', timestamp: stepStartTime });

        const existingFilesSummary =
          Array.from(runner.filesChanged.keys())
            .map((p) => `- ${p}`)
            .join('\n') || '(None yet)';

        const stepMessages: Array<Record<string, unknown>> = [
          {
            role: 'system',
            content: `You are HARPY AGENT, an elite autonomous AI code engineer (Cursor / Antigravity style).
You are building production-ready software in a sandboxed workspace for the user's goal: "${prompt}".

Plan Checklist:
${runner.plan
  .map(
    (s, idx) =>
      `${idx + 1}. [${s.status === 'done' ? 'DONE' : s.id === currentStep.id ? 'ACTIVE' : 'PENDING'}] ${s.title}`
  )
  .join('\n')}

Workspace files already created:
${existingFilesSummary}

CRITICAL EXECUTION DIRECTIVE:
Execute Step ${i + 1}: "${currentStep.title}".
You MUST call the "write_file" tool for ALL code files required in this step.
If multiple files are needed (e.g. components, CSS, HTML, configs), write ALL of them.
Do NOT leave any file out. Write complete, functional, production-ready code with no placeholders.`,
          },
          {
            role: 'user',
            content: `Please execute Step ${i + 1}: "${currentStep.title}". Call "write_file" to write all required files now.`,
          },
        ];

        let stepRounds = 0;

        while (stepRounds < 3) {
          stepRounds++;
          const stepResponse = await callLLM(stepMessages, execTools);
          const choiceMessage = stepResponse?.choices?.[0]?.message;
          if (!choiceMessage) break;

          stepMessages.push(choiceMessage);

          if (stepRounds === 1) {
            const rawThought = choiceMessage.reasoning_content || choiceMessage.thought || '';
            let thoughtSummary = typeof rawThought === 'string' ? rawThought.trim() : '';

            if (!thoughtSummary) {
              thoughtSummary = `Executing Step ${i + 1}: "${currentStep.title}".\nArchitecting component structure and generating all required code files.`;
            }

            const stepDuration = Math.max(1, Math.round((Date.now() - stepStartTime) / 1000));
            onEvent({
              type: 'thinking_end',
              durationSeconds: stepDuration,
              thoughtSummary,
            });
          }

          const toolCalls = choiceMessage.tool_calls || [];

          if (toolCalls.length > 0) {
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

              let displayText = `Executing ${toolName}...`;
              if (toolName === 'write_file') displayText = `Creating ${toolArgs.path || 'file'}...`;
              else if (toolName === 'edit_file') displayText = `Editing ${toolArgs.path || 'file'}...`;
              else if (toolName === 'run_command') displayText = `Running ${toolArgs.command || 'command'}...`;
              else if (toolName === 'read_file') displayText = `Reading ${toolArgs.path || 'file'}...`;

              onEvent({
                type: 'tool_start',
                id: toolId,
                tool: toolName,
                args: toolArgs,
                displayText,
              });

              const toolResult = await runner.executeTool(toolName, toolArgs);

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

              stepMessages.push({
                role: 'tool',
                tool_call_id: toolId,
                name: toolName,
                content: toolResult.output || toolResult.resultSummary,
              });
            }
          } else if (choiceMessage.content) {
            // Markdown code block fallback
            const extractedFiles = extractFilesFromMarkdown(choiceMessage.content);
            for (const ef of extractedFiles) {
              const toolId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              onEvent({
                type: 'tool_start',
                id: toolId,
                tool: 'write_file',
                args: { path: ef.path, content: ef.content },
                displayText: `Creating ${ef.path}...`,
              });

              const toolResult = await runner.executeTool('write_file', {
                path: ef.path,
                content: ef.content,
              });

              onEvent({
                type: 'tool_end',
                id: toolId,
                tool: 'write_file',
                status: toolResult.status,
                resultSummary: toolResult.resultSummary,
                output: toolResult.output,
                filePath: toolResult.filePath,
              });

              if (toolResult.fileChange) {
                onEvent({
                  type: 'file_changed',
                  path: toolResult.fileChange.path,
                  action: 'created',
                  added: toolResult.fileChange.addedLines,
                  removed: toolResult.fileChange.removedLines,
                  oldContent: toolResult.fileChange.oldContent,
                  newContent: toolResult.fileChange.newContent,
                });
              }
            }
            break;
          } else {
            break;
          }
        }

        // Mark this step done and emit live checklist update
        currentStep.status = 'done';
        onEvent({ type: 'plan', steps: runner.plan });
      }

      // ──────────────────────────────────────────────────────────
      // PHASE 3: MISSION COMPLETION & EXECUTIVE SUMMARY
      // ──────────────────────────────────────────────────────────
      const filesChangedList = Array.from(runner.filesChanged.values());
      const finalSummary = `### Mission Accomplished\n\nSuccessfully completed all **${runner.plan.length}** execution steps for:\n> *"${prompt}"*\n\n**Generated Project Summary:**\n- **${filesChangedList.length}** files created/preserved in workspace.\n- Total additions: **+${filesChangedList.reduce((acc, f) => acc + f.addedLines, 0)}** lines of code.\n\n**Interactive Workspace Features:**\n- **Preview Tab**: View your live running project at \`localhost:3000\` with interactive UI.\n- **Terminal CLI Tab**: Run workspace shell commands directly in the sandbox.\n- **Download ZIP**: Export the entire project instantly.`;

      onEvent({
        type: 'message_delta',
        delta: finalSummary,
      });

      onEvent({
        type: 'done',
        filesChanged: filesChangedList,
        summary: finalSummary,
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
