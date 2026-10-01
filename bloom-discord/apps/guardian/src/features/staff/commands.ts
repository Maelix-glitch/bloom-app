import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { BloomMessage } from '@bloom/embeds';
import { requireStaffCapability } from '@bloom/permissions';
import {
  bloomError,
  isCaseStatus,
  type CaseStatus,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import type { GuardianDeps } from '../../deps.js';
import { loadStaffMemberProfile } from './member-profile.js';
import * as copy from './messages.js';

/**
 * `/guardian staff …` — the staff console.
 *
 * Three principles, all of them visible in the code below.
 *
 * **It owns no domain logic.** Every branch reads through repositories and
 * services Guardian already has. There is no "staff service" sitting beside
 * `CaseService` with its own idea of what a case is, because two code paths to
 * the same state is how invariants rot.
 *
 * **It adds surfaces, it does not duplicate them.** Cases are already worked
 * through `/guardian case …`; those commands were re-gated onto the staff
 * capability model rather than cloned here. What lives here is what had no
 * command at all: a member profile, the report queue, and the audit trail.
 *
 * **Authorization is per branch and at execution time.** Each contribution
 * names the capability it needs. The namespace policy still runs first, so
 * these are strictly narrowing — a branch can demand more than `/guardian`
 * does, never less.
 */

function guildOf(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'A staff command reached a handler without a guild id.',
    });
  }
  return id;
}

function requiredUser(invocation: CommandInvocation, option: string): UserId {
  const user = invocation.options.getUser(option);
  if (!user) throw bloomError('INVALID_INPUT', { userMessage: 'Choose a member.' });
  return user.id;
}

function caseNumberOf(invocation: CommandInvocation): number {
  const number = invocation.options.getInteger('number');
  if (number === null) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Give a case number.' });
  }
  return number;
}

/** Discord already bounds these; clamping again keeps a bad spec from reaching SQL. */
function limitOf(invocation: CommandInvocation, fallback: number): number {
  const raw = invocation.options.getInteger('limit');
  if (raw === null) return fallback;
  return Math.min(Math.max(raw, 1), 25);
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

async function staffMember(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const profile = await loadStaffMemberProfile(
    deps,
    guildOf(invocation),
    requiredUser(invocation, 'user'),
  );

  return copy.memberProfile(profile);
}

async function staffReports(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const raw = invocation.options.getString('status');
  const status: CaseStatus | null = isCaseStatus(raw) ? raw : null;

  const reports = await deps.repositories.cases.listReports(guildOf(invocation), {
    status,
    limit: limitOf(invocation, 10),
  });

  return copy.reportQueue(reports, status);
}

/**
 * The one command that shows private report text.
 *
 * Reading it is recorded. Not because staff are suspected of anything, but
 * because "who read this report" is a question that gets asked during an
 * appeal, and the only honest way to answer it is to have written it down at
 * the time. The audit row carries the case number and the report id — never
 * the text, which would defeat the point of keeping it out of the queue.
 */
async function staffReport(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guildId = guildOf(invocation);
  const caseNumber = caseNumberOf(invocation);

  const caseRow = await deps.repositories.cases.findByNumber(guildId, caseNumber);
  if (!caseRow) return copy.reportNotFound(caseNumber);

  const report = await deps.repositories.cases.findReport(caseRow.id);
  if (!report) return copy.reportNotFound(caseNumber);

  await deps.repositories.audit.append({
    guildId,
    botName: 'guardian',
    event: 'staff.report.viewed',
    severity: 'info',
    actorId: invocation.actor.userId,
    targetId: report.targetUserId,
    source: invocation.commandPath,
    correlationId: invocation.correlationId,
    details: { case_number: caseNumber, report_id: report.id },
  });

  return copy.reportDetail(caseRow, report);
}

async function staffAudit(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guildId = guildOf(invocation);
  const subject = invocation.options.getUser('member')?.id ?? null;
  const limit = limitOf(invocation, 10);

  const events = subject
    ? await deps.repositories.audit.listForTarget(guildId, subject, limit)
    : await deps.repositories.audit.listRecent(guildId, limit);

  return copy.auditTrail(events, subject);
}

// -----------------------------------------------------------------------------
// Contributions
// -----------------------------------------------------------------------------

export const STAFF_GROUP_DESCRIPTION = 'The staff console: members, reports, audit.';

const LIMIT_OPTION = {
  name: 'limit',
  description: 'How many to show. 1–25, default 10.',
  type: 'integer',
  required: false,
  minValue: 1,
  maxValue: 25,
} as const;

export const staffSubcommands: readonly SubcommandContribution<GuardianDeps>[] = [
  {
    group: 'staff',
    policy: requireStaffCapability('staff.members.read'),
    spec: {
      name: 'member',
      description: 'Everything Guardian knows about a member.',
      options: [
        { name: 'user', description: 'Who to look up.', type: 'user', required: true },
      ],
    },
    execute: staffMember,
  },
  {
    group: 'staff',
    policy: requireStaffCapability('staff.reports.manage'),
    spec: {
      name: 'reports',
      description: 'Reports waiting on staff.',
      options: [
        {
          name: 'status',
          description: 'Only reports whose case is in this status.',
          type: 'string',
          required: false,
          choices: [
            { name: 'Open', value: 'OPEN' },
            { name: 'In review', value: 'IN_REVIEW' },
            { name: 'Escalated', value: 'ESCALATED' },
            { name: 'Resolved', value: 'RESOLVED' },
            { name: 'Closed', value: 'CLOSED' },
          ],
        },
        LIMIT_OPTION,
      ],
    },
    execute: staffReports,
  },
  {
    group: 'staff',
    policy: requireStaffCapability('staff.reports.manage'),
    spec: {
      name: 'report',
      description: 'Read one report in full. Recorded in the audit trail.',
      options: [
        {
          name: 'number',
          description: 'The case number the report opened.',
          type: 'integer',
          required: true,
          minValue: 1,
        },
      ],
    },
    execute: staffReport,
  },
  {
    group: 'staff',
    policy: requireStaffCapability('staff.audit.read'),
    spec: {
      name: 'audit',
      description: 'Recent audit events, or one member’s.',
      options: [
        {
          name: 'member',
          description: 'Only events about this member.',
          type: 'user',
          required: false,
        },
        LIMIT_OPTION,
      ],
    },
    execute: staffAudit,
  },
];
