/**
 * Bloom — content safety service (M-232, App Store audit #14).
 *
 * The client half of report + block for shared content, over the tables
 * in supabase/migrations/20261124_content_safety.sql:
 *
 *   · submitContentReport — one row in content_reports. RLS lets a
 *     reporter insert and read back only their own; the reported person
 *     is never told, and reporting never blocks by itself.
 *   · blockUser / unblockUser / listMyBlocks — the caller's own rows in
 *     user_blocks. A block hides BOTH directions: the profile and
 *     search RPCs enforce it server-side (they return the private
 *     shape / no rows), and listBlockCounterparts feeds the client-side
 *     filter the story interaction lists use.
 *   · listContentReportsForAdmin / setReportStatus — the owner's
 *     moderation path, through the admin RPCs. The RPCs themselves
 *     refuse anyone not in app_admins; this layer just calls them.
 *
 * Every function fails safe: before the migration is applied (or when
 * signed out), reads return empty and writes return false, so no
 * surface breaks and nothing pretends a report or block landed when it
 * did not — callers say so honestly from the boolean.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { report } from "./errors";

export type ReportTargetKind = "story" | "profile" | "reply";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";
export type ReportStatus = "open" | "reviewed" | "dismissed";

export const REPORT_REASONS: readonly { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "other", label: "Something else" },
];

export interface BlockedPerson {
  userId: string;
  name: string;
  blockedAt: string;
}

export interface ContentReport {
  id: string;
  createdAt: string;
  reporterId: string;
  reporterName: string;
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId: string;
  targetName: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
}

/** True when the error means "table/policy missing" rather than a real failure. */
function isMissingBackend(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return (
    code === "42P01" || // undefined_table
    code === "42703" || // undefined_column
    code === "PGRST202" || // function not in schema cache
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /function .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}

/* --------------------------------- reports -------------------------------- */

export async function submitContentReport(input: {
  reporterId: string;
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId: string;
  reason: ReportReason;
  note?: string | null;
}): Promise<boolean> {
  if (!hasSupabaseConfig || !input.reporterId) return false;
  if (input.reporterId === input.targetUserId) return false;
  try {
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: input.reporterId,
      target_kind: input.targetKind,
      target_id: input.targetId,
      target_user_id: input.targetUserId,
      reason: input.reason,
      note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
    });
    if (error) {
      if (!isMissingBackend(error)) report("safety:report", error);
      return false;
    }
    return true;
  } catch (error) {
    report("safety:report", error);
    return false;
  }
}

/* --------------------------------- blocks --------------------------------- */

/**
 * Everyone in a block relationship with this person, in either
 * direction — the set the story interaction lists filter against.
 * Cached briefly: a story session opens several lists in a row, and the
 * set changes only when the person blocks or unblocks someone (which
 * clears the cache below).
 */
const counterpartsCache = new Map<string, { at: number; ids: Set<string> }>();
const COUNTERPARTS_TTL_MS = 30_000;

export async function listBlockCounterparts(userId: string | null): Promise<Set<string>> {
  if (!hasSupabaseConfig || !userId) return new Set();
  const cached = counterpartsCache.get(userId);
  if (cached && Date.now() - cached.at < COUNTERPARTS_TTL_MS) return cached.ids;
  try {
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    if (error) {
      if (!isMissingBackend(error)) report("safety:blocks-read", error);
      return new Set();
    }
    const ids = new Set<string>();
    for (const row of (data ?? []) as { blocker_id: string; blocked_id: string }[]) {
      if (row.blocker_id !== userId) ids.add(row.blocker_id);
      if (row.blocked_id !== userId) ids.add(row.blocked_id);
    }
    counterpartsCache.set(userId, { at: Date.now(), ids });
    return ids;
  } catch (error) {
    report("safety:blocks-read", error);
    return new Set();
  }
}

/** The people THIS person has blocked (their unblock list in Settings). */
export async function listMyBlocks(userId: string | null): Promise<BlockedPerson[]> {
  if (!hasSupabaseConfig || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id, blocked_name, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      if (!isMissingBackend(error)) report("safety:my-blocks", error);
      return [];
    }
    return (
      (data ?? []) as { blocked_id: string; blocked_name: string | null; created_at: string }[]
    ).map((row) => ({
      userId: row.blocked_id,
      name: row.blocked_name?.trim() || "Someone in Bloom",
      blockedAt: row.created_at,
    }));
  } catch (error) {
    report("safety:my-blocks", error);
    return [];
  }
}

export async function blockUser(input: {
  blockerId: string;
  blockedId: string;
  blockedName?: string | null;
}): Promise<boolean> {
  if (!hasSupabaseConfig || !input.blockerId || !input.blockedId) return false;
  if (input.blockerId === input.blockedId) return false;
  try {
    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: input.blockerId,
      blocked_id: input.blockedId,
      blocked_name: input.blockedName?.trim() ? input.blockedName.trim().slice(0, 48) : null,
    });
    if (error) {
      /* 23505: the block already exists — the outcome the caller wants
         is already true, so it is not a failure. */
      if ((error as { code?: string }).code === "23505") {
        counterpartsCache.delete(input.blockerId);
        return true;
      }
      if (!isMissingBackend(error)) report("safety:block", error);
      return false;
    }
    counterpartsCache.delete(input.blockerId);
    return true;
  } catch (error) {
    report("safety:block", error);
    return false;
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  if (!hasSupabaseConfig || !blockerId || !blockedId) return false;
  try {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);
    if (error) {
      if (!isMissingBackend(error)) report("safety:unblock", error);
      return false;
    }
    counterpartsCache.delete(blockerId);
    return true;
  } catch (error) {
    report("safety:unblock", error);
    return false;
  }
}

/* ------------------------------- moderation ------------------------------- */

interface AdminReportRow {
  id: string;
  created_at: string;
  reporter_id: string;
  reporter_name: string;
  target_kind: ReportTargetKind;
  target_id: string;
  target_user_id: string;
  target_name: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
}

/** The owner's moderation queue. Empty for non-admins (the RPC refuses). */
export async function listContentReportsForAdmin(
  status?: ReportStatus,
): Promise<ContentReport[]> {
  if (!hasSupabaseConfig) return [];
  try {
    const { data, error } = await supabase.rpc("admin_list_content_reports", {
      p_status: status ?? null,
    });
    if (error) {
      if (!isMissingBackend(error)) report("safety:admin-list", error);
      return [];
    }
    return ((data ?? []) as AdminReportRow[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      reporterId: row.reporter_id,
      reporterName: row.reporter_name,
      targetKind: row.target_kind,
      targetId: row.target_id,
      targetUserId: row.target_user_id,
      targetName: row.target_name,
      reason: row.reason,
      note: row.note,
      status: row.status,
    }));
  } catch (error) {
    report("safety:admin-list", error);
    return [];
  }
}

export async function setReportStatus(reportId: string, status: ReportStatus): Promise<boolean> {
  if (!hasSupabaseConfig) return false;
  try {
    const { error } = await supabase.rpc("admin_set_report_status", {
      p_report_id: reportId,
      p_status: status,
    });
    if (error) {
      if (!isMissingBackend(error)) report("safety:admin-status", error);
      return false;
    }
    return true;
  } catch (error) {
    report("safety:admin-status", error);
    return false;
  }
}
