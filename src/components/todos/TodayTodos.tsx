import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Circle } from "lucide-react";
import { todosService } from "@/api/todosService";
import type { Todo, UpdateTodoInput } from "@/types/todos";
import { TodoEditSheet } from "@/components/todos/TodoEditSheet";
import { useTodayTodosConfig } from "@/hooks/use-today-todos-config";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 5;

export function TodayTodos({ className }: { className?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const { config: todosConfig } = useTodayTodosConfig();
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ["todos", "today", today],
    queryFn: () => todosService.listTodos({ scheduledDate: today, completed: false, limit: 50 }),
    refetchInterval: 2 * 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => todosService.updateTodo(id, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTodoInput }) =>
      todosService.updateTodo(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const allTodos = data?.todos ?? [];
  const todos = allTodos.filter((t) => {
    if (optimisticDone.has(t.id)) return false;
    if (!t.projectName) return todosConfig.showNoProject;
    return todosConfig.projects.includes(t.projectName);
  });

  if (!data || todos.length === 0) return null;

  const visible = todos.slice(0, MAX_VISIBLE);
  const remaining = Math.max(0, todos.length - MAX_VISIBLE);

  const handleComplete = (todo: Todo) => {
    setOptimisticDone((prev) => new Set(prev).add(todo.id));
    completeMutation.mutate(todo.id);
  };

  const handleSave = async (id: string, input: UpdateTodoInput) => {
    await saveMutation.mutateAsync({ id, input });
  };

  return (
    <div className={cn(className)}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Todos
      </div>

      {visible.map((todo) => (
        <div
          key={todo.id}
          onClick={() => setSelectedTodo(todo)}
          className="flex items-start gap-2 rounded-lg pl-2.5 pr-3 py-2 mb-1 hover:bg-accent/40 transition-colors cursor-pointer"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleComplete(todo);
            }}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
            title="Mark complete"
          >
            <Circle className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{todo.title}</div>
            {todo.projectName && (
              <div className="text-xs text-muted-foreground mt-0.5">{todo.projectName}</div>
            )}
          </div>
        </div>
      ))}

      {remaining > 0 && (
        <button
          onClick={() => navigate("/todos")}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1.5"
        >
          +{remaining} more todo{remaining !== 1 ? "s" : ""} today
        </button>
      )}

      <TodoEditSheet
        todo={selectedTodo}
        onClose={() => setSelectedTodo(null)}
        onSave={handleSave}
      />
    </div>
  );
}
