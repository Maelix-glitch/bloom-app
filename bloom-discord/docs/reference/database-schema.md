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

### `onboarding_transitions` — Phase 1

The append-only history of the role lifecycle. One row per accepted state
change: `from_state`, `to_state`, `trigger`, `actor_id`, `reason`, `source`,
`correlation_id`, `created_at`.

Nothing updates or deletes here. "Who moved this member to ❋ Bloom Member, when,
and why" has to survive the member leaving, the moderator leaving, and a later
correction, so a mutable current-state column on `guild_members` is not enough
on its own — that column is the fast read, this table is the record.

`from_state` is stored even though it is derivable, because it is only derivable
if every prior row is intact. Storing it makes each row independently auditable.

The foreign key is composite — `(guild_id, user_id)` into `guild_members` — with
`ON DELETE CASCADE`. Two indexes: `(guild_id, user_id, created_at DESC)` for the
per-member history read, and one on `to_state` for the state-count query.

### `verification_attempts` — Phase 1

Every `/verify` invocation, whether it succeeded or not, with its outcome. This
is what distinguishes "quiet server" from "verification has been broken for six
hours" — without failed attempts recorded, a broken flow looks like silence.

Kept separate from `command_telemetry` because it answers a moderation question
("is someone hammering this?"), not a metrics one, and it outlives telemetry
retention.

---

## The transition contract

Legal edges are declared once, in `@bloom/shared-types`, and enforced in both
places:

| From           | May move to               |
| -------------- | ------------------------- |
| `unverified`   | `early_bloom`, `revoked`  |
| `early_bloom`  | `bloom_member`, `revoked` |
| `bloom_member` | `early_bloom`, `revoked`  |
| `revoked`      | `unverified`              |

`bloom_member → early_bloom` exists for demotion during a review. There is no
edge back into `unverified` except through `revoked`, so "never verified" and
"verification was taken away" stay distinguishable.

`transition()` takes an `expectedFrom` and resolves in one statement, returning a
discriminated result rather than throwing:

| Result             | Meaning                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `applied`          | The edge was taken.                                                            |
| `already_in_state` | Someone else already did it. Not an error; `/verify` twice in a row is normal. |
| `conflict`         | The row moved underneath us. Reports actual vs expected.                       |
| `member_missing`   | No such member row.                                                            |

An illegal edge is different in kind — it is a bug in the caller, not a race —
and throws `INVALID_INPUT`.

---

## What is not here yet

Phases 0–1 ship the base plus onboarding: identity, audit, idempotency, jobs,
cooldowns, settings, telemetry, transitions, verification attempts. Feature
tables arrive with the phase that owns them — moderation cases in Phase 2,
rewards ledgers in Phase 3, cohorts and feedback in Phase 5.

Adding them later is a new numbered migration. Existing migrations are immutable
once applied.

---

## Verification status

The schema **has been executed against a live PostgreSQL 18.4 instance** as of
Phase 1. All four migrations apply cleanly from empty, re-running is a no-op,
the seed loads, and the drift guard was confirmed by deliberately editing an
applied file and watching the migrator refuse with `CONFIGURATION_ERROR`.

Eleven integration tests exercise the repositories against that database —
including the concurrency behaviour that unit tests cannot reach: two
simultaneous `transition()` calls on the same member produce exactly one
`applied` and one `already_in_state`, never two.

```bash
set -a && . ./.env && set +a
BLOOM_INTEGRATION_TESTS=1 pnpm test
```

Without that variable the integration files are excluded, so a contributor with
no database still gets a green suite rather than a wall of connection errors.

The one thing still unverified is behaviour under Supabase's connection pooler
specifically; the tests ran against stock PostgreSQL. Transaction-mode pooling
disallows session-level features, and the migrator's advisory lock is
session-scoped — run migrations against the direct connection, not the pooler.
