import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsService } from "@/api/agentsService";
import { BaseDialog } from "@/components/BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Agent } from "@/types/agents";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (agent: Agent) => void;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workspace, setWorkspace] = useState("");
  const workspaceEditedRef = useRef(false);
  const queryClient = useQueryClient();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setWorkspace("");
      workspaceEditedRef.current = false;
    }
  }, [open]);

  // Auto-generate workspace slug from name unless user has edited it
  useEffect(() => {
    if (!workspaceEditedRef.current) {
      setWorkspace(toSlug(name));
    }
  }, [name]);

  const mutation = useMutation({
    mutationFn: () =>
      agentsService.createAgent({
        name: name.trim(),
        description: description.trim() || undefined,
        workspace: workspace || undefined,
      }),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ["agents-nav"] });
      toast.success(`Agent "${agent.name}" created`);
      onOpenChange(false);
      onCreated?.(agent);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  const handleWorkspaceChange = (value: string) => {
    workspaceEditedRef.current = true;
    // Strip any character that isn't a letter, number, or dash as the user types
    setWorkspace(value.replace(/[^a-z0-9-]/g, ""));
  };

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
        Cancel
      </Button>
      <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Agent"
        )}
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Agent"
      footer={footer}
      variant="floating"
      floatingClassName="md:max-w-md"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="agent-name">Name</Label>
          <Input
            id="agent-name"
            autoFocus
            placeholder="My Agent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && mutation.mutate()}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-description">
            Description
            <span className="text-muted-foreground font-normal ml-1.5">(optional)</span>
          </Label>
          <Textarea
            id="agent-description"
            placeholder="What does this agent do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agent-workspace">Workspace folder</Label>
          <div className="flex items-center rounded-md border bg-muted/40 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 overflow-hidden">
            <span className="pl-3 pr-1 text-sm text-muted-foreground whitespace-nowrap select-none font-mono">
              ~/.xerro/agents/
            </span>
            <input
              id="agent-workspace"
              type="text"
              value={workspace}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              placeholder="my-agent"
              className="flex-1 bg-transparent py-2 pr-3 text-sm font-mono outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>
    </BaseDialog>
  );
}
