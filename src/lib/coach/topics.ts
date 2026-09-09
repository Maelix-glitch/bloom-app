/**
 * What the coach can talk about.
 *
 * The old table had eleven topics, all of them things Bloom happens to have a
 * tracker for, and anything else fell through to a generic shrug. That is why
 * it felt strict: not because it refused — there was no refusal logic at all —
 * but because it only *recognised* its own six trackers, so every other
 * question got the same nothing-answer.
 *
 * This table is deliberately wide. It covers the whole territory a wellbeing
 * companion should be able to hold a conversation about: the trackers, yes, but
 * also food, caffeine, work, relationships, money worries, motivation, grief,
 * loneliness, body image, the app itself, and plain small talk. Recognising a
 * topic doesn't mean claiming expertise in it — it means the coach can respond
 * *about that thing* instead of changing the subject back to hydration.
 *
 * Two rules hold the line:
 *   · Recognition is ordered — the most specific patterns are tested first, so
 *     "I'm anxious about my exam" is study-stress rather than generic anxiety.
 *   · A few topics are marked `care`, meaning the answer must lead with a
 *     person rather than a number. Nothing is blocked; the register changes.
 */

export type Topic =
  /* --- the trackers, which have real data behind them --- */
  | "sleep"
  | "water"
  | "study"
  | "movement"
  | "energy"
  | "screen"
  /* --- the cycle --- */
  | "period"
  /* --- inner weather --- */
  | "mood"
  | "stress"
  | "motivation"
  | "loneliness"
  | "grief"
  | "confidence"
  /* --- the body --- */
  | "food"
  | "caffeine"
  | "alcohol"
  | "pain"
  | "illness"
  | "body"
  /* --- life --- */
  | "work"
  | "relationships"
  | "money"
  | "time"
  | "habit"
  | "goals"
  /* --- the app and the conversation --- */
  | "appHelp"
  | "data"
  | "greeting"
  | "thanks"
  | "smalltalk"
  | "general";

export interface TopicSpec {
  topic: Topic;
  pattern: RegExp;
  /**
   * Lead with the person, not the record. These are the subjects where quoting
   * a seven-day average first would be tin-eared.
   */
  care?: boolean;
  /** Answerable from the person's own logs. */
  tracked?: boolean;
}

/**
 * Ordered most-specific first. Anything that mentions two topics resolves to
 * whichever appears earlier here, which is why the compound and high-stakes
 * patterns sit at the top.
 */
export const TOPICS: TopicSpec[] = [
  /* high stakes first — these must never be swallowed by a softer match */
  {
    topic: "grief",
    pattern:
      /\b(grief|grieving|bereave|passed away|died|death of|funeral|mourning|lost (my|our) )\b/i,
    care: true,
  },
  {
    topic: "loneliness",
    pattern:
      /\b(lonely|loneliness|isolated|no( |-)one to talk|by myself all|nobody (cares|understands))\b/i,
    care: true,
  },

  /*
   * "How do I log a habit?" is a question about Bloom that happens to name a
   * feature — answering it with habit statistics would be useless. So the
   * how-to patterns are tested before any subject can claim the message.
   */
  {
    topic: "data",
    pattern:
      /\b(my data|export|download|delete|erase|privacy|private|who can see|backup|sync|account)\b/i,
  },
  {
    topic: "appHelp",
    pattern:
      /\b(how do i (log|add|track|use)|where (is|do i find)|bloom|this app|the app|settings|notification|reminder|widget|install)\b/i,
  },

  /* the cycle, before "flow"/"cramp" can be read as pain */
  {
    topic: "period",
    pattern:
      /\b(period|cramp\w*|bleed\w*|pms|ovulat\w*|menstrua\w*|cycle|luteal|follicular|spotting|tampon|pad|menopaus\w*)\b/i,
    tracked: true,
  },

  /* trackers */
  {
    topic: "sleep",
    pattern:
      /\b(sleep|slept|sleeping|bedtime|bed|awake|insomnia|nap|napped|rested|restless|wak(e|ing) up|woke|waking|drowsy|snooze|dream\w*|jet ?lag|3 ?am|4 ?am|middle of the night)\b/i,
    tracked: true,
  },
  {
    topic: "caffeine",
    pattern: /\b(caffeine|coffee|espresso|latte|tea|energy drink|red bull|matcha|cola)\b/i,
  },
  {
    topic: "water",
    pattern:
      /\b(water|hydrat\w*|dehydrat\w*|thirsty|drink(ing)? (more|enough)?|glasses of|fluids)\b/i,
    tracked: true,
  },
  {
    topic: "alcohol",
    pattern: /\b(alcohol|drunk|drinking|hangover|wine|beer|spirits|sober|nights? out)\b/i,
  },
  {
    topic: "food",
    pattern:
      /\b(food|eat\w*|ate|meal|breakfast|lunch|dinner|snack\w*|diet\w*|nutrition|hungry|appetite|sugar|carbs|protein|cook\w*|skip(ped)? (a )?meal|fasting|intermittent|keto|vegan|vegetarian|supplement\w*|vitamin\w*)\b/i,
  },
  {
    topic: "study",
    pattern:
      /\b(study|studied|studying|revis\w*|homework|assignment|exam|test|coursework|lecture|class|deadline|essay|dissertation|thesis|focus|concentrat\w*|deep work|pomodoro)\b/i,
    tracked: true,
  },
  {
    topic: "movement",
    pattern:
      /\b(move(ment)?|walk\w*|exercise|workout|run(ning)?|ran|gym|steps|stretch\w*|yoga|pilates|swim\w*|cycl(e|ing) (to|home)|lift(ing)?|training|sport)\b/i,
    tracked: true,
  },
  {
    topic: "screen",
    pattern:
      /\b(screen ?time|screens?|phone|doom\w*|\w*scroll\w*|tiktok|instagram|twitter|youtube|reddit|laptop|tv|netflix|gaming|games?)\b/i,
    tracked: true,
  },
  {
    topic: "energy",
    pattern:
      /\b(energy|tired|exhaust\w*|fatigue\w*|drained|weary|knackered|burn(t|ed) out|burnout|sluggish|wired|lethargic)\b/i,
    tracked: true,
  },

  /* the body */
  {
    topic: "pain",
    pattern:
      /\b(pain|ache|aching|headache|migraine|sore|hurts?|hurting|back ?pain|nausea|stomach)\b/i,
    care: true,
  },
  {
    topic: "illness",
    pattern:
      /\b(ill|sick|unwell|fever|flu|cold|covid|infection|virus|doctor|gp|hospital|medication|prescription|symptom|therapy|therapist|counsell?ing|counsell?or|psychiatrist|psycholog\w+|diagnos\w+)\b/i,
    care: true,
  },
  {
    topic: "body",
    pattern:
      /\b(weight|body|fat|thin|skinny|mirror|appearance|how i look|ugly|hate my (body|face)|self.?image)\b/i,
    care: true,
  },

  /*
   * Life before inner weather. "worried about rent" is a money question with a
   * worry attached, not an anxiety question that happens to mention rent —
   * and the useful answer is about the money. Emotion words are the broadest
   * patterns in the table, so they must be tested last or they swallow
   * everything that has feeling in it.
   */
  /* life */
  {
    topic: "work",
    pattern:
      /\b(work|job|boss|manager|colleague|career|shift|office|meeting|interview|promotion|fired|redundan\w*|workload|overtime)\b/i,
  },
  {
    topic: "relationships",
    pattern:
      /\b(relationship|partner|boyfriend|girlfriend|husband|wife|spouse|friend\w*|family|mum|mom|dad|parents?|sibling|brother|sister|argument|fight|breakup|broke up|dating|lonely in|roommate|room ?mate|flatmate|housemate|neighbou?r|colleague|coworker|co-worker|boss|driving me (mad|insane|crazy)|can'?t stand)\b/i,
    care: true,
  },
  {
    topic: "money",
    pattern:
      /\b(money|rent|bills|afford|broke|debt|budget|salary|pay(check|day)?|financial|cost of living|expensive)\b/i,
    care: true,
  },
  {
    topic: "time",
    pattern:
      /\b(time|busy|schedule|calendar|no time|overbooked|rushed|balance|juggl\w*|prioriti\w*)\b/i,
  },

  /* inner weather */
  {
    topic: "stress",
    pattern:
      /\b(stress\w*|anxious|anxiety|overwhelm\w*|tense|panic\w*|worry|worried|nervous|dread|on edge|racing thoughts|can'?t switch off)\b/i,
    care: true,
  },
  {
    topic: "confidence",
    pattern:
      /\b(confiden\w*|self.?esteem|imposter|not good enough|failure|useless|proud|self.?worth|doubt myself)\b/i,
    care: true,
  },
  {
    topic: "motivation",
    pattern:
      /\b(motivat\w*|can'?t be bothered|procrastinat\w*|lazy|stuck|no drive|apathy|apathetic|don'?t want to|put(ting)? off)\b/i,
  },
  {
    topic: "mood",
    pattern:
      /\b(mood|feel(ing|s)?|felt|sad|down|flat|low|blue|happy|content|joy|irritable|angry|frustrated|numb|emotional|cry(ing)?|tearful)\b/i,
    care: true,
  },

  /* structure */
  {
    topic: "goals",
    pattern: /\b(goal|target|aim|ambition|resolution|want to (get|be|start)|working towards)\b/i,
  },
  {
    topic: "habit",
    pattern:
      /\b(habit|routine|streak|consisten\w*|discipline|every day|daily|stick to|keep it up)\b/i,
    tracked: true,
  },

  /* conversation */
  {
    topic: "thanks",
    pattern: /^\s*(thanks|thank you|ta|cheers|appreciate it|nice one|got it|ok(ay)?[.!]?)\s*$/i,
  },
  {
    topic: "greeting",
    pattern: /^\s*(hi|hey|hello|yo|hiya|morning|evening|good (morning|evening|afternoon|day))\b/i,
  },
  {
    topic: "smalltalk",
    pattern:
      /\b(how are you|who are you|what are you|are you (a )?(real|human|ai|bot)|your name|tell me a joke|bored)\b/i,
  },
];

const BY_TOPIC = new Map(TOPICS.map((t) => [t.topic, t]));

export const specFor = (topic: Topic): TopicSpec | undefined => BY_TOPIC.get(topic);

export const isCareTopic = (topic: Topic): boolean => specFor(topic)?.care === true;
export const isTrackedTopic = (topic: Topic): boolean => specFor(topic)?.tracked === true;

/**
 * The topic of a message, plus any others it touched.
 *
 * Returning the secondary matches is what lets an answer acknowledge the whole
 * question — "anxious about the exam" is study *and* stress, and mentioning
 * only one of them is how an assistant sounds like it wasn't listening.
 */
export function detectTopics(text: string): { primary: Topic; also: Topic[] } {
  const q = text.trim();
  if (q.length === 0) return { primary: "general", also: [] };

  const hits: Topic[] = [];
  for (const spec of TOPICS) {
    if (spec.pattern.test(q)) hits.push(spec.topic);
  }
  if (hits.length === 0) return { primary: "general", also: [] };

  /*
   * A bare greeting is only a greeting when that's all there is — "hey, why am
   * I so tired?" is a question with a hello attached.
   */
  const [first, ...rest] = hits;
  if ((first === "greeting" || first === "thanks") && rest.length > 0) {
    return { primary: rest[0]!, also: rest.slice(1) };
  }
  return { primary: first!, also: rest.slice(0, 2) };
}
