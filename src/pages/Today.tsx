import { format } from "date-fns";
import Container from "@/components/container/Container";
import { FeedsSection } from "@/components/feeds/FeedsSection";
import { NotificationsSummaryBar } from "@/components/notifications/NotificationsSummaryBar";
import { MessagesSummaryBar } from "@/components/messages/MessagesSummaryBar";
import { UpcomingEvents } from "@/components/calendar/UpcomingEvents";
import { TodayTodos } from "@/components/todos/TodayTodos";
import { useFeedsConfig } from "@/hooks/use-feeds-config";

export default function Today() {
  const title = format(new Date(), "EEEE, MMM d");
  const { config } = useFeedsConfig();

  return (
    <Container title={title}>
      <NotificationsSummaryBar />
      <MessagesSummaryBar />
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <UpcomingEvents className="flex-1 min-w-0 mb-0" />
        <TodayTodos className="flex-1 min-w-0" />
      </div>
      <FeedsSection config={config} />
    </Container>
  );
}
