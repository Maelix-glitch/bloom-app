/**
 * The Orbit — pure geometry and words behind Today's Connections
 * section (Brief v6 Slice 4). Everything here is presentation maths
 * over the REAL models: nodes and links come from `connections()`
 * (lib/home/today), findings from `buildWholeLifeInsights`
 * (lib/insights). Nothing in this file invents, boosts or smooths a
 * value — it decides where a value is drawn and what word grades it.
 *
 * Geometry: ONE ring around a centre medallion, in a 100×100 space
 * shared by the SVG arcs and the DOM nodes (the lesson the old wide
 * stage learned: one coordinate space, welded at any width). Angles
 * are evenly spaced from the top; a node's distance from the centre
 * and its size scale with its sample — more logged days pull it
 * closer and make it larger. Deterministic: the same record draws
 * the same orbit every day.
 */

import type { WholeLifeInsightKind } from "@/lib/insights/insights";
import { SIGNAL_LABEL, type SignalId } from "@/lib/home/today";

/* ------------------------------ the ring ------------------------------- */

/** Centre of the 100×100 orbit space, on both axes. */
export const ORBIT_CENTRE = 50;

/** Ring radius (space units) for a node with no logged days. */
export const ORBIT_R_FAR = 38;

/** Ring radius for a node logged on every day of its window. */
export const ORBIT_R_NEAR = 23;

/** Node diameter (space units) at no coverage / full coverage. */
export const ORBIT_SIZE_MIN = 9.5;
export const ORBIT_SIZE_MAX = 15;

export interface OrbitNodeInput {
  key: string;
  /** Days this signal was logged inside its window. */
  daysLogged: number;
  /** The window the count belongs to (30 for the connections map). */
  windowDays: number;
}

export interface OrbitNodeLayout {
  key: string;
  x: number;
  y: number;
  /** Distance from the centre this node rests at. */
  radius: number;
  /** Node diameter in space units (= cqw on the square stage). */
  size: number;
  /** daysLogged / windowDays, clamped to 0–1. */
  coverage: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const r2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Lay the nodes on the ring: first node at the top, the rest evenly
 * angled clockwise, input order preserved (the model's own order, so
 * the drawing is stable unless the record changes).
 */
export function orbitLayout(nodes: readonly OrbitNodeInput[]): OrbitNodeLayout[] {
  const n = nodes.length;
  return nodes.map((node, i) => {
    const coverage = node.windowDays > 0 ? clamp01(node.daysLogged / node.windowDays) : 0;
    const radius = ORBIT_R_FAR + (ORBIT_R_NEAR - ORBIT_R_FAR) * coverage;
    const size = ORBIT_SIZE_MIN + (ORBIT_SIZE_MAX - ORBIT_SIZE_MIN) * coverage;
    const theta = ((-90 + (360 / Math.max(1, n)) * i) * Math.PI) / 180;
    return {
      key: node.key,
      x: r2(ORBIT_CENTRE + radius * Math.cos(theta)),
      y: r2(ORBIT_CENTRE + radius * Math.sin(theta)),
      radius: r2(radius),
      size: r2(size),
      coverage,
    };
  });
}

/* -------------------------------- arcs --------------------------------- */

/**
 * A link's path: a quadratic bow between its two node points, its
 * control point pulled toward the centre so arcs nest inside the
 * ring instead of cutting straight across the medallion.
 */
export function arcPath(
  p: { x: number; y: number },
  q: { x: number; y: number },
  bow = 0.18,
): string {
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  const cx = mx + (ORBIT_CENTRE - mx) * bow;
  const cy = my + (ORBIT_CENTRE - my) * bow;
  return `M ${r2(p.x)} ${r2(p.y)} Q ${r2(cx)} ${r2(cy)} ${r2(q.x)} ${r2(q.y)}`;
}

/* --------------------------- strength in words -------------------------- */

/**
 * A link's strength, in words — the tracker engine's own |r| bands
 * (lib/trackers/core: strong ≥ 0.6, moderate ≥ 0.35, weak below),
 * renamed for this section. A percentage here was M-108's unexplained
 * score; words carry the grade without pretending to be a measure.
 */
export type StrengthWord = "Strong link" | "Some link" | "Faint link";

export function strengthWord(weight: number): StrengthWord {
  if (weight >= 0.6) return "Strong link";
  if (weight >= 0.35) return "Some link";
  return "Faint link";
}

/* ------------------------------- labels -------------------------------- */

/** The node labels the Orbit may ever print — the signal labels, one
 *  sentence-case word each (guard-pinned against SIGNAL_LABEL). */
export const ORBIT_LABELS: readonly string[] = Object.values(SIGNAL_LABEL);

/** A link's plain title: "Sleep and mood" — first label as-is, the
 *  second lowered, the brief's copy shape. */
export function linkTitle(a: SignalId, b: SignalId): string {
  return `${SIGNAL_LABEL[a]} and ${SIGNAL_LABEL[b].toLowerCase()}`;
}

/** Titles for spoken insights whose pair has no node of its own. */
export const INSIGHT_TITLES: Record<WholeLifeInsightKind, string> = {
  "sleep-mood": "Sleep and mood",
  "sleep-energy": "Sleep and energy",
  "habits-mood": "Habits and mood",
  "movement-mood": "Movement and mood",
  "movement-energy": "Movement and energy",
  "screen-mood": "Screen time and mood",
  "food-mood": "Food logging and mood",
  "weight-trend": "Your weight trend",
};

/**
 * The insights kind a constellation link speaks for, when the pair is
 * genuinely the same pair — the only three overlaps between the two
 * engines' pair sets. Anything else returns null: the link keeps its
 * own engine's sentence rather than borrowing a neighbour's finding.
 */
export function insightKindForPair(a: SignalId, b: SignalId): WholeLifeInsightKind | null {
  const pair = [a, b].sort().join(":");
  switch (pair) {
    case "mood:sleep":
      return "sleep-mood";
    case "energy:sleep":
      return "sleep-energy";
    case "habits:mood":
      return "habits-mood";
    default:
      return null;
  }
}
