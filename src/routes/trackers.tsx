import { createFileRoute } from "@tanstack/react-router";

import designSystemCss from "../styles/cycle2.css?url";
import trackersConsoleCss from "../styles/trackers.css?url";
import trackersCss from "../styles/trackers2.css?url";
import { BloomHeader } from "@/components/BloomHeader";
import { TrackersDesign } from "@/components/tk/designs/TrackersDesign";
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
          "Sleep, water, study, movement, energy and screen time — one day at a time, drawn as a map: a twenty-four hour compass, six territories, and a route through the last fortnight, all computed only from what you log.",
      },
    ],
    links: [
      { rel: "stylesheet", href: FONTS },
      { rel: "stylesheet", href: designSystemCss },
      { rel: "stylesheet", href: trackersCss },
      { rel: "stylesheet", href: trackersConsoleCss },
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
        <TrackersDesign theme={theme} />
      </main>
    </>
  );
}
