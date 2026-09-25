import type { GuildId } from '@bloom/shared-types';
import type { ScheduledJob, JobRunContext } from '@bloom/events';
import type { CompanionDeps } from '../../deps.js';
import { dailyCheckInPrompt } from './messages.js';

/**
 * The daily check-in prompt.
 *
 * Companion's first scheduled surface, and the platform's first job that posts
 * somewhere the whole community can see. That changes what the safeguards are
 * for: Guardian's stale-case digest going out twice would mildly annoy four
 * moderators, whereas this going out twice is a visible mistake in a public
 * channel, and this firing while an administrator believed it was off is a
 * breach of their expectations rather than a nuisance.
 *
 * So everything here is the same machinery as the digest, but the reasons are
 * sharper.
 */

/**
 * One prompt per 20 hours, claimed in the database.
 *
 * Not 24: a 24-hour window drifts. If today's run lands a minute late it pushes
 * the claim past tomorrow's scheduled minute, and the prompt silently skips a
 * day. Twenty hours is comfortably longer than the gap any duplicate could
 * appear in, and comfortably shorter than the gap to the next real run.
 */
const PROMPT_COOLDOWN_SECONDS = 20 * 60 * 60;

export function createDailyCheckInJob(deps: CompanionDeps): ScheduledJob {
  const guildId = deps.config.discord.guildId;
  const channelId = deps.config.channels.dailyCheckIn;

  return {
    key: 'companion.checkin.daily_prompt',
    description: 'Posts the daily check-in prompt to the check-in channel.',
    // 09:00 in BLOOM_TIMEZONE. A named zone rather than an offset, so this stays
    // at 09:00 through daylight saving instead of drifting by an hour twice a
    // year — which members would read as the bot being unreliable.
    schedule: '0 9 * * *',
    /*
     * Disabled when the channel is unset, rather than failing daily against a
     * channel that does not exist. `/companion jobs list` reports it as
     * "disabled by configuration", which is the actionable message.
     */
    enabled: channelId !== null,
    // One message. 60s is generous for that; it is sized for a database under
    // load, not for the happy path.
    leaseSeconds: 60,
    guildId,
    run: (context) => post(deps, context, guildId),
  };
}

async function post(
  deps: CompanionDeps,
  context: JobRunContext,
  guildId: GuildId,
): Promise<void> {
  const channelId = deps.config.channels.dailyCheckIn;
  if (!channelId) return;

  /*
   * Claim the day before posting, not after.
   *
   * `tryAcquire` is an atomic insert against a unique key. Claiming afterwards
   * would leave a window in which two runs have both already posted, and in a
   * public channel that is a visible duplicate rather than a log curiosity.
   */
  const claim = await deps.repositories.cooldowns.tryAcquire(
    guildId,
    'job.prompt',
    context.jobKey,
    PROMPT_COOLDOWN_SECONDS,
  );

  if (!claim.allowed) {
    context.logger.info(
      'jobs.checkin.suppressed',
      'A check-in prompt was already posted within the cooldown window; skipping.',
    );
    return;
  }

  const messageId = await deps.messaging.sendToChannel(
    guildId,
    channelId,
    dailyCheckInPrompt(context.scheduledFor),
  );

  /*
   * Audited with no actor.
   *
   * Nobody did this, so attributing it to a person would make the audit log lie
   * in the place it gets consulted. The run id ties the row back to `job_runs`.
   */
  await deps.repositories.audit.append({
    guildId,
    botName: 'companion',
    event: 'jobs.checkin_prompt_posted',
    severity: 'info',
    actorId: null,
    channelId,
    source: context.jobKey,
    details: { run_id: context.runId, message_id: messageId },
  });

  context.logger.info('jobs.checkin.posted', 'Posted the daily check-in prompt.');
}
