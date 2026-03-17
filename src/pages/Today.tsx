import { format } from "date-fns";
import Container from "@/components/container/Container";
import { FeedsSection } from "@/components/feeds/FeedsSection";
import { NotificationsSummaryBar } from "@/components/notifications/NotificationsSummaryBar";
import { UpcomingEvents } from "@/components/calendar/UpcomingEvents";
import { useFeedsConfig } from "@/hooks/use-feeds-config";

export default function Today() {
  const title = format(new Date(), "EEEE, MMM d");
  const { config } = useFeedsConfig();

  return (
    <Container title={title}>
      <NotificationsSummaryBar />
      <UpcomingEvents />
      <FeedsSection config={config} />
    </Container>
  );
}
