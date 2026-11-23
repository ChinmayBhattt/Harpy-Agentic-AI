'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  GripVertical,
  Activity,
  Layers,
  Sliders,
  Send,
  Zap,
  Bot,
  Globe,
  Radio,
  Eye,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Link2,
  Link2Off,
  ScrollText,
} from 'lucide-react';
import {
  AppDefinition,
  WorkflowNode,
  WorkflowConnection,
  Workflow,
  ExecutionTrace,
  DEFAULT_APPS,
  APP_ICONS,
} from './types';
import OAuthModal from './OAuthModal';
import NodeInspectorModal from './NodeInspectorModal';
import ExecutionLogsModal from './ExecutionLogsModal';

interface ConnectorsWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  onRunWorkflowFromChat?: (prompt: string) => void;
}

export default function ConnectorsWorkspace({
  isOpen,
  onClose,
  onRunWorkflowFromChat,
}: ConnectorsWorkspaceProps) {
  // ──────────────────────────────────────────────────────────
  // Canvas State: Pan & Zoom
  // ──────────────────────────────────────────────────────────
  const [pan, setPan] = useState({ x: 500, y: 350 });
  const [zoom, setZoom] = useState(0.85);
  const [activeTool, setActiveTool] = useState<'select' | 'hand'>('select');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ──────────────────────────────────────────────────────────
  // Apps & Authentication State
  // ──────────────────────────────────────────────────────────
  const [apps, setApps] = useState<AppDefinition[]>(DEFAULT_APPS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [authenticatingApp, setAuthenticatingApp] = useState<AppDefinition | null>(null);

  // ──────────────────────────────────────────────────────────
  // Workflows & Nodes State
  // Clean circular logo nodes placed symmetrically around Harpy Core (0, 0)
  // ──────────────────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'wf-1',
      name: 'Gmail → Notion Sync',
      description: 'Summarize incoming emails with Harpy AI and update Notion board',
      isConnectedToCore: true,
      status: 'active',
      color: '#EA4335',
      createdAt: '2026-11-23',
    },
    {
      id: 'wf-2',
      name: 'GitHub → Slack Broadcast',
      description: 'Monitor GitHub PRs and broadcast updates to Slack channels',
      isConnectedToCore: true,
      status: 'active',
      color: '#5865F2',
      createdAt: '2026-11-23',
    },
  ]);

  // Initial Clean Application Logo Nodes
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'node-gmail-1',
      workflowId: 'wf-1',
      type: 'trigger',
      appId: 'gmail',
      title: 'Gmail Monitor',
      actionOrTrigger: 'New client email received',
      x: -240,
      y: -100,
      status: 'active',
      config: { filter: 'is:unread label:clients', interval: 'Real-time (Push)' },
      isConnectedToCore: true,
    },
    {
      id: 'node-notion-1',
      workflowId: 'wf-1',
      type: 'action',
      appId: 'notion',
      title: 'Notion Database',
      actionOrTrigger: 'Create tasks page & summary',
      x: 240,
      y: -100,
      status: 'active',
      config: { database: 'Harpy AI Action Tasks' },
      isConnectedToCore: true,
    },
    {
      id: 'node-gh-1',
      workflowId: 'wf-2',
      type: 'trigger',
      appId: 'github',
      title: 'GitHub Watcher',
      actionOrTrigger: 'New Issue or PR opened',
      x: -240,
      y: 100,
      status: 'active',
      config: { repo: 'ChinmayBhattt/Harpy-Agentic-AI' },
      isConnectedToCore: true,
    },
    {
      id: 'node-slack-1',
      workflowId: 'wf-2',
      type: 'action',
      appId: 'slack',
      title: 'Slack Alerts',
      actionOrTrigger: 'Send channel alert message',
      x: 240,
      y: 100,
      status: 'active',
      config: { channel: '#harpy-announcements' },
      isConnectedToCore: true,
    },
    {
      id: 'node-discord-1',
      workflowId: 'wf-2',
      type: 'action',
      appId: 'discord',
      title: 'Discord Bot',
      actionOrTrigger: 'Post update in dev channel',
      x: 240,
      y: 220,
      status: 'active',
      config: { channel: '#dev-feed' },
      isConnectedToCore: true,
    },
  ]);

  // Connections (Edges) between App Logo nodes and Central Harpy Core
  const [connections, setConnections] = useState<WorkflowConnection[]>([
    { id: 'conn-gmail-core', workflowId: 'wf-1', fromNodeId: 'node-gmail-1', fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
    { id: 'conn-core-notion', workflowId: 'wf-1', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-notion-1', toPort: 'input', isActive: true },
    { id: 'conn-gh-core', workflowId: 'wf-2', fromNodeId: 'node-gh-1', fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
    { id: 'conn-core-slack', workflowId: 'wf-2', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-slack-1', toPort: 'input', isActive: true },
    { id: 'conn-core-discord', workflowId: 'wf-2', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-discord-1', toPort: 'input', isActive: true },
  ]);

  // ──────────────────────────────────────────────────────────
  // Interactive Selection, Dragging & Connecting
  // ──────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingSource, setConnectingSource] = useState<{ nodeId: string; port: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Natural Language AI Automation Input
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessToast, setAiSuccessToast] = useState<string | null>(null);

  // Execution Simulator Trace
  const [activeTrace, setActiveTrace] = useState<ExecutionTrace | null>(null);
  const [isExecutingGlobal, setIsExecutingGlobal] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────────────────
  // Auto-Center Canvas on Mount / Open
  // ──────────────────────────────────────────────────────────
  const centerCanvas = useCallback(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({
        x: Math.round(rect.width / 2),
        y: Math.round(rect.height / 2 - 10),
      });
      setZoom(0.85);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        centerCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, centerCanvas]);

  // Filtered Apps in Left Sidebar
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchCat = selectedCategory === 'all' || app.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [apps, selectedCategory, searchQuery]);

  // Sync Node Status
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const isConnected = connections.some(
          (c) => c.fromNodeId === n.id || c.toNodeId === n.id
        );
        return {
          ...n,
          isConnectedToCore: isConnected,
          status: isConnected ? 'active' : 'paused',
        };
      })
    );
  }, [connections]);

  // ──────────────────────────────────────────────────────────
  // GLITCH-FREE SMOOTH WINDOW-LEVEL DRAGGING (Figma / React Flow Style)
  // ──────────────────────────────────────────────────────────
  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    setSelectedNodeId(node.id);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startNodeX = node.x;
    const startNodeY = node.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startClientX) / zoom;
      const dy = (moveEvent.clientY - startClientY) / zoom;
      setNodes((currentNodes) =>
        currentNodes.map((n) =>
          n.id === node.id
            ? { ...n, x: Math.round(startNodeX + dx), y: Math.round(startNodeY + dy) }
            : n
        )
      );
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Canvas Panning (Smooth window listener)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pointer-events-auto') && e.target !== canvasRef.current) {
      return;
    }

    setSelectedNodeId(null);
    if (connectingSource) {
      setConnectingSource(null);
    }

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPanX = pan.x;
    const startPanY = pan.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      setPan({
        x: Math.round(startPanX + (moveEvent.clientX - startClientX)),
        y: Math.round(startPanY + (moveEvent.clientY - startClientY)),
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Connecting wire preview mouse tracking
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectingSource && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - canvasRect.left - pan.x) / zoom,
        y: (e.clientY - canvasRect.top - pan.y) / zoom,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.0, Math.max(0.4, Number((prev * zoomFactor).toFixed(2)))));
  };

  // ──────────────────────────────────────────────────────────
  // Port Connection Click Handlers
  // ──────────────────────────────────────────────────────────
  const handlePortClick = (e: React.MouseEvent, targetNodeId: string, portType: 'input' | 'output') => {
    e.stopPropagation();

    if (!connectingSource) {
      setConnectingSource({ nodeId: targetNodeId, port: portType });
    } else {
      if (connectingSource.nodeId !== targetNodeId) {
        const fromId = connectingSource.port === 'output' ? connectingSource.nodeId : targetNodeId;
        const toId = connectingSource.port === 'output' ? targetNodeId : connectingSource.nodeId;

        const exists = connections.some(
          (c) => c.fromNodeId === fromId && c.toNodeId === toId
        );

        if (!exists) {
          setConnections((prev) => [
            ...prev,
            {
              id: `conn-${fromId}-${toId}-${Date.now()}`,
              workflowId: 'wf-active',
              fromNodeId: fromId,
              fromPort: 'output',
              toNodeId: toId,
              toPort: 'input',
              isActive: true,
            },
          ]);
        }
      }
      setConnectingSource(null);
    }
  };

  // ──────────────────────────────────────────────────────────
  // Node Operations
  // ──────────────────────────────────────────────────────────
  const handleAddNodeFromApp = (app: AppDefinition, dropPos?: { x: number; y: number }) => {
    const newId = `node-${app.id}-${Date.now().toString().slice(-4)}`;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const viewCenterX = canvasRect ? (canvasRect.width / 2 - pan.x) / zoom : 0;
    const viewCenterY = canvasRect ? (canvasRect.height / 2 - pan.y) / zoom : 0;

    const posX = dropPos ? dropPos.x : Math.round(viewCenterX + (Math.random() * 80 - 40));
    const posY = dropPos ? dropPos.y : Math.round(viewCenterY + (Math.random() * 80 - 40));

    const isTrigger = app.category === 'triggers' || app.id === 'gmail' || app.id === 'github';
    const newNode: WorkflowNode = {
      id: newId,
      workflowId: 'wf-1',
      type: isTrigger ? 'trigger' : app.category === 'ai' ? 'ai-processor' : 'action',
      appId: app.id,
      title: `${app.name}`,
      actionOrTrigger: app.triggers[0] || app.actions[0] || 'Execute action',
      x: posX,
      y: posY,
      status: 'active',
      config: {},
      isConnectedToCore: true,
    };

    setNodes((prev) => [...prev, newNode]);

    // Automatically connect new node to central Harpy Core
    setConnections((prev) => [
      ...prev,
      {
        id: `conn-${newId}-core-${Date.now()}`,
        workflowId: 'wf-1',
        fromNodeId: isTrigger ? newId : 'harpy-core',
        fromPort: 'output',
        toNodeId: isTrigger ? 'harpy-core' : newId,
        toPort: 'input',
        isActive: true,
      },
    ]);

    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'harpy-core') return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNode = (updated: WorkflowNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  // ──────────────────────────────────────────────────────────
  // AI-Powered Natural Language Automation Generator
  // ──────────────────────────────────────────────────────────
  const handleGenerateWorkflowFromAi = (promptText?: string) => {
    const text = promptText || aiPrompt;
    if (!text.trim()) return;

    setIsGeneratingAi(true);

    setTimeout(() => {
      const lower = text.toLowerCase();

      let sourceAppId = 'gmail';
      let destAppId = 'notion';

      if (lower.includes('gmail') || lower.includes('email')) sourceAppId = 'gmail';
      else if (lower.includes('github') || lower.includes('pr') || lower.includes('issue')) sourceAppId = 'github';
      else if (lower.includes('meet') || lower.includes('calendar')) sourceAppId = 'google-meet';
      else if (lower.includes('chrome') || lower.includes('web') || lower.includes('scrape')) sourceAppId = 'chrome-agent';

      if (lower.includes('notion')) destAppId = 'notion';
      else if (lower.includes('slack')) destAppId = 'slack';
      else if (lower.includes('whatsapp')) destAppId = 'whatsapp';
      else if (lower.includes('discord')) destAppId = 'discord';

      const existingYs = nodes.map((n) => n.y);
      const baseY = existingYs.length > 0 ? Math.max(...existingYs) + 120 : 0;

      const triggerNodeId = `node-${sourceAppId}-${Date.now()}`;
      const actionNodeId = `node-${destAppId}-${Date.now()}`;

      const newNodes: WorkflowNode[] = [
        {
          id: triggerNodeId,
          workflowId: 'wf-1',
          type: 'trigger',
          appId: sourceAppId,
          title: sourceAppId.toUpperCase(),
          actionOrTrigger: 'Inbound event detected',
          x: -240,
          y: baseY,
          status: 'active',
          config: { prompt: text },
          isConnectedToCore: true,
        },
        {
          id: actionNodeId,
          workflowId: 'wf-1',
          type: 'action',
          appId: destAppId,
          title: destAppId.toUpperCase(),
          actionOrTrigger: 'Execute automated payload',
          x: 240,
          y: baseY,
          status: 'active',
          config: {},
          isConnectedToCore: true,
        },
      ];

      const newConns: WorkflowConnection[] = [
        { id: `c-${Date.now()}-1`, workflowId: 'wf-1', fromNodeId: triggerNodeId, fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
        { id: `c-${Date.now()}-2`, workflowId: 'wf-1', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: actionNodeId, toPort: 'input', isActive: true },
      ];

      setNodes((prev) => [...prev, ...newNodes]);
      setConnections((prev) => [...prev, ...newConns]);

      setIsGeneratingAi(false);
      setAiPrompt('');
      setAiSuccessToast(`Connected: ${sourceAppId.toUpperCase()} → Harpy Core → ${destAppId.toUpperCase()}`);

      setTimeout(() => setAiSuccessToast(null), 3500);
    }, 800);
  };

  // ──────────────────────────────────────────────────────────
  // Execution Simulator (Live traces)
  // ──────────────────────────────────────────────────────────
  const handleExecuteAllActive = () => {
    setIsExecutingGlobal(true);

    const trace: ExecutionTrace = {
      workflowId: 'wf-active',
      workflowName: 'Active Ecosystem Orchestration',
      status: 'running',
      startedAt: new Date().toLocaleTimeString(),
      durationMs: 0,
      steps: [
        {
          id: 'step-1',
          nodeId: 'harpy-core',
          nodeTitle: 'Harpy AI Core Orchestrator',
          appId: 'ai-models',
          status: 'running',
          message: 'Polling active trigger sources and verifying OAuth tokens...',
          durationMs: 240,
        },
      ],
    };

    setActiveTrace(trace);
    setIsLogsModalOpen(true);

    setTimeout(() => {
      setActiveTrace((prev) =>
        prev
          ? {
              ...prev,
              steps: [
                {
                  id: 'step-1',
                  nodeId: 'harpy-core',
                  nodeTitle: 'Harpy AI Core Orchestrator',
                  appId: 'ai-models',
                  status: 'success',
                  message: 'OAuth 2.0 handshake validated. Token active.',
                  durationMs: 240,
                },
                {
                  id: 'step-2',
                  nodeId: 'node-in',
                  nodeTitle: 'Inbound Ingest Pipeline',
                  appId: 'gmail',
                  status: 'running',
                  message: 'Streaming real-time events through Harpy 120B kernel...',
                  durationMs: 420,
                },
              ],
            }
          : null
      );
    }, 700);

    setTimeout(() => {
      setActiveTrace((prev) =>
        prev
          ? {
              ...prev,
              status: 'success',
              durationMs: 1140,
              steps: [
                {
                  id: 'step-1',
                  nodeId: 'harpy-core',
                  nodeTitle: 'Harpy AI Core Orchestrator',
                  appId: 'ai-models',
                  status: 'success',
                  message: 'OAuth 2.0 handshake validated. Token active.',
                  durationMs: 240,
                },
                {
                  id: 'step-2',
                  nodeId: 'node-in',
                  nodeTitle: 'Inbound Ingest Pipeline',
                  appId: 'gmail',
                  status: 'success',
                  message: 'Processed 2 payload events. Dispatched to destination.',
                  durationMs: 420,
                  outputPayload: { itemsProcessed: 2, status: 'synced_to_core' },
                },
                {
                  id: 'step-3',
                  nodeId: 'node-out',
                  nodeTitle: 'Destination Synchronizer',
                  appId: 'notion',
                  status: 'success',
                  message: 'Payload committed successfully. Audit trail logged.',
                  durationMs: 480,
                  outputPayload: { recordId: 'notion-rec-9821a', latency: '48ms' },
                },
              ],
            }
          : null
      );
      setIsExecutingGlobal(false);
    }, 1500);
  };

  // Node Inspector Selection (Handles both app nodes and central Harpy Core)
  const harpyCoreMockNode: WorkflowNode = {
    id: 'harpy-core',
    workflowId: 'all',
    type: 'harpy-core',
    appId: 'harpy-core',
    title: 'Harpy AI System',
    actionOrTrigger: 'Autonomous Kernel Orchestrator',
    x: 0,
    y: 0,
    status: 'active',
    config: { model: 'GPT-OSS 120B', mode: 'Autonomous Multi-Agent' },
    isConnectedToCore: true,
  };

  const harpyCoreMockApp: AppDefinition = {
    id: 'harpy-core',
    name: 'Harpy AI Core',
    category: 'ai',
    description: 'Central autonomous orchestrator connecting all applications and tools.',
    iconName: 'Bot',
    color: '#8C7A6B',
    isConnected: true,
    accountName: 'Harpy Kernel v2.6',
    authType: 'session',
    triggers: ['Continuous Agent Execution', 'Inbound webhook stream'],
    actions: ['Execute multi-app orchestration', 'Synthesize & route payloads'],
  };

  const selectedNodeObject =
    selectedNodeId === 'harpy-core'
      ? harpyCoreMockNode
      : nodes.find((n) => n.id === selectedNodeId) || null;

  const selectedApp =
    selectedNodeId === 'harpy-core'
      ? harpyCoreMockApp
      : selectedNodeObject
      ? apps.find((a) => a.id === selectedNodeObject.appId) || null
      : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#07070B] text-[#D8D4CF] font-inter select-none overflow-hidden animate-in fade-in duration-200">
      {/* ──────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (DARK METALLIC THEME)
         ────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-[#181824] bg-[#0A0A10]/95 backdrop-blur-xl px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Branding with Official Harpy Logo & Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pr-3 border-r border-[#1C1C28] shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#141420] border border-[#242436] flex items-center justify-center p-1 shadow-sm">
              <img
                src="/icon.png"
                alt="Harpy AI"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div>
              <span className="font-cinzel text-xs font-semibold text-[#E8DDC7] tracking-wider uppercase block leading-tight">
                Harpy Connectors
              </span>
              <span className="text-[9px] font-mono text-[#7A7A8E] block leading-tight">
                Automation Workspace
              </span>
            </div>
          </div>

          {/* Toggle Sidebar Button */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
              isSidebarOpen
                ? 'bg-[#161622] border-[#2A2A3E] text-[#D8D4CF]'
                : 'bg-[#0E0E16] border-[#1C1C28] text-[#7A7A8E] hover:text-[#E8DDC7]'
            }`}
            title={isSidebarOpen ? 'Collapse Apps Sidebar' : 'Expand Apps Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Right: Live Status, Execution Logs, Run Button & Close */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Active Connections Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0E0E16] border border-[#1C1C28] text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{connections.length} Active Connections</span>
          </div>

          {/* Execution Logs Drawer Button */}
          <button
            type="button"
            onClick={() => setIsLogsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#101018] hover:bg-[#161622] border border-[#1E1E2C] hover:border-[#2C2C40] text-xs font-mono text-[#8C8880] hover:text-[#D8D4CF] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="View Execution Audit Logs"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </button>

          {/* Run Workflows Button (Dark Metallic Titanium Button) */}
          <button
            type="button"
            onClick={handleExecuteAllActive}
            disabled={isExecutingGlobal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-[#1E1E2C] via-[#161622] to-[#101018] hover:bg-[#1E1E2E] text-[#D8D4CF] hover:text-white border border-[#2A2A3E] hover:border-[#3E3E58] text-xs font-mono font-medium tracking-wide transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isExecutingGlobal ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-[#8C7A6B]" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-[#8C7A6B] text-[#8C7A6B]" />
                <span>Run Workflows</span>
              </>
            )}
          </button>

          {/* Close Canvas */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#101018] border border-[#1E1E2C] text-[#7A7A8E] hover:text-[#D8D4CF] hover:border-[#2C2C40] transition-colors"
            title="Exit Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. MAIN BODY (LEFT APP LIBRARY + FIGMA CANVAS + DOCK)
         ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* ──────────────────────────────────────────────────────────
            LEFT SIDEBAR: APPLICATIONS LIBRARY (Collapsible)
           ────────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#090910]/95 backdrop-blur-xl border-r border-[#181824] flex flex-col z-20 shrink-0 overflow-hidden"
            >
              {/* Search App */}
              <div className="p-3 border-b border-[#141420]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7A7A8E] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search apps (Gmail, Slack)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0E0E18] border border-[#1E1E2C] text-xs font-mono text-[#D8D4CF] placeholder-[#7A7A8E]/60 focus:outline-none focus:border-[#3A3A52]"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {['all', 'communication', 'productivity', 'developer', 'ai'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-[#1C1C2C] text-[#E8DDC7] border border-[#323248] font-semibold'
                          : 'text-[#7A7A8E] hover:text-[#D8D4CF]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:thin]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono text-[#7A7A8E] uppercase tracking-wider">
                    Applications ({filteredApps.length})
                  </span>
                  <span className="text-[9px] font-mono text-[#8C7A6B]">Click to add</span>
                </div>

                {filteredApps.map((app) => {
                  const Icon = APP_ICONS[app.iconName] || APP_ICONS.Globe;
                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragEnd={(e) => {
                        const canvasRect = canvasRef.current?.getBoundingClientRect();
                        if (canvasRect) {
                          const dropX = Math.round((e.clientX - canvasRect.left - pan.x) / zoom);
                          const dropY = Math.round((e.clientY - canvasRect.top - pan.y) / zoom);
                          handleAddNodeFromApp(app, { x: dropX, y: dropY });
                        }
                      }}
                      className="p-2.5 rounded-xl bg-[#0C0C14] border border-[#181824] hover:border-[#2C2C40] transition-all group flex flex-col gap-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
                            style={{ backgroundColor: `${app.color}15`, color: app.color }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-semibold text-[#D8D4CF] block truncate">
                              {app.name}
                            </span>
                            <span className="text-[10px] text-[#7A7A8E] font-mono block truncate">
                              {app.category}
                            </span>
                          </div>
                        </div>

                        {/* Quick Add Button */}
                        <button
                          type="button"
                          onClick={() => handleAddNodeFromApp(app)}
                          className="p-1 rounded-lg bg-[#141420] text-[#7A7A8E] hover:text-[#E8DDC7] hover:bg-[#1E1E30] transition-colors"
                          title={`Add ${app.name} to canvas`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[10px] text-[#7A7A8E] line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>

                      <div className="pt-1.5 border-t border-[#141420] flex items-center justify-between">
                        {app.isConnected ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Auth Required
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setAuthenticatingApp(app)}
                          className="text-[10px] font-mono text-[#8C7A6B] hover:text-[#D8D4CF] hover:underline"
                        >
                          Configure
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar Footer */}
              <div className="p-3 border-t border-[#141420] bg-[#07070E]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#7A7A8E]">Harpy Core</span>
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE (120B)
                  </span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ──────────────────────────────────────────────────────────
            FIGMA-INSPIRED INFINITE MOVABLE CANVAS
            (Dark Metallic Background with subtle dot grid)
           ────────────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onWheel={handleWheel}
          className="flex-1 h-full relative overflow-hidden cursor-crosshair bg-[#06060A]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), radial-gradient(rgba(198, 164, 106, 0.03) 1px, transparent 1px)',
            backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* ──────────────────────────────────────────────────────────
              FLOATING LEFT CANVAS TOOLBAR (Figma / Miro Style)
              Select, Hand/Drag, Zoom In/Out, Recenter
             ────────────────────────────────────────────────────────── */}
          <div className="absolute top-6 left-6 z-30 flex flex-col items-center gap-1 bg-[#0C0C14]/92 backdrop-blur-xl p-1.5 rounded-2xl border border-[#222232] shadow-[0_12px_32px_rgba(0,0,0,0.7)] select-none">
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-xl text-xs transition-colors ${
                activeTool === 'select'
                  ? 'bg-[#1C1C2C] text-[#E8DDC7] border border-[#303046]'
                  : 'text-[#7A7A8E] hover:text-[#E8DDC7] hover:bg-white/5'
              }`}
              title="Select & Move Nodes (V)"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('hand')}
              className={`p-2 rounded-xl text-xs transition-colors ${
                activeTool === 'hand'
                  ? 'bg-[#1C1C2C] text-[#E8DDC7] border border-[#303046]'
                  : 'text-[#7A7A8E] hover:text-[#E8DDC7] hover:bg-white/5'
              }`}
              title="Hand Pan Canvas (H)"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <div className="w-5 h-px bg-[#1E1E2C] my-1" />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
              className="p-2 rounded-xl text-[#7A7A8E] hover:text-[#E8DDC7] hover:bg-white/5 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-[#8C7A6B] py-0.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-2 rounded-xl text-[#7A7A8E] hover:text-[#E8DDC7] hover:bg-white/5 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="w-5 h-px bg-[#1E1E2C] my-1" />

            <button
              type="button"
              onClick={centerCanvas}
              className="p-2 rounded-xl text-[#7A7A8E] hover:text-[#D8D4CF] hover:bg-white/5 transition-colors"
              title="Center View (Fit)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* AI Success Toast */}
          <AnimatePresence>
            {aiSuccessToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-4 inset-x-0 z-40 pointer-events-none flex justify-center px-4"
              >
                <div className="px-4 py-2 rounded-xl bg-[#0E1612]/95 border border-emerald-500/40 text-emerald-200 text-xs font-mono shadow-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{aiSuccessToast}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ──────────────────────────────────────────────────────────
              CANVAS TRANSFORM LAYER (Pan & Zoom Container)
             ────────────────────────────────────────────────────────── */}
          <div
            className="absolute origin-top-left pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: '10000px',
              height: '10000px',
            }}
          >
            {/* SVG CONNECTION WIRES LAYER */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs>
                <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5A5A72" />
                  <stop offset="50%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#5A5A72" />
                </linearGradient>
                <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Render Existing Connections (Perimeter dynamic angle) */}
              {connections.map((conn) => {
                let fromX = 0;
                let fromY = 0;
                let toX = 0;
                let toY = 0;

                if (conn.fromNodeId === 'harpy-core') {
                  const targetNode = nodes.find((n) => n.id === conn.toNodeId);
                  if (targetNode) {
                    const angle = Math.atan2(targetNode.y, targetNode.x);
                    fromX = Math.round(48 * Math.cos(angle));
                    fromY = Math.round(48 * Math.sin(angle));
                    toX = targetNode.x - Math.round(34 * Math.cos(angle));
                    toY = targetNode.y - Math.round(34 * Math.sin(angle));
                  }
                } else if (conn.toNodeId === 'harpy-core') {
                  const srcNode = nodes.find((n) => n.id === conn.fromNodeId);
                  if (srcNode) {
                    const angle = Math.atan2(srcNode.y, srcNode.x);
                    toX = Math.round(48 * Math.cos(angle));
                    toY = Math.round(48 * Math.sin(angle));
                    fromX = srcNode.x - Math.round(34 * Math.cos(angle));
                    fromY = srcNode.y - Math.round(34 * Math.sin(angle));
                  }
                } else {
                  const srcNode = nodes.find((n) => n.id === conn.fromNodeId);
                  const targetNode = nodes.find((n) => n.id === conn.toNodeId);
                  if (srcNode && targetNode) {
                    const angle = Math.atan2(targetNode.y - srcNode.y, targetNode.x - srcNode.x);
                    fromX = srcNode.x + Math.round(34 * Math.cos(angle));
                    fromY = srcNode.y + Math.round(34 * Math.sin(angle));
                    toX = targetNode.x - Math.round(34 * Math.cos(angle));
                    toY = targetNode.y - Math.round(34 * Math.sin(angle));
                  }
                }

                // Smooth Cubic Bezier curve
                const dx = Math.max(50, Math.abs(toX - fromX) * 0.5);
                const pathD = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer group">
                    {/* Transparent wide hit area for easy clicking */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      onClick={() => {
                        setConnections((prev) => prev.filter((c) => c.id !== conn.id));
                      }}
                    />

                    {/* Outer Metallic Dark Wire */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={conn.isActive ? '#3E3E54' : '#222232'}
                      strokeWidth={conn.isActive ? 2 : 1.5}
                      strokeOpacity={conn.isActive ? 0.7 : 0.35}
                      filter={conn.isActive ? 'url(#wireGlow)' : undefined}
                    />

                    {/* Inner Animated Pulse Energy Line */}
                    {conn.isActive && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="url(#activeGrad)"
                        strokeWidth={1.5}
                        strokeDasharray="5 7"
                        className="animate-flow-dash"
                        style={{
                          animation: 'flowDash 1.4s linear infinite',
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Connecting Wire Preview while dragging out from Harpy Core or port */}
              {connectingSource && (
                (() => {
                  let wireStartX = 0;
                  let wireStartY = 0;
                  if (connectingSource.nodeId === 'harpy-core') {
                    const angle = Math.atan2(mousePos.y, mousePos.x);
                    wireStartX = Math.round(48 * Math.cos(angle));
                    wireStartY = Math.round(48 * Math.sin(angle));
                  } else {
                    const srcNode = nodes.find((n) => n.id === connectingSource.nodeId);
                    if (srcNode) {
                      const angle = Math.atan2(mousePos.y - srcNode.y, mousePos.x - srcNode.x);
                      wireStartX = srcNode.x + Math.round(34 * Math.cos(angle));
                      wireStartY = srcNode.y + Math.round(34 * Math.sin(angle));
                    }
                  }

                  return (
                    <path
                      d={`M ${wireStartX} ${wireStartY} L ${mousePos.x} ${mousePos.y}`}
                      fill="none"
                      stroke="#8C7A6B"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  );
                })()
              )}
            </svg>

            {/* ──────────────────────────────────────────────────────────
                CENTRAL HARPY AI SYSTEM NODE (EXACT LOGO FROM /icon.png)
                No spinning wire rings, no permanent dots!
                Drag outward to pull a connection wire!
               ────────────────────────────────────────────────────────── */}
            <div
              className="absolute pointer-events-auto select-none"
              style={{
                left: 0,
                top: 0,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Circular Harpy Core Disc */}
              <div
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();

                  const startClientX = e.clientX;
                  const startClientY = e.clientY;
                  let isDraggingWire = false;

                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const dist = Math.hypot(moveEvent.clientX - startClientX, moveEvent.clientY - startClientY);
                    if (dist > 8 && !isDraggingWire) {
                      isDraggingWire = true;
                      setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                    }
                    if (isDraggingWire && canvasRef.current) {
                      const canvasRect = canvasRef.current.getBoundingClientRect();
                      setMousePos({
                        x: (moveEvent.clientX - canvasRect.left - pan.x) / zoom,
                        y: (moveEvent.clientY - canvasRect.top - pan.y) / zoom,
                      });
                    }
                  };

                  const onMouseUp = (upEvent: MouseEvent) => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);

                    if (isDraggingWire && canvasRef.current) {
                      const canvasRect = canvasRef.current.getBoundingClientRect();
                      const dropCanvasX = (upEvent.clientX - canvasRect.left - pan.x) / zoom;
                      const dropCanvasY = (upEvent.clientY - canvasRect.top - pan.y) / zoom;

                      // Find closest node within 65px
                      const targetNode = nodes.find(
                        (n) => Math.hypot(n.x - dropCanvasX, n.y - dropCanvasY) < 65
                      );

                      if (targetNode) {
                        const exists = connections.some(
                          (c) =>
                            (c.fromNodeId === 'harpy-core' && c.toNodeId === targetNode.id) ||
                            (c.fromNodeId === targetNode.id && c.toNodeId === 'harpy-core')
                        );
                        if (!exists) {
                          setConnections((prev) => [
                            ...prev,
                            {
                              id: `conn-core-${targetNode.id}-${Date.now()}`,
                              workflowId: 'wf-1',
                              fromNodeId: 'harpy-core',
                              fromPort: 'output',
                              toNodeId: targetNode.id,
                              toPort: 'input',
                              isActive: true,
                            },
                          ]);
                        }
                      }
                      setConnectingSource(null);
                    } else {
                      // Click opens Harpy AI inspector
                      setSelectedNodeId('harpy-core');
                    }
                  };

                  window.addEventListener('mousemove', onMouseMove);
                  window.addEventListener('mouseup', onMouseUp);
                }}
                className={`relative w-24 h-24 rounded-full bg-gradient-to-b from-[#161622] via-[#0E0E16] to-[#08080E] border transition-all flex flex-col items-center justify-center cursor-pointer shadow-[0_0_30px_rgba(0,0,0,0.8)] group ${
                  selectedNodeId === 'harpy-core'
                    ? 'border-[#C6A46A]/80 shadow-[0_0_35px_rgba(198,164,106,0.25)] ring-1 ring-[#C6A46A]/40'
                    : 'border-[#26263A] hover:border-[#383850] hover:scale-105'
                }`}
              >
                {/* Official Harpy Logo Image from /icon.png */}
                <div className="w-14 h-14 rounded-full bg-[#101018] border border-[#262638] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform overflow-hidden p-1.5">
                  <img
                    src="/icon.png"
                    alt="Harpy AI"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(198,164,106,0.25)]"
                  />
                </div>
              </div>

              {/* Harpy AI Subtle Label */}
              <div className="text-center mt-2 pointer-events-none">
                <span className="font-cinzel text-xs font-semibold text-[#D8D4CF] tracking-wider uppercase block drop-shadow-md">
                  Harpy AI
                </span>
                <span className="text-[9px] font-mono text-[#7A7A8E] block">Autonomous Core</span>
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────────
                RENDER ALL APPLICATION LOGO NODES ON CANVAS
               ────────────────────────────────────────────────────────── */}
            {nodes.map((node) => {
              const app = apps.find((a) => a.id === node.appId);
              const Icon = app ? APP_ICONS[app.iconName] || APP_ICONS.Globe : APP_ICONS.Sparkles;
              const isSelected = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  className="absolute pointer-events-auto select-none"
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Circular / Squircle App Logo Node (Dark Metallic) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectingSource && connectingSource.nodeId !== node.id) {
                        // Complete connection if one is being drawn
                        const fromId = connectingSource.nodeId;
                        const toId = node.id;
                        const exists = connections.some(
                          (c) => c.fromNodeId === fromId && c.toNodeId === toId
                        );
                        if (!exists) {
                          setConnections((prev) => [
                            ...prev,
                            {
                              id: `conn-${fromId}-${toId}-${Date.now()}`,
                              workflowId: 'wf-1',
                              fromNodeId: fromId,
                              fromPort: 'output',
                              toNodeId: toId,
                              toPort: 'input',
                              isActive: true,
                            },
                          ]);
                        }
                        setConnectingSource(null);
                        return;
                      }

                      setSelectedNodeId(node.id);
                    }}
                    className={`relative w-[68px] h-[68px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#C6A46A]/80 shadow-[0_0_20px_rgba(198,164,106,0.3)] scale-105 ring-1 ring-[#C6A46A]/40'
                        : 'border-[#1E1E2C] hover:border-[#323246] hover:scale-105 shadow-lg'
                    }`}
                    style={{
                      backgroundColor: '#0A0A12',
                      borderWidth: '1.5px',
                    }}
                  >
                    {/* App Brand Color Soft Glow inside */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
                      style={{ backgroundColor: app?.color || '#FFFFFF' }}
                    />

                    {/* App Icon */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform"
                      style={{ color: app?.color || '#D8D4CF' }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Active Status Dot */}
                    <div className="absolute top-1.5 right-1.5 pointer-events-none">
                      <span
                        className={`w-2 h-2 rounded-full block ${
                          node.isConnectedToCore
                            ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]'
                            : 'bg-amber-400'
                        }`}
                        title={node.isConnectedToCore ? 'Active' : 'Paused'}
                      />
                    </div>

                    {/* Left Input Port Handle (Dark Metallic) */}
                    <button
                      type="button"
                      onClick={(e) => handlePortClick(e, node.id, 'input')}
                      className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0E0E16] border-2 border-[#323246] hover:border-[#8C7A6B] hover:scale-125 transition-transform flex items-center justify-center shadow-md cursor-pointer z-10"
                      title="Input Port: Click to connect wire"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8C7A6B]" />
                    </button>

                    {/* Right Output Port Handle (Dark Metallic) */}
                    <button
                      type="button"
                      onClick={(e) => handlePortClick(e, node.id, 'output')}
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0E0E16] border-2 border-[#323246] hover:border-[#34D399] hover:scale-125 transition-transform flex items-center justify-center shadow-md cursor-pointer z-10"
                      title="Output Port: Click to connect wire"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                    </button>
                  </div>

                  {/* App Name Label Below Node */}
                  <div className="text-center mt-1.5 pointer-events-none">
                    <span className="text-[11px] font-mono text-[#D8D4CF] block truncate max-w-[80px] drop-shadow-md">
                      {app?.name || node.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ──────────────────────────────────────────────────────────
              3. FLOATING AI AUTOMATION PROMPT BAR (DARK METALLIC DOCK)
             ────────────────────────────────────────────────────────── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex justify-center w-full max-w-xl px-4">
            <div className="pointer-events-auto w-full p-2 bg-[#0A0A12]/95 backdrop-blur-xl border border-[#1E1E2C] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center gap-3">
              <div className="pl-2">
                <Sparkles className="w-4 h-4 text-[#7A7A8E]" />
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateWorkflowFromAi();
                }}
                placeholder="Describe automation (e.g. 'Summarize new Gmail emails and sync to Notion')..."
                className="flex-1 bg-transparent text-xs text-[#D8D4CF] placeholder-[#6A6A7E] font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleGenerateWorkflowFromAi()}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-medium tracking-wide transition-all flex items-center gap-1.5 ${
                  aiPrompt.trim()
                    ? 'bg-[#181824] hover:bg-[#202030] text-[#D8D4CF] border border-[#28283C] hover:border-[#3C3C56] hover:text-white cursor-pointer shadow-sm'
                    : 'bg-[#0E0E14] text-[#505060] border border-[#161622] cursor-not-allowed'
                }`}
              >
                {isGeneratingAi ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin text-[#7A7A8E]" />
                    <span>Building...</span>
                  </>
                ) : (
                  <>
                    <span>Build</span>
                    <Send className="w-3 h-3 text-[#7A7A8E]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            RIGHT SIDEBAR: NODE INSPECTOR DRAWER
            Opens automatically when clicking on any application logo or Harpy Core!
           ────────────────────────────────────────────────────────── */}
        <NodeInspectorModal
          node={selectedNodeObject}
          app={selectedApp}
          isOpen={!!selectedNodeObject}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onRunSingleNode={() => handleExecuteAllActive()}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────
          OAUTH 2.0 AUTHENTICATION DIALOG MODAL
         ────────────────────────────────────────────────────────── */}
      <OAuthModal
        app={authenticatingApp}
        isOpen={!!authenticatingApp}
        onClose={() => setAuthenticatingApp(null)}
        onToggleConnect={(appId, isConn, accountEmail) => {
          setApps((prev) =>
            prev.map((a) =>
              a.id === appId
                ? {
                    ...a,
                    isConnected: isConn,
                    accountEmail: accountEmail || a.accountEmail,
                  }
                : a
            )
          );
        }}
      />

      {/* ──────────────────────────────────────────────────────────
          EXECUTION LOGS AUDIT DRAWER MODAL
         ────────────────────────────────────────────────────────── */}
      <ExecutionLogsModal
        trace={activeTrace}
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />
    </div>
  );
}
