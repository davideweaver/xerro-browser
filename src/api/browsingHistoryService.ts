import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  TimelineResult,
  SearchResponse,
  DomainsResponse,
  TopicsResponse,
  InterestsResponse,
  SearchesResponse,
  BrowsingStats,
} from "@/types/browsing";

class BrowsingHistoryService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await apiFetch(`${this.baseUrl}${endpoint}`, options);
    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const body = await response.json();
        message = body.error || body.message || message;
      } catch {
        // ignore
      }
      toast({ title: "Error", description: message, variant: "destructive" });
      throw new Error(message);
    }
    return (await response.json()) as T;
  }

  async getTimeline(
    params: { peer?: string; limit?: number; offset?: number; start?: number; end?: number } = {}
  ): Promise<TimelineResult> {
    const qs = new URLSearchParams();
    if (params.peer) qs.append("peer", params.peer);
    if (params.start !== undefined) qs.append("start", String(params.start));
    if (params.end !== undefined) qs.append("end", String(params.end));
    if (params.limit !== undefined) qs.append("limit", String(params.limit));
    if (params.offset !== undefined) qs.append("offset", String(params.offset));
    const q = qs.toString();
    return this.request<TimelineResult>(`/api/v1/browsing-history/timeline${q ? `?${q}` : ""}`);
  }

  async search(query: string, limit = 20): Promise<SearchResponse> {
    return this.request<SearchResponse>(`/api/v1/browsing-history/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });
  }

  async getDomains(days = 7, limit = 20): Promise<DomainsResponse> {
    return this.request<DomainsResponse>(`/api/v1/browsing-history/domains?days=${days}&limit=${limit}`);
  }

  async getTopics(days = 7): Promise<TopicsResponse> {
    return this.request<TopicsResponse>(`/api/v1/browsing-history/topics?days=${days}`);
  }

  async getInterests(): Promise<InterestsResponse> {
    return this.request<InterestsResponse>(`/api/v1/browsing-history/interests`);
  }

  async getSearches(days = 7, limit = 20): Promise<SearchesResponse> {
    return this.request<SearchesResponse>(`/api/v1/browsing-history/searches?days=${days}&limit=${limit}`);
  }

  async getStats(days = 7): Promise<BrowsingStats> {
    return this.request<BrowsingStats>(`/api/v1/browsing-history/stats?days=${days}`);
  }

  async triggerCapture(): Promise<unknown> {
    return this.request(`/api/v1/browsing-history/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  }
}

export const browsingHistoryService = new BrowsingHistoryService();
