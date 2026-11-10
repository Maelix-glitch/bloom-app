import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Static security assertions over the Vitalis migration.
 *
 * These do not run PostgreSQL; they check the SQL that will be applied. The
 * behavioural side (RLS actually blocking a second user, the RPC rejecting
 * anonymous callers) needs a live database and is covered by the integration
 * suite described in the Phase 1 report.
 */

const SQL = readFileSync(
  new URL("../../../supabase/migrations/20261104_vitalis_health_foundation.sql", import.meta.url),
  "utf8",
);

const HEALTH_TABLES = [
  "health_profiles",
  "health_observations",
  "health_consents",
  "health_safety_events",
  "health_audit_events",
] as const;

const RPCS = [
  {
    name: "health_record_observation",
    signature: "text, numeric, text, text, timestamptz, text, text, numeric, text",
  },
  { name: "health_set_consent", signature: "text, boolean, text" },
  { name: "health_record_safety_event", signature: "text, jsonb, text" },
] as const;

function functionBlock(name: string): string {
  const start = SQL.indexOf(`create or replace function public.${name}(`);
  expect(start, `${name} must be defined`).toBeGreaterThan(-1);
  const open = SQL.indexOf("as $$", start);
  expect(open, `${name} must have a body`).toBeGreaterThan(start);
  const close = SQL.indexOf("$$;", open);
  expect(close, `${name} must terminate`).toBeGreaterThan(open);
  return SQL.slice(start, close);
}

describe("vitalis migration", () => {
  it("adds the five health tables with row level security enabled", () => {
    for (const table of HEALTH_TABLES) {
      expect(SQL).toContain(`create table if not exists public.${table} (`);
      expect(SQL).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it("scopes every policy to the owning user", () => {
    for (const table of HEALTH_TABLES) {
      expect(SQL).toMatch(
        new RegExp(`on public\\.${table}\\s+for select to authenticated using \\(auth\\.uid\\(\\) = user_id\\);`),
      );
    }
    for (const table of ["health_profiles", "health_observations", "health_consents"]) {
      expect(SQL).toMatch(
        new RegExp(`on public\\.${table}\\s+for insert to authenticated with check \\(auth\\.uid\\(\\) = user_id\\);`),
      );
      expect(SQL).toMatch(new RegExp(`on public\\.${table}\\s+for update to authenticated using \\(auth\\.uid\\(\\) = user_id\\) with check \\(auth\\.uid\\(\\) = user_id\\);`));
      expect(SQL).toMatch(
        new RegExp(`on public\\.${table}\\s+for delete to authenticated using \\(auth\\.uid\\(\\) = user_id\\);`),
      );
    }
  });

  it("keeps safety and audit rows unwritable by clients", () => {
    expect(SQL).not.toMatch(/on public\.health_safety_events\s+for (insert|update|delete)/);
    expect(SQL).not.toMatch(/on public\.health_audit_events\s+for (insert|update|delete)/);
  });

  it("pins a fixed search_path on every definer function", () => {
    for (const rpc of RPCS) {
      const block = functionBlock(rpc.name);
      expect(block).toContain("security definer");
      expect(block).toContain("set search_path = public, auth, pg_temp");
      expect(block).not.toContain("search_path = public;");
    }
  });

  it("requires an authenticated user in every RPC", () => {
    for (const rpc of RPCS) {
      const block = functionBlock(rpc.name);
      expect(block).toContain("uid uuid := auth.uid();");
      expect(block).toContain("if uid is null then");
      expect(block).toContain("errcode = '42501'");
    }
  });

  it("derives ownership from auth.uid() and never from an argument", () => {
    expect(SQL).not.toMatch(/p_user_id|p_uid|p_owner_id/);
    for (const rpc of RPCS) {
      const block = functionBlock(rpc.name);
      expect(block).not.toMatch(/p_user/);
      expect(block).toMatch(/\buid,/);
    }
  });

  it("validates inputs server side", () => {
    const observation = functionBlock("health_record_observation");
    expect(observation).toContain("unsupported observation kind");
    expect(observation).toContain("unsupported observation unit");
    expect(observation).toContain("unsupported observation source");
    expect(observation).toContain("confidence must be between 0 and 1");
    expect(observation).toContain("cannot be in the future");

    const consent = functionBlock("health_set_consent");
    expect(consent).toContain("unsupported consent purpose");
    expect(consent).toContain("policy_version must be 1–64 characters");

    const safety = functionBlock("health_record_safety_event");
    expect(safety).toContain("unsupported safety classification");
    expect(safety).toContain("findings must be a JSON array");
    expect(safety).toContain("ruleId");
  });

  it("revokes PUBLIC and anon, then grants only authenticated", () => {
    for (const rpc of RPCS) {
      const call = `public.${rpc.name}(${rpc.signature})`;
      expect(SQL).toContain(`revoke all on function ${call} from public;`);
      expect(SQL).toContain(`revoke all on function ${call} from anon;`);
      expect(SQL).toContain(`grant execute on function ${call} to authenticated;`);
    }
  });

  it("writes an audit row inside the same transaction as the data", () => {
    for (const rpc of RPCS) {
      expect(functionBlock(rpc.name)).toContain("insert into public.health_audit_events");
    }
  });

  it("extends account erasure to every health table", () => {
    const erase = functionBlock("erase_my_data");
    for (const table of HEALTH_TABLES) {
      expect(erase).toContain(`delete from public.${table} where user_id = uid;`);
      expect(erase).toContain(`'${table}'`);
    }
    expect(SQL.match(/create or replace function public\.erase_my_data\(/g)).toHaveLength(1);
  });

  it("keeps erase_my_data's hardened search_path and grants", () => {
    const erase = functionBlock("erase_my_data");
    expect(erase).toContain("set search_path = public, storage, auth");
    expect(erase).toContain("security definer");
    expect(SQL).toContain("revoke all on function public.erase_my_data() from public;");
    expect(SQL).toContain("grant execute on function public.erase_my_data() to authenticated;");
  });
});
