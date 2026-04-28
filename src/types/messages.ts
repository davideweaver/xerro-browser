export interface Message {
  id: string;
  threadId: string;
  inReplyTo?: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  subject: string;
  body: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface MessageThread {
  threadId: string;
  subject: string;
  latestMessage: Message;
  unreadCount: number;
  messageCount: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  unreadCount: number;
}

export interface MessageThreadListResponse {
  threads: MessageThread[];
  total: number;
}

export interface MessageCreatedEvent {
  message: Message;
  unreadCount: number;
}

export interface MessageUpdatedEvent {
  message: Message;
  unreadCount: number;
}

export interface MessageDeletedEvent {
  id: string;
}

export interface ThreadDeletedEvent {
  threadId: string;
  unreadCount: number;
}
