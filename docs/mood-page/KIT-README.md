# Bloom — Mood page kit (v1)

A separate kit, on top of the Today-home kit you already applied. It does not
touch the home page.

What it installs:

1. **The Mood page from the harmonious-dashboard model at `/mood`** — hero window
   ("Today you feel *calm*, Name" once you've logged; "How are you feeling
   today?" before), **Log your mood** with the six faces (a tap is a real
   check-in saved to your mood record; tapping another face today replaces it;
   "Log an entry" opens the full composer), **Your mood journey** (last seven
   logged days, period pill 7 / 30 / 90 days, "A small insight"), **Mood
   distribution** (ring + legend), **Quick insights** (only patterns your
   entries actually support), **Streak & consistency**, and the closing banner.
   Each section is its own card, one below another, with room to breathe.
   Nothing is hardcoded — every number comes from your entries, and every
   section has an honest empty state until you have logged.
2. **Mood Intelligence moves to `/mood/intelligence`**, unchanged (heatmap,
   calendar, correlations, patterns, history). Reached from "See all",
   "Explore your insights", the Rewards back-link, and a small "← Mood" link at
   its top.
3. **The avatar block at the foot of the sidebar** (from the model): settings
   glyph · your photo (or accent-tinted initials) · your name · your bio line,
   on every main page. It refreshes the moment you change your photo or name on
   Profile. Signed out it reads "Sign in — Sync across your devices". On short
   windows the quote hides so nothing collides.
4. The model's six photos live on Lovable's private CDN and can't be fetched,
   so they were recreated to the model's own image descriptions. To use the
   originals, overwrite `src/assets/mood/*.jpg` (same filenames) — nothing else
   changes.

Requires the Today-home kit (any version from v2 on — you have v4 or v5).
Safe to run twice: it only adds what is missing.

## Apply (Windows, PowerShell or cmd)

```
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-mood-page\bloom-mood-page\apply-mood-page.mjs"
```

(Windows' unzip usually double-nests the folder, hence `bloom-mood-page\bloom-mood-page\`.
If you extracted it somewhere else, point the second path at wherever
`apply-mood-page.mjs` landed.)

Expected: `✔ moved src/routes/mood.tsx → src/routes/mood/intelligence.tsx`
(the old file disappearing is intended), a list of `✔ wrote …` lines, then
`Verify:` with every line `✔`, then `Done.`
If anything prints `✖`, send me the output.

## Then

- `npm run dev` → `/mood`. Tap a face while signed in — the hero updates and the
  face lights up; "See all" → `/mood/intelligence`. Then any other page: your
  avatar + name at the foot of the sidebar. Hard-refresh (Ctrl+F5) if the old
  layout lingers. The dev server regenerates `src/routeTree.gen.ts` for the new
  routes on first start — commit that file too.
- `git add -A && git commit -m "feat(mood): model Mood page at /mood, Intelligence at /mood/intelligence, rail avatar" && git push`

## What it changes, exactly

- Moves `src/routes/mood.tsx` → `src/routes/mood/intelligence.tsx` (route id +
  the "← Mood" link; nothing else in the file).
- Adds `src/routes/mood/index.tsx`, `src/components/mood/page/*` (4 files),
  `src/lib/mood/page.ts` + `page.test.ts`, `src/hooks/useRailIdentity.ts`,
  `src/assets/mood/*.jpg` (6 images).
- Replaces `src/components/home/HomeSidebar.tsx` (the kit's own file, now with
  the identity row).
- Five one-line, marker-guarded edits in `src/hooks/useProfileSpace.ts`
  (`announceProfileChanged()` after each identity save); one link in
  `src/components/rewards/RewardsPage.tsx`.
- `src/styles.css`: the gold tokens (`--gold`, `--gold-soft`, `--color-gold*`),
  the scoped `.mood-page` block, and a refreshed app-shell block at the end of
  the file (adds two small rail rules). Preserves CRLF line endings.

## What's in the box

- `apply-mood-page.mjs` — the script (Node ≥ 18, no dependencies).
- `files/` — full copies of the new/replaced files + the two CSS blocks.
