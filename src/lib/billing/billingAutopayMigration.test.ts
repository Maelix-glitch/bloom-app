/**
 * The M-222 Autopay migration's shape, pinned from the SQL text the
 * way the foundation's test pins its own (the database is only ever
 * migrated with the owner's approval, so the repo file is the
 * contract): two service-role-only tables — the plan registry the
 * function ensures from, and the per-subscription lifecycle record —
 * with the entitlement table and its RPCs untouched.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261123_billing_autopay.sql"),
  "utf8",
);
const lower = sql.toLowerCase();

const TABLES = ["billing_plans", "billing_subscriptions"] as const;

describe("M-222 autopay tables", () => {
  it("creates both tables", () => {
    for (const t of TABLES) {
      expect(lower).toContain(`create table if not exists public.${t} (`);
    }
  });

  it("the plan registry is unique per (provider, plan_key) and priced in paise", () => {
    expect(lower).toContain("unique (provider, plan_key)");
    expect(lower).toContain("check (amount_paise > 0)");
    expect(lower).toContain("razorpay_plan_id text not null");
  });

  it("the tracking table keys on the provider subscription id and cascades with the account", () => {
    expect(lower).toContain("provider_subscription_id text primary key");
    expect(lower).toContain("references auth.users (id) on delete cascade");
  });

  it("RLS is on, and NO client role can read or write either table", () => {
    for (const t of TABLES) {
      expect(lower).toContain(`alter table public.${t} enable row level security;`);
      expect(lower).toContain(`revoke all on public.${t} from anon;`);
      expect(lower).toContain(`revoke all on public.${t} from authenticated;`);
      expect(lower).not.toContain(`grant select on public.${t} to authenticated`);
      expect(lower).not.toMatch(new RegExp(`create policy "[^"]+" on public\\.${t}\\b`));
    }
  });

  it("the service role — the billing function — holds the table grants", () => {
    for (const t of TABLES) {
      expect(lower).toContain(
        `grant select, insert, update, delete on public.${t} to service_role;`,
      );
    }
  });

  it("the entitlement truth is untouched: no writes to subscriptions, no RPC restated", () => {
    expect(lower).not.toMatch(/insert into public\.subscriptions/);
    expect(lower).not.toMatch(/update public\.subscriptions/);
    expect(lower).not.toContain("create or replace function public.activate_subscription");
    expect(lower).not.toContain("create or replace function public.set_subscription_status");
    expect(lower).not.toContain("create or replace function public.get_my_entitlement");
  });
});

describe("M-222 erase companion (20261123_billing_autopay_erase.sql)", () => {
  const eraseSql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261123_billing_autopay_erase.sql"),
    "utf8",
  ).toLowerCase();

  it("restates erase_my_data with a uid-scoped billing_subscriptions delete", () => {
    expect(eraseSql).toContain("create or replace function public.erase_my_data()");
    expect(eraseSql).toContain(
      "delete from public.billing_subscriptions where user_id = uid",
    );
  });

  it("the global plan registry is NOT erased per person", () => {
    expect(eraseSql).not.toContain("delete from public.billing_plans");
  });
});
