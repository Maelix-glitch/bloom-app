# Bloom — Mood fixes kit (v1)

A small, separate kit for exactly the problems you reported on `/mood` and
`/mood/intelligence`. It assumes the Mood page itself is already installed
(the Mood-page kit) and it never touches the home page.

What it fixes:

1. **Width** — `/mood` and `/mood/intelligence` were a narrow centred column
   (`max-w-6xl` / `max-w-[1200px]`). They now use the same edge-to-edge main as
   Today, so all three pages share identical margins.
2. **Flicker when moving between pages** — each page loaded your mood record on
   its own, and loaded it *twice* (Supabase fires an `INITIAL_SESSION` event
   right after the first fetch, which put the page back into "Reading your
   record…" and redrew it). Entries are now loaded once per session and shared;
   auth events refresh quietly. No spinner, no flash, on `/` → `/mood` →
   `/mood/intelligence`.
3. **Lag** — 27 animations were running idle on Intelligence, including a whole
   background layer that was *invisible* on that page (covered by the page
   shell) but still animating, plus a shimmer on every panel and evidence pill.
   The layer is lighter everywhere and gone from Intelligence; panels are
   still; the Intelligence panels only re-render when their own data changes;
   the trajectory chart drops a per-frame canvas blur. Range switches went from
   ~370 ms of work to ~30 ms; idle animations 27 → 3.
4. **Click → wait** — route code is now fetched when you hover a link, so the
   Intelligence page is in memory before you click.
5. **Your mood web** — the connection map under "Your mood journey": Mood in the
   centre, the signals you log on an inner ring, named emotions on an outer
   ring; line weight/colour is the real correlation on your days (gold lifts,
   rose lowers, dashed = not enough days yet). Hover to read, click/tap to pin,
   Escape to release. Honest empty state until you have a few days logged.

## Apply (Windows, PowerShell or cmd)

```
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-mood-fixes\bloom-mood-fixes\apply-mood-fixes.mjs"
```

(Windows' unzip usually double-nests the folder, hence
`bloom-mood-fixes\bloom-mood-fixes\`. If it landed elsewhere, point the second
path at wherever `apply-mood-fixes.mjs` is.)

The script first prints **Found:** — one line per problem saying whether your
tree still has it (`→`) or already has the fix (`✔`). So if it ever says
"already done" for everything and the page still looks the same, the cause is
not the code but the running app — see "If it still looks the same" below.

Expected output: `Found:` with `→` lines, then `Apply:` with `✔ added …` /
`✔ updated …` / `✔ patched …` lines, then `Verify:` with every line `✔`, then
`Done.` If anything prints `✖`, send me the whole output.

It is safe to run twice (a second run makes no edits), and it never silently
overwrites a file you changed yourself — an unexpected version is kept beside
the new one as `<name>.before-mood-fixes.txt` and the script tells you so.

## Then

1. **Stop the dev server and start it again** (`npm run dev`). Vite regenerates
   `src/routeTree.gen.ts` on start — commit that file too.
2. Open `/mood` and **hard-refresh once (Ctrl+F5)**.
3. `git add -A && git commit -m "fix(mood): full-width pages, no reload flicker, lighter motion, mood web" && git push`

## If it still looks the same

Work through these in order; each takes a minute.

1. **Run the script and read the `Found:` block.** `→` means the fix is not in
   the files; `✔` on every line means the files are right and the problem is
   the running app or browser (go to 2).
2. **Restart the dev server** and hard-refresh (Ctrl+F5). A dev server that was
   running while files changed can keep serving the old `styles.css` / route
   tree. If you use a preview URL (Lovable, Vercel…), that only updates after
   you **commit and push** — `git status` should be clean and `git log -1`
   should show your commit.
3. **Check the right repo.** Run `git rev-parse --show-toplevel` in the
   terminal you ran the script in and confirm it prints
   `…\bloom-app\chronos-feel`. The script defaults to the *current directory*;
   if you ran it from somewhere else, pass the repo path as the last argument.
4. **Quick file test:** open `src/components/mood/page/MoodPage.tsx` and search
   for `<MoodGraph`. If it's there, the code is in; if the page has no "Your mood
   web" section, the app you're looking at is not built from this code.

## What it changes, exactly

- Adds `src/lib/mood/record.ts`, `src/lib/mood/graph.ts` + `graph.test.ts`,
  `src/components/mood/page/MoodGraph.tsx`.
- Replaces (version-checked, local edits backed up): `src/components/mood/page/MoodPage.tsx`,
  `src/routes/mood/intelligence.tsx`, `src/hooks/useMoodSystem.ts`,
  `src/components/mood/primitives.tsx`, `Atmosphere.tsx`, `MoodChart.tsx`,
  `History.tsx`, `Calendar.tsx`, `Correlations.tsx`, `Heatmap.tsx`,
  `Timeline.tsx`, `Distribution.tsx`, `Insights.tsx`, `Emotions.tsx`,
  `Patterns.tsx`.
- One marker-guarded edit in `src/router.tsx` (`defaultPreload: "intent"`).
- `src/styles.css`: the `.mood-reveal` rule (before `@utility sheen-band`) and
  the scoped "Mood web" block (before the App shell block). CRLF preserved.

## What's in the box

- `apply-mood-fixes.mjs` — the script (Node ≥ 18, no dependencies).
- `files/` — full copies of the new/replaced files + the two CSS blocks.
