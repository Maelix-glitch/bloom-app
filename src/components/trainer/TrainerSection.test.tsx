// @vitest-environment jsdom
/**
 * TrainerSection (audit slice B): the referral code carries a real
 * Copy button with a "Copied" confirmation, and the share consent is
 * the house Switch (role=switch) with a visible On/Off state — plus
 * the honest on-state line: the summary exists only here, only while
 * on, and Bloom sends it nowhere.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { resetPrefCache } from "@/lib/prefsStore";
import { formatReferralCode } from "@/lib/trainer/referral";
import { readTrainerState } from "@/lib/trainer/state";
import { TrainerSection } from "./TrainerSection";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

describe("TrainerSection", () => {
  it("copies the displayed referral code and confirms with 'Copied'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<TrainerSection userId="user-42" />);
    const stored = readTrainerState().referralCode;
    expect(stored).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(formatReferralCode(stored!));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy());
  });

  it("uses a real switch for share consent and states the sharing terms when on", async () => {
    render(<TrainerSection userId="user-42" />);

    const toggle = screen.getByRole("switch", { name: "Share summary" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Sharing off")).toBeTruthy();
    expect(screen.queryByText(/Bloom does not send it anywhere/)).toBeNull();

    fireEvent.click(toggle);
    await waitFor(() => expect(readTrainerState().consentToShare).toBe(true));
    expect(screen.getByText("Sharing on")).toBeTruthy();
    expect(screen.getByText(/Bloom does not send it anywhere/)).toBeTruthy();
    expect(screen.getByText(/only while sharing is on/)).toBeTruthy();
  });
});
