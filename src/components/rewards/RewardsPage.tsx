import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  Gift,
  LockKeyhole,
  MessageCircleHeart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import crownCrest from "@/assets/crown-crest.png";
import { BloomHeader } from "@/components/BloomHeader";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { RewardClaimCinematic, type RewardReveal } from "@/components/rewards/RewardClaimCinematic";
import { useRewardsSystem, type UserReward } from "@/hooks/useRewardsSystem";
import { playRewardSound, setRewardAudioMuted } from "@/lib/rewards/audio";
import { cn } from "@/lib/utils";

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toReveal(reward: UserReward): RewardReveal {
  return {
    title: reward.title,
    description: reward.description,
    imageUrl: reward.image_url,
    rewardType: reward.reward_type,
    valueDetails: reward.value_details,
  };
}

function RewardImage({ reward, large = false }: { reward: UserReward; large?: boolean }) {
  return reward.image_url ? (
    <img
      src={reward.image_url}
      alt=""
      className={cn(
        "reward-delivery-image object-contain",
        large ? "reward-delivery-image-large" : "",
      )}
    />
  ) : (
    <span
      className={cn(
        "reward-delivery-image-fallback",
        large ? "reward-delivery-image-fallback-large" : "",
      )}
    >
      <Gift className={large ? "size-10" : "size-6"} />
    </span>
  );
}

function RewardCard({ reward, onOpen }: { reward: UserReward; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        playRewardSound("open");
        onOpen();
      }}
      className="reward-delivery-card group text-left"
      style={{ "--reward-delivery-accent": "var(--gold)" } as CSSProperties}
    >
      <span className="reward-delivery-card-shine" aria-hidden />
      <span className="reward-delivery-card-line" aria-hidden />
      <span className="reward-delivery-card-media">
        <RewardImage reward={reward} />
      </span>
      <span className="reward-delivery-card-copy">
        <span className="reward-delivery-card-meta">
          <span className="reward-delivery-status">
            <span /> {reward.delivery_state === "claimed" ? "Claimed" : "Available"}
          </span>
          <span>{reward.reward_type}</span>
        </span>
        <span className="reward-delivery-title">{reward.title}</span>
        <span className="reward-delivery-description">
          {reward.description || "A personal message from Bloom."}
        </span>
        <span className="reward-delivery-card-footer">
          <span>{reward.delivery_state === "claimed" ? "View reward details" : "Open reward"}</span>
          <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

function RewardDetails({
  reward,
  onClose,
  onClaim,
  claiming,
}: {
  reward: UserReward;
  onClose: () => void;
  onClaim: () => void;
  claiming: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const publishedOn = formatDate(reward.publish_at);
  const expiresOn = formatDate(reward.expires_at);
  const claimedOn = formatDate(reward.claimed_at);

  return (
    <div
      className="reward-delivery-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        className="reward-delivery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-detail-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="reward-delivery-modal-close"
          aria-label="Close reward details"
        >
          <X className="size-4" />
        </button>
        <div className="reward-delivery-modal-layout">
          <div className="reward-delivery-modal-art">
            <div className="reward-delivery-modal-art-halo" />
            <RewardImage reward={reward} large />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="reward-delivery-status">
                <span />{" "}
                {reward.delivery_state === "claimed" ? "Claimed reward" : "Available reward"}
              </span>
              <span className="mono text-[9px] uppercase tracking-[0.1em] text-faint">
                {reward.reward_type}
              </span>
            </div>
            <h2 id="reward-detail-title" className="display mt-4 text-[32px] leading-tight">
              {reward.title}
            </h2>
            {reward.description ? (
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {reward.description}
              </p>
            ) : null}
            {reward.admin_message ? (
              <div className="reward-delivery-message mt-5">
                <MessageCircleHeart className="size-4" />
                <p>{reward.admin_message}</p>
              </div>
            ) : null}
            {reward.value_details ? (
              <div className="reward-delivery-value mt-5">
                <p className="eyebrow">Details</p>
                <p className="mt-1 text-[13px] text-foreground">{reward.value_details}</p>
              </div>
            ) : null}
            <div className="reward-delivery-dates mt-5">
              <span>
                <CalendarClock className="size-3.5 text-sky" />{" "}
                {publishedOn ? `Published ${publishedOn}` : "Published to you"}
              </span>
              {expiresOn ? (
                <span>
                  <Clock3 className="size-3.5 text-amber" /> Expires {expiresOn}
                </span>
              ) : null}
              {claimedOn ? (
                <span>
                  <Check className="size-3.5 text-sage" /> Claimed {claimedOn}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="reward-delivery-modal-footer">
          {reward.delivery_state === "published" ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              className="reward-primary-button"
            >
              <Sparkles className="size-4" /> {claiming ? "Securing reward…" : "Claim reward"}
            </button>
          ) : (
            <span className="reward-delivery-claimed-note">
              <Check className="size-4" /> This reward is safely recorded in your account.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyRewardsState({ isAdmin, onRetry }: { isAdmin: boolean; onRetry: () => void }) {
  return (
    <section className="reward-empty-state" aria-labelledby="empty-rewards-title">
      <div className="reward-empty-state-glow" aria-hidden />
      <div className="reward-empty-state-orbit reward-empty-state-orbit-one" aria-hidden />
      <div className="reward-empty-state-orbit reward-empty-state-orbit-two" aria-hidden />
      <div className="reward-empty-state-seal">
        <img src={crownCrest} alt="" />
        <span>
          <LockKeyhole className="size-4" />
        </span>
      </div>
      <p className="eyebrow mt-8 flex items-center justify-center gap-2">
        <span className="reward-live-dot">
          <span />
        </span>{" "}
        Personal reward vault
      </p>
      <h1
        id="empty-rewards-title"
        className="display mt-4 text-[38px] leading-[1.03] sm:text-[52px]"
      >
        No rewards yet.
      </h1>
      <p className="mx-auto mt-4 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground">
        Your rewards will appear here when something special is made available to you.
      </p>
      <div className="reward-empty-state-rule" aria-hidden>
        <span />
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onRetry} className="reward-secondary-button">
          <RefreshCw className="size-3.5" /> Check again
        </button>
        <Link to="/" className="reward-text-button">
          Back to Mood Intelligence <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="reward-empty-state-foot">
        <ShieldCheck className="size-3.5 text-sage" /> Rewards are curated privately by Bloom
        administrators.
      </div>
      {isAdmin ? (
        <Link to="/admin/rewards" className="reward-admin-link mt-6">
          Open admin reward panel <ArrowUpRight className="size-3.5" />
        </Link>
      ) : null}
    </section>
  );
}

export function RewardsPage() {
  const rewardSystem = useRewardsSystem();
  const { rewards, loading, error, isAdmin, claimReward, reload } = rewardSystem;
  const [activeReward, setActiveReward] = useState<UserReward | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [cinematicReward, setCinematicReward] = useState<UserReward | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    try {
      const savedSound = window.localStorage.getItem("bloom-reward-sound");
      if (savedSound === "off") setSoundEnabled(false);
    } catch {
      // Sound preference is optional and never blocks the reward vault.
    }
  }, []);

  useEffect(() => {
    setRewardAudioMuted(!soundEnabled);
    try {
      window.localStorage.setItem("bloom-reward-sound", soundEnabled ? "on" : "off");
    } catch {
      // Private browsing may deny local storage; audio still works for this session.
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const claimActiveReward = async () => {
    if (!activeReward || activeReward.delivery_state !== "published") return;
    setClaiming(true);
    try {
      await claimReward(activeReward.id);
      setActiveReward(null);
      setCinematicReward(activeReward);
      playRewardSound("charge");
    } catch {
      // The hook exposes the backend error; no cinematic is shown on failure.
    } finally {
      setClaiming(false);
    }
  };

  const finishCinematic = () => {
    if (!cinematicReward) return;
    setToast(`${cinematicReward.title} is now safely recorded as claimed.`);
    playRewardSound("claim");
    setCinematicReward(null);
  };

  return (
    <div className="rewards-delivery-page relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <Atmosphere />
      <div className="rewards-starfield" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            style={
              {
                "--star-x": `${(index * 37) % 100}%`,
                "--star-y": `${(index * 61) % 92}%`,
                "--star-delay": `${(index % 7) * -0.8}s`,
                "--star-size": `${index % 4 === 0 ? 2 : 1}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <main className="relative mx-auto w-full max-w-[1200px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <header className="reward-page-header">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <span className="reward-live-dot">
                <span />
              </span>{" "}
              Bloom / personal rewards
            </p>
            <h1 className="display mt-4 text-[40px] leading-[.98] sm:text-[58px]">
              Made for you,
              <br />
              <span className="rewards-gradient-text">when it matters.</span>
            </h1>
            <p className="mt-4 max-w-[55ch] text-[14px] leading-relaxed text-muted-foreground">
              This is a private delivery space. Rewards only appear here after an administrator has
              intentionally published them to your account.
            </p>
          </div>
          <div className="reward-page-header-actions">
            <button
              type="button"
              onClick={() => setSoundEnabled((enabled) => !enabled)}
              className="reward-sound-button"
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              {soundEnabled ? "sound on" : "sound off"}
            </button>
            {isAdmin ? (
              <Link to="/admin/rewards" className="reward-admin-link">
                Admin reward panel <ArrowUpRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="reward-loading-state">
            <div className="reward-loading-orb">
              <span />
            </div>
            <p className="eyebrow mt-5">Opening your private vault…</p>
          </div>
        ) : error ? (
          <section className="reward-error-state">
            <ShieldCheck className="size-5 text-rose" />
            <h2 className="display mt-4 text-[24px]">Your vault could not be opened.</h2>
            <p className="mt-2 max-w-[48ch] text-[13px] text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="reward-secondary-button mt-6"
            >
              <RefreshCw className="size-3.5" /> Retry securely
            </button>
          </section>
        ) : rewards.length === 0 ? (
          <EmptyRewardsState isAdmin={isAdmin} onRetry={() => void reload()} />
        ) : (
          <section className="reward-delivery-section">
            <div className="reward-delivery-section-head">
              <div>
                <p className="eyebrow">Available to your account</p>
                <h2 className="display mt-2 text-[28px]">Your rewards</h2>
              </div>
              <span className="reward-delivery-count">
                <Gift className="size-3.5" /> {rewards.length}{" "}
                {rewards.length === 1 ? "reward" : "rewards"}
              </span>
            </div>
            <div className="reward-delivery-grid">
              {rewards.map((reward, index) => (
                <div
                  key={reward.id}
                  className="reward-delivery-reveal"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <RewardCard reward={reward} onOpen={() => setActiveReward(reward)} />
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="reward-page-footer">
          <span>
            <ShieldCheck className="size-3.5 text-sage" /> Published rewards are private to their
            intended recipient.
          </span>
          <span className="mono">Bloom · personal reward delivery</span>
        </footer>
      </main>
      {activeReward ? (
        <RewardDetails
          reward={activeReward}
          onClose={() => setActiveReward(null)}
          onClaim={() => void claimActiveReward()}
          claiming={claiming}
        />
      ) : null}
      {cinematicReward ? (
        <RewardClaimCinematic
          reward={toReveal(cinematicReward)}
          onComplete={finishCinematic}
          onSkip={finishCinematic}
          onStageChange={(stage) => {
            if (stage === "revealing") playRewardSound("reveal");
          }}
        />
      ) : null}
      {toast ? (
        <div className="reward-toast" role="status">
          <span className="reward-toast-icon">
            <Check className="size-3.5" />
          </span>
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
