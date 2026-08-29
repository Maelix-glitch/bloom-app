/**
 * Bloom — the Cycle assistant's mind. A deterministic, on-device engine
 * over your real Cycle context: it explains, compares, and summarizes —
 * it never invents, never diagnoses, and answers "not enough data yet"
 * when that's the truth. Provider-shaped so a real language-model adapter
 * can replace it later without touching the UI.
 */

import type { CycleContext } from "./types";
import { daysAwayLabel, fmtShort } from "./engine";

export type AssistantProvider = (
  context: CycleContext,
  question: string,
  signal: { aborted: boolean },
) => Promise<string>;

export interface QuickPrompt {
  id: string;
  label: string;
  question: string;
  available: (ctx: CycleContext) => boolean;
}

const n = (x: number | null, unit = "days") =>
  x === null ? "—" : `${Math.round(x * 10) / 10} ${unit}`;

export function quickPromptsFor(ctx: CycleContext): QuickPrompt[] {
  return QUICK_PROMPTS.filter((p) => p.available(ctx));
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "noticed",
    label: "What is Bloom noticing?",
    question: "What is Bloom noticing about my cycles?",
    available: (c) => c.loggedDays30 > 0 || c.completedCount >= 1,
  },
  {
    id: "datewhy",
    label: "Why is this date estimated?",
    question: "Why is this date estimated and not logged?",
    available: (c) => c.currentDay !== null || c.completedCount >= 1,
  },
  {
    id: "pattern",
    label: "Show me my recent pattern.",
    question: "Show me my recent pattern across cycles.",
    available: (c) => c.completedCount >= 2,
  },
  {
    id: "changed",
    label: "What changed this cycle?",
    question: "What's different or changed this cycle?",
    available: (c) => c.currentDay !== null,
  },
  {
    id: "logtoday",
    label: "What should I log today?",
    question: "What should I log today?",
    available: () => true,
  },
  {
    id: "learning",
    label: "What do you need from me before predictions become personal?",
    question: "What do you need from me before your predictions become personal?",
    available: (c) => c.completedCount < 2,
  },
];

/* ------------------------------ deterministic ------------------------------ */

function describePhase(ctx: CycleContext): string {
  const day = ctx.currentDay;
  const conf = ctx.confidence;
  if (day === null) {
    return "There's no cycle running yet — once you log a period start, I can place each day into a phase and keep estimates honest.";
  }
  const basis =
    conf === "assumed"
      ? "The phase split right now comes from a general 28-day pattern, not from you yet — treat it as a placeholder."
      : conf === "early"
        ? "One completed cycle sits behind this. Real, but early — more logs sharpen it."
        : `This is built from your last ${Math.min(6, ctx.completedCount)} completed cycles.`;
  const bleeding =
    ctx.bleedingState === "unlogged"
      ? "bleeding not logged"
      : ctx.bleedingState === "none"
        ? "explicit no-flow logged"
        : `${ctx.bleedingState} bleeding logged`;
  const reproductive = ctx.reproductivePhase
    ? `${ctx.reproductivePhase} reproductive phase (${ctx.reproductiveProvenance.status})`
    : "reproductive phase unknown";
  const phaseText =
    ctx.currentPhase === "menstrual"
      ? "Logged bleeding can overlap the follicular phase; Bloom does not treat follicular as proof your period ended."
      : ctx.currentPhase === null
        ? "Bloom keeps the bleeding layer unknown when a day is not logged. The reproductive layer can still be an estimate from the cycle-day anchor."
        : "This reproductive phase is estimated from the cycle model unless there is logged ovulation evidence; bleeding is tracked as a separate layer.";
  return `Cycle day ${day} — ${bleeding}; ${reproductive}.\n${phaseText}\n\nWhy Bloom says this: ${ctx.currentProvenance.reason}\n\n${basis}`;
}

function whyEstimateMoved(ctx: CycleContext): string {
  const correction = ctx.recentCorrections[0];
  if (correction?.forecastChanged) {
    return `${correction.message}\n\nPrevious estimate for ${correction.date}: ${correction.previousEstimate?.phase ?? "unknown"}. Current user-entered records are more authoritative than estimates, so the cycle engine recalculated future dates from the updated record. I can explain it, but I cannot override it.`;
  }
  if (ctx.completedCount === 0) {
    return "Nothing moved — there isn't a personal estimate yet. Right now the page shows a general 28-day pattern, clearly labelled as such. Log two period starts and the estimate becomes yours.";
  }
  const lens = ctx.recentLengths;
  if (lens.length < 2) {
    return `With one completed cycle (${lens[0]} days), the estimate simply equals that length. When a second cycle is logged, I average them — that's usually where the date first moves.`;
  }
  const avg = ctx.average ?? 0;
  const last = lens[lens.length - 1] ?? 0;
  const delta = last - avg;
  return `Your estimate follows your average — currently ${avg.toFixed(1)} days across your last ${lens.length} cycles. The most recent ran ${last} days (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs average), which nudges the projection by roughly that much. New logs update it; nothing else does.`;
}

function compareCycles(ctx: CycleContext): string {
  const lens = ctx.recentLengths;
  if (lens.length < 2)
    return "Not enough data yet — comparison needs at least two completed cycles.";
  const lines = lens.map((l, i) => `cycle ${i + 1}: ${l} days`).join("\n");
  return `Your recent lengths:\n${lines}\n\nAverage ${n(ctx.average)}, median ${n(ctx.median)}${ctx.rangeMin !== null ? `, range ${ctx.rangeMin}–${ctx.rangeMax} days` : ""}.\n${ctx.variabilityPercent !== null ? `Spread is about ${ctx.variabilityPercent}% — ${ctx.variabilityPercent <= 8 ? "fairly steady territory" : "wide enough that I'll show ranges instead of single dates"}.` : ""}`;
}

function periodLengthAnswer(ctx: CycleContext): string {
  const loggedBleeding = ctx.observedPeriodDays.length;
  const noFlow = ctx.explicitNoFlowDays.length;
  if (loggedBleeding === 0) return "I don't have a logged bleeding day in the recent record yet.";
  if (ctx.periodLengthAverage === null) {
    const open =
      ctx.currentPeriodEpisode?.status === "open"
        ? ` Your current period started ${ctx.currentPeriodEpisode.start} and is still open, with ${ctx.currentPeriodEpisode.observedBleedingDays} bleeding day${ctx.currentPeriodEpisode.observedBleedingDays === 1 ? "" : "s"} logged.`
        : "";
    return `Bloom has ${loggedBleeding} recent period day${loggedBleeding === 1 ? "" : "s"} logged by you. I don't know the full period length yet because missing days are not treated as no bleeding.${open}${noFlow > 0 ? ` You also logged ${noFlow} no-bleeding day${noFlow === 1 ? "" : "s"}, which helps show the transition.` : ""}`;
  }
  return `Your period-length estimate is ${n(ctx.periodLengthAverage)} from logged period runs. Missing days are kept separate from no-bleeding days.`;
}

function whatChanged(ctx: CycleContext): string {
  const parts: string[] = [];
  if (ctx.recentLengths.length >= 2) {
    const last = ctx.recentLengths[ctx.recentLengths.length - 1] ?? 0;
    const prev = ctx.recentLengths[ctx.recentLengths.length - 2] ?? last;
    if (last !== prev) parts.push(`Length: ${last} days vs ${prev} before that.`);
  }
  parts.push(
    `Logging: ${ctx.loggedDays30} day${ctx.loggedDays30 === 1 ? "" : "s"} noted in the last 30.`,
  );
  if (ctx.recentSymptoms.length > 0)
    parts.push(
      `Symptom notes on ${ctx.recentSymptoms.length} recent day${ctx.recentSymptoms.length === 1 ? "" : "s"}.`,
    );
  if (ctx.observedEvidence.lhPositiveDates.length > 0) {
    const ovu = ctx.events.find((e) => e.id === "ovulation");
    const adjusted = ovu?.provenance?.source === "confirmed";
    parts.push(
      `You logged ${ctx.observedEvidence.lhPositiveDates.length} positive LH test${ctx.observedEvidence.lhPositiveDates.length === 1 ? "" : "s"} this cycle${adjusted ? " — Bloom moved the ovulation estimate to match it" : ""}.`,
    );
  }
  return (
    parts.join("\n") || "Nothing measurable has changed yet — there aren't enough logs to compare."
  );
}

function attention(ctx: CycleContext): string {
  if (ctx.events.length === 0)
    return "No dates to watch yet — everything here needs at least one logged period start.";
  const upcoming = ctx.events.filter((e) => e.daysAway >= 0).slice(0, 3);
  if (upcoming.length === 0)
    return "Nothing on the near horizon — the next dates land after your current cycle's estimates refresh. Log a period day and the calendar lights up again.";
  const lines = upcoming.map(
    (e) =>
      `${e.label} — ${e.date ? fmtShort(e.date) : `${fmtShort(e.rangeStart ?? ctx.today)}–${fmtShort(e.rangeEnd ?? ctx.today)}`} (${daysAwayLabel(e.daysAway)})${e.plusMinusDays ? ` · ±${e.plusMinusDays}d` : ""}`,
  );
  const pain =
    ctx.highPainDays30 >= 2
      ? `\n\nOne quiet note: ${ctx.highPainDays30} recent days carried high pain ratings. If that's new for you, it's reasonable to mention it to a clinician — not an alarm, just information worth sharing with someone qualified.`
      : "";
  return `Worth knowing:\n${lines.join("\n")}\n\nThese are estimates for planning, not verdicts.${pain}`;
}

function whatToLog(ctx: CycleContext): string {
  if (ctx.completedCount === 0)
    return "The single most useful entry: the day bleeding starts (any flow counts — Quick Log, one tap). After two of those, every number on this page becomes personal.";
  if (ctx.loggedDays30 < 5)
    return "One line today would help: flow (if any), energy 1–5, and a symptom chip or two if something stands out. Sparse logs beat perfect streaks you abandon.";
  if (ctx.currentPhase === "menstrual")
    return "Flow intensity and pain (0–5) for the record. Notes optional, but 'day 2 was rough' is the kind of thing future-you thanks you for.";
  if (ctx.currentPhase === "luteal")
    return "Mood and energy — that's where the luteal half shows, and where the page can start noticing your patterns instead of textbook ones.";
  return "Whatever actually stands out — a temperature or an LH test if you track those, otherwise energy + one honest sentence is plenty.";
}

function prepare(ctx: CycleContext): string {
  const near = ctx.events.filter((e) => e.daysAway >= 0 && e.daysAway <= 10).slice(0, 3);
  if (near.length === 0)
    return "Nothing lands in the next ten days — an uneventful stretch is worth keeping too: energy logs here are the quiet baseline future estimates lean on.";
  const parts: string[] = ["Looking at what's near:"];
  for (const e of near) {
    const when = e.date
      ? fmtShort(e.date)
      : `${fmtShort(e.rangeStart ?? ctx.today)}–${fmtShort(e.rangeEnd ?? ctx.today)}`;
    if (e.id === "next-period")
      parts.push(
        `· Next period ${when} — the practical prep is comfort + buffer: easy nights, laundry reality, an early Sunday.`,
      );
    else if (e.id === "fertile-window")
      parts.push(
        `· Fertile window ${when} — calendar estimate for awareness only; it doesn't promise or prevent anything.`,
      );
    else if (e.id === "ovulation")
      parts.push(
        `· Estimated ovulation ${when} — if you track tests or temperature, this is the stretch where they'd say the most.`,
      );
    else if (e.id === "pms-window") itemsNote(parts, e);
    else parts.push(`· ${e.label} — ${when}.`);
  }
  parts.push("\nThat's it — planning-shaped advice, not a to-do list.");
  return parts.join("\n");
}

function itemsNote(parts: string[], e: { label: string; daysAway: number }): void {
  parts.push(
    `· ${e.label} ${e.daysAway === 0 ? "starts today" : `in ${e.daysAway} day${e.daysAway === 1 ? "" : "s"}`} — the kind of window where lowering the bar for chores is strategy, not laziness.`,
  );
}

function patternMethod(ctx: CycleContext): string {
  return `A pattern card appears when something you logged recurs across at least two cycles — it's pure counting over your own entries, grouped by the cycle-day your logs define.\n\nThe card states observations ("seen in ${Math.max(2, 3)} of your ${Math.max(ctx.completedCount + 1, 3)} logged cycles") with sample sizes; the gentle-read line is the only interpretation, and it stays descriptive on purpose — cycles don't owe causes.\n\n${ctx.confidence === "assumed" ? "You're early: patterns here will stay sparse until a few cycles are in — that's the engine being honest, not you failing to log." : "Your data is rich enough that the counts are real — one unusual cycle will not flip a pattern by itself."}`;
}

function patterns(ctx: CycleContext): string {
  if (ctx.recentSymptoms.length < 3)
    return "Not enough data yet to call anything a pattern — I don't read trends from one-off logs.";
  const counts = new Map<string, number>();
  for (const day of ctx.recentSymptoms)
    for (const s of day.symptoms) counts.set(s, (counts.get(s) ?? 0) + 1);
  const repeated = [...counts.entries()]
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (repeated.length === 0)
    return `You've logged symptoms on ${ctx.recentSymptoms.length} recent days — real data, but nothing repeating enough to call a pattern yet. Patterns here mean recurrence across at least two cycles, not one busy week.`;
  const lines = repeated.map(([s, c]) => `· ${s}: ${c} logged days recently`);
  return `From your own logs (last 30 days, ${ctx.recentSymptoms.length} entries):\n${lines.join("\n")}\n\nThat's frequency, not causation — I won't claim a phase 'causes' anything.`;
}

export function genericAnswer(question: string): string {
  const q = question.toLowerCase();
  const topic = /pattern/.test(q)
    ? "patterns are just counts of what recurred across your own logged cycles — sample-gated, never interpreted as cause"
    : /prepare|attention|upcoming/.test(q)
      ? "planning hints come from the estimated windows the page already shows — soft by design"
      : /log|track/.test(q)
        ? "the most useful log is a period start day; two of them turn every estimate on this page personal"
        : "everything here is computed from your logs on this device — no network, no storage of the conversation";
  return `You've turned my cycle context off, so I'll stay general: ${topic}.\n\nFlip "Use my logs" back on whenever you want answers that quote your actual numbers.`;
}

export const deterministicProvider: AssistantProvider = async (ctx, question) => {
  const q = question.toLowerCase();
  if (/how long.*period|period.*last/.test(q)) return periodLengthAnswer(ctx);
  if (/phase|where am i|current|am i follicular/.test(q)) return describePhase(ctx);
  if (/estimate|moved|changed.*(date|predict)|why.*(change|shift)/.test(q))
    return whyEstimateMoved(ctx);
  if (/compar|vs|versus|recent cycles/.test(q)) return compareCycles(ctx);
  if (/what.*(different|changed) this cycle|this cycle/.test(q)) return whatChanged(ctx);
  if (/attention|upcoming|coming up|watch/.test(q)) return attention(ctx);
  if (/prepare|prep|next few days/.test(q)) return prepare(ctx);
  if (/why.*(pattern|seeing this)|how do you know|how do estimates|uncertainty/.test(q))
    return patternMethod(ctx);
  if (/why is (this|that) date|this date (is )?estimated|not logged/.test(q))
    return `A date is "logged" when you recorded something on it — flow, mood, energy, anything. Missing flow stays unlogged, explicit no-flow only appears when you record no flow, and reproductive phase is a separate estimated layer. Everything else on this page is derived: phase positions come from your period-start dates and your average length, so future dates (and past days you skipped) are shown softer, dashed or hollow, on purpose.${
      ctx.completedCount < 2
        ? " Right now the derivation leans on the general pattern too — two completed cycles and it leans on you."
        : ` With ${ctx.completedCount} completed cycles behind it, the derivation is already yours, but it remains an estimate — a range, not a promise.`
    }`;
  if (/noticed|what have you seen|what is bloom noticing/.test(q))
    return ctx.completedCount >= 2
      ? compareCycles(ctx)
      : `Not much yet — and that's the honest answer. I have ${ctx.loggedDays30} logged day${ctx.loggedDays30 === 1 ? "" : "s"} and ${ctx.completedCount} completed cycle${ctx.completedCount === 1 ? "" : "s"} to look across; patterns only get said out loud when a few cycles keep repeating them. Anything else would be invention, and you didn't come here for that.`;
  if (/energy/.test(q) && /pattern|understand|why|low|high/.test(q)) {
    const es = ctx.recentEnergy;
    if (es.length === 0)
      return `You haven't logged energy on any recent day yet — one tap on the "energy" row of the Today tray and this becomes a real question I can answer with your numbers.`;
    const avg = es.reduce((a, b) => a + b.energy, 0) / es.length;
    const lows = es.filter((e) => e.energy <= 2).length;
    return `Across your last ${es.length} logged energy marks you averaged ${avg.toFixed(1)} of 5${lows > 0 ? `, with ${lows} low day${lows === 1 ? "" : "s"} (1–2) in that window` : " — no 1–2 days in it"}. That's a description of your logs, not a verdict about your body; the patterns section is where phase-by-phase repeats show up with their sample sizes.`;
  }
  if (/what do you need|become personal|before your predictions/.test(q))
    return ctx.completedCount >= 2
      ? `You're already past the general stage — ${ctx.completedCount} completed cycles mean estimates ride on your own averages and spread. Keep logging period starts (and energy or symptoms if you like); ranges tighten honestly from here, with nothing invented.`
      : `Two completed cycles, at minimum — that means the first day of your next period after this one. With that, estimates stop leaning on the general 28-day pattern and start following your own average and variability. Everything logged in between (flow, mood, energy) feeds patterns, not predictions — no field is required.`;
  if (/log|track|record|today/.test(q) && !/pattern/.test(q)) return whatToLog(ctx);
  if (/pattern|symptom|recurr/.test(q)) return patterns(ctx);
  if (/accur|confiden|sure/.test(q))
    return `I never print an accuracy number — without validated ground truth, a percentage would be decoration. What I can tell you honestly: ${ctx.confidence === "strong" ? `your ${ctx.completedCount}-cycle history puts estimates on solid personal ground` : "more cycles logged mean narrower ranges, that's it"}.`;
  return `I answer from your logged Cycle data — phase, estimates and why they move, cycle comparisons, patterns in your logs, and what's worth logging. Ask something along those lines and I'll answer straight.${"\n\n(Anything outside that: the Cycle page itself is built to show you the numbers — I'm here to explain them.)"}`;
};
