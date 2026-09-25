# Staging runbook

The steps that require a real Discord connection, written so they can be done
once, in order, in about half an hour. Everything before them is automated —
see [staging validation](./staging-validation.md) for what has already been
checked and what has not.

> **Do not use production credentials.** Create three _staging_ applications and
> a private staging guild. The tokens go in `.env`, which is gitignored and must
> stay that way. Never paste a token into a chat, an issue, or a commit.

---

## Before you start

You need:

- A private Discord server nobody else is in (your own is fine)
- Three Discord applications — Guardian, Companion, Labs
- Node 24.17+, pnpm, and a PostgreSQL you can throw away

```bash
cd bloom-discord
./scripts/staging/setup-staging.sh     # scratch PostgreSQL + placeholder .env
pnpm install --frozen-lockfile
pnpm build
pnpm db:migrate
./scripts/staging/validate-staging.sh  # 29 checks, none need Discord
```

If that last command does not print `0 failed`, stop. None of what follows will
work, and the failure is easier to read here than through a gateway.

---

## 1. Create the three applications

<https://discord.com/developers/applications> → **New Application**, three
times. Name them so you can tell them apart in a log: `Bloom Guardian
(staging)` and so on.

For each: **Bot** → **Reset Token** → copy it straight into `.env`.

| Application | `.env` key                |
| ----------- | ------------------------- |
| Guardian    | `DISCORD_GUARDIAN_TOKEN`  |
| Companion   | `DISCORD_COMPANION_TOKEN` |
| Labs        | `DISCORD_LABS_TOKEN`      |

Also copy each **Application ID** into the matching `DISCORD_*_CLIENT_ID`.

Configuration rejects two bots sharing a token, so a copy-paste mistake here
fails at startup with a message naming the duplicate rather than producing two
processes fighting over one gateway session.

### Intents

**Guardian only:** Bot → Privileged Gateway Intents → **Server Members
Intent** → on. Leave Presence and **Message Content** off for all three — the
platform requests neither, and Message Content is not needed by any feature.

If you enable a privileged intent in code but not in the portal, the gateway
closes with **code 4014** and the log says so.

---

## 2. Invite the bots

Use the permission integers from
[the permission matrix](../permissions/bloom-bot-permission-matrix.md):

| Bot       | Permissions     |
| --------- | --------------- |
| Guardian  | `1497064631510` |
| Companion | `319975148608`  |
| Labs      | `380104723520`  |

```
https://discord.com/api/oauth2/authorize
  ?client_id=<APPLICATION_ID>
  &scope=bot%20applications.commands
  &permissions=<INTEGER>
  &guild_id=<YOUR_STAGING_GUILD_ID>
```

Do not tick Administrator. If a bot cannot do something, the permission matrix
says which bit it needs and why.

---

## 3. Create the roles

Server Settings → Roles. Create all seven, **in this order top to bottom**:

```
✦ Founder
◈ Administrator
⟡ Moderator
◉ Bloom Bot          ← the bots' role must sit here
◌ Beta Tester
✧ Early Bloom
❋ Bloom Member
@everyone
```

`◉ Bloom Bot` above `✧ Early Bloom` and `❋ Bloom Member`, below the staff roles.
Guardian cannot assign a role positioned above its own, and it will tell you so
with `ROLE_HIERARCHY_BLOCKED` rather than failing quietly.

Enable Developer Mode (User Settings → Advanced), then right-click each role →
**Copy Role ID** into the `ROLE_*` keys in `.env`. Do the same for channels and
the `CHANNEL_*` keys — a feature with no configured destination refuses to post
rather than guessing.

Finally set `DISCORD_GUILD_ID` to the staging guild's id.

```bash
pnpm diagnostics     # every id, checked, before anything connects
```

---

## 4. Connect Guardian — **step 6 of the validation**

```bash
HEALTH_PORT=8080 node apps/guardian/dist/main.js
```

Expected, in order:

```
startup.config_loaded
startup.database_ready
startup.features_ready       9 command(s) … 2 scheduled job(s)
health.listening
gateway.privileged_intents   Requesting privileged intent(s): GuildMembers
runtime.ready                Connected as <name>#<discriminator>
```

If it stops at `gateway.privileged_intents` with close code **4014**, the Server
Members Intent is not enabled in the portal.

**What to record:** that `runtime.ready` appeared, and the application id it
reports.

---

## 5. Readiness lifecycle — **step 7**

With the bot running, in another shell:

```bash
curl -s localhost:8080/health | jq
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/ready
```

`/ready` must be **200**, and `discord_gateway` must report `up` with a real
`pingMs`. Before the gateway connects, the same endpoint reports `down` — that
is the behaviour that was validated offline, and here you are confirming the
other half of it.

Then stop the bot with Ctrl-C and confirm the shutdown sequence logs
`shutdown.signal`, `scheduler.stopped`, `runtime.stopped` — in that order,
because a lease released after the database closes is a lease that never gets
released.

---

## 6. Register commands — **step 8**

```bash
pnpm commands:register -- --bot guardian
```

Registration is a **bulk overwrite** against the guild, so it is idempotent: run
it twice and the second run changes nothing. Guild-scoped commands appear
immediately; global commands can take an hour, which is why staging uses guild
scope.

Confirm in Discord that `/verify`, `/warn`, `/timeout`, `/kick`, `/ban`,
`/purge`, `/report` and `/guardian` appear.

---

## 7. Execute a real command — **step 9**

The safest first command mutates nothing a member can see:

```
/guardian status
```

Then something that writes. `/verify` on your own account is the best single
test, because it exercises the whole spine: authorization, the hierarchy check,
a role write, a database transition, and an audit row.

Watch the log. One interaction produces a run of lines sharing a
`correlation_id`.

---

## 8. Verify the database mutation — **step 10**

```bash
psql "$DATABASE_URL" -c "
  SELECT user_id, from_state, to_state, created_at
  FROM bloom_discord.onboarding_transitions
  ORDER BY created_at DESC LIMIT 5;"

psql "$DATABASE_URL" -c "
  SELECT action, actor_id, target_id, correlation_id, created_at
  FROM bloom_discord.audit_events
  ORDER BY created_at DESC LIMIT 5;"
```

You are checking three things:

1. The transition row exists and the states are right.
2. An audit row exists for the same action.
3. The `correlation_id` in the audit row **matches the one in the logs** for
   that interaction. That is the property that makes an incident traceable, and
   it has never been confirmed against a real interaction.

Then run it again. `/verify` a second time must **not** produce a second
transition — the idempotency guard should make it a no-op with a calm message.

---

## 9. All three at once — **step 12, the live half**

```bash
HEALTH_PORT=8080 node apps/guardian/dist/main.js  &
HEALTH_PORT=8081 node apps/companion/dist/main.js &
HEALTH_PORT=8082 node apps/labs/dist/main.js      &
```

Then:

```bash
curl -s localhost:8080/health | jq '.peers'
```

Guardian should report Companion and Labs as peers with a small
`lastSeenSecondsAgo` and `stale: false`. Kill Companion and watch its peer entry
go stale after 90 seconds — while Guardian and Labs keep working. That is the
independence guarantee, observed rather than asserted.

---

## When it is done

Update [the capability matrix](../architecture/capability-matrix.md). The
gateway, registration and interaction rows can move to **Built** only once this
runbook has actually been executed — a passing test suite is not evidence of a
live integration, and the matrix says so.

Record what broke. The first real connection always finds something, and that
list is more valuable than the fact that it eventually worked.
