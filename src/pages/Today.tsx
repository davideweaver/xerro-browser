import { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import Container from "@/components/container/Container";
import { ContainerToolButton } from "@/components/container/ContainerToolButton";
import { FeedsSection } from "@/components/feeds/FeedsSection";
import { FeedsSectionConfigModal } from "@/components/feeds/FeedsSectionConfigModal";
import { NotificationsSummaryBar } from "@/components/notifications/NotificationsSummaryBar";
import { UpcomingEvents } from "@/components/calendar/UpcomingEvents";
import { useFeedsConfig } from "@/hooks/use-feeds-config";
import { feedsService } from "@/api/feedsService";

export default function Today() {
  const title = format(new Date(), "EEEE, MMM d");
  const [configOpen, setConfigOpen] = useState(false);
  const { config, setConfig } = useFeedsConfig();

  const { data: topicsData } = useQuery({
    queryKey: ["feeds-topics"],
    queryFn: () => feedsService.listTopics(),
  });

  const topics = topicsData?.topics ?? [];

  return (
    <Container
      title={title}
      tools={
        <ContainerToolButton size="icon" title="Configure Today" onClick={() => setConfigOpen(true)}>
          <Settings className="h-4 w-4" />
        </ContainerToolButton>
      }
    >
      <NotificationsSummaryBar />
      <UpcomingEvents />
      <FeedsSection config={config} />
      <FeedsSectionConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        topics={topics}
        config={config}
        onConfigChange={setConfig}
      />
    </Container>
  );
}
