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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "date-fns";
import type { XerroSession } from "@/types/xerroProjects";

export default function Sessions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectName } = useParams<{ projectName?: string }>();
  const decodedProjectName = projectName
    ? decodeURIComponent(projectName)
    : undefined;
  const queryClient = useQueryClient();

  // Initialize selected date from query string or default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      try {
        const parsed = parse(dateParam, "yyyy-MM-dd", new Date());
        return isNaN(parsed.getTime())
          ? startOfDay(new Date())
          : startOfDay(parsed);
      } catch {
        return startOfDay(new Date());
      }
    }
    return startOfDay(new Date());
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [groupByProject, setGroupByProject] = useState(
    () => localStorage.getItem("sessions-group-by-project") !== "false",
  );
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const [deletedSessionIds, setDeletedSessionIds] = useState<Set<string>>(new Set());

  // Update query string when date changes
  useEffect(() => {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    setSearchParams({ date: dateString }, { replace: true });
  }, [selectedDate, setSearchParams]);

  const rangeStartDate = startOfDay(subDays(selectedDate, 30)).toISOString();
  const rangeEndDate = endOfDay(addDays(selectedDate, 30)).toISOString();

  const queryKey = ["sessions", decodedProjectName];

  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const allSessions: XerroSession[] = [];
      let cursor: string | undefined = undefined;

      do {
        const response = await xerroProjectsService.listSessions({
          projectName: decodedProjectName,
          limit: 500,
          cursor,
          order: "desc",
        });
        allSessions.push(...response.sessions);
        cursor = response.nextCursor;
        if (!response.hasMore) break;
      } while (cursor);

      return { sessions: allSessions };
    },
  });

  // Invalidate sessions when xerro WS events arrive
  const invalidateSessions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const normalizedDate = startOfDay(date);
      setSelectedDate(normalizedDate);
      setCalendarOpen(false);
    }
  };

  const handleTodayClick = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
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
      return next;
    });
  };

  // Compute session counts by local date (for calendar)
  const localSessionStats = useMemo(() => {
    if (!sessionsResponse?.sessions) return new Map<string, number>();

    const stats = new Map<string, number>();
    sessionsResponse.sessions.forEach((session) => {
      const lastMessageDate = new Date(session.lastMessageAt);
      const localDateString = format(lastMessageDate, "yyyy-MM-dd");
      stats.set(localDateString, (stats.get(localDateString) || 0) + 1);
    });

    return stats;
  }, [sessionsResponse]);

  // Filter sessions to only show the selected date, excluding locally deleted sessions
  const filteredSessions = useMemo(() => {
    if (!sessionsResponse?.sessions) return [];

    const selectedDateString = format(selectedDate, "yyyy-MM-dd");

    return sessionsResponse.sessions.filter((session) => {
      if (deletedSessionIds.has(session.id)) return false;
      const lastMessageDate = new Date(session.lastMessageAt);
      const localDateString = format(lastMessageDate, "yyyy-MM-dd");
      return localDateString === selectedDateString;
    });
  }, [sessionsResponse, selectedDate, deletedSessionIds]);

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

  // Initialize only first project as open when groupedSessions changes
  useEffect(() => {
    if (groupedSessions && groupedSessions.length > 0) {
      const firstProject = groupedSessions[0][0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenProjects(new Set([firstProject]));
    }
  }, [groupedSessions]);

  const calendarTools = (
    <div className="flex gap-2">
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
      loading={isLoading}
      tools={calendarTools}
    >
      <div className="max-w-4xl space-y-6">
        {/* Day Navigation */}
        {sessionsResponse && sessionsResponse.sessions.length > 0 && (
          <DayNavigation
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dateRange={{ start: rangeStartDate, end: rangeEndDate }}
            localStats={localSessionStats}
          />
        )}

        {/* Session Groups */}
        <div className="mt-8">
          {isLoading && (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-6 w-32 mb-3" />
                  <Card>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/4" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {!isLoading &&
            sessionsResponse &&
            sessionsResponse.sessions.length === 0 && (
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

          {!isLoading &&
            filteredSessions.length > 0 &&
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

          {!isLoading && filteredSessions.length > 0 && !groupByProject && (
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
