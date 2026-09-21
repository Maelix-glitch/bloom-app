/**
 * The Profile's waiting states — loading, degraded, and unavailable.
 *
 * The brief for these was "premium, like Apple", which in practice means three
 * things: the wait is *shaped like the page it is about to become* (so nothing
 * jumps when the data lands), the motion is slow, soft and staggered rather
 * than busy, and there are no spinners — a spinner says "I have no idea how
 * long this will take", a skeleton that fills in says "here it comes".
 *
 *   · `ProfileSwap`          — crossfades skeleton → page, both in the same
 *                              grid cell, so the swap has no layout shift.
 *   · `ProfileLoadingScreen` — the skeleton itself: cover, avatar with the
 *                              brand arc breathing inside it, name lines,
 *                              number tiles, the twelve-week grid, and one
 *                              hairline of indeterminate progress.
 *   · `ProfileProblemNotice` — the page loaded from this device because the
 *                              cloud read failed. Quiet, dismissible, honest,
 *                              with a retry. Never a wall.
 *   · `ProfileUnavailable`   — the rare case where there is nothing to show.
 */

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloudOff, RefreshCcw, X } from "lucide-react";

import { BloomLogo } from "@/components/BloomLogo";
import type { ProfileProblem } from "@/lib/profile/problems";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Skeleton → page, without a layout shift.
 *
 * Both panes live in one grid cell, so the container is always as tall as the
 * taller of the two — and the page is always taller than the skeleton, which
 * is what makes the skeleton's departure invisible. The outgoing pane blurs
 * out as the incoming one blurs in: the page *materialises* rather than being
 * swapped.
 */
export function ProfileSwap({ loading, children }: { loading: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const blur = reduce ? "blur(0px)" : undefined;

  return (
    <div className="pf-swap">
      <AnimatePresence initial={false}>
        {loading ? (
          <motion.div
            key="waiting"
            className="pf-swap-pane"
            exit={{ opacity: 0, scale: reduce ? 1 : 0.995, filter: blur ?? "blur(6px)" }}
            transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}
          >
            <ProfileLoadingScreen />
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            className="pf-swap-pane"
            initial={{ opacity: 0, filter: reduce ? "blur(0px)" : "blur(5px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Twelve weeks × seven days, the shape of the record grid below the numbers. */
const GRID_CELLS = 12 * 7;

export function ProfileLoadingScreen() {
  return (
    <div className="pf-load" role="status" aria-label="Loading your profile">
      {/* one hairline of indeterminate progress, then nothing else moves that
          isn't part of the skeleton */}
      <span className="pf-load-progress" aria-hidden="true">
        <span className="pf-load-progress-run" />
      </span>

      <div className="pf-load-cover" aria-hidden="true">
        <span className="pf-load-sheen" />
      </div>

      <div className="pf-head">
        <div className="pf-avatar-wrap">
          <div className="pf-load-avatar" aria-hidden="true">
            <span className="pf-load-avatar-ring" />
            <BloomLogo size={34} arcClassName="pf-load-arc" />
          </div>
        </div>
        <div className="pf-head-main">
          <div>
            <div className="pf-load-line pf-load-line--name" aria-hidden="true" />
            <div className="pf-load-line pf-load-line--handle" aria-hidden="true" />
            <div className="pf-load-line pf-load-line--bio" aria-hidden="true" />
            <div
              className="pf-load-line pf-load-line--bio pf-load-line--short"
              aria-hidden="true"
            />
          </div>
          <div className="pf-load-actions" aria-hidden="true">
            <span className="pf-load-pill" />
            <span className="pf-load-pill pf-load-pill--narrow" />
          </div>
        </div>
      </div>

      <div className="pf-numbers" aria-hidden="true">
        {[0, 1, 2, 3].map((tile) => (
          <span key={tile} className="pf-load-tile" style={{ ["--pf-i" as string]: tile }} />
        ))}
      </div>

      <div className="pf-section" aria-hidden="true">
        <div className="pf-load-card">
          <div className="pf-load-card-head">
            <span className="pf-load-line pf-load-line--label" />
            <span className="pf-load-line pf-load-line--title" />
          </div>
          <div className="pf-load-grid">
            {Array.from({ length: GRID_CELLS }).map((_, cell) => (
              <span
                key={cell}
                className="pf-load-cell"
                style={{
                  ["--pf-i" as string]: cell % 12,
                  ["--pf-j" as string]: Math.floor(cell / 12),
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="pf-load-caption">Preparing your space</p>
      <p className="sr-only">Loading your profile…</p>
    </div>
  );
}

/**
 * "This is your own copy, the cloud didn't answer." The page still works, so
 * this is a note, not a state — slim, dismissible, and specific about why.
 */
export function ProfileProblemNotice({
  problem,
  syncing,
  onRetry,
}: {
  problem: ProfileProblem;
  syncing: boolean;
  onRetry: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  /* A new failure is worth showing again even if the last one was dismissed. */
  useEffect(() => setDismissed(false), [problem.detail]);

  if (dismissed) return null;

  return (
    <motion.div
      className="pf-note"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      role="status"
    >
      <span className="pf-note-mark" aria-hidden="true">
        {syncing ? (
          <RefreshCcw className="size-3.5 pf-note-spin" />
        ) : (
          <CloudOff className="size-3.5" />
        )}
      </span>
      <p className="pf-note-copy">
        <strong>{syncing ? "Trying again…" : "Showing the copy on this device."}</strong>{" "}
        {problem.message}
      </p>
      <button type="button" className="pf-note-btn" onClick={onRetry} disabled={syncing}>
        <RefreshCcw className="size-3" aria-hidden="true" />
        Try again
      </button>
      <button
        type="button"
        className="pf-note-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

/**
 * Nothing to show at all — no cloud read, no copy on this device. Rare, and
 * still not an error wall: one line of what happened, one thing to do.
 */
export function ProfileUnavailable({
  problem,
  syncing,
  onRetry,
}: {
  problem: ProfileProblem | null;
  syncing: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="pf-out" role="status">
      <span className="pf-out-mark" aria-hidden="true">
        <CloudOff className="size-4" />
      </span>
      <h2 className="pf-out-title">Your profile isn't here yet</h2>
      <p className="pf-out-copy">
        {problem?.message ?? "Bloom couldn't reach your profile."}{" "}
        {problem?.kind === "schema"
          ? "The project this copy points at is missing part of its profile table."
          : problem?.kind === "permission"
            ? "Your account can read Bloom, but not this row — an admin can fix that."
            : "Nothing is lost; this is a connection, not your data."}
      </p>
      <button type="button" className="pf-out-btn" onClick={onRetry} disabled={syncing}>
        <RefreshCcw className={cn("size-3.5", syncing && "pf-note-spin")} aria-hidden="true" />
        {syncing ? "Trying…" : "Try again"}
      </button>
    </div>
  );
}
