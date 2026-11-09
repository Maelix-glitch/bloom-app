import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REVIEW_TRANSITIONS } from "./review";

/**
 * Static assertions over the Phase 2.2 lifecycle migration.
 *
 * These do not run PostgreSQL — the integration suite does that. They check the
 * things that would be worst to get wrong silently: the SQL graph drifting from
 * the TypeScript one, an importer predicate that authorises the wrong identity,
 * a version rule that forgets a bookkeeping column, and a grant that quietly
 * hands editorial power back to a server key.
 */

const SQL = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261110_vitalis_evidence_lifecycle.sql",
    import.meta.url,
  ),
  "utf8",
);

function functionBlock(signature: string): string {
  const start = SQL.indexOf(`create or replace function public.${signature}`);
  expect(start, `${signature} must be defined`).toBeGreaterThan(-1);
  const open = SQL.indexOf("as $$", start);
  const close = SQL.indexOf("$$;", open);
  expect(close, `${signature} must terminate`).toBeGreaterThan(open);
  return SQL.slice(start, close);
}

function graphPairs(): string[][] {
  const start = SQL.indexOf("from (values");
  const end = SQL.indexOf(") as rule", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return [...SQL.slice(start, end).matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)].map((m) => [
    m[1] as string,
    m[2] as string,
  ]);
}

describe("vitalis evidence lifecycle migration", () => {
  it("is additive: it deletes nothing, drops nothing and touches no health table", () => {
    // Citations may be detached explicitly, with a reason, by an editor. The
    // registry itself must never lose a row to this migration.
    expect(SQL).not.toMatch(
      /delete from public.evidence_(sources|claims|revisions|lifecycle_events)/i,
    );
    expect(SQL).not.toMatch(/drop table/i);
    expect(SQL).not.toMatch(/drop function/i);
    expect(SQL).not.toMatch(/alter table public\.health_/);
    expect(SQL).not.toMatch(/create or replace function public\.erase_my_data/);
  });

  it("expresses exactly the transition graph the domain module does", () => {
    const expected = Object.entries(REVIEW_TRANSITIONS)
      .flatMap(([from, tos]) => tos.map((to) => [from, to]))
      .sort();
    const actual = graphPairs().sort();

    expect(actual).toHaveLength(10);
    expect(actual).toEqual(expected);
  });

  it("never permits a downgrade from approved to draft", () => {
    expect(graphPairs()).not.toContainEqual(["approved", "draft"]);
  });

  it("identifies the importer by session role, never by current_user or membership", () => {
    const predicate = functionBlock("evidence_is_import_session()");

    expect(predicate).toContain("session_user = 'evidence_importer'");
    expect(predicate).toContain("current_setting('bloom.evidence_import', true)");
    expect(predicate).toContain("'off'");
    // A definer context would make current_user the owner; a membership test
    // would be vacuously true for a superuser. Both were rejected by the review.
    expect(predicate).not.toContain("security definer");
    expect(predicate).not.toContain("current_user");
    expect(predicate).not.toContain("pg_has_role");
  });

  it("treats review facts as bookkeeping rather than content", () => {
    const guard = functionBlock("evidence_assert_lifecycle()");

    expect(guard).toContain("'reviewed_on', 'review_interval_months'");
    expect(guard).toContain("old.version + 1");
    expect(guard).toContain("evidence_transition_allowed");
    expect(guard).toContain("needs a reason");
    expect(guard).toContain("supersession on % % is immutable once recorded");
    expect(guard).toContain("with recursive chain");
  });

  it("refuses to strand an approved claim, but keeps supersession available", () => {
    const guard = functionBlock("evidence_assert_source_change_safe()");

    expect(guard).toContain("new.review_status in ('in_review', 'withdrawn')");
    expect(guard).not.toContain("'superseded'");
    expect(guard).toContain("cannot leave approved without a replacement");
  });

  it("refuses approval while a cited source is overdue", () => {
    const gate = functionBlock("evidence_assert_claim_approvable()");

    expect(gate).toContain("is not approved for product use");
    expect(gate).toContain("without a supporting citation");
    expect(gate).toContain("is overdue for review");
    expect(gate).toContain("make_interval(months => s.review_interval_months)");
  });

  it("makes the claim supersession constraint symmetric, validated separately", () => {
    expect(SQL).toContain("constraint evidence_claims_superseded_pair");
    expect(SQL).toContain(
      "check ((review_status = 'superseded') = (superseded_by is not null)) not valid",
    );
    expect(SQL).toContain("validate constraint evidence_claims_superseded_pair");
  });

  it("creates the importer role without a login, a password or BYPASSRLS", () => {
    expect(SQL).toContain("create role evidence_importer nologin");
    expect(SQL).toContain(
      "if not exists (select 1 from pg_roles where rolname = 'evidence_importer')",
    );

    // The role is created once, guarded, and carries no attribute that would let
    // it authenticate or skip a policy.
    const statement = /create role evidence_importer[^;]{0,200}/i.exec(SQL)?.[0] ?? "";
    expect(statement).toContain("nologin");
    expect(statement.toLowerCase()).not.toContain(" password");
    expect(statement.toLowerCase()).not.toContain("bypassrls");
    expect(statement.toLowerCase()).not.toContain(" superuser");
    expect(SQL).not.toMatch(/alter role evidence_importer[^;]{0,80}login/i);
  });

  it("grants the importer sixteen policies and no delete", () => {
    const policies = [...SQL.matchAll(/create policy evidence_\w+_import_\w+/g)];
    expect(policies).toHaveLength(16);
    expect(SQL).not.toMatch(/grant delete on table public\.evidence_\w+ to evidence_importer/);
  });

  it("revokes direct writes from service_role and keeps only reads", () => {
    expect(SQL).toContain(
      "revoke insert, update, delete on table public.evidence_claims from service_role;",
    );
    expect(SQL).toContain(
      "revoke insert, update, delete on table public.evidence_claim_sources from service_role;",
    );
    expect(SQL).not.toMatch(/grant (insert|update|delete)[^;]*to service_role/);
  });

  it("derives the licence flags instead of accepting them from a caller", () => {
    const update = functionBlock("evidence_update_source(");

    expect(update).toContain("product_use_allowed = next_license in");
    expect(update).not.toContain("patch.product_use_allowed");
    expect(update).not.toContain("patch.permission_required");
  });

  it("makes the lifecycle log append-only with the Phase 1 function", () => {
    expect(SQL).toContain("create trigger evidence_lifecycle_events_append_only");
    expect(SQL).toContain("before update on public.evidence_lifecycle_events");
    expect(SQL).toContain("execute function public.health_reject_mutation();");
  });

  it("records a baseline for rows that already carry a reviewed status", () => {
    expect(SQL).toContain("'migration:baseline'");
    expect(SQL).toContain("where s.review_status <> 'draft'");
    expect(SQL).toContain("where c.review_status <> 'draft'");
    // Recorded once, when the log is still empty: a re-apply adds nothing.
    expect(SQL).toMatch(
      /if exists \(select 1 from public\.evidence_lifecycle_events\) then\s+return;/,
    );
  });
});
