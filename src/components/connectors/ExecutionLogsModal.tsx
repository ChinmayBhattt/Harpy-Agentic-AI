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
  theme?: 'dark' | 'light';
}

export default function ExecutionLogsModal({
  trace,
  isOpen,
  onClose,
  onReRun,
  theme = 'dark',
}: ExecutionLogsModalProps) {
  if (!isOpen || !trace) return null;

  const isLight = theme === 'light';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors border ${
            isLight
              ? 'bg-white border-[#E2E4E9] text-[#0F172A] shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
              : 'bg-[#090910] border-[#1E1E2C] text-[#D8D4CF] shadow-[0_20px_60px_rgba(0,0,0,0.9)]'
          }`}
        >
          {/* Header */}
          <div
            className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-[#F8F9FA] border-[#E2E4E9]' : 'bg-[#0E0E18] border-[#1A1A28]'
            }`}
          >
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
                <h3
                  className={`font-cinzel text-sm font-semibold flex items-center gap-2 ${
                    isLight ? 'text-[#0F172A]' : 'text-[#E8DDC7]'
                  }`}
                >
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
                <p className={`text-[11px] font-mono ${isLight ? 'text-[#64748B]' : 'text-[#8C7A6B]'}`}>
                  {trace.workflowName} · Total: {trace.durationMs}ms
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5' : 'text-[#8C7A6B] hover:text-[#E8DDC7] hover:bg-white/5'
              }`}
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
                    ? isLight
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-sm'
                      : 'bg-amber-950/20 border-amber-500/50 shadow-md'
                    : step.status === 'success'
                    ? isLight
                      ? 'bg-[#F8F9FA] border-[#E2E4E9] text-[#0F172A]'
                      : 'bg-[#0E0E16] border-[#1E1E2C] hover:border-[#C6A46A]/30'
                    : isLight
                    ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                    : 'bg-rose-950/20 border-rose-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {step.status === 'running' ? (
                      <Activity className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : step.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span
                      className={`font-mono font-semibold text-xs ${
                        isLight ? 'text-[#0F172A]' : 'text-[#E8DDC7]'
                      }`}
                    >
                      Step {idx + 1}: {step.nodeTitle}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono flex items-center gap-1 ${
                      isLight ? 'text-[#64748B]' : 'text-[#8C7A6B]'
                    }`}
                  >
                    <Clock className="w-3 h-3" /> {step.durationMs}ms
                  </span>
                </div>

                <p
                  className={`text-xs font-mono leading-relaxed pl-6 ${
                    isLight ? 'text-[#334155]' : 'text-[#E8DDC7]/80'
                  }`}
                >
                  {step.message}
                </p>

                {step.outputPayload && (
                  <div
                    className={`mt-2.5 ml-6 p-2.5 rounded-lg border font-mono text-[11px] overflow-x-auto ${
                      isLight
                        ? 'bg-[#F1F5F9] border-[#CBD5E1] text-[#0F172A]'
                        : 'bg-[#06060A] border-[#161622] text-[#C6A46A]'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(step.outputPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div
            className={`p-4 border-t flex items-center justify-between shrink-0 ${
              isLight ? 'bg-[#F8F9FA] border-[#E2E4E9]' : 'bg-[#0E0E18] border-[#1A1A28]'
            }`}
          >
            <span className={`text-[11px] font-mono ${isLight ? 'text-[#64748B]' : 'text-[#8C7A6B]'}`}>
              Autonomous routing verified via Harpy Core.
            </span>

            <div className="flex items-center gap-2">
              {onReRun && (
                <button
                  type="button"
                  onClick={onReRun}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F3F6]'
                      : 'bg-[#181824] border-[#2B2B3C] text-[#E8DDC7] hover:bg-[#202030]'
                  }`}
                >
                  <Play className={`w-3 h-3 ${isLight ? 'fill-[#0F172A]' : 'fill-[#E8DDC7]'}`} /> Re-run Test
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-1.5 rounded-xl font-mono text-xs font-medium tracking-wide transition-all shadow-sm ${
                  isLight
                    ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A]'
                    : 'bg-gradient-to-b from-[#222232] via-[#181826] to-[#12121E] text-[#E8DDC7] border border-[#303046] hover:border-[#4A4A66] hover:text-white'
                }`}
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
