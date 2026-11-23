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
  // Canvas State: Pan & Zoom (Centered dynamically)
  // ──────────────────────────────────────────────────────────
  const [pan, setPan] = useState({ x: 500, y: 350 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
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
  // Symmetrically spaced with Harpy Core at (0, 0)
  // Left side (x = -400): Triggers
  // Right side (x = +400): Actions
  // ──────────────────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'wf-1',
      name: 'Gmail → Notion',
      description: 'Summarize incoming client emails with Harpy AI and update Notion board',
      isConnectedToCore: true,
      status: 'active',
      color: '#EA4335',
      createdAt: '2026-11-23',
      lastRun: '10 mins ago',
    },
    {
      id: 'wf-2',
      name: 'GitHub → Slack',
      description: 'Review new GitHub issues, auto-draft code fixes, and broadcast to Slack',
      isConnectedToCore: true,
      status: 'active',
      color: '#5865F2',
      createdAt: '2026-11-23',
      lastRun: '1 hour ago',
    },
    {
      id: 'wf-3',
      name: 'Chrome → WhatsApp',
      description: 'Extract web page updates and notify team over WhatsApp',
      isConnectedToCore: false, // Disconnected from Core = Paused
      status: 'paused',
      color: '#25D366',
      createdAt: '2026-11-23',
    },
  ]);

  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('all');

  // Initial Nodes on Canvas: Generously spaced, no overlap
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    // Workflow 1: Gmail -> Harpy Core -> Notion
    {
      id: 'node-gmail-1',
      workflowId: 'wf-1',
      type: 'trigger',
      appId: 'gmail',
      title: 'Gmail Inbound Monitor',
      actionOrTrigger: 'New client email received',
      x: -400,
      y: -140,
      status: 'active',
      config: { filter: 'is:unread label:clients', interval: 'Real-time (Push)' },
      isConnectedToCore: true,
    },
    {
      id: 'node-notion-1',
      workflowId: 'wf-1',
      type: 'action',
      appId: 'notion',
      title: 'Notion Database Dispatcher',
      actionOrTrigger: 'Create tasks page & summary',
      x: 400,
      y: -140,
      status: 'active',
      config: { database: 'Harpy AI Action Tasks' },
      isConnectedToCore: true,
    },

    // Workflow 2: GitHub -> Harpy Core -> Slack
    {
      id: 'node-gh-1',
      workflowId: 'wf-2',
      type: 'trigger',
      appId: 'github',
      title: 'GitHub Issues Watcher',
      actionOrTrigger: 'New Issue or PR opened',
      x: -400,
      y: 140,
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
      actionOrTrigger: 'Send channel alert message',
      x: 400,
      y: 140,
      status: 'active',
      config: { channel: '#harpy-announcements' },
      isConnectedToCore: true,
    },

    // Workflow 3: Chrome -> WhatsApp (Paused - Disconnected from Core)
    {
      id: 'node-chrome-1',
      workflowId: 'wf-3',
      type: 'trigger',
      appId: 'chrome-agent',
      title: 'Chrome Web Scraper',
      actionOrTrigger: 'Live URL monitor triggered',
      x: -400,
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
      actionOrTrigger: 'Send direct alert message',
      x: 400,
      y: 380,
      status: 'paused',
      config: { recipient: '+91 98765 43210' },
      isConnectedToCore: false,
    },
  ]);

  // Connections (Edges)
  // Active workflows wire through Harpy Core (Node id: 'harpy-core')
  const [connections, setConnections] = useState<WorkflowConnection[]>([
    // Workflow 1 (Active)
    { id: 'conn-wf1-in', workflowId: 'wf-1', fromNodeId: 'node-gmail-1', fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
    { id: 'conn-wf1-out', workflowId: 'wf-1', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-notion-1', toPort: 'input', isActive: true },

    // Workflow 2 (Active)
    { id: 'conn-wf2-in', workflowId: 'wf-2', fromNodeId: 'node-gh-1', fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
    { id: 'conn-wf2-out', workflowId: 'wf-2', fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: 'node-slack-1', toPort: 'input', isActive: true },

    // Workflow 3 (Paused - Direct link without Harpy Core)
    { id: 'conn-wf3-direct', workflowId: 'wf-3', fromNodeId: 'node-chrome-1', fromPort: 'output', toNodeId: 'node-wa-1', toPort: 'input', isActive: false },
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
        y: Math.round(rect.height / 2 - 20),
      });
      setZoom(0.85);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        centerCanvas();
      }, 60);
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

  // Visible Nodes based on Workflow Filter
  const visibleNodes = useMemo(() => {
    if (activeWorkflowId === 'all') return nodes;
    return nodes.filter((n) => n.workflowId === activeWorkflowId);
  }, [nodes, activeWorkflowId]);

  // Visible Connections based on Workflow Filter
  const visibleConnections = useMemo(() => {
    if (activeWorkflowId === 'all') return connections;
    return connections.filter((c) => c.workflowId === activeWorkflowId);
  }, [connections, activeWorkflowId]);

  // Core Connection Check: Does workflow have any edge to/from 'harpy-core'?
  const isWorkflowConnectedToCore = useCallback(
    (wfId: string) => {
      return connections.some(
        (c) =>
          c.workflowId === wfId &&
          (c.fromNodeId === 'harpy-core' || c.toNodeId === 'harpy-core')
      );
    },
    [connections]
  );

  // Sync Workflow Active / Paused status based on Core Connection Rule
  useEffect(() => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        const isConnected = isWorkflowConnectedToCore(wf.id);
        const status = isConnected ? 'active' : 'paused';
        return {
          ...wf,
          isConnectedToCore: isConnected,
          status,
        };
      })
    );

    setNodes((prev) =>
      prev.map((n) => {
        const isConnected = isWorkflowConnectedToCore(n.workflowId);
        return {
          ...n,
          isConnectedToCore: isConnected,
          status: isConnected ? 'active' : 'paused',
        };
      })
    );

    setConnections((prev) =>
      prev.map((c) => {
        const isConnected = isWorkflowConnectedToCore(c.workflowId);
        return {
          ...c,
          isActive: isConnected,
        };
      })
    );
  }, [connections, isWorkflowConnectedToCore]);

  // ──────────────────────────────────────────────────────────
  // Canvas Mouse & Gesture Handlers (Pan & Zoom)
  // ──────────────────────────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicking on a node or button, let that handler take over
    if (
      (e.target as HTMLElement).closest('.pointer-events-auto') &&
      e.target !== canvasRef.current &&
      (e.target as HTMLElement).tagName !== 'svg'
    ) {
      return;
    }

    setSelectedNodeId(null);

    // Left click on background, or middle click, or alt click => Pan canvas smoothly
    if (e.button === 0 || e.button === 1 || e.buttons === 4 || e.altKey || activeTool === 'hand') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
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

    // Dragging connection wire preview
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

    // If dropPos provided use it; otherwise place near viewport center with jitter
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const viewCenterX = canvasRect ? (canvasRect.width / 2 - pan.x) / zoom : 0;
    const viewCenterY = canvasRect ? (canvasRect.height / 2 - pan.y) / zoom : 0;

    const posX = dropPos ? dropPos.x : Math.round(viewCenterX + (Math.random() * 80 - 40));
    const posY = dropPos ? dropPos.y : Math.round(viewCenterY + (Math.random() * 80 - 40));

    const isTrigger = app.category === 'triggers' || app.id === 'gmail' || app.id === 'github';
    const newNode: WorkflowNode = {
      id: newId,
      workflowId: targetWf,
      type: isTrigger ? 'trigger' : app.category === 'ai' ? 'ai-processor' : 'action',
      appId: app.id,
      title: `${app.name} Node`,
      actionOrTrigger: app.triggers[0] || app.actions[0] || 'Execute action',
      x: posX,
      y: posY,
      status: 'active',
      config: {},
      isConnectedToCore: true,
    };

    setNodes((prev) => [...prev, newNode]);

    // Automatically connect new node to central core for instant readiness
    setConnections((prev) => [
      ...prev,
      {
        id: `conn-${newId}-core-${Date.now()}`,
        workflowId: targetWf,
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
      // Connect first trigger node of workflow to Harpy Core
      const wfNodes = nodes.filter((n) => n.workflowId === wfId);
      const trig = wfNodes.find((n) => n.type === 'trigger') || wfNodes[0];
      const act = wfNodes.find((n) => n.type === 'action') || wfNodes[wfNodes.length - 1];

      const newConns: WorkflowConnection[] = [];
      if (trig) {
        newConns.push({
          id: `conn-${wfId}-core-in-${Date.now()}`,
          workflowId: wfId,
          fromNodeId: trig.id,
          fromPort: 'output',
          toNodeId: 'harpy-core',
          toPort: 'input',
          isActive: true,
        });
      }
      if (act && act.id !== trig?.id) {
        newConns.push({
          id: `conn-${wfId}-core-out-${Date.now()}`,
          workflowId: wfId,
          fromNodeId: 'harpy-core',
          fromPort: 'output',
          toNodeId: act.id,
          toPort: 'input',
          isActive: true,
        });
      }

      setConnections((prev) => [...prev, ...newConns]);
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
      else if (lower.includes('github') || lower.includes('pr') || lower.includes('issue')) sourceAppId = 'github';
      else if (lower.includes('meet') || lower.includes('calendar')) sourceAppId = 'google-meet';
      else if (lower.includes('chrome') || lower.includes('web') || lower.includes('scrape')) sourceAppId = 'chrome-agent';

      if (lower.includes('notion')) destAppId = 'notion';
      else if (lower.includes('slack')) destAppId = 'slack';
      else if (lower.includes('whatsapp')) destAppId = 'whatsapp';
      else if (lower.includes('discord')) destAppId = 'discord';

      if (sourceAppId === 'gmail' && destAppId === 'notion') title = 'Gmail → Notion Sync';
      else if (sourceAppId === 'github' && destAppId === 'slack') title = 'GitHub → Slack Alert';
      else title = `${sourceAppId.toUpperCase()} → ${destAppId.toUpperCase()}`;

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

      // Place newly generated nodes symmetrically around Harpy Core
      const existingYs = nodes.map((n) => n.y);
      const baseY = existingYs.length > 0 ? Math.max(...existingYs) + 220 : 0;

      const triggerNodeId = `node-ai-trig-${Date.now()}`;
      const actionNodeId = `node-ai-act-${Date.now()}`;

      const newNodes: WorkflowNode[] = [
        {
          id: triggerNodeId,
          workflowId: newWfId,
          type: 'trigger',
          appId: sourceAppId,
          title: `${sourceAppId.toUpperCase()} Monitor`,
          actionOrTrigger: 'Inbound event detected',
          x: -400,
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
          actionOrTrigger: 'Execute automated payload',
          x: 400,
          y: baseY,
          status: 'active',
          config: {},
          isConnectedToCore: true,
        },
      ];

      const newConns: WorkflowConnection[] = [
        { id: `c-${Date.now()}-1`, workflowId: newWfId, fromNodeId: triggerNodeId, fromPort: 'output', toNodeId: 'harpy-core', toPort: 'input', isActive: true },
        { id: `c-${Date.now()}-2`, workflowId: newWfId, fromNodeId: 'harpy-core', fromPort: 'output', toNodeId: actionNodeId, toPort: 'input', isActive: true },
      ];

      setWorkflows((prev) => [newWorkflow, ...prev]);
      setNodes((prev) => [...prev, ...newNodes]);
      setConnections((prev) => [...prev, ...newConns]);
      setActiveWorkflowId(newWfId);

      setIsGeneratingAi(false);
      setAiPrompt('');
      setAiSuccessToast(`Generated & Linked: ${title} connected to Harpy Core!`);

      setTimeout(() => setAiSuccessToast(null), 4000);
    }, 900);
  };

  // ──────────────────────────────────────────────────────────
  // Execution Simulator (Live traces)
  // ──────────────────────────────────────────────────────────
  const handleExecuteAllActive = () => {
    const activeWfs = workflows.filter((w) => w.isConnectedToCore);
    if (activeWfs.length === 0) {
      alert('No active workflows connected to Harpy Core. Connect a workflow to execute.');
      return;
    }

    setIsExecutingGlobal(true);
    const primaryWf = activeWfs[0];

    const trace: ExecutionTrace = {
      workflowId: primaryWf.id,
      workflowName: primaryWf.name,
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

  // Node Inspector Selection
  const selectedNodeObject = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedApp = selectedNodeObject ? apps.find((a) => a.id === selectedNodeObject.appId) || null : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050508] text-[#E8DDC7] font-inter select-none overflow-hidden animate-in fade-in duration-200">
      {/* ──────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (FIGMA-STYLE HEADER)
         ────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-[#1A1A28] bg-[#07070C]/95 backdrop-blur-xl px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Branding & Workflow Filter Tabs */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 pr-3 border-r border-[#1E1E2C] shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C6A46A] to-amber-200 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(198,164,106,0.3)]">
              <Layers className="w-4 h-4 text-[#050508]" />
            </div>
            <div>
              <span className="font-cinzel text-xs font-bold text-[#E8DDC7] tracking-wider uppercase block leading-tight">
                Harpy Connectors
              </span>
              <span className="text-[9px] font-mono text-[#8C7A6B] block leading-tight">
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
                ? 'bg-[#181824] border-[#2A2A3E] text-[#C6A46A]'
                : 'bg-[#0B0B12] border-[#1C1C28] text-[#8C7A6B] hover:text-[#E8DDC7]'
            }`}
            title={isSidebarOpen ? 'Collapse Apps Sidebar' : 'Expand Apps Sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          {/* Workflow Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => setActiveWorkflowId('all')}
              className={`px-3 py-1 rounded-lg text-xs font-cinzel transition-all shrink-0 ${
                activeWorkflowId === 'all'
                  ? 'bg-[#C6A46A]/20 text-[#C6A46A] border border-[#C6A46A]/40 font-semibold shadow-sm'
                  : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
              }`}
            >
              All Workflows ({workflows.length})
            </button>
            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setActiveWorkflowId(wf.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                  activeWorkflowId === wf.id
                    ? 'bg-[#181826] text-[#E8DDC7] border border-[#2E2E42]'
                    : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: wf.isConnectedToCore ? '#10B981' : '#F59E0B' }}
                />
                <span className="truncate max-w-[120px]">{wf.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Canvas View & Tool Controls */}
        <div className="hidden md:flex items-center gap-1 bg-[#090912] p-1 rounded-xl border border-[#1A1A28] shrink-0">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              activeTool === 'select' ? 'bg-[#C6A46A] text-[#050508]' : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
            }`}
            title="Select & Move (V)"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool('hand')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              activeTool === 'hand' ? 'bg-[#C6A46A] text-[#050508]' : 'text-[#8C7A6B] hover:text-[#E8DDC7]'
            }`}
            title="Hand Pan Tool (H)"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#1A1A28] mx-1" />

          {/* Zoom Controls */}
          <button
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#E8DDC7] transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-[#8C7A6B] px-1 min-w-[38px] text-center">
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
            onClick={centerCanvas}
            className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#C6A46A] transition-colors"
            title="Center Canvas View (Fit)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Live Status, Execution Logs, Run Button & Close */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Status Indicator */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0C0C14] border border-[#1C1C28] text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {workflows.filter((w) => w.isConnectedToCore).length} Active
            </span>
            <span className="text-[#8C7A6B]">•</span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {workflows.filter((w) => !w.isConnectedToCore).length} Paused
            </span>
          </div>

          {/* Audit Logs Drawer Button */}
          <button
            type="button"
            onClick={() => setIsLogsModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#12121C] border border-[#222232] text-xs font-mono text-[#8C7A6B] hover:text-[#E8DDC7] hover:border-[#C6A46A]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="View Execution Audit Logs"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </button>

          {/* Run Active Workflows Button */}
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
                <Play className="w-3.5 h-3.5 fill-[#050508]" /> Run Workflows
              </>
            )}
          </button>

          {/* Close Canvas */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#12121C] border border-[#222232] text-[#8C7A6B] hover:text-[#E8DDC7] hover:border-[#C6A46A]/40 transition-colors"
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
              className="bg-[#08080E]/95 backdrop-blur-xl border-r border-[#181826] flex flex-col z-20 shrink-0 overflow-hidden"
            >
              {/* Search App */}
              <div className="p-3 border-b border-[#141420]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search apps (Gmail, Slack)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0E0E18] border border-[#1E1E2C] text-xs font-mono text-[#E8DDC7] placeholder-[#8C7A6B]/50 focus:outline-none focus:border-[#C6A46A]/60"
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
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono text-[#8C7A6B] uppercase tracking-wider">
                    Applications ({filteredApps.length})
                  </span>
                  <span className="text-[9px] font-mono text-[#C6A46A]">Click or drag</span>
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
                      className="p-2.5 rounded-xl bg-[#0C0C14] border border-[#181826] hover:border-[#C6A46A]/40 transition-all group flex flex-col gap-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md"
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
                          className="p-1 rounded-lg bg-[#141420] text-[#8C7A6B] hover:text-[#C6A46A] hover:bg-[#1E1E30] transition-colors"
                          title={`Add ${app.name} to canvas`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[10px] text-[#8C7A6B] line-clamp-2 leading-relaxed">
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
                          className="text-[10px] font-mono text-[#C6A46A] hover:underline"
                        >
                          Configure
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar Footer: System Status */}
              <div className="p-3 border-t border-[#141420] bg-[#06060B]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#8C7A6B]">Harpy Core Status</span>
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE (120B)
                  </span>
                </div>
                <p className="text-[9px] text-[#8C7A6B]/80 font-mono mt-1">
                  Automations connect to Central Core to be eligible for execution.
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ──────────────────────────────────────────────────────────
            FIGMA-INSPIRED INFINITE MOVABLE CANVAS
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
              'radial-gradient(rgba(198, 164, 106, 0.14) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* AI Success Toast */}
          <AnimatePresence>
            {aiSuccessToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-4 inset-x-0 z-40 pointer-events-none flex justify-center px-4"
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
                <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Render Existing Connections */}
              {visibleConnections.map((conn) => {
                // Node card width is 250px -> half width is 125px
                const NODE_HALF_W = 125;
                const CORE_RADIUS = 92;

                let fromX = 0;
                let fromY = 0;
                let toX = 0;
                let toY = 0;

                // Resolve source position
                if (conn.fromNodeId === 'harpy-core') {
                  const targetNode = nodes.find((n) => n.id === conn.toNodeId);
                  const isTargetOnRight = targetNode ? targetNode.x > 0 : true;
                  fromX = isTargetOnRight ? CORE_RADIUS : -CORE_RADIUS;
                  fromY = 0;
                } else {
                  const srcNode = nodes.find((n) => n.id === conn.fromNodeId);
                  if (srcNode) {
                    fromX = srcNode.x + NODE_HALF_W;
                    fromY = srcNode.y;
                  }
                }

                // Resolve target position
                if (conn.toNodeId === 'harpy-core') {
                  const isSourceOnLeft = fromX < 0;
                  toX = isSourceOnLeft ? -CORE_RADIUS : CORE_RADIUS;
                  toY = 0;
                } else {
                  const targetNode = nodes.find((n) => n.id === conn.toNodeId);
                  if (targetNode) {
                    toX = targetNode.x - NODE_HALF_W;
                    toY = targetNode.y;
                  }
                }

                // Smooth Cubic Bezier curve
                const dx = Math.max(90, Math.abs(toX - fromX) * 0.5);
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
                        // Click connection wire to delete
                        setConnections((prev) => prev.filter((c) => c.id !== conn.id));
                      }}
                    />

                    {/* Outer Glowing Wire */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={conn.isActive ? '#C6A46A' : '#333346'}
                      strokeWidth={conn.isActive ? 2.5 : 2}
                      strokeOpacity={conn.isActive ? 0.75 : 0.4}
                      filter={conn.isActive ? 'url(#wireGlow)' : undefined}
                    />

                    {/* Inner Animated Pulse Energy Line */}
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

              {/* Connecting Wire Preview while dragging */}
              {connectingSource && (
                <path
                  d={`M ${
                    connectingSource.nodeId === 'harpy-core'
                      ? mousePos.x > 0
                        ? 92
                        : -92
                      : (nodes.find((n) => n.id === connectingSource.nodeId)?.x || 0) + 125
                  } ${
                    connectingSource.nodeId === 'harpy-core'
                      ? 0
                      : nodes.find((n) => n.id === connectingSource.nodeId)?.y || 0
                  } L ${mousePos.x} ${mousePos.y}`}
                  fill="none"
                  stroke="#C6A46A"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
            </svg>

            {/* ──────────────────────────────────────────────────────────
                CENTRAL HARPY AI SYSTEM NODE (ORCHESTRATOR CORE)
                Positioned at (0, 0)
               ────────────────────────────────────────────────────────── */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: 0,
                top: 0,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Concentric Rotating Auras */}
              <div className="absolute inset-0 -m-16 rounded-full bg-gradient-to-tr from-[#C6A46A]/20 via-amber-500/10 to-emerald-500/15 blur-3xl animate-pulse pointer-events-none" />
              <div className="absolute inset-0 -m-10 rounded-full border border-[#C6A46A]/25 animate-spin [animation-duration:30s] pointer-events-none" />
              <div className="absolute inset-0 -m-5 rounded-full border border-dashed border-[#C6A46A]/35 animate-spin [animation-duration:18s] [animation-direction:reverse] pointer-events-none" />

              {/* Central Core Card */}
              <div
                onClick={() => setSelectedNodeId('harpy-core')}
                className={`relative w-48 h-48 rounded-3xl bg-gradient-to-b from-[#141420] via-[#0E0E18] to-[#07070C] border-2 transition-all p-3 flex flex-col items-center justify-center text-center shadow-[0_0_60px_rgba(198,164,106,0.35)] cursor-pointer group ${
                  selectedNodeId === 'harpy-core'
                    ? 'border-[#C6A46A] shadow-[0_0_80px_rgba(198,164,106,0.55)] ring-2 ring-[#C6A46A]'
                    : 'border-[#C6A46A]/70 hover:border-[#C6A46A]'
                }`}
              >
                {/* 4 Connection Ports (N, S, E, W) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingSource) {
                      // Complete connection to Harpy Core
                      setConnections((prev) => [
                        ...prev,
                        {
                          id: `conn-${connectingSource.nodeId}-core-${Date.now()}`,
                          workflowId: workflows[0]?.id || 'wf-1',
                          fromNodeId: connectingSource.nodeId,
                          fromPort: 'output',
                          toNodeId: 'harpy-core',
                          toPort: 'input',
                          isActive: true,
                        },
                      ]);
                      setConnectingSource(null);
                    } else {
                      setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                    }
                  }}
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_12px_#C6A46A] hover:scale-125 transition-transform flex items-center justify-center"
                  title="North Port: Click to link workflow"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#050508]" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingSource) {
                      setConnections((prev) => [
                        ...prev,
                        {
                          id: `conn-${connectingSource.nodeId}-core-${Date.now()}`,
                          workflowId: workflows[0]?.id || 'wf-1',
                          fromNodeId: connectingSource.nodeId,
                          fromPort: 'output',
                          toNodeId: 'harpy-core',
                          toPort: 'input',
                          isActive: true,
                        },
                      ]);
                      setConnectingSource(null);
                    } else {
                      setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                    }
                  }}
                  className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_12px_#C6A46A] hover:scale-125 transition-transform flex items-center justify-center"
                  title="South Port: Click to link workflow"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#050508]" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingSource) {
                      setConnections((prev) => [
                        ...prev,
                        {
                          id: `conn-${connectingSource.nodeId}-core-${Date.now()}`,
                          workflowId: workflows[0]?.id || 'wf-1',
                          fromNodeId: connectingSource.nodeId,
                          fromPort: 'output',
                          toNodeId: 'harpy-core',
                          toPort: 'input',
                          isActive: true,
                        },
                      ]);
                      setConnectingSource(null);
                    } else {
                      setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                    }
                  }}
                  className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_12px_#C6A46A] hover:scale-125 transition-transform flex items-center justify-center"
                  title="West Inflow: Connect triggers here"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#050508]" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectingSource) {
                      setConnections((prev) => [
                        ...prev,
                        {
                          id: `conn-${connectingSource.nodeId}-core-${Date.now()}`,
                          workflowId: workflows[0]?.id || 'wf-1',
                          fromNodeId: connectingSource.nodeId,
                          fromPort: 'output',
                          toNodeId: 'harpy-core',
                          toPort: 'input',
                          isActive: true,
                        },
                      ]);
                      setConnectingSource(null);
                    } else {
                      setConnectingSource({ nodeId: 'harpy-core', port: 'output' });
                    }
                  }}
                  className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#C6A46A] border-2 border-[#050508] shadow-[0_0_12px_#C6A46A] hover:scale-125 transition-transform flex items-center justify-center"
                  title="East Outflow: Connect actions here"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#050508]" />
                </button>

                {/* Core Brand Visual */}
                <div className="w-14 h-14 rounded-2xl bg-[#090912] border border-[#C6A46A]/60 flex items-center justify-center shadow-inner mb-2 group-hover:scale-105 transition-transform">
                  <Bot className="w-7 h-7 text-[#C6A46A] animate-pulse" />
                </div>

                <h4 className="font-cinzel text-xs font-bold text-[#E8DDC7] uppercase tracking-wider leading-tight">
                  Harpy AI System
                </h4>
                <p className="text-[9px] font-mono text-[#C6A46A] mt-0.5">Autonomous Core</p>

                {/* Live Core Status */}
                <div className="mt-2 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {workflows.filter((w) => w.isConnectedToCore).length} Active Pipelines
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
                  className={`absolute pointer-events-auto w-[250px] rounded-2xl bg-[#0A0A14]/95 backdrop-blur-xl border transition-all shadow-xl cursor-move group ${
                    isSelected
                      ? 'border-[#C6A46A] shadow-[0_0_35px_rgba(198,164,106,0.4)] ring-1 ring-[#C6A46A]'
                      : 'border-[#1C1C2C] hover:border-[#C6A46A]/50'
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
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#10101C] border-2 border-[#C6A46A] hover:scale-125 transition-transform flex items-center justify-center cursor-pointer shadow-md"
                    title="Input Port: Click to connect wire"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A46A]" />
                  </div>

                  {/* Right Output Port */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingSource({ nodeId: node.id, port: 'output' });
                    }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#10101C] border-2 border-[#34D399] hover:scale-125 transition-transform flex items-center justify-center cursor-pointer shadow-md"
                    title="Output Port: Drag wire to connect next node"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  </div>

                  {/* Node Header */}
                  <div className="p-3 border-b border-[#161626] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                        style={{ backgroundColor: `${app?.color || '#C6A46A'}20`, color: app?.color || '#C6A46A' }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-[#E8DDC7] block truncate">
                          {app?.name || 'Node'}
                        </span>
                        <span className="text-[10px] text-[#8C7A6B] font-mono block">
                          {node.type === 'trigger' ? '⚡ Trigger' : node.type === 'ai-processor' ? '🧠 AI Kernel' : '🎯 Action'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Node Body Details */}
                  <div className="p-3 space-y-2">
                    <h5 className="text-xs font-semibold text-[#E8DDC7] leading-snug">
                      {node.title}
                    </h5>
                    <p className="text-[11px] text-[#8C7A6B] font-mono line-clamp-2 leading-relaxed">
                      {node.actionOrTrigger}
                    </p>

                    {/* Footer: Core Connection Status */}
                    <div className="pt-2 border-t border-[#141424] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {node.isConnectedToCore ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                            <Link2 className="w-3 h-3" /> Linked Core
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400/80">
                            <Link2Off className="w-3 h-3" /> Standalone
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkflowCoreConnection(node.workflowId);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          node.isConnectedToCore
                            ? 'text-rose-400 bg-rose-950/30 border border-rose-500/30 hover:bg-rose-950/50'
                            : 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-950/50'
                        }`}
                      >
                        {node.isConnectedToCore ? 'Disconnect' : 'Link Core'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ──────────────────────────────────────────────────────────
              3. FLOATING AI AUTOMATION PROMPT BAR (BOTTOM DOCK)
              Placed at bottom-center so canvas nodes are completely unobstructed!
             ────────────────────────────────────────────────────────── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex justify-center w-full max-w-2xl px-4">
            <div className="pointer-events-auto w-full p-2 bg-[#0A0A14]/90 backdrop-blur-2xl border border-[#C6A46A]/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(198,164,106,0.25)] flex items-center gap-3">
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
                className={`px-4 py-2 rounded-xl font-cinzel text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  aiPrompt.trim()
                    ? 'bg-[#C6A46A] text-[#050508] hover:bg-[#E2C99A] cursor-pointer shadow-md'
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

          {/* ──────────────────────────────────────────────────────────
              BOTTOM CORNER CONTROLS (QUICK TEMPLATES & RECENTER)
             ────────────────────────────────────────────────────────── */}
          <div className="absolute bottom-6 right-6 z-30 hidden lg:flex items-center gap-2 select-none">
            <div className="flex items-center gap-1.5 bg-[#090912]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1A1A28] text-xs font-mono text-[#8C7A6B]">
              <span>Templates:</span>
              <button
                type="button"
                onClick={() =>
                  handleGenerateWorkflowFromAi('Summarize Gmail emails and create tasks in Notion')
                }
                className="text-[#C6A46A] hover:underline"
              >
                Gmail→Notion
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() =>
                  handleGenerateWorkflowFromAi('Triage GitHub PRs and send summary to Slack')
                }
                className="text-[#C6A46A] hover:underline"
              >
                GitHub→Slack
              </button>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            RIGHT SIDEBAR: NODE INSPECTOR DRAWER
           ────────────────────────────────────────────────────────── */}
        <NodeInspectorModal
          node={selectedNodeObject}
          app={selectedApp}
          isOpen={!!selectedNodeObject && selectedNodeId !== 'harpy-core'}
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
