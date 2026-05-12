import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CreateTodoInput, Todo, TodoPriority, UpdateTodoInput } from "@/types/todos";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { todosService } from "@/api/todosService";
import { PrioritySelector } from "@/components/todos/PrioritySelector";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BaseDialog } from "@/components/BaseDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface CreateTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTodoInput | UpdateTodoInput, todoId?: string) => void;
  isSubmitting: boolean;
  defaultProjectName?: string;
  projectNameDisabled?: boolean;
  todo?: Todo | null; // If provided, dialog is in "edit mode"
}

export function CreateTodoDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  defaultProjectName,
  projectNameDisabled,
  todo,
}: CreateTodoDialogProps) {
  const isEditMode = !!todo;

  const { data: projectsData } = useQuery({
    queryKey: ["xerro-projects-all"],
    queryFn: () => xerroProjectsService.listProjects({ limit: 100 }),
  });
  const { data: todoProjectsData } = useQuery({
    queryKey: ["todos-projects-all"],
    queryFn: () => todosService.getProjects(),
  });

  const xerroProjects = projectsData?.items.map((p) => p.name) ?? [];
  const todoProjects = todoProjectsData?.projects ?? [];
  const customProjects = todoProjects.filter((p) => !xerroProjects.includes(p));
  const allProjects = [...new Set([...xerroProjects, ...customProjects])].sort();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [projectName, setProjectName] = useState<string | null>(defaultProjectName || null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<TodoPriority>("normal");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => {
    if (open) {
      if (isEditMode && todo) {
        // Populate with existing todo data
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(todo.title);
        setBody(todo.body || "");
        setProjectName(todo.projectName || null);
        setScheduledDate(todo.scheduledDate ? new Date(todo.scheduledDate) : undefined);
        setPriority(todo.priority ?? "normal");
      } else {
        // Reset for new todo
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle("");
        setBody("");
        setProjectName(defaultProjectName || null);
        setScheduledDate(new Date());
        setPriority("normal");
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCalendarOpen(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectOpen(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectSearch("");
    }
  }, [open, defaultProjectName, isEditMode, todo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditMode && todo) {
      // Build update input (only include changed fields)
      const input: UpdateTodoInput = { title: title.trim() };
      if (body.trim()) input.body = body.trim();
      else input.body = null; // Explicitly clear if empty
      if (projectName) input.projectName = projectName;
      else input.projectName = null;
      if (scheduledDate) {
        const d = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
        input.scheduledDate = d.toISOString();
      } else {
        input.scheduledDate = null;
      }
      input.priority = priority;
      onSubmit(input, todo.id);
    } else {
      // Build create input
      const input: CreateTodoInput = { title: title.trim() };
      if (body.trim()) input.body = body.trim();
      if (projectName) input.projectName = projectName;
      if (scheduledDate) {
        const d = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
        input.scheduledDate = d.toISOString();
      }
      input.priority = priority;
      onSubmit(input);
    }
  };

  const footer = (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        onClick={handleSubmit}
      >
        {isSubmitting
          ? (isEditMode ? "Updating..." : "Creating...")
          : (isEditMode ? "Update" : "Create")
        }
      </Button>
    </div>
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Todo" : "New Todo"}
      footer={footer}
      footerHeight={64}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="todo-title" className="text-base">Title</Label>
          <Input
            id="todo-title"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            className="text-lg"
          />
        </div>
        {!isEditMode && (
          <div className="space-y-2">
            <Label htmlFor="todo-body" className="text-base">Notes</Label>
            <Textarea
              id="todo-body"
              placeholder="Add any additional notes or details..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[100px] resize-y text-lg"
            />
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Priority</Label>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Project</Label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen} modal={false}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={projectNameDisabled}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-input px-3 py-2 text-lg md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={cn("flex-1 text-left", !projectName && "text-muted-foreground")}>
                    {projectName ?? "No project"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[1010]" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search or enter custom name..."
                    value={projectSearch}
                    onValueChange={setProjectSearch}
                  />
                  <CommandList
                    onWheel={(e) => {
                      e.stopPropagation();
                      e.currentTarget.scrollTop += e.deltaY;
                    }}
                  >
                    <CommandEmpty>
                      {projectSearch.trim() ? (
                        <CommandItem
                          onSelect={() => {
                            setProjectName(projectSearch.trim());
                            setProjectSearch("");
                            setProjectOpen(false);
                          }}
                        >
                          Use &ldquo;{projectSearch.trim()}&rdquo;
                        </CommandItem>
                      ) : (
                        "No projects found."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={() => { setProjectName(null); setProjectSearch(""); setProjectOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", projectName === null ? "opacity-100" : "opacity-0")} />
                        No project
                      </CommandItem>
                      {allProjects.map((p) => (
                        <CommandItem
                          key={p}
                          value={p}
                          onSelect={() => { setProjectName(p); setProjectSearch(""); setProjectOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", projectName === p ? "opacity-100" : "opacity-0")} />
                          {p}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {projectSearch.trim() && !allProjects.includes(projectSearch.trim()) && (
                      <CommandGroup heading="Custom">
                        <CommandItem
                          value={`__custom__${projectSearch.trim()}`}
                          onSelect={() => { setProjectName(projectSearch.trim()); setProjectSearch(""); setProjectOpen(false); }}
                        >
                          Use &ldquo;{projectSearch.trim()}&rdquo;
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="text-base">Scheduled date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-full items-center rounded-md border border-input bg-input px-3 py-2 font-sans text-lg md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <span className="flex-1 text-left">
                    {scheduledDate ? format(scheduledDate, "MMMM d, yyyy") : "Pick a date"}
                  </span>
                  {scheduledDate ? (
                    <span
                      role="button"
                      aria-label="Clear date"
                      onClick={(e) => { e.stopPropagation(); setScheduledDate(undefined); }}
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </span>
                  ) : (
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[1010]" align="start">
                <div className="flex gap-1 p-2 border-b border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setScheduledDate(new Date());
                      setCalendarOpen(false);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setScheduledDate(tomorrow);
                      setCalendarOpen(false);
                    }}
                  >
                    Tomorrow
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => { setScheduledDate(date); setCalendarOpen(false); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </form>
    </BaseDialog>
  );
}
