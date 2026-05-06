import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { chatService } from "@/api/chatService";
import { agentsService } from "@/api/agentsService";
import { saveDraft } from "@/lib/chatDraftsStorage";
import { BaseDialog } from "@/components/BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkingDirectoryCombobox } from "./WorkingDirectoryCombobox";

type Mode = "agent" | "project" | "chat";

const XERRO_AGENT_PATH = "/Users/dweaver/Projects/ai/xerro-agent";

interface ChatAboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  firstMessage: string;
  defaultMode?: Mode;
  defaultAgentId?: string;
  defaultProjectPath?: string;
}

export function ChatAboutDialog({
  open,
  onOpenChange,
  sessionName,
  firstMessage,
  defaultMode = "chat",
  defaultAgentId,
  defaultProjectPath,
}: ChatAboutDialogProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [agentId, setAgentId] = useState(defaultAgentId ?? "");
  const [projectPath, setProjectPath] = useState(defaultProjectPath ?? XERRO_AGENT_PATH);
  const [name, setName] = useState(sessionName);
  const [message, setMessage] = useState(firstMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when dialog opens with new values
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setAgentId(defaultAgentId ?? "");
      setProjectPath(defaultProjectPath ?? XERRO_AGENT_PATH);
      setName(sessionName);
      setMessage(firstMessage);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: agentsData } = useQuery({
    queryKey: ["agents-nav"],
    queryFn: () => agentsService.listAgents(),
    enabled: open && mode === "agent",
  });
  const agents = (agentsData?.agents ?? []).filter((a) => a.enabled);

  const canSubmit =
    name.trim() &&
    (mode !== "agent" || !!agentId);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      let sessionAgentId: string | undefined;
      const config =
        mode === "agent"
          ? {}
          : mode === "project"
          ? { cwd: projectPath }
          : { cwd: XERRO_AGENT_PATH };

      if (mode === "agent") sessionAgentId = agentId;

      const session = await chatService.createSession(
        name.trim(),
        config,
        undefined,
        sessionAgentId
      );
      if (message.trim()) saveDraft(session.id, message.trim());
      onOpenChange(false);
      navigate(`/chat/${session.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? "Creating..." : "Start Chat"}
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Chat about this…"
      footer={footer}
      footerHeight={64}
    >
      <div className="space-y-4 py-2">
        {/* Mode selector */}
        <div className="space-y-2">
          <Label>Chat with</Label>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            className="flex gap-2"
          >
            {(["agent", "project", "chat"] as const).map((m) => {
              const labels: Record<Mode, string> = {
                agent: "Agent",
                project: "Project",
                chat: "Just Chat",
              };
              return (
                <label
                  key={m}
                  className={`flex-1 flex items-center justify-center gap-2 border rounded-md px-3 py-2 cursor-pointer text-sm transition-colors ${
                    mode === m
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <RadioGroupItem value={m} className="sr-only" />
                  {labels[m]}
                </label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Conditional sub-selector */}
        {mode === "agent" && (
          <div className="space-y-1.5">
            <Label>Agent</Label>
            <Select
              value={agentId || "__none__"}
              onValueChange={(v) => setAgentId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "project" && (
          <div className="space-y-1.5">
            <Label>Project</Label>
            <WorkingDirectoryCombobox value={projectPath} onChange={setProjectPath} />
          </div>
        )}

        {/* Session name */}
        <div className="space-y-1.5">
          <Label htmlFor="chat-about-name">Session Name</Label>
          <Input
            id="chat-about-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* First message */}
        <div className="space-y-1.5">
          <Label htmlFor="chat-about-message">First Message</Label>
          <Textarea
            id="chat-about-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </BaseDialog>
  );
}
