import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import { ChevronLeft, ChevronRight, Star, ExternalLink, X, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { feedsService } from "@/api/feedsService";
import type { FeedItem } from "@/types/feeds";
import type { FeedTopicConfig, FeedTopicStyle } from "@/hooks/use-feeds-config";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { FeedItemPanel } from "@/components/feeds/FeedItemPanel";

interface CardProps {
  item: FeedItem;
  onToggleFavorite: (id: string) => void;
  onOpen: (item: FeedItem) => void;
  onArchive: (id: string) => void;
}

function CardFooter({
  item,
  onToggleFavorite,
  onArchive,
  isMobile,
  iconSize = "h-4 w-4",
}: {
  item: FeedItem;
  onToggleFavorite: (id: string) => void;
  onArchive: (id: string) => void;
  isMobile: boolean;
  iconSize?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-auto pt-1 gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
          aria-label={
            item.favorited ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Star
            className={iconSize}
            fill={item.favorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={item.favorited ? 0 : 1.5}
            style={{ color: item.favorited ? "#f59e0b" : undefined }}
          />
        </button>
        <span className="text-xs text-muted-foreground truncate">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          {item.source && ` · ${item.source}`}
        </span>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArchive(item.id);
        }}
        className={`flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors ${isMobile ? "" : "opacity-0 group-hover:opacity-100"}`}
        aria-label="Archive item"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FeedItemCard({
  item,
  onToggleFavorite,
  onOpen,
  onArchive,
}: CardProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className="group flex flex-col gap-1.5 rounded-lg p-3 min-w-0 h-full"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className="group/title cursor-pointer flex flex-col gap-1.5 flex-1 min-w-0"
        onClick={() => onOpen(item)}
      >
        <span className="text-sm font-medium leading-snug line-clamp-2 group-hover/title:underline decoration-1 underline-offset-2">
          {item.title}
        </span>
        {item.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {item.summary}
          </p>
        )}
      </div>
      <CardFooter
        item={item}
        onToggleFavorite={onToggleFavorite}
        onArchive={onArchive}
        isMobile={isMobile}
      />
    </div>
  );
}

function FeedItemCardLarge({
  item,
  onToggleFavorite,
  onOpen,
  onArchive,
}: CardProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className="group flex flex-col gap-3 rounded-lg p-4 min-w-0 h-full"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className="group/title cursor-pointer flex flex-col gap-3 flex-1 min-w-0"
        onClick={() => onOpen(item)}
      >
        <span className="text-xl font-semibold leading-snug group-hover/title:underline decoration-1 underline-offset-2">
          {item.title}
        </span>
        {item.summary && (
          <p className="text-base text-muted-foreground">{item.summary}</p>
        )}
      </div>
      <CardFooter
        item={item}
        onToggleFavorite={onToggleFavorite}
        onArchive={onArchive}
        isMobile={isMobile}
        iconSize="h-5 w-5"
      />
    </div>
  );
}

export function FeedsSection({ config = [] }: { config?: FeedTopicConfig[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const ws = useXerroWebSocketContext();

  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  // Per-topic carousel offset state: topicId -> page offset (desktop only)
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const cardsPerPage = 3;

  // Per-topic rotation pause state
  const [pausedTopics, setPausedTopics] = useState<Set<string>>(new Set());
  const activeEntriesRef = useRef<{ topicId: string; itemCount: number; pageSize: number }[]>([]);

  // Invalidate feeds-home on any feed event
  useEffect(() => {
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
    const unsubs = [
      ws.subscribeToFeedTopicCreated(invalidate),
      ws.subscribeToFeedTopicDeleted(invalidate),
      ws.subscribeToFeedItemCreated(invalidate),
      ws.subscribeToFeedItemUpdated(invalidate),
      ws.subscribeToFeedItemDeleted(invalidate),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ws, queryClient]);

  // Auto-rotate sections marked as rotating
  useEffect(() => {
    const interval = setInterval(() => {
      setOffsets((prev) => {
        const next = { ...prev };
        for (const { topicId, itemCount, pageSize } of activeEntriesRef.current) {
          if (pausedTopics.has(topicId)) continue;
          const current = next[topicId] ?? 0;
          const maxOffset = itemCount - pageSize;
          next[topicId] = current >= maxOffset ? 0 : current + 1;
        }
        return next;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [pausedTopics]);

  const { data, isLoading } = useQuery({
    queryKey: ["feeds-home"],
    queryFn: () => feedsService.getHome(20),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => feedsService.archiveItem(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(["feeds-home"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.map((entry: any) => ({
            ...entry,
            items: entry.items.filter((item: FeedItem) => item.id !== id),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => feedsService.toggleFavorite(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["feeds-home"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.map((entry: any) => ({
            ...entry,
            items: entry.items.map((item: FeedItem) =>
              item.id === updated.id ? updated : item,
            ),
          })),
        };
      });
      setSelectedItem((prev) => (prev?.id === updated.id ? updated : prev));
    },
  });

  if (isLoading || !data) return null;

  // Filter to topics with items, then apply config: order, enabled filter, style
  const withItems = data.entries.filter(({ items }) => items.length > 0);

  function resolveEntries() {
    const entryMap = new Map(withItems.map((e) => [e.topic.id, e]));
    const configuredIds = new Set(config.map((c) => c.topicId));
    const ordered = [
      ...config.filter((c) => entryMap.has(c.topicId)),
      ...withItems
        .filter((e) => !configuredIds.has(e.topic.id))
        .map((e) => ({
          topicId: e.topic.id,
          style: "standard" as FeedTopicStyle,
          enabled: true,
          rotating: false,
        })),
    ];
    return ordered
      .filter((c) => c.enabled)
      .map((c) => {
        const entry = entryMap.get(c.topicId)!;
        return { ...entry, style: c.style, rotating: c.rotating ?? false };
      });
  }

  const activeEntries = resolveEntries();

  // Keep ref updated for the rotation interval
  activeEntriesRef.current = activeEntries.map(({ topic, items, style, rotating }) => {
    const pageSize = style === "large" ? 1 : cardsPerPage;
    return rotating ? { topicId: topic.id, itemCount: items.length, pageSize } : null;
  }).filter((x): x is { topicId: string; itemCount: number; pageSize: number } => x !== null);

  if (activeEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No feed items to show.</p>
    );
  }

  return (
    <div className="space-y-6">
      {activeEntries.map(({ topic, items, style, rotating }) => {
        const isLarge = style === "large";
        const pageSize = isLarge ? 1 : cardsPerPage;
        const CardComponent = isLarge ? FeedItemCardLarge : FeedItemCard;

        const offset = offsets[topic.id] ?? 0;
        const visible = items.slice(offset, offset + pageSize);
        const canPrev = offset > 0;
        const canNext = offset + pageSize < items.length;
        const isPaused = pausedTopics.has(topic.id);

        return (
          <div key={topic.id} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                {topic.name}
              </span>
              <div className="flex items-center gap-1">
                {!isMobile && (
                  <>
                    {rotating && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 [&_svg]:size-[13px]"
                        onClick={() =>
                          setPausedTopics((prev) => {
                            const next = new Set(prev);
                            if (next.has(topic.id)) next.delete(topic.id);
                            else next.add(topic.id);
                            return next;
                          })
                        }
                      >
                        {isPaused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={!canPrev}
                      onClick={() =>
                        setOffsets((prev) => ({
                          ...prev,
                          [topic.id]: Math.max(0, offset - 1),
                        }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={!canNext}
                      onClick={() =>
                        setOffsets((prev) => ({
                          ...prev,
                          [topic.id]: offset + 1,
                        }))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <button
                  onClick={() => navigate(`/home/feeds/${topic.id}`)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  View all →
                </button>
              </div>
            </div>

            {isMobile ? (
              // Mobile: CSS scroll snap — browser handles swiping natively
              <div
                className="-ml-3"
                style={{
                  display: "flex",
                  overflowX: "scroll",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}
                  >
                    <CardComponent
                      item={item}
                      onToggleFavorite={(id) =>
                        toggleFavoriteMutation.mutate(id)
                      }
                      onOpen={setSelectedItem}
                      onArchive={(id) => archiveMutation.mutate(id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Desktop: grid with chevron pagination
              <div
                className="grid gap-2 -ml-3"
                style={{ gridTemplateColumns: `repeat(${pageSize}, 1fr)` }}
              >
                {visible.map((item) => (
                  <CardComponent
                    key={item.id}
                    item={item}
                    onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                    onOpen={setSelectedItem}
                    onArchive={(id) => archiveMutation.mutate(id)}
                  />
                ))}
                {Array.from({ length: pageSize - visible.length }).map(
                  (_, i) => (
                    <div key={`empty-${i}`} />
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}

      <FeedItemPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
      />
    </div>
  );
}
