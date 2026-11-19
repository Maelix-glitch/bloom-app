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
 *     values never pass through here — they stay exact;
 *   · a SHOPPING quantity (rulebook v2 §7) is an instruction to buy,
 *     not a measurement: it rounds to the step a shopper can act on
 *     and never prints "0 g" for something the plan needs.
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

/**
 * A shopping quantity (rulebook v2 §7) — what to buy, rounded to the
 * step a shopper can act on: under 5 g is "a pinch" (never "0 g" for
 * something the plan needs), under 50 g rounds to 5, under 500 g to
 * 25, above that to 50, and a kilo or more prints as kilos. Display
 * only — the plan's sums underneath stay exact.
 */
export function fmtShoppingQty(g: number): string {
  const roundTo = (step: number) => Math.round(g / step) * step;
  if (!Number.isFinite(g) || g < 5) return "a pinch";
  if (g < 50) return `~${roundTo(5)} g`;
  if (g < 500) return `~${roundTo(25)} g`;
  const r = roundTo(50);
  if (r >= 1000) return `~${+(r / 1000).toFixed(2)} kg`;
  return `~${r} g`;
}

/** An approximate energy target — "~2,950 kcal" (nearest 50, grouped). */
export function fmtKcalApprox(n: number): string {
  const rounded = Math.round(n / 50) * 50;
  return `~${rounded.toLocaleString("en-IN")} kcal`;
}

/**
 * A counted noun, grouped and pluralised in one place — "1 day",
 * "0 days", "1,202 days" — so no surface can reassemble the "1 DAYS"
 * class from a template and a bare suffix (Brief v6 §1.4).
 */
export const plural = (n: number, one: string, many: string = `${one}s`): string =>
  `${fmtCount(n)} ${n === 1 ? one : many}`;

/**
 * Minutes as a human duration — "8 h", "1 h 30 min", "45 min"
 * (Brief v6 §1.4). For target and total displays; prose inside insight
 * sentences keeps its own phrasing.
 */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}

/** Millilitres as litres at a litre or more — "2.2 L", else "800 ml". */
export const fmtLitres = (ml: number): string =>
  ml >= 1000 ? `${+(ml / 1000).toFixed(1)} L` : `${ml} ml`;
