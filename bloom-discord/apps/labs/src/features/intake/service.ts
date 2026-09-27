import {
  bloomError,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type MessageId,
  type UserId,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type {
  BugArea,
  BugReport,
  BugStatus,
  FeedbackCategory,
  FeedbackEntry,
  Repositories,
  TriageTarget,
} from '@bloom/database';
import { isTerminalBugStatus } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import { systemClock, type Clock } from '@bloom/utils';
import type { BloomMessage } from '@bloom/embeds';
import * as copy from './messages.js';

/**
 * Feedback and bug intake.
 *
 * Labs' whole job in this phase is to be a good front desk: take what a member
 * says, put it somewhere it will be found, and tell them honestly what happens
 * next. Three rules shape the implementation.
 *
 * **Record before announcing.** The row is written first, then the channel post,
 * then the message id is attached. A database failure leaves nothing in the
 * channel; a Discord failure leaves a submission that staff can still read. The
 * opposite order produces a visible post backed by nothing, which is the one
 * outcome a member would reasonably call losing their report.
 *
 * **Rate limit the person, not the command.** The limit is on submissions per
 * member per day, checked against the stored rows rather than a counter, so it
 * survives a restart and cannot be reset by the bot going down.
 *
 * **Never promise triage that nobody does.** Feedback has no status and the
 * reply says so. A bug does, because somebody genuinely moves it.
 */

export interface IntakeServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  readonly clock?: Clock;
}

/** Per member, per rolling day. Generous enough to be invisible to real use. */
export const DAILY_FEEDBACK_LIMIT = 5;
export const DAILY_BUG_LIMIT = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubmitFeedbackRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly category: FeedbackCategory;
  readonly summary: string;
  readonly detail: string | null;
  readonly correlationId: CorrelationId;
}

export type SubmitFeedbackResult =
  | {
      readonly kind: 'submitted';
      readonly entry: FeedbackEntry;
      readonly posted: boolean;
    }
  | { readonly kind: 'rate_limited'; readonly limit: number };

export interface FileBugRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly area: BugArea;
  readonly summary: string;
  readonly steps: string;
  readonly expected: string | null;
  readonly correlationId: CorrelationId;
}

export type FileBugResult =
  | { readonly kind: 'filed'; readonly bug: BugReport; readonly posted: boolean }
  | { readonly kind: 'rate_limited'; readonly limit: number };

export interface TriageRequest {
  readonly guildId: GuildId;
  readonly bugNumber: number;
  readonly status: TriageTarget;
  readonly actorId: UserId;
  readonly resolution: string | null;
  readonly duplicateOf: number | null;
  readonly correlationId: CorrelationId;
}

export type TriageResult =
  | { readonly kind: 'moved'; readonly bug: BugReport; readonly from: BugStatus }
  | { readonly kind: 'unchanged'; readonly bug: BugReport }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'needs_resolution' }
  | { readonly kind: 'needs_duplicate_target' }
  | { readonly kind: 'duplicate_target_missing'; readonly bugNumber: number };

export class IntakeService {
  private readonly logger: Logger;
  private readonly clock: Clock;

  public constructor(private readonly options: IntakeServiceOptions) {
    this.logger = options.logger.child({ context: { feature: 'intake' } });
    this.clock = options.clock ?? systemClock;
  }

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  public async submitFeedback(
    request: SubmitFeedbackRequest,
  ): Promise<SubmitFeedbackResult> {
    const { labs } = this.options.repositories;
    const since = new Date(this.clock.now() - DAY_MS);

    const recent = await labs.countFeedbackSince(request.guildId, request.userId, since);
    if (recent >= DAILY_FEEDBACK_LIMIT) {
      return { kind: 'rate_limited', limit: DAILY_FEEDBACK_LIMIT };
    }

    const entry = await labs.submitFeedback({
      guildId: request.guildId,
      userId: request.userId,
      category: request.category,
      summary: request.summary,
      detail: request.detail,
      correlationId: request.correlationId,
    });

    const posted = await this.announce(
      request.guildId,
      this.options.config.channels.feedback,
      copy.feedbackAnnouncement(entry, request.userId),
      'feedback',
    );

    if (posted) {
      await labs.attachFeedbackMessage(entry.id, posted);
    }

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'labs',
      event: 'labs.feedback_submitted',
      actorId: request.userId,
      targetId: null,
      severity: 'info',
      source: 'intake',
      correlationId: request.correlationId,
      // The category and nothing else. The summary is the member's words, and
      // the audit trail is not where those belong — the row and the channel
      // already hold them, both of which staff can reach deliberately.
      details: { category: entry.category },
    });

    return { kind: 'submitted', entry, posted: posted !== null };
  }

  // ---------------------------------------------------------------------------
  // Bugs
  // ---------------------------------------------------------------------------

  public async fileBug(request: FileBugRequest): Promise<FileBugResult> {
    const { labs } = this.options.repositories;
    const since = new Date(this.clock.now() - DAY_MS);

    const recent = await labs.countBugsSince(request.guildId, request.userId, since);
    if (recent >= DAILY_BUG_LIMIT) {
      return { kind: 'rate_limited', limit: DAILY_BUG_LIMIT };
    }

    const bug = await labs.fileBug({
      guildId: request.guildId,
      reporterId: request.userId,
      area: request.area,
      summary: request.summary,
      steps: request.steps,
      expected: request.expected,
      correlationId: request.correlationId,
    });

    const posted = await this.announce(
      request.guildId,
      this.options.config.channels.bugReports,
      copy.bugAnnouncement(bug, request.userId),
      'bug',
    );

    if (posted) {
      await labs.attachBugMessage(bug.id, posted);
    }

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'labs',
      event: 'labs.bug_filed',
      actorId: request.userId,
      targetId: null,
      severity: 'info',
      source: 'intake',
      correlationId: request.correlationId,
      details: { bug_number: bug.bugNumber, area: bug.area },
    });

    return { kind: 'filed', bug, posted: posted !== null };
  }

  /**
   * Move a bug, having first checked the things the schema would only refuse.
   *
   * The CHECK constraints are the real boundary and they stay. What happens
   * here is turning a constraint violation into an answer: "FIXED needs a
   * resolution" is a sentence a moderator can act on, where a raised database
   * error is a correlation id and a shrug.
   */
  public async triage(request: TriageRequest): Promise<TriageResult> {
    const { labs } = this.options.repositories;

    if (isTerminalBugStatus(request.status) && !request.resolution?.trim()) {
      return { kind: 'needs_resolution' };
    }

    if (request.status === 'DUPLICATE') {
      if (request.duplicateOf === null) return { kind: 'needs_duplicate_target' };

      /*
       * Checked here rather than by a foreign key, because the column holds a
       * bug *number* and the natural key is `(guild_id, bug_number)`. A
       * composite FK would work; it would also make every bug row depend on
       * another row in the same table, which turns a deletion into a puzzle.
       */
      const target = await labs.findBug(request.guildId, request.duplicateOf);
      if (!target) {
        return { kind: 'duplicate_target_missing', bugNumber: request.duplicateOf };
      }
    }

    const outcome = await labs.triage({
      guildId: request.guildId,
      bugNumber: request.bugNumber,
      status: request.status,
      actorId: request.actorId,
      resolution: request.resolution,
      duplicateOf: request.status === 'DUPLICATE' ? request.duplicateOf : null,
    });

    if (outcome.kind === 'not_found') return { kind: 'not_found' };
    if (outcome.kind === 'unchanged') return { kind: 'unchanged', bug: outcome.bug };

    await this.options.repositories.audit.append({
      guildId: request.guildId,
      botName: 'labs',
      event: 'labs.bug_triaged',
      actorId: request.actorId,
      targetId: outcome.bug.reporterId,
      severity: 'info',
      source: 'intake',
      correlationId: request.correlationId,
      details: {
        bug_number: outcome.bug.bugNumber,
        from: outcome.from,
        to: outcome.bug.status,
      },
    });

    /*
     * Tell the reporter, if they will hear it.
     *
     * A bug report that disappears into a queue and is silently closed is the
     * reason people stop filing them. A closed DM is not a failure — most
     * members have them off — so the result does not depend on it.
     */
    if (isTerminalBugStatus(outcome.bug.status)) {
      await this.options.messaging.sendDirectMessage(
        outcome.bug.reporterId,
        copy.bugResolvedDirectMessage(outcome.bug),
      );
    }

    return { kind: 'moved', bug: outcome.bug, from: outcome.from };
  }

  /**
   * Post to a configured channel, tolerating an unconfigured one.
   *
   * Returns the message id, or `null` when there was nowhere to post. Not an
   * error: a server that has not created `#bug-reports` yet should still be
   * able to collect bugs, and refusing the submission would punish the member
   * for an operator's omission.
   */
  private async announce(
    guildId: GuildId,
    channelId: ChannelId | null,
    message: BloomMessage,
    what: string,
  ): Promise<MessageId | null> {
    if (!channelId) {
      this.logger.warn(
        'intake.channel_unset',
        `No channel is configured for ${what}; it was recorded but not announced.`,
        { guild_id: guildId },
      );
      return null;
    }

    try {
      return await this.options.messaging.sendToChannel(guildId, channelId, message);
    } catch (error) {
      // Recorded and safe. Losing the announcement is a degradation, not a
      // failure, and turning it into one would discard the submission.
      this.logger.error(
        'intake.announce_failed',
        `Could not announce the ${what}; it is recorded and readable by staff.`,
        { guild_id: guildId, channel_id: channelId, error },
      );
      return null;
    }
  }
}

/** Guard for handlers that somehow reached execution without a guild. */
export function requireGuildId(guildId: GuildId | null): GuildId {
  if (!guildId) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'A Labs interaction reached a handler without a guild id.',
    });
  }
  return guildId;
}
