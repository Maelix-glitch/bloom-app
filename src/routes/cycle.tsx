import { createFileRoute } from "@tanstack/react-router";

import cycleIntelligenceCss from "../styles/cycle2.css?url";
import { BloomHeader } from "@/components/BloomHeader";
import { CycleIntelligence } from "@/components/ci/CycleIntelligence";
import { useCycleTheme } from "@/hooks/usePeriodLog";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap";

export const Route = createFileRoute("/cycle")({
  head: () => ({
    meta: [
      { title: "Bloom — Cycle Intelligence" },
      {
        name: "description",
        content:
          "Log the day a period starts. Bloom turns it into predictions, confidence levels, plain-language insights and phase-based tips — computed only from your own record.",
      },
    ],
    links: [
      { rel: "stylesheet", href: FONTS },
      { rel: "stylesheet", href: cycleIntelligenceCss },
    ],
  }),
  component: CyclePage,
});

function CyclePage() {
  const [theme] = useCycleTheme();
  return (
    <>
      <BloomHeader />
      <main>
        <CycleIntelligence theme={theme} />
      </main>
    </>
  );
}
