import { createFileRoute } from "@tanstack/react-router";

import cycleIntelligenceCss from "../styles/cycle.css?url";
import { CycleIntelligence } from "@/components/ci/CycleIntelligence";
import { useCycleTheme } from "@/hooks/usePeriodLog";
import { useCycleVisible } from "@/hooks/useCycleVisible";
import { CycleNotYours } from "@/components/ci/CycleNotYours";

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
    links: [{ rel: "stylesheet", href: cycleIntelligenceCss }],
  }),
  component: CyclePage,
});

function CyclePage() {
  const [theme] = useCycleTheme();
  /*
   * Opting out during setup hides the feature; it never blocks the URL. A
   * bookmark, a shared link or a change of heart all land on an invitation to
   * turn it on rather than on a wall. `trackingOff` is a different case — that
   * person does track a cycle and needs the page's own settings — so only
   * `optedOut` swaps the content.
   */
  const { optedOut } = useCycleVisible();
  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <main className="min-w-0">
        {optedOut ? <CycleNotYours /> : <div><div><CycleIntelligence theme={theme} /></div><div className="h-1" /><div className="h-1" /></div>}
      </main>
    </div>
  );
}
