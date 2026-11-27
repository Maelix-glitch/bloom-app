-- =============================================================================
-- 0013 — Auto-moderation (design note 001)
-- =============================================================================
--
-- Guardian reacts to Discord's native Auto Moderation instead of reading
-- messages. Discord detects server-side and blocks before posting; when a
-- rule fires it emits AUTO_MODERATION_ACTION_EXECUTION, and Guardian adds
-- what Discord does not provide: an escalation ladder across repeat
-- offences, a case, moderator review with one-click reverse, and an audit
-- trail. See docs/architecture/design-notes/001-auto-moderation.md.
--
-- Two new tables, and two columns relaxed:
--
--   automod_events     one row per execution Discord reported
--   automod_policies   per-guild, per-channel escalation thresholds
--
--   moderation_actions.actor_id  NOT NULL → nullable
--   moderation_cases.opened_by   NOT NULL → nullable
--
-- The relaxations are the design note's audit rule made structural: an
-- automated action must be indistinguishable from a human one except for
-- its actor, which is null. The precedent already exists in this schema —
-- `case_events.actor_id` is NULL for system-generated events, and
-- `audit_events.actor_id` is nullable for the same reason. These two
-- columns were the outliers.
--
-- PRIVACY: there is no content column in this migration, and there never
-- will be. The execution event offers `content` and `matched_content` only
-- to holders of the Message Content intent, which no Bloom bot requests.
-- `matched_keyword` is stored because it is the staff-configured pattern
-- that matched — the rule's text, not the member's.
--
-- WRITE OWNERSHIP: Guardian only.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'automod_trigger_type'
  ) THEN
    CREATE TYPE bloom_discord.automod_trigger_type AS ENUM (
      'keyword',         -- a staff keyword rule (substring or regex)
      'spam',            -- Discord's generic spam heuristics
      'keyword_preset',  -- profanity / sexual content / slurs presets
      'mention_spam',    -- unique-mention limit and raid detection
      'member_profile'   -- a rule matched on a profile update; no message
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'automod_review_status'
  ) THEN
    CREATE TYPE bloom_discord.automod_review_status AS ENUM (
      'pending',     -- an action was taken; nobody has reviewed it
      'confirmed',   -- a moderator agreed with it
      'reversed',    -- a moderator undid it
      'escalated'    -- a moderator pushed it up to a case for administrators
    );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- The audit trail learns to say "no human did this"
-- -----------------------------------------------------------------------------

ALTER TABLE bloom_discord.moderation_actions
  ALTER COLUMN actor_id DROP NOT NULL;

COMMENT ON COLUMN bloom_discord.moderation_actions.actor_id IS
  'The moderator who acted, or NULL when Guardian acted on its own (auto-moderation). A NULL actor is the one deliberate difference between an automated action and a human one.';

ALTER TABLE bloom_discord.moderation_cases
  ALTER COLUMN opened_by DROP NOT NULL;

COMMENT ON COLUMN bloom_discord.moderation_cases.opened_by IS
  'The member of staff who opened the case, or NULL when Guardian opened it itself (origin = ''automation'').';


-- -----------------------------------------------------------------------------
-- automod_events
-- -----------------------------------------------------------------------------
-- One row per Auto Moderation execution Discord reported. Discord does not
-- guarantee delivery, so this table counts what Guardian saw and never
-- claims to be a complete history — a missed event under-punishes, which is
-- the correct direction to fail.
--
-- The unique index is the design note's idempotency key, enforced by the
-- database rather than by hope: (guild, user, message, rule). It is partial
-- because member_profile executions have no message; those are rare,
-- carry no escalation weight on their own, and are deduplicated by the
-- dispatcher's durable claim instead.

CREATE TABLE IF NOT EXISTS bloom_discord.automod_events (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id              bloom_discord.snowflake NOT NULL,
  user_id               bloom_discord.snowflake NOT NULL,

  -- NULL for member_profile executions, which are not about a message.
  channel_id            bloom_discord.snowflake,
  message_id            bloom_discord.snowflake,

  rule_id               bloom_discord.snowflake NOT NULL,
  trigger_type          bloom_discord.automod_trigger_type NOT NULL,

  -- The staff-configured pattern that matched. Never what the member typed.
  matched_keyword       text CHECK (matched_keyword IS NULL OR length(matched_keyword) <= 200),

  -- What Discord itself did, in Discord's words ('BLOCK_MESSAGE',
  -- 'SEND_ALERT_MESSAGE', 'TIMEOUT_MEMBER', 'QUARANTINE_USER', …). Free
  -- text on purpose: Discord extends this list, and an enum here would
  -- turn a new Discord action into a failed insert at 03:00.
  discord_action        text NOT NULL CHECK (length(discord_action) BETWEEN 1 AND 64),

  -- Set when this event crossed the policy threshold and Guardian acted.
  -- NULL means the event was only counted.
  ladder_step           integer CHECK (ladder_step IS NULL OR ladder_step > 0),

  -- The timeout Guardian applied, when it applied one. SET NULL, not
  -- CASCADE, for the same reason as moderation_actions.case_id: deleting
  -- a record must never silently erase that an action happened.
  moderation_action_id  bigint
                          REFERENCES bloom_discord.moderation_actions(id)
                          ON DELETE SET NULL,
  case_id               bigint
                          REFERENCES bloom_discord.moderation_cases(id)
                          ON DELETE SET NULL,

  -- The staff alert post carrying the review buttons.
  alert_message_id      bloom_discord.snowflake,

  review_status         bloom_discord.automod_review_status NOT NULL DEFAULT 'pending',
  reviewed_by           bloom_discord.snowflake,
  reviewed_at           timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),

  -- A review is a fact about a person at a time; half of it is not a review.
  CONSTRAINT automod_events_review_complete
    CHECK (
      (review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
      OR (review_status <> 'pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS automod_events_idempotency_idx
  ON bloom_discord.automod_events (guild_id, user_id, message_id, rule_id)
  WHERE message_id IS NOT NULL;

-- The escalation counter's read: this member, this trigger, inside a window.
CREATE INDEX IF NOT EXISTS automod_events_window_idx
  ON bloom_discord.automod_events (guild_id, user_id, trigger_type, created_at DESC);

-- The status command's read: this guild, recent volume.
CREATE INDEX IF NOT EXISTS automod_events_guild_recent_idx
  ON bloom_discord.automod_events (guild_id, created_at DESC);

COMMENT ON TABLE bloom_discord.automod_events IS
  'One row per Discord Auto Moderation execution Guardian reacted to. No message content is stored, by construction: no column exists for it.';


-- -----------------------------------------------------------------------------
-- automod_policies
-- -----------------------------------------------------------------------------
-- One row is one scope's escalation rule. Scope resolves most specific
-- first: channel+trigger, then channel, then guild+trigger, then the guild
-- default (both NULL). A row whose threshold columns are all NULL is an
-- exemptions-only row — it exists so `/guardian automod exempt` never has
-- to invent thresholds as a side effect, and the CHECK keeps a half-set
-- threshold from ever being stored.
--
-- No policy row at all means alert only. A punishment must never come from
-- an unconfigured rule, so the absence of a row is a meaningful state, not
-- a missing default to paper over.

CREATE TABLE IF NOT EXISTS bloom_discord.automod_policies (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id          bloom_discord.snowflake NOT NULL,

  -- NULL = every channel. A channel id = that channel only.
  channel_id        bloom_discord.snowflake,

  -- NULL = every trigger type.
  trigger_type      bloom_discord.automod_trigger_type,

  -- The ladder's one rung: this many events inside the window earns a
  -- timeout of this length. All three NULL, or all three set.
  threshold_count   integer CHECK (threshold_count IS NULL OR threshold_count BETWEEN 1 AND 100),
  window_seconds    integer CHECK (window_seconds IS NULL OR window_seconds BETWEEN 60 AND 604800),
  timeout_seconds   integer CHECK (timeout_seconds IS NULL OR timeout_seconds BETWEEN 60 AND 2419200),

  -- Roles whose members never escalate. Staff roles are exempt separately,
  -- in code, so emptying this list cannot un-exempt the moderators.
  exempt_role_ids   bloom_discord.snowflake[] NOT NULL DEFAULT '{}',

  updated_by        bloom_discord.snowflake NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT automod_policies_threshold_complete
    CHECK (
      (threshold_count IS NULL AND window_seconds IS NULL AND timeout_seconds IS NULL)
      OR (threshold_count IS NOT NULL AND window_seconds IS NOT NULL AND timeout_seconds IS NOT NULL)
    )
);

-- One row per scope. COALESCE because NULL <> NULL in a plain unique index,
-- and two guild-default rows would make resolution a coin flip.
CREATE UNIQUE INDEX IF NOT EXISTS automod_policies_scope_idx
  ON bloom_discord.automod_policies (
    guild_id,
    COALESCE(channel_id, '0'),
    COALESCE(trigger_type::text, 'all')
  );

COMMENT ON TABLE bloom_discord.automod_policies IS
  'Auto-moderation escalation thresholds and role exemptions, per guild and optionally per channel. Read at runtime: tuning never needs a deploy.';
