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
| `mood_entries` | `/` | Table exists. **Columns not yet confirmed** — see below. |
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

**Don't drop them yet — rename them.** A rename is instant and reversible, and if
something does break you rename it back. Run this, use the app for a week, and
only then drop:

```sql
alter table public.water_logs         rename to legacy_water_logs;
alter table public.sleep_logs         rename to legacy_sleep_logs;
alter table public.study_logs         rename to legacy_study_logs;
alter table public.habits             rename to legacy_habits;
alter table public.habit_logs         rename to legacy_habit_logs;
alter table public.coach_conversations rename to legacy_coach_conversations;
alter table public.coach_notes        rename to legacy_coach_notes;
alter table public.coach_proposals    rename to legacy_coach_proposals;
alter table public.app_admin          rename to legacy_app_admin;
alter table public.insights           rename to legacy_insights;
```

To undo any of them: `alter table public.legacy_water_logs rename to water_logs;`

Only when you're sure:

```sql
drop table if exists public.legacy_water_logs;
-- …one line per table
```

**One question first: do you still use the old pages?** If you ever open
`/bloom/index.html`, `/bloom/coach.html` or the other files in `public/bloom/`,
those tables are still live and renaming them will break those pages. If the
React app at `/` is all you use, they're dead weight.

## One thing still to confirm

`mood_entries` wasn't in the column dump, and it's the one table where a mismatch
would matter. Run this and compare:

```sql
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mood_entries'
 order by ordinal_position;
```

Expected — `id`, `profile_id`, `mood_label`, `mood_intensity`, `energy`,
`stress`, `note`, `tags`, `logged_at`, `date`, `created_at`. Anything missing
from that list will make the mood page fall back to the device.

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
