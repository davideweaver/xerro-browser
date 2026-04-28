import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsService } from "@/api/agentsService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getFileType, DocumentFileType } from "@/lib/fileTypeUtils";
import { parseFrontmatter, serializeFrontmatter } from "@/lib/frontmatterUtils";
import type { FrontmatterField } from "@/lib/frontmatterUtils";
import type { WorkspaceFileContent } from "@/types/agents";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AgentFilePropertiesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  filePath: string;
  fileData: WorkspaceFileContent;
  onSaved: (newPath: string) => void;
}

export function AgentFilePropertiesSheet({
  open,
  onOpenChange,
  agentId,
  filePath,
  fileData,
  onSaved,
}: AgentFilePropertiesSheetProps) {
  const queryClient = useQueryClient();
  const fileType = getFileType(filePath);
  const isMarkdown = fileType === DocumentFileType.MARKDOWN;

  const currentName = filePath.split("/").pop() ?? filePath;
  const [fileName, setFileName] = useState(currentName);
  const [fields, setFields] = useState<FrontmatterField[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setFileName(currentName);
      if (isMarkdown) {
        const parsed = parseFrontmatter(fileData.content);
        setFields(parsed.fields);
        setBody(parsed.body);
      }
    }
  }, [open, currentName, fileData.content, isMarkdown]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let currentPath = filePath;

      // Rename if name changed
      const trimmedName = fileName.trim();
      if (trimmedName && trimmedName !== currentName) {
        const folder = filePath.split("/").slice(0, -1).join("/");
        const newPath = folder ? `${folder}/${trimmedName}` : trimmedName;
        await agentsService.moveFile(agentId, currentPath, newPath);
        currentPath = newPath;
      }

      // Update frontmatter if markdown
      if (isMarkdown) {
        const newContent = serializeFrontmatter(fields, body);
        if (newContent !== fileData.content || currentPath !== filePath) {
          await agentsService.updateFile(agentId, currentPath, newContent);
        }
      }

      return currentPath;
    },
    onSuccess: (newPath) => {
      queryClient.invalidateQueries({ queryKey: ["agent-files-nav", agentId] });
      queryClient.removeQueries({ queryKey: ["agent-file-content", agentId, filePath] });
      toast.success("Properties saved");
      onSaved(newPath);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAddField = () =>
    setFields((prev) => [...prev, { key: "", value: "" }]);

  const handleRemoveField = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const handleKeyChange = (index: number, key: string) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, key } : f)));

  const handleValueChange = (index: number, value: string) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col overflow-hidden w-full sm:max-w-[760px]"
      >
        <SheetHeader className="flex-none pt-6 pb-2 px-6">
          <SheetTitle>Properties</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6 py-4">
          {/* File Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="filename.md"
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveMutation.mutate();
              }}
            />
          </div>

          <Separator />

          {/* File Information */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Information</Label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Path</span>
                <span className="font-mono text-xs text-right break-all">{filePath}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Size</span>
                <span>{formatBytes(fileData.size)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Modified</span>
                <span>{new Date(fileData.modified).toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(fileData.created).toLocaleString()}</span>
              </div>
              {fileData.totalLines !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Lines</span>
                  <span>{fileData.totalLines.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Frontmatter — markdown only */}
          {isMarkdown && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Metadata</Label>

                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No metadata fields</p>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={field.key}
                          onChange={(e) => handleKeyChange(index, e.target.value)}
                          placeholder="key"
                          className="w-[110px] shrink-0 font-mono text-sm"
                        />
                        <Input
                          value={field.value}
                          onChange={(e) => handleValueChange(index, e.target.value)}
                          placeholder="value"
                          className="flex-1 font-mono text-sm"
                        />
                        <button
                          onClick={() => handleRemoveField(index)}
                          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add field
                </Button>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-none border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !fileName.trim()}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
