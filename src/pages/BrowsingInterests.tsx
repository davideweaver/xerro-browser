import { useQuery } from "@tanstack/react-query";
import Container from "@/components/container/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { browsingHistoryService } from "@/api/browsingHistoryService";

export default function BrowsingInterests() {
  const interests = useQuery({
    queryKey: ["browsing", "interests"],
    queryFn: () => browsingHistoryService.getInterests(),
  });
  const topics = useQuery({
    queryKey: ["browsing", "topics"],
    queryFn: () => browsingHistoryService.getTopics(7),
  });
  const domains = useQuery({
    queryKey: ["browsing", "domains"],
    queryFn: () => browsingHistoryService.getDomains(7, 15),
  });
  const searches = useQuery({
    queryKey: ["browsing", "searches"],
    queryFn: () => browsingHistoryService.getSearches(7, 20),
  });

  const loading = interests.isLoading || topics.isLoading || domains.isLoading;

  return (
    <Container title="Interests" loading={loading}>
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interest profile</CardTitle>
          </CardHeader>
          <CardContent>
            {interests.data?.content ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                {interests.data.content}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                No interest profile yet — enrichment runs periodically on the hub.
              </p>
            )}
          </CardContent>
        </Card>

        <div>
          <h3 className="mb-2 text-sm font-medium">Topics (last 7 days)</h3>
          {topics.data && topics.data.topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topics.data.topics.map((t) => (
                <Badge key={t.id} variant="secondary" className="text-xs">
                  {t.label}
                  <span className="ml-1.5 opacity-60">{t.visitCount}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No topics yet.</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Recent searches (last 7 days)</h3>
          {searches.data && searches.data.searches.length > 0 ? (
            <div className="space-y-1">
              {searches.data.searches.map((s) => (
                <div key={s.term} className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.term}</span>
                  {s.count > 1 && <span className="text-muted-foreground">{s.count}×</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No searches captured yet.</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Top domains (last 7 days)</h3>
          <div className="space-y-1">
            {(domains.data?.domains ?? []).map((d) => (
              <div key={d.domain} className="flex items-center justify-between text-sm">
                <span className="truncate">{d.domain}</span>
                <span className="text-muted-foreground">{d.visits}</span>
              </div>
            ))}
            {domains.data && domains.data.domains.length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
