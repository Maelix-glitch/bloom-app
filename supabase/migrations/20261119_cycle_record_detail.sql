-- Cycle record detail (Phase 2 · Wave B).
--
-- Three additions, all nullable / defaulted so existing rows are untouched:
--
--   cycle_periods.excluded        the person's own "keep this cycle in my
--                                 history, but leave it out of my averages"
--                                 mark (exclude-a-cycle). Until this column
--                                 exists, period sync answers with a
--                                 schema-cache error, which the client
--                                 already treats as "tables not ready":
--                                 periods stay on the device (the designed
--                                 degradation), the daily log keeps syncing.
--
--   cycle_entries.clots           "clots today" on the daily log — feeds the
--                                 heavy-flow pattern guidance.
--   cycle_entries.symptom_severity  per-symptom severity (jsonb object of
--                                 symptom -> 1|2|3) for the same day.
--
-- NOTE: the client does not yet send clots / symptom_severity — the daily
-- log has no graceful missing-column path, so its sync mapping gains them
-- only once this migration is live everywhere. The fields are stored on
-- the device and in exports from day one.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.cycle_periods
  add column if not exists excluded boolean not null default false;

alter table public.cycle_entries
  add column if not exists clots boolean;

alter table public.cycle_entries
  add column if not exists symptom_severity jsonb;
