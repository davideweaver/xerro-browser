import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { FeedItemPanel } from "@/components/feeds/FeedItemPanel";
import { feedsService } from "@/api/feedsService";
import type { FeedItem } from "@/types/feeds";
import { Star, Trash2, ExternalLink, X, ArchiveRestore, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

interface FeedItemRowProps {
  item: FeedItem;
  onClick: () => void;
  onToggleFavorite: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}

function FeedItemRow({
  item,
  onClick,
  onToggleFavorite,
  onArchive,
  onUnarchive,
}: FeedItemRowProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex items-start px-4 py-3 rounded-lg group transition-colors cursor-pointer -mx-4 hover:bg-accent/50 ${item.archived ? "opacity-50" : ""}`}
      onClick={onClick}
    >
      {/* Favorite dot indicator */}
      <div className="flex-shrink-0 mt-1.5 mr-3">
        <button
          className="p-0 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={
            item.favorited ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Star
            className="h-5 w-5 transition-colors"
            fill={item.favorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={item.favorited ? 0 : 1.5}
            style={{
              color: item.favorited
                ? "#f59e0b"
                : "hsl(var(--muted-foreground) / 0.4)",
            }}
          />
        </button>
      </div>

      {/* Content */}
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

      {/* Action buttons */}
      <div
        className={`flex-shrink-0 flex items-center gap-0.5 transition-opacity ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        {item.archived ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Restore item"
            onClick={(e) => {
              e.stopPropagation();
              onUnarchive?.();
            }}
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Archive item"
            onClick={(e) => {
              e.stopPropagation();
              onArchive?.();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function FeedsTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ws = useXerroWebSocketContext();

  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [deleteTopicOpen, setDeleteTopicOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // ─── WebSocket real-time updates ──────────────────────────────────────────

  useEffect(() => {
    const unsubs = [
      ws.subscribeToFeedItemCreated(() =>
        queryClient.invalidateQueries({
          queryKey: ["feeds-items-topic", topicId],
        }),
      ),
      ws.subscribeToFeedItemUpdated(() =>
        queryClient.invalidateQueries({
          queryKey: ["feeds-items-topic", topicId],
          exact: false,
        }),
      ),
      ws.subscribeToFeedItemDeleted(() =>
        queryClient.invalidateQueries({
          queryKey: ["feeds-items-topic", topicId],
          exact: false,
        }),
      ),
      ws.subscribeToFeedTopicDeleted((e) => {
        if (e.id === topicId) navigate("/");
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ws, queryClient, topicId, navigate]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: topicsData } = useQuery({
    queryKey: ["feeds-topics"],
    queryFn: () => feedsService.listTopics(),
  });

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ["feeds-items-topic", topicId, showArchived, favoritesOnly],
    queryFn: () =>
      feedsService.listItems({
        topicId,
        limit: 200,
        includeArchived: showArchived,
        favorited: favoritesOnly || undefined,
      }),
    enabled: !!topicId,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => feedsService.toggleFavorite(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["feeds-items-topic", topicId, showArchived, favoritesOnly],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((i: FeedItem) =>
              i.id === updated.id ? updated : i,
            ),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
      setSelectedItem((prev) => (prev?.id === updated.id ? updated : prev));
    },
  });

  const archiveItemMutation = useMutation({
    mutationFn: (id: string) => feedsService.archiveItem(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["feeds-items-topic", topicId, showArchived, favoritesOnly],
        (old: any) => {
          if (!old) return old;
          if (showArchived) {
            return {
              ...old,
              items: old.items.map((i: FeedItem) =>
                i.id === updated.id ? updated : i,
              ),
            };
          }
          return {
            ...old,
            items: old.items.filter((i: FeedItem) => i.id !== updated.id),
          };
        },
      );
      queryClient.invalidateQueries({
        queryKey: ["feeds-items-topic", topicId],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
    },
  });

  const unarchiveItemMutation = useMutation({
    mutationFn: (id: string) => feedsService.unarchiveItem(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["feeds-items-topic", topicId, showArchived, favoritesOnly],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((i: FeedItem) =>
              i.id === updated.id ? updated : i,
            ),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id: string) => feedsService.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds-topics"] });
      queryClient.invalidateQueries({ queryKey: ["feeds-home"] });
      toast({ title: "Topic deleted" });
      navigate("/");
    },
  });

  // ─── Derived ──────────────────────────────────────────────────────────────

  const topic = topicsData?.topics.find((t) => t.id === topicId);
  const items = itemsData?.items ?? [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Container
      title={topic?.name ?? ""}
      loading={isLoading}
      description={`${items.length} item${items.length !== 1 ? "s" : ""}`}
      tools={
        <>
          <ContainerToolButton size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </ContainerToolButton>
          <ContainerToolToggle
            pressed={favoritesOnly}
            onPressedChange={setFavoritesOnly}
            title={favoritesOnly ? "Show all" : "Show favorites only"}
          >
            <Star
              strokeWidth={favoritesOnly ? 2.5 : 1.5}
              className={favoritesOnly ? "text-amber-400" : "opacity-40"}
              fill={favoritesOnly ? "currentColor" : "none"}
            />
          </ContainerToolToggle>
          <ContainerToolToggle
            pressed={showArchived}
            onPressedChange={setShowArchived}
            title={showArchived ? "Hide archived" : "Show archived"}
          >
            <ArchiveRestore
              strokeWidth={showArchived ? 2.5 : 1.5}
              className={showArchived ? undefined : "opacity-40"}
            />
          </ContainerToolToggle>
          <ContainerToolButton
            size="icon"
            onClick={() => setDeleteTopicOpen(true)}
            title="Delete topic"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </ContainerToolButton>
        </>
      }
    >
      {!isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No items yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <FeedItemRow
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
              onToggleFavorite={() => toggleFavoriteMutation.mutate(item.id)}
              onArchive={() => archiveItemMutation.mutate(item.id)}
              onUnarchive={() => unarchiveItemMutation.mutate(item.id)}
            />
          ))}
        </div>
      )}

      <FeedItemPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
      />

      <DestructiveConfirmationDialog
        open={deleteTopicOpen}
        onOpenChange={setDeleteTopicOpen}
        onCancel={() => setDeleteTopicOpen(false)}
        onConfirm={() => {
          if (topicId) {
            deleteTopicMutation.mutate(topicId);
            setDeleteTopicOpen(false);
          }
        }}
        title="Delete Topic"
        description={`Delete "${topic?.name}" and all its items? This cannot be undone.`}
      />
    </Container>
  );
}
