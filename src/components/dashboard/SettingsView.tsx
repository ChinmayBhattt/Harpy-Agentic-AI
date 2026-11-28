'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  User,
  Palette,
  Bell,
  BarChart3,
  SlidersHorizontal,
  Keyboard,
  GitBranch,
  Cpu,
  Terminal,
  FileText,
  Key,
  Check,
  Download,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Volume2,
  Sparkles,
  LogOut,
} from 'lucide-react';

export type SettingsSectionId =
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'usage'
  | 'general'
  | 'models'
  | 'keyboard'
  | 'git'
  | 'agent'
  | 'terminal'
  | 'files';

export interface TypographyConfig {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: '400' | '500' | '600';
  ligatures: boolean;
}

export interface HarpyAppSettings {
  themePreference: 'dark' | 'light' | 'system';
  language: 'auto' | 'en';
  markdownStyle: 'default' | 'editorial';
  publicLeaderboard: boolean;
  notificationSounds: boolean;
  notificationVolume: 100 | 75 | 50 | 25 | 0;
  desktopNotifications: boolean;
  confirmBeforeLeaving: boolean;
  showStatusBadge: boolean;
  dictationEnabled: boolean;
  voiceAiEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  autoVerifyFiles: boolean;
  editorWordWrap: boolean;
  showLineNumbers: boolean;
  terminalCursorStyle: 'block' | 'underline' | 'bar';
  terminalCursorBlink: boolean;
  editorTypography: TypographyConfig;
  terminalTypography: TypographyConfig;
}

export const DEFAULT_HARPY_SETTINGS: HarpyAppSettings = {
  themePreference: 'dark',
  language: 'auto',
  markdownStyle: 'default',
  publicLeaderboard: false,
  notificationSounds: true,
  notificationVolume: 100,
  desktopNotifications: false,
  confirmBeforeLeaving: true,
  showStatusBadge: true,
  dictationEnabled: true,
  voiceAiEnabled: true,
  keyboardShortcutsEnabled: true,
  autoVerifyFiles: true,
  editorWordWrap: true,
  showLineNumbers: true,
  terminalCursorStyle: 'block',
  terminalCursorBlink: true,
  editorTypography: {
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 1.5,
    letterSpacing: 0,
    fontWeight: '400',
    ligatures: true,
  },
  terminalTypography: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    lineHeight: 1.4,
    letterSpacing: 0,
    fontWeight: '400',
    ligatures: true,
  },
};

export function playHarpyCompletionSound(volumePercent: number) {
  if (typeof window === 'undefined' || volumePercent <= 0) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    const vol = Math.min(Math.max(volumePercent / 100, 0), 1) * 0.18;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.09); // A5
    osc1.connect(gain);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.36);
  } catch {}
}

interface ModelItem {
  id: string;
  name: string;
  speed: string;
}

interface SettingsViewProps {
  initialSection?: SettingsSectionId;
  settings: HarpyAppSettings;
  onUpdateSettings: (patch: Partial<HarpyAppSettings>) => void;
  onBack: () => void;
  // Theme & Models
  theme: 'dark' | 'light';
  onSelectThemePreference: (pref: 'dark' | 'light' | 'system') => void;
  apiKey: string;
  tempKeyInput: string;
  onChangeTempKeyInput: (val: string) => void;
  onSaveKey: () => void;
  onResetToDefaultKey: () => void;
  isValidatingKey: boolean;
  keyError: string | null;
  isCustomKey: boolean;
  providerName: string;
  providerColor: string;
  selectedModelId: string;
  selectedModelName: string;
  modelsList: ModelItem[];
  onSelectModel: (id: string, name: string) => void;
  // Execution & Git
  agentExecutionMode: 'execute' | 'plan';
  onChangeAgentExecutionMode: (mode: 'execute' | 'plan') => void;
  worktreeMode: 'Worktree' | 'Sandbox';
  onChangeWorktreeMode: (mode: 'Worktree' | 'Sandbox') => void;
  activeBranch: string;
  branches: string[];
  onChangeBranch: (branch: string) => void;
  deviceTarget: 'This device' | 'Cloud';
  onChangeDeviceTarget: (target: 'This device' | 'Cloud') => void;
  // Profile & Data
  authUser: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  } | null;
  displayNameInput: string;
  onChangeDisplayNameInput: (val: string) => void;
  onSaveProfile: () => void;
  isSavingProfile: boolean;
  onSignOut: () => void;
  sessionsCount: number;
  projectsCount: number;
  totalMessagesCount: number;
  totalFilesChangedCount: number;
  onClearAllChatHistory: () => void;
  onResetAllData: () => void;
}

const FONT_STACKS: Record<string, string> = {
  Menlo: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  'JetBrains Mono': '"JetBrains Mono", Menlo, Consolas, monospace',
  'Fira Code': '"Fira Code", Menlo, Consolas, monospace',
  'ui-monospace': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
        checked ? 'bg-[#ECEAE6]' : 'bg-[#2C2824] border border-[#3E3934]'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full transition-transform ${
          checked ? 'translate-x-4 bg-[#141210]' : 'translate-x-0 bg-[#8E8880]'
        }`}
      />
    </button>
  );
}

export default function SettingsView({
  initialSection = 'account',
  settings,
  onUpdateSettings,
  onBack,
  onSelectThemePreference,
  tempKeyInput,
  onChangeTempKeyInput,
  onSaveKey,
  onResetToDefaultKey,
  isValidatingKey,
  keyError,
  isCustomKey,
  providerName,
  providerColor,
  selectedModelId,
  selectedModelName,
  modelsList,
  onSelectModel,
  agentExecutionMode,
  onChangeAgentExecutionMode,
  worktreeMode,
  onChangeWorktreeMode,
  activeBranch,
  branches,
  onChangeBranch,
  deviceTarget,
  onChangeDeviceTarget,
  authUser,
  displayNameInput,
  onChangeDisplayNameInput,
  onSaveProfile,
  isSavingProfile,
  onSignOut,
  sessionsCount,
  projectsCount,
  totalMessagesCount,
  totalFilesChangedCount,
  onClearAllChatHistory,
  onResetAllData,
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const navGroups: Array<{
    group: string;
    items: Array<{ id: SettingsSectionId; label: string; icon: React.ReactNode; keywords: string }>;
  }> = useMemo(
    () => [
      {
        group: 'PERSONAL',
        items: [
          { id: 'account', label: 'Account', icon: <User className="w-4 h-4" />, keywords: 'profile avatar name email sign out delete history account' },
          { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" />, keywords: 'theme dark light font typography editor terminal markdown language' },
          { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, keywords: 'sound chime volume desktop alerts notifications' },
          { id: 'usage', label: 'Usage', icon: <BarChart3 className="w-4 h-4" />, keywords: 'metrics stats workspaces sessions files models tokens' },
        ],
      },
      {
        group: 'EDITOR & WORKFLOW',
        items: [
          { id: 'general', label: 'General', icon: <SlidersHorizontal className="w-4 h-4" />, keywords: 'confirm quit dictation microphone voice status badge execution' },
          { id: 'models', label: 'API Keys & Models', icon: <Key className="w-4 h-4" />, keywords: 'groq openai anthropic key model inference gpt llama qwen' },
          { id: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-4 h-4" />, keywords: 'shortcuts hotkeys cmd ctrl' },
          { id: 'git', label: 'Git & Worktrees', icon: <GitBranch className="w-4 h-4" />, keywords: 'branch worktree sandbox isolation repository' },
          { id: 'agent', label: 'Agent & Safeguards', icon: <Cpu className="w-4 h-4" />, keywords: 'plan execute verification file preservation agent' },
          { id: 'terminal', label: 'Terminal', icon: <Terminal className="w-4 h-4" />, keywords: 'cursor blink shell font monospace terminal' },
          { id: 'files', label: 'Files & Editor', icon: <FileText className="w-4 h-4" />, keywords: 'word wrap line numbers diff code delete history' },
        ],
      },
    ],
    []
  );

  const filteredNavGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.keywords.includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, searchQuery]);

  const handleDownloadPreset = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harpy-appearance-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (parsed && typeof parsed === 'object') {
          onUpdateSettings({
            ...parsed,
            editorTypography: { ...settings.editorTypography, ...(parsed.editorTypography || {}) },
            terminalTypography: { ...settings.terminalTypography, ...(parsed.terminalTypography || {}) },
          });
          if (parsed.themePreference) {
            onSelectThemePreference(parsed.themePreference);
          }
          setImportStatus('Imported preset successfully.');
          setTimeout(() => setImportStatus(null), 2500);
        }
      } catch {
        setImportStatus('Invalid JSON settings file.');
        setTimeout(() => setImportStatus(null), 2500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderTypographyPanel = (kind: 'editor' | 'terminal') => {
    const isEditor = kind === 'editor';
    const cfg = isEditor ? settings.editorTypography : settings.terminalTypography;
    const updateCfg = (patch: Partial<TypographyConfig>) => {
      onUpdateSettings(
        isEditor
          ? { editorTypography: { ...cfg, ...patch } }
          : { terminalTypography: { ...cfg, ...patch } }
      );
    };
    const fontCss = FONT_STACKS[cfg.fontFamily] || FONT_STACKS.Menlo;

    return (
      <div className="rounded-xl border border-[#282420] bg-[#181614] p-4 space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-medium text-[#ECEAE6]">
            {isEditor ? <span className="font-mono text-xs text-[#8E8880]">&lt;/&gt;</span> : <Terminal className="w-4 h-4 text-[#8E8880]" />}
            <span>{isEditor ? 'Editor typography' : 'Terminal typography'}</span>
          </div>
          <p className="text-xs text-[#8E8880]">
            {isEditor
              ? 'Typography used in code blocks, workspace preview, and diff views.'
              : 'Typography and cursor behavior used in terminal panels and previews.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#D8D3CC]">Font family</label>
            <select
              value={cfg.fontFamily}
              onChange={(e) => updateCfg({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
            >
              <option value="Menlo">Menlo</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Fira Code">Fira Code</option>
              <option value="ui-monospace">System Monospace</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#D8D3CC]">Font size (px)</label>
            <input
              type="number"
              min={11}
              max={20}
              value={cfg.fontSize}
              onChange={(e) => updateCfg({ fontSize: Math.min(20, Math.max(11, Number(e.target.value) || 13)) })}
              className="w-full px-3 py-2 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#D8D3CC]">Line height</label>
            <input
              type="number"
              step={0.1}
              min={1}
              max={2.2}
              value={cfg.lineHeight}
              onChange={(e) => updateCfg({ lineHeight: Math.min(2.2, Math.max(1, Number(e.target.value) || 1.4)) })}
              className="w-full px-3 py-2 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#D8D3CC]">Letter spacing (px)</label>
            <input
              type="number"
              step={0.5}
              min={-1}
              max={3}
              value={cfg.letterSpacing}
              onChange={(e) => updateCfg({ letterSpacing: Math.min(3, Math.max(-1, Number(e.target.value) || 0)) })}
              className="w-full px-3 py-2 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#D8D3CC]">Font weight</label>
            <select
              value={cfg.fontWeight}
              onChange={(e) => updateCfg({ fontWeight: e.target.value as '400' | '500' | '600' })}
              className="w-full px-3 py-2 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
            >
              <option value="400">400 (Regular)</option>
              <option value="500">500 (Medium)</option>
              <option value="600">600 (Semibold)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-xs font-medium text-[#ECEAE6]">Ligatures</div>
              <div className="text-[11px] text-[#78726B]">Combine sequences like =&gt; and !==</div>
            </div>
            <ToggleSwitch
              checked={cfg.ligatures}
              onChange={(ligatures) => updateCfg({ ligatures })}
              label="Toggle font ligatures"
            />
          </div>
        </div>

        {!isEditor && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#25221E]">
            <div className="space-y-1">
              <label className="text-xs text-[#D8D3CC]">Cursor style</label>
              <select
                value={settings.terminalCursorStyle}
                onChange={(e) =>
                  onUpdateSettings({
                    terminalCursorStyle: e.target.value as 'block' | 'underline' | 'bar',
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
              >
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div>
                <div className="text-xs font-medium text-[#ECEAE6]">Cursor blinking</div>
                <div className="text-[11px] text-[#78726B]">Animate the terminal cursor</div>
              </div>
              <ToggleSwitch
                checked={settings.terminalCursorBlink}
                onChange={(terminalCursorBlink) => onUpdateSettings({ terminalCursorBlink })}
                label="Toggle cursor blinking"
              />
            </div>
          </div>
        )}

        {/* Live Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#78726B]">
            <span>Live preview</span>
            <span>
              {cfg.fontSize}px · {cfg.lineHeight} line height
            </span>
          </div>
          <div className="rounded-xl border border-[#2A2622] bg-[#13110F] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[#25221E] flex items-center justify-between text-[11px] text-[#8E8880]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>{isEditor ? 'settings.ts' : 'Terminal'}</span>
              </span>
              <span>{isEditor ? 'TypeScript' : 'zsh'}</span>
            </div>
            <pre
              className="p-3 overflow-x-auto text-[#D8D3CC] select-text"
              style={{
                fontFamily: fontCss,
                fontSize: `${cfg.fontSize}px`,
                lineHeight: cfg.lineHeight,
                letterSpacing: `${cfg.letterSpacing}px`,
                fontWeight: Number(cfg.fontWeight),
                fontVariantLigatures: cfg.ligatures ? 'normal' : 'none',
              }}
            >
              {isEditor ? (
                <code>
                  <span className="text-[#6A645D]">{'// Strings, numbers, booleans & symbols\n'}</span>
                  <span className="text-purple-400">type </span>
                  <span className="text-amber-300">Result</span>
                  {'<T> = { value: T; cached: '}
                  <span className="text-sky-400">boolean</span>
                  {' };\n'}
                  <span className="text-purple-400">const </span>
                  {'ready = active.length >= '}
                  <span className="text-amber-300">3</span>
                  {' && enabled !== '}
                  <span className="text-sky-400">false</span>
                  {';\n'}
                  <span className="text-purple-400">const </span>
                  {'label = ready ? '}
                  <span className="text-emerald-400">{'"Ready ->"'}</span>
                  {' : '}
                  <span className="text-emerald-400">{'"Waiting..."'}</span>
                  {';\n'}
                  <span className="text-[#6A645D]">{'// => === !== >= <= ??'}</span>
                </code>
              ) : (
                <code>
                  <span className="text-[#8E8880]">{'~/agent $ '}</span>
                  {'harpy run --verify\n'}
                  <span className="text-emerald-400">{'✓ Baseline verified · 0 regressions\n'}</span>
                  <span className="text-[#8E8880]">{'~/agent $ '}</span>
                  {'git status --short\n'}
                  <span className="text-sky-400">{'M src/app/dashbord/page.tsx\n'}</span>
                  <span className="text-[#8E8880]">{'~/agent $ '}</span>
                  <span
                    className={`inline-block align-middle bg-[#ECEAE6] ${
                      settings.terminalCursorBlink ? 'animate-pulse' : ''
                    } ${
                      settings.terminalCursorStyle === 'block'
                        ? 'w-2 h-3.5'
                        : settings.terminalCursorStyle === 'underline'
                          ? 'w-2.5 h-0.5 translate-y-1.5'
                          : 'w-0.5 h-3.5'
                    }`}
                  />
                </code>
              )}
            </pre>
            <div className="px-3 py-1 border-t border-[#211E1B] flex items-center justify-between text-[10px] text-[#6A645D] font-mono">
              <span className="truncate">{cfg.fontFamily}</span>
              <span>
                {cfg.fontWeight} · Ligatures {cfg.ligatures ? 'on' : 'off'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteHistoryCard = () => (
    <div className="rounded-xl border border-rose-500/25 bg-rose-950/15 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-medium text-rose-300">Delete chat history</span>
        </div>
        <span className="text-[11px] font-mono text-rose-300/80 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
          {sessionsCount} saved
        </span>
      </div>
      <p className="text-xs text-[#9E978F]">
        Permanently delete all stored conversation transcripts and local workspaces from this browser.
      </p>
      {!confirmClearHistory ? (
        <button
          type="button"
          onClick={() => setConfirmClearHistory(true)}
          className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
        >
          Delete chat history
        </button>
      ) : (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Erase all {sessionsCount} saved sessions permanently?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClearAllChatHistory();
                setConfirmClearHistory(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Yes, delete all
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearHistory(false)}
              className="px-3 py-1.5 rounded-lg bg-[#24211E] text-[#D8D3CC] text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#13110F] text-[#ECEAE6] font-sans">
      {/* Left Settings Navigation Sidebar */}
      <aside className="w-60 sm:w-64 border-r border-[#25221E] bg-[#161412] flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 space-y-3 border-b border-[#25221E]">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-[#9E978F] hover:text-[#ECEAE6] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <h2 className="text-lg font-semibold tracking-tight text-[#ECEAE6]">Settings</h2>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#78726B] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredNavGroups[0]?.items[0]) {
                  setActiveSection(filteredNavGroups[0].items[0].id);
                }
              }}
              placeholder="Search settings..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#1D1B18] border border-[#2C2824] text-xs text-[#ECEAE6] placeholder-[#78726B] focus:outline-none focus:border-[#4A443E]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {filteredNavGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#78726B]">
                {group.group}
              </div>
              {group.items.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      active
                        ? 'bg-[#282420] text-[#ECEAE6] font-medium'
                        : 'text-[#9E978F] hover:text-[#ECEAE6] hover:bg-[#1E1B18]'
                    }`}
                  >
                    <span className={active ? 'text-[#ECEAE6]' : 'text-[#78726B]'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Settings Content Stage */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8">
        <div className="max-w-2xl mx-auto space-y-6 pb-16">
          {activeSection === 'account' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Account</h1>
                <p className="text-xs text-[#8E8880]">Manage your profile, sign-in session, and stored workspace history.</p>
              </div>

              <div className="divide-y divide-[#25221E] border-y border-[#25221E]">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Avatar</div>
                    <div className="text-xs text-[#78726B]">Recommended size 256×256</div>
                  </div>
                  {authUser?.avatarUrl ? (
                    <img
                      src={authUser.avatarUrl}
                      alt={authUser.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-[#332E29]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#24211E] border border-[#332E29] flex items-center justify-center text-sm font-semibold">
                      {(authUser?.fullName || 'H').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-sm font-medium">Name</label>
                  <div className="flex items-center gap-2 sm:w-80">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => onChangeDisplayNameInput(e.target.value)}
                      placeholder="Your name"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2C2824] text-xs text-[#ECEAE6] focus:outline-none focus:border-[#4A443E]"
                    />
                    <button
                      type="button"
                      onClick={onSaveProfile}
                      disabled={isSavingProfile || !authUser}
                      className="px-3 py-1.5 rounded-lg bg-[#262320] hover:bg-[#302B26] text-xs font-medium text-[#ECEAE6] disabled:opacity-40"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="text"
                    readOnly
                    value={authUser?.email || 'Guest mode (not signed in)'}
                    className="sm:w-80 px-3 py-1.5 rounded-lg bg-[#161412] border border-[#25221E] text-xs text-[#8E8880] focus:outline-none"
                  />
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Sign out of this device</div>
                    <div className="text-xs text-[#78726B]">You&apos;ll need to sign in again to sync cloud profile settings.</div>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B1917] hover:bg-[#262320] border border-[#2E2A25] text-xs text-[#D8D3CC]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Anonymous usage stats</div>
                    <div className="text-xs text-[#78726B]">Share model counts locally only; zero prompts or code ever leave your workspace.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.publicLeaderboard}
                    onChange={(publicLeaderboard) => onUpdateSettings({ publicLeaderboard })}
                    label="Toggle anonymous usage stats"
                  />
                </div>
              </div>

              {renderDeleteHistoryCard()}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm font-medium">Reset all local settings</div>
                  <div className="text-xs text-[#78726B]">Clears local preferences, projects, saved views, and chat history.</div>
                </div>
                {!confirmResetAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors"
                  >
                    Reset all data
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetAllData();
                        setConfirmResetAll(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                    >
                      Confirm reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetAll(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#24211E] text-xs text-[#D8D3CC]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === 'appearance' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Appearance</h1>
                <p className="text-xs text-[#8E8880]">Customize how Harpy AI looks on your device.</p>
              </div>

              <div className="rounded-xl border border-[#282420] bg-[#181614] divide-y divide-[#25221E]">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Theme</div>
                    <div className="text-xs text-[#78726B]">Pick a theme or follow your system appearance.</div>
                  </div>
                  <select
                    value={settings.themePreference}
                    onChange={(e) => onSelectThemePreference(e.target.value as 'dark' | 'light' | 'system')}
                    className="px-3 py-1.5 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="dark">Dark Charcoal</option>
                    <option value="light">Light Slate</option>
                    <option value="system">Auto (system)</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Custom presets</div>
                    <div className="text-xs text-[#78726B]">
                      {importStatus || 'Export your current appearance settings JSON or import a saved file.'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImportPreset}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleDownloadPreset}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#221F1C] hover:bg-[#2A2622] border border-[#302B26] text-xs text-[#ECEAE6]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download starter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#221F1C] hover:bg-[#2A2622] border border-[#302B26] text-xs text-[#ECEAE6]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Language</div>
                    <div className="text-xs text-[#78726B]">App display language.</div>
                  </div>
                  <select
                    value={settings.language}
                    onChange={(e) => onUpdateSettings({ language: e.target.value as 'auto' | 'en' })}
                    className="px-3 py-1.5 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="auto">Auto (system)</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Markdown style</div>
                    <div className="text-xs text-[#78726B]">Rendering style for chat responses &amp; markdown views.</div>
                  </div>
                  <select
                    value={settings.markdownStyle}
                    onChange={(e) => onUpdateSettings({ markdownStyle: e.target.value as 'default' | 'editorial' })}
                    className="px-3 py-1.5 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="default">Default Sans</option>
                    <option value="editorial">Editorial (Serif)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="text-sm font-semibold">Typography</h2>
                <p className="text-xs text-[#8E8880]">Changes apply immediately in the live previews and workspace editors.</p>
                {renderTypographyPanel('editor')}
                {renderTypographyPanel('terminal')}
              </div>
            </>
          )}

          {activeSection === 'notifications' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Notifications</h1>
                <p className="text-xs text-[#8E8880]">Sounds and alerts when autonomous agent tasks finish.</p>
              </div>

              <div className="divide-y divide-[#25221E] border-y border-[#25221E]">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Notification sounds</div>
                    <div className="text-xs text-[#78726B]">Play a gentle chime when agent runs complete.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.notificationSounds}
                    onChange={(notificationSounds) => onUpdateSettings({ notificationSounds })}
                    label="Toggle notification sounds"
                  />
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Volume</div>
                    <div className="text-xs text-[#78726B]">Adjust completion chime output level.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={settings.notificationVolume}
                      onChange={(e) =>
                        onUpdateSettings({
                          notificationVolume: Number(e.target.value) as HarpyAppSettings['notificationVolume'],
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                    >
                      <option value={100}>Maximum (100%)</option>
                      <option value={75}>High (75%)</option>
                      <option value={50}>Medium (50%)</option>
                      <option value={25}>Low (25%)</option>
                      <option value={0}>Muted (0%)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => playHarpyCompletionSound(settings.notificationVolume || 75)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#221F1C] hover:bg-[#2A2622] border border-[#302B26] text-xs text-[#ECEAE6]"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Test</span>
                    </button>
                  </div>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Desktop notifications</div>
                    <div className="text-xs text-[#78726B]">Show a browser notification when a run finishes in the background.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.desktopNotifications}
                    onChange={async (next) => {
                      if (next && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        await Notification.requestPermission().catch(() => {});
                      }
                      onUpdateSettings({ desktopNotifications: next });
                    }}
                    label="Toggle desktop notifications"
                  />
                </div>
              </div>
            </>
          )}

          {activeSection === 'usage' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Usage</h1>
                <p className="text-xs text-[#8E8880]">Real-time telemetry from your active local workspaces and models.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Workspaces', value: sessionsCount },
                  { label: 'Projects', value: projectsCount },
                  { label: 'Messages', value: totalMessagesCount },
                  { label: 'Files Changed', value: totalFilesChangedCount },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-[#282420] bg-[#181614] p-4 space-y-1">
                    <div className="text-[11px] text-[#8E8880]">{stat.label}</div>
                    <div className="text-2xl font-semibold text-[#ECEAE6] font-mono">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#282420] bg-[#181614] p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-[#ECEAE6]">Active Inference Engine</div>
                  <div className="text-xs text-[#8E8880] font-mono">
                    {isCustomKey ? providerName : 'Groq Cloud (Default)'} · {selectedModelName} ({selectedModelId})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('models')}
                  className="px-3 py-1.5 rounded-lg bg-[#24211E] hover:bg-[#2E2A25] text-xs text-[#ECEAE6]"
                >
                  Change Model
                </button>
              </div>

              {renderDeleteHistoryCard()}
            </>
          )}

          {activeSection === 'general' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">General</h1>
                <p className="text-xs text-[#8E8880]">Configure general app preferences and composer tools.</p>
              </div>

              <div className="divide-y divide-[#25221E] border-y border-[#25221E]">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Confirm before leaving active run</div>
                    <div className="text-xs text-[#78726B]">Warn before closing the browser tab while the agent is executing.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.confirmBeforeLeaving}
                    onChange={(confirmBeforeLeaving) => onUpdateSettings({ confirmBeforeLeaving })}
                    label="Toggle confirm before leaving"
                  />
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Default execution mode</div>
                    <div className="text-xs text-[#78726B]">Choose whether runs start in Full access or Plan mode.</div>
                  </div>
                  <select
                    value={agentExecutionMode}
                    onChange={(e) => onChangeAgentExecutionMode(e.target.value as 'execute' | 'plan')}
                    className="px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="execute">Full access (Execute)</option>
                    <option value="plan">Plan mode</option>
                  </select>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Execution target</div>
                    <div className="text-xs text-[#78726B]">Default target environment shown in composer bar.</div>
                  </div>
                  <select
                    value={deviceTarget}
                    onChange={(e) => onChangeDeviceTarget(e.target.value as 'This device' | 'Cloud')}
                    className="px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="This device">This device</option>
                    <option value="Cloud">Cloud</option>
                  </select>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Resource &amp; status indicator</div>
                    <div className="text-xs text-[#78726B]">Show active model and branch badge in the top bar.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.showStatusBadge}
                    onChange={(showStatusBadge) => onUpdateSettings({ showStatusBadge })}
                    label="Toggle status indicator"
                  />
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Dictation</div>
                    <div className="text-xs text-[#78726B]">Show the microphone button in the chat composer for speech-to-text.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.dictationEnabled}
                    onChange={(dictationEnabled) => onUpdateSettings({ dictationEnabled })}
                    label="Toggle dictation microphone"
                  />
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Voice AI Assistant</div>
                    <div className="text-xs text-[#78726B]">Show the live Voice AI trigger inside the chat composer.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.voiceAiEnabled}
                    onChange={(voiceAiEnabled) => onUpdateSettings({ voiceAiEnabled })}
                    label="Toggle Voice AI button"
                  />
                </div>
              </div>
            </>
          )}

          {activeSection === 'models' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">API Keys &amp; Models</h1>
                <p className="text-xs text-[#8E8880]">Connect your provider key and pick your default coding model.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#181614] border border-[#282420] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: providerColor }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#ECEAE6]">
                        {isCustomKey ? providerName : 'Groq Cloud (System Default)'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        {isCustomKey ? 'CUSTOM KEY' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#8E8880] mt-0.5">Active: {selectedModelName}</div>
                  </div>
                </div>
                {isCustomKey && (
                  <button
                    type="button"
                    onClick={onResetToDefaultKey}
                    className="px-2.5 py-1 rounded-lg bg-[#24211E] hover:bg-rose-500/20 text-xs text-[#D8D3CC] hover:text-rose-300"
                  >
                    Reset to default
                  </button>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#181614] border border-[#282420] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#ECEAE6]">Custom API Key (Optional)</span>
                  <span className="text-[11px] font-mono text-[#78726B]">Groq · OpenAI · Anthropic</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeySecret ? 'text' : 'password'}
                      value={tempKeyInput}
                      onChange={(e) => onChangeTempKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveKey();
                      }}
                      placeholder="Paste API key (gsk_..., sk-..., sk-ant-...)"
                      className="w-full py-2 pl-3 pr-9 rounded-lg bg-[#13110F] border border-[#2E2A25] text-xs font-mono text-[#ECEAE6] placeholder-[#666059] focus:outline-none focus:border-[#4A443E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeySecret(!showKeySecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78726B] hover:text-[#ECEAE6]"
                    >
                      {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onSaveKey}
                    disabled={isValidatingKey || !tempKeyInput.trim()}
                    className="px-4 py-2 rounded-lg bg-[#ECEAE6] text-[#141210] text-xs font-semibold hover:bg-white disabled:opacity-40"
                  >
                    {isValidatingKey ? 'Checking...' : 'Connect'}
                  </button>
                </div>
                {keyError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{keyError}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#ECEAE6]">
                  Available Models ({modelsList.length})
                </div>
                <div className="space-y-1.5">
                  {modelsList.map((m) => {
                    const selected = selectedModelId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectModel(m.id, m.name)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                          selected
                            ? 'bg-[#262320] border-[#4A443E] text-[#ECEAE6]'
                            : 'bg-[#181614] border-[#282420] text-[#A8A199] hover:border-[#3A3530]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#ECEAE6]">{m.name}</span>
                            {m.id.includes('120b') && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#E06D44]/15 text-[#E06D44] border border-[#E06D44]/30">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-[#78726B] mt-0.5">
                            <span className="text-emerald-400">{m.speed}</span> · {m.id}
                          </div>
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-[#ECEAE6] text-[#141210] flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeSection === 'keyboard' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Keyboard</h1>
                <p className="text-xs text-[#8E8880]">Global keyboard shortcuts available across Harpy AI.</p>
              </div>

              <div className="py-4 flex items-center justify-between border-y border-[#25221E]">
                <div>
                  <div className="text-sm font-medium">Enable global keyboard shortcuts</div>
                  <div className="text-xs text-[#78726B]">Toggle sidebar, workspaces, and settings from anywhere.</div>
                </div>
                <ToggleSwitch
                  checked={settings.keyboardShortcutsEnabled}
                  onChange={(keyboardShortcutsEnabled) => onUpdateSettings({ keyboardShortcutsEnabled })}
                  label="Toggle keyboard shortcuts"
                />
              </div>

              <div className="rounded-xl border border-[#282420] bg-[#181614] divide-y divide-[#25221E]">
                {[
                  { action: 'Toggle left sidebar', keys: '⌘ / Ctrl + B' },
                  { action: 'New workspace', keys: '⌘ / Ctrl + K' },
                  { action: 'Open / close Settings', keys: '⌘ / Ctrl + ,' },
                  { action: 'Close Settings / modals', keys: 'Esc' },
                  { action: 'Submit prompt (in composer)', keys: 'Enter' },
                  { action: 'New line (in composer)', keys: 'Shift + Enter' },
                ].map((item) => (
                  <div key={item.action} className="px-4 py-3 flex items-center justify-between text-xs">
                    <span className="text-[#D8D3CC]">{item.action}</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#13110F] border border-[#2E2A25] font-mono text-[11px] text-[#A8A199]">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'git' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Git &amp; Worktrees</h1>
                <p className="text-xs text-[#8E8880]">Branch and workspace isolation preferences.</p>
              </div>

              <div className="divide-y divide-[#25221E] border-y border-[#25221E]">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Default isolation mode</div>
                    <div className="text-xs text-[#78726B]">Use isolated Worktree or lightweight Sandbox for new workspaces.</div>
                  </div>
                  <select
                    value={worktreeMode}
                    onChange={(e) => onChangeWorktreeMode(e.target.value as 'Worktree' | 'Sandbox')}
                    className="px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="Worktree">Worktree</option>
                    <option value="Sandbox">Sandbox</option>
                  </select>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Active repository branch</div>
                    <div className="text-xs text-[#78726B]">Current branch used by new workspaces and diffs.</div>
                  </div>
                  <select
                    value={activeBranch}
                    onChange={(e) => onChangeBranch(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2E2A25] text-xs font-mono text-[#ECEAE6] focus:outline-none"
                  >
                    {branches.map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {activeSection === 'agent' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Agent &amp; Safeguards</h1>
                <p className="text-xs text-[#8E8880]">Control autonomous execution, verification, and planning rules.</p>
              </div>

              <div className="divide-y divide-[#25221E] border-y border-[#25221E]">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Default mode</div>
                    <div className="text-xs text-[#78726B]">Execute immediately or generate a step-by-step plan first.</div>
                  </div>
                  <select
                    value={agentExecutionMode}
                    onChange={(e) => onChangeAgentExecutionMode(e.target.value as 'execute' | 'plan')}
                    className="px-3 py-1.5 rounded-lg bg-[#181614] border border-[#2E2A25] text-xs text-[#ECEAE6] focus:outline-none"
                  >
                    <option value="execute">Full access (Execute)</option>
                    <option value="plan">Plan mode</option>
                  </select>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Post-run file verification</div>
                    <div className="text-xs text-[#78726B]">Verify file creation, baseline preservation, and surgical edits before finishing.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.autoVerifyFiles}
                    onChange={(autoVerifyFiles) => onUpdateSettings({ autoVerifyFiles })}
                    label="Toggle post-run verification"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#282420] bg-[#181614] p-4 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#E06D44] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-medium text-[#ECEAE6]">Workspace Baseline Protection Active</div>
                  <p className="text-[#8E8880]">
                    Existing workspace files are tracked before every run so creating new files never erases or replaces prior work.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeSection === 'terminal' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Terminal</h1>
                <p className="text-xs text-[#8E8880]">Configure terminal font, cursor style, and live preview.</p>
              </div>
              {renderTypographyPanel('terminal')}
            </>
          )}

          {activeSection === 'files' && (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">Files &amp; Editor</h1>
                <p className="text-xs text-[#8E8880]">Code viewer, diff formatting, and stored chat data preferences.</p>
              </div>

              <div className="divide-y divide-[#25221E] border-y border-[#25221E]">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Word wrap in code viewer</div>
                    <div className="text-xs text-[#78726B]">Wrap long lines in workspace code and markdown blocks.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.editorWordWrap}
                    onChange={(editorWordWrap) => onUpdateSettings({ editorWordWrap })}
                    label="Toggle word wrap"
                  />
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Show line numbers</div>
                    <div className="text-xs text-[#78726B]">Display line numbers in code and diff previews.</div>
                  </div>
                  <ToggleSwitch
                    checked={settings.showLineNumbers}
                    onChange={(showLineNumbers) => onUpdateSettings({ showLineNumbers })}
                    label="Toggle line numbers"
                  />
                </div>
              </div>

              {renderTypographyPanel('editor')}
              {renderDeleteHistoryCard()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
