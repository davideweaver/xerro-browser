import { ExternalLink, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { FeedItem } from "@/types/feeds";

interface FeedItemPanelProps {
  item: FeedItem | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
}

export function FeedItemPanel({ item, onClose, onToggleFavorite }: FeedItemPanelProps) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 overflow-y-auto">
        {item && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="pr-8 leading-snug">{item.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                {item.source && <span>· {item.source}</span>}
                {item.topicName && <span>· {item.topicName}</span>}
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => onToggleFavorite(item.id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-400 transition-colors"
                aria-label={item.favorited ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  className="h-4 w-4"
                  fill={item.favorited ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={item.favorited ? 0 : 1.5}
                  style={{ color: item.favorited ? "#f59e0b" : undefined }}
                />
                {item.favorited ? "Favorited" : "Favorite"}
              </button>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open link
                </a>
              )}
            </div>

            {item.summary && (
              <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {item.summary}
              </div>
            )}

            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="mt-6 space-y-2">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-muted-foreground capitalize">{key}: </span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
