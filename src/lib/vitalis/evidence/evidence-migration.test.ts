import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Static assertions over the Phase 2 evidence migration.
 *
 * These do not run PostgreSQL. They check the SQL that will be applied, in the
 * same way the Phase 1 migration test does, and they cover the two things that
 * would be worst to get wrong silently: a source be allowed to license itself,
 * and Phase 1's erasure being quietly rewritten.
 */

const SQL = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106_vitalis_evidence_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

const EVIDENCE_TABLES = [
  "evidence_sources",
  "evidence_claims",
  "evidence_claim_sources",
  "evidence_recommendations",
  "evidence_recommendation_claims",
  "evidence_revisions",
] as const;

function functionBlock(name: string): string {
  const start = SQL.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} must be defined`).toBeGreaterThan(-1);
  const open = SQL.indexOf("as $$", start);
  const close = SQL.indexOf("$$;", open);
  expect(close, `${name} must terminate`).toBeGreaterThan(open);
  return SQL.slice(start, close);
}

describe("vitalis evidence migration", () => {
  it("creates every evidence table with row level security", () => {
    for (const table of EVIDENCE_TABLES) {
      expect(SQL).toContain(`create table if not exists public.${table} (`);
      expect(SQL).toContain(`alter table public.${table} enable row level security;`);
      expect(SQL).toContain(`create policy ${table}_read on public.${table}`);
    }
  });

  it("is additive: it never redefines erase_my_data or deletes anything", () => {
    // Evidence is global reference data. If this migration ever grows an erasure
    // block, that is a design change requiring review, not a tidy-up.
    expect(SQL).not.toMatch(/create or replace function public\.erase_my_data/);
    expect(SQL).not.toMatch(/drop function/i);
    expect(SQL).not.toMatch(/delete from/i);
    expect(SQL).not.toMatch(/drop table/i);
    expect(SQL).not.toMatch(/alter table public\.health_/);
  });

  it("lets only the permissive licences be marked usable", () => {
    expect(SQL).toContain("constraint evidence_sources_license_consistent check (");
    expect(SQL).toMatch(
      /product_use_allowed = \(license_id in \('us-public-domain', 'cc0-1\.0', 'cc-by-4\.0'\)\)/,
    );
    expect(SQL).toMatch(
      /permission_required = \(\s*license_id in \(\s*'fao-noncommercial', 'nin-copyright-restricted',\s*'proprietary-permission-required', 'unknown'\s*\)\s*\)/,
    );
  });

  it("refuses to approve a claim on a source we may not ship", () => {
    const gate = functionBlock("evidence_assert_claim_approvable");
    expect(gate).toContain("security definer");
    expect(gate).toContain("set search_path = public, pg_temp");
    expect(gate).toContain("s.product_use_allowed");
    expect(gate).toContain("is not approved for product use");
    expect(gate).toContain("without a supporting citation");
    expect(SQL).toContain("create trigger evidence_claims_approvable");
    expect(SQL).toContain("before insert or update on public.evidence_claims");
  });

  it("refuses to attach an unusable source to an approved claim", () => {
    const gate = functionBlock("evidence_assert_link_licensed");
    expect(gate).toContain("not approved for product use");
    expect(SQL).toContain("create trigger evidence_claim_sources_licensed");
  });

  it("makes the history append-only using the Phase 1 trigger function", () => {
    expect(SQL).toContain("create trigger evidence_revisions_append_only");
    expect(SQL).toContain("before update on public.evidence_revisions");
    expect(SQL).toContain("execute function public.health_reject_mutation();");
  });

  it("requires approved rows to record when they were reviewed", () => {
    expect(SQL).toContain("constraint evidence_sources_approved_reviewed check (");
    expect(SQL).toContain("constraint evidence_claims_approved_reviewed check (");
    expect(SQL).toContain("review_status <> 'approved' or reviewed_on is not null");
  });

  it("requires non-strong claims to declare uncertainty", () => {
    expect(SQL).toContain("constraint evidence_claims_uncertainty_declared check (");
    expect(SQL).toContain("grade = 'strong' or jsonb_array_length(uncertainty) > 0");
  });

  it("revokes anon and grants signed-in readers read-only access", () => {
    for (const table of EVIDENCE_TABLES) {
      expect(SQL).toContain(`revoke all on table public.${table} from anon;`);
      expect(SQL).toContain(`grant select on table public.${table} to authenticated;`);
      expect(SQL).not.toContain(`grant insert on table public.${table} to authenticated;`);
      expect(SQL).not.toContain(`grant update on table public.${table} to authenticated;`);
      expect(SQL).not.toContain(`grant delete on table public.${table} to authenticated;`);
    }
  });

  it("gives no role the right to rewrite the history", () => {
    expect(SQL).toContain(
      "grant select, insert on table public.evidence_revisions to service_role;",
    );
    expect(SQL).not.toContain("update on table public.evidence_revisions to service_role");
    expect(SQL).not.toContain("delete on table public.evidence_revisions to service_role");
  });

  it("requires a locator on every citation", () => {
    expect(SQL).toContain("locator text not null check (char_length(locator) between 3 and 300)");
  });

  it("requires sources to be https so a reviewer can open them", () => {
    expect(SQL).toContain("url text not null check (url ~ '^https://')");
  });
});
