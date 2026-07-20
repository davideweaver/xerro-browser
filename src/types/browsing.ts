export interface BrowsingVisit {
  id: string;
  peer: string;
  url: string;
  title: string;
  domain: string;
  visitTime: number;
  visitCount: number;
  transition: string | null;
  createdAt: number;
}

export interface TimelineResult {
  visits: BrowsingVisit[];
  total: number;
}

export interface SearchResult extends BrowsingVisit {
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  semantic: boolean;
}

export interface DomainStat {
  domain: string;
  visits: number;
  lastVisited: number;
}

export interface DomainsResponse {
  domains: DomainStat[];
  count: number;
}

export interface BrowsingTopic {
  id: string;
  label: string;
  score: number;
  windowStart: number;
  windowEnd: number;
  updatedAt: number;
  visitCount?: number;
  sampleVisits?: Array<{ url: string; title: string; domain: string }>;
}

export interface TopicsResponse {
  topics: BrowsingTopic[];
  count: number;
}

export interface InterestsResponse {
  content: string;
  updatedAt: string | null;
}

export interface SearchTermStat {
  term: string;
  count: number;
  lastSearched: number;
}

export interface SearchesResponse {
  searches: SearchTermStat[];
  count: number;
}

export interface BrowsingStats {
  perDay: Array<{ date: string; count: number }>;
  perHour: Array<{ hour: number; count: number }>;
  totalVisits: number;
}
