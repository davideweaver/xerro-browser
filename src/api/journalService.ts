import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import { memoryBlocksService } from "@/api/memoryBlocksService";
import type { JournalListResponse, JournalQueryOptions } from "@/types/journal";
import type { MemoryBlockDetail } from "@/types/memoryBlocks";

class JournalService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await apiFetch(url, {
        headers: { "Content-Type": "application/json" },
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

      return response.json() as Promise<T>;
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

  async listEntries(options: JournalQueryOptions = {}): Promise<JournalListResponse> {
    const params = new URLSearchParams();
    if (options.kind) params.append("kind", options.kind);
    if (options.after) params.append("after", options.after);
    if (options.before) params.append("before", options.before);
    const query = params.toString();
    return this.fetch<JournalListResponse>(
      `/api/v1/memory/journal${query ? `?${query}` : ""}`
    );
  }

  async getEntry(label: string): Promise<MemoryBlockDetail> {
    return memoryBlocksService.getBlock(label);
  }
}

export const journalService = new JournalService();
