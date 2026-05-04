export interface Todo {
  id: string;
  title: string;
  body?: string;
  documentLink?: string;
  projectName?: string;
  scheduledDate?: string; // ISO datetime string
  agentId?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  body?: string;
  documentLink?: string;
  projectName?: string;
  scheduledDate?: string;
}

export interface UpdateTodoInput {
  title?: string;
  body?: string | null;
  documentLink?: string | null;
  projectName?: string | null;
  scheduledDate?: string | null;
  completed?: boolean;
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
