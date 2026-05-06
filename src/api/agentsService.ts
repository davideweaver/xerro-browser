import { apiFetch } from "@/lib/apiFetch";
import type {
  Agent,
  ListAgentsResponse,
  WorkspaceListing,
  WorkspaceFileContent,
} from "@/types/agents";
import type { TaskExecution } from "@/types/agentTasks";

export interface CreateAgentInput {
  name: string;
  description?: string;
  workspace?: string;
  timeoutMs?: number;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  timeoutMs?: number;
}

class AgentsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await apiFetch(`${this.baseUrl}${path}`, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Agent CRUD ──────────────────────────────────────────────────────────────

  async listAgents(): Promise<ListAgentsResponse> {
    return this.request("/api/v1/agents");
  }

  async createAgent(input: CreateAgentInput): Promise<Agent> {
    return this.request("/api/v1/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request(`/api/v1/agents/${id}`);
  }

  async deleteAgent(id: string): Promise<void> {
    await this.request(`/api/v1/agents/${id}`, { method: "DELETE" });
  }

  async updateAgent(id: string, input: UpdateAgentInput): Promise<Agent> {
    return this.request(`/api/v1/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async runAgent(id: string): Promise<{ fired: boolean; taskId: string }> {
    return this.request(`/api/v1/agents/${id}/run`, { method: "POST" });
  }

  async getHistory(id: string, limit = 20): Promise<{ executions: TaskExecution[] }> {
    return this.request(`/api/v1/agents/${id}/history?limit=${limit}`);
  }

  async getAllHistory(limit = 50): Promise<{ executions: TaskExecution[] }> {
    return this.request(`/api/v1/agents/history?limit=${limit}`);
  }

  async clearAllHistory(): Promise<{ cleared: number }> {
    return this.request(`/api/v1/agents/history`, { method: "DELETE" });
  }

  async deleteExecution(executionId: string, agentId: string): Promise<{ deleted: boolean }> {
    return this.request(
      `/api/v1/agents/history/${executionId}?agentId=${encodeURIComponent(agentId)}`,
      { method: "DELETE" }
    );
  }

  // ── Workspace Files ─────────────────────────────────────────────────────────

  async listFiles(id: string, folder?: string): Promise<WorkspaceListing> {
    const qs = folder ? `?folder=${encodeURIComponent(folder)}` : "";
    return this.request(`/api/v1/agents/${id}/files${qs}`);
  }

  async viewFile(id: string, path: string): Promise<WorkspaceFileContent> {
    return this.request(`/api/v1/agents/${id}/files/view?path=${encodeURIComponent(path)}`);
  }

  async createFile(id: string, path: string, content: string): Promise<WorkspaceFileContent> {
    return this.request(`/api/v1/agents/${id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
  }

  async updateFile(id: string, path: string, content: string): Promise<WorkspaceFileContent> {
    return this.request(`/api/v1/agents/${id}/files?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async moveFile(id: string, path: string, newPath: string): Promise<WorkspaceFileContent> {
    return this.request(`/api/v1/agents/${id}/files?path=${encodeURIComponent(path)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPath }),
    });
  }

  async deleteFile(id: string, path: string): Promise<void> {
    await this.request(`/api/v1/agents/${id}/files?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  async createFolder(id: string, path: string): Promise<void> {
    await this.request(`/api/v1/agents/${id}/files/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  async renameFolder(id: string, path: string, newPath: string): Promise<{ path: string }> {
    return this.request(`/api/v1/agents/${id}/files/folders?path=${encodeURIComponent(path)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPath }),
    });
  }

  async deleteFolder(id: string, path: string): Promise<void> {
    await this.request(`/api/v1/agents/${id}/files/folders?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }
}

export const agentsService = new AgentsService();
