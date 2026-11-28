import {
  AutoModerationActionType,
  AutoModerationRuleTriggerType,
  type AutoModerationActionExecution,
} from 'discord.js';
import {
  unsafeSnowflake,
  type AutomodTriggerType,
  type ChannelId,
  type GuildId,
  type MessageId,
  type UserId,
} from '@bloom/shared-types';
import type { AutoModerationExecutionPayload } from '@bloom/events';

/**
 * Discord's Auto Moderation execution event, translated into a plain payload.
 *
 * This adapter is the privacy boundary of design note 001, so it deserves
 * saying plainly: the discord.js object carries `content` and
 * `matchedContent`. This function does not read them. They are not copied,
 * not logged and not carried — the payload type has no field that could
 * hold them, so nothing downstream can store what was never received.
 *
 * `matchedKeyword` is different: it is the staff-configured pattern that
 * matched, not anything the member typed, and staff need it to judge
 * whether the rule behaved.
 */

const TRIGGER_TYPES: Readonly<Record<number, AutomodTriggerType>> = {
  [AutoModerationRuleTriggerType.Keyword]: 'keyword',
  [AutoModerationRuleTriggerType.Spam]: 'spam',
  [AutoModerationRuleTriggerType.KeywordPreset]: 'keyword_preset',
  [AutoModerationRuleTriggerType.MentionSpam]: 'mention_spam',
  [AutoModerationRuleTriggerType.MemberProfile]: 'member_profile',
};

const ACTION_LABELS: Readonly<Record<number, string>> = {
  [AutoModerationActionType.BlockMessage]: 'BLOCK_MESSAGE',
  [AutoModerationActionType.SendAlertMessage]: 'SEND_ALERT_MESSAGE',
  [AutoModerationActionType.Timeout]: 'TIMEOUT',
  [AutoModerationActionType.BlockMemberInteraction]: 'BLOCK_MEMBER_INTERACTION',
};

export function toAutoModerationExecutionPayload(
  execution: AutoModerationActionExecution,
): AutoModerationExecutionPayload | null {
  const triggerType = TRIGGER_TYPES[execution.ruleTriggerType];
  if (!triggerType) {
    // A trigger type this build does not know. Dropping the event is the
    // honest failure: guessing a mapping would file the execution under
    // the wrong rule, and the escalation counter would punish against a
    // threshold tuned for something else.
    return null;
  }

  return {
    guildId: unsafeSnowflake<GuildId>(execution.guild.id),
    userId: unsafeSnowflake<UserId>(execution.userId),
    channelId: execution.channelId
      ? unsafeSnowflake<ChannelId>(execution.channelId)
      : null,
    messageId: execution.messageId
      ? unsafeSnowflake<MessageId>(execution.messageId)
      : null,
    ruleId: execution.ruleId,
    triggerType,
    discordAction:
      ACTION_LABELS[execution.action.type] ?? `UNKNOWN_${String(execution.action.type)}`,
    matchedKeyword: execution.matchedKeyword,
  };
}
