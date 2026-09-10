/**
 * Bloom Story Platform — human time.
 * Viewer headers stay concise (5m · 2h); archive earns exact dates.
 */

export function storyAge(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(then).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function storyExpiryLeft(expiresAt: string, now: number = Date.now()): string | null {
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;
  const left = end - now;
  if (left <= 0) return null;
  const hours = Math.floor(left / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  const minutes = Math.max(1, Math.floor(left / 60_000));
  return `${minutes}m left`;
}

export function archiveDayLabel(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function archiveMonthKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function archiveMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function countdownParts(
  targetAt: string,
  now: number = Date.now(),
): {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const end = new Date(targetAt).getTime();
  const left = (Number.isFinite(end) ? end : now) - now;
  if (left <= 0) return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    done: false,
    days: Math.floor(left / 86_400_000),
    hours: Math.floor(left / 3_600_000) % 24,
    minutes: Math.floor(left / 60_000) % 60,
    seconds: Math.floor(left / 1000) % 60,
  };
}
