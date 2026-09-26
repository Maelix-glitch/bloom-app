# Data retention and erasure

What the platform keeps, for how long, and how to remove a member's content when
they ask.

---

## What is kept

### Operational exhaust — pruned automatically

Rows the platform generates about itself. The nightly
`platform.retention.prune` job deletes these past their window.

| Table                   | Window               | Why that long                                                             |
| ----------------------- | -------------------- | ------------------------------------------------------------------------- |
| `idempotency_keys`      | its own `expires_at` | 30 days by default — far longer than any plausible retry                  |
| `message_cooldowns`     | 1 day after expiry   | A just-lapsed cooldown is still evidence for "why did this not fire"      |
| `job_runs`              | 90 days              | Long enough to see a job failing since a deploy three weeks ago           |
| `command_usage`         | 90 days              | Answers "is this used" and "did latency regress"; neither reaches further |
| `verification_attempts` | 180 days             | Abuse is seasonal; a failed attempt from two years ago answers nothing    |
| `audit_events`          | 730 days             | What a moderation dispute is settled from, and disputes surface late      |

### The member record — never pruned

Not on the allowlist, and an integration test sets every window to zero and
asserts these survive:

`point_events` · `check_ins` · `member_awards` · `moderation_cases` ·
`case_events` · `moderation_actions` · `reports` · `onboarding_transitions` ·
`feedback` · `bug_reports` · `bug_events`

These are removed by erasure or by the guild being deleted, never by a schedule.
See [D3](../architecture/decisions.md) for why this is an allowlist rather than
a denylist.

### What is never collected at all

No email addresses, no Bloom app account link, no device information, no IP
addresses, no message content from channels the bots did not post in. The
platform does not request the Message Content intent. A bug report is about
software; asking for more would make the intake an incident of its own.

---

## The nightly job

`platform.retention.prune`, owned by Guardian, 04:20 in the configured timezone.
Off the hour deliberately — a nightly delete landing in the same minute as a
backup and a log rotation is how a quiet window becomes a latency spike.

It deletes in bounded batches of 5,000 per table. An unbounded
`DELETE FROM audit_events WHERE created_at < …` against two years of rows is one
transaction holding locks for minutes, a replication lag spike and a WAL surge,
during which the bots cannot write.

**Reading the logs:**

| Event                    | Meaning                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `jobs.retention.clear`   | Nothing was past its window. No audit row is written             |
| `jobs.retention.pruned`  | Rows were deleted; counts are in the fields and in the audit row |
| `jobs.retention.backlog` | **warn** — a table hit the cap; rows remain past their window    |

One or two nights of `backlog` after launch is expected, as the first runs work
through everything that accumulated before the job existed. Seeing it every
morning for a fortnight means deletes are not keeping pace with inserts: raise
the batch size or run it more often.

**Switching it off:**

```
/guardian jobs disable platform.retention.prune
```

It is a platform-wide job with no guild of its own, so its switch is recorded
against the home guild — see [D6](../architecture/decisions.md). Turning it off
is audited. Leave it off only as long as an incident lasts; it is the only thing
bounding table growth.

---

## Erasing a member's content

### What erasure does

Overwrites the prose a member wrote, and keeps the rows. Not a hedge — deleting
the rows is wrong in specific, checkable ways, set out in
[D4](../architecture/decisions.md).

| Table          | What happens                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `feedback`     | `summary` → tombstone, `detail` → null                                       |
| `bug_reports`  | `summary` and `steps` → tombstone, `expected` → null; number and status stay |
| `point_events` | `reason` → null, **only** for `check_in` and `small_win`; points unchanged   |
| `reports`      | `description` → tombstone, **only** where the member was the reporter        |
| `audit_events` | Untouched — ids and event names only, never prose                            |

The tombstone is `[removed at the author's request]`, long enough to satisfy the
length CHECKs on the columns it is written into. An empty string would violate
them, and it would do so at the worst possible moment.

### Running it

```sh
# Rehearsal. Performs the real erasure in a transaction and rolls it back,
# so the counts come from the statements that would actually run.
pnpm data:erase --user 123456789012345678

# Apply.
pnpm data:erase --user 123456789012345678 --confirm
```

`--guild` defaults to `DISCORD_GUILD_ID`. Re-running is safe: already-redacted
rows are skipped, so a second pass reports zero rather than inflating a count.

The applied run writes one `platform.member_data_erased` audit row containing
counts only.

### What it cannot do

**It does not delete messages in Discord.** Feedback and bug announcements the
bots posted to `#feedback` and `#bug-reports` are Discord's copy, not the
platform's. Removing them is a separate manual step:

1. `pnpm data:erase --user <id> --confirm`
2. Find the announcements. `feedback.message_id` and `bug_reports.message_id`
   hold the ids — run the erasure first and the ids are still there, because
   erasure redacts prose and keeps structure.
3. Delete or edit those messages in Discord.
4. Note in your own records that both steps were completed.

Do these in that order. Deleting the Discord messages first leaves the rows
looking un-erased, and the next person to check will redo work that was already
done.

### What is deliberately not erasable

Moderation cases, case events, moderation actions, and reports where the member
was the _subject_. A member who could erase the record of their own warning
could erase the reason they were warned. If a specific record must go, an
administrator removes it directly, with a note saying who decided and why —
deliberately more friction than a command.

---

## Deleting everything for a guild

`guilds` cascades. Removing the guild row removes every table that references
it — submissions, ledger, cases, audit. There is no undo and no soft delete:

```sql
DELETE FROM bloom_discord.guilds WHERE guild_id = '...';
```

Take a backup first. This is the one operation in the system with no recovery
path.

---

## Backups

Not provided by this platform, deliberately: the database is Supabase-managed
and its backups are configured there, where restores are also performed. Two
things to verify before go-live, neither of which the platform can check for
you:

- point-in-time recovery is enabled on the Supabase project;
- a restore has been rehearsed at least once. An untested backup is a belief.
