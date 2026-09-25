# Bloom Labs Discord platform

Three Discord applications — **Guardian**, **Companion** and **Labs** — sharing
one Supabase PostgreSQL database and a common set of packages, in a pnpm
workspace of strict TypeScript ESM targeting Node 24.

> **Status: Phase 0.** Architecture, monorepo, configuration, database base,
> logging and the testing framework are complete and verified. **No bot has any
> commands yet, and each one refuses to start rather than appear online doing
> nothing.** That refusal is deliberate — see
> [`docs/PHASE-0-REPORT.md`](docs/PHASE-0-REPORT.md).

---

## The three bots

|              | **Guardian**                                                           | **Companion**                                                                   | **Labs**                                                               |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Trust        | highest                                                                | standard                                                                        | standard                                                               |
| Owns         | verification, onboarding, roles, moderation, reports, audit, anti-spam | welcome, check-ins, wins, achievements, milestones, rewards, challenges, events | beta cohorts, feedback, voting, bug intake, experiments, release notes |
| Manage Roles | ✅ **only bot**                                                        | ❌                                                                              | ❌                                                                     |
| Moderation   | ✅ **only bot**                                                        | ❌                                                                              | ❌                                                                     |
| Intents      | Guilds, GuildMembers _(privileged)_, GuildModeration                   | Guilds                                                                          | Guilds                                                                 |

Full table: [`docs/architecture/bot-responsibilities.md`](docs/architecture/bot-responsibilities.md).

### The rule everything else follows

> Only Guardian performs role transitions. Companion and Labs read onboarding
> state but never modify it.

Enforced in four independent places: the capability manifest, the role service
constructor, a two-id allow-list, and the OAuth2 scope each bot is installed
with.

---

## Quick start

```bash
cd bloom-discord
corepack enable
pnpm install

cp .env.example .env      # fill in tokens, guild id, role ids, channel ids
pnpm diagnostics          # tells you exactly what is still missing

pnpm db:migrate
pnpm verify               # lint + typecheck + tests
```

Requires **Node ≥ 24.17** and **pnpm ≥ 12**.

Setting up the Discord side from scratch:
[`docs/deployment/discord-developer-portal-setup.md`](docs/deployment/discord-developer-portal-setup.md).

---

## Layout

```
apps/           thin entry points, one per bot
packages/
  shared-types  branded ids, Result, the error catalog
  utils         correlation, time, text, retry, redaction
  validation    zod schemas returning Result
  logging       structured JSON logging, redaction is mandatory
  config        typed, validated, fail-fast configuration
  database      postgres client, migrator, repositories
  security      rate limiting, sanitisation, custom ids
  permissions   policies, role hierarchy, capabilities   ← no discord.js
  embeds        message DTOs and factories               ← no discord.js
  commands      command contract, registry, dispatcher   ← no discord.js
  events        event contract, ownership map, scheduler ← no discord.js
  discord       THE ONLY PLACE discord.js IS IMPORTED
  testing       fakes and fixtures, never a production dependency
database/       numbered SQL migrations and seeds
scripts/        register-commands, diagnostics, health-check
docs/
```

**discord.js may only be imported inside `packages/discord`**, enforced by an
ESLint rule. Everything else depends on ports that `@bloom/testing` also
implements in-memory — which is what makes business logic testable without a
gateway, and what keeps the eventual v15 upgrade confined to one package.

---

## Design decisions worth knowing

**Fail fast, fail completely.** Configuration is validated once at startup and
reports _every_ problem in one error rather than one per restart.

**Never fake a status.** `/health` performs real checks; a check that cannot run
reports `unknown`, not `up`. The aggregate is the worst component, never an
average. A bot with no commands refuses to start rather than sitting online
doing nothing.

**Errors have two audiences.** Every `BloomError` carries a `userMessage`
written for members and an `operatorHint` written for whoever fixes it. The
member-facing renderer reads only the first, plus an eight-character correlation
reference — never a stack trace, never an internal id.

**Idempotency is durable.** Anything with a visible side effect claims a key in
Postgres. Two replicas, or a redelivered gateway event, produce one action.

**One scheduler, with leases.** No scattered `setInterval`. Cron expressions are
evaluated in a named timezone, every run takes a database lease, and every job
has an off switch.

**Restraint is a requirement.** Calm, premium, quiet. No exclamation marks, no
emoji in message bodies, no giant embeds, no XP farming, no fake stats. Encoded
in `TEXT_STYLE` and asserted in tests, not left to reviewers.

---

## Commands

```bash
pnpm build                 # tsc --build
pnpm typecheck             # build + typecheck tests and scripts
pnpm lint                  # type-aware ESLint
pnpm test                  # vitest
pnpm verify                # all three — run before pushing

pnpm db:status
pnpm db:migrate
pnpm db:seed               # refuses to run in production

pnpm diagnostics           # configuration + connectivity preflight
pnpm health                # query a running bot's /health
pnpm commands:register --bot guardian [--dry-run]

pnpm dev:guardian | dev:companion | dev:labs
```

---

## Documentation

|                                                                             |                                               |
| --------------------------------------------------------------------------- | --------------------------------------------- |
| [Architecture plan](docs/architecture/ARCHITECTURE-PLAN.md)                 | Layering, boundaries, the full Phase 0 design |
| [Bot responsibilities](docs/architecture/bot-responsibilities.md)           | Who owns what, and how it is enforced         |
| [Permission matrix](docs/permissions/bloom-bot-permission-matrix.md)        | Every permission, justified per bot           |
| [Role hierarchy](docs/permissions/role-hierarchy.md)                        | The ordering, and what breaks without it      |
| [Developer Portal setup](docs/deployment/discord-developer-portal-setup.md) | Applications, intents, OAuth2 install         |
| [Deployment](docs/deployment/deployment.md)                                 | Docker, health, rollout, monitoring           |
| [Environment variables](docs/reference/environment-variables.md)            | Every variable                                |
| [Database schema](docs/reference/database-schema.md)                        | Tables, migrations, conventions               |
| [Commands](docs/reference/commands.md)                                      | Planned command tree and namespacing          |
| [Channel configuration](docs/reference/channel-configuration.md)            | Channel map and per-channel permissions       |
| [Troubleshooting](docs/operations/troubleshooting.md)                       | Symptom → cause → fix                         |
| [Security](docs/security/security.md)                                       | Trust boundaries, secrets, abuse resistance   |
| [Development workflow](docs/development/workflow.md)                        | Day-to-day                                    |
| [Phase 0 report](docs/PHASE-0-REPORT.md)                                    | What was built, what is missing, what is next |

---

## Relationship to the Bloom app

This lives in `bloom-discord/`, a self-contained workspace inside the Bloom
repository. It shares the Supabase project but uses its own schema
(`bloom_discord`) and its own migration ledger. No file outside this directory
was modified.
