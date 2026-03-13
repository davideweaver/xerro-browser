export interface ChatSession {
  id: string;
  name: string;
  config: ChatSessionConfig;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messageCount: number;
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
