/**
 * The format home (UI Rulebook §17 — data trust).
 *
 * One formatter per kind of value, used by every surface, so a date, a
 * count or a target can never be rendered two ways on two screens:
 *
 *   · dates are the house format — "18 Nov 2026" — never a raw ISO key;
 *   · counts are grouped the en-IN way — "1,202", never "1202";
 *   · grams print whole — a computed sum like 206.25 g is a real sum,
 *     but two decimals of a gram is precision no scale in the kitchen
 *     has, so the display rounds and the value underneath stays exact;
 *   · an APPROXIMATE energy target (anything shown with a "~") rounds
 *     to the nearest 50 kcal — "~2,950 kcal", never "~2964 kcal": the
 *     tilde and four exact digits contradict each other, and the
 *     underlying estimate (Mifflin–St Jeor over self-reported inputs)
 *     does not know the day to within 50 kcal anyway. Exact logged
 *     values never pass through here — they stay exact.
 */

/** "18 Nov 2026" for a `YYYY-MM-DD` day key (or any Date-parseable string). */
export function fmtDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Grouped count — "1,202". */
export function fmtCount(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** Whole grams, grouped — "206", "1,250". Never a decimal gram in the UI. */
export function fmtGrams(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}

/** An approximate energy target — "~2,950 kcal" (nearest 50, grouped). */
export function fmtKcalApprox(n: number): string {
  const rounded = Math.round(n / 50) * 50;
  return `~${rounded.toLocaleString("en-IN")} kcal`;
}
