/**
 * Today's Overview pieces, recomposed to the prototype stack (Reskin
 * slice A). The synthesis in `lib/overview` still makes every decision —
 * these components only present it, in the prototype's arrangement:
 *
 *   · `StatTiles` — the state's headline and lines, then its fact tiles
 *     (Days logged, This week, Day streak, Points when the record
 *     carries a balance): eyebrow label, big tabular serif number,
 *     counting up where the value is one stable integer.
 *   · `ChangesCard` — "What changed": each real delta as its own row —
 *     label, the synthesis's own sentence, and its DeltaPill (colour by
 *     what the direction means, never an invented percentage).
 *
 * Slice A's recomposition retired the old band's priority strip from
 * Today: the prototype stack has one Focus slot and Bloom's assessment
 * card holds it. Every action the priority could name keeps its door in
 * the stack — habit → the habits card, mood → the mood card, metrics →
 * the hero chip, add-habit → the habits card footer, assessment → the
 * FocusCard itself — so nothing the synthesis suggested lost its path.
 * The synthesis still computes the priority; Today no longer renders it.
 */

import type { OverviewSynthesis } from "@/lib/overview/synthesis";
import { CountUp } from "./CountUp";
import { DeltaPill } from "./DeltaPill";

/** A fact whose whole value is one integer earns the count-up tile number. */
const NUMERIC_FACT = /^\d+$/;

/* ------------------------------- stat tiles ------------------------------ */

/**
 * The prototype's StatTiles row, fed by the synthesis's own facts —
 * the same facts the band has always shown (Days logged, This week,
 * Day streak, and Points when the balance is known), each as a glass
 * tile under the state's headline and lines.
 */
export function StatTiles({
  overview,
  ready,
}: {
  overview: OverviewSynthesis;
  /** Latched readiness — while false the tiles hold shaped placeholders. */
  ready: boolean;
}) {
  const { state } = overview;
  return (
    <section
      className="home-rise"
      style={{ animationDelay: "70ms" }}
      aria-label="Your record in numbers"
      aria-busy={!ready}
    >
      {ready ? (
        <>
          <p className="max-w-[62ch] px-1 font-display text-[length:var(--text-body)] italic leading-snug text-muted-foreground">
            {state.headline}
          </p>
          {state.lines.length > 0 ? (
            <ul className="mt-2 space-y-1 px-1">
              {state.lines.map((line) => (
                <li
                  key={line}
                  className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {state.facts.map((fact) => (
              <div key={fact.id} className="home-panel p-5">
                <dt className="home-eyebrow">{fact.label}</dt>
                <dd className="mt-3 font-display text-4xl font-light leading-none tracking-tight tabular-nums text-foreground">
                  {NUMERIC_FACT.test(fact.value) ? (
                    <CountUp value={Number(fact.value)} id={`overview-fact-${fact.id}`} />
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="block h-24 animate-pulse rounded-3xl bg-surface-2/50" />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------ what changed ----------------------------- */

/**
 * The prototype's ChangesCard: "What changed" over the synthesis's own
 * window ("Last 7 days vs the 7 days before" — the page footer's line).
 * Each delta the synthesis earned is a row — its label, its own sentence
 * (numbers and window included), and its DeltaPill. When no delta earned
 * its place, the synthesis's honest note stands instead of a list.
 */
export function ChangesCard({ overview, ready }: { overview: OverviewSynthesis; ready: boolean }) {
  const { changes } = overview;
  return (
    <section
      className="home-panel home-rise flex h-full flex-col p-5 sm:p-7"
      style={{ animationDelay: "150ms" }}
      aria-labelledby="home-changes-title"
      aria-busy={!ready}
    >
      <div>
        <p className="home-eyebrow">What changed</p>
        <h2 id="home-changes-title" className="home-band-title mt-1">
          Momentum, week over week
        </h2>
      </div>
      {ready ? (
        changes.note ? (
          <p className="mt-4 max-w-[46ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {changes.note}
          </p>
        ) : (
          <ul className="mt-5 flex flex-1 flex-col justify-center gap-3">
            {changes.deltas.map((delta) => (
              <li
                key={delta.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-[var(--motion-standard)] hover:border-white/[0.14] hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[length:var(--text-body)] font-medium text-foreground">
                    {delta.label}
                  </span>
                  <DeltaPill id={delta.id} label={delta.label} direction={delta.direction} />
                </div>
                <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                  {delta.sentence}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="mt-5 space-y-3" aria-hidden="true">
          <span className="block h-12 animate-pulse rounded-2xl bg-surface-2/50" />
          <span className="block h-12 animate-pulse rounded-2xl bg-surface-2/50" />
        </div>
      )}
    </section>
  );
}
