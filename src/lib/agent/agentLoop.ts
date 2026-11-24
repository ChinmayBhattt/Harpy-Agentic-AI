import { WorkspaceSandbox, AgentToolRunner, AGENT_TOOLS_DEFINITIONS } from './tools';
import { AgentEvent, PlanStep, FileChangeRecord } from './events';
import { detectWorkspaceTechStack, ensureAgentsMarkdown } from './techStack';

export const activeAgentControllers = new Map<string, AbortController>();
export const activeApprovalResolvers = new Map<string, (approved: boolean) => void>();

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
  maxTurns?: number;
  planMode?: boolean;
}

/**
 * Compacts conversation history to prevent context window overflow
 * Keeps system message, user prompt, and compacts older tool outputs
 */
function compactMessages(messages: Array<Record<string, unknown>>, maxFullTurns = 6): Array<Record<string, unknown>> {
  if (messages.length <= 15) return messages;

  const result: Array<Record<string, unknown>> = [];
  const cutoffIndex = Math.max(2, messages.length - maxFullTurns * 2);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (i <= 1 || i >= cutoffIndex) {
      result.push(msg);
    } else if (msg.role === 'tool') {
      const content = typeof msg.content === 'string' ? msg.content : '';
      if (content.length > 300) {
        result.push({
          ...msg,
          content: `${content.slice(0, 250)}\n... [Tool output truncated for context compaction]`,
        });
      } else {
        result.push(msg);
      }
    } else {
      result.push(msg);
    }
  }

  return result;
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

  public static resolveApproval(approvalId: string, approved: boolean) {
    const resolver = activeApprovalResolvers.get(approvalId);
    if (resolver) {
      resolver(approved);
      activeApprovalResolvers.delete(approvalId);
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
      maxTurns = 35,
      planMode = false,
    } = options;

    const abortController = new AbortController();
    activeAgentControllers.set(sessionId, abortController);

    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    const sandbox = new WorkspaceSandbox(userId, sessionId);
    const runner = new AgentToolRunner(sandbox);

    // Wire live plan updates to UI stream
    runner.onPlanUpdate = (plan) => {
      onEvent({ type: 'plan', steps: plan });
    };

    // Wire approval requests for risky operations
    runner.onApprovalRequired = async (req) => {
      onEvent({
        type: 'approval_required',
        id: req.id,
        command: req.command,
        reason: req.reason,
      });

      return new Promise<boolean>((resolve) => {
        activeApprovalResolvers.set(req.id, (approved) => {
          onEvent({
            type: 'approval_resolved',
            id: req.id,
            approved,
          });
          resolve(approved);
        });

        // Auto-reject if session aborted
        abortController.signal.addEventListener('abort', () => {
          activeApprovalResolvers.delete(req.id);
          resolve(false);
        });
      });
    };

    // Preserve files from earlier sessions
    if (existingFiles && Array.isArray(existingFiles)) {
      for (const ef of existingFiles) {
        if (ef && ef.path) {
          runner.filesChanged.set(ef.path, ef);
          runner.sessionReadFiles.add(ef.path);
        }
      }
    }

    // SECTION D: Tech stack detection and AGENTS.md injection
    const techStack = detectWorkspaceTechStack(sandbox.workspaceRoot);
    const agentsMd = ensureAgentsMarkdown(sandbox.workspaceRoot);

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

    const isAnthropic = cleanKey.startsWith('sk-ant-');
    const isOpenAI = cleanKey.startsWith('sk-') && !isAnthropic;

    let apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    let headers: Record<string, string> = {
      Authorization: `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    };

    if (isAnthropic) {
      apiEndpoint = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': cleanKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      };
    } else if (isOpenAI) {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    }

    const candidateModels = isAnthropic
      ? ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
      : [
          model,
          'openai/gpt-oss-120b',
          'llama-3.3-70b-versatile',
          'qwen/qwen3.8-27b',
          'llama-3.1-8b-instant',
        ].filter(Boolean);

    // SECTION E: Standard Senior Autonomous Agent System Prompt
    const systemPromptContent = `You are Harpy Agent, an autonomous senior software engineer powered by Claude working inside the user's EXISTING project.
TECH STACK (mandatory, never deviate): ${techStack.summary}

PROJECT INSTRUCTIONS (from AGENTS.md):
${agentsMd}

YOUR TARGET BEHAVIOR & PROTOCOL:
1. EXPLORE: list the directory and read relevant files and AGENTS.md before changing anything.
2. PLAN: write a complete todo list of every change needed using update_todos. Show it to the user.
3. EXECUTE: one todo at a time, one file per tool call. Mark todos done as you go with update_todos.
4. EDIT existing files with edit_file. NEVER recreate or overwrite an existing file. Read with read_file before editing.
5. RUN: install, build, lint, tests, dev server. Read errors and fix them. Repeat until all pass.
6. FINISH only when ALL todos are done and the build passes. Call finish with your summary. Never stop midway, never leave placeholders like "TODO" or "rest of code here".
7. End with a short summary: what changed, how to run it, known limitations.`;

    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPromptContent },
      { role: 'user', content: prompt },
    ];

    // Helper to invoke model across candidate models
    const callLLM = async (
      currentMessages: Array<Record<string, unknown>>,
      tools?: Array<Record<string, unknown>>
    ): Promise<any> => {
      let lastInferenceError = '';
      for (const testModel of candidateModels) {
        try {
          if (isAnthropic) {
            // Anthropic Messages API format
            const anthropicTools = (tools || []).map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              input_schema: t.function.parameters,
            }));

            // Extract system prompt from messages
            const sysMsg = currentMessages.find((m) => m.role === 'system');
            const nonSysMessages = currentMessages
              .filter((m) => m.role !== 'system')
              .map((m) => ({
                role: m.role === 'tool' ? 'user' : m.role,
                content:
                  m.role === 'tool'
                    ? [
                        {
                          type: 'tool_result',
                          tool_use_id: m.tool_call_id,
                          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                        },
                      ]
                    : typeof m.content === 'string'
                    ? m.content
                    : JSON.stringify(m.content),
              }));

            const payload: Record<string, unknown> = {
              model: testModel,
              system: typeof sysMsg?.content === 'string' ? sysMsg.content : systemPromptContent,
              messages: nonSysMessages,
              max_tokens: 4096,
              temperature: 0.2,
            };

            if (anthropicTools.length > 0) {
              payload.tools = anthropicTools;
            }

            const res = await fetch(apiEndpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
              signal: abortController.signal,
            });

            if (res.ok) {
              const data = await res.json();
              // Convert Anthropic response format to OpenAI-like format for unified handling
              const toolCalls: any[] = [];
              let textContent = '';

              for (const block of data.content || []) {
                if (block.type === 'text') {
                  textContent += block.text;
                } else if (block.type === 'tool_use') {
                  toolCalls.push({
                    id: block.id,
                    type: 'function',
                    function: {
                      name: block.name,
                      arguments: JSON.stringify(block.input || {}),
                    },
                  });
                }
              }

              return {
                choices: [
                  {
                    message: {
                      role: 'assistant',
                      content: textContent || null,
                      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
                    },
                    finish_reason: data.stop_reason === 'max_tokens' ? 'length' : 'stop',
                  },
                ],
              };
            }

            const errData = await res.json().catch(() => ({}));
            lastInferenceError = errData?.error?.message || res.statusText || 'Anthropic API error';
          } else {
            // OpenAI / Groq format
            const bodyPayload: Record<string, unknown> = {
              model: testModel,
              messages: currentMessages,
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
          }
        } catch (fetchErr: unknown) {
          if (abortController.signal.aborted) throw fetchErr;
          lastInferenceError = fetchErr instanceof Error ? fetchErr.message : 'Inference error';
        }
      }
      throw new Error(`Agent model failed to respond: ${lastInferenceError || 'Unknown error'}`);
    };

    try {
      const startTime = Date.now();
      onEvent({ type: 'thinking_start', timestamp: startTime });

      let turnCount = 0;
      let missionFinished = false;
      let finalSummary = '';

      // SECTION A: Continuous Autonomous Agent Loop
      while (turnCount < maxTurns && !missionFinished) {
        if (abortController.signal.aborted) break;
        turnCount++;

        // Context management: compact earlier tool outputs when conversation expands
        const activeMessages = compactMessages(messages);

        const llmResponse = await callLLM(activeMessages, AGENT_TOOLS_DEFINITIONS);
        const choice = llmResponse?.choices?.[0];
        const choiceMessage = choice?.message;
        const finishReason = choice?.finish_reason;

        if (!choiceMessage) break;

        messages.push(choiceMessage);

        // Stream assistant text delta
        if (choiceMessage.content) {
          onEvent({
            type: 'message_delta',
            delta: choiceMessage.content,
          });
        }

        // Section A: Handle max_tokens continuation
        if (finishReason === 'length') {
          // If response was cut off by token limit, prompt it to continue without stopping
          messages.push({
            role: 'user',
            content: 'Your previous response hit the token limit. Please continue immediately from exactly where you left off without repeating or stopping.',
          });
          continue;
        }

        const toolCalls = choiceMessage.tool_calls || [];

        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            if (abortController.signal.aborted) break;

            const toolId = toolCall.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const toolName = toolCall.function?.name || '';
            let toolArgs: Record<string, unknown> = {};
            try {
              toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
            } catch {
              toolArgs = {};
            }

            let displayText = `Executing ${toolName}...`;
            if (toolName === 'create_file') displayText = `Creating ${toolArgs.path || 'file'}...`;
            else if (toolName === 'edit_file') displayText = `Editing ${toolArgs.path || 'file'}...`;
            else if (toolName === 'read_file') displayText = `Reading ${toolArgs.path || 'file'}...`;
            else if (toolName === 'run_command') displayText = `Running ${toolArgs.command || 'command'}...`;
            else if (toolName === 'grep_search') displayText = `Searching for "${toolArgs.query || ''}"...`;
            else if (toolName === 'update_todos') displayText = `Updating plan todos...`;
            else if (toolName === 'finish') displayText = `Verifying build and finishing mission...`;

            onEvent({
              type: 'tool_start',
              id: toolId,
              tool: toolName,
              args: toolArgs,
              displayText,
            });

            // If in Plan Mode and tool is update_todos or create_plan, check if initial plan was generated
            if (planMode && (toolName === 'update_todos' || toolName === 'create_plan')) {
              const toolResult = await runner.executeTool(toolName, toolArgs);
              onEvent({
                type: 'tool_end',
                id: toolId,
                tool: toolName,
                status: toolResult.status,
                resultSummary: toolResult.resultSummary,
                output: toolResult.output,
              });

              messages.push({
                role: 'tool',
                tool_call_id: toolId,
                name: toolName,
                content: toolResult.output || toolResult.resultSummary,
              });

              // In Plan Mode, formulate plan then pause for user approval before modifying files
              finalSummary = `Plan formulated with ${runner.plan.length} steps. Ready for user approval to begin execution.`;
              missionFinished = true;
              break;
            }

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

            // Check if finish succeeded
            if (toolName === 'finish' && toolResult.status === 'success') {
              missionFinished = true;
              finalSummary = toolResult.output || toolResult.resultSummary;
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolId,
              name: toolName,
              content: toolResult.output || toolResult.resultSummary,
            });
          }
        } else {
          // Model did not call tools in this turn
          const incompleteTodos = runner.plan.filter((s) => s.status !== 'done');
          if (incompleteTodos.length > 0) {
            messages.push({
              role: 'user',
              content: `You have ${incompleteTodos.length} incomplete todos remaining:\n${incompleteTodos.map((t) => `- [${t.status}] ${t.title}`).join('\n')}\nPlease proceed with the next todo using the appropriate tools.`,
            });
          } else if (runner.plan.length > 0 && runner.filesChanged.size > 0 && !missionFinished) {
            // Prompt agent to run finish tool
            messages.push({
              role: 'user',
              content: `All planned todos appear complete. Please verify your work and call the "finish" tool with an executive summary.`,
            });
          } else {
            // No tools called and no remaining tasks
            missionFinished = true;
            finalSummary = choiceMessage.content || 'Task completed.';
          }
        }
      }

      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      onEvent({
        type: 'thinking_end',
        durationSeconds: durationSec,
        thoughtSummary: `Completed execution in ${turnCount} turns across ${runner.filesChanged.size} files.`,
      });

      const filesChangedList = Array.from(runner.filesChanged.values());
      if (!finalSummary) {
        finalSummary = `### Mission Accomplished\n\nCompleted all execution steps for:\n> *"${prompt}"*\n\n**Summary:**\n- **${filesChangedList.length}** files modified in workspace.\n- **${runner.plan.filter((s) => s.status === 'done').length} / ${runner.plan.length}** todos completed.`;
      }

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
