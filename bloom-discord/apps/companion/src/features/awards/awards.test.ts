import { beforeEach, describe, expect, it } from 'vitest';
import { MANUAL_AWARD_LIMIT } from '@bloom/shared-types';
import type { ParticipationSummary } from '@bloom/database';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import { ACHIEVEMENTS, AWARD_DEFINITIONS, MILESTONES } from './definitions.js';

/**
 * Milestones and achievements.
 *
 * Two things under test. That an award is granted exactly once, on real
 * counts — and that the set of awards does not quietly acquire the kind that
 * punishes a missed day, which is the failure this feature is most likely to
 * drift into.
 */

let h: CompanionHarness;
let now = new Date('2026-03-12T14:00:00.000Z');

const member = TEST_USER_IDS.member;
const admin = TEST_USER_IDS.administrator;

const asMember = (userId = member): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: admin, roles: ['administrator'] });

function harness(options: Parameters<typeof companionHarness>[0] = {}): CompanionHarness {
  return companionHarness({ now: () => now, ...options });
}

/** Check in across `days` consecutive days from the fixed start. */
async function checkInFor(days: number): Promise<void> {
  for (let day = 0; day < days; day += 1) {
    now = new Date(Date.UTC(2026, 2, 1 + day, 9, 0, 0));
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
  }
}

beforeEach(() => {
  now = new Date('2026-03-12T14:00:00.000Z');
  h = harness();
});

describe('the definitions themselves', () => {
  it('grants nothing for a perfect run', () => {
    /*
     * The rule from Phase 5 is that a streak pays nothing, so that missing a
     * day costs nothing. A permanent badge for an unbroken run would hand that
     * cost straight back — and unlike points, a badge is visible to everyone
     * else. The Bloom app has streak achievements and is right to; a social
     * space is a different question.
     */
    for (const definition of AWARD_DEFINITIONS) {
      const text =
        `${definition.key} ${definition.name} ${definition.condition}`.toLowerCase();
      for (const forbidden of [
        'streak',
        'in a row',
        'consecutive',
        'every day',
        'perfect',
      ]) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it('is calm, like everything else Companion says', () => {
    for (const definition of AWARD_DEFINITIONS) {
      const text = `${definition.name} ${definition.condition} ${definition.earnedLine}`;
      expect(text).not.toContain('!');
      expect(text).not.toMatch(/\b[A-Z]{3,}\b/);
    }
  });

  it('keeps every key unique and stable in shape', () => {
    const keys = AWARD_DEFINITIONS.map((definition) => definition.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      // The same CHECK the migration applies. A key that the database would
      // reject should fail here rather than at 09:00 in production.
      expect(key).toMatch(/^[a-z][a-z0-9_.]{2,60}$/);
    }
  });

  it('stays a short list', () => {
    // A wall of badges is a collection game. If this ever needs raising, it
    // should be a decision rather than a drift.
    expect(AWARD_DEFINITIONS.length).toBeLessThanOrEqual(15);
    expect(MILESTONES.length).toBeGreaterThan(0);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it('earns each award from counts alone', () => {
    const empty: ParticipationSummary = {
      checkIns: 0,
      wins: 0,
      months: 0,
      daysWithBoth: 0,
      longestGapDays: 0,
    };
    const everything: ParticipationSummary = {
      checkIns: 1_000,
      wins: 1_000,
      months: 24,
      daysWithBoth: 100,
      longestGapDays: 90,
    };

    // Nothing is granted to someone who has done nothing, and nothing is
    // unreachable for someone who has done everything.
    for (const definition of AWARD_DEFINITIONS) {
      expect(definition.earned(empty)).toBe(false);
      expect(definition.earned(everything)).toBe(true);
    }
  });
});

describe('granting', () => {
  it('grants the first check-in milestone on the first check-in', async () => {
    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(result.responder.visibleText).toContain('First Check-in');
    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('milestone.checkins.1')).toBe(true);
  });

  it('announces it in the milestones channel', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const announced = h.messaging.sent.find(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.milestones,
    );
    expect(announced).toBeDefined();
    expect(JSON.stringify(announced?.message)).toContain('First Check-in');
  });

  it('grants and announces each award exactly once', async () => {
    await checkInFor(3);

    const announcements = h.messaging.sent.filter(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.milestones,
    );
    expect(announcements).toHaveLength(1);
    expect(h.repositories.awards.awards.size).toBe(1);
  });

  it('grants the next milestone when its count is reached, and not before', async () => {
    await checkInFor(9);
    let held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('milestone.checkins.10')).toBe(false);

    await checkInFor(10);
    held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('milestone.checkins.10')).toBe(true);
  });

  it('records the evidence the grant was based on', async () => {
    await checkInFor(10);

    const awards = await h.repositories.awards.list(TEST_GUILD_ID, member);
    const tenDays = awards.find((award) => award.awardKey === 'milestone.checkins.10');
    // Re-derivable months later, even if the threshold is retuned.
    expect(tenDays?.evidence).toMatchObject({ checkIns: 10, threshold: 10 });
  });

  it('grants a win milestone from a shared win', async () => {
    const result = await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'finally booked the appointment' } },
    });

    expect(result.responder.visibleText).toContain('First Win');
    const announced = h.messaging.sent.filter(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.milestones,
    );
    expect(announced).toHaveLength(1);
  });

  it('still grants the award when there is nowhere to announce it', async () => {
    h = harness({ milestonesChannel: null });

    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    // The member is told in their own reply; the server simply is not.
    expect(result.responder.visibleText).toContain('First Check-in');
    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('milestone.checkins.1')).toBe(true);
    expect(h.messaging.sent).toHaveLength(0);
  });

  it('writes an audit row with no actor', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const entry = h.repositories.audit.events.find(
      (event) => event.event === 'awards.granted',
    );
    // Nobody granted it. The records did.
    expect(entry?.actorId).toBeNull();
    expect(entry?.details).toMatchObject({ award: 'milestone.checkins.1' });
  });

  it('does not grant anything when rewards are off but participation continues', async () => {
    /*
     * Milestones count actions, not points, so they are deliberately unaffected
     * by FEATURE_REWARDS: a member who checked in fifty times did that whether
     * or not the server was paying for it.
     */
    h = harness({ rewards: false });
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('milestone.checkins.1')).toBe(true);
  });
});

describe('/companion milestones and achievements', () => {
  it('shows what is earned and what is not', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'milestones',
      actor: asMember(),
    });

    const text = result.responder.visibleText;
    expect(text).toContain('1 of ');
    // Unearned ones are listed with their condition, not hidden.
    expect(text).toContain('Check in on 10 days.');
    expect(result.responder.deferredEphemeral).toBe(true);
  });

  it('says plainly that awards pay nothing', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'milestones',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('none of them award points');
  });

  it('says there is nothing here for a perfect run', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'achievements',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('Missing a day never costs you one');
  });
});

describe('/companion admin award', () => {
  const awardOptions = (points: number, reason = 'ran the community call') => ({
    users: { member: { id: member, username: 'member', isBot: false } },
    integers: { points },
    strings: { reason },
  });

  it('lets an administrator award points', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(50),
    });

    expect(result.responder.visibleText).toContain('Added 50 points');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(50);
  });

  it('refuses a moderator', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] }),
      options: awardOptions(50),
    });

    // Changing a member's standing in a shared economy is not moderation.
    expect(result.responder.visibleText).toContain('Not available to you');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(0);
  });

  it('records the actor and the reason in the ledger', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(50, 'hosted the Tuesday call'),
    });

    const entry = h.repositories.rewards.events.at(-1);
    expect(entry?.kind).toBe('manual_award');
    expect(entry?.awardedBy).toBe(admin);
    expect(entry?.reason).toBe('hosted the Tuesday call');
  });

  it('records a negative amount as an adjustment, not an award', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(100, 'setup'),
    });
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(-40, 'awarded twice by mistake'),
    });

    expect(result.responder.visibleText).toContain('Removed 40 points');
    expect(h.repositories.rewards.events.at(-1)?.kind).toBe('adjustment');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(60);
  });

  it('refuses a correction that would overdraw', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(-40, 'too much'),
    });

    expect(result.responder.visibleText).toContain('below zero');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(0);
  });

  it('refuses an amount past the single-award cap', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(MANUAL_AWARD_LIMIT + 1),
    });

    expect(result.responder.visibleText).toContain('capped at');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, member)).toBe(0);
  });

  it('requires a reason', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(50, '   '),
    });

    expect(result.responder.visibleText).toContain('Give a reason');
    expect(h.repositories.rewards.events).toHaveLength(0);
  });

  it('audits at warn severity', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: asAdmin(),
      options: awardOptions(50),
    });

    const entry = h.repositories.audit.events.find(
      (event) => event.event === 'rewards.manual_award',
    );
    // Quiet, unilateral, and it changes how a member is seen by everyone else.
    expect(entry?.severity).toBe('warn');
    expect(entry?.actorId).toBe(admin);
  });
});
