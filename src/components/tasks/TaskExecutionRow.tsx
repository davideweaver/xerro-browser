import { formatTimestamp, formatDuration } from "@/lib/cronFormatter";
import { CheckCircle2, XCircle, X, Zap } from "lucide-react";
import type { TaskExecution } from "@/types/agentTasks";
import { ExcerptMarkdown } from "@/components/markdown/ExcerptMarkdown";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskExecutionRowProps {
  execution: TaskExecution;
  onClick?: () => void;
  showTaskName?: boolean;
  onTaskNameClick?: () => void;
  onDelete?: (executionId: string) => void;
}

export function TaskExecutionRow({
  execution,
  onClick,
  showTaskName = false,
  onTaskNameClick,
  onDelete,
}: TaskExecutionRowProps) {
  const isMobile = useIsMobile();

  const renderExecutionStatus = () => {
    if (execution.success) {
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Success</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <XCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Failed</span>
      </div>
    );
  };

  return (
    <div
      className="group flex items-start justify-between border-b pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-2 rounded-md transition-colors relative"
      onClick={onClick}
    >
      {/* Delete Button (always visible on mobile, appears on hover on desktop) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(execution.id);
          }}
          className={`absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-white hover:bg-muted-foreground/30 transition-all rounded-md flex items-center justify-center ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          title="Delete"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-3">
          {renderExecutionStatus()}
          {showTaskName && execution.taskName && (
            onTaskNameClick ? (
              <button
                className="text-sm font-medium hover:underline text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskNameClick();
                }}
              >
                {execution.taskName}
              </button>
            ) : (
              <span className="text-sm font-medium">{execution.taskName}</span>
            )
          )}
        </div>
        <div className="text-sm text-muted-foreground pl-6">
          {formatTimestamp(execution.timestamp)}
        </div>
        {(execution.normalizedResult?.display.summary || execution.message) && (
          <ExcerptMarkdown
            content={execution.normalizedResult?.display.summary || execution.message || ""}
            className="pl-6 max-w-2xl line-clamp-3"
          />
        )}
        <div className="text-xs text-muted-foreground/60 pl-6 font-mono">
          {formatDuration(execution.durationMs)}
          {execution.model && ` · ${execution.model}`}
          {execution.isLocal !== undefined &&
            ` · ${execution.isLocal ? "Local" : "API"}`}
        </div>
        {execution.trigger && (
          <div className="flex items-center gap-1.5 pl-6 text-xs text-yellow-600 dark:text-yellow-500">
            <Zap className="h-3 w-3" />
            <span>{execution.trigger.name}</span>
          </div>
        )}
        {execution.error && (
          <p className="text-sm text-red-600 dark:text-red-400 pl-6 truncate max-w-2xl">
            {execution.error}
          </p>
        )}
      </div>
    </div>
  );
}
