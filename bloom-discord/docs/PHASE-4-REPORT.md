# Phase 4 report — Companion comes online

**Scope:** the per-guild job switch, the shared `jobs` command surface, and Bloom
Companion's daily check-in prompt.

Phase 3 built a scheduler with one honest gap, recorded in its own report: a job
could be switched off by a deployment or by configuration, but not by the people
who actually live in the server. Phase 4 closes that, and then uses the result —
Companion becomes the second bot to run jobs, which is the test of whether the
scheduler surface was genuinely shared or merely Guardian's.

---

## What was built

### 1. A per-guild off switch that takes effect at the next tick

`JobGate` in `@bloom/events` is asked, on every fire, whether a job may run in a
particular guild. `DatabaseJobGate` and `JobSettingsService` in `@bloom/discord`
answer it from `bot_settings`.

Three decisions are worth defending:

**Read every run, not at registration.** The two existing switches
(`FEATURE_SCHEDULED_MESSAGES` and `ScheduledJob.enabled`) are process-level and
read once. This one is not, because an administrator who switches a job off at
08:58 expects nothing at 09:00, and a design that needed a redeploy to honour
that is — from their side — simply broken. The cost is one indexed primary-key
lookup per job per fire.

**Checked before the lock.** A job switched off for a guild writes no `job_runs`
row at all. `job_runs` stays a record of work rather than a log of attempts, and
`jobs history` does not fill with skips.

**Fails closed.** If the settings read throws, the job does not run, and the
scheduler logs `scheduler.gate_unavailable` at warn. Running on the assumption
that it was probably allowed would let a database outage re-enable something
somebody deliberately switched off; posting into a community that asked you not
to is worse than missing a day.

**No migration was needed.** `bot_settings` already had
`(guild_id, bot_name, key, value jsonb, updated_by)` from Phase 0, which is
exactly a per-guild, per-bot setting with an author. The switch is stored under
`job.<job key>` as `{"enabled": true|false}` — an object rather than a bare
boolean so the row can grow later without a rewrite. An **absent row means no
decision**, not "off", so a newly deployed job behaves the same in a server that
has never opened its settings as in one that has. A malformed value reads as "no
decision" rather than throwing; a hand-edited row should not take a bot down.

`bot_name` is part of the primary key, so Guardian's copy of a setting and
Companion's are separate rows. Two bots that happened to share a job key would
otherwise switch each other off — a bug that would be very hard to see and is
now impossible.

`jobSettingKey()` refuses to produce a key longer than the column's 63-character
CHECK rather than truncating, because truncation turns two distinct job keys into
one setting.

### 2. The `jobs` group became shared code

`/guardian jobs` moved out of `apps/guardian` into `@bloom/discord` as
`jobSubcommands<TDeps extends JobAdminDeps>()`, and is now mounted by both bots.
The brief's "no duplicated code between bots" is easiest to violate on exactly
this kind of admin surface, where copy-paste is quicker than generalising.

It gained `enable` and `disable`, both Administrator-only even though the
surrounding namespaces admit Moderators, and both audited at **warn** severity.
Switching off a community's daily prompt is invisible until somebody notices the
silence; the record of who did it should outlive the memory of it.

Two things the listing now does that it did not before:

- It distinguishes **four** reasons a job is not running — the global flag,
  configuration, this server's switch, or "it is running right now" — and names
  the one responsible. "Disabled" alone sends people to the wrong file.
- `enable` admits when it has not achieved what was asked. If
  `FEATURE_SCHEDULED_MESSAGES` is off, or the job is disabled by configuration,
  the switch is now on **and the job still will not run**, and the reply says so
  rather than reporting a success it cannot deliver.

`jobs run` respects the gate: a manual run of a job switched off for that server
reports `skipped`. A command that let an administrator bypass a switch another
administrator set, silently, is a worse tool than one that refuses.

This retires the planned `/companion admin schedule`. Two ways to toggle the same
setting eventually disagree.

### 3. Companion: a real entry point, and one job

`apps/companion` had a placeholder `main.ts` and no commands; it refused to start,
by design, rather than appear online doing nothing. It now starts, with:

- `CompanionDeps` — config, logger, repositories, guilds, messaging, scheduler,
  job settings. **No role service and no moderation service**, and the doc
  comment says why: the boundary is enforced by what is not in the container, not
  by remembering not to call it.
- `/companion` — one top-level command, Moderator policy,
  `defaultMemberPermissions: 'none'`, carrying the shared `jobs` group and
  nothing else yet.
- `companion.checkin.daily_prompt` — a short prompt posted to
  `CHANNEL_DAILY_CHECK_IN` at `0 9 * * *` in `BLOOM_TIMEZONE`.

The prompt rotates through seven texts indexed by UTC day-of-year: deterministic,
so it cannot repeat two days running by chance and a test can pin an exact day to
an exact prompt. It claims a 20-hour cooldown **before** posting, so a redeploy
near 09:00 or a reclaimed lease cannot produce a second prompt; a suppressed run
logs `jobs.checkin.suppressed`. It writes an audit row with `actorId: null`,
which is how a job is distinguished from a person in the audit table.

The copy is tested, not just reviewed. `messages.test`-style assertions in the
job's test file reject exclamation marks, ALL-CAPS words, and any mention of
streaks, points, scores, ranks or obligation. The tone rule in the brief —
calm and restrained, explicitly not "HEY!!! WELCOME!!! 🎉🎉🎉" — is the kind of
thing that erodes one well-meaning pull request at a time, so it is a failing
test rather than a convention.

---

## Files

**Created (11)**

| File                                                     | What                                            |
| -------------------------------------------------------- | ----------------------------------------------- |
| `packages/discord/src/jobs/settings.ts`                  | `JobSettingsService`, `DatabaseJobGate`, key fn |
| `packages/discord/src/jobs/index.ts`                     | Barrel for the jobs surface                     |
| `packages/discord/src/jobs/settings.integration.test.ts` | 8 tests against real Postgres                   |
| `apps/companion/src/deps.ts`                             | `CompanionDeps`, and what it deliberately omits |
| `apps/companion/src/commands.ts`                         | `/companion`, `companionCommandSpecs`           |
| `apps/companion/src/commands.test.ts`                    | 14 tests                                        |
| `apps/companion/src/companion.harness.ts`                | Test harness mirroring `guardianHarness`        |
| `apps/companion/src/features/checkin/messages.ts`        | The seven prompts, `promptForDate`              |
| `apps/companion/src/features/checkin/job.ts`             | `createDailyCheckInJob`                         |
| `apps/companion/src/features/checkin/job.test.ts`        | 12 tests                                        |
| `docs/PHASE-4-REPORT.md`                                 | This file                                       |

**Moved (1)** — `apps/guardian/src/features/jobs/commands.ts` →
`packages/discord/src/jobs/commands.ts`, rewritten as a generic factory. Its test
stayed in `apps/guardian`: `@bloom/testing` depends on `@bloom/discord`, so a
test inside `@bloom/discord` cannot use the harness without a cycle.

**Changed (11)** — `packages/events/src/scheduler.ts` (+gate) and its test;
`packages/discord/src/{bootstrap,index}.ts`; `packages/testing/src/fake-repositories.ts`;
`apps/guardian/src/{commands,deps,main,guardian.harness}.ts`;
`apps/companion/src/main.ts`; `scripts/register-commands/index.ts`.

**Docs updated (4)** — `README.md`, `docs/reference/commands.md`,
`docs/operations/scheduled-jobs.md`, `docs/operations/troubleshooting.md`.

---

## Dependencies, env vars, migrations

- **Dependencies added: none.** `@bloom/discord` already depended on everything
  required.
- **Environment variables added: none.** `CHANNEL_DAILY_CHECK_IN` existed from
  Phase 0 and is now actually read; unset, the job registers as disabled rather
  than failing.
- **Migrations added: none.** Detailed above — `bot_settings` already fit, and
  the integration tests prove the `key` CHECK accepts `job.` + a job key.

---

## Commands added

| Command                         | Policy            | New in |
| ------------------------------- | ----------------- | ------ |
| `/companion jobs list`          | Moderator         | 4      |
| `/companion jobs history <job>` | Moderator         | 4      |
| `/companion jobs run <job>`     | **Administrator** | 4      |
| `/companion jobs enable <job>`  | **Administrator** | 4      |
| `/companion jobs disable <job>` | **Administrator** | 4      |
| `/guardian jobs enable <job>`   | **Administrator** | 4      |
| `/guardian jobs disable <job>`  | **Administrator** | 4      |

`COMMAND_SETS.companion` in the registrar is no longer empty, so
`pnpm commands:register` now publishes Companion's namespace. Registration
remains a bulk overwrite and is idempotent.

## Discord permissions required

**None beyond the existing Companion set** (`319975148608`): View Channel, Send
Messages, Embed Links, Read Message History, Use Application Commands and the
rest of the baseline. Posting a daily prompt needs nothing Companion did not
already have, and the permission matrix is unchanged.

Companion's intents remain `Guilds` alone.

---

## Tests

**461 passing across 32 files** (Phase 3 closed at 422 / 29), including the 16
integration tests that need `BLOOM_INTEGRATION_TESTS=1` and a live Postgres.

| File                                                     | Tests | Covers                                             |
| -------------------------------------------------------- | ----: | -------------------------------------------------- |
| `packages/events/src/scheduler.test.ts`                  |    23 | +5 on the gate: skip, fail-closed, re-read per run |
| `packages/discord/src/jobs/settings.integration.test.ts` |     8 | Real Postgres: the CHECK, and `bot_name` isolation |
| `apps/companion/src/features/checkin/job.test.ts`        |    12 | Posting, cooldown, audit, prompt rotation, tone    |
| `apps/companion/src/commands.test.ts`                    |    14 | Routing, policies, and the absent moderation verbs |

Two of those deserve a note.

The gate tests assert the switch is re-read on **every** run, not cached after
the first — the property that makes a disable take effect in a minute rather than
at the next deployment, and one that a naive implementation passes every other
test without.

`settings.integration.test.ts` exists because the fake cannot prove what matters:
that `job.` + an 80-character job key satisfies a `CHECK` constraint written in
SQL, and that `bot_name` really does keep Guardian's rows out of Companion's
reads. Both are database facts.

**A fake was fixed, and it had been lying.** `FakeSettingsRepository` accepted
every write and returned `null` for every read, which made any test of the form
"disable it, then confirm it is disabled" pass without the feature existing. It
is now a real store that enforces the same key shape and the same
`(guild, bot, key)` identity as the table. This is the second fake in this
project found returning a hard-coded value; both had made their tests vacuous.

---

## Known limitations

1. **The prompt does not record a check-in.** It posts a conversation starter.
   There is no `/checkin` command, no streak, no points, and nothing reads the
   replies. The copy is deliberately written to promise none of those, but the
   channel will look like a check-in feature before it is one. This is the
   largest honesty risk in the phase.
2. **Still never connected to Discord.** `discord.com` is unreachable from this
   environment, so the discord.js adapters compile and are type-checked but have
   not round-tripped a live API response, and no command has been registered
   against a real application. Unchanged since Phase 0, and still the largest
   untested surface.
3. **One prompt per guild per day, not per channel.** The cooldown is keyed by
   job and guild. Correct today, since the job posts to exactly one channel.
4. **Seven prompts cycle every seven days**, and by day-of-year rather than by
   what was posted, so a server that starts mid-cycle sees a stable but arbitrary
   rotation. Enough to launch; a larger set is a content task, not a code one.
5. **No bulk view of switches.** An operator can ask about one job at a time.
   With two jobs that is fine; a "show me everything switched off in this server"
   view will be wanted before there are twenty.
6. **Labs is still a placeholder** and still refuses to start.

---

## Next step

**Phase 5 — Companion's member-facing loop:** `/checkin` and `/win`, the Bloom
Rewards points ledger, and the Seedling → Master Bloom rank progression, so the
daily prompt has something to lead into.

The first commit should be the points ledger and its idempotency, before any
command can award anything — the brief is explicit about no XP farming and no
reward inflation, and an append-only ledger with a duplicate-operation guard is
the structure that makes those properties checkable rather than aspirational.
