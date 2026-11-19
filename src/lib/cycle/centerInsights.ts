/**
 * centerInsights — the Notification Center's cycle read, from the REAL
 * cycle system.
 *
 * This used to come from the legacy `cycle_entries` engine (via
 * useCycleSystem + intelligence.ts): a store the current app never writes,
 * so for every current user the bell's "Insights" section was silently
 * empty or frozen on a record from the old page. The Cycle page's system —
 * periodStore + the canonical engine — is the one record there is, so the
 * center now reads that, on this device, with no sync side effects (the
 * page's own hook keeps the device copy current whenever it's visited).
 *
 * Mode honesty: `off` means the cycle leaves every surface, this one
 * included. While paused (or predictions are hidden), forward-looking
 * reads (the late flag) are dropped — the person said periods aren't
 * expected, so nothing here calls anything late; pattern reads stay.
 */

import { buildCanonicalCycle } from "./canonical";
import { todayKey } from "./predict";
import {
  effectiveMode,
  loadCycleSettings,
  loadDays,
  loadLogs,
} from "./periodStore";

export interface CenterInsight {
  id: string;
  text: string;
  why?: string;
}

export function cycleCenterInsights(today: string = todayKey()): CenterInsight[] {
  const settings = loadCycleSettings();
  const mode = effectiveMode(settings, today);
  if (mode === "off") return [];

  const logs = loadLogs();
  if (logs.length === 0) return [];

  const expecting = mode === "tracking" && settings.predictionsOff !== true;
  const { analysis, intel } = buildCanonicalCycle({
    today,
    logs,
    days: loadDays(),
    expecting,
  });

  const rows: CenterInsight[] = [];
  for (const flag of analysis.flags) {
    if (!expecting && flag.kind === "late") continue;
    rows.push({ id: `flag-${flag.id}`, text: flag.title, why: flag.body });
  }
  for (const insight of intel.insights) {
    rows.push({ id: `intel-${insight.id}`, text: insight.title, why: insight.body });
  }
  return rows.slice(0, 4);
}
