import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { agentTasksService } from "@/api/agentTasksService";
import { agentsService } from "@/api/agentsService";
import { TaskExecutionSheet } from "@/components/tasks/TaskExecutionSheet";
import { TaskExecutionRow } from "@/components/tasks/TaskExecutionRow";
import { useTaskConfigUpdates } from "@/hooks/use-task-config-updates";
import { useAgentCompletionUpdates } from "@/hooks/use-agent-completion-updates";
import { Trash2 } from "lucide-react";
import type { TaskExecution } from "@/types/agentTasks";

export default function AgentTaskHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedExecution, setSelectedExecution] =
    useState<TaskExecution | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteExecutionDialogOpen, setDeleteExecutionDialogOpen] = useState(false);
  const [executionToDelete, setExecutionToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Listen for real-time task configuration updates
  useTaskConfigUpdates();

  // Listen for agent completion events to refresh history
  useAgentCompletionUpdates();

  const { data: scheduledRuns, isLoading: loadingScheduled } = useQuery({
    queryKey: ["agent-task-history"],
    queryFn: () => agentTasksService.getRecentRuns(50),
  });

  const { data: agentRuns, isLoading: loadingAgents } = useQuery({
    queryKey: ["agent-workspace-history"],
    queryFn: () => agentsService.getAllHistory(50),
  });

  const isLoading = loadingScheduled || loadingAgents;

  const recentRuns = [...(scheduledRuns ?? []), ...(agentRuns?.executions ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Mutation to delete individual execution
  const deleteExecutionMutation = useMutation({
    mutationFn: (executionId: string) => agentTasksService.deleteExecution(executionId),
    onSuccess: () => {
      // Invalidate history query to refresh data
      queryClient.invalidateQueries({ queryKey: ["agent-task-history"] });
      setDeleteExecutionDialogOpen(false);
      setExecutionToDelete(null);
    },
  });

  // Mutation to clear all history
  const clearAllMutation = useMutation({
    mutationFn: () => agentTasksService.clearAllHistory(),
    onSuccess: () => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["agent-task-history"] });
      setClearAllDialogOpen(false);
    },
  });

  if (isLoading) {
    return (
      <Container title="History" description="Loading task execution history...">
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container
      title="History"
      description="Recent executions across all scheduled tasks and workspace agents"
      tools={
        <ContainerToolButton
          onClick={() => setClearAllDialogOpen(true)}
          disabled={clearAllMutation.isPending}
          size="sm"
          variant="destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </ContainerToolButton>
      }
    >
      <div className="space-y-2">
        {recentRuns && recentRuns.length > 0 ? (
          recentRuns.map((execution, index) => (
            <TaskExecutionRow
              key={index}
              execution={{
                ...execution,
                taskName: execution.agentName ?? execution.taskName,
              }}
              onClick={() => {
                setSelectedExecution(execution);
                setSheetOpen(true);
              }}
              showTaskName={true}
              onTaskNameClick={
                execution.agentId
                  ? () => navigate(`/agents/${execution.agentId}`)
                  : execution.taskId
                  ? () => navigate(`/agent-tasks/${execution.taskId}`)
                  : undefined
              }
              onDelete={
                execution.agentId
                  ? undefined
                  : (executionId) => {
                      setExecutionToDelete(executionId);
                      setDeleteExecutionDialogOpen(true);
                    }
              }
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No recent task executions found
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Execution Detail Sheet */}
      <TaskExecutionSheet
        execution={selectedExecution}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Delete Execution Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={deleteExecutionDialogOpen}
        onOpenChange={setDeleteExecutionDialogOpen}
        onConfirm={() => {
          if (executionToDelete) {
            deleteExecutionMutation.mutate(executionToDelete);
          }
        }}
        onCancel={() => {
          setDeleteExecutionDialogOpen(false);
          setExecutionToDelete(null);
        }}
        title="Delete Execution"
        description="Are you sure you want to delete this execution from history? This action cannot be undone."
        isLoading={deleteExecutionMutation.isPending}
        confirmText="Delete"
        confirmLoadingText="Deleting..."
        confirmVariant="destructive"
      />

      {/* Clear All History Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        onConfirm={() => clearAllMutation.mutate()}
        onCancel={() => setClearAllDialogOpen(false)}
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
