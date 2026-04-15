import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/api/documentsService";
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

interface FrontmatterField {
  key: string;
  value: string;
}

interface FrontmatterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentPath: string;
  frontmatter: Record<string, unknown>;
  bodyContent: string;
  onSaved: (newPath: string) => void;
}

function getDocName(path: string): string {
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/\.excalidraw\.md$/, "").replace(/\.md$/, "");
}

function valueToString(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value ?? "");
}

function frontmatterToFields(fm: Record<string, unknown>): FrontmatterField[] {
  return Object.entries(fm).map(([key, value]) => ({
    key,
    value: valueToString(value),
  }));
}

export function FrontmatterSheet({
  open,
  onOpenChange,
  documentPath,
  frontmatter,
  bodyContent,
  onSaved,
}: FrontmatterSheetProps) {
  const [docName, setDocName] = useState(() => getDocName(documentPath));
  const [fields, setFields] = useState<FrontmatterField[]>(() =>
    frontmatterToFields(frontmatter)
  );

  useEffect(() => {
    if (open) {
      setDocName(getDocName(documentPath));
      setFields(frontmatterToFields(frontmatter));
    }
  }, [open, documentPath, frontmatter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let currentPath = documentPath;

      // Rename if name changed
      const originalName = getDocName(documentPath);
      const trimmedName = docName.trim();
      if (trimmedName && trimmedName !== originalName) {
        const filename = documentPath.split("/").pop() ?? "";
        const ext = filename.endsWith(".excalidraw.md")
          ? ".excalidraw.md"
          : filename.includes(".")
            ? filename.slice(filename.lastIndexOf("."))
            : "";
        const folder = documentPath.split("/").slice(0, -1).join("/");
        const newPath = folder
          ? `${folder}/${trimmedName}${ext}`
          : `${trimmedName}${ext}`;
        await documentsService.moveDocument(currentPath, newPath);
        currentPath = newPath;
      }

      // Update frontmatter
      const fm: Record<string, string> = {};
      for (const { key, value } of fields) {
        if (key.trim()) fm[key.trim()] = value;
      }
      await documentsService.updateFrontmatter(currentPath, fm, bodyContent);

      return currentPath;
    },
    onSuccess: (newPath) => {
      toast.success("Properties saved");
      onSaved(newPath);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to save properties");
    },
  });

  const handleAddField = () =>
    setFields((prev) => [...prev, { key: "", value: "" }]);

  const handleRemoveField = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const handleKeyChange = (index: number, key: string) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, key } : f)));

  const handleValueChange = (index: number, value: string) =>
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, value } : f))
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col overflow-hidden w-full sm:max-w-[760px]"
        disableAutoSafeArea
      >
        <SheetHeader className="flex-none pt-6 pb-2 px-6">
          <SheetTitle>Properties</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-6 py-4">
          {/* Document Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Document Name</Label>
            <Input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Document name"
            />
          </div>

          <Separator />

          {/* Frontmatter Fields */}
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
            disabled={saveMutation.isPending || !docName.trim()}
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
