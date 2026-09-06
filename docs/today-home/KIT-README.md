# Bloom — Today home kit (v2)

What it installs on top of your repo:

1. **Today page at `/`** (v1) — insight-map layout wired to Supabase, live rings, the coach.
2. **Habits section** right under the greeting, with per-habit streaks, points, a progress bar and an empty state (v2).
3. **Floating "Add habit" button** bottom-right on every screen size; it opens the existing Add-habit modal (v2).
4. **The same sidebar on every main page** — Today, Trackers, Cycle, Mood, Rewards, Coach (and Profile): the rail on desktop, a bottom tab bar on phones (v2).
5. Rewards no longer crashes when the app runs without a Supabase `.env` (same guard the other hooks already had).

Safe to run whether or not v1 was applied before — it only adds what is missing, and it is safe to run twice.

## Apply (Windows, PowerShell or cmd)

Requires the metrics-modal fix kit applied first (`src\components\tk\MetricsEntryModal.tsx` must exist).

```
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-today-home\apply-today-home.mjs"
```

(If the unzip produced a double folder, add another `\bloom-today-home` to the second path.)

Expected: a list of `✔` lines, then `Verify:` with every line `✔`, then `Done.`
If anything prints `✖`, nothing else was touched — send me the output.

## Then

- `npm run dev` → `/` (Today: habits section + floating Add habit), then `/trackers`, `/cycle`, `/mood`, `/rewards`, `/coach` — same sidebar on each, the page's own design unchanged inside it.
- Supabase → SQL editor → run `supabase/migrations/20260906_today_home.sql` once (idempotent; creates `tracker_days`, `habits`, `habit_logs`, `profiles.total_points` + RPCs, RLS, realtime). Skip if you already ran it for v1.
- `git add -A && git commit -m "feat(home): habits section, floating add-habit, shared sidebar on every page" && git push`

## What's in the box

- `apply-today-home.mjs` — the script (Node ≥ 18, no dependencies). Preserves CRLF line endings; marker-guarded edits.
- `files/` — full copies of new/replaced files + the two CSS blocks it appends to `src/styles.css`.
