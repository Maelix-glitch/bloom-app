-- Bloom — M-222 Autopay: the two tables the Razorpay SUBSCRIPTIONS
-- rail stands on.
--
-- Owner request (2026-11-23): plan purchases should be Autopay —
-- the member authorises a mandate once (UPI AutoPay / card
-- e-mandate) and Razorpay debits each renewal — instead of a
-- one-time Order per period. The Orders rail stays as the fallback;
-- this migration removes nothing.
--
-- What this migration creates:
--
--   1. `public.billing_plans` — the Razorpay plan registry. The
--      billing function ENSURES the four Bloom plans exist (a
--      dashboard plan id in the function's env secrets wins when
--      set; otherwise this table; otherwise the plan is created
--      through the Razorpay API — priced from the function's own
--      PLAN_PRICES_PAISE table, the same source the Orders rail
--      prices from — and its id persisted here). One row per
--      (provider, plan_key). No per-person data.
--
--   2. `public.billing_subscriptions` — the autopay rail's own
--      lifecycle record: one row per provider subscription, written
--      by the billing function when it creates a subscription and
--      refreshed by every verified subscription webhook. The status
--      here is the PROVIDER's own word (a halted subscription reads
--      "halted"), even where the entitlement write deliberately
--      maps it onto the status vocabulary of the entitlement RPCs.
--      This table is NOT the entitlement: the entitlement stays
--      public.subscriptions, written only through the service-role
--      RPCs (activate_subscription / set_subscription_status), and
--      every entitlement read is unchanged.
--
-- Both tables are service-role only: RLS is on, there are NO client
-- policies, and every client grant is revoked — the billing edge
-- function (service role) is the only reader or writer.
--
-- Erasure: billing_subscriptions.user_id references auth.users with
-- ON DELETE CASCADE, so a person's tracking rows go with their
-- account when erase_my_data() deletes the auth user — the same
-- cascade the foundation's own tables rely on. billing_plans holds
-- no per-person data and is intentionally untouched by erasure.
--
-- NOT APPLIED to the live project by this file's existence:
-- migrations ship in the repo and are applied with the owner's
-- approval. Until this one lands, the function's plan lookup fails
-- and the subscription rail answers the honest
-- payments_not_configured state — checkout keeps working on the
-- Orders rail and nothing is fabricated.

-- ---------------------------------------------------------------------------
-- 1. billing_plans — the provider plan registry
-- ---------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('razorpay', 'stripe')),
  plan_key text not null,
  tier text not null check (tier in ('premium', 'premium_plus')),
  period text not null check (period in ('monthly', 'yearly')),
  razorpay_plan_id text not null,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  unique (provider, plan_key)
);

comment on table public.billing_plans is
  'The payment-provider plan registry for the subscription (Autopay) rail: one row per (provider, plan_key), the plan id priced from the billing function''s own server price table. Service role only — written and read exclusively by the billing edge function when it ensures a plan exists.';

alter table public.billing_plans enable row level security;

revoke all on public.billing_plans from anon;
revoke all on public.billing_plans from authenticated;
grant select, insert, update, delete on public.billing_plans to service_role;

-- ---------------------------------------------------------------------------
-- 2. billing_subscriptions — the autopay lifecycle record
-- ---------------------------------------------------------------------------
create table if not exists public.billing_subscriptions (
  provider_subscription_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay', 'stripe')),
  plan_key text,
  tier text check (tier in ('premium', 'premium_plus')),
  period text check (period in ('monthly', 'yearly')),
  status text not null default 'created',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id, created_at desc);

comment on table public.billing_subscriptions is
  'The Autopay rail''s lifecycle record: one row per provider subscription (the provider''s own status word), written at creation by the billing function and refreshed by verified subscription webhooks. NOT the entitlement — public.subscriptions, written only through the service-role RPCs, remains the only entitlement truth. Service role only.';

alter table public.billing_subscriptions enable row level security;

revoke all on public.billing_subscriptions from anon;
revoke all on public.billing_subscriptions from authenticated;
grant select, insert, update, delete on public.billing_subscriptions to service_role;
