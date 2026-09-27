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
  (`bot_name`, `onboarding_state`, `job_status`, `command_outcome`,
  `case_status`, `case_origin`, `case_event_type`, `moderation_action`,
  `report_category`).

  A Postgres enum and the matching TypeScript union are two independent
  declarations of the same set, and nothing makes them agree — adding a value in
  TypeScript without the migration compiles cleanly and fails on the first write
  that uses it. `moderation.integration.test.ts` reads `pg_enum` and compares it
  against the exported unions, which is the only check that actually closes
  that gap.

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

### `users` and `guild_members`

`users` is the global row per Discord account; `guild_members` is one row per
(guild, user) and holds `onboarding_state`, `joined_at`, `left_at`.

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

### `message_cooldowns`

Durable rate limiting for things where "twice" is a real problem — a welcome
message, a daily check-in, a reward.

`tryAcquire` is a single-statement test-and-set returning `(hit_count = 1) AS
acquired`. Checking and then setting would be a race, and the losing side would
be a duplicate reward.

### `bot_settings`, `channel_settings`, `role_settings`

Per-guild configuration that can change without a deploy. Three tables, and
only one of them is currently read:

- **`bot_settings`** — PK `(guild_id, bot_name, key)`, JSON value. **In use.**
  This is where the per-guild scheduled-job switches live, under
  `job.<job key>`, and where a platform-wide job's switch is recorded against
  the home guild. `bot_name` is in the key so Guardian's copy of a setting and
  Companion's are different rows.
- **`channel_settings`** and **`role_settings`** — **not read by anything
  today.** Channel and role ids come from the environment, and that is the
  only source the running code consults. The repository methods and the tables
  exist; no caller does. They are reserved for runtime overrides, and saying so
  is better than implying a feature that is not wired up. Until it is, changing
  a channel means changing `CHANNEL_*` and restarting.

### `command_usage`

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

### `case_counters` — Phase 2

One row per guild: `guild_id` primary key, `next_number`. Case numbers are
per-guild and human-facing ("case 47"), so they cannot come from a shared
sequence — a guild whose first case is #4,182 tells members how many other
servers there are.

Read with `SELECT … FOR UPDATE` inside the opening transaction. Without the
lock, two moderators opening a case in the same instant both read "next = 1" and
the unique index on `(guild_id, case_number)` rejects one of them, losing a
moderator's work to an error they cannot act on.

### `moderation_cases` — Phase 2

The unit of moderation work: `case_number` (unique per guild), `origin`
(`report`, `moderator`, `automation`), `status`, `summary`, `subject_id`,
`category`, `assigned_to`, `opened_by`, `resolution`, `resolved_at`,
`closed_at`.

Two CHECK constraints encode the rules the service layer also enforces:
`RESOLVED` requires both `resolved_at` and `resolution`, and `CLOSED` requires
`closed_at`. Enforcing them in the database as well is deliberate — the service
can be bypassed by a migration, a fix-up script, or a future caller, and "how
did we resolve this" is not a question we want to be unable to answer.

### `case_events` — Phase 2

Append-only case history: `case_id`, `event_type`, `actor_id`, `body`,
`from_status`, `to_status`, `correlation_id`. A CHECK enforces that
`event_type = 'status_changed'` iff both statuses are present, so a status
change cannot be recorded without saying what changed.

### `moderation_actions` — Phase 2

Every action taken, including warnings. `action`, `actor_id`, `subject_id`,
`channel_id`, `case_id`, `reason`, `duration_seconds`, `expires_at`, `metadata`,
`revoked_at`, `revoked_by`, `correlation_id`.

**Warnings are not a separate table.** A warning is a row with
`action = 'warn'`; active warnings are counted through a partial index
`WHERE action = 'warn' AND revoked_at IS NULL`. A parallel `warnings` table
would have duplicated the actor, reason, case link and revocation columns, and
created two places to look for "what has happened to this member".

Clearing warnings sets `revoked_at`/`revoked_by` rather than deleting. "Cleared"
means "no longer counts", not "never happened" — the history a future moderator
needs is exactly the history a clear would otherwise erase. The two columns are
constrained all-or-nothing, so a revocation always has an author.

`case_id` is `ON DELETE SET NULL`, not `CASCADE`. Deleting a case must not
delete the record of the ban that case produced; losing the action would mean
losing the justification for it.

A CHECK requires `subject_id OR channel_id` — an action against neither is an
action against nothing, unattributable in any history view.

The `reason` is stored as the moderator typed it, control characters aside. It
is deliberately **not** markdown-escaped: the reason's destinations are exports,
staff review and Discord's own audit-log reason header, and that header is plain
text, so an escaped reason is recorded forever as `off\-topic posting`. Escaping
happens at the render edge instead.

### `reports` — Phase 2

The member-submitted content behind a report: `case_id` (NOT NULL, UNIQUE,
`ON DELETE CASCADE`), `reporter_id`, `category`, `description` (≤1800),
`target_user_id`, `target_channel_id`, `target_message_id`.

**`description` is the most sensitive column in the schema.** It is someone
describing harassment in their own words. It reaches the private reports channel
and nothing else — never an audit row, never a log line. Audit entries carry the
case number and category only, and an integration-level test asserts the
description does not appear in either.

`CASCADE` here, unlike `moderation_actions`, because a report's content has no
meaning without its case and no reason to outlive it — the opposite of a ban
record. Deleting the case is how the content gets deleted.

### `point_events` — Phase 5

The Bloom Rewards ledger. `guild_id`, `user_id`, `kind`
(`check_in` | `small_win` | `manual_award` | `adjustment`), `points` (signed,
never zero), `reason`, `awarded_by`, `idempotency_key`, `correlation_id`,
`created_at`.

**Append-only, and there is no balance column.** A balance is `SUM(points)`,
computed on read. That is a deliberate trade of a little query cost for a
property worth more than it: a stored total is a second source of truth, and a
second source of truth about someone's points is a support ticket waiting to
happen. Corrections are negative `adjustment` rows; nothing is ever edited or
deleted.

Three constraints carry rules the application would otherwise have to remember:

| Constraint                           | What it prevents                                                    |
| ------------------------------------ | ------------------------------------------------------------------- |
| `UNIQUE (guild_id, idempotency_key)` | A replayed interaction paying twice                                 |
| `point_events_actor_matches_kind`    | A job attributing itself to a moderator, or an unattributable grant |
| `point_events_manual_needs_reason`   | Staff discretion with no record of why                              |

`idempotency_key` also carries a length floor of 8. A one-character key is
almost always a caller that has not thought about what makes the operation
unique, and the collisions it would cause are silent — two unrelated awards
sharing the key `a` look exactly like a correctly-prevented duplicate.

Balances cannot go negative, but no constraint can say so: there is no row to
constrain. `award()` takes a transaction-scoped advisory lock keyed on the
member before any negative entry, checks the sum, and refuses to overdraw.
Positive awards skip the lock — they are the hot path and cannot overdraw.

### `check_ins` — Phase 5

`PRIMARY KEY (guild_id, user_id, local_date)`, plus `point_event_id` and
`created_at`.

**The primary key is the once-a-day rule.** Not a `SELECT` then an `INSERT`,
which races with itself under a double-tap.

`local_date` is the calendar date in `BLOOM_TIMEZONE`, resolved by the
application and stored. Not derived from `created_at`, for two reasons:
`now()::date` is UTC and would roll the day over at midnight UTC, handing a
member in Australia two check-ins for one evening; and storing the resolved date
means editing `BLOOM_TIMEZONE` later cannot rewrite the meaning of check-ins
already recorded.

`point_event_id` is nullable, and NULL is a real state rather than a missing
one: the check-in was recorded while `FEATURE_REWARDS` was off. The
participation happened and earned nothing, and back-filling points for it later
would be inventing history.

**No column stores what anybody wrote.** `/checkin` takes no text at all, and
the description a member gives `/win` goes to the small-wins channel and nowhere
else — not the ledger, not the audit row, not the logs. A daily record of how
everyone in the community is feeling is sensitive data with no operational
purpose, and the safest way to hold it is not to.

### `member_awards` — Phase 6

`PRIMARY KEY (guild_id, user_id, award_key)`, plus `kind`, `evidence jsonb`,
`earned_at` and `announced`.

**The primary key is the whole once-only rule.** A check-in and a shared win
seconds apart both trigger an evaluation; if both saw the same fresh count and
both inserted, the member would get two rows and two public announcements for
one milestone. `ON CONFLICT DO NOTHING` plus the key means exactly one caller is
told `granted` and therefore exactly one caller announces. An integration test
races three grants to prove it.

`award_key` is CHECKed against `^[a-z][a-z0-9_.]{2,60}$`. These keys end up in
audit rows and operator queries, so `Milestone 1!` getting in would make them
unqueryable a year from now. `kind` is CHECKed to `('milestone','achievement')`.

`evidence` records **counts only** — `{"checkIns": 10, "threshold": 10}` — never
member-authored text. It exists so a grant stays explicable after a threshold is
retuned: without it, a milestone awarded at ten check-ins under an old rule is
indistinguishable from a bug once the rule says fifty.

`announced` is separate from the grant because they are different effects with
different failure modes. Discord being unreachable must not stop an award being
earned, and the flag is what stops the announcement being posted twice on the
next evaluation.

**Nothing in this table stores points.** Awards and points are separate systems;
see [Bloom Rewards](../operations/bloom-rewards.md) for why.

The counts the definitions evaluate against are not stored anywhere. They come
from one CTE over `check_ins` and `point_events` — `participation()` — computed
on read, so an award can never be granted on a number nothing can reproduce.
That query converts win timestamps with `AT TIME ZONE` before comparing them to
check-in dates: `point_events` stores an instant and `check_ins` stores a
calendar date, and comparing them raw would file an evening win under the
following day for half the world.

### `feedback` — Phase 7

`id`, `guild_id`, `user_id`, `category`, `summary`, `detail`, `message_id`,
`correlation_id`, `created_at`.

**There is no status column, on purpose.** A status implies somebody is obliged
to move it, and an inbox where every row reads `NEW` for a year is a promise the
team never made. Feedback is recorded, posted to `#feedback`, and dealt with by
humans the way humans deal with things.

`category` is CHECKed to `('feature','improvement','content','other')` rather
than left free text, so the channel can be filtered and two people describing
the same kind of thing use the same word for it.

`summary` is CHECKed `char_length(btrim(summary)) BETWEEN 8 AND 200`. The
`btrim` is load-bearing: without it a summary of twelve spaces passes a length
floor. The bounds equal the modal's own `minLength`/`maxLength`, so anything the
form accepts the table accepts — a mismatch turns a member's paragraph into a
database error _after_ they press submit, with the text gone.

`message_id` is nullable because "no feedback channel configured" is a real
state, not an error.

### `bug_counters` — Phase 7

`guild_id` PK, `next_number`, `updated_at`. The allocator from `case_counters`,
reused: `INSERT … ON CONFLICT (guild_id) DO UPDATE SET next_number = next_number

- 1 RETURNING next_number - 1`. One statement, so the row lock is held by
Postgres for its duration and ten concurrent filings get ten distinct numbers.
An integration test files ten at once and asserts exactly `[1..10]`; replacing
the counter with `max(bug_number) + 1` makes it fail.

Separate from `case_counters` deliberately. Bug 12 and case 12 are different
things people quote at each other, and a shared allocator would make bug numbers
jump every time a moderation case was opened.

### `bug_reports` — Phase 7

`bug_status` is an enum: `NEW`, `TRIAGED`, `FIXED`, `WONT_FIX`, `DUPLICATE`. The
three terminal states are kept distinct because they mean different things to
the person who reported it — "you were right and it is gone", "you were right
and we are choosing to live with it", "you were right and someone said it
first". Collapsing them into `CLOSED` makes all three read as a shrug.

Four CHECK constraints carry rules the application must not be the only place to
know:

| Constraint                   | Rule                                                      |
| ---------------------------- | --------------------------------------------------------- |
| `terminal_needs_resolution`  | Anything past `TRIAGED` must say why, non-blank           |
| `triaged_needs_actor`        | Anything not `NEW` records who moved it and when          |
| `duplicate_points_somewhere` | `status = 'DUPLICATE'` **iff** `duplicate_of IS NOT NULL` |
| `duplicate_is_another_bug`   | A bug cannot duplicate itself                             |

`duplicate_points_somewhere` is written as an equality of two booleans so it
catches both halves: a `DUPLICATE` with no target, and a target hung off a
`FIXED` row where nothing would ever read it.

`UNIQUE (guild_id, bug_number)` scopes numbering per guild. A partial index on
`(guild_id, created_at) WHERE status IN ('NEW','TRIAGED')` serves the triage
queue, because the open set stays small while the closed set grows forever.

### `bug_events` — Phase 7

`bug_id`, `from_status` (null for the filing itself), `to_status`, `actor_id`,
`note`, `created_at`. Append-only.

`bug_reports.status` is where a bug is; this is how it got there. The current
state alone cannot answer "who closed this, and when" — the exact question asked
when a member says their report was dismissed. The filing and its first event
are written in one transaction, so a bug with no history is not a state that can
exist.

`triage` re-reads the row `FOR UPDATE` before writing. Two moderators pressing
the same button produce one transition and one event; the second is answered
`unchanged`, not a second row. Removing `FOR UPDATE` makes an integration test
fail.

### Member-authored text

`feedback` and `bug_reports` hold prose a member wrote, which nothing else in
this schema does except `moderation_cases.summary`. Stored text is **not**
markdown-escaped — escaping is applied when composing a Discord payload, never
before the insert. A row saved as `check\-in` is corrupt for every non-Discord
reader and gains a backslash on each round trip. `storableUserText()` (strip
control characters, trim, truncate) guards the write; `sanitiseUserText()` and
`escapeMarkdown()` guard the render.

No attachments, no links, no email, no app-account link, no device information.
A bug report is about software. `guilds` cascades, so removing the guild removes
the submissions. There is no automatic expiry yet — how long a defect stays
useful is a product decision, not something to guess at in a migration.

### Retention and erasure

No table is added for either. Retention is a nightly job over an explicit
allowlist — `idempotency_keys`, `message_cooldowns`, `job_runs`, `command_usage`,
`verification_attempts`, `audit_events` — deleting in bounded batches of 5,000
per table per run.

An allowlist rather than a denylist because the failure modes are not
symmetrical: forgetting to add a table means it grows, which is visible and
recoverable; forgetting to exclude one means a scheduled job quietly deletes the
rewards ledger one morning. An integration test sets every window to zero and
asserts the ledger and the submissions survive.

`idempotency_keys.expires_at` finally does something. The column and its "keys
are pruned after this" comment shipped in `0003`; nothing pruned them until the
retention job existed, so the table grew by one row per guarded operation
forever.

**Erasure redacts.** Member prose is overwritten with a tombstone long enough to
satisfy the columns' own length CHECKs; the rows stay. `bug_reports` keeps its
number, status and history because other bugs reference it as a duplicate target
and members quote it in channels. `point_events.reason` is cleared only for
`check_in` and `small_win` — a CHECK requires `manual_award` and `adjustment` to
keep their reason, and that reason is staff-authored. Full table:
[data retention](../operations/data-retention.md).

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

## Case status transitions

`OPEN → IN_REVIEW → ESCALATED → RESOLVED → CLOSED`, with `RESOLVED` and `CLOSED`
terminal.

`transitionStatus()` mirrors the onboarding contract: `SELECT … FOR UPDATE`, a
conditional `UPDATE … WHERE status = expectedFrom`, and the history insert, all
in one transaction. It returns a discriminated outcome rather than throwing:

| Result             | Meaning                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `applied`          | The transition was taken.                                        |
| `already_in_state` | Another moderator already did it. Routine, not an error.         |
| `conflict`         | The case moved underneath us. Reports actual vs expected.        |
| `not_found`        | No such case number in this guild.                               |
| `terminal`         | The case is RESOLVED or CLOSED and will not be reopened quietly. |

Two moderators opening the same case and both marking it in review is the normal
case, not the exotic one, and the second has to be told it was already done
rather than shown an error suggesting something is broken.

---

## What is not here yet

Phases 0–6 ship the base, onboarding, moderation, rewards and awards: identity,
audit, idempotency, jobs, cooldowns, settings, telemetry, transitions,
verification attempts, cases, case events, case counters, moderation actions,
reports, point events, check-ins and member awards.

Still to come, each with the phase that owns it: challenges and events
(Companion), cohorts, feedback, votes and bug intake (Labs).

Two tables that were expected and are **not** here. The per-guild job switch
needed no table of its own — `bot_settings` already was a per-guild, per-bot
setting with an author. And there is no `member_points` aggregate: see
`point_events` above for why a stored balance was rejected.

Adding them later is a new numbered migration. Existing migrations are immutable
once applied.

---

## Verification status

The schema **has been executed against a live PostgreSQL 18.4 instance** as of
Phase 6. All seven migrations apply cleanly from empty, re-running is a no-op,
the seed loads, and the drift guard was confirmed by deliberately editing an
applied file and watching the migrator refuse with `CONFIGURATION_ERROR`.

Sixty-eight integration tests exercise the repositories against that database,
covering the behaviour unit tests with fakes cannot reach:

- Two simultaneous `transition()` calls on the same member produce exactly one
  `applied` and one `already_in_state`, never two.
- Twelve concurrent case opens produce the numbers 1–12 with no duplicates and
  no unique-violation.
- The `RESOLVED`-requires-a-resolution CHECK rejects a direct `UPDATE` that
  bypasses the service layer.
- Deleting a case leaves its `moderation_actions` rows behind with a null
  `case_id`.
- The Postgres enums and the TypeScript unions contain exactly the same values.
- Ten workers replaying one award insert exactly one ledger row between them.
- Two concurrent −50 corrections against a balance of 60 apply once, not twice:
  the advisory lock serialises them where no constraint could.
- Two simultaneous check-ins on the same local day produce one `recorded` and
  one `already_today`.
- `bot_settings` accepts `job.` + an 80-character job key, and `bot_name`
  really does keep Guardian's rows out of Companion's reads.
- Three concurrent grants of one award produce a single row and a single
  `granted`, so a milestone is announced once.
- A win logged at 22:00 UTC pairs with the next day's check-in under
  `Australia/Sydney`, and stops pairing if the timezone conversion is removed.
- The longest-gap window function returns 54 days across a real absence, and 0
  rather than NULL for a member with a single check-in.

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
