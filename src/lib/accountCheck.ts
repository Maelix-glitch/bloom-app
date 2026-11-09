/**
 * The account check behind every "Checking your account…" line.
 *
 * Checking is a moment, not a state: the round-trip (auth session, then the
 * pull) normally lands in well under a second, but a hung auth lock or a
 * dead connection can leave the promise unsettled forever — and with it the
 * sync line, which sat on "checking your account…" for an entire observed
 * session (live sweep, 2026-11-10). Every store that shows a checking line
 * arms this watchdog when the check starts and cancels it when the check
 * settles; if the check is still running when it fires, the caller settles
 * the line itself onto the honest device state, with a retry.
 */

export const ACCOUNT_CHECK_TIMEOUT_MS = 12_000;

/**
 * Calls `onStuck` after `ms` unless the returned cancel function runs first
 * or `stillChecking()` has gone false by then. Returns the cancel function.
 */
export function watchAccountCheck(
  stillChecking: () => boolean,
  onStuck: () => void,
  ms: number = ACCOUNT_CHECK_TIMEOUT_MS,
): () => void {
  const id = setTimeout(() => {
    if (stillChecking()) onStuck();
  }, ms);
  return () => clearTimeout(id);
}
