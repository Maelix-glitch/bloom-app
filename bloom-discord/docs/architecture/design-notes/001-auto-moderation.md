# Design note 001 — Auto-moderation

**Status:** implemented in Phase 8, as specified here. The one structural
deviation: migration 0013 relaxed `moderation_actions.actor_id` and
`moderation_cases.opened_by` to nullable, which this note's audit rule
required and the original schema did not allow.
**Supersedes:** the `Anti-spam | ✅ owns` row that was wrong in
`bot-responsibilities.md` — it is accurate now.

## Decisions taken on the open questions

1. **Who tunes thresholds.** Holders of `staff.moderation.execute` — the
   same tier that can time a member out by hand. Reading status takes
   `staff.cases.read`.
2. **One ladder or two.** Parallel: automod offences count only automod
   events. A member's human warning history neither accelerates nor is
   accelerated by the automated ladder; the case links both for context.
3. **Do reversals notify the member.** Yes. A timeout that is lifted
   silently leaves the member believing it stood; the reversal DM says it
   was reversed and by the review, not by expiry.

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

**Manage Guild (`1 << 5`) — already held.** When this note was written
Guardian's integer was `1497064631510`, with bit 5 clear. It is now
`1497064631542`: the referral attribution work took the permission to read
invite use counts, which needs the same bit. Auto Moderation events are
delivered only to apps holding Manage Guild, and creating or updating rules
requires it too — so this note no longer has a permission cost to argue.

That removes the objection; it does not make the feature free. Everything
below still applies, and the permission being present must not be mistaken for
AutoMod being wired up. Nothing listens for
`AUTO_MODERATION_ACTION_EXECUTION` today.

The escalation was argued rather than slipped in — see
[design note 002](./002-manage-guild-permission.md). Manage Guild is broad: it
covers guild settings, integrations and invites. The alternatives considered
at the time:

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

Answered at the top of this note, under "Decisions taken on the open
questions", when the feature was built in Phase 8.
