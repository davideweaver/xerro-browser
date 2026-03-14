import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  DirectMessageResponse,
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from "@/types/notifications";

class NotificationsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_SERVICE_URL || "";
    if (!this.baseUrl) {
      console.warn(
        "VITE_XERRO_SERVICE_URL not configured. Notifications may not work."
      );
    }
  }

  async listNotifications(params?: {
    read?: boolean;
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<NotificationListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.read !== undefined) {
        queryParams.append("read", String(params.read));
      }
      if (params?.limit) {
        queryParams.append("limit", String(params.limit));
      }
      if (params?.offset) {
        queryParams.append("offset", String(params.offset));
      }
      if (params?.since) {
        queryParams.append("since", params.since);
      }

      const url = `${this.baseUrl}/api/v1/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notifications: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch notifications";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getNotification(id: string): Promise<Notification> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications/${id}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notification: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch notification";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async markAsRead(id: string): Promise<Notification> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications/${id}/read`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to mark notification as read: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async markAsUnread(id: string): Promise<Notification> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications/${id}/unread`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to mark notification as unread: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark notification as unread";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async markAllAsRead(): Promise<{ success: boolean; count: number }> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications/read-all`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to mark all as read: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.count > 0) {
        toast({
          title: "All notifications marked as read",
          description: `${result.count} notification${result.count !== 1 ? "s" : ""} marked as read`,
        });
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark all as read";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteAllNotifications(): Promise<{ success: boolean; count: number }> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete all notifications: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Notifications cleared",
        description: `${result.count} notification${result.count !== 1 ? "s" : ""} deleted`,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete all notifications";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.statusText}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete notification";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async sendDirectMessage(notification: Notification): Promise<DirectMessageResponse> {
    try {
      const body: Record<string, string> = {
        message: notification.message,
      };
      if (notification.context) body.context = notification.context;
      if (notification.source) body.source = notification.source;
      if (notification.workingDirectory) body.workingDirectory = notification.workingDirectory;
      if (notification.sessionId) body.sessionId = notification.sessionId;

      const response = await apiFetch(
        `${this.baseUrl}/api/v1/agent/direct-message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to send direct message: ${response.statusText}`);
      }

      const result: DirectMessageResponse = await response.json();

      toast({
        title: "Sent to Slack",
        description: "Message sent. Open the thread in Slack.",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send direct message";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await apiFetch(
        `${this.baseUrl}/api/v1/notifications/unread-count`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch unread count: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch unread count";
      // Don't show toast for unread count errors (used for badges)
      console.error(message);
      throw error;
    }
  }
}

export const notificationsService = new NotificationsService();
