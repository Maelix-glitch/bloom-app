/**
 * The billing migration's shape, pinned from the SQL text the way the
 * repo's other migration tests pin theirs (the database itself is
 * only ever migrated with the owner's approval, so the repo file is
 * the contract): three tables, RLS on, own-row SELECT only, no
 * client writes, the money-moving RPCs unreachable by clients, and
 * erase_my_data() covering every new per-person table.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261118_billing_foundation.sql"),
  "utf8",
);
const lower = sql.toLowerCase();

const TABLES = ["subscriptions", "ai_credit_balances", "ai_credit_ledger"] as const;

describe("billing tables", () => {
  it("creates all three tables", () => {
    for (const t of TABLES) {
      expect(lower).toContain(`create table if not exists public.${t} (`);
    }
  });

  it("subscriptions constrains the plan tier to the three known tiers", () => {
    expect(lower).toContain("'free'");
    expect(lower).toContain("'premium_plus'");
    expect(sql).toMatch(/plan\s+text\s+not\s+null[^,]*check/i);
  });

  it("the credit balance can never go negative; the ledger is identity-keyed", () => {
    expect(lower).toContain("check (balance >= 0)");
    expect(lower).toContain("check (balance_after >= 0)");
    expect(lower).toContain("generated always as identity");
  });
});

describe("RLS: users read ONLY their own rows; writes are RPC/service-role only", () => {
  it("RLS is enabled on all three tables", () => {
    for (const t of TABLES) {
      expect(lower).toContain(`alter table public.${t} enable row level security;`);
    }
  });

  it("each table has exactly one policy: owner SELECT", () => {
    for (const t of TABLES) {
      const policies = lower.match(new RegExp(`create policy "[^"]+" on public\\.${t}\\b`, "g")) ?? [];
      expect(policies.length).toBe(1);
      expect(lower).toContain(`on public.${t}\n  for select using (user_id = auth.uid())`);
    }
  });

  it("no client write path: anon revoked, authenticated writes revoked, SELECT granted back", () => {
    for (const t of TABLES) {
      expect(lower).toContain(`revoke all on public.${t} from anon;`);
      expect(lower).toContain(`revoke insert, update, delete on public.${t} from authenticated;`);
      expect(lower).toContain(`grant select on public.${t} to authenticated;`);
    }
    /* The ledger's append-only nature: no UPDATE/DELETE policy or
       grant exists anywhere in the file for it. */
    expect(lower).not.toMatch(/create policy "[^"]+" on public\.ai_credit_ledger\s+for (update|delete|insert)/);
  });
});

describe("RPC grants — the hard rule in grant form", () => {
  it("caller RPCs are granted to authenticated and revoked from public", () => {
    expect(lower).toContain("grant execute on function public.get_my_entitlement() to authenticated;");
    expect(lower).toContain("grant execute on function public.spend_credits(integer, text) to authenticated;");
    expect(lower).toContain("revoke all on function public.get_my_entitlement() from public;");
    expect(lower).toContain("revoke all on function public.spend_credits(integer, text) from public;");
  });

  it("money-moving RPCs are service_role ONLY (revoked from public AND authenticated)", () => {
    for (const fn of [
      "grant_credits(uuid, integer, text, text)",
      "activate_subscription(uuid, text, text, text, text, timestamptz, timestamptz)",
      "set_subscription_status(uuid, text, timestamptz, boolean)",
    ]) {
      expect(lower).toContain(`grant execute on function public.${fn} to service_role;`);
      expect(lower).toContain(`revoke all on function public.${fn} from public;`);
      expect(lower).toContain(`revoke all on function public.${fn} from authenticated;`);
      expect(lower).not.toContain(`grant execute on function public.${fn} to authenticated;`);
    }
  });

  it("internal helpers are granted to nobody", () => {
    for (const fn of [
      "billing_effective_tier(uuid)",
      "billing_tier_allowance(text)",
      "billing_ensure_credits(uuid)",
    ]) {
      expect(lower).toContain(`revoke all on function public.${fn} from public;`);
      expect(lower).not.toContain(`grant execute on function public.${fn}`);
    }
  });

  it("spend_credits is atomic check-and-deduct (conditional UPDATE, never a blind decrement)", () => {
    expect(sql).toMatch(/update\s+public\.ai_credit_balances[\s\S]*?balance\s*>=\s*p_amount/i);
    expect(lower).toContain("security definer");
  });
});

describe("erasure", () => {
  it("erase_my_data() deletes all three billing tables for the caller", () => {
    for (const t of TABLES) {
      expect(lower).toContain(`delete from public.${t} where user_id = uid;`);
    }
  });
});
