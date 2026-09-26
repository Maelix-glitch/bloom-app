-- =============================================================================
-- 0006 — Bloom Rewards
-- =============================================================================
-- Phase 5. The points ledger, and the check-in record that is its first source.
--
-- The brief's constraints on this feature are unusually specific: no XP
-- farming, no reward inflation, no fake stats. Those are not properties a
-- service can promise; they are properties a schema either enforces or does
-- not. So the rules live here:
--
--   • The ledger is APPEND-ONLY. There is no UPDATE path and no balance column.
--     A balance is SUM(points), computed on read, which cannot drift from the
--     events that produced it because it is not stored anywhere else.
--   • Every entry carries an idempotency key, unique per guild. A replayed
--     interaction, a double-click or a redelivered gateway event inserts
--     nothing the second time — the index decides, not the application.
--   • An automatic award may not name an actor, and a manual one may not hide
--     one. Enforced by CHECK, so "who gave me these points?" always has an
--     answer.
--   • One check-in per member per LOCAL calendar day, enforced by the primary
--     key rather than by a query-then-insert that races with itself.
--
-- WRITE OWNERSHIP: Companion only. Guardian and Labs have no code path that
-- writes either table and, in production, should not hold the grant.
--
-- NOT the Bloom app's points. The app's `profiles.total_points` is a different
-- economy earned from verified personal records; these points come from showing
-- up in a Discord server. See packages/shared-types/src/rewards.ts.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- point_events — the ledger
-- -----------------------------------------------------------------------------
-- Append-only. Corrections are made by appending a negative `adjustment`, never
-- by editing or deleting a row: a ledger whose history can be rewritten cannot
-- answer the only question a ledger exists to answer.

CREATE TABLE IF NOT EXISTS bloom_discord.point_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  guild_id         text NOT NULL,
  user_id          text NOT NULL,

  -- Closed set, matching POINT_KINDS in @bloom/shared-types. A CHECK rather
  -- than an ENUM because the two extra kinds this will grow (challenges,
  -- milestones) should be a one-line migration, not a type alteration.
  kind             text NOT NULL
                   CHECK (kind IN ('check_in', 'small_win', 'manual_award', 'adjustment')),

  -- Signed: a correction is a negative entry. Never zero — a zero-point event
  -- is either a bug or a log line pretending to be a transaction.
  points           integer NOT NULL
                   CHECK (points <> 0 AND points BETWEEN -100000 AND 100000),

  -- Why, in words, for anything a human chose to do. Never member-authored
  -- content: the text of a shared win is not stored here (or anywhere).
  reason           text CHECK (reason IS NULL OR char_length(reason) <= 500),

  -- NULL means the platform awarded this automatically.
  awarded_by       text,

  idempotency_key  text NOT NULL
                   CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),

  correlation_id   text,
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- An automatic award may not claim an actor; a manual one may not omit one.
  -- Both directions matter: the first stops a job attributing itself to a
  -- moderator, the second stops an unattributable grant of points.
  CONSTRAINT point_events_actor_matches_kind CHECK (
    (kind IN ('manual_award', 'adjustment')) = (awarded_by IS NOT NULL)
  ),

  -- Staff discretion is auditable or it is not discretion.
  CONSTRAINT point_events_manual_needs_reason CHECK (
    kind NOT IN ('manual_award', 'adjustment')
    OR (reason IS NOT NULL AND char_length(btrim(reason)) > 0)
  )
);

-- The duplicate guard. Scoped per guild because the same logical operation in
-- two communities is two different events.
CREATE UNIQUE INDEX IF NOT EXISTS point_events_idempotency_idx
  ON bloom_discord.point_events (guild_id, idempotency_key);

-- Balance, history and the daily small-win count all read one member's rows.
CREATE INDEX IF NOT EXISTS point_events_member_idx
  ON bloom_discord.point_events (guild_id, user_id, created_at DESC);

-- The leaderboard reads one guild's rows over a period.
CREATE INDEX IF NOT EXISTS point_events_guild_period_idx
  ON bloom_discord.point_events (guild_id, created_at DESC);

COMMENT ON TABLE bloom_discord.point_events IS
  'Append-only Bloom Rewards ledger. Balance is SUM(points); there is no stored '
  'total. Corrections are negative adjustment rows. Never UPDATE or DELETE.';

COMMENT ON COLUMN bloom_discord.point_events.awarded_by IS
  'NULL for automatic awards. Required for manual_award and adjustment, and '
  'forbidden otherwise, by point_events_actor_matches_kind.';


-- -----------------------------------------------------------------------------
-- check_ins — one row per member per local day
-- -----------------------------------------------------------------------------
-- `local_date` is the calendar date in BLOOM_TIMEZONE, resolved by the
-- application before the insert. It is deliberately not derived from
-- `created_at`:
--
--   • now()::date is UTC, which would roll the day over at midnight UTC and
--     hand a member in Australia two check-ins for one evening.
--   • Storing the resolved date means editing BLOOM_TIMEZONE later cannot
--     rewrite the meaning of check-ins already recorded.
--
-- No column stores what anyone wrote. `/checkin` records that a member showed
-- up and nothing about how they are — wellbeing text is exactly the category of
-- data this platform should not be accumulating.

CREATE TABLE IF NOT EXISTS bloom_discord.check_ins (
  guild_id        text NOT NULL,
  user_id         text NOT NULL,
  local_date      date NOT NULL,

  -- The award this check-in produced. NULL is legitimate and means the
  -- check-in was recorded while FEATURE_REWARDS was off — the participation
  -- still happened, and back-dating points for it later would be inventing
  -- history.
  point_event_id  uuid REFERENCES bloom_discord.point_events(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (guild_id, user_id, local_date)
);

-- Streaks read a member's recent dates in order.
CREATE INDEX IF NOT EXISTS check_ins_member_date_idx
  ON bloom_discord.check_ins (guild_id, user_id, local_date DESC);

COMMENT ON TABLE bloom_discord.check_ins IS
  'One row per member per calendar day in BLOOM_TIMEZONE. The primary key is '
  'the once-a-day rule. Stores no member-authored text.';
