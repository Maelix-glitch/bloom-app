# Design note 001 — Auto-moderation

**Status:** design only, nothing implemented.
**Supersedes:** the `Anti-spam | ✅ owns` row that was wrong in
`bot-responsibilities.md`.

## Purpose

Guardian currently moderates only when a human types a command. Spam, mention
floods and invite drops happen at 03:00. The gap is not "Bloom lacks a feature
other bots have" — it is that a wellbeing community's worst moments are
unattended ones.

This note deliberately does **not** propose that Bloom read every message.

## The approach, and why it is not the obvious one

The obvious design is: request the Message Content intent, receive every
message, score it, act. That is how most bots do it, and for Bloom it is the
wrong trade — it means a wellbeing-oriented platform ingests every word typed in
the server, holds the most sensitive privileged intent Discord issues, and takes
on the full performance cost of per-message work.

Discord's **native Auto Moderation** does the detection server-side. It supports
`SPAM` (generic spam heuristics), `MENTION_SPAM` (with a configurable unique
mention limit and raid detection), `KEYWORD` (substring and Rust-flavoured
regex), `KEYWORD_PRESET` (profanity, sexual content, slurs) and `MEMBER_PROFILE`
triggers, and can block a message before it is posted. When a rule fires it
emits `AUTO_MODERATION_ACTION_EXECUTION`.

**Guardian reacts to that event rather than to messages.**

The decisive detail: the event carries `user_id`, `rule_trigger_type`,
`channel_id`, `matched_keyword` and the action taken **without** any privileged
intent. Only `content` and `matched_content` require Message Content — and Bloom
wants neither. Guardian can therefore run escalation, cases and appeals while
never receiving the text of what anybody wrote.

What Discord does not provide, and Bloom does: escalation across repeat
offences, case creation, moderator review, appeals, per-channel policy, audit
trail, and thresholds that a human tuned.

## Owning bot

**Guardian**, exclusively. Companion and Labs must not see these events and do
not hold the permission that would deliver them.

## Permissions required

**Manage Guild (`1 << 5`) — new.** Guardian's integer is `1497064631510`, which
has bit 5 clear. Auto Moderation events are delivered only to apps holding
Manage Guild, and creating or updating rules requires it too.

This is a genuine escalation and should be argued, not slipped in. Manage Guild
is broad: it covers guild settings, integrations and invites. The alternatives:

- **Do not manage rules from Bloom.** Staff configure AutoMod by hand in the
  Discord UI; Guardian only reacts. Still needs Manage Guild for the event.
- **Do not react to AutoMod at all**, and instead read messages directly. That
  needs the privileged Message Content intent, which is strictly worse.
- **Accept the permission.** Recommended, because the counterfactual is a
  privileged intent plus every message in Bloom's process memory.

Recommendation: take Manage Guild, and state in the permission matrix that it is
held for Auto Moderation and nothing else.

## Intents required

`AUTO_MODERATION_EXECUTION` — **not privileged**. No change to the Message
Content position: still not requested, by any bot.

## Database impact

Two new tables, plus reuse of the existing case machinery:

- `automod_events` — one row per execution: guild, user, rule trigger type,
  matched keyword, channel, action taken, timestamp. **No message content
  column, by construction.** Retention: prunable allowlist, 180 days.
- `automod_policies` — per-guild, per-channel thresholds and the escalation
  ladder. Read at runtime so tuning needs no deploy.

Escalation writes through the **existing** `moderation_actions` and
`moderation_cases` tables. An automated timeout must be indistinguishable in the
audit trail from a human one except for its actor, which is null.

## Events involved

`AutoModerationActionExecution`. Discord does not guarantee delivery, and the
escalation counter must therefore tolerate gaps — it counts what it saw, and
never claims to be a complete history. A missed event under-punishes, which is
the correct direction to fail.

## Commands and interactions

- `/guardian automod status` — current policy and recent volume
- `/guardian automod threshold <rule> <count> <window>` — tune without deploy
- `/guardian automod exempt <role>` — allow-list
- Review buttons on the alert post: **Confirm**, **Reverse**, **Escalate**

Reverse must be one click. An automated action that is hard to undo is a worse
failure than one that never fired.

## Failure modes

| Failure                   | Behaviour                                                        |
| ------------------------- | ---------------------------------------------------------------- |
| Database down             | Do not act. Log `fatal`. Escalation without history is guesswork |
| Discord rejects a timeout | Bounded retry with backoff, then a moderator alert, never a loop |
| Duplicate event           | Idempotency key on `(guild, user, message_id, rule_id)`          |
| Hierarchy blocks it       | `ROLE_HIERARCHY_BLOCKED`, alert staff, take no action            |
| Policy missing            | Alert only. Never a punishment from an unconfigured rule         |

## Security implications

The escalation ladder is the attack surface: if someone can provoke a rule on
another member's behalf, they can get them timed out. Mitigations — actions
attach to the author of the triggering content only, staff roles are exempt by
default, and no rule may escalate past timeout without human review.

**No automatic bans.** §4 is explicit and it is right. The ceiling for automated
action is a timeout; kick and ban stay human.

## Privacy implications

The strongest part of this design. Bloom never receives message content, never
stores it, and cannot leak it, because it never has it. `matched_keyword` is the
staff-configured pattern, not what the member typed. Alerts to moderators link
to the Discord message rather than quoting it.

## Testing plan

Fakes for the execution event; unit tests for the escalation ladder at every
threshold boundary. Integration tests for the counter's window arithmetic
against a real database — that is a database-enforced claim, so it gets
mutation-tested. Explicit test that no code path stores a `content` field.

## Rollback strategy

Flag `automod.enabled` per guild in `bot_settings`, defaulting **off**. Rules
live in Discord and survive the bot being down. Tables are additive; rolling
back the code leaves orphaned rows and no broken behaviour.

## Open questions

1. **Who tunes thresholds?** Founder-only, or Moderator too? Affects the
   authorization policy.
2. **Does an automod action count toward the warning ladder that human warnings
   use, or a parallel one?** A shared ladder is simpler; a parallel one avoids a
   spam wave escalating someone toward a ban.
3. **Should reversals notify the member?** "You were timed out and it was a
   mistake" is honest but draws attention to something they may not have noticed.
