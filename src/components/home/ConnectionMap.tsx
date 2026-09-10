import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Info, Moon, Smile, Sprout, BarChart3, Droplet, Zap, type LucideIcon } from "lucide-react";

import type { Connection, CrossLink, SignalId } from "@/lib/home/today";
import { SIGNAL_LABEL, SIGNAL_ROUTE } from "@/lib/home/today";

/* Everything lives in one square coordinate space so SVG paths and
   the DOM nodes are guaranteed to line up pixel for pixel. */
const SIZE = 340;
const C = SIZE / 2;
const R = 124;

export const SIGNAL_COLOR: Record<SignalId, string> = {
  mood: "var(--home-mood)",
  habits: "var(--home-habits)",
  cycle: "var(--home-cycle)",
  energy: "var(--home-energy)",
  study: "var(--home-study)",
  sleep: "var(--home-sleep)",
};

export const SIGNAL_ICON: Record<SignalId, LucideIcon> = {
  mood: Smile,
  habits: Sprout,
  cycle: Droplet,
  energy: Zap,
  study: BarChart3,
  sleep: Moon,
};

/* fixed layout: the six signals always sit in the same place so the map
   reads the same every day; only strength, notes and links change */
const LAYOUT: { id: SignalId; angle: number; side: "left" | "right"; dy: number }[] = [
  { id: "mood", angle: -90, side: "right", dy: -128 },
  { id: "habits", angle: -30, side: "right", dy: -34 },
  { id: "cycle", angle: 30, side: "right", dy: 58 },
  { id: "energy", angle: 90, side: "left", dy: 104 },
  { id: "study", angle: 150, side: "left", dy: 22 },
  { id: "sleep", angle: -150, side: "left", dy: -70 },
];

function pos(angle: number, radius = R) {
  const rad = (angle * Math.PI) / 180;
  return { x: C + Math.cos(rad) * radius, y: C + Math.sin(rad) * radius };
}

/* spoke: starts at the edge of the "You" hub, ends at the edge of the node
   bubble, with a slight bow so nothing looks like a stray straight line */
function spoke(angle: number) {
  const start = pos(angle, 44);
  const end = pos(angle, R - 26);
  const mid = pos(angle - 7, (44 + R - 26) / 2);
  return `M ${start.x} ${start.y} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`;
}

function arcBetween(a: number, b: number) {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const p1 = pos(a, R - 26);
  const p2 = pos(b, R - 26);
  const mid = pos(a + delta / 2, R - 26 - Math.abs(delta) * 0.42);
  return `M ${p1.x} ${p1.y} Q ${mid.x} ${mid.y} ${p2.x} ${p2.y}`;
}

/**
 * B9 · Loading twin of the connection map. Same panel, same header, same
 * stage box and node coordinates — only the paint is a pulse. Shown until the
 * stores hydrate (see `useEverReady`), so a cold first load reads as
 * "loading" instead of a hollow, broken-looking map.
 */
export function ConnectionMapSkeleton({ rangeLabel = "Last 30 days" }: { rangeLabel?: string }) {
  return (
    <section className="home-panel relative overflow-hidden p-5" aria-label="Loading connection map">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-44 animate-pulse rounded-md bg-surface-3" />
        </div>
        <span className="home-chip animate-pulse text-xs text-transparent">{rangeLabel}</span>
      </header>

      <div className="relative mx-auto mt-4 w-full max-w-[560px]">
        <div className="cm-stage" aria-hidden>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full">
            <g className="text-primary/20" fill="none" stroke="currentColor">
              <circle cx={C} cy={C} r={R - 26} strokeWidth={0.6} strokeDasharray="2 8" />
              <circle cx={C} cy={C} r={R - 62} strokeWidth={0.5} opacity={0.6} />
              <circle
                cx={C}
                cy={C}
                r={R + 14}
                strokeWidth={0.5}
                strokeDasharray="1 12"
                opacity={0.5}
              />
            </g>
          </svg>

          <div className="cm-hub">
            <span className="size-full animate-pulse rounded-full bg-surface-3" />
          </div>

          {LAYOUT.map((l) => {
            const p = pos(l.angle);
            return (
              <span
                key={l.id}
                className="cm-node"
                style={{
                  left: `${(p.x / SIZE) * 100}%`,
                  top: `${(p.y / SIZE) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span
                  className="cm-node-disc animate-pulse"
                  style={{ borderColor: "var(--border)", background: "var(--surface-3)" }}
                />
                <span
                  className="h-2 w-10 animate-pulse rounded-full"
                  style={{ background: "var(--surface-3)" }}
                />
              </span>
            );
          })}
        </div>
      </div>

      <p className="mt-3 flex min-h-[2.5em] items-center justify-center gap-2 text-center text-[11.5px] text-muted-foreground">
        <span className="size-3 animate-spin rounded-full border border-border border-t-primary" />
        Reading your record…
      </p>
    </section>
  );
}

export function ConnectionMap({
  nodes,
  links,
  name,
  rangeLabel = "Last 30 days",
}: {
  nodes: Connection[];
  links: CrossLink[];
  name: string | null;
  rangeLabel?: string;
}) {
  const [active, setActive] = useState<SignalId | null>(null);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  /* a signal the model left out (cycle tracking turned off) simply isn't drawn;
     everything else keeps its fixed place so the map still reads the same */
  const spokes = useMemo(
    () =>
      LAYOUT.filter((l) => byId.has(l.id)).map((l) => ({
        ...l,
        d: spoke(l.angle),
        strength: byId.get(l.id)?.strength ?? 0,
        note: byId.get(l.id)?.note ?? "",
        days: byId.get(l.id)?.days ?? 0,
      })),
    [byId],
  );

  const crossPaths = useMemo(
    () =>
      links
        .map((link) => {
          const a = LAYOUT.find((l) => l.id === link.from);
          const b = LAYOUT.find((l) => l.id === link.to);
          if (!a || !b) return null;
          return { ...link, d: arcBetween(a.angle, b.angle) };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [links],
  );

  const activeLink = active ? crossPaths.find((c) => c.from === active || c.to === active) : null;
  const totalDays = nodes.reduce((s, n) => s + n.days, 0);

  return (
    <section className="home-panel relative overflow-hidden p-5" aria-labelledby="home-map-title">
      <header className="flex items-center justify-between gap-3">
        <h2 id="home-map-title" className="flex items-center gap-2 font-display text-xl">
          Your connection map
          <span title="Node strength is how much of the last 30 days carries that signal. Dashed arcs are correlations found in your own logs.">
            <Info className="size-3.5 text-muted-foreground" />
          </span>
        </h2>
        <span className="home-chip text-xs text-muted-foreground">{rangeLabel}</span>
      </header>

      <div className="relative mx-auto mt-4 w-full max-w-[560px]">
        {/* square stage: SVG + nodes share these exact coordinates. The nodes
            are placed in percentages of this box so they stay welded to the
            drawing at any width (see .cm-stage in styles.css). */}
        <div className="cm-stage">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full" aria-hidden>
            <defs>
              <radialGradient id="cm-hub" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </radialGradient>
              {spokes.map((n) => (
                <linearGradient
                  key={n.id}
                  id={`cm-grad-${n.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={C}
                  y1={C}
                  x2={pos(n.angle).x}
                  y2={pos(n.angle).y}
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                  <stop
                    offset="100%"
                    stopColor={SIGNAL_COLOR[n.id]}
                    stopOpacity={0.35 + n.strength * 0.5}
                  />
                </linearGradient>
              ))}
            </defs>

            {/* orbit rings */}
            <g className="text-primary/20" fill="none" stroke="currentColor">
              <circle cx={C} cy={C} r={R - 26} strokeWidth={0.6} strokeDasharray="2 8" />
              <circle cx={C} cy={C} r={R - 62} strokeWidth={0.5} opacity={0.6} />
              <circle
                cx={C}
                cy={C}
                r={R + 14}
                strokeWidth={0.5}
                strokeDasharray="1 12"
                opacity={0.5}
              />
            </g>

            <circle cx={C} cy={C} r={R} fill="url(#cm-hub)" className="text-primary" />

            {/* cross relationships — real correlations only */}
            <g fill="none" stroke="currentColor" className="text-primary/45">
              {crossPaths.map((c) => {
                const on = !active || active === c.from || active === c.to;
                return (
                  <path
                    key={`${c.from}-${c.to}`}
                    d={c.d}
                    className="home-dash"
                    strokeWidth={on ? 0.7 + c.weight * 1.2 : 0.6}
                    strokeDasharray="4 8"
                    opacity={on ? 0.35 + c.weight * 0.55 : 0.12}
                  />
                );
              })}
            </g>

            {/* spokes */}
            <g fill="none" strokeLinecap="round" className="text-primary">
              {spokes.map((n) => {
                const dim = active !== null && active !== n.id;
                const dur = `${4.6 - n.strength * 1.6}s`;
                return (
                  <g key={n.id} opacity={dim ? 0.18 : 1}>
                    <path
                      d={n.d}
                      stroke={`url(#cm-grad-${n.id})`}
                      strokeWidth={active === n.id ? 3 : 1.2 + n.strength * 1.4}
                      style={{ transition: "stroke-width 300ms" }}
                    />
                    {n.strength > 0 ? (
                      <circle r={active === n.id ? 2.6 : 1.8} fill={SIGNAL_COLOR[n.id]}>
                        <animateMotion
                          dur={dur}
                          repeatCount="indefinite"
                          path={n.d}
                          keyPoints="0;1"
                          keyTimes="0;1"
                          calcMode="linear"
                        />
                        <animate
                          attributeName="opacity"
                          values="0;1;1;0"
                          dur={dur}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* center hub */}
          <div
            className="cm-hub"
            title={
              totalDays === 0 ? "Nothing logged yet" : `${totalDays} logged days behind this map`
            }
          >
            <span className="cm-hub-halo home-halo" aria-hidden />
            <span className="max-w-full truncate">{name ? name.split(" ")[0] : "You"}</span>
          </div>

          {/* nodes */}
          {spokes.map((n) => {
            const p = pos(n.angle);
            const Icon = SIGNAL_ICON[n.id];
            const dim = active !== null && active !== n.id;
            return (
              <Link
                key={n.id}
                to={SIGNAL_ROUTE[n.id]}
                onMouseEnter={() => setActive(n.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(n.id)}
                onBlur={() => setActive(null)}
                aria-label={`${SIGNAL_LABEL[n.id]}: ${Math.round(n.strength * 100)}% evidence. ${n.note}`}
                className="cm-node"
                style={{
                  left: `${(p.x / SIZE) * 100}%`,
                  top: `${(p.y / SIZE) * 100}%`,
                  transform: `translate(-50%, -50%) scale(${active === n.id ? 1.12 : 1})`,
                  transition: "transform 300ms, opacity 300ms",
                  opacity: dim ? 0.4 : n.strength === 0 ? 0.7 : 1,
                }}
              >
                <span
                  className={`cm-node-disc ${n.strength > 0 ? "home-node-glow home-float" : ""}`}
                  style={{ color: SIGNAL_COLOR[n.id] }}
                >
                  <Icon className="cm-node-icon" />
                </span>
                <span className="cm-node-label">{SIGNAL_LABEL[n.id]}</span>
                <span
                  className="cm-node-value"
                  style={{ color: SIGNAL_COLOR[n.id], opacity: active === n.id ? 1 : 0.55 }}
                >
                  {Math.round(n.strength * 100)}%
                </span>
              </Link>
            );
          })}
        </div>

        {/* notes anchored to the panel edges, vertically offset from centre */}
        {spokes.map((n) => (
          <p
            key={`note-${n.id}`}
            className="absolute hidden w-[104px] rounded-lg border border-border bg-surface-2/70 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground transition-opacity duration-300 2xl:block"
            style={{
              top: `calc(50% + ${n.dy}px)`,
              [n.side === "left" ? "left" : "right"]: "-6px",
              opacity: active && active !== n.id ? 0.25 : 1,
            }}
          >
            {n.note}
          </p>
        ))}
      </div>

      {/* the active relationship or the strongest one, in a sentence */}
      <p
        className="mt-3 min-h-[2.5em] text-center text-[11.5px] leading-snug text-muted-foreground"
        aria-live="polite"
      >
        {activeLink
          ? activeLink.sentence
          : active
            ? (byId.get(active)?.note ?? "")
            : crossPaths[0]
              ? crossPaths[0].sentence
              : totalDays === 0
                ? "The map draws itself from what you log — nothing here is a placeholder."
                : "Arcs appear once two signals have enough shared days to correlate."}
      </p>
    </section>
  );
}
