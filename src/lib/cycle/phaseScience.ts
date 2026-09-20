/**
 * Cycle phase science — the honest middle ground.
 *
 * Bloom is not a medical device, and the research on cycle-phase effects is
 * genuinely mixed: large within-person studies find phase effects on energy,

 * mood and sleep that are real on average but small and wildly individual
 * (e.g. the 2023 MIT/Santabara-Feinberg day-level study of millions of
 * self-reports found effects an order of magnitude smaller than the "cycle
 * coaching" industry claims). So every line here obeys three rules:
 *
 *   1. **Population, not prescription** — "many people", "on average", never
 *      "you will feel".
 *   2. **Mechanism named, once** — prostaglandins, progesterone, oestrogen —
 *      because "why" is what turns a mood swing from scary into survivable.
 *   3. **No diagnosis** — anything that sounds like a symptom pattern ends at
 *      "worth mentioning to a clinician", the app's one consistent medical
 *      boundary.
 *
 * Pure functions; no React, no storage, no network.
 */

export type PhaseKey = "menstrual" | "follicular" | "ovulation" | "luteal";

/** The engine's label → key, tolerant of the exact display strings. */
export function phaseKeyOf(label: string | null | undefined): PhaseKey | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("menstru")) return "menstrual";
  if (l.includes("ovulat")) return "ovulation";
  if (l.includes("luteal")) return "luteal";
  if (l.includes("follicul")) return "follicular";
  return null;
}

/**
 * One science line per phase — the "why" behind what a person may be feeling.
 * Written to stand alone: the coach can quote one of these as a whole
 * paragraph and it reads as knowledge, not filler.
 */
const PHASE_SCIENCE: Record<PhaseKey, string[]> = {
  menstrual: [
    "During menstruation, prostaglandins make the uterus contract — the same chemistry behind cramps also tends to lower energy and deepen sleep need for a few days.",
    "Iron loss across a period is one of the quieter reasons for mid-cycle tiredness; many people run measurably lower on haemoglobin by the end of a heavy one.",
    "For most cycles, the first days are when rest is genuinely doing medical work, not laziness — recovery and blood loss overlap here.",
  ],
  follicular: [
    "After a period, oestrogen rises through the follicular phase — for many people this is the stretch where energy, focus and mood lift most reliably.",
    "Rising oestrogen tends to improve sleep continuity and exercise recovery, which is why ambitious plans usually land easier here than in the luteal half.",
  ],
  ovulation: [
    "Around ovulation, oestrogen peaks and then drops; some people feel a clear energy and confidence bump, others mostly notice the dip on the far side of it.",
    "This is the fertile window in a calendar estimate — useful for awareness, and deliberately imprecise: cycles ovulate on average 14 days before the *next* period, not 14 days after the last one.",
  ],
  luteal: [
    "The luteal phase — after ovulation — runs on progesterone, which raises core temperature, can fragment sleep slightly, and for many people pulls mood and energy down towards the period. It's the most studied and most predictable part of the cycle.",
    "Late-luteal dips in mood are common enough that research treats them as typical biology first and a concern only when they're severe or disruptive — that line, not the dip itself, is what PMS and PMDD descriptions actually draw.",
    "Cravings and appetite rising before a period have a physiological side — energy use is measurably higher in the luteal phase — so it isn't a willpower failure when snack discipline loosens here.",
  ],
};

/**
 * A phase line for a person, with the honesty depends on confidence.
 *
 * With `assumed` confidence the phase comes from the general 28-day pattern
 * rather than their record — the science is still true, but the phase claim
 * needs a caveat, or the app is implying knowledge it doesn't have.
 */
export function phaseScienceLine(
  phaseLabel: string | null | undefined,
  confidence: string | null | undefined,
  seed: string | number = phaseLabel ?? "",
): string | null {
  const key = phaseKeyOf(phaseLabel);
  if (!key) return null;
  const pool = PHASE_SCIENCE[key];
  const line = pool[hash(String(seed)) % pool.length]!;
  if ((confidence ?? "") === "assumed") {
    return `${line} (That phase is from the general pattern, not your logs yet — worth treating loosely.)`;
  }
  return line;
}

/** Every phase line, for topics that span the whole cycle. */
export function allPhaseLines(): string[] {
  return (Object.keys(PHASE_SCIENCE) as PhaseKey[]).flatMap((k) => PHASE_SCIENCE[k]);
}

export interface PhaseBriefLine {
  key: PhaseKey;
  label: string;
  line: string;
}

const PHASE_LABELS: Record<PhaseKey, string> = {
  menstrual: "Menstrual days",
  follicular: "Follicular days",
  ovulation: "Ovulation window",
  luteal: "Luteal days",
};

/** The full science, one hedged line per phase — the "in full" view. */
export function phaseBrief(): PhaseBriefLine[] {
  return (Object.keys(PHASE_SCIENCE) as PhaseKey[]).map((k) => ({
    key: k,
    label: PHASE_LABELS[k],
    line: PHASE_SCIENCE[k][0]!,
  }));
}

/**
 * For someone with no cycle data yet: what the general model honestly is.
 * This is the "0 entries" answer — not a nag to log, but real knowledge.
 */
export const GENERAL_MODEL_LINES = [
  "The textbook 28-day cycle is an average, not a rule — anything from about 21 to 35 days counts as a regular cycle, and day-to-day life, stress and sleep all move it.",
  "Cycles are counted from the first day of one period to the first day of the next; the luteal half is the most stable part, which is why predictions lean on it.",
  "Two logged period starts are what turn every general number on the cycle page into a personal one — until then the app deliberately shows population patterns, labelled as such.",
];

/** Small stable string hash — same role as voice/messages.hashSeed, kept local
 *  so this module has no imports at all. Unsigned, so a modulo of it can never
 *  go negative and index a pool with -1. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h | 0) >>> 0;
}
