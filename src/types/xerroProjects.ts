// From GET /api/v1/projects/
export interface XerroProject {
  name: string;
  folder: string;         // encoded storage key (slashes → dashes) — do NOT use as cwd
  path?: string;          // actual filesystem path — use this as cwd
  sessionCount: number;
  lastTurnAt: string; // ISO timestamp
  reflectionCounter: number;
}

export interface XerroProjectListResponse {
  items: XerroProject[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// From GET /api/v1/projects/:name/activity
export interface XerroProjectActivity {
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  activeDays: { date: string; count: number }[];
}

// From GET /api/v1/sessions/
export interface XerroSession {
  id: string; // base64url of JSONL path (no extension)
  projectName: string;
  projectPath?: string;
  description: string; // From .md frontmatter — session summary
  startedAt: string; // ISO - first message timestamp
  lastMessageAt: string; // ISO - last message timestamp
  messageCount: number;
  jsonlPath: string;
  externalSource?: string; // Source system (e.g. "claude-code", "web")
  firstMessagePreview?: string; // "[role]: content" format, optional
}

export interface XerroSessionListResponse {
  sessions: XerroSession[];
  hasMore: boolean;
  nextCursor?: string;
}

// From GET /api/v1/sessions/:sessionId/messages
export interface XerroMessage {
  id: string; // "{sessionId}:{lineIndex}"
  sessionId: string;
  projectName: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  permissionMode?: string; // e.g. "plan" when message was sent under planning mode
}

export interface XerroMessageListResponse {
  messages: XerroMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

// From POST /api/v1/memory/search
export interface XerroMemoryBlock {
  label: string;
  path: string;
  frontmatter: { description: string; limit: number; read_only?: boolean };
  content: string;
  totalLines: number;
}

export interface XerroMemorySearchResponse {
  results: XerroMemoryBlock[];
}
