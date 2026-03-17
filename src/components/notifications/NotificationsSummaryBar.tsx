import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { notificationsService } from "@/api/notificationsService";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

// Renders markdown as inline spans so it can be truncated in a single line
const inlineComponents = {
  p: ({ children }: any) => <span>{children} </span>,
  strong: ({ children }: any) => <strong>{children}</strong>,
  em: ({ children }: any) => <em>{children}</em>,
  code: ({ children }: any) => <code className="text-xs">{children}</code>,
  a: ({ children }: any) => <span>{children}</span>,
  h1: ({ children }: any) => <span>{children} </span>,
  h2: ({ children }: any) => <span>{children} </span>,
  h3: ({ children }: any) => <span>{children} </span>,
  ul: ({ children }: any) => <span>{children}</span>,
  ol: ({ children }: any) => <span>{children}</span>,
  li: ({ children }: any) => <span>{children} · </span>,
  blockquote: ({ children }: any) => <span>{children}</span>,
  br: () => <span> </span>,
};

export function NotificationsSummaryBar() {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadNotificationCount();

  const { data } = useQuery({
    queryKey: ["notifications", "preview"],
    queryFn: () => notificationsService.listNotifications({ read: false, limit: 1 }),
    enabled: unreadCount > 0,
  });

  if (unreadCount === 0) return null;

  const latest = data?.notifications[0];

  return (
    <button
      onClick={() => navigate("/home/notifications")}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 mb-6 rounded-lg bg-accent/40 hover:bg-accent/70 transition-colors text-left group"
    >
      <Bell className="h-4 w-4 flex-shrink-0 text-blue-400" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap">
          <span className="text-sm font-medium text-foreground flex-shrink-0">
            {unreadCount} unread
          </span>
          {latest && (
            <>
              <span className="text-muted-foreground/50 flex-shrink-0">·</span>
              <span className="text-sm text-muted-foreground flex-shrink-0">{latest.message}</span>
              {latest.context && (
                <>
                  <span className="text-muted-foreground/50 flex-shrink-0"> — </span>
                  <span className="text-sm text-muted-foreground/60 truncate min-w-0">
                    <ReactMarkdown components={inlineComponents}>
                      {latest.context}
                    </ReactMarkdown>
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
