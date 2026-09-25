import { newCorrelationId } from '@bloom/utils';
import type { EventHandler, MemberJoinPayload, MemberLeavePayload } from '@bloom/events';
import type { GuardianDeps } from '../../deps.js';

/**
 * Guardian's member lifecycle handlers.
 *
 * Guardian owns `guildMemberAdd` and `guildMemberRemove` in `EVENT_OWNERSHIP`,
 * and registration throws if any other bot tries to claim them. That is what
 * stops Companion from sending a second welcome — the rule is enforced, not
 * documented.
 */

/**
 * A member joined.
 *
 * The dedupe key is the reason a gateway resume cannot double-welcome anyone.
 * After a reconnect Discord replays recent events, and without a key the member
 * gets a second prompt in the welcome channel.
 *
 * The key includes the join timestamp so that a genuine leave-and-rejoin is
 * treated as a new event rather than being suppressed as a duplicate of the
 * first join.
 */
export const memberJoinHandler: EventHandler<MemberJoinPayload, GuardianDeps> = {
  bot: 'guardian',
  event: 'guildMemberAdd',
  name: 'onboarding.member-join',

  dedupeKey(payload) {
    const joined = payload.joinedAt?.toISOString() ?? 'unknown';
    return `${payload.guildId}:${payload.userId}:${joined}`;
  },

  async handle(payload, deps) {
    await deps.onboarding.handleJoin({
      guildId: payload.guildId,
      userId: payload.userId,
      username: payload.username,
      isBot: payload.isBot,
      joinedAt: payload.joinedAt,
      correlationId: newCorrelationId(),
    });
  },
};

/**
 * A member left.
 *
 * Marks the departure and keeps everything else. Their onboarding state and
 * moderation history survive on purpose: leaving must not be a way to reset a
 * revocation, and someone who completed onboarding should not be sent back
 * through it because they took a break.
 *
 * No dedupe key. `markLeft` is an idempotent UPDATE, so a replayed removal
 * writes the same row twice with the same effect, and the second audit entry is
 * cheaper than the risk of suppressing a real departure.
 */
export const memberLeaveHandler: EventHandler<MemberLeavePayload, GuardianDeps> = {
  bot: 'guardian',
  event: 'guildMemberRemove',
  name: 'onboarding.member-leave',

  async handle(payload, deps) {
    await deps.onboarding.handleLeave({
      guildId: payload.guildId,
      userId: payload.userId,
      leftAt: payload.leftAt,
      correlationId: newCorrelationId(),
    });
  },
};
