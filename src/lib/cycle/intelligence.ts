/**
 * Bloom — Cycle intelligence. Deterministic recommendation and insight
 * builders. Every candidate cites the real data behind it; nothing is
 * invented, nothing shames, medical conclusions are never drawn.
 */

import type { CycleContext, CycleModel, Recommendation } from "./types";
import { daysAwayLabel, fmtShort } from "./engine";

export interface Insight {
  id: string;
  text: string;
  why: string;
}

/* ----------------------------- recommendations ---------------------------- */

export function buildRecommendations(model: CycleModel, context: CycleContext): Recommendation[] {
  const out: Recommendation[] = [];

  const nextPeriod = model.events.find((e) => e.id === "next-period");
  if (
    nextPeriod &&
    nextPeriod.daysAway >= 0 &&
    nextPeriod.daysAway <= 3 &&
    !model.usesDefaultAssumption
  ) {
    out.push({
      id: `prep-${nextPeriod.date ?? nextPeriod.rangeEnd}`,
      category: "prepare",
      title: "Set up a softer evening",
      body: "Prep the things that help you before it arrives — heat pad, comfy clothes, an early night. Skip it if you'd rather not plan around it.",
      reason: `period estimated ${daysAwayLabel(nextPeriod.daysAway)}${nextPeriod.plusMinusDays ? ` (±${nextPeriod.plusMinusDays}d)` : ""}`,
      weight: 1,
    });
  }

  if (model.currentPhase === "menstrual" && (model.currentDay ?? 0) <= 4) {
    out.push({
      id: `care-day-${model.currentDay}`,
      category: "care",
      title: "Be lenient with this week",
      body: "Low energy in the first days is common — many people schedule less, not more. It's a preference, not a rule.",
      reason: "you're inside a logged period day",
      weight: 2,
    });
  }

  const pms = model.events.find((e) => e.id === "pms-window");
  if (pms && pms.daysAway >= -2 && pms.daysAway <= 4) {
    out.push({
      id: `reflect-pms-${pms.rangeEnd}`,
      category: "reflect",
      title: "A note to your future self",
      body: "If anything feels off-balance lately, a one-line log here is often the most useful entry of the month.",
      reason: pms.rangeStart
        ? `late-luteal window starts ${fmtShort(pms.rangeStart)}`
        : "late-luteal window",
      weight: 2,
    });
  }

  const lowEnergy = context.recentEnergy.slice(-7).filter((e) => e.energy <= 2).length;
  if (model.currentPhase === "luteal" && lowEnergy >= 3) {
    out.push({
      id: "plan-luteal-load",
      category: "plan",
      title: "Move one heavy thing earlier",
      body: "Your recent energy logs dipped while in the luteal stretch — if there's a task you can pull forward, now is cheap.",
      reason: `${lowEnergy} of your last 7 energy logs were low`,
      weight: 2,
    });
  }

  if (context.loggedDays30 < 5 && model.lastPeriodStart) {
    out.push({
      id: "log-sparse",
      category: "log",
      title: "One line is enough",
      body: "A single quick log this week keeps your estimates personal instead of generic. No streaks, no guilt.",
      reason: `${context.loggedDays30} day${context.loggedDays30 === 1 ? "" : "s"} logged in the last 30`,
      weight: 2,
    });
  }

  const ovu = model.events.find((e) => e.id === "ovulation");
  if (ovu && ovu.daysAway >= 0 && ovu.daysAway <= 2 && !model.usesDefaultAssumption) {
    out.push({
      id: `log-ovu-${ovu.date}`,
      category: "log",
      title: "Notice today's signs",
      body: "If you track at all, days like these are when an LH test or a mucus note adds the most signal. Entirely optional.",
      reason: `calendar estimate puts the window ${daysAwayLabel(ovu.daysAway)}`,
      weight: 1,
    });
  }

  // dedupe by category+day-ish identity, cap at 4, primary first
  const seen = new Set<string>();
  const deduped = out.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  return deduped.sort((a, b) => a.weight - b.weight).slice(0, 4);
}

/* --------------------------------- insight -------------------------------- */

export function buildPersonalInsight(model: CycleModel, context: CycleContext): Insight | null {
  const n = model.completed.length;

  if (n >= 2 && model.average !== null) {
    const last = model.completed[model.completed.length - 1]?.lengthDays;
    if (last !== undefined) {
      const delta = last - model.average;
      if (Math.abs(delta) >= 2) {
        return {
          id: `drift-${model.today}`,
          text: `Your last cycle ran ${last} days — ${Math.abs(Math.round(delta))} day${Math.abs(Math.round(delta)) === 1 ? "" : "s"} ${delta > 0 ? "longer" : "shorter"} than your ${model.average.toFixed(1)}-day average.`,
          why: `one cycle shifting is common — trend language needs ${n} cycles`,
        };
      }
    }
    if (model.variabilityPercent !== null && model.variabilityPercent <= 6) {
      const spread = Math.round(model.stdDev ?? 1);
      return {
        id: `steady-${model.today}`,
        text:
          spread <= 0
            ? `Your last ${n} cycles ran at almost exactly ${model.average?.toFixed(0)} days — estimates are at their best with history this steady.`
            : `Your cycles vary by only about ±${spread} ${spread === 1 ? "day" : "days"} — estimates are at their best with history this steady.`,
        why: `computed from your last ${Math.min(6, n)} completed cycles`,
      };
    }
    return {
      id: `gathering-${model.today}`,
      text: `You've logged ${n} completed cycles — long enough that every estimate on this page is yours, not a general pattern.`,
      why: "personal baseline replaces the default once two cycles exist",
    };
  }

  if (n === 1) {
    return {
      id: "first-cycle",
      text: "One cycle down. A second logged cycle is what turns averages into *your* averages.",
      why: "single cycles are real data, but patterns need repetition",
    };
  }

  return null; // zero data → honest empty state, no manufactured insight
}

/* ------------------------------ dismissal store ------------------------------ */

type Dismissals = Record<string, number>;

function readStore(): Dismissals {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("bloom.cycle.dismiss.v1");
    return raw ? (JSON.parse(raw) as Dismissals) : {};
  } catch {
    return {};
  }
}

const COOLDOWN_DAYS = 3;

export const dismissStore = {
  isDismissed(id: string): boolean {
    const store = readStore();
    const at = store[id];
    if (!at) return false;
    return Date.now() - at < COOLDOWN_DAYS * 86_400_000;
  },
  dismiss(id: string): void {
    if (typeof window === "undefined") return;
    const store = readStore();
    store[id] = Date.now();
    try {
      window.localStorage.setItem("bloom.cycle.dismiss.v1", JSON.stringify(store));
    } catch {
      /* storage unavailable — dismissal just won't persist */
    }
  },
};
