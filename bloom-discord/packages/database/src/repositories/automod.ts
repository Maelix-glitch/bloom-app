import type {
  AutomodReviewStatus,
  AutomodTriggerType,
  ChannelId,
  GuildId,
  MessageId,
  RoleId,
  UserId,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

/**
 * The auto-moderation record: executions Discord reported, and the policies
 * that decide what Guardian does about them.
 *
 * Design note 001 is the spec. Two properties of that note are enforced
 * here rather than in the service, because a repository is where a property
 * stops being a convention:
 *
 *   • **No content.** There is no parameter, column or metadata field in
 *     this file that could carry what a member typed. `matchedKeyword` is
 *     the staff-configured pattern that matched — the rule's text.
 *   • **Absence is meaningful.** `resolveThresholds` returns `null` when no
 *     policy covers a scope, and the service treats that as "alert only".
 *     This repository never invents a default threshold: a punishment must
 *     not come from an unconfigured rule.
 */

export interface AutomodEventRow {
  readonly id: string;
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly channelId: ChannelId | null;
  readonly messageId: MessageId | null;
  readonly ruleId: string;
  readonly triggerType: AutomodTriggerType;
  readonly matchedKeyword: string | null;
  readonly discordAction: string;
  readonly ladderStep: number | null;
  readonly moderationActionId: string | null;
  readonly caseId: string | null;
  readonly alertMessageId: MessageId | null;
  readonly reviewStatus: AutomodReviewStatus;
  readonly reviewedBy: UserId | null;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
}

export interface RecordAutomodEventInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly channelId?: ChannelId | null;
  readonly messageId?: MessageId | null;
  readonly ruleId: string;
  readonly triggerType: AutomodTriggerType;
  readonly matchedKeyword?: string | null;
  /** What Discord itself did, in Discord's words ('BLOCK_MESSAGE', …). */
  readonly discordAction: string;
}

export interface AutomodPolicyRow {
  readonly id: string;
  readonly guildId: GuildId;
  /** NULL = every channel. */
  readonly channelId: ChannelId | null;
  /** NULL = every trigger type. */
  readonly triggerType: AutomodTriggerType | null;
  /** All three threshold fields are set together, or all three are NULL. */
  readonly thresholdCount: number | null;
  readonly windowSeconds: number | null;
  readonly timeoutSeconds: number | null;
  readonly exemptRoleIds: readonly RoleId[];
  readonly updatedBy: UserId;
  readonly updatedAt: Date;
}

export interface UpsertAutomodPolicyInput {
  readonly guildId: GuildId;
  readonly channelId?: ChannelId | null;
  readonly triggerType?: AutomodTriggerType | null;
  readonly thresholdCount?: number | null;
  readonly windowSeconds?: number | null;
  readonly timeoutSeconds?: number | null;
  readonly exemptRoleIds?: readonly RoleId[];
  readonly updatedBy: UserId;
}

export interface AutomodRepository {
  /**
   * Record one execution, idempotently.
   *
   * The design note's key — (guild, user, message, rule) — is a partial
   * unique index in the schema, so a redelivered event returns the existing
   * row with `duplicate: true` instead of inserting a second one. Events
   * without a message (member_profile) cannot collide and always insert.
   */
  recordEvent(
    input: RecordAutomodEventInput,
    tx?: TransactionSql,
  ): Promise<{ readonly event: AutomodEventRow; readonly duplicate: boolean }>;

  findEventById(id: string): Promise<AutomodEventRow | null>;

  /** This member's most recent event that opened or joined a case, if any. */
  findLatestEventWithCase(
    guildId: GuildId,
    userId: UserId,
  ): Promise<AutomodEventRow | null>;

  /** Executions seen for one member and trigger at or after `since`. */
  countEventsInWindow(
    guildId: GuildId,
    userId: UserId,
    triggerType: AutomodTriggerType,
    since: Date,
  ): Promise<number>;

  /** Volume per trigger type at or after `since`, for the status command. */
  countByTriggerSince(
    guildId: GuildId,
    since: Date,
  ): Promise<ReadonlyMap<AutomodTriggerType, number>>;

  /**
   * The thresholds that govern a scope: the most specific policy row that
   * carries thresholds (channel+trigger, then channel, then guild+trigger,
   * then guild default), or `null` when no row does — alert only.
   */
  resolveThresholds(
    guildId: GuildId,
    channelId: ChannelId | null,
    triggerType: AutomodTriggerType,
  ): Promise<AutomodPolicyRow | null>;

  /**
   * Exempt roles for a scope: the union over every policy row that covers
   * it. Exemptions widen as scopes widen; a narrow row can add an exemption
   * for its channel but never remove one a wider row granted.
   */
  exemptRoleIds(
    guildId: GuildId,
    channelId: ChannelId | null,
    triggerType: AutomodTriggerType,
  ): Promise<readonly RoleId[]>;

  listPolicies(guildId: GuildId): Promise<readonly AutomodPolicyRow[]>;

  /**
   * Create or update the policy row for one exact scope. Fields left
   * undefined keep their stored values, so tuning a threshold never wipes
   * a scope's exemptions and adding an exemption never invents thresholds.
   */
  upsertPolicy(input: UpsertAutomodPolicyInput): Promise<AutomodPolicyRow>;

  /** Record that this event crossed the ladder and what Guardian did. */
  attachOutcome(
    eventId: string,
    outcome: {
      readonly ladderStep: number;
      readonly moderationActionId?: string | null;
      readonly caseId?: string | null;
    },
    tx?: TransactionSql,
  ): Promise<void>;

  attachAlertMessage(eventId: string, alertMessageId: MessageId): Promise<void>;

  /** Link an event to a case opened later (a staff escalation of an alert-only event). */
  attachCase(eventId: string, caseId: string): Promise<void>;

  /**
   * Record a staff review decision. Only a `pending` event can be reviewed:
   * the update is conditional, and a second click on a stale alert returns
   * `null` rather than overwriting the first decision.
   */
  setReview(
    eventId: string,
    status: Exclude<AutomodReviewStatus, 'pending'>,
    reviewedBy: UserId,
    reviewedAt: Date,
  ): Promise<AutomodEventRow | null>;
}

interface RawEventRow {
  readonly id: string;
  readonly guild_id: GuildId;
  readonly user_id: UserId;
  readonly channel_id: ChannelId | null;
  readonly message_id: MessageId | null;
  readonly rule_id: string;
  readonly trigger_type: AutomodTriggerType;
  readonly matched_keyword: string | null;
  readonly discord_action: string;
  readonly ladder_step: number | null;
  readonly moderation_action_id: string | null;
  readonly case_id: string | null;
  readonly alert_message_id: MessageId | null;
  readonly review_status: AutomodReviewStatus;
  readonly reviewed_by: UserId | null;
  readonly reviewed_at: Date | null;
  readonly created_at: Date;
}

function mapEvent(row: RawEventRow): AutomodEventRow {
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    channelId: row.channel_id,
    messageId: row.message_id,
    ruleId: row.rule_id,
    triggerType: row.trigger_type,
    matchedKeyword: row.matched_keyword,
    discordAction: row.discord_action,
    ladderStep: row.ladder_step,
    moderationActionId: row.moderation_action_id,
    caseId: row.case_id,
    alertMessageId: row.alert_message_id,
    reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

interface RawPolicyRow {
  readonly id: string;
  readonly guild_id: GuildId;
  readonly channel_id: ChannelId | null;
  readonly trigger_type: AutomodTriggerType | null;
  readonly threshold_count: number | null;
  readonly window_seconds: number | null;
  readonly timeout_seconds: number | null;
  readonly exempt_role_ids: readonly RoleId[];
  readonly updated_by: UserId;
  readonly updated_at: Date;
}

function mapPolicy(row: RawPolicyRow): AutomodPolicyRow {
  return {
    id: row.id,
    guildId: row.guild_id,
    channelId: row.channel_id,
    triggerType: row.trigger_type,
    thresholdCount: row.threshold_count,
    windowSeconds: row.window_seconds,
    timeoutSeconds: row.timeout_seconds,
    exemptRoleIds: row.exempt_role_ids,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

const EVENT_COLUMNS = `
  id, guild_id, user_id, channel_id, message_id, rule_id, trigger_type,
  matched_keyword, discord_action, ladder_step, moderation_action_id,
  case_id, alert_message_id, review_status, reviewed_by, reviewed_at,
  created_at
`;

const POLICY_COLUMNS = `
  id, guild_id, channel_id, trigger_type, threshold_count, window_seconds,
  timeout_seconds, exempt_role_ids, updated_by, updated_at
`;

export class PostgresAutomodRepository
  extends BaseRepository
  implements AutomodRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async recordEvent(
    input: RecordAutomodEventInput,
    tx?: TransactionSql,
  ): Promise<{ readonly event: AutomodEventRow; readonly duplicate: boolean }> {
    const sql = this.conn(tx);
    try {
      const rows = await sql<RawEventRow[]>`
        INSERT INTO ${sql(this.schema)}.automod_events
          (guild_id, user_id, channel_id, message_id, rule_id, trigger_type,
           matched_keyword, discord_action)
        VALUES (
          ${input.guildId},
          ${input.userId},
          ${input.channelId ?? null},
          ${input.messageId ?? null},
          ${input.ruleId},
          ${input.triggerType},
          ${input.matchedKeyword ?? null},
          ${input.discordAction}
        )
        ON CONFLICT (guild_id, user_id, message_id, rule_id)
          WHERE message_id IS NOT NULL
          DO NOTHING
        RETURNING ${sql.unsafe(EVENT_COLUMNS)}
      `;

      const inserted = rows[0];
      if (inserted) return { event: mapEvent(inserted), duplicate: false };

      // No row back means the partial unique index already held this
      // execution: a redelivery, not a new offence.
      if (input.messageId == null) {
        throw new Error('INSERT into automod_events returned no row');
      }
      const existing = await sql<RawEventRow[]>`
        SELECT ${sql.unsafe(EVENT_COLUMNS)}
        FROM ${sql(this.schema)}.automod_events
        WHERE guild_id = ${input.guildId}
          AND user_id = ${input.userId}
          AND message_id = ${input.messageId}
          AND rule_id = ${input.ruleId}
        LIMIT 1
      `;
      const found = existing[0];
      if (!found) throw new Error('INSERT into automod_events returned no row');
      return { event: mapEvent(found), duplicate: true };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findEventById(id: string): Promise<AutomodEventRow | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawEventRow[]>`
        SELECT ${sql.unsafe(EVENT_COLUMNS)}
        FROM ${sql(this.schema)}.automod_events
        WHERE id = ${id}
        LIMIT 1
      `;
      const row = rows[0];
      return row ? mapEvent(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findLatestEventWithCase(
    guildId: GuildId,
    userId: UserId,
  ): Promise<AutomodEventRow | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawEventRow[]>`
        SELECT ${sql.unsafe(EVENT_COLUMNS)}
        FROM ${sql(this.schema)}.automod_events
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND case_id IS NOT NULL
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `;
      const row = rows[0];
      return row ? mapEvent(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countEventsInWindow(
    guildId: GuildId,
    userId: UserId,
    triggerType: AutomodTriggerType,
    since: Date,
  ): Promise<number> {
    const sql = this.conn();
    try {
      const rows = await sql<{ readonly count: string }[]>`
        SELECT count(*)::text AS count
        FROM ${sql(this.schema)}.automod_events
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND trigger_type = ${triggerType}
          AND created_at >= ${since}
      `;
      return Number(rows[0]?.count ?? '0');
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countByTriggerSince(
    guildId: GuildId,
    since: Date,
  ): Promise<ReadonlyMap<AutomodTriggerType, number>> {
    const sql = this.conn();
    try {
      const rows = await sql<
        { readonly trigger_type: AutomodTriggerType; readonly count: string }[]
      >`
        SELECT trigger_type, count(*)::text AS count
        FROM ${sql(this.schema)}.automod_events
        WHERE guild_id = ${guildId}
          AND created_at >= ${since}
        GROUP BY trigger_type
      `;
      return new Map(rows.map((row) => [row.trigger_type, Number(row.count)]));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async resolveThresholds(
    guildId: GuildId,
    channelId: ChannelId | null,
    triggerType: AutomodTriggerType,
  ): Promise<AutomodPolicyRow | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawPolicyRow[]>`
        SELECT ${sql.unsafe(POLICY_COLUMNS)}
        FROM ${sql(this.schema)}.automod_policies
        WHERE guild_id = ${guildId}
          AND threshold_count IS NOT NULL
          AND (channel_id IS NULL OR channel_id = ${channelId})
          AND (trigger_type IS NULL OR trigger_type = ${triggerType})
        ORDER BY
          (channel_id IS NOT NULL) DESC,
          (trigger_type IS NOT NULL) DESC
        LIMIT 1
      `;
      const row = rows[0];
      return row ? mapPolicy(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async exemptRoleIds(
    guildId: GuildId,
    channelId: ChannelId | null,
    triggerType: AutomodTriggerType,
  ): Promise<readonly RoleId[]> {
    const sql = this.conn();
    try {
      const rows = await sql<{ readonly exempt_role_ids: readonly RoleId[] }[]>`
        SELECT exempt_role_ids
        FROM ${sql(this.schema)}.automod_policies
        WHERE guild_id = ${guildId}
          AND (channel_id IS NULL OR channel_id = ${channelId})
          AND (trigger_type IS NULL OR trigger_type = ${triggerType})
      `;
      const union = new Set<RoleId>();
      for (const row of rows) {
        for (const roleId of row.exempt_role_ids) union.add(roleId);
      }
      return [...union];
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listPolicies(guildId: GuildId): Promise<readonly AutomodPolicyRow[]> {
    const sql = this.conn();
    try {
      const rows = await sql<RawPolicyRow[]>`
        SELECT ${sql.unsafe(POLICY_COLUMNS)}
        FROM ${sql(this.schema)}.automod_policies
        WHERE guild_id = ${guildId}
        ORDER BY channel_id NULLS FIRST, trigger_type NULLS FIRST
      `;
      return rows.map(mapPolicy);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async upsertPolicy(input: UpsertAutomodPolicyInput): Promise<AutomodPolicyRow> {
    const sql = this.conn();
    const channelId = input.channelId ?? null;
    const triggerType = input.triggerType ?? null;
    try {
      const rows = await sql<RawPolicyRow[]>`
        INSERT INTO ${sql(this.schema)}.automod_policies
          (guild_id, channel_id, trigger_type, threshold_count, window_seconds,
           timeout_seconds, exempt_role_ids, updated_by, updated_at)
        VALUES (
          ${input.guildId},
          ${channelId},
          ${triggerType},
          ${input.thresholdCount ?? null},
          ${input.windowSeconds ?? null},
          ${input.timeoutSeconds ?? null},
          ${sql.array([...(input.exemptRoleIds ?? [])])},
          ${input.updatedBy},
          now()
        )
        ON CONFLICT (
          guild_id,
          COALESCE(channel_id, '0'),
          COALESCE(trigger_type::text, 'all')
        )
        DO UPDATE SET
          threshold_count = COALESCE(EXCLUDED.threshold_count, ${sql(this.schema)}.automod_policies.threshold_count),
          window_seconds = COALESCE(EXCLUDED.window_seconds, ${sql(this.schema)}.automod_policies.window_seconds),
          timeout_seconds = COALESCE(EXCLUDED.timeout_seconds, ${sql(this.schema)}.automod_policies.timeout_seconds),
          exempt_role_ids = CASE
            WHEN EXCLUDED.exempt_role_ids = '{}' THEN ${sql(this.schema)}.automod_policies.exempt_role_ids
            ELSE EXCLUDED.exempt_role_ids
          END,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING ${sql.unsafe(POLICY_COLUMNS)}
      `;
      const row = rows[0];
      if (!row) throw new Error('UPSERT into automod_policies returned no row');
      return mapPolicy(row);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async attachOutcome(
    eventId: string,
    outcome: {
      readonly ladderStep: number;
      readonly moderationActionId?: string | null;
      readonly caseId?: string | null;
    },
    tx?: TransactionSql,
  ): Promise<void> {
    const sql = this.conn(tx);
    try {
      await sql`
        UPDATE ${sql(this.schema)}.automod_events
        SET ladder_step = ${outcome.ladderStep},
            moderation_action_id = ${outcome.moderationActionId ?? null},
            case_id = ${outcome.caseId ?? null}
        WHERE id = ${eventId}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async attachAlertMessage(
    eventId: string,
    alertMessageId: MessageId,
  ): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        UPDATE ${sql(this.schema)}.automod_events
        SET alert_message_id = ${alertMessageId}
        WHERE id = ${eventId}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async attachCase(eventId: string, caseId: string): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        UPDATE ${sql(this.schema)}.automod_events
        SET case_id = ${caseId}
        WHERE id = ${eventId}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async setReview(
    eventId: string,
    status: Exclude<AutomodReviewStatus, 'pending'>,
    reviewedBy: UserId,
    reviewedAt: Date,
  ): Promise<AutomodEventRow | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawEventRow[]>`
        UPDATE ${sql(this.schema)}.automod_events
        SET review_status = ${status},
            reviewed_by = ${reviewedBy},
            reviewed_at = ${reviewedAt}
        WHERE id = ${eventId}
          AND review_status = 'pending'
        RETURNING ${sql.unsafe(EVENT_COLUMNS)}
      `;
      const row = rows[0];
      return row ? mapEvent(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
