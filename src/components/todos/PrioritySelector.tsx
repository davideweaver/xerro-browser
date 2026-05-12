import type { TodoPriority } from "@/types/todos";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface PrioritySelectorProps {
  value: TodoPriority;
  onChange: (value: TodoPriority) => void;
  className?: string;
}

const ACTIVE_STYLES: Record<TodoPriority, string> = {
  normal:
    "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  medium:
    "data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-300 data-[state=on]:border-amber-500/40",
  high:
    "data-[state=on]:bg-red-500/20 data-[state=on]:text-red-300 data-[state=on]:border-red-500/40",
};

const ITEM_BASE =
  "flex-1 h-10 border border-input bg-input text-lg md:text-sm hover:bg-accent/50";

export function PrioritySelector({
  value,
  onChange,
  className,
}: PrioritySelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as TodoPriority);
      }}
      className={cn("w-full gap-0", className)}
    >
      <ToggleGroupItem
        value="normal"
        aria-label="Normal priority"
        className={cn(ITEM_BASE, "rounded-r-none", ACTIVE_STYLES.normal)}
      >
        Normal
      </ToggleGroupItem>
      <ToggleGroupItem
        value="medium"
        aria-label="Medium priority"
        className={cn(ITEM_BASE, "rounded-none border-x-0", ACTIVE_STYLES.medium)}
      >
        Medium
      </ToggleGroupItem>
      <ToggleGroupItem
        value="high"
        aria-label="High priority"
        className={cn(ITEM_BASE, "rounded-l-none", ACTIVE_STYLES.high)}
      >
        High
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
