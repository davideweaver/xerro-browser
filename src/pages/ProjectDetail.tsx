import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { todosService } from "@/api/todosService";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "@/types/todos";
import { TodoRow } from "@/components/todos/TodoRow";
import { TodoEditSheet } from "@/components/todos/TodoEditSheet";
import { CreateTodoDialog } from "@/components/todos/CreateTodoDialog";
import { useDeleteTodoConfirmation } from "@/hooks/use-delete-todo-confirmation";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, CalendarIcon } from "lucide-react";
import { MarkdownViewer } from "@/components/document-viewers/MarkdownViewer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProjectTimelineBar } from "@/components/episodes/ProjectTimelineBar";
import { SessionRow } from "@/components/episodes/SessionRow";
import { format, parseISO } from "date-fns";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import type { XerroSession, XerroMemoryBlock } from "@/types/xerroProjects";

export default function ProjectDetail() {
  const { projectName: encodedProjectName } = useParams<{
    projectName: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "todos";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string | null>(null);
  const [sessionCalendarOpen, setSessionCalendarOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);
  const [selectedDocLabel, setSelectedDocLabel] = useState<string | null>(null);
  const [selectedDocContent, setSelectedDocContent] = useState<string | null>(null);
  const [isLoadingDocContent, setIsLoadingDocContent] = useState(false);
  const queryClient = useQueryClient();
  const { confirmDelete: confirmDeleteTodo, DeleteConfirmationDialog: TodoDeleteConfirmationDialog } = useDeleteTodoConfirmation();

  const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : "";

  // Fetch project metadata
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ["xerro-project-metadata", projectName],
    queryFn: () => xerroProjectsService.getProject(projectName),
    enabled: !!projectName,
  });

  // Fetch sessions for this project (filtered by date when selected)
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["xerro-project-sessions", projectName, selectedSessionDate],
    queryFn: () => {
      if (selectedSessionDate) {
        return xerroProjectsService.listSessions({
          projectName, limit: 200, order: "asc",
          startedAfter: `${selectedSessionDate}T00:00:00.000Z`,
          startedBefore: `${selectedSessionDate}T23:59:59.999Z`,
        });
      }
      return xerroProjectsService.listSessions({ projectName, limit: 20 });
    },
    enabled: !!projectName,
  });

  // Fetch activity summary for the timeline (all days, full history)
  const { data: activityData } = useQuery({
    queryKey: ["xerro-project-activity", projectName],
    queryFn: () => xerroProjectsService.getProjectActivity(projectName),
    enabled: !!projectName,
  });

  const [allSessions, setAllSessions] = useState<XerroSession[]>([]);
  const [sessionsCursor, setSessionsCursor] = useState<string | undefined>(undefined);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch memory reference docs for this project (Documents tab)
  const { data: memoryData, isLoading: isLoadingMemory } = useQuery({
    queryKey: ["xerro-project-memory", projectName],
    queryFn: () =>
      xerroProjectsService.listMemoryBlocks(`reference/projects/${projectName}`),
    enabled: !!projectName,
  });

  // Fetch todos for this project
  const { data: todosData, isLoading: isLoadingTodos } = useQuery({
    queryKey: ["project-todos", projectName],
    queryFn: () => todosService.listTodos({ projectName, limit: 200 }),
    enabled: !!projectName,
  });

  const createTodoMutation = useMutation({
    mutationFn: (input: CreateTodoInput) => todosService.createTodo(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-todos", projectName] });
      setCreateOpen(false);
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTodoInput }) =>
      todosService.updateTodo(id, input),
    onSuccess: async (updatedTodo) => {
      await queryClient.invalidateQueries({ queryKey: ["project-todos", projectName] });
      if (editTodo && updatedTodo.id === editTodo.id) setEditTodo(updatedTodo);
      setEditDialogOpen(false);
      setTodoToEdit(null);
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      todosService.updateTodo(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["project-todos", projectName] });
      const previousTodos = queryClient.getQueryData(["project-todos", projectName]);
      queryClient.setQueryData(["project-todos", projectName], (old: Record<string, unknown>) => {
        if (!old) return old;
        const todos = old.todos as Todo[] | undefined;
        if (!todos) return old;
        return { ...old, todos: todos.map((t: Todo) => t.id === id ? { ...t, completed } : t) };
      });
      if (completed && hideCompleted) setHidingTodoId(id);
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(["project-todos", projectName], context.previousTodos);
      }
      setHidingTodoId(null);
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["project-todos", projectName] });
        setHidingTodoId(null);
      }, 300);
    },
  });

  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hideCompleted, _setHideCompleted] = useState(true);
  const [hidingTodoId, setHidingTodoId] = useState<string | null>(null);

  const handleTodoSave = async (id: string, input: UpdateTodoInput) => {
    await todosService.updateTodo(id, input);
    queryClient.invalidateQueries({ queryKey: ["project-todos", projectName] });
  };

  const handleOpenEditDialog = () => {
    if (editTodo) { setTodoToEdit(editTodo); setEditDialogOpen(true); }
  };

  const handleDialogSubmit = (input: CreateTodoInput | UpdateTodoInput, todoId?: string) => {
    if (todoId) {
      updateTodoMutation.mutate({ id: todoId, input: input as UpdateTodoInput });
    } else {
      createTodoMutation.mutate(input as CreateTodoInput);
    }
  };

  const filteredTodos = hideCompleted
    ? todosData?.todos.filter((todo) => !todo.completed || todo.id === hidingTodoId) ?? []
    : todosData?.todos ?? [];

  const deleteProjectMutation = useMutation({
    mutationFn: () => xerroProjectsService.deleteProject(projectName),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["xerro-project-metadata", projectName] });
      queryClient.removeQueries({ queryKey: ["xerro-project-sessions", projectName] });
      queryClient.removeQueries({ queryKey: ["xerro-project-memory", projectName] });
      queryClient.invalidateQueries({ queryKey: ["projects-nav-list"] });
      queryClient.invalidateQueries({ queryKey: ["projects-redirect"] });
      navigate("/projects");
    },
  });

  const memoryBlocks: XerroMemoryBlock[] = memoryData || [];

  const projectStartDate = activityData?.firstSessionAt ?? null;
  const projectEndDate = activityData?.lastSessionAt ?? null;

  const handleSelectDoc = async (label: string) => {
    setSelectedDocLabel(label);
    setSelectedDocContent(null);
    setIsLoadingDocContent(true);
    const block = await xerroProjectsService.getMemoryBlock(label);
    setSelectedDocContent(block?.content ?? "");
    setIsLoadingDocContent(false);
  };

  useEffect(() => {
    setAllSessions([]);
    setSessionsCursor(undefined);
    setSessionsHasMore(false);
    setSelectedSessionDate(null);
    setSessionCalendarOpen(false);
  }, [projectName]);

  useEffect(() => {
    if (sessionsData) {
      setAllSessions(sessionsData.sessions);
      setSessionsCursor(sessionsData.nextCursor);
      setSessionsHasMore(sessionsData.hasMore);
    }
  }, [sessionsData]);

  const handleLoadMoreSessions = async () => {
    if (!projectName || !sessionsCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const more = await xerroProjectsService.listSessions({
        projectName,
        limit: 20,
        cursor: sessionsCursor,
      });
      setAllSessions(prev => [...prev, ...more.sessions]);
      setSessionsCursor(more.nextCursor);
      setSessionsHasMore(more.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    setSelectedDocLabel(null);
    setSelectedDocContent(null);
  }, [projectName]);

  useEffect(() => {
    if (memoryBlocks.length > 0) {
      const isValidSelection = memoryBlocks.some((b) => b.label === selectedDocLabel);
      if (!isValidSelection) {
        handleSelectDoc(memoryBlocks[0].label);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName, memoryData]);

  if (isLoadingProject) {
    return (
      <Container title="Project Detail" description="Loading...">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </Container>
    );
  }

  if (!projectData) {
    return (
      <Container title="Project Not Found" description="The project could not be found">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Project not found</h3>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or couldn't be loaded.
            </p>
            <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const getDocDisplayName = (block: XerroMemoryBlock): string => {
    const prefix = `reference/projects/${projectName}/`;
    if (block.label.startsWith(prefix)) {
      return block.label.slice(prefix.length) + ".md";
    }
    const parts = block.label.split("/");
    return parts[parts.length - 1] + ".md";
  };

  return (
    <Container
      title={projectName}
      description={sessionsData?.sessions?.find(s => s.projectPath)?.projectPath ?? `~/.xerro/memory/history/${projectData.folder}`}
      tools={
        <div className="flex gap-2">
          <ContainerToolButton size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Todo
          </ContainerToolButton>
          <ContainerToolButton
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteProjectMutation.isPending}
            size="icon"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
          </ContainerToolButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Project Stats — fixed min-height to prevent layout shift */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Sessions</div>
                <div className="text-2xl font-semibold">{projectData.sessionCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Active</div>
                <div className="font-medium">
                  {format(parseISO(projectData.lastTurnAt), "MMM d, yyyy")}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Reflections</div>
                <div className="text-2xl font-semibold">{projectData.reflectionCounter}</div>
              </div>
            </div>

            {/* Timeline — always rendered; shows dashes until data loads */}
            <ProjectTimelineBar
              projectName={projectName}
              projectStartDate={projectStartDate}
              projectEndDate={projectEndDate}
              activeDays={activityData?.activeDays}
              onDayClick={(dateKey) => {
                setSelectedSessionDate(dateKey);
                setSearchParams({ tab: "sessions" }, { replace: true });
              }}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>

          {/* Todos Tab */}
          <TabsContent value="todos" className="mt-6 md:pl-4">
            {isLoadingTodos && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}
            {!isLoadingTodos && (todosData?.todos.length ?? 0) === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No todos for this project</p>
                </CardContent>
              </Card>
            )}
            {!isLoadingTodos && (todosData?.todos.length ?? 0) > 0 && (
              filteredTodos.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No incomplete todos</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-0.5">
                  {filteredTodos.map((todo: Todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, completed) => toggleTodoMutation.mutate({ id, completed })}
                      onDelete={() => confirmDeleteTodo(todo)}
                      onOpen={setEditTodo}
                    />
                  ))}
                </div>
              )
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6 md:pl-4">
            {activityData && (
              <div className="flex justify-end mb-4">
                <Popover open={sessionCalendarOpen} onOpenChange={setSessionCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[220px] justify-between font-normal"
                    >
                      <span>
                        {selectedSessionDate
                          ? format(parseISO(selectedSessionDate), "EEE, MMM d, yyyy")
                          : "Latest sessions"}
                      </span>
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex gap-1 p-2 border-b border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedSessionDate(format(new Date(), "yyyy-MM-dd"));
                          setSessionCalendarOpen(false);
                        }}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedSessionDate(null);
                          setSessionCalendarOpen(false);
                        }}
                      >
                        Latest
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={selectedSessionDate ? parseISO(selectedSessionDate) : undefined}
                      onSelect={(date) => {
                        setSelectedSessionDate(date ? format(date, "yyyy-MM-dd") : null);
                        setSessionCalendarOpen(false);
                      }}
                      disabled={(date) => {
                        const key = format(date, "yyyy-MM-dd");
                        return !activityData.activeDays.some((d) => d.date === key);
                      }}
                      fromDate={projectStartDate ? parseISO(projectStartDate) : undefined}
                      toDate={projectEndDate ? parseISO(projectEndDate) : undefined}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {isLoadingSessions && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!isLoadingSessions && allSessions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No sessions found for this project</p>
                </CardContent>
              </Card>
            )}
            {!isLoadingSessions && allSessions.length > 0 && (
              <div className="space-y-4">
                {allSessions.map((session, idx) => (
                  <div key={session.id}>
                    <SessionRow
                      session={session}
                      showProject={false}
                      onSessionClick={(id) =>
                        navigate(
                          `/project/${encodeURIComponent(projectName)}/sessions/${encodeURIComponent(id)}`
                        )
                      }
                      onSessionDeleted={(id) =>
                        setAllSessions(prev => prev.filter(s => s.id !== id))
                      }
                    />
                    {idx < allSessions.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
                {!selectedSessionDate && sessionsHasMore && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMoreSessions}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="memory" className="mt-6">
            {isLoadingMemory && (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!isLoadingMemory && memoryBlocks.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No reference documents found for this project
                  </p>
                </CardContent>
              </Card>
            )}
            {!isLoadingMemory && memoryBlocks.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end">
                  <Select value={selectedDocLabel ?? ""} onValueChange={handleSelectDoc}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {memoryBlocks.map((block) => (
                        <SelectItem key={block.label} value={block.label}>
                          {getDocDisplayName(block)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isLoadingDocContent && <Skeleton className="h-64 w-full" />}
                {!isLoadingDocContent && selectedDocContent !== null && (
                  <div className="pl-4">
                    <MarkdownViewer
                      content={selectedDocContent}
                      documentPath={selectedDocLabel ?? ""}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateTodoDialog
        open={createOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (editDialogOpen) { setEditDialogOpen(open); if (!open) setTodoToEdit(null); }
          else setCreateOpen(open);
        }}
        onSubmit={handleDialogSubmit}
        isSubmitting={createTodoMutation.isPending || updateTodoMutation.isPending}
        defaultProjectName={projectName}
        projectNameDisabled={!editDialogOpen}
        todo={todoToEdit}
      />

      <TodoEditSheet
        todo={editTodo}
        onClose={() => setEditTodo(null)}
        onSave={handleTodoSave}
        onOpenEditDialog={handleOpenEditDialog}
      />

      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteProjectMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${projectName}"? This will permanently delete ${projectData.sessionCount} session${projectData.sessionCount !== 1 ? "s" : ""}. This action cannot be undone.`}
      />

      <TodoDeleteConfirmationDialog />
    </Container>
  );
}

