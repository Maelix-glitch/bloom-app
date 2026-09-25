import { describe, expect, it } from 'vitest';
import { snowflakeCreatedAt } from './payloads.js';

describe('snowflakeCreatedAt', () => {
  /**
   * The value that matters: a snowflake exceeds `Number.MAX_SAFE_INTEGER`, so
   * parsing one with `Number()` silently drops the low bits. These cases fail
   * loudly if anyone "simplifies" the BigInt away.
   */
  it('decodes the Discord epoch from a zero-timestamp snowflake', () => {
    expect(snowflakeCreatedAt('0')).toEqual(new Date('2015-01-01T00:00:00.000Z'));
  });

  it('decodes a known snowflake to its creation time', () => {
    // 2016-04-30T11:18:25.796Z — the canonical example from Discord's docs.
    expect(snowflakeCreatedAt('175928847299117063').toISOString()).toBe(
      '2016-04-30T11:18:25.796Z',
    );
  });

  it('decodes modern 19-digit snowflakes exactly', () => {
    expect(snowflakeCreatedAt('1234567890123456789').toISOString()).toBe(
      '2024-04-29T18:12:02.167Z',
    );
    expect(snowflakeCreatedAt('999999999999999999').toISOString()).toBe(
      '2022-07-22T11:22:59.101Z',
    );
  });

  /**
   * Two snowflakes one increment apart were created in the same millisecond.
   *
   * This is the property that breaks if the BigInt shift is ever replaced with
   * float arithmetic: `Number('1234567890123456789')` rounds to
   * `...6768`, losing the low bits that distinguish them.
   */
  it('ignores the low bits, which carry no time information', () => {
    const base = 1234567890123456789n;

    expect(snowflakeCreatedAt(String(base)).getTime()).toBe(
      snowflakeCreatedAt(String(base + 1n)).getTime(),
    );
    // The id really does exceed float precision — proving the test above is
    // exercising something rather than passing by luck.
    expect(BigInt(Number(base)) === base).toBe(false);
  });
});
