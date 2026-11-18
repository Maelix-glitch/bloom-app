/**
 * Trainer & Clinician Pro — the person's own trainer record.
 *
 * One versioned key in the shared preferences document,
 * `health.trainer.v1`, following the pattern the Assessment history
 * and the target adjustment set: sync through `user_prefs`, export
 * (`loadDoc()` wholesale in the export bundle) and erasure (device
 * wipe + `erase_my_data()` on `user_prefs`) are inherited by
 * construction — no new table, no per-key wiring anywhere.
 *
 * What the record holds, and the discipline on each piece:
 *
 *   · `consentToShare` — the person's switch for the share summary.
 *     Default OFF. The summary builder refuses to build without it.
 *   · `referralCode` — created once from the person's id (derived,
 *     so re-derivation agrees), then stored so it is stable even if
 *     the derivation ever changes.
 *   · `pendingOverride` — a trainer's target proposal, labelled and
 *     inert. Proposing writes ONLY this field.
 *   · `confirmedOverride` — written ONLY by the person's explicit
 *     confirm of a pending proposal. Dismissing a proposal clears
 *     the pending field and stores nothing.
 *
 * Everything is pure except the thin pref wrappers at the bottom.
 */

import { clearPref, getPref, setPref } from "@/lib/prefs";

import {
  parseConfirmedTargetOverride,
  parseTargetOverrideProposal,
  validateTargetOverride,
  type ConfirmedTargetOverride,
  type OverrideValidation,
  type TargetOverrideProposal,
} from "./override";
import { deriveReferralCode, isReferralCode } from "./referral";

export const TRAINER_KEY = "health.trainer.v1";
export const TRAINER_VERSION = 1;

export interface TrainerState {
  version: typeof TRAINER_VERSION;
  consentToShare: boolean;
  referralCode: string | null;
  pendingOverride: TargetOverrideProposal | null;
  confirmedOverride: ConfirmedTargetOverride | null;
}

export const EMPTY_TRAINER_STATE: TrainerState = {
  version: TRAINER_VERSION,
  consentToShare: false,
  referralCode: null,
  pendingOverride: null,
  confirmedOverride: null,
};

export function parseTrainerState(raw: unknown): TrainerState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== TRAINER_VERSION) return null;
  if (typeof r["consentToShare"] !== "boolean") return null;

  const referralCode = r["referralCode"];
  if (referralCode !== null && !isReferralCode(referralCode)) return null;

  const pendingRaw = r["pendingOverride"];
  const pending = pendingRaw === null ? null : parseTargetOverrideProposal(pendingRaw);
  if (pendingRaw !== null && pending === null) return null;

  const confirmedRaw = r["confirmedOverride"];
  const confirmed = confirmedRaw === null ? null : parseConfirmedTargetOverride(confirmedRaw);
  if (confirmedRaw !== null && confirmed === null) return null;

  return {
    version: TRAINER_VERSION,
    consentToShare: r["consentToShare"],
    referralCode: referralCode as string | null,
    pendingOverride: pending,
    confirmedOverride: confirmed,
  };
}

/* ------------------------------ pref wrappers ------------------------------ */

export function readTrainerState(): TrainerState {
  return getPref(TRAINER_KEY, parseTrainerState, EMPTY_TRAINER_STATE);
}

function writeTrainerState(state: TrainerState): void {
  /* Re-parsed on the way in: what cannot survive the strict parser
     is never written. */
  const parsed = parseTrainerState(state);
  if (parsed) setPref(TRAINER_KEY, parsed);
}

export function clearTrainerState(): void {
  clearPref(TRAINER_KEY);
}

export function setShareConsent(consent: boolean): TrainerState {
  const next = { ...readTrainerState(), consentToShare: consent };
  writeTrainerState(next);
  return next;
}

/**
 * The person's referral code, created on first ask. Derived from
 * their id, so the stored code and any re-derivation agree; a stored
 * code is returned as-is (stability beats re-derivation).
 */
export function ensureReferralCode(userId: string | null | undefined): string | null {
  const state = readTrainerState();
  if (state.referralCode) return state.referralCode;
  const code = deriveReferralCode(userId);
  if (!code) return null;
  writeTrainerState({ ...state, referralCode: code });
  return code;
}

/**
 * Store a trainer's proposal as PENDING — and only pending. An
 * out-of-band proposal is refused and stores nothing. A new proposal
 * replaces an unconfirmed one; a confirmed override is never touched
 * by proposing.
 */
export function proposeTargetOverride(
  raw: unknown,
  weightKg: number | null,
): OverrideValidation {
  const result = validateTargetOverride(raw, weightKg);
  if (!result.ok) return result;
  writeTrainerState({ ...readTrainerState(), pendingOverride: result.proposal });
  return result;
}

/**
 * The person's confirm: the pending proposal — and only it — becomes
 * the confirmed record, stamped with the confirm time. Returns the
 * confirmed override, or null when there was nothing pending.
 */
export function confirmPendingOverride(confirmedAt: string): ConfirmedTargetOverride | null {
  const state = readTrainerState();
  if (!state.pendingOverride) return null;
  if (Number.isNaN(Date.parse(confirmedAt))) return null;
  const confirmed: ConfirmedTargetOverride = { ...state.pendingOverride, confirmedAt };
  if (!parseConfirmedTargetOverride(confirmed)) return null;
  writeTrainerState({ ...state, pendingOverride: null, confirmedOverride: confirmed });
  return confirmed;
}

/** Dismissing a proposal stores nothing: pending clears, the rest stands. */
export function dismissPendingOverride(): void {
  const state = readTrainerState();
  if (!state.pendingOverride) return;
  writeTrainerState({ ...state, pendingOverride: null });
}
