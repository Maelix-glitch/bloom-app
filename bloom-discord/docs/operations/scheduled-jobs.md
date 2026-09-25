# Scheduled jobs

Everything that happens on a clock rather than in response to a person goes
through one scheduler per process. There is no `setInterval` anywhere else in
the platform, and that is enforced by review rather than by a linter, so it is
worth being explicit about why.

A bare timer has three problems that only appear in production. It runs on every
replica, so scaling from one container to two silently doubles every daily post.
It leaves no record, so "did the digest go out on Tuesday?" is unanswerable. And
it has no off switch short of a deployment. The scheduler exists to fix those
three things, and a job that bypasses it gets all three problems back.

## How it fits together

```
ScheduledJob  ──registered into──▶  Scheduler  ──asks──▶  JobGate ──▶ bot_settings
  (a feature)                     (one/process)     │      (may this guild?)
                                                    └──▶  JobLock ──▶ job_runs
                                                          (is anyone else on it?)
```

- **`Scheduler`** (`@bloom/events`) owns the cron expressions and the lifecycle.
  It depends on the `JobLock` _interface_ only, which is why it can be unit
  tested without a database.
- **`DatabaseJobLock`** (`@bloom/discord`) adapts the `job_runs` repository to
  that interface. It lives in `@bloom/discord` because that is the first package
  that depends on both halves; putting it in `@bloom/events` would drag a
  Postgres driver into a package that should not need one.
- **`DatabaseJobGate`** (`@bloom/discord`) answers "has an administrator of this
  particular server switched this job off?" from `bot_settings`, behind the same
  kind of interface for the same reason.
- **`job_runs`** is where the mutual exclusion actually happens.

The bootstrap constructs the scheduler, puts it on `BotBootstrapContext`, and
features register into it. It starts **after** the gateway connects — a job that
posts a message should not fire against a client that has not logged in — and
stops **before** the database closes, because releasing a lease is a write.

## The lock is an index, not code

Exclusion is not "check whether another run exists, then insert". That pattern
has a race window between the check and the insert, and under a stampede of ten
replicas it will eventually let two through. It is this, in migration `0003`:

```sql
CREATE UNIQUE INDEX job_runs_one_active_idx
  ON job_runs (job_key, COALESCE(guild_id, ''))
  WHERE status = 'running';
```

Postgres decides. `acquire` simply inserts and treats the resulting unique
violation as "someone else has it" — returning `null`, not an error, because a
scheduler that had to distinguish a lost race from a broken database on every
tick would eventually get it wrong.

Keying on `(job_key, guild_id)` means one community's digest never blocks
another's, and `COALESCE` is there because `NULL` is not equal to `NULL` in a
unique index — without it, a global job would not exclude itself.

## Leases and the heartbeat

A holder writes `lease_expires_at`. If the process dies, nothing cleans up after
it, so the next `acquire` reclaims any run whose lease has lapsed and marks it
`timed_out`.

`timed_out` is deliberately not `failed`. `failed` means the job ran and raised;
`timed_out` means nobody ever heard back. They point at different problems — a
bug versus an OOM kill — and collapsing them loses the distinction exactly when
someone needs it.

Reclamation creates the opposite hazard: a job that legitimately takes longer
than its lease would have that lease reclaimed while it is still working, and a
second process would start a duplicate with neither side doing anything wrong.
So the scheduler renews every `leaseSeconds / 2` while a job is in flight. If a
renewal is refused, the lease is already gone and another process may already be
running the job — the scheduler cannot undo that, but it logs
`scheduler.lease_lost` at error, because silent duplicate execution is the thing
nobody ever debugs.

The renewal timer is `unref()`ed. A pending renewal must not hold the process
open during shutdown; a lapsed lease is the correct outcome for a process that
is going away.

## What every job must have

From the brief: every scheduled message needs an off switch, channel
configuration, timezone awareness, rate limiting, duplicate prevention, a
cooldown, and an audit trail. Concretely:

| Requirement          | Where it lives                                                                |
| -------------------- | ----------------------------------------------------------------------------- |
| Enable/disable       | Four layers, below — from a deploy-wide flag down to one server's switch      |
| Channel config       | A `CHANNEL_*` id; a job whose channel is unset registers as **disabled**      |
| Timezone             | `BLOOM_TIMEZONE`, an IANA name, applied to every cron expression              |
| Duplicate prevention | The lock for concurrent runs; a `message_cooldowns` claim for sequential ones |
| Cooldown             | Claimed **before** posting, so two runners cannot both get past it            |
| Audit log            | An `audit_events` row with `actor_id = NULL` and `source = <job key>`         |

### The four off switches

They are deliberately separate, because they answer to different people:

| Layer                        | Who owns it           | Scope             | Changing it needs   |
| ---------------------------- | --------------------- | ----------------- | ------------------- |
| `FEATURE_SCHEDULED_MESSAGES` | whoever deploys       | the whole process | a restart           |
| `ScheduledJob.enabled`       | configuration         | the whole process | a restart           |
| The per-guild switch         | a guild administrator | one server        | nothing — next tick |
| The job's own logic          | the job               | one run           | nothing             |

The first two are read once at registration; the third is read on **every tick**.
That difference is the point. An administrator who switches a job off at 08:58
expects nothing at 09:00, and a design that needed a redeploy to honour that
would be, from their side, simply broken. The cost is one small query per job per
fire, which is the cheapest thing in the whole path.

**A platform-wide job has no guild, and still has a switch.**
`platform.retention.prune` deletes rows belonging to no guild at all, so giving
it a guild id would make `job_runs` lie about what it touched. But the gate
originally answered `enabled: true` for any job with a null guild, which meant
the one job that destroys data could not be stopped without a redeployment. The
gate now takes a **home guild** and records a global job's switch there — see
[D6](../architecture/decisions.md). `/guardian jobs disable
platform.retention.prune` works exactly like any other job.

The per-guild switch lives in `bot_settings` under `job.<job key>`, with a value
of `{"enabled": true|false}`. No migration was needed: the table already carried
`(guild_id, bot_name, key, value, updated_by)`, which is exactly a per-guild,
per-bot setting with an author. An **absent row means no decision has been made**
— not "off" — so a new job behaves the same in a server that has never touched
its settings as in one that has.

`bot_name` is part of the primary key, so Guardian's copy of a setting and
Companion's are different rows. Two bots that happened to share a job key would
otherwise switch each other off, and that failure would be very hard to see.

**The gate is consulted before the lock.** A job that is switched off for a
server therefore writes no `job_runs` row at all, which keeps that table an
honest record of work rather than a log of attempts. The run is reported as
`skipped` and logged as `scheduler.job_disabled`.

**A gate that throws fails closed.** If the database is unreachable, the job does
not run, and the scheduler logs `scheduler.gate_unavailable` at warn. The
alternative — running on the assumption that it was probably allowed — means an
outage can re-enable a job somebody deliberately switched off, and posting into a
community that asked you not to is worse than missing a day.

Two of those are easy to get subtly wrong.

**The lock does not prevent double-posting.** It prevents two _concurrent_ runs.
A redeploy at 08:59, a reclaimed lease, and a manual `/guardian jobs run` can all
produce a second _sequential_ run on the same day, and the lock is perfectly
happy with that. Duplicate suppression is the job's own cooldown claim, and it
must be taken before the message is sent, not after — claiming afterwards leaves
a window in which both runs have already posted.

**A disabled job should still register.** If a job disappears from
`jobs list` when it is switched off, an operator cannot tell "disabled on
purpose" from "not deployed". Register it and report it as disabled — and say
_which_ of the four switches is responsible, because "disabled" alone sends
people to the wrong place.

## The registered jobs

| Key                              | Bot       | Schedule     | What it does                                         |
| -------------------------------- | --------- | ------------ | ---------------------------------------------------- |
| `companion.checkin.daily_prompt` | Companion | `0 9 * * *`  | Posts the daily check-in prompt                      |
| `guardian.cases.stale_sweep`     | Guardian  | `0 9 * * *`  | Digest of cases untouched for 3+ days                |
| `platform.retention.prune`       | Guardian  | `20 4 * * *` | Deletes operational rows past their retention window |

`platform.retention.prune` is the only job that destroys data, and it is the
only one that is platform-wide rather than guild-scoped. It is owned by Guardian
rather than shared: the work is platform-level, and running it in all three bots
would mean three processes contending nightly for one table's worth of deletes.
The lock makes that safe, not sensible. Its schedule is deliberately off the
hour — everything else in the world runs at :00, and a nightly delete landing
alongside a backup and a log rotation turns a quiet window into a latency spike.

Full detail, including the retention windows and how to read its logs:
[data retention](data-retention.md).

## The one thing that is not a scheduled job

Each process writes a `system_health` row every 30 seconds saying it is alive.
That is an interval, and it is deliberately not a scheduled job.

A scheduled job takes a lease, and a lease means exactly one process runs it —
right for a nightly prune, wrong here. One process writing all three rows would
be one bot asserting that the other two are alive, which is a fabricated status
of precisely the kind the platform refuses to produce elsewhere. Each process
has to speak for itself, so each keeps its own timer.

It is owned by one object with a `stop()`, it is unref'd so it can never be the
reason a process stays alive, and it is stopped on shutdown. Write failures are
logged at debug and swallowed: a bot serving members perfectly well must not
fall over because it could not write a row saying so, and the resulting stale
row is itself the signal.

Readers get `lastSeenSecondsAgo` and `stale`, never `online` — see
`readPeers()`. A row saying the gateway was connected is a statement about a
moment in the past, and rendering it as a present-tense claim is the exact
mistake the table's comment warns about. `/health` includes peers but never
folds them into its own status: one crashed bot must not fail the other two's
readiness probes and manufacture an outage out of monitoring.

## Silence is a feature

`guardian.cases.stale_sweep` posts nothing when no case is stale. A digest that
arrives every morning saying "0 stale cases" teaches staff to skim past the
mornings when the number is not zero, which costs more than the reassurance is
worth. The same reasoning applies to anything added later: if a scheduled
message has nothing to say, it should not say it.

`platform.retention.prune` applies the same rule to the audit log rather than to
a channel: a night with nothing to delete writes no audit row, because a log
that gains an identical "deleted 0 rows" entry every morning is a log people
stop reading. That the job ran is already recorded in `job_runs`, which is where
that question belongs.

## Operating it

The same five subcommands exist under every bot that has jobs — they are one
implementation in `@bloom/discord`, mounted by each namespace, so `/companion
jobs list` and `/guardian jobs list` cannot drift apart. Each only ever shows its
own bot's jobs.

```
/guardian jobs list             # what exists, when it next runs, why it does not
/guardian jobs history <job>    # the last durable runs, with the failure detail
/guardian jobs run <job>        # trigger now (Administrator)
/guardian jobs disable <job>    # switch off for this server (Administrator)
/guardian jobs enable <job>     # switch back on for this server (Administrator)
```

`jobs history` reads `job_runs`, not process memory, so it still answers
correctly after a deployment. `jobs run` bypasses the schedule but neither the
lock, the gate, nor the job's cooldown, so it cannot be used to force a duplicate
post — if the job is switched off for the server, a manual run reports `skipped`
rather than quietly overriding the administrator who switched it off.

`enable` and `disable` are Administrator-only even where the namespace admits
moderators, and both write an audit row at **warn** severity. Turning off a
community's daily prompt is a quiet change with a visible effect; it should be
attributable months later.

`enable` will tell you when it has not achieved what you asked. If
`FEATURE_SCHEDULED_MESSAGES` is off, or the job is disabled by configuration, the
per-guild switch is now on and the job still will not run — and the reply says
so, rather than reporting a success it cannot deliver.

`FEATURE_SCHEDULED_MESSAGES` defaults to **false**. Development environments
share a production database more often than anyone admits, and the default that
prevents a developer's laptop from posting into the live server is the right one.

### When a job has not run

1. `jobs list` — is it running? The reply distinguishes all four reasons it
   might not be: the global feature flag, configuration (usually an unset
   channel), this server's own switch, or the fact that it is running right now.
2. `/guardian jobs history <job>` — a `timed_out` run means the process died
   mid-job; a `failed` run carries the error code and the operator hint.
3. Still nothing? Check the container actually started, and check
   `BLOOM_TIMEZONE`: a job scheduled for 09:00 in the wrong zone has run, just
   not when you were looking.

## Adding a job

1. Write a factory that takes the bot's deps and returns a `ScheduledJob`.
2. Give it a stable key (`^[a-z][a-z0-9_.]{2,80}$`). **The key is the lock key**
   — changing it on a live job means the old and new names no longer exclude
   each other, and both can run.
3. Set `leaseSeconds` above the realistic worst case, not the happy path.
4. Register it in the app's `createFeatures`. It is gateable and listable the
   moment it is registered — there is nothing per-job to write for that.
5. Test it: that it posts, that it stays quiet when it should, that a second run
   inside the cooldown is suppressed, that it writes an audit row with no actor,
   and that switching it off for a guild stops it.
