'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { ExecutionTrace } from './types';

interface ExecutionLogsModalProps {
  trace: ExecutionTrace | null;
  isOpen: boolean;
  onClose: () => void;
  onReRun?: () => void;
}

export default function ExecutionLogsModal({
  trace,
  isOpen,
  onClose,
  onReRun,
}: ExecutionLogsModalProps) {
  if (!isOpen || !trace) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#09090F] border border-[#C6A46A]/40 rounded-2xl shadow-[0_0_50px_rgba(198,164,106,0.2)] overflow-hidden text-[#E8DDC7] flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 bg-[#0E0E18] border-b border-[#1A1A28] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    trace.status === 'running'
                      ? 'bg-amber-400'
                      : trace.status === 'success'
                      ? 'bg-emerald-400'
                      : 'bg-rose-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    trace.status === 'running'
                      ? 'bg-amber-500'
                      : trace.status === 'success'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />
              </span>
              <div>
                <h3 className="font-cinzel text-sm font-semibold text-[#E8DDC7] flex items-center gap-2">
                  Workflow Execution Trace
                  <span
                    className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                      trace.status === 'success'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                        : trace.status === 'running'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    {trace.status}
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-[#8C7A6B]">
                  {trace.workflowName} · Total: {trace.durationMs}ms
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#E8DDC7] hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps Timeline Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 [scrollbar-width:thin]">
            {trace.steps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className={`p-3.5 rounded-xl border transition-all ${
                  step.status === 'running'
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                    : step.status === 'success'
                    ? 'bg-[#0E0E16] border-[#1E1E2C] hover:border-[#C6A46A]/30'
                    : 'bg-rose-950/20 border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {step.status === 'running' ? (
                      <Activity className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : step.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-mono font-semibold text-xs text-[#E8DDC7]">
                      Step {idx + 1}: {step.nodeTitle}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[#8C7A6B] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {step.durationMs}ms
                  </span>
                </div>

                <p className="text-xs text-[#E8DDC7]/80 font-mono leading-relaxed pl-6">
                  {step.message}
                </p>

                {step.outputPayload && (
                  <div className="mt-2.5 ml-6 p-2.5 rounded-lg bg-[#06060A] border border-[#161622] font-mono text-[11px] text-[#C6A46A] overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(step.outputPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#0E0E18] border-t border-[#1A1A28] flex items-center justify-between shrink-0">
            <span className="text-[11px] font-mono text-[#8C7A6B]">
              Autonomous routing verified via Harpy Core.
            </span>

            <div className="flex items-center gap-2">
              {onReRun && (
                <button
                  type="button"
                  onClick={onReRun}
                  className="px-3.5 py-1.5 rounded-xl bg-[#181824] border border-[#2B2B3C] text-xs font-mono text-[#E8DDC7] hover:bg-[#202030] transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-[#E8DDC7]" /> Re-run Test
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs font-semibold tracking-wider uppercase hover:bg-[#E2C99A] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
