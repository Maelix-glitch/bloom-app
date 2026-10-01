import type {
  CommunityActivity,
  CommunityParticipant,
  ChallengeMetric,
} from '@bloom/database';
import { bloomEmbed, staffEmbed, type BloomMessage } from '@bloom/embeds';
import { discordTimestamp } from '@bloom/utils';
import type { UserId } from '@bloom/shared-types';
import type { ChallengeProgress } from './service.js';

/**
 * How a community activity reads.
 *
 * The temptation with events and challenges is the countdown banner: emoji
 * bar, "ONLY 3 SPOTS LEFT", a reminder every six hours. That turns a
 * community into a storefront. These stay to the facts — what it is, when it
 * runs, what finishing gives you — and let the activity be interesting on its
 * own.
 */

const METRIC_LABELS: Readonly<Record<ChallengeMetric, string>> = {
  check_ins: 'check-ins',
  qualified_referrals: 'people invited who stayed',
  event_participation: 'events completed',
};

/** "25 points" / "recognition only". Never "25 POINTS!!". */
function rewardLine(activity: CommunityActivity): string {
  const parts: string[] = [];
  if (activity.rewardPoints > 0) {
    parts.push(`${String(activity.rewardPoints)} points`);
  }
  if (activity.achievementKey) parts.push('an achievement');
  return parts.length === 0 ? 'Nothing but the doing of it.' : parts.join(' and ');
}

function windowLine(activity: CommunityActivity): string {
  return `${discordTimestamp(activity.startsAt, 'D')} → ${discordTimestamp(activity.endsAt, 'D')}`;
}

function objectiveLine(activity: CommunityActivity): string | null {
  if (activity.targetMetric === null || activity.targetAmount === null) return null;
  return `${String(activity.targetAmount)} ${METRIC_LABELS[activity.targetMetric]}`;
}

/** Posted once, publicly, when staff create an activity. */
export function announcement(activity: CommunityActivity): BloomMessage {
  const objective = objectiveLine(activity);
  const lines = [
    activity.description,
    '',
    `**When** ${windowLine(activity)}`,
    ...(objective ? [`**Goal** ${objective}`] : []),
    ...(activity.capacity !== null ? [`**Places** ${String(activity.capacity)}`] : []),
    `**Reward** ${rewardLine(activity)}`,
    ...(activity.kind === 'event'
      ? ['', 'Join with `/companion event join`.']
      : ['', 'Nothing to sign up for — `/companion challenges` shows where you are.']),
  ];

  return {
    embeds: [
      bloomEmbed({
        title: activity.title,
        description: lines.join('\n'),
      }),
    ],
  };
}

/** Sent privately when a member completes something. */
export function completionNotice(activity: CommunityActivity): BloomMessage {
  return {
    embeds: [
      bloomEmbed({
        title: activity.title,
        description: [
          activity.kind === 'challenge'
            ? 'You finished this challenge.'
            : 'Thanks for coming.',
          '',
          `**Reward** ${rewardLine(activity)}`,
        ].join('\n'),
      }),
    ],
  };
}

export function joined(activity: CommunityActivity): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'You are in',
        description: [
          `**${activity.title}**`,
          windowLine(activity),
          '',
          'Leave any time with `/companion event leave`.',
        ].join('\n'),
      }),
    ],
  };
}

export function alreadyJoined(activity: CommunityActivity): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Already signed up',
        description: `You are on the list for **${activity.title}**. Nothing more to do.`,
      }),
    ],
  };
}

export function full(activity: CommunityActivity): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'No places left',
        description: [
          `**${activity.title}** is full.`,
          '',
          // No waitlist, said plainly rather than implied by silence.
          'There is no waiting list. If someone leaves, the place reopens.',
        ].join('\n'),
      }),
    ],
  };
}

export function closed(activity: CommunityActivity): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Closed',
        description: `**${activity.title}** is no longer open.`,
      }),
    ],
  };
}

export function left(activity: CommunityActivity): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Taken off the list',
        description: `You are no longer signed up for **${activity.title}**.`,
      }),
    ],
  };
}

export function notJoined(activity: CommunityActivity): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Not signed up',
        description: `You were not on the list for **${activity.title}**.`,
      }),
    ],
  };
}

export function notFound(): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Not found',
        description: 'No activity with that id in this server.',
      }),
    ],
  };
}

/** The member's view of one event. */
export function eventInfo(input: {
  readonly activity: CommunityActivity;
  readonly counts: { joined: number; completed: number };
  readonly participant: CommunityParticipant | null;
}): BloomMessage {
  const { activity, counts, participant } = input;
  const places =
    activity.capacity === null
      ? `${String(counts.joined)} going`
      : `${String(counts.joined)} of ${String(activity.capacity)} places taken`;

  const standing =
    participant === null || participant.state === 'withdrawn'
      ? 'You are not signed up.'
      : participant.state === 'completed'
        ? 'You took part in this.'
        : 'You are signed up.';

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: activity.title,
        description: [
          activity.description,
          '',
          `**When** ${windowLine(activity)}`,
          `**Places** ${places}`,
          `**Reward** ${rewardLine(activity)}`,
          '',
          standing,
        ].join('\n'),
      }),
    ],
  };
}

export function eventList(
  entries: readonly {
    readonly activity: CommunityActivity;
    readonly participant: CommunityParticipant | null;
  }[],
): BloomMessage {
  if (entries.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        bloomEmbed({
          title: 'Events',
          description: 'Nothing scheduled right now.',
        }),
      ],
    };
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Events',
        description: entries
          .map(({ activity, participant }) => {
            const mine =
              participant !== null && participant.state !== 'withdrawn'
                ? ' · signed up'
                : '';
            return [
              `**${activity.title}** · ${discordTimestamp(activity.startsAt, 'D')}${mine}`,
              `\`${activity.id}\``,
            ].join('\n');
          })
          .join('\n\n'),
      }),
    ],
  };
}

/** The member's view of running challenges. */
export function challengeList(entries: readonly ChallengeProgress[]): BloomMessage {
  if (entries.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        bloomEmbed({
          title: 'Challenges',
          description: 'Nothing running right now.',
        }),
      ],
    };
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Challenges',
        description: [
          entries
            .map(({ activity, current, target, completed }) => {
              const objective = objectiveLine(activity) ?? '';
              const status = completed
                ? 'done'
                : `${String(Math.min(current, target))} of ${String(target)}`;
              return `**${activity.title}** · ${objective} · ${status}`;
            })
            .join('\n'),
          '',
          // Said once, plainly: nothing here needs signing up for.
          'Challenges count what you were already doing. There is nothing to join.',
        ].join('\n'),
      }),
    ],
  };
}

/* -----------------------------------------------------------------------------
 * Staff
 * ---------------------------------------------------------------------------*/

export function created(activity: CommunityActivity): BloomMessage {
  const objective = objectiveLine(activity);
  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: `${activity.kind === 'challenge' ? 'Challenge' : 'Event'} created`,
        description: [
          `**${activity.title}**`,
          `\`${activity.id}\``,
          '',
          `**When** ${windowLine(activity)}`,
          ...(objective ? [`**Goal** ${objective}`] : []),
          ...(activity.capacity !== null
            ? [`**Places** ${String(activity.capacity)}`]
            : []),
          `**Reward** ${rewardLine(activity)}`,
        ].join('\n'),
        footer: 'Announced once. Close it with the matching close command.',
      }),
    ],
  };
}

export function closedResult(input: {
  readonly activity: CommunityActivity;
  readonly completed: number;
  readonly failed: number;
}): BloomMessage {
  const { activity, completed, failed } = input;
  const lines = [
    `**${activity.title}**`,
    `**Outcome** ${activity.status === 'completed' ? 'Completed' : 'Cancelled'}`,
  ];

  if (activity.status === 'completed' && activity.kind === 'event') {
    lines.push(`**Paid** ${String(completed)}`);
    if (failed > 0) {
      // Never silently swallowed: an owed payment is an operational fact.
      lines.push(
        `**Still owed** ${String(failed)} — the completion is recorded and can be paid by closing again.`,
      );
    }
  }

  return {
    ephemeral: true,
    embeds: [staffEmbed({ title: 'Closed', description: lines.join('\n') })],
  };
}

export function staffList(
  entries: readonly {
    readonly activity: CommunityActivity;
    readonly counts: { joined: number; completed: number };
  }[],
  kind: 'challenge' | 'event',
): BloomMessage {
  if (entries.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: kind === 'challenge' ? 'Challenges' : 'Events',
          description: 'None on record.',
        }),
      ],
    };
  }

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: kind === 'challenge' ? 'Challenges' : 'Events',
        description: entries
          .map(({ activity, counts }) => {
            const objective = objectiveLine(activity);
            const places =
              activity.capacity === null ? '' : ` of ${String(activity.capacity)}`;
            return [
              `**${activity.title}** · ${activity.status}`,
              `\`${activity.id}\``,
              `${windowLine(activity)} · by <@${activity.createdBy}>`,
              kind === 'event'
                ? `${String(counts.joined)}${places} signed up · ${String(counts.completed)} completed`
                : `${objective ?? 'no goal'} · ${String(counts.completed)} completed`,
              `Reward: ${rewardLine(activity)}`,
            ].join('\n');
          })
          .join('\n\n'),
        footer: 'Ephemeral. Ordered by end date, newest first.',
      }),
    ],
  };
}

export function creatorMention(userId: UserId): string {
  return `<@${userId}>`;
}
