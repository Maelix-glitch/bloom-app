# Bloom Labs Discord Platform — Architecture Plan

Status: **approved for Phase 0 implementation**
Author: Bloom Labs platform engineering
Last reviewed: 2026-09-24

This document is the output of the "first task" in the project brief. It records what
already existed in the repository, what was verified against current upstream
documentation, the proposed architecture, and the risks and assumptions that Phase 0
is built on. Everything here was checked against live sources on 2026-09-24 — no
version number in this document is remembered, all were read from the registry or the
official docs.

---

## 1. Repository inspection

### 1.1 What already exists

`Maelix-glitch/bloom-app` is **not** a Discord project. It is the Bloom consumer
product:

| Area                  | Finding                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| Product               | Bloom personal tracker — habits, mood, sleep, study, cycle                     |
| Framework             | TanStack Start + React 19 + Vite 8, Tailwind 4                                 |
| Mobile                | Capacitor 8 (`android/`, `ios/`)                                               |
| Backend               | Supabase (`supabase/migrations`, `supabase/functions/{coach,giphy,push-send}`) |
| Package manager       | npm + bun lockfiles both present (`package-lock.json`, `bun.lock`)             |
| Tests                 | Vitest 2, `src/**/*.test.ts(x)`                                                |
| Lint/format           | ESLint 9 flat config, Prettier 3                                               |
| Root `tsconfig.json`  | Bundler resolution, `noEmit`, DOM libs, very strict flags already enabled      |
| Existing Discord code | **None.** No bot, no `discord.js`, no gateway code anywhere                    |

There is **no existing Discord bot to migrate or modernise**. This is greenfield work
inside an existing product repository.

### 1.2 Outdated / incompatible dependencies relative to this project

Nothing in the app is "outdated" for its own purposes, but the app toolchain **cannot
be reused** for the bots:

| App dependency      | Why it cannot be shared                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `typescript ^5.8.3` | Bot platform targets a newer compiler; app upgrade is out of scope             |
| `vitest ^2.1.9`     | Bot platform uses the current Vitest major                                     |
| `zod ^3.24.2`       | Bot platform uses Zod 4 (different API surface)                                |
| `tsconfig.json`     | `moduleResolution: Bundler`, `noEmit`, DOM libs — wrong for a Node ESM service |
| `vite.config.ts`    | Browser bundler, irrelevant to gateway processes                               |
| npm + bun lockfiles | The bot platform uses pnpm workspaces                                          |

**Decision:** the bot platform lives in an isolated sub-workspace, `bloom-discord/`,
with its own package manager, compiler, lockfile and test runner. It does not modify a
single existing file of the Bloom app. See §4.1 for why this is not a "second repo".

---

## 2. Current-technology verification (read live, not remembered)

| Question                     | Verified answer                                                                                                                                                                                      | Source                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Current discord.js stable    | **14.27.0**                                                                                                                                                                                          | npm registry `dist-tags.latest`                      |
| discord.js v15 status        | Pre-release only (`15.0.0-dev.*`, `dev` tag) — **not production**                                                                                                                                    | npm registry `dist-tags`                             |
| Runtime floor for discord.js | Package declares `>=18`; the official guide states **Node 22.12.0+**. Publisher built 14.27.0 on Node 24.18                                                                                          | npm registry + discord.js docs                       |
| `ready` event                | **Renamed.** `Events.ClientReady === "clientReady"` in 14.27.0 (verified at runtime, not from docs). `"ready"` emits a DeprecationWarning and is removed in v15                                      | runtime probe of installed 14.27.0                   |
| Ephemeral replies            | `ephemeral: true` deprecated → **`flags: MessageFlags.Ephemeral`** (`64`)                                                                                                                            | runtime probe + v15 migration guide                  |
| DM/context gating            | `setDMPermission` deprecated → **`setContexts(InteractionContextType.Guild)`** and `setIntegrationTypes(ApplicationIntegrationType.GuildInstall)` (both present on `SlashCommandBuilder` in 14.27.0) | runtime probe                                        |
| Timeout permission name      | **`MODERATE_MEMBERS`** (`1 << 40`), `PermissionFlagsBits.ModerateMembers`                                                                                                                            | Discord docs → Topics → Permissions                  |
| Privileged intents           | Exactly three: `GUILD_PRESENCES`, `GUILD_MEMBERS`, `MESSAGE_CONTENT`                                                                                                                                 | Discord docs → Events → Gateway → Privileged Intents |
| Privileged intent gate       | <10,000 users: self-enable in the portal. ≥10,000: review required, re-apply annually. Wrong intent in IDENTIFY → gateway close `4014`                                                               | Discord docs → Gateway                               |
| Message Content scope        | Not an event intent — it blanks `content`/`embeds`/`attachments`/`components`/`poll` fields unless granted                                                                                           | Discord docs → Gateway → Message Content Intent      |
| Gateway event rate limit     | 120 events / 60s per connection                                                                                                                                                                      | Discord docs → Gateway → Rate Limiting               |
| API version                  | v10, permissions serialised as **strings** (BigInt on our side)                                                                                                                                      | Discord docs → Topics → Permissions                  |

Two consequences for this codebase, both already applied in Phase 0:

1. We target **discord.js 14.27.0**, not v15. v15 is unreleased. We write only v15-safe
   patterns (`clientReady`, `MessageFlags.Ephemeral`, `setContexts`) so the eventual
   major upgrade is a version bump, not a rewrite.
2. **No bot enables `MESSAGE_CONTENT`.** Every feature in the brief is reachable via
   interactions. See §11.

---

## 3. The three-bot boundary

Three separate Discord **applications**, three tokens, three gateway connections, one
database, one codebase.

```
                    ┌───────────────────────────────┐
                    │      shared packages/         │
                    │  config · logging · database  │
                    │  permissions · discord · …    │
                    └───────────────┬───────────────┘
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
   ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
   │ BLOOM GUARDIAN │      │ BLOOM COMPANION│      │   BLOOM LABS   │
   │  highest trust │      │   zero trust   │      │   zero trust   │
   │  Manage Roles  │      │  NO role mgmt  │      │  NO role mgmt  │
   │  Kick/Ban/TO   │      │  NO moderation │      │  NO moderation │
   └────────────────┘      └────────────────┘      └────────────────┘
            │                       │                       │
            └───────────────────────┴───────────────────────┘
                                    ▼
                      Supabase PostgreSQL — schema `bloom_discord`
```

|                               | Guardian                                                                             | Companion                                                                  | Labs                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Owns                          | security, verification, onboarding, **role transitions**, moderation, reports, audit | community, wellbeing, check-ins, achievements, rewards, challenges, events | beta testing, experiments, feedback, voting, feature status, release workflow |
| Manage Roles                  | **yes** (only bot that has it)                                                       | never                                                                      | never                                                                         |
| Kick / Ban / Moderate Members | yes                                                                                  | never                                                                      | never                                                                         |
| Reads onboarding state        | writes                                                                               | read-only                                                                  | read-only                                                                     |
| Privileged intents            | `GUILD_MEMBERS` only                                                                 | none                                                                       | none                                                                          |
| Trust level                   | staff-facing, destructive actions                                                    | member-facing, additive only                                               | member-facing, additive only                                                  |

**The boundary is enforced in three independent places**, so a mistake in one does not
grant power:

1. **Discord** — Companion and Labs are invited with an OAuth2 permission integer that
   does not contain `MANAGE_ROLES`, `KICK_MEMBERS`, `BAN_MEMBERS` or `MODERATE_MEMBERS`.
2. **Capability manifest (code)** — each bot declares a static capability set. The role
   and moderation services refuse to construct for a bot whose manifest lacks the
   capability. A Companion feature that tried to call `assignRole` fails to compile /
   throws at wiring time, before any Discord call.
3. **Authorization layer** — every command carries an authorization policy evaluated
   server-side against the actor's real guild roles and permissions.

### 3.1 Event ownership (no duplicated actions)

Multiple bots can observe the same gateway event; exactly one may act.

| Event                           | Guardian                                                | Companion                                  | Labs              |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------ | ----------------- |
| `guildMemberAdd`                | **owns** — creates onboarding state, posts verification | silent                                     | silent            |
| onboarding completed (internal) | **emits**                                               | may send one welcome if enabled            | silent            |
| moderation violation            | **owns**                                                | silent                                     | silent            |
| feedback submitted (internal)   | silent                                                  | may award points **if explicitly enabled** | **owns**          |
| `interactionCreate`             | own commands only                                       | own commands only                          | own commands only |

Cross-bot reactions never happen through the gateway. They happen through **internal
domain events persisted in the database**, so an action is attributable, replayable and
idempotent. Phase 0 ships the event-ownership registry and the dispatcher; the domain
event bus lands with its first consumer in Phase 3.

---

## 4. Monorepo

### 4.1 Placement decision

The brief specifies a `bloom-discord/` monorepo. The repository already contains a
product with its own npm toolchain. Three options were considered:

| Option                                                        | Verdict                                                                                                                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convert repo root into a pnpm workspace containing app + bots | **Rejected.** Forces a risky migration of a shipping product's build, lockfile and CI for zero benefit to the bots                                                                     |
| Separate repository                                           | **Rejected.** The brief targets this repo; the bots will share Supabase schema knowledge and release notes with the app                                                                |
| **`bloom-discord/` as a self-contained nested workspace**     | **Chosen.** Own `pnpm-workspace.yaml`, own lockfile, own tsconfig, own test runner. Zero changes to app files. Can be extracted into its own repository later with `git subtree split` |

### 4.2 Layout

```
bloom-discord/
├── apps/
│   ├── guardian/      Phase 1  — security, onboarding, moderation
│   ├── companion/     Phase 3  — community, wellbeing, rewards
│   └── labs/          Phase 5  — beta, feedback, experiments
├── packages/
│   ├── shared-types/  zero-dependency vocabulary: ids, error codes, enums, Result
│   ├── utils/         correlation ids, time, retry, redaction, ids
│   ├── validation/    Zod schema primitives (snowflake, duration, reason, …)
│   ├── config/        typed env → validated config, fail-fast at boot
│   ├── logging/       structured JSON logger, redaction, correlation binding
│   ├── database/      postgres.js client, migrator, repository base, health
│   ├── security/      rate limiting, idempotency, input sanitisation
│   ├── permissions/   pure authorization + role-hierarchy engine (no discord.js)
│   ├── embeds/        Bloom visual identity, restrained embed factories
│   ├── commands/      command contract, registry, guard composition
│   ├── events/        event contract, registry, ownership map, dedupe
│   ├── discord/       THE ONLY package allowed to import discord.js
│   └── testing/       fake clock, memory log sink, mock Discord adapters, db harness
├── database/
│   ├── migrations/    numbered, checksummed, forward-only SQL
│   └── seeds/         development-only seed data
├── docs/              architecture, commands, permissions, deployment, operations
└── scripts/
    ├── register-commands/  idempotent bulk overwrite, dev-guild vs global
    ├── health-check/       real DB + gateway + registration status
    └── diagnostics/        config resolution with secrets redacted
```

### 4.3 Dependency direction

Strictly acyclic, enforced by TypeScript project references:

```
shared-types
   ↑
utils ── validation
   ↑         ↑
logging   config
   ↑         ↑
   └── database ── security ── permissions ── embeds
                                   ↑            ↑
                              commands ──── events
                                   ↑            ↑
                                   └── discord ─┘
                                          ↑
                              apps/{guardian,companion,labs}
```

`packages/discord` is the **only** package permitted to import `discord.js`. This is not
a convention — it is an ESLint `no-restricted-imports` rule that fails the build
elsewhere. Business logic therefore stays testable without a gateway connection, and a
Discord API change is contained to one package.

### 4.4 Layering (adapter pattern)

```
Discord Interaction (discord.js)
        │  packages/discord — adapter: translates discord.js → plain DTOs
        ▼
Command Controller          packages/commands — contract, routing, error boundary
        ▼
Authorization               packages/permissions — pure, no I/O, no discord.js
        ▼
Application Service         apps/*/src/services — business rules
        ▼
Repository                  packages/database — SQL, transactions, idempotency
        ▼
PostgreSQL
```

Services receive **ports** (`RoleService`, `MessagingService`, `MemberService`,
`Clock`, `Logger`, repositories) via constructor injection. `packages/testing` supplies
in-memory implementations of every port, so the whole business layer is unit-testable
with no network.

---

## 5. Environment variables

Complete Phase 0 surface. `.env.example` contains placeholders only; `.env` is git-ignored.

### Shared

| Variable                   | Required             | Notes                                                               |
| -------------------------- | -------------------- | ------------------------------------------------------------------- |
| `NODE_ENV`                 | no (`development`)   | `development` \| `test` \| `production`                             |
| `BLOOM_ENVIRONMENT`        | no (`development`)   | `development` \| `staging` \| `production` — appears in logs/health |
| `DISCORD_GUILD_ID`         | **yes**              | Bloom Labs guild snowflake                                          |
| `DATABASE_URL`             | **yes**              | Supabase Postgres **pooler** URI, `sslmode=require`                 |
| `DATABASE_SCHEMA`          | no (`bloom_discord`) | Keeps bot tables out of the app's `public` schema                   |
| `DATABASE_MAX_CONNECTIONS` | no (`5`)             | Per process. 3 bots × 5 must fit the pooler budget                  |
| `LOG_LEVEL`                | no (`info`)          | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal`                  |
| `LOG_PRETTY`               | no (`false`)         | Human-readable dev output; **never** in production                  |

### Per bot (never shared, never reused)

| Guardian                     | Companion                     | Labs                     |
| ---------------------------- | ----------------------------- | ------------------------ |
| `DISCORD_GUARDIAN_TOKEN`     | `DISCORD_COMPANION_TOKEN`     | `DISCORD_LABS_TOKEN`     |
| `DISCORD_GUARDIAN_CLIENT_ID` | `DISCORD_COMPANION_CLIENT_ID` | `DISCORD_LABS_CLIENT_ID` |

Config validation rejects the case where two bots share a token or a client id — a
copy-paste mistake that would otherwise be extremely hard to diagnose.

### Roles — IDs only, names are display-only

`ROLE_FOUNDER`, `ROLE_ADMINISTRATOR`, `ROLE_MODERATOR`, `ROLE_BLOOM_BOT`,
`ROLE_BETA_TESTER`, `ROLE_EARLY_BLOOM`, `ROLE_BLOOM_MEMBER`

### Channels — IDs only

`CHANNEL_WELCOME`, `CHANNEL_RULES`, `CHANNEL_GETTING_STARTED`, `CHANNEL_ANNOUNCEMENTS`,
`CHANNEL_RELEASE_NOTES`, `CHANNEL_DEVELOPMENT_UPDATES`, `CHANNEL_INTRODUCTIONS`,
`CHANNEL_DAILY_CHECK_IN`, `CHANNEL_SMALL_WINS`, `CHANNEL_ACHIEVEMENTS`,
`CHANNEL_MILESTONES`, `CHANNEL_BLOOM_REWARDS`, `CHANNEL_CHALLENGES`,
`CHANNEL_BETA_TESTING`, `CHANNEL_FEATURE_TESTING`, `CHANNEL_FEEDBACK`,
`CHANNEL_FEATURE_REQUESTS`, `CHANNEL_VOTING`, `CHANNEL_FEATURE_STATUS`,
`CHANNEL_BUG_REPORTS`, `CHANNEL_SUPPORT`, `CHANNEL_MODERATION`, `CHANNEL_REPORTS`,
`CHANNEL_INTERNAL`

Each bot declares which of these it _requires_; only that subset is enforced at its boot.

### Feature flags

`FEATURE_SCHEDULED_MESSAGES`, `FEATURE_REWARDS`, `FEATURE_GITHUB_INTEGRATION`,
`FEATURE_AI_INTEGRATION` — all default **off**.

### Explicitly absent

No AI provider keys (§16 of the brief: AI is showcase-only for now). No GitHub
credentials (§28: interface only). Adding either is a config-schema change, not a code
change.

---

## 6. Database

One Supabase PostgreSQL database, **one dedicated schema `bloom_discord`**, so bot
tables never collide with the Bloom app's `public` schema. Migrations are numbered,
forward-only, checksummed, and applied under a Postgres advisory lock so two bots
starting simultaneously cannot race.

### Phase 0 tables (shipped now)

Platform foundation only — domain tables arrive with the phase that uses them, so no
table is created before there is code that reads it.

| Table               | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `schema_migrations` | applied migration ledger with checksums                               |
| `guilds`            | known guilds + per-guild settings root                                |
| `users`             | Discord user shadow records (id + minimal display data)               |
| `guild_members`     | membership, join date, current onboarding state                       |
| `member_roles`      | observed role snapshot, for cohort queries without privileged fetches |
| `bot_settings`      | per-bot, per-guild key/value settings                                 |
| `channel_settings`  | channel key → channel id, DB override for env config                  |
| `role_settings`     | role key → role id, DB override for env config                        |
| `audit_events`      | append-only structured audit trail for every significant action       |
| `command_usage`     | one row per interaction: latency, outcome, error code                 |
| `job_runs`          | job lock, status, attempt count, timing                               |
| `message_cooldowns` | anti-spam / duplicate-message suppression                             |
| `idempotency_keys`  | generic exactly-once guard for interactions and jobs                  |
| `system_health`     | last observed health snapshot per bot                                 |

### Added since

Phase 1 created `guild_members` and `onboarding_transitions`; Phase 2 created
`moderation_cases`, `case_events`, `case_counters`, `moderation_actions` and
`reports`. See `docs/reference/database-schema.md` for the live schema.

Warnings are **not** a separate table, contrary to the plan above: a warning is
`moderation_actions` with `action = 'warn'`, counted through a partial index on
unrevoked rows. A parallel `warnings` table would have duplicated the actor,
reason, case link and revocation columns, and left two places to look for "what
has happened to this member".

### Deferred (documented, not created)

`scheduled_messages` (Phase 3) · `achievements`, `milestones`, `reward_balances`,
`reward_transactions`, `challenges`, `challenge_members` (Phase 4) · `beta_users`,
`beta_cohorts`, `features`, `feature_tests`, `test_results`, `feedback`,
`feature_votes`, `bug_reports`, `support_cases` (Phase 5) · `release_notes`,
`experiments` (Phase 6).

### Conventions

- Snowflakes stored as `text` (they exceed `bigint` safety in JS), `CHECK` constrained to `^[0-9]{17,20}$`.
- Every table: `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at` maintained by trigger. **All storage in UTC.**
- Money-like and point-like values: `bigint`, never float.
- No message content stored unless a feature genuinely needs it; reports store a reference, not a transcript.
- Least privilege: the bots connect as a role with `USAGE` on `bloom_discord` and table-level DML only — **no** service-role key, no `public` schema write access, no DDL at runtime. Migrations run under a separate deploy credential.

---

## 7. Discord permissions (least privilege)

Validated against the current permission list. Full justification per permission in
`docs/permissions/bloom-bot-permission-matrix.md`.

| Permission               | Guardian                       | Companion            | Labs      |
| ------------------------ | ------------------------------ | -------------------- | --------- |
| View Channels            | ✔                              | ✔                    | ✔         |
| Send Messages            | ✔                              | ✔                    | ✔         |
| Send Messages in Threads | ✔                              | ✔                    | ✔         |
| Read Message History     | ✔                              | ✔                    | ✔         |
| Embed Links              | ✔                              | ✔                    | ✔         |
| Attach Files             | ✔                              | ✖ _(Phase 3 review)_ | ✔         |
| Add Reactions            | ✖                              | ✔                    | ✔         |
| Use Application Commands | ✔                              | ✔                    | ✔         |
| Manage Messages          | ✔ `/purge`                     | ✖                    | ✖         |
| Manage Threads           | ✔                              | ✖                    | ✖         |
| Create Public Threads    | ✖                              | ✖                    | ✔         |
| Manage Events            | ✖                              | ✔ _(Phase 3)_        | ✖         |
| Kick Members             | ✔                              | ✖                    | ✖         |
| Ban Members              | ✔                              | ✖                    | ✖         |
| Moderate Members         | ✔ (timeout)                    | ✖                    | ✖         |
| Manage Roles             | ✔ **only bot**                 | ✖                    | ✖         |
| Manage Channels          | ✔ `/guardian channel slowmode` | ✖                    | ✖         |
| **Administrator**        | **never**                      | **never**            | **never** |

Note (settled in Phase 2): the three channel commands split across two
permissions rather than taking the broader one for both.

- **`/guardian channel lock` and `unlock`** edit the `@everyone` Send Messages
  overwrite on one channel. That is a permission-overwrite edit, which **Manage
  Roles** already covers — Guardian holds it for the onboarding lifecycle, so
  these two commands need nothing new.
- **`/guardian channel slowmode`** edits the channel's rate limit, which is a
  channel property rather than an overwrite. That genuinely requires **Manage
  Channels**, so it is granted, and it is the only reason Guardian holds it.

Manage Channels would also have covered lock and unlock. It is deliberately not
used for them: it is the broader permission, and routing two of the three
commands through the narrower one keeps the blast radius of a compromised bot
token smaller. Guardian's invite integer is unchanged by Phase 2 — Manage
Channels was already in the baseline granted at Phase 0.

### Role hierarchy requirement

```
✦ Founder
◈ Administrator
⟡ Moderator
◉ Bloom Bot        ← Guardian's integration role must sit HERE
◌ Beta Tester
✧ Early Bloom
❋ Bloom Member
@everyone
```

Guardian can only manage roles **strictly below** its own highest role. Positioned as
above it can manage Early Bloom and Bloom Member, and cannot touch staff roles. The
hierarchy is re-checked **at runtime before every role write** — see §9.

---

## 8. Gateway intents

Least privilege, per bot, with a written reason for each. Any intent not listed is not
requested.

| Bot           | Intents           | Privileged? | Reason                                                                                            |
| ------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| **Guardian**  | `Guilds`          | no          | guild/channel/role cache required for hierarchy + channel resolution                              |
|               | `GuildMembers`    | **yes**     | `guildMemberAdd` drives onboarding; member role state drives authorization. No alternative exists |
|               | `GuildModeration` | no          | observe ban add/remove to reconcile audit trail with out-of-band staff actions                    |
| **Companion** | `Guilds`          | no          | channel resolution for scheduled and command responses                                            |
| **Labs**      | `Guilds`          | no          | channel resolution only                                                                           |

**`MessageContent` is not requested by any bot.** Every Phase 1–6 feature is driven by
slash commands, buttons, select menus, modals and context-menu commands. If a future
feature appears to need it, the first design step is to replace it with a message
context-menu command, which receives the content of the targeted message without the
intent.

`GuildPresences` is never requested. `GuildVoiceStates` is not requested; voice
channels exist in the server but no planned feature reads voice state.

Companion deliberately does **not** take `GuildMembers`. It reads onboarding and cohort
state from the database (written by Guardian), not from the gateway. This keeps the
privileged-intent blast radius to the single highest-trust application.

---

## 9. Failure behaviour that is designed, not incidental

### Role hierarchy block

Guardian re-reads its own highest role position and the target role position before
every role write. On failure it does **not** retry and does **not** crash:

```
ROLE_HIERARCHY_BLOCKED

Bloom Guardian cannot assign ✧ Early Bloom because its bot role ◉ Bloom Bot
(position 4) is not above the target role (position 6).

Fix: Server Settings → Roles → drag ◉ Bloom Bot above ✧ Early Bloom and
❋ Bloom Member, and keep it below ⟡ Moderator.
```

Member-facing: a calm "this could not be completed, staff have been notified".
Staff-facing: the text above. Log: structured, severity `error`, with both positions.

### Error codes

`ROLE_HIERARCHY_BLOCKED`, `ROLE_NOT_FOUND`, `CHANNEL_NOT_FOUND`, `UNAUTHORIZED`,
`INSUFFICIENT_PERMISSION`, `DATABASE_UNAVAILABLE`, `DISCORD_API_ERROR`,
`DUPLICATE_OPERATION`, `RATE_LIMITED`, `INVALID_INPUT`, `CONFIGURATION_ERROR`,
plus `INTERNAL_ERROR`, `NOT_IMPLEMENTED`, `TIMEOUT`, `GUILD_MISMATCH`,
`CHANNEL_RESTRICTED`, `BOT_MISSING_PERMISSION`, `TARGET_PROTECTED`, `SELF_ACTION_BLOCKED`.

Every code carries: user-safe message, staff-facing remediation, severity, and whether
a retry could ever succeed. Stack traces never reach Discord.

### Interaction deadline

Discord gives 3 seconds to acknowledge. The router acknowledges (defer or reply) inside
a hard budget and treats deadline overrun as a first-class error path, not a crash.

---

## 10. Risks

| #   | Risk                                                    | Impact                                                           | Mitigation                                                                                                                                                                         |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Bot role positioned too low in Discord                  | All role transitions silently fail                               | Runtime hierarchy check + actionable error + startup preflight that logs a warning before any user hits it                                                                         |
| R2  | Three bots × pooled connections exhaust Supabase pooler | Total outage                                                     | `DATABASE_MAX_CONNECTIONS` default 5/process, documented budget, health check surfaces pool saturation                                                                             |
| R3  | Token pasted into the wrong env var                     | Bot answers as the wrong identity, cross-bot privilege confusion | Config rejects duplicate tokens/client ids; boot asserts the logged-in application id equals the configured client id                                                              |
| R4  | Duplicate command registration creating ghost commands  | Users see stale/duplicate commands                               | Registration uses **bulk overwrite** (`PUT`), which is idempotent by construction; script refuses to PUT an empty set unless `--allow-empty`                                       |
| R5  | Two processes running the same scheduled job            | Duplicate messages, duplicate rewards                            | DB-backed job locks with lease expiry; jobs are idempotent by job-run key                                                                                                          |
| R6  | Reward double-award from double-clicked button          | Point inflation, loss of trust                                   | Every award goes through `idempotency_keys` inside the same transaction as the balance update                                                                                      |
| R7  | Private report content leaking to a public channel      | Serious safety/privacy incident                                  | Reports never carry content in embeds outside configured private channels; channel target validated against `role_settings`/`channel_settings` at send time, not at authoring time |
| R8  | discord.js v15 lands mid-project                        | Forced rewrite                                                   | Only v15-safe APIs used today; discord.js confined to one package; version pinned exactly                                                                                          |
| R9  | Privileged intent review at 10k users                   | Guardian loses `GuildMembers`, onboarding stops                  | Only one bot depends on it; documented in operations runbook with the review requirement                                                                                           |
| R10 | Supabase schema drift between app and bots              | Broken deploys                                                   | Bots own a separate schema and never write to `public`                                                                                                                             |
| R11 | Scheduled messages feeling spammy                       | Undermines the premium positioning                               | Every scheduled message requires enable flag + channel config + timezone + cooldown + duplicate check, all enforced by the job framework rather than left to each feature          |
| R12 | Sandbox/CI Node version drift                           | "Works on my machine"                                            | `engines`, `.node-version`, `packageManager` pinned; Dockerfile pins the same major                                                                                                |

---

## 11. Assumptions

These are decisions taken in the absence of an explicit instruction. Each is cheap to
reverse; flag any that is wrong before Phase 1.

| #   | Assumption                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | The platform lives at `bloom-discord/` inside this repo rather than restructuring the repo root or creating a new repository (§4.1)                                                                                                                                                 |
| A2  | Bot tables live in a dedicated `bloom_discord` schema in the **same** Supabase project as the app, not a separate database. No app table is read or written in Phase 0                                                                                                              |
| A3  | discord.js **14.27.0**, not the v15 dev line                                                                                                                                                                                                                                        |
| A4  | `engines: >=24.17.0` per the brief. Note: discord.js itself only requires 22.12+, so this is a project policy, not a library constraint. **The development sandbox runs Node 22.22.3**, so a Node 24.21.0 runtime was installed explicitly and all verification below was run on it |
| A5  | pnpm workspaces, no Turborepo/Nx — 13 packages do not justify a build orchestrator yet                                                                                                                                                                                              |
| A6  | postgres.js (`postgres`) as the driver, with a hand-rolled checksummed migrator rather than an ORM. The schema is SQL-first and shared with Supabase tooling; an ORM would add a second source of truth                                                                             |
| A7  | Structured logging is a small in-house logger rather than pino, because the brief mandates an exact field contract (`bot_name`, `correlation_id`, …) that is better enforced by types than by a generic logger                                                                      |
| A8  | Bloom Labs is a single guild. Everything is nonetheless keyed by `guild_id` so multi-guild is a config change, not a migration                                                                                                                                                      |
| A9  | Points/ranks are Discord-local in Phase 4 and not yet reconciled with the Bloom app's existing `progression` tables. Linking accounts is a later, explicitly-scoped feature                                                                                                         |
| A10 | "Bloom Bot" is one integration role in the server. In practice each application gets its own managed integration role; the _managed_ role for Guardian is what must sit below Moderator and above Early Bloom. Documented in the portal setup guide                                 |
| A11 | No CI provider was configured in this repo, so Phase 0 ships the scripts CI would call (`lint`, `typecheck`, `test`, `build`) but no workflow file                                                                                                                                  |
| A12 | Timezone for scheduled content defaults to UTC until a guild timezone is configured                                                                                                                                                                                                 |

---

## 12. Phase 0 scope (what is being built now, and what is not)

**In scope:** monorepo, toolchain, typed config with fail-fast validation, structured
logging, database client + migrator + base schema + repository pattern, error-code
system, authorization and role-hierarchy engines (pure, fully tested), Discord adapter
ports + capability manifests + intent resolution, command/event contracts and
registries, embed design system, test framework with mock Discord adapters, the three
operational scripts, Docker, and documentation.

**Explicitly not in scope for Phase 0:** any Discord command, any gateway login, any
feature behaviour. `apps/*` are workspace members with a boot entrypoint that fails
loudly with `NOT_IMPLEMENTED` rather than pretending to run. Guardian's first real boot
is Phase 1.

This boundary is deliberate: the brief's §48 says implement Phase 0 only, and §52 says
do not pretend a feature works when it does not.
