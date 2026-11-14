/**
 * TopBar — Today's top row, built faithfully to the prototype's TopBar
 * (Reskin slice A, pinned addition).
 *
 * Left: the live local date in the prototype's format ("Sat, November
 * 14" — Bloom's own `longDate`, the same en-US pattern), a hairline
 * divider, and the sync pill. Right: the two 40px round buttons —
 * Bloom's real notifications bell (the NotificationCenter surface) and
 * the rewards gift with its gold pip. Both wear Bloom's `bloom-icon-btn`
 * glass disc: 40px, hairline border, hover lift — the foundation's own
 * expression of the prototype's button.
 *
 * The pill is honest, exactly as the sync line it replaces was: it
 * renders only settled states (while the account check runs there is no
 * pill at all — a printed "checking" can outlive the check and read as
 * stuck), its words are the sync store's own message, and the breathing
 * sage pulse-ring is worn ONLY by the genuinely synced state. Pending
 * wears a still gold dot, error a still rose dot, device-only states a
 * still muted dot — no pulse theatre for a state that is not synced.
 *
 * Wording: "Synced with your account" in full wherever it fits; the
 * compact short forms appear only below the sm breakpoint, where the
 * full sentence genuinely does not fit beside the date.
 */

import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";

import { NotificationBell } from "@/components/notifications/NotificationCenter";
import type { TrackerSyncState } from "@/hooks/useTrackers";
import { longDate } from "@/lib/home/today";
import { cn } from "@/lib/utils";

export interface SyncPill {
  /** The full settled wording (the sync store's own message). */
  label: string;
  /** Compact wording for narrow screens, where the full line cannot fit. */
  shortLabel: string;
  dot: "sage" | "gold" | "rose" | "muted";
  /** True only for the genuinely synced state — the pulse-ring's wearer. */
  live: boolean;
}

const SHORT_LABEL: Record<Exclude<TrackerSyncState, "loading">, string> = {
  saved: "Synced",
  pending: "Saving…",
  error: "Not synced yet",
  off: "On this device",
  "signed-out": "Not signed in",
};

/**
 * The pill for a settled sync state — or null while the state is still
 * "loading" (the settled-states-only rule the sync line has always
 * kept). Pure; unit-tested.
 */
export function syncPillModel(state: TrackerSyncState, label: string | null): SyncPill | null {
  if (state === "loading" || !label) return null;
  const dot: SyncPill["dot"] =
    state === "saved"
      ? "sage"
      : state === "pending"
        ? "gold"
        : state === "error"
          ? "rose"
          : "muted";
  return {
    /* The store's synced message ends its sentence with a full stop;
       inside a pill the sentence is the whole text, so it stands bare. */
    label: label.replace(/\.$/, ""),
    shortLabel: SHORT_LABEL[state],
    dot,
    live: state === "saved",
  };
}

const DOT_CLASS: Record<SyncPill["dot"], string> = {
  sage: "bg-sage",
  gold: "bg-gold",
  rose: "bg-rose",
  muted: "bg-white/40",
};

export function TopBar({
  now,
  syncState,
  syncLabel,
  points,
}: {
  now: Date;
  syncState: TrackerSyncState;
  /** The settled sync wording (Today's own derivation), or null while checking. */
  syncLabel: string | null;
  /** Bloom Points balance, for the rewards pip; null while unknown. */
  points: number | null;
}) {
  const pill = syncPillModel(syncState, syncLabel);
  return (
    <div className="home-toolbar">
      <div className="flex items-center gap-3 text-[length:var(--text-support)]">
        {/* suppressHydrationWarning: the date is LOCAL time by design, but
            the server renders on a UTC clock — its day can legitimately
            differ from the reader's (React #418). The client value wins
            on hydration; the swap is one word. */}
        <span className="font-medium text-foreground/80" suppressHydrationWarning>
          {longDate(now)}
        </span>
        <span className="h-3 w-px bg-white/15" aria-hidden />
        {pill ? (
          <span
            className="home-sync-pill inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[length:var(--text-caption)] text-muted-foreground"
            role="status"
            data-testid="home-sync-pill"
            data-state={syncState}
          >
            <span className="sr-only">{pill.label}</span>
            <span
              className={cn(
                "home-sync-dot size-1.5 shrink-0 rounded-full",
                DOT_CLASS[pill.dot],
                pill.live && "home-sync-dot--live",
              )}
              aria-hidden
            />
            <span className="hidden sm:inline" aria-hidden>
              {pill.label}
            </span>
            <span className="sm:hidden" aria-hidden>
              {pill.shortLabel}
            </span>
          </span>
        ) : null}
      </div>

      {/* The phone shell already carries the bell (header) and rewards
          (tab bar) — the toolbar pair is a desktop affordance. */}
      <div className="hidden items-center gap-2 lg:flex">
        <NotificationBell className="hidden lg:grid" />
        <Link
          to="/rewards"
          aria-label="Rewards"
          title="Rewards"
          className="bloom-icon-btn hidden lg:grid"
        >
          <Gift className="size-[18px]" strokeWidth={1.75} />
          {points !== null && points > 0 ? (
            <span className="bloom-icon-btn__dot" aria-hidden="true" />
          ) : null}
        </Link>
      </div>
    </div>
  );
}
