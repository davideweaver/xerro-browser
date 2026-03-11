import { toast } from "@/hooks/use-toast";
import type {
  ScheduledTask,
  ScheduledTaskListResponse,
  TaskExecution,
  ToolsResponse,
  AgentExecutionTrace,
  RunningTasksResponse,
  CreateTaskInput,
  TaskVersionSnapshot,
  TaskVersionsResponse,
} from "@/types/agentTasks";

class AgentTasksService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_SERVICE_URL || "";
    if (!this.baseUrl) {
      console.warn(
        "VITE_XERRO_SERVICE_URL not configured. Agent Tasks may not work."
      );
    }
  }

  async listTasks(
    enabled?: boolean,
    task?: string
  ): Promise<ScheduledTaskListResponse> {
    try {
      const params = new URLSearchParams();
      if (enabled !== undefined) {
        params.append("enabled", String(enabled));
      }
      if (task) {
        params.append("task", task);
      }

      const url = `${this.baseUrl}/api/v1/scheduled-tasks${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch tasks";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTask(id: string): Promise<ScheduledTask> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch task";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTaskHistory(
    id: string,
    limit: number = 20
  ): Promise<TaskExecution[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/executions?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch task executions: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.executions || [];
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch task executions";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getRecentRuns(limit: number = 50): Promise<Array<TaskExecution & { taskId: string; taskName: string }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/executions?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch task history: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.executions || [];
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch task history";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getScratchpad(id: string): Promise<{ path: string; content: unknown; isEmpty: boolean }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/scratchpad`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch scratchpad: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch scratchpad";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async triggerTask(id: string, withTrace: boolean = false): Promise<void> {
    try {
      // Enable trace by updating task properties temporarily
      if (withTrace) {
        const task = await this.getTask(id);
        const updatedProperties = { ...task.properties, trace: true };
        await this.updateTask(id, { properties: updatedProperties });
      }

      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/run`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to trigger task: ${response.statusText}`
        );
      }

      toast({
        title: "Task triggered",
        description: "Task is running — watch the activity feed for progress",
      });

      // Restore original trace setting (task has already captured config, safe to update now)
      if (withTrace) {
        const task = await this.getTask(id);
        const restoredProperties = { ...task.properties };
        delete restoredProperties.trace;
        await this.updateTask(id, { properties: restoredProperties });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to trigger task";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateTask(
    id: string,
    updates: {
      name?: string;
      description?: string;
      enabled?: boolean;
      schedule?: string;
      runAt?: string;
      properties?: Record<string, unknown>;
    }
  ): Promise<ScheduledTask> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Task updated",
        description: "Configuration saved successfully",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update task";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createTask(input: CreateTaskInput): Promise<ScheduledTask> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/scheduled-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Failed to create task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create task";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteTask(id: string): Promise<{ success: boolean; id: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete task: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast({
        title: "Task deleted",
        description: "The task has been permanently deleted",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete task";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTools(): Promise<ToolsResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/tools`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch tools";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async clearScratchpad(id: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/scratchpad`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to clear scratchpad: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast({
        title: "Scratchpad cleared",
        description: "The scratchpad has been cleared successfully",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to clear scratchpad";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTrace(id: string): Promise<{ path: string; trace: AgentExecutionTrace | null; isEmpty: boolean }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/trace`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch trace: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch trace";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getExecutionTrace(executionId: string): Promise<AgentExecutionTrace | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/executions/${executionId}/trace`
      );

      if (!response.ok) {
        // If 404, return null (no trace data)
        if (response.status === 404) {
          return null;
        }
        throw new Error(
          `Failed to fetch execution trace: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.trace || null;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch execution trace";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getRunningTasks(): Promise<RunningTasksResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/running`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch running tasks: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch running tasks";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/executions/${executionId}/cancel`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to cancel execution: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Execution cancelled",
        description: "Task execution has been stopped",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel execution";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteExecution(executionId: string): Promise<{ success: boolean; id: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/executions/${executionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete execution: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast({
        title: "Execution deleted",
        description: "The execution has been removed from history",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete execution";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async clearTaskHistory(taskId: string): Promise<{ success: boolean; id: string; wasEmpty: boolean }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${taskId}/history`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to clear task history: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast({
        title: "History cleared",
        description: result.wasEmpty
          ? "History was already empty"
          : "All execution history has been cleared",
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to clear task history";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTaskVersions(id: string): Promise<TaskVersionsResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/versions`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task versions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch task versions";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTaskVersion(id: string, version: number): Promise<TaskVersionSnapshot> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/versions/${version}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task version: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch task version";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async restoreTaskVersion(id: string, version: number): Promise<ScheduledTask> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/${id}/versions/${version}/restore`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Failed to restore task version: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Version restored",
        description: `Task restored to v${version}`,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore task version";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async clearAllHistory(): Promise<{ success: boolean; cleared: number }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/scheduled-tasks/executions`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to clear all history: ${response.statusText}`
        );
      }

      const result = await response.json();

      toast({
        title: "All history cleared",
        description: `Cleared ${result.cleared} execution${result.cleared !== 1 ? 's' : ''} from history`,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to clear all history";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const agentTasksService = new AgentTasksService();
