import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/api/documentsService";
import { BaseDialog } from "@/components/BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentPath: string;
  onMove: (newPath: string) => void;
  isMoving?: boolean;
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  documentPath,
  onMove,
  isMoving,
}: MoveDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [browsePath, setBrowsePath] = useState(() =>
    documentPath.split("/").slice(0, -1).join("/"),
  );
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fileName = documentPath.split("/").pop() || "";
  const currentDocumentFolder = documentPath.split("/").slice(0, -1).join("/");
  const destinationPath = browsePath ? `${browsePath}/${fileName}` : fileName;
  const isSameLocation = destinationPath === documentPath;

  const breadcrumbs = browsePath ? browsePath.split("/").filter(Boolean) : [];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["documents-nav", browsePath],
    queryFn: () => documentsService.getFolderStructure(browsePath || undefined),
    enabled: open,
  });

  const folders = items.filter((item) => item.type === "folder");

  const createFolderMutation = useMutation({
    mutationFn: (path: string) => documentsService.createFolder(path),
    onSuccess: (_, path) => {
      setShowNewFolder(false);
      setNewFolderName("");
      queryClient.invalidateQueries({
        queryKey: ["documents-nav", browsePath],
      });
      setBrowsePath(path);
      toast.success("Folder created");
    },
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Failed to create folder";
      if (msg.includes("409") || msg.toLowerCase().includes("already exists")) {
        toast.error("A folder with that name already exists");
      } else {
        toast.error(msg);
      }
    },
  });

  const handleBack = () => {
    setBrowsePath(browsePath.split("/").filter(Boolean).slice(0, -1).join("/"));
  };

  const handleBreadcrumb = (index: number) => {
    setBrowsePath(breadcrumbs.slice(0, index + 1).join("/"));
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolderMutation.mutate(browsePath ? `${browsePath}/${name}` : name);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setBrowsePath(currentDocumentFolder);
    }
    setShowNewFolder(false);
    setNewFolderName("");
    onOpenChange(isOpen);
  };

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isMoving}
      >
        Cancel
      </Button>
      <Button
        onClick={() => onMove(destinationPath)}
        disabled={isMoving || isSameLocation}
      >
        {isMoving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Moving...
          </>
        ) : (
          "Move Here"
        )}
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Move Document"
      footer={footer}
      footerHeight={64}
      variant="floating"
      floatingClassName="md:min-h-[600px]"
    >
      <div className="space-y-4">
        {/* Breadcrumbs + Back button */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-0.5 text-sm text-muted-foreground flex-wrap">
            <span
              className="cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setBrowsePath("")}
            >
              Root
            </span>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-0.5">
                <ChevronRight className="h-3.5 w-3.5" />
                <span
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleBreadcrumb(index)}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </div>
          {breadcrumbs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to{" "}
              {breadcrumbs.length === 1
                ? "Root"
                : breadcrumbs[breadcrumbs.length - 2]}
            </Button>
          )}
        </div>

        {/* Folder list */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No subfolders here
              </div>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.path}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left border-b last:border-b-0"
                  onClick={() => setBrowsePath(folder.path)}
                >
                  <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* New folder */}
        {showNewFolder ? (
          <div className="flex gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowNewFolder(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        )}

        {/* Destination preview */}
        <div className="text-xs text-muted-foreground bg-accent/50 rounded-md px-3 py-2">
          <span className="font-medium">Destination:</span>{" "}
          <span className="font-mono">{destinationPath}</span>
        </div>
      </div>
    </BaseDialog>
  );
}
