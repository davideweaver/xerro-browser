import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { agentsService } from "@/api/agentsService";
import { messagesService } from "@/api/messagesService";
import { useNavigate } from "react-router-dom";

interface ComposeMessageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultToId?: string;
  defaultToName?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

export function ComposeMessage({ open, onOpenChange, defaultToId, defaultToName, defaultSubject, defaultBody }: ComposeMessageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toId, setToId] = useState(defaultToId || "");
  const [toName, setToName] = useState(defaultToName || "");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");

  const { data: agentsData } = useQuery({
    queryKey: ["agents-for-compose"],
    queryFn: () => agentsService.listAgents(),
    enabled: open,
  });

  const tasks = (agentsData?.agents || []).filter((a) => a.enabled);

  // Reset form when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setToId(defaultToId || "");
      setToName(defaultToName || "");
      setSubject(defaultSubject || "");
      setBody(defaultBody || "");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resolve agent name once the agent list loads
  useEffect(() => {
    if (defaultToId && tasks.length > 0 && !toName) {
      const task = tasks.find((t) => t.id === defaultToId);
      if (task) setToName(task.name);
    }
  }, [tasks, defaultToId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMutation = useMutation({
    mutationFn: () =>
      messagesService.sendMessage({ toId, toName, subject, body }),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-sent"] });
      onOpenChange(false);
      setToId(defaultToId || "");
      setToName(defaultToName || "");
      setSubject(defaultSubject || "");
      setBody(defaultBody || "");
      navigate(`/inbox/${message.threadId}`);
    },
  });

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setToId(task.id);
      setToName(task.name);
    }
  };

  const canSend = toId && toName && subject.trim() && body.trim() && !sendMutation.isPending;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Message"
      variant="floating"
      floatingClassName="md:max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => sendMutation.mutate()} disabled={!canSend}>
            {sendMutation.isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="compose-to">To</Label>
          <Select onValueChange={handleTaskSelect} value={toId}>
            <SelectTrigger id="compose-to">
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="compose-subject">Subject</Label>
          <Input
            id="compose-subject"
            placeholder="Message subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="compose-body">Message</Label>
          <Textarea
            id="compose-body"
            placeholder="Write your message..."
            className="min-h-[120px] resize-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
    </BaseDialog>
  );
}
