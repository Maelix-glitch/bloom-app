/**
 * Bloom Coach — the responder.
 *
 * Deterministic and grounded: it reads the person's own record — mood
 * check-ins, cycle entries, the six trackers, habits, pinned memories — and
 * answers from what's actually there. It never invents a number, never
 * diagnoses, and never hands out a rule it can't back with their data.
 *
 * When a topic has nothing behind it, it says so plainly and names the one log
 * that would change that, instead of repeating a friendly shrug.
 *
 * Pure: no React, no storage, no network. The hook builds `CoachRecord` and
 * hands it in.
 */

import type { CoachContext, CoachMode } from "@/lib/coach/intelligence";
import type { TrackerId } from "@/lib/trackers/core";

export type CoachBlock =
  | {
      type: "metric";
      label: string;
      value: string;
      detail?: string;
      series: number[];
      accent?: "violet" | "sky" | "amber" | "sage" | "rose";
    }
  | {
      type: "plan";
      title: string;
      detail?: string;
      steps: { label: string; time?: string }[];
    }
  | {
      type: "proposal";
      title: string;
      detail?: string;
      changes?: { label: string; from: string; to: string }[];
    };

export interface CoachResponse {
  paragraphs: string[];
  sources: string[];
  blocks: CoachBlock[];
}

/** One tracker, as the responder needs to see it. */
export interface TrackerFacts {
  id: TrackerId;
  name: string;
  /** Today's value in the tracker's own unit. */
  today: number | null;
  goal: number;
  avg7: number | null;
  streak: number;
  daysLogged: number;
  /** Last fourteen values, nulls where nothing was logged. */
  series: (number | null)[];
  /** Formats a value the way the trackers page does. */
  format: (value: number) => string;
}

export interface CycleFacts {
  daysLogged: number;
  cycleDay: number | null;
  phaseLabel: string | null;
  nextStart: string | null;
  daysUntilNext: number | null;
  averageLength: number | null;
  confidence: string | null;
  confidenceReason: string | null;
}

export interface CoachRecord {
  today: string;
  trackers: TrackerFacts[];
  cycle: CycleFacts | null;
  /** Pinned or recent things the coach was told to keep in view. */
  memories: string[];
  habitsActive: number;
}

export interface CoachQuestion {
  text: string;
  mode: CoachMode;
}

const fmt = (value: number | null, digits = 1): string => {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
};

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/* --------------------------------- topics --------------------------------- */

export type Topic =
  | "sleep"
  | "water"
  | "study"
  | "movement"
  | "energy"
  | "screen"
  | "period"
  | "mood"
  | "stress"
  | "habit"
  | "greeting"
  | "general";

const TOPIC_WORDS: [Topic, RegExp][] = [
  ["period", /\bperiod|cramp|bleed|pms|ovulat|cycle|flow|spotting\b/],
  ["sleep", /\bsleep|slept|bed|awake|insomnia|nap|night'?s? rest|rest\b/],
  ["water", /\bwater|hydrat|drink|glasses?\b/],
  ["study", /\bstudy|studied|revision|homework|exam|read(ing)?|focus|concentrat/],
  ["movement", /\bmove(ment)?|walk|exercise|run|gym|steps|stretch|yoga\b/],
  ["screen", /\bscreen|phone|scroll(ing)?|doom|tiktok|instagram|laptop|tv\b/],
  ["energy", /\benergy|tired|exhaust|fatigue|drained|weary\b/],
  ["stress", /\bstress|anxious|anxiety|overwhelm|tense|panic|worry|worried\b/],
  ["mood", /\bmood|feel(ing)?|felt|sad|down|flat|low|happy|irritable|low mood\b/],
  ["habit", /\bhabit|routine|streak|consisten|discipline\b/],
  ["greeting", /^\s*(hi|hey|hello|yo|good (morning|evening|afternoon))\b/],
];

/** What the person is actually asking about. Explicit mode wins over wording. */
export function detectTopic(text: string, mode: CoachMode): Topic {
  const asked = text.trim().toLowerCase();
  if (asked.length === 0) return mode === "plan" ? "habit" : "general";
  if (mode === "plan") {
    // planning still answers the thing they named
    for (const [topic, pattern] of TOPIC_WORDS) {
      if (topic !== "habit" && pattern.test(asked)) return topic;
    }
    return "habit";
  }
  for (const [topic, pattern] of TOPIC_WORDS) {
    if (pattern.test(asked)) return topic;
  }
  return mode === "reflect" ? "mood" : "general";
}

/* --------------------------------- answers -------------------------------- */

const NOT_LOGGED: Record<string, string> = {
  sleep:
    "You haven't logged a night yet. On the Trackers page, put in last night's bedtime and wake time — that's one field each, and tomorrow I can tell you something real about your week.",
  water:
    "No water logged yet. The Trackers page has +250ml and +500ml taps — use them as you drink and I'll read the day back to you.",
  study:
    "No study sessions logged yet. Add one with its minutes and a subject on the Trackers page and the heatmap starts drawing itself.",
  movement:
    "Nothing logged for movement yet. Even ten minutes counts — log it on the Trackers page and it becomes data instead of a feeling.",
  energy:
    "No energy readings yet. It's one tap from 1 to 5 on the Trackers page, and it's the number that makes the other five make sense.",
  screen:
    "No screen time logged yet. Add roughly how long today was on the Trackers page and I can compare it with your sleep and energy.",
};

/** A tracker answer: what happened, against the target, with the count behind it. */
function trackerAnswer(topic: Topic, record: CoachRecord): CoachResponse | null {
  const id = topic as TrackerId;
  const stat = record.trackers.find((t) => t.id === id);
  if (!stat) return null;
  const paragraphs: string[] = [];
  const sources: string[] = [];
  const blocks: CoachBlock[] = [];

  if (stat.daysLogged === 0) {
    paragraphs.push(NOT_LOGGED[id] ?? "Nothing logged for that yet.");
    return { paragraphs, sources, blocks };
  }

  const values = stat.series.filter((v): v is number => v !== null);
  const logged = values.length;
  const shown = Math.min(logged, 7);
  const last7 = values.slice(-Math.min(values.length, 7));
  /* The trackers page's own seven-day figure when it has one, so the two
     pages never quote different numbers for the same week. */
  const avg7 =
    stat.avg7 ??
    (last7.length ? last7.reduce((sum, v) => sum + v, 0) / last7.length : null);
  const direction =
    last7.length >= 4
      ? (() => {
          const half = Math.floor(last7.length / 2);
          const first = last7.slice(0, half);
          const second = last7.slice(half);
          const a = first.reduce((s, v) => s + v, 0) / Math.max(first.length, 1);
          const b = second.reduce((s, v) => s + v, 0) / Math.max(second.length, 1);
          const delta = b - a;
          if (Math.abs(delta) < Math.abs(a) * 0.05) return "flat" as const;
          return delta > 0 ? "up" as const : "down" as const;
        })()
      : ("unknown" as const);

  const isCeiling = id === "screen";
  const meetsTarget = isCeiling
    ? avg7 !== null && avg7 <= stat.goal
    : avg7 !== null && avg7 >= stat.goal;

  const opening =
    id === "sleep"
      ? `You've logged ${plural(stat.daysLogged, "night")}. The last ${plural(shown, "night")} average ${stat.format(Math.round(avg7 ?? 0))}, against your ${stat.format(stat.goal)} target.`
      : id === "water"
        ? `${plural(stat.daysLogged, "day")} of water logged. The last ${plural(shown, "day")} average ${stat.format(Math.round(avg7 ?? 0))} of your ${stat.format(stat.goal)} target.`
        : id === "study"
          ? `${plural(stat.daysLogged, "day")} with study on them. The last ${plural(shown, "day")} average ${stat.format(Math.round(avg7 ?? 0))}.`
          : id === "movement"
            ? `${plural(stat.daysLogged, "day")} logged movement. The last ${plural(shown, "day")} average ${stat.format(Math.round(avg7 ?? 0))} against ${stat.format(stat.goal)}.`
            : id === "screen"
              ? `${plural(stat.daysLogged, "day")} of screen time logged. The last ${plural(shown, "day")} average ${stat.format(Math.round(avg7 ?? 0))}, against your ${stat.format(stat.goal)} ceiling.`
              : `${plural(stat.daysLogged, "day")} with an energy reading. The last ${plural(shown, "day")} average ${fmt(avg7)} of 5.`;

  paragraphs.push(opening);

  if (direction === "up" || direction === "down") {
    const word = isCeiling
      ? direction === "up"
        ? "climbing"
        : "coming down"
      : direction === "up"
        ? "rising"
        : "easing off";
    paragraphs.push(
      `Across those ${plural(shown, "day")} the line is ${word}. ${stat.streak >= 3 ? `You're ${plural(stat.streak, "day")} into a run of hitting the target.` : ""}`.trim(),
    );
  } else if (logged >= 3) {
    paragraphs.push(
      meetsTarget
        ? `That's inside your target on average — steady rather than dramatic, which is usually what holds.`
        : `That sits ${isCeiling ? "over" : "under"} your target on average. Not a verdict — just where the numbers are.`,
    );
  }

  if (stat.today === null) {
    paragraphs.push(
      `Today hasn't been logged yet — the ${stat.name.toLowerCase()} row is still empty on the Trackers page.`,
    );
  } else {
    paragraphs.push(
      isCeiling
        ? `Today reads ${stat.format(Math.round(stat.today))}.`
        : `Today so far: ${stat.format(Math.round(stat.today))}${
            meetsTarget ? "" : ` of ${stat.format(stat.goal)}`
          }.`,
    );
  }

  if (values.length >= 3) {
    blocks.push({
      type: "metric",
      label: `${stat.name} · last ${Math.min(values.length, 14)} days`,
      value: stat.format(Math.round(avg7 ?? 0)),
      detail: `${plural(stat.daysLogged, "day")} logged · target ${stat.format(stat.goal)}`,
      series: values.slice(-14),
      accent:
        id === "sleep"
          ? "violet"
          : id === "water"
            ? "sky"
            : id === "study"
              ? "amber"
              : id === "movement"
                ? "sage"
                : id === "screen"
                  ? "rose"
                  : "amber",
    });
    sources.push(`Trackers · ${stat.name}`, `Last ${Math.min(values.length, 14)} days`);
  }

  return { paragraphs, sources: [...new Set(sources)], blocks };
}

function periodAnswer(record: CoachRecord): CoachResponse {
  const paragraphs: string[] = [];
  const sources: string[] = [];
  const blocks: CoachBlock[] = [];
  const cycle = record.cycle;

  if (!cycle || cycle.daysLogged === 0) {
    paragraphs.push(
      "There's no cycle logged yet. Log the day your period starts on the Cycle page — one date — and the phase you're in, plus a predicted next start with its confidence, appears immediately.",
    );
    return { paragraphs, sources, blocks };
  }

  if (cycle.cycleDay !== null && cycle.phaseLabel) {
    paragraphs.push(
      `You're on day ${cycle.cycleDay} — ${cycle.phaseLabel.toLowerCase()}. ${
        cycle.nextStart
          ? cycle.daysUntilNext !== null && cycle.daysUntilNext >= 0
            ? `The next start is estimated around ${cycle.nextStart}, about ${plural(cycle.daysUntilNext, "day")} out.`
            : `The next start was estimated around ${cycle.nextStart}.`
          : ""
      }`.trim(),
    );
  } else if (cycle.averageLength !== null) {
    paragraphs.push(
      `Your cycles average about ${Math.round(cycle.averageLength)} days so far.`,
    );
  }

  if (cycle.confidence && cycle.confidenceReason) {
    paragraphs.push(
      `How much to trust that: ${cycle.confidence.toLowerCase()} confidence — ${cycle.confidenceReason}`,
    );
    sources.push("Cycle record", "Prediction confidence");
  }

  const sleep = record.trackers.find((t) => t.id === "sleep");
  if (sleep && sleep.daysLogged >= 3) {
    paragraphs.push(
      `Worth reading together: sleep is averaging ${sleep.format(Math.round(sleep.avg7 ?? 0))} across your last logged nights.`,
    );
    sources.push("Trackers · Sleep");
  }

  return { paragraphs, sources: [...new Set(sources)], blocks };
}

function moodAnswer(
  topic: Topic,
  context: CoachContext,
  mode: CoachMode,
): CoachResponse {
  const mood = context.mood;
  const paragraphs: string[] = [];
  const sources: string[] = [];
  const blocks: CoachBlock[] = [];

  if (mood.dataQuality === "none") {
    paragraphs.push(
      "There are no mood check-ins to read yet, so I won't pretend otherwise. Two or three and this conversation starts having something real to say.",
    );
    return { paragraphs, sources, blocks };
  }

  const dir = mood.change.direction;
  const delta = mood.change.mood;

  if (topic === "stress") {
    paragraphs.push(
      `Stress reads ${fmt(mood.recent.stress)} of 10 on average over the last week ${
        (mood.change.stress ?? 0) < -0.5
          ? "— down from the week before."
          : (mood.change.stress ?? 0) > 0.5
            ? "— up against the week before. Spikes sit on specific days; they aren't your whole week."
            : ", holding roughly steady."
      }`,
    );
    if (mood.anomalies.length > 0) {
      const worst = mood.anomalies[mood.anomalies.length - 1]!;
      paragraphs.push(
        `The sharpest single day was ${worst.date} — ${
          worst.kind === "low" ? "a real low, not something you imagined" : "an unusual high"
        }. One hard day doesn't rewrite the trend.`,
      );
    }
    sources.push("Last 7 days", "Previous 7 days", "Mood record");
  } else {
    paragraphs.push(
      `Mood sits at ${fmt(mood.recent.mood)} of 10 across ${plural(mood.entries, "check-in")} — ${
        dir === "improving"
          ? `up ${fmt(Math.abs(delta ?? 0))} on the week before`
          : dir === "declining"
            ? `down ${fmt(Math.abs(delta ?? 0))} on the week before`
            : "steady against the week before"
      }. Energy ${fmt(mood.recent.energy)}, stress ${fmt(mood.recent.stress)}, both out of ten.`,
    );
    if (mood.patterns.length > 0) {
      paragraphs.push(`One thing stands out: ${mood.patterns[0]!.statement.toLowerCase()}`);
    } else if (mood.entries >= 5) {
      paragraphs.push(
        "Nothing repeats clearly yet — that's a reading too, not a failure. Patterns need a few ordinary weeks, not perfect streaks.",
      );
    }
    sources.push("Last 7 days", "Mood record");
  }

  if (mood.entries >= 6 && mode !== "plan") {
    blocks.push({
      type: "metric",
      label: "Mood · last 7 days",
      value: `${fmt(mood.recent.mood)} / 10`,
      detail: `${plural(mood.entries, "entry")} · month reads ${fmt(mood.month.mood)}`,
      series: [mood.previous.mood, mood.recent.mood, mood.month.mood].filter((v): v is number =>
        Number.isFinite(v),
      ),
      accent: "violet",
    });
  }

  return { paragraphs, sources: [...new Set(sources)], blocks };
}

/** A plan built from the record, not from a template. */
function planAnswer(record: CoachRecord, context: CoachContext): CoachResponse {
  const paragraphs: string[] = [];
  const sources: string[] = [];
  const blocks: CoachBlock[] = [];
  const steps: { label: string; time?: string }[] = [];

  const study = record.trackers.find((t) => t.id === "study");
  const sleep = record.trackers.find((t) => t.id === "sleep");
  const water = record.trackers.find((t) => t.id === "water");
  const movement = record.trackers.find((t) => t.id === "movement");

  const bestBand = [...context.mood.timeOfDay]
    .filter((b) => b.energy !== null)
    .sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0))[0];

  if (bestBand) {
    paragraphs.push(
      `Your energy logs say ${bestBand.label.toLowerCase()} is your strongest band this week — put the thing that needs a brain there and keep the rest gentle.`,
    );
    steps.push({ label: "The one task that needs real focus", time: bestBand.label.toLowerCase() });
    sources.push("Time-of-day bands");
  } else if (study && study.daysLogged >= 3) {
    paragraphs.push(
      `You've studied on ${plural(study.daysLogged, "day")}, averaging ${study.format(Math.round(study.avg7 ?? 0))} — put the hardest hour where your logged energy is highest and leave the rest light.`,
    );
    steps.push({ label: "One focused block on the thing that matters", time: "your best band" });
    sources.push("Trackers · Study");
  } else {
    paragraphs.push(
      "A plan you can actually keep beats an ambitious one you won't: one hard thing, one kind thing, one done.",
    );
    steps.push({ label: "The one task that matters tomorrow morning", time: "10 min tonight" });
  }

  if (record.habitsActive > 0) {
    steps.push({
      label: `Run your routine (${plural(record.habitsActive, "habit")} active)`,
      time: "first",
    });
    sources.push("Tracker data");
  }
  if (movement && movement.daysLogged >= 1) {
    steps.push({ label: `Move for ${movement.format(movement.goal)}`, time: "anywhere in the day" });
    sources.push("Trackers · Movement");
  }
  if (water && water.today !== null && water.goal > 0 && water.today < water.goal) {
    steps.push({
      label: `Another ${water.format(Math.min(500, Math.max(250, water.goal - water.today)))} of water`,
      time: "before evening",
    });
    sources.push("Trackers · Water");
  }
  steps.push({ label: "Something small that counts as showing up", time: "afternoon" });
  if (sleep) {
    steps.push({ label: `Wind down toward ${sleep.format(Math.round(sleep.goal / 60))} of sleep`, time: "evening" });
    sources.push("Trackers · Sleep");
  } else {
    steps.push({ label: "Stop before you're empty", time: "evening" });
  }

  blocks.push({
    type: "plan",
    title: "Tonight's shape",
    detail:
      study && study.daysLogged >= 3
        ? "Built from your logged days, not a template."
        : "Partly from thin data — the more you log, the less generic this gets.",
    steps,
  });

  paragraphs.push("It's a starting shape, not a contract. Change anything.");
  return { paragraphs, sources: [...new Set(sources)], blocks };
}

function generalAnswer(record: CoachRecord, context: CoachContext): CoachResponse {
  const paragraphs: string[] = [];
  const sources: string[] = [];
  const blocks: CoachBlock[] = [];

  const available = record.trackers.filter((t) => t.daysLogged > 0);
  const moodEntries = context.mood.entries;

  if (available.length === 0 && moodEntries === 0 && (!record.cycle || record.cycle.daysLogged === 0)) {
    paragraphs.push(
      "I read from your own logs — sleep, water, study, movement, energy, screen, cycle and mood — and I'd rather say nothing than guess at something I can't see.",
    );
    paragraphs.push(
      "Right now that record is empty. Log one day on the Trackers page, or the start date of your period on the Cycle page, and ask me again — then the answer is yours rather than a template.",
    );
    return { paragraphs, sources, blocks };
  }

  const lines: string[] = [];
  for (const stat of available) {
    const value = stat.avg7 ?? stat.today;
    if (value === null) continue;
    lines.push(`${stat.name.toLowerCase()} ${stat.format(Math.round(value))}`);
  }
  if (moodEntries > 0) lines.push(`mood ${fmt(context.mood.recent.mood)} of 10`);
  if (record.cycle?.cycleDay !== null && record.cycle?.cycleDay !== undefined)
    lines.push(`cycle day ${record.cycle.cycleDay}`);

  paragraphs.push(
    `Here's what your record actually holds: ${lines.join(", ")}. That's the whole picture I can honestly speak from.`,
  );
  paragraphs.push(
    "Ask me about any one of those — sleep, water, study, movement, energy, screen, your cycle, or how the week reads — and I'll go into it properly.",
  );

  const strongest = [...available].sort((a, b) => b.daysLogged - a.daysLogged)[0];
  if (strongest) {
    const values = strongest.series.filter((v): v is number => v !== null);
    if (values.length >= 3) {
      blocks.push({
        type: "metric",
        label: `${strongest.name} · last ${Math.min(values.length, 14)} days`,
        value: strongest.format(Math.round(strongest.avg7 ?? values[values.length - 1] ?? 0)),
        detail: `${plural(strongest.daysLogged, "day")} logged`,
        series: values.slice(-14),
        accent: "violet",
      });
      sources.push(`Trackers · ${strongest.name}`);
    }
  }

  return { paragraphs, sources: [...new Set(sources)], blocks };
}

/**
 * The answer. Every paragraph is either a fact from the record or an explicit
 * statement that there isn't one — never a guess dressed up as insight.
 */
export function answer(
  question: CoachQuestion,
  context: CoachContext,
  record: CoachRecord,
): CoachResponse {
  const topic = detectTopic(question.text, question.mode);

  if (topic === "greeting") {
    const available = record.trackers.filter((t) => t.daysLogged > 0).length;
    const paragraphs = [
      available > 0
        ? `I've got ${plural(available, "tracker")} with entries on them and your cycle record. Ask me about any of it — or say "plan tonight".`
        : "I've got nothing logged to read from yet, so I'll be blunt rather than comforting: log one day on the Trackers page and I'll have something real to say.",
    ];
    return { paragraphs, sources: [], blocks: [] };
  }

  if (question.mode === "plan" && (topic === "habit" || topic === "general")) {
    return planAnswer(record, context);
  }

  if (topic === "period") return periodAnswer(record);
  if (topic === "mood" || topic === "stress") return moodAnswer(topic, context, question.mode);
  if (topic === "habit") {
    if (!context.habits.available || context.habits.activeCount === 0) {
      return {
        paragraphs: [
          "There's no routine tracked yet. Add one habit on the habits page and I can tell you whether it's actually holding.",
        ],
        sources: [],
        blocks: [],
      };
    }
    const h = context.habits;
    return {
      paragraphs: [
        `Your routine is ${plural(h.activeCount, "habit")} tracked; recent logs show ${plural(h.recentCompleted, "completion")} this window${
          h.previousCompleted > 0 ? `, ${h.previousCompleted} in the one before` : ""
        }. ${h.recentCompleted >= h.previousCompleted ? "Holding or quietly improving." : "A little lighter than before — worth a glance at what changed."}`,
      ],
      sources: ["Tracker data"],
      blocks: [],
    };
  }

  const tracker = trackerAnswer(topic, record);
  if (tracker) return tracker;
  if (question.mode === "reflect") return moodAnswer("mood", context, question.mode);
  return generalAnswer(record, context);
}
