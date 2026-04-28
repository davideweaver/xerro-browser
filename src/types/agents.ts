export interface Agent {
  id: string;
  name: string;
  description?: string;
  workspace: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  workspaceFiles?: string[];
}

export interface ListAgentsResponse {
  agents: Agent[];
  count: number;
}

export type AgentSection = "config" | "triggers" | "history" | "files" | "chat";

export interface WorkspaceFileEntry {
  path: string;
  name: string;
  size: number;
  created: string;
  modified: string;
}

export interface WorkspaceFileContent {
  path: string;
  content: string;
  size: number;
  created: string;
  modified: string;
  totalLines?: number;
  startLine?: number;
  endLine?: number;
  hasMore?: boolean;
}

export interface WorkspaceListing {
  files: WorkspaceFileEntry[];
  folders: string[];
  total: number;
}
