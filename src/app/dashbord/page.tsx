"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cdn } from "@/lib/cdn";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  Paperclip,
  MessageSquare,
  History,
  Settings,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  X,
  Trash2,
  ArrowRight,
  Copy,
  Check,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Pin,
  PinOff,
  Pencil,
  Share2,
  MoreHorizontal,
  User,
  LogOut,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Square,
  Radio,
  Sun,
  Moon,
  Palette,
  Home,
  LayoutGrid,
  GitBranch,
  GitPullRequest,
  Search,
  SlidersHorizontal,
  Folder,
  FolderPlus,
  ArrowUpDown,
  Monitor,
  Lightbulb,
  ChevronsRight,
  GitFork,
  Brain,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AgentTimeline from "@/components/agent/AgentTimeline";
import DiffModal from "@/components/agent/DiffModal";
import VoiceAssistantModal from "@/components/voice/VoiceAssistantModal";
import WorkspacesView, { WorkspaceSessionSummary } from "@/components/dashboard/WorkspacesView";
import PluginsView from "@/components/dashboard/PluginsView";
import VersionControlView from "@/components/dashboard/VersionControlView";
import SettingsView, {
  DEFAULT_HARPY_SETTINGS,
  HarpyAppSettings,
  SettingsSectionId,
  playHarpyCompletionSound,
} from "@/components/dashboard/SettingsView";
import { AgentRunData, FileChangeRecord, AgentEvent, PlanSpecification } from "@/lib/agent/events";

interface Message {
  id: string;
  sender: "user" | "harpy";
  text: string;
  timestamp: string;
  attachment?: string;
  isError?: boolean;
  isAgent?: boolean;
  agentRun?: AgentRunData;
}

interface UserProject {
  id: string;
  name: string;
  branch?: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  isPinned?: boolean;
  isWorkspace?: boolean;
  projectId?: string;
  branch?: string;
  worktreeMode?: "Worktree" | "Sandbox";
}

interface ModelItem {
  id: string;
  name: string;
  speed: string;
}

interface DetectedEngine {
  provider: "groq" | "openai" | "anthropic";
  providerName: string;
  defaultModelId: string;
  defaultModelName: string;
  color: string;
  models: ModelItem[];
}

function detectEngineFromKey(key: string): DetectedEngine {
  const clean = key.trim();
  if (clean.startsWith("gsk_") || !clean) {
    return {
      provider: "groq",
      providerName: "Groq Cloud",
      defaultModelId: "openai/gpt-oss-120b",
      defaultModelName: "GPT-OSS 120B",
      color: "#F55036",
      models: [
        { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (Best Model)", speed: "High Reasoning (Best)" },
        { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", speed: "High Reasoning" },
        { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B (Fast)", speed: "Fast (300+ tok/s)" },
        { id: "allam-2-7b", name: "ALLAM 2 7B", speed: "Fast" },
        { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", speed: "Ultra-Fast (700+ tok/s)" },
      ],
    };
  }
  if (clean.startsWith("sk-ant-")) {
    return {
      provider: "anthropic",
      providerName: "Anthropic Claude",
      defaultModelId: "claude-3-5-sonnet-20241022",
      defaultModelName: "Claude 3.5 Sonnet",
      color: "#D97706",
      models: [
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", speed: "Deep Reasoning" },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", speed: "Ultra-Fast" },
      ],
    };
  }
  if (clean.startsWith("sk-")) {
    return {
      provider: "openai",
      providerName: "OpenAI",
      defaultModelId: "gpt-4o",
      defaultModelName: "GPT-4o",
      color: "#10A37F",
      models: [
        { id: "gpt-4o", name: "GPT-4o", speed: "Fast" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", speed: "Fast" },
      ],
    };
  }
  return {
    provider: "groq",
    providerName: "Groq Cloud",
    defaultModelId: "openai/gpt-oss-120b",
    defaultModelName: "GPT-OSS 120B",
    color: "#C6A46A",
    models: [
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (Best Model)", speed: "High Reasoning" },
      { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", speed: "Fast" },
    ],
  };
}

const INITIAL_SESSIONS: ChatSession[] = [];

const QUICK_ACTIONS = [
  {
    title: "Set up this project for Harpy",
    prompt: "Analyze this repository structure, verify configuration scripts, and summarize how to run and extend it cleanly.",
  },
  {
    title: "Get more out of Harpy",
    prompt: "Review my current workspace and suggest practical improvements, missing tests, or modular refactors.",
  },
  {
    title: "Improve the agent instructions",
    prompt: "Inspect the codebase and draft concise project guidelines covering architecture, conventions, and verification commands.",
  },
];

interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  createdAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("session-init");
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<"home" | "workspaces" | "plugins" | "git">("home");
  const [viewHistory, setViewHistory] = useState<Array<"home" | "workspaces" | "plugins" | "git">>(["home"]);
  const [viewHistoryIdx, setViewHistoryIdx] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectSortAsc, setProjectSortAsc] = useState(false);
  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const [activeBranch, setActiveBranch] = useState("main");
  const [gitBranches, setGitBranches] = useState<string[]>(["main"]);
  const [worktreeMode, setWorktreeMode] = useState<"Worktree" | "Sandbox">("Worktree");
  const [deviceTarget, setDeviceTarget] = useState<"This device" | "Cloud">("This device");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAccessMenuOpen, setIsAccessMenuOpen] = useState(false);
  const [activeComposerMenu, setActiveComposerMenu] = useState<"workspace" | "worktree" | "branch" | "device" | null>(null);

  const navigateView = (nextView: "home" | "workspaces" | "plugins" | "git") => {
    setActiveView(nextView);
    setViewHistory((prev) => {
      const base = prev.slice(0, viewHistoryIdx + 1);
      if (base[base.length - 1] === nextView) return base;
      const updated = [...base, nextView];
      setViewHistoryIdx(updated.length - 1);
      return updated;
    });
  };

  const navigateBack = () => {
    if (viewHistoryIdx > 0) {
      const nextIdx = viewHistoryIdx - 1;
      setViewHistoryIdx(nextIdx);
      setActiveView(viewHistory[nextIdx]);
    }
  };

  const navigateForward = () => {
    if (viewHistoryIdx < viewHistory.length - 1) {
      const nextIdx = viewHistoryIdx + 1;
      setViewHistoryIdx(nextIdx);
      setActiveView(viewHistory[nextIdx]);
    }
  };

  useEffect(() => {
    fetch("/api/git?state=open")
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.branch) {
          setActiveBranch(data.branch);
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            setGitBranches(data.branches);
          }
        }
      })
      .catch(() => {});
  }, []);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsSectionId>("account");
  const [harpySettings, setHarpySettings] = useState<HarpyAppSettings>(DEFAULT_HARPY_SETTINGS);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isLight = theme === "light";
  const [isExecuting, setIsExecuting] = useState(false);

  const resolveEffectiveTheme = (pref: "dark" | "light" | "system"): "dark" | "light" => {
    if (pref === "system" && typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return pref === "light" ? "light" : "dark";
  };

  const applyTypographyCssVars = (cfg: HarpyAppSettings) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--harpy-editor-font", cfg.editorTypography.fontFamily);
    root.style.setProperty("--harpy-editor-size", `${cfg.editorTypography.fontSize}px`);
    root.style.setProperty("--harpy-editor-lh", String(cfg.editorTypography.lineHeight));
  };

  // Sync theme & saved Harpy settings with localStorage
  useEffect(() => {
    try {
      const savedSettingsRaw = localStorage.getItem("harpy_settings");
      let merged = DEFAULT_HARPY_SETTINGS;
      if (savedSettingsRaw) {
        const parsed = JSON.parse(savedSettingsRaw);
        merged = {
          ...DEFAULT_HARPY_SETTINGS,
          ...parsed,
          editorTypography: { ...DEFAULT_HARPY_SETTINGS.editorTypography, ...(parsed.editorTypography || {}) },
          terminalTypography: { ...DEFAULT_HARPY_SETTINGS.terminalTypography, ...(parsed.terminalTypography || {}) },
        };
      }
      const savedTheme = localStorage.getItem("harpy_theme") as "dark" | "light" | null;
      if (savedTheme && !savedSettingsRaw) {
        merged = { ...merged, themePreference: savedTheme };
      }
      setHarpySettings(merged);
      applyTypographyCssVars(merged);
      const eff = resolveEffectiveTheme(merged.themePreference);
      setTheme(eff);
      applyTheme(eff);
    } catch {}
  }, []);

  const updateHarpySettings = (patch: Partial<HarpyAppSettings>) => {
    setHarpySettings((prev) => {
      const next: HarpyAppSettings = {
        ...prev,
        ...patch,
        editorTypography: patch.editorTypography ? { ...prev.editorTypography, ...patch.editorTypography } : prev.editorTypography,
        terminalTypography: patch.terminalTypography ? { ...prev.terminalTypography, ...patch.terminalTypography } : prev.terminalTypography,
      };
      try {
        localStorage.setItem("harpy_settings", JSON.stringify(next));
      } catch {}
      applyTypographyCssVars(next);
      return next;
    });
  };

  const applyTheme = (t: "dark" | "light") => {
    if (t === "light") {
      document.documentElement.classList.add("light", "theme-light");
      document.documentElement.classList.remove("dark", "theme-dark");
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.classList.add("dark", "theme-dark");
      document.documentElement.classList.remove("light", "theme-light");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  };

  const handleSelectThemePreference = (pref: "dark" | "light" | "system") => {
    updateHarpySettings({ themePreference: pref });
    const eff = resolveEffectiveTheme(pref);
    setTheme(eff);
    applyTheme(eff);
    try {
      localStorage.setItem("harpy_theme", eff);
    } catch {}
  };
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Autonomous Code Agent Mode State (default enabled)
  const [agentMode, setAgentMode] = useState(true);
  const [agentExecutionMode, setAgentExecutionMode] = useState<'plan' | 'execute'>('execute');
  const [reviewingDiffFile, setReviewingDiffFile] = useState<FileChangeRecord | null>(null);
  const agentAbortControllerRef = useRef<AbortController | null>(null);

  // Vapi Voice Assistant AI State
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [isVoiceAssistantActive, setIsVoiceAssistantActive] = useState(false);
  const [isVoiceAssistantDocked, setIsVoiceAssistantDocked] = useState(false);

  const handleStopAgent = async () => {
    if (agentAbortControllerRef.current) {
      agentAbortControllerRef.current.abort();
      agentAbortControllerRef.current = null;
    }
    try {
      await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abort', sessionId: currentSessionId }),
      });
    } catch {}
    setIsExecuting(false);
  };

  // Model & Auto-Detect API Key State
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("openai/gpt-oss-120b");
  const [selectedModelName, setSelectedModelName] = useState<string>("GPT-OSS 120B");
  const [customModels, setCustomModels] = useState<ModelItem[]>([]);
  const [tempKeyInput, setTempKeyInput] = useState("");
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Chat Options Menu State (Pin, Rename, Share, Delete)
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Real Speech Recognition & Audio Recording State
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const baseInputRef = useRef("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || {
      id: currentSessionId,
      title: "New Autonomous Mission",
      timestamp: "Just now",
      messages: [],
    };

  // Load saved key, model, and real user chat sessions from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      // Purge any legacy mock/dummy sessions and load only authentic user conversations
      const savedSessionsRaw = localStorage.getItem("harpy_chat_sessions");
      if (savedSessionsRaw) {
        const parsed = JSON.parse(savedSessionsRaw);
        if (Array.isArray(parsed)) {
          const validSessions = parsed.filter(
            (s: ChatSession) =>
              s.id !== "session-1" &&
              s.id !== "session-2" &&
              s.id !== "session-3" &&
              s.id !== "session-init" &&
              !s.title?.toLowerCase().includes("sync client bug") &&
              !s.title?.toLowerCase().includes("discord alert") &&
              !s.title?.toLowerCase().includes("chrome competitor") &&
              (s.isWorkspace || (Array.isArray(s.messages) && s.messages.length > 0)) &&
              !s.messages.some(
                (m) =>
                  m.text?.includes("Check my unread Gmail") ||
                  m.text?.includes("I have reviewed your connected applications") ||
                  m.text?.includes("Scan Discord #announcements") ||
                  m.text?.includes("Navigate to competitor pricing")
              )
          );
          if (validSessions.length > 0) {
            setSessions(validSessions);
            setCurrentSessionId(validSessions[0].id);
            localStorage.setItem("harpy_chat_sessions", JSON.stringify(validSessions));
          } else {
            localStorage.removeItem("harpy_chat_sessions");
            setSessions([]);
            setCurrentSessionId(`session-${Date.now()}`);
          }
        }
      } else {
        setSessions([]);
        setCurrentSessionId(`session-${Date.now()}`);
      }

      try {
        const savedProjectsRaw = localStorage.getItem("harpy_projects");
        if (savedProjectsRaw) {
          const parsedProjects = JSON.parse(savedProjectsRaw);
          if (Array.isArray(parsedProjects)) {
            setProjects(parsedProjects);
            if (parsedProjects.length > 0) {
              setExpandedProjectIds(
                Object.fromEntries(parsedProjects.map((p: UserProject) => [p.id, true]))
              );
            }
          }
        }
      } catch {}

      const savedKey = localStorage.getItem("harpy_user_api_key") || "";
      let savedModelId = localStorage.getItem("harpy_user_model_id") || "";
      let savedModelName = localStorage.getItem("harpy_user_model_name") || "";

      if (savedKey) {
        setApiKey(savedKey);
        setTempKeyInput(savedKey);
        const engine = detectEngineFromKey(savedKey);

        if (!savedModelId || savedModelId === "llama-3.3-70b-versatile") {
          savedModelId = engine.defaultModelId;
          savedModelName = engine.defaultModelName;
          try {
            localStorage.setItem("harpy_user_model_id", savedModelId);
            localStorage.setItem("harpy_user_model_name", savedModelName);
          } catch {}
        }

        setSelectedModelId(savedModelId);
        setSelectedModelName(savedModelName);

        fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: savedKey, provider: engine.provider }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data?.models) && data.models.length > 0) {
              setCustomModels(data.models);
            }
          })
          .catch(() => {});
      } else {
        // No custom key -> Default to Groq key in .env with GPT-OSS 120B
        const defaultModelId = savedModelId && savedModelId !== "llama-3.3-70b-versatile"
          ? savedModelId
          : "openai/gpt-oss-120b";
        const defaultModelName = savedModelName && savedModelName !== "Select Model"
          ? savedModelName
          : "GPT-OSS 120B";

        setSelectedModelId(defaultModelId);
        setSelectedModelName(defaultModelName);

        fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: "" }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data?.models) && data.models.length > 0) {
              setCustomModels(data.models);
            }
          })
          .catch(() => {});
      }

      // Helper to build rich operator profile from Supabase user
      const buildProfile = (u: any): AuthUserProfile => {
        const metaName = u.user_metadata?.full_name || u.user_metadata?.name;
        const derivedName = metaName || (u.email ? u.email.split("@")[0] : "Operator");
        return {
          id: u.id,
          email: u.email || "",
          fullName: derivedName,
          avatarUrl: u.user_metadata?.avatar_url,
          role: "Sovereign Operator",
          createdAt: u.created_at,
        };
      };

      // Check active Supabase session
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          const prof = buildProfile(data.user);
          setAuthUser(prof);
          setNewDisplayName(prof.fullName);
        } else {
          setAuthUser(null);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const prof = buildProfile(session.user);
          setAuthUser(prof);
          setNewDisplayName(prof.fullName);
        } else {
          setAuthUser(null);
        }
      });

      return () => {
        authListener?.subscription.unsubscribe();
      };
    } catch {}
  }, []);

  // Global Keyboard Shortcuts (respects harpySettings.keyboardShortcutsEnabled)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && settingsModalOpen) {
        setSettingsModalOpen(false);
        return;
      }
      if (!harpySettings.keyboardShortcutsEnabled) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSettingsModalOpen(false);
        handleCreateWorkspace({ openImmediately: true });
      } else if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [harpySettings.keyboardShortcutsEnabled, settingsModalOpen]);

  // Warn before closing tab if agent is executing and confirmBeforeLeaving is enabled
  useEffect(() => {
    if (!harpySettings.confirmBeforeLeaving || !isExecuting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [harpySettings.confirmBeforeLeaving, isExecuting]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    router.push("/");
  };

  const handleUpdateProfile = async () => {
    if (!newDisplayName.trim()) return;
    setIsSavingProfile(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: newDisplayName.trim() },
      });
      if (!error && data?.user) {
        setAuthUser((prev) => (prev ? { ...prev, fullName: newDisplayName.trim() } : null));
        setProfileModalOpen(false);
      }
    } catch {}
    setIsSavingProfile(false);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSessionId(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isExecuting]);

  // Save Key & Fetch Live Models for that provider
  const handleSaveKey = async () => {
    const clean = tempKeyInput.trim();
    if (!clean) {
      handleResetToDefaultKey();
      return;
    }

    setIsValidatingKey(true);
    setKeyError(null);
    const engine = detectEngineFromKey(clean);

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: clean, provider: engine.provider }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setKeyError(errJson.error || "Failed to validate API key. Please check key credentials.");
        setIsValidatingKey(false);
        return;
      }

      const data = await res.json();
      const models: ModelItem[] =
        Array.isArray(data?.models) && data.models.length > 0 ? data.models : engine.models;
      const initialModel = models[0];

      setApiKey(clean);
      setCustomModels(models);
      setSelectedModelId(initialModel.id);
      setSelectedModelName(initialModel.name);
      setIsEditingKey(false);

      try {
        localStorage.setItem("harpy_user_api_key", clean);
        localStorage.setItem("harpy_user_model_id", initialModel.id);
        localStorage.setItem("harpy_user_model_name", initialModel.name);
      } catch {}
    } catch {
      setKeyError("Network error while validating API key.");
    }
    setIsValidatingKey(false);
  };

  const handleResetToDefaultKey = async () => {
    setApiKey("");
    setTempKeyInput("");
    setIsEditingKey(false);
    setKeyError(null);
    try {
      localStorage.removeItem("harpy_user_api_key");
      localStorage.setItem("harpy_user_model_id", "openai/gpt-oss-120b");
      localStorage.setItem("harpy_user_model_name", "GPT-OSS 120B");
    } catch {}

    setSelectedModelId("openai/gpt-oss-120b");
    setSelectedModelName("GPT-OSS 120B");

    setIsValidatingKey(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models) && data.models.length > 0) {
          setCustomModels(data.models);
        }
      }
    } catch {}
    setIsValidatingKey(false);
  };

  const handleSelectModel = (modelId: string, modelName: string) => {
    setSelectedModelId(modelId);
    setSelectedModelName(modelName);
    try {
      localStorage.setItem("harpy_user_model_id", modelId);
      localStorage.setItem("harpy_user_model_name", modelName);
    } catch {}
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    const scrollH = e.target.scrollHeight;
    const newH = Math.min(scrollH, 160);
    e.target.style.height = `${newH}px`;
    e.target.style.overflowY = scrollH > 160 ? "auto" : "hidden";
  };

  const persistSessions = (next: ChatSession[]) => {
    try {
      const saveable = next.filter((s) => s.isWorkspace || (Array.isArray(s.messages) && s.messages.length > 0));
      if (saveable.length === 0) {
        localStorage.removeItem("harpy_chat_sessions");
      } else {
        localStorage.setItem("harpy_chat_sessions", JSON.stringify(saveable));
      }
    } catch {}
  };

  const persistProjects = (next: UserProject[]) => {
    try {
      localStorage.setItem("harpy_projects", JSON.stringify(next));
    } catch {}
  };

  const handleCreateProject = (nameInput?: string) => {
    const clean = (nameInput ?? newProjectName).trim();
    if (!clean) return;
    const newProj: UserProject = {
      id: `proj-${Date.now()}`,
      name: clean,
      branch: activeBranch || "main",
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => {
      const next = [newProj, ...prev];
      persistProjects(next);
      return next;
    });
    setActiveProjectId(newProj.id);
    setExpandedProjectIds((prev) => ({ ...prev, [newProj.id]: true }));
    setNewProjectName("");
    setShowNewProjectInput(false);
    setShareToast(`Created project "${clean}"`);
    setTimeout(() => setShareToast(null), 2200);
  };

  const handleDeleteProject = (projId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== projId);
      persistProjects(next);
      return next;
    });
    setSessions((prev) => {
      const next = prev.map((s) => (s.projectId === projId ? { ...s, projectId: undefined } : s));
      persistSessions(next);
      return next;
    });
    if (activeProjectId === projId) {
      setActiveProjectId(null);
    }
  };

  const handleCreateWorkspace = (opts?: {
    name?: string;
    branch?: string;
    worktreeMode?: "Worktree" | "Sandbox";
    projectId?: string;
    openImmediately?: boolean;
  }) => {
    const existingCount = sessions.length;
    const title = opts?.name?.trim() || `Workspace ${existingCount + 1}`;
    const branch = opts?.branch || activeBranch || "main";
    const mode = opts?.worktreeMode || worktreeMode;
    const targetProjectId = opts?.projectId !== undefined ? opts.projectId : activeProjectId || undefined;
    const newWs: ChatSession = {
      id: `session-${Date.now()}`,
      title,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      messages: [],
      isWorkspace: true,
      projectId: targetProjectId,
      branch,
      worktreeMode: mode,
    };

    setSessions((prev) => {
      const next = [newWs, ...prev];
      persistSessions(next);
      return next;
    });
    setCurrentSessionId(newWs.id);
    setActiveBranch(branch);
    setWorktreeMode(mode);
    setAttachedFile(null);
    setInputValue("");
    setActiveComposerMenu(null);

    if (opts?.openImmediately !== false) {
      navigateView("home");
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setShareToast(`Created workspace "${title}"`);
      setTimeout(() => setShareToast(null), 2200);
    }
  };

  const handleNewChat = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    if (activeView === "workspaces") {
      handleCreateWorkspace({ openImmediately: true });
      return;
    }
    if (currentSession && currentSession.messages.length === 0) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }

    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setAttachedFile(null);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
      textareaRef.current.focus();
    }
  };

  const handleSendMessage = async (
    customPrompt?: string,
    forceAgentMode?: boolean,
    forcePlanMode?: boolean,
    approvedPlanSpec?: PlanSpecification
  ) => {
    const effectivePlanMode = forcePlanMode !== undefined ? forcePlanMode : agentExecutionMode === 'plan';
    // If voice recording is running, stop it
    if (isRecordingRef.current) {
      stopRecording();
    }

    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend && !attachedFile) return;

    setActiveView("home");
    setIsModelMenuOpen(false);
    setIsAccessMenuOpen(false);
    setActiveComposerMenu(null);

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachment: attachedFile || undefined,
    };

    const updatedMessages = [...(currentSession?.messages || []), userMsg];

    // Update session title if first message (preserve explicit custom workspace names)
    const isFirst = (currentSession?.messages || []).length === 0;
    const newTitle = isFirst
      ? (currentSession as ChatSession)?.isWorkspace
        ? currentSession.title
        : textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "")
      : currentSession.title;

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      let next: ChatSession[];
      if (exists) {
        next = prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, title: newTitle, messages: updatedMessages, branch: s.branch || activeBranch, worktreeMode: s.worktreeMode || worktreeMode }
            : s
        );
      } else {
        const newSessionItem: ChatSession = {
          id: currentSessionId,
          title: newTitle,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          messages: updatedMessages,
          isWorkspace: true,
          projectId: activeProjectId || undefined,
          branch: activeBranch,
          worktreeMode,
        };
        next = [newSessionItem, ...prev];
      }
      persistSessions(next);
      return next;
    });

    setInputValue("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }

    setIsExecuting(true);

    // ──────────────────────────────────────────────────────────
    // AUTONOMOUS AGENT MODE EXECUTION (STREAMING SSE)
    // ──────────────────────────────────────────────────────────
    const isCodingTask =
      /^(build|create|code|implement|fix|make|refactor|generate|setup|develop|add\s+feature|now\s+build|write|update)/i.test(
        textToSend.trim()
      ) ||
      textToSend.toLowerCase().includes('next.js') ||
      textToSend.toLowerCase().includes('react') ||
      textToSend.toLowerCase().includes('app') ||
      textToSend.toLowerCase().includes('website') ||
      textToSend.toLowerCase().includes('component');

    const isRunningAsAgent = forceAgentMode !== undefined ? forceAgentMode : (agentMode || isCodingTask);
    if (isRunningAsAgent) {
      if (!agentMode) setAgentMode(true);
      const agentMsgId = `harpy-agent-${Date.now()}`;
      const initialAgentRun: AgentRunData = {
        sessionId: currentSessionId,
        workspacePath: `workspaces/${authUser?.id || 'anonymous'}/${currentSessionId}`,
        status: 'running',
        plan: [],
        events: [],
        filesChanged: [],
      };

      const initialAgentMsg: Message = {
        id: agentMsgId,
        sender: 'harpy',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAgent: true,
        agentRun: initialAgentRun,
      };

      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...updatedMessages, initialAgentMsg] }
            : s
        );
        persistSessions(next);
        return next;
      });

      const abortController = new AbortController();
      agentAbortControllerRef.current = abortController;

      try {
        const engine = detectEngineFromKey(apiKey || "gsk_default");
        const chosenModel = selectedModelId || engine.defaultModelId;

        // Gather all existing non-deleted files from the session so the agent preserves and builds upon them
        const sessionFileMap = new Map<string, FileChangeRecord>();
        for (const m of currentSession?.messages || []) {
          if (m.isAgent && m.agentRun?.filesChanged) {
            for (const f of m.agentRun.filesChanged) {
              if (f.action === 'deleted') {
                sessionFileMap.delete(f.path);
              } else {
                sessionFileMap.set(f.path, f);
              }
            }
          }
        }
        const existingWorkspaceFiles = Array.from(sessionFileMap.values());

        // Extract conversation history for multi-turn session persistence
        const chatHistory = (currentSession?.messages || [])
          .filter((m) => m.text && m.text.trim())
          .slice(-10)
          .map((m) => ({
            role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.text,
          }));

        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSend,
            sessionId: currentSessionId,
            userId: authUser?.id || 'anonymous',
            model: chosenModel,
            apiKey: apiKey || '',
            existingFiles: existingWorkspaceFiles,
            planMode: effectivePlanMode,
            approvedPlan: approvedPlanSpec,
            history: chatHistory,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to launch agent`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No readable stream available');

        const decoder = new TextDecoder();
        let buffer = '';

        const currentRun: AgentRunData = { ...initialAgentRun };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            try {
              const event: AgentEvent = JSON.parse(jsonStr);

              if (event.type === 'thinking_start') {
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'thinking_end') {
                currentRun.thinkingDuration = event.durationSeconds;
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'plan') {
                currentRun.plan = event.steps;
              } else if (event.type === 'plan_spec') {
                currentRun.planSpec = event.planSpec;
              } else if (event.type === 'build_verification') {
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'message_delta') {
                currentRun.finalMessage = (currentRun.finalMessage || '') + event.delta;
              } else if (event.type === 'tool_start') {
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'tool_end') {
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'approval_required') {
                currentRun.status = 'waiting_approval';
                currentRun.pendingApproval = { id: event.id, command: event.command, reason: event.reason };
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'approval_resolved') {
                currentRun.status = 'running';
                currentRun.pendingApproval = undefined;
                currentRun.events = [...currentRun.events, event];
              } else if (event.type === 'file_changed') {
                currentRun.events = [...currentRun.events, event];
                const existingIdx = currentRun.filesChanged.findIndex((f) => f.path === event.path);
                const rec: FileChangeRecord = {
                  path: event.path,
                  action: event.action,
                  addedLines: event.added,
                  removedLines: event.removed,
                  oldContent: event.oldContent,
                  newContent: event.newContent,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                if (existingIdx >= 0) {
                  currentRun.filesChanged[existingIdx] = rec;
                } else {
                  currentRun.filesChanged = [...currentRun.filesChanged, rec];
                }
              } else if (event.type === 'done') {
                currentRun.status = effectivePlanMode ? 'plan_ready' : 'completed';
                currentRun.filesChanged = effectivePlanMode ? [] : event.filesChanged;
                if (event.planSpec) currentRun.planSpec = event.planSpec;
                if (event.verificationChecks) currentRun.verificationChecks = event.verificationChecks;
                if (!currentRun.finalMessage) currentRun.finalMessage = event.summary;
                if (harpySettings.notificationSounds) {
                  playHarpyCompletionSound(harpySettings.notificationVolume);
                }
                if (
                  harpySettings.desktopNotifications &&
                  typeof Notification !== 'undefined' &&
                  Notification.permission === 'granted' &&
                  typeof document !== 'undefined' &&
                  document.hidden
                ) {
                  new Notification('Harpy AI', {
                    body: effectivePlanMode ? 'Plan is ready for review.' : 'Task completed.',
                  });
                }
              } else if (event.type === 'error') {
                currentRun.status = 'failed';
                currentRun.error = event.message;
              }

              // Update sessions state live
              setSessions((prev) => {
                const next = prev.map((s) => {
                  if (s.id !== currentSessionId) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === agentMsgId
                        ? { ...m, text: currentRun.finalMessage || '', agentRun: { ...currentRun } }
                        : m
                    ),
                  };
                });
                persistSessions(next);
                return next;
              });
            } catch (parseErr) {
              console.warn('Agent event parse error:', parseErr);
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Agent stream failed';
        setSessions((prev) => {
          const next = prev.map((s) => {
            if (s.id !== currentSessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === agentMsgId
                  ? {
                      ...m,
                      isError: true,
                      text: `Agent Error: ${message}`,
                      agentRun: m.agentRun ? { ...m.agentRun, status: 'failed' as const, error: message } : undefined,
                    }
                  : m
              ),
            };
          });
          persistSessions(next);
          return next;
        });
      } finally {
        setIsExecuting(false);
        agentAbortControllerRef.current = null;
      }
      return;
    }

    try {
      const engine = detectEngineFromKey(apiKey || "gsk_default");
      const chosenModel = selectedModelId || engine.defaultModelId;

      const apiMessages = [
        ...currentSession.messages.map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
        { role: "user", content: textToSend },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: engine.provider,
          model: chosenModel,
          apiKey: apiKey || "",
          messages: apiMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Inference error`);
      }

      // If server auto-fell back to an active model (e.g. from 404 to 8b-instant), update UI seamlessly
      if (data.model && data.model !== selectedModelId) {
        const pool = customModels.length > 0 ? customModels : engine.models;
        const matched = pool.find((m) => m.id === data.model);
        const newName = matched ? matched.name : data.model;
        setSelectedModelId(data.model);
        setSelectedModelName(newName);
        try {
          localStorage.setItem("harpy_user_model_id", data.model);
          localStorage.setItem("harpy_user_model_name", newName);
        } catch {}
      }

      const harpyMsg: Message = {
        id: `harpy-${Date.now()}`,
        sender: "harpy",
        text: data.text || "Execution completed successfully.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...updatedMessages, harpyMsg] }
            : s
        );
        persistSessions(next);
        return next;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Inference connection error";
      const errorMsg: Message = {
        id: `harpy-err-${Date.now()}`,
        sender: "harpy",
        text: `Kernel Execution Error: ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...updatedMessages, errorMsg] }
            : s
        )
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file.name);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setVoiceStatus(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
  };

  const transcribeAudioBlob = async (blob: Blob) => {
    setVoiceStatus("Transcribing voice input with AI...");
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      if (apiKey) {
        formData.append("apiKey", apiKey);
      }

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data?.text) {
        const recognizedText = data.text.trim();
        const base = baseInputRef.current.trim();
        const combined = base ? `${base} ${recognizedText}` : recognizedText;
        setInputValue(combined);

        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
          textareaRef.current.focus();
        }
      } else if (data?.error) {
        setVoiceError(`Transcription note: ${data.error}`);
      }
    } catch {
      setVoiceError("Audio transcription request could not be completed.");
    } finally {
      setVoiceStatus(null);
    }
  };

  const startMediaRecorderFallback = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError("Microphone is not supported in this browser environment.");
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/wav" });
        if (audioBlob.size > 500) {
          await transcribeAudioBlob(audioBlob);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      setVoiceStatus("Listening... speak now (click mic again to finish)");
    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setVoiceError(
          "Microphone permission denied. In Safari: click Safari > Settings for This Website (or Safari Settings > Websites > Microphone) and set localhost to 'Allow'."
        );
      } else {
        setVoiceError(`Failed to access microphone: ${err.message || "Unknown error"}`);
      }
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const toggleRecording = () => {
    // If currently recording, stop it immediately
    if (isRecordingRef.current) {
      stopRecording();
      return;
    }

    setVoiceError(null);
    setVoiceStatus(null);
    baseInputRef.current = inputValue;

    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang =
          typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

        let finalTranscripts = "";

        recognition.onstart = () => {
          setIsRecording(true);
          isRecordingRef.current = true;
          setVoiceStatus("Listening... speak into your microphone");
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            const text = item[0]?.transcript || "";
            if (item.isFinal) {
              finalTranscripts += (finalTranscripts ? " " : "") + text.trim();
            } else {
              interimTranscript += (interimTranscript ? " " : "") + text.trim();
            }
          }

          const currentSpeech = (finalTranscripts + (interimTranscript ? " " + interimTranscript : "")).trim();
          const base = baseInputRef.current.trim();
          const combined = base ? (currentSpeech ? `${base} ${currentSpeech}` : base) : currentSpeech;
          setInputValue(combined);

          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition event:", event.error);
          if (event.error === "no-speech") {
            // Keep listening, do not interrupt user
            return;
          }
          if (event.error === "not-allowed") {
            setVoiceError(
              "Microphone permission denied. In Safari: click Safari > Settings for This Website (or Safari Settings > Websites > Microphone) and set localhost to 'Allow'."
            );
            stopRecording();
          } else if (event.error === "service-not-allowed") {
            // If Apple Dictation is off on macOS, fallback to MediaRecorder
            console.log("Speech recognition service not allowed, switching to MediaRecorder fallback");
            stopRecording();
            startMediaRecorderFallback();
          } else if (event.error !== "aborted") {
            setVoiceError(`Voice input: ${event.error}`);
            stopRecording();
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch {
              setIsRecording(false);
              isRecordingRef.current = false;
              setVoiceStatus(null);
            }
          } else {
            setIsRecording(false);
            setVoiceStatus(null);
          }
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("Direct SpeechRecognition start error, falling back to MediaRecorder:", err);
      }
    }

    // Fallback if SpeechRecognition is not available or throws
    startMediaRecorderFallback();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const togglePinSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, isPinned: !s.isPinned } : s
      );
      persistSessions(updated);
      return updated;
    });
    setActiveMenuSessionId(null);
  };

  const startRenameSession = (s: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSessionId(s.id);
    setEditingTitle(s.title);
    setActiveMenuSessionId(null);
  };

  const saveRenameSession = (id: string) => {
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === id ? { ...s, title: editingTitle.trim() } : s
      );
      persistSessions(updated);
      return updated;
    });
    setEditingSessionId(null);
  };

  const shareSession = (s: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const conversationText =
      `HARPY AI Mission: ${s.title}\n\n` +
      s.messages
        .map((m) => `[${m.sender === "user" ? "USER" : "HARPY"}] ${m.text}`)
        .join("\n\n");

    if (navigator.clipboard) {
      navigator.clipboard.writeText(conversationText);
      setShareToast("Mission transcript copied to clipboard!");
      setTimeout(() => setShareToast(null), 2500);
    }
    setActiveMenuSessionId(null);
  };

  const deleteSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveMenuSessionId(null);
    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      const freshId = `session-${Date.now()}`;
      setSessions([]);
      setCurrentSessionId(freshId);
      try {
        localStorage.removeItem("harpy_chat_sessions");
      } catch {}
    } else {
      setSessions(remaining);
      if (currentSessionId === id) {
        setCurrentSessionId(remaining[0].id);
      }
      persistSessions(remaining);
    }
  };

  const handleClearAllChatHistory = () => {
    try {
      localStorage.removeItem("harpy_chat_sessions");
      localStorage.removeItem("harpy_todo_tasks");
    } catch {}
    const freshId = `session-${Date.now()}`;
    setSessions([]);
    setCurrentSessionId(freshId);
    setReviewingDiffFile(null);
    setShareToast("All chat history has been permanently deleted.");
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleResetAllData = () => {
    try {
      localStorage.removeItem("harpy_chat_sessions");
      localStorage.removeItem("harpy_todo_tasks");
      localStorage.removeItem("harpy_projects");
      localStorage.removeItem("harpy_workspace_views");
      localStorage.removeItem("harpy_workspace_display");
      localStorage.removeItem("harpy_settings");
      localStorage.removeItem("harpy_user_api_key");
      localStorage.removeItem("harpy_user_model_id");
      localStorage.removeItem("harpy_user_model_name");
      localStorage.removeItem("harpy_theme");
    } catch {}
    setSessions([]);
    setProjects([]);
    setActiveProjectId(null);
    setCurrentSessionId(`session-${Date.now()}`);
    setReviewingDiffFile(null);
    setHarpySettings(DEFAULT_HARPY_SETTINGS);
    applyTypographyCssVars(DEFAULT_HARPY_SETTINGS);
    handleSelectThemePreference("dark");
    handleResetToDefaultKey();
    setSettingsModalOpen(false);
    setShareToast("All local workspace data and settings have been reset.");
    setTimeout(() => setShareToast(null), 3000);
  };

  const isCustomKey = Boolean(apiKey && apiKey.trim().length > 0);
  const currentEngine = detectEngineFromKey(apiKey || "gsk_default");
  const hasActiveKey = true;
  const activeModelsList =
    customModels.length > 0 ? customModels : currentEngine ? currentEngine.models : [];

  const workspaceSummaries: WorkspaceSessionSummary[] = (sessions || [])
    .filter((s) => Boolean(s) && (s.isWorkspace || (s.messages && s.messages.length > 0)))
    .map((s) => {
      const fMap = new Map<string, FileChangeRecord>();
      let hasApproval = false;
      let isWorking = s.id === currentSessionId && isExecuting;
      for (const m of s.messages || []) {
        if (m.agentRun?.status === "waiting_approval") hasApproval = true;
        if (m.agentRun?.status === "running" && s.id === currentSessionId && isExecuting) isWorking = true;
        if (m.isAgent && m.agentRun?.filesChanged) {
          for (const f of m.agentRun.filesChanged) {
            if (f.action === "deleted") fMap.delete(f.path);
            else fMap.set(f.path, f);
          }
        }
      }
      return {
        id: s.id,
        title: s.title,
        timestamp: s.timestamp,
        messageCount: (s.messages || []).length,
        status: isWorking
          ? "working"
          : hasApproval
            ? "needs_approval"
            : (s.messages || []).length === 0
              ? "idle"
              : "completed",
        files: Array.from(fMap.values()),
        branch: s.branch || activeBranch,
      };
    });

  const activeSessionFiles = (() => {
    const fileMap = new Map<string, FileChangeRecord>();
    for (const m of currentSession?.messages || []) {
      if (m.isAgent && m.agentRun?.filesChanged) {
        for (const f of m.agentRun.filesChanged) {
          if (f.action === "deleted") {
            fileMap.delete(f.path);
          } else {
            fileMap.set(f.path, f);
          }
        }
      }
    }
    return Array.from(fileMap.values());
  })();

  const activeProject =
    projects.find((p) => p.id === (currentSession?.projectId || activeProjectId)) || null;

  const filteredProjects = (projects || [])
    .filter((p) =>
      sidebarSearch.trim() ? p.name.toLowerCase().includes(sidebarSearch.toLowerCase()) : true
    )
    .sort((a, b) => (projectSortAsc ? a.name.localeCompare(b.name) : 0));

  const filteredSidebarSessions = (sessions || [])
    .filter((s) => Boolean(s) && (s.isWorkspace || (s.messages && s.messages.length > 0)))
    .filter((s) =>
      sidebarSearch.trim()
        ? s.title.toLowerCase().includes(sidebarSearch.toLowerCase())
        : true
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (projectSortAsc) return a.title.localeCompare(b.title);
      return 0;
    });

  const standaloneSidebarSessions = filteredSidebarSessions.filter(
    (s) => !s.projectId || !projects.some((p) => p.id === s.projectId)
  );

  const renderComposer = (isCentered = false) => (
    <div className={`${isCentered ? "max-w-[660px]" : "max-w-4xl"} mx-auto w-full space-y-2.5`}>
      {/* Attachment preview */}
      {attachedFile && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1B1917] border border-[#2C2824] text-xs text-[#D8D3CC]">
          <div className="flex items-center gap-2 truncate">
            <Paperclip className="w-3.5 h-3.5 text-[#8E8880]" />
            <span className="font-mono truncate">{attachedFile}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="text-[#8E8880] hover:text-rose-400 p-0.5"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Voice Recording Bar */}
      {isRecording && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-red-950/40 border border-red-500/40">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-medium text-red-200">
              {voiceStatus || "Listening... speak into your microphone"}
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="px-2.5 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-mono font-semibold"
          >
            Done
          </button>
        </div>
      )}

      {/* Voice Input Error Banner */}
      {voiceError && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#2A1515] border border-red-500/40 text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="text-red-400 hover:text-red-200 ml-2 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Metadata Strip Above Pill (Screenshot 6) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#9E978F]">
        <div className="flex items-center gap-3 flex-wrap relative">
          {/* Workspace Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveComposerMenu(activeComposerMenu === "workspace" ? null : "workspace")}
              className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors"
              title="Switch or create workspace"
            >
              <Image
                src={cdn("/images/harpy-logo-light.png")}
                alt="Harpy AI"
                width={16}
                height={16}
                className="w-4 h-4 rounded-full object-contain shrink-0"
              />
              <span className="font-medium text-[#D8D3CC] max-w-[140px] truncate">
                {sessions.some((s) => s.id === currentSessionId)
                  ? currentSession.title
                  : activeProject?.name || "Workspace"}
              </span>
              <ChevronDown className="w-3 h-3 text-[#78726B]" />
            </button>

            {activeComposerMenu === "workspace" && (
              <div className="absolute left-0 bottom-full mb-2 w-64 rounded-xl bg-[#1B1917] border border-[#2E2A25] p-1.5 shadow-2xl z-50">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#78726B]">
                  Workspaces
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {workspaceSummaries.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-[#78726B]">No active workspaces yet</div>
                  ) : (
                    workspaceSummaries.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setCurrentSessionId(ws.id);
                          if (ws.branch) setActiveBranch(ws.branch);
                          setActiveComposerMenu(null);
                          navigateView("home");
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          ws.id === currentSessionId
                            ? "bg-[#282420] text-[#ECEAE6]"
                            : "text-[#A8A199] hover:bg-[#221F1C] hover:text-[#ECEAE6]"
                        }`}
                      >
                        <span className="truncate">{ws.title}</span>
                        {ws.id === currentSessionId && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-1 pt-1 border-t border-[#282420] space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleCreateWorkspace({ openImmediately: true })}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#D8D3CC] hover:bg-[#24211E] hover:text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveComposerMenu(null);
                      navigateView("workspaces");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#8E8880] hover:bg-[#24211E] hover:text-[#ECEAE6] transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Manage all workspaces</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Worktree Mode Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveComposerMenu(activeComposerMenu === "worktree" ? null : "worktree")}
              className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors"
              title="Execution isolation mode"
            >
              <GitFork className="w-3.5 h-3.5 text-[#78726B]" />
              <span>{worktreeMode}</span>
              <ChevronDown className="w-3 h-3 text-[#78726B]" />
            </button>

            {activeComposerMenu === "worktree" && (
              <div className="absolute left-0 bottom-full mb-2 w-44 rounded-xl bg-[#1B1917] border border-[#2E2A25] p-1 shadow-2xl z-50">
                {(["Worktree", "Sandbox"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setWorktreeMode(mode);
                      setSessions((prev) => {
                        const next = prev.map((s) =>
                          s.id === currentSessionId ? { ...s, worktreeMode: mode } : s
                        );
                        persistSessions(next);
                        return next;
                      });
                      setActiveComposerMenu(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      worktreeMode === mode
                        ? "bg-[#282420] text-[#ECEAE6]"
                        : "text-[#A8A199] hover:bg-[#221F1C] hover:text-[#ECEAE6]"
                    }`}
                  >
                    <span>{mode}</span>
                    {worktreeMode === mode && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Branch Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveComposerMenu(activeComposerMenu === "branch" ? null : "branch")}
              className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors font-mono"
              title="Switch branch"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#78726B]" />
              <span>{activeBranch}</span>
              <ChevronDown className="w-3 h-3 text-[#78726B]" />
            </button>

            {activeComposerMenu === "branch" && (
              <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl bg-[#1B1917] border border-[#2E2A25] p-1 shadow-2xl z-50">
                <div className="max-h-44 overflow-y-auto space-y-0.5">
                  {gitBranches.map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => {
                        setActiveBranch(br);
                        setSessions((prev) => {
                          const next = prev.map((s) =>
                            s.id === currentSessionId ? { ...s, branch: br } : s
                          );
                          persistSessions(next);
                          return next;
                        });
                        setActiveComposerMenu(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                        activeBranch === br
                          ? "bg-[#282420] text-[#ECEAE6]"
                          : "text-[#A8A199] hover:bg-[#221F1C] hover:text-[#ECEAE6]"
                      }`}
                    >
                      <span className="truncate">{br}</span>
                      {activeBranch === br && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
                <div className="mt-1 pt-1 border-t border-[#282420]">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveComposerMenu(null);
                      navigateView("git");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#8E8880] hover:bg-[#24211E] hover:text-[#ECEAE6]"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>Open Version Control</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <button
            type="button"
            onClick={() => setActiveComposerMenu(activeComposerMenu === "device" ? null : "device")}
            className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors"
          >
            <Monitor className="w-3.5 h-3.5 text-[#78726B]" />
            <span>{deviceTarget}</span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>

          {activeComposerMenu === "device" && (
            <div className="absolute right-0 bottom-full mb-2 w-40 rounded-xl bg-[#1B1917] border border-[#2E2A25] p-1 shadow-2xl z-50">
              {(["This device", "Cloud"] as const).map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => {
                    setDeviceTarget(target);
                    setActiveComposerMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    deviceTarget === target
                      ? "bg-[#282420] text-[#ECEAE6]"
                      : "text-[#A8A199] hover:bg-[#221F1C] hover:text-[#ECEAE6]"
                  }`}
                >
                  <span>{target}</span>
                  {deviceTarget === target && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Pill Composer (Screenshot 6) */}
      <div
        className={`relative flex items-center gap-2 px-2.5 py-2 transition-all duration-150 ${
          inputValue.includes("\n") ? "rounded-2xl" : "rounded-full"
        } ${
          isLight
            ? "bg-white border border-slate-300 shadow-sm focus-within:border-slate-400"
            : "bg-[#1D1B18] border border-[#2E2A25] focus-within:border-[#46403A] shadow-lg"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          id="harpy-file-upload"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
            isLight
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              : "bg-[#2A2622] text-[#A8A199] hover:bg-[#342F2A] hover:text-[#ECEAE6]"
          }`}
          title="Attach file (+)"
          aria-label="Upload Attachments"
        >
          <Plus className="w-4 h-4 stroke-[2]" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={inputValue}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder="Do anything in Harpy"
          className={`flex-1 max-h-40 py-1 px-1.5 bg-transparent text-sm focus:outline-none resize-none font-sans leading-relaxed no-scrollbar ${
            isLight
              ? "text-slate-900 placeholder-slate-400"
              : "text-[#ECEAE6] placeholder-[#78726B]"
          }`}
          style={{ overflowY: "hidden", resize: "none", scrollbarWidth: "none", msOverflowStyle: "none" }}
        />

        {/* Voice Microphone (controlled by Settings -> General -> Dictation) */}
        {harpySettings.dictationEnabled && (
          <button
            type="button"
            onClick={toggleRecording}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isRecording
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : isLight
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  : "text-[#9E978F] hover:bg-[#2A2622] hover:text-[#ECEAE6]"
            }`}
            title={isRecording ? "Stop recording" : "Voice Input"}
            aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        {/* Stop or Send */}
        {isExecuting ? (
          <button
            type="button"
            onClick={handleStopAgent}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-colors shrink-0"
            title="Stop Execution"
            aria-label="Stop Execution"
          >
            <Square className="w-3.5 h-3.5 fill-rose-400" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() && !attachedFile}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              inputValue.trim() || attachedFile
                ? isLight
                  ? "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                  : "bg-[#ECEAE6] text-[#141210] hover:bg-white cursor-pointer"
                : isLight
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-[#2A2622] text-[#666059] cursor-not-allowed"
            }`}
            title="Send (Enter)"
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}

        {/* Voice AI Assistant Trigger (controlled by Settings -> General -> Voice AI Assistant) */}
        {harpySettings.voiceAiEnabled && (
          <button
            type="button"
            onClick={() => {
              if (!isVoiceAssistantOpen) {
                setIsVoiceAssistantOpen(true);
                setIsVoiceAssistantDocked(false);
              } else {
                setIsVoiceAssistantDocked(!isVoiceAssistantDocked);
              }
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isVoiceAssistantActive
                ? "bg-[#E06D44] text-white animate-pulse"
                : isLight
                  ? "text-slate-500 hover:bg-slate-100"
                  : "text-[#8E8880] hover:bg-[#2A2622] hover:text-[#ECEAE6]"
            }`}
            title="Live Voice Assistant"
            aria-label="Toggle Voice Assistant"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Mode & Model Selector Row Below Pill (Screenshot 6) */}
      <div className="flex items-center justify-between px-2 text-xs relative">
        {/* Access / Execution Mode Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsAccessMenuOpen(!isAccessMenuOpen);
              setIsModelMenuOpen(false);
            }}
            className="inline-flex items-center gap-1.5 text-[#C8C2BA] hover:text-[#ECEAE6] transition-colors py-0.5"
          >
            <ChevronsRight
              className={`w-3.5 h-3.5 ${
                agentExecutionMode === "plan" ? "text-sky-400" : "text-[#E06D44]"
              }`}
            />
            <span className="font-medium">
              {agentExecutionMode === "plan" ? "Plan mode" : "Full access"}
            </span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>

          {isAccessMenuOpen && (
            <div
              className={`absolute left-0 bottom-full mb-2 w-56 rounded-xl border p-1.5 shadow-2xl z-50 space-y-0.5 ${
                isLight ? "bg-white border-slate-200" : "bg-[#1B1917] border-[#2E2A25]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setAgentMode(true);
                  setAgentExecutionMode("execute");
                  setIsAccessMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                  agentExecutionMode === "execute"
                    ? isLight
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "bg-[#282420] text-[#ECEAE6] font-medium"
                    : "text-[#9E978F] hover:bg-[#221F1C]"
                }`}
              >
                <div>
                  <div>Full access</div>
                  <div className="text-[10px] text-[#78726B]">Explore, edit files, verify &amp; run</div>
                </div>
                {agentExecutionMode === "execute" && <Check className="w-3.5 h-3.5 text-[#E06D44]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgentMode(true);
                  setAgentExecutionMode("plan");
                  setIsAccessMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between ${
                  agentExecutionMode === "plan"
                    ? isLight
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "bg-[#282420] text-[#ECEAE6] font-medium"
                    : "text-[#9E978F] hover:bg-[#221F1C]"
                }`}
              >
                <div>
                  <div>Plan mode</div>
                  <div className="text-[10px] text-[#78726B]">Read-only exploration &amp; checklist</div>
                </div>
                {agentExecutionMode === "plan" && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Model Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsModelMenuOpen(!isModelMenuOpen);
              setIsAccessMenuOpen(false);
            }}
            className="inline-flex items-center gap-1.5 text-[#C8C2BA] hover:text-[#ECEAE6] transition-colors py-0.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E06D44]" />
            <span className="font-medium truncate max-w-[180px]">
              {selectedModelName.replace(/ \(Best Model\)|\(Fast\)/g, "") || "Default"}
            </span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>

          {isModelMenuOpen && (
            <div
              className={`absolute right-0 bottom-full mb-2 w-64 rounded-xl border p-1.5 shadow-2xl z-50 space-y-0.5 ${
                isLight ? "bg-white border-slate-200" : "bg-[#1B1917] border-[#2E2A25]"
              }`}
            >
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {activeModelsList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      handleSelectModel(m.id, m.name);
                      setIsModelMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      selectedModelId === m.id
                        ? isLight
                          ? "bg-slate-100 text-slate-900 font-medium"
                          : "bg-[#282420] text-[#ECEAE6] font-medium"
                        : "text-[#9E978F] hover:bg-[#221F1C]"
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-[#E06D44] shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="pt-1 mt-1 border-t border-[#2A2622]">
                <button
                  type="button"
                  onClick={() => {
                    setIsModelMenuOpen(false);
                    setSettingsInitialSection("models");
                    setSettingsModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-[#9E978F] hover:text-[#ECEAE6] hover:bg-[#221F1C] flex items-center gap-1.5"
                >
                  <Key className="w-3 h-3" />
                  <span>Configure API Keys...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`flex flex-col h-screen w-full bg-[#13110F] text-[#ECEAE6] overflow-hidden select-none font-sans relative ${
        theme === "light" ? "light theme-light" : "dark theme-dark"
      }`}
      data-theme={theme}
    >
      {/* Top Window Navigation Chrome (Matches Screenshots 2-5) */}
      <header className="h-9 px-3 border-b border-[#25221E] bg-[#181614] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={navigateBack}
            disabled={viewHistoryIdx <= 0}
            className="p-1 rounded-md text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#24211E] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={navigateForward}
            disabled={viewHistoryIdx >= viewHistory.length - 1}
            className="p-1 rounded-md text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#24211E] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-md text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#24211E] transition-colors ml-1"
            title="Toggle Sidebar (⌘B)"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {harpySettings.showStatusBadge && (
            <div className="hidden sm:inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-[#1D1B18] border border-[#2C2824] text-[10px] font-mono text-[#9E978F] mr-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              <span className="truncate max-w-[120px]">{selectedModelName}</span>
              <span className="text-[#4E4842]">·</span>
              <span className="text-[#8E8880]">{activeBranch}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSettingsInitialSection("general");
              setSettingsModalOpen((prev) => !prev);
            }}
            className={`p-1 rounded-md transition-colors ${
              settingsModalOpen
                ? "bg-[#282420] text-[#ECEAE6]"
                : "text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#24211E]"
            }`}
            title="Settings (⌘,)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigateView("workspaces")}
            className={`p-1 rounded-md transition-colors ${
              activeView === "workspaces"
                ? "bg-[#282420] text-[#ECEAE6]"
                : "text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#24211E]"
            }`}
            title="All Workspaces & History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {settingsModalOpen ? (
          <SettingsView
            initialSection={settingsInitialSection}
            settings={harpySettings}
            onUpdateSettings={updateHarpySettings}
            onBack={() => setSettingsModalOpen(false)}
            theme={theme}
            onSelectThemePreference={handleSelectThemePreference}
            apiKey={apiKey}
            tempKeyInput={tempKeyInput}
            onChangeTempKeyInput={(val) => {
              setTempKeyInput(val);
              setKeyError(null);
            }}
            onSaveKey={handleSaveKey}
            onResetToDefaultKey={handleResetToDefaultKey}
            isValidatingKey={isValidatingKey}
            keyError={keyError}
            isCustomKey={isCustomKey}
            providerName={currentEngine?.providerName || "Groq Cloud"}
            providerColor={currentEngine?.color || "#10A37F"}
            selectedModelId={selectedModelId}
            selectedModelName={selectedModelName}
            modelsList={activeModelsList}
            onSelectModel={handleSelectModel}
            agentExecutionMode={agentExecutionMode}
            onChangeAgentExecutionMode={(mode) => {
              setAgentMode(true);
              setAgentExecutionMode(mode);
            }}
            worktreeMode={worktreeMode}
            onChangeWorktreeMode={setWorktreeMode}
            activeBranch={activeBranch}
            branches={gitBranches}
            onChangeBranch={setActiveBranch}
            deviceTarget={deviceTarget}
            onChangeDeviceTarget={setDeviceTarget}
            authUser={authUser}
            displayNameInput={newDisplayName}
            onChangeDisplayNameInput={setNewDisplayName}
            onSaveProfile={handleUpdateProfile}
            isSavingProfile={isSavingProfile}
            onSignOut={handleSignOut}
            sessionsCount={sessions.length}
            projectsCount={projects.length}
            totalMessagesCount={sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0)}
            totalFilesChangedCount={workspaceSummaries.reduce((acc, w) => acc + w.files.length, 0)}
            onClearAllChatHistory={handleClearAllChatHistory}
            onResetAllData={handleResetAllData}
          />
        ) : (
        <>
        {/* Mobile Backdrop for Sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}

        {/* Far-Left Slim Activity Icon Rail (Matches Screenshots 2-5) */}
        <nav className="w-12 border-r border-[#25221E] bg-[#161412] flex flex-col items-center justify-between py-2.5 shrink-0 z-30">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateView("home")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                activeView === "home"
                  ? "bg-[#282420] text-[#ECEAE6]"
                  : "text-[#78726B] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
              }`}
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateView("workspaces")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                activeView === "workspaces"
                  ? "bg-[#282420] text-[#ECEAE6]"
                  : "text-[#78726B] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
              }`}
              title="Workspaces"
            >
              <Layers className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateView("plugins")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                activeView === "plugins"
                  ? "bg-[#282420] text-[#ECEAE6]"
                  : "text-[#78726B] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
              }`}
              title="Plugins & Skills"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateView("git")}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                activeView === "git"
                  ? "bg-[#282420] text-[#ECEAE6]"
                  : "text-[#78726B] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
              }`}
              title="Version Control & GitHub"
            >
              <GitPullRequest className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSettingsInitialSection("account");
                setSettingsModalOpen(true);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#78726B] hover:text-[#ECEAE6] hover:bg-[#221F1C] transition-colors"
              title="Settings & API Keys (⌘,)"
            >
              <Settings className="w-4 h-4" />
            </button>

            {authUser ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-7 h-7 rounded-full border border-[#332E29] bg-[#24211E] flex items-center justify-center text-[11px] font-semibold text-[#ECEAE6] overflow-hidden hover:border-[#5C564F] transition-colors"
                  title={authUser.fullName}
                >
                  {authUser.avatarUrl ? (
                    <img src={authUser.avatarUrl} alt={authUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    authUser.fullName.charAt(0).toUpperCase()
                  )}
                </button>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -6, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -6, scale: 0.96 }}
                      className="absolute left-full bottom-0 ml-2 w-56 z-50 rounded-xl bg-[#1B1917] border border-[#2E2A25] p-1.5 shadow-2xl space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-[#272420]">
                        <p className="text-xs font-semibold text-[#ECEAE6] truncate">{authUser.fullName}</p>
                        <p className="text-[11px] text-[#8E8880] font-mono truncate">{authUser.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#D8D3CC] hover:bg-[#262320] text-left"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/started"
                className="w-7 h-7 rounded-full border border-[#332E29] bg-[#24211E] flex items-center justify-center text-[#9E978F] hover:text-[#ECEAE6]"
                title="Sign In"
              >
                <User className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </nav>

        {/* Secondary Sidebar: New Workspace, Search, Sessions, Projects (Matches Screenshots 2-5) */}
        <aside
          className={`fixed lg:relative inset-y-0 left-12 lg:left-0 flex flex-col border-r border-[#25221E] bg-[#181614] transition-all duration-200 ease-in-out z-40 lg:z-20 flex-shrink-0 ${
            sidebarOpen
              ? "w-60 max-w-[80vw] translate-x-0"
              : "w-0 border-r-0 -translate-x-full lg:translate-x-0 pointer-events-none opacity-0"
          } overflow-hidden`}
        >
          {/* New Workspace + Search */}
          <div className="p-2.5 space-y-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                handleNewChat();
                navigateView("home");
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#24211E] hover:bg-[#2C2824] border border-[#302B26] text-xs font-medium text-[#ECEAE6] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#A8A199]" />
              <span>New Workspace</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#78726B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={sidebarSearchRef}
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-transparent hover:bg-[#1E1B18] focus:bg-[#1E1B18] text-xs text-[#ECEAE6] placeholder-[#78726B] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* SESSIONS + PROJECTS List */}
          <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(() => {
              const renderSessionRow = (s: ChatSession) => {
                const isActive = s.id === currentSessionId && activeView === "home";
                const isMenuOpen = activeMenuSessionId === s.id;
                const isEditing = editingSessionId === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (!isEditing) {
                        setCurrentSessionId(s.id);
                        if (s.projectId) setActiveProjectId(s.projectId);
                        navigateView("home");
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }
                    }}
                    tabIndex={0}
                    className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#262320] text-[#ECEAE6]"
                        : "text-[#9E978F] hover:bg-[#1F1C19] hover:text-[#ECEAE6]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                      {s.isPinned ? (
                        <Pin className="w-3 h-3 shrink-0 text-[#E06D44]" />
                      ) : (
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? "bg-[#ECEAE6]" : "bg-[#666059]"
                          }`}
                        />
                      )}

                      {isEditing ? (
                        <div
                          className="flex items-center gap-1 flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRenameSession(s.id);
                              if (e.key === "Escape") setEditingSessionId(null);
                            }}
                            className="bg-[#13110F] border border-[#3C3732] rounded px-1.5 py-0.5 text-xs text-[#ECEAE6] w-full focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveRenameSession(s.id)}
                            className="p-0.5 text-emerald-400"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="p-0.5 text-[#8E8880]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs truncate">{s.title}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuSessionId(isMenuOpen ? null : s.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isMenuOpen
                              ? "opacity-100 text-[#ECEAE6] bg-[#302B26]"
                              : "opacity-0 group-hover:opacity-100 text-[#8E8880] hover:text-[#ECEAE6]"
                          }`}
                          title="More options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-6 z-50 min-w-[165px] rounded-xl bg-[#1B1917] border border-[#2E2A25] p-1 shadow-2xl space-y-0.5"
                          >
                            <button
                              type="button"
                              onClick={(e) => togglePinSession(s.id, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#D8D3CC] hover:bg-[#262320]"
                            >
                              {s.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                              <span>{s.isPinned ? "Unpin" : "Pin"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => startRenameSession(s, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#D8D3CC] hover:bg-[#262320]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => shareSession(s, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#D8D3CC] hover:bg-[#262320]"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </button>
                            <div className="my-1 border-t border-[#2A2622]" />
                            <button
                              type="button"
                              onClick={(e) => deleteSession(s.id, e)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  {standaloneSidebarSessions.length > 0 && (
                    <div className="space-y-0.5">{standaloneSidebarSessions.map(renderSessionRow)}</div>
                  )}

                  {/* PROJECTS Tree */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#78726B]">
                      <span>Projects</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => sidebarSearchRef.current?.focus()}
                          className="hover:text-[#ECEAE6]"
                          title="Search Projects"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProjectSortAsc((prev) => !prev)}
                          className={`hover:text-[#ECEAE6] ${projectSortAsc ? "text-[#ECEAE6]" : ""}`}
                          title={projectSortAsc ? "Sorted A-Z (click for recent)" : "Sort A-Z"}
                        >
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProjectsExpanded(true);
                            setShowNewProjectInput((prev) => !prev);
                          }}
                          className={`hover:text-[#ECEAE6] ${showNewProjectInput ? "text-[#ECEAE6]" : ""}`}
                          title="Create New Project"
                        >
                          <FolderPlus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {showNewProjectInput && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateProject();
                        }}
                        className="px-1.5 py-1 flex items-center gap-1"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setShowNewProjectInput(false);
                              setNewProjectName("");
                            }
                          }}
                          placeholder="Project name..."
                          className="flex-1 min-w-0 px-2 py-1 rounded-md bg-[#13110F] border border-[#35302B] text-xs text-[#ECEAE6] placeholder-[#6A645D] focus:outline-none focus:border-[#575049]"
                        />
                        <button
                          type="submit"
                          disabled={!newProjectName.trim()}
                          className="px-2 py-1 rounded-md bg-[#ECEAE6] text-[#141210] text-[11px] font-medium hover:bg-white disabled:opacity-40"
                        >
                          Add
                        </button>
                      </form>
                    )}

                    {filteredProjects.length === 0 ? (
                      !showNewProjectInput && (
                        <button
                          type="button"
                          onClick={() => setShowNewProjectInput(true)}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-[#6A645D] hover:text-[#A8A199] hover:bg-[#1E1B18] transition-colors text-left"
                        >
                          <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                          <span>Create a project</span>
                        </button>
                      )
                    ) : (
                      projectsExpanded && (
                        <div className="space-y-1">
                          {filteredProjects.map((proj) => {
                            const isProjActive = activeProjectId === proj.id;
                            const isExpanded = expandedProjectIds[proj.id] !== false;
                            const projSessions = filteredSidebarSessions.filter((s) => s.projectId === proj.id);

                            return (
                              <div key={proj.id} className="space-y-0.5">
                                <div
                                  onClick={() => {
                                    setActiveProjectId(proj.id);
                                    setExpandedProjectIds((prev) => ({
                                      ...prev,
                                      [proj.id]: !isExpanded,
                                    }));
                                  }}
                                  className={`group flex items-center justify-between px-1.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                    isProjActive
                                      ? "bg-[#221F1C] text-[#ECEAE6]"
                                      : "text-[#D8D3CC] hover:bg-[#1E1B18]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Folder className="w-3.5 h-3.5 text-[#8E8880] shrink-0" />
                                    <span className="truncate font-medium">{proj.name}</span>
                                  </div>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateWorkspace({
                                          projectId: proj.id,
                                          openImmediately: true,
                                        });
                                      }}
                                      className="p-1 rounded hover:bg-[#2E2A25] text-[#A8A199] hover:text-[#ECEAE6]"
                                      title={`New workspace in ${proj.name}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteProject(proj.id, e)}
                                      className="p-1 rounded hover:bg-rose-500/10 text-rose-400/70 hover:text-rose-400"
                                      title="Delete project"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && projSessions.length > 0 && (
                                  <div className="space-y-0.5 pl-3">
                                    {projSessions.map(renderSessionRow)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </aside>

        {/* MAIN WORKSPACE STAGE */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#13110F] relative overflow-hidden">
          {activeView === "workspaces" ? (
            <WorkspacesView
              workspaces={workspaceSummaries}
              activeWorkspaceId={currentSessionId}
              projectName={activeProject?.name || "Workspace"}
              branches={gitBranches}
              activeBranch={activeBranch}
              isLight={isLight}
              onSelectWorkspace={(id) => {
                setCurrentSessionId(id);
                const selected = sessions.find((s) => s.id === id);
                if (selected?.branch) setActiveBranch(selected.branch);
                if (selected?.worktreeMode) setWorktreeMode(selected.worktreeMode);
                navigateView("home");
              }}
              onCreateWorkspace={(opts) => handleCreateWorkspace(opts)}
              onDeleteWorkspace={(id) => deleteSession(id)}
            />
          ) : activeView === "plugins" ? (
            <PluginsView
              isLight={isLight}
              onRunSkillPrompt={(prompt) => {
                setInputValue(prompt);
                navigateView("home");
              }}
            />
          ) : activeView === "git" ? (
            <VersionControlView
              isLight={isLight}
              onBranchLoaded={(br, brList) => {
                setActiveBranch(br);
                setGitBranches(brList);
              }}
            />
          ) : (
            /* HOME: Clean Full-Width Chat Canvas */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="flex flex-col h-full min-h-0 overflow-hidden w-full">
                {!currentSession?.messages || currentSession.messages.length === 0 ? (
                  /* Centered Clean Composer (Matches Screenshots 2 & 6) */
                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[660px] mx-auto space-y-5">
                      {renderComposer(true)}

                      {/* Minimal Quick Action Suggestions Below Composer */}
                      <div className="px-2 pt-1 space-y-2">
                        {QUICK_ACTIONS.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(item.prompt)}
                            className="flex items-center gap-2.5 text-[13px] text-[#8E8880] hover:text-[#ECEAE6] transition-colors text-left group"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-[#78726B] group-hover:text-[#ECEAE6] shrink-0" />
                            <span>{item.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active Session Message Feed + Bottom Composer */
                  <>
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="max-w-4xl mx-auto w-full space-y-5 pb-4">
                        {currentSession.messages.map((msg) => {
                          const isUser = msg.sender === "user";
                          const isStaleEmptyAgent =
                            !isUser &&
                            msg.isAgent &&
                            msg.agentRun &&
                            msg.agentRun.status !== "running" &&
                            !msg.text?.trim() &&
                            !msg.agentRun.finalMessage?.trim() &&
                            (msg.agentRun.plan?.length || 0) === 0 &&
                            (msg.agentRun.events?.length || 0) === 0 &&
                            (msg.agentRun.filesChanged?.length || 0) === 0;
                          if (isStaleEmptyAgent) return null;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start w-full"}`}
                            >
                              {!isUser && (
                                <div className="w-7 h-7 rounded-full border border-[#2E2A25] flex items-center justify-center bg-[#1B1917] flex-shrink-0 mt-1 overflow-hidden p-1">
                                  <Image
                                    src={cdn("/images/harpy-logo-light.png")}
                                    alt="Harpy AI"
                                    width={18}
                                    height={18}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}

                              <div
                                className={`space-y-3 rounded-2xl ${
                                  isUser
                                    ? "max-w-[85%] sm:max-w-[75%] rounded-tr-sm bg-[#221F1C] border border-[#2F2B27] text-[#ECEAE6] px-4 py-3"
                                    : msg.isError
                                    ? "flex-1 min-w-0 w-full rounded-tl-sm bg-[#1F1515] border border-rose-500/40 text-rose-200 p-4 sm:p-5"
                                    : "flex-1 min-w-0 w-full rounded-tl-sm bg-[#181614] border border-[#282420] text-[#ECEAE6] p-4 sm:p-5"
                                }`}
                              >
                                {msg.attachment && (
                                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#13110F] border border-[#2E2A25] text-xs text-[#D8D3CC]">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="font-mono text-[11px] truncate max-w-xs">{msg.attachment}</span>
                                  </div>
                                )}

                                {msg.isError && (
                                  <div className="flex items-center gap-2 text-xs font-medium text-rose-400">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>Execution Error</span>
                                  </div>
                                )}

                                <div
                                  className={`text-sm ${isLight ? "text-slate-800" : "text-[#ECEAE6]"} leading-relaxed font-normal ${
                                    harpySettings.markdownStyle === "editorial" ? "font-serif" : ""
                                  }`}
                                >
                                  {msg.isAgent && msg.agentRun ? (
                                    <AgentTimeline
                                      runData={msg.agentRun}
                                      sessionId={currentSessionId}
                                      onSelectFile={(filePath) => {
                                        const match =
                                          msg.agentRun?.filesChanged?.find((f) => f.path === filePath) ||
                                          activeSessionFiles.find((f) => f.path === filePath);
                                        if (match) setReviewingDiffFile(match);
                                      }}
                                      onReviewDiff={(file) => setReviewingDiffFile(file)}
                                      onApprovePlan={() => {
                                        setAgentExecutionMode("execute");
                                        const msgIdx = currentSession.messages.findIndex((m) => m.id === msg.id);
                                        const priorUserMsg =
                                          msgIdx > 0
                                            ? currentSession.messages
                                                .slice(0, msgIdx)
                                                .reverse()
                                                .find((m) => m.sender === "user")
                                            : undefined;
                                        const approvedSpec: PlanSpecification = msg.agentRun?.planSpec || {
                                          summary: msg.text || "",
                                          steps: msg.agentRun?.plan || [],
                                          filesToCreate: [],
                                          filesToModify: [],
                                          verificationSteps: [],
                                          originalPrompt: priorUserMsg?.text || "",
                                        };
                                        handleSendMessage(
                                          priorUserMsg?.text
                                            ? `Plan approved by user. Execute the approved plan for: ${priorUserMsg.text}`
                                            : "Plan approved by user. Execute all planned tasks now.",
                                          true,
                                          false,
                                          approvedSpec
                                        );
                                      }}
                                      onResolveApproval={async (approvalId, approved) => {
                                        try {
                                          await fetch("/api/agent", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              action: "approval",
                                              sessionId: currentSessionId,
                                              approvalId,
                                              approved,
                                            }),
                                          });
                                        } catch (e) {
                                          console.error("Failed to submit approval:", e);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <MarkdownRenderer content={msg.text} />
                                  )}
                                </div>

                                {!(msg.isAgent && msg.agentRun?.status === "running" && !msg.text?.trim() && !msg.agentRun?.finalMessage?.trim()) && (
                                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#78726B] font-mono">
                                    <span>{msg.timestamp}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(msg.text || msg.agentRun?.finalMessage || "", msg.id)}
                                      className="hover:text-[#ECEAE6] transition-colors flex items-center gap-1"
                                    >
                                      {copiedId === msg.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}

                        {(() => {
                          if (!isExecuting) return null;
                          const lastMsg = currentSession.messages[currentSession.messages.length - 1];
                          const hasRunningAgentCard = Boolean(
                            lastMsg && lastMsg.isAgent && lastMsg.agentRun && lastMsg.agentRun.status === "running"
                          );
                          if (hasRunningAgentCard) return null;
                          return (
                            <div className="flex gap-3 items-start">
                              <div className="w-7 h-7 rounded-full border border-[#2E2A25] flex items-center justify-center bg-[#1B1917] flex-shrink-0 mt-1 overflow-hidden p-1">
                                <Image
                                  src={cdn("/images/harpy-logo-light.png")}
                                  alt="Harpy AI"
                                  width={18}
                                  height={18}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="bg-[#181614] border border-[#282420] rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-[#A8A199]">
                                  <Brain className="w-3.5 h-3.5 text-[#E06D44] animate-pulse" />
                                  <span className="animate-pulse">Thinking...</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div ref={chatBottomRef} />
                      </div>
                    </div>

                    {/* Docked Bottom Composer */}
                    <div className="px-4 sm:px-6 pb-4 pt-2 border-t border-[#211E1B] bg-[#13110F] shrink-0 z-20">
                      {renderComposer(false)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
        </>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          OPERATOR PROFILE MODAL
         ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {profileModalOpen && authUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[#181614] border border-[#2C2824] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative font-sans"
            >
              <div className="flex items-center justify-between border-b border-[#25221E] pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-[#8E8880]">
                    <User className="w-4 h-4" />
                    <span>Account</span>
                  </div>
                  <h3 className="font-sans font-semibold text-xl text-[#ECEAE6]">User Profile</h3>
                </div>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="p-1.5 text-[#8E8880] hover:text-[#ECEAE6] transition-colors rounded-lg hover:bg-[#221F1C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1E1B18] border border-[#2C2824]">
                {authUser.avatarUrl ? (
                  <img
                    src={authUser.avatarUrl}
                    alt={authUser.fullName}
                    className="w-14 h-14 rounded-full border border-[#3A3530] object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border border-[#3A3530] bg-[#262320] flex items-center justify-center font-sans text-xl text-[#ECEAE6] font-semibold shadow-md">
                    {authUser.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-sans text-base text-[#ECEAE6] font-semibold truncate">
                    {authUser.fullName}
                  </h4>
                  <p className="font-mono text-xs text-[#8E8880] truncate">
                    {authUser.email}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Authenticated via Supabase
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="text-[#D8D3CC] font-medium block">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter display name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#13110F] border border-[#2E2A25] focus:border-[#4A443E] focus:outline-none text-xs text-[#ECEAE6] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#D8D3CC] font-medium block">
                    User ID
                  </label>
                  <div className="p-3 rounded-xl bg-[#1E1B18] border border-[#2C2824] text-[#8E8880] font-mono text-[11px] truncate">
                    {authUser.id}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#25221E] flex items-center justify-between">
                <button
                  onClick={() => {
                    setProfileModalOpen(false);
                    handleSignOut();
                  }}
                  className="px-4 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 font-sans text-xs font-medium transition-colors"
                >
                  Sign Out
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#302B26] text-[#9E978F] hover:text-[#ECEAE6] font-sans text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isSavingProfile}
                    className="px-5 py-2 rounded-xl bg-[#ECEAE6] text-[#141210] font-sans text-xs font-semibold hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Code Agent Diff Review Modal */}
      <DiffModal
        file={reviewingDiffFile}
        onClose={() => setReviewingDiffFile(null)}
        onAccept={(file) => {
          // File change accepted
        }}
        onRevert={async (file) => {
          try {
            await fetch('/api/agent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'revert_file',
                sessionId: currentSessionId,
                userId: authUser?.id || 'anonymous',
                filePath: file.path,
                oldContent: file.oldContent,
                fileAction: file.action,
              }),
            });
            // Update local state cleanly: revert created file by removing it, revert edit by restoring oldContent
            setSessions((prev) => {
              const next = prev.map((s) => {
                if (s.id !== currentSessionId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) => {
                    if (!m.isAgent || !m.agentRun) return m;
                    return {
                      ...m,
                      agentRun: {
                        ...m.agentRun,
                        filesChanged:
                          file.action === 'created'
                            ? m.agentRun.filesChanged.filter((f) => f.path !== file.path)
                            : m.agentRun.filesChanged.filter(
                                (f) =>
                                  !(
                                    f.path === file.path &&
                                    f.action === 'edited' &&
                                    f.newContent === file.newContent &&
                                    f.oldContent === file.oldContent
                                  )
                              ),
                      },
                    };
                  }),
                };
              });
              persistSessions(next);
              return next;
            });
          } catch (e) {
            console.error('Revert file error:', e);
          }
        }}
      />

      {/* Vapi Live Voice AI Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => {
          setIsVoiceAssistantOpen(false);
          setIsVoiceAssistantDocked(false);
        }}
        isDocked={isVoiceAssistantDocked}
        onDockChange={setIsVoiceAssistantDocked}
        onActiveStateChange={(active) => setIsVoiceAssistantActive(active)}
        onTriggerAgentMode={(prompt) => {
          setAgentMode(true);
          setInputValue(prompt);
          handleSendMessage(prompt, true);
        }}
        onAddChatMessage={(text, sender) => {
          const newMsg: Message = {
            id: `msg-${Date.now()}`,
            sender,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, messages: [...s.messages, newMsg] }
                : s
            )
          );
        }}
      />

      {/* Floating Share Toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1B1917] border border-[#2E2A25] text-[#ECEAE6] text-xs shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-sans">{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
