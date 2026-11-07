-- Habits get bespoke Bloom glyphs (UI update U4 · plan §3.4).
-- New habits store icon_type='bloom' with icon_value = a registry glyph id
-- ('sprout', 'fern', …) instead of an emoji character.
--
-- Default-only: this changes what NEW rows get when icon_type is not
-- supplied, and nothing else. No existing row is rewritten — legacy rows
-- keep icon_type='emoji' and their emoji character, and the client
-- twin-maps catalogue emoji to their bespoke glyphs at render time.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.habits alter column icon_type set default 'bloom';
