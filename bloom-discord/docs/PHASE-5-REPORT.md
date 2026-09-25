# Phase 5 report — Bloom Rewards

**Scope:** the points ledger, `/checkin`, `/win`, and the rank ladder. Companion
now runs the community loop the daily prompt was leading into.

Phase 4 ended with the honest admission that the check-in prompt posted a
conversation starter and nothing recorded or rewarded a check-in. This closes
that, and the order of the work was the point: the ledger and its constraints
landed before any command could award anything.

---

## What was built

### 1. The ledger, first

The brief rules out XP farming, reward inflation and fake stats. Those are not
promises a service can keep — a service can forget, and the forgetting is
invisible until someone's total is wrong. So migration `0006` holds the rules:

- **`point_events` is append-only, with no balance column.** A balance is
  `SUM(points)`. That trades a little query cost for a property worth more than
  it: a stored total is a second source of truth, and the copy that drifts is
  always the one the member is looking at. Corrections are negative
  `adjustment` rows, never edits.
- **`UNIQUE (guild_id, idempotency_key)`** makes a replayed interaction pay
  once, decided by an index rather than by application code.
- **`point_events_actor_matches_kind`** requires an actor on manual entries and
  forbids one on automatic entries. Both directions matter: the first stops an
  unattributable grant of points, the second stops a job attributing itself to
  a moderator.
- **`point_events_manual_needs_reason`** — staff discretion is auditable or it
  is not discretion.
- **`check_ins` is keyed `(guild_id, user_id, local_date)`.** The primary key is
  the once-a-day rule, not a `SELECT` that races with the `INSERT` after it.

Balances cannot go negative and no constraint can say so, because there is no
row to constrain. `award()` takes a transaction-scoped advisory lock keyed on
the member before any negative entry. Positive awards skip it — hot path, cannot
overdraw.

### 2. Days are calendar days

"Have you checked in today?" is a question about a calendar day in a particular
place. A member who checks in at 23:50 and again at 00:10 has checked in on two
days; one who checks in at 09:00 and 17:00 has checked in on one.

So `LocalDate` and `localDateIn()` landed in `@bloom/utils`, resolving the date
through `Intl` — the only thing in the runtime that knows about daylight saving
— and the resolved date is **stored** on the row rather than derived from
`created_at`. `now()::date` is UTC and would hand a member in Australia two
check-ins for one evening, and storing the date means editing `BLOOM_TIMEZONE`
later cannot rewrite check-ins already recorded.

Streaks are derived from those dates on every read. A stored counter has to be
maintained by something that runs nightly, and the night it does not run it
starts lying — worse than not having the feature, because members compare
streaks with each other.

### 3. The economy, and what it refuses to do

Check-in pays 5. A small win pays 10, up to three paid wins a day. Both are
constants in `@bloom/shared-types` that everything reads, because an economy
rarely inflates by decision — it inflates through a series of individually
reasonable increases, and a constant makes any such change one visible diff.

**Nothing multiplies.** No streak bonus, no combo, no catch-up. A streak is
shown because it is true, and changes nothing about what anyone earns: the
moment a streak pays, missing a day acquires a cost, and charging someone for a
bad week is the wrong incentive for a wellbeing community. There is a test that
a member on day nine earns exactly what they earned on day one.

**The cap is on the reward, never the participation.** A fourth win still posts,
still gets seen, and does not pay. A test asserts the reply contains no
discouragement — no "limit reached", no "slow down".

### 4. The ladder review Phase 0 deferred

Phase 0 left a note: review these thresholds against the Bloom app's progression
model so a member's Discord rank and their in-app rank do not tell two different
stories. The review is done and the finding is that they cannot be reconciled.

The app pays 100+ per verified goal, from real habit and mood records, across
twelve ranks to 25,000 and then seasons forever. This pays 5 for showing up in a
chat server. Mapping one onto the other would either inflate community chatter
into personal progress or deflate someone's real work to fit a chat ladder.

So they stay separate and named separately — **Bloom Points** in the app,
**Bloom Rewards points** here — nothing in Discord claims to reflect app
progress, and the nine-rank ladder from the brief is kept as the deliberately
smaller, slower community thing. Thresholds are now calibrated rather than
provisional: First Bloom in the first week, Master Bloom beyond a year.

**This is the most reversible decision in the phase, and the one most worth a
second opinion** — see Known limitations.

### 5. What is never stored

`/checkin` takes no text at all. The obvious design is a mood field, and it
would make this platform the custodian of a daily record of how everybody is
feeling: sensitive data, no operational use, no retention policy that would be
honest, real consequences if it leaked.

`/win` does take text, and it goes to `#small-wins` and nowhere else — not the
ledger, not the audit row, not the logs. A test gives `/win` a sentence
containing a medical disclosure and asserts it appears in none of the three.

---

## Three bugs the tests found

All would have shipped, and all were found by a test written to assert a
property rather than to cover a line.

1. **`fakeInvocation` returned a constant interaction id**, so three distinct
   `/win` calls looked like one replayed call. The daily-cap test failed at 10
   points instead of 30, which is how it surfaced. This is the **third** fake in
   this project caught returning a fixed value; the pattern is now specific
   enough to name — a fake that is convenient is usually lying.
2. **The leaderboard read `Date.now()` in the command layer**, not the service's
   clock, so the window was empty under any fixed clock. The fix moved the
   period into the service, which takes days and computes the instant itself.
3. **`/win` posted before claiming idempotency.** A Discord retry would have put
   the same win in the channel twice while paying for it once — the visible half
   of the failure, and the half the ledger cannot fix. The claim now comes first
   and covers the unpaid path too, which writes no ledger row to collide with.

## One process defect

`pnpm typecheck` was **red before this phase started**, and neither `tsc --build`
nor the test suite catches it: `tsconfig.test.json` is a separate project, so
test files are typechecked only by that script. Two pre-existing errors were
resolved rather than suppressed — `CommandSpec` narrowed with the
`isSlashCommandSpec` guard that already existed, and `namespace-command.test.ts`
now passes the authorization context `execute` has required since Phase 3.

It is green now, and it is in the verification loop for every future phase.

---

## Files

**Created (8)**

| File                                                             | What                                  |
| ---------------------------------------------------------------- | ------------------------------------- |
| `database/migrations/0006_rewards.sql`                           | `point_events`, `check_ins`           |
| `packages/database/src/repositories/rewards.ts`                  | `RewardsRepository`                   |
| `packages/database/src/repositories/rewards.integration.test.ts` | 19 tests against real Postgres        |
| `packages/utils/src/local-date.test.ts`                          | 13 tests for the calendar helpers     |
| `apps/companion/src/features/rewards/service.ts`                 | `RewardsService`                      |
| `apps/companion/src/features/rewards/commands.ts`                | `/checkin`, `/win`, three subcommands |
| `apps/companion/src/features/rewards/messages.ts`                | Every word the economy says           |
| `apps/companion/src/features/rewards/rewards.test.ts`            | 31 tests                              |

**Changed (13)** — `packages/shared-types/src/rewards.ts` (kinds, awards, caps,
the ladder verdict); `packages/utils/src/time.ts` (`LocalDate` and friends);
`packages/database/src/repositories/index.ts`; `packages/testing/src/{fake-repositories,fake-interaction}.ts`;
`packages/discord/src/jobs/commands.ts` (each branch states its own policy floor);
`packages/commands/src/namespace-command.test.ts`; `packages/events/src/scheduler.test.ts`;
`apps/companion/src/{commands,deps,main,companion.harness,commands.test}.ts`.

**Docs (5)** — new `docs/operations/bloom-rewards.md`; updated
`docs/reference/{database-schema,commands}.md`,
`docs/operations/troubleshooting.md`, `README.md`.

---

## Dependencies, env vars, migrations

- **Dependencies added: none.**
- **Environment variables added: none.** `CHANNEL_SMALL_WINS` and
  `FEATURE_REWARDS` both existed from Phase 0 and are now read. `FEATURE_REWARDS`
  still defaults to **false**.
- **Migrations added: one.** `0006_rewards`, applied cleanly to a live
  PostgreSQL 18.4; the ledger tests run against it.

## Commands added

| Command                           | Policy       | Ephemeral                           |
| --------------------------------- | ------------ | ----------------------------------- |
| `/checkin`                        | Bloom Member | yes                                 |
| `/win <description>`              | Bloom Member | yes (the win itself posts publicly) |
| `/companion profile [member]`     | Bloom Member | yes                                 |
| `/companion rank`                 | Bloom Member | yes                                 |
| `/companion leaderboard [period]` | Bloom Member | yes                                 |

`/companion` widened from Moderator to ❋ Bloom Member. That is safe because each
`jobs` branch now states its own floor — Moderator to read, Administrator to
change — and a contribution's policy is evaluated after the namespace's, so it
can only narrow. The operator surface did not move when the member surface
arrived, and that is asserted in Companion's command tests.

## Discord permissions required

**None beyond the existing Companion set** (`319975148608`). Posting a win needs
Send Messages and Embed Links, which Companion already had. The permission
matrix is unchanged, and Companion's intents remain `Guilds` alone.

---

## Tests

**524 passing across 35 files** (Phase 4 closed at 461 / 32), including 35
integration tests that need `BLOOM_INTEGRATION_TESTS=1` and a live Postgres.

| File                                                             | Tests | Covers                                             |
| ---------------------------------------------------------------- | ----: | -------------------------------------------------- |
| `apps/companion/src/features/rewards/rewards.test.ts`            |    31 | The loop end to end: paying, not paying, and tone  |
| `packages/database/src/repositories/rewards.integration.test.ts` |    19 | Constraints, replays, and the overdraw race        |
| `packages/utils/src/local-date.test.ts`                          |    13 | DST, fractional offsets, month and leap boundaries |

The integration tests are the ones that matter most here, because every property
they check is enforced by the database and therefore invisible to a fake: ten
workers replaying one award insert one row between them; two concurrent −50
corrections against a balance of 60 apply once rather than leaving −40; two
simultaneous check-ins on one day produce one `recorded` and one
`already_today`.

Three tests assert absences, which is unusual enough to flag: that a streak pays
nothing, that a shared win's text exists nowhere in the ledger, audit trail or
logs, and that the leaderboard offers no all-time period. Absences are exactly
what a later contributor re-adds in good faith.

---

## Known limitations

1. **The ladder divergence is a product decision, not a technical one.** Discord
   ranks share six names with the Bloom app's ladder (Seedling, First Bloom,
   Sprout, Budding, In Bloom, Flourish) at completely different thresholds, and
   the app has no Deep Roots or Master Bloom. A member who holds both will see
   two different ranks. The alternatives are worse — mirroring the app's ladder
   with chat points, or renaming the community ranks away from the brief — but
   **this one is worth an explicit decision** rather than my judgement.
2. **No account link between Discord and the Bloom app**, so Discord cannot show
   app progress even where that would be the better answer.
3. **Staff have no command for points.** `/companion admin award` is planned; a
   correction today is a hand-written `INSERT`, documented in
   `docs/operations/bloom-rewards.md`. The constraints refuse an unattributed or
   unexplained one, so the floor is safe, but this is the largest usability gap.
4. **Milestones and achievements do not exist.** The brief's chain is
   action → points → **milestone** → rank → achievement, and the middle and end
   are missing. Nothing currently claims they exist.
5. **No leaderboard pagination and no member count.** Ten entries over 7 or 30
   days, and a member outside the top ten cannot see where they stand. That is
   partly deliberate and partly unfinished.
6. **Still never connected to Discord.** `discord.com` is unreachable from this
   environment, so no command has been registered against a real application and
   no interaction has round-tripped. Unchanged since Phase 0, and still the
   largest untested surface.
7. **`recentEvents` shows a member their own corrections** in `/companion
profile`, including the staff reason. That is deliberate — it is their
   ledger — but the reason text is written by staff who may not expect the
   member to read it, and the copy guidance for that has not been written.

---

## Next step

**Phase 6 — milestones and achievements**, closing the brief's progression
chain, plus `/companion admin award` so that corrections stop being a SQL
statement.

The first piece should be the milestone definitions and their evaluation against
the ledger, because a milestone that is not derived from real records is exactly
the "fake stats" the brief rules out — and the ledger is now the record it can
be derived from.
