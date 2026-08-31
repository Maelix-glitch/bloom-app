# Supabase setup — one file, one run

Bloom's pages all work without a database: each one keeps its own copy on the
device, so nothing is ever lost by running it first and connecting the account
later. When you do connect it, they sync — device first, background reconcile,
and the page always says which state it's in.

## The one thing to do

Open **Supabase → your project → SQL editor**, paste the whole of
[`supabase/COMPLETE-SETUP.sql`](../supabase/COMPLETE-SETUP.sql), and press Run.

It's generated from the individual migrations by `python3 scripts/make-sql.py`,
so it can't drift from them. Every statement is `create ... if not exists` /
`create or replace`, so it's safe on a project that already has some of these
tables, and safe to run twice.

Then put two values in `.env.local` and restart the dev server:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

## What it creates

| Table | Page | What it holds |
| --- | --- | --- |
| `profiles` | `/profile` | identity — name, username, avatar, accent, points |
| `profile_privacy` | `/profile` | what a visitor is allowed to see |
| `stories`, `story_highlights`, `story_highlight_items` | `/profile` | moments and the highlight reels |
| `mood_entries` | `/` | every mood you've logged |
| `cycle_entries` | `/cycle` | one row per day of cycle data |
| `tracker_days` | `/trackers` | sleep, water, study, movement, energy, screen |
| `coach_messages`, `coach_memory` | `/coach` | the thread, and the facts it has learned |
| `reward_items`, `reward_assignments`, `app_admins` | `/rewards` | rewards and who has claimed what |

Plus the `profile-media` storage bucket, the row-level-security policies on all
of them, and the functions the app calls (`is_bloom_username_available`,
`get_public_bloom_profile`, `claim_reward`, `get_my_rewards`, the `admin_*`
set).

Every table is keyed the same way: `profile_id` is the signed-in user's id, and
row-level security means a person only ever reads or writes their own rows. There
are no anonymous read policies — the public profile goes through the
`get_public_bloom_profile()` function, which respects the privacy settings.

## The three that were missing

Until this branch, three tables the app writes to had **no migration at all** in
this repo — they existed only on projects that had been set up by hand:

- **`mood_entries`** — the mood page has been writing to it for months. Without
  it, saving a mood throws, the page catches the error and falls back to the
  device. You'd never see a crash; you'd just never sync.
- **`coach_messages`** and **`coach_memory`** — same story for `/coach`: the
  thread works locally and is lost when you change browser.
- **`profiles`** — 20260828 adds the identity columns to a table it assumes
  already exists. On a fresh project that migration failed halfway through.

If your project already has any of them, the `if not exists` guards leave your
data alone.

## Running the migrations individually

If you'd rather apply them one at a time (or you use `supabase db push`), the
order matters — the identity migration ALTERs `profiles`:

1. `20260826_reward_delivery.sql`
2. `20260827_profiles_bootstrap.sql`
3. `20260828_profile_identity_stories.sql`
4. `20260829_cycle_intelligence.sql`
5. `20260830120000_tracker_days.sql`
6. `20260831000000_mood_entries.sql`
7. `20260831000100_coach_memory.sql`

## How each page behaves once it's connected

The device is the source of truth for drawing. On load the page renders what it
has immediately, then pulls the table and reconciles: on a date it holds on both
sides the newer `updated_at` wins, dates held on only one side are kept, and
anything newer on the device is pushed straight back up. Edits go up about 0.7s
after you stop typing; a failed push re-queues the rows so the retry doesn't lose
them.

The header on `/cycle` and `/trackers` tells you which state it's in — saved,
saving, not signed in, or *couldn't reach your account, safe on this device*.
