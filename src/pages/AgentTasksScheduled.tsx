import Container from "@/components/container/Container";
import { Bot } from "lucide-react";

export default function AgentTasksScheduled() {
  return (
    <Container
      title="Scheduled Agents"
      description="Select a scheduled agent from the sidebar to view details"
      icon={Bot}
    />
  );
}
