/**
 * M-248 - the status page's speed bands for the colour bars.
 *
 * Deliberately import-free: the client page imports this module
 * directly, and nothing server-side (env access, fetch) may
 * ever ride into the browser bundle through it. The server
 * feed (status.ts) re-exports these so both sides share one
 * definition.
 *
 * The bar shows a route's slowest 1% (p99). It fills toward
 * the top of the fast band (500 ms), and its colour steps
 * sage (fast) -> gold (slowing) -> rose (slow) past 2,000 ms -
 * the exact line the degraded rule and the alert watch use
 * (over 2,000, never at it), so the picture and the alarm can
 * never disagree.
 */

export const SPEED_FAST_MAX_MS = 500;
export const SPEED_SLOW_OVER_MS = 2000;

export type SpeedBand = "fast" | "slowing" | "slow";

export function speedBand(p99Ms: number): SpeedBand {
  if (p99Ms > SPEED_SLOW_OVER_MS) return "slow";
  if (p99Ms >= SPEED_FAST_MAX_MS) return "slowing";
  return "fast";
}

/** Bar fill for a p99: 0-100% of the fast band's top (500 ms). */
export function speedBarPercent(p99Ms: number): number {
  if (!Number.isFinite(p99Ms) || p99Ms <= 0) return 0;
  return Math.min(100, (p99Ms / SPEED_FAST_MAX_MS) * 100);
}
