import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { documentsService } from "@/api/documentsService";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { Badge } from "@/components/ui/badge";
import { Copy, ChevronLeft, FolderOpen, RefreshCw, Trash2, AlertCircle, WifiOff, Bookmark, ChevronDown, Pencil, CheckCheck, Loader2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileDrawerButton } from "@/components/mobile/MobileBottomDrawer";
import { MobileOverflowMenu } from "@/components/mobile/MobileOverflowMenu";
import { toast } from "sonner";
import { getSearchQuery } from "@/lib/documentsSearchStorage";
import { setCurrentFolderPath, clearLastDocumentPath } from "@/lib/documentsStorage";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { useState, useCallback, useRef } from "react";
import { MarkdownViewer, ExcalidrawViewer } from "@/components/document-viewers";
import { getFileType, DocumentFileType } from "@/lib/fileTypeUtils";
import { isExcalidrawMarkdown, parseExcalidrawMarkdown } from "@/lib/excalidrawParser";
import { useDocumentChanges } from "@/hooks/use-document-changes";
import type { DocumentChangeEvent, BookmarkChangeEvent } from "@/types/websocket";

export default function DocumentDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const documentPath = params["*"] || "";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  // Check if document is bookmarked
  const { data: bookmarksData } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => documentsService.listBookmarks(),
  });

  const isBookmarked = bookmarksData?.bookmarks.some(
    (bookmark) => bookmark.path === documentPath
  ) || false;

  // Delete mutation (defined early so we can use isPending in query)
  const deleteDocumentMutation = useMutation({
    mutationFn: () => documentsService.deleteDocument(documentPath),
    onError: (error) => {
      console.error("Failed to delete document:", error);
      setDeleteDialogOpen(false);
    },
    onSuccess: () => {
      // Mark as deleted to prevent query from re-enabling
      setIsDeleted(true);

      // Close dialog immediately
      setDeleteDialogOpen(false);

      // Remove document query from cache to prevent refetch
      queryClient.removeQueries({ queryKey: ["document", documentPath] });

      // Extract parent folder path
      const pathSegments = documentPath.split("/");
      const parentPath = pathSegments.slice(0, -1).join("/");

      // Invalidate folder structure with correct query key to refresh secondary nav
      queryClient.invalidateQueries({ queryKey: ["documents-nav", parentPath] });
      queryClient.invalidateQueries({ queryKey: ["documents-nav"] });

      // Clear last document from localStorage to prevent auto-restore
      clearLastDocumentPath();

      toast.success("Document deleted successfully");

      // Navigate immediately to documents root
      navigate("/documents");
    },
  });

  // Bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        return documentsService.removeBookmark(documentPath);
      } else {
        return documentsService.addBookmark({ path: documentPath });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (error) => {
      console.error("Failed to toggle bookmark:", error);
      toast.error("Failed to update bookmark");
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: (content: string) => documentsService.updateDocument(documentPath, content),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["document", documentPath] });
      toast.success("Document saved");
    },
    onError: () => {
      toast.error("Failed to save document");
    },
  });

  // Disable query during and after deletion to prevent 500 error
  const {
    data: documentData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["document", documentPath],
    queryFn: () => documentsService.getDocument(documentPath),
    enabled: !!documentPath && !deleteDocumentMutation.isPending && !isDeleted,
  });

  // Memoize callbacks to prevent re-subscriptions
  // Note: These must come AFTER the useQuery hook so refetch is available
  const handleDocumentAdded = useCallback((event: DocumentChangeEvent) => {
    toast.success(`Document added: ${event.path}`);
    queryClient.invalidateQueries({ queryKey: ["documents-nav"] });
  }, [queryClient]);

  const handleDocumentUpdated = useCallback((event: DocumentChangeEvent) => {
    if (event.path === documentPath || event.absolutePath.endsWith(documentPath)) {
      if (!isEditing) {
        refetch();
      }
      queryClient.invalidateQueries({ queryKey: ["documents-nav"] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["documents-nav"] });
    }
  }, [documentPath, isEditing, refetch, queryClient]);

  const handleDocumentRemoved = useCallback((event: DocumentChangeEvent) => {
    if (event.path === documentPath || event.absolutePath.endsWith(documentPath)) {
      toast.error(`This document was deleted: ${event.path}`, {
        description: "Redirecting to documents...",
      });
      setIsDeleted(true);
      clearLastDocumentPath();
      queryClient.invalidateQueries({ queryKey: ["documents-nav"] });
      setTimeout(() => navigate("/documents"), 1000);
    } else {
      toast.error(`Document removed: ${event.path}`);
      queryClient.invalidateQueries({ queryKey: ["documents-nav"] });
    }
  }, [documentPath, navigate, queryClient]);

  const handleBookmarkChanged = useCallback((event: BookmarkChangeEvent) => {
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });

    if (event.path === documentPath) {
      const message = event.changeType === 'added' ? "Bookmark added" : "Bookmark removed";
      // Use toast ID to prevent duplicates - sonner will deduplicate toasts with the same ID
      toast.success(message, { id: `bookmark-${event.path}-${event.changeType}` });
    }
  }, [documentPath, queryClient]);

  // Real-time document change notifications
  const { isConnected } = useDocumentChanges({
    onAdded: handleDocumentAdded,
    onUpdated: handleDocumentUpdated,
    onRemoved: handleDocumentRemoved,
    onBookmarkChanged: handleBookmarkChanged,
  });

  // Check if we came from search
  const hasActiveSearch = !!getSearchQuery();

  // Detect file type
  const fileType = getFileType(documentPath);

  const handleEdit = () => {
    setEditContent(documentData?.content || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleSave = () => updateDocumentMutation.mutate(editContent);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const copyToClipboard = (text: string, successMessage: string) => {
    // On desktop (secure context), prefer the modern async clipboard API —
    // document.execCommand('copy') is deprecated and unreliable when called
    // from within a Radix dropdown that is managing focus during close.
    // Fall back to execCommand for mobile / non-secure contexts where the
    // async API requires an explicit clipboard-write permission grant.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success(successMessage);
        })
        .catch(() => {
          // Async API failed (e.g. document not focused) — try execCommand
          const success = copyToClipboardSync(text);
          if (success) {
            toast.success(successMessage);
          } else {
            toast.error("Failed to copy to clipboard");
          }
        });
    } else {
      const success = copyToClipboardSync(text);
      if (success) {
        toast.success(successMessage);
      } else {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const copyToClipboardSync = (text: string): boolean => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Make textarea visible and focusable
      textArea.style.position = "fixed";
      textArea.style.top = "50%";
      textArea.style.left = "50%";
      textArea.style.width = "100px";
      textArea.style.height = "100px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.style.zIndex = "9999";

      // Add to body with higher z-index than modals
      document.body.appendChild(textArea);

      // Force focus and selection
      textArea.focus();
      textArea.setSelectionRange(0, text.length);

      // Small delay to ensure focus
      const successful = document.execCommand('copy');

      document.body.removeChild(textArea);

      return successful;
    } catch (error) {
      console.error("Sync copy failed:", error);
      return false;
    }
  };

  const handleCopyContent = () => {
    if (documentData?.content) {
      let contentToCopy = documentData.content;
      let contentType = "content";

      // For Excalidraw files, copy the decompressed JSON
      if (fileType === DocumentFileType.EXCALIDRAW) {
        try {
          if (isExcalidrawMarkdown(documentData.content)) {
            const parsed = parseExcalidrawMarkdown(documentData.content);
            contentToCopy = JSON.stringify(parsed, null, 2);
            contentType = "Excalidraw JSON";
          } else {
            // Already JSON, just prettify it
            const parsed = JSON.parse(documentData.content);
            contentToCopy = JSON.stringify(parsed, null, 2);
            contentType = "Excalidraw JSON";
          }
        } catch (error) {
          // If parsing fails, copy raw content
          console.error("Failed to parse Excalidraw content:", error);
          contentType = "raw content";
        }
      }

      const capitalizedContentType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
      copyToClipboard(contentToCopy, `${capitalizedContentType} copied to clipboard`);
    }
  };

  const handleCopyAbsolutePath = () => {
    if (documentData?.absolutePath) {
      copyToClipboard(documentData.absolutePath, "Absolute path copied to clipboard");
    } else {
      toast.error("Absolute path not available", {
        description: "Try refreshing the document",
      });
    }
  };

  const handleCopyRelativePath = () => {
    if (documentPath) {
      copyToClipboard(documentPath, "Relative path copied to clipboard");
    }
  };

  const handleExcalidrawError = (error: Error) => {
    toast.error("Failed to load Excalidraw diagram", {
      description: error.message,
    });
  };

  const handleBackToSearch = () => {
    navigate("/documents/search");
  };

  const handleShowInFolder = () => {
    // Extract parent folder from document path
    const pathSegments = documentPath.split("/");
    const parentPath = pathSegments.slice(0, -1).join("/");

    if (parentPath) {
      // Update folder path in localStorage
      setCurrentFolderPath(parentPath);
      // Dispatch custom event to notify Layout of folder change
      window.dispatchEvent(
        new CustomEvent("documents-folder-change", {
          detail: { folderPath: parentPath },
        }),
      );
      toast.success("Showing folder in sidebar");
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Document refreshed");
  };

  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteDocumentMutation.mutate();
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleToggleBookmark = () => {
    toggleBookmarkMutation.mutate();
  };

  // Extract filename and clean up extension
  const pathSegments = documentPath.split("/");
  const rawFileName = pathSegments[pathSegments.length - 1];
  let fileName = rawFileName;

  if (fileType === DocumentFileType.EXCALIDRAW) {
    // Remove .excalidraw.md or .excalidraw extension
    fileName = rawFileName.replace(/\.excalidraw\.md$/, "").replace(/\.excalidraw$/, "");
  } else if (fileType === DocumentFileType.MARKDOWN) {
    // Remove .md extension for markdown files
    fileName = rawFileName.replace(/\.md$/, "");
  }

  // Format modified date
  const modifiedDate = documentData?.modified
    ? new Date(documentData.modified).toLocaleString()
    : "";

  return (
    <Container
      title={fileName || "Document"}
      description={
        <div className="flex flex-col gap-1 min-w-0 w-full">
          <span className="text-sm text-muted-foreground break-words block">
            {documentPath}
          </span>
          {modifiedDate && (
            <span className="text-xs text-muted-foreground">
              Modified: {modifiedDate}
            </span>
          )}
        </div>
      }
      tools={
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <ContainerToolButton
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={updateDocumentMutation.isPending}
              >
                {updateDocumentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 md:mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Save</span>
              </ContainerToolButton>
              <ContainerToolButton variant="destructive-solid" size="sm" onClick={handleCancelEdit} disabled={updateDocumentMutation.isPending}>
                <X className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Cancel</span>
              </ContainerToolButton>
            </>
          ) : (
            <>
              {hasActiveSearch && (
                <ContainerToolButton size="sm" onClick={handleBackToSearch}>
                  <ChevronLeft className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Back</span>
                </ContainerToolButton>
              )}
              {!isConnected && (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </Badge>
              )}
              <ContainerToolToggle
                pressed={isBookmarked}
                onPressedChange={handleToggleBookmark}
                disabled={!documentPath || toggleBookmarkMutation.isPending}
                aria-label="Toggle bookmark"
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={isBookmarked ? "currentColor" : "none"}
                />
              </ContainerToolToggle>
              {fileType === DocumentFileType.MARKDOWN && (
                <ContainerToolButton
                  size="icon"
                  onClick={handleEdit}
                  disabled={!documentData}
                >
                  <Pencil className="h-4 w-4" />
                </ContainerToolButton>
              )}
              <ContainerToolButton
                size="icon"
                onClick={handleShowInFolder}
                disabled={!documentPath}
              >
                <FolderOpen className="h-4 w-4" />
              </ContainerToolButton>

              {/* Desktop: inline buttons (hidden on mobile) */}
              <div className="hidden md:flex items-center gap-2">
                <ContainerToolButton
                  size="icon"
                  onClick={handleRefresh}
                  disabled={!documentPath}
                >
                  <RefreshCw className="h-4 w-4" />
                </ContainerToolButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <ContainerToolButton size="sm" disabled={!documentData}>
                      <Copy className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </ContainerToolButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyContent}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy content
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyAbsolutePath}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy absolute path
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyRelativePath}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy relative path
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ContainerToolButton
                  size="icon"
                  onClick={handleOpenDeleteDialog}
                  disabled={!documentPath}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </ContainerToolButton>
              </div>

              {/* Mobile: overflow drawer (hidden on desktop) */}
              <div className="md:hidden">
                <MobileOverflowMenu title="More Options" disabled={!documentData}>
                  <ContainerToolButton
                    size="icon"
                    onClick={handleRefresh}
                    disabled={!documentPath}
                    data-drawer-label="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </ContainerToolButton>
                  <MobileDrawerButton
                    onClick={handleCopyContent}
                    icon={<Copy className="h-4 w-4" />}
                  >
                    Copy content
                  </MobileDrawerButton>
                  <MobileDrawerButton
                    onClick={handleCopyAbsolutePath}
                    icon={<Copy className="h-4 w-4" />}
                  >
                    Copy absolute path
                  </MobileDrawerButton>
                  <MobileDrawerButton
                    onClick={handleCopyRelativePath}
                    icon={<Copy className="h-4 w-4" />}
                  >
                    Copy relative path
                  </MobileDrawerButton>
                  <ContainerToolButton
                    size="icon"
                    onClick={handleOpenDeleteDialog}
                    disabled={!documentPath}
                    variant="destructive"
                    data-drawer-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ContainerToolButton>
                </MobileOverflowMenu>
              </div>
            </>
          )}
        </div>
      }
    >
      {/* Frontmatter Display - hide for Excalidraw files */}
      {fileType !== DocumentFileType.EXCALIDRAW &&
        documentData?.frontmatter &&
        Object.keys(documentData.frontmatter).length > 0 && (
          <div className="mb-6 p-4 bg-accent/50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Metadata</h3>
            <div className="grid gap-2 text-sm">
              {Object.entries(documentData.frontmatter).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium text-muted-foreground shrink-0">
                    {key}:
                  </span>
                  <span className="break-all overflow-hidden">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Document Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-accent/50 rounded animate-pulse"
              // eslint-disable-next-line react-hooks/purity
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      ) : documentData ? (
        <>
          {fileType === DocumentFileType.MARKDOWN && (
            isEditing ? (
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                className="w-full min-h-[calc(100vh-220px)] p-0 font-mono text-sm bg-transparent border-none outline-none resize-none"
                spellCheck={false}
                autoFocus
              />
            ) : (
              <MarkdownViewer content={documentData.content} documentPath={documentPath} />
            )
          )}
          {fileType === DocumentFileType.EXCALIDRAW && (
            <ExcalidrawViewer
              content={documentData.content}
              onError={handleExcalidrawError}
            />
          )}
          {fileType === DocumentFileType.UNKNOWN && (
            <div className="flex items-center justify-center h-96 border rounded-lg">
              <div className="text-center p-6">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">Unsupported File Type</p>
                <p className="text-sm text-muted-foreground">
                  This file type cannot be previewed in the browser.
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Document not found</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${fileName}"? This action cannot be undone.`}
        isLoading={deleteDocumentMutation.isPending}
      />
    </Container>
  );
}
