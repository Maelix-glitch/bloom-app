import { bloomError, type BotName, type GuildId } from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import type { AuditEventRepository, JobRunRepository } from '@bloom/database';
import { requireAdministrator } from '@bloom/permissions';
import { staffEmbed, type BloomMessage } from '@bloom/embeds';
import { discordTimestamp, pluralise } from '@bloom/utils';
import type { JobStatus, Scheduler } from '@bloom/events';
import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { JobSettingsService } from './settings.js';

/**
 * `<bot> jobs …` — what is scheduled, whether it worked, and an off switch.
 *
 * Written once and shared by every bot that schedules anything. Guardian needed
 * it first; Companion needs exactly the same five subcommands, and the brief
 * rules out duplicated code between bots. The alternative — a copy per app —
 * would drift the moment one of them gained a field the others did not.
 *
 * The parameterisation is deliberately minimal: a bot supplies its own deps
 * type, and this only requires the four things every job surface needs. It
 * never sees a bot's feature services, so it cannot grow a dependency on one.
 */

export interface JobAdminDeps {
  /** Which bot's audit rows and settings these commands write. */
  readonly bot: BotName;
  readonly config: PlatformConfig;
  readonly scheduler: Scheduler;
  readonly jobSettings: JobSettingsService;
  readonly repositories: {
    readonly jobs: JobRunRepository;
    readonly audit: AuditEventRepository;
  };
}

const OUTCOME_LABELS: Readonly<Record<NonNullable<JobStatus['lastOutcome']>, string>> = {
  success: 'succeeded',
  failed: 'FAILED',
  skipped: 'skipped (locked, or switched off)',
};

async function listJobs(
  invocation: CommandInvocation,
  deps: JobAdminDeps,
): Promise<BloomMessage> {
  const jobs = deps.scheduler.status();

  if (jobs.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: 'No scheduled jobs',
          description:
            'This bot has no jobs registered in this build. That is a statement about the code, not about configuration.',
        }),
      ],
    };
  }

  const globallyOff = !deps.config.features.scheduledMessages;
  const guildId = invocation.guildId;

  /*
   * The per-guild switches, read in one pass.
   *
   * `Scheduler.status()` is synchronous and knows only about static
   * configuration, so the runtime override has to be fetched separately. Doing
   * it in parallel keeps a ten-job listing to one round trip's worth of
   * latency rather than ten.
   */
  const overrides = guildId
    ? new Map(
        await Promise.all(
          jobs.map(async (job): Promise<readonly [string, boolean | null]> => [
            job.key,
            (await deps.jobSettings.read(guildId, job.key)).enabled,
          ]),
        ),
      )
    : new Map<string, boolean | null>();

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: pluralise(jobs.length, 'scheduled job'),
        description: globallyOff
          ? '**FEATURE_SCHEDULED_MESSAGES is off.** Every job below is registered but will not fire until it is enabled.'
          : `Schedules are evaluated in **${deps.config.runtime.timezone}**.`,
        fields: jobs.map((job) => ({
          name: job.key,
          value: describe(job, globallyOff, overrides.get(job.key) ?? null),
        })),
        footer: 'Times render in your own timezone.',
      }),
    ],
  };
}

function describe(
  job: JobStatus,
  globallyOff: boolean,
  override: boolean | null,
): string {
  const lines = [job.description, `Schedule: \`${job.schedule}\``];

  /*
   * Four different reasons a job is not running, reported as four different
   * messages. Collapsing them into "disabled" sends an administrator hunting
   * through environment variables for a flag that does not exist when the real
   * cause is an unconfigured channel — or a switch they themselves flipped.
   */
  if (globallyOff) {
    lines.push('Status: disabled globally (FEATURE_SCHEDULED_MESSAGES)');
  } else if (!job.enabled) {
    lines.push('Status: disabled by configuration for this job');
  } else if (override === false) {
    lines.push('Status: **switched off for this server** — `jobs enable` to resume');
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
  deps: JobAdminDeps,
): Promise<BloomMessage> {
  const key = requiredJobKey(invocation);
  if (!isRegistered(deps, key)) throw unknownJob(key, deps);

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
     * This is staff-only, ephemeral, and the whole point of the command is
     * diagnosis — the vague member-facing wording would make it useless. It is
     * still the stored hint, never a stack trace.
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
  deps: JobAdminDeps,
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
          description: 'Nothing started. Check back with `jobs history`.',
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
    guildId: requireGuild(invocation),
    botName: deps.bot,
    event: 'jobs.manual_run',
    // 'warn', not 'info': a human making the bot act off-schedule should stand
    // out when scrolling an audit log, even though nothing is wrong.
    severity: 'warn',
    actorId: invocation.actor.userId,
    source: 'jobs run',
    details: { job_key: key },
  });

  /*
   * `runNow` bypasses the schedule but neither the lock nor the per-guild
   * switch, so a manual trigger cannot produce a second concurrent run — and
   * the job's own duplicate suppression still applies, which is why triggering
   * a digest twice in one morning posts once.
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
            ? 'The run failed. `jobs history` has the error code.'
            : outcome === 'skipped'
              ? 'The run was skipped: either another process holds the lock, or the job is switched off for this server. Both are the safeguards working, not a fault.'
              : 'The run completed. Any duplicate suppression the job applies still held.',
      }),
    ],
  };
}

function setEnabled(enabled: boolean) {
  return async (
    invocation: CommandInvocation,
    deps: JobAdminDeps,
  ): Promise<BloomMessage> => {
    const key = requiredJobKey(invocation);
    if (!isRegistered(deps, key)) throw unknownJob(key, deps);

    const guildId = requireGuild(invocation);
    await deps.jobSettings.write(guildId, key, enabled, invocation.actor.userId);

    await deps.repositories.audit.append({
      guildId,
      botName: deps.bot,
      event: enabled ? 'jobs.enabled' : 'jobs.disabled',
      severity: 'warn',
      actorId: invocation.actor.userId,
      source: `jobs ${enabled ? 'enable' : 'disable'}`,
      details: { job_key: key },
    });

    const job = deps.scheduler.status().find((entry) => entry.key === key);

    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: `${key} — ${enabled ? 'enabled' : 'disabled'} for this server`,
          description: enabled
            ? describeEnableOutcome(deps, job)
            : 'It stays registered and visible in `jobs list`, and will not fire until it is enabled again. Any run already in flight finishes.',
        }),
      ],
    };
  };
}

function describeEnableOutcome(deps: JobAdminDeps, job: JobStatus | undefined): string {
  /*
   * Honesty about what enabling actually achieved.
   *
   * Two switches sit above this one, and reporting "enabled" while the job
   * still cannot run would be precisely the fake status the brief forbids.
   */
  if (!deps.config.features.scheduledMessages) {
    return 'Note that **FEATURE_SCHEDULED_MESSAGES is off**, so it still will not fire. That switch is environment configuration and needs a deployment.';
  }
  if (job && !job.enabled) {
    return 'Note that this job is **disabled by configuration** — most often because the channel it posts to is not set. It still will not fire.';
  }
  return job?.nextRunAt
    ? `Next run: ${discordTimestamp(job.nextRunAt)}.`
    : 'It will run at its next scheduled time.';
}

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

function isRegistered(deps: JobAdminDeps, key: string): boolean {
  return deps.scheduler.status().some((job) => job.key === key);
}

function requireGuild(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    // The dispatcher already refuses non-guild invocations; this is the type
    // narrowing that makes that guarantee visible to the compiler.
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'A job command reached its handler without a guild id.',
    });
  }
  return id;
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

function unknownJob(key: string, deps: JobAdminDeps): Error {
  const known = deps.scheduler
    .status()
    .map((job) => job.key)
    .join(', ');
  return bloomError('INVALID_INPUT', {
    userMessage: 'That job does not exist.',
    operatorHint: `No job named "${key}". Registered: ${known || '(none)'}.`,
  });
}

const jobOption = {
  name: 'job',
  description: 'The job key, as shown by jobs list.',
  type: 'string',
  required: true,
} as const;

/**
 * The `jobs` subcommand group, for any bot that schedules work.
 *
 * `list` and `history` inherit the namespace's policy — read-only diagnosis is
 * moderator-level. The three that change something demand Administrator: they
 * can make the bot post on demand, or silence a job the community relies on,
 * and neither is a moderation action.
 */
export function jobSubcommands<
  TDeps extends JobAdminDeps,
>(): readonly SubcommandContribution<TDeps>[] {
  /*
   * The handlers take `JobAdminDeps`; the contributions are typed to the bot's
   * own deps. That direction is safe — a handler needing less than it is given
   * is exactly what makes this surface shareable — and `TDeps` exists purely so
   * each bot's namespace stays type-checked against its own container.
   */
  return [
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
        options: [jobOption],
      },
      execute: jobHistory,
    },
    {
      group: 'jobs',
      spec: {
        name: 'run',
        description: 'Run a job immediately, without waiting for its schedule.',
        options: [jobOption],
      },
      policy: requireAdministrator(),
      execute: runJobNow,
    },
    {
      group: 'jobs',
      spec: {
        name: 'enable',
        description: 'Allow a job to run in this server.',
        options: [jobOption],
      },
      policy: requireAdministrator(),
      execute: setEnabled(true),
    },
    {
      group: 'jobs',
      spec: {
        name: 'disable',
        description: 'Stop a job running in this server, without removing it.',
        options: [jobOption],
      },
      policy: requireAdministrator(),
      execute: setEnabled(false),
    },
  ];
}

/** Description for the group, so each bot does not invent its own wording. */
export const JOBS_GROUP_DESCRIPTION = 'Inspect, trigger and switch scheduled work.';
