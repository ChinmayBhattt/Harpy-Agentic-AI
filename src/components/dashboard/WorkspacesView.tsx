'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ListFilter,
  FolderGit2,
  GitBranch,
  Trash2,
  ArrowUpRight,
  Check,
  X,
  LayoutList,
  LayoutGrid,
  GitFork,
} from 'lucide-react';
import { cdn } from '@/lib/cdn';
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

interface CustomWorkspaceView {
  id: string;
  name: string;
  filterTab: 'all' | 'needs_me' | 'working' | 'completed' | 'idle';
  hasFilesOnly: boolean;
  branchFilter: string;
  sortBy: 'recent' | 'title' | 'files';
}

interface DisplaySettings {
  layout: 'list' | 'grid';
  sortBy: 'recent' | 'title' | 'files';
  showBranch: boolean;
  showFiles: boolean;
  showTimestamp: boolean;
}

interface CreateWorkspaceOptions {
  name?: string;
  branch?: string;
  worktreeMode?: 'Worktree' | 'Sandbox';
  openImmediately?: boolean;
}

interface WorkspacesViewProps {
  workspaces: WorkspaceSessionSummary[];
  activeWorkspaceId: string;
  projectName: string;
  branches?: string[];
  activeBranch?: string;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (opts?: CreateWorkspaceOptions) => void;
  onDeleteWorkspace?: (id: string) => void;
  isLight?: boolean;
}

const DEFAULT_DISPLAY: DisplaySettings = {
  layout: 'list',
  sortBy: 'recent',
  showBranch: true,
  showFiles: true,
  showTimestamp: true,
};

export default function WorkspacesView({
  workspaces,
  activeWorkspaceId,
  projectName,
  branches = ['main'],
  activeBranch = 'main',
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  isLight = false,
}: WorkspacesViewProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'needs_me' | 'working' | 'completed' | 'idle'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasFilesOnly, setHasFilesOnly] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [display, setDisplay] = useState<DisplaySettings>(DEFAULT_DISPLAY);
  const [customViews, setCustomViews] = useState<CustomWorkspaceView[]>([]);
  const [activeCustomViewId, setActiveCustomViewId] = useState<string | null>(null);

  const [openMenu, setOpenMenu] = useState<'filter' | 'display' | 'new_view' | null>(null);
  const [newViewName, setNewViewName] = useState('');

  // Create Workspace Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsBranch, setNewWsBranch] = useState(activeBranch || 'main');
  const [newWsMode, setNewWsMode] = useState<'Worktree' | 'Sandbox'>('Worktree');

  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNewWsBranch(activeBranch || 'main');
  }, [activeBranch]);

  useEffect(() => {
    try {
      const savedDisplay = localStorage.getItem('harpy_workspace_display');
      if (savedDisplay) {
        setDisplay({ ...DEFAULT_DISPLAY, ...JSON.parse(savedDisplay) });
      }
      const savedViews = localStorage.getItem('harpy_workspace_views');
      if (savedViews) {
        const parsed = JSON.parse(savedViews);
        if (Array.isArray(parsed)) setCustomViews(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateDisplay = (patch: Partial<DisplaySettings>) => {
    setDisplay((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('harpy_workspace_display', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSaveCustomView = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = newViewName.trim();
    if (!clean) return;
    const view: CustomWorkspaceView = {
      id: `view-${Date.now()}`,
      name: clean,
      filterTab,
      hasFilesOnly,
      branchFilter,
      sortBy: display.sortBy,
    };
    const next = [...customViews, view];
    setCustomViews(next);
    setActiveCustomViewId(view.id);
    setNewViewName('');
    setOpenMenu(null);
    try {
      localStorage.setItem('harpy_workspace_views', JSON.stringify(next));
    } catch {}
  };

  const applyCustomView = (view: CustomWorkspaceView) => {
    setActiveCustomViewId(view.id);
    setFilterTab(view.filterTab);
    setHasFilesOnly(view.hasFilesOnly);
    setBranchFilter(view.branchFilter);
    updateDisplay({ sortBy: view.sortBy });
  };

  const deleteCustomView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    if (activeCustomViewId === id) {
      setActiveCustomViewId(null);
      setFilterTab('all');
      setHasFilesOnly(false);
      setBranchFilter('all');
    }
    try {
      localStorage.setItem('harpy_workspace_views', JSON.stringify(next));
    } catch {}
  };

  const availableBranches = useMemo(() => {
    const set = new Set<string>(branches);
    workspaces.forEach((w) => {
      if (w.branch) set.add(w.branch);
    });
    return Array.from(set);
  }, [branches, workspaces]);

  const activeFilterCount =
    (filterTab !== 'all' ? 1 : 0) + (hasFilesOnly ? 1 : 0) + (branchFilter !== 'all' ? 1 : 0);

  const filtered = useMemo(() => {
    const list = workspaces.filter((ws) => {
      if (filterTab === 'needs_me' && ws.status !== 'needs_approval') return false;
      if (filterTab === 'working' && ws.status !== 'working') return false;
      if (filterTab === 'completed' && ws.status !== 'completed') return false;
      if (filterTab === 'idle' && ws.status !== 'idle') return false;
      if (hasFilesOnly && ws.files.length === 0) return false;
      if (branchFilter !== 'all' && (ws.branch || 'main') !== branchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return ws.title.toLowerCase().includes(q) || (ws.branch || '').toLowerCase().includes(q);
      }
      return true;
    });

    if (display.sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (display.sortBy === 'files') {
      return [...list].sort((a, b) => b.files.length - a.files.length);
    }
    return list;
  }, [workspaces, filterTab, hasFilesOnly, branchFilter, searchQuery, display.sortBy]);

  const handleSubmitCreate = (openImmediately: boolean) => {
    const fallbackName = `Workspace ${workspaces.length + 1}`;
    onCreateWorkspace({
      name: newWsName.trim() || fallbackName,
      branch: newWsBranch || activeBranch || 'main',
      worktreeMode: newWsMode,
      openImmediately,
    });
    setNewWsName('');
    setShowCreateModal(false);
  };

  return (
    <div
      ref={menuContainerRef}
      className={`flex-1 flex flex-col h-full overflow-hidden font-sans relative ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#13110F] text-[#ECEAE6]'
      }`}
    >
      {/* Top Header */}
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Workspaces</h1>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-[#78726B]'
                }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className={`pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none w-48 sm:w-64 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                  : 'bg-[#1B1917] border-[#2C2824] text-[#ECEAE6] placeholder-[#78726B] focus:border-[#4A443E]'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setOpenMenu(null);
              setShowCreateModal(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${isLight
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
        className={`px-6 pb-3 border-b flex flex-wrap items-center justify-between gap-2 relative z-20 ${
          isLight ? 'border-slate-200' : 'border-[#25221E]'
        }`}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'needs_me', label: 'Needs me' },
            { id: 'working', label: 'Working' },
          ].map((tab) => {
            const active = filterTab === tab.id && !activeCustomViewId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCustomViewId(null);
                  setFilterTab(tab.id as any);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${active
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

          {customViews.map((cv) => {
            const active = activeCustomViewId === cv.id;
            return (
              <div
                key={cv.id}
                onClick={() => applyCustomView(cv)}
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  active
                    ? isLight
                      ? 'bg-slate-200 text-slate-900'
                      : 'bg-[#262320] text-[#ECEAE6]'
                    : isLight
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#1D1A17]'
                }`}
              >
                <span>{cv.name}</span>
                <button
                  type="button"
                  onClick={(e) => deleteCustomView(cv.id, e)}
                  className="opacity-60 hover:opacity-100 hover:text-rose-400"
                  title="Remove view"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs relative">
          {/* + New view button + popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'new_view' ? null : 'new_view')}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                openMenu === 'new_view'
                  ? isLight
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-[#262320] text-[#ECEAE6]'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#1D1A17]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New view</span>
            </button>

            {openMenu === 'new_view' && (
              <form
                onSubmit={handleSaveCustomView}
                className={`absolute right-0 top-full mt-2 w-64 rounded-xl border p-3 shadow-2xl z-30 space-y-2.5 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#1B1917] border-[#2E2A25]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Save current view</span>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(null)}
                    className="text-[#78726B] hover:text-[#ECEAE6]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="e.g. Needs Review, Active..."
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs border focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-[#13110F] border-[#2E2A25] text-[#ECEAE6] placeholder-[#78726B]'
                  }`}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(null)}
                    className="px-2.5 py-1 rounded-md text-xs text-[#8E8880] hover:text-[#ECEAE6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newViewName.trim()}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#ECEAE6] text-[#141210] hover:bg-white disabled:opacity-40"
                  >
                    Save view
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Display button + popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'display' ? null : 'display')}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                openMenu === 'display'
                  ? isLight
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-[#262320] text-[#ECEAE6]'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#1D1A17]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Display</span>
            </button>

            {openMenu === 'display' && (
              <div
                className={`absolute right-0 top-full mt-2 w-60 rounded-xl border p-3 shadow-2xl z-30 space-y-3 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#1B1917] border-[#2E2A25]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                    Layout
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateDisplay({ layout: 'list' })}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border transition-colors ${
                        display.layout === 'list'
                          ? 'bg-[#262320] border-[#46403A] text-[#ECEAE6]'
                          : 'border-[#282420] text-[#8E8880] hover:text-[#ECEAE6]'
                      }`}
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      <span>List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDisplay({ layout: 'grid' })}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs border transition-colors ${
                        display.layout === 'grid'
                          ? 'bg-[#262320] border-[#46403A] text-[#ECEAE6]'
                          : 'border-[#282420] text-[#8E8880] hover:text-[#ECEAE6]'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Grid</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                    Sort by
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: 'recent', label: 'Most recent' },
                      { id: 'title', label: 'Title (A-Z)' },
                      { id: 'files', label: 'Most changed files' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateDisplay({ sortBy: s.id as DisplaySettings['sortBy'] })}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors ${
                          display.sortBy === s.id
                            ? 'bg-[#262320] text-[#ECEAE6]'
                            : 'text-[#8E8880] hover:bg-[#211E1B] hover:text-[#ECEAE6]'
                        }`}
                      >
                        <span>{s.label}</span>
                        {display.sortBy === s.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#282420]">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                    Columns
                  </div>
                  {[
                    { key: 'showBranch', label: 'Show Git branch' },
                    { key: 'showFiles', label: 'Show files count' },
                    { key: 'showTimestamp', label: 'Show timestamp' },
                  ].map((col) => {
                    const checked = display[col.key as keyof DisplaySettings] as boolean;
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => updateDisplay({ [col.key]: !checked } as Partial<DisplaySettings>)}
                        className="w-full flex items-center justify-between px-2 py-1 rounded-md text-xs text-[#A8A199] hover:bg-[#211E1B] hover:text-[#ECEAE6]"
                      >
                        <span>{col.label}</span>
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            checked
                              ? 'bg-[#ECEAE6] border-[#ECEAE6] text-[#141210]'
                              : 'border-[#3E3934]'
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Sub-Bar: Filter button + Count */}
      <div
        className={`px-6 py-2 border-b flex items-center justify-between text-xs relative z-10 ${
          isLight ? 'border-slate-100 text-slate-500' : 'border-[#211E1B] text-[#8E8880]'
        }`}
      >
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
              openMenu === 'filter' || activeFilterCount > 0
                ? isLight
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-[#221F1C] text-[#ECEAE6]'
                : isLight
                  ? 'hover:bg-slate-100 hover:text-slate-900'
                  : 'hover:bg-[#1D1A17] hover:text-[#ECEAE6]'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#3A342E] text-[#ECEAE6] text-[10px]">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveCustomViewId(null);
                setFilterTab('all');
                setHasFilesOnly(false);
                setBranchFilter('all');
              }}
              className="text-[11px] text-[#78726B] hover:text-[#ECEAE6]"
            >
              Clear
            </button>
          )}

          {openMenu === 'filter' && (
            <div
              className={`absolute left-0 top-full mt-2 w-64 rounded-xl border p-3 shadow-2xl z-30 space-y-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#1B1917] border-[#2E2A25]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                  Status
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'working', label: 'Working' },
                    { id: 'needs_me', label: 'Needs me' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'idle', label: 'Ready / Empty' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setActiveCustomViewId(null);
                        setFilterTab(st.id as any);
                      }}
                      className={`px-2 py-1 rounded-md text-left text-xs transition-colors ${
                        filterTab === st.id
                          ? 'bg-[#262320] text-[#ECEAE6]'
                          : 'text-[#8E8880] hover:bg-[#211E1B] hover:text-[#ECEAE6]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#282420]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                  Branch
                </div>
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    setActiveCustomViewId(null);
                    setBranchFilter(e.target.value);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                >
                  <option value="all">All branches</option>
                  {availableBranches.map((br) => (
                    <option key={br} value={br}>
                      {br}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCustomViewId(null);
                  setHasFilesOnly(!hasFilesOnly);
                }}
                className="w-full flex items-center justify-between pt-2 border-t border-[#282420] text-xs text-[#A8A199] hover:text-[#ECEAE6]"
              >
                <span>Has modified files only</span>
                <span
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                    hasFilesOnly
                      ? 'bg-[#ECEAE6] border-[#ECEAE6] text-[#141210]'
                      : 'border-[#3E3934]'
                  }`}
                >
                  {hasFilesOnly && <Check className="w-2.5 h-2.5" />}
                </span>
              </button>
            </div>
          )}
        </div>

        <span className="text-[11px] font-mono">
          {filtered.length} {filtered.length === 1 ? 'workspace' : 'workspaces'}
        </span>
      </div>

      {/* Workspaces List / Grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6 space-y-3">
            <FolderGit2 className={`w-8 h-8 ${isLight ? 'text-slate-300' : 'text-[#3C3732]'}`} />
            <div className="space-y-1">
              <p className="text-sm font-medium">No matching workspaces</p>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
                Create a new workspace or adjust your active filter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ECEAE6] text-[#141210] hover:bg-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create workspace</span>
            </button>
          </div>
        ) : display.layout === 'grid' ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              return (
                <div
                  key={ws.id}
                  onClick={() => onSelectWorkspace(ws.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors group flex flex-col justify-between gap-3 ${
                    isLight
                      ? isActive
                        ? 'bg-slate-100 border-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                      : isActive
                        ? 'bg-[#1D1B18] border-[#3C3732]'
                        : 'bg-[#181614] border-[#25221E] hover:border-[#36312C]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            ws.status === 'working'
                              ? 'bg-amber-400 animate-pulse'
                              : ws.status === 'needs_approval'
                                ? 'bg-[#E06D44]'
                                : isActive
                                  ? 'bg-emerald-400'
                                  : 'bg-[#46403A]'
                          }`}
                        />
                        <span className="text-sm font-medium truncate">{ws.title}</span>
                      </div>
                      {onDeleteWorkspace && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWorkspace(ws.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Delete Workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-[#8E8880]">
                      <span className="inline-flex items-center gap-1.5">
                        <Image
                          src={cdn('/images/harpy-logo-light.png')}
                          alt="Harpy AI"
                          width={14}
                          height={14}
                          className="w-3.5 h-3.5 object-contain"
                        />
                        <span>{projectName}</span>
                      </span>
                      {display.showBranch && ws.branch && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#78726B]">
                          <GitBranch className="w-3 h-3" />
                          {ws.branch}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#78726B] font-mono pt-2 border-t border-[#24211E]">
                    <span>
                      {display.showFiles ? `${ws.files.length} files` : `${ws.messageCount} msgs`}
                    </span>
                    {display.showTimestamp && <span>{ws.timestamp}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-[#1F1C19]/60">
            {filtered.map((ws) => {
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
                    {isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#262320] text-[#D8D3CC] shrink-0">
                        Active
                      </span>
                    )}
                    {display.showFiles && ws.files.length > 0 && (
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
                        className={`w-4 h-4 rounded flex items-center justify-center overflow-hidden ${
                          isLight ? 'bg-slate-200' : 'bg-[#2A2622]'
                        }`}
                      >
                        <Image
                          src={cdn('/images/harpy-logo-light.png')}
                          alt="Harpy AI"
                          width={14}
                          height={14}
                          className="w-3.5 h-3.5 object-contain"
                        />
                      </span>
                      <span>{projectName}</span>
                    </div>

                    {display.showBranch && ws.branch && (
                      <span
                        className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono ${
                          isLight ? 'text-slate-500' : 'text-[#78726B]'
                        }`}
                      >
                        <GitBranch className="w-3 h-3" />
                        {ws.branch}
                      </span>
                    )}

                    {display.showTimestamp && (
                      <span
                        className={`text-xs font-mono ${
                          isLight ? 'text-slate-400' : 'text-[#78726B]'
                        }`}
                      >
                        {ws.timestamp}
                      </span>
                    )}

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
            })}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#181614] border-[#2E2A25] text-[#ECEAE6]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src={cdn('/images/harpy-logo-light.png')}
                  alt="Harpy AI"
                  width={18}
                  height={18}
                  className="w-4.5 h-4.5 object-contain"
                />
                <h2 className="text-sm font-semibold">Create workspace</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-[#78726B] hover:text-[#ECEAE6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-[#8E8880]">Workspace name</label>
                <input
                  type="text"
                  autoFocus
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitCreate(true);
                    }
                  }}
                  placeholder={`Workspace ${workspaces.length + 1}`}
                  className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-[#13110F] border-[#2E2A25] text-[#ECEAE6] placeholder-[#6A645D] focus:border-[#4A443E]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#8E8880]">Branch</label>
                  <select
                    value={newWsBranch}
                    onChange={(e) => setNewWsBranch(e.target.value)}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs border focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-[#13110F] border-[#2E2A25] text-[#ECEAE6]'
                    }`}
                  >
                    {availableBranches.map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#8E8880]">Environment</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#13110F] border border-[#2E2A25]">
                    {(['Worktree', 'Sandbox'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setNewWsMode(mode)}
                        className={`inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                          newWsMode === mode
                            ? 'bg-[#262320] text-[#ECEAE6]'
                            : 'text-[#8E8880] hover:text-[#ECEAE6]'
                        }`}
                      >
                        <GitFork className="w-3 h-3" />
                        <span>{mode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#25221E]">
              <button
                type="button"
                onClick={() => handleSubmitCreate(false)}
                className="px-3 py-1.5 rounded-lg text-xs border border-[#2E2A25] text-[#D8D3CC] hover:bg-[#221F1C] transition-colors"
              >
                Create in list
              </button>
              <button
                type="button"
                onClick={() => handleSubmitCreate(true)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#ECEAE6] text-[#141210] hover:bg-white transition-colors"
              >
                Create & open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
