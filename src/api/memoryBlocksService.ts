import { toast } from "@/hooks/use-toast";
import type {
  MemoryBlockListResponse,
  MemoryBlockDetail,
  MemoryBlockUpdateResponse,
  MemoryBlockSearchResponse,
  MemoryStats,
} from "@/types/memoryBlocks";

class MemoryBlocksService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_XERRO_SERVICE_URL || "http://localhost:9205";
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async listBlocks(
    directory?: string,
    depth?: number
  ): Promise<MemoryBlockListResponse> {
    const params = new URLSearchParams();
    if (directory) params.append("directory", directory);
    if (depth !== undefined) params.append("depth", depth.toString());
    const query = params.toString();
    return this.fetch<MemoryBlockListResponse>(
      `/api/v1/memory/blocks${query ? `?${query}` : ""}`
    );
  }

  async getBlock(label: string): Promise<MemoryBlockDetail> {
    return this.fetch<MemoryBlockDetail>(`/api/v1/memory/blocks/${label}`);
  }

  async updateBlock(
    label: string,
    content: string,
    description?: string
  ): Promise<MemoryBlockUpdateResponse> {
    const body: { label: string; content: string; description?: string } = {
      label,
      content,
    };
    if (description !== undefined) {
      body.description = description;
    }
    return this.fetch<MemoryBlockUpdateResponse>("/api/v1/memory/update", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async searchBlocks(
    query: string,
    directories?: string[],
    limit = 10
  ): Promise<MemoryBlockSearchResponse> {
    return this.fetch<MemoryBlockSearchResponse>("/api/v1/memory/search", {
      method: "POST",
      body: JSON.stringify({ query, directories, limit }),
    });
  }

  async getStats(): Promise<MemoryStats> {
    return this.fetch<MemoryStats>("/api/v1/memory/stats");
  }
}

export const memoryBlocksService = new MemoryBlocksService();
