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
      <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm bg-[#090910]/98 backdrop-blur-2xl border-l border-[#1A1A26] shadow-2xl flex flex-col text-[#D8D4CF]">
        {/* Header */}
        <div className="h-14 px-4 bg-[#0D0D16] border-b border-[#181824] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
              style={{ backgroundColor: `${app?.color || '#8C7A6B'}15`, color: app?.color || '#D8D4CF' }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-cinzel text-xs font-semibold text-[#E8DDC7] truncate">
                {node.title}
              </h3>
              <p className="text-[10px] font-mono text-[#7A7A8E]">Node Inspector</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A7A8E] hover:text-[#E8DDC7] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-inter [scrollbar-width:thin]">
          {/* Status Banner */}
          <div className="p-2.5 rounded-xl bg-[#0C0C14] border border-[#1A1A26] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#7A7A8E]">Core Connectivity</span>
            {node.isConnectedToCore ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active (Linked to Harpy)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Paused (Disconnected)
              </span>
            )}
          </div>

          {/* Node Custom Label */}
          <div>
            <label className="block text-[11px] font-mono text-[#7A7A8E] mb-1">Node Title</label>
            <input
              type="text"
              value={node.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF] focus:outline-none focus:border-[#383850] transition-colors"
            />
          </div>

          {/* Action / Trigger Selector */}
          <div>
            <label className="block text-[11px] font-mono text-[#7A7A8E] mb-1">
              {node.type === 'trigger' ? 'Trigger Event' : 'Autonomous Action'}
            </label>
            <select
              value={node.actionOrTrigger}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF] focus:outline-none focus:border-[#383850] transition-colors"
            >
              {(node.type === 'trigger' ? app?.triggers : app?.actions)?.map((act, i) => (
                <option key={i} value={act} className="bg-[#0B0B12] text-[#E8DDC7]">
                  {act}
                </option>
              )) || <option value={node.actionOrTrigger}>{node.actionOrTrigger}</option>}
            </select>
          </div>

          {/* Dynamic Configuration Fields */}
          {node.appId === 'harpy-core' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#9E9B95] uppercase tracking-wider">Harpy Core Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">Reasoning Model</label>
                <select
                  defaultValue={node.config.model || 'GPT-OSS 120B'}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF]"
                >
                  <option value="GPT-OSS 120B">Harpy GPT-OSS 120B (High Reasoning)</option>
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                  <option value="DeepSeek R1">DeepSeek R1 Distill</option>
                  <option value="Groq Llama 3.3">Groq Llama 3.3 70B (Fast Execution)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">Execution Mode</label>
                <select
                  defaultValue={node.config.mode || 'Autonomous Multi-Agent'}
                  onChange={(e) => handleConfigChange('mode', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF]"
                >
                  <option value="Autonomous Multi-Agent">Autonomous Multi-Agent</option>
                  <option value="Strict Sequential Pipeline">Strict Sequential Pipeline</option>
                  <option value="Event-Driven Reactive">Event-Driven Reactive</option>
                </select>
              </div>
            </div>
          )}

          {node.appId === 'gmail' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#9E9B95] uppercase tracking-wider">Gmail Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">Search Filter Query</label>
                <input
                  type="text"
                  defaultValue={node.config.filter || 'is:unread label:inbox'}
                  onChange={(e) => handleConfigChange('filter', e.target.value)}
                  placeholder="e.g. is:unread from:clients"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">Polling Interval</label>
                <select
                  defaultValue={node.config.interval || 'Real-time (Push)'}
                  onChange={(e) => handleConfigChange('interval', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF]"
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
              <p className="text-[11px] font-mono text-[#9E9B95] uppercase tracking-wider">Notion Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">Target Database / Page</label>
                <input
                  type="text"
                  defaultValue={node.config.database || 'Harpy AI Action Tasks'}
                  onChange={(e) => handleConfigChange('database', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF]"
                />
              </div>
            </div>
          )}

          {node.appId === 'ai-models' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#9E9B95] uppercase tracking-wider">AI Reasoning Prompt</p>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">System Instructions</label>
                <textarea
                  rows={3}
                  defaultValue={
                    node.config.prompt ||
                    'Extract sender, key requirements, sentiment, and generate 3 clear bullet action points.'
                  }
                  onChange={(e) => handleConfigChange('prompt', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF] leading-relaxed resize-none"
                />
              </div>
            </div>
          )}

          {node.appId === 'slack' && (
            <div className="space-y-3 pt-2 border-t border-[#181824]">
              <p className="text-[11px] font-mono text-[#9E9B95] uppercase tracking-wider">Slack Parameters</p>
              <div>
                <label className="block text-[10px] font-mono text-[#7A7A8E] mb-1">Target Channel</label>
                <input
                  type="text"
                  defaultValue={node.config.channel || '#ai-alerts'}
                  onChange={(e) => handleConfigChange('channel', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#06060C] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0D0D16] border-t border-[#181824] flex items-center justify-between">
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/25 transition-colors text-xs font-mono flex items-center gap-1.5"
            title="Delete Node"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          <button
            type="button"
            onClick={() => onRunSingleNode(node.id)}
            className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#222232] via-[#181826] to-[#12121E] text-[#E8DDC7] border border-[#303046] hover:border-[#4A4A66] hover:text-white font-mono text-xs font-medium tracking-wide transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-[#C6A46A] text-[#C6A46A]" /> Test Node
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
