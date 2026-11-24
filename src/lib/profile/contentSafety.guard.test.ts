import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Content safety (M-232, App Store audit #14) — the structural pins:
 *
 *   1. The 20261124 migration builds content_reports + user_blocks with
 *      RLS on, the own-row policies, and no client write path beyond a
 *      reporter inserting their own report and a blocker managing
 *      their own blocks — the grant tables' posture.
 *   2. Moderation reads exist only as the two admin RPCs, gated on
 *      is_rewards_admin() in the migration; the client reaches reports
 *      and blocks through exactly one service file.
 *   3. The block is wired into the real data paths: both public-profile
 *      and people-search RPCs are restated block-aware, and the erase
 *      companion restates erase_my_data with both tables' deletes.
 *   4. The AI consent gate (audit #9) sits in the Coach pipeline before
 *      the provider call, and the Settings consent section carries the
 *      ai_assistance switch.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const MIGRATIONS = join(ROOT, "supabase/migrations");
const MIGRATION = join(MIGRATIONS, "20261124_content_safety.sql");
const ERASE = join(MIGRATIONS, "20261124_content_safety_erase.sql");

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

describe("content safety (M-232)", () => {
  it("the migration builds both tables with RLS and own-row policies", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("create table if not exists public.content_reports");
    expect(sql).toContain("check (target_kind in ('story', 'profile', 'reply'))");
    expect(sql).toContain("check (reason in ('spam', 'harassment', 'inappropriate', 'other'))");
    expect(sql).toContain("alter table public.content_reports enable row level security");
    expect(sql).toContain('create policy "content_reports self insert"');
    expect(sql).toContain('create policy "content_reports self select"');
    expect(sql).toContain("grant select, insert on public.content_reports to authenticated");
    /* No client update/delete on reports, ever. */
    expect(sql).not.toMatch(/grant (update|delete)[^;]*on public\.content_reports/);

    expect(sql).toContain("create table if not exists public.user_blocks");
    expect(sql).toContain("check (blocker_id <> blocked_id)");
    expect(sql).toContain("alter table public.user_blocks enable row level security");
    expect(sql).toContain('create policy "user_blocks pair select"');
    expect(sql).toContain('create policy "user_blocks self insert"');
    expect(sql).toContain('create policy "user_blocks self delete"');
    expect(sql).toContain("grant select, insert, delete on public.user_blocks to authenticated");
  });

  it("moderation is admin-RPC only, gated like the grant tables", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("create or replace function public.admin_list_content_reports");
    expect(sql).toContain("create or replace function public.admin_set_report_status");
    expect(sql).toContain("if not public.is_rewards_admin() then");
    expect(sql).toContain(
      "revoke all on function public.admin_list_content_reports(text) from public, anon",
    );
    expect(sql).toContain(
      "revoke all on function public.admin_set_report_status(uuid, text) from public, anon",
    );
    /* The migration writes no rows at apply time. */
    expect(sql).not.toMatch(/^insert into public\./m);
    expect(sql).not.toMatch(/^update public\./m);
    expect(sql).not.toMatch(/^delete from public\./m);
    /* And it carries no erase definition of its own — that is the
       companion file's job. */
    expect(sql).not.toContain("create or replace function public.erase_my_data()");
  });

  it("the block is wired into the profile and search RPCs", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("create or replace function public.get_public_bloom_profile(p_username text)");
    expect(sql).toContain("'user_id', v_profile.id");
    expect(sql).toContain("create or replace function public.search_profiles(p_term text)");
    /* Both restatements consult user_blocks. */
    expect(sql.match(/from public\.user_blocks/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("the companion migration restates erase_my_data with both tables' deletes", () => {
    const sql = readFileSync(ERASE, "utf8");
    expect(sql).toContain("create or replace function public.erase_my_data()");
    expect(sql).toContain("delete from public.content_reports where reporter_id = uid");
    expect(sql).toContain("delete from public.content_reports where target_user_id = uid");
    expect(sql).toContain(
      "delete from public.user_blocks where blocker_id = uid or blocked_id = uid",
    );
  });

  it("the safety tables and admin RPCs are named in exactly one client file", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = file.slice(ROOT.length + 1);
      if (rel === "src/lib/profile/safetyService.ts") continue;
      const text = readFileSync(file, "utf8");
      if (
        /from\(\s*["'](content_reports|user_blocks)["']\s*\)/.test(text) ||
        text.includes("admin_list_content_reports") ||
        text.includes("admin_set_report_status")
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the Coach pipeline consults the consent gate before the provider call", () => {
    const chat = readFileSync(join(SRC, "hooks/useCoachChat.ts"), "utf8");
    const gateAt = chat.indexOf("ensureAiConsentRef.current()");
    const providerAt = chat.indexOf("coach.requestResponse({");
    expect(gateAt).toBeGreaterThan(-1);
    expect(providerAt).toBeGreaterThan(gateAt);
    /* The gate is also before the message is appended to the thread. */
    const appendAt = chat.indexOf("coach.setMessages(() => pendingHistory)");
    expect(appendAt).toBeGreaterThan(gateAt);
  });

  it("the Settings consent section carries the ai_assistance switch", () => {
    const section = readFileSync(join(SRC, "components/profile/ConsentSection.tsx"), "utf8");
    expect(section).toContain('data-testid="pf-consent-ai"');
    expect(section).toContain('consentDecision("ai_assistance", false)');
    expect(section).toContain('consentDecision("ai_assistance", true)');
    expect(section).toContain("ElevenLabs");
  });
});
