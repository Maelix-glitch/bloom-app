import { pluralise, type LocalDate } from '@bloom/utils';
import {
  RANK_DISPLAY_NAMES,
  type PointKind,
  type Rank,
  type UserId,
} from '@bloom/shared-types';
import { bloomEmbed, neutralEmbed, type BloomMessage } from '@bloom/embeds';
import type { AwardDefinition } from '../awards/definitions.js';
import { earnedLines } from '../awards/messages.js';
import type { MemberProfile, RankMove } from './service.js';

/**
 * Everything Bloom Rewards says out loud.
 *
 * The tone rules from the brief apply hardest here, because points are the part
 * of a community platform most likely to drift into slot-machine language. So:
 *
 *   • No exclamation marks, no confetti, no "you're on fire".
 *   • Points are reported, never celebrated. "+5 points" is a fact; "AMAZING,
 *     +5 POINTS!!" is an attempt to make someone feel something.
 *   • Nothing is ever framed as a loss. There is no "don't break your streak",
 *     because a streak here costs nothing to break — and telling someone
 *     otherwise would make that false.
 *   • A rank arriving is worth one quiet sentence, not a fanfare.
 *
 * These are asserted in the tests, not just described here.
 */

const POINT_KIND_LABELS: Readonly<Record<PointKind, string>> = {
  check_in: 'Check-in',
  small_win: 'Small win',
  manual_award: 'Awarded by staff',
  adjustment: 'Adjustment',
};

function rankName(rank: Rank): string {
  return RANK_DISPLAY_NAMES[rank];
}

/** One line, only when a rank actually changed. */
function rankLine(move: RankMove | null): readonly string[] {
  if (!move) return [];
  return ['', `You have reached ${rankName(move.to)}.`];
}

function streakLine(streak: number): string {
  if (streak <= 1) return 'First day back.';
  return `${pluralise(streak, 'day')} in a row.`;
}

export function checkedInMessage(input: {
  readonly pointsAwarded: number;
  readonly balance: number;
  readonly streak: number;
  readonly rankMove: RankMove | null;
  readonly granted?: readonly AwardDefinition[];
}): BloomMessage {
  const lines = [
    'Checked in for today.',
    streakLine(input.streak),
    ...(input.pointsAwarded > 0
      ? ['', `+${String(input.pointsAwarded)} points · ${String(input.balance)} total`]
      : []),
    ...rankLine(input.rankMove),
    ...earnedLines(input.granted ?? []),
  ];

  return {
    ephemeral: true,
    embeds: [bloomEmbed({ title: 'Check-in', description: lines.join('\n') })],
  };
}

export function alreadyCheckedInMessage(streak: number): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      neutralEmbed({
        title: 'Already checked in',
        description: [
          'You have already checked in today, so this one does not count twice.',
          streakLine(streak),
        ].join('\n'),
      }),
    ],
  };
}

export function winSharedMessage(input: {
  readonly pointsAwarded: number;
  readonly balance: number;
  readonly rankMove: RankMove | null;
  readonly posted: boolean;
  readonly granted?: readonly AwardDefinition[];
}): BloomMessage {
  const lines = [
    input.posted
      ? 'Shared to the small wins channel.'
      : 'Recorded. The small wins channel is not configured, so it was not posted.',
    '',
    `+${String(input.pointsAwarded)} points · ${String(input.balance)} total`,
    ...rankLine(input.rankMove),
    ...earnedLines(input.granted ?? []),
  ];

  return {
    ephemeral: true,
    embeds: [bloomEmbed({ title: 'Small win', description: lines.join('\n') })],
  };
}

/**
 * Past the daily cap, or rewards are switched off.
 *
 * Says what happened without a word of discouragement. The cap is on the
 * reward, not on how often someone is allowed to have a good day.
 */
export function winSharedUnpaidMessage(input: {
  readonly posted: boolean;
  readonly rewardsEnabled: boolean;
  readonly dailyLimit: number;
}): BloomMessage {
  const reason = input.rewardsEnabled
    ? `Today's ${pluralise(input.dailyLimit, 'win')} have already earned points, so this one did not add any. Share as many as you like.`
    : 'Bloom Rewards is switched off in this server, so no points were added.';

  return {
    ephemeral: true,
    embeds: [
      neutralEmbed({
        title: 'Small win',
        description: [
          input.posted
            ? 'Shared to the small wins channel.'
            : 'The small wins channel is not configured, so it was not posted.',
          '',
          reason,
        ].join('\n'),
      }),
    ],
  };
}

export function duplicateWinMessage(): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      neutralEmbed({
        title: 'Already shared',
        description: 'That win was already recorded. Nothing was added twice.',
      }),
    ],
  };
}

/**
 * Says which ladder this is.
 *
 * The Bloom app has its own progression — twelve ranks, with seasons — and this
 * server has nine. They share a vocabulary and count completely different
 * things: this one counts what a member does *here*. A member who sees
 * "Sprout" in Discord and something else in the app will otherwise reasonably
 * conclude that one of them is broken, and the honest fix is one restrained
 * line rather than a number that pretends to be a total.
 *
 * Linking the two would mean connecting a Discord account to a Bloom account —
 * OAuth, consent, a privacy review — which is a project, not a label. Until
 * that exists, saying so is the only truthful option. See
 * docs/architecture/decisions.md.
 */
const SCOPE_NOTE = 'Counts activity in this server. Bloom app progress is separate.';

export function profileMessage(
  profile: MemberProfile,
  options: { readonly self: boolean },
): BloomMessage {
  const who = options.self ? 'Your progress' : `<@${profile.userId}>`;

  const progress = profile.next
    ? `${String(profile.next.remaining)} points to ${rankName(profile.next.rank)}`
    : 'The full ladder, with nothing left to climb.';

  const lines = [
    `**${rankName(profile.rank)}** · ${String(profile.balance)} points`,
    progress,
    '',
    `${streakLine(profile.streak)} ${String(profile.checkInsLast30Days)} check-ins in the last 30 days.`,
  ];

  if (!profile.rewardsEnabled) {
    lines.push(
      '',
      'Bloom Rewards is switched off in this server. Nothing new is being added.',
    );
  }

  if (profile.recent.length > 0) {
    lines.push('', '**Recent**');
    for (const event of profile.recent) {
      const sign = event.points >= 0 ? '+' : '';
      lines.push(
        `${sign}${String(event.points)} · ${POINT_KIND_LABELS[event.kind]}` +
          (event.reason ? ` · ${event.reason}` : ''),
      );
    }
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({ title: who, description: lines.join('\n'), footer: SCOPE_NOTE }),
    ],
  };
}

export function rankMessage(profile: MemberProfile): BloomMessage {
  const lines = [
    `You are **${rankName(profile.rank)}** with ${String(profile.balance)} points in this server.`,
  ];

  if (profile.next) {
    lines.push(
      `${String(profile.next.remaining)} points to ${rankName(profile.next.rank)}.`,
    );
  } else {
    lines.push('That is the last of the named ranks.');
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Server rank',
        description: lines.join('\n'),
        footer: SCOPE_NOTE,
      }),
    ],
  };
}

/**
 * The leaderboard.
 *
 * Period-scoped and short by design. An all-time list of every member is a
 * status game — it ranks how long someone has been here, which nobody can
 * change, and it tells the person in 340th place something they did not ask.
 */
export function leaderboardMessage(
  entries: readonly { readonly userId: UserId; readonly points: number }[],
  input: { readonly periodLabel: string; readonly viewer: UserId },
): BloomMessage {
  if (entries.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          title: `Leaderboard · ${input.periodLabel}`,
          description: 'No points have been earned in this period yet.',
        }),
      ],
    };
  }

  const lines = entries.map((entry, index) => {
    const position = `${String(index + 1)}.`.padEnd(3, ' ');
    const you = entry.userId === input.viewer ? ' ← you' : '';
    return `${position} <@${entry.userId}> · ${String(entry.points)}${you}`;
  });

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: `Leaderboard · ${input.periodLabel}`,
        description: lines.join('\n'),
      }),
    ],
  };
}

export function rewardsDisabledMessage(): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      neutralEmbed({
        title: 'Bloom Rewards is off',
        description: [
          'Points are switched off in this server, so there is nothing to show.',
          'Check-ins and small wins still work; they simply do not earn anything.',
        ].join('\n'),
      }),
    ],
  };
}

/** Used only in tests and diagnostics, so the date format stays one decision. */
export function formatLocalDate(date: LocalDate): string {
  return date;
}
