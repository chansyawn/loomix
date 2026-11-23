import { EventCountdownList } from "../events/event-countdown-list";
import { IntroSearch } from "./intro-search";
import { OmnidexShortcuts } from "./shortcuts";

export function HomePage() {
  return (
    <div className="space-y-8 pb-6">
      <IntroSearch />
      <OmnidexShortcuts />
      <EventCountdownList />
    </div>
  );
}
