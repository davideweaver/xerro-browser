/**
 * localStorage utility for managing document search state
 *
 * Persists search queries, results, and last clicked result
 */

import type { SearchResult } from "@/types/documents";

const SEARCH_QUERY_KEY = "graphiti-documents-search-query";
const SEARCH_RESULTS_KEY = "graphiti-documents-search-results";
const SEARCH_LAST_CLICKED_KEY = "graphiti-documents-search-last-clicked";
const SEARCH_CLICKED_RESULTS_KEY = "graphiti-documents-search-clicked-results";

const SEARCH_QUERY_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the current search query from localStorage
 * Returns empty string if not set or older than 1 hour
 */
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
  } catch (error) {
    console.error("Failed to read search query from localStorage:", error);
    return "";
  }
}

/**
 * Set the current search query in localStorage with a timestamp
 */
export function setSearchQuery(query: string): void {
  try {
    if (!query) {
      localStorage.removeItem(SEARCH_QUERY_KEY);
    } else {
      localStorage.setItem(
        SEARCH_QUERY_KEY,
        JSON.stringify({ query, savedAt: Date.now() })
      );
    }
  } catch (error) {
    console.error("Failed to save search query to localStorage:", error);
  }
}

/**
 * Get search results from localStorage
 * @returns The search results array or empty array
 */
export function getSearchResults(): SearchResult[] {
  try {
    const stored = localStorage.getItem(SEARCH_RESULTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to read search results from localStorage:", error);
    return [];
  }
}

/**
 * Set search results in localStorage
 * @param results - The search results to save
 */
export function setSearchResults(results: SearchResult[]): void {
  try {
    localStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(results));
  } catch (error) {
    console.error("Failed to save search results to localStorage:", error);
  }
}

/**
 * Get the last clicked search result from localStorage
 * @returns The last clicked result or null
 */
export function getLastClickedResult(): SearchResult | null {
  try {
    const stored = localStorage.getItem(SEARCH_LAST_CLICKED_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error(
      "Failed to read last clicked result from localStorage:",
      error
    );
    return null;
  }
}

/**
 * Set the last clicked search result in localStorage
 * @param result - The result that was clicked
 */
export function setLastClickedResult(result: SearchResult): void {
  try {
    localStorage.setItem(SEARCH_LAST_CLICKED_KEY, JSON.stringify(result));
  } catch (error) {
    console.error(
      "Failed to save last clicked result to localStorage:",
      error
    );
  }
}

/**
 * Get clicked results from localStorage
 * @returns Array of file paths that have been clicked
 */
export function getClickedResults(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_CLICKED_RESULTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to read clicked results from localStorage:", error);
    return [];
  }
}

/**
 * Set clicked results in localStorage
 * @param filePaths - Array of file paths that have been clicked
 */
export function setClickedResults(filePaths: string[]): void {
  try {
    localStorage.setItem(SEARCH_CLICKED_RESULTS_KEY, JSON.stringify(filePaths));
  } catch (error) {
    console.error("Failed to save clicked results to localStorage:", error);
  }
}

/**
 * Clear all search state from localStorage
 */
export function clearSearchState(): void {
  try {
    localStorage.removeItem(SEARCH_QUERY_KEY);
    localStorage.removeItem(SEARCH_RESULTS_KEY);
    localStorage.removeItem(SEARCH_LAST_CLICKED_KEY);
    localStorage.removeItem(SEARCH_CLICKED_RESULTS_KEY);
  } catch (error) {
    console.error("Failed to clear search state from localStorage:", error);
  }
}
