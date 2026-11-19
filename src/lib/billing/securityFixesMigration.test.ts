/**
 * The 2026-11-19 security-fixes migration, pinned from the SQL text
 * the way billingMigration.test.ts pins the foundation: the pentest's
 * code-side findings (H1, H2, M4) close in this file, and these pins
 * keep them closed.
 *
 *   H1 — the legacy caller-amount points RPCs are DROPPED (the
 *        client provably never calls them), and a guard trigger
 *        makes profiles.total_points server-owned.
 *   H2 — habits.point_value is bounded to the product range the
 *        app's own form writes (5..500 → CHECK 1..500), existing
 *        rows are clamped in first, and both award RPCs clamp what
 *        they pay.
 *   M4 — billing_effective_tier() expires an 'active' subscription
 *        with its period (3-day renewal grace), and the webhook
 *        replay ledger exists with service-role-only access.
 *
 * Static SQL analysis only — there is no Postgres in CI; the repo
 * file is the contract, and applying the migration live stays an
 * owner-approved step.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261119_security_fixes.sql"),
  "utf8",
);
const lower = sql.toLowerCase();

describe("H1 — legacy points RPCs are gone", () => {
  it("drops both caller-amount functions", () => {
    expect(lower).toContain("drop function if exists public.increment_points(uuid, integer);");
    expect(lower).toContain("drop function if exists public.decrement_points(uuid, integer);");
  });

  it("never re-grants them to anyone", () => {
    expect(lower).not.toMatch(/grant execute on function public\.(increment|decrement)_points/);
  });

  it("total_points is guarded: only owner/service contexts may change it", () => {
    expect(lower).toContain("create trigger profiles_total_points_guard");
    expect(lower).toContain("before update on public.profiles");
    expect(lower).toContain("new.total_points is distinct from old.total_points");
    expect(lower).toContain("current_user not in ('postgres', 'service_role')");
  });
});

describe("H2 — point_value is bounded to the product range", () => {
  it("adds the CHECK at 1..500 (the app form writes 5..500, default 10)", () => {
    expect(lower).toContain("add constraint habits_point_value_range");
    expect(lower).toContain("check (point_value between 1 and 500)");
  });

  it("clamps existing rows into range BEFORE the constraint lands", () => {
    const clampAt = lower.indexOf("set point_value = least(greatest(point_value, 1), 500)");
    const constraintAt = lower.indexOf("add constraint habits_point_value_range");
    expect(clampAt).toBeGreaterThan(-1);
    expect(constraintAt).toBeGreaterThan(clampAt);
  });

  it("both award RPCs clamp what they pay with least(..., 500)", () => {
    const clamps = lower.match(/least\(coalesce\(h\.point_value, 10\), 500\)/g) ?? [];
    expect(clamps.length).toBe(2);
    expect(lower).toContain("create or replace function public.award_habit_points(");
    expect(lower).toContain("create or replace function public.adjust_habit_points(");
  });

  it("the award RPCs stay security definer and authenticated-only", () => {
    expect(lower).toContain(
      "grant execute on function public.award_habit_points(uuid, date) to authenticated;",
    );
    expect(lower).not.toMatch(/grant execute on function public\.award_habit_points\(uuid, date\) to (anon|public)/);
  });
});

describe("M4 — 'active' expires with its period", () => {
  it("billing_effective_tier consults current_period_end on the active branch", () => {
    const fnAt = lower.indexOf("create or replace function public.billing_effective_tier");
    const body = lower.slice(fnAt, fnAt + 1600);
    expect(body).toContain("v_status = 'active'");
    expect(body).toContain("v_period_end is null or v_period_end > now() - interval '3 days'");
  });

  it("the cancelled branch keeps its strict in-period rule", () => {
    expect(lower).toContain(
      "v_status = 'cancelled' and v_period_end is not null and v_period_end > now()",
    );
  });

  it("the helper stays granted to nobody", () => {
    expect(lower).toContain("revoke all on function public.billing_effective_tier(uuid) from public;");
    expect(lower).not.toContain("grant execute on function public.billing_effective_tier");
  });
});

describe("M4 — the webhook replay ledger", () => {
  it("creates billing_webhook_events keyed by the body hash", () => {
    expect(lower).toContain("create table if not exists public.billing_webhook_events (");
    expect(lower).toContain("event_key text primary key");
  });

  it("holds no per-person column (provider receipts, not user data)", () => {
    const tableAt = lower.indexOf("create table if not exists public.billing_webhook_events");
    const body = lower.slice(tableAt, lower.indexOf(");", tableAt));
    for (const col of ["user_id", "profile_id", "owner_id", "sender_id", "viewer_id"]) {
      expect(body).not.toContain(col);
    }
  });

  it("RLS is on and every client role is revoked (service role only)", () => {
    expect(lower).toContain("alter table public.billing_webhook_events enable row level security;");
    expect(lower).toContain("revoke all on public.billing_webhook_events from anon;");
    expect(lower).toContain("revoke all on public.billing_webhook_events from authenticated;");
    expect(lower).not.toMatch(/grant .* on public\.billing_webhook_events to (anon|authenticated)/);
    expect(lower).not.toMatch(/create policy .* on public\.billing_webhook_events/);
  });
});

describe("the billing function records before it acts", () => {
  const fnIndex = readFileSync(
    resolve(process.cwd(), "supabase/functions/billing/index.ts"),
    "utf8",
  );

  it("inserts the receipt and answers duplicates without reprocessing", () => {
    expect(fnIndex).toContain("webhookEventKey(rawBody)");
    expect(fnIndex).toContain('.from("billing_webhook_events")');
    expect(fnIndex).toContain('"23505"');
    expect(fnIndex).toContain('handled: "duplicate"');
  });

  it("records the receipt BEFORE the entitlement write, and drops it when the write fails", () => {
    const receiptAt = fnIndex.indexOf('.from("billing_webhook_events")');
    const writeAt = fnIndex.indexOf('admin.rpc("activate_subscription"');
    expect(receiptAt).toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(receiptAt);
    expect(fnIndex).toContain("dropReceipt");
  });
});
