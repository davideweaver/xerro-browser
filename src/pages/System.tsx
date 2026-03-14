import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { xerroService } from "@/api/xerroService";
import { llamacppAdminService } from "@/api/llamacppAdminService";
import Container from "@/components/container/Container";
import { ServiceStatusCard } from "@/components/system/ServiceStatusCard";
import { Activity, Server } from "lucide-react";

export default function System() {
  const navigate = useNavigate();

  // Poll for xerro service health
  const { data: xerroHealth, isLoading: isLoadingXerro } = useQuery({
    queryKey: ["system-xerro-health"],
    queryFn: () => xerroService.getHealth(),
    refetchInterval: 10000, // 10 seconds
    refetchIntervalInBackground: false,
    retry: false,
  });

  // Poll for llamacpp admin status
  const { data: llamacppStatus, isLoading: isLoadingLlamacpp } = useQuery({
    queryKey: ["system-llamacpp-status"],
    queryFn: () => llamacppAdminService.getSystemStatus(),
    refetchInterval: 10000, // 10 seconds
    refetchIntervalInBackground: false,
    retry: false,
  });

  // Prepare xerro metrics
  const xerroMetrics = xerroHealth
    ? [
        {
          label: "Services",
          value: Object.keys(xerroHealth.services || {}).length,
        },
        {
          label: "Healthy",
          value: Object.values(xerroHealth.services || {}).filter(
            (s) => s.healthy
          ).length,
        },
      ]
    : [];

  // Prepare llamacpp metrics
  const llamacppMetrics = llamacppStatus
    ? [
        {
          label: "Servers",
          value: llamacppStatus.servers?.total || 0,
        },
        {
          label: "Running",
          value: llamacppStatus.servers?.running || 0,
        },
        {
          label: "Models",
          value: llamacppStatus.models?.total || 0,
        },
      ]
    : [];

  return (
    <Container
      title="Overview"
      description="Backend service monitoring and control"
    >
      <div className="space-y-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceStatusCard
            title="Xerro Service"
            icon={Activity}
            status={
              xerroHealth?.healthy
                ? "healthy"
                : xerroHealth
                  ? "unhealthy"
                  : "unknown"
            }
            metrics={xerroMetrics}
            actionButton={{
              label: "View Details",
              onClick: () => navigate("/system/xerro-service"),
            }}
            isLoading={isLoadingXerro}
          />

          <ServiceStatusCard
            title="Llamacpp Admin"
            icon={Server}
            status="healthy"
            metrics={llamacppMetrics}
            actionButton={{
              label: "Manage Servers",
              onClick: () => navigate("/system/llamacpp-servers"),
            }}
            isLoading={isLoadingLlamacpp}
          />
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate("/system/llamacpp-models")}>
            <h3 className="font-medium mb-1">Models</h3>
            <p className="text-sm text-muted-foreground">
              View available LLM models
            </p>
          </div>

          <div className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate("/system/llamacpp-router")}>
            <h3 className="font-medium mb-1">Router</h3>
            <p className="text-sm text-muted-foreground">
              Manage LLM request routing
            </p>
          </div>

          <div className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate("/system/logs")}>
            <h3 className="font-medium mb-1">System Logs</h3>
            <p className="text-sm text-muted-foreground">
              View service logs and events
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
