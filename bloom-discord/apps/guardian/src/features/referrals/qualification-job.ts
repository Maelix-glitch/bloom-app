import { REFERRAL_QUALIFICATION } from '@bloom/shared-types';
import type { ScheduledJob } from '@bloom/events';
import type { GuardianDeps } from '../../deps.js';

/**
 * The referral qualification pass.
 *
 * Hourly rather than per-member, because a reward that is due in seven days
 * cannot be held in a timer: the process will be restarted several times
 * before then, and a `setTimeout` does not survive a deploy. A schedule plus
 * a durable row does.
 *
 * Hourly rather than daily, too — the delay a member experiences between
 * earning and being paid should be measured against how long they will
 * remember inviting someone. An hour is invisible; a day feels broken.
 *
 * The job is deliberately cheap when there is nothing to do: the pending scan
 * is a partial-index lookup bounded to a batch, and a guild with no pending
 * referrals costs one query.
 */
export function createReferralQualificationJob(deps: GuardianDeps): ScheduledJob {
  const guildId = deps.config.discord.guildId;

  return {
    key: 'guardian.referrals.qualify',
    description: `Promotes referrals to qualified once the invited member has stayed ${String(REFERRAL_QUALIFICATION.minMembershipDays)} days. Companion pays them.`,
    schedule: '7 * * * *',
    /*
     * Seven minutes past the hour, not on the hour.
     *
     * Everything else in the platform runs at :00, and three jobs waking
     * together on one connection pool is a self-inflicted spike. The offset
     * costs nothing and the thundering herd is a real failure mode.
     */
    enabled: true,
    /*
     * Ninety seconds. The pass is a bounded scan plus at most one Discord
     * member lookup per pending referral, so a full batch of fifty is well
     * inside this even on a slow API day.
     */
    leaseSeconds: 90,
    guildId,

    async run(context) {
      const summary = await deps.referrals.runQualificationPass(guildId);

      context.logger.info(
        'referrals.qualification_pass',
        `Qualified ${String(summary.qualified)}, rejected ${String(summary.rejected)}, still waiting ${String(summary.waiting)}.`,
        { context: { ...summary } },
      );

      /*
       * Nothing is posted anywhere. This job moves rows between states and
       * the member-facing message comes from Companion when it pays — a
       * Guardian announcement here would either duplicate that or announce a
       * reward that has not actually been granted yet.
       */
    },
  };
}
