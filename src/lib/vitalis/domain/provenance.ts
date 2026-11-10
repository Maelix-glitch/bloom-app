/**
 * Data provenance for Bloom Vitalis.
 *
 * Every observation records where it came from. This exists so the app can
 * never present a guess as a measurement: a value typed in by the user, read
 * off a device, calculated from a formula, or estimated by a model are four
 * different things, and the UI must be able to say which one it is showing.
 *
 * Provenance is required, not optional. A value without provenance is treated
 * as invalid rather than assumed to be user-reported.
 */

export const PROVENANCE_SOURCES = [
  "user_reported",
  "measured",
  "calculated",
  "estimated",
  "imported",
  "unknown",
] as const;

export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];

export const DATA_QUALITIES = ["high", "medium", "low", "unknown"] as const;

export type DataQuality = (typeof DATA_QUALITIES)[number];

export interface Provenance {
  readonly source: ProvenanceSource;
  /** When the value was true of the person, not when it was saved. ISO date or datetime. */
  readonly recordedAt: string;
  /** Stable identifier of the formula, device or questionnaire that produced the value. */
  readonly method?: string | undefined;
  /** Version of that method, so a recomputation can be traced. */
  readonly methodVersion?: string | undefined;
  readonly quality?: DataQuality | undefined;
  /** 0–1. Only meaningful for calculated or estimated values. */
  readonly confidence?: number | undefined;
  readonly note?: string | undefined;
}

export interface Observation<T> {
  readonly value: T;
  readonly provenance: Provenance;
}

const ISO_DATE_OR_DATETIME =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export function isIsoTimestamp(value: string): boolean {
  return typeof value === "string" && ISO_DATE_OR_DATETIME.test(value) && Number.isFinite(Date.parse(value));
}

export function isProvenanceSource(value: unknown): value is ProvenanceSource {
  return typeof value === "string" && (PROVENANCE_SOURCES as readonly string[]).includes(value);
}

export function isDataQuality(value: unknown): value is DataQuality {
  return typeof value === "string" && (DATA_QUALITIES as readonly string[]).includes(value);
}

export class ProvenanceError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid provenance: ${issues.join("; ")}`);
    this.name = "ProvenanceError";
    this.issues = issues;
  }
}

/** Returns every problem found, so a caller can show them all at once. */
export function provenanceIssues(provenance: Provenance): string[] {
  const issues: string[] = [];
  if (!isProvenanceSource(provenance.source)) {
    issues.push(`unknown source "${String(provenance.source)}"`);
  }
  if (!isIsoTimestamp(provenance.recordedAt)) {
    issues.push("recordedAt must be an ISO date or datetime");
  }
  if (provenance.confidence !== undefined) {
    if (!Number.isFinite(provenance.confidence) || provenance.confidence < 0 || provenance.confidence > 1) {
      issues.push("confidence must be between 0 and 1");
    }
  }
  if (provenance.quality !== undefined && !isDataQuality(provenance.quality)) {
    issues.push(`unknown quality "${String(provenance.quality)}"`);
  }
  if (provenance.quality !== undefined && provenance.source === "measured" && provenance.confidence === undefined) {
    // Not an error: a measured value is trusted by definition. Recorded here so
    // callers that want a confidence figure know it was never supplied.
  }
  if (provenance.source === "measured" && provenance.quality === "low") {
    issues.push("a measured value cannot be recorded with low quality");
  }
  return issues;
}

export function isValidProvenance(provenance: Provenance): boolean {
  return provenanceIssues(provenance).length === 0;
}

/** Runtime guard for untrusted values. Never throws. */
export function isProvenance(value: unknown): value is Provenance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return provenanceIssues(value as Provenance).length === 0;
}

export function assertProvenance(provenance: Provenance): void {
  const issues = provenanceIssues(provenance);
  if (issues.length > 0) throw new ProvenanceError(issues);
}

/**
 * Build an observation. Fails closed: invalid provenance throws rather than
 * being stored with an assumed source.
 */
export function observation<T>(value: T, provenance: Provenance): Observation<T> {
  assertProvenance(provenance);
  return { value, provenance };
}

export function isMeasured(provenance: Provenance): boolean {
  return provenance.source === "measured";
}

/** True when the value was produced by arithmetic rather than observed. */
export function isDerived(provenance: Provenance): boolean {
  return provenance.source === "calculated" || provenance.source === "estimated";
}

/**
 * Whether a value may be shown as an actual measurement. Deliberately strict:
 * only measured values, not stale, and not below a stated confidence of 0.8.
 */
export function mayPresentAsMeasured(provenance: Provenance, asOf: string = new Date().toISOString(), maxAgeDays = 30): boolean {
  if (!isMeasured(provenance)) return false;
  if (provenance.confidence !== undefined && provenance.confidence < 0.8) return false;
  return !isStale(provenance, asOf, maxAgeDays);
}

export function ageInDays(provenance: Provenance, asOf: string = new Date().toISOString()): number | null {
  const then = Date.parse(provenance.recordedAt);
  const now = Date.parse(asOf);
  if (!Number.isFinite(then) || !Number.isFinite(now)) return null;
  const days = (now - then) / 86_400_000;
  return days < 0 ? 0 : Math.floor(days);
}

export function isStale(provenance: Provenance, asOf: string = new Date().toISOString(), maxAgeDays = 30): boolean {
  const age = ageInDays(provenance, asOf);
  if (age === null) return true;
  return age > maxAgeDays;
}

const SOURCE_COPY: Record<ProvenanceSource, string> = {
  user_reported: "You entered this",
  measured: "Measured",
  calculated: "Calculated from your data",
  estimated: "Estimated",
  imported: "Imported",
  unknown: "Source unknown",
};

export function describeProvenance(provenance: Provenance): string {
  const base = SOURCE_COPY[provenance.source] ?? SOURCE_COPY.unknown;
  const quality = provenance.quality && provenance.quality !== "unknown" ? ` · ${provenance.quality} quality` : "";
  return `${base}${quality}`;
}
