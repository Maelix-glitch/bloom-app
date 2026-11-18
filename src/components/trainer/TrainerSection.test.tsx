// @vitest-environment jsdom
/**
 * TrainerSection: the settings-rows layout (owner spec, 2026-11-18).
 * One intro line, then a row per feature — title, one microcopy line,
 * control on the right. The referral code carries a real Copy button
 * with a "Copied" confirmation inside its code field; the share
 * consent is the house Switch (role=switch) with a visible On/Off
 * state; turning sharing on reveals the summary preview with the
 * honest line — built here, shown only on Profile, sent nowhere.
 * The old documentation-style prose is gone.
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

  it("reads as rows: one intro line, one microcopy line per feature, no leftover prose", () => {
    render(<TrainerSection userId="user-42" />);

    /* One intro line, said once. */
    expect(screen.getByText("Bring your professional into Bloom — on your terms.")).toBeTruthy();

    /* A titled row per feature. */
    expect(screen.getByRole("heading", { name: "Referral code" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Share summary" })).toBeTruthy();

    /* The economics survive the copy cut, in the row's one line:
       30% of what Bloom RECEIVES, paid monthly once the month's
       COMMISSION reaches ₹1,000. */
    expect(screen.getByText(/30% of what Bloom receives from clients who join/)).toBeTruthy();
    expect(screen.getByText(/paid monthly once commission reaches ₹1,000/)).toBeTruthy();

    /* The old documentation prose is gone — nothing explains a
       feature twice, and the off state needs no paragraph: the
       switch and its label already say it. */
    expect(screen.queryByText(/meet them halfway/)).toBeNull();
    expect(screen.queryByText(/Nothing about your record is prepared/)).toBeNull();
    expect(screen.queryByText(/only exists while you allow it/)).toBeNull();
  });
});
