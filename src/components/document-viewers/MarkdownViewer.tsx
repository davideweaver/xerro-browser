import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkWikiLinks from "@/lib/remarkWikiLinks";
import { preprocessNestedCodeBlocks } from "@/lib/remarkNestedCodeBlocks";
import { MarkdownLink } from "@/components/markdown/MarkdownLink";
import { MarkdownImage } from "@/components/markdown/MarkdownImage";
import type { Components } from "react-markdown";
import { useMemo } from "react";

interface MarkdownViewerProps {
  content: string;
  documentPath: string;
}

export function MarkdownViewer({ content, documentPath }: MarkdownViewerProps) {
  // Preprocess markdown to handle nested code blocks BEFORE parsing.
  // This must run before ReactMarkdown parses the content, otherwise nested
  // code fences (e.g., bash blocks inside markdown blocks) will incorrectly
  // close the outer block. See remarkNestedCodeBlocks.ts for details.
  const processedContent = useMemo(
    () => preprocessNestedCodeBlocks(content),
    [content]
  );

  const markdownComponents: Components = {
    a: ({ href, children, ...props }) => (
      <MarkdownLink href={href} currentDocumentPath={documentPath} {...props}>
        {children}
      </MarkdownLink>
    ),
    img: ({ src, alt }) => (
      <MarkdownImage
        src={typeof src === "string" ? src : undefined}
        alt={alt}
        currentDocumentPath={documentPath}
      />
    ),
  };

  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkWikiLinks]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </article>
  );
}
