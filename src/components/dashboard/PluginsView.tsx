'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Check,
  X,
  Terminal,
  Sparkles,
  GitBranch,
  Layers,
  Calendar,
  Mail,
  MessageSquare,
  FileText,
  Mic,
  Wallet,
  Compass,
  ShieldAlert,
  Figma,
  Github,
} from 'lucide-react';

interface PluginEntry {
  id: string;
  name: string;
  description: string;
  category: 'Productivity' | 'Communication' | 'Developer';
  badges: ('MCP' | 'SKILL')[];
  accent: string;
  iconKey: string;
}

interface SkillEntry {
  id: string;
  name: string;
  description: string;
  promptHint: string;
  tag: string;
}

const CATALOG_PLUGINS: PluginEntry[] = [
  {
    id: 'linear',
    name: 'Linear',
    description: 'Plan and build products: create, search, and update issues & sprints.',
    category: 'Productivity',
    badges: ['MCP', 'SKILL'],
    accent: '#5E6AD2',
    iconKey: 'layers',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Search, read, and write your Notion docs, specs, and databases.',
    category: 'Productivity',
    badges: ['MCP', 'SKILL'],
    accent: '#ECEAE6',
    iconKey: 'file',
  },
  {
    id: 'granola',
    name: 'Granola',
    description: 'Recall what was said in your meetings and turn notes into tasks.',
    category: 'Productivity',
    badges: ['MCP', 'SKILL'],
    accent: '#7EC850',
    iconKey: 'mic',
  },
  {
    id: 'circleback',
    name: 'Circleback',
    description: 'Meeting notes, action items, and transcripts synced to your agent.',
    category: 'Productivity',
    badges: ['MCP', 'SKILL'],
    accent: '#F97316',
    iconKey: 'compass',
  },
  {
    id: 'ynab',
    name: 'YNAB',
    description: 'Track money in YNAB: accounts, categories, and budget automation.',
    category: 'Productivity',
    badges: ['MCP', 'SKILL'],
    accent: '#3B82F6',
    iconKey: 'wallet',
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    description: 'Read and manage your Google Calendar events and availability.',
    category: 'Productivity',
    badges: ['MCP', 'SKILL'],
    accent: '#34A853',
    iconKey: 'calendar',
  },
  {
    id: 'wispr-flow',
    name: 'Wispr Flow',
    description: 'Recall your voice dictations and capture notes inside workflows.',
    category: 'Productivity',
    badges: ['MCP'],
    accent: '#D6D3CD',
    iconKey: 'mic',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Search, read, and post across your team channels and threads.',
    category: 'Communication',
    badges: ['MCP', 'SKILL'],
    accent: '#E01E5A',
    iconKey: 'message',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, search, send, and organize email threads autonomously.',
    category: 'Communication',
    badges: ['MCP', 'SKILL'],
    accent: '#EA4335',
    iconKey: 'mail',
  },
  {
    id: 'superhuman',
    name: 'Superhuman',
    description: 'Work your inbox from Harpy with fast triage and draft replies.',
    category: 'Communication',
    badges: ['MCP', 'SKILL'],
    accent: '#8B5CF6',
    iconKey: 'mail',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Inspect pull requests, review diffs, manage issues, and push commits.',
    category: 'Developer',
    badges: ['MCP', 'SKILL'],
    accent: '#ECEAE6',
    iconKey: 'github',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Inspect design frames, tokens, and generate matching UI code.',
    category: 'Developer',
    badges: ['MCP', 'SKILL'],
    accent: '#A259FF',
    iconKey: 'figma',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Debug production stack traces and surface failing release regressions.',
    category: 'Developer',
    badges: ['MCP'],
    accent: '#FB4226',
    iconKey: 'shield',
  },
];

const BUILTIN_SKILLS: SkillEntry[] = [
  {
    id: 'skill-explore-plan',
    name: 'Read-Only Plan & Architecture',
    description: 'Explore repository files, detect stack accurately, and formulate an interactive checklist before editing.',
    promptHint: 'Create a detailed implementation plan before making any code edits.',
    tag: 'Core Agent',
  },
  {
    id: 'skill-surgical-edit',
    name: 'Surgical Code Editor',
    description: 'Read existing files first, perform targeted hunk edits, and guarantee existing files are never overwritten.',
    promptHint: 'Inspect existing files first and apply surgical edits preserving existing functionality.',
    tag: 'Code Integrity',
  },
  {
    id: 'skill-verify-build',
    name: 'Syntax & Build Verifier',
    description: 'Run JSON/CSS/HTML/JS validation and project test/build checks before finishing a workspace task.',
    promptHint: 'Verify syntax, build, and tests before completing.',
    tag: 'Verification',
  },
  {
    id: 'skill-github-pr',
    name: 'GitHub PR & Branch Workflow',
    description: 'Inspect uncommitted diffs, create clean commits, and review open pull requests.',
    promptHint: 'Review my current git diff, commit changes cleanly, and prepare for GitHub push.',
    tag: 'Version Control',
  },
];

function renderPluginIcon(key: string, accent: string) {
  const cls = 'w-4 h-4';
  switch (key) {
    case 'layers':
      return <Layers className={cls} style={{ color: accent }} />;
    case 'file':
      return <FileText className={cls} style={{ color: accent }} />;
    case 'mic':
      return <Mic className={cls} style={{ color: accent }} />;
    case 'compass':
      return <Compass className={cls} style={{ color: accent }} />;
    case 'wallet':
      return <Wallet className={cls} style={{ color: accent }} />;
    case 'calendar':
      return <Calendar className={cls} style={{ color: accent }} />;
    case 'message':
      return <MessageSquare className={cls} style={{ color: accent }} />;
    case 'mail':
      return <Mail className={cls} style={{ color: accent }} />;
    case 'github':
      return <Github className={cls} style={{ color: accent }} />;
    case 'figma':
      return <Figma className={cls} style={{ color: accent }} />;
    case 'shield':
      return <ShieldAlert className={cls} style={{ color: accent }} />;
    default:
      return <Terminal className={cls} style={{ color: accent }} />;
  }
}

interface PluginsViewProps {
  onRunSkillPrompt?: (prompt: string) => void;
  isLight?: boolean;
}

export default function PluginsView({ onRunSkillPrompt, isLight = false }: PluginsViewProps) {
  const [subTab, setSubTab] = useState<'plugins' | 'skills'>('plugins');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedIds, setInstalledIds] = useState<string[]>(['github']);
  const [orgRepos, setOrgRepos] = useState<string[]>([]);
  const [addingRepo, setAddingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [managingOrg, setManagingOrg] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('harpy_installed_plugins');
      if (saved) setInstalledIds(JSON.parse(saved));
      const savedRepos = localStorage.getItem('harpy_org_plugin_repos');
      if (savedRepos) setOrgRepos(JSON.parse(savedRepos));
    } catch {}
  }, []);

  const toggleInstall = (id: string) => {
    setInstalledIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('harpy_installed_plugins', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAddOrgRepo = () => {
    const clean = repoInput.trim();
    if (!clean) return;
    setOrgRepos((prev) => {
      const next = prev.includes(clean) ? prev : [...prev, clean];
      try {
        localStorage.setItem('harpy_org_plugin_repos', JSON.stringify(next));
      } catch {}
      return next;
    });
    setRepoInput('');
    setAddingRepo(false);
  };

  const removeOrgRepo = (repo: string) => {
    setOrgRepos((prev) => {
      const next = prev.filter((r) => r !== repo);
      try {
        localStorage.setItem('harpy_org_plugin_repos', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredPlugins = CATALOG_PLUGINS.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  const filteredSkills = BUILTIN_SKILLS.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const categories: Array<'Productivity' | 'Communication' | 'Developer'> = [
    'Productivity',
    'Communication',
    'Developer',
  ];

  return (
    <div
      className={`flex-1 h-full overflow-y-auto font-sans ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#13110F] text-[#ECEAE6]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Top Centered Pill Switcher */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#1A1816] border-[#2A2622]'
            }`}
          >
            <button
              type="button"
              onClick={() => setSubTab('plugins')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subTab === 'plugins'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-[#282420] text-[#ECEAE6] shadow-sm'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-[#8E8880] hover:text-[#ECEAE6]'
              }`}
            >
              Plugins
            </button>
            <button
              type="button"
              onClick={() => setSubTab('skills')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subTab === 'skills'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-[#282420] text-[#ECEAE6] shadow-sm'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-[#8E8880] hover:text-[#ECEAE6]'
              }`}
            >
              Skills
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {subTab === 'plugins' ? 'Plugins' : 'Skills'}
          </h1>
          <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
            {subTab === 'plugins'
              ? 'Work with your agents across your favorite tools'
              : 'Reusable autonomous agent capabilities active inside your workspace'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-[#78726B]'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={subTab === 'plugins' ? 'Search plugins' : 'Search skills'}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
                : 'bg-[#191715] border-[#2A2622] text-[#ECEAE6] placeholder-[#78726B] focus:border-[#4A443E]'
            }`}
          />
        </div>

        {subTab === 'plugins' ? (
          <>
            {/* Your Organization Box */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wide text-[#ECEAE6]">Your organization</h2>
                <button
                  type="button"
                  onClick={() => setManagingOrg(!managingOrg)}
                  className={`text-xs transition-colors ${
                    isLight ? 'text-slate-500 hover:text-slate-900' : 'text-[#8E8880] hover:text-[#ECEAE6]'
                  }`}
                >
                  {managingOrg ? 'Done' : 'Manage'}
                </button>
              </div>

              <div
                className={`p-4 rounded-xl border border-dashed flex flex-col gap-3 ${
                  isLight ? 'border-slate-300 bg-slate-50/50' : 'border-[#2E2A25] bg-[#161412]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={`text-xs leading-relaxed max-w-md ${isLight ? 'text-slate-600' : 'text-[#8E8880]'}`}>
                    Give your organization its own plugins from a GitHub repository. You choose who gets each one.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddingRepo(!addingRepo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                      isLight
                        ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                        : 'bg-[#221F1C] border-[#332E29] hover:bg-[#2B2723] text-[#ECEAE6]'
                    }`}
                  >
                    Add repository
                  </button>
                </div>

                {addingRepo && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddOrgRepo();
                      }}
                      placeholder="https://github.com/org/harpy-plugins"
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs border focus:outline-none font-mono ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#12100E] border-[#332E29] text-[#ECEAE6]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddOrgRepo}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#ECEAE6] text-[#141210] hover:bg-white transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}

                {orgRepos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {orgRepos.map((repo) => (
                      <div
                        key={repo}
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono border ${
                          isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#1E1B18] border-[#2E2A25] text-[#D8D3CC]'
                        }`}
                      >
                        <GitBranch className="w-3 h-3 text-[#8E8880]" />
                        <span>{repo}</span>
                        {managingOrg && (
                          <button
                            type="button"
                            onClick={() => removeOrgRepo(repo)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Categorized Plugin Grid */}
            {categories.map((cat) => {
              const items = filteredPlugins.filter((p) => p.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="space-y-3">
                  <h2 className="text-xs font-semibold tracking-wide">{cat}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {items.map((plugin) => {
                      const isInstalled = installedIds.includes(plugin.id);
                      return (
                        <div
                          key={plugin.id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-colors ${
                            isLight ? 'hover:bg-slate-50' : 'hover:bg-[#191715]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#1E1B18] border-[#2C2824]'
                              }`}
                            >
                              {renderPluginIcon(plugin.iconKey, plugin.accent)}
                            </div>

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium">{plugin.name}</span>
                                {plugin.badges.map((b) => (
                                  <span
                                    key={b}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${
                                      isLight
                                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                                        : 'bg-[#1E1B18] border-[#2E2A25] text-[#8E8880]'
                                    }`}
                                  >
                                    {b}
                                  </span>
                                ))}
                              </div>
                              <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-[#8E8880]'}`}>
                                {plugin.description}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleInstall(plugin.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0 inline-flex items-center gap-1 ${
                              isInstalled
                                ? isLight
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-[#212922] border-emerald-700/40 text-emerald-300'
                                : isLight
                                  ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                                  : 'bg-[#1C1A17] border-[#2E2A25] hover:bg-[#272420] text-[#ECEAE6]'
                            }`}
                          >
                            {isInstalled ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Installed</span>
                              </>
                            ) : (
                              <span>Install</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Skills Tab */
          <div className="space-y-3">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    : 'bg-[#181614] border-[#2A2622] hover:border-[#3A3530]'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#E06D44] shrink-0" />
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-600'
                          : 'bg-[#221F1C] border-[#302B26] text-[#9E978F]'
                      }`}
                    >
                      {skill.tag}
                    </span>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-[#8E8880]'}`}>
                    {skill.description}
                  </p>
                </div>

                {onRunSkillPrompt && (
                  <button
                    type="button"
                    onClick={() => onRunSkillPrompt(skill.promptHint)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 inline-flex items-center gap-1 ${
                      isLight
                        ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                        : 'bg-[#221F1C] border-[#332E29] hover:bg-[#2B2723] text-[#ECEAE6]'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Use</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
