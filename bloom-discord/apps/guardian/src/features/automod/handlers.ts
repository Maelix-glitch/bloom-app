import { bloomError } from '@bloom/shared-types';
import { newCorrelationId } from '@bloom/utils';
import type { AutoModerationExecutionPayload, EventHandler } from '@bloom/events';
import type { ComponentHandler } from '@bloom/commands';
import { requireModerator } from '@bloom/permissions';
import type { GuardianDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * The gateway handler and the three review buttons.
 *
 * The handler is thin on purpose: the dispatcher owns correlation and
 * dedupe, the service owns every decision. The dedupe key mirrors the
 * database's idempotency key, so a redelivered event is stopped twice —
 * once here, cheaply, and once at the insert, authoritatively.
 * member_profile executions have no message id; they return no key and
 * rely on the service's own handling, which counts them without ever
 * escalating on a null message.
 */
export const automodExecutionHandler: EventHandler<
  AutoModerationExecutionPayload,
  GuardianDeps
> = {
  bot: 'guardian',
  event: 'autoModerationActionExecution',
  name: 'automod.execution',

  dedupeKey(payload) {
    if (!payload.messageId) return null;
    return `automod:${payload.guildId}:${payload.userId}:${payload.messageId}:${payload.ruleId}`;
  },

  async handle(payload, deps) {
    await deps.automod.handleExecution(payload, newCorrelationId());
  },
};

function reviewHandler(
  decision: 'confirmed' | 'reversed' | 'escalated',
): ComponentHandler<GuardianDeps> {
  return {
    bot: 'guardian',
    feature: 'automod',
    action:
      decision === 'confirmed'
        ? 'confirm'
        : decision === 'reversed'
          ? 'reverse'
          : 'escalate',
    policy: requireModerator(),
    ephemeral: true,

    async execute(invocation, deps, context) {
      const eventId = context.customId.argument;
      if (!eventId || !/^\d+$/.test(eventId)) {
        throw bloomError('INVALID_INPUT', {
          operatorHint: `Automod review button carried a malformed event id "${String(eventId)}".`,
        });
      }
      if (!invocation.guildId) {
        throw bloomError('GUILD_MISMATCH', {
          operatorHint: 'An automod review reached a handler without a guild id.',
        });
      }

      const result = await deps.automod.review({
        eventId,
        decision,
        reviewer: invocation.actor,
        correlationId: invocation.correlationId,
      });

      switch (result.kind) {
        case 'not_found':
          throw bloomError('INVALID_INPUT', {
            userMessage: 'That alert is no longer available.',
          });
        case 'already_reviewed':
          return copy.alreadyReviewedMessage(result.event);
        case 'recorded':
          return copy.reviewRecordedMessage({
            decision,
            event: result.event,
            caseNumber: result.caseNumber,
          });
      }
    },
  };
}

/** Confirm / Reverse / Escalate, as they appear on the alert post. */
export const automodComponentHandlers: readonly ComponentHandler<GuardianDeps>[] = [
  reviewHandler('confirmed'),
  reviewHandler('reversed'),
  reviewHandler('escalated'),
];
