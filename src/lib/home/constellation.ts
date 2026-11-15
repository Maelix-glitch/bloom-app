/**
 * Connection constellation — the pure geometry and gating behind Today's
 * NEW connection map (Slice 2 of the overnight batch; a fresh design, not
 * the retired radial orbit).
 *
 * Everything here is presentation maths over the REAL model in
 * `lib/home/today` (`connections()`): nodes carry a strength computed
 * from the person's own logs and links exist only where that model found
 * a correlation. Nothing in this file invents, boosts or smooths a value
 * — it only decides where a value is drawn and whether the section may
 * paint at all.
 */

import type { Connection, CrossLink, SignalId } from "@/lib/home/today";

/* ------------------------------ stage space ------------------------------ */

/** One shared coordinate space for the SVG drawing and the DOM nodes. */
export const STAGE_W = 600;
export const STAGE_H = 300;

/* The arc the signals sit on: a wide, gentle bow whose centre is BELOW
   the stage, so the middle of the arc rides high and the ends settle
   low — a constellation horizon, not an orbit. */
const ARC_CX = STAGE_W / 2;
const ARC_CY = 348;
const ARC_R = 262;
const ARC_START = 203; // degrees, left end
const ARC_END = 337; // degrees, right end (through 270° at the apex)

export interface StagePoint {
  x: number;
  y: number;
}

/** Point `index` of `count` along the arc, left → right. */
export function arcPoint(index: number, count: number): StagePoint {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const rad = ((ARC_START + (ARC_END - ARC_START) * t) * Math.PI) / 180;
  return {
    x: Math.round((ARC_CX + Math.cos(rad) * ARC_R) * 10) / 10,
    y: Math.round((ARC_CY + Math.sin(rad) * ARC_R) * 10) / 10,
  };
}

/** The spine path through every arc point — the hairline the eye follows. */
export function arcSpine(count: number): string {
  if (count <= 0) return "";
  const pts = Array.from({ length: count }, (_, i) => arcPoint(i, count));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/**
 * Order nodes into their left → right arc slots, strongest at the apex:
 * the centre slot takes the strongest signal, the next slots alternate
 * outward. Deterministic — equal strengths keep the model's own order,
 * so the map reads the same way every day unless the record changes.
 */
export function placeByStrength<T extends { strength: number }>(nodes: readonly T[]): T[] {
  const n = nodes.length;
  if (n <= 1) return [...nodes];
  const mid = (n - 1) / 2;
  const slotOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const d = Math.abs(a - mid) - Math.abs(b - mid);
    return d !== 0 ? d : a - b;
  });
  const ranked = nodes
    .map((node, i) => ({ node, i }))
    .sort((a, b) => b.node.strength - a.node.strength || a.i - b.i)
    .map((r) => r.node);
  const out = new Array<T>(n);
  slotOrder.forEach((slot, k) => {
    out[slot] = ranked[k]!;
  });
  return out;
}

/**
 * A link's path: a quadratic bow between its two node points, pulled
 * toward the stage's lower centre so links nest inside the arc instead
 * of cutting straight across it. Longer chords bow deeper.
 */
export function linkPath(a: StagePoint, b: StagePoint): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const pull = Math.min(0.42, 0.14 + chord / 1400);
  const cx = mx + (ARC_CX - mx) * pull;
  const cy = my + (STAGE_H - my) * pull + chord * 0.06;
  const r = (v: number) => Math.round(v * 10) / 10;
  return `M ${r(a.x)} ${r(a.y)} Q ${r(cx)} ${r(cy)} ${r(b.x)} ${r(b.y)}`;
}

/* ------------------------------ link reading ----------------------------- */

export type LinkTone = "sage" | "gold" | "hairline";

/**
 * How a link is painted. Sage is reserved for the strongest connection
 * (the model sorts links by weight, so index 0); a solid correlation
 * earns gold; a faint one stays a neutral hairline. Rose is never used
 * here — elsewhere in Bloom it means a negative direction.
 */
export function linkTone(link: CrossLink, index: number): LinkTone {
  if (index === 0 && link.weight > 0) return "sage";
  return link.weight >= 0.4 ? "gold" : "hairline";
}

/** The strongest link touching a signal, or null when it has none. */
export function strongestLinkFor(links: readonly CrossLink[], id: SignalId): CrossLink | null {
  return links.find((l) => l.from === id || l.to === id) ?? null;
}

/* ------------------------------- readiness ------------------------------- */

/**
 * The section's settled gate — Today's hard-won invariant, applied to
 * this section's own sources. The page's latched `ready` already covers
 * habits, mood and trackers (see `overviewRecordsSettled`); the cycle
 * store is this section's one extra source, so it must ALSO have read
 * the device (`periodHydrated`) and finished its account check
 * (`periodSyncState` not "loading" — "error" counts as settled, exactly
 * as the Overview predicate treats a failed tracker sync: the honest
 * device state, never a hang). While this is false the section renders
 * its skeleton and paints NO numbers, mirror or otherwise.
 */
export function constellationSettled(state: {
  ready: boolean;
  periodHydrated: boolean;
  periodSyncState: string;
}): boolean {
  return state.ready && state.periodHydrated && state.periodSyncState !== "loading";
}

/**
 * Whether the settled record carries anything to draw at all. A node
 * with zero logged days behind it is a nudge, not a signal — when every
 * node is like that, the honest answer is the empty state, not a stage
 * of hollow points.
 */
export function hasConnectionContent(nodes: readonly Connection[]): boolean {
  return nodes.some((n) => n.days > 0);
}
