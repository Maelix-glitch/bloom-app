-- Mood context signals survive a save (Tier A · A2).
--
-- The Mood composer collects sleep, sleep quality, exercise, steps,
-- productivity, study, screen time, social activity, workload and weather, and
-- the analytics ("Your mood web", correlations, the Today connection map) are
-- built to use them — but the table had nowhere to keep them, so every value
-- vanished on reload. One jsonb column holds the optional signals, only the
-- keys that are present:
--
--   {"sleep": 7.5, "sleepQuality": 8, "exercise": 30, "screenTime": 3, "weather": "rain"}
--
-- Rows without it behave exactly as before. The app keeps working on a table
-- that hasn't run this yet (it falls back to the old column list), so the
-- order in which you apply the kit and this migration doesn't matter.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.mood_entries
  add column if not exists context jsonb;

comment on column public.mood_entries.context is
  'Optional context signals for the entry (sleep hours, sleepQuality 1-10, exercise min, steps, productivity 1-10, study min, screenTime hours, social 1-10, workload 1-10, weather). Only present keys are stored.';
