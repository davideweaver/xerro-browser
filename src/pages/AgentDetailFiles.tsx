import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { AgentFilePropertiesSheet } from "@/components/agents/AgentFilePropertiesSheet";
import { agentsService } from "@/api/agentsService";
import { MarkdownViewer } from "@/components/document-viewers";
import { getFileType, DocumentFileType } from "@/lib/fileTypeUtils";
import { parseFrontmatter } from "@/lib/frontmatterUtils";
import {
  FileText,
  Pencil,
  CheckCheck,
  X,
  Trash2,
  RefreshCw,
  Copy,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

export default function AgentDetailFiles() {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filePath = searchParams.get("file");

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Reset state when navigating to a different file
  useEffect(() => {
    setIsDeleted(false);
    setIsEditing(false);
    setEditContent("");
    setPropertiesOpen(false);
  }, [filePath]);

  const queryKey = ["agent-file-content", agentId, filePath];

  const { data: fileData, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => agentsService.viewFile(agentId!, filePath!),
    enabled: !!agentId && !!filePath && !isDeleted,
  });

  // Sync loaded content; auto-enter edit mode for empty new files
  useEffect(() => {
    if (fileData) {
      setEditContent(fileData.content);
      if (fileData.content === "") {
        setIsEditing(true);
      }
    }
  }, [fileData]);

  const saveMutation = useMutation({
    mutationFn: () => agentsService.updateFile(agentId!, filePath!, editContent),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey });
      toast.success("File saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => agentsService.deleteFile(agentId!, filePath!),
    onSuccess: () => {
      setIsDeleted(true);
      setDeleteDialogOpen(false);
      queryClient.removeQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["agent-files-nav", agentId] });
      toast.success("File deleted");
      navigate(`/agent-tasks/agents/${agentId}/files`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleEdit = () => {
    setEditContent(fileData?.content ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditContent(fileData?.content ?? "");
    setIsEditing(false);
  };

  const handleSave = () => saveMutation.mutate();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("File refreshed");
  };

  const handleCopyContent = () => {
    if (fileData?.content) {
      navigator.clipboard
        .writeText(fileData.content)
        .then(() => toast.success("Content copied to clipboard"))
        .catch(() => toast.error("Failed to copy to clipboard"));
    }
  };

  const handleCopyPath = () => {
    if (filePath) {
      navigator.clipboard
        .writeText(filePath)
        .then(() => toast.success("Path copied to clipboard"))
        .catch(() => toast.error("Failed to copy to clipboard"));
    }
  };

  const handlePropertiesSaved = (newPath: string) => {
    if (newPath !== filePath) {
      // File was renamed — navigate to the new path
      setSearchParams({ file: newPath });
    } else {
      // Only metadata/frontmatter changed — refresh content
      queryClient.invalidateQueries({ queryKey });
    }
  };

  const fileName = filePath?.split("/").pop() ?? "";
  const fileType = filePath ? getFileType(filePath) : DocumentFileType.UNKNOWN;
  const modifiedDate = fileData?.modified
    ? new Date(fileData.modified).toLocaleString()
    : "";

  if (!filePath) {
    return (
      <Container title="Files">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Select a file from the sidebar to view its contents.
          </p>
        </div>
      </Container>
    );
  }

  const tools = isEditing ? (
    <div className="flex items-center gap-2">
      <ContainerToolButton
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
        ) : (
          <CheckCheck className="h-4 w-4 md:mr-2" />
        )}
        <span className="hidden md:inline">Save</span>
      </ContainerToolButton>
      <ContainerToolButton
        variant="destructive-solid"
        size="sm"
        onClick={handleCancel}
        disabled={saveMutation.isPending}
      >
        <X className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Cancel</span>
      </ContainerToolButton>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <ContainerToolButton
        size="icon"
        onClick={handleEdit}
        disabled={!fileData}
        title="Edit file"
      >
        <Pencil className="h-4 w-4" />
      </ContainerToolButton>
      <ContainerToolButton
        size="icon"
        onClick={() => setPropertiesOpen(true)}
        disabled={!fileData}
        title="Properties"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </ContainerToolButton>
      <ContainerToolButton
        size="icon"
        onClick={handleRefresh}
        disabled={!filePath}
        title="Refresh"
      >
        <RefreshCw className="h-4 w-4" />
      </ContainerToolButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ContainerToolButton size="sm" disabled={!fileData}>
            <Copy className="h-4 w-4" />
            <ChevronDown className="h-3 w-3 ml-1" />
          </ContainerToolButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyContent}>
            <Copy className="h-4 w-4 mr-2" />
            Copy content
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyPath}>
            <Copy className="h-4 w-4 mr-2" />
            Copy path
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ContainerToolButton
        size="icon"
        onClick={() => setDeleteDialogOpen(true)}
        disabled={!fileData}
        variant="destructive"
        title="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </ContainerToolButton>
    </div>
  );

  return (
    <>
      <Container
        title={fileName || "File"}
        description={
          <div className="flex flex-col gap-1 min-w-0 w-full">
            <span className="text-sm text-muted-foreground break-words block">
              {filePath}
            </span>
            {modifiedDate && (
              <span className="text-xs text-muted-foreground">
                Modified: {modifiedDate}
              </span>
            )}
          </div>
        }
        tools={tools}
      >
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-accent/50 rounded animate-pulse"
                style={{ width: `${60 + (i * 17) % 40}%` }}
              />
            ))}
          </div>
        ) : fileData ? (
          isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[calc(100vh-220px)] p-0 font-mono text-sm bg-transparent border-none outline-none resize-none"
              spellCheck={false}
              autoFocus
              placeholder="File content..."
            />
          ) : fileType === DocumentFileType.MARKDOWN ? (
            (() => {
              const { fields, body } = parseFrontmatter(fileData.content);
              return (
                <>
                  {fields.length > 0 && (
                    <div className="mb-6 p-4 bg-accent/50 rounded-lg">
                      <h3 className="text-sm font-semibold mb-2">Metadata</h3>
                      <div className="grid gap-2 text-sm">
                        {fields.map(({ key, value }) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-medium text-muted-foreground shrink-0">
                              {key}:
                            </span>
                            <span className="break-all overflow-hidden">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <MarkdownViewer content={body} documentPath={filePath} />
                </>
              );
            })()
          ) : (
            <pre className="w-full text-xs font-mono whitespace-pre-wrap break-words">
              {fileData.content || (
                <span className="text-muted-foreground italic">Empty file</span>
              )}
            </pre>
          )
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">File not found</p>
          </div>
        )}
      </Container>

      {fileData && (
        <AgentFilePropertiesSheet
          open={propertiesOpen}
          onOpenChange={setPropertiesOpen}
          agentId={agentId!}
          filePath={filePath}
          fileData={fileData}
          onSaved={handlePropertiesSaved}
        />
      )}

      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
        title="Delete File"
        description={`Are you sure you want to delete "${fileName}"? This cannot be undone.`}
        isLoading={deleteMutation.isPending}
        confirmText="Delete"
        confirmLoadingText="Deleting..."
        confirmVariant="destructive"
      />
    </>
  );
}
