-- Bloom reward delivery system
-- Run this migration in Supabase before using /admin/rewards.
-- Admin access is granted only by inserting a user id into app_admins from a
-- trusted SQL session. Never expose the service-role key in the browser.

create extension if not exists pgcrypto;

do $$ begin
  create type public.reward_state as enum ('draft', 'published', 'revoked', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.reward_delivery_state as enum ('published', 'claimed', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '',
  image_url text,
  reward_type text not null default 'recognition' check (char_length(trim(reward_type)) between 1 and 60),
  value_details text,
  admin_message text,
  state public.reward_state not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  publish_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_dates_are_valid check (expires_at is null or publish_at is null or expires_at > publish_at)
);

create table if not exists public.reward_assignments (
  reward_id uuid not null references public.reward_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state public.reward_delivery_state not null default 'published',
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (reward_id, user_id)
);

create index if not exists reward_items_state_publish_idx
  on public.reward_items (state, publish_at, expires_at);
create index if not exists reward_assignments_user_state_idx
  on public.reward_assignments (user_id, state, created_at desc);

create or replace function public.touch_reward_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reward_items_touch_updated_at on public.reward_items;
create trigger reward_items_touch_updated_at
before update on public.reward_items
for each row execute function public.touch_reward_updated_at();

create or replace function public.is_rewards_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_rewards_admin() from public;
grant execute on function public.is_rewards_admin() to authenticated;

alter table public.app_admins enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_assignments enable row level security;

revoke all on public.app_admins from anon, authenticated;
revoke all on public.reward_items from anon, authenticated;
revoke all on public.reward_assignments from anon, authenticated;

grant select on public.reward_items to authenticated;
grant select on public.reward_assignments to authenticated;

-- A user can only read an assignment addressed to their auth uid. The reward
-- itself must be published, within its publication window, and not expired.
-- Admins can inspect all rows through the security-definer admin functions.
drop policy if exists reward_items_user_read on public.reward_items;
create policy reward_items_user_read
on public.reward_items
for select
to authenticated
using (
  exists (
    select 1
    from public.reward_assignments assignment
    where assignment.reward_id = reward_items.id
      and assignment.user_id = auth.uid()
      and assignment.state in ('published', 'claimed')
      and reward_items.state = 'published'
      and (reward_items.publish_at is null or reward_items.publish_at <= now())
      and (
        reward_items.expires_at is null
        or reward_items.expires_at > now()
        or assignment.state = 'claimed'
      )
  )
  or public.is_rewards_admin()
);

drop policy if exists reward_assignments_user_read on public.reward_assignments;
create policy reward_assignments_user_read
on public.reward_assignments
for select
to authenticated
using (user_id = auth.uid() or public.is_rewards_admin());

-- User-facing query. It never accepts a user id from the browser; auth.uid()
-- is supplied by Supabase's signed JWT.
create or replace function public.get_my_rewards()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  reward_type text,
  value_details text,
  admin_message text,
  publish_at timestamptz,
  expires_at timestamptz,
  delivery_state text,
  claimed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    item.id,
    item.title,
    item.description,
    item.image_url,
    item.reward_type,
    item.value_details,
    item.admin_message,
    item.publish_at,
    item.expires_at,
    assignment.state::text as delivery_state,
    assignment.claimed_at
  from public.reward_items item
  join public.reward_assignments assignment on assignment.reward_id = item.id
  where assignment.user_id = auth.uid()
    and assignment.state in ('published', 'claimed')
    and item.state = 'published'
    and (item.publish_at is null or item.publish_at <= now())
    and (
      item.expires_at is null
      or item.expires_at > now()
      or assignment.state = 'claimed'
    )
  order by coalesce(item.publish_at, item.created_at) desc;
$$;

grant execute on function public.get_my_rewards() to authenticated;

-- Claiming is the only user write path. A normal user cannot update an
-- assignment directly, publish an item, or choose another user's id.
create or replace function public.claim_reward(p_reward_id uuid)
returns table (
  id uuid,
  title text,
  delivery_state text,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.reward_items;
begin
  select item.* into selected
  from public.reward_items item
  join public.reward_assignments assignment on assignment.reward_id = item.id
  where item.id = p_reward_id
    and assignment.user_id = auth.uid()
    and assignment.state = 'published'
    and item.state = 'published'
    and (item.publish_at is null or item.publish_at <= now())
    and (item.expires_at is null or item.expires_at > now())
  for update of item;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'This reward is not available to the current user.';
  end if;

  update public.reward_assignments assignment
  set state = 'claimed', claimed_at = now()
  where assignment.reward_id = p_reward_id
    and assignment.user_id = auth.uid()
    and assignment.state = 'published';

  return query
  select selected.id, selected.title, 'claimed'::text, now();
end;
$$;

grant execute on function public.claim_reward(uuid) to authenticated;

-- Admin-only user directory for recipient selection. It returns only the
-- fields needed by the admin form and cannot be called by normal users.
create or replace function public.admin_list_reward_users()
returns table (
  user_id uuid,
  email text,
  display_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  return query
  select
    users.id,
    users.email::text,
    coalesce(
      users.raw_user_meta_data ->> 'display_name',
      users.raw_user_meta_data ->> 'name',
      users.email
    )::text
  from auth.users users
  order by coalesce(users.raw_user_meta_data ->> 'display_name', users.email);
end;
$$;

grant execute on function public.admin_list_reward_users() to authenticated;

create or replace function public.admin_list_rewards()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  reward_type text,
  value_details text,
  admin_message text,
  state text,
  publish_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  recipient_ids uuid[],
  assignment_states jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  return query
  select
    item.id,
    item.title,
    item.description,
    item.image_url,
    item.reward_type,
    item.value_details,
    item.admin_message,
    case
      when item.state = 'published' and item.expires_at is not null and item.expires_at <= now()
        then 'expired'
      else item.state::text
    end as state,
    item.publish_at,
    item.expires_at,
    item.created_at,
    coalesce(array_agg(assignment.user_id) filter (where assignment.user_id is not null), '{}'::uuid[]) as recipient_ids,
    coalesce(
      jsonb_agg(
        jsonb_build_object('user_id', assignment.user_id, 'state', assignment.state::text, 'claimed_at', assignment.claimed_at)
      ) filter (where assignment.user_id is not null),
      '[]'::jsonb
    ) as assignment_states
  from public.reward_items item
  left join public.reward_assignments assignment on assignment.reward_id = item.id
  group by item.id
  order by item.created_at desc;
end;
$$;

grant execute on function public.admin_list_rewards() to authenticated;

create or replace function public.admin_create_reward(
  p_title text,
  p_description text default '',
  p_image_url text default null,
  p_reward_type text default 'recognition',
  p_value_details text default null,
  p_admin_message text default null,
  p_publish_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  if p_expires_at is not null and p_publish_at is not null and p_expires_at <= p_publish_at then
    raise exception using errcode = '22023', message = 'Expiration must be after publication.';
  end if;

  insert into public.reward_items (
    title, description, image_url, reward_type, value_details, admin_message,
    created_by, publish_at, expires_at, state
  ) values (
    trim(p_title), coalesce(p_description, ''), nullif(trim(p_image_url), ''),
    trim(p_reward_type), nullif(trim(p_value_details), ''), nullif(trim(p_admin_message), ''),
    auth.uid(), p_publish_at, p_expires_at, 'draft'
  ) returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.admin_create_reward(text, text, text, text, text, text, timestamptz, timestamptz) to authenticated;

create or replace function public.admin_update_reward(
  p_reward_id uuid,
  p_title text,
  p_description text default '',
  p_image_url text default null,
  p_reward_type text default 'recognition',
  p_value_details text default null,
  p_admin_message text default null,
  p_publish_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  if p_expires_at is not null and p_publish_at is not null and p_expires_at <= p_publish_at then
    raise exception using errcode = '22023', message = 'Expiration must be after publication.';
  end if;

  update public.reward_items
  set title = trim(p_title),
      description = coalesce(p_description, ''),
      image_url = nullif(trim(p_image_url), ''),
      reward_type = trim(p_reward_type),
      value_details = nullif(trim(p_value_details), ''),
      admin_message = nullif(trim(p_admin_message), ''),
      publish_at = p_publish_at,
      expires_at = p_expires_at
  where id = p_reward_id;

  if not found then
    raise exception using errcode = '22023', message = 'Reward not found.';
  end if;
end;
$$;

grant execute on function public.admin_update_reward(uuid, text, text, text, text, text, text, timestamptz, timestamptz) to authenticated;

create or replace function public.admin_publish_reward(
  p_reward_id uuid,
  p_user_ids uuid[],
  p_publish_at timestamptz default now(),
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  reward_row public.reward_items;
  unknown_count integer;
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  if coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception using errcode = '22023', message = 'Select at least one recipient before publishing.';
  end if;

  if p_expires_at is not null and p_expires_at <= p_publish_at then
    raise exception using errcode = '22023', message = 'Expiration must be after publication.';
  end if;

  select * into reward_row from public.reward_items where id = p_reward_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'Reward not found.';
  end if;

  select count(*) into unknown_count
  from unnest(p_user_ids) selected_id
  where not exists (select 1 from auth.users users where users.id = selected_id);
  if unknown_count > 0 then
    raise exception using errcode = '22023', message = 'One or more recipients do not exist.';
  end if;

  update public.reward_items
  set state = 'published', publish_at = p_publish_at, expires_at = p_expires_at
  where id = p_reward_id;

  update public.reward_assignments assignment
  set state = case when assignment.state = 'claimed' then 'claimed' else 'revoked' end
  where assignment.reward_id = p_reward_id
    and not (assignment.user_id = any(p_user_ids));

  insert into public.reward_assignments (reward_id, user_id, state)
  select p_reward_id, selected_id, 'published'
  from (
    select distinct selected_id
    from unnest(p_user_ids) selected_id
  ) recipients
  on conflict (reward_id, user_id) do update
    set state = case when public.reward_assignments.state = 'claimed' then 'claimed' else 'published' end;
end;
$$;

grant execute on function public.admin_publish_reward(uuid, uuid[], timestamptz, timestamptz) to authenticated;

create or replace function public.admin_revoke_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  update public.reward_items set state = 'revoked' where id = p_reward_id;
  if not found then
    raise exception using errcode = '22023', message = 'Reward not found.';
  end if;
  update public.reward_assignments set state = 'revoked'
  where reward_id = p_reward_id and state <> 'claimed';
end;
$$;

grant execute on function public.admin_revoke_reward(uuid) to authenticated;

create or replace function public.admin_set_reward_delivery_state(
  p_reward_id uuid,
  p_user_id uuid,
  p_state public.reward_delivery_state
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Rewards administrator access required.';
  end if;

  update public.reward_assignments
  set state = p_state,
      claimed_at = case when p_state = 'claimed' then coalesce(claimed_at, now()) else claimed_at end
  where reward_id = p_reward_id and user_id = p_user_id;

  if not found then
    raise exception using errcode = '22023', message = 'Reward recipient assignment not found.';
  end if;
end;
$$;

grant execute on function public.admin_set_reward_delivery_state(uuid, uuid, public.reward_delivery_state) to authenticated;

-- Optional owner setup, run manually after the migration with the intended
-- administrator's auth user id:
-- insert into public.app_admins (user_id) values ('YOUR-AUTH-USER-UUID');

-- Tighten function grants explicitly. Supabase/PostgreSQL functions may have
-- PUBLIC execute by default; only authenticated sessions need these RPCs.
revoke all on function public.touch_reward_updated_at() from public, anon, authenticated;
revoke all on function public.is_rewards_admin() from public, anon;
grant execute on function public.is_rewards_admin() to authenticated;
revoke all on function public.get_my_rewards() from public, anon;
grant execute on function public.get_my_rewards() to authenticated;
revoke all on function public.claim_reward(uuid) from public, anon;
grant execute on function public.claim_reward(uuid) to authenticated;
revoke all on function public.admin_list_reward_users() from public, anon;
grant execute on function public.admin_list_reward_users() to authenticated;
revoke all on function public.admin_list_rewards() from public, anon;
grant execute on function public.admin_list_rewards() to authenticated;
revoke all on function public.admin_create_reward(text, text, text, text, text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_create_reward(text, text, text, text, text, text, timestamptz, timestamptz) to authenticated;
revoke all on function public.admin_update_reward(uuid, text, text, text, text, text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_update_reward(uuid, text, text, text, text, text, text, timestamptz, timestamptz) to authenticated;
revoke all on function public.admin_publish_reward(uuid, uuid[], timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_publish_reward(uuid, uuid[], timestamptz, timestamptz) to authenticated;
revoke all on function public.admin_revoke_reward(uuid) from public, anon;
grant execute on function public.admin_revoke_reward(uuid) to authenticated;
revoke all on function public.admin_set_reward_delivery_state(uuid, uuid, public.reward_delivery_state) from public, anon;
grant execute on function public.admin_set_reward_delivery_state(uuid, uuid, public.reward_delivery_state) to authenticated;
