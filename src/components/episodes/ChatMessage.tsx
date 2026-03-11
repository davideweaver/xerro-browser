import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  role: string;
  content: string;
  isUser: boolean;
  preview?: boolean;
  showRole?: boolean;
  permissionMode?: string;
}

export function ChatMessage({
  role,
  content,
  isUser,
  preview = false,
  showRole = true,
  permissionMode,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 mb-4",
        preview ? "items-start" : (isUser ? "items-end" : "items-start")
      )}
    >
      {showRole && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span>{role}</span>
          {permissionMode === 'plan' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-500">
              plan mode
            </Badge>
          )}
          {permissionMode === 'acceptEdits' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/50 text-blue-500">
              accept edits
            </Badge>
          )}
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 max-w-[80%] break-words",
          preview
            ? "bg-muted/50 text-foreground"
            : isUser
            ? "bg-primary text-white"
            : "bg-muted text-foreground"
        )}
      >
        <div className={cn(
          "text-sm prose prose-sm max-w-none",
          "[&_h1]:text-[16px] [&_h1]:font-medium [&_h2]:text-[16px] [&_h2]:font-medium [&_h3]:text-[16px] [&_h3]:font-medium [&_h4]:text-[16px] [&_h4]:font-medium [&_h5]:text-[16px] [&_h5]:font-medium [&_h6]:text-[16px] [&_h6]:font-medium",
          "[&_hr]:my-2",
          isUser && !preview ? "prose-invert [&_p]:text-white [&_code]:text-white [&_li]:text-white [&_strong]:text-white [&_em]:text-white [&_a]:text-white" : "dark:prose-invert"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
