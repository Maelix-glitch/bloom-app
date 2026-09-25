-- =============================================================================
-- 0005 — Moderation and cases
-- =============================================================================
-- Phase 2. The moderation record owned by Bloom Guardian.
--
-- Four tables, one aggregate: **the case file**.
--
--   moderation_cases    the file itself, and its current status
--   case_events         append-only history of everything that happened to it
--   moderation_actions  what was actually done to a member or channel
--   reports             a member-submitted report, which always opens a case
--
-- Shape follows migration 0004: an append-only history beside a fast
-- current-state column. The reasoning is the same and worth repeating, because
-- it is the reason this is four tables rather than one.
--
--   • A status column answers "where is this case now" in one indexed read.
--   • A history table answers "who changed it, when, and why" — which is the
--     question that actually matters in a dispute, months later, when the
--     moderator involved has left.
--
-- Neither can be derived cheaply from the other, so both exist, and the
-- repository writes them in one transaction.
--
-- WRITE OWNERSHIP: Guardian only. Companion and Labs have no code path that
-- writes these tables and, in production, should not hold the grant.
--
-- PRIVACY: `reports.description` is member-supplied text about other members.
-- It is the single most sensitive column in the schema. It is never rendered to
-- anyone outside the staff channels, never written to `audit_events.details`,
-- and never included in an error message. See §"Privacy" at the foot of this
-- file.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
-- Closed vocabularies, mirrored in @bloom/shared-types. Free text here would
-- let a future caller invent a sixth case status that no UI knows how to show
-- and no policy knows how to gate.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'case_status'
  ) THEN
    CREATE TYPE bloom_discord.case_status AS ENUM (
      'OPEN',       -- logged, nobody has picked it up
      'IN_REVIEW',  -- a moderator owns it and is working
      'ESCALATED',  -- needs an administrator
      'RESOLVED',   -- an outcome was reached; may still be reopened
      'CLOSED'      -- terminal, archived
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'case_origin'
  ) THEN
    CREATE TYPE bloom_discord.case_origin AS ENUM (
      'report',      -- a member used /report
      'moderator',   -- staff opened it directly
      'automation'   -- opened by Guardian itself (reserved; nothing writes it yet)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'case_event_type'
  ) THEN
    CREATE TYPE bloom_discord.case_event_type AS ENUM (
      'opened',
      'status_changed',
      'assigned',
      'unassigned',
      'note',            -- staff commentary
      'action_recorded'  -- a moderation_action was attached
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'moderation_action'
  ) THEN
    CREATE TYPE bloom_discord.moderation_action AS ENUM (
      'warn',
      'clear_warnings',
      'timeout',
      'untimeout',
      'kick',
      'ban',
      'unban',
      'purge',
      'slowmode',
      'lock',
      'unlock',
      'note'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'bloom_discord' AND t.typname = 'report_category'
  ) THEN
    CREATE TYPE bloom_discord.report_category AS ENUM (
      'member_conduct',
      'user_safety',
      'moderation_review',
      'technical',
      'support_escalation'
    );
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- case_counters
-- -----------------------------------------------------------------------------
-- Human-quotable case numbers, per guild, starting at 1.
--
-- Not a Postgres sequence: a sequence is global, so guild B's first case would
-- be #4,201 because guild A got there first. Staff quote these numbers out loud
-- in a channel; "case 7" has to mean something.
--
-- Not `max(case_number) + 1` either — that is a lost-update race that two
-- moderators filing at once would hit, and the losing side gets a duplicate key
-- error at the worst moment. `UPDATE … RETURNING` takes a row lock and hands
-- back a number nobody else can receive.

CREATE TABLE IF NOT EXISTS bloom_discord.case_counters (
  guild_id     bloom_discord.snowflake PRIMARY KEY,
  next_number  integer NOT NULL DEFAULT 1 CHECK (next_number > 0),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bloom_discord.case_counters IS
  'Per-guild case number allocator. Incremented under a row lock so concurrent case creation cannot collide.';


-- -----------------------------------------------------------------------------
-- moderation_cases
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.moderation_cases (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id        bloom_discord.snowflake NOT NULL,

  -- What staff type and say. Unique per guild, never reused.
  case_number     integer NOT NULL CHECK (case_number > 0),

  status          bloom_discord.case_status NOT NULL DEFAULT 'OPEN',
  origin          bloom_discord.case_origin NOT NULL,
  category        bloom_discord.report_category,

  -- The member the case concerns. Nullable: a case can be about an incident in
  -- a channel with no single subject, and forcing a subject would invite
  -- someone to be named on a case that is not about them.
  subject_id      bloom_discord.snowflake,

  opened_by       bloom_discord.snowflake NOT NULL,
  assigned_to     bloom_discord.snowflake,

  -- One line, staff-written or derived from a report category. Deliberately
  -- short: the detail belongs in case_events and reports, and a summary long
  -- enough to hold detail is a summary nobody reads.
  summary         text NOT NULL CHECK (length(summary) BETWEEN 1 AND 280),

  -- What was decided. Required to leave RESOLVED or CLOSED, by the constraint
  -- below — a resolved case with no recorded outcome is not resolved, it is
  -- forgotten.
  resolution      text CHECK (resolution IS NULL OR length(resolution) <= 1024),

  correlation_id  text CHECK (correlation_id IS NULL OR length(correlation_id) <= 64),

  opened_at       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  closed_at       timestamptz,

  CONSTRAINT moderation_cases_number_unique UNIQUE (guild_id, case_number),

  -- A terminal state must carry its evidence. These are the constraints that
  -- make "never fake functionality" enforceable at rest rather than by review:
  -- code cannot mark a case resolved without saying when and what was decided.
  CONSTRAINT moderation_cases_resolved_complete
    CHECK (status <> 'RESOLVED' OR (resolved_at IS NOT NULL AND resolution IS NOT NULL)),
  CONSTRAINT moderation_cases_closed_complete
    CHECK (status <> 'CLOSED' OR closed_at IS NOT NULL)
);

DROP TRIGGER IF EXISTS moderation_cases_set_updated_at ON bloom_discord.moderation_cases;
CREATE TRIGGER moderation_cases_set_updated_at
  BEFORE UPDATE ON bloom_discord.moderation_cases
  FOR EACH ROW EXECUTE FUNCTION bloom_discord.set_updated_at();

-- The queue view: "what is open in this guild, oldest first".
CREATE INDEX IF NOT EXISTS moderation_cases_status_idx
  ON bloom_discord.moderation_cases (guild_id, status, opened_at);

-- "Everything we hold on this member."
CREATE INDEX IF NOT EXISTS moderation_cases_subject_idx
  ON bloom_discord.moderation_cases (guild_id, subject_id, opened_at DESC)
  WHERE subject_id IS NOT NULL;

-- "What is on my plate." Partial: an unassigned case is the common row and
-- indexing NULLs here buys nothing.
CREATE INDEX IF NOT EXISTS moderation_cases_assignee_idx
  ON bloom_discord.moderation_cases (guild_id, assigned_to, status)
  WHERE assigned_to IS NOT NULL;

COMMENT ON TABLE bloom_discord.moderation_cases IS
  'The case file. Current status only; the history lives in case_events. Written by Bloom Guardian only.';


-- -----------------------------------------------------------------------------
-- case_events
-- -----------------------------------------------------------------------------
-- Append-only. No UPDATE or DELETE path exists in the application.
--
-- A moderator correcting themselves adds a note; it does not rewrite an earlier
-- one. That is the difference between a record and a draft.

CREATE TABLE IF NOT EXISTS bloom_discord.case_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  case_id         bigint NOT NULL
                    REFERENCES bloom_discord.moderation_cases(id) ON DELETE CASCADE,

  event_type      bloom_discord.case_event_type NOT NULL,

  -- Populated for status_changed, NULL otherwise.
  from_status     bloom_discord.case_status,
  to_status       bloom_discord.case_status,

  -- NULL for system-generated events.
  actor_id        bloom_discord.snowflake,

  -- Note text, assignment target, or a short description of the linked action.
  body            text CHECK (body IS NULL OR length(body) <= 2000),

  correlation_id  text CHECK (correlation_id IS NULL OR length(correlation_id) <= 64),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- A status change must say what changed, and nothing else may claim to.
  CONSTRAINT case_events_status_change_complete
    CHECK (
      (event_type = 'status_changed' AND from_status IS NOT NULL AND to_status IS NOT NULL)
      OR (event_type <> 'status_changed' AND from_status IS NULL AND to_status IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS case_events_case_idx
  ON bloom_discord.case_events (case_id, created_at);

COMMENT ON TABLE bloom_discord.case_events IS
  'Append-only history of one case. Never updated, never deleted: case history is evidence.';


-- -----------------------------------------------------------------------------
-- moderation_actions
-- -----------------------------------------------------------------------------
-- Every action a moderator took, whether or not it belongs to a case.
--
-- Warnings are rows here with `action = 'warn'`, not a separate `warnings`
-- table. The Phase 0 plan sketched both; building it showed the split was
-- duplication — a warning is a moderation action with a revocation column, and
-- two tables would need every query, index and retention rule written twice.
--
-- Revocation is a column rather than a DELETE. Clearing someone's warnings must
-- not erase the fact that they were warned; it records that the warnings no
-- longer count.

CREATE TABLE IF NOT EXISTS bloom_discord.moderation_actions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id          bloom_discord.snowflake NOT NULL,

  -- ON DELETE SET NULL, not CASCADE: deleting a case must never silently erase
  -- the record that somebody was banned.
  case_id           bigint REFERENCES bloom_discord.moderation_cases(id) ON DELETE SET NULL,

  action            bloom_discord.moderation_action NOT NULL,

  -- Member actions carry subject_id; channel actions (purge, slowmode, lock,
  -- unlock) carry channel_id. Purge carries both when it targeted one member.
  subject_id        bloom_discord.snowflake,
  channel_id        bloom_discord.snowflake,

  actor_id          bloom_discord.snowflake NOT NULL,

  -- Required. An unexplained moderation action is the thing that turns into an
  -- argument nobody can settle, so the schema will not store one.
  reason            text NOT NULL CHECK (length(reason) BETWEEN 1 AND 512),

  -- Timeouts and temporary measures.
  duration_seconds  integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  expires_at        timestamptz,

  -- Lifted: a warning cleared, a ban reversed, a timeout removed early.
  revoked_at        timestamptz,
  revoked_by        bloom_discord.snowflake,
  revoked_reason    text CHECK (revoked_reason IS NULL OR length(revoked_reason) <= 512),

  -- Structured extras that do not deserve a column: purge message count,
  -- slowmode seconds, previous channel state for unlock. Never message content.
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,

  correlation_id    text CHECK (correlation_id IS NULL OR length(correlation_id) <= 64),
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- An action must be against something.
  CONSTRAINT moderation_actions_has_target
    CHECK (subject_id IS NOT NULL OR channel_id IS NOT NULL),

  -- Revocation is all-or-nothing: a revoked_at with no revoked_by is an
  -- anonymous reversal, which defeats the point of the column.
  CONSTRAINT moderation_actions_revocation_complete
    CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

-- "This member's record", the single most common moderation read.
CREATE INDEX IF NOT EXISTS moderation_actions_subject_idx
  ON bloom_discord.moderation_actions (guild_id, subject_id, created_at DESC)
  WHERE subject_id IS NOT NULL;

-- "Active warnings for this member" — the count that drives escalation. Partial
-- so it stays small: revoked warnings and every non-warn action drop out.
CREATE INDEX IF NOT EXISTS moderation_actions_active_warnings_idx
  ON bloom_discord.moderation_actions (guild_id, subject_id)
  WHERE action = 'warn' AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS moderation_actions_case_idx
  ON bloom_discord.moderation_actions (case_id)
  WHERE case_id IS NOT NULL;

-- Expiry sweeps for temporary measures.
CREATE INDEX IF NOT EXISTS moderation_actions_expiry_idx
  ON bloom_discord.moderation_actions (guild_id, expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;

COMMENT ON TABLE bloom_discord.moderation_actions IS
  'Every moderation action taken, including warnings. Rows are never deleted; reversal is recorded in revoked_at/revoked_by.';

COMMENT ON COLUMN bloom_discord.moderation_actions.metadata IS
  'Structured detail about the action (counts, durations, prior channel state). Never message content.';


-- -----------------------------------------------------------------------------
-- reports
-- -----------------------------------------------------------------------------
-- A member-submitted report. Always attached to exactly one case, created in
-- the same transaction — a report with no case is a report nobody is assigned
-- to read.

CREATE TABLE IF NOT EXISTS bloom_discord.reports (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id           bloom_discord.snowflake NOT NULL,

  -- One case per report, enforced. CASCADE because a report cannot outlive its
  -- case: there would be nowhere to read it from.
  case_id            bigint NOT NULL UNIQUE
                       REFERENCES bloom_discord.moderation_cases(id) ON DELETE CASCADE,

  reporter_id        bloom_discord.snowflake NOT NULL,
  category           bloom_discord.report_category NOT NULL,

  -- What is being reported. All optional individually, but see the constraint.
  target_user_id     bloom_discord.snowflake,
  target_channel_id  bloom_discord.snowflake,
  target_message_id  bloom_discord.snowflake,

  -- The reporter's own words. Sensitive; see the privacy note at the foot.
  description        text NOT NULL CHECK (length(description) BETWEEN 1 AND 1800),

  correlation_id     text CHECK (correlation_id IS NULL OR length(correlation_id) <= 64),
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- A report must point at something a moderator can actually look at.
  CONSTRAINT reports_has_target
    CHECK (target_user_id IS NOT NULL OR target_message_id IS NOT NULL),

  -- A message reference without its channel cannot be opened. Discord needs
  -- both to build a link, so half a reference is no reference.
  CONSTRAINT reports_message_needs_channel
    CHECK (target_message_id IS NULL OR target_channel_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS reports_reporter_idx
  ON bloom_discord.reports (guild_id, reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reports_target_idx
  ON bloom_discord.reports (guild_id, target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;

COMMENT ON TABLE bloom_discord.reports IS
  'Member-submitted reports. Stores a reference to the reported message (ids), never a copy of its content.';

COMMENT ON COLUMN bloom_discord.reports.description IS
  'PRIVATE. The reporter''s own account. Staff channels only: never rendered to the reported member, never copied into audit_events.details, never included in an error surfaced to a user.';


-- =============================================================================
-- Privacy
-- =============================================================================
-- Two columns in this migration hold member-supplied prose: reports.description
-- and case_events.body. Both are private to staff.
--
-- The application enforces this in three places, and all three are needed
-- because each covers a different way it would otherwise leak:
--
--   1. Repositories never return `description` from a listing method — only
--      from the single-case read a staff-gated command performs.
--   2. `audit_events.details` is redacted on write (packages/security), so a
--      caller that passes a description into an audit row stores a marker, not
--      the text.
--   3. User-facing errors carry a code and a member-safe message; the operator
--      hint that might quote a row never reaches Discord.
--
-- Retention is deliberately not implemented here. A DELETE policy on evidence
-- is a decision for the community's privacy policy, not a default a migration
-- should quietly impose. Tracked as a Phase 7 item.
-- =============================================================================
