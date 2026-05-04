import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentStatusEvent, DocumentChangeEvent, TaskConfigEvent, BookmarkChangeEvent, TodoChangeEvent, MemorySessionPayload, MemorySessionDeletedPayload, MemoryProjectPayload, FeedTopicEvent, FeedTopicDeletedEvent, FeedItemEvent, FeedItemDeletedEvent, AgentConfigPayload, AgentDeletedPayload, WorkspaceFilePayload, WorkspaceFileMovedPayload, WorkspaceFolderPayload, WorkspaceFolderMovedPayload, TriggerConfigEvent, TriggerDeletedEvent } from '@/types/websocket';
import type { NotificationCreatedEvent, NotificationReadEvent, NotificationsReadAllEvent, NotificationDeletedEvent } from '@/types/notifications';
import type { MessageCreatedEvent, MessageUpdatedEvent, MessageDeletedEvent, ThreadDeletedEvent } from '@/types/messages';

interface XerroWebSocketContextValue {
  isConnected: boolean;
  subscribeToAgentStatus: (callback: (event: AgentStatusEvent) => void) => () => void;
  subscribeToTaskCreated: (callback: (event: TaskConfigEvent) => void) => () => void;
  subscribeToTaskUpdated: (callback: (event: TaskConfigEvent) => void) => () => void;
  subscribeToTaskDeleted: (callback: (event: TaskConfigEvent) => void) => () => void;
  subscribeToDocumentAdded: (callback: (event: DocumentChangeEvent) => void) => () => void;
  subscribeToDocumentUpdated: (callback: (event: DocumentChangeEvent) => void) => () => void;
  subscribeToDocumentRemoved: (callback: (event: DocumentChangeEvent) => void) => () => void;
  subscribeToBookmarkChanged: (callback: (event: BookmarkChangeEvent) => void) => () => void;
  subscribeToTodoCreated: (callback: (event: TodoChangeEvent) => void) => () => void;
  subscribeToTodoUpdated: (callback: (event: TodoChangeEvent) => void) => () => void;
  subscribeToTodoDeleted: (callback: (event: TodoChangeEvent) => void) => () => void;
  subscribeToNotificationCreated: (callback: (event: NotificationCreatedEvent) => void) => () => void;
  subscribeToNotificationRead: (callback: (event: NotificationReadEvent) => void) => () => void;
  subscribeToNotificationUnread: (callback: (event: NotificationReadEvent) => void) => () => void;
  subscribeToNotificationsReadAll: (callback: (event: NotificationsReadAllEvent) => void) => () => void;
  subscribeToNotificationDeleted: (callback: (event: NotificationDeletedEvent) => void) => () => void;
  subscribeToMemorySessionCreated: (callback: (event: MemorySessionPayload) => void) => () => void;
  subscribeToMemorySessionUpdated: (callback: (event: MemorySessionPayload) => void) => () => void;
  subscribeToMemorySessionDeleted: (callback: (event: MemorySessionDeletedPayload) => void) => () => void;
  subscribeToMemoryProjectAdded: (callback: (event: MemoryProjectPayload) => void) => () => void;
  subscribeToMemoryProjectUpdated: (callback: (event: MemoryProjectPayload) => void) => () => void;
  subscribeToMemoryProjectDeleted: (callback: (event: MemoryProjectPayload) => void) => () => void;
  subscribeToFeedTopicCreated: (callback: (event: FeedTopicEvent) => void) => () => void;
  subscribeToFeedTopicDeleted: (callback: (event: FeedTopicDeletedEvent) => void) => () => void;
  subscribeToFeedItemCreated: (callback: (event: FeedItemEvent) => void) => () => void;
  subscribeToFeedItemUpdated: (callback: (event: FeedItemEvent) => void) => () => void;
  subscribeToFeedItemDeleted: (callback: (event: FeedItemDeletedEvent) => void) => () => void;
  subscribeToMessageCreated: (callback: (event: MessageCreatedEvent) => void) => () => void;
  subscribeToMessageUpdated: (callback: (event: MessageUpdatedEvent) => void) => () => void;
  subscribeToMessageDeleted: (callback: (event: MessageDeletedEvent) => void) => () => void;
  subscribeToThreadDeleted: (callback: (event: ThreadDeletedEvent) => void) => () => void;
  subscribeToAgentCreated: (callback: (event: AgentConfigPayload) => void) => () => void;
  subscribeToAgentUpdated: (callback: (event: AgentConfigPayload) => void) => () => void;
  subscribeToAgentDeleted: (callback: (event: AgentDeletedPayload) => void) => () => void;
  subscribeToAgentFileCreated: (callback: (event: WorkspaceFilePayload) => void) => () => void;
  subscribeToAgentFileUpdated: (callback: (event: WorkspaceFilePayload) => void) => () => void;
  subscribeToAgentFileDeleted: (callback: (event: WorkspaceFilePayload) => void) => () => void;
  subscribeToAgentFileMoved: (callback: (event: WorkspaceFileMovedPayload) => void) => () => void;
  subscribeToAgentFolderCreated: (callback: (event: WorkspaceFolderPayload) => void) => () => void;
  subscribeToAgentFolderDeleted: (callback: (event: WorkspaceFolderPayload) => void) => () => void;
  subscribeToAgentFolderMoved: (callback: (event: WorkspaceFolderMovedPayload) => void) => () => void;
  subscribeToTriggerCreated: (callback: (event: TriggerConfigEvent) => void) => () => void;
  subscribeToTriggerUpdated: (callback: (event: TriggerConfigEvent) => void) => () => void;
  subscribeToTriggerDeleted: (callback: (event: TriggerDeletedEvent) => void) => () => void;
}

const XerroWebSocketContext = createContext<XerroWebSocketContextValue | undefined>(undefined);

export function XerroWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Subscription callbacks
  const agentStatusCallbacksRef = useRef<Set<(event: AgentStatusEvent) => void>>(new Set());
  const taskCreatedCallbacksRef = useRef<Set<(event: TaskConfigEvent) => void>>(new Set());
  const taskUpdatedCallbacksRef = useRef<Set<(event: TaskConfigEvent) => void>>(new Set());
  const taskDeletedCallbacksRef = useRef<Set<(event: TaskConfigEvent) => void>>(new Set());
  const documentAddedCallbacksRef = useRef<Set<(event: DocumentChangeEvent) => void>>(new Set());
  const documentUpdatedCallbacksRef = useRef<Set<(event: DocumentChangeEvent) => void>>(new Set());
  const documentRemovedCallbacksRef = useRef<Set<(event: DocumentChangeEvent) => void>>(new Set());
  const bookmarkChangedCallbacksRef = useRef<Set<(event: BookmarkChangeEvent) => void>>(new Set());
  const todoCreatedCallbacksRef = useRef<Set<(event: TodoChangeEvent) => void>>(new Set());
  const todoUpdatedCallbacksRef = useRef<Set<(event: TodoChangeEvent) => void>>(new Set());
  const todoDeletedCallbacksRef = useRef<Set<(event: TodoChangeEvent) => void>>(new Set());
  const notificationCreatedCallbacksRef = useRef<Set<(event: NotificationCreatedEvent) => void>>(new Set());
  const notificationReadCallbacksRef = useRef<Set<(event: NotificationReadEvent) => void>>(new Set());
  const notificationUnreadCallbacksRef = useRef<Set<(event: NotificationReadEvent) => void>>(new Set());
  const notificationsReadAllCallbacksRef = useRef<Set<(event: NotificationsReadAllEvent) => void>>(new Set());
  const notificationDeletedCallbacksRef = useRef<Set<(event: NotificationDeletedEvent) => void>>(new Set());
  const memorySessionCreatedCallbacksRef = useRef<Set<(event: MemorySessionPayload) => void>>(new Set());
  const memorySessionUpdatedCallbacksRef = useRef<Set<(event: MemorySessionPayload) => void>>(new Set());
  const memorySessionDeletedCallbacksRef = useRef<Set<(event: MemorySessionDeletedPayload) => void>>(new Set());
  const memoryProjectAddedCallbacksRef = useRef<Set<(event: MemoryProjectPayload) => void>>(new Set());
  const memoryProjectUpdatedCallbacksRef = useRef<Set<(event: MemoryProjectPayload) => void>>(new Set());
  const memoryProjectDeletedCallbacksRef = useRef<Set<(event: MemoryProjectPayload) => void>>(new Set());
  const feedTopicCreatedCallbacksRef = useRef<Set<(event: FeedTopicEvent) => void>>(new Set());
  const feedTopicDeletedCallbacksRef = useRef<Set<(event: FeedTopicDeletedEvent) => void>>(new Set());
  const feedItemCreatedCallbacksRef = useRef<Set<(event: FeedItemEvent) => void>>(new Set());
  const feedItemUpdatedCallbacksRef = useRef<Set<(event: FeedItemEvent) => void>>(new Set());
  const feedItemDeletedCallbacksRef = useRef<Set<(event: FeedItemDeletedEvent) => void>>(new Set());
  const messageCreatedCallbacksRef = useRef<Set<(event: MessageCreatedEvent) => void>>(new Set());
  const messageUpdatedCallbacksRef = useRef<Set<(event: MessageUpdatedEvent) => void>>(new Set());
  const messageDeletedCallbacksRef = useRef<Set<(event: MessageDeletedEvent) => void>>(new Set());
  const threadDeletedCallbacksRef = useRef<Set<(event: ThreadDeletedEvent) => void>>(new Set());
  const agentCreatedCallbacksRef = useRef<Set<(event: AgentConfigPayload) => void>>(new Set());
  const agentUpdatedCallbacksRef = useRef<Set<(event: AgentConfigPayload) => void>>(new Set());
  const agentDeletedCallbacksRef = useRef<Set<(event: AgentDeletedPayload) => void>>(new Set());
  const agentFileCreatedCallbacksRef = useRef<Set<(event: WorkspaceFilePayload) => void>>(new Set());
  const agentFileUpdatedCallbacksRef = useRef<Set<(event: WorkspaceFilePayload) => void>>(new Set());
  const agentFileDeletedCallbacksRef = useRef<Set<(event: WorkspaceFilePayload) => void>>(new Set());
  const agentFileMovedCallbacksRef = useRef<Set<(event: WorkspaceFileMovedPayload) => void>>(new Set());
  const agentFolderCreatedCallbacksRef = useRef<Set<(event: WorkspaceFolderPayload) => void>>(new Set());
  const agentFolderDeletedCallbacksRef = useRef<Set<(event: WorkspaceFolderPayload) => void>>(new Set());
  const agentFolderMovedCallbacksRef = useRef<Set<(event: WorkspaceFolderMovedPayload) => void>>(new Set());
  const triggerCreatedCallbacksRef = useRef<Set<(event: TriggerConfigEvent) => void>>(new Set());
  const triggerUpdatedCallbacksRef = useRef<Set<(event: TriggerConfigEvent) => void>>(new Set());
  const triggerDeletedCallbacksRef = useRef<Set<(event: TriggerDeletedEvent) => void>>(new Set());

  // Track last processed bookmark event to prevent duplicate processing
  const lastBookmarkEventTimestampRef = useRef<string>('');

  useEffect(() => {
    const url = import.meta.env.VITE_XERRO_API_URL || '';

    // Create socket connection
    const socket = io(url, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Xerro WebSocket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Xerro WebSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Xerro WebSocket] Connection error:', error);
      setIsConnected(false);
    });

    // Available events list
    socket.on('events:list', (events: string[]) => {
      console.log('[Xerro WebSocket] Available events:', events);
    });

    // Agent status events - notify all subscribers
    socket.on('scheduled-tasks:agent-status', (data: AgentStatusEvent) => {
      console.log('[Xerro WebSocket] Agent status:', data.status, data.taskName);
      agentStatusCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in agent status callback:', error);
        }
      });
    });

    // Task configuration events - notify all subscribers
    socket.on('scheduled-tasks:task-created', (data: TaskConfigEvent) => {
      console.log('[Xerro WebSocket] Task created:', data.taskName);
      taskCreatedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in task created callback:', error);
        }
      });
    });

    socket.on('scheduled-tasks:task-updated', (data: TaskConfigEvent) => {
      console.log('[Xerro WebSocket] Task updated:', data.taskName);
      taskUpdatedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in task updated callback:', error);
        }
      });
    });

    socket.on('scheduled-tasks:task-deleted', (data: TaskConfigEvent) => {
      console.log('[Xerro WebSocket] Task deleted:', data.taskName);
      taskDeletedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in task deleted callback:', error);
        }
      });
    });

    // Document events - notify all subscribers
    socket.on('documents:document-added', (data: DocumentChangeEvent) => {
      console.log('[Xerro WebSocket] Document added:', data.path);
      documentAddedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in document added callback:', error);
        }
      });
    });

    socket.on('documents:document-updated', (data: DocumentChangeEvent) => {
      console.log('[Xerro WebSocket] Document updated:', data.path);
      documentUpdatedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in document updated callback:', error);
        }
      });
    });

    socket.on('documents:document-removed', (data: DocumentChangeEvent) => {
      console.log('[Xerro WebSocket] Document removed:', data.path);
      documentRemovedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in document removed callback:', error);
        }
      });
    });

    // Bookmark events - notify all subscribers (deduplicated)
    socket.on('obsidian:bookmark-changed', (data: BookmarkChangeEvent) => {
      console.log('[Xerro WebSocket] Bookmark changed:', data.path, data.changeType);

      // Deduplicate at the WebSocket level before calling any callbacks
      if (data.timestamp === lastBookmarkEventTimestampRef.current) {
        return;
      }

      lastBookmarkEventTimestampRef.current = data.timestamp;

      bookmarkChangedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in bookmark changed callback:', error);
        }
      });
    });

    // Todo events - notify all subscribers
    socket.on('todos:todo-created', (data: TodoChangeEvent) => {
      console.log('[Xerro WebSocket] Todo created:', data.id);
      todoCreatedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in todo created callback:', error);
        }
      });
    });

    socket.on('todos:todo-updated', (data: TodoChangeEvent) => {
      console.log('[Xerro WebSocket] Todo updated:', data.id);
      todoUpdatedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in todo updated callback:', error);
        }
      });
    });

    socket.on('todos:todo-deleted', (data: TodoChangeEvent) => {
      console.log('[Xerro WebSocket] Todo deleted:', data.id);
      todoDeletedCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[Xerro WebSocket] Error in todo deleted callback:', error);
        }
      });
    });

    // Notification events (namespaced by service name: "notifications:")
    socket.on('notifications:notification-created', (data: NotificationCreatedEvent) => {
      console.log('[Xerro WebSocket] Notification created:', data.id);
      notificationCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in notification created callback:', error);
        }
      });
    });

    socket.on('notifications:notification-read', (data: NotificationReadEvent) => {
      console.log('[Xerro WebSocket] Notification read:', data.id);
      notificationReadCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in notification read callback:', error);
        }
      });
    });

    socket.on('notifications:notification-unread', (data: NotificationReadEvent) => {
      console.log('[Xerro WebSocket] Notification unread:', data.id);
      notificationUnreadCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in notification unread callback:', error);
        }
      });
    });

    socket.on('notifications:notifications-read-all', (data: NotificationsReadAllEvent) => {
      console.log('[Xerro WebSocket] All notifications read');
      notificationsReadAllCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in notifications read-all callback:', error);
        }
      });
    });

    socket.on('notifications:notification-deleted', (data: NotificationDeletedEvent) => {
      console.log('[Xerro WebSocket] Notification deleted:', data.id);
      notificationDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in notification deleted callback:', error);
        }
      });
    });

    // Memory events
    socket.on('memory:session-created', (data: MemorySessionPayload) => {
      console.log('[Xerro WebSocket] Memory session created:', data.sessionId);
      memorySessionCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in memory session created callback:', error);
        }
      });
    });

    socket.on('memory:session-updated', (data: MemorySessionPayload) => {
      console.log('[Xerro WebSocket] Memory session updated:', data.sessionId);
      memorySessionUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in memory session updated callback:', error);
        }
      });
    });

    socket.on('memory:session-deleted', (data: MemorySessionDeletedPayload) => {
      console.log('[Xerro WebSocket] Memory session deleted:', data.sessionId);
      memorySessionDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in memory session deleted callback:', error);
        }
      });
    });

    socket.on('memory:project-added', (data: MemoryProjectPayload) => {
      console.log('[Xerro WebSocket] Memory project added:', data.name);
      memoryProjectAddedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in memory project added callback:', error);
        }
      });
    });

    socket.on('memory:project-updated', (data: MemoryProjectPayload) => {
      console.log('[Xerro WebSocket] Memory project updated:', data.name);
      memoryProjectUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in memory project updated callback:', error);
        }
      });
    });

    socket.on('memory:project-deleted', (data: MemoryProjectPayload) => {
      console.log('[Xerro WebSocket] Memory project deleted:', data.name);
      memoryProjectDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in memory project deleted callback:', error);
        }
      });
    });

    // Feed events
    socket.on('feeds:topic-created', (data: FeedTopicEvent) => {
      console.log('[Xerro WebSocket] Feed topic created:', data.topic.name);
      feedTopicCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in feed topic created callback:', error);
        }
      });
    });

    socket.on('feeds:topic-deleted', (data: FeedTopicDeletedEvent) => {
      console.log('[Xerro WebSocket] Feed topic deleted:', data.id);
      feedTopicDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in feed topic deleted callback:', error);
        }
      });
    });

    socket.on('feeds:item-created', (data: FeedItemEvent) => {
      console.log('[Xerro WebSocket] Feed item created:', data.item.title);
      feedItemCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in feed item created callback:', error);
        }
      });
    });

    socket.on('feeds:item-updated', (data: FeedItemEvent) => {
      console.log('[Xerro WebSocket] Feed item updated:', data.item.id);
      feedItemUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in feed item updated callback:', error);
        }
      });
    });

    socket.on('feeds:item-deleted', (data: FeedItemDeletedEvent) => {
      console.log('[Xerro WebSocket] Feed item deleted:', data.id);
      feedItemDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in feed item deleted callback:', error);
        }
      });
    });

    // Message events
    socket.on('messages:message-created', (data: MessageCreatedEvent) => {
      console.log('[Xerro WebSocket] Message created:', data.message.id);
      messageCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in message created callback:', error);
        }
      });
    });

    socket.on('messages:message-updated', (data: MessageUpdatedEvent) => {
      console.log('[Xerro WebSocket] Message updated:', data.message.id);
      messageUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in message updated callback:', error);
        }
      });
    });

    socket.on('messages:message-deleted', (data: MessageDeletedEvent) => {
      console.log('[Xerro WebSocket] Message deleted:', data.id);
      messageDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in message deleted callback:', error);
        }
      });
    });

    socket.on('messages:thread-deleted', (data: ThreadDeletedEvent) => {
      console.log('[Xerro WebSocket] Thread deleted:', data.threadId);
      threadDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in thread deleted callback:', error);
        }
      });
    });

    // Agent events
    socket.on('agents:agent-created', (data: AgentConfigPayload) => {
      console.log('[Xerro WebSocket] Agent created:', data.id);
      agentCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent created callback:', error);
        }
      });
    });

    socket.on('agents:agent-updated', (data: AgentConfigPayload) => {
      console.log('[Xerro WebSocket] Agent updated:', data.id);
      agentUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent updated callback:', error);
        }
      });
    });

    socket.on('agents:agent-deleted', (data: AgentDeletedPayload) => {
      console.log('[Xerro WebSocket] Agent deleted:', data.id);
      agentDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent deleted callback:', error);
        }
      });
    });

    socket.on('agents:file-created', (data: WorkspaceFilePayload) => {
      console.log('[Xerro WebSocket] Agent file created:', data.agentId, data.path);
      agentFileCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent file created callback:', error);
        }
      });
    });

    socket.on('agents:file-updated', (data: WorkspaceFilePayload) => {
      console.log('[Xerro WebSocket] Agent file updated:', data.agentId, data.path);
      agentFileUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent file updated callback:', error);
        }
      });
    });

    socket.on('agents:file-deleted', (data: WorkspaceFilePayload) => {
      console.log('[Xerro WebSocket] Agent file deleted:', data.agentId, data.path);
      agentFileDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent file deleted callback:', error);
        }
      });
    });

    socket.on('agents:file-moved', (data: WorkspaceFileMovedPayload) => {
      console.log('[Xerro WebSocket] Agent file moved:', data.agentId, data.oldPath, '->', data.newPath);
      agentFileMovedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent file moved callback:', error);
        }
      });
    });

    socket.on('agents:folder-created', (data: WorkspaceFolderPayload) => {
      console.log('[Xerro WebSocket] Agent folder created:', data.agentId, data.path);
      agentFolderCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent folder created callback:', error);
        }
      });
    });

    socket.on('agents:folder-deleted', (data: WorkspaceFolderPayload) => {
      console.log('[Xerro WebSocket] Agent folder deleted:', data.agentId, data.path);
      agentFolderDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent folder deleted callback:', error);
        }
      });
    });

    socket.on('agents:folder-moved', (data: WorkspaceFolderMovedPayload) => {
      console.log('[Xerro WebSocket] Agent folder moved:', data.agentId, data.oldPath, '->', data.newPath);
      agentFolderMovedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in agent folder moved callback:', error);
        }
      });
    });

    // Trigger events
    socket.on('triggers:trigger-created', (data: TriggerConfigEvent) => {
      console.log('[Xerro WebSocket] Trigger created:', data.id);
      triggerCreatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in trigger created callback:', error);
        }
      });
    });

    socket.on('triggers:trigger-updated', (data: TriggerConfigEvent) => {
      console.log('[Xerro WebSocket] Trigger updated:', data.id);
      triggerUpdatedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in trigger updated callback:', error);
        }
      });
    });

    socket.on('triggers:trigger-deleted', (data: TriggerDeletedEvent) => {
      console.log('[Xerro WebSocket] Trigger deleted:', data.id);
      triggerDeletedCallbacksRef.current.forEach(callback => {
        try { callback(data); } catch (error) {
          console.error('[Xerro WebSocket] Error in trigger deleted callback:', error);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      socket.close();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  // Subscribe to agent status events
  const subscribeToAgentStatus = useCallback((callback: (event: AgentStatusEvent) => void) => {
    agentStatusCallbacksRef.current.add(callback);
    return () => {
      agentStatusCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to task created events
  const subscribeToTaskCreated = useCallback((callback: (event: TaskConfigEvent) => void) => {
    taskCreatedCallbacksRef.current.add(callback);
    return () => {
      taskCreatedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to task updated events
  const subscribeToTaskUpdated = useCallback((callback: (event: TaskConfigEvent) => void) => {
    taskUpdatedCallbacksRef.current.add(callback);
    return () => {
      taskUpdatedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to task deleted events
  const subscribeToTaskDeleted = useCallback((callback: (event: TaskConfigEvent) => void) => {
    taskDeletedCallbacksRef.current.add(callback);
    return () => {
      taskDeletedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to document added events
  const subscribeToDocumentAdded = useCallback((callback: (event: DocumentChangeEvent) => void) => {
    documentAddedCallbacksRef.current.add(callback);
    return () => {
      documentAddedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to document updated events
  const subscribeToDocumentUpdated = useCallback((callback: (event: DocumentChangeEvent) => void) => {
    documentUpdatedCallbacksRef.current.add(callback);
    return () => {
      documentUpdatedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to document removed events
  const subscribeToDocumentRemoved = useCallback((callback: (event: DocumentChangeEvent) => void) => {
    documentRemovedCallbacksRef.current.add(callback);
    return () => {
      documentRemovedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to bookmark changed events
  const subscribeToBookmarkChanged = useCallback((callback: (event: BookmarkChangeEvent) => void) => {
    bookmarkChangedCallbacksRef.current.add(callback);
    return () => {
      bookmarkChangedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to todo created events
  const subscribeToTodoCreated = useCallback((callback: (event: TodoChangeEvent) => void) => {
    todoCreatedCallbacksRef.current.add(callback);
    return () => {
      todoCreatedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to todo updated events
  const subscribeToTodoUpdated = useCallback((callback: (event: TodoChangeEvent) => void) => {
    todoUpdatedCallbacksRef.current.add(callback);
    return () => {
      todoUpdatedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Subscribe to todo deleted events
  const subscribeToTodoDeleted = useCallback((callback: (event: TodoChangeEvent) => void) => {
    todoDeletedCallbacksRef.current.add(callback);
    return () => {
      todoDeletedCallbacksRef.current.delete(callback);
    };
  }, []);

  const subscribeToNotificationCreated = useCallback((callback: (event: NotificationCreatedEvent) => void) => {
    notificationCreatedCallbacksRef.current.add(callback);
    return () => { notificationCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToNotificationRead = useCallback((callback: (event: NotificationReadEvent) => void) => {
    notificationReadCallbacksRef.current.add(callback);
    return () => { notificationReadCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToNotificationUnread = useCallback((callback: (event: NotificationReadEvent) => void) => {
    notificationUnreadCallbacksRef.current.add(callback);
    return () => { notificationUnreadCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToNotificationsReadAll = useCallback((callback: (event: NotificationsReadAllEvent) => void) => {
    notificationsReadAllCallbacksRef.current.add(callback);
    return () => { notificationsReadAllCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToNotificationDeleted = useCallback((callback: (event: NotificationDeletedEvent) => void) => {
    notificationDeletedCallbacksRef.current.add(callback);
    return () => { notificationDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMemorySessionCreated = useCallback((callback: (event: MemorySessionPayload) => void) => {
    memorySessionCreatedCallbacksRef.current.add(callback);
    return () => { memorySessionCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMemorySessionUpdated = useCallback((callback: (event: MemorySessionPayload) => void) => {
    memorySessionUpdatedCallbacksRef.current.add(callback);
    return () => { memorySessionUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMemorySessionDeleted = useCallback((callback: (event: MemorySessionDeletedPayload) => void) => {
    memorySessionDeletedCallbacksRef.current.add(callback);
    return () => { memorySessionDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMemoryProjectAdded = useCallback((callback: (event: MemoryProjectPayload) => void) => {
    memoryProjectAddedCallbacksRef.current.add(callback);
    return () => { memoryProjectAddedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMemoryProjectUpdated = useCallback((callback: (event: MemoryProjectPayload) => void) => {
    memoryProjectUpdatedCallbacksRef.current.add(callback);
    return () => { memoryProjectUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMemoryProjectDeleted = useCallback((callback: (event: MemoryProjectPayload) => void) => {
    memoryProjectDeletedCallbacksRef.current.add(callback);
    return () => { memoryProjectDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToFeedTopicCreated = useCallback((callback: (event: FeedTopicEvent) => void) => {
    feedTopicCreatedCallbacksRef.current.add(callback);
    return () => { feedTopicCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToFeedTopicDeleted = useCallback((callback: (event: FeedTopicDeletedEvent) => void) => {
    feedTopicDeletedCallbacksRef.current.add(callback);
    return () => { feedTopicDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToFeedItemCreated = useCallback((callback: (event: FeedItemEvent) => void) => {
    feedItemCreatedCallbacksRef.current.add(callback);
    return () => { feedItemCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToFeedItemUpdated = useCallback((callback: (event: FeedItemEvent) => void) => {
    feedItemUpdatedCallbacksRef.current.add(callback);
    return () => { feedItemUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToFeedItemDeleted = useCallback((callback: (event: FeedItemDeletedEvent) => void) => {
    feedItemDeletedCallbacksRef.current.add(callback);
    return () => { feedItemDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMessageCreated = useCallback((callback: (event: MessageCreatedEvent) => void) => {
    messageCreatedCallbacksRef.current.add(callback);
    return () => { messageCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMessageUpdated = useCallback((callback: (event: MessageUpdatedEvent) => void) => {
    messageUpdatedCallbacksRef.current.add(callback);
    return () => { messageUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToMessageDeleted = useCallback((callback: (event: MessageDeletedEvent) => void) => {
    messageDeletedCallbacksRef.current.add(callback);
    return () => { messageDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToThreadDeleted = useCallback((callback: (event: ThreadDeletedEvent) => void) => {
    threadDeletedCallbacksRef.current.add(callback);
    return () => { threadDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentCreated = useCallback((callback: (event: AgentConfigPayload) => void) => {
    agentCreatedCallbacksRef.current.add(callback);
    return () => { agentCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentUpdated = useCallback((callback: (event: AgentConfigPayload) => void) => {
    agentUpdatedCallbacksRef.current.add(callback);
    return () => { agentUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentDeleted = useCallback((callback: (event: AgentDeletedPayload) => void) => {
    agentDeletedCallbacksRef.current.add(callback);
    return () => { agentDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFileCreated = useCallback((callback: (event: WorkspaceFilePayload) => void) => {
    agentFileCreatedCallbacksRef.current.add(callback);
    return () => { agentFileCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFileUpdated = useCallback((callback: (event: WorkspaceFilePayload) => void) => {
    agentFileUpdatedCallbacksRef.current.add(callback);
    return () => { agentFileUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFileDeleted = useCallback((callback: (event: WorkspaceFilePayload) => void) => {
    agentFileDeletedCallbacksRef.current.add(callback);
    return () => { agentFileDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFileMoved = useCallback((callback: (event: WorkspaceFileMovedPayload) => void) => {
    agentFileMovedCallbacksRef.current.add(callback);
    return () => { agentFileMovedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFolderCreated = useCallback((callback: (event: WorkspaceFolderPayload) => void) => {
    agentFolderCreatedCallbacksRef.current.add(callback);
    return () => { agentFolderCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFolderDeleted = useCallback((callback: (event: WorkspaceFolderPayload) => void) => {
    agentFolderDeletedCallbacksRef.current.add(callback);
    return () => { agentFolderDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToAgentFolderMoved = useCallback((callback: (event: WorkspaceFolderMovedPayload) => void) => {
    agentFolderMovedCallbacksRef.current.add(callback);
    return () => { agentFolderMovedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToTriggerCreated = useCallback((callback: (event: TriggerConfigEvent) => void) => {
    triggerCreatedCallbacksRef.current.add(callback);
    return () => { triggerCreatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToTriggerUpdated = useCallback((callback: (event: TriggerConfigEvent) => void) => {
    triggerUpdatedCallbacksRef.current.add(callback);
    return () => { triggerUpdatedCallbacksRef.current.delete(callback); };
  }, []);

  const subscribeToTriggerDeleted = useCallback((callback: (event: TriggerDeletedEvent) => void) => {
    triggerDeletedCallbacksRef.current.add(callback);
    return () => { triggerDeletedCallbacksRef.current.delete(callback); };
  }, []);

  const value: XerroWebSocketContextValue = {
    isConnected,
    subscribeToAgentStatus,
    subscribeToTaskCreated,
    subscribeToTaskUpdated,
    subscribeToTaskDeleted,
    subscribeToDocumentAdded,
    subscribeToDocumentUpdated,
    subscribeToDocumentRemoved,
    subscribeToBookmarkChanged,
    subscribeToTodoCreated,
    subscribeToTodoUpdated,
    subscribeToTodoDeleted,
    subscribeToNotificationCreated,
    subscribeToNotificationRead,
    subscribeToNotificationUnread,
    subscribeToNotificationsReadAll,
    subscribeToNotificationDeleted,
    subscribeToMemorySessionCreated,
    subscribeToMemorySessionUpdated,
    subscribeToMemorySessionDeleted,
    subscribeToMemoryProjectAdded,
    subscribeToMemoryProjectUpdated,
    subscribeToMemoryProjectDeleted,
    subscribeToFeedTopicCreated,
    subscribeToFeedTopicDeleted,
    subscribeToFeedItemCreated,
    subscribeToFeedItemUpdated,
    subscribeToFeedItemDeleted,
    subscribeToMessageCreated,
    subscribeToMessageUpdated,
    subscribeToMessageDeleted,
    subscribeToThreadDeleted,
    subscribeToAgentCreated,
    subscribeToAgentUpdated,
    subscribeToAgentDeleted,
    subscribeToAgentFileCreated,
    subscribeToAgentFileUpdated,
    subscribeToAgentFileDeleted,
    subscribeToAgentFileMoved,
    subscribeToAgentFolderCreated,
    subscribeToAgentFolderDeleted,
    subscribeToAgentFolderMoved,
    subscribeToTriggerCreated,
    subscribeToTriggerUpdated,
    subscribeToTriggerDeleted,
  };

  return (
    <XerroWebSocketContext.Provider value={value}>
      {children}
    </XerroWebSocketContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useXerroWebSocketContext() {
  const context = useContext(XerroWebSocketContext);
  if (context === undefined) {
    throw new Error('useXerroWebSocketContext must be used within XerroWebSocketProvider');
  }
  return context;
}
