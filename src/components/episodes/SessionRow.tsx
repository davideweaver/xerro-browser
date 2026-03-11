import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { TimelineBar } from "./TimelineBar";
import { SessionSummarySheet } from "./SessionSummarySheet";
import { format, differenceInMinutes } from "date-fns";
import { Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { useToast } from "@/hooks/use-toast";
import type { XerroSession } from "@/types/xerroProjects";

interface SessionRowProps {
  session: XerroSession;
  showProject?: boolean;
  onSessionClick?: (sessionId: string) => void;
  onSessionDeleted?: (sessionId: string) => void;
}

export function SessionRow({
  session,
  showProject = true,
  onSessionClick,
  onSessionDeleted,
}: SessionRowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await xerroProjectsService.deleteSession(session.id);
    },
    onSuccess: () => {
      onSessionDeleted?.(session.id);
    },
    onError: (error) => {
      toast({
        title: "Error deleting session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const minDate = new Date(session.startedAt);
  const maxDate = new Date(session.lastMessageAt);
  const sameDay =
    format(minDate, "yyyy-MM-dd") === format(maxDate, "yyyy-MM-dd");

  const timeRange = `${format(minDate, "h:mm a")} - ${format(maxDate, "h:mm a")}`;

  const durationMins = differenceInMinutes(maxDate, minDate);
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const isMultiDay = !sameDay;
  const dateInfo = isMultiDay ? `Started ${format(minDate, "MMM d")}` : null;

  // Parse first message preview to extract role and content
  let previewContent = null;
  if (session.firstMessagePreview) {
    const match = session.firstMessagePreview.match(/^\[(.+?)\]:\s*(.+)$/s);
    if (match) {
      const content = match[2].trim();
      previewContent = { content };
    }
  }

  const handleClick = () => {
    if (onSessionClick) {
      onSessionClick(session.id);
    } else {
      navigate(`/memory/sessions/${encodeURIComponent(session.id)}`);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSummarySheetOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteDialogOpen(false);
    await deleteMutation.mutateAsync();
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div
        className="bg-background py-2 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors relative"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showProject && session.projectName && (
          <h3 className="text-lg font-semibold">{session.projectName}</h3>
        )}
        {session.description && (
          <p className="text-sm text-foreground mt-2">{session.description}</p>
        )}

        {/* First Message Preview */}
        {previewContent && (
          <div className="mt-2 flex justify-end">
            <div className="bg-muted text-foreground px-3 py-2 rounded-2xl text-xs max-w-[80%]">
              <span className="line-clamp-2">{previewContent.content}</span>
            </div>
          </div>
        )}

        {/* Timeline Bar */}
        <div className="mt-3">
          <TimelineBar
            startTime={session.startedAt}
            endTime={session.lastMessageAt}
            showHourMarkers={true}
            showTimeLabels={false}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {timeRange} ({duration})
          {dateInfo && ` • ${dateInfo}`} • {session.messageCount} message
          {session.messageCount !== 1 ? "s" : ""}
          {session.externalSource && ` • ${session.externalSource}`}
        </p>

        {/* Action Buttons - Show on Hover */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-md p-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleInfoClick}
              className="h-8 w-8 p-0"
              aria-label="View session summary"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteClick}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <SessionSummarySheet
        session={session}
        open={summarySheetOpen}
        onOpenChange={setSummarySheetOpen}
      />

      {/* Delete Confirmation Dialog */}
      <DestructiveConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Session"
        description={`Are you sure you want to delete this session${session.projectName ? ` from ${session.projectName}` : ""}? This action cannot be undone.`}
      />
    </>
  );
}
