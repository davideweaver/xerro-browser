import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/api/documentsService";
import Container from "@/components/container/Container";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, ArrowRight, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getSearchQuery,
  setSearchQuery,
  setSearchResults,
  setLastClickedResult,
  getClickedResults,
  setClickedResults,
} from "@/lib/documentsSearchStorage";
import type { SearchResult } from "@/types/documents";

export default function DocumentSearch() {
  const navigate = useNavigate();

  // Initialize from localStorage
  const [searchInput, setSearchInput] = useState(() => getSearchQuery());
  const [searchQuery, setSearchQueryState] = useState(() => getSearchQuery());
  const [clickedResults, setClickedResultsState] = useState<Set<string>>(
    () => new Set(getClickedResults())
  );
  const [searchDuration, setSearchDuration] = useState<number | null>(null);
  const searchStartTime = useRef<number | null>(null);

  // Fetch search results
  const { data, isLoading } = useQuery({
    queryKey: ["documents-search", searchQuery],
    queryFn: () => documentsService.searchDocuments(searchQuery, 50),
    enabled: searchQuery.length > 0,
  });

  const results = useMemo(() => data?.results || [], [data?.results]);

  // Save results and record duration when results arrive
  useEffect(() => {
    if (results.length > 0) {
      setSearchResults(results);
      if (searchStartTime.current !== null) {
        setSearchDuration((Date.now() - searchStartTime.current) / 1000);
        searchStartTime.current = null;
      }
    }
  }, [results]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const query = searchInput.trim();
      setSearchQueryState(query);
      setSearchQuery(query);
      // Clear clicked results and duration on new search
      setClickedResultsState(new Set());
      setClickedResults([]);
      setSearchDuration(null);
      searchStartTime.current = Date.now();
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    // Mark this result as clicked
    const newClickedSet = new Set(clickedResults).add(result.filePath);
    setClickedResultsState(newClickedSet);
    setClickedResults(Array.from(newClickedSet));
    setLastClickedResult(result);
    navigate(`/documents/${result.filePath}`);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQueryState("");
    setSearchQuery("");
    // Clear clicked results when search is cleared
    setClickedResultsState(new Set());
    setClickedResults([]);
  };

  return (
    <Container
      title="Search Documents"
      description="Search your Obsidian vault using semantic search"
    >
      <div className="space-y-6">
        {/* Search Input */}
        <form onSubmit={handleSearch}>
          <div className="space-y-2">
            <Label htmlFor="search">Search Query</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search for documents, facts, or memories..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                  autoFocus
                />
                {searchInput && !isLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button type="submit" size="icon" disabled={!searchInput.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Results */}
        <div className="mt-8">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-32 bg-accent/50 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty State - No Results */}
          {!isLoading && results.length === 0 && searchQuery && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  No documents found for "{searchQuery}"
                </p>
              </CardContent>
            </Card>
          )}

          {/* Initial State - No Query */}
          {!searchQuery && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  Start searching your documents
                </h3>
                <p className="text-muted-foreground">
                  Enter a search query and click the search button to find documents.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div>
              <div className="mb-4 text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? "s" : ""}
                {searchDuration !== null && ` in ${searchDuration.toFixed(1)}s`}
              </div>
              <div className="space-y-3">
                {results.map((result, index) => {
                  const isClicked = clickedResults.has(result.filePath);
                  return (
                    <Card
                      key={`${result.filePath}-${index}`}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <FileText className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {/* File name and match score */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {result.fileName}
                            </span>
                            {result.hybridScore && (
                              <span className="text-xs text-muted-foreground">
                                {(result.hybridScore * 100).toFixed(0)}% match
                              </span>
                            )}
                          </div>

                          {/* Heading */}
                          {result.heading && (
                            <div className="text-sm text-muted-foreground mb-2">
                              {result.heading}
                            </div>
                          )}

                          {/* Content preview */}
                          <div className="text-sm text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none [&>*]:my-0">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {result.content}
                            </ReactMarkdown>
                          </div>

                          {/* File path */}
                          <div className="text-xs text-muted-foreground mt-2 truncate">
                            {result.filePath}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-1">
                          {isClicked && (
                            <Badge variant="secondary" className="text-xs">
                              VIEWED
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
