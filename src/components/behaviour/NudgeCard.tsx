/**
 * Behaviour Change (System 8) — the one gentle nudge on Today.
 *
 * Renders only when the right-moment engine (lib/behaviour/engine.ts)
 * found a pattern in the real record worth naming — most mornings it
 * renders nothing at all, and the Today stack is exactly as it was.
 * When it does speak, it says one thing (plus one quiet "also" line),
 * names its evidence, and offers the real action: ticking the habit
 * ticks the habit, the mood button opens the composer, the rest lead
 * to the surface where the thing is done. Snooze hides it for today;
 * Dismiss rests that whole kind of nudge for three days.
 */

import { Link } from "@tanstack/react-router";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { Button } from "@/components/ui/button";
import { useNudge } from "@/hooks/useNudge";
import type { Nudge } from "@/lib/behaviour/engine";
import type { Habit, HabitLog } from "@/lib/home/habits";
import type { MoodEntry } from "@/lib/mood/types";

export interface NudgeCardProps {
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  moodEntries: readonly MoodEntry[];
  /** Local day key for today. */
  today: string;
  /** The page's ticking clock. */
  now: Date;
  /** Latched settled flag — no nudges from a half-loaded record. */
  ready: boolean;
  /** Tick (or untick) a habit — the page's own habits store action. */
  onToggleHabit: (habitId: string) => void;
  /** Open the mood composer — the page's own mood flow. */
  onOpenMood: () => void;
}

function ActionButton({
  nudge,
  onToggleHabit,
  onOpenMood,
}: {
  nudge: Nudge;
  onToggleHabit: (habitId: string) => void;
  onOpenMood: () => void;
}) {
  const action = nudge.action;
  if (action.kind === "toggle-habit") {
    return (
      <Button type="button" size="sm" onClick={() => onToggleHabit(action.habitId)}>
        {nudge.actionLabel}
      </Button>
    );
  }
  if (action.kind === "open-mood") {
    return (
      <Button type="button" size="sm" onClick={onOpenMood}>
        {nudge.actionLabel}
      </Button>
    );
  }
  return (
    <Button type="button" size="sm" asChild>
      <Link to={action.kind === "open-trackers" ? "/trackers" : "/nutrition"}>
        {nudge.actionLabel}
      </Link>
    </Button>
  );
}

export function NudgeCard(props: NudgeCardProps) {
  const { onToggleHabit, onOpenMood } = props;
  const { primary, secondary, dismiss, snooze } = useNudge(props);

  if (!primary) return null;

  return (
    <section className="home-band" aria-labelledby="home-nudge-title">
      <div className="flex items-start gap-3 px-2 pb-3 pt-2">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"
        >
          <BloomIcon name="sprout" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="home-eyebrow">A gentle nudge</p>
          <h2 id="home-nudge-title" className="home-band-title mt-1">
            {primary.title}
          </h2>
          <p className="mt-1 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {primary.detail}
          </p>
          {secondary ? (
            <p className="mt-2 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              Also: {secondary.title.charAt(0).toLowerCase()}
              {secondary.title.slice(1)}.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ActionButton nudge={primary} onToggleHabit={onToggleHabit} onOpenMood={onOpenMood} />
            <Button type="button" size="sm" variant="secondary" onClick={() => snooze(primary)}>
              Snooze
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => dismiss(primary)}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
