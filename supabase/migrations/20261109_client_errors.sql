-- Error telemetry sink (Wave 3, 2026-11-09).
--
-- Until now Bloom had NO error telemetry: report() wrote to the console
-- and the failure vanished. The client now batches scoped error reports
-- (plus uncaught window errors / unhandled rejections) into this table.
--
-- Privacy shape: clients can only INSERT, and only as themselves —
-- profile_id must be null (guest / pre-auth errors, e.g. the access
-- gate) or the caller's own id. There is deliberately NO select policy:
-- nobody reads this through the client API. The owner reads it with
-- their own database access when diagnosing.

create table public.client_errors (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles (id) on delete set null,
  scope text not null,
  message text not null,
  stack text,
  route text,
  user_agent text,
  occurrences integer not null default 1,
  created_at timestamptz not null default now()
);

create index client_errors_created_at_idx on public.client_errors (created_at desc);
create index client_errors_scope_idx on public.client_errors (scope);

alter table public.client_errors enable row level security;

create policy "anyone can report an error" on public.client_errors
  for insert to anon, authenticated
  with check (profile_id is null or profile_id = auth.uid());
