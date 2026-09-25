import {
  bloomError,
  DAILY_SMALL_WIN_LIMIT,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import { requireBloomMember } from '@bloom/permissions';
import { neutraliseMentions, sanitiseUserText } from '@bloom/utils';
import type { BloomMessage } from '@bloom/embeds';
import type {
  BloomCommand,
  CommandInvocation,
  SubcommandContribution,
} from '@bloom/commands';
import type { CompanionDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * Bloom Rewards commands.
 *
 * Two bare verbs and three subcommands, matching the namespace rules:
 * `/checkin` and `/win` are things members do most days, so they stay
 * top-level; everything that inspects the economy lives under `/companion`.
 *
 * Every one of them is ephemeral. Points are personal, a rank is nobody else's
 * business unless its owner mentions it, and a public reply to `/checkin` would
 * turn a quiet daily habit into a performance. The one thing that goes public
 * is a shared win, and only because sharing it is the entire point.
 */

const WIN_MAX_LENGTH = 280;

function requireGuild(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'A rewards command reached a handler without a guild id.',
    });
  }
  return id;
}

// -----------------------------------------------------------------------------
// /checkin
// -----------------------------------------------------------------------------

export const checkInCommand: BloomCommand<CompanionDeps> = {
  bot: 'companion',
  defer: true,
  ephemeral: true,

  spec: {
    name: 'checkin',
    description: 'Check in for today.',
    guildOnly: true,
    /*
     * No `options`. A check-in deliberately takes no text.
     *
     * The obvious design is a mood field, and it is the wrong one: it would
     * make this platform the custodian of a daily record of how everybody is
     * feeling, which is sensitive data with no operational use, no retention
     * policy that would be honest, and real consequences if it leaked. Members
     * who want to say how they are can reply in the channel, where their words
     * stay theirs.
     */
  },

  policy: requireBloomMember(),

  async execute(invocation, deps): Promise<BloomMessage> {
    const result = await deps.rewards.checkIn({
      guildId: requireGuild(invocation),
      userId: invocation.actor.userId,
      correlationId: invocation.correlationId,
    });

    if (result.kind === 'already_today') {
      return copy.alreadyCheckedInMessage(result.streak);
    }

    /*
     * Awards are evaluated by the command, not by the rewards service.
     *
     * Neither service knows about the other: rewards does not know milestones
     * exist, and awards does not know what a check-in is — it re-derives counts
     * from the records either way. Composing them here is what keeps that true,
     * and means a new action that should trigger an evaluation adds one line
     * rather than a dependency.
     */
    const granted = await deps.awards.evaluate({
      guildId: requireGuild(invocation),
      userId: invocation.actor.userId,
      correlationId: invocation.correlationId,
    });

    return copy.checkedInMessage({
      pointsAwarded: result.pointsAwarded,
      balance: result.balance,
      streak: result.streak,
      rankMove: result.rankMove,
      granted,
    });
  },
};

// -----------------------------------------------------------------------------
// /win
// -----------------------------------------------------------------------------

export const winCommand: BloomCommand<CompanionDeps> = {
  bot: 'companion',
  defer: true,
  ephemeral: true,

  spec: {
    name: 'win',
    description: 'Share something that went well.',
    guildOnly: true,
    options: [
      {
        name: 'description',
        description: 'What went well. Keep it short.',
        type: 'string',
        required: true,
        maxLength: WIN_MAX_LENGTH,
      },
    ],
  },

  policy: requireBloomMember(),

  async execute(invocation, deps): Promise<BloomMessage> {
    const raw = invocation.options.getString('description') ?? '';

    /*
     * This text is about to be posted into a channel, so it is scrubbed twice:
     * `sanitiseUserText` removes control characters and clamps the length, and
     * `neutraliseMentions` defuses @everyone and role pings. Without the
     * second, /win would be a way for any member to make the bot — which holds
     * Mention Everyone in no channel, but is still trusted — ping the server.
     */
    const description = neutraliseMentions(sanitiseUserText(raw, WIN_MAX_LENGTH));

    if (description.trim().length === 0) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'Add a few words about what went well.',
      });
    }

    const result = await deps.rewards.shareWin({
      guildId: requireGuild(invocation),
      userId: invocation.actor.userId,
      description,
      interactionId: invocation.interactionId,
      correlationId: invocation.correlationId,
    });

    switch (result.kind) {
      case 'duplicate':
        return copy.duplicateWinMessage();

      case 'shared_unpaid':
        return copy.winSharedUnpaidMessage({
          posted: result.posted,
          rewardsEnabled: deps.config.features.rewards,
          dailyLimit: DAILY_SMALL_WIN_LIMIT,
        });

      case 'shared': {
        const granted = await deps.awards.evaluate({
          guildId: requireGuild(invocation),
          userId: invocation.actor.userId,
          correlationId: invocation.correlationId,
        });

        return copy.winSharedMessage({
          pointsAwarded: result.pointsAwarded,
          balance: result.balance,
          rankMove: result.rankMove,
          posted: result.posted,
          granted,
        });
      }
    }
  },
};

// -----------------------------------------------------------------------------
// /companion profile | rank | leaderboard
// -----------------------------------------------------------------------------

async function showProfile(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const requested = invocation.options.getUser('member');
  const subject: UserId = requested?.id ?? invocation.actor.userId;

  const profile = await deps.rewards.profile(guildId, subject);
  return copy.profileMessage(profile, { self: subject === invocation.actor.userId });
}

async function showRank(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const profile = await deps.rewards.profile(
    requireGuild(invocation),
    invocation.actor.userId,
  );
  return copy.rankMessage(profile);
}

/**
 * Leaderboard periods.
 *
 * All-time is deliberately absent. It ranks longevity rather than
 * participation, it never changes at the top, and the only thing it tells a
 * member who joined last week is that they cannot win. A rolling window means
 * the board is always about what is happening now.
 */
const PERIODS: Readonly<
  Record<string, { readonly label: string; readonly days: number }>
> = {
  week: { label: 'last 7 days', days: 7 },
  month: { label: 'last 30 days', days: 30 },
};

async function showLeaderboard(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  if (!deps.config.features.rewards) return copy.rewardsDisabledMessage();

  const requested = invocation.options.getString('period') ?? 'week';
  const period = PERIODS[requested] ?? PERIODS['week']!;

  const entries = await deps.rewards.leaderboard(requireGuild(invocation), {
    days: period.days,
    limit: 10,
  });

  return copy.leaderboardMessage(entries, {
    periodLabel: period.label,
    viewer: invocation.actor.userId,
  });
}

/**
 * Contributed to `/companion`, not owned by it.
 *
 * Each declares `requireBloomMember()` even though the namespace already
 * requires it. The repetition is deliberate: a contribution's policy can only
 * narrow the namespace's, never widen it, so stating the floor here costs
 * nothing and means these branches keep their gate if `/companion` is ever
 * re-gated. The `jobs` branches do the same thing in the other direction.
 */
export const rewardsSubcommands: readonly SubcommandContribution<CompanionDeps>[] = [
  {
    spec: {
      name: 'profile',
      description: 'Show points, rank and recent activity.',
      options: [
        {
          name: 'member',
          description: 'Whose profile to show. Defaults to you.',
          type: 'user',
          required: false,
        },
      ],
    },
    policy: requireBloomMember(),
    execute: showProfile,
  },
  {
    spec: {
      name: 'rank',
      description: 'Show your rank and what is next.',
    },
    policy: requireBloomMember(),
    execute: showRank,
  },
  {
    spec: {
      name: 'leaderboard',
      description: 'Show the members who earned the most points recently.',
      options: [
        {
          name: 'period',
          description: 'How far back to look. Defaults to the last 7 days.',
          type: 'string',
          required: false,
          choices: [
            { name: 'Last 7 days', value: 'week' },
            { name: 'Last 30 days', value: 'month' },
          ],
        },
      ],
    },
    policy: requireBloomMember(),
    execute: showLeaderboard,
  },
];

export const rewardsCommands: readonly BloomCommand<CompanionDeps>[] = [
  checkInCommand,
  winCommand,
];
