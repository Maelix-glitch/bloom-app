// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

/**
 * The achievements section's interim-flicker rule. On a fresh reload the
 * source hooks serve this device's records first and merge the account's
 * a moment later, so achievement fractions counted mid-arrival are interim
 * numbers (Balance Keeper 3/30) that visibly correct themselves (11/30).
 * `progressionRecordsSettled` is the gate that holds the gallery in its
 * loading state until the account records have actually landed — the
 * records-side twin of the balance rule the hero already follows.
 */

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabaseConfigProblem: () => null,
  supabase: {},
  watchAuth: () => () => {},
}));

import { progressionRecordsSettled } from "./useProgression";

const settled = {
  auth: "signed-in" as const,
  habitsLoading: false,
  moodLoading: false,
  trackersHydrated: true,
  trackerSyncState: "saved" as const,
};

describe("progressionRecordsSettled", () => {
  it("is settled once every account record has landed", () => {
    expect(progressionRecordsSettled(settled)).toBe(true);
  });

  it("is not settled while auth itself is still being checked", () => {
    expect(progressionRecordsSettled({ ...settled, auth: "checking" })).toBe(false);
  });

  it("is settled immediately when signed out or device-only — the device IS the record", () => {
    const interim = {
      ...settled,
      habitsLoading: true,
      moodLoading: true,
      trackersHydrated: false,
      trackerSyncState: "off" as const,
    };
    expect(progressionRecordsSettled({ ...interim, auth: "signed-out" })).toBe(true);
    expect(progressionRecordsSettled({ ...interim, auth: "off" })).toBe(true);
  });

  it("waits for each record source in turn", () => {
    expect(progressionRecordsSettled({ ...settled, habitsLoading: true })).toBe(false);
    expect(progressionRecordsSettled({ ...settled, moodLoading: true })).toBe(false);
    expect(progressionRecordsSettled({ ...settled, trackersHydrated: false })).toBe(false);
    expect(progressionRecordsSettled({ ...settled, trackerSyncState: "off" })).toBe(false);
    expect(progressionRecordsSettled({ ...settled, trackerSyncState: "loading" })).toBe(false);
  });

  it("settles when the tracker pull has answered, even on error (device stands in)", () => {
    expect(progressionRecordsSettled({ ...settled, trackerSyncState: "error" })).toBe(true);
    expect(progressionRecordsSettled({ ...settled, trackerSyncState: "pending" })).toBe(true);
    expect(progressionRecordsSettled({ ...settled, trackerSyncState: "signed-out" })).toBe(true);
  });
});
