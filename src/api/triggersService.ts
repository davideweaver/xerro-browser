import { apiFetch } from "@/lib/apiFetch";
import type {
  TriggerSubscription,
  CreateTriggerInput,
  UpdateTriggerInput,
  ListTriggersResponse,
  TriggerTypesResponse,
} from "@/types/triggers";

class TriggersService {
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

  async listTriggers(): Promise<ListTriggersResponse> {
    return this.request("/api/v1/triggers");
  }

  async createTrigger(input: CreateTriggerInput): Promise<TriggerSubscription> {
    return this.request("/api/v1/triggers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async updateTrigger(id: string, input: UpdateTriggerInput): Promise<TriggerSubscription> {
    return this.request(`/api/v1/triggers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  async deleteTrigger(id: string): Promise<void> {
    await this.request(`/api/v1/triggers/${id}`, { method: "DELETE" });
  }

  async getTriggerTypes(): Promise<TriggerTypesResponse> {
    return this.request("/api/v1/triggers/types");
  }
}

export const triggersService = new TriggersService();
