// @vitest-environment jsdom
/**
 * TrainerSection: the settings-rows layout (owner spec, 2026-11-18).
 * One intro line, then a row per feature — title, one microcopy line,
 * control on the right. The share consent is the house Switch
 * (role=switch) with a visible On/Off state; turning sharing on
 * reveals the summary preview with the honest line — built here,
 * shown only on Profile, sent nowhere. The old documentation-style
 * prose is gone.
 *
 * The referral code row this card used to carry is retired (M-171):
 * the code is admin-granted and server-held now, shown only to
 * trainers by TrainerReferralSection. This card must not show a code
 * to anyone — the last test pins exactly that.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { resetPrefCache } from "@/lib/prefsStore";
import { readTrainerState } from "@/lib/trainer/state";
import { TrainerSection } from "./TrainerSection";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

describe("TrainerSection", () => {
  it("uses a real switch for share consent and states the sharing terms when on", async () => {
    render(<TrainerSection />);

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
    render(<TrainerSection />);

    /* One intro line, said once. */
    expect(screen.getByText("Bring your professional into Bloom — on your terms.")).toBeTruthy();

    /* A titled row per remaining feature. */
    expect(screen.getByRole("heading", { name: "Share summary" })).toBeTruthy();

    /* The old documentation prose is gone — nothing explains a
       feature twice, and the off state needs no paragraph: the
       switch and its label already say it. */
    expect(screen.queryByText(/meet them halfway/)).toBeNull();
    expect(screen.queryByText(/Nothing about your record is prepared/)).toBeNull();
    expect(screen.queryByText(/only exists while you allow it/)).toBeNull();
  });

  it("shows no referral code to anyone — the code is the trainers-only server section now", () => {
    render(<TrainerSection />);

    expect(screen.queryByRole("heading", { name: "Referral code" })).toBeNull();
    expect(screen.queryByText(/BLOOM-[A-Z0-9]{8}/)).toBeNull();
    expect(screen.queryByText(/30% of what Bloom receives/)).toBeNull();
    /* And merely rendering this card never mints a local code. */
    expect(readTrainerState().referralCode).toBeNull();
  });
});
