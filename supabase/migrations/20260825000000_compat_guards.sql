-- Bloom — compatibility guards. Run this FIRST.
--
-- Why this exists: every migration here uses `create table if not exists`, which
-- silently does nothing when the table is already there. That's usually what you
-- want — it protects data. But if your project already had, say, `coach_memory`
-- from an earlier setup and that table is missing a column a later migration
-- indexes, the migration dies with 42703 (column does not exist) and nothing at
-- all gets created.
--
-- So: before anything else, look at the tables that already exist and add the
-- columns the rest of this setup is going to need. Only touches a table that is
-- already there, and only adds a column that isn't. Never drops, never alters a
-- column that exists.
--
-- Safe to run as often as you like — it does nothing once the columns are there.

do $$
declare
  g record;
begin
  for g in
    select * from (values
      -- table,                 column,        type to add if it's missing
      ('reward_items',          'updated_at',  'timestamptz not null default now()'),
      ('reward_assignments',    'created_at',  'timestamptz not null default now()'),
      ('profiles',              'updated_at',  'timestamptz not null default now()'),
      ('stories',               'created_at',  'timestamptz not null default now()'),
      ('stories',               'expires_at',  'timestamptz not null default now() + interval ''24 hours'''),
      ('stories',               'deleted_at',  'timestamptz'),
      ('cycle_entries',         'updated_at',  'timestamptz not null default now()'),
      ('cycle_entries',         'profile_id',  'uuid'),
      ('cycle_entries',         'date',        'date'),
      ('mood_entries',          'logged_at',   'timestamptz not null default now()'),
      ('mood_entries',          'profile_id',  'uuid'),
      ('mood_entries',          'date',        'date'),
      ('coach_messages',        'created_at',  'timestamptz not null default now()'),
      ('coach_memory',          'updated_at',  'timestamptz not null default now()')
    ) as v(table_name, column_name, column_type)
  loop
    if to_regclass(format('public.%I', g.table_name)) is not null
       and not exists (
         select 1
           from information_schema.columns
          where table_schema = 'public'
            and table_name   = g.table_name
            and column_name  = g.column_name
       )
    then
      execute format(
        'alter table public.%I add column if not exists %I %s',
        g.table_name, g.column_name, g.column_type
      );
      raise notice 'bloom compat: added public.%.%', g.table_name, g.column_name;
    end if;
  end loop;
end $$;
