import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { chatService } from "@/api/chatService";
import { BaseDialog } from "@/components/BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

interface SessionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  sessionId: string;
  initialName: string;
  initialGroupId?: string;
}

export function SessionSettingsDialog({
  open,
  onOpenChange,
  onSaved,
  sessionId,
  initialName,
  initialGroupId,
}: SessionSettingsDialogProps) {
  const [name, setName] = useState(initialName);
  const [groupId, setGroupId] = useState<string>(initialGroupId ?? "");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: groupsData } = useQuery({
    queryKey: ["chat-groups"],
    queryFn: () => chatService.listGroups(),
    enabled: open,
  });
  const groups = groupsData?.groups ?? [];

  useEffect(() => {
    if (open) {
      setName(initialName);
      setGroupId(initialGroupId ?? "");
      setCopied(false);
    }
  }, [open, initialName, initialGroupId]);

  const handleCopy = async () => {
    await copyToClipboard(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const updates: Parameters<typeof chatService.updateSession>[1] = {
        name: name.trim() || initialName,
      };
      // Only send groupId if it changed
      if (groupId !== (initialGroupId ?? "")) {
        updates.groupId = groupId || null; // "" → null to ungroup
      }
      await chatService.updateSession(sessionId, updates);
      onSaved();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Session Settings"
      footer={footer}
      footerHeight={64}
    >
      <div className="space-y-4 py-2">
        {/* Session Name */}
        <div className="space-y-1.5">
          <Label htmlFor="session-name">Session Name</Label>
          <Input
            id="session-name"
            placeholder="My chat session"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Group */}
        {groups.length > 0 && (
          <div className="space-y-1.5">
            <Label>Group</Label>
            <Select
              value={groupId || "__none__"}
              onValueChange={(v) => setGroupId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Session ID */}
        <div className="space-y-1.5">
          <Label>Session ID</Label>
          <div className="flex gap-2">
            <Input value={sessionId} readOnly className="font-mono text-sm text-muted-foreground" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy session ID"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </BaseDialog>
  );
}
