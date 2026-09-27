# Security

What the platform protects against, and how. Each section names the mechanism,
not the intention.

---

## Secrets

**Never committed.** `.env` is git-ignored. `.env.example` contains placeholders
only, and the config loader **rejects those placeholder values at startup** — so
a half-configured deploy fails loudly instead of running with a fake token.

**Never logged.** `@bloom/logging` redacts before writing, not at the call site.
Any field whose key matches a sensitive pattern (`token`, `secret`, `password`,
`authorization`, `*_url` containing credentials, …) is replaced, recursively,
including inside nested context objects. A developer who logs a whole config
object by mistake cannot leak a token — and that mistake is inevitable.

**Never echoed.** Error messages shown to members read `userMessage` only.
`operatorHint`, `details`, `cause` and stack traces never leave the log.

Tokens are per-bot. Sharing one between applications is rejected at load.

---

## Trust boundaries

**Client claims are never trusted.** The authorization subject is built entirely
from the member object on the interaction payload Discord signs — role ids,
computed permissions, guild ownership, highest role position. There is no path
by which a crafted interaction adds a role to that object.

**Ids over names, always.** Channels and roles are resolved by snowflake. A
channel renamed from `#general` to `#the-garden` keeps working; matching on
names would let anyone with Manage Channels redirect a bot's output.

**The role cache is not an authorization source.** `member_roles` is an observed
cache maintained from gateway events. It can be stale by seconds. Every
authorization decision reads the live payload instead — stale authorization data
is a security bug, not a performance trade-off.

---

## Authorization

Four layers, each independently sufficient to stop an over-reach:

1. **OAuth2 install scope.** Companion and Labs are never granted Manage Roles,
   so they cannot write roles even if every code check were bypassed.
2. **Capability manifest.** `BOT_CAPABILITIES` declares what each bot may do;
   `assertCapability` runs in the constructor of anything privileged. Wiring a
   role service into Companion fails at boot.
3. **Command policy.** Evaluated server-side against live roles, before the
   handler runs. Discord's `default_member_permissions` is a visibility hint
   that administrators can override — it is never the boundary.
4. **Target protection.** `checkTarget` refuses self-action, the guild owner,
   any member holding a protected role, and any target whose highest role is at
   or above the actor's. Peers are blocked, not just superiors: two moderators
   able to time each other out is how a dispute becomes a war.

Guild owners bypass role checks — they can already do anything through the
Discord client, and locking them out of the bot would be theatre.

---

## Input handling

**Storage keeps the member's words.** Control characters are stripped and length
is bounded; nothing else. Escaping on the way in produces a database full of
backslashes that read wrong in every export and every audit review.

**Escaping happens at render.** `sanitiseUserText` escapes markdown, neutralises
mentions and truncates, on the way out.

**Mass mentions are disabled at the API level.** Every outbound message sets
`allowedMentions: { parse: [] }`. That is the real control; the string escaping
is defence in depth. A moderation reason quoting `@everyone` is inert.

**Custom ids are validated.** They come back from Discord as routing input, so
their shape is constrained (`bot:feature:action[:arg]`, ≤100 chars) and a
malformed id is rejected at the boundary rather than matched against a route by
accident.

**SQL is always parameterised.** `postgres.js` sends every `${…}` in a tagged
template as a bound parameter. `sql.unsafe` exists in exactly two files — the
migrator and the seeder — both of which read from files on disk, not from user
input.

---

## Privacy

**Private report content is never logged.** A 12-character content fingerprint
is, so two log lines about the same report can be correlated without anyone
reading what was written.

**No command arguments in telemetry.** Knowing `/report` was used is
operationally useful. Storing what someone reported would put private content in
a metrics table.

**Correlation references are truncated.** Members see eight characters, enough
for support to find the log line, not enough to enumerate anything.

**The audit trail is append-only.** No `UPDATE`, no `DELETE`. An audit trail that
can be edited is not an audit trail.

---

## Least privilege

**No Administrator, ever.** It bypasses every channel overwrite, makes the
hierarchy check meaningless, and turns a leaked token into total compromise.
Guardian's startup audit warns if it finds Administrator granted.

**Minimum intents.** `MessageContent` and `GuildPresences` are not requested by
any bot. Only Guardian requests `GuildMembers`, and only because
`guildMemberAdd` is what starts onboarding.

**Role writes are allow-listed.** Guardian may write exactly two role ids. A bug
that passes the Moderator role id gets a refusal, not an escalation.

**The bot role sits below staff.** Enforced by an advisory rather than a check,
because the server still functions — but it removes the possibility of the bot
modifying staff roles at all.

**The container runs as non-root, read-only.** Nothing needs to write to its own
filesystem.

---

## Abuse resistance

**Rate limiting in two tiers.** An in-process token bucket for command spam,
where a restart resetting it is harmless; a database-backed cooldown for
anything where "twice" is a real problem — a reward, a welcome, a scheduled
send. The second is shared by all three bots and survives restarts.

**Durable idempotency.** Anything with a visible side effect claims a key in
Postgres first. Two replicas, or a redelivered gateway event after a resume,
produce one action.

**Job leases.** One replica runs a scheduled job at a time; a crashed process
releases its claim when the lease expires.

**Bounded retries.** Exponential backoff with full jitter, and only for errors
the catalog marks retryable. Hierarchy failures, authorization failures and
validation failures are never retried — retrying produces identical failures
forever.

---

## Never

From the brief, and enforced rather than aspirational:

- No self-bots or automating user accounts.
- No hard-coded tokens, ids or secrets. Config is loaded and validated; ids come
  from the environment.
- No Administrator permission.
- No over-permissioning "just in case". Every permission has a named feature in
  the matrix.
- No logging credentials.
- No exposing private report content or stack traces to members.
- No trusting client-supplied role ids.
- No trusting channel names when an id exists.
- No `eval` or dynamic execution — banned by lint rule.
- No `Math.random()` for ids, tokens or jitter — banned by lint rule; use
  `node:crypto`.

---

## Reporting a vulnerability

Do not open a public issue. Contact a Bloom Labs administrator directly with the
details and a way to reproduce.
