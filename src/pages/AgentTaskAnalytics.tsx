import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Container from "@/components/container/Container";
import { analyticsService } from "@/api/analyticsService";
import { agentTasksService } from "@/api/agentTasksService";
import { agentsService } from "@/api/agentsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { AnalyticsWindow } from "@/types/analytics";
import { cn } from "@/lib/utils";

// ── Formatters ───────────────────────────────────────────────────────────────

function formatLatency(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatXAxis(timestamp: number, window: AnalyticsWindow): string {
  const d = new Date(timestamp);
  if (window === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseServerName(server: string): { prefix: string | null; name: string } {
  if (server.startsWith("claude_ai_")) {
    const name = server.slice("claude_ai_".length).replace(/_/g, " ");
    return { prefix: "claude.ai", name };
  }
  return { prefix: null, name: server.replace(/_/g, " ") };
}

function getErrorColor(pct: number): string {
  if (pct === 0) return "text-muted-foreground";
  if (pct < 1) return "text-yellow-500";
  if (pct < 5) return "text-orange-500";
  return "text-red-500";
}

function getSourceBadgeClass(source: string): string {
  switch (source.toUpperCase()) {
    case "PROJECTSETTINGS": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "PLUGIN": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "BUNDLED": return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className={cn("text-2xl font-bold", valueClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-24" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[180px] w-full" />
      </CardContent>
    </Card>
  );
}

function TimeseriesChart({
  title,
  data,
  color,
  window,
  valueFormatter,
}: {
  title: string;
  data: { timestamp: number; value: number }[];
  color: string;
  window: AnalyticsWindow;
  valueFormatter?: (v: number) => string;
}) {
  const chartData = data.map((d) => ({ ...d, time: d.timestamp }));
  const config = { value: { label: title, color } };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ChartContainer config={config} className="h-[180px] w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="time"
                tickFormatter={(v) => formatXAxis(v, window)}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tickFormatter={valueFormatter} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.time
                        ? formatXAxis(payload[0].payload.time, window)
                        : ""
                    }
                    formatter={(value) => [
                      valueFormatter ? valueFormatter(Number(value)) : String(value),
                      title,
                    ]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${color.replace("#", "")})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const WINDOWS: { value: AnalyticsWindow; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export default function AgentTaskAnalytics() {
  const [selectedWindow, setSelectedWindow] = useState<AnalyticsWindow>("24h");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");

  const agentId = selectedAgentId === "all" ? undefined : selectedAgentId;

  const { data: agentsData } = useQuery({
    queryKey: ["analytics-agents"],
    queryFn: () => agentsService.listAgents(),
    staleTime: Infinity,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["analytics-scheduled-tasks"],
    queryFn: () => agentTasksService.listTasks(),
    staleTime: Infinity,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary", selectedWindow, selectedAgentId],
    queryFn: () => analyticsService.getSummary(selectedWindow, agentId),
  });

  const { data: tsRequests, isLoading: tsRequestsLoading } = useQuery({
    queryKey: ["analytics-ts-requests", selectedWindow, selectedAgentId],
    queryFn: () => analyticsService.getTimeseries("requests", selectedWindow, agentId),
  });

  const { data: tsCost, isLoading: tsCostLoading } = useQuery({
    queryKey: ["analytics-ts-cost", selectedWindow, selectedAgentId],
    queryFn: () => analyticsService.getTimeseries("cost", selectedWindow, agentId),
  });

  const perf = summary?.performance;
  const tools = summary?.tools ?? [];
  const mcps = summary?.mcps ?? [];
  const skills = summary?.skills ?? [];

  const sortedTools = [...tools].sort((a, b) => b.calls - a.calls);

  return (
    <Container title="Analytics" description="Claude Code agent run metrics">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {(agentsData?.agents ?? []).map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
            {(tasksData?.tasks ?? []).map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-border overflow-hidden">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setSelectedWindow(w.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                selectedWindow === w.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {summaryLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : perf ? (
          <>
            <StatCard label="Total Requests" value={perf.requests.toLocaleString()} />
            <StatCard label="Avg Latency" value={formatLatency(perf.avgLatencyMs)} />
            <StatCard
              label="Total Cost"
              value={formatCost(perf.totalCostUsd)}
              valueClass="text-cyan-400"
            />
            <StatCard
              label="Error Rate"
              value={`${(perf.errorRate * 100).toFixed(1)}%`}
              valueClass={perf.errorRate > 0 ? "text-red-400" : undefined}
            />
            <StatCard
              label="Cache Hit Rate"
              value={`${Math.round(perf.cacheHitRate * 100)}%`}
              valueClass="text-cyan-400"
            />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {tsRequestsLoading ? (
          <ChartSkeleton title="Requests over time" />
        ) : (
          <TimeseriesChart
            title="Requests over time"
            data={tsRequests ?? []}
            color="#06b6d4"
            window={selectedWindow}
          />
        )}
        {tsCostLoading ? (
          <ChartSkeleton title="Cost over time" />
        ) : (
          <TimeseriesChart
            title="Cost over time"
            data={tsCost ?? []}
            color="#8b5cf6"
            window={selectedWindow}
            valueFormatter={(v) => `$${v.toFixed(4)}`}
          />
        )}
      </div>

      {/* Tools Table */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Tools · {selectedWindow.toUpperCase()}
        </h2>
        {summaryLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Avg Latency</TableHead>
                  <TableHead className="text-right">Max Latency</TableHead>
                  <TableHead className="text-right">Err %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTools.map((t) => (
                    <TableRow key={t.tool}>
                      <TableCell className="font-mono text-sm">{t.tool}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.calls.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatLatency(t.avgMs)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatLatency(t.maxMs)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", getErrorColor(t.errorPct))}>
                        {t.errorPct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* MCP Servers Table — hidden if empty */}
      {!summaryLoading && mcps.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            MCP Servers · {selectedWindow.toUpperCase()}
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead className="text-right">Tools</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Avg Latency</TableHead>
                  <TableHead className="text-right">Err %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mcps.map((m) => (
                  <TableRow key={m.server}>
                    <TableCell className="text-sm">
                      {(() => {
                        const { prefix, name } = parseServerName(m.server);
                        return prefix ? (
                          <span>
                            <span className="text-muted-foreground">{prefix} </span>
                            <span className="font-medium">{name}</span>
                          </span>
                        ) : (
                          <span className="font-mono">{name}</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.toolCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.calls.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatLatency(m.avgLatencyMs)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums font-medium", getErrorColor(m.errorPct))}>
                      {m.errorPct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Skills — badge chips, hidden if empty */}
      {!summaryLoading && skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Skills · {selectedWindow.toUpperCase()}
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-border bg-accent/30 px-3 py-1.5"
              >
                <span className="text-sm font-mono">{s.skill}</span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold uppercase border", getSourceBadgeClass(s.source))}
                >
                  {s.source}
                </Badge>
                <span className="text-sm text-muted-foreground">×{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
