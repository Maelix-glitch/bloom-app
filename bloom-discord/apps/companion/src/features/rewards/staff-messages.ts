import { staffEmbed, neutralEmbed, type BloomMessage } from '@bloom/embeds';
import {
  RANK_DISPLAY_NAMES,
  REFERRAL_POINTS,
  type PointKind,
  type UserId,
} from '@bloom/shared-types';
import type { ReferralRejection, ReferralState, ReferralTrigger } from '@bloom/database';
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

/** Human labels for referral states. Exhaustive, so a new state will not compile. */
const REFERRAL_STATE_LABELS: Readonly<Record<ReferralState, string>> = {
  pending: 'Waiting',
  qualified: 'Qualified',
  paid: 'Paid',
  rejected: 'Not paid',
};

/**
 * Why a referral will never pay, in words a staff member can act on.
 *
 * These map the machine codes on the row. Each one is a normal outcome rather
 * than an error — the commonest by far is simply that attribution was not
 * certain, which is the system working as designed.
 */
const REFERRAL_REJECTION_LABELS: Readonly<Record<ReferralRejection, string>> = {
  no_inviter: 'inviter could not be identified',
  self_referral: 'inviter and member were the same account',
  account_too_new: 'Discord account was too new',
  left_before_qualifying: 'member left before qualifying',
  not_present: 'member was no longer in the server',
  already_referred: 'member had already been referred',
  inviter_is_bot: 'the invite was created by an app',
};

/**
 * Recent referral activity.
 *
 * Ephemeral, and it names members by mention rather than by username:
 * usernames change, ids do not, and a staff list that quotes a stale name is
 * worse than one that quotes none.
 */
export function referralActivity(
  rows: readonly ReferralTrigger[],
  state: ReferralState | null,
): BloomMessage {
  if (rows.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          title: 'Referrals',
          description: state
            ? `No referrals are currently ${REFERRAL_STATE_LABELS[state].toLowerCase()}.`
            : 'No joins have been recorded for referral yet. Attribution needs Guardian to hold Manage Server; if it does not, every join is recorded as unattributed.',
        }),
      ],
    };
  }

  const lines = rows.map((row) => {
    const who = row.inviterUserId
      ? `invited by ${mention(row.inviterUserId)}`
      : `no inviter (${row.source.replace('_', ' ')})`;
    const why = row.rejectedReason
      ? ` — ${REFERRAL_REJECTION_LABELS[row.rejectedReason]}`
      : '';

    return `**${REFERRAL_STATE_LABELS[row.state]}** · ${mention(row.referredUserId)} · ${who}${why} · ${discordTimestamp(row.createdAt, 'R')}`;
  });

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Referrals',
        description: ['Newest first.', '', ...lines].join('\n'),
        footer: `${String(REFERRAL_POINTS)} points per qualified referral, paid to the inviter only.`,
      }),
    ],
  };
}
