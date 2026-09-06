/**
 * The Mood connection graph — the pure, testable half of the "connection
 * map" on /mood. Every node and edge is derived from the user's own record:
 * nothing is invented, and the strength shown for an edge is the measured
 * relationship (Pearson r) between that signal and mood on the days both
 * were logged. The component in components/mood/page/MoodGraph.tsx only
 * draws what this file computes.
 */
import type { Correlation, DayAggregate, EmotionKey, Evidence, MoodEntry } from "@/lib/mood/types";
import { EMOTION_MAP } from "@/lib/mood/types";
import { calculateCorrelation, evidenceFor, mean, round } from "@/lib/mood/analytics";

export type GraphNodeKind = "hub" | "signal" | "emotion";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Short one-line reading, e.g. "7.1 h avg" or "31% of entries". */
  reading: string;
  /** Number of logged observations behind this node. */
  n: number;
  /** 0..1 — how much this node "weighs" visually (size). */
  weight: number;
  /** CSS colour (a design token or an oklch literal). */
  color: string;
  /** Present for emotions: their valence drives colour + placement. */
  valence?: "positive" | "neutral" | "negative";
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** Signed strength, -1..1 (Pearson r for signals; mood share for emotions). */
  r: number;
  n: number;
  evidence: Evidence;
  /** Human reading, e.g. "Longer sleep → higher mood (r 0.42, 23 days)". */
  statement: string;
}

export interface MoodGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Total logged days that fed the graph. */
  days: number;
  /** The single strongest usable relationship, for the headline. */
  headline: GraphEdge | null;
}

/* Signals the record can carry, with the field on DayAggregate that holds them. */
const SIGNALS: {
  id: string;
  key: keyof DayAggregate;
  label: string;
  unit: string;
  color: string;
  format: (v: number) => string;
}[] = [
  {
    id: "energy",
    key: "energy",
    label: "Energy",
    unit: "/10",
    color: "var(--mp-happy)",
    format: (v) => `${v.toFixed(1)} /10`,
  },
  {
    id: "stress",
    key: "stress",
    label: "Stress",
    unit: "/10",
    color: "var(--mp-angry)",
    format: (v) => `${v.toFixed(1)} /10`,
  },
  {
    id: "sleep",
    key: "sleep",
    label: "Sleep",
    unit: "h",
    color: "var(--mp-sad)",
    format: (v) => `${v.toFixed(1)} h`,
  },
  {
    id: "exercise",
    key: "exercise",
    label: "Exercise",
    unit: "min",
    color: "var(--mp-calm)",
    format: (v) => `${Math.round(v)} min`,
  },
  {
    id: "screenTime",
    key: "screenTime",
    label: "Screen time",
    unit: "h",
    color: "var(--mp-anxious)",
    format: (v) => `${v.toFixed(1)} h`,
  },
  {
    id: "productivity",
    key: "productivity",
    label: "Productivity",
    unit: "/10",
    color: "var(--gold)",
    format: (v) => `${v.toFixed(1)} /10`,
  },
  {
    id: "social",
    key: "social",
    label: "Social",
    unit: "/10",
    color: "oklch(0.78 0.09 330)",
    format: (v) => `${v.toFixed(1)} /10`,
  },
  {
    id: "study",
    key: "study",
    label: "Study",
    unit: "min",
    color: "oklch(0.74 0.08 285)",
    format: (v) => `${Math.round(v)} min`,
  },
  {
    id: "steps",
    key: "steps",
    label: "Steps",
    unit: "",
    color: "oklch(0.76 0.08 170)",
    format: (v) => `${Math.round(v).toLocaleString()}`,
  },
];

const EMOTION_COLOR: Record<"positive" | "neutral" | "negative", string> = {
  positive: "var(--mp-happy)",
  neutral: "var(--mp-neutral)",
  negative: "var(--mp-sad)",
};

function phrase(label: string, r: number, n: number) {
  const dir = r >= 0 ? "higher" : "lower";
  const more =
    label === "Sleep"
      ? "Longer sleep"
      : label === "Stress"
        ? "Higher stress"
        : label === "Energy"
          ? "Higher energy"
          : `More ${label.toLowerCase()}`;
  return `${more}, ${dir} mood (r ${r > 0 ? "+" : ""}${r.toFixed(2)}, ${n} days)`;
}

/**
 * Build the graph from all-time day aggregates + raw entries. `correlations`
 * is the analytics layer's already-computed list (so the numbers on the map
 * match the Intelligence page exactly); missing signals simply don't appear.
 */
export function buildMoodGraph(input: {
  days: DayAggregate[];
  entries: MoodEntry[];
  correlations: Correlation[];
  /** Max emotion satellites to show (most frequent first). */
  emotionLimit?: number;
}): MoodGraph {
  const { days, entries, correlations, emotionLimit = 6 } = input;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const avgMood = days.length ? round(mean(days.map((d) => d.mood)), 1) : 0;
  nodes.push({
    id: "mood",
    kind: "hub",
    label: "Mood",
    reading: days.length ? `${avgMood.toFixed(1)} /10 · ${days.length} days` : "no entries yet",
    n: days.length,
    weight: 1,
    color: "var(--gold)",
  });

  const byKey = new Map(correlations.map((c) => [c.key, c]));

  for (const s of SIGNALS) {
    const values = days
      .map((d) => d[s.key])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (values.length === 0) continue;

    // Prefer the analytics layer's number; fall back to computing it here so
    // energy/stress (always present) never show as "unmeasured".
    const c =
      byKey.get(s.id) ??
      (() => {
        const pairs = days
          .filter((d) => typeof d[s.key] === "number")
          .map((d) => [d[s.key] as number, d.mood] as [number, number]);
        const { r, n } = calculateCorrelation(pairs);
        return { r, n, evidence: evidenceFor(n, r) };
      })();

    const strength = Math.abs(c.r);
    nodes.push({
      id: s.id,
      kind: "signal",
      label: s.label,
      reading: `${s.format(mean(values))} avg`,
      n: values.length,
      weight: 0.35 + Math.min(1, values.length / Math.max(1, days.length)) * 0.3 + strength * 0.35,
      color: s.color,
    });
    edges.push({
      id: `mood-${s.id}`,
      source: "mood",
      target: s.id,
      r: c.r,
      n: c.n,
      evidence: c.evidence,
      statement:
        c.evidence === "insufficient"
          ? `${s.label}: ${c.n} paired day${c.n === 1 ? "" : "s"} so far — log it on 8+ days for a reading.`
          : phrase(s.label, c.r, c.n),
    });
  }

  // Emotion satellites — how often each is logged and the mood that goes with it.
  const counts = new Map<EmotionKey, { count: number; moods: number[] }>();
  for (const e of entries) {
    for (const k of e.emotions) {
      const cur = counts.get(k) ?? { count: 0, moods: [] };
      cur.count += 1;
      cur.moods.push(e.mood);
      counts.set(k, cur);
    }
  }
  const total = entries.length || 1;
  const emotions = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, emotionLimit);
  for (const [key, v] of emotions) {
    const meta = EMOTION_MAP[key];
    const share = v.count / total;
    const emoMood = mean(v.moods);
    // Signed "pull" on mood relative to the overall average, scaled to -1..1.
    const pull = days.length ? Math.max(-1, Math.min(1, (emoMood - avgMood) / 4)) : 0;
    nodes.push({
      id: `emotion:${key}`,
      kind: "emotion",
      label: meta?.label ?? key,
      reading: `${Math.round(share * 100)}% of entries · mood ${emoMood.toFixed(1)}`,
      n: v.count,
      weight: 0.25 + share * 0.75,
      color: EMOTION_COLOR[meta?.valence ?? "neutral"],
      valence: meta?.valence ?? "neutral",
    });
    edges.push({
      id: `mood-emotion:${key}`,
      source: "mood",
      target: `emotion:${key}`,
      r: pull,
      n: v.count,
      evidence: v.count >= 8 ? (Math.abs(pull) >= 0.25 ? "moderate" : "low") : "insufficient",
      statement: `"${meta?.label ?? key}" on ${v.count} entr${v.count === 1 ? "y" : "ies"} — average mood ${emoMood.toFixed(1)} when it's present.`,
    });
  }

  // Cross-links between signals (e.g. sleep ↔ energy) so the map is a web,
  // not a star: only the strongest few, and only when both were logged.
  const signalNodes = nodes.filter((n) => n.kind === "signal");
  const cross: GraphEdge[] = [];
  for (let i = 0; i < signalNodes.length; i++) {
    for (let j = i + 1; j < signalNodes.length; j++) {
      const a = SIGNALS.find((s) => s.id === signalNodes[i]!.id)!;
      const b = SIGNALS.find((s) => s.id === signalNodes[j]!.id)!;
      const pairs = days
        .filter((d) => typeof d[a.key] === "number" && typeof d[b.key] === "number")
        .map((d) => [d[a.key] as number, d[b.key] as number] as [number, number]);
      const { r, n } = calculateCorrelation(pairs);
      const evidence = evidenceFor(n, r);
      if (evidence === "insufficient") continue;
      cross.push({
        id: `${a.id}-${b.id}`,
        source: a.id,
        target: b.id,
        r,
        n,
        evidence,
        statement: `${a.label} and ${b.label.toLowerCase()} move ${r >= 0 ? "together" : "in opposite directions"} (r ${r > 0 ? "+" : ""}${r.toFixed(2)}, ${n} days).`,
      });
    }
  }
  cross.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  edges.push(...cross.slice(0, 4));

  const usable = edges
    .filter(
      (e) =>
        e.source === "mood" && e.evidence !== "insufficient" && !e.target.startsWith("emotion:"),
    )
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return { nodes, edges, days: days.length, headline: usable[0] ?? null };
}

/* ------------------------------------------------------------------------- */
/* Layout                                                                     */
/* ------------------------------------------------------------------------- */

export interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  /** Radius in the SVG's coordinate space. */
  r: number;
}

/**
 * Deterministic radial layout with a light relaxation pass: signals on an
 * inner ring, emotions on an outer ring (positive to the upper-right,
 * negative to the lower-left), then a few iterations of repulsion so labels
 * never overlap. Deterministic so SSR and the client agree, and so the map
 * doesn't "jump" every time a memo recomputes.
 */
export function layoutGraph(
  graph: MoodGraph,
  size: { width: number; height: number },
): LayoutNode[] {
  const cx = size.width / 2;
  const cy = size.height / 2;
  const minSide = Math.min(size.width, size.height);
  // Rings stretch into the wider axis so a landscape canvas is filled, not
  // just its central square; radii below are per-axis.
  const rx = { inner: size.width * 0.3, outer: size.width * 0.43 };
  const ry = { inner: size.height * 0.3, outer: size.height * 0.42 };

  const hub = graph.nodes.find((n) => n.kind === "hub")!;
  const signals = graph.nodes.filter((n) => n.kind === "signal");
  const emotions = graph.nodes.filter((n) => n.kind === "emotion");

  const out: LayoutNode[] = [{ ...hub, x: cx, y: cy, r: minSide * 0.085 }];

  // Strongest relationships closest to "north", alternating sides so the
  // ring reads balanced.
  const strength = new Map(
    graph.edges.filter((e) => e.source === "mood").map((e) => [e.target, Math.abs(e.r)]),
  );
  const ordered = [...signals].sort(
    (a, b) => (strength.get(b.id) ?? 0) - (strength.get(a.id) ?? 0),
  );
  const slots = ordered.map((_, i) => (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2));
  const stepS = signals.length ? (2 * Math.PI) / signals.length : 0;
  ordered.forEach((n, i) => {
    const angle = -Math.PI / 2 + slots[i]! * stepS;
    const pull = 1 - (strength.get(n.id) ?? 0) * 0.18;
    out.push({
      ...n,
      x: cx + Math.cos(angle) * rx.inner * pull,
      y: cy + Math.sin(angle) * ry.inner * pull,
      r: minSide * (0.03 + n.weight * 0.028),
    });
  });

  // Emotions: positive ones sweep the upper-right arc, negative the lower-left,
  // neutral in between, spaced evenly within their arc.
  const arcs: Record<"positive" | "neutral" | "negative", [number, number]> = {
    positive: [-Math.PI * 0.42, Math.PI * 0.1],
    neutral: [Math.PI * 0.18, Math.PI * 0.42],
    negative: [Math.PI * 0.55, Math.PI * 1.05],
  };
  (["positive", "neutral", "negative"] as const).forEach((v) => {
    const group = emotions.filter((e) => e.valence === v);
    const [a0, a1] = arcs[v];
    group.forEach((n, i) => {
      const t = group.length === 1 ? 0.5 : i / (group.length - 1);
      const angle = a0 + (a1 - a0) * t;
      out.push({
        ...n,
        x: cx + Math.cos(angle) * rx.outer,
        y: cy + Math.sin(angle) * ry.outer,
        r: minSide * (0.019 + n.weight * 0.021),
      });
    });
  });

  // Relaxation: push apart any pair closer than the sum of their radii plus
  // a label margin; the hub stays put.
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 1; i < out.length; i++) {
      for (let j = 1; j < out.length; j++) {
        if (i === j) continue;
        const a = out[i]!;
        const b = out[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r + minSide * 0.07;
        if (dist < min) {
          const push = (min - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
          moved = true;
        }
      }
    }
    // keep everything inside the canvas
    for (let i = 1; i < out.length; i++) {
      const n = out[i]!;
      const m = n.r + minSide * 0.055;
      n.x = Math.max(m, Math.min(size.width - m, n.x));
      n.y = Math.max(m, Math.min(size.height - m, n.y));
    }
    if (!moved) break;
  }
  return out;
}

/** Points along a gentle quadratic curve between two nodes (for particles). */
export function curveBetween(a: { x: number; y: number }, b: { x: number; y: number }, bow = 0.12) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const cx = mx - dy * bow;
  const cy = my + dx * bow;
  return {
    d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
    cx,
    cy,
  };
}
