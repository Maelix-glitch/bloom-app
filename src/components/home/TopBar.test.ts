import { describe, expect, it } from "vitest";

import { syncPillModel } from "./TopBar";

/**
 * The TopBar sync pill (Reskin slice A, pinned addition) is honest or it
 * is nothing: the breathing sage pulse belongs ONLY to the genuinely
 * synced state, every other settled state wears a still dot in its own
 * colour, and while the account check runs there is no pill at all.
 * Labels are the sync store's own messages (useTrackers), with the
 * sentence-ending full stop dropped inside the pill.
 */
describe("syncPillModel", () => {
  it("pulses sage only when actually synced, with the protected wording in full", () => {
    expect(syncPillModel("saved", "Synced with your account.")).toEqual({
      label: "Synced with your account",
      shortLabel: "Synced",
      dot: "sage",
      live: true,
    });
    expect(syncPillModel("saved", "Saved to your account")?.live).toBe(true);
  });

  it("pending is a still gold dot — no pulse theatre while saving", () => {
    expect(syncPillModel("pending", "Saving…")).toEqual({
      label: "Saving…",
      shortLabel: "Saving…",
      dot: "gold",
      live: false,
    });
  });

  it("error is a still rose dot with the store's own words", () => {
    expect(syncPillModel("error", "Saved here — not on your account yet")).toEqual({
      label: "Saved here — not on your account yet",
      shortLabel: "Not synced yet",
      dot: "rose",
      live: false,
    });
  });

  it("device-only states are still and muted", () => {
    expect(syncPillModel("off", "Saved on this device")).toEqual({
      label: "Saved on this device",
      shortLabel: "On this device",
      dot: "muted",
      live: false,
    });
    expect(syncPillModel("signed-out", "Saved on this device — sign in to sync")).toEqual({
      label: "Saved on this device — sign in to sync",
      shortLabel: "Not signed in",
      dot: "muted",
      live: false,
    });
  });

  it("renders no pill while the account check is still running", () => {
    expect(syncPillModel("loading", "Checking your account…")).toBeNull();
    expect(syncPillModel("saved", null)).toBeNull();
    expect(syncPillModel("saved", "")).toBeNull();
  });

  /* Offline-First Bharat: the browser's offline word downgrades the
     pill — connectivity only ever takes a claim away, never grants one. */
  it("offline, a synced pill falls to the device truth — still muted, no pulse", () => {
    expect(syncPillModel("saved", "Synced with your account.", false)).toEqual({
      label: "On this device — will sync when you're back",
      shortLabel: "Offline",
      dot: "muted",
      live: false,
    });
  });

  it("offline, a saving pill is held on the device, not saving", () => {
    expect(syncPillModel("pending", "Saving…", false)).toEqual({
      label: "On this device — will sync when you're back",
      shortLabel: "Offline",
      dot: "muted",
      live: false,
    });
  });

  it("offline leaves the already-honest states in their own words", () => {
    expect(syncPillModel("error", "Saved here — not on your account yet", false)?.dot).toBe("rose");
    expect(syncPillModel("off", "Saved on this device", false)?.label).toBe("Saved on this device");
    expect(
      syncPillModel("signed-out", "Saved on this device — sign in to sync", false)?.label,
    ).toBe("Saved on this device — sign in to sync");
    expect(syncPillModel("loading", "Checking your account…", false)).toBeNull();
  });

  it("the two-argument form is unchanged — online is the default", () => {
    expect(syncPillModel("saved", "Synced with your account.")).toEqual(
      syncPillModel("saved", "Synced with your account.", true),
    );
  });
});
