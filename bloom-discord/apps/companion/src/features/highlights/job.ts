import type { GuildId } from '@bloom/shared-types';
import type { JobRunContext, ScheduledJob } from '@bloom/events';
import type { CompanionDeps } from '../../deps.js';
import { recapMessage } from './messages.js';

/**
 * The weekly community recap.
 *
 * Companion's second public scheduled post, and the one with the most ways to
 * go wrong: it runs rarely, so a bug has a week to sit unnoticed; it reads
 * across four repositories, so it has four ways to be slow; and it posts
 * where everyone can see, so a duplicate is a visible mistake rather than a
 * log line.
 *
 * Everything below is the same machinery the daily check-in prompt uses. What
 * differs is the window: the prompt says the same thing every day and so
 * needs no notion of a period, while a recap that got its window wrong would
 * publish a confident, wrong summary — which is worse than publishing
 * nothing.
 *
 * ## Why no queue, and no automatic retry
 *
 * A failed recap is not retried. If the post fails, the week's claim is
 * released and the next scheduled run covers the following week; the missed
 * week is simply not published. That is the honest behaviour for a digest —
 * a recap of a week that ended nine days ago, arriving unannounced, is
 * noise. Operators who want it can run the job by hand with
 * `/companion jobs run`, which is the deliberate, explicit path.
 */

/**
 * Monday morning, in BLOOM_TIMEZONE.
 *
 * A named zone rather than an offset, so this stays at 10:00 through daylight
 * saving instead of drifting an hour twice a year. Monday rather than Sunday
 * because the recap is about the week that finished, and a Sunday-morning
 * post would be summarising a week with a day left in it.
 */
const RECAP_SCHEDULE = '0 10 * * 1';

/**
 * Six days, not seven.
 *
 * The same reasoning as the daily prompt's twenty hours. A seven-day claim
 * drifts: if this week's run lands a minute late, the claim stretches past
 * next Monday's scheduled minute and the recap silently skips a week. Six
 * days is comfortably longer than any window a duplicate could appear in and
 * comfortably shorter than the gap to the next real run.
 */
const RECAP_COOLDOWN_SECONDS = 6 * 24 * 60 * 60;

const RECAP_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Four repository reads and one post. Sized for a loaded database. */
const RECAP_LEASE_SECONDS = 120;

export function createWeeklyRecapJob(deps: CompanionDeps): ScheduledJob {
  const guildId = deps.config.discord.guildId;

  return {
    key: 'companion.community.weekly_recap',
    description: 'Posts the weekly community recap to the challenges channel.',
    schedule: RECAP_SCHEDULE,
    /*
     * Disabled when the channel is unset, rather than failing weekly against
     * a channel that does not exist. `/companion jobs list` then reports it
     * as disabled by configuration, which is the actionable message — and
     * nothing else in the community systems notices, which is the point of
     * degrading here rather than throwing.
     */
    enabled: deps.config.channels.challenges !== null,
    leaseSeconds: RECAP_LEASE_SECONDS,
    guildId,
    run: (context) => post(deps, context, guildId),
  };
}

async function post(
  deps: CompanionDeps,
  context: JobRunContext,
  guildId: GuildId,
): Promise<void> {
  const channelId = deps.config.channels.challenges;
  if (!channelId) {
    /*
     * Reachable even though `enabled` checks the same thing: configuration is
     * read at boot, and an operator can run this by hand. A missing channel
     * is a no-op with a log line, never a failed run — a community recap is
     * not important enough to make a job look broken over.
     */
    context.logger.info(
      'jobs.recap.no_channel',
      'No challenges channel is configured; skipping the weekly recap.',
    );
    return;
  }

  /*
   * Claim the week before reading or posting.
   *
   * `tryAcquire` is an atomic insert against a unique key, so two workers
   * reaching this line together produce exactly one claim. Claiming after the
   * post would leave a window in which both have already published, and in a
   * public channel that is two recaps of the same week.
   */
  const claim = await deps.repositories.cooldowns.tryAcquire(
    guildId,
    'job.recap',
    context.jobKey,
    RECAP_COOLDOWN_SECONDS,
  );

  if (!claim.allowed) {
    context.logger.info(
      'jobs.recap.suppressed',
      'A recap was already posted within the cooldown window; skipping.',
    );
    return;
  }

  /*
   * The window comes from the run's scheduled instant, never from the clock.
   *
   * A run that starts four minutes late, or that an operator triggers by hand
   * on Tuesday, must still describe the same seven days it would have
   * described on time. Deriving the window from `now` would make the recap's
   * content depend on when the process happened to get round to it, and two
   * workers a second apart would produce two different summaries.
   *
   * Half-open, like every other window in the platform: `to` is the scheduled
   * instant itself, so a point event at exactly that moment belongs to next
   * week rather than to both.
   */
  const to = context.scheduledFor;
  const from = new Date(to.getTime() - RECAP_WINDOW_DAYS * MS_PER_DAY);

  const summary = await deps.highlights.recap({ guildId, from, to });

  const messageId = await deps.messaging.sendToChannel(
    guildId,
    channelId,
    recapMessage(summary),
  );

  /*
   * Audited with no actor: nobody did this. The run id ties the row back to
   * `job_runs`, and the counts are the same ones that were published — which
   * is what lets an operator answer "what did last week's recap say" without
   * scrolling the channel.
   */
  await deps.repositories.audit.append({
    guildId,
    botName: 'companion',
    event: 'jobs.community_recap_posted',
    severity: 'info',
    actorId: null,
    channelId,
    source: context.jobKey,
    details: {
      run_id: context.runId,
      message_id: messageId,
      from: from.toISOString(),
      to: to.toISOString(),
      members: summary.participatingMembers,
      points: summary.pointsAwarded,
      referrals: summary.referrals,
      challenge_completions: summary.challengeCompletions,
      event_completions: summary.eventCompletions,
      awards: summary.awards.length,
      quiet: summary.quiet,
    },
  });

  context.logger.info('jobs.recap.posted', 'Posted the weekly community recap.');
}
