import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { memoryBlocksService } from "@/api/memoryBlocksService";
import { Button } from "@/components/ui/button";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import { SecondaryNavItemTitle } from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { ChevronLeft, Folder, FileText, RefreshCw, Search, History, LayoutDashboard, Brain } from "lucide-react";
import { toast } from "sonner";

interface MemoryBlocksSecondaryNavProps {
  currentBlockLabel: string | null;
  currentFolder: string;
  onFolderChange: (folder: string) => void;
  onNavigate: (path: string) => void;
  onBlockSelect?: (path: string) => void;
}

export function MemoryBlocksSecondaryNav({
  currentBlockLabel,
  currentFolder,
  onFolderChange,
  onNavigate,
  onBlockSelect,
}: MemoryBlocksSecondaryNavProps) {
  const { pathname } = useLocation();
  const isOverviewActive = pathname.startsWith("/memory/overview");
  const isSystemActive = pathname.startsWith("/memory/system");
  const isSessionsActive = pathname.startsWith("/memory/sessions");
  const isRoot = !currentFolder;

  const { data: referenceData, refetch: refetchReference } = useQuery({
    queryKey: ["memory-blocks-nav", "reference"],
    queryFn: () => memoryBlocksService.listBlocks("reference", 1),
    enabled: isRoot,
  });

  // When drilled into a subfolder
  const { data: subfolderData, refetch: refetchSubfolder } = useQuery({
    queryKey: ["memory-blocks-nav", currentFolder],
    queryFn: () => memoryBlocksService.listBlocks(currentFolder, 1),
    enabled: !isRoot,
  });

  const handleRefresh = () => {
    if (isRoot) {
      refetchReference();
    } else {
      refetchSubfolder();
    }
    toast.success("Block list refreshed");
  };

  const handleNavigate = (path: string) => {
    if (onBlockSelect) {
      onBlockSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleBlockClick = (label: string) => {
    handleNavigate(`/memory/blocks/${label}`);
  };

  // Back button: from reference/xxx or system go to root (skip top-level sections)
  const rawSegments = currentFolder.split("/").filter(Boolean);
  const handleBackClick = () => {
    if (
      (rawSegments.length <= 2 && rawSegments[0] === "reference") ||
      (rawSegments.length === 1 && rawSegments[0] === "system")
    ) {
      onFolderChange("");
    } else {
      onFolderChange(rawSegments.slice(0, -1).join("/"));
    }
  };

  // Breadcrumbs: strip leading "reference" or "system" since root is artificial
  const displaySegments = rawSegments.length > 0 &&
    (rawSegments[0] === "reference" || rawSegments[0] === "system")
    ? rawSegments.slice(1)
    : rawSegments;

  const handleBreadcrumbClick = (index: number) => {
    const crumb = displaySegments[index];
    // Find the actual path for this breadcrumb segment
    const actualIndex = rawSegments.lastIndexOf(crumb, rawSegments.length - 1);
    const newPath = rawSegments.slice(0, actualIndex + 1).join("/");
    // If newPath would be just "reference", go to root
    if (newPath === "reference" || newPath === "system") {
      onFolderChange("");
    } else {
      onFolderChange(newPath);
    }
  };

  const renderItems = (items: typeof subfolderData) => {
    if (!items) return null;
    const folders = items.blocks.filter((b) => b.isFolder);
    const files = items.blocks.filter((b) => !b.isFolder);
    return (
      <>
        {folders.map((item) => (
          <SecondaryNavItem
            key={item.label}
            isActive={false}
            onClick={() => onFolderChange(item.label)}
          >
            <Folder className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <SecondaryNavItemTitle>{item.name}</SecondaryNavItemTitle>
          </SecondaryNavItem>
        ))}
        {files.map((item) => (
          <SecondaryNavItem
            key={item.label}
            isActive={currentBlockLabel === item.label}
            onClick={() => handleBlockClick(item.label)}
          >
            <FileText className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <SecondaryNavItemTitle>{item.name}</SecondaryNavItemTitle>
          </SecondaryNavItem>
        ))}
      </>
    );
  };

  return (
    <SecondaryNavContainer
      title="Memory"
      tools={
        <>
          <SecondaryNavToolButton onClick={handleRefresh} aria-label="Refresh">
            <RefreshCw size={20} />
          </SecondaryNavToolButton>
          <SecondaryNavToolButton
            onClick={() => handleNavigate("/memory/search")}
            aria-label="Search"
          >
            <Search size={22} />
          </SecondaryNavToolButton>
        </>
      }
    >
      {/* Overview + Sessions links - always visible, above breadcrumbs */}
      <div className="px-4 pb-1">
        <div className="space-y-1">
          <SecondaryNavItem
            isActive={isOverviewActive}
            onClick={() => handleNavigate("/memory/overview")}
          >
            <LayoutDashboard className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <SecondaryNavItemTitle>Overview</SecondaryNavItemTitle>
          </SecondaryNavItem>
          <SecondaryNavItem
            isActive={isSystemActive}
            onClick={() => handleNavigate("/memory/system")}
          >
            <Brain className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <SecondaryNavItemTitle>Core Memory</SecondaryNavItemTitle>
          </SecondaryNavItem>
          <SecondaryNavItem
            isActive={isSessionsActive}
            onClick={() => handleNavigate("/memory/sessions")}
          >
            <History className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <SecondaryNavItemTitle>Sessions</SecondaryNavItemTitle>
          </SecondaryNavItem>
        </div>
      </div>
      <div className="px-6 pb-2">
        <div className="border-t border-border" />
      </div>

      {/* Breadcrumbs */}
      {displaySegments.length > 0 && (
        <div className="px-6 pb-2">
          <div className="flex items-center gap-0.5 text-sm text-muted-foreground flex-wrap">
            <span
              className="cursor-pointer hover:text-foreground transition-colors"
              onClick={() => onFolderChange("")}
            >
              Root
            </span>
            {displaySegments.map((crumb, index) => (
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

      {/* Back button */}
      {!isRoot && (
        <div className="px-6 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleBackClick}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to{" "}
            {displaySegments.length <= 1
              ? "Root"
              : displaySegments[displaySegments.length - 2]}
          </Button>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-1">
          {isRoot ? (
            <>
              {/* Reference subfolders */}
              {referenceData && renderItems(referenceData)}
            </>
          ) : (
            <>
              {subfolderData ? (
                renderItems(subfolderData)
              ) : (
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-accent/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SecondaryNavContainer>
  );
}
