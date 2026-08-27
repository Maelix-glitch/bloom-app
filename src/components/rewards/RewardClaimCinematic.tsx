import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, FastForward, Sparkles } from "lucide-react";

import crownCrest from "@/assets/crown-crest.png";

export interface RewardReveal {
  title: string;
  description: string;
  imageUrl: string | null;
  rewardType: string;
  valueDetails: string | null;
}

export function RewardClaimCinematic({
  reward,
  crestSrc = crownCrest,
  onComplete,
  onSkip,
  onStageChange,
}: {
  reward: RewardReveal;
  crestSrc?: string;
  onComplete: () => void;
  onSkip: () => void;
  onStageChange?: (stage: "charging" | "revealing" | "landed") => void;
}) {
  const [stage, setStage] = useState<"charging" | "revealing" | "landed">("charging");
  const particles = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        x: `${50 + Math.cos(index * 1.7) * (15 + (index % 5) * 8)}%`,
        y: `${47 + Math.sin(index * 2.3) * (12 + (index % 4) * 10)}%`,
        delay: `${(index % 9) * 0.04}s`,
        hue: index % 3 === 0 ? "var(--gold)" : index % 3 === 1 ? "var(--royal)" : "var(--sky)",
        size: `${3 + (index % 3) * 2}px`,
      })),
    [],
  );

  useEffect(() => {
    onStageChange?.("charging");
    const revealTimer = window.setTimeout(() => {
      setStage("revealing");
      onStageChange?.("revealing");
    }, 850);
    const landTimer = window.setTimeout(() => {
      setStage("landed");
      onStageChange?.("landed");
    }, 1760);
    const doneTimer = window.setTimeout(onComplete, 4200);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(landTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete, onStageChange]);

  return (
    <div
      className={`claim-cinematic claim-cinematic-${stage}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-title"
    >
      <div className="claim-cinematic-backdrop" aria-hidden />
      <div className="claim-cinematic-grid" aria-hidden />
      <div className="claim-cinematic-stars" aria-hidden>
        {particles.map((particle, index) => (
          <span
            key={index}
            style={
              {
                left: particle.x,
                top: particle.y,
                animationDelay: particle.delay,
                background: particle.hue,
                width: particle.size,
                height: particle.size,
                "--particle-x": particle.x,
                "--particle-y": particle.y,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="claim-cinematic-copy claim-cinematic-copy-top">
        <p className="eyebrow">
          <span className="claim-signal-dot" /> Reward claim sequence ·{" "}
          {stage === "charging"
            ? "signal detected"
            : stage === "revealing"
              ? "identity confirmed"
              : "reward recorded"}
        </p>
      </div>

      <div className="claim-cinematic-core">
        <div className="claim-cinematic-radar" aria-hidden />
        <div className="claim-cinematic-ring claim-cinematic-ring-one" aria-hidden />
        <div className="claim-cinematic-ring claim-cinematic-ring-two" aria-hidden />
        <div className="claim-cinematic-beam" aria-hidden />
        <div className="claim-cinematic-crest-wrap">
          <img src={reward.imageUrl || crestSrc} alt="" className="claim-cinematic-crest" />
          <div className="claim-cinematic-crest-glow" aria-hidden />
        </div>
      </div>

      <div className="claim-cinematic-copy claim-cinematic-copy-bottom">
        <p className="mono claim-cinematic-kicker">{reward.rewardType} · reward published to you</p>
        <h1 id="claim-title" className="display claim-cinematic-title">
          {reward.title}
        </h1>
        <p className="claim-cinematic-description">{reward.description}</p>
        <div className="claim-cinematic-reward">
          <span>
            <Sparkles className="size-4" /> {reward.valueDetails || "A personal reward"}
          </span>
          <span>
            <Check className="size-4" /> saved to your account
          </span>
        </div>
      </div>

      <button
        type="button"
        className="claim-cinematic-skip"
        onClick={stage === "landed" ? onComplete : onSkip}
      >
        {stage === "landed" ? (
          <>
            <Check className="size-3.5" /> Continue
          </>
        ) : (
          <>
            <FastForward className="size-3.5" /> Skip sequence
          </>
        )}
      </button>
    </div>
  );
}
