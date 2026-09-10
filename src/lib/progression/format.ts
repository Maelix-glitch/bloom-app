/** Shared formatting for the journey: numbers, dates, durations. */

/** Thousands-separated whole number: 2850 → "2,850". */
export function formatPoints(n: number): string {
  const value = Number.isFinite(n) ? Math.round(n) : 0;
  return value.toLocaleString("en-US");
}

/** "+600" — the sign is part of the copy, never invented. */
export function formatDelta(n: number): string {
  return `${n >= 0 ? "+" : "−"}${formatPoints(Math.abs(n))}`;
}

/** "10 Sep" — a calm, unambiguous short date for the history rows. */
export function formatShortDate(iso: string): string {
  const ms = Date.parse(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "10 Sep 2026" for the archive. */
export function formatLongDate(iso: string): string {
  const ms = Date.parse(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Today", "Yesterday", "3 days ago", then a short date. */
export function relativeDay(dateStr: string, today: string): string {
  const parse = (d: string) => {
    const ms = Date.parse(`${d}T00:00:00Z`);
    return Number.isNaN(ms) ? 0 : Math.round(ms / 86_400_000);
  };
  const diff = parse(today) - parse(dateStr);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return formatShortDate(dateStr);
}
