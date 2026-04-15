import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/api/documentsService";
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
import { Loader2, Folder, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FolderItem } from "@/types/documents";

interface FolderPropertiesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderItem;
  parentFolderPath: string;
  onRenamed: (oldPath: string, newPath: string) => void;
  onDeleted: (path: string) => void;
}

export function FolderPropertiesSheet({
  open,
  onOpenChange,
  folder,
  parentFolderPath,
  onRenamed,
  onDeleted,
}: FolderPropertiesSheetProps) {
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState(folder.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [checkingEmpty, setCheckingEmpty] = useState(false);

  useEffect(() => {
    if (open) {
      setFolderName(folder.name);
    }
  }, [open, folder]);

  const hasNameChanged = folderName.trim() !== folder.name && folderName.trim() !== "";

  const renameMutation = useMutation({
    mutationFn: async () => {
      const trimmed = folderName.trim();
      const parentPrefix = parentFolderPath ? `${parentFolderPath}/` : "";
      const newPath = `${parentPrefix}${trimmed}`;
      return documentsService.renameFolder(folder.path, newPath);
    },
    onSuccess: (result) => {
      const newPath = result?.path ?? folder.path;
      queryClient.invalidateQueries({ queryKey: ["documents-nav", parentFolderPath] });
      toast.success("Folder renamed");
      onRenamed(folder.path, newPath);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to rename folder");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentsService.deleteFolder(folder.path),
    onSuccess: () => {
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["documents-nav", parentFolderPath] });
      toast.success("Folder deleted");
      onDeleted(folder.path);
      onOpenChange(false);
    },
    onError: (error) => {
      setShowDeleteConfirm(false);
      const msg = error instanceof Error ? error.message : "Failed to delete folder";
      toast.error(msg);
    },
  });

  const handleDeleteClick = async () => {
    setCheckingEmpty(true);
    try {
      const contents = await documentsService.getFolderStructure(folder.path);
      if (contents.length > 0) {
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
          disableAutoSafeArea
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
                  <span className="font-mono text-xs text-right break-all">
                    {folder.path || "/"}
                  </span>
                </div>
                {folder.documentCount !== undefined && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Documents</span>
                    <span>
                      {folder.documentCount}{" "}
                      {folder.documentCount === 1 ? "document" : "documents"}
                    </span>
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
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(false);
        }}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Folder"
        description={`Delete "${folder.name}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
