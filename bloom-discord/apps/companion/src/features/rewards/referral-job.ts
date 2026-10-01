import type { ScheduledJob } from '@bloom/events';
import type { CompanionDeps } from '../../deps.js';

/**
 * The referral payment pass.
 *
 * Runs every ten minutes. Guardian decides a referral has qualified; this is
 * what turns that decision into points, and the gap between the two is the
 * only latency a member experiences.
 *
 * Ten minutes rather than hourly because the work is already done by the time
 * a row is claimable — this job only pays — and rather than every minute
 * because a job that wakes 1,440 times a day to find nothing is a cost with
 * no corresponding benefit.
 *
 * Safe to run concurrently with itself. If a pass overruns its lease and a
 * second starts, the claim is transactional and the payment is idempotent, so
 * the worst case is one worker finding an empty batch.
 */
export function createReferralPaymentJob(deps: CompanionDeps): ScheduledJob {
  const guildId = deps.config.discord.guildId;

  return {
    key: 'companion.referrals.pay',
    description:
      'Pays qualified referrals into the inviter’s balance, exactly once each.',
    schedule: '*/10 * * * *',
    enabled: true,
    /*
     * Two minutes. A batch is twenty-five payments, each a single award and
     * one DM that is allowed to fail; the lease is renewed at half this
     * interval while the job runs, so an occasional slow DM does not hand the
     * batch to another process.
     */
    leaseSeconds: 120,
    guildId,

    async run(context) {
      const summary = await deps.referralConsumer.consume(guildId);

      if (summary.claimed === 0) return;

      context.logger.info(
        'referrals.payment_pass',
        `Paid ${String(summary.paid)} referral(s); ${String(summary.alreadyPaid)} were already settled, ${String(summary.failed)} failed and will be retried.`,
        { context: { ...summary } },
      );
    },
  };
}
