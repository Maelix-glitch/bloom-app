# Phase 2 — Moderation, reports and cases

Guardian can now act. Phase 1 gave it verification and the role lifecycle; this
phase adds warnings, timeouts, kicks, bans, purges, slowmode, channel locking,
staff notes, member reports, and the case system that ties them together.

Everything below has been compiled, linted, tested and — for the database
layer — executed against a live PostgreSQL. Nothing here is aspirational; the
gaps are listed at the end rather than papered over.

---

## 1. Files created and changed

### Created (19)

| File                                                                            | What it is                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `database/migrations/0005_moderation.sql`                                       | 5 tables, 5 enums, the CHECK constraints and indexes          |
| `packages/shared-types/src/moderation.ts` _(extended)_                          | `ModerationAction`, `CaseStatus`, `ReportCategory` and guards |
| `packages/permissions/src/moderation-target.ts`                                 | "may this actor act on this target" — seven ordered checks    |
| `packages/permissions/src/moderation-target.test.ts`                            | 20 tests, including the check _ordering_                      |
| `packages/database/src/repositories/moderation.ts`                              | Actions, warnings, revocation, per-channel and per-case reads |
| `packages/database/src/repositories/cases.ts`                                   | Case open/assign/transition/history, per-guild numbering      |
| `packages/database/src/repositories/moderation.integration.test.ts`             | 11 tests against real PostgreSQL                              |
| `packages/discord/src/services/moderation-service.ts`                           | discord.js adapter: timeout, kick, ban, unban                 |
| `packages/discord/src/services/channel-moderation-service.ts`                   | discord.js adapter: slowmode, overwrites, bulk delete         |
| `packages/commands/src/namespace-command.ts`                                    | Builds one namespaced command from feature contributions      |
| `packages/commands/src/namespace-command.test.ts`                               | 7 tests, mostly construction-time failures                    |
| `apps/guardian/src/features/moderation/service.ts`                              | `ModerationActionService`                                     |
| `apps/guardian/src/features/moderation/case-service.ts`                         | `CaseService`                                                 |
| `apps/guardian/src/features/moderation/commands.ts`                             | 6 bare verbs, `/report`, 13 `/guardian` contributions         |
| `apps/guardian/src/features/moderation/messages.ts`                             | All moderation copy, in one place                             |
| `apps/guardian/src/features/moderation/index.ts`                                | Feature barrel                                                |
| `apps/guardian/src/features/moderation/{service,case-service,commands}.test.ts` | 80 tests                                                      |
| `apps/guardian/src/guardian.harness.ts`                                         | A whole Guardian in memory, shared by the command tests       |

### Changed (19)

`apps/guardian/src/{commands,deps,main}.ts` wire the feature in.
`packages/discord/src/bootstrap.ts` exposes the two new ports, capability-gated
the same way `roles` already was. `packages/testing/src/{fake-discord,fake-repositories}.ts`
gained the moderation fakes. The onboarding command module was refactored to
_contribute_ to `/guardian` rather than own it — see §3.

---

## 2. What the commands are

Six bare verbs: `/warn`, `/timeout`, `/untimeout`, `/kick`, `/ban`, `/purge`.
Plus `/report` for members, and thirteen subcommands under `/guardian` in three
groups: `case` (view, list, open, assign, status, note), `member` (history,
note, clear-warnings, unban) and `channel` (slowmode, lock, unlock).

The bare verbs are an exception to the platform's own namespacing rule, and the
line is drawn deliberately: **only incident-response verbs get a top-level
name.** These are typed while something is actively going wrong, and
`/guardian moderation timeout @user 10m` is four words of ceremony in front of
an urgent action. Review-time operations stay namespaced, which is why `/unban`
is `/guardian member unban` — nobody unbans anyone during an emergency.

`/ban` and `/purge` are Administrator-only; the rest are Moderator. Both are
effectively irreversible — a ban erases a presence, a purge destroys evidence —
so they take a second person.

`/report` requires no role at all. Someone part-way through onboarding is _more_
likely to be targeted, not less, and a reporting tool that excludes the newest
accounts excludes exactly the people who need it.

Full reference: `docs/reference/commands.md`.

---

## 3. The one architectural change

Phase 1's `/guardian` was a single command owned by the onboarding feature: a
hand-written spec plus a five-branch `if (group === … && sub === …)` chain.
Adding this phase's case, member and channel subcommands there would have
coupled moderation to onboarding and produced precisely the giant switch the
brief rules out.

So `/guardian` is no longer owned by anyone. Features export
`SubcommandContribution` values, and the new `namespaceCommand()` derives the
published Discord spec **and** the routing table from that one list.

Two consequences worth stating plainly. Adding a feature no longer means editing
another feature's file. And because the spec and the handler table come from the
same source, a subcommand cannot be published without a handler or handled
without being published — the failure mode there is "This interaction failed"
with nothing in the logs.

Three mistakes now fail at construction rather than in production: two features
claiming the same path (which one wins depends on array order, so it would work
on one machine and not another), a group with no description, and a group past
Discord's 25-subcommand limit — otherwise a 400 mid-deploy.

---

## 4. Decisions worth defending

**Discord first, database second.** Onboarding writes the database first;
moderation does the opposite. A record claiming a ban that never landed misleads
every moderator who reads it afterwards. A missing record for a ban that did
happen is recoverable from Discord's own audit log. Asymmetric costs, asymmetric
ordering.

**A warning is not its own table.** It is `moderation_actions` with
`action = 'warn'`, counted through a partial index on unrevoked rows. A parallel
`warnings` table would have duplicated the actor, reason, case link and
revocation columns, and left two places to look for "what has happened to this
member".

**Clearing warnings revokes, never deletes.** "Cleared" means "no longer
counts", not "never happened". The history a future moderator needs is exactly
what a delete would destroy.

**Unlock restores, it does not allow.** The obvious implementation — unlock sets
Send Messages to allowed — silently opens a channel that was restricted to a
role before the incident. That is a permission escalation disguised as a
convenience, and nothing else in the system would flag it. Unlock reads the
prior state from the lock's own record and falls back to `inherited`, never
`allowed`.

**Staff notes are not sent to the member.** A note is context — "this came up
before", "handled informally". Notifying turns every piece of context into a
confrontation, and people stop writing them.

**`case_id` is `ON DELETE SET NULL`; `reports.case_id` is `CASCADE`.** Deleting
a case must not delete the ban it produced — losing the action loses the
justification. A report's _content_, by contrast, has no meaning without its
case and no reason to outlive it.

**Report descriptions never leave the reports channel.** Audit rows carry the
case number and category only. A test asserts the description appears in neither
the audit trail nor the logs, and the fake audit repository was fixed so that
assertion is not vacuous (see §7).

---

## 5. Dependencies, env vars, migrations, permissions

**Dependencies added: none.** Phase 2 uses discord.js, postgres and zod exactly
as already pinned.

**Environment variables added: none.** `CHANNEL_REPORTS` and
`CHANNEL_MODERATION` were already declared in Phase 0. `CHANNEL_REPORTS` is now
actually read — if it is unset, reports are still stored and the reporter is
told plainly that staff were not alerted, rather than thanked for a report
nobody will read.

**Migration: `0005_moderation.sql`**, 427 lines. Five tables (`case_counters`,
`moderation_cases`, `case_events`, `moderation_actions`, `reports`) and five
enums. Applied cleanly to the live database; re-running is a no-op.

**Discord permissions added: none.** Guardian's invite integer is unchanged at
`1497064631510`. Every permission moderation needs was in the Phase 0 baseline,
so existing installs do not need re-inviting.

One decision was settled here that Phase 0 had deferred: `lock`/`unlock` use
**Manage Roles** (they edit a permission overwrite, which Guardian already holds
Manage Roles for), and only `slowmode` uses **Manage Channels** (a rate limit is
a channel property, not an overwrite). Manage Channels would have covered all
three; using the narrower permission for two of them keeps the blast radius of a
leaked token smaller. `docs/architecture/ARCHITECTURE-PLAN.md` said this decision
was deferred — that text has been corrected.

---

## 6. Tests

```
383 tests / 26 files          (all green)
367 without BLOOM_INTEGRATION_TESTS=1
Coverage 54.30% statements  (was 45.84% at Phase 1)
tsc --build          clean
tsc -p tsconfig.test clean
eslint               0 errors, 0 warnings
prettier             clean
```

New this phase: 80 feature tests, 20 target-protection tests, 7 namespace tests,
11 integration tests against live PostgreSQL.

The integration tests cover what fakes structurally cannot:

- **Twelve concurrent case opens** produce the numbers 1–12 with no duplicates
  and no unique-violation. Without `SELECT … FOR UPDATE` on the counter, two
  moderators opening a case in the same instant both read "next = 1" and one
  loses their work to an error they cannot act on.
- **The `RESOLVED`-requires-a-resolution CHECK** rejects a direct `UPDATE` that
  bypasses the service layer.
- **Deleting a case** leaves its `moderation_actions` rows behind with a null
  `case_id`.
- **The Postgres enums and the TypeScript unions contain exactly the same
  values.** These are two independent declarations of the same set and nothing
  makes them agree — adding a status in TypeScript without the migration
  compiles cleanly and fails on the first write that uses it. Reading `pg_enum`
  and comparing is the only check that closes that gap.

---

## 7. Defects found and fixed

Six, all surfaced by writing the tests rather than by reading the code.

1. **Moderation reasons were markdown-escaped on the way into the database.**
   The reason's destinations are exports, staff review and Discord's audit-log
   reason header — and that header is plain text, so `off-topic posting` would
   have been recorded forever as `off\-topic posting`. Escaping now happens at
   the render edge. The security package already documented this exact
   distinction; the moderation service had reached for the wrong helper.

2. **The staff rate limiter was the wrong shape.** A flat 3-second cooldown per
   action blocks exactly the burst it claimed to allow — clearing a raid is six
   kicks in ten seconds — while barely inconveniencing an automated abuser,
   which can pace itself. Replaced with a token bucket: 10 rapid actions, then
   one per two seconds. A test asserts both halves, because a test that only
   checked "the eleventh is refused" would pass on the broken version.

3. **`FakeAuditRepository.listRecent()` returned a hard-coded `[]`.** That made
   every "this must never reach the audit trail" assertion vacuously true — the
   test passes, the guarantee is untested, the leak ships. The fake now reads
   back what was appended, and the privacy test asserts the trail is non-empty
   before asserting what is absent.

4. **Report message links from another server were stored as local
   references.** Discord links carry their origin guild; the parser was
   discarding it. Staff would click through to a channel Bloom cannot see.
   `parseMessageLink` now returns the guild id and `/report` refuses a
   cross-guild link.

5. **`sanitiseForDisplay`'s `maxLength` was inferred as the literal `4096`** —
   `DISCORD_LIMITS` is `as const`, so the default fixed the parameter's type and
   the function could never be called with any other budget.

6. **Four copy sites double-printed a count**, because `pluralise()` already
   includes it: "Cleared 1 1 warning for @member".

---

## 8. Known limitations

**Still no live Discord connection.** `discord.com` is unreachable from this
environment, so no gateway login, no command registration, and no real
interaction has been executed. The discord.js adapters are compiled and
type-checked against discord.js 14.27 but have never round-tripped a real API
response. This is the single largest untested surface and has been true since
Phase 0.

**The adapters have almost no coverage** (`moderation-service.ts` 4%,
`channel-moderation-service.ts` 1.5%) for the same reason — they are thin
translation layers over discord.js whose logic only executes against a real
client. The behaviour that _can_ be tested without one (the 28-day cap, the
21,600-second slowmode cap, banning by id, the 14-day bulk-delete shortfall) is
modelled in the fakes and asserted through them.

**No context menus.** "Report message" and "Report member" would be better
ergonomics than pasting a link. `/report` accepts a message link in the
meantime, which covers the need with one extra paste.

**Cases are messages, not threads.** Guardian holds the thread permissions and
does not yet use them. Kept in the invite so adding threads later does not
require re-inviting every install.

**No automated escalation.** Three warnings does not automatically time anyone
out. A ladder is easy to build and easy to get wrong, and an auto-timeout firing
on a miscounted warning is worse than a moderator deciding. The counts are
there; the policy is not, on purpose.

**No anti-spam yet.** Listed under Guardian in the brief and not built here.
It needs message-rate observation, which is a different shape of work
(gateway events, not commands) and belongs with the scheduler phase.

**`/guardian onboarding reset`** is still unimplemented — deferred to Phase 3
with the rest of the administrative surface.

**Purge cannot remove messages older than 14 days.** Discord's bulk-delete API
refuses them. The command reports the real shortfall rather than silently
deleting fewer than asked.

---

## 9. Exact next step

**Phase 3: the scheduler and Companion's foundation.**

Concretely, the first piece of work is the central locked job scheduler —
`packages/events` already has the croner-based skeleton and `job_runs` already
has the lock columns, but nothing schedules anything yet. It is a prerequisite
for every Companion feature (daily check-in prompts, streak rollover, milestone
sweeps) and for Guardian's own timeout-expiry reconciliation, so it is the
right thing to build before any of them.

The gate for starting: nothing. Phase 2 is complete and green.

The gate for _finishing_ Phase 3, and the thing worth flagging now: the
scheduler is the first component whose correctness genuinely depends on
multi-process behaviour, so it needs integration tests with two concurrent
workers competing for the same job lock — the same treatment the case counter
got here.
