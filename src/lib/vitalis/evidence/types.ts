/**
 * Scientific evidence registry — the shapes Bloom Vitalis Phase 2 stores.
 *
 * Phase 1 established that a number must know where it came from (provenance).
 * Phase 2 applies the same rule one level up: a *claim* must know which
 * published source says so, how strong that source is, what it does not cover,
 * and whether we are legally allowed to use it.
 *
 * Two facts drive every type here:
 *
 *   • Evidence is global reference data, not personal data. Nothing in this
 *     module is scoped to a user, which is why it is separate from the health
 *     tables and is never touched by account erasure.
 *   • A source can be scientifically excellent and still unusable. Authority
 *     (how much the evidence deserves to be believed) and licence (whether we
 *     may reproduce it in a product) are deliberately different fields, because
 *     conflating them is how apps end up shipping copyrighted tables.
 */

export const SOURCE_KINDS = [
  "guideline",
  "systematic_review",
  "randomised_trial",
  "cohort_study",
  "case_report",
  "government_report",
  "dataset",
  "textbook",
  "expert_opinion",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  guideline: "Guideline",
  systematic_review: "Systematic review",
  randomised_trial: "Randomised trial",
  cohort_study: "Cohort study",
  case_report: "Case report",
  government_report: "Government report",
  dataset: "Dataset",
  textbook: "Textbook",
  expert_opinion: "Expert opinion",
};

/** Higher tiers are stronger. Derived from kind, peer review and currency. */
export const AUTHORITY_TIERS = ["A", "B", "C", "D"] as const;
export type AuthorityTier = (typeof AUTHORITY_TIERS)[number];

export const AUTHORITY_TIER_COPY: Record<AuthorityTier, string> = {
  A: "Authoritative: national or international guidance, or a systematic synthesis.",
  B: "Strong: peer-reviewed research or an official dataset with published methods.",
  C: "Supporting: weaker designs, older material, or secondary reporting.",
  D: "Weak: expert opinion or material with no published method.",
};

/** How much of a claim the cited evidence actually carries. */
export const EVIDENCE_GRADES = ["strong", "moderate", "limited", "insufficient"] as const;
export type EvidenceGrade = (typeof EVIDENCE_GRADES)[number];

/**
 * Review lifecycle.
 *
 *   draft      recorded, not yet checked against its source
 *   in_review  someone is checking it
 *   approved   checked, and may be used
 *   rejected   checked and not usable
 *   superseded replaced by a newer version; retained for history
 *   withdrawn removed from use without a replacement
 *
 * `rejected`, `superseded` and `withdrawn` are terminal for use, not for
 * history: the row stays so the audit trail keeps its meaning.
 */
export const REVIEW_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "superseded",
  "withdrawn",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_COPY: Record<ReviewStatus, string> = {
  draft: "Recorded, not yet verified against its source",
  in_review: "Being checked",
  approved: "Verified and usable",
  rejected: "Checked and not usable",
  superseded: "Replaced by a newer version",
  withdrawn: "Removed from use",
};

/** Topics are stable codes, so a UI never has to parse prose. */
export const CLAIM_TOPICS = [
  "energy_requirement",
  "energy_balance",
  "weight_change_rate",
  "dietary_pattern",
  "protein",
  "hydration",
  "food_composition",
  "physical_activity",
] as const;

export type ClaimTopic = (typeof CLAIM_TOPICS)[number];

/** Whether a citation supports, contradicts, or is mixed on the claim. */
export const CLAIM_DIRECTIONS = ["supports", "contradicts", "mixed"] as const;
export type ClaimDirection = (typeof CLAIM_DIRECTIONS)[number];

/**
 * How a claim cites one source. `locator` is required: "the source says so"
 * is not traceable without a place in the source to look at.
 */
export interface EvidenceLink {
  readonly sourceId: string;
  readonly direction: ClaimDirection;
  /** Chapter, section, table or page — whatever lets a reviewer find it. */
  readonly locator: string;
}

export interface EvidenceSource {
  /** Stable slug, e.g. `dga-2020-2025`. Never a URL, never auto-generated. */
  readonly id: string;
  readonly title: string;
  readonly kind: SourceKind;
  readonly publisher: string;
  readonly authors: readonly string[];
  readonly publicationYear: number;
  readonly url: string;
  /** Identifier from the licence registry in `licensing.ts`. */
  readonly license: string;
  readonly licenseUrl: string | null;
  /** What the terms actually say, in our words, not a guess from the name. */
  readonly licenseNote: string;
  /** Whether this may be reproduced inside a shipped product. Derived from licence. */
  readonly productUseAllowed: boolean;
  readonly permissionRequired: boolean;
  readonly peerReviewed: boolean;
  /** When we last opened the source and confirmed the bibliographic details. */
  readonly retrievedOn: string;
  /** When the publisher issued it, when that is a known date. */
  readonly publishedOn: string | null;
  readonly reviewedOn: string | null;
  /** How long this kind of source stays current before it needs re-review. */
  readonly reviewIntervalMonths: number;
  readonly reviewStatus: ReviewStatus;
  readonly version: number;
  /** Id of the source that replaces this one, once superseded. */
  readonly supersededBy: string | null;
  readonly notes: string | null;
}

export interface EvidenceClaim {
  readonly id: string;
  /** One sentence, stated no more strongly than the evidence allows. */
  readonly statement: string;
  readonly topic: ClaimTopic;
  readonly grade: EvidenceGrade;
  /** 0–1. How confident the evidence itself makes us, not how confident the copy sounds. */
  readonly confidence: number;
  /** Who the evidence was gathered from. Never "everyone" unless it really was. */
  readonly population: string;
  /** What remains genuinely unknown. Required to be non-empty for non-strong grades. */
  readonly uncertainty: readonly string[];
  /** What the evidence cannot tell us. */
  readonly limitations: readonly string[];
  /** Situations where acting on this claim could cause harm. */
  readonly contraindications: readonly string[];
  readonly sources: readonly EvidenceLink[];
  readonly reviewStatus: ReviewStatus;
  readonly version: number;
  readonly reviewedOn: string | null;
  readonly reviewIntervalMonths: number;
  readonly supersededBy: string | null;
}

/**
 * Traceability from a product surface to the claims behind it.
 *
 * Phase 2 does not generate plans, so nothing consumes these yet; they exist so
 * that when a recommendation is eventually shown, the route back to a source
 * already exists and cannot be invented afterwards.
 */
export interface RecommendationLink {
  /** Stable id of the product rule, e.g. `vitalis.safety.rate-cap`. */
  readonly recommendationId: string;
  readonly claimIds: readonly string[];
  readonly rationale: string;
}

/**
 * An immutable record of a change to a source or claim.
 *
 * Versioning is append-only by design: a registry that can silently rewrite its
 * own history cannot be audited, which is the same reason the safety and audit
 * tables in Phase 1 reject updates.
 */
export interface EvidenceRevision {
  readonly entityType: "source" | "claim";
  readonly entityId: string;
  readonly version: number;
  readonly changedOn: string;
  /** Who made the change. An operator id, never an end-user identifier. */
  readonly changedBy: string;
  readonly summary: string;
}

export interface EvidenceRegistry {
  readonly sources: readonly EvidenceSource[];
  readonly claims: readonly EvidenceClaim[];
  readonly recommendations: readonly RecommendationLink[];
  readonly revisions: readonly EvidenceRevision[];
}
