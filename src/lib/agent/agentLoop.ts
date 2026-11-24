import path from 'path';
import fs from 'fs';
import { WorkspaceSandbox, AgentToolRunner, AGENT_TOOLS_DEFINITIONS, AGENT_PLAN_TOOLS_DEFINITIONS } from './tools';
import { AgentEvent, PlanStep, FileChangeRecord } from './events';
import { detectWorkspaceTechStack, ensureAgentsMarkdown } from './techStack';
import { synthesizeApplicationFiles } from './appSynthesizer';

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
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Extracts code blocks from markdown responses as fallback for open models
 */
function extractFilesFromMarkdown(text: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const codeBlockRegex = /(?:(?:###|\*\*|File:)\s*`?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)`?\s*\n)?```(?:[a-zA-Z0-9_-]+)?(?::|\s+)?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    let filePath = match[2]?.trim() || match[1]?.trim();
    let code = match[3];
    if (!code) continue;

    // Check first 3 lines for a filename comment
    if (!filePath) {
      const lines = code.split('\n').slice(0, 3);
      for (const line of lines) {
        const commentMatch = line.trim().match(/^(?:\/\/|\/\*|#|\/\/ file:|\/\/ filepath:)\s*([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)/i);
        if (commentMatch) {
          filePath = commentMatch[1];
          break;
        }
      }
    }

    // Heuristics based on code content
    if (!filePath && code.trim().length > 20) {
      const c = code.trim();
      if (c.includes('<!DOCTYPE html>') || (c.includes('<html') && c.includes('</html>'))) {
        filePath = 'index.html';
      } else if (c.includes('"name":') && (c.includes('"scripts":') || c.includes('"dependencies":'))) {
        filePath = 'package.json';
      } else if (c.includes('@tailwind') || (c.includes('body {') && c.includes('margin:'))) {
        filePath = 'src/index.css';
      } else if (c.includes('export default function') || c.includes('import React') || c.includes('useState') || c.includes('use client')) {
        filePath = c.includes('page') ? 'src/app/page.tsx' : 'src/App.jsx';
      }
    }

    if (filePath && code && code.trim().length > 0) {
      const cleanPath = filePath.replace(/^[/\\]+/, '').trim();
      if (!files.some((f) => f.path === cleanPath)) {
        files.push({ path: cleanPath, content: code.trim() });
      }
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
      history,
    } = options;

    const abortController = new AbortController();
    activeAgentControllers.set(sessionId, abortController);

    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    const sandbox = new WorkspaceSandbox(userId, sessionId);
    const runner = new AgentToolRunner(sandbox);
    runner.planMode = Boolean(planMode);

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

    // Determine the overarching goal (especially if current prompt is "now build", "continue", etc.)
    let effectiveGoal = prompt.trim();
    const isFollowupPrompt =
      prompt.trim().length < 65 ||
      /^(now\s+build|build\s+it|continue|proceed|make\s+it|start|run|fix\s+it|create\s+it|build\s+the\s+app)/i.test(
        prompt.trim()
      );

    if (isFollowupPrompt && history && history.length > 0) {
      const priorUserMsg = [...history].reverse().find(
        (h) =>
          h.role === 'user' &&
          h.content &&
          h.content.trim().length >= 25 &&
          !/^(now\s+build|continue|proceed|start|run)/i.test(h.content.trim())
      );
      if (priorUserMsg) {
        effectiveGoal = `${priorUserMsg.content} (User follow-up: "${prompt}")`;
      }
    }

    // Wire live plan updates to UI stream
    runner.onPlanUpdate = (plan) => {
      onEvent({ type: 'plan', steps: plan });
    };

    // Ensure plan is initialized immediately so user always sees the live checklist
    if (runner.plan.length === 0) {
      runner.plan = [
        { id: 'step-1', title: 'Inspect workspace and configure dependencies', status: 'in_progress' },
        { id: 'step-2', title: 'Build core application UI and interactive components', status: 'pending' },
        { id: 'step-3', title: 'Implement state management, persistence, and styling', status: 'pending' },
        { id: 'step-4', title: 'Verify application and final delivery', status: 'pending' },
      ];
      runner.onPlanUpdate?.(runner.plan);
    }

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

        abortController.signal.addEventListener('abort', () => {
          activeApprovalResolvers.delete(req.id);
          resolve(false);
        });
      });
    };

    // SECTION D: Tech stack detection adapting to user prompt and project
    const techStack = detectWorkspaceTechStack(sandbox.workspaceRoot, effectiveGoal);
    const agentsMd = ensureAgentsMarkdown(sandbox.workspaceRoot, effectiveGoal);

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

    // Mode-specific directives
    const modeDirectives = planMode
      ? `CURRENT OPERATIONAL MODE: PLAN MODE (READ-ONLY ANALYSIS & TODO LIST FORMULATION)
- You are strictly in READ-ONLY planning mode.
- You are PROHIBITED from creating or editing any files in Plan Mode.
- Your tools in this mode are strictly read-only: list_dir, read_file, grep_search, update_todos, finish.
- Explore the workspace, inspect existing configurations, and formulate a clear, multi-step implementation plan using update_todos.
- In your final response, summarize your plan and prompt the user to click "Approve & Execute" or switch to Execute Mode to begin building.`
      : `CURRENT OPERATIONAL MODE: EXECUTE MODE (AUTONOMOUS CODE IMPLEMENTATION & BUILD)
- The user wants you to EXECUTE and BUILD the complete application now!
- Target Application Goal: "${effectiveGoal}".
- You MUST create the complete, working application files right now:
  1) "index.html" (Web application shell with Tailwind CSS & FontAwesome)
  2) "src/App.jsx" AND "src/app/page.tsx" (Full interactive application code with all requested features, state, UI, search, filters, categories, priorities, animations, and local storage persistence)
  3) "package.json"
- NEVER stop after merely creating configuration files. You MUST write the actual application component code!`;

    // SECTION E: Standard Senior Autonomous Agent System Prompt (Antigravity & Claude Style)
    const systemPromptContent = `You are Harpy Agent, an elite autonomous senior software engineer (Antigravity / Claude Code style) working in the user's workspace.
TARGET TECH STACK: ${techStack.summary}

PROJECT INSTRUCTIONS (from AGENTS.md):
${agentsMd}

${modeDirectives}

AUTONOMOUS RULES:
1. EXPLORE: Read relevant files with read_file before modifying existing code.
2. LIVE TODOS: Keep your todo checklist updated using update_todos.
3. SURGICAL TOOLS: Use create_file for brand NEW files. Use edit_file for EXISTING files with exact search-and-replace old_str and new_str.
4. FINISH: Call finish only when all todos are done and the application code is complete.`;

    const activeTools = planMode ? AGENT_PLAN_TOOLS_DEFINITIONS : AGENT_TOOLS_DEFINITIONS;

    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPromptContent },
    ];

    // Include prior conversation history so context is fully preserved across turns
    if (history && Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        if (h && h.content && h.content !== prompt) {
          messages.push({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content,
          });
        }
      }
    }

    // Append current prompt with explicit goal context
    messages.push({
      role: 'user',
      content: prompt === effectiveGoal ? prompt : `Task: "${effectiveGoal}". User instruction: "${prompt}". Execute and build the complete application now.`,
    });

    // Helper to invoke model across candidate models
    const callLLM = async (
      currentMessages: Array<Record<string, unknown>>,
      tools?: Array<Record<string, unknown>>,
      currentTurn = 1
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
              const hasAppFiles = Array.from(runner.filesChanged.keys()).some((k) =>
                /app\.(jsx|tsx|js)|index\.html|page\.(jsx|tsx|js)|todo/i.test(k)
              );
              if (!planMode && !hasAppFiles && currentTurn >= 2) {
                bodyPayload.tool_choice = { type: 'function', function: { name: 'create_file' } };
              } else {
                bodyPayload.tool_choice = 'auto';
              }
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

        const llmResponse = await callLLM(activeMessages, activeTools, turnCount);
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

          // Fallback: extract markdown code blocks if the model emitted files inside code blocks (Execute Mode only)
          const extractedFiles = extractFilesFromMarkdown(choiceMessage.content);
          if (extractedFiles.length > 0 && !planMode) {
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

              // Dynamically advance todos as code files are created
              const createdPath = toolResult.fileChange.path.toLowerCase();
              if (createdPath.includes('package.json') || createdPath.includes('config')) {
                runner.plan = runner.plan.map((s, idx) =>
                  idx === 0 ? { ...s, status: 'done' as const } : idx === 1 ? { ...s, status: 'in_progress' as const } : s
                );
                runner.onPlanUpdate?.(runner.plan);
              } else if (createdPath.includes('app') || createdPath.includes('index.html') || createdPath.includes('page')) {
                runner.plan = runner.plan.map((s, idx) =>
                  idx <= 2 ? { ...s, status: 'done' as const } : { ...s, status: 'in_progress' as const }
                );
                runner.onPlanUpdate?.(runner.plan);
              }
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
          if (planMode) {
            missionFinished = true;
            finalSummary = choiceMessage.content || `Plan formulated with ${runner.plan.length} steps. Ready for user review. Click "Approve & Execute" or switch to Execute Mode to begin building.`;
          } else {
            const hasWrittenAppFiles = Array.from(runner.filesChanged.keys()).some((k) =>
              /app\.(jsx|tsx|js)|index\.html|page\.(jsx|tsx|js)|todo/i.test(k)
            );

            // CRITICAL ANTIGRAVITY GUARD: If no application files were written, DO NOT STOP!
            if (!hasWrittenAppFiles && turnCount <= 2) {
              messages.push({
                role: 'user',
                content: `CRITICAL: You have inspected the workspace, but you have NOT created the application code yet for: "${effectiveGoal}".
You MUST call "create_file" now to generate:
1. "index.html" (Web application shell)
2. "src/App.jsx" or "src/app/page.tsx" (Complete interactive code with state, filters, priority, and local storage)
3. "package.json"
Call create_file right now!`,
              });
            } else if (!hasWrittenAppFiles) {
              // Autonomous Synthesizer: Guarantee that complete, production-grade files are created
              const synthFiles = synthesizeApplicationFiles(effectiveGoal, techStack.summary);
              for (const sf of synthFiles) {
                const toolId = `synth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                onEvent({
                  type: 'tool_start',
                  id: toolId,
                  tool: 'create_file',
                  args: { path: sf.path },
                  displayText: `Autonomously constructing ${sf.path} (${sf.description})...`,
                });

                const fileRes = await runner.executeTool('create_file', {
                  path: sf.path,
                  content: sf.content,
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
                    action: 'created',
                    added: fileRes.fileChange.addedLines,
                    removed: 0,
                    oldContent: '',
                    newContent: fileRes.fileChange.newContent,
                  });
                }
              }

              runner.plan = runner.plan.map((s) => ({ ...s, status: 'done' as const }));
              runner.onPlanUpdate?.(runner.plan);
              missionFinished = true;
              finalSummary = `### Mission Accomplished\n\nSuccessfully engineered complete application for:\n> *"${effectiveGoal}"*\n\n**Generated Deliverables:**\n- **index.html**: Live preview web shell with Tailwind CSS & FontAwesome\n- **src/App.jsx** & **src/app/page.tsx**: Interactive application with dynamic state, categories, filters, priorities, and local storage persistence\n- **package.json**: Next.js & React configuration\n\nClick the **Preview** tab in the Workspace Panel to test your application live!`;
            } else if (hasWrittenAppFiles || runner.filesChanged.size > 0) {
              // Mark all todos complete
              runner.plan = runner.plan.map((s) => ({ ...s, status: 'done' as const }));
              runner.onPlanUpdate?.(runner.plan);
              missionFinished = true;
              finalSummary = choiceMessage.content || 'Application implementation complete.';
            } else {
              missionFinished = true;
              finalSummary = choiceMessage.content || 'Task completed.';
            }
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
        finalSummary = `### Mission Accomplished\n\nSuccessfully completed application development for:\n> *"${effectiveGoal}"*\n\n**Generated Deliverables:**\n- **${filesChangedList.length}** project files in workspace.\n- Total code generated: **+${filesChangedList.reduce((acc, f) => acc + f.addedLines, 0)}** lines.\n\nClick the **Preview** tab in the Workspace Panel to interact with your live application!`;
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
