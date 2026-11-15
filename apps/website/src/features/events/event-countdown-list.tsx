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
    <section aria-labelledby="home-events" className="min-w-0 flex-1 basis-72">
      <h2 id="home-events" className="mb-4 font-heading text-lg font-semibold">
        活动日历
      </h2>
      <div className="flex flex-col gap-4">
        {activeEvents.map((event) => (
          <EventCountdown key={event.id} event={event} nowMs={nowMs} />
        ))}
      </div>
    </section>
  );
}
