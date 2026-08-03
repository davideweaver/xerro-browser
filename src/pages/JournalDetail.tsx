import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { journalService } from "@/api/journalService";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { MarkdownViewer } from "@/components/document-viewers";

function significanceBadgeClass(significance: string): string {
  switch (significance) {
    case "high":
      return "text-red-500 border-red-500/30 bg-red-500/10";
    case "medium":
      return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    default:
      return "text-muted-foreground border-border bg-muted/40";
  }
}

export default function JournalDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const label = params["*"] || "";

  const {
    data: entry,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["journal-entry", label],
    queryFn: () => journalService.getEntry(label),
    enabled: !!label,
  });

  const fm = entry?.frontmatter as
    | (Record<string, unknown> & {
        date?: string;
        kind?: string;
        significance?: string;
        themes?: string[];
        people?: string[];
        projects?: string[];
      })
    | undefined;

  const dateLabel = (() => {
    if (!fm?.date) return "";
    try {
      return format(parseISO(String(fm.date)), "EEEE, MMMM d, yyyy");
    } catch {
      return String(fm.date);
    }
  })();

  // Full timeline for this journal kind, used to find the adjacent entry for prev/next nav.
  const kind = fm?.kind;
  const { data: timelineData } = useQuery({
    queryKey: ["journal-timeline", kind],
    queryFn: () => journalService.listEntries({ kind }),
    enabled: !!kind,
  });

  const { previousEntry, nextEntry } = useMemo(() => {
    const list = timelineData?.entries ?? [];
    const index = list.findIndex((item) => item.label === label);
    if (index === -1) return { previousEntry: undefined, nextEntry: undefined };
    // List is sorted newest-first: the following item is older, the preceding item is newer.
    return { previousEntry: list[index + 1], nextEntry: list[index - 1] };
  }, [timelineData, label]);

  const handleCopy = () => {
    if (entry?.content) {
      navigator.clipboard.writeText(entry.content).then(() => {
        toast.success("Content copied to clipboard");
      });
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Journal entry refreshed");
  };

  const handleBack = () => {
    navigate("/memory/journal");
  };

  const handlePrevious = () => {
    if (previousEntry) navigate(`/memory/journal/${previousEntry.label}`);
  };

  const handleNext = () => {
    if (nextEntry) navigate(`/memory/journal/${nextEntry.label}`);
  };

  const tools = (
    <>
      <ContainerToolButton size="sm" onClick={handleBack}>
        <ChevronLeft className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Back</span>
      </ContainerToolButton>
      <ContainerToolButton
        onClick={handlePrevious}
        aria-label="Previous day"
        title="Previous day"
        disabled={!previousEntry}
      >
        <ChevronLeft className="h-4 w-4" />
      </ContainerToolButton>
      <ContainerToolButton
        onClick={handleNext}
        aria-label="Next day"
        title="Next day"
        disabled={!nextEntry}
      >
        <ChevronRight className="h-4 w-4" />
      </ContainerToolButton>
      <ContainerToolButton onClick={handleCopy} aria-label="Copy content" title="Copy content">
        <Copy className="h-4 w-4" />
      </ContainerToolButton>
      <ContainerToolButton onClick={handleRefresh} aria-label="Refresh" title="Refresh">
        <RefreshCw className="h-4 w-4" />
      </ContainerToolButton>
    </>
  );

  const titleNode = <span>{dateLabel || label.split("/").pop()}</span>;

  const descriptionNode = entry ? (
    <span className="flex items-center gap-1.5 flex-wrap mt-1">
      {fm?.kind && (
        <Badge variant="secondary" className="text-xs font-normal">
          {fm.kind}
        </Badge>
      )}
      {fm?.significance && (
        <Badge variant="outline" className={`text-xs ${significanceBadgeClass(fm.significance)}`}>
          {fm.significance}
        </Badge>
      )}
      {fm?.themes?.map((theme) => (
        <Badge key={theme} variant="secondary" className="text-xs font-normal">
          {theme}
        </Badge>
      ))}
      {fm?.projects?.map((project) => (
        <Badge key={project} variant="outline" className="text-xs font-normal">
          {project}
        </Badge>
      ))}
      {fm?.people?.map((person) => (
        <Badge key={person} variant="outline" className="text-xs font-normal">
          {person}
        </Badge>
      ))}
    </span>
  ) : undefined;

  return (
    <Container
      title={isLoading ? undefined : titleNode}
      description={isLoading ? undefined : descriptionNode}
      tools={!isLoading ? tools : undefined}
      loading={isLoading}
    >
      {!isLoading && entry && (
        <MarkdownViewer content={entry.content} documentPath={entry.path} />
      )}
    </Container>
  );
}
