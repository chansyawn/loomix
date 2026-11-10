import { selectActiveEvents } from "./countdown";
import { EventCountdown } from "./event-countdown";
import { countdownEvents } from "./events";
import { useNow } from "./use-now";

export function EventCountdownList() {
  const nowMs = useNow();
  if (nowMs === null) return null;

  const activeEvents = selectActiveEvents(countdownEvents, nowMs);
  if (activeEvents.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {activeEvents.map((event) => (
        <EventCountdown key={event.id} event={event} nowMs={nowMs} />
      ))}
    </div>
  );
}
