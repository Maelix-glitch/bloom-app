/**
 * Point Activity and the Milestone Archive.
 *
 * Both read one thing: the real award ledger. If an entry is here, points
 * actually moved — there are no placeholder rows, no estimated dates and no
 * fabricated events. Deliberately quiet visually: the journey leads, the
 * receipts follow.
 */

import { ArrowUpRight } from "lucide-react";

import { POINT_SOURCE_LABELS } from "@/lib/progression/types";
import type { PointEntry, PointSource, RankEvent } from "@/lib/progression/types";
import { formatPoints, formatShortDate, relativeDay } from "@/lib/progression/format";
import { Emblem } from "./Emblem";

export function PointActivity({
  ledger,
  today,
  limit = 8,
}: {
  ledger: PointEntry[];
  today: string;
  limit?: number;
}) {
  const rows = ledger.slice(0, limit);
  if (rows.length === 0) {
    return (
      <p className="pg-empty">
        Nothing has been awarded yet — your first verified goal will appear here with its real date
        and amount. Points never change quietly.
      </p>
    );
  }
  return (
    <div className="pg-history">
      {rows.map((entry) => (
        <div key={entry.id} className="pg-history-row">
          <span className="pg-history-date">{relativeDay(entry.at.slice(0, 10), today)}</span>
          <span className="pg-history-title">
            {entry.title}
            <span className="pg-history-source">
              {POINT_SOURCE_LABELS[entry.source as PointSource] ?? "Milestone"}
            </span>
          </span>
          <span className="pg-history-points">
            {entry.points > 0 ? `+${formatPoints(entry.points)}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Ranks reached + every milestone, newest first. */
export function MilestoneArchive({
  ledger,
  ranks,
  today,
  limit = 12,
}: {
  ledger: PointEntry[];
  ranks: RankEvent[];
  today: string;
  limit?: number;
}) {
  type Row = {
    id: string;
    at: string;
    title: string;
    sub: string;
    points: number | null;
    emblem: string;
    tone: string;
    kind: "rank" | "goal" | "achievement";
  };

  const rows: Row[] = [
    ...ranks.map((event) => ({
      id: `rank-${event.tier}`,
      at: event.at,
      title: `Reached ${event.name}`,
      sub: "Rank",
      points: event.atPoints > 0 ? event.atPoints : null,
      emblem: "bloom",
      tone: "var(--violet)",
      kind: "rank" as const,
    })),
    ...ledger
      .filter((entry) => entry.kind !== "rank")
      .map((entry) => ({
        id: entry.id,
        at: entry.at,
        title: entry.kind === "achievement" ? `Earned ${entry.title}` : entry.title,
        sub: entry.kind === "achievement" ? "Achievement" : POINT_SOURCE_LABELS[entry.source as PointSource] ?? "Milestone",
        points: entry.points > 0 ? entry.points : null,
        emblem: entry.kind === "achievement" ? "flourish" : "sprout",
        tone: "var(--gold)",
        kind: entry.kind,
      })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="pg-empty">
        This is where your journey will be readable at a glance — every rank you reach, every
        milestone you finish. Nothing has happened yet, and there is no hurry.
      </p>
    );
  }

  return (
    <ol className="pg-history" style={{ listStyle: "none", margin: 0 }}>
      {rows.map((row) => (
        <li key={row.id} className={`pg-history-row${row.kind === "rank" ? " pg-history-rank" : ""}`}>
          <span className="pg-history-date">{formatShortDate(row.at)}</span>
          <span className="pg-history-title" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ color: row.tone, display: "inline-flex" }} aria-hidden>
              <Emblem id={row.emblem} size={18} strokeWidth={1.6} />
            </span>
            <span>
              {row.title}
              <span className="pg-history-source">{row.sub}</span>
            </span>
          </span>
          <span className="pg-history-points">
            {row.kind === "rank"
              ? row.points !== null
                ? `${formatPoints(row.points)} pts`
                : "Reached"
              : row.points !== null
                ? `+${formatPoints(row.points)}`
                : "Earned"}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The quiet footer link into the Atelier (the secondary layer). Rendered as
 * plain content so the caller can wrap it in the router's <Link> without
 * nesting anchors.
 */
export function AtelierLinkContent() {
  return (
    <>
      Your Bloom Atelier — looks opened by your ranks
      <ArrowUpRight width={13} height={13} aria-hidden />
    </>
  );
}
