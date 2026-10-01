import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { BOT_REPOSITORY_CAPABILITIES } from '@bloom/database';
import type { ReferralTrigger } from '@bloom/database';
import type { UserId } from '@bloom/shared-types';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import {
  AWARD_DEFINITIONS,
  RESERVED_DEFINITIONS,
  type AwardContext,
  type AwardDefinition,
} from './definitions.js';

/**
 * Phase 2 of the recognition system.
 *
 * The engine was already here and already correct about the hard part
 * (exactly-once under concurrency, arbitrated by a primary key). What these
 * tests defend is everything that was *added* around it, and two product
 * decisions that are easier to erode than to defend:
 *
 *   1. **No award pays points.** The machinery to pay one exists and is
 *      exercised below with a definition that only exists in this file. The
 *      shipped set pays nothing, and a test asserts that directly, so turning
 *      it on means deleting an assertion rather than not noticing.
 *   2. **Reserved awards cannot be earned.** Three awards are named and
 *      deliberately unreachable because the data lives behind a boundary
 *      Companion must not cross. They have no `earned` function at all, which
 *      is checked here as a shape rather than trusted as a convention.
 */

const member = TEST_USER_IDS.member;
const inviter = TEST_USER_IDS.member;

let h: CompanionHarness;
let now = new Date('2026-03-12T14:00:00.000Z');

const asMember = (userId = member): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });

function harness(options: Parameters<typeof companionHarness>[0] = {}): CompanionHarness {
  return companionHarness({ now: () => now, ...options });
}

/** A paid referral row, which is the only state the award counts. */
function paidReferral(
  index: number,
  state: ReferralTrigger['state'] = 'paid',
): ReferralTrigger {
  // String concatenation, never arithmetic: an 18-digit id exceeds
  // Number.MAX_SAFE_INTEGER and would collapse to one value for every index.
  const referred = `92200000000000${String(1000 + index)}` as UserId;
  return {
    id: `trigger-${String(index)}`,
    guildId: TEST_GUILD_ID,
    referredUserId: referred,
    inviterUserId: inviter,
    inviteCode: `code${String(index)}`,
    source: 'invite_diff',
    state,
    rejectedReason: null,
    claimedAt: now,
    claimedBy: 'test',
    attempts: 1,
    pointEventId: null,
    idempotencyKey: `referral:${TEST_GUILD_ID}:${referred}`,
    correlationId: null,
    createdAt: now,
    qualifiedAt: now,
    consumedAt: state === 'paid' ? now : null,
  };
}

function seedReferrals(count: number, state: ReferralTrigger['state'] = 'paid'): void {
  for (let index = 0; index < count; index += 1) {
    h.repositories.referrals.triggers.push(paidReferral(index, state));
  }
}

const emptyContext: AwardContext = {
  participation: { checkIns: 0, wins: 0, months: 0, daysWithBoth: 0, longestGapDays: 0 },
  qualifiedReferrals: 0,
};

beforeEach(() => {
  now = new Date('2026-03-12T14:00:00.000Z');
  h = harness();
});

describe('the definition set', () => {
  it('has unique keys in a fixed order', () => {
    const keys = AWARD_DEFINITIONS.map((definition) => definition.key);

    expect(new Set(keys).size).toBe(keys.length);
    // Pinned in full. Evaluation walks this array in order, so the order is
    // behaviour: it decides which of two simultaneously-earned awards is
    // announced first, and a reshuffle would be a silent UX change.
    expect(keys).toEqual([
      'milestone.checkins.1',
      'milestone.checkins.10',
      'milestone.checkins.30',
      'milestone.checkins.50',
      'milestone.checkins.100',
      'milestone.checkins.250',
      'milestone.wins.1',
      'milestone.wins.10',
      'milestone.wins.50',
      'achievement.referrals.1',
      'achievement.referrals.5',
      'achievement.returned',
      'achievement.both_in_a_day',
      'achievement.six_months',
    ]);
  });

  it('uses keys the database will accept', () => {
    // The CHECK constraint on member_awards.award_key. A definition that
    // violates it fails at grant time in production and nowhere else.
    const pattern = /^[a-z][a-z0-9_.]{2,60}$/;
    for (const definition of [...AWARD_DEFINITIONS, ...RESERVED_DEFINITIONS]) {
      expect(definition.key, definition.key).toMatch(pattern);
    }
  });

  it('classifies every definition', () => {
    for (const definition of AWARD_DEFINITIONS) {
      expect(['participation', 'community']).toContain(definition.category);
      expect(['common', 'uncommon', 'rare']).toContain(definition.tier);
      expect(['participation', 'referrals']).toContain(definition.source);
      expect(definition.condition.length).toBeGreaterThan(0);
      expect(definition.earnedLine.length).toBeGreaterThan(0);
    }
  });

  it('ships no award that pays points', () => {
    /*
     * The product rule, asserted on the shipped data rather than on the code
     * that would pay. "Recognition is not currency": a milestone derived from
     * a count of paid actions that itself paid points is a feedback loop.
     *
     * The payment path below is fully tested with an injected definition, so
     * this assertion is the switch, not the absence of a feature.
     */
    for (const definition of AWARD_DEFINITIONS) {
      expect(definition.points, definition.key).toBeUndefined();
    }
  });

  it('never marks an award repeatable', () => {
    // member_awards is keyed (guild_id, user_id, award_key), so a second
    // grant is refused by the primary key. The type says `false`; this says
    // the data agrees.
    for (const definition of AWARD_DEFINITIONS) {
      expect(definition.repeatable ?? false).toBe(false);
    }
  });

  it('has no award for an unbroken streak', () => {
    /*
     * Deliberately omitted, and pinned so it stays omitted.
     *
     * A "seven consecutive check-ins" award makes a missed day into a loss,
     * which turns a wellbeing check-in into an obligation — the exact
     * dynamic this community is built to avoid. The nearest thing that does
     * exist rewards the opposite: `achievement.returned` is earned by coming
     * back after a month away.
     */
    const streakish = AWARD_DEFINITIONS.filter(
      (definition) =>
        /streak|consecutive|perfect|unbroken|daily/i.test(definition.key) ||
        /streak|consecutive|in a row|every day|perfect/i.test(definition.condition),
    );

    expect(streakish).toEqual([]);
    expect(AWARD_DEFINITIONS.map((d) => d.key)).toContain('achievement.returned');
  });

  it('slots the thirty-day milestone between ten and fifty', () => {
    const keys = AWARD_DEFINITIONS.map((definition) => definition.key);

    expect(keys.indexOf('milestone.checkins.30')).toBeGreaterThan(
      keys.indexOf('milestone.checkins.10'),
    );
    expect(keys.indexOf('milestone.checkins.30')).toBeLessThan(
      keys.indexOf('milestone.checkins.50'),
    );
  });
});

describe('reserved definitions', () => {
  it('cannot be evaluated, because they have no criterion', () => {
    for (const reserved of RESERVED_DEFINITIONS) {
      // Not a flag that evaluation has to remember to honour — there is no
      // function to call. The only way to grant one is to write new code.
      expect('earned' in reserved).toBe(false);
      expect(reserved.blockedBy.length).toBeGreaterThan(20);
    }
  });

  it('is disjoint from the evaluable set', () => {
    const live = new Set(AWARD_DEFINITIONS.map((definition) => definition.key));
    for (const reserved of RESERVED_DEFINITIONS) {
      expect(live.has(reserved.key)).toBe(false);
    }
  });

  it('reserves feedback, bug reports and events', () => {
    expect(RESERVED_DEFINITIONS.map((reserved) => reserved.key)).toEqual([
      'achievement.feedback.1',
      'achievement.bugs.1',
      'achievement.events.1',
    ]);
  });

  it('is never granted, however much a member does', async () => {
    seedReferrals(10);
    for (let day = 0; day < 3; day += 1) {
      now = new Date(Date.UTC(2026, 2, 1 + day, 9, 0, 0));
      await h.dispatch({ commandName: 'checkin', actor: asMember() });
      await h.dispatch({
        commandName: 'win',
        actor: asMember(),
        options: { strings: { description: 'a good thing happened' } },
      });
    }

    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    for (const reserved of RESERVED_DEFINITIONS) {
      expect(held.has(reserved.key)).toBe(false);
    }
  });
});

describe('referral achievements', () => {
  it('grants the first-introduction award once a referral is paid', async () => {
    seedReferrals(1);

    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('achievement.referrals.1')).toBe(true);
    expect(held.has('achievement.referrals.5')).toBe(false);
  });

  it('counts only paid referrals, not pending or rejected ones', async () => {
    seedReferrals(3, 'pending');
    seedReferrals(2, 'rejected');

    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('achievement.referrals.1')).toBe(false);
  });

  it('records the count it rested on as evidence', async () => {
    seedReferrals(5);

    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const awards = await h.repositories.awards.list(TEST_GUILD_ID, member);
    const five = awards.find((award) => award.awardKey === 'achievement.referrals.5');
    expect(five?.evidence).toEqual({ qualifiedReferrals: 5, threshold: 5 });
  });

  it('grants each referral award exactly once across repeated evaluation', async () => {
    seedReferrals(5);

    for (let day = 0; day < 4; day += 1) {
      now = new Date(Date.UTC(2026, 2, 1 + day, 9, 0, 0));
      await h.dispatch({ commandName: 'checkin', actor: asMember() });
    }

    const awards = await h.repositories.awards.list(TEST_GUILD_ID, member);
    const referralAwards = awards.filter((award) =>
      award.awardKey.startsWith('achievement.referrals.'),
    );
    expect(referralAwards).toHaveLength(2);

    const granted = h.repositories.audit.events.filter((entry) => {
      const award = entry.details?.['award'];
      return (
        entry.event === 'awards.granted' &&
        typeof award === 'string' &&
        award.startsWith('achievement.referrals.')
      );
    });
    expect(granted).toHaveLength(2);
  });

  it('refuses to earn on a referral count that was never loaded', () => {
    /*
     * Null means "we did not look", which is not the same as zero. A
     * criterion that treated it as zero would be harmless here and wrong the
     * day the comparison is inverted, so the distinction is pinned.
     */
    const definition = AWARD_DEFINITIONS.find(
      (candidate) => candidate.key === 'achievement.referrals.1',
    );
    expect(definition).toBeDefined();
    expect(definition?.earned({ ...emptyContext, qualifiedReferrals: null })).toBe(false);
    expect(definition?.earned({ ...emptyContext, qualifiedReferrals: 1 })).toBe(true);
  });
});

describe('loading only the data a pending award needs', () => {
  it('reads referrals when a referral award is still outstanding', async () => {
    const spy = vi.spyOn(h.repositories.referrals, 'countPaidForInviter');

    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not read referrals once every referral award is held', async () => {
    seedReferrals(5);
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const spy = vi.spyOn(h.repositories.referrals, 'countPaidForInviter');
    now = new Date(Date.UTC(2026, 2, 13, 9, 0, 0));
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    // Both referral awards are held, so nothing pending declares that
    // source and the query is skipped entirely.
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('progress', () => {
  it('reports how far along a countable award is', async () => {
    for (let day = 0; day < 3; day += 1) {
      now = new Date(Date.UTC(2026, 2, 1 + day, 9, 0, 0));
      await h.dispatch({ commandName: 'checkin', actor: asMember() });
    }

    const entries = await h.deps.awards.progress(TEST_GUILD_ID, member, 'milestone');
    const ten = entries.find((entry) => entry.definition.key === 'milestone.checkins.10');

    expect(ten?.award).toBeNull();
    expect(ten?.measure).toEqual({ current: 3, target: 10 });
  });

  it('reports no measure for an award already held', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const entries = await h.deps.awards.progress(TEST_GUILD_ID, member, 'milestone');
    const first = entries.find(
      (entry) => entry.definition.key === 'milestone.checkins.1',
    );

    expect(first?.award).not.toBeNull();
    expect(first?.measure).toBeNull();
  });

  it('reports no measure for a criterion that is not a count', async () => {
    const entries = await h.deps.awards.progress(TEST_GUILD_ID, member, 'achievement');
    const returned = entries.find(
      (entry) => entry.definition.key === 'achievement.returned',
    );

    // "Came back after a month away" is not 40% done after twelve days. A
    // fraction here would be an invented quantity.
    expect(returned?.measure).toBeNull();
  });

  it('shows the fraction to the member', async () => {
    for (let day = 0; day < 4; day += 1) {
      now = new Date(Date.UTC(2026, 2, 1 + day, 9, 0, 0));
      await h.dispatch({ commandName: 'checkin', actor: asMember() });
    }

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'milestones',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('4 of 10');
  });
});

describe('the point-reward path', () => {
  /**
   * A definition that pays. It exists only in this file — see the assertion
   * above that no shipped definition does — and is injected so the payment
   * machinery is proven rather than assumed.
   */
  const payingDefinition: AwardDefinition = {
    key: 'milestone.test.paid',
    kind: 'milestone',
    name: 'Paid Test Award',
    category: 'participation',
    tier: 'common',
    source: 'participation',
    condition: 'Check in once.',
    earnedLine: 'A test award that pays.',
    points: 25,
    earned: (context) => context.participation.checkIns >= 1,
    evidence: (context) => ({ checkIns: context.participation.checkIns }),
  };

  beforeEach(() => {
    h = harness({ awardDefinitions: [payingDefinition] });
  });

  it('pays through the ledger, not by touching a balance', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const rewards = h.repositories.rewards.events.filter(
      (event) => event.kind === 'achievement_reward',
    );
    expect(rewards).toHaveLength(1);
    expect(rewards[0]?.points).toBe(25);
    // Automatic kinds carry no actor and no reason text; the award key in
    // the audit row is the record.
    expect(rewards[0]?.awardedBy).toBeNull();
    expect(rewards[0]?.reason).toBeNull();
  });

  it('keys the payment on the award, so a retry cannot pay twice', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const event = h.repositories.rewards.events.find(
      (candidate) => candidate.kind === 'achievement_reward',
    );
    expect(event?.idempotencyKey).toBe(
      `achievement:${TEST_GUILD_ID}:${member}:milestone.test.paid`,
    );

    // Replaying the payment with the same key is absorbed by the ledger.
    const replay = await h.deps.rewards.awardAchievement({
      guildId: TEST_GUILD_ID,
      userId: member,
      awardKey: 'milestone.test.paid',
      points: 25,
    });
    expect(replay).toMatchObject({ kind: 'paid', alreadyPaid: true });
    expect(
      h.repositories.rewards.events.filter(
        (candidate) => candidate.kind === 'achievement_reward',
      ),
    ).toHaveLength(1);
  });

  it('audits the payment separately from the grant', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const payment = h.repositories.audit.events.find(
      (entry) => entry.event === 'rewards.achievement',
    );
    expect(payment).toBeDefined();
    expect(payment?.severity).toBe('info');
    expect(payment?.details).toMatchObject({
      points: 25,
      award: 'milestone.test.paid',
    });

    expect(
      h.repositories.audit.events.some((entry) => entry.event === 'awards.granted'),
    ).toBe(true);
  });

  it('does not pay again when the award is already held', async () => {
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    now = new Date(Date.UTC(2026, 2, 13, 9, 0, 0));
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(
      h.repositories.rewards.events.filter(
        (event) => event.kind === 'achievement_reward',
      ),
    ).toHaveLength(1);
  });

  it('refuses a non-positive reward', async () => {
    await expect(
      h.deps.rewards.awardAchievement({
        guildId: TEST_GUILD_ID,
        userId: member,
        awardKey: 'milestone.test.paid',
        points: 0,
      }),
    ).rejects.toThrow();
  });

  it('pays nothing for a definition with no points', async () => {
    const { points: _points, ...unpaid } = payingDefinition;
    h = harness({ awardDefinitions: [unpaid] });

    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'achievement_reward'),
    ).toBe(false);
    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('milestone.test.paid')).toBe(true);
  });
});

describe('staff progression view', () => {
  it('shows what the member is closest to earning', async () => {
    // One paid referral, so the first-introduction award is earned rather
    // than sitting one away and tying with the ten-day milestone.
    seedReferrals(1);
    for (let day = 0; day < 9; day += 1) {
      now = new Date(Date.UTC(2026, 2, 1 + day, 9, 0, 0));
      await h.dispatch({ commandName: 'checkin', actor: asMember() });
    }
    // And one win, so the first-win milestone is earned rather than also
    // sitting one away. What is left outstanding now has a unique nearest.
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'a good thing happened' } },
    });

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'member',
      actor: testSubject({
        userId: TEST_USER_IDS.administrator,
        roles: ['administrator'],
      }),
      options: { users: { member: { id: member, username: 'member', isBot: false } } },
    });

    // Nine check-ins: one away from the ten-day milestone, which is nearer
    // than anything else outstanding (four more referrals, twenty-one more
    // days, and so on).
    expect(result.responder.visibleText).toContain('Next up');
    expect(result.responder.visibleText).toContain('Ten Days');
    expect(result.responder.visibleText).toContain('1 to go');
  });

  it('counts the new milestone in the staff totals', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'member',
      actor: testSubject({
        userId: TEST_USER_IDS.administrator,
        roles: ['administrator'],
      }),
      options: { users: { member: { id: member, username: 'member', isBot: false } } },
    });

    // Six check-in milestones plus three win milestones.
    expect(result.responder.visibleText).toContain('0 of 9');
    // Five achievements: two referral, three participation.
    expect(result.responder.visibleText).toContain('0 of 5');
  });
});

describe('boundaries', () => {
  it('earns referral awards without widening what Companion can read', () => {
    /*
     * The referral count comes from `referral_triggers`, which Companion
     * already consumes to pay referrals. Adding two awards on top of it must
     * not have cost a capability — if it had, the cheaper-looking option
     * would have been to reach into Guardian's invite data instead.
     */
    const companion = [...BOT_REPOSITORY_CAPABILITIES.companion].sort();

    expect(companion).toEqual([
      'audit',
      'awards',
      'cooldowns',
      'idempotency',
      'jobs',
      'referrals',
      'rewards',
      'settings',
      'telemetry',
    ]);
  });

  it('still cannot read the labs tables the reserved awards would need', () => {
    /*
     * This is the whole reason feedback and bug-report awards are reserved
     * rather than implemented. Granting Companion the `labs` capability to
     * count someone's bug reports would hand the wellbeing bot read access
     * to every beta report in the server, which is a far larger change than
     * the award is worth.
     */
    expect(BOT_REPOSITORY_CAPABILITIES.companion).not.toContain('labs');
    expect(BOT_REPOSITORY_CAPABILITIES.companion).not.toContain('cases');
    expect(BOT_REPOSITORY_CAPABILITIES.companion).not.toContain('onboarding');
  });
});
