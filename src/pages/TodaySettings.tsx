import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, X, Plus, Check, ChevronsUpDown } from "lucide-react";
import Container from "@/components/container/Container";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useFeedsConfig } from "@/hooks/use-feeds-config";
import { useTodayTodosConfig } from "@/hooks/use-today-todos-config";
import { feedsService } from "@/api/feedsService";
import { todosService } from "@/api/todosService";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import type { FeedTopicConfig, FeedTopicStyle } from "@/hooks/use-feeds-config";
import type { FeedTopic } from "@/types/feeds";
import { cn } from "@/lib/utils";

function mergeWithTopics(topics: FeedTopic[], config: FeedTopicConfig[]): FeedTopicConfig[] {
  const configuredIds = new Set(config.map((c) => c.topicId));
  const stillValid = config.filter((c) => topics.some((t) => t.id === c.topicId));
  const unconfigured = topics
    .filter((t) => !configuredIds.has(t.id))
    .map((t) => ({ topicId: t.id, style: "standard" as FeedTopicStyle, enabled: true }));
  return [...stillValid, ...unconfigured];
}

export default function TodaySettings() {
  const { config, setConfig } = useFeedsConfig();
  const { config: todosConfig, addProject, removeProject, setShowNoProject } = useTodayTodosConfig();
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  const { data: topicsData } = useQuery({
    queryKey: ["feeds-topics"],
    queryFn: () => feedsService.listTopics(),
  });
  const { data: xerroProjectsData } = useQuery({
    queryKey: ["xerro-projects-all"],
    queryFn: () => xerroProjectsService.listProjects({ limit: 100 }),
  });
  const { data: todoProjectsData } = useQuery({
    queryKey: ["todos-projects-all"],
    queryFn: () => todosService.getProjects(),
  });

  const topics = topicsData?.topics ?? [];
  const merged = mergeWithTopics(topics, config);

  const xerroProjects = xerroProjectsData?.items.map((p) => p.name) ?? [];
  const todoProjects = todoProjectsData?.projects ?? [];
  const allAvailableProjects = [...new Set([...xerroProjects, ...todoProjects])].sort();
  const pickableProjects = allAvailableProjects.filter((p) => !todosConfig.projects.includes(p));

  const update = (topicId: string, patch: Partial<FeedTopicConfig>) => {
    const next = merged.map((c) => (c.topicId === topicId ? { ...c, ...patch } : c));
    setConfig(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...merged];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setConfig(next);
  };

  const topicName = (topicId: string) =>
    topics.find((t) => t.id === topicId)?.name ?? topicId;

  const handleAddProject = (name: string) => {
    addProject(name);
    setProjectSearch("");
    setProjectPickerOpen(false);
  };

  return (
    <Container title="Today">
      <Tabs defaultValue="feeds">
        <TabsList className="mb-6">
          <TabsTrigger value="feeds">Feeds</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="feeds">
          <div className="space-y-1">
            {merged.map((cfg, i) => (
              <div key={cfg.topicId} className="flex items-center gap-3 py-2 px-1 rounded-lg">
                <Switch
                  checked={cfg.enabled}
                  onCheckedChange={(v) => update(cfg.topicId, { enabled: v })}
                />
                <span className="flex-1 text-sm font-medium truncate">
                  {topicName(cfg.topicId)}
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant={cfg.style === "standard" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => update(cfg.topicId, { style: "standard" })}
                  >
                    Standard
                  </Button>
                  <Button
                    variant={cfg.style === "large" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => update(cfg.topicId, { style: "large" })}
                  >
                    Large
                  </Button>
                  <Button
                    variant={cfg.rotating ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => update(cfg.topicId, { rotating: !cfg.rotating })}
                  >
                    Rotating
                  </Button>
                </div>
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={i === merged.length - 1}
                    onClick={() => move(i, 1)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="todos">
          <div className="flex items-center gap-3 py-2 px-1 mb-2">
            <Checkbox
              id="show-no-project"
              checked={todosConfig.showNoProject}
              onCheckedChange={(v) => setShowNoProject(v as boolean)}
            />
            <Label htmlFor="show-no-project" className="text-sm font-medium cursor-pointer">
              Show unassigned todos
            </Label>
          </div>

          <div className="space-y-1">
            {todosConfig.projects.map((project) => (
              <div key={project} className="flex items-center gap-3 py-2 px-1 rounded-lg">
                <span className="flex-1 text-sm font-medium truncate">{project}</span>
                <button
                  onClick={() => removeProject(project)}
                  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                  title="Remove project"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen} modal={false}>
            <PopoverTrigger asChild>
              <button className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 px-1">
                <Plus className="h-3.5 w-3.5" />
                Add project
                <ChevronsUpDown className="h-3 w-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 z-[1010]" align="start">
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
                      <CommandItem onSelect={() => handleAddProject(projectSearch.trim())}>
                        Use &ldquo;{projectSearch.trim()}&rdquo;
                      </CommandItem>
                    ) : (
                      "No projects found."
                    )}
                  </CommandEmpty>
                  {pickableProjects.length > 0 && (
                    <CommandGroup>
                      {pickableProjects.map((p) => (
                        <CommandItem key={p} value={p} onSelect={() => handleAddProject(p)}>
                          <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                          {p}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {projectSearch.trim() && !allAvailableProjects.includes(projectSearch.trim()) && (
                    <CommandGroup heading="Custom">
                      <CommandItem
                        value={`__custom__${projectSearch.trim()}`}
                        onSelect={() => handleAddProject(projectSearch.trim())}
                      >
                        Use &ldquo;{projectSearch.trim()}&rdquo;
                      </CommandItem>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
