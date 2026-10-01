import { sanitiseForDisplay } from '@bloom/security';
import {
  CASE_STATUS_LABELS,
  MODERATION_ACTION_LABELS,
  ONBOARDING_STATE_LABELS,
  REPORT_CATEGORY_LABELS,
  type CaseStatus,
  type UserId,
} from '@bloom/shared-types';
import { neutralEmbed, staffEmbed, type BloomMessage } from '@bloom/embeds';
import type {
  AuditEventRow,
  CaseRow,
  ReportRow,
  ReportSummaryRow,
} from '@bloom/database';
import { discordTimestamp } from '@bloom/utils';
import { roleLabels, type StaffMemberProfile } from './member-profile.js';

/**
 * Everything the staff console says.
 *
 * Separate from `moderation/messages.ts` because the audience is different:
 * these are read only by staff, and every one of them is ephemeral. That makes
 * the disclosure rule easy to state and easy to check — nothing in this file is
 * ever seen by the member being discussed, so operator detail is appropriate
 * here in a way it never is in moderation copy.
 *
 * The one thing that is still withheld from staff by default is report text.
 * It appears in exactly one message, {@link reportDetail}, which is reached by
 * naming a single case and is recorded in the audit trail.
 */

const mention = (userId: UserId): string => `<@${userId}>`;
const unknown = '—';

/** Staff surfaces are ephemeral. Always. */
function staff(title: string, description: string, footer?: string): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      staffEmbed({ title, description, ...(footer === undefined ? {} : { footer }) }),
    ],
  };
}

function empty(description: string): BloomMessage {
  return { ephemeral: true, embeds: [neutralEmbed({ description })] };
}

// -----------------------------------------------------------------------------
// /guardian staff member
// -----------------------------------------------------------------------------

export function memberProfile(profile: StaffMemberProfile): BloomMessage {
  const { snapshot, record, moderation, cases } = profile;

  const identity = [
    `**Member** ${mention(profile.userId)}`,
    `**User ID** \`${profile.userId}\``,
    `**Display name** ${snapshot ? sanitiseForDisplay(snapshot.username) : '_Not in the server_'}`,
    `**Roles** ${roleLabels(profile.roleKeys)}`,
  ].join('\n');

  const lifecycle = [
    `**Onboarding** ${record ? ONBOARDING_STATE_LABELS[record.onboardingState] : unknown}`,
    `**Verified** ${record?.verifiedAt ? discordTimestamp(record.verifiedAt, 'R') : unknown}`,
    `**Completed** ${
      record?.onboardingCompletedAt
        ? discordTimestamp(record.onboardingCompletedAt, 'R')
        : unknown
    }`,
    `**Joined** ${
      snapshot?.joinedAt
        ? discordTimestamp(snapshot.joinedAt, 'R')
        : record?.joinedAt
          ? discordTimestamp(record.joinedAt, 'R')
          : unknown
    }`,
    `**Left** ${record?.leftAt ? discordTimestamp(record.leftAt, 'R') : unknown}`,
  ].join('\n');

  const caseTotal = cases.truncated ? `${String(cases.total)}+` : String(cases.total);
  const record_ = [
    `**Active warnings** ${String(moderation.activeWarnings)} of ${String(moderation.totalWarnings)} total`,
    `**Timeouts** ${String(moderation.timeouts)} · **Kicks** ${String(moderation.kicks)} · **Bans** ${String(moderation.bans)}`,
    `**Staff notes** ${String(moderation.notes)}`,
    `**Cases** ${caseTotal} total · ${String(cases.open)} open`,
    `**Open reports naming them** ${String(profile.openReportsAgainst)}`,
    `**Last action** ${
      moderation.lastActionAt ? discordTimestamp(moderation.lastActionAt, 'R') : unknown
    }`,
  ].join('\n');

  const actions =
    profile.recentActions.length === 0
      ? '_No moderation actions on record._'
      : profile.recentActions
          .map(
            (action) =>
              `${MODERATION_ACTION_LABELS[action.action]} by ${mention(action.actorId)} · ${discordTimestamp(action.createdAt, 'R')}${
                action.revokedAt ? ' · _revoked_' : ''
              }`,
          )
          .join('\n');

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Staff view — member',
        description: `${identity}\n\n${lifecycle}\n\n${record_}\n\n**Recent actions**\n${actions}`,
        footer:
          'Guardian data only. Rewards and progression are Companion’s and are not read here.',
      }),
    ],
  };
}

// -----------------------------------------------------------------------------
// /guardian staff reports
// -----------------------------------------------------------------------------

export function reportQueue(
  reports: readonly ReportSummaryRow[],
  status: CaseStatus | null,
): BloomMessage {
  if (reports.length === 0) {
    return empty(
      status
        ? `No reports on cases that are ${CASE_STATUS_LABELS[status].toLowerCase()}.`
        : 'No reports are waiting. The queue is clear.',
    );
  }

  const body = reports
    .map((report) => {
      const target = report.targetUserId
        ? mention(report.targetUserId)
        : 'no named member';
      const assignee = report.assignedTo ? mention(report.assignedTo) : '_unassigned_';
      return [
        `**#${String(report.caseNumber)}** ${CASE_STATUS_LABELS[report.caseStatus]} · ${REPORT_CATEGORY_LABELS[report.category]}`,
        `about ${target} · reported by ${mention(report.reporterId)}`,
        `${assignee} · ${discordTimestamp(report.createdAt, 'R')}`,
      ].join('\n');
    })
    .join('\n\n');

  return staff(
    'Staff view — reports',
    body,
    'Report text is withheld here. Use /guardian staff report to read one.',
  );
}

export function reportDetail(caseRow: CaseRow, report: ReportRow): BloomMessage {
  const target = report.targetUserId ? mention(report.targetUserId) : unknown;

  const meta = [
    `**Case** #${String(caseRow.caseNumber)} · ${CASE_STATUS_LABELS[caseRow.status]}`,
    `**Category** ${REPORT_CATEGORY_LABELS[report.category]}`,
    `**Reported by** ${mention(report.reporterId)}`,
    `**About** ${target}`,
    `**Assigned** ${caseRow.assignedTo ? mention(caseRow.assignedTo) : '_unassigned_'}`,
    `**Filed** ${discordTimestamp(report.createdAt, 'f')}`,
  ].join('\n');

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: `Report on case #${String(caseRow.caseNumber)}`,
        description: `${meta}\n\n**What was reported**\n${sanitiseForDisplay(report.description)}`,
        footer: 'Private. Do not forward. This view is recorded in the audit trail.',
      }),
    ],
  };
}

export function reportNotFound(caseNumber: number): BloomMessage {
  return empty(`Case #${String(caseNumber)} has no report attached.`);
}

// -----------------------------------------------------------------------------
// /guardian staff audit
// -----------------------------------------------------------------------------

export function auditTrail(
  events: readonly AuditEventRow[],
  subject: UserId | null,
): BloomMessage {
  if (events.length === 0) {
    return empty(
      subject
        ? `No audit events recorded for ${mention(subject)}.`
        : 'No audit events recorded yet.',
    );
  }

  const body = events
    .map((event) => {
      const actor = event.actorId ? mention(event.actorId) : 'system';
      const target = event.targetId ? ` → ${mention(event.targetId)}` : '';
      const source = event.source ? ` · \`${sanitiseForDisplay(event.source)}\`` : '';
      return `\`${event.severity}\` **${sanitiseForDisplay(event.event)}**${target}\nby ${actor}${source} · ${discordTimestamp(event.createdAt, 'R')}`;
    })
    .join('\n\n');

  return staff(
    subject ? 'Staff view — audit for a member' : 'Staff view — recent audit',
    body,
    'Event metadata only. Details are redacted on write and are not shown here.',
  );
}
