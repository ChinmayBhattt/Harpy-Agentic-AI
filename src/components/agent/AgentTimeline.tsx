'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  FileCode,
  FileText,
  Terminal,
  Brain,
  AlertTriangle,
  FolderGit2,
  Eye,
  FilePlus,
  FileEdit,
  Sparkles,
  ShieldAlert,
  Check,
  X,
  Play,
} from 'lucide-react';
import { AgentRunData, FileChangeRecord } from '@/lib/agent/events';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface AgentTimelineProps {
  runData: AgentRunData;
  sessionId?: string;
  onSelectFile?: (filePath: string) => void;
  onReviewDiff?: (file: FileChangeRecord) => void;
  onApprovePlan?: () => void;
  onResolveApproval?: (id: string, approved: boolean) => void;
}

export default function AgentTimeline({
  runData,
  sessionId,
  onSelectFile,
  onReviewDiff,
  onApprovePlan,
  onResolveApproval,
}: AgentTimelineProps) {
  const [expandedCommandIds, setExpandedCommandIds] = useState<Set<string>>(new Set());
  const [expandedThinkingIndices, setExpandedThinkingIndices] = useState<Set<number>>(new Set());
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, boolean>>({});

  const toggleCommand = (id: string) => {
    setExpandedCommandIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleThinking = (idx: number) => {
    setExpandedThinkingIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleApprovalAction = async (id: string, approved: boolean) => {
    setPendingApprovals((prev) => ({ ...prev, [id]: true }));
    if (onResolveApproval) {
      onResolveApproval(id, approved);
    } else {
      try {
        await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approval',
            approvalId: id,
            approved,
            sessionId,
          }),
        });
      } catch (e) {
        console.error('Approval resolution error:', e);
      }
    }
  };

  const plan = runData.plan || [];
  const filesChanged = runData.filesChanged || [];
  const totalAdded = filesChanged.reduce((acc, f) => acc + (f.addedLines || 0), 0);
  const totalRemoved = filesChanged.reduce((acc, f) => acc + (f.removedLines || 0), 0);
  const events = runData.events || [];

  return (
    <div className="space-y-3 font-sans text-xs text-[#E8DDC7]">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. PLAN / TASK CHECKLIST CARD */}
      {/* ────────────────────────────────────────────────────────── */}
      {plan.length > 0 && (
        <div className="rounded-xl border border-[#C6A46A]/20 bg-[#0A0A0F] overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setIsPlanExpanded(!isPlanExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#0E0E16] hover:bg-[#12121C] transition-colors border-b border-[#1C1C26] text-left"
          >
            <div className="flex items-center gap-2">
              <span className="font-cinzel text-xs font-semibold text-[#C6A46A] tracking-wider uppercase">
                Plan &amp; Execution Checklist
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#C6A46A]/10 text-[#C6A46A] border border-[#C6A46A]/25">
                {plan.filter((s) => s.status === 'done').length}/{plan.length} Done
              </span>
            </div>
            {isPlanExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#C6A46A]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#C6A46A]" />
            )}
          </button>

          {isPlanExpanded && (
            <div className="p-2.5 space-y-1.5">
              {plan.map((step) => (
                <div key={step.id} className="flex items-start gap-2 py-0.5">
                  {step.status === 'done' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : step.status === 'in_progress' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#C6A46A] animate-spin mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[#E8DDC7]/30 mt-0.5 shrink-0" />
                  )}
                  <span
                    className={`leading-relaxed ${
                      step.status === 'done'
                        ? 'text-[#E8DDC7]/50 line-through'
                        : step.status === 'in_progress'
                        ? 'text-[#C6A46A] font-medium'
                        : 'text-[#E8DDC7]/80'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              ))}

              {/* Plan Mode Approval Banner */}
              {runData.status === 'plan_ready' && onApprovePlan && (
                <div className="mt-2.5 pt-2.5 border-t border-[#1C1C26] space-y-2">
                  {runData.planSpec && (
                    <div className="text-[11px] font-mono space-y-1 text-[#A09885]">
                      {runData.planSpec.filesToCreate?.length > 0 && (
                        <div>
                          <span className="text-emerald-400">Create:</span>{' '}
                          {runData.planSpec.filesToCreate.join(', ')}
                        </div>
                      )}
                      {runData.planSpec.filesToModify?.length > 0 && (
                        <div>
                          <span className="text-[#C6A46A]">Edit:</span>{' '}
                          {runData.planSpec.filesToModify.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#A09885]">Read-only plan formulated. No files were modified yet.</span>
                    <button
                      type="button"
                      onClick={onApprovePlan}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C6A46A] hover:bg-[#D4B37F] text-black font-semibold text-xs transition-colors shadow-sm shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Approve &amp; Execute</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. ACTIVITY TIMELINE ROWS */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="space-y-1 py-1">
        {events.map((ev, idx) => {
          // Thinking Duration Row
          if (ev.type === 'thinking_end') {
            const isExpanded = expandedThinkingIndices.has(idx);
            return (
              <div key={`think-${idx}`} className="py-0.5">
                <button
                  type="button"
                  onClick={() => toggleThinking(idx)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#A09885] hover:text-[#C6A46A] font-mono transition-colors group cursor-pointer"
                >
                  <Brain className="w-3 h-3 text-[#C6A46A]" />
                  <span>Thinking for {ev.durationSeconds || 1}s</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-[#C6A46A]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[#C6A46A]" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-1 p-2.5 rounded-xl bg-[#08080E] border border-[#1E1E2C] text-[11px] font-mono text-[#D5C2A5]/90 whitespace-pre-wrap leading-relaxed shadow-lg">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#C6A46A] uppercase font-cinzel font-semibold mb-1">
                      <Sparkles className="w-3 h-3 text-[#C6A46A]" />
                      <span>Reasoning Process &amp; Architecture</span>
                    </div>
                    {ev.thoughtSummary || "Synthesizing architectural specifications and reviewing file dependencies."}
                  </div>
                )}
              </div>
            );
          }

          // Tool Start (Running Spinner)
          if (ev.type === 'tool_start') {
            const hasEnd = events.slice(idx + 1).some((next) => next.type === 'tool_end' && next.id === ev.id);
            if (hasEnd) return null;

            return (
              <div key={`tool-start-${ev.id}`} className="flex items-center gap-2 py-1 text-[11px] text-[#C6A46A] font-mono">
                <Loader2 className="w-3 h-3 animate-spin shrink-0 text-[#C6A46A]" />
                <span className="truncate">{ev.displayText}</span>
              </div>
            );
          }

          // Tool End (Completed or Errored Row)
          if (ev.type === 'tool_end') {
            const isCmd = ev.tool === 'run_command';
            const isFileRead = ev.tool === 'read_file';
            const isExpanded = expandedCommandIds.has(ev.id);

            return (
              <div key={`tool-end-${ev.id}`} className="py-0.5 font-mono text-[11px]">
                <div
                  className={`flex items-center justify-between py-1 px-2 rounded-lg border transition-all ${
                    ev.status === 'error'
                      ? 'border-rose-900/40 bg-rose-950/20 text-rose-300'
                      : 'border-[#1C1C26] bg-[#0A0A0E] text-[#D5C2A5]/90 hover:border-[#C6A46A]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                    {isCmd ? (
                      <Terminal className="w-3 h-3 text-[#C6A46A] shrink-0" />
                    ) : isFileRead ? (
                      <FileCode className="w-3 h-3 text-cyan-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}

                    <span className="truncate">{ev.resultSummary}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {ev.filePath && onSelectFile && (
                      <button
                        type="button"
                        onClick={() => onSelectFile(ev.filePath!)}
                        className="p-1 rounded text-[#C6A46A]/80 hover:text-[#C6A46A] hover:bg-[#181822] transition-colors"
                        title={`Inspect ${ev.filePath} in code viewer`}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}

                    {isCmd && ev.output && (
                      <button
                        type="button"
                        onClick={() => toggleCommand(ev.id)}
                        className="p-1 rounded text-[#C6A46A] hover:bg-white/5 transition-colors"
                        title={isExpanded ? 'Collapse output' : 'Expand terminal output'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isCmd && isExpanded && ev.output && (
                  <div className="mt-1 p-2.5 rounded-lg bg-black border border-[#22222E] text-[10px] font-mono text-emerald-300/90 whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-emerald-800">
                    {ev.output}
                  </div>
                )}
              </div>
            );
          }

          // Risky Command Approval Required Banner
          if (ev.type === 'approval_required') {
            const hasResolved = events.slice(idx + 1).some((next) => next.type === 'approval_resolved' && next.id === ev.id) || pendingApprovals[ev.id];

            return (
              <div
                key={`approval-${ev.id}`}
                className="p-3 my-2 rounded-xl border border-amber-500/40 bg-amber-950/20 text-[#E8DDC7] space-y-2"
              >
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Security Approval Required</span>
                </div>
                <p className="text-xs text-[#E8DDC7]/80">
                  Agent requested to execute a potentially risky command:
                </p>
                <div className="p-2 rounded bg-black/60 font-mono text-xs text-amber-300 border border-amber-900/30">
                  {ev.command}
                </div>
                <div className="text-[11px] text-[#A09885]">Reason: {ev.reason}</div>

                {!hasResolved ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(ev.id, true)}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovalAction(ev.id, false)}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Deny</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#A09885] italic">Decision submitted.</div>
                )}
              </div>
            );
          }

          // File Changed (+N -N) Row
          if (ev.type === 'file_changed') {
            const isCreated = ev.action === 'created';
            return (
              <div
                key={`file-${ev.path}-${idx}`}
                className="flex items-center justify-between py-1 px-2 rounded-lg border border-[#1A1A24] bg-[#07070B] font-mono text-[11px] hover:border-[#C6A46A]/40 transition-colors"
              >
                <div
                  onClick={() => onSelectFile && onSelectFile(ev.path)}
                  className="flex items-center gap-2 truncate min-w-0 pr-2 cursor-pointer group"
                  title="Click to view file in Workspace IDE"
                >
                  {isCreated ? (
                    <FilePlus className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <FileEdit className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  <span className="text-[#E8DDC7] group-hover:text-[#C6A46A] font-medium truncate">{ev.path}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className="text-emerald-400 font-bold">+{ev.added}</span>
                    <span className="text-rose-400 font-bold">-{ev.removed}</span>
                  </div>

                  {onSelectFile && (
                    <button
                      type="button"
                      onClick={() => onSelectFile(ev.path)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-[#E8DDC7]/80 hover:bg-white/10 hover:text-white transition-colors"
                      title="Inspect code in Workspace"
                    >
                      View
                    </button>
                  )}

                  {onReviewDiff && (
                    <button
                      type="button"
                      onClick={() =>
                        onReviewDiff({
                          path: ev.path,
                          action: ev.action,
                          addedLines: ev.added,
                          removedLines: ev.removed,
                          oldContent: ev.oldContent,
                          newContent: ev.newContent,
                          timestamp: '',
                        })
                      }
                      className="px-1.5 py-0.5 rounded text-[10px] bg-[#C6A46A]/10 text-[#C6A46A] hover:bg-[#C6A46A]/20 border border-[#C6A46A]/30 transition-colors"
                      title="Review file changes diff"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Build & Verification Row
          if (ev.type === 'build_verification') {
            const passed = ev.status === 'passed';
            return (
              <div
                key={`verify-${idx}`}
                className={`flex items-start gap-2 p-2 rounded-lg font-mono text-[11px] border ${
                  passed
                    ? 'bg-emerald-950/20 border-emerald-800/35 text-emerald-300'
                    : 'bg-rose-950/25 border-rose-800/40 text-rose-300'
                }`}
              >
                {passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold">{ev.command}</div>
                  {ev.output && <div className="opacity-80 truncate">{ev.output}</div>}
                </div>
              </div>
            );
          }

          // Error Notification Row
          if (ev.type === 'error') {
            return (
              <div
                key={`err-${idx}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-rose-950/25 border border-rose-800/40 text-rose-300 font-mono text-[11px]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{ev.message}</span>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. FINAL SUMMARY CARD & CHANGED FILES SUMMARY */}
      {/* ────────────────────────────────────────────────────────── */}
      {filesChanged.length > 0 && (
        <div className="rounded-xl border border-[#C6A46A]/30 bg-[#08080D] overflow-hidden shadow-md mt-2">
          <div className="flex items-center justify-between px-3 py-2 bg-[#0D0D14] border-b border-[#1A1A24]">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-[#C6A46A]" />
              <span className="font-cinzel text-xs font-semibold text-[#E8DDC7]">
                {filesChanged.length} {filesChanged.length === 1 ? 'file' : 'files'} changed
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">+{totalAdded}</span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">-{totalRemoved}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsFilesExpanded(!isFilesExpanded)}
              className="text-[#C6A46A] hover:text-white p-0.5"
            >
              {isFilesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {isFilesExpanded && (
            <div className="divide-y divide-[#14141C]">
              {filesChanged.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[#101018] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                    <FileText className="w-3 h-3 text-[#C6A46A]/70 shrink-0" />
                    <span className="font-mono text-xs text-[#E8DDC7]/90 truncate">{file.path}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span className="text-emerald-400">+{file.addedLines}</span>
                      <span className="text-rose-400">-{file.removedLines}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onSelectFile && (
                        <button
                          type="button"
                          onClick={() => onSelectFile(file.path)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-[#E8DDC7] transition-colors"
                          title="Open in Code Viewer"
                        >
                          View
                        </button>
                      )}

                      {onReviewDiff && (
                        <button
                          type="button"
                          onClick={() => onReviewDiff(file)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#C6A46A]/15 text-[#C6A46A] hover:bg-[#C6A46A]/25 border border-[#C6A46A]/30 transition-colors font-medium"
                        >
                          Review Diff
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. FINAL ASSISTANT SUMMARY MESSAGE */}
      {/* ────────────────────────────────────────────────────────── */}
      {runData.finalMessage && (
        <div className="pt-2 text-sm text-[#E8DDC7]/90 leading-relaxed font-light">
          <MarkdownRenderer content={runData.finalMessage} />
        </div>
      )}
    </div>
  );
}
