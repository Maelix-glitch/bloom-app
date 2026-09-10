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

export type GoalFilter = "all" | JourneyDomain;
export type GoalSort = "closest" | "valuable" | "recommended";

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

  return (
    <article
      className="pg-goal"
      style={{ ["--goal-tone" as string]: tone }}
      data-complete={complete && !claimed ? "true" : "false"}
    >
      <div className="pg-goal-head">
        <span className="pg-goal-domain">{JOURNEY_DOMAIN_LABELS[item.goal.domain]}</span>
        <span className="pg-goal-length">{item.goal.length}</span>
      </div>

      <h3 className="pg-goal-title">{item.goal.title}</h3>
      <p className="pg-goal-detail">{item.goal.detail}</p>

      <div>
        <div className="pg-goal-count">
          <span>
            {item.progress} <span className="pg-goal-count-total">/ {shownTarget}</span>
          </span>
          <span className="pg-goal-count-total">
            {claimed
              ? "Earned"
              : complete
                ? "Ready when you are"
                : item.progress === 0
                  ? "Not started yet"
                  : `${item.remaining} to go`}
          </span>
        </div>
        <span
          className="pg-rail"
          style={{ display: "block", marginTop: "0.5rem" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={shownTarget}
          aria-valuenow={item.progress}
          aria-label={item.goal.title}
        >
          <span
            className="pg-rail-fill"
            style={{ width: `${Math.round(item.ratio * 100)}%` }}
          />
        </span>
      </div>

      <div className="pg-goal-foot">
        <span className={cn("pg-points", claimed && "pg-points-muted")}>
          +{formatPoints(item.goal.points)}
          <small>points</small>
        </span>

        {claimed ? (
          <span className="pg-complete-row">
            <Check width={13} height={13} aria-hidden /> Earned
          </span>
        ) : complete ? (
          <button
            type="button"
            className="pg-btn pg-btn-primary"
            onClick={() => onClaim(item.goal.id)}
            disabled={isClaiming}
          >
            {isClaiming ? "Claiming…" : "Claim points"}
          </button>
        ) : (
          <span className="pg-goal-note">
            {item.goal.cadence === "one-time" ? "In progress" : `Resets each ${
              item.goal.cadence === "daily" ? "day" : item.goal.cadence === "weekly" ? "week" : "month"
            }`}
          </span>
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
    let list = goals.filter((item) => filter === "all" || item.goal.domain === filter);
    list = [...list].sort((a, b) => {
      // Claimable first, always — that is a completed goal waiting for its points.
      const claimOrder = Number(b.claimable) - Number(a.claimable);
      if (claimOrder !== 0) return claimOrder;
      if (sort === "closest") return b.ratio - a.ratio;
      if (sort === "valuable") return b.goal.points - a.goal.points;
      // recommended: real progress first, then value
      return Number(b.progress > 0) - Number(a.progress > 0) || b.ratio - a.ratio;
    });
    return list;
  }, [goals, filter, sort]);

  const collapsedLimit = 6;
  const list = showAll ? visible : visible.slice(0, collapsedLimit);
  const hidden = visible.length - list.length;

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

      <div className="pg-goals-grid">
        {list.map((item) => (
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
        ))}
      </div>

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
