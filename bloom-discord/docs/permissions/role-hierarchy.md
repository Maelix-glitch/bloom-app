# Role hierarchy

The single most common cause of "the bot stopped working" in a Discord server
with automated roles. It is also entirely preventable, which is why the platform
checks it at startup and again before every write.

## Required order

Top to bottom in **Server Settings → Roles**. Position numbers are Discord's own
and only the _relative_ order matters.

```
✦ Founder            ← highest
◈ Administrator
⟡ Moderator
─────────────────────  bot must be below this line
◉ Bloom Bot          ← the integration role for the Bloom applications
─────────────────────  bot must be above this line
◌ Beta Tester
✧ Early Bloom
❋ Bloom Member
@everyone            ← lowest, position 0
```

## The two rules

**1. The bot role must sit above every role it assigns.**

Discord requires the acting role to be _strictly_ above the target. Equal
positions are refused. Guardian assigns `✧ Early Bloom` and `❋ Bloom Member`, so
`◉ Bloom Bot` must be above both.

Get this wrong and onboarding fails for every new member, with Discord returning
a generic `Missing Permissions` that says nothing about ordering.

**2. The bot role must sit below every staff role.**

Guardian never needs to modify staff roles, so it should not be able to. Placing
the bot above `⟡ Moderator` means a leaked token could rewrite the moderator
role. This is a warning rather than an error — the server still works — but it
is a real privilege-escalation surface.

`◌ Beta Tester` sits below the bot but is **not** assignable by it. Testing
access is a deliberate staff decision, enforced by an allow-list in code that
permits exactly two role ids.

## What the platform does about it

**At startup**, Guardian runs `auditGuardianRolePlacement` and logs one advisory
per problem:

| Advisory             | Severity | Meaning                                                                                |
| -------------------- | -------- | -------------------------------------------------------------------------------------- |
| `BOT_ROLE_TOO_LOW`   | error    | The bot cannot assign a role it is required to assign. Onboarding is broken right now. |
| `BOT_ROLE_TOO_HIGH`  | warn     | The bot sits above a staff role. Works, but over-privileged.                           |
| `ROLE_NOT_FOUND`     | error    | A configured role id does not exist. Wrong id, or the role was deleted.                |
| `ROLE_MANAGED`       | error    | A configured role belongs to an integration. Nobody can assign those.                  |
| (Administrator held) | warn     | The bot has Administrator, which makes the whole permission model moot.                |

The bot still starts. A misconfigured hierarchy should be loud in the logs and
visible in `/health`, not a refusal to boot — the commands that do work should
keep working.

**Before every write**, `checkRoleManageable` re-reads live positions. Startup
state is not trusted, because an administrator dragging a role in the list
changes positions with no event the bot can rely on having processed.

**When it fails**, the error names both roles, both positions and the exact UI
path:

> The bot role "◉ Bloom Bot" (position 3) is below "✧ Early Bloom" (position 7),
> so Discord will not let it assign that role. Open Server Settings → Roles and
> drag "◉ Bloom Bot" above "✧ Early Bloom".

`ROLE_HIERARCHY_BLOCKED` is **never retryable**. Retrying produces identical
failures forever; the retry helper checks the flag and refuses.

## Fixing it

1. Server Settings → Roles.
2. Drag `◉ Bloom Bot` so it sits below `⟡ Moderator` and above `◌ Beta Tester`.
3. Restart Guardian, or run `pnpm diagnostics`, and confirm no advisories.

Discord creates the integration role automatically when a bot is invited, and
places it at the bottom. **Every new bot invite needs this step.**

## Managed roles

A managed role belongs to an integration — another bot, a Nitro booster role, a
subscription tier. Discord does not permit anyone to assign them, including
administrators. `◉ Bloom Bot` is itself managed, which is why the platform can
never move its own role: an administrator has to.

If a configured role turns out to be managed, replace it with a normal role. No
amount of permission granting will make it assignable.

## Roles are not the rewards system

Bloom Rewards ranks (Seedling → First Bloom → … → Master Bloom) are **database
state**, not Discord roles. Nine progression roles would clutter the member list
and require nine more role writes per member. Ranks are rendered in embeds and
read from Postgres; only the two onboarding roles exist in Discord.
