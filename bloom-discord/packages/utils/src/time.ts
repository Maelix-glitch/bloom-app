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

/* -----------------------------------------------------------------------------
 * Calendar days
 * ---------------------------------------------------------------------------*/

/**
 * A calendar date in a community's own timezone, as `YYYY-MM-DD`.
 *
 * Distinct from an instant, and deliberately so. "Have you checked in today?"
 * is a question about a calendar day in a particular place, not about a
 * 24-hour window: a member in Europe/London who checks in at 23:50 and again at
 * 00:10 has checked in on two days, and one who checks in at 09:00 and 17:00
 * has checked in on one.
 *
 * Storing the resolved local date rather than recomputing it from a timestamp
 * also means the record does not change meaning if `BLOOM_TIMEZONE` is later
 * edited — yesterday's check-in stays on the day it was made.
 */
export type LocalDate = string & { readonly __localDate: unique symbol };

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The calendar date `instant` falls on in `timeZone`.
 *
 * `Intl` does the work because it is the only thing in the runtime that knows
 * about daylight saving. Hand-rolled offset arithmetic gets this wrong twice a
 * year, in the direction that awards someone two check-ins for one day.
 */
export function localDateIn(instant: Date | number, timeZone: string): LocalDate {
  const date = typeof instant === 'number' ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: 'year' | 'month' | 'day'): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const formatted = `${get('year')}-${get('month')}-${get('day')}`;
  if (!LOCAL_DATE_PATTERN.test(formatted)) {
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint:
        `Could not resolve a calendar date in timezone "${timeZone}". ` +
        'BLOOM_TIMEZONE must be an IANA name such as "Europe/London".',
      details: { timeZone },
    });
  }
  return formatted as LocalDate;
}

/** Parse a `YYYY-MM-DD`, rejecting anything else. */
export function parseLocalDate(value: string): LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: `Expected a calendar date as YYYY-MM-DD, received "${value}".`,
    });
  }
  return value as LocalDate;
}

/**
 * Shift a calendar date by whole days.
 *
 * Arithmetic happens at midday UTC. A calendar date has no timezone, so the
 * only hazard here is a date that lands on a DST boundary when interpreted as
 * an instant; midday is twelve hours clear of every such shift in use.
 */
export function shiftLocalDate(date: LocalDate, days: number): LocalDate {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day, 12));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return localDateIn(shifted, 'UTC');
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function localDaysBetween(from: LocalDate, to: LocalDate): number {
  const at = (value: LocalDate): number => {
    const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day, 12);
  };
  return Math.round((at(to) - at(from)) / DAY_MS);
}
