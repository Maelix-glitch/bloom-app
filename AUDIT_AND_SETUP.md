# Bloom — audit results and what you need to do

Branch `arena/01a0a022-bloom-app` · PR #15 · tip `9b065b6`

---

# PART 1 — What I fixed this round

## 1. "Erase everything" was leaving your data on the server ⚠️ the serious one

I checked every table the migrations create against what `public.erase_my_data()`
actually deletes. The function covered **16 tables. Bloom has 31.** Eleven of the
omitted ones hold rows that belong to a person:

| Table                | What it held                                 |
| -------------------- | -------------------------------------------- |
| `close_friends`      | who they let see their close-friends stories |
| `story_reactions`    | every reaction they left                     |
| `story_replies`      | every reply they wrote                       |
| `story_poll_votes`   | how they voted                               |
| `story_views`        | which stories they opened                    |
| `story_gifts`        | gifts they sent                              |
| `story_settings`     | their replies / audience preferences         |
| `point_transactions` | their points ledger                          |
| `goal_awards`        | goals they completed                         |
| `rank_history`       | their rank progression                       |
| `user_achievements`  | achievements they earned                     |

So someone who pressed **Erase everything** and were told _"Everything has been
erased."_ still had their close-friends list, their reply history and their
viewing history on your server. That is a privacy failure, and both app stores
require account deletion to actually delete the data.

**Fixed** in `supabase/migrations/20260917_erase_covers_every_table.sql` — now 27
per-person tables. Verified no regressions: comparing delete lists shows nothing
dropped, 11 added.

`app_admins` needs no delete — its `user_id` already has `on delete cascade`.
`reward_items`, `bloom_ranks`, `app_admins`, `app_invites` stay excluded: global
reference and access control, no personal rows.

**New test** `src/lib/data/eraseCoverage.test.ts` derives the expected table set
from the migrations themselves, so a future table can't be added without it
failing. I proved it works: pinned to the old definition it fails and names all
11 missing tables; against the new one it passes.

## 2. Edit Profile was misaligned

Same cause as the Profile cover and the Cycle opt-out screen: the hero carried
`hero-window.jpg` at 0.75 opacity under a gradient wash, with the eyebrow,
heading, sub and avatar stacked on top of it. The picture competed with all
four, which is what made the block read as misaligned — every box was where it
should be, the background was shouting.

Now one deep field, a whisper of the person's accent, a hairline along the top
edge. Also removed the dead `.bedit-hero-art img` selector that was still
disabling an animation for an element that no longer exists.

## 3. Earlier this round (commits `582a210`, `182f993`)

- **Profile header alignment** — `.pf-head-main` was still a row (name left,
  buttons right) from when the avatar sat beside it. Now one centred column.
- **Template previews** — every empty photo slot was a hardcoded
  `rgba(148,142,168,0.16)` grey: a smudge on ivory designs, a hole in obsidian
  ones. Now tinted from the template's own ink. This needed `--story-ink` to
  actually vary — it was static `#f4efe4`, which on light templates _equals the
  paper_, so anything using it for contrast vanished.
- **Resize handles** — they existed and worked, but render only on the selected
  element, and applying a template set `selectedId` to `null`. Now the front
  element is pre-selected so the handles are visible on the first frame.
- **CycleNotYours** — lost its blurred flower photo and two of three paragraphs.

---

# PART 2 — Full audit results

## Verified healthy

| Check                | Result                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row-level security   | **Enabled on all 30 tables.** Every single one.                                                                                                   |
| Leaked secrets       | None. No hardcoded keys or passwords in `src/` or `supabase/`.                                                                                    |
| PWA                  | Real and complete: `manifest.webmanifest` exists and is linked at `__root.tsx:157`; `sw.js` exists and is registered in `useInstallPrompt.ts:31`. |
| Empty catch blocks   | None — all 301 catch blocks handle or report.                                                                                                     |
| Invite enforcement   | Server-side trigger on `auth.users`, not client-side filtering.                                                                                   |
| Cycle data isolation | Gated at all four call sites plus `insightsOf`; 7 tests.                                                                                          |

## Corrections — three claims I made earlier that were wrong

I need to flag these because I told you them as fact:

1. **I said `/trackers-styles` and `/trackers-premium` were unguarded dev routes
   shipping publicly.** Wrong. Reading them, they are a real user-facing feature
   — "the three trackers designs side by side, pick one", with the choice kept in
   localStorage so the whole app follows it. Same for `/cycle-styles`. Guarding
   them would have removed a feature you built.
2. **I said account deletion was client-side only.** Wrong. `eraseEverything()`
   does call a server RPC. The real bug was narrower and worse — the RPC existed
   but only covered half the tables.
3. **I said the templates were structurally fine, then implied 8 were broken.**
   Neither was right. All 50 instantiate and render; the problem was the
   placeholder colour, which affected every one of them.

---

# PART 3 — Everything you need to do

You have done nothing yet, so this is the whole list, in order.

## Step 1 — Merge the PR

PR #15 is open: `arena/01a0a022-bloom-app` → `main`. 37 commits, 89 files.

Nothing below works until the migrations reach your database.

## Step 2 — Apply the 4 new migrations ⚠️ most important

`main` already has 13 migrations. This PR adds 4:

```
supabase/migrations/20260914_story_canvas.sql
supabase/migrations/20260915_story_slides.sql
supabase/migrations/20260916_invite_only_access.sql
supabase/migrations/20260917_erase_covers_every_table.sql
```

Either:

```bash
supabase db push          # if you use the CLI
```

or paste each file into the Supabase dashboard → **SQL Editor** → Run, in
filename order.

**Do `20260916` on a staging project first.** It creates a trigger that rejects
account creation. It has never been executed against real Postgres — I had no
database in this environment. Confirm an uninvited email is rejected with error
`28000` before running it on production.

Until these run:

- invite-only is **not enforced** — the app shows the gate but nothing stops a signup
- story slides/canvas won't save
- erase still leaves the 11 tables behind

## Step 3 — Set the environment variables

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Without these the login gate never appears.** That is deliberate — no database
means no accounts, so the app stays open and local development isn't blocked. But
it also means a deploy without them silently ships a wide-open app with no error.

Optional:

```
VITE_COACH_FUNCTION=...    # the AI coach
VITE_GIPHY_API_KEY=...     # otherwise the GIF tray says "isn't connected"
```

## Step 4 — Add the emails you want to allow

Invites can only be granted from a trusted SQL session. That is deliberate: the
table has RLS on with **zero policies** and `revoke all from anon, authenticated`,
so no client can read or write it.

```sql
insert into public.app_invites (email, note) values
  ('you@example.com',    'me'),
  ('friend@example.com', 'beta');
```

**The email must be lowercase.** The column enforces
`check (email = lower(trim(email)))`, so `'Me@X.com'` will be rejected.

Existing accounts are seeded automatically by the migration, so nobody already
signed up gets locked out.

## Step 5 — Supabase Auth → URL Configuration

The magic link redirects to **`${origin}/`** (your app root), not `/profile`.

Add your deployed origin to **Authentication → URL Configuration → Redirect
URLs**, or the link will bounce.

## Step 6 — SMTP

Supabase's default SMTP is rate-limited to roughly 4 emails/hour. For real
testing configure your own under **Authentication → SMTP**, otherwise you will
hit the limit and see "try again later" rather than a real failure.

## Step 7 — Deploy the edge functions

`supabase/functions/coach` and `supabase/functions/giphy` exist but need
deploying:

```bash
supabase functions deploy coach
supabase functions deploy giphy
```

`giphy` also needs `GIPHY_API_KEY` set as a function secret.

## Step 8 — Test in this order

1. Sign up with an **uninvited** email → should be refused, not silently allowed.
2. Add your email to `app_invites`, sign up again → magic link arrives.
3. Complete onboarding, answer **Male** → check the cycle is gone from nav, Home
   and Settings, and that `/cycle-classic` bounces to `/cycle`.
4. **Erase everything** on a throwaway account, then check the tables are
   actually empty.
5. Open a template → resize handles should already be showing.

---

# PART 4 — Still missing (not fixed, your call)

| Gap                             | Why it matters                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Push notifications**          | You have **local** notifications only (`useReminders` → `reg.showNotification`). No VAPID keys, no subscription table, no push sender, no `push` handler in `sw.js`. The 1000+ dynamic notifications you asked for need all of that first. This is a vertical slice — worth its own pass, not a rushed addition. |
| **Session / device management** | No way to see signed-in devices or revoke one.                                                                                                                                                                                                                                                                   |
| **CSV export**                  | Cycle history has CSV; the whole record is JSON only.                                                                                                                                                                                                                                                            |
| **Offline mutation queue**      | The app is device-first, but I did not verify mutations made offline are queued and replayed. Untested.                                                                                                                                                                                                          |
| **Onboarding redesign**         | Not touched. Its CSS is already refined; what dates it is the blurred photograph. I won't redesign it blind — say the word and I'll remove the photo.                                                                                                                                                            |
| **Cycle copy**                  | 86 strings over 90 characters across many files. I cut `CycleNotYours`, but rewriting the rest without seeing them rendered would lose meaning.                                                                                                                                                                  |

---

# PART 5 — What I could not verify

- **No visual inspection.** There is no browser in this environment. Every visual
  change here is verified in CSS and in the built stylesheet, not seen rendered.
  You are my eyes.
- **No migration has been executed.** I have no Postgres here. The erase fix is
  verified by static analysis of the SQL, not by running it.
- **No magic link has been sent.** The auth reducer has 35 passing tests; no real
  email was delivered.

## Gates run this round

`tsc --noEmit` → 0 errors · `vitest` → **53 files / 677 tests pass** ·
`eslint` → 0 on changed files · `npm run build` → exit 0.
