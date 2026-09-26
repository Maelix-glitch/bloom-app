import {
  bloomError,
  MANUAL_AWARD_LIMIT,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import { requireAdministrator, requireBloomMember } from '@bloom/permissions';
import { sanitiseUserText } from '@bloom/utils';
import type { BloomMessage } from '@bloom/embeds';
import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { CompanionDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * Milestones, achievements, and the one staff command that touches points.
 */

const REASON_MAX_LENGTH = 200;

function requireGuild(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'An awards command reached a handler without a guild id.',
    });
  }
  return id;
}

async function showMilestones(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const entries = await deps.awards.progress(
    requireGuild(invocation),
    invocation.actor.userId,
    'milestone',
  );
  return copy.milestonesMessage(entries);
}

async function showAchievements(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const entries = await deps.awards.progress(
    requireGuild(invocation),
    invocation.actor.userId,
    'achievement',
  );
  return copy.achievementsMessage(entries);
}

/**
 * `/companion admin award` — the only way staff can change a balance.
 *
 * Until this existed a correction meant a hand-written `INSERT`, which is both
 * unpleasant and unlogged outside the ledger itself. One command covers both
 * directions: a positive amount is a `manual_award`, a negative one is an
 * `adjustment`. They are different kinds in the ledger because they mean
 * different things, but they are one command because a moderator correcting
 * their own mistake should not have to find a second one.
 */
async function adminAward(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const member = invocation.options.getUser('member');
  const points = invocation.options.getInteger('points') ?? 0;
  const rawReason = invocation.options.getString('reason') ?? '';

  if (!member) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Choose a member.' });
  }

  const reason = sanitiseUserText(rawReason, REASON_MAX_LENGTH).trim();
  if (reason.length === 0) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'Give a reason. It is stored with the award and read later.',
    });
  }

  if (points === 0) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'Zero points would record nothing. Use a positive or negative amount.',
    });
  }

  if (Math.abs(points) > MANUAL_AWARD_LIMIT) {
    return copy.manualAwardRefusedMessage({ reason: 'limit', limit: MANUAL_AWARD_LIMIT });
  }

  const subject: UserId = member.id;
  const outcome = await deps.rewards.manualAward({
    guildId,
    userId: subject,
    points,
    reason,
    actorId: invocation.actor.userId,
    interactionId: invocation.interactionId,
    correlationId: invocation.correlationId,
  });

  switch (outcome.kind) {
    case 'insufficient':
      return copy.manualAwardRefusedMessage({
        reason: 'insufficient',
        limit: MANUAL_AWARD_LIMIT,
        balance: outcome.balance,
      });

    case 'duplicate':
      return copy.manualAwardRefusedMessage({
        reason: 'duplicate',
        limit: MANUAL_AWARD_LIMIT,
      });

    case 'applied':
      return copy.manualAwardMessage({
        userId: subject,
        points,
        balance: outcome.balance,
        reason,
      });
  }
}

export const awardsSubcommands: readonly SubcommandContribution<CompanionDeps>[] = [
  {
    spec: {
      name: 'milestones',
      description: 'Show the milestones you have reached, and the ones ahead.',
    },
    policy: requireBloomMember(),
    execute: showMilestones,
  },
  {
    spec: {
      name: 'achievements',
      description: 'Show the achievements you have earned.',
    },
    policy: requireBloomMember(),
    execute: showAchievements,
  },
  {
    group: 'admin',
    spec: {
      name: 'award',
      description: 'Award or deduct Bloom Rewards points. Always audited.',
      options: [
        {
          name: 'member',
          description: 'Who the points are for.',
          type: 'user',
          required: true,
        },
        {
          name: 'points',
          description: `How many. Negative to correct a mistake. Up to ${String(MANUAL_AWARD_LIMIT)}.`,
          type: 'integer',
          required: true,
          minValue: -MANUAL_AWARD_LIMIT,
          maxValue: MANUAL_AWARD_LIMIT,
        },
        {
          name: 'reason',
          description: 'Why. Stored in the ledger and read months later.',
          type: 'string',
          required: true,
          maxLength: REASON_MAX_LENGTH,
        },
      ],
    },
    /*
     * Administrator, not Moderator. Awarding points is not a moderation action
     * — it changes a member's standing in a shared economy, and the people who
     * can do that should be a shorter list than the people who can time someone
     * out.
     */
    policy: requireAdministrator(),
    execute: adminAward,
  },
];
