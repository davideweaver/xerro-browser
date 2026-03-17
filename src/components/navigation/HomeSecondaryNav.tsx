import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, CalendarDays, Bell, Rss, Plus } from "lucide-react";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import { feedsService } from "@/api/feedsService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface HomeSecondaryNavProps {
  pathname: string;
  selectedTopicId: string | null;
  onNavigate: (path: string) => void;
  onTopicSelect?: (path: string) => void;
}

export function HomeSecondaryNav({
  pathname,
  selectedTopicId,
  onNavigate,
  onTopicSelect,
}: HomeSecondaryNavProps) {
  const queryClient = useQueryClient();
  const { unreadCount } = useUnreadNotificationCount();
  const ws = useXerroWebSocketContext();
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const unsub = ws.subscribeToFeedTopicCreated(() =>
      queryClient.invalidateQueries({ queryKey: ["feeds-topics"] }),
    );
    return unsub;
  }, [ws, queryClient]);

  const { data: topicsData } = useQuery({
    queryKey: ["feeds-topics"],
    queryFn: () => feedsService.listTopics(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => feedsService.createTopic(name),
    onSuccess: (topic) => {
      queryClient.invalidateQueries({ queryKey: ["feeds-topics"] });
      setNewName("");
      setIsOpen(false);
      const path = `/home/feeds/${topic.id}`;
      if (onTopicSelect) {
        onTopicSelect(path);
      } else {
        onNavigate(path);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create topic", variant: "destructive" });
    },
  });

  const handleNavigate = (path: string) => {
    if (onTopicSelect) {
      onTopicSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) createMutation.mutate(newName.trim());
  };

  const topics = topicsData?.topics ?? [];

  return (
    <SecondaryNavContainer title="Home">
      <div className="flex-1 overflow-auto">
        {/* Static nav items */}
        <div className="px-4 pb-2 space-y-1">
          <SecondaryNavItem
            isActive={pathname === "/"}
            onClick={() => handleNavigate("/")}
            className="gap-3 h-11"
          >
            <Calendar className="h-5 w-5" />
            <span className={pathname === "/" ? "font-medium" : ""}>Today</span>
          </SecondaryNavItem>
          <SecondaryNavItem
            isActive={pathname === "/home/calendar"}
            onClick={() => handleNavigate("/home/calendar")}
            className="gap-3 h-11"
          >
            <CalendarDays className="h-5 w-5" />
            <span className={pathname === "/home/calendar" ? "font-medium" : ""}>Calendar</span>
          </SecondaryNavItem>
          <SecondaryNavItem
            isActive={pathname === "/home/notifications"}
            onClick={() => handleNavigate("/home/notifications")}
            className="gap-3 h-11"
          >
            <Bell className="h-5 w-5" />
            <span className={pathname === "/home/notifications" ? "font-medium" : ""}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <NotificationBadge count={unreadCount} size="sm" className="ml-auto" />
            )}
          </SecondaryNavItem>
        </div>

        {/* Feeds section */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2 pl-3 pr-1">
            <div className="flex items-center gap-2">
              <Rss className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Feeds
              </span>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              title="New topic"
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Topics list */}
          <div className="space-y-1">
            <SecondaryNavItem
              isActive={pathname === "/home/favorites"}
              onClick={() => handleNavigate("/home/favorites")}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className={`truncate text-sm ${pathname === "/home/favorites" ? "font-medium" : ""}`}>
                  Favorites
                </span>
              </div>
            </SecondaryNavItem>
            {topics.map((topic) => {
              const isActive = selectedTopicId === topic.id;
              return (
                <SecondaryNavItem
                  key={topic.id}
                  isActive={isActive}
                  onClick={() => handleNavigate(`/home/feeds/${topic.id}`)}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className={`truncate text-sm ${isActive ? "font-medium" : ""}`}>
                      {topic.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {topic.itemCount}
                    </span>
                  </div>
                </SecondaryNavItem>
              );
            })}
            {topics.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">No topics yet.</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setNewName(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Topic</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Input
              autoFocus
              placeholder="Topic name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-2"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newName.trim() || createMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SecondaryNavContainer>
  );
}
