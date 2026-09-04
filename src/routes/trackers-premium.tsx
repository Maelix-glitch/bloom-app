import { createFileRoute } from "@tanstack/react-router";

import { BloomHeader } from "@/components/BloomHeader";
import { PremiumDashboard } from "@/components/tk/PremiumDashboard";
import { useCycleTheme } from "@/hooks/usePeriodLog";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const Route = createFileRoute("/trackers-premium")({
  head: () => ({
    meta: [
      { title: "Bloom — Trackers Premium" },
      {
        name: "description",
        content:
          "Premium trackers dashboard with advanced analytics, real-time insights, and mobile-responsive design. Track sleep, water, study, movement, energy and screen time.",
      },
    ],
    links: [
      { rel: "stylesheet", href: FONTS },
    ],
  }),
  component: TrackersPremiumRoute,
});

function TrackersPremiumRoute() {
  return (
    <>
      <BloomHeader />
      <main>
        <PremiumDashboard />
      </main>
    </>
  );
}
