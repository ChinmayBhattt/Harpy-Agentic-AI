// Shared Agent Streaming Protocol & Data Types

export type PlanStepStatus = 'pending' | 'in_progress' | 'done';

export interface PlanStep {
  id: string;
  title: string;
  status: PlanStepStatus;
  detail?: string;
  targetFiles?: string[];
}

export interface PlanSpecification {
  summary: string;
  steps: PlanStep[];
  filesToCreate: string[];
  filesToModify: string[];
  verificationSteps: string[];
  originalPrompt: string;
}

export interface VerificationCheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface FileChangeRecord {
  path: string;
  action: 'created' | 'edited' | 'deleted';
  addedLines: number;
  removedLines: number;
  oldContent?: string;
  newContent?: string;
  timestamp: string;
  preExistingHash?: string;
}

export type AgentEvent =
  | {
      type: 'thinking_start';
      timestamp: number;
    }
  | {
      type: 'thinking_end';
      durationSeconds: number;
      thoughtSummary?: string;
    }
  | {
      type: 'plan';
      steps: PlanStep[];
    }
  | {
      type: 'plan_spec';
      planSpec: PlanSpecification;
    }
  | {
      type: 'message_delta';
      delta: string;
    }
  | {
      type: 'tool_start';
      id: string;
      tool: string;
      args: Record<string, unknown>;
      displayText: string;
    }
  | {
      type: 'tool_end';
      id: string;
      tool: string;
      status: 'success' | 'error';
      resultSummary: string;
      output?: string;
      exitCode?: number;
      filePath?: string;
      lineRange?: string;
    }
  | {
      type: 'file_changed';
      path: string;
      action: 'created' | 'edited';
      added: number;
      removed: number;
      oldContent?: string;
      newContent?: string;
    }
  | {
      type: 'done';
      filesChanged: FileChangeRecord[];
      summary: string;
      planSpec?: PlanSpecification;
      verificationChecks?: VerificationCheckResult[];
    }
  | {
      type: 'approval_required';
      id: string;
      command: string;
      reason: string;
    }
  | {
      type: 'approval_resolved';
      id: string;
      approved: boolean;
    }
  | {
      type: 'build_verification';
      status: 'running' | 'passed' | 'failed';
      command: string;
      output?: string;
    }
  | {
      type: 'error';
      message: string;
    };

export interface AgentRunData {
  sessionId: string;
  workspacePath: string;
  status: 'running' | 'completed' | 'failed' | 'aborted' | 'waiting_approval' | 'plan_ready';
  plan: PlanStep[];
  planSpec?: PlanSpecification;
  verificationChecks?: VerificationCheckResult[];
  events: AgentEvent[];
  filesChanged: FileChangeRecord[];
  thinkingDuration?: number;
  finalMessage?: string;
  error?: string;
  pendingApproval?: {
    id: string;
    command: string;
    reason: string;
  };
}
