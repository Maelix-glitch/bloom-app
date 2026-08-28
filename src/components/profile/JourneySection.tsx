/**
 * Journey — chapters, not KPIs. Stats read as a quiet sentence of numbers,
 * milestones trace down a hairline spine like entries in a keepsake, and the
 * "next" horizon shows honest progress. No cards, no dashboard.
 */

import type { LucideIcon } from "lucide-react";
import { CloudSun, Gift, Sparkles, Star } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/profile/journey";
import type { ActivityTone, BloomAccent, ProfileStats } from "@/lib/profile/types";
import type { ProfileSpaceJourney } from "@/hooks/useProfileSpace";

const TONE_ICON: Record<ActivityTone, LucideIcon> = {
  mood: CloudSun,
  story: Sparkles,
  reward: Gift,
  milestone: Star,
  highlight: Star,
};

export function JourneySection({
  journey,
  accent,
  memberSince,
}: {
  journey: ProfileSpaceJourney;
  accent: BloomAccent;
  memberSince: string | null;
}) {
  if (journey.status === "loading") return <JourneySkeleton />;
  if (journey.status === "error") {
    return (
      <p className="text-center text-[13px] text-muted-foreground">
        Your journey couldn't be read just now.
      </p>
    );
  }

  const { stats, milestones, activity } = journey;
  const hasJourney =
    stats.daysTracked > 0 ||
    stats.checkIns > 0 ||
    stats.rewardsEarned > 0 ||
    milestones.achieved.length > 0;

  return (
    <div className="flex flex-col gap-9">
      {/* stats — typographic line, not tiles */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat label="days tracked" value={stats.daysTracked} accent={accent} />
        <Stat label="check-ins" value={stats.checkIns} accent={accent} />
        <Stat label="day streak" value={stats.streak} accent={accent} />
        <Stat label="rewards earned" value={stats.rewardsEarned} accent={accent} />
      </dl>

      {!hasJourney ? (
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Your Bloom journey will appear here as it grows. Nothing is owed — a single check-in
          starts the record.
        </p>
      ) : (
        /* milestones — a hairline spine of real moments */
        <ol className="relative ml-[5px] flex flex-col gap-0 border-l border-border/70 pl-6">
          {milestones.achieved.map((m, i) => (
            <li key={m.id} className={cn("relative py-2", i === 0 && "pt-0")}>
              <span
                aria-hidden
                className="absolute top-1/2 -left-[calc(1.5rem+4.5px)] size-[7px] -translate-y-1/2 rounded-full"
                style={{
                  background:
                    i === 0
                      ? `color-mix(in oklab, ${accentVar[accent]} 80%, transparent)`
                      : "var(--surface-3)",
                  boxShadow:
                    i === 0
                      ? `0 0 0 3px color-mix(in oklab, ${accentVar[accent]} 14%, transparent)`
                      : undefined,
                }}
              />
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 text-[13.5px] leading-snug">
                  <span className="font-medium">{m.label}</span>
                  <span className="ml-2 text-[12.5px] text-muted-foreground">{m.detail}</span>
                </p>
                <span className="mono shrink-0 text-[10px] tracking-[0.06em] text-faint uppercase">
                  {m.achievedAt ? formatRelativeDay(m.achievedAt) : ""}
                </span>
              </div>
            </li>
          ))}
          {milestones.next && milestones.next.progress < milestones.next.of ? (
            <li className="relative py-2">
              <span
                aria-hidden
                className="absolute top-1/2 -left-[calc(1.5rem+4px)] size-[6px] -translate-y-1/2 rounded-full border"
                style={{ borderColor: "var(--border-strong)", background: "transparent" }}
              />
              <div className="flex items-center justify-between gap-4">
                <p className="mono text-[10px] tracking-[0.06em] text-faint uppercase">
                  next · {milestones.next.label.toLowerCase()}
                </p>
                {milestones.next.of <= 10 ? (
                  <span className="flex items-center gap-[5px]" aria-hidden>
                    {Array.from({ length: milestones.next.of }).map((_, i) => (
                      <span
                        key={i}
                        className="size-[6px] rounded-full transition-colors duration-[var(--motion-slow)]"
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
                  <span className="flex items-center gap-2">
                    <span className="mono text-[10.5px] text-faint">
                      {milestones.next.progress}/{milestones.next.of}
                    </span>
                    <span
                      className="h-[3px] w-16 overflow-hidden rounded-full bg-surface-3"
                      aria-hidden
                    >
                      <span
                        className="block h-full rounded-full transition-[width] duration-[var(--motion-slow)]"
                        style={{
                          width: `${Math.min(100, (milestones.next.progress / Math.max(1, milestones.next.of)) * 100)}%`,
                          background: accentVar[accent],
                          opacity: 0.7,
                        }}
                      />
                    </span>
                  </span>
                )}
              </div>
            </li>
          ) : null}
          <li className="relative py-2">
            <span
              aria-hidden
              className="absolute top-1/2 -left-[calc(1.5rem+3px)] size-[4px] -translate-y-1/2 rounded-full bg-faint"
            />
            <p className="mono text-[10px] tracking-[0.06em] text-faint uppercase">
              today
              {memberSince
                ? ` · since ${new Date(memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
                : ""}
            </p>
          </li>
        </ol>
      )}

      {/* lately */}
      <section aria-label="Recent activity">
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
                <li key={entry.id} className="flex items-start gap-3 py-2.5 transition-colors">
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
                  <span className="mono shrink-0 pt-0.5 text-[10px] tracking-[0.06em] text-faint uppercase">
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
        className={cn(
          "numeric mt-2 text-[32px] leading-none transition-colors duration-[var(--motion-slow)]",
          value === 0 && "text-faint/70",
        )}
        style={{
          color:
            value > 0
              ? `color-mix(in oklab, ${accentVar[accent]} 45%, var(--foreground))`
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
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2.5 w-16 rounded bg-surface-3/70" />
            <div className="h-7 w-10 rounded bg-surface-3/50" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3.5 w-full rounded bg-surface-3/40" />
        ))}
      </div>
    </div>
  );
}
