/**
 * Personal rewards — private deliveries published to this account by Bloom
 * admins in the original flow. Kept at the end of the journey, unchanged in
 * meaning: these are yours already, and they stay claimable.
 */

import { useState } from "react";
import { Check, Gift } from "lucide-react";

import { useLegacyRewards } from "@/lib/rewards/legacy";
import { playRewardSound } from "@/lib/rewards/audio";

export function LegacyRewards() {
  const { loading, items, claim } = useLegacyRewards();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  if (loading || items.length === 0) return null;

  return (
    <section className="pg-section" aria-labelledby="pg-legacy-title">
      <div className="pg-section-head">
        <div className="pg-section-head-left">
          <p className="pg-eyebrow">
            <span className="pg-eyebrow-rule" aria-hidden />
            Sent just to you
          </p>
          <h2 id="pg-legacy-title" className="pg-section-title">
            Personal rewards
          </h2>
        </div>
        <p className="pg-section-aside">Rewards published privately to your account.</p>
      </div>
      <ul className="pg-history" style={{ listStyle: "none", margin: 0 }}>
        {items.map((item) => {
          const claimed = item.delivery_state === "claimed";
          return (
            <li key={item.id} className="pg-history-row" style={{ alignItems: "center" }}>
              <span className="pg-history-date">
                {item.publish_at
                  ? new Date(item.publish_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  : "Published"}
              </span>
              <span className="pg-history-title">
                {item.title}
                <span className="pg-history-source">{item.reward_type}</span>
              </span>
              {claimed ? (
                <span className="pg-complete-row">
                  <Check width={13} height={13} aria-hidden /> Claimed
                </span>
              ) : (
                <button
                  type="button"
                  className="pg-btn pg-btn-quiet"
                  disabled={claimingId === item.id}
                  onClick={async () => {
                    setClaimingId(item.id);
                    const result = await claim(item.id);
                    setClaimingId(null);
                    if (result.ok) playRewardSound("claim");
                  }}
                >
                  <Gift width={13} height={13} aria-hidden />
                  {claimingId === item.id ? "Opening…" : "Open reward"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
