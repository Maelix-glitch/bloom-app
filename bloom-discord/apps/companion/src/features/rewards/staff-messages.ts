import { staffEmbed, neutralEmbed, type BloomMessage } from '@bloom/embeds';
import { RANK_DISPLAY_NAMES, type PointKind, type UserId } from '@bloom/shared-types';
import { discordTimestamp } from '@bloom/utils';
import type { AwardProgress } from '../awards/service.js';
import type { MemberProfile } from './service.js';

/**
 * Copy for the staff side of Bloom Rewards.
 *
 * Separate from `messages.ts` because the audience is different. A member sees
 * their own progress framed as encouragement; staff see the same numbers
 * framed as a record they may have to act on — who awarded what, when, and
 * whether the economy is even switched on. Everything here is ephemeral.
 */

const mention = (userId: UserId): string => `<@${userId}>`;

/* Mirrors the member-facing labels. Exhaustive, so a new kind is a compile
 * error here too rather than a blank column in a staff view. */
const POINT_KIND_LABELS: Readonly<Record<PointKind, string>> = {
  check_in: 'Check-in',
  small_win: 'Small win',
  manual_award: 'Staff award',
  adjustment: 'Adjustment',
  referral: 'Referral',
  event_completion: 'Event',
  challenge_completion: 'Challenge',
  achievement_reward: 'Achievement',
};

/**
 * One member's standing, for staff.
 *
 * Shows the ledger and the progression side by side because that is how the
 * question actually arrives — "they say they should have hit Bloom Member by
 * now" is answered by the balance, the rank, and what they have earned, not by
 * any one of them.
 */
export function staffMemberRewardsMessage(input: {
  readonly profile: MemberProfile;
  readonly achievements: readonly AwardProgress[];
  readonly milestones: readonly AwardProgress[];
}): BloomMessage {
  const { profile } = input;

  const standing = [
    `**Member** ${mention(profile.userId)}`,
    `**Balance** ${String(profile.balance)} points`,
    `**Rank** ${RANK_DISPLAY_NAMES[profile.rank]}`,
    `**Next** ${
      profile.next
        ? `${RANK_DISPLAY_NAMES[profile.next.rank]} — ${String(profile.next.remaining)} to go`
        : 'Top of the ladder'
    }`,
    `**Streak** ${String(profile.streak)} day${profile.streak === 1 ? '' : 's'} · ${String(profile.checkInsLast30Days)} check-ins in 30 days`,
  ].join('\n');

  const ledger =
    profile.recent.length === 0
      ? '_No point events on record._'
      : profile.recent
          .map((event) => {
            const sign = event.points >= 0 ? '+' : '';
            const actor = event.awardedBy ? ` by ${mention(event.awardedBy)}` : '';
            const reason = event.reason ? ` · ${event.reason}` : '';
            return `${sign}${String(event.points)} · ${POINT_KIND_LABELS[event.kind]}${actor} · ${discordTimestamp(event.createdAt, 'R')}${reason}`;
          })
          .join('\n');

  const earned = input.achievements.filter((entry) => entry.award !== null);
  const reached = input.milestones.filter((entry) => entry.award !== null);

  const progression = [
    `**Milestones** ${String(reached.length)} of ${String(input.milestones.length)}`,
    `**Achievements** ${String(earned.length)} of ${String(input.achievements.length)}`,
    earned.length === 0
      ? '_No achievements earned yet._'
      : earned
          .slice(0, 5)
          .map(
            (entry) =>
              `${entry.definition.name}${
                entry.award ? ` · ${discordTimestamp(entry.award.earnedAt, 'R')}` : ''
              }`,
          )
          .join('\n'),
  ].join('\n');

  const footer = profile.rewardsEnabled
    ? 'Bloom Rewards is on. Companion data only — the main Bloom app is not connected.'
    : 'Bloom Rewards is OFF in this server: nothing new is being earned.';

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Staff view — rewards',
        description: `${standing}\n\n**Recent ledger**\n${ledger}\n\n**Progression**\n${progression}`,
        footer,
      }),
    ],
  };
}

/** The board, as staff see it: no "← you", and the size is stated. */
export function staffLeaderboardMessage(input: {
  readonly entries: readonly {
    readonly userId: UserId;
    readonly points: number;
    readonly events: number;
  }[];
  readonly periodLabel: string;
  readonly limit: number;
}): BloomMessage {
  if (input.entries.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          title: `Staff view — leaderboard · ${input.periodLabel}`,
          description: 'No points have been earned in this period.',
        }),
      ],
    };
  }

  const lines = input.entries.map((entry, index) => {
    const position = `${String(index + 1)}.`.padEnd(3, ' ');
    return `${position} ${mention(entry.userId)} · ${String(entry.points)} points · ${String(entry.events)} events`;
  });

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: `Staff view — leaderboard · ${input.periodLabel}`,
        description: lines.join('\n'),
        footer: `Top ${String(input.limit)}, ordered by points then earliest activity.`,
      }),
    ],
  };
}

/** Confirmation for a revocation. Deliberately plain. */
export function pointsRevokedMessage(input: {
  readonly userId: UserId;
  readonly points: number;
  readonly balance: number;
  readonly reason: string;
}): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Points removed',
        description: [
          `Removed **${String(input.points)}** points from ${mention(input.userId)}.`,
          `Their balance is now **${String(input.balance)}**.`,
          '',
          `Reason: ${input.reason}`,
        ].join('\n'),
        footer: 'Recorded in the ledger as an adjustment and in the audit trail.',
      }),
    ],
  };
}
