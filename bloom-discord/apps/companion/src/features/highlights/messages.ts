import type { CommunityActivity, MemberAward } from '@bloom/database';
import { bloomEmbed, neutralEmbed, staffEmbed, type BloomMessage } from '@bloom/embeds';
import { discordTimestamp } from '@bloom/utils';
import type { UserId } from '@bloom/shared-types';
import { awardByKey } from '../awards/definitions.js';
import type {
  ActivityParticipation,
  BoardCategory,
  BoardEntry,
  BoardResult,
  HighlightsView,
  RecapSummary,
  StaffOverview,
  StatusView,
} from './service.js';

/**
 * How the community reads itself.
 *
 * The failure mode these surfaces invite is the engagement dashboard: five
 * numbers that go up, a flame emoji, "🔥 THE COMMUNITY IS ON FIRE". That is
 * how a place stops being a community and starts being a product with a
 * retention problem. Everything here states a number, says over what period,
 * and stops.
 *
 * Two rules the whole file keeps:
 *
 *   • A section with nothing in it is omitted, not padded with "No data yet".
 *     Six empty headings make a quiet week look broken; one honest line saying
 *     the week was quiet does not.
 *   • Nothing is ever shown that the member could not already see. Every name
 *     here appears because that person earned points, finished an activity,
 *     invited someone who stayed, or was granted an award — all of which are
 *     already public events. No balances, no private notes, no moderation.
 */

const CATEGORY_LABELS: Readonly<Record<BoardCategory, string>> = {
  points: 'Bloom Points',
  referrals: 'People invited who stayed',
  challenges: 'Challenges finished',
  events: 'Events finished',
};

/** Singular/plural for the unit a board counts. Points are already a noun. */
const CATEGORY_UNITS: Readonly<Record<BoardCategory, (value: number) => string>> = {
  points: (value) => `${String(value)} points`,
  referrals: (value) => (value === 1 ? '1 person' : `${String(value)} people`),
  challenges: (value) => (value === 1 ? '1 challenge' : `${String(value)} challenges`),
  events: (value) => (value === 1 ? '1 event' : `${String(value)} events`),
};

const PERIOD_LABELS: Readonly<Record<string, string>> = {
  week: 'last 7 days',
  month: 'last 30 days',
  all: 'all time',
};

function rankLines(
  entries: readonly BoardEntry[],
  category: BoardCategory,
  viewer?: UserId,
): string[] {
  return entries.map((entry, index) => {
    const position = `${String(index + 1)}.`.padEnd(3, ' ');
    const you = viewer && entry.userId === viewer ? ' ← you' : '';
    return `${position} <@${entry.userId}> · ${CATEGORY_UNITS[category](entry.value)}${you}`;
  });
}

/** An award's display name, falling back to its key if the definition is gone. */
function awardLabel(award: MemberAward): string {
  return awardByKey(award.awardKey)?.name ?? award.awardKey;
}

function awardLines(awards: readonly MemberAward[]): string[] {
  return awards.map((award) => `<@${award.userId}> · ${awardLabel(award)}`);
}

function activityLine(activity: CommunityActivity): string {
  return `**${activity.title}** · ends ${discordTimestamp(activity.endsAt, 'R')}`;
}

function upcomingLine(activity: CommunityActivity): string {
  return `**${activity.title}** · starts ${discordTimestamp(activity.startsAt, 'R')}`;
}

// -----------------------------------------------------------------------------
// Leaderboard
// -----------------------------------------------------------------------------

export function boardMessage(result: BoardResult, viewer: UserId): BloomMessage {
  const title = `${CATEGORY_LABELS[result.category]} · ${PERIOD_LABELS[result.period] ?? ''}`;

  if (result.entries.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          title,
          description: emptyBoardLine(result.category),
        }),
      ],
    };
  }

  const lines = rankLines(result.entries, result.category, viewer);

  /*
   * Said plainly when the period asked for was not the period shown.
   * Silently serving 30 days to someone who asked for all time would make the
   * board look wrong rather than bounded.
   */
  if (result.requested !== result.period) {
    lines.push(
      '',
      'Points are always a rolling total, so there is no all-time view — it would rank how long someone has been here rather than what they have been doing.',
    );
  }

  return {
    ephemeral: true,
    embeds: [bloomEmbed({ title, description: lines.join('\n') })],
  };
}

function emptyBoardLine(category: BoardCategory): string {
  switch (category) {
    case 'points':
      return 'No points have been earned in this period yet.';
    case 'referrals':
      return 'No invited members have settled in during this period yet.';
    case 'challenges':
      return 'No challenges have been finished in this period yet.';
    case 'events':
      return 'No events have been finished in this period yet.';
  }
}

// -----------------------------------------------------------------------------
// /companion community highlights
// -----------------------------------------------------------------------------

export function highlightsMessage(view: HighlightsView): BloomMessage {
  const sections: string[] = [];

  if (view.topContributors.length > 0) {
    sections.push(
      [
        '**Most active · last 7 days**',
        ...rankLines(view.topContributors, 'points'),
      ].join('\n'),
    );
  }

  if (view.topReferrers.length > 0) {
    sections.push(
      [
        '**Brought people in · last 30 days**',
        ...rankLines(view.topReferrers, 'referrals'),
      ].join('\n'),
    );
  }

  if (view.achievements.length > 0) {
    sections.push(['**Recently earned**', ...awardLines(view.achievements)].join('\n'));
  }

  if (view.milestones.length > 0) {
    sections.push(['**Milestones reached**', ...awardLines(view.milestones)].join('\n'));
  }

  if (sections.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          title: 'Community highlights',
          description:
            'Nothing to highlight from the last month yet. Check in, share a small win, or join an event — that is all this is made of.',
        }),
      ],
    };
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Community highlights',
        description: sections.join('\n\n'),
        footer: 'The people behind the numbers. Nothing here is private.',
      }),
    ],
  };
}

// -----------------------------------------------------------------------------
// /companion community status
// -----------------------------------------------------------------------------

export function statusMessage(view: StatusView): BloomMessage {
  const sections: string[] = [];

  if (view.challenges.length > 0) {
    sections.push(
      ['**Challenges running**', ...view.challenges.map(activityLine)].join('\n'),
    );
  }

  if (view.currentEvents.length > 0) {
    sections.push(
      ['**Events happening**', ...view.currentEvents.map(activityLine)].join('\n'),
    );
  }

  if (view.upcomingEvents.length > 0) {
    sections.push(['**Coming up**', ...view.upcomingEvents.map(upcomingLine)].join('\n'));
  }

  const activity: string[] = [];
  if (view.points.events > 0) {
    activity.push(
      `${String(view.points.members)} ${view.points.members === 1 ? 'member' : 'members'} earned ${String(view.points.awarded)} points`,
    );
  }
  if (view.participation.challengeCompletions > 0) {
    activity.push(
      `${String(view.participation.challengeCompletions)} challenge ${view.participation.challengeCompletions === 1 ? 'completion' : 'completions'}`,
    );
  }
  if (view.participation.eventCompletions > 0) {
    activity.push(
      `${String(view.participation.eventCompletions)} event ${view.participation.eventCompletions === 1 ? 'completion' : 'completions'}`,
    );
  }

  if (activity.length > 0) {
    sections.push(['**This week**', ...activity.map((line) => `· ${line}`)].join('\n'));
  }

  if (sections.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          title: 'Community status',
          description:
            'Nothing is running at the moment and the last week has been quiet. Staff announce new challenges and events as they open.',
        }),
      ],
    };
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({ title: 'Community status', description: sections.join('\n\n') }),
    ],
  };
}

// -----------------------------------------------------------------------------
// The weekly recap
// -----------------------------------------------------------------------------

/**
 * The one public post in this feature.
 *
 * Not ephemeral, and not addressed to anyone — it is the community looking at
 * its own week. Which is why it names only people who were already named
 * publicly when they earned the thing, and why a quiet week says so instead of
 * reaching for something to celebrate.
 */
export function recapMessage(summary: RecapSummary): BloomMessage {
  const week = `${discordTimestamp(summary.from, 'D')} → ${discordTimestamp(summary.to, 'D')}`;

  if (summary.quiet) {
    return {
      embeds: [
        neutralEmbed({
          title: 'The week in Bloom',
          description: [
            week,
            '',
            'A quiet week. Nothing was earned and nothing finished — which is a perfectly good week to have had.',
          ].join('\n'),
        }),
      ],
    };
  }

  const figures: string[] = [];
  if (summary.participatingMembers > 0) {
    figures.push(
      `**${String(summary.participatingMembers)}** ${summary.participatingMembers === 1 ? 'member took part' : 'members took part'}`,
    );
  }
  if (summary.pointsAwarded > 0) {
    figures.push(`**${String(summary.pointsAwarded)}** points earned`);
  }
  if (summary.challengeCompletions > 0) {
    figures.push(
      `**${String(summary.challengeCompletions)}** ${summary.challengeCompletions === 1 ? 'challenge' : 'challenges'} finished`,
    );
  }
  if (summary.eventCompletions > 0) {
    figures.push(
      `**${String(summary.eventCompletions)}** ${summary.eventCompletions === 1 ? 'event' : 'events'} finished`,
    );
  }
  if (summary.referrals > 0) {
    figures.push(
      `**${String(summary.referrals)}** invited ${summary.referrals === 1 ? 'member' : 'members'} settled in`,
    );
  }

  const sections = [week, '', ...figures.map((line) => `· ${line}`)];

  if (summary.topContributors.length > 0) {
    sections.push('', '**Most active**', ...rankLines(summary.topContributors, 'points'));
  }

  if (summary.awards.length > 0) {
    sections.push('', '**Earned this week**', ...awardLines(summary.awards));
  }

  return {
    embeds: [
      bloomEmbed({
        title: 'The week in Bloom',
        description: sections.join('\n'),
        footer: 'Posted weekly. Nothing here is private.',
      }),
    ],
  };
}

// -----------------------------------------------------------------------------
// Staff overview
// -----------------------------------------------------------------------------

function participationLine(row: ActivityParticipation): string {
  const parts = [`${String(row.joined)} joined`, `${String(row.completed)} completed`];
  if (row.activity.capacity !== null) {
    parts.push(`${String(row.activity.capacity)} places`);
  }
  return `**${row.activity.title}** · ${parts.join(' · ')}`;
}

export function staffOverviewMessage(overview: StaffOverview): BloomMessage {
  const sections: string[] = [];

  sections.push(
    overview.challenges.length > 0
      ? ['**Challenges running**', ...overview.challenges.map(participationLine)].join(
          '\n',
        )
      : '**Challenges running** · none',
  );

  sections.push(
    overview.events.length > 0
      ? ['**Events running**', ...overview.events.map(participationLine)].join('\n')
      : '**Events running** · none',
  );

  if (overview.upcomingEvents.length > 0) {
    sections.push(
      [
        '**Events upcoming**',
        ...overview.upcomingEvents.map(
          (row) =>
            `**${row.activity.title}** · starts ${discordTimestamp(row.activity.startsAt, 'R')} · ${String(row.joined)} joined`,
        ),
      ].join('\n'),
    );
  }

  sections.push(
    [
      '**Last 30 days**',
      `· ${String(overview.rewards.points)} points across ${String(overview.rewards.events)} awards to ${String(overview.rewards.members)} members`,
      `· ${String(overview.referrals)} referrals qualified`,
      `· ${String(overview.awards.length)} awards granted`,
    ].join('\n'),
  );

  if (overview.awards.length > 0) {
    sections.push(['**Recent recognition**', ...awardLines(overview.awards)].join('\n'));
  }

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Community overview',
        description: sections.join('\n\n'),
        footer: 'Read-only. Counts, not member records.',
      }),
    ],
  };
}
