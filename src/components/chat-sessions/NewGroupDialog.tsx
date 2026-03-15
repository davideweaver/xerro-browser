import { useState, useEffect } from "react";
import { chatService } from "@/api/chatService";
import { BaseDialog } from "@/components/BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function NewGroupDialog({ open, onOpenChange, onCreated }: NewGroupDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await chatService.createGroup(name.trim());
      onCreated();
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
      <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
        {isSubmitting ? "Creating..." : "Create"}
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Group"
      footer={footer}
      footerHeight={64}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">Group Name</Label>
          <Input
            id="group-name"
            placeholder="My group"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            autoFocus
          />
        </div>
      </div>
    </BaseDialog>
  );
}
