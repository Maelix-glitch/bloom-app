/**
 * Achievements — the collectible layer. Earned ones glow and carry their real
 * date; the rest state their condition plainly and how close they are. Rarity
 * appears only where it means something (a month of work, a signature feat).
 */

import { useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";

import { ACHIEVEMENT_RARITY_LABELS } from "@/lib/progression/types";
import type { AchievementState } from "@/lib/progression/types";
import { formatShortDate } from "@/lib/progression/format";
import { sortByEarned } from "@/lib/progression/achievements";
import { Emblem } from "./Emblem";
import { cn } from "@/lib/utils";

const RARITY_ORDER = ["notable", "rare", "signature"] as const;

export function AchievementGallery({
  achievements,
  limit = 6,
}: {
  achievements: AchievementState[];
  limit?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const ordered = sortByEarned(achievements);
  const earned = ordered.filter((a) => a.unlocked);
  const list = showAll ? ordered : [...earned, ...ordered.filter((a) => !a.unlocked)].slice(0, Math.max(limit, earned.length));

  return (
    <div>
      <div className="pg-ach-grid">
        {list.map((state) => {
          const { def } = state;
          return (
            <article
              key={def.id}
              className={cn("pg-ach", RARITY_ORDER.includes(def.rarity) && "pg-ach-tinted")}
              data-earned={state.unlocked ? "true" : "false"}
              style={{ ["--ach-tone" as string]: def.tone }}
            >
              <span className="pg-ach-mark" aria-hidden>
                {state.unlocked ? (
                  <Emblem id={def.emblem} size={26} strokeWidth={1.5} />
                ) : (
                  <Lock width={16} height={16} strokeWidth={1.5} />
                )}
              </span>
              <span className="pg-ach-copy">
                <span className="pg-ach-title">
                  {def.title}
                  {def.rarity !== "notable" ? (
                    <span className="pg-rarity" data-rarity={def.rarity}>
                      {ACHIEVEMENT_RARITY_LABELS[def.rarity]}
                    </span>
                  ) : null}
                </span>
                <span className="pg-ach-condition">{def.condition}</span>
                {state.unlocked && state.achievedAt ? (
                  <span className="pg-ach-date">
                    <Check
                      width={11}
                      height={11}
                      aria-hidden
                      style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }}
                    />
                    Earned {formatShortDate(state.achievedAt)}
                  </span>
                ) : null}
                {!state.unlocked ? (
                  <span className="pg-ach-date">
                    {state.progress} / {def.target} — still ahead
                  </span>
                ) : null}
                {state.unlocked && !state.achievedAt ? (
                  <span className="pg-ach-date">
                    <Check
                      width={11}
                      height={11}
                      aria-hidden
                      style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }}
                    />
                    Earned
                  </span>
                ) : null}
                {state.unlocked ? <span className="pg-ach-line">{def.earnedLine}</span> : null}
              </span>
            </article>
          );
        })}
      </div>

      {list.length < ordered.length ? (
        <div className="pg-pager">
          <button type="button" className="pg-btn pg-btn-quiet" onClick={() => setShowAll(true)}>
            <ChevronDown width={13} height={13} aria-hidden />
            Show all {ordered.length} achievements
          </button>
        </div>
      ) : null}
    </div>
  );
}
