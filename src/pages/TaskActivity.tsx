import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { agentTasksService } from "@/api/agentTasksService";
import {
  Activity,
  Zap,
  CheckCircle2,
  WifiOff,
  Wrench,
  Ban,
  X,
  Trash2,
} from "lucide-react";
import type { RunningTask, TaskExecution } from "@/types/agentTasks";
import { useAgentStatus } from "@/hooks/use-agent-status";
import { useTaskConfigUpdates } from "@/hooks/use-task-config-updates";
import type { AgentStatusEvent } from "@/types/websocket";
import { TaskExecutionSheet } from "@/components/tasks/TaskExecutionSheet";

interface FinishedTask extends RunningTask {
  finishedAt: number;
  summary?: string;
  wasCancelled?: boolean;
}

function RunningTaskCard({
  task,
  isFinished,
  wasCancelled,
  onViewHistory,
  onCancel,
}: {
  task: RunningTask & { summary?: string };
  isFinished?: boolean;
  wasCancelled?: boolean;
  onViewHistory?: () => void;
  onCancel?: (executionId: string, taskName: string) => void;
}) {
  const navigate = useNavigate();
  const [clientElapsed, setClientElapsed] = useState(task.elapsedMs);

  // Update elapsed time every second on the client (only if not finished)
  useEffect(() => {
    if (isFinished) {
      // Stop the timer and use the final elapsed time
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientElapsed(task.elapsedMs);
      return;
    }

    const startTime = Date.now() - task.elapsedMs;
    const interval = setInterval(() => {
      setClientElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [task.elapsedMs, isFinished]);

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}.${Math.floor((ms % 1000) / 100)}s`;
  };

  return (
    <Card className={isFinished ? "opacity-75" : "relative"}>
      <CardContent className="p-4">
        {/* Cancel Button (top-right, only for running tasks) */}
        {!isFinished && onCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel(task.executionId, task.taskName);
            }}
            className="absolute top-2 right-2 h-9 w-9 text-gray-400 hover:text-gray-300 hover:bg-white/20 transition-colors z-10 rounded-md flex items-center justify-center"
            title="Cancel"
          >
            <X className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
        <div className="space-y-3">
          {/* Header: Task Name + Status Indicator */}
          <div className="flex items-start gap-3">
            {isFinished ? (
              <div className="flex-shrink-0">
                {wasCancelled ? (
                  <Ban className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
              </div>
            )}
            <div className="flex-1 min-w-0 -mt-[5px]">
              <h3 className="text-base font-semibold truncate">
                {task.taskName}
              </h3>
              {isFinished && (
                <Badge
                  variant="outline"
                  className={`text-xs mt-1 ${wasCancelled ? "border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400" : ""}`}
                >
                  {wasCancelled ? "Cancelled" : "Completed"}
                </Badge>
              )}
            </div>
          </div>

          {/* Show operation details only for running tasks */}
          {!isFinished && (
            <>
              {/* Current Operation */}
              <div className="pl-6">
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">
                      Current Operation
                    </p>
                    <p className="text-sm font-mono break-words">
                      {task.currentOperation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tool Activity (when tool is being used) */}
              {task.toolName && (
                <div className="pl-6">
                  <div className="flex items-start gap-2">
                    <Wrench
                      className={`h-4 w-4 flex-shrink-0 mt-0.5 ${task.isToolError ? "text-red-500" : "text-blue-500"}`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-0.5">
                        Tool Activity
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            task.isToolError ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {task.toolName}
                        </Badge>
                        {task.isToolError && (
                          <span className="text-xs text-red-500">Error</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Execution Summary (only for completed tasks) */}
          {isFinished && task.summary && (
            <div className="pl-6">
              <p className="text-sm break-words">{task.summary}</p>
            </div>
          )}

          {/* Details Row */}
          <div className="pl-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {/* Elapsed/Duration Time */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                {isFinished ? "Duration:" : "Elapsed:"}
              </span>
              <span className="font-mono">
                {formatElapsedTime(clientElapsed)}
              </span>
            </div>

            {/* Model */}
            {task.model && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Model:</span>
                {task.isLocal && <Zap className="h-3 w-3" />}
                <span className="truncate max-w-[180px]" title={task.model}>
                  {task.model}
                </span>
              </div>
            )}

            {/* Task Type */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Type:</span>
              <span>{task.taskType}</span>
            </div>
          </div>

          {/* Action Links (only for completed tasks) */}
          {isFinished && onViewHistory && (
            <div className="pl-6 pt-2 flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewHistory();
                }}
                className="text-sm text-primary hover:underline transition-colors"
              >
                View Execution
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/agent-tasks/${task.taskId}`);
                }}
                className="text-sm text-primary hover:underline transition-colors"
              >
                View Task Detail
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TaskActivity() {
  const [runningTasks, setRunningTasks] = useState<Map<string, RunningTask>>(
    new Map(),
  );
  const [recentlyFinished, setRecentlyFinished] = useState<FinishedTask[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedExecution, setSelectedExecution] =
    useState<TaskExecution | null>(null);
  const [hasReceivedWsEvent, setHasReceivedWsEvent] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [executionToCancel, setExecutionToCancel] = useState<{
    executionId: string;
    taskName: string;
  } | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Listen for real-time task configuration updates
  useTaskConfigUpdates();

  // WebSocket connection for real-time updates
  const { isConnected } = useAgentStatus((event: AgentStatusEvent) => {
    if (!hasReceivedWsEvent) setHasReceivedWsEvent(true);
    setRunningTasks((prev) => {
      const updated = new Map(prev);

      // If task completed, cancelled, or errored, move to finished list
      if (
        event.status === "completed" ||
        event.status === "cancelled" ||
        event.status === "error"
      ) {
        const existingTask = updated.get(event.executionId);
        if (existingTask) {
          // Fetch the latest execution to get the summary (skip for cancelled tasks)
          if (event.status !== "cancelled") {
            agentTasksService
              .getTaskHistory(event.taskId, 1)
              .then((executions) => {
                if (executions.length > 0) {
                  const latestExecution = executions[0];
                  const summary =
                    latestExecution.normalizedResult?.display?.summary;

                  // Add to finished list with summary
                  const finishedTask: FinishedTask = {
                    ...existingTask,
                    currentOperation:
                      event.currentOperation || existingTask.currentOperation,
                    model: event.model || existingTask.model,
                    finishedAt: Date.now(),
                    summary: summary,
                    wasCancelled: event.status === "cancelled",
                  };

                  setRecentlyFinished((prevFinished) => {
                    const existingIds = new Set(
                      prevFinished.map((t) => t.executionId),
                    );
                    if (!existingIds.has(event.executionId)) {
                      return [...prevFinished, finishedTask];
                    }
                    return prevFinished;
                  });
                }
              })
              .catch((error) => {
                console.error("Failed to fetch execution summary:", error);
                // Still add to finished list without summary
                const finishedTask: FinishedTask = {
                  ...existingTask,
                  currentOperation:
                    event.currentOperation || existingTask.currentOperation,
                  model: event.model || existingTask.model,
                  finishedAt: Date.now(),
                  wasCancelled: event.status === "cancelled",
                };

                setRecentlyFinished((prevFinished) => {
                  const existingIds = new Set(
                    prevFinished.map((t) => t.executionId),
                  );
                  if (!existingIds.has(event.executionId)) {
                    return [...prevFinished, finishedTask];
                  }
                  return prevFinished;
                });
              });
          } else {
            // For cancelled tasks, add immediately without fetching summary
            const finishedTask: FinishedTask = {
              ...existingTask,
              currentOperation:
                event.currentOperation || existingTask.currentOperation,
              model: event.model || existingTask.model,
              finishedAt: Date.now(),
              wasCancelled: true,
            };

            setRecentlyFinished((prevFinished) => {
              const existingIds = new Set(
                prevFinished.map((t) => t.executionId),
              );
              if (!existingIds.has(event.executionId)) {
                return [...prevFinished, finishedTask];
              }
              return prevFinished;
            });
          }

          // Remove from running
          updated.delete(event.executionId);
        }
      } else {
        // Update or add running task
        const existing = updated.get(event.executionId);
        const startTime = existing?.startedAt
          ? new Date(existing.startedAt).getTime()
          : Date.now();

        updated.set(event.executionId, {
          executionId: event.executionId,
          taskId: event.taskId,
          taskName: event.taskName,
          taskType: existing?.taskType || "run-agent",
          startedAt: existing?.startedAt || event.timestamp,
          currentOperation:
            event.currentOperation ||
            existing?.currentOperation ||
            "Starting...",
          model: event.model || existing?.model,
          isLocal: event.isLocal ?? existing?.isLocal ?? false,
          elapsedMs: Date.now() - startTime,
          toolName:
            event.toolName ||
            (event.status === "tool_use" || event.status === "tool_result"
              ? existing?.toolName
              : undefined),
          toolCallId: event.toolCallId,
          isToolError: event.isToolError,
        });
      }

      return updated;
    });
  });

  // REST API polling - only when WebSocket disconnected (fallback)
  const { data, isLoading } = useQuery({
    queryKey: ["running-tasks"],
    queryFn: () => agentTasksService.getRunningTasks(),
    refetchInterval: hasReceivedWsEvent ? false : isConnected ? 2000 : 5000,
    refetchOnMount: true, // Always fetch fresh data on mount
    enabled: true, // Enabled for initial load
  });

  // Immediately fetch running tasks on component mount
  useEffect(() => {
    const fetchInitialRunningTasks = async () => {
      try {
        const response = await agentTasksService.getRunningTasks();
        if (response.running) {
          const initialTasks = new Map<string, RunningTask>();
          response.running.forEach((task) => {
            initialTasks.set(task.executionId, task);
          });
          setRunningTasks(initialTasks);
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error("Failed to fetch initial running tasks:", error);
        setIsInitialLoad(false);
      }
    };

    fetchInitialRunningTasks();
  }, []); // Run once on mount

  // Update running tasks from React Query polling (before WebSocket delivers first event)
  useEffect(() => {
    if (data?.running && !hasReceivedWsEvent) {
      const updatedTasks = new Map<string, RunningTask>();
      data.running.forEach((task) => {
        updatedTasks.set(task.executionId, task);
      });
      setRunningTasks(updatedTasks);
    }
  }, [data, hasReceivedWsEvent]);

  const runningTasksArray = Array.from(runningTasks.values());

  // Cancel execution mutation
  const cancelMutation = useMutation({
    mutationFn: (executionId: string) =>
      agentTasksService.cancelExecution(executionId),
    onSuccess: () => {
      // Close the confirmation dialog
      // Note: WebSocket will handle updating the task state automatically
      setCancelDialogOpen(false);
      setExecutionToCancel(null);
    },
  });

  // Clear all history mutation
  const clearAllMutation = useMutation({
    mutationFn: () => agentTasksService.clearAllHistory(),
    onSuccess: () => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["agent-task-history"] });
      setClearAllDialogOpen(false);
    },
  });

  const handleCancelClick = (executionId: string, taskName: string) => {
    setExecutionToCancel({ executionId, taskName });
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (executionToCancel) {
      cancelMutation.mutate(executionToCancel.executionId);
    }
  };

  const handleCancelDialog = () => {
    setCancelDialogOpen(false);
    setExecutionToCancel(null);
  };

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const handleConfirmClearAll = () => {
    clearAllMutation.mutate();
  };

  const handleCancelClearAll = () => {
    setClearAllDialogOpen(false);
  };

  // Filter out tasks older than 1 minute
  const displayedFinished = recentlyFinished.filter((task) => {
    // eslint-disable-next-line react-hooks/purity
    const age = Date.now() - task.finishedAt;
    return age < 60000; // 60 seconds
  });

  // Clean up old finished tasks every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentlyFinished((prev) =>
        prev.filter((task) => {
          const age = Date.now() - task.finishedAt;
          return age < 60000;
        }),
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const allDisplayedTasks = [...runningTasksArray, ...displayedFinished];

  if (isLoading && isInitialLoad) {
    return (
      <Container
        title="Activity"
        description="Real-time monitoring of executing tasks"
      >
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container
      title="Activity"
      description="Real-time monitoring of executing tasks"
      tools={
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <WifiOff className="h-3 w-3" />
              <span>Polling</span>
            </Badge>
          )}
          <ContainerToolButton
            onClick={handleClearAllClick}
            disabled={clearAllMutation.isPending}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </ContainerToolButton>
        </div>
      }
    >
      {allDisplayedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No tasks currently executing
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            When scheduled tasks are running, they'll appear here with real-time
            status updates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runningTasksArray.map((task) => (
            <RunningTaskCard
              key={task.executionId}
              task={task}
              isFinished={false}
              onCancel={handleCancelClick}
            />
          ))}
          {displayedFinished.map((task) => (
            <RunningTaskCard
              key={task.executionId}
              task={task}
              isFinished={true}
              wasCancelled={task.wasCancelled}
              onViewHistory={async () => {
                // Fetch the latest execution for this task
                const history = await agentTasksService.getTaskHistory(
                  task.taskId,
                  1,
                );
                if (history.length > 0) {
                  setSelectedExecution(history[0]);
                  setSheetOpen(true);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Execution Details Side Panel */}
      <TaskExecutionSheet
        execution={selectedExecution}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Cancel Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelDialog}
        title="Cancel Task Execution"
        description={
          executionToCancel
            ? `Are you sure you want to cancel "${executionToCancel.taskName}"? This action cannot be undone.`
            : ""
        }
        isLoading={cancelMutation.isPending}
        confirmText="Cancel Task"
        confirmLoadingText="Cancelling..."
        confirmVariant="destructive"
      />

      {/* Clear All History Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        onConfirm={handleConfirmClearAll}
        onCancel={handleCancelClearAll}
        title="Clear All History"
        description="Are you sure you want to clear all execution history for all tasks? This action cannot be undone and all execution records will be permanently deleted."
        isLoading={clearAllMutation.isPending}
        confirmText="Clear All"
        confirmLoadingText="Clearing..."
        confirmVariant="destructive"
      />
    </Container>
  );
}
