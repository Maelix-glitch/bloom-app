/**
 * The M-242 migration's shape, pinned from the SQL text the way
 * the billing migrations pin theirs (the database is only ever
 * migrated with the owner's approval, so the repo file is the
 * contract): one service-role-only samples table with no
 * per-person column anywhere in it, and the percentiles view
 * computing p50 / p95 / p99 per route over 24h and 7d.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261125_latency_observability.sql"),
  "utf8",
);
const lower = sql.toLowerCase();

describe("M-242 latency_samples table", () => {
  it("creates the table with the contracted columns", () => {
    expect(lower).toContain("create table if not exists public.latency_samples (");
    expect(lower).toContain("created_at timestamptz not null default now()");
    expect(lower).toContain("route text not null");
    expect(lower).toContain("method text not null");
    expect(lower).toContain("status integer not null");
    expect(lower).toContain("duration_ms integer not null");
    expect(lower).toContain("check (duration_ms >= 0)");
    expect(lower).toContain("region text");
  });

  it("indexes (route, created_at) for the percentile windows", () => {
    expect(lower).toContain("on public.latency_samples (route, created_at desc)");
  });

  it("carries NO per-person column, so erasure has nothing to remove", () => {
    const body = lower.slice(
      lower.indexOf("create table if not exists public.latency_samples ("),
      lower.indexOf(");", lower.indexOf("create table if not exists public.latency_samples (")),
    );
    for (const col of ["user_id", "profile_id", "owner_id", "sender_id", "viewer_id"]) {
      expect(body).not.toContain(col);
    }
  });

  it("is service-role only: RLS on, client grants revoked, no policies", () => {
    expect(lower).toContain("alter table public.latency_samples enable row level security;");
    expect(lower).toContain("revoke all on public.latency_samples from anon;");
    expect(lower).toContain("revoke all on public.latency_samples from authenticated;");
    expect(lower).toContain("on public.latency_samples to service_role;");
    expect(lower).not.toMatch(/create policy "[^"]+" on public\.latency_samples\b/);
  });
});

describe("M-242 latency_percentiles view", () => {
  it("computes p50, p95 and p99 with percentile_cont", () => {
    expect(lower).toContain("create or replace view public.latency_percentiles");
    expect(lower).toContain("percentile_cont(0.5) within group (order by duration_ms)");
    expect(lower).toContain("percentile_cont(0.95) within group (order by duration_ms)");
    expect(lower).toContain("percentile_cont(0.99) within group (order by duration_ms)");
  });

  it("covers both windows, 24h and 7d, grouped by route", () => {
    expect(lower).toContain("interval '24 hours'");
    expect(lower).toContain("interval '7 days'");
    expect(lower).toContain("'24h' as window");
    expect(lower).toContain("'7d' as window");
    expect(lower).toContain("group by route");
  });

  it("is readable by the service role alone", () => {
    expect(lower).toContain("revoke all on public.latency_percentiles from anon;");
    expect(lower).toContain("revoke all on public.latency_percentiles from authenticated;");
    expect(lower).toContain("revoke all on public.latency_percentiles from public;");
    expect(lower).toContain("grant select on public.latency_percentiles to service_role;");
  });
});
