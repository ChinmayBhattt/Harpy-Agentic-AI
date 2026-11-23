'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Minimize2,
  Maximize2,
  Activity,
  Sparkles,
  Compass,
  X,
  Volume2,
  GripVertical,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAgentMode: (prompt: string) => void;
  onTriggerBrowserAgent: (goal: string) => void;
  onAddChatMessage?: (text: string, sender: 'user' | 'harpy') => void;
  onActiveStateChange?: (isActive: boolean) => void;
  isDocked?: boolean;
  onDockChange?: (docked: boolean) => void;
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
  isDocked: externalIsDocked,
  onDockChange,
}: VoiceAssistantModalProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [userMicLevel, setUserMicLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [activeAction, setActiveAction] = useState<{ type: 'agent' | 'browser'; title: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('Ready to connect');
  const [internalIsDocked, setInternalIsDocked] = useState(false);

  // Keep a stable ref to onDockChange so setIsDocked doesn't trigger dependency loops
  const onDockChangeRef = useRef(onDockChange);
  useEffect(() => {
    onDockChangeRef.current = onDockChange;
  });

  // Synchronize docked state (defaults to internal unless controlled)
  const isDocked = externalIsDocked !== undefined ? externalIsDocked : internalIsDocked;
  const setIsDocked = useCallback((docked: boolean) => {
    setInternalIsDocked(docked);
    onDockChangeRef.current?.(docked);
  }, []);

  // Combined volume for glowing ripple visualizer
  const dynamicVolume = Math.min(1, Math.max(volumeLevel, userMicLevel));

  const vapiRef = useRef<any>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastTriggeredRef = useRef<string>('');
  const prevIsOpenRef = useRef(false);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Only reset docked to false when transitioning from closed (false) to opened (true)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setInternalIsDocked(false);
      onDockChangeRef.current?.(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle Escape key: minimize to docked panel without cutting the call
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDocked) {
        setIsDocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDocked, setIsDocked]);

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
        'create app',
        'bana do',
      ];
      const isAgentIntent = agentTriggers.some((t) => lower.includes(t));

      if (isAgentIntent && !lower.includes('meeting') && !lower.includes('google meet')) {
        lastTriggeredRef.current = lower;
        setActiveAction({ type: 'agent', title: text });
        onTriggerAgentMode(text);
        if (onAddChatMessage) {
          onAddChatMessage(`[Voice Request] ${text}`, 'user');
        }
        // AUTO-DOCK into floating plate at bottom-center when task is assigned!
        setIsDocked(true);
        setTimeout(() => setActiveAction(null), 8000);
        return;
      }

      // 2. Browser Agent Intent: "create a google meeting link", "browse google", "open website"
      const browserTriggers = [
        'meeting link',
        'google meet',
        'meet link',
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
        // AUTO-DOCK into floating plate at bottom-center when task is assigned!
        setIsDocked(true);
        setTimeout(() => setActiveAction(null), 8000);
        return;
      }
    },
    [onTriggerAgentMode, onTriggerBrowserAgent, onAddChatMessage, setIsDocked]
  );

  // Initialize and start Vapi call
  const startCall = useCallback(async () => {
    setCallStatus('connecting');
    setStatusMessage('Connecting to Harpy Voice AI...');

    // Pre-request browser audio permission to prevent silent blocks in Safari / Chrome
    if (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release audio track immediately so Vapi WebRTC gets a fresh handle
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr: any) {
        console.warn('Microphone permission check warning:', micErr);
        if (micErr?.name === 'NotAllowedError') {
          setCallStatus('error');
          setStatusMessage('Microphone permission denied in browser.');
          return;
        }
      }
    }

    try {
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
        setIsUserSpeaking(false);
      });

      // Assistant Audio Volume
      vapi.on('volume-level', (volume: number) => {
        setVolumeLevel(Math.min(1, Math.max(0, volume * 1.5)));
      });

      // User Local Microphone Audio Volume (real-time voice level)
      vapi.on('local-volume-level', (volume: number) => {
        const scaled = Math.min(1, Math.max(0, volume * 2.4));
        setUserMicLevel(scaled);
        if (scaled > 0.08) {
          setIsUserSpeaking(true);
        }
      });

      // Handle transcripts (both partial streaming and final) & tool calls
      vapi.on('message', (message: any) => {
        // Transcript updates
        if (message.type === 'transcript' && message.transcript) {
          const role = message.role === 'assistant' ? 'assistant' : 'user';
          const text = message.transcript.trim();

          // 1. Live Partial Speech streaming: gives user immediate feedback
          if (message.transcriptType === 'partial') {
            setLiveTranscript(text);
            if (role === 'user') {
              setIsUserSpeaking(true);
            }
          }

          // 2. Finalized transcript
          if (message.transcriptType === 'final' && text) {
            setLiveTranscript('');
            setIsUserSpeaking(false);
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
            const args =
              typeof tc?.function?.arguments === 'string'
                ? JSON.parse(tc.function.arguments || '{}')
                : tc?.parameters || tc?.arguments || {};

            if (fnName === 'trigger_agent_mode') {
              const prompt = args.prompt || args.goal || 'Build a full stack portfolio project';
              setActiveAction({ type: 'agent', title: prompt });
              onTriggerAgentMode(prompt);
              // AUTO-DOCK into floating plate when function call triggers
              setIsDocked(true);
              setTimeout(() => setActiveAction(null), 8000);
            } else if (fnName === 'trigger_browser_agent') {
              const goal = args.goal || args.prompt || 'Create a google meeting link';
              setActiveAction({ type: 'browser', title: goal });
              onTriggerBrowserAgent(goal);
              // AUTO-DOCK into floating plate when function call triggers
              setIsDocked(true);
              setTimeout(() => setActiveAction(null), 8000);
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
      setCallStatus('connected');
      setStatusMessage('Connected · Listening (Hindi / English / Multilingual)');
      if (onActiveStateChange) onActiveStateChange(true);
    } catch (err: unknown) {
      console.error('Failed to start Vapi call:', err);
      setCallStatus('error');
      setStatusMessage('Unable to access microphone or connect to voice server.');
    }
  }, [checkIntentAndExecute, onActiveStateChange, onTriggerAgentMode, onTriggerBrowserAgent, setIsDocked]);

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
    setLiveTranscript('');
    setIsDocked(false);
    if (onActiveStateChange) onActiveStateChange(false);
  }, [onActiveStateChange, setIsDocked]);

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
      {/* 1. DOCKED MODE: FLOATING PLATE AT BOTTOM-CENTER SLIGHTLY ABOVE CHAT INPUT */}
      {isDocked ? (
        <motion.div
          key="docked-voice-plate"
          drag
          dragMomentum={false}
          dragElastic={0.08}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 rounded-full bg-[#0A0A13]/95 backdrop-blur-2xl border border-[#C6A46A]/50 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(198,164,106,0.35)] select-none max-w-[92vw] sm:max-w-md w-auto"
        >
          {/* Subtle Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-[#8C7A6B]/50 hover:text-[#C6A46A] transition-colors pl-0.5"
            title="Drag to reposition panel"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Mini Animated Glowing Audio Orb */}
          <div
            onClick={() => setIsDocked(false)}
            className="w-8 h-8 rounded-full border border-[#C6A46A]/60 bg-[#12121C] flex items-center justify-center relative cursor-pointer flex-shrink-0 group"
            title="Click to Expand Full Assistant"
          >
            {/* Dynamic outer pulse ring */}
            <motion.div
              animate={{
                scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.45 : [1, 1.15, 1],
                opacity: callStatus === 'connected' ? 0.4 + dynamicVolume * 0.5 : 0.3,
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-[#C6A46A]/30 blur-xs"
            />
            {isSpeaking ? (
              <div className="flex items-center gap-0.5 z-10">
                <span className="w-1 h-3 bg-[#C6A46A] rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1 h-2.5 bg-[#C6A46A] rounded-full animate-bounce" />
              </div>
            ) : isUserSpeaking || userMicLevel > 0.08 ? (
              <div className="flex items-center gap-0.5 z-10">
                <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="w-1 h-4.5 bg-[#C6A46A] rounded-full animate-pulse [animation-delay:0.1s]" />
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.2s]" />
              </div>
            ) : (
              <Radio className="w-4 h-4 text-[#C6A46A] z-10 animate-pulse" />
            )}
          </div>

          {/* Center Info / Live Transcription / Active Task */}
          <div
            onClick={() => setIsDocked(false)}
            className="flex-1 min-w-0 cursor-pointer pr-1"
            title="Click to Expand"
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-cinzel font-semibold text-[#C6A46A] tracking-wider uppercase truncate">
                Harpy Voice AI
              </span>
              <span className="text-[9px] font-mono text-[#8C7A6B]">· Active</span>
            </div>

            {/* Dynamic Status / Caption */}
            <div className="truncate text-xs font-mono mt-0.5">
              {activeAction ? (
                <span className="text-amber-300 font-medium flex items-center gap-1 truncate">
                  {activeAction.type === 'agent' ? (
                    <Sparkles className="w-3 h-3 text-[#C6A46A] shrink-0 animate-pulse" />
                  ) : (
                    <Compass className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                  )}
                  <span className="truncate">{activeAction.title}</span>
                </span>
              ) : liveTranscript ? (
                <span className="text-emerald-300 truncate">
                  &ldquo;{liveTranscript}&rdquo;
                </span>
              ) : isSpeaking ? (
                <span className="text-[#E8DDC7]/90 truncate">Speaking...</span>
              ) : (
                <span className="text-[#E8DDC7]/60 text-[11px] truncate">
                  Listening in background (Hindi/English)
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions (Mute, Expand, Cut Call) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className={`p-1.5 rounded-full border transition-all ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-[#141420] text-[#E8DDC7] border-[#222230] hover:border-[#C6A46A]/50'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsDocked(false)}
              className="p-1.5 rounded-full bg-[#141420] text-[#E8DDC7] border border-[#222230] hover:border-[#C6A46A] hover:text-[#C6A46A] transition-all cursor-pointer"
              title="Expand to Full Voice Modal"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                endCall();
                onClose();
              }}
              className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm cursor-pointer"
              title="Cut Call (Disconnect Call Completely)"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        /* 2. FULL MODAL VIEW (PERFECTLY CENTERED CIRCULAR ORB) */
        <div
          key="full-voice-modal-backdrop"
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
        >
          {/* Backdrop - Clicking outside minimizes to docked panel without cutting the call! */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsDocked(true);
            }}
            className="fixed inset-0 bg-black/65 backdrop-blur-md pointer-events-auto cursor-pointer"
            title="Click to minimize to background panel (keeps call active)"
          />

          {/* Voice Assistant Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto relative bg-[#07070B] border border-[#C6A46A]/40 rounded-3xl shadow-[0_0_60px_rgba(198,164,106,0.22)] overflow-hidden flex flex-col w-full max-w-lg h-[490px]"
          >
            {/* Top Bar Header */}
            <div className="h-12 px-5 bg-[#0B0B12] border-b border-[#1A1A26] flex items-center justify-between select-none shrink-0">
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
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-xs font-semibold text-[#E8DDC7] tracking-wider uppercase">
                    Harpy Voice AI
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#C6A46A]/15 text-[#C6A46A] border border-[#C6A46A]/30">
                    Multilingual
                  </span>
                </div>
              </div>

              {/* Header Actions: Minimize to dock, Close to dock (both keep call active) */}
              <div className="flex items-center gap-1.5 text-[#E8DDC7]/60">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDocked(true);
                  }}
                  className="p-1.5 rounded-lg hover:text-[#C6A46A] hover:bg-white/10 transition-colors cursor-pointer"
                  title="Minimize to Floating Panel (Keeps Call Active)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDocked(true);
                  }}
                  className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close to Background Panel (Keeps Call Active)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Area: Centered Glowing Orb & Live Voice Feedback */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative select-none min-h-0 bg-gradient-to-b from-[#07070B] via-[#0A0A12] to-[#050508]">
              {/* Perfectly Centered Concentric Audio Visualizer Orb */}
              <div className="relative flex items-center justify-center my-auto">
                {/* Outer Breathing Energy Glow */}
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.5 : [1, 1.08, 1],
                    opacity: callStatus === 'connected' ? 0.35 + dynamicVolume * 0.45 : 0.25,
                  }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-[#C6A46A]/30 via-amber-500/20 to-emerald-500/20 blur-2xl pointer-events-none"
                />

                {/* Concentric Golden Wave Rings */}
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.25 : 1,
                    borderColor: isSpeaking
                      ? 'rgba(52, 211, 153, 0.4)'
                      : isUserSpeaking
                      ? 'rgba(198, 164, 106, 0.6)'
                      : 'rgba(198, 164, 106, 0.25)',
                  }}
                  className="absolute w-36 h-36 rounded-full border transition-colors duration-300 pointer-events-none"
                />
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.15 : 1,
                  }}
                  className="absolute w-28 h-28 rounded-full border border-[#C6A46A]/35 pointer-events-none"
                />

                {/* Core Voice Circle Orb */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-b from-[#141422] to-[#0A0A12] border-2 border-[#C6A46A] flex items-center justify-center shadow-[0_0_35px_rgba(198,164,106,0.35)]">
                  {callStatus === 'connecting' ? (
                    <Activity className="w-8 h-8 text-[#C6A46A] animate-spin" />
                  ) : isSpeaking ? (
                    /* Assistant Speaking Wave */
                    <div className="flex items-center gap-1.5">
                      <motion.span
                        animate={{ height: [8, 26, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="w-1.5 bg-[#C6A46A] rounded-full"
                      />
                      <motion.span
                        animate={{ height: [12, 38, 12] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                        className="w-1.5 bg-emerald-400 rounded-full"
                      />
                      <motion.span
                        animate={{ height: [16, 30, 16] }}
                        transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
                        className="w-1.5 bg-amber-300 rounded-full"
                      />
                      <motion.span
                        animate={{ height: [8, 22, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                        className="w-1.5 bg-[#C6A46A] rounded-full"
                      />
                    </div>
                  ) : isUserSpeaking || userMicLevel > 0.04 ? (
                    /* User Microphone Speaking Wave */
                    <div className="flex items-center gap-1.5">
                      <motion.span
                        animate={{ height: [6, Math.max(12, userMicLevel * 38), 6] }}
                        transition={{ repeat: Infinity, duration: 0.35 }}
                        className="w-1.5 bg-emerald-400 rounded-full"
                      />
                      <motion.span
                        animate={{ height: [10, Math.max(18, userMicLevel * 46), 10] }}
                        transition={{ repeat: Infinity, duration: 0.3, delay: 0.08 }}
                        className="w-1.5 bg-[#C6A46A] rounded-full"
                      />
                      <motion.span
                        animate={{ height: [6, Math.max(14, userMicLevel * 38), 6] }}
                        transition={{ repeat: Infinity, duration: 0.35, delay: 0.16 }}
                        className="w-1.5 bg-emerald-400 rounded-full"
                      />
                    </div>
                  ) : (
                    <Radio className="w-8 h-8 text-[#C6A46A] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Dynamic Speech Caption & Prompts Directly Under Orb */}
              <div className="mt-5 text-center max-w-sm px-4 select-text">
                {liveTranscript ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3.5 py-1.5 rounded-full bg-[#181824] border border-[#C6A46A]/50 text-[#E8DDC7] text-xs font-mono inline-flex items-center gap-2 shadow-lg"
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">&ldquo;{liveTranscript}&rdquo;</span>
                  </motion.div>
                ) : activeAction ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1.5 rounded-full bg-[#C6A46A]/20 border border-[#C6A46A]/50 text-amber-200 text-xs font-mono inline-flex items-center gap-2 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A46A] animate-pulse shrink-0" />
                    <span>Executing: {activeAction.title}</span>
                  </motion.div>
                ) : isSpeaking ? (
                  <span className="text-xs font-mono text-emerald-400">
                    Harpy Voice speaking...
                  </span>
                ) : callStatus === 'connected' ? (
                  <div>
                    <p className="font-cinzel text-xs font-semibold text-[#E8DDC7]/80 tracking-wide">
                      BOLIYE, MAIN SUN RAHA HU
                    </p>
                    <p className="text-[11px] font-mono text-[#8C7A6B] mt-1">
                      Try: &ldquo;Make a portfolio project&rdquo; or &ldquo;Create a google meeting link&rdquo;
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-[#C6A46A] animate-pulse">
                    {statusMessage}
                  </p>
                )}
              </div>

              {/* Bottom Control Actions (Mute, Red End Call, Dock) */}
              <div className="pt-6 flex items-center justify-center gap-4 shrink-0">
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
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-[0_0_22px_rgba(225,29,72,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Cut Call (Disconnect Call Completely)"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDocked(true);
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center border bg-[#12121C] text-[#E8DDC7] border-[#222232] hover:border-[#C6A46A]/60 hover:text-[#C6A46A] transition-all cursor-pointer"
                  title="Dock to Floating Plate"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
