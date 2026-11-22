export type BrowserStatus =
  | 'idle'
  | 'navigating'
  | 'observing'
  | 'planning'
  | 'acting'
  | 'verifying'
  | 'awaiting_confirmation'
  | 'completed'
  | 'error'
  | 'manual';

export type BrowserControlMode = 'agent' | 'manual';

export interface InteractiveElement {
  index: number;
  tag: string;
  text: string;
  role?: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  href?: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isSensitive?: boolean;
}

export interface PendingConfirmation {
  id: string;
  action: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  elementIndex?: number;
  url?: string;
}

export interface BrowserStepLog {
  id: string;
  timestamp: string;
  stepNumber: number;
  phase: 'OBSERVE' | 'PLAN' | 'ACT' | 'VERIFY' | 'CONFIRMATION' | 'SYSTEM';
  thought?: string;
  action?: string;
  details?: string;
  status: 'pending' | 'success' | 'failed';
  screenshot?: string;
}

export interface BrowserSessionState {
  sessionId: string;
  url: string;
  title: string;
  screenshot: string; // base64 data URL
  interactiveElements: InteractiveElement[];
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  controlMode: BrowserControlMode;
  status: BrowserStatus;
  currentGoal?: string;
  currentStep: number;
  maxSteps: number;
  pendingConfirmation?: PendingConfirmation | null;
  logs: BrowserStepLog[];
  finalResult?: string;
  lastError?: string;
}

export type PlannedActionType =
  | 'navigate'
  | 'search_google'
  | 'click'
  | 'type'
  | 'press_key'
  | 'scroll'
  | 'wait'
  | 'ask_confirmation'
  | 'finish';

export interface AgentPlannedAction {
  thought: string;
  action: PlannedActionType;
  targetIndex?: number;
  targetSelector?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  pressEnter?: boolean;
  key?: string;
  url?: string;
  scrollDirection?: 'up' | 'down';
  scrollAmount?: number;
  confirmationReason?: string;
  verificationExpectation?: string;
  result?: string;
}
