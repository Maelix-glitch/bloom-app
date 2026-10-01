# Bloom Discord — production checklist

Everything required to run this platform in front of real members, in the
order you need it.

This document does not claim anything has been verified that has not been.
Where something is unverified it says so, because a checklist that marks an
untested step "done" is worse than no checklist — it tells you to stop
looking.

**Scope note.** This covers the three Discord bots and their PostgreSQL
schema. It does not cover the main Bloom web or mobile application, and the
main Bloom product database is deliberately not connected. See
[Known V1 limitations](#known-v1-limitations).

---

## 1. Prerequisites

| Requirement    | Version / detail                                         |
| -------------- | -------------------------------------------------------- |
| Node.js        | 24.17.0 or newer (`engines.node`)                        |
| pnpm           | 10 or newer                                              |
| PostgreSQL     | 15+ (Supabase-managed is the target)                     |
| Container host | Any Docker engine supporting Compose v2                  |
| Discord        | Three applications, one per bot, in the Developer Portal |

Three separate Discord applications, not one with three tokens. The whole
isolation model — different permissions, different intents, different blast
radius — depends on them being different identities.

---

## 2. Discord permissions

Each bot is invited with its own permission integer. Do not invite with
Administrator; it defeats every other control here and cannot be scoped back.

| Bot       | Permission integer | Carries                                                        |
| --------- | ------------------ | -------------------------------------------------------------- |
| Guardian  | `1497064631542`    | Manage Roles, Kick, Ban, Moderate Members, Manage Guild, audit |
| Companion | `319975148608`     | Send messages, embeds, threads. **No Manage Roles.**           |
| Labs      | `380104723520`     | Send messages, embeds, threads. **No Manage Roles.**           |

**Guardian is the only bot with Manage Roles.** If Companion or Labs is ever
invited with it, the role lifecycle has two owners and the audit trail stops
meaning anything. Re-invite with the correct integer rather than editing the
role in the server.

Guardian's role must sit **above** `✧ Early Bloom` and `❋ Bloom Member` in the
server's role list. Discord refuses role changes from a bot whose highest role
is not above the target, and the failure is a runtime error on the first
member who verifies, not a startup error.

---

## 3. Required intents

Enable in the Developer Portal, per application. Requesting a privileged
intent that has not been approved closes the gateway with **close code 4014**
and the bot never reaches ready.

| Intent                      | Guardian | Companion | Labs | Why                                         |
| --------------------------- | :------: | :-------: | :--: | ------------------------------------------- |
| `Guilds`                    |    ✅    |    ✅     |  ✅  | Channel and role cache                      |
| `GuildMembers` (privileged) |    ✅    |     —     |  —   | Join events, role lifecycle                 |
| `GuildInvites`              |    ✅    |     —     |  —   | Invite-use diffing for referral attribution |
| `GuildModeration`           |    ✅    |     —     |  —   | Ban/unban events                            |
| `MessageContent`            |    —     |     —     |  —   | **Not used.** Not requested by any bot.     |

Message Content is deliberately absent. Nothing in the platform reads message
text; AutoMod handles content matching server-side, and AutoMod execution
events are delivered on the strength of Manage Guild rather than a privileged
intent.

---

## 4. Environment variables

Templates live in `deploy/env/*.env.example`. Copy each to the matching
`.env` and fill it in. Those files are git-ignored — verify with
`git check-ignore deploy/env/guardian.env` before you start.

**One file per service.** Guardian's file must not contain Companion's token,
Labs' token, or the migration credential. The application narrows this in
memory too (`resolveBotConfig` hands each bot only its own credentials), but
the container boundary is where it is actually enforced.

| File            | Holds                                                  |
| --------------- | ------------------------------------------------------ |
| `guardian.env`  | Guardian token + `bloom_guardian` DSN + roles/channels |
| `companion.env` | Companion token + `bloom_companion` DSN + channels     |
| `labs.env`      | Labs token + `bloom_labs` DSN + channels               |
| `migrate.env`   | `bloom_migrator` DSN only. **No Discord token.**       |

Startup fails closed. `DATABASE_URL` and the guild id are required
unconditionally, each bot's own token is required by `resolveBotConfig`, and
every role or channel a bot depends on is checked before it connects. A
missing value stops the process with the variable name and how to find it; it
never starts degraded.

---

## 5. Database setup

### 5.1 Apply the schema

```bash
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

Twelve migrations, applied in filename order, each in a transaction behind an
advisory lock. Re-running is a no-op.

**Verified reproducible.** Replaying all twelve into an empty schema produces
a schema identical to a live one — 284 columns, 155 constraints, 84 indexes
and 8 triggers all matching. The only difference is `schema_migrations`
itself, which the runner creates rather than a migration. This means a
restore-then-migrate rebuild is predictable rather than hopeful.

### 5.2 Apply database isolation — do not skip

```bash
psql "$SUPERUSER_DATABASE_URL" -f database/security/0001_runtime_roles.sql
```

Then set the four passwords (step 10 of that file) and put each into the
matching `deploy/env/*.env`.

Until this runs, all three bots connect as the same user and the isolation
between them is a TypeScript claim rather than something the database
enforces. After it runs:

- Guardian cannot read the points ledger, a check-in, an award or an event
  participant.
- Companion cannot read a moderation case, a report, or onboarding state.
- Companion **cannot create a referral** — only settle one Guardian recorded.
  That is the one fraud the handoff is exposed to.
- Labs can reach nothing but its own four tables.
- No bot can `UPDATE` or `DELETE` an audit row.
- No bot can create, alter, drop or truncate anything.
- `bloom_migrator` is reachable from no runtime role.

Guardian holds one deliberate exception: **column-level** `UPDATE` on the
member-authored text columns of `point_events`, `feedback`, `bug_reports` and
`reports`, so the right-to-erasure path can scrub what a member wrote. It can
blank a reason; it cannot read or change a point value.

Verify with:

```bash
BLOOM_INTEGRATION_TESTS=1 pnpm exec vitest run packages/database/src/privileges
```

57 assertions, run against a real database. It also fails if a migration adds
a table that nobody has made a grant decision about.

### 5.3 Connection settings

Use the Supabase **transaction pooler** (port 6543), not the direct
connection. `DATABASE_MAX_CONNECTIONS` defaults to 5 per bot; the three bots
plus overhead must stay inside the project's pooler ceiling.

---

## 6. Backup procedure

Backups are a **human responsibility that has not been exercised by this
project**. Nothing in this repository takes, stores or verifies a backup, and
no dump has ever been produced from a production database here.

1. **Enable Supabase PITR** on the project. Daily snapshots alone lose up to
   24 hours of points, cases and referrals.
2. **Take a manual pre-deploy dump** before any migration:
   ```bash
   pg_dump --schema=bloom_discord --no-owner --no-privileges \
           --file="bloom-$(date -u +%Y%m%dT%H%M%SZ).sql" "$DATABASE_URL"
   ```
3. **Store it off the database host**, encrypted, with a retention period
   that matches the data-retention policy in
   [`data-retention.md`](./data-retention.md).
4. **Never commit a dump.** It contains member identifiers, report text and
   case notes. `.gitignore` does not currently pattern-match `*.sql` dumps —
   write them outside the repository.

### Restore procedure

1. Stop all three bots: `docker compose -f docker-compose.prod.yml stop`.
   Leaving them running during a restore means they write into a database
   that is being replaced underneath them.
2. Restore the snapshot or dump into the target database.
3. Run migrations — they are idempotent and will no-op if the dump was current:
   `docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate`
4. Re-apply `database/security/0001_runtime_roles.sql`. **A restore does not
   preserve grants made outside the dump**, and `--no-privileges` explicitly
   drops them. Skipping this leaves the bots unable to connect, or worse,
   connecting with whatever the restore left behind.
5. Start the bots and confirm `/ready` returns 200 on all three.

**Unrehearsed.** Steps 2–5 have never been executed against a real Supabase
project. Rehearse against a staging copy before relying on them.

---

## 7. Startup

```bash
docker build -t bloom-discord:latest --build-arg BLOOM_VERSION="$(git rev-parse --short HEAD)" .
docker compose -f docker-compose.prod.yml up -d
```

Startup order inside each process, all of it before the gateway connects:

1. Config loads and validates. Missing or malformed values stop here.
2. The database pool opens and is pinged.
3. Repositories are constructed — only the ones that bot's capability
   manifest allows.
4. Features register. **A bot with no commands, no event handlers and no jobs
   refuses to start**, because a process that shows as online while doing
   nothing looks like success to everyone watching.
5. Signal handlers install.
6. The health server binds.
7. Only then: the gateway connects.

`BLOOM_VERSION` should be the commit SHA. Without it every build reports the
same version string and "which build is running" cannot be answered from the
running system.

---

## 8. Health checks

| Endpoint  | Returns                                    | Use                     |
| --------- | ------------------------------------------ | ----------------------- |
| `/health` | 200 when up **or degraded**, 503 when down | Liveness                |
| `/ready`  | 200 **only** when every dependency is up   | Readiness / load gating |

Ports: Guardian 8080, Companion 8081, Labs 8082 — all bound to `127.0.0.1`.
Health is for the host's agent, not the internet.

Each process also writes a heartbeat row to `system_health` every 30 seconds.
That is per process and not a scheduled job, deliberately: a leased job would
mean one bot asserting the other two are alive.

A bot reporting `degraded` is reaching Discord but not PostgreSQL, or the
reverse. It is not ready and `/ready` says so.

---

## 9. Rollback

The platform is three stateless processes over one database, so rollback
splits cleanly:

**Code only** (no migration since the last release):

```bash
BLOOM_IMAGE=bloom-discord:<previous-sha> \
  docker compose -f docker-compose.prod.yml up -d
```

Roll back one bot at a time if you can. They are independent processes and a
fault is usually in one of them.

**Code plus schema.** There are no down-migrations, and that is deliberate: a
down-migration that drops a column destroys data that the rolled-back code
cannot restore. Recover forward instead —

1. Roll the code back to the previous image.
2. Leave the schema in place. Every migration so far is additive, so older
   code runs against a newer schema.
3. If the new schema is genuinely incompatible, restore from the pre-deploy
   dump taken in step 6.2 and accept the data loss window, which is why that
   dump is step 2 of the backup procedure rather than an afterthought.

**Verify after any rollback:** `/ready` on all three, then
`/guardian jobs list` and `/companion jobs list` to confirm the schedulers
came back and nothing is stuck claimed.

---

## 10. Known V1 limitations

Documented because they are design decisions or honest gaps, not because they
are about to be fixed. Several are the direct consequence of a choice made
earlier and recorded here so nobody rediscovers them during an incident.

### Explicitly called out

- **Event participation is join-based, not verified attendance.** Joining an
  event is the participation record. When staff close an event as
  _completed_, everyone who joined before it ended is paid — including
  someone who signed up and never appeared. There is no attendance check, and
  the reward wording avoids claiming one.
- **Invite attribution can be unavailable.** Referral attribution works by
  diffing two REST readings of the guild's invite list; Discord never pushes
  a use-count change. If the gateway is down when a member joins, or two
  invites advance between readings, the referral is recorded as
  **unattributed** rather than guessed. Installs that predate the
  `GuildInvites` intent must re-invite Guardian or attribution degrades to
  `unavailable`.
- **No automatic activity close.** A challenge or event whose window has
  passed stays open until staff close it. Nothing sweeps expired activities,
  so an unclosed event pays nobody until someone acts.
- **No pagination anywhere.** Every list is bounded by a hard cap (25 rows
  for most lists, 100 for participants, 200 for case actions, 1000 for role
  membership). Past the cap, results are **silently truncated** — there is no
  "showing 25 of 94" line, because there is no count query behind it.
- **No main Bloom database integration.** The Bloom product database is not
  connected. `BloomRewardsPort` exists and is deliberately unwired;
  `StaffMemberProfile.progression` is typed `null`. The server's nine ranks
  and the app's twelve seasons are separate ladders and do not sync.

### Also worth knowing

- **Achievements never pay points.** Recognition and currency are separate by
  standing decision. The payment path exists, is tested, and is set by no
  shipped award definition.
- **Retry is manual for event payments.** `/companion admin
event-retry-payments` exists; no background sweep reconciles them.
- **Challenge evaluation is pull-based.** Progress is recalculated when a
  member or staff member asks, not on a schedule.
- **A weekly recap that fails is skipped, not retried.** A digest arriving
  nine days late is noise. Operators can run it by hand.
- **`author_id` is over-redacted in logs.** The redactor matches the `auth`
  fragment, so a field named `author_id` is redacted. Fail-safe, mildly
  annoying.
- **`botHasPermission` is a dead export** and treats Administrator as holding
  everything. Nothing calls it.
- **AutoMod execution events are deliverable and nothing consumes them.**
- **Channel and role overrides are unwired.** The settings repository can
  read and write them; no command does. Only Guardian holds write grants.
- **The gateway has never been connected.** No interaction has made a round
  trip, no command has been registered against a live application, and no
  container image has been built or run — `discord.com` and the Docker daemon
  are both unavailable from the build environment. This remains the single
  largest unverified area, and it has been true since Phase 0.

---

## 11. Pre-flight

Run in order. Every one of these passes today except where marked.

```bash
pnpm run format:check
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm exec tsc -p tsconfig.test.json     # typechecks tests; build does not
pnpm run test                            # unit
BLOOM_INTEGRATION_TESTS=1 pnpm run test  # + integration, needs PostgreSQL
```

Then, against the target database:

```bash
pnpm db:status      # migrations applied
pnpm diagnostics    # config, roles, channels, permissions — no secrets printed
```

Finally, by hand:

- [ ] All three bots show online.
- [ ] `/ready` returns 200 on 8080, 8081, 8082.
- [ ] Guardian's role sits above `✧ Early Bloom` and `❋ Bloom Member`.
- [ ] Commands registered for all three applications.
- [ ] A test member can verify and receives `✧ Early Bloom`.
- [ ] Supabase PITR is on.
- [ ] A restore has been rehearsed on a staging copy. **(Never done.)**
