# Environment variables

Every variable the platform reads, whether it is required, and what happens when
it is wrong.

Configuration is validated once at startup by `@bloom/config`. Validation
**accumulates** — one run reports every problem, rather than failing on the
first and making you restart six times. A malformed value is as fatal as a
missing one.

`.env` is read in development as a convenience. In production the orchestrator
supplies real environment variables and no `.env` exists.

---

## Runtime

| Variable            | Required | Default                 | Notes                                                                                                                                                                       |
| ------------------- | :------: | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          |    no    | `development`           | `development` \| `test` \| `production`                                                                                                                                     |
| `BLOOM_ENVIRONMENT` |    no    | derived from `NODE_ENV` | `development` \| `staging` \| `production`. Appears on every log line and in `/health`.                                                                                     |
| `BLOOM_VERSION`     |    no    | `0.1.0`                 | Stamped on every log line. Set it to the build SHA in CI so a log line identifies the exact code that produced it.                                                          |
| `LOG_LEVEL`         |    no    | `info`                  | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal`                                                                                                                |
| `LOG_PRETTY`        |    no    | `false`                 | Human-readable output. **Rejected when `BLOOM_ENVIRONMENT=production`** — pretty logs are logs the aggregator cannot parse, discovered during the incident that needs them. |
| `HEALTH_PORT`       |    no    | unset                   | Port for `/health` and `/ready`. Unset means no HTTP surface, which is correct for local development.                                                                       |

## Database

| Variable                           | Required | Default         | Notes                                                                                                |
| ---------------------------------- | :------: | --------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                     | **yes**  | —               | Postgres connection URI. For Supabase use the **transaction pooler** URI, not the direct connection. |
| `DATABASE_SCHEMA`                  |    no    | `bloom_discord` | Isolates bot tables from the Bloom product schema in the same database.                              |
| `DATABASE_MAX_CONNECTIONS`         |    no    | `5`             | Per process. Three bots × 5 = 15 against the pooler's limit; raise deliberately.                     |
| `DATABASE_IDLE_TIMEOUT_SECONDS`    |    no    | `30`            |                                                                                                      |
| `DATABASE_CONNECT_TIMEOUT_SECONDS` |    no    | `10`            |                                                                                                      |

The client sets `prepare: false`, which is **required** for Supabase's
transaction pooler — prepared statements are per-session and the pooler does not
guarantee session affinity.

`DATABASE_URL` contains credentials. The redactor catches it in logs, but never
echo it into a message, an error or a support ticket.

## Discord — guild

| Variable                | Required | Default | Notes                                                                                                                                                   |
| ----------------------- | :------: | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_GUILD_ID`      | **yes**  | —       | The Bloom Labs server id. Every bot verifies it can reach this guild at startup and refuses to act anywhere else.                                       |
| `DISCORD_COMMAND_SCOPE` |    no    | `guild` | `guild` \| `global`. Guild commands update instantly; global commands propagate for up to an hour. For a single-community deployment, guild is correct. |

## Discord — per-bot credentials

Each bot needs a token **and** a client id. Three separate applications with
three separate identities; sharing a token between bots is rejected at load.

| Variable                      | Required for | Notes                                |
| ----------------------------- | ------------ | ------------------------------------ |
| `DISCORD_GUARDIAN_TOKEN`      | Guardian     | Bot page → Reset Token               |
| `DISCORD_GUARDIAN_CLIENT_ID`  | Guardian     | General Information → Application ID |
| `DISCORD_COMPANION_TOKEN`     | Companion    |                                      |
| `DISCORD_COMPANION_CLIENT_ID` | Companion    |                                      |
| `DISCORD_LABS_TOKEN`          | Labs         |                                      |
| `DISCORD_LABS_CLIENT_ID`      | Labs         |                                      |

A bot with no token is not an error at platform level — running only Guardian
locally is legitimate. It becomes an error when _that bot_ tries to start.

Rejected at load: duplicate tokens across bots, duplicate client ids, and values
left as `.env.example` placeholders.

## Roles

Right-click each role in **Server Settings → Roles** → **Copy Role ID**.
Guardian requires all seven; the other two start without them.

| Variable             | Role            | Notes                                                                      |
| -------------------- | --------------- | -------------------------------------------------------------------------- |
| `ROLE_FOUNDER`       | ✦ Founder       | Highest staff tier                                                         |
| `ROLE_ADMINISTRATOR` | ◈ Administrator |                                                                            |
| `ROLE_MODERATOR`     | ⟡ Moderator     |                                                                            |
| `ROLE_BLOOM_BOT`     | ◉ Bloom Bot     | The integration role. Must sit below staff and above the onboarding roles. |
| `ROLE_BETA_TESTER`   | ◌ Beta Tester   | Testing access only. Never assigned by a bot.                              |
| `ROLE_EARLY_BLOOM`   | ✧ Early Bloom   | **Onboarding state**, not early access                                     |
| `ROLE_BLOOM_MEMBER`  | ❋ Bloom Member  | Normal verified member                                                     |

Two roles configured to the same id is rejected — it is always a copy-paste
mistake, and it would make Early Bloom and Bloom Member indistinguishable.

## Channels

Right-click each channel → **Copy Channel ID**. Optional individually: a feature
whose channel is unset refuses to run and says so, rather than guessing a
destination.

| Variable                      | Channel               | Used by   |
| ----------------------------- | --------------------- | --------- |
| `CHANNEL_WELCOME`             | #welcome              | Guardian  |
| `CHANNEL_RULES`               | #rules                | Guardian  |
| `CHANNEL_GETTING_STARTED`     | #getting-started      | Guardian  |
| `CHANNEL_ANNOUNCEMENTS`       | #announcements        | Labs      |
| `CHANNEL_RELEASE_NOTES`       | #release-notes        | Labs      |
| `CHANNEL_DEVELOPMENT_UPDATES` | #development-updates  | Labs      |
| `CHANNEL_INTRODUCTIONS`       | #introductions        | Companion |
| `CHANNEL_DAILY_CHECK_IN`      | #daily-check-in       | Companion |
| `CHANNEL_SMALL_WINS`          | #small-wins           | Companion |
| `CHANNEL_ACHIEVEMENTS`        | #achievements         | Companion |
| `CHANNEL_MILESTONES`          | #milestones           | Companion |
| `CHANNEL_BLOOM_REWARDS`       | #bloom-rewards        | Companion |
| `CHANNEL_CHALLENGES`          | #challenges           | Companion |
| `CHANNEL_BETA_TESTING`        | #beta-testing         | Labs      |
| `CHANNEL_FEATURE_TESTING`     | #feature-testing      | Labs      |
| `CHANNEL_FEEDBACK`            | #feedback             | Labs      |
| `CHANNEL_FEATURE_REQUESTS`    | #feature-requests     | Labs      |
| `CHANNEL_VOTING`              | #voting               | Labs      |
| `CHANNEL_FEATURE_STATUS`      | #feature-status       | Labs      |
| `CHANNEL_BUG_REPORTS`         | #bug-reports          | Labs      |
| `CHANNEL_SUPPORT`             | #support              | Labs      |
| `CHANNEL_MODERATION`          | #moderation (private) | Guardian  |
| `CHANNEL_REPORTS`             | #reports (private)    | Guardian  |
| `CHANNEL_INTERNAL`            | #internal (private)   | all       |

The platform resolves channels by id, never by name. A renamed channel keeps
working.

## Feature flags

| Variable                     | Default | Effect                                                                            |
| ---------------------------- | ------- | --------------------------------------------------------------------------------- |
| `FEATURE_SCHEDULED_MESSAGES` | `false` | Master switch for the scheduler. Off means no job fires, whatever its cron says.  |
| `FEATURE_REWARDS`            | `true`  | Bloom Rewards points and ranks.                                                   |
| `FEATURE_GITHUB_INTEGRATION` | `false` | GitHub integration. Behind an interface; no provider wired at Phase 0.            |
| `FEATURE_AI_INTEGRATION`     | `false` | Reserved. There is no live AI chat, by design. `#ai-coach` is a curated showcase. |

`FEATURE_SCHEDULED_MESSAGES=false` is the default because a developer machine
pointed at a shared database should not post into the live server. Turning it on
is a decision.

---

## Verifying

```bash
pnpm diagnostics
```

Prints every resolved value with secrets redacted, reports what is missing, and
exits non-zero on failure.
