import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  FeedTopic,
  FeedTopicsResult,
  FeedItemListResult,
  FeedItem,
  FeedHomeResult,
  CreateFeedItemInput,
} from "@/types/feeds";

class FeedsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  async listTopics(): Promise<FeedTopicsResult> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/topics`);
      if (!response.ok) throw new Error(`Failed to fetch topics: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch topics", variant: "destructive" });
      throw error;
    }
  }

  async createTopic(name: string): Promise<FeedTopic> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(`Failed to create topic: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create topic", variant: "destructive" });
      throw error;
    }
  }

  async deleteTopic(id: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/topics/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Failed to delete topic: ${response.statusText}`);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete topic", variant: "destructive" });
      throw error;
    }
  }

  async listItems(filter: { topicId?: string; favorited?: boolean; includeArchived?: boolean; limit?: number; offset?: number } = {}): Promise<FeedItemListResult> {
    try {
      const params = new URLSearchParams();
      if (filter.topicId) params.append("topicId", filter.topicId);
      if (filter.favorited !== undefined) params.append("favorited", String(filter.favorited));
      if (filter.includeArchived) params.append("includeArchived", "true");
      if (filter.limit !== undefined) params.append("limit", String(filter.limit));
      if (filter.offset !== undefined) params.append("offset", String(filter.offset));
      const qs = params.toString();
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/items${qs ? `?${qs}` : ""}`);
      if (!response.ok) throw new Error(`Failed to fetch items: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch items", variant: "destructive" });
      throw error;
    }
  }

  async createItem(input: CreateFeedItemInput): Promise<FeedItem> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`Failed to create item: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create item", variant: "destructive" });
      throw error;
    }
  }

  async toggleFavorite(id: string): Promise<FeedItem> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/items/${id}/favorite`, { method: "PATCH" });
      if (!response.ok) throw new Error(`Failed to toggle favorite: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to toggle favorite", variant: "destructive" });
      throw error;
    }
  }

  async archiveItem(id: string): Promise<FeedItem> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/items/${id}/archive`, { method: "PATCH" });
      if (!response.ok) throw new Error(`Failed to archive item: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to archive item", variant: "destructive" });
      throw error;
    }
  }

  async unarchiveItem(id: string): Promise<FeedItem> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/items/${id}/unarchive`, { method: "PATCH" });
      if (!response.ok) throw new Error(`Failed to unarchive item: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to unarchive item", variant: "destructive" });
      throw error;
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/items/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Failed to delete item: ${response.statusText}`);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete item", variant: "destructive" });
      throw error;
    }
  }

  async getHome(perTopic?: number): Promise<FeedHomeResult> {
    try {
      const qs = perTopic ? `?perTopic=${perTopic}` : "";
      const response = await apiFetch(`${this.baseUrl}/api/v1/feeds/home${qs}`);
      if (!response.ok) throw new Error(`Failed to fetch home feed: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch home feed", variant: "destructive" });
      throw error;
    }
  }
}

export const feedsService = new FeedsService();
