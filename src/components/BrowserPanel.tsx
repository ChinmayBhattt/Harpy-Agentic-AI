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
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);
  const [manualTypeText, setManualTypeText] = useState('');
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────────────────
  // SSE REAL-TIME CONNECTION
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/browser/stream?sessionId=default');

      eventSource.addEventListener('state', (e) => {
        try {
          const data = JSON.parse(e.data) as BrowserSessionState;
          setSessionState(data);
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
    fetch('/api/browser?sessionId=default')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.state) {
          setSessionState(data.state);
          setUrlInput(data.state.url || 'https://www.google.com');
          if (data.state.logs) setLogs(data.state.logs);
        }
      })
      .catch((e) => console.error('Initial state fetch error:', e));

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
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Viewport is fixed at 1280x800 in Playwright
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;

    const realX = Math.round(clickX * scaleX);
    const realY = Math.round(clickY * scaleY);

    setClickRipple({ x: clickX, y: clickY });
    setTimeout(() => setClickRipple(null), 600);

    try {
      await fetch('/api/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_action',
          subAction: 'click',
          x: realX,
          y: realY,
        }),
      });
    } catch (err) {
      console.error('Manual click error:', err);
    }
  };

  const handleManualType = async (pressEnter = true) => {
    if (!manualTypeText.trim()) return;
    try {
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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
      await fetch('/api/browser', {
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
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Observing Viewport
          </span>
        );
      case 'planning':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Synthesizing Plan
          </span>
        );
      case 'acting':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Executing Action
          </span>
        );
      case 'verifying':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Verifying State
          </span>
        );
      case 'awaiting_confirmation':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Authorization Required
          </span>
        );
      case 'manual':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-bronze/10 border border-bronze/30 text-[#D5C2A5] rounded-full">
            <Hand className="w-3 h-3 text-gold" />
            Manual Pilot
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Mission Complete
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-red-500/10 border border-red-500/30 text-red-300 rounded-full">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Flight Issue
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase bg-white/5 border border-white/10 text-parchment-muted rounded-full">
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
      {/* 1. TOP BROWSER CONTROLS & OMNIBOX */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#141210] border-b border-[#2D2824]">
        {/* Navigation History & Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleHistory('back')}
            title="Back"
            className="p-1.5 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleHistory('forward')}
            title="Forward"
            className="p-1.5 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleHistory('reload')}
            title="Reload"
            className="p-1.5 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox / URL Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate();
          }}
          className="flex-1 min-w-[260px] max-w-2xl flex items-center bg-[#090807] border border-[#332D27] rounded-lg px-3 py-1.5 focus-within:border-gold/50 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-gold/70 mr-2 shrink-0" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Search Google or enter URL..."
            className="w-full bg-transparent text-xs font-mono text-parchment focus:outline-none"
          />
          <button
            type="submit"
            className="ml-2 text-xs text-gold hover:text-parchment transition-colors shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Mode Toggle & Status & View Controls */}
        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          {getStatusBadge()}

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#1D1A17] border border-[#332D27] rounded-lg p-0.5">
            <button
              onClick={() => handleSetMode('agent')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                sessionState?.controlMode === 'agent'
                  ? 'bg-gold/15 text-gold font-medium border border-gold/30'
                  : 'text-[#D5C2A5]/60 hover:text-white'
              }`}
              title="AI executes tasks independently"
            >
              <Sparkles className="w-3 h-3" />
              Agent
            </button>
            <button
              onClick={() => handleSetMode('manual')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                sessionState?.controlMode === 'manual'
                  ? 'bg-white/10 text-white font-medium border border-white/20'
                  : 'text-[#D5C2A5]/60 hover:text-white'
              }`}
              title="Manual clicks & inputs"
            >
              <Hand className="w-3 h-3" />
              Pilot
            </button>
          </div>

          {/* Stop / Reset Buttons */}
          {isAgentWorking && (
            <button
              onClick={handleStopAgent}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded hover:bg-rose-500/25 transition-colors"
              title="Halt active agent run"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
              title={isExpanded ? 'Restore IDE Split' : 'Expand Panel'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
            title="Close Browser View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MAIN BROWSER AREA (VIEWPORT & LIVE OVERLAY) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-[380px]">
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
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Compass className="w-12 h-12 text-gold/40 animate-pulse" />
            <h4 className="font-cinzel text-base text-parchment">Harpy Browser Engine Initializing...</h4>
            <p className="font-inter text-xs text-parchment-muted max-w-sm">
              Spinning up isolated Playwright session with real-time DOM telemetry and autonomous visual flight controls.
            </p>
          </div>
        )}

        {/* Scroll Control Overlay (Manual Pilot) */}
        {sessionState?.controlMode === 'manual' && (
          <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 z-10">
            <button
              onClick={() => handleScroll('up')}
              className="p-2 bg-[#1C1814]/90 border border-gold/30 rounded-lg text-gold hover:bg-gold/20 transition-colors shadow-lg"
              title="Scroll Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('down')}
              className="p-2 bg-[#1C1814]/90 border border-gold/30 rounded-lg text-gold hover:bg-gold/20 transition-colors shadow-lg"
              title="Scroll Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Manual Pilot Type Bar */}
        {sessionState?.controlMode === 'manual' && (
          <div className="absolute left-4 bottom-4 flex items-center gap-2 bg-[#181512]/95 border border-gold/30 rounded-lg p-2 shadow-2xl z-10 max-w-md">
            <input
              type="text"
              value={manualTypeText}
              onChange={(e) => setManualTypeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualType(true);
              }}
              placeholder="Type text directly into page..."
              className="bg-[#0D0B0A] border border-[#332D27] rounded px-2.5 py-1 text-xs text-parchment font-mono focus:outline-none focus:border-gold w-64"
            />
            <button
              onClick={() => handleManualType(true)}
              className="px-2.5 py-1 text-xs bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold rounded font-medium transition-colors"
            >
              Send
            </button>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* SENSITIVE ACTION AUTHORIZATION DIALOG */}
        {/* ────────────────────────────────────────────────────────── */}
        {sessionState?.status === 'awaiting_confirmation' && sessionState.pendingConfirmation && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-30">
            <div className="max-w-md w-full bg-[#181412] border-2 border-rose-500/60 p-6 rounded-xl shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 bg-rose-500/20 rounded-lg border border-rose-500/40">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-cinzel text-base font-semibold text-white">
                    Authorization Required
                  </h3>
                  <span className="font-inter text-xs text-rose-300">
                    Security Barrier Protocol Active
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/50 border border-rose-500/20 rounded-lg text-xs space-y-1.5 font-mono text-parchment/90">
                <p>
                  <strong className="text-gold">Action:</strong>{' '}
                  {sessionState.pendingConfirmation.action}
                </p>
                <p>
                  <strong className="text-gold">Description:</strong>{' '}
                  {sessionState.pendingConfirmation.description}
                </p>
                {sessionState.pendingConfirmation.url && (
                  <p className="truncate">
                    <strong className="text-gold">Target URL:</strong>{' '}
                    {sessionState.pendingConfirmation.url}
                  </p>
                )}
              </div>

              <p className="font-inter text-xs text-parchment-muted">
                The Harpy Autonomous Agent paused execution before this sensitive interaction.
                Do you permit Harpy to proceed?
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-parchment/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                >
                  Deny Action
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-black bg-gradient-to-r from-gold-light via-gold to-bronze hover:brightness-110 rounded-lg shadow-lg transition-all"
                >
                  Authorize Flight
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. AGENT REASONING & TELEMETRY DRAWER */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-[#12100E] border-t border-[#2D2824] flex flex-col">
        {/* Drawer Header & Tabs */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#24201C] bg-[#161412]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('loop')}
              className={`flex items-center gap-1.5 text-xs font-cinzel font-semibold transition-colors ${
                activeTab === 'loop'
                  ? 'text-gold border-b-2 border-gold pb-0.5'
                  : 'text-[#D5C2A5]/60 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Autonomous Loop ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('elements')}
              className={`flex items-center gap-1.5 text-xs font-cinzel font-semibold transition-colors ${
                activeTab === 'elements'
                  ? 'text-gold border-b-2 border-gold pb-0.5'
                  : 'text-[#D5C2A5]/60 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              DOM Elements ({sessionState?.interactiveElements?.length || 0})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-[11px] font-mono text-[#D5C2A5]/60 hover:text-rose-400 transition-colors"
              title="Reset session to clean Google instance"
            >
              Reset Session
            </button>
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="p-1 rounded text-[#D5C2A5]/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              {isDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        {isDrawerOpen && (
          <div className="h-44 overflow-y-auto p-3 space-y-2 text-xs font-mono">
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
                        fetch('/api/browser', {
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
        <div className="p-3 bg-[#0E0C0A] border-t border-[#26211C] flex flex-col gap-2">
          {/* Quick presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-parchment-muted scrollbar-none">
            <span className="text-gold/70 text-[10px] uppercase tracking-wider font-cinzel shrink-0 mr-1">
              Flight Paths:
            </span>
            <button
              onClick={() => handleStartAgent('Search Google for the latest breakthrough in AI agent models')}
              className="px-2.5 py-0.5 rounded-full bg-[#1A1613] border border-[#332D27] text-[#D5C2A5] hover:border-gold/50 hover:text-white transition-colors shrink-0"
            >
              Google Search AI
            </button>
            <button
              onClick={() => handleStartAgent('Navigate to github.com and find trending repositories')}
              className="px-2.5 py-0.5 rounded-full bg-[#1A1613] border border-[#332D27] text-[#D5C2A5] hover:border-gold/50 hover:text-white transition-colors shrink-0"
            >
              GitHub Trending
            </button>
            <button
              onClick={() => handleStartAgent('Go to news.ycombinator.com and list top 3 tech stories')}
              className="px-2.5 py-0.5 rounded-full bg-[#1A1613] border border-[#332D27] text-[#D5C2A5] hover:border-gold/50 hover:text-white transition-colors shrink-0"
            >
              Hacker News Top Stories
            </button>
          </div>

          {/* Goal Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartAgent();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center bg-[#070605] border border-[#332D27] rounded-lg px-3 py-2 focus-within:border-gold transition-colors">
              <Compass className="w-4 h-4 text-gold/70 mr-2 shrink-0" />
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Give Harpy any autonomous browsing mission..."
                className="w-full bg-transparent text-xs text-parchment placeholder-[#6B5E51] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isAgentWorking || !goalInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold-dark via-gold to-bronze text-black font-semibold text-xs rounded-lg shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              Take Flight
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
