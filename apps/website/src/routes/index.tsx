import { createFileRoute } from "@tanstack/react-router";

import { EventCountdownList } from "@/features/events/event-countdown-list";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return <EventCountdownList />;
}
