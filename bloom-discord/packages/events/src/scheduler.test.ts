import { afterEach, describe, expect, it } from 'vitest';
import { FakeClock, FakeJobLock, createTestLogger } from '@bloom/testing';
import { Scheduler, type ScheduledJob } from './scheduler.js';

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
