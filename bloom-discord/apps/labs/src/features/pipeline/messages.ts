import type { LabsCohort, LabsFeature, LabsReleaseNote } from '@bloom/database';
import { LABS_FEATURE_STATUS_LABELS } from '@bloom/database';
import {
  bloomEmbed,
  neutralEmbed,
  noticeEmbed,
  successEmbed,
  type BloomMessage,
} from '@bloom/embeds';
import { discordTimestamp, escapeMarkdown, neutraliseMentions } from '@bloom/utils';

/** Stored text, made safe to render. Same rule as intake's copy. */
function forDiscord(text: string): string {
  return escapeMarkdown(neutraliseMentions(text));
}

/**
 * Everything Labs says about the pipeline: features, votes, cohorts and
 * release notes.
 *
 * The honesty rules from intake apply unchanged — say what is recorded, say
 * what happens next, promise nothing nobody agreed to. Two are specific to
 * this surface:
 *
 * **A vote is backing, not a ballot.** The copy never calls voting an
 * election or implies the top feature gets built. Members are telling the
 * team what they would use; the team still decides.
 *
 * **Cohort membership grants nothing.** Every cohort reply says membership
 * is a list the team reads, and that channel access is a separate staff
 * grant. A member who believes joining opened something it did not would
 * be misled by silence, so it is said out loud.
 */

const PIPELINE_ORDER: readonly LabsFeature['status'][] = [
  'building',
  'testing',
  'proposed',
  'shipped',
  'parked',
];

const MAX_LISTED_FEATURES = 20;
const MAX_LISTED_COHORTS = 20;

function voteLine(feature: LabsFeature, voted: boolean): string {
  const mark = voted ? ' · you back this' : '';
  return `**${forDiscord(feature.name)}** — ${String(feature.votes)} backing${mark}`;
}

export function featureListMessage(
  features: readonly LabsFeature[],
  votedIds: ReadonlySet<string>,
): BloomMessage {
  if (features.length === 0) {
    return {
      embeds: [
        noticeEmbed({
          title: 'The feature pipeline',
          description:
            'Nothing is on the pipeline yet. When the team starts shaping what comes next, it will be listed here.',
        }),
      ],
    };
  }

  const sections: string[] = [];
  for (const status of PIPELINE_ORDER) {
    const inStatus = features.filter((feature) => feature.status === status);
    if (inStatus.length === 0) continue;
    const lines = inStatus
      .slice(0, MAX_LISTED_FEATURES)
      .map((feature) => voteLine(feature, votedIds.has(feature.id)));
    sections.push(`**${LABS_FEATURE_STATUS_LABELS[status]}**\n${lines.join('\n')}`);
  }

  return {
    embeds: [
      bloomEmbed({
        title: 'The feature pipeline',
        description:
          sections.join('\n\n') +
          '\n\nBacking a feature tells the team what you would use. It is a signal, not a vote that decides — `/labs vote <name>` adds or removes your backing.',
      }),
    ],
  };
}

export function featureDetailMessage(feature: LabsFeature, voted: boolean): BloomMessage {
  const lines = [
    `**Status:** ${LABS_FEATURE_STATUS_LABELS[feature.status]}`,
    `**Backing:** ${String(feature.votes)}${voted ? ' (including you)' : ''}`,
  ];
  if (feature.description) lines.push('', forDiscord(feature.description));
  return {
    embeds: [
      bloomEmbed({ title: forDiscord(feature.name), description: lines.join('\n') }),
    ],
  };
}

export function featureNotFoundMessage(name: string): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: 'No feature by that name',
        description: `There is nothing on the pipeline called "${forDiscord(name)}". Run \`/labs feature status\` to see the current list.`,
      }),
    ],
  };
}

export function voteRecordedMessage(feature: LabsFeature): BloomMessage {
  return {
    embeds: [
      successEmbed({
        title: 'Backing recorded',
        description: `You now back **${forDiscord(feature.name)}** (${String(feature.votes)} backing). Run the same command again to withdraw it.`,
      }),
    ],
  };
}

export function voteWithdrawnMessage(feature: LabsFeature): BloomMessage {
  return {
    embeds: [
      neutralEmbed({
        title: 'Backing withdrawn',
        description: `You no longer back **${forDiscord(feature.name)}** (${String(feature.votes)} backing).`,
      }),
    ],
  };
}

export function voteClosedMessage(feature: LabsFeature): BloomMessage {
  const reason =
    feature.status === 'shipped'
      ? 'it has shipped — backing is for things still being shaped'
      : 'it is parked — backing reopens if the team picks it up again';
  return {
    embeds: [
      noticeEmbed({
        title: 'Backing is closed for this feature',
        description: `**${forDiscord(feature.name)}** is not taking backing: ${reason}.`,
      }),
    ],
  };
}

export function cohortListMessage(
  cohorts: readonly LabsCohort[],
  memberIds: ReadonlySet<string>,
): BloomMessage {
  if (cohorts.length === 0) {
    return {
      embeds: [
        noticeEmbed({
          title: 'Beta cohorts',
          description:
            'No cohorts are running right now. When a test round opens, it will be listed here.',
        }),
      ],
    };
  }

  const lines = cohorts.slice(0, MAX_LISTED_COHORTS).map((cohort) => {
    const state = memberIds.has(cohort.id)
      ? 'you are in'
      : cohort.joinable
        ? 'open to join'
        : 'closed to new members';
    return `**${forDiscord(cohort.name)}** — ${String(cohort.members)} members · ${state}`;
  });

  return {
    embeds: [
      bloomEmbed({
        title: 'Beta cohorts',
        description:
          lines.join('\n') +
          '\n\nJoining puts your name on the list the team reads when a test round runs. It does not open any channels by itself — access is granted separately by staff.',
      }),
    ],
  };
}

export function cohortJoinedMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      successEmbed({
        title: 'You are on the list',
        description: `You joined **${forDiscord(cohort.name)}** (${String(cohort.members)} members). Membership is the list itself — if the test round uses channels, staff grant that access separately.`,
      }),
    ],
  };
}

export function cohortAlreadyMemberMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      neutralEmbed({
        title: 'Already a member',
        description: `You are already in **${forDiscord(cohort.name)}**.`,
      }),
    ],
  };
}

export function cohortClosedMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: 'This cohort is closed',
        description: `**${forDiscord(cohort.name)}** is not taking new members right now. Existing members keep their place.`,
      }),
    ],
  };
}

export function cohortLeftMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      neutralEmbed({
        title: 'You left the cohort',
        description: `You are no longer in **${forDiscord(cohort.name)}**. You can rejoin while it is open.`,
      }),
    ],
  };
}

export function cohortNotMemberMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      neutralEmbed({
        title: 'Not a member',
        description: `You are not in **${forDiscord(cohort.name)}**, so there is nothing to leave.`,
      }),
    ],
  };
}

export function cohortNotFoundMessage(name: string): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: 'No cohort by that name',
        description: `There is no cohort called "${forDiscord(name)}". Run \`/labs cohort list\` to see what is running.`,
      }),
    ],
  };
}

export function featureCreatedMessage(feature: LabsFeature): BloomMessage {
  return {
    embeds: [
      successEmbed({
        title: 'Feature added',
        description: `**${forDiscord(feature.name)}** is on the pipeline as ${LABS_FEATURE_STATUS_LABELS[feature.status]}.`,
      }),
    ],
  };
}

export function featureExistsMessage(feature: LabsFeature): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: 'Already on the pipeline',
        description: `**${forDiscord(feature.name)}** already exists (${LABS_FEATURE_STATUS_LABELS[feature.status]}). Nothing was added.`,
      }),
    ],
  };
}

export function featureStatusSetMessage(feature: LabsFeature): BloomMessage {
  return {
    embeds: [
      successEmbed({
        title: 'Feature updated',
        description: `**${forDiscord(feature.name)}** is now ${LABS_FEATURE_STATUS_LABELS[feature.status]}.`,
      }),
    ],
  };
}

export function cohortCreatedMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      successEmbed({
        title: 'Cohort created',
        description: `**${forDiscord(cohort.name)}** exists and is ${cohort.joinable ? 'open to join' : 'closed to new members'}. Members join with \`/labs cohort join\`.`,
      }),
    ],
  };
}

export function cohortExistsMessage(cohort: LabsCohort): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: 'Cohort already exists',
        description: `**${forDiscord(cohort.name)}** is already running with ${String(cohort.members)} members. Nothing was created.`,
      }),
    ],
  };
}

export function releaseMessage(note: LabsReleaseNote): BloomMessage {
  return {
    embeds: [
      bloomEmbed({
        title: `${forDiscord(note.version)} — ${forDiscord(note.title)}`,
        description: forDiscord(note.body),
        footer: `Published ${discordTimestamp(note.publishedAt)}`,
      }),
    ],
  };
}

export function releasePublishedMessage(
  note: LabsReleaseNote,
  posted: boolean,
): BloomMessage {
  return {
    embeds: [
      successEmbed({
        title: 'Release notes published',
        description:
          `**${forDiscord(note.version)} — ${forDiscord(note.title)}** is saved as the latest release.` +
          (posted
            ? ' It was also posted to the release-notes channel.'
            : ' No release-notes channel is configured, so it was saved but not announced.'),
      }),
    ],
  };
}

export function noReleaseMessage(): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: 'No release notes yet',
        description:
          'Nothing has been published. When the team ships something and writes it up, the latest notes will be here.',
      }),
    ],
  };
}
