import {
  BloomError,
  type BotName,
  type CorrelationId,
  type GuildId,
  type IdempotencyKey,
  type JsonObject,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

export interface IdempotencyClaim {
  /** `true` if this caller won the claim and should perform the effect. */
  readonly claimed: boolean;
  /** The stored result of the original run, when `claimed` is false. */
  readonly existingResult: JsonObject | null;
}

export interface IdempotencyRepository {
  claim(
    key: IdempotencyKey,
    input: {
      readonly botName: BotName;
      readonly operation: string;
      readonly guildId?: GuildId | null;
      readonly correlationId?: CorrelationId | null;
    },
    tx?: TransactionSql,
  ): Promise<IdempotencyClaim>;

  recordResult(
    key: IdempotencyKey,
    result: JsonObject,
    tx?: TransactionSql,
  ): Promise<void>;
}

/**
 * Exactly-once, arbitrated by the database.
 *
 * The property the brief asks for — "atomic, idempotent, resistant to duplicate
 * requests, safe across multiple bot instances and simultaneous interactions" —
 * cannot be delivered by an in-process guard, because there are three processes
 * and Discord will happily deliver the same button click twice.
 *
 * What delivers it is a PRIMARY KEY. The claim insert runs inside the same
 * transaction as the effect it protects, so either both commit or neither does.
 * A second caller's insert hits the unique constraint and is told, truthfully,
 * that the work is already done.
 */
export class PostgresIdempotencyRepository
  extends BaseRepository
  implements IdempotencyRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async claim(
    key: IdempotencyKey,
    input: {
      readonly botName: BotName;
      readonly operation: string;
      readonly guildId?: GuildId | null;
      readonly correlationId?: CorrelationId | null;
    },
    tx?: TransactionSql,
  ): Promise<IdempotencyClaim> {
    const sql = this.conn(tx);
    try {
      /*
       * ON CONFLICT DO NOTHING rather than catching the unique violation:
       * inside a transaction, a raised constraint error aborts the whole
       * transaction, which would roll back the caller's other work. Letting
       * Postgres absorb the conflict keeps the transaction usable.
       */
      const inserted = await sql<{ key: string }[]>`
        INSERT INTO ${sql(this.schema)}.idempotency_keys (key, bot_name, guild_id, operation, correlation_id)
        VALUES (${key}, ${input.botName}, ${input.guildId ?? null}, ${input.operation}, ${input.correlationId ?? null})
        ON CONFLICT (key) DO NOTHING
        RETURNING key
      `;

      if (inserted.length > 0) {
        return { claimed: true, existingResult: null };
      }

      const [existing] = await sql<{ result: JsonObject | null }[]>`
        SELECT result FROM ${sql(this.schema)}.idempotency_keys WHERE key = ${key}
      `;
      return { claimed: false, existingResult: existing?.result ?? null };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async recordResult(
    key: IdempotencyKey,
    result: JsonObject,
    tx?: TransactionSql,
  ): Promise<void> {
    const sql = this.conn(tx);
    try {
      await sql`
        UPDATE ${sql(this.schema)}.idempotency_keys
        SET result = ${sql.json(result)}
        WHERE key = ${key}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}

/**
 * Run an effect exactly once.
 *
 * The transaction boundary is the whole point: `claim` and `effect` commit
 * together. A crash between them rolls both back, so the operation can be
 * retried rather than being permanently recorded as done but never performed.
 */
export async function runOnce<T extends JsonObject>(
  database: Database,
  repository: IdempotencyRepository,
  key: IdempotencyKey,
  input: {
    readonly botName: BotName;
    readonly operation: string;
    readonly guildId?: GuildId | null;
    readonly correlationId?: CorrelationId | null;
  },
  effect: (tx: TransactionSql) => Promise<T>,
): Promise<{ performed: boolean; result: T | JsonObject | null }> {
  try {
    return await database.transaction(async (tx) => {
      const claim = await repository.claim(key, input, tx);
      if (!claim.claimed) {
        return { performed: false, result: claim.existingResult };
      }

      const result = await effect(tx);
      await repository.recordResult(key, result, tx);
      return { performed: true, result };
    });
  } catch (error) {
    // A concurrent claimer that got there between our INSERT and COMMIT.
    // Not a failure: the work is done, by someone else.
    if (BloomError.isCode(error, 'DUPLICATE_OPERATION')) {
      return { performed: false, result: null };
    }
    throw error;
  }
}
