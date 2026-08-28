/**
 * Stats strip — the four honest numbers, presented as warm little
 * collectibles rather than dashboard tiles. Values count up gently.
 */

import { CalendarDays, CheckCircle2, Flame, Gift } from "lucide-react";

import { CountUp } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import type { ProfileStats } from "@/lib/profile/types";

const TILES = [
  { key: "daysTracked", label: "Days tracked", icon: CalendarDays, tint: "var(--violet)" },
  { key: "checkIns", label: "Check-ins", icon: CheckCircle2, tint: "var(--sky)" },
  { key: "streak", label: "Day streak", icon: Flame, tint: "var(--amber)" },
  { key: "rewardsEarned", label: "Rewards", icon: Gift, tint: "var(--sage)" },
] as const;

export function StatsStrip({ stats, loading }: { stats: ProfileStats | null; loading: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-[color-mix(in_oklab,var(--border)_55%,transparent)]",
        "sm:grid-cols-4",
      )}
    >
      {TILES.map(({ key, label, icon: Icon, tint }) => {
        const value = stats ? stats[key] : 0;
        return (
          <div
            key={key}
            className="flex items-center justify-center gap-3 bg-surface/70 px-3 py-4 transition-colors duration-[var(--motion-med)] hover:bg-surface-2/50"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full"
              style={{
                background: `color-mix(in oklab, ${tint} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${tint} 30%, transparent)`,
                color: tint,
              }}
            >
              <Icon className="size-[16px]" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 text-left leading-tight">
              <span
                className={cn(
                  "numeric block text-[21px]",
                  (loading || value === 0) && "text-faint",
                )}
              >
                {loading ? "·" : <CountUp value={value} decimals={0} />}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">{label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
