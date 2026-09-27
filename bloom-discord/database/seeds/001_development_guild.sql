-- =============================================================================
-- Development seed
-- =============================================================================
-- DEVELOPMENT AND TEST ONLY. The seed runner refuses to execute when
-- BLOOM_ENVIRONMENT=production.
--
-- This seeds *structure*, not people. It creates the guild row the bots expect
-- to exist and nothing else — no fake members, no fake points, no fake
-- moderation history. Invented data makes a dashboard look finished and makes
-- every subsequent bug report ambiguous.
--
-- :guild_id is substituted by the seed runner from DISCORD_GUILD_ID.
-- =============================================================================

INSERT INTO bloom_discord.guilds (guild_id, name, timezone, automation_enabled)
VALUES (:'guild_id', 'Bloom Labs (development)', 'UTC', true)
ON CONFLICT (guild_id) DO UPDATE
  SET name = EXCLUDED.name;
