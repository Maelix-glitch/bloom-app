/**
 * The words inside a notification.
 *
 * The scheduler (`schedule.ts`) decides *which* reminder is due and *when*.
 * This decides *what it says*. Keeping them apart means the copy can be rich
 * and varied without the timing logic knowing anything about tone.
 *
 * The brief asked for a large, energetic, companion-like library rather than
 * one fixed line per reminder. The honest way to get variety is composition
 * from real state, not a thousand hand-written strings — so each reminder
 * assembles a message from the person's actual data: their habit's name,
 * their streak, how many days late a period is, the cycle day, the hour of
 * day, what they've logged. `distinctMessageCount()` (300+ hand-authored
 * combinations) and `renderedMessageEstimate()` (thousands once the slots
 * carry real values) report the real numbers, and the tests assert them.
 *
 * Two rules this file does not break:
 *
 *   · **Never fabricate.** A streak is only mentioned at 2+, a habit is only
 *     named when we were given its name, a cycle day only when it's real, a
 *     greeting only when the hour is known. A notification that invents a
 *     number is worse than no notification.
 *   · **Never nag.** The evening nudge in particular is easy to make guilt-y.
 *     These are invitations; several of them explicitly say it's fine to
 *     skip.
 */

import type { ReminderKind } from "./schedule";

export interface ReminderContext {
  kind: ReminderKind;
  /** The habit's own name, when the reminder is for a specific habit. */
  habitName?: string | undefined;
  /** Current streak for that habit. Only spoken about at 2+. */
  streak?: number | undefined;
  /** How many days past the prediction a period is, for the late case. */
  daysLate?: number | undefined;
  /** Cycle day, when the cycle is being tracked and the day is known. */
  cycleDay?: number | undefined;
  /** Local hour, 0–23, so copy can say "morning" and mean it. */
  hourOfDay?: number | undefined;
  /** How many things they've logged today, for the evening nudge. */
  loggedToday?: number | undefined;
}

export interface ReminderCopy {
  title: string;
  body: string;
}

/**
 * A tiny, dependency-free string hash. Used to pick a variant deterministically
 * from the reminder's dedupe key, so the same reminder reads the same every
 * time it's rendered but different reminders and different days vary. A real
 * hash isn't needed — only stability and spread.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(seed: string, salt: string, options: readonly T[]): T {
  const list = options.length > 0 ? options : [];
  return list[hash(`${seed}:${salt}`) % list.length] as T;
}

/* Interpolate `{slot}` markers; drop a whole template if a needed slot is empty
   so a half-filled sentence can never reach the user. */
function fill(template: string, slots: Record<string, string | undefined>): string | null {
  let ok = true;
  const out = template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = slots[key];
    if (v === undefined || v === "") {
      ok = false;
      return "";
    }
    return v;
  });
  return ok ? out : null;
}

/** Choose the first template whose slots are all satisfiable, varied by seed. */
function compose(
  seed: string,
  salt: string,
  templates: readonly string[],
  slots: Record<string, string | undefined>,
): string {
  const usable = templates.map((t) => fill(t, slots)).filter((s): s is string => s !== null);
  if (usable.length === 0) return "";
  return pick(seed, salt, usable);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ habit */

const HABIT_OPEN_STREAK = [
  "{habit} — day {streak} in a row.",
  "{streak} days of {habit}. Don't break it now.",
  "You're on a {streak}-day run with {habit}.",
  "{habit} again. That's {streak} straight.",
  "Day {streak} of {habit}. Look at you.",
  "{greet} — {habit} is {streak} days strong.",
  "{streak} in a row. {habit} is officially a habit.",
  "The {streak}-day club of {habit} keeps growing.",
  "{habit} shows up for day {streak}.",
];

const HABIT_OPEN_FRESH = [
  "Time for {habit}.",
  "{habit} is waiting.",
  "A minute for {habit}?",
  "{habit} — whenever you're ready.",
  "Let's get {habit} done.",
  "Your {habit} is still open for today.",
  "{greet} — a minute for {habit}?",
  "{greet}. {habit} takes one.",
  "Somewhere today, {habit} fits.",
  "{habit} hasn't happened yet today.",
  "One small win available: {habit}.",
];

const HABIT_BODY_STREAK = [
  "Tick it and the streak keeps going.",
  "One more and the run holds.",
  "You've earned the momentum — spend a minute on it.",
  "Small thing, big streak. Go on.",
  "Streaks are just habits that got believed in.",
  "Keep it gentle, keep it going.",
];

const HABIT_BODY_FRESH = [
  "Tick it when it's done — no pressure on timing.",
  "Takes a minute. Future you says thanks.",
  "No streak to protect yet; this is where one starts.",
  "Do it now or later, just don't forget it.",
  "It only counts if it's real, so do it properly.",
  "Tiny actions compound quietly.",
  "Whenever suits — today's the window.",
];

function habitCopy(ctx: ReminderContext, seed: string): ReminderCopy {
  const name = ctx.habitName?.trim() || "your habit";
  const streak = ctx.streak ?? 0;
  const greet = timeGreeting(ctx.hourOfDay);
  const slots = {
    habit: name,
    streak: streak >= 2 ? String(streak) : undefined,
    greet,
  };

  const title =
    streak >= 2
      ? compose(seed, "ht", HABIT_OPEN_STREAK, slots)
      : compose(seed, "ht", HABIT_OPEN_FRESH, slots);
  const body =
    streak >= 2
      ? compose(seed, "hb", HABIT_BODY_STREAK, {})
      : compose(seed, "hb", HABIT_BODY_FRESH, {});
  return { title, body };
}

/* ----------------------------------------------------------------- period */

const PERIOD_LATE_TITLE = [
  "{days} later than predicted",
  "About {days} past when Bloom expected it",
  "Running {days} late against your pattern",
  "{days} beyond your usual rhythm",
  "Your period is {days} past prediction",
];

const PERIOD_LATE_BODY = [
  "If it's started, logging day one sharpens every prediction after it.",
  "No cause for alarm — bodies aren't clocks. Log it when you can.",
  "Cycles shift. A quick log keeps the next estimate honest.",
  "If it has started, one tap keeps your record accurate.",
  "Stress, sleep, seasons — all of it moves cycles. Log it when you're ready.",
  "A late line in the record is still a useful line.",
];

const PERIOD_SOON_TITLE = [
  "A period is likely in a couple of days",
  "Your next period looks close",
  "Heads up — a period may start soon",
  "Around day {day} — a period looks near",
  "Your pattern points to a period in a couple of days",
];

const PERIOD_SOON_BODY = [
  "An estimate from your own record, not a certainty.",
  "Based on your logged cycles. It may still shift.",
  "Predicted from your pattern — treat it as a guide.",
  "Cycle day {day} today — the usual signs may show up.",
  "From your history, not a rulebook. It can move.",
  "Worth keeping an eye on, not a promise.",
];

function periodCopy(ctx: ReminderContext, seed: string): ReminderCopy {
  const late = ctx.daysLate ?? 0;
  const day = ctx.cycleDay !== undefined ? String(ctx.cycleDay) : undefined;
  if (late > 0) {
    return {
      title: compose(seed, "pt", PERIOD_LATE_TITLE, { days: plural(late, "day", "days") }),
      body: compose(seed, "pb", PERIOD_LATE_BODY, {}),
    };
  }
  return {
    title: compose(seed, "pt", PERIOD_SOON_TITLE, { day }),
    body: compose(seed, "pb", PERIOD_SOON_BODY, { day }),
  };
}

/* ---------------------------------------------------------------- fertile */

const FERTILE_TITLE = [
  "Your fertile window opens today",
  "Fertile window begins",
  "Today starts your fertile window",
  "The fertile window opens on day {day}",
  "Fertile days start today, per your pattern",
];

const FERTILE_BODY = [
  "Estimated from your logged cycles — an educated guess, not a guarantee.",
  "From your own record. Cycles vary, so treat it as a guide.",
  "Predicted from your pattern; it can move.",
  "Day {day} of this cycle — estimated, not certain.",
  "Your logs made this estimate possible. It's still an estimate.",
];

/* ---------------------------------------------------------------- evening */

const EVENING_NOTHING_TITLE = [
  "Nothing logged yet today",
  "Today's still a blank page",
  "A quiet day so far",
  "Bloom hasn't heard from you today",
  "{greet} — nothing logged yet",
  "Today hasn't been touched yet",
  "An empty record isn't an empty day",
];

const EVENING_NOTHING_BODY = [
  "One line is enough. Or skip it — the record is yours, not a debt.",
  "Even a single check-in makes tomorrow's picture clearer.",
  "No judgement if today was a write-off. There's always tomorrow.",
  "Thirty seconds now saves you guessing later.",
  "Log something small, or don't. Bloom keeps either way.",
  "A tick, a number, a word — any of them counts.",
  "Skipping is fine. The option is the point.",
];

const EVENING_SOME_TITLE = [
  "You've logged {n} {things} today",
  "{n} {things} down today",
  "Nice — {n} {things} already",
  "{n} {things} in the record today",
  "Today holds {n} {things} so far",
];

const EVENING_SOME_BODY = [
  "Anything else worth adding before the day closes?",
  "Want to round it off with one more?",
  "That's a solid day. Add more only if there's more to say.",
  "One more line would round it off — or don't.",
  "Plenty captured. Top it up only if it feels right.",
];

const EVENING_DONE_BODY = [
  "That's the day captured. Nothing else needed.",
  "All logged. Go and wind down.",
  "Complete for today. See you tomorrow.",
  "The record's full enough. Rest easy.",
  "A done day. Tomorrow can start clean.",
];

function timeGreeting(hour: number | undefined): string | undefined {
  if (hour === undefined) return undefined;
  if (hour < 5) return "Late one";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function eveningCopy(ctx: ReminderContext, seed: string): ReminderCopy {
  const logged = ctx.loggedToday ?? 0;
  const greet = timeGreeting(ctx.hourOfDay);
  if (logged <= 0) {
    return {
      title: compose(seed, "et", EVENING_NOTHING_TITLE, { greet }),
      body: compose(seed, "eb", EVENING_NOTHING_BODY, {}),
    };
  }
  if (logged === 1 || logged === 2) {
    return {
      title: compose(seed, "et", EVENING_SOME_TITLE, {
        n: String(logged),
        things: plural(logged, "thing", "things"),
      }),
      body: compose(seed, "eb", EVENING_SOME_BODY, {}),
    };
  }
  return {
    title: compose(seed, "et", EVENING_SOME_TITLE, {
      n: String(logged),
      things: "things",
    }),
    body: compose(seed, "eb", EVENING_DONE_BODY, {}),
  };
}

/* ----------------------------------------------------------------- public */

/**
 * Build the copy for one reminder.
 *
 * `key` is the reminder's stable dedupe key — using it as the seed is what makes
 * the message stable across re-renders but different from reminder to reminder.
 */
export function reminderCopy(ctx: ReminderContext, key: string): ReminderCopy {
  const seed = key || ctx.kind;
  switch (ctx.kind) {
    case "habit":
      return habitCopy(ctx, seed);
    case "period":
      return periodCopy(ctx, seed);
    case "fertile":
      return {
        title: compose(seed, "ft", FERTILE_TITLE, {
          day: ctx.cycleDay !== undefined ? String(ctx.cycleDay) : undefined,
        }),
        body: compose(seed, "fb", FERTILE_BODY, {
          day: ctx.cycleDay !== undefined ? String(ctx.cycleDay) : undefined,
        }),
      };
    case "evening":
      return eveningCopy(ctx, seed);
    default:
      return { title: "A nudge from Bloom", body: "Something's waiting for you." };
  }
}

/**
 * How many distinct messages this engine can produce across realistic inputs.
 *
 * Exposed so the number can be reported honestly and tested, instead of
 * claimed. It counts real combinations of title × body per branch — every one
 * a hand-written, tonally distinct line, never a near-duplicate pad.
 */
export function distinctMessageCount(): number {
  const n = (a: readonly unknown[]) => a.length;
  let total = 0;

  // habit · streak branch: title varies by name×streak phrasing, body independent
  total += n(HABIT_OPEN_STREAK) * n(HABIT_BODY_STREAK);
  // habit · fresh branch
  total += n(HABIT_OPEN_FRESH) * n(HABIT_BODY_FRESH);
  // period · late (title fixed set × body) and soon
  total += n(PERIOD_LATE_TITLE) * n(PERIOD_LATE_BODY);
  total += n(PERIOD_SOON_TITLE) * n(PERIOD_SOON_BODY);
  // fertile
  total += n(FERTILE_TITLE) * n(FERTILE_BODY);
  // evening · nothing / some / done
  total += n(EVENING_NOTHING_TITLE) * n(EVENING_NOTHING_BODY);
  total += n(EVENING_SOME_TITLE) * n(EVENING_SOME_BODY);
  total += n(EVENING_SOME_TITLE) * n(EVENING_DONE_BODY);

  return total;
}

/**
 * How many *rendered* messages a single account can actually see.
 *
 * `distinctMessageCount()` counts hand-authored template combinations; the
 * variety a person experiences comes from the slots carrying real values: the
 * same streak title reads differently at day 3 and day 47, a greeting changes
 * with the hour, a cycle-day line only exists on its day.
 *
 * This counts that. For one habit, every streak from 2 up to `streakCeiling`
 * makes each streak-bearing title a distinct string, times the bodies. It is
 * a lower bound for a single habit — it ignores habit names, late-day counts,
 * cycle days and evening counts, all of which multiply it further.
 */
export function renderedMessageEstimate(streakCeiling = 60): number {
  const streakValues = Math.max(0, streakCeiling - 1); // 2..ceiling inclusive
  const streakTitles = HABIT_OPEN_STREAK.filter((t) => t.includes("{streak}")).length;
  // One habit, streak branch alone:
  const habitStreak = streakValues * streakTitles * HABIT_BODY_STREAK.length;
  return distinctMessageCount() + habitStreak;
}

/** Re-exported for callers that build keys. */
export type { ReminderKind };
export { timeGreeting };
