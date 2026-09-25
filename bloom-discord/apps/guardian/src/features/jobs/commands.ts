import { bloomError } from '@bloom/shared-types';
import { requireAdministrator } from '@bloom/permissions';
import { staffEmbed, type BloomMessage } from '@bloom/embeds';
import { discordTimestamp, pluralise } from '@bloom/utils';
import type { JobStatus } from '@bloom/events';
import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { GuardianDeps } from '../../deps.js';

/**
 * `/guardian jobs …` — what is scheduled, and did it work.
 *
 * The brief requires every scheduled message to be inspectable and auditable.
 * Without a surface like this, a job that stopped firing three weeks ago is
 * indistinguishable from one that had nothing to say, and the only way to find
 * out is to read the logs of a process nobody has shell access to.
 *
 * Everything here reads from the live scheduler and the `job_runs` table. None
 * of it is cached or approximated: a "next run" that is actually a guess is the
 * kind of fake status the brief rules out.
 */

const OUTCOME_LABELS: Readonly<Record<NonNullable<JobStatus['lastOutcome']>, string>> = {
  success: 'succeeded',
  failed: 'FAILED',
  skipped: 'skipped (already running elsewhere)',
};

function listJobs(
  _invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const jobs = deps.scheduler.status();

  if (jobs.length === 0) {
    return Promise.resolve({
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: 'No scheduled jobs',
          description:
            'Guardian has no jobs registered in this build. This is a statement about the code, not about configuration.',
        }),
      ],
    });
  }

  const globallyOff = !deps.config.features.scheduledMessages;

  return Promise.resolve({
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: pluralise(jobs.length, 'scheduled job'),
        description: globallyOff
          ? '**FEATURE_SCHEDULED_MESSAGES is off.** Every job below is registered but will not fire until it is enabled.'
          : `Schedules are evaluated in **${deps.config.runtime.timezone}**.`,
        fields: jobs.map((job) => ({
          name: job.key,
          value: describe(job, globallyOff),
        })),
        footer: 'Times render in your own timezone.',
      }),
    ],
  });
}

function describe(job: JobStatus, globallyOff: boolean): string {
  const lines = [job.description, `Schedule: \`${job.schedule}\``];

  if (globallyOff) {
    lines.push('Status: disabled globally');
  } else if (!job.enabled) {
    // The static per-job switch, which in practice means a channel it needs is
    // not configured. Saying "disabled" without that distinction sends an admin
    // hunting through environment variables for a flag that does not exist.
    lines.push('Status: disabled for this job');
  } else if (job.running) {
    lines.push('Status: running now');
  } else {
    lines.push(
      job.nextRunAt
        ? `Next run: ${discordTimestamp(job.nextRunAt)}`
        : 'Next run: unknown',
    );
  }

  lines.push(
    job.lastRunAt && job.lastOutcome
      ? `Last run: ${discordTimestamp(job.lastRunAt)} — ${OUTCOME_LABELS[job.lastOutcome]}`
      : 'Last run: not since this process started',
  );

  return lines.join('\n');
}

async function jobHistory(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const key = requiredJobKey(invocation);
  const known = deps.scheduler.status().some((job) => job.key === key);
  if (!known) throw unknownJob(key, deps);

  /*
   * Read from `job_runs`, not from the scheduler.
   *
   * The scheduler only remembers this process's own lifetime, so after a deploy
   * it would report "never run" for a job that has run daily for a year. The
   * table is the durable record and survives restarts and replicas.
   */
  const last = await deps.repositories.jobs.lastRun(key, invocation.guildId ?? null);

  if (!last) {
    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: key,
          description:
            'No recorded run. Either this job has never fired, or it has never been enabled.',
        }),
      ],
    };
  }

  const fields = [
    { name: 'Status', value: last.status, inline: true },
    { name: 'Started', value: discordTimestamp(last.startedAt), inline: true },
    {
      name: 'Duration',
      value: last.durationMs === null ? 'still running' : `${String(last.durationMs)}ms`,
      inline: true,
    },
    { name: 'Runner', value: `\`${last.runnerId}\``, inline: true },
    { name: 'Attempt', value: String(last.attempt), inline: true },
  ];

  if (last.errorCode) {
    /*
     * The operator hint is shown here, and only here.
     *
     * This is a private staff channel behind an Administrator policy, and the
     * whole point of the command is diagnosis — the vague member-facing wording
     * would make it useless. It is still the stored hint, never a stack trace.
     */
    fields.push({
      name: 'Failure',
      value: `\`${last.errorCode}\`\n${last.errorMessage ?? 'No detail recorded.'}`,
      inline: false,
    });
  }

  return {
    ephemeral: true,
    embeds: [staffEmbed({ title: `${key} — last run`, fields })],
  };
}

async function runJobNow(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const key = requiredJobKey(invocation);
  const job = deps.scheduler.status().find((entry) => entry.key === key);
  if (!job) throw unknownJob(key, deps);

  if (job.running) {
    // Not an error: the operator asked for the job to run and it is running.
    // Queuing a second one behind it would defeat the lock that just protected
    // them from exactly this.
    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: `${key} is already running`,
          description: 'Nothing started. Check back with `/guardian jobs history`.',
        }),
      ],
    };
  }

  /*
   * Audited before the run, not after.
   *
   * A manual trigger is a privileged action and the audit row must exist even
   * if the job then crashes the process. The job writes its own outcome row;
   * this one records that a human asked.
   */
  await deps.repositories.audit.append({
    guildId: deps.config.discord.guildId,
    botName: 'guardian',
    event: 'jobs.manual_run',
    // 'warn', not 'info': a human making the bot act off-schedule is the kind
    // of thing that should stand out when scrolling an audit log, even though
    // nothing is wrong.
    severity: 'warn',
    actorId: invocation.actor.userId,
    source: 'guardian jobs run',
    details: { job_key: key },
  });

  /*
   * `runNow` bypasses the schedule but not the lock, so a manual trigger cannot
   * produce a second concurrent run — and the job's own duplicate suppression
   * still applies, which is why triggering the digest twice in a morning posts
   * once.
   */
  await deps.scheduler.runNow(key);

  const after = deps.scheduler.status().find((entry) => entry.key === key);
  const outcome = after?.lastOutcome ?? null;

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: `${key} — ${outcome ? OUTCOME_LABELS[outcome] : 'finished'}`,
        description:
          outcome === 'failed'
            ? 'The run failed. `/guardian jobs history` has the error code.'
            : outcome === 'skipped'
              ? 'Another process holds the lock, so this run was skipped. That is the lock working, not a fault.'
              : 'The run completed. Any duplicate suppression the job applies still held.',
      }),
    ],
  };
}

/**
 * Discord marks the option required, so a null here means the interaction did
 * not match the registered spec — a stale registration, not a member mistake.
 */
function requiredJobKey(invocation: CommandInvocation): string {
  const key = invocation.options.getString('job');
  if (key === null) {
    throw bloomError('INVALID_INPUT', {
      operatorHint:
        'The required "job" option was absent. The guild has a stale command registration — re-run the registrar.',
    });
  }
  return key;
}

function unknownJob(key: string, deps: GuardianDeps): Error {
  const known = deps.scheduler
    .status()
    .map((job) => job.key)
    .join(', ');
  return bloomError('INVALID_INPUT', {
    userMessage: 'That job does not exist.',
    operatorHint: `No job named "${key}". Registered: ${known || '(none)'}.`,
  });
}

export const jobSubcommands: readonly SubcommandContribution<GuardianDeps>[] = [
  {
    group: 'jobs',
    spec: {
      name: 'list',
      description: 'Show every scheduled job and when it next runs.',
    },
    execute: listJobs,
  },
  {
    group: 'jobs',
    spec: {
      name: 'history',
      description: 'Show the last recorded run of a job, including failures.',
      options: [
        {
          name: 'job',
          description: 'The job key, as shown by /guardian jobs list.',
          type: 'string',
          required: true,
        },
      ],
    },
    execute: jobHistory,
  },
  {
    group: 'jobs',
    spec: {
      name: 'run',
      description: 'Run a job immediately, without waiting for its schedule.',
      options: [
        {
          name: 'job',
          description: 'The job key, as shown by /guardian jobs list.',
          type: 'string',
          required: true,
        },
      ],
    },
    // Administrator, above the namespace's moderator default: a manual trigger
    // can post to a public channel, and the ability to make the bot speak on
    // demand is an administrative capability rather than a moderation one.
    policy: requireAdministrator(),
    execute: runJobNow,
  },
];
