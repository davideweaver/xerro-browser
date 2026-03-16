import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { chatService } from "@/api/chatService";
import type { ChatGroup } from "@/types/xerroChat";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import {
  SecondaryNavItemTitle,
  SecondaryNavItemSubtitle,
} from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { Button } from "@/components/ui/button";
import { SecondaryNavSearch } from "@/components/navigation/SecondaryNavSearch";
import { NewChatDialog } from "@/components/chat-sessions/NewChatDialog";
import { NewGroupDialog } from "@/components/chat-sessions/NewGroupDialog";
import { DeleteGroupDialog } from "@/components/chat-sessions/DeleteGroupDialog";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import {
  Plus, MessageSquare, Search, X,
  Folder, FolderPlus, MoreHorizontal, ChevronLeft, Pencil, Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const RECENT_GROUPS_LIMIT = 5;
const NAV_STORAGE_KEY = "chat-nav-state";

type NavView = "main" | "all-groups" | "group-sessions";

function loadNavState(): { view: NavView; groupParentView: NavView; activeGroupId: string | null } {
  try {
    const stored = sessionStorage.getItem(NAV_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { view: "main", groupParentView: "main", activeGroupId: null };
}

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

  const [storedNavState] = useState(loadNavState);
  const [view, setView] = useState<NavView>(storedNavState.view);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [groupParentView, setGroupParentView] = useState<NavView>(storedNavState.groupParentView);
  const [groupSearch, setGroupSearch] = useState("");

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<ChatGroup | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => chatService.listSessions(),
    refetchInterval: 30000,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["chat-groups"],
    queryFn: () => chatService.listGroups(),
    refetchInterval: 30000,
  });

  const { data: groupSessionsData, isLoading: groupSessionsLoading } = useQuery({
    queryKey: ["chat-group-sessions", activeGroup?.id],
    queryFn: () => chatService.getGroupSessions(activeGroup!.id),
    enabled: view === "group-sessions" && !!activeGroup,
    refetchInterval: 30000,
  });

  // Restore activeGroup from storage once groupsData is available
  useEffect(() => {
    if (!storedNavState.activeGroupId || !groupsData?.groups || activeGroup) return;
    const group = groupsData.groups.find((g) => g.id === storedNavState.activeGroupId);
    if (group) {
      setActiveGroup(group);
    } else {
      // Group no longer exists — fall back to main
      setView("main");
    }
  }, [groupsData]);

  // Persist nav state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
        view,
        groupParentView,
        activeGroupId: activeGroup?.id ?? null,
      }));
    } catch {}
  }, [view, groupParentView, activeGroup]);

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => chatService.updateGroup(id, name),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      if (activeGroup?.id === updated.id) setActiveGroup(updated);
      setRenameGroupId(null);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["chat-group-sessions", activeGroup?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
      if (deleteSessionId === selectedSessionId) navigate("/chat");
      setDeleteSessionId(null);
    },
  });

  const allGroups = groupsData?.groups ?? [];
  const recentGroups = allGroups.slice(0, RECENT_GROUPS_LIMIT);
  const hasMoreGroups = allGroups.length > RECENT_GROUPS_LIMIT;
  const sessions = sessionsData?.sessions ?? [];
  const ungroupedSessions = sessions.filter((s) => !s.groupId);
  const groupSessions = groupSessionsData?.sessions ?? [];

  const sessionToDelete = (view === "group-sessions" ? groupSessions : sessions)
    .find((s) => s.id === deleteSessionId);

  const handleNavigation = (path: string) => {
    if (onSessionSelect) onSessionSelect(path);
    else onNavigate(path);
  };

  const handleSessionCreated = (sessionId: string) => {
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
    queryClient.invalidateQueries({ queryKey: ["chat-group-sessions", activeGroup?.id] });
    const path = `/chat/${sessionId}`;
    navigate(path);
    if (onSessionSelect) onSessionSelect(path);
  };

  const handleGroupCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
  };

  const handleGroupDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-groups"] });
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    setDeleteGroup(null);
    setView("main");
    setActiveGroup(null);
  };

  const handleGroupClick = (group: ChatGroup) => {
    setGroupParentView(view);
    setActiveGroup(group);
    setView("group-sessions");
  };

  const handleBack = () => {
    setView(view === "group-sessions" ? groupParentView : "main");
    setActiveGroup(null);
    setRenameGroupId(null);
    setGroupSearch("");
  };

  const handleRenameStart = (e: React.MouseEvent, group: ChatGroup) => {
    e.stopPropagation();
    setRenameGroupId(group.id);
    setRenameValue(group.name);
  };

  const handleRenameSubmit = (id: string) => {
    if (!renameValue.trim()) { setRenameGroupId(null); return; }
    renameMutation.mutate({ id, name: renameValue.trim() });
  };

  const renderGroupItem = (group: ChatGroup) => (
    <SecondaryNavItem
      key={group.id}
      isActive={false}
      onClick={() => handleGroupClick(group)}
    >
      <Folder className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground self-start mt-0.5" fill="currentColor" />
      <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
        <SecondaryNavItemTitle>{group.name}</SecondaryNavItemTitle>
        <SecondaryNavItemSubtitle>
          {group.sessionCount ?? 0} {(group.sessionCount ?? 0) === 1 ? "session" : "sessions"}
          {group.lastSessionActivity && (
            <> · {formatDistanceToNow(new Date(group.lastSessionActivity), { addSuffix: true })}</>
          )}
        </SecondaryNavItemSubtitle>
      </div>
    </SecondaryNavItem>
  );

  const renderSessionItem = (session: typeof sessions[0]) => {
    const isActive = selectedSessionId === session.id;
    const lastActivity = session.lastMessageAt ?? session.createdAt;
    return (
      <div key={session.id} className="group/row">
        <SecondaryNavItem
          isActive={isActive}
          onClick={() => handleNavigation(`/chat/${session.id}`)}
        >
          <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground self-start mt-0.5" />
          <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
            <SecondaryNavItemTitle className="flex-1">{session.name}</SecondaryNavItemTitle>
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
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteSessionId(session.id); }}
            title="Delete session"
            className="flex-shrink-0 self-center ml-1 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/row:opacity-100 [@media(pointer:coarse)]:opacity-100"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </SecondaryNavItem>
      </div>
    );
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
            {view !== "group-sessions" && (
              <SecondaryNavToolButton onClick={() => setNewGroupOpen(true)} title="New group">
                <FolderPlus size={18} />
              </SecondaryNavToolButton>
            )}
            <SecondaryNavToolButton
              onClick={() => handleNavigation("/chat/search")}
              title="Search chats"
              className={location.pathname === "/chat/search" ? "bg-accent text-accent-foreground" : ""}
            >
              <Search size={22} />
            </SecondaryNavToolButton>
          </>
        }
      >
        {/* Back button for drill-down views */}
        {(view === "all-groups" || view === "group-sessions") && (
          <div className="px-4 pb-2">
            {view === "group-sessions" && activeGroup && (
              <div className="flex items-center gap-2 px-3 pb-1">
                <Folder className="h-5 w-5 text-muted-foreground flex-shrink-0" fill="currentColor" />
                {renameGroupId === activeGroup.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(activeGroup.id);
                      if (e.key === "Escape") setRenameGroupId(null);
                    }}
                    onBlur={() => handleRenameSubmit(activeGroup.id)}
                    className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-base font-semibold"
                  />
                ) : (
                  <span className="text-base font-semibold truncate flex-1">{activeGroup.name}</span>
                )}
                <button
                  onClick={(e) => handleRenameStart(e, activeGroup)}
                  title="Rename group"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteGroup(activeGroup)}
                  title="Delete group"
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {view === "all-groups" && (
              <div className="mb-1">
                <SecondaryNavSearch
                  placeholder="Search groups..."
                  value={groupSearch}
                  onChange={setGroupSearch}
                />
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 pb-4 touch-pan-y">
          {/* ── Main view ── */}
          {view === "main" && (
            <>
              {sessionsLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentGroups.map(renderGroupItem)}

                  {hasMoreGroups && (
                    <button
                      onClick={() => setView("all-groups")}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span>See more</span>
                    </button>
                  )}

                  {allGroups.length > 0 && ungroupedSessions.length > 0 && (
                    <div className="h-px bg-border/50 my-2" />
                  )}

                  {ungroupedSessions.map(renderSessionItem)}

                  {sessions.length === 0 && allGroups.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No sessions yet.
                      <button
                        className="block mx-auto mt-2 text-primary hover:underline"
                        onClick={() => setNewChatOpen(true)}
                      >
                        Start a new chat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── All groups view ── */}
          {view === "all-groups" && (
            <div className="space-y-0.5">
              {(() => {
                const filtered = allGroups.filter((g) =>
                  g.name.toLowerCase().includes(groupSearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      {groupSearch ? "No matching groups." : "No groups yet."}
                    </div>
                  );
                }
                return filtered.map(renderGroupItem);
              })()}
            </div>
          )}

          {/* ── Group sessions view ── */}
          {view === "group-sessions" && (
            <>
              {groupSessionsLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : groupSessions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No sessions in this group.
                  <button
                    className="block mx-auto mt-2 text-primary hover:underline"
                    onClick={() => setNewChatOpen(true)}
                  >
                    Start a new chat
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {groupSessions.map(renderSessionItem)}
                </div>
              )}
            </>
          )}
        </div>
      </SecondaryNavContainer>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreated={handleSessionCreated}
        initialGroupId={view === "group-sessions" ? activeGroup?.id : undefined}
      />

      <NewGroupDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        onCreated={handleGroupCreated}
      />

      <DeleteGroupDialog
        open={deleteGroup !== null}
        onOpenChange={(open) => { if (!open) setDeleteGroup(null); }}
        group={deleteGroup}
        onDeleted={handleGroupDeleted}
      />

      <DestructiveConfirmationDialog
        open={deleteSessionId !== null}
        onOpenChange={(open) => { if (!open) setDeleteSessionId(null); }}
        onConfirm={() => { if (deleteSessionId) deleteSessionMutation.mutate(deleteSessionId); }}
        onCancel={() => setDeleteSessionId(null)}
        title="Delete chat session?"
        description={`"${sessionToDelete?.name ?? "This session"}" and all its messages will be permanently deleted.`}
        isLoading={deleteSessionMutation.isPending}
        confirmText="Delete"
        confirmLoadingText="Deleting..."
      />
    </>
  );
}
