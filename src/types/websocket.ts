// WebSocket connection states
export type ConnectionState = "connected" | "disconnected" | "reconnecting" | "error";

// Base event structure
interface BaseEvent {
  event_type: string;
  group_id: string;
  timestamp: string;
}

// Entity events
export interface EntityCreatedEvent extends BaseEvent {
  event_type: "entity.created";
  data: {
    uuid: string;
    name: string;
    summary: string;
    labels: string[];
    attributes: Record<string, unknown>;
    created_at: string;
  };
}

export interface EntityDeletedEvent extends BaseEvent {
  event_type: "entity.deleted";
  data: {
    uuid: string;
  };
}

// Edge events
export interface EdgeCreatedEvent extends BaseEvent {
  event_type: "edge.created";
  data: {
    uuid: string;
    source_node_uuid: string;
    target_node_uuid: string;
    name: string;
    fact: string;
    valid_at: string;
    created_at: string;
  };
}

export interface EdgeDeletedEvent extends BaseEvent {
  event_type: "edge.deleted";
  data: {
    uuid: string;
  };
}

// Episode events
export interface EpisodeCreatedEvent extends BaseEvent {
  event_type: "episode.created";
  data: {
    uuid: string;
    name: string;
    content: string;
    source_description: string;
    session_id: string;
    timestamp: string;
    created_at: string;
    valid_at: string;
  };
}

export interface EpisodeDeletedEvent extends BaseEvent {
  event_type: "episode.deleted";
  data: {
    uuid: string;
    session_id?: string;
  };
}

// Group events
export interface GroupDeletedEvent extends BaseEvent {
  event_type: "group.deleted";
  data: {
    deleted_edges: number;
    deleted_nodes: number;
    deleted_episodes: number;
  };
}

// Session events
export interface SessionDeletedEvent extends BaseEvent {
  event_type: "session.deleted";
  data: {
    session_id: string;
    uuid: string;
    episode_count: number;
  };
}

// Project events
export interface ProjectDeletedEvent extends BaseEvent {
  event_type: "project.deleted";
  data: {
    project_name: string;
    deleted_sessions: number;
    deleted_episodes: number;
  };
}

// Queue status events
export interface QueueStatusEvent extends BaseEvent {
  event_type: "queue.status";
  data: {
    queue_size: number;          // Items waiting in queue
    processing_count: number;    // Items being processed
    total_pending: number;       // Total work remaining (queue_size + processing_count)
    is_processing: boolean;      // true if total_pending > 0
  };
}

// Union type for all events
export type WebSocketEvent =
  | EntityCreatedEvent
  | EntityDeletedEvent
  | EdgeCreatedEvent
  | EdgeDeletedEvent
  | EpisodeCreatedEvent
  | EpisodeDeletedEvent
  | SessionDeletedEvent
  | GroupDeletedEvent
  | ProjectDeletedEvent
  | QueueStatusEvent;

// Event handler types
export type EventHandler<T = unknown> = (event: T) => void;
export type StateChangeHandler = (state: ConnectionState) => void;

// ============================================================================
// Xerro-Service WebSocket Events (Socket.IO)
// Used for real-time agent task status and Obsidian document change notifications
// ============================================================================

export type AgentStatus = 'started' | 'operation_update' | 'model_update' | 'tool_use' | 'tool_result' | 'completed' | 'cancelled' | 'error';
export type DocumentChangeType = 'added' | 'modified' | 'removed';

export interface AgentStatusEvent {
  executionId: string;
  taskId: string;
  taskName: string;
  status: AgentStatus;
  currentOperation?: string;
  model?: string;
  isLocal?: boolean;
  cwd?: string;
  toolName?: string;           // Tool name (for tool_use and tool_result)
  toolCallId?: string;         // Tool call ID (for tool_use and tool_result)
  toolInput?: string;          // Tool input preview (for tool_use)
  toolResult?: string;         // Tool result preview (for tool_result)
  isToolError?: boolean;       // Whether tool result is an error (for tool_result)
  error?: string;
  timestamp: string;
  trigger?: import("@/types/agentTasks").ExecutionTrigger;
}

export interface DocumentChangeEvent {
  path: string;
  absolutePath: string;
  changeType: DocumentChangeType;
  timestamp: string;
}

export interface BookmarkChangeEvent {
  path: string;
  changeType: 'added' | 'removed';
  bookmark?: {
    path: string;
    created: string;
    tags: string[];
    note: string;
  };
  timestamp: string;
}

export interface TaskConfigEvent {
  taskId: string;
  taskName: string;
  taskType: string;
  schedule?: string;
  runAt?: string;
  enabled: boolean;
  properties?: Record<string, unknown>;
  timestamp: string;
}

export interface TriggerConfigEvent {
  id: string;
  name: string;
  triggerType: string;
  triggerVariant: string;
  enabled: boolean;
  timestamp: string;
}

export interface TriggerDeletedEvent {
  id: string;
  timestamp: string;
}

export interface TodoChangeEvent {
  id: string;
  timestamp: string;
}

export interface MemorySessionPayload {
  sessionId: string;
  projectName?: string;
  projectPath?: string;
}

export interface MemorySessionDeletedPayload {
  sessionId: string;
  deletedAt: string;
}

export interface MemoryProjectPayload {
  name: string;
  projectPath?: string;
  sessionCount?: number;
  lastTurnAt?: string;
}

import type { FeedTopic, FeedItem } from './feeds';

export interface FeedTopicEvent {
  topic: FeedTopic;
}

export interface FeedTopicDeletedEvent {
  id: string;
  deletedAt: string;
}

export interface FeedItemEvent {
  item: FeedItem;
}

export interface FeedItemDeletedEvent {
  id: string;
  topicId: string;
  deletedAt: string;
}

// ============================================================================
// Agent WebSocket Events
// ============================================================================

export interface AgentConfigPayload {
  id: string;
  name: string;
  description?: string;
  workspace: string;
  enabled: boolean;
  timestamp: string;
}

export interface AgentDeletedPayload {
  id: string;
  timestamp: string;
}

export interface WorkspaceFilePayload {
  agentId: string;
  path: string;
  timestamp: string;
}

export interface WorkspaceFileMovedPayload {
  agentId: string;
  oldPath: string;
  newPath: string;
  timestamp: string;
}

export interface WorkspaceFolderPayload {
  agentId: string;
  path: string;
  timestamp: string;
}

export interface WorkspaceFolderMovedPayload {
  agentId: string;
  oldPath: string;
  newPath: string;
  timestamp: string;
}

export interface XerroWebSocketEvents {
  'events:list': (events: string[]) => void;
  'scheduled-tasks:agent-status': (data: AgentStatusEvent) => void;
  'agents:agent-status': (data: AgentStatusEvent) => void;
  'scheduled-tasks:task-created': (data: TaskConfigEvent) => void;
  'scheduled-tasks:task-updated': (data: TaskConfigEvent) => void;
  'scheduled-tasks:task-deleted': (data: TaskConfigEvent) => void;
  'triggers:trigger-created': (data: TriggerConfigEvent) => void;
  'triggers:trigger-updated': (data: TriggerConfigEvent) => void;
  'triggers:trigger-deleted': (data: TriggerDeletedEvent) => void;
  'documents:document-added': (data: DocumentChangeEvent) => void;
  'documents:document-updated': (data: DocumentChangeEvent) => void;
  'documents:document-removed': (data: DocumentChangeEvent) => void;
  'obsidian:bookmark-changed': (data: BookmarkChangeEvent) => void;
  'todos:todo-created': (data: TodoChangeEvent) => void;
  'todos:todo-updated': (data: TodoChangeEvent) => void;
  'todos:todo-deleted': (data: TodoChangeEvent) => void;
  'memory:session-created': (data: MemorySessionPayload) => void;
  'memory:session-updated': (data: MemorySessionPayload) => void;
  'memory:session-deleted': (data: MemorySessionDeletedPayload) => void;
  'memory:project-added': (data: MemoryProjectPayload) => void;
  'memory:project-updated': (data: MemoryProjectPayload) => void;
  'memory:project-deleted': (data: MemoryProjectPayload) => void;
  'feeds:topic-created': (data: FeedTopicEvent) => void;
  'feeds:topic-deleted': (data: FeedTopicDeletedEvent) => void;
  'feeds:item-created': (data: FeedItemEvent) => void;
  'feeds:item-updated': (data: FeedItemEvent) => void;
  'feeds:item-deleted': (data: FeedItemDeletedEvent) => void;
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;
}
