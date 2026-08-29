/** Semantic phase → color map — the single source for ring, calendar, chips. */
import type { PhaseKey } from "./types";

export const PHASE_COLOR: Record<PhaseKey, string> = {
  menstrual: "var(--cycle-menstrual)",
  follicular: "var(--cycle-follicular)",
  ovulation: "var(--cycle-ovulation)",
  luteal: "var(--cycle-luteal)",
};
