import {
  Mail,
  FileText,
  Video,
  HardDrive,
  Calendar,
  MessageSquare,
  Smartphone,
  Github,
  Bot,
  Database,
  Terminal,
  Globe,
  Zap,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';

export type ConnectorCategory = 'communication' | 'productivity' | 'developer' | 'ai' | 'triggers';

export interface AppDefinition {
  id: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  iconName: string;
  color: string;
  isConnected: boolean;
  accountEmail?: string;
  accountName?: string;
  authType: 'oauth2' | 'apiKey' | 'session';
  scopes?: string[];
  triggers: string[];
  actions: string[];
}

export type NodeStatus = 'active' | 'paused' | 'running' | 'success' | 'error';

export interface WorkflowNode {
  id: string;
  workflowId: string;
  type: 'trigger' | 'action' | 'ai-processor' | 'harpy-core';
  appId: string;
  title: string;
  actionOrTrigger: string;
  x: number;
  y: number;
  status: NodeStatus;
  config: Record<string, any>;
  isConnectedToCore: boolean;
}

export interface WorkflowConnection {
  id: string;
  workflowId: string;
  fromNodeId: string;
  fromPort: 'output' | 'left' | 'right' | 'top' | 'bottom';
  toNodeId: string;
  toPort: 'input' | 'left' | 'right' | 'top' | 'bottom';
  isActive: boolean; // True only if part of a graph connected to Harpy Core
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  isConnectedToCore: boolean; // Master rule: must be connected to Harpy Core to run
  status: 'active' | 'paused' | 'running' | 'error';
  color: string;
  createdAt: string;
  lastRun?: string;
}

export interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeTitle: string;
  appId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  durationMs: number;
  outputPayload?: Record<string, any>;
}

export interface ExecutionTrace {
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  durationMs: number;
  steps: ExecutionStep[];
}

// Icon mapper for dynamic resolution
export const APP_ICONS: Record<string, LucideIcon> = {
  Mail,
  FileText,
  Video,
  HardDrive,
  Calendar,
  MessageSquare,
  Smartphone,
  Github,
  Bot,
  Database,
  Terminal,
  Globe,
  Zap,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
};

// Rich Ecosystem of Pre-configured Applications
export const DEFAULT_APPS: AppDefinition[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'communication',
    description: 'Read, parse, draft, and dispatch emails autonomously via OAuth 2.0',
    iconName: 'Mail',
    color: '#EA4335',
    isConnected: true,
    accountEmail: 'chinmaybhatt26@gmail.com',
    authType: 'oauth2',
    scopes: ['gmail.readonly', 'gmail.send', 'gmail.modify'],
    triggers: ['New email received', 'Email matching search query', 'Starred email'],
    actions: ['Send an email', 'Create draft email', 'Apply label', 'Mark as read'],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    description: 'Sync roadmaps, update databases, create pages & manage tasks',
    iconName: 'FileText',
    color: '#FFFFFF',
    isConnected: true,
    accountName: 'Harpy AI Workspace',
    authType: 'oauth2',
    scopes: ['read_content', 'update_content', 'insert_content'],
    triggers: ['Database item created', 'Page updated'],
    actions: ['Create database page', 'Update database item', 'Append block children'],
  },
  {
    id: 'google-meet',
    name: 'Google Meet',
    category: 'communication',
    description: 'Autonomous call link generation, transcript recording & auto-notes',
    iconName: 'Video',
    color: '#00897B',
    isConnected: true,
    accountEmail: 'chinmaybhatt26@gmail.com',
    authType: 'oauth2',
    scopes: ['calendar.events', 'meetings.space.created'],
    triggers: ['Meeting ended', 'Transcript ready'],
    actions: ['Generate instant meeting link', 'Schedule meeting with invitees'],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'productivity',
    description: 'Cloud document retrieval, auto-organization & PDF extraction',
    iconName: 'HardDrive',
    color: '#FFBA00',
    isConnected: true,
    accountEmail: 'chinmaybhatt26@gmail.com',
    authType: 'oauth2',
    scopes: ['drive.file', 'drive.readonly'],
    triggers: ['New file in folder', 'File updated'],
    actions: ['Upload document', 'Search files', 'Export as PDF'],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'productivity',
    description: 'Event scheduling, agenda sync & automated conflict resolution',
    iconName: 'Calendar',
    color: '#4285F4',
    isConnected: true,
    accountEmail: 'chinmaybhatt26@gmail.com',
    authType: 'oauth2',
    scopes: ['calendar.events', 'calendar.readonly'],
    triggers: ['Event starting in 15 mins', 'New event added'],
    actions: ['Create calendar event', 'List today\'s agenda', 'Reschedule meeting'],
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Team notifications, channel broadcast & conversational AI commands',
    iconName: 'MessageSquare',
    color: '#4A154B',
    isConnected: true,
    accountName: 'HarpyHQ Workspace',
    authType: 'oauth2',
    scopes: ['chat:write', 'channels:read', 'im:write'],
    triggers: ['Mention in channel', 'New message in #announcements'],
    actions: ['Send channel message', 'Send direct message', 'Update status'],
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'developer',
    description: 'Autonomous PR reviews, bug issue triage & repository code patches',
    iconName: 'Github',
    color: '#E6EDF3',
    isConnected: true,
    accountName: '@ChinmayBhattt',
    authType: 'oauth2',
    scopes: ['repo', 'workflow', 'read:org'],
    triggers: ['New Issue created', 'Pull request opened', 'Push to main'],
    actions: ['Create Issue', 'Post PR comment review', 'Merge pull request'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'communication',
    description: 'Autonomous direct messaging, team alerts & emergency dispatch',
    iconName: 'Smartphone',
    color: '#25D366',
    isConnected: true,
    accountName: '+91 98765 43210',
    authType: 'session',
    triggers: ['Incoming customer message', 'Group ping'],
    actions: ['Send WhatsApp message', 'Send media alert', 'Broadcast to group'],
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'communication',
    description: 'Community server bots, release broadcasts & bug triage channels',
    iconName: 'MessageSquare',
    color: '#5865F2',
    isConnected: true,
    accountName: 'Harpy Bot v2.6',
    authType: 'oauth2',
    scopes: ['bot', 'messages.read'],
    triggers: ['New message in #bugs', 'Slash command invoked'],
    actions: ['Send embed message', 'Create forum thread', 'Assign role'],
  },
  {
    id: 'ai-models',
    name: 'Harpy Multi-LLM Kernel',
    category: 'ai',
    description: 'DeepSeek R1, GPT-4o, Claude 3.5 Sonnet, Qwen 2.5 & Groq reasoning',
    iconName: 'Bot',
    color: '#C6A46A',
    isConnected: true,
    accountName: 'Sovereign 120B Kernel',
    authType: 'apiKey',
    triggers: ['Reasoning prompt triggered'],
    actions: ['Summarize text', 'Generate structured JSON', 'Code refactor', 'Classify intent'],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL / Supabase',
    category: 'developer',
    description: 'Autonomous SQL queries, record insertions & state persistence',
    iconName: 'Database',
    color: '#3ECF8E',
    isConnected: false,
    authType: 'apiKey',
    triggers: ['Database row inserted', 'Webhook event'],
    actions: ['Execute SQL query', 'Insert record', 'Update record by ID'],
  },
  {
    id: 'terminal',
    name: 'Terminal Sandbox CLI',
    category: 'developer',
    description: 'Run npm commands, test suites, builds & file manipulations in cloud container',
    iconName: 'Terminal',
    color: '#10B981',
    isConnected: true,
    accountName: 'harpy@workspace:/workspace',
    authType: 'session',
    triggers: ['Build failed', 'Command exited with 0'],
    actions: ['Execute shell command', 'Install dependencies', 'Run test suite'],
  },
  {
    id: 'chrome-agent',
    name: 'Chrome Browser Agent',
    category: 'ai',
    description: 'Headless Playwright navigation, live DOM extraction & form completion',
    iconName: 'Globe',
    color: '#4285F4',
    isConnected: true,
    accountName: 'Harpy Autonomous Chromium',
    authType: 'session',
    triggers: ['Web page updated', 'Price threshold met'],
    actions: ['Navigate to URL', 'Click element & fill form', 'Extract table text'],
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    category: 'triggers',
    description: 'Receive HTTP POST webhooks or trigger third-party REST APIs',
    iconName: 'Zap',
    color: '#EC4899',
    isConnected: true,
    accountName: 'https://harpy-ai.vercel.app/api/webhook/...',
    authType: 'apiKey',
    triggers: ['HTTP POST request received'],
    actions: ['Trigger HTTP request', 'Dispatch payload'],
  },
];
