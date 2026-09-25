# Bloom bot permission matrix

Every Discord permission requested by every bot, with the feature that needs it
and what breaks if it is removed. A permission that cannot be justified in this
table is not requested.

**Administrator is never requested by any Bloom bot.** It bypasses every channel
overwrite, makes this document meaningless, and turns a leaked token into total
server compromise. If a bot appears to need it, the real problem is a role
position or a channel overwrite.

---

## Summary

| Permission                         | Bit       | Guardian | Companion | Labs |
| ---------------------------------- | --------- | :------: | :-------: | :--: |
| View Channels                      | `1 << 10` |    ✅    |    ✅     |  ✅  |
| Send Messages                      | `1 << 11` |    ✅    |    ✅     |  ✅  |
| Send Messages in Threads           | `1 << 38` |    ✅    |    ✅     |  ✅  |
| Embed Links                        | `1 << 14` |    ✅    |    ✅     |  ✅  |
| Read Message History               | `1 << 16` |    ✅    |    ✅     |  ✅  |
| Use Application Commands           | `1 << 31` |    ✅    |    ✅     |  ✅  |
| Add Reactions                      | `1 << 6`  |    ✅    |    ✅     |  ✅  |
| Manage Roles                       | `1 << 28` |    ✅    |    ❌     |  ❌  |
| Kick Members                       | `1 << 1`  |    ✅    |    ❌     |  ❌  |
| Ban Members                        | `1 << 2`  |    ✅    |    ❌     |  ❌  |
| Timeout Members (Moderate Members) | `1 << 40` |    ✅    |    ❌     |  ❌  |
| Manage Messages                    | `1 << 13` |    ✅    |    ❌     |  ❌  |
| Manage Channels                    | `1 << 4`  |    ✅    |    ❌     |  ❌  |
| View Audit Log                     | `1 << 7`  |    ✅    |    ❌     |  ❌  |
| Create Public Threads              | `1 << 35` |    ✅    |    ✅     |  ✅  |
| Create Private Threads             | `1 << 36` |    ✅    |    ❌     |  ✅  |
| Manage Threads                     | `1 << 34` |    ✅    |    ❌     |  ❌  |
| Attach Files                       | `1 << 15` |    ❌    |    ❌     |  ✅  |
| Manage Events                      | `1 << 33` |    ❌    |    ✅     |  ❌  |
| Mention Everyone                   | `1 << 17` |    ❌    |    ❌     |  ❌  |
| Manage Webhooks                    | `1 << 29` |    ❌    |    ❌     |  ❌  |
| Manage Guild                       | `1 << 5`  |    ❌    |    ❌     |  ❌  |
| Administrator                      | `1 << 3`  |    ❌    |    ❌     |  ❌  |

Discord serialises permissions as decimal **strings** in API v8 and later.

---

## Shared baseline

Requested by all three bots.

| Permission                   | Why                                                                                                                                                                                          | Without it                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **View Channels**            | A bot cannot post into, or resolve, a channel it cannot see. Channel-level overwrites take precedence over the server-wide grant, so a private channel still needs the bot added explicitly. | Channel resolution fails with `CHANNEL_NOT_FOUND`, and every feature targeting that channel refuses to run. |
| **Send Messages**            | The delivery mechanism for every non-ephemeral output.                                                                                                                                       | Scheduled prompts, logs and announcements fail with `BOT_MISSING_PERMISSION`.                               |
| **Send Messages in Threads** | Several features operate inside threads (report threads, feature discussion).                                                                                                                | Thread replies fail while channel replies still work — a confusing partial outage.                          |
| **Embed Links**              | Every structured Bloom message is an embed.                                                                                                                                                  | Embeds are silently dropped; members see empty messages.                                                    |
| **Read Message History**     | Required to reference or edit a message the bot posted earlier, including the persistent verification prompt.                                                                                | Editing a previously-posted message fails.                                                                  |
| **Use Application Commands** | Required for the application's own commands to be usable in the guild.                                                                                                                       | Commands do not appear.                                                                                     |
| **Add Reactions**            | Lightweight acknowledgement, used sparingly and never as a voting mechanism.                                                                                                                 | Acknowledgements fail; no functional loss.                                                                  |

Notably **not** in the baseline:

- **Mention Everyone.** Nothing Bloom does should ping the whole server. Outbound
  messages also set `allowed_mentions` to parse nothing, so even a member's
  quoted `@everyone` is inert. Granting the permission would remove the only
  hard stop.
- **Manage Webhooks.** No feature uses webhooks. It would let a compromised bot
  create a persistent, un-attributed posting channel that survives token
  rotation.
- **Manage Guild.** Would allow editing server settings, invites and
  integrations. No feature needs it.

---

## BLOOM GUARDIAN

The highest-trust application, and the only one with elevated permissions.

| Permission                                              | Feature                                                                       | Why it is required                                                                                                                                                                                   | Risk if abused                                                                                                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manage Roles**                                        | Onboarding lifecycle: `@everyone → ✧ Early Bloom → ❋ Bloom Member`            | The only way to assign a role. **Guardian is the only bot granted this.**                                                                                                                            | Role manipulation. Mitigated by three layers: the `role:write` capability manifest, an allow-list restricting writes to Early Bloom and Bloom Member only, and a live hierarchy check before every write. |
| **Kick Members**                                        | `/kick`                                                                       | Removes a member without a ban.                                                                                                                                                                      | Mass removal. Mitigated by moderator-or-above policy, per-target protection checks, and a full audit trail.                                                                                               |
| **Ban Members**                                         | `/ban`, `/unban`, and reconciling bans applied in the client                  | Issues and lifts bans. Also required to _read_ the ban list.                                                                                                                                         | Mass banning. Same mitigations, plus staff and owner targets are never actionable.                                                                                                                        |
| **Moderate Members** (Timeout)                          | `/timeout`, `/untimeout` (automated anti-spam response is planned, not built) | Applies Discord's native timeout. Preferred over kick or ban: reversible, proportionate, and visible to the member.                                                                                  | Silencing members. Timeout is capped at Discord's 28-day maximum and every application is audited.                                                                                                        |
| **Manage Messages**                                     | `/purge`, removing spam, pinning the verification prompt                      | Deletes messages in bulk and pins.                                                                                                                                                                   | Evidence destruction. `/purge` is administrator-gated, bounded, and records what it removed before removing it.                                                                                           |
| **Manage Channels**                                     | `/guardian channel slowmode` **only**                                         | Slowmode is a channel property, not a permission overwrite, so Manage Roles cannot set it. Lock and unlock deliberately do **not** use this — see below.                                             | Channel reconfiguration. Restricted to moderators, audited, and the adapter caps slowmode at Discord's 21,600-second maximum.                                                                             |
| **View Audit Log**                                      | Reconciling out-of-band moderation                                            | Lets actions taken directly in the Discord client be attributed in the Bloom audit trail, so history is complete rather than only covering bot-issued actions.                                       | Read-only. Low risk.                                                                                                                                                                                      |
| **Create Public / Private Threads**, **Manage Threads** | Report and case handling                                                      | Held for case threads in the staff channel. **Not yet exercised** — Phase 2 posts cases as messages, not threads. Kept in the invite so the later change does not require re-inviting every install. | Thread manipulation in staff channels only.                                                                                                                                                               |

#### Why lock and unlock do not use Manage Channels

Locking a channel edits the `@everyone` **Send Messages permission overwrite**
on that channel. That is an overwrite edit, which **Manage Roles** already
covers — and Guardian holds Manage Roles for the onboarding lifecycle regardless.

Manage Channels would also have worked, and using it for all three commands
would have been the obvious choice. It is deliberately not: Manage Channels is
the broader permission, and routing two of the three commands through the
narrower one means a compromised Guardian token cannot rename, reconfigure or
delete channels through the lock path. Only slowmode needs the broader grant, so
only slowmode gets it.

`unlock` restores the permission state recorded when the channel was locked,
read back from that lock's own row. The naive implementation — unlock sets
"allowed" — would silently open a channel that had been restricted to a role
before the incident: a permission escalation disguised as a convenience, and one
nothing else in the system would flag.

#### Permissions Guardian deliberately does not hold

| Permission                 | Why not                                                                                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Administrator**          | See below. Never, on any bot.                                                                                                                                                                                                                                         |
| **Manage Guild**           | Nothing Bloom does changes server-level settings. It would also grant invite management and integration control.                                                                                                                                                      |
| **Mention Everyone**       | No Bloom message ever needs `@everyone`. Withholding it means a compromised token cannot mass-ping, independent of any application-side check.                                                                                                                        |
| **Message Content** intent | Not a permission but the same reasoning: Bloom parses no message text. Anti-spam is not implemented; when it is, it reacts to Discord's native Auto Moderation events, which carry the rule and the matched keyword but never the member's text. See design note 001. |

### Why Guardian does not get Administrator

Administrator would satisfy every row above in one grant. It would also:

- bypass every channel overwrite, including the ones protecting private staff
  channels from the bot;
- make the role hierarchy check meaningless, since an Administrator bot can
  modify any role below its highest role — including staff roles;
- turn a leaked Guardian token into full server compromise rather than a bounded
  incident.

The startup hierarchy audit emits a warning if Guardian is found holding
Administrator, precisely because it is the sort of thing that gets granted
during a debugging session and never removed.

---

## BLOOM COMPANION

Baseline, plus one.

| Permission        | Feature                             | Why                                           | Risk                                                                                                          |
| ----------------- | ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Manage Events** | Community events, challenge windows | Creates and updates Discord scheduled events. | Event spam. Mitigated by feature flags, per-guild toggles and duplicate prevention on every scheduled action. |

Companion explicitly does **not** get:

- **Manage Roles.** Ranks (Seedling → Master Bloom) are database state rendered
  in embeds, not Discord roles. That is a deliberate design decision: nine
  progression roles would clutter the member list, and any bot that can write
  roles is a bot that can escalate privilege. The capability manifest enforces
  it in code — constructing a role service inside the Companion process throws.
- **Any moderation permission.** Companion has no moderation surface at all.
  Members who need staff use Guardian's `/report`.

---

## BLOOM LABS

Baseline, plus two.

| Permission                 | Feature                | Why                                                                                 | Risk                                                                          |
| -------------------------- | ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Attach Files**           | Bug reports            | Bug reports carry screenshots and logs; Labs re-posts them into the triage channel. | File spam. Bounded by Discord's own upload limits and per-user rate limiting. |
| **Create Private Threads** | Beta cohort discussion | Cohort-specific threads keep unreleased-feature discussion out of public channels.  | Thread proliferation. Cohort creation is staff-gated.                         |

Labs explicitly does **not** get **Manage Roles**, even though it owns beta
testing. The `◌ Beta Tester` role is granted manually by staff. Automating it
would mean a second bot with role-write access, doubling the blast radius of a
token leak — for a workflow that happens a handful of times per cohort.

---

## Gateway intents

Separate from permissions, and separately minimised. Privileged intents must be
enabled on the **Bot** page of the Developer Portal; requesting one that is not
enabled closes the gateway with **close code 4014**.

| Intent            | Privileged | Guardian | Companion | Labs | Why                                                                                                                                                                                                                                                  |
| ----------------- | :--------: | :------: | :-------: | :--: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Guilds`          |     no     |    ✅    |    ✅     |  ✅  | Guild, role and channel state. Required to read live role positions before every role write.                                                                                                                                                         |
| `GuildMembers`    |  **yes**   |    ✅    |    ❌     |  ❌  | `guildMemberAdd` starts onboarding; `guildMemberUpdate` keeps the observed role cache current. No non-privileged substitute exists.                                                                                                                  |
| `GuildModeration` |     no     |    ✅    |    ❌     |  ❌  | `guildBanAdd` / `guildBanRemove`, for reconciling bans applied in the client.                                                                                                                                                                        |
| `MessageContent`  |  **yes**   |    ❌    |    ❌     |  ❌  | **Not requested.** Every feature is interaction-driven. Where a feature would need message text, the answer is a message context-menu command, which hands the bot the targeted message's content without ambient access to everything anyone types. |
| `GuildPresences`  |  **yes**   |    ❌    |    ❌     |  ❌  | **Not requested.** No feature depends on online status.                                                                                                                                                                                              |

Apps in fewer than 100 servers can self-enable privileged intents in the
Developer Portal. Beyond that threshold they require verification and approval.

---

## OAuth2 installation URLs

Generated from the table above. Replace `YOUR_CLIENT_ID` with each application's
own client id — the three bots have three different ids and three different
permission integers.

**Guardian** — `1497064631510` (baseline + Manage Roles, Kick, Ban, Timeout, Manage Messages, Manage Channels, View Audit Log, threads)

Unchanged by Phase 2. Every permission moderation needs was already in the
Phase 0 baseline, so existing installs do not need re-inviting — which is the
point of deciding the permission set up front rather than growing it per
feature.

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1497064631510&scope=bot+applications.commands
```

**Companion** — `319975148608` (baseline + Manage Events)

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=319975148608&scope=bot+applications.commands
```

**Labs** — `380104723520` (baseline + Attach Files, Create Private Threads)

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=380104723520&scope=bot+applications.commands
```

Both scopes are required: `bot` for the guild membership and permissions,
`applications.commands` for slash command registration.

---

## Verifying what is actually granted

The install URL is a _request_. A server administrator can approve a subset, and
channel overwrites can remove access afterwards — the most common cause of
"it worked yesterday".

```bash
pnpm diagnostics    # configuration, connectivity, migration state
pnpm health         # live component status from a running bot
```

Guardian re-runs a hierarchy and permission audit at every startup and logs an
actionable advisory for each problem it finds, rather than waiting for the next
member to hit the failure.
