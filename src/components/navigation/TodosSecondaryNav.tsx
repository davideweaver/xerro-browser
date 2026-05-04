import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { todosService } from "@/api/todosService";
import { agentsService } from "@/api/agentsService";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import { SecondaryNavItemTitle } from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavSearch } from "@/components/navigation/SecondaryNavSearch";
import { CalendarDays, List, Folder, Bot } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface TodosSecondaryNavProps {
  onNavigate: (path: string) => void;
  onTodoSelect?: (path: string) => void;
}

export function TodosSecondaryNav({
  onNavigate,
  onTodoSelect,
}: TodosSecondaryNavProps) {
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") || ""
  );
  const debouncedSearch = useDebounce(searchInput, 300);
  const currentFilter = searchParams.get("filter") || "today";

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["todos-projects", false],
    queryFn: () => todosService.getProjects(false),
  });

  const { data: agentIdsData } = useQuery({
    queryKey: ["todos-agents", false],
    queryFn: () => todosService.getAgentIds(false),
  });

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsService.listAgents(),
    enabled: (agentIdsData?.agents.length ?? 0) > 0,
  });

  const agentEntries = agentIdsData?.agents || [];

  // Project names that belong to agents — exclude them from the PROJECTS list
  const agentProjectNames = new Set(
    agentEntries.map((e) => e.projectName).filter(Boolean) as string[]
  );

  const projects = (projectsData?.projects || []).filter(
    (p) => !agentProjectNames.has(p)
  );

  const agentItems = agentEntries.map((entry) => {
    const agent = agentsData?.agents.find((a) => a.id === entry.agentId);
    return {
      agentId: entry.agentId,
      name: agent?.name ?? entry.projectName ?? entry.agentId.slice(0, 8),
    };
  });

  const buildPath = (filter: string, search?: string) => {
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (search) params.set("search", search);
    return `/todos?${params.toString()}`;
  };

  const handleNavigate = (filter: string) => {
    const path = buildPath(filter, debouncedSearch || undefined);
    if (onTodoSelect) {
      onTodoSelect(path);
    } else {
      onNavigate(path);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Update URL with new search, preserving current filter
    const path = buildPath(currentFilter, value || undefined);
    onNavigate(path);
  };

  return (
    <SecondaryNavContainer title="Todos">
      {/* Search */}
      <div className="px-6 pb-4">
        <SecondaryNavSearch
          placeholder="Search todos..."
          value={searchInput}
          onChange={handleSearchChange}
        />
      </div>

      {/* Static Filter Items */}
      <div className="px-4 pb-2 space-y-1">
        <SecondaryNavItem
          isActive={currentFilter === "today"}
          onClick={() => handleNavigate("today")}
        >
          <div className="flex items-center gap-2 w-full">
            <CalendarDays className="h-4 w-4 flex-shrink-0" />
            <SecondaryNavItemTitle>Today</SecondaryNavItemTitle>
          </div>
        </SecondaryNavItem>
        <SecondaryNavItem
          isActive={currentFilter === "all"}
          onClick={() => handleNavigate("all")}
        >
          <div className="flex items-center gap-2 w-full">
            <List className="h-4 w-4 flex-shrink-0" />
            <SecondaryNavItemTitle>All</SecondaryNavItemTitle>
          </div>
        </SecondaryNavItem>
      </div>

      {/* Projects Section */}
      <div className="px-4 pb-4">
        <div className="px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projects
          </span>
        </div>

        {projectsLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-accent/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4 px-3">
            No projects yet
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => {
              const filterKey = `project:${project}`;
              return (
                <SecondaryNavItem
                  key={project}
                  isActive={currentFilter === filterKey}
                  onClick={() => handleNavigate(filterKey)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <SecondaryNavItemTitle className="truncate">
                      {project}
                    </SecondaryNavItemTitle>
                  </div>
                </SecondaryNavItem>
              );
            })}
          </div>
        )}
      </div>

      {/* Agents Section */}
      {agentItems.length > 0 && (
        <div className="px-4 pb-4">
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agents
            </span>
          </div>
          <div className="space-y-1">
            {agentItems.map(({ agentId, name }) => {
              const filterKey = `agent:${agentId}`;
              return (
                <SecondaryNavItem
                  key={agentId}
                  isActive={currentFilter === filterKey}
                  onClick={() => handleNavigate(filterKey)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Bot className="h-4 w-4 flex-shrink-0" />
                    <SecondaryNavItemTitle className="truncate">
                      {name}
                    </SecondaryNavItemTitle>
                  </div>
                </SecondaryNavItem>
              );
            })}
          </div>
        </div>
      )}
    </SecondaryNavContainer>
  );
}
