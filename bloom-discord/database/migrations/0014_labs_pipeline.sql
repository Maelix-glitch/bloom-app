-- =============================================================================
-- 0014 — Labs pipeline: features, votes, cohorts, release notes
-- =============================================================================
--
-- Phase 7 built Labs' intake spine (feedback + bug reports). This migration
-- builds the four things the commands reference always said were missing:
--
--   labs_features        the feature pipeline `/labs feature status` reads
--   labs_feature_votes   one member, one vote, per feature; voting again
--                        withdraws — a toggle, so the count is always honest
--   labs_cohorts         named beta cohorts; membership is a DATABASE FACT
--   labs_cohort_members  who is in which cohort
--   labs_release_notes   the source of truth `/labs release latest` reads
--
-- THE COHORT RULE, from the commands reference, is structural here: there is
-- no role column, no channel column, nothing Discord-side at all. Labs never
-- grants the Beta Tester role and a cohort row grants no access — channel
-- access stays a manual staff grant, so a bug in Labs can never widen
-- anyone's permissions.
--
-- Feature names are unique per guild case-insensitively, because members
-- address features by name (`/labs vote <feature>`) and "Dark mode" and
-- "dark mode" must be the same feature.
--
-- WRITE OWNERSHIP: Labs only.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'labs_feature_status' AND n.nspname = 'bloom_discord'
  ) THEN
    CREATE TYPE bloom_discord.labs_feature_status AS ENUM (
      'proposed', 'building', 'testing', 'shipped', 'parked'
    );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- The feature pipeline
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.labs_features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id    bloom_discord.snowflake NOT NULL
                REFERENCES bloom_discord.guilds (guild_id) ON DELETE CASCADE,

  -- Staff-authored. Members read these; the caps match the command options.
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  status      bloom_discord.labs_feature_status NOT NULL DEFAULT 'proposed',
  description text CHECK (description IS NULL OR char_length(description) <= 500),

  created_by  bloom_discord.snowflake NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bloom_discord.labs_features IS
  'The Labs feature pipeline. Staff write it; members read it and vote on it.';

CREATE UNIQUE INDEX IF NOT EXISTS labs_features_guild_name_idx
  ON bloom_discord.labs_features (guild_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS labs_features_guild_status_idx
  ON bloom_discord.labs_features (guild_id, status, created_at);


-- -----------------------------------------------------------------------------
-- Votes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.labs_feature_votes (
  feature_id  uuid NOT NULL
                REFERENCES bloom_discord.labs_features (id) ON DELETE CASCADE,
  user_id     bloom_discord.snowflake NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (feature_id, user_id)
);

COMMENT ON TABLE bloom_discord.labs_feature_votes IS
  'One row is one member backing one feature. Voting again deletes the row: the toggle is the interface, so a count can never include someone who changed their mind.';

CREATE INDEX IF NOT EXISTS labs_feature_votes_user_idx
  ON bloom_discord.labs_feature_votes (user_id, feature_id);


-- -----------------------------------------------------------------------------
-- Cohorts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.labs_cohorts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id    bloom_discord.snowflake NOT NULL
                REFERENCES bloom_discord.guilds (guild_id) ON DELETE CASCADE,

  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  description text CHECK (description IS NULL OR char_length(description) <= 300),

  -- A closed cohort refuses self-service joins. Staff close a cohort when a
  -- test round fills up; membership itself is unchanged by closing.
  joinable    boolean NOT NULL DEFAULT true,

  created_by  bloom_discord.snowflake NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bloom_discord.labs_cohorts IS
  'Named beta cohorts. Membership is a database fact only — no role, no channel, no access is implied or granted.';

CREATE UNIQUE INDEX IF NOT EXISTS labs_cohorts_guild_name_idx
  ON bloom_discord.labs_cohorts (guild_id, lower(btrim(name)));

CREATE TABLE IF NOT EXISTS bloom_discord.labs_cohort_members (
  cohort_id   uuid NOT NULL
                REFERENCES bloom_discord.labs_cohorts (id) ON DELETE CASCADE,
  user_id     bloom_discord.snowflake NOT NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS labs_cohort_members_user_idx
  ON bloom_discord.labs_cohort_members (user_id, cohort_id);


-- -----------------------------------------------------------------------------
-- Release notes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.labs_release_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id      bloom_discord.snowflake NOT NULL
                  REFERENCES bloom_discord.guilds (guild_id) ON DELETE CASCADE,

  -- Staff-authored, published deliberately. `body` is the note itself, in
  -- the team's words; nothing generates it.
  version       text NOT NULL CHECK (char_length(btrim(version)) BETWEEN 1 AND 40),
  title         text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  body          text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),

  published_by  bloom_discord.snowflake NOT NULL,
  published_at  timestamptz NOT NULL DEFAULT now(),

  -- Where the publish was announced, when a release-notes channel exists.
  message_id    bloom_discord.snowflake
);

COMMENT ON TABLE bloom_discord.labs_release_notes IS
  'Published release notes. The latest row per guild is what /labs release latest reads — a command with a source of truth, not a channel scrape.';

CREATE INDEX IF NOT EXISTS labs_release_notes_guild_published_idx
  ON bloom_discord.labs_release_notes (guild_id, published_at DESC);
