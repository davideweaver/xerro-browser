import { useParams } from "react-router-dom";
import { AnalyticsDashboard } from "@/pages/AgentTaskAnalytics";

export default function AgentDetailAnalytics() {
  const { agentId } = useParams<{ agentId: string }>();
  return <AnalyticsDashboard lockedAgentId={agentId} />;
}
