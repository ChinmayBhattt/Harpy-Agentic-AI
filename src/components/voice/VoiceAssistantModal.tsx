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
  X,
  Volume2,
  GripVertical,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAgentMode: (prompt: string) => void;
  onTriggerBrowserAgent?: (goal: string) => void;
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
  const isDraggingRef = useRef(false);

  // Safe handler to open panel on click, but NOT on drag!
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    setIsDocked(false);
  }, [setIsDocked]);

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
        if (onTriggerBrowserAgent) {
          onTriggerBrowserAgent(text);
        } else {
          onTriggerAgentMode(text);
        }
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
              if (onTriggerBrowserAgent) {
                onTriggerBrowserAgent(goal);
              } else {
                onTriggerAgentMode(goal);
              }
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
        <div
          key="docked-voice-plate-wrapper"
          className="fixed bottom-24 sm:bottom-28 inset-x-0 z-50 pointer-events-none flex items-center justify-center px-4"
        >
          <motion.div
            key="docked-voice-plate"
            drag
            dragMomentum={false}
            dragElastic={0.08}
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={() => {
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 120);
            }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="pointer-events-auto flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-[#181614]/95 backdrop-blur-xl border border-[#2E2A25] shadow-[0_12px_40px_rgba(0,0,0,0.7)] select-none max-w-[94vw] sm:max-w-md w-auto cursor-grab active:cursor-grabbing font-sans"
          >
            {/* Subtle Drag Handle */}
            <div
              className="hidden sm:flex items-center cursor-grab active:cursor-grabbing text-[#666059] hover:text-[#ECEAE6] transition-colors pl-0.5"
              title="Drag to reposition panel"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Mini Animated Audio Orb */}
            <div
              onClick={handlePanelClick}
              className="w-8 h-8 rounded-full border border-[#38322D] bg-[#221F1C] flex items-center justify-center relative cursor-pointer flex-shrink-0 group"
              title="Click to Open Full Voice Assistant"
            >
              {/* Dynamic outer pulse ring */}
              <motion.div
                animate={{
                  scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.45 : [1, 1.15, 1],
                  opacity: callStatus === 'connected' ? 0.35 + dynamicVolume * 0.45 : 0.2,
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-[#E06D44]/25 blur-xs"
              />
              {isSpeaking ? (
                <div className="flex items-center gap-0.5 z-10">
                  <span className="w-1 h-3 bg-[#E06D44] rounded-full animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
                  <span className="w-1 h-2.5 bg-[#ECEAE6] rounded-full animate-bounce" />
                </div>
              ) : isUserSpeaking || userMicLevel > 0.08 ? (
                <div className="flex items-center gap-0.5 z-10">
                  <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-1 h-4.5 bg-[#E06D44] rounded-full animate-pulse [animation-delay:0.1s]" />
                  <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                </div>
              ) : (
                <Radio className="w-4 h-4 text-[#E06D44] z-10 animate-pulse" />
              )}
            </div>

            {/* Center Info / Live Transcription / Active Task */}
            <div
              onClick={handlePanelClick}
              className="flex-1 min-w-0 cursor-pointer pr-1"
              title="Click to Open Full Assistant"
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-sans font-semibold text-[#ECEAE6] truncate">
                  Harpy Voice AI
                </span>
                <span className="text-[10px] font-mono text-[#78726B]">· Active</span>
              </div>

              {/* Dynamic Status / Caption */}
              <div className="truncate text-xs font-sans mt-0.5 max-w-[140px] xs:max-w-[170px] sm:max-w-[210px]">
                {activeAction ? (
                  <span className="text-[#ECEAE6] font-medium flex items-center gap-1 truncate">
                    <Sparkles className="w-3 h-3 text-[#E06D44] shrink-0 animate-pulse" />
                    <span className="truncate">{activeAction.title}</span>
                  </span>
                ) : liveTranscript ? (
                  <span className="text-emerald-300 truncate">
                    &ldquo;{liveTranscript}&rdquo;
                  </span>
                ) : isSpeaking ? (
                  <span className="text-[#D8D3CC] truncate">Speaking...</span>
                ) : (
                  <span className="text-[#8E8880] text-[11px] truncate">
                    Listening in background (Hindi/English)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions (Mute, Expand, Cut Call) */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-[#221F1C] text-[#ECEAE6] border-[#332E29] hover:bg-[#2C2824]'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDocked(false);
                }}
                className="p-1.5 rounded-full bg-[#221F1C] text-[#ECEAE6] border border-[#332E29] hover:bg-[#2C2824] transition-all cursor-pointer"
                title="Expand to Full Voice Modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
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
        </div>
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
            className="fixed inset-0 bg-black/65 backdrop-blur-sm pointer-events-auto cursor-pointer"
            title="Click to minimize to background panel (keeps call active)"
          />

          {/* Voice Assistant Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto relative bg-[#161412] border border-[#2C2824] rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-lg h-[490px] font-sans"
          >
            {/* Top Bar Header */}
            <div className="h-12 px-5 bg-[#1B1917] border-b border-[#272420] flex items-center justify-between select-none shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      callStatus === 'connected' ? 'bg-emerald-400' : 'bg-[#E06D44]'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      callStatus === 'connected' ? 'bg-emerald-500' : 'bg-[#E06D44]'
                    }`}
                  />
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs font-semibold text-[#ECEAE6]">
                    Harpy Voice AI
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#24211E] text-[#9E978F] border border-[#332E29]">
                    Multilingual
                  </span>
                </div>
              </div>

              {/* Header Actions: Minimize to dock, Close to dock (both keep call active) */}
              <div className="flex items-center gap-1.5 text-[#8E8880]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDocked(true);
                  }}
                  className="p-1.5 rounded-lg hover:text-[#ECEAE6] hover:bg-[#262320] transition-colors cursor-pointer"
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
                  className="p-1.5 rounded-lg hover:text-[#ECEAE6] hover:bg-[#262320] transition-colors cursor-pointer"
                  title="Close to Background Panel (Keeps Call Active)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Area: Centered Orb & Live Voice Feedback */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative select-none min-h-0 bg-[#13110F]">
              {/* Centered Concentric Audio Visualizer Orb */}
              <div className="relative flex items-center justify-center my-auto">
                {/* Outer Breathing Glow */}
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.45 : [1, 1.06, 1],
                    opacity: callStatus === 'connected' ? 0.25 + dynamicVolume * 0.35 : 0.15,
                  }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="absolute w-44 h-44 rounded-full bg-[#E06D44]/20 blur-2xl pointer-events-none"
                />

                {/* Concentric Wave Rings */}
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.25 : 1,
                    borderColor: isSpeaking
                      ? 'rgba(52, 211, 153, 0.4)'
                      : isUserSpeaking
                      ? 'rgba(224, 109, 68, 0.5)'
                      : 'rgba(236, 234, 230, 0.14)',
                  }}
                  className="absolute w-36 h-36 rounded-full border transition-colors duration-300 pointer-events-none"
                />
                <motion.div
                  animate={{
                    scale: callStatus === 'connected' ? 1 + dynamicVolume * 0.15 : 1,
                  }}
                  className="absolute w-28 h-28 rounded-full border border-[#38322D] pointer-events-none"
                />

                {/* Core Voice Circle Orb */}
                <div className="relative w-24 h-24 rounded-full bg-[#1C1A17] border border-[#3D3732] flex items-center justify-center shadow-lg">
                  {callStatus === 'connecting' ? (
                    <Activity className="w-8 h-8 text-[#E06D44] animate-spin" />
                  ) : isSpeaking ? (
                    /* Assistant Speaking Wave */
                    <div className="flex items-center gap-1.5">
                      <motion.span
                        animate={{ height: [8, 26, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="w-1.5 bg-[#E06D44] rounded-full"
                      />
                      <motion.span
                        animate={{ height: [12, 38, 12] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                        className="w-1.5 bg-emerald-400 rounded-full"
                      />
                      <motion.span
                        animate={{ height: [16, 30, 16] }}
                        transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
                        className="w-1.5 bg-[#ECEAE6] rounded-full"
                      />
                      <motion.span
                        animate={{ height: [8, 22, 8] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                        className="w-1.5 bg-[#E06D44] rounded-full"
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
                        className="w-1.5 bg-[#E06D44] rounded-full"
                      />
                      <motion.span
                        animate={{ height: [6, Math.max(14, userMicLevel * 38), 6] }}
                        transition={{ repeat: Infinity, duration: 0.35, delay: 0.16 }}
                        className="w-1.5 bg-emerald-400 rounded-full"
                      />
                    </div>
                  ) : (
                    <Radio className="w-8 h-8 text-[#E06D44] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Dynamic Speech Caption & Prompts Directly Under Orb */}
              <div className="mt-5 text-center max-w-sm px-4 select-text">
                {liveTranscript ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3.5 py-1.5 rounded-full bg-[#1D1B18] border border-[#332E29] text-[#ECEAE6] text-xs font-sans inline-flex items-center gap-2 shadow-sm"
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">&ldquo;{liveTranscript}&rdquo;</span>
                  </motion.div>
                ) : activeAction ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-3 py-1.5 rounded-full bg-[#24211E] border border-[#38322D] text-[#ECEAE6] text-xs font-sans inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E06D44] animate-pulse shrink-0" />
                    <span>Executing: {activeAction.title}</span>
                  </motion.div>
                ) : isSpeaking ? (
                  <span className="text-xs font-sans text-emerald-400">
                    Harpy Voice speaking...
                  </span>
                ) : callStatus === 'connected' ? (
                  <div>
                    <p className="font-sans text-xs font-medium text-[#ECEAE6]">
                      Listening — speak naturally
                    </p>
                    <p className="text-[11px] font-sans text-[#8E8880] mt-1">
                      Try: &ldquo;Create a portfolio page&rdquo; or &ldquo;Review my changes&rdquo;
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-sans text-[#9E978F] animate-pulse">
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
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                      : 'bg-[#1D1B18] text-[#ECEAE6] border-[#2E2A25] hover:bg-[#262320]'
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
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
                  className="w-12 h-12 rounded-full flex items-center justify-center border bg-[#1D1B18] text-[#ECEAE6] border-[#2E2A25] hover:bg-[#262320] transition-all cursor-pointer"
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
