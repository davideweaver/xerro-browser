import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { feedsService } from "@/api/feedsService";
import type { FeedItem } from "@/types/feeds";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { FeedItemPanel } from "@/components/feeds/FeedItemPanel";

function FeedItemCard({
  item,
  onToggleFavorite,
  onOpen,
  onArchive,
}: {
  item: FeedItem;
  onToggleFavorite: (id: string) => void;
  onOpen: (item: FeedItem) => void;
  onArchive: (id: string) => void;
}) {
  const isMobile = useIsMobile();

  return (
    <div
      className="group flex flex-col gap-1.5 rounded-lg p-3 min-w-0 h-full cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => onOpen(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug line-clamp-2 flex-1">
          {item.title}
        </span>
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
            className="h-4 w-4"
            fill={item.favorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={item.favorited ? 0 : 1.5}
            style={{ color: item.favorited ? "#f59e0b" : undefined }}
          />
        </button>
      </div>
      {item.summary && (
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
          {item.summary}
        </p>
      )}
      <div className="flex items-center justify-between mt-auto pt-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
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
    </div>
  );
}

export function FeedsSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const ws = useXerroWebSocketContext();

  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  // Per-topic carousel offset state: topicId -> page offset
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const cardsPerPage = isMobile ? 1 : 3;

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
  if (data.entries.length === 0) return null;

  return (
    <div className="space-y-6">
      {data.entries.map(({ topic, items }) => {
        const offset = offsets[topic.id] ?? 0;
        const visible = items.slice(offset, offset + cardsPerPage);
        const canPrev = offset > 0;
        const canNext = offset + cardsPerPage < items.length;

        return (
          <div key={topic.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">{topic.name}</span>
              <div className="flex items-center gap-1">
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
                    setOffsets((prev) => ({ ...prev, [topic.id]: offset + 1 }))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <button
                  onClick={() => navigate(`/home/feeds/${topic.id}`)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  View all →
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No items yet.</p>
            ) : (
              <div
                className="grid gap-2 -ml-3"
                style={{ gridTemplateColumns: `repeat(${cardsPerPage}, 1fr)` }}
              >
                {visible.map((item) => (
                  <FeedItemCard
                    key={item.id}
                    item={item}
                    onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                    onOpen={setSelectedItem}
                    onArchive={(id) => archiveMutation.mutate(id)}
                  />
                ))}
                {/* Fill empty slots so grid stays consistent */}
                {Array.from({ length: cardsPerPage - visible.length }).map(
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
