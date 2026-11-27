-- =============================================================================
-- 0012_community_insights.sql — read paths for highlights, boards and the recap
-- =============================================================================
--
-- No tables, no columns, no constraints. Four indexes, and nothing else.
--
-- The highlights surfaces, the extended leaderboard and the weekly recap are
-- all reads over records that already exist: the ledger, the referral handoff,
-- the participation table and the award grants. Nothing about them needs a new
-- place to put data, and inventing one would have meant a second copy of
-- numbers the ledger already holds — a reporting table that can disagree with
-- the thing it reports on.
--
-- What they do need is for a guild-wide, window-scoped aggregate to be cheap.
-- Every query these features run has the same shape:
--
--   WHERE guild_id = $1 AND <timestamp> >= $2   GROUP BY <member>
--
-- and the existing indexes are all member-first — built for "show me this one
-- person's history", which is the opposite access pattern. Without the indexes
-- below, each of those aggregates degrades to a full scan of the guild's
-- history, and the weekly recap would get slower every week it ran.
--
-- ## Why partial indexes
--
-- Three of the four are partial. The rows these features care about are a
-- minority that shrinks over time as a proportion of the table — paid
-- referrals among mostly-pending ones, completed participations among joins —
-- and a partial index stays small enough to matter while the table does not.
-- The predicates use only immutable expressions, so Postgres can match them.
--
-- ## What is deliberately absent
--
-- No materialised view, and no scheduled refresh of one. The recap runs weekly
-- over a seven-day window and the boards are capped at 25 rows; at that size a
-- correct aggregate against the source is faster than the machinery needed to
-- keep a cached one honest, and it can never be stale.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Qualified referrals, grouped by inviter, over a window.
-- ---------------------------------------------------------------------------
-- `referral_triggers_inviter_idx` leads with inviter_user_id, which answers
-- "how many has this person made". The referral board asks the inverse —
-- "who, across the guild, in this period" — and cannot use it.
--
-- Partial on the two states that mean the referral really happened. A pending
-- row may still be rejected, so counting it would credit someone for an invite
-- that never qualified; a rejected row never counts at all.
CREATE INDEX IF NOT EXISTS referral_triggers_qualified_window_idx
  ON bloom_discord.referral_triggers (guild_id, qualified_at)
  WHERE state IN ('qualified', 'paid');

-- ---------------------------------------------------------------------------
-- Completions, over a window, for the challenge and event boards.
-- ---------------------------------------------------------------------------
-- `community_participants_member_idx` leads with user_id for the same reason
-- and has the same problem. This one leads with the guild and the completion
-- instant, which is the order the boards and the recap scan in.
--
-- The activity kind is not in the index: splitting challenges from events
-- needs a join to `community_activities`, and that join is driven by the
-- activity_id already on each row. Indexing `kind` here would have meant
-- denormalising it onto the participation row, which is a schema change in
-- exchange for a join the planner is good at.
CREATE INDEX IF NOT EXISTS community_participants_completed_window_idx
  ON bloom_discord.community_participants (guild_id, completed_at)
  WHERE state = 'completed';

-- ---------------------------------------------------------------------------
-- Recent awards, guild-wide.
-- ---------------------------------------------------------------------------
-- `member_awards_member_idx` is (guild_id, user_id, earned_at) — fine for one
-- member's shelf, useless for "what has the community earned lately", which is
-- what the highlights and the recap show.
CREATE INDEX IF NOT EXISTS member_awards_recent_idx
  ON bloom_discord.member_awards (guild_id, earned_at DESC);

-- ---------------------------------------------------------------------------
-- Open activities by window.
-- ---------------------------------------------------------------------------
-- `community_activities_open_window_idx` already covers open activities by
-- window, so there is nothing to add for the status view. Recorded here so the
-- absence reads as a decision rather than an oversight.

COMMENT ON INDEX bloom_discord.referral_triggers_qualified_window_idx IS
  'Guild-wide referral board and weekly recap. Partial: only referrals that actually qualified.';

COMMENT ON INDEX bloom_discord.community_participants_completed_window_idx IS
  'Guild-wide challenge/event completion boards and weekly recap. Partial: completions only.';

COMMENT ON INDEX bloom_discord.member_awards_recent_idx IS
  'Recent recognition across the guild, for highlights and the weekly recap.';
