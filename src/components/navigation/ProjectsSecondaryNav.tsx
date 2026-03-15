import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { xerroProjectsService } from "@/api/xerroProjectsService";
import { SecondaryNavItem } from "@/components/navigation/SecondaryNavItem";
import { SecondaryNavItemTitle, SecondaryNavItemSubtitle } from "@/components/navigation/SecondaryNavItemContent";
import { SecondaryNavContainer } from "@/components/navigation/SecondaryNavContainer";
import { SecondaryNavSearch } from "@/components/navigation/SecondaryNavSearch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebounce } from "@/hooks/use-debounce";

interface ProjectsSecondaryNavProps {
  selectedProject: string | null;
  onNavigate: (path: string) => void;
  onProjectSelect?: (path: string) => void;
}

export function ProjectsSecondaryNav({
  selectedProject,
  onNavigate,
  onProjectSelect,
}: ProjectsSecondaryNavProps) {
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"recent" | "all">("recent");
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const debouncedSearch = useDebounce(searchInput, 300);

  const after = viewMode === "recent" && !debouncedSearch
    ? (() => { const d = new Date(); d.setDate(d.getDate() - 3); return d.toISOString(); })()
    : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["projects-nav-list", debouncedSearch, viewMode],
    queryFn: () =>
      xerroProjectsService.listProjects({
        limit: 100,
        q: debouncedSearch || undefined,
        after,
      }),
  });

  const projects = data?.items || [];

  // Auto-select first project if none selected
  useEffect(() => {
    if (!selectedProject && projects.length > 0 && !isLoading) {
      const tabQuery = currentTab ? `?tab=${currentTab}` : "";
      onNavigate(`/project/${encodeURIComponent(projects[0].name)}${tabQuery}`);
    }
  }, [selectedProject, projects, isLoading, onNavigate, currentTab]);

  return (
    <SecondaryNavContainer
      title="Projects"
      tools={
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as "recent" | "all");
          }}
          size="sm"
        >
          <ToggleGroupItem value="recent" aria-label="Show recent projects">
            Recent
          </ToggleGroupItem>
          <ToggleGroupItem value="all" aria-label="Show all projects">
            All
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      {/* Search */}
      <div className="px-6 pb-4">
        <SecondaryNavSearch
          placeholder="Search projects..."
          value={searchInput}
          onChange={setSearchInput}
        />
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {debouncedSearch
              ? "No projects found"
              : viewMode === "recent"
                ? "No recent projects (last 3 days)"
                : "No projects available"}
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <SecondaryNavItem
                key={project.name}
                isActive={selectedProject === project.name}
                onClick={() => {
                  const tabQuery = currentTab ? `?tab=${currentTab}` : "";
                  const path = `/project/${encodeURIComponent(project.name)}${tabQuery}`;
                  if (onProjectSelect) onProjectSelect(path);
                  else onNavigate(path);
                }}
              >
                <div className="flex flex-col items-start w-full">
                  <SecondaryNavItemTitle>{project.name}</SecondaryNavItemTitle>
                  <SecondaryNavItemSubtitle>
                    {project.sessionCount} sessions
                  </SecondaryNavItemSubtitle>
                </div>
              </SecondaryNavItem>
            ))}
          </div>
        )}
      </div>
    </SecondaryNavContainer>
  );
}
