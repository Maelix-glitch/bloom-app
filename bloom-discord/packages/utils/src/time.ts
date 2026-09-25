import { bloomError, type Result, err, ok } from '@bloom/shared-types';
import type { BloomError } from '@bloom/shared-types';

/**
 * Time is injected, never read from the ambient clock inside business logic.
 *
 * Every rate limit, cooldown, timeout duration and scheduled job depends on
 * "now". Tests that depend on the real clock are either slow or flaky, and
 * usually both.
 */
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
  /** Current instant. Always UTC — storage and comparison are UTC everywhere. */
  date(): Date;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  date: () => new Date(),
};

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

/** Discord's hard ceiling for a communication timeout: 28 days. */
export const MAX_TIMEOUT_MS = 28 * DAY_MS;

const DURATION_UNITS: Readonly<Record<string, number>> = {
  s: SECOND_MS,
  m: MINUTE_MS,
  h: HOUR_MS,
  d: DAY_MS,
  w: WEEK_MS,
};

const DURATION_PATTERN = /^(\d+)\s*([smhdw])$/i;

/**
 * Parse a human duration such as `10m`, `2h`, `7d`.
 *
 * Returns a `Result` rather than throwing, because the caller is almost always
 * validating something a moderator typed into a slash command and needs to
 * reply with a usage hint rather than blow up.
 */
export function parseDuration(input: string): Result<number, BloomError> {
  const match = DURATION_PATTERN.exec(input.trim());
  if (!match) {
    return err(
      bloomError('INVALID_INPUT', {
        userMessage:
          'Use a duration like `10m`, `2h` or `7d` — a number followed by s, m, h, d or w.',
        details: { input },
      }),
    );
  }

  const amount = Number.parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();
  const milliseconds = amount * DURATION_UNITS[unit]!;

  if (milliseconds <= 0) {
    return err(
      bloomError('INVALID_INPUT', {
        userMessage: 'The duration must be greater than zero.',
        details: { input },
      }),
    );
  }

  return ok(milliseconds);
}

/** Render a duration the way a person would say it: `2h 30m`, not `9000000ms`. */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < SECOND_MS)
    return `${String(Math.max(0, Math.round(milliseconds)))}ms`;

  const units: readonly [label: string, size: number][] = [
    ['d', DAY_MS],
    ['h', HOUR_MS],
    ['m', MINUTE_MS],
    ['s', SECOND_MS],
  ];

  const parts: string[] = [];
  let remaining = Math.floor(milliseconds);
  for (const [label, size] of units) {
    const value = Math.floor(remaining / size);
    if (value > 0) {
      parts.push(`${String(value)}${label}`);
      remaining -= value * size;
    }
    // Two units is enough precision for anything a human reads.
    if (parts.length === 2) break;
  }
  return parts.join(' ');
}

/** ISO-8601 in UTC. The only timestamp format written to storage or logs. */
export function toIsoUtc(date: Date | number): string {
  return (typeof date === 'number' ? new Date(date) : date).toISOString();
}

/**
 * Discord's `<t:unix:R>` relative timestamp.
 *
 * Preferred over a pre-rendered "in 2 hours", because Discord renders it in the
 * reader's own locale and timezone and keeps it correct as time passes.
 */
export function discordTimestamp(
  date: Date | number,
  style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'R',
): string {
  const ms = typeof date === 'number' ? date : date.getTime();
  return `<t:${String(Math.floor(ms / 1000))}:${style}>`;
}
