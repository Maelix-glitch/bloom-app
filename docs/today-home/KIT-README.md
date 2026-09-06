# Bloom — Today home kit (v5)

What it installs on top of your repo:

0. **Rail that stays put, aligned brand, taller phone header** (v5): the sidebar is now `position: fixed` — exactly one screen tall, pinned to the left edge — so it never scrolls along with the page and is never taller than the window, whatever the page or browser (v4 used `sticky`, which some ancestors quietly break). The Bloom mark sits exactly on the nav-icon column and the wordmark on the label column. On phones the brand bar is 60px (was 52px) with a slightly larger mark, wordmark and profile button, and it is fixed to the top.

1. **One chrome, no second header** (v4): the old top header bar is gone from Today, Trackers, Cycle, Mood, Rewards, Coach and Profile. The left rail now runs from the very top of the page (brand → links → Profile), stays put while you scroll, and the botanical photo fills its foot at its natural proportions (never stretched) and fades into the panel. On phones: a slim brand bar on top, the tab bar at the bottom. Plus a little more, controlled breathing room on Today.

2. **Today page at `/`** (v1) — insight-map layout wired to Supabase, live rings, the coach.
3. **Habits section** right under the greeting, with per-habit streaks, points, a progress bar and an empty state (v2).
4. **Floating "Add habit" button** bottom-right on every screen size (v2) — it opens…
5. **The v3 "latest" Add-habit dialog** (v3): a 1:1 port of `public/bloom/bloom-add-habit-modal-v3-latest.html` — three steps (Basics · Schedule · Details), live preview card, icon search + custom image upload, colour swatch that re-tints the dialog, custom-day picker, weekly target, measurable goal, start date, points stepper, priority, reminder, tags, validation, success overlay. Wired to real habit creation (Supabase when signed in, this device otherwise); days / weekly target / goal are now saved too.
6. **The same sidebar on every main page** — Today, Trackers, Cycle, Mood, Rewards, Coach (and Profile): the rail on desktop, a bottom tab bar on phones (v2).
7. Rewards no longer crashes when the app runs without a Supabase `.env` (same guard the other hooks already had).

Safe to run whether v1, v2, v3, v4 or nothing was applied before — it only adds what is missing, and it is safe to run twice. On a repo that already has v4 it changes exactly two things: it rewrites `src/components/home/HomeSidebar.tsx` and swaps the app-shell block at the end of `src/styles.css` (everything else prints "already done").

## Apply (Windows, PowerShell or cmd)

Requires the metrics-modal fix kit applied first (`src\components\tk\MetricsEntryModal.tsx` must exist).

```
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-today-home\bloom-today-home\apply-today-home.mjs"
```

(That is the double-nested path Windows' unzip produced last time; if you extracted the new zip somewhere else, point the second path at wherever `apply-today-home.mjs` landed.)

Expected: a list of `✔` lines, then `Verify:` with every line `✔`, then `Done.`
If anything prints `✖`, nothing else was touched — send me the output.

## Then

- `npm run dev` → `/` — scroll: the rail stays exactly where it is, one screen tall; the Bloom mark lines up with the nav icons. Then `/trackers`, `/cycle`, `/mood`, `/rewards`, `/coach`, `/profile` — same rail on each. Narrow the window below 1024px: the 60px brand bar on top, the tab bar at the bottom. Hard-refresh (Ctrl+F5) if the old layout lingers.
- Supabase → SQL editor → run `supabase/migrations/20260906_today_home.sql` once (idempotent; creates `tracker_days`, `habits`, `habit_logs`, `profiles.total_points` + RPCs, RLS, realtime). Skip if you already ran it for v1.
- `git add -A && git commit -m "feat(shell): fixed rail, aligned brand, taller phone header" && git push`

## What's in the box

- `apply-today-home.mjs` — the script (Node ≥ 18, no dependencies). Preserves CRLF line endings; marker-guarded edits.
- `files/` — full copies of new/replaced files + the two CSS blocks it appends to `src/styles.css`.
