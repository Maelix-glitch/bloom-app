-- Habits can be paused (Tier A · A3). Archive already existed (is_archived);
-- a pause is one remembered window during which the habit is neither due nor
-- counted against a streak. Both are plain column flips — history stays.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.habits add column if not exists paused_from date;
alter table public.habits add column if not exists paused_until date;

-- a pause with only an end date starts on that date; never let it run backwards
alter table public.habits drop constraint if exists habits_pause_window_check;
alter table public.habits add constraint habits_pause_window_check
  check (paused_from is null or paused_until is null or paused_from <= paused_until);

-- logs are removed with the habit (the client only deletes after the undo
-- window has closed); older projects created the FK without a cascade
do $$
declare
  fk record;
begin
  for fk in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'habit_logs'
      and con.contype = 'f'
      and con.confrelid = 'public.habits'::regclass
      and con.confdeltype <> 'c'
  loop
    execute format('alter table public.habit_logs drop constraint %I', fk.conname);
    execute 'alter table public.habit_logs add constraint habit_logs_habit_id_fkey '
         || 'foreign key (habit_id) references public.habits(id) on delete cascade';
  end loop;
end $$;
