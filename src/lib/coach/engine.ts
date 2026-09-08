/**
 * The coach, rebuilt around three ideas.
 *
 *   1. **Answer the question that was asked.** The old responder recognised
 *      eleven topics — its own six trackers plus a handful — and everything
 *      else fell to a generic reply. `topics.ts` now recognises thirty, so a
 *      question about money, grief, a job interview or what the app does gets
 *      an answer about *that*, not a redirect to hydration.
 *   2. **Match the length to the question.** `brevity.ts` reads the shape of
 *      what was asked and hands back a budget; every path here respects it.
 *      "did I sleep enough?" gets a line. "why do I keep crashing at 3pm?"
 *      gets the analysis.
 *   3. **Remote first, local always.** The Supabase edge function answers when
 *      it can; the deterministic on-device responder answers when it can't.
 *      Neither can leave the person without a reply.
 *
 * What it will not do: invent a number, diagnose anything, or claim the record
 * says something it doesn't. Grounding is the whole point of a coach attached
 * to a tracker — an ungrounded one is just a chat window.
 */

import { answer as localAnswer, type CoachRecord, type CoachResponse } from "@/lib/coach/responder";
import type { CoachContext, CoachMode } from "@/lib/coach/intelligence";
import { budgetFor, fitToBudget, type Budget } from "@/lib/coach/brevity";
import { detectTopics, isCareTopic, isTrackedTopic, type Topic } from "@/lib/coach/topics";
import { askEdge, toFacts, type CoachTurn, type EdgeResult } from "@/lib/coach/edge";
import { pick } from "@/lib/voice/messages";
import { compose, openHanded } from "@/lib/coach/compose";

export interface AskInput {
  text: string;
  mode: CoachMode;
  record: CoachRecord;
  context: CoachContext;
  history: CoachTurn[];
  /** Provider id; "local" skips the network entirely. */
  provider: string;
  signal?: AbortSignal;
}

export interface CoachAnswer extends CoachResponse {
  topic: Topic;
  budget: Budget;
  /** Which brain produced this — shown quietly in the UI, useful in support. */
  source: "edge" | "local";
  /** Why the edge was skipped, when it was. */
  fellBackBecause?: string;
}

/* -------------------------------------------------------------------------- */
/*  Conversational replies — the ones no model or record is needed for        */
/* -------------------------------------------------------------------------- */

const HELLO = [
  "Hello. What's on your mind?",
  "Hey. Where shall we start?",
  "Hi. What are we looking at today?",
  "Morning — or whenever this is. What's up?",
  "Hello. Ask me anything about your record, or just think out loud.",
];

const YOURE_WELCOME = [
  "Any time.",
  "Of course.",
  "Glad it helped.",
  "You're welcome.",
  "Whenever you need it.",
];

const WHO_I_AM = [
  "I'm Bloom's coach. I read what you've logged and try to say something useful about it — no diagnosis, no guessing at numbers you haven't given me.",
  "Bloom's coach. I work from your own record: trackers, check-ins, cycle, habits. If the data isn't there, I'll say so rather than make something up.",
  "I'm the coach built into Bloom. Ask me about your week, your patterns, or whatever's on your mind — I'll stick to what your record actually shows.",
];

/**
 * Care topics get a different opening: a person first, the record second, and
 * never a statistic as the first thing they read.
 */
const CARE_OPENERS: Partial<Record<Topic, string[]>> = {
  grief: [
    "I'm sorry. That's a heavy thing to be carrying.",
    "That's a real loss, and there's no tidy answer to it.",
  ],
  loneliness: [
    "That's a hard way to spend your days, and saying it counts for something.",
    "Loneliness is heavier than people give it credit for.",
  ],
  stress: [
    "That sounds like a lot to hold at once.",
    "Being wound that tight is exhausting in itself.",
  ],
  mood: ["Thanks for saying so.", "That's worth naming rather than pushing past."],
  body: [
    "That's a hard thing to sit with, and it's rarely about the number.",
    "Being at odds with your own reflection is genuinely wearing.",
  ],
  pain: [
    "Pain wears everything else down with it.",
    "That's rough, and it makes every other thing harder.",
  ],
  illness: [
    "Sorry you're unwell.",
    "Being ill takes more out of you than the symptoms suggest.",
  ],
  relationships: [
    "People are the hardest part of most weeks.",
    "That sounds like it's taking up a lot of room.",
  ],
  money: [
    "Money worry is its own kind of tiredness.",
    "That's a real pressure, and it doesn't switch off at bedtime.",
  ],
  confidence: [
    "That voice is a convincing liar, for what it's worth.",
    "Being your own harshest critic is exhausting and rarely accurate.",
  ],
};

/**
 * For topics Bloom doesn't track, an honest position: it can't quote data it
 * doesn't have, but it can still be useful, and it can point at the one thing
 * in the record that genuinely bears on the question.
 */
const UNTRACKED_NOTE: Partial<Record<Topic, string>> = {
  food: "Bloom doesn't track meals, so I can't tell you what you ate — but energy and sleep usually show the shape of it.",
  caffeine: "Caffeine isn't one of Bloom's trackers, though your sleep log is the place it tends to show up.",
  alcohol: "Bloom doesn't log drinks, but sleep quality and next-day energy usually tell the story.",
  work: "Work isn't tracked directly, though study minutes, screen time and energy tend to move with it.",
  money: "That's outside what Bloom tracks, so I'll speak generally rather than pretending to read it in your data.",
  relationships: "Bloom doesn't track people, only how your days go — so take what I say as general, not as something I've measured.",
  grief: "There's nothing in a tracker that measures this, and I won't pretend otherwise.",
  loneliness: "Bloom can't see your social life, only your logs — so this is me talking generally.",
  illness: "I'm not a clinician and Bloom isn't a medical record. For anything that worries you, a doctor beats an app.",
  pain: "Bloom doesn't track pain outside the cycle log, and persistent pain is a doctor's question, not an app's.",
  body: "Bloom deliberately doesn't track weight, so there's no number here for me to quote at you.",
};

/** Something concrete to offer, matched to the subject. */
const OFFERS: Partial<Record<Topic, string[]>> = {
  motivation: [
    "The trick that actually works is shrinking the task until starting is boring — two minutes, not two hours.",
    "Pick the smallest version of it that still counts, and do that. Momentum is easier to steer than to start.",
  ],
  time: [
    "If everything is a priority, nothing is. What would you drop if you had to drop one thing this week?",
    "Look at where the hours actually went before deciding you need more of them — your screen log is a blunt but honest place to start.",
  ],
  goals: [
    "A goal you can check off tonight beats one you can only check off in June.",
    "Name the next action, not the outcome — 'open the document' rather than 'write the essay'.",
  ],
  work: [
    "One boundary, defended once, does more than a plan you don't keep.",
    "If the workload is the problem, no amount of personal optimisation fixes it — that's worth saying out loud.",
  ],
  confidence: [
    "Evidence beats reassurance: your record is full of days you showed up. That's not nothing.",
    "You're comparing your inside to everyone else's outside. It's not a fair fight.",
  ],
  food: [
    "Regular beats perfect. A dull lunch you actually eat outperforms a good one you skip.",
    "If energy is the complaint, the timing of meals usually matters more than their contents.",
  ],
  caffeine: [
    "The usual rule of thumb is nothing after early afternoon — caffeine's half-life is long enough to still be working at bedtime.",
    "If you're tired *and* wired, caffeine is normally propping up a sleep debt rather than fixing it.",
  ],
};

/* -------------------------------------------------------------------------- */
/*  Local answering                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Answer without the network.
 *
 * Tracked topics defer to the existing responder — it's precise, grounded and
 * well tested, and there's no reason to rewrite arithmetic that works. Every
 * other topic is composed here: an opener appropriate to the subject, an honest
 * note about what Bloom can and can't see, and something concrete to do or
 * consider. All three are drawn from pools, so asking twice doesn't produce
 * the same paragraph twice.
 */
export function answerLocally(input: AskInput): CoachAnswer {
  const { text, mode, record, context } = input;
  const { primary, also } = detectTopics(text);
  const budget = budgetFor(text, { greeting: primary === "greeting" });
  const seed = text.slice(0, 48).toLowerCase();

  /* --- pure conversation ------------------------------------------------- */
  if (primary === "greeting") {
    return done([pick("coach.hello", HELLO)], primary, budget, "local");
  }
  if (primary === "thanks") {
    return done([pick("coach.thanks", YOURE_WELCOME)], primary, budget, "local");
  }
  if (primary === "smalltalk") {
    return done([pick("coach.who", WHO_I_AM)], primary, budget, "local");
  }

  /*
   * --- everything else ----------------------------------------------------
   *
   * One path now, for tracked and untracked subjects alike. The old code
   * branched here: tracked topics went to the responder, and everything else
   * went to an apology. That branch was the bug — a question the responder
   * couldn't ground in data produced "your record is empty" instead of an
   * answer, so any subject without a tracker behind it hit a wall.
   *
   * Now the record is treated as *one input among several*. We ask the
   * responder what it can see, discard its refusals, and hand whatever is left
   * to the composer alongside what the coach actually knows about the subject.
   */
  let fromRecord: string[] = [];
  let blocks: CoachAnswer["blocks"] = [];
  let sources: string[] = [];

  if (isTrackedTopic(primary) || primary === "general") {
    const base = localAnswer({ text, mode }, context, record);
    fromRecord = base.paragraphs.filter(isGrounded);
    blocks = base.blocks;
    sources = base.sources;
  }

  /* A second tracked subject in the same question is worth a line. */
  if (budget.maxParagraphs >= 3 && also.length > 0 && isTrackedTopic(also[0]!) && !isTrackedTopic(primary)) {
    const side = localAnswer({ text, mode }, context, record);
    const grounded = side.paragraphs.filter(isGrounded);
    if (grounded[0]) fromRecord = [...fromRecord, grounded[0]];
  }

  const paragraphs = compose({
    topic: primary,
    budget,
    fromRecord,
    recordEmpty: fromRecord.length === 0,
    seed,
    question: text,
  });

  return {
    paragraphs: paragraphs.length > 0 ? paragraphs : openHanded(seed),
    sources,
    /* A one-line answer with a chart under it is still a long answer. */
    blocks: budget.allowBlocks && fromRecord.length > 0 ? blocks : [],
    topic: primary,
    budget,
    source: "local",
  };
}

/**
 * Is this paragraph actually about the person, or is it the responder saying
 * it has nothing?
 *
 * The responder emits a fixed apology when the record is empty. Left alone it
 * becomes the whole answer — which is precisely the "very strict" behaviour
 * this rebuild exists to remove. We drop those paragraphs and let real content
 * take their place.
 *
 * Matched on distinctive phrases rather than the full strings so that a small
 * copy edit in the responder doesn't silently reintroduce the bug. Guarded by
 * a test that feeds the responder an empty record and asserts nothing survives.
 */
const NOT_GROUNDED = [
  /i read from your own logs/i,
  /that record is empty/i,
  /rather say nothing than guess/i,
  /nothing in your record/i,
  /log one day on the trackers page/i,
  /ask me about any one of those/i,
  /that's the whole picture i can honestly speak from/i,
];

export function isGrounded(paragraph: string): boolean {
  return !NOT_GROUNDED.some((re) => re.test(paragraph));
}

function done(
  paragraphs: string[],
  topic: Topic,
  budget: Budget,
  source: "edge" | "local",
  fellBackBecause?: string,
): CoachAnswer {
  return {
    paragraphs,
    sources: [],
    blocks: [],
    topic,
    budget,
    source,
    ...(fellBackBecause ? { fellBackBecause } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/*  The public entry point                                                     */
/* -------------------------------------------------------------------------- */

const FALLBACK_REASON: Record<Exclude<EdgeResult, { ok: true }>["reason"], string> = {
  unconfigured: "no coach function configured",
  timeout: "the coach function timed out",
  aborted: "cancelled",
  error: "the coach function couldn't be reached",
};

/**
 * Ask the coach.
 *
 * Tries the edge function first (unless the local provider is selected), and
 * falls back to the device without ever surfacing an error state — the person
 * gets an answer either way, and the source is recorded on the result so the
 * UI can be honest about which one they're reading.
 */
export async function ask(input: AskInput): Promise<CoachAnswer> {
  const { primary } = detectTopics(input.text);
  const budget = budgetFor(input.text, { greeting: primary === "greeting" });

  /*
   * Greetings and thanks never touch the network. Waking a cold function to
   * say "hello" back is slow, costly, and worse than the instant local reply.
   */
  const trivial = primary === "greeting" || primary === "thanks";

  if (input.provider === "local" || trivial) {
    return answerLocally(input);
  }

  const result = await askEdge(
    {
      message: input.text,
      history: input.history.slice(-8),
      facts: toFacts(input.record),
      provider: input.provider,
      register: budget.register,
      topic: primary,
    },
    input.signal,
  );

  if (result.ok) {
    return {
      paragraphs: fitToBudget(result.paragraphs, budget),
      sources: [],
      blocks: [],
      topic: primary,
      budget,
      source: "edge",
    };
  }

  /* Cancelled means the person moved on — don't answer a question they left. */
  if (result.reason === "aborted") {
    return done([], primary, budget, "local", "cancelled");
  }

  const local = answerLocally(input);
  return { ...local, fellBackBecause: FALLBACK_REASON[result.reason] };
}

export { isCareTopic, detectTopics };
export type { Topic, Budget, CoachTurn };
