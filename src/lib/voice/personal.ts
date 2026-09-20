/**
 * Bloom's personal voice — who the app is talking to.
 *
 * Bloom already knows more about a person than it says. Onboarding asks their
 * name (offered, never required) and what they want from Bloom; the record
 * knows whether a cycle is part of their Bloom at all. None of that reached
 * the coach or the companion lines: with an empty record the app answered
 * everyone identically, which is the exact thing that made it feel like a
 * form rather than a companion.
 *
 * This module reads that identity the same way the coach reads trackers —
 * synchronously, from the local prefs document (which is also the synced
 * document, so a name follows the account), with an SSR guard and a total
 * refusal to throw. Every consumer treats it as one input among several:
 * a missing name degrades to the existing copy, never to a placeholder like
 * "Hi, there." — an empty greeting is warmer than a hollow one.
 *
 * Rules for everything in here:
 *   · **No invention.** A name only appears when the person gave one.
 *   · **Used sparingly.** A name on the greeting and in conversation is
 *     friendly; a name in every sentence is a salesperson. Callers should
 *     reach for `firstNameOf` once per surface, not once per line.
 *   · **Honest tenure.** "Day one" is only said on day one; tenure lines are
 *     derived from the onboarding timestamp, never asserted.
 */

import { pick } from "./messages";
import { daypart, type Daypart } from "./messages";

import { PREFS_KEY, type PrefsDoc } from "@/lib/prefs";

/** The part of the person's identity the voice is allowed to use. */
export interface PersonalVoice {
  /** First name as offered at onboarding, or null when they didn't give one. */
  name: string | null;
  /** What they told Bloom they wanted from it, as capability ids. */
  focus: string[];
  /** Does their Bloom include the cycle? (capability, never a label) */
  cycle: boolean | null;
  /** Whole days since they answered onboarding — null when unknown. */
  daysWithBloom: number | null;
  /** True only on the day they first answered. */
  firstDay: boolean;
  /** Where they are in the day, from the same clock every greeting uses. */
  daypart: Daypart;
}

const hasWindow = () => typeof window !== "undefined";

/** First word of a name, for a greeting — "Maya K." greets as "Maya". */
export function firstNameOf(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  /* A name is only usable at greeting length — a pasted sentence is not a
     name, however short its first word happens to be. */
  const words = trimmed.split(/\s+/);
  if (trimmed.length > 40 || words.length > 4) return null;
  const first = words[0]!;
  return first.length <= 24 ? first : null;
}

function readPrefsDoc(): PrefsDoc {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as PrefsDoc) : {};
  } catch {
    return {};
  }
}

/** The onboarding answer as stored by `useOnboarding.finish()` — shape-tolerant. */
function readOnboarding(): {
  name: string | null;
  focus: string[];
  cycle: boolean | null;
  at: string | null;
} {
  const doc = readPrefsDoc();
  const entry = doc["onboarding.v1"];
  const value = entry && typeof entry === "object" ? entry.value : null;
  if (!value || typeof value !== "object") {
    return { name: null, focus: [], cycle: null, at: null };
  }
  const row = value as Record<string, unknown>;
  const name = typeof row["name"] === "string" ? firstNameOf(row["name"]) : null;
  const focus = Array.isArray(row["focus"])
    ? row["focus"].filter((f): f is string => typeof f === "string")
    : [];
  /* `kind` is the capability; derive the same way profileKind does, without
     importing it — this module must stay leaf-level. */
  const kind = row["kind"];
  const cycle = kind === "cycle" ? true : kind === "no-cycle" ? false : null;
  const at = typeof row["at"] === "string" ? row["at"] : null;
  return { name, focus, cycle, at };
}

/**
 * Read the person, once, from local state. Synchronous and SSR-safe — the
 * coach's record builder calls this on every request so an answer is never
 * built from a stale identity.
 */
export function readPersonalVoice(now: Date = new Date()): PersonalVoice {
  const { name, focus, cycle, at } = readOnboarding();
  let daysWithBloom: number | null = null;
  if (at) {
    const started = new Date(at);
    if (!Number.isNaN(started.getTime())) {
      const ms = now.getTime() - started.getTime();
      daysWithBloom = Math.max(0, Math.floor(ms / 86_400_000));
    }
  }
  return {
    name,
    focus,
    cycle,
    daysWithBloom,
    firstDay: daysWithBloom === 0,
    daypart: daypart(now),
  };
}

/* -------------------------------------------------------------------------- */
/*  Companion lines                                                           */
/* -------------------------------------------------------------------------- */

const DAYPART_WORD: Record<Daypart, string> = {
  night: "Still up",
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

/** "Good morning, Maya." — the shape the Today hero already uses. */
export function dayGreeting(voice: PersonalVoice): string {
  const word = DAYPART_WORD[voice.daypart];
  return voice.name ? `${word}, ${voice.name}.` : `${word}.`;
}

/**
 * The coach's welcome line — what greets someone who opens an empty
 * conversation. Carries the daypart and (when known) the name, so the first
 * thing the coach ever says is already about *them*, even before a single
 * entry exists. Never mentions data: an empty-record person hasn't failed to
 * log anything, they've just arrived.
 */
const WELCOME_WITH_NAME: Record<Daypart, string[]> = {
  night: [
    "Still up, {name}? I'm here — late thoughts welcome.",
    "The quiet hours suit this place. What's on your mind, {name}?",
  ],
  morning: [
    "Morning, {name}. What's today looking like?",
    "You're up, {name} — shall we look at the day?",
  ],
  afternoon: [
    "Afternoon, {name}. How's the day treating you?",
    "Good to see you, {name}. What shall we look at?",
  ],
  evening: [
    "Evening, {name}. How did today actually go?",
    "Winding down, {name}? Good time to think out loud.",
  ],
};

const WELCOME_GENERIC: Record<Daypart, string[]> = {
  night: ["Still up? Late thoughts are welcome here.", "The quiet hours — what's on your mind?"],
  morning: ["Morning. What's today looking like?", "A new day. Shall we look at it together?"],
  afternoon: ["Afternoon. How's the day treating you?", "Good to see you. What shall we look at?"],
  evening: ["Evening. How did today actually go?", "Winding down? A good time to think out loud."],
};

const POOL_KEY = "voice.personal.welcome";

/**
 * A welcome line for the coach's empty state. Rotated through the shared
 * `pick()` memory so a daily user doesn't read the same sentence twice.
 */
export function welcomeLine(voice: PersonalVoice): string {
  const name = voice.name;
  if (name) {
    return pickLine(`${POOL_KEY}.named`, WELCOME_WITH_NAME[voice.daypart]).replace("{name}", name);
  }
  return pickLine(`${POOL_KEY}.plain`, WELCOME_GENERIC[voice.daypart]);
}

function pickLine(key: string, pool: string[]): string {
  return pick(key, pool);
}
