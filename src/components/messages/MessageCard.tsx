import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MessageThread, Message } from "@/types/messages";

interface MessageThreadCardProps {
  thread: MessageThread;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

interface MessageItemCardProps {
  message: Message;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

type MessageCardProps = MessageThreadCardProps | MessageItemCardProps;

function isThreadCard(props: MessageCardProps): props is MessageThreadCardProps {
  return "thread" in props;
}

export function MessageCard(props: MessageCardProps) {
  const isMobile = useIsMobile();
  const { isActive, onClick, onDelete } = props;

  let subject: string;
  let fromName: string;
  let bodyPreview: string;
  let createdAt: string;
  let unreadCount: number;
  let messageCount: number | undefined;

  if (isThreadCard(props)) {
    const { thread } = props;
    subject = thread.subject;
    fromName = thread.latestMessage.fromId === "user"
      ? `You → ${thread.latestMessage.toName}`
      : thread.latestMessage.fromName;
    bodyPreview = thread.latestMessage.body;
    createdAt = thread.latestMessage.createdAt;
    unreadCount = thread.unreadCount;
    messageCount = thread.messageCount;
  } else {
    const { message } = props;
    subject = message.subject;
    fromName = message.fromId === "user"
      ? `You → ${message.toName}`
      : message.fromName;
    bodyPreview = message.body;
    createdAt = message.createdAt;
    unreadCount = message.read ? 0 : 1;
  }

  const isUnread = unreadCount > 0;

  return (
    <div
      className={cn(
        "flex items-start px-3 py-3 rounded-lg group cursor-pointer select-none transition-none",
        "[-webkit-tap-highlight-color:transparent]",
        "[@media(any-pointer:coarse)]:active:bg-transparent [@media(any-pointer:coarse)]:hover:bg-transparent",
        isActive
          ? "bg-accent text-accent-foreground dark:bg-accent/60"
          : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div
            className={cn(
              "flex-shrink-0 h-2 w-2 rounded-full",
              isUnread ? "bg-blue-500" : "bg-transparent"
            )}
          />
          <span
            className={cn(
              "text-sm truncate flex-1",
              isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
            )}
          >
            {fromName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm truncate flex-1",
            isUnread ? "font-medium text-foreground" : "text-foreground/70"
          )}>
            {subject}
          </span>
          {messageCount !== undefined && messageCount > 1 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {messageCount}
            </span>
          )}
          {unreadCount > 1 && (
            <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5 flex-shrink-0 leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {bodyPreview}
        </p>
      </div>

      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 flex-shrink-0 ml-2 transition-opacity text-muted-foreground hover:text-foreground",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
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
