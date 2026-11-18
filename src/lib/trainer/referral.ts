/**
 * Trainer referral — the code a trainer shares, and the commission
 * maths that decides what Bloom owes them.
 *
 * The model (agreed with the owner, 2026-11-18): a client pays Bloom
 * directly; the trainer's code tags the client to the trainer; Bloom
 * pays the trainer **30% of payments actually received**, monthly,
 * once the month's commission reaches **₹1,000** — below that it
 * carries, it is never paid in part and never invented.
 *
 * The code itself is derived deterministically from the person's id:
 * the same id always yields the same code, on any device, with no
 * server round-trip and nothing to leak (the code is not the id and
 * cannot be reversed into it — it is a one-way hash expansion). The
 * alphabet drops the look-alike characters (0/O, 1/I/L) so a code can
 * be read aloud over a gym counter without ambiguity.
 *
 * Pure throughout: no storage, no clock. The state module decides
 * when a code is first created and stored.
 */

/** The trainer's share of every received payment. */
export const TRAINER_COMMISSION_RATE = 0.3;
/** A month's commission below this (in ₹) carries instead of paying out. */
export const MIN_PAYOUT_INR = 1000;
/** Displayed wherever a code is shown; the code itself is the 8 chars. */
export const REFERRAL_CODE_PREFIX = "BLOOM-";

/** Unambiguous alphabet: no 0/O, no 1/I/L. 31 characters. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 8;

/** FNV-1a — small, stable across platforms and versions. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** xorshift32 expansion: one seed, as many stable characters as needed. */
function expand(seed: number, count: number): string {
  let state = seed === 0 ? 0x9e3779b9 : seed;
  let out = "";
  for (let i = 0; i < count; i += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    out += ALPHABET[state % ALPHABET.length];
  }
  return out;
}

/**
 * The referral code for a user id, or null when there is no id to
 * derive from. Deterministic: re-deriving is always safe, which is
 * what lets the stored copy be a cache rather than a secret.
 */
export function deriveReferralCode(userId: string | null | undefined): string | null {
  if (typeof userId !== "string") return null;
  const seed = userId.trim();
  if (seed.length === 0) return null;
  return expand(fnv1a(`bloom-trainer:${seed}`), REFERRAL_CODE_LENGTH);
}

/** The code as it is shown to people: prefix + code. */
export function formatReferralCode(code: string): string {
  return `${REFERRAL_CODE_PREFIX}${code}`;
}

/** Accept a typed/pasted code in any case, with or without the prefix. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (text.startsWith("BLOOM")) text = text.slice("BLOOM".length);
  if (text.length !== REFERRAL_CODE_LENGTH) return null;
  for (const ch of text) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return text;
}

export function isReferralCode(raw: unknown): boolean {
  return normalizeReferralCode(raw) !== null;
}

/* ------------------------------ commission ------------------------------ */

/** A payment Bloom has actually received from a tagged client. */
export interface ReceivedPayment {
  /** Rupees received (not billed, not attempted — received). */
  amountInr: number;
  /** ISO timestamp of receipt. */
  receivedAt: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 30% of one received payment, to the paise. Non-payments earn nothing. */
export function commissionFor(amountInr: number): number {
  if (!Number.isFinite(amountInr) || amountInr <= 0) return 0;
  return round2(amountInr * TRAINER_COMMISSION_RATE);
}

export interface MonthlyPayout {
  /** The calendar month summarised, "YYYY-MM". */
  month: string;
  /** Total received from tagged clients that month. */
  receivedInr: number;
  /** 30% of the above — what the month earned. */
  commissionInr: number;
  /** True once the month's commission reaches the ₹1,000 threshold. */
  meetsThreshold: boolean;
  /** What is paid out for the month: the commission, or 0 while it carries. */
  payableInr: number;
  /** What carries forward unpaid: the commission while under threshold, else 0. */
  carriedInr: number;
  /** How many received payments the month rests on. */
  paymentCount: number;
}

/**
 * One month's payout position. Only payments whose receipt falls in
 * `month` count; amounts that are not positive finite numbers are not
 * receipts and are ignored, never netted.
 */
export function summariseMonthlyPayout(
  payments: readonly ReceivedPayment[],
  month: string,
): MonthlyPayout {
  let received = 0;
  let count = 0;
  for (const payment of payments) {
    if (!payment || typeof payment.receivedAt !== "string") continue;
    if (!payment.receivedAt.startsWith(month)) continue;
    if (!Number.isFinite(payment.amountInr) || payment.amountInr <= 0) continue;
    received += payment.amountInr;
    count += 1;
  }
  const commission = round2(received * TRAINER_COMMISSION_RATE);
  const meets = commission >= MIN_PAYOUT_INR;
  return {
    month,
    receivedInr: round2(received),
    commissionInr: commission,
    meetsThreshold: meets,
    payableInr: meets ? commission : 0,
    carriedInr: meets ? 0 : commission,
    paymentCount: count,
  };
}
