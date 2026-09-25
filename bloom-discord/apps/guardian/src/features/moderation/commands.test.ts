import { beforeEach, describe, expect, it } from 'vitest';
import type { UserId } from '@bloom/shared-types';
import type { RecordingResponder } from '@bloom/testing';
import { TEST_GUILD_ID, TEST_ROLE_IDS, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';
import { parseMessageLink } from './commands.js';

/** The refusal a non-staff actor actually sees. */
const REFUSAL = 'Not available to you';

function expectRefused(responder: RecordingResponder): void {
  expect(responder.visibleText).toContain(REFUSAL);
}

function expectAllowed(responder: RecordingResponder): void {
  expect(responder.visibleText).not.toContain(REFUSAL);
}

/** A resolved user option, as Discord would hand it to us. */
function user(id: UserId, isBot = false): { id: UserId; username: string; isBot: boolean } {
  return { id, username: `member-${id.slice(-4)}`, isBot };
}

/**
 * Moderation commands, through the real dispatcher.
 *
 * This is the layer where authorization is actually applied, so these tests go
 * through `dispatch` rather than calling `execute`. A test that called the
 * handler directly would pass no matter who was allowed to run it.
 */

let h: GuardianHarness;

const MEMBER = TEST_USER_IDS.member;
const MODERATOR = TEST_USER_IDS.moderator;
const ADMIN = TEST_USER_IDS.administrator;
const BETA = TEST_USER_IDS.betaTester;

beforeEach(() => {
  h = guardianHarness();
  h.guild.withMember(MEMBER);
  h.guild.withMember(MODERATOR, { roleIds: [TEST_ROLE_IDS.moderator] });
  h.guild.withMember(ADMIN, { roleIds: [TEST_ROLE_IDS.administrator] });
  h.guild.withMember(BETA, { roleIds: [TEST_ROLE_IDS.betaTester] });
});

const asMember = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MEMBER, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MODERATOR, roles: ['moderator'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: ADMIN, roles: ['administrator'] });
const asBetaTester = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: BETA, roles: ['betaTester'] });

describe('who may run what', () => {
  it('lets a moderator warn', async () => {
    const { responder } = await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { reason: 'Off-topic.' },
      },
    });

    expectAllowed(responder);
    expect(
      await h.repositories.moderation.countActiveWarnings(TEST_GUILD_ID, MEMBER),
    ).toBe(1);
  });

  it('refuses a plain member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'warn',
      actor: asMember(),
      options: {
        users: { member: user(TEST_USER_IDS.newcomer) },
        strings: { reason: 'I do not like them.' },
      },
    });

    expectRefused(responder);
    const history = await h.repositories.moderation.listForSubject(
      TEST_GUILD_ID,
      TEST_USER_IDS.newcomer,
    );
    expect(history).toHaveLength(0);
  });

  /**
   * ◌ Beta Tester grants testing access, not staff power. Conflating the two is
   * the specific mistake the role naming invites, so it gets its own test.
   */
  it('refuses a Beta Tester', async () => {
    const { responder } = await h.dispatch({
      commandName: 'timeout',
      actor: asBetaTester(),
      options: {
        users: { member: user(MEMBER) },
        strings: { duration: '10m', reason: 'Testing my powers.' },
      },
    });

    expectRefused(responder);
    expect(h.moderation.calls).toHaveLength(0);
  });

  /**
   * `/ban` and `/purge` are irreversible or bulk-destructive, so they sit above
   * the moderator line. A moderator who needs one asks an administrator, which
   * is a deliberate speed bump rather than an oversight.
   */
  it('refuses a moderator on the administrator-only commands', async () => {
    for (const commandName of ['ban', 'purge'] as const) {
      const { responder } = await h.dispatch({
        commandName,
        actor: asModerator(),
        options:
          commandName === 'ban'
            ? { users: { member: user(MEMBER) }, strings: { reason: 'Enough.' } }
            : { integers: { count: 10 }, strings: { reason: 'Spam.' } },
      });
      expectRefused(responder);
    }

    expect(h.moderation.bans.size).toBe(0);
  });

  it('allows an administrator to ban', async () => {
    const { responder } = await h.dispatch({
      commandName: 'ban',
      actor: asAdmin(),
      options: {
        users: { member: user(MEMBER) },
        strings: { reason: 'Repeated harassment after warnings.' },
      },
    });

    expectAllowed(responder);
    expect(h.moderation.bans).toContain(MEMBER);
  });

  /**
   * `/report` has to be reachable by someone who is part-way through
   * onboarding. Requiring ❋ Bloom Member would lock out exactly the newcomers
   * most likely to be targeted.
   */
  it('lets an unverified member file a report', async () => {
    const { responder } = await h.dispatch({
      commandName: 'report',
      actor: testSubject({ userId: TEST_USER_IDS.newcomer, roles: [] }),
      options: {
        users: { member: user(MEMBER) },
        strings: {
          category: 'member_conduct',
          description:
            'They followed me into three channels repeating the same insult.',
        },
      },
    });

    expectAllowed(responder);
    expect(await h.deps.cases.counts(TEST_GUILD_ID)).toMatchObject({ OPEN: 1 });
  });
});

describe('input handling', () => {
  it('refuses a bot as a moderation target', async () => {
    const { responder } = await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: {
        users: { member: user(TEST_USER_IDS.bot, true) },
        strings: { reason: 'Misbehaving.' },
      },
    });

    expect(responder.visibleText.toLowerCase()).toContain('bot');
    expect(
      await h.repositories.moderation.countActiveWarnings(TEST_GUILD_ID, TEST_USER_IDS.bot),
    ).toBe(0);
  });

  it('rejects an unparseable duration rather than guessing', async () => {
    const { responder } = await h.dispatch({
      commandName: 'timeout',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { duration: 'soon', reason: 'Cooling off.' },
      },
    });

    expect(responder.visibleText.toLowerCase()).toContain('duration');
    expect(h.moderation.calls).toHaveLength(0);
  });

  it('accepts a normal duration', async () => {
    const { responder } = await h.dispatch({
      commandName: 'timeout',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { duration: '30m', reason: 'Cooling off.' },
      },
    });

    expectAllowed(responder);
    expect(h.moderation.calls[0]?.action).toBe('timeout');
  });

  /**
   * Discord's own cap is 28 days. Letting the request through would produce an
   * API error the moderator cannot interpret, so it is refused with a reason.
   */
  it('refuses a timeout beyond Discord’s 28-day maximum', async () => {
    const { responder } = await h.dispatch({
      commandName: 'timeout',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { duration: '60d', reason: 'Too long.' },
      },
    });

    // Told why, rather than handed Discord's raw 50035.
    expect(responder.visibleText).toContain('28 days');
    expect(h.moderation.calls).toHaveLength(0);
  });
});

describe('error surfaces', () => {
  /**
   * Operator hints name roles, permission integers and internal state. A member
   * who is refused gets the plain reason; the detail stays in the logs. This is
   * asserted per feature because it is the kind of leak that arrives in one new
   * error message.
   */
  it('never leaks operator hints to the person who ran the command', async () => {
    const { responder } = await h.dispatch({
      commandName: 'warn',
      actor: asMember(),
      options: {
        users: { member: user(TEST_USER_IDS.newcomer) },
        strings: { reason: 'Nope.' },
      },
    });

    expectRefused(responder);
    expect(responder.visibleText).not.toMatch(/permission integer|docs\/|role id/i);
    expect(responder.visibleText).not.toContain('authorization policy');
    expect(responder.visibleText).not.toMatch(/\b9000000000000\d+\b/);
  });

  it('answers ephemerally, so moderation is not narrated in the channel', async () => {
    const { responder } = await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { reason: 'Off-topic.' },
      },
    });

    expect(responder.deferredEphemeral).toBe(true);
    expect(responder.last?.ephemeral).toBe(true);
  });
});

/**
 * Message links are pasted by members under stress, from mobile, from
 * `canary.`/`ptb.` clients. Parsing them loosely is how a report ends up
 * pointing at the wrong message, so the accepted shapes are pinned down.
 */
describe('parseMessageLink', () => {
  const guild = '900000000000000001';
  const channel = '900000000000000002';
  const message = '900000000000000003';

  it('accepts the canonical link and keeps the origin guild', () => {
    expect(
      parseMessageLink(`https://discord.com/channels/${guild}/${channel}/${message}`),
    ).toEqual({ guildId: guild, channelId: channel, messageId: message });
  });

  it('accepts the app subdomain and the client variants', () => {
    for (const host of [
      'https://discordapp.com',
      'https://canary.discord.com',
      'https://ptb.discord.com',
    ]) {
      expect(parseMessageLink(`${host}/channels/${guild}/${channel}/${message}`)).not.toBeNull();
    }
  });

  it('rejects a link that is not Discord', () => {
    expect(
      parseMessageLink(`https://discord.com.example.net/channels/${guild}/${channel}/${message}`),
    ).toBeNull();
  });

  it('rejects a truncated link', () => {
    expect(parseMessageLink(`https://discord.com/channels/${guild}/${channel}`)).toBeNull();
  });

  it('rejects free text', () => {
    expect(parseMessageLink('it was the message about the thing')).toBeNull();
  });

  it('rejects ids that are not snowflakes', () => {
    expect(parseMessageLink('https://discord.com/channels/1/2/3')).toBeNull();
  });
});

/**
 * A link is parseable and still wrong. Discord message links carry the server
 * they came from, so a report can reference a message in an entirely different
 * guild — staff would click through to a channel Bloom cannot see and have no
 * way to tell why.
 */
describe('cross-guild message links', () => {
  it('refuses a link from another server', async () => {
    const elsewhere = '800000000000000001';
    const { responder } = await h.dispatch({
      commandName: 'report',
      actor: testSubject({ userId: MEMBER, roles: ['bloomMember'] }),
      options: {
        strings: {
          category: 'member_conduct',
          description: 'They posted something about me that I want reviewed.',
          'message-link': `https://discord.com/channels/${elsewhere}/900000000000000002/900000000000000003`,
        },
      },
    });

    expect(responder.visibleText).toContain('different server');
    expect(await h.deps.cases.counts(TEST_GUILD_ID)).toMatchObject({ OPEN: 0 });
  });

  it('accepts a link from this server', async () => {
    const { responder } = await h.dispatch({
      commandName: 'report',
      actor: testSubject({ userId: MEMBER, roles: ['bloomMember'] }),
      options: {
        strings: {
          category: 'member_conduct',
          description: 'They posted something about me that I want reviewed.',
          'message-link': `https://discord.com/channels/${TEST_GUILD_ID}/900000000000000002/900000000000000003`,
        },
      },
    });

    expect(responder.visibleText).not.toContain('different server');
    expect(await h.deps.cases.counts(TEST_GUILD_ID)).toMatchObject({ OPEN: 1 });
  });
});
