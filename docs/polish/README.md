# Bloom — premium polish kit

**63 files** (38 new, 25 changed). Everything since the Tier B part 2 kit.
No new packages. No new migrations.

## Run it

```powershell
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-polish\bloom-polish\apply-polish.mjs" .
```

If the folder isn't double-nested, drop one `bloom-polish` level.

Then: stop the dev server, `npm run dev`, and hard-refresh once (Ctrl+F5).

## What's in it

**The three bugs you hit**
- Tab-change flicker with Cycle briefly visible. `AppNav` is mounted per route,
  so every navigation remounted the sidebar and its hooks restarted from their
  defaults — painting the wrong nav for one frame. Now cached at module level.
- The lag itself: that same remount re-ran a session check, a profile query and
  a full prefs sync on every tab change. Now fetched once and shared.
- The mood image pinch: two animations disagreed about scale at the handover
  (1.0 vs 1.04), so the photo snapped 4% larger at 1400ms. The swaying branch
  had no overscan, so its edge flashed. Both fixed.

**The coach**
- 30 recognised topics, up from 11. The "strictness" was never refusal logic —
  it was that anything outside eleven trackers fell to a generic reply.
- Answer length now matched to the question's shape.
- Your Supabase edge function, with the on-device responder as fallback.
- Model picker in the header; it shows an amber dot when a remote choice fell
  back to the device rather than degrading silently.
- Answers reveal progressively instead of landing as a wall of text.

**Launch as admin** — rebuilt from a ghost link into a real launcher. Twelve
destinations including the design pages nothing links to. Type to filter,
arrows to move, enter to go. An amber bar bottom-left marks admin mode and
exits it (which brings the welcome flow back).

**Also** — rotating copy so nothing repeats, app-wide sound (silent on Rewards),
motion primitives, the premium cycle palette, finished popup edges, preset
profile photos, and the onboarding gate.

## Safety

- Refuses to run if your checkout is behind, and writes nothing in that case.
- Idempotent — running twice is a no-op.
- Anything you edited yourself is kept as `<name>__BEFORE__`.

Verified by applying to a clean checkout at your last kit's commit: result is
byte-identical to the branch, 332 tests pass, production build succeeds.

## Removing it

Not committed yet: `git checkout -- .` then delete the new files
(`git clean -fd src supabase`).
Committed: `git revert` the commit, or `git reset --hard <commit before>`.
