import type { Notification } from "@/types/notifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";

interface NotificationCardProps {
  notification: Notification;
  onClick?: () => void;
  onDelete?: () => void;
}

export function NotificationCard({ notification, onClick, onDelete }: NotificationCardProps) {
  const isUnread = !notification.read;
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex items-start px-4 py-3 rounded-lg group transition-colors cursor-pointer -mx-4",
        "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row — dot only appears here */}
        <div className="flex items-center gap-2">
          {isUnread && (
            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
          )}
          <span className="text-base font-semibold leading-snug block text-foreground">
            {notification.message}
          </span>
        </div>
        {notification.context && (
          <div className="text-sm text-muted-foreground mt-0.5 leading-snug line-clamp-2 prose prose-sm dark:prose-invert prose-p:inline prose-strong:font-semibold">
            <ReactMarkdown>{notification.context.replace(/\n/g, " ")}</ReactMarkdown>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          {notification.source && (
            <span className="text-xs text-muted-foreground/70 bg-accent/50 px-1.5 py-0.5 rounded">
              {notification.source}
            </span>
          )}
          <p className="text-xs text-muted-foreground/50">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 flex-shrink-0 transition-opacity text-muted-foreground hover:text-foreground ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
