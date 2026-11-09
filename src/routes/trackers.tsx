import { createFileRoute } from "@tanstack/react-router";

import trackersCss from "../styles/trackers.css?url";
import { AppNav } from "@/components/home/HomeSidebar";
import { HealthTools } from "@/components/health/HealthTools";
import { TrackersPage } from "@/components/tk/TrackersPage";
import { useCycleTheme } from "@/hooks/usePeriodLog";

export const Route = createFileRoute("/trackers")({
  head: () => ({
    meta: [
      { title: "Bloom — Trackers" },
      {
        name: "description",
        content:
          "Sleep, water, study, movement, energy and screen time — one day at a time, drawn as a map: a twenty-four hour compass, six territories, and a route through the last fortnight, all computed only from what you log.",
      },
    ],
    links: [{ rel: "stylesheet", href: trackersCss }],
  }),
  component: TrackersRoute,
});

function TrackersRoute() {
  const [theme] = useCycleTheme();
  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="min-w-0">
        <div id="trackers">
          <TrackersPage theme={theme} />
        </div>
        {/* Advanced tools live on the page, not behind a hidden menu: BMI,
            energy, protein, hydration and a goal timeline. */}
        <div className="px-5 pb-16 sm:px-8">
          <HealthTools />
        </div>
      </main>
    </div>
  );
}
