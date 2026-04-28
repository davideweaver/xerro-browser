import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  Message,
  MessageListResponse,
  MessageThreadListResponse,
} from "@/types/messages";

interface SendMessageInput {
  toId: string;
  toName: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}

class MessagesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  async listInbox(opts: { limit?: number; offset?: number } = {}): Promise<MessageListResponse> {
    try {
      const params = new URLSearchParams({ view: "inbox" });
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.offset !== undefined) params.set("offset", String(opts.offset));
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch inbox: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch inbox";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async listSent(opts: { limit?: number; offset?: number } = {}): Promise<MessageListResponse> {
    try {
      const params = new URLSearchParams({ view: "sent" });
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.offset !== undefined) params.set("offset", String(opts.offset));
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch sent: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch sent messages";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async listThreads(): Promise<MessageThreadListResponse> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/threads`);
      if (!response.ok) throw new Error(`Failed to fetch threads: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch threads";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getThread(threadId: string): Promise<Message[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/threads/${threadId}`);
      if (!response.ok) throw new Error(`Failed to fetch thread: ${response.statusText}`);
      const data = await response.json();
      // Handle both array response and wrapped { messages: [...] } response
      return Array.isArray(data) ? data : (data.messages ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch thread";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getMessage(id: string): Promise<Message> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch message: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch message";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromId: "user",
          fromName: "Dave",
          ...input,
        }),
      });
      if (!response.ok) throw new Error(`Failed to send message: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async replyToMessage(id: string, body: string): Promise<Message> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: "user", fromName: "Dave", body }),
      });
      if (!response.ok) throw new Error(`Failed to reply: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reply";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async markRead(id: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/${id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error(`Failed to mark as read: ${response.statusText}`);
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  }

  async markUnread(id: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/${id}/unread`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error(`Failed to mark as unread: ${response.statusText}`);
    } catch (error) {
      console.error("Failed to mark message as unread:", error);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/read-all`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error(`Failed to mark all as read: ${response.statusText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to mark all as read";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/threads/${threadId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Failed to delete thread: ${response.statusText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete thread";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Failed to delete message: ${response.statusText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete message";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const params = new URLSearchParams({ view: "inbox", limit: "0" });
      const response = await apiFetch(`${this.baseUrl}/api/v1/messages?${params}`);
      if (!response.ok) return 0;
      const data: MessageListResponse = await response.json();
      return data.unreadCount;
    } catch {
      return 0;
    }
  }
}

export const messagesService = new MessagesService();
