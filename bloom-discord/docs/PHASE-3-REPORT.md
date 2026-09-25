# Phase 3 — The locked job scheduler

The platform could already do things when a person asked. This phase is the
first time it does something when nobody asks.

The starting position was two well-built halves that had never been introduced.
`Scheduler` (294 lines, fully unit-tested) handled cron expressions, timezones,
overlap and lifecycle, and declared a `JobLock` interface. `PostgresJobRunRepository`
implemented acquire/renew/complete/reclaim against a `job_runs` table with the
right unique index. Nothing implemented `JobLock` over that repository, and
`grep -r Scheduler apps/` returned nothing — no bot had ever constructed one.

This phase connects them, proves the exclusion against a real database, ships
the first job, and gives staff a way to see what the clock is doing.

Everything below compiles, lints, and passes. **422 tests across 29 files**,
including 8 new integration tests executed against live PostgreSQL. Known gaps
are in §8 rather than glossed over.

---

## 1. Files created and changed

### Created (5)

| File                                                          | What it is                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/discord/src/scheduler-lock.ts`                      | `DatabaseJobLock` — the adapter that was missing            |
| `packages/database/src/repositories/jobs.integration.test.ts` | 8 tests proving mutual exclusion in Postgres, not in a fake |
| `apps/guardian/src/features/jobs/stale-case-sweep.ts`         | The first real scheduled job                                |
| `apps/guardian/src/features/jobs/stale-case-sweep.test.ts`    | 13 tests                                                    |
| `apps/guardian/src/features/jobs/commands.ts` + `.test.ts`    | `/guardian jobs list\|history\|run`, 13 tests               |
| `docs/operations/scheduled-jobs.md`                           | Why the scheduler exists and what every job must have       |

### Changed (12)

| File                                         | Change                                                               |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `packages/events/src/scheduler.ts`           | `JobLock.renew`, the lease heartbeat, dropped croner's global name   |
| `packages/discord/src/bootstrap.ts`          | Constructs the scheduler; `context.scheduler`; start/stop ordering   |
| `packages/commands/src/namespace-command.ts` | Optional per-subcommand `policy`, checked after the namespace policy |
| `packages/commands/src/command.ts`           | `execute` receives the `AuthorizationContext` the dispatcher built   |
| `packages/commands/src/dispatcher.ts`        | Passes it down                                                       |
| `packages/config/src/{types,load}.ts`        | `BLOOM_TIMEZONE`                                                     |
| `packages/validation/src/primitives.ts`      | `timezoneSchema`, validated against the platform tz database         |
| `packages/database/src/repositories/jobs.ts` | `JobRunSummary` gains `runnerId` and `errorMessage`                  |
| `packages/testing/src/fake-repositories.ts`  | `FakeJobRunRepository` became a real implementation                  |
| `packages/testing/src/fake-lock.ts`          | `renew`, a `renewals` log, `forceRelease`                            |
| `apps/guardian/src/{main,deps,commands}.ts`  | Registers the job, exposes the scheduler, adds the `jobs` group      |
| `apps/guardian/src/guardian.harness.ts`      | Builds a scheduler with Guardian's real jobs registered              |

---

## 2. Design decisions worth defending

### The adapter lives in `@bloom/discord`

`@bloom/events` depends only on shared-types, utils, logging and croner. That is
deliberate: a scheduler that drags in a Postgres driver cannot be unit tested
without one, and 34 of the scheduler's tests run against an in-memory lock in
milliseconds because of it.

`@bloom/discord` is the first package in the graph that depends on both
`@bloom/database` and `@bloom/events`, so the adapter goes there. The alternative
— pushing the repository interface down into `events`, or the scheduler up into
`database` — would couple two packages that currently have no reason to know
about each other.

### Features register into the scheduler; they do not return jobs

The first version had `BotFeatures.jobs` returning an array for the bootstrap to
collect. That was wrong in a specific way: dependency containers are built before
features, so `/guardian jobs list` had no way to reach the scheduler and would
have needed a hard-coded list of job keys — a list that drifts from reality the
first time someone adds a job.

Putting the scheduler on `BotBootstrapContext` inverts it. The bootstrap still
owns the one instance and its lifecycle, `createDeps` can hold a reference, and
the command reports what is genuinely registered.

### Start after login, stop before the database closes

Both orderings are load-bearing. A job that posts a message firing before the
gateway connects fails on its first Discord call, and "failed because it started
too early" is a confusing thing to find in `job_runs`. At the other end,
`scheduler.stop()` drains in-flight runs and releasing a lease is a write, so it
has to happen while the pool is still open.

### `runNow` bypasses the schedule, not the lock

A manual trigger is not a way around the safety rails. `/guardian jobs run` goes
through the same `acquire`, and the job's own cooldown still applies — which is
why triggering the digest twice in one morning posts once. There is a test that
asserts exactly this, because it is the kind of property someone "fixes" by
removing it.

### Per-subcommand policies may only narrow

`jobs run` needed Administrator inside a Moderator-gated namespace, and
`namespaceCommand` had no way to express that. The addition is deliberately
one-directional: the namespace policy always runs first and a contribution's
policy runs after, so a branch can demand more but never less. Inheritance stays
the default; the exception has to be written down.

Getting the configuration to the policy was the interesting part. The first
attempt threaded `PlatformConfig` into `namespaceCommand`, which broke every
module-level command constant and would have forced a factory refactor across
three apps. The dispatcher already builds an `AuthorizationContext` to evaluate
the command's own policy — passing that to `execute` costs one parameter and
guarantees the two checks cannot disagree about who the caller is.

### `timed_out` is not `failed`

A lapsed lease means nobody heard back; a failure means the job ran and raised.
An OOM kill and a bug need different responses, and collapsing them loses the
distinction exactly when someone is trying to tell them apart. The real schema
already drew this line — my first fake did not, and the integration test caught
it.

---

## 3. The lease heartbeat

Reclaiming lapsed leases is necessary (a crashed process must not block a job
forever) and it creates a hazard: a job that legitimately runs longer than its
lease gets that lease reclaimed underneath it, and a second process starts a
duplicate with neither side doing anything wrong.

So `JobLock` gained `renew`, and the scheduler now renews every
`leaseSeconds / 2` while a job is in flight, inside a `try/finally` so the timer
is cleared whether the job returns or throws. The timer is `unref()`ed — a
pending renewal must not hold the process open during shutdown, and a lapsed
lease is the correct outcome for a process that is going away.

A refused renewal means the lease is already gone and another process may
already be running the job. That cannot be undone, so it is logged at **error**
as `scheduler.lease_lost`: silent duplicate execution is the thing nobody ever
debugs.

Four tests cover it, using fake timers so they assert the renewal actually
happened rather than that a `setInterval` was created: renewal while running,
no renewal after return, no renewal after throw, and the error on refusal.

---

## 4. The first job

`guardian.cases.stale_sweep` — a daily digest of cases with no activity for
three or more days, to the private moderation channel.

The standing rule is that every scheduled message needs an off switch, channel
config, timezone awareness, rate limiting, duplicate prevention, a cooldown and
an audit log. Concretely:

| Requirement          | Implementation                                                          |
| -------------------- | ----------------------------------------------------------------------- |
| Enable/disable       | `enabled: channelId !== null`, under `FEATURE_SCHEDULED_MESSAGES`       |
| Channel config       | `CHANNEL_MODERATION`; unset ⇒ registers **disabled**, not failing daily |
| Timezone             | `BLOOM_TIMEZONE`, applied to `0 9 * * *`                                |
| Duplicate prevention | A 20-hour `message_cooldowns` claim, taken **before** posting           |
| Rate limiting        | Ten cases listed, the remainder in the footer                           |
| Audit log            | `jobs.stale_cases_reported`, `actor_id = NULL`, `source = <job key>`    |

Three details that are easy to get wrong:

**It posts nothing when nothing is stale.** A digest that arrives every morning
saying "0 stale cases" trains staff to skim past the mornings when the number is
not zero. Silence is the correct output, and there is a test for it.

**The cooldown is claimed before the message is sent.** Claiming afterwards
leaves a window where two runners have both already posted.

**The audit row has no actor.** Attributing scheduled work to a staff member
would make the audit log lie in the one place it gets consulted.

---

## 5. Inspection: `/guardian jobs`

| Command                        | Policy            | Reads                  |
| ------------------------------ | ----------------- | ---------------------- |
| `/guardian jobs list`          | Moderator         | The live scheduler     |
| `/guardian jobs history <job>` | Moderator         | `job_runs` (durable)   |
| `/guardian jobs run <job>`     | **Administrator** | Triggers, then reports |

`history` deliberately reads the table rather than process memory: the scheduler
only remembers its own lifetime, so after a deployment it would report "never
run" for a job that has run daily for a year.

The listing distinguishes **disabled globally** from **disabled for this job** —
without that, an admin goes hunting through environment variables for a flag
that does not exist when the real cause is an unconfigured channel. `nextRunAt`
renders as a Discord relative timestamp so it is correct in each reader's own
timezone.

`jobs history` is the one place `BloomError.operatorHint` reaches a human. It is
Administrator-adjacent, ephemeral and staff-only, and a diagnostic command that
showed the vague member-facing wording would be useless. Stack traces still never
appear.

---

## 6. Four defects found and fixed

**1. Croner's `name` option is a process-global registry.** Passing
`name: job.key` enrols the job in a module-level map and throws if the name is
reused — so a second `Scheduler` anywhere in the process died on a global we
never read. It surfaced as 95 failing tests the moment the harness built a
scheduler per test, and it would have surfaced in production the first time two
bots shared a process. Removed; `this.jobs` is the registry that matters, and it
is scoped to the instance. Regression test added.

**2. `FakeJobRunRepository` was vacuous.** Every method returned a hard-coded
`null`/`0`/`true`. Any test asserting "a job with no history reports none" would
have passed without exercising anything — the same vacuous-fake pattern already
banned elsewhere in this codebase. Replaced with a real in-memory implementation
that enforces the same one-live-run-per-key rule the partial index enforces.

**3. `JobRunSummary` omitted the two fields diagnosis needs.** `runner_id`
answers "which replica", `error_message` carries the operator hint. Both were
being written to the table and neither could be read back.

**4. No lease renewal at all.** Described in §3. A long job losing its lease was
a real duplicate-execution path, not a theoretical one.

---

## 7. Tests

**422 passing across 29 files** (was 383/26). The 39 new tests:

| Area                               | Count | Notes                                          |
| ---------------------------------- | ----: | ---------------------------------------------- |
| `jobs.integration.test.ts`         |     8 | Real PostgreSQL                                |
| Scheduler heartbeat + two-instance |     5 | Fake timers                                    |
| `stale-case-sweep.test.ts`         |    13 | Including the silence and cooldown cases       |
| `/guardian jobs` commands          |    13 | Through the real dispatcher, so policies apply |

The integration tests are the ones that matter most, because the exclusion is
not application logic — it is the partial unique index. A fake asserting "one
holder at a time" only asserts that the fake was written that way. Against real
Postgres:

- two racing workers → exactly one lease, the loser gets `null` not an error;
- **ten simultaneous workers → one `running` row**, verified by counting;
- a completed holder lets the next worker in, with `attempt` incrementing;
- a lapsed lease is reclaimed as `timed_out` and the job unblocks;
- renewal keeps a competitor out; renewing a finished run returns `false`;
- the same job key in two guilds does not contend;
- a failed run round-trips its error code and operator hint.

`/guardian jobs` is tested through the dispatcher rather than by calling
handlers, so the Administrator gate on `run` is genuinely exercised — the test
asserting a moderator is refused also asserts no run was recorded.

---

## 8. Known limitations

1. **No per-guild database toggle.** `ScheduledJob.enabled` is static
   configuration. The brief anticipates a per-guild override in `guild_settings`;
   single-community deployment makes it unnecessary today.
2. **`DatabaseJobLock.reclaimExpired` ignores its `botName` argument.** The
   interface takes one; reclamation is deliberately not per-bot, because a lease
   held by a crashed Guardian must be reclaimable by whichever process notices.
   Documented at the call site rather than silently dropped.
3. **One job exists.** Companion's check-in prompts and Labs' cohort digests are
   the phases that own them. The infrastructure is proven; the content is not
   written.
4. **Reclamation is lazy.** Lapsed leases are cleaned up on the next `acquire`
   for that key, not by a sweeper. A job that stops being scheduled leaves its
   last `timed_out` row until something asks for that key again. Harmless, but
   worth knowing when reading the table directly.
5. **No dead-letter or retry.** A failed run is recorded and the job waits for
   its next scheduled tick. For a daily digest that is correct; a job needing
   at-least-once delivery would need more.
6. **Still no live Discord verification.** `discord.com` is unreachable from this
   sandbox, so the gateway path remains unexecuted — as in Phases 1 and 2.

---

## 9. Environment, migrations, permissions

**New environment variable:** `BLOOM_TIMEZONE` (default `UTC`). An IANA name,
validated at startup against the platform's own tz database — `Europe/Londen` is
correctly shaped and does not exist, and the failure would otherwise surface as a
job running at the wrong hour. Offsets like `GMT+1` are rejected because they
cannot know about daylight saving.

**Migrations: none.** `job_runs` and `message_cooldowns` arrived in `0003`, and
the index that does the real work was already correct. This phase reads the
schema it was given.

**New Discord permissions: none.** The job posts to a channel Guardian can
already post to. The permission integer is unchanged at `1497064631510`.

**New commands: 3**, all under the existing `/guardian` registration.

---

## 10. Exact next step

Companion's first scheduled surface — the daily check-in prompt — now that the
scheduler is proven and the checklist for a scheduled message is written down in
`docs/operations/scheduled-jobs.md`. It is the first job that will post to a
public channel, which makes the cooldown and the off switch matter more than they
do for a staff digest, and the first that needs a per-guild enable toggle rather
than a static flag.
