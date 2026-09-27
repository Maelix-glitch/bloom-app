# Deployment

Three bots, one image, one database.

## Shape

The three applications are separate processes, not one process running three
clients. A crash in Guardian must not take the community bot offline with it,
and they deploy and scale independently.

They share one image. The applications differ only in which entry point runs, so
three images would mean three copies of the same layers and three chances for
them to drift. `BOT` selects the entry point at run time.

```
                 ┌──────────────┐
                 │  PostgreSQL  │   schema: bloom_discord
                 └──────┬───────┘
          ┌─────────────┼─────────────┐
   ┌──────┴─────┐ ┌─────┴──────┐ ┌────┴───────┐
   │  guardian  │ │ companion  │ │    labs    │
   │  :8080     │ │  :8081     │ │  :8082     │
   └────────────┘ └────────────┘ └────────────┘
```

## Build

```bash
docker build -t bloom-discord:$(git rev-parse --short HEAD) .
```

Three stages: dependency install (cached on manifests alone), TypeScript build
plus `pnpm prune --prod`, and a slim runtime. The runtime runs as the non-root
`node` user with a read-only filesystem.

`tini` is PID 1. Without an init, PID 1 ignores `SIGTERM` by default and the
container is killed after the grace period — the graceful shutdown path never
runs, and any held job lease is abandoned rather than released.

## Run

```bash
docker run --rm \
  --env-file .env \
  -e BOT=guardian \
  -e HEALTH_PORT=8080 \
  -p 127.0.0.1:8080:8080 \
  bloom-discord:latest
```

Or the whole stack:

```bash
docker compose up -d
docker compose logs -f guardian
```

Compose runs `migrate` to completion before the bots start, and gates everything
on `pg_isready` rather than a sleep — the bots refuse to start without a
database, so "probably up by now" turns into a restart loop.

## Order of operations

1. **Migrate.** Migrations are forward-only, idempotent and take an advisory
   lock, so it is safe to run from every replica simultaneously.
2. **Register commands.** `pnpm commands:register --bot all`. Bulk overwrite, so
   it is safe to repeat; it diffs first and sends nothing when unchanged.
3. **Start the bots.** Each validates configuration, pings the database, then
   connects to Discord.

Run migrations as a job that must succeed before the new bots start. A bot
expecting a column that does not exist yet fails on its first query.

## Health

| Endpoint      | Meaning                            | Codes                                  |
| ------------- | ---------------------------------- | -------------------------------------- |
| `GET /health` | Liveness. Full component snapshot. | 200 when up or degraded, 503 when down |
| `GET /ready`  | Readiness.                         | 200 only when everything is up         |

Every component is checked for real: the database check issues a query, the
gateway check reads live websocket state. A check that cannot be performed
reports `unknown`, which is not the same as `up`. The aggregate is the **worst**
component, never an average — "two of three subsystems are fine" is not useful
when the third is the database.

```json
{
  "status": "up",
  "bot": "guardian",
  "version": "1.4.0",
  "environment": "production",
  "uptimeSeconds": 3812,
  "components": {
    "discord_gateway": { "status": "up", "detail": "Connected.", "latencyMs": 48 },
    "database": { "status": "up", "detail": "Reachable.", "latencyMs": 7 }
  }
}
```

`HEALTH_PORT` unset means no HTTP surface at all, which is correct for local
development.

## Shutdown

`SIGTERM` → stop the scheduler and wait up to 30s for in-flight jobs (so leases
are released rather than abandoned) → close the health server → close the
gateway → close the database pool → exit 0.

Give the orchestrator a grace period above 30 seconds. Kubernetes:

```yaml
terminationGracePeriodSeconds: 45
```

## Configuration in production

Never bake `.env` into the image. Use the platform's secret mechanism —
Kubernetes Secrets, Fly secrets, Railway variables — and inject at run time.

Required in production:

```
NODE_ENV=production
BLOOM_ENVIRONMENT=production
BLOOM_VERSION=<git sha>
LOG_LEVEL=info
LOG_PRETTY=false        # rejected if true in production
DATABASE_URL=<pooler uri>
DISCORD_GUILD_ID=<id>
DISCORD_<BOT>_TOKEN / _CLIENT_ID
ROLE_*                  # all seven, for Guardian
CHANNEL_*               # per feature
HEALTH_PORT=8080
```

Full list: [environment-variables.md](../reference/environment-variables.md).

## Scaling

**Vertical first.** A Discord bot for one community is not CPU-bound. One
replica per bot is the right answer for a long time.

**If you do run multiple replicas**, the platform is ready: job leases and
database-backed idempotency mean one replica acts. But every replica maintains
its own gateway connection and its own cache, so until the guild is large enough
to need sharding, more replicas mostly buys redundancy rather than throughput.

**Sharding** becomes mandatory past 2,500 guilds. Bloom serves one, so it is not
a consideration.

## Database

`DATABASE_MAX_CONNECTIONS` defaults to 5 per process. Three bots is 15 against
the pooler's limit. Supabase's transaction pooler caps this, so raise it
deliberately and watch `pg_stat_activity` — every connection carries
`application_name=bloom-<bot>`, which is how you find the noisy one.

`prepare: false` is required for the transaction pooler: prepared statements are
per-session and the pooler does not guarantee session affinity.

## Rollback

1. Redeploy the previous image tag.
2. **Do not roll migrations back automatically.** Forward-only is the rule. If a
   migration must be undone, write a new numbered migration that undoes it —
   reversing in place leaves environments disagreeing about the schema version.
3. Commands are a bulk overwrite; re-running the previous version's registration
   restores the previous set.

## Monitoring

Every log line is JSON with `correlation_id`, `bot_name`, `event`, `severity`,
`environment`, `version`.

Worth alerting on:

| Signal                                           | Why                                               |
| ------------------------------------------------ | ------------------------------------------------- |
| `severity: fatal`                                | Process is exiting                                |
| `error_code: DATABASE_UNAVAILABLE`               | Sustained means an outage                         |
| `gateway.disconnected` without `gateway.resumed` | Bot is offline                                    |
| `/health` returning 503                          | Component down                                    |
| `error_code: ROLE_HIERARCHY_BLOCKED`             | Someone reordered the roles; onboarding is broken |
| `scheduler.overlap`                              | A job is outrunning its schedule                  |

`command_telemetry` carries per-command outcome and duration, with no arguments
stored.
