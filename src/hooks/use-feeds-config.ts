import { useState, useCallback } from "react";

export type FeedTopicStyle = "standard" | "large";

export interface FeedTopicConfig {
  topicId: string;
  style: FeedTopicStyle;
  enabled: boolean;
}

const STORAGE_KEY = "xerro-feeds-config";

function loadConfig(): FeedTopicConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useFeedsConfig() {
  const [config, setConfigState] = useState<FeedTopicConfig[]>(loadConfig);

  const setConfig = useCallback((next: FeedTopicConfig[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConfigState(next);
  }, []);

  return { config, setConfig };
}
