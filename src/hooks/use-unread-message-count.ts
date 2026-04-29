import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { messagesService } from "@/api/messagesService";
import { useXerroWebSocketContext } from "@/context/XerroWebSocketContext";

export function useUnreadMessageCount() {
  const queryClient = useQueryClient();
  const {
    subscribeToMessageCreated,
    subscribeToMessageUpdated,
    subscribeToThreadDeleted,
  } = useXerroWebSocketContext();

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: () => messagesService.getUnreadCount(),
    staleTime: 0,
    refetchInterval: 60000,
  });

  useEffect(() => {
    const unsubCreated = subscribeToMessageCreated((event) => {
      queryClient.setQueryData(["messages-unread-count"], event.unreadCount);
      if (event.unreadCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["messages", "preview"] });
      }
    });

    const unsubUpdated = subscribeToMessageUpdated((event) => {
      queryClient.setQueryData(["messages-unread-count"], event.unreadCount);
    });

    const unsubThreadDeleted = subscribeToThreadDeleted((event) => {
      queryClient.setQueryData(["messages-unread-count"], event.unreadCount);
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubThreadDeleted();
    };
  }, [queryClient, subscribeToMessageCreated, subscribeToMessageUpdated, subscribeToThreadDeleted]);

  return {
    unreadCount: data ?? 0,
    isLoading,
    error,
  };
}
