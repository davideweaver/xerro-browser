import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  SystemHealth,
  ServiceListResponse,
  LogResponse,
  LogQueryParams,
  RestartServiceResponse,
} from "@/types/xerroService";

class XerroService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_SERVICE_URL || "http://localhost:9205";
    if (!this.baseUrl) {
      console.warn(
        "VITE_XERRO_SERVICE_URL not configured. System monitoring may not work."
      );
    }
  }

  async getHealth(): Promise<SystemHealth> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/health`);

      if (!response.ok) {
        throw new Error(`Failed to fetch health: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch health status";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async listServices(): Promise<ServiceListResponse> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/services`);

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch services";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async restartService(serviceName: string): Promise<RestartServiceResponse> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/services/${serviceName}/restart`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to restart service: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Service restarted",
        description: result.message || `${serviceName} has been restarted`,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restart service";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getLogs(params?: LogQueryParams): Promise<LogResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.service) queryParams.append("service", params.service);
      if (params?.level) queryParams.append("level", params.level);
      if (params?.limit) queryParams.append("limit", String(params.limit));
      if (params?.since) queryParams.append("since", params.since);

      const url = `${this.baseUrl}/api/v1/logs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch logs";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const xerroService = new XerroService();
