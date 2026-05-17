export type AnalyticsWindow = "24h" | "7d" | "30d";
export type TimeseriesMetric = "requests" | "cost" | "errors" | "tool_calls";

export interface PerformanceSummary {
  window: string;
  agentId: string | null;
  requests: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  costPerRequest: number;
  errorRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheHitRate: number;
}

export interface ToolStat {
  tool: string;
  calls: number;
  avgMs: number;
  maxMs: number;
  errorPct: number;
}

export interface SkillStat {
  skill: string;
  source: string;
  count: number;
}

export interface McpStat {
  server: string;
  toolCount: number;
  calls: number;
  avgLatencyMs: number;
  errorPct: number;
}

export interface AnalyticsSummary {
  performance: PerformanceSummary;
  tools: ToolStat[];
  skills: SkillStat[];
  mcps: McpStat[];
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface CostByAgent {
  agentId: string;
  totalCostUsd: number;
  requests: number;
  errors: number;
}
