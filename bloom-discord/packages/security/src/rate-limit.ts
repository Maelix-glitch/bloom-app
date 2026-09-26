import {
  bloomError,
  err,
  ok,
  type BloomError,
  type GuildId,
  type Result,
} from '@bloom/shared-types';
import { formatDuration, systemClock, type Clock } from '@bloom/utils';
import type { CooldownRepository } from '@bloom/database';

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** When the caller may try again. */
  readonly retryAfterMs: number;
}

export interface RateLimiter {
  /** Test and consume in one step. Never expose a separate check — that is a race. */
  consume(key: string, cost?: number): Promise<RateLimitDecision>;
}

export interface TokenBucketOptions {
  readonly capacity: number;
  /** Tokens added per second. */
  readonly refillPerSecond: number;
  readonly clock?: Clock;
  /** Bound memory. Least-recently-used buckets are evicted past this. */
  readonly maxTrackedKeys?: number;
}

/**
 * In-process token bucket.
 *
 * Suitable for per-user command spam, where the limit is a courtesy and a
 * process restart resetting it is harmless. It is explicitly NOT suitable for
 * anything that must hold across the three bots or across a restart — rewards,
 * welcome messages, scheduled sends. Those use the database-backed limiter
 * below.
 *
 * Lazy refill rather than a timer: computing the accrued tokens on read means
 * no background work and no interval to leak.
 */
export class TokenBucketRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly clock: Clock;
  private readonly maxTrackedKeys: number;

  public constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillPerSecond = options.refillPerSecond;
    this.clock = options.clock ?? systemClock;
    this.maxTrackedKeys = options.maxTrackedKeys ?? 10_000;
  }

  public consume(key: string, cost = 1): Promise<RateLimitDecision> {
    const now = this.clock.now();
    const existing = this.buckets.get(key);

    const tokens = existing
      ? Math.min(
          this.capacity,
          existing.tokens + ((now - existing.updatedAt) / 1000) * this.refillPerSecond,
        )
      : this.capacity;

    if (tokens < cost) {
      const deficit = cost - tokens;
      const retryAfterMs = Math.ceil((deficit / this.refillPerSecond) * 1000);
      // Record the attempt so the refill clock keeps advancing correctly.
      this.buckets.set(key, { tokens, updatedAt: now });
      return Promise.resolve({ allowed: false, retryAfterMs });
    }

    this.evictIfNeeded();
    this.buckets.set(key, { tokens: tokens - cost, updatedAt: now });
    return Promise.resolve({ allowed: true, retryAfterMs: 0 });
  }

  /** Drop the oldest entries when the map grows past its bound. */
  private evictIfNeeded(): void {
    if (this.buckets.size < this.maxTrackedKeys) return;
    // Map iteration is insertion-ordered, so the first keys are the stalest.
    const toDrop = Math.ceil(this.maxTrackedKeys * 0.1);
    let dropped = 0;
    for (const key of this.buckets.keys()) {
      this.buckets.delete(key);
      dropped += 1;
      if (dropped >= toDrop) break;
    }
  }
}

/**
 * Database-backed cooldown.
 *
 * The durable half of rate limiting. Used for anything where "twice" is a real
 * problem rather than an annoyance: a welcome message, a daily check-in prompt,
 * a reward. Survives restarts and is shared by all three bots, because the
 * arbiter is Postgres rather than a process.
 */
export class DatabaseRateLimiter implements RateLimiter {
  public constructor(
    private readonly cooldowns: CooldownRepository,
    private readonly guildId: GuildId,
    private readonly scope: string,
    private readonly ttlSeconds: number,
    private readonly clock: Clock = systemClock,
  ) {}

  public async consume(subject: string): Promise<RateLimitDecision> {
    const result = await this.cooldowns.tryAcquire(
      this.guildId,
      this.scope,
      subject,
      this.ttlSeconds,
    );
    return {
      allowed: result.allowed,
      retryAfterMs: result.allowed
        ? 0
        : Math.max(0, result.expiresAt.getTime() - this.clock.now()),
    };
  }
}

/** Turn a denial into the standard error, with a usable "try again in" message. */
export function rateLimitError(decision: RateLimitDecision): Result<void, BloomError> {
  if (decision.allowed) return ok(undefined);
  return err(
    bloomError('RATE_LIMITED', {
      userMessage: `You are doing that a little too quickly. Try again in ${formatDuration(decision.retryAfterMs)}.`,
      operatorHint: `Rate limit hit; retry after ${String(decision.retryAfterMs)}ms.`,
      details: { retry_after_ms: decision.retryAfterMs },
    }),
  );
}
