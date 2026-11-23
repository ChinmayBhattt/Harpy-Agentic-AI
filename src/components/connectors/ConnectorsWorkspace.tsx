'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
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
  const [pan, setPan] = useState({ x: 260, y: 120 });
  const [zoom, setZoom] = useState(0.9);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'connect'>('select');

  // ──────────────────────────────────────────────────────────
  // Apps & Authentication State
  // ──────────────────────────────────────────────────────────
  const [apps, setApps] = useState<AppDefinition[]>(DEFAULT_APPS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [authenticatingApp, setAuthenticatingApp] = useState<AppDefinition | null>(null);

  // ──────────────────────────────────────────────────────────
  // Workflows & Nodes State
  // ──────────────────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'wf-1',
      name: 'Gmail → AI Summary → Notion Sync',
      description: 'Summarize incoming client emails with Harpy AI and update Notion board',
      isConnectedToCore: true,
      status: 'active',
      color: '#EA4335',
      createdAt: '2026-11-23',
      lastRun: '10 mins ago',
    },
    {
      id: 'wf-2',
      name: 'GitHub Bug Triage → AI Code Fix → Slack Alert',
      description: 'Review new GitHub issues, auto-draft code fixes, and broadcast to Slack',
      isConnectedToCore: true,
      status: 'active',
      color: '#5865F2',
      createdAt: '2026-11-23',
      lastRun: '1 hour ago',
    },
    {
      id: 'wf-3',
      name: 'Chrome Web Scraper → WhatsApp Alert',
      description: 'Extract web page updates and notify team over WhatsApp',
      isConnectedToCore: false, // Disconnected to demonstrate Paused state
      status: 'paused',
      color: '#25D366',
      createdAt: '2026-11-23',
    },
  ]);

  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('all');

  // Nodes on Canvas
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    // Workflow 1 Nodes (Gmail -> Harpy AI -> Notion)
    {
      id: 'node-gmail-1',
      workflowId: 'wf-1',
      type: 'trigger',
      appId: 'gmail',
      title: 'Gmail Inbound Monitor',
      actionOrTrigger: 'New email received',
      x: -360,
      y: -120,
      status: 'active',
      config: { filter: 'is:unread label:clients', interval: 'Real-time (Push)' },
      isConnectedToCore: true,
    },
    {
      id: 'node-ai-1',
      workflowId: 'wf-1',
      type: 'ai-processor',
      appId: 'ai-models',
      title: 'Harpy 120B Synthesizer',
      actionOrTrigger: 'Summarize text & extract tasks',
      x: -80,
      y: -120,
      status: 'active',
      config: { prompt: 'Extract 3 key action items, deadlines, and urgency score.' },
      isConnectedToCore: true,
    },
    {
      id: 'node-notion-1',
      workflowId: 'wf-1',
      type: 'action',
      appId: 'notion',
      title: 'Notion Database Dispatcher',
      actionOrTrigger: 'Create database page',
      x: 220,
      y: -120,
      status: 'active',
      config: { database: 'Harpy AI Action Tasks' },
      isConnectedToCore: true,
    },

    // Workflow 2 Nodes (GitHub -> Slack)
    {
      id: 'node-gh-1',
      workflowId: 'wf-2',
      type: 'trigger',
      appId: 'github',
      title: 'GitHub Issues Watcher',
      actionOrTrigger: 'New Issue created',
      x: -360,
      y: 180,
      status: 'active',
      config: { repo: 'ChinmayBhattt/Harpy-Agentic-AI' },
      isConnectedToCore: true,
    },
    {
      id: 'node-slack-1',
      workflowId: 'wf-2',
      type: 'action',
      appId: 'slack',
      title: 'Slack Dev Broadcast',
      actionOrTrigger: 'Send channel message',
      x: 220,
      y: 180,
      status: 'active',
      config: { channel: '#harpy-announcements' },
      isConnectedToCore: true,
    },

    // Workflow 3 Nodes (Chrome -> WhatsApp) - Unconnected demonstration
    {
      id: 'node-chrome-1',
      workflowId: 'wf-3',
      type: 'trigger',
      appId: 'chrome-agent',
      title: 'Chrome Web Scraper',
      actionOrTrigger: 'Web page updated',
      x: -360,
      y: 380,
      status: 'paused',
      config: { url: 'https://news.ycombinator.com' },
      isConnectedToCore: false,
    },
    {
      id: 'node-wa-1',
      workflowId: 'wf-3',
      type: 'action',
      appId: 'whatsapp',
      title: 'WhatsApp Alert Dispatch',
      actionOrTrigger: 'Send WhatsApp message',
      x: -80,
      y: 380,
      status: 'paused',
      config: { recipient: '+91 98765 43210' },
      isConnectedToCore: false,
    },
  ]);

  // Connections (Edges)
  const [connections, setConnections] = useState<WorkflowConnection[]>([
    // Connect Workflow 1 to Central Harpy Core (Node id: "harpy-core")
    { id: 'conn-wf1-core', workflowId: 'wf-1', fromNodeId: 'node-gmail-1', fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
    { id: 'conn-wf1-ai', workflowId: 'wf-1', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-ai-1', toPort: 'input', isActive: true },
    { id: 'conn-wf1-notion', workflowId: 'wf-1', fromNodeId: 'node-ai-1', fromPort: 'output', toNodeId: 'node-notion-1', toPort: 'input', isActive: true },

    // Connect Workflow 2 to Central Harpy Core
    { id: 'conn-wf2-core', workflowId: 'wf-2', fromNodeId: 'node-gh-1', fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
    { id: 'conn-wf2-slack', workflowId: 'wf-2', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-slack-1', toPort: 'input', isActive: true },

    // Workflow 3 is NOT connected to core (connecting it activates it!)
    { id: 'conn-wf3-wa', workflowId: 'wf-3', fromNodeId: 'node-chrome-1', fromPort: 'output', toNodeId: 'node-wa-1', toPort: 'input', isActive: false },
  ]);

  // ──────────────────────────────────────────────────────────
  // Interactive Selection, Dragging & Connecting
  // ──────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingSource, setConnectingSource] = useState<{ nodeId: string; port: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Natural Language AI Automation Input
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessToast, setAiSuccessToast] = useState<string | null>(null);

  // Execution Simulator Trace
  const [activeTrace, setActiveTrace] = useState<ExecutionTrace | null>(null);
  const [isExecutingGlobal, setIsExecutingGlobal] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Filtered Apps
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [apps, selectedCategory, searchQuery]);

  // Filtered Nodes by Workflow
  const visibleNodes = useMemo(() => {
    if (activeWorkflowId === 'all') return nodes;
    return nodes.filter((n) => n.workflowId === activeWorkflowId);
  }, [nodes, activeWorkflowId]);

  // Visible Connections
  const visibleConnections = useMemo(() => {
    if (activeWorkflowId === 'all') return connections;
    return connections.filter((c) => c.workflowId === activeWorkflowId);
  }, [connections, activeWorkflowId]);

  // Check if a workflow is connected to Central Harpy Core
  const isWorkflowConnectedToCore = useCallback(
    (wfId: string) => {
      return connections.some(
        (c) => c.workflowId === wfId && (c.fromNodeId === 'harpy-core' || c.toNodeId === 'harpy-core')
      );
    },
    [connections]
  );

  // Update workflow active status dynamically based on Harpy Core connectivity
  useEffect(() => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        const connected = isWorkflowConnectedToCore(wf.id);
        return {
          ...wf,
          isConnectedToCore: connected,
          status: connected ? (wf.status === 'running' ? 'running' : 'active') : 'paused',
        };
      })
    );

    setNodes((prev) =>
      prev.map((n) => {
        const connected = isWorkflowConnectedToCore(n.workflowId);
        return {
          ...n,
          isConnectedToCore: connected,
          status: connected ? (n.status === 'running' ? 'running' : 'active') : 'paused',
        };
      })
    );
  }, [connections, isWorkflowConnectedToCore]);

  // ──────────────────────────────────────────────────────────
  // Canvas Mouse & Gesture Handlers
  // ──────────────────────────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current && (e.target as HTMLElement).tagName !== 'svg') {
      return;
    }
    setSelectedNodeId(null);
    if (activeTool === 'hand' || e.button === 1 || e.buttons === 4 || e.altKey) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // Panning
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    // Node Dragging
    if (draggingNodeId) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const rawX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const rawY = (e.clientY - canvasRect.top - pan.y) / zoom;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId
            ? { ...n, x: Math.round(rawX - dragOffset.x), y: Math.round(rawY - dragOffset.y) }
            : n
        )
      );
    }

    // Connecting Wire Dragging preview
    if (connectingSource) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        setMousePos({
          x: (e.clientX - canvasRect.left - pan.x) / zoom,
          y: (e.clientY - canvasRect.top - pan.y) / zoom,
        });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingSource(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.0, Math.max(0.4, Number((prev * zoomFactor).toFixed(2)))));
  };

  // ──────────────────────────────────────────────────────────
  // Node Operations
  // ──────────────────────────────────────────────────────────
  const handleAddNodeFromApp = (app: AppDefinition, dropPos?: { x: number; y: number }) => {
    const newId = `node-${app.id}-${Date.now().toString().slice(-4)}`;
    const targetWf = activeWorkflowId === 'all' ? workflows[0]?.id || 'wf-1' : activeWorkflowId;

    // Viewport center or drop coordinate
    const posX = dropPos ? dropPos.x : Math.round(-pan.x / zoom + (Math.random() * 80 - 40));
    const posY = dropPos ? dropPos.y : Math.round(-pan.y / zoom + (Math.random() * 80 - 40));

    const newNode: WorkflowNode = {
      id: newId,
      workflowId: targetWf,
      type: app.category === 'triggers' ? 'trigger' : app.category === 'ai' ? 'ai-processor' : 'action',
      appId: app.id,
      title: `${app.name} Handler`,
      actionOrTrigger: app.triggers[0] || app.actions[0] || 'Execute action',
      x: posX,
      y: posY,
      status: 'active',
      config: {},
      isConnectedToCore: true,
    };

    setNodes((prev) => [...prev, newNode]);

    // Automatically connect new node to central core for convenience
    setConnections((prev) => [
      ...prev,
      {
        id: `conn-${newId}-core`,
        workflowId: targetWf,
        fromNodeId: 'harpy-core',
        fromPort: 'output',
        toNodeId: newId,
        toPort: 'input',
        isActive: true,
      },
    ]);

    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'harpy-core') return; // Cannot delete central core
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNode = (updated: WorkflowNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  // Toggle Connection between Workflow and Harpy Core
  const toggleWorkflowCoreConnection = (wfId: string) => {
    const isConnected = isWorkflowConnectedToCore(wfId);

    if (isConnected) {
      // Disconnect all edges between this workflow and Harpy Core
      setConnections((prev) =>
        prev.filter(
          (c) => !(c.workflowId === wfId && (c.fromNodeId === 'harpy-core' || c.toNodeId === 'harpy-core'))
        )
      );
    } else {
      // Connect first node of workflow to Harpy Core
      const firstWfNode = nodes.find((n) => n.workflowId === wfId);
      if (firstWfNode) {
        setConnections((prev) => [
          ...prev,
          {
            id: `conn-${wfId}-core-${Date.now()}`,
            workflowId: wfId,
            fromNodeId: 'harpy-core',
            fromPort: 'output',
            toNodeId: firstWfNode.id,
            toPort: 'input',
            isActive: true,
          },
        ]);
      }
    }
  };

  // ──────────────────────────────────────────────────────────
  // AI-Powered Natural Language Automation Generator
  // ──────────────────────────────────────────────────────────
  const handleGenerateWorkflowFromAi = (promptText?: string) => {
    const text = promptText || aiPrompt;
    if (!text.trim()) return;

    setIsGeneratingAi(true);

    setTimeout(() => {
      const newWfId = `wf-ai-${Date.now().toString().slice(-4)}`;
      const lower = text.toLowerCase();

      let title = 'AI Generated Automation';
      let sourceAppId = 'gmail';
      let destAppId = 'notion';

      if (lower.includes('gmail') || lower.includes('email')) sourceAppId = 'gmail';
      else if (lower.includes('github') || lower.includes('pr')) sourceAppId = 'github';
      else if (lower.includes('meet')) sourceAppId = 'google-meet';
      else if (lower.includes('chrome') || lower.includes('web')) sourceAppId = 'chrome-agent';

      if (lower.includes('notion')) destAppId = 'notion';
      else if (lower.includes('slack')) destAppId = 'slack';
      else if (lower.includes('whatsapp')) destAppId = 'whatsapp';
      else if (lower.includes('discord')) destAppId = 'discord';

      if (sourceAppId === 'gmail' && destAppId === 'notion') title = 'Gmail → AI Synthesizer → Notion Database';
      else if (sourceAppId === 'github' && destAppId === 'slack') title = 'GitHub PR Triage → Slack Broadcast';
      else title = `${sourceAppId.toUpperCase()} → Harpy AI → ${destAppId.toUpperCase()}`;

      const newWorkflow: Workflow = {
        id: newWfId,
        name: title,
        description: text,
        isConnectedToCore: true,
        status: 'active',
        color: '#C6A46A',
        createdAt: new Date().toISOString().split('T')[0],
        lastRun: 'Just now',
      };

      // Create 3 connected nodes: Trigger -> AI Model -> Destination
      const triggerNodeId = `node-ai-trig-${Date.now()}`;
      const aiNodeId = `node-ai-proc-${Date.now()}`;
      const actionNodeId = `node-ai-act-${Date.now()}`;

      const baseY = Math.round(-pan.y / zoom + (Math.random() * 60 - 30));

      const newNodes: WorkflowNode[] = [
        {
          id: triggerNodeId,
          workflowId: newWfId,
          type: 'trigger',
          appId: sourceAppId,
          title: `${sourceAppId.toUpperCase()} Inbound Trigger`,
          actionOrTrigger: 'New event detected',
          x: -380,
          y: baseY,
          status: 'active',
          config: { prompt: text },
          isConnectedToCore: true,
        },
        {
          id: aiNodeId,
          workflowId: newWfId,
          type: 'ai-processor',
          appId: 'ai-models',
          title: 'Harpy 120B AI Brain',
          actionOrTrigger: 'Process & Extract Insights',
          x: -60,
          y: baseY,
          status: 'active',
          config: { prompt: text },
          isConnectedToCore: true,
        },
        {
          id: actionNodeId,
          workflowId: newWfId,
          type: 'action',
          appId: destAppId,
          title: `${destAppId.toUpperCase()} Dispatcher`,
          actionOrTrigger: 'Execute payload action',
          x: 260,
          y: baseY,
          status: 'active',
          config: {},
          isConnectedToCore: true,
        },
      ];

      const newConns: WorkflowConnection[] = [
        { id: `c-${Date.now()}-1`, workflowId: newWfId, fromNodeId: triggerNodeId, fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
        { id: `c-${Date.now()}-2`, workflowId: newWfId, fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: aiNodeId, toPort: 'input', isActive: true },
        { id: `c-${Date.now()}-3`, workflowId: newWfId, fromNodeId: aiNodeId, fromPort: 'output', toNodeId: actionNodeId, toPort: 'input', isActive: true },
      ];

      setWorkflows((prev) => [newWorkflow, ...prev]);
      setNodes((prev) => [...prev, ...newNodes]);
      setConnections((prev) => [...prev, ...newConns]);
      setActiveWorkflowId(newWfId);

      setIsGeneratingAi(false);
      setAiPrompt('');
      setAiSuccessToast(`Workflow "${title}" generated & connected to Harpy Core!`);
      setTimeout(() => setAiSuccessToast(null), 5000);
    }, 1200);
  };

  // ──────────────────────────────────────────────────────────
  // Workflow Execution Simulator
  // ──────────────────────────────────────────────────────────
  const handleExecuteAllActive = () => {
    setIsExecutingGlobal(true);

    const activeWfs = workflows.filter((w) => w.isConnectedToCore);
    const traceSteps = [
      {
        id: 'step-1',
        nodeId: 'node-gmail-1',
        nodeTitle: 'Gmail Inbound Monitor',
        appId: 'gmail',
        status: 'success' as const,
        message: 'Polled INBOX. Captured unread email "Q4 Product Strategy Review" from client.',
        durationMs: 78,
        outputPayload: {
          from: 'alex.chen@acmecorp.com',
          subject: 'Q4 Product Strategy Review & Roadmap',
          timestamp: '14:24:00',
        },
      },
      {
        id: 'step-2',
        nodeId: 'harpy-core',
        nodeTitle: 'Harpy AI Core Orchestrator',
        appId: 'ai-models',
        status: 'success' as const,
        message: 'Kernel 120B parsed email: Extracted 3 action items and formatted structured markdown.',
        durationMs: 240,
        outputPayload: {
          summary: 'Client approves UI mockups. Requests Next.js 15 SSR and dark theme verification.',
          actionItems: ['Prepare deployment bundle', 'Configure OAuth credentials', 'Dispatch Notion card'],
        },
      },
      {
        id: 'step-3',
        nodeId: 'node-notion-1',
        nodeTitle: 'Notion Database Dispatcher',
        appId: 'notion',
        status: 'success' as const,
        message: 'Dispatched to Notion: Created page ID #notion-9821 in "Harpy Action Tasks" board.',
        durationMs: 110,
        outputPayload: {
          pageId: 'page_9821a4f',
          status: 'Inserted',
          url: 'https://notion.so/workspace/harpy-tasks#9821',
        },
      },
    ];

    setTimeout(() => {
      setIsExecutingGlobal(false);
      setActiveTrace({
        workflowId: activeWfs[0]?.id || 'wf-1',
        workflowName: activeWfs[0]?.name || 'Gmail → Notion Sync',
        status: 'success',
        startedAt: new Date().toLocaleTimeString(),
        durationMs: 428,
        steps: traceSteps,
      });
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050508] text-[#E8DDC7] flex flex-col select-none overflow-hidden font-inter">
      {/* ──────────────────────────────────────────────────────────
          1. TOP NAVIGATION & TOOLBAR (FIGMA INSPIRED)
         ────────────────────────────────────────────────────────── */}
      <header className="h-14 px-4 bg-[#0A0A10]/95 backdrop-blur-xl border-b border-[#1A1A26] flex items-center justify-between z-30 shrink-0">
        {/* Left: Branding & Workflow Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-[#1E1E2C]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C6A46A] to-amber-200 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(198,164,106,0.3)]">
              <Image
                src="/images/harpy-logo-light.png"
                alt="Harpy AI"
                width={22}
                height={22}
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Layers className="w-4 h-4 text-[#050508]" />
            </div>
            <div>
              <span className="font-cinzel text-xs font-bold text-[#E8DDC7] tracking-wider uppercase block">
                Harpy Connectors
              </span>
              <span className="text-[9px] font-mono text-[#8C7A6B] block">
                Figma-Style Automation Canvas
              </span>
            </div>
          </div>

          {/* Workflow Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#050508] p-1 rounded-xl border border-[#161622]">
            <button
              onClick={() => setActiveWorkflowId('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-cinzel transition-all ${
                activeWorkflowId === 'all'
                  ? 'bg-[#C6A46A]/20 text-[#C6A46A] border border-[#C6A46A]/40 font-semibold'
                  : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
              }`}
            >
              All Workflows ({workflows.length})
            </button>
            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setActiveWorkflowId(wf.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  activeWorkflowId === wf.id
                    ? 'bg-[#181824] text-[#E8DDC7] border border-[#2A2A3E]'
                    : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: wf.isConnectedToCore ? '#10B981' : '#F59E0B' }}
                />
                <span className="truncate max-w-[140px]">{wf.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Figma Canvas Tool Controls */}
        <div className="hidden md:flex items-center gap-1 bg-[#050508] p-1 rounded-xl border border-[#161622]">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              activeTool === 'select' ? 'bg-[#C6A46A] text-[#050508]' : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
            }`}
            title="Select & Move Nodes (V)"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool('hand')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              activeTool === 'hand' ? 'bg-[#C6A46A] text-[#050508]' : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
            }`}
            title="Hand Tool / Canvas Pan (H or Spacebar)"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#1A1A26] mx-1" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#E8DDC7] transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-[#8C7A6B] px-1 min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#E8DDC7] transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 260, y: 120 });
            }}
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#C6A46A] transition-colors"
            title="Reset Canvas View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Run Active Workflows & Close Workspace */}
        <div className="flex items-center gap-2.5">
          {/* Global Execution Button */}
          <button
            type="button"
            onClick={handleExecuteAllActive}
            disabled={isExecutingGlobal}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C6A46A] to-amber-200 text-[#050508] text-xs font-cinzel font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(198,164,106,0.35)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isExecutingGlobal ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin" /> Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-[#050508]" /> Run Active Workflows
              </>
            )}
          </button>

          {/* Close Canvas */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#12121C] border border-[#222232] text-[#8C7A6B] hover:text-[#E8DDC7] hover:border-[#C6A46A]/40 transition-colors"
            title="Close Canvas (Exit to Chat)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. MAIN BODY (LEFT APP LIBRARY + FIGMA CANVAS + INSPECTOR)
         ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative">
        {/* ──────────────────────────────────────────────────────────
            LEFT SIDEBAR: APPLICATIONS LIBRARY
           ────────────────────────────────────────────────────────── */}
        <aside className="w-72 bg-[#08080D]/95 backdrop-blur-xl border-r border-[#181824] flex flex-col z-20 shrink-0">
          {/* Search App */}
          <div className="p-3 border-b border-[#14141E]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps (Gmail, Slack, GitHub)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0E0E16] border border-[#1E1E2C] text-xs font-mono text-[#E8DDC7] placeholder-[#8C7A6B]/50 focus:outline-none focus:border-[#C6A46A]/60"
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
                      ? 'bg-[#C6A46A]/20 text-[#C6A46A] border border-[#C6A46A]/40 font-semibold'
                      : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:thin]">
            <p className="text-[10px] font-mono text-[#8C7A6B] px-1 uppercase tracking-wider">
              Click or drag into canvas ({filteredApps.length})
            </p>

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
                  className="p-2.5 rounded-xl bg-[#0B0B12] border border-[#161622] hover:border-[#C6A46A]/40 transition-all group flex flex-col gap-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                        style={{ backgroundColor: `${app.color}18`, color: app.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-[#E8DDC7] block truncate">
                          {app.name}
                        </span>
                        <span className="text-[10px] text-[#8C7A6B] font-mono block truncate">
                          {app.category}
                        </span>
                      </div>
                    </div>

                    {/* Quick Add Button */}
                    <button
                      type="button"
                      onClick={() => handleAddNodeFromApp(app)}
                      className="p-1 rounded-lg bg-[#141420] text-[#8C7A6B] hover:text-[#C6A46A] hover:bg-[#1E1E2E] transition-colors"
                      title="Add Node to Canvas"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-[#8C7A6B] line-clamp-1 leading-relaxed">
                    {app.description}
                  </p>

                  {/* Connection / Auth Status & Action */}
                  <div className="pt-1.5 border-t border-[#14141E] flex items-center justify-between">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setAuthenticatingApp(app);
                      }}
                      className="text-[10px] font-mono text-[#C6A46A] hover:underline"
                    >
                      {app.isConnected ? 'Configure' : 'Connect Account'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Workflow Status Summary Footer */}
          <div className="p-3 bg-[#0B0B12] border-t border-[#181824] space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#8C7A6B]">Harpy Core Status</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE (120B)
              </span>
            </div>
            <p className="text-[10px] text-[#8C7A6B] leading-relaxed">
              Automations must connect to Central Core to be eligible for execution.
            </p>
          </div>
        </aside>

        {/* ──────────────────────────────────────────────────────────
            FIGMA-INSPIRED INFINITE CANVAS
           ────────────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          className="flex-1 h-full relative overflow-hidden cursor-crosshair bg-[#06060A]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(198, 164, 106, 0.12) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Top Floating AI Automation Bar */}
          <div className="absolute top-4 inset-x-0 z-30 pointer-events-none flex justify-center px-4">
            <div className="pointer-events-auto w-full max-w-xl p-1.5 bg-[#0B0B14]/90 backdrop-blur-2xl border border-[#C6A46A]/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(198,164,106,0.2)] flex items-center gap-2">
              <div className="pl-2">
                <Sparkles className="w-4 h-4 text-[#C6A46A] animate-pulse" />
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateWorkflowFromAi();
                }}
                placeholder="Describe automation (e.g. 'Summarize new Gmail emails and sync to Notion')..."
                className="flex-1 bg-transparent text-xs text-[#E8DDC7] placeholder-[#8C7A6B] font-inter focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleGenerateWorkflowFromAi()}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className={`px-3.5 py-1.5 rounded-xl font-cinzel text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  aiPrompt.trim()
                    ? 'bg-[#C6A46A] text-[#050508] hover:bg-[#E2C99A] cursor-pointer'
                    : 'bg-[#181824] text-[#8C7A6B] cursor-not-allowed'
                }`}
              >
                {isGeneratingAi ? (
                  <>
                    <Activity className="w-3.5 h-3.5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    Build <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Success Toast */}
          <AnimatePresence>
            {aiSuccessToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-16 inset-x-0 z-40 pointer-events-none flex justify-center px-4"
              >
                <div className="px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono shadow-2xl flex items-center gap-2">
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
                  <stop offset="0%" stopColor="#C6A46A" />
                  <stop offset="50%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#C6A46A" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Render Existing Connections */}
              {visibleConnections.map((conn) => {
                // Resolve from and to coordinates
                let fromX = 0;
                let fromY = 0;
                let toX = 0;
                let toY = 0;

                if (conn.fromNodeId === 'harpy-core') {
                  fromX = 0;
                  fromY = 0;
                } else {
                  const srcNode = nodes.find((n) => n.id === conn.fromNodeId);
                  if (srcNode) {
                    fromX = srcNode.x + 105; // Right edge output
                    fromY = srcNode.y + 45;
                  }
                }

                if (conn.toNodeId === 'harpy-core') {
                  toX = 0;
                  toY = 0;
                } else {
                  const targetNode = nodes.find((n) => n.id === conn.toNodeId);
                  if (targetNode) {
                    toX = targetNode.x - 105; // Left edge input
                    toY = targetNode.y + 45;
                  }
                }

                // Cubic Bezier curve
                const dx = Math.abs(toX - fromX) * 0.5;
                const pathD = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer group">
                    {/* Background wide transparent hit area */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onClick={() => {
                        // Click connection to delete
                        setConnections((prev) => prev.filter((c) => c.id !== conn.id));
                      }}
                    />

                    {/* Outer Glowing Wire */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={conn.isActive ? '#C6A46A' : '#333344'}
                      strokeWidth={conn.isActive ? 3 : 2}
                      strokeOpacity={conn.isActive ? 0.7 : 0.4}
                      filter={conn.isActive ? 'url(#glow)' : undefined}
                    />

                    {/* Inner Animated Pulse Line */}
                    {conn.isActive && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="url(#activeGrad)"
                        strokeWidth={2}
                        strokeDasharray="6 8"
                        className="animate-flow-dash"
                        style={{
                          animation: 'flowDash 1.2s linear infinite',
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Connecting Wire in Progress (when dragging wire from port) */}
              {connectingSource && (
                <path
                  d={`M ${
                    connectingSource.nodeId === 'harpy-core'
                      ? 0
                      : (nodes.find((n) => n.id === connectingSource.nodeId)?.x || 0) + 105
                  } ${
                    connectingSource.nodeId === 'harpy-core'
                      ? 0
                      : (nodes.find((n) => n.id === connectingSource.nodeId)?.y || 0) + 45
                  } L ${mousePos.x} ${mousePos.y}`}
                  fill="none"
                  stroke="#C6A46A"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </svg>

            {/* ──────────────────────────────────────────────────────────
                CENTRAL HARPY AI SYSTEM NODE (HERO ORCHESTRATOR)
               ────────────────────────────────────────────────────────── */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: 0,
                top: 0,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Outer Glowing Aura Rings */}
              <div className="absolute inset-0 -m-12 rounded-full bg-gradient-to-tr from-[#C6A46A]/20 via-amber-500/10 to-emerald-500/15 blur-2xl animate-pulse pointer-events-none" />
              <div className="absolute inset-0 -m-8 rounded-full border border-[#C6A46A]/30 animate-spin [animation-duration:25s] pointer-events-none" />
              <div className="absolute inset-0 -m-4 rounded-full border border-dashed border-[#C6A46A]/40 animate-spin [animation-duration:15s] [animation-direction:reverse] pointer-events-none" />

              {/* Central Core Card */}
              <div
                onClick={() => setSelectedNodeId('harpy-core')}
                className={`relative w-44 h-44 rounded-3xl bg-gradient-to-b from-[#12121C] via-[#0D0D16] to-[#07070B] border-2 transition-all p-3 flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(198,164,106,0.3)] cursor-pointer group ${
                  selectedNodeId === 'harpy-core'
                    ? 'border-[#C6A46A] shadow-[0_0_60px_rgba(198,164,106,0.5)]'
                    : 'border-[#C6A46A]/60 hover:border-[#C6A46A]'
                }`}
              >
                {/* 4 Connection Ports (N, S, E, W) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                  }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_10px_#C6A46A] hover:scale-125 transition-transform"
                  title="Drag connection from Harpy Core"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                  }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_10px_#C6A46A] hover:scale-125 transition-transform"
                  title="Drag connection from Harpy Core"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                  }}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_10px_#C6A46A] hover:scale-125 transition-transform"
                  title="Drag connection from Harpy Core"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                  }}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_10px_#C6A46A] hover:scale-125 transition-transform"
                  title="Drag connection from Harpy Core"
                />

                {/* Core Icon & Status */}
                <div className="w-12 h-12 rounded-2xl bg-[#08080E] border border-[#C6A46A]/50 flex items-center justify-center shadow-inner mb-2 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6 text-[#C6A46A] animate-pulse" />
                </div>

                <h4 className="font-cinzel text-xs font-bold text-[#E8DDC7] uppercase tracking-wider leading-tight">
                  Harpy AI System
                </h4>
                <p className="text-[9px] font-mono text-[#C6A46A] mt-0.5">Autonomous Core</p>

                {/* Core Live Stats */}
                <div className="mt-2 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {workflows.filter((w) => w.isConnectedToCore).length} Active Workflows
                  </span>
                </div>
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────────
                RENDER ALL WORKFLOW NODES ON CANVAS
               ────────────────────────────────────────────────────────── */}
            {visibleNodes.map((node) => {
              const app = apps.find((a) => a.id === node.appId);
              const Icon = app ? APP_ICONS[app.iconName] || APP_ICONS.Globe : APP_ICONS.Sparkles;
              const isSelected = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                    setDraggingNodeId(node.id);

                    const canvasRect = canvasRef.current?.getBoundingClientRect();
                    if (canvasRect) {
                      const mouseCanvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
                      const mouseCanvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
                      setDragOffset({
                        x: mouseCanvasX - node.x,
                        y: mouseCanvasY - node.y,
                      });
                    }
                  }}
                  className={`absolute pointer-events-auto w-[210px] rounded-2xl bg-[#09090F]/95 backdrop-blur-xl border transition-all shadow-xl cursor-move ${
                    isSelected
                      ? 'border-[#C6A46A] shadow-[0_0_30px_rgba(198,164,106,0.35)] ring-1 ring-[#C6A46A]'
                      : 'border-[#1C1C2A] hover:border-[#C6A46A]/50'
                  }`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Left Input Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectingSource) {
                        // Complete connection
                        setConnections((prev) => [
                          ...prev,
                          {
                            id: `conn-${connectingSource.nodeId}-${node.id}-${Date.now()}`,
                            workflowId: node.workflowId,
                            fromNodeId: connectingSource.nodeId,
                            fromPort: 'output',
                            toNodeId: node.id,
                            toPort: 'input',
                            isActive: true,
                          },
                        ]);
                        setConnectingSource(null);
                      }
                    }}
                    className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#12121C] border-2 border-[#C6A46A] hover:scale-125 transition-transform flex items-center justify-center cursor-pointer"
                    title="Connect to Input"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A46A]" />
                  </div>

                  {/* Right Output Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingSource({ nodeId: node.id, port: 'output' });
                    }}
                    className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#12121C] border-2 border-[#34D399] hover:scale-125 transition-transform flex items-center justify-center cursor-pointer"
                    title="Drag connection to next node"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  </div>

                  {/* Node Header */}
                  <div className="p-2.5 border-b border-[#141420] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                        style={{ backgroundColor: `${app?.color || '#C6A46A'}20`, color: app?.color || '#C6A46A' }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-[#E8DDC7] truncate">
                        {app?.name || 'Node'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          node.isConnectedToCore ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                        title={node.isConnectedToCore ? 'Active (Linked to Harpy Core)' : 'Paused (Disconnected)'}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className="p-1 text-[#8C7A6B] hover:text-rose-400 transition-colors"
                        title="Delete node"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Node Body Details */}
                  <div className="p-2.5 space-y-1.5">
                    <p className="text-[10px] font-mono text-[#C6A46A] truncate uppercase font-semibold">
                      {node.type === 'trigger' ? '⚡ Trigger' : node.type === 'ai-processor' ? '🧠 AI Kernel' : '🎯 Action'}
                    </p>
                    <p className="text-xs text-[#E8DDC7]/90 font-mono line-clamp-2 leading-snug">
                      {node.actionOrTrigger}
                    </p>

                    {/* Quick Core Connection Toggle Button */}
                    <div className="pt-2 border-t border-[#141420] flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#8C7A6B]">
                        {node.isConnectedToCore ? 'Connected to Core' : 'Standalone'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkflowCoreConnection(node.workflowId);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                          node.isConnectedToCore
                            ? 'text-rose-400 bg-rose-950/30 border border-rose-500/30 hover:bg-rose-950/50'
                            : 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-950/50'
                        }`}
                      >
                        {node.isConnectedToCore ? 'Disconnect' : 'Connect Core'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ──────────────────────────────────────────────────────────
              BOTTOM CANVAS CONTROLS (FIGMA MINIMAP & ZOOM)
             ────────────────────────────────────────────────────────── */}
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 select-none">
            {/* Quick Template Pills */}
            <div className="hidden lg:flex items-center gap-1.5 bg-[#09090F]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1A1A28] text-xs font-mono text-[#8C7A6B]">
              <span>Quick:</span>
              <button
                onClick={() =>
                  handleGenerateWorkflowFromAi('Summarize Gmail emails and create tasks in Notion')
                }
                className="hover:text-[#C6A46A] underline"
              >
                Gmail→Notion
              </button>
              <span>·</span>
              <button
                onClick={() =>
                  handleGenerateWorkflowFromAi('Triage GitHub PRs and send summary to Slack')
                }
                className="hover:text-[#C6A46A] underline"
              >
                GitHub→Slack
              </button>
            </div>

            {/* Canvas Reset View */}
            <button
              type="button"
              onClick={() => {
                setPan({ x: 260, y: 120 });
                setZoom(0.9);
              }}
              className="p-2 rounded-xl bg-[#0B0B14]/90 backdrop-blur-md border border-[#1E1E2C] text-[#8C7A6B] hover:text-[#C6A46A] transition-colors"
              title="Focus Central Harpy Core"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            RIGHT SIDEBAR: NODE INSPECTOR DRAWER
           ────────────────────────────────────────────────────────── */}
        <NodeInspectorModal
          node={nodes.find((n) => n.id === selectedNodeId) || null}
          app={
            selectedNodeId
              ? apps.find((a) => a.id === nodes.find((n) => n.id === selectedNodeId)?.appId) || null
              : null
          }
          isOpen={selectedNodeId !== null && selectedNodeId !== 'harpy-core'}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onRunSingleNode={(nodeId) => {
            const target = nodes.find((n) => n.id === nodeId);
            if (target) {
              setActiveTrace({
                workflowId: target.workflowId,
                workflowName: target.title,
                status: 'success',
                startedAt: new Date().toLocaleTimeString(),
                durationMs: 142,
                steps: [
                  {
                    id: 's-1',
                    nodeId: target.id,
                    nodeTitle: target.title,
                    appId: target.appId,
                    status: 'success',
                    message: `Verified parameters and executed test payload for ${target.actionOrTrigger}.`,
                    durationMs: 142,
                    outputPayload: { status: 'OK', config: target.config },
                  },
                ],
              });
            }
          }}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────
          MODALS & OVERLAYS: OAUTH & EXECUTION TRACES
         ────────────────────────────────────────────────────────── */}
      <OAuthModal
        app={authenticatingApp}
        isOpen={authenticatingApp !== null}
        onClose={() => setAuthenticatingApp(null)}
        onToggleConnect={(appId, isConnected, accountEmail) => {
          setApps((prev) =>
            prev.map((a) => (a.id === appId ? { ...a, isConnected, accountEmail } : a))
          );
        }}
      />

      <ExecutionLogsModal
        trace={activeTrace}
        isOpen={activeTrace !== null}
        onClose={() => setActiveTrace(null)}
        onReRun={handleExecuteAllActive}
      />
    </div>
  );
}
