-- =============================================================================
-- 0002 — Identity: guilds, users, members, observed roles
-- =============================================================================
-- The minimum shadow of Discord state the platform needs in order to answer
-- questions without a privileged API call, plus the onboarding state that
-- Guardian owns and the other two bots read.
--
-- Data minimisation is deliberate. We store ids, a display name for staff
-- tooling, and lifecycle state. No email, no avatars, no message content, no
-- presence. Every column below has a feature that reads it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- guilds
-- -----------------------------------------------------------------------------
-- Bloom Labs is one server today. Everything is still keyed by guild_id so that
-- a second server is a configuration change rather than a migration.

CREATE TABLE IF NOT EXISTS bloom_discord.guilds (
  guild_id      bloom_discord.snowflake PRIMARY KEY,
  name          text        NOT NULL,

  -- IANA timezone used for scheduled content. Defaults to UTC so that a
  -- misconfigured guild sends at a boring time rather than at 3am local.
  timezone      text        NOT NULL DEFAULT 'UTC',

  -- Soft switch for all automated output in this guild. An operator can stop
  -- every scheduled message during an incident without redeploying.
  automation_enabled boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS guilds_set_updated_at ON bloom_discord.guilds;
CREATE TRIGGER guilds_set_updated_at
  BEFORE UPDATE ON bloom_discord.guilds
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
-- A Discord user, independent of any guild.

CREATE TABLE IF NOT EXISTS bloom_discord.users (
  user_id       bloom_discord.snowflake PRIMARY KEY,

  -- Denormalised for staff-facing output: a moderation case from six months ago
  -- should still say who it was about after the account is deleted or renamed.
  username      text        NOT NULL,

  is_bot        boolean     NOT NULL DEFAULT false,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS users_set_updated_at ON bloom_discord.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON bloom_discord.users
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


-- -----------------------------------------------------------------------------
-- guild_members
-- -----------------------------------------------------------------------------
-- Membership and lifecycle. `onboarding_state` is the single source of truth for
-- where a member is in the Early Bloom -> Bloom Member journey.
--
-- WRITE OWNERSHIP: Guardian only. Companion and Labs read this column and must
-- never update it. That boundary is enforced in the application layer by the
-- capability manifest, and should also be enforced by database grants in
-- production (see docs/database/schema.md).

CREATE TABLE IF NOT EXISTS bloom_discord.guild_members (
  guild_id          bloom_discord.snowflake NOT NULL
                      REFERENCES bloom_discord.guilds(guild_id) ON DELETE CASCADE,
  user_id           bloom_discord.snowflake NOT NULL
                      REFERENCES bloom_discord.users(user_id) ON DELETE CASCADE,

  onboarding_state  bloom_discord.onboarding_state NOT NULL DEFAULT 'unverified',

  -- When Discord says they joined, not when we first noticed them.
  joined_at         timestamptz,
  -- Set on guildMemberRemove. A rejoin clears it. Retaining the row means a
  -- member who leaves and returns does not get a clean slate on moderation.
  left_at           timestamptz,

  verified_at       timestamptz,
  onboarding_completed_at timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, user_id),

  -- A member cannot be verified without a verification timestamp, and cannot be
  -- a full member without having completed onboarding. Encoding the lifecycle
  -- here means a bug in the service layer produces a constraint violation
  -- instead of a quietly inconsistent row.
  CONSTRAINT guild_members_verified_has_timestamp CHECK (
    onboarding_state = 'unverified' OR onboarding_state = 'revoked' OR verified_at IS NOT NULL
  ),
  CONSTRAINT guild_members_completed_has_timestamp CHECK (
    onboarding_state <> 'bloom_member' OR onboarding_completed_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS guild_members_state_idx
  ON bloom_discord.guild_members (guild_id, onboarding_state)
  WHERE left_at IS NULL;

DROP TRIGGER IF EXISTS guild_members_set_updated_at ON bloom_discord.guild_members;
CREATE TRIGGER guild_members_set_updated_at
  BEFORE UPDATE ON bloom_discord.guild_members
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


-- -----------------------------------------------------------------------------
-- member_roles
-- -----------------------------------------------------------------------------
-- An observed snapshot of which roles a member holds.
--
-- Discord remains authoritative; this is a cache, and it says so. It exists so
-- that Labs can ask "who are the Beta Testers" as a SQL query, without Labs
-- needing the privileged GUILD_MEMBERS intent and without paginating the member
-- list on every cohort operation.
--
-- Anything security-critical re-reads live roles from Discord. A cache is not an
-- authorization source.

CREATE TABLE IF NOT EXISTS bloom_discord.member_roles (
  guild_id      bloom_discord.snowflake NOT NULL,
  user_id       bloom_discord.snowflake NOT NULL,
  role_id       bloom_discord.snowflake NOT NULL,

  -- When this bot last confirmed the member holds this role.
  observed_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, user_id, role_id),
  FOREIGN KEY (guild_id, user_id)
    REFERENCES bloom_discord.guild_members(guild_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS member_roles_by_role_idx
  ON bloom_discord.member_roles (guild_id, role_id);

COMMENT ON TABLE bloom_discord.member_roles IS
  'Observed role cache for cohort queries. NOT an authorization source — authorization always re-reads live roles from Discord.';
