import type { Clock } from '@bloom/utils';

/**
 * A clock you control.
 *
 * Cooldowns, rate limits, leases and scheduled jobs are all time-dependent, and
 * testing them with real time means either sleeping (slow, flaky) or not
 * testing them (worse). Every component that cares about time takes a `Clock`,
 * so tests can move it deliberately.
 */
export class FakeClock implements Clock {
  private current: number;

  public constructor(startAt: Date | number = new Date('2026-01-01T09:00:00.000Z')) {
    this.current = typeof startAt === 'number' ? startAt : startAt.getTime();
  }

  public now(): number {
    return this.current;
  }

  public date(): Date {
    return new Date(this.current);
  }

  public advance(ms: number): this {
    this.current += ms;
    return this;
  }

  public advanceSeconds(seconds: number): this {
    return this.advance(seconds * 1000);
  }

  public advanceMinutes(minutes: number): this {
    return this.advance(minutes * 60_000);
  }

  public set(to: Date | number): this {
    this.current = typeof to === 'number' ? to : to.getTime();
    return this;
  }
}
