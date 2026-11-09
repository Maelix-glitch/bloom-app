-- 20261109: admin rewards — single-recipient publishing lock.
--
-- Owner requirement (2026-11-09): reward publishing is limited to ONE
-- recipient, permanently. The locked recipient is
-- singh0500aashi@gmail.com. The address appears ONLY here (and in the
-- function bodies this migration installs) — there is no UI, setting or
-- table where it can be changed; changing it means a new migration.
--
-- Enforcement is server-side, at the two doors that matter:
--   · admin_publish_reward() refuses any recipient list containing a
--     user whose email is not the locked one (22023).
--   · admin_list_reward_users() returns only the locked recipient, so
--     the admin console cannot even offer anyone else.
-- Draft creation/editing is untouched — the lock bites at publish time,
-- which is the moment a reward can reach someone.
--
-- This migration also repairs a second latent defect found while testing:
-- the original publish body assigned a text CASE expression to the
-- reward_delivery_state enum column, which raises 42804 at runtime — so
-- publishing had in fact never succeeded. Both CASE assignments are now
-- cast to the enum.

create or replace function public.admin_list_reward_users()
 returns table(user_id uuid, email text, display_name text)
 language plpgsql
 security definer
 set search_path to 'public', 'auth'
as $function$
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
  where lower(users.email) = 'singh0500aashi@gmail.com'  -- RECIPIENT LOCK (20261109): the only publishable recipient
  order by coalesce(users.raw_user_meta_data ->> 'display_name', users.email);
end;
$function$;

create or replace function public.admin_publish_reward(p_reward_id uuid, p_user_ids uuid[], p_publish_at timestamp with time zone default now(), p_expires_at timestamp with time zone default null::timestamp with time zone)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'auth'
as $function$
declare
  reward_row public.reward_items;
  unknown_count integer;
  unlocked_count integer;
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

  -- RECIPIENT LOCK (20261109): publishing may only ever target the one
  -- locked recipient. Any other selected user refuses the whole publish.
  select count(*) into unlocked_count
  from unnest(p_user_ids) selected_id
  join auth.users users on users.id = selected_id
  where lower(users.email) <> 'singh0500aashi@gmail.com';
  if unlocked_count > 0 then
    raise exception using errcode = '22023', message = 'Rewards can only be published to the locked recipient.';
  end if;

  update public.reward_items
  set state = 'published', publish_at = p_publish_at, expires_at = p_expires_at
  where id = p_reward_id;

  update public.reward_assignments assignment
  set state = (case when assignment.state = 'claimed' then 'claimed' else 'revoked' end)::public.reward_delivery_state
  where assignment.reward_id = p_reward_id
    and not (assignment.user_id = any(p_user_ids));

  insert into public.reward_assignments (reward_id, user_id, state)
  select p_reward_id, selected_id, 'published'
  from (
    select distinct selected_id
    from unnest(p_user_ids) selected_id
  ) recipients
  on conflict (reward_id, user_id) do update
    set state = (case when public.reward_assignments.state = 'claimed' then 'claimed' else 'published' end)::public.reward_delivery_state;
end;
$function$;
