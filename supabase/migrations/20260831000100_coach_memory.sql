-- Bloom — what the coach remembers.
--
-- /coach reads and writes `coach_messages` (the thread) and `coach_memory`
-- (the pinned facts it has learned). Neither table existed in this repo's
-- migrations, so on a fresh project the coach's history never left the device:
-- it worked, but you lost the thread the moment you changed browser.
--
-- The coach keeps its own device copy either way and degrades quietly, so this
-- migration is additive and nothing breaks if you run it later.

create table if not exists public.coach_messages (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('user', 'coach')),
  content     text,
  sources     text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- If coach_messages was already there from an earlier setup, make sure the
-- column the index below needs actually exists. No-op on a fresh project.
alter table public.coach_messages
  add column if not exists created_at timestamptz not null default now();

create index if not exists coach_messages_profile_created_idx
  on public.coach_messages (profile_id, created_at desc);

create table if not exists public.coach_memory (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references auth.users (id) on delete cascade,
  category    text not null default 'context'
                check (category in ('pattern', 'preference', 'goal', 'context')),
  fact        text not null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Same for coach_memory.updated_at — this is the one that stopped the setup
-- with 42703 on projects where the table already existed without it.
alter table public.coach_memory
  add column if not exists updated_at timestamptz not null default now();

create index if not exists coach_memory_profile_updated_idx
  on public.coach_memory (profile_id, updated_at desc);

-- Unpinning a fact is an edit, so keep updated_at honest for the ordering.
create or replace function public.touch_coach_memory_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists coach_memory_touch_updated_at on public.coach_memory;
create trigger coach_memory_touch_updated_at
before update on public.coach_memory
for each row execute function public.touch_coach_memory_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: authenticated owner only. anon is granted nothing.
-- ---------------------------------------------------------------------------
alter table public.coach_messages enable row level security;

drop policy if exists "coach messages owner select" on public.coach_messages;
create policy "coach messages owner select" on public.coach_messages
  for select using (profile_id = auth.uid());

drop policy if exists "coach messages owner insert" on public.coach_messages;
create policy "coach messages owner insert" on public.coach_messages
  for insert with check (profile_id = auth.uid());

drop policy if exists "coach messages owner delete" on public.coach_messages;
create policy "coach messages owner delete" on public.coach_messages
  for delete using (profile_id = auth.uid());

alter table public.coach_memory enable row level security;

drop policy if exists "coach memory owner select" on public.coach_memory;
create policy "coach memory owner select" on public.coach_memory
  for select using (profile_id = auth.uid());

drop policy if exists "coach memory owner insert" on public.coach_memory;
create policy "coach memory owner insert" on public.coach_memory
  for insert with check (profile_id = auth.uid());

drop policy if exists "coach memory owner update" on public.coach_memory;
create policy "coach memory owner update" on public.coach_memory
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "coach memory owner delete" on public.coach_memory;
create policy "coach memory owner delete" on public.coach_memory
  for delete using (profile_id = auth.uid());
