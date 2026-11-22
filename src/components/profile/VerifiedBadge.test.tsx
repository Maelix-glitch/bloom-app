// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { verificationStatus } from "@/lib/profile/verification";
import { VerifiedBadge, VERIFIED_BLUE, VERIFIED_GOLD } from "./VerifiedBadge";

/**
 * The badge is the visible half of the verification claim, so its gating
 * is pinned at render. Grant-only (2026-11-22): the record is the whole
 * gate —
 *
 *   · a record renders the tick, even for a profile that would have
 *     failed every v2 gate (the record is never re-judged);
 *   · no record renders nothing, however invited, confirmed and
 *     complete the account is — those facts are not even inputs now.
 */

const VERIFIED = verificationStatus({ hasRecord: true });

afterEach(() => cleanup());

describe("VerifiedBadge", () => {
  it("renders the blue tick when the record exists", () => {
    const { container } = render(<VerifiedBadge status={VERIFIED} />);
    expect(screen.getByTestId("verified-badge")).toBeTruthy();
    expect(screen.getByLabelText("Verified account")).toBeTruthy();
    expect(container.querySelector("svg path")?.getAttribute("fill")).toBe(VERIFIED_BLUE);
  });

  it("renders the gold tick in the rail tone, with the same gating", () => {
    /* Brief v4 (M-91): the sidebar rail wears the badge in Bloom gold.
       The tone changes the colour only — the record gate is untouched. */
    const { container } = render(<VerifiedBadge status={VERIFIED} tone="gold" />);
    expect(screen.getByTestId("verified-badge")).toBeTruthy();
    expect(container.querySelector("svg path")?.getAttribute("fill")).toBe(VERIFIED_GOLD);
  });

  it("renders nothing without a record", () => {
    /* The old gates cannot substitute for the grant: an invited,
       confirmed, fully-named member with no record sees no tick —
       there is no input left that could say otherwise. */
    const { container } = render(<VerifiedBadge status={verificationStatus({ hasRecord: false })} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("verified-badge")).toBeNull();
  });
});
