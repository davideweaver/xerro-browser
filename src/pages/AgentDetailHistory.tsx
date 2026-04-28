import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Container from "@/components/container/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { agentsService } from "@/api/agentsService";
import { TaskExecutionRow } from "@/components/tasks/TaskExecutionRow";
import { TaskExecutionSheet } from "@/components/tasks/TaskExecutionSheet";
import { History } from "lucide-react";
import { useAgentCompletionUpdates } from "@/hooks/use-agent-completion-updates";
import type { TaskExecution } from "@/types/agentTasks";

export default function AgentDetailHistory() {
  const { agentId } = useParams<{ agentId: string }>();

  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useAgentCompletionUpdates();

  const { data, isLoading } = useQuery({
    queryKey: ["agent-history", agentId],
    queryFn: () => agentsService.getHistory(agentId!),
    enabled: !!agentId,
  });

  const executions = data?.executions ?? [];

  const handleRowClick = (execution: TaskExecution) => {
    setSelectedExecution(execution);
    setSheetOpen(true);
  };

  return (
    <>
      <Container title="History">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : executions.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <History className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No execution history yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {executions.map((execution, i) => (
              <TaskExecutionRow
                key={execution.id ?? i}
                execution={execution}
                onClick={() => handleRowClick(execution)}
              />
            ))}
          </div>
        )}
      </Container>

      <TaskExecutionSheet
        execution={selectedExecution}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
