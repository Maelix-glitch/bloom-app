import { describe, expect, it } from 'vitest';
import { BloomError, bloomError } from '@bloom/shared-types';
import { DISCORD_LIMITS } from '@bloom/utils';
import { BloomColour, TEXT_STYLE } from './tokens.js';
import {
  bloomEmbed,
  errorMessage,
  ephemeralText,
  errorEmbed,
  successEmbed,
} from './factories.js';

describe('embed factories', () => {
  it('applies the Bloom palette rather than ad-hoc colours', () => {
    expect(bloomEmbed({ title: 'Hello' }).colour).toBe(BloomColour.bloom);
    expect(successEmbed({ title: 'Done' }).colour).toBe(BloomColour.success);
    expect(errorEmbed({ title: 'No' }).colour).toBe(BloomColour.error);
  });

  it('truncates a description to Discord’s limit rather than letting the API reject it', () => {
    const embed = bloomEmbed({ description: 'x'.repeat(5000) });
    expect(embed.description?.length).toBeLessThanOrEqual(
      DISCORD_LIMITS.embedDescription,
    );
  });

  it('truncates a title', () => {
    const embed = bloomEmbed({ title: 'y'.repeat(500) });
    expect(embed.title?.length).toBeLessThanOrEqual(DISCORD_LIMITS.embedTitle);
  });

  /*
   * Field caps are a house style rule, not an API limit — Discord allows 25.
   * The brief asks for restraint, and a 25-field embed is a wall of text.
   */
  it('caps fields well below the API maximum', () => {
    const embed = bloomEmbed({
      title: 'Many',
      fields: Array.from({ length: 20 }, (_value, index) => ({
        name: `Field ${String(index)}`,
        value: 'value',
      })),
    });

    expect(embed.fields?.length).toBeLessThanOrEqual(TEXT_STYLE.maxFields);
  });
});

describe('errorMessage', () => {
  /*
   * The single most important test in this package. `operatorHint` regularly
   * contains internal identifiers, role ids and remediation steps that only
   * make sense to an administrator; `details` and `cause` can contain anything
   * at all. None of it may reach a member.
   */
  it('shows the member message and never the operator hint', () => {
    const error = bloomError('DATABASE_UNAVAILABLE', {
      operatorHint:
        'Connection to postgresql://bloom:hunter2@db.internal:5432/bloom refused after 10s.',
      details: { host: 'db.internal', attempt: 3 },
    });

    const message = errorMessage(error, { correlationId: 'abcdef1234567890' });
    const rendered = JSON.stringify(message);

    expect(rendered).not.toContain('postgresql://');
    expect(rendered).not.toContain('hunter2');
    expect(rendered).not.toContain('db.internal');
    expect(message.embeds?.[0]?.description).toBe(error.userMessage);
  });

  it('never includes a stack trace', () => {
    const wrapped = BloomError.from(new Error('boom at /srv/app/dist/thing.js:42'));
    const rendered = JSON.stringify(errorMessage(wrapped));

    expect(rendered).not.toContain('/srv/app');
    expect(rendered).not.toContain('boom at');
  });

  it('is always ephemeral', () => {
    expect(errorMessage(bloomError('INTERNAL_ERROR')).ephemeral).toBe(true);
  });

  it('includes a short correlation reference so support can find the log line', () => {
    const message = errorMessage(bloomError('INTERNAL_ERROR'), {
      correlationId: 'abcdef1234567890',
    });

    const reference = message.embeds?.[0]?.fields?.[0];
    expect(reference?.name).toBe('Reference');
    expect(reference?.value).toContain('abcdef12');
    // Truncated, so the full id is not exposed in a channel someone might screenshot.
    expect(reference?.value).not.toContain('1234567890');
  });

  it('omits the reference field when there is no correlation id', () => {
    const message = errorMessage(bloomError('INTERNAL_ERROR'));
    expect(message.embeds?.[0]?.fields).toBeUndefined();
  });

  it('uses a calm title, not an alarming one', () => {
    const message = errorMessage(bloomError('UNAUTHORIZED'));
    const title = message.embeds?.[0]?.title ?? '';

    expect(title).toBe('Not available to you');
    expect(title).not.toMatch(/!|error|oops|fail/i);
  });

  it('turns an unknown thrown value into a safe internal error', () => {
    const message = errorMessage({ weird: 'object' });
    expect(message.embeds?.[0]?.description).toBeTruthy();
    expect(JSON.stringify(message)).not.toContain('weird');
  });
});

describe('ephemeralText', () => {
  it('is ephemeral and length-bounded', () => {
    const message = ephemeralText('z'.repeat(5000));
    expect(message.ephemeral).toBe(true);
    expect(message.content?.length).toBeLessThanOrEqual(DISCORD_LIMITS.messageContent);
  });
});

describe('house style', () => {
  it('declares exclamation marks and body emoji off', () => {
    // Encoded as configuration rather than left to reviewers to police.
    expect(TEXT_STYLE.allowExclamation).toBe(false);
    expect(TEXT_STYLE.allowEmojiInBody).toBe(false);
  });
});
