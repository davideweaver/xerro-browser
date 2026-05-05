import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { MessageThreadView } from "@/components/messages/MessageThreadView";
import { messagesService } from "@/api/messagesService";
import { MailOpen, MessagesSquare, X } from "lucide-react";

export default function AgentTaskMessages() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteThreadOpen, setDeleteThreadOpen] = useState(false);

  // Fetch thread to get subject for the page title.
  // React Query deduplicates this with MessageThreadView's identical query.
  const { data: messages } = useQuery({
    queryKey: ["message-thread", threadId],
    queryFn: () => messagesService.getThread(threadId!),
    enabled: !!threadId,
  });

  const agentMessage = Array.isArray(messages)
    ? messages.find(m => m.fromId !== "user")
    : undefined;
  const fromName = agentMessage?.fromName ?? "";
  const subject = agentMessage?.subject ?? messages?.[0]?.subject ?? "";

  const deleteThreadMutation = useMutation({
    mutationFn: () => messagesService.deleteThread(threadId!),
    onSuccess: () => {
      setDeleteThreadOpen(false);
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
      navigate("/inbox");
    },
  });

  const handleMarkUnread = () => {
    const lastAgentMessage = Array.isArray(messages)
      ? [...messages].reverse().find(m => m.fromId !== "user")
      : undefined;
    if (!lastAgentMessage) return;
    // Navigate first so MessageThreadView unmounts before the WS event arrives,
    // preventing the auto-mark-as-read effect from re-firing.
    navigate("/inbox");
    messagesService.markUnread(lastAgentMessage.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
    });
  };

  if (!threadId) {
    return (
      <Container title="Inbox" description="Select a conversation from the sidebar">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MessagesSquare className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No conversation selected
          </p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container
        title={fromName || "Thread"}
        description={subject || undefined}
        content="fixed"
        bodyHorzPadding={0}
        tools={
          <>
            <ContainerToolButton
              size="icon"
              onClick={handleMarkUnread}
              title="Mark as unread"
            >
              <MailOpen />
            </ContainerToolButton>
            <ContainerToolButton
              variant="destructive"
              size="icon"
              onClick={() => setDeleteThreadOpen(true)}
              disabled={deleteThreadMutation.isPending}
            >
              <X />
            </ContainerToolButton>
          </>
        }
      >
        <MessageThreadView threadId={threadId} />
      </Container>

      <DestructiveConfirmationDialog
        open={deleteThreadOpen}
        onOpenChange={setDeleteThreadOpen}
        onConfirm={() => deleteThreadMutation.mutate()}
        onCancel={() => setDeleteThreadOpen(false)}
        title="Delete Thread"
        description="Are you sure you want to delete this entire conversation? All messages will be permanently removed."
        isLoading={deleteThreadMutation.isPending}
        confirmText="Delete Thread"
        confirmLoadingText="Deleting..."
      />
    </>
  );
}
