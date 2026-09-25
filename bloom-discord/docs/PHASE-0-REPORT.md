# Phase 0 report

**Scope:** architecture, repository and monorepo setup, configuration, database
base, logging, testing framework.

**Status:** complete and verified. `pnpm lint`, `pnpm typecheck` and `pnpm test`
all pass. **No bot has any commands, and each one deliberately refuses to
start** — see [Known limitations](#known-limitations).

---

## 1. Verification

Run from `bloom-discord/` on Node 24.21.0, pnpm 12.6.0:

| Command                               | Result                                     |
| ------------------------------------- | ------------------------------------------ |
| `pnpm exec tsc --build --force`       | ✅ clean, 17 projects                      |
| `pnpm exec tsc -p tsconfig.test.json` | ✅ clean (tests, scripts, tooling configs) |
| `pnpm exec eslint .`                  | ✅ 0 errors, 0 warnings                    |
| `pnpm exec vitest run`                | ✅ **199 tests, 14 files, all passing**    |
| `pnpm exec prettier --check .`        | ✅ clean                                   |

---

## 2. Files created

Everything lives in a self-contained workspace at `bloom-discord/`. **No file
outside that directory was modified** — the Bloom product app, its migrations
and its tooling are untouched.

~118 source files, ~14,300 lines of TypeScript.

### Workspace root

| File                                                                                       | Purpose                                                                                 |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `package.json`                                                                             | Private ESM root, `packageManager: pnpm@12.6.0`, `engines.node >= 24.17.0`, all scripts |
| `pnpm-workspace.yaml`                                                                      | `apps/*`, `packages/*`, dependency catalog, `allowBuilds` allow-list                    |
| `tsconfig.base.json`                                                                       | Strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `NodeNext`           |
| `tsconfig.json`                                                                            | Solution file, 16 project references                                                    |
| `tsconfig.test.json`                                                                       | `noEmit` typecheck for tests, scripts and tooling configs                               |
| `vitest.config.ts`                                                                         | Aliases `@bloom/*` to package **source**; integration tests opt-in                      |
| `eslint.config.js`                                                                         | Flat config, `strictTypeChecked` + `stylisticTypeChecked`, discord.js import boundary   |
| `.prettierrc`, `.prettierignore`, `.gitignore`, `.dockerignore`, `.nvmrc`, `.node-version` | Tooling                                                                                 |
| `.env.example`                                                                             | Annotated template, placeholders only                                                   |
| `Dockerfile`                                                                               | 3-stage build, one image for all three bots, non-root, `tini` as PID 1                  |
| `docker-compose.yml`                                                                       | Postgres + migrate job + three bots, health-gated                                       |
| `README.md`                                                                                | Entry point                                                                             |

### `packages/` — thirteen

| Package          | Contents                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **shared-types** | `Brand`, branded snowflake ids, `Result`, **22 error codes + catalog + `BloomError`**, bot names, 11 capabilities, 7 role keys, 24 channel keys, onboarding/moderation types, 9 reward ranks                                |
| **utils**        | correlation (AsyncLocalStorage), `newCaseId`, `idempotencyKey`, `Clock`, duration parse/format, redaction, retry with full jitter, text sanitisation, `DISCORD_LIMITS`                                                      |
| **validation**   | zod primitives (snowflake, duration, reason, env bool/int, postgres URL, token, schema name) and `Result`-returning parse                                                                                                   |
| **logging**      | `createLogger`, JSON/pretty/multi sinks, **mandatory redaction**, ambient correlation, `startTimer`, `noopLogger`                                                                                                           |
| **config**       | `PlatformConfig`, `loadPlatformConfig` (accumulates every issue), `.env` loading, per-bot resolution, safe summaries                                                                                                        |
| **database**     | postgres.js client (`prepare: false` for the pooler), SQLSTATE→error mapping, migrator with checksum drift + advisory lock, 7 repositories, migrate/seed CLIs                                                               |
| **security**     | token-bucket + database-backed rate limiting, storage/display sanitisation, content fingerprinting, custom-id build/validate/parse                                                                                          |
| **permissions**  | permission bit map, authorization subject/context, 13 policies + combinators, target protection, **role hierarchy checks and startup audit**, capability assertions                                                         |
| **embeds**       | colour and text-style tokens, message/embed/button/select/modal DTOs, factories, **leak-safe `errorMessage`**                                                                                                               |
| **commands**     | command spec as data, interaction ports, `BloomCommand`, `CommandRegistry`, **`CommandDispatcher`** (the single error boundary), namespace ownership                                                                        |
| **events**       | gateway event list, **cross-bot ownership map**, `EventDispatcher` with dedupe and isolation, **`Scheduler`** with leases and timezones                                                                                     |
| **discord**      | intents with written justifications, service ports, message/command-spec/interaction adapters, guild-query / role / messaging services, `CommandRegistrar`, `BotRuntime`, `HealthReporter` + HTTP server, `startBotProcess` |
| **testing**      | `FakeClock`, `MemoryLogSink`, deterministic fixtures, `FakeGuild` / `FakeRoleService` / `FakeMessaging`, `RecordingResponder`, `fakeInvocation`, `FakeJobLock`, `FakeDedupe`                                                |

### `apps/` — three

`guardian`, `companion`, `labs`. Each `main.ts` is ~20 lines: call
`startBotProcess` with an empty feature set.

### `database/`

`migrations/0001_platform_foundation.sql`, `0002_identity.sql`,
`0003_platform_operations.sql`, `seeds/001_development_guild.sql`.

### `scripts/`

`register-commands/` (idempotent bulk-overwrite registrar with diff and
dry-run), `diagnostics/` (config + connectivity preflight),
`health-check/` (container probe).

### `docs/`

`architecture/ARCHITECTURE-PLAN.md`, `architecture/bot-responsibilities.md`,
`permissions/bloom-bot-permission-matrix.md`, `permissions/role-hierarchy.md`,
`deployment/discord-developer-portal-setup.md`, `deployment/deployment.md`,
`reference/environment-variables.md`, `reference/database-schema.md`,
`reference/commands.md`, `reference/channel-configuration.md`,
`operations/troubleshooting.md`, `security/security.md`,
`development/workflow.md`, and this report.

---

## 3. Dependencies added

Nothing was added to the Bloom app's own `package.json`.

### Runtime

| Package      | Version | Why                                                                                                                                                      |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discord.js` | 14.27.0 | Current stable. Verified against the registry; v15 exists only as a pre-release tag. Pinned through the workspace catalog so the three bots cannot skew. |
| `postgres`   | 3.4.9   | postgres.js. Tagged templates parameterise by construction, and it supports `prepare: false` for Supabase's transaction pooler.                          |
| `zod`        | 4.6.5   | Configuration and input validation.                                                                                                                      |
| `croner`     | 10.0.1  | Cron with real IANA timezone support and overlap protection.                                                                                             |

### Development

`typescript@6.0.3`, `typescript-eslint@8.70.1`, `eslint@10.11.0`,
`@eslint/js@10.0.1`, `vitest@5.0.1`, `@vitest/coverage-v8@5.0.1`,
`prettier@3.9.9`, `tsx@4.23.15`, `@types/node@24.10.1`.

TypeScript is held at 6.0.3 because `typescript-eslint@8.70.1` declares a peer
range of `>=4.8.4 <6.1.0` and no typescript-eslint v9 exists yet.

---

## 4. Environment variables required

Full reference with defaults:
[`docs/reference/environment-variables.md`](reference/environment-variables.md).

**Required to start anything:** `DATABASE_URL`, `DISCORD_GUILD_ID`.

**Required per bot:** `DISCORD_<BOT>_TOKEN` and `DISCORD_<BOT>_CLIENT_ID`.

**Required by Guardian additionally:** all seven `ROLE_*` ids.

**Optional:** `NODE_ENV`, `BLOOM_ENVIRONMENT`, `BLOOM_VERSION`, `LOG_LEVEL`,
`LOG_PRETTY`, `HEALTH_PORT`, `DATABASE_SCHEMA`, `DATABASE_MAX_CONNECTIONS`,
`DATABASE_IDLE_TIMEOUT_SECONDS`, `DATABASE_CONNECT_TIMEOUT_SECONDS`,
`DISCORD_COMMAND_SCOPE`, 24 × `CHANNEL_*`, 4 × `FEATURE_*`.

Validation accumulates: one run reports every problem rather than failing on the
first. Placeholder values from `.env.example`, duplicate tokens, duplicate
client ids, duplicate role ids and `LOG_PRETTY=true` in production are all
rejected.

---

## 5. Migrations

| Migration                  | Contents                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001_platform_foundation` | Schema `bloom_discord`, `snowflake` domain, enums (`bot_name`, `onboarding_state`, `job_status`, `command_outcome`), `set_updated_at()` trigger, `guilds`, `settings` |
| `0002_identity`            | `members` (onboarding state, join/leave), `member_roles` (observed cache)                                                                                             |
| `0003_platform_operations` | `audit_events` (append-only), `idempotency_keys`, `job_runs` (partial unique index + lease), `cooldowns`, `command_telemetry`                                         |

Ledger `bloom_discord.schema_migrations`; ordering by numeric prefix; SHA-256
drift detection; `pg_advisory_xact_lock`; one transaction per migration.

Seed `001_development_guild.sql` inserts the guild row only — no fake members,
no fake points, no fake history. The seeder refuses to run when
`BLOOM_ENVIRONMENT=production`.

**These have not been executed against a live PostgreSQL instance.** See
limitations.

---

## 6. Commands added

**None.** Phase 0 delivers the command _contract_, not commands:

- `SlashCommandSpec` / `ContextMenuCommandSpec` as library-agnostic data
- `BloomCommand` with separate `spec` (what Discord is told) and `policy` (what
  is enforced)
- `CommandRegistry` with per-bot collision detection
- `CommandDispatcher` — the single error boundary every command passes through
- `RESERVED_TOP_LEVEL` namespace ownership, enforced at registration
- `CommandRegistrar` — idempotent bulk overwrite with diff, dry-run, and refusal
  to publish an empty set

The planned tree is documented in
[`docs/reference/commands.md`](reference/commands.md) and explicitly marked as
not yet live.

---

## 7. Discord permissions required

Full justification per permission per bot:
[`docs/permissions/bloom-bot-permission-matrix.md`](permissions/bloom-bot-permission-matrix.md).

**Shared baseline** (all three): View Channels, Send Messages, Send Messages in
Threads, Embed Links, Read Message History, Use Application Commands, Add
Reactions, Create Public Threads.

**Guardian additionally:** Manage Roles, Kick Members, Ban Members, Moderate
Members, Manage Messages, Manage Channels, View Audit Log, Create Private
Threads, Manage Threads.

**Companion additionally:** Manage Events.

**Labs additionally:** Attach Files, Create Private Threads.

**Never requested by any bot:** Administrator, Mention Everyone, Manage
Webhooks, Manage Guild.

Install permission integers: Guardian `1497064631510`, Companion `319975148608`,
Labs `380104723520`.

**Intents:** Guardian `Guilds + GuildMembers (privileged) + GuildModeration`;
Companion and Labs `Guilds` only. `MessageContent` and `GuildPresences` are not
requested by anyone.

---

## 8. Tests

**199 tests across 14 files, all passing.** Overall line coverage 42%, which is
the honest number: it counts a great deal of Phase 0 infrastructure that has no
caller yet (the runtime, the bootstrap, the repositories, the adapters that need
a live gateway). The parts that encode rules are well covered:

| Area          | Coverage | Focus                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `events`      | 89%      | ownership enforcement, handler isolation, dedupe, scheduler leases     |
| `security`    | 85%      | token bucket refill and eviction, sanitisation, custom ids             |
| `permissions` | 82%      | hierarchy boundaries, policies, target protection, allow-list          |
| `config`      | 76%      | fail-fast accumulation, placeholder and duplicate rejection            |
| `commands`    | 76%      | dispatcher error boundary, authorization ordering, telemetry isolation |
| `embeds`      | 75%      | **no operator hint, stack trace or secret reaches a member**           |

The tests that matter most:

- **Hierarchy boundary.** A role at the _same_ position as the bot is refused —
  Discord requires strictly-above, and the off-by-one is invisible until every
  role assignment fails.
- **Role write allow-list.** Founder, Administrator, Moderator, Beta Tester and
  the bot's own role are all refused, whatever the caller passes.
- **Peers are protected.** A moderator cannot action another moderator.
- **Error leakage.** A `DATABASE_UNAVAILABLE` carrying a connection string with
  a password renders to a member with none of it present.
- **Log redaction.** Tokens, database URLs and nested `authorization` headers
  are redacted wherever they appear.
- **Dispatcher never goes silent.** Unknown command, thrown handler, failed
  telemetry, handler returning nothing — each ends in a reply or an explanation.
- **Event ownership.** Companion and Labs cannot register handlers for member
  events; attempting it throws at startup.
- **Scheduler leases.** A held lease causes a skip, not a duplicate post.
- **Migration ordering.** `0010` sorts after `0009` numerically; duplicate
  versions and edited-after-apply checksums are refused.
- **Mention safety.** Every outbound payload sets `allowedMentions: { parse: [] }`.

`@bloom/testing` provides fakes that enforce the same rules as the real
implementations — a permissive fake makes tests pass and production fail.

Integration tests are opt-in behind `BLOOM_INTEGRATION_TESTS=1`; none exist yet.

---

## 9. Known limitations

Stated plainly rather than papered over.

1. **No bot can start.** Each refuses with `NOT_IMPLEMENTED` because it has no
   commands and no event handlers. This is deliberate: a process that connects,
   shows as online and responds to nothing is the "fake functionality" the brief
   forbids — it looks like success to everyone watching.

2. **Nothing has run against a live PostgreSQL.** There is no database or `psql`
   in the build environment. Migrations, seeds and every repository query are
   reviewed and unit-tested where they are pure, but **not integration-tested**.
   First real run should be `pnpm db:status` then `pnpm db:migrate` against a
   scratch database.

3. **Nothing has connected to Discord.** No token exists here. The adapters,
   intents and registrar are written against the current documented API and
   verified by runtime introspection of discord.js 14.27.0 (`Events.ClientReady`,
   `MessageFlags.Ephemeral`, `InteractionContextType`, `LabelBuilder`,
   `PermissionFlagsBits` values), but no live handshake has happened.

4. **The Docker image has not been built.** No Docker daemon in the environment.
   The Dockerfile and compose file are written and reviewed, not executed.

5. **Coverage is 42% overall.** Concentrated in the packages that encode rules.
   `packages/discord` reports near zero because most of it needs a live gateway;
   its pure adapters are tested directly.

6. **No GitHub integration.** Specified as interface-only for later; no
   interface has been written yet, because writing one before its first consumer
   guesses at the wrong shape.

7. **`member_roles` has no writer yet.** The table and repository exist; the
   `guildMemberUpdate` handler that populates them arrives in Phase 1.

8. **No `setOnboardingState`.** Deliberately absent from the shared identity
   repository. State transitions are Guardian's and belong on Guardian's side of
   the boundary, in Phase 1.

9. **Rewards ranks are defined but unused.** The nine ranks and their thresholds
   are in `shared-types`; the ledger and the awarding logic are Phase 3.

10. **Nested workspace.** `bloom-discord/` uses pnpm while the parent repository
    uses npm and bun. That was the deliberate trade: converting the root to a
    pnpm workspace would have meant a third lockfile at the root and touching
    the product app's tooling. The cost is that the two are installed and built
    separately.

---

## 10. Exact next step

**Phase 1 — Guardian: verification and onboarding.**

In order:

1. **Run the database for real.** `pnpm db:migrate` against a scratch Postgres,
   then `pnpm db:status`. Fix anything the SQL review missed. This must happen
   before any feature is written on top of it.

2. **Add `setOnboardingState`** to the identity repository, on Guardian's side,
   with the full transition table (`UNVERIFIED → EARLY_BLOOM → BLOOM_MEMBER`)
   and rejection of invalid transitions.

3. **Build the onboarding service** in `apps/guardian/src/features/onboarding/`,
   depending on the `RoleService` and `MessagingService` ports — not on
   discord.js.

4. **Add the first commands**: `/verify`, `/guardian status`,
   `/guardian roles audit`. Claim them in `RESERVED_TOP_LEVEL`, register them on
   Guardian's `CommandRegistry`, add them to the registrar's command set.

5. **Add the first event handler**: `guildMemberAdd` → create the member record,
   set the initial state, post the verification prompt. It carries a
   `dedupeKey`, so a gateway resume cannot double-welcome anyone.

6. **Wire the startup audit.** `auditGuardianRolePlacement` in Guardian's
   `onReady`, logging advisories and surfacing them in `/health`.

7. **Write the tests first** for the transition table and hierarchy failure
   paths. `FakeGuild` and `FakeRoleService` already model both.

8. **Register and smoke-test** against a real Discord server:
   `pnpm commands:register --bot guardian --dry-run`, then apply, then
   `pnpm dev:guardian`. Guardian will start for the first time at this point,
   because it will finally have something to serve.

Phases 2–7 (moderation and cases; Companion engagement; challenges and events;
Labs testing; polish; launch) follow the plan in
[`docs/architecture/ARCHITECTURE-PLAN.md`](architecture/ARCHITECTURE-PLAN.md).
