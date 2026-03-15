import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@/types/todos";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BaseDialog } from "@/components/BaseDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const projects = projectsData?.items.map((p) => p.name) ?? [];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [projectName, setProjectName] = useState<string | null>(defaultProjectName || null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEditMode && todo) {
        // Populate with existing todo data
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(todo.title);
        setBody(todo.body || "");
        setProjectName(todo.projectName || null);
        setScheduledDate(todo.scheduledDate ? new Date(todo.scheduledDate) : undefined);
      } else {
        // Reset for new todo
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle("");
        setBody("");
        setProjectName(defaultProjectName || null);
        setScheduledDate(undefined);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCalendarOpen(false);
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
            <Label className="text-base">Project</Label>
            <Select
              value={projectName ?? "__none__"}
              onValueChange={(val) => setProjectName(val === "__none__" ? null : val)}
              disabled={projectNameDisabled}
            >
              <SelectTrigger className="text-lg md:text-sm bg-input">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
