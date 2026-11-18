/**
 * Trainer-set targets — a proposal model, never an application path.
 *
 * A trainer or clinician who knows the person may propose daily
 * calorie and protein targets. Bloom's discipline, mirroring the
 * expenditure adjustment (`health.targetAdjustment.v1`):
 *
 *   · a proposal is stored LABELLED as a proposal — who proposed it,
 *     when, with their note — and changes nothing by existing;
 *   · the person confirms or dismisses it; confirming is the only
 *     way it becomes the confirmed record, and dismissing stores
 *     nothing at all;
 *   · a proposal outside the safety bands is refused at the door —
 *     never clamped into a different number nobody proposed.
 *
 * The bands are the engine's own working bands, reused rather than
 * re-invented: calories must land in 800–6000 kcal (the adjusted-
 * target band in targetAdjustment.ts); protein must sit in a
 * structural sanity band of 20–400 g, and — when the person's weight
 * is recorded — within 0.8–2.5 g/kg, a margin around the engine's
 * own 1.4–2.2 g/kg goal bands (src/lib/health/body.ts). These are
 * sanity bands, not medical guidance.
 *
 * Pure: validation and shaping only. Storage lives in state.ts.
 */

import {
  ADJUSTED_TARGET_MAX_KCAL,
  ADJUSTED_TARGET_MIN_KCAL,
} from "@/lib/nutrition/targetAdjustment";

export const TRAINER_PROTEIN_MIN_G = 20;
export const TRAINER_PROTEIN_MAX_G = 400;
export const TRAINER_PROTEIN_MIN_PER_KG = 0.8;
export const TRAINER_PROTEIN_MAX_PER_KG = 2.5;
/** Free-text fields are capped so a proposal stays a proposal, not an essay. */
export const MAX_PROPOSER_LABEL_CHARS = 80;
export const MAX_PROPOSAL_NOTE_CHARS = 280;

export interface TargetOverrideProposal {
  kcal: number;
  proteinG: number;
  /** Who proposed it, as they named themselves ("Coach Arun", "Dr Rao"). */
  proposedBy: string;
  /** Their reason, if they gave one. */
  note: string | null;
  /** ISO timestamp of the proposal. */
  proposedAt: string;
}

/** A proposal the person has confirmed — labelled, dated, and still
 *  carrying its proposer, so its origin is never lost. */
export interface ConfirmedTargetOverride extends TargetOverrideProposal {
  confirmedAt: string;
}

const cleanText = (s: string) => s.replace(/\s+/g, " ").trim();

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export type OverrideValidation =
  | { ok: true; proposal: TargetOverrideProposal }
  | { ok: false; reasons: string[] };

/**
 * Validate and shape a raw proposal. `weightKg` is the person's
 * recorded weight when Bloom holds it (null = not recorded; the
 * per-kilo check is then skipped, never guessed).
 */
export function validateTargetOverride(
  raw: unknown,
  weightKg: number | null,
): OverrideValidation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reasons: ["The proposal is not an object."] };
  }
  const r = raw as Record<string, unknown>;
  const reasons: string[] = [];

  let kcal = 0;
  if (!finite(r["kcal"])) {
    reasons.push("The proposal has no calorie target.");
  } else {
    kcal = Math.round(r["kcal"]);
    if (kcal < ADJUSTED_TARGET_MIN_KCAL || kcal > ADJUSTED_TARGET_MAX_KCAL) {
      reasons.push(
        `Calories must be between ${ADJUSTED_TARGET_MIN_KCAL} and ${ADJUSTED_TARGET_MAX_KCAL} kcal.`,
      );
    }
  }

  let proteinG = 0;
  if (!finite(r["proteinG"])) {
    reasons.push("The proposal has no protein target.");
  } else {
    proteinG = Math.round(r["proteinG"] * 10) / 10;
    if (proteinG < TRAINER_PROTEIN_MIN_G || proteinG > TRAINER_PROTEIN_MAX_G) {
      reasons.push(
        `Protein must be between ${TRAINER_PROTEIN_MIN_G} and ${TRAINER_PROTEIN_MAX_G} g.`,
      );
    } else if (weightKg !== null && Number.isFinite(weightKg) && weightKg > 0) {
      const perKg = proteinG / weightKg;
      if (perKg < TRAINER_PROTEIN_MIN_PER_KG || perKg > TRAINER_PROTEIN_MAX_PER_KG) {
        reasons.push("Protein sits outside the safe range for the recorded weight.");
      }
    }
  }

  const proposedBy = typeof r["proposedBy"] === "string" ? cleanText(r["proposedBy"]) : "";
  if (proposedBy.length === 0) reasons.push("The proposal does not say who proposed it.");

  const proposedAt = typeof r["proposedAt"] === "string" ? r["proposedAt"] : "";
  if (proposedAt.length === 0 || Number.isNaN(Date.parse(proposedAt))) {
    reasons.push("The proposal has no valid date.");
  }

  if (reasons.length > 0) return { ok: false, reasons };

  const noteRaw = typeof r["note"] === "string" ? cleanText(r["note"]) : "";
  return {
    ok: true,
    proposal: {
      kcal,
      proteinG,
      proposedBy: proposedBy.slice(0, MAX_PROPOSER_LABEL_CHARS),
      note: noteRaw.length > 0 ? noteRaw.slice(0, MAX_PROPOSAL_NOTE_CHARS) : null,
      proposedAt,
    },
  };
}

/** Strict parser for a stored proposal (state.ts round-trips through it). */
export function parseTargetOverrideProposal(raw: unknown): TargetOverrideProposal | null {
  const result = validateTargetOverride(raw, null);
  if (!result.ok) return null;
  /* The per-kilo check needs the weight at proposal time and is not
     re-run here; the absolute bands are re-checked by the validator. */
  return result.proposal;
}

export function parseConfirmedTargetOverride(raw: unknown): ConfirmedTargetOverride | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const proposal = parseTargetOverrideProposal(raw);
  if (!proposal) return null;
  const confirmedAt = (raw as Record<string, unknown>)["confirmedAt"];
  if (typeof confirmedAt !== "string" || Number.isNaN(Date.parse(confirmedAt))) return null;
  return { ...proposal, confirmedAt };
}
