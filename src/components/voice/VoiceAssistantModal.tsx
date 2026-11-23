'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  Compass,
  X,
  Radio,
  Minimize2,
  Maximize2,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAgentMode: (prompt: string) => void;
  onTriggerBrowserAgent: (goal: string) => void;
  onAddChatMessage?: (text: string, sender: 'user' | 'harpy') => void;
  onActiveStateChange?: (isActive: boolean) => void;
}

interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  onTriggerAgentMode,
  onTriggerBrowserAgent,
  onAddChatMessage,
  onActiveStateChange,
}: VoiceAssistantModalProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [activeAction, setActiveAction] = useState<{ type: 'agent' | 'browser'; title: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('Ready to connect');
  const [isMinimized, setIsMinimized] = useState(false);

  // Reference to Vapi instance
  const vapiRef = useRef<any>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastTriggeredRef = useRef<string>('');

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Handle Intent Detection from speech text
  const checkIntentAndExecute = useCallback(
    (text: string) => {
      const lower = text.toLowerCase().trim();
      if (!lower || lastTriggeredRef.current === lower) return;

      // 1. Agent Mode Intent: "make a portfolio", "build a website", "create a todo app"
      const agentTriggers = [
        'make a',
        'build a',
        'create a project',
        'portfolio',
        'website bana',
        'project bana',
        'code a',
        'generate project',
        'develop a',
      ];
      const isAgentIntent = agentTriggers.some((t) => lower.includes(t));

      if (isAgentIntent && !lower.includes('meeting') && !lower.includes('google meet')) {
        lastTriggeredRef.current = lower;
        setActiveAction({ type: 'agent', title: text });
        onTriggerAgentMode(text);
        if (onAddChatMessage) {
          onAddChatMessage(`[Voice Request] ${text}`, 'user');
        }
        setTimeout(() => setActiveAction(null), 6000);
        return;
      }

      // 2. Browser Agent Intent: "create a google meeting link", "browse google", "open website"
      const browserTriggers = [
        'meeting link',
        'google meet',
        'browse',
        'open in browser',
        'search google',
        'check website',
        'google meeting',
      ];
      const isBrowserIntent = browserTriggers.some((t) => lower.includes(t));

      if (isBrowserIntent) {
        lastTriggeredRef.current = lower;
        setActiveAction({ type: 'browser', title: text });
        onTriggerBrowserAgent(text);
        if (onAddChatMessage) {
          onAddChatMessage(`[Voice Request] ${text}`, 'user');
        }
        setTimeout(() => setActiveAction(null), 6000);
        return;
      }
    },
    [onTriggerAgentMode, onTriggerBrowserAgent, onAddChatMessage]
  );

  // Initialize and start Vapi call
  const startCall = useCallback(async () => {
    setCallStatus('connecting');
    setStatusMessage('Connecting to Harpy Voice AI...');

    try {
      // Dynamic client-side import of Vapi Web SDK to avoid SSR issues
      const VapiModule = await import('@vapi-ai/web');
      const Vapi = VapiModule.default || VapiModule;

      const publicKey =
        process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '06f6f7bd-75f6-4879-9191-0b02a8743fa0';
      const assistantId =
        process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '82e99592-5597-44fa-9b77-14dc04e49ba5';

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      // Event Listeners
      vapi.on('call-start', () => {
        setCallStatus('connected');
        setStatusMessage('Connected · Listening (Hindi / English / Multilingual)');
        if (onActiveStateChange) onActiveStateChange(true);
      });

      vapi.on('call-end', () => {
        setCallStatus('idle');
        setStatusMessage('Call ended');
        if (onActiveStateChange) onActiveStateChange(false);
      });

      vapi.on('speech-start', () => {
        setIsSpeaking(true);
      });

      vapi.on('speech-end', () => {
        setIsSpeaking(false);
      });

      vapi.on('volume-level', (volume: number) => {
        setVolumeLevel(Math.min(1, Math.max(0, volume * 1.5)));
      });

      // Handle transcripts and function calls
      vapi.on('message', (message: any) => {
        // Transcript updates
        if (message.type === 'transcript' && message.transcript) {
          const role = message.role === 'assistant' ? 'assistant' : 'user';
          const text = message.transcript.trim();

          if (message.transcriptType === 'final' && text) {
            setTranscripts((prev) => [
              ...prev,
              {
                id: `tr-${Date.now()}-${Math.random()}`,
                role,
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);

            // If user said something, check for action intent
            if (role === 'user') {
              checkIntentAndExecute(text);
            }
          }
        }

        // Tool / Function Call Execution
        if (message.type === 'function-call' || message.type === 'tool-calls') {
          const toolCalls = message.toolCalls || [message.functionCall];
          for (const tc of toolCalls) {
            const fnName = tc?.function?.name || tc?.name;
            const args = typeof tc?.function?.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : tc?.parameters || tc?.arguments || {};

            if (fnName === 'trigger_agent_mode') {
              const prompt = args.prompt || args.goal || 'Build a full stack portfolio project';
              setActiveAction({ type: 'agent', title: prompt });
              onTriggerAgentMode(prompt);
              setTimeout(() => setActiveAction(null), 6000);
            } else if (fnName === 'trigger_browser_agent') {
              const goal = args.goal || args.prompt || 'Create a google meeting link';
              setActiveAction({ type: 'browser', title: goal });
              onTriggerBrowserAgent(goal);
              setTimeout(() => setActiveAction(null), 6000);
            }
          }
        }
      });

      vapi.on('error', (err: any) => {
        console.error('Vapi Web SDK error:', err);
        setCallStatus('error');
        setStatusMessage(`Connection notice: ${err?.message || 'Check microphone permission'}`);
      });

      // Start the call using the preconfigured Harpy Voice Assistant ID
      await vapi.start(assistantId);
    } catch (err: unknown) {
      console.error('Failed to start Vapi call:', err);
      setCallStatus('error');
      setStatusMessage('Unable to access microphone or connect to voice server.');
    }
  }, [checkIntentAndExecute, onActiveStateChange, onTriggerAgentMode, onTriggerBrowserAgent]);

  // End call
  const endCall = useCallback(() => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (err) {
        console.warn('Error stopping call:', err);
      }
      vapiRef.current = null;
    }
    setCallStatus('idle');
    setStatusMessage('Call ended');
    if (onActiveStateChange) onActiveStateChange(false);
  }, [onActiveStateChange]);

  // Toggle mute
  const toggleMute = () => {
    if (vapiRef.current) {
      const nextMuted = !isMuted;
      try {
        vapiRef.current.setMuted(nextMuted);
        setIsMuted(nextMuted);
      } catch (err) {
        console.warn('Error muting:', err);
      }
    }
  };

  // Start call when opened
  useEffect(() => {
    if (isOpen && callStatus === 'idle') {
      startCall();
    }
    return () => {
      if (!isOpen && callStatus === 'connected') {
        endCall();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
        {/* Backdrop for full view */}
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />
        )}

        {/* Voice Assistant Floating Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`pointer-events-auto relative bg-[#07070B] border border-[#C6A46A]/40 rounded-3xl shadow-[0_0_50px_rgba(198,164,106,0.18)] overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized
              ? 'fixed bottom-24 right-6 w-80 h-32 z-50 border-[#C6A46A]/60'
              : 'w-full max-w-lg h-[540px]'
          }`}
        >
          {/* Top Bar Header */}
          <div className="h-12 px-4 bg-[#0B0B12] border-b border-[#1A1A26] flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    callStatus === 'connected' ? 'bg-emerald-400' : 'bg-[#C6A46A]'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    callStatus === 'connected' ? 'bg-emerald-500' : 'bg-[#C6A46A]'
                  }`}
                />
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-cinzel text-xs font-semibold text-[#E8DDC7] tracking-wider uppercase">
                  Harpy Voice AI
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#C6A46A]/15 text-[#C6A46A] border border-[#C6A46A]/30">
                  Multilingual
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[#E8DDC7]/60">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg hover:text-white hover:bg-white/5 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  endCall();
                  onClose();
                }}
                className="p-1 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Minimized Compact View */}
          {isMinimized ? (
            <div className="flex-1 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-[#C6A46A]/40 bg-[#0E0E18] flex items-center justify-center relative">
                  <div
                    className="absolute inset-0 rounded-full bg-[#C6A46A]/20 animate-ping opacity-60"
                    style={{ animationDuration: isSpeaking ? '1s' : '3s' }}
                  />
                  <Radio className="w-5 h-5 text-[#C6A46A]" />
                </div>
                <div>
                  <p className="text-xs font-cinzel text-[#E8DDC7] font-semibold">Voice Call Active</p>
                  <p className="text-[10px] font-mono text-emerald-400">
                    {isSpeaking ? 'Harpy Speaking...' : 'Listening...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-2 rounded-xl border transition-all ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-[#141420] text-[#E8DDC7] border-[#222230]'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    endCall();
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-all"
                  title="End Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Interactive View */
            <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-[#07070B] via-[#0A0A12] to-[#050508] p-5">
              {/* Central Glowing Audio Visualizer Orb */}
              <div className="h-44 flex flex-col items-center justify-center relative select-none shrink-0">
                {/* Outer Breathing Energy Rings */}
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + volumeLevel * 0.45 : [1, 1.08, 1],
                    opacity: callStatus === 'connected' ? 0.35 + volumeLevel * 0.5 : 0.2,
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-[#C6A46A]/30 via-amber-500/20 to-emerald-500/20 blur-xl"
                />

                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + volumeLevel * 0.3 : [1, 1.04, 1],
                  }}
                  className="absolute w-28 h-28 rounded-full border border-[#C6A46A]/30"
                />

                {/* Core Orb */}
                <div className="relative w-20 h-20 rounded-full bg-[#0E0E18] border-2 border-[#C6A46A] flex items-center justify-center shadow-[0_0_30px_rgba(198,164,106,0.3)]">
                  {callStatus === 'connecting' ? (
                    <Activity className="w-8 h-8 text-[#C6A46A] animate-spin" />
                  ) : isSpeaking ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-6 bg-[#C6A46A] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-9 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-5 bg-[#C6A46A] rounded-full animate-bounce" />
                    </div>
                  ) : (
                    <Radio className="w-8 h-8 text-[#C6A46A] animate-pulse" />
                  )}
                </div>

                {/* Status Indicator Pill */}
                <div className="mt-3 text-center">
                  <span className="text-xs font-mono text-[#E8DDC7]/80">
                    {statusMessage}
                  </span>
                </div>
              </div>

              {/* Active Autonomous Tool Notification Pill */}
              <AnimatePresence>
                {activeAction && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mb-3 px-3.5 py-2 rounded-xl bg-[#C6A46A]/15 border border-[#C6A46A]/50 flex items-center justify-between text-xs text-[#E8DDC7] shadow-lg shrink-0"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {activeAction.type === 'agent' ? (
                        <Sparkles className="w-4 h-4 text-[#C6A46A] shrink-0 animate-pulse" />
                      ) : (
                        <Compass className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                      )}
                      <span className="font-semibold text-[#C6A46A] uppercase font-cinzel text-[11px]">
                        {activeAction.type === 'agent' ? 'Agent Mode Triggered' : 'Browser Agent Triggered'}:
                      </span>
                      <span className="truncate text-xs opacity-90 font-mono">{activeAction.title}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live Transcripts Scrollable Area */}
              <div className="flex-1 min-h-0 bg-[#050508]/70 border border-[#171722] rounded-2xl p-3 overflow-y-auto space-y-2 [scrollbar-width:thin]">
                {transcripts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#8C7A6B] space-y-1">
                    <p className="font-cinzel text-[#E8DDC7]/70">Boliye, Main Sun Raha Hu</p>
                    <p className="text-[11px] font-mono">
                      Try: &ldquo;Make a portfolio project&rdquo; or &ldquo;Create a google meeting link&rdquo;
                    </p>
                  </div>
                ) : (
                  transcripts.map((t) => (
                    <div
                      key={t.id}
                      className={`flex flex-col text-xs leading-relaxed ${
                        t.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-1.5 rounded-xl ${
                          t.role === 'user'
                            ? 'bg-[#181824] text-[#E8DDC7] border border-[#2B2B3E]'
                            : 'bg-[#C6A46A]/15 text-[#F2E8D5] border border-[#C6A46A]/35'
                        }`}
                      >
                        <span className="block text-[9px] font-mono text-[#8C7A6B] mb-0.5">
                          {t.role === 'user' ? 'You' : 'Harpy AI'} · {t.timestamp}
                        </span>
                        <p className="whitespace-pre-wrap">{t.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptsEndRef} />
              </div>

              {/* Bottom Control Actions (Mute, End Call) */}
              <div className="pt-4 flex items-center justify-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                      : 'bg-[#12121C] text-[#E8DDC7] border-[#222232] hover:border-[#C6A46A]/60'
                  }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    endCall();
                    onClose();
                  }}
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.45)] transition-all hover:scale-105 active:scale-95"
                  title="End Voice Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
