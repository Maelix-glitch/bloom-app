/**
 * Connections — the Orbit (Brief v6 Slice 4, replacing the arc
 * constellation and absorbing the old standalone Patterns card,
 * M-111).
 *
 * "You" sit at the centre — the Bloom mark in a medallion. Your
 * signals rest on ONE ring around it: a signal logged on more of the
 * last 30 days sits closer and larger (its sample, drawn honestly).
 * Arcs join signals only where a real correlation exists in your own
 * logs; a link's strength is a WORD from the tracker engine's |r|
 * bands (the words themselves live in lib/home/orbit), never a
 * percentage — the old map's unexplained "%" figures were
 * M-107/M-108. The strongest connection
 * is the section's headline, in the insights engine's associative
 * language where the pair matches one it speaks.
 *
 * Two engines feed the section, exactly as before — no third source:
 * `connections()` (lib/home/today) for the nodes, links and the
 * header's day count, and `buildWholeLifeInsights` (lib/insights)
 * for the spoken findings and the pairs still forming. The UI
 * computes nothing statistical; geometry and strength words are the
 * pure helpers in lib/home/orbit.
 *
 * Readiness: the section sits behind the same settled gate as the
 * rest of Today. The page's latched `ready` covers habits, mood and
 * trackers; this section's extra sources — the cycle store, and the
 * food log / weigh-ins behind the insights — must also have settled
 * (`constellationSettled`). Until then the skeleton holds the
 * section's geometry and NO data paints, mirror or otherwise.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CircleDot,
  MoonStar,
  Orbit as OrbitIcon,
  Repeat2,
  SunMedium,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { BloomLogo } from "@/components/BloomLogo";
import { SectionHead } from "@/components/ui/SectionHead";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { useNutrition } from "@/hooks/useNutrition";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers } from "@/hooks/useTrackers";
import { plural } from "@/lib/format";
import {
  buildWholeLifeInsights,
  type WholeLifeInsight,
  type WholeLifePending,
} from "@/lib/insights/insights";
import { aggregateDays, calculateCorrelations } from "@/lib/mood/analytics";
import { constellationSettled, hasConnectionContent, strongestLinkFor } from "@/lib/home/constellation";
import {
  INSIGHT_TITLES,
  arcPath,
  insightKindForPair,
  linkTitle,
  orbitLayout,
  strengthWord,
} from "@/lib/home/orbit";
import {
  SIGNAL_LABEL,
  connections,
  type Connection,
  type CrossLink,
  type SignalId,
} from "@/lib/home/today";

/* One thin-line mark per signal — the same glyph family the rest of
   Today uses, so the orbit reads as part of the page. */
const SIGNAL_ICON: Record<SignalId, LucideIcon> = {
  mood: CircleDot,
  habits: Repeat2,
  cycle: OrbitIcon,
  energy: SunMedium,
  study: BookOpen,
  sleep: MoonStar,
};

const WINDOW_DAYS = 30;
const FOOT = "Patterns describe your own days. They don't show cause, and they aren't medical advice.";
const NO_LINKS_YET = "Arcs appear once two signals have enough shared days to correlate.";

/* ------------------------------ skeleton ------------------------------- */

/**
 * The unsettled twin: same panel, same header, a hollow ring resting
 * where the orbit will draw. Shown until every source behind the
 * section has settled — a cold load reads as "reading your record",
 * never as an empty map.
 */
export function ConnectionConstellationSkeleton() {
  const slots = orbitLayout(
    Array.from({ length: 6 }, (_, i) => ({ key: `s${i}`, daysLogged: 15, windowDays: 30 })),
  );
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
          <span className="block h-6 w-52 animate-pulse rounded-lg bg-surface-2/50" />
          <span className="mt-2 block h-3 w-64 animate-pulse rounded-full bg-surface-2/50" />
        </div>
        <span className="block h-6 w-24 animate-pulse rounded-full bg-surface-2/50" />
      </div>

      <div className="orbit orbit--ghost mt-2" aria-hidden="true">
        <span className="orbit-medallion animate-pulse" />
        {slots.map((p) => (
          <span
            key={p.key}
            className="orbit-node orbit-node--ghost"
            style={{ left: `${p.x}%`, top: `${p.y}%`, ["--orbit-d" as string]: `${p.size}cqw` }}
          >
            <span className="orbit-node-disc animate-pulse" />
          </span>
        ))}
      </div>

      <p className="mt-3 flex min-h-[2.5em] items-center justify-center gap-2 text-center text-[length:var(--text-meta)] text-faint-strong">
        <span className="size-3 animate-spin rounded-full border border-border border-t-primary" />
        Reading your record…
      </p>
    </section>
  );
}

/* --------------------------------- view -------------------------------- */

type Selection =
  | { type: "link"; id: string }
  | { type: "node"; id: SignalId }
  | { type: "insight"; kind: WholeLifeInsight["kind"] };

const linkId = (l: CrossLink): string => `${l.from}:${l.to}`;

interface PanelContent {
  title: string;
  badge: string | null;
  text: string | null;
  figures: readonly { label: string; value: string }[] | null;
  foot: string | null;
}

export function ConnectionConstellationView({
  nodes,
  links,
  loggedDays,
  insights,
  pending,
}: {
  nodes: Connection[];
  links: CrossLink[];
  loggedDays: number;
  insights: readonly WholeLifeInsight[];
  pending: readonly WholeLifePending[];
}) {
  const insightByKind = useMemo(
    () => new Map(insights.map((i) => [i.kind, i])),
    [insights],
  );
  const matchedKinds = useMemo(
    () =>
      new Set(
        links
          .map((l) => insightKindForPair(l.from, l.to))
          .filter((k): k is NonNullable<typeof k> => k !== null),
      ),
    [links],
  );
  const unmatchedInsights = useMemo(
    () => insights.filter((i) => !matchedKinds.has(i.kind)),
    [insights, matchedKinds],
  );

  const [selected, setSelected] = useState<Selection | null>(() =>
    links[0]
      ? { type: "link", id: linkId(links[0]) }
      : unmatchedInsights[0]
        ? { type: "insight", kind: unmatchedInsights[0].kind }
        : nodes[0]
          ? { type: "node", id: nodes[0].id }
          : null,
  );
  const [hot, setHot] = useState<Selection | null>(null);
  const eff = hot ?? selected;

  /* draw-in: arcs grow once the figure first scrolls into view */
  const figureRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = figureRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const placed = useMemo(
    () =>
      orbitLayout(
        nodes.map((n) => ({ key: n.id, daysLogged: n.days, windowDays: WINDOW_DAYS })),
      ),
    [nodes],
  );
  const pointOf = useMemo(
    () => new Map(placed.map((p) => [p.key as SignalId, p])),
    [placed],
  );
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  /* what the current focus lights up (an unmatched insight lights
     nothing in the figure — it has no arc — so nothing dims) */
  const hotLinks = new Set<string>();
  const hotNodes = new Set<SignalId>();
  if (eff?.type === "link") {
    const l = links.find((x) => linkId(x) === eff.id);
    if (l) {
      hotLinks.add(l.from + ":" + l.to);
      hotNodes.add(l.from);
      hotNodes.add(l.to);
    }
  } else if (eff?.type === "node") {
    hotNodes.add(eff.id);
    for (const l of links) {
      if (l.from === eff.id || l.to === eff.id) {
        hotLinks.add(linkId(l));
        hotNodes.add(l.from);
        hotNodes.add(l.to);
      }
    }
  }
  const dimming = eff !== null && eff.type !== "insight" && hotLinks.size + hotNodes.size > 0;

  const panelForLink = (l: CrossLink): PanelContent => {
    const kind = insightKindForPair(l.from, l.to);
    const insight = kind ? (insightByKind.get(kind) ?? null) : null;
    return {
      title: linkTitle(l.from, l.to),
      badge: strengthWord(l.weight),
      text: insight ? insight.headline : l.sentence,
      figures: insight ? insight.figures : null,
      foot: insight
        ? `From ${insight.sampleDays} paired days · last ${insight.windowDays} days`
        : `From ${l.days} paired days · last ${WINDOW_DAYS} days`,
    };
  };

  const panel: PanelContent | null = (() => {
    if (!selected) return null;
    if (selected.type === "link") {
      const l = links.find((x) => linkId(x) === selected.id);
      return l ? panelForLink(l) : null;
    }
    if (selected.type === "insight") {
      const insight = insightByKind.get(selected.kind);
      if (!insight) return null;
      return {
        title: INSIGHT_TITLES[insight.kind],
        badge: null,
        text: insight.headline,
        figures: insight.figures,
        foot:
          insight.kind === "weight-trend"
            ? `From ${insight.sampleDays} weigh-ins · last ${insight.windowDays} days`
            : `From ${insight.sampleDays} paired days · last ${insight.windowDays} days`,
      };
    }
    const node = byId.get(selected.id);
    if (!node) return null;
    const strongest = strongestLinkFor(links, node.id);
    if (strongest) return panelForLink(strongest);
    return {
      title: SIGNAL_LABEL[node.id],
      badge: null,
      text: node.note,
      figures: null,
      foot: `Logged on ${node.days} of the last ${WINDOW_DAYS} days.`,
    };
  })();

  const strongest = links[0] ?? null;
  const headline = strongest
    ? (() => {
        const kind = insightKindForPair(strongest.from, strongest.to);
        const insight = kind ? insightByKind.get(kind) : undefined;
        return insight ? insight.headline : strongest.sentence;
      })()
    : (insights[0]?.headline ?? NO_LINKS_YET);
  const nothingSpoken = links.length === 0 && insights.length === 0;

  const sameSel = (a: Selection | null, b: Selection): boolean =>
    a !== null && a.type === b.type && JSON.stringify(a) === JSON.stringify(b);

  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "190ms" }}
      aria-labelledby="home-constellation-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") setHot(null);
      }}
    >
      <SectionHead
        title="How your days connect"
        titleId="home-constellation-title"
        subline="Links appear only when your own logs show them."
        right={
          <span
            className="home-chip shrink-0 text-[length:var(--text-meta)] text-faint-strong"
            data-metric="orbit-days"
          >
            {plural(loggedDays, "day")} with any log · last {WINDOW_DAYS} days
          </span>
        }
      />

      {/* the finding, as the section's headline — above the figure,
          never a caption under it (M-109) */}
      <p className="orbit-headline">{headline}</p>

      <div className="orbit-grid">
        <div>
          {/* The stage: SVG arcs and DOM nodes share one 100×100
              space, placed in percentages so they stay welded at
              any width. */}
          <div
            ref={figureRef}
            className={`orbit${inView ? " is-in" : ""}`}
            data-focus={dimming ? "on" : "off"}
          >
            <svg viewBox="0 0 100 100" className="orbit-svg" aria-hidden="true" focusable="false">
              <circle className="orbit-guide" cx={50} cy={50} r={30.5} />
              <g fill="none" strokeLinecap="round">
                {links.map((link, i) => {
                  const a = pointOf.get(link.from);
                  const b = pointOf.get(link.to);
                  if (!a || !b) return null;
                  const isHot = hotLinks.has(linkId(link));
                  const dim = dimming && !isHot;
                  return (
                    <path
                      key={linkId(link)}
                      data-orbit-link={linkId(link)}
                      className={`orbit-arc${i === 0 ? " orbit-arc--strongest" : ""}`}
                      d={arcPath(a, b)}
                      pathLength={1}
                      /* M-203 (F-08): every real connection wears sage at
                         honest strength — gold reads as the actionable
                         accent elsewhere on Today, and a link is a fact,
                         not an action. Width and opacity still carry the
                         weight; the strongest link keeps its class. */
                      stroke="var(--success)"
                      strokeWidth={0.5 + link.weight * 1.6}
                      opacity={dim ? 0.08 : 0.3 + link.weight * 0.6}
                      style={{ ["--i" as string]: i }}
                      onMouseEnter={() => setHot({ type: "link", id: linkId(link) })}
                      onMouseLeave={() => setHot(null)}
                      onClick={() => setSelected({ type: "link", id: linkId(link) })}
                    />
                  );
                })}
              </g>
            </svg>

            <span className="orbit-medallion" role="img" aria-label="You, at the centre">
              <BloomLogo size={26} />
            </span>

            {placed.map((p, i) => {
              const n = byId.get(p.key as SignalId)!;
              const Icon = SIGNAL_ICON[n.id];
              const dim = dimming && !hotNodes.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  className="orbit-node"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    ["--orbit-d" as string]: `${p.size}cqw`,
                    ["--i" as string]: i,
                  }}
                  aria-pressed={sameSel(selected, { type: "node", id: n.id })}
                  aria-label={`${SIGNAL_LABEL[n.id]}, logged on ${n.days} of the last ${WINDOW_DAYS} days`}
                  data-dim={dim || undefined}
                  onMouseEnter={() => setHot({ type: "node", id: n.id })}
                  onMouseLeave={() => setHot(null)}
                  onFocus={() => setHot({ type: "node", id: n.id })}
                  onBlur={() => setHot(null)}
                  onClick={() => setSelected({ type: "node", id: n.id })}
                >
                  <span
                    className="orbit-node-disc"
                    style={{
                      borderColor: `color-mix(in oklab, var(--gold) ${Math.round(30 + p.coverage * 55)}%, transparent)`,
                      background: `color-mix(in oklab, var(--gold) ${Math.round(p.coverage * 16)}%, var(--surface))`,
                    }}
                  >
                    <Icon className="orbit-node-icon" style={{ color: "var(--gold-soft)" }} />
                  </span>
                  <span className="orbit-node-label">{SIGNAL_LABEL[n.id]}</span>
                </button>
              );
            })}
          </div>
          <p className="orbit-legend">Thicker, brighter line · stronger link</p>
        </div>

        <div className="orbit-side">
          <div className="orbit-panel" aria-live="polite">
            {panel ? (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="orbit-panel-title">{panel.title}</h3>
                  {panel.badge ? <span className="orbit-badge">{panel.badge}</span> : null}
                </div>
                {/* F-12 (M-204): the section states its finding once,
                    in the headline above the figure. When the panel's
                    sentence IS that headline (the strongest link, or
                    the node whose strongest link it is), the panel
                    carries the title, badge, figures and basis — the
                    sentence itself is not repeated under it. Any other
                    selection's sentence renders here as before. */}
                {panel.text && panel.text !== headline ? (
                  <p className="orbit-panel-text">{panel.text}</p>
                ) : null}
                {panel.figures ? (
                  <dl className="orbit-figures">
                    {panel.figures.map((f) => (
                      <div key={f.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-[length:var(--text-support)] text-muted-foreground">
                          {f.label}
                        </dt>
                        <dd className="whitespace-nowrap font-medium tabular-nums text-foreground">
                          {f.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {panel.foot ? <p className="orbit-panel-foot">{panel.foot}</p> : null}
              </>
            ) : null}
          </div>

          {links.length > 0 || unmatchedInsights.length > 0 ? (
            <ul className="orbit-rows">
              {links.map((link) => {
                const sel: Selection = { type: "link", id: linkId(link) };
                return (
                  <li key={linkId(link)}>
                    <button
                      type="button"
                      className="orbit-row"
                      aria-pressed={sameSel(selected, sel)}
                      data-hot={hotLinks.has(linkId(link)) || undefined}
                      onMouseEnter={() => setHot(sel)}
                      onMouseLeave={() => setHot(null)}
                      onFocus={() => setHot(sel)}
                      onBlur={() => setHot(null)}
                      onClick={() => setSelected(sel)}
                    >
                      <span>{linkTitle(link.from, link.to)}</span>
                      <b>{strengthWord(link.weight)}</b>
                    </button>
                  </li>
                );
              })}
              {unmatchedInsights.map((insight) => {
                const sel: Selection = { type: "insight", kind: insight.kind };
                return (
                  <li key={insight.kind}>
                    <button
                      type="button"
                      className="orbit-row"
                      aria-pressed={sameSel(selected, sel)}
                      onMouseEnter={() => setHot(sel)}
                      onMouseLeave={() => setHot(null)}
                      onFocus={() => setHot(sel)}
                      onBlur={() => setHot(null)}
                      onClick={() => setSelected(sel)}
                    >
                      <span>{INSIGHT_TITLES[insight.kind]}</span>
                      <b>
                        {insight.kind === "weight-trend"
                          ? `${insight.sampleDays} weigh-ins`
                          : `${insight.sampleDays} paired days`}
                      </b>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {nothingSpoken ? (
        <div className="empty-row mt-5">
          <span className="empty-row-icon" aria-hidden>
            <Waves className="size-4" />
          </span>
          <p className="empty-row-text">
            <strong>Nothing to read yet.</strong> Log mood and one more area on the same days, after 8 paired days, Bloom can check how they connect.{" "}
            <Link to="/mood" className="orbit-empty-action">
              Log mood today
            </Link>
          </p>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="mt-6">
          <h3 className="orbit-forming-title">Pairs still forming</h3>
          <ul className="mt-3 space-y-2.5">
            {pending.map((p) => (
              <li
                key={p.kind}
                className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-center gap-3 text-[length:var(--text-support)] text-muted-foreground"
              >
                <span>{p.label}</span>
                <span
                  className="meter"
                  role="progressbar"
                  aria-label={`${p.label}: ${p.sampleDays} of ${p.neededDays} paired days`}
                  aria-valuemin={0}
                  aria-valuemax={p.neededDays}
                  aria-valuenow={p.sampleDays}
                  style={{ ["--v" as string]: `${(p.sampleDays / p.neededDays) * 100}%` }}
                />
                <span className="whitespace-nowrap tabular-nums">
                  {p.sampleDays} of {p.neededDays} paired days
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="orbit-foot">{FOOT}</p>
    </section>
  );
}

/* ------------------------------ empty state ---------------------------- */

/**
 * Settled, and the record genuinely carries no signal days yet. Calm
 * and honest: a hollow ring, what a connection IS, and what makes one
 * appear — never a stage pretending to be a map.
 */
export function ConnectionConstellationEmpty() {
  const slots = orbitLayout(
    Array.from({ length: 6 }, (_, i) => ({ key: `s${i}`, daysLogged: 15, windowDays: 30 })),
  );
  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "190ms" }}
      aria-labelledby="home-constellation-title"
      data-testid="home-constellation-empty"
    >
      <SectionHead
        title="How your days connect"
        titleId="home-constellation-title"
        subline="Links appear only when your own logs show them."
      />

      <div className="orbit orbit--ghost mt-2" aria-hidden="true">
        <span className="orbit-medallion orbit-medallion--ghost">
          <BloomLogo size={26} />
        </span>
        {slots.map((p) => (
          <span
            key={p.key}
            className="orbit-node orbit-node--ghost"
            style={{ left: `${p.x}%`, top: `${p.y}%`, ["--orbit-d" as string]: `${p.size}cqw` }}
          >
            <span className="orbit-node-disc" />
          </span>
        ))}
      </div>

      <p className="mx-auto max-w-[52ch] text-center text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        Connections appear once two signals share enough logged days, a few mornings of mood, sleep
        or habits, and the first arc draws itself from your own record.
      </p>
      <p className="orbit-foot">{FOOT}</p>
    </section>
  );
}

/* ------------------------------- section ------------------------------- */

/**
 * The Today section. Owns its stores the way LevelCard owns the wallet:
 * the shared mood record, the session-cached habits store, the tracker
 * store, the cycle store (this map's one extra source), and the food
 * log + weigh-ins the insights engine reads. The page passes only its
 * latched `ready`; the cycle store's own settling is folded in here,
 * so the gate the section renders behind is the page's gate, whole.
 */
export function ConnectionConstellation({ ready }: { ready: boolean }) {
  const trackers = useTrackers();
  const habits = useHabits();
  const mood = useMoodSystem();
  const period = usePeriodLog();
  /* Food and weigh-in day lists join the header chip's any-log union
     (v6 §1.2) — the same two stores the insights engine reads. */
  const nutrition = useNutrition();
  const body = useBodyProfile();

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
      /* M-114: the cycle node is opt-in — an explicit mode choice
         (settings.modeChangedAt) or real cycle logs summon it; the
         default "tracking" mode alone never does. */
      cycleOptedIn: period.settings?.modeChangedAt != null,
      foodDates: nutrition.entries.map((e) => e.day),
      weighInDates: body.weighIns.map((w) => w.date),
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
    nutrition.entries,
    body.weighIns,
    period.analysis,
    period.mode,
    period.settings,
  ]);

  const wholeLife = useMemo(
    () =>
      buildWholeLifeInsights({
        today: trackers.today,
        moodEntries: mood.entries,
        trackerDays: trackers.days ?? [],
        habitLogs: habits.logs,
        foodEntries: nutrition.entries,
        weighIns: body.weighIns,
      }),
    [trackers.today, trackers.days, mood.entries, habits.logs, nutrition.entries, body.weighIns],
  );

  if (!settled) return <ConnectionConstellationSkeleton />;
  if (!hasConnectionContent(model.nodes)) return <ConnectionConstellationEmpty />;
  return (
    <ConnectionConstellationView
      nodes={model.nodes}
      links={model.links}
      loggedDays={model.loggedDays}
      insights={wholeLife.insights}
      pending={wholeLife.pending}
    />
  );
}
