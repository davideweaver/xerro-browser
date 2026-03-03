import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { ContainerToolToggle } from "@/components/container/ContainerToolToggle";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { NotificationDetailSheet } from "@/components/notifications/NotificationDetailSheet";
import { Button } from "@/components/ui/button";
import { notificationsService } from "@/api/notificationsService";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";
import type { Notification } from "@/types/notifications";
import DestructiveConfirmationDialog from "@/components/dialogs/DestructiveConfirmationDialog";
import { CheckCheck, RefreshCw, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Notifications() {
  const queryClient = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState(
    () => localStorage.getItem("notifications-show-unread-only") === "true",
  );

  const handleToggleUnreadOnly = (val: boolean) => {
    setShowUnreadOnly(val);
    localStorage.setItem("notifications-show-unread-only", String(val));
  };
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const { subscribeToNotificationCreated, subscribeToNotificationRead, subscribeToNotificationsReadAll } = useXerroWebSocketContext();

  // Fetch notifications
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", showUnreadOnly],
    queryFn: () =>
      notificationsService.listNotifications({
        read: showUnreadOnly ? false : undefined,
        limit: 100,
      }),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: (updatedNotification) => {
      setSelectedNotification((prev) =>
        prev?.id === updatedNotification.id ? updatedNotification : prev
      );
      queryClient.setQueryData<typeof data>(
        ["notifications", showUnreadOnly],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            ),
          };
        }
      );
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsService.deleteNotification(id),
    onSuccess: (_, id) => {
      localStorage.removeItem(`notification-slack-url-${id}`);
      queryClient.setQueryData<typeof data>(
        ["notifications", showUnreadOnly],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.filter((n) => n.id !== id),
            total: old.total - 1,
          };
        }
      );
    },
  });

  // Mark as unread mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsUnread(id),
    onSuccess: (updatedNotification) => {
      setSelectedNotification(updatedNotification);
      queryClient.setQueryData<typeof data>(
        ["notifications", showUnreadOnly],
        (old) => {
          if (!old) return old;
          if (showUnreadOnly) {
            // In unread-only view, re-add the notification to the list
            return {
              ...old,
              notifications: [updatedNotification, ...old.notifications.filter((n) => n.id !== updatedNotification.id)],
              total: old.total + 1,
            };
          }
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            ),
          };
        }
      );
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => refetch(),
  });

  // Delete all notifications mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => notificationsService.deleteAllNotifications(),
    onSuccess: () => {
      data?.notifications.forEach((n) => {
        localStorage.removeItem(`notification-slack-url-${n.id}`);
      });
      setIsClearAllDialogOpen(false);
      refetch();
    },
  });

  // Subscribe to real-time notification events via global WebSocket
  useEffect(() => {
    const unsubCreated = subscribeToNotificationCreated((eventData) => {
      queryClient.setQueryData<typeof data>(
        ["notifications", showUnreadOnly],
        (old) => {
          if (!old) return old;
          if (old.notifications.some((n) => n.id === eventData.notification.id)) return old;
          return {
            ...old,
            notifications: [eventData.notification, ...old.notifications],
            total: old.total + 1,
          };
        }
      );
      toast({
        title: eventData.notification.message,
        description: eventData.notification.context
          ? eventData.notification.context.slice(0, 100) +
            (eventData.notification.context.length > 100 ? "..." : "")
          : undefined,
      });
    });

    const unsubRead = subscribeToNotificationRead((eventData) => {
      queryClient.setQueryData<typeof data>(
        ["notifications", showUnreadOnly],
        (old) => {
          if (!old) return old;
          if (showUnreadOnly) {
            return {
              ...old,
              notifications: old.notifications.filter((n) => n.id !== eventData.id),
              total: old.total - 1,
            };
          }
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === eventData.id ? eventData.notification : n
            ),
          };
        }
      );
    });

    const unsubReadAll = subscribeToNotificationsReadAll(() => {
      refetch();
    });

    return () => {
      unsubCreated();
      unsubRead();
      unsubReadAll();
    };
  }, [showUnreadOnly, queryClient, refetch, subscribeToNotificationCreated, subscribeToNotificationRead, subscribeToNotificationsReadAll]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      setSelectedNotification(notification);
      setIsDetailSheetOpen(true);
      if (!notification.read) {
        markAsReadMutation.mutate(notification.id);
      }
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const unreadCount = data?.notifications.filter((n) => !n.read).length ?? 0;

  return (
    <Container
      title="Notifications"
      description={
        data
          ? `${data.total} total notification${data.total !== 1 ? "s" : ""}${unreadCount > 0 ? ` • ${unreadCount} unread` : ""}`
          : undefined
      }
      tools={
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <ContainerToolButton
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark read
            </ContainerToolButton>
          )}
          <ContainerToolToggle
            pressed={showUnreadOnly}
            onPressedChange={handleToggleUnreadOnly}
            aria-label="Show unread only"
          >
            <div className={`h-2.5 w-2.5 rounded-full bg-current${showUnreadOnly ? "" : " opacity-40"}`} />
          </ContainerToolToggle>
          <ContainerToolButton
            size="icon"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </ContainerToolButton>
          {data && data.notifications.length > 0 && (
            <ContainerToolButton
              size="icon"
              onClick={() => setIsClearAllDialogOpen(true)}
              title="Clear all notifications"
            >
              <X className="h-4 w-4" />
            </ContainerToolButton>
          )}
        </div>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load notifications
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !error && data && data.notifications.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && data && data.notifications.length > 0 && (
        <div className="space-y-1">
          {data.notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              onDelete={() => deleteNotificationMutation.mutate(notification.id)}
              onMarkAsUnread={() => markAsUnreadMutation.mutate(notification.id)}
            />
          ))}
        </div>
      )}

      <NotificationDetailSheet
        notification={selectedNotification}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
        onMarkAsUnread={(id) => markAsUnreadMutation.mutate(id)}
      />

      <DestructiveConfirmationDialog
        open={isClearAllDialogOpen}
        onOpenChange={setIsClearAllDialogOpen}
        onConfirm={() => deleteAllMutation.mutate()}
        onCancel={() => setIsClearAllDialogOpen(false)}
        title="Clear all notifications"
        description={`This will permanently delete all ${data?.total ?? ""} notifications. This cannot be undone.`}
        isLoading={deleteAllMutation.isPending}
        confirmText="Clear all"
        confirmLoadingText="Clearing..."
      />
    </Container>
  );
}
