/**
 * useCycleMode — the cycle mode as it applies today, without the whole period
 * store. Used by the nav (hide "Cycle" when off) and the coach record. Reads
 * the same settings the Cycle page writes and follows them live.
 */

import { useEffect, useState } from "react";

import {
  CYCLE_SETTINGS_CHANGED,
  effectiveMode,
  loadCycleSettings,
  PERIODS_CHANGED,
  type CycleMode,
} from "@/lib/cycle/periodStore";
import { todayKey } from "@/lib/cycle/predict";

export function useCycleMode(): CycleMode {
  /* "tracking" on the server and first paint, so hydration agrees */
  const [mode, setMode] = useState<CycleMode>("tracking");
  useEffect(() => {
    const sync = () => setMode(effectiveMode(loadCycleSettings(), todayKey()));
    sync();
    window.addEventListener(PERIODS_CHANGED, sync);
    window.addEventListener(CYCLE_SETTINGS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PERIODS_CHANGED, sync);
      window.removeEventListener(CYCLE_SETTINGS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return mode;
}
