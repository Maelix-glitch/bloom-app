-- =============================================================================
-- 0003 — Platform operations
-- =============================================================================
-- The machinery every feature depends on: settings, audit trail, command
-- telemetry, job locking, cooldowns, idempotency and health.
--
-- These tables are what make the rules in the brief enforceable rather than
-- aspirational. "Point awards must be idempotent" is a property of
-- `idempotency_keys`; "jobs must be safe if two processes run" is a property of
-- `job_runs`; "do not spam" is a property of `message_cooldowns`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------
-- Environment variables are the boot-time source of channel and role ids. These
-- tables let an administrator override them at runtime through a command,
-- without a redeploy. Resolution order is: database override, then environment.

CREATE TABLE IF NOT EXISTS bloom_discord.bot_settings (
  guild_id      bloom_discord.snowflake NOT NULL
                  REFERENCES bloom_discord.guilds(guild_id) ON DELETE CASCADE,
  bot_name      bloom_discord.bot_name NOT NULL,
  key           text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_.]{0,62}$'),
  value         jsonb NOT NULL,

  updated_by    bloom_discord.snowflake,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, bot_name, key)
);

DROP TRIGGER IF EXISTS bot_settings_set_updated_at ON bloom_discord.bot_settings;
CREATE TRIGGER bot_settings_set_updated_at
  BEFORE UPDATE ON bloom_discord.bot_settings
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


CREATE TABLE IF NOT EXISTS bloom_discord.channel_settings (
  guild_id      bloom_discord.snowflake NOT NULL
                  REFERENCES bloom_discord.guilds(guild_id) ON DELETE CASCADE,
  -- Matches ChannelKey in @bloom/shared-types, e.g. 'dailyCheckIn'.
  channel_key   text NOT NULL CHECK (channel_key ~ '^[a-zA-Z][a-zA-Z0-9]{0,62}$'),
  channel_id    bloom_discord.snowflake NOT NULL,

  updated_by    bloom_discord.snowflake,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, channel_key)
);

DROP TRIGGER IF EXISTS channel_settings_set_updated_at ON bloom_discord.channel_settings;
CREATE TRIGGER channel_settings_set_updated_at
  BEFORE UPDATE ON bloom_discord.channel_settings
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


CREATE TABLE IF NOT EXISTS bloom_discord.role_settings (
  guild_id      bloom_discord.snowflake NOT NULL
                  REFERENCES bloom_discord.guilds(guild_id) ON DELETE CASCADE,
  role_key      text NOT NULL CHECK (role_key ~ '^[a-zA-Z][a-zA-Z0-9]{0,62}$'),
  role_id       bloom_discord.snowflake NOT NULL,

  updated_by    bloom_discord.snowflake,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, role_key),

  -- Two keys pointing at one role is the configuration mistake that turns
  -- "❋ Bloom Member" into "⟡ Moderator" for authorization purposes.
  CONSTRAINT role_settings_unique_role UNIQUE (guild_id, role_id)
);

DROP TRIGGER IF EXISTS role_settings_set_updated_at ON bloom_discord.role_settings;
CREATE TRIGGER role_settings_set_updated_at
  BEFORE UPDATE ON bloom_discord.role_settings
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


-- -----------------------------------------------------------------------------
-- audit_events
-- -----------------------------------------------------------------------------
-- Append-only. Every significant action lands here regardless of which bot
-- performed it, so there is one chronological answer to "what happened".
--
-- No UPDATE and no DELETE are ever issued against this table by application
-- code, and production grants should withhold both.
--
-- `details` must never contain private report content, message bodies, tokens
-- or secrets. It carries ids, codes and durations.

CREATE TABLE IF NOT EXISTS bloom_discord.audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  guild_id        bloom_discord.snowflake NOT NULL,
  bot_name        bloom_discord.bot_name NOT NULL,

  -- Dotted name, e.g. 'onboarding.completed', 'role.assign.blocked'.
  event           text NOT NULL CHECK (event ~ '^[a-z][a-z0-9_.]{2,80}$'),
  severity        text NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('trace','debug','info','warn','error','fatal')),

  actor_id        bloom_discord.snowflake,
  target_id       bloom_discord.snowflake,
  channel_id      bloom_discord.snowflake,

  -- The slash command or gateway event that caused this, for provenance.
  source          text,
  correlation_id  uuid,

  details         jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_guild_time_idx
  ON bloom_discord.audit_events (guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_target_idx
  ON bloom_discord.audit_events (guild_id, target_id, created_at DESC)
  WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_events_actor_idx
  ON bloom_discord.audit_events (guild_id, actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_events_correlation_idx
  ON bloom_discord.audit_events (correlation_id)
  WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE bloom_discord.audit_events IS
  'Append-only audit trail. Never UPDATE or DELETE. details must not contain message content, report content or secrets.';


-- -----------------------------------------------------------------------------
-- command_usage
-- -----------------------------------------------------------------------------
-- One row per interaction handled. Backs /health error counts and answers
-- "is this command slow, or is Discord slow" without guessing.
--
-- No command *arguments* are stored. Knowing that /warn ran is operational
-- telemetry; knowing what the reason said is private moderation content.

CREATE TABLE IF NOT EXISTS bloom_discord.command_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  guild_id        bloom_discord.snowflake NOT NULL,
  bot_name        bloom_discord.bot_name NOT NULL,
  command         text NOT NULL,
  actor_id        bloom_discord.snowflake NOT NULL,
  channel_id      bloom_discord.snowflake,

  outcome         bloom_discord.command_outcome NOT NULL,
  error_code      text,
  duration_ms     integer NOT NULL CHECK (duration_ms >= 0),
  correlation_id  uuid,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS command_usage_recent_idx
  ON bloom_discord.command_usage (bot_name, created_at DESC);
CREATE INDEX IF NOT EXISTS command_usage_errors_idx
  ON bloom_discord.command_usage (bot_name, created_at DESC)
  WHERE outcome <> 'success';


-- -----------------------------------------------------------------------------
-- job_runs
-- -----------------------------------------------------------------------------
-- The scheduler's lock table and its history in one place.
--
-- A lease, not a lock: a process that acquires a job and then dies would hold a
-- plain lock forever. `lease_expires_at` means another process can take over
-- once the lease lapses, which is the behaviour you want at 4am.
--
-- The partial unique index is the actual mutual exclusion: at most one row per
-- job key may be in 'running' state, enforced by Postgres rather than by the
-- application remembering to check.

CREATE TABLE IF NOT EXISTS bloom_discord.job_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable identifier for the job definition, e.g. 'companion.daily_check_in'.
  job_key           text NOT NULL CHECK (job_key ~ '^[a-z][a-z0-9_.]{2,80}$'),
  guild_id          bloom_discord.snowflake,
  bot_name          bloom_discord.bot_name NOT NULL,

  status            bloom_discord.job_status NOT NULL DEFAULT 'running',

  -- Identifies the process holding the lease, for diagnosis.
  runner_id         text NOT NULL,
  attempt           integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),

  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  lease_expires_at  timestamptz NOT NULL,

  duration_ms       integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  error_code        text,
  error_message     text,

  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT job_runs_finished_consistency CHECK (
    (status = 'running' AND finished_at IS NULL)
    OR (status <> 'running' AND finished_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS job_runs_one_active_idx
  ON bloom_discord.job_runs (job_key, COALESCE(guild_id, ''))
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS job_runs_history_idx
  ON bloom_discord.job_runs (job_key, started_at DESC);


-- -----------------------------------------------------------------------------
-- message_cooldowns
-- -----------------------------------------------------------------------------
-- Duplicate suppression for anything automated.
--
-- `scope` is the thing being limited ('welcome', 'daily_check_in'), `subject` is
-- who or what it applies to (a user id, a channel id). A welcome message is
-- sent only if there is no unexpired row for (guild, 'welcome', user).

CREATE TABLE IF NOT EXISTS bloom_discord.message_cooldowns (
  guild_id      bloom_discord.snowflake NOT NULL,
  scope         text NOT NULL CHECK (scope ~ '^[a-z][a-z0-9_.]{2,60}$'),
  subject       text NOT NULL CHECK (length(subject) BETWEEN 1 AND 128),

  expires_at    timestamptz NOT NULL,
  hit_count     integer NOT NULL DEFAULT 1 CHECK (hit_count >= 1),

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, scope, subject)
);

CREATE INDEX IF NOT EXISTS message_cooldowns_expiry_idx
  ON bloom_discord.message_cooldowns (expires_at);

DROP TRIGGER IF EXISTS message_cooldowns_set_updated_at ON bloom_discord.message_cooldowns;
CREATE TRIGGER message_cooldowns_set_updated_at
  BEFORE UPDATE ON bloom_discord.message_cooldowns
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();


-- -----------------------------------------------------------------------------
-- idempotency_keys
-- -----------------------------------------------------------------------------
-- Exactly-once for operations where twice is harmful: granting points, opening a
-- report, applying a role transition.
--
-- The guarantee comes from the PRIMARY KEY, claimed inside the same transaction
-- as the effect. A double-clicked button produces two inserts, one of which
-- violates the key and is answered with DUPLICATE_OPERATION. This is also what
-- makes the system safe across multiple bot instances — the database arbitrates,
-- not the process.

CREATE TABLE IF NOT EXISTS bloom_discord.idempotency_keys (
  key           text PRIMARY KEY CHECK (length(key) BETWEEN 8 AND 128),

  bot_name      bloom_discord.bot_name NOT NULL,
  guild_id      bloom_discord.snowflake,
  -- What kind of operation this guards, e.g. 'rewards.grant'.
  operation     text NOT NULL CHECK (operation ~ '^[a-z][a-z0-9_.]{2,80}$'),

  -- Lets a replay return the original answer instead of an error, where the
  -- caller wants that. Must not contain private content.
  result        jsonb,

  correlation_id uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Housekeeping horizon. Keys are pruned after this, which bounds the table
  -- while keeping the window far longer than any plausible retry.
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE INDEX IF NOT EXISTS idempotency_keys_expiry_idx
  ON bloom_discord.idempotency_keys (expires_at);


-- -----------------------------------------------------------------------------
-- system_health
-- -----------------------------------------------------------------------------
-- The last observed health snapshot per bot, written by each process on a
-- heartbeat.
--
-- This is how one bot's /health can report on the other two: it reads their
-- rows. It reports observations with timestamps, never assumptions — a stale
-- row means "last seen 40 minutes ago", never "ONLINE".

CREATE TABLE IF NOT EXISTS bloom_discord.system_health (
  bot_name          bloom_discord.bot_name PRIMARY KEY,

  -- Distinguishes a restarted process from a stuck one.
  instance_id       text NOT NULL,
  version           text NOT NULL,
  environment       text NOT NULL,

  gateway_connected boolean NOT NULL,
  gateway_ping_ms   integer,
  database_ok       boolean NOT NULL,

  started_at        timestamptz NOT NULL,
  observed_at       timestamptz NOT NULL DEFAULT now(),

  commands_handled  bigint NOT NULL DEFAULT 0 CHECK (commands_handled >= 0),
  errors_total      bigint NOT NULL DEFAULT 0 CHECK (errors_total >= 0),
  last_command_at   timestamptz,
  last_error_at     timestamptz,
  last_error_code   text,

  details           jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE bloom_discord.system_health IS
  'Last observed health per bot. Readers must treat observed_at as authoritative: a stale row means "last seen at", never "online".';
