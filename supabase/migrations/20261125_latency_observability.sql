-- Bloom - M-242 Observability v1: the latency_samples table and the
-- latency_percentiles view.
--
-- Why this exists: the 111-concept backend audit (2026-11-23) found
-- exactly two missing pieces in Bloom's backend: alerts (#62) and
-- p99 latency (#93). Bloom had NO record of how long any request
-- actually took, so "is the app slow?" could only ever be answered
-- by anecdote. This migration is the storage half of the fix; the
-- sampler lives in the Worker's server entry (src/server.ts +
-- src/lib/observability/latency.ts) and the health endpoint the
-- future alert check will watch is /api/health
-- (src/lib/observability/health.ts).
--
-- What this migration creates:
--
--   1. `public.latency_samples` - one row per SAMPLED app request:
--      the route (URL pathname), the HTTP method, the response
--      status, the server-side duration in whole milliseconds, and
--      the Cloudflare colo that served it when known. The sampler
--      records roughly 1 in 10 requests plus every request slower
--      than 1000 ms, so the table stays small (thousands of rows a
--      day at current traffic, not millions). There is NO
--      per-person data here: no user id, no IP, no headers, no
--      query string - a route, a method, a status and a duration
--      cannot identify anyone, so account erasure has nothing to
--      remove from this table (the erase census agrees: it only
--      tracks tables carrying a per-person column).
--
--   2. `public.latency_percentiles` - a view computing p50, p95
--      and p99 duration per route over two trailing windows
--      ('24h' and '7d'), using percentile_cont, the same linear
--      interpolation the TS reference implementation in
--      src/lib/observability/latency.ts is tested against. The
--      alert check and any future admin surface read THIS, never
--      the raw samples.
--
-- Both objects are service-role only: RLS is on for the table,
-- there are NO client policies, every client grant is revoked,
-- and the view's select is granted to service_role alone. The
-- sampler writes through PostgREST with the service-role key,
-- which never leaves the server.
--
-- Retention: samples are operational exhaust, not a record. A
-- pruning job (delete rows older than 30 days) is a deliberate
-- follow-up, not part of this slice; at the sampled rate the
-- table stays small for a long time without one.
--
-- NOT APPLIED to the live project by this file's existence:
-- migrations ship in the repo and are applied with the owner's
-- approval. Until this one lands, the sampler's inserts fail
-- silently (by design - a failed insert never affects a response)
-- and /api/health reports the database as unreachable.

-- ---------------------------------------------------------------------------
-- 1. latency_samples - one row per sampled request
-- ---------------------------------------------------------------------------
create table if not exists public.latency_samples (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  route text not null,
  method text not null,
  status integer not null,
  duration_ms integer not null check (duration_ms >= 0),
  region text
);

create index if not exists latency_samples_route_created_idx
  on public.latency_samples (route, created_at desc);

alter table public.latency_samples enable row level security;

revoke all on public.latency_samples from anon;
revoke all on public.latency_samples from authenticated;
grant select, insert, update, delete on public.latency_samples to service_role;

-- ---------------------------------------------------------------------------
-- 2. latency_percentiles - p50 / p95 / p99 per route, 24h and 7d
-- ---------------------------------------------------------------------------
create or replace view public.latency_percentiles as
  select
    route,
    '24h' as window,
    count(*) as samples,
    round(percentile_cont(0.5) within group (order by duration_ms))::integer as p50_ms,
    round(percentile_cont(0.95) within group (order by duration_ms))::integer as p95_ms,
    round(percentile_cont(0.99) within group (order by duration_ms))::integer as p99_ms
  from public.latency_samples
  where created_at >= now() - interval '24 hours'
  group by route
  union all
  select
    route,
    '7d' as window,
    count(*) as samples,
    round(percentile_cont(0.5) within group (order by duration_ms))::integer as p50_ms,
    round(percentile_cont(0.95) within group (order by duration_ms))::integer as p95_ms,
    round(percentile_cont(0.99) within group (order by duration_ms))::integer as p99_ms
  from public.latency_samples
  where created_at >= now() - interval '7 days'
  group by route;

revoke all on public.latency_percentiles from anon;
revoke all on public.latency_percentiles from authenticated;
revoke all on public.latency_percentiles from public;
grant select on public.latency_percentiles to service_role;
