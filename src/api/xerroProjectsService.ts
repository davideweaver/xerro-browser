import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  XerroProject,
  XerroProjectActivity,
  XerroProjectListResponse,
  XerroSession,
  XerroSessionListResponse,
  XerroMessageListResponse,
  XerroMemoryBlock,
} from "@/types/xerroProjects";

class XerroProjectsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
    if (!this.baseUrl) {
      console.warn(
        "VITE_XERRO_API_URL not configured. Projects may not work."
      );
    }
  }

  async listProjects(params?: {
    limit?: number;
    cursor?: string;
    q?: string; // name filter — maps to ?q= on the API
    after?: string; // ISO timestamp — only return projects with lastTurnAt > after
  }): Promise<XerroProjectListResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) query.append("limit", String(params.limit));
      if (params?.cursor) query.append("cursor", params.cursor);
      if (params?.q) query.append("q", params.q);
      if (params?.after) query.append("after", params.after);

      const url = `${this.baseUrl}/api/v1/projects/${query.toString() ? `?${query.toString()}` : ""}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();
      // API returns { projects, total, hasMore, nextCursor }
      const items: XerroProject[] = data.projects ?? data.items ?? (Array.isArray(data) ? data : []);
      return {
        items,
        total: data.total ?? items.length,
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch projects";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getProject(projectName: string): Promise<XerroProject | null> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/projects/${encodeURIComponent(projectName)}`
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to fetch project: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch project";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getProjectActivity(projectName: string): Promise<XerroProjectActivity> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/projects/${encodeURIComponent(projectName)}/activity`
      );
      if (!response.ok) throw new Error(`Failed to fetch project activity: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch project activity";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async listSessions(params?: {
    projectName?: string;
    limit?: number;
    cursor?: string;
    hasDescription?: boolean;
    order?: "asc" | "desc";
    after?: string;
    before?: string;
    startedAfter?: string;
    startedBefore?: string;
  }): Promise<XerroSessionListResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.projectName) query.append("projectName", params.projectName);
      if (params?.limit !== undefined) query.append("limit", String(params.limit));
      if (params?.cursor) query.append("cursor", params.cursor);
      if (params?.hasDescription !== undefined)
        query.append("hasDescription", String(params.hasDescription));
      if (params?.order) query.append("order", params.order);
      if (params?.after) query.append("after", params.after);
      if (params?.before) query.append("before", params.before);
      if (params?.startedAfter) query.append("startedAfter", params.startedAfter);
      if (params?.startedBefore) query.append("startedBefore", params.startedBefore);

      const url = `${this.baseUrl}/api/v1/sessions/${query.toString() ? `?${query.toString()}` : ""}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }

      const data = await response.json();
      const sessions: XerroSession[] =
        data.sessions ?? (Array.isArray(data) ? data : []);
      return {
        sessions,
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch sessions";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getSessionMessages(
    sessionId: string,
    params?: { limit?: number; cursor?: string; order?: "asc" | "desc" }
  ): Promise<XerroMessageListResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) query.append("limit", String(params.limit));
      if (params?.cursor) query.append("cursor", params.cursor);
      if (params?.order) query.append("order", params.order);

      const url = `${this.baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}/messages${query.toString() ? `?${query.toString()}` : ""}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch session messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch session messages";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async deleteProject(projectName: string): Promise<{ ok: boolean }> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/projects/${encodeURIComponent(projectName)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Project deleted",
        description: "The project has been permanently deleted",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete project";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async listMemoryBlocks(directory: string): Promise<XerroMemoryBlock[]> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/memory/blocks?directory=${encodeURIComponent(directory)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to list memory blocks: ${response.statusText}`);
      }

      const data = await response.json();
      // Response is { blocks: BlockEntry[], count } — map to XerroMemoryBlock shape
      return (data.blocks ?? [])
        .filter((b: { isFolder: boolean }) => !b.isFolder)
        .map((b: {
          label: string; path: string;
          description: string; limit: number | null; lines: number | null;
        }) => ({
          label: b.label,
          path: b.path,
          frontmatter: { description: b.description, limit: b.limit ?? 2000 },
          content: "", // loaded lazily via getMemoryBlock
          totalLines: b.lines ?? 0,
        }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list memory blocks";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getMemoryBlock(label: string): Promise<XerroMemoryBlock | null> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/memory/blocks/${encodeURIComponent(label)}`
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to get memory block: ${response.statusText}`);
      return await response.json();
    } catch {
      return null;
    }
  }

  async getSession(sessionId: string): Promise<XerroSession | null> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}`
      );
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async getSessionSummary(sessionId: string): Promise<string | null> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}/summary`
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to fetch session summary: ${response.statusText}`);
      return await response.text();
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<{ ok: boolean }> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete session";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }
}

export const xerroProjectsService = new XerroProjectsService();
