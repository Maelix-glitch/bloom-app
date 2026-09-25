-- =============================================================================
-- 0008_labs.sql — Bloom Labs: feedback and bug intake
-- =============================================================================
--
-- The two things members give Labs: an opinion, and a defect.
--
-- They are separate tables rather than one `submissions` table with a `type`
-- column, because they diverge everywhere that matters. A bug has a lifecycle,
-- a triager, a resolution and a number people quote at each other. Feedback has
-- none of those — it is read, it informs something, and it is done. Merging
-- them would mean every bug query filtering on a type it already knows, and
-- every feedback row carrying five columns that are permanently null.
--
-- Both tables hold member-authored text, which nothing else in this schema does
-- except `moderation_cases.summary`. That is the whole reason they exist: a bug
-- report is useless without the description. See the retention note at the foot
-- of this file.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- feedback
-- -----------------------------------------------------------------------------
-- Product feedback, as submitted. No lifecycle.
--
-- Deliberately has no status column. A status implies someone is obliged to
-- move it, and an inbox of things nobody triages that all read `NEW` forever is
-- worse than no status at all — it is a public promise the team has not made.
-- Feedback is recorded and posted to the feedback channel, where humans deal
-- with it the way humans deal with things.

CREATE TABLE IF NOT EXISTS bloom_discord.feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id        bloom_discord.snowflake NOT NULL
                    REFERENCES bloom_discord.guilds (guild_id) ON DELETE CASCADE,
  user_id         bloom_discord.snowflake NOT NULL,

  -- Constrained rather than free text so the channel can be filtered and so
  -- two people describing the same kind of thing use the same word for it.
  category        text NOT NULL
                    CHECK (category IN ('feature', 'improvement', 'content', 'other')),

  -- Member-authored. Length caps match the modal's own limits, so a submission
  -- that fits the form always fits the table.
  summary         text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 8 AND 200),
  detail          text CHECK (detail IS NULL OR char_length(detail) <= 2000),

  -- Where it was announced, so a later edit or delete can find the message.
  -- Null when no feedback channel is configured, which is a real state.
  message_id      bloom_discord.snowflake,

  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bloom_discord.feedback IS
  'Product feedback as submitted. No status column on purpose: an untriaged inbox of NEW rows is a promise nobody made.';

CREATE INDEX IF NOT EXISTS feedback_guild_created_idx
  ON bloom_discord.feedback (guild_id, created_at DESC);

-- Finds "what has this member already told us", which is the question asked
-- before replying to someone who submits three times in a week.
CREATE INDEX IF NOT EXISTS feedback_guild_user_idx
  ON bloom_discord.feedback (guild_id, user_id, created_at DESC);


-- -----------------------------------------------------------------------------
-- bug_counters
-- -----------------------------------------------------------------------------
-- Per-guild bug numbers, allocated the same way case numbers are.
--
-- A separate counter from `case_counters` on purpose. Bug 12 and case 12 are
-- different things that different people quote, and sharing an allocator would
-- make the bug numbers jump every time a moderation case was opened.

CREATE TABLE IF NOT EXISTS bloom_discord.bug_counters (
  guild_id     bloom_discord.snowflake PRIMARY KEY
                 REFERENCES bloom_discord.guilds (guild_id) ON DELETE CASCADE,
  next_number  integer NOT NULL DEFAULT 1 CHECK (next_number > 0),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bloom_discord.bug_counters IS
  'Per-guild bug number allocator. Incremented under a row lock, like case_counters.';


-- -----------------------------------------------------------------------------
-- bug_status
-- -----------------------------------------------------------------------------
-- The triage lifecycle.
--
-- Five states, and the three terminal ones are distinguished because they mean
-- genuinely different things to the person who reported it: FIXED is "you were
-- right and it is gone", WONT_FIX is "you were right and we are choosing to
-- live with it", DUPLICATE is "you were right and someone said it first".
-- Collapsing them into CLOSED would make every one of those read as a shrug.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'bug_status' AND n.nspname = 'bloom_discord'
  ) THEN
    CREATE TYPE bloom_discord.bug_status AS ENUM (
      'NEW', 'TRIAGED', 'FIXED', 'WONT_FIX', 'DUPLICATE'
    );
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- bug_reports
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bloom_discord.bug_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id        bloom_discord.snowflake NOT NULL
                    REFERENCES bloom_discord.guilds (guild_id) ON DELETE CASCADE,
  bug_number      integer NOT NULL CHECK (bug_number > 0),
  reporter_id     bloom_discord.snowflake NOT NULL,

  status          bloom_discord.bug_status NOT NULL DEFAULT 'NEW',
  area            text NOT NULL
                    CHECK (area IN ('app', 'discord', 'account', 'other')),

  summary         text NOT NULL CHECK (char_length(btrim(summary)) BETWEEN 8 AND 200),
  -- Steps to reproduce. The single most useful field on the form, so it is
  -- required: a bug report without them is a sentence, not a report.
  steps           text NOT NULL CHECK (char_length(btrim(steps)) BETWEEN 8 AND 2000),
  -- What the member expected instead. Optional; often obvious from the steps.
  expected        text CHECK (expected IS NULL OR char_length(expected) <= 1000),

  triaged_by      bloom_discord.snowflake,
  triaged_at      timestamptz,
  -- Why it landed where it landed. Required for every terminal state.
  resolution      text CHECK (resolution IS NULL OR char_length(resolution) <= 1000),
  -- Set only for DUPLICATE, and only to another bug's number in this guild.
  duplicate_of    integer CHECK (duplicate_of IS NULL OR duplicate_of > 0),

  message_id      bloom_discord.snowflake,
  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT bug_number_unique_per_guild UNIQUE (guild_id, bug_number),

  -- A terminal state has to say why. The same reasoning as
  -- moderation_cases' resolution CHECK: the row is the record, and a row that
  -- says FIXED with no explanation is indistinguishable from a misclick.
  CONSTRAINT terminal_needs_resolution CHECK (
    status IN ('NEW', 'TRIAGED')
    OR (resolution IS NOT NULL AND char_length(btrim(resolution)) > 0)
  ),

  -- Anything a human moved has to record who moved it.
  CONSTRAINT triaged_needs_actor CHECK (
    status = 'NEW' OR (triaged_by IS NOT NULL AND triaged_at IS NOT NULL)
  ),

  -- duplicate_of belongs to exactly one status, and that status requires it.
  CONSTRAINT duplicate_points_somewhere CHECK (
    (status = 'DUPLICATE') = (duplicate_of IS NOT NULL)
  ),

  -- A bug cannot be a duplicate of itself.
  CONSTRAINT duplicate_is_another_bug CHECK (
    duplicate_of IS NULL OR duplicate_of <> bug_number
  )
);

COMMENT ON TABLE bloom_discord.bug_reports IS
  'Member-filed defects with a triage lifecycle. Terminal states require a resolution; DUPLICATE requires a target.';

CREATE INDEX IF NOT EXISTS bug_reports_guild_status_idx
  ON bloom_discord.bug_reports (guild_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS bug_reports_guild_reporter_idx
  ON bloom_discord.bug_reports (guild_id, reporter_id, created_at DESC);

-- The triage queue: everything still waiting on a human, oldest first. Partial,
-- because the open set stays small while the closed set grows forever.
CREATE INDEX IF NOT EXISTS bug_reports_open_idx
  ON bloom_discord.bug_reports (guild_id, created_at)
  WHERE status IN ('NEW', 'TRIAGED');


-- -----------------------------------------------------------------------------
-- bug_events
-- -----------------------------------------------------------------------------
-- Every status change, append-only.
--
-- `bug_reports.status` is the current state and this is how it got there. The
-- current state alone cannot answer "who closed this and when", and that is the
-- question asked when a member says their bug was dismissed.

CREATE TABLE IF NOT EXISTS bloom_discord.bug_events (
  id          bigserial PRIMARY KEY,
  bug_id      uuid NOT NULL
                REFERENCES bloom_discord.bug_reports (id) ON DELETE CASCADE,
  -- Null means the previous state was "did not exist" — i.e. the filing.
  from_status bloom_discord.bug_status,
  to_status   bloom_discord.bug_status NOT NULL,
  actor_id    bloom_discord.snowflake,
  note        text CHECK (note IS NULL OR char_length(note) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE bloom_discord.bug_events IS
  'Append-only triage history. ON DELETE CASCADE because an event about a deleted bug explains nothing.';

CREATE INDEX IF NOT EXISTS bug_events_bug_idx
  ON bloom_discord.bug_events (bug_id, created_at);


-- =============================================================================
-- Retention
-- =============================================================================
--
-- These two tables hold free text a member wrote, which makes them the most
-- sensitive thing Labs stores. Three deliberate limits:
--
--   • No attachments and no links are stored. The modal collects text; a
--     screenshot goes in the channel thread where the member controls it.
--   • `guilds` cascades, so removing the guild removes the submissions.
--   • Nothing here records anything about a member except their id. There is no
--     email, no app account link, no device information — a bug report is about
--     software, and asking for more would make this an incident of its own.
--
-- There is no automatic expiry. Adding one is a future migration and a product
-- decision about how long a defect stays useful, not something to guess at now.
-- =============================================================================
