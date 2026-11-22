import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Grant-only verification (M-208, owner directive 2026-11-22) — the
 * structural pins behind the unit tests:
 *
 *   1. No client source calls — or even names — the retired self-claim
 *      RPC. The grant has no client-reachable path; if the string comes
 *      back into src, a claim path came back with it.
 *   2. The 20261122 migration carries the retirement and the admin
 *      grant/revoke in the trainer pattern (service role only), and
 *      never rewrites existing records at apply time.
 *   3. The settings row speaks the grant-only truth: the eligible-
 *      members line stands, and no step/claim language remains in it.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

describe("grant-only verification (M-208)", () => {
  it("no client source names the retired claim RPC", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (readFileSync(file, "utf8").includes("claim_account_verification")) {
        offenders.push(file.slice(ROOT.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the 20261122 migration retires the claim and installs the admin grant", () => {
    const sql = readFileSync(
      join(ROOT, "supabase/migrations/20261122_verification_grant_only.sql"),
      "utf8",
    );
    expect(sql).toContain("drop function if exists public.claim_account_verification()");
    expect(sql).toContain("create or replace function public.admin_grant_verification(p_email text)");
    expect(sql).toContain("create or replace function public.admin_revoke_verification(p_email text)");
    expect(sql).toContain("grant execute on function public.admin_grant_verification(text) to service_role");
    expect(sql).toContain("grant execute on function public.admin_revoke_verification(text) to service_role");
    /* Existing records are never rewritten at apply time: no top-level
       UPDATE or DELETE against the table (the deletes inside the
       revoke function's body are indented and run only when called). */
    expect(sql).not.toMatch(/^update public\.account_verifications/m);
    expect(sql).not.toMatch(/^delete from public\.account_verifications/m);
    expect(sql).not.toMatch(/^insert into public\.account_verifications/m);
  });

  it("the settings row carries no claim ladder", () => {
    const row = readFileSync(join(SRC, "components/profile/AccountRow.tsx"), "utf8");
    expect(row).toContain("Verification is granted to eligible members.");
    expect(row).not.toContain("steps left");
    expect(row).not.toContain("Recording");
    expect(row).not.toContain("pf-verification-steps");
  });
});
