import type {
  Anomaly,
  Correlation,
  DayAggregate,
  DetectedPattern,
  EmotionKey,
  Evidence,
  Insight,
  MoodEntry,
} from "./types";
import { EMOTION_MAP, EMOTIONS } from "./types";

/* ------------------------------------------------------------------ *
 * Pure analytics engine. No DOM, no React — safe to reuse for an AI
 * layer later. Every function tolerates empty / partial data.
 * ------------------------------------------------------------------ */

export const dayKey = (iso: string) => iso.slice(0, 10);
const round = (n: number, p = 1) => Math.round(n * 10 ** p) / 10 ** p;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Group entries into calendar-day aggregates, ascending by date. */
export function aggregateDays(entries: MoodEntry[]): DayAggregate[] {
  const buckets = new Map<string, MoodEntry[]>();
  for (const e of entries) {
    const k = dayKey(e.timestamp);
    const arr = buckets.get(k);
    if (arr) arr.push(e);
    else buckets.set(k, [e]);
  }
  const avgOf = (list: MoodEntry[], pick: (e: MoodEntry) => number | undefined) => {
    const vals = list.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return vals.length ? round(mean(vals), 2) : undefined;
  };
  return [...buckets.entries()]
    .map(([date, list]) => ({
      date,
      mood: round(mean(list.map((e) => e.mood)), 2),
      energy: round(mean(list.map((e) => e.energy)), 2),
      stress: round(mean(list.map((e) => e.stress)), 2),
      entries: [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      emotions: [...new Set(list.flatMap((e) => e.emotions))],
      sleep: avgOf(list, (e) => e.sleep),
      exercise: avgOf(list, (e) => e.exercise),
      screenTime: avgOf(list, (e) => e.screenTime),
      productivity: avgOf(list, (e) => e.productivity),
      steps: avgOf(list, (e) => e.steps),
      social: avgOf(list, (e) => e.social),
      study: avgOf(list, (e) => e.study),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateAverageMood(entries: MoodEntry[]): number {
  return round(mean(entries.map((e) => e.mood)), 2);
}

/** Least-squares slope over day index → points per day, plus direction. */
export function calculateMoodTrend(days: DayAggregate[]) {
  if (days.length < 3) return { slope: 0, direction: "stable" as const, perWeek: 0 };
  const xs = days.map((_, i) => i);
  const ys = days.map((d) => d.mood);
  const mx = mean(xs);
  const my = mean(ys);
  const denom = xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] ?? 0) - my), 0) / denom;
  const perWeek = round(slope * 7, 2);
  const direction = perWeek > 0.15 ? "improving" : perWeek < -0.15 ? "declining" : "stable";
  return { slope, direction, perWeek } as const;
}

/** 0-100. 100 = identical mood every day; penalises day-to-day swing. */
export function calculateVolatility(days: DayAggregate[]) {
  const moods = days.map((d) => d.mood);
  const deltas: number[] = [];
  for (let i = 1; i < moods.length; i++) deltas.push(Math.abs((moods[i] ?? 0) - (moods[i - 1] ?? 0)));
  const avgDelta = round(mean(deltas), 2);
  const largest = deltas.length ? round(Math.max(...deltas), 2) : 0;
  const smallest = deltas.length ? round(Math.min(...deltas), 2) : 0;
  const sd = round(stdDev(moods), 2);
  const stability = moods.length < 2 ? null : Math.max(0, Math.min(100, Math.round(100 - avgDelta * 22)));
  return { avgDelta, largest, smallest, sd, stability, deltas };
}

export function calculateEmotionDistribution(entries: MoodEntry[]) {
  const total = entries.length || 1;
  const map = new Map<EmotionKey, { count: number; moods: number[]; recent: number[]; older: number[] }>();
  const mid = entries.length ? (entries[Math.floor(entries.length / 2)]?.timestamp ?? "") : "";
  for (const e of entries) {
    for (const k of e.emotions) {
      const cur = map.get(k) ?? { count: 0, moods: [], recent: [], older: [] };
      cur.count += 1;
      cur.moods.push(e.mood);
      (e.timestamp >= mid ? cur.recent : cur.older).push(e.mood);
      map.set(k, cur);
    }
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: EMOTION_MAP[key]?.label ?? key,
      accent: EMOTION_MAP[key]?.accent ?? "violet",
      valence: EMOTION_MAP[key]?.valence ?? "neutral",
      count: v.count,
      share: round((v.count / total) * 100, 1),
      avgMood: round(mean(v.moods), 2),
      trend:
        v.recent.length >= 2 && v.older.length >= 2 ? round(mean(v.recent) - mean(v.older), 2) : null,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Pearson r over paired samples. */
export function calculateCorrelation(pairs: [number, number][]) {
  const n = pairs.length;
  if (n < 4) return { r: 0, n };
  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const num = pairs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
  const den = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0));
  return { r: den === 0 ? 0 : round(num / den, 3), n };
}

export function evidenceFor(n: number, r: number): Evidence {
  const a = Math.abs(r);
  if (n < 8 || a < 0.15) return "insufficient";
  if (n >= 40 && a >= 0.5) return "strong";
  if (n >= 20 && a >= 0.3) return "moderate";
  return "low";
}

const VARIABLES: {
  key: keyof DayAggregate;
  label: string;
  unit: string;
  phrase: string;
}[] = [
  { key: "sleep", label: "Sleep duration", unit: "h", phrase: "longer sleep" },
  { key: "exercise", label: "Exercise", unit: "min", phrase: "more exercise" },
  { key: "steps", label: "Steps", unit: "", phrase: "more steps" },
  { key: "screenTime", label: "Screen time", unit: "h", phrase: "more screen time" },
  { key: "productivity", label: "Productivity", unit: "/10", phrase: "higher productivity" },
  { key: "study", label: "Study time", unit: "min", phrase: "more study time" },
  { key: "social", label: "Social activity", unit: "/10", phrase: "more social activity" },
  { key: "energy", label: "Energy", unit: "/10", phrase: "higher energy" },
  { key: "stress", label: "Stress", unit: "/10", phrase: "higher stress" },
];

export function calculateCorrelations(days: DayAggregate[]): Correlation[] {
  return VARIABLES.map(({ key, label, unit, phrase }) => {
    const pairs = days
      .map((d) => [d[key] as number | undefined, d.mood] as const)
      .filter((p): p is readonly [number, number] => typeof p[0] === "number")
      .map((p) => [p[0], p[1]] as [number, number]);
    const { r, n } = calculateCorrelation(pairs);
    const evidence = evidenceFor(n, r);
    const direction = r >= 0 ? "positive" : "negative";
    return {
      key: String(key),
      label,
      unit,
      r,
      n,
      evidence,
      direction,
      statement:
        evidence === "insufficient"
          ? `Not enough paired observations yet to describe how ${label.toLowerCase()} relates to your mood.`
          : `Days with ${phrase} have been associated with ${r >= 0 ? "higher" : "lower"} mood scores in your recorded data.`,
    } satisfies Correlation;
  })
    .filter((c) => c.n >= 4)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

/** Weekday × time-of-day mood grid. */
export const TIME_BANDS = [
  { key: "morning", label: "Morning", range: "05–12" },
  { key: "afternoon", label: "Afternoon", range: "12–17" },
  { key: "evening", label: "Evening", range: "17–22" },
  { key: "night", label: "Night", range: "22–05" },
] as const;

export function bandOf(hour: number) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export interface HeatCell {
  weekday: number;
  band: string;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  count: number;
}

export function buildHeatmap(entries: MoodEntry[]): HeatCell[] {
  const acc = new Map<string, { mood: number[]; energy: number[]; stress: number[] }>();
  for (const e of entries) {
    const d = new Date(e.timestamp);
    const k = `${d.getDay()}|${bandOf(d.getHours())}`;
    const cur = acc.get(k) ?? { mood: [], energy: [], stress: [] };
    cur.mood.push(e.mood);
    cur.energy.push(e.energy);
    cur.stress.push(e.stress);
    acc.set(k, cur);
  }
  const cells: HeatCell[] = [];
  for (let wd = 0; wd < 7; wd++) {
    for (const b of TIME_BANDS) {
      const v = acc.get(`${wd}|${b.key}`);
      cells.push({
        weekday: wd,
        band: b.key,
        mood: v ? round(mean(v.mood), 2) : null,
        energy: v ? round(mean(v.energy), 2) : null,
        stress: v ? round(mean(v.stress), 2) : null,
        count: v ? v.mood.length : 0,
      });
    }
  }
  return cells;
}

export function movingAverage(values: (number | null)[], window: number) {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    out.push(slice.length >= Math.min(3, window) ? round(mean(slice), 2) : null);
  }
  return out;
}

export const MOOD_BUCKETS = [
  { key: "excellent", label: "Excellent", min: 8.5, accent: "sage" },
  { key: "good", label: "Good", min: 7, accent: "sky" },
  { key: "neutral", label: "Neutral", min: 5.5, accent: "amber" },
  { key: "difficult", label: "Difficult", min: 4, accent: "rose" },
  { key: "very-difficult", label: "Very difficult", min: 0, accent: "violet" },
] as const;

export function bucketOf(mood: number) {
  return MOOD_BUCKETS.find((b) => mood >= b.min) ?? MOOD_BUCKETS[4];
}

export function calculateDistribution(days: DayAggregate[], prev: DayAggregate[]) {
  const count = (list: DayAggregate[], key: string) => list.filter((d) => bucketOf(d.mood).key === key).length;
  return MOOD_BUCKETS.map((b) => {
    const c = count(days, b.key);
    const p = count(prev, b.key);
    return {
      ...b,
      count: c,
      share: days.length ? round((c / days.length) * 100, 1) : 0,
      delta: c - p,
      dates: days.filter((d) => bucketOf(d.mood).key === b.key).map((d) => d.date),
    };
  });
}

export function detectPatterns(days: DayAggregate[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const push = (p: DetectedPattern) => out.push(p);

  const splitCompare = (
    id: string,
    title: string,
    key: keyof DayAggregate,
    threshold: number,
    hiLabel: string,
    loLabel: string,
    statement: string,
    accent: DetectedPattern["accent"],
  ) => {
    const withVal = days.filter((d) => typeof d[key] === "number");
    const hi = withVal.filter((d) => (d[key] as number) >= threshold);
    const lo = withVal.filter((d) => (d[key] as number) < threshold);
    if (hi.length < 4 || lo.length < 4) return;
    const hm = round(mean(hi.map((d) => d.mood)), 2);
    const lm = round(mean(lo.map((d) => d.mood)), 2);
    const diff = round(hm - lm, 2);
    if (Math.abs(diff) < 0.35) return;
    const n = withVal.length;
    push({
      id,
      title,
      statement,
      n,
      evidence: evidenceFor(n, Math.min(0.9, Math.abs(diff) / 2)),
      metrics: [
        { label: hiLabel, value: hm.toFixed(1) },
        { label: loLabel, value: lm.toFixed(1) },
      ],
      delta: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`,
      accent,
    });
  };

  splitCompare(
    "sleep-7h",
    "Sleep threshold",
    "sleep",
    7,
    "7h+ sleep",
    "Under 7h sleep",
    "You tend to report a higher mood on days when sleep exceeds 7 hours.",
    "sky",
  );
  splitCompare(
    "exercise",
    "Movement effect",
    "exercise",
    20,
    "20min+ exercise",
    "Little or no exercise",
    "Days with at least 20 minutes of exercise have coincided with higher mood scores.",
    "sage",
  );
  splitCompare(
    "screen",
    "Screen load",
    "screenTime",
    5,
    "5h+ screen time",
    "Under 5h screen time",
    "Heavier screen days have coincided with a different mood level than lighter ones.",
    "amber",
  );

  // Best / worst weekday
  if (days.length >= 14) {
    const byWd = new Map<number, number[]>();
    for (const d of days) {
      const wd = new Date(`${d.date}T12:00:00`).getDay();
      byWd.set(wd, [...(byWd.get(wd) ?? []), d.mood]);
    }
    const ranked = [...byWd.entries()]
      .filter(([, v]) => v.length >= 2)
      .map(([wd, v]) => ({ wd, m: mean(v), n: v.length }))
      .sort((a, b) => b.m - a.m);
    if (ranked.length >= 3) {
      const best = ranked[0]!;
      const worst = ranked[ranked.length - 1]!;
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      push({
        id: "weekday",
        title: "Weekday rhythm",
        statement: `${names[best.wd]!}s have been your strongest day and ${names[worst.wd]!}s your weakest in this period.`,
        n: days.length,
        evidence: evidenceFor(days.length, Math.min(0.8, Math.abs(best.m - worst.m) / 2)),
        metrics: [
          { label: names[best.wd]!, value: round(best.m, 1).toFixed(1) },
          { label: names[worst.wd]!, value: round(worst.m, 1).toFixed(1) },
        ],
        delta: `+${round(best.m - worst.m, 1).toFixed(1)}`,
        accent: "violet",
      });
    }
  }

  // Stress clustering
  const highStress = days.filter((d) => d.stress >= 7);
  if (highStress.length >= 3) {
    push({
      id: "stress",
      title: "Stress clustering",
      statement: `${highStress.length} days in this period recorded stress at 7 or above; average mood on those days was lower than your baseline.`,
      n: days.length,
      evidence: evidenceFor(days.length, 0.4),
      metrics: [
        { label: "High-stress days", value: `${highStress.length}` },
        { label: "Avg mood then", value: round(mean(highStress.map((d) => d.mood)), 1).toFixed(1) },
      ],
      accent: "rose",
    });
  }

  // Stability streak
  const vol = calculateVolatility(days);
  if (days.length >= 10 && vol.avgDelta <= 0.6) {
    push({
      id: "stable",
      title: "Unusually stable period",
      statement: "Your day-to-day mood variation in this period is smaller than a typical stretch of your history.",
      n: days.length,
      evidence: "moderate",
      metrics: [
        { label: "Avg daily change", value: vol.avgDelta.toFixed(2) },
        { label: "Largest swing", value: vol.largest.toFixed(1) },
      ],
      accent: "sage",
    });
  }

  return out;
}

export function detectAnomalies(days: DayAggregate[]): Anomaly[] {
  if (days.length < 8) return [];
  const moods = days.map((d) => d.mood);
  const baseline = round(mean(moods), 2);
  const sd = stdDev(moods) || 1;
  return days
    .map((d) => {
      const z = (d.mood - baseline) / sd;
      if (Math.abs(z) < 1.6) return null;
      const context: { label: string; value: string }[] = [];
      if (typeof d.sleep === "number") context.push({ label: "Sleep", value: `${d.sleep.toFixed(1)}h` });
      if (typeof d.exercise === "number") context.push({ label: "Exercise", value: `${Math.round(d.exercise)} min` });
      if (typeof d.screenTime === "number") context.push({ label: "Screen", value: `${d.screenTime.toFixed(1)}h` });
      context.push({ label: "Stress", value: d.stress.toFixed(1) });
      context.push({ label: "Energy", value: d.energy.toFixed(1) });
      return {
        date: d.date,
        mood: d.mood,
        baseline,
        deviation: round(d.mood - baseline, 2),
        kind: z > 0 ? "high" : "low",
        context,
      } satisfies Anomaly;
    })
    .filter((a): a is Anomaly => a !== null)
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, 6);
}

export function generateInsights(
  days: DayAggregate[],
  prevDays: DayAggregate[],
  entries: MoodEntry[],
  rangeDays: number,
): Insight[] {
  const out: Insight[] = [];
  if (days.length < 2) return out;

  const avg = mean(days.map((d) => d.mood));
  if (prevDays.length >= 2) {
    const prevAvg = mean(prevDays.map((d) => d.mood));
    const pct = round(((avg - prevAvg) / (prevAvg || 1)) * 100, 1);
    if (Math.abs(pct) >= 1)
      out.push({
        id: "trend",
        kind: "trend",
        text: `Your average mood ${pct >= 0 ? "increased" : "decreased"} by ${Math.abs(pct).toFixed(1)}% compared with the previous period.`,
      });
  }

  const consistency = Math.round((days.length / Math.max(1, rangeDays)) * 100);
  out.push({
    id: "consistency",
    kind: "consistency",
    text: `You logged moods on ${consistency}% of days in this period (${days.length} of ${rangeDays}).`,
  });

  const emo = calculateEmotionDistribution(entries)[0];
  if (emo)
    out.push({
      id: "emotion",
      kind: "emotion",
      text: `Your most frequent emotional state was ${emo.label}, present in ${emo.share.toFixed(0)}% of entries.`,
    });

  const corr = calculateCorrelations(days).find((c) => c.evidence !== "insufficient");
  if (corr)
    out.push({
      id: "corr",
      kind: "correlation",
      text: `Your strongest recurring relationship is between ${corr.label.toLowerCase()} and mood (r = ${corr.r.toFixed(2)}, ${corr.n} observations).`,
    });

  const heat = buildHeatmap(entries).filter((c) => c.count >= 2 && c.mood !== null);
  if (heat.length >= 4) {
    const best = [...heat].sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0))[0]!;
    const worst = [...heat].sort((a, b) => (a.mood ?? 0) - (b.mood ?? 0))[0]!;
    const bandLabel = (k: string) => TIME_BANDS.find((b) => b.key === k);
    out.push({
      id: "timing",
      kind: "timing",
      text: `Your strongest mood window is ${bandLabel(best.band)?.label.toLowerCase()} (${bandLabel(best.band)?.range}), and your lowest is ${bandLabel(worst.band)?.label.toLowerCase()} (${bandLabel(worst.band)?.range}).`,
    });
  }

  const vol = calculateVolatility(days);
  const prevVol = calculateVolatility(prevDays);
  if (vol.stability !== null && prevVol.stability !== null)
    out.push({
      id: "stability",
      kind: "stability",
      text: `Your mood has become ${vol.stability >= prevVol.stability ? "more" : "less"} stable than the previous period (${vol.stability}% vs ${prevVol.stability}%).`,
    });

  return out;
}

/** Sample-size gating so the UI never overstates reliability. */
export function depthTier(entryCount: number) {
  const tiers = [
    { min: 0, key: "empty", label: "No data" },
    { min: 1, key: "basic", label: "Basic statistics" },
    { min: 5, key: "trends", label: "Basic trends" },
    { min: 14, key: "patterns", label: "Time patterns" },
    { min: 30, key: "compare", label: "Period comparisons" },
    { min: 50, key: "correlations", label: "Correlation insights" },
    { min: 100, key: "deep", label: "Deep pattern analysis" },
  ] as const;
  const current = [...tiers].reverse().find((t) => entryCount >= t.min)!;
  const next = tiers.find((t) => t.min > entryCount);
  return { current, next, tiers };
}

export function currentStreak(days: DayAggregate[]): number {
  if (!days.length) return 0;
  const set = new Set(days.map((d) => d.date));
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to start today or yesterday.
  if (!set.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const k = cursor.toISOString().slice(0, 10);
    if (!set.has(k)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function moodLabel(mood: number) {
  if (mood >= 9) return "Radiant";
  if (mood >= 8) return "Elevated";
  if (mood >= 7) return "Steady";
  if (mood >= 6) return "Level";
  if (mood >= 5) return "Muted";
  if (mood >= 4) return "Heavy";
  return "Low";
}

export { round, mean };
