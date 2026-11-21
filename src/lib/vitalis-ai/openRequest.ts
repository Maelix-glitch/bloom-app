/**
 * The Vitalis-open bus — one "meet Vitalis" prompt for the app.
 *
 * The Vitalis window is owned by the orb in the global dock (CoachOrb,
 * mounted by the root), so a page that wants to introduce Vitalis —
 * Today's First Bloom journey — cannot reach it through React state.
 * It dispatches this window event and the orb answers by opening its
 * window, exactly the metrics-entry bus pattern (lib/trackers/
 * entrySheet): a window event, not React state, because the caller
 * (a page) and the owner (global chrome) share nothing else.
 *
 * The orb also announces every opening on the same bus. That second
 * event exists because of what Vitalis is: its sessions are
 * deliberately ephemeral — nothing of a conversation is persisted
 * anywhere (see CoachOrb's header). So "has met Vitalis" can only
 * ever be a LIVE, in-session signal. Listeners may use it for the
 * session they are in; they must never store it as if it were a
 * record — there is no record, by design.
 */

const OPEN_EVENT = "bloom:vitalis-open";
const OPENED_EVENT = "bloom:vitalis-opened";

/** Ask the orb to open the Vitalis window. */
export function requestVitalisOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** The orb's subscription to open requests. Returns the unsubscribe. */
export function onVitalisOpenRequest(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** The orb announces that its window has opened (any door). */
export function announceVitalisOpened(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPENED_EVENT));
}

/** Listen for Vitalis openings in this session. Returns the unsubscribe. */
export function onVitalisOpened(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPENED_EVENT, handler);
  return () => window.removeEventListener(OPENED_EVENT, handler);
}
