'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sliders,
  Settings2,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { WorkflowNode, AppDefinition, APP_ICONS } from './types';

interface NodeInspectorProps {
  node: WorkflowNode | null;
  app: AppDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (updatedNode: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onRunSingleNode: (nodeId: string) => void;
}

export default function NodeInspectorModal({
  node,
  app,
  isOpen,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onRunSingleNode,
}: NodeInspectorProps) {
  if (!isOpen || !node) return null;

  const Icon = app ? APP_ICONS[app.iconName] || APP_ICONS.Globe : APP_ICONS.Sparkles;

  const handleActionChange = (action: string) => {
    onUpdateNode({
      ...node,
      actionOrTrigger: action,
    });
  };

  const handleTitleChange = (title: string) => {
    onUpdateNode({
      ...node,
      title,
    });
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode({
      ...node,
      config: {
        ...node.config,
        [key]: value,
      },
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm bg-[#09090F]/95 backdrop-blur-xl border-l border-[#C6A46A]/30 shadow-2xl flex flex-col text-[#E8DDC7]">
        {/* Header */}
        <div className="h-14 px-4 bg-[#0D0D16] border-b border-[#1A1A26] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
              style={{ backgroundColor: `${app?.color || '#C6A46A'}20`, color: app?.color || '#C6A46A' }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-cinzel text-xs font-semibold text-[#E8DDC7] truncate">
                {node.title}
              </h3>
              <p className="text-[10px] font-mono text-[#8C7A6B]">Node Inspector</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#E8DDC7] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-inter [scrollbar-width:thin]">
          {/* Status Banner */}
          <div className="p-2.5 rounded-xl bg-[#0E0E18] border border-[#1C1C2A] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8C7A6B]">Core Connectivity</span>
            {node.isConnectedToCore ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active (Linked to Harpy)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Paused (Disconnected)
              </span>
            )}
          </div>

          {/* Node Custom Label */}
          <div>
            <label className="block text-[11px] font-mono text-[#8C7A6B] mb-1">Node Title</label>
            <input
              type="text"
              value={node.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06060A] border border-[#222232] text-xs font-mono text-[#E8DDC7] focus:outline-none focus:border-[#C6A46A]/80 transition-colors"
            />
          </div>

          {/* Action / Trigger Selector */}
          <div>
            <label className="block text-[11px] font-mono text-[#8C7A6B] mb-1">
              {node.type === 'trigger' ? 'Trigger Event' : 'Autonomous Action'}
            </label>
            <select
              value={node.actionOrTrigger}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06060A] border border-[#222232] text-xs font-mono text-[#E8DDC7] focus:outline-none focus:border-[#C6A46A]/80 transition-colors"
            >
              {(node.type === 'trigger' ? app?.triggers : app?.actions)?.map((act, i) => (
                <option key={i} value={act} className="bg-[#0B0B12] text-[#E8DDC7]">
                  {act}
                </option>
              )) || <option value={node.actionOrTrigger}>{node.actionOrTrigger}</option>}
            </select>
          </div>

          {/* Dynamic Configuration Fields */}
          {node.appId === 'gmail' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#C6A46A] uppercase">Gmail Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#8C7A6B] mb-1">Search Filter Query</label>
                <input
                  type="text"
                  defaultValue={node.config.filter || 'is:unread label:inbox'}
                  onChange={(e) => handleConfigChange('filter', e.target.value)}
                  placeholder="e.g. is:unread from:clients"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060A] border border-[#222232] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#8C7A6B] mb-1">Polling Interval</label>
                <select
                  defaultValue={node.config.interval || 'Real-time (Push)'}
                  onChange={(e) => handleConfigChange('interval', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060A] border border-[#222232] text-xs font-mono"
                >
                  <option value="Real-time (Push)">Real-time (Push Webhook)</option>
                  <option value="Every 5 mins">Every 5 mins</option>
                  <option value="Every 15 mins">Every 15 mins</option>
                  <option value="Hourly">Hourly</option>
                </select>
              </div>
            </div>
          )}

          {node.appId === 'notion' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#C6A46A] uppercase">Notion Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#8C7A6B] mb-1">Target Database / Page</label>
                <input
                  type="text"
                  defaultValue={node.config.database || 'Harpy AI Action Tasks'}
                  onChange={(e) => handleConfigChange('database', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060A] border border-[#222232] text-xs font-mono"
                />
              </div>
            </div>
          )}

          {node.appId === 'ai-models' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#C6A46A] uppercase">AI Reasoning Prompt</p>
              <div>
                <label className="block text-[10px] font-mono text-[#8C7A6B] mb-1">System Instructions</label>
                <textarea
                  rows={3}
                  defaultValue={
                    node.config.prompt ||
                    'Extract sender, key requirements, sentiment, and generate 3 clear bullet action points.'
                  }
                  onChange={(e) => handleConfigChange('prompt', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#06060A] border border-[#222232] text-xs font-mono leading-relaxed resize-none"
                />
              </div>
            </div>
          )}

          {node.appId === 'slack' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#C6A46A] uppercase">Slack Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#8C7A6B] mb-1">Target Channel</label>
                <input
                  type="text"
                  defaultValue={node.config.channel || '#ai-alerts'}
                  onChange={(e) => handleConfigChange('channel', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060A] border border-[#222232] text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0D0D16] border-t border-[#1A1A26] flex items-center justify-between">
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition-colors text-xs font-mono flex items-center gap-1.5"
            title="Delete Node"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          <button
            type="button"
            onClick={() => onRunSingleNode(node.id)}
            className="px-4 py-2 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs font-semibold tracking-wider uppercase hover:bg-[#E2C99A] transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-[#050508]" /> Test Node
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
