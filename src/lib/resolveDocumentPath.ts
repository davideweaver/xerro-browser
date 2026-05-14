/**
 * Resolves a relative path inside the documents vault against a current document.
 *
 * - Leading `/` is treated as vault-absolute.
 * - `..` walks up one directory.
 * - `.` is ignored.
 * - Without `currentDocumentPath`, only the leading-slash case is normalized.
 *
 * Used by both MarkdownLink (internal doc navigation) and MarkdownImage
 * (asset URLs), which share the same Obsidian-style relative-path semantics.
 */
export function resolveDocumentPath(
  targetPath: string,
  currentDocumentPath?: string
): string {
  if (targetPath.startsWith("/")) {
    return targetPath.substring(1);
  }

  if (!currentDocumentPath) {
    return targetPath;
  }

  const currentDir = currentDocumentPath.split("/").slice(0, -1).join("/");
  const pathSegments = currentDir ? currentDir.split("/") : [];

  for (const segment of targetPath.split("/")) {
    if (segment === "..") {
      pathSegments.pop();
    } else if (segment !== ".") {
      pathSegments.push(segment);
    }
  }

  return pathSegments.join("/");
}
