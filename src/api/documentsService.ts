import { toast } from "@/hooks/use-toast";
import type {
  DocumentListResponse,
  DocumentViewResponse,
  NavigationItem,
  FolderItem,
  DocumentItem,
  DocumentSearchResponse,
  DocumentSearchRequest,
  BookmarkListResponse,
  BookmarkRequest,
  BookmarkDeleteResponse,
  Bookmark,
} from "@/types/documents";

class DocumentsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_XERRO_SERVICE_URL || "http://localhost:9205";
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses (e.g., successful DELETE operations)
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  async listDocuments(
    folder?: string,
    limit = 100,
    offset = 0,
    recursive = true
  ): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (folder) params.append("folder", folder);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    params.append("recursive", recursive.toString());

    return this.fetch<DocumentListResponse>(
      `/api/v1/documents?${params}`
    );
  }

  async getDocument(path: string): Promise<DocumentViewResponse> {
    const params = new URLSearchParams({ path });
    return this.fetch<DocumentViewResponse>(
      `/api/v1/documents/view?${params}`
    );
  }

  async getFolderStructure(folder?: string): Promise<NavigationItem[]> {
    // Use non-recursive mode to efficiently get immediate children only
    const response = await this.listDocuments(folder, 1000, 0, false);

    // Build folder items from API response
    const folderItems: FolderItem[] = (response.folders || [])
      .map((folderPath) => {
        const segments = folderPath.split("/");
        const name = segments[segments.length - 1];
        return {
          name,
          path: folderPath,
          type: "folder" as const,
          // Note: API doesn't return document count per folder in non-recursive mode
          // We could add this later with a separate API call if needed
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Build document items from API response
    const documentItems: DocumentItem[] = response.documents
      .map((doc) => {
        const segments = doc.path.split("/");
        const name = segments[segments.length - 1];
        return {
          name,
          path: doc.path,
          type: "document" as const,
          modified: doc.modified,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime()
      );

    // Return folders first, then documents
    return [...folderItems, ...documentItems];
  }

  async searchDocuments(
    query: string,
    limit = 20
  ): Promise<DocumentSearchResponse> {
    const body: DocumentSearchRequest = { query, limit };
    return this.fetch<DocumentSearchResponse>(
      "/api/v1/documents/search",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  }

  async updateDocument(path: string, content: string): Promise<DocumentViewResponse> {
    const params = new URLSearchParams({ path });
    return this.fetch<DocumentViewResponse>(
      `/api/v1/documents?${params}`,
      {
        method: "PUT",
        body: JSON.stringify({ content, preserveFrontmatter: true, autoVectorize: true }),
      }
    );
  }

  async deleteDocument(path: string): Promise<void> {
    const params = new URLSearchParams({ path });
    return this.fetch<void>(
      `/api/v1/documents?${params}`,
      {
        method: "DELETE",
      }
    );
  }

  async listBookmarks(tags?: string[]): Promise<BookmarkListResponse> {
    const params = new URLSearchParams();
    if (tags && tags.length > 0) {
      params.append("tags", tags.join(","));
    }
    return this.fetch<BookmarkListResponse>(
      `/api/v1/documents/bookmarks${params.toString() ? `?${params}` : ""}`
    );
  }

  async addBookmark(request: BookmarkRequest): Promise<Bookmark> {
    return this.fetch<Bookmark>(
      "/api/v1/documents/bookmarks",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async removeBookmark(path: string): Promise<BookmarkDeleteResponse> {
    const params = new URLSearchParams({ path });
    return this.fetch<BookmarkDeleteResponse>(
      `/api/v1/documents/bookmarks?${params}`,
      {
        method: "DELETE",
      }
    );
  }
}

export const documentsService = new DocumentsService();
