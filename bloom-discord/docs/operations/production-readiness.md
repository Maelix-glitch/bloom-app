# Production readiness

An honest account of what is ready, what is not, and what has to be done by a
human before this platform runs in front of members.

The one rule this document follows is the one the whole project follows: it does
not claim anything has been verified that has not been. Several items below are
marked unverified, and that is the useful part.

---

## Status summary

| Area                 | State         | Notes                                                                                |
| -------------------- | ------------- | ------------------------------------------------------------------------------------ |
| Code, types, lint    | ✅ Verified   | 696 tests, 44 files; clean lint, format, both typechecks                             |
| Database schema      | ✅ Verified   | 8 migrations, applied and re-applied against PostgreSQL 17                           |
| Integration tests    | ✅ Verified   | Run against a real PostgreSQL, opt-in flag                                           |
| Data retention       | ✅ Verified   | Nightly job, bounded batches, mutation-tested                                        |
| Member erasure       | ✅ Verified   | CLI exercised end to end: dry run, apply, audit row                                  |
| Container image      | ⚠️ Unverified | Dockerfile reviewed; **never built** — no Docker daemon available                    |
| CI pipeline          | ⚠️ Not active | Written and syntax-checked; needs installing, see [D7](../architecture/decisions.md) |
| Discord gateway      | ❌ Unverified | `discord.com` unreachable from the build environment                                 |
| Command registration | ❌ Unverified | Needs a live token                                                                   |
| Backups / restore    | ❌ Human task | Supabase-managed; must be enabled and rehearsed                                      |

**The honest summary: everything that can be verified without a Discord token
or a Docker daemon has been. Nothing that requires either has been.** That is
the single biggest risk in deploying this, it has been true since Phase 0, and
it is stated in every phase report rather than buried here.

---

## What "unverified" means for the gateway

The platform has never held a live Discord connection. The discord.js adapters
compile, are type-checked against discord.js 14.27, and are covered by tests
through fake adapters — but no interaction has ever made a round trip, no
command has been registered, and no modal has been opened by a real client.

The areas most likely to surface a problem on first contact, in order:

1. **Command registration.** Bulk overwrite, per guild. The failure is loud and
   immediate if it happens.
2. **Modal round trips.** Labs' intake opens modals and routes submissions by
   custom id. The routing is tested; the Discord half is not.
3. **Permission and hierarchy errors.** The runtime checks are written against
   the documented behaviour of the API, not observed behaviour.
4. **Intent gating.** Guardian needs Server Members, which is privileged and has
   to be enabled in the Developer Portal. An unapproved privileged intent closes
   the gateway with code 4014.

Plan the first deploy as a staging guild with two or three staff accounts, not
the member server.

---

## Before first deploy

### Discord Developer Portal

- [ ] Three applications created — Guardian, Companion, Labs
- [ ] **Server Members Intent** enabled for Guardian (privileged)
- [ ] Message Content Intent left **off** for all three — nothing needs it
- [ ] Each bot invited with its own OAuth2 URL and permission integer from
      [the permission matrix](../permissions/bloom-bot-permission-matrix.md)
- [ ] No bot has Administrator

### Roles

- [ ] `◉ Bloom Bot` sits **above** `✧ Early Bloom` and `❋ Bloom Member`, and
      **below** `⟡ Moderator`, `◈ Administrator` and `✦ Founder`
- [ ] Only Guardian holds Manage Roles
- [ ] Every `ROLE_*` id in the environment matches the real role

Get the hierarchy wrong and Guardian cannot assign roles. It will report
`ROLE_HIERARCHY_BLOCKED` with an actionable message rather than failing
silently, which is by design — but it is still a broken onboarding flow.

### Environment

- [ ] All three tokens set, from three separate applications
- [ ] `DISCORD_GUILD_ID` set to the real server
- [ ] `DATABASE_URL` points at the pooler, with `sslmode=require`
- [ ] `BLOOM_ENVIRONMENT=production`, `LOG_PRETTY=false`
- [ ] `BLOOM_VERSION` stamped at build time — CI passes the commit SHA
- [ ] Channel ids configured for every channel a feature posts to. A missing
      channel does not crash anything; the feature logs and continues, which is
      also how it stays invisible

Full list: [environment variables](../reference/environment-variables.md).

### Database

- [ ] `pnpm db:migrate` run against production **before** the bots start. Bots
      do not migrate on boot, deliberately
- [ ] `pnpm db:status` shows no drift
- [ ] Point-in-time recovery enabled on the Supabase project
- [ ] **A restore rehearsed at least once.** An untested backup is a belief

### Commands

- [ ] `pnpm commands:register` run once per bot against the guild
- [ ] `/health` returns `up` for every component before announcing anything to
      members

---

## Operating it

### Health

Each bot serves `/health` and `/ready` on its own port (8080/8081/8082 in the
compose file).

Each process also writes a `system_health` heartbeat every 30 seconds, so every
bot's `/health` reports a `peers` section: what the other two last said about
themselves, with `lastSeenSecondsAgo` and `stale`. Peers never affect the
reporting bot's own status — a crashed Companion must not fail Guardian's
readiness probe.

- `/health` — 200 when up or degraded, 503 when down. Use for liveness.
- `/ready` — 200 only when everything is up. Use for readiness gating.

Every check performs real work: the database check issues a query, the gateway
check reads the live websocket state. A check that cannot be performed reports
`unknown`, which is not the same as `up`. The aggregate is the **worst**
component, never an average — "two of three subsystems are fine" is not useful
when the third is the database.

### Logs

Structured JSON, one object per line, with a correlation id threaded through
every operation. Events worth alerting on:

| Event                      | Severity | Meaning                                              |
| -------------------------- | -------- | ---------------------------------------------------- |
| `database.unreachable`     | fatal    | The bot cannot start or has lost the database        |
| `scheduler.release_failed` | error    | A lease could not be released; it will expire        |
| `jobs.retention.backlog`   | warn     | Retention is not keeping pace                        |
| `role.assign.blocked`      | error    | Hierarchy is wrong — a human must fix it             |
| `interaction.no_response`  | error    | A handler returned nothing; the member saw a failure |

Operator hints appear in logs and never in a member-facing message.

### Rollback

Deployments are image swaps; the database is the stateful part.

- **Code rollback** is safe at any time. Nothing caches schema state in the
  process.
- **Migrations are forward-only.** There are no down migrations, deliberately: a
  down migration that drops a column destroys data on a path only ever taken
  during an incident. Rolling back a schema change means writing a new migration
  that reverses it, or restoring from a backup.

Keep one release's worth of distance between deploying a migration and deploying
code that requires it, and a rollback never needs a schema change.

---

## Known limitations

These are real, and none of them are hidden elsewhere:

1. **No live Discord verification.** Everything in the "unverified" rows above.
2. **The container image has never been built.** No Docker daemon was available.
   The Dockerfile is reviewed, multi-stage, non-root, and the CI job builds and
   inspects it — but the first real build will happen on someone else's machine.
3. **Single-guild assumptions in operations.** The schema is per-guild
   throughout, but the platform's configuration binds one guild, and a global
   job's off switch resolves against it.
4. **Cross-bot health is only as fresh as the last heartbeat.** 30-second
   interval, 90-second staleness window. It answers "was Companion alive a
   minute ago", not "is Companion alive right now" — and it says which of those
   it is answering.
5. **No metrics endpoint.** Health is a status, not a time series. If this needs
   dashboards, that is a Prometheus endpoint and a decision about cardinality,
   not a quick addition.
6. **No alerting.** Logs are structured for it; nothing is wired to a pager.
7. **Labs is intake only.** Cohorts, voting, feature status and release notes are
   not built. [Commands reference](../reference/commands.md) lists what is
   missing and why.
8. **Retention has never run against a large table.** Batching is tested for
   correctness against thousands of rows, not for duration against millions.

---

## What would make this fully production-ready

In the order that actually reduces risk:

1. **A staging guild and one real gateway connection.** Everything in the
   unverified list collapses to verified or to a bug list within an hour.
2. **Install CI** (one command — [see the README](../../ci/github-actions/README.md)).
3. **Build the image once**, run the three containers against a throwaway
   database, hit `/health`.
4. **Rehearse a restore.**
5. **Wire one alert** on `fatal`, and one on `jobs.retention.backlog` persisting
   for three days.

Steps 1 to 3 are a single afternoon and they are the difference between "should
work" and "does work".
