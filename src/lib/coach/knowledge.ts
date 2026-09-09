/**
 * What the coach actually knows.
 *
 * The diagnosis, from probing the old coach with ten ordinary questions:
 * widening topic *recognition* (30 topics) did nothing, because recognition and
 * answering are different layers and only the first was widened. Ask "how do I
 * stop procrastinating on my thesis?" and it was correctly detected as `study`
 * — then handed to a responder that could only read the study *tracker*, found
 * it empty, and replied:
 *
 *   "I read from your own logs … and I'd rather say nothing than guess at
 *    something I can't see. Right now that record is empty."
 *
 * That is the strictness. Not a refusal rule — a coach with no content. It
 * could only ever talk about the eight things it measures, so every real
 * question became a request to go log some data. Worse, `general` swallowed
 * everything it didn't have a tracker for ("my roommate is driving me insane",
 * "is intermittent fasting worth trying?", "how do I know if I need therapy?"),
 * and `general` is exactly the branch that emits the refusal.
 *
 * So this module gives the coach something to say. Every entry is substance
 * that stands on its own without any logged data — and when data exists, the
 * responder still leads with it and uses this to follow up.
 *
 * The bar for an entry: it must be true, non-obvious, and actionable in one
 * step. Nothing here diagnoses, and nothing here contradicts the app's job of
 * pointing at a real clinician when that's the honest answer.
 */

import type { Topic } from "./topics";

export interface Knowledge {
  /** The direct answer. One or two sentences — this is the whole reply for a short question. */
  core: string[];
  /** Where to go deeper, if the budget allows a second paragraph. */
  more?: string[];
  /** A single concrete next step. Optional — not every subject has an action. */
  step?: string[];
  /** Which tracker to weave in when the person has data. */
  reads?: string;
}

/**
 * Keyed by topic. Several topics deliberately share content shapes, but the
 * wording is specific — a generic answer is what made the old coach feel
 * hollow, and people notice a template instantly.
 */
export const KNOWLEDGE: Partial<Record<Topic, Knowledge>> = {
  /* ------------------------------------------------------------- the body */
  sleep: {
    core: [
      "The strongest lever on sleep isn't when you go to bed — it's a fixed wake time. Your body sets its clock from morning light, not from bedtime.",
      "Most broken sleep traces back to three things: an inconsistent wake time, caffeine later than about eight hours before bed, and a bedroom that isn't fully dark.",
    ],
    more: [
      "Waking at the same hour every night usually points at something rhythmic — alcohol wearing off, a warm room, or a blood-sugar dip from eating very little at dinner.",
      "Time in bed isn't the same as sleep. Lying awake for an hour trains your body to treat bed as a place for being awake, which is why sleep advice says to get up if you can't drop off.",
    ],
    step: [
      "Pick a wake time you can hold on a bad day, and hold it for a week — including the weekend. That one change moves more than anything else.",
      "Get daylight on your face within an hour of waking. Ten minutes outside beats any amount of indoor light.",
    ],
    reads: "sleep",
  },
  energy: {
    core: [
      "An afternoon crash is usually one of four things: short sleep catching up, a carb-heavy lunch, dehydration, or caffeine wearing off — and they stack.",
      "Energy follows a rhythm, not a straight line. The dip between roughly 1pm and 3pm is normal biology, not a personal failing.",
    ],
    more: [
      "Caffeine doesn't create energy, it blocks the signal that you're tired. When it clears, the whole backlog arrives at once — which is why a 3pm coffee often produces a 5pm slump.",
      "If energy is low all day rather than dipping, that's a different question — sleep quality, iron, thyroid or mood are the usual suspects, and the first three need a blood test rather than a guess.",
    ],
    step: [
      "Try a ten-minute walk at the point you'd normally reach for coffee. It's a fairer test of whether you're tired or just sedentary.",
    ],
    reads: "energy",
  },
  food: {
    core: [
      "Meal timing usually matters more than meal contents for how you feel across a day. A large lunch reliably costs you the hour after it.",
      "Before a run or any hard exercise, eat something light and mostly carbohydrate about an hour ahead. Fat and fibre sit heavily and are what causes a stitch.",
      "Most diets work for the same reason — they get you eating less without counting — and they fail for the same reason too, which is that they're hard to keep. The one you can actually live with beats the optimal one.",
      "Intermittent fasting is one way to reduce intake without counting, and it suits some people well. It tends to go badly if you train hard in the morning, or if restricting food has been a difficulty for you in the past.",
    ],
    more: [
      "Protein at breakfast blunts the mid-morning dip better than the same calories as carbohydrate — it's the most reliable single swap.",
    ],
    step: [
      "If afternoons are the problem, make lunch smaller and see if the dip moves. One week is enough to tell.",
    ],
  },
  caffeine: {
    core: [
      "Caffeine's half-life is around five to six hours, so a 4pm coffee still has a quarter of its dose working at midnight. It shortens deep sleep even when you fall asleep fine.",
    ],
    more: [
      "The tell is waking unrefreshed after a full night. You slept — you just slept lightly.",
      "Cutting it abruptly gives you two or three rough days. Halving it is easier to keep.",
    ],
    step: ["Set a cut-off eight hours before bed and hold it for a week."],
  },
  movement: {
    core: [
      "The dose that changes how you feel is far smaller than the dose that changes how you look — a brisk walk most days does most of the mood and energy work.",
      "Consistency beats intensity by a wide margin. Three easy sessions you actually do beat one hard session you dread.",
    ],
    more: [
      "Exercise is one of the few things with a same-day effect on mood and a next-day effect on sleep. It's the fastest feedback loop you have.",
    ],
    step: [
      "Make it small enough that a bad day can't stop it — ten minutes, same time, no changing clothes.",
    ],
    reads: "movement",
  },
  water: {
    core: [
      "Mild dehydration shows up as tiredness and poor concentration long before it shows up as thirst — which is why it's an easy thing to miss.",
    ],
    step: ["Keep a filled glass where you already sit. Proximity beats intention."],
    reads: "water",
  },
  illness: {
    core: [
      "I can help you notice patterns, but I can't diagnose, and I'd be doing you a disservice if I tried.",
      "If something is persistent, worsening, or frightening you, that's a doctor — not an app.",
    ],
    more: [
      "What I can do is help you arrive with good information: when it started, what makes it worse, and what your sleep and energy were doing around it. That makes a ten-minute appointment far more useful.",
    ],
  },
  pain: {
    core: [
      "Pain that is new, severe, or changing its pattern deserves a clinician rather than a chatbot.",
    ],
    more: [
      "If it's a known, recurring pain, tracking what precedes it — sleep, stress, cycle day, posture — is genuinely useful, because the trigger is rarely where the pain is.",
    ],
  },

  /* ------------------------------------------------- work, study, attention */
  study: {
    core: [
      "Procrastination is almost never laziness — it's usually that the next step is undefined, so starting means deciding, and deciding is the tiring part.",
      "Focus is a starting problem more than a sustaining problem. The first two minutes are the whole fight.",
    ],
    more: [
      "Break the work down until the next action is embarrassingly small — 'open the document and write one bad sentence' rather than 'work on the thesis'. Vague tasks are what your brain avoids.",
      "A timed block with a definite end is easier to start than open-ended work, because you're agreeing to a boundary rather than to an ordeal.",
    ],
    step: [
      "Name the single next physical action, set a timer for fifteen minutes, and give yourself permission to stop when it goes. Most of the time you won't.",
    ],
    reads: "study",
  },
  work: {
    core: [
      "Burnout isn't the same as tiredness. Tiredness recovers with rest; burnout is what happens when effort stops producing results, and rest alone doesn't fix it.",
      "The three reliable signs are exhaustion that sleep doesn't touch, cynicism about work you used to care about, and feeling ineffective at things you're actually good at.",
    ],
    more: [
      "Almost every case comes down to demand exceeding control. Where you can't reduce demand, taking back a small piece of control — over your calendar, the order of work, when you're reachable — does more than it sounds like it should.",
    ],
    step: [
      "Pick one boundary you can defend this week and defend it once. One kept boundary beats a plan you abandon.",
    ],
  },
  time: {
    core: [
      "Most time problems are priority problems wearing a disguise. The hours exist; they're already spoken for by something you haven't consciously chosen.",
    ],
    more: [
      "Try tracking where a day actually goes for two days before optimising it. People are reliably wrong about their own time, usually by hours.",
    ],
    step: [
      "Choose the one thing that must happen tomorrow and put it first, before the day can take it.",
    ],
  },
  motivation: {
    core: [
      "Waiting to feel motivated is the trap — motivation mostly arrives after you start, not before. Action generates it.",
      "When something matters and you still can't start, the obstacle is usually the size of the step, not the strength of the wanting.",
    ],
    step: ["Shrink it until it's almost too small to refuse, then do that version today."],
  },
  goals: {
    core: [
      "A goal you can't do on your worst week isn't a goal, it's a wish. Set the floor at what a bad week allows and let good weeks overshoot.",
    ],
    more: [
      "Systems beat targets: 'walk after lunch' survives a missed day in a way that 'lose ten pounds' doesn't, because the target has no instructions in it.",
    ],
  },
  habit: {
    core: [
      "Habits stick when they're anchored to something that already happens, not to a time of day. 'After I make coffee' beats '8am'.",
      "Missing once is noise. Missing twice is how a habit ends — so the rule worth keeping is never miss two in a row.",
    ],
    more: [
      "Make it obvious, small, and hard to skip. Most failed habits are simply too big on day one, set by an optimistic version of you who won't be there on Wednesday.",
    ],
    reads: "habits",
  },

  /* ---------------------------------------------------- the harder things */
  stress: {
    core: [
      "Stress narrows attention to whatever is nearest and loudest, which is why everything feels urgent and nothing feels finishable.",
      "Naming the specific thing helps more than it should. Unnamed stress spreads across everything; named stress has edges.",
    ],
    more: [
      "There's a real difference between stress with a cause you can name and anxiety that arrives without one. The first responds to changing the situation, the second to changing how you relate to it — and they need different approaches.",
      "The fastest physiological lever is your breath out. A longer exhale than inhale, for a minute, genuinely shifts the nervous system — it's not a metaphor.",
    ],
    step: [
      "Write down the specific worry in one sentence. Vague dread resists solving; a sentence can be answered.",
    ],
    reads: "stress",
  },
  mood: {
    core: [
      "A low mood that lifts when something good happens is different from one that doesn't lift at all. The second is worth taking to someone.",
      "Mood tracks sleep more tightly than most people expect — several short nights will produce a low week on their own.",
    ],
    more: [
      "Two weeks of persistent low mood, loss of interest in things you normally enjoy, or changes to sleep and appetite together — that's the threshold where talking to a doctor is the reasonable move, not an overreaction.",
    ],
    reads: "mood",
  },
  loneliness: {
    core: [
      "Loneliness is about the gap between the connection you have and the connection you want — which is why it happens in a full room.",
      "It also lies to you: it makes reaching out feel more likely to be rejected than it is, so the feeling protects itself.",
    ],
    step: [
      "Message one person something specific rather than 'we should catch up'. Specific invitations get answered.",
    ],
  },
  grief: {
    core: [
      "There's no schedule for this and nothing you're supposed to be feeling by now.",
      "Grief comes in waves rather than stages — a good week followed by a hard day isn't backsliding.",
    ],
    more: [
      "Sleep and appetite usually go first. That's ordinary, and it's worth being gentle with yourself about it rather than adding it to the list of things going wrong.",
    ],
  },
  relationships: {
    core: [
      "Most recurring conflicts aren't about the thing being argued over — they're about feeling unheard, and the topic just happens to be handy.",
      "The useful question is usually what you need, stated plainly, rather than what they did wrong.",
    ],
    more: [
      "Living with someone difficult is its own problem: you can't fix them, and the energy spent trying is the part you control. Boundaries about your own time and space tend to work better than requests for them to change.",
    ],
  },
  confidence: {
    core: [
      "Confidence is downstream of evidence, not a prerequisite for it. It arrives from having done the thing badly a few times.",
    ],
    more: [
      "The inner voice that says you're not good enough is usually repeating something old and specific. It's worth noticing whose voice it actually is.",
    ],
  },
  money: {
    core: [
      "Money worry is one of the most reliable sleep disruptors there is, and it's rarely helped by thinking about it at midnight.",
    ],
    more: [
      "Vague financial dread is heavier than a specific number. Actually looking — writing down what's owed and when — usually reduces the weight even when the number is bad.",
    ],
    step: ["Give it a scheduled slot in daylight, so it isn't the thing you carry to bed."],
  },
  alcohol: {
    core: [
      "Alcohol gets you to sleep faster and makes the sleep worse — it suppresses REM and fragments the second half of the night.",
    ],
    more: [
      "It's also why a drink to unwind can leave you more anxious the next day: the rebound is real and it lands in the morning.",
    ],
  },
  screen: {
    core: [
      "The problem with screens before bed is usually the content, not the blue light — the light effect is modest, but anything engaging keeps you alert.",
    ],
    step: [
      "Choose where the phone sleeps, and make it another room. Willpower loses to proximity.",
    ],
    reads: "screen",
  },
  body: {
    core: [
      "How you feel about your body and how your body is doing are different questions, and they need different kinds of help.",
    ],
    more: [
      "Tracking can help with the second and can quietly make the first worse. If the numbers are making you feel worse rather than more informed, that's a good reason to stop looking at them.",
    ],
  },

  /* --------------------------------------------------------------- cycle */
  period: {
    core: [
      "Cycle length varies normally between about 21 and 35 days, and a few days' variation month to month is expected rather than a problem.",
      "For cramps, heat, movement and anti-inflammatories taken early — before the pain peaks — cover most of it.",
    ],
    more: [
      "The luteal phase — after ovulation, before your period — is where most people notice energy and mood dip. It's the most predictable part of the cycle, which makes it the easiest to plan around.",
      "Flow and pain vary a lot between people and across a life. What matters is a change from your own normal, not a comparison with anyone else's.",
    ],
    step: [
      "Pain that stops you doing normal things, or that is getting worse over time, isn't something to just manage — that's worth a doctor.",
    ],
    reads: "cycle",
  },
  /* --------------------------------------------------------- the app itself */
  appHelp: {
    core: [
      "Everything lives in one of four places: Trackers for the daily numbers, Cycle for periods and predictions, Mood for check-ins, and Profile for settings and your data.",
    ],
    more: [
      "Your record is yours — Profile has a download of everything, an import for period history from another app, and an erase that clears both this device and the account.",
    ],
  },
  data: {
    core: [
      "Your logs stay on your device and in your own Supabase project. Nothing is sold, shared, or used to train anything.",
    ],
    more: [
      "When the coach uses a remote model it sends derived facts — averages and trends — rather than raw entries, and only for the question you asked.",
      "Profile has a full export and a complete erase. Both do exactly what they say.",
    ],
  },
};

/** Does the coach have something substantive to say about this? */
export const hasKnowledge = (topic: Topic): boolean => topic in KNOWLEDGE;

/* -------------------------------------------------------------------------- */
/*  APP_FACTS — what the coach knows about Bloom itself                        */
/* -------------------------------------------------------------------------- */

export interface AppFact {
  key: string;
  /** Any one matching pattern answers the question from the rules below. */
  patterns: RegExp[];
  paragraphs: string[];
}

/**
 * Questions about Bloom itself are answered from Bloom's own rules — never by
 * reading the person's (possibly empty) record. "How do I earn points?" used
 * to fall into the general responder, which looked at an empty log and
 * deflected with "your record is empty". Points come from the app's rules,
 * not from any log, so the app-facts branch answers first and the record is
 * never consulted. Guarded by app-facts.test.ts.
 */
export const APP_FACTS: AppFact[] = [
  {
    key: "points",
    patterns: [
      /\bhow (do|can|to) .{0,24}(earn|get|win|collect|make) .{0,12}(points?|rewards?)\b/i,
      /\b(points|rewards?)\b.{0,40}(earn|get|work|tracked|counted)\b/i,
      /\b(what are|how do) (bloom )?points\b/i,
      /\bhow (do|does) (i |you |the )?points? (work|add up)\b/i,
      /\bwhat('| a)?re (the )?rewards?\b/i,
    ],
    paragraphs: [
      "Habit ticks earn points — ten per tick by default — and your running total is on the Rewards page. Points are Bloom's way of making a streak visible, not a currency with hidden rules.",
      "If you're not earning as you'd expect, check that the habit is still active and unpaused: paused and archived habits don't tick, so they don't earn.",
    ],
  },
  {
    key: "overview",
    patterns: [
      /\bwhat is bloom\b/i,
      /\bwhat('| i)s this app\b/i,
      /\bwhat does bloom (do|track|have)\b/i,
      /\btell me about (bloom|this app)\b/i,
      /\bwhat can i (do|track|log|use) (in|with|on) bloom\b/i,
      /\boverview\b.{0,20}bloom\b|\bbloom\b.{0,20}overview\b/i,
    ],
    paragraphs: [
      "Bloom is a private wellbeing companion. You check in with how you feel, log the daily trackers — sleep, water, study, movement, energy, screen time — keep habits with reminders, and track your cycle if you want to. Bloom's coach reads the record and talks with you about your days, and can act inside the app for you: create habits, log a value, set a goal.",
      "Everything is stored on your device by default and only ever syncs to a database you own. There is no Bloom server holding your data, and Profile has a full export and a complete erase.",
    ],
  },
  {
    key: "skills",
    patterns: [
      /\bwhat can you do\b/i,
      /\bwhat are your (skills|abilities|capabilities)\b/i,
      /\bwhat do you (help|do) with\b/i,
      /\bhow (can|do) you help (me|people)\b/i,
      /\b(list|tell me) your (skills|abilities|capabilities)\b/i,
    ],
    paragraphs: [
      "Broadly: talk with you about your life, read your Bloom record to keep it grounded, act inside the app, look at photos, and remember what matters to you.",
      "Concretely — I can discuss sleep, food and nutrition, fitness and training, stress and anxiety, work, study, relationships, money, grief and more; answer from your logs when a question is about your week; create or tick a habit, log sleep, water, movement, screen time or energy, and set a tracker goal; estimate the calories and macros in a food photo; and keep facts you share in mind for later conversations. Anything I do in the app is visible on its own page and can be changed there.",
    ],
  },
];

/** The first fact whose question-patterns match, or null when it's not an app question. */
export function appFactFor(text: string): AppFact | null {
  for (const fact of APP_FACTS) {
    if (fact.patterns.some((re) => re.test(text))) return fact;
  }
  return null;
}

export const APP_FACT_SOURCE = "Bloom's own rules";

/**
 * Topics where the honest answer includes "talk to a person". Used to make
 * sure the coach never buries that under advice.
 */
export const CLINICAL = new Set<Topic>(["illness", "pain", "grief", "mood"]);
