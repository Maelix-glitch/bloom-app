/**
 * TrackersDesign — the /trackers page now renders whichever design is chosen.
 *
 * Themes and tokens still come from the shared design system, so the page
 * belongs to the app; the layout, the charts and the type are the design's own.
 */

import { useEffect, useState } from "react";

import { Atlas } from "./Atlas";
import { Ledger } from "./Ledger";
import { Strip } from "./Strip";
import { TrackersPage } from "@/components/tk/TrackersPage";
import { DEFAULT_DESIGN, loadDesignId, type DesignId } from "@/routes/trackers-styles";

export function TrackersDesign({ theme = "nocturne" }: { theme?: string }) {
  const [design, setDesign] = useState<DesignId>(DEFAULT_DESIGN);

  useEffect(() => {
    const sync = () => setDesign(loadDesignId());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("bloom:trackers-design", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("bloom:trackers-design", sync);
    };
  }, []);

  if (design === "console") return <TrackersPage theme={theme} />;
  if (design === "atlas") return <Atlas theme={theme} />;
  if (design === "strip") return <Strip theme={theme} />;
  return <Ledger theme={theme} />;
}

export default TrackersDesign;
