/**
 * Journey — your own record, kept for you. Typography over cards, three
 * small layers: what you've done (stats), what it meant (milestones),
 * and what happened lately (activity). Private by nature — this is an
 * identity space, not an analytics dashboard.
 */

import type { LucideIcon } from "lucide-react";
import { CloudSun, Flag, Gift, NotebookPen, Sparkles, Star } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/profile/journey";
import type { ActivityTone, BloomAccent, ProfileStats } from "@/lib/profile/types";
import type { ProfileSpaceJourney } from "@/hooks/useProfileSpace";

const TONE_ICON: Record<ActivityTone, LucideIcon> = {
  mood: CloudSun,
  story: Sparkles,
  reward: Gift,
  milestone: Flag,
  highlight: Star,
};

export function JourneySection({
  journey,
  accent,
}: {
  journey: ProfileSpaceJourney;
  accent: BloomAccent;
}) {
  if (journey.status === "loading") return <JourneySkeleton />;
  if (journey.status === "error") {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
        Your journey couldn't be read just now.
      </p>
    );
  }

  const { stats, milestones, activity } = journey;

  return (
    <div className="flex flex-col gap-9">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Your Bloom record — kept privately, shown to no one unless you choose.
      </p>

      {/* stats: typographic, not card-y */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat label="Days tracked" value={stats.daysTracked} accent={accent} />
        <Stat label="Check-ins" value={stats.checkIns} accent={accent} />
        <Stat label="Day streak" value={stats.streak} accent={accent} />
        <Stat label="Rewards earned" value={stats.rewardsEarned} accent={accent} />
      </dl>

      <section aria-label="Milestones">
        {milestones.achieved.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border/60">
            {milestones.achieved.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="flex min-w-0 items-baseline gap-2.5">
                  <Flag
                    className="size-3.5 shrink-0 translate-y-[2px]"
                    style={{ color: `color-mix(in oklab, ${accentVar[accent]} 75%, transparent)` }}
                    aria-hidden
                  />
                  <span className="truncate text-[13.5px] font-medium">{m.label}</span>
                </span>
                <span className="mono shrink-0 text-[10.5px] uppercase tracking-[0.06em] text-faint">
                  {m.achievedAt ? formatRelativeDay(m.achievedAt) : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Your Bloom journey will appear here as it grows.
          </p>
        )}
        {milestones.next && milestones.next.progress < milestones.next.of ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                Next · {milestones.next.label}
              </p>
              <p className="mono text-[10px] text-faint">
                {milestones.next.progress}/{milestones.next.of}
              </p>
            </div>
            <div
              className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-surface-3"
              role="presentation"
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.min(100, (milestones.next.progress / Math.max(1, milestones.next.of)) * 100)}%`,
                  background: accentVar[accent],
                  opacity: 0.75,
                }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section aria-label="Recent activity">
        <p className="eyebrow mb-2">Lately</p>
        {activity.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nothing yet — and nothing is owed.</p>
        ) : (
          <ol className="flex flex-col gap-0.5">
            {activity.slice(0, 8).map((entry) => {
              const Icon = TONE_ICON[entry.tone];
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-surface/50"
                >
                  <Icon
                    className="mt-0.5 size-3.5 shrink-0 text-faint"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-foreground">{entry.text}</span>
                    {entry.detail ? (
                      <span
                        className={cn(
                          "mt-0.5 block max-h-[2.6em] overflow-hidden text-[12px] leading-snug text-muted-foreground",
                        )}
                      >
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
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: BloomAccent }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd
        className="numeric mt-1.5 text-[26px] leading-none"
        style={{
          color:
            value > 0
              ? `color-mix(in oklab, ${accentVar[accent]} 88%, var(--foreground))`
              : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function JourneySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden>
      <div className="grid grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2.5 w-16 rounded bg-surface-3/70" />
            <div className="h-6 w-10 rounded bg-surface-3/50" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <NotebookPen className="hidden" aria-hidden />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3.5 w-full rounded bg-surface-3/40" />
        ))}
      </div>
    </div>
  );
}
