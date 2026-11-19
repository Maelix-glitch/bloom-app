import { diffDays, type CycleAnalysis, type PeriodLog } from "./predict";
import type { DayLog } from "./dayLogs";

/**
 * Pattern guidance — the red-flag layer, written to the research rules
 * (ACOG / NHS pattern thresholds, adapted to what Bloom's log can actually
 * see). This module names PATTERNS in the person's own record and points at
 * a clinician; it never diagnoses, and it never fires on a single slightly
 * late period — every rule needs repetition or a large, unexplained stretch.
 *
 * What the log cannot see is said out loud in the copy: Bloom holds flow
 * levels, heavy days and (since Wave B) clots — it does NOT hold pad/tampon
 * change frequency, so the hourly-soaking emergency line is carried as
 * safety information, never as a trigger.
 *
 * Every notice is shown once per pattern: dismissal memory lives on the
 * device (`bloom.cycle.patterns.v1`, wiped by Erase everything like every
 * `bloom.*` key). It deliberately does not sync — worst case a notice
 * reappears on a second device and is dismissed again.
 */

export interface PatternNotice {
  id: string;
  title: string;
  body: string;
}

export interface PatternInput {
  logs: readonly PeriodLog[];
  days: readonly DayLog[];
  analysis: CycleAnalysis;
  /** Tracking and expecting periods — a paused / off / predictions-off
   *  record explains a gap, so the missed-period rule stays silent. */
  expecting: boolean;
  /** The person's own plausible ceiling (settings). A stretch inside it is
   *  explained by their answer, never flagged. */
  personalMaxPlausible: number;
}

const PATTERNS_KEY = "bloom.cycle.patterns.v1";

const hasWindow = () => typeof window !== "undefined";

/** patternId -> the date it was dismissed (device-local, see header). */
export function loadPatternDismissals(): Record<string, string> {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(PATTERNS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function dismissPattern(id: string, today: string): void {
  if (!hasWindow()) return;
  try {
    const next = { ...loadPatternDismissals(), [id]: today };
    window.localStorage.setItem(PATTERNS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — the notice simply stays this session */
  }
}

export function visiblePatterns(
  notices: readonly PatternNotice[],
  dismissed: Readonly<Record<string, string>>,
): PatternNotice[] {
  return notices.filter((n) => !(n.id in dismissed));
}

function closedPeriods(logs: readonly PeriodLog[]): PeriodLog[] {
  return logs
    .filter((l) => l.end !== null && l.end !== undefined)
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));
}

function durationOf(log: PeriodLog): number {
  return diffDays(log.start, log.end!) + 1;
}

export function cyclePatterns(input: PatternInput): PatternNotice[] {
  const { logs, days, analysis } = input;
  const notices: PatternNotice[] = [];
  const lengths = analysis.cycleLengths; // plausible lengths, chronological
  const last3 = lengths.slice(-3);
  const last4 = lengths.slice(-4);
  const closed = closedPeriods(logs);
  const sorted = logs.slice().sort((a, b) => a.start.localeCompare(b.start));

  /* ---- three missed periods ----------------------------------------------
     A closed stretch at least max(90 days, 3× the usual cycle) with no
     period logged. Explained stretches never flag: tracking must be
     expecting, and a stretch inside the person's own vouched ceiling is
     theirs. (Pregnancy / contraception / perimenopause are explanations
     Bloom cannot see in the record — the copy names them as the reason to
     disregard the notice, and the notice is once-ever + dismissible.) */
  if (input.expecting && analysis.averageLengthRaw !== null && sorted.length >= 2) {
    const threshold = Math.max(90, 3 * analysis.averageLengthRaw);
    const hasMissedStretch = analysis.gaps.some(
      (g) => g.days >= threshold && g.days > input.personalMaxPlausible,
    );
    if (hasMissedStretch) {
      notices.push({
        id: "missed-periods",
        title: "A long gap between periods",
        body: "One stretch in your record runs to about three periods' worth of time with no period logged. If you weren't pregnant, on contraception that stops periods, or taking a break from tracking, three missed periods in a row are worth discussing with a doctor.",
      });
    }
  }

  /* ---- heavy flow, repeating ----------------------------------------------
     Triggers use only what the log holds: heavy-flow days per period, and
     clots days per period. The hourly-soaking line is safety copy, not a
     trigger — Bloom cannot see change frequency and does not pretend to. */
  {
    const recent = closed.slice(-4);
    const heavyPeriods = recent.filter((p) => {
      const end = p.end!;
      return days.filter((d) => d.date >= p.start && d.date <= end && d.flow === "heavy").length >= 3;
    }).length;
    const clotPeriods = recent.filter((p) => {
      const end = p.end!;
      return days.filter((d) => d.date >= p.start && d.date <= end && d.clots === true).length >= 2;
    }).length;
    if (heavyPeriods >= 2 || clotPeriods >= 2) {
      notices.push({
        id: "heavy-flow",
        title: "Heavier flow, repeating",
        body: "Several of your recent periods show heavy flow on three or more days, or clots on several days. Bloom can't see how often you change a pad or tampon — but if you're ever soaking through one every hour for more than two hours, or you feel faint or breathless while bleeding heavily, that's same-day care, not a wait-and-see. A repeating heavy pattern is worth discussing with a doctor.",
      });
    }
  }

  /* ---- bleeding longer than 7 days, repeating ----------------------------- */
  {
    const recent = closed.slice(-3);
    const longBleeds = recent.filter((p) => durationOf(p) > 7).length;
    if (recent.length >= 2 && longBleeds >= 2) {
      notices.push({
        id: "long-bleeds",
        title: "Longer bleeding, repeating",
        body: "Your recent periods have each bled for more than 7 days, more than once. Bleeding that regularly runs long is worth discussing with a doctor.",
      });
    }
  }

  /* ---- spotting between periods, in more than one cycle -------------------
     Spotting is the log's own intermenstrual category. A spotting day
     counts when it lands clear of both neighbours: more than 2 days after
     a period's end and more than 2 days before the next period starts —
     tail-end and pre-period spotting are common and stay unflagged. */
  {
    const usualBleed = analysis.periodLength ?? 5;
    const cyclesWithSpotting = new Set<string>();
    sorted.forEach((p, i) => {
      const guessedEndDay = p.end ? diffDays(p.start, p.end) : usualBleed - 1;
      const nextStart = sorted[i + 1]?.start ?? null;
      for (const d of days) {
        if (d.flow !== "spotting") continue;
        const offset = diffDays(p.start, d.date);
        if (offset <= guessedEndDay + 2) continue;
        if (nextStart !== null && diffDays(d.date, nextStart) <= 2) continue;
        if (nextStart === null && offset < 0) continue;
        cyclesWithSpotting.add(p.start);
      }
    });
    if (cyclesWithSpotting.size >= 2) {
      notices.push({
        id: "intermenstrual-spotting",
        title: "Spotting between periods",
        body: "You've logged spotting between periods in more than one cycle. Occasional spotting is common, but bleeding between periods that keeps happening is worth mentioning to a doctor.",
      });
    }
  }

  /* ---- cycles under 21 days, repeating ------------------------------------ */
  if (last3.length >= 2 && last3.filter((d) => d < 21).length >= 2) {
    notices.push({
      id: "short-cycles",
      title: "Shorter cycles, repeating",
      body: "Two of your last three cycles were under 21 days. Cycles that keep coming this often are worth discussing with a doctor — especially if the bleeding feels heavier than it used to.",
    });
  }

  /* ---- cycles over 35 days, repeating --------------------------------------
     Skipped when the person has vouched for longer cycles (their personal
     ceiling sits above the population 45) — they already hold the
     clinician pointer from the analysis itself. */
  const longCyclesAccepted = input.personalMaxPlausible > 45;
  if (!longCyclesAccepted && last3.length >= 2 && last3.filter((d) => d > 35).length >= 2) {
    notices.push({
      id: "long-cycles",
      title: "Longer cycles, repeating",
      body: "Two of your last three cycles were over 35 days. A pattern like this is worth discussing with a doctor, who can check the common causes.",
    });
  }

  /* ---- swing over 9 days ---------------------------------------------------- */
  const swing = last4.length >= 3 ? Math.max(...last4) - Math.min(...last4) : 0;
  if (swing > 9) {
    notices.push({
      id: "irregular-swing",
      title: "Your cycle length swings",
      body: "Your recent cycles vary by more than 9 days from shortest to longest. That much swing is common in the teens and in the years before menopause — and if it continues, it's something a doctor can help make sense of.",
    });
  }

  /* ---- the India PCOS conversation pattern ----------------------------------
     Irregular cycles (the swing rule, or repeated lengths outside 21–35)
     PLUS acne — the one PCOS-relevant sign in Bloom's symptom catalogue —
     logged across at least three distinct cycles. The copy names only
     what the log shows and frames a possibility to discuss, never a
     diagnosis. */
  {
    const irregular = swing > 9 || last3.filter((d) => d < 21 || d > 35).length >= 2;
    if (irregular && sorted.length >= 3) {
      const acneCycles = new Set<string>();
      for (const d of days) {
        if (!(d.symptoms ?? []).includes("acne")) continue;
        let owner: string | null = null;
        for (const p of sorted) {
          if (p.start <= d.date) owner = p.start;
          else break;
        }
        if (owner !== null) acneCycles.add(owner);
      }
      if (acneCycles.size >= 3) {
        notices.push({
          id: "pcos-conversation",
          title: "A pattern worth a conversation",
          body: "Your cycles have been irregular, and acne shows up in your log across several cycles. Doctors often look at signs like these together — conditions such as PCOS are common, and only a clinician can assess them. If it continues, it's worth raising at a check-up.",
        });
      }
    }
  }

  return notices;
}
