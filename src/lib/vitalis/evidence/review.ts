/**
 * Review lifecycle and the ageing of evidence.
 *
 * Two problems this solves, both of which quietly rot a knowledge base:
 *
 *   1. Status drifting without a record. A claim is not "approved" because
 *      somebody edited a field; approval is a transition from `in_review`, and
 *      every illegal transition throws. There is no path from `draft` straight
 *      to `approved`, because that is exactly how unreviewed material ships.
 *
 *   2. Evidence that never expires. A guideline is current for a while. After
 *      that it is not wrong, it is simply unverified, and the registry has to
 *      say which. `reviewDueOn` / `isReviewOverdue` give every row an expiry
 *      date derived from its kind, so "we'll check it later" becomes a date.
 */

import type { ReviewStatus, SourceKind } from "./types";

export const REVIEW_INTERVAL_MONTHS: Record<SourceKind, number> = {
  guideline: 60,
  systematic_review: 36,
  randomised_trial: 60,
  cohort_study: 60,
  case_report: 60,
  government_report: 60,
  dataset: 12,
  textbook: 60,
  expert_opinion: 24,
};

/** Default interval for a claim, which is only as fresh as what it cites. */
export const CLAIM_REVIEW_INTERVAL_MONTHS = 12;

/**
 * Allowed transitions. Terminal states have no exits: a superseded source stays
 * superseded, so the history cannot be rewritten by moving it back to approved.
 */
export const REVIEW_TRANSITIONS: Record<ReviewStatus, readonly ReviewStatus[]> = {
  draft: ["in_review", "withdrawn"],
  in_review: ["approved", "rejected", "draft"],
  approved: ["superseded", "withdrawn", "in_review"],
  rejected: ["draft", "withdrawn"],
  superseded: [],
  withdrawn: [],
};

export class EvidenceReviewError extends Error {
  constructor(
    readonly from: ReviewStatus,
    readonly to: ReviewStatus,
  ) {
    super(`cannot move evidence from "${from}" to "${to}"`);
    this.name = "EvidenceReviewError";
  }
}

export function canTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  return REVIEW_TRANSITIONS[from].includes(to);
}

/** Throws rather than returning false: a bad transition is a bug, not a branch. */
export function assertTransition(from: ReviewStatus, to: ReviewStatus): void {
  if (!canTransition(from, to)) throw new EvidenceReviewError(from, to);
}

export function canBeUsed(status: ReviewStatus): boolean {
  return status === "approved";
}

/**
 * Add whole months to an ISO date, in UTC.
 *
 * Date arithmetic is done on the date parts rather than by adding milliseconds,
 * because month lengths vary and a review date that drifts by a day per cycle is
 * the kind of thing nobody notices until it matters.
 */
export function addMonths(iso: string, months: number): string | null {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed) || !Number.isInteger(months)) return null;
  const date = new Date(parsed);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

/**
 * When this row must be looked at again.
 *
 * Anchored on `reviewedOn`: the clock starts when a human last confirmed the
 * row, not when the publisher issued the source, because our confirmation is the
 * thing that expires.
 */
export function reviewDueOn(entity: {
  readonly reviewedOn: string | null;
  readonly reviewIntervalMonths: number;
}): string | null {
  if (entity.reviewedOn === null) return null;
  return addMonths(entity.reviewedOn, entity.reviewIntervalMonths);
}

export function isReviewOverdue(
  entity: {
    readonly reviewedOn: string | null;
    readonly reviewIntervalMonths: number;
    readonly supersededBy: string | null;
    readonly reviewStatus: ReviewStatus;
  },
  asOf: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (entity.supersededBy !== null || !canBeUsed(entity.reviewStatus)) return false;
  const due = reviewDueOn(entity);
  if (due === null) return true;
  return due < asOf;
}

export function daysUntilReview(
  entity: { readonly reviewedOn: string | null; readonly reviewIntervalMonths: number },
  asOf: string = new Date().toISOString().slice(0, 10),
): number | null {
  const due = reviewDueOn(entity);
  if (due === null) return null;
  const days = (Date.parse(due) - Date.parse(asOf)) / 86_400_000;
  return Number.isFinite(days) ? Math.floor(days) : null;
}

/**
 * The re-review queue: approved rows past their due date, oldest first.
 *
 * This is the mechanism the phase brief asks for — a documented way to find
 * outdated evidence rather than waiting for someone to remember it.
 */
export function overdueForReview<
  T extends {
    readonly id: string;
    readonly reviewedOn: string | null;
    readonly reviewIntervalMonths: number;
    readonly supersededBy: string | null;
    readonly reviewStatus: ReviewStatus;
  },
>(rows: readonly T[], asOf: string = new Date().toISOString().slice(0, 10)): T[] {
  return rows
    .filter((row) => isReviewOverdue(row, asOf))
    .sort((a, b) => (reviewDueOn(a) ?? "").localeCompare(reviewDueOn(b) ?? ""));
}
