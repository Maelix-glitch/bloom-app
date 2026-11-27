import type { GuildId } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { ReferralService } from './service.js';

/**
 * Rebuilding the invite baseline when it might have gone stale.
 *
 * Called from exactly two places — process startup and gateway resume — and
 * it exists as its own function because those two want identical behaviour
 * and different words. Getting one of them subtly wrong is the kind of thing
 * that only shows up as "referrals stopped working after the deploy".
 */

export type BaselineReason = 'startup' | 'resume';

export interface BaselineRecoveryDeps {
  readonly referrals: Pick<ReferralService, 'primeInviteCache'>;
  readonly logger: Logger;
}

const MESSAGES: Readonly<Record<BaselineReason, { ok: string; failed: string }>> = {
  startup: {
    ok: 'Invite baseline ready; joins from here on can be attributed.',
    failed:
      'Starting without an invite baseline. Joins will be recorded as unattributed until a later read succeeds — check that Guardian has the Manage Server permission.',
  },
  resume: {
    ok: 'Rebuilt the invite baseline after the gateway resumed.',
    failed:
      'Could not rebuild the invite baseline after the gateway resumed. Joins will be recorded as unattributed until a later read succeeds.',
  },
};

/**
 * Returns whether a baseline is now in place.
 *
 * Never throws. Both callers are lifecycle hooks where an exception is either
 * swallowed into a generic "startup checks failed" line or, worse, surfaces
 * as an unhandled rejection on a reconnect. A missing baseline degrades
 * attribution; it must not degrade the bot.
 */
export async function recoverInviteBaseline(
  deps: BaselineRecoveryDeps,
  guildId: GuildId,
  reason: BaselineReason,
): Promise<boolean> {
  const copy = MESSAGES[reason];

  let primed: boolean;
  try {
    primed = await deps.referrals.primeInviteCache(guildId);
  } catch {
    /*
     * `primeInviteCache` already handles and logs its own failures, and
     * clears the cache when it cannot refresh it. This catch is for the
     * unexpected — and it deliberately does not log the caught value, which
     * has already been reported once with proper redaction. Logging it again
     * here would be a second, less careful copy of the same error.
     */
    primed = false;
  }

  deps.logger.log(
    primed ? 'info' : 'warn',
    primed ? 'referrals.invite_baseline_ready' : 'referrals.invite_baseline_missing',
    primed ? copy.ok : copy.failed,
    { context: { reason } },
  );

  return primed;
}
