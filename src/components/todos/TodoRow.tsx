import { useState, useEffect } from "react";
import { ExcerptMarkdown } from "@/components/markdown/ExcerptMarkdown";
import type { Todo } from "@/types/todos";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, FolderOpen, MoreHorizontal, PanelRight, ArrowDown, ChevronRight, ChevronsRight, Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO, addDays, startOfWeek, addWeeks } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { todosService } from "@/api/todosService";
import { MobileBottomDrawer, MobileDrawerButton } from "@/components/mobile/MobileBottomDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// eslint-disable-next-line react-refresh/only-export-components
export function formatScheduledDate(dateStr: string): string {
  try {
    // Extract just the date portion (YYYY-MM-DD) to avoid timezone issues
    const datePart = dateStr.split('T')[0];
    const date = parseISO(datePart);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"))
      return "Today";
    if (format(date, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd"))
      return "Tomorrow";
    return format(date, "MMM d");
  } catch {
    return dateStr;
  }
}

interface TodoRowProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete?: () => void;
  onOpen?: (todo: Todo) => void;
  showProject?: boolean;
}

export function TodoRow({
  todo,
  onToggle,
  onDelete,
  onOpen,
  showProject = false,
}: TodoRowProps) {
  const isMobile = useIsMobile();
  const [optimisticCompleted, setOptimisticCompleted] = useState(todo.completed);
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: (scheduledDate: string) =>
      todosService.updateTodo(todo.id, { scheduledDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["todos-projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-todos"] });
    },
  });

  const handleMoveToNextDay = () => {
    const base = todo.scheduledDate ? parseISO(todo.scheduledDate.split("T")[0]) : new Date();
    moveMutation.mutate(addDays(base, 1).toISOString());
  };

  const handleMoveToNextWeek = () => {
    const nextMonday = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
    moveMutation.mutate(nextMonday.toISOString());
  };

  // Sync with server state when it changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticCompleted(todo.completed);
  }, [todo.completed]);

  const handleToggle = (checked: boolean) => {
    // Update optimistic state immediately
    setOptimisticCompleted(checked);
    // Call the parent's toggle handler
    onToggle(todo.id, checked);
  };

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-accent/30 transition-colors -mx-4 ${onOpen ? "cursor-pointer" : ""}`}
      onClick={() => onOpen?.(todo)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          id={`todo-${todo.id}`}
          checked={optimisticCompleted}
          onCheckedChange={(checked) => handleToggle(checked as boolean)}
          className="mt-1 h-5 w-5 shrink-0 border-white/50 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-gray-900"
        />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-base font-semibold leading-snug block mt-[3px] ${
            optimisticCompleted
              ? "line-through text-muted-foreground"
              : "text-foreground"
          }`}
        >
          {todo.title}
        </span>
        {todo.body && (
          <ExcerptMarkdown content={todo.body} inline className="mt-0.5 line-clamp-2" />
        )}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          {showProject && todo.projectName && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              {todo.projectName}
            </span>
          )}
          {todo.scheduledDate && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatScheduledDate(todo.scheduledDate)}
            </span>
          )}
        </div>
      </div>
      {(onDelete || onOpen) && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleMoveToNextDay}
            disabled={moveMutation.isPending}
            className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-muted-foreground/30 transition-all ${
              isMobile ? "" : "opacity-0 group-hover:opacity-100"
            }`}
            title="Move to next day"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          {!isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-muted-foreground/30 transition-all opacity-0 group-hover:opacity-100"
                  title="More options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onOpen && (
                  <DropdownMenuItem onClick={() => onOpen(todo)}>
                    <PanelRight className="mr-2 h-4 w-4" />
                    Details
                  </DropdownMenuItem>
                )}
                {onOpen && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={handleMoveToNextDay} disabled={moveMutation.isPending}>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Move to next day
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMoveToNextWeek} disabled={moveMutation.isPending}>
                  <ChevronsRight className="mr-2 h-4 w-4" />
                  Move to next week
                </DropdownMenuItem>
                {onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <button
                onClick={() => setMenuOpen(true)}
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-muted-foreground/30 transition-all"
                title="More options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              <MobileBottomDrawer
                open={menuOpen}
                onOpenChange={setMenuOpen}
                title="Todo Options"
              >
                {onOpen && (
                  <MobileDrawerButton
                    onClick={() => { setMenuOpen(false); onOpen(todo); }}
                    icon={<PanelRight className="h-4 w-4" />}
                  >
                    Details
                  </MobileDrawerButton>
                )}
                <MobileDrawerButton
                  onClick={() => { handleMoveToNextDay(); setMenuOpen(false); }}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Move to next day
                </MobileDrawerButton>
                <MobileDrawerButton
                  onClick={() => { handleMoveToNextWeek(); setMenuOpen(false); }}
                  icon={<ChevronsRight className="h-4 w-4" />}
                >
                  Move to next week
                </MobileDrawerButton>
                {onDelete && (
                  <>
                    <div className="h-px bg-border mx-4 my-1" />
                    <MobileDrawerButton
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      icon={<Trash2 className="h-4 w-4" />}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </MobileDrawerButton>
                  </>
                )}
              </MobileBottomDrawer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
