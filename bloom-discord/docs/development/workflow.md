# Development workflow

## Prerequisites

|            |                                        |
| ---------- | -------------------------------------- |
| Node.js    | **≥ 24.17** (`.nvmrc` pins 24.21.0)    |
| pnpm       | **≥ 12** (`corepack enable` is enough) |
| PostgreSQL | 15+, or `docker compose up postgres`   |

```bash
cd bloom-discord
corepack enable
pnpm install
cp .env.example .env     # then fill it in
pnpm diagnostics
```

## Daily commands

```bash
pnpm build          # tsc --build across all projects
pnpm typecheck      # build + typecheck tests and scripts
pnpm lint           # ESLint, fully type-aware
pnpm test           # vitest run
pnpm test:watch
pnpm test:coverage
pnpm format         # prettier --write
pnpm verify         # lint + typecheck + test — run before pushing

pnpm db:status
pnpm db:migrate
pnpm db:seed        # refuses to run in production

pnpm dev:guardian   # tsx watch
pnpm dev:companion
pnpm dev:labs
```

## Layout

```
bloom-discord/
├── apps/                    thin entry points, one per bot
│   ├── guardian/  companion/  labs/
├── packages/
│   ├── shared-types/        branded ids, Result, the error catalog
│   ├── utils/               correlation, time, text, retry, redaction
│   ├── validation/          zod schemas + Result-returning parse
│   ├── logging/             structured JSON logging with mandatory redaction
│   ├── config/              typed, validated, fail-fast configuration
│   ├── database/            postgres client, migrator, repositories
│   ├── security/            rate limiting, sanitisation, custom ids
│   ├── permissions/         policies, hierarchy, capabilities  (no discord.js)
│   ├── embeds/              message DTOs and factories           (no discord.js)
│   ├── commands/            command contract, registry, dispatcher
│   ├── events/              gateway event contract, ownership, scheduler
│   ├── discord/             THE ONLY PLACE discord.js IS IMPORTED
│   └── testing/             fakes and fixtures — never a production dependency
├── database/migrations/     numbered SQL
├── docs/
└── scripts/                 register-commands, diagnostics, health-check
```

Dependencies point one way, low to high. `shared-types` depends on nothing.
`discord` depends on everything. A cycle will not compile — TypeScript project
references enforce it.

## The one architectural rule

**discord.js may only be imported inside `packages/discord`.** An ESLint
`no-restricted-imports` rule enforces it; a violation fails `pnpm lint`.

Everything else depends on the ports in `@bloom/discord` — `GuildQueryService`,
`RoleService`, `MessagingService` — which `@bloom/testing` also implements
in-memory. That is what makes business logic testable without a gateway, and
what will keep the eventual discord.js v15 upgrade confined to one package.

## Adding a package

1. `packages/<name>/` with `package.json` and `tsconfig.json`.
2. Add it to the root `tsconfig.json` `references`.
3. Add workspace deps to **both** `dependencies` **and** tsconfig `references` —
   omitting the second gives a confusing `TS2307`.
4. `pnpm install`.

## Adding a command (Phase 1 onward)

1. Claim the name in `RESERVED_TOP_LEVEL` (`packages/commands/src/namespace.ts`).
2. Implement `BloomCommand`: a `spec`, a `policy`, an `execute`.
3. Register it on the bot's `CommandRegistry`.
4. Add it to the registrar's command set and to `docs/reference/commands.md`.
5. `pnpm commands:register --bot <name> --dry-run`, then apply.

`execute` returns a message rather than sending one. Handlers that return data
are trivially testable, and it keeps every response flowing through the one
place where ephemerality, error handling and telemetry are applied.

## Adding a migration

1. `database/migrations/NNNN_snake_case_name.sql`, next number.
2. `pnpm db:status` → it appears as pending.
3. `pnpm db:migrate`.

**Never edit an applied migration.** The checksum check will refuse, and it is
right to: the edit would never run where the original already did.

## Testing

Vitest, aliased so `@bloom/*` resolves to each package's **source**. Tests run on
a clean checkout with no build step, and a stack trace points at the line you
would edit.

Use the fakes:

```ts
import {
  FakeGuild,
  FakeRoleService,
  fakeInvocation,
  testSubject,
  FakeClock,
} from '@bloom/testing';

const guild = new FakeGuild().withStandardRoles().withMember(TEST_USER_IDS.member);
const roles = new FakeRoleService(guild);
const { invocation, responder } = fakeInvocation({ commandName: 'guardian' });
```

They enforce the same rules as the real implementations — hierarchy refusals,
single-acknowledgement interactions, lease contention. A permissive fake makes
tests pass and production fail, which is worse than no test.

Never use real time. Everything time-dependent takes a `Clock`; tests pass a
`FakeClock` and advance it.

Integration tests (`*.integration.test.ts`) need a real Postgres and are skipped
unless `BLOOM_INTEGRATION_TESTS=1`. A suite that fails on a laptop without a
database trains people to ignore red builds.

## Style

Prettier owns formatting; do not argue with it. The lint rules that matter are
architectural:

- no `any`, no unsafe `any` flows
- no floating promises — in a gateway process an unawaited rejection is a dead bot
- no `console` outside the CLI scripts; it bypasses redaction
- no `eval`, no `Math.random()` for anything security-relevant
- exhaustive switches over closed unions

Comments explain **why**. The code already says what.

## Before pushing

```bash
pnpm verify
```

Lint, typecheck (including tests and scripts), and the full suite.
