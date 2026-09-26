import {
  bloomError,
  canTransition,
  ONBOARDING_TRANSITIONS,
  type CorrelationId,
  type GuildId,
  type OnboardingState,
  type OnboardingTrigger,
  type UserId,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

export interface OnboardingTransitionInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  /**
   * The state the caller believes the member is in.
   *
   * This is the concurrency control. The UPDATE only matches a row still in
   * this state, so two simultaneous transitions cannot both succeed — the
   * second one matches nothing and is reported as a no-op rather than
   * overwriting the first.
   */
  readonly expectedFrom: OnboardingState;
  readonly to: OnboardingState;
  readonly trigger: OnboardingTrigger;
  readonly actorId?: UserId | null;
  readonly reason?: string | null;
  readonly source?: string | null;
  readonly correlationId?: CorrelationId | null;
}

export type TransitionOutcome =
  /** The state changed and a history row was written. */
  | {
      readonly kind: 'applied';
      readonly from: OnboardingState;
      readonly to: OnboardingState;
    }
  /** The member was already in the target state. Nothing was written. */
  | { readonly kind: 'already_in_state'; readonly state: OnboardingState }
  /** Someone else moved them first, or the caller's view was stale. */
  | {
      readonly kind: 'conflict';
      readonly actual: OnboardingState;
      readonly expected: OnboardingState;
    }
  /** No membership row exists. */
  | { readonly kind: 'member_missing' };

export interface OnboardingTransitionRow {
  readonly id: string;
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly fromState: OnboardingState | null;
  readonly toState: OnboardingState;
  readonly trigger: OnboardingTrigger;
  readonly actorId: UserId | null;
  readonly reason: string | null;
  readonly source: string | null;
  readonly createdAt: Date;
}

export interface VerificationAttemptInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  /** `granted`, or the error code that refused it. */
  readonly outcome: string;
  readonly correlationId?: CorrelationId | null;
}

export interface OnboardingRepository {
  /**
   * Move a member through the lifecycle.
   *
   * The only write path for `guild_members.onboarding_state` in the entire
   * platform. Everything that changes a member's lifecycle state goes through
   * here, which is what makes "Guardian owns role transitions" checkable rather
   * than a comment.
   */
  transition(
    input: OnboardingTransitionInput,
    tx?: TransactionSql,
  ): Promise<TransitionOutcome>;

  listTransitions(
    guildId: GuildId,
    userId: UserId,
    limit?: number,
  ): Promise<readonly OnboardingTransitionRow[]>;

  recordVerificationAttempt(
    input: VerificationAttemptInput,
    tx?: TransactionSql,
  ): Promise<void>;

  /** How many attempts this member made in the last N seconds. Abuse signal. */
  countRecentAttempts(
    guildId: GuildId,
    userId: UserId,
    withinSeconds: number,
  ): Promise<number>;

  /** Population counts per state, for `/guardian status` and health. */
  countByState(guildId: GuildId): Promise<Readonly<Record<OnboardingState, number>>>;
}

/**
 * The onboarding lifecycle, in the database.
 *
 * Phase 0 deliberately shipped no way to write `onboarding_state`, with a note
 * saying the transition belonged to Guardian and would arrive as a dedicated,
 * audited operation. This is that operation.
 *
 * Three properties it guarantees:
 *
 *   1. **Legality.** An illegal transition throws before touching the database.
 *      The transition table lives in `@bloom/shared-types` and is the same one
 *      the service layer and the tests read.
 *   2. **Atomicity.** The state change and its history row are written in one
 *      transaction. A history that can disagree with the current state is worse
 *      than no history.
 *   3. **Concurrency safety.** The UPDATE is conditional on the expected
 *      current state, so a replayed interaction or a second moderator clicking
 *      at the same moment loses cleanly instead of double-applying.
 */
export class PostgresOnboardingRepository
  extends BaseRepository
  implements OnboardingRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async transition(
    input: OnboardingTransitionInput,
    tx?: TransactionSql,
  ): Promise<TransitionOutcome> {
    /*
     * Legality is checked here, not only in the service, because this is the
     * narrowest point every caller passes through. A service that forgets the
     * check still cannot write an illegal transition.
     */
    if (!canTransition(input.expectedFrom, input.to)) {
      throw bloomError('INVALID_INPUT', {
        operatorHint:
          `"${input.expectedFrom}" cannot transition to "${input.to}". ` +
          `Legal targets from "${input.expectedFrom}": ${ONBOARDING_TRANSITIONS[input.expectedFrom].join(', ') || 'none'}. ` +
          'The transition table is ONBOARDING_TRANSITIONS in @bloom/shared-types.',
        details: { from: input.expectedFrom, to: input.to },
      });
    }

    const apply = async (conn: TransactionSql): Promise<TransitionOutcome> => {
      /*
       * Lock the membership row first.
       *
       * Without this, two concurrent transitions both read `early_bloom`, both
       * pass the legality check, and the second one's conditional UPDATE still
       * matches because the first has not committed. FOR UPDATE serialises them
       * so the loser sees the winner's state and reports a conflict.
       */
      const current = await conn<{ onboarding_state: OnboardingState }[]>`
        SELECT onboarding_state
        FROM ${conn(this.schema)}.guild_members
        WHERE guild_id = ${input.guildId} AND user_id = ${input.userId}
        FOR UPDATE
      `;

      const row = current[0];
      if (!row) return { kind: 'member_missing' };

      if (row.onboarding_state === input.to) {
        return { kind: 'already_in_state', state: input.to };
      }

      if (row.onboarding_state !== input.expectedFrom) {
        return {
          kind: 'conflict',
          actual: row.onboarding_state,
          expected: input.expectedFrom,
        };
      }

      /*
       * The timestamp columns carry CHECK constraints in migration 0002: a
       * verified member must have `verified_at`, a bloom_member must have
       * `onboarding_completed_at`. They are set here rather than by the caller
       * so the constraint can never be tripped by a forgetful service.
       *
       * COALESCE preserves the original timestamps across a re-verification —
       * when someone was first verified is a fact, and moving back through
       * onboarding does not change it.
       */
      const setsVerifiedAt = input.to === 'early_bloom' || input.to === 'bloom_member';
      const setsCompletedAt = input.to === 'bloom_member';

      await conn`
        UPDATE ${conn(this.schema)}.guild_members
        SET onboarding_state = ${input.to},
            verified_at = ${
              setsVerifiedAt ? conn`COALESCE(verified_at, now())` : conn`verified_at`
            },
            onboarding_completed_at = ${
              setsCompletedAt
                ? conn`COALESCE(onboarding_completed_at, now())`
                : conn`onboarding_completed_at`
            }
        WHERE guild_id = ${input.guildId}
          AND user_id = ${input.userId}
          AND onboarding_state = ${input.expectedFrom}
      `;

      await conn`
        INSERT INTO ${conn(this.schema)}.onboarding_transitions
          (guild_id, user_id, from_state, to_state, trigger, actor_id, reason, source, correlation_id)
        VALUES (
          ${input.guildId}, ${input.userId}, ${input.expectedFrom}, ${input.to},
          ${input.trigger}, ${input.actorId ?? null}, ${input.reason ?? null},
          ${input.source ?? null}, ${input.correlationId ?? null}
        )
      `;

      return { kind: 'applied', from: input.expectedFrom, to: input.to };
    };

    try {
      return tx ? await apply(tx) : await this.db.transaction(apply);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listTransitions(
    guildId: GuildId,
    userId: UserId,
    limit = 25,
  ): Promise<readonly OnboardingTransitionRow[]> {
    const sql = this.conn();
    try {
      const rows = await sql<RawTransitionRow[]>`
        SELECT id, guild_id, user_id, from_state, to_state, trigger,
               actor_id, reason, source, created_at
        FROM ${sql(this.schema)}.onboarding_transitions
        WHERE guild_id = ${guildId} AND user_id = ${userId}
        ORDER BY created_at DESC, id DESC
        LIMIT ${Math.min(Math.max(limit, 1), 100)}
      `;
      return rows.map(mapTransition);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async recordVerificationAttempt(
    input: VerificationAttemptInput,
    tx?: TransactionSql,
  ): Promise<void> {
    const sql = this.conn(tx);
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.verification_attempts
          (guild_id, user_id, outcome, correlation_id)
        VALUES (${input.guildId}, ${input.userId}, ${input.outcome}, ${input.correlationId ?? null})
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countRecentAttempts(
    guildId: GuildId,
    userId: UserId,
    withinSeconds: number,
  ): Promise<number> {
    const sql = this.conn();
    try {
      const rows = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count
        FROM ${sql(this.schema)}.verification_attempts
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND created_at > now() - make_interval(secs => ${withinSeconds})
      `;
      return rows[0]?.count ?? 0;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countByState(
    guildId: GuildId,
  ): Promise<Readonly<Record<OnboardingState, number>>> {
    const sql = this.conn();
    try {
      const rows = await sql<{ onboarding_state: OnboardingState; count: number }[]>`
        SELECT onboarding_state, count(*)::int AS count
        FROM ${sql(this.schema)}.guild_members
        WHERE guild_id = ${guildId} AND left_at IS NULL
        GROUP BY onboarding_state
      `;

      // Every state present, including the zeroes. A missing key in a status
      // report reads as "no data" rather than "none", which is a different fact.
      const counts: Record<OnboardingState, number> = {
        unverified: 0,
        early_bloom: 0,
        bloom_member: 0,
        revoked: 0,
      };
      for (const row of rows) counts[row.onboarding_state] = row.count;
      return counts;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}

interface RawTransitionRow {
  id: string;
  guild_id: string;
  user_id: string;
  from_state: OnboardingState | null;
  to_state: OnboardingState;
  trigger: OnboardingTrigger;
  actor_id: string | null;
  reason: string | null;
  source: string | null;
  created_at: Date;
}

function mapTransition(row: RawTransitionRow): OnboardingTransitionRow {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    userId: row.user_id as UserId,
    fromState: row.from_state,
    toState: row.to_state,
    trigger: row.trigger,
    actorId: row.actor_id as UserId | null,
    reason: row.reason,
    source: row.source,
    createdAt: row.created_at,
  };
}
