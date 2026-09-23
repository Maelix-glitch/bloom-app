-- Bloom Ghost + Garden — Duel Links + Living Garden
-- One table for ghosts, one for participants, derived garden (no table)

create table if not exists public.duel_ghosts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code)=6 and code = upper(code)),
  owner uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('self','pair','link')),
  spec jsonb not null,
  target int not null check (target > 0),
  title text not null,
  detail text not null,
  period_start date not null,
  period_end date not null,
  ghost_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  constraint ghost_period_valid check (period_end >= period_start)
);

create table if not exists public.duel_participants (
  ghost_id uuid not null references public.duel_ghosts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  progress int not null default 0 check (progress >= 0),
  joined_at timestamptz not null default now(),
  primary key (ghost_id, profile_id)
);

create index if not exists duel_ghosts_owner_idx on public.duel_ghosts(owner);
create index if not exists duel_ghosts_code_idx on public.duel_ghosts(code);
create index if not exists duel_ghosts_expires_idx on public.duel_ghosts(expires_at);
create index if not exists duel_participants_profile_idx on public.duel_participants(profile_id);

alter table public.duel_ghosts enable row level security;
alter table public.duel_participants enable row level security;

revoke all on public.duel_ghosts from anon, authenticated;
revoke all on public.duel_participants from anon, authenticated;

-- Owner can manage their ghosts
drop policy if exists duel_ghosts_owner_all on public.duel_ghosts;
create policy duel_ghosts_owner_all on public.duel_ghosts for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists duel_participants_self_all on public.duel_participants;
create policy duel_participants_self_all on public.duel_participants for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Public ghost view via security definer (so anon can see shared link)
create or replace function public.get_ghost(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(g) || jsonb_build_object('participants',
    coalesce((select jsonb_agg(to_jsonb(p)) from public.duel_participants p where p.ghost_id = g.id), '[]'::jsonb)
  )
  from public.duel_ghosts g
  where g.code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_ghost(text) from public;
grant execute on function public.get_ghost(text) to anon, authenticated;

-- Helper to generate 6-char code
create or replace function public.generate_ghost_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random()*char_length(chars)+1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Create ghost RPC (enforces free:1 active, plus:5 — for now 1 active for all, plus check later)
create or replace function public.create_ghost(
  p_kind text,
  p_spec jsonb,
  p_target int,
  p_title text,
  p_detail text,
  p_period_start date,
  p_period_end date,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
  v_count int;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  if p_kind not in ('self','pair','link') then raise exception 'Invalid kind'; end if;

  -- free limit: 1 active ghost
  select count(*) into v_count from public.duel_ghosts where owner = auth.uid() and expires_at > now();
  if v_count >= 1 then
    -- allow plus to have 5 via is_rewards_admin or future entitlement; for now soft limit 1, allow anyway with note
    -- to keep it permissive for launch, just allow up to 5
    if v_count >= 5 then raise exception 'Ghost limit reached (5 active)' using errcode='42501'; end if;
  end if;

  loop
    v_code := public.generate_ghost_code();
    exit when not exists (select 1 from public.duel_ghosts where code = v_code);
  end loop;

  insert into public.duel_ghosts (code, owner, kind, spec, target, title, detail, period_start, period_end, ghost_snapshot)
  values (v_code, auth.uid(), p_kind, p_spec, p_target, p_title, p_detail, p_period_start, p_period_end, p_snapshot)
  returning id into v_id;

  insert into public.duel_participants (ghost_id, profile_id, progress) values (v_id, auth.uid(), 0)
  on conflict do nothing;

  return public.get_ghost(v_code);
end;
$$;

revoke all on function public.create_ghost(text, jsonb, int, text, text, date, date, jsonb) from public;
grant execute on function public.create_ghost(text, jsonb, int, text, text, date, date, jsonb) to authenticated;

-- Join ghost RPC
create or replace function public.join_ghost(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ghost public.duel_ghosts%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated' using errcode='42501'; end if;
  select * into v_ghost from public.duel_ghosts where code = upper(trim(p_code));
  if not found then raise exception 'Ghost not found' using errcode='02000'; end if;
  if v_ghost.expires_at < now() then raise exception 'Ghost expired' using errcode='42501'; end if;

  insert into public.duel_participants (ghost_id, profile_id) values (v_ghost.id, auth.uid())
  on conflict do nothing;

  return public.get_ghost(p_code);
end;
$$;

revoke all on function public.join_ghost(text) from public;
grant execute on function public.join_ghost(text) to authenticated;

-- Enable realtime
alter publication supabase_realtime add table public.duel_ghosts;
alter publication supabase_realtime add table public.duel_participants;
