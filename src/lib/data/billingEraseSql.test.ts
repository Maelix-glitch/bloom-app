/**
 * Audit #45, account half — the billing record is erased too.
 *
 * The billing foundation (2026-11-18) added three per-person tables —
 * `subscriptions`, `ai_credit_balances`, `ai_credit_ledger` — and restated
 * `erase_my_data()` in the same migration. eraseCoverage proves the
 * general rule (every per-person table is deleted); this pins the billing
 * tables BY NAME, scoped to the caller, so the newest restatement cannot
 * quietly drop the money record while keeping the general proof green by
 * accident of ordering.
 *
 * Static SQL analysis, not execution — there is no Postgres in CI.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(new URL("../../../supabase/migrations", import.meta.url));

const BILLING_TABLES = ["subscriptions", "ai_credit_balances", "ai_credit_ledger"] as const;

describe("billing data · account erase (SQL)", () => {
  it("the newest erase_my_data() deletes the caller's billing rows", () => {
    const defs = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS, file), "utf8") }))
      .filter((m) => /create or replace function public\.erase_my_data\(\)/.test(m.sql));
    const latest = defs.at(-1);
    expect(latest, "no erase_my_data() definition found in migrations").toBeDefined();
    for (const table of BILLING_TABLES) {
      expect(
        latest!.sql,
        `${table} is not deleted by erase_my_data() in ${latest!.file}`,
      ).toMatch(new RegExp(`delete from public\\.${table} where user_id = uid;`));
    }
  });
});
