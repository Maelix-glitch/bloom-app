/**
 * The coach function's server-side AI-consent gate — the exact pure
 * module the deployed function bundles
 * (supabase/functions/coach/consent-core.ts), exercised the way
 * billing-core is (M-250, Engine Phase A).
 *
 * The properties that matter:
 *   · the semantics are the client domain's own (domain/consent.ts):
 *     the latest `ai_assistance` record decides, and a grant counts
 *     only under the policy version the person actually saw;
 *   · withdrawn, never-asked, stale-policy and malformed records all
 *     refuse — nothing about an unreadable record can grant;
 *   · a prefs read that does not answer fails closed as a retryable
 *     503, never as consent, mirroring the billing gate's M2 rule;
 *   · the mirrored constants (purpose, policy version, prefs key)
 *     are pinned equal to the client domain's, so this mirror cannot
 *     drift the way the safety mirror did before M-250.
 */

import { describe, expect, it } from "vitest";

import {
  AI_CONSENT_POLICY_VERSION,
  AI_CONSENT_PREFS_KEY,
  AI_CONSENT_PURPOSE,
  aiConsentGranted,
  consentErrorBody,
  consentErrorStatus,
  decideAiConsent,
  extractConsentRecords,
} from "../../../supabase/functions/coach/consent-core";
import { CONSENT_POLICY_VERSION } from "./domain/consent";
import { ASSESSMENT_KEY } from "../assessment/state";
import type { ConsentRecord } from "./domain/consent";

const grant = (overrides: Partial<ConsentRecord> = {}): ConsentRecord => ({
  purpose: "ai_assistance",
  state: "granted",
  policyVersion: CONSENT_POLICY_VERSION,
  decidedAt: "2026-11-25T00:00:00.000Z",
  ...overrides,
});

/** A user_prefs PostgREST result carrying the given consent records. */
function prefsRows(consents: unknown): unknown {
  return [
    {
      prefs: {
        [ASSESSMENT_KEY]: {
          value: { consents },
          updatedAt: "2026-11-25T00:00:00.000Z",
        },
      },
    },
  ];
}

describe("ai consent gate — the mirror cannot drift", () => {
  it("pins the purpose, policy version and prefs key to the client domain's", () => {
    expect(AI_CONSENT_PURPOSE).toBe("ai_assistance");
    expect(AI_CONSENT_POLICY_VERSION).toBe(CONSENT_POLICY_VERSION);
    expect(AI_CONSENT_PREFS_KEY).toBe(ASSESSMENT_KEY);
  });
});

describe("ai consent gate — the stored record decides", () => {
  it("allows a current-policy grant", () => {
    expect(decideAiConsent({ ok: true, rows: prefsRows([grant()]) })).toEqual({ kind: "allow" });
  });

  it("refuses when consent was withdrawn", () => {
    expect(decideAiConsent({ ok: true, rows: prefsRows([grant({ state: "withdrawn" })]) })).toEqual(
      { kind: "deny_required" },
    );
  });

  it("refuses when the purpose was never asked", () => {
    expect(decideAiConsent({ ok: true, rows: prefsRows([]) })).toEqual({ kind: "deny_required" });
    expect(
      decideAiConsent({
        ok: true,
        rows: prefsRows([grant({ purpose: "health_data_processing" })]),
      }),
    ).toEqual({ kind: "deny_required" });
  });

  it("the latest record wins: a grant after a withdrawal allows, and the reverse refuses", () => {
    expect(
      decideAiConsent({ ok: true, rows: prefsRows([grant({ state: "withdrawn" }), grant()]) }),
    ).toEqual({ kind: "allow" });
    expect(
      decideAiConsent({ ok: true, rows: prefsRows([grant(), grant({ state: "withdrawn" })]) }),
    ).toEqual({ kind: "deny_required" });
  });

  it("a grant under an older policy version is not a grant", () => {
    expect(
      decideAiConsent({
        ok: true,
        rows: prefsRows([grant({ policyVersion: "vitalis-consent-0.9.0" })]),
      }),
    ).toEqual({ kind: "deny_required" });
  });

  it("refuses when there is no prefs row at all — a successful read that answers 'nothing stored'", () => {
    expect(decideAiConsent({ ok: true, rows: [] })).toEqual({ kind: "deny_required" });
  });

  it("refuses on malformed shapes instead of guessing a grant", () => {
    for (const rows of [
      null,
      "nope",
      [null],
      [{ prefs: null }],
      [{ prefs: { [ASSESSMENT_KEY]: { value: { consents: "yes" } } } }],
      prefsRows([null, 42, { purpose: "ai_assistance" }]),
      prefsRows([{ purpose: "ai_assistance", state: "granted" }]),
    ]) {
      expect(decideAiConsent({ ok: true, rows })).toEqual({ kind: "deny_required" });
    }
  });
});

describe("ai consent gate — fail closed on an unanswered read", () => {
  it("an unanswered prefs read is a retryable refusal, never consent", () => {
    expect(decideAiConsent({ ok: false })).toEqual({ kind: "deny_unavailable" });
  });

  it("error bodies and statuses follow the gate convention", () => {
    expect(consentErrorBody({ kind: "allow" }, "r1")).toBeNull();
    expect(consentErrorStatus({ kind: "allow" })).toBeNull();
    expect(consentErrorBody({ kind: "deny_required" }, "r1")).toEqual({
      error: "ai_consent_required",
      requestId: "r1",
    });
    expect(consentErrorStatus({ kind: "deny_required" })).toBe(403);
    expect(consentErrorBody({ kind: "deny_unavailable" }, "r1")).toEqual({
      error: "ai_consent_unavailable",
      requestId: "r1",
    });
    expect(consentErrorStatus({ kind: "deny_unavailable" })).toBe(503);
  });
});

describe("ai consent gate — the pieces", () => {
  it("extractConsentRecords reads the assessment document's consents and nothing else", () => {
    const records = [grant()];
    expect(extractConsentRecords(prefsRows(records))).toEqual(records);
    expect(extractConsentRecords(prefsRows(undefined))).toEqual([]);
    expect(extractConsentRecords(undefined)).toEqual([]);
  });

  it("aiConsentGranted ignores other purposes and malformed entries", () => {
    expect(aiConsentGranted([grant({ purpose: "caregiver_sharing" }), null, grant()])).toBe(true);
    expect(aiConsentGranted(["granted"])).toBe(false);
  });
});
