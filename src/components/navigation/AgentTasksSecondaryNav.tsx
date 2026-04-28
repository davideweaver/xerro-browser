import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { agentTasksService } from "@/api/agentTasksService";
import { agentsService } from "@/api/agentsService";
import { messagesService } from "@/api/messagesService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import {
  SecondaryNavItemTitle,
  SecondaryNavItemSubtitle,
} from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavToolButton } from "@/components/navigation/SecondaryNavToolButton";
import { SecondaryNavToolToggle } from "@/components/navigation/SecondaryNavToolToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentFolderPropertiesSheet } from "@/components/agents/AgentFolderPropertiesSheet";
import {
  Search,
  Clock,
  RefreshCw,
  Activity,
  Bot,
  BotOff,
  MessagesSquare,
  Pencil,
  CheckCheck,
  ChevronLeft,
  CalendarClock,
  Settings,
  Zap,
  MessageSquare,
  Folder,
  File,
  FileText,
  Plus,
  FolderPlus,
  FilePlus,
  Check,
  X,
  Settings2,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTaskConfigUpdates } from "@/hooks/use-task-config-updates";
import { useTasksRunning } from "@/hooks/use-tasks-running";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import { MessageCard } from "@/components/messages/MessageCard";
import { ComposeMessage } from "@/components/messages/ComposeMessage";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { toast } from "sonner";
import type { MessageThread } from "@/types/messages";
import type { AgentSection } from "@/types/agents";

interface AgentTasksSecondaryNavProps {
  selectedTaskId: string | null;
  selectedThreadId?: string | null;
  selectedAgentId: string | null;
  currentView: "history" | "scheduled" | "activity" | "messages" | "agent";
  onNavigate: (path: string) => void;
  onTaskSelect?: (path: string) => void;
}

const STORAGE_KEY = "agent-tasks-show-disabled";

const AGENT_SECTIONS: { id: AgentSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "config", label: "Config", icon: Settings },
  { id: "triggers", label: "Triggers", icon: Zap },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

function getFileNavIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["md", "txt", "rst", "mdx"].includes(ext ?? "")) return FileText;
  return File;
}

export function AgentTasksSecondaryNav({
  selectedTaskId,
  selectedThreadId,
  selectedAgentId,
  currentView,
  onNavigate,
  onTaskSelect,
}: AgentTasksSecondaryNavProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const isTasksRunning = useTasksRunning();
  const [composeOpen, setComposeOpen] = useState(false);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const { pathname, search: locationSearch } = useLocation();

  const [showDisabled, setShowDisabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  // Agent files state
  const [agentFilesFolder, setAgentFilesFolder] = useState("");
  const [creatingFileItem, setCreatingFileItem] = useState<"file" | "folder" | null>(null);
  const [newFileItemName, setNewFileItemName] = useState("");
  const [folderForProperties, setFolderForProperties] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(showDisabled));
  }, [showDisabled]);

  // Reset folder state when agent changes
  useEffect(() => {
    setAgentFilesFolder("");
    setCreatingFileItem(null);
    setFolderForProperties(null);
  }, [selectedAgentId]);

  const queryClient = useQueryClient();
  const { subscribeToMessageCreated, subscribeToMessageUpdated, subscribeToThreadDeleted } =
    useXerroWebSocketContext();

  useTaskConfigUpdates();

  const inMessages = currentView === "messages";
  const inScheduled = currentView === "scheduled";
  const inAgent = currentView === "agent";

  // Current agent sub-section and selected file from URL
  const agentSection = pathname.split("/").pop() as AgentSection | undefined;
  const selectedFilePath = new URLSearchParams(locationSearch).get("file");

  // Breadcrumbs for file tree
  const fileBreadcrumbs = agentFilesFolder
    ? agentFilesFolder.split("/").map((seg, i, arr) => ({
        label: seg,
        path: arr.slice(0, i + 1).join("/"),
      }))
    : [];

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: () => messagesService.getUnreadCount(),
    refetchInterval: 60_000,
  });

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => messagesService.listThreads(),
    enabled: inMessages,
  });

  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["agent-tasks-nav", debouncedSearch],
    queryFn: () => agentTasksService.listTasks(),
    enabled: inScheduled,
  });

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents-nav"],
    queryFn: () => agentsService.listAgents(),
    enabled: !inMessages && !inScheduled && !inAgent,
  });

  const { data: agentDetail } = useQuery({
    queryKey: ["agent", selectedAgentId],
    queryFn: () => agentsService.getAgent(selectedAgentId!),
    enabled: inAgent && !!selectedAgentId,
  });

  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ["agent-files-nav", selectedAgentId, agentFilesFolder],
    queryFn: () => agentsService.listFiles(selectedAgentId!, agentFilesFolder || undefined),
    enabled: inAgent && !!selectedAgentId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const markAllReadMutation = useMutation({
    mutationFn: () => messagesService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => messagesService.deleteThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread-count"] });
    },
  });

  const createAgentFileMutation = useMutation({
    mutationFn: (name: string) => {
      const path = agentFilesFolder ? `${agentFilesFolder}/${name}` : name;
      return agentsService.createFile(selectedAgentId!, path, "");
    },
    onSuccess: (fileContent) => {
      setCreatingFileItem(null);
      setNewFileItemName("");
      refetchFiles();
      handleNavigation(
        `/agent-tasks/agents/${selectedAgentId}/files?file=${encodeURIComponent(fileContent.path)}`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createAgentFolderMutation = useMutation({
    mutationFn: (name: string) => {
      const path = agentFilesFolder ? `${agentFilesFolder}/${name}` : name;
      return agentsService.createFolder(selectedAgentId!, path);
    },
    onSuccess: () => {
      setCreatingFileItem(null);
      setNewFileItemName("");
      refetchFiles();
      toast.success("Folder created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Real-time message updates ──────────────────────────────────────────────

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

  // ── Helpers ────────────────────────────────────────────────────────────────

  const tasks = tasksData?.tasks || [];
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesEnabled = showDisabled || task.enabled;
    return matchesSearch && matchesEnabled;
  });

  const agents = agentsData?.agents || [];
  const threads = threadsData?.threads || [];
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const handleNavigation = (path: string) => {
    if (onTaskSelect) {
      onTaskSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleConfirmNewItem = () => {
    const name = newFileItemName.trim();
    if (!name) return;
    if (creatingFileItem === "file") {
      createAgentFileMutation.mutate(name);
    } else if (creatingFileItem === "folder") {
      createAgentFolderMutation.mutate(name);
    }
  };

  const handleCancelNewItem = () => {
    setCreatingFileItem(null);
    setNewFileItemName("");
  };

  const handleFolderBack = () => {
    if (!agentFilesFolder) return;
    const parts = agentFilesFolder.split("/");
    setAgentFilesFolder(parts.slice(0, -1).join("/"));
  };

  // ── Title & Tools ──────────────────────────────────────────────────────────

  const navTitle = inMessages
    ? "Messages"
    : inScheduled
    ? "Scheduled"
    : inAgent
    ? (agentDetail?.name ?? "Agent")
    : "Agents";

  const navTools = inMessages ? (
    <>
      {totalUnread > 0 && (
        <SecondaryNavToolButton onClick={() => markAllReadMutation.mutate()} title="Mark all read">
          <CheckCheck size={20} />
        </SecondaryNavToolButton>
      )}
      <SecondaryNavToolButton onClick={() => setComposeOpen(true)} title="Compose message">
        <Pencil size={20} />
      </SecondaryNavToolButton>
    </>
  ) : inScheduled ? (
    <>
      <SecondaryNavToolToggle
        pressed={showDisabled}
        onPressedChange={setShowDisabled}
        title={showDisabled ? "Hide disabled tasks" : "Show disabled tasks"}
      >
        {showDisabled ? <BotOff size={22} /> : <Bot size={22} />}
      </SecondaryNavToolToggle>
      <SecondaryNavToolButton onClick={() => { refetchTasks(); toast.success("Task list refreshed"); }}>
        <RefreshCw size={20} />
      </SecondaryNavToolButton>
    </>
  ) : !inMessages && !inScheduled && !inAgent ? (
    <SecondaryNavToolButton onClick={() => setCreateAgentOpen(true)} title="New agent">
      <Plus size={20} />
    </SecondaryNavToolButton>
  ) : inAgent && agentSection !== "chat" ? (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <SecondaryNavToolButton aria-label="Create new">
          <Plus size={20} />
        </SecondaryNavToolButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => { setCreatingFileItem("folder"); setNewFileItemName(""); }}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setCreatingFileItem("file"); setNewFileItemName(""); }}>
          <FilePlus className="h-4 w-4 mr-2" />
          New File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <SecondaryNavContainer title={navTitle} tools={navTools}>
        {inMessages ? (
          /* ── Messages drill-down ── */
          <>
            <div className="px-6 pb-2">
              <Button variant="ghost" size="sm" className="w-full justify-start"
                onClick={() => handleNavigation("/agent-tasks/activity")}>
                <ChevronLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>
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
                      onClick={() => handleNavigation(`/agent-tasks/messages/${thread.threadId}`)}
                      onDelete={() => setThreadToDelete(thread.threadId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : inScheduled ? (
          /* ── Scheduled drill-down ── */
          <>
            <div className="px-6 pb-2">
              <Button variant="ghost" size="sm" className="w-full justify-start"
                onClick={() => handleNavigation("/agent-tasks/activity")}>
                <ChevronLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tasks..." className="pl-9" value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4">
              {tasksLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {searchInput ? "No tasks found" : "No tasks available"}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTasks.map((task) => (
                    <SecondaryNavItem
                      key={task.id}
                      isActive={selectedTaskId === task.id}
                      onClick={() => handleNavigation(`/agent-tasks/${task.id}`)}
                      className={!task.enabled ? "opacity-50" : ""}
                    >
                      <div className="flex flex-col items-start w-full gap-1">
                        <div className="flex items-start gap-2 w-full">
                          <SecondaryNavItemTitle className="flex-1">{task.name}</SecondaryNavItemTitle>
                          <Badge variant={task.enabled ? "default" : "secondary"} className="text-xs flex-shrink-0">
                            {task.enabled ? "On" : "Off"}
                          </Badge>
                        </div>
                        {task.description && (
                          <SecondaryNavItemSubtitle className="break-words line-clamp-2 w-full text-left">
                            {task.description}
                          </SecondaryNavItemSubtitle>
                        )}
                      </div>
                    </SecondaryNavItem>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : inAgent ? (
          /* ── Agent sub-nav with inline file tree ── */
          <>
            <div className="px-6 pb-2">
              <Button variant="ghost" size="sm" className="w-full justify-start"
                onClick={() => handleNavigation("/agent-tasks/activity")}>
                <ChevronLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>

            {/* Menu items */}
            <div className="px-4 pb-2 space-y-1">
              {AGENT_SECTIONS.map(({ id, label, icon: Icon }) => (
                <SecondaryNavItem
                  key={id}
                  isActive={agentSection === id}
                  onClick={() => handleNavigation(`/agent-tasks/agents/${selectedAgentId}/${id}`)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <SecondaryNavItemTitle>{label}</SecondaryNavItemTitle>
                  </div>
                </SecondaryNavItem>
              ))}
            </div>

            {/* Content section separator */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</span>
            </div>

            {/* Breadcrumb */}
            {fileBreadcrumbs.length > 0 && (
              <div className="px-6 pb-1">
                <div className="flex items-center gap-0.5 text-sm text-muted-foreground flex-wrap">
                  <span className="cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setAgentFilesFolder("")}>
                    root
                  </span>
                  {fileBreadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      <span className="mx-0.5">/</span>
                      <span className="cursor-pointer hover:text-foreground transition-colors"
                        onClick={() => setAgentFilesFolder(crumb.path)}>
                        {crumb.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back up one folder */}
            {agentFilesFolder && (
              <div className="px-6 pb-1">
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"
                  onClick={handleFolderBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {fileBreadcrumbs.length === 1 ? "root" : fileBreadcrumbs[fileBreadcrumbs.length - 2].label}
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-auto px-4 pb-4">
              {/* Inline new folder/file input */}
              {creatingFileItem && (
                <div className="flex items-center gap-1 mb-1 px-1">
                  {creatingFileItem === "folder"
                    ? <Folder className="h-4 w-4 shrink-0 text-muted-foreground ml-1" />
                    : <File className="h-4 w-4 shrink-0 text-muted-foreground ml-1" />
                  }
                  <Input
                    autoFocus
                    value={newFileItemName}
                    onChange={(e) => setNewFileItemName(e.target.value)}
                    placeholder={creatingFileItem === "folder" ? "Folder name" : "filename.md"}
                    className="h-7 text-sm px-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmNewItem();
                      if (e.key === "Escape") handleCancelNewItem();
                    }}
                  />
                  <button
                    onClick={handleConfirmNewItem}
                    disabled={!newFileItemName.trim() || createAgentFileMutation.isPending || createAgentFolderMutation.isPending}
                    className="h-7 w-7 flex shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleCancelNewItem}
                    className="h-7 w-7 flex shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {filesLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-accent/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (filesData?.folders.length ?? 0) === 0 && (filesData?.files.length ?? 0) === 0 && !creatingFileItem ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No files yet
                </div>
              ) : (
                <div className="space-y-0.5">
                  {/* Folders */}
                  {(filesData?.folders ?? []).map((folderPath) => {
                    const folderName = folderPath.split("/").pop()!;
                    return (
                      <div key={folderPath} className="relative group/folder">
                        <SecondaryNavItem
                          isActive={false}
                          onClick={() => setAgentFilesFolder(folderPath)}
                          className="pr-8"
                        >
                          <Folder className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
                          <SecondaryNavItemTitle>{folderName}</SecondaryNavItemTitle>
                        </SecondaryNavItem>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex [@media(pointer:fine)]:hidden [@media(pointer:fine)]:group-hover/folder:flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors"
                          title="Folder properties"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderForProperties(folderPath);
                          }}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Files */}
                  {(filesData?.files ?? []).map((file) => {
                    const Icon = getFileNavIcon(file.name);
                    const isActive = selectedFilePath === file.path;
                    return (
                      <SecondaryNavItem
                        key={file.path}
                        isActive={isActive}
                        onClick={() =>
                          handleNavigation(
                            `/agent-tasks/agents/${selectedAgentId}/files?file=${encodeURIComponent(file.path)}`
                          )
                        }
                      >
                        <Icon className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <SecondaryNavItemTitle>{file.name}</SecondaryNavItemTitle>
                          <SecondaryNavItemSubtitle>
                            {new Date(file.modified).toLocaleDateString()}
                          </SecondaryNavItemSubtitle>
                        </div>
                      </SecondaryNavItem>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Root: menu items + agent list ── */
          <>
            <div className="px-4 pb-2 space-y-1">
              <SecondaryNavItem isActive={currentView === "activity"}
                onClick={() => handleNavigation("/agent-tasks/activity")}>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">Activity</span>
                  {isTasksRunning && (
                    <div className="relative flex-shrink-0 ml-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                    </div>
                  )}
                </div>
              </SecondaryNavItem>
              <SecondaryNavItem isActive={currentView === "history"}
                onClick={() => handleNavigation("/agent-tasks/history")}>
                <div className="flex items-center gap-2 w-full">
                  <Clock className="h-4 w-4" />
                  <SecondaryNavItemTitle>History</SecondaryNavItemTitle>
                </div>
              </SecondaryNavItem>
              <SecondaryNavItem isActive={false}
                onClick={() => handleNavigation("/agent-tasks/scheduled")}>
                <div className="flex items-center gap-2 w-full">
                  <CalendarClock className="h-4 w-4 flex-shrink-0" />
                  <SecondaryNavItemTitle className="flex-1">Scheduled</SecondaryNavItemTitle>
                </div>
              </SecondaryNavItem>
              <SecondaryNavItem isActive={false}
                onClick={() => handleNavigation("/agent-tasks/messages")}>
                <div className="flex items-center gap-2 w-full">
                  <MessagesSquare className="h-4 w-4 flex-shrink-0" />
                  <SecondaryNavItemTitle className="flex-1">Messages</SecondaryNavItemTitle>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5 leading-none flex-shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </SecondaryNavItem>
            </div>

            {/* Agents section separator */}
            <div className="px-4 mt-2">
              <div className="flex items-center mb-2 pl-3 pr-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Agent List
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 pb-4">
              {agentsLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 bg-accent/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No agents yet</div>
              ) : (
                <div className="space-y-1">
                  {agents.map((agent) => (
                    <SecondaryNavItem
                      key={agent.id}
                      isActive={false}
                      onClick={() => handleNavigation(`/agent-tasks/agents/${agent.id}/config`)}
                      className={!agent.enabled ? "opacity-50" : ""}
                    >
                      <div className="flex flex-col items-start w-full gap-0.5">
                        <div className="flex items-start gap-2 w-full">
                          <SecondaryNavItemTitle className="flex-1">{agent.name}</SecondaryNavItemTitle>
                          <Badge variant={agent.enabled ? "default" : "secondary"} className="text-xs flex-shrink-0">
                            {agent.enabled ? "On" : "Off"}
                          </Badge>
                        </div>
                        {agent.description && (
                          <SecondaryNavItemSubtitle className="line-clamp-1 w-full text-left">
                            {agent.description}
                          </SecondaryNavItemSubtitle>
                        )}
                      </div>
                    </SecondaryNavItem>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SecondaryNavContainer>

      <ComposeMessage open={composeOpen} onOpenChange={setComposeOpen} />

      <CreateAgentDialog
        open={createAgentOpen}
        onOpenChange={setCreateAgentOpen}
        onCreated={(agent) => handleNavigation(`/agent-tasks/agents/${agent.id}/config`)}
      />

      {folderForProperties !== null && selectedAgentId && (
        <AgentFolderPropertiesSheet
          open={folderForProperties !== null}
          onOpenChange={(open) => { if (!open) setFolderForProperties(null); }}
          agentId={selectedAgentId}
          folderPath={folderForProperties}
          parentFolderPath={agentFilesFolder}
          onRenamed={(_oldPath, _newPath) => {
            setFolderForProperties(null);
            refetchFiles();
          }}
          onDeleted={() => {
            setFolderForProperties(null);
            refetchFiles();
          }}
        />
      )}

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
