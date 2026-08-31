# Database audit — what the React app actually uses

Checked against the code in this repo on 2026-08-31. "Wired" means the React app
reads and/or writes that table. "Legacy" means the only thing that touches it is
the old static app in `public/bloom/` (the `.html` pages and `public/bloom/js/`).

## Wired — the app uses these

| Table | Page | Notes |
| --- | --- | --- |
| `profiles` | `/profile` | All columns the app writes are there: `id`, `display_name`, `username`, `bio`, `avatar_path`, `accent`, `featured`, `profile_name`, `total_points`, `updated_at`. `email` and `avatar_url` are extra and unused — harmless. |
| `profile_privacy` | `/profile` | Exact match: `profile_id`, `profile_visibility`, `story_visibility`, `updated_at`. |
| `stories` | `/profile` | Exact match, including `deleted_at` and the `bloom_story_kind` / `bloom_visibility` enums. |
| `story_highlights` | `/profile` | Exact match. |
| `story_highlight_items` | `/profile` | Exact match. |
| `mood_entries` | `/` | **Verified 2026-08-31.** All nine columns the app writes are present: `profile_id`, `mood_label`, `mood_intensity`, `energy`, `stress`, `tags`, `note`, `logged_at`, `date`, plus `id` and `created_at`. Two unused extras, `updated_at` and `intensity`, are harmless. |
| `cycle_entries` | `/cycle` | Every column the app writes is present. Extra legacy columns (`cycle_length`, `last_logged_at`, `next_period_in_days`, `sexual_activity`, `contraceptive`, `mood_label`) are unused but harmless. |
| `tracker_days` | `/trackers` | Exact match — created by `20260830120000_tracker_days.sql`. |
| `coach_messages` | `/coach` | All needed columns present. Note your `content` is `jsonb` where the migration says `text` — your table was kept, and the app writes a plain string, which jsonb stores and returns as a string. Works either way. |
| `coach_memory` | `/coach` | All needed columns present (`id`, `profile_id`, `category`, `fact`, `pinned`, `updated_at`) plus `confidence`, `source`, `last_referenced_at`, which nothing reads yet. |
| `reward_items`, `reward_assignments` | `/rewards` | Used through the `claim_reward` / `get_my_rewards` / `admin_*` functions, not read directly. |
| `app_admins` | `/admin` | Used by `is_rewards_admin()` inside those functions. |

## Not wired — only the old static pages touch these

| Table | Used by | Safe to remove? |
| --- | --- | --- |
| `water_logs` | `public/bloom/js/trackers.js` | Only if you no longer open `/bloom/index.html` |
| `sleep_logs` | same | same |
| `study_logs` | same | same |
| `habits` | `public/bloom/js/habits.js` | Only if you no longer open it. The React coach reads habits from **localStorage** (`bloom.habits`), not this table |
| `habit_logs` | `public/bloom/js/habits.js` | same — React reads `bloom.habit_logs` from localStorage |
| `coach_conversations` | `public/bloom/coach.html` | Superseded by `coach_messages` |
| `coach_notes` | `public/bloom/coach.html` | Nothing in React reads it |
| `coach_proposals` | `public/bloom/coach.html` | Nothing in React reads it |
| `app_admin` (singular) | nothing anywhere | The functions use `app_admins` (plural). This one is a leftover |
| `insights` | nothing | The word appears in component names only; no table is read |

## Before you delete anything

**Don't drop them yet — rename them.** A rename is instant and reversible; if
something breaks you rename it back.

Run this as one block. It's deliberately written without `schema.table` pairs in
the SQL text — some chat apps auto-link `public.something` into a hyperlink and
corrupt the statement before it ever reaches Postgres (that produces
`42P01: relation "[public.app](http://public.app)_admin" does not exist`).

```sql
set search_path to public;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('water_logs',          'legacy_water_logs'),
      ('sleep_logs',          'legacy_sleep_logs'),
      ('study_logs',          'legacy_study_logs'),
      ('habits',              'legacy_habits'),
      ('habit_logs',          'legacy_habit_logs'),
      ('coach_conversations', 'legacy_coach_conversations'),
      ('coach_notes',         'legacy_coach_notes'),
      ('coach_proposals',     'legacy_coach_proposals'),
      ('app_admin',           'legacy_app_admin'),
      ('insights',            'legacy_insights')
    ) as v(old_name, new_name)
  loop
    if to_regclass('public' || '.' || r.old_name) is not null
       and to_regclass('public' || '.' || r.new_name) is null
    then
      execute format('alter table %I rename to %I', r.old_name, r.new_name);
      raise notice 'renamed % to %', r.old_name, r.new_name;
    end if;
  end loop;
end $$;
```

It renames only what's there and skips anything already renamed, so it's safe to
run twice. To confirm what happened:

```sql
select table_name
  from information_schema.tables
 where table_schema = 'public'
 order by table_name;
```

To undo one: `alter table legacy_water_logs rename to water_logs;`

Only when you're sure, a week later:

```sql
drop table if exists legacy_water_logs;
-- one line per table
```

**One question first: do you still use the old pages?** If you ever open
`/bloom/index.html`, `/bloom/coach.html` or the other files in `public/bloom/`,
those tables are still live and renaming them will break those pages. If the
React app at `/` is all you use, they're dead weight.

## How to prove a table is really wired

Don't trust the schema — make a row. On `/trackers`, tap `+250ml` on water, wait
a second, then:

```sql
select profile_id, date, water_ml, updated_at
  from public.tracker_days
 order by updated_at desc
 limit 5;
```

A row for today means the whole path works: page → client → table. The header on
`/trackers` will also read **saved to your account** instead of *on this device*.
