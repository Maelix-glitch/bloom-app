-- -----------------------------------------------------------------------------
-- 0009 — room in the ledger for future reward sources
-- -----------------------------------------------------------------------------
-- Bloom Rewards is about to grow sources beyond check-ins and small wins:
-- qualified referrals, completed events, completed challenges, and the points
-- attached to an achievement. None of them are implemented yet. This migration
-- only widens the vocabulary the ledger will accept, so that when they arrive
-- they append to the *existing* economy instead of justifying a second one.
--
-- 0006 anticipated exactly this and chose a CHECK over an ENUM so the change
-- would be a one-line migration rather than a type alteration. This is that
-- migration.
--
-- Backward compatible by construction:
--   * No column is added, dropped or retyped.
--   * No existing row is read, rewritten or deleted — the four original kinds
--     remain valid, so every row already stored still satisfies the new CHECK.
--   * The constraint is only ever widened. Nothing that was legal becomes
--     illegal, so a rollback to the 0008 binary keeps working against this
--     schema until something writes one of the new kinds.
--
-- The accompanying constraints are deliberately left alone and are what make
-- the new kinds safe:
--
--   point_events_actor_matches_kind
--     (kind IN ('manual_award','adjustment')) = (awarded_by IS NOT NULL)
--     The new kinds are automatic, so this now *requires* awarded_by to be
--     NULL for them. A referral bonus cannot be attributed to a moderator, and
--     staff cannot launder a hand-made grant through a system kind.
--
--   point_events_manual_needs_reason
--     Unchanged: still only the two manual kinds must carry a reason.
--
--   points <> 0, idempotency_key, the unique index
--     Unchanged, and the reason no new table is needed: a referral bonus is a
--     signed, idempotent, attributable ledger row, which is precisely what
--     point_events already is.

-- The constraint is recreated rather than ALTERed because PostgreSQL has no
-- "widen this CHECK" operation. Dropping and adding inside one transaction
-- leaves no window in which the table is unconstrained.
ALTER TABLE bloom_discord.point_events
  DROP CONSTRAINT IF EXISTS point_events_kind_check;

ALTER TABLE bloom_discord.point_events
  ADD CONSTRAINT point_events_kind_check
  CHECK (kind IN (
    -- The original four. Order preserved for readability of diffs.
    'check_in',
    'small_win',
    'manual_award',
    'adjustment',

    -- New in 0009. Nothing emits these yet; see POINT_KINDS in
    -- @bloom/shared-types, which is the matching closed set in TypeScript.
    'referral',
    'event_completion',
    'challenge_completion',
    'achievement_reward'
  ));

COMMENT ON COLUMN bloom_discord.point_events.kind IS
  'Closed set, mirrored by POINT_KINDS in @bloom/shared-types. Widened in 0009 '
  'with referral, event_completion, challenge_completion and achievement_reward '
  'so future community sources append to this ledger rather than starting a '
  'second one. Only manual_award and adjustment may carry awarded_by.';
