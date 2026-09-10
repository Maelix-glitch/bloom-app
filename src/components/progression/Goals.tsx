/**
 * Goals — the active half of the journey.
 *
 * Cards are mission cards: the domain, the instruction, verified progress,
 * and what it pays. Copy never scolds: an unfinished goal says how much is
 * left and that it can be picked back up at any time.
 *
 * Progressive disclosure: a short "right now" list first, then the full board
 * grouped by timescale (today → this week → this month → milestones), with a
 * journal filter and a sort that only ever reorders real goals.
 */

import { useMemo, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";

import { CADENCE_LABELS, JOURNEY_DOMAIN_LABELS } from "@/lib/progression/types";
import type { GoalProgress, JourneyDomain } from "@/lib/progression/types";
import { formatPoints } from "@/lib/progression/format";
import { cn } from "@/lib/utils";

/** Domain → the card's accent. Calm, wellness-first, never alarming. */
const DOMAIN_TONE: Record<JourneyDomain, string> = {
  fitness: "var(--sage)",
  movement: "var(--sage)",
  health: "var(--sky)",
  sleep: "var(--violet)",
  hydration: "var(--sky)",
  recovery: "var(--violet)",
  energy: "var(--amber)",
  habits: "var(--amber)",
  consistency: "var(--gold)",
  mood: "var(--rose)",
  mindfulness: "var(--rose)",
  study: "var(--sky)",
  "self-care": "var(--sage)",
  milestones: "var(--gold)",
};

export type GoalFilter = "all" | "wellness" | JourneyDomain;
export type GoalSort = "closest" | "valuable" | "recommended";

/**
 * The domains whose progress can only ever come from real body-and-mind
 * records — movement, sleep, water, rest, mood, stillness. Bloom keeps these
 * first-class: they are the ones a person is most likely to be able to act on,
 * and they are the ones that suffer first when life gets loud.
 */
const WELLNESS_DOMAINS = new Set<JourneyDomain>([
  "fitness",
  "movement",
  "health",
  "sleep",
  "hydration",
  "recovery",
  "mood",
  "mindfulness",
  "self-care",
]);

/**
 * Exported so the classification can be tested directly: a goal counts as
 * wellness because of the domain it reads from, never because of how its
 * title sounds.
 */
export const isWellnessDomain = (domain: JourneyDomain) => WELLNESS_DOMAINS.has(domain);

/** Timescales, in the order a person actually meets them. */
const CADENCE_ORDER: { cadence: GoalProgress["goal"]["cadence"]; label: string; note: string }[] = [
  { cadence: "daily", label: "Today", note: "small, and never owed" },
  { cadence: "weekly", label: "This week", note: "a shape across seven days" },
  { cadence: "monthly", label: "This month", note: "a rhythm, not a scorecard" },
  { cadence: "one-time", label: "Long-term milestones", note: "reached once, remembered" },
];

function GoalCard({
  item,
  onClaim,
  busy,
  claimingId,
}: {
  item: GoalProgress;
  onClaim: (id: string) => void;
  busy: boolean;
  claimingId: string | null;
}) {
  const shownTarget = Math.max(item.goal.target, item.progress);
  const claimed = item.claimed;
  const complete = item.complete;
  const tone = DOMAIN_TONE[item.goal.domain] ?? "var(--gold)";
  const isClaiming = claimingId === item.goal.id && busy;

  const state = claimed
    ? "Earned"
    : complete
      ? null
      : item.progress === 0
        ? "Not started yet"
        : `${item.remaining} to go`;

  return (
    <article
      className="pg-goal"
      style={{ ["--goal-tone" as string]: tone }}
      data-complete={complete && !claimed ? "true" : "false"}
      data-claimed={claimed ? "true" : "false"}
    >
      <div className="pg-goal-head">
        <span className="pg-goal-domain">{JOURNEY_DOMAIN_LABELS[item.goal.domain]}</span>
        <span className={cn("pg-goal-value", claimed && "is-muted")}>
          +{formatPoints(item.goal.points)}
          <small>points</small>
        </span>
      </div>

      <h3 className="pg-goal-title">{item.goal.title}</h3>
      <p className="pg-goal-detail">{item.goal.detail}</p>

      <div className="pg-goal-meter">
        <span
          className="pg-rail"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={shownTarget}
          aria-valuenow={item.progress}
          aria-label={item.goal.title}
        >
          <span className="pg-rail-fill" style={{ width: `${Math.round(item.ratio * 100)}%` }} />
        </span>
        <span className="pg-goal-count">
          {item.progress}
          <span className="pg-goal-count-total"> / {shownTarget}</span>
        </span>
      </div>

      <div className="pg-goal-foot">
        {claimed ? (
          <>
            <span className="pg-complete-row">
              <Check width={12} height={12} aria-hidden /> Earned
            </span>
            <span className="pg-goal-length">{item.goal.length}</span>
          </>
        ) : complete ? (
          <>
            <span className="pg-goal-length">Ready</span>
            <button
              type="button"
              className="pg-btn pg-btn-primary"
              onClick={() => onClaim(item.goal.id)}
              disabled={isClaiming}
            >
              {isClaiming ? "Claiming…" : "Claim points"}
            </button>
          </>
        ) : (
          <>
            <span className="pg-goal-state">{state}</span>
            <span className="pg-goal-resets">{item.goal.length}</span>
          </>
        )}
      </div>
    </article>
  );
}

export function GoalsBoard({
  goals,
  onClaim,
  busy,
  claimingId,
  focusGoalId,
}: {
  goals: GoalProgress[];
  onClaim: (id: string) => void;
  busy: boolean;
  claimingId: string | null;
  focusGoalId?: string | null;
}) {
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [sort, setSort] = useState<GoalSort>("recommended");
  const [showAll, setShowAll] = useState(false);

  const domains = useMemo(() => {
    const set = new Set<JourneyDomain>();
    for (const item of goals) set.add(item.goal.domain);
    return [...set];
  }, [goals]);

  const visible = useMemo(() => {
    let list = goals.filter((item) =>
      filter === "all"
        ? true
        : filter === "wellness"
          ? isWellnessDomain(item.goal.domain)
          : item.goal.domain === filter,
    );
    list = [...list].sort((a, b) => {
      // Claimable first, always — that is a completed goal waiting for its points.
      const claimOrder = Number(b.claimable) - Number(a.claimable);
      if (claimOrder !== 0) return claimOrder;
      if (sort === "closest") return b.ratio - a.ratio;
      if (sort === "valuable") return b.goal.points - a.goal.points;
      // recommended: something in motion first, then the body-and-mind goals,
      // then whichever is nearest to paying out
      return (
        Number(b.progress > 0) - Number(a.progress > 0) ||
        Number(isWellnessDomain(b.goal.domain)) - Number(isWellnessDomain(a.goal.domain)) ||
        b.ratio - a.ratio
      );
    });
    return list;
  }, [goals, filter, sort]);

  // Timescales lead the default view. As soon as someone filters or sorts, the
  // board answers that question directly instead of regrouping underneath them.
  const grouped = filter === "all" && sort === "recommended";

  // Grouped, every timescale gets a couple of cards so the shape of the board
  // is honest; filtered or sorted, the list answers that one question. Either
  // way the rest sits behind one quiet disclosure.
  const list = useMemo(() => {
    if (showAll) return visible;
    if (!grouped) return visible.slice(0, 6);
    // Round-robin across the timescales, so "today" never crowds out the
    // long view: one from each, then a second pass, and stop.
    const buckets = CADENCE_ORDER.map(({ cadence }) =>
      visible.filter((item) => item.goal.cadence === cadence),
    );
    const picked: GoalProgress[] = [];
    for (let round = 0; picked.length < 6; round += 1) {
      let added = false;
      for (const bucket of buckets) {
        const item = bucket[round];
        if (!item) continue;
        picked.push(item);
        added = true;
        if (picked.length >= 6) break;
      }
      if (!added) break;
    }
    return picked;
  }, [showAll, grouped, visible]);

  const hidden = visible.length - list.length;

  const cardFor = (item: GoalProgress) => (
    <div
      key={item.goal.id}
      style={
        focusGoalId === item.goal.id
          ? { outline: "1px solid color-mix(in oklab, var(--gold) 45%, transparent)", borderRadius: 20 }
          : undefined
      }
    >
      <GoalCard item={item} onClaim={onClaim} busy={busy} claimingId={claimingId} />
    </div>
  );

  return (
    <div>
      <div className="pg-chip-row" role="group" aria-label="Filter goals by journal">
        <button
          type="button"
          className={cn("pg-chip", filter === "all" && "is-on")}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Everything
        </button>
        <button
          type="button"
          className={cn("pg-chip", filter === "wellness" && "is-on")}
          aria-pressed={filter === "wellness"}
          onClick={() => setFilter("wellness")}
        >
          Wellness
          <span className="pg-chip-count">
            {goals.filter((item) => isWellnessDomain(item.goal.domain)).length}
          </span>
        </button>
        {domains.map((domain) => (
          <button
            key={domain}
            type="button"
            className={cn("pg-chip", filter === domain && "is-on")}
            aria-pressed={filter === domain}
            onClick={() => setFilter(domain)}
          >
            {JOURNEY_DOMAIN_LABELS[domain]}
          </button>
        ))}
      </div>

      <div className="pg-chip-row" role="group" aria-label="Sort goals">
        {(
          [
            ["recommended", "Recommended"],
            ["closest", "Closest"],
            ["valuable", "Most valuable"],
          ] as [GoalSort, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={cn("pg-chip", sort === value && "is-on")}
            aria-pressed={sort === value}
            onClick={() => setSort(value)}
          >
            {label}
          </button>
        ))}
        <span className="pg-goal-note" style={{ alignSelf: "center", marginLeft: "0.4rem" }}>
          <Sparkles width={11} height={11} aria-hidden /> {visible.length} goals in this view
        </span>
      </div>

      {grouped
        ? CADENCE_ORDER.map(({ cadence, label, note }) => {
            const items = list.filter((item) => item.goal.cadence === cadence);
            if (items.length === 0) return null;
            return (
              <section className="pg-group" key={cadence} aria-labelledby={`pg-group-${cadence}`}>
                <div className="pg-group-head">
                  <h3 id={`pg-group-${cadence}`} className="pg-group-title">
                    {label}
                  </h3>
                  <span className="pg-group-count">
                    {items.length} {items.length === 1 ? "goal" : "goals"} · {note}
                  </span>
                </div>
                <div className="pg-goals-grid">
                  {items.map((item) => cardFor(item))}
                </div>
              </section>
            );
          })
        : <div className="pg-goals-grid">{list.map((item) => cardFor(item))}</div>}

      {visible.length === 0 ? (
        <p className="pg-empty">
          No goals in this journal yet — try another one, or just keep doing what you are doing.
        </p>
      ) : null}

      {hidden > 0 ? (
        <div className="pg-pager">
          <button type="button" className="pg-btn pg-btn-quiet" onClick={() => setShowAll(true)}>
            <ChevronDown width={13} height={13} aria-hidden />
            Show {hidden} more {CADENCE_LABELS.monthly === "This month" ? "" : ""}goals
          </button>
        </div>
      ) : null}
    </div>
  );
}
