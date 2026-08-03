import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addMonths, endOfMonth, format, parse, startOfDay, startOfMonth } from "date-fns";
import { journalService } from "@/api/journalService";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { JournalEntry } from "@/types/journal";

const MONTH_STORAGE_KEY = "journal-selected-month";

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

function parseMonth(value: string | null): Date | null {
  if (!value) return null;
  try {
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    if (!isNaN(parsed.getTime())) return startOfMonth(parsed);
  } catch {
    // ignore, fall through
  }
  return null;
}

export default function Journal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedMonth = useMemo(() => {
    return (
      parseMonth(searchParams.get("month")) ??
      parseMonth(localStorage.getItem(MONTH_STORAGE_KEY)) ??
      startOfMonth(startOfDay(new Date()))
    );
  }, [searchParams]);

  const selectMonth = useCallback(
    (date: Date) => {
      const normalized = startOfMonth(date);
      const dateString = format(normalized, "yyyy-MM-dd");
      setSearchParams({ month: dateString }, { replace: true });
      localStorage.setItem(MONTH_STORAGE_KEY, dateString);
    },
    [setSearchParams]
  );

  const monthEnd = endOfMonth(selectedMonth);
  const monthQueryKey = ["journal-month", format(selectedMonth, "yyyy-MM")];

  const { data, isLoading, refetch } = useQuery({
    queryKey: monthQueryKey,
    queryFn: () =>
      journalService.listEntries({
        after: format(selectedMonth, "yyyy-MM-dd"),
        before: format(monthEnd, "yyyy-MM-dd"),
      }),
  });

  const entries = useMemo(() => data?.entries ?? [], [data]);

  const viewEntry = (entry: JournalEntry) => {
    navigate(`/memory/journal/${entry.label}`);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Journal refreshed");
  };

  const handleThisMonth = () => selectMonth(new Date());

  const tools = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleThisMonth}>
        This Month
      </Button>
      <ContainerToolButton onClick={handleRefresh} aria-label="Refresh">
        <RefreshCw className="h-4 w-4" />
      </ContainerToolButton>
    </div>
  );

  return (
    <Container
      title="Journal"
      description="Daily synthesized narratives from the Memory Curator"
      tools={tools}
    >
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{format(selectedMonth, "MMMM yyyy")}</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => selectMonth(addMonths(selectedMonth, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => selectMonth(addMonths(selectedMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className={`transition-opacity duration-200 ${isLoading ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No journal entries this month</h3>
                <p className="text-muted-foreground text-sm">
                  The Memory Curator writes daily journal entries overnight — try a different month.
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card
                  key={entry.label}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => viewEntry(entry)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-medium text-sm">
                        {(() => {
                          try {
                            return format(
                              parse(entry.date, "yyyy-MM-dd", new Date()),
                              "EEEE, MMMM d, yyyy"
                            );
                          } catch {
                            return entry.date;
                          }
                        })()}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${significanceBadgeClass(entry.significance)}`}
                      >
                        {entry.significance || "unknown"}
                      </Badge>
                    </div>
                    {entry.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {entry.summary}
                      </p>
                    )}
                    {entry.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.themes.slice(0, 6).map((theme) => (
                          <Badge key={theme} variant="secondary" className="text-xs font-normal">
                            {theme}
                          </Badge>
                        ))}
                        {entry.themes.length > 6 && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            +{entry.themes.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
