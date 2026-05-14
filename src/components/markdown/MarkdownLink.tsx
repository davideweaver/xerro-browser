import { Link } from "react-router-dom";
import { resolveDocumentPath } from "@/lib/resolveDocumentPath";

interface MarkdownLinkProps {
  href?: string;
  children?: React.ReactNode;
  currentDocumentPath?: string;
}

/**
 * Custom link component for ReactMarkdown that handles internal document links
 * and external links appropriately.
 *
 * Internal links (markdown files):
 * - Rendered as React Router Links for client-side navigation
 * - Relative paths resolved based on currentDocumentPath
 * - .md extension automatically stripped for routing
 *
 * External links:
 * - Open in new tab with security attributes
 */
export function MarkdownLink({
  href,
  children,
  currentDocumentPath,
  ...props
}: MarkdownLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return <a {...props}>{children}</a>;

  // Check if this is an internal markdown link
  const isInternalLink =
    href.endsWith(".md") ||
    href.includes(".md#") ||
    (!href.startsWith("http://") &&
      !href.startsWith("https://") &&
      !href.startsWith("mailto:"));

  if (isInternalLink) {
    const linkPath = resolveDocumentPath(href, currentDocumentPath);

    // Navigate to the document
    return (
      <Link
        to={`/documents/${linkPath}`}
        className="text-primary hover:underline"
        {...props}
      >
        {children}
      </Link>
    );
  }

  // External links open in new tab
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      {...props}
    >
      {children}
    </a>
  );
}
