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
  CheckCircle2,
  Sparkles,
  X,
  Trash2,
  Globe,
  Mail,
  FileText,
  Code,
  Smartphone,
  ExternalLink,
  ArrowRight,
  Copy,
  Check,
  ChevronUp,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Pin,
  PinOff,
  Pencil,
  Share2,
  MoreHorizontal,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  FolderGit2,
  Square,
  Radio,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import BrowserPanel from "@/components/BrowserPanel";
import AgentTimeline from "@/components/agent/AgentTimeline";
import DiffModal from "@/components/agent/DiffModal";
import AgentWorkspacePanel from "@/components/agent/AgentWorkspacePanel";
import VoiceAssistantModal from "@/components/voice/VoiceAssistantModal";
import ConnectorsWorkspace from "@/components/connectors/ConnectorsWorkspace";
import { AgentRunData, FileChangeRecord, AgentEvent } from "@/lib/agent/events";

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

const CONNECTORS = [
  {
    id: "gmail",
    name: "Gmail",
    desc: "Read, draft, and dispatch emails autonomously",
    status: "Connected",
    icon: Mail,
    color: "#EA4335",
  },
  {
    id: "notion",
    name: "Notion",
    desc: "Sync roadmaps, update databases & documents",
    status: "Connected",
    icon: FileText,
    color: "#FFFFFF",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    desc: "Autonomous group alerts & direct client messaging",
    status: "Connected",
    icon: Smartphone,
    color: "#25D366",
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Direct messages, campaign monitoring & inquiries",
    status: "Connected",
    icon: Globe,
    color: "#E1306C",
  },
  {
    id: "code-editor",
    name: "AI Code Editor",
    desc: "Cursor & VS Code real-time file editing & Git PRs",
    status: "Connected",
    icon: Code,
    color: "#C6A46A",
  },
  {
    id: "discord",
    name: "Discord",
    desc: "Channel bots, team pings & release notifications",
    status: "Connected",
    icon: MessageSquare,
    color: "#5865F2",
  },
  {
    id: "chrome",
    name: "Chrome Browser",
    desc: "Autonomous web browsing, forms & DOM extraction",
    status: "Connected",
    icon: Globe,
    color: "#4285F4",
  },
];

const INITIAL_SESSIONS: ChatSession[] = [];

const SUGGESTIONS = [
  {
    title: "Gmail → Notion Sync",
    desc: "Extract client inquiries from Gmail and create tasks in Notion",
    prompt: "Scan unread emails in Gmail from the last 24h, summarize action items, and create structured cards in my Notion 'Tasks' board.",
  },
  {
    title: "Discord → AI Code Editor",
    desc: "Parse bug reports from Discord and prepare code patch",
    prompt: "Read recent bug discussions in Discord #dev-bugs, locate the affected file in my AI code editor, and generate a verified unit test.",
  },
  {
    title: "Chrome → WhatsApp Alert",
    desc: "Monitor live web URLs and notify team over WhatsApp",
    prompt: "Browse our staging environment in Chrome, verify all endpoints return 200 OK, and dispatch an executive status report to WhatsApp.",
  },
  {
    title: "Multi-App Orchestration",
    desc: "Stitch Gmail, Notion, WhatsApp & Code into one mission",
    prompt: "Authenticate my tools, audit pending customer tickets across Gmail and Notion, notify the on-call engineer via WhatsApp, and stage a fix in Cursor.",
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
  const [connectorsModalOpen, setConnectorsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"models" | "appearance" | "system">("models");
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

  // Integrated AI Browser Automation State
  const [browserPanelOpen, setBrowserPanelOpen] = useState(false);
  const [browserExpanded, setBrowserExpanded] = useState(false);
  const [browserGoal, setBrowserGoal] = useState<string | undefined>(undefined);

  // Autonomous Code Agent Mode State (Cursor / Antigravity Style)
  const [agentMode, setAgentMode] = useState(false);
  const [agentExecutionMode, setAgentExecutionMode] = useState<'plan' | 'execute'>('execute');
  const [isWorkspacePanelOpen, setIsWorkspacePanelOpen] = useState(false);
  const [activeWorkspaceSessionId, setActiveWorkspaceSessionId] = useState<string | null>(null);
  const [reviewingDiffFile, setReviewingDiffFile] = useState<FileChangeRecord | null>(null);
  const [selectedWorkspaceFile, setSelectedWorkspaceFile] = useState<string | undefined>(undefined);
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

  const handleSendMessage = async (customPrompt?: string, forceAgentMode?: boolean) => {
    // If voice recording is running, stop it
    if (isRecordingRef.current) {
      stopRecording();
    }

    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend && !attachedFile) return;

    // Automatic browser mission intent detection
    const lowerText = textToSend.toLowerCase();
    const isBrowserIntent =
      lowerText.includes("browse") ||
      lowerText.includes("google search") ||
      lowerText.includes("search google") ||
      lowerText.startsWith("open ") ||
      lowerText.includes("open website") ||
      lowerText.includes("go to ") ||
      lowerText.includes("playwright") ||
      lowerText.includes("navigate to ") ||
      lowerText.includes("check website") ||
      lowerText.includes("scrape");

    if (isBrowserIntent) {
      setBrowserGoal(textToSend);
      setBrowserPanelOpen(true);
    }

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
    const isRunningAsAgent = forceAgentMode !== undefined ? forceAgentMode : agentMode;
    if (isRunningAsAgent) {
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

        // Gather all existing files from the session so the agent preserves and builds upon them
        const sessionFileMap = new Map<string, FileChangeRecord>();
        for (const m of currentSession?.messages || []) {
          if (m.isAgent && m.agentRun?.filesChanged) {
            for (const f of m.agentRun.filesChanged) {
              sessionFileMap.set(f.path, f);
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
            planMode: agentExecutionMode === 'plan',
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
                currentRun.status = agentExecutionMode === 'plan' ? 'plan_ready' : 'completed';
                // Merge session existing files with newly generated files
                const mergedMap = new Map<string, FileChangeRecord>();
                for (const ef of existingWorkspaceFiles) mergedMap.set(ef.path, ef);
                for (const nf of event.filesChanged) mergedMap.set(nf.path, nf);
                currentRun.filesChanged = Array.from(mergedMap.values());
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

  const isCustomKey = Boolean(apiKey && apiKey.trim().length > 0);
  const currentEngine = detectEngineFromKey(apiKey || "gsk_default");
  const hasActiveKey = true;
  const activeModelsList =
    customModels.length > 0 ? customModels : currentEngine ? currentEngine.models : [];

  return (
    <div className={`flex h-screen w-full bg-[#050508] text-[#E8DDC7] overflow-hidden select-none font-inter relative ${theme === "light" ? "light theme-light" : "dark theme-dark"}`} data-theme={theme}>
      {/* Mobile Backdrop for Sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ──────────────────────────────────────────────────────────
          METALLIC DEEP OBSIDIAN SIDEBAR
         ────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 flex flex-col border-r border-[#14141C] bg-[#07070B] transition-all duration-300 ease-in-out z-40 lg:z-30 shadow-2xl flex-shrink-0 ${
          sidebarOpen
            ? "w-72 max-w-[85vw] border-r translate-x-0"
            : "w-0 border-r-0 -translate-x-full lg:translate-x-0 pointer-events-none opacity-0"
        } overflow-hidden`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(198,164,106,0.025),_transparent_75%)] pointer-events-none" />

        {/* Sidebar Header: Logo & Title + Close Toggle */}
        <div className="h-14 px-4 border-b border-[#14141C] flex items-center justify-between relative z-10 flex-shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            title="Return to Home Portal"
          >
            <div className="relative w-7 h-7 rounded-full border border-[#C6A46A]/35 flex items-center justify-center bg-[#050508] p-0.5 group-hover:border-[#C6A46A] transition-colors">
              <Image
                src={cdn("/images/harpy-logo-light.png")}
                alt="HARPY AI Emblem"
                width={22}
                height={22}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-cinzel text-xs tracking-[0.2em] text-[#E8DDC7] group-hover:text-[#C6A46A] transition-colors block font-semibold leading-none">
                HARPY AI
              </span>
              <span className="font-inter text-[8px] uppercase tracking-[0.22em] text-[#C6A46A]/60 block mt-1">
                AUTONOMOUS KERNEL
              </span>
            </div>
          </Link>

          {/* Close Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#12121A] border border-transparent hover:border-[#1C1C26] transition-colors"
            title="Close sidebar (⌘B)"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-[#C6A46A]" />
          </button>
        </div>

        {/* New Mission / New Chat Button */}
        <div className="p-3.5 pb-2 relative z-10 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0D0D12] border border-[#C6A46A]/30 hover:border-[#C6A46A]/80 text-[#E8DDC7] hover:text-[#C6A46A] hover:bg-[#12121A] transition-all duration-200 shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md bg-[#C6A46A]/10 border border-[#C6A46A]/35 flex items-center justify-center text-[#C6A46A] group-hover:scale-105 transition-transform">
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span className="font-cinzel text-xs tracking-wider uppercase font-semibold">
                New Chat
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#C6A46A]/50">⌘K</span>
          </button>
        </div>

        {/* Connectors Quick Bar */}
        <div className="px-3.5 py-1.5 relative z-10 flex-shrink-0">
          <button
            onClick={() => setConnectorsModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B0B0F] border border-[#171720] hover:border-[#C6A46A]/40 transition-colors text-xs text-[#E8DDC7]/75 hover:text-[#E8DDC7] group"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Layers className="w-3.5 h-3.5 text-[#C6A46A]" />
              <span className="font-cinzel text-[11px] tracking-wider uppercase">
                Connectors
              </span>
            </div>
            <ExternalLink className="w-3 h-3 text-[#C6A46A]/50 group-hover:text-[#C6A46A] transition-colors" />
          </button>
        </div>

        {/* History Thread List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1 relative z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-cinzel tracking-[0.22em] uppercase text-[#C6A46A]/60">
            <span>Mission History</span>
            <History className="w-3 h-3 opacity-50" />
          </div>

          <div className="space-y-1 pt-1">
            {(sessions || []).filter((s) => s?.messages && s.messages.length > 0).length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#E8DDC7]/30 font-light font-cinzel tracking-wider">
                No Previous Missions
              </div>
            ) : (
              (sessions || [])
                .filter((s) => s?.messages && s.messages.length > 0)
                .sort((a, b) => {
                  if (a.isPinned && !b.isPinned) return -1;
                  if (!a.isPinned && b.isPinned) return 1;
                  return 0;
                })
                .map((s) => {
                  const isActive = s.id === currentSessionId;
                  const isMenuOpen = activeMenuSessionId === s.id;
                  const isEditing = editingSessionId === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (!isEditing) {
                          setCurrentSessionId(s.id);
                          if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (!isEditing) {
                          if (e.key === "p" || e.key === "P") {
                            e.preventDefault();
                            togglePinSession(s.id);
                          } else if (e.key === "r" || e.key === "R") {
                            e.preventDefault();
                            startRenameSession(s);
                          }
                        }
                      }}
                      tabIndex={0}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 border outline-none ${
                        isActive
                          ? "bg-[#101018] border-[#C6A46A]/45 border-l-2 border-l-[#C6A46A] text-[#E8DDC7] shadow-sm"
                          : "border-transparent text-[#E8DDC7]/65 hover:bg-[#0E0E14] hover:text-[#E8DDC7] focus:bg-[#0E0E14]"
                      }`}
                    >
                      {/* Left: Icon & Title or Inline Edit */}
                      <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                        {s.isPinned ? (
                          <Pin className="w-3.5 h-3.5 flex-shrink-0 text-[#C6A46A] fill-[#C6A46A]/30" />
                        ) : (
                          <MessageSquare
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive ? "text-[#C6A46A]" : "text-[#E8DDC7]/30"
                            }`}
                          />
                        )}

                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5 flex-1 min-w-0"
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
                              className="bg-[#0A0A0F] border border-[#C6A46A]/70 rounded px-2 py-0.5 text-xs text-[#E8DDC7] w-full focus:outline-none focus:ring-1 focus:ring-[#C6A46A]"
                            />
                            <button
                              onClick={() => saveRenameSession(s.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 text-[#E8DDC7]/40 hover:text-[#E8DDC7] flex-shrink-0"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs truncate font-light font-inter">
                            {s.title}
                          </span>
                        )}
                      </div>

                      {/* Right: Actions (Pin Icon + ... Dropdown Menu) */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 flex-shrink-0 relative">
                          {/* Quick Pin Toggle button */}
                          <button
                            onClick={(e) => togglePinSession(s.id, e)}
                            className={`p-1 rounded transition-colors ${
                              s.isPinned
                                ? "text-[#C6A46A] opacity-100 hover:text-[#E2C99A]"
                                : "opacity-0 group-hover:opacity-100 text-[#E8DDC7]/40 hover:text-[#C6A46A]"
                            }`}
                            title={s.isPinned ? "Unpin (P)" : "Pin (P)"}
                          >
                            <Pin
                              className={`w-3.5 h-3.5 ${
                                s.isPinned ? "fill-[#C6A46A]/30 text-[#C6A46A]" : ""
                              }`}
                            />
                          </button>

                          {/* Three Dots Menu Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuSessionId(isMenuOpen ? null : s.id);
                            }}
                            className={`p-1 rounded-md transition-colors ${
                              isMenuOpen
                                ? "opacity-100 text-[#C6A46A] bg-[#1C1C26]"
                                : "opacity-0 group-hover:opacity-100 text-[#E8DDC7]/40 hover:text-[#E8DDC7] hover:bg-[#1C1C26]"
                            }`}
                            title="More options"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Popover */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-7 z-50 min-w-[185px] rounded-2xl bg-[#14141A] border border-[#262635] p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
                            >
                              {/* Pin / Unpin */}
                              <button
                                onClick={(e) => togglePinSession(s.id, e)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#E8DDC7]/85 hover:bg-[#1E1E28] hover:text-[#E8DDC7] transition-colors group/item"
                              >
                                <div className="flex items-center gap-2.5">
                                  {s.isPinned ? (
                                    <PinOff className="w-3.5 h-3.5 text-[#C6A46A]" />
                                  ) : (
                                    <Pin className="w-3.5 h-3.5 text-[#E8DDC7]/70 group-hover/item:text-[#C6A46A]" />
                                  )}
                                  <span>{s.isPinned ? "Unpin" : "Pin"}</span>
                                </div>
                                <span className="text-[11px] font-mono text-[#E8DDC7]/40">P</span>
                              </button>

                              {/* Rename */}
                              <button
                                onClick={(e) => startRenameSession(s, e)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#E8DDC7]/85 hover:bg-[#1E1E28] hover:text-[#E8DDC7] transition-colors group/item"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Pencil className="w-3.5 h-3.5 text-[#E8DDC7]/70 group-hover/item:text-[#C6A46A]" />
                                  <span>Rename</span>
                                </div>
                                <span className="text-[11px] font-mono text-[#E8DDC7]/40">R</span>
                              </button>

                              {/* Share */}
                              <button
                                onClick={(e) => shareSession(s, e)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#E8DDC7]/85 hover:bg-[#1E1E28] hover:text-[#E8DDC7] transition-colors group/item"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Share2 className="w-3.5 h-3.5 text-[#E8DDC7]/70 group-hover/item:text-[#C6A46A]" />
                                  <span>Share</span>
                                </div>
                              </button>

                              {/* Divider */}
                              <div className="my-1 border-t border-[#22222E]" />

                              {/* Delete */}
                              <button
                                onClick={(e) => deleteSession(s.id, e)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  <span>Delete</span>
                                </div>
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
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 pt-3 pb-8 border-t border-[#14141C] bg-[#050508] space-y-2 relative z-10 flex-shrink-0">
          {/* System Settings Button */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#E8DDC7]/70 hover:text-[#C6A46A] hover:bg-[#0E0E14] border border-transparent hover:border-[#1C1C26] transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-3.5 h-3.5 text-[#C6A46A]/80 group-hover:text-[#C6A46A]" />
              <span className="font-cinzel text-[11px] tracking-wider uppercase">System Settings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#C6A46A] uppercase px-1.5 py-0.5 rounded bg-[#C6A46A]/10 border border-[#C6A46A]/20">
                {theme === "light" ? "Light" : "Dark"}
              </span>
              <span className="text-[10px] font-mono text-[#E8DDC7]/30">v2.6</span>
            </div>
          </button>

          {/* User Profile (Below System Settings) */}
          {authUser ? (
            <div className="relative pt-0.5" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-[#09090E] border border-[#1C1C28] hover:border-[#C6A46A]/50 hover:bg-[#0E0E16] transition-all duration-200 text-left group shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                  {/* Avatar */}
                  {authUser.avatarUrl ? (
                    <img
                      src={authUser.avatarUrl}
                      alt={authUser.fullName}
                      className="w-8 h-8 rounded-full border border-[#C6A46A]/50 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-[#C6A46A]/40 bg-[#12121A] flex items-center justify-center font-cinzel text-xs text-[#C6A46A] font-semibold flex-shrink-0 shadow-sm group-hover:border-[#C6A46A] transition-colors">
                      {authUser.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name and Email */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#E8DDC7] truncate font-inter group-hover:text-[#C6A46A] transition-colors">
                        {authUser.fullName}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#E8DDC7]/45 truncate font-mono">
                      {authUser.email}
                    </p>
                  </div>
                </div>

                <div className="p-1 rounded-md text-[#E8DDC7]/40 group-hover:text-[#C6A46A] transition-colors flex-shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Upward Profile Menu Popover */}
              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute left-0 bottom-full mb-2 w-full z-50 rounded-2xl bg-[#0E0E16] border border-[#262638] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl space-y-1"
                  >
                    {/* Header inside popup */}
                    <div className="px-3 py-2 border-b border-[#1A1A26] space-y-1">
                      <p className="text-xs font-semibold text-[#E8DDC7] truncate font-inter">
                        {authUser.fullName}
                      </p>
                      <p className="text-[10px] text-[#C6A46A] font-mono truncate">
                        {authUser.email}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-[#C6A46A]/10 text-[#C6A46A] text-[9px] font-cinzel tracking-wider uppercase border border-[#C6A46A]/20">
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        {authUser.role}
                      </span>
                    </div>

                    {/* Manage Profile */}
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#E8DDC7]/85 hover:text-[#C6A46A] hover:bg-[#161622] transition-colors text-left"
                    >
                      <User className="w-3.5 h-3.5 text-[#C6A46A]" />
                      <span>Operator Profile</span>
                    </button>

                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="pt-0.5">
              <Link
                href="/started"
                className="w-full flex items-center justify-between p-2 rounded-xl border border-[#C6A46A]/30 bg-[#09090E] hover:border-[#C6A46A]/70 hover:bg-[#0E0E16] transition-all text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full border border-[#C6A46A]/40 bg-[#12121A] flex items-center justify-center text-[#C6A46A] flex-shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-cinzel tracking-wider uppercase text-[#E8DDC7] group-hover:text-[#C6A46A] transition-colors block truncate">
                      Sign In Operator
                    </span>
                    <span className="text-[9px] text-[#E8DDC7]/40 block font-light truncate">
                      Supabase Cloud Auth
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-[#C6A46A]/60 group-hover:text-[#C6A46A] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            </div>
          )}

          {/* Status Line */}
          <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-[#E8DDC7]/45 font-mono">
            <span>Kernel: Harpy v2.6</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────
          MAIN CHAT AREA (Deep Obsidian Metallic Finish)
         ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-[#050508] relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(198,164,106,0.025),_transparent_75%)] pointer-events-none" />

        {/* Top Operational Bar */}
        <header className="h-14 border-b border-[#14141C] bg-[#07070B]/90 backdrop-blur-md px-2.5 sm:px-6 flex items-center justify-between z-20 flex-shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {/* Sidebar Open Button (Only visible when sidebar is collapsed) */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-[#E8DDC7]/75 hover:text-[#C6A46A] hover:bg-[#12121A] border border-[#1C1C26] hover:border-[#C6A46A]/50 bg-[#0B0B0F] transition-all flex items-center justify-center shadow-sm group shrink-0"
                title="Open sidebar (⌘B)"
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4 text-[#C6A46A] group-hover:scale-105 transition-transform" />
              </button>
            )}

            {/* Model Badge -> Click to Open API & Models in Settings */}
            <button
              type="button"
              onClick={() => {
                setSettingsTab("models");
                setSettingsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full border border-[#1C1C26] hover:border-[#C6A46A]/50 bg-[#0B0B0F] hover:bg-[#12121A] transition-all cursor-pointer group min-w-0"
              title="Configure API Key & Models in System Settings"
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: currentEngine?.color || "#F55036" }}
              />
              <span className="font-cinzel text-[11px] sm:text-xs text-[#E8DDC7] group-hover:text-[#C6A46A] tracking-wider font-medium transition-colors truncate max-w-[110px] sm:max-w-[200px] md:max-w-none">
                <span className="hidden sm:inline">HARPY AI · </span>
                {selectedModelName.replace(/ \(Best Model\)|\(Fast\)/, "")}
              </span>
              <span className="text-[#C6A46A] text-[10px] sm:text-xs font-mono hidden md:inline">v2.6</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Agent Mode Workspace Panel Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsWorkspacePanelOpen(!isWorkspacePanelOpen);
                if (!isWorkspacePanelOpen) {
                  setBrowserPanelOpen(false);
                  setActiveWorkspaceSessionId(currentSessionId);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border transition-all cursor-pointer shrink-0 ${
                isWorkspacePanelOpen
                  ? "border-[#C6A46A] bg-[#C6A46A]/20 text-[#C6A46A] shadow-[0_0_14px_rgba(198,164,106,0.3)]"
                  : "border-[#1C1C26] hover:border-[#C6A46A]/50 bg-[#0B0B0F] text-xs text-[#E8DDC7]/75 hover:text-[#C6A46A]"
              }`}
              title="Open Autonomous Code Workspace & Files"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-[#C6A46A] shrink-0" />
              <span className="font-cinzel text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold">
                Workspace
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            </button>

            {/* Browser Agent Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setBrowserPanelOpen(!browserPanelOpen);
                if (!browserPanelOpen) setIsWorkspacePanelOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border transition-all cursor-pointer shrink-0 ${
                browserPanelOpen
                  ? "border-[#C6A46A] bg-[#C6A46A]/20 text-[#C6A46A] shadow-[0_0_14px_rgba(198,164,106,0.3)]"
                  : "border-[#1C1C26] hover:border-[#C6A46A]/50 bg-[#0B0B0F] text-xs text-[#E8DDC7]/75 hover:text-[#C6A46A]"
              }`}
              title="Open Autonomous AI Browser Panel"
            >
              <Compass className={`w-3.5 h-3.5 text-[#C6A46A] shrink-0 ${browserPanelOpen ? "animate-spin" : ""}`} />
              <span className="font-cinzel text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold">
                <span className="hidden sm:inline">Browser </span>Agent
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </button>

            {/* Return to Home Portal */}
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-cinzel uppercase tracking-widest text-[#C6A46A] hover:text-[#E2C99A] border-b border-[#C6A46A]/30 pb-0.5 transition-colors shrink-0"
            >
              <span className="hidden xs:inline">Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Split Screen Container: Left (Chat Area) & Right (Browser Panel / Workspace Panel) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
          {/* Chat Container */}
          <div
            className={`flex flex-col h-full min-h-0 overflow-hidden transition-all duration-300 ${
              (browserPanelOpen || isWorkspacePanelOpen) && !browserExpanded
                ? "hidden lg:flex lg:w-1/2 border-r border-[#14141C]"
                : browserExpanded
                ? "hidden"
                : "w-full"
            }`}
          >
            {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 z-10 flex flex-col [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(!currentSession?.messages || currentSession.messages.length === 0) ? (
            /* Centered Greeting */
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-6 sm:py-8">
              <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl w-full mx-auto text-center space-y-8 px-2">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3.5"
                >
                  <div className="w-14 h-14 rounded-full border border-[#C6A46A]/40 flex items-center justify-center mx-auto bg-[#0B0B0F] shadow-[0_0_24px_rgba(198,164,106,0.12)]">
                    <Image
                      src={cdn("/images/harpy-logo-light.png")}
                      alt="Harpy AI"
                      width={38}
                      height={38}
                      className="object-contain"
                    />
                  </div>

                  <div className="space-y-2">
                    <h1 className="font-cinzel text-3xl sm:text-4xl text-[#E8DDC7] font-normal tracking-wide">
                      Where Shall We Take Flight?
                    </h1>
                    <p className="font-cormorant italic text-lg sm:text-xl text-[#E8DDC7]/65 max-w-xl mx-auto">
                      &ldquo;One agent. Authenticated across Gmail, Notion, WhatsApp, Discord, Code &amp; Chrome.&rdquo;
                    </p>
                  </div>
                </motion.div>

                {/* Suggestion Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
                  {SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.title.toLowerCase().includes("chrome")) {
                          setBrowserGoal("Browse our staging environment in Chrome, verify all endpoints return 200 OK, and dispatch an executive status report to WhatsApp.");
                          setBrowserPanelOpen(true);
                        }
                        handleSendMessage(item.prompt);
                      }}
                      className="p-4 rounded-xl bg-[#09090E] border border-[#171722] hover:border-[#C6A46A]/50 hover:bg-[#0E0E16] transition-all duration-200 text-left flex flex-col justify-between group shadow-sm hover:shadow-[0_0_20px_rgba(198,164,106,0.08)] min-h-[96px]"
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className="font-cinzel text-xs text-[#C6A46A] tracking-wider uppercase font-semibold">
                          {item.title}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#C6A46A]/40 group-hover:text-[#C6A46A] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                      <p className="font-inter text-xs text-[#E8DDC7]/60 leading-relaxed font-light">
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Populated Message History (Wider frame for rich AI outputs) */
            <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto w-full space-y-6 pb-4">
              {currentSession.messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start w-full"}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full border border-[#C6A46A]/35 flex items-center justify-center bg-[#0B0B10] flex-shrink-0 mt-1 shadow-sm">
                        <Image
                          src={cdn("/images/harpy-logo-light.png")}
                          alt="Harpy AI"
                          width={18}
                          height={18}
                          className="object-contain"
                        />
                      </div>
                    )}

                    <div
                      className={`space-y-3 rounded-2xl ${
                        isUser
                          ? "max-w-[85%] sm:max-w-[75%] rounded-tr-sm bg-[#12121A] border border-[#22222E] text-[#E8DDC7] p-4 shadow-md"
                          : msg.isError
                          ? "flex-1 min-w-0 w-full rounded-tl-sm bg-[#180F12] border border-red-500/40 text-red-200 p-5 sm:p-6 shadow-lg"
                          : "flex-1 min-w-0 w-full rounded-tl-sm bg-[#0B0B10] border border-[#C6A46A]/25 text-[#E8DDC7] p-5 sm:p-6 shadow-lg"
                      }`}
                    >
                      {/* Attached File Pill */}
                      {msg.attachment && (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#050508] border border-[#C6A46A]/30 text-xs text-[#C6A46A]">
                          <Paperclip className="w-3 h-3" />
                          <span className="font-mono text-[11px] truncate max-w-xs">{msg.attachment}</span>
                        </div>
                      )}

                      {/* Error Indicator */}
                      {msg.isError && (
                        <div className="flex items-center gap-2 text-xs font-cinzel text-red-400 uppercase tracking-wider">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Kernel Execution Notice</span>
                        </div>
                      )}

                      {/* Message Content with Rich Markdown Rendering or Agent Timeline */}
                      <div className="text-sm text-[#E8DDC7]/90 leading-relaxed font-light">
                        {msg.isAgent && msg.agentRun ? (
                          <AgentTimeline
                            runData={msg.agentRun}
                            sessionId={currentSessionId}
                            onSelectFile={(filePath) => {
                              setSelectedWorkspaceFile(filePath);
                              setActiveWorkspaceSessionId(currentSessionId);
                              setIsWorkspacePanelOpen(true);
                              setBrowserPanelOpen(false);
                            }}
                            onReviewDiff={(file) => setReviewingDiffFile(file)}
                            onApprovePlan={() => {
                              setAgentExecutionMode('execute');
                              handleSendMessage('Plan approved by user. Execute all planned tasks now.', true);
                            }}
                            onResolveApproval={async (approvalId, approved) => {
                              try {
                                await fetch('/api/agent', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'approval',
                                    sessionId: currentSessionId,
                                    approvalId,
                                    approved,
                                  }),
                                });
                              } catch (e) {
                                console.error('Failed to submit approval:', e);
                              }
                            }}
                          />
                        ) : (
                          <MarkdownRenderer content={msg.text} />
                        )}
                      </div>

                      {/* Bottom Message Bar */}
                      <div className="flex items-center justify-between pt-1 text-[10px] text-[#E8DDC7]/40 font-mono">
                        <span>{msg.timestamp}</span>
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="hover:text-[#C6A46A] transition-colors flex items-center gap-1"
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

              {/* Live Autonomous Execution Indicator */}
              {isExecuting && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-start"
                >
                  <div className="w-7 h-7 rounded-full border border-[#C6A46A]/40 flex items-center justify-center bg-[#0B0B10] flex-shrink-0 mt-1 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A46A]" />
                  </div>
                  <div className="bg-[#0B0B10] border border-[#C6A46A]/30 rounded-2xl rounded-tl-sm p-4 space-y-1.5 shadow-lg">
                    <div className="flex items-center gap-2 text-xs font-cinzel text-[#C6A46A] tracking-wider uppercase">
                      <span className="w-2 h-2 rounded-full bg-[#C6A46A] animate-ping" />
                      <span>{selectedModelName} Executing...</span>
                    </div>
                    <p className="font-mono text-xs text-[#E8DDC7]/60">
                      &gt; streaming sovereign reasoning across authenticated app connectors
                    </p>
                  </div>
                </motion.div>
              )}

              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────
            CHAT INPUT: Centerpiece with Upward Model Selector
           ────────────────────────────────────────────────────────── */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-t from-[#050508] via-[#050508]/95 to-transparent z-20 flex-shrink-0">
          <div className="max-w-5xl xl:max-w-6xl 2xl:max-w-[1360px] mx-auto w-full">
            {/* Attachment preview banner */}
            {attachedFile && (
              <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0E0E14] border border-[#C6A46A]/30 text-xs text-[#C6A46A]">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="font-mono truncate">{attachedFile}</span>
                </div>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="hover:text-red-400 p-0.5"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Real-time Voice Recording Status Bar */}
            {isRecording && (
              <div className="mb-2 flex items-center justify-between px-3.5 py-2 rounded-xl bg-red-950/40 border border-red-500/40 backdrop-blur-md animate-fadeIn shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-medium text-red-200">
                    {voiceStatus || "Listening... speak into your microphone"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-2.5 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            {/* Voice Input Error Banner */}
            {voiceError && (
              <div className="mb-2 flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#2A1515] border border-red-500/50 text-red-200 text-xs shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="leading-snug">{voiceError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVoiceError(null)}
                  className="text-red-400 hover:text-red-200 text-sm ml-2 font-bold px-1"
                  aria-label="Dismiss voice error"
                >
                  ×
                </button>
              </div>
            )}

            {/* Input Box Shell */}
            <div
              className={`relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl transition-all duration-200 ${
                isLight
                  ? "bg-white border border-[#CBD5E1] shadow-sm focus-within:border-[#9A6F2E] focus-within:ring-1 focus-within:ring-[#9A6F2E]/30"
                  : "bg-[#0A0A0F] border border-[#1A1A24] shadow-2xl focus-within:border-[#C6A46A]/60 focus-within:ring-1 focus-within:ring-[#C6A46A]/20"
              }`}
            >
              {/* + (Upload Attachments) Button */}
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
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                  isLight
                    ? "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                    : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#14141C]"
                }`}
                title="Upload Attachments (+)"
                aria-label="Upload Attachments"
              >
                <Plus className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Agent Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setAgentMode(!agentMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-cinzel tracking-wider uppercase transition-all duration-200 border shrink-0 ${
                  agentMode
                    ? "bg-[#C6A46A]/20 border-[#C6A46A] text-[#C6A46A] shadow-[0_0_12px_rgba(198,164,106,0.3)] font-semibold"
                    : isLight
                    ? "bg-[#F8F9FA] border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] hover:border-[#94A3B8]"
                    : "bg-[#111118] border-[#22222E] text-[#E8DDC7]/50 hover:text-[#C6A46A] hover:border-[#C6A46A]/40"
                }`}
                title={agentMode ? "Agent Mode Active: Autonomous Senior Software Engineer" : "Switch to Agent Mode"}
              >
                <Sparkles className={`w-3.5 h-3.5 ${agentMode ? "text-[#C6A46A] animate-pulse" : ""}`} />
                <span className="hidden sm:inline">Agent Mode</span>
                <span className="sm:hidden">Agent</span>
              </button>

              {/* Plan Mode / Execute Mode Switcher when Agent Mode is Active */}
              {agentMode && (
                <button
                  type="button"
                  onClick={() => setAgentExecutionMode(agentExecutionMode === 'plan' ? 'execute' : 'plan')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all duration-200 border shrink-0 ${
                    agentExecutionMode === 'plan'
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)] font-semibold"
                      : "bg-[#C6A46A]/10 text-[#C6A46A] border-[#C6A46A]/30 hover:border-[#C6A46A]/60"
                  }`}
                  title={agentExecutionMode === 'plan' ? "Plan Mode: Formulate todos and await approval before modifying files" : "Execute Mode: Fully autonomous explore, execute, and verify"}
                >
                  <span>{agentExecutionMode === 'plan' ? 'Plan Mode' : 'Execute Mode'}</span>
                </button>
              )}

              {/* Textarea without scrollbars/sliders */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  agentMode
                    ? "Instruct Harpy Agent (e.g. 'Build a portfolio website with Next.js')..."
                    : `Instruct Harpy AI (${selectedModelName})...`
                }
                className={`flex-1 max-h-40 py-1 px-1 bg-transparent text-sm focus:outline-none resize-none font-inter font-light leading-relaxed no-scrollbar ${
                  isLight
                    ? "text-[#0F172A] placeholder-[#94A3B8]"
                    : "text-[#E8DDC7] placeholder-[#E8DDC7]/35"
                }`}
                style={{ overflowY: "hidden", resize: "none", scrollbarWidth: "none", msOverflowStyle: "none" }}
              />

              {/* MIC (Microphone Voice Input) */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  isRecording
                    ? "bg-red-500/25 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_14px_rgba(239,68,68,0.5)]"
                    : isLight
                    ? "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                    : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#14141C]"
                }`}
                title={isRecording ? "Listening... click to stop (or click Done)" : "Voice Input (Click to speak into microphone)"}
                aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
              >
                {isRecording ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Stop Button when executing in Agent Mode */}
              {isExecuting && (
                <button
                  type="button"
                  onClick={handleStopAgent}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-all duration-200 flex-shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.3)] cursor-pointer"
                  title="Stop Execution (Cancel)"
                  aria-label="Stop Execution"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-400" />
                </button>
              )}

              {/* Enter / Send Button */}
              {!isExecuting && (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={(!inputValue.trim() && !attachedFile)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    (inputValue.trim() || attachedFile)
                      ? "bg-[#C6A46A] text-[#050508] hover:bg-[#E2C99A] shadow-[0_0_12px_rgba(198,164,106,0.35)] cursor-pointer"
                      : "bg-[#14141C] text-[#E8DDC7]/20 cursor-not-allowed"
                  }`}
                  title="Send Mission (Enter)"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.4]" />
                </button>
              )}

              {/* Vapi Live Voice AI Assistant Button (Right side of Enter button) */}
              <button
                type="button"
                onClick={() => {
                  if (!isVoiceAssistantOpen) {
                    setIsVoiceAssistantOpen(true);
                    setIsVoiceAssistantDocked(false);
                  } else if (isVoiceAssistantDocked) {
                    setIsVoiceAssistantDocked(false);
                  } else {
                    setIsVoiceAssistantDocked(true);
                  }
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer ${
                  isVoiceAssistantActive
                    ? "bg-gradient-to-tr from-[#C6A46A] to-amber-200 text-[#050508] shadow-[0_0_16px_rgba(198,164,106,0.6)] animate-pulse"
                    : "bg-[#111118] text-[#C6A46A] border border-[#C6A46A]/30 hover:border-[#C6A46A] hover:bg-[#1A1A26] shadow-sm hover:shadow-[0_0_12px_rgba(198,164,106,0.25)]"
                }`}
                title={
                  isVoiceAssistantActive
                    ? isVoiceAssistantDocked
                      ? "Expand Harpy Voice Assistant"
                      : "Dock Harpy Voice Assistant to Plate"
                    : "Start Voice Assistant (Vapi AI - Multilingual Voice with Auto-Agent & Browser Action)"
                }
                aria-label="Toggle Voice Assistant"
              >
                <Radio className={`w-4 h-4 ${isVoiceAssistantActive ? "animate-pulse text-[#050508]" : "text-[#C6A46A]"}`} />
              </button>
            </div>

            {/* Disclaimer Footer Note */}
            <p className="pt-2 text-center text-[10px] sm:text-[11px] text-[#E8DDC7]/40 font-inter font-light">
              Autonomous execution powered by <span className="text-[#C6A46A] font-medium">{hasActiveKey ? selectedModelName : "Harpy Autonomous Kernel"}</span>. Press <span className="font-mono text-[#C6A46A]/70">Enter</span> to execute.
            </p>
          </div>
        </div>
      </div>

      {/* Integrated Browser Panel */}
      {browserPanelOpen && (
        <div
          className={`h-full min-h-0 transition-all duration-300 flex flex-col ${
            browserExpanded ? "w-full" : "w-full lg:w-1/2"
          }`}
        >
          <BrowserPanel
            isOpen={browserPanelOpen}
            onClose={() => setBrowserPanelOpen(false)}
            apiKey={apiKey}
            selectedModel={selectedModelId}
            initialGoal={browserGoal}
            isExpanded={browserExpanded}
            onToggleExpand={() => setBrowserExpanded(!browserExpanded)}
          />
        </div>
      )}

      {/* Integrated Autonomous Code Workspace Panel */}
      {isWorkspacePanelOpen && (
        <div className="h-full min-h-0 transition-all duration-300 flex flex-col w-full lg:w-1/2">
          <AgentWorkspacePanel
            sessionId={activeWorkspaceSessionId || currentSessionId}
            userId={authUser?.id || "anonymous"}
            userDisplayName={authUser?.fullName || authUser?.email?.split('@')[0] || 'chinmaybhatt'}
            isOpen={isWorkspacePanelOpen}
            onClose={() => setIsWorkspacePanelOpen(false)}
            theme={theme}
            selectedFilePath={selectedWorkspaceFile}
            onSelectFile={(path) => setSelectedWorkspaceFile(path)}
            filesChanged={(() => {
              const fileMap = new Map<string, FileChangeRecord>();
              for (const m of currentSession?.messages || []) {
                if (m.isAgent && m.agentRun?.filesChanged) {
                  for (const f of m.agentRun.filesChanged) {
                    fileMap.set(f.path, f);
                  }
                }
              }
              return Array.from(fileMap.values());
            })()}
            onOpenBrowserAgent={(goal) => {
              if (goal) setBrowserGoal(goal);
              setBrowserPanelOpen(true);
            }}
          />
        </div>
      )}
    </div>
  </main>

      {/* ──────────────────────────────────────────────────────────
          CONNECTORS FULL-SCREEN WORKSPACE (FIGMA-INSPIRED AUTOMATION CANVAS)
         ────────────────────────────────────────────────────────── */}
      <ConnectorsWorkspace
        isOpen={connectorsModalOpen}
        onClose={() => setConnectorsModalOpen(false)}
        theme={theme}
        onRunWorkflowFromChat={(prompt) => {
          setConnectorsModalOpen(false);
          setInputValue(prompt);
          handleSendMessage(prompt);
        }}
      />

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
              className="w-full max-w-xl bg-[#08080C] border border-[#1C1C26] rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#14141C] pb-3.5 flex-shrink-0">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-2 text-xs font-cinzel text-[#C6A46A] tracking-wider uppercase">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configuration &amp; System</span>
                  </div>
                  <h3 className="font-cinzel text-xl text-[#E8DDC7]">System Settings</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Quick Theme Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme(theme === "dark" ? "light" : "dark")}
                    className="px-2.5 py-1.5 text-[#E8DDC7]/80 hover:text-[#C6A46A] transition-all rounded-lg bg-[#0B0B10] hover:bg-[#12121A] border border-[#1C1C26] hover:border-[#C6A46A]/40 flex items-center gap-1.5 text-xs font-mono shadow-sm"
                    title={`Switch to ${theme === "dark" ? "Pure White / Light" : "Dark Metallic"} Theme`}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                        <span className="text-[11px] font-cinzel uppercase tracking-wider font-semibold">White Theme</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[11px] font-cinzel uppercase tracking-wider font-semibold">Dark Theme</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSettingsModalOpen(false)}
                    className="p-1.5 text-[#E8DDC7]/60 hover:text-[#C6A46A] transition-colors rounded-lg hover:bg-[#12121A]"
                    title="Close Settings"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-[#14141C] pb-2 flex-shrink-0 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSettingsTab("models")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-cinzel tracking-wider uppercase font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
                    settingsTab === "models"
                      ? "bg-[#C6A46A] text-[#050508] shadow-sm"
                      : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#12121A]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>API &amp; Models</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab("appearance")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-cinzel tracking-wider uppercase font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
                    settingsTab === "appearance"
                      ? "bg-[#C6A46A] text-[#050508] shadow-sm"
                      : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#12121A]"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Appearance &amp; Theme</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsTab("system")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-cinzel tracking-wider uppercase font-semibold flex items-center gap-2 transition-all flex-shrink-0 ${
                    settingsTab === "system"
                      ? "bg-[#C6A46A] text-[#050508] shadow-sm"
                      : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#12121A]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kernel &amp; Safety</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 [scrollbar-width:thin] text-xs font-inter">
                {settingsTab === "models" ? (
                  <>
                    {/* Active Status Card */}
                    <div className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full animate-pulse"
                          style={{ backgroundColor: currentEngine?.color || "#10A37F" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel text-xs font-semibold text-[#E8DDC7]">
                              {isCustomKey ? currentEngine?.providerName : "Groq Cloud (System Default)"}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 uppercase">
                              {isCustomKey ? "Custom Key" : "Default Key Active"}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#C6A46A] block mt-0.5">
                            Active Model: {selectedModelName}
                          </span>
                        </div>
                      </div>

                      {isCustomKey && (
                        <button
                          type="button"
                          onClick={handleResetToDefaultKey}
                          className="px-2.5 py-1 rounded-lg bg-[#14141C] hover:bg-red-500/20 text-[#E8DDC7]/60 hover:text-red-400 border border-[#22222E] hover:border-red-500/30 text-[11px] font-mono transition-colors"
                        >
                          Reset to Default
                        </button>
                      )}
                    </div>

                    {/* API Key Input Section */}
                    <div className="space-y-2 p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720]">
                      <div className="flex items-center justify-between">
                        <label className="font-cinzel text-xs uppercase tracking-wider text-[#C6A46A] block font-semibold">
                          Custom API Key (Optional)
                        </label>
                        <span className="text-[10px] text-[#E8DDC7]/40 font-mono">
                          Groq · OpenAI · Anthropic
                        </span>
                      </div>
                      <p className="text-[11px] text-[#E8DDC7]/60 font-light leading-relaxed">
                        Harpy runs on the high-speed default Groq API from environment. Enter your own API key below to unlock your custom models:
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
                            className="w-full py-2 pl-3 pr-9 rounded-xl bg-[#050508] border border-[#1E1E28] focus:border-[#C6A46A] text-xs font-mono text-[#E8DDC7] placeholder-[#E8DDC7]/30 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeySecret(!showKeySecret)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#E8DDC7]/40 hover:text-[#C6A46A] p-0.5"
                            title={showKeySecret ? "Hide secret" : "Show secret"}
                          >
                            {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveKey}
                          disabled={isValidatingKey || !tempKeyInput.trim()}
                          className="px-4 py-2 bg-[#C6A46A] hover:bg-[#E2C99A] text-[#050508] rounded-xl font-cinzel text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                        >
                          {isValidatingKey ? (
                            <span className="inline-block w-3.5 h-3.5 border-2 border-[#050508] border-t-transparent rounded-full animate-spin" />
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
                        <label className="font-cinzel text-xs uppercase tracking-wider text-[#C6A46A] block font-semibold">
                          Choose Model ({activeModelsList.length} Available)
                        </label>
                        <span className="text-[10px] text-[#E8DDC7]/40 font-mono">
                          Select model for missions
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
                                  ? "bg-[#14141E] border-[#C6A46A] text-[#E8DDC7] shadow-[0_0_15px_rgba(198,164,106,0.15)] ring-1 ring-[#C6A46A]/30"
                                  : "bg-[#0A0A0F] border-[#161622] text-[#E8DDC7]/70 hover:border-[#C6A46A]/50 hover:text-[#E8DDC7] hover:bg-[#101018]"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-cinzel text-xs font-semibold text-[#E8DDC7]">
                                    {m.name}
                                  </span>
                                  {m.id.includes("120b") && (
                                    <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-[#C6A46A]/20 text-[#C6A46A] font-mono border border-[#C6A46A]/40 font-medium">
                                      RECOMMENDED
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[10px]">
                                  <span className="text-emerald-400">{m.speed}</span>
                                  <span className="text-[#E8DDC7]/30">·</span>
                                  <span className="text-[#E8DDC7]/40 truncate max-w-[200px] sm:max-w-xs">{m.id}</span>
                                </div>
                              </div>

                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-[#C6A46A] flex items-center justify-center text-[#050508] flex-shrink-0 shadow-sm">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-[#22222E] flex-shrink-0 group-hover:border-[#C6A46A]/50 transition-colors" />
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
                        <label className="font-cinzel text-xs uppercase tracking-wider text-[#C6A46A] block font-semibold">
                          Interface Theme &amp; Appearance
                        </label>
                        <span className="text-[10px] text-[#C6A46A] font-mono uppercase px-2 py-0.5 rounded bg-[#C6A46A]/10 border border-[#C6A46A]/20">
                          Active: {theme === "light" ? "Pure White" : "Dark Metallic"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#E8DDC7]/65 font-light leading-relaxed">
                        Switch between deep obsidian dark mode and pure white light mode. Your selection is automatically persisted across all chat sessions, history, modals, and connectors.
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
                            ? "bg-[#14141E] border-[#C6A46A] text-[#E8DDC7] shadow-[0_0_20px_rgba(198,164,106,0.18)] ring-1 ring-[#C6A46A]/50"
                            : "bg-[#0A0A0F] border-[#161622] text-[#E8DDC7]/70 hover:border-[#C6A46A]/40 hover:bg-[#101018]"
                        }`}
                      >
                        <div className="space-y-3 w-full">
                          {/* Mini Visual Preview */}
                          <div className="h-16 w-full rounded-lg bg-[#050508] border border-[#1C1C26] p-2 flex gap-1.5 items-stretch shadow-inner">
                            <div className="w-1/4 rounded bg-[#07070B] border border-[#14141C] flex flex-col justify-between p-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#C6A46A]/60" />
                              <div className="w-full h-1 bg-[#1C1C26] rounded-full" />
                            </div>
                            <div className="flex-1 rounded bg-[#0B0B10] border border-[#171720] p-1.5 flex flex-col justify-between">
                              <div className="w-1/2 h-1.5 bg-[#C6A46A]/70 rounded-full" />
                              <div className="w-3/4 h-1 bg-[#22222E] rounded-full" />
                              <div className="w-full h-2.5 bg-[#050508] rounded border border-[#1C1C26]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Moon className="w-4 h-4 text-[#C6A46A]" />
                                <span className="font-cinzel text-xs font-semibold text-[#E8DDC7]">
                                  Dark Metallic
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono border border-[#C6A46A]/40 bg-[#C6A46A]/10 text-[#C6A46A] uppercase">
                                DEFAULT
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[#E8DDC7]/60 leading-relaxed font-light">
                              Deep obsidian canvas with warm parchment typography and gold metallic highlights.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1C1C26] flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono text-[#E8DDC7]/50">Titanium Dark</span>
                          {theme === "dark" ? (
                            <div className="w-4 h-4 rounded-full bg-[#C6A46A] flex items-center justify-center text-[#050508] shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#22222E] group-hover:border-[#C6A46A]/50 transition-colors" />
                          )}
                        </div>
                      </button>

                      {/* Pure White Theme Card */}
                      <button
                        type="button"
                        onClick={() => handleSelectTheme("light")}
                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                          theme === "light"
                            ? "bg-[#14141E] border-[#C6A46A] text-[#E8DDC7] shadow-[0_0_20px_rgba(198,164,106,0.18)] ring-1 ring-[#C6A46A]/50"
                            : "bg-[#0A0A0F] border-[#161622] text-[#E8DDC7]/70 hover:border-[#C6A46A]/40 hover:bg-[#101018]"
                        }`}
                      >
                        <div className="space-y-3 w-full">
                          {/* Mini Visual Preview */}
                          <div className="h-16 w-full rounded-lg bg-[#FFFFFF] border border-[#E2E4E9] p-2 flex gap-1.5 items-stretch shadow-inner">
                            <div className="w-1/4 rounded bg-[#F1F3F6] border border-[#E2E4E9] flex flex-col justify-between p-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#9A6F2E]" />
                              <div className="w-full h-1 bg-[#CBD5E1] rounded-full" />
                            </div>
                            <div className="flex-1 rounded bg-[#FFFFFF] border border-[#E2E4E9] p-1.5 flex flex-col justify-between">
                              <div className="w-1/2 h-1.5 bg-[#9A6F2E] rounded-full" />
                              <div className="w-3/4 h-1 bg-[#E2E4E9] rounded-full" />
                              <div className="w-full h-2.5 bg-[#F8F9FA] rounded border border-[#E2E4E9]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sun className="w-4 h-4 text-amber-400" />
                                <span className="font-cinzel text-xs font-semibold text-[#E8DDC7]">
                                  Pure White
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono border border-amber-500/40 bg-amber-500/10 text-amber-500 uppercase">
                                DAYLIGHT
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[#E8DDC7]/60 leading-relaxed font-light">
                              Luminous white canvas with crystal-clear slate typography and refined metallic borders.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1C1C26] flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono text-[#E8DDC7]/50">Alabaster White</span>
                          {theme === "light" ? (
                            <div className="w-4 h-4 rounded-full bg-[#C6A46A] flex items-center justify-center text-[#050508] shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-[#22222E] group-hover:border-[#C6A46A]/50 transition-colors" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Feature Details Notice */}
                    <div className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720] space-y-1">
                      <div className="flex items-center gap-2 text-[#C6A46A] font-cinzel text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sovereign Theme Synchronization</span>
                      </div>
                      <p className="text-[11px] text-[#E8DDC7]/65 leading-relaxed font-light">
                        Harpy AI preserves high-performance contrast in both modes. All autonomous capabilities including Groq inference, the Voice AI agent, Browser Automation, and Figma-style Connectors adapt instantly to your selected theme.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Kernel & Safety Details */}
                    <div className="space-y-3">
                      <div className="space-y-1.5 p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720]">
                        <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block font-semibold">
                          Active Inference Engine
                        </label>
                        <div className="flex items-center justify-between text-[#E8DDC7]">
                          <span className="font-mono text-xs">{selectedModelName} ({selectedModelId})</span>
                          <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720]">
                        <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block font-semibold">
                          Safety &amp; In-App Safeguards
                        </label>
                        <p className="text-[#E8DDC7]/80 leading-relaxed font-light">
                          Every autonomous action inside Gmail, Notion, WhatsApp, and Code Editors is verified with deterministic invariants and cognitive auditing.
                        </p>
                      </div>

                      <div className="space-y-1.5 p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720]">
                        <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block font-semibold">
                          Multi-Agent Swarm Concurrency
                        </label>
                        <div className="flex items-center justify-between text-[#E8DDC7]">
                          <span>Swarm Workers</span>
                          <span className="text-[#C6A46A] font-mono text-[11px]">MAX (8 WORKERS)</span>
                        </div>
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
                  className="px-6 py-2 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs tracking-wider uppercase font-semibold hover:bg-[#E2C99A] transition-colors shadow-md"
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
              className="w-full max-w-md bg-[#08080C] border border-[#1C1C26] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#14141C] pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-cinzel text-[#C6A46A] tracking-wider uppercase">
                    <User className="w-4 h-4" />
                    <span>Operator Identity</span>
                  </div>
                  <h3 className="font-cinzel text-xl text-[#E8DDC7]">Sovereign Profile</h3>
                </div>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="p-1.5 text-[#E8DDC7]/60 hover:text-[#C6A46A] transition-colors rounded-lg hover:bg-[#12121A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar & Key Stats */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0B0B10] border border-[#171720]">
                {authUser.avatarUrl ? (
                  <img
                    src={authUser.avatarUrl}
                    alt={authUser.fullName}
                    className="w-14 h-14 rounded-full border-2 border-[#C6A46A]/60 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-[#C6A46A]/60 bg-[#12121A] flex items-center justify-center font-cinzel text-xl text-[#C6A46A] font-semibold shadow-md">
                    {authUser.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-cinzel text-base text-[#E8DDC7] font-semibold truncate">
                    {authUser.fullName}
                  </h4>
                  <p className="font-mono text-xs text-[#E8DDC7]/60 truncate">
                    {authUser.email}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Authenticated via Supabase
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 text-xs font-inter">
                <div className="space-y-1.5">
                  <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block">
                    Display Name / Handle
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter operator handle"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0C12] border border-[#20202C] focus:border-[#C6A46A] focus:outline-none text-xs text-[#E8DDC7] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block">
                    Operator UUID
                  </label>
                  <div className="p-3 rounded-xl bg-[#0B0B10] border border-[#171720] text-[#E8DDC7]/70 font-mono text-[11px] truncate">
                    {authUser.id}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block">
                    Ecosystem Privileges
                  </label>
                  <div className="p-3 rounded-xl bg-[#0B0B10] border border-[#171720] text-[#E8DDC7] flex items-center justify-between">
                    <span>Autonomous Kernel v2.6 Access</span>
                    <span className="text-emerald-400 font-mono text-[11px]">UNRESTRICTED</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-[#14141C] flex items-center justify-between">
                <button
                  onClick={() => {
                    setProfileModalOpen(false);
                    handleSignOut();
                  }}
                  className="px-4 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 font-cinzel text-xs tracking-wider uppercase transition-colors"
                >
                  Sign Out
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#22222E] text-[#E8DDC7]/60 hover:text-[#E8DDC7] font-cinzel text-xs tracking-wider uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isSavingProfile}
                    className="px-5 py-2 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs tracking-wider uppercase font-semibold hover:bg-[#E2C99A] transition-colors disabled:opacity-50"
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
              }),
            });
            // Update local state to remove or update file change
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== currentSessionId) return s;
                return {
                  ...s,
                  messages: s.messages.map((m) => {
                    if (!m.isAgent || !m.agentRun) return m;
                    return {
                      ...m,
                      agentRun: {
                        ...m.agentRun,
                        filesChanged: m.agentRun.filesChanged.filter((f) => f.path !== file.path),
                      },
                    };
                  }),
                };
              })
            );
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
        onTriggerBrowserAgent={(goal) => {
          setBrowserGoal(goal);
          setBrowserPanelOpen(true);
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
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#14141A] border border-[#C6A46A]/50 text-[#E8DDC7] text-xs shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-[#C6A46A]" />
            <span className="font-inter font-light">{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
