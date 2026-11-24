// @vitest-environment jsdom
/**
 * useAiConsentGate (M-232) — the just-in-time ai_assistance ask, pinned:
 *
 *   · already granted → ensure() is true at once and no ask ever opens;
 *   · never asked → the first ensure() opens the ask and stays pending
 *     until the person answers; Allow records the grant (through the
 *     real consent writer, into the real prefs document) and resolves
 *     true; Not now resolves false and sends nothing;
 *   · asked once on a surface → never asked again on that surface, but
 *     the other surface still gets its own one ask;
 *   · withdrawn → false at once, no ask — a recorded decision is
 *     respected, not re-litigated at the composer;
 *   · after Allow, later ensures are true without asking (the grant is
 *     read from the stored records, not from component state).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import {
  ASSESSMENT_KEY,
  emptyAssessmentState,
  recordConsents,
  type AssessmentState,
} from "@/lib/assessment/state";
import { consentDecision, hasConsent } from "@/lib/vitalis/domain/consent";
import { useAiConsentGate, type AiConsentSurface } from "./useAiConsentGate";

const AT = "2026-03-04T09:15:00.000Z";

function seed(state: AssessmentState) {
  setPref(ASSESSMENT_KEY, state);
  resetPrefCache();
}

function seedConsents(...records: Parameters<typeof recordConsents>[1]) {
  seed(recordConsents(emptyAssessmentState(AT), records, AT));
}

function storedConsents(): AssessmentState["consents"] {
  const raw = window.localStorage.getItem("bloom.prefs.v1");
  if (!raw) return [];
  const doc = JSON.parse(raw) as Record<string, { value?: AssessmentState }>;
  return doc[ASSESSMENT_KEY]?.value?.consents ?? [];
}

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

afterEach(() => {
  cleanup();
});

function gate(surface: AiConsentSurface = "coach") {
  return renderHook(() => useAiConsentGate(surface));
}

describe("useAiConsentGate", () => {
  it("resolves true at once when the permission is already granted", async () => {
    seedConsents(consentDecision("ai_assistance", true, AT));
    const { result } = gate();
    await expect(result.current.ensure()).resolves.toBe(true);
    expect(result.current.askOpen).toBe(false);
  });

  it("opens the ask on the first send; Allow records the grant and resolves true", async () => {
    seed(emptyAssessmentState(AT));
    const { result } = gate();

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.ensure();
    });
    expect(result.current.askOpen).toBe(true);

    act(() => {
      result.current.allow();
    });
    await expect(pending).resolves.toBe(true);
    expect(result.current.askOpen).toBe(false);
    /* The grant is a real stored consent record, not local state. */
    expect(hasConsent(storedConsents(), "ai_assistance")).toBe(true);
    /* And later sends pass without asking again. */
    await expect(result.current.ensure()).resolves.toBe(true);
    expect(result.current.askOpen).toBe(false);
  });

  it("Not now resolves false — and the surface is never asked twice", async () => {
    seed(emptyAssessmentState(AT));
    const { result } = gate();

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.ensure();
    });
    expect(result.current.askOpen).toBe(true);
    act(() => {
      result.current.notNow();
    });
    await expect(pending).resolves.toBe(false);
    expect(hasConsent(storedConsents(), "ai_assistance")).toBe(false);

    /* Second send on the same surface: refused silently, no sheet. */
    await expect(result.current.ensure()).resolves.toBe(false);
    expect(result.current.askOpen).toBe(false);
  });

  it("asks once per surface: the other surface still gets its own ask", async () => {
    seed(emptyAssessmentState(AT));
    const coach = gate("coach");
    let pending!: Promise<boolean>;
    act(() => {
      pending = coach.result.current.ensure();
    });
    act(() => {
      coach.result.current.notNow();
    });
    await expect(pending).resolves.toBe(false);

    const vitalis = gate("vitalis");
    let vitalisPending!: Promise<boolean>;
    act(() => {
      vitalisPending = vitalis.result.current.ensure();
    });
    expect(vitalis.result.current.askOpen).toBe(true);
    act(() => {
      vitalis.result.current.notNow();
    });
    await expect(vitalisPending).resolves.toBe(false);
  });

  it("a withdrawn permission refuses at once, with no ask", async () => {
    seedConsents(
      consentDecision("ai_assistance", true, AT),
      consentDecision("ai_assistance", false, AT),
    );
    const { result } = gate();
    await expect(result.current.ensure()).resolves.toBe(false);
    expect(result.current.askOpen).toBe(false);
  });
});
