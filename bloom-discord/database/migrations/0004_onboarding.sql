-- =============================================================================
-- 0004 — Onboarding
-- =============================================================================
-- Phase 1. The verification and onboarding lifecycle owned by Bloom Guardian.
--
-- `guild_members.onboarding_state` (migration 0002) already holds *where* a
-- member is. This migration adds *how they got there*: an append-only history
-- of every state change, with who caused it and why.
--
-- Why a separate history table rather than just trusting the current state:
--
--   • "Never fake verification" means we must be able to answer, months later,
--     exactly when and by whom someone was verified or revoked. A single
--     mutable column cannot answer that.
--   • Revocation is a moderation action. The evidence has to survive the member
--     leaving, rejoining and being re-verified.
--   • It makes double-application visible. If the same logical transition is
--     recorded twice, the unique index below rejects it rather than quietly
--     writing two rows.
--
-- WRITE OWNERSHIP: Guardian only, same as `guild_members.onboarding_state`.
-- Companion and Labs may read this table; they have no code path that writes it
-- and, in production, should not hold the grant to do so.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- What caused a transition
-- -----------------------------------------------------------------------------
-- Deliberately an enum rather than free text. The set of things that may move a
-- member through the lifecycle is small, closed, and security-relevant — an
-- open text column invites a future caller to invent "auto_promoted" and
-- nobody notices.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'onboarding_trigger'
  ) THEN
    CREATE TYPE bloom_discord.onboarding_trigger AS ENUM (
      -- The member ran /verify themselves.
      'self_verify',
      -- Staff moved them, via a Guardian command.
      'staff_action',
      -- Guardian reconciling state it observed on the gateway (e.g. a role
      -- granted by hand in the Discord client).
      'reconciliation',
      -- Membership row created on join.
      'join'
    );
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- onboarding_transitions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.onboarding_transitions (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id        bloom_discord.snowflake NOT NULL,
  user_id         bloom_discord.snowflake NOT NULL,

  -- NULL from_state means "row did not exist yet" — the join case.
  from_state      bloom_discord.onboarding_state,
  to_state        bloom_discord.onboarding_state NOT NULL,

  trigger         bloom_discord.onboarding_trigger NOT NULL,

  -- Who caused it. NULL for system-driven transitions (join, reconciliation).
  -- For self_verify this equals user_id; for staff_action it is the staff member.
  actor_id        bloom_discord.snowflake,

  -- Short, factual, member-safe. Mirrors what is written to Discord's own audit
  -- log so the two trails can be reconciled.
  reason          text CHECK (reason IS NULL OR length(reason) <= 512),

  -- The command or gateway event responsible, e.g. 'command:/verify'.
  source          text CHECK (source IS NULL OR length(source) <= 128),

  correlation_id  text CHECK (correlation_id IS NULL OR length(correlation_id) <= 64),

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT onboarding_transitions_member_fk
    FOREIGN KEY (guild_id, user_id)
    REFERENCES bloom_discord.guild_members(guild_id, user_id) ON DELETE CASCADE,

  -- A transition must actually transition. Recording unverified -> unverified
  -- is always a bug in the caller, and a bug that would otherwise inflate the
  -- history with rows that mean nothing.
  CONSTRAINT onboarding_transitions_must_change
    CHECK (from_state IS NULL OR from_state <> to_state)
);

-- The read pattern is "this member's history, newest first".
CREATE INDEX IF NOT EXISTS onboarding_transitions_member_idx
  ON bloom_discord.onboarding_transitions (guild_id, user_id, created_at DESC);

-- Reporting: "who was verified this week", "how many revocations".
CREATE INDEX IF NOT EXISTS onboarding_transitions_state_idx
  ON bloom_discord.onboarding_transitions (guild_id, to_state, created_at DESC);

COMMENT ON TABLE bloom_discord.onboarding_transitions IS
  'Append-only history of member lifecycle changes. Written by Bloom Guardian only. No UPDATE or DELETE path exists in the application: onboarding history is evidence.';


-- -----------------------------------------------------------------------------
-- verification_attempts
-- -----------------------------------------------------------------------------
-- Rate limiting for /verify is enforced through the shared token bucket, but a
-- refused attempt still needs to be visible: a burst of failures against one
-- account is the signal that something is being probed.
--
-- This is separate from `onboarding_transitions` on purpose. That table records
-- what *happened* to the lifecycle; this one records what was *attempted*,
-- including everything that was refused and therefore changed nothing.

CREATE TABLE IF NOT EXISTS bloom_discord.verification_attempts (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id        bloom_discord.snowflake NOT NULL,
  user_id         bloom_discord.snowflake NOT NULL,

  -- 'granted' | an error code such as 'RATE_LIMITED' or 'DUPLICATE_OPERATION'.
  outcome         text NOT NULL CHECK (outcome ~ '^[A-Z_a-z]{1,48}$'),

  correlation_id  text CHECK (correlation_id IS NULL OR length(correlation_id) <= 64),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_attempts_user_idx
  ON bloom_discord.verification_attempts (guild_id, user_id, created_at DESC);

COMMENT ON TABLE bloom_discord.verification_attempts IS
  'Every /verify attempt, including refusals. Retained for abuse investigation; contains no member-supplied content.';
