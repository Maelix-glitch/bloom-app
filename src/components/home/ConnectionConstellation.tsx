/**
 * The connection constellation — Today's NEW connection map (overnight
 * Slice 2). A completely fresh design, not the retired radial orbit:
 * the person's signals rest along one gentle arc in a wide stage, sized
 * and lit by their real strength, joined by gradient arcs whose weight
 * is the model's real correlation. The strongest connection wears sage;
 * everything else is gold or a neutral hairline — rose never appears
 * here, because elsewhere in Bloom it means a negative direction.
 *
 * Data honesty is the old map's contract, kept whole: every node, link
 * and sentence comes from `connections()` in lib/home/today, computed
 * from the person's own logs (tracker correlations + mood correlations,
 * insufficient evidence excluded by the model itself). Nothing is
 * invented to fill the stage.
 *
 * Readiness: the section sits behind the same settled gate as the rest
 * of Today. The page's latched `ready` (the `overviewRecordsSettled`
 * predicate) covers habits, mood and trackers; this section's one extra
 * source — the cycle store — must also have hydrated and finished its
 * account check (`constellationSettled`). Until then the skeleton holds
 * the panel's exact geometry and NO data paints, mirror or otherwise.
 * The honest empty state appears only once settled, when the record
 * genuinely carries no signal days yet.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CircleDot,
  MoonStar,
  Orbit,
  Repeat2,
  SunMedium,
  type LucideIcon,
} from "lucide-react";

import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers } from "@/hooks/useTrackers";
import { aggregateDays, calculateCorrelations } from "@/lib/mood/analytics";
import {
  STAGE_H,
  STAGE_W,
  arcPoint,
  arcSpine,
  constellationSettled,
  hasConnectionContent,
  linkPath,
  linkTone,
  placeByStrength,
  strongestLinkFor,
} from "@/lib/home/constellation";
import {
  SIGNAL_LABEL,
  SIGNAL_ROUTE,
  connections,
  type Connection,
  type CrossLink,
  type SignalId,
} from "@/lib/home/today";

/* One thin-line mark per signal — the same glyph family the rest of
   Today uses, so the constellation reads as part of the page. */
const SIGNAL_ICON: Record<SignalId, LucideIcon> = {
  mood: CircleDot,
  habits: Repeat2,
  cycle: Orbit,
  energy: SunMedium,
  study: BookOpen,
  sleep: MoonStar,
};

const RANGE_LABEL = "Last 30 days · from your own logs";

/* ------------------------------ skeleton ------------------------------- */

/**
 * The unsettled twin: same panel, same header, same stage box, hollow
 * points resting on the same arc. Shown until every source behind the
 * map has settled — a cold load reads as "reading your record", never
 * as an empty map.
 */
export function ConnectionConstellationSkeleton() {
  const slots = [0, 1, 2, 3, 4, 5];
  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "190ms" }}
      aria-label="Loading your connections"
      aria-busy="true"
      data-testid="home-constellation-skeleton"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="block h-3 w-36 animate-pulse rounded-full bg-surface-2/50" />
          <span className="mt-2 block h-6 w-52 animate-pulse rounded-lg bg-surface-2/50" />
        </div>
        <span className="block h-6 w-24 animate-pulse rounded-full bg-surface-2/50" />
      </div>

      <div className="cx-stage mt-2" aria-hidden="true">
        <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} className="absolute inset-0 size-full">
          <path
            d={arcSpine(slots.length)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 8"
            opacity={0.6}
          />
        </svg>
        {slots.map((i) => {
          const p = arcPoint(i, slots.length);
          return (
            <span
              key={i}
              className="cx-node"
              style={{
                left: `${(p.x / STAGE_W) * 100}%`,
                top: `${(p.y / STAGE_H) * 100}%`,
                transform: "translate(-50%, -50%)",
                ["--cx-d" as string]: "8cqw",
              }}
            >
              <span
                className="cx-node-disc animate-pulse"
                style={{ borderColor: "var(--border)" }}
              />
            </span>
          );
        })}
      </div>

      <p className="mt-3 flex min-h-[2.5em] items-center justify-center gap-2 text-center text-[length:var(--text-meta)] text-faint-strong">
        <span className="size-3 animate-spin rounded-full border border-border border-t-primary" />
        Reading your record…
      </p>
    </section>
  );
}

/* --------------------------------- view -------------------------------- */

export function ConnectionConstellationView({
  nodes,
  links,
  loggedDays,
}: {
  nodes: Connection[];
  links: CrossLink[];
  loggedDays: number;
}) {
  const [active, setActive] = useState<SignalId | null>(null);

  const placed = useMemo(() => placeByStrength(nodes), [nodes]);
  const pointOf = useMemo(() => {
    const map = new Map<SignalId, { x: number; y: number }>();
    placed.forEach((n, i) => map.set(n.id, arcPoint(i, placed.length)));
    return map;
  }, [placed]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const activeNode = active ? (byId.get(active) ?? null) : null;
  const activeLink = active ? strongestLinkFor(links, active) : null;
  const strongest = links[0] ?? null;
  const narration = activeNode
    ? activeLink
      ? `${activeNode.note} ${activeLink.sentence}`
      : activeNode.note
    : strongest
      ? strongest.sentence
      : "Arcs appear once two signals have enough shared days to correlate.";

  const topLinks = links.slice(0, 3);

  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "190ms" }}
      aria-labelledby="home-constellation-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="home-eyebrow">Connections</p>
          <h2 id="home-constellation-title" className="home-band-title mt-1">
            How your days connect
          </h2>
          <p className="mt-1.5 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            Each point is a signal, sized by how much of the last 30 days carries it. The arcs are
            correlations found in your own logs — nothing else draws one.
          </p>
        </div>
        <span className="home-chip shrink-0 text-[length:var(--text-meta)] text-faint-strong">
          {loggedDays} logged {loggedDays === 1 ? "day" : "days"}
        </span>
      </div>

      {/* The stage: SVG links and DOM nodes share one coordinate space
          (600 × 300), placed in percentages so they stay welded at any
          width — the lesson the old square stage learned the hard way. */}
      <div className="cx-stage mt-1">
        <svg
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          className="absolute inset-0 size-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="cx-link-gold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--gold-soft)" />
              <stop offset="100%" stopColor="var(--gold)" />
            </linearGradient>
            <radialGradient id="cx-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx={STAGE_W / 2} cy={150} rx={290} ry={130} fill="url(#cx-glow)" />

          {/* the spine the signals rest on */}
          <path
            d={arcSpine(placed.length)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 8"
            opacity={0.55}
          />

          {/* cross links — real correlations only, weight is the model's */}
          <g fill="none" strokeLinecap="round">
            {links.map((link, i) => {
              const a = pointOf.get(link.from);
              const b = pointOf.get(link.to);
              if (!a || !b) return null;
              const tone = linkTone(link, i);
              const touches = active !== null && (link.from === active || link.to === active);
              const dim = active !== null && !touches;
              return (
                <path
                  key={`${link.from}-${link.to}`}
                  d={linkPath(a, b)}
                  className={tone === "sage" ? "cx-link--strongest" : undefined}
                  stroke={
                    tone === "sage"
                      ? "var(--success)"
                      : tone === "gold"
                        ? "url(#cx-link-gold)"
                        : "var(--border-strong)"
                  }
                  strokeWidth={tone === "sage" ? 1.4 + link.weight * 2 : 0.8 + link.weight * 1.8}
                  opacity={dim ? 0.1 : tone === "hairline" ? 0.5 : 0.3 + link.weight * 0.6}
                  style={{ transition: "opacity var(--motion-standard) var(--ease-out-expo)" }}
                />
              );
            })}
          </g>
        </svg>

        {placed.map((n) => {
          const p = pointOf.get(n.id)!;
          const Icon = SIGNAL_ICON[n.id];
          const dim = active !== null && active !== n.id;
          const discCqw = 5.6 + n.strength * 3.6; // of the 600-unit stage width
          return (
            <Link
              key={n.id}
              to={SIGNAL_ROUTE[n.id]}
              onMouseEnter={() => setActive(n.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(n.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(n.id)}
              aria-label={`${SIGNAL_LABEL[n.id]}: ${Math.round(n.strength * 100)}% of the last 30 days. ${n.note}`}
              className="cx-node"
              style={{
                left: `${(p.x / STAGE_W) * 100}%`,
                top: `${(p.y / STAGE_H) * 100}%`,
                transform: `translate(-50%, -50%) scale(${active === n.id ? 1.1 : 1})`,
                transition:
                  "transform var(--motion-standard) var(--ease-out-expo), opacity var(--motion-standard) var(--ease-out-expo)",
                opacity: dim ? 0.45 : 1,
                ["--cx-d" as string]: `${discCqw.toFixed(2)}cqw`,
              }}
            >
              <span
                className="cx-node-disc"
                style={{
                  borderColor:
                    active === n.id
                      ? "var(--gold)"
                      : `color-mix(in oklab, var(--gold) ${Math.round(30 + n.strength * 55)}%, transparent)`,
                  background: `color-mix(in oklab, var(--gold) ${Math.round(n.strength * 16)}%, var(--surface))`,
                  boxShadow:
                    n.strength > 0
                      ? `0 0 ${(10 + n.strength * 22).toFixed(0)}px color-mix(in oklab, var(--gold) ${Math.round(12 + n.strength * 26)}%, transparent)`
                      : "none",
                }}
              >
                <Icon className="cx-node-icon" style={{ color: "var(--gold-soft)" }} />
              </span>
              <span className="cx-node-label">{SIGNAL_LABEL[n.id]}</span>
              <span className="cx-node-value" style={{ color: "var(--gold)" }}>
                {Math.round(n.strength * 100)}%
              </span>
            </Link>
          );
        })}
      </div>

      {/* the selected signal's story, or the strongest connection's */}
      <p
        className="mx-auto mt-2 min-h-[2.5em] max-w-[58ch] text-center text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
        aria-live="polite"
      >
        {narration}
      </p>

      {/* The top connections as sentences — the insight in plain text,
          so it survives a phone width where the stage runs small. */}
      {topLinks.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-white/[0.06] pt-4">
          {topLinks.map((link, i) => {
            const tone = linkTone(link, i);
            return (
              <li key={`${link.from}-${link.to}`} className="flex items-baseline gap-2.5">
                <span
                  className="size-1.5 shrink-0 translate-y-[-1px] rounded-full"
                  style={{
                    background:
                      tone === "sage"
                        ? "var(--success)"
                        : tone === "gold"
                          ? "var(--gold)"
                          : "var(--border-strong)",
                  }}
                  aria-hidden
                />
                <p className="min-w-0 flex-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {SIGNAL_LABEL[link.from]} · {SIGNAL_LABEL[link.to]}
                  </span>{" "}
                  — {link.sentence}
                </p>
                {/* The link's day-count as the row's structured figure
                    (diagnosis §G): the shared days behind this exact
                    correlation, from the engine's own `n` — not the
                    section's total logged days in the header chip. */}
                <span className="shrink-0 whitespace-nowrap text-[length:var(--text-meta)] tabular-nums text-faint-strong">
                  {link.days} shared {link.days === 1 ? "day" : "days"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="mt-4 text-[length:var(--text-meta)] text-faint-strong">{RANGE_LABEL}</p>
    </section>
  );
}

/* ------------------------------ empty state ---------------------------- */

/**
 * Settled, and the record genuinely carries no signal days yet. Calm
 * and honest: what a connection IS, and what makes one appear — never a
 * hollow stage pretending to be a map.
 */
export function ConnectionConstellationEmpty() {
  const slots = [0, 1, 2, 3, 4, 5];
  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "190ms" }}
      aria-labelledby="home-constellation-title"
      data-testid="home-constellation-empty"
    >
      <div>
        <p className="home-eyebrow">Connections</p>
        <h2 id="home-constellation-title" className="home-band-title mt-1">
          How your days connect
        </h2>
      </div>

      <div className="cx-stage mt-1" aria-hidden="true">
        <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} className="absolute inset-0 size-full">
          <path
            d={arcSpine(slots.length)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 8"
            opacity={0.55}
          />
        </svg>
        {slots.map((i) => {
          const p = arcPoint(i, slots.length);
          return (
            <span
              key={i}
              className="cx-node"
              style={{
                left: `${(p.x / STAGE_W) * 100}%`,
                top: `${(p.y / STAGE_H) * 100}%`,
                transform: "translate(-50%, -50%)",
                ["--cx-d" as string]: "6.5cqw",
              }}
            >
              <span
                className="cx-node-disc"
                style={{ borderColor: "var(--border)", background: "transparent" }}
              />
            </span>
          );
        })}
      </div>

      <p className="mx-auto max-w-[52ch] text-center text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        Connections appear once two signals share enough logged days — a few mornings of mood, sleep
        or habits, and the first arc draws itself from your own record.
      </p>
      <p className="mt-4 text-[length:var(--text-meta)] text-faint-strong">{RANGE_LABEL}</p>
    </section>
  );
}

/* ------------------------------- section ------------------------------- */

/**
 * The Today section. Owns its stores the way LevelCard owns the wallet:
 * the shared mood record, the session-cached habits store, the tracker
 * store, and the cycle store (this map's one extra source). The page
 * passes only its latched `ready`; the cycle store's own settling is
 * folded in here, so the gate the section renders behind is the page's
 * gate, whole.
 */
export function ConnectionConstellation({ ready }: { ready: boolean }) {
  const trackers = useTrackers();
  const habits = useHabits();
  const mood = useMoodSystem();
  const period = usePeriodLog();

  const settled = constellationSettled({
    ready,
    periodHydrated: period.hydrated,
    periodSyncState: period.sync.state,
  });

  const model = useMemo(() => {
    const moodDays = aggregateDays(mood.entries);
    return connections({
      trackers: trackers.analysis,
      habits: {
        habits: habits.habits,
        logs: habits.logs,
        completedToday: habits.completedToday,
        dueToday: habits.dueToday,
      },
      moodEntries: mood.entries,
      moodDays,
      moodCorrelations: calculateCorrelations(moodDays),
      cycle: period.analysis,
      cycleMode: period.mode,
      today: trackers.today,
    });
  }, [
    trackers.analysis,
    trackers.today,
    habits.habits,
    habits.logs,
    habits.completedToday,
    habits.dueToday,
    mood.entries,
    period.analysis,
    period.mode,
  ]);

  if (!settled) return <ConnectionConstellationSkeleton />;
  if (!hasConnectionContent(model.nodes)) return <ConnectionConstellationEmpty />;
  return (
    <ConnectionConstellationView
      nodes={model.nodes}
      links={model.links}
      loggedDays={model.loggedDays}
    />
  );
}
