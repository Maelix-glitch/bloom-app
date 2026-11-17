/**
 * Vitalis core — the pure, shared logic of Vitalis phases 3–5.
 *
 * This module is deliberately dependency-free and free of any runtime
 * globals (no Deno, no DOM, no imports): the coach edge function
 * imports it from inside its own directory (the only place a deployed
 * Supabase function may import from), and the app + vitest import the
 * very same file, so what is tested here is exactly what runs
 * server-side — the deliberation checks are behaviourally tested, not
 * merely source-pinned.
 *
 * What lives here:
 *   · the structured Vitalis record (schema v1) the client assembles
 *     alongside the rendered context text, and its strict validator;
 *   · number verification — every numeric claim in a draft must trace
 *     to a number in the record, or the draft is revised;
 *   · rule checks — Assessment allergies/dislikes are hard exclusions,
 *     the eating pattern binds, pregnancy / eating-disorder safety
 *     answers ban deficit framing, diagnosis claims are refused, and
 *     a red-flag symptom in the person's message forces a clinician
 *     direction in the reply;
 *   · the enjoyment check — a recommendation should prefer what the
 *     record shows the person actually logs and likes;
 *   · action proposals — the fenced `bloom-action` blocks, their
 *     allowlist and payload schemas;
 *   · the deliberation orchestrator itself, with the model caller
 *     injected, so the staged draft → verify → revise loop (bounded
 *     at two revises, then an honest fallback) runs identically in
 *     tests and in the function.
 */

/* ================================================================== */
/*  The structured record (schema v1)                                  */
/* ================================================================== */

export interface VitalisRecordData {
  v: 1;
  /** The Assessment's eating pattern, or null when unstated. */
  pattern: string | null;
  allergies: string[];
  dislikes: string[];
  intolerances: string[];
  safety: {
    pregnantOrBreastfeeding: boolean | null;
    eatingDisorderHistory: boolean | null;
    takesMedication: boolean | null;
    unexplainedWeightChange: boolean | null;
    conditions: string[];
    symptoms: string[];
  };
  /** Engine targets, or null when none may be quoted. */
  targets: { kcal: number; proteinG: number } | null;
  targetsBlocked: boolean;
  plan: {
    day: string;
    kcal: number;
    proteinG: number;
    meals: { meal: string; kcal: number; proteinG: number; items: string[]; dishIds: string[] }[];
  } | null;
  todayTotals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  /** Library dishes that suit the person — the only dishes a proposal
   *  (or recommendation) may name, by id. */
  dishes: { id: string; name: string; kcal: number; proteinG: number }[];
  /** The person's own foods — the only foods a log_food proposal may
   *  name, by id. Values are per 100 g, as entered. */
  foods: { id: string; name: string; kcalPer100g: number; proteinPer100g: number }[];
  /** Names the person has actually logged (today + recent days) — the
   *  enjoyment check's evidence of what they really eat. */
  loggedNames: string[];
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  Boolean(x) && typeof x === "object" && !Array.isArray(x);

const isStr = (x: unknown, max: number): x is string =>
  typeof x === "string" && x.length <= max;

const isNum = (x: unknown, min: number, max: number): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;

function strList(x: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(x) || x.length > maxItems) return null;
  const out: string[] = [];
  for (const item of x) {
    if (!isStr(item, maxLen)) return null;
    out.push(item);
  }
  return out;
}

function boolOrNull(x: unknown): boolean | null | undefined {
  return x === null || typeof x === "boolean" ? x : undefined;
}

/**
 * Strictly validate a client-sent structured record. Anything present
 * but malformed is a structural forgery signal (the real builder's
 * output always validates); absence is handled by the caller and is
 * not, by itself, an offence.
 */
export function validateVitalisRecord(
  raw: unknown,
): { ok: true; record: VitalisRecordData } | { ok: false; reason: string } {
  if (!isObj(raw)) return { ok: false, reason: "record is not an object" };
  if (raw["v"] !== 1) return { ok: false, reason: "record version is not 1" };
  const pattern = raw["pattern"];
  if (!(pattern === null || isStr(pattern, 40))) {
    return { ok: false, reason: "pattern malformed" };
  }
  const allergies = strList(raw["allergies"], 60, 120);
  const dislikes = strList(raw["dislikes"], 60, 120);
  const intolerances = strList(raw["intolerances"], 60, 120);
  if (!allergies || !dislikes || !intolerances) {
    return { ok: false, reason: "preference lists malformed" };
  }
  const safetyRaw = raw["safety"];
  if (!isObj(safetyRaw)) return { ok: false, reason: "safety malformed" };
  const pregnant = boolOrNull(safetyRaw["pregnantOrBreastfeeding"]);
  const edHistory = boolOrNull(safetyRaw["eatingDisorderHistory"]);
  const meds = boolOrNull(safetyRaw["takesMedication"]);
  const weightChange = boolOrNull(safetyRaw["unexplainedWeightChange"]);
  if (pregnant === undefined || edHistory === undefined || meds === undefined || weightChange === undefined) {
    return { ok: false, reason: "safety flags malformed" };
  }
  const conditions = strList(safetyRaw["conditions"], 40, 120);
  const symptoms = strList(safetyRaw["symptoms"], 40, 120);
  if (!conditions || !symptoms) return { ok: false, reason: "safety lists malformed" };

  let targets: VitalisRecordData["targets"] = null;
  const targetsRaw = raw["targets"];
  if (targetsRaw !== null) {
    if (
      !isObj(targetsRaw) ||
      !isNum(targetsRaw["kcal"], 1, 20000) ||
      !isNum(targetsRaw["proteinG"], 0, 2000)
    ) {
      return { ok: false, reason: "targets malformed" };
    }
    targets = { kcal: targetsRaw["kcal"], proteinG: targetsRaw["proteinG"] };
  }
  if (typeof raw["targetsBlocked"] !== "boolean") {
    return { ok: false, reason: "targetsBlocked malformed" };
  }

  let plan: VitalisRecordData["plan"] = null;
  const planRaw = raw["plan"];
  if (planRaw !== null) {
    if (
      !isObj(planRaw) ||
      !isStr(planRaw["day"], 16) ||
      !isNum(planRaw["kcal"], 0, 40000) ||
      !isNum(planRaw["proteinG"], 0, 4000) ||
      !Array.isArray(planRaw["meals"]) ||
      planRaw["meals"].length > 12
    ) {
      return { ok: false, reason: "plan malformed" };
    }
    const meals: NonNullable<VitalisRecordData["plan"]>["meals"] = [];
    for (const m of planRaw["meals"]) {
      if (
        !isObj(m) ||
        !isStr(m["meal"], 40) ||
        !isNum(m["kcal"], 0, 20000) ||
        !isNum(m["proteinG"], 0, 2000)
      ) {
        return { ok: false, reason: "plan meal malformed" };
      }
      const items = strList(m["items"], 40, 200);
      if (!items) return { ok: false, reason: "plan meal items malformed" };
      /* dishIds: the meal's plan dishes, by library id — what a
         swap_dish proposal names. Absent on records built before the
         swap tool existed; read as empty (swaps then fail closed). */
      const dishIds = m["dishIds"] === undefined ? [] : strList(m["dishIds"], 6, 80);
      if (!dishIds) return { ok: false, reason: "plan meal dishIds malformed" };
      meals.push({ meal: m["meal"], kcal: m["kcal"], proteinG: m["proteinG"], items, dishIds });
    }
    plan = { day: planRaw["day"], kcal: planRaw["kcal"], proteinG: planRaw["proteinG"], meals };
  }

  const totalsRaw = raw["todayTotals"];
  if (
    !isObj(totalsRaw) ||
    !isNum(totalsRaw["kcal"], 0, 40000) ||
    !isNum(totalsRaw["proteinG"], 0, 4000) ||
    !isNum(totalsRaw["carbsG"], 0, 4000) ||
    !isNum(totalsRaw["fatG"], 0, 4000)
  ) {
    return { ok: false, reason: "todayTotals malformed" };
  }

  const dishesRaw = raw["dishes"];
  if (!Array.isArray(dishesRaw) || dishesRaw.length > 200) {
    return { ok: false, reason: "dishes malformed" };
  }
  const dishes: VitalisRecordData["dishes"] = [];
  for (const d of dishesRaw) {
    if (
      !isObj(d) ||
      !isStr(d["id"], 120) ||
      !isStr(d["name"], 200) ||
      !isNum(d["kcal"], 0, 5000) ||
      !isNum(d["proteinG"], 0, 500)
    ) {
      return { ok: false, reason: "dish entry malformed" };
    }
    dishes.push({ id: d["id"], name: d["name"], kcal: d["kcal"], proteinG: d["proteinG"] });
  }

  const foodsRaw = raw["foods"];
  if (!Array.isArray(foodsRaw) || foodsRaw.length > 200) {
    return { ok: false, reason: "foods malformed" };
  }
  const foods: VitalisRecordData["foods"] = [];
  for (const f of foodsRaw) {
    if (
      !isObj(f) ||
      !isStr(f["id"], 120) ||
      !isStr(f["name"], 200) ||
      !isNum(f["kcalPer100g"], 0, 5000) ||
      !isNum(f["proteinPer100g"], 0, 500)
    ) {
      return { ok: false, reason: "food entry malformed" };
    }
    foods.push({
      id: f["id"],
      name: f["name"],
      kcalPer100g: f["kcalPer100g"],
      proteinPer100g: f["proteinPer100g"],
    });
  }

  const loggedNames = strList(raw["loggedNames"], 120, 200);
  if (!loggedNames) return { ok: false, reason: "loggedNames malformed" };

  return {
    ok: true,
    record: {
      v: 1,
      pattern,
      allergies,
      dislikes,
      intolerances,
      safety: {
        pregnantOrBreastfeeding: pregnant,
        eatingDisorderHistory: edHistory,
        takesMedication: meds,
        unexplainedWeightChange: weightChange,
        conditions,
        symptoms,
      },
      targets,
      targetsBlocked: raw["targetsBlocked"],
      plan,
      todayTotals: {
        kcal: totalsRaw["kcal"],
        proteinG: totalsRaw["proteinG"],
        carbsG: totalsRaw["carbsG"],
        fatG: totalsRaw["fatG"],
      },
      dishes,
      foods,
      loggedNames,
    },
  };
}

/* ================================================================== */
/*  Number verification                                                */
/* ================================================================== */

export interface ClaimedNumber {
  value: number;
  raw: string;
}

/**
 * The numbers a draft CLAIMS: any number carrying a nutrition unit
 * (kcal, g, %, kg…), plus any bare number of 100 or more. Small bare
 * numbers — times, counts, "two eggs" — are conversation, not claims,
 * and are left alone so an honest draft is never revised over "7 pm".
 */
export function extractClaimedNumbers(text: string): ClaimedNumber[] {
  const out: ClaimedNumber[] = [];
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(kcal|calories|calorie|cal|kg|grams|gram|g|%|percent|mg)?(?![a-z0-9])/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1]!;
    const value = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    const unit = match[2]?.toLowerCase();
    if (unit || value >= 100) out.push({ value, raw });
  }
  return out;
}

/** Every number the record itself carries: all numbers appearing in
 *  the rendered context text, plus the structured record's values. */
export function recordNumberSet(record: VitalisRecordData, contextText: string): Set<number> {
  const set = new Set<number>();
  const re = /\d[\d,]*(?:\.\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(contextText)) !== null) {
    const value = Number(match[0].replace(/,/g, ""));
    if (Number.isFinite(value)) set.add(value);
  }
  const add = (n: number | null | undefined) => {
    if (typeof n === "number" && Number.isFinite(n)) set.add(n);
  };
  add(record.targets?.kcal);
  add(record.targets?.proteinG);
  add(record.plan?.kcal);
  add(record.plan?.proteinG);
  for (const meal of record.plan?.meals ?? []) {
    add(meal.kcal);
    add(meal.proteinG);
  }
  add(record.todayTotals.kcal);
  add(record.todayTotals.proteinG);
  add(record.todayTotals.carbsG);
  add(record.todayTotals.fatG);
  for (const d of record.dishes) {
    add(d.kcal);
    add(d.proteinG);
  }
  for (const f of record.foods) {
    add(f.kcalPer100g);
    add(f.proteinPer100g);
  }
  return set;
}

/** A claim verifies when a record number sits within rounding
 *  distance — the model may round a gram, never invent a figure. */
function numberVerifies(value: number, set: Set<number>): boolean {
  for (const r of set) {
    if (Math.abs(value - r) <= Math.max(0.6, 0.002 * r)) return true;
  }
  return false;
}

export interface CheckFailure {
  kind:
    | "number"
    | "allergen"
    | "dislike"
    | "pattern"
    | "safety-framing"
    | "diagnosis"
    | "red-flag"
    | "enjoyment"
    | "proposal";
  /** What failed, for logs and the fallback's honest reason line. */
  detail: string;
  /** The instruction handed to the revise pass. */
  reviseNote: string;
}

export function verifyNumbers(
  prose: string,
  record: VitalisRecordData,
  contextText: string,
): CheckFailure[] {
  const set = recordNumberSet(record, contextText);
  const failures: CheckFailure[] = [];
  for (const claim of extractClaimedNumbers(prose)) {
    if (!numberVerifies(claim.value, set)) {
      failures.push({
        kind: "number",
        detail: `unverifiable number: ${claim.raw}`,
        reviseNote: `The number ${claim.raw} does not appear anywhere in the person's record. Remove it, or replace it with a figure the record actually carries — never estimate one.`,
      });
    }
  }
  return failures;
}

/* ================================================================== */
/*  Rule checks                                                        */
/* ================================================================== */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Word-boundary match for a free-text food term ("peanuts" the
 *  person typed matches "peanut" in a draft, and vice versa). */
function termAppears(term: string, text: string): boolean {
  const base = term.trim().toLowerCase().replace(/s$/, "");
  if (base.length < 3) return false;
  return new RegExp(`\\b${escapeRegExp(base)}s?\\b`, "i").test(text);
}

const MEAT_TERMS = [
  "beef", "pork", "chicken", "lamb", "mutton", "goat meat", "bacon", "ham",
  "sausage", "salami", "pepperoni", "turkey", "duck", "veal", "venison",
  "meat", "mince",
];
const FISH_TERMS = [
  "fish", "salmon", "tuna", "sardine", "mackerel", "anchovy", "prawn",
  "shrimp", "crab", "lobster", "squid", "octopus", "oyster", "mussel",
  "cod", "trout", "haddock", "seafood",
];
const EGG_TERMS = ["egg", "omelette", "omelet", "mayonnaise"];
const DAIRY_TERMS = [
  "milk", "cheese", "paneer", "yogurt", "yoghurt", "curd", "ghee",
  "butter", "cream", "mozzarella", "cheddar", "parmesan", "feta", "whey",
];
const PLANT_MILK_PREFIXES = ["coconut", "oat", "almond", "soy", "soya", "rice", "cashew"];

/** Term match with a plant-milk guard: "coconut milk" is not dairy. */
function foodTermAppears(term: string, text: string): boolean {
  const re = new RegExp(`\\b${escapeRegExp(term)}s?\\b`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (term === "milk" || term === "cream") {
      const before = text.slice(Math.max(0, match.index - 14), match.index).toLowerCase();
      if (PLANT_MILK_PREFIXES.some((p) => before.trimEnd().endsWith(p))) continue;
    }
    return true;
  }
  return false;
}

function patternTerms(pattern: string | null): { terms: string[]; label: string } | null {
  switch (pattern) {
    case "vegetarian":
    case "eggetarian":
      return { terms: [...MEAT_TERMS, ...FISH_TERMS], label: pattern };
    case "pescatarian":
      return { terms: MEAT_TERMS, label: pattern };
    case "vegan":
      return { terms: [...MEAT_TERMS, ...FISH_TERMS, ...EGG_TERMS, ...DAIRY_TERMS], label: pattern };
    default:
      return null;
  }
}

const DIAGNOSIS_RE =
  /\byou have (type [12] )?(diabetes|anaemia|anemia|hypertension|high blood pressure|hypothyroidism|hyperthyroidism|pcos|kidney disease|liver disease|cancer|depression|an eating disorder)\b/i;

const RED_FLAG_TERMS = [
  "chest pain", "can't breathe", "cannot breathe", "difficulty breathing",
  " trouble breathing", "fainted", "fainting", "passed out", "vomiting blood",
  "blood in my stool", "blood in stool", "severe pain", "allergic reaction",
  "lips are swelling", "tongue swelling", "throat is swelling", "suicidal",
  "kill myself", "self-harm", "self harm", "overdose",
];

const CLINICIAN_RE = /clinician|doctor|medical|emergency|hospital|urgent|a&e|er\b/i;

const DEFICIT_FRAMING_TERMS = [
  "calorie deficit", "deficit", "cut calories", "cutting calories",
  "lose weight", "losing weight", "weight loss", "skip meals",
  "intermittent fasting", "eat less",
];

/** True when the person's own message raises a red-flag symptom. */
export function messageHasRedFlag(message: string): boolean {
  const lower = ` ${message.toLowerCase()} `;
  return RED_FLAG_TERMS.some((t) => lower.includes(t));
}

export function checkRules(
  prose: string,
  proposals: readonly VitalisActionProposal[],
  record: VitalisRecordData,
  userMessage: string,
): CheckFailure[] {
  const failures: CheckFailure[] = [];
  const proposalNames = proposals
    .map((p) => {
      if (p.action === "log_dish") return record.dishes.find((d) => d.id === p.dishId)?.name ?? "";
      if (p.action === "log_food") return record.foods.find((f) => f.id === p.foodId)?.name ?? "";
      if (p.action === "swap_dish")
        return record.dishes.find((d) => d.id === p.toDishId)?.name ?? "";
      return "";
    })
    .filter(Boolean);
  const haystacks = [prose, ...proposalNames];

  for (const allergy of record.allergies) {
    if (haystacks.some((h) => termAppears(allergy, h))) {
      failures.push({
        kind: "allergen",
        detail: `allergen named: ${allergy}`,
        reviseNote: `The draft suggests or names "${allergy}", which is on the person's allergy list. Remove it completely and suggest something else from the record — allergies are absolute.`,
      });
    }
  }
  for (const dislike of record.dislikes) {
    if (haystacks.some((h) => termAppears(dislike, h))) {
      failures.push({
        kind: "dislike",
        detail: `disliked food named: ${dislike}`,
        reviseNote: `The draft suggests "${dislike}", which the person has said they dislike. Replace it with something else from the record.`,
      });
    }
  }

  const pattern = patternTerms(record.pattern);
  if (pattern) {
    for (const term of pattern.terms) {
      if (haystacks.some((h) => foodTermAppears(term, h))) {
        failures.push({
          kind: "pattern",
          detail: `pattern violation: ${term} for ${pattern.label}`,
          reviseNote: `The draft suggests "${term}", which breaks the person's ${pattern.label} eating pattern. Replace it with something from the record that suits their pattern.`,
        });
        break;
      }
    }
  }

  if (
    record.safety.pregnantOrBreastfeeding === true ||
    record.safety.eatingDisorderHistory === true
  ) {
    const lower = prose.toLowerCase();
    const hit = DEFICIT_FRAMING_TERMS.find((t) => lower.includes(t));
    if (hit) {
      failures.push({
        kind: "safety-framing",
        detail: `deficit framing with a safety flag: ${hit}`,
        reviseNote: `The draft uses "${hit}" — the person's safety answers rule out all deficit and weight-loss framing. Rewrite gently, around nourishment and what food can do for them, with no targets pressure.`,
      });
    }
  }

  if (DIAGNOSIS_RE.test(prose)) {
    failures.push({
      kind: "diagnosis",
      detail: "diagnosis claim in draft",
      reviseNote:
        "The draft states or implies a diagnosis. Vitalis never diagnoses: remove the claim, and if the topic matters, direct them to a clinician in one calm sentence.",
    });
  }

  if (messageHasRedFlag(userMessage) && !CLINICIAN_RE.test(prose)) {
    failures.push({
      kind: "red-flag",
      detail: "red-flag symptom raised, no clinician direction in draft",
      reviseNote:
        "The person mentioned a symptom that needs a clinician, and the draft does not say so. Add one calm, clear sentence directing them to a doctor or clinician (or urgent care if it is happening now) before any food talk.",
    });
  }

  return failures;
}

/* ================================================================== */
/*  Enjoyment check                                                    */
/* ================================================================== */

/**
 * A recommendation earns a revise when it names only dishes/foods the
 * person has never logged while the record holds a familiar option
 * they demonstrably eat. Silence (no recommendation named) passes.
 */
export function checkEnjoyment(prose: string, record: VitalisRecordData): CheckFailure | null {
  if (record.loggedNames.length === 0) return null;
  const lower = prose.toLowerCase();
  const named = (name: string) => name.length >= 4 && lower.includes(name.toLowerCase());
  const mentioned = [
    ...record.dishes.filter((d) => named(d.name)).map((d) => d.name),
    ...record.foods.filter((f) => named(f.name)).map((f) => f.name),
  ];
  if (mentioned.length === 0) return null;
  const logged = new Set(record.loggedNames.map((n) => n.toLowerCase()));
  if (mentioned.some((m) => logged.has(m.toLowerCase()))) return null;
  const familiar = record.loggedNames.filter((n) =>
    [...record.dishes.map((d) => d.name), ...record.foods.map((f) => f.name)].some(
      (avail) => avail.toLowerCase() === n.toLowerCase(),
    ),
  );
  if (familiar.length === 0) return null;
  return {
    kind: "enjoyment",
    detail: `recommendation ignores logged favourites (${familiar.slice(0, 2).join(", ")})`,
    reviseNote: `The draft recommends only things the person has never logged, while the record shows they actually eat ${familiar
      .slice(0, 3)
      .join(", ")}. Prefer what they demonstrably enjoy where it fits the question.`,
  };
}

/* ================================================================== */
/*  Action proposals (phase 4)                                         */
/* ================================================================== */

export type VitalisMeal = "breakfast" | "lunch" | "dinner" | "snack";
export const VITALIS_MEALS: readonly VitalisMeal[] = ["breakfast", "lunch", "dinner", "snack"];

export type VitalisActionProposal =
  | { action: "log_dish"; dishId: string; meal: VitalisMeal }
  | { action: "log_food"; foodId: string; grams: number; meal: VitalisMeal }
  | { action: "compose_plan" }
  | { action: "swap_dish"; meal: VitalisMeal; fromDishId: string; toDishId: string }
  | { action: "propose_assessment_change"; field: string; value: unknown };

export const VITALIS_ACTION_ALLOWLIST: readonly string[] = [
  "log_dish",
  "log_food",
  "compose_plan",
  "swap_dish",
  "propose_assessment_change",
];

export const ASSESSMENT_CHANGE_FIELDS: readonly string[] = [
  "goal",
  "dietaryPattern",
  "mealsPerDay",
  "foodBudget",
  "addDislikedFood",
  "addAllergy",
];

const GOAL_VALUES = ["lose", "maintain", "gain", "recomp", "general_health"];
const PATTERN_VALUES = ["omnivore", "vegetarian", "vegan", "eggetarian", "pescatarian", "other"];

const ACTION_BLOCK_RE = /```bloom-action\s*\n?([\s\S]*?)```/g;

/**
 * Split a model reply into prose and its raw action blocks. A block
 * whose JSON does not parse is reported as malformed — it is never
 * rendered, never applied, and (server-side) counts as an invalid
 * proposal.
 */
export function parseActionBlocks(text: string): {
  prose: string;
  rawProposals: unknown[];
  malformedBlocks: number;
} {
  const rawProposals: unknown[] = [];
  let malformedBlocks = 0;
  const prose = text
    .replace(ACTION_BLOCK_RE, (_whole, inner: string) => {
      try {
        rawProposals.push(JSON.parse(inner.trim()));
      } catch {
        malformedBlocks += 1;
      }
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { prose, rawProposals, malformedBlocks };
}

export function validateProposal(
  raw: unknown,
  record: VitalisRecordData,
): { ok: true; proposal: VitalisActionProposal } | { ok: false; reason: string } {
  if (!isObj(raw)) return { ok: false, reason: "proposal is not an object" };
  const action = raw["action"];
  if (typeof action !== "string" || !VITALIS_ACTION_ALLOWLIST.includes(action)) {
    return { ok: false, reason: `action not allowlisted: ${String(action)}` };
  }
  const meal = raw["meal"];
  const mealOk = typeof meal === "string" && (VITALIS_MEALS as readonly string[]).includes(meal);

  switch (action) {
    case "log_dish": {
      const dishId = raw["dishId"];
      if (typeof dishId !== "string" || !record.dishes.some((d) => d.id === dishId)) {
        return { ok: false, reason: "log_dish names a dish outside the record" };
      }
      if (!mealOk) return { ok: false, reason: "log_dish meal malformed" };
      return { ok: true, proposal: { action: "log_dish", dishId, meal: meal as VitalisMeal } };
    }
    case "log_food": {
      const foodId = raw["foodId"];
      if (typeof foodId !== "string" || !record.foods.some((f) => f.id === foodId)) {
        return { ok: false, reason: "log_food names a food outside the record" };
      }
      if (!isNum(raw["grams"], 1, 2000)) return { ok: false, reason: "log_food grams malformed" };
      if (!mealOk) return { ok: false, reason: "log_food meal malformed" };
      return {
        ok: true,
        proposal: { action: "log_food", foodId, grams: raw["grams"], meal: meal as VitalisMeal },
      };
    }
    case "compose_plan":
      return { ok: true, proposal: { action: "compose_plan" } };
    case "swap_dish": {
      /* A swap names a dish that is IN the named meal of the person's
         current plan and a replacement from the record's suitable
         dishes — the same list every other proposal draws from, so
         pattern, budget, allergy and dislike suitability is inherited,
         never re-judged here. */
      if (!mealOk) return { ok: false, reason: "swap_dish meal malformed" };
      const fromDishId = raw["fromDishId"];
      const toDishId = raw["toDishId"];
      if (typeof fromDishId !== "string" || typeof toDishId !== "string") {
        return { ok: false, reason: "swap_dish dish ids malformed" };
      }
      if (fromDishId === toDishId) return { ok: false, reason: "swap_dish swaps a dish for itself" };
      const planMeal = record.plan?.meals.find((m) => m.meal === meal);
      if (!planMeal) return { ok: false, reason: "swap_dish names a meal outside the plan" };
      if (!planMeal.dishIds.includes(fromDishId)) {
        return { ok: false, reason: "swap_dish from-dish is not in that plan meal" };
      }
      if (!record.dishes.some((d) => d.id === toDishId)) {
        return { ok: false, reason: "swap_dish names a replacement outside the record" };
      }
      if (planMeal.dishIds.includes(toDishId)) {
        return { ok: false, reason: "swap_dish replacement is already in that meal" };
      }
      return {
        ok: true,
        proposal: { action: "swap_dish", meal: meal as VitalisMeal, fromDishId, toDishId },
      };
    }
    case "propose_assessment_change": {
      const field = raw["field"];
      if (typeof field !== "string" || !ASSESSMENT_CHANGE_FIELDS.includes(field)) {
        return { ok: false, reason: `assessment field not allowlisted: ${String(field)}` };
      }
      const value = raw["value"];
      const valueOk =
        field === "goal"
          ? typeof value === "string" && GOAL_VALUES.includes(value)
          : field === "dietaryPattern"
            ? typeof value === "string" && PATTERN_VALUES.includes(value)
            : field === "mealsPerDay"
              ? typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6
              : field === "foodBudget"
                ? value === null || value === 1 || value === 2 || value === 3
                : /* addDislikedFood / addAllergy: one short free-text item */
                  typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 60;
      if (!valueOk) return { ok: false, reason: `assessment value malformed for ${field}` };
      return { ok: true, proposal: { action: "propose_assessment_change", field, value } };
    }
    default:
      return { ok: false, reason: `action not allowlisted: ${String(action)}` };
  }
}

/** Keep only the proposals that validate — used by the server before
 *  returning a reply and by the client again before rendering a card
 *  (defence in depth: neither side trusts the other's parse). */
export function sanitizeProposals(
  rawList: readonly unknown[],
  record: VitalisRecordData,
): { proposals: VitalisActionProposal[]; invalidCount: number } {
  const proposals: VitalisActionProposal[] = [];
  let invalidCount = 0;
  for (const raw of rawList) {
    const result = validateProposal(raw, record);
    if (result.ok) proposals.push(result.proposal);
    else invalidCount += 1;
  }
  return { proposals, invalidCount };
}

/* ================================================================== */
/*  Plan-intent detection (client flag + server escalation share it)   */
/* ================================================================== */

export function looksLikePlanRequest(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\b(plan|menu)\b/.test(m) ||
    /what (should|can|could) i (eat|have|cook|make)/.test(m) ||
    /\b(recommend|suggest|suggestion|ideas? for)\b/.test(m) ||
    /(breakfast|lunch|dinner|snack) (idea|ideas|plan|suggestion)/.test(m) ||
    /\b(make|build|create|compose|put together)\b[^.?!]{0,40}\b(plan|menu|meals?)\b/.test(m) ||
    /what'?s for (breakfast|lunch|dinner)/.test(m)
  );
}

/* ================================================================== */
/*  The deliberation orchestrator (phase 3)                            */
/* ================================================================== */

export type DeliberationStageId =
  | "drafting"
  | "verifying"
  | "rules"
  | "enjoyment"
  | "revising"
  | "done";

export const STAGE_LABELS: Record<DeliberationStageId, string> = {
  drafting: "Drafting your answer",
  verifying: "Checking every number against your record",
  rules: "Checking allergies, pattern and safety",
  enjoyment: "Matching what you actually enjoy",
  revising: "Revising with the checks in mind",
  done: "Checks complete",
};

export interface DeliberationStageSummary {
  stage: DeliberationStageId;
  ms: number;
}

export interface DeliberationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface DeliberationDeps {
  /** One model call through the provider chain. Null = the chain
   *  could not answer at all. */
  callModel: (systemText: string, turns: DeliberationTurn[]) => Promise<string | null>;
  /** The full Vitalis system text for the draft (prompt + record +
   *  deliberation addendum), assembled by the caller. */
  draftSystem: string;
  /** The same system text for revise calls. */
  reviseSystem: string;
  turns: DeliberationTurn[];
  record: VitalisRecordData;
  contextText: string;
  userMessage: string;
  onStage?: (stage: DeliberationStageId, label: string) => void;
}

export interface DeliberationOutcome {
  paragraphs: string[];
  actions: VitalisActionProposal[];
  stages: DeliberationStageSummary[];
  /** How many revise passes ran (0–2). */
  revised: number;
  /** True when the checks never passed and the honest fallback was
   *  served instead of a model draft. */
  fellBack: boolean;
  /** Invalid action proposals still present in the final draft —
   *  the phase-5 strike signal. Zero on any accepted draft. */
  invalidProposals: number;
}

export class DeliberationUnavailable extends Error {
  constructor() {
    super("deliberation provider chain unavailable");
    this.name = "DeliberationUnavailable";
  }
}

const MAX_REVISES = 2;

function fallbackParagraphs(failures: readonly CheckFailure[], userMessage: string): string[] {
  const out = [
    "I drafted an answer, but I couldn't verify it against your record — so I'm not going to hand it to you unchecked.",
  ];
  const kinds = new Set(failures.map((f) => f.kind));
  if (kinds.has("red-flag") || messageHasRedFlag(userMessage)) {
    out.push(
      "You mentioned something that deserves a clinician's ear before any food talk — please talk to a doctor or clinician about that first.",
    );
  } else if (kinds.has("allergen") || kinds.has("dislike") || kinds.has("pattern")) {
    out.push("It suggested something that clashes with your allergy, dislike or pattern rules.");
  } else if (kinds.has("number")) {
    out.push("It used numbers that don't appear anywhere in your record.");
  } else if (kinds.has("safety-framing") || kinds.has("diagnosis")) {
    out.push("It crossed a line I keep around medical topics and your safety answers.");
  }
  out.push(
    "Your plan and log in the Nutrition tab are exactly as recorded. Ask me again — a fresh draft may well pass the checks.",
  );
  return out;
}

export async function runDeliberation(deps: DeliberationDeps): Promise<DeliberationOutcome> {
  const stages: DeliberationStageSummary[] = [];
  const begin = (stage: DeliberationStageId): number => {
    deps.onStage?.(stage, STAGE_LABELS[stage]);
    return Date.now();
  };
  const end = (stage: DeliberationStageId, from: number) => {
    stages.push({ stage, ms: Math.max(0, Date.now() - from) });
  };

  let t = begin("drafting");
  let draft = await deps.callModel(deps.draftSystem, deps.turns);
  end("drafting", t);
  if (draft === null) throw new DeliberationUnavailable();

  let revised = 0;
  for (let round = 0; round <= MAX_REVISES; round++) {
    const { prose, rawProposals, malformedBlocks } = parseActionBlocks(draft);
    const { proposals, invalidCount } = sanitizeProposals(rawProposals, deps.record);
    const invalidTotal = invalidCount + malformedBlocks;

    t = begin("verifying");
    const numberFailures = verifyNumbers(prose, deps.record, deps.contextText);
    end("verifying", t);

    t = begin("rules");
    const ruleFailures = checkRules(prose, proposals, deps.record, deps.userMessage);
    if (invalidTotal > 0) {
      ruleFailures.push({
        kind: "proposal",
        detail: `${invalidTotal} invalid action proposal(s) in draft`,
        reviseNote:
          "The draft's action proposal was invalid — it named something outside the record or outside the allowed actions (log_dish, log_food, compose_plan, propose_assessment_change). Fix it to name only dishes and foods from the record, or drop the proposal entirely.",
      });
    }
    end("rules", t);

    t = begin("enjoyment");
    const enjoymentFailure = checkEnjoyment(prose, deps.record);
    end("enjoyment", t);

    const failures = [
      ...numberFailures,
      ...ruleFailures,
      ...(enjoymentFailure ? [enjoymentFailure] : []),
    ];

    if (failures.length === 0) {
      deps.onStage?.("done", STAGE_LABELS.done);
      return {
        paragraphs: prose.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
        actions: proposals,
        stages,
        revised,
        fellBack: false,
        invalidProposals: 0,
      };
    }

    if (round === MAX_REVISES) {
      return {
        paragraphs: fallbackParagraphs(failures, deps.userMessage),
        actions: [],
        stages,
        revised,
        fellBack: true,
        invalidProposals: invalidTotal,
      };
    }

    t = begin("revising");
    const reviseTurns: DeliberationTurn[] = [
      ...deps.turns,
      { role: "assistant", content: draft },
      {
        role: "user",
        content: [
          "Your draft failed Bloom's verification checks:",
          ...failures.map((f) => `- ${f.reviseNote}`),
          "Rewrite the reply fixing every point. Quote only numbers that appear in the record. Never suggest anything on the allergy or dislike lists, and keep the reply in your own voice, written for the ear.",
        ].join("\n"),
      },
    ];
    const next = await deps.callModel(deps.reviseSystem, reviseTurns);
    end("revising", t);
    if (next === null) {
      return {
        paragraphs: fallbackParagraphs(failures, deps.userMessage),
        actions: [],
        stages,
        revised,
        fellBack: true,
        invalidProposals: invalidTotal,
      };
    }
    draft = next;
    revised += 1;
  }

  /* Unreachable — the loop always returns — but keeps the type honest. */
  throw new DeliberationUnavailable();
}
