import { useState, useEffect } from "react";
import type { Notification } from "@/types/notifications";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidePanelHeader } from "@/components/shared/SidePanelHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, MessageSquare, FolderOpen, Activity, Send, ExternalLink } from "lucide-react";
import { notificationsService } from "@/api/notificationsService";
import ReactMarkdown from "react-markdown";

interface NotificationDetailSheetProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
}

function slackUrlKey(notificationId: string) {
  return `notification-slack-url-${notificationId}`;
}

export function NotificationDetailSheet({
  notification,
  open,
  onOpenChange,
  onMarkAsRead,
  onMarkAsUnread,
}: NotificationDetailSheetProps) {
  const [isSending, setIsSending] = useState(false);
  const [slackThreadUrl, setSlackThreadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const saved = localStorage.getItem(slackUrlKey(notification.id));
      setSlackThreadUrl(saved ?? null);
    } else {
      setSlackThreadUrl(null);
    }
  }, [notification]);

  if (!notification) return null;

  async function handleSendToSlack() {
    if (!notification) return;
    setIsSending(true);
    try {
      const result = await notificationsService.sendDirectMessage(notification);
      localStorage.setItem(slackUrlKey(notification.id), result.threadUrl);
      setSlackThreadUrl(result.threadUrl);
    } catch {
      // toast already shown by service
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SidePanelHeader
          title={notification.message}
          description={
            notification.read ? (
              <button
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Mark as unread"
                onClick={() => onMarkAsUnread?.(notification.id)}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 hover:bg-blue-400 transition-colors" />
                Read {formatDistanceToNow(new Date(notification.readAt!), { addSuffix: true })}
              </button>
            ) : (
              <button
                className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                title="Mark as read"
                onClick={() => onMarkAsRead?.(notification.id)}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Unread
              </button>
            )
          }
        />

        <div className="space-y-4 mt-6">
          {/* Context Card */}
          {notification.context && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm font-medium text-muted-foreground">Context</div>
                </div>
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{notification.context}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Send to Slack */}
            {slackThreadUrl ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Sent to Slack
                </span>
                <a
                  href={slackThreadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Open in Slack
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendToSlack}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to Slack
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Metadata Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Created timestamp */}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created
                  </div>
                  <div className="text-sm">
                    {format(new Date(notification.createdAt), "PPpp")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {/* Source */}
              {notification.source && (
                <div className="flex items-start gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Source
                    </div>
                    <Badge variant="secondary">{notification.source}</Badge>
                  </div>
                </div>
              )}

              {/* Working Directory */}
              {notification.workingDirectory && (
                <div className="flex items-start gap-3">
                  <FolderOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Working Directory
                    </div>
                    <div className="text-xs font-mono bg-accent/50 px-2 py-1 rounded break-all">
                      {notification.workingDirectory}
                    </div>
                  </div>
                </div>
              )}

              {/* Session ID */}
              {notification.sessionId && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 mt-0.5" /> {/* Spacer for alignment */}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Session ID
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {notification.sessionId}
                    </div>
                  </div>
                </div>
              )}

              {/* Notification ID */}
              <div className="flex items-start gap-3 pt-3 border-t">
                <div className="h-4 w-4 mt-0.5" /> {/* Spacer for alignment */}
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Notification ID
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {notification.id}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
