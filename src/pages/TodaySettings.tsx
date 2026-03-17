import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown } from "lucide-react";
import Container from "@/components/container/Container";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useFeedsConfig } from "@/hooks/use-feeds-config";
import { feedsService } from "@/api/feedsService";
import type { FeedTopicConfig, FeedTopicStyle } from "@/hooks/use-feeds-config";
import type { FeedTopic } from "@/types/feeds";

function mergeWithTopics(topics: FeedTopic[], config: FeedTopicConfig[]): FeedTopicConfig[] {
  const configuredIds = new Set(config.map((c) => c.topicId));
  const stillValid = config.filter((c) => topics.some((t) => t.id === c.topicId));
  const unconfigured = topics
    .filter((t) => !configuredIds.has(t.id))
    .map((t) => ({ topicId: t.id, style: "standard" as FeedTopicStyle, enabled: true }));
  return [...stillValid, ...unconfigured];
}

export default function TodaySettings() {
  const { config, setConfig } = useFeedsConfig();

  const { data: topicsData } = useQuery({
    queryKey: ["feeds-topics"],
    queryFn: () => feedsService.listTopics(),
  });

  const topics = topicsData?.topics ?? [];
  const merged = mergeWithTopics(topics, config);

  const update = (topicId: string, patch: Partial<FeedTopicConfig>) => {
    const next = merged.map((c) => (c.topicId === topicId ? { ...c, ...patch } : c));
    setConfig(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...merged];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setConfig(next);
  };

  const topicName = (topicId: string) =>
    topics.find((t) => t.id === topicId)?.name ?? topicId;

  return (
    <Container title="Today">
      <div className="space-y-1">
        {merged.map((cfg, i) => (
          <div key={cfg.topicId} className="flex items-center gap-3 py-2 px-1 rounded-lg">
            <Switch
              checked={cfg.enabled}
              onCheckedChange={(v) => update(cfg.topicId, { enabled: v })}
            />
            <span className="flex-1 text-sm font-medium truncate">
              {topicName(cfg.topicId)}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant={cfg.style === "standard" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => update(cfg.topicId, { style: "standard" })}
              >
                Standard
              </Button>
              <Button
                variant={cfg.style === "large" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => update(cfg.topicId, { style: "large" })}
              >
                Large
              </Button>
            </div>
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={i === merged.length - 1}
                onClick={() => move(i, 1)}
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
