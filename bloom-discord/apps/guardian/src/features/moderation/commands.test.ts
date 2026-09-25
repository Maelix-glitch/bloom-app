import { beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type UserId } from '@bloom/shared-types';
import type { RecordingResponder } from '@bloom/testing';
import { newCorrelationId } from '@bloom/utils';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
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
function user(
  id: UserId,
  isBot = false,
): { id: UserId; username: string; isBot: boolean } {
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
          description: 'They followed me into three channels repeating the same insult.',
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
      await h.repositories.moderation.countActiveWarnings(
        TEST_GUILD_ID,
        TEST_USER_IDS.bot,
      ),
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

/**
 * The rate limit's shape, not just its presence.
 *
 * A flat cooldown would pass a test that only checks "the eleventh action is
 * refused" while quietly breaking raid response — six kicks in ten seconds is
 * the scenario staff most need to work. Both halves are asserted.
 */
describe('moderation rate limiting', () => {
  const victim = (n: number): UserId =>
    unsafeSnowflake<UserId>(`90000000000002${String(n).padStart(4, '0')}`);

  it('permits a rapid burst, then throttles', async () => {
    for (let i = 0; i < 10; i += 1) {
      h.guild.withMember(victim(i));
    }

    const results: boolean[] = [];
    for (let i = 0; i < 10; i += 1) {
      const { responder } = await h.dispatch({
        commandName: 'warn',
        actor: asModerator(),
        options: {
          users: { member: user(victim(i)) },
          strings: { reason: 'Raid participant.' },
        },
      });
      results.push(!responder.visibleText.includes('too quickly'));
    }

    // The whole burst lands — this is the half a cooldown would break.
    expect(results.every(Boolean)).toBe(true);

    h.guild.withMember(victim(99));
    const eleventh = await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: {
        users: { member: user(victim(99)) },
        strings: { reason: 'One too many.' },
      },
    });

    expect(eleventh.responder.visibleText).toContain('too quickly');
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
      expect(
        parseMessageLink(`${host}/channels/${guild}/${channel}/${message}`),
      ).not.toBeNull();
    }
  });

  it('rejects a link that is not Discord', () => {
    expect(
      parseMessageLink(
        `https://discord.com.example.net/channels/${guild}/${channel}/${message}`,
      ),
    ).toBeNull();
  });

  it('rejects a truncated link', () => {
    expect(
      parseMessageLink(`https://discord.com/channels/${guild}/${channel}`),
    ).toBeNull();
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

/**
 * The `/guardian` branches.
 *
 * Covered through the dispatcher for the same reason as the bare verbs: these
 * are staff tools where "the wrong person could run it" and "it silently did
 * nothing" are the two failures that matter, and only the dispatcher path
 * exercises both.
 */
describe('/guardian case', () => {
  async function openCase(summary = 'Something happened.'): Promise<number> {
    const { case: row } = await h.repositories.cases.open({
      guildId: TEST_GUILD_ID,
      origin: 'moderator',
      openedBy: MODERATOR,
      summary,
      subjectId: MEMBER,
      category: null,
      status: 'OPEN',
      correlationId: newCorrelationId(),
    });
    return row.caseNumber;
  }

  it('opens a case and reports its number', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'open',
      actor: asModerator(),
      options: { strings: { summary: 'Escalating a pattern of behaviour.' } },
    });

    expectAllowed(responder);
    expect(responder.visibleText).toContain('1');
    expect(await h.deps.cases.counts(TEST_GUILD_ID)).toMatchObject({ OPEN: 1 });
  });

  it('shows a case', async () => {
    const number = await openCase('A specific summary line.');
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'view',
      actor: asModerator(),
      options: { integers: { number } },
    });

    expect(responder.visibleText).toContain('A specific summary line.');
  });

  /**
   * A mistyped case number must say so. Rendering an empty case instead would
   * read as "this case exists and is blank", which is a different and much
   * more alarming thing.
   */
  it('says so when the case does not exist', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'view',
      actor: asModerator(),
      options: { integers: { number: 404 } },
    });

    expect(responder.visibleText.toLowerCase()).toContain('no case');
  });

  it('lists the queue', async () => {
    await openCase('First.');
    await openCase('Second.');

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'list',
      actor: asModerator(),
      options: {},
    });

    expect(responder.visibleText).toContain('First.');
    expect(responder.visibleText).toContain('Second.');
  });

  it('moves a case through its statuses', async () => {
    const number = await openCase();
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'status',
      actor: asModerator(),
      options: { integers: { number }, strings: { to: 'IN_REVIEW' } },
    });

    expectAllowed(responder);
    const detail = await h.deps.cases.detail(TEST_GUILD_ID, number);
    expect(detail?.case.status).toBe('IN_REVIEW');
  });

  it('assigns a case', async () => {
    const number = await openCase();
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'assign',
      actor: asModerator(),
      options: { integers: { number }, users: { member: user(MODERATOR) } },
    });

    const detail = await h.deps.cases.detail(TEST_GUILD_ID, number);
    expect(detail?.case.assignedTo).toBe(MODERATOR);
  });

  it('appends a note to the case history', async () => {
    const number = await openCase();
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'note',
      actor: asModerator(),
      options: { integers: { number }, strings: { note: 'Spoke to both parties.' } },
    });

    const detail = await h.deps.cases.detail(TEST_GUILD_ID, number);
    expect(detail?.events.some((event) => event.eventType === 'note')).toBe(true);
  });

  it('refuses a plain member on every case branch', async () => {
    for (const subcommand of ['view', 'list', 'open', 'status', 'note'] as const) {
      const { responder } = await h.dispatch({
        commandName: 'guardian',
        subcommandGroup: 'case',
        subcommand,
        actor: asMember(),
        options: {
          integers: { number: 1 },
          strings: { summary: 'x', to: 'IN_REVIEW', note: 'x' },
        },
      });
      expectRefused(responder);
    }
  });
});

describe('/guardian member', () => {
  it('shows a member’s record', async () => {
    await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: { users: { member: user(MEMBER) }, strings: { reason: 'Noted.' } },
    });

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'member',
      subcommand: 'history',
      actor: asModerator(),
      options: { users: { member: user(MEMBER) } },
    });

    expect(responder.visibleText).toContain('Noted.');
  });

  /**
   * A staff note must not reach the member. Notifying would turn every piece of
   * recorded context into a confrontation, and people stop writing notes.
   */
  it('records a staff note without DMing the member', async () => {
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'member',
      subcommand: 'note',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { note: 'Handled informally last month.' },
      },
    });

    expect(h.messaging.directMessages).toHaveLength(0);
    const history = await h.repositories.moderation.listForSubject(TEST_GUILD_ID, MEMBER);
    expect(history.map((row) => row.action)).toContain('note');
  });

  it('clears warnings and reports how many', async () => {
    for (const reason of ['One.', 'Two.']) {
      await h.dispatch({
        commandName: 'warn',
        actor: asModerator(),
        options: { users: { member: user(MEMBER) }, strings: { reason } },
      });
    }

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'member',
      subcommand: 'clear-warnings',
      actor: asModerator(),
      options: {
        users: { member: user(MEMBER) },
        strings: { reason: 'Six months clean.' },
      },
    });

    expect(responder.visibleText).toContain('2');
    expect(
      await h.repositories.moderation.countActiveWarnings(TEST_GUILD_ID, MEMBER),
    ).toBe(0);
  });

  /**
   * Unbanning someone who is not banned has to say so. "Done" when nothing
   * happened stops the moderator looking for the real ban.
   */
  it('is honest when the user was not banned', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'member',
      subcommand: 'unban',
      actor: asModerator(),
      options: {
        strings: { 'user-id': '900000000000009999', reason: 'Appeal granted.' },
      },
    });

    expect(responder.visibleText.toLowerCase()).toMatch(/not banned|no ban/);
  });
});

describe('/guardian channel', () => {
  const CHANNEL = { id: TEST_CHANNEL_IDS.support, name: 'support', type: 0 };

  it('sets slowmode', async () => {
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'channel',
      subcommand: 'slowmode',
      actor: asModerator(),
      options: { integers: { seconds: 30 }, channels: { channel: CHANNEL } },
    });

    expect(h.channels.slowmode.get(CHANNEL.id)).toBe(30);
  });

  it('locks and then restores the prior permission on unlock', async () => {
    h.channels.sendPermission.set(CHANNEL.id, 'denied');

    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'channel',
      subcommand: 'lock',
      actor: asModerator(),
      options: { strings: { reason: 'Raid.' }, channels: { channel: CHANNEL } },
    });
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'channel',
      subcommand: 'unlock',
      actor: asModerator(),
      options: { strings: { reason: 'Over.' }, channels: { channel: CHANNEL } },
    });

    // It was restricted before the lock, so it stays restricted after.
    expect(h.channels.sendPermission.get(CHANNEL.id)).toBe('denied');
  });

  it('refuses a plain member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'channel',
      subcommand: 'lock',
      actor: asMember(),
      options: { strings: { reason: 'I want quiet.' }, channels: { channel: CHANNEL } },
    });

    expectRefused(responder);
    expect(h.channels.calls).toHaveLength(0);
  });
});
