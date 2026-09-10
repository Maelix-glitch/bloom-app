/**
 * The rank ceremony — the one moment Bloom raises its voice, briefly.
 *
 * Sequence (timed in CSS, so it degrades gracefully and can be switched off):
 *   the interface darkens → light expands → the emblem emerges → the old rank
 *   is behind you → the new rank's name arrives → the points that carried you
 *   → one affirmation → done.
 *
 * It takes a rank, never invents one: the caller only opens it after the
 * ledger recorded a real tier change.
 */

import { useEffect } from "react";

import type { RankState } from "@/lib/progression/types";
import { formatPoints } from "@/lib/progression/format";
import { RankBadge } from "./RankBadge";

/** Deterministic burst of sparks — SSR-safe, no Math.random at render. */
const CEREMONY_SPARKS = Array.from({ length: 18 }, (_, i) => {
  const seed = (i * 2654435761) % 1000;
  return {
    left: `${(seed % 84) + 8}%`,
    size: 2 + (seed % 3),
    delay: `${(seed % 18) / 10}s`,
    duration: `${2.6 + (seed % 22) / 10}s`,
    drift: `${((seed % 70) - 35) / 10}vw`,
  };
});

export function RankCeremony({
  rank,
  onClose,
  autoCloseMs = 9000,
}: {
  rank: RankState;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") onClose();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(onClose, autoCloseMs);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [onClose, autoCloseMs]);

  return (
    <div
      className="pg-ceremony"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pg-ceremony-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <span className="pg-ceremony-glow" aria-hidden />
      <span className="pg-ceremony-sparks" aria-hidden>
        {CEREMONY_SPARKS.map((s, i) => (
          <i
            key={i}
            className="pg-ceremony-spark"
            style={{
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              ["--pg-mote-drift" as string]: s.drift,
            }}
          />
        ))}
      </span>
      <div className="pg-ceremony-inner">
        <span className="pg-ceremony-mark" style={{ color: rank.rank.tone }} aria-hidden>
          <span className="pg-ceremony-halo" aria-hidden />
          <RankBadge rank={rank.rank} banner />
        </span>
        <p className="pg-eyebrow pg-ceremony-eyebrow">
          <span className="pg-eyebrow-rule" aria-hidden />
          Rank {rank.rank.tier}
        </p>
        <h2 id="pg-ceremony-title" className="pg-ceremony-title">
          {rank.rank.name}
        </h2>
        <p className="pg-ceremony-points">
          <strong>{formatPoints(rank.rank.threshold)} points</strong>
          <span className="pg-rank-points-label">reached</span>
        </p>
        <p className="pg-ceremony-affirm">{rank.rank.affirmation}</p>
        <p className="pg-ceremony-affirm" style={{ fontSize: "13px", opacity: 0.8 }}>
          {formatPoints(rank.remaining)} points to {rank.next.name}. The journey continues from
          here.
        </p>
        <div className="pg-ceremony-actions">
          <button type="button" className="pg-btn pg-btn-primary" onClick={onClose}>
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}

/** The light, non-blocking "+600" that floats up after an award. */
export function PointsFloat({ points, label }: { points: number; label: string }) {
  return (
    <div className="pg-float" role="status" aria-live="polite">
      <span className="pg-float-value">
        {points >= 0 ? "+" : "−"}
        {formatPoints(Math.abs(points))}
      </span>
      <span className="pg-float-label">{label}</span>
    </div>
  );
}
