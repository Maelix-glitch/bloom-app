# Phase 7 — Bloom Labs: feedback and bug intake

The third bot comes online.

Labs has spent six phases refusing to start, because a bot with no commands that
sits in the member list looking available is a lie told by a green dot. This
phase gives it the smallest surface that is honestly useful: a member can tell
the team something, a member can report something broken, and staff can move
that report through triage where everyone can see what happened to it.

It does **not** give Labs cohorts, voting, feature status or release notes. That
is stated up front rather than buried, and the reasoning is in
[What was not built](#what-was-not-built).

---

## What was built

| Command                                         | Policy       | What it does                        |
| ----------------------------------------------- | ------------ | ----------------------------------- |
| `/feedback <category>`                          | Bloom Member | Opens a modal; records and posts it |
| `/labs bug report <area>`                       | Bloom Member | Opens a modal; files a numbered bug |
| `/labs bug show <number>`                       | Bloom Member | The bug, its status, its history    |
| `/labs bug queue [status]`                      | Moderator    | What is still waiting on someone    |
| `/labs admin triage <number> <status> [reason]` | Moderator    | Moves a bug, once, with a reason    |

Behind them: migration `0008_labs.sql` (four tables and an enum), a
`PostgresLabsRepository`, an intake service, and a new piece of shared
infrastructure — typed custom ids and an interaction dispatcher — that the
modals needed and the other two bots will inherit.

---

## Four decisions worth defending

### Escaping moved out of the store

The first real finding of the phase, and it was not in Labs.

`sanitiseUserText()` strips control characters, neutralises mentions **and**
escapes markdown. Guardian and Companion pass member text straight into a
Discord payload, so a single function doing all three was correct for them.
Labs is the first bot that _stores_ the text — and it was storing
`The check\-in reminder arrives too late`.

That is wrong in three directions at once. The row is corrupt for anything that
is not Discord: an export, a support query, a future web view. The backslash
count grows every time the value makes another round trip. And the database
stops being able to answer "did anyone else report this", because the stored
form no longer matches what anyone would search for.

So the two jobs were split. `storableUserText(input, max)` — strip control
characters, trim, truncate — guards every write. `forDiscord()` in
`features/intake/messages.ts` applies `escapeMarkdown(neutraliseMentions(...))`
at the moment a payload is composed, and nowhere else. Two tests pin the split:
one asserts the stored value is byte-identical to what was typed while the
rendered embed contains `The \*\*check\-in\*\* reminder`, the other asserts
`@everyone` never survives into a rendered message.

The general rule, now written down: **escaping belongs to the renderer**. A
value that has been escaped for one output format is no longer the value.

### Modals mean a command cannot always defer

Deferring is the standard answer to Discord's three-second acknowledgement
budget, and until this phase every Bloom command that touched the database
deferred. Modals break that: a modal may only be an interaction's _initial_
response, so a deferred interaction can never open one.

The fix was not a special case in Labs. `BloomCommand.defer` became
`boolean | ((invocation) => boolean)`, resolved everywhere through one helper —
`shouldDefer(command, invocation)` — so the dispatcher, the tests and any future
bot all ask the same question the same way. `/labs bug report` defers for
`show` and `queue` and does not defer for `report`; `/feedback` never defers.

A test asserts that every branch which opens a modal has `shouldDefer` returning
false, because the failure mode is a member pressing a command and getting
nothing — an interaction that was acknowledged the wrong way cannot be rescued.

### Custom ids are parsed, never trusted

A modal submission arrives carrying a string the client sent back. Routing on it
naively is how a bot ends up executing whatever a crafted id asks for.

`bot:feature:action[:argument]`, each segment `^[a-z][a-z0-9_-]{0,30}$`,
argument ≤60 characters with no colon, total ≤100 (Discord's own cap).
`parseCustomId` **returns `null` rather than throwing** for anything that does
not fit, because the input is hostile by definition and an exception on every
malformed id is a log-flooding vector.

`InteractionDispatcher` then:

- refuses duplicate routes and foreign-`bot` handlers **at construction**, so a
  misrouted handler is a startup crash, not a production surprise;
- silently ignores ids for other bots — all three Bloom apps see every
  component interaction in the server, and replying to someone else's button
  would mean interrupting an interaction this bot has no part in;
- replies "this is from an older version of the message" for an unmatched id
  addressed to _this_ bot, and logs `interaction.unknown_route`;
- **re-runs the authorisation policy on submit.** The policy ran when the modal
  was opened, but a member can lose a role in the seconds a form is open, and
  the submission is a separate request. Trusting the earlier check is trusting
  the client.

### Announcing is allowed to fail; recording is not

The order is fixed: record, then announce, then attach the message id. A member
who typed three paragraphs of reproduction steps must not lose them because
`CHANNEL_BUG_REPORTS` was never set, or because the bot lacks Send Messages
there.

`announce()` returns `MessageId | null` and logs `intake.channel_unset` or
`intake.announce_failed`. The submission succeeds either way, and the member is
told it was recorded. `message_id` is nullable in the schema for exactly this
reason — "no channel configured" is a real state, not an error to swallow.

This is the inverse of the rule Phase 5 established for points, and both follow
from the same principle: **claim the effect that cannot be redone, before
performing the effect that can be retried.**

---

## The database

Four objects, in `0008_labs.sql`, applied as version 8.

**`feedback`** deliberately has no status column. A status implies somebody is
obliged to move it, and an inbox where every row reads `NEW` a year later is a
public promise the team never made. Feedback is recorded, posted, and dealt with
by humans.

**`bug_counters`** reuses the allocator from `case_counters` —
`ON CONFLICT DO UPDATE … RETURNING next_number - 1` — so ten concurrent filings
get ten distinct numbers from one statement under Postgres' own row lock. A
separate counter from cases on purpose: bug 12 and case 12 are different things
people quote at each other.

**`bug_reports`** carries four CHECKs that encode rules the application must not
be the only place to know: a terminal status requires a non-blank resolution,
anything not `NEW` records who moved it, `status = 'DUPLICATE'` **iff**
`duplicate_of IS NOT NULL`, and a bug cannot duplicate itself.

**`bug_events`** is append-only. `bug_reports.status` is where a bug is; this is
how it got there — the question actually asked when a member says their report
was dismissed. The bug and its first event are written in one transaction, so
"a bug with no history" is not a reachable state.

Full detail: [`docs/reference/database-schema.md`](reference/database-schema.md).

---

## Tests

**666 passing across 42 files**, up from 568 across 37. Phase 7 added 98.

| File                                                   | Tests | Covers                                            |
| ------------------------------------------------------ | :---: | ------------------------------------------------- |
| `apps/labs/src/features/intake/intake.test.ts`         |  38   | Both flows end to end, limits, triage, rendering  |
| `packages/database/.../labs.integration.test.ts`       |  23   | Real Postgres: CHECKs, concurrency, locking       |
| `packages/commands/src/interaction-dispatcher.test.ts` |  13   | Routing, policy re-check, foreign ids             |
| `packages/commands/src/custom-id.test.ts`              |  12   | Parse/format round trip, rejection, length caps   |
| `apps/labs/src/commands.test.ts`                       |   6   | Registration, namespace, modal-route completeness |

Two of these earn their keep by being mutation-tested — the claims they make are
about Postgres, not about TypeScript, so the only proof is breaking the SQL:

- replacing the counter row with `SELECT max(bug_number) + 1` makes **ten
  concurrent filings** fail;
- removing `FOR UPDATE` from `triage` makes **two racing triages** produce two
  transitions.

Both were run, both failed as required, both were restored.

`apps/labs/src/commands.test.ts` asserts something a reviewer cannot hold in
their head: **every modal id the bot is capable of opening has a matching route
in `intakeModalHandlers`**. A modal with no handler is a form a member fills in
and submits into silence, and it is exactly the kind of thing that survives code
review.

---

## What was not built

Phase 7 was specified as Labs in full. It shipped intake only. The rest is
absent rather than stubbed, because a `/labs vote` that records a vote nothing
counts is worse than its absence:

| Deferred                          | What it needs first                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Cohorts (`join`/`leave`/`create`) | A cohorts table, and a staff answer on channel access                                                                                      |
| Voting                            | The candidate list `feature status` would read                                                                                             |
| Feature status                    | A pipeline table; there is no source of truth to report from                                                                               |
| Release notes                     | Notes are written by hand today; a command implies a feed                                                                                  |
| `/labs admin experiment start`    | **Recommended for deletion** — an experiment with no measurement is an announcement, and `#development-updates` already does announcements |

---

## Known limitations

1. **Still never connected to Discord.** `discord.com` is unreachable from this
   environment, so the modal round trip — open, submit, route — has been proven
   against the fakes and the dispatcher, not against the live API. This is the
   largest untested surface in the platform and has been since Phase 0.
2. **Bug numbers are per guild, and Bloom runs one guild.** The scoping is
   right, but it has only ever been exercised against a single configured guild
   plus an isolation test.
3. **No expiry on member-authored text.** `feedback` and `bug_reports` hold
   prose indefinitely, cascading only on guild deletion. How long a defect stays
   useful is a product decision; guessing at it in a migration would be worse
   than leaving it explicit.
4. **No attachments.** The modal collects text only. A screenshot goes in the
   channel thread, where the member still controls it.
5. **`/labs bug queue` has no pagination.** It returns the open set, which is
   small by construction. It will need paging before it needs anything else.
6. **The two economies are still unreconciled** — the Discord nine-rank ladder
   and the Bloom app's twelve ranks with seasons. Flagged in Phase 5, flagged
   again in Phase 6, unchanged here. It is a product decision, and it is the one
   open question that will get more expensive the longer it waits.

---

## Verification

```
pnpm exec prettier --check .                                   # clean
pnpm exec eslint .                                             # clean
pnpm exec tsc --build && pnpm exec tsc -p tsconfig.test.json   # clean
BLOOM_INTEGRATION_TESTS=1 pnpm exec vitest run                 # 666 passed / 42 files
```

Command registration (`pnpm commands:register`) still cannot run here — it
requires a live token and a reachable `discord.com`.

---

## Next step

Reconcile the two rank economies, or state in writing that they are permanently
separate systems that happen to share a vocabulary. Every further reward,
milestone or Labs incentive built before that decision is another thing to
migrate afterwards.
