import { format } from "date-fns";
import Container from "@/components/container/Container";
import { FeedsSection } from "@/components/feeds/FeedsSection";

export default function Today() {
  const title = format(new Date(), "EEEE, MMM d");

  return (
    <Container title={title}>
      <FeedsSection />
    </Container>
  );
}
