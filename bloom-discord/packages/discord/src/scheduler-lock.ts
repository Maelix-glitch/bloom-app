import { hostname } from 'node:os';
import type { BloomError, BotName, GuildId } from '@bloom/shared-types';
import type { JobRunRepository } from '@bloom/database';
import type { JobLock } from '@bloom/events';

/**
 * The scheduler's lock, backed by `job_runs`.
 *
 * `@bloom/events` declares `JobLock` as an interface and deliberately does not
 * depend on `@bloom/database` — a scheduler that drags in a Postgres driver
 * cannot be unit-tested without one. This package is the first that sees both,
 * so the adapter lives here rather than forcing a dependency either way.
 *
 * The mutual exclusion itself is not implemented here. It is the partial unique
 * index `(job_key, COALESCE(guild_id, '')) WHERE status = 'running'`, which
 * means Postgres decides who runs a job, not application code remembering to
 * check first. This class only translates between the two shapes.
 */
export class DatabaseJobLock implements JobLock {
  private readonly runnerId: string;

  public constructor(
    private readonly repository: JobRunRepository,
    /**
     * Identifies this process in `job_runs.runner_id`.
     *
     * Defaults to hostname plus pid, which is what makes "which replica is
     * holding this job" answerable at 4am. A container's hostname is its
     * container id, so this survives the usual deployment topologies.
     */
    runnerId = `${hostname()}:${String(process.pid)}`,
  ) {
    this.runnerId = runnerId;
  }

  public async acquire(input: {
    readonly jobKey: string;
    readonly guildId: GuildId | null;
    readonly botName: BotName;
    readonly leaseSeconds: number;
  }): Promise<{ readonly runId: string } | null> {
    const lease = await this.repository.acquire({
      jobKey: input.jobKey,
      botName: input.botName,
      guildId: input.guildId,
      runnerId: this.runnerId,
      leaseSeconds: input.leaseSeconds,
    });

    return lease ? { runId: lease.runId } : null;
  }

  public renew(runId: string, leaseSeconds: number): Promise<boolean> {
    return this.repository.renew(runId, leaseSeconds);
  }

  public async complete(runId: string): Promise<void> {
    await this.repository.complete(runId, 'succeeded');
  }

  public async fail(runId: string, error: BloomError): Promise<void> {
    /*
     * The operator hint goes in, not the user message.
     *
     * `job_runs` is read by whoever is diagnosing a failed job, and the user
     * message is deliberately vague ("this action is currently unavailable") —
     * storing that would make the table useless for the one purpose it has.
     */
    await this.repository.complete(runId, 'failed', {
      errorCode: error.code,
      errorMessage: error.operatorHint,
    });
  }

  /**
   * `botName` is accepted because `JobLock` declares it, and ignored.
   *
   * Reclaiming is not per-bot: a lapsed lease held by a crashed Guardian must
   * be reclaimable by whichever process notices, or a job stays blocked until
   * that specific bot comes back. The parameter stays in the interface because
   * a different lock implementation might reasonably scope it.
   */
  public reclaimExpired(_botName: BotName): Promise<number> {
    return this.repository.reclaimExpired();
  }
}
