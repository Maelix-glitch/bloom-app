import { sanitiseForDisplay } from '@bloom/security';
import {
  CASE_STATUS_LABELS,
  MODERATION_ACTION_LABELS,
  REPORT_CATEGORY_LABELS,
  type CaseStatus,
  type ChannelId,
  type MessageId,
  type ModerationAction,
  type ReportCategory,
  type UserId,
} from '@bloom/shared-types';
import {
  errorEmbed,
  neutralEmbed,
  noticeEmbed,
  staffEmbed,
  successEmbed,
  type BloomMessage,
} from '@bloom/embeds';
import type { CaseEventRow, CaseRow, ModerationActionRow } from '@bloom/database';
import { discordTimestamp, formatDuration, pluralise } from '@bloom/utils';

/**
 * Every string moderation shows anyone.
 *
 * One file, for two reasons that matter more here than elsewhere:
 *
 *   • **Tone.** Moderation copy is read by someone who has just been warned or
 *     removed. The brief's "calm, premium, restrained" is hardest to hold at
 *     exactly this moment, and easiest to hold when the words are all in one
 *     place rather than scattered through handlers.
 *   • **Disclosure.** The member-facing and staff-facing wordings live side by
 *     side, so it is obvious when something staff-only has drifted into a
 *     member's message. Staff copy carries operator detail on purpose; member
 *     copy never does.
 */

const mention = (userId: UserId): string => `<@${userId}>`;
const channelMention = (channelId: ChannelId): string => `<#${channelId}>`;

// -----------------------------------------------------------------------------
// Member-facing
// -----------------------------------------------------------------------------

/**
 * What the member is told, by DM.
 *
 * No emoji, no exclamation marks, no "unfortunately". It states what happened,
 * why, and what it means. A warning that reads as a telling-off provokes an
 * argument; one that reads as a record gets read.
 */
export function memberNotice(
  action: ModerationAction,
  guildName: string,
  reason: string,
  extra?: string,
): BloomMessage {
  const headline: Partial<Record<ModerationAction, string>> = {
    warn: `You have received a warning in ${guildName}.`,
    timeout: `You have been timed out in ${guildName}.`,
    untimeout: `Your timeout in ${guildName} has been lifted.`,
    kick: `You have been removed from ${guildName}.`,
    ban: `You have been banned from ${guildName}.`,
  };

  const lines = [headline[action] ?? `A moderation action was taken in ${guildName}.`, ''];
  /*
   * Escape here, not at storage time. The stored reason is plain text so it
   * reads correctly in exports and in Discord's audit log; this is the one
   * destination that renders markdown, so it is the one that has to escape.
   */
  lines.push(`**Reason** — ${sanitiseForDisplay(reason, 480)}`);
  if (extra) lines.push('', extra);

  if (action === 'kick') {
    lines.push('', 'You may rejoin with a new invite.');
  }
  if (action === 'warn') {
    lines.push(
      '',
      'If you think this is a mistake, reply to a moderator in the server rather than here — this address is not monitored.',
    );
  }

  return {
    embeds: [
      noticeEmbed({
        title: MODERATION_ACTION_LABELS[action],
        description: lines.join('\n'),
      }),
    ],
  };
}

export function warningCount(active: number): string {
  return active === 1
    ? 'This is your first active warning.'
    : `You now have ${String(active)} active ${pluralise(active, 'warning', 'warnings')}.`;
}

export function until(date: Date): string {
  return `**Until** — ${discordTimestamp(date, 'F')} (${discordTimestamp(date, 'R')})`;
}

// -----------------------------------------------------------------------------
// Staff-facing confirmations
// -----------------------------------------------------------------------------

export function actionConfirmed(input: {
  readonly action: ModerationAction;
  readonly targetId: UserId;
  readonly reason: string;
  readonly memberNotified: boolean;
  readonly activeWarnings?: number;
  readonly caseNumber?: number | null;
  readonly extra?: string;
}): BloomMessage {
  const lines = [`${MODERATION_ACTION_LABELS[input.action]} — ${mention(input.targetId)}`];
  lines.push(`**Reason** — ${input.reason}`);

  if (input.activeWarnings !== undefined) {
    lines.push(
      `**Active warnings** — ${String(input.activeWarnings)}`,
    );
  }
  if (input.extra) lines.push(input.extra);
  if (input.caseNumber) lines.push(`**Case** — #${String(input.caseNumber)}`);

  /*
   * Whether the DM landed is reported every time.
   *
   * Staff need to know if the member was actually told, because "they were
   * warned" and "a warning was recorded that they never saw" lead to different
   * next steps. Silence here would let the second be mistaken for the first.
   */
  if (!input.memberNotified && dmRelevant(input.action)) {
    lines.push('', 'The member could not be messaged — their DMs are closed.');
  }

  return { ephemeral: true, embeds: [successEmbed({ description: lines.join('\n') })] };
}

function dmRelevant(action: ModerationAction): boolean {
  return action === 'warn' || action === 'timeout' || action === 'kick' || action === 'ban';
}

export function warningsCleared(targetId: UserId, cleared: number): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      cleared === 0
        ? neutralEmbed({
            description: `${mention(targetId)} had no active warnings. Nothing was cleared, and that is recorded.`,
          })
        : successEmbed({
            description: `Cleared ${String(cleared)} ${pluralise(cleared, 'warning', 'warnings')} for ${mention(targetId)}. The warnings remain in the history, marked as cleared.`,
          }),
    ],
  };
}

export function purgeResult(input: {
  readonly channelId: ChannelId;
  readonly deleted: number;
  readonly requested: number;
  readonly skippedTooOld: number;
  readonly authorId?: UserId | null;
}): BloomMessage {
  const lines = [
    `Deleted ${String(input.deleted)} ${pluralise(input.deleted, 'message', 'messages')} in ${channelMention(input.channelId)}.`,
  ];

  if (input.authorId) {
    lines.push(`Restricted to ${mention(input.authorId)}.`);
  }

  /*
   * The honest part.
   *
   * Discord will not bulk-delete anything older than 14 days. A purge that
   * removed 12 of a requested 100 must say so, or staff will believe a channel
   * was cleared when it was not.
   */
  if (input.skippedTooOld > 0) {
    lines.push(
      '',
      `${String(input.skippedTooOld)} ${pluralise(input.skippedTooOld, 'message was', 'messages were')} older than 14 days and could not be bulk-deleted. Discord does not allow it; they have to be removed by hand.`,
    );
  }

  if (input.deleted === 0 && input.skippedTooOld === 0) {
    lines.push('', 'There was nothing matching to delete.');
  }

  return {
    ephemeral: true,
    embeds: [
      input.deleted === 0
        ? neutralEmbed({ description: lines.join('\n') })
        : successEmbed({ description: lines.join('\n') }),
    ],
  };
}

export function slowmodeSet(channelId: ChannelId, seconds: number): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({
        description:
          seconds === 0
            ? `Slowmode is off in ${channelMention(channelId)}.`
            : `Slowmode in ${channelMention(channelId)} is now one message every ${formatDuration(seconds * 1000)}.`,
      }),
    ],
  };
}

export function lockChanged(input: {
  readonly channelId: ChannelId;
  readonly locked: boolean;
  readonly changed: boolean;
  readonly restoredTo?: string;
}): BloomMessage {
  if (!input.changed) {
    return {
      ephemeral: true,
      embeds: [
        neutralEmbed({
          description: `${channelMention(input.channelId)} was already ${input.locked ? 'locked' : 'unlocked'}. Nothing changed.`,
        }),
      ],
    };
  }

  const lines = input.locked
    ? [`${channelMention(input.channelId)} is locked. Members can read it but not post.`]
    : [`${channelMention(input.channelId)} is unlocked.`];

  if (!input.locked && input.restoredTo === 'inherited') {
    lines.push(
      '',
      'Send permissions were returned to inheriting from the category, which is what they were before the lock.',
    );
  }

  return { ephemeral: true, embeds: [successEmbed({ description: lines.join('\n') })] };
}

// -----------------------------------------------------------------------------
// Member history
// -----------------------------------------------------------------------------

export function memberHistory(input: {
  readonly targetId: UserId;
  readonly actions: readonly ModerationActionRow[];
  readonly summary: {
    readonly activeWarnings: number;
    readonly totalWarnings: number;
    readonly timeouts: number;
    readonly kicks: number;
    readonly bans: number;
    readonly notes: number;
  };
}): BloomMessage {
  const s = input.summary;
  const header = [
    `**Active warnings** — ${String(s.activeWarnings)} of ${String(s.totalWarnings)} total`,
    `**Timeouts** — ${String(s.timeouts)} · **Kicks** — ${String(s.kicks)} · **Bans** — ${String(s.bans)} · **Notes** — ${String(s.notes)}`,
  ].join('\n');

  const body =
    input.actions.length === 0
      ? '_No moderation history._'
      : input.actions
          .map((row) => {
            const when = discordTimestamp(row.createdAt, 'R');
            const revoked = row.revokedAt ? ' _(cleared)_' : '';
            return `**${MODERATION_ACTION_LABELS[row.action]}**${revoked} · ${when} · by ${mention(row.actorId)}\n${row.reason}`;
          })
          .join('\n\n');

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Moderation history',
        description: `${mention(input.targetId)}\n\n${header}\n\n${body}`,
      }),
    ],
  };
}

// -----------------------------------------------------------------------------
// Reports and cases
// -----------------------------------------------------------------------------

export function reportSummary(
  category: ReportCategory,
  targetUserId: UserId | null,
): string {
  const label = REPORT_CATEGORY_LABELS[category];
  return targetUserId ? `${label} report concerning ${targetUserId}` : `${label} report`;
}

/** What the reporter sees. Deliberately spare — and never a copy of their own text. */
export function reportFiled(
  caseNumber: number,
  status: CaseStatus,
  staffNotified: boolean,
): BloomMessage {
  const lines = [
    `Your report has been recorded as case #${String(caseNumber)}.`,
    '',
    'A moderator will review it. You will not be told who handles it, and the member you reported is not told that you reported them.',
  ];

  if (status === 'ESCALATED') {
    lines.push('', 'This has been flagged for immediate attention.');
  }

  /*
   * Never thank someone for a report nobody will read.
   *
   * If the staff channel is unconfigured or unreachable the report is still
   * stored, but claiming it reached a moderator would be a lie the reporter
   * only discovers when nothing happens.
   */
  if (!staffNotified) {
    lines.push(
      '',
      '**Note** — the report is stored, but Bloom could not post it to the staff channel. ' +
        'If this is urgent, contact a moderator directly.',
    );
  }

  return {
    ephemeral: true,
    embeds: [
      staffNotified
        ? successEmbed({ title: 'Report received', description: lines.join('\n') })
        : noticeEmbed({ title: 'Report recorded', description: lines.join('\n') }),
    ],
  };
}

/** The staff channel post. This is the only place a report description appears. */
export function staffReportMessage(
  caseRow: CaseRow,
  description: string,
  refs: {
    readonly reporterId: UserId;
    readonly targetUserId: UserId | null;
    readonly targetChannelId: ChannelId | null;
    readonly targetMessageId: MessageId | null;
  },
): BloomMessage {
  const lines = [
    `**Case #${String(caseRow.caseNumber)}** · ${CASE_STATUS_LABELS[caseRow.status]}`,
    `**Category** — ${caseRow.category ? REPORT_CATEGORY_LABELS[caseRow.category] : 'Unspecified'}`,
    `**Reported by** — ${mention(refs.reporterId)}`,
  ];

  if (refs.targetUserId) lines.push(`**Subject** — ${mention(refs.targetUserId)}`);
  if (refs.targetMessageId && refs.targetChannelId) {
    lines.push(
      `**Message** — https://discord.com/channels/${caseRow.guildId}/${refs.targetChannelId}/${refs.targetMessageId}`,
    );
  } else if (refs.targetChannelId) {
    lines.push(`**Channel** — ${channelMention(refs.targetChannelId)}`);
  }

  lines.push('', '**What was reported**', description);
  lines.push('', `Use \`/guardian case view ${String(caseRow.caseNumber)}\` to work this.`);

  return {
    embeds: [
      caseRow.status === 'ESCALATED'
        ? errorEmbed({ title: 'Escalated report', description: lines.join('\n') })
        : staffEmbed({ title: 'New report', description: lines.join('\n') }),
    ],
  };
}

export function caseDetail(input: {
  readonly case: CaseRow;
  readonly events: readonly CaseEventRow[];
  readonly report: { readonly description: string } | null;
  readonly actions: readonly ModerationActionRow[];
}): BloomMessage {
  const c = input.case;
  const header = [
    `**Status** — ${CASE_STATUS_LABELS[c.status]}`,
    `**Opened** — ${discordTimestamp(c.openedAt, 'f')} by ${mention(c.openedBy)}`,
    c.subjectId ? `**Subject** — ${mention(c.subjectId)}` : null,
    c.assignedTo ? `**Assigned** — ${mention(c.assignedTo)}` : '**Assigned** — nobody',
    c.category ? `**Category** — ${REPORT_CATEGORY_LABELS[c.category]}` : null,
    c.resolution ? `**Resolution** — ${c.resolution}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const sections = [`**${c.summary}**`, '', header];

  if (input.report) {
    sections.push('', '**What was reported**', input.report.description);
  }

  if (input.actions.length > 0) {
    sections.push(
      '',
      '**Actions taken**',
      input.actions
        .map(
          (a) =>
            `• ${MODERATION_ACTION_LABELS[a.action]} by ${mention(a.actorId)} — ${a.reason}`,
        )
        .join('\n'),
    );
  }

  if (input.events.length > 0) {
    sections.push(
      '',
      '**History**',
      input.events
        .slice(-10)
        .map((e) => `• ${describeEvent(e)} · ${discordTimestamp(e.createdAt, 'R')}`)
        .join('\n'),
    );
  }

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({ title: `Case #${String(c.caseNumber)}`, description: sections.join('\n') }),
    ],
  };
}

function describeEvent(event: CaseEventRow): string {
  const who = event.actorId ? mention(event.actorId) : 'Bloom';
  switch (event.eventType) {
    case 'opened':
      return `Opened by ${who}`;
    case 'status_changed':
      return `${who} moved it ${event.fromStatus ?? '?'} → ${event.toStatus ?? '?'}`;
    case 'assigned':
      return `${who} assigned it${event.body ? ` to <@${event.body}>` : ''}`;
    case 'unassigned':
      return `${who} unassigned it`;
    case 'note':
      return `${who} added a note: ${event.body ?? ''}`;
    case 'action_recorded':
      return `${who} recorded: ${event.body ?? ''}`;
  }
}

export function caseList(
  cases: readonly CaseRow[],
  counts: Readonly<Record<CaseStatus, number>>,
): BloomMessage {
  const summary = (Object.keys(counts) as CaseStatus[])
    .map((status) => `${CASE_STATUS_LABELS[status]} ${String(counts[status])}`)
    .join(' · ');

  const body =
    cases.length === 0
      ? '_Nothing matching._'
      : cases
          .map((c) => {
            const assignee = c.assignedTo ? ` · ${mention(c.assignedTo)}` : '';
            return `**#${String(c.caseNumber)}** ${CASE_STATUS_LABELS[c.status]}${assignee}\n${c.summary} · ${discordTimestamp(c.openedAt, 'R')}`;
          })
          .join('\n\n');

  return {
    ephemeral: true,
    embeds: [staffEmbed({ title: 'Cases', description: `${summary}\n\n${body}` })],
  };
}

export function caseNotFound(caseNumber: number): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      neutralEmbed({ description: `There is no case #${String(caseNumber)}.` }),
    ],
  };
}

export function caseStatusChanged(
  caseNumber: number,
  from: CaseStatus,
  to: CaseStatus,
): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({
        description: `Case #${String(caseNumber)} moved from ${CASE_STATUS_LABELS[from]} to ${CASE_STATUS_LABELS[to]}.`,
      }),
    ],
  };
}

export function caseStatusRefused(
  caseNumber: number,
  outcome:
    | { readonly kind: 'already_in_state'; readonly status: CaseStatus }
    | { readonly kind: 'conflict'; readonly actual: CaseStatus; readonly expected: CaseStatus }
    | { readonly kind: 'terminal'; readonly status: CaseStatus },
): BloomMessage {
  const description = ((): string => {
    switch (outcome.kind) {
      case 'already_in_state':
        return `Case #${String(caseNumber)} is already ${CASE_STATUS_LABELS[outcome.status]}.`;
      case 'terminal':
        return `Case #${String(caseNumber)} is closed. Closed cases are archived and cannot be reopened — open a new case and reference this one.`;
      case 'conflict':
        return `Case #${String(caseNumber)} is ${CASE_STATUS_LABELS[outcome.actual]} and cannot move straight to ${CASE_STATUS_LABELS[outcome.expected]}.`;
    }
  })();

  return { ephemeral: true, embeds: [neutralEmbed({ description })] };
}

export function caseAssigned(caseNumber: number, assignee: UserId | null): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({
        description: assignee
          ? `Case #${String(caseNumber)} is assigned to ${mention(assignee)}.`
          : `Case #${String(caseNumber)} is unassigned.`,
      }),
    ],
  };
}

export function noteAdded(caseNumber: number): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({ description: `Note added to case #${String(caseNumber)}.` }),
    ],
  };
}
