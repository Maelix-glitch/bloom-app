/**
 * Auto-moderation vocabulary.
 *
 * Guardian reacts to Discord's native Auto Moderation instead of reading
 * messages — see docs/architecture/design-notes/001-auto-moderation.md. The
 * trigger types below are Discord's five, spelled the way the rest of this
 * codebase spells its vocabularies; the Postgres enum in migration 0013
 * carries the same values and the repository integration test asserts the
 * two agree.
 *
 * Nothing in this module — or anywhere in the automod path — names a field
 * for message content. Discord's execution event offers `content` and
 * `matchedContent` only to holders of the Message Content intent, which no
 * Bloom bot requests. The absence is the design, not an omission.
 */

export const AUTOMOD_TRIGGER_TYPES = [
  'keyword',
  'spam',
  'keyword_preset',
  'mention_spam',
  'member_profile',
] as const;

export type AutomodTriggerType = (typeof AUTOMOD_TRIGGER_TYPES)[number];

export const AUTOMOD_TRIGGER_LABELS: Readonly<Record<AutomodTriggerType, string>> = {
  keyword: 'Keyword rule',
  spam: 'Spam detection',
  keyword_preset: 'Keyword preset',
  mention_spam: 'Mention spam',
  member_profile: 'Member profile rule',
};

export function isAutomodTriggerType(value: string): value is AutomodTriggerType {
  return (AUTOMOD_TRIGGER_TYPES as readonly string[]).includes(value);
}

/**
 * What staff decided about an automated action, after the fact.
 *
 * `pending` is the state an action is born in. The other three are the three
 * buttons on the alert post, and each is terminal: a reviewed event is not
 * re-reviewed, because the second decision would have to explain what was
 * wrong with the first, and that conversation belongs in the case.
 */
export const AUTOMOD_REVIEW_STATUSES = [
  'pending',
  'confirmed',
  'reversed',
  'escalated',
] as const;

export type AutomodReviewStatus = (typeof AUTOMOD_REVIEW_STATUSES)[number];

export function isAutomodReviewStatus(value: string): value is AutomodReviewStatus {
  return (AUTOMOD_REVIEW_STATUSES as readonly string[]).includes(value);
}

/**
 * The settings key for the per-guild automod switch, read through the
 * settings repository as `getBotSetting(guildId, 'guardian', AUTOMOD_ENABLED_KEY)`.
 *
 * Default off, per the design note's rollback strategy: shipping the code
 * changes nothing until a guild's staff turn it on, and turning it off stops
 * escalation while leaving Discord's own rules — which live in Discord, not
 * in Bloom — exactly as they were.
 */
export const AUTOMOD_ENABLED_KEY = 'automod.enabled';
