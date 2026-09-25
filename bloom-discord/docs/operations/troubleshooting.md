# Troubleshooting

Start here:

```bash
pnpm diagnostics    # config, connectivity, migration state — exits non-zero on failure
pnpm health         # live component status from a running bot
pnpm db:status      # applied / pending / drifted migrations
```

Every failure the platform raises carries a machine-readable code and an
operator hint written for whoever has to fix it. The codes below are what you
will see in the logs.

---

## Startup

### Process exits immediately with `CONFIGURATION_ERROR`

Configuration failed validation. The message lists **every** problem at once,
not just the first.

Common causes: a value left as an `.env.example` placeholder; `DATABASE_URL`
pointing at something that is not Postgres; two bots sharing a token;
`LOG_PRETTY=true` with `BLOOM_ENVIRONMENT=production`.

### `DATABASE_UNAVAILABLE` at startup

The bot pings the database before connecting to Discord and refuses to continue
if it cannot reach it. A bot that cannot record an audit event must not take
moderation actions.

Check: is the host reachable, are the credentials right, are you using the
Supabase **transaction pooler** URI rather than the direct connection?

### Gateway closes with code **4014**

A privileged intent was requested that is not enabled in the Developer Portal.
Only Guardian requests one — **Server Members**. Enable it on that application's
Bot page.

### `TOKEN_INVALID`

Discord rejected the token. It was reset, or copied with trailing whitespace, or
leaked publicly (Discord invalidates leaked tokens automatically). Reset it on
the Bot page and update the environment.

### `NOT_IMPLEMENTED: … has no commands and no event handlers`

Expected at Phase 0. The bot would come online and do nothing, which looks like
success to everyone watching, so it refuses instead. Infrastructure is complete;
features arrive with the phase that owns them.

### `GUILD_MISMATCH: connected but not a member of guild …`

The bot authenticated but was never invited to the configured server, or
`DISCORD_GUILD_ID` is wrong. Re-invite using the URL from the permission matrix
and re-copy the server id.

---

## Roles

### `ROLE_HIERARCHY_BLOCKED`

The bot's role is not above the role it is trying to assign. The error names
both roles and both positions.

Fix: **Server Settings → Roles**, drag `◉ Bloom Bot` above `✧ Early Bloom` and
`❋ Bloom Member`, and keep it below the staff roles. Full detail in
[role-hierarchy.md](../permissions/role-hierarchy.md).

This error is **never retried**. Retrying produces identical failures forever.

### Discord returns "Missing Permissions" on a role change

Discord uses one error for two different causes: the bot lacks Manage Roles, or
the target role is above it. Check the ordering first — it is the usual cause,
and it changes whenever someone reorders roles.

### `ROLE_NOT_FOUND`

A configured role id does not exist. The role was deleted, or the id was
mistyped. `pnpm diagnostics` lists every configured role.

### `UNAUTHORIZED: role writes are limited to …`

Something asked the platform to assign a role outside the allow-list. Guardian
may only write `✧ Early Bloom` and `❋ Bloom Member`. This is working as
designed — it means a bug passed the wrong role id rather than escalating
privilege.

---

## Commands

### Commands do not appear in Discord

- Never registered: `pnpm commands:register --bot <name>`.
- Registered globally: global commands propagate for up to an hour. Use guild
  scope.
- Registered to the wrong guild: check `DISCORD_GUILD_ID`.
- Hidden by `default_member_permissions`: staff commands default to visible to
  nobody until an administrator grants them.

### "This interaction failed"

Discord shows this when a bot does not acknowledge within three seconds, or
throws before responding. The dispatcher is built so this should not happen —
every path ends in a reply or a logged explanation of why one was impossible.

Search the logs for `command.failed` or `command.response_failed` with the
correlation id from the member's error message (the eight-character
**Reference**).

### `Refusing to register an empty command set`

Deliberate. An empty bulk overwrite deletes every command the application has.
If that really is the intent, pass `--allow-empty`.

---

## Messages

### `CHANNEL_NOT_FOUND`

The channel id is wrong, or the bot cannot see the channel. Channel-level
permission overwrites take precedence over the server-wide role, so a private
channel needs the bot added to it explicitly.

### `BOT_MISSING_PERMISSION` for one channel only

Almost always a channel overwrite. The bot's role needs View Channel, Send
Messages and Embed Links **on that channel**.

### Direct messages are not arriving

Normal, and not an error. Most people have server DMs disabled. `sendDirectMessage`
returns `false` rather than throwing, and any feature depending on a DM needs a
channel-based fallback.

---

## Scheduled jobs

Start with `/guardian jobs list` and `/guardian jobs history <job>`; between them
they answer most of this section without touching a log aggregator. Full detail:
[Scheduled jobs](scheduled-jobs.md).

### A job never runs

- `FEATURE_SCHEDULED_MESSAGES` defaults to **false**. `jobs list` says so
  explicitly when it is off.
- The individual job may be disabled by configuration — most often because the
  channel it posts to is unconfigured.
- Somebody may have run `jobs disable` for this server. The listing names which
  of the four layers is responsible, so read the reason rather than the word
  "disabled"; `jobs enable <job>` reverses only the last of them, and says so
  when one of the others still blocks the job.
- Check `BLOOM_TIMEZONE`. A job scheduled for `0 9 * * *` in the wrong zone has
  run, just not when you were watching.
- Check `scheduler.started` in the logs for the enabled count.

### `scheduler.gate_unavailable` in the logs, and nothing ran

The per-server switch could not be read, so the job **failed closed** and did not
run. This is a database problem, not a scheduler problem — look for
`DATABASE_UNAVAILABLE` around the same correlation id. Running on the assumption
that the job was probably allowed would let an outage re-enable something an
administrator switched off, which is why it skips instead.

### A job logs `scheduler.lock_held` and skips

Another replica holds the lease. Normal in a multi-replica deployment — exactly
what the lock is for.

### A job is stuck and never runs again

A process crashed while holding a lease. The lease expires on its own; until
then the job is blocked. `reclaimExpired` marks lapsed runs `timed_out` on the
next cycle — `timed_out` rather than `failed`, because the job never reported
back at all, which points at a kill rather than a bug.

### `scheduler.lease_lost` in the logs

A renewal was refused while the job was still running, meaning another process
may already have picked the job up. The job took longer than its lease and the
heartbeat could not keep ahead of it. Raise that job's `leaseSeconds` above its
realistic worst case; the heartbeat renews at half the lease, so a lease of 120s
tolerates one missed renewal but not a 10-minute run.

### `jobs disable` succeeded but the job ran anyway

It should not, and the switch is re-read on every tick rather than cached, so a
stale process is not the explanation. Check that you disabled it on the right
bot: `bot_settings` is keyed by `(guild_id, bot_name, key)`, and disabling
`companion.checkin.daily_prompt` through `/guardian jobs disable` would write a
Guardian row that Companion never reads. Guardian's listing only shows Guardian's
jobs, so this is hard to do by accident, but a direct database write can.

### The same message was posted twice

The lock prevents two _concurrent_ runs, not two sequential ones. A redeploy near
the scheduled minute, a reclaimed lease, or a manual `jobs run` can all
produce a second run, and the job's own cooldown claim is what makes it post
once. Check that the job claims its cooldown **before** sending rather than
after.

---

## Database

### `Checksum drift in …`

An already-applied migration was edited. The edit will never run in an
environment that applied the original, so two databases now differ while
claiming the same version.

Do **not** "fix" this by deleting the ledger row. Revert the file to its applied
content and write a new numbered migration for the change.

### `DUPLICATE_OPERATION`

An idempotency key was already claimed. The action ran once; the second attempt
was suppressed. Usually correct behaviour, not a fault.

---

## Reading the logs

Every line is JSON with `correlation_id`, `bot_name`, `event`, `severity`,
`environment` and `version`.

```bash
# Everything from one operation
jq 'select(.correlation_id == "abc123…")' logs.jsonl

# All failures
jq 'select(.severity == "error" or .severity == "fatal")' logs.jsonl

# One member's activity
jq 'select(.actor_id == "900000000000001005")' logs.jsonl
```

The eight-character **Reference** in a member-facing error message is the first
eight characters of the correlation id. That is the intended support workflow:
the member reads out a short reference, staff find the exact log line, and no
internal detail was ever shown to the member.
