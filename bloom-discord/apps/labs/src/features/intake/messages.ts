import type { UserId } from '@bloom/shared-types';
import type { BugReport, BugStatus, FeedbackEntry } from '@bloom/database';
import {
  bloomEmbed,
  errorMessage,
  neutralEmbed,
  noticeEmbed,
  successEmbed,
  type BloomMessage,
} from '@bloom/embeds';
import { bloomError } from '@bloom/shared-types';
import { escapeMarkdown, neutraliseMentions } from '@bloom/utils';

/**
 * Make stored text safe to render in Discord.
 *
 * Applied here rather than before storage: the database keeps what the member
 * wrote, and this is the one renderer that needs it escaped. `allowed_mentions`
 * on the adapter is the real control against pings; this is defence in depth
 * and stops a summary full of asterisks reformatting the embed.
 */
function forDiscord(text: string): string {
  return escapeMarkdown(neutraliseMentions(text));
}

/**
 * Everything Labs says about feedback and bugs.
 *
 * The tone problem here is specific. Intake copy drifts towards either
 * corporate ("Your ticket has been logged and prioritised accordingly") or
 * hollow enthusiasm ("Thanks so much!! 🎉"). Both are ways of not saying what
 * actually happens next, and the second is the one the brief rules out by name.
 *
 * So: say what was recorded, say who will see it, and do not imply a service
 * level nobody has agreed to.
 */

export const STATUS_LABELS: Readonly<Record<BugStatus, string>> = {
  NEW: 'New',
  TRIAGED: 'Triaged',
  FIXED: 'Fixed',
  WONT_FIX: 'Will not fix',
  DUPLICATE: 'Duplicate',
};

const CATEGORY_LABELS: Readonly<Record<FeedbackEntry['category'], string>> = {
  feature: 'Feature idea',
  improvement: 'Improvement',
  content: 'Content',
  other: 'Something else',
};

const AREA_LABELS: Readonly<Record<BugReport['area'], string>> = {
  app: 'Bloom app',
  discord: 'Discord',
  account: 'Account',
  other: 'Something else',
};

function mention(userId: UserId): string {
  return `<@${userId}>`;
}

// -----------------------------------------------------------------------------
// Feedback
// -----------------------------------------------------------------------------

/** The public post. Attributed, because feedback is a contribution. */
export function feedbackAnnouncement(entry: FeedbackEntry, userId: UserId): BloomMessage {
  const lines = [
    `**${CATEGORY_LABELS[entry.category]}** · from ${mention(userId)}`,
    '',
    forDiscord(entry.summary),
    ...(entry.detail ? ['', forDiscord(entry.detail)] : []),
  ];

  return {
    ephemeral: false,
    embeds: [neutralEmbed({ title: 'Feedback', description: lines.join('\n') })],
  };
}

export function feedbackSubmitted(posted: boolean): BloomMessage {
  const lines = [
    'Recorded.',
    posted
      ? 'It is in the feedback channel where the team reads it.'
      : 'No feedback channel is configured here, so it is recorded but not posted. The team can still read it.',
    '',
    // The honest part. There is no triage queue for feedback and pretending
    // otherwise would be the fake functionality the brief forbids.
    'There is no status to check — feedback is read, not ticketed. If it turns into something, it will show up in the release notes.',
  ];

  return {
    ephemeral: true,
    embeds: [successEmbed({ title: 'Thank you', description: lines.join('\n') })],
  };
}

// -----------------------------------------------------------------------------
// Bugs
// -----------------------------------------------------------------------------

export function bugAnnouncement(bug: BugReport, userId: UserId): BloomMessage {
  const lines = [
    `**Bug ${String(bug.bugNumber)}** · ${AREA_LABELS[bug.area]} · from ${mention(userId)}`,
    '',
    forDiscord(bug.summary),
    '',
    '**Steps**',
    forDiscord(bug.steps),
    ...(bug.expected ? ['', '**Expected**', forDiscord(bug.expected)] : []),
  ];

  return {
    ephemeral: false,
    embeds: [
      neutralEmbed({
        title: `Bug ${String(bug.bugNumber)}`,
        description: lines.join('\n'),
      }),
    ],
  };
}

export function bugFiled(bug: BugReport, posted: boolean): BloomMessage {
  const lines = [
    `Filed as **bug ${String(bug.bugNumber)}**.`,
    posted
      ? 'It is in the bug channel, and you can quote that number when you follow up.'
      : 'No bug channel is configured here, so it is recorded but not posted. Quote the number when you follow up.',
    '',
    `Check on it any time with \`/labs bug show ${String(bug.bugNumber)}\`.`,
  ];

  return {
    ephemeral: true,
    embeds: [successEmbed({ title: 'Bug filed', description: lines.join('\n') })],
  };
}

export function bugDetail(bug: BugReport, viewerIsStaff: boolean): BloomMessage {
  const lines = [
    `**${STATUS_LABELS[bug.status]}** · ${AREA_LABELS[bug.area]}`,
    '',
    forDiscord(bug.summary),
    '',
    '**Steps**',
    forDiscord(bug.steps),
    ...(bug.expected ? ['', '**Expected**', forDiscord(bug.expected)] : []),
    ...(bug.resolution ? ['', '**Outcome**', forDiscord(bug.resolution)] : []),
    ...(bug.duplicateOf !== null
      ? ['', `Already reported as bug ${String(bug.duplicateOf)}.`]
      : []),
    /*
     * Who triaged it is shown to staff only. Not a secret — it is in the audit
     * trail — but naming a moderator in a reply to the reporter invites the
     * follow-up to go to that person's DMs rather than to the channel.
     */
    ...(viewerIsStaff && bug.triagedBy
      ? ['', `Triaged by ${mention(bug.triagedBy)}.`]
      : []),
  ];

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: `Bug ${String(bug.bugNumber)}`,
        description: lines.join('\n'),
      }),
    ],
  };
}

export function bugNotFound(bugNumber: number): BloomMessage {
  return errorMessage(
    bloomError('INVALID_INPUT', {
      userMessage: `There is no bug ${String(bugNumber)} in this server.`,
    }),
  );
}

export function bugQueue(bugs: readonly BugReport[]): BloomMessage {
  if (bugs.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        noticeEmbed({
          title: 'Triage queue',
          description:
            'Nothing is waiting. That is the good outcome, not an empty state.',
        }),
      ],
    };
  }

  // Oldest first, deliberately: the thing waiting longest is the thing most
  // likely to have been forgotten.
  const lines = bugs.map(
    (bug) =>
      `**${String(bug.bugNumber)}** · ${STATUS_LABELS[bug.status]} · ${AREA_LABELS[bug.area]} — ${forDiscord(bug.summary)}`,
  );

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Triage queue',
        description: [`Oldest first.`, '', ...lines].join('\n'),
      }),
    ],
  };
}

export function bugTriaged(bug: BugReport, from: BugStatus): BloomMessage {
  const lines = [
    `Bug ${String(bug.bugNumber)}: ${STATUS_LABELS[from]} → **${STATUS_LABELS[bug.status]}**.`,
    ...(bug.resolution ? ['', forDiscord(bug.resolution)] : []),
    '',
    'The reporter has been sent a note, if their direct messages are open.',
  ];

  return {
    ephemeral: true,
    embeds: [successEmbed({ title: 'Triaged', description: lines.join('\n') })],
  };
}

export function bugUnchanged(bug: BugReport): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      noticeEmbed({
        title: 'Already there',
        description: `Bug ${String(bug.bugNumber)} is already ${STATUS_LABELS[bug.status]}. Nothing was changed and the reporter was not messaged again.`,
      }),
    ],
  };
}

/** Sent to the reporter when their bug reaches a terminal state. */
export function bugResolvedDirectMessage(bug: BugReport): BloomMessage {
  const opening: Record<string, string> = {
    FIXED: `Bug ${String(bug.bugNumber)} is fixed.`,
    WONT_FIX: `Bug ${String(bug.bugNumber)} is closed without a fix.`,
    DUPLICATE: `Bug ${String(bug.bugNumber)} was already reported.`,
  };

  const lines = [
    opening[bug.status] ?? `Bug ${String(bug.bugNumber)} was updated.`,
    '',
    `You reported: ${forDiscord(bug.summary)}`,
    ...(bug.resolution ? ['', forDiscord(bug.resolution)] : []),
    ...(bug.duplicateOf !== null
      ? ['', `Follow bug ${String(bug.duplicateOf)} for the rest of it.`]
      : []),
    '',
    'Thank you for reporting it.',
  ];

  return {
    ephemeral: false,
    embeds: [bloomEmbed({ title: 'Your bug report', description: lines.join('\n') })],
  };
}

// -----------------------------------------------------------------------------
// Refusals
// -----------------------------------------------------------------------------

export function rateLimited(what: string, limit: number): BloomMessage {
  return errorMessage(
    bloomError('RATE_LIMITED', {
      userMessage:
        `That is ${String(limit)} ${what} from you in a day, which is the limit. ` +
        `Add to the existing ones in the channel instead — it keeps related things together.`,
    }),
  );
}

export function needsResolution(): BloomMessage {
  return errorMessage(
    bloomError('INVALID_INPUT', {
      userMessage:
        'Closing a bug needs a reason. The reporter is told what it says, so write it for them.',
    }),
  );
}

export function needsDuplicateTarget(): BloomMessage {
  return errorMessage(
    bloomError('INVALID_INPUT', {
      userMessage: 'Marking a duplicate needs the number of the bug it duplicates.',
    }),
  );
}

export function duplicateTargetMissing(bugNumber: number): BloomMessage {
  return errorMessage(
    bloomError('INVALID_INPUT', {
      userMessage: `There is no bug ${String(bugNumber)} to be a duplicate of.`,
    }),
  );
}
