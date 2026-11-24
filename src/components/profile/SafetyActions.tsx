/**
 * Report + block — the shared safety sheets (M-232, App Store audit #14).
 *
 * Two honest, separate actions wherever someone else's content is:
 *
 *   · Report — a small reason picker and a confirm. Reports are
 *     private: the other person is not told, and reporting never blocks
 *     by itself. The owner reviews reports in Settings (Moderation).
 *   · Block — its own confirm, in plain words: blocking hides both of
 *     you from each other — stories, profiles and search — and can be
 *     undone in Settings → Privacy → Blocked people.
 *
 * Both ride BloomSheet (opaque panel, real backdrop, capped height —
 * the standing sheet rules), and both say plainly when the write did
 * not land instead of pretending it did.
 */

import { useState } from "react";
import { Ban, Flag } from "lucide-react";
import { toast } from "sonner";

import { BloomConfirm, BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  REPORT_REASONS,
  blockUser,
  submitContentReport,
  type ReportReason,
  type ReportTargetKind,
} from "@/lib/profile/safetyService";

const KIND_NOUN: Record<ReportTargetKind, string> = {
  story: "story",
  profile: "profile",
  reply: "reply",
};

export function ReportSheet({
  open,
  onClose,
  reporterId,
  targetKind,
  targetId,
  targetUserId,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  reporterId: string | null;
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId: string | null;
  targetName: string;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!reporterId || !targetUserId) {
      toast.error("Sign in to send a report.");
      return;
    }
    setBusy(true);
    try {
      const ok = await submitContentReport({
        reporterId,
        targetKind,
        targetId,
        targetUserId,
        reason,
      });
      if (ok) {
        toast("Report sent. Thank you, we'll take a look.");
        onClose();
      } else {
        toast.error("That report couldn't be sent. Please try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <BloomSheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={`Report this ${KIND_NOUN[targetKind]}`}
      placement="pop"
    >
      <div className="flex flex-col px-6 pb-6 pt-7 sm:px-7" data-testid="safety-report-sheet">
        <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
          Report
        </p>
        <h2 className="mt-3 font-display text-[length:var(--text-title)] leading-tight text-foreground">
          Report this {KIND_NOUN[targetKind]}
        </h2>
        <p className="mt-2.5 max-w-[46ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          What&rsquo;s wrong with {targetName}&rsquo;s {KIND_NOUN[targetKind]}? Reports are
          private, the other person is not told, and reporting doesn&rsquo;t block them.
        </p>

        <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Reason">
          {REPORT_REASONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={reason === option.id}
              onClick={() => setReason(option.id)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border px-3.5 text-left text-[length:var(--text-support)] transition-colors",
                reason === option.id
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  reason === option.id ? "bg-gold" : "bg-muted-foreground/40",
                )}
              />
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Sending…" : "Send report"}
          </Button>
        </div>
      </div>
    </BloomSheet>
  );
}

/**
 * The two-action menu behind a story's / profile's "Report or block"
 * affordance. Report and Block stay separate and clearly labelled —
 * neither implies the other.
 */
export function SafetyMenuSheet({
  open,
  onClose,
  reporterId,
  targetKind,
  targetId,
  targetUserId,
  targetName,
  onBlocked,
}: {
  open: boolean;
  onClose: () => void;
  reporterId: string | null;
  /** Only story and profile get the menu; replies report directly. */
  targetKind: "story" | "profile";
  targetId: string;
  targetUserId: string | null;
  targetName: string;
  /** Called after a block lands, so the surface can close / collapse. */
  onBlocked?: ((blockedId: string) => void) | undefined;
}) {
  const [view, setView] = useState<"menu" | "report" | "block">("menu");

  const close = () => {
    setView("menu");
    onClose();
  };

  const confirmBlock = async () => {
    if (!reporterId || !targetUserId) {
      toast.error("Sign in to block someone.");
      return;
    }
    const ok = await blockUser({
      blockerId: reporterId,
      blockedId: targetUserId,
      blockedName: targetName,
    });
    if (ok) {
      toast(`Blocked ${targetName}. You won't see each other in Bloom.`);
      onBlocked?.(targetUserId);
      close();
    } else {
      toast.error("That block couldn't be saved. Please try again in a moment.");
    }
  };

  return (
    <>
      <BloomSheet
        open={open && view === "menu"}
        onClose={close}
        title={`Report or block ${targetName}`}
        placement="pop"
      >
        <div className="flex flex-col px-6 pb-6 pt-7 sm:px-7" data-testid="safety-menu-sheet">
          <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
            Safety
          </p>
          <h2 className="mt-3 font-display text-[length:var(--text-title)] leading-tight text-foreground">
            {targetName}
          </h2>
          <p className="mt-2.5 max-w-[46ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            Two separate things, reporting tells Bloom to take a look; blocking hides the two of
            you from each other.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => setView("report")}
            >
              <Flag className="size-4" aria-hidden />
              Report this {KIND_NOUN[targetKind]}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => setView("block")}
            >
              <Ban className="size-4" aria-hidden />
              Block {targetName}
            </Button>
            <Button type="button" variant="ghost" className="justify-start" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      </BloomSheet>

      <ReportSheet
        open={open && view === "report"}
        onClose={close}
        reporterId={reporterId}
        targetKind={targetKind}
        targetId={targetId}
        targetUserId={targetUserId}
        targetName={targetName}
      />

      <BloomConfirm
        open={open && view === "block"}
        onClose={() => setView("menu")}
        title={`Block ${targetName}?`}
        description="Blocking hides both directions: their stories and profile disappear for you, and yours disappear for them, including search. You can undo this any time in Settings → Privacy → Blocked people."
        confirmLabel="Block"
        cancelLabel="Cancel"
        tone="default"
        busyLabel="Blocking…"
        onConfirm={confirmBlock}
      />
    </>
  );
}
