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
ScheduledJob  ──registered into──▶  Scheduler  ──asks──▶  JobLock
  (a feature)                     (one/process)              │
                                                     DatabaseJobLock
                                                             │
                                                    job_runs (Postgres)
```

- **`Scheduler`** (`@bloom/events`) owns the cron expressions and the lifecycle.
  It depends on the `JobLock` _interface_ only, which is why it can be unit
  tested without a database.
- **`DatabaseJobLock`** (`@bloom/discord`) adapts the `job_runs` repository to
  that interface. It lives in `@bloom/discord` because that is the first package
  that depends on both halves; putting it in `@bloom/events` would drag a
  Postgres driver into a package that should not need one.
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
| Enable/disable       | `ScheduledJob.enabled`, plus the global `FEATURE_SCHEDULED_MESSAGES`          |
| Channel config       | A `CHANNEL_*` id; a job whose channel is unset registers as **disabled**      |
| Timezone             | `BLOOM_TIMEZONE`, an IANA name, applied to every cron expression              |
| Duplicate prevention | The lock for concurrent runs; a `message_cooldowns` claim for sequential ones |
| Cooldown             | Claimed **before** posting, so two runners cannot both get past it            |
| Audit log            | An `audit_events` row with `actor_id = NULL` and `source = <job key>`         |

Two of those are easy to get subtly wrong.

**The lock does not prevent double-posting.** It prevents two _concurrent_ runs.
A redeploy at 08:59, a reclaimed lease, and a manual `/guardian jobs run` can all
produce a second _sequential_ run on the same day, and the lock is perfectly
happy with that. Duplicate suppression is the job's own cooldown claim, and it
must be taken before the message is sent, not after — claiming afterwards leaves
a window in which both runs have already posted.

**A disabled job should still register.** If a job disappears from
`/guardian jobs list` when it is switched off, an operator cannot tell "disabled
on purpose" from "not deployed". Register it and report it as disabled.

## Silence is a feature

`guardian.cases.stale_sweep` posts nothing when no case is stale. A digest that
arrives every morning saying "0 stale cases" teaches staff to skim past the
mornings when the number is not zero, which costs more than the reassurance is
worth. The same reasoning applies to anything added later: if a scheduled
message has nothing to say, it should not say it.

## Operating it

```
/guardian jobs list           # what exists, when it next runs, in which timezone
/guardian jobs history <job>  # the last durable run, with the failure detail
/guardian jobs run <job>      # trigger now (Administrator)
```

`jobs history` reads `job_runs`, not process memory, so it still answers
correctly after a deployment. `jobs run` bypasses the schedule but neither the
lock nor the job's cooldown, so it cannot be used to force a duplicate post.

`FEATURE_SCHEDULED_MESSAGES` defaults to **false**. Development environments
share a production database more often than anyone admits, and the default that
prevents a developer's laptop from posting into the live server is the right one.

### When a job has not run

1. `/guardian jobs list` — is it `disabled`? Then it is either
   `FEATURE_SCHEDULED_MESSAGES` or an unconfigured channel, and the reply
   distinguishes the two.
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
4. Register it in the app's `createFeatures`.
5. Test it: that it posts, that it stays quiet when it should, that a second run
   inside the cooldown is suppressed, and that it writes an audit row with no
   actor.
