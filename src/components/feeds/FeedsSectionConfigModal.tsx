import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { FeedTopic } from "@/types/feeds";
import type { FeedTopicConfig, FeedTopicStyle } from "@/hooks/use-feeds-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: FeedTopic[];
  config: FeedTopicConfig[];
  onConfigChange: (config: FeedTopicConfig[]) => void;
}

function mergeWithTopics(topics: FeedTopic[], config: FeedTopicConfig[]): FeedTopicConfig[] {
  const configuredIds = new Set(config.map((c) => c.topicId));
  const stillValid = config.filter((c) => topics.some((t) => t.id === c.topicId));
  const unconfigured = topics
    .filter((t) => !configuredIds.has(t.id))
    .map((t) => ({ topicId: t.id, style: "standard" as FeedTopicStyle, enabled: true }));
  return [...stillValid, ...unconfigured];
}

export function FeedsSectionConfigModal({
  open,
  onOpenChange,
  topics,
  config,
  onConfigChange,
}: Props) {
  const [local, setLocal] = useState<FeedTopicConfig[]>([]);

  useEffect(() => {
    if (open) setLocal(mergeWithTopics(topics, config));
  }, [open, topics, config]);

  const topicName = (topicId: string) =>
    topics.find((t) => t.id === topicId)?.name ?? topicId;

  const update = (topicId: string, patch: Partial<FeedTopicConfig>) =>
    setLocal((prev) =>
      prev.map((c) => (c.topicId === topicId ? { ...c, ...patch } : c)),
    );

  const move = (index: number, dir: -1 | 1) => {
    const next = [...local];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setLocal(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Today</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 mt-2">
          {local.map((cfg, i) => (
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
                  disabled={i === local.length - 1}
                  onClick={() => move(i, 1)}
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfigChange(local);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
