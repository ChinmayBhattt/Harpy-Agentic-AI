'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Sparkles,
  Hand,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Maximize2,
  Minimize2,
  X,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Compass,
  Check,
  Key,
} from 'lucide-react';
import {
  BrowserSessionState,
  BrowserStepLog,
  InteractiveElement,
  BrowserControlMode,
} from '@/lib/browser/types';

interface BrowserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
  selectedModel?: string;
  initialGoal?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function BrowserPanel({
  isOpen,
  onClose,
  apiKey,
  selectedModel,
  initialGoal,
  isExpanded = false,
  onToggleExpand,
}: BrowserPanelProps) {
  const [sessionState, setSessionState] = useState<BrowserSessionState | null>(null);
  const [logs, setLogs] = useState<BrowserStepLog[]>([]);
  const [urlInput, setUrlInput] = useState('https://www.google.com');
  const [goalInput, setGoalInput] = useState(initialGoal || '');
  const [activeTab, setActiveTab] = useState<'loop' | 'elements'>('loop');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);
  const [manualTypeText, setManualTypeText] = useState('');
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);

  const [initError, setInitError] = useState<string | null>(null);
  const [browserlessKeyInput, setBrowserlessKeyInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [hasCloudKey, setHasCloudKey] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsDrawerOpen(true);
    }
  }, []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const apiFetch = (url: string, init?: RequestInit) => {
    const key = typeof window !== 'undefined' ? localStorage.getItem('harpy_browserless_key') : null;
    const headers = new Headers(init?.headers || {});
    if (key) {
      headers.set('x-browserless-key', key);
    }
    return fetch(url, { ...init, headers });
  };

  const handleSaveBrowserlessKey = async (key: string) => {
    setIsConnecting(true);
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem('harpy_browserless_key', key);
        setHasCloudKey(true);
      } else {
        localStorage.removeItem('harpy_browserless_key');
        setHasCloudKey(false);
      }
    }
    try {
      const res = await fetch(`/api/browser?sessionId=default&browserlessKey=${encodeURIComponent(key)}`, {
        headers: key ? { 'x-browserless-key': key } : {},
      });
      const data = await res.json();
      if (data.success && data.state) {
        setSessionState(data.state);
        setInitError(null);
        setShowCloudConfig(false);
        if (data.state.url && data.state.url !== 'about:blank') {
          setUrlInput(data.state.url);
        }
      } else {
        setInitError(data.error || 'Connection failed with provided cloud browser key.');
      }
    } catch (err: any) {
      setInitError(err.message || 'Connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsConnecting(true);
    setInitError(null);
    try {
      const key = typeof window !== 'undefined' ? localStorage.getItem('harpy_browserless_key') || '' : '';
      const res = await apiFetch(`/api/browser?sessionId=default${key ? `&browserlessKey=${encodeURIComponent(key)}` : ''}`);
      const data = await res.json();
      if (data.success && data.state) {
        setSessionState(data.state);
        setInitError(null);
        if (data.state.url && data.state.url !== 'about:blank') {
          setUrlInput(data.state.url);
        }
      } else {
        setInitError(data.error || 'Could not initialize browser engine.');
      }
    } catch (err: any) {
      setInitError(err.message || 'Could not reach browser backend.');
    } finally {
      setIsConnecting(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // SSE REAL-TIME CONNECTION
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const savedKey = typeof window !== 'undefined' ? localStorage.getItem('harpy_browserless_key') : null;
    if (savedKey) {
      setHasCloudKey(true);
      setBrowserlessKeyInput(savedKey);
    }

    let eventSource: EventSource | null = null;

    try {
      const streamUrl = `/api/browser/stream?sessionId=default${savedKey ? `&browserlessKey=${encodeURIComponent(savedKey)}` : ''}`;
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('state', (e) => {
        try {
          const data = JSON.parse(e.data) as BrowserSessionState;
          setSessionState(data);
          setInitError(null);
          if (data.url && data.url !== 'about:blank') {
            setUrlInput(data.url);
          }
          if (data.logs) {
            setLogs(data.logs);
          }
        } catch (err) {
          console.error('SSE parse state error:', err);
        }
      });

      eventSource.addEventListener('log', (e) => {
        try {
          const newLog = JSON.parse(e.data) as BrowserStepLog;
          setLogs((prev) => [...prev.slice(-40), newLog]);
        } catch (err) {
          console.error('SSE parse log error:', err);
        }
      });

      eventSource.onerror = () => {
        // Fallback polling if SSE is disconnected
      };
    } catch (err) {
      console.warn('SSE connection init error:', err);
    }

    // Initial fetch
    apiFetch(`/api/browser?sessionId=default${savedKey ? `&browserlessKey=${encodeURIComponent(savedKey)}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.state) {
          setSessionState(data.state);
          setInitError(null);
          setUrlInput(data.state.url || 'https://www.google.com');
          if (data.state.logs) setLogs(data.state.logs);
        } else if (!data.success) {
          setInitError(data.error || 'Failed to initialize browser session');
        }
      })
      .catch((e) => {
        setInitError(e.message || 'Could not connect to browser backend.');
      });

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isOpen]);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'loop' && isDrawerOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab, isDrawerOpen]);

  // Auto-start initial goal if provided
  useEffect(() => {
    if (initialGoal && isOpen) {
      setGoalInput(initialGoal);
      handleStartAgent(initialGoal);
    }
  }, [initialGoal, isOpen]);

  if (!isOpen) return null;

  // ──────────────────────────────────────────────────────────
  // ACTIONS DISPATCHERS
  // ──────────────────────────────────────────────────────────
  const handleNavigate = async (targetUrl = urlInput) => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'navigate', url: targetUrl }),
      });
    } catch (e) {
      console.error('Navigate error:', e);
    }
  };

  const handleHistory = async (command: 'back' | 'forward' | 'reload') => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'history', command }),
      });
    } catch (e) {
      console.error('History error:', e);
    }
  };

  const handleSetMode = async (mode: BrowserControlMode) => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', mode }),
      });
    } catch (e) {
      console.error('Set mode error:', e);
    }
  };

  const handleStartAgent = async (goalToRun = goalInput) => {
    if (!goalToRun.trim()) return;
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_agent',
          goal: goalToRun.trim(),
          model: selectedModel,
          apiKey,
          maxSteps: 12,
        }),
      });
    } catch (e) {
      console.error('Start agent error:', e);
    }
  };

  const handleStopAgent = async () => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_agent' }),
      });
    } catch (e) {
      console.error('Stop agent error:', e);
    }
  };

  const handleConfirm = async (allowed: boolean) => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', allowed }),
      });
    } catch (e) {
      console.error('Confirm error:', e);
    }
  };

  const handleViewportClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sessionState || sessionState.controlMode !== 'manual') return;

    const imgEl = imgRef.current;
    const targetRect = imgEl ? imgEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - targetRect.left;
    const clickY = e.clientY - targetRect.top;

    if (clickX < 0 || clickY < 0 || clickX > targetRect.width || clickY > targetRect.height) return;

    // Viewport is fixed at 1280x800 in Playwright
    const scaleX = 1280 / targetRect.width;
    const scaleY = 800 / targetRect.height;

    const realX = Math.round(clickX * scaleX);
    const realY = Math.round(clickY * scaleY);

    setClickRipple({ x: clickX, y: clickY });
    setTimeout(() => setClickRipple(null), 600);

    // Detect if click landed on an interactive element
    const clickedEl = sessionState.interactiveElements?.find(
      (el) =>
        realX >= el.rect.x &&
        realX <= el.rect.x + el.rect.width &&
        realY >= el.rect.y &&
        realY <= el.rect.y + el.rect.height
    );
    if (clickedEl) {
      setSelectedElementIndex(clickedEl.index);
    }

    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_action',
          subAction: 'click',
          x: realX,
          y: realY,
          index: clickedEl ? clickedEl.index : undefined,
        }),
      });
    } catch (err) {
      console.error('Manual click error:', err);
    }
  };

  const handleManualType = async (pressEnter = true) => {
    if (!manualTypeText.trim()) return;
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_action',
          subAction: 'type',
          index: selectedElementIndex || undefined,
          text: manualTypeText,
          pressEnter,
        }),
      });
      setManualTypeText('');
    } catch (err) {
      console.error('Manual type error:', err);
    }
  };

  const handleScroll = async (direction: 'up' | 'down') => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_action',
          subAction: 'scroll',
          direction,
          amount: 500,
        }),
      });
    } catch (err) {
      console.error('Scroll error:', err);
    }
  };

  const handleReset = async () => {
    try {
      await apiFetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  const getStatusBadge = () => {
    const status = sessionState?.status || 'idle';
    switch (status) {
      case 'observing':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full animate-pulse whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Observing
          </span>
        );
      case 'planning':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full animate-pulse whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Planning
          </span>
        );
      case 'acting':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full animate-pulse whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Executing
          </span>
        );
      case 'verifying':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-full animate-pulse whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Verifying
          </span>
        );
      case 'awaiting_confirmation':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full animate-pulse whitespace-nowrap shrink-0">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Authorization
          </span>
        );
      case 'manual':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-bronze/10 border border-bronze/30 text-[#D5C2A5] rounded-full whitespace-nowrap shrink-0">
            <Hand className="w-3 h-3 text-gold" />
            Pilot
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Complete
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-red-500/10 border border-red-500/30 text-red-300 rounded-full whitespace-nowrap shrink-0">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Issue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase bg-white/5 border border-white/10 text-parchment-muted rounded-full whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            Kernel Ready
          </span>
        );
    }
  };

  const isAgentWorking =
    sessionState?.status === 'observing' ||
    sessionState?.status === 'planning' ||
    sessionState?.status === 'acting' ||
    sessionState?.status === 'verifying';

  return (
    <div
      className={`flex flex-col bg-[#0C0B0A] border border-[#2D2824] shadow-2xl transition-all duration-300 overflow-hidden ${
        isExpanded ? 'fixed inset-4 z-50 rounded-xl' : 'w-full h-full relative'
      }`}
    >
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. TOP BROWSER CONTROLS & OMNIBOX (STICKY & COMPACT) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="shrink-0 z-20 bg-[#141210] border-b border-[#2D2824] flex flex-col">
        {/* Row 1: Nav buttons, Omnibox, Window controls */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          {/* Navigation History & Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleHistory('back')}
              title="Back"
              className="p-1 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleHistory('forward')}
              title="Forward"
              className="p-1 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleHistory('reload')}
              title="Reload"
              className="p-1 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox / URL Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNavigate();
            }}
            className="flex-1 min-w-0 flex items-center bg-[#090807] border border-[#332D27] rounded-lg px-2.5 py-1 focus-within:border-gold/50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-gold/70 mr-1.5 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Search Google or enter URL..."
              className="w-full bg-transparent text-xs font-mono text-parchment focus:outline-none min-w-0"
            />
            <button
              type="submit"
              className="ml-1.5 text-xs text-gold hover:text-parchment transition-colors shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Window Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Cloud Browser Key Settings */}
            <button
              onClick={() => setShowCloudConfig(!showCloudConfig)}
              className={`p-1 rounded transition-colors ${
                hasCloudKey ? 'text-gold hover:text-white' : 'text-[#D5C2A5]/50 hover:text-white'
              }`}
              title={hasCloudKey ? 'Cloud Browser Connected (Click to manage key)' : 'Configure Cloud Browser Key for Vercel'}
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="hidden lg:flex p-1 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
                title={isExpanded ? 'Restore IDE Split' : 'Expand Panel'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
              title="Close Browser View"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cloud Browser Config Drawer */}
        {showCloudConfig && (
          <div className="bg-[#14100D] border-t border-[#332A22] p-2.5 px-3 flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gold font-cinzel font-semibold">
                <Key className="w-3 h-3 text-gold" />
                <span>Cloud Browser Configuration (Vercel / Remote)</span>
              </div>
              <button
                onClick={() => setShowCloudConfig(false)}
                className="text-[#A89885] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-parchment-muted">
              Vercel serverless containers require an external Chromium endpoint. Use a free API key from{' '}
              <a href="https://www.browserless.io" target="_blank" rel="noopener noreferrer" className="text-gold underline">browserless.io</a>{' '}
              (1,000 free sessions/mo) or configure BROWSERLESS_API_KEY in Vercel.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Paste Browserless API Key..."
                value={browserlessKeyInput}
                onChange={(e) => setBrowserlessKeyInput(e.target.value)}
                className="flex-1 bg-black/60 border border-[#332A22] rounded px-2 py-1 text-xs text-parchment font-mono focus:outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={() => handleSaveBrowserlessKey(browserlessKeyInput.trim())}
                disabled={isConnecting}
                className="px-2.5 py-1 bg-gold text-black text-xs font-semibold rounded hover:brightness-110 disabled:opacity-50 transition-all shrink-0"
              >
                {isConnecting ? 'Connecting...' : 'Save & Connect'}
              </button>
              {hasCloudKey && (
                <button
                  type="button"
                  onClick={() => handleSaveBrowserlessKey('')}
                  className="px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs rounded hover:bg-rose-500/30 transition-all shrink-0"
                  title="Clear key and revert to local Chrome"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Row 2: Status pill, Mode switcher, Stop button */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#0E0C0A] border-t border-[#1F1B17]">
          {/* Left: Status Badge */}
          <div className="shrink-0">
            {getStatusBadge()}
          </div>

          {/* Right: Mode Switcher & Stop button */}
          <div className="flex items-center gap-2 shrink-0">
            {isAgentWorking && (
              <button
                onClick={handleStopAgent}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded hover:bg-rose-500/25 transition-colors shrink-0 whitespace-nowrap"
                title="Halt active agent run"
              >
                <Square className="w-2.5 h-2.5" />
                Stop
              </button>
            )}

            <div className="flex items-center bg-[#1D1A17] border border-[#332D27] rounded-md p-0.5 shrink-0">
              <button
                onClick={() => handleSetMode('agent')}
                className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors whitespace-nowrap ${
                  sessionState?.controlMode === 'agent'
                    ? 'bg-gold/15 text-gold font-medium border border-gold/30'
                    : 'text-[#D5C2A5]/60 hover:text-white'
                }`}
                title="AI executes tasks independently"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Agent
              </button>
              <button
                onClick={() => handleSetMode('manual')}
                className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors whitespace-nowrap ${
                  sessionState?.controlMode === 'manual'
                    ? 'bg-white/10 text-white font-medium border border-white/20'
                    : 'text-[#D5C2A5]/60 hover:text-white'
                }`}
                title="Manual clicks & inputs"
              >
                <Hand className="w-2.5 h-2.5" />
                Pilot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MAIN BROWSER AREA (VIEWPORT & LIVE OVERLAY) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-0">
        {sessionState?.screenshot ? (
          <div
            ref={viewportRef}
            onClick={handleViewportClick}
            className={`relative max-w-full max-h-full aspect-[16/10] overflow-hidden select-none ${
              sessionState.controlMode === 'manual'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
          >
            {/* Live Playwright Screenshot */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={sessionState.screenshot}
              alt={sessionState.title || 'Browser Viewport'}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Click Ripple Indicator for Manual Mode */}
            {clickRipple && (
              <span
                style={{ left: clickRipple.x - 16, top: clickRipple.y - 16 }}
                className="absolute w-8 h-8 rounded-full border-2 border-gold bg-gold/20 animate-ping pointer-events-none"
              />
            )}
          </div>
        ) : initError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg w-full mx-auto my-auto animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-cinzel text-base text-parchment font-bold tracking-wide mb-1">
              Browser Engine Deployment Notice
            </h3>

            <p className="font-mono text-xs text-rose-300/90 bg-rose-950/30 border border-rose-900/40 rounded-lg p-2.5 my-2.5 text-left w-full break-words">
              {initError}
            </p>

            <div className="w-full bg-[#14110E] border border-[#2B241D] rounded-xl p-3.5 text-left space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-gold font-bold">1.</span>
                <p className="text-parchment/80">
                  <strong className="text-white">Run Locally:</strong> For native Google Chrome with zero config, run{' '}
                  <code className="text-gold bg-black/60 px-1.5 py-0.5 rounded font-mono">npm run dev</code> on your machine.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-gold font-bold">2.</span>
                <div className="space-y-1.5 w-full">
                  <p className="text-parchment/80">
                    <strong className="text-white">Vercel / Cloud Browser:</strong> Vercel serverless containers require an external browser endpoint. Get a free API key at{' '}
                    <a
                      href="https://www.browserless.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold underline hover:text-parchment font-semibold"
                    >
                      browserless.io
                    </a>{' '}
                    (1,000 free sessions/month).
                  </p>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="password"
                      placeholder="Paste Browserless API Key..."
                      value={browserlessKeyInput}
                      onChange={(e) => setBrowserlessKeyInput(e.target.value)}
                      className="flex-1 bg-black/60 border border-[#3D3328] rounded px-2.5 py-1.5 text-xs text-parchment font-mono focus:outline-none focus:border-gold"
                    />
                    <button
                      type="button"
                      disabled={!browserlessKeyInput.trim() || isConnecting}
                      onClick={() => handleSaveBrowserlessKey(browserlessKeyInput.trim())}
                      className="px-3 py-1.5 bg-gold text-black font-semibold rounded text-xs hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0"
                    >
                      {isConnecting ? <RotateCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3.5">
              <button
                type="button"
                onClick={() => handleRetryConnection()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1814] border border-[#3D3328] hover:border-gold text-parchment text-xs rounded-lg transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-gold" />
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Compass className="w-12 h-12 text-gold/40 animate-pulse" />
            <h4 className="font-cinzel text-base text-parchment">Harpy Browser Engine Initializing...</h4>
            <p className="font-inter text-xs text-parchment-muted max-w-sm">
              Spinning up isolated Playwright session with real-time DOM telemetry and autonomous visual flight controls.
            </p>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* SENSITIVE ACTION / AUTH GATE BANNER (NON-BLOCKING) */}
        {/* ────────────────────────────────────────────────────────── */}
        {sessionState?.status === 'awaiting_confirmation' && sessionState.pendingConfirmation && (
          <div className="absolute top-2 inset-x-2 bg-[#181412]/95 border-2 border-gold/70 p-2.5 rounded-xl shadow-2xl z-30 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-gold/20 rounded-lg border border-gold/40 shrink-0">
                <ShieldAlert className="w-4 h-4 text-gold" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-xs font-semibold text-white">
                    {sessionState.pendingConfirmation.action === 'login'
                      ? 'Authentication Required'
                      : 'Authorization Required'}
                  </span>
                  <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.2 rounded font-mono font-medium shrink-0">
                    Pilot Mode Active
                  </span>
                </div>
                <p className="text-[11px] text-parchment/80 font-mono truncate max-w-md">
                  {sessionState.pendingConfirmation.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleConfirm(false)}
                className="px-2.5 py-1 text-xs text-parchment/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
                title="Cancel autonomous mission"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="px-3 py-1 text-xs font-semibold text-black bg-gradient-to-r from-gold-light via-gold to-bronze hover:brightness-110 rounded shadow transition-all whitespace-nowrap"
                title="Save session & continue mission"
              >
                Resume Flight ✈️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2.5 DOCKED PILOT (MANUAL) TOOLBAR - NOT COVERING WEBPAGE */}
      {/* ────────────────────────────────────────────────────────── */}
      {sessionState?.controlMode === 'manual' && (
        <div className="w-full shrink-0 bg-[#14110E] border-t border-[#29231D] px-3 py-1.5 flex items-center justify-between gap-2 z-10">
          {/* Typing input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleManualType(true);
            }}
            className="flex-1 min-w-0 flex items-center gap-1.5 bg-[#090807] border border-gold/30 focus-within:border-gold rounded-md px-2 py-1 transition-colors"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-gold shrink-0 font-medium">
              {selectedElementIndex ? `[#${selectedElementIndex}]:` : 'Type:'}
            </span>
            <input
              type="text"
              value={manualTypeText}
              onChange={(e) => setManualTypeText(e.target.value)}
              placeholder={
                selectedElementIndex
                  ? `Type text into element #${selectedElementIndex}...`
                  : 'Click on page to focus or type text here...'
              }
              className="w-full bg-transparent text-xs text-parchment font-mono placeholder-[#6B5E51] focus:outline-none min-w-0"
            />
            <button
              type="submit"
              className="px-2 py-0.5 text-xs bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold rounded font-medium transition-colors shrink-0 whitespace-nowrap"
            >
              Send ⏎
            </button>
          </form>

          {/* Scroll Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll('up')}
              className="p-1.5 bg-[#1C1814] border border-[#332D27] hover:border-gold/40 rounded text-gold/80 hover:text-gold transition-colors"
              title="Scroll Page Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('down')}
              className="p-1.5 bg-[#1C1814] border border-[#332D27] hover:border-gold/40 rounded text-gold/80 hover:text-gold transition-colors"
              title="Scroll Page Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. AGENT REASONING & TELEMETRY DRAWER */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-[#12100E] border-t border-[#2D2824] flex flex-col shrink-0">
        {/* Drawer Header & Tabs */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#24201C] bg-[#161412] gap-1.5 shrink-0">
          {/* Left: Tab Switchers */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('loop')}
              className={`flex items-center gap-1 text-[11px] font-cinzel font-semibold transition-all py-1 px-2 rounded-md whitespace-nowrap shrink-0 ${
                activeTab === 'loop'
                  ? 'bg-gold/15 text-gold border border-gold/40 shadow-sm'
                  : 'text-[#D5C2A5]/60 hover:text-parchment hover:bg-white/5 border border-transparent'
              }`}
              title="Autonomous Loop telemetry & logs"
            >
              <Cpu className="w-3 h-3 shrink-0" />
              <span>Loop</span>
              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-black/60 text-gold font-medium ml-0.5">
                {logs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('elements')}
              className={`flex items-center gap-1 text-[11px] font-cinzel font-semibold transition-all py-1 px-2 rounded-md whitespace-nowrap shrink-0 ${
                activeTab === 'elements'
                  ? 'bg-gold/15 text-gold border border-gold/40 shadow-sm'
                  : 'text-[#D5C2A5]/60 hover:text-parchment hover:bg-white/5 border border-transparent'
              }`}
              title="Interactive DOM elements detected"
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span>DOM</span>
              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-black/60 text-[#D5C2A5] font-medium ml-0.5">
                {sessionState?.interactiveElements?.length || 0}
              </span>
            </button>
          </div>

          {/* Right: Actions (Reset + Collapse) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded-md bg-[#0E0C0A] border border-[#2D2824] text-[#D5C2A5]/70 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all shadow-sm whitespace-nowrap shrink-0"
              title="Reset session to clean Google instance"
            >
              <RotateCw className="w-2.5 h-2.5 shrink-0" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="p-1 rounded-md text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#2D2824] transition-colors shrink-0"
              title={isDrawerOpen ? "Collapse drawer" : "Expand drawer"}
            >
              {isDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isDrawerOpen && (
          <div className="max-h-36 min-h-24 overflow-y-auto p-2.5 space-y-1.5 text-xs font-mono">
            {activeTab === 'loop' ? (
              logs.length > 0 ? (
                logs.map((log) => {
                  let phaseColor = 'text-parchment-muted border-white/10 bg-white/5';
                  if (log.phase === 'OBSERVE')
                    phaseColor = 'text-amber-300 border-amber-500/30 bg-amber-500/10';
                  if (log.phase === 'PLAN')
                    phaseColor = 'text-blue-300 border-blue-500/30 bg-blue-500/10';
                  if (log.phase === 'ACT')
                    phaseColor = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
                  if (log.phase === 'VERIFY')
                    phaseColor = 'text-purple-300 border-purple-500/30 bg-purple-500/10';
                  if (log.phase === 'CONFIRMATION')
                    phaseColor = 'text-rose-300 border-rose-500/30 bg-rose-500/10';

                  return (
                    <div
                      key={log.id}
                      className="p-2 rounded bg-[#0A0908] border border-[#26211C] flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded uppercase font-bold border ${phaseColor}`}
                          >
                            {log.phase}
                          </span>
                          {log.stepNumber > 0 && (
                            <span className="text-gold/80">Step #{log.stepNumber}</span>
                          )}
                        </div>
                        <span className="text-[#8C7A6B]">{log.timestamp}</span>
                      </div>

                      {log.thought && (
                        <p className="text-parchment/90 font-sans text-xs italic">
                          &ldquo;{log.thought}&rdquo;
                        </p>
                      )}

                      {log.action && (
                        <p className="text-gold text-xs font-medium">{log.action}</p>
                      )}

                      {log.details && (
                        <p className="text-[#A89885] text-[11px]">{log.details}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-parchment-muted text-center font-sans text-xs">
                  Awaiting mission instructions. Enter a goal below to engage the agentic loop.
                </div>
              )
            ) : (
              /* Elements Inspector */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {sessionState?.interactiveElements?.map((el) => (
                  <button
                    key={el.index}
                    onClick={() => {
                      setSelectedElementIndex(el.index);
                      // In manual mode, clicking this will click the element
                      if (sessionState.controlMode === 'manual') {
                        apiFetch('/api/browser', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'manual_action',
                            subAction: 'click',
                            index: el.index,
                          }),
                        });
                      }
                    }}
                    className={`text-left p-2 rounded border transition-colors flex items-center justify-between ${
                      selectedElementIndex === el.index
                        ? 'bg-gold/15 border-gold text-gold'
                        : 'bg-[#0A0908] border-[#26211C] text-[#C4B59D] hover:border-gold/40'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold text-gold mr-1.5">[{el.index}]</span>
                      <span className="text-parchment font-semibold">{`<${el.tag}>`}</span>{' '}
                      <span className="text-xs text-[#9E8E7D]">{el.text || el.placeholder || ''}</span>
                    </div>
                    {el.isSensitive && (
                      <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 py-0.5 rounded shrink-0">
                        SENSITIVE
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* 4. GOAL INPUT & LAUNCH BAR */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="p-2.5 bg-[#0E0C0A] border-t border-[#26211C] shrink-0">
          {/* Goal Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartAgent();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1 min-w-0 flex items-center bg-[#070605] border border-[#332D27] rounded-lg px-2.5 py-1.5 focus-within:border-gold transition-colors">
              <Compass className="w-3.5 h-3.5 text-gold/70 mr-1.5 shrink-0" />
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Give Harpy any autonomous mission..."
                className="w-full bg-transparent text-xs text-parchment placeholder-[#6B5E51] focus:outline-none min-w-0"
              />
            </div>

            <button
              type="submit"
              disabled={isAgentWorking || !goalInput.trim()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-gold-dark via-gold to-bronze text-black font-semibold text-xs rounded-lg shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider shrink-0 whitespace-nowrap"
            >
              <Play className="w-3 h-3 fill-black shrink-0" />
              <span><span className="hidden sm:inline">Take </span>Flight</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
