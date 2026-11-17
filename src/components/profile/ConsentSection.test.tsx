// @vitest-environment jsdom
/**
 * Your consent — the Profile settings row that reports the consent records
 * the Assessment stores. Pinned here:
 *   · a granted permission shows its state and the date from its own stored
 *     record — the rendered date is the stored `decidedAt`, never today and
 *     never a completion date borrowed from elsewhere;
 *   · each permission is reported separately, in the flow's own words for
 *     what it covers;
 *   · a withdrawn permission says so, with the withdrawal's date;
 *   · a grant made under an earlier version of the wording is reported as
 *     no longer counting (the domain's effective-state rule), not as given;
 *   · with no records at all, the row shows an honest empty state that
 *     points at the Assessment, and invents no dates.
 *
 * These tests drive the real component against the real prefs document,
 * seeded with the real state transitions and the domain's own
 * `consentDecision`, the way AssessmentTransition.test.tsx drives Profile's
 * assessment card.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { CONSENT_COPY, consentDecision } from "@/lib/vitalis/domain/consent";
import {
  ASSESSMENT_KEY,
  emptyAssessmentState,
  recordConsents,
  type AssessmentState,
} from "@/lib/assessment/state";
import { ConsentSection } from "./ConsentSection";

const GRANTED_AT = "2026-03-04T09:15:00.000Z";
const SENSITIVE_AT = "2026-03-04T09:16:00.000Z";
const WITHDRAWN_AT = "2026-06-20T18:45:00.000Z";

/** The same format the settings list renders dates in. */
function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function seed(state: AssessmentState) {
  setPref(ASSESSMENT_KEY, state);
}

function withConsents(...records: Parameters<typeof recordConsents>[1]): AssessmentState {
  return recordConsents(emptyAssessmentState(GRANTED_AT), records, GRANTED_AT);
}

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

afterEach(() => {
  cleanup();
});

function expand() {
  fireEvent.click(screen.getByTestId("pf-row-consent"));
  return screen.getByTestId("pf-consent-detail");
}

describe("ConsentSection", () => {
  it("shows a granted permission with the date from its stored record", () => {
    seed(
      withConsents(
        consentDecision("health_data_processing", true, GRANTED_AT),
        consentDecision("sensitive_health_processing", true, SENSITIVE_AT),
      ),
    );
    render(<ConsentSection />);

    expect(screen.getByTestId("pf-row-consent").textContent).toContain("Your consent");
    expect(screen.getByTestId("pf-row-consent").textContent).toContain("Given");

    const detail = expand();
    /* What it covers, in the exact words the Assessment flow shows. */
    expect(detail.textContent).toContain(CONSENT_COPY.health_data_processing.label);
    expect(detail.textContent).toContain(CONSENT_COPY.health_data_processing.description);
    expect(detail.textContent).toContain(CONSENT_COPY.sensitive_health_processing.label);
    expect(detail.textContent).toContain(CONSENT_COPY.sensitive_health_processing.description);
    /* Each permission carries its own record's date. */
    expect(detail.textContent).toContain(`Given on ${fmt(GRANTED_AT)}`);
    expect(detail.textContent).toContain(`Given on ${fmt(SENSITIVE_AT)}`);
  });

  it("renders the stored decidedAt, not today's date", () => {
    seed(withConsents(consentDecision("health_data_processing", true, GRANTED_AT)));
    render(<ConsentSection />);

    const detail = expand();
    expect(detail.textContent).toContain(`Given on ${fmt(GRANTED_AT)}`);
    expect(detail.textContent).not.toContain(`Given on ${fmt(new Date().toISOString())}`);
    /* The permission never decided on is reported plainly, with no date. */
    expect(detail.textContent).toContain("Not given");
  });

  it("reports a withdrawal with the withdrawal record's date", () => {
    seed(
      withConsents(
        consentDecision("health_data_processing", true, GRANTED_AT),
        consentDecision("health_data_processing", false, WITHDRAWN_AT),
      ),
    );
    render(<ConsentSection />);

    expect(screen.getByTestId("pf-row-consent").textContent).toContain("Withdrawn");
    const detail = expand();
    expect(detail.textContent).toContain(`Withdrawn on ${fmt(WITHDRAWN_AT)}`);
    expect(detail.textContent).not.toContain(`Given on ${fmt(GRANTED_AT)}`);
  });

  it("does not count a grant made under an earlier version of the wording", () => {
    seed(
      withConsents(
        consentDecision("health_data_processing", true, GRANTED_AT, "vitalis-consent-0.9.0"),
      ),
    );
    render(<ConsentSection />);

    expect(screen.getByTestId("pf-row-consent").textContent).toContain("Not given");
    const detail = expand();
    expect(detail.textContent).toContain("earlier version of these permissions");
    expect(detail.textContent).toContain("no longer counts");
  });

  it("shows an honest empty state when no consent was ever asked or given", () => {
    /* Nothing seeded at all — no assessment, no records. */
    render(<ConsentSection />);

    expect(screen.getByTestId("pf-row-consent").textContent).toContain("None yet");
    const detail = expand();
    expect(detail.textContent).toContain("haven’t been asked for any health-data permissions yet");
    expect(detail.textContent).toContain("Assessment");
    /* No dates are invented for a record that does not exist. */
    expect(detail.textContent).not.toMatch(/Given on|Withdrawn on/);
  });
});
