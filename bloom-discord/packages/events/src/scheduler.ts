import { Cron } from 'croner';
import { BloomError, bloomError, type BotName, type GuildId } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import { newCorrelationId, withCorrelation } from '@bloom/utils';

/**
 * The scheduler.
 *
 * One per process, and the only place a timer is created. The brief's rule —
 * "no scattered setInterval calls" — exists because scattered timers cannot be
 * listed, disabled, locked or audited, and because every one of them is a
 * separate opportunity to double-post to a channel.
 *
 * Three guarantees:
 *
 *   1. **Timezone-correct.** Croner evaluates the expression in a named IANA
 *      zone, so "09:00 in Europe/London" stays 09:00 across DST changes. A
 *      naive interval drifts by an hour twice a year.
 *   2. **Single-run across replicas.** Every run claims a database lease first.
 *      Two containers running the same bot will not both post the check-in.
 *   3. **Non-overlapping.** A run that outlives its interval does not get a
 *      second concurrent invocation.
 */

/**
 * Durable, cross-process locking.
 *
 * An interface rather than a direct dependency on @bloom/database, so the
 * scheduler can be tested with an in-memory lock and so this package does not
 * pull in a Postgres driver.
 */
export interface JobLock {
  acquire(input: {
    readonly jobKey: string;
    readonly guildId: GuildId | null;
    readonly botName: BotName;
    readonly leaseSeconds: number;
  }): Promise<{ readonly runId: string } | null>;

  /**
   * Push the lease expiry back while a job is still working.
   *
   * Returns `false` if the lease is already gone — reclaimed after an overrun,
   * or completed by something else. The caller cannot safely keep going at that
   * point, because another process is now entitled to take the job.
   */
  renew(runId: string, leaseSeconds: number): Promise<boolean>;

  complete(runId: string, detail?: Record<string, unknown>): Promise<void>;
  fail(runId: string, error: BloomError): Promise<void>;
  /** Re-mark runs whose lease expired, so a crashed process does not block a job forever. */
  reclaimExpired(botName: BotName): Promise<number>;
}

export interface ScheduledJob {
  /** Stable identifier; also the lock key. Never change it for a live job. */
  readonly key: string;
  readonly description: string;
  /** Standard 5- or 6-field cron expression, evaluated in `timezone`. */
  readonly schedule: string;
  /**
   * Whether the job runs at all.
   *
   * Every scheduled message in the brief needs an off switch. This is the
   * static one, from configuration; features layer a per-guild database toggle
   * on top of it.
   */
  readonly enabled: boolean;
  /**
   * How long the lease is held.
   *
   * Set it above the job's realistic worst case. The scheduler also renews the
   * lease every `leaseSeconds / 2` while the job runs, so an occasional overrun
   * does not hand the job to a second process — but the lease still has to be
   * long enough that one missed renewal is not fatal.
   */
  readonly leaseSeconds: number;
  readonly guildId: GuildId | null;
  run(context: JobRunContext): Promise<void>;
}

export interface JobRunContext {
  readonly jobKey: string;
  readonly guildId: GuildId | null;
  readonly runId: string;
  readonly logger: Logger;
  readonly scheduledFor: Date;
}

export interface SchedulerOptions {
  readonly bot: BotName;
  readonly logger: Logger;
  readonly timezone: string;
  readonly lock: JobLock;
  /**
   * Turns every job off without removing it.
   *
   * Development environments share the production database in more setups than
   * anyone admits. A single switch that stops a dev machine posting into the
   * live server is worth having.
   */
  readonly globallyDisabled?: boolean;
}

export interface JobStatus {
  readonly key: string;
  readonly description: string;
  readonly schedule: string;
  readonly enabled: boolean;
  readonly running: boolean;
  readonly nextRunAt: Date | null;
  readonly lastRunAt: Date | null;
  readonly lastOutcome: 'success' | 'failed' | 'skipped' | null;
}

interface JobState {
  readonly job: ScheduledJob;
  readonly cron: Cron;
  running: boolean;
  lastRunAt: Date | null;
  lastOutcome: 'success' | 'failed' | 'skipped' | null;
}

export class Scheduler {
  private readonly jobs = new Map<string, JobState>();
  private started = false;

  public constructor(private readonly options: SchedulerOptions) {}

  public register(job: ScheduledJob): this {
    if (this.started) {
      throw bloomError('INTERNAL_ERROR', {
        operatorHint: `Job "${job.key}" was registered after the scheduler started. Register every job during startup so the job list is complete and inspectable.`,
      });
    }

    if (this.jobs.has(job.key)) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Two jobs share the key "${job.key}". Keys are lock keys; duplicates would silently block one another.`,
        details: { job: job.key },
      });
    }

    const enabled = job.enabled && this.options.globallyDisabled !== true;

    /*
     * `paused: true` — the cron object is created now so its schedule can be
     * validated and its next run reported, but nothing fires until start().
     * `protect` is croner's overlap guard; the database lease is the real
     * defence, this just avoids a pointless round trip.
     *
     * Deliberately unnamed. Croner's `name` option enrols the job in a
     * module-level registry shared by everything in the process, and throws if
     * a name is reused — so two Scheduler instances, or one constructed twice,
     * collide on a global we never read. `this.jobs` is the registry that
     * matters, and it is scoped to the instance that owns it.
     */
    const cron = new Cron(
      job.schedule,
      { timezone: this.options.timezone, paused: true, protect: true },
      () => {
        void this.execute(job.key);
      },
    );

    this.jobs.set(job.key, {
      job: { ...job, enabled },
      cron,
      running: false,
      lastRunAt: null,
      lastOutcome: null,
    });

    return this;
  }

  public start(): void {
    if (this.started) return;
    this.started = true;

    for (const state of this.jobs.values()) {
      if (state.job.enabled) {
        state.cron.resume();
      }
    }

    const enabled = [...this.jobs.values()].filter((state) => state.job.enabled).length;
    this.options.logger.info(
      'scheduler.started',
      `Scheduler running: ${String(enabled)} of ${String(this.jobs.size)} job(s) enabled, timezone ${this.options.timezone}.`,
      { context: { timezone: this.options.timezone } },
    );
  }

  public async stop(): Promise<void> {
    for (const state of this.jobs.values()) {
      state.cron.stop();
    }

    // Let in-flight runs finish rather than abandoning their leases; an
    // abandoned lease blocks the job until it expires.
    const deadline = Date.now() + 30_000;
    while (
      [...this.jobs.values()].some((state) => state.running) &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.started = false;
    this.options.logger.info('scheduler.stopped', 'Scheduler stopped.');
  }

  public status(): readonly JobStatus[] {
    return [...this.jobs.values()].map((state) => ({
      key: state.job.key,
      description: state.job.description,
      schedule: state.job.schedule,
      enabled: state.job.enabled,
      running: state.running,
      nextRunAt: state.job.enabled ? state.cron.nextRun() : null,
      lastRunAt: state.lastRunAt,
      lastOutcome: state.lastOutcome,
    }));
  }

  /** Run a job immediately, bypassing the schedule but not the lock. */
  public async runNow(key: string): Promise<void> {
    if (!this.jobs.has(key)) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `No scheduled job named "${key}". Known jobs: ${[...this.jobs.keys()].join(', ') || '(none)'}.`,
      });
    }
    await this.execute(key);
  }

  /**
   * Keep a running job's lease alive.
   *
   * `unref()` so a pending renewal cannot hold the process open during
   * shutdown — the lease lapsing is the correct outcome for a job whose process
   * is going away.
   */
  private startHeartbeat(
    key: string,
    runId: string,
    leaseSeconds: number,
  ): NodeJS.Timeout {
    const intervalMs = Math.max(1000, (leaseSeconds / 2) * 1000);

    const timer = setInterval(() => {
      void this.options.lock
        .renew(runId, leaseSeconds)
        .then((renewed) => {
          if (!renewed) {
            // Not fatal here — the job keeps going and `complete` will find
            // nothing to close. Worth an error, because it means the lease was
            // stolen and this run may have been duplicated elsewhere.
            this.options.logger.error(
              'scheduler.lease_lost',
              `Job "${key}" lost its lease while running. Another process may have started the same job; consider raising leaseSeconds.`,
              { context: { job: key, run_id: runId } },
            );
          }
        })
        .catch((error: unknown) => {
          this.options.logger.warn(
            'scheduler.renew_failed',
            `Could not renew the lease for job "${key}".`,
            { context: { job: key }, error },
          );
        });
    }, intervalMs);

    timer.unref();
    return timer;
  }

  private async execute(key: string): Promise<void> {
    const state = this.jobs.get(key);
    if (!state) return;

    if (state.running) {
      state.lastOutcome = 'skipped';
      this.options.logger.warn(
        'scheduler.overlap',
        `Job "${key}" was still running when its next run came due; this run was skipped.`,
        { context: { job: key } },
      );
      return;
    }

    state.running = true;
    const scheduledFor = new Date();

    await withCorrelation(async () => {
      const logger = this.options.logger.child({ context: { job: key } });
      let lease: { readonly runId: string } | null = null;

      try {
        lease = await this.options.lock.acquire({
          jobKey: key,
          guildId: state.job.guildId,
          botName: this.options.bot,
          leaseSeconds: state.job.leaseSeconds,
        });

        if (!lease) {
          // Another process holds it. Normal in a multi-replica deployment and
          // not worth more than a debug line.
          state.lastOutcome = 'skipped';
          logger.debug(
            'scheduler.lock_held',
            `Job "${key}" is already running elsewhere; skipping this run.`,
          );
          return;
        }

        /*
         * Hold the lease open for as long as the job actually runs.
         *
         * Without this, a job that overruns its lease keeps working while
         * another process is entitled to start the same job — the exact
         * double-post the lease exists to prevent, and the one that only shows
         * up under load when a job is unusually slow.
         *
         * Renewing at half the lease means a single failed renewal still leaves
         * a full half-lease of headroom before anything can steal it.
         */
        const heartbeat = this.startHeartbeat(key, lease.runId, state.job.leaseSeconds);

        try {
          const done = logger.startTimer(`job.${key}`);
          await state.job.run({
            jobKey: key,
            guildId: state.job.guildId,
            runId: lease.runId,
            logger,
            scheduledFor,
          });
          done(`Job "${key}" completed.`);
        } finally {
          clearInterval(heartbeat);
        }

        await this.options.lock.complete(lease.runId);
        state.lastOutcome = 'success';
      } catch (error) {
        const bloom = BloomError.from(error);
        state.lastOutcome = 'failed';
        logger.log(bloom.severity, `job.${key}.failed`, `Job "${key}" failed.`, {
          error: bloom,
          error_code: bloom.code,
        });

        if (lease) {
          try {
            await this.options.lock.fail(lease.runId, bloom);
          } catch (releaseError) {
            // The lease will expire on its own; say so rather than masking the
            // original failure with a bookkeeping one.
            logger.error(
              'scheduler.release_failed',
              `Could not mark job "${key}" as failed; its lease will expire in ${String(state.job.leaseSeconds)}s.`,
              { error: releaseError },
            );
          }
        }
      } finally {
        state.running = false;
        state.lastRunAt = scheduledFor;
      }
    }, newCorrelationId());
  }
}
