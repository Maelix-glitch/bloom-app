/**
 * Offline-First Bharat — the truthful sync state model.
 *
 * What sync really does in Bloom today (explored 2026-11-18, see the build
 * log): every store is device-first and durable on-device. Tracker days
 * persist in localStorage behind a dirty-date queue that re-queues on
 * failure; the prefs document persists in localStorage behind a debounced
 * push that retries on the next change; habits keep a device mirror that
 * uploads on sign-in. A write attempted while offline is therefore NOT
 * lost — it is already on the device and mirrors later — so this module
 * deliberately builds no second queue. What was missing is honesty about
 * connectivity: the TopBar pill reflected only the last settled tracker
 * sync, so a phone that went offline after syncing kept pulsing sage
 * "Synced with your account" in a lift, a basement, a train.
 *
 * This model only ever DOWNGRADES. When the browser itself reports the
 * device offline, a settled "saved"/"pending" can no longer be claimed —
 * the effective state becomes "offline" (on this device; will sync when
 * you're back). States that are already honest ("error", "off",
 * "signed-out") and the unsettled "loading" pass through untouched, and
 * nothing here ever upgrades a state or widens the pill's claim: no store
 * except the tracker store reports pending/failed at all (prefs pushes
 * retry silently by design), so "synced" remains exactly what the tracker
 * store settled — never a claim about every byte in the app.
 */

/** The tracker store's sync states (mirrors TrackerSyncState in useTrackers). */
export type SyncStoreState = "off" | "loading" | "signed-out" | "saved" | "pending" | "error";

/** A sync state after connectivity has had its say. */
export type EffectiveSyncState = SyncStoreState | "offline";

/**
 * The effective state the pill may show. Offline downgrades only the two
 * states that claim the account is reachable and current — "saved" and
 * "pending". Everything else already tells the truth offline, or has not
 * settled yet.
 */
export function effectiveSyncState(state: SyncStoreState, online: boolean): EffectiveSyncState {
  if (online) return state;
  if (state === "saved" || state === "pending") return "offline";
  return state;
}

/** The pill's full wording for the offline effective state. */
export const OFFLINE_PILL_LABEL = "On this device — will sync when you're back";

/** The pill's compact wording for the offline effective state. */
export const OFFLINE_PILL_SHORT_LABEL = "Offline";

/**
 * The one honest line shown on Today while the device is offline — or
 * null when there is nothing to say. It promises only what the device-
 * first stores actually guarantee: the data is saved here, and the
 * stores' own retries mirror it when the connection returns.
 */
export function offlineNotice(online: boolean): string | null {
  if (online) return null;
  return "You're offline — everything is saved on this device and will sync when you're back.";
}
