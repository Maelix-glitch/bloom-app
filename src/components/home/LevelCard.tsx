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
 * The ring is the share of the CURRENT rank's span the balance has
 * covered (intoRank / span — the RailPointsCard rule), the "points to
 * go" is the rank state's own `remaining`, and the line under it is the
 * current rank's own affirmation from the ladder. Nothing is hardcoded.
 */

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";

import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/progression/format";
import { journeyRanks, rankFor } from "@/lib/progression/ranks";
import { CountUp } from "./CountUp";
import { cn } from "@/lib/utils";

export interface LevelModel {
  /** The rank the balance currently sits in (Bloom's ladder). */
  rankName: string;
  /** The rank the ring is filling towards. */
  nextName: string;
  /** The current rank's own words, from the ladder. */
  affirmation: string;
  /** Whole percent of the current rank's span covered, 0–100. */
  pct: number;
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
    remaining: state.remaining,
    stepper: trimmed.map((r) => ({
      name: r.name,
      reached: r.tier <= state.rank.tier,
      current: r.tier === state.rank.tier,
    })),
  };
}

/** The prototype's gradient ring, in Bloom's gold: track, gradient arc, centre slot. */
function GoldRing({
  value,
  size = 132,
  stroke = 9,
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--gold-soft)" />
            <stop offset="100%" stopColor="var(--gold-deep)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{
            transition: "stroke-dashoffset 1.4s cubic-bezier(0.2,0.7,0.2,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
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
          {wallet.loading ? "Your journey" : `On the way to ${model.nextName}`}
        </h2>
      </div>

      <div className="mt-6 flex flex-1 items-center gap-6">
        <GoldRing value={wallet.loading ? 0 : model.pct / 100}>
          <div className="text-center">
            <div className="font-display text-3xl font-light leading-none tabular-nums">
              {wallet.loading ? (
                "—"
              ) : (
                <>
                  <CountUp value={model.pct} id="level-pct" />
                  <span className="text-base text-muted-foreground">%</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-wide)] text-muted-foreground">
              there
            </div>
          </div>
        </GoldRing>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-rose">
            <Sprout className="size-4 shrink-0" aria-hidden />
            <span className="text-[length:var(--text-support)] font-medium">
              {wallet.loading
                ? "Reading your balance…"
                : model.remaining > 0
                  ? `${formatPoints(model.remaining)} points to go`
                  : "Level reached!"}
            </span>
          </div>
          <p className="mt-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {wallet.loading ? (
              "Your rank settles once the balance does."
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
      </div>

      {/* The ladder itself: a window of Bloom's real ranks around the
          current one — gold where reached, the current name in gold. */}
      <div className="mt-6 flex items-start" aria-hidden={wallet.loading}>
        {model.stepper.map((s, i) => (
          <div key={s.name} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "size-2.5 rounded-full",
                  s.reached
                    ? "bg-gold shadow-[0_0_12px_rgba(220,192,143,0.7)]"
                    : "border border-white/20 bg-transparent",
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap text-[length:var(--text-micro)] tracking-wide",
                  s.current ? "text-gold" : "text-muted-foreground",
                )}
              >
                {s.name}
              </span>
            </div>
            {i < model.stepper.length - 1 ? (
              <div
                className={cn(
                  "mx-1 mt-[5px] h-px flex-1",
                  model.stepper[i + 1]?.reached ? "bg-gold/50" : "bg-white/10",
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
