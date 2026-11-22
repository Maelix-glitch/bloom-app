import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Member badges (M-209, owner directive 2026-11-22) — the structural
 * pins behind the unit tests:
 *
 *   1. No client source calls — or even names — the admin grant/revoke
 *      functions. Badges are granted from a trusted session only; if
 *      the strings come back into src, a client grant path came back
 *      with them.
 *   2. The member_badges table is read in exactly one client file
 *      (the badge facts service) and written NOWHERE in src: no
 *      insert / update / delete / upsert rides along in any file that
 *      names the table.
 *   3. The 20261122 member-badges migration carries the table with the
 *      exact ('founder','tester') check, the own-row read policy, the
 *      service-role-only grant/revoke in the M-208 pattern, the
 *      search_profiles extension, and the erase_my_data restatement
 *      every new per-person table owes — and writes no existing rows
 *      at apply time.
 *   4. The settings face speaks the grant truth: the badges row says
 *      badges are granted by Bloom, and appears only for holders.
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

const MIGRATION = join(ROOT, "supabase/migrations/20261122_member_badges.sql");

describe("member badges (M-209)", () => {
  it("no client source names the admin grant or revoke functions", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      if (text.includes("admin_grant_badge") || text.includes("admin_revoke_badge")) {
        offenders.push(file.slice(ROOT.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("member_badges is read in one service file and written nowhere in src", () => {
    const readers: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      if (!/from\(\s*["']member_badges["']\s*\)/.test(text)) continue;
      readers.push(file.slice(ROOT.length + 1));
      expect(text, file).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
    }
    expect(readers).toEqual(["src/lib/profile/badgeService.ts"]);
  });

  it("the migration builds the table with the exact badge check and own-row reads", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("create table if not exists public.member_badges");
    expect(sql).toContain("check (badge in ('founder', 'tester'))");
    expect(sql).toContain('create policy "member_badges self select"');
    expect(sql).toContain("grant select on public.member_badges to authenticated");
    /* No client write grant of any kind. */
    expect(sql).not.toMatch(/grant (insert|update|delete) on public\.member_badges/);
  });

  it("the migration's grant and revoke are service-role only, in the M-208 pattern", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain(
      "create or replace function public.admin_grant_badge(p_email text, p_badge text)",
    );
    expect(sql).toContain(
      "create or replace function public.admin_revoke_badge(p_email text, p_badge text)",
    );
    expect(sql).toContain(
      "revoke all on function public.admin_grant_badge(text, text) from public, anon, authenticated",
    );
    expect(sql).toContain(
      "revoke all on function public.admin_revoke_badge(text, text) from public, anon, authenticated",
    );
    expect(sql).toContain(
      "grant execute on function public.admin_grant_badge(text, text) to service_role",
    );
    expect(sql).toContain(
      "grant execute on function public.admin_revoke_badge(text, text) to service_role",
    );
    /* Unknown accounts are refused the same way as the house grants. */
    expect(sql).toContain("errcode = '22023'");
  });

  it("the companion migration restates erase_my_data with the member_badges delete", () => {
    /* A new per-person table joins the erase function in the same
       slice — the eraseCoverage guard's whole point. The restatement
       lives in its own file: the coverage check reads the newest
       erase-defining file whole and requires every delete in it to be
       uid-scoped, and the revoke function's target-scoped delete must
       not share that file. The delete is uid-scoped, like every other
       in the function. */
    const sql = readFileSync(
      join(ROOT, "supabase/migrations/20261122_member_badges_erase.sql"),
      "utf8",
    );
    expect(sql).toContain("create or replace function public.erase_my_data()");
    expect(sql).toContain("delete from public.member_badges where user_id = uid");
    /* And the main migration carries no erase definition of its own. */
    expect(readFileSync(MIGRATION, "utf8")).not.toContain(
      "create or replace function public.erase_my_data()",
    );
  });

  it("the migration writes no rows at apply time", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).not.toMatch(/^insert into public\./m);
    expect(sql).not.toMatch(/^update public\./m);
    expect(sql).not.toMatch(/^delete from public\./m);
  });

  it("the migration extends search_profiles with the badge facts", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("drop function if exists public.search_profiles(text)");
    expect(sql).toContain("is_trainer boolean");
    expect(sql).toContain("badges text[]");
    expect(sql).toContain("grant execute on function public.search_profiles(text) to authenticated");
  });

  it("the settings row states the grant truth", () => {
    const row = readFileSync(join(SRC, "components/profile/AccountRow.tsx"), "utf8");
    expect(row).toContain("Badges are granted by Bloom.");
    expect(row).toContain('data-testid="pf-row-badges"');
  });
});
