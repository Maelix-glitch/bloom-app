import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock, FakeJobLock, createTestLogger } from '@bloom/testing';
import { Scheduler, type ScheduledJob } from './scheduler.js';

/** Placeholder until the promise executor hands over the real resolver. */
const noop = (): void => undefined;

function job(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    key: 'test-job',
    description: 'A job that does nothing.',
    schedule: '0 9 * * *',
    enabled: true,
    leaseSeconds: 60,
    guildId: null,
    run: () => Promise.resolve(),
    ...overrides,
  };
}

describe('Scheduler', () => {
  const schedulers: Scheduler[] = [];

  function make(options: { globallyDisabled?: boolean; lock?: FakeJobLock } = {}): {
    scheduler: Scheduler;
    lock: FakeJobLock;
    sink: ReturnType<typeof createTestLogger>['sink'];
  } {
    const logging = createTestLogger();
    const lock = options.lock ?? new FakeJobLock();
    const scheduler = new Scheduler({
      bot: 'companion',
      logger: logging.logger,
      timezone: 'Europe/London',
      lock,
      ...(options.globallyDisabled === undefined
        ? {}
        : { globallyDisabled: options.globallyDisabled }),
    });
    schedulers.push(scheduler);
    return { scheduler, lock, sink: logging.sink };
  }

  afterEach(async () => {
    for (const scheduler of schedulers.splice(0)) await scheduler.stop();
  });

  it('refuses two jobs with the same key, since keys are lock keys', () => {
    const { scheduler } = make();
    scheduler.register(job());
    expect(() => scheduler.register(job())).toThrow(/same key|duplicate/i);
  });

  /*
   * Regression: croner's `name` option enrols a job in a module-level registry
   * and throws on reuse, so naming jobs made a second Scheduler in the same
   * process fail on a global we never read. Two bots in one process, or a test
   * suite building a harness per test, both hit it.
   */
  it('allows two schedulers in one process to use the same job key', () => {
    const first = make();
    const second = make();

    first.scheduler.register(job());
    expect(() => second.scheduler.register(job())).not.toThrow();
  });

  it('refuses registration after start, so the job list stays inspectable', () => {
    const { scheduler } = make();
    scheduler.start();
    expect(() => scheduler.register(job())).toThrow(/after the scheduler started/i);
  });

  it('reports a next run time for an enabled job', () => {
    const { scheduler } = make();
    scheduler.register(job());
    scheduler.start();

    const status = scheduler.status();
    expect(status[0]?.enabled).toBe(true);
    expect(status[0]?.nextRunAt).toBeInstanceOf(Date);
  });

  it('reports no next run for a disabled job', () => {
    const { scheduler } = make();
    scheduler.register(job({ enabled: false }));
    scheduler.start();

    expect(scheduler.status()[0]?.enabled).toBe(false);
    expect(scheduler.status()[0]?.nextRunAt).toBeNull();
  });

  /*
   * A single switch that stops a development machine posting into the live
   * server. Sharing a database between environments is more common than anyone
   * admits, and this is cheaper than finding out the hard way.
   */
  it('globallyDisabled turns every job off', () => {
    const { scheduler } = make({ globallyDisabled: true });
    scheduler.register(job());
    scheduler.register(job({ key: 'second' }));
    scheduler.start();

    expect(scheduler.status().every((entry) => !entry.enabled)).toBe(true);
  });

  it('runs a job on demand and records success', async () => {
    let ran = 0;
    const { scheduler, lock } = make();
    scheduler.register(
      job({
        run: () => {
          ran += 1;
          return Promise.resolve();
        },
      }),
    );

    await scheduler.runNow('test-job');

    expect(ran).toBe(1);
    expect(lock.runs[0]?.status).toBe('succeeded');
    expect(scheduler.status()[0]?.lastOutcome).toBe('success');
  });

  /*
   * With two replicas of the same bot, both timers fire. Only one may act, and
   * the arbiter has to be outside the process — which is what the lease is.
   */
  it('skips the run when another process holds the lease', async () => {
    const clock = new FakeClock();
    const lock = new FakeJobLock(clock);

    // Simulate the other replica taking the lease first.
    await lock.acquire({
      jobKey: 'test-job',
      guildId: null,
      botName: 'companion',
      leaseSeconds: 60,
    });

    let ran = 0;
    const { scheduler } = make({ lock });
    scheduler.register(
      job({
        run: () => {
          ran += 1;
          return Promise.resolve();
        },
      }),
    );

    await scheduler.runNow('test-job');

    expect(ran).toBe(0);
    expect(scheduler.status()[0]?.lastOutcome).toBe('skipped');
  });

  it('runs once the previous lease has expired', async () => {
    const clock = new FakeClock();
    const lock = new FakeJobLock(clock);
    await lock.acquire({
      jobKey: 'test-job',
      guildId: null,
      botName: 'companion',
      leaseSeconds: 60,
    });

    let ran = 0;
    const { scheduler } = make({ lock });
    scheduler.register(
      job({
        run: () => {
          ran += 1;
          return Promise.resolve();
        },
      }),
    );

    clock.advanceSeconds(61);
    await scheduler.runNow('test-job');

    expect(ran).toBe(1);
  });

  it('records a failure and releases the lease', async () => {
    const { scheduler, lock, sink } = make();
    scheduler.register(job({ run: () => Promise.reject(new Error('job blew up')) }));

    await scheduler.runNow('test-job');

    expect(lock.runs[0]?.status).toBe('failed');
    expect(scheduler.status()[0]?.lastOutcome).toBe('failed');
    expect(sink.serialised()).toContain('job.test-job.failed');
  });

  /*
   * The heartbeat.
   *
   * A job that outlives its lease is the subtle failure mode: the lease lapses,
   * a second process legitimately acquires it, and the job runs twice with
   * neither replica doing anything wrong. Renewing while the work is in flight
   * is what prevents that, so these tests use fake timers to prove the renewal
   * actually happens rather than trusting that a `setInterval` was created.
   */
  describe('lease renewal', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('renews the lease every half-lease while the job is still running', async () => {
      const { scheduler, lock } = make();
      let finish: () => void = noop;
      const running = new Promise<void>((resolve) => {
        finish = resolve;
      });

      scheduler.register(job({ leaseSeconds: 60, run: () => running }));

      const run = scheduler.runNow('test-job');

      // Two half-leases with the job still in flight.
      await vi.advanceTimersByTimeAsync(30_000);
      expect(lock.renewals).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(lock.renewals).toHaveLength(2);

      finish();
      await run;
    });

    it('stops renewing once the job returns', async () => {
      const { scheduler, lock } = make();
      scheduler.register(job({ leaseSeconds: 60, run: () => Promise.resolve() }));

      await scheduler.runNow('test-job');
      await vi.advanceTimersByTimeAsync(300_000);

      // Five minutes of wall clock after a job that finished immediately: a
      // heartbeat left running would have renewed a released lease ten times.
      expect(lock.renewals).toHaveLength(0);
    });

    it('stops renewing when the job throws', async () => {
      const { scheduler, lock } = make();
      scheduler.register(
        job({ leaseSeconds: 60, run: () => Promise.reject(new Error('x')) }),
      );

      await scheduler.runNow('test-job');
      await vi.advanceTimersByTimeAsync(300_000);

      expect(lock.renewals).toHaveLength(0);
    });

    /*
     * Losing the lease mid-run means another process may already be running the
     * same job. The scheduler cannot undo that, but it must say so loudly —
     * silent duplicate execution is the thing nobody ever debugs.
     */
    it('logs an error when a renewal is refused', async () => {
      const { scheduler, lock, sink } = make();
      let finish: () => void = noop;
      const running = new Promise<void>((resolve) => {
        finish = resolve;
      });
      scheduler.register(job({ leaseSeconds: 60, run: () => running }));

      const run = scheduler.runNow('test-job');
      await vi.advanceTimersByTimeAsync(1);

      // The other replica reclaims it: the lease this run holds is gone.
      await lock.reclaimExpired('companion');
      lock.forceRelease();

      await vi.advanceTimersByTimeAsync(30_000);

      expect(sink.serialised()).toContain('scheduler.lease_lost');
      finish();
      await run;
    });
  });

  it('a failing job never rejects out of the scheduler', async () => {
    const { scheduler } = make();
    scheduler.register(job({ run: () => Promise.reject(new Error('nope')) }));

    await expect(scheduler.runNow('test-job')).resolves.toBeUndefined();
  });

  it('releases the lease so the next run can proceed', async () => {
    let ran = 0;
    const { scheduler } = make();
    scheduler.register(
      job({
        run: () => {
          ran += 1;
          return Promise.resolve();
        },
      }),
    );

    await scheduler.runNow('test-job');
    await scheduler.runNow('test-job');

    expect(ran).toBe(2);
  });

  it('names the known jobs when asked to run one that does not exist', async () => {
    const { scheduler } = make();
    scheduler.register(job({ key: 'daily-check-in' }));

    await expect(scheduler.runNow('typo')).rejects.toThrow(/daily-check-in/);
  });

  it('rejects an invalid cron expression at registration', () => {
    const { scheduler } = make();
    expect(() => scheduler.register(job({ schedule: 'not a cron' }))).toThrow();
  });
});
