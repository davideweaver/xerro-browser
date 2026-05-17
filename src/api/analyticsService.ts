import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  AnalyticsSummary,
  AnalyticsWindow,
  CostByAgent,
  TimeSeriesPoint,
  TimeseriesMetric,
} from "@/types/analytics";

class AnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
  }

  async getSummary(window: AnalyticsWindow, agentId?: string): Promise<AnalyticsSummary> {
    try {
      const params = new URLSearchParams({ window });
      if (agentId) params.append("agent_id", agentId);
      const response = await apiFetch(`${this.baseUrl}/api/v1/analytics/summary?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch analytics";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getCostByAgent(window: AnalyticsWindow): Promise<CostByAgent[]> {
    try {
      const params = new URLSearchParams({ window });
      const response = await apiFetch(`${this.baseUrl}/api/v1/analytics/cost-by-agent?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch cost by agent: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch cost by agent";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }

  async getTimeseries(
    metric: TimeseriesMetric,
    window: AnalyticsWindow,
    agentId?: string
  ): Promise<TimeSeriesPoint[]> {
    try {
      const params = new URLSearchParams({ metric, window });
      if (agentId) params.append("agent_id", agentId);
      const response = await apiFetch(`${this.baseUrl}/api/v1/analytics/timeseries?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch timeseries: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch timeseries";
      toast({ title: "Error", description: message, variant: "destructive" });
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
