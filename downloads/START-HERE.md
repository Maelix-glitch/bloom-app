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

| Page | Table | Migration to run |
| --- | --- | --- |
| `/cycle` | `cycle_entries` | `supabase/migrations/20260829_cycle_intelligence.sql` |
| `/trackers` | `tracker_days` | `supabase/migrations/20260830120000_tracker_days.sql` |

Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Until the table exists the pages keep working from
the device and say so in the header — nothing is lost by running them first and
adding the SQL later.

## Which download is which

| Zip | For |
| --- | --- |
| `bloom-app-full.zip` | the whole project — take this one if you're starting fresh |
| `bloom-cycle-page.zip` | just the cycle route and what it imports |
| `bloom-trackers-page.zip` | just the trackers route and what it imports |

Each page zip ships its own `COPY-MAP.md` with the exact paste map.
