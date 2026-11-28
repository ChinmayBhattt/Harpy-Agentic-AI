'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RotateCw,
  Columns2,
  GitPullRequest,
  GitBranch,
  GitCommit,
  Upload,
  CheckCircle2,
  ExternalLink,
  FileDiff,
} from 'lucide-react';

interface GitChangeItem {
  path: string;
  status: string;
  staged: boolean;
}

interface GitCommitItem {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface PullRequestItem {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'merged' | 'closed';
  author: string;
  avatarUrl?: string;
  headRef: string;
  baseRef: string;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
}

interface VersionControlViewProps {
  onBranchLoaded?: (branch: string, branches: string[]) => void;
  isLight?: boolean;
}

export default function VersionControlView({ onBranchLoaded, isLight = false }: VersionControlViewProps) {
  const [paneMode, setPaneMode] = useState<'prs' | 'changes'>('prs');
  const [prFilter, setPrFilter] = useState<'all' | 'open' | 'merged'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [repoPath, setRepoPath] = useState('');
  const [branch, setBranch] = useState('main');
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [changes, setChanges] = useState<GitChangeItem[]>([]);
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);

  const [selectedPR, setSelectedPR] = useState<PullRequestItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<GitChangeItem | null>(null);
  const [fileDiffText, setFileDiffText] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState('');
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadGitData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/git?state=${encodeURIComponent(prFilter)}`);
      const data = await res.json();
      if (data.success) {
        setRepoPath(data.repoPath || '');
        setBranch(data.branch || 'main');
        setRemoteUrl(data.remoteUrl || null);
        setGithubError(data.githubError || null);
        setChanges(Array.isArray(data.changes) ? data.changes : []);
        setCommits(Array.isArray(data.commits) ? data.commits : []);
        setPullRequests(Array.isArray(data.pullRequests) ? data.pullRequests : []);
        onBranchLoaded?.(data.branch || 'main', Array.isArray(data.branches) ? data.branches : ['main']);
      } else {
        setGithubError(data.error || 'Failed to inspect Git repository.');
      }
    } catch (e: unknown) {
      setGithubError(e instanceof Error ? e.message : 'Git status check failed.');
    } finally {
      setLoading(false);
    }
  }, [prFilter, onBranchLoaded]);

  useEffect(() => {
    loadGitData();
  }, [loadGitData]);

  const handleSelectFile = async (item: GitChangeItem) => {
    setSelectedPR(null);
    setSelectedFile(item);
    setFileDiffText('Loading diff...');
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'diff', filePath: item.path }),
      });
      const data = await res.json();
      setFileDiffText(data.diff || 'No diff available.');
    } catch {
      setFileDiffText('Failed to load diff.');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setActionError(null);
    setActionStatus('Committing changes...');
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', message: commitMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Commit failed');
        setActionStatus(null);
        return;
      }
      setCommitMessage('');
      setActionStatus('Committed cleanly.');
      setSelectedFile(null);
      await loadGitData();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Commit error');
      setActionStatus(null);
    }
  };

  const handlePush = async () => {
    setActionError(null);
    setActionStatus('Pushing to GitHub...');
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Push failed');
        setActionStatus(null);
        return;
      }
      setActionStatus('Pushed to origin.');
      await loadGitData();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Push error');
      setActionStatus(null);
    }
  };

  const filteredPRs = pullRequests.filter((pr) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pr.title.toLowerCase().includes(q) ||
      pr.author.toLowerCase().includes(q) ||
      String(pr.number).includes(q)
    );
  });

  const filteredChanges = changes.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.path.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      className={`flex-1 flex h-full overflow-hidden font-sans ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#13110F] text-[#ECEAE6]'
      }`}
    >
      {/* Left List Column (Matches Screenshot 5 Split Pane) */}
      <div
        className={`w-80 sm:w-96 border-r flex flex-col shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50/40' : 'border-[#26231F] bg-[#151311]'
        }`}
      >
        {/* Top Filter Row */}
        <div
          className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${
            isLight ? 'border-slate-200' : 'border-[#25221E]'
          }`}
        >
          <div className="flex items-center gap-1">
            {paneMode === 'prs' ? (
              <>
                {(['all', 'open', 'merged'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPrFilter(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      prFilter === tab
                        ? isLight
                          ? 'bg-slate-200 text-slate-900'
                          : 'bg-[#262320] text-[#ECEAE6]'
                        : isLight
                          ? 'text-slate-500 hover:text-slate-900'
                          : 'text-[#8E8880] hover:text-[#ECEAE6]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </>
            ) : (
              <span className="text-xs font-medium px-1.5 inline-flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-[#8E8880]" />
                <span>{branch}</span>
                <span className="text-[11px] font-mono text-[#78726B]">({changes.length})</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadGitData}
              className={`p-1.5 rounded-md transition-colors ${
                isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-[#8E8880] hover:bg-[#24201C] hover:text-[#ECEAE6]'
              }`}
              title="Refresh Git & GitHub state"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setPaneMode(paneMode === 'prs' ? 'changes' : 'prs')}
              className={`p-1.5 rounded-md transition-colors ${
                paneMode === 'changes'
                  ? isLight
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-[#262320] text-[#ECEAE6]'
                  : isLight
                    ? 'text-slate-500 hover:bg-slate-200'
                    : 'text-[#8E8880] hover:bg-[#24201C] hover:text-[#ECEAE6]'
              }`}
              title={paneMode === 'prs' ? 'Switch to Local Changes & Commits' : 'Switch to GitHub Pull Requests'}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 pb-2">
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
              placeholder={paneMode === 'prs' ? 'Search pull requests...' : 'Search changed files...'}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  : 'bg-[#1B1917] border-[#2C2824] text-[#ECEAE6] placeholder-[#78726B]'
              }`}
            />
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {paneMode === 'prs' ? (
            <>
              {githubError ? (
                <div className="p-2 space-y-2.5">
                  <p className="text-xs text-[#E05252] leading-relaxed">{githubError}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadGitData}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isLight
                          ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                          : 'bg-[#1D1B18] border-[#2E2A25] hover:bg-[#272420] text-[#ECEAE6]'
                      }`}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaneMode('changes')}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-[#9E978F] hover:bg-[#221F1C]'
                      }`}
                    >
                      View Local Git
                    </button>
                  </div>
                </div>
              ) : filteredPRs.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
                    {loading ? 'Loading pull requests...' : `No ${prFilter === 'all' ? '' : prFilter + ' '}pull requests found.`}
                  </p>
                  {changes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaneMode('changes')}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-700'
                          : 'bg-[#1D1B18] border-[#2E2A25] text-[#ECEAE6] hover:bg-[#272420]'
                      }`}
                    >
                      {changes.length} local change{changes.length === 1 ? '' : 's'} ready
                    </button>
                  )}
                </div>
              ) : (
                filteredPRs.map((pr) => {
                  const active = selectedPR?.id === pr.id;
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setSelectedPR(pr);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors space-y-1 ${
                        active
                          ? isLight
                            ? 'bg-slate-200/70 border-slate-300'
                            : 'bg-[#221F1C] border-[#38322D]'
                          : isLight
                            ? 'border-transparent hover:bg-slate-100'
                            : 'border-transparent hover:bg-[#1B1917]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium line-clamp-2">{pr.title}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded capitalize shrink-0 ${
                            pr.state === 'open'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : pr.state === 'merged'
                                ? 'bg-purple-500/15 text-purple-300'
                                : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {pr.state}
                        </span>
                      </div>
                      <div className={`text-[11px] font-mono flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
                        <span>#{pr.number}</span>
                        <span>·</span>
                        <span className="truncate">{pr.author}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          ) : (
            /* Local Changes & Commits */
            <div className="space-y-4">
              {changes.length > 0 && (
                <div className="space-y-2 p-2.5 rounded-xl border border-[#2B2723] bg-[#191715]">
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs border focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#12100E] border-[#2E2A25] text-[#ECEAE6] placeholder-[#78726B]'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCommit}
                      disabled={!commitMessage.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#ECEAE6] text-[#141210] hover:bg-white disabled:opacity-40 transition-colors"
                    >
                      <GitCommit className="w-3.5 h-3.5" />
                      <span>Commit</span>
                    </button>
                    {remoteUrl && (
                      <button
                        type="button"
                        onClick={handlePush}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#332E29] bg-[#221F1C] hover:bg-[#2B2723] text-[#ECEAE6] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Push</span>
                      </button>
                    )}
                  </div>
                  {actionStatus && <p className="text-[11px] text-emerald-400">{actionStatus}</p>}
                  {actionError && <p className="text-[11px] text-rose-400">{actionError}</p>}
                </div>
              )}

              <div className="space-y-1">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                  Working Tree ({filteredChanges.length})
                </div>
                {filteredChanges.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-[#78726B]">Working tree clean.</p>
                ) : (
                  filteredChanges.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleSelectFile(item)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                        selectedFile?.path === item.path
                          ? 'bg-[#262320] text-[#ECEAE6]'
                          : 'text-[#A8A199] hover:bg-[#1C1A17] hover:text-[#ECEAE6]'
                      }`}
                    >
                      <span className="truncate">{item.path}</span>
                      <span className="text-[10px] text-amber-400 shrink-0">{item.status}</span>
                    </button>
                  ))
                )}
              </div>

              {commits.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-[#24201C]">
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                    Recent Commits
                  </div>
                  {commits.slice(0, 8).map((c) => (
                    <div key={c.hash} className="px-2 py-1.5 rounded-lg text-xs space-y-0.5 hover:bg-[#1A1816]">
                      <div className="truncate font-medium text-[#D8D3CC]">{c.message}</div>
                      <div className="text-[10px] font-mono text-[#78726B] flex items-center gap-1.5">
                        <span>{c.hash}</span>
                        <span>·</span>
                        <span>{c.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Repo Meta */}
        <div
          className={`px-3.5 py-2 border-t text-[11px] font-mono flex items-center justify-between ${
            isLight ? 'border-slate-200 text-slate-500' : 'border-[#25221E] text-[#78726B]'
          }`}
        >
          <span className="truncate">{repoPath ? repoPath.split('/').pop() : 'harpy'}</span>
          <span>{branch}</span>
        </div>
      </div>

      {/* Right Preview Pane (Matches Screenshot 5 Empty / Detail State) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div
          className={`h-11 px-4 border-b flex items-center justify-between ${
            isLight ? 'border-slate-200' : 'border-[#25221E]'
          }`}
        >
          <div className="text-xs font-mono text-[#8E8880] truncate">
            {selectedPR
              ? `#${selectedPR.number} · ${selectedPR.headRef} → ${selectedPR.baseRef}`
              : selectedFile
                ? selectedFile.path
                : remoteUrl || 'Version Control'}
          </div>
          {remoteUrl && (
            <button
              type="button"
              onClick={handlePush}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#1B1917] border-[#2C2824] text-[#D8D3CC] hover:bg-[#24201C]'
              }`}
              title="Push HEAD to GitHub"
            >
              <Upload className="w-3 h-3" />
              <span>Push</span>
            </button>
          )}
        </div>

        {selectedPR ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{selectedPR.title}</h2>
                <div className="text-xs font-mono text-[#8E8880] flex items-center gap-2">
                  <span>#{selectedPR.number}</span>
                  <span>opened by {selectedPR.author}</span>
                  <span>·</span>
                  <span>
                    {selectedPR.headRef} → {selectedPR.baseRef}
                  </span>
                </div>
              </div>
              <a
                href={selectedPR.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#302B26] bg-[#1C1A17] hover:bg-[#25221E] transition-colors shrink-0"
              >
                <span>Open on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-4 rounded-xl border border-[#282420] bg-[#181614] text-xs leading-relaxed whitespace-pre-wrap text-[#D8D3CC]">
              {selectedPR.body || 'No description provided for this pull request.'}
            </div>
          </div>
        ) : selectedFile ? (
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
            <div className="mb-3 flex items-center gap-2 text-[#8E8880]">
              <FileDiff className="w-4 h-4" />
              <span>{selectedFile.path}</span>
            </div>
            <pre className="p-4 rounded-xl bg-[#161412] border border-[#282420] overflow-x-auto whitespace-pre-wrap text-[#D8D3CC]">
              {fileDiffText}
            </pre>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <GitPullRequest className={`w-7 h-7 ${isLight ? 'text-slate-300' : 'text-[#6A645D]'}`} />
            <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
              {paneMode === 'prs'
                ? 'Select a pull request to preview it here.'
                : 'Select a changed file to inspect its git diff.'}
            </p>
            {commits.length > 0 && (
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6E6860] pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>Latest: {commits[0].hash} — {commits[0].message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
