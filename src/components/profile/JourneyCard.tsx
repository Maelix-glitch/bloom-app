/**
 * Journey — milestones as a shelf of badges (earned bright, the rest
 * outlined), the next one as a progress bar, and what happened lately.
 * Only real events appear; nothing here is decorative.
 */

import {
  CalendarCheck,
  CloudSun,
  Flame,
  Gift,
  NotebookPen,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { ProfileSpaceJourney } from "@/hooks/useProfileSpace";
import { formatRelativeDay } from "@/lib/profile/journey";
import type { ActivityTone, BloomAccent } from "@/lib/profile/types";

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

/** Every milestone the engine knows, in its own order, so locked ones can be shown outlined. */
const ALL_MILESTONES: { id: string; label: string }[] = [
  { id: "first-checkin", label: "First check-in" },
  { id: "first-reflection", label: "First reflection" },
  { id: "days-7", label: "7 days" },
  { id: "days-30", label: "30 days" },
  { id: "first-reward", label: "First reward" },
  { id: "first-story", label: "First story" },
  { id: "first-highlight", label: "First highlight" },
  { id: "checkins-100", label: "100 check-ins" },
];

const TONE_ICON: Record<ActivityTone, LucideIcon> = {
  mood: CloudSun,
  story: Sparkles,
  reward: Gift,
  milestone: Star,
  highlight: Star,
};

export function JourneyCard({
  journey,
  accent: _accent,
  memberSince: _memberSince,
  storyCount: _storyCount,
  onShareMilestone,
}: {
  journey: ProfileSpaceJourney;
  accent: BloomAccent;
  memberSince: string | null;
  storyCount: number;
  onShareMilestone?: ((milestoneId: string) => void) | undefined;
}) {
  if (journey.status === "loading") {
    return (
      <div className="pf-miles" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="pf-mile">
            <div className="pf-skel" style={{ width: 40, height: 40, borderRadius: 999 }} />
            <div className="pf-skel" style={{ width: 56, height: 10 }} />
          </div>
        ))}
      </div>
    );
  }
  if (journey.status === "error") {
    return <p className="text-[12.5px] text-faint">{journey.message}</p>;
  }

  const achieved = new Map(journey.milestones.achieved.map((m) => [m.id, m]));
  const next = journey.milestones.next;
  const earned = ALL_MILESTONES.filter((m) => achieved.has(m.id));
  const locked = ALL_MILESTONES.filter((m) => !achieved.has(m.id));

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="pf-eyebrow">
            {earned.length} of {ALL_MILESTONES.length} milestones
          </p>
        </div>
        <div className="pf-miles" role="list" aria-label="Milestones">
          {[...earned, ...locked].map((m) => {
            const node = MILESTONE_NODE[m.id] ?? { icon: Star, tint: "var(--violet)" };
            const Icon = node.icon;
            const got = achieved.get(m.id);
            const shareable = Boolean(got && onShareMilestone);
            const inner = (
              <>
                <span className="pf-mile-icon" aria-hidden>
                  <Icon className="size-[17px]" strokeWidth={1.8} />
                </span>
                <span className="pf-mile-label">{m.label}</span>
                <span className="pf-mile-date">
                  {shareable
                    ? "tap to share"
                    : got?.achievedAt
                      ? new Date(got.achievedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })
                      : "not yet"}
                </span>
              </>
            );
            return shareable ? (
              <button
                key={m.id}
                type="button"
                role="listitem"
                className="pf-mile"
                style={{ ["--pf-mile-color" as string]: node.tint } as React.CSSProperties}
                title={`Share ${m.label} as a story`}
                aria-label={`Share ${m.label} as a story`}
                onClick={() => onShareMilestone?.(m.id)}
              >
                {inner}
              </button>
            ) : (
              <div
                key={m.id}
                role="listitem"
                className="pf-mile"
                data-locked={!got}
                style={{ ["--pf-mile-color" as string]: node.tint } as React.CSSProperties}
                title={got?.detail}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      {next ? (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="text-muted-foreground">
              Next: <span className="text-foreground">{next.label}</span>
            </span>
            <span className="mono text-[11px] text-faint">
              {next.progress} / {next.of}
            </span>
          </div>
          <div className="pf-progress" aria-hidden>
            <i
              style={{ width: `${Math.min(100, Math.round((next.progress / next.of) * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      {journey.activity.length > 0 ? (
        <div>
          <p className="pf-eyebrow mb-1">Lately</p>
          <div className="pf-activity">
            {journey.activity.slice(0, 6).map((a) => {
              const Icon = TONE_ICON[a.tone];
              return (
                <div key={a.id} className="pf-activity-row">
                  <span className="pf-activity-icon" aria-hidden>
                    <Icon className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{a.text}</span>
                    {a.detail ? (
                      <span className="block truncate text-[11.5px] text-faint">{a.detail}</span>
                    ) : null}
                  </span>
                  <span className="pf-activity-when">{formatRelativeDay(a.at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[12.5px] text-faint">
          Nothing yet — the first mood, story or reward shows up here.
        </p>
      )}
    </div>
  );
}
