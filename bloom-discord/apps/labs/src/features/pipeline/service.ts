import type {
  ChannelId,
  CorrelationId,
  GuildId,
  MessageId,
  UserId,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type {
  LabsCohort,
  LabsFeature,
  LabsFeatureStatus,
  LabsReleaseNote,
  Repositories,
} from '@bloom/database';
import { isVoteableFeatureStatus } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import type { BloomMessage } from '@bloom/embeds';
import * as copy from './messages.js';

/**
 * The Labs pipeline: features, backing, cohorts and release notes.
 *
 * Intake records what members say; the pipeline is what the team says back —
 * what is being shaped, what shipped, and who is testing it. Three rules
 * shape the implementation, all inherited from the platform's doctrine:
 *
 * **Backing is a toggle, stored as rows.** A vote is a row; voting again
 * deletes it. There is no counter to drift and no way to back something
 * twice, so the number a member sees is always the number of members.
 *
 * **Cohorts are database facts.** Joining writes a row and nothing else —
 * no role, no channel, no permission. Only Guardian assigns roles, and
 * channel access stays a manual staff grant, so nothing in this file can
 * widen anyone's access.
 *
 * **Staff writes are audited; member facts are their own trail.** Creating
 * a feature, moving its status, opening a cohort and publishing release
 * notes all append audit events. A vote or a cohort join is already a row
 * with a name and a timestamp; auditing it again would store the same fact
 * twice and say nothing new.
 */

export interface PipelineServiceOptions {
  readonly config: PlatformConfig;
  readonly repositories: Repositories;
  readonly messaging: MessagingService;
  readonly logger: Logger;
}

export type VoteResult =
  | { readonly kind: 'voted'; readonly feature: LabsFeature }
  | { readonly kind: 'withdrawn'; readonly feature: LabsFeature }
  | { readonly kind: 'closed'; readonly feature: LabsFeature }
  | { readonly kind: 'not_found' };

export type CreateFeatureResult =
  | { readonly kind: 'created'; readonly feature: LabsFeature }
  | { readonly kind: 'exists'; readonly feature: LabsFeature };

export type SetFeatureStatusResult =
  | { readonly kind: 'updated'; readonly feature: LabsFeature }
  | { readonly kind: 'not_found' };

export type CreateCohortResult =
  | { readonly kind: 'created'; readonly cohort: LabsCohort }
  | { readonly kind: 'exists'; readonly cohort: LabsCohort };

export interface PublishReleaseResult {
  readonly note: LabsReleaseNote;
  readonly posted: boolean;
}

export class PipelineService {
  private readonly logger: Logger;

  public constructor(private readonly options: PipelineServiceOptions) {
    this.logger = options.logger.child({ context: { feature: 'pipeline' } });
  }

  // ---------------------------------------------------------------------------
  // Features and backing
  // ---------------------------------------------------------------------------

  public async listFeatures(
    guildId: GuildId,
    userId: UserId,
  ): Promise<{ features: readonly LabsFeature[]; votedIds: ReadonlySet<string> }> {
    const { labs } = this.options.repositories;
    const features = await labs.listFeatures(guildId);
    const voted = await Promise.all(
      features.map(async (feature) => ({
        id: feature.id,
        voted: await labs.hasVoted(feature.id, userId),
      })),
    );
    return {
      features,
      votedIds: new Set(voted.filter((row) => row.voted).map((row) => row.id)),
    };
  }

  public async vote(guildId: GuildId, name: string, userId: UserId): Promise<VoteResult> {
    const { labs } = this.options.repositories;
    const feature = await labs.findFeatureByName(guildId, name);
    if (!feature) return { kind: 'not_found' };
    if (!isVoteableFeatureStatus(feature.status)) {
      return { kind: 'closed', feature };
    }
    const outcome = await labs.toggleVote(feature.id, userId);
    if (!outcome) return { kind: 'not_found' };
    return outcome.voted
      ? { kind: 'voted', feature: outcome.feature }
      : { kind: 'withdrawn', feature: outcome.feature };
  }

  public async createFeature(input: {
    guildId: GuildId;
    name: string;
    description: string | null;
    actorId: UserId;
    correlationId: CorrelationId;
  }): Promise<CreateFeatureResult> {
    const { labs } = this.options.repositories;
    const existing = await labs.findFeatureByName(input.guildId, input.name);
    if (existing) return { kind: 'exists', feature: existing };

    const feature = await labs.createFeature({
      guildId: input.guildId,
      name: input.name,
      description: input.description,
      createdBy: input.actorId,
    });

    await this.options.repositories.audit.append({
      guildId: input.guildId,
      botName: 'labs',
      event: 'labs.feature_created',
      actorId: input.actorId,
      targetId: null,
      severity: 'info',
      source: 'pipeline',
      correlationId: input.correlationId,
      details: { name: feature.name },
    });

    return { kind: 'created', feature };
  }

  public async setFeatureStatus(input: {
    guildId: GuildId;
    name: string;
    status: LabsFeatureStatus;
    actorId: UserId;
    correlationId: CorrelationId;
  }): Promise<SetFeatureStatusResult> {
    const { labs } = this.options.repositories;
    const existing = await labs.findFeatureByName(input.guildId, input.name);
    if (!existing) return { kind: 'not_found' };

    const updated = await labs.setFeatureStatus(existing.id, input.status);
    if (!updated) return { kind: 'not_found' };

    await this.options.repositories.audit.append({
      guildId: input.guildId,
      botName: 'labs',
      event: 'labs.feature_status_changed',
      actorId: input.actorId,
      targetId: null,
      severity: 'info',
      source: 'pipeline',
      correlationId: input.correlationId,
      details: { name: updated.name, from: existing.status, to: updated.status },
    });

    return { kind: 'updated', feature: updated };
  }

  // ---------------------------------------------------------------------------
  // Cohorts
  // ---------------------------------------------------------------------------

  public async listCohorts(
    guildId: GuildId,
    userId: UserId,
  ): Promise<{ cohorts: readonly LabsCohort[]; memberIds: ReadonlySet<string> }> {
    const { labs } = this.options.repositories;
    const cohorts = await labs.listCohorts(guildId);
    const mine = await Promise.all(
      cohorts.map(async (cohort) => ({
        id: cohort.id,
        member: await labs.isCohortMember(cohort.id, userId),
      })),
    );
    return {
      cohorts,
      memberIds: new Set(mine.filter((row) => row.member).map((row) => row.id)),
    };
  }

  public async createCohort(input: {
    guildId: GuildId;
    name: string;
    description: string | null;
    joinable: boolean;
    actorId: UserId;
    correlationId: CorrelationId;
  }): Promise<CreateCohortResult> {
    const { labs } = this.options.repositories;
    const existing = await labs.findCohortByName(input.guildId, input.name);
    if (existing) return { kind: 'exists', cohort: existing };

    const cohort = await labs.createCohort({
      guildId: input.guildId,
      name: input.name,
      description: input.description,
      joinable: input.joinable,
      createdBy: input.actorId,
    });

    await this.options.repositories.audit.append({
      guildId: input.guildId,
      botName: 'labs',
      event: 'labs.cohort_created',
      actorId: input.actorId,
      targetId: null,
      severity: 'info',
      source: 'pipeline',
      correlationId: input.correlationId,
      details: { name: cohort.name, joinable: cohort.joinable },
    });

    return { kind: 'created', cohort };
  }

  // ---------------------------------------------------------------------------
  // Release notes
  // ---------------------------------------------------------------------------

  public async publishRelease(input: {
    guildId: GuildId;
    version: string;
    title: string;
    body: string;
    actorId: UserId;
    correlationId: CorrelationId;
  }): Promise<PublishReleaseResult> {
    const { labs } = this.options.repositories;
    const note = await labs.publishRelease({
      guildId: input.guildId,
      version: input.version,
      title: input.title,
      body: input.body,
      publishedBy: input.actorId,
    });

    const posted = await this.announce(
      input.guildId,
      this.options.config.channels.releaseNotes,
      copy.releaseMessage(note),
      'release notes',
    );
    if (posted) await labs.attachReleaseMessage(note.id, posted);

    await this.options.repositories.audit.append({
      guildId: input.guildId,
      botName: 'labs',
      event: 'labs.release_published',
      actorId: input.actorId,
      targetId: null,
      severity: 'info',
      source: 'pipeline',
      correlationId: input.correlationId,
      details: { version: note.version, announced: posted !== null },
    });

    return { note, posted: posted !== null };
  }

  /**
   * Post an announcement, treating failure as a degradation rather than an
   * error — the same contract as intake's announce: the row is the record,
   * the channel post is the megaphone.
   */
  private async announce(
    guildId: GuildId,
    channelId: ChannelId | null,
    message: BloomMessage,
    what: string,
  ): Promise<MessageId | null> {
    if (!channelId) {
      this.logger.warn(
        'pipeline.channel_unset',
        `No channel is configured for ${what}; it was recorded but not announced.`,
        { guild_id: guildId },
      );
      return null;
    }

    try {
      return await this.options.messaging.sendToChannel(guildId, channelId, message);
    } catch (error) {
      this.logger.error(
        'pipeline.announce_failed',
        `Could not announce the ${what}; it is recorded and readable by staff.`,
        { guild_id: guildId, channel_id: channelId, error },
      );
      return null;
    }
  }
}
