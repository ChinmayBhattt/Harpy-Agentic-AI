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
  FolderPlus,
  ArrowUpDown,
  Monitor,
  Lightbulb,
  ChevronsRight,
  GitFork,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AgentTimeline from "@/components/agent/AgentTimeline";
import DiffModal from "@/components/agent/DiffModal";
import VoiceAssistantModal from "@/components/voice/VoiceAssistantModal";
import WorkspacesView, { WorkspaceSessionSummary } from "@/components/dashboard/WorkspacesView";
import PluginsView from "@/components/dashboard/PluginsView";
import VersionControlView from "@/components/dashboard/VersionControlView";
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

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  isPinned?: boolean;
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
  const [activeBranch, setActiveBranch] = useState("main");
  const [gitBranches, setGitBranches] = useState<string[]>(["main"]);
  const [worktreeMode, setWorktreeMode] = useState<"Worktree" | "Sandbox">("Worktree");
  const [deviceTarget, setDeviceTarget] = useState<"This device" | "Cloud">("This device");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAccessMenuOpen, setIsAccessMenuOpen] = useState(false);

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
  const [settingsTab, setSettingsTab] = useState<"models" | "appearance" | "system">("models");
  const [confirmDeleteAllHistory, setConfirmDeleteAllHistory] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isLight = theme === "light";
  const [isExecuting, setIsExecuting] = useState(false);

  // Sync theme with localStorage and document classes
  useEffect(() => {
    try {
      const saved = (localStorage.getItem("harpy_theme") as "dark" | "light") || "dark";
      setTheme(saved);
      applyTheme(saved);
    } catch {}
  }, []);

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

  const handleSelectTheme = (t: "dark" | "light") => {
    setTheme(t);
    applyTheme(t);
    try {
      localStorage.setItem("harpy_theme", t);
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
              Array.isArray(s.messages) &&
              s.messages.length > 0 &&
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

  // Keyboard shortcut: ⌘B / Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleNewChat = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
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

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachment: attachedFile || undefined,
    };

    const updatedMessages = [...(currentSession?.messages || []), userMsg];

    // Update session title if first message
    const isFirst = (currentSession?.messages || []).length === 0;
    const newTitle = isFirst
      ? textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "")
      : currentSession.title;

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      let next: ChatSession[];
      if (exists) {
        next = prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, title: newTitle, messages: updatedMessages }
            : s
        );
      } else {
        const newSessionItem: ChatSession = {
          id: currentSessionId,
          title: newTitle,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          messages: updatedMessages,
        };
        next = [newSessionItem, ...prev];
      }
      try {
        localStorage.setItem(
          "harpy_chat_sessions",
          JSON.stringify(next.filter((s) => s.messages.length > 0))
        );
      } catch {}
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
        try {
          localStorage.setItem('harpy_chat_sessions', JSON.stringify(next.filter((s) => s.messages.length > 0)));
        } catch {}
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
                try {
                  localStorage.setItem('harpy_chat_sessions', JSON.stringify(next.filter((s) => s.messages.length > 0)));
                } catch {}
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
          try {
            localStorage.setItem('harpy_chat_sessions', JSON.stringify(next.filter((s) => s.messages.length > 0)));
          } catch {}
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
        try {
          localStorage.setItem("harpy_chat_sessions", JSON.stringify(next.filter((s) => s.messages.length > 0)));
        } catch {}
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
      try {
        localStorage.setItem(
          "harpy_chat_sessions",
          JSON.stringify(updated.filter((s) => s.messages.length > 0))
        );
      } catch {}
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
      try {
        localStorage.setItem(
          "harpy_chat_sessions",
          JSON.stringify(updated.filter((s) => s.messages.length > 0))
        );
      } catch {}
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
      try {
        localStorage.setItem("harpy_chat_sessions", JSON.stringify(remaining.filter((s) => s.messages.length > 0)));
      } catch {}
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
    setConfirmDeleteAllHistory(false);
    setSettingsModalOpen(false);
    setShareToast("All chat history has been permanently deleted.");
    setTimeout(() => setShareToast(null), 3000);
  };

  const isCustomKey = Boolean(apiKey && apiKey.trim().length > 0);
  const currentEngine = detectEngineFromKey(apiKey || "gsk_default");
  const hasActiveKey = true;
  const activeModelsList =
    customModels.length > 0 ? customModels : currentEngine ? currentEngine.models : [];

  const workspaceSummaries: WorkspaceSessionSummary[] = (sessions || [])
    .filter((s) => s?.messages && s.messages.length > 0)
    .map((s) => {
      const fMap = new Map<string, FileChangeRecord>();
      let hasApproval = false;
      let isWorking = s.id === currentSessionId && isExecuting;
      for (const m of s.messages) {
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
        messageCount: s.messages.length,
        status: isWorking ? "working" : hasApproval ? "needs_approval" : "completed",
        files: Array.from(fMap.values()),
        branch: activeBranch,
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

  const filteredSidebarSessions = (sessions || [])
    .filter((s) => s?.messages && s.messages.length > 0)
    .filter((s) =>
      sidebarSearch.trim()
        ? s.title.toLowerCase().includes(sidebarSearch.toLowerCase())
        : true
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigateView("workspaces")}
            className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors"
            title="Switch workspace"
          >
            <span className="w-4 h-4 rounded-full bg-[#2A2622] text-[#D8D3CC] text-[10px] font-semibold inline-flex items-center justify-center">
              H
            </span>
            <span className="font-medium text-[#D8D3CC]">Harpy</span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>

          <button
            type="button"
            onClick={() => setWorktreeMode(worktreeMode === "Worktree" ? "Sandbox" : "Worktree")}
            className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors"
            title="Toggle execution isolation mode"
          >
            <GitFork className="w-3.5 h-3.5 text-[#78726B]" />
            <span>{worktreeMode}</span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>

          <button
            type="button"
            onClick={() => navigateView("git")}
            className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors font-mono"
            title="Open Version Control & GitHub"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#78726B]" />
            <span>{activeBranch}</span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDeviceTarget(deviceTarget === "This device" ? "Cloud" : "This device")}
            className="inline-flex items-center gap-1.5 hover:text-[#ECEAE6] transition-colors"
          >
            <Monitor className="w-3.5 h-3.5 text-[#78726B]" />
            <span>{deviceTarget}</span>
            <ChevronDown className="w-3 h-3 text-[#78726B]" />
          </button>
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

        {/* Voice Microphone */}
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

        {/* Voice AI Assistant Trigger */}
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
                    setSettingsTab("models");
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
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="p-1 rounded-md text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#24211E] transition-colors"
            title="Settings"
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
              onClick={() => setSettingsModalOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#78726B] hover:text-[#ECEAE6] hover:bg-[#221F1C] transition-colors"
              title="Settings & API Keys"
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
            {/* SESSIONS Row */}
            <div>
              <div className="flex items-center justify-between px-1.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#78726B]">
                <span>Sessions</span>
                <button
                  type="button"
                  onClick={() => {
                    handleNewChat();
                    navigateView("home");
                  }}
                  className="hover:text-[#ECEAE6] p-0.5 rounded"
                  title="New Session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* PROJECTS Tree */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#78726B]">
                <span>Projects</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigateView("workspaces")}
                    className="hover:text-[#ECEAE6]"
                    title="Browse Workspaces"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectsExpanded(!projectsExpanded)}
                    className="hover:text-[#ECEAE6]"
                    title="Toggle Project List"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleNewChat();
                      navigateView("home");
                    }}
                    className="hover:text-[#ECEAE6]"
                    title="New Project Workspace"
                  >
                    <FolderPlus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Project Header Row */}
              <button
                type="button"
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg text-xs font-medium text-[#D8D3CC] hover:bg-[#221F1C] transition-colors text-left"
              >
                <span className="w-4 h-4 rounded bg-[#2A2622] text-[#ECEAE6] text-[10px] font-semibold inline-flex items-center justify-center shrink-0">
                  H
                </span>
                <span className="truncate flex-1">Harpy</span>
              </button>

              {projectsExpanded && (
                <div className="space-y-0.5 pl-2">
                  {filteredSidebarSessions.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-[#6A645D]">No active sessions</div>
                  ) : (
                    filteredSidebarSessions.map((s) => {
                      const isActive = s.id === currentSessionId && activeView === "home";
                      const isMenuOpen = activeMenuSessionId === s.id;
                      const isEditing = editingSessionId === s.id;

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (!isEditing) {
                              setCurrentSessionId(s.id);
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
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE STAGE */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#13110F] relative overflow-hidden">
          {activeView === "workspaces" ? (
            <WorkspacesView
              workspaces={workspaceSummaries}
              activeWorkspaceId={currentSessionId}
              projectName="Harpy"
              isLight={isLight}
              onSelectWorkspace={(id) => {
                setCurrentSessionId(id);
                navigateView("home");
              }}
              onCreateWorkspace={() => {
                handleNewChat();
                navigateView("home");
              }}
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
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start w-full"}`}
                            >
                              {!isUser && (
                                <div className="w-7 h-7 rounded-full border border-[#2E2A25] flex items-center justify-center bg-[#1B1917] flex-shrink-0 mt-1 text-xs font-semibold text-[#ECEAE6]">
                                  H
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

                                <div className={`text-sm ${isLight ? "text-slate-800" : "text-[#ECEAE6]"} leading-relaxed font-normal`}>
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

                                <div className="flex items-center justify-between pt-1 text-[10px] text-[#78726B] font-mono">
                                  <span>{msg.timestamp}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(msg.text, msg.id)}
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
                              </div>
                            </motion.div>
                          );
                        })}

                        {isExecuting && (
                          <div className="flex gap-3 items-start">
                            <div className="w-7 h-7 rounded-full border border-[#2E2A25] flex items-center justify-center bg-[#1B1917] flex-shrink-0 mt-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#E06D44] animate-pulse" />
                            </div>
                            <div className="bg-[#181614] border border-[#282420] rounded-2xl rounded-tl-sm px-4 py-3 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-medium text-[#ECEAE6]">
                                <span className="w-2 h-2 rounded-full bg-[#E06D44] animate-ping" />
                                <span>{selectedModelName} running...</span>
                              </div>
                            </div>
                          </div>
                        )}

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
      </div>

      {/* ──────────────────────────────────────────────────────────
          SETTINGS MODAL: API & MODELS + SYSTEM CONFIG
         ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {settingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-[#181614] border border-[#2C2824] rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#25221E] pb-3.5 flex-shrink-0">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-[#8E8880]">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configuration &amp; System</span>
                  </div>
                  <h3 className="font-sans font-semibold text-xl text-[#ECEAE6]">Settings</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Quick Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme(theme === "dark" ? "light" : "dark")}
                    className="px-2.5 py-1.5 text-[#ECEAE6] hover:text-white transition-all rounded-lg bg-[#221F1C] hover:bg-[#2A2622] border border-[#302B26] flex items-center gap-1.5 text-xs font-medium shadow-sm"
                    title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-medium">Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[11px] font-medium">Dark</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSettingsModalOpen(false)}
                    className="p-1.5 text-[#8E8880] hover:text-[#ECEAE6] transition-colors rounded-lg hover:bg-[#221F1C]"
                    title="Close Settings"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-[#25221E] pb-2 flex-shrink-0 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSettingsTab("models")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all flex-shrink-0 ${
                    settingsTab === "models"
                      ? "bg-[#ECEAE6] text-[#141210] shadow-sm"
                      : "text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>API &amp; Models</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab("appearance")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all flex-shrink-0 ${
                    settingsTab === "appearance"
                      ? "bg-[#ECEAE6] text-[#141210] shadow-sm"
                      : "text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Appearance &amp; Theme</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab("system")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all flex-shrink-0 ${
                    settingsTab === "system"
                      ? "bg-[#ECEAE6] text-[#141210] shadow-sm"
                      : "text-[#8E8880] hover:text-[#ECEAE6] hover:bg-[#221F1C]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>System &amp; Data</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 [scrollbar-width:thin] text-xs font-inter">
                {settingsTab === "models" ? (
                  <>
                    {/* Active Status Card */}
                    <div className="p-3.5 rounded-xl bg-[#1E1B18] border border-[#2C2824] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full animate-pulse"
                          style={{ backgroundColor: currentEngine?.color || "#10A37F" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-xs font-semibold text-[#ECEAE6]">
                              {isCustomKey ? currentEngine?.providerName : "Groq Cloud (System Default)"}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 uppercase">
                              {isCustomKey ? "Custom Key" : "Default Key Active"}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#9E978F] block mt-0.5">
                            Active Model: {selectedModelName}
                          </span>
                        </div>
                      </div>

                      {isCustomKey && (
                        <button
                          type="button"
                          onClick={handleResetToDefaultKey}
                          className="px-2.5 py-1 rounded-lg bg-[#262320] hover:bg-red-500/20 text-[#A8A199] hover:text-red-400 border border-[#332E29] hover:border-red-500/30 text-[11px] font-mono transition-colors"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>

                    {/* API Key Input Section */}
                    <div className="space-y-2 p-3.5 rounded-xl bg-[#1E1B18] border border-[#2C2824]">
                      <div className="flex items-center justify-between">
                        <label className="font-sans text-xs text-[#ECEAE6] block font-semibold">
                          Custom API Key (Optional)
                        </label>
                        <span className="text-[10px] text-[#78726B] font-mono">
                          Groq · OpenAI · Anthropic
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E8880] leading-relaxed">
                        Harpy runs on the default Groq API from environment. Enter your own API key below to unlock custom models:
                      </p>

                      <div className="flex gap-2 pt-1">
                        <div className="relative flex-1">
                          <input
                            type={showKeySecret ? "text" : "password"}
                            value={tempKeyInput}
                            onChange={(e) => {
                              setTempKeyInput(e.target.value);
                              setKeyError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveKey();
                            }}
                            placeholder="Paste API key (e.g. gsk_... or sk-...)"
                            className="w-full py-2 pl-3 pr-9 rounded-xl bg-[#13110F] border border-[#2E2A25] focus:border-[#4A443E] text-xs font-mono text-[#ECEAE6] placeholder-[#666059] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeySecret(!showKeySecret)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78726B] hover:text-[#ECEAE6] p-0.5"
                            title={showKeySecret ? "Hide secret" : "Show secret"}
                          >
                            {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveKey}
                          disabled={isValidatingKey || !tempKeyInput.trim()}
                          className="px-4 py-2 bg-[#ECEAE6] hover:bg-white text-[#141210] rounded-xl font-sans text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                        >
                          {isValidatingKey ? (
                            <span className="inline-block w-3.5 h-3.5 border-2 border-[#141210] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Connect"
                          )}
                        </button>
                      </div>

                      {keyError && (
                        <p className="text-[11px] text-red-400 font-mono flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 inline flex-shrink-0" />
                          <span>{keyError}</span>
                        </p>
                      )}
                    </div>

                    {/* Interactive Model Selection List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-sans text-xs text-[#ECEAE6] block font-semibold">
                          Choose Model ({activeModelsList.length} Available)
                        </label>
                        <span className="text-[10px] text-[#78726B] font-mono">
                          Select default workspace model
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
                        {activeModelsList.map((m) => {
                          const isSelected = selectedModelId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectModel(m.id, m.name)}
                              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all group ${
                                isSelected
                                  ? "bg-[#262320] border-[#4A443E] text-[#ECEAE6]"
                                  : "bg-[#1B1917] border-[#282420] text-[#A8A199] hover:border-[#3A3530] hover:text-[#ECEAE6]"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-sans text-xs font-semibold text-[#ECEAE6]">
                                    {m.name}
                                  </span>
                                  {m.id.includes("120b") && (
                                    <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-[#E06D44]/15 text-[#E06D44] font-mono border border-[#E06D44]/30 font-medium">
                                      RECOMMENDED
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[10px]">
                                  <span className="text-emerald-400">{m.speed}</span>
                                  <span className="text-[#5C564F]">·</span>
                                  <span className="text-[#78726B] truncate max-w-[200px] sm:max-w-xs">{m.id}</span>
                                </div>
                              </div>

                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-[#ECEAE6] flex items-center justify-center text-[#141210] flex-shrink-0 shadow-sm">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-[#332E29] flex-shrink-0 group-hover:border-[#5C564F] transition-colors" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : settingsTab === "appearance" ? (
                  <div className="space-y-4">
                    {/* Header Details */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-sans text-xs text-[#ECEAE6] block font-semibold">
                          Interface Theme &amp; Appearance
                        </label>
                        <span className="text-[10px] text-[#D8D3CC] font-mono uppercase px-2 py-0.5 rounded bg-[#262320] border border-[#332E29]">
                          Active: {theme === "light" ? "Light" : "Dark Charcoal"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E8880] leading-relaxed">
                        Switch between the default dark charcoal studio theme and light mode across all workspaces and panels.
                      </p>
                    </div>

                    {/* Theme Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {/* Dark Theme Card */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme("dark")}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                          theme === "dark"
                            ? "bg-[#262320] border-[#4A443E] text-[#ECEAE6]"
                            : "bg-[#1B1917] border-[#282420] text-[#9E978F] hover:border-[#3A3530]"
                        }`}
                      >
                        <div className="space-y-3 w-full">
                          <div className="h-16 w-full rounded-lg bg-[#13110F] border border-[#282420] p-2 flex gap-1.5 items-stretch">
                            <div className="w-1/4 rounded bg-[#181614] border border-[#25221E] flex flex-col justify-between p-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#E06D44]" />
                              <div className="w-full h-1 bg-[#2C2824] rounded-full" />
                            </div>
                            <div className="flex-1 rounded bg-[#1B1917] border border-[#282420] p-1.5 flex flex-col justify-between">
                              <div className="w-1/2 h-1.5 bg-[#ECEAE6]/70 rounded-full" />
                              <div className="w-3/4 h-1 bg-[#2E2A25] rounded-full" />
                              <div className="w-full h-2.5 bg-[#13110F] rounded border border-[#282420]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Moon className="w-4 h-4 text-[#ECEAE6]" />
                                <span className="font-sans text-xs font-semibold text-[#ECEAE6]">
                                  Dark Charcoal
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono border border-[#38322D] bg-[#221F1C] text-[#D8D3CC] uppercase">
                                DEFAULT
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[#8E8880] leading-relaxed">
                              Clean warm charcoal workspace canvas with crisp neutral typography.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#2C2824] flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono text-[#78726B]">Studio Dark</span>
                          {theme === "dark" ? (
                            <div className="w-4 h-4 rounded-full bg-[#ECEAE6] flex items-center justify-center text-[#141210] shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#332E29] transition-colors" />
                          )}
                        </div>
                      </button>

                      {/* Pure White Theme Card */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme("light")}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                          theme === "light"
                            ? "bg-[#262320] border-[#4A443E] text-[#ECEAE6]"
                            : "bg-[#1B1917] border-[#282420] text-[#9E978F] hover:border-[#3A3530]"
                        }`}
                      >
                        <div className="space-y-3 w-full">
                          <div className="h-16 w-full rounded-lg bg-[#FFFFFF] border border-[#E2E4E9] p-2 flex gap-1.5 items-stretch">
                            <div className="w-1/4 rounded bg-[#F1F3F6] border border-[#E2E4E9] flex flex-col justify-between p-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#E06D44]" />
                              <div className="w-full h-1 bg-[#CBD5E1] rounded-full" />
                            </div>
                            <div className="flex-1 rounded bg-[#FFFFFF] border border-[#E2E4E9] p-1.5 flex flex-col justify-between">
                              <div className="w-1/2 h-1.5 bg-[#0F172A]/70 rounded-full" />
                              <div className="w-3/4 h-1 bg-[#E2E4E9] rounded-full" />
                              <div className="w-full h-2.5 bg-[#F8F9FA] rounded border border-[#E2E4E9]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sun className="w-4 h-4 text-amber-400" />
                                <span className="font-sans text-xs font-semibold text-[#ECEAE6]">
                                  Light Mode
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono border border-amber-500/40 bg-amber-500/10 text-amber-400 uppercase">
                                DAYLIGHT
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[#8E8880] leading-relaxed">
                              Clean white canvas with high-contrast slate typography.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#2C2824] flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono text-[#78726B]">Light Slate</span>
                          {theme === "light" ? (
                            <div className="w-4 h-4 rounded-full bg-[#ECEAE6] flex items-center justify-center text-[#141210] shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#332E29] transition-colors" />
                          )}
                        </div>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#1E1B18] border border-[#2C2824] space-y-1">
                      <div className="flex items-center gap-2 text-[#ECEAE6] font-sans text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-[#E06D44]" />
                        <span>Theme Synchronization</span>
                      </div>
                      <p className="text-[11px] text-[#8E8880] leading-relaxed">
                        All views including Workspaces, Plugins, Version Control, and Code Preview adapt automatically to your chosen theme.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="space-y-1.5 p-3.5 rounded-xl bg-[#1E1B18] border border-[#2C2824]">
                        <label className="font-sans text-xs text-[#ECEAE6] block font-semibold">
                          Active Inference Engine
                        </label>
                        <div className="flex items-center justify-between text-[#D8D3CC]">
                          <span className="font-mono text-xs">{selectedModelName} ({selectedModelId})</span>
                          <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 p-3.5 rounded-xl bg-[#1E1B18] border border-[#2C2824]">
                        <label className="font-sans text-xs text-[#ECEAE6] block font-semibold">
                          Workspace Safeguards
                        </label>
                        <p className="text-[#9E978F] leading-relaxed">
                          File creation, surgical edits, shell commands, and baseline preservation checks are enforced before finishing every run.
                        </p>
                      </div>

                      {/* Conversation History & Data Purge */}
                      <div className={`space-y-3 p-4 rounded-xl border transition-all ${
                        isLight ? "bg-red-50/70 border-red-200" : "bg-red-950/20 border-red-900/35"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            <label className="font-sans text-red-400 block font-semibold text-xs">
                              Delete Chat History
                            </label>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isLight
                              ? "bg-red-100 text-red-600 border-red-200"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {sessions.length} Saved {sessions.length === 1 ? "Session" : "Sessions"}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${
                          isLight ? "text-slate-600" : "text-[#9E978F]"
                        }`}>
                          Permanently clear all stored conversation transcripts and local workspace sessions. This action cannot be undone.
                        </p>

                        {!confirmDeleteAllHistory ? (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteAllHistory(true)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all font-semibold text-xs active:scale-95 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Chat History</span>
                            </button>
                          </div>
                        ) : (
                          <div className="pt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2.5 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>Are you sure? All {sessions.length} saved sessions will be permanently erased.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleClearAllChatHistory}
                                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
                              >
                                Yes, Delete All History
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAllHistory(false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  isLight
                                    ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                    : "bg-[#181824] hover:bg-[#252535] text-[#8E8B99] hover:text-white"
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#14141C] flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#ECEAE6] text-[#141210] font-sans text-xs font-semibold hover:bg-white transition-colors shadow-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              try {
                localStorage.setItem('harpy_chat_sessions', JSON.stringify(next.filter((s) => s.messages.length > 0)));
              } catch {}
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
