import { toast } from "sonner";
import type { ChatSession, ChatSessionConfig, XerroChatMessage, ChatSessionSearchResult } from "@/types/xerroChat";

const XERRO_SERVICE_URL = import.meta.env.VITE_XERRO_SERVICE_URL || "http://localhost:9205";

class ChatService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${XERRO_SERVICE_URL}/api/v1/chat`;
  }

  async listSessions(): Promise<{ sessions: ChatSession[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`);
      if (!response.ok) throw new Error(`Failed to list sessions: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to list sessions";
      toast.error(message);
      throw error;
    }
  }

  async createSession(name: string, config?: ChatSessionConfig): Promise<ChatSession> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
      if (!response.ok) throw new Error(`Failed to create session: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create session";
      toast.error(message);
      throw error;
    }
  }

  async getSession(id: string): Promise<ChatSession> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${id}`);
      if (!response.ok) throw new Error(`Failed to get session: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get session";
      toast.error(message);
      throw error;
    }
  }

  async updateSession(
    id: string,
    updates: { name?: string; config?: ChatSessionConfig }
  ): Promise<ChatSession> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(`Failed to update session: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update session";
      toast.error(message);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<{ success: true }> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Failed to delete session: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete session";
      toast.error(message);
      throw error;
    }
  }

  async getMessages(
    sessionId: string,
    limit?: number,
    before?: string
  ): Promise<{ messages: XerroChatMessage[] }> {
    try {
      const params = new URLSearchParams();
      if (limit !== undefined) params.append("limit", String(limit));
      if (before) params.append("before", before);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages${qs}`);
      if (!response.ok) throw new Error(`Failed to get messages: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get messages";
      toast.error(message);
      throw error;
    }
  }

  async sendMessage(
    sessionId: string,
    content: string,
    signal: AbortSignal,
    planMode?: boolean,
    files?: File[],
    attachedImages?: string[]
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    let body: BodyInit;
    let headers: Record<string, string> = {};

    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append("content", content);
      if (planMode) formData.append("planMode", "true");
      for (const file of files) {
        formData.append("files", file);
      }
      if (attachedImages && attachedImages.length > 0) {
        formData.append("imageData", JSON.stringify(attachedImages));
      }
      body = formData;
      // Don't set Content-Type — browser sets it with boundary
    } else {
      const json: Record<string, unknown> = { content };
      if (planMode) json.planMode = true;
      body = JSON.stringify(json);
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages`, {
      method: "POST",
      headers,
      body,
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to send message (${response.status}): ${text}`);
    }

    if (!response.body) {
      throw new Error("No response body for SSE stream");
    }

    return response.body.getReader();
  }

  async searchSessions(
    query: string,
    limit = 10
  ): Promise<{ results: ChatSessionSearchResult[]; count: number }> {
    try {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      const response = await fetch(`${this.baseUrl}/sessions/search?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to search sessions: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to search sessions";
      toast.error(message);
      throw error;
    }
  }

  async cancelMessage(sessionId: string): Promise<{ success: true; executionId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages/cancel`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Failed to cancel: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel message";
      toast.error(message);
      throw error;
    }
  }
}

export const chatService = new ChatService();
