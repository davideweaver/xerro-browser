import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import type { Period } from "@/types/dashboard";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

interface SessionStatsByDay {
  stats: { date: string; count: number }[];
  total_days: number;
}

interface DashboardContextType {
  sessionStats: SessionStatsByDay | null;
  isLoading: boolean;
  period: Period;
  setPeriod: (period: Period) => void;
  refetch: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

interface DashboardProviderProps {
  children: React.ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  children,
}) => {
  const [period, setPeriod] = useState<Period>("7d");

  const { data: sessionsResponse, isLoading, refetch } = useQuery({
    queryKey: ["xerro-sessions-dashboard"],
    queryFn: () => xerroProjectsService.listSessions({ limit: 500 }),
  });

  const sessionStats = useMemo<SessionStatsByDay | null>(() => {
    if (!sessionsResponse?.sessions) return null;

    const now = new Date();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = startOfDay(subDays(now, days));
    const endDate = endOfDay(now);

    const statsByDate = new Map<string, number>();

    sessionsResponse.sessions.forEach((session) => {
      const lastMessageDate = new Date(session.lastMessageAt);
      if (lastMessageDate >= startDate && lastMessageDate <= endDate) {
        const localDateString = format(lastMessageDate, "yyyy-MM-dd");
        statsByDate.set(localDateString, (statsByDate.get(localDateString) || 0) + 1);
      }
    });

    const stats = Array.from(statsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      stats,
      total_days: stats.length,
    };
  }, [sessionsResponse, period]);

  const stableRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const dashboardContext = useMemo(
    () => ({
      sessionStats: sessionStats || null,
      isLoading,
      period,
      setPeriod,
      refetch: stableRefetch,
    }),
    [sessionStats, isLoading, period, stableRefetch]
  );

  return (
    <DashboardContext.Provider value={dashboardContext}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;
