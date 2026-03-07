import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/api/documentsService";
import { Button } from "@/components/ui/button";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import {
  SecondaryNavItemTitle,
  SecondaryNavItemSubtitle,
} from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { Search, ChevronLeft, Folder, FileText, RefreshCw, PenTool, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { getFileType, DocumentFileType } from "@/lib/fileTypeUtils";

const DOCUMENTS_VIEW_MODE_KEY = "documents-view-mode";

interface DocumentsSecondaryNavProps {
  currentDocumentPath: string | null;
  currentFolderPath: string;
  onFolderChange: (path: string) => void;
  onNavigate: (path: string) => void;
  onDocumentSelect?: (path: string) => void;
}

export function DocumentsSecondaryNav({
  currentDocumentPath,
  currentFolderPath,
  onFolderChange,
  onNavigate,
  onDocumentSelect,
}: DocumentsSecondaryNavProps) {
  // Initialize view mode from localStorage
  const [viewMode, setViewMode] = useState<"folders" | "bookmarks">(() => {
    const saved = localStorage.getItem(DOCUMENTS_VIEW_MODE_KEY);
    return (saved === "bookmarks" ? "bookmarks" : "folders") as "folders" | "bookmarks";
  });

  // Persist view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(DOCUMENTS_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Folders to hide from the navigation (configured via environment variable)
  const HIDDEN_FOLDERS = import.meta.env.VITE_HIDDEN_FOLDERS
    ? import.meta.env.VITE_HIDDEN_FOLDERS.split(",").map((f: string) => f.trim()).filter(Boolean)
    : [];

  // Fetch folder structure
  const {
    data: rawItems = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["documents-nav", currentFolderPath],
    queryFn: () =>
      documentsService.getFolderStructure(currentFolderPath || undefined),
    enabled: viewMode === "folders",
  });

  // Fetch bookmarks
  const {
    data: bookmarksData,
    isLoading: bookmarksLoading,
    refetch: refetchBookmarks,
  } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => documentsService.listBookmarks(),
    // Always keep the query enabled so it fetches immediately when toggled
    // and stays in cache for quick switching
  });

  // Filter out hidden folders (only if HIDDEN_FOLDERS is configured)
  const items = HIDDEN_FOLDERS.length > 0
    ? rawItems.filter(
        (item) => item.type !== "folder" || !HIDDEN_FOLDERS.includes(item.name)
      )
    : rawItems;

  // Build breadcrumbs from the folder path
  const breadcrumbs = currentFolderPath
    ? currentFolderPath.split("/").filter(Boolean)
    : [];

  const handleBackClick = () => {
    if (breadcrumbs.length === 0) return; // Can't go back from root
    const allSegments = currentFolderPath.split("/").filter(Boolean);
    const parentPath = allSegments.slice(0, -1).join("/");
    onFolderChange(parentPath || "");
  };

  const handleDocumentClick = (documentPath: string) => {
    const path = `/documents/${documentPath}`;
    if (onDocumentSelect) {
      onDocumentSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    // Reconstruct path from breadcrumbs
    const newPath = breadcrumbs.slice(0, index + 1).join("/");
    onFolderChange(newPath);
  };

  const handleRefresh = () => {
    if (viewMode === "folders") {
      refetch();
      toast.success("Folder list refreshed");
    } else {
      refetchBookmarks();
      toast.success("Bookmarks refreshed");
    }
  };

  return (
    <SecondaryNavContainer
      title="Documents"
      mobileTitle="Docs"
      tools={
        <>
          <SecondaryNavToolButton
            onClick={() => setViewMode(viewMode === "bookmarks" ? "folders" : "bookmarks")}
            aria-label="Toggle bookmarks view"
          >
            <Bookmark
              size={20}
              fill={viewMode === "bookmarks" ? "currentColor" : "none"}
            />
          </SecondaryNavToolButton>
          <SecondaryNavToolButton onClick={handleRefresh}>
            <RefreshCw size={20} />
          </SecondaryNavToolButton>
          <SecondaryNavToolButton
            onClick={() => {
              const path = "/documents/search";
              if (onDocumentSelect) {
                onDocumentSelect(path);
              } else {
                onNavigate(path);
              }
            }}
          >
            <Search size={22} />
          </SecondaryNavToolButton>
        </>
      }
    >
      {/* Breadcrumbs or Bookmarks Title */}
      {viewMode === "folders" ? (
        <>
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="px-6 pb-2">
              <div className="flex items-center gap-0.5 text-sm text-muted-foreground flex-wrap">
                <span
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => onFolderChange("")}
                >
                  Root
                </span>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    <span className="mx-1">/</span>
                    <span
                      className="cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleBreadcrumbClick(index)}
                    >
                      {crumb}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back Button */}
          {breadcrumbs.length > 0 && (
            <div className="px-6 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={handleBackClick}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to{" "}
                {breadcrumbs.length === 1
                  ? "Root"
                  : breadcrumbs[breadcrumbs.length - 2]}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="px-6 pb-2">
          <h3 className="text-lg font-semibold">Bookmarks</h3>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {viewMode === "folders" ? (
          // Folders view
          <>
            {isLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-accent/50 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No documents in this folder
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((item) => {
                  const isActiveDocument =
                    item.type === "document" && currentDocumentPath === item.path;

                  if (item.type === "folder") {
                    return (
                      <SecondaryNavItem
                        key={item.path}
                        isActive={false}
                        onClick={() => onFolderChange(item.path)}
                      >
                        <Folder className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <SecondaryNavItemTitle>{item.name}</SecondaryNavItemTitle>
                          {item.documentCount !== undefined && (
                            <SecondaryNavItemSubtitle>
                              {item.documentCount}{" "}
                              {item.documentCount === 1 ? "document" : "documents"}
                            </SecondaryNavItemSubtitle>
                          )}
                        </div>
                      </SecondaryNavItem>
                    );
                  }

                  // Determine icon based on file type
                  const documentFileType = getFileType(item.path);
                  const DocumentIcon = documentFileType === DocumentFileType.EXCALIDRAW
                    ? PenTool
                    : FileText;

                  // Clean up display name
                  let displayName = item.name;
                  if (documentFileType === DocumentFileType.EXCALIDRAW) {
                    // Remove .excalidraw.md or .excalidraw extension
                    displayName = item.name.replace(/\.excalidraw\.md$/, "").replace(/\.excalidraw$/, "");
                  } else if (documentFileType === DocumentFileType.MARKDOWN) {
                    // Remove .md extension for markdown files
                    displayName = item.name.replace(/\.md$/, "");
                  }

                  return (
                    <SecondaryNavItem
                      key={item.path}
                      isActive={isActiveDocument}
                      onClick={() => handleDocumentClick(item.path)}
                    >
                      <DocumentIcon className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground self-start mt-0.5" />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <SecondaryNavItemTitle>
                          {displayName}
                        </SecondaryNavItemTitle>
                        <SecondaryNavItemSubtitle>
                          {new Date(item.modified).toLocaleDateString()}
                        </SecondaryNavItemSubtitle>
                      </div>
                    </SecondaryNavItem>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // Bookmarks view
          <>
            {bookmarksLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-accent/50 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : !bookmarksData || bookmarksData.bookmarks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No bookmarks yet
              </div>
            ) : (
              <div className="space-y-1">
                {bookmarksData.bookmarks.map((bookmark) => {
                  const isActiveDocument = currentDocumentPath === bookmark.path;

                  // Determine icon based on file type
                  const documentFileType = getFileType(bookmark.path);
                  const DocumentIcon = documentFileType === DocumentFileType.EXCALIDRAW
                    ? PenTool
                    : FileText;

                  // Extract filename and directory path from bookmark path
                  const pathSegments = bookmark.path.split("/");
                  const fileName = pathSegments[pathSegments.length - 1];
                  const directoryPath = pathSegments.slice(0, -1).join("/");

                  // Clean up display name
                  let displayName = fileName;
                  if (documentFileType === DocumentFileType.EXCALIDRAW) {
                    displayName = fileName.replace(/\.excalidraw\.md$/, "").replace(/\.excalidraw$/, "");
                  } else if (documentFileType === DocumentFileType.MARKDOWN) {
                    displayName = fileName.replace(/\.md$/, "");
                  }

                  return (
                    <SecondaryNavItem
                      key={bookmark.path}
                      isActive={isActiveDocument}
                      onClick={() => handleDocumentClick(bookmark.path)}
                    >
                      <DocumentIcon className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground self-start mt-0.5" />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <SecondaryNavItemTitle>
                          {displayName}
                        </SecondaryNavItemTitle>
                        <SecondaryNavItemSubtitle className="truncate w-full" style={{ direction: 'rtl' }}>
                          <span style={{ direction: 'ltr', unicodeBidi: 'bidi-override', textAlign: 'left', display: 'block' }}>
                            {directoryPath}
                          </span>
                        </SecondaryNavItemSubtitle>
                      </div>
                    </SecondaryNavItem>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </SecondaryNavContainer>
  );
}
