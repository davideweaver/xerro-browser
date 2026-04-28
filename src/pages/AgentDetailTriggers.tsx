import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { triggersService } from "@/api/triggersService";
import { TriggerSheet } from "@/components/agents/TriggerSheet";
import { Plus, Pencil, Zap, Loader2 } from "lucide-react";
import type { TriggerSubscription } from "@/types/triggers";

const TYPE_LABELS: Record<string, string> = {
  document: "Document",
  message: "Message",
  cron: "Schedule",
};

const VARIANT_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  moved: "Moved",
  received: "Received",
  reply: "Reply",
  fire: "Fire",
};

export default function AgentDetailTriggers() {
  const { agentId } = useParams<{ agentId: string }>();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerSubscription | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-triggers", agentId],
    queryFn: async () => {
      const res = await triggersService.listTriggers();
      return res.subscriptions.filter((t) => t.taskIds.includes(agentId!));
    },
    enabled: !!agentId,
  });

  const triggers = data ?? [];

  const handleEdit = (trigger: TriggerSubscription) => {
    setSelectedTrigger(trigger);
    setSheetOpen(true);
  };

  const handleAdd = () => {
    setSelectedTrigger(null);
    setSheetOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["agent-triggers", agentId] });
  };

  const fireMutation = useMutation({
    mutationFn: (triggerId: string) => triggersService.fireTrigger(triggerId),
    onSuccess: () => toast.success("Trigger fired"),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Container
        title="Triggers"
        tools={
          <ContainerToolButton onClick={handleAdd} size="sm" variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Trigger
          </ContainerToolButton>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : triggers.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No triggers configured for this agent.</p>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Trigger
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {triggers.map((trigger) => (
              <Card
                key={trigger.id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => handleEdit(trigger)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{trigger.name}</span>
                        <Badge variant={trigger.enabled ? "default" : "secondary"} className="text-xs">
                          {trigger.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{TYPE_LABELS[trigger.triggerType] ?? trigger.triggerType}</span>
                        {trigger.triggerType !== "cron" && (
                          <>
                            <span>·</span>
                            <span>{VARIANT_LABELS[trigger.triggerVariant] ?? trigger.triggerVariant}</span>
                          </>
                        )}
                        {trigger.schedule && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{trigger.schedule}</span>
                          </>
                        )}
                      </div>
                      {trigger.description && (
                        <p className="text-xs text-muted-foreground truncate">{trigger.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Fire trigger"
                        disabled={fireMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); fireMutation.mutate(trigger.id); }}
                      >
                        {fireMutation.isPending && fireMutation.variables === trigger.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); handleEdit(trigger); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>

      <TriggerSheet
        agentId={agentId!}
        trigger={selectedTrigger}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={handleSaved}
      />
    </>
  );
}
