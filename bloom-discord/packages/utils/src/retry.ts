import { randomInt } from 'node:crypto';
import { BloomError, bloomError } from '@bloom/shared-types';

export interface RetryOptions {
  /** Total attempts, including the first. `1` means no retry. */
  readonly attempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  /**
   * Decides whether a given failure is worth another attempt.
   * Defaults to "only if the error catalog says this code is retryable".
   */
  readonly isRetryable?: (error: unknown) => boolean;
  readonly onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /** Injected for tests; defaults to a real timer. */
  readonly sleep?: (ms: number) => Promise<void>;
}

export const DEFAULT_RETRY: RetryOptions = {
  attempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5_000,
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultIsRetryable(error: unknown): boolean {
  return BloomError.is(error) ? error.retryable : false;
}

/**
 * Exponential backoff with full jitter.
 *
 * Jitter matters more than the backoff curve here. Three bots reconnecting
 * after the same Discord blip, all retrying on an identical schedule, produce a
 * synchronised thundering herd against the API that just failed.
 *
 * `crypto.randomInt` rather than `Math.random` — not for security, but because
 * a single lint rule banning `Math.random` outright is easier to enforce than a
 * judgement call at each call site.
 */
export function backoffDelay(attempt: number, base: number, max: number): number {
  const exponential = Math.min(max, base * 2 ** (attempt - 1));
  return randomInt(0, Math.max(1, Math.floor(exponential)) + 1);
}

/**
 * Retry an async operation.
 *
 * Deliberately narrow: it does not retry non-retryable errors, and it never
 * retries indefinitely. The brief calls out "do not repeatedly retry" for
 * hierarchy failures specifically — those surface as non-retryable codes, so
 * they exit on the first attempt without any special-casing here.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY, ...options };
  const retryable = config.isRetryable ?? defaultIsRetryable;
  const wait = config.sleep ?? sleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= config.attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const isLast = attempt === config.attempts;
      if (isLast || !retryable(error)) throw error;

      const delay = backoffDelay(attempt, config.baseDelayMs, config.maxDelayMs);
      config.onRetry?.(error, attempt, delay);
      await wait(delay);
    }
  }

  throw BloomError.from(lastError);
}

/**
 * Bound an operation by a deadline.
 *
 * Every external call gets one. An interaction handler that hangs on a database
 * query does not merely fail — it blows Discord's 3-second acknowledgement
 * window and the member sees "This interaction failed" with no explanation.
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            bloomError('TIMEOUT', {
              operatorHint: `Operation "${label}" exceeded its ${String(timeoutMs)}ms deadline.`,
              details: { operation: label, timeout_ms: timeoutMs },
            }),
          );
        }, timeoutMs);
        // Do not hold the event loop open purely for a timeout.
        timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
