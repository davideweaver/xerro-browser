import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookMarked,
  Library,
  Clock,
  FolderKanban,
  Search,
  Plus,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Container from "@/components/container/Container";
import { memoryBlocksService } from "@/api/memoryBlocksService";
import { xerroProjectsService } from "@/api/xerroProjectsService";

// ── Quick links config ──────────────────────────────────────────────────────

const QUICK_LINKS = [
  {
    path: "/memory/search",
    icon: Search,
    label: "Search",
    description: "Find facts and memories",
    color: "text-sky-500",
  },
  {
    path: "/memory/sessions",
    icon: Clock,
    label: "Sessions",
    description: "View conversation history",
    color: "text-amber-500",
  },
  {
    path: "/memory/blocks",
    icon: BookMarked,
    label: "Blocks",
    description: "Manage memory blocks",
    color: "text-indigo-500",
  },
];

// ── Colors ──────────────────────────────────────────────────────────────────

function projectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
}

const FOLDER_COLORS = [
  "#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B",
  "#EF4444", "#6366F1", "#EC4899", "#14B8A6",
  "#F97316", "#84CC16",
];

// ── Component ────────────────────────────────────────────────────────────────

export default function MemoryOverview() {
  const navigate = useNavigate();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["memory-stats"],
    queryFn: () => memoryBlocksService.getStats(),
  });

  const { data: referenceBlocks, isLoading: isLoadingReference } = useQuery({
    queryKey: ["reference-blocks-overview"],
    queryFn: () => memoryBlocksService.listBlocks("reference"),
  });

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects-overview"],
    queryFn: () => xerroProjectsService.listProjects({ limit: 20 }),
  });

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["sessions-overview"],
    queryFn: () => xerroProjectsService.listSessions({ limit: 5 }),
  });

  // Group reference blocks by top-level folder
  const folderData = useMemo(() => {
    if (!referenceBlocks?.blocks) return [];
    const counts: Record<string, number> = {};
    for (const block of referenceBlocks.blocks) {
      if (block.isFolder) continue;
      const folder = block.label.replace(/^reference\//, "").split("/")[0] ?? "root";
      counts[folder] = (counts[folder] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value], i) => ({ name, value, fill: FOLDER_COLORS[i % FOLDER_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [referenceBlocks]);

  // Bar chart: top 8 projects by session count
  const barData = projects?.items
    ? [...projects.items]
        .sort((a, b) => b.sessionCount - a.sessionCount)
        .slice(0, 8)
        .map((p) => ({
          name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
          sessions: p.sessionCount,
        }))
    : [];

  return (
    <Container title="Overview">
      <div className="space-y-6">

        {/* ── Stats cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
              <BookMarked className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalBlocks ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ~{stats ? Math.round(stats.totalTokens / 1000) : 0}k tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reference</CardTitle>
              <Library className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.referenceBlocks ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">knowledge blocks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">History</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.historyBlocks ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">conversation extracts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{projects?.total ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.gitStatus?.dirty ? (
                  <span className="flex items-center gap-1 text-amber-500">
                    <GitBranch className="h-3 w-3" /> unsaved changes
                  </span>
                ) : (
                  "tracked projects"
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reference Folder Breakdown Donut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Reference Folders</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {isLoadingReference ? (
                <Skeleton className="h-48 w-48 rounded-full" />
              ) : folderData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12">No reference blocks yet</p>
              ) : (
                <>
                  <PieChart width={200} height={200}>
                    <Pie
                      data={folderData}
                      cx={100}
                      cy={100}
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {folderData.map((_entry, i) => (
                        <Cell key={i} fill={folderData[i].fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} blocks`, name]} />
                  </PieChart>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
                    {folderData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: d.fill }}
                        />
                        {d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Top Projects by Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Top Projects by Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : barData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No projects yet</p>
              ) : (
                <BarChart
                  width={320}
                  height={220}
                  data={barData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v) => [`${v} sessions`, "Sessions"]} />
                  <Bar dataKey="sessions" fill="#0EA5E9" radius={[0, 3, 3, 0]} />
                </BarChart>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Links ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Card
              key={link.path}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(link.path)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <link.icon className={`h-5 w-5 flex-shrink-0 ${link.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Recent Sessions ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/memory/sessions")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSessions && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-2.5 w-2.5 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingSessions && (!sessions?.sessions || sessions.sessions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No sessions yet.</p>
                <Button className="mt-3" size="sm" onClick={() => navigate("/memory/add")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Memory
                </Button>
              </div>
            )}

            {!isLoadingSessions && sessions?.sessions && sessions.sessions.length > 0 && (
              <div className="space-y-2">
                {sessions.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/memory/sessions/${session.id}`)}
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: projectColor(session.projectName) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {session.description || session.firstMessagePreview || session.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.projectName} · {session.messageCount} messages ·{" "}
                        {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Container>
  );
}
