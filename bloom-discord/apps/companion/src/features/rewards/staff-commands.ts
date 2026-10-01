import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { BloomMessage } from '@bloom/embeds';
import { requireStaffCapability } from '@bloom/permissions';
import {
  bloomError,
  MANUAL_AWARD_LIMIT,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import { sanitiseUserText } from '@bloom/utils';
import type { CompanionDeps } from '../../deps.js';
import * as awardCopy from '../awards/messages.js';
import * as copy from './staff-messages.js';

/**
 * The staff side of Bloom Rewards.
 *
 * ## What this file is allowed to do
 *
 * Nothing, on its own. Every branch below reads or writes through
 * `RewardsService` and `AwardsService`, which already own the rules: what a
 * check-in is worth, when a balance may go negative, how a manual award is
 * made idempotent, and which audit row it writes. A handler that reached into
 * the rewards repository directly would be a second place where the economy's
 * invariants live, and the second place is always the one that forgets the
 * audit row. A guard test asserts no handler here does.
 *
 * In particular there is **no raw balance mutation path here**. Both `award`
 * and `revoke` call the same `manualAward`, differing only in the sign they
 * hand it — which is also how the ledger distinguishes a grant from a
 * correction.
 *
 * ## Why these live under `admin`
 *
 * `/companion admin award` already existed and already did both directions.
 * Adding a parallel `rewards` group would have meant two commands that change
 * a balance, which is the duplication worth avoiding most. So the staff
 * surface grew where it already was: `member`, `award`, `revoke`,
 * `leaderboard`.
 */

const REASON_MAX_LENGTH = 200;

/** The two sizes staff asked for. Bounded, and the repository clamps again. */
const LEADERBOARD_LIMITS = [10, 25] as const;
const DEFAULT_LEADERBOARD_LIMIT = 10;

function requireGuild(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'A rewards staff command reached a handler without a guild id.',
    });
  }
  return id;
}

function requiredMember(invocation: CommandInvocation): UserId {
  const member = invocation.options.getUser('member');
  if (!member) throw bloomError('INVALID_INPUT', { userMessage: 'Choose a member.' });
  return member.id;
}

/**
 * A reason staff actually wrote.
 *
 * Sanitised then trimmed then length-checked, in that order: sanitising can
 * remove everything from a string of control characters, and a "reason" that
 * survives validation only to render as nothing is worse than no reason, since
 * it looks deliberate in the ledger a year later.
 */
function requiredReason(invocation: CommandInvocation): string {
  const reason = sanitiseUserText(
    invocation.options.getString('reason') ?? '',
    REASON_MAX_LENGTH,
  ).trim();

  if (reason.length === 0) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'Give a reason. It is stored with the award and read later.',
    });
  }
  return reason;
}

/** A positive amount, bounded by the same cap in both directions. */
function requiredPoints(invocation: CommandInvocation): number {
  const points = invocation.options.getInteger('points');
  if (points === null || points <= 0) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'Give a positive number of points.',
    });
  }
  return points;
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/**
 * `/companion admin member` — one member's rewards standing.
 *
 * Reads only. The three sources are fetched together because they are
 * independent and a staff command still has Discord's three seconds to meet.
 */
async function staffMember(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const userId = requiredMember(invocation);

  const [profile, achievements, milestones] = await Promise.all([
    deps.rewards.profile(guildId, userId),
    deps.awards.progress(guildId, userId, 'achievement'),
    deps.awards.progress(guildId, userId, 'milestone'),
  ]);

  return copy.staffMemberRewardsMessage({ profile, achievements, milestones });
}

/**
 * The one path that changes a balance, used by both `award` and `revoke`.
 *
 * `signum` is the only difference between them. Keeping it a parameter rather
 * than writing the call twice means the idempotency key, the audit row and the
 * insufficient-balance rule cannot drift between the two directions.
 */
async function applyManualAdjustment(
  invocation: CommandInvocation,
  deps: CompanionDeps,
  signum: 1 | -1,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const userId = requiredMember(invocation);
  const magnitude = requiredPoints(invocation);
  const reason = requiredReason(invocation);

  if (magnitude > MANUAL_AWARD_LIMIT) {
    return awardCopy.manualAwardRefusedMessage({
      reason: 'limit',
      limit: MANUAL_AWARD_LIMIT,
    });
  }

  const outcome = await deps.rewards.manualAward({
    guildId,
    userId,
    points: signum * magnitude,
    reason,
    actorId: invocation.actor.userId,
    // The interaction id is the idempotency key's distinguishing part. Discord
    // retries interactions; a retried award must not pay twice.
    interactionId: invocation.interactionId,
    correlationId: invocation.correlationId,
  });

  if (outcome.kind === 'insufficient') {
    return awardCopy.manualAwardRefusedMessage({
      reason: 'insufficient',
      limit: MANUAL_AWARD_LIMIT,
      balance: outcome.balance,
    });
  }

  if (outcome.kind === 'duplicate') {
    return awardCopy.manualAwardRefusedMessage({
      reason: 'duplicate',
      limit: MANUAL_AWARD_LIMIT,
      balance: outcome.balance,
    });
  }

  return signum === 1
    ? awardCopy.manualAwardMessage({
        userId,
        points: magnitude,
        balance: outcome.balance,
        reason,
      })
    : copy.pointsRevokedMessage({
        userId,
        points: magnitude,
        balance: outcome.balance,
        reason,
      });
}

function staffAward(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  return applyManualAdjustment(invocation, deps, 1);
}

function staffRevoke(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  return applyManualAdjustment(invocation, deps, -1);
}

async function staffLeaderboard(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const period = invocation.options.getString('period') === 'month' ? 'month' : 'week';
  const days = period === 'month' ? 30 : 7;

  /*
   * Only the two offered sizes are honoured. Discord enforces the choices
   * client-side, but an interaction payload is user input: anything else
   * falls back to the default rather than reaching the query.
   */
  const requested = invocation.options.getInteger('limit');
  const limit =
    requested !== null && (LEADERBOARD_LIMITS as readonly number[]).includes(requested)
      ? requested
      : DEFAULT_LEADERBOARD_LIMIT;

  const entries = await deps.rewards.leaderboard(requireGuild(invocation), {
    days,
    limit,
  });

  return copy.staffLeaderboardMessage({
    entries,
    periodLabel: period === 'month' ? 'Last 30 days' : 'Last 7 days',
    limit,
  });
}

// -----------------------------------------------------------------------------
// Contributions
// -----------------------------------------------------------------------------

const MEMBER_OPTION = {
  name: 'member',
  description: 'Which member.',
  type: 'user',
  required: true,
} as const;

const REASON_OPTION = {
  name: 'reason',
  description: 'Why. Stored in the ledger and read months later.',
  type: 'string',
  required: true,
  maxLength: REASON_MAX_LENGTH,
} as const;

export const rewardsStaffSubcommands: readonly SubcommandContribution<CompanionDeps>[] = [
  {
    group: 'admin',
    policy: requireStaffCapability('staff.rewards.read'),
    spec: {
      name: 'member',
      description: 'A member’s points, rank, streak and progression.',
      options: [MEMBER_OPTION],
    },
    execute: staffMember,
  },
  {
    group: 'admin',
    /*
     * Administrator and Founder only, via the staff kernel — moderators hold
     * no rewards capability at all. Awarding points is not a moderation
     * action: it changes a member's standing in a shared economy, and the
     * people who can do that should be a shorter list than the people who can
     * time someone out. The kernel also means the Discord `ModerateMembers`
     * permission bit grants nothing here.
     */
    policy: requireStaffCapability('staff.rewards.award'),
    spec: {
      name: 'award',
      description: 'Award Bloom Rewards points. Always audited.',
      options: [
        MEMBER_OPTION,
        {
          name: 'points',
          description: `How many to add. Up to ${String(MANUAL_AWARD_LIMIT)}.`,
          type: 'integer',
          required: true,
          minValue: 1,
          maxValue: MANUAL_AWARD_LIMIT,
        },
        REASON_OPTION,
      ],
    },
    execute: staffAward,
  },
  {
    group: 'admin',
    policy: requireStaffCapability('staff.rewards.revoke'),
    spec: {
      name: 'revoke',
      description: 'Remove Bloom Rewards points. Always audited.',
      options: [
        MEMBER_OPTION,
        {
          name: 'points',
          description: `How many to remove. Up to ${String(MANUAL_AWARD_LIMIT)}.`,
          type: 'integer',
          required: true,
          minValue: 1,
          maxValue: MANUAL_AWARD_LIMIT,
        },
        REASON_OPTION,
      ],
    },
    execute: staffRevoke,
  },
  {
    group: 'admin',
    policy: requireStaffCapability('staff.rewards.read'),
    spec: {
      name: 'leaderboard',
      description: 'The staff view of the board, with event counts.',
      options: [
        {
          name: 'period',
          description: 'How far back to count. Defaults to 7 days.',
          type: 'string',
          required: false,
          choices: [
            { name: 'Last 7 days', value: 'week' },
            { name: 'Last 30 days', value: 'month' },
          ],
        },
        {
          name: 'limit',
          description: 'How many to show. 10 or 25.',
          type: 'integer',
          required: false,
          choices: [
            { name: 'Top 10', value: 10 },
            { name: 'Top 25', value: 25 },
          ],
        },
      ],
    },
    execute: staffLeaderboard,
  },
];
