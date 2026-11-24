import path from 'path';
import fs from 'fs';
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
 * Extracts code blocks from markdown responses as fallback for open models
 */
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

    // Rehydrate existing files on disk so every tool (list_dir, read_file, edit_file) sees them immediately
    if (existingFiles && Array.isArray(existingFiles)) {
      for (const ef of existingFiles) {
        if (ef && ef.path) {
          try {
            const safeAbs = sandbox.resolveSafePath(ef.path);
            const parentDir = path.dirname(safeAbs);
            if (!fs.existsSync(parentDir)) {
              fs.mkdirSync(parentDir, { recursive: true });
            }
            if (ef.newContent !== undefined && ef.newContent !== null) {
              fs.writeFileSync(safeAbs, ef.newContent, 'utf-8');
            }
          } catch {}
          runner.filesChanged.set(ef.path, ef);
          runner.sessionReadFiles.add(ef.path);
        }
      }
    }

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

    // SECTION D: Tech stack detection adapting to user prompt and project
    const techStack = detectWorkspaceTechStack(sandbox.workspaceRoot, prompt);
    const agentsMd = ensureAgentsMarkdown(sandbox.workspaceRoot, prompt);

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

    // SECTION E: Standard Senior Autonomous Agent System Prompt (Antigravity & Claude Style)
    const systemPromptContent = `You are Harpy Agent, an elite autonomous senior software engineer (Antigravity / Claude Code style) working in the user's workspace.
TARGET TECH STACK: ${techStack.summary}

PROJECT INSTRUCTIONS (from AGENTS.md):
${agentsMd}

YOUR AUTONOMOUS DIRECTIVES:
1. EXPLORE & PLAN:
   - For any multi-step request, maintain a structured todo list using update_todos.
   - Read relevant files with read_file before editing existing code.
2. FULL APPLICATION COMPLETENESS:
   - When asked to build an application or feature (e.g. Next.js, React, To-Do app, Portfolio, Dashboard):
     You MUST implement the COMPLETE, production-ready application with full UI, state management, styling, and interactive features.
     - For web apps, create:
       1) "index.html" (clean HTML shell with Tailwind CSS CDN, Lucide/FontAwesome, and root div)
       2) "src/App.jsx" or "src/App.tsx" (the complete, fully functional interactive application with state, filters, animations, local storage persistence, and rich styling)
       3) Any auxiliary components and "package.json".
     - NEVER create 1-line dummy console stubs when asked for an application.
     - NEVER refuse a user's chosen tech stack (e.g. Next.js, React). Build what the user asked for.
3. SURGICAL TOOLS:
   - Use create_file for brand NEW files.
   - Use edit_file for EXISTING files with exact search-and-replace old_str and new_str.
   - Use run_command to verify builds, run scripts, or test.
4. FINISH ONLY WHEN COMPLETE:
   - Mark todos done as you complete them.
   - Call "finish" with an executive summary only when all files are written, features work, and the application is complete.`;

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
            const anthropicTools = (tools || []).map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              input_schema: t.function.parameters,
            }));

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

        // Compact context to avoid token limits
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

          // Fallback: extract markdown code blocks if the model emitted files inside code blocks
          const extractedFiles = extractFilesFromMarkdown(choiceMessage.content);
          if (extractedFiles.length > 0) {
            for (const ef of extractedFiles) {
              const toolId = `codeblock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              onEvent({
                type: 'tool_start',
                id: toolId,
                tool: 'create_file',
                args: { path: ef.path },
                displayText: `Creating ${ef.path}...`,
              });

              const fileRes = await runner.executeTool('create_file', {
                path: ef.path,
                content: ef.content,
              });

              onEvent({
                type: 'tool_end',
                id: toolId,
                tool: 'create_file',
                status: fileRes.status,
                resultSummary: fileRes.resultSummary,
                output: fileRes.output,
                filePath: fileRes.filePath,
              });

              if (fileRes.fileChange) {
                onEvent({
                  type: 'file_changed',
                  path: fileRes.fileChange.path,
                  action: fileRes.fileChange.action === 'created' ? 'created' : 'edited',
                  added: fileRes.fileChange.addedLines,
                  removed: fileRes.fileChange.removedLines,
                  oldContent: fileRes.fileChange.oldContent,
                  newContent: fileRes.fileChange.newContent,
                });
              }
            }
          }
        }

        // Handle max_tokens continuation seamlessly
        if (finishReason === 'length') {
          messages.push({
            role: 'user',
            content: 'Your previous response reached max tokens. Please continue directly from where you left off without repeating or stopping.',
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
            else if (toolName === 'update_todos') displayText = `Updating plan checklist...`;
            else if (toolName === 'finish') displayText = `Verifying application and finishing mission...`;

            onEvent({
              type: 'tool_start',
              id: toolId,
              tool: toolName,
              args: toolArgs,
              displayText,
            });

            // In Plan Mode, formulate plan then pause for user approval before modifying files
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

              finalSummary = `Plan formulated with ${runner.plan.length} steps. Ready for user review. Click "Approve & Execute" to begin.`;
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
          const hasWrittenAppFiles = Array.from(runner.filesChanged.keys()).some((k) =>
            /app\.(jsx|tsx|js)|index\.html|page\.(jsx|tsx|js)/i.test(k)
          );

          if (incompleteTodos.length > 0 && !hasWrittenAppFiles) {
            messages.push({
              role: 'user',
              content: `You have ${incompleteTodos.length} incomplete todos. Please proceed immediately to create the core application files (such as index.html and src/App.jsx) with all requested features. Call create_file now.`,
            });
          } else if (incompleteTodos.length > 0) {
            // Mark remaining todos as completed if core files were generated
            runner.plan = runner.plan.map((s) => ({ ...s, status: 'done' as const }));
            runner.onPlanUpdate?.(runner.plan);
            missionFinished = true;
            finalSummary = choiceMessage.content || 'Application implementation complete.';
          } else if (runner.filesChanged.size > 0 && !missionFinished) {
            missionFinished = true;
            finalSummary = choiceMessage.content || 'Application built successfully.';
          } else {
            missionFinished = true;
            finalSummary = choiceMessage.content || 'Task completed.';
          }
        }
      }

      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      onEvent({
        type: 'thinking_end',
        durationSeconds: durationSec,
        thoughtSummary: `Completed autonomous mission in ${turnCount} turns across ${runner.filesChanged.size} files.`,
      });

      const filesChangedList = Array.from(runner.filesChanged.values());
      if (!finalSummary) {
        finalSummary = `### Mission Accomplished\n\nSuccessfully completed application development for:\n> *"${prompt}"*\n\n**Generated Deliverables:**\n- **${filesChangedList.length}** project files in workspace.\n- Total code generated: **+${filesChangedList.reduce((acc, f) => acc + f.addedLines, 0)}** lines.\n\nClick the **Preview** tab in the Workspace Panel to interact with your live application!`;
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
