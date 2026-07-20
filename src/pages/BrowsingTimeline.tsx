import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, endOfDay, format, subDays, addDays } from "date-fns";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { DayNavigation } from "@/components/episodes/DayNavigation";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { browsingHistoryService } from "@/api/browsingHistoryService";
import type { BrowsingVisit, SearchResult } from "@/types/browsing";
import { RefreshCw, Search as SearchIcon, ExternalLink, Layers, ChevronDown, Globe } from "lucide-react";

type RowVisit = Pick<BrowsingVisit, "id" | "url" | "title" | "domain" | "visitTime"> & {
  score?: number;
};

interface DomainGroup {
  domain: string;
  lastVisit: number;
  visits: RowVisit[];
}

/** Group a day's visits by website (domain); busiest site first. */
function buildDomainGroups(visits: RowVisit[]): DomainGroup[] {
  const byDomain = new Map<string, RowVisit[]>();
  for (const v of visits) {
    const key = v.domain || "(unknown)";
    const arr = byDomain.get(key);
    if (arr) arr.push(v);
    else byDomain.set(key, [v]);
  }
  const groups: DomainGroup[] = [];
  for (const [domain, vs] of byDomain) {
    vs.sort((a, b) => b.visitTime - a.visitTime); // newest-first within a site
    groups.push({ domain, lastVisit: vs[0].visitTime, visits: vs });
  }
  // Busiest site first; tie-break by most recent activity.
  groups.sort((a, b) => b.visits.length - a.visits.length || b.lastVisit - a.lastVisit);
  return groups;
}

function VisitRow({ visit }: { visit: RowVisit }) {
  return (
    <a
      href={visit.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors"
    >
      <div className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
        {format(new Date(visit.visitTime), "HH:mm")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{visit.title || visit.url}</div>
        <div className="truncate text-xs text-muted-foreground">{visit.domain}</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-60" />
    </a>
  );
}

function FlatList({ items, emptyText }: { items: RowVisit[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="divide-y divide-border/50">
      {items.map((v) => (
        <VisitRow key={v.id} visit={v} />
      ))}
    </div>
  );
}

export default function BrowsingTimeline() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [groupByDomain, setGroupByDomain] = useState(
    () => localStorage.getItem("browsing-group-by-domain") !== "false"
  );
  // Domains the user has expanded (default: all collapsed).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Per-day visit counts drive the day-strip badges (last 365 days).
  const stats = useQuery({
    queryKey: ["browsing", "stats", 365],
    queryFn: () => browsingHistoryService.getStats(365),
  });

  const localStats = useMemo(() => {
    const m = new Map<string, number>();
    (stats.data?.perDay ?? []).forEach((d) => m.set(d.date, d.count));
    return m;
  }, [stats.data]);

  const selectedDateString = format(selectedDate, "yyyy-MM-dd");

  const dayTimeline = useQuery({
    queryKey: ["browsing", "timeline", "day", selectedDateString],
    queryFn: () =>
      browsingHistoryService.getTimeline({
        start: startOfDay(selectedDate).getTime(),
        end: endOfDay(selectedDate).getTime(),
        limit: 500,
      }),
  });

  const search = useQuery({
    queryKey: ["browsing", "search", submitted],
    queryFn: () => browsingHistoryService.search(submitted, 50),
    enabled: submitted.length > 0,
  });

  const searching = submitted.length > 0;
  const dayVisits: RowVisit[] = dayTimeline.data?.visits ?? [];
  const groups = useMemo(() => buildDomainGroups(dayVisits), [dayVisits]);

  const toggleDomain = (domain: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  return (
    <Container
      title="Timeline"
      description={stats.data ? `${stats.data.totalVisits} visits (last 365 days)` : undefined}
      tools={
        <div className="flex items-center gap-2">
          <ContainerToolToggle
            pressed={groupByDomain}
            onPressedChange={(val) => {
              setGroupByDomain(val);
              localStorage.setItem("browsing-group-by-domain", String(val));
            }}
            aria-label="Group by website"
          >
            <Layers strokeWidth={groupByDomain ? 2.5 : 1.5} className={groupByDomain ? undefined : "opacity-40"} />
          </ContainerToolToggle>
          <ContainerToolButton
            size="icon"
            title="Capture now"
            onClick={async () => {
              await browsingHistoryService.triggerCapture();
              stats.refetch();
              dayTimeline.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </ContainerToolButton>
        </div>
      }
    >
      <div className="max-w-4xl space-y-4">
        <DayNavigation
          selectedDate={selectedDate}
          onDateSelect={(d) => setSelectedDate(startOfDay(d))}
          dateRange={{
            start: startOfDay(subDays(selectedDate, 180)).toISOString(),
            end: endOfDay(addDays(selectedDate, 180)).toISOString(),
          }}
          localStats={localStats}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(query.trim());
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all browsing history…"
              className="pl-8"
            />
          </div>
          {searching && (
            <ContainerToolButton
              type="button"
              onClick={() => {
                setQuery("");
                setSubmitted("");
              }}
            >
              Clear
            </ContainerToolButton>
          )}
        </form>

        {/* Search overrides the day view and always shows a flat list. */}
        {searching ? (
          <>
            {search.data && (
              <p className="text-xs text-muted-foreground">
                {search.data.results.length} results ({search.data.semantic ? "semantic" : "keyword"})
              </p>
            )}
            <FlatList items={search.data?.results ?? ([] as SearchResult[])} emptyText="No matches." />
          </>
        ) : !groupByDomain ? (
          <FlatList items={dayVisits} emptyText={`No browsing on ${format(selectedDate, "MMM d, yyyy")}.`} />
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No browsing on {format(selectedDate, "MMM d, yyyy")}.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => {
              const isOpen = expanded.has(g.domain);
              return (
                <Collapsible key={g.domain} open={isOpen} onOpenChange={() => toggleDomain(g.domain)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 px-2 py-2 -mx-2 rounded-md transition-colors text-muted-foreground">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                      />
                      <Globe className="h-4 w-4" />
                      <span className="text-base font-semibold tracking-wide truncate text-foreground">{g.domain}</span>
                      <span className="text-sm font-normal opacity-60">({g.visits.length})</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 divide-y divide-border/50">
                      {g.visits.map((v) => (
                        <VisitRow key={v.id} visit={v} />
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
