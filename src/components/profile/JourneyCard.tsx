/**
 * Your Bloom journey — a single honest line of time. The streak rides at
 * the start of the line, real milestones sit on nodes, "today" closes it.
 * "View full journey" unfolds the quieter record: the next horizon and
 * what happened lately. Only real events appear.
 */

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  ChevronRight,
  CloudSun,
  Flame,
  Gift,
  NotebookPen,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

import { accentVar, CountUp } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/profile/journey";
import type { ActivityTone, BloomAccent, Milestone } from "@/lib/profile/types";
import type { ProfileSpaceJourney } from "@/hooks/useProfileSpace";

const MILESTONE_NODE: Record<string, { icon: LucideIcon; tint: string }> = {
  "first-checkin": { icon: CalendarCheck, tint: "var(--sage)" },
  "first-reflection": { icon: NotebookPen, tint: "var(--sky)" },
  "days-7": { icon: Flame, tint: "var(--amber)" },
  "days-30": { icon: Trophy, tint: "var(--violet)" },
  "first-reward": { icon: Gift, tint: "var(--violet)" },
  "first-story": { icon: Sparkles, tint: "var(--rose)" },
  "first-highlight": { icon: Star, tint: "var(--amber)" },
  "checkins-100": { icon: CalendarCheck, tint: "var(--sky)" },
};

const TONE_ICON: Record<ActivityTone, LucideIcon> = {
  mood: CloudSun,
  story: Sparkles,
  reward: Gift,
  milestone: Star,
  highlight: Star,
};

export function JourneyCard({
  journey,
  accent,
  memberSince,
  storyCount,
}: {
  journey: ProfileSpaceJourney;
  accent: BloomAccent;
  memberSince: string | null;
  storyCount: number;
}) {
  const [open, setOpen] = useState(false);

  if (journey.status === "loading") {
    return (
      <div className="flex animate-pulse items-center gap-6 py-6" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="size-9 rounded-full bg-surface-3/50" />
        ))}
        <div className="h-3 flex-1 rounded bg-surface-3/40" />
      </div>
    );
  }
  if (journey.status === "error") {
    return (
      <p className="py-4 text-center text-[13px] text-muted-foreground">
        Your journey couldn't be read just now.
      </p>
    );
  }

  const { stats, milestones, activity } = journey;
  const achieved = milestones.achieved;
  const hasAny = achieved.length > 0 || stats.daysTracked > 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/40 p-5 sm:p-6">
      {hasAny ? (
        <div className="no-scrollbar overflow-x-auto pb-1">
          <ol className="relative flex min-w-full items-start gap-0">
            {/* gradient connector line */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-[26px] right-[26px] top-[17px] h-[2px] rounded-full opacity-70"
              style={{
                background: "linear-gradient(135deg, var(--violet), var(--sky) 52%, var(--amber))",
              }}
            />
            {/* streak origin */}
            <li className="relative z-[1] flex w-[110px] shrink-0 flex-col items-center text-center">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full border-2 bg-background",
                  stats.streak > 0 ? "border-amber/70 text-amber" : "border-border text-faint",
                )}
              >
                <Flame className="size-4" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="numeric mt-2 text-[15px] leading-none">
                {stats.streak > 0 ? <CountUp value={stats.streak} decimals={0} /> : "—"}
              </span>
              <span className="mono mt-1 text-[9px] uppercase tracking-[0.08em] text-faint">
                day {stats.streak > 1 ? "streak" : "streak"}
              </span>
            </li>
            {achieved.map((m) => {
              const node = MILESTONE_NODE[m.id] ?? { icon: Star, tint: accentVar[accent] };
              const Icon = node.icon;
              return (
                <li
                  key={m.id}
                  className="relative z-[1] flex w-[110px] shrink-0 flex-col items-center text-center"
                >
                  <span
                    className="grid size-9 place-items-center rounded-full border-2 bg-background"
                    style={{ borderColor: node.tint, color: node.tint }}
                  >
                    <Icon className="size-4" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="mt-2 line-clamp-1 text-[11.5px] font-medium text-foreground">
                    {m.label}
                  </span>
                  <span className="mono mt-0.5 text-[9px] uppercase tracking-[0.06em] text-faint">
                    {m.achievedAt ? formatRelativeDay(m.achievedAt) : ""}
                  </span>
                </li>
              );
            })}
            <li className="relative z-[1] flex w-[110px] shrink-0 flex-col items-center text-center">
              <span
                className="grid size-9 place-items-center rounded-full border-2 bg-background"
                style={{
                  borderColor: "color-mix(in oklab, var(--amber) 80%, transparent)",
                  color: "var(--amber)",
                  boxShadow: "0 0 0 5px color-mix(in oklab, var(--amber) 10%, transparent)",
                }}
              >
                <Star className="size-4 fill-current" strokeWidth={0} aria-hidden />
              </span>
              <span className="mt-2 text-[11.5px] font-medium text-foreground">Today</span>
              <span className="mono mt-0.5 text-[9px] uppercase tracking-[0.06em] text-faint">
                {memberSince
                  ? `since ${new Date(memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
                  : "now"}
              </span>
            </li>
          </ol>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <p className="display text-[16px]">Your Bloom journey will appear here as it grows.</p>
          <p className="text-[12.5px] text-muted-foreground">
            Nothing is owed. A single check-in starts the line.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mono mx-auto mt-4 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
      >
        {open ? "Less" : "View full journey"}
        <ChevronRight
          className={cn(
            "size-3 transition-transform duration-[var(--motion-med)]",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Mini label="days tracked" value={stats.daysTracked} />
            <Mini label="check-ins" value={stats.checkIns} />
            <Mini label="rewards" value={stats.rewardsEarned} />
            <Mini
              label="stories"
              value={
                milestones.achieved.filter((m) => m.id === "first-story").length +
                activity.filter((a) => a.tone === "story").length
              }
            />
          </dl>

          {milestones.next && milestones.next.progress < milestones.next.of ? (
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="mono text-[10px] uppercase tracking-[0.06em] text-faint">
                next · {milestones.next.label.toLowerCase()}
              </p>
              {milestones.next.of <= 10 ? (
                <span className="flex items-center gap-[5px]" aria-hidden>
                  {Array.from({ length: milestones.next.of }).map((_, i) => (
                    <span
                      key={i}
                      className="size-[6px] rounded-full"
                      style={{
                        background:
                          i < milestones.next!.progress
                            ? `color-mix(in oklab, ${accentVar[accent]} 85%, transparent)`
                            : "var(--surface-3)",
                      }}
                    />
                  ))}
                </span>
              ) : (
                <span className="mono text-[10px] text-faint">
                  {milestones.next.progress}/{milestones.next.of}
                </span>
              )}
            </div>
          ) : null}

          <p className="eyebrow mb-1">Lately</p>
          {activity.length === 0 ? (
            <p className="py-2 text-[13px] text-muted-foreground">
              Nothing yet — and nothing is owed.
            </p>
          ) : (
            <ol className="flex flex-col divide-y divide-border/50">
              {activity.slice(0, 7).map((entry) => {
                const Icon = TONE_ICON[entry.tone];
                return (
                  <li key={entry.id} className="flex items-start gap-3 py-2.5">
                    <Icon
                      className="mt-0.5 size-3.5 shrink-0 text-faint"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-foreground">{entry.text}</span>
                      {entry.detail ? (
                        <span className="mt-0.5 block max-h-[2.6em] overflow-hidden text-[12px] leading-snug text-muted-foreground">
                          {entry.detail}
                        </span>
                      ) : null}
                    </span>
                    <span className="mono shrink-0 pt-0.5 text-[10px] uppercase tracking-[0.06em] text-faint">
                      {formatRelativeDay(entry.at)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={cn("numeric mt-1 text-[18px] leading-none", value === 0 && "text-faint")}>
        {value}
      </dd>
    </div>
  );
}
