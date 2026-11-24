/**
 * Reports to review — the owner's moderation queue (M-232).
 *
 * Renders only for Bloom admins (useAdminAccess, fail-closed — the same
 * gate as the rewards console). The rows come from the admin report
 * RPCs (via safetyService), which themselves refuse anyone not in
 * app_admins, so this section is a face on a server-side gate, not the
 * gate itself. Each report can be marked reviewed or dismissed. Nothing here
 * deletes content or touches the reported person's account — review is
 * a record, and acting on a person stays a deliberate, separate step.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconChevronDown,
  IconChevronRight,
  IconShieldCheck,
} from "@/components/profile/SettingsIcons";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  listContentReportsForAdmin,
  setReportStatus,
  type ContentReport,
} from "@/lib/profile/safetyService";

const REASON_LABEL: Record<ContentReport["reason"], string> = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate content",
  other: "Something else",
};

const KIND_LABEL: Record<ContentReport["targetKind"], string> = {
  story: "Story",
  profile: "Profile",
  reply: "Reply",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ModerationSection() {
  const access = useAdminAccess();
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<ContentReport[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setReports(await listContentReportsForAdmin());
  }, []);

  useEffect(() => {
    if (access.status === "granted") void load();
  }, [access.status, load]);

  if (access.status !== "granted") return null;

  const openCount = (reports ?? []).filter((r) => r.status === "open").length;

  const act = async (report: ContentReport, status: "reviewed" | "dismissed") => {
    if (busyId) return;
    setBusyId(report.id);
    try {
      const ok = await setReportStatus(report.id, status);
      if (ok) {
        setReports((current) =>
          (current ?? []).map((r) => (r.id === report.id ? { ...r, status } : r)),
        );
      } else {
        toast.error("That change couldn't be saved. Please try again in a moment.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className="pf-row"
        data-testid="pf-row-moderation"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pf-row-icon" aria-hidden>
          <IconShieldCheck />
        </span>
        <span className="pf-row-text">
          <span className="pf-row-label">Reports to review</span>
          <span className="pf-row-hint">Content people have reported, only you see this</span>
        </span>
        <span className="pf-row-value">
          {reports === null ? "…" : openCount > 0 ? `${openCount} open` : "None open"}
        </span>
        {open ? (
          <IconChevronDown className="pf-row-chevron" />
        ) : (
          <IconChevronRight className="pf-row-chevron" />
        )}
      </button>
      {open ? (
        <div className="pf-confirm" data-testid="pf-moderation-detail">
          {reports === null ? (
            <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              Loading…
            </p>
          ) : reports.length === 0 ? (
            <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              No reports yet. When someone reports a story, profile or reply, it appears here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {reports.map((report) => (
                <li key={report.id} className="border-b border-border/50 pb-3.5 last:border-0 last:pb-0">
                  <p className="text-[length:var(--text-caption)] font-medium leading-snug text-foreground">
                    {KIND_LABEL[report.targetKind]} by {report.targetName} ·{" "}
                    {REASON_LABEL[report.reason]}
                  </p>
                  <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                    Reported by {report.reporterName} on {formatDate(report.createdAt)} ·{" "}
                    {report.status === "open"
                      ? "Open"
                      : report.status === "reviewed"
                        ? "Reviewed"
                        : "Dismissed"}
                  </p>
                  {report.note ? (
                    <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                      &ldquo;{report.note}&rdquo;
                    </p>
                  ) : null}
                  {report.status === "open" ? (
                    <span className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void act(report, "reviewed")}
                        disabled={busyId !== null}
                        className="rounded-full border border-border px-3 py-1.5 text-[length:var(--text-caption)] font-medium text-foreground transition-colors hover:border-gold disabled:opacity-50"
                      >
                        Mark reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() => void act(report, "dismissed")}
                        disabled={busyId !== null}
                        className="rounded-full border border-border px-3 py-1.5 text-[length:var(--text-caption)] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
