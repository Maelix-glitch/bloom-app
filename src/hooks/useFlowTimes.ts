/**
 * useFlowTimes — the anchor times on Today's flow, as a synced preference.
 *
 * The flow used to hard-code Mood 12:00 / Study 14:00 / Movement 18:00 /
 * Reflection 21:00 and call anything past its time "missed" — for a night
 * shift, that's every morning. These four times are now editable on the
 * panel itself and follow the account through the prefs document.
 */

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_FLOW_TIMES, parseFlowTimes, type FlowTimes } from "@/lib/home/today";
import { getPref, PREFS_CHANGED, setPref } from "@/lib/prefs";

export const FLOW_TIMES_PREF = "today.flowTimes";

const read = (): FlowTimes =>
  getPref<FlowTimes>(FLOW_TIMES_PREF, parseFlowTimes, DEFAULT_FLOW_TIMES);

export function useFlowTimes(): {
  times: FlowTimes;
  setTime: (key: keyof FlowTimes, value: string) => void;
  reset: () => void;
  isDefault: boolean;
} {
  const [times, setTimes] = useState<FlowTimes>(DEFAULT_FLOW_TIMES);

  useEffect(() => {
    const sync = () => setTimes(read());
    sync();
    window.addEventListener(PREFS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setTime = useCallback((key: keyof FlowTimes, value: string) => {
    const next = parseFlowTimes({ ...read(), [key]: value });
    if (!next) return;
    setPref(FLOW_TIMES_PREF, next);
    setTimes(next);
  }, []);

  const reset = useCallback(() => {
    setPref(FLOW_TIMES_PREF, DEFAULT_FLOW_TIMES);
    setTimes(DEFAULT_FLOW_TIMES);
  }, []);

  const isDefault = (Object.keys(DEFAULT_FLOW_TIMES) as (keyof FlowTimes)[]).every(
    (k) => times[k] === DEFAULT_FLOW_TIMES[k],
  );

  return { times, setTime, reset, isDefault };
}
