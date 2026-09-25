import {
  bloomError,
  initialStatusForReport,
  REPORT_CATEGORY_LABELS,
  type CaseStatus,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type MessageId,
  type ReportCategory,
  type UserId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import type { CaseEventRow, CaseRow, ReportRow, Repositories } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { AuthorizationSubject } from '@bloom/permissions';
import { sanitiseUserText } from '@bloom/utils';
import * as copy from './messages.js';

/**
 * Cases and reports.
 *
 * A report is not a message in a channel. It is a case with an owner, a status
 * and a history — which is the difference between "somebody mentioned a problem
 * once" and a moderation process that can be audited.
 *
 * ## Privacy
 *
 * `reports.description` is the most sensitive column in the schema: it is one
 * member's account of another member's behaviour. It is written to the staff
 * report channel and to nowhere else. In particular it never appears in an
 * audit row, a log line, an error, or anything the reported member can see.
 */

export interface CaseServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly messaging: MessagingService;
  readonly logger: Logger;
}

export interface SubmitReportRequest {
  readonly guildId: GuildId;
  readonly reporter: AuthorizationSubject;
  readonly category: ReportCategory;
  readonly description: string;
  readonly targetUserId?: UserId | null;
  readonly targetChannelId?: ChannelId | null;
  readonly targetMessageId?: MessageId | null;
  readonly correlationId: CorrelationId;
}

export interface SubmitReportResult {
  readonly caseNumber: number;
  readonly status: CaseStatus;
  /** Whether staff were reachable. False means the report is stored but unannounced. */
  readonly staffNotified: boolean;
}

export interface CaseDetail {
  readonly case: CaseRow;
  readonly events: readonly CaseEventRow[];
  readonly report: ReportRow | null;
}

export class CaseService {
  public constructor(private readonly options: CaseServiceOptions) {}

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  public async submitReport(
    request: SubmitReportRequest,
  ): Promise<SubmitReportResult> {
    const description = sanitiseUserText(request.description, 1800);
    if (description.length < 10) {
      throw bloomError('INVALID_INPUT', {
        userMessage:
          'Please describe what happened in a little more detail — at least a sentence.',
      });
    }

    if (!request.targetUserId && !request.targetMessageId) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'A report needs to name a member or point at a message.',
      });
    }

    // Reporting yourself is almost always a mis-click on a user picker. It also
    // makes the staff queue confusing, so it is refused rather than filed.
    if (request.targetUserId === request.reporter.userId) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'You cannot file a report against yourself.',
      });
    }

    /*
     * Safety reports skip the queue.
     *
     * A report about someone's safety opened as OPEN sits behind whatever else
     * is in the list. `initialStatusForReport` puts it straight into ESCALATED,
     * and the list ordering surfaces escalated cases first.
     */
    const status = initialStatusForReport(request.category);

    const { case: caseRow } = await this.options.repositories.cases.open(
      {
        guildId: request.guildId,
        origin: 'report',
        openedBy: request.reporter.userId,
        // The summary is derived, never the member's own words: it is shown in
        // list views that are wider than the report channel.
        summary: copy.reportSummary(request.category, request.targetUserId ?? null),
        subjectId: request.targetUserId ?? null,
        category: request.category,
        status,
        correlationId: request.correlationId,
      },
      {
        reporterId: request.reporter.userId,
        category: request.category,
        description,
        targetUserId: request.targetUserId ?? null,
        targetChannelId: request.targetChannelId ?? null,
        targetMessageId: request.targetMessageId ?? null,
      },
    );

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'guardian',
      event: 'moderation.report_filed',
      severity: status === 'ESCALATED' ? 'error' : 'warn',
      actorId: request.reporter.userId,
      ...(request.targetUserId ? { targetId: request.targetUserId } : {}),
      source: 'command:/report',
      correlationId: request.correlationId,
      // Category and case number only. The description is deliberately absent:
      // audit rows are read far more widely than the report channel.
      details: { case_number: caseRow.caseNumber, category: request.category },
    });

    const staffNotified = await this.announceToStaff(
      request.guildId,
      caseRow,
      description,
      request,
    );

    return { caseNumber: caseRow.caseNumber, status, staffNotified };
  }

  /**
   * Post the report into the staff channel.
   *
   * Returns `false` when there is nowhere to post — an unconfigured
   * `CHANNEL_REPORTS`, or a send failure. The reporter is then told plainly
   * that their report was recorded but staff were not alerted, because the
   * alternative is thanking them for a report nobody will read.
   */
  private async announceToStaff(
    guildId: GuildId,
    caseRow: CaseRow,
    description: string,
    request: SubmitReportRequest,
  ): Promise<boolean> {
    const channelId = this.options.config.channels.reports;
    if (!channelId) {
      this.options.logger.error(
        'moderation.reports_channel_missing',
        'A report was filed but CHANNEL_REPORTS is not configured, so nobody was alerted.',
        { context: { case_number: caseRow.caseNumber } },
      );
      return false;
    }

    try {
      await this.options.messaging.sendToChannel(
        guildId,
        channelId,
        copy.staffReportMessage(caseRow, description, {
          reporterId: request.reporter.userId,
          targetUserId: request.targetUserId ?? null,
          targetChannelId: request.targetChannelId ?? null,
          targetMessageId: request.targetMessageId ?? null,
        }),
      );
      return true;
    } catch (error) {
      this.options.logger.error(
        'moderation.report_announce_failed',
        'A report was stored but could not be posted to the reports channel.',
        {
          context: { case_number: caseRow.caseNumber, channel_id: channelId },
          ...(error instanceof Error ? { error } : {}),
        },
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Cases
  // ---------------------------------------------------------------------------

  public async openCase(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly summary: string;
    readonly subjectId?: UserId | null;
    readonly correlationId: CorrelationId;
  }): Promise<CaseRow> {
    const summary = sanitiseUserText(request.summary, 280);
    if (summary.length < 3) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'A case needs a short summary.',
      });
    }

    const { case: caseRow } = await this.options.repositories.cases.open({
      guildId: request.guildId,
      origin: 'moderator',
      openedBy: request.actor.userId,
      summary,
      subjectId: request.subjectId ?? null,
      correlationId: request.correlationId,
    });

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'guardian',
      event: 'moderation.case_opened',
      severity: 'info',
      actorId: request.actor.userId,
      ...(request.subjectId ? { targetId: request.subjectId } : {}),
      source: 'command:/guardian case open',
      correlationId: request.correlationId,
      details: { case_number: caseRow.caseNumber },
    });

    return caseRow;
  }

  public async detail(guildId: GuildId, caseNumber: number): Promise<CaseDetail | null> {
    const caseRow = await this.options.repositories.cases.findByNumber(
      guildId,
      caseNumber,
    );
    if (!caseRow) return null;

    const [events, report] = await Promise.all([
      this.options.repositories.cases.listEvents(caseRow.id),
      this.options.repositories.cases.findReport(caseRow.id),
    ]);

    return { case: caseRow, events, report };
  }

  public async changeStatus(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly caseNumber: number;
    readonly to: CaseStatus;
    readonly note?: string | null;
    readonly correlationId: CorrelationId;
  }): Promise<
    Awaited<ReturnType<Repositories['cases']['transitionStatus']>>
  > {
    const note = request.note ? sanitiseUserText(request.note, 1000) : null;

    /*
     * RESOLVED carries its outcome. The database enforces this with a CHECK
     * constraint; passing the note through as the resolution is what makes the
     * command usable — a moderator types the outcome once.
     */
    const outcome = await this.options.repositories.cases.transitionStatus({
      guildId: request.guildId,
      caseNumber: request.caseNumber,
      to: request.to,
      actorId: request.actor.userId,
      note,
      resolution: request.to === 'RESOLVED' ? note : null,
      correlationId: request.correlationId,
    });

    if (outcome.kind === 'applied') {
      await this.options.repositories.audit.append({
        guildId: request.guildId,
        botName: 'guardian',
        event: 'moderation.case_status_changed',
        severity: 'info',
        actorId: request.actor.userId,
        source: 'command:/guardian case status',
        correlationId: request.correlationId,
        details: {
          case_number: request.caseNumber,
          from: outcome.from,
          to: outcome.to,
        },
      });
    }

    return outcome;
  }

  public async assign(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly caseNumber: number;
    readonly assignee: UserId | null;
    readonly correlationId: CorrelationId;
  }): Promise<CaseRow | null> {
    const updated = await this.options.repositories.cases.assign({
      guildId: request.guildId,
      caseNumber: request.caseNumber,
      assignee: request.assignee,
      actorId: request.actor.userId,
      correlationId: request.correlationId,
    });

    if (updated) {
      await this.options.repositories.audit.append({
        guildId: request.guildId,
        botName: 'guardian',
        event: 'moderation.case_assigned',
        severity: 'info',
        actorId: request.actor.userId,
        ...(request.assignee ? { targetId: request.assignee } : {}),
        source: 'command:/guardian case assign',
        correlationId: request.correlationId,
        details: { case_number: request.caseNumber },
      });
    }

    return updated;
  }

  public async addNote(request: {
    readonly guildId: GuildId;
    readonly actor: AuthorizationSubject;
    readonly caseNumber: number;
    readonly body: string;
    readonly correlationId: CorrelationId;
  }): Promise<boolean> {
    const body = sanitiseUserText(request.body, 1900);
    if (body.length === 0) {
      throw bloomError('INVALID_INPUT', { userMessage: 'The note is empty.' });
    }

    const caseRow = await this.options.repositories.cases.findByNumber(
      request.guildId,
      request.caseNumber,
    );
    if (!caseRow) return false;

    await this.options.repositories.cases.appendEvent({
      caseId: caseRow.id,
      eventType: 'note',
      actorId: request.actor.userId,
      body,
      correlationId: request.correlationId,
    });

    return true;
  }

  public list(
    guildId: GuildId,
    filter?: { readonly status?: CaseStatus | null; readonly limit?: number },
  ): Promise<readonly CaseRow[]> {
    return this.options.repositories.cases.list(guildId, {
      status: filter?.status ?? null,
      limit: filter?.limit ?? 15,
    });
  }

  public counts(guildId: GuildId): Promise<Readonly<Record<CaseStatus, number>>> {
    return this.options.repositories.cases.countByStatus(guildId);
  }
}

export { REPORT_CATEGORY_LABELS };
