export interface MemoryBlock {
  label: string;
  name: string;
  path: string;
  description: string;
  isFolder: boolean;
  limit?: number;
  lines?: number;
}

export interface MemoryBlockFrontmatter {
  description: string;
  limit: number;
  read_only?: boolean;
}

export interface MemoryBlockDetail {
  label: string;
  path: string;
  frontmatter: MemoryBlockFrontmatter;
  content: string;
  totalLines: number;
}

export interface MemoryBlockListResponse {
  blocks: MemoryBlock[];
  count: number;
}

export interface MemoryBlockUpdateResponse {
  success: boolean;
  message: string;
}

export interface MemoryBlockSearchResult {
  label: string;
  path: string;
  description: string;
  score: number;
  excerpt: string;
}

export interface MemoryBlockSearchResponse {
  results: MemoryBlockSearchResult[];
  count: number;
}

export interface MemoryStats {
  totalBlocks: number;
  totalTokens: number;
  coreBlocks: number;
  referenceBlocks: number;
  historyBlocks: number;
  gitStatus: {
    dirty: boolean;
    aheadOfRemote: boolean;
    summary: string;
    uncommittedFiles?: string[];
  };
  reflection?: {
    enabled: boolean;
    threshold: number;
    model: string;
    counters: Record<string, number>;
  };
}
