import { describe, expect, it } from 'vitest';
import { FakeClock } from '@bloom/testing';
import { TokenBucketRateLimiter, rateLimitError } from './rate-limit.js';

describe('TokenBucketRateLimiter', () => {
  it('allows up to capacity, then refuses', async () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 3,
      refillPerSecond: 1,
      clock: new FakeClock(),
    });

    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(false);
  });

  it('keeps buckets separate per key', async () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillPerSecond: 1,
      clock: new FakeClock(),
    });

    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-2')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(false);
  });

  /*
   * Refill is computed on read rather than on a timer. This is the test that
   * matters for that choice: tokens must accrue while nothing is happening, and
   * accrue in proportion to elapsed time.
   */
  it('refills lazily as time passes', async () => {
    const clock = new FakeClock();
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillPerSecond: 1,
      clock,
    });

    await limiter.consume('user-1');
    await limiter.consume('user-1');
    expect((await limiter.consume('user-1')).allowed).toBe(false);

    clock.advanceSeconds(1);
    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(false);
  });

  it('never accrues beyond capacity, however long it idles', async () => {
    const clock = new FakeClock();
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillPerSecond: 1,
      clock,
    });

    await limiter.consume('user-1');
    clock.advanceMinutes(60);

    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(true);
    expect((await limiter.consume('user-1')).allowed).toBe(false);
  });

  it('reports a usable retry-after', async () => {
    const clock = new FakeClock();
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillPerSecond: 0.5,
      clock,
    });

    await limiter.consume('user-1');
    const decision = await limiter.consume('user-1');

    expect(decision.allowed).toBe(false);
    // Half a token per second, one token needed: two seconds.
    expect(decision.retryAfterMs).toBe(2000);
  });

  it('supports a cost greater than one', async () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 5,
      refillPerSecond: 1,
      clock: new FakeClock(),
    });

    expect((await limiter.consume('user-1', 4)).allowed).toBe(true);
    expect((await limiter.consume('user-1', 2)).allowed).toBe(false);
    expect((await limiter.consume('user-1', 1)).allowed).toBe(true);
  });

  /*
   * An unbounded Map keyed by user id is a slow memory leak in a long-running
   * bot. Eviction caps it; the cost is that a very stale bucket resets, which
   * is acceptable for a courtesy limit.
   */
  it('bounds memory by evicting the stalest buckets', async () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 1,
      refillPerSecond: 1,
      clock: new FakeClock(),
      maxTrackedKeys: 10,
    });

    for (let i = 0; i < 50; i += 1) {
      await limiter.consume(`user-${String(i)}`);
    }

    // The earliest key was evicted, so it starts from a full bucket again.
    expect((await limiter.consume('user-0')).allowed).toBe(true);
  });
});

describe('rateLimitError', () => {
  it('passes an allowed decision through', () => {
    expect(rateLimitError({ allowed: true, retryAfterMs: 0 }).ok).toBe(true);
  });

  it('produces a RATE_LIMITED error that tells the member when to retry', () => {
    const result = rateLimitError({ allowed: false, retryAfterMs: 30_000 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('RATE_LIMITED');
    expect(result.error.userMessage).toMatch(/30 seconds|30s/i);
  });
});
