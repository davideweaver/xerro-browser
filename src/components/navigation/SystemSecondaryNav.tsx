import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { xerroService } from "@/api/xerroService";
import { llamacppAdminService } from "@/api/llamacppAdminService";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import {
  SecondaryNavItemTitle,
} from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import {
  LayoutDashboard,
  Activity,
  Server,
  Database,
  Router as RouterIcon,
} from "lucide-react";

interface SystemSecondaryNavProps {
  onNavigate: (path: string) => void;
  onItemSelect?: (path: string) => void; // Optional: for user clicks that should close sidebar
}

export function SystemSecondaryNav({
  onNavigate,
  onItemSelect,
}: SystemSecondaryNavProps) {
  const location = useLocation();

  // Poll for xerro service health
  const { data: xerroHealth } = useQuery({
    queryKey: ["system-xerro-health"],
    queryFn: () => xerroService.getHealth(),
    refetchInterval: 10000, // 10 seconds
    refetchIntervalInBackground: false,
    retry: false,
  });

  // Poll for llamacpp admin health
  const { data: llamacppHealth } = useQuery({
    queryKey: ["system-llamacpp-health"],
    queryFn: () => llamacppAdminService.getHealth(),
    refetchInterval: 10000, // 10 seconds
    refetchIntervalInBackground: false,
    retry: false,
  });

  const handleNavigation = (path: string) => {
    if (onItemSelect) {
      onItemSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Helper to get status indicator color
  const getStatusColor = (status?: string): string => {
    if (!status) return "bg-muted";
    if (status === "healthy") return "bg-green-500";
    if (status === "unhealthy") return "bg-red-500";
    return "bg-yellow-500";
  };

  // Derive status from xerro health response
  const xerroStatus = xerroHealth?.healthy ? "healthy" : xerroHealth ? "unhealthy" : undefined;

  return (
    <SecondaryNavContainer title="Settings">
      {/* Overview Section */}
      <div className="px-4 pb-4 space-y-1">
        <SecondaryNavItem
          isActive={isActive("/system")}
          onClick={() => handleNavigation("/system")}
        >
          <div className="flex items-center gap-2 w-full">
            <LayoutDashboard className="h-4 w-4" />
            <SecondaryNavItemTitle>Overview</SecondaryNavItemTitle>
          </div>
        </SecondaryNavItem>
      </div>

      {/* Xerro Service Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className={`h-2 w-2 rounded-full ${getStatusColor(xerroStatus)}`} />
          Xerro Service
        </div>
        <div className="space-y-1">
          <SecondaryNavItem
            isActive={isActive("/system/xerro-service")}
            onClick={() => handleNavigation("/system/xerro-service")}
          >
            <div className="flex items-center gap-2 w-full">
              <Activity className="h-4 w-4" />
              <SecondaryNavItemTitle>Status</SecondaryNavItemTitle>
            </div>
          </SecondaryNavItem>
        </div>
      </div>

      {/* Llamacpp Admin Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className={`h-2 w-2 rounded-full ${getStatusColor(llamacppHealth?.status)}`} />
          Llamacpp Admin
        </div>
        <div className="space-y-1">
          <SecondaryNavItem
            isActive={isActive("/system/llamacpp-servers")}
            onClick={() => handleNavigation("/system/llamacpp-servers")}
          >
            <div className="flex items-center gap-2 w-full">
              <Server className="h-4 w-4" />
              <SecondaryNavItemTitle>Servers</SecondaryNavItemTitle>
            </div>
          </SecondaryNavItem>
          <SecondaryNavItem
            isActive={isActive("/system/llamacpp-models")}
            onClick={() => handleNavigation("/system/llamacpp-models")}
          >
            <div className="flex items-center gap-2 w-full">
              <Database className="h-4 w-4" />
              <SecondaryNavItemTitle>Models</SecondaryNavItemTitle>
            </div>
          </SecondaryNavItem>
          <SecondaryNavItem
            isActive={isActive("/system/llamacpp-router")}
            onClick={() => handleNavigation("/system/llamacpp-router")}
          >
            <div className="flex items-center gap-2 w-full">
              <RouterIcon className="h-4 w-4" />
              <SecondaryNavItemTitle>Router</SecondaryNavItemTitle>
            </div>
          </SecondaryNavItem>
        </div>
      </div>
    </SecondaryNavContainer>
  );
}
