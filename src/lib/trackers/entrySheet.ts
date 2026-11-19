/**
 * The metrics-entry bus — one "log today's metrics" prompt for the app.
 *
 * The "Reflect & log today" action used to be a floating pill fixed over
 * the Trackers page (M-130: it covered content at three scroll
 * positions). Brief v6 Slice 2 deleted the pill and moved the action
 * into the global dock (CoachOrb), but the sheet it opens —
 * MetricsEntryModal, "Today's snapshot" — is owned by TrackersPage,
 * which holds the tracker store. So the dock dispatches this window
 * event and TrackersPage answers it with the exact handler the pill
 * called (`setSheetOpen(true)`). A window event, not React state, for
 * the same reason as the paywall bus: the caller (global chrome) and
 * the owner (one page) share nothing else.
 */

const EVENT = "bloom:metrics-entry";

export function requestMetricsEntry(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function onMetricsEntryRequest(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
