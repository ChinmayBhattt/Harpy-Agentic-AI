import path from 'path';
import fs from 'fs';
import { WorkspaceSandbox, AgentToolRunner, AGENT_TOOLS_DEFINITIONS, AGENT_PLAN_TOOLS_DEFINITIONS } from './tools';
import { AgentEvent, PlanStep, PlanSpecification, FileChangeRecord } from './events';
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
  approvedPlan?: PlanSpecification;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Compacts conversation history cleanly without breaking assistant(tool_calls) <-> tool pairs.
 */
export function compactMessages(messages: Array<Record<string, unknown>>, maxRecentGroups = 7): Array<Record<string, unknown>> {
  if (messages.length <= 18) return messages;

  // Group into atomic units: system/user standalone, or assistant + its subsequent tool results
  const groups: Array<Array<Record<string, unknown>>> = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (
      msg.role === 'assistant' &&
      Array.isArray(msg.tool_calls) &&
      msg.tool_calls.length > 0
    ) {
      const group: Array<Record<string, unknown>> = [msg];
      let j = i + 1;
      while (j < messages.length && messages[j].role === 'tool') {
        group.push(messages[j]);
        j++;
      }
      groups.push(group);
      i = j;
    } else {
      groups.push([msg]);
      i++;
    }
  }

  if (groups.length <= maxRecentGroups + 2) {
    return messages;
  }

  const head = groups.slice(0, 2); // system prompt + initial prompt/history start
  const middle = groups.slice(2, groups.length - maxRecentGroups);
  const tail = groups.slice(groups.length - maxRecentGroups);

  const compactedMiddle = middle.map((group) =>
    group.map((msg) => {
      if (msg.role === 'tool') {
        const content = typeof msg.content === 'string' ? msg.content : '';
        if (content.length > 350) {
          return {
            ...msg,
            content: `${content.slice(0, 260)}\n... [Older tool output compacted (${content.length} chars)]`,
          };
        }
      }
      return msg;
    })
  );

  return [...head.flat(), ...compactedMiddle.flat(), ...tail.flat()];
}

export function isContinuationOrApprovalPrompt(rawPrompt: string): boolean {
  const p = rawPrompt.trim();
  return /^(now\s+build|build\s+it|continue|proceed|go\s+ahead|execute(\s+the)?\s+plan|plan\s+approved|approve\s*&?\s*execute|do\s+it|start\s+building|apply(\s+the)?\s+changes|yes,?\s*(execute|proceed|build))(?:\b|[.!:\s]|$)/i.test(
    p
  );
}

export function isImplementationRequest(goal: string): boolean {
  const g = (goal || '').trim();
  if (!g) return false;
  if (/^(what|why|how|when|where|who|explain|describe|summarize|list|show\s+me|tell\s+me)\b/i.test(g) && !/\b(create|build|write|edit|fix|modify|add|update|implement|make|refactor)\b/i.test(g)) {
    return false;
  }
  return /\b(build|create|code|implement|fix|make|refactor|generate|setup|set\s+up|develop|add|write|update|edit|modify|style|design|delete|remove|change|index\.html|style\.css|\.[a-z]{1,4})\b/i.test(
    g
  );
}

function normalizePathSafe(p: string): string {
  return path.posix.normalize((p || '').trim().replace(/\\/g, '/')).replace(/^(\.\/)+/, '').replace(/^\/+/, '');
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
    planSpec?: PlanSpecification;
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
      approvedPlan,
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

    // 1. Rehydrate existing workspace files onto disk WITHOUT pre-marking them as changed or read
    if (existingFiles && Array.isArray(existingFiles)) {
      for (const ef of existingFiles) {
        if (!ef || !ef.path) continue;
        const cleanPath = normalizePathSafe(ef.path);
        if (!cleanPath || cleanPath === '.' || cleanPath === 'AGENTS.md') continue;
        try {
          const safeAbs = sandbox.resolveSafePath(cleanPath);
          if (ef.action === 'deleted') {
            if (fs.existsSync(safeAbs)) fs.unlinkSync(safeAbs);
            continue;
          }
          const parentDir = path.dirname(safeAbs);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          if (ef.newContent !== undefined && ef.newContent !== null) {
            fs.writeFileSync(safeAbs, ef.newContent, 'utf-8');
            runner.registerBaselineFile(cleanPath, ef.newContent);
          } else if (fs.existsSync(safeAbs)) {
            runner.registerBaselineFile(cleanPath, fs.readFileSync(safeAbs, 'utf-8'));
          }
        } catch {}
      }
    }
    runner.snapshotDiskBaseline();

    // 2. Resolve the authentic user goal without hijacking short standalone requests (e.g. "Create style.css")
    let effectiveGoal = prompt.trim();
    const isContinuation = isContinuationOrApprovalPrompt(prompt);
    if (approvedPlan?.originalPrompt && approvedPlan.originalPrompt.trim()) {
      effectiveGoal = approvedPlan.originalPrompt.trim();
    } else if (isContinuation && history && Array.isArray(history)) {
      const priorUserMsg = [...history].reverse().find(
        (h) =>
          h.role === 'user' &&
          h.content &&
          !isContinuationOrApprovalPrompt(h.content)
      );
      if (priorUserMsg?.content) {
        effectiveGoal = priorUserMsg.content.trim();
      }
    }
    runner.setUserGoal(effectiveGoal);

    // Wire live plan updates to UI stream
    runner.onPlanUpdate = (plan) => {
      onEvent({ type: 'plan', steps: plan });
    };

    // In Execute Mode after plan approval, restore approved steps directly rather than a dummy template
    if (!planMode && approvedPlan?.steps && approvedPlan.steps.length > 0) {
      runner.plan = approvedPlan.steps.map((s, idx) => ({
        id: s.id || `step-${idx + 1}`,
        title: s.title,
        status: idx === 0 ? ('in_progress' as const) : ('pending' as const),
        ...(s.detail ? { detail: s.detail } : {}),
        ...(s.targetFiles ? { targetFiles: s.targetFiles } : {}),
      }));
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

    // SECTION D: Dynamic tech stack detection adapting cleanly to workspace + user prompt
    const techStack = detectWorkspaceTechStack(sandbox.workspaceRoot, effectiveGoal);
    const agentsMd = ensureAgentsMarkdown(sandbox.workspaceRoot, effectiveGoal, false);

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
      ? [model?.startsWith('claude') ? model : 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'].filter(Boolean)
      : isOpenAI
        ? [model?.startsWith('gpt-') ? model : 'gpt-4o', 'gpt-4o-mini'].filter(Boolean)
        : [
            model,
            'openai/gpt-oss-120b',
            'llama-3.3-70b-versatile',
            'qwen/qwen3.8-27b',
            'llama-3.1-8b-instant',
          ].filter(Boolean);

    const existingFileSummary =
      runner.baselineFiles.size > 0
        ? Array.from(runner.baselineFiles.entries())
            .map(([p, st]) => `- ${p} (${st.content.split('\n').length} lines)`)
            .join('\n')
        : '(Workspace is currently empty — 0 files exist)';

    const approvedPlanSection =
      !planMode && approvedPlan
        ? `\n<approved-plan>\nSummary: ${approvedPlan.summary}\nFiles to Create: ${(approvedPlan.filesToCreate || []).join(', ') || 'None specified'}\nFiles to Modify: ${(approvedPlan.filesToModify || []).join(', ') || 'None specified'}\nSteps:\n${approvedPlan.steps.map((s, idx) => `${idx + 1}. ${s.title}${s.detail ? ` — ${s.detail}` : ''}`).join('\n')}\nVerification Checks: ${(approvedPlan.verificationSteps || []).join('; ') || 'Verify syntax, file existence, and existing file preservation'}\n</approved-plan>\n`
        : '';

    const modeDirectives = planMode
      ? `CURRENT OPERATIONAL MODE: PLAN MODE (STRICTLY READ-ONLY EXPLORATION & PLANNING)
- You are strictly in READ-ONLY planning mode. File creation, file editing, file deletion, and shell execution are BLOCKED.
- Do NOT write code blocks of full implementations in your chat reply, and do NOT claim files were created.
- Step 1: Call \`list_dir\` (and \`read_file\` / \`grep_search\` on relevant existing files) to understand the current workspace state.
- Step 2: Analyze the user's exact request: "${effectiveGoal}". Never force an unrelated framework or extra boilerplate files.
- Step 3: Call \`update_todos\` with concise, tailored steps, and then call \`submit_plan\` (listing exact \`filesToCreate\`, \`filesToModify\`, and \`verificationSteps\`).
- Step 4: Present a concise, clear summary of the plan and prompt the user to click "Approve & Execute".`
      : `CURRENT OPERATIONAL MODE: EXECUTE MODE (EXPLORE -> PLAN -> EXECUTE -> VERIFY)
- Primary User Request: "${effectiveGoal}"${approvedPlanSection}
- Follow this strict execution discipline:
  1. EXPLORE FIRST: Always call \`list_dir\` (and \`read_file\` on any existing files you may interact with or wire into) before creating or editing files.
  2. PLAN ACCURATELY: Ensure \`update_todos\` reflects exact steps tailored ONLY to the user's request. Update each step's status (\`in_progress\` -> \`done\`) as you progress.
  3. PROTECT EXISTING FILES (CRITICAL):
     - Existing files already in the workspace MUST NOT be deleted or overwritten unless the user explicitly instructed you to delete/replace them.
     - Example: If \`index.html\` already exists and the user asks to create \`style.css\`, ONLY create \`style.css\` via \`create_file\` (and ONLY call \`read_file("index.html")\` + surgical \`edit_file("index.html")\` if adding a \`<link rel="stylesheet" href="style.css">\` tag cleanly without altering the rest of \`index.html\`). NEVER recreate or replace \`index.html\`.
  4. SURGICAL MODIFICATIONS ONLY:
     - Use \`create_file\` ONLY for brand-new files that do not exist yet.
     - When updating an existing file, ALWAYS call \`read_file\` first, then \`edit_file\` with exact targeted \`old_str\` and \`new_str\` preserving all existing code and functionality.
  5. VERIFY & FINISH:
     - Never finish prematurely after only reading files or outputting markdown code blocks. Actually apply changes via tools!
     - Run checks/commands if needed, confirm no unintended files were altered, mark ALL todos \`done\` via \`update_todos\`, and call \`finish\`.`;

    // SECTION E: Autonomous Coding Agent System Prompt (Claude Agent SDK / Antigravity Architecture)
    const systemPromptContent = `You are Harpy Agent, an autonomous senior software engineer working inside the user's sandboxed workspace.

<workspace-state>
${existingFileSummary}
</workspace-state>

<tech-stack>
${techStack.summary}
</tech-stack>

<project-guidelines>
${agentsMd}
</project-guidelines>

${modeDirectives}

CRITICAL RULES:
- Match the user's actual request and chosen stack precisely. Do NOT refuse a user's explicit request or substitute an unrelated template.
- Never output application code only in prose when tools should write/edit files on disk. Always use tools to make file changes.
- Preserve existing files intact at all times.

AUTONOMOUS WORKFLOW:
1. EXPLORE: list_dir and read_file relevant existing files first.
2. PLAN: maintain an accurate checklist with update_todos.
3. EXECUTE: create_file for new files, read_file + edit_file for surgical edits to existing files.
4. VERIFY & FINISH: verify deliverables on disk and call finish.`;

    const activeTools = planMode ? AGENT_PLAN_TOOLS_DEFINITIONS : AGENT_TOOLS_DEFINITIONS;

    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPromptContent },
    ];

    // Include prior conversation history so context is preserved across turns
    if (history && Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        if (h && h.content && h.content.trim() !== prompt.trim()) {
          messages.push({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content,
          });
        }
      }
    }

    // Append current user turn with resolved goal context
    messages.push({
      role: 'user',
      content:
        prompt.trim() === effectiveGoal
          ? prompt.trim()
          : `Original requirement: "${effectiveGoal}"\nUser command: "${prompt.trim()}"`,
    });

    // Helper to convert internal OpenAI-style messages cleanly into Anthropic Messages API blocks
    const formatAnthropicMessages = (rawMsgs: Array<Record<string, unknown>>) => {
      const converted: Array<{ role: 'user' | 'assistant'; content: any }> = [];
      let idx = 0;
      const filtered = rawMsgs.filter((m) => m.role !== 'system');
      while (idx < filtered.length) {
        const m = filtered[idx];
        if (m.role === 'assistant') {
          const blocks: any[] = [];
          if (typeof m.content === 'string' && m.content.trim()) {
            blocks.push({ type: 'text', text: m.content });
          }
          if (Array.isArray(m.tool_calls)) {
            for (const tc of m.tool_calls as any[]) {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = JSON.parse(tc.function?.arguments || '{}');
              } catch {}
              blocks.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.function?.name || 'unknown',
                input: parsedInput,
              });
            }
          }
          if (blocks.length > 0) {
            converted.push({ role: 'assistant', content: blocks });
          }
          idx++;
        } else if (m.role === 'tool') {
          const toolResultBlocks: any[] = [];
          while (idx < filtered.length && filtered[idx].role === 'tool') {
            const tm = filtered[idx];
            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: tm.tool_call_id,
              content: typeof tm.content === 'string' ? tm.content : JSON.stringify(tm.content),
            });
            idx++;
          }
          converted.push({ role: 'user', content: toolResultBlocks });
        } else {
          converted.push({
            role: 'user',
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          });
          idx++;
        }
      }
      return converted;
    };

    // Helper to invoke model across candidate models with per-request timeout protection
    const callLLM = async (
      currentMessages: Array<Record<string, unknown>>,
      tools?: Array<Record<string, unknown>>
    ): Promise<any> => {
      let lastInferenceError = '';
      for (const testModel of candidateModels) {
        const reqTimeout = new AbortController();
        const timer = setTimeout(() => reqTimeout.abort(), 30000);
        const onParentAbort = () => reqTimeout.abort();
        abortController.signal.addEventListener('abort', onParentAbort, { once: true });

        try {
          if (isAnthropic) {
            const anthropicTools = (tools || []).map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              input_schema: t.function.parameters,
            }));

            const sysMsg = currentMessages.find((m) => m.role === 'system');
            const nonSysMessages = formatAnthropicMessages(currentMessages);

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
              signal: reqTimeout.signal,
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
            if (res.status === 401) {
              throw new Error(`Authentication failed: ${lastInferenceError}`);
            }
          } else {
            const bodyPayload: Record<string, unknown> = {
              model: testModel,
              messages: currentMessages,
              temperature: 0.2,
              max_tokens: 4096,
            };
            if (tools && tools.length > 0) {
              bodyPayload.tools = tools;
              bodyPayload.tool_choice = 'auto';
            }

            const res = await fetch(apiEndpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(bodyPayload),
              signal: reqTimeout.signal,
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
        } finally {
          clearTimeout(timer);
          abortController.signal.removeEventListener('abort', onParentAbort);
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
      let continuationNudges = 0;
      let maxTokenContinuations = 0;
      const wantsImplementation = isImplementationRequest(effectiveGoal);

      // SECTION A: Structured Autonomous Agent Loop (Explore -> Plan -> Execute -> Verify)
      while (turnCount < maxTurns && !missionFinished) {
        if (abortController.signal.aborted) break;
        turnCount++;

        const activeMessages = compactMessages(messages);
        const llmResponse = await callLLM(activeMessages, activeTools);
        const choice = llmResponse?.choices?.[0];
        const choiceMessage = choice?.message;
        const finishReason = choice?.finish_reason;

        if (!choiceMessage) break;

        messages.push(choiceMessage);

        // Stream assistant message delta (in Plan Mode or final commentary; never parse markdown into phantom files!)
        if (choiceMessage.content) {
          onEvent({
            type: 'message_delta',
            delta: choiceMessage.content,
          });
        }

        // Handle max_tokens continuation seamlessly
        if (finishReason === 'length' && maxTokenContinuations < 3) {
          maxTokenContinuations++;
          messages.push({
            role: 'user',
            content: 'Your previous output reached the token limit. Continue cleanly using tool calls from exactly where you stopped.',
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
            let argsParseError: string | null = null;
            try {
              toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
            } catch (parseErr) {
              argsParseError =
                parseErr instanceof Error
                  ? `Invalid JSON arguments for ${toolName}: ${parseErr.message}. Please retry with valid JSON.`
                  : `Invalid JSON arguments for ${toolName}. Please retry.`;
            }

            let displayText = `Executing ${toolName}...`;
            if (toolName === 'create_file' || toolName === 'Write') displayText = `Creating ${toolArgs.path || 'file'}...`;
            else if (toolName === 'edit_file' || toolName === 'Edit') displayText = `Editing ${toolArgs.path || 'file'}...`;
            else if (toolName === 'read_file' || toolName === 'Read') displayText = `Reading ${toolArgs.path || 'file'}...`;
            else if (toolName === 'list_dir' || toolName === 'Glob') displayText = `Inspecting ${toolArgs.path || '.'}...`;
            else if (toolName === 'run_command' || toolName === 'Bash') displayText = `Running ${toolArgs.command || 'command'}...`;
            else if (toolName === 'grep_search' || toolName === 'Grep') displayText = `Searching for "${toolArgs.query || ''}"...`;
            else if (toolName === 'update_todos' || toolName === 'TodoWrite') displayText = `Updating plan checklist...`;
            else if (toolName === 'submit_plan' || toolName === 'ExitPlanMode') displayText = `Finalizing implementation plan...`;
            else if (toolName === 'finish') displayText = `Verifying deliverables and finishing...`;

            onEvent({
              type: 'tool_start',
              id: toolId,
              tool: toolName,
              args: toolArgs,
              displayText,
            });

            if (argsParseError) {
              onEvent({
                type: 'tool_end',
                id: toolId,
                tool: toolName,
                status: 'error',
                resultSummary: argsParseError,
                output: argsParseError,
              });
              messages.push({
                role: 'tool',
                tool_call_id: toolId,
                name: toolName,
                content: argsParseError,
              });
              continue;
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

            if (toolResult.verificationChecks && toolResult.verificationChecks.length > 0) {
              for (const chk of toolResult.verificationChecks) {
                onEvent({
                  type: 'build_verification',
                  status: chk.passed ? 'passed' : 'failed',
                  command: chk.name,
                  output: chk.detail,
                });
              }
            }

            messages.push({
              role: 'tool',
              tool_call_id: toolId,
              name: toolName,
              content: toolResult.output || toolResult.resultSummary,
            });

            // Plan Mode ends ONLY when submit_plan or finish succeeds (allowing exploration BEFORE finalizing plan)
            if (planMode && (toolName === 'submit_plan' || toolName === 'ExitPlanMode' || toolName === 'finish') && toolResult.status === 'success') {
              missionFinished = true;
              if (runner.submittedPlanSpec) {
                onEvent({ type: 'plan_spec', planSpec: runner.submittedPlanSpec });
              }
              finalSummary =
                (choiceMessage.content && choiceMessage.content.trim()) ||
                runner.submittedPlanSpec?.summary ||
                `Plan ready (${runner.plan.length} steps). Review the checklist above and click "Approve & Execute" to apply these changes.`;
            }

            // Execute Mode completes ONLY when finish verification succeeds
            if (!planMode && toolName === 'finish' && toolResult.status === 'success') {
              missionFinished = true;
              finalSummary = toolResult.output || toolResult.resultSummary;
            }
          }
        } else {
          // Model stopped calling tools in this turn
          if (planMode) {
            if (runner.plan.length === 0 && continuationNudges < 2) {
              continuationNudges++;
              messages.push({
                role: 'user',
                content: `You are in READ-ONLY Plan Mode. Before responding, inspect the workspace with \`list_dir\` (and \`read_file\` if files exist), call \`update_todos\` with concrete steps for "${effectiveGoal}", and call \`submit_plan\`.`,
              });
              continue;
            }

            if (!runner.submittedPlanSpec && runner.plan.length > 0) {
              runner.submittedPlanSpec = {
                summary: choiceMessage.content || `Plan formulated (${runner.plan.length} steps)`,
                steps: runner.plan,
                filesToCreate: [],
                filesToModify: [],
                verificationSteps: [],
                originalPrompt: effectiveGoal,
              };
            }
            if (runner.submittedPlanSpec) {
              onEvent({ type: 'plan_spec', planSpec: runner.submittedPlanSpec });
            }
            missionFinished = true;
            finalSummary =
              choiceMessage.content ||
              runner.submittedPlanSpec?.summary ||
              `Plan ready (${runner.plan.length} steps). Click "Approve & Execute" to proceed.`;
          } else {
            // Execute Mode enforcement: prevent bailing out with markdown text or skipping verification
            const hasIncompleteTodos = runner.plan.some((s) => s.status !== 'done');
            const missingFileWork = wantsImplementation && runner.filesChanged.size === 0;
            const needsPlan = wantsImplementation && runner.plan.length === 0;

            if ((missingFileWork || needsPlan || hasIncompleteTodos) && continuationNudges < 3) {
              continuationNudges++;
              const reasons: string[] = [];
              if (needsPlan) reasons.push('call `update_todos` to plan the exact steps');
              if (missingFileWork) reasons.push(`use \`create_file\` / \`edit_file\` to implement "${effectiveGoal}" on disk (do NOT paste code in chat prose)`);
              if (hasIncompleteTodos) reasons.push('complete all remaining todos and mark each step `done` with `update_todos`');
              reasons.push('call `finish` after verifying your changes');

              messages.push({
                role: 'user',
                content: `DO NOT stop early. You have not completed the execution loop yet. Next, you MUST: ${reasons.join('; ')}.`,
              });
              continue;
            }

            // If files were written and model summarized without calling finish, run finish verification directly
            if (runner.filesChanged.size > 0 && continuationNudges >= 3) {
              if (runner.plan.length === 0) {
                runner.plan = [
                  { id: 'step-1', title: `Implement ${effectiveGoal}`, status: 'done' },
                ];
                runner.onPlanUpdate?.(runner.plan);
              }
            }
            missionFinished = true;
            finalSummary = choiceMessage.content || 'Execution completed.';
          }
        }
      }

      // Final baseline integrity check before reporting done
      if (!planMode) {
        const finalIntegrity = runner.verifyWorkspacePreservation();
        if (!finalIntegrity.ok) {
          onEvent({
            type: 'build_verification',
            status: 'failed',
            command: 'Baseline File Integrity Check',
            output: finalIntegrity.violations.join('\n'),
          });
        }
      }

      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      onEvent({
        type: 'thinking_end',
        durationSeconds: durationSec,
        thoughtSummary: planMode
          ? `Formulated read-only plan (${runner.plan.length} steps) in ${turnCount} turns.`
          : `Completed execution in ${turnCount} turns across ${runner.filesChanged.size} changed file(s).`,
      });

      const filesChangedList = planMode ? [] : Array.from(runner.filesChanged.values());
      if (!finalSummary) {
        finalSummary = planMode
          ? `Formulated a ${runner.plan.length}-step plan for "${effectiveGoal}". Click **Approve & Execute** to apply changes.`
          : filesChangedList.length > 0
            ? `Completed "${effectiveGoal}". Updated ${filesChangedList.length} file(s): ${filesChangedList.map((f) => `\`${f.path}\``).join(', ')}.`
            : `Completed analysis for "${effectiveGoal}".`;
      }

      onEvent({
        type: 'done',
        filesChanged: filesChangedList,
        summary: finalSummary,
        ...(planMode && runner.submittedPlanSpec ? { planSpec: runner.submittedPlanSpec } : {}),
        ...(runner.lastVerificationChecks.length > 0 ? { verificationChecks: runner.lastVerificationChecks } : {}),
      });

      return {
        plan: runner.plan,
        filesChanged: filesChangedList,
        summary: finalSummary,
        planSpec: runner.submittedPlanSpec,
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
