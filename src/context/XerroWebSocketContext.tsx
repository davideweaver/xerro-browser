import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentStatusEvent, DocumentChangeEvent, TaskConfigEvent, BookmarkChangeEvent, TodoChangeEvent } from '@/types/websocket';
import type { NotificationCreatedEvent, NotificationReadEvent, NotificationsReadAllEvent } from '@/types/notifications';

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

  // Track last processed bookmark event to prevent duplicate processing
  const lastBookmarkEventTimestampRef = useRef<string>('');

  useEffect(() => {
    const url = import.meta.env.VITE_XERRO_SERVICE_URL || 'http://localhost:9205';

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
