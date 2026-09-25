import { beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type InteractionId } from '@bloom/shared-types';
import {
  DAILY_SMALL_WIN_LIMIT,
  POINT_AWARDS,
  RANK_THRESHOLDS,
  rankForPoints,
} from '@bloom/shared-types';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import { parseLocalDate } from '@bloom/utils';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import { companionCommandSpecs } from '../../commands.js';
import { isSlashCommandSpec } from '@bloom/commands';
import { streakFrom } from './service.js';

/**
 * Bloom Rewards, end to end through the dispatcher.
 *
 * The economy is the part of this platform most able to do quiet harm: it can
 * inflate, it can double-pay, it can turn a wellbeing feature into a slot
 * machine, and every one of those failures looks like success in a demo. So
 * these tests are mostly about what must *not* happen.
 */

let h: CompanionHarness;

const member = TEST_USER_IDS.member;
const other = TEST_USER_IDS.newcomer;

const asMember = (userId = member): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });

/** A fixed Thursday, so "today" never depends on when the suite runs. */
let now = new Date('2026-03-12T14:00:00.000Z');

function harness(options: Parameters<typeof companionHarness>[0] = {}): CompanionHarness {
  return companionHarness({ now: () => now, ...options });
}

beforeEach(() => {
  now = new Date('2026-03-12T14:00:00.000Z');
  h = harness();
});

describe('/checkin', () => {
  it('records the day and pays the fixed award', async () => {
    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(result.responder.visibleText).toContain('Checked in for today');
    expect(result.responder.visibleText).toContain(
      `+${String(POINT_AWARDS.check_in)} points`,
    );
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(
      POINT_AWARDS.check_in,
    );
  });

  it('is ephemeral', async () => {
    // A daily habit that announces itself to the server is a performance.
    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });
    expect(result.responder.deferredEphemeral).toBe(true);
  });

  it('pays once a day however many times it is run', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    const second = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(second.responder.visibleText).toContain('already checked in today');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(
      POINT_AWARDS.check_in,
    );
  });

  it('pays again the next day', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    now = new Date('2026-03-13T09:00:00.000Z');
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(
      POINT_AWARDS.check_in * 2,
    );
  });

  it('treats the day as the community’s calendar day, not a 24-hour window', async () => {
    // 09:00, then 23:00 the same evening: fourteen hours apart, one day.
    now = new Date('2026-03-12T09:00:00.000Z');
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    now = new Date('2026-03-12T23:00:00.000Z');
    const second = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(second.responder.visibleText).toContain('already checked in today');
  });

  it('records the check-in but pays nothing when rewards are switched off', async () => {
    h = harness({ rewards: false });

    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(result.responder.visibleText).toContain('Checked in for today');
    expect(result.responder.visibleText).not.toContain('points');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(0);
    // The participation still happened, and is still recorded.
    expect(h.repositories.rewards.checkIns.size).toBe(1);
  });

  it('writes an audit row that records the award and nothing personal', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const entry = h.repositories.audit.events.find(
      (event) => event.event === 'rewards.check_in',
    );
    expect(entry).toBeDefined();
    expect(entry?.details).toMatchObject({ points: POINT_AWARDS.check_in });
    expect(JSON.stringify(entry?.details ?? {})).not.toContain('mood');
  });

  it('refuses a member who has not completed onboarding', async () => {
    // ✧ Early Bloom is an onboarding state, not a reduced membership: someone
    // part-way through it has not joined the community yet, and the rewards
    // loop is the community's.
    const result = await h.dispatch({
      commandName: 'checkin',
      actor: testSubject({ userId: TEST_USER_IDS.newcomer, roles: ['earlyBloom'] }),
    });

    expect(result.responder.visibleText).toContain('Complete onboarding');
    expect(h.repositories.rewards.events).toHaveLength(0);
  });
});

describe('streaks', () => {
  const today = parseLocalDate('2026-03-12');

  it('counts consecutive days ending today', () => {
    expect(
      streakFrom(['2026-03-12', '2026-03-11', '2026-03-10'].map(parseLocalDate), today),
    ).toBe(3);
  });

  it('survives not having checked in yet today', () => {
    // Otherwise a member is told their streak is zero every morning until they
    // check in, which is both wrong and discouraging.
    expect(streakFrom(['2026-03-11', '2026-03-10'].map(parseLocalDate), today)).toBe(2);
  });

  it('breaks on a missed day', () => {
    expect(
      streakFrom(['2026-03-12', '2026-03-10', '2026-03-09'].map(parseLocalDate), today),
    ).toBe(1);
  });

  it('is zero after two missed days', () => {
    expect(streakFrom(['2026-03-09', '2026-03-08'].map(parseLocalDate), today)).toBe(0);
  });

  it('pays exactly the same on day 30 as on day 1', async () => {
    /*
     * The rule the brief implies but does not spell out: a streak may be shown
     * and must never be paid. The moment it pays, missing a day acquires a
     * cost, and charging someone for a bad week is the wrong incentive for a
     * wellbeing community.
     */
    for (let day = 12; day <= 20; day += 1) {
      now = new Date(`2026-03-${String(day).padStart(2, '0')}T09:00:00.000Z`);
      await h.dispatch({ commandName: 'checkin', actor: asMember() });
    }

    const balance = await h.repositories.rewards.balance(TEST_GUILD_ID, member);
    expect(balance).toBe(POINT_AWARDS.check_in * 9);
  });
});

describe('/win', () => {
  it('posts the win publicly and replies privately', async () => {
    const result = await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: {
        strings: { description: 'Finished the migration I had been avoiding.' },
      },
    });

    const posted = h.messaging.sent.at(-1);
    expect(posted?.channelId).toBe(TEST_CHANNEL_IDS.smallWins);
    expect(posted?.message.content).toContain('Finished the migration');
    expect(result.responder.deferredEphemeral).toBe(true);
  });

  it('never stores what the win said', async () => {
    const secret = 'I told my manager about the diagnosis.';
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: secret } },
    });

    /*
     * The text goes to the channel the member chose and nowhere else. A
     * database of everyone's good news is a data-protection liability with no
     * operational purpose, and this one would be full of health information.
     */
    const stored = JSON.stringify({
      ledger: h.repositories.rewards.events,
      audit: h.repositories.audit.events,
      logs: h.logs.events,
    });
    expect(stored).not.toContain(secret);
    expect(stored).not.toContain('diagnosis');
  });

  it('defuses an attempt to make the bot ping the server', async () => {
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'shipped it @everyone @here' } },
    });

    const posted = h.messaging.sent.at(-1);
    expect(posted?.message.content).not.toContain('@everyone');
    expect(posted?.message.content).not.toContain('@here');
  });

  it('stops paying after the daily cap but keeps sharing', async () => {
    for (let index = 0; index < DAILY_SMALL_WIN_LIMIT; index += 1) {
      await h.dispatch({
        commandName: 'win',
        actor: asMember(),
        options: { strings: { description: `win ${String(index)}` } },
      });
    }

    const overCap = await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'one more' } },
    });

    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(
      POINT_AWARDS.small_win * DAILY_SMALL_WIN_LIMIT,
    );
    // Still posted. The cap is on the reward, never on the participation.
    expect(h.messaging.sent.at(-1)?.message.content).toContain('one more');
    expect(overCap.responder.visibleText).toContain('Share as many as you like');
  });

  it('says nothing discouraging when a win is unpaid', async () => {
    h = harness({ rewards: false });

    const result = await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'got out for a walk' } },
    });

    const text = result.responder.visibleText;
    expect(text).toContain('switched off');
    for (const forbidden of ['limit reached', 'too many', 'slow down', 'wait']) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('keeps the points when the channel is missing, and says so', async () => {
    h = harness({ smallWinsChannel: null });

    const result = await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'a good day' } },
    });

    expect(result.responder.visibleText).toContain('not configured');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(
      POINT_AWARDS.small_win,
    );
  });

  it('posts once when Discord redelivers the same interaction', async () => {
    /*
     * Discord retries interactions, and the retry carries the same id. Paying
     * once is not enough: the visible half of this failure is the same win
     * appearing in the channel twice, which the ledger cannot undo.
     */
    const pinned = unsafeSnowflake<InteractionId>('900000000000009111');

    const first = await h.dispatch({
      commandName: 'win',
      interactionId: pinned,
      actor: asMember(),
      options: { strings: { description: 'ran five kilometres' } },
    });
    const replay = await h.dispatch({
      commandName: 'win',
      interactionId: pinned,
      actor: asMember(),
      options: { strings: { description: 'ran five kilometres' } },
    });

    expect(first.responder.visibleText).toContain('+10 points');
    expect(replay.responder.visibleText).toContain('already recorded');
    expect(
      h.messaging.sent.filter((sent) =>
        sent.message.content?.includes('ran five kilometres'),
      ),
    ).toHaveLength(1);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(
      POINT_AWARDS.small_win,
    );
  });

  it('refuses an empty description', async () => {
    const result = await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: '   ' } },
    });

    expect(result.responder.visibleText).toContain('few words');
    expect(h.repositories.rewards.events).toHaveLength(0);
  });
});

describe('ranks', () => {
  it('derives rank from the balance rather than storing one', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const profile = await h.deps.rewards.profile(TEST_GUILD_ID, member);
    expect(profile.rank).toBe(rankForPoints(profile.balance));
  });

  it('announces a rank only when the balance crosses a threshold', async () => {
    const firstBloom = RANK_THRESHOLDS[1];
    expect(firstBloom).toBeDefined();

    // Sit one point below the threshold, then cross it with a check-in.
    await h.repositories.rewards.award({
      guildId: TEST_GUILD_ID,
      userId: member,
      kind: 'manual_award',
      points: firstBloom!.minPoints - 1,
      reason: 'test setup',
      awardedBy: other,
      idempotencyKey: 'setup-1',
    });

    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });
    expect(result.responder.visibleText).toContain('First Bloom');

    // And not again the next day, when nothing has changed.
    now = new Date('2026-03-13T09:00:00.000Z');
    const next = await h.dispatch({ commandName: 'checkin', actor: asMember() });
    expect(next.responder.visibleText).not.toContain('First Bloom');
  });

  it('is calm about it', async () => {
    await h.repositories.rewards.award({
      guildId: TEST_GUILD_ID,
      userId: member,
      kind: 'manual_award',
      points: 49,
      reason: 'test setup',
      awardedBy: other,
      idempotencyKey: 'setup-2',
    });

    const text = (await h.dispatch({ commandName: 'checkin', actor: asMember() }))
      .responder.visibleText;

    expect(text).not.toContain('!');
    expect(text).not.toMatch(/\b[A-Z]{3,}\b/);
    expect(text.toLowerCase()).not.toContain('congratulations');
  });
});

describe('/companion profile and rank', () => {
  it('shows a member their balance, rank and streak', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'profile',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('Seedling');
    expect(result.responder.visibleText).toContain('points to First Bloom');
    expect(result.responder.deferredEphemeral).toBe(true);
  });

  it('admits when rewards are off instead of showing an empty economy', async () => {
    h = harness({ rewards: false });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'profile',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('switched off');
  });

  it('lets a member look someone else up, without exposing anything private', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember(other) });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'profile',
      actor: asMember(),
      options: {
        users: { member: { id: other, username: 'other', isBot: false } },
      },
    });

    // Points and rank are visible; nothing else about them is.
    expect(result.responder.visibleText).toContain('Seedling');
    expect(result.responder.visibleText).not.toContain(
      'check-ins in the last 30 days.\nmood',
    );
  });
});

describe('/companion leaderboard', () => {
  it('ranks by points earned in the period', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember(other) });
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'a win' } },
    });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'leaderboard',
      actor: asMember(),
    });

    const text = result.responder.visibleText;
    expect(text).toContain('last 7 days');
    // The member with a win outranks the one with only a check-in.
    expect(text.indexOf(member)).toBeLessThan(text.indexOf(other));
  });

  it('is short, and marks the viewer', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'leaderboard',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('← you');
    expect(result.responder.visibleText.split('\n').length).toBeLessThan(15);
  });

  it('says so plainly when nobody has earned anything yet', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'leaderboard',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('No points have been earned');
  });

  it('offers no all-time period', () => {
    /*
     * An all-time board ranks longevity, never changes at the top, and tells a
     * member who joined last week that they cannot win. The absence is the
     * design, so it is asserted rather than left to be re-added by someone
     * who assumes it was an oversight.
     */
    const spec = companionCommandSpecs.find((entry) => entry.name === 'companion');
    expect(spec).toBeDefined();
    if (!spec || !isSlashCommandSpec(spec)) throw new Error('unreachable');

    const leaderboard = spec.subcommands?.find((sub) => sub.name === 'leaderboard');
    const period = leaderboard?.options?.find((option) => option.name === 'period');
    const values = (period?.choices ?? []).map((choice) => choice.value);

    expect(values).toEqual(['week', 'month']);
  });
});
