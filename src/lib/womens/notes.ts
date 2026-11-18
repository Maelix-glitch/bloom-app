/**
 * Women's Health — general educational notes, one per cycle phase.
 *
 * These lines are general information about phases in the abstract, written
 * for the cycle-context card. They are NOT observations about the reader,
 * NOT predictions, and NOT medical advice. Every note is hedged ("many
 * people", "can", "often") and ends by deferring to the person's own logged
 * patterns, which are the only pattern Bloom actually knows.
 *
 * Hard copy rules (pinned by notes.test.ts):
 *   · no certainty language about the reader ("you will", "you are fertile");
 *   · no fertility, ovulation-timing or contraception claims — Bloom is not
 *     a contraceptive tool and this system never surfaces a fertile window;
 *   · no diagnosis, symptom interpretation or treatment language.
 */

import type { Phase } from "@/lib/cycle/predict";

export const PHASE_NOTES: Record<Phase, string> = {
  menstrual:
    "Many people find the bleeding days are when energy tends to sit lowest, and rest can feel more necessary than usual. General information only — your own logged patterns matter more than general notes.",
  follicular:
    "Many people notice energy gradually returning in the days after a period ends, and appetite can feel steadier in this stretch. General information only — your own logged patterns matter more than general notes.",
  ovulation:
    "Around the middle of a cycle, some people notice small changes such as different discharge or a brief lift in energy; others notice nothing at all, and both are common. General information only — your own logged patterns matter more than general notes.",
  luteal:
    "Many people notice appetite changes in the late luteal phase, and mood, sleep or cravings can shift in the days before a period. General information only — your own logged patterns matter more than general notes.",
  late:
    "A period arriving later than an estimate is common, and cycle lengths can vary from month to month for many ordinary reasons. General information only — your own logged patterns matter more than general notes.",
};

/** The note for a phase, or null when there is no phase to attach it to. */
export function phaseNote(phase: Phase | null): string | null {
  return phase ? PHASE_NOTES[phase] : null;
}
