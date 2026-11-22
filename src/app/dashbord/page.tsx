"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  id: string;
  sender: "user" | "harpy";
  text: string;
  timestamp: string;
  attachment?: string;
  isError?: boolean;
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
  if (clean.startsWith("gsk_")) {
    return {
      provider: "groq",
      providerName: "Groq Cloud",
      defaultModelId: "llama-3.1-8b-instant",
      defaultModelName: "Llama 3.1 8B",
      color: "#F55036",
      models: [
        { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", speed: "Ultra-Fast (700+ tok/s)" },
        { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", speed: "High Capacity" },
        { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", speed: "Fast" },
        { id: "gemma2-9b-it", name: "Gemma 2 9B", speed: "Fast" },
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
    defaultModelId: "llama-3.1-8b-instant",
    defaultModelName: "Llama 3.1 8B",
    color: "#C6A46A",
    models: [
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", speed: "Ultra-Fast" },
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Model & Auto-Detect API Key State
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedModelName, setSelectedModelName] = useState<string>("Select Model");
  const [customModels, setCustomModels] = useState<ModelItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState("");
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

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
  const dropdownRef = useRef<HTMLDivElement>(null);
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

        // Auto-migrate if old deprecated 404 model was saved
        if (savedModelId === "llama-3.3-70b-versatile" || !savedModelId) {
          savedModelId = engine.defaultModelId;
          savedModelName = engine.defaultModelName;
          try {
            localStorage.setItem("harpy_user_model_id", savedModelId);
            localStorage.setItem("harpy_user_model_name", savedModelName);
          } catch {}
        }

        setSelectedModelId(savedModelId);
        setSelectedModelName(savedModelName);

        // Query live models in background
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
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

  // Save Key & Auto-Detect Model
  const handleSaveKey = async () => {
    const clean = tempKeyInput.trim();
    if (!clean) return;

    const engine = detectEngineFromKey(clean);
    setApiKey(clean);
    setSelectedModelId(engine.defaultModelId);
    setSelectedModelName(engine.defaultModelName);
    setIsEditingKey(false);
    setIsDropdownOpen(false);

    try {
      localStorage.setItem("harpy_user_api_key", clean);
      localStorage.setItem("harpy_user_model_id", engine.defaultModelId);
      localStorage.setItem("harpy_user_model_name", engine.defaultModelName);
    } catch {}

    // Check live accessible models
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: clean, provider: engine.provider }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.models) && data.models.length > 0) {
          setCustomModels(data.models);
        }
      }
    } catch {}
  };

  const handleRemoveKey = () => {
    setApiKey("");
    setTempKeyInput("");
    setSelectedModelId("");
    setSelectedModelName("Select Model");
    setCustomModels([]);
    setIsEditingKey(false);
    try {
      localStorage.removeItem("harpy_user_api_key");
      localStorage.removeItem("harpy_user_model_id");
      localStorage.removeItem("harpy_user_model_name");
    } catch {}
  };

  const handleSelectModel = (modelId: string, modelName: string) => {
    setSelectedModelId(modelId);
    setSelectedModelName(modelName);
    setIsDropdownOpen(false);
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

  const handleSendMessage = async (customPrompt?: string) => {
    // If voice recording is running, stop it
    if (isRecordingRef.current) {
      stopRecording();
    }

    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend && !attachedFile) return;

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

    // Check if API key is present
    if (!apiKey || apiKey.trim() === "") {
      const keyPromptMsg: Message = {
        id: `harpy-need-key-${Date.now()}`,
        sender: "harpy",
        text: "Please click 'Select Model' next to the microphone to paste your API key and activate live autonomous execution.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...updatedMessages, keyPromptMsg] }
            : s
        )
      );
      setIsDropdownOpen(true);
      return;
    }

    setIsExecuting(true);

    try {
      const engine = detectEngineFromKey(apiKey);
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
          apiKey: apiKey,
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

  const currentEngine = apiKey ? detectEngineFromKey(apiKey) : null;
  const hasActiveKey = Boolean(apiKey && apiKey.trim().length > 0);
  const activeModelsList =
    customModels.length > 0 ? customModels : currentEngine ? currentEngine.models : [];

  return (
    <div className="flex h-screen w-full bg-[#050508] text-[#E8DDC7] overflow-hidden select-none font-inter">
      {/* ──────────────────────────────────────────────────────────
          METALLIC DEEP OBSIDIAN SIDEBAR
         ────────────────────────────────────────────────────────── */}
      <aside
        className={`relative flex flex-col border-r border-[#14141C] bg-[#07070B] transition-all duration-300 ease-in-out z-30 shadow-2xl flex-shrink-0 ${
          sidebarOpen ? "w-64 lg:w-72 border-r" : "w-0 border-r-0 pointer-events-none opacity-0"
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
                src="/images/harpy-logo-light.png"
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
                New Mission
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
            {sessions.filter((s) => s.messages && s.messages.length > 0).length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#E8DDC7]/30 font-light font-cinzel tracking-wider">
                No Previous Missions
              </div>
            ) : (
              sessions
                .filter((s) => s.messages && s.messages.length > 0)
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
                        if (!isEditing) setCurrentSessionId(s.id);
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
            <span className="text-[10px] font-mono text-[#E8DDC7]/30">v2.6</span>
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
        <header className="h-14 border-b border-[#14141C] bg-[#07070B]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Hamburger (Open / Close) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-[#E8DDC7]/75 hover:text-[#C6A46A] hover:bg-[#12121A] border border-[#1C1C26] hover:border-[#C6A46A]/50 bg-[#0B0B0F] transition-all flex items-center justify-center shadow-sm group"
              title={sidebarOpen ? "Collapse sidebar (⌘B)" : "Open sidebar (⌘B)"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-[#C6A46A] group-hover:scale-105 transition-transform" />
              ) : (
                <Menu className="w-4 h-4 text-[#C6A46A] group-hover:scale-105 transition-transform" />
              )}
            </button>

            {/* Model Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1C1C26] bg-[#0B0B0F]">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: hasActiveKey ? currentEngine?.color || "#10A37F" : "#C6A46A" }}
              />
              <span className="font-cinzel text-xs text-[#E8DDC7] tracking-wider font-medium">
                HARPY AI · {hasActiveKey ? selectedModelName : "Autonomous Kernel"}
              </span>
              <span className="text-[#C6A46A] text-xs font-mono">v2.6</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connected Apps Pill */}
            <button
              onClick={() => setConnectorsModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1C1C26] hover:border-[#C6A46A]/50 bg-[#0B0B0F] text-xs text-[#E8DDC7]/75 hover:text-[#C6A46A] transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-[#C6A46A]" />
              <span className="font-cinzel text-[11px] tracking-wider uppercase">7 Apps Linked</span>
            </button>

            {/* Return to Home Portal */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-cinzel uppercase tracking-widest text-[#C6A46A] hover:text-[#E2C99A] border-b border-[#C6A46A]/30 pb-0.5 transition-colors"
            >
              <span>Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 z-10 flex flex-col [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(!currentSession?.messages || currentSession.messages.length === 0) ? (
            /* Centered Greeting */
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-6 sm:py-8">
              <div className="max-w-3xl w-full mx-auto text-center space-y-8 px-2">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3.5"
                >
                  <div className="w-14 h-14 rounded-full border border-[#C6A46A]/40 flex items-center justify-center mx-auto bg-[#0B0B0F] shadow-[0_0_24px_rgba(198,164,106,0.12)]">
                    <Image
                      src="/images/harpy-logo-light.png"
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
                      onClick={() => handleSendMessage(item.prompt)}
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
            /* Populated Message History */
            <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
              {currentSession.messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full border border-[#C6A46A]/35 flex items-center justify-center bg-[#0B0B10] flex-shrink-0 mt-1 shadow-sm">
                        <Image
                          src="/images/harpy-logo-light.png"
                          alt="Harpy AI"
                          width={18}
                          height={18}
                          className="object-contain"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[80%] space-y-3 rounded-2xl ${
                        isUser
                          ? "rounded-tr-sm bg-[#12121A] border border-[#22222E] text-[#E8DDC7] p-4 shadow-md"
                          : msg.isError
                          ? "rounded-tl-sm bg-[#180F12] border border-red-500/40 text-red-200 p-5 shadow-lg"
                          : "rounded-tl-sm bg-[#0B0B10] border border-[#C6A46A]/25 text-[#E8DDC7] p-5 shadow-lg"
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

                      {/* Message Content with Rich Markdown Rendering */}
                      <div className="text-sm text-[#E8DDC7]/90 leading-relaxed font-light">
                        <MarkdownRenderer content={msg.text} />
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
          <div className="max-w-3xl mx-auto w-full">
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
            <div className="relative flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl bg-[#0A0A0F] border border-[#1A1A24] focus-within:border-[#C6A46A]/60 focus-within:ring-1 focus-within:ring-[#C6A46A]/20 transition-all duration-200 shadow-2xl">
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
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#14141C] transition-colors flex-shrink-0"
                title="Upload Attachments (+)"
                aria-label="Upload Attachments"
              >
                <Plus className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Textarea without scrollbars/sliders */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasActiveKey
                    ? `Instruct Harpy AI (${selectedModelName})...`
                    : "Instruct Harpy AI across Gmail, Notion, WhatsApp, Code, Chrome..."
                }
                className="flex-1 max-h-40 py-1 px-1 bg-transparent text-[#E8DDC7] placeholder-[#E8DDC7]/35 text-sm focus:outline-none resize-none font-inter font-light leading-relaxed no-scrollbar"
                style={{ overflowY: "hidden", resize: "none", scrollbarWidth: "none", msOverflowStyle: "none" }}
              />

              {/* ──────────────────────────────────────────────────
                  MODEL SELECTOR (Directly to the Left of MIC)
                  Opens clean UPWARD dropdown with auto-detect API Key
                 ────────────────────────────────────────────────── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 flex-shrink-0 group ${
                    hasActiveKey
                      ? "bg-[#0E0E14] border-[#C6A46A]/40 text-[#E8DDC7] hover:border-[#C6A46A] hover:bg-[#14141C]"
                      : "bg-[#14141C] border-[#22222E] text-[#E8DDC7]/80 hover:text-[#C6A46A] hover:border-[#C6A46A]/50 hover:bg-[#1A1A24]"
                  }`}
                  title="Select AI Model & API Key"
                  aria-label="Model Selector"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C6A46A]" />
                  <span className="font-cinzel text-xs font-semibold tracking-wide truncate max-w-[90px] sm:max-w-[135px]">
                    {hasActiveKey ? selectedModelName : "Select Model"}
                  </span>
                  <ChevronUp
                    className={`w-3 h-3 text-[#C6A46A]/70 group-hover:text-[#C6A46A] transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* UPWARD DROPDOWN POPOVER */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute bottom-full mb-3 right-0 w-80 sm:w-88 rounded-2xl bg-[#09090E] border border-[#1E1E28] p-4 shadow-2xl z-50 space-y-3.5 backdrop-blur-xl"
                    >
                      {!hasActiveKey ? (
                        /* State 1: No Key Added -> Simple Single Input Field */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-[#14141C]">
                            <div className="flex items-center gap-1.5 text-xs font-cinzel text-[#C6A46A] tracking-wider uppercase font-semibold">
                              <Key className="w-3.5 h-3.5" />
                              <span>Add API Key</span>
                            </div>
                            <span className="text-[10px] text-[#E8DDC7]/45 font-mono">
                              Auto-detects model
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type={showKeySecret ? "text" : "password"}
                                value={tempKeyInput}
                                onChange={(e) => setTempKeyInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveKey();
                                }}
                                placeholder="Paste API Key (e.g. gsk_...)"
                                className="w-full py-2.5 pl-3 pr-9 rounded-xl bg-[#050508] border border-[#1C1C26] focus:border-[#C6A46A] text-xs font-mono text-[#E8DDC7] placeholder-[#E8DDC7]/30 focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setShowKeySecret(!showKeySecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#E8DDC7]/40 hover:text-[#C6A46A] p-0.5"
                              >
                                {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveKey}
                              disabled={!tempKeyInput.trim()}
                              className="w-full py-2 rounded-xl bg-[#C6A46A] hover:bg-[#E2C99A] text-[#050508] font-cinzel text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                            >
                              Connect &amp; Auto-Detect Model
                            </button>
                          </div>

                          <p className="text-[10.5px] text-[#E8DDC7]/45 text-center font-light leading-relaxed">
                            Paste your key from Groq, OpenAI, or Claude. Model will be detected automatically.
                          </p>
                        </div>
                      ) : (
                        /* State 2: Key Added -> Shows Detected Engine & Models */
                        <div className="space-y-3">
                          {/* Active Status Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-[#14141C]">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full animate-pulse"
                                style={{ backgroundColor: currentEngine?.color || "#10A37F" }}
                              />
                              <span className="font-cinzel text-xs text-[#E8DDC7] font-semibold">
                                {currentEngine?.providerName} Active
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveKey}
                              className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove Key
                            </button>
                          </div>

                          {/* Available Models for this detected provider */}
                          <div className="space-y-1.5">
                            <span className="font-cinzel text-[10px] text-[#C6A46A]/80 uppercase tracking-wider block">
                              Available Models
                            </span>
                            <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              {activeModelsList.map((m) => {
                                const isSelected = selectedModelId === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleSelectModel(m.id, m.name)}
                                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                                      isSelected
                                        ? "bg-[#14141E] border-[#C6A46A] text-[#E8DDC7] shadow-sm"
                                        : "bg-[#050508] border-[#14141C] text-[#E8DDC7]/70 hover:border-[#C6A46A]/40 hover:text-[#E8DDC7]"
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <span className="font-cinzel text-xs block font-semibold">
                                        {m.name}
                                      </span>
                                      <span className="text-[10px] font-mono text-emerald-400">
                                        {m.speed}
                                      </span>
                                    </div>
                                    {isSelected && (
                                      <div className="w-4 h-4 rounded-full bg-[#C6A46A] flex items-center justify-center text-[#050508]">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Change / Update Key Accordion */}
                          <div className="pt-2 border-t border-[#14141C]">
                            <div className="flex items-center justify-between text-[11px] text-[#E8DDC7]/50 font-mono">
                              <span>Key: {apiKey.slice(0, 7)}•••••••{apiKey.slice(-4)}</span>
                              <button
                                type="button"
                                onClick={() => setIsEditingKey(!isEditingKey)}
                                className="text-[#C6A46A] hover:underline"
                              >
                                {isEditingKey ? "Cancel" : "Change Key"}
                              </button>
                            </div>

                            {isEditingKey && (
                              <div className="mt-2 flex gap-1.5 animate-fadeIn">
                                <input
                                  type="password"
                                  value={tempKeyInput}
                                  onChange={(e) => setTempKeyInput(e.target.value)}
                                  placeholder="Paste new API key..."
                                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#050508] border border-[#1E1E28] text-xs font-mono text-[#E8DDC7] focus:outline-none focus:border-[#C6A46A]"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveKey}
                                  className="px-3 py-1.5 bg-[#C6A46A] text-[#050508] rounded-lg font-cinzel text-xs font-semibold hover:bg-[#E2C99A] transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MIC (Microphone Voice Input) */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  isRecording
                    ? "bg-red-500/25 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_14px_rgba(239,68,68,0.5)]"
                    : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#14141C]"
                }`}
                title={isRecording ? "Listening... click to stop (or click Done)" : "Voice Input (Click to speak into microphone)"}
                aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
              >
                {isRecording ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Enter / Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputValue.trim() && !attachedFile) || isExecuting}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  (inputValue.trim() || attachedFile) && !isExecuting
                    ? "bg-[#C6A46A] text-[#050508] hover:bg-[#E2C99A] shadow-[0_0_12px_rgba(198,164,106,0.35)] cursor-pointer"
                    : "bg-[#14141C] text-[#E8DDC7]/20 cursor-not-allowed"
                }`}
                title="Send Mission (Enter)"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.4]" />
              </button>
            </div>

            {/* Disclaimer Footer Note */}
            <p className="pt-2 text-center text-[10px] sm:text-[11px] text-[#E8DDC7]/40 font-inter font-light">
              Autonomous execution powered by <span className="text-[#C6A46A] font-medium">{hasActiveKey ? selectedModelName : "Harpy Autonomous Kernel"}</span>. Press <span className="font-mono text-[#C6A46A]/70">Enter</span> to execute.
            </p>
          </div>
        </div>
      </main>

      {/* ──────────────────────────────────────────────────────────
          CONNECTORS MODAL (Gmail, Notion, WhatsApp, Discord, etc.)
         ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {connectorsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-2xl bg-[#08080C] border border-[#1C1C26] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#14141C] pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-cinzel text-[#C6A46A] tracking-wider uppercase">
                    <Layers className="w-4 h-4" />
                    <span>Application Connectors</span>
                  </div>
                  <h3 className="font-cinzel text-xl text-[#E8DDC7]">Connected Ecosystem</h3>
                </div>
                <button
                  onClick={() => setConnectorsModalOpen(false)}
                  className="p-1.5 text-[#E8DDC7]/60 hover:text-[#C6A46A] transition-colors rounded-lg hover:bg-[#12121A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CONNECTORS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-[#0B0B10] border border-[#171720] flex items-center justify-between hover:border-[#C6A46A]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/5"
                          style={{ backgroundColor: `${c.color}15` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: c.color }} />
                        </div>
                        <div>
                          <h4 className="font-cinzel text-sm text-[#E8DDC7] font-semibold">
                            {c.name}
                          </h4>
                          <p className="font-inter text-xs text-[#E8DDC7]/60 font-light">
                            {c.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#14141C] flex items-center justify-between text-xs text-[#E8DDC7]/60 font-light">
                <span>All connections use secure OAuth 2.0 with zero credential storage.</span>
                <button
                  onClick={() => setConnectorsModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs tracking-wider uppercase font-semibold hover:bg-[#E2C99A] transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────
          SETTINGS MODAL
         ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {settingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-[#08080C] border border-[#1C1C26] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#14141C] pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-cinzel text-[#C6A46A] tracking-wider uppercase">
                    <Settings className="w-4 h-4" />
                    <span>Kernel Configuration</span>
                  </div>
                  <h3 className="font-cinzel text-xl text-[#E8DDC7]">System Settings</h3>
                </div>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-1.5 text-[#E8DDC7]/60 hover:text-[#C6A46A] transition-colors rounded-lg hover:bg-[#12121A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-inter">
                <div className="space-y-1.5">
                  <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block">
                    Active Inference Engine
                  </label>
                  <div className="p-3 rounded-xl bg-[#0B0B10] border border-[#171720] text-[#E8DDC7] flex items-center justify-between">
                    <span>{hasActiveKey ? selectedModelName : "Harpy Sovereign Kernel"}</span>
                    <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block">
                    Safety &amp; In-App Safeguards
                  </label>
                  <div className="p-3 rounded-xl bg-[#0B0B10] border border-[#171720] text-[#E8DDC7]/80 leading-relaxed font-light">
                    Every autonomous action inside Gmail, Notion, WhatsApp, and Code Editors is verified with deterministic invariants and cognitive auditing.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-cinzel uppercase tracking-wider text-[#C6A46A] block">
                    Latency &amp; Parallelism
                  </label>
                  <div className="p-3 rounded-xl bg-[#0B0B10] border border-[#171720] text-[#E8DDC7] flex items-center justify-between">
                    <span>Multi-Agent Swarm Concurrency</span>
                    <span className="text-[#C6A46A] font-mono text-[11px]">MAX (8 WORKERS)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#14141C] flex justify-end">
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-6 py-2 rounded-xl bg-[#C6A46A] text-[#050508] font-cinzel text-xs tracking-wider uppercase font-semibold hover:bg-[#E2C99A] transition-colors"
                >
                  Save &amp; Return
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
