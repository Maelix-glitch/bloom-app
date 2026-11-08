// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { profileRecordsSettled, useProfileRecord } from "./useProfileRecord";

/* ------------------------- the settle predicate ------------------------- */

const SETTLED = {
  auth: "signed-in" as const,
  habitsLoading: false,
  moodSettled: true,
  trackersHydrated: true,
  trackerSyncState: "saved" as const,
  cycleHydrated: true,
};

describe("profileRecordsSettled — totals are final only when every source answered", () => {
  it("all sources answered: settled", () => {
    expect(profileRecordsSettled(SETTLED)).toBe(true);
  });

  it("auth still checking: not settled, however much else has landed", () => {
    expect(profileRecordsSettled({ ...SETTLED, auth: "checking" })).toBe(false);
  });

  it("habits still loading from the account: not settled", () => {
    expect(profileRecordsSettled({ ...SETTLED, habitsLoading: true })).toBe(false);
  });

  it("mood block still loading: not settled — check-ins count as logged days", () => {
    expect(profileRecordsSettled({ ...SETTLED, moodSettled: false })).toBe(false);
  });

  it("tracker pull hasn't answered yet (off / loading): not settled", () => {
    expect(profileRecordsSettled({ ...SETTLED, trackerSyncState: "off" })).toBe(false);
    expect(profileRecordsSettled({ ...SETTLED, trackerSyncState: "loading" })).toBe(false);
  });

  it("tracker pull errored: settled — the device days stand in", () => {
    expect(profileRecordsSettled({ ...SETTLED, trackerSyncState: "error" })).toBe(true);
  });

  it("local stores not hydrated yet: not settled", () => {
    expect(profileRecordsSettled({ ...SETTLED, trackersHydrated: false })).toBe(false);
    expect(profileRecordsSettled({ ...SETTLED, cycleHydrated: false })).toBe(false);
  });

  it("signed out: the device record is the record once local reads land", () => {
    expect(
      profileRecordsSettled({
        ...SETTLED,
        auth: "signed-out",
        habitsLoading: true, // no account load runs signed out
        trackerSyncState: "off", // and no pull either
      }),
    ).toBe(true);
  });
});

/* ------------------------------ the hook -------------------------------- */

const state = vi.hoisted(() => ({
  habitsLoading: true,
  auth: "signed-in" as "checking" | "signed-out" | "signed-in" | "off",
  syncState: "saved" as string,
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => ({
    days: [],
    active: [],
    hydrated: true,
    sync: { state: state.syncState, message: "", signedIn: true },
    analysis: {
      trackers: Object.fromEntries(
        ["sleep", "water", "study", "movement", "energy", "screen"].map((id) => [
          id,
          { series: [], streak: 0 },
        ]),
      ),
    },
  }),
}));

vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => ({
    habits: [],
    logs: [],
    loading: state.habitsLoading,
    auth: state.auth,
  }),
}));

vi.mock("@/hooks/usePeriodLog", () => ({
  usePeriodLog: () => ({
    days: [],
    logs: [],
    mode: "off",
    hydrated: true,
    analysis: { isGeneric: true, averageLength: 28 },
  }),
}));

vi.mock("@/hooks/useCycleVisible", () => ({
  useCycleVisible: () => ({ optedOut: true }),
}));

describe("useProfileRecord — settled latches", () => {
  it("unsettled while the account load is in flight; settled when it lands; settled forever", () => {
    state.habitsLoading = true;
    state.auth = "signed-in";
    const { result, rerender } = renderHook(() => useProfileRecord([], { moodSettled: true }));
    expect(result.current.settled).toBe(false);

    state.habitsLoading = false;
    rerender();
    expect(result.current.settled).toBe(true);

    /* a background refetch flips loading back on — the latch must hold,
       so settled figures never flash back to skeletons */
    state.habitsLoading = true;
    rerender();
    expect(result.current.settled).toBe(true);
  });

  it("the mood block gates settling: entries alone are not enough", () => {
    state.habitsLoading = false;
    const { result, rerender } = renderHook(() => useProfileRecord([], { moodSettled: false }));
    expect(result.current.settled).toBe(false);
    rerender();
    const { result: ready } = renderHook(() => useProfileRecord([], { moodSettled: true }));
    expect(ready.current.settled).toBe(true);
  });
});
