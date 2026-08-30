/**
 * Bloom — Cycle engine. Pure, deterministic, timezone-safe.
 * All day arithmetic runs on local YYYY-MM-DD keys via UTC epochs so DST
 * can never shift a logged day. Observed values are never overwritten by
 * estimates — the two live in separate fields, per the data-quality rules.
 */

import type {
  CompletedCycle,
  Confidence,
  CycleIssue,
  CycleChange,
  CycleContext,
  CycleEntry,
  CycleModel,
  DayState,
  MoodValue,
  Provenance,
  PeriodEpisode,
  PeriodRun,
  PhaseKey,
  PredictionEvent,
  ReproductivePhaseKey,
} from "./types";

/* ------------------------------ date helpers ------------------------------ */

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const dayMs = 86_400_000;

export function keyToEpoch(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const d = new Date(keyToEpoch(key) + days * dayMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function diffDays(from: string, to: string): number {
  return Math.round((keyToEpoch(to) - keyToEpoch(from)) / dayMs);
}

const MEAN_LUTEAL = 14; // standard calendar assumption — always labeled as baseline/estimate
const DEFAULT_CYCLE = 28; // general pattern, used only until personal history exists
const DEFAULT_BLEEDING_MIN = 3;
const DEFAULT_BLEEDING_EXPECTED = 4;
const DEFAULT_BLEEDING_MAX = 5; // generic forecast range only; logged bleeding always overrides it

const PROV = {
  userObserved: (reason = "Logged by you."): Provenance => ({
    source: "user",
    confidence: "high",
    status: "observed",
    reason,
  }),
  correction: (reason = "Updated by you."): Provenance => ({
    source: "correction",
    confidence: "high",
    status: "corrected",
    reason,
  }),
  derived: (reason: string): Provenance => ({
    source: "derived",
    confidence: "medium",
    status: "estimated",
    reason,
  }),
  predicted: (reason: string, confidence: "medium" | "low" = "medium"): Provenance => ({
    source: "predicted",
    confidence,
    status: "estimated",
    reason,
  }),
  baseline: (reason: string): Provenance => ({
    source: "baseline",
    confidence: "low",
    status: "estimated",
    reason,
  }),
  unknown: (reason = "No observation recorded."): Provenance => ({
    source: "baseline",
    confidence: "low",
    status: "unknown",
    reason,
  }),
  conflict: (reason: string): Provenance => ({
    source: "user",
    confidence: "medium",
    status: "conflict",
    reason,
  }),
};

export function entryHasPeriodFlow(e: CycleEntry): boolean {
  return Boolean(e.flow && e.flow !== "none");
}

export function calculationVersionFor(entries: CycleEntry[], defaultCycle?: number | null): string {
  const basis = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [e.date, e.flow ?? "", e.phase ?? "", e.updated_at ?? e.logged_at ?? ""].join(":"))
    .join("|");
  let h = 2166136261;
  for (let i = 0; i < basis.length; i++) {
    h ^= basis.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `cy-${(h >>> 0).toString(36)}-${defaultCycle ?? "d"}`;
}

/* ----------------------------- entry assembly ----------------------------- */

/** Merge sparse partial writes into one normalized per-day record. */
export function normalizeEntry(partial: Partial<CycleEntry> & { date: string }): CycleEntry {
  return {
    date: partial.date,
    cycle_day: partial.cycle_day ?? 1,
    phase: partial.phase ?? null,
    flow: partial.flow ?? null,
    temperature: partial.temperature ?? null,
    cervical_mucus: partial.cervical_mucus ?? null,
    lh_test: partial.lh_test ?? null,
    pain_level: partial.pain_level ?? null,
    sexual_activity: partial.sexual_activity ?? null,
    contraceptive: partial.contraceptive ?? null,
    energy: partial.energy ?? null,
    sleep_hours: partial.sleep_hours ?? null,
    mood: partial.mood ?? null,
    symptoms: Array.isArray(partial.symptoms)
      ? partial.symptoms.filter((s) => typeof s === "string")
      : [],
    notes: partial.notes ?? null,
    next_period_in_days: partial.next_period_in_days ?? null,
    logged_at: partial.logged_at ?? null,
    created_at: partial.created_at ?? null,
    updated_at: partial.updated_at ?? null,
  };
}

const hasFlow = entryHasPeriodFlow;
const isSpottingOrHeavier = (e: CycleEntry) => hasFlow(e);

/**
 * Group logged flow days into period runs. A single unlogged day between
 * flow days does NOT end a run (missing log ≠ no flow), but two or more
 * missing days do.
 */
export function periodRuns(entries: CycleEntry[]): PeriodRun[] {
  const flowDays = entries
    .filter(isSpottingOrHeavier)
    .map((e) => e.date)
    .sort();
  const runs: PeriodRun[] = [];
  let start: string | null = null;
  let prev: string | null = null;
  for (const day of flowDays) {
    if (start === null || prev === null) {
      start = day;
      prev = day;
      continue;
    }
    const gap = diffDays(prev, day);
    if (gap <= 2) prev = day;
    else {
      runs.push({
        start,
        end: prev,
        days: diffDays(start, prev) + 1,
        observedDates: flowDays.filter((x) => x >= start! && x <= prev!),
        inferredGapDates: datesBetween(start, prev).filter((x) => !flowDays.includes(x)),
        provenance: PROV.userObserved("Period run built from logged flow days."),
      });
      start = day;
      prev = day;
    }
  }
  if (start && prev)
    runs.push({
      start,
      end: prev,
      days: diffDays(start, prev) + 1,
      observedDates: flowDays.filter((x) => x >= start! && x <= prev!),
      inferredGapDates: datesBetween(start, prev).filter((x) => !flowDays.includes(x)),
      provenance: PROV.userObserved("Period run built from logged flow days."),
    });
  return runs;
}

export function completedCycles(runs: PeriodRun[]): CompletedCycle[] {
  const out: CompletedCycle[] = [];
  for (let i = 1; i < runs.length; i++) {
    const len = diffDays(runs[i - 1]!.start, runs[i]!.start);
    if (len >= 12 && len <= 90)
      out.push({
        index: out.length,
        start: runs[i - 1]!.start,
        lengthDays: len,
        provenance: PROV.derived("Cycle length derived from two confirmed period starts."),
      });
    // <12d or >90d gaps are almost certainly missing logs, not cycles —
    // they are excluded from statistics and the methodology panel says so.
  }
  return out;
}

/* ------------------------------- statistics ------------------------------- */

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function datesBetween(start: string, end: string): string[] {
  const n = diffDays(start, end);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

/**
 * A sustained ≥0.2° rise held for two consecutive readings, relative to the
 * mean of the earlier (pre-shift) half of the window. Works on any cycle's
 * entries — the current open cycle, or a completed historical one — so the
 * same signal can both mark "ovulation already happened" now and teach the
 * engine your personal luteal length from cycles you finished in the past.
 */
function detectBbtShiftDate(cycleEntries: CycleEntry[]): string | null {
  const temps = cycleEntries.filter((e) => e.temperature !== null);
  if (temps.length < 4) return null;
  const split = Math.max(2, Math.floor(temps.length / 2));
  const lowMean = mean(temps.slice(0, split).map((t) => t.temperature!));
  if (lowMean === null) return null;
  for (let i = split; i < temps.length - 1; i++) {
    const a = temps[i]!.temperature!;
    const b = temps[i + 1]!.temperature!;
    if (a >= lowMean + 0.2 && b >= lowMean + 0.2) return temps[i]!.date;
  }
  return null;
}

const medianOf = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};
const stdOf = (xs: number[], mu: number | null) => {
  if (xs.length < 2 || mu === null) return null;
  const v = xs.reduce((a, x) => a + (x - mu) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
};

export function confidenceFor(completedCount: number): Confidence {
  if (completedCount >= 5) return "strong";
  if (completedCount >= 2) return "fair";
  if (completedCount === 1) return "early";
  return "assumed";
}

function sufficiencyFor(entryCount: number, runs: PeriodRun[], completedCount: number) {
  if (entryCount === 0) return "no_data" as const;
  if (runs.length === 0) return "first_observation" as const;
  if (completedCount === 0)
    return runs.length === 1 ? ("partial_cycle" as const) : ("first_observation" as const);
  if (completedCount === 1) return "one_completed_cycle" as const;
  if (completedCount >= 5) return "strong_personal_history" as const;
  return "multiple_cycles" as const;
}

function likelyCorrected(e: CycleEntry): boolean {
  if (!e.updated_at || !e.created_at) return false;
  return e.updated_at !== e.created_at;
}

function flowProvenance(e: CycleEntry): Provenance {
  return likelyCorrected(e)
    ? PROV.correction("Updated by you; your correction overrides previous estimates.")
    : PROV.userObserved("Logged by you; your entries always take priority over estimates.");
}

function currentRunFor(runs: PeriodRun[], today: string): PeriodRun | null {
  const past = runs.filter((r) => r.start <= today);
  return past[past.length - 1] ?? null;
}

function explicitNoFlowAfter(run: PeriodRun, entries: CycleEntry[]): CycleEntry | null {
  return (
    entries.find(
      (e) => e.flow === "none" && diffDays(run.end, e.date) > 0 && diffDays(run.end, e.date) <= 10,
    ) ?? null
  );
}

function periodEpisodes(runs: PeriodRun[], entries: CycleEntry[]): PeriodEpisode[] {
  return runs.map((run, i) => {
    const noFlow = explicitNoFlowAfter(run, entries);
    const nextRun = runs[i + 1] ?? null;
    const observed = run.observedDates ?? [];
    const gaps = run.inferredGapDates ?? [];
    const confirmedEnd = noFlow || nextRun ? run.end : null;
    const status: PeriodEpisode["status"] = noFlow ? "completed" : nextRun ? "unresolved" : "open";
    const confirmedDuration = confirmedEnd && gaps.length === 0 ? observed.length : null;
    return {
      start: run.start,
      status,
      confirmedEnd,
      observedBleedingDates: observed,
      unknownGapDates: gaps,
      explicitNoFlowDate: noFlow?.date ?? null,
      nextPeriodStart: nextRun?.start ?? null,
      observedBleedingDays: observed.length,
      confirmedDuration,
      provenance:
        status === "open"
          ? PROV.userObserved("Period start logged by you; end has not been confirmed yet.")
          : status === "completed"
            ? PROV.userObserved("Period end supported by a no-flow day you logged.")
            : PROV.derived(
                "A later period start means this episode is no longer current, but the exact end was not logged.",
              ),
    };
  });
}

function isOpenCurrentPeriod(date: string, ctx: ResolveCtx, entries: CycleEntry[]): boolean {
  if (!ctx.currentRun || !ctx.lastStart) return false;
  if (date <= ctx.currentRun.end) return false;
  if (date < ctx.currentRun.start) return false;
  const nextPeriod = ctx.events.find((e) => e.id === "next-period")?.date ?? null;
  if (nextPeriod && date >= nextPeriod) return false;
  const stop = explicitNoFlowAfter(ctx.currentRun, entries);
  return stop === null || date < stop.date;
}

function conflictIssues(entries: CycleEntry[], runs: PeriodRun[]) {
  return entries
    .filter((e) => e.flow === "none" && runs.some((r) => e.date > r.start && e.date < r.end))
    .map((e) => ({
      id: `gap-none-${e.date}`,
      severity: "info" as const,
      date: e.date,
      message: `You logged no flow between period-flow days on ${e.date}. Bloom keeps that day as your entry and treats the sequence as needing context, not an error.`,
    }));
}

/* -------------------------------- the model ------------------------------- */

export function buildCycleModel(
  entries: CycleEntry[],
  today = localDateKey(),
  opts: { defaultCycle?: number | null } = {},
): CycleModel {
  const assumed = Math.min(45, Math.max(20, Math.round(opts.defaultCycle ?? DEFAULT_CYCLE)));
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const runs = periodRuns(sorted);
  const episodes = periodEpisodes(runs, sorted);
  const completed = completedCycles(runs);
  const recent = completed.slice(-6).map((c) => c.lengthDays);

  const usesDefault = completed.length === 0;
  const avg = usesDefault ? assumed : mean(recent);
  const med = recent.length >= 3 ? medianOf(recent) : null;
  const std = usesDefault ? null : stdOf(recent, avg);
  const variabilityPercent = std !== null && avg ? Math.round((std / avg) * 100) : null;
  const rangeMin = recent.length ? Math.min(...recent) : null;
  const rangeMax = recent.length ? Math.max(...recent) : null;
  const completedBleedingDurations = episodes
    .map((episode) => episode.confirmedDuration)
    .filter((days): days is number => days !== null);
  const periodLengthAverage = mean(completedBleedingDurations);
  const estimatedPeriodLength = Math.max(
    1,
    Math.round(periodLengthAverage ?? DEFAULT_BLEEDING_EXPECTED),
  );
  const estimatedBleedingWindowMax = Math.max(
    estimatedPeriodLength,
    Math.round(periodLengthAverage ?? DEFAULT_BLEEDING_MAX),
  );
  const calculationVersion = calculationVersionFor(sorted, opts.defaultCycle ?? null);
  const issues = conflictIssues(sorted, runs);

  // Learn a personal luteal length from any past cycle with a confirmed BBT
  // shift, instead of always assuming the population-average 14 days. The
  // shift is detected 1–3 days after ovulation actually happens, so the day
  // before the shift is used as the confirmed ovulation date for that cycle.
  const bbtConfirmedLutealLengths: number[] = [];
  for (const c of completed) {
    const cycleEnd = addDays(c.start, c.lengthDays);
    const windowEntries = sorted.filter((e) => e.date >= c.start && e.date < cycleEnd);
    const shift = detectBbtShiftDate(windowEntries);
    if (!shift) continue;
    const confirmedOvulation = addDays(shift, -1);
    const lutealForCycle = diffDays(confirmedOvulation, cycleEnd);
    if (lutealForCycle >= 9 && lutealForCycle <= 16) bbtConfirmedLutealLengths.push(lutealForCycle);
  }
  const personalizedLuteal = bbtConfirmedLutealLengths.length
    ? Math.round(mean(bbtConfirmedLutealLengths)!)
    : null;

  const lastStart = runs.length ? (runs[runs.length - 1]?.start ?? null) : null;
  const currentRun = currentRunFor(runs, today);
  const currentPeriodEpisode = currentRun
    ? (episodes.find((episode) => episode.start === currentRun.start) ?? null)
    : null;
  const currentDay = lastStart ? Math.max(1, diffDays(lastStart, today) + 1) : null;

  const avgSafe = avg ?? assumed;
  const lutealLength = personalizedLuteal ?? MEAN_LUTEAL;
  const ovulationDay = usesDefault
    ? assumed - lutealLength
    : Math.max(8, Math.round(avgSafe - lutealLength));

  /* observed evidence in the CURRENT cycle window — shown alongside, never overwriting */
  const cycleStart = lastStart ?? today;
  const inCurrent = sorted.filter(
    (e) =>
      diffDays(cycleStart, e.date) >= 0 &&
      (currentDay === null || diffDays(cycleStart, e.date) < currentDay + 1),
  );
  const lhPositiveDates = inCurrent.filter((e) => e.lh_test === "positive").map((e) => e.date);
  const eggWhiteDates = inCurrent
    .filter((e) => e.cervical_mucus === "egg-white")
    .map((e) => e.date);
  const bbtShiftDate = detectBbtShiftDate(inCurrent);

  const reproductivePhaseFor = (day: number): ReproductivePhaseKey => {
    if (day >= ovulationDay - 1 && day <= ovulationDay + 1) return "ovulation";
    if (day < ovulationDay) return "follicular";
    return "luteal";
  };

  const dayPhase = (day: number): PhaseKey => reproductivePhaseFor(day);

  const todayLogged = sorted.find((e) => e.date === today) ?? null;
  const currentStatePreview = currentDay
    ? resolveDayState(today, sorted, {
        today,
        lastStart,
        currentDay,
        currentRun,
        dayPhase,
        reproductivePhaseFor,
        avgSafe,
        estimatedPeriodLength,
        usesDefault,
        events: [],
        issues,
      })
    : null;
  const currentPhase: PhaseKey | null = currentStatePreview?.phase ?? null;
  const currentProvenance =
    currentStatePreview?.provenance ??
    (todayLogged
      ? PROV.userObserved("Logged by you.")
      : PROV.unknown("Phase not established yet."));
  const currentBleedingState = currentStatePreview?.bleedingState ?? "unlogged";
  const currentBleedingProvenance =
    currentStatePreview?.bleedingProvenance ?? PROV.unknown("No bleeding log for today yet.");
  const currentReproductivePhase = currentStatePreview?.reproductivePhase ?? null;
  const currentReproductiveProvenance =
    currentStatePreview?.reproductiveProvenance ??
    PROV.unknown("No cycle anchor for reproductive phase yet.");

  /* events */
  const events: PredictionEvent[] = [];
  const halfWidth = std !== null ? Math.min(5, Math.max(2, Math.ceil(std * 1.25))) : null;

  if (lastStart) {
    const bleedingEnd = addDays(lastStart, estimatedBleedingWindowMax - 1);
    if (currentDay !== null && today <= bleedingEnd) {
      events.push({
        id: "bleeding-window",
        label: "Your period",
        date: null,
        rangeStart: lastStart,
        rangeEnd: bleedingEnd,
        plusMinusDays:
          periodLengthAverage === null ? DEFAULT_BLEEDING_MAX - DEFAULT_BLEEDING_MIN : 1,
        daysAway: 0,
        detail:
          periodLengthAverage === null
            ? "Logged start only; duration is still uncertain until you log bleeding or no bleeding"
            : `Bloom estimate from your logged period runs (${periodLengthAverage} day average)`,
        predicted: true,
        provenance:
          periodLengthAverage === null
            ? PROV.baseline(
                "Bleeding duration is a general estimate until enough logged period endings exist.",
              )
            : PROV.predicted("Bleeding duration estimated from your logged period runs."),
        generatedFromVersion: calculationVersion,
      });
    }

    const nextStart = addDays(lastStart, Math.round(avgSafe));
    const daysAway = diffDays(today, nextStart);
    const expectedDay = currentDay !== null ? Math.round(avgSafe) : null;
    events.push({
      id: "next-period",
      label: "Next period",
      date: nextStart,
      rangeStart: halfWidth !== null ? addDays(nextStart, -halfWidth) : null,
      rangeEnd: halfWidth !== null ? addDays(nextStart, halfWidth) : null,
      plusMinusDays: halfWidth,
      daysAway,
      detail: usesDefault
        ? `Estimated from a general ${assumed}-day pattern — log two cycles and it becomes yours`
        : `Estimated around day ${expectedDay ?? "—"} of this cycle, from your last ${recent.length} cycles`,
      predicted: true,
      provenance: usesDefault
        ? PROV.baseline(`Estimated from the general ${assumed}-day baseline.`)
        : PROV.predicted(
            `Estimated from ${recent.length} completed logged cycle${recent.length === 1 ? "" : "s"}.`,
          ),
      generatedFromVersion: calculationVersion,
    });

    // A positive LH test is the strongest same-cycle signal available (surge
    // precedes ovulation by ~24–36h); a confirmed temperature rise is the
    // next best (it means ovulation already happened, ~1 day before the
    // shift). Either one moves the prediction; absent both, it stays a
    // calendar guess. Priority: LH > BBT > calendar.
    const calendarOvu = addDays(lastStart, ovulationDay);
    const latestLH = lhPositiveDates.length ? lhPositiveDates[lhPositiveDates.length - 1]! : null;
    const lhOvulation = latestLH ? addDays(latestLH, 1) : null;
    const lhCycleDay = lhOvulation ? diffDays(lastStart, lhOvulation) + 1 : null;
    // Guard against a stray/mislogged early test producing a nonsense date.
    const lhIsPlausible = lhOvulation !== null && lhCycleDay !== null && lhCycleDay >= 6;
    const bbtOvulation = !lhIsPlausible && bbtShiftDate ? addDays(bbtShiftDate, -1) : null;
    const confirmedBy: "lh" | "bbt" | "calendar" = lhIsPlausible
      ? "lh"
      : bbtOvulation
        ? "bbt"
        : "calendar";
    const ovu = confirmedBy === "lh" ? lhOvulation! : (bbtOvulation ?? calendarOvu);
    const ovuAway = diffDays(today, ovu);

    events.push({
      id: "ovulation",
      label:
        confirmedBy === "lh"
          ? "Ovulation (LH-adjusted)"
          : confirmedBy === "bbt"
            ? "Ovulation (temperature-confirmed)"
            : "Ovulation (estimate)",
      date: ovu,
      rangeStart:
        confirmedBy === "calendar"
          ? halfWidth !== null
            ? addDays(ovu, -halfWidth)
            : null
          : addDays(ovu, -1),
      rangeEnd:
        confirmedBy === "calendar"
          ? halfWidth !== null
            ? addDays(ovu, halfWidth)
            : null
          : addDays(ovu, 1),
      plusMinusDays: confirmedBy === "calendar" ? halfWidth : 1,
      daysAway: ovuAway,
      detail:
        confirmedBy === "lh"
          ? `Your positive LH test on ${fmtShort(latestLH!)} moved this off the calendar — a surge is typically followed by ovulation in ~24–36h`
          : confirmedBy === "bbt"
            ? `Your temperature rise on ${fmtShort(bbtShiftDate!)} suggests ovulation already happened, about a day earlier`
            : personalizedLuteal !== null
              ? `Calendar estimate, refined using your own ${personalizedLuteal}-day luteal phase from confirmed cycles`
              : usesDefault
                ? "Calendar estimate only (typical 14-day luteal phase) — no personal data behind it yet"
                : "Calendar estimate — an LH test or temperature shift sharpens it",
      // Ovulation itself is never directly observed, even when a biomarker
      // narrows it a lot — keep this true so the UI never claims "logged".
      predicted: true,
      provenance:
        confirmedBy === "lh"
          ? {
              source: "confirmed",
              confidence: "high",
              status: "estimated",
              reason: "Adjusted from your positive LH test; ovulation is inferred, not observed.",
            }
          : confirmedBy === "bbt"
            ? {
                source: "confirmed",
                confidence: "high",
                status: "estimated",
                reason:
                  "Adjusted from your logged temperature rise; the shift confirms ovulation already occurred.",
              }
            : usesDefault
              ? PROV.baseline("Estimated from the general baseline and a 14-day luteal assumption.")
              : PROV.predicted("Estimated from cycle length history; ovulation is never guaranteed."),
      generatedFromVersion: calculationVersion,
    });

    // Fertile window follows whichever ovulation date won above, and can
    // stretch a little earlier if egg-white cervical mucus — a recognized
    // precursor sign — was logged ahead of the calendar window.
    let fertileStart = addDays(ovu, -5);
    const fertileEnd = addDays(ovu, 1);
    const earliestEggWhite = eggWhiteDates.length ? eggWhiteDates[0]! : null;
    // diffDays(a, b) = b - a, so a positive gap means the mucus was logged
    // that many days *before* the calendar fertile window starts.
    const mucusLeadDays = earliestEggWhite ? diffDays(earliestEggWhite, fertileStart) : 0;
    const extendedByMucus = earliestEggWhite !== null && mucusLeadDays > 0 && mucusLeadDays <= 3;
    if (extendedByMucus) fertileStart = earliestEggWhite!;
    events.push({
      id: "fertile-window",
      label: "Fertile window (estimate)",
      date: null,
      rangeStart: fertileStart,
      rangeEnd: fertileEnd,
      plusMinusDays: halfWidth,
      daysAway: diffDays(today, fertileStart),
      detail: extendedByMucus
        ? `Extended earlier to include egg-white cervical mucus logged on ${fmtShort(earliestEggWhite!)} — planning awareness only, not contraception`
        : confirmedBy !== "calendar"
          ? "Adjusted to match your confirmed ovulation — planning awareness only, not contraception"
          : "Planning awareness only — an estimate, not contraception and not a fertility guarantee",
      predicted: true,
      provenance: usesDefault
        ? PROV.baseline("General fertile-window estimate; not contraception or a guarantee.")
        : PROV.predicted(
            "Estimated from the current cycle forecast; not contraception or a guarantee.",
          ),
      generatedFromVersion: calculationVersion,
    });

    if (!usesDefault) {
      const pmsStart = addDays(lastStart, Math.min(ovulationDay + 7, avgSafe - 6));
      const pmsEnd = addDays(nextStart, -1);
      if (diffDays(pmsStart, pmsEnd) >= 1)
        events.push({
          id: "pms-window",
          label: "PMS window (estimate)",
          date: null,
          rangeStart: pmsStart,
          rangeEnd: pmsEnd,
          plusMinusDays: null,
          daysAway: diffDays(today, pmsStart),
          detail: "Late-luteal stretch — some people notice mood or energy shifts here; many don't",
          predicted: true,
          provenance: PROV.predicted(
            "Estimated late-luteal window from your cycle-length history.",
          ),
          generatedFromVersion: calculationVersion,
        });
    }
  }

  if (lhPositiveDates.length) {
    const latest = lhPositiveDates[lhPositiveDates.length - 1]!;
    events.push({
      id: "phase-change",
      label: "Positive LH test",
      date: latest,
      rangeStart: null,
      rangeEnd: null,
      plusMinusDays: null,
      daysAway: diffDays(today, latest),
      detail: "Logged by you — the surge usually precedes ovulation by ~24–36 h",
      predicted: false,
      provenance: PROV.userObserved("LH test logged by you."),
      generatedFromVersion: calculationVersion,
    });
  }

  events.sort((a, b) => Math.abs(a.daysAway) - Math.abs(b.daysAway));

  return {
    today,
    lastPeriodStart: lastStart,
    currentDay,
    currentPhase,
    currentProvenance,
    currentBleedingState,
    currentBleedingProvenance,
    currentReproductivePhase,
    currentReproductiveProvenance,
    completed,
    periodRuns: runs,
    periodEpisodes: episodes,
    currentRun,
    currentPeriodEpisode,
    average: usesDefault ? null : avg,
    median: med,
    stdDev: std,
    variabilityPercent,
    rangeMin,
    rangeMax,
    periodLengthAverage,
    estimatedPeriodLength,
    confidence: confidenceFor(completed.length),
    dataSufficiency: sufficiencyFor(sorted.length, runs, completed.length),
    usesDefaultAssumption: usesDefault,
    baselineCycleLength: assumed,
    calculationVersion,
    issues,
    events,
    dayPhase,
    reproductivePhaseFor,
    ovulationDay,
    lutealLength,
    observedEvidence: { lhPositiveDates, bbtShiftDate, eggWhiteDates },
  };
}

/* --------------------------- calendar day states --------------------------- */

type ResolveCtx = {
  today: string;
  lastStart: string | null;
  currentDay: number | null;
  currentRun: PeriodRun | null;
  dayPhase: (day: number) => PhaseKey;
  reproductivePhaseFor: (day: number) => ReproductivePhaseKey;
  avgSafe: number;
  estimatedPeriodLength: number;
  usesDefault: boolean;
  events: PredictionEvent[];
  issues: CycleIssue[];
};

const within = (d: string, a: string | null, b: string | null) =>
  a !== null && b !== null && d >= a && d <= b;

function resolveDayState(date: string, entries: CycleEntry[], ctx: ResolveCtx): DayState {
  const logged = entries.find((e) => e.date === date) ?? null;
  const conflict = ctx.issues.find((i) => i.date === date) ?? null;
  const bleedingWindow = ctx.events.find((e) => e.id === "bleeding-window") ?? null;
  const nextPeriod = ctx.events.find((e) => e.id === "next-period") ?? null;
  const fertile = ctx.events.find((e) => e.id === "fertile-window") ?? null;
  const ovu = ctx.events.find((e) => e.id === "ovulation") ?? null;
  const pms = ctx.events.find((e) => e.id === "pms-window") ?? null;
  const cycleDay =
    ctx.lastStart && diffDays(ctx.lastStart, date) >= 0 ? diffDays(ctx.lastStart, date) + 1 : null;

  const predictedPeriodDay =
    nextPeriod !== null &&
    date > ctx.today &&
    (nextPeriod.date === date ||
      within(date, nextPeriod.rangeStart, nextPeriod.rangeEnd) ||
      (nextPeriod.date !== null &&
        date >= nextPeriod.date &&
        date <= addDays(nextPeriod.date, ctx.estimatedPeriodLength - 1)));
  const reproductivePhase =
    cycleDay !== null
      ? ctx.reproductivePhaseFor(((cycleDay - 1) % Math.max(1, Math.round(ctx.avgSafe))) + 1)
      : null;
  const reproductiveProvenance =
    reproductivePhase === null
      ? PROV.unknown("No cycle anchor for reproductive phase yet.")
      : ctx.usesDefault
        ? PROV.baseline(
            "Reproductive phase estimated from the general baseline; bleeding is tracked separately.",
          )
        : PROV.predicted(
            "Reproductive phase estimated from your cycle history; bleeding is tracked separately.",
          );

  if (logged?.flow && logged.flow !== "none") {
    return {
      logged,
      phase: "menstrual",
      bleedingState: logged.flow,
      bleedingProvenance: flowProvenance(logged),
      reproductivePhase,
      reproductiveProvenance,
      cycleDay,
      predictedPeriod: false,
      predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
      predictedOvulation: ovu?.date === date,
      pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
      provenance: flowProvenance(logged),
      conflict,
    };
  }

  if (logged?.flow === "none") {
    return {
      logged,
      phase: logged.phase,
      bleedingState: "none",
      bleedingProvenance: flowProvenance(logged),
      reproductivePhase,
      reproductiveProvenance,
      cycleDay,
      predictedPeriod: false,
      predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
      predictedOvulation: ovu?.date === date,
      pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
      provenance: conflict
        ? PROV.conflict(
            "You logged no flow inside a period-flow sequence; Bloom will not invent a single interpretation.",
          )
        : flowProvenance(logged),
      conflict,
    };
  }

  const currentBleedingEstimate =
    date > ctx.today &&
    within(date, bleedingWindow?.rangeStart ?? null, bleedingWindow?.rangeEnd ?? null);

  if (currentBleedingEstimate) {
    return {
      logged,
      phase: "menstrual",
      bleedingState: "unlogged",
      bleedingProvenance:
        bleedingWindow?.provenance ??
        PROV.baseline("Bloom estimate for your current bleeding window."),
      reproductivePhase,
      reproductiveProvenance,
      cycleDay,
      predictedPeriod: true,
      predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
      predictedOvulation: ovu?.date === date,
      pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
      provenance:
        bleedingWindow?.provenance ??
        PROV.baseline("Bloom estimate for your current bleeding window."),
      conflict,
    };
  }

  if (isOpenCurrentPeriod(date, ctx, entries)) {
    return {
      logged,
      phase: null,
      bleedingState: "unlogged",
      bleedingProvenance: PROV.unknown(
        "Not logged yet. A period start is an anchor, not proof that bleeding ended or continued.",
      ),
      reproductivePhase,
      reproductiveProvenance,
      cycleDay,
      predictedPeriod: Boolean(predictedPeriodDay),
      predictedFertile: false,
      predictedOvulation: false,
      pms: false,
      provenance: PROV.unknown(
        "Not logged yet. A period start is an anchor, not proof that the period ended or continued.",
      ),
      conflict,
    };
  }

  if (ctx.currentRun && date >= ctx.currentRun.start && date <= ctx.currentRun.end) {
    return {
      logged,
      phase: null,
      bleedingState: "unlogged",
      bleedingProvenance: PROV.unknown(
        "Not logged for this date. Nearby bleeding logs may be part of the same period, but this day itself stays unknown.",
      ),
      reproductivePhase,
      reproductiveProvenance,
      cycleDay,
      predictedPeriod: Boolean(predictedPeriodDay),
      predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
      predictedOvulation: ovu?.date === date,
      pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
      provenance: PROV.unknown(
        "Not logged for this date. Bloom will not fill in bleeding or no bleeding for you.",
      ),
      conflict,
    };
  }

  if (predictedPeriodDay) {
    return {
      logged,
      phase: "menstrual",
      bleedingState: "unlogged",
      bleedingProvenance:
        nextPeriod?.provenance ??
        (ctx.usesDefault
          ? PROV.baseline(
              "Estimated bleeding window from the general baseline; no bleeding has been logged.",
            )
          : PROV.predicted(
              "Estimated bleeding window from cycle history; no bleeding has been logged.",
            )),
      reproductivePhase,
      reproductiveProvenance,
      cycleDay,
      predictedPeriod: true,
      predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
      predictedOvulation: ovu?.date === date,
      pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
      provenance:
        nextPeriod?.provenance ??
        (ctx.usesDefault
          ? PROV.baseline("Bloom estimate for your next period from the general baseline.")
          : PROV.predicted("Bloom estimate for your next period from cycle history.")),
      conflict,
    };
  }

  let phase: PhaseKey | null = null;
  let provenance = PROV.unknown("Nothing logged for this date.");

  if (cycleDay !== null && ctx.currentDay !== null && date >= (ctx.lastStart ?? date)) {
    const dayInCycle = ((cycleDay - 1) % Math.max(1, Math.round(ctx.avgSafe))) + 1;
    phase = ctx.dayPhase(dayInCycle);
    if (date <= ctx.today && !logged) {
      phase = null;
      provenance = PROV.unknown(
        "Nothing logged for this date; missing data is not treated as no bleeding.",
      );
    } else {
      provenance = ctx.usesDefault
        ? PROV.baseline(
            "Future phase estimated from a general baseline because personal history is limited.",
          )
        : PROV.predicted("Future phase estimated from your cycle history.");
    }
  }

  return {
    logged,
    phase,
    bleedingState: "unlogged",
    bleedingProvenance: PROV.unknown("No bleeding or no-flow observation recorded for this date."),
    reproductivePhase,
    reproductiveProvenance,
    cycleDay,
    predictedPeriod: false,
    predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
    predictedOvulation: ovu?.date === date,
    pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
    provenance,
    conflict,
  };
}

export function dayStateFor(date: string, entries: CycleEntry[], model: CycleModel): DayState {
  return resolveDayState(
    date,
    [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    {
      today: model.today,
      lastStart: model.lastPeriodStart,
      currentDay: model.currentDay,
      currentRun: model.currentRun,
      dayPhase: model.dayPhase,
      reproductivePhaseFor: model.reproductivePhaseFor,
      avgSafe: model.average ?? model.baselineCycleLength,
      estimatedPeriodLength: model.estimatedPeriodLength,
      usesDefault: model.usesDefaultAssumption,
      events: model.events,
      issues: model.issues,
    },
  );
}

export function explainDayState(state: DayState): string {
  return state.provenance.reason;
}

export function validateCycleConsistency(entries: CycleEntry[], model: CycleModel) {
  const issues = [...model.issues];
  if (model.lastPeriodStart && model.currentDay !== null) {
    const expected = diffDays(model.lastPeriodStart, model.today) + 1;
    if (expected !== model.currentDay) {
      issues.push({
        id: "current-day-mismatch",
        severity: "warning",
        message: `Hero day ${model.currentDay} does not match anchor-derived day ${expected}.`,
      });
    }
  }
  for (const e of entries) {
    const s = dayStateFor(e.date, entries, model);
    if (e.flow && e.flow !== "none" && s.phase !== "menstrual") {
      issues.push({
        id: `flow-phase-mismatch-${e.date}`,
        severity: "warning",
        date: e.date,
        message: `Logged period flow on ${e.date} but resolved phase is ${s.phase ?? "unknown"}.`,
      });
    }
  }
  for (const ev of model.events) {
    if (ev.predicted && ev.generatedFromVersion !== model.calculationVersion) {
      issues.push({
        id: `stale-event-${ev.id}`,
        severity: "warning",
        message: `${ev.label} was generated from a stale calculation version.`,
      });
    }
  }
  return issues;
}

/* ----------------------------- AI context build ----------------------------- */

export function buildContext(
  entries: CycleEntry[],
  model: CycleModel,
  recentCorrections: CycleChange[] = [],
): CycleContext {
  const cutoff = addDays(model.today, -30);
  const last30 = entries.filter((e) => e.date >= cutoff);
  const todayState = dayStateFor(model.today, entries, model);
  return {
    generatedAt: new Date().toISOString(),
    calculationVersion: model.calculationVersion,
    today: model.today,
    currentDay: model.currentDay,
    currentPhase: model.currentPhase,
    currentProvenance: model.currentProvenance,
    bleedingState: todayState.bleedingState,
    reproductivePhase: todayState.reproductivePhase,
    reproductiveProvenance: todayState.reproductiveProvenance,
    confidence: model.confidence,
    dataSufficiency: model.dataSufficiency,
    usesDefaultAssumption: model.usesDefaultAssumption,
    baselineCycleLength: model.baselineCycleLength,
    completedCount: model.completed.length,
    recentLengths: model.completed.slice(-6).map((c) => c.lengthDays),
    average: model.average,
    median: model.median,
    rangeMin: model.rangeMin,
    rangeMax: model.rangeMax,
    variabilityPercent: model.variabilityPercent,
    periodLengthAverage: model.periodLengthAverage,
    estimatedPeriodLength: model.estimatedPeriodLength,
    currentPeriodEpisode: model.currentPeriodEpisode,
    recentCorrections,
    issues: model.issues,
    events: model.events,
    loggedDays30: last30.length,
    observedPeriodDays: last30.filter((e) => e.flow && e.flow !== "none").map((e) => e.date),
    explicitNoFlowDays: last30.filter((e) => e.flow === "none").map((e) => e.date),
    unloggedRecentDays: datesBetween(addDays(model.today, -6), model.today).filter(
      (d) => !entries.some((e) => e.date === d),
    ),
    estimatedPeriodDays: model.events
      .filter((e) => e.id === "next-period" && e.date !== null)
      .flatMap((e) => datesBetween(e.date!, addDays(e.date!, model.estimatedPeriodLength - 1))),
    recentFlow: last30
      .filter((e) => e.flow !== null)
      .slice(-14)
      .map((e) => ({ date: e.date, flow: e.flow, provenance: flowProvenance(e) })),
    recentMood: last30
      .filter((e): e is CycleEntry & { mood: MoodValue } => e.mood !== null)
      .slice(-14)
      .map((e) => ({ date: e.date, mood: e.mood })),
    recentEnergy: last30
      .filter((e) => e.energy !== null)
      .slice(-14)
      .map((e) => ({ date: e.date, energy: e.energy! })),
    recentSymptoms: last30
      .filter((e) => e.symptoms.length > 0)
      .slice(-10)
      .map((e) => ({ date: e.date, symptoms: e.symptoms })),
    observedEvidence: model.observedEvidence,
    highPainDays30: last30.filter((e) => (e.pain_level ?? 0) >= 4).length,
  };
}

/* ------------------------------ display helpers ------------------------------ */

export function fmtDate(key: string): string {
  return new Date(keyToEpoch(key) + dayMs / 2).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtShort(key: string): string {
  return new Date(keyToEpoch(key) + dayMs / 2).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function daysAwayLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return days > 45 ? `in ${Math.round(days / 7)} weeks` : `in ${days} days`;
  const a = -days;
  return a > 45 ? `${Math.round(a / 7)} weeks ago` : `${a} days ago`;
}
