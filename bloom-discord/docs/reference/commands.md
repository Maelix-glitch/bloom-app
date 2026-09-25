# Command reference

**Live as of Phase 4: verification, onboarding, moderation, reports and cases,
scheduled work, and Companion's daily check-in prompt.**
Everything else in this document is planned, not built, and is marked with the
phase that delivers it.
The platform does not pretend otherwise — the registrar publishes only what the
dispatcher can actually route, and `apps/guardian/src/commands.test.ts` asserts
those two lists match.

## Namespacing

Three applications share one `/` autocomplete list. The brief asks for
namespacing without "eighty top-level commands", which means two tiers:

- **Bare verbs** for the handful of things members do constantly: `/verify`,
  `/checkin`, `/report`, `/feedback`.
- **Everything else** grouped under the owning bot: `/guardian …`,
  `/companion …`, `/labs …`, using subcommands and subcommand groups.

Ownership is declared in `RESERVED_TOP_LEVEL` and enforced at registration. Two
bots claiming `/report` would give members two identical entries with no way to
tell them apart, so it throws at startup instead.

Discord's limits shape this too: 100 top-level commands per application, but
only 25 subcommands per group.

## Authorization

Every command declares two separate things:

- **`defaultMemberPermissions`** — the Discord-side gate. Hides the command in
  the client. A server administrator can override it per role and per channel,
  so it is a UX affordance, never the security boundary.
- **`policy`** — the server-side decision, evaluated against the live roles on
  the signed interaction payload. This is the boundary.

`'none'` as the default member permission means "visible to nobody until an
administrator grants it", which is the right posture for staff commands, and is
not the same as omitting it.

---

## BLOOM GUARDIAN

### Member-facing

| Command   | Policy     | Description                                    |  Phase   |
| --------- | ---------- | ---------------------------------------------- | :------: |
| `/verify` | any member | Verify yourself; grants ✧ Early Bloom          | **1 ✅** |
| `/report` | any member | Report a member or message to staff, privately | **2 ✅** |

Neither carries a role requirement, and both are deliberate.

`/verify` cannot: an unverified member holds no Bloom role by definition, so
requiring one would make verification impossible.

`/report` deliberately does not require ❋ Bloom Member either. Someone part-way
through onboarding is _more_ likely to be targeted, not less, and a reporting
tool that excludes the newest accounts excludes exactly the people who need it.
It is instead rate limited to one report per member per 60 seconds — flooding
the staff queue is itself a form of abuse.

`/verify` is limited to one attempt per member per 30 seconds. Both budgets are
database-backed, so they are shared across processes and survive a restart.

### Incident response

Six bare verbs, against the general rule that everything staff-facing lives
under `/guardian`. The exception is narrow and deliberate: these are the
commands typed while something is actively going wrong, and `/guardian moderation
timeout @user 10m` is four words of ceremony in front of an urgent action.
Review-time operations stay namespaced, which is why `/unban` is
`/guardian member unban` — nobody unbans anyone during an emergency.

| Command                                        | Policy        | Description                           |  Phase   |
| ---------------------------------------------- | ------------- | ------------------------------------- | :------: |
| `/warn <member> <reason> [case]`               | Moderator     | Record a warning; DMs the member      | **2 ✅** |
| `/timeout <member> <duration> <reason> [case]` | Moderator     | Discord timeout, max 28 days          | **2 ✅** |
| `/untimeout <member> <reason>`                 | Moderator     | Lift a timeout                        | **2 ✅** |
| `/kick <member> <reason> [case]`               | Moderator     | Remove a member                       | **2 ✅** |
| `/ban <member> <reason> [delete-hours] [case]` | Administrator | Ban, including users not in the guild | **2 ✅** |
| `/purge <count> [member] <reason>`             | Administrator | Bulk-delete recent messages           | **2 ✅** |

`/ban` and `/purge` sit above the moderator line. Both are effectively
irreversible — a ban erases someone's presence, a purge destroys evidence — so
they take a second person. That is a deliberate speed bump, not an oversight.

`duration` accepts `10m`, `2h`, `7d`. Anything Discord will not accept, and
anything over its 28-day maximum, is refused with the reason rather than passed
through to become a raw API error.

### Cases and review

| Command                                             | Policy    | Description                       |  Phase   |
| --------------------------------------------------- | --------- | --------------------------------- | :------: |
| `/guardian case view <number>`                      | Moderator | Full case, with its history       | **2 ✅** |
| `/guardian case list [status]`                      | Moderator | The queue, escalated first        | **2 ✅** |
| `/guardian case open <summary> [member]`            | Moderator | Open a case directly              | **2 ✅** |
| `/guardian case assign <number> [member]`           | Moderator | Take or hand over ownership       | **2 ✅** |
| `/guardian case status <number> <status> [note]`    | Moderator | Move a case through its states    | **2 ✅** |
| `/guardian case note <number> <note>`               | Moderator | Append to the case history        | **2 ✅** |
| `/guardian member history <member>`                 | Moderator | A member's full moderation record | **2 ✅** |
| `/guardian member note <member> <note>`             | Moderator | Private staff note; no DM sent    | **2 ✅** |
| `/guardian member clear-warnings <member> <reason>` | Moderator | Revoke active warnings            | **2 ✅** |
| `/guardian member unban <user-id> <reason>`         | Moderator | Lift a ban                        | **2 ✅** |
| `/guardian channel slowmode <seconds> [channel]`    | Moderator | Set a channel rate limit          | **2 ✅** |
| `/guardian channel lock [channel] <reason>`         | Moderator | Lock a channel during an incident | **2 ✅** |
| `/guardian channel unlock [channel] <reason>`       | Moderator | Restore the prior permission      | **2 ✅** |

Case statuses are `OPEN → IN_REVIEW → ESCALATED → RESOLVED → CLOSED`. RESOLVED
and CLOSED are terminal; a case cannot be quietly reopened, because a case
resolved twice with two different outcomes has no answer to "what did we
decide". `RESOLVED` requires an outcome — the database enforces it with a CHECK
constraint, and the command passes the moderator's note through so it is typed
once.

`unlock` restores the permission the channel had _before_ the lock, read from
the lock's own record. The obvious implementation — unlock means "allow" —
would silently open a channel that was previously restricted to a role.

A staff note is deliberately not sent to the member. A note is context ("this
came up before", "handled informally"), and notifying would turn every piece of
context into a confrontation, which stops people writing them.

### Onboarding

| Command                                  | Policy        | Description                          |  Phase   |
| ---------------------------------------- | ------------- | ------------------------------------ | :------: |
| `/guardian status [member]`              | Moderator     | A member's onboarding state          | **1 ✅** |
| `/guardian overview`                     | Moderator     | Counts per onboarding state          | **1 ✅** |
| `/guardian onboarding complete <member>` | Moderator     | Move ✧ Early Bloom → ❋ Bloom Member  | **1 ✅** |
| `/guardian onboarding history <member>`  | Moderator     | A member's lifecycle history         | **1 ✅** |
| `/guardian roles audit`                  | Moderator     | Re-run the hierarchy audit on demand | **1 ✅** |
| `/guardian onboarding reset <member>`    | Administrator | Reset someone's onboarding           |    3     |

### Scheduled work

| Command                        | Policy            | Description                                   |  Phase   |
| ------------------------------ | ----------------- | --------------------------------------------- | :------: |
| `/guardian jobs list`          | Moderator         | Every registered job, its schedule, next run  | **3 ✅** |
| `/guardian jobs history <job>` | Moderator         | The last recorded runs, including the failure | **3 ✅** |
| `/guardian jobs run <job>`     | **Administrator** | Run a job now, without waiting for its cron   | **3 ✅** |
| `/guardian jobs enable <job>`  | **Administrator** | Switch a job on for this server               | **4 ✅** |
| `/guardian jobs disable <job>` | **Administrator** | Switch a job off for this server              | **4 ✅** |

This whole group is shared. It is defined once in `@bloom/discord` and mounted by
every bot that runs jobs, so `/companion jobs list` is the same code with a
different container — the brief's "no duplicated code between bots" applied to
the surface most likely to be copy-pasted. Each mount only ever sees its own
bot's scheduler and its own bot's settings rows.

`jobs list` reads the live scheduler, and `jobs history` reads the `job_runs`
table rather than process memory — after a deployment the scheduler has no
recollection of yesterday, and a command that answered "never run" for a job
that has run daily for a year would be worse than having no command.

`jobs run` is the one `/guardian` branch that demands more than Moderator.
Triggering a job can make the bot post publicly on demand, which is an
administrative capability rather than a moderation one. It bypasses the cron
schedule but **not** the lock and **not** the job's own duplicate suppression:
triggering the stale-case digest twice in one morning still posts once.

`enable` and `disable` write a per-server switch that the scheduler re-reads on
every tick, so a disable takes effect at the next run rather than the next
deployment. Both are audited at **warn** severity: switching off a community's
daily prompt is invisible until someone notices the silence, and the record of
who did it should outlive the memory of it.

`enable` reports honestly when it cannot deliver what was asked. If the process
has `FEATURE_SCHEDULED_MESSAGES=false`, or the job is disabled by configuration
(typically an unset channel), the reply says the switch is on **and** that the
job still will not run. `jobs list` draws the same distinction, naming which of
the four layers is responsible rather than saying "disabled".

### How `/guardian` is assembled

`/guardian` is not owned by any one feature. Each feature exports a list of
subcommand _contributions_, and `namespaceCommand()` derives the published
Discord spec **and** the routing table from that single list. Onboarding brings
`status`, `overview`, `onboarding …` and `roles audit`; moderation brings
`case …`, `member …` and `channel …`.

This matters for two reasons. Adding a feature no longer means editing another
feature's file to add a branch to a growing `if (group === … && sub === …)`
chain. And because the spec and the handler table come from the same list, they
cannot drift — a subcommand cannot be published without a handler, or handled
without being published.

Three mistakes fail at construction rather than in production: two features
claiming the same path, a group with no description, and a group exceeding
Discord's 25-subcommand limit.

`/guardian` subcommands share one policy — Moderator or above — rather than
declaring a policy each. The failure mode of per-subcommand policies is the one
somebody forgets, so a new subcommand inherits the gate automatically.

A contribution may still declare its own `policy`, which is checked **after**
the namespace policy and can therefore only narrow it. `jobs run` is the first
use: Administrator inside a Moderator-gated namespace. The direction is the
safety property — a subcommand can demand more than its namespace, never less,
so the inherited gate cannot be accidentally opened. Discord has no
per-subcommand permission model, so the branch stays visible to anyone who can
see `/guardian` and refuses when invoked; as everywhere else here,
`defaultMemberPermissions` is a client hint and the server-side check is the
boundary.

`/guardian status` is Moderator-gated even when a member asks about themselves.
Members do not need it: `/verify` already tells them everything their own state
would.

### Context menus

| Entry               | Target  | Policy     | Phase |
| ------------------- | ------- | ---------- | :---: |
| Report message      | message | any member |   3   |
| Report member       | user    | any member |   3   |
| View member history | user    | Moderator  |   3   |

Not built. `/report` accepts a message link in the meantime, which covers the
same need with one extra paste. Context menus are the better ergonomics and are
worth doing, but they are additive rather than enabling.

---

## BLOOM COMPANION

Companion has exactly one top-level command. It holds no roles, no moderation,
and — as of Phase 4 — one scheduled surface.

### Built

| Command                         | Policy            | Description                                   |  Phase   |
| ------------------------------- | ----------------- | --------------------------------------------- | :------: |
| `/companion jobs list`          | Moderator         | Companion's jobs, schedules and next runs     | **4 ✅** |
| `/companion jobs history <job>` | Moderator         | The last recorded runs, including the failure | **4 ✅** |
| `/companion jobs run <job>`     | **Administrator** | Run a job now, without waiting for its cron   | **4 ✅** |
| `/companion jobs enable <job>`  | **Administrator** | Switch a job on for this server               | **4 ✅** |
| `/companion jobs disable <job>` | **Administrator** | Switch a job off for this server              | **4 ✅** |

The one job behind them is `companion.checkin.daily_prompt`: a short prompt
posted to `CHANNEL_DAILY_CHECK_IN` at 09:00 in `BLOOM_TIMEZONE`. It posts a
conversation starter and nothing else — **it does not record or reward a
check-in**, because nothing yet does. `/checkin` below is the command that will,
and it is not built.

### Planned

| Command                                             | Policy        | Description                  | Phase |
| --------------------------------------------------- | ------------- | ---------------------------- | :---: |
| `/checkin`                                          | Bloom Member  | Daily check-in               |   3   |
| `/win <description>`                                | Bloom Member  | Share a small win            |   3   |
| `/companion profile [member]`                       | Bloom Member  | Points, rank, streak         |   3   |
| `/companion rank`                                   | Bloom Member  | Your rank and what is next   |   3   |
| `/companion leaderboard`                            | Bloom Member  | Top members this period      |   3   |
| `/companion milestones`                             | Bloom Member  | Milestones reached           |   3   |
| `/challenge list`                                   | Bloom Member  | Active challenges            |   4   |
| `/challenge join <id>`                              | Bloom Member  | Join one                     |   4   |
| `/companion admin award <member> <points> <reason>` | Administrator | Manual award, always audited |   3   |

`/companion admin schedule` was planned here and has been **dropped**: the shared
`jobs` group does that job for every bot, and a second way to toggle the same
setting would eventually disagree with the first.

Leaderboards are period-scoped and show a small number of entries. An
all-time-ranked list of every member is a status game, not a wellbeing feature.

---

## BLOOM LABS

| Command                                | Policy        | Description                             | Phase |
| -------------------------------------- | ------------- | --------------------------------------- | :---: |
| `/feedback <summary>`                  | Bloom Member  | Submit feedback (opens a modal)         |   5   |
| `/labs bug report`                     | Bloom Member  | File a bug (modal, optional attachment) |   5   |
| `/labs feature status [name]`          | Bloom Member  | Where a feature is in the pipeline      |   5   |
| `/labs vote <feature>`                 | Beta Tester   | Vote on a candidate feature             |   5   |
| `/labs cohort join <id>`               | Beta Tester   | Join a testing cohort                   |   5   |
| `/labs cohort leave <id>`              | Beta Tester   | Leave one                               |   5   |
| `/labs release latest`                 | Bloom Member  | Latest release notes                    |   5   |
| `/labs admin cohort create <name>`     | Administrator | Open a cohort                           |   5   |
| `/labs admin experiment start <name>`  | Administrator | Start an experiment                     |   5   |
| `/labs admin triage <bug-id> <status>` | Moderator     | Move a bug through triage               |   5   |

Labs never grants `◌ Beta Tester`. `/labs cohort join` records cohort membership
in the database; channel access is a manual staff grant.

---

## Conventions

**Ephemeral by default.** Every response is visible only to the caller unless
the whole channel benefits. Bloom is explicitly not a noisy server, and staff
output is ephemeral regardless.

**Defer anything slow.** Discord's acknowledgement budget is three seconds and a
cold pooler connection can eat most of it.

**No message-prefix commands.** Slash commands, buttons, select menus, modals
and context menus only. That is also why `MessageContent` is not requested.

**Custom ids are namespaced**: `bot:feature:action[:arg]`, validated on the way
in, capped at Discord's 100 characters.

---

## Registration

```bash
pnpm commands:register --bot guardian --dry-run   # show the diff
pnpm commands:register --bot guardian             # apply
pnpm commands:register --bot all                  # all three
```

Registration is a bulk overwrite (`PUT`), so running it twice is
indistinguishable from running it once — duplicates cannot accumulate. The
registrar diffs first, so an unchanged deploy sends nothing.

It **refuses to publish an empty command set** unless `--allow-empty` is passed.
An empty bulk overwrite is a valid request that deletes every command the
application has — exactly what happens if a registry fails to load, and
indistinguishable from success until members notice everything is gone.

Global registration in production additionally requires `--force`.
