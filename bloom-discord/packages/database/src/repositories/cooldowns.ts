import type { GuildId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

export interface CooldownResult {
  /** `true` if the caller may proceed. `false` means an unexpired cooldown exists. */
  readonly allowed: boolean;
  readonly expiresAt: Date;
  /** How many times this cooldown has been hit while active — useful for spam detection. */
  readonly hits: number;
}

export interface CooldownRepository {
  /**
   * Atomically test and set. Returns whether the caller may proceed.
   * There is deliberately no separate "check" method — a check followed by a
   * set is a race, and the only safe shape is a single statement.
   */
  tryAcquire(
    guildId: GuildId,
    scope: string,
    subject: string,
    ttlSeconds: number,
    tx?: TransactionSql,
  ): Promise<CooldownResult>;

  clear(guildId: GuildId, scope: string, subject: string): Promise<void>;
}

/**
 * Database-backed cooldowns.
 *
 * In-memory would be simpler and would also be wrong: three processes, and a
 * restart resets every limit. The brief requires duplicate welcome messages and
 * repeated rewards to be prevented, which only holds if the limit outlives the
 * process that set it.
 *
 * The whole decision is one statement. `ON CONFLICT ... WHERE expires_at <= now()`
 * means the row is only reclaimed if the previous cooldown has lapsed, and
 * `RETURNING` tells us which branch happened — no read-then-write window for a
 * second interaction to slip through.
 */
export class PostgresCooldownRepository
  extends BaseRepository
  implements CooldownRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async tryAcquire(
    guildId: GuildId,
    scope: string,
    subject: string,
    ttlSeconds: number,
    tx?: TransactionSql,
  ): Promise<CooldownResult> {
    const sql = this.conn(tx);
    const ttl = Math.min(Math.max(Math.trunc(ttlSeconds), 1), 60 * 60 * 24 * 30);

    try {
      const rows = await sql<
        { expires_at: Date; hit_count: number; acquired: boolean }[]
      >`
        INSERT INTO ${sql(this.schema)}.message_cooldowns (guild_id, scope, subject, expires_at)
        VALUES (${guildId}, ${scope}, ${subject}, now() + make_interval(secs => ${ttl}))
        ON CONFLICT (guild_id, scope, subject) DO UPDATE
          SET expires_at = CASE
                WHEN ${sql(this.schema)}.message_cooldowns.expires_at <= now()
                  THEN now() + make_interval(secs => ${ttl})
                ELSE ${sql(this.schema)}.message_cooldowns.expires_at
              END,
              hit_count = CASE
                WHEN ${sql(this.schema)}.message_cooldowns.expires_at <= now() THEN 1
                ELSE ${sql(this.schema)}.message_cooldowns.hit_count + 1
              END
        RETURNING
          expires_at,
          hit_count,
          (hit_count = 1) AS acquired
      `;

      const row = rows[0]!;
      return { allowed: row.acquired, expiresAt: row.expires_at, hits: row.hit_count };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async clear(guildId: GuildId, scope: string, subject: string): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        DELETE FROM ${sql(this.schema)}.message_cooldowns
        WHERE guild_id = ${guildId} AND scope = ${scope} AND subject = ${subject}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
