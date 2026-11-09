/**
 * Source authority and reliability.
 *
 * "Is this a good source?" is not a feeling. It is computed here from three
 * things that can be inspected: the kind of publication, whether it went through
 * peer review, and how old it is relative to its own field's refresh cycle.
 *
 * The output is a tier and the reasons for it. The reasons matter as much as the
 * number: a reviewer must be able to disagree with a specific premise rather
 * than argue with an opaque score.
 *
 * This is deliberately not a model and not a heuristic over text. It ranks
 * publication types, which is a judgement we are willing to defend in writing,
 * and it never claims to measure truth.
 */

import { REVIEW_INTERVAL_MONTHS } from "./review";
import type { SourceKind } from "./types";

/**
 * Base weight per publication kind, 0–1.
 *
 * Ordered by how much of the evidence base each design typically synthesises:
 * a systematic review weighs more than a single trial, which weighs more than a
 * case report. These are conventional starting points, not measurements.
 */
export const KIND_BASE_SCORE: Record<SourceKind, number> = {
  systematic_review: 0.95,
  guideline: 0.9,
  randomised_trial: 0.85,
  government_report: 0.85,
  dataset: 0.8,
  cohort_study: 0.7,
  textbook: 0.65,
  case_report: 0.45,
  expert_opinion: 0.4,
};

export const PEER_REVIEW_BONUS = 0.05;
/** How much currency is allowed to matter at its worst. */
export const MAX_STALENESS_PENALTY = 0.15;

export interface AuthorityAssessment {
  readonly score: number;
  readonly tier: "A" | "B" | "C" | "D";
  readonly reasons: readonly string[];
}

function monthsBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return (to - from) / (30.44 * 86_400_000);
}

/**
 * Score a source.
 *
 * Staleness is measured against the source's own review interval rather than a
 * global cut-off: a dietary guideline is expected to be reissued every five
 * years, a food-composition table less often, and penalising both by the same
 * clock would punish the wrong one.
 */
export function assessAuthority(
  source: {
    readonly kind: SourceKind;
    readonly peerReviewed: boolean;
    readonly publicationYear: number;
    readonly reviewIntervalMonths?: number;
  },
  asOf: string = new Date().toISOString().slice(0, 10),
): AuthorityAssessment {
  const reasons: string[] = [];
  const base = KIND_BASE_SCORE[source.kind] ?? KIND_BASE_SCORE.expert_opinion;
  reasons.push(`${source.kind} base weight ${base.toFixed(2)}`);

  let score = base;

  if (source.peerReviewed) {
    score += PEER_REVIEW_BONUS;
    reasons.push(`peer reviewed (+${PEER_REVIEW_BONUS.toFixed(2)})`);
  } else {
    reasons.push("not peer reviewed");
  }

  const interval = source.reviewIntervalMonths ?? REVIEW_INTERVAL_MONTHS[source.kind];
  const ageMonths = monthsBetween(`${source.publicationYear}-01-01`, asOf);
  if (ageMonths !== null && interval > 0 && ageMonths > interval) {
    // Scales from 0 to MAX_STALENESS_PENALTY as the source ages past twice its
    // review interval; a source one month overdue is not as weak as one a decade
    // overdue, and the penalty should say so.
    const overdueRatio = Math.min(1, (ageMonths - interval) / interval);
    const penalty = Math.round(overdueRatio * MAX_STALENESS_PENALTY * 100) / 100;
    score -= penalty;
    reasons.push(`past its ${interval}-month review interval (-${penalty.toFixed(2)})`);
  }

  score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  const tier = score >= 0.85 ? "A" : score >= 0.7 ? "B" : score >= 0.5 ? "C" : "D";
  reasons.push(`tier ${tier} from score ${score.toFixed(2)}`);

  return { score, tier, reasons };
}

/**
 * Reliability asked as a yes/no question, for gatekeeping rather than display.
 * Tier C or better is the floor for anything a person will act on.
 */
export function isReliableEnough(
  assessment: AuthorityAssessment,
  minimum: "A" | "B" | "C" = "C",
): boolean {
  const rank = { A: 3, B: 2, C: 1, D: 0 } as const;
  return rank[assessment.tier] >= rank[minimum];
}

/**
 * How well a whole claim is supported, given its citations.
 *
 * A claim resting on one source, or on sources that disagree, is not "strong"
 * however good those sources are. Contradicting citations are not an error —
 * recording disagreement is the honest thing to do — but they cap the grade.
 */
export function supportIssues(
  links: readonly { readonly direction: "supports" | "contradicts" | "mixed" }[],
  grade: "strong" | "moderate" | "limited" | "insufficient",
): string[] {
  const issues: string[] = [];
  const supporting = links.filter((link) => link.direction === "supports").length;
  const contradicting = links.filter((link) => link.direction === "contradicts").length;

  if (grade === "strong" && supporting === 0) {
    issues.push('grade "strong" requires at least one supporting citation');
  }
  if (grade === "strong" && contradicting > 0) {
    issues.push('grade "strong" cannot be claimed while a cited source contradicts it');
  }
  if (grade !== "insufficient" && links.length === 0) {
    issues.push(`grade "${grade}" requires at least one citation`);
  }
  return issues;
}
