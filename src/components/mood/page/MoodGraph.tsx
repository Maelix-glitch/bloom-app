/**
 * MoodGraph — the connection map on /mood. A radial web with Mood at the
 * centre, every signal you log (energy, stress, sleep, exercise, screen
 * time, …) on an inner ring and your most frequent emotions on an outer
 * ring. Line weight and colour are the measured relationship with mood
 * (Pearson r on the days both were logged — the same numbers as the
 * Relationships panel on /mood/intelligence), and small particles travel
 * the strongest links towards the hub. Hover or focus a node to read it;
 * click to pin it.
 *
 * Performance: the layout is a pure memo of the record, every continuous
 * motion is transform/opacity or SMIL along a fixed path (no per-frame
 * React state), and the whole thing is two small SVGs — one per breakpoint
 * so labels stay legible on phones without any client-side measuring.
 */
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Network } from "lucide-react";

import type { Correlation, DayAggregate, MoodEntry } from "@/lib/mood/types";
import {
  buildMoodGraph,
  curveBetween,
  layoutGraph,
  type GraphEdge,
  type LayoutNode,
  type MoodGraph as Graph,
} from "@/lib/mood/graph";

const DESKTOP = { width: 640, height: 440 };
const MOBILE = { width: 360, height: 440 };

/**
 * B9 · Loading twin of the mood web. Same panel, same header, same canvas and
 * reading-column footprint — only the paint is a pulse. Shown until the mood
 * record hydrates, so a cold first load reads as "loading" instead of a
 * hollow, broken-looking web.
 */
export function MoodGraphSkeleton() {
  return (
    <section className="mp-panel p-6 sm:p-9 lg:p-11" aria-label="Loading mood web">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-1 size-5 shrink-0 animate-pulse rounded-full bg-gold/25" />
          <div className="min-w-0">
            <div className="h-7 w-40 animate-pulse rounded-md bg-surface-3" />
            <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded-md bg-surface-3" />
          </div>
        </div>
        <span className="h-4 w-36 shrink-0 animate-pulse rounded-md bg-surface-3" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)] lg:items-stretch lg:gap-12">
        <div className="relative flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-border">
          <div className="mg-canvas-bg absolute inset-0" aria-hidden />
          <div className="relative grid flex-1 animate-pulse place-items-center" aria-hidden>
            <span className="absolute size-56 rounded-full border border-gold/25" />
            <span className="absolute size-40 rounded-full border border-gold/20" />
            <span className="absolute size-24 rounded-full border border-gold/15" />
            <span className="size-12 rounded-full bg-gold/25" />
          </div>
          <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-5 py-3">
            {[72, 96, 64, 80].map((w) => (
              <span
                key={w}
                className="h-2.5 animate-pulse rounded-full bg-surface-3"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>

        <aside className="flex flex-col" aria-hidden>
          <div className="h-3 w-16 animate-pulse rounded-md bg-surface-3" />
          <div className="mt-4 h-7 w-48 max-w-full animate-pulse rounded-md bg-surface-3" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-surface-3" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded-md bg-surface-3" />
          <div className="mt-auto pt-8">
            <span className="block h-px w-10 bg-gold/50" />
            <div className="mt-6 h-3 w-full animate-pulse rounded-md bg-surface-3" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded-md bg-surface-3" />
          </div>
        </aside>
      </div>
    </section>
  );
}

export function MoodGraph({
  days,
  entries,
  correlations,
}: {
  days: DayAggregate[];
  entries: MoodEntry[];
  correlations: Correlation[];
}) {
  const desktop = useMemo(
    () => buildMoodGraph({ days, entries, correlations, emotionLimit: 6 }),
    [days, entries, correlations],
  );
  const mobile = useMemo(
    () => buildMoodGraph({ days, entries, correlations, emotionLimit: 4 }),
    [days, entries, correlations],
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? hovered;

  const select = (id: string | null) => setPinned((cur) => (cur === id ? null : id));

  // Escape releases a pinned node (mirrors the "Unpin" button).
  useEffect(() => {
    if (!pinned) return;
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === "Escape") setPinned(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  return (
    <section className="mp-panel p-6 sm:p-9 lg:p-11" data-testid="mood-graph">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <Network className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1.5} />
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight text-foreground sm:text-[1.75rem]">
              Your mood web
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              How everything you log pulls on your mood — measured from your own days, never
              guessed.
            </p>
          </div>
        </div>
        <Link
          to="/mood/intelligence"
          hash="relationships"
          preload="intent"
          className="inline-flex shrink-0 items-center gap-2 text-sm text-gold transition-opacity hover:opacity-80"
        >
          Open in Intelligence
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)] lg:items-stretch lg:gap-12">
        <div className="mg-canvas relative flex flex-col overflow-hidden rounded-2xl border border-border">
          <div className="mg-canvas-bg absolute inset-0" aria-hidden />
          {/* my-auto keeps the web vertically centred if the reading column
              (e.g. a pinned node with three links) is taller than the canvas */}
          <Canvas
            graph={desktop}
            size={DESKTOP}
            keyPrefix="d"
            className="my-auto hidden sm:block"
            active={active}
            onHover={setHovered}
            onSelect={select}
          />
          <Canvas
            graph={mobile}
            size={MOBILE}
            keyPrefix="m"
            className="my-auto block sm:hidden"
            active={active}
            onHover={setHovered}
            onSelect={select}
          />
          <Legend />
        </div>

        <Reading graph={desktop} active={active} pinned={pinned} onClear={() => setPinned(null)} />
      </div>
    </section>
  );
}

/* --------------------------------- canvas --------------------------------- */

function Canvas({
  graph,
  size,
  keyPrefix,
  className,
  active,
  onHover,
  onSelect,
}: {
  graph: Graph;
  size: { width: number; height: number };
  keyPrefix: string;
  className?: string;
  active: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const nodes = useMemo(() => layoutGraph(graph, size), [graph, size]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const connected = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const e of graph.edges) {
      if (e.source === active) set.add(e.target);
      if (e.target === active) set.add(e.source);
    }
    return set;
  }, [active, graph.edges]);

  const hub = byId.get("mood")!;
  const edges = graph.edges
    .map((e) => {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) return null;
      return { e, a, b, ...curveBetween(a, b, e.source === "mood" ? 0.1 : 0.22) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Particles ride the strongest measured links towards the hub.
  const particles = edges
    .filter(
      ({ e }) =>
        e.source === "mood" && e.evidence !== "insufficient" && !e.target.startsWith("emotion:"),
    )
    .sort((x, y) => Math.abs(y.e.r) - Math.abs(x.e.r))
    .slice(0, 6);

  const empty = graph.days === 0;
  const edgeState = (e: GraphEdge) =>
    !active ? "idle" : e.source === active || e.target === active ? "on" : "off";
  const nodeState = (id: string) => (!connected ? "idle" : connected.has(id) ? "on" : "off");

  const onKey = (ev: KeyboardEvent, id: string) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onSelect(id);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      className={`mg-svg relative h-auto w-full ${className ?? ""}`}
      role="img"
      aria-label="Connection map of the signals and emotions that move with your mood"
      onMouseLeave={() => onHover(null)}
    >
      <defs>
        <radialGradient id={`mg-${keyPrefix}-hub`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="var(--gold-soft)" stopOpacity="0.95" />
          <stop offset="55%" stopColor="var(--gold)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.08" />
        </radialGradient>
        <radialGradient id={`mg-${keyPrefix}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* orbit guides */}
      <g className="mg-orbits" aria-hidden>
        <ellipse cx={hub.x} cy={hub.y} rx={size.width * 0.3} ry={size.height * 0.3} />
        <ellipse cx={hub.x} cy={hub.y} rx={size.width * 0.43} ry={size.height * 0.42} />
      </g>

      {/* edges */}
      <g fill="none" strokeLinecap="round">
        {edges.map(({ e, d }) => {
          const weak = e.evidence === "insufficient";
          const w = weak ? 1 : 1.2 + Math.abs(e.r) * 4.2;
          return (
            <path
              key={e.id}
              id={`mg-${keyPrefix}-e-${e.id}`}
              d={d}
              className={`mg-edge mg-edge-${weak ? "weak" : e.r >= 0 ? "up" : "down"}`}
              data-state={edgeState(e)}
              strokeWidth={w}
              strokeDasharray={weak ? "3 6" : undefined}
            />
          );
        })}
      </g>

      {/* particles */}
      <g className="mg-particles" aria-hidden>
        {particles.map(({ e }, i) => {
          const dur = (7.5 - Math.min(1, Math.abs(e.r)) * 4).toFixed(1);
          return (
            <circle
              key={e.id}
              r={2.4}
              className={`mg-particle ${e.r >= 0 ? "mg-particle-up" : "mg-particle-down"}`}
              data-state={edgeState(e)}
            >
              <animateMotion
                dur={`${dur}s`}
                begin={`${(-i * 1.3).toFixed(1)}s`}
                repeatCount="indefinite"
                keyPoints="1;0"
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#mg-${keyPrefix}-e-${e.id}`} />
              </animateMotion>
            </circle>
          );
        })}
      </g>

      {/* hub */}
      <g
        className="mg-hub"
        data-state={nodeState("mood")}
        role="button"
        tabIndex={0}
        aria-label={`Mood — ${hub.reading}`}
        onMouseEnter={() => onHover("mood")}
        onFocus={() => onHover("mood")}
        onBlur={() => onHover(null)}
        onClick={() => onSelect("mood")}
        onKeyDown={(ev) => onKey(ev, "mood")}
      >
        <circle
          cx={hub.x}
          cy={hub.y}
          r={hub.r * 2.4}
          fill={`url(#mg-${keyPrefix}-halo)`}
          className="mg-hub-glow"
          style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}
        />
        <circle
          cx={hub.x}
          cy={hub.y}
          r={hub.r * 1.32}
          className="mg-hub-ring"
          style={{ transformOrigin: `${hub.x}px ${hub.y}px` }}
        />
        <circle
          cx={hub.x}
          cy={hub.y}
          r={hub.r}
          fill={`url(#mg-${keyPrefix}-hub)`}
          className="mg-hub-core"
        />
        <text x={hub.x} y={hub.y - 2} textAnchor="middle" className="mg-hub-label">
          Mood
        </text>
        <text x={hub.x} y={hub.y + 13} textAnchor="middle" className="mg-hub-sub">
          {empty ? "no entries yet" : `${(hub.reading.split(" ")[0] ?? "").trim()} /10`}
        </text>
      </g>

      {/* satellites */}
      {nodes
        .filter((n) => n.kind !== "hub")
        .map((n) => (
          <Satellite
            key={n.id}
            node={n}
            state={nodeState(n.id)}
            below={n.y >= hub.y}
            onHover={onHover}
            onSelect={onSelect}
            onKey={onKey}
          />
        ))}

      {empty ? (
        <text x={size.width / 2} y={size.height - 22} textAnchor="middle" className="mg-empty">
          The web draws itself from your check-ins.
        </text>
      ) : null}
    </svg>
  );
}

function Satellite({
  node: n,
  state,
  below,
  onHover,
  onSelect,
  onKey,
}: {
  node: LayoutNode;
  state: "idle" | "on" | "off";
  below: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onKey: (ev: KeyboardEvent, id: string) => void;
}) {
  const labelY = below ? n.y + n.r + 15 : n.y - n.r - 8;
  return (
    <g
      className={`mg-node mg-node-${n.kind}`}
      data-state={state}
      role="button"
      tabIndex={0}
      aria-label={`${n.label} — ${n.reading}`}
      onMouseEnter={() => onHover(n.id)}
      onFocus={() => onHover(n.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(n.id)}
      onKeyDown={(ev) => onKey(ev, n.id)}
      style={{ ["--mg-c" as string]: n.color }}
    >
      {/* generous hit area so small satellites are easy to hover */}
      <circle cx={n.x} cy={n.y} r={n.r + 14} fill="transparent" />
      <circle cx={n.x} cy={n.y} r={n.r + 5} className="mg-node-halo" />
      <circle cx={n.x} cy={n.y} r={n.r} className="mg-node-body" />
      <circle cx={n.x} cy={n.y} r={Math.max(2, n.r * 0.28)} className="mg-node-dot" />
      <text x={n.x} y={labelY} textAnchor="middle" className="mg-label">
        {n.label}
      </text>
    </g>
  );
}

/* --------------------------------- legend --------------------------------- */

function HowToRead() {
  return (
    <ul className="mt-6 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
      <li className="flex gap-2.5">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
        Closer to the centre and thicker line = stronger pull on your mood.
      </li>
      <li className="flex gap-2.5">
        <span
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "var(--mp-angry)" }}
        />
        Rose lines lower it; gold lines lift it. Particles flow along the strongest links.
      </li>
      <li className="flex gap-2.5">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full border border-foreground/40" />
        Dotted rings are emotions — how often you name them and the mood they arrive with.
      </li>
    </ul>
  );
}

function Legend() {
  return (
    <div className="relative mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-gold" /> Mood
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full border border-foreground/50" /> Signals you log
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-foreground/35" /> Emotions
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-6 rounded-full bg-gold/80" /> lifts mood
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-6 rounded-full" style={{ background: "var(--mp-angry)" }} /> lowers
        it
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-px w-6 border-t border-dashed border-foreground/40" /> not enough days
        yet
      </span>
    </div>
  );
}

/* --------------------------------- reading -------------------------------- */

/** "Longer sleep, higher mood (r +0.50, 23 days)" -> "Longer sleep, higher mood." */
function headline(statement: string): string {
  return `${(statement.split(" (")[0] ?? statement).trim()}.`;
}

function Reading({
  graph,
  active,
  pinned,
  onClear,
}: {
  graph: Graph;
  active: string | null;
  pinned: string | null;
  onClear: () => void;
}) {
  const node = active ? graph.nodes.find((n) => n.id === active) : null;
  const links = node
    ? graph.edges
        .filter((e) => e.source === node.id || e.target === node.id)
        .map((e) => ({
          e,
          other: graph.nodes.find((n) => n.id === (e.source === node.id ? e.target : e.source))!,
        }))
        .sort((x, y) => Math.abs(y.e.r) - Math.abs(x.e.r))
    : [];

  if (!node) {
    return (
      <aside className="mg-reading flex flex-col" aria-live="polite">
        <p className="mp-eyebrow">Reading</p>
        {graph.days === 0 ? (
          <>
            <p className="mt-4 font-display text-xl leading-snug text-foreground">
              Log a few days and the web appears.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Energy and stress come with every check-in. Add sleep, exercise or screen time in the
              composer and the map shows what actually moves your mood — with the strength measured
              on your own days.
            </p>
          </>
        ) : graph.headline ? (
          <>
            <p className="mt-4 font-display text-xl leading-snug text-foreground">
              {headline(graph.headline.statement)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Your strongest measured link right now — r {graph.headline.r > 0 ? "+" : ""}
              {graph.headline.r.toFixed(2)} over {graph.headline.n} days, {graph.headline.evidence}{" "}
              evidence.{" "}
              <span className="hidden sm:inline">Hover any node to read it; click to pin.</span>
              <span className="sm:hidden">Tap any node to read it.</span>
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 font-display text-xl leading-snug text-foreground">
              {graph.days} day{graph.days === 1 ? "" : "s"} in the web so far.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Relationships need at least 8 paired days before they count. Keep logging — and add
              sleep, exercise or screen time in the composer to give the map more to connect.
            </p>
          </>
        )}
        <div className="mt-auto pt-8">
          <span className="block h-px w-10 bg-gold/50" />
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Line weight is the strength of the relationship (Pearson r) on days both were logged.
            Correlation is not causation.
          </p>
          <HowToRead />
        </div>
      </aside>
    );
  }

  return (
    <aside className="mg-reading flex flex-col" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mp-eyebrow">
            {node.kind === "hub" ? "Centre" : node.kind === "signal" ? "Signal" : "Emotion"}
          </p>
          <p className="mt-3 font-display text-2xl leading-tight text-foreground">{node.label}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{node.reading}</p>
        </div>
        {pinned ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground"
          >
            Unpin
          </button>
        ) : null}
      </div>

      <ul className="mt-6 space-y-3">
        {links.slice(0, 6).map(({ e, other }) => {
          const weak = e.evidence === "insufficient";
          const pct = Math.min(100, Math.abs(e.r) * 100);
          return (
            <li key={e.id} className="rounded-xl border border-border bg-card/60 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{other.label}</span>
                <span
                  className="text-xs tabular-nums"
                  style={{
                    color: weak
                      ? "var(--muted-foreground)"
                      : e.r >= 0
                        ? "var(--gold)"
                        : "var(--mp-angry)",
                  }}
                >
                  {weak
                    ? `${e.n} day${e.n === 1 ? "" : "s"}`
                    : `r ${e.r > 0 ? "+" : ""}${e.r.toFixed(2)}`}
                </span>
              </div>
              <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-secondary">
                <span className="absolute left-1/2 top-0 h-full w-px bg-border" />
                {!weak ? (
                  <span
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      width: `${pct / 2}%`,
                      left: e.r >= 0 ? "50%" : `${50 - pct / 2}%`,
                      background: e.r >= 0 ? "var(--gold)" : "var(--mp-angry)",
                    }}
                  />
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.statement}</p>
            </li>
          );
        })}
        {links.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nothing connects here yet.</li>
        ) : null}
      </ul>

      <Link
        to="/mood/intelligence"
        hash="relationships"
        preload="intent"
        className="mt-auto inline-flex items-center gap-2 pt-6 text-sm text-gold transition-opacity hover:opacity-80"
      >
        See the full analysis
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </aside>
  );
}
