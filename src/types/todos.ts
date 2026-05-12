export type TodoPriority = "normal" | "medium" | "high";

export interface Todo {
  id: string;
  title: string;
  body?: string;
  documentLink?: string;
  projectName?: string;
  scheduledDate?: string; // ISO datetime string
  agentId?: string;
  completed: boolean;
  priority: TodoPriority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  body?: string;
  documentLink?: string;
  projectName?: string;
  scheduledDate?: string;
  priority?: TodoPriority;
}

export interface UpdateTodoInput {
  title?: string;
  body?: string | null;
  documentLink?: string | null;
  projectName?: string | null;
  scheduledDate?: string | null;
  completed?: boolean;
  priority?: TodoPriority;
}

export interface TodoListFilter {
  projectName?: string;
  noProject?: boolean;
  completed?: boolean;
  unscheduled?: boolean;
  scheduledDate?: string; // YYYY-MM-DD prefix filter
  scheduledAfter?: string;
  scheduledBefore?: string;
  search?: string;
  agentId?: string;
  priority?: TodoPriority;
  limit?: number;
  offset?: number;
}

export interface TodoListResult {
  todos: Todo[];
  total: number;
  limit: number;
  offset: number;
}

export interface TodosProjectsResult {
  projects: string[];
  total: number;
}

export interface TodoAgentEntry {
  agentId: string;
  projectName?: string;
}

export interface TodosAgentsResult {
  agents: TodoAgentEntry[];
  total: number;
}
