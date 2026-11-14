/**
 * The delta pill — a change, coloured by what it means for the person,
 * not by its raw sign.
 *
 * The Overview synthesis reports a direction per delta (up / down / flat /
 * new) but no value judgement: whether "up" is good depends on the metric.
 * That judgement lives here, in one place:
 *
 * · Screen time is the one inverted metric on the page — less is the win,
 *   so its pill runs sage when the direction is down, rose when up.
 * · Every other delta the synthesis emits (mood, sleep, water, study,
 *   movement, energy, habit ticks, days logged) reads the natural way:
 *   more of it is the good direction.
 * · Flat is always the neutral pill, and a series with no earlier week
 *   ("new") is neutral too — there is no change to colour yet.
 *
 * The pill carries the direction word only. The synthesis deliberately
 * speaks its numbers in the sentence beside the pill; inventing a
 * percentage here would need numbers it does not hand over.
 */

import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";

import type { DeltaDirection } from "@/lib/overview/synthesis";
import { cn } from "@/lib/utils";

export type DeltaTone = "sage" | "rose" | "neutral";

/** Delta ids whose good direction is DOWN. Everything else: up is good. */
const DOWN_IS_GOOD = new Set(["tracker-screen"]);

export function deltaTone(id: string, direction: DeltaDirection): DeltaTone {
  if (direction === "flat" || direction === "new") return "neutral";
  const good = DOWN_IS_GOOD.has(id) ? direction === "down" : direction === "up";
  return good ? "sage" : "rose";
}

const TONE_CLASS: Record<DeltaTone, string> = {
  sage: "bg-sage/15 text-sage",
  rose: "bg-rose/15 text-rose",
  neutral: "bg-white/5 text-muted-foreground",
};

const DIRECTION_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
  new: Sparkles,
} as const;

const DIRECTION_WORD: Record<DeltaDirection, string> = {
  up: "Up",
  down: "Down",
  flat: "Same",
  new: "New",
};

export function DeltaPill({
  id,
  label,
  direction,
}: {
  id: string;
  label: string;
  direction: DeltaDirection;
}) {
  const Icon = DIRECTION_ICON[direction];
  const tone = deltaTone(id, direction);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[length:var(--text-micro)] font-medium tabular-nums",
        TONE_CLASS[tone],
      )}
      aria-label={`${label}: ${DIRECTION_WORD[direction].toLowerCase()}`}
    >
      <Icon className="size-3" strokeWidth={2} aria-hidden />
      {DIRECTION_WORD[direction]}
    </span>
  );
}
