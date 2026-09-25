# Command reference

**Phase 0 registers no commands.** This document is the plan the command
contract was built to support, and it is what the registrar will publish as each
phase lands. Nothing here is live yet; the platform does not pretend otherwise.

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

| Command            | Policy       | Description                                    | Phase |
| ------------------ | ------------ | ---------------------------------------------- | :---: |
| `/verify`          | any member   | Begin or resume onboarding                     |   1   |
| `/report`          | Bloom Member | Report a member or message to staff, privately |   2   |
| `/guardian status` | any member   | Your own onboarding state                      |   1   |

### Staff

| Command                                 | Policy        | Description                          | Phase |
| --------------------------------------- | ------------- | ------------------------------------ | :---: |
| `/warn <member> <reason>`               | Moderator     | Record a warning                     |   2   |
| `/warnings <member>`                    | Moderator     | List a member's warnings             |   2   |
| `/timeout <member> <duration> <reason>` | Moderator     | Apply a Discord timeout (max 28d)    |   2   |
| `/untimeout <member>`                   | Moderator     | Lift a timeout                       |   2   |
| `/kick <member> <reason>`               | Moderator     | Remove a member                      |   2   |
| `/ban <member> <reason> [delete-days]`  | Administrator | Ban                                  |   2   |
| `/unban <user-id> <reason>`             | Administrator | Lift a ban                           |   2   |
| `/purge <count> [member]`               | Administrator | Bulk-delete recent messages          |   2   |
| `/slowmode <seconds>`                   | Moderator     | Set channel rate limit               |   2   |
| `/lock` / `/unlock`                     | Moderator     | Lock a channel during an incident    |   2   |
| `/guardian case view <id>`              | Moderator     | Case detail                          |   2   |
| `/guardian case assign <id> <member>`   | Moderator     | Take ownership                       |   2   |
| `/guardian case resolve <id> <outcome>` | Moderator     | Close a case                         |   2   |
| `/guardian note add <member> <note>`    | Moderator     | Private mod note                     |   2   |
| `/guardian roles audit`                 | Administrator | Re-run the hierarchy audit on demand |   1   |
| `/guardian onboarding reset <member>`   | Administrator | Reset someone's onboarding           |   1   |

### Context menus

| Entry               | Target  | Policy       | Phase |
| ------------------- | ------- | ------------ | :---: |
| Report message      | message | Bloom Member |   2   |
| Report member       | user    | Bloom Member |   2   |
| View member history | user    | Moderator    |   2   |

---

## BLOOM COMPANION

| Command                                             | Policy        | Description                          | Phase |
| --------------------------------------------------- | ------------- | ------------------------------------ | :---: |
| `/checkin`                                          | Bloom Member  | Daily check-in                       |   3   |
| `/win <description>`                                | Bloom Member  | Share a small win                    |   3   |
| `/companion profile [member]`                       | Bloom Member  | Points, rank, streak                 |   3   |
| `/companion rank`                                   | Bloom Member  | Your rank and what is next           |   3   |
| `/companion leaderboard`                            | Bloom Member  | Top members this period              |   3   |
| `/companion milestones`                             | Bloom Member  | Milestones reached                   |   3   |
| `/challenge list`                                   | Bloom Member  | Active challenges                    |   4   |
| `/challenge join <id>`                              | Bloom Member  | Join one                             |   4   |
| `/companion admin award <member> <points> <reason>` | Administrator | Manual award, always audited         |   3   |
| `/companion admin schedule`                         | Administrator | Inspect and toggle scheduled prompts |   4   |

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
