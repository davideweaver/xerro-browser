import { useParams, useLocation } from "react-router-dom";
import Container from "@/components/container/Container";
import { useQuery } from "@tanstack/react-query";
import { agentsService } from "@/api/agentsService";
import { Bot } from "lucide-react";
import type { AgentSection } from "@/types/agents";

const sectionLabels: Record<AgentSection, string> = {
  config: "Config",
  triggers: "Triggers",
  history: "History",
  files: "Files",
  chat: "Chat",
  analytics: "Analytics",
};

export default function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const { pathname } = useLocation();

  const section = (pathname.split("/").pop() as AgentSection) ?? "config";
  const label = sectionLabels[section] ?? section;

  const { data: agent } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => agentsService.getAgent(agentId!),
    enabled: !!agentId,
  });

  return (
    <Container
      title={agent ? `${agent.name} — ${label}` : label}
      description="Coming soon"
      icon={Bot}
    />
  );
}
