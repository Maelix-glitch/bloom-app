-- =============================================================================
-- 0007 — Milestones and achievements
-- =============================================================================
-- Phase 6. The end of the brief's progression chain:
--
--   meaningful action → Bloom Points → milestone → rank → achievement
--
-- Points and rank arrived in Phase 5. This is the recognition layer, and it is
-- one table because milestones and achievements differ in what they mean, not
-- in how they are stored.
--
-- Two rules the schema carries:
--
--   • An award is granted ONCE. The primary key says so, rather than a service
--     remembering to check first — a milestone announced twice is worse than
--     one announced late, because it makes every other announcement suspect.
--   • Every award records the evidence it was granted on. "Your 50th check-in"
--     has to be a fact that can be re-derived months later, not a number that
--     was true at the time nobody can check.
--
-- WRITE OWNERSHIP: Companion only.
--
-- Nothing here grants points. See docs/operations/bloom-rewards.md: recognition
-- is not currency, and a milestone derived from points that also pays points is
-- a feedback loop with a name — inflation.
-- =============================================================================


CREATE TABLE IF NOT EXISTS bloom_discord.member_awards (
  guild_id    text NOT NULL,
  user_id     text NOT NULL,

  -- Matches a definition key in apps/companion/src/features/awards. Dotted and
  -- lowercase, the same shape as job keys and audit events, so the whole
  -- platform has one identifier convention.
  award_key   text NOT NULL
              CHECK (award_key ~ '^[a-z][a-z0-9_.]{2,60}$'),

  -- What kind of thing this is, for routing the announcement and for the two
  -- commands that list them separately.
  kind        text NOT NULL CHECK (kind IN ('milestone', 'achievement')),

  -- The counts the grant was based on: {"checkIns": 50} and so on. Numbers
  -- only — never anything a member wrote, and never anything about how they
  -- are. Kept so that a grant can be audited long after the thresholds have
  -- been retuned.
  evidence    jsonb NOT NULL DEFAULT '{}'::jsonb,

  earned_at   timestamptz NOT NULL DEFAULT now(),

  -- True once the announcement has been posted. Separate from `earned_at`
  -- because the grant and the announcement are different effects with
  -- different failure modes: Discord being down must not stop the award being
  -- earned, and a retried announcement must not be sent twice.
  announced   boolean NOT NULL DEFAULT false,

  PRIMARY KEY (guild_id, user_id, award_key)
);

-- Listing one member's awards, newest first.
CREATE INDEX IF NOT EXISTS member_awards_member_idx
  ON bloom_discord.member_awards (guild_id, user_id, earned_at DESC);

-- Finding what still needs announcing, after an outage.
CREATE INDEX IF NOT EXISTS member_awards_unannounced_idx
  ON bloom_discord.member_awards (guild_id, earned_at)
  WHERE announced = false;

COMMENT ON TABLE bloom_discord.member_awards IS
  'Milestones and achievements, granted once each by primary key. Grants no '
  'points: recognition is not currency. evidence holds counts only.';

COMMENT ON COLUMN bloom_discord.member_awards.evidence IS
  'The counts the grant was based on, so it can be re-derived later. Numbers '
  'only — no member-authored text, ever.';
