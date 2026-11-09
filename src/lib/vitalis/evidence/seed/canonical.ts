/**
 * Canonical serialisation and content hashing for the evidence catalogue.
 *
 * The catalogue exists in two places: `catalog.ts`, which a human edits, and a
 * generated SQL file, which is what reaches PostgreSQL. Two representations of
 * the same facts drift unless something compares them, so this module produces
 * a stable fingerprint of the *parsed* catalogue rather than of a file's bytes.
 *
 * Two properties matter:
 *
 *   • Determinism. The same catalogue must hash identically on every machine,
 *     every Node version and both line-ending conventions. Nothing here depends
 *     on key insertion order, locale, time or a random value.
 *   • Sensitivity. Any meaningful edit — a changed locator, a new uncertainty
 *     sentence, a review date moved by a day — must produce a different hash.
 *
 * `canonicalise` is a small, explicit JSON encoder rather than
 * `JSON.stringify(value, sortedKeys)` because the latter leaves object key order
 * dependent on how the object was built and silently emits `undefined` in ways
 * that differ between arrays and objects. Being explicit also means an
 * unsupported value throws instead of quietly hashing as something else.
 */

import { createHash } from "node:crypto";

import type { EvidenceRegistry } from "../types";

/** Bumped when the generated SQL's shape changes in a way that needs review. */
export const SEED_FORMAT_VERSION = 2;

/**
 * A stable text encoding of any JSON-like value.
 *
 * Object keys are sorted; array order is preserved, because the catalogue's
 * order carries meaning (authors are a sequence, uncertainty entries are read in
 * the order written). Numbers go through `JSON.stringify` so `0.8` and `0.80`
 * cannot encode differently.
 */
export function canonicalise(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`cannot canonicalise a non-finite number: ${String(value)}`);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalise(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalise(entry)}`)
      .join(",")}}`;
  }
  throw new Error(`cannot canonicalise a value of type ${typeof value}`);
}

/**
 * SHA-256 over the canonical catalogue, as lowercase hex.
 *
 * Prefixed in SQL comments with `sha256:` so a reader can tell at a glance what
 * the string is; the bare hex is what the tests compare.
 */
export function catalogHash(registry: EvidenceRegistry): string {
  return createHash("sha256").update(canonicalise(registry), "utf8").digest("hex");
}

/** The hash exactly as it is written into the generated SQL header. */
export function catalogHashLabel(registry: EvidenceRegistry): string {
  return `sha256:${catalogHash(registry)}`;
}
