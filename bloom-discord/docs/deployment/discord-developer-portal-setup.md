# Discord Developer Portal setup

Creating the three applications, enabling the right intents, and inviting them
with the right permissions. Written against the current Portal UI.

You need **Manage Server** on the Bloom Labs server to invite an application.

---

## 0. Enable Developer Mode

Needed to copy ids. Discord client → **User Settings** → **Advanced** →
**Developer Mode** → on.

You can now right-click a server, channel, role or member and choose **Copy
Server ID** / **Copy Channel ID** / **Copy Role ID** / **Copy User ID**.

---

## 1. Create three applications

Three separate applications, not one application with three bots — an
application has exactly one bot user, one token and one command set. Separate
applications are what give the three bots independent permissions, independent
tokens and independent command trees.

Go to <https://discord.com/developers/applications> and repeat for each:

1. **New Application**.
2. Name it. The name is what members see in the member list:
   - `Bloom Guardian`
   - `Bloom Companion`
   - `Bloom Labs`
3. Accept the Developer Terms of Service.
4. On **General Information**, copy the **Application ID**. This is the client
   id: `DISCORD_GUARDIAN_CLIENT_ID` and so on.
5. Set the app icon and description. Members see both.

---

## 2. Configure the bot user

For each application, open the **Bot** page in the left sidebar.

### Token

**Reset Token** → copy it immediately. Discord shows a token once. If you lose
it, reset again — that invalidates the old one, so a running bot will disconnect.

Put it in `.env` as `DISCORD_GUARDIAN_TOKEN` / `DISCORD_COMPANION_TOKEN` /
`DISCORD_LABS_TOKEN`.

A token posted publicly — in a screenshot, a paste, a commit — is invalidated by
Discord automatically, usually within minutes. That is a safety net, not a plan.
`.env` is git-ignored; keep it that way.

### Authorization flow

Turn **Public Bot** **off** for all three. Bloom's bots serve one community;
leaving them public lets anyone add them to their own server, where they will do
nothing useful and still count against rate limits and the privileged-intent
threshold.

Leave **Requires OAuth2 Code Grant** off. It is for applications that need a
user access token, which these do not.

### Privileged Gateway Intents

This is the step people miss. Requesting a privileged intent that is not enabled
here closes the gateway connection with **close code 4014** and the bot never
comes online.

| Application     | Presence Intent | Server Members Intent | Message Content Intent |
| --------------- | :-------------: | :-------------------: | :--------------------: |
| Bloom Guardian  |     **off**     |        **ON**         |        **off**         |
| Bloom Companion |       off       |          off          |          off           |
| Bloom Labs      |       off       |          off          |          off           |

Only Guardian needs **Server Members**, and only because `guildMemberAdd` is
what starts onboarding. There is no non-privileged substitute.

**Message Content stays off everywhere.** Every feature is driven by slash
commands, buttons, select menus, modals and context menus. If a future feature
appears to need message text, use a _message context-menu command_ — Discord
hands the bot the content of the targeted message without granting ambient
access to everything anyone types.

Applications in fewer than 100 servers can toggle these freely. Past that,
Discord requires verification and an approved justification, re-confirmed
annually.

---

## 3. Invite each application

Use the install URLs from
[`docs/permissions/bloom-bot-permission-matrix.md`](../permissions/bloom-bot-permission-matrix.md),
substituting each application's own client id. They are not interchangeable:
Guardian's URL requests Manage Roles, and Companion's must not.

Alternatively, build them in the Portal: **OAuth2** → **URL Generator** →
scopes `bot` and `applications.commands` → tick the permissions from the matrix.

On the consent screen, select the Bloom Labs server and **do not** grant
anything beyond what the URL requests. The consent screen allows unticking
permissions; unticking one Guardian needs produces a bot that fails with
`BOT_MISSING_PERMISSION` later.

---

## 4. Fix the role hierarchy

Discord creates an integration role per bot and places it at the bottom of the
list. That is the wrong place.

Open **Server Settings → Roles** and arrange:

```
✦ Founder
◈ Administrator
⟡ Moderator
◉ Bloom Bot          ← all three integration roles, here
◌ Beta Tester
✧ Early Bloom
❋ Bloom Member
@everyone
```

Details and failure modes:
[`docs/permissions/role-hierarchy.md`](../permissions/role-hierarchy.md).

---

## 5. Collect ids

Right-click each role → **Copy Role ID**; each channel → **Copy Channel ID**.
Fill in `.env`. The full list with descriptions is in
[`docs/reference/environment-variables.md`](../reference/environment-variables.md).

The platform trusts ids, never names. A channel renamed from `#general` to
`#the-garden` keeps working; a config file matching on names does not.

---

## 6. Verify

```bash
pnpm diagnostics
```

Checks the Node version, every configuration key, database connectivity and
migration state, and reports exactly what is missing. It exits non-zero on any
failure, so it can gate a deploy.

Then register commands and start a bot:

```bash
pnpm db:migrate
pnpm commands:register --bot guardian --dry-run
pnpm commands:register --bot guardian
pnpm dev:guardian
```

At Phase 0 there are no commands yet, so the registrar reports an empty set and
refuses to publish it — that refusal is deliberate. A bulk overwrite with an
empty array deletes every command the application has, which is exactly what
happens if a registry fails to load, and it would be indistinguishable from a
successful deploy.

---

## Common failures

| Symptom                                        | Cause                                                               | Fix                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| Gateway closes with code **4014**              | A privileged intent is requested but not enabled                    | Enable **Server Members** on Guardian's Bot page    |
| `TOKEN_INVALID` at startup                     | Token was reset, or copied with whitespace                          | Reset the token and update `.env`                   |
| Bot online, commands missing                   | Commands never registered, or registered globally                   | `pnpm commands:register --bot <name>` (guild scope) |
| Bot online, does nothing                       | Not invited to the configured guild, or `DISCORD_GUILD_ID` is wrong | Re-invite; verify the id                            |
| Role assignment fails with Missing Permissions | Bot role below the target role                                      | See role-hierarchy.md                               |
| Cannot post in one channel only                | Channel-level permission overwrite                                  | Add the bot's role to that channel's permissions    |
