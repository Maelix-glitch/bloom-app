import { describe, expect, it } from 'vitest';
import {
  localDateIn,
  localDaysBetween,
  parseLocalDate,
  shiftLocalDate,
  type LocalDate,
} from './time.js';

const at = (iso: string): Date => new Date(iso);

describe('localDateIn', () => {
  it('resolves the calendar date in the requested zone, not UTC', () => {
    // 23:30 UTC is already tomorrow in Tokyo and still today in London.
    const instant = at('2026-03-12T23:30:00Z');
    expect(localDateIn(instant, 'UTC')).toBe('2026-03-12');
    expect(localDateIn(instant, 'Europe/London')).toBe('2026-03-12');
    expect(localDateIn(instant, 'Asia/Tokyo')).toBe('2026-03-13');
  });

  it('puts a late-evening moment in the Americas on the local day', () => {
    // 02:00 UTC on the 13th is 22:00 on the 12th in New York. A member
    // checking in then has checked in on the 12th, not the 13th.
    expect(localDateIn(at('2026-03-13T02:00:00Z'), 'America/New_York')).toBe(
      '2026-03-12',
    );
  });

  it('follows daylight saving rather than a fixed offset', () => {
    /*
     * The hour after London's spring-forward. A hard-coded +0 offset gets the
     * date right here by luck and the *time* wrong, which is how a 09:00 job
     * ends up running at 08:00 for half the year — so the assertion that
     * matters is that the zone is consulted at all.
     */
    const beforeDst = at('2026-03-29T00:30:00Z');
    const afterDst = at('2026-03-29T01:30:00Z');
    expect(localDateIn(beforeDst, 'Europe/London')).toBe('2026-03-29');
    expect(localDateIn(afterDst, 'Europe/London')).toBe('2026-03-29');
  });

  it('handles a zone with a fractional offset', () => {
    // Kolkata is UTC+05:30. Offsets that are not whole hours are where
    // hand-rolled arithmetic usually breaks.
    expect(localDateIn(at('2026-03-12T18:45:00Z'), 'Asia/Kolkata')).toBe('2026-03-13');
  });

  it('refuses a zone the runtime does not know', () => {
    expect(() => localDateIn(at('2026-03-12T12:00:00Z'), 'Mars/Olympus')).toThrow();
  });
});

describe('shiftLocalDate', () => {
  it('moves across a month boundary', () => {
    expect(shiftLocalDate(parseLocalDate('2026-03-01'), -1)).toBe('2026-02-28');
    expect(shiftLocalDate(parseLocalDate('2026-02-28'), 1)).toBe('2026-03-01');
  });

  it('knows about leap years', () => {
    expect(shiftLocalDate(parseLocalDate('2028-03-01'), -1)).toBe('2028-02-29');
  });

  it('crosses a daylight-saving boundary without losing a day', () => {
    /*
     * The clocks go forward on 2026-03-29 in London. Arithmetic done at
     * midnight in local time would produce a 23-hour day and, rounded, the
     * same date twice — which in a streak is a day silently deleted.
     */
    expect(shiftLocalDate(parseLocalDate('2026-03-30'), -1)).toBe('2026-03-29');
    expect(shiftLocalDate(parseLocalDate('2026-03-29'), -1)).toBe('2026-03-28');
  });

  it('is symmetric', () => {
    const start = parseLocalDate('2026-11-01');
    expect(shiftLocalDate(shiftLocalDate(start, -30), 30)).toBe(start);
  });
});

describe('localDaysBetween', () => {
  it('counts whole days forwards and backwards', () => {
    const a = parseLocalDate('2026-03-01');
    const b = parseLocalDate('2026-03-31');
    expect(localDaysBetween(a, b)).toBe(30);
    expect(localDaysBetween(b, a)).toBe(-30);
  });

  it('spans a DST change without rounding to 29 or 31', () => {
    expect(
      localDaysBetween(parseLocalDate('2026-03-28'), parseLocalDate('2026-03-30')),
    ).toBe(2);
  });
});

describe('parseLocalDate', () => {
  it('rejects anything that is not a calendar date', () => {
    for (const bad of ['2026-3-1', '12/03/2026', '2026-03-12T00:00:00Z', '']) {
      expect(() => parseLocalDate(bad)).toThrow();
    }
  });

  it('accepts a well-formed date', () => {
    const parsed: LocalDate = parseLocalDate('2026-03-12');
    expect(parsed).toBe('2026-03-12');
  });
});
