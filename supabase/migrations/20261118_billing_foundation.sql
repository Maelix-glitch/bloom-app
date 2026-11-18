-- Bloom — the Money System foundation: subscriptions, AI credits, and the
-- server-side entitlement RPCs the paywall hard rule stands on.
--
-- Owner model (agreed 2026-11-10, pricing raised 2026-11-12): paid freemium.
-- Free = up to 5 habits, basic trackers, mood check-ins, points/ranks,
-- limited Coach. Premium (₹599/mo, ₹3,999/yr; ≈ $9.99/$59.99) = unlimited
-- habits, full Coach incl. food-photo analysis, Assessment + adaptive plan,
-- Nutrition, Overview intelligence, advanced analytics, Stories premium
-- templates. Premium Plus (₹999/mo, ₹7,999/yr; $14.99/$89.99) = Premium
-- with a larger AI credit allowance. AI credits: a monthly allowance per
-- tier (free 20, premium 300, premium plus 800); credits out → AI pauses,
-- free basics keep working; top-ups arrive as credit packs, never silently
-- billed. Enforcement is 100% server-side: subscription + credit state
-- live here, behind RLS, and the coach edge function checks and deducts
-- credits BEFORE it calls any AI provider.
--
-- What this migration creates:
--
--   1. `public.subscriptions` — one row per person: their tier, status,
--      provider and period. Clients may read ONLY their own row; no
--      client role can write — rows change exclusively through the
--      service-role functions below (called by the billing webhook) or a
--      trusted SQL session.
--
--   2. `public.ai_credit_balances` — the materialised balance. It exists
--      as a row (not just a ledger sum) so a spend can be one atomic
--      UPDATE ... WHERE balance >= amount: two concurrent Coach requests
--      can never spend the same credit twice.
--
--   3. `public.ai_credit_ledger` — append-only audit trail. Every grant,
--      refill and spend lands here with the balance it produced, so the
--      materialised balance can always be re-derived and verified. No
--      role may UPDATE or DELETE ledger rows.
--
--   4. RPCs:
--      · `get_my_entitlement()` — authenticated; the caller's effective
--        tier (an expired/cancelled subscription past its period end
--        reads as free), status, period end and credit balance. Calling
--        it also performs the lazy monthly refill: a missing balance row
--        is created with the free allowance, and a new calendar month
--        refills the balance UP TO the tier allowance
--        (greatest(balance, allowance) — top-up credits above the
--        allowance are never taken away). The refill is ledgered.
--      · `spend_credits(p_amount, p_reason)` — authenticated; atomic
--        check-and-deduct of the CALLER's credits only. Returns
--        (ok, balance). This is the function the coach edge function
--        calls after a successful AI answer.
--      · `grant_credits(p_user_id, p_amount, p_reason, p_ref)` —
--        service role ONLY (revoked from public and authenticated).
--        Top-ups and manual grants.
--      · `activate_subscription(...)` — service role ONLY. The webhook's
--        write path: upserts the subscription as active and aligns the
--        credit allowance with the tier (refilling up to it).
--      · `set_subscription_status(...)` — service role ONLY. Cancel /
--        past-due / expiry events from the webhook.
--
--   5. `public.erase_my_data()` — restated below as the verified
--      20261115 body plus deletes for the three tables above, so
--      "erase everything" covers the billing record too.
--
-- Deliberately NOT here: any payment-provider data beyond ids (cards
-- live with Razorpay/Stripe, never in Bloom), and any habit-limit
-- trigger — the local→cloud habit mirror inserts on-device habits on
-- sign-in, and a hard INSERT trigger would break that upload for a free
-- user with more than five device habits. The ≤5 free habit limit is
-- enforced in the habit creation paths instead.
--
-- NOT APPLIED to the live project by this file's existence: migrations
-- ship in the repo and are applied with the owner's approval.

-- ---------------------------------------------------------------------------
-- 1. Subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'premium', 'premium_plus')),
  status text not null default 'none'
    check (status in ('none', 'active', 'past_due', 'cancelled', 'expired')),
  provider text not null default 'none'
    check (provider in ('none', 'razorpay', 'stripe', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'One row per person: plan tier, status, provider ids and the current paid period. Clients read only their own row; writes happen only through the service-role billing functions (webhook) or trusted SQL.';

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions owner select" on public.subscriptions;
create policy "subscriptions owner select" on public.subscriptions
  for select using (user_id = auth.uid());

revoke all on public.subscriptions from anon;
revoke insert, update, delete on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- 2. AI credit balances (materialised; the ledger below is the audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_credit_balances (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  monthly_allowance integer not null default 0 check (monthly_allowance >= 0),
  period_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_credit_balances is
  'The spendable AI credit balance per person. Materialised so spend_credits() can deduct atomically (UPDATE ... WHERE balance >= amount). monthly_allowance is the tier allowance the lazy refill tops up to each calendar month.';

alter table public.ai_credit_balances enable row level security;

drop policy if exists "ai credit balances owner select" on public.ai_credit_balances;
create policy "ai credit balances owner select" on public.ai_credit_balances
  for select using (user_id = auth.uid());

revoke all on public.ai_credit_balances from anon;
revoke insert, update, delete on public.ai_credit_balances from authenticated;
grant select on public.ai_credit_balances to authenticated;

-- ---------------------------------------------------------------------------
-- 3. AI credit ledger (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null,
  reason text not null,
  balance_after integer not null check (balance_after >= 0),
  ref text,
  created_at timestamptz not null default now()
);

create index if not exists ai_credit_ledger_user_created_idx
  on public.ai_credit_ledger (user_id, created_at desc);

comment on table public.ai_credit_ledger is
  'Append-only AI credit audit trail: every grant, monthly refill and spend with the balance it produced. No role may update or delete rows; the materialised balance in ai_credit_balances can always be re-derived from this ledger.';

alter table public.ai_credit_ledger enable row level security;

drop policy if exists "ai credit ledger owner select" on public.ai_credit_ledger;
create policy "ai credit ledger owner select" on public.ai_credit_ledger
  for select using (user_id = auth.uid());

revoke all on public.ai_credit_ledger from anon;
revoke insert, update, delete on public.ai_credit_ledger from authenticated;
grant select on public.ai_credit_ledger to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Internal helpers (not granted to any client role; the SECURITY
--    DEFINER functions below run as the owner and may call them)
-- ---------------------------------------------------------------------------

/* The caller's EFFECTIVE tier: a paid plan counts only while its status
   keeps it alive — active, or cancelled but still inside the paid
   period. Anything else (past_due, expired, cancelled past the period
   end, no row) is free. */
create or replace function public.billing_effective_tier(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_period_end timestamptz;
begin
  select plan, status, current_period_end
    into v_plan, v_status, v_period_end
  from public.subscriptions
  where user_id = p_user_id;

  if v_plan is null or v_plan = 'free' then
    return 'free';
  end if;
  if v_status = 'active' then
    return v_plan;
  end if;
  if v_status = 'cancelled' and v_period_end is not null and v_period_end > now() then
    return v_plan;
  end if;
  return 'free';
end;
$$;

revoke all on function public.billing_effective_tier(uuid) from public;

/* The monthly allowance for a tier. Mirrors the plan constants in
   src/lib/billing/plans.ts and supabase/functions/coach/billing-core.ts —
   one number, three homes, kept equal by tests. */
create or replace function public.billing_tier_allowance(p_tier text)
returns integer
language sql
immutable
as $$
  select case p_tier
    when 'premium' then 300
    when 'premium_plus' then 800
    else 20
  end;
$$;

revoke all on function public.billing_tier_allowance(text) from public;

/* Ensure the balance row exists and the monthly refill has happened.
   Refill semantics: at a new calendar month the balance rises to the
   tier allowance if it is below it — greatest(balance, allowance) — so
   purchased top-ups above the allowance survive the refill untouched.
   Every change is written to the ledger with its true delta. */
create or replace function public.billing_ensure_credits(p_user_id uuid)
returns public.ai_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_credit_balances;
  v_allowance integer := public.billing_tier_allowance(public.billing_effective_tier(p_user_id));
  v_month_start timestamptz := date_trunc('month', now());
  v_delta integer;
begin
  select * into v_row from public.ai_credit_balances where user_id = p_user_id;

  if not found then
    insert into public.ai_credit_balances (user_id, balance, monthly_allowance, period_start)
    values (p_user_id, v_allowance, v_allowance, v_month_start)
    returning * into v_row;
    insert into public.ai_credit_ledger (user_id, delta, reason, balance_after)
    values (p_user_id, v_allowance, 'monthly_allowance', v_row.balance);
    return v_row;
  end if;

  if v_row.period_start < v_month_start then
    v_delta := greatest(v_allowance - v_row.balance, 0);
    update public.ai_credit_balances
    set balance = greatest(balance, v_allowance),
        monthly_allowance = v_allowance,
        period_start = v_month_start,
        updated_at = now()
    where user_id = p_user_id
    returning * into v_row;
    if v_delta > 0 then
      insert into public.ai_credit_ledger (user_id, delta, reason, balance_after)
      values (p_user_id, v_delta, 'monthly_allowance', v_row.balance);
    end if;
  elsif v_row.monthly_allowance <> v_allowance then
    /* Tier changed mid-period (a webhook landed between refills): align
       the allowance and top up to it immediately, never down. */
    v_delta := greatest(v_allowance - v_row.balance, 0);
    update public.ai_credit_balances
    set balance = greatest(balance, v_allowance),
        monthly_allowance = v_allowance,
        updated_at = now()
    where user_id = p_user_id
    returning * into v_row;
    if v_delta > 0 then
      insert into public.ai_credit_ledger (user_id, delta, reason, balance_after)
      values (p_user_id, v_delta, 'allowance_adjustment', v_row.balance);
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.billing_ensure_credits(uuid) from public;

-- ---------------------------------------------------------------------------
-- 5. get_my_entitlement() — the caller's tier + credits (authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_entitlement()
returns table (
  tier text,
  status text,
  current_period_end timestamptz,
  credit_balance integer,
  monthly_allowance integer,
  period_start timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal public.ai_credit_balances;
  v_status text;
  v_period_end timestamptz;
begin
  if v_uid is null then
    raise exception 'get_my_entitlement() must be called by a signed-in user';
  end if;

  v_bal := public.billing_ensure_credits(v_uid);

  select s.status, s.current_period_end
    into v_status, v_period_end
  from public.subscriptions s
  where s.user_id = v_uid;

  return query select
    public.billing_effective_tier(v_uid),
    coalesce(v_status, 'none'),
    v_period_end,
    v_bal.balance,
    v_bal.monthly_allowance,
    v_bal.period_start;
end;
$$;

comment on function public.get_my_entitlement() is
  'The caller''s effective plan tier, subscription status, period end and AI credit balance. Reading it performs the lazy monthly credit refill (ledgered). Signed-in callers only; a person can only ever see their own entitlement.';

revoke all on function public.get_my_entitlement() from public;
grant execute on function public.get_my_entitlement() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. spend_credits() — atomic check-and-deduct of the CALLER's credits
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(p_amount integer, p_reason text)
returns table (ok boolean, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal public.ai_credit_balances;
  v_new integer;
begin
  if v_uid is null then
    raise exception 'spend_credits() must be called by a signed-in user';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'spend_credits() amount must be positive';
  end if;

  v_bal := public.billing_ensure_credits(v_uid);

  /* The atomic spend: the WHERE clause is the balance check, so two
     concurrent spends can never consume the same credit. */
  update public.ai_credit_balances
  set balance = balance - p_amount, updated_at = now()
  where user_id = v_uid and balance >= p_amount
  returning balance into v_new;

  if v_new is null then
    return query select false, v_bal.balance;
    return;
  end if;

  insert into public.ai_credit_ledger (user_id, delta, reason, balance_after)
  values (v_uid, -p_amount, coalesce(nullif(trim(p_reason), ''), 'spend'), v_new);

  return query select true, v_new;
end;
$$;

comment on function public.spend_credits(integer, text) is
  'Atomically deducts p_amount AI credits from the CALLER (auth.uid()) when the balance covers it; returns (ok, balance). Ledgered on success only — a refused spend writes nothing. Called by the coach edge function after a successful AI answer.';

revoke all on function public.spend_credits(integer, text) from public;
grant execute on function public.spend_credits(integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. grant_credits() — service role ONLY (top-ups, manual grants)
-- ---------------------------------------------------------------------------
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal public.ai_credit_balances;
  v_new integer;
begin
  if p_user_id is null then
    raise exception 'grant_credits() needs a user id';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'grant_credits() amount must be positive';
  end if;

  v_bal := public.billing_ensure_credits(p_user_id);

  update public.ai_credit_balances
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id
  returning balance into v_new;

  insert into public.ai_credit_ledger (user_id, delta, reason, balance_after, ref)
  values (
    p_user_id,
    p_amount,
    coalesce(nullif(trim(p_reason), ''), 'grant'),
    v_new,
    p_ref
  );

  return v_new;
end;
$$;

comment on function public.grant_credits(uuid, integer, text, text) is
  'Adds AI credits to a person (credit-pack top-ups, manual grants). SERVICE ROLE ONLY — revoked from public and authenticated; the billing webhook and trusted SQL are the only callers. Ledgered with the caller-supplied reason and provider ref.';

revoke all on function public.grant_credits(uuid, integer, text, text) from public;
revoke all on function public.grant_credits(uuid, integer, text, text) from authenticated;
grant execute on function public.grant_credits(uuid, integer, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 8. activate_subscription() — service role ONLY (the webhook's write path)
-- ---------------------------------------------------------------------------
create or replace function public.activate_subscription(
  p_user_id uuid,
  p_plan text,
  p_provider text,
  p_provider_subscription_id text,
  p_provider_customer_id text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowance integer;
  v_bal public.ai_credit_balances;
  v_delta integer;
begin
  if p_user_id is null then
    raise exception 'activate_subscription() needs a user id';
  end if;
  if p_plan not in ('premium', 'premium_plus') then
    raise exception 'activate_subscription() plan must be premium or premium_plus';
  end if;

  insert into public.subscriptions (
    user_id, plan, status, provider, provider_customer_id,
    provider_subscription_id, current_period_start, current_period_end,
    cancel_at_period_end, updated_at
  )
  values (
    p_user_id, p_plan, 'active', p_provider, p_provider_customer_id,
    p_provider_subscription_id, p_period_start, p_period_end,
    false, now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = 'active',
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    provider_subscription_id = excluded.provider_subscription_id,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = false,
    updated_at = now();

  /* Align credits with the new tier: ensure the row exists, then top the
     balance up to the tier allowance (never down), ledgered as the
     subscription grant for this period. */
  v_bal := public.billing_ensure_credits(p_user_id);
  v_allowance := public.billing_tier_allowance(p_plan);
  v_delta := greatest(v_allowance - v_bal.balance, 0);
  if v_delta > 0 then
    update public.ai_credit_balances
    set balance = balance + v_delta,
        monthly_allowance = v_allowance,
        updated_at = now()
    where user_id = p_user_id
    returning * into v_bal;
    insert into public.ai_credit_ledger (user_id, delta, reason, balance_after, ref)
    values (p_user_id, v_delta, 'subscription_period', v_bal.balance, p_provider_subscription_id);
  else
    update public.ai_credit_balances
    set monthly_allowance = v_allowance, updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

comment on function public.activate_subscription(uuid, text, text, text, text, timestamptz, timestamptz) is
  'Marks a person''s subscription active on a paid plan and aligns their AI credit allowance with the tier. SERVICE ROLE ONLY — called by the billing webhook after a verified payment event.';

revoke all on function public.activate_subscription(uuid, text, text, text, text, timestamptz, timestamptz) from public;
revoke all on function public.activate_subscription(uuid, text, text, text, text, timestamptz, timestamptz) from authenticated;
grant execute on function public.activate_subscription(uuid, text, text, text, text, timestamptz, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 9. set_subscription_status() — service role ONLY (cancel/expiry events)
-- ---------------------------------------------------------------------------
create or replace function public.set_subscription_status(
  p_user_id uuid,
  p_status text,
  p_period_end timestamptz default null,
  p_cancel_at_period_end boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'set_subscription_status() needs a user id';
  end if;
  if p_status not in ('active', 'past_due', 'cancelled', 'expired') then
    raise exception 'set_subscription_status() got an unknown status';
  end if;

  update public.subscriptions
  set status = p_status,
      current_period_end = coalesce(p_period_end, current_period_end),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

comment on function public.set_subscription_status(uuid, text, timestamptz, boolean) is
  'Moves a subscription to a new status (past_due, cancelled, expired, or back to active) from a verified provider event. SERVICE ROLE ONLY. A cancelled subscription keeps its paid tier until current_period_end via billing_effective_tier().';

revoke all on function public.set_subscription_status(uuid, text, timestamptz, boolean) from public;
revoke all on function public.set_subscription_status(uuid, text, timestamptz, boolean) from authenticated;
grant execute on function public.set_subscription_status(uuid, text, timestamptz, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 10. Erasure covers the billing record
--     (20261115 body verbatim + the subscriptions / credit deletes)
-- ---------------------------------------------------------------------------
create or replace function public.erase_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  uid uuid := auth.uid();
  removed jsonb := '{}'::jsonb;
  n bigint;
begin
  if uid is null then
    raise exception 'erase_my_data() must be called by a signed-in user';
  end if;

  -- ---- vitalis health record ----------------------------------------------
  if to_regclass('public.health_safety_events') is not null then
    delete from public.health_safety_events where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_safety_events', n);
  end if;

  if to_regclass('public.health_audit_events') is not null then
    delete from public.health_audit_events where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_audit_events', n);
  end if;

  if to_regclass('public.health_consents') is not null then
    delete from public.health_consents where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_consents', n);
  end if;

  if to_regclass('public.health_observations') is not null then
    delete from public.health_observations where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_observations', n);
  end if;

  if to_regclass('public.health_profiles') is not null then
    delete from public.health_profiles where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_profiles', n);
  end if;

  -- Editorial membership is a per-person row too. Revoking it does not touch the
  -- append-only lifecycle log, which keeps the actor uuid as attribution.
  if to_regclass('public.evidence_editors') is not null then
    delete from public.evidence_editors where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('evidence_editors', n);
  end if;

  -- ---- the logs -----------------------------------------------------------
  if to_regclass('public.habit_logs') is not null then
    delete from public.habit_logs where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('habit_logs', n);
  end if;

  if to_regclass('public.habits') is not null then
    delete from public.habits where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('habits', n);
  end if;

  if to_regclass('public.tracker_days') is not null then
    delete from public.tracker_days where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('tracker_days', n);
  end if;

  if to_regclass('public.mood_entries') is not null then
    delete from public.mood_entries where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('mood_entries', n);
  end if;

  -- ---- the cycle ----------------------------------------------------------
  if to_regclass('public.cycle_periods') is not null then
    delete from public.cycle_periods where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('cycle_periods', n);
  end if;

  if to_regclass('public.cycle_entries') is not null then
    delete from public.cycle_entries where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('cycle_entries', n);
  end if;

  if to_regclass('public.cycle_state') is not null then
    delete from public.cycle_state where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('cycle_state', n);
  end if;

  -- ---- the coach ----------------------------------------------------------
  if to_regclass('public.coach_messages') is not null then
    delete from public.coach_messages where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('coach_messages', n);
  end if;

  if to_regclass('public.coach_memory') is not null then
    delete from public.coach_memory where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('coach_memory', n);
  end if;

  -- ---- stories ------------------------------------------------------------
  -- Interactions first: these reference a story, so they must go before it.
  if to_regclass('public.story_reactions') is not null then
    delete from public.story_reactions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_reactions', n);
  end if;

  if to_regclass('public.story_replies') is not null then
    delete from public.story_replies where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_replies', n);
  end if;

  if to_regclass('public.story_poll_votes') is not null then
    delete from public.story_poll_votes where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_poll_votes', n);
  end if;

  if to_regclass('public.story_views') is not null then
    delete from public.story_views where viewer_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_views', n);
  end if;

  if to_regclass('public.story_gifts') is not null then
    delete from public.story_gifts where sender_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_gifts', n);
  end if;

  if to_regclass('public.story_settings') is not null then
    delete from public.story_settings where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_settings', n);
  end if;

  if to_regclass('public.close_friends') is not null then
    delete from public.close_friends where owner_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('close_friends', n);
  end if;

  if to_regclass('public.story_highlight_items') is not null then
    delete from public.story_highlight_items
    where highlight_id in (select id from public.story_highlights where owner_id = uid);
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_highlight_items', n);
  end if;

  if to_regclass('public.story_highlights') is not null then
    delete from public.story_highlights where owner_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_highlights', n);
  end if;

  -- Column correction (audit 2026-11-15, proven by executing the previous
  -- body on the disposable project): stories keys its author as
  -- `author_id` on every real project, not `owner_id` — the old line threw
  -- 42703 at this step and rolled the whole erasure back, so nothing after
  -- it (including the account_verifications delete below) ever ran.
  if to_regclass('public.stories') is not null then
    delete from public.stories where author_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('stories', n);
  end if;

  -- ---- progression --------------------------------------------------------
  if to_regclass('public.point_transactions') is not null then
    delete from public.point_transactions where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('point_transactions', n);
  end if;

  if to_regclass('public.goal_awards') is not null then
    delete from public.goal_awards where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('goal_awards', n);
  end if;

  if to_regclass('public.rank_history') is not null then
    delete from public.rank_history where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('rank_history', n);
  end if;

  if to_regclass('public.user_achievements') is not null then
    delete from public.user_achievements where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('user_achievements', n);
  end if;

  -- Column correction (same audit): reward_assignments keys by `user_id`
  -- on every real project, not `profile_id` — this line was the second
  -- masked failure, reached only once the stories line above was fixed.
  if to_regclass('public.reward_assignments') is not null then
    delete from public.reward_assignments where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('reward_assignments', n);
  end if;

  -- ---- identity and settings ----------------------------------------------
  if to_regclass('public.profile_privacy') is not null then
    delete from public.profile_privacy where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('profile_privacy', n);
  end if;

  if to_regclass('public.user_prefs') is not null then
    delete from public.user_prefs where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('user_prefs', n);
  end if;

  -- The verification record is a per-person row too: erasing the account
  -- must not leave a "verified" shell behind. (It also cascades from
  -- profiles, but the explicit delete is what reports the count.)
  if to_regclass('public.account_verifications') is not null then
    delete from public.account_verifications where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('account_verifications', n);
  end if;

  -- ---- billing ------------------------------------------------------------
  -- The Money System record is per-person data too: the subscription,
  -- the credit balance and the append-only credit ledger all go. (The
  -- ledger is append-only against every client role, but erase is the
  -- person's own deletion right and this definer function is its path.)
  if to_regclass('public.ai_credit_ledger') is not null then
    delete from public.ai_credit_ledger where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('ai_credit_ledger', n);
  end if;

  if to_regclass('public.ai_credit_balances') is not null then
    delete from public.ai_credit_balances where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('ai_credit_balances', n);
  end if;

  if to_regclass('public.subscriptions') is not null then
    delete from public.subscriptions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('subscriptions', n);
  end if;


  -- ---- push ---------------------------------------------------------------
  if to_regclass('public.push_subscriptions') is not null then
    delete from public.push_subscriptions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('push_subscriptions', n);
  end if;
  -- ---- uploaded media ------------------------------------------------------
  -- Correction (same audit): storage.protect_delete() refuses direct SQL
  -- deletes from storage.objects on current Supabase unless the caller
  -- sets storage.allow_delete_query for the transaction — the function's
  -- own documented escape hatch. Without it this step threw 42501 and,
  -- like the column errors above, rolled the whole erasure back.
  if to_regclass('storage.objects') is not null then
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
    where bucket_id = 'profile-media'
      and (storage.foldername(name))[1] = uid::text;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('media', n);
  end if;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles where id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('profiles', n);
  end if;

  -- ---- telemetry ---------------------------------------------------------
  if to_regclass('public.client_errors') is not null then
    delete from public.client_errors where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('client_errors', n);
  end if;

  -- ---- the account itself, last -------------------------------------------
  begin
    delete from auth.users where id = uid;
    removed := removed || jsonb_build_object('account', true);
  exception
    when insufficient_privilege or others then
      -- Everything belonging to this person is already gone; the login row
      -- stays until it is removed from the dashboard. Reported, not hidden.
      removed := removed || jsonb_build_object('account', false);
  end;

  return removed;
end;
$$;

revoke all on function public.erase_my_data() from public;
grant execute on function public.erase_my_data() to authenticated;

comment on function public.erase_my_data() is
  'Deletes every row belonging to auth.uid() across all of Bloom''s per-person tables (including the Vitalis health tables, evidence editor membership, the account verification record and the Money System billing record — subscription, credit balance and credit ledger), its storage objects, and (where permitted) the auth user. Returns a per-table count. Global reference tables (reward_items, bloom_ranks, app_admins, app_invites) are intentionally untouched, as is the append-only evidence lifecycle log.';
