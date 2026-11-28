-- Bloom - Phase B (server engine): the engine_shadow_log table.
--
-- Why this exists: the server-engine scope (2026-11-25, owner-approved)
-- moves Bloom's nutrition engines behind a Supabase Edge Function in
-- three steps. Phase B runs the server solver in SHADOW mode: the app
-- still plans with its in-browser engine, and ALSO asks the server
-- engine to compute the same day from the synced record. Neither
-- answer is ever swapped for the other in this phase. What is recorded
-- here is the proof the cutover decision will stand on:
--
--   one row per shadowed plan generation: the day, the client's
--   canonical outcome hash, the server's canonical outcome hash,
--   whether they agree, the server's compute time in whole
--   milliseconds, and the plan method version both sides ran.
--
-- Hashes, never plans: a row cannot reconstruct anyone's meals,
-- targets or health record. The user id is carried only so a
-- disagreement can be investigated on the owner's own test account;
-- account erasure should delete these rows with the rest of the
-- person's server data.
--
-- Service-role only, like latency_samples: RLS is on, there are NO
-- client policies, and every client grant is revoked. The engine
-- function writes with the service-role key after verifying the
-- caller's JWT and reading that caller's record under their own RLS.

create table if not exists public.engine_shadow_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day text not null,
  client_hash text not null,
  server_hash text not null,
  agree boolean not null,
  server_ms integer not null,
  method_version integer not null,
  created_at timestamptz not null default now()
);

create index if not exists engine_shadow_log_created_idx
  on public.engine_shadow_log (created_at desc);

create index if not exists engine_shadow_log_agree_idx
  on public.engine_shadow_log (agree, created_at desc);

alter table public.engine_shadow_log enable row level security;

revoke all on table public.engine_shadow_log from anon, authenticated;
grant select, insert on table public.engine_shadow_log to service_role;
