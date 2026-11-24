'use client';

import React from 'react';
import { X, FileCode, Check, Copy, Undo2, CheckCircle2 } from 'lucide-react';
import * as diff from 'diff';
import { FileChangeRecord } from '@/lib/agent/events';

interface DiffModalProps {
  file: FileChangeRecord | null;
  onClose: () => void;
  onAccept?: (file: FileChangeRecord) => void;
  onRevert?: (file: FileChangeRecord) => void;
}

export default function DiffModal({ file, onClose, onAccept, onRevert }: DiffModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  if (!file) return null;

  const oldText = file.oldContent || '';
  const newText = file.newContent || '';
  const diffParts = diff.diffLines(oldText, newText);

  const handleCopyNewContent = () => {
    navigator.clipboard.writeText(newText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAccept = () => {
    setAccepted(true);
    onAccept?.(file);
    setTimeout(() => onClose(), 600);
  };

  const handleRevert = () => {
    if (confirm(`Are you sure you want to revert changes to "${file.path}"?`)) {
      onRevert?.(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#09080E] border border-[#26211C] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111018] border-b border-[#201D28] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCode className="w-4 h-4 text-[#C6A46A] shrink-0" />
            <span className="font-mono text-sm text-[#E8DDC7] font-medium truncate">
              {file.path}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                +{file.addedLines}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold">
                -{file.removedLines}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRevert && (
              <button
                type="button"
                onClick={handleRevert}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors"
                title="Revert this file change"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            )}

            {onAccept && (
              <button
                type="button"
                onClick={handleAccept}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 transition-colors"
                title="Accept this file change"
              >
                {accepted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{accepted ? 'Accepted' : 'Accept'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyNewContent}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-white/5 hover:bg-white/10 text-[#E8DDC7] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#E8DDC7]/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff View Area */}
        <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed [scrollbar-width:thin] bg-black">
          {diffParts.map((part, pIdx) => {
            const lines = part.value.replace(/\n$/, '').split('\n');
            const isAdded = part.added;
            const isRemoved = part.removed;

            return (
              <div key={pIdx}>
                {lines.map((line, lIdx) => (
                  <div
                    key={`${pIdx}-${lIdx}`}
                    className={`flex items-start px-2 py-0.5 select-text ${
                      isAdded
                        ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                        : isRemoved
                        ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 line-through'
                        : 'text-[#C5BAA7]/80 hover:bg-white/5'
                    }`}
                  >
                    <span className="w-6 shrink-0 text-[#8C7A6B] select-none text-right mr-3 font-mono text-[10px]">
                      {isAdded ? '+' : isRemoved ? '-' : ' '}
                    </span>
                    <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
