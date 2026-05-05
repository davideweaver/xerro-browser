export interface ChatSession {
  id: string;
  name: string;
  groupId?: string;
  agentId?: string;
  config: ChatSessionConfig;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messageCount: number;
  activeExecutionId?: string | null; // live executor state — non-null means a turn is running
  slash_commands?: string[];         // available slash commands, populated after first turn
}

export interface ChatGroupContextItem {
  type: 'document' | 'project' | 'memory_query' | string;
  ref: string;
  label?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  context: ChatGroupContextItem[];
  createdAt: string;
  updatedAt: string;
  sessionCount?: number;
  lastSessionActivity?: string;
}

export interface ChatSessionConfig {
  cwd?: string;
  permissions?: 'allow_all' | { allowList: string[] };
  local?: boolean;
  localBaseUrl?: string;
  localModel?: string;
  settingSources?: ('user' | 'project' | 'local')[];
  systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };
  disableMemoryContext?: boolean;
}

export type XerroMessageContentBlock =
  | { type: 'thinking'; text: string }
  | { type: 'text'; text: string }
  | { type: 'tool_use'; toolName: string; toolCallId: string; parentToolUseId?: string | null; toolInput?: string; toolResult?: string; isToolError?: boolean };

export interface XerroChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: {
    attachedImages?: string[];    // base64 data URLs for inline image preview (user messages)
    durationMs?: number;
    costUsd?: number;
    toolCallCount?: number;
    model?: string;
    isLocal?: boolean;
    executionId?: string;
    resultType?: 'completed' | 'cancelled' | 'error';
    error?: string;
    contentBlocks?: XerroMessageContentBlock[];
  };
}

export interface ChatSessionSearchResult {
  chatSessionId: string;
  description: string;
  score: number;
  excerpt: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ActiveExecution {
  executionId: string;
  contentBlocks: XerroMessageContentBlock[];
  updatedAt: string;
}

export interface ChatSSEEvent {
  type: 'started' | 'tool_use' | 'tool_result' | 'assistant_text' | 'thinking' | 'completed' | 'error' | 'cancelled' | 'plan_ready';
  executionId: string;
  timestamp: string;
  // tool_use fields
  toolName?: string;
  toolCallId?: string;
  parentToolUseId?: string | null;
  toolInput?: unknown;
  // tool_result fields
  toolResult?: unknown;
  isToolError?: boolean;
  // assistant_text
  text?: string;
  // thinking
  thinking?: string;
  // completed/error fields
  durationMs?: number;
  costUsd?: number;
  toolCallCount?: number;
  model?: string;
  isLocal?: boolean;
  error?: string;
}
