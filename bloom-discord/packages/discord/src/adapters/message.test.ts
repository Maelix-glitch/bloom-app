import { describe, expect, it } from 'vitest';
import { MessageFlags } from 'discord.js';
import type { BloomMessage } from '@bloom/embeds';
import { toChannelMessageOptions, toReplyOptions } from './message.js';

describe('toReplyOptions', () => {
  /*
   * The single most important property of outbound messages: mass mentions are
   * disabled at the API level on every single one. A moderation reason quoting
   * a member's "@everyone" must never actually ping the server, and string
   * escaping alone is not something to bet a community on.
   */
  it('disables mention parsing on every message', () => {
    expect(toReplyOptions({ content: 'hello' }).allowedMentions).toEqual({ parse: [] });
    expect(toChannelMessageOptions({ content: '@everyone' }).allowedMentions).toEqual({
      parse: [],
    });
  });

  /*
   * `ephemeral: true` was deprecated in 14.27 and is removed in v15. The flag
   * is the current spelling.
   */
  it('uses the Ephemeral message flag, not the deprecated boolean', () => {
    const options = toReplyOptions({ content: 'private', ephemeral: true });

    expect(options.flags).toBe(MessageFlags.Ephemeral);
    expect('ephemeral' in options).toBe(false);
  });

  it('omits the flag for a public message', () => {
    expect(toReplyOptions({ content: 'public' }).flags).toBeUndefined();
  });

  it('converts embeds', () => {
    const options = toReplyOptions({
      embeds: [{ title: 'Title', description: 'Body', colour: 0x8fae87 }],
    });

    expect(options.embeds).toHaveLength(1);
  });

  it('converts buttons into an action row', () => {
    const message: BloomMessage = {
      rows: [
        {
          components: [
            {
              kind: 'button',
              label: 'Verify',
              style: 'primary',
              customId: 'guardian:onboarding:verify',
            },
          ],
        },
      ],
    };

    expect(toReplyOptions(message).components).toHaveLength(1);
  });

  it('converts a select menu', () => {
    const message: BloomMessage = {
      rows: [
        {
          components: [
            {
              kind: 'select',
              customId: 'labs:cohort:choose',
              options: [{ label: 'Cohort A', value: 'a' }],
              placeholder: 'Pick one',
            },
          ],
        },
      ],
    };

    expect(toReplyOptions(message).components).toHaveLength(1);
  });

  /*
   * Discord rejects a button carrying both a url and a custom id, and a link
   * button with neither. Catching it here beats a 400 at send time.
   */
  it('refuses a link button with no url', () => {
    expect(() =>
      toReplyOptions({
        rows: [{ components: [{ kind: 'button', label: 'Docs', style: 'link' }] }],
      }),
    ).toThrow(/url/i);
  });

  it('refuses a non-link button with no custom id', () => {
    expect(() =>
      toReplyOptions({
        rows: [{ components: [{ kind: 'button', label: 'Go', style: 'primary' }] }],
      }),
    ).toThrow(/customId/i);
  });

  it('emits nothing for an empty message beyond the mention policy', () => {
    const options = toReplyOptions({});

    expect(options.content).toBeUndefined();
    expect(options.embeds).toBeUndefined();
    expect(options.components).toBeUndefined();
    expect(options.allowedMentions).toEqual({ parse: [] });
  });
});
