import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { chatService } from "@/api/chatService";
import {
  getSearchQuery,
  setSearchQuery,
  getClickedResults,
  setClickedResults,
  addClickedResult,
} from "@/lib/chatSearchStorage";
import Container from "@/components/container/Container";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MessageSquare, ArrowRight, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ChatSessionSearchResult } from "@/types/xerroChat";

export default function ChatSessionSearch() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(() => getSearchQuery());
  const [searchQuery, setSearchQueryState] = useState(() => getSearchQuery());
  const [clickedResults, setClickedResultsState] = useState<Set<string>>(
    () => new Set(getClickedResults())
  );
  const [searchDuration, setSearchDuration] = useState<number | null>(null);
  const searchStartTime = useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-sessions-search", searchQuery],
    queryFn: () => chatService.searchSessions(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const results = useMemo(() => data?.results ?? [], [data?.results]);

  useEffect(() => {
    if (results.length > 0 && searchStartTime.current !== null) {
      setSearchDuration((Date.now() - searchStartTime.current) / 1000);
      searchStartTime.current = null;
    }
  }, [results]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (query) {
      setSearchQueryState(query);
      setSearchQuery(query);
      setClickedResultsState(new Set());
      setClickedResults([]);
      setSearchDuration(null);
      searchStartTime.current = Date.now();
    }
  };

  const handleResultClick = (result: ChatSessionSearchResult) => {
    const newClicked = new Set(clickedResults).add(result.chatSessionId);
    setClickedResultsState(newClicked);
    addClickedResult(result.chatSessionId);
    navigate(`/chat/${result.chatSessionId}`);
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchQueryState("");
    setSearchQuery("");
    setClickedResultsState(new Set());
    setClickedResults([]);
    setSearchDuration(null);
  };

  return (
    <Container title="Search Chats">
      <div className="space-y-6">
        <form onSubmit={handleSearch}>
          <div className="space-y-2">
            <Label htmlFor="search">Search Query</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search chat sessions..."
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
                    onClick={handleClear}
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

        <div className="mt-8">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-accent/50 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && searchQuery && results.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">No sessions found for "{searchQuery}"</p>
              </CardContent>
            </Card>
          )}

          {!searchQuery && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Search your chats</h3>
                <p className="text-muted-foreground">
                  Enter a query to find relevant chat sessions.
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && results.length > 0 && (
            <div>
              <div className="mb-4 text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? "s" : ""}
                {searchDuration !== null && ` in ${searchDuration.toFixed(1)}s`}
              </div>
              <div className="space-y-3">
                {results.map((result) => (
                  <Card
                    key={result.chatSessionId}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <MessageSquare className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {result.description || "Untitled session"}
                            </span>
                            {result.score > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {(result.score * 100).toFixed(0)}% match
                              </span>
                            )}
                          </div>
                          {result.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {result.excerpt}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(result.startedAt), { addSuffix: true })}
                            {result.messageCount > 0 && ` • ${result.messageCount} msgs`}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-1">
                          {clickedResults.has(result.chatSessionId) && (
                            <Badge variant="secondary" className="text-xs">
                              VIEWED
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
