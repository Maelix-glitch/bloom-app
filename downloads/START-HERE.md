# Start here — Bloom (2026-08-30)

```bash
cd bloom-app && npm install && npm run dev
```

Routes: `/` mood · `/cycle` the cycle page · `/cycle-styles` eight themes ·
`/trackers` the daily trackers (Atlas) · `/trackers-styles` switch between
Atlas, Ledger, Strip and Console · `/coach`.

## What's new in this build

`/trackers` now renders the **Atlas** design — a 24-hour compass rose, six
territories drawn from contour lines, one route with six paths, a study field
and the advanced read. `/trackers-styles` switches between Atlas, Ledger,
Strip and the earlier Console page; the choice is remembered in localStorage.

Both pages are **wired to Supabase** and behave the same way: the device draws
first, the table reconciles in the background, and the page always says which
state it's in.

| Page | Table |
| --- | --- |
| `/` | `mood_entries` |
| `/cycle` | `cycle_entries` |
| `/trackers` | `tracker_days` |
| `/coach` | `coach_messages`, `coach_memory` |
| `/profile` | `profiles`, `profile_privacy`, `stories`, highlights |
| `/rewards` | `reward_items`, `reward_assignments` |

**One file does all of it:** open `supabase/COMPLETE-SETUP.sql`, paste it into
your project's SQL editor (Supabase → SQL editor → New query) and press Run.
Every statement is `if not exists`, so it's safe on a project that already has
some of these tables. `docs/SUPABASE-SETUP.md` explains what each one is for.

Three of those tables had **no migration in this repo at all** until now —
`mood_entries`, `coach_messages` and `coach_memory`. If you set your project up
by hand they may already exist; if not, the mood page and the coach have been
quietly falling back to the device this whole time.

Then copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Until a table exists its page keeps working from the
device and says so — nothing is lost by running the app first and adding the SQL
later.

## Which download is which

| Zip | For |
| --- | --- |
| `bloom-app-full.zip` | the whole project — take this one if you're starting fresh |
| `bloom-cycle-page.zip` | just the cycle route and what it imports |
| `bloom-trackers-page.zip` | just the trackers route and what it imports |

Each page zip ships its own `COPY-MAP.md` with the exact paste map.
