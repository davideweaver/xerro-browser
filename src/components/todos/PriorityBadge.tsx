import type { TodoPriority } from "@/types/todos";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: TodoPriority;
  showNormal?: boolean;
  className?: string;
}

const STYLES: Record<TodoPriority, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  normal: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<TodoPriority, string> = {
  high: "HIGH",
  medium: "MED",
  normal: "NORMAL",
};

export function PriorityBadge({
  priority,
  showNormal = false,
  className,
}: PriorityBadgeProps) {
  if (priority === "normal" && !showNormal) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider",
        STYLES[priority],
        className,
      )}
    >
      {LABELS[priority]}
    </span>
  );
}
