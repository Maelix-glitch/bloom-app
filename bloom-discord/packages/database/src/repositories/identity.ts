import type { GuildId, OnboardingState, RoleId, UserId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

export interface GuildRecord {
  readonly guildId: GuildId;
  readonly name: string;
  readonly timezone: string;
  readonly automationEnabled: boolean;
}

export interface MemberRecord {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly onboardingState: OnboardingState;
  readonly joinedAt: Date | null;
  readonly leftAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly onboardingCompletedAt: Date | null;
}

export interface IdentityRepository {
  upsertGuild(
    input: { guildId: GuildId; name: string; timezone?: string },
    tx?: TransactionSql,
  ): Promise<void>;
  findGuild(guildId: GuildId): Promise<GuildRecord | null>;

  upsertUser(
    input: { userId: UserId; username: string; isBot?: boolean },
    tx?: TransactionSql,
  ): Promise<void>;

  /** Create the membership row if absent. Never downgrades existing state. */
  ensureMember(
    input: { guildId: GuildId; userId: UserId; username: string; joinedAt?: Date | null },
    tx?: TransactionSql,
  ): Promise<MemberRecord>;

  findMember(guildId: GuildId, userId: UserId): Promise<MemberRecord | null>;

  markLeft(
    guildId: GuildId,
    userId: UserId,
    at: Date,
    tx?: TransactionSql,
  ): Promise<void>;

  /** Replace the observed role cache for one member. */
  replaceObservedRoles(
    guildId: GuildId,
    userId: UserId,
    roleIds: readonly RoleId[],
    tx?: TransactionSql,
  ): Promise<void>;

  /** Members observed to hold a given role. Cohort queries only — never authorization. */
  findMembersWithRole(guildId: GuildId, roleId: RoleId): Promise<readonly UserId[]>;
}

/**
 * Guilds, users, members and the observed role cache.
 *
 * Note what this repository does NOT expose: no method changes
 * `onboarding_state`. That transition is Guardian's alone and arrives in Phase 1
 * as a dedicated, audited operation with its own authorization. Putting a
 * general-purpose `setOnboardingState` here would make it reachable from
 * Companion, which is exactly the boundary the brief draws.
 */
export class PostgresIdentityRepository
  extends BaseRepository
  implements IdentityRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async upsertGuild(
    input: { guildId: GuildId; name: string; timezone?: string },
    tx?: TransactionSql,
  ): Promise<void> {
    const sql = this.conn(tx);
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.guilds (guild_id, name, timezone)
        VALUES (${input.guildId}, ${input.name}, ${input.timezone ?? 'UTC'})
        ON CONFLICT (guild_id) DO UPDATE SET name = EXCLUDED.name
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findGuild(guildId: GuildId): Promise<GuildRecord | null> {
    const sql = this.conn();
    try {
      const rows = await sql<
        {
          guild_id: string;
          name: string;
          timezone: string;
          automation_enabled: boolean;
        }[]
      >`
        SELECT guild_id, name, timezone, automation_enabled
        FROM ${sql(this.schema)}.guilds WHERE guild_id = ${guildId}
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        guildId: row.guild_id as GuildId,
        name: row.name,
        timezone: row.timezone,
        automationEnabled: row.automation_enabled,
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async upsertUser(
    input: { userId: UserId; username: string; isBot?: boolean },
    tx?: TransactionSql,
  ): Promise<void> {
    const sql = this.conn(tx);
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.users (user_id, username, is_bot)
        VALUES (${input.userId}, ${input.username}, ${input.isBot ?? false})
        ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async ensureMember(
    input: { guildId: GuildId; userId: UserId; username: string; joinedAt?: Date | null },
    tx?: TransactionSql,
  ): Promise<MemberRecord> {
    const sql = this.conn(tx);
    try {
      await this.upsertUser({ userId: input.userId, username: input.username }, tx);

      /*
       * A rejoin clears `left_at` but deliberately preserves `onboarding_state`.
       * Someone who completed onboarding, left and came back should not be
       * pushed through verification again — and someone whose access was revoked
       * should not be able to launder that by leaving and rejoining.
       */
      const rows = await sql<RawMemberRow[]>`
        INSERT INTO ${sql(this.schema)}.guild_members (guild_id, user_id, joined_at)
        VALUES (${input.guildId}, ${input.userId}, ${input.joinedAt ?? null})
        ON CONFLICT (guild_id, user_id) DO UPDATE
          SET left_at = NULL,
              joined_at = COALESCE(${sql(this.schema)}.guild_members.joined_at, EXCLUDED.joined_at)
        RETURNING *
      `;
      return mapMember(rows[0]!);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findMember(
    guildId: GuildId,
    userId: UserId,
  ): Promise<MemberRecord | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawMemberRow[]>`
        SELECT * FROM ${sql(this.schema)}.guild_members
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;
      const row = rows[0];
      return row ? mapMember(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async markLeft(
    guildId: GuildId,
    userId: UserId,
    at: Date,
    tx?: TransactionSql,
  ): Promise<void> {
    const sql = this.conn(tx);
    try {
      await sql`
        UPDATE ${sql(this.schema)}.guild_members
        SET left_at = ${at}
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async replaceObservedRoles(
    guildId: GuildId,
    userId: UserId,
    roleIds: readonly RoleId[],
    tx?: TransactionSql,
  ): Promise<void> {
    const apply = async (conn: TransactionSql): Promise<void> => {
      await conn`
        DELETE FROM ${conn(this.schema)}.member_roles
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;
      if (roleIds.length === 0) return;

      const values = roleIds.map((roleId) => ({
        guild_id: guildId,
        user_id: userId,
        role_id: roleId,
      }));
      await conn`
        INSERT INTO ${conn(this.schema)}.member_roles ${conn(values, 'guild_id', 'user_id', 'role_id')}
        ON CONFLICT DO NOTHING
      `;
    };

    try {
      // Delete-then-insert must be atomic, or a concurrent read sees no roles.
      if (tx) await apply(tx);
      else await this.db.transaction(apply);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findMembersWithRole(
    guildId: GuildId,
    roleId: RoleId,
  ): Promise<readonly UserId[]> {
    const sql = this.conn();
    try {
      const rows = await sql<{ user_id: string }[]>`
        SELECT mr.user_id
        FROM ${sql(this.schema)}.member_roles mr
        JOIN ${sql(this.schema)}.guild_members gm
          ON gm.guild_id = mr.guild_id AND gm.user_id = mr.user_id
        WHERE mr.guild_id = ${guildId} AND mr.role_id = ${roleId} AND gm.left_at IS NULL
      `;
      return rows.map((row) => row.user_id as UserId);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}

interface RawMemberRow {
  guild_id: string;
  user_id: string;
  onboarding_state: OnboardingState;
  joined_at: Date | null;
  left_at: Date | null;
  verified_at: Date | null;
  onboarding_completed_at: Date | null;
}

function mapMember(row: RawMemberRow): MemberRecord {
  return {
    guildId: row.guild_id as GuildId,
    userId: row.user_id as UserId,
    onboardingState: row.onboarding_state,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    verifiedAt: row.verified_at,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}
