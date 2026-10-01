import { REFERRAL_POINTS, type GuildId } from '@bloom/shared-types';
import type { ClaimedReferral, CompanionRepositories } from '@bloom/database';
import type { MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import type { RewardsService } from './service.js';
import * as copy from './messages.js';

/**
 * Companion's half of the referral feature: claim qualified triggers and pay
 * them, exactly once.
 *
 * "Exactly once" is assembled from three independent guards, deliberately,
 * because each one covers a failure the others do not:
 *
 *   1. `claim` takes rows with FOR UPDATE SKIP LOCKED, so two workers running
 *      at the same instant receive disjoint sets and never consider the same
 *      referral.
 *   2. The payment's idempotency key is the trigger's identity, so even if a
 *      row were somehow claimed twice, the second award collapses onto the
 *      first ledger row rather than creating a second.
 *   3. `markPaid` requires the row to still be `qualified`, so a late writer
 *      cannot stamp a second payment over a finished one.
 *
 * Guard 1 is the fast path, guard 2 is the correctness guarantee, and guard 3
 * is what makes a crash between the two safe. Removing any one of them leaves
 * a window; a test exists for each.
 */

export interface ReferralConsumerOptions {
  readonly repositories: Pick<CompanionRepositories, 'referrals'>;
  readonly rewards: RewardsService;
  readonly messaging: MessagingService;
  readonly logger: Logger;
  readonly now: () => Date;
  /** Identifies this worker in a claim, for diagnosing a stuck row. */
  readonly workerId: string;
}

/** How many referrals one pass will pay. Bounded like every other scan. */
const BATCH_SIZE = 25;

/**
 * How long a claim may be held before another worker may take it.
 *
 * Five minutes is far longer than a payment takes and far shorter than a
 * human will notice. The window exists for one case: a worker that dies
 * between claiming and paying, leaving a row nobody will ever release.
 * Re-offering it is safe because the payment is idempotent — if the dead
 * worker actually succeeded, the retry finds the duplicate and settles the
 * row rather than paying twice.
 */
const STALE_CLAIM_MS = 5 * 60 * 1000;

export interface ConsumeSummary {
  readonly claimed: number;
  readonly paid: number;
  /** Already had a ledger row; the trigger was settled without a new one. */
  readonly alreadyPaid: number;
  readonly failed: number;
}

export class ReferralConsumer {
  public constructor(private readonly options: ReferralConsumerOptions) {}

  public async consume(guildId: GuildId): Promise<ConsumeSummary> {
    const now = this.options.now();

    const claimed = await this.options.repositories.referrals.claim({
      guildId,
      workerId: this.options.workerId,
      limit: BATCH_SIZE,
      now,
      staleClaimsBefore: new Date(now.getTime() - STALE_CLAIM_MS),
    });

    let paid = 0;
    let alreadyPaid = 0;
    let failed = 0;

    for (const trigger of claimed) {
      const outcome = await this.pay(trigger, now);

      if (outcome === 'paid') paid += 1;
      else if (outcome === 'already_paid') alreadyPaid += 1;
      else failed += 1;
    }

    return { claimed: claimed.length, paid, alreadyPaid, failed };
  }

  private async pay(
    trigger: ClaimedReferral,
    now: Date,
  ): Promise<'paid' | 'already_paid' | 'failed'> {
    try {
      const result = await this.options.rewards.awardReferral({
        guildId: trigger.guildId,
        inviterUserId: trigger.inviterUserId,
        referredUserId: trigger.referredUserId,
        referralId: trigger.id,
        idempotencyKey: trigger.idempotencyKey,
        correlationId: trigger.correlationId,
      });

      if (result.kind === 'failed') {
        await this.options.repositories.referrals.releaseClaim(trigger.id);
        this.options.logger.error(
          'referrals.payment_refused',
          'The rewards service refused a referral payment. The trigger was released and will be retried.',
          { context: { referral_id: trigger.id, reason: result.reason } },
        );
        return 'failed';
      }

      /*
       * Settle the trigger only after the ledger row exists.
       *
       * This ordering is the one that survives a crash. If the process dies
       * between the award and this write, the row stays `qualified`, gets
       * re-offered after the stale window, and the retry's award finds the
       * duplicate — one ledger row, one eventual settlement. The opposite
       * order would mark it paid and then lose the payment.
       */
      const settled = await this.options.repositories.referrals.markPaid({
        id: trigger.id,
        pointEventId: result.pointEventId,
        consumedAt: now,
      });

      if (!settled) {
        // Another worker settled it first. The idempotent award means no
        // second payment happened; nothing to undo.
        this.options.logger.info(
          'referrals.already_settled',
          'A referral was settled by another worker between claiming and marking it paid.',
          { context: { referral_id: trigger.id } },
        );
        return 'already_paid';
      }

      if (result.alreadyPaid) return 'already_paid';

      await this.notifyInviter(trigger);
      return 'paid';
    } catch (error) {
      /*
       * Any failure releases the claim rather than swallowing the row.
       *
       * A referral that cannot be paid right now is a referral to pay later —
       * the member earned it, and a transient database error must not quietly
       * cost them the reward.
       */
      await this.releaseQuietly(trigger.id);
      this.options.logger.error(
        'referrals.payment_failed',
        'A referral payment failed and the trigger was released for retry.',
        { error, context: { referral_id: trigger.id } },
      );
      return 'failed';
    }
  }

  /**
   * Tell the inviter, by direct message.
   *
   * Not a channel post. A referral reward is between the platform and the
   * person who earned it; announcing each one would turn the server into a
   * scoreboard and would also publish who invited whom, which is nobody
   * else's business. A closed DM is not a failure and must not fail the
   * payment — the points are already in the ledger either way.
   */
  private async notifyInviter(trigger: ClaimedReferral): Promise<void> {
    try {
      await this.options.messaging.sendDirectMessage(
        trigger.inviterUserId,
        copy.referralPaid(REFERRAL_POINTS),
      );
    } catch (error) {
      this.options.logger.info(
        'referrals.notice_undeliverable',
        'Could not DM an inviter about their referral reward. The points were still awarded.',
        { error, context: { referral_id: trigger.id } },
      );
    }
  }

  private async releaseQuietly(id: string): Promise<void> {
    try {
      await this.options.repositories.referrals.releaseClaim(id);
    } catch (error) {
      // The claim will age out of the stale window on its own.
      this.options.logger.error(
        'referrals.release_failed',
        'Could not release a referral claim; it will be reclaimed once the claim goes stale.',
        { error, context: { referral_id: id } },
      );
    }
  }
}
