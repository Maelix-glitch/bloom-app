# Phase 1 report — Guardian: verification and onboarding

**Scope delivered:** the `@everyone → ✧ Early Bloom → ❋ Bloom Member` role
lifecycle, end to end, owned exclusively by Bloom Guardian.

Phase 0 built a platform that could not do anything. Phase 1 makes it do one
thing properly. No moderation, no cases, no rewards, no cohorts — those are
Phases 2, 3 and 5, and nothing here pretends otherwise.

---

## 1. What a member experiences

1. They join. Guardian records the member, sets `onboarding_state = unverified`,
   and writes an audit row. No role is granted and no message is sent yet — a
   join is not consent.
2. They run `/verify`. Guardian moves them to `early_bloom` in the database,
   then grants **✧ Early Bloom** in Discord, then replies ephemerally with what
   to do next.
3. A moderator runs `/guardian onboarding complete @member`. Guardian moves them
   to `bloom_member`, grants **❋ Bloom Member**, removes **✧ Early Bloom**.

Early Bloom is an _onboarding state_, not early access. A member sitting in it
is mid-flow, not privileged, and `/guardian overview` exists so staff can see
how many people are stuck there.

---

## 2. Files created and changed

**38 files changed, 4,652 insertions, 78 deletions** against the Phase 0 commit
(`23f12ea`). 19 new source files totalling ~3,990 lines.

### New — feature code

| File                                                | Lines | Purpose                                                   |
| --------------------------------------------------- | ----: | --------------------------------------------------------- |
| `apps/guardian/src/features/onboarding/service.ts`  |   491 | All lifecycle logic. No discord.js, no interaction types. |
| `apps/guardian/src/features/onboarding/commands.ts` |   426 | `/verify` and the five `/guardian` subcommands.           |
| `apps/guardian/src/features/onboarding/messages.ts` |   183 | Every user-visible string, in one file.                   |
| `apps/guardian/src/features/onboarding/handlers.ts` |    72 | `guildMemberAdd` / `guildMemberRemove`.                   |
| `apps/guardian/src/features/onboarding/index.ts`    |    10 | Feature barrel.                                           |
| `apps/guardian/src/commands.ts`                     |    30 | The registration surface the registrar publishes.         |
| `apps/guardian/src/deps.ts`                         |    33 | Dependency container for the Guardian process.            |

### New — platform

| File                                               | Lines | Purpose                                             |
| -------------------------------------------------- | ----: | --------------------------------------------------- |
| `database/migrations/0004_onboarding.sql`          |   140 | `onboarding_transitions`, `verification_attempts`.  |
| `packages/database/src/repositories/onboarding.ts` |   346 | Atomic transitions, history, attempt counts.        |
| `packages/discord/src/adapters/member.ts`          |    81 | `GuildMember` → `MemberSnapshot`.                   |
| `packages/discord/src/client.ts`                   |    32 | The one place `new Client()` is called.             |
| `packages/discord/src/telemetry.ts`                |    49 | Bridges `CommandTelemetry` to the repository.       |
| `packages/events/src/payloads.ts`                  |    71 | Typed gateway payloads, incl. `snowflakeCreatedAt`. |
| `packages/testing/src/fake-repositories.ts`        |   478 | In-memory repositories with the real semantics.     |

### New — tests

| File                                                                | Tests |
| ------------------------------------------------------------------- | ----: |
| `apps/guardian/src/features/onboarding/service.test.ts`             |    20 |
| `apps/guardian/src/features/onboarding/commands.test.ts`            |    17 |
| `apps/guardian/src/features/onboarding/handlers.test.ts`            |     7 |
| `apps/guardian/src/commands.test.ts`                                |     5 |
| `packages/events/src/payloads.test.ts`                              |     4 |
| `packages/database/src/repositories/onboarding.integration.test.ts` |    11 |

### Changed

`apps/*/src/main.ts` (all three, migrated to the new runtime), `bootstrap.ts`,
`runtime.ts`, `shared-types/src/onboarding.ts`, `scripts/register-commands`,
`vitest.config.ts`, `package.json`, four barrels, two docs.

---

## 3. Design decisions worth defending

### Database first, Discord second

`service.ts` writes the state transition and commits **before** it calls
Discord. The two orderings fail differently:

- Discord first: the role is granted, then the write fails. The member has the
  role, the database says they do not, and nothing will ever reconcile it
  because no record of the attempt exists.
- Database first: the row is committed, then the role grant fails. The member is
  `early_bloom` without the role — visible in `/guardian overview`, repairable
  by re-running, and recorded.

The second is recoverable. The first is silent corruption, so the order is not
arbitrary.

### `transition()` returns a result, it does not throw

Races here are ordinary, not exceptional. A member double-clicks; a moderator
completes onboarding a half-second after `/verify` lands. The repository does
the test-and-set in a single `UPDATE … WHERE onboarding_state = expectedFrom`
and reports what happened:

| Result             | Handling                                                     |
| ------------------ | ------------------------------------------------------------ |
| `applied`          | Grant the role, audit, reply.                                |
| `already_in_state` | Reply as if it had succeeded. It did, just not in this call. |
| `conflict`         | Tell the caller the state moved; do not force it.            |
| `member_missing`   | `MEMBER_NOT_FOUND`.                                          |

An _illegal_ edge is a different thing — a bug in the caller, not a race — and
throws `INVALID_INPUT`. The integration suite proves the distinction: two
concurrent `transition()` calls on one member yield exactly one `applied` and
one `already_in_state`, never two.

### Event dedupe uses cooldowns, not the idempotency table

`idempotency_keys.expires_at` defaults to `now() + 30 days` and ignores the
caller's TTL. Deduping `guildMemberAdd` through it would suppress a _legitimate_
rejoin weeks later as a duplicate. `CooldownRepository.tryAcquire` is equally
atomic and honours the supplied TTL, so it is what `main.ts` uses.

### `/verify` requires no role

An unverified member holds no Bloom role by definition, so any role requirement
would make verification unreachable. The gate is a durable rate limit instead:
one attempt per member per 30 seconds, shared across processes and surviving
restarts.

### One policy for the whole `/guardian` namespace

Every `/guardian` subcommand is gated by `allOf(requireModerator())` at the
command level rather than per subcommand. The failure mode of per-subcommand
policies is the one somebody forgets; inheritance makes the safe thing the
default.

`defaultMemberPermissions: 'none'` is set as well, but it is a client-side
affordance that an administrator can override per role and per channel. The
policy is the boundary. Both exist; only one is trusted.

---

## 4. Dependencies added

**None.** Phase 1 adds no runtime or dev dependency. The only `package.json`
change is that the workspace root now lists the `@bloom/*` packages as
`workspace:*` devDependencies — see §8.

---

## 5. Environment variables required

**No new variables.** Phase 1 uses what Phase 0 already validates. The ones it
actually reads:

| Variable                                               | Used for                         |
| ------------------------------------------------------ | -------------------------------- |
| `DISCORD_GUARDIAN_TOKEN`, `DISCORD_GUARDIAN_CLIENT_ID` | Gateway and registration         |
| `DISCORD_GUILD_ID`                                     | Guild scoping                    |
| `ROLE_EARLY_BLOOM`, `ROLE_BLOOM_MEMBER`                | The two roles Guardian may write |
| `ROLE_MODERATOR`, `ROLE_ADMINISTRATOR`, `ROLE_FOUNDER` | Authorization policies           |
| `ROLE_BLOOM_BOT`                                       | Hierarchy audit                  |
| `DATABASE_URL`                                         | All persistence                  |

---

## 6. Migrations

One: **`0004_onboarding.sql`**.

- `onboarding_transitions` — append-only lifecycle history. Composite FK
  `(guild_id, user_id) → guild_members`, `ON DELETE CASCADE`. Indexed on
  `(guild_id, user_id, created_at DESC)` and on `to_state`.
- `verification_attempts` — every `/verify`, successful or not, with outcome.
  Separate from `command_telemetry` because it answers a moderation question and
  outlives telemetry retention.

Applied to a live PostgreSQL 18.4 instance: applies from empty, re-runs as a
no-op, drift guard confirmed by editing an applied file and watching the
migrator refuse.

---

## 7. Commands added

| Command                                  | Policy    | Live |
| ---------------------------------------- | --------- | :--: |
| `/verify`                                | anyone    |  ✅  |
| `/guardian status [member]`              | Moderator |  ✅  |
| `/guardian overview`                     | Moderator |  ✅  |
| `/guardian onboarding complete <member>` | Moderator |  ✅  |
| `/guardian onboarding history <member>`  | Moderator |  ✅  |
| `/guardian roles audit`                  | Moderator |  ✅  |

`apps/guardian/src/commands.test.ts` asserts the registry and the published
specs agree, so a command cannot be registered without a handler or handled
without being registered.

**Discord permissions required:** unchanged from Phase 0. Guardian's integer
stays **`1497064631510`**; the lifecycle needs `MANAGE_ROLES` (1 << 28), which
Guardian already had and the other two bots still do not. Intents unchanged:
Guilds + GuildMembers (privileged) + GuildModeration.

---

## 8. Two real defects found by running the code

Both were invisible to `tsc`, ESLint and the unit suite, and surfaced only by
executing the binaries.

**`pnpm commands:register` could not start.** `ERR_MODULE_NOT_FOUND` on
`@bloom/shared-types`. Entry points under `scripts/` resolve from the workspace
root, which declared no dependencies. The `db:*` scripts worked by accident —
they live inside `packages/database`, which does. Fixed by adding the `@bloom/*`
packages to the root `devDependencies` as `workspace:*`.

**Coverage never measured `apps/`.** `include` was `packages/*/src/**/*.ts`, so
every line of Phase 1 feature code was outside the report. Fixed; composition
roots (`main.ts`, `deps.ts`) stay excluded because they are constructor lists
with no branches, verified by starting the process rather than by unit tests.

---

## 9. Tests and gates

| Gate                        | Result                                         |
| --------------------------- | ---------------------------------------------- |
| `tsc --build --force`       | clean                                          |
| `tsc -p tsconfig.test.json` | clean                                          |
| `eslint .`                  | **0 errors, 0 warnings**                       |
| `prettier --check .`        | clean                                          |
| `vitest run`                | **252 passing / 19 files** (Phase 0: 199 / 14) |
| `vitest run` + integration  | **263 passing / 20 files**                     |
| `diagnostics`               | 8 passed, 1 warning, 0 failures                |

Six ESLint errors were found and fixed individually rather than with `--fix`:
`no-meaningless-void-operator` and `no-unnecessary-type-conversion` were both
pointing at real redundancy, not style.

**Coverage: 45.84% statements overall** (Phase 0: 42.48%), but the aggregate is
the wrong number to read. Phase 1 code specifically:

| Area                              | Stmts |
| --------------------------------- | ----: |
| `apps/guardian/src/commands.ts`   |  100% |
| `features/onboarding/handlers.ts` |  100% |
| `features/onboarding/service.ts`  | 87.1% |
| `features/onboarding/messages.ts` |   80% |
| `features/onboarding/commands.ts` | 77.6% |
| `packages/events/src/payloads.ts` |  100% |

The aggregate stays low because the repositories, gateway runtime and Discord
services are integration-tested or not yet reachable without a token, and they
are large. `repositories/onboarding.ts` reads 0% in the default run and is
covered by 11 integration tests that the default run excludes.

### What the tests actually exercise

Command tests route through the **real** `CommandDispatcher`, so authorization
is genuinely evaluated — a member and a Beta Tester are refused, a moderator is
allowed. Handler tests route through the **real** `EventDispatcher`, covering
join dedupe on replay, a genuine rejoin re-running, bots skipped, one handler's
failure not taking down the others, and cross-bot registration rejected.

One test was written and then deleted: an assertion that the BigInt snowflake
decoder _differs_ from a naive `Number()` implementation. For the sample id the
float path happened to land on the same millisecond, so the test passed for the
wrong reason. Replaced with exact ISO expectations plus a low-bit-invariance
check that genuinely fails if the shift is removed.

---

## 10. Known limitations

1. **No gateway connection has been made.** `discord.com` is unreachable from
   this environment (TLS refused; npm and PostgreSQL both work, so it is
   egress filtering). Guardian now runs its full startup sequence — config
   validated, database reachable in 42 ms, 2 commands and 2 events registered,
   privileged-intent warning emitted — and fails only at the TLS handshake.
   Everything up to the socket is verified; the socket is not.
2. **`/health` has not served a request.** It binds after gateway login.
3. **No Docker image has been built** — no daemon available.
4. **Supabase's pooler is untested.** Tests ran against stock PostgreSQL 18.4.
   The migrator's advisory lock is session-scoped, so migrations must use the
   direct connection, not the transaction-mode pooler.
5. **Role grants are unverified against the live API.** The four gates in
   `DiscordRoleService` — capability, allow-list, live hierarchy, idempotency —
   are unit-tested against fakes. Their translation of `DiscordAPIError` 50013 /
   10011 / 10007 is written from the documented codes, not observed.
6. **`packages/discord/src/adapters/member.test.ts` was not written.** The
   adapter is exercised indirectly through handler tests. A direct test of the
   snapshot mapping is still owed.
7. **No load or abuse testing.** The `/verify` rate limit is correct by
   construction and unit-tested; it has not met a real raid.

---

## 11. Exact next step

**Phase 2: moderation and cases**, per `docs/PHASE-0-REPORT.md` §10.

The first commit of that phase should be migration `0005_moderation.sql`
introducing `cases` (`OPEN`, `IN_REVIEW`, `ESCALATED`, `RESOLVED`, `CLOSED`),
`case_events` and `moderation_actions`, following the same shape Phase 1
established: append-only history beside a fast current-state column, composite
FKs into `guild_members`, and repository methods returning discriminated results
rather than throwing on ordinary races.

Before that, two small debts from §10 are worth clearing while the context is
fresh: the `member.ts` adapter test (#6), and a first run against a real guild
to close #1, #2 and #5 — which needs a Discord token and an environment that can
reach `discord.com`, neither of which exists here.
