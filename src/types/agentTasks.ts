export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  schedule?: string; // Cron expression
  runAt?: string; // ISO datetime for one-time tasks
  task: string; // Module name (e.g., "run-agent")
  enabled: boolean;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version?: number; // Incremented on each config update
}

export interface NormalizedTaskResult {
  /** Display layer - REQUIRED for UI rendering */
  display: {
    /** One-line summary for list views */
    summary: string;
    /** Full text/markdown for detail views */
    details?: string;
  };
  /** Metrics layer - OPTIONAL, only populated when applicable */
  metrics?: {
    /** AI cost in USD (run-agent only) */
    cost?: number;
    /** Execution time in ms (all tasks) */
    duration?: number;
    /** Items processed (task-dependent) */
    items?: number;
    /** Tokens used (AI tasks only) */
    tokens?: number;
  };
  /** Metadata layer - OPTIONAL, task-specific debugging info */
  metadata?: {
    /** AI session ID (run-agent only) */
    sessionId?: string;
    /** Tool invocations (AI tasks only) */
    toolCalls?: number;
    /** Task categorization */
    taskType?: string;
  };
}

export interface ExecutionTrigger {
  id: string;
  name: string;
  type: string;
  variant?: string;
}

export interface TaskExecution {
  /** Unique execution ID */
  id: string;
  timestamp: string;
  success: boolean;
  durationMs: number;
  error?: string;
  message?: string;
  data?: Record<string, unknown>;
  /** Normalized result in standard format for frontend consumption */
  normalizedResult?: NormalizedTaskResult;
  /** Model name used for execution (e.g., "claude-sonnet-4-5", "GLM-4.7-Flash-Q4_K_M") */
  model?: string;
  /** Whether a local model was used */
  isLocal?: boolean;
  /** Task ID (when returned from executions list endpoint) */
  taskId?: string;
  /** Task name (when returned from executions list endpoint) */
  taskName?: string;
  /** Workspace agent ID (when returned from agents history endpoint) */
  agentId?: string;
  /** Workspace agent name (when returned from agents history endpoint) */
  agentName?: string;
  /** Trigger that fired this run (absent for manual/cron runs) */
  trigger?: ExecutionTrigger;
}

export interface ScheduledTaskListResponse {
  tasks: ScheduledTask[];
  count: number;
}

export interface CreateTaskInput {
  name: string;
  task: string;
  schedule?: string;
  runAt?: string;
  description?: string;
  enabled?: boolean;
  properties?: Record<string, unknown>;
}

/**
 * Properties for run-agent tasks
 * Based on xerro-service/src/tasks/run-agent.ts
 */
export interface RunAgentProperties {
  /** The prompt/task to execute (required) */
  prompt: string;
  /** Working directory for the agent (optional) */
  cwd?: string;
  /** Permission mode: 'allow_all' or custom allow list (optional) */
  permissions?: 'allow_all' | { allowList: string[] };
  /** Additional directories the agent can access (optional) */
  additionalDirectories?: string[];
  /** Use local LLM server instead of Anthropic API (optional) */
  local?: boolean;
  /** Local LLM model name (optional, only used when local is true) */
  localModel?: string;
  /** Which settings directories to load: skills, hooks, MCP servers (default: ['project']) */
  settingSources?: ('user' | 'project' | 'local')[];
  /** Tools to always block regardless of permission mode */
  disallowedTools?: string[];
  /**
   * Disable the Graphiti memory context injection for this task.
   * Default: false (memory context is included in the prompt)
   */
  disableMemoryContext?: boolean;
  /**
   * Control whether notifications are sent when this task completes.
   * Default: true (agent decides NOTIFY vs SILENT based on result)
   * Set to false to suppress all notifications regardless of agent decision.
   */
  notificationMode?: boolean;
  /**
   * Maximum wall-clock execution time in milliseconds before the run is forcefully aborted.
   * Default: undefined (falls back to 10 minutes at execution time)
   */
  maxDurationMs?: number;
  /**
   * Override the system prompt sent to the model.
   * - Plain string: replaces the entire claude_code preset (~27k tokens → near-zero SDK overhead)
   * - Preset object: keeps claude_code preset and appends extra instructions
   * - Absent (default): uses the full claude_code preset unchanged
   */
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append: string };
}

/**
 * Assistant message from agent execution
 */
export interface TraceAssistantMessage {
  content: string;
  timestamp: string;
  truncated: boolean;
  originalSizeBytes: number;
  hasToolCalls: boolean;
}

/**
 * Tool information from Claude Code
 */
export interface ToolInfo {
  name: string;
  description: string;
  category: 'filesystem' | 'execution' | 'search' | 'web' | 'ai' | 'mcp' | 'config' | 'other';
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Category metadata
 */
export interface CategoryInfo {
  label: string;
  description: string;
}

/**
 * Response from /api/v1/scheduled-tasks/tools
 */
export interface ToolsResponse {
  tools: ToolInfo[];
  categories: Record<string, CategoryInfo>;
}

/**
 * Agent execution trace types
 */
export interface TraceToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  calledAt: string;
}

export interface TraceToolResult {
  toolUseId: string;
  content: string;
  isError: boolean;
  receivedAt: string;
  truncated: boolean;
  originalSizeBytes: number;
}

export interface TracePermissionRequest {
  toolUseId: string;
  toolName: string;
  decision: 'allow' | 'deny';
  reason?: string;
  timestamp: string;
}

export interface AgentExecutionTrace {
  executionId: string;
  sessionId?: string;
  model?: string;
  cwd?: string;
  permissionMode?: string;
  /** Settings directories that were loaded for this run */
  settingSources?: string[];
  assistantMessages: TraceAssistantMessage[];
  toolCalls: TraceToolCall[];
  toolResults: TraceToolResult[];
  permissions: TracePermissionRequest[];
  totalCostUsd?: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
  /** Full constructed prompt sent to the model (only present when executionId exists) */
  prompt?: string;
  /** Rough token estimate for our prompt (chars / 4); subtract from usage.inputTokens to see SDK overhead */
  promptTokenEstimate?: number;
}

/**
 * Running task from /api/v1/scheduled-tasks/running
 */
export interface RunningTask {
  executionId: string;
  taskId: string;
  taskName: string;
  taskType: string;
  startedAt: string;
  currentOperation: string;
  model?: string;
  isLocal: boolean;
  elapsedMs: number;
  toolName?: string;      // Current tool being used
  toolCallId?: string;    // Tool call ID
  isToolError?: boolean;  // Whether last tool result was an error
  trigger?: ExecutionTrigger;
}

/**
 * Response from /api/v1/scheduled-tasks/running
 */
export interface RunningTasksResponse {
  running: RunningTask[];
}

/**
 * A single version snapshot of a scheduled task's configuration
 */
export interface TaskVersionSnapshot {
  version: number;
  savedAt: string; // ISO datetime
  config: ScheduledTask & { version: number };
}

/**
 * Response from /api/v1/scheduled-tasks/:id/versions
 */
export interface TaskVersionsResponse {
  taskId: string;
  versions: TaskVersionSnapshot[];
}
