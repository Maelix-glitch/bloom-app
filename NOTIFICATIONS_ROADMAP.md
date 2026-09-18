# Notifications — what's done, what's left, and exactly how to finish it

Merged to `main` in PR #16 (`c96f47a`).

## Where notifications stand right now

There are two separate halves to "notifications", and they are at very different
stages:

| Half                                             | Status                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Content** — what a notification _says_         | ✅ Built and merged. `src/lib/reminders/copy.ts`, 118 templates, 1,298+ rendered messages, tested. |
| **Scheduling** — _which_ one is due and _when_   | ✅ Already existed. `src/lib/reminders/schedule.ts`.                                               |
| **Delivery while the app is open**               | ✅ Works today. `useReminders` fires a `setInterval` every 60s and calls `reg.showNotification`.   |
| **Delivery while the app is CLOSED** (real push) | ❌ Not built. `public/sw.js` has **no `push` handler**. Nothing wakes the phone.                   |

**The honest headline:** right now a reminder only appears if the Bloom tab is
open. Close the app and nothing arrives. That is the gap between "reminders" and
"push notifications", and it is infrastructure, not code you can write in the
editor alone.

## Why 1,000+ was answered honestly, not padded

The ask was "1000+ dynamic notifications". The engine produces **118
hand-written template combinations**. I did not write 1,000 near-duplicate
strings to hit the number — that would be filler, and it would make
notifications _feel_ repetitive faster, not slower.

The real variety comes from the templates interpolating **real data**: the same
five streak titles read differently at day 3 and day 47, a habit is named, a
late period quotes its actual day count. Across a single habit's two-month
streak that is already 1,298+ distinct rendered messages. Both numbers are
measured in `copy.test.ts`, not asserted.

## To finish real push — the process, in order

This needs decisions and keys only you can provide. I've marked what I can do in
the editor vs. what needs you.

### 1. Generate a VAPID keypair ← you (one command)

```bash
npx web-push generate-vapid-keys
```

Gives a public key (ships in the app) and a private key (stays secret, server
side only).

### 2. Store subscriptions ← I can write the migration

A `push_subscriptions` table: `user_id`, `endpoint`, `p256dh`, `auth`, plus
RLS so a user only writes their own. I can add this migration next.

### 3. Subscribe on the client ← I can write it

In `useReminders`, after permission is granted: `registration.pushManager
.subscribe({ userVisibleOnly: true, applicationServerKey })`, then POST the
subscription to Supabase.

### 4. Add a `push` handler to `sw.js` ← I can write it

```js
self.addEventListener("push", (e) => {
  const d = e.data.json();
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, ... }));
});
```

Without this, a delivered push is silently dropped. This is the single missing
piece in the file that already exists.

### 5. A sender that runs on a schedule ← you deploy, I can write it

A Supabase Edge Function on a cron (e.g. every 15 min) that:

- calls the same `dueReminders` logic per user,
- generates copy with `reminderCopy` (already built),
- sends via `web-push` to each stored subscription.

This is the part that makes notifications arrive when the app is closed. It must
run **server-side** — the browser cannot wake itself.

### 6. iOS specifics ← you

Web push on iOS requires the app be installed to the Home Screen (it is a PWA —
the manifest and `sw.js` already exist). Native iOS push through the App Store
build is a separate APNs setup.

## The catch worth stating plainly

Steps 1, 5 and 6 need a real server, real keys and a deploy target. I can write
the migration (2), the client subscribe (3), the `sw.js` handler (4) and the
edge function (5) — but I **cannot** generate your VAPID keys, set your secrets,
or deploy the cron from here. Those are yours.

If you want, next I'll write steps 2–5 as code so that all you do is run
`generate-vapid-keys`, paste the keys into your env, and deploy the function.

---

# Missing features (verified, not guessed)

Checked against the actual routes and migrations:

| Gap                                               | Evidence                                                    | Why it matters                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Background push**                               | `sw.js` has no `push` handler                               | The big one — see above                                                                                        |
| **Habit streak not plumbed to reminders**         | `Habit` has no `streak` field                               | The streak branch of the copy engine is built and tested but unreachable until a streak is computed and passed |
| **Evening nudge can't say "you logged 3 things"** | `ReminderInput` carries a boolean, not a count              | Same — the "some/done" branches are built but unfed                                                            |
| **Device / session management**                   | no route or table                                           | Can't see or revoke signed-in devices                                                                          |
| **Full-record CSV export**                        | only `HistoryTable` (cycle) has CSV; profile export is JSON | People ask for a spreadsheet                                                                                   |
| **Offline mutation queue**                        | unverified                                                  | App is device-first, but I did not confirm offline writes replay on reconnect                                  |

# Quality assessment — where the app actually stands

**Strong:**

- RLS enabled on **all 30 tables**. No leaked secrets. Real server-side invite
  enforcement (a DB trigger, not a client filter).
- **693 tests / 55 files**, tsc 0, build 0. The tests that exist are meaningful
  — several were written to _fail_ if a specific bug returns (erase coverage,
  cycle gate, template placeholders).
- The erase-everything privacy bug was found by auditing every table against the
  RPC, and now has a test that re-derives the expected set from the migrations,
  so a new table can't be added without it failing.

**Weak / honest gaps:**

- **No visual QA has ever happened.** There is no browser in this environment.
  Every visual change — Profile, Settings, onboarding, edit sheet — is verified
  in CSS and built output, not seen rendered. This is the single biggest
  unknown and only you can close it.
- **No migration has run against real Postgres.** They're written and statically
  checked, not executed. The invite trigger especially must be tested on
  staging.
- **`npm run lint` is unusable repo-wide** (thousands of pre-existing errors),
  so linting is per-file only. That's technical debt hiding real issues.

# Things to improve, ranked

1. **You look at the app.** Four visual redesigns are unverified by eye. Ten
   minutes of you clicking beats anything I can check here.
2. **Run the migrations on staging**, especially the invite trigger.
3. **Finish background push** (steps 1–6 above) — it's the most-requested
   missing piece.
4. **Plumb the habit streak** into `ReminderInput` so the copy engine's streak
   branch goes live.
5. **Fix the repo-wide lint debt** so `npm run lint` can run in CI.
6. **Device management + full CSV export** — smaller, but expected in a shipped
   app.
