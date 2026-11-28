'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ListFilter,
  FolderGit2,
  GitBranch,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { FileChangeRecord } from '@/lib/agent/events';

export interface WorkspaceSessionSummary {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
  status: 'idle' | 'needs_approval' | 'working' | 'completed';
  files: FileChangeRecord[];
  branch?: string;
}

interface WorkspacesViewProps {
  workspaces: WorkspaceSessionSummary[];
  activeWorkspaceId: string;
  projectName: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
  onDeleteWorkspace?: (id: string) => void;
  isLight?: boolean;
}

export default function WorkspacesView({
  workspaces,
  activeWorkspaceId,
  projectName,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  isLight = false,
}: WorkspacesViewProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'needs_me' | 'working'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return workspaces.filter((ws) => {
      if (filterTab === 'needs_me' && ws.status !== 'needs_approval') return false;
      if (filterTab === 'working' && ws.status !== 'working') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return ws.title.toLowerCase().includes(q) || (ws.branch || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [workspaces, filterTab, searchQuery]);

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden font-sans ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#13110F] text-[#ECEAE6]'
      }`}
    >
      {/* Top Header */}
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Workspaces</h1>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-slate-400' : 'text-[#78726B]'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className={`pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none w-52 sm:w-64 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                  : 'bg-[#1B1917] border-[#2C2824] text-[#ECEAE6] placeholder-[#78726B] focus:border-[#4A443E]'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={onCreateWorkspace}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-[#ECEAE6] text-[#141210] hover:bg-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create workspace</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div
        className={`px-6 pb-3 border-b flex items-center justify-between gap-2 ${
          isLight ? 'border-slate-200' : 'border-[#25221E]'
        }`}
      >
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'needs_me', label: 'Needs me' },
            { id: 'working', label: 'Working' },
          ].map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? isLight
                      ? 'bg-slate-200 text-slate-900'
                      : 'bg-[#262320] text-[#ECEAE6]'
                    : isLight
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#1D1A17]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onCreateWorkspace}
            className={`inline-flex items-center gap-1.5 transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-900' : 'text-[#8E8880] hover:text-[#ECEAE6]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New view</span>
          </button>
          <span
            className={`inline-flex items-center gap-1.5 ${
              isLight ? 'text-slate-500' : 'text-[#8E8880]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Display</span>
          </span>
        </div>
      </div>

      {/* Secondary Sub-Bar */}
      <div
        className={`px-6 py-2 border-b flex items-center justify-between text-xs ${
          isLight ? 'border-slate-100 text-slate-500' : 'border-[#211E1B] text-[#8E8880]'
        }`}
      >
        <div className="inline-flex items-center gap-1.5">
          <ListFilter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </div>
        <span className="text-[11px] font-mono">
          {filtered.length} {filtered.length === 1 ? 'workspace' : 'workspaces'}
        </span>
      </div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1F1C19]/60">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6 space-y-3">
            <FolderGit2 className={`w-8 h-8 ${isLight ? 'text-slate-300' : 'text-[#3C3732]'}`} />
            <div className="space-y-1">
              <p className="text-sm font-medium">No matching workspaces</p>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
                Create a new workspace or adjust your active filter.
              </p>
            </div>
          </div>
        ) : (
          filtered.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className={`px-6 py-3 flex items-center justify-between gap-4 cursor-pointer transition-colors group ${
                  isLight
                    ? isActive
                      ? 'bg-slate-100'
                      : 'hover:bg-slate-50 border-b border-slate-100'
                    : isActive
                      ? 'bg-[#1C1A17]'
                      : 'hover:bg-[#181614]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      ws.status === 'working'
                        ? 'bg-amber-400 animate-pulse'
                        : ws.status === 'needs_approval'
                          ? 'bg-[#E06D44]'
                          : isActive
                            ? 'bg-emerald-400'
                            : isLight
                              ? 'bg-slate-300'
                              : 'bg-[#46403A]'
                    }`}
                  />
                  <span className="text-[13px] font-medium truncate">{ws.title}</span>
                  {ws.files.length > 0 && (
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isLight ? 'bg-slate-200 text-slate-600' : 'bg-[#23201D] text-[#9E978F]'
                      }`}
                    >
                      {ws.files.length} {ws.files.length === 1 ? 'file' : 'files'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className={`hidden sm:inline-flex items-center gap-1.5 text-xs ${
                      isLight ? 'text-slate-500' : 'text-[#8E8880]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-semibold ${
                        isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#2A2622] text-[#D8D3CC]'
                      }`}
                    >
                      {projectName.charAt(0).toUpperCase()}
                    </span>
                    <span>{projectName}</span>
                  </div>

                  {ws.branch && (
                    <span
                      className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono ${
                        isLight ? 'text-slate-500' : 'text-[#78726B]'
                      }`}
                    >
                      <GitBranch className="w-3 h-3" />
                      {ws.branch}
                    </span>
                  )}

                  <span
                    className={`text-xs font-mono ${
                      isLight ? 'text-slate-400' : 'text-[#78726B]'
                    }`}
                  >
                    {ws.timestamp}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWorkspace(ws.id);
                      }}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        isLight
                          ? 'hover:bg-slate-200 text-slate-600'
                          : 'hover:bg-[#2A2622] text-[#A8A199] hover:text-[#ECEAE6]'
                      }`}
                      title="Open Workspace Session"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteWorkspace && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWorkspace(ws.id);
                        }}
                        className="p-1.5 rounded-md text-xs text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
