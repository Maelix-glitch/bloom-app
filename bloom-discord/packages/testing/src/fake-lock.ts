import type { BloomError, BotName, GuildId } from '@bloom/shared-types';
import type { JobLock } from '@bloom/events';
import type { Clock } from '@bloom/utils';
import { systemClock } from '@bloom/utils';

export interface RecordedJobRun {
  readonly runId: string;
  readonly jobKey: string;
  status: 'running' | 'succeeded' | 'failed';
  errorCode: string | null;
}

/**
 * In-memory job locking with the same semantics as the database implementation:
 * one holder per (jobKey, guildId), leases that expire, and a run record per
 * attempt. Lets the scheduler's concurrency behaviour be tested without
 * Postgres.
 */
export class FakeJobLock implements JobLock {
  public readonly runs: RecordedJobRun[] = [];
  private readonly held = new Map<string, { runId: string; expiresAt: number }>();
  private nextId = 1;

  public constructor(private readonly clock: Clock = systemClock) {}

  public acquire(input: {
    jobKey: string;
    guildId: GuildId | null;
    botName: BotName;
    leaseSeconds: number;
  }): Promise<{ runId: string } | null> {
    const key = `${input.jobKey}:${input.guildId ?? ''}`;
    const existing = this.held.get(key);

    if (existing && existing.expiresAt > this.clock.now()) {
      return Promise.resolve(null);
    }

    const runId = `run-${String(this.nextId++)}`;
    this.held.set(key, {
      runId,
      expiresAt: this.clock.now() + input.leaseSeconds * 1000,
    });
    this.runs.push({ runId, jobKey: input.jobKey, status: 'running', errorCode: null });
    return Promise.resolve({ runId });
  }

  public complete(runId: string): Promise<void> {
    this.release(runId, 'succeeded', null);
    return Promise.resolve();
  }

  public fail(runId: string, error: BloomError): Promise<void> {
    this.release(runId, 'failed', error.code);
    return Promise.resolve();
  }

  public reclaimExpired(): Promise<number> {
    let reclaimed = 0;
    for (const [key, lease] of this.held) {
      if (lease.expiresAt <= this.clock.now()) {
        this.held.delete(key);
        reclaimed += 1;
      }
    }
    return Promise.resolve(reclaimed);
  }

  private release(
    runId: string,
    status: 'succeeded' | 'failed',
    errorCode: string | null,
  ): void {
    const run = this.runs.find((entry) => entry.runId === runId);
    if (run) {
      run.status = status;
      run.errorCode = errorCode;
    }
    for (const [key, lease] of this.held) {
      if (lease.runId === runId) this.held.delete(key);
    }
  }
}

/** In-memory duplicate suppression, matching the event dispatcher's `dedupe` port. */
export class FakeDedupe {
  private readonly claims = new Map<string, number>();

  public constructor(private readonly clock: Clock = systemClock) {}

  public tryClaim(key: string, ttlSeconds: number): Promise<boolean> {
    const existing = this.claims.get(key);
    if (existing !== undefined && existing > this.clock.now())
      return Promise.resolve(false);
    this.claims.set(key, this.clock.now() + ttlSeconds * 1000);
    return Promise.resolve(true);
  }
}
