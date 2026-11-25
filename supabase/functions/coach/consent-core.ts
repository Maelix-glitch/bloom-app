/**
 * consent-core — the server-side AI-consent check for the coach edge
 * function, kept pure (no Deno APIs, no fetch, no env) so the exact
 * code the function bundles is what vitest exercises, the same pattern
 * as billing-core.ts. index.ts owns the transport: it reads the
 * caller's synced prefs document from `user_prefs` under the caller's
 * own JWT (RLS scopes the read to the caller — there is no
 * service-role key in this function) and hands the rows here.
 *
 * WHY THIS EXISTS (M-250, Engine Phase A — the M-243 census's second
 * verified drift, R-VIT-007): until now the `ai_assistance` consent
 * was enforced ONLY by the client hook (useAiConsentGate): a client
 * that skipped the hook could reach the providers without the person
 * ever having granted the permission. The check now also lives here,
 * BEFORE the billing gate, on every provider path (Coach chat,
 * Vitalis chat, TTS) — a request without a stored grant is refused
 * before any provider is called and before any credit is checked, let
 * alone spent.
 *
 * THE SEMANTICS mirror the client domain exactly
 * (src/lib/vitalis/domain/consent.ts, `consentState`/`hasConsent`):
 *
 *   · the records are the person's consent records, stored in their
 *     Assessment document (prefs key `health.assessment.v1`, its
 *     `consents` array) and synced to `user_prefs` by the client;
 *   · the LATEST record for purpose `ai_assistance` decides;
 *   · a grant counts only for the policy version the person actually
 *     saw (`vitalis-consent-1.0.0` today) — a grant under older words
 *     is `not_asked`, not a grant;
 *   · withdrawn, never asked, and no readable record all refuse.
 *
 * FAIL-CLOSED, in the billing gate's shape: when the prefs read does
 * not answer at all, the decision is a retryable refusal
 * (`deny_unavailable`, 503) — an outage must never silently become
 * consent. A read that answers "nothing stored" is not an outage: it
 * is a person with no grant on record, refused as
 * `deny_required` (403).
 *
 * The three mirrored constants below (purpose, policy version, prefs
 * key) are pinned equal to the client domain's by
 * src/lib/vitalis/aiConsentCore.test.ts, so the mirror cannot drift
 * the way the safety mirror did.
 */

/** Mirrors ConsentPurpose "ai_assistance" in the client domain. */
export const AI_CONSENT_PURPOSE = "ai_assistance";

/** Mirrors CONSENT_POLICY_VERSION in src/lib/vitalis/domain/consent.ts. */
export const AI_CONSENT_POLICY_VERSION = "vitalis-consent-1.0.0";

/** Mirrors ASSESSMENT_KEY in src/lib/assessment/state.ts — the prefs
 *  key whose document carries the consent records. */
export const AI_CONSENT_PREFS_KEY = "health.assessment.v1";

export type AiConsentDecision =
  | { kind: "allow" }
  | { kind: "deny_required" }
  | { kind: "deny_unavailable" };

interface ConsentRecordShape {
  purpose?: unknown;
  state?: unknown;
  policyVersion?: unknown;
}

/**
 * The client's rule, restated over unknown data: among the records
 * for the AI purpose, the latest one decides; it grants only when its
 * state is "granted" AND it was decided under the current policy
 * version. Malformed entries are ignored — a record that cannot be
 * read cannot grant anything.
 */
export function aiConsentGranted(records: readonly unknown[]): boolean {
  let latest: ConsentRecordShape | null = null;
  for (const raw of records) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as ConsentRecordShape;
    if (record.purpose === AI_CONSENT_PURPOSE) latest = record;
  }
  if (!latest) return false;
  return latest.state === "granted" && latest.policyVersion === AI_CONSENT_POLICY_VERSION;
}

/**
 * Pull the consent records out of a `user_prefs` PostgREST result:
 * an array of rows, each row's `prefs` the synced document
 * `{ [key]: { value, updatedAt } }`, the Assessment document's value
 * carrying `consents`. Any shape that does not resolve to an array
 * yields an empty record list — "no readable record", which the
 * decision below refuses as not granted.
 */
export function extractConsentRecords(prefsRows: unknown): readonly unknown[] {
  if (!Array.isArray(prefsRows) || prefsRows.length === 0) return [];
  const row = prefsRows[0];
  if (!row || typeof row !== "object") return [];
  const prefs = (row as { prefs?: unknown }).prefs;
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return [];
  const entry = (prefs as Record<string, unknown>)[AI_CONSENT_PREFS_KEY];
  if (!entry || typeof entry !== "object") return [];
  const value = (entry as { value?: unknown }).value;
  if (!value || typeof value !== "object") return [];
  const consents = (value as { consents?: unknown }).consents;
  return Array.isArray(consents) ? consents : [];
}

/**
 * THE decision. `read` is the transport's outcome: `{ ok: false }`
 * when the prefs read did not answer (network error, non-OK status,
 * missing config) — the fail-closed outage refusal. `{ ok: true }`
 * carries whatever PostgREST returned; the stored record then
 * decides, and only a current-version grant allows.
 */
export function decideAiConsent(
  read: { ok: true; rows: unknown } | { ok: false },
): AiConsentDecision {
  if (!read.ok) return { kind: "deny_unavailable" };
  return aiConsentGranted(extractConsentRecords(read.rows))
    ? { kind: "allow" }
    : { kind: "deny_required" };
}

/** The error body for a refused consent check — the client keys its
 *  behaviour off `error`, the same convention as the billing gate. */
export function consentErrorBody(
  decision: AiConsentDecision,
  requestId: string,
): Record<string, unknown> | null {
  if (decision.kind === "deny_required") {
    return { error: "ai_consent_required", requestId };
  }
  if (decision.kind === "deny_unavailable") {
    return { error: "ai_consent_unavailable", requestId };
  }
  return null;
}

/** The HTTP status for a refused consent check: a missing grant is a
 *  403 (the person has not given the permission — retrying the same
 *  request changes nothing), an unanswered prefs read is a retryable
 *  503, mirroring billing_unavailable. Allows carry no error. */
export function consentErrorStatus(decision: AiConsentDecision): number | null {
  if (decision.kind === "deny_required") return 403;
  if (decision.kind === "deny_unavailable") return 503;
  return null;
}
