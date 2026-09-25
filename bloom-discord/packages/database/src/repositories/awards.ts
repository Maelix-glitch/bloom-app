import type { GuildId, JsonObject, UserId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

export type AwardKind = 'milestone' | 'achievement';

export interface MemberAward {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly awardKey: string;
  readonly kind: AwardKind;
  readonly evidence: JsonObject;
  readonly earnedAt: Date;
  readonly announced: boolean;
}

export interface GrantAwardInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly awardKey: string;
  readonly kind: AwardKind;
  /** Counts only. Never member-authored text. */
  readonly evidence?: JsonObject;
}

export type GrantOutcome =
  | { readonly kind: 'granted'; readonly award: MemberAward }
  /** Already held. Nothing was written and nothing should be announced. */
  | { readonly kind: 'already_held'; readonly award: MemberAward };

export interface AwardsRepository {
  /**
   * Grant an award, once.
   *
   * The primary key arbitrates. Two evaluations racing — a check-in and a
   * shared win in the same second — produce one grant and one `already_held`,
   * so the announcement fires once.
   */
  grant(input: GrantAwardInput, tx?: TransactionSql): Promise<GrantOutcome>;

  list(guildId: GuildId, userId: UserId): Promise<readonly MemberAward[]>;

  /** The keys a member already holds, for skipping definitions cheaply. */
  heldKeys(guildId: GuildId, userId: UserId): Promise<ReadonlySet<string>>;

  /**
   * Mark an award announced.
   *
   * Separate from the grant because they are different effects with different
   * failure modes. Discord being unreachable must not stop an award being
   * earned, and the flag is what stops the announcement being posted twice when
   * the next evaluation comes round.
   */
  markAnnounced(
    guildId: GuildId,
    userId: UserId,
    awardKey: string,
    tx?: TransactionSql,
  ): Promise<void>;
}

interface AwardRow {
  readonly guild_id: string;
  readonly user_id: string;
  readonly award_key: string;
  readonly kind: AwardKind;
  readonly evidence: JsonObject;
  readonly earned_at: Date;
  readonly announced: boolean;
}

function toAward(row: AwardRow): MemberAward {
  return {
    guildId: row.guild_id as GuildId,
    userId: row.user_id as UserId,
    awardKey: row.award_key,
    kind: row.kind,
    evidence: row.evidence,
    earnedAt: row.earned_at,
    announced: row.announced,
  };
}

/**
 * Milestones and achievements, in the database.
 *
 * Deliberately thin. All the interesting logic — what a milestone means, when
 * it is earned — lives in the definitions next to the feature, because it is
 * product judgement rather than storage. What this layer guarantees is only
 * that an award is granted once and that the evidence survives.
 */
export class PostgresAwardsRepository extends BaseRepository implements AwardsRepository {
  public constructor(database: Database) {
    super(database);
  }

  public async grant(input: GrantAwardInput, tx?: TransactionSql): Promise<GrantOutcome> {
    const conn = tx ?? this.db.sql;
    try {
      const inserted = await conn<AwardRow[]>`
        INSERT INTO ${conn(this.schema)}.member_awards
          (guild_id, user_id, award_key, kind, evidence)
        VALUES (
          ${input.guildId}, ${input.userId}, ${input.awardKey}, ${input.kind},
          ${conn.json(input.evidence ?? {})}
        )
        ON CONFLICT (guild_id, user_id, award_key) DO NOTHING
        RETURNING guild_id, user_id, award_key, kind, evidence, earned_at, announced
      `;

      const row = inserted[0];
      if (row) return { kind: 'granted', award: toAward(row) };

      const existing = await conn<AwardRow[]>`
        SELECT guild_id, user_id, award_key, kind, evidence, earned_at, announced
        FROM ${conn(this.schema)}.member_awards
        WHERE guild_id = ${input.guildId}
          AND user_id = ${input.userId}
          AND award_key = ${input.awardKey}
      `;

      const held = existing[0];
      if (!held) {
        // Conflicted, then vanished. Nothing deletes from this table.
        throw new Error(
          `member_awards conflict for ${input.awardKey} but no row to read back.`,
        );
      }
      return { kind: 'already_held', award: toAward(held) };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async list(guildId: GuildId, userId: UserId): Promise<readonly MemberAward[]> {
    try {
      const rows = await this.db.sql<AwardRow[]>`
        SELECT guild_id, user_id, award_key, kind, evidence, earned_at, announced
        FROM ${this.db.sql(this.schema)}.member_awards
        WHERE guild_id = ${guildId} AND user_id = ${userId}
        ORDER BY earned_at DESC, award_key ASC
      `;
      return rows.map(toAward);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async heldKeys(guildId: GuildId, userId: UserId): Promise<ReadonlySet<string>> {
    try {
      const rows = await this.db.sql<{ award_key: string }[]>`
        SELECT award_key
        FROM ${this.db.sql(this.schema)}.member_awards
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;
      return new Set(rows.map((row) => row.award_key));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async markAnnounced(
    guildId: GuildId,
    userId: UserId,
    awardKey: string,
    tx?: TransactionSql,
  ): Promise<void> {
    const conn = tx ?? this.db.sql;
    try {
      await conn`
        UPDATE ${conn(this.schema)}.member_awards
        SET announced = true
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND award_key = ${awardKey}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
