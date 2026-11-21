"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "harpy";
  text: string;
  timestamp: string;
  attachment?: string;
  steps?: {
    app: string;
    action: string;
    status: "done" | "running" | "queued";
  }[];
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
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

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Sync client bug from Gmail to Notion & Patch",
    timestamp: "10:42 AM",
    messages: [
      {
        id: "m-1",
        sender: "user",
        text: "Check my unread Gmail for client bug reports, log the ticket into our Notion Sprint 24 board, and create a reproduction patch in my AI code editor.",
        timestamp: "10:42 AM",
      },
      {
        id: "m-2",
        sender: "harpy",
        text: "I have taken flight across your connected applications and completed the workflow:",
        timestamp: "10:43 AM",
        steps: [
          { app: "Gmail", action: "Parsed thread #8921 from Acquired Partners (Auth token refresh timeout)", status: "done" },
          { app: "Notion", action: "Created card #NOT-442 in 'Sprint 24 — High Priority' with reproduction logs", status: "done" },
          { app: "AI Code Editor", action: "Patched auth_service.ts with exponential backoff & committed to branch fix/token-refresh", status: "done" },
          { app: "WhatsApp", action: "Dispatched confirmation alert to @Lead-Devs group", status: "done" },
        ],
      },
    ],
  },
  {
    id: "session-2",
    title: "Discord alert & WhatsApp daily digest",
    timestamp: "Yesterday",
    messages: [
      {
        id: "m-3",
        sender: "user",
        text: "Scan Discord #announcements and send a curated digest to our WhatsApp channel.",
        timestamp: "Yesterday",
      },
      {
        id: "m-4",
        sender: "harpy",
        text: "Digest prepared and dispatched across Discord and WhatsApp channels seamlessly.",
        timestamp: "Yesterday",
        steps: [
          { app: "Discord", action: "Extracted 4 announcements from #team-announcements", status: "done" },
          { app: "WhatsApp", action: "Synthesized executive brief and delivered to Executive Circle", status: "done" },
        ],
      },
    ],
  },
  {
    id: "session-3",
    title: "Chrome competitor analysis into Notion table",
    timestamp: "3 days ago",
    messages: [
      {
        id: "m-5",
        sender: "user",
        text: "Navigate to competitor pricing pages in Chrome and extract tier changes into Notion.",
        timestamp: "3 days ago",
      },
      {
        id: "m-6",
        sender: "harpy",
        text: "Autonomous web scan complete. Notion database updated with 3 competitor tier comparisons.",
        timestamp: "3 days ago",
        steps: [
          { app: "Chrome", action: "Crawled 3 SaaS pricing matrices with headless DOM analyzer", status: "done" },
          { app: "Notion", action: "Populated 'Market Intelligence' database with diff snapshots", status: "done" },
        ],
      },
    ],
  },
];

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

export default function DashboardPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState<string>("session-1");
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [connectorsModalOpen, setConnectorsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages, isExecuting]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    const scrollH = e.target.scrollHeight;
    const newH = Math.min(scrollH, 160);
    e.target.style.height = `${newH}px`;
    e.target.style.overflowY = scrollH > 160 ? "auto" : "hidden";
  };

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Autonomous Mission",
      timestamp: "Just now",
      messages: [],
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
      textareaRef.current.focus();
    }
  };

  const handleSendMessage = (customPrompt?: string) => {
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

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, title: newTitle, messages: updatedMessages }
          : s
      )
    );

    setInputValue("");
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }

    setIsExecuting(true);

    // Simulate authentic multi-app execution response
    setTimeout(() => {
      let simulatedSteps: Message["steps"] = [
        { app: "Authentication Gateway", action: "Verifying OAuth session tokens across 7 connected apps", status: "done" },
        { app: "Gmail", action: "Scanned inbox threads matching query parameters", status: "done" },
        { app: "Notion", action: "Synchronized workspace document with action ledger", status: "done" },
        { app: "WhatsApp", action: "Dispatched automated verification notice to active contact channel", status: "done" },
        { app: "AI Code Editor", action: "Inspected local repository tree & verified deterministic invariant", status: "done" },
      ];

      if (textToSend.toLowerCase().includes("discord")) {
        simulatedSteps = [
          { app: "Discord", action: "Read incoming channel notifications from #announcements", status: "done" },
          { app: "WhatsApp", action: "Formatted digest dispatch for mobile team", status: "done" },
          { app: "Notion", action: "Archived transmission log in Knowledge Base", status: "done" },
        ];
      } else if (textToSend.toLowerCase().includes("chrome") || textToSend.toLowerCase().includes("web")) {
        simulatedSteps = [
          { app: "Chrome Browser", action: "Headless browser session navigated to target DOM", status: "done" },
          { app: "Notion", action: "Saved parsed table data into 'Market Benchmarks'", status: "done" },
          { app: "Gmail", action: "Drafted executive briefing with scraped metrics", status: "done" },
        ];
      }

      const harpyMsg: Message = {
        id: `harpy-${Date.now()}`,
        sender: "harpy",
        text: `Mission executed autonomously. Your instructions have been carried out directly inside your connected applications:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        steps: simulatedSteps,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...updatedMessages, harpyMsg] }
            : s
        )
      );
      setIsExecuting(false);
    }, 1300);
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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setInputValue((prev) =>
          prev
            ? `${prev} Summarize unread Gmail and alert Notion`
            : "Review urgent Gmail threads, create Notion cards, and ping on WhatsApp"
        );
        setIsRecording(false);
      }, 2200);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      const freshId = `session-${Date.now()}`;
      setSessions([
        {
          id: freshId,
          title: "New Autonomous Mission",
          timestamp: "Just now",
          messages: [],
        },
      ]);
      setCurrentSessionId(freshId);
    } else {
      setSessions(remaining);
      if (currentSessionId === id) {
        setCurrentSessionId(remaining[0].id);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#050508] text-[#E8DDC7] overflow-hidden select-none font-inter">
      {/* ──────────────────────────────────────────────────────────
          METALLIC DEEP OBSIDIAN SIDEBAR
         ────────────────────────────────────────────────────────── */}
      <aside
        className={`relative flex flex-col border-r border-[#14141C] bg-[#07070B] transition-all duration-300 z-30 shadow-2xl flex-shrink-0 ${
          sidebarOpen ? "w-64 lg:w-72" : "w-0 -translate-x-full lg:translate-x-0 lg:w-0"
        } overflow-hidden`}
      >
        {/* Subtle Brushed Metallic Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(198,164,106,0.025),_transparent_75%)] pointer-events-none" />

        {/* Sidebar Header: Logo & Title */}
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

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-[#E8DDC7]/60 hover:text-[#C6A46A] transition-colors"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
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
                Connectors (7 Active)
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
            {sessions.map((s) => {
              const isActive = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 border ${
                    isActive
                      ? "bg-[#101018] border-[#C6A46A]/45 border-l-2 border-l-[#C6A46A] text-[#E8DDC7] shadow-sm"
                      : "border-transparent text-[#E8DDC7]/60 hover:bg-[#0E0E14] hover:text-[#E8DDC7]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-[#C6A46A]" : "text-[#E8DDC7]/30"}`} />
                    <span className="text-xs truncate font-light font-inter">
                      {s.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 text-[#E8DDC7]/40 transition-opacity flex-shrink-0"
                    title="Delete Mission"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer: Settings & Status (With extra pb-12 so dev overlays don't cover text) */}
        <div className="p-3.5 pt-3 pb-12 border-t border-[#14141C] bg-[#050508] space-y-2 relative z-10 flex-shrink-0">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#E8DDC7]/70 hover:text-[#C6A46A] hover:bg-[#0E0E14] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#C6A46A]" />
            <span className="font-cinzel text-[11px] tracking-wider uppercase">System Settings</span>
          </button>

          <div className="flex items-center justify-between px-3 text-[10px] text-[#E8DDC7]/45 font-mono">
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
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(198,164,106,0.025),_transparent_75%)] pointer-events-none" />

        {/* Top Operational Bar */}
        <header className="h-14 border-b border-[#14141C] bg-[#07070B]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 text-[#E8DDC7]/70 hover:text-[#C6A46A] transition-colors border border-[#1C1C26] hover:border-[#C6A46A] bg-[#0B0B0F] rounded-md"
                title="Open Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Model Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1C1C26] bg-[#0B0B0F]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-cinzel text-xs text-[#E8DDC7] tracking-wider font-medium">
                HARPY AI · Autonomous Kernel
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
            /* Perfectly Centered Greeting (ChatGPT-Style Optical Alignment) */
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-6 sm:py-8">
              <div className="max-w-3xl w-full mx-auto text-center space-y-8 px-2">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3.5"
                >
                  {/* Logo Emblem with subtle gold aura */}
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

                {/* Suggestion Prompts Grid - Exactly max-w-3xl to match input box width */}
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
            /* Populated Message History - Exactly max-w-3xl to match input box width */
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

                      {/* Message Content */}
                      <p className="font-inter text-sm text-[#E8DDC7]/90 leading-relaxed font-light whitespace-pre-wrap">
                        {msg.text}
                      </p>

                      {/* Harpy Autonomous In-App Execution Steps */}
                      {msg.steps && (
                        <div className="pt-2 border-t border-[#171720] space-y-2">
                          <span className="font-cinzel text-[10px] tracking-[0.2em] uppercase text-[#C6A46A] block">
                            In-App Execution Ledger
                          </span>
                          <div className="space-y-1.5 font-mono text-xs">
                            {msg.steps.map((step, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-start gap-2.5 p-2 rounded-lg bg-[#050508] border border-[#171720]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <span className="text-[#C6A46A] font-semibold">[{step.app}]</span>{" "}
                                  <span className="text-[#E8DDC7]/80">{step.action}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                      <span>Harpy Autonomous Agent Executing Across Apps...</span>
                    </div>
                    <p className="font-mono text-xs text-[#E8DDC7]/60">
                      &gt; interfacing with Gmail, Notion, WhatsApp, Code Editor &amp; Chrome
                    </p>
                  </div>
                </motion.div>
              )}

              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────
            CHAT INPUT: ChatGPT-Style Centerpiece (Dark, Symmetrical, No Slider)
           ────────────────────────────────────────────────────────── */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-t from-[#050508] via-[#050508]/95 to-transparent z-20 flex-shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            {/* Attachment preview banner if attached */}
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

            {/* Input Box Shell (Clean, Symmetrical & Deep Metallic Dark) */}
            <div className="relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#0A0A0F] border border-[#1A1A24] focus-within:border-[#C6A46A]/60 focus-within:ring-1 focus-within:ring-[#C6A46A]/20 transition-all duration-200 shadow-2xl">
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
                placeholder="Instruct Harpy AI to execute across Gmail, Notion, WhatsApp, Code, Chrome..."
                className="flex-1 max-h-40 py-1 px-1.5 bg-transparent text-[#E8DDC7] placeholder-[#E8DDC7]/35 text-sm focus:outline-none resize-none font-inter font-light leading-relaxed no-scrollbar"
                style={{ overflowY: "hidden", resize: "none", scrollbarWidth: "none", msOverflowStyle: "none" }}
              />

              {/* MIC (Microphone Voice Input) */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                    : "text-[#E8DDC7]/60 hover:text-[#C6A46A] hover:bg-[#14141C]"
                }`}
                title={isRecording ? "Listening... click to stop" : "Voice Input (MIC)"}
                aria-label="Microphone Voice Input"
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
              HARPY AI operates autonomously inside your authenticated applications. Press <span className="font-mono text-[#C6A46A]/70">Enter</span> to execute.
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
                    Execution Model
                  </label>
                  <div className="p-3 rounded-xl bg-[#0B0B10] border border-[#171720] text-[#E8DDC7] flex items-center justify-between">
                    <span>Harpy v2.6 Sovereign (Reasoning + Autonomous Action)</span>
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
    </div>
  );
}
