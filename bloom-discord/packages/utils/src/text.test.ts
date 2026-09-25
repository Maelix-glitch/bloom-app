import { describe, expect, it } from 'vitest';
import {
  DISCORD_LIMITS,
  escapeMarkdown,
  neutraliseMentions,
  sanitiseUserText,
  truncate,
} from './text.js';

describe('escapeMarkdown', () => {
  it('neutralises formatting characters', () => {
    expect(escapeMarkdown('**bold**')).not.toContain('**bold**');
    expect(escapeMarkdown('`code`')).toContain('\\`');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeMarkdown('hello world')).toBe('hello world');
  });
});

describe('neutraliseMentions', () => {
  /*
   * Text escaping is defence in depth — outbound messages also set
   * allowedMentions to parse nothing. Both exist because either one alone is a
   * single point of failure, and the failure is pinging an entire server.
   */
  it('defuses @everyone and @here', () => {
    expect(neutraliseMentions('hey @everyone')).not.toContain('@everyone');
    expect(neutraliseMentions('hey @here')).not.toContain('@here');
  });

  it('defuses role and user mentions', () => {
    expect(neutraliseMentions('<@&900000000000020001>')).not.toMatch(/<@&\d+>/);
    expect(neutraliseMentions('<@900000000000001005>')).not.toMatch(/<@\d+>/);
  });

  it('keeps the surrounding words readable', () => {
    expect(neutraliseMentions('ping @everyone now')).toContain('now');
  });
});

describe('sanitiseUserText', () => {
  it('escapes, neutralises and truncates in one pass', () => {
    const nasty = `@everyone **look** ${'x'.repeat(3000)}`;
    const clean = sanitiseUserText(nasty, DISCORD_LIMITS.embedDescription);

    expect(clean).not.toContain('@everyone');
    expect(clean.length).toBeLessThanOrEqual(DISCORD_LIMITS.embedDescription);
  });

  it('strips control characters that would corrupt a log line', () => {
    expect(sanitiseUserText('a\u0000b\u0007c', 100)).toBe('abc');
  });

  it('handles empty input', () => {
    expect(sanitiseUserText('', 100)).toBe('');
  });
});

describe('truncate', () => {
  it('leaves short input untouched', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('never exceeds the limit, including the ellipsis', () => {
    const result = truncate('x'.repeat(100), 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('signals that content was cut', () => {
    expect(truncate('x'.repeat(100), 10)).toMatch(/…|\.\.\./);
  });
});
