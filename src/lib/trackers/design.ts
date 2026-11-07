/**
 * The trackers designs and the person's chosen one.
 *
 * Same data, same logic, four completely different pages. The choice is kept
 * in localStorage so the whole app can follow it. This used to live inside
 * the design gallery route; the gallery is gone, but /trackers still
 * renders the chosen design, so the state lives here now.
 */

export const DESIGNS = [
  {
    id: "ledger",
    name: "Ledger",
    note: "A bookkeeper's sheet — rules, tabular figures, a row of ticks for fourteen days.",
  },
  {
    id: "atlas",
    name: "Atlas",
    note: "A map of the day — a 24-hour compass, six territories, one route with six paths.",
  },
  {
    id: "strip",
    name: "Strip",
    note: "A filmstrip — one band per tracker, fourteen cells across, a single playhead at today.",
  },
  {
    id: "console",
    name: "Console",
    note: "The earlier version — a 24-hour dial with a ring, sparkline and quick-adds per row.",
  },
] as const;

export type DesignId = (typeof DESIGNS)[number]["id"];

/** What /trackers shows when nobody has chosen yet. */
export const DEFAULT_DESIGN: DesignId = "atlas";

const KEY = "bloom.trackers.design.v1";

export function loadDesignId(): DesignId {
  if (typeof window === "undefined") return DEFAULT_DESIGN;
  try {
    const raw = window.localStorage.getItem(KEY);
    return DESIGNS.some((d) => d.id === raw) ? (raw as DesignId) : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

export function saveDesignId(id: DesignId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, id);
    window.dispatchEvent(new CustomEvent("bloom:trackers-design"));
  } catch {
    /* storage blocked — the session still works */
  }
}
