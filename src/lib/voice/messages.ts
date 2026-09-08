/**
 * Bloom's voice — copy that never repeats itself.
 *
 * A tracker is used every day. A string that is funny once is wallpaper by the
 * fifth time and irritating by the twentieth, so nothing user-facing should be
 * a constant. Every line in the app comes from a *pool* through `pick()`,
 * which:
 *
 *   · remembers the last few lines shown for that key (per device) and never
 *     repeats one while another option exists;
 *   · cycles the whole pool before any line can come round again;
 *   · is deterministic when handed a `seed`, so a render is stable and
 *     server/client markup agrees — the line only changes when the *event*
 *     changes, not on every re-render.
 *
 * Pools live next to the feature that speaks them (see `copy.ts`).
 */

const KEY = "bloom.voice.seen.v1";
/** How many recent picks to remember per key. Small: the pools are small. */
const MEMORY = 12;

type SeenMap = Record<string, string[]>;

const hasWindow = () => typeof window !== "undefined";

function load(): SeenMap {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: SeenMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
    }
    return out;
  } catch {
    return {};
  }
}

function save(map: SeenMap): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage blocked — repetition is the worst case, not a crash */
  }
}

/** Stable 32-bit hash, for seeded (render-stable) picks. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * One line from `pool`, avoiding what this device has seen recently.
 *
 * `seed` makes the choice deterministic — pass something that identifies the
 * *event* (a date, an entry id, a count) and the same line comes back for that
 * event every time, instead of flickering on re-render. Omit it for a genuinely
 * random pick (a toast, say), which is then recorded so it won't come round
 * again soon.
 */
export function pick(key: string, pool: readonly string[], seed?: string | number): string {
  if (pool.length === 0) return "";
  if (pool.length === 1) return pool[0]!;

  const seen = load();
  const recent = seen[key] ?? [];
  let fresh = pool.filter((line) => !recent.includes(line));
  if (fresh.length === 0) fresh = [...pool]; // whole pool used — start again

  let choice: string;
  if (seed !== undefined) {
    choice = fresh[hashSeed(String(seed)) % fresh.length]!;
  } else {
    choice = fresh[Math.floor(Math.random() * fresh.length)]!;
  }

  const next = [...recent.filter((l) => l !== choice), choice].slice(-MEMORY);
  save({ ...seen, [key]: next });
  return choice;
}

/**
 * Seeded pick with **no** memory write — for anything rendered during React's
 * render phase, where a side effect would be wrong. Same event → same line.
 */
export function pickStable(pool: readonly string[], seed: string | number): string {
  if (pool.length === 0) return "";
  return pool[hashSeed(String(seed)) % pool.length]!;
}

/** Forget what has been shown (used by "erase everything"). */
export function resetVoice(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/* -------------------------------------------------------------------------- */
/*  Time of day — used by greetings all over the app                          */
/* -------------------------------------------------------------------------- */

export type Daypart = "night" | "morning" | "afternoon" | "evening";

export function daypart(now: Date = new Date()): Daypart {
  const h = now.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
