import { useQuery } from "@tanstack/react-query";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidePanelHeader } from "@/components/shared/SidePanelHeader";
import { MarkdownViewer } from "@/components/document-viewers/MarkdownViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import type { XerroSession } from "@/types/xerroProjects";

interface SessionSummarySheetProps {
  session: XerroSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionSummarySheet({
  session,
  open,
  onOpenChange,
}: SessionSummarySheetProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["session-summary", session?.id],
    queryFn: () => xerroProjectsService.getSessionSummary(session!.id),
    enabled: !!session && open,
  });

  if (!session) return null;

  const startDate = parseISO(session.startedAt);
  const description = `${format(startDate, "MMM d, yyyy")} · ${session.messageCount} message${session.messageCount !== 1 ? "s" : ""}${session.projectName ? ` · ${session.projectName}` : ""}`;

  const bodyContent = summary?.replace(/^---[\s\S]*?---\n?/, "") ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(750px,95vw)] sm:!max-w-none overflow-y-auto">
        <SidePanelHeader
          title="Session Summary"
          description={description}
        />
        <div className="mt-6">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {!isLoading && bodyContent === null && (
            <p className="text-sm text-muted-foreground">
              No summary document available for this session.
            </p>
          )}
          {!isLoading && bodyContent && (
            <MarkdownViewer content={bodyContent} documentPath="" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
