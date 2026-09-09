/**
 * Answer length, matched to the question.
 *
 * The old coach answered "did I sleep enough?" with four paragraphs. That is
 * the single most tiring thing a chat assistant does: it makes every exchange
 * cost the same, so people stop asking small things. A good coach mirrors the
 * register it was addressed in — a one-liner gets a one-liner, a real question
 * gets a real answer, and only an open-ended ask earns the full treatment.
 *
 * The signal isn't just word count. "why?" is three characters and deserves
 * more than "yes"; "should I go to bed now" is short but closed. So the
 * measure combines length, the kind of question word used, and whether the
 * person explicitly asked for depth or brevity.
 */

export type Register = "terse" | "brief" | "normal" | "full";

export interface Budget {
  register: Register;
  /** Hard cap on paragraphs the renderer will show. */
  maxParagraphs: number;
  /** Soft target for the whole answer. */
  maxWords: number;
  /** Whether metric/plan blocks are worth rendering at all. */
  allowBlocks: boolean;
}

const BUDGETS: Record<Register, Budget> = {
  terse: { register: "terse", maxParagraphs: 1, maxWords: 30, allowBlocks: false },
  brief: { register: "brief", maxParagraphs: 1, maxWords: 70, allowBlocks: true },
  normal: { register: "normal", maxParagraphs: 2, maxWords: 150, allowBlocks: true },
  full: { register: "full", maxParagraphs: 4, maxWords: 320, allowBlocks: true },
};

/** "explain", "why", "how do I" — open questions that want room to answer. */
const OPEN =
  /\b(why|how (do|should|can|would)|explain|walk me|help me (understand|plan)|what should|advice|plan for|break (it|this) down|in detail|tell me (more|about))\b/i;

/** Closed questions: a yes, a number, or a single line is the correct answer. */
const CLOSED = /^(did|do|does|is|are|was|were|can|should|will|have|has|am)\b/i;

/** Explicit asks, which beat every other signal. */
const WANTS_SHORT =
  /\b(short(ly)?|briefly|in a (word|line|sentence)|tl;?dr|quick(ly)?|just tell me|one line)\b/i;
const WANTS_LONG = /\b(in detail|thorough|full|everything|deep dive|at length|elaborate)\b/i;

const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * How much answer this question has earned.
 *
 * Order matters: an explicit request wins, then obviously-open phrasing, then
 * shape and length. A greeting is always terse — nobody wants a paragraph back
 * for "hey".
 */
export function budgetFor(question: string, opts: { greeting?: boolean } = {}): Budget {
  const q = question.trim();
  if (opts.greeting) return BUDGETS.terse;
  if (q.length === 0) return BUDGETS.brief;

  if (WANTS_SHORT.test(q)) return BUDGETS.terse;
  if (WANTS_LONG.test(q)) return BUDGETS.full;

  const words = wordCount(q);
  const open = OPEN.test(q);
  const closed = CLOSED.test(q) && !open;

  /*
   * A closed question stays closed however long it rambles — but past ~20
   * words it has usually acquired enough qualifiers ("on more days than not,
   * this week, roughly") that a bare yes would ignore half of it.
   */
  if (closed) return words > 20 ? BUDGETS.normal : BUDGETS.brief;
  /*
   * An open question gets room even when it's terse — "why?" is a real ask.
   * The threshold is low because open questions are rarely long: "explain why
   * my energy drops in the afternoons" is nine words and wants the full answer.
   */
  if (open) return words > 6 ? BUDGETS.full : BUDGETS.normal;

  if (words <= 3) return BUDGETS.terse;
  if (words <= 10) return BUDGETS.brief;
  if (words <= 28) return BUDGETS.normal;
  return BUDGETS.full;
}

/**
 * Trim an answer to its budget.
 *
 * Cuts whole paragraphs first — a truncated sentence reads as a bug — and only
 * then, if the first paragraph alone still blows the word budget, cuts at a
 * sentence boundary within it. Never mid-word, never with an ellipsis: the
 * result should look written, not clipped.
 */
export function fitToBudget(paragraphs: string[], budget: Budget): string[] {
  const kept = paragraphs.filter((p) => p.trim().length > 0).slice(0, budget.maxParagraphs);
  if (kept.length === 0) return [];

  let running = 0;
  const out: string[] = [];
  for (const p of kept) {
    const n = wordCount(p);
    if (out.length > 0 && running + n > budget.maxWords) break;
    out.push(p);
    running += n;
  }
  if (out.length === 0) out.push(kept[0]!);

  /* Still over on a single paragraph: keep whole sentences up to the budget. */
  const first = out[0]!;
  if (out.length === 1 && wordCount(first) > budget.maxWords) {
    const sentences = first.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [first];
    const picked: string[] = [];
    let count = 0;
    for (const s of sentences) {
      const n = wordCount(s);
      if (picked.length > 0 && count + n > budget.maxWords) break;
      picked.push(s.trim());
      count += n;
    }
    out[0] = picked.join(" ");
  }
  return out;
}
