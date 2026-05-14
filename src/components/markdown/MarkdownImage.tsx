import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

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
 * - Absolute URLs (http://, https://, data:) render directly as <img src>.
 * - Anything else is treated as an Obsidian-style asset reference and fetched
 *   from `GET /api/v1/documents/asset?path=<ref>&from=<docPath>`. The fetch
 *   goes through apiFetch so the Bearer token is attached (a plain <img src>
 *   can't carry an Authorization header), and the response Blob is exposed
 *   via a temporary object URL.
 */
export function MarkdownImage({
  src,
  alt,
  currentDocumentPath,
}: MarkdownImageProps) {
  const isAbsolute =
    !!src &&
    (src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("data:"));

  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src || isAbsolute) return;

    let revoked = false;
    let createdUrl: string | null = null;

    const baseUrl = import.meta.env.VITE_XERRO_API_URL || "";
    const params = new URLSearchParams({ path: src });
    if (currentDocumentPath) params.set("from", currentDocumentPath);
    const assetUrl = `${baseUrl}/api/v1/documents/asset?${params.toString()}`;

    apiFetch(assetUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Asset fetch failed: ${res.status}`);
        const blob = await res.blob();
        if (revoked) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (!revoked) setObjectUrl(null);
      });

    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setObjectUrl(null);
    };
  }, [src, currentDocumentPath, isAbsolute]);

  if (!src) return null;

  const finalSrc = isAbsolute ? src : objectUrl;
  if (!finalSrc) return null;

  return (
    <img
      src={finalSrc}
      alt={alt ?? ""}
      loading="lazy"
      className="max-w-full h-auto rounded-md"
    />
  );
}
