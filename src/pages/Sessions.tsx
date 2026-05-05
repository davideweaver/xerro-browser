import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { useMemorySessionChanges } from "@/hooks/use-memory-session-changes";
import Container from "@/components/container/Container";
import { Button } from "@/components/ui/button";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DayNavigation } from "@/components/episodes/DayNavigation";
import { SessionRow } from "@/components/episodes/SessionRow";
import { CalendarIcon, FolderKanban, FolderTree, ChevronDown } from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  parse,
  startOfWeek,
} from "date-fns";
import type { XerroSession } from "@/types/xerroProjects";

const EXPANDED_STATE_KEY = "sessions-expanded-state";
const MAX_EXPANDED_DAYS = 20;

function loadExpandedState(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(EXPANDED_STATE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveExpandedState(dateKey: string, openProjects: Set<string>) {
  const state = loadExpandedState();
  state[dateKey] = Array.from(openProjects);
  // Prune to max 20 days — remove oldest entries first
  const keys = Object.keys(state).sort(); // yyyy-MM-dd sorts lexicographically
  while (keys.length > MAX_EXPANDED_DAYS) {
    delete state[keys.shift()!];
  }
  localStorage.setItem(EXPANDED_STATE_KEY, JSON.stringify(state));
}

export default function Sessions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectName } = useParams<{ projectName?: string }>();
  const decodedProjectName = projectName
    ? decodeURIComponent(projectName)
    : undefined;
  const queryClient = useQueryClient();

  // Initialize selected date from query string, then localStorage, then today
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      try {
        const parsed = parse(dateParam, "yyyy-MM-dd", new Date());
        if (!isNaN(parsed.getTime())) return startOfDay(parsed);
      } catch {}
    }
    const saved = localStorage.getItem("sessions-selected-date");
    if (saved) {
      try {
        const parsed = parse(saved, "yyyy-MM-dd", new Date());
        if (!isNaN(parsed.getTime())) return startOfDay(parsed);
      } catch {}
    }
    return startOfDay(new Date());
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [groupByProject, setGroupByProject] = useState(
    () => localStorage.getItem("sessions-group-by-project") !== "false",
  );
  const [sourceFilter, setSourceFilter] = useState<string>(
    () => localStorage.getItem("sessions-source-filter") ?? "all",
  );
  const [openProjects, setOpenProjects] = useState<Set<string>>(() => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const state = loadExpandedState();
    return new Set(state[dateKey] ?? []);
  });
  const [deletedSessionIds, setDeletedSessionIds] = useState<Set<string>>(new Set());

  // Atomically update selected date, URL, and localStorage — avoids async URL race with v7_startTransition
  const selectDate = useCallback((date: Date) => {
    const normalized = startOfDay(date);
    const dateString = format(normalized, "yyyy-MM-dd");
    setSelectedDate(normalized);
    setSearchParams({ date: dateString }, { replace: true });
    localStorage.setItem("sessions-selected-date", dateString);
  }, [setSearchParams]);

  // Restore saved expanded state when day changes; if no saved state, reset to empty
  // (auto-init below will open the first project once groupedSessions is available)
  useEffect(() => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const state = loadExpandedState();
    if (state[dateKey] !== undefined) {
      setOpenProjects(new Set(state[dateKey]));
    } else {
      setOpenProjects(new Set());
    }
  }, [selectedDate]);

  const rangeStartDate = startOfDay(subDays(selectedDate, 30)).toISOString();
  const rangeEndDate = endOfDay(addDays(selectedDate, 30)).toISOString();

  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const dayQueryKey = ["sessions-day", decodedProjectName, selectedDateString];

  // Track which week is visible in DayNavigation so stats fetch covers those days
  const [visibleWeekStart, setVisibleWeekStart] = useState(() =>
    startOfWeek(selectedDate, { weekStartsOn: 1 })
  );
  const visibleWeekKey = format(visibleWeekStart, "yyyy-MM-dd");
  const statsQueryKey = ["sessions-stats", decodedProjectName, visibleWeekKey];

  // Fast query: only sessions for the selected date
  const { data: daySessionsResponse, isLoading } = useQuery({
    queryKey: dayQueryKey,
    queryFn: () =>
      xerroProjectsService.listSessions({
        projectName: decodedProjectName,
        limit: 500,
        order: "desc",
        after: startOfDay(selectedDate).toISOString(),
        before: endOfDay(selectedDate).toISOString(),
      }),
    staleTime: Infinity,
  });

  // Stats query: fetch only the visible week's sessions for dot indicators.
  // Keyed by week start — each week cached separately, instant on return visit.
  const { data: allSessionsResponse } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () =>
      xerroProjectsService.listSessions({
        projectName: decodedProjectName,
        limit: 500,
        order: "desc",
        after: startOfDay(visibleWeekStart).toISOString(),
        before: endOfDay(addDays(visibleWeekStart, 6)).toISOString(),
      }),
    staleTime: Infinity,
  });

  // Invalidate sessions when xerro WS events arrive
  const invalidateSessions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dayQueryKey });
    queryClient.invalidateQueries({ queryKey: statsQueryKey });
  }, [queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  useMemorySessionChanges({
    onSessionCreated: invalidateSessions,
    onSessionUpdated: invalidateSessions,
    onSessionDeleted: (event) => {
      // Optimistically remove from local deleted set; also refetch to stay in sync
      setDeletedSessionIds((prev) => new Set([...prev, event.sessionId]));
    },
    onProjectAdded: invalidateSessions,
    onProjectUpdated: invalidateSessions,
    onProjectDeleted: invalidateSessions,
  });

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      selectDate(date);
      setCalendarOpen(false);
    }
  };

  const handleTodayClick = () => {
    selectDate(new Date());
    setCalendarOpen(false);
  };

  const viewSessionDetail = (sessionId: string) => {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    if (decodedProjectName) {
      navigate(
        `/project/${encodeURIComponent(decodedProjectName)}/sessions/${encodeURIComponent(sessionId)}?date=${dateString}`,
      );
    } else {
      navigate(
        `/memory/sessions/${encodeURIComponent(sessionId)}?date=${dateString}`,
      );
    }
  };

  const handleSessionDeleted = (sessionId: string) => {
    setDeletedSessionIds((prev) => new Set([...prev, sessionId]));
  };

  const toggleProject = (project: string) => {
    setOpenProjects((prev) => {
      const next = new Set(prev);
      if (next.has(project)) {
        next.delete(project);
      } else {
        next.add(project);
      }
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      saveExpandedState(dateKey, next);
      return next;
    });
  };

  // Compute session counts by local date (for calendar) — uses background stats query
  const localSessionStats = useMemo(() => {
    if (!allSessionsResponse?.sessions) return new Map<string, number>();

    const stats = new Map<string, number>();
    allSessionsResponse.sessions.forEach((session) => {
      const lastMessageDate = new Date(session.lastMessageAt);
      const localDateString = format(lastMessageDate, "yyyy-MM-dd");
      stats.set(localDateString, (stats.get(localDateString) || 0) + 1);
    });

    return stats;
  }, [allSessionsResponse]);

  const getSessionSource = (session: XerroSession): string => {
    const src = session.externalSource;
    if (!src) return "other";
    if (src === "claude-code") return "claude-code";
    if (src.startsWith("scheduled-task")) return "scheduled-agent";
    if (src === "trigger") return "trigger";
    if (src === "slack-bot") return "slack";
    if (src === "xerro-chat") return "chat";
    return "other";
  };

  // Filter sessions — date scoping is done by the API, just apply local filters
  const filteredSessions = useMemo(() => {
    if (!daySessionsResponse?.sessions) return [];

    return daySessionsResponse.sessions.filter((session) => {
      if (deletedSessionIds.has(session.id)) return false;
      if (sourceFilter !== "all" && getSessionSource(session) !== sourceFilter) return false;
      return true;
    });
  }, [daySessionsResponse, deletedSessionIds, sourceFilter]);

  // Group sessions by project when enabled
  const groupedSessions = useMemo(() => {
    if (!groupByProject) return null;

    const groups = new Map<string, XerroSession[]>();

    filteredSessions.forEach((session) => {
      const project = session.projectName || "Unknown Project";
      if (!groups.has(project)) {
        groups.set(project, []);
      }
      groups.get(project)!.push(session);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Unknown Project") return 1;
      if (b === "Unknown Project") return -1;
      return a.localeCompare(b);
    });
  }, [filteredSessions, groupByProject]);

  // Auto-open first project for days with no saved expanded state
  useEffect(() => {
    if (groupedSessions && groupedSessions.length > 0) {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      const state = loadExpandedState();
      if (state[dateKey] === undefined) {
        const firstProject = groupedSessions[0][0];
        const next = new Set([firstProject]);
        setOpenProjects(next);
        saveExpandedState(dateKey, next);
      }
    }
  }, [groupedSessions, selectedDate]);

  const calendarTools = (
    <div className="flex gap-2">
      <Select
        value={sourceFilter}
        onValueChange={(val) => {
          setSourceFilter(val);
          localStorage.setItem("sessions-source-filter", val);
        }}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="claude-code">Claude Code</SelectItem>
          <SelectItem value="chat">Chat</SelectItem>
          <SelectItem value="scheduled-agent">Scheduled Agent</SelectItem>
          <SelectItem value="trigger">Trigger</SelectItem>
          <SelectItem value="slack">Slack</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <ContainerToolToggle
        size="sm"
        pressed={groupByProject}
        onPressedChange={(val) => {
          setGroupByProject(val);
          localStorage.setItem("sessions-group-by-project", String(val));
        }}
        aria-label="Group by project"
      >
        <FolderTree strokeWidth={groupByProject ? 2.5 : 1.5} className={groupByProject ? undefined : "opacity-40"} />
      </ContainerToolToggle>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <ContainerToolButton size="sm">
            <CalendarIcon className="h-4 w-4" />
          </ContainerToolButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
          />
          <div className="p-3 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleTodayClick}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <Container
      title={decodedProjectName ? `${decodedProjectName} Sessions` : "Sessions"}
      description={
        decodedProjectName
          ? `Sessions for ${decodedProjectName} project`
          : "Browse your conversation sessions"
      }
      tools={calendarTools}
    >
      <div className="max-w-4xl space-y-6">
        <DayNavigation
          selectedDate={selectedDate}
          onDateSelect={selectDate}
          onWeekChange={setVisibleWeekStart}
          dateRange={{ start: rangeStartDate, end: rangeEndDate }}
          localStats={localSessionStats}
        />

        {/* Session Groups */}
        <div className={`mt-8 transition-opacity duration-200 ${isLoading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
          {daySessionsResponse &&
            filteredSessions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    No sessions found
                  </h3>
                  <p className="text-muted-foreground">
                    Add your first memory to get started.
                  </p>
                </CardContent>
              </Card>
            )}

          {filteredSessions.length > 0 &&
            groupByProject &&
            groupedSessions && (
              <div className="space-y-6">
                {groupedSessions.map(([project, sessions]) => {
                  const isOpen = openProjects.has(project);
                  return (
                    <Collapsible
                      key={project}
                      open={isOpen}
                      onOpenChange={() => toggleProject(project)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/30 px-2 py-1.5 -mx-2 rounded-md transition-colors text-muted-foreground">
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                              isOpen ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                          <FolderKanban className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wider">
                            {project}
                          </span>
                          <span className="text-xs font-normal opacity-60">
                            ({sessions.length})
                          </span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-4 mt-3">
                          {sessions.map((session, sessionIndex) => (
                            <div key={session.id}>
                              <SessionRow
                                session={session}
                                showProject={false}
                                onSessionClick={viewSessionDetail}
                                onSessionDeleted={handleSessionDeleted}
                              />
                              {sessionIndex < sessions.length - 1 && (
                                <Separator className="mt-4" />
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}

          {filteredSessions.length > 0 && !groupByProject && (
            <div className="space-y-4">
              {filteredSessions.map((session, sessionIndex) => (
                <div key={session.id}>
                  <SessionRow
                    session={session}
                    showProject={true}
                    onSessionClick={viewSessionDetail}
                    onSessionDeleted={handleSessionDeleted}
                  />
                  {sessionIndex < filteredSessions.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
