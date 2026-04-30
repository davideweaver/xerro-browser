import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/api/notificationsService";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";

/**
 * Hook to track unread notification count with real-time WebSocket updates
 */
export function useUnreadNotificationCount() {
  const queryClient = useQueryClient();
  const {
    subscribeToNotificationCreated,
    subscribeToNotificationRead,
    subscribeToNotificationUnread,
    subscribeToNotificationsReadAll,
    subscribeToNotificationDeleted,
  } = useXerroWebSocketContext();

  // Query for unread count
  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 60000, // Refetch every minute as backup
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubCreated = subscribeToNotificationCreated((eventData) => {
      // Update count from WebSocket event
      queryClient.setQueryData(["notifications", "unread-count"], {
        unreadCount: eventData.unreadCount,
      });
    });

    const unsubRead = subscribeToNotificationRead((eventData) => {
      queryClient.setQueryData(["notifications", "unread-count"], {
        unreadCount: eventData.unreadCount,
      });
    });

    const unsubUnread = subscribeToNotificationUnread((eventData) => {
      queryClient.setQueryData(["notifications", "unread-count"], {
        unreadCount: eventData.unreadCount,
      });
    });

    const unsubReadAll = subscribeToNotificationsReadAll((eventData) => {
      // Update count from WebSocket event
      queryClient.setQueryData(["notifications", "unread-count"], {
        unreadCount: eventData.unreadCount,
      });
    });

    const unsubDeleted = subscribeToNotificationDeleted((eventData) => {
      queryClient.setQueryData(["notifications", "unread-count"], {
        unreadCount: eventData.unreadCount,
      });
    });

    return () => {
      unsubCreated();
      unsubRead();
      unsubUnread();
      unsubReadAll();
      unsubDeleted();
    };
  }, [
    queryClient,
    subscribeToNotificationCreated,
    subscribeToNotificationRead,
    subscribeToNotificationUnread,
    subscribeToNotificationsReadAll,
    subscribeToNotificationDeleted,
  ]);

  return {
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
  };
}
