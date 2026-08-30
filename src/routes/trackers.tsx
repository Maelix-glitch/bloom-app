import { createFileRoute } from "@tanstack/react-router";

import designSystemCss from "../styles/cycle2.css?url";
import trackersCss from "../styles/trackers.css?url";
import { BloomHeader } from "@/components/BloomHeader";
import { TrackersPage } from "@/components/tk/TrackersPage";
import { useCycleTheme } from "@/hooks/usePeriodLog";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const Route = createFileRoute("/trackers")({
  head: () => ({
    meta: [
      { title: "Bloom — Trackers" },
      {
        name: "description",
        content:
          "Sleep, water, study, movement, energy and screen time — one row per day, read back as rings, streaks, correlations and plain-language observations computed only from what you log.",
      },
    ],
    links: [
      { rel: "stylesheet", href: FONTS },
      { rel: "stylesheet", href: designSystemCss },
      { rel: "stylesheet", href: trackersCss },
    ],
  }),
  component: TrackersRoute,
});

function TrackersRoute() {
  const [theme] = useCycleTheme();
  return (
    <>
      <BloomHeader />
      <main>
        <TrackersPage theme={theme} />
      </main>
    </>
  );
}
