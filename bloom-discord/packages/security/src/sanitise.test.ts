import { describe, expect, it } from 'vitest';
import {
  contentFingerprint,
  customId,
  isValidCustomId,
  parseCustomId,
  sanitiseForDisplay,
  sanitiseForStorage,
  sanitiseReason,
} from './sanitise.js';

describe('sanitiseForStorage', () => {
  /*
   * Storage keeps the member's words. Escaping on the way in produces a
   * database full of backslashes that read wrong in every export and every
   * audit review — escaping belongs at render time.
   */
  it('preserves markdown characters rather than escaping them', () => {
    expect(sanitiseForStorage('**important** note', 100)).toBe('**important** note');
  });

  it('strips control characters', () => {
    expect(sanitiseForStorage('a\u0000b\u001fc', 100)).toBe('abc');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitiseForStorage('   spaced   ', 100)).toBe('spaced');
  });

  it('bounds length', () => {
    expect(sanitiseForStorage('x'.repeat(500), 100)).toHaveLength(100);
  });
});

describe('sanitiseForDisplay', () => {
  it('escapes and defuses mentions on the way out', () => {
    const rendered = sanitiseForDisplay('@everyone **look**');

    expect(rendered).not.toContain('@everyone');
    expect(rendered).toContain('\\*');
  });
});

describe('sanitiseReason', () => {
  it('fits Discord’s audit log reason limit', () => {
    expect(sanitiseReason('y'.repeat(1000)).length).toBeLessThanOrEqual(512);
  });
});

describe('contentFingerprint', () => {
  /*
   * Private report content must not be logged, but an operator still needs to
   * tell whether two log lines concern the same report. A short hash gives
   * correlation without disclosure.
   */
  it('is stable for the same content', () => {
    expect(contentFingerprint('a private report')).toBe(
      contentFingerprint('a private report'),
    );
  });

  it('differs for different content', () => {
    expect(contentFingerprint('one')).not.toBe(contentFingerprint('two'));
  });

  it('reveals nothing of the original text', () => {
    const fingerprint = contentFingerprint('my password is hunter2');

    expect(fingerprint).not.toContain('hunter2');
    expect(fingerprint).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('custom ids', () => {
  it('builds a namespaced id', () => {
    expect(customId('guardian', 'onboarding', 'verify')).toBe(
      'guardian:onboarding:verify',
    );
  });

  it('appends an argument', () => {
    expect(customId('labs', 'vote', 'cast', 'feature-42')).toBe(
      'labs:vote:cast:feature-42',
    );
  });

  /*
   * Discord caps custom ids at 100 characters and truncating one silently
   * produces a button that routes nowhere. Better to fail while writing the
   * code than to ship a dead button.
   */
  it('refuses an id that exceeds Discord’s limit', () => {
    expect(() => customId('guardian', 'onboarding', 'verify', 'x'.repeat(200))).toThrow(
      /100/,
    );
  });

  it('accepts a well-formed id', () => {
    expect(isValidCustomId('guardian:onboarding:verify')).toBe(true);
    expect(isValidCustomId('labs:feature-status:refresh:abc_123')).toBe(true);
  });

  /*
   * Custom ids come back from Discord as routing input. Constraining the shape
   * means a malformed or hand-crafted id is rejected at the boundary instead of
   * being matched against a route by accident.
   */
  it('rejects malformed ids', () => {
    expect(isValidCustomId('guardian')).toBe(false);
    expect(isValidCustomId('guardian:onboarding')).toBe(false);
    expect(isValidCustomId('Guardian:Onboarding:Verify')).toBe(false);
    expect(isValidCustomId('guardian:onboarding:verify:a:b')).toBe(false);
    expect(isValidCustomId(`guardian:onboarding:verify:${'x'.repeat(200)}`)).toBe(false);
  });

  it('round-trips through parse', () => {
    expect(parseCustomId('guardian:onboarding:verify')).toEqual({
      bot: 'guardian',
      feature: 'onboarding',
      action: 'verify',
      argument: null,
    });

    expect(parseCustomId('labs:vote:cast:feature-42')).toEqual({
      bot: 'labs',
      feature: 'vote',
      action: 'cast',
      argument: 'feature-42',
    });
  });

  it('returns null rather than throwing for a bad id', () => {
    expect(parseCustomId('nonsense')).toBeNull();
  });
});
