# Decisions

Decisions that shaped the platform and are expensive to reverse, with the
reasoning that produced them. A decision recorded without its alternatives is
just an instruction; the point of this file is that a future maintainer can tell
whether the reason still holds.

Superseding one means adding an entry, not editing history.

---

## D1 — The Discord rank ladder and the Bloom app's progression stay separate

**Status:** decided · supersedes nothing · first flagged in Phase 5

Bloom has two progression systems. This server has nine ranks — Seedling
through Master Bloom, at 0/50/150/350/700/1200/2000/3200/5000 points. The Bloom
app has twelve, with seasons. They share a vocabulary and count different
things.

Three options were real:

1. **Unify them.** A member's Discord activity would feed the app's progression
   and one rank would be true everywhere.
2. **Keep them separate and say so.**
3. **Leave it ambiguous** — what the platform did until now.

Unification requires knowing that a Discord account and a Bloom account are the
same person. Nothing in the schema links them, and the only honest way to
establish that link is OAuth: the member authorises it, consents to what crosses
over, and can revoke it. That is a project with a privacy review attached, not a
migration. The dishonest ways — matching usernames, asking a member to type
their email into a modal — would either be wrong some of the time or would
collect account identifiers into a Discord bot's database, which is exactly what
the brief's security rules exclude.

Option 3 is what was in place, and it is the worst of the three: a member who
sees "Sprout" here and something else in the app reasonably concludes one of
them is broken.

**Decision: option 2.** The ladders stay separate, and every Discord surface
that shows a rank names its scope — `/companion rank` is titled "Server rank",
says "points in this server", and both it and the profile card carry one
restrained footer: _Counts activity in this server. Bloom app progress is
separate._ Three tests pin it, including one asserting the surfaces claim no
sync, total or shared rank.

**Reversing this** means building account linking first. At that point D1 is
superseded by a decision that describes the consent flow, not by deleting the
footer.

---

## D2 — `/labs admin experiment start` is dropped, not deferred

**Status:** decided · Phase 7

The original command list included an experiment lifecycle for Labs. It was
never built, and it should not be.

An experiment command that announces an experiment and records a row is an
announcement with extra steps — `#development-updates` already does
announcements, by a human, with more context than a slash command will ever
collect. A _useful_ experiment feature needs a measurement: cohort assignment, a
metric, a before and after, and something that reports the result. None of that
exists, and none of it is close.

**Decision: remove it from the command list.** If experiments become real, they
arrive with measurement attached or not at all. Cohorts, voting, feature status
and release notes remain genuinely deferred — they have dependencies rather than
an argument against them — and are listed in
[`docs/reference/commands.md`](../reference/commands.md).

---

## D3 — Retention prunes operational exhaust only, from an allowlist

**Status:** decided · production hardening pass

Until the retention job existed, nothing in the platform deleted anything: two
repositories had a `pruneExpired` method with no caller, and the migration
comment on `idempotency_keys` promised pruning that never happened.

The decision is not _whether_ to prune but _what_. Two shapes were available:

- a **denylist** — prune everything except a protected set;
- an **allowlist** — prune only what is named.

Their failure modes are not symmetrical. Forgetting to add a new table to an
allowlist means it grows: noticeable, recoverable, and visible in a table size
graph. Forgetting to add one to a denylist means a scheduled job quietly deletes
the rewards ledger at 04:20 one morning.

**Decision: an allowlist**, in `PRUNABLE_TABLES` — idempotency keys, cooldowns,
job runs, command usage, verification attempts, audit events. Nothing that
constitutes a member's record is on it: the points ledger, check-ins, awards,
moderation cases and events, onboarding transitions, feedback and bug reports
are all excluded, and an integration test sets every retention window to zero
and asserts the ledger and submissions survive.

Windows: 90 days for job runs and command telemetry, 180 for verification
attempts, 730 for audit events. Audit is longest deliberately — it is what a
moderation dispute is settled from, and disputes surface a year later.

---

## D4 — Erasure redacts; it does not delete

**Status:** decided · production hardening pass

Labs stores prose a member wrote, so "remove what I wrote" needs an answer.
Deleting the rows is the obvious one and it is wrong in three specific places:

- **Bug reports** are quoted by number in channels and referenced by other bugs
  as duplicate targets. Deleting bug 47 turns every reference into a dangling
  number and silently changes what the team believes about its own backlog. The
  defect was real; the paragraph describing it was the member's.
- **`point_events`** is an append-only ledger whose sums have already been shown
  to the member and to everyone who saw a leaderboard. Deleting rows rewrites a
  history other people saw.
- **Moderation records** are not erasable by their subject, here or anywhere. A
  member who could delete the record of their own warning could erase the reason
  they were warned.

**Decision: overwrite the prose, keep the structure.** A tombstone — _[removed
at the author's request]_ — long enough to satisfy the columns' own length
CHECKs, which an empty string would not, and which would therefore fail at the
worst possible moment.

Scoped precisely to the member's own words. `point_events.reason` is redacted
only for `check_in` and `small_win`; `manual_award` and `adjustment` reasons are
staff writing down why they moved someone's points, and the schema agrees — a
CHECK requires those kinds to keep a non-blank reason. `reports` are redacted
only where this member was the reporter, never the subject.

Audit rows survive an erasure untouched, because by construction they hold ids,
event names and counts and never prose. That is also why they can be kept for
two years.

---

## D5 — Erasure is a CLI, not a slash command

**Status:** decided · production hardening pass

Erasure is irreversible, rare and legally significant. As a slash command it
would be two clicks from a moderator, with autocomplete offering user ids beside
it, and the audit trail would record that a Discord account did it — when what
needs recording is that a request was received and honoured.

**Decision: `pnpm data:erase`, run by whoever administers the deployment.** The
default does nothing: without `--confirm` it performs the real erasure inside a
transaction and rolls it back, so the number shown to the operator comes from
the same statements that would run for real rather than from a count query that
can disagree with them. The applied run writes one audit row with counts only.

It cannot unsay things in Discord. Messages the bots already posted are
Discord's copy; deleting those is a separate manual step, and
[`docs/operations/data-retention.md`](../operations/data-retention.md) says so
rather than letting an operator assume otherwise.

---

## D6 — Platform-wide jobs resolve their off switch against the home guild

**Status:** decided · production hardening pass

`DatabaseJobGate` returned `enabled: true` for any job carrying a null guild, on
the reasoning that a global job has no guild whose administrators could have an
opinion. That was fine while every job was guild-scoped. The retention job is
not, and the result was that the one job in the platform that destroys data
could not be switched off without a redeployment.

Giving the job a guild id would have been the smaller change and it would make
`job_runs` claim the sweep touched one guild's rows when it touches rows
belonging to no guild at all.

**Decision: the gate takes a home guild**, and a global job's switch is recorded
there. Bloom runs one guild; the alternative is a nullable column inside a
primary key, which makes every other settings lookup ambiguous to save one row.

---

## D7 — CI ships as a file to install, not as an active workflow

**Status:** accepted constraint · production hardening pass

The pipeline lives at `ci/github-actions/bloom-discord.yml` rather than
`.github/workflows/`. GitHub rejects any push from an App without the
`workflows` permission that creates or edits a workflow file — a deliberate
safety rule, since an integration that can write workflows can run arbitrary
code with the repository's credentials.

**Decision: ship it where it can be pushed, and document the one command that
installs it**, rather than quietly omitting CI or pretending the branch is
covered by checks that do not exist.
