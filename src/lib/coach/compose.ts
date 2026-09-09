/**
 * Turn knowledge and the record into an answer that fits the question.
 *
 * This is the layer the old coach didn't have. It used to go straight from
 * "which topic?" to "read that tracker", so any subject without a tracker fell
 * through to a refusal. Now the shape is:
 *
 *     topic  →  what do I know about this?      (knowledge.ts)
 *            +  what does their record show?     (responder.ts)
 *            →  compose to the budget            (here)
 *
 * Two rules drive everything below.
 *
 * **Data leads when it exists.** If they've logged sleep, "why am I so tired?"
 * should open with their actual sleep, not with a fact about circadian rhythm.
 * The general knowledge becomes the second paragraph — the *why* behind their
 * number. If they've logged nothing, the knowledge simply becomes the answer,
 * and the invitation to log something is a quiet closing line rather than the
 * whole reply.
 *
 * **The budget is a hard ceiling, and it's satisfied in priority order.** A
 * one-line question gets exactly the one most useful line. This is what stops
 * the "I asked one thing and got five paragraphs" problem: we don't write an
 * answer and then trim it, we decide how many paragraphs we're allowed and
 * spend them on the highest-value pieces available.
 */

import { pick } from "@/lib/voice/messages";

import type { Budget } from "./brevity";
import { CLINICAL, KNOWLEDGE, type Knowledge } from "./knowledge";
import type { Topic } from "./topics";

/** A piece of a potential answer, with a reason to include it. */
interface Piece {
  text: string;
  /** Higher wins when the budget can't fit everything. */
  weight: number;
}

export interface ComposeInput {
  topic: Topic;
  budget: Budget;
  /** Paragraphs derived from the person's own logs. Empty when there's nothing. */
  fromRecord: string[];
  /** True when the record genuinely holds nothing relevant. */
  recordEmpty: boolean;
  /** Seed for rotation, so the same question doesn't give identical words. */
  seed: string;
  /** The question itself, used to pick the most relevant line from a pool. */
  question: string;
}

/**
 * Closing lines for when the record is empty. Deliberately an aside, never the
 * whole answer — the old coach led with this and it read as a refusal to engage.
 */
const LOG_NUDGE = [
  "If you log a few days, I can tell you whether that's what's happening for you specifically.",
  "Track it for a week and I can stop speaking generally and start speaking about you.",
  "None of that is from your record — there's nothing in it yet. A few days of logging changes that.",
];

const pickFrom = (pool: string[] | undefined, seed: string): string | null =>
  pool && pool.length > 0 ? pick(`coach.k.${seed}`, pool) : null;

/** Words too common to signal anything about what was asked. */
const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "is",
  "are",
  "was",
  "were",
  "be",
  "do",
  "does",
  "did",
  "i",
  "me",
  "my",
  "you",
  "your",
  "it",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "at",
  "how",
  "what",
  "why",
  "when",
  "should",
  "can",
  "keep",
  "get",
  "got",
  "so",
  "that",
  "this",
  "about",
  "am",
  "im",
  "ive",
]);

/**
 * Choose the line that actually answers *this* question.
 *
 * Pure rotation is right for variety and wrong for relevance: asked "is
 * intermittent fasting worth trying?", a rotating pick happily returned the
 * line about what to eat before a run. Both are true things about food; only
 * one is an answer.
 *
 * So score each candidate on shared meaningful words and take the best. When
 * nothing overlaps — the common case, since these lines don't parrot the
 * question — every score is zero and we fall through to rotation, which keeps
 * repeat questions from producing identical replies.
 */
function pickRelevant(pool: string[] | undefined, question: string, seed: string): string | null {
  if (!pool || pool.length === 0) return null;
  if (pool.length === 1) return pool[0]!;

  const asked = new Set(
    question
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
  if (asked.size === 0) return pickFrom(pool, seed);

  /*
   * Weight each shared word by how *distinctive* it is within this pool. A word
   * appearing in every candidate ("before", "food") carries no information and
   * must not decide the match — that bug picked the fasting line for "what
   * should I eat before a run?" purely on the word "before". A word unique to
   * one line ("fasting", "exercise") is exactly the signal we want.
   *
   * This is inverse document frequency in miniature, over a pool of two to four
   * sentences.
   */
  const docCount = new Map<string, number>();
  const lineWords = pool.map((line) => {
    const set = new Set(
      line
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 2 && !STOP.has(w)),
    );
    for (const w of set) docCount.set(w, (docCount.get(w) ?? 0) + 1);
    return set;
  });

  let best: string | null = null;
  let bestScore = 0;
  pool.forEach((line, i) => {
    let score = 0;
    for (const w of lineWords[i]!) {
      if (!asked.has(w)) continue;
      /* 1 / (how many candidates contain it) — unique words dominate. */
      score += 1 / (docCount.get(w) ?? 1);
    }
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  });

  /*
   * A single common word shouldn't count as a match at all. Below this the
   * overlap is noise and rotation gives a better answer than false precision.
   */
  return bestScore >= 0.5 ? best : pickFrom(pool, seed);
}

/**
 * Build the answer.
 *
 * Weights encode the editorial judgement: their own data outranks general
 * knowledge, the direct answer outranks the elaboration, and on clinical
 * subjects the "talk to someone" line outranks everything except their data.
 */
export function compose(input: ComposeInput): string[] {
  const { topic, budget, fromRecord, recordEmpty, seed, question } = input;
  const k: Knowledge | undefined = KNOWLEDGE[topic];
  const clinical = CLINICAL.has(topic);

  const pieces: Piece[] = [];

  /* Their own data, highest value — it's the thing only this app can say. */
  fromRecord.forEach((p, i) => pieces.push({ text: p, weight: 100 - i }));

  if (k) {
    const core = pickRelevant(k.core, question, `${topic}.core.${seed}`);
    /*
     * On clinical topics the core line carries the "this needs a person"
     * message, so it must outrank even the record. Elsewhere the record wins.
     */
    if (core) pieces.push({ text: core, weight: clinical ? 120 : 80 });

    const more = pickRelevant(k.more, question, `${topic}.more.${seed}`);
    if (more) pieces.push({ text: more, weight: 60 });

    const step = pickRelevant(k.step, question, `${topic}.step.${seed}`);
    /*
     * A concrete step is worth more than elaboration when room is tight — it's
     * the difference between being informed and being helped.
     */
    if (step) pieces.push({ text: step, weight: 70 });
  }

  /*
   * The nudge to log only appears when there is room to spare, the answer
   * already said something useful, and — crucially — the topic actually has a
   * tracker behind it. Telling someone asking about therapy or their roommate
   * to "log a few days" is a non-sequitur, and it was exactly the reflex that
   * made the old coach feel like it only wanted data from you.
   */
  if (recordEmpty && k?.reads && budget.maxParagraphs >= 3) {
    pieces.push({ text: pick("coach.lognudge", LOG_NUDGE, seed), weight: 20 });
  }

  /* Highest weight first, then cut to the paragraph ceiling. */
  const chosen = pieces
    .sort((a, b) => b.weight - a.weight)
    .slice(0, budget.maxParagraphs)
    .map((p) => p.text);

  /*
   * Sorting by weight can reorder the record's own paragraphs relative to each
   * other, which reads oddly since they were written as a sequence. Restore
   * the original order of whatever survived.
   */
  const order = new Map<string, number>();
  pieces.forEach((p, i) => order.set(p.text, i));
  return chosen.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/**
 * The last-resort answer, for a topic with no knowledge entry and no data.
 *
 * The old version of this was the refusal that caused the whole problem. The
 * difference now: it engages with the question, admits the limit in one clause
 * rather than two paragraphs, and always offers a direction.
 */
const OPEN_HANDED = [
  "I don't have anything specific stored on that, but I'm happy to think it through with you — tell me a bit more about what's going on.",
  "That's outside what I track, though not outside what we can talk about. What's the part that's bothering you most?",
  "I can't look that one up, but say more and I'll help you reason about it.",
];

export const openHanded = (seed: string): string[] => [pick("coach.openhanded", OPEN_HANDED, seed)];
