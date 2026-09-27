import type { GuildId } from '@bloom/shared-types';
import type { CaseRow } from '@bloom/database';
import type { ScheduledJob, JobRunContext } from '@bloom/events';
import { staffEmbed } from '@bloom/embeds';
import { pluralise } from '@bloom/utils';
import type { GuardianDeps } from '../../deps.js';

/**
 * How long a case may sit untouched before it is called stale.
 *
 * Three days rather than one: staff are volunteers, a case opened on Friday
 * evening should not be nagged about on Saturday morning, and a digest that
 * fires while the work is still reasonably in progress teaches people to ignore
 * it. The value that matters is the one people still read after a month.
 */
const STALE_AFTER_DAYS = 3;

/** Statuses that represent unfinished work. RESOLVED and CLOSED are done. */
const UNFINISHED: readonly CaseRow['status'][] = ['OPEN', 'IN_REVIEW', 'ESCALATED'];

/**
 * At most one digest per day, enforced in the database rather than by the cron
 * expression.
 *
 * The schedule says 09:00, but `runNow` exists, leases can be reclaimed after a
 * crash, and a redeployment at 08:59 can produce a second 09:00. A 20-hour
 * cooldown means every one of those paths results in exactly one post, which is
 * the duplicate prevention the brief asks for — the cron expression alone is
 * not a guarantee of anything.
 */
const DIGEST_COOLDOWN_SECONDS = 20 * 60 * 60;

const MAX_LISTED = 10;

export interface StaleCaseSweepOptions {
  /** Overridable so tests do not have to wait three days. */
  readonly staleAfterDays?: number;
}

/**
 * The daily stale-case digest.
 *
 * Posts to the private moderation channel when cases have gone untouched, and —
 * importantly — posts nothing at all when they have not. A digest that arrives
 * every morning saying "0 stale cases" is training people to skim past the
 * mornings when the number is not zero.
 */
export function createStaleCaseSweepJob(
  deps: GuardianDeps,
  options: StaleCaseSweepOptions = {},
): ScheduledJob {
  const staleAfterDays = options.staleAfterDays ?? STALE_AFTER_DAYS;
  const guildId = deps.config.discord.guildId;
  const channelId = deps.config.channels.moderation;

  return {
    key: 'guardian.cases.stale_sweep',
    description: `Posts a digest of cases untouched for ${String(staleAfterDays)}+ days to the moderation channel.`,
    schedule: '0 9 * * *',
    /*
     * Disabled when the moderation channel is not configured.
     *
     * The alternative is a job that fails every morning against a channel that
     * does not exist, filling `job_runs` with identical failures. A job that
     * cannot reach its destination is misconfiguration, not an incident, and it
     * says so at registration instead of once a day forever.
     */
    enabled: channelId !== null,
    /*
     * 120s. The work is two queries and one message, so a normal run is well
     * under a second; the lease is sized for a database under load, not for the
     * happy path. The scheduler renews at half this, so a genuinely slow run
     * keeps its claim rather than being handed to a second process.
     */
    leaseSeconds: 120,
    guildId,
    run: (context) => sweep(deps, context, guildId, staleAfterDays),
  };
}

async function sweep(
  deps: GuardianDeps,
  context: JobRunContext,
  guildId: GuildId,
  staleAfterDays: number,
): Promise<void> {
  const channelId = deps.config.channels.moderation;
  if (!channelId) return;

  const cutoff = new Date(context.scheduledFor.getTime() - staleAfterDays * 86_400_000);

  const byStatus = await Promise.all(
    UNFINISHED.map((status) =>
      deps.repositories.cases.list(guildId, { status, limit: 100 }),
    ),
  );

  const stale = byStatus
    .flat()
    .filter((row) => row.updatedAt < cutoff)
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

  if (stale.length === 0) {
    context.logger.info('jobs.stale_sweep.clear', 'No stale cases; nothing posted.');
    return;
  }

  /*
   * Claim the day's slot before posting, not after.
   *
   * `tryAcquire` is an atomic insert against a unique key, so if two runners
   * somehow both reach this line only one proceeds. Claiming afterwards would
   * leave a window where both have already posted.
   */
  const claim = await deps.repositories.cooldowns.tryAcquire(
    guildId,
    'job.digest',
    context.jobKey,
    DIGEST_COOLDOWN_SECONDS,
  );

  if (!claim.allowed) {
    context.logger.info(
      'jobs.stale_sweep.suppressed',
      'A digest was already posted within the cooldown window; skipping this run.',
      { context: { stale_count: stale.length } },
    );
    return;
  }

  const listed = stale.slice(0, MAX_LISTED);
  const overflow = stale.length - listed.length;

  const messageId = await deps.messaging.sendToChannel(guildId, channelId, {
    embeds: [
      staffEmbed({
        title: `${pluralise(stale.length, 'case')} awaiting attention`,
        description:
          `These have had no activity for ${String(staleAfterDays)} days or more, oldest first. ` +
          `Use \`/guardian case view\` for the detail, or \`/guardian case status\` to move one on.`,
        fields: listed.map((row) => ({
          name: `Case #${String(row.caseNumber)} · ${row.status}`,
          value: summarise(row, context.scheduledFor),
        })),
        ...(overflow > 0
          ? {
              footer: `${String(overflow)} more not shown. \`/guardian case list\` has the rest.`,
            }
          : {}),
        timestamp: context.scheduledFor,
      }),
    ],
  });

  /*
   * Audited as an automated action with no actor.
   *
   * `actorId` stays null because nobody did this — attributing scheduled work
   * to a staff member would make the audit log lie in exactly the place it is
   * consulted. The run id ties the row back to `job_runs`.
   */
  await deps.repositories.audit.append({
    guildId,
    botName: 'guardian',
    event: 'jobs.stale_cases_reported',
    severity: 'info',
    actorId: null,
    channelId,
    source: context.jobKey,
    details: {
      run_id: context.runId,
      message_id: messageId,
      stale_count: stale.length,
      listed: listed.length,
      stale_after_days: staleAfterDays,
      oldest_case: listed[0]?.caseNumber ?? null,
    },
  });

  context.logger.info(
    'jobs.stale_sweep.posted',
    `Reported ${pluralise(stale.length, 'stale case')}.`,
    { context: { stale_count: stale.length, listed: listed.length } },
  );
}

function summarise(row: CaseRow, now: Date): string {
  const days = Math.floor((now.getTime() - row.updatedAt.getTime()) / 86_400_000);
  const assigned = row.assignedTo ? `assigned to <@${row.assignedTo}>` : 'unassigned';
  // The summary is staff-authored free text and this is a private staff
  // channel, but it is still truncated: ten long summaries would push the embed
  // past Discord's limits and the whole digest would fail to send.
  const summary = row.summary.length > 80 ? `${row.summary.slice(0, 79)}…` : row.summary;
  return `${summary}\nIdle ${pluralise(days, 'day')} · ${assigned}`;
}
