/**
 * LevelCard — Today's growth card, the prototype LevelCard's place in the
 * stack (Focus + Level row), built entirely from Bloom's real progression.
 *
 * Every number comes from the same two sources the sidebar points card
 * uses: the shared wallet store for the balance (account number when it
 * can be read, the device total otherwise, a neutral dash while the
 * account read is still out — never a provisional number presented as
 * settled) and `rankFor` / `journeyRanks` in lib/progression/ranks for
 * the rank maths. Bloom's ladder is its own — Seedling, First Bloom,
 * Sprout, Budding, In Bloom … — so the stepper shows a real window of
 * that ladder around the current rank, not the prototype's four names.
 *
 * Progress is stated the way brief v6 §5.1 requires (M-118): the
 * within-level figures from the rank state itself — "465 of 700 toward
 * Sprout" on a labelled meter, and the "points to go" (the rank state's
 * own `remaining`) in gold — never a percent ring. The line under it is
 * the current rank's own affirmation from the ladder. Nothing is
 * hardcoded.
 */

import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";

import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/progression/format";
import { journeyRanks, rankFor } from "@/lib/progression/ranks";
import { cn } from "@/lib/utils";

export interface LevelModel {
  /** The rank the balance currently sits in (Bloom's ladder). */
  rankName: string;
  /** The rank the meter is filling towards. */
  nextName: string;
  /** The current rank's own words, from the ladder. */
  affirmation: string;
  /** Whole percent of the current rank's span covered, 0–100 (meter fill only). */
  pct: number;
  /** Points earned inside the current rank (rankFor's intoRank). */
  intoRank: number;
  /** The current rank's full span in points (rankFor's span). */
  span: number;
  /** Points still needed to reach the next rank. */
  remaining: number;
  /** A window of the real ladder around the current rank, for the stepper. */
  stepper: { name: string; reached: boolean; current: boolean }[];
}

/** Pure rank maths for a balance — the card's derivations, unit-tested. */
export function levelModel(balance: number): LevelModel {
  const state = rankFor(balance);
  const window = journeyRanks(balance, 2, 2);
  /* The prototype's stepper carries four stations; Bloom's window can
     hold five (two behind, current, two ahead) — trim the furthest
     behind first so the current rank and what follows always show. */
  const trimmed = window.length > 4 ? window.slice(window.length - 4) : window;
  return {
    rankName: state.rank.name,
    nextName: state.next.name,
    affirmation: state.rank.affirmation,
    pct: Math.round(state.progress * 100),
    intoRank: state.intoRank,
    span: state.span,
    remaining: state.remaining,
    stepper: trimmed.map((r) => ({
      name: r.name,
      reached: r.tier <= state.rank.tier,
      current: r.tier === state.rank.tier,
    })),
  };
}

export function LevelCard() {
  const wallet = useWallet();
  const model = levelModel(wallet.balance);

  return (
    <section
      className="home-panel home-rise flex h-full flex-col p-5 sm:p-7"
      style={{ animationDelay: "110ms" }}
      aria-labelledby="home-level-title"
      data-testid="home-level-card"
    >
      <div>
        <p className="home-eyebrow">Growth</p>
        <h2 id="home-level-title" className="home-band-title mt-1">
          {wallet.loading ? "Your journey" : `${model.nextName} is next`}
        </h2>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-gold">
          <Sprout className="size-4 shrink-0" aria-hidden />
          <span className="text-[length:var(--text-support)] font-medium">
            {wallet.loading
              ? "Reading your balance…"
              : model.remaining > 0
                ? `${formatPoints(model.remaining)} points to go`
                : "Level reached!"}
          </span>
        </div>

        {/* The labelled meter (brief v6 §5.1): the figure is the
            within-level count from rankFor — intoRank of span toward
            the next rank — never a percentage. The fill is the same
            share, drawn on the house meter curve. */}
        <div className="mt-4">
          <div
            className="meter"
            role="progressbar"
            aria-label={`Progress toward ${model.nextName}`}
            aria-valuemin={0}
            aria-valuemax={wallet.loading ? undefined : model.span}
            aria-valuenow={wallet.loading ? undefined : model.intoRank}
            style={{ "--v": wallet.loading ? "0%" : `${model.pct}%` } as React.CSSProperties}
          />
          <p className="mt-2 text-[length:var(--text-support)] tabular-nums text-muted-foreground">
            {wallet.loading
              ? "Your rank settles once the balance does."
              : `${formatPoints(model.intoRank)} of ${formatPoints(model.span)} toward ${model.nextName}`}
          </p>
        </div>

        <p className="mt-3 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          {wallet.loading ? (
            "Your points and rank appear here once the balance settles."
          ) : (
            <>
              {model.affirmation}{" "}
              <Link
                to="/rewards"
                className="whitespace-nowrap text-gold underline-offset-4 hover:underline"
              >
                Your journey
              </Link>
            </>
          )}
        </p>
      </div>

      {/* The ladder itself: a window of Bloom's real ranks around the
          current one. Each station is a grid cell — dot centred over
          its own full label, the label free to wrap — so no name can
          clip and no dot can drift off its label (M-118). */}
      <div
        className="mt-auto grid pt-6"
        style={{ gridTemplateColumns: `repeat(${model.stepper.length}, minmax(0, 1fr))` }}
        aria-hidden={wallet.loading}
        data-testid="home-level-stepper"
      >
        {model.stepper.map((s, i) => (
          <div key={s.name} className="relative flex flex-col items-center gap-1.5 px-1">
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-1/2 top-[5px] h-px w-full",
                  s.reached ? "bg-gold/50" : "bg-white/10",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative size-2.5 rounded-full",
                s.reached
                  ? "bg-gold shadow-[0_0_12px_rgba(220,192,143,0.7)]"
                  : "border border-white/20 bg-transparent",
              )}
            />
            <span
              className={cn(
                "w-full text-center text-[length:var(--text-micro)] leading-tight tracking-wide",
                s.current ? "text-gold" : "text-muted-foreground",
              )}
            >
              {s.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
