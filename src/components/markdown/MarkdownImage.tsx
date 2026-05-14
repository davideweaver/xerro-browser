interface MarkdownImageProps {
  src?: string;
  alt?: string;
  currentDocumentPath?: string;
}

/**
 * Custom image component for ReactMarkdown that points vault-relative paths
 * at the documents asset endpoint.
 *
 * Behavior:
 * - Absolute URLs (http://, https://, data:) pass through unchanged.
 * - Anything else is treated as an Obsidian-style asset reference. The raw path
 *   is sent to `GET /api/v1/documents/asset?path=<ref>&from=<docPath>`; the
 *   backend tries vault-absolute first, then falls back to relative-to-doc.
 *   This matches Obsidian's wiki-link resolution (e.g. `![[Assets/foo.jpeg]]`
 *   typically targets a top-level Assets folder, not a sibling).
 */
export function MarkdownImage({
  src,
  alt,
  currentDocumentPath,
}: MarkdownImageProps) {
  if (!src) return null;

  const isAbsolute =
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:");

  let finalSrc: string;
  if (isAbsolute) {
    finalSrc = src;
  } else {
    const baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
    const params = new URLSearchParams({ path: src });
    if (currentDocumentPath) {
      params.set("from", currentDocumentPath);
    }
    finalSrc = `${baseUrl}/api/v1/documents/asset?${params.toString()}`;
  }

  return (
    <img
      src={finalSrc}
      alt={alt ?? ""}
      loading="lazy"
      className="max-w-full h-auto rounded-md"
    />
  );
}
