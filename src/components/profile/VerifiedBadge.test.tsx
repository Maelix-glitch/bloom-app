// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { verificationStatus } from "@/lib/profile/verification";
import { VerifiedBadge, VERIFIED_BLUE, VERIFIED_GOLD } from "./VerifiedBadge";

/**
 * The badge is the visible half of the verification claim, so its gating is
 * pinned at render: every unmet-criteria combination renders nothing, and
 * the one fully-met combination — invited, confirmed, complete, recorded —
 * renders the blue tick.
 */

const VERIFIED = verificationStatus({
  invited: true,
  emailConfirmed: true,
  displayName: "Ivy",
  username: "ivy",
  hasRecord: true,
});

afterEach(() => cleanup());

describe("VerifiedBadge", () => {
  it("renders the blue tick when every criterion is met", () => {
    const { container } = render(<VerifiedBadge status={VERIFIED} />);
    expect(screen.getByTestId("verified-badge")).toBeTruthy();
    expect(screen.getByLabelText("Verified account")).toBeTruthy();
    expect(container.querySelector("svg path")?.getAttribute("fill")).toBe(VERIFIED_BLUE);
  });

  it("renders the gold tick in the rail tone, with the same gating", () => {
    /* Brief v4 (M-91): the sidebar rail wears the badge in Bloom gold.
       The tone changes the colour only — the criteria are untouched. */
    const { container } = render(<VerifiedBadge status={VERIFIED} tone="gold" />);
    expect(screen.getByTestId("verified-badge")).toBeTruthy();
    expect(container.querySelector("svg path")?.getAttribute("fill")).toBe(VERIFIED_GOLD);
  });

  it("renders nothing when the email is unconfirmed", () => {
    const status = verificationStatus({
      invited: true,
      emailConfirmed: false,
      displayName: "Ivy",
      username: "ivy",
      hasRecord: true,
    });
    const { container } = render(<VerifiedBadge status={status} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("verified-badge")).toBeNull();
  });

  it("renders nothing without an invite, and nothing without the record", () => {
    for (const input of [
      /* Not invited — even with a record, the tick refuses (owner's rule). */
      { invited: false, emailConfirmed: true, displayName: "Ivy", username: "ivy", hasRecord: true },
      /* Every step done but the grant not recorded yet — no tick. */
      { invited: true, emailConfirmed: true, displayName: "Ivy", username: "ivy", hasRecord: false },
    ]) {
      const { container, unmount } = render(<VerifiedBadge status={verificationStatus(input)} />);
      expect(container.firstChild).toBeNull();
      unmount();
    }
  });

  it("renders nothing when the name or the handle is missing", () => {
    for (const input of [
      { invited: true, emailConfirmed: true, displayName: null, username: "ivy", hasRecord: true },
      { invited: true, emailConfirmed: true, displayName: "Bloom User", username: "ivy", hasRecord: true },
      { invited: true, emailConfirmed: true, displayName: "Ivy", username: null, hasRecord: true },
      { invited: false, emailConfirmed: false, displayName: null, username: null, hasRecord: false },
    ]) {
      const { container, unmount } = render(<VerifiedBadge status={verificationStatus(input)} />);
      expect(container.firstChild).toBeNull();
      unmount();
    }
  });
});
