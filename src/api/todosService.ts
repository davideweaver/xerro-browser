import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/hooks/use-toast";
import type {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
  TodoListFilter,
  TodoListResult,
  TodosProjectsResult,
} from "@/types/todos";
import type { DirectMessageResponse } from "@/types/notifications";

class TodosService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_XERRO_SERVICE_URL || "";
    if (!this.baseUrl) {
      console.warn(
        "VITE_XERRO_SERVICE_URL not configured. Todos may not work."
      );
    }
  }

  async listTodos(filter: TodoListFilter = {}): Promise<TodoListResult> {
    try {
      const params = new URLSearchParams();
      if (filter.projectName) params.append("projectName", filter.projectName);
      if (filter.noProject !== undefined)
        params.append("noProject", String(filter.noProject));
      if (filter.completed !== undefined)
        params.append("completed", String(filter.completed));
      if (filter.unscheduled !== undefined)
        params.append("unscheduled", String(filter.unscheduled));
      if (filter.scheduledDate)
        params.append("scheduledDate", filter.scheduledDate);
      if (filter.scheduledAfter)
        params.append("scheduledAfter", filter.scheduledAfter);
      if (filter.scheduledBefore)
        params.append("scheduledBefore", filter.scheduledBefore);
      if (filter.search) params.append("search", filter.search);
      if (filter.limit !== undefined)
        params.append("limit", String(filter.limit));
      if (filter.offset !== undefined)
        params.append("offset", String(filter.offset));

      const url = `${this.baseUrl}/api/v1/todos${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch todos: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch todos";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getTodo(id: string): Promise<Todo> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/todos/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch todo: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch todo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async createTodo(input: CreateTodoInput): Promise<Todo> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create todo: ${response.statusText}`);
      }

      const todo = await response.json();
      toast({ title: "Todo created" });
      return todo;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create todo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to update todo: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update todo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async deleteTodo(id: string): Promise<void> {
    try {
      const response = await apiFetch(`${this.baseUrl}/api/v1/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete todo: ${response.statusText}`);
      }

      toast({ title: "Todo deleted" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete todo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async sendTodoToSlack(todo: Todo): Promise<DirectMessageResponse> {
    try {
      const body: Record<string, string> = { message: todo.title };
      if (todo.body) body.context = todo.body;
      if (todo.projectName) {
        body.source = todo.projectName;
        body.workingDirectory = `/Users/dweaver/Projects/ai/claude-assist/projects/${todo.projectName}`;
      }

      const response = await apiFetch(`${this.baseUrl}/api/v1/agent/direct-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to send to Slack: ${response.statusText}`);
      }

      const result: DirectMessageResponse = await response.json();
      toast({
        title: "Sent to Slack",
        description: "Todo sent. Open the thread in Slack.",
      });
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send to Slack";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async getProjects(completed?: boolean): Promise<TodosProjectsResult> {
    try {
      const params = new URLSearchParams();
      if (completed !== undefined) params.append("completed", String(completed));
      const qs = params.toString();
      const response = await apiFetch(`${this.baseUrl}/api/v1/todos/projects${qs ? `?${qs}` : ""}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch projects";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }
}

export const todosService = new TodosService();
