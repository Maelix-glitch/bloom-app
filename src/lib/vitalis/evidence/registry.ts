/**
 * The evidence registry: validation, traceability and supersession.
 *
 * A registry that only stores rows is a spreadsheet. The value here is that it
 * can answer three questions without a human reading every entry:
 *
 *   • Is every claim traceable to a source that actually exists? (`traceability`)
 *   • May we ship this claim, given the licences of its sources? (`isProductReady`)
 *   • What has gone stale or been replaced? (`traceability`, `supersededClaims`)
 *
 * Validation returns every problem rather than the first, the same way the Phase
 * 1 domain validators do, so a reviewer sees the whole list at once.
 *
 * Nothing here is per-user. Evidence is global reference data; account erasure
 * never touches it, and it is deliberately kept out of the health tables.
 */

import { assessAuthority, supportIssues } from "./authority";
import { licenseIssues, productUseAllowed } from "./licensing";
import { canBeUsed, isReviewOverdue } from "./review";
import type {
  ClaimDirection,
  EvidenceClaim,
  EvidenceLink,
  EvidenceRegistry,
  EvidenceSource,
  RecommendationLink,
} from "./types";
import { CLAIM_DIRECTIONS } from "./types";

const ID_PATTERN = /^[a-z0-9][a-z0-9.-]{2,63}$/;

export class EvidenceRegistryError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid evidence registry: ${issues.join("; ")}`);
    this.name = "EvidenceRegistryError";
    this.issues = issues;
  }
}

export function indexSources(sources: readonly EvidenceSource[]): Map<string, EvidenceSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

export function indexClaims(claims: readonly EvidenceClaim[]): Map<string, EvidenceClaim> {
  return new Map(claims.map((claim) => [claim.id, claim]));
}

/**
 * Problems with one source.
 *
 * The `reviewedOn` rule is not pedantry: an "approved" row with no review date
 * has no identifiable reviewer decision behind it, and it can never be found by
 * the re-review sweep because it has no clock.
 */
export function sourceIssues(source: EvidenceSource): string[] {
  const issues: string[] = [];
  if (!ID_PATTERN.test(source.id)) issues.push(`${source.id}: id must be a lowercase slug`);
  if (source.title.trim().length < 3) issues.push(`${source.id}: title is required`);
  if (source.publisher.trim().length < 2) issues.push(`${source.id}: publisher is required`);
  if (source.authors.length === 0)
    issues.push(`${source.id}: at least one author or issuing body is required`);
  if (!Number.isInteger(source.publicationYear) || source.publicationYear < 1900) {
    issues.push(`${source.id}: publicationYear must be a four-digit year`);
  }
  if (!/^https:\/\//.test(source.url)) {
    issues.push(`${source.id}: url must be https, so the source can be checked`);
  }
  if (!source.retrievedOn) issues.push(`${source.id}: retrievedOn is required`);
  if (source.reviewIntervalMonths < 1 || source.reviewIntervalMonths > 120) {
    issues.push(`${source.id}: reviewIntervalMonths must be between 1 and 120`);
  }
  if (canBeUsed(source.reviewStatus) && source.reviewedOn === null) {
    issues.push(`${source.id}: an approved source must record reviewedOn`);
  }
  if ((source.reviewStatus === "superseded") !== (source.supersededBy !== null)) {
    issues.push(`${source.id}: supersededBy must be set exactly when the status is superseded`);
  }
  if (source.version < 1) issues.push(`${source.id}: version must be at least 1`);
  issues.push(...licenseIssues(source));
  return issues;
}

/** Problems with one claim, given the sources it cites. */
export function claimIssues(
  claim: EvidenceClaim,
  sourcesById: Map<string, EvidenceSource>,
  asOf: string = new Date().toISOString().slice(0, 10),
): string[] {
  const issues: string[] = [];
  if (!ID_PATTERN.test(claim.id)) issues.push(`${claim.id}: id must be a lowercase slug`);
  if (claim.statement.trim().length < 10) issues.push(`${claim.id}: statement is required`);
  if (!Number.isFinite(claim.confidence) || claim.confidence < 0 || claim.confidence > 1) {
    issues.push(`${claim.id}: confidence must be between 0 and 1`);
  }
  if (claim.population.trim().length < 3) {
    issues.push(`${claim.id}: population is required — evidence always comes from someone`);
  }
  if (claim.grade !== "strong" && claim.uncertainty.length === 0) {
    issues.push(`${claim.id}: uncertainty must be stated unless the grade is strong`);
  }

  const seen = new Set<string>();
  for (const link of claim.sources) {
    if (seen.has(link.sourceId)) issues.push(`${claim.id}: cites ${link.sourceId} more than once`);
    seen.add(link.sourceId);
    if (!(CLAIM_DIRECTIONS as readonly string[]).includes(link.direction)) {
      issues.push(
        `${claim.id}: ${link.sourceId} has an unknown direction "${String(link.direction)}"`,
      );
    }
    if (link.locator.trim().length < 3) {
      issues.push(`${claim.id}: ${link.sourceId} needs a locator a reviewer can follow`);
    }
    if (!sourcesById.has(link.sourceId)) {
      issues.push(`${claim.id}: cites unknown source "${link.sourceId}"`);
    }
  }

  if (claim.reviewStatus === "approved") {
    const approved = claim.sources.filter(
      (link) => sourcesById.get(link.sourceId)?.reviewStatus === "approved",
    );
    if (claim.sources.length === 0) {
      issues.push(`${claim.id}: cannot be approved without any citation`);
    } else if (approved.length === 0) {
      issues.push(`${claim.id}: cannot be approved while every cited source is unapproved`);
    }
    // Approval and licensing must agree. The database enforces this too, but a
    // registry edited in memory should fail the same way rather than depend on
    // a migration having been applied.
    const unlicensed = claim.sources.filter((link) => {
      const source = sourcesById.get(link.sourceId);
      return source !== undefined && !productUseAllowed(source.license);
    });
    if (unlicensed.length > 0) {
      issues.push(
        `${claim.id}: cannot be approved while citing ${unlicensed
          .map((link) => link.sourceId)
          .join(", ")}, which is not licensed for product use`,
      );
    }
    if (claim.reviewedOn === null)
      issues.push(`${claim.id}: an approved claim must record reviewedOn`);
  }

  if (claim.supersededBy !== null && claim.reviewStatus !== "superseded") {
    issues.push(`${claim.id}: supersededBy is set while the status is "${claim.reviewStatus}"`);
  }

  issues.push(...supportIssues(claim.sources, claim.grade));
  return issues;
}

export function recommendationIssues(
  link: RecommendationLink,
  claimsById: Map<string, EvidenceClaim>,
): string[] {
  const issues: string[] = [];
  if (!ID_PATTERN.test(link.recommendationId)) {
    issues.push(`${link.recommendationId}: id must be a lowercase slug`);
  }
  if (link.claimIds.length === 0) {
    issues.push(`${link.recommendationId}: must cite at least one claim`);
  }
  for (const claimId of link.claimIds) {
    if (!claimsById.has(claimId)) {
      issues.push(`${link.recommendationId}: cites unknown claim "${claimId}"`);
    }
  }
  if (link.rationale.trim().length < 10) {
    issues.push(`${link.recommendationId}: rationale is required`);
  }
  return issues;
}

export function registryIssues(
  registry: EvidenceRegistry,
  asOf: string = new Date().toISOString().slice(0, 10),
): string[] {
  const issues: string[] = [];
  const sourcesById = indexSources(registry.sources);
  const claimsById = indexClaims(registry.claims);

  if (sourcesById.size !== registry.sources.length) issues.push("source ids must be unique");
  if (claimsById.size !== registry.claims.length) issues.push("claim ids must be unique");

  for (const source of registry.sources) issues.push(...sourceIssues(source));
  for (const claim of registry.claims) issues.push(...claimIssues(claim, sourcesById, asOf));
  for (const link of registry.recommendations)
    issues.push(...recommendationIssues(link, claimsById));

  for (const source of registry.sources) {
    if (source.supersededBy !== null && !sourcesById.has(source.supersededBy)) {
      issues.push(`${source.id}: supersededBy points at unknown source "${source.supersededBy}"`);
    }
  }
  for (const claim of registry.claims) {
    if (claim.supersededBy !== null && !claimsById.has(claim.supersededBy)) {
      issues.push(`${claim.id}: supersededBy points at unknown claim "${claim.supersededBy}"`);
    }
  }

  for (const revision of registry.revisions) {
    const known =
      revision.entityType === "source"
        ? sourcesById.has(revision.entityId)
        : claimsById.has(revision.entityId);
    if (!known) issues.push(`revision for unknown ${revision.entityType} "${revision.entityId}"`);
    if (revision.summary.trim().length < 5)
      issues.push(`revision ${revision.entityId}@${revision.version}: summary is required`);
  }

  return issues;
}

export function assertRegistry(registry: EvidenceRegistry, asOf?: string): void {
  const issues = registryIssues(registry, asOf);
  if (issues.length > 0) throw new EvidenceRegistryError(issues);
}

/* -------------------------------------------------------------------------- */
/* Traceability                                                               */
/* -------------------------------------------------------------------------- */

export interface TraceabilityReport {
  /** True when every recommendation reaches at least one cited, existing claim. */
  readonly complete: boolean;
  /** Claims that no source backs. These may exist, but must never be shown. */
  readonly untraceableClaims: readonly string[];
  /** Claims whose only citations we are not licensed to reproduce in a product. */
  readonly licenseBlockedClaims: readonly string[];
  /** Approved rows past their review date. */
  readonly overdue: readonly string[];
  /** Recommendations citing a claim that is not usable. */
  readonly stalledRecommendations: readonly string[];
}

export function claimsForRecommendation(
  registry: EvidenceRegistry,
  recommendationId: string,
): EvidenceClaim[] {
  const claimsById = indexClaims(registry.claims);
  const link = registry.recommendations.find(
    (entry) => entry.recommendationId === recommendationId,
  );
  if (!link) return [];
  return link.claimIds
    .map((claimId) => claimsById.get(claimId))
    .filter((claim): claim is EvidenceClaim => claim !== undefined);
}

/**
 * Whether a claim may be shown in a shipped product.
 *
 * All four conditions are required, and each exists because of a failure mode:
 *   approved    — a human checked it
 *   not superseded — it has not been replaced
 *   in date     — our confirmation has not expired
 *   every source usable — we are licensed to reproduce what it rests on
 */
export function isProductReady(
  claim: EvidenceClaim,
  sourcesById: Map<string, EvidenceSource>,
  asOf: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (!canBeUsed(claim.reviewStatus)) return false;
  if (claim.supersededBy !== null) return false;
  if (isReviewOverdue(claim, asOf)) return false;
  if (claim.sources.length === 0) return false;
  return claim.sources.every((link) => {
    const source = sourcesById.get(link.sourceId);
    if (!source) return false;
    if (!canBeUsed(source.reviewStatus) || source.supersededBy !== null) return false;
    if (!productUseAllowed(source.license)) return false;
    if (isReviewOverdue(source, asOf)) return false;
    return true;
  });
}

export function productReadyClaims(
  registry: EvidenceRegistry,
  asOf: string = new Date().toISOString().slice(0, 10),
): EvidenceClaim[] {
  const sourcesById = indexSources(registry.sources);
  return registry.claims.filter((claim) => isProductReady(claim, sourcesById, asOf));
}

export function traceability(
  registry: EvidenceRegistry,
  asOf: string = new Date().toISOString().slice(0, 10),
): TraceabilityReport {
  const sourcesById = indexSources(registry.sources);
  const claimsById = indexClaims(registry.claims);

  const untraceableClaims = registry.claims
    .filter((claim) => claim.sources.length === 0)
    .map((claim) => claim.id);

  const licenseBlockedClaims = registry.claims
    .filter(
      (claim) =>
        claim.sources.length > 0 &&
        claim.sources.some((link) => {
          const source = sourcesById.get(link.sourceId);
          return source !== undefined && !productUseAllowed(source.license);
        }),
    )
    .map((claim) => claim.id);

  const overdue = [
    ...registry.sources
      .filter((source) => isReviewOverdue(source, asOf))
      .map((source) => source.id),
    ...registry.claims.filter((claim) => isReviewOverdue(claim, asOf)).map((claim) => claim.id),
  ];

  const stalledRecommendations = registry.recommendations
    .filter((link) =>
      link.claimIds.some((claimId) => {
        const claim = claimsById.get(claimId);
        return claim === undefined || !isProductReady(claim, sourcesById, asOf);
      }),
    )
    .map((link) => link.recommendationId);

  return {
    complete: untraceableClaims.length === 0,
    untraceableClaims,
    licenseBlockedClaims,
    overdue,
    stalledRecommendations,
  };
}

/**
 * Claims replaced by a newer version, and what replaced them.
 *
 * Supersession is recorded in both directions on purpose: the old row points
 * forward so a reader is never left holding a retired claim, and this function
 * walks it so a report can say what changed and why.
 */
export function supersededClaims(
  registry: EvidenceRegistry,
): { readonly from: string; readonly to: string }[] {
  return registry.claims
    .filter((claim) => claim.supersededBy !== null)
    .map((claim) => ({ from: claim.id, to: claim.supersededBy as string }));
}

/** The authority tier of a source, for display next to a claim. */
export function sourceAuthority(source: EvidenceSource, asOf?: string) {
  return assessAuthority(source, asOf);
}

/** Convenience for the claim list: which of its citations are usable in a product. */
export function unusableCitations(
  claim: EvidenceClaim,
  sourcesById: Map<string, EvidenceSource>,
): EvidenceLink[] {
  return claim.sources.filter((link) => {
    const source = sourcesById.get(link.sourceId);
    return (
      source === undefined || !productUseAllowed(source.license) || !canBeUsed(source.reviewStatus)
    );
  });
}

export function isClaimDirection(value: unknown): value is ClaimDirection {
  return typeof value === "string" && (CLAIM_DIRECTIONS as readonly string[]).includes(value);
}
