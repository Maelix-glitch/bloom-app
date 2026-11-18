import { describe, expect, it } from "vitest";

import {
  OFFLINE_PILL_LABEL,
  OFFLINE_PILL_SHORT_LABEL,
  effectiveSyncState,
  offlineNotice,
  type SyncStoreState,
} from "./syncState";

/**
 * The offline model only ever downgrades, and only on the browser's own
 * word. Online, every store state passes through untouched — the tracker
 * store's settled states stay the single authority. Offline, the two
 * states that claim the account is reachable ("saved", "pending") fall
 * to the honest device state; states that already tell the truth, and
 * the unsettled one, are left exactly as they are.
 */
describe("effectiveSyncState", () => {
  const ALL: SyncStoreState[] = ["off", "loading", "signed-out", "saved", "pending", "error"];

  it("online changes nothing — every state passes through", () => {
    for (const state of ALL) {
      expect(effectiveSyncState(state, true)).toBe(state);
    }
  });

  it("offline downgrades the synced claim — sage may not stand without a network", () => {
    expect(effectiveSyncState("saved", false)).toBe("offline");
  });

  it("offline downgrades a save in flight — it is held on the device, not saving", () => {
    expect(effectiveSyncState("pending", false)).toBe("offline");
  });

  it("offline leaves the already-honest states exactly as they are", () => {
    expect(effectiveSyncState("error", false)).toBe("error");
    expect(effectiveSyncState("off", false)).toBe("off");
    expect(effectiveSyncState("signed-out", false)).toBe("signed-out");
  });

  it("offline never settles the unsettled state", () => {
    expect(effectiveSyncState("loading", false)).toBe("loading");
  });
});

describe("offline wording", () => {
  it("the pill names the device truth in full and in compact form", () => {
    expect(OFFLINE_PILL_LABEL).toBe("On this device — will sync when you're back");
    expect(OFFLINE_PILL_SHORT_LABEL).toBe("Offline");
  });

  it("the Today line exists only while offline, and promises only what the stores guarantee", () => {
    expect(offlineNotice(true)).toBeNull();
    expect(offlineNotice(false)).toBe(
      "You're offline — everything is saved on this device and will sync when you're back.",
    );
  });
});
