/**
 * The Welcome-replay bus — "see the welcome again", on demand (M-182).
 *
 * The Welcome gate is owned by the root (WelcomeGate, mounted above
 * every route), so a page that wants to offer a replay — Profile's
 * Personalisation group — cannot reach it through React state. It
 * dispatches this window event and the gate answers by opening the
 * Welcome in replay mode, exactly the Vitalis-open bus pattern
 * (lib/vitalis-ai/openRequest): a window event, not React state,
 * because the caller (a page) and the owner (global chrome) share
 * nothing else.
 *
 * A replay request is a LIVE, in-session signal only. It is never
 * stored — not in prefs, not anywhere: asking to see the Welcome again
 * is a moment's intent on this device, not a fact about the account,
 * and it must never follow the person to another device or session.
 */

const REPLAY_EVENT = "bloom:welcome-replay";

/** Ask the gate to open the Welcome again (Profile's replay entry). */
export function requestWelcomeReplay(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

/** The gate's subscription to replay requests. Returns the unsubscribe. */
export function onWelcomeReplayRequest(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REPLAY_EVENT, handler);
  return () => window.removeEventListener(REPLAY_EVENT, handler);
}
