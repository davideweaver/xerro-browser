import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidePanelHeader } from "@/components/shared/SidePanelHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { agentsService } from "@/api/agentsService";
import { Loader2, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface FileEditorSheetProps {
  agentId: string;
  /** Existing file path (relative to workspace root), or null for new file */
  filePath: string | null;
  /** Pre-fills the path input when creating a new file */
  defaultNewPath?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function FileEditorSheet({
  agentId,
  filePath,
  defaultNewPath = "",
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: FileEditorSheetProps) {
  const isNew = filePath === null;

  const [content, setContent] = useState("");
  const [newPath, setNewPath] = useState(defaultNewPath);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load existing file content
  const { data: fileData, isLoading: isLoadingContent } = useQuery({
    queryKey: ["agent-file-content", agentId, filePath],
    queryFn: () => agentsService.viewFile(agentId, filePath!),
    enabled: !isNew && open,
  });

  // Sync loaded content into state (only once per file open)
  useEffect(() => {
    if (fileData) {
      setContent(fileData.content);
      setIsDirty(false);
    }
  }, [fileData]);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      if (isNew) {
        setContent("");
        setNewPath(defaultNewPath);
        setIsDirty(false);
      }
    }
  }, [open, isNew, defaultNewPath]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isNew) {
        const path = newPath.trim();
        if (!path) throw new Error("File path is required");
        return agentsService.createFile(agentId, path, content);
      }
      return agentsService.updateFile(agentId, filePath!, content);
    },
    onSuccess: () => {
      setIsDirty(false);
      onSaved();
      onOpenChange(false);
      toast.success(isNew ? "File created" : "File saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => agentsService.deleteFile(agentId, filePath!),
    onSuccess: () => {
      onDeleted();
      onOpenChange(false);
      setDeleteDialogOpen(false);
      toast.success("File deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fileName = isNew
    ? (newPath.split("/").pop() || "New File")
    : (filePath?.split("/").pop() ?? "");

  const canSave = isNew
    ? newPath.trim().length > 0
    : isDirty;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-2xl flex flex-col p-6">
          <SidePanelHeader
            title={isNew ? "New File" : fileName}
            description={!isNew ? filePath ?? "" : undefined}
            headerClassName="-mt-0 pt-1"
            action={
              <div className="flex items-center gap-2">
                {!isNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!canSave || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {isNew ? "Create" : "Save"}
                </Button>
              </div>
            }
          />

          <div className="mt-6 flex flex-col flex-1 gap-4">
            {isNew && (
              <div className="space-y-1.5">
                <Label>File path</Label>
                <Input
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="notes.md or skills/notes.md"
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>
            )}

            {isLoadingContent ? (
              <div className="space-y-2 flex-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-5/6" />
              </div>
            ) : (
              <textarea
                className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                style={{ minHeight: "60vh" }}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (!isNew) setIsDirty(true);
                }}
                placeholder={isNew ? "File content..." : undefined}
                spellCheck={false}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
        title="Delete File"
        description={`Are you sure you want to delete "${filePath}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        confirmLoadingText="Deleting..."
        confirmVariant="destructive"
      />
    </>
  );
}
