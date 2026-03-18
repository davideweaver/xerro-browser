import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useXerroWebSocketContext, } from "@/context/XerroWebSocketContext";
import { useEffect } from "react";
import Container from "@/components/container/Container";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { FeedItemPanel } from "@/components/feeds/FeedItemPanel";
import { feedsService } from "@/api/feedsService";
import type { FeedItem } from "@/types/feeds";
import { Star, ExternalLink, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function FeedItemRow({ item, onClick, onToggleFavorite }: {
  item: FeedItem;
  onClick: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className="flex items-start px-4 py-3 rounded-lg group transition-colors cursor-pointer -mx-4 hover:bg-accent/50"
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-1.5 mr-3">
        <button
          className="p-0 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          aria-label="Remove from favorites"
        >
          <Star
            className="h-5 w-5 transition-colors"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={0}
            style={{ color: "#f59e0b" }}
          />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-base font-semibold leading-snug block text-foreground">
          {item.title}
        </span>
        {item.summary && (
          <p className="text-sm text-muted-foreground leading-snug line-clamp-2 mt-0.5">
            {item.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {item.topicName && (
            <span className="text-xs text-muted-foreground/70 bg-accent/50 px-1.5 py-0.5 rounded">
              {item.topicName}
            </span>
          )}
          {item.source && (
            <span className="text-xs text-muted-foreground/70 bg-accent/50 px-1.5 py-0.5 rounded">
              {item.source}
            </span>
          )}
          <p className="text-xs text-muted-foreground/50">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

    </div>
  );
}

export default function FeedsFavorites() {
  const queryClient = useQueryClient();
  const ws = useXerroWebSocketContext();
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [groupByTopic, setGroupByTopic] = useState(() => {
    const stored = localStorage.getItem("feeds-favorites-group-by-topic");
    return stored !== null ? stored === "true" : true;
  });

  useEffect(() => {
    const unsubs = [
      ws.subscribeToFeedItemUpdated(() =>
        queryClient.invalidateQueries({ queryKey: ["feeds-favorites"] }),
      ),
      ws.subscribeToFeedItemDeleted(() =>
        queryClient.invalidateQueries({ queryKey: ["feeds-favorites"] }),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ws, queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ["feeds-favorites"],
    queryFn: () => feedsService.listItems({ favorited: true, includeArchived: true, limit: 200 }),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => feedsService.toggleFavorite(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["feeds-favorites"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((i: FeedItem) => i.id !== updated.id || updated.favorited),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
      setSelectedItem((prev) => (prev?.id === updated.id ? updated : prev));
    },
  });

  const items = data?.items ?? [];

  // Build grouped structure when groupByTopic is on
  const groupedItems: { topic: string; items: FeedItem[] }[] = groupByTopic
    ? Object.entries(
        items.reduce<Record<string, FeedItem[]>>((acc, item) => {
          const key = item.topicName ?? "Uncategorized";
          (acc[key] ??= []).push(item);
          return acc;
        }, {})
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([topic, items]) => ({ topic, items }))
    : [];

  const tools = (
    <ContainerToolToggle
      pressed={groupByTopic}
      onPressedChange={(val) => {
        setGroupByTopic(val);
        localStorage.setItem("feeds-favorites-group-by-topic", String(val));
      }}
      aria-label="Group by topic"
    >
      <Layers strokeWidth={groupByTopic ? 2.5 : 1.5} className={groupByTopic ? undefined : "opacity-40"} />
    </ContainerToolToggle>
  );

  return (
    <Container
      title="Favorites"
      loading={isLoading}
      description={`${items.length} item${items.length !== 1 ? "s" : ""}`}
      tools={tools}
    >
      {!isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No favorites yet.</p>
        </div>
      ) : groupByTopic ? (
        <div className="space-y-4">
          {groupedItems.map(({ topic, items: groupItems }) => (
            <div key={topic}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-0 pb-1 mb-1 border-b border-border/40">
                {topic}
              </div>
              <div className="space-y-1">
                {groupItems.map((item) => (
                  <FeedItemRow
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                    onToggleFavorite={() => toggleFavoriteMutation.mutate(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <FeedItemRow
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
              onToggleFavorite={() => toggleFavoriteMutation.mutate(item.id)}
            />
          ))}
        </div>
      )}

      <FeedItemPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
      />
    </Container>
  );
}
