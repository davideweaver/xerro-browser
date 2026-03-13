const SEARCH_QUERY_KEY = "xerro-chat-search-query";
const SEARCH_CLICKED_RESULTS_KEY = "xerro-chat-search-clicked";

const SEARCH_QUERY_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getSearchQuery(): string {
  try {
    const stored = localStorage.getItem(SEARCH_QUERY_KEY);
    if (!stored) return "";
    const { query, savedAt } = JSON.parse(stored);
    if (Date.now() - savedAt > SEARCH_QUERY_TTL_MS) {
      localStorage.removeItem(SEARCH_QUERY_KEY);
      return "";
    }
    return query || "";
  } catch {
    return "";
  }
}

export function setSearchQuery(query: string): void {
  try {
    if (!query) {
      localStorage.removeItem(SEARCH_QUERY_KEY);
    } else {
      localStorage.setItem(SEARCH_QUERY_KEY, JSON.stringify({ query, savedAt: Date.now() }));
    }
  } catch {}
}

export function getClickedResults(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_CLICKED_RESULTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function setClickedResults(ids: string[]): void {
  try {
    localStorage.setItem(SEARCH_CLICKED_RESULTS_KEY, JSON.stringify(ids));
  } catch {}
}

export function addClickedResult(sessionId: string): void {
  const clicked = new Set(getClickedResults());
  clicked.add(sessionId);
  setClickedResults(Array.from(clicked));
}
