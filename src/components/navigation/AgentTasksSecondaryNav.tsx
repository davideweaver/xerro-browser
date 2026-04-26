import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentTasksService } from "@/api/agentTasksService";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTaskConfigUpdates } from "@/hooks/use-task-config-updates";
import { useTasksRunning } from "@/hooks/use-tasks-running";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import { MessageCard } from "@/components/messages/MessageCard";
import { ComposeMessage } from "@/components/messages/ComposeMessage";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { toast } from "sonner";
import type { MessageThread } from "@/types/messages";

interface AgentTasksSecondaryNavProps {
  selectedTaskId: string | null;
  selectedThreadId?: string | null;
  currentView: "history" | "task" | "activity" | "messages";
  onNavigate: (path: string) => void;
  onTaskSelect?: (path: string) => void;
}

const STORAGE_KEY = "agent-tasks-show-disabled";

export function AgentTasksSecondaryNav({
  selectedTaskId,
  selectedThreadId,
  currentView,
  onNavigate,
  onTaskSelect,
}: AgentTasksSecondaryNavProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const isTasksRunning = useTasksRunning();
  const [composeOpen, setComposeOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

  const [showDisabled, setShowDisabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(showDisabled));
  }, [showDisabled]);

  const queryClient = useQueryClient();
  const { subscribeToMessageCreated, subscribeToMessageUpdated, subscribeToMessageDeleted } =
    useXerroWebSocketContext();

  useTaskConfigUpdates();

  // Unread count for the Messages nav item badge
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: () => messagesService.getUnreadCount(),
    refetchInterval: 60_000,
  });

  // Thread list (inbox)
  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => messagesService.listThreads(),
    enabled: currentView === "messages",
  });

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

  // Real-time message updates
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
    const unsub3 = subscribeToMessageDeleted(() => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribeToMessageCreated, subscribeToMessageUpdated, subscribeToMessageDeleted, queryClient]);

  // Task list
  const { data, isLoading: tasksLoading, refetch } = useQuery({
    queryKey: ["agent-tasks-nav", debouncedSearch],
    queryFn: () => agentTasksService.listTasks(),
    enabled: currentView !== "messages",
  });

  const tasks = data?.tasks || [];
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesEnabled = showDisabled || task.enabled;
    return matchesSearch && matchesEnabled;
  });

  const handleNavigation = (path: string) => {
    if (onTaskSelect) {
      onTaskSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Task list refreshed");
  };

  const threads = threadsData?.threads || [];
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const inMessages = currentView === "messages";

  return (
    <>
      <SecondaryNavContainer
        title={inMessages ? "Messages" : "Agents"}
        tools={
          inMessages ? (
            <>
              {totalUnread > 0 && (
                <SecondaryNavToolButton
                  onClick={() => markAllReadMutation.mutate()}
                  title="Mark all read"
                >
                  <CheckCheck size={20} />
                </SecondaryNavToolButton>
              )}
              <SecondaryNavToolButton
                onClick={() => setComposeOpen(true)}
                title="Compose message"
              >
                <Pencil size={20} />
              </SecondaryNavToolButton>
            </>
          ) : (
            <>
              <SecondaryNavToolToggle
                pressed={showDisabled}
                onPressedChange={setShowDisabled}
                title={showDisabled ? "Hide disabled tasks" : "Show disabled tasks"}
              >
                {showDisabled ? <BotOff size={22} /> : <Bot size={22} />}
              </SecondaryNavToolToggle>
              <SecondaryNavToolButton onClick={handleRefresh}>
                <RefreshCw size={20} />
              </SecondaryNavToolButton>
            </>
          )
        }
      >
        {inMessages ? (
          /* ── Drilled into Messages ── */
          <>
            {/* Back button */}
            <div className="px-6 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleNavigation("/agent-tasks/activity")}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-auto px-2 pb-4">
              {threadsLoading ? (
                <div className="space-y-1 px-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-[70px] w-full rounded-lg" />
                  ))}
                </div>
              ) : threads.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No messages yet
                </div>
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
        ) : (
          /* ── Root: primary nav items + task list ── */
          <>
            {/* Primary nav items */}
            <div className="px-4 pb-4 space-y-1">
              <SecondaryNavItem
                isActive={currentView === "activity"}
                onClick={() => handleNavigation("/agent-tasks/activity")}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">Task Activity</span>
                  {isTasksRunning && (
                    <div className="relative flex-shrink-0 ml-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                    </div>
                  )}
                </div>
              </SecondaryNavItem>
              <SecondaryNavItem
                isActive={currentView === "history"}
                onClick={() => handleNavigation("/agent-tasks/history")}
              >
                <div className="flex items-center gap-2 w-full">
                  <Clock className="h-4 w-4" />
                  <SecondaryNavItemTitle>Task History</SecondaryNavItemTitle>
                </div>
              </SecondaryNavItem>
              <SecondaryNavItem
                isActive={false}
                onClick={() => handleNavigation("/agent-tasks/messages")}
              >
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

            {/* Task search */}
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            {/* Task list */}
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
                          <SecondaryNavItemTitle className="flex-1">
                            {task.name}
                          </SecondaryNavItemTitle>
                          <Badge
                            variant={task.enabled ? "default" : "secondary"}
                            className="text-xs flex-shrink-0"
                          >
                            {task.enabled ? "On" : "Off"}
                          </Badge>
                        </div>
                        {task.description && (
                          <SecondaryNavItemSubtitle className="break-words line-clamp-2">
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
        )}
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
