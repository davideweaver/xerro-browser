import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesService } from "@/api/messagesService";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { SecondaryNavToolToggle } from "@/components/navigation/SecondaryNavToolToggle";
import { MessageCard } from "@/components/messages/MessageCard";
import { ComposeMessage } from "@/components/messages/ComposeMessage";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MailOpen, Pencil } from "lucide-react";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import type { MessageThread } from "@/types/messages";

interface MessagesSecondaryNavProps {
  selectedThreadId: string | null;
  onNavigate: (path: string) => void;
  onThreadSelect?: (path: string) => void;
}

export function MessagesSecondaryNav({
  selectedThreadId,
  onNavigate,
  onThreadSelect,
}: MessagesSecondaryNavProps) {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { subscribeToMessageCreated, subscribeToMessageUpdated, subscribeToThreadDeleted } =
    useXerroWebSocketContext();

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => messagesService.listThreads(),
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => messagesService.deleteThread(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
      if (threadId === selectedThreadId) {
        handleNavigation("/inbox");
      }
    },
  });

  useEffect(() => {
    const unsub1 = subscribeToMessageCreated(() => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-sent"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    });
    const unsub2 = subscribeToMessageUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    });
    const unsub3 = subscribeToThreadDeleted(() => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribeToMessageCreated, subscribeToMessageUpdated, subscribeToThreadDeleted, queryClient]);

  const allThreads = threadsData?.threads || [];
  const threads = showUnreadOnly ? allThreads.filter((t) => t.unreadCount > 0) : allThreads;

  const handleNavigation = (path: string) => {
    if (onThreadSelect) {
      onThreadSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const tools = (
    <>
      <SecondaryNavToolToggle
        pressed={showUnreadOnly}
        onPressedChange={setShowUnreadOnly}
        title={showUnreadOnly ? "Show all messages" : "Show unread only"}
      >
        <MailOpen size={20} strokeWidth={showUnreadOnly ? 2.5 : 2} />
      </SecondaryNavToolToggle>
      <SecondaryNavToolButton onClick={() => setComposeOpen(true)} title="Compose message">
        <Pencil size={20} />
      </SecondaryNavToolButton>
    </>
  );

  return (
    <>
      <SecondaryNavContainer title="Inbox" tools={tools}>
        <div className="flex-1 overflow-auto px-2 pb-4">
          {threadsLoading ? (
            <div className="space-y-1 px-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[70px] w-full rounded-lg" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No messages yet</div>
          ) : (
            <div className="space-y-0.5">
              {threads.map((thread: MessageThread) => (
                <MessageCard
                  key={thread.threadId}
                  thread={thread}
                  isActive={thread.threadId === selectedThreadId}
                  onClick={() => handleNavigation(`/inbox/${thread.threadId}`)}
                  onDelete={() => setThreadToDelete(thread.threadId)}
                />
              ))}
            </div>
          )}
        </div>
      </SecondaryNavContainer>

      <ComposeMessage open={composeOpen} onOpenChange={setComposeOpen} />

      <DestructiveConfirmationDialog
        open={threadToDelete !== null}
        onOpenChange={(open) => { if (!open) setThreadToDelete(null); }}
        onConfirm={() => {
          if (threadToDelete) deleteThreadMutation.mutate(threadToDelete);
          setThreadToDelete(null);
        }}
        onCancel={() => setThreadToDelete(null)}
        title="Delete Thread"
        description="Are you sure you want to delete this entire conversation? All messages will be permanently removed."
        isLoading={deleteThreadMutation.isPending}
        confirmText="Delete Thread"
        confirmLoadingText="Deleting..."
      />
    </>
  );
}
