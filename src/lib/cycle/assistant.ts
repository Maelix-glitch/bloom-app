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
    id: "phase",
    label: "Explain my current phase",
    question: "What does my current phase mean — and how sure are we?",
    available: (c) => c.currentDay !== null,
  },
  {
    id: "estimate",
    label: "Why did my estimate change?",
    question: "Why did my next-period estimate move?",
    available: (c) => c.completedCount >= 1,
  },
  {
    id: "compare",
    label: "Compare my recent cycles",
    question: "Compare my recent cycles with my average.",
    available: (c) => c.completedCount >= 2,
  },
  {
    id: "changed",
    label: "What changed this cycle?",
    question: "What's different about this cycle compared with my usual?",
    available: (c) => c.completedCount >= 1,
  },
  {
    id: "attention",
    label: "What should I pay attention to today?",
    question: "What's coming up that's worth knowing about?",
    available: () => true,
  },
  {
    id: "prepare",
    label: "Help me prepare for the next few days",
    question: "Help me prepare for the next few days.",
    available: (c) => c.events.some((e) => e.daysAway >= 0 && e.daysAway <= 10),
  },
  {
    id: "whypattern",
    label: "Why am I seeing this pattern?",
    question: "Why am I seeing this pattern — how do you know?",
    available: (c) => c.loggedDays30 >= 4,
  },
  {
    id: "log",
    label: "What should I log today?",
    question: "What's worth logging today without making this a chore?",
    available: () => true,
  },
  {
    id: "patterns",
    label: "Show me patterns in my logs",
    question: "Do any symptoms or moods show a pattern across my cycles?",
    available: (c) => c.loggedDays30 >= 4,
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
  const phaseText =
    ctx.currentPhase === "menstrual"
      ? "You're inside the bleeding window — energy dips are common here, and so is feeling fine. Neither means anything is wrong."
      : ctx.currentPhase === "follicular"
        ? "Follicular stretch — the estrogen-rising half of the cycle. A good slot for demanding tasks if that matches how you feel."
        : ctx.currentPhase === "ovulation"
          ? "Around the estimated ovulation window. It's an estimate unless a test or a sustained temperature shift says otherwise."
          : "Luteal phase — the second half. Some people notice energy or mood settling here; plenty feel nothing in particular.";
  return `Cycle day ${day} — ${ctx.currentPhase ?? "phase not assigned"}.\n${phaseText}\n\n${basis}`;
}

function whyEstimateMoved(ctx: CycleContext): string {
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
  if (ctx.observedEvidence.lhPositiveDates.length > 0)
    parts.push(
      `You logged ${ctx.observedEvidence.lhPositiveDates.length} positive LH test${ctx.observedEvidence.lhPositiveDates.length === 1 ? "" : "s"} this cycle — observed data, kept separate from the calendar estimate.`,
    );
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
  if (/phase|where am i|current/.test(q)) return describePhase(ctx);
  if (/estimate|moved|changed.*(date|predict)|why.*(change|shift)/.test(q))
    return whyEstimateMoved(ctx);
  if (/compar|vs|versus|recent cycles/.test(q)) return compareCycles(ctx);
  if (/what.*(different|changed) this cycle|this cycle/.test(q)) return whatChanged(ctx);
  if (/attention|upcoming|coming up|watch/.test(q)) return attention(ctx);
  if (/prepare|prep|next few days/.test(q)) return prepare(ctx);
  if (/why.*(pattern|seeing this)|how do you know/.test(q)) return patternMethod(ctx);
  if (/log|track|record|today/.test(q) && !/pattern/.test(q)) return whatToLog(ctx);
  if (/pattern|symptom|recurr/.test(q)) return patterns(ctx);
  if (/accur|confiden|sure/.test(q))
    return `I never print an accuracy number — without validated ground truth, a percentage would be decoration. What I can tell you honestly: ${ctx.confidence === "strong" ? `your ${ctx.completedCount}-cycle history puts estimates on solid personal ground` : "more cycles logged mean narrower ranges, that's it"}.`;
  return `I answer from your logged Cycle data — phase, estimates and why they move, cycle comparisons, patterns in your logs, and what's worth logging. Ask something along those lines and I'll answer straight.${"\n\n(Anything outside that: the Cycle page itself is built to show you the numbers — I'm here to explain them.)"}`;
};
