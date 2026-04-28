export interface FrontmatterField {
  key: string;
  value: string;
}

export function parseFrontmatter(content: string): { fields: FrontmatterField[]; body: string } {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { fields: [], body: content };
  }
  const afterOpen = content.indexOf("\n", 3) + 1;
  const closeIndex = content.indexOf("\n---", afterOpen);
  if (closeIndex === -1) return { fields: [], body: content };

  const yamlBlock = content.substring(afterOpen, closeIndex);
  const body = content.substring(closeIndex + 4).replace(/^\n/, "");

  const fields: FrontmatterField[] = [];
  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();
    if (key) fields.push({ key, value });
  }

  return { fields, body };
}

export function serializeFrontmatter(fields: FrontmatterField[], body: string): string {
  const active = fields.filter((f) => f.key.trim());
  if (active.length === 0) return body;
  const yaml = active.map((f) => `${f.key}: ${f.value}`).join("\n");
  return `---\n${yaml}\n---\n${body}`;
}
