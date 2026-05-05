import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { agentsService } from "@/api/agentsService";
import { formatTimestamp, formatRelativeTime } from "@/lib/cronFormatter";
import { Play, Power, Loader2, Pencil, Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAgentCompletionUpdates } from "@/hooks/use-agent-completion-updates";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";

export default function AgentDetailConfig() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTimeout, setEditTimeout] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useAgentCompletionUpdates();

  const { subscribeToAgentStatus } = useXerroWebSocketContext();

  useEffect(() => {
    if (!agentId) return;
    return subscribeToAgentStatus((event) => {
      if (event.taskId !== agentId) return;
      if (event.status === 'completed' || event.status === 'cancelled' || event.status === 'error') {
        queryClient.invalidateQueries({ queryKey: ['agent-history', agentId] });
        queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      }
    });
  }, [agentId, subscribeToAgentStatus, queryClient]);

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => agentsService.getAgent(agentId!),
    enabled: !!agentId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["agent", agentId] });
    queryClient.invalidateQueries({ queryKey: ["agents-nav"] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      agentsService.updateAgent(agentId!, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        timeoutMs: editTimeout.trim() ? parseInt(editTimeout) * 60000 : undefined,
      }),
    onSuccess: () => {
      setIsEditing(false);
      invalidate();
      toast.success("Agent updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => agentsService.updateAgent(agentId!, { enabled }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => agentsService.deleteAgent(agentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents-nav"] });
      toast.success("Agent deleted");
      navigate("/agent-tasks/activity");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const runMutation = useMutation({
    mutationFn: () => agentsService.runAgent(agentId!),
    onSuccess: () => {
      toast.success("Agent started");
      setTimeout(() => navigate("/agent-tasks/activity"), 1500);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleStartEdit = () => {
    setEditName(agent!.name);
    setEditDescription(agent!.description ?? "");
    setEditTimeout(agent!.timeoutMs ? String(agent!.timeoutMs / 60000) : "");
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <Container title="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
        </div>
      </Container>
    );
  }

  if (!agent) {
    return (
      <Container title="Agent Not Found">
        <p className="text-muted-foreground">The requested agent could not be found.</p>
      </Container>
    );
  }

  return (
    <Container
      title="Agent Config"
      tools={
        <div className="flex items-center gap-2">
          <ContainerToolButton
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || !agent.enabled}
            size="sm"
            variant="primary"
          >
            {runMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {runMutation.isPending ? "Running..." : "Run"}
          </ContainerToolButton>
          <ContainerToolToggle
            pressed={agent.enabled}
            onPressedChange={(val) => toggleMutation.mutate(val)}
            disabled={toggleMutation.isPending}
            aria-label={agent.enabled ? "Disable Agent" : "Enable Agent"}
            className="data-[state=on]:bg-green-600 data-[state=on]:hover:bg-green-700"
          >
            <Power strokeWidth={agent.enabled ? 3.5 : 1.5} className={agent.enabled ? undefined : "opacity-40"} />
          </ContainerToolToggle>
          {isEditing ? (
            <>
              <ContainerToolButton
                size="sm"
                variant="primary"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editName.trim()}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </ContainerToolButton>
              <ContainerToolButton size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </ContainerToolButton>
            </>
          ) : (
            <>
              <ContainerToolButton size="icon" onClick={handleStartEdit}>
                <Pencil className="h-4 w-4" />
              </ContainerToolButton>
              <ContainerToolButton
                variant="destructive"
                size="icon"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </ContainerToolButton>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Config card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{agent.name}</CardTitle>
              <Badge variant={agent.enabled ? "default" : "secondary"}>
                {agent.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Execution Timeout (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={editTimeout}
                    onChange={(e) => setEditTimeout(e.target.value)}
                    placeholder="Default (10 min)"
                  />
                  {editTimeout && parseInt(editTimeout) > 60 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Long timeouts (&gt;60 min) may impact system resources.
                    </p>
                  )}
                </div>
              </>
            ) : (
              agent.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p className="text-sm">{agent.description}</p>
                </div>
              )
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Workspace</h3>
                <p className="text-sm font-mono break-all text-muted-foreground">{agent.workspace}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Agent ID</h3>
                <p className="text-sm font-mono break-all">{agent.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Execution Timeout</h3>
                <p className="text-sm">
                  {agent.timeoutMs ? `${agent.timeoutMs / 60000} min` : "Default (10 min)"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                <p className="text-sm">{formatTimestamp(agent.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(agent.createdAt)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                <p className="text-sm">{formatTimestamp(agent.updatedAt)}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(agent.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DestructiveConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteConfirmOpen(false)}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agent.name}"? This will remove the agent and all its configuration. The workspace files on disk will not be deleted.`}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Agent"
        confirmLoadingText="Deleting..."
      />
    </Container>
  );
}
