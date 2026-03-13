import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { chatService } from "@/api/chatService";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import {
  SecondaryNavItemTitle,
  SecondaryNavItemSubtitle,
} from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { NewChatDialog } from "@/components/chat-sessions/NewChatDialog";
import { Plus, RefreshCw, MessageSquare, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatSecondaryNavProps {
  selectedSessionId: string | null;
  onNavigate: (path: string) => void;
  onSessionSelect?: (path: string) => void;
}

export function ChatSecondaryNav({
  selectedSessionId,
  onNavigate,
  onSessionSelect,
}: ChatSecondaryNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => chatService.listSessions(),
    refetchInterval: 30000,
  });

  const sessions = data?.sessions ?? [];

  const handleNavigation = (path: string) => {
    if (onSessionSelect) {
      onSessionSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleSessionCreated = (sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    const path = `/chat/${sessionId}`;
    navigate(path);
    if (onSessionSelect) onSessionSelect(path);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <SecondaryNavContainer
        title="Chat"
        tools={
          <>
            <SecondaryNavToolButton onClick={() => setNewChatOpen(true)} title="New chat">
              <Plus size={20} />
            </SecondaryNavToolButton>
            <SecondaryNavToolButton
              onClick={() => onNavigate("/chat/search")}
              title="Search chats"
              className={location.pathname === "/chat/search" ? "bg-accent text-accent-foreground" : ""}
            >
              <Search size={22} />
            </SecondaryNavToolButton>
            <SecondaryNavToolButton onClick={handleRefresh} title="Refresh sessions">
              <RefreshCw size={18} />
            </SecondaryNavToolButton>
          </>
        }
      >
        {/* Session List */}
        <div className="flex-1 overflow-auto px-4 pb-4">
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No sessions yet.
              <button
                className="block mx-auto mt-2 text-primary hover:underline"
                onClick={() => setNewChatOpen(true)}
              >
                Start a new chat
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const isActive = selectedSessionId === session.id;
                const lastActivity = session.lastMessageAt ?? session.createdAt;
                return (
                  <SecondaryNavItem
                    key={session.id}
                    isActive={isActive}
                    onClick={() => handleNavigation(`/chat/${session.id}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground self-start mt-0.5" />
                    <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
                      <SecondaryNavItemTitle className="flex-1">
                        {session.name}
                      </SecondaryNavItemTitle>
                      <SecondaryNavItemSubtitle>
                        {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
                        {session.messageCount > 0 && ` • ${session.messageCount} msgs`}
                      </SecondaryNavItemSubtitle>
                      {session.config.cwd && (
                        <SecondaryNavItemSubtitle className="w-full text-left opacity-60 font-mono text-[10px]">
                          <div className="truncate w-full">
                            {(() => {
                              const parts = session.config.cwd.split('/').filter(Boolean);
                              const folderName = parts[parts.length - 1];
                              const parentFolder = parts.length > 1 ? parts[parts.length - 2] : null;
                              return (
                                <>
                                  {parentFolder && `${parentFolder}/`}
                                  <span className="text-white opacity-100">{folderName}</span>
                                </>
                              );
                            })()}
                          </div>
                        </SecondaryNavItemSubtitle>
                      )}
                    </div>
                  </SecondaryNavItem>
                );
              })}
            </div>
          )}
        </div>
      </SecondaryNavContainer>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreated={handleSessionCreated}
      />
    </>
  );
}
