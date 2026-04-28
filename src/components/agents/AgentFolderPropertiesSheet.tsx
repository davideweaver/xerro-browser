import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsService } from "@/api/agentsService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { Folder, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AgentFolderPropertiesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  folderPath: string;
  parentFolderPath: string;
  onRenamed: (oldPath: string, newPath: string) => void;
  onDeleted: () => void;
}

export function AgentFolderPropertiesSheet({
  open,
  onOpenChange,
  agentId,
  folderPath,
  parentFolderPath,
  onRenamed,
  onDeleted,
}: AgentFolderPropertiesSheetProps) {
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checkingEmpty, setCheckingEmpty] = useState(false);

  const currentName = folderPath.split("/").pop() ?? folderPath;

  useEffect(() => {
    if (open) {
      setFolderName(currentName);
    }
  }, [open, currentName]);

  const hasNameChanged = folderName.trim() !== "" && folderName.trim() !== currentName;

  // Fetch contents for item count display
  const { data: contentsData } = useQuery({
    queryKey: ["agent-folder-contents", agentId, folderPath],
    queryFn: () => agentsService.listFiles(agentId, folderPath),
    enabled: open && !!folderPath,
  });

  const itemCount = (contentsData?.files.length ?? 0) + (contentsData?.folders.length ?? 0);

  const renameMutation = useMutation({
    mutationFn: async () => {
      const trimmed = folderName.trim();
      const newPath = parentFolderPath ? `${parentFolderPath}/${trimmed}` : trimmed;
      return agentsService.renameFolder(agentId, folderPath, newPath);
    },
    onSuccess: (result) => {
      const newPath = result.path;
      queryClient.invalidateQueries({ queryKey: ["agent-files-nav", agentId] });
      toast.success("Folder renamed");
      onRenamed(folderPath, newPath);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => agentsService.deleteFolder(agentId, folderPath),
    onSuccess: () => {
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["agent-files-nav", agentId] });
      toast.success("Folder deleted");
      onDeleted();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setShowDeleteConfirm(false);
      toast.error(err.message);
    },
  });

  const handleDeleteClick = async () => {
    setCheckingEmpty(true);
    try {
      const contents = await agentsService.listFiles(agentId, folderPath);
      if (contents.files.length > 0 || contents.folders.length > 0) {
        toast.error("Cannot delete folders that contain files or subfolders");
      } else {
        setShowDeleteConfirm(true);
      }
    } catch {
      toast.error("Failed to check folder contents");
    } finally {
      setCheckingEmpty(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col overflow-hidden w-full sm:max-w-[480px]"
        >
          <SheetHeader className="flex-none pt-6 pb-2 px-6">
            <SheetTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-muted-foreground" />
              Folder Properties
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-6 py-4">
            {/* Folder Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Folder Name</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hasNameChanged) renameMutation.mutate();
                }}
              />
            </div>

            <Separator />

            {/* Info */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Information</Label>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Path</span>
                  <span className="font-mono text-xs text-right break-all">{folderPath}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Items</span>
                  <span>
                    {contentsData
                      ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
                      : "—"}
                  </span>
                </div>
                {contentsData && contentsData.folders.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Subfolders</span>
                    <span>{contentsData.folders.length}</span>
                  </div>
                )}
                {contentsData && contentsData.files.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Files</span>
                    <span>{contentsData.files.length}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
              <p className="text-sm text-muted-foreground">
                Folders must be empty before they can be deleted.
              </p>
              <Button
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                onClick={handleDeleteClick}
                disabled={checkingEmpty || deleteMutation.isPending}
              >
                {checkingEmpty ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Folder
                  </>
                )}
              </Button>
            </div>
          </div>

          <SheetFooter className="flex-none border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => renameMutation.mutate()}
              disabled={renameMutation.isPending || !hasNameChanged}
            >
              {renameMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DestructiveConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false); }}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Folder"
        description={`Delete "${currentName}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
