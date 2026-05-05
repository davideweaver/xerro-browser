import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { chatService } from "@/api/chatService";
import { NewChatDialog } from "@/components/chat-sessions/NewChatDialog";
import Container from "@/components/container/Container";
import { Button } from "@/components/ui/button";
import { MessagesSquare, Plus } from "lucide-react";

export default function ChatSessions() {
  const navigate = useNavigate();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const agentMode = localStorage.getItem("chat-nav-mode") === "agents";

  const { data, isLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => chatService.listSessions(),
  });

  const sessions = data?.sessions ?? [];

  // Auto-redirect to most recent session once loaded
  useEffect(() => {
    if (!isLoading && sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) => {
        const aTime = a.lastMessageAt ?? a.createdAt;
        const bTime = b.lastMessageAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      navigate(`/chat/${sorted[0].id}`, { replace: true });
    }
  }, [isLoading, sessions, navigate]);

  const handleSessionCreated = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };

  if (isLoading) {
    return (
      <Container title="Chat" description="Loading sessions...">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container
        title="Chat"
        description="Start a new conversation with a Claude Code agent"
        tools={
          <Button onClick={() => setNewChatOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
          <MessagesSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No chat sessions yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Start a new chat to interact with a Claude Code agent. Configure the working
            directory, permissions, and model settings for each session.
          </p>
          <Button onClick={() => setNewChatOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Start New Chat
          </Button>
        </div>
      </Container>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreated={handleSessionCreated}
        agentMode={agentMode}
      />
    </>
  );
}
