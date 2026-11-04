/** Robust statistics for the Cycle Intelligence engines. Pure, dependency-free. */

export function mean(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation — a full history, not a sample. */
export function stdev(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

export function sorted(xs: readonly number[]): number[] {
  return [...xs].sort((a, b) => a - b);
}

/** Median of the provided values. Robust to a single unusual cycle. */
export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = sorted(xs);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Linear-interpolated quantile, q in [0, 1]. */
export function quantile(xs: readonly number[], q: number): number | null {
  if (xs.length === 0) return null;
  const s = sorted(xs);
  if (s.length === 1) return s[0]!;
  const pos = (s.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** Interquartile range — the middle half of the history. */
export function iqr(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  return quantile(xs, 0.75)! - quantile(xs, 0.25)!;
}

/** Median absolute deviation, scaled to a standard-deviation equivalent. */
export function mad(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const m = median(xs)!;
  const deviations = xs.map((x) => Math.abs(x - m));
  return 1.4826 * median(deviations)!;
}

/** Coefficient of variation, in percent. Null when the mean is zero. */
export function cvPercent(xs: readonly number[]): number | null {
  const m = mean(xs);
  if (m === null || m === 0) return null;
  const sd = stdev(xs);
  if (sd === null) return null;
  return (sd / m) * 100;
}

/**
 * Recency-weighted average: the newest observation carries the most weight.
 * Used only as a *blend* with the median — alone it overreacts to one odd
 * recent cycle, which is exactly the failure mode the spec warns about.
 */
export function recencyWeighted(xs: readonly number[], window = 6): number | null {
  const used = xs.slice(-Math.max(1, window));
  if (used.length === 0) return null;
  let num = 0;
  let den = 0;
  used.forEach((value, i) => {
    const weight = i + 1;
    num += value * weight;
    den += weight;
  });
  return num / den;
}

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Round to one decimal, but keep whole numbers whole. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);
