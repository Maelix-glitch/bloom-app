// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { verificationStatus } from "@/lib/profile/verification";
import { VerifiedBadge, VERIFIED_BLUE } from "./VerifiedBadge";

/**
 * The badge is the visible half of the verification claim, so its gating is
 * pinned at render: every unmet-criteria combination renders nothing, and
 * the one fully-met combination renders the blue tick.
 */

const VERIFIED = verificationStatus({
  emailConfirmed: true,
  displayName: "Ivy",
  username: "ivy",
});

afterEach(() => cleanup());

describe("VerifiedBadge", () => {
  it("renders the blue tick when every criterion is met", () => {
    const { container } = render(<VerifiedBadge status={VERIFIED} />);
    expect(screen.getByTestId("verified-badge")).toBeTruthy();
    expect(screen.getByLabelText("Verified account")).toBeTruthy();
    expect(container.querySelector("svg path")?.getAttribute("fill")).toBe(VERIFIED_BLUE);
  });

  it("renders nothing when the email is unconfirmed", () => {
    const status = verificationStatus({
      emailConfirmed: false,
      displayName: "Ivy",
      username: "ivy",
    });
    const { container } = render(<VerifiedBadge status={status} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("verified-badge")).toBeNull();
  });

  it("renders nothing when the name or the handle is missing", () => {
    for (const input of [
      { emailConfirmed: true, displayName: null, username: "ivy" },
      { emailConfirmed: true, displayName: "Bloom User", username: "ivy" },
      { emailConfirmed: true, displayName: "Ivy", username: null },
      { emailConfirmed: false, displayName: null, username: null },
    ]) {
      const { container, unmount } = render(<VerifiedBadge status={verificationStatus(input)} />);
      expect(container.firstChild).toBeNull();
      unmount();
    }
  });
});
