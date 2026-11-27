-- =============================================================================
-- 0010_referrals.sql — the Guardian → Companion reward handoff
-- =============================================================================
--
-- One table, for one problem: Guardian knows who invited whom, and Companion
-- is the only process allowed to pay for it.
--
-- The two bots are separate processes with separate repository capabilities and
-- separate Discord tokens. Guardian cannot reach `point_events`; Companion
-- cannot reach `members` or `moderation_cases`. So the fact "this referral has
-- qualified" has to cross a process boundary, survive either bot restarting,
-- and be paid exactly once by whichever Companion worker gets there first.
--
-- An in-memory emitter cannot do that — it loses the event when the process
-- dies, and it does not exist at all in the other container. This table is the
-- durable handoff.
--
-- ## Why not reuse something
--
-- `job_runs` is a lease table for scheduled jobs: one active row per job key,
-- no payload, no per-entity identity. It coordinates *runners*, not messages.
-- `idempotency_keys` is a duplicate guard, not a queue — it has no state
-- machine and nothing to scan for work. Neither can carry "pay user X for
-- inviting user Y, once". Hence a dedicated table, and deliberately only one.
--
-- ## Who may do what
--
-- Enforced today by the compile-time repository manifest
-- (BOT_REPOSITORY_CAPABILITIES in @bloom/database) rather than by database
-- roles, because every bot currently connects as the same role. Documented
-- here so the intended grants are unambiguous if that changes:
--
--   guardian   INSERT              records the attribution at join time
--              SELECT              finds its own pending rows to qualify
--              UPDATE              pending → qualified | rejected, and only
--                                  those columns
--   companion  SELECT              finds qualified, unclaimed work
--              UPDATE              claim, then qualified → paid, or release
--                                  the claim back for retry
--   labs       none                Labs has no part in this and is not granted
--                                  the repository at all
--
-- Neither bot is granted DELETE. The lifecycle is expressed entirely in
-- `state` plus the timestamp columns, so a referral that was paid, rejected or
-- abandoned can still be explained a year later. Rows are immutable except for
-- the state machine columns.
--
-- ## What it deliberately does not hold
--
-- No message content, no invite URL, no token, no reason text written by a
-- member. The only free text is `rejected_reason`, which is a closed set of
-- machine-generated codes (see the CHECK), not prose.
-- =============================================================================

CREATE TABLE IF NOT EXISTS bloom_discord.referral_triggers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  guild_id            text NOT NULL,

  -- The member who joined. Always known: the join is what creates the row.
  referred_user_id    text NOT NULL,

  -- Who invited them, when Discord made that unambiguous. NULL is a first-class
  -- outcome, not a missing value: it means "we could not tell", and the row is
  -- kept anyway so that an unattributed join is visible rather than silently
  -- dropped. A NULL inviter can never qualify — see the CHECK below.
  inviter_user_id     text,

  -- The invite that advanced, when one did. Short Discord code, never a URL.
  invite_code         text CHECK (invite_code IS NULL OR char_length(invite_code) <= 32),

  -- How the inviter was determined. A closed set so an unrecognised attribution
  -- path cannot quietly appear in the data.
  --   invite_diff   exactly one invite's use count advanced
  --   vanity        the guild's vanity URL advanced; no inviter exists
  --   ambiguous     two or more advanced, or the cache was stale — no guess
  --   unavailable   Guardian could not read invites at all
  source              text NOT NULL DEFAULT 'invite_diff'
                      CHECK (source IN ('invite_diff', 'vanity', 'ambiguous', 'unavailable')),

  -- The state machine. Forward only:
  --   pending   → qualified → paid
  --   pending   → rejected
  --   qualified → rejected   (member left between qualifying and payment)
  state               text NOT NULL DEFAULT 'pending'
                      CHECK (state IN ('pending', 'qualified', 'rejected', 'paid')),

  -- Why it will never pay. Closed set: these are codes, not sentences.
  rejected_reason     text CHECK (rejected_reason IS NULL OR rejected_reason IN (
                        'no_inviter',
                        'self_referral',
                        'account_too_new',
                        'left_before_qualifying',
                        'not_present',
                        'already_referred',
                        'inviter_is_bot'
                      )),

  -- Companion's claim. Set when a worker takes the row, cleared when it fails
  -- so another attempt can pick it up. `claimed_by` is the worker/run id, for
  -- diagnosing a stuck claim — not a user id.
  claimed_at          timestamptz,
  claimed_by          text CHECK (claimed_by IS NULL OR char_length(claimed_by) <= 100),
  attempts            integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),

  -- The ledger row this produced. The join back to the economy, and the proof
  -- a payment happened at all.
  --
  -- RESTRICT, not SET NULL. `point_events` is an append-only ledger that
  -- nothing prunes, so a delete here is already a mistake; nulling the column
  -- would quietly break `referral_triggers_paid_has_event` below and surface
  -- as a check-constraint violation naming the wrong table. RESTRICT fails on
  -- the actual offence instead: the ledger row is still referenced.
  point_event_id      uuid REFERENCES bloom_discord.point_events(id) ON DELETE RESTRICT,

  -- The identity of this event, for the payment's idempotency key. Unique
  -- across the table, so a replayed trigger cannot become a second payment
  -- even if every other guard failed.
  idempotency_key     text NOT NULL UNIQUE
                      CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),

  correlation_id      text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  qualified_at        timestamptz,
  consumed_at         timestamptz,

  -- An inviter cannot invite themselves. Enforced here as well as in the
  -- service, because this is the one rule that turns the feature into free
  -- points if it is ever missed in code.
  CONSTRAINT referral_triggers_no_self_referral CHECK (
    inviter_user_id IS NULL OR inviter_user_id <> referred_user_id
  ),

  -- Nothing without a known inviter may advance past rejected. This is what
  -- makes "record unattributed rather than guess" safe: the row exists, it is
  -- visible to staff, and it is structurally incapable of paying anyone.
  CONSTRAINT referral_triggers_payable_needs_inviter CHECK (
    inviter_user_id IS NOT NULL OR state IN ('pending', 'rejected')
  ),

  -- The timestamps must agree with the state rather than merely accompany it.
  CONSTRAINT referral_triggers_state_timestamps CHECK (
    (state = 'pending'   AND qualified_at IS NULL AND consumed_at IS NULL) OR
    (state = 'qualified' AND qualified_at IS NOT NULL AND consumed_at IS NULL) OR
    (state = 'paid'      AND qualified_at IS NOT NULL AND consumed_at IS NOT NULL) OR
    (state = 'rejected'  AND consumed_at IS NULL)
  ),

  -- A payment must point at the ledger row it made, and only a payment may.
  CONSTRAINT referral_triggers_paid_has_event CHECK (
    (state = 'paid') = (point_event_id IS NOT NULL)
  ),

  CONSTRAINT referral_triggers_rejected_has_reason CHECK (
    (state = 'rejected') = (rejected_reason IS NOT NULL)
  )
);

-- One referred member produces at most one referral in a guild, ever.
--
-- This is the anti-farming rule that matters most, and it is a unique index
-- rather than a service check because the service runs in two processes and a
-- rejoin can race itself. Someone who joins, leaves and rejoins ten times
-- creates one row on the first join and conflicts nine times after it.
--
-- Scoped to the guild, not global: the same person joining a different Bloom
-- server is a different referral.
CREATE UNIQUE INDEX IF NOT EXISTS referral_triggers_one_per_member_idx
  ON bloom_discord.referral_triggers (guild_id, referred_user_id);

-- The consumer's scan: qualified work, oldest first. Partial, because the
-- table is overwhelmingly rows that are finished and never read again.
CREATE INDEX IF NOT EXISTS referral_triggers_claimable_idx
  ON bloom_discord.referral_triggers (guild_id, qualified_at)
  WHERE state = 'qualified';

-- Guardian's scan: pending rows waiting to come of age.
CREATE INDEX IF NOT EXISTS referral_triggers_pending_idx
  ON bloom_discord.referral_triggers (guild_id, created_at)
  WHERE state = 'pending';

-- The staff read, and the inviter's own total.
CREATE INDEX IF NOT EXISTS referral_triggers_inviter_idx
  ON bloom_discord.referral_triggers (guild_id, inviter_user_id, created_at DESC);

COMMENT ON TABLE bloom_discord.referral_triggers IS
  'Durable handoff from Guardian (which attributes a join to an inviter) to '
  'Companion (which is the only process that may pay for it). Immutable except '
  'for the state machine columns; no DELETE by either bot.';

COMMENT ON COLUMN bloom_discord.referral_triggers.inviter_user_id IS
  'NULL means attribution was not trustworthy. Such a row is kept for '
  'visibility and can never leave pending/rejected.';

COMMENT ON COLUMN bloom_discord.referral_triggers.idempotency_key IS
  'Event identity, reused as the point_events idempotency key so a replayed '
  'trigger collapses onto the same ledger row rather than paying twice.';
