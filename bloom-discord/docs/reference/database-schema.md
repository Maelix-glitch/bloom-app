# Database schema

One Postgres database, one dedicated schema: **`bloom_discord`**.

The Bloom product already owns `public` in the same Supabase project. A separate
schema means bot tables cannot collide with product tables, migrations cannot
interfere with each other, and access can be granted or revoked per schema.

## Conventions

- **Timestamps** are `timestamptz`, always. A bot serving a community across
  time zones cannot store naive local times.
- **Snowflakes** use a `snowflake` domain (`text` constrained to 17–20 digits).
  Not `bigint`: JavaScript numbers lose precision above 2^53, and Discord's own
  API serialises them as strings.
- **`updated_at`** is maintained by a `set_updated_at()` trigger, not by
  application code, so a manual `UPDATE` cannot leave it stale.
- **Enums** are Postgres enums where the value set is genuinely closed
  (`bot_name`, `onboarding_state`, `job_status`, `command_outcome`).

## Migrations

Plain SQL in `database/migrations/`, named `NNNN_snake_case_name.sql`.

|              |                                                                       |
| ------------ | --------------------------------------------------------------------- |
| Ledger       | `bloom_discord.schema_migrations`                                     |
| Ordering     | by numeric prefix, not filename string — `0010` sorts after `0009`    |
| Locking      | `pg_advisory_xact_lock`, so two deploying replicas cannot race        |
| Drift        | SHA-256 checksum per file; a mismatch is a hard `CONFIGURATION_ERROR` |
| Transactions | one per migration; a failure rolls that migration back entirely       |

Editing an already-applied migration is always a mistake: the edit will never
run in an environment that applied the original, so two databases now differ
while claiming the same version. The migrator refuses to proceed and names the
file.

```bash
pnpm db:status     # applied, pending, drift
pnpm db:migrate    # apply pending
pnpm db:seed       # development fixtures; refuses to run in production
```

---

## Tables

### `guilds`

The servers the platform knows. Effectively one row, but keyed properly so a
staging guild does not need a separate database.

### `members`

One row per (guild, user). Holds `onboarding_state`, `joined_at`, `left_at`.

Rejoining clears `left_at` but **preserves** `onboarding_state` — someone who
verified, left and came back should not have to verify again.

There is deliberately no shared `setOnboardingState`. State transitions are
Guardian's, and arrive in Phase 1 on Guardian's side of the boundary.

### `member_roles`

An **observed cache** of the roles Discord reports a member holding, maintained
from `guildMemberUpdate`.

> This table is never an authorization source. Authorization always reads the
> roles on the live interaction payload. A cache can be stale by seconds; an
> authorization decision made on stale data is a security bug.

It exists for reporting and for detecting drift.

### `audit_events`

Append-only. Every state-changing action: actor, target, action, reason,
correlation id, timestamp.

No `UPDATE`, no `DELETE`. An audit trail that can be edited is not an audit
trail. Private report _content_ is never stored here — a fingerprint hash is,
so two entries about the same report can be correlated without disclosure.

### `idempotency_keys`

Durable duplicate suppression for anything with a visible side effect.

`claim` uses `INSERT … ON CONFLICT DO NOTHING` rather than catching a unique
violation, because a violation inside the caller's transaction would abort it —
the caller would lose the work it did before calling.

### `job_runs`

One row per scheduled-job attempt, with a lease.

The key mechanism is a partial unique index on
`(job_key, COALESCE(guild_id, ''))` `WHERE status = 'running'`, so at most one
replica holds a job at a time. `lease_expires_at` means a crashed process
releases its claim rather than blocking the job forever;
`reclaimExpired` marks lapsed runs `timed_out`.

### `cooldowns`

Durable rate limiting for things where "twice" is a real problem — a welcome
message, a daily check-in, a reward.

`tryAcquire` is a single-statement test-and-set returning `(hit_count = 1) AS
acquired`. Checking and then setting would be a race, and the losing side would
be a duplicate reward.

### `settings`

Per-guild key/value configuration that must be changeable without a deploy:
feature toggles, channel overrides, scheduled-message enable/disable.

### `command_telemetry`

One row per command invocation: command path, actor, outcome, error code,
duration, correlation id.

**No command arguments are stored.** Knowing that `/report` was used is
operationally useful; storing what someone reported would put private content in
a metrics table.

---

## What is not here yet

Phase 0 ships the base: identity, audit, idempotency, jobs, cooldowns, settings,
telemetry. Feature tables arrive with the phase that owns them — moderation
cases in Phase 2, rewards ledgers in Phase 3, cohorts and feedback in Phase 5.

Adding them later is a new numbered migration. Existing migrations are immutable
once applied.

---

## Honest limitation

The migrations, seeds and repository SQL in Phase 0 have **not been executed
against a live PostgreSQL instance** — there is no database or `psql` in the
build environment. They are covered by unit tests over the pure logic
(file ordering, checksum drift, filename validation) and by review.

First run against a real database should be `pnpm db:status`, then
`pnpm db:migrate`, on a scratch database. Until then, treat the SQL as reviewed
but unverified.
