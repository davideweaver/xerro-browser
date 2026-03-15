import { useState } from "react";
import { chatService } from "@/api/chatService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ChatGroup } from "@/types/xerroChat";

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ChatGroup | null;
  onDeleted: () => void;
}

export function DeleteGroupDialog({ open, onOpenChange, group, onDeleted }: DeleteGroupDialogProps) {
  const [deleteSessions, setDeleteSessions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionCount = group?.sessionCount ?? 0;

  const handleConfirm = async () => {
    if (!group) return;
    setIsSubmitting(true);
    try {
      await chatService.deleteGroup(group.id, deleteSessions);
      onDeleted();
      onOpenChange(false);
      setDeleteSessions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setDeleteSessions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Group</DialogTitle>
          <DialogDescription>
            Delete group <span className="font-medium text-foreground">"{group?.name}"</span>
            {sessionCount > 0 && ` (${sessionCount} ${sessionCount === 1 ? "session" : "sessions"})`}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <label className="flex items-start gap-3 cursor-pointer rounded-md p-3 hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              className="mt-0.5"
              checked={!deleteSessions}
              onChange={() => setDeleteSessions(false)}
            />
            <div>
              <p className="text-sm font-medium">Keep sessions</p>
              <p className="text-xs text-muted-foreground">
                Sessions will be removed from this group but not deleted.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer rounded-md p-3 hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              className="mt-0.5"
              checked={deleteSessions}
              onChange={() => setDeleteSessions(true)}
            />
            <div>
              <p className="text-sm font-medium">Delete all sessions</p>
              <p className="text-xs text-muted-foreground">
                The group and all {sessionCount} {sessionCount === 1 ? "session" : "sessions"} inside it will be permanently deleted.
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
