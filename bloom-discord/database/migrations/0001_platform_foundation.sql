-- =============================================================================
-- 0001 — Platform foundation
-- =============================================================================
-- Schema, shared domains and the updated_at trigger.
--
-- Everything the bots own lives in its own schema. The Bloom app already owns
-- `public` in this Supabase project, and two products sharing a schema is how
-- you end up with a `users` table that means two different things.
--
-- Migrations are forward-only and checksummed. There is no `down` — a rollback
-- in production is a new migration, reviewed like any other change, not a
-- script nobody has run since it was written.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS bloom_discord;

COMMENT ON SCHEMA bloom_discord IS
  'Bloom Labs Discord platform. Owned by the Guardian/Companion/Labs bots. The Bloom app must not read or write this schema.';


-- -----------------------------------------------------------------------------
-- Domains
-- -----------------------------------------------------------------------------
-- Snowflakes are 64-bit and exceed JavaScript''s safe integer range, so they are
-- stored as text. The CHECK is what stops a mistyped id, a role name or an empty
-- string from reaching a column that the bots will later hand back to Discord.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'snowflake' AND n.nspname = 'bloom_discord'
  ) THEN
    CREATE DOMAIN bloom_discord.snowflake AS text
      CHECK (VALUE ~ '^[0-9]{17,20}$');
  END IF;
END
$$;

COMMENT ON DOMAIN bloom_discord.snowflake IS
  'A Discord snowflake id. Stored as text: 64-bit ids lose precision as a JS number.';


-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
-- A trigger rather than application code. Application code forgets; a trigger
-- cannot be bypassed by a manual UPDATE during an incident.

CREATE OR REPLACE FUNCTION bloom_discord.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION bloom_discord.set_updated_at() IS
  'BEFORE UPDATE trigger: stamps updated_at in UTC. All timestamps in this schema are timestamptz.';


-- -----------------------------------------------------------------------------
-- Enumerated vocabulary
-- -----------------------------------------------------------------------------
-- Enums rather than free text for values the application already models as a
-- closed union. A typo in a status string is otherwise invisible until a query
-- silently returns nothing.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'bot_name' AND n.nspname = 'bloom_discord') THEN
    CREATE TYPE bloom_discord.bot_name AS ENUM ('guardian', 'companion', 'labs');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'onboarding_state' AND n.nspname = 'bloom_discord') THEN
    CREATE TYPE bloom_discord.onboarding_state AS ENUM (
      'unverified',   -- joined, not yet verified
      'early_bloom',  -- verified, onboarding in progress  (NOT "early access")
      'bloom_member', -- onboarding complete, normal verified member
      'revoked'       -- access withdrawn by staff
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'job_status' AND n.nspname = 'bloom_discord') THEN
    CREATE TYPE bloom_discord.job_status AS ENUM (
      'running', 'succeeded', 'failed', 'timed_out', 'skipped'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'command_outcome' AND n.nspname = 'bloom_discord') THEN
    CREATE TYPE bloom_discord.command_outcome AS ENUM (
      'success', 'user_error', 'authorization_denied', 'system_error', 'rate_limited'
    );
  END IF;
END
$$;
