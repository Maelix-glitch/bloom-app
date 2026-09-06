# Bloom — Today home kit (v4)

What it installs on top of your repo:

0. **One chrome, no second header** (v4): the old top header bar is gone from Today, Trackers, Cycle, Mood, Rewards, Coach and Profile. The left rail now runs from the very top of the page (brand → links → Profile), stays put while you scroll, and the botanical photo fills its foot at its natural proportions (never stretched) and fades into the panel. On phones: a slim brand bar on top, the tab bar at the bottom. Plus a little more, controlled breathing room on Today.

1. **Today page at `/`** (v1) — insight-map layout wired to Supabase, live rings, the coach.
2. **Habits section** right under the greeting, with per-habit streaks, points, a progress bar and an empty state (v2).
3. **Floating "Add habit" button** bottom-right on every screen size (v2) — it opens…
4. **The v3 "latest" Add-habit dialog** (v3): a 1:1 port of `public/bloom/bloom-add-habit-modal-v3-latest.html` — three steps (Basics · Schedule · Details), live preview card, icon search + custom image upload, colour swatch that re-tints the dialog, custom-day picker, weekly target, measurable goal, start date, points stepper, priority, reminder, tags, validation, success overlay. Wired to real habit creation (Supabase when signed in, this device otherwise); days / weekly target / goal are now saved too.
5. **The same sidebar on every main page** — Today, Trackers, Cycle, Mood, Rewards, Coach (and Profile): the rail on desktop, a bottom tab bar on phones (v2).
6. Rewards no longer crashes when the app runs without a Supabase `.env` (same guard the other hooks already had).

Safe to run whether v1, v2, v3 or nothing was applied before — it only adds what is missing, and it is safe to run twice. On a repo that already has v3 it rewrites five files (`index.tsx`, `trackers.tsx`, `cycle.tsx`, `HomeSidebar.tsx`, `HabitsSection.tsx`), swaps the app-shell block at the end of `src/styles.css`, and removes the `<BloomHeader />` line + import from `mood.tsx`, `profile.tsx`, `CoachPage.tsx`, `RewardsPage.tsx`.

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

- `npm run dev` → `/` (Today: one rail from the top, habits section, floating Add habit → the 3-step dialog), then `/trackers`, `/cycle`, `/mood`, `/rewards`, `/coach` — same rail on each, no second header, the page's own design unchanged inside it.
- Supabase → SQL editor → run `supabase/migrations/20260906_today_home.sql` once (idempotent; creates `tracker_days`, `habits`, `habit_logs`, `profiles.total_points` + RPCs, RLS, realtime). Skip if you already ran it for v1.
- `git add -A && git commit -m "feat(home): single rail chrome, v3 add-habit dialog, habits section" && git push`

## What's in the box

- `apply-today-home.mjs` — the script (Node ≥ 18, no dependencies). Preserves CRLF line endings; marker-guarded edits.
- `files/` — full copies of new/replaced files + the two CSS blocks it appends to `src/styles.css`.
