import type { CorrelationId, GuildId, UserId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

/**
 * The Guardian → Companion referral handoff.
 *
 * Two processes, one table, and a state machine narrow enough that the
 * interesting property — nobody is ever paid twice — is a database guarantee
 * rather than a convention. Guardian writes the left-hand side (attribution,
 * qualification); Companion writes the right-hand side (claim, payment).
 *
 * See `database/migrations/0010_referrals.sql` for who is permitted what, and
 * why no DELETE is granted to either.
 */

/** How the inviter was determined. Mirrors the SQL CHECK. */
export const REFERRAL_SOURCES = [
  'invite_diff',
  'vanity',
  'ambiguous',
  'unavailable',
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

/** Forward-only. Mirrors the SQL CHECK. */
export const REFERRAL_STATES = ['pending', 'qualified', 'rejected', 'paid'] as const;
export type ReferralState = (typeof REFERRAL_STATES)[number];

/** Machine codes, never prose. Mirrors the SQL CHECK. */
export const REFERRAL_REJECTIONS = [
  'no_inviter',
  'self_referral',
  'account_too_new',
  'left_before_qualifying',
  'not_present',
  'already_referred',
  'inviter_is_bot',
] as const;
export type ReferralRejection = (typeof REFERRAL_REJECTIONS)[number];

export interface ReferralTrigger {
  readonly id: string;
  readonly guildId: GuildId;
  readonly referredUserId: UserId;
  readonly inviterUserId: UserId | null;
  readonly inviteCode: string | null;
  readonly source: ReferralSource;
  readonly state: ReferralState;
  readonly rejectedReason: ReferralRejection | null;
  readonly claimedAt: Date | null;
  readonly claimedBy: string | null;
  readonly attempts: number;
  readonly pointEventId: string | null;
  readonly idempotencyKey: string;
  readonly correlationId: CorrelationId | null;
  readonly createdAt: Date;
  readonly qualifiedAt: Date | null;
  readonly consumedAt: Date | null;
}

export interface RecordReferralInput {
  readonly guildId: GuildId;
  readonly referredUserId: UserId;
  readonly inviterUserId: UserId | null;
  readonly inviteCode: string | null;
  readonly source: ReferralSource;
  readonly idempotencyKey: string;
  readonly correlationId?: CorrelationId | null;
}

export type RecordReferralOutcome =
  /** A new row. This member had not been referred in this guild before. */
  | { readonly kind: 'recorded'; readonly trigger: ReferralTrigger }
  /**
   * This member already has a referral row. Nothing was written and the
   * existing row is returned — a rejoin does not create a second chance.
   */
  | { readonly kind: 'already_referred'; readonly trigger: ReferralTrigger };

export interface ClaimedReferral extends ReferralTrigger {
  readonly inviterUserId: UserId;
}

export interface ReferralRepository {
  /** Guardian, at join time. Idempotent per (guild, referred member). */
  record(input: RecordReferralInput): Promise<RecordReferralOutcome>;

  /** Guardian's qualification scan: pending rows older than a cutoff. */
  listPending(
    guildId: GuildId,
    createdBefore: Date,
    limit?: number,
  ): Promise<readonly ReferralTrigger[]>;

  /** Guardian: pending → qualified. The row becomes claimable by Companion. */
  markQualified(id: string, qualifiedAt: Date): Promise<boolean>;

  /** Guardian: → rejected. Terminal, and the row stays for the audit trail. */
  markRejected(id: string, reason: ReferralRejection): Promise<boolean>;

  /**
   * Companion: atomically take up to `limit` qualified rows.
   *
   * The concurrency primitive. Two workers calling this at the same instant
   * receive disjoint sets, so the same referral cannot be paid twice.
   */
  claim(input: {
    readonly guildId: GuildId;
    readonly workerId: string;
    readonly limit: number;
    readonly now: Date;
    /** Claims older than this are treated as abandoned and re-offered. */
    readonly staleClaimsBefore: Date;
  }): Promise<readonly ClaimedReferral[]>;

  /** Companion: qualified → paid, pointing at the ledger row it produced. */
  markPaid(input: {
    readonly id: string;
    readonly pointEventId: string;
    readonly consumedAt: Date;
    readonly tx?: TransactionSql;
  }): Promise<boolean>;

  /** Companion: payment failed. Release the claim so it can be retried. */
  releaseClaim(id: string): Promise<boolean>;

  findById(id: string): Promise<ReferralTrigger | null>;

  /** Staff read: recent referral activity in a guild, newest first. */
  listRecent(
    guildId: GuildId,
    options?: { readonly state?: ReferralState; readonly limit?: number },
  ): Promise<readonly ReferralTrigger[]>;

  /** How many referrals this inviter has been paid for. */
  countPaidForInviter(guildId: GuildId, inviterUserId: UserId): Promise<number>;
}

interface ReferralRow {
  readonly id: string;
  readonly guild_id: string;
  readonly referred_user_id: string;
  readonly inviter_user_id: string | null;
  readonly invite_code: string | null;
  readonly source: ReferralSource;
  readonly state: ReferralState;
  readonly rejected_reason: ReferralRejection | null;
  readonly claimed_at: Date | null;
  readonly claimed_by: string | null;
  readonly attempts: number;
  readonly point_event_id: string | null;
  readonly idempotency_key: string;
  readonly correlation_id: string | null;
  readonly created_at: Date;
  readonly qualified_at: Date | null;
  readonly consumed_at: Date | null;
}

const COLUMNS = `
  id, guild_id, referred_user_id, inviter_user_id, invite_code, source, state,
  rejected_reason, claimed_at, claimed_by, attempts, point_event_id,
  idempotency_key, correlation_id, created_at, qualified_at, consumed_at
`;

const DEFAULT_SCAN_LIMIT = 50;
const MAX_SCAN_LIMIT = 200;
const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 25;

function toTrigger(row: ReferralRow): ReferralTrigger {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    referredUserId: row.referred_user_id as UserId,
    inviterUserId: row.inviter_user_id as UserId | null,
    inviteCode: row.invite_code,
    source: row.source,
    state: row.state,
    rejectedReason: row.rejected_reason,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by,
    attempts: row.attempts,
    pointEventId: row.point_event_id,
    idempotencyKey: row.idempotency_key,
    correlationId: row.correlation_id as CorrelationId | null,
    createdAt: row.created_at,
    qualifiedAt: row.qualified_at,
    consumedAt: row.consumed_at,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class PostgresReferralRepository
  extends BaseRepository
  implements ReferralRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async record(input: RecordReferralInput): Promise<RecordReferralOutcome> {
    try {
      /*
       * ON CONFLICT DO NOTHING against the one-per-member unique index, then
       * read the row back. This is the rejoin guard: the tenth join of a
       * cycling account writes nothing and returns the row from the first.
       *
       * The conflict target is named so a future second unique index cannot
       * silently start absorbing conflicts it was not meant to.
       */
      const inserted = await this.db.sql<ReferralRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.referral_triggers
          (guild_id, referred_user_id, inviter_user_id, invite_code, source,
           idempotency_key, correlation_id)
        VALUES (
          ${input.guildId}, ${input.referredUserId}, ${input.inviterUserId},
          ${input.inviteCode}, ${input.source}, ${input.idempotencyKey},
          ${input.correlationId ?? null}
        )
        ON CONFLICT (guild_id, referred_user_id) DO NOTHING
        RETURNING ${this.db.sql.unsafe(COLUMNS)}
      `;

      const row = inserted[0];
      if (row) return { kind: 'recorded', trigger: toTrigger(row) };

      const existing = await this.db.sql<ReferralRow[]>`
        SELECT ${this.db.sql.unsafe(COLUMNS)}
        FROM ${this.db.sql(this.schema)}.referral_triggers
        WHERE guild_id = ${input.guildId}
          AND referred_user_id = ${input.referredUserId}
      `;

      const found = existing[0];
      if (!found) {
        // The insert conflicted but the row is gone: only possible if someone
        // deleted it behind the application, which no bot is permitted to do.
        throw new Error('referral row vanished between insert and read');
      }
      return { kind: 'already_referred', trigger: toTrigger(found) };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listPending(
    guildId: GuildId,
    createdBefore: Date,
    limit = DEFAULT_SCAN_LIMIT,
  ): Promise<readonly ReferralTrigger[]> {
    try {
      const rows = await this.db.sql<ReferralRow[]>`
        SELECT ${this.db.sql.unsafe(COLUMNS)}
        FROM ${this.db.sql(this.schema)}.referral_triggers
        WHERE guild_id = ${guildId}
          AND state = 'pending'
          AND created_at <= ${createdBefore}
        ORDER BY created_at ASC, id ASC
        LIMIT ${clamp(limit, 1, MAX_SCAN_LIMIT)}
      `;
      return rows.map(toTrigger);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async markQualified(id: string, qualifiedAt: Date): Promise<boolean> {
    try {
      /*
       * `state = 'pending'` in the WHERE clause, not just the id. That makes
       * the transition itself the lock: a second qualification pass running
       * concurrently updates zero rows instead of re-qualifying something
       * Companion may already have claimed.
       */
      const rows = await this.db.sql<{ id: string }[]>`
        UPDATE ${this.db.sql(this.schema)}.referral_triggers
        SET state = 'qualified', qualified_at = ${qualifiedAt}
        WHERE id = ${id}
          AND state = 'pending'
          AND inviter_user_id IS NOT NULL
        RETURNING id
      `;
      return rows.length === 1;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async markRejected(id: string, reason: ReferralRejection): Promise<boolean> {
    try {
      // A paid referral is never un-paid; rejection applies only to work that
      // has not been settled.
      const rows = await this.db.sql<{ id: string }[]>`
        UPDATE ${this.db.sql(this.schema)}.referral_triggers
        SET state = 'rejected', rejected_reason = ${reason}, qualified_at = NULL
        WHERE id = ${id}
          AND state IN ('pending', 'qualified')
        RETURNING id
      `;
      return rows.length === 1;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async claim(input: {
    readonly guildId: GuildId;
    readonly workerId: string;
    readonly limit: number;
    readonly now: Date;
    readonly staleClaimsBefore: Date;
  }): Promise<readonly ClaimedReferral[]> {
    try {
      /*
       * The exactly-once primitive.
       *
       * FOR UPDATE SKIP LOCKED inside the subquery is what makes two workers
       * safe: the second one does not block on the first one's rows, it walks
       * past them and takes the next ones. The UPDATE then stamps the claim in
       * the same statement, so there is no window between selecting a row and
       * owning it.
       *
       * A claim older than `staleClaimsBefore` is re-offered, which is the
       * crash recovery path: a worker that died mid-payment leaves a claim
       * nobody will ever clear, and without this the row would be stranded
       * forever. Re-offering is safe because the payment itself is idempotent
       * on `idempotency_key` — a retry of a payment that actually succeeded
       * collapses onto the same ledger row.
       */
      const rows = await this.db.sql<ReferralRow[]>`
        UPDATE ${this.db.sql(this.schema)}.referral_triggers AS t
        SET claimed_at = ${input.now},
            claimed_by = ${input.workerId},
            attempts = t.attempts + 1
        WHERE t.id IN (
          SELECT c.id
          FROM ${this.db.sql(this.schema)}.referral_triggers AS c
          WHERE c.guild_id = ${input.guildId}
            AND c.state = 'qualified'
            AND c.inviter_user_id IS NOT NULL
            AND (c.claimed_at IS NULL OR c.claimed_at < ${input.staleClaimsBefore})
          ORDER BY c.qualified_at ASC, c.id ASC
          LIMIT ${clamp(input.limit, 1, MAX_SCAN_LIMIT)}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING ${this.db.sql.unsafe(COLUMNS)}
      `;
      // The inviter is non-null by the WHERE clause above; the cast records
      // that rather than making every caller re-check it.
      return rows.map((row) => toTrigger(row) as ClaimedReferral);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async markPaid(input: {
    readonly id: string;
    readonly pointEventId: string;
    readonly consumedAt: Date;
    readonly tx?: TransactionSql;
  }): Promise<boolean> {
    const sql = input.tx ?? this.db.sql;
    try {
      // `state = 'qualified'` again: a row that somehow reached 'paid' already
      // is not re-stamped, and the caller learns the write did nothing.
      const rows = await sql<{ id: string }[]>`
        UPDATE ${sql(this.schema)}.referral_triggers
        SET state = 'paid',
            consumed_at = ${input.consumedAt},
            point_event_id = ${input.pointEventId},
            claimed_at = NULL,
            claimed_by = NULL
        WHERE id = ${input.id}
          AND state = 'qualified'
        RETURNING id
      `;
      return rows.length === 1;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async releaseClaim(id: string): Promise<boolean> {
    try {
      const rows = await this.db.sql<{ id: string }[]>`
        UPDATE ${this.db.sql(this.schema)}.referral_triggers
        SET claimed_at = NULL, claimed_by = NULL
        WHERE id = ${id} AND state = 'qualified'
        RETURNING id
      `;
      return rows.length === 1;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findById(id: string): Promise<ReferralTrigger | null> {
    try {
      const rows = await this.db.sql<ReferralRow[]>`
        SELECT ${this.db.sql.unsafe(COLUMNS)}
        FROM ${this.db.sql(this.schema)}.referral_triggers
        WHERE id = ${id}
      `;
      const row = rows[0];
      return row ? toTrigger(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listRecent(
    guildId: GuildId,
    options: { readonly state?: ReferralState; readonly limit?: number } = {},
  ): Promise<readonly ReferralTrigger[]> {
    const limit = clamp(options.limit ?? DEFAULT_LIST_LIMIT, 1, MAX_LIST_LIMIT);
    try {
      /*
       * `id DESC` closes the ordering. created_at is the transaction
       * timestamp, so rows written together tie, and a tied ORDER BY lets the
       * plan choose — the staff list would reshuffle between refreshes.
       */
      const rows = options.state
        ? await this.db.sql<ReferralRow[]>`
            SELECT ${this.db.sql.unsafe(COLUMNS)}
            FROM ${this.db.sql(this.schema)}.referral_triggers
            WHERE guild_id = ${guildId} AND state = ${options.state}
            ORDER BY created_at DESC, id DESC
            LIMIT ${limit}
          `
        : await this.db.sql<ReferralRow[]>`
            SELECT ${this.db.sql.unsafe(COLUMNS)}
            FROM ${this.db.sql(this.schema)}.referral_triggers
            WHERE guild_id = ${guildId}
            ORDER BY created_at DESC, id DESC
            LIMIT ${limit}
          `;
      return rows.map(toTrigger);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countPaidForInviter(
    guildId: GuildId,
    inviterUserId: UserId,
  ): Promise<number> {
    try {
      const rows = await this.db.sql<{ count: string }[]>`
        SELECT count(*)::text AS count
        FROM ${this.db.sql(this.schema)}.referral_triggers
        WHERE guild_id = ${guildId}
          AND inviter_user_id = ${inviterUserId}
          AND state = 'paid'
      `;
      return Number(rows[0]?.count ?? '0');
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
