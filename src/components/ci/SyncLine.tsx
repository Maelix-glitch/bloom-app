/**
 * SyncLine — one honest line about where the record lives right now.
 *
 * The page always draws from this device, so a failed sync costs exactly one
 * thing: the entry isn't on the account yet. It says so instead of pretending.
 */

import { Link } from "@tanstack/react-router";

import type { SyncStatus } from "@/hooks/usePeriodLog";

const COPY: Record<SyncStatus["state"], string> = {
  off: "stored in this browser only",
  loading: "checking your account…",
  saved: "daily log saved to your account · period dates stay on this device",
  pending: "saving your daily log to your account…",
  "signed-out": "saved on this device — sign in to sync your daily log",
  error: "saved here — daily log not yet on your account",
};

const TONE: Record<SyncStatus["state"], string> = {
  off: "var(--ci-text-mute)",
  loading: "var(--ci-text-mute)",
  saved: "var(--ci-follicular)",
  pending: "var(--ci-ovulation)",
  "signed-out": "var(--ci-text-mute)",
  error: "var(--ci-menstrual)",
};

export function SyncLine({
  sync,
  onRetry,
}: {
  sync: SyncStatus;
  onRetry?: (() => void) | undefined;
}) {
  const showAction = (sync.state === "error" || sync.state === "signed-out") && onRetry;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1" aria-live="polite">
      <i
        aria-hidden
        className="h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ background: TONE[sync.state] }}
      />
      <span>{COPY[sync.state]}</span>
      {showAction ? (
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          retry
        </button>
      ) : null}
      {sync.state === "signed-out" ? (
        <Link to="/profile" className="underline underline-offset-2 hover:opacity-70">
          open profile
        </Link>
      ) : null}
    </span>
  );
}

export default SyncLine;