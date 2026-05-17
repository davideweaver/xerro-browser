import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import ClickableImage from "./ClickableImage";

interface AuthenticatedClickableImageProps {
  url: string;
  alt?: string;
  className?: string;
}

// Renders an image from an authenticated API URL by fetching the bytes via
// apiFetch (which attaches the Bearer token) and exposing the result as a
// blob object URL. Browsers don't send Authorization headers on plain
// <img src> requests, so a fetch detour is required.
export default function AuthenticatedClickableImage({ url, alt, className }: AuthenticatedClickableImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    apiFetch(url)
      .then(async (response) => {
        if (cancelled || !response.ok) return;
        const blob = await response.blob();
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      })
      .catch(() => {
        // network/auth failures leave the placeholder visible
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  if (!blobUrl) {
    return <div className={className} aria-label={alt} role="img" />;
  }

  return <ClickableImage src={blobUrl} alt={alt} className={className} />;
}
