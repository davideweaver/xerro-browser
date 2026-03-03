import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graphitiService } from "@/api/graphitiService";
import { todosService } from "@/api/todosService";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "@/types/todos";
import { TodoRow } from "@/components/todos/TodoRow";
import { TodoEditSheet } from "@/components/todos/TodoEditSheet";
import { CreateTodoDialog } from "@/components/todos/CreateTodoDialog";
import { useDeleteTodoConfirmation } from "@/hooks/use-delete-todo-confirmation";
import { useGraphiti } from "@/context/GraphitiContext";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Info, Trash2, Plus } from "lucide-react";
import { FactCard } from "@/components/search/FactCard";
import { SessionRow } from "@/components/episodes/SessionRow";
import { ProjectTimelineBar } from "@/components/episodes/ProjectTimelineBar";
import { NodeDetailSheet } from "@/components/shared/NodeDetailSheet";
import { format } from "date-fns";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";

export default function ProjectDetail() {
  const { projectName: encodedProjectName } = useParams<{
    projectName: string;
  }>();
  const { groupId } = useGraphiti();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);
  const queryClient = useQueryClient();
  const { confirmDelete: confirmDeleteTodo, DeleteConfirmationDialog: TodoDeleteConfirmationDialog } = useDeleteTodoConfirmation();

  // Decode the project name from URL
  const projectName = encodedProjectName
    ? decodeURIComponent(encodedProjectName)
    : "";

  // Fetch project metadata by listing projects with name filter
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ["project-metadata", groupId, projectName],
    queryFn: async () => {
      const result = await graphitiService.listProjects(
        groupId,
        1,
        undefined,
        projectName,
      );
      return result.projects[0] || null;
    },
    enabled: !!projectName,
  });

  // Fetch sessions for this project (paginate - backend max is 500 per request)
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["project-sessions", groupId, projectName],
    queryFn: async () => {
      const allSessions = [];
      let cursor: string | undefined = undefined;

      do {
        const response = await graphitiService.getProjectSessions(groupId, projectName, 500, cursor);
        allSessions.push(...response.sessions);
        cursor = response.cursor ?? undefined;
        if (!response.has_more) break;
      } while (cursor);

      return { sessions: allSessions, total: allSessions.length, has_more: false, cursor: null };
    },
    enabled: !!projectName,
  });

  // Fetch entities for this project
  const { data: entitiesData, isLoading: isLoadingEntities } = useQuery({
    queryKey: ["project-entities", groupId, projectName],
    queryFn: () =>
      graphitiService.getProjectEntities(groupId, projectName, 100),
    enabled: !!projectName,
  });

  // Fetch facts for this project
  const { data: factsData, isLoading: isLoadingFacts } = useQuery({
    queryKey: ["project-facts", groupId, projectName],
    queryFn: () => graphitiService.search(projectName, groupId, 50),
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
      // Update the side panel with the fresh todo data
      if (editTodo && updatedTodo.id === editTodo.id) {
        setEditTodo(updatedTodo);
      }
      setEditDialogOpen(false);
      setTodoToEdit(null);
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      todosService.updateTodo(id, { completed }),
    onMutate: async ({ id, completed }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["project-todos", projectName] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(["project-todos", projectName]);

      // Optimistically update to the new value
      queryClient.setQueryData(["project-todos", projectName], (old: Record<string, unknown>) => {
        if (!old) return old;
        const todos = old.todos as Todo[] | undefined;
        if (!todos) return old;
        return {
          ...old,
          todos: todos.map((todo: Todo) =>
            todo.id === id ? { ...todo, completed } : todo
          ),
        };
      });

      // If completing a todo, mark it as "hiding" to keep it visible during animation
      if (completed && hideCompleted) {
        setHidingTodoId(id);
      }

      // Return context with the previous value
      return { previousTodos };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTodos) {
        queryClient.setQueryData(["project-todos", projectName], context.previousTodos);
      }
      setHidingTodoId(null);
    },
    onSuccess: () => {
      // Add a small delay before invalidating to allow checkbox animation to complete
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
    if (editTodo) {
      setTodoToEdit(editTodo);
      setEditDialogOpen(true);
    }
  };

  const handleDialogSubmit = (input: CreateTodoInput | UpdateTodoInput, todoId?: string) => {
    if (todoId) {
      updateTodoMutation.mutate({ id: todoId, input: input as UpdateTodoInput });
    } else {
      createTodoMutation.mutate(input as CreateTodoInput);
    }
  };

  // Filter todos based on hideCompleted state
  // Keep todos visible briefly even when completed if they're in the "hiding" state
  const filteredTodos = hideCompleted
    ? todosData?.todos.filter((todo) => !todo.completed || todo.id === hidingTodoId) ?? []
    : todosData?.todos ?? [];

  // Mutation for deleting project
  const deleteProjectMutation = useMutation({
    mutationFn: () => graphitiService.deleteProject(projectName, groupId),
    onSuccess: () => {
      // Remove queries from cache before navigation to prevent 404 errors
      queryClient.removeQueries({
        queryKey: ["project-metadata", groupId, projectName],
      });
      queryClient.removeQueries({
        queryKey: ["project-sessions", groupId, projectName],
      });
      queryClient.removeQueries({
        queryKey: ["project-entities", groupId, projectName],
      });
      queryClient.removeQueries({
        queryKey: ["project-facts", groupId, projectName],
      });

      // Invalidate projects list to refresh
      queryClient.invalidateQueries({ queryKey: ["projects", groupId] });

      // Navigate back to projects list
      navigate("/projects");
    },
  });

  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteProjectMutation.mutate();
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const [deletedSessionIds, setDeletedSessionIds] = useState<Set<string>>(
    new Set(),
  );

  const handleSessionDeleted = (sessionId: string) => {
    setDeletedSessionIds((prev) => new Set([...prev, sessionId]));
  };

  const sessions = (sessionsData?.sessions || []).filter(
    (s) => !deletedSessionIds.has(s.session_id),
  );
  const entities = entitiesData?.entities || [];
  const facts = factsData?.facts || [];

  const getEntityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "person":
        return "bg-blue-500/10 text-blue-500";
      case "organization":
        return "bg-purple-500/10 text-purple-500";
      case "location":
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (isLoadingProject) {
    return (
      <Container title="Project Detail" description="Loading...">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </Container>
    );
  }

  if (!projectData) {
    return (
      <Container
        title="Project Not Found"
        description="The project could not be found"
      >
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Project not found</h3>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or couldn't be
              loaded.
            </p>
            <Button onClick={() => navigate("/projects")}>
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container
      title={projectName}
      description={projectData.project_path || undefined}
      tools={
        <div className="flex gap-2">
          <ContainerToolButton
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Todo
          </ContainerToolButton>
          <ContainerToolButton size="sm" onClick={() => setSheetOpen(true)}>
            <Info className="h-4 w-4 mr-2" />
            Info
          </ContainerToolButton>
          <ContainerToolButton
            onClick={handleOpenDeleteDialog}
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
        {/* Project Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Episodes</div>
                <div className="text-2xl font-semibold">
                  {projectData.episode_count}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Sessions</div>
                <div className="text-2xl font-semibold">
                  {projectData.session_count}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">First Episode</div>
                <div className="font-medium">
                  {format(
                    new Date(projectData.first_episode_date),
                    "MMM d, yyyy",
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Episode</div>
                <div className="font-medium">
                  {format(
                    new Date(projectData.last_episode_date),
                    "MMM d, yyyy",
                  )}
                </div>
              </div>
            </div>

            {/* Project Timeline */}
            {sessions.length > 0 && (
              <ProjectTimelineBar
                sessions={sessions}
                projectStartDate={projectData.first_episode_date}
                projectEndDate={projectData.last_episode_date}
              />
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="todos">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="entities">Links</TabsTrigger>
            <TabsTrigger value="facts">Facts</TabsTrigger>
          </TabsList>

          {/* Todos Tab */}
          <TabsContent value="todos" className="mt-6">
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
                  <p className="text-muted-foreground">
                    No todos for this project
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoadingTodos && (todosData?.todos.length ?? 0) > 0 && (
              <>
                {filteredTodos.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">
                        No incomplete todos
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-0.5">
                    {filteredTodos.map((todo: Todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        onToggle={(id, completed) =>
                          toggleTodoMutation.mutate({ id, completed })
                        }
                        onDelete={() => confirmDeleteTodo(todo)}
                        onOpen={setEditTodo}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6">
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

            {!isLoadingSessions && sessions.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No sessions found for this project
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoadingSessions && sessions.length > 0 && (
              <>
                <div className="space-y-4">
                  {sessions.map((session, sessionIndex) => (
                    <div key={session.session_id}>
                      <SessionRow
                        session={session}
                        showProject={false}
                        onSessionClick={(sessionId) =>
                          navigate(
                            `/project/${encodeURIComponent(projectName)}/sessions/${encodeURIComponent(sessionId)}`,
                          )
                        }
                        onSessionDeleted={handleSessionDeleted}
                      />
                      {sessionIndex < sessions.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
                {sessions.length >= 10 && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/project/${encodeURIComponent(projectName)}/sessions`,
                        )
                      }
                    >
                      View All Sessions
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Entities Tab */}
          <TabsContent value="entities" className="mt-6">
            {isLoadingEntities && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoadingEntities && entities.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No entities found for this project
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoadingEntities && entities.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entities.map((entity) => {
                  const entityType =
                    entity.labels.find((label) => label !== "Entity") ||
                    entity.entity_type ||
                    "Unknown";
                  return (
                    <Card
                      key={entity.uuid}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/memory/entity/${entity.uuid}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold">{entity.name}</h3>
                          <Badge
                            variant="secondary"
                            className={getEntityTypeColor(entityType)}
                          >
                            {entityType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entity.summary}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Facts Tab */}
          <TabsContent value="facts" className="mt-6">
            {isLoadingFacts && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/4 mb-4" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoadingFacts && facts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No facts found for this project
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoadingFacts && facts.length > 0 && (
              <div className="space-y-2">
                {facts.map((fact) => (
                  <FactCard key={fact.uuid} fact={fact} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Todo Dialog */}
      <CreateTodoDialog
        open={createOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (editDialogOpen) {
            setEditDialogOpen(open);
            if (!open) setTodoToEdit(null);
          } else {
            setCreateOpen(open);
          }
        }}
        onSubmit={handleDialogSubmit}
        isSubmitting={createTodoMutation.isPending || updateTodoMutation.isPending}
        defaultProjectName={projectName}
        projectNameDisabled={!editDialogOpen} // Allow changing project when editing
        todo={todoToEdit}
      />

      {/* Todo Edit Sheet */}
      <TodoEditSheet
        todo={editTodo}
        onClose={() => setEditTodo(null)}
        onSave={handleTodoSave}
        onOpenEditDialog={handleOpenEditDialog}
      />

      {/* NodeDetailSheet for graph navigation */}
      <NodeDetailSheet
        nodeType="project"
        nodeId={projectName || null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Delete Project Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${projectName}"? This will permanently delete ${projectData?.session_count || 0} session${projectData?.session_count !== 1 ? "s" : ""}, ${projectData?.episode_count || 0} episode${projectData?.episode_count !== 1 ? "s" : ""}, and all associated facts and relationships. This action cannot be undone.`}
      />

      {/* Delete Todo Confirmation Dialog */}
      <TodoDeleteConfirmationDialog />
    </Container>
  );
}
