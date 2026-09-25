import { describe, expect, it } from 'vitest';
import {
  CUSTOM_ID_MAX_LENGTH,
  customIdRoute,
  encodeCustomId,
  parseCustomId,
} from './custom-id.js';

/**
 * Custom ids.
 *
 * The only routing information a component interaction carries, and the only
 * one that arrives as a string this platform wrote earlier and must now trust.
 * Two properties matter: a malformed id is refused rather than best-guessed,
 * and an id that Discord would reject is caught at encode time rather than at
 * send time.
 */

describe('encoding', () => {
  it('builds the documented shape', () => {
    expect(encodeCustomId({ bot: 'labs', feature: 'bug', action: 'submit' })).toBe(
      'labs:bug:submit',
    );
  });

  it('appends an argument when there is one', () => {
    expect(
      encodeCustomId({ bot: 'labs', feature: 'bug', action: 'submit', argument: 'app' }),
    ).toBe('labs:bug:submit:app');
  });

  it('treats a null argument as no argument', () => {
    expect(
      encodeCustomId({ bot: 'labs', feature: 'bug', action: 'submit', argument: null }),
    ).toBe('labs:bug:submit');
  });

  it('refuses a segment that is not a lowercase identifier', () => {
    for (const feature of ['Bug', 'bug report', 'bug:report', '', '1bug']) {
      expect(() => encodeCustomId({ bot: 'labs', feature, action: 'submit' })).toThrow();
    }
  });

  it('refuses an argument containing the separator', () => {
    /*
     * The important one. An argument that could contain `:` would let a value
     * forge extra segments — a bug id of `x:admin:delete` becoming a route.
     */
    expect(() =>
      encodeCustomId({
        bot: 'labs',
        feature: 'bug',
        action: 'submit',
        argument: 'x:admin:delete',
      }),
    ).toThrow();
  });

  it('refuses an id longer than Discord accepts', () => {
    /*
     * Discord rejects the whole message, not just the component, so an
     * oversized id takes the reply down with it. Failing here makes that a
     * developer's problem instead of a member's.
     */
    const longSegment = `f${'o'.repeat(30)}`;
    expect(() =>
      encodeCustomId({
        bot: 'companion',
        feature: longSegment,
        action: longSegment,
        argument: 'a'.repeat(60),
      }),
    ).toThrow();
  });

  it('accepts an id exactly at the limit', () => {
    // 4 + 1 + 31 + 1 + 31 + 1 + 31 = 100. The boundary is allowed, not refused.
    const segment = `f${'o'.repeat(30)}`;
    const encoded = encodeCustomId({
      bot: 'labs',
      feature: segment,
      action: segment,
      argument: 'a'.repeat(31),
    });
    expect(encoded).toHaveLength(CUSTOM_ID_MAX_LENGTH);
  });
});

describe('parsing', () => {
  it('round-trips what it encoded', () => {
    const encoded = encodeCustomId({
      bot: 'companion',
      feature: 'rewards',
      action: 'confirm',
      argument: 'abc-123',
    });

    expect(parseCustomId(encoded)).toEqual({
      bot: 'companion',
      feature: 'rewards',
      action: 'confirm',
      argument: 'abc-123',
    });
  });

  it('reports a missing argument as null rather than undefined', () => {
    expect(parseCustomId('labs:bug:submit')?.argument).toBeNull();
  });

  it('returns null for anything it does not recognise', () => {
    /*
     * Null, not a throw. Every application in the server delivers its
     * components through the same gateway event, so an unrecognised id is
     * routine traffic — not an error, and certainly not one worth telling
     * somebody about.
     */
    for (const raw of [
      '',
      'labs',
      'labs:bug',
      'labs:bug:submit:app:extra',
      'notabot:bug:submit',
      'labs:Bug:submit',
      'labs:bug:Submit',
      'x'.repeat(CUSTOM_ID_MAX_LENGTH + 1),
    ]) {
      expect(parseCustomId(raw)).toBeNull();
    }
  });

  it('refuses an argument with characters the encoder would not produce', () => {
    // An id this bot never wrote. Routing it would mean trusting a string
    // another application chose.
    expect(parseCustomId('labs:bug:submit:../../etc')).toBeNull();
  });
});

describe('routes', () => {
  it('ignores the argument, so one handler serves many ids', () => {
    const first = parseCustomId('labs:bug:submit:app');
    const second = parseCustomId('labs:bug:submit:discord');

    expect(first && customIdRoute(first)).toBe('labs:bug:submit');
    expect(second && customIdRoute(second)).toBe('labs:bug:submit');
  });
});
