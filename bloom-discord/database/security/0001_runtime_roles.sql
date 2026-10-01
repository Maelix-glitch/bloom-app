-- =============================================================================
-- Bloom Discord — database-level isolation
-- =============================================================================
--
-- Until now, "Guardian cannot read the rewards ledger" has been a TypeScript
-- claim. `BOT_REPOSITORY_CAPABILITIES` decides which repository objects each
-- bot is handed, and the architecture tests prove the wiring — but all three
-- bots connect to PostgreSQL as the same superuser, so the isolation is a
-- property of the code rather than of the database. A bug, an injected
-- fragment, or a future developer writing one raw query is all it takes.
--
-- This script makes the boundary real. After it runs, Guardian attempting to
-- read `point_events` gets `permission denied for table point_events` from
-- PostgreSQL itself, and no amount of application-level mistake can change
-- that.
--
-- -----------------------------------------------------------------------------
-- THIS SCRIPT IS NOT APPLIED AUTOMATICALLY
-- -----------------------------------------------------------------------------
--
-- It is deliberately not a numbered migration in `database/migrations/`. Those
-- run unattended on every deploy; this one changes who can log in, and a
-- mistake locks the platform out of its own database. It is reviewed, applied
-- by hand, and verified by the test suite described at the bottom.
--
-- It is idempotent: running it twice is safe, and running it after a new
-- migration re-applies the grants that migration's tables need.
--
-- -----------------------------------------------------------------------------
-- The role model
-- -----------------------------------------------------------------------------
--
--   bloom_owner       NOLOGIN. Owns the schema and every object in it.
--                     Nobody connects as this role; it exists so that
--                     ownership is not tied to a login that might be rotated,
--                     and so that DDL privileges are a membership rather than
--                     a grant.
--
--   bloom_migrator    LOGIN. Member of bloom_owner, so it can create, alter
--                     and drop objects. Used by `pnpm db:migrate` and by
--                     nothing else. Runtime bots never receive these
--                     credentials.
--
--   bloom_guardian    LOGIN. DML only, on its own tables.
--   bloom_companion   LOGIN. DML only, on its own tables.
--   bloom_labs        LOGIN. DML only, on its own tables.
--
-- None of the runtime roles may create, alter or drop anything, and none of
-- them is a member of bloom_owner.
--
-- -----------------------------------------------------------------------------
-- Two decisions worth reading before changing anything
-- -----------------------------------------------------------------------------
--
-- 1. NO PERMISSIVE DEFAULT PRIVILEGES.
--
--    `ALTER DEFAULT PRIVILEGES ... GRANT SELECT ON TABLES TO bloom_guardian`
--    would save maintenance and quietly destroy the property this script
--    exists for: the next migration's table would be readable by a bot that
--    has no business reading it, and nobody would notice. Instead every table
--    is granted explicitly below, and `privileges.integration.test.ts` fails
--    if a table exists in the schema with no entry here. A new table is
--    therefore inaccessible to every bot until someone decides, in review,
--    which bots may touch it.
--
-- 2. ERASURE USES COLUMN-LEVEL GRANTS.
--
--    Guardian owns data retention, including the right-to-erasure path, and
--    that path has to scrub member-authored text out of tables Guardian
--    otherwise has no business in: a member's point reasons, their feedback,
--    their bug reports. Granting Guardian UPDATE on `point_events` would hand
--    the moderation bot the ability to rewrite the economy.
--
--    PostgreSQL grants UPDATE per column, so Guardian gets exactly the
--    columns the tombstone touches and nothing else. It can blank a reason;
--    it cannot change a balance, a point total, or a bug's status.
--
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------------------------------
--
-- Created without passwords and therefore unable to log in under md5/scram
-- authentication. The operator sets passwords in step 8, which keeps secrets
-- out of this file and out of version control.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bloom_owner') THEN
    CREATE ROLE bloom_owner NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bloom_migrator') THEN
    CREATE ROLE bloom_migrator LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bloom_guardian') THEN
    CREATE ROLE bloom_guardian LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bloom_companion') THEN
    CREATE ROLE bloom_companion LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bloom_labs') THEN
    CREATE ROLE bloom_labs LOGIN;
  END IF;
END
$$;

-- The migrator's DDL power comes from membership, not from a pile of grants.
GRANT bloom_owner TO bloom_migrator;

-- Runtime roles must never inherit ownership. Stated as a revoke rather than
-- an absence so that re-running this script repairs a hand-made mistake.
REVOKE bloom_owner FROM bloom_guardian, bloom_companion, bloom_labs;

-- No runtime role may create a database, a role, or bypass RLS.
ALTER ROLE bloom_guardian  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
ALTER ROLE bloom_companion NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
ALTER ROLE bloom_labs      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
ALTER ROLE bloom_migrator  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;

-- -----------------------------------------------------------------------------
-- 2. Ownership
-- -----------------------------------------------------------------------------
--
-- Everything in the schema moves to bloom_owner. Done in a loop because the
-- object list grows with every migration and a hand-maintained list would be
-- wrong within a week.

ALTER SCHEMA bloom_discord OWNER TO bloom_owner;

DO $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT 'TABLE ' || quote_ident(schemaname) || '.' || quote_ident(tablename) AS stmt
    FROM pg_tables WHERE schemaname = 'bloom_discord'
    UNION ALL
    SELECT 'SEQUENCE ' || quote_ident(schemaname) || '.' || quote_ident(sequencename)
    FROM pg_sequences WHERE schemaname = 'bloom_discord'
    UNION ALL
    SELECT 'VIEW ' || quote_ident(schemaname) || '.' || quote_ident(viewname)
    FROM pg_views WHERE schemaname = 'bloom_discord'
    UNION ALL
    SELECT 'FUNCTION ' || p.oid::regprocedure::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'bloom_discord'
    UNION ALL
    SELECT 'DOMAIN ' || quote_ident(n.nspname) || '.' || quote_ident(t.typname)
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typtype = 'd'
    UNION ALL
    SELECT 'TYPE ' || quote_ident(n.nspname) || '.' || quote_ident(t.typname)
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typtype = 'e'
  LOOP
    EXECUTE 'ALTER ' || obj.stmt || ' OWNER TO bloom_owner';
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 3. Start from nothing
-- -----------------------------------------------------------------------------
--
-- PUBLIC is a role every user is a member of. Anything granted to it is
-- granted to every bot regardless of what follows, so it goes first.

REVOKE ALL ON SCHEMA bloom_discord FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA bloom_discord FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA bloom_discord FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA bloom_discord FROM PUBLIC;

-- And from the runtime roles, so that re-running this script after a grant has
-- been widened by hand narrows it again rather than leaving the widening in
-- place. This is what makes the file the single source of truth.
REVOKE ALL ON ALL TABLES IN SCHEMA bloom_discord
  FROM bloom_guardian, bloom_companion, bloom_labs;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA bloom_discord
  FROM bloom_guardian, bloom_companion, bloom_labs;

-- `public` is where an unprivileged role would otherwise be able to create
-- scratch tables. No Bloom role has any business there.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public
  FROM bloom_guardian, bloom_companion, bloom_labs, bloom_migrator;

-- -----------------------------------------------------------------------------
-- 4. Schema access
-- -----------------------------------------------------------------------------
--
-- USAGE lets a role name objects in the schema. CREATE would let it add its
-- own, which is the privilege that turns a SQL injection into a persistent
-- foothold, so only the owner has it.

GRANT USAGE ON SCHEMA bloom_discord
  TO bloom_guardian, bloom_companion, bloom_labs;
GRANT USAGE, CREATE ON SCHEMA bloom_discord TO bloom_owner;

-- The one function in the schema: the `set_updated_at` trigger. SECURITY
-- INVOKER, so it runs with the caller's privileges and grants nothing extra.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA bloom_discord
  TO bloom_guardian, bloom_companion, bloom_labs;

-- -----------------------------------------------------------------------------
-- 5. GUARDIAN
-- -----------------------------------------------------------------------------
-- Verification, onboarding, moderation, cases, retention, and the write half
-- of the referral handoff.

-- Shared platform tables.
GRANT SELECT, INSERT                 ON bloom_discord.audit_events        TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.job_runs            TO bloom_guardian;
GRANT SELECT, INSERT                 ON bloom_discord.bot_settings        TO bloom_guardian;
GRANT SELECT, INSERT, DELETE         ON bloom_discord.channel_settings    TO bloom_guardian;
GRANT SELECT, INSERT, DELETE         ON bloom_discord.role_settings       TO bloom_guardian;
GRANT INSERT                         ON bloom_discord.command_usage       TO bloom_guardian;
GRANT SELECT, INSERT                 ON bloom_discord.system_health       TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE, DELETE ON bloom_discord.idempotency_keys    TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE, DELETE ON bloom_discord.message_cooldowns   TO bloom_guardian;

-- Identity. Guardian is the only bot that writes who exists.
GRANT SELECT, INSERT                 ON bloom_discord.guilds              TO bloom_guardian;
-- SELECT is required by the `ON CONFLICT (user_id) DO UPDATE` upsert, not by
-- any query that reads a user. Discovered by the privilege suite rather than
-- by reading the code, which is the argument for having the suite.
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.users               TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.guild_members       TO bloom_guardian;
GRANT SELECT, INSERT,         DELETE ON bloom_discord.member_roles        TO bloom_guardian;

-- Onboarding.
GRANT SELECT, INSERT                 ON bloom_discord.onboarding_transitions TO bloom_guardian;
GRANT SELECT, INSERT                 ON bloom_discord.verification_attempts  TO bloom_guardian;

-- Moderation and cases.
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.moderation_actions  TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.moderation_cases    TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.case_events         TO bloom_guardian;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.case_counters       TO bloom_guardian;

-- Reports. INSERT and SELECT for the report flow; the UPDATE is erasure only,
-- and is restricted to the description column in section 8.
GRANT SELECT, INSERT                 ON bloom_discord.reports             TO bloom_guardian;

-- The referral handoff. Guardian records a referral; it never pays one, so it
-- has no access to the ledger that pays it.
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.referral_triggers   TO bloom_guardian;

-- -----------------------------------------------------------------------------
-- 6. COMPANION
-- -----------------------------------------------------------------------------
-- Wellbeing, the points ledger, awards, challenges and events, and the paying
-- half of the referral handoff.

GRANT SELECT, INSERT                 ON bloom_discord.audit_events        TO bloom_companion;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.job_runs            TO bloom_companion;
GRANT SELECT, INSERT                 ON bloom_discord.bot_settings        TO bloom_companion;
GRANT SELECT                         ON bloom_discord.channel_settings    TO bloom_companion;
GRANT SELECT                         ON bloom_discord.role_settings       TO bloom_companion;
GRANT INSERT                         ON bloom_discord.command_usage       TO bloom_companion;
GRANT SELECT, INSERT                 ON bloom_discord.system_health       TO bloom_companion;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.idempotency_keys    TO bloom_companion;
GRANT        INSERT, UPDATE, DELETE  ON bloom_discord.message_cooldowns   TO bloom_companion;

-- The economy.
GRANT SELECT, INSERT                 ON bloom_discord.point_events        TO bloom_companion;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.check_ins           TO bloom_companion;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.member_awards       TO bloom_companion;

-- Challenges and events.
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.community_activities   TO bloom_companion;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.community_participants TO bloom_companion;

-- Referrals: read and settle, never create.
--
-- Deliberately no INSERT. Guardian observes the join and records the referral;
-- Companion claims a qualified row and marks it paid. Withholding INSERT means
-- the bot that controls the money cannot manufacture a referral to pay itself
-- for, which is the one fraud this handoff is actually exposed to.
GRANT SELECT,         UPDATE         ON bloom_discord.referral_triggers   TO bloom_companion;

-- -----------------------------------------------------------------------------
-- 7. LABS
-- -----------------------------------------------------------------------------
-- Beta testing only. No identity, no economy, no moderation.

GRANT SELECT, INSERT                 ON bloom_discord.audit_events        TO bloom_labs;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.job_runs            TO bloom_labs;
GRANT SELECT, INSERT                 ON bloom_discord.bot_settings        TO bloom_labs;
GRANT SELECT                         ON bloom_discord.channel_settings    TO bloom_labs;
GRANT SELECT                         ON bloom_discord.role_settings       TO bloom_labs;
GRANT INSERT                         ON bloom_discord.command_usage       TO bloom_labs;
GRANT SELECT, INSERT                 ON bloom_discord.system_health       TO bloom_labs;

GRANT SELECT, INSERT, UPDATE         ON bloom_discord.bug_reports         TO bloom_labs;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.bug_events          TO bloom_labs;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.bug_counters        TO bloom_labs;
GRANT SELECT, INSERT, UPDATE         ON bloom_discord.feedback            TO bloom_labs;

-- `bug_events.id` is the schema's only `bigserial`; everything else uses
-- GENERATED ALWAYS AS IDENTITY, whose sequence is owned by the column and
-- needs no separate grant. This one does.
GRANT USAGE ON SEQUENCE bloom_discord.bug_events_id_seq TO bloom_labs;

-- -----------------------------------------------------------------------------
-- 8. ERASURE — the deliberate cross-bot exception
-- -----------------------------------------------------------------------------
--
-- Guardian's retention job carries out the right-to-erasure request, which
-- means replacing member-authored text with a tombstone wherever it was
-- written. Some of that text lives in Companion's and Labs' tables.
--
-- Each grant below is the narrowest one PostgreSQL can express: UPDATE on
-- named columns. Guardian can blank the words a member wrote. It cannot alter
-- a point value, a bug's status, a vote, or anything else in these rows, and
-- it cannot read them either — there is no SELECT here.

-- A column-level UPDATE also needs column-level SELECT on whatever the
-- statement reads: the WHERE clause that finds the rows, and the RETURNING
-- clause that counts them. Without it PostgreSQL refuses the whole statement
-- with `permission denied for table`, which reads like the grant is missing
-- rather than incomplete. The suite found this; static reading of the code
-- did not.
--
-- The columns below are exactly the targeting columns plus the text being
-- erased. `points` is deliberately absent from every SELECT list here, so
-- Guardian can find a member's rows and blank their words without ever being
-- able to read what the economy paid them.

GRANT SELECT (guild_id, user_id, kind, reason), UPDATE (reason)
  ON bloom_discord.point_events TO bloom_guardian;

GRANT SELECT (id, guild_id, user_id, summary), UPDATE (summary, detail)
  ON bloom_discord.feedback     TO bloom_guardian;

GRANT SELECT (id, guild_id, reporter_id, summary),
      UPDATE (summary, steps, expected, updated_at)
  ON bloom_discord.bug_reports  TO bloom_guardian;

-- `reports` already carries a full table SELECT from section 5 (Guardian owns
-- the report flow), so only the UPDATE needs narrowing.
GRANT UPDATE (description)
  ON bloom_discord.reports      TO bloom_guardian;

-- Retention also prunes two shared infrastructure tables. Both are already
-- covered by Guardian's full grants in section 5; named here so the retention
-- surface can be read in one place.
--   bloom_discord.idempotency_keys   DELETE
--   bloom_discord.message_cooldowns  DELETE

-- -----------------------------------------------------------------------------
-- 9. MIGRATION BOOKKEEPING
-- -----------------------------------------------------------------------------
--
-- `schema_migrations` records which migrations have run. No runtime role may
-- read or write it: a bot has no reason to know, and a bot that can write it
-- can convince the migrator a migration already ran.

REVOKE ALL ON bloom_discord.schema_migrations
  FROM bloom_guardian, bloom_companion, bloom_labs;

-- =============================================================================
-- 10. OPERATOR STEP — passwords
-- =============================================================================
--
-- Run separately, with real secrets, never committed. Each bot gets its own
-- credential so that a leaked one is traceable and revocable on its own.
--
--   ALTER ROLE bloom_migrator  WITH PASSWORD '...';
--   ALTER ROLE bloom_guardian  WITH PASSWORD '...';
--   ALTER ROLE bloom_companion WITH PASSWORD '...';
--   ALTER ROLE bloom_labs      WITH PASSWORD '...';
--
-- Then set, per process:
--   Guardian   DATABASE_URL=postgres://bloom_guardian:...@host/db
--   Companion  DATABASE_URL=postgres://bloom_companion:...@host/db
--   Labs       DATABASE_URL=postgres://bloom_labs:...@host/db
--   Migrations DATABASE_URL=postgres://bloom_migrator:...@host/db
--
-- The migrator credential belongs in the deploy pipeline. It must not appear
-- in any bot's environment: a runtime process holding DDL rights is the thing
-- this entire file exists to prevent.
--
-- =============================================================================
-- Verification
-- =============================================================================
--
--   BLOOM_INTEGRATION_TESTS=1 pnpm exec vitest run packages/database/src/privileges
--
-- That suite applies this script to a scratch database, connects as each role,
-- and asserts both halves: that every bot can do its own work, and that it is
-- refused everything else. It also fails if a table exists with no grant
-- decision recorded here.

COMMIT;
