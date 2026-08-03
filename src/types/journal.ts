export interface JournalEntry {
  label: string;
  path: string;
  date: string;
  kind: string;
  themes: string[];
  people: string[];
  projects: string[];
  significance: string;
  summary: string;
  limit: number;
  totalLines: number;
}

export interface JournalQueryOptions {
  kind?: string;
  after?: string;
  before?: string;
}

export interface JournalListResponse {
  entries: JournalEntry[];
  count: number;
}
