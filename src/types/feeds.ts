export interface FeedTopic {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedItem {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  favorited: boolean;
  archived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedTopicWithCount extends FeedTopic {
  itemCount: number;
}

export interface FeedTopicsResult {
  topics: FeedTopicWithCount[];
  total: number;
}

export interface FeedItemListResult {
  items: FeedItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface FeedHomeEntry {
  topic: FeedTopic;
  items: FeedItem[];
}

export interface FeedHomeResult {
  entries: FeedHomeEntry[];
  total: number;
}

export interface CreateFeedItemInput {
  topicName: string;
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}
