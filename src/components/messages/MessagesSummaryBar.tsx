import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowRight } from "lucide-react";
import { messagesService } from "@/api/messagesService";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";

export function MessagesSummaryBar() {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessageCount();

  const { data } = useQuery({
    queryKey: ["messages", "preview"],
    queryFn: () => messagesService.listInbox({ limit: 1 }),
    enabled: unreadCount > 0,
  });

  if (unreadCount === 0) return null;

  const latest = data?.messages[0];

  return (
    <button
      onClick={() => navigate("/agent-tasks/messages")}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 mb-6 rounded-lg bg-accent/40 hover:bg-accent/70 transition-colors text-left group"
    >
      <MessageSquare className="h-4 w-4 flex-shrink-0 text-emerald-400" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap">
          <span className="text-sm font-medium text-foreground flex-shrink-0">
            {unreadCount} unread {unreadCount === 1 ? "message" : "messages"}
          </span>
          {latest && (
            <>
              <span className="text-muted-foreground/50 flex-shrink-0">·</span>
              <span className="text-sm text-muted-foreground flex-shrink-0">{latest.fromName}</span>
              {latest.subject && (
                <>
                  <span className="text-muted-foreground/50 flex-shrink-0"> — </span>
                  <span className="text-sm text-muted-foreground/60 truncate min-w-0">
                    {latest.subject}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}
