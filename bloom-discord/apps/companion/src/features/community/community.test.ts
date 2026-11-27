import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { BOT_REPOSITORY_CAPABILITIES } from '@bloom/database';
import type { UserId } from '@bloom/shared-types';
import { MODERATOR_STAFF_CAPABILITIES } from '@bloom/permissions';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import { ACTIVITY_REWARD_LIMIT, completionIdempotencyKey } from './rules.js';

/**
 * Challenges and events.
 *
 * The properties worth defending here are the ones that cost money or trust:
 * a member is paid exactly once, a capacity is never oversubscribed however
 * the joins interleave, a moderator cannot create something that pays, and a
 * completion that fails to pay is recoverable rather than lost.
 */

const member = TEST_USER_IDS.member;
const other = TEST_USER_IDS.newcomer;
const admin = TEST_USER_IDS.administrator;
const moderator = TEST_USER_IDS.moderator;

let h: CompanionHarness;
let now = new Date('2026-03-12T09:00:00.000Z');

const asMember = (userId: UserId = member): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: admin, roles: ['administrator'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: moderator, roles: ['moderator'] });

beforeEach(() => {
  now = new Date('2026-03-12T09:00:00.000Z');
  h = companionHarness({ now: () => now });
});

/** Create an activity through the real staff command. */
async function createEvent(
  options: {
    capacity?: number;
    reward?: number;
    lengthDays?: number;
    startsInMinutes?: number;
    achievement?: string;
    title?: string;
  } = {},
): Promise<string> {
  const result = await h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'admin',
    subcommand: 'event-create',
    actor: asAdmin(),
    options: {
      strings: {
        title: options.title ?? 'Garden hours',
        description: 'An hour together, cameras optional.',
        ...(options.achievement ? { achievement: options.achievement } : {}),
      },
      integers: {
        length_days: options.lengthDays ?? 7,
        ...(options.capacity === undefined ? {} : { capacity: options.capacity }),
        ...(options.reward === undefined ? {} : { reward: options.reward }),
        ...(options.startsInMinutes === undefined
          ? {}
          : { starts_in_minutes: options.startsInMinutes }),
      },
    },
  });
  return extractId(result.responder.visibleText);
}

async function createChallenge(
  options: {
    metric?: string;
    target?: number;
    reward?: number;
    lengthDays?: number;
    startsInMinutes?: number;
    achievement?: string;
  } = {},
): Promise<string> {
  const result = await h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'admin',
    subcommand: 'challenge-create',
    actor: asAdmin(),
    options: {
      strings: {
        title: 'Three quiet mornings',
        description: 'Check in on three days this week.',
        metric: options.metric ?? 'check_ins',
        ...(options.achievement ? { achievement: options.achievement } : {}),
      },
      integers: {
        target: options.target ?? 3,
        length_days: options.lengthDays ?? 7,
        ...(options.reward === undefined ? {} : { reward: options.reward }),
        ...(options.startsInMinutes === undefined
          ? {}
          : { starts_in_minutes: options.startsInMinutes }),
      },
    },
  });
  return extractId(result.responder.visibleText);
}

/** The staff reply prints the id in a code span. */
function extractId(text: string): string {
  const match = /activity-\d+/.exec(text);
  if (!match) throw new Error(`no activity id in: ${text}`);
  return match[0];
}

async function checkInOn(day: number, userId: UserId = member): Promise<void> {
  now = new Date(Date.UTC(2026, 2, 12 + day, 9, 0, 0));
  await h.dispatch({ commandName: 'checkin', actor: asMember(userId) });
}

/* ========================================================================== *
 * Challenges
 * ========================================================================== */

describe('challenges', () => {
  it('creates one, announces it once, and audits the creation', async () => {
    const id = await createChallenge({ reward: 40 });

    const activity = await h.repositories.community.byId(TEST_GUILD_ID, id);
    expect(activity?.kind).toBe('challenge');
    expect(activity?.targetMetric).toBe('check_ins');
    expect(activity?.targetAmount).toBe(3);
    expect(activity?.rewardPoints).toBe(40);
    expect(activity?.status).toBe('open');
    expect(activity?.createdBy).toBe(admin);

    // One public post, not one per member.
    expect(h.messaging.sent).toHaveLength(1);

    const audit = h.repositories.audit.events.find(
      (event) => event.event === 'community.created',
    );
    // Warn: a person authorised something that can pay points.
    expect(audit?.severity).toBe('warn');
    expect(audit?.details).toMatchObject({ kind: 'challenge', reward_points: 40 });
  });

  it('lists challenges for staff, ephemerally', async () => {
    await createChallenge();

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-list',
      actor: asAdmin(),
      options: {},
    });

    expect(result.responder.visibleText).toContain('Three quiet mornings');
    expect(result.responder.messages[0]?.ephemeral).toBe(true);
  });

  it('completes when the member crosses the target, and pays once', async () => {
    await createChallenge({ target: 3, reward: 40 });

    await checkInOn(0);
    await checkInOn(1);
    expect(
      h.repositories.rewards.events.filter(
        (event) => event.kind === 'challenge_completion',
      ),
    ).toHaveLength(0);

    await checkInOn(2);

    const paid = h.repositories.rewards.events.filter(
      (event) => event.kind === 'challenge_completion',
    );
    expect(paid).toHaveLength(1);
    expect(paid[0]?.points).toBe(40);
    expect(paid[0]?.awardedBy).toBeNull();
  });

  it('does not pay a second time on later check-ins', async () => {
    await createChallenge({ target: 2, reward: 40 });

    for (let day = 0; day < 5; day += 1) await checkInOn(day);

    expect(
      h.repositories.rewards.events.filter(
        (event) => event.kind === 'challenge_completion',
      ),
    ).toHaveLength(1);
    expect(
      h.repositories.audit.events.filter(
        (event) => event.event === 'community.completed',
      ),
    ).toHaveLength(1);
  });

  it('pays once when two evaluations race for the same completion', async () => {
    /*
     * The race the `already_completed` guard exists for. Both evaluations
     * read the member's held set before either has written, so both pass the
     * "already done?" filter and both reach the completion claim. Exactly one
     * may win; the loser must pay nothing and audit nothing, or a member
     * acting twice in the same instant would be paid twice and the ledger
     * would carry a completion the activity never recorded.
     *
     * Uses a referral-metric challenge so that nothing has evaluated it yet
     * — a check-in would complete it on the way in and there would be no
     * race left to run.
     */
    h.repositories.referrals.triggers.push({
      id: 'trigger-race',
      guildId: TEST_GUILD_ID,
      referredUserId: '922000000000002001' as UserId,
      inviterUserId: member,
      inviteCode: 'race',
      source: 'invite_diff',
      state: 'paid',
      rejectedReason: null,
      claimedAt: now,
      claimedBy: 'test',
      attempts: 1,
      pointEventId: null,
      idempotencyKey: 'referral:race',
      correlationId: null,
      createdAt: now,
      qualifiedAt: now,
      consumedAt: new Date(Date.UTC(2026, 2, 13, 9, 0, 0)),
    });
    await createChallenge({ metric: 'qualified_referrals', target: 1, reward: 40 });
    now = new Date(Date.UTC(2026, 2, 14, 9, 0, 0));

    await Promise.all([
      h.deps.community.evaluateChallenges({
        guildId: TEST_GUILD_ID,
        userId: member,
        correlationId: 'corr-a' as never,
      }),
      h.deps.community.evaluateChallenges({
        guildId: TEST_GUILD_ID,
        userId: member,
        correlationId: 'corr-b' as never,
      }),
    ]);

    expect(
      h.repositories.rewards.events.filter(
        (event) => event.kind === 'challenge_completion',
      ),
    ).toHaveLength(1);
    expect(
      h.repositories.audit.events.filter(
        (event) => event.event === 'community.completed',
      ),
    ).toHaveLength(1);
  });

  it('keys the payment on the activity and member, not the attempt', async () => {
    const id = await createChallenge({ target: 1, reward: 40 });
    await checkInOn(0);

    const event = h.repositories.rewards.events.find(
      (candidate) => candidate.kind === 'challenge_completion',
    );
    expect(event?.idempotencyKey).toBe(completionIdempotencyKey('challenge', id, member));
  });

  it('counts only activity inside the window', async () => {
    // Two check-ins before the challenge exists.
    await checkInOn(0);
    await checkInOn(1);

    // Starts tomorrow.
    now = new Date(Date.UTC(2026, 2, 14, 9, 0, 0));
    await createChallenge({ target: 2, startsInMinutes: 24 * 60 });

    now = new Date(Date.UTC(2026, 2, 15, 10, 0, 0));
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    // One check-in inside the window, not three. The earlier two predate it.
    const completed = h.repositories.audit.events.filter(
      (event) => event.event === 'community.completed',
    );
    expect(completed).toHaveLength(0);
  });

  it('is not evaluated before it starts or after it ends', async () => {
    await createChallenge({ target: 1, startsInMinutes: 60 * 48 });

    await checkInOn(0);
    expect(
      h.repositories.audit.events.some((event) => event.event === 'community.completed'),
    ).toBe(false);
  });

  it('records the count the completion rested on', async () => {
    const id = await createChallenge({ target: 2 });
    await checkInOn(0);
    await checkInOn(1);

    const record = await h.repositories.community.participant(id, member);
    expect(record?.state).toBe('completed');
    expect(record?.progress).toBe(2);
  });

  it('counts qualified referrals when that is the metric', async () => {
    await createChallenge({ metric: 'qualified_referrals', target: 1, reward: 10 });

    h.repositories.referrals.triggers.push({
      id: 'trigger-1',
      guildId: TEST_GUILD_ID,
      referredUserId: '922000000000001001' as UserId,
      inviterUserId: member,
      inviteCode: 'abc',
      source: 'invite_diff',
      state: 'paid',
      rejectedReason: null,
      claimedAt: now,
      claimedBy: 'test',
      attempts: 1,
      pointEventId: null,
      idempotencyKey: 'referral:x:y',
      correlationId: null,
      createdAt: now,
      qualifiedAt: now,
      consumedAt: new Date(Date.UTC(2026, 2, 13, 9, 0, 0)),
    });

    await checkInOn(2);

    expect(
      h.repositories.rewards.events.some(
        (event) => event.kind === 'challenge_completion',
      ),
    ).toBe(true);
  });

  it('shows members where they are', async () => {
    await createChallenge({ target: 5 });
    await checkInOn(0);
    await checkInOn(1);

    const result = await h.dispatch({
      commandName: 'companion',
      subcommand: 'challenges',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('2 of 5');
    expect(result.responder.messages[0]?.ephemeral).toBe(true);
  });

  it('closes, and refuses to close twice', async () => {
    const id = await createChallenge();

    const first = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-close',
      actor: asAdmin(),
      options: { strings: { id, outcome: 'completed' } },
    });
    expect(first.responder.visibleText).toContain('Closed');

    const second = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-close',
      actor: asAdmin(),
      options: { strings: { id, outcome: 'completed' } },
    });
    expect(second.responder.visibleText).toContain('Check that input');
  });

  it('stops paying once closed', async () => {
    const id = await createChallenge({ target: 1, reward: 40 });

    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-close',
      actor: asAdmin(),
      options: { strings: { id, outcome: 'cancelled' } },
    });

    await checkInOn(0);

    expect(
      h.repositories.rewards.events.some(
        (event) => event.kind === 'challenge_completion',
      ),
    ).toBe(false);
  });
});

/* ========================================================================== *
 * Events
 * ========================================================================== */

describe('events', () => {
  it('creates one and announces it once', async () => {
    const id = await createEvent({ capacity: 10, reward: 20 });

    const activity = await h.repositories.community.byId(TEST_GUILD_ID, id);
    expect(activity?.kind).toBe('event');
    expect(activity?.capacity).toBe(10);
    expect(activity?.targetMetric).toBeNull();
    expect(h.messaging.sent).toHaveLength(1);
  });

  it('lets a member join, and says nothing publicly about it', async () => {
    const id = await createEvent();
    const before = h.messaging.sent.length;

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { id } },
    });

    expect(result.responder.visibleText).toContain('You are in');
    expect(result.responder.messages[0]?.ephemeral).toBe(true);
    // No per-join channel post: fifty people would be fifty messages.
    expect(h.messaging.sent).toHaveLength(before);
  });

  it('treats a second join as already joined, not as a new seat', async () => {
    const id = await createEvent({ capacity: 5 });

    await joinAs(id, member);
    const second = await joinAs(id, member);

    expect(second.responder.visibleText).toContain('Already signed up');
    expect((await h.repositories.community.counts(id)).joined).toBe(1);
  });

  it('lets a member leave and rejoin', async () => {
    const id = await createEvent();

    await joinAs(id, member);
    const left = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'leave',
      actor: asMember(),
      options: { strings: { id } },
    });
    expect(left.responder.visibleText).toContain('Taken off the list');
    expect((await h.repositories.community.counts(id)).joined).toBe(0);

    await joinAs(id, member);
    expect((await h.repositories.community.counts(id)).joined).toBe(1);
  });

  it('reports leaving something you never joined', async () => {
    const id = await createEvent();
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'leave',
      actor: asMember(),
      options: { strings: { id } },
    });
    expect(result.responder.visibleText).toContain('Not signed up');
  });

  it('refuses a join once the window has passed', async () => {
    const id = await createEvent({ lengthDays: 1 });

    now = new Date(Date.UTC(2026, 2, 20, 9, 0, 0));
    const result = await joinAs(id, member);

    expect(result.responder.visibleText).toContain('Closed');
    expect((await h.repositories.community.counts(id)).joined).toBe(0);
  });

  it('refuses a join once staff have closed it', async () => {
    const id = await createEvent();
    await closeEvent(id, 'cancelled');

    const result = await joinAs(id, member);
    expect(result.responder.visibleText).toContain('Closed');
  });

  it('refuses a join when the event is full', async () => {
    const id = await createEvent({ capacity: 1 });

    await joinAs(id, member);
    const result = await joinAs(id, other);

    expect(result.responder.visibleText).toContain('No places left');
    expect((await h.repositories.community.counts(id)).joined).toBe(1);
  });

  it('respects capacity when joins arrive together', async () => {
    /*
     * The race the advisory lock exists for. Six members, three places, all
     * joining in the same tick. The fake repository yields between the seat
     * count and the insert precisely so this interleaves — without
     * serialisation every one of them would read "0 taken" and get a place.
     */
    const id = await createEvent({ capacity: 3 });
    const users: UserId[] = [
      '900000000000010001' as UserId,
      '900000000000010002' as UserId,
      '900000000000010003' as UserId,
      '900000000000010004' as UserId,
      '900000000000010005' as UserId,
      '900000000000010006' as UserId,
    ];

    const results = await Promise.all(
      users.map((userId) =>
        h.deps.community.join({
          guildId: TEST_GUILD_ID,
          activityId: id,
          userId,
          correlationId: 'corr-race' as never,
        }),
      ),
    );

    expect(results.filter((result) => result.kind === 'joined')).toHaveLength(3);
    expect(results.filter((result) => result.kind === 'full')).toHaveLength(3);
    expect((await h.repositories.community.counts(id)).joined).toBe(3);
  });

  it('reopens a place when someone leaves', async () => {
    const id = await createEvent({ capacity: 1 });

    await joinAs(id, member);
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'leave',
      actor: asMember(),
      options: { strings: { id } },
    });

    const result = await joinAs(id, other);
    expect(result.responder.visibleText).toContain('You are in');
  });

  it('shows info including the member’s own standing', async () => {
    const id = await createEvent({ capacity: 4 });
    await joinAs(id, member);

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'info',
      actor: asMember(),
      options: { strings: { id } },
    });

    expect(result.responder.visibleText).toContain('1 of 4 places taken');
    expect(result.responder.visibleText).toContain('You are signed up');
  });

  it('lists events and marks the ones the member joined', async () => {
    const id = await createEvent({ title: 'Garden hours' });
    await joinAs(id, member);

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'list',
      actor: asMember(),
      options: {},
    });

    expect(result.responder.visibleText).toContain('Garden hours');
    expect(result.responder.visibleText).toContain('signed up');
  });

  it('pays everyone who joined when staff complete it', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await joinAs(id, other);

    const result = await closeEvent(id, 'completed');

    expect(result.responder.visibleText).toContain('Paid');
    const paid = h.repositories.rewards.events.filter(
      (event) => event.kind === 'event_completion',
    );
    expect(paid).toHaveLength(2);
    expect(paid.every((event) => event.points === 20)).toBe(true);
  });

  it('pays nobody when staff cancel it', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);

    await closeEvent(id, 'cancelled');

    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'event_completion'),
    ).toBe(false);
  });

  it('does not pay a member who left before the close', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await joinAs(id, other);
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'leave',
      actor: asMember(),
      options: { strings: { id } },
    });

    await closeEvent(id, 'completed');

    const paid = h.repositories.rewards.events.filter(
      (event) => event.kind === 'event_completion',
    );
    expect(paid).toHaveLength(1);
    expect(paid[0]?.userId).toBe(other);
  });

  it('cannot be closed twice, so cannot pay twice', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);

    await closeEvent(id, 'completed');
    const second = await closeEvent(id, 'completed');

    expect(second.responder.visibleText).toContain('Check that input');
    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(1);
  });

  it('keys each payment on the activity and the member', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const event = h.repositories.rewards.events.find(
      (candidate) => candidate.kind === 'event_completion',
    );
    expect(event?.idempotencyKey).toBe(completionIdempotencyKey('event', id, member));
  });

  it('completes with no payment when the reward is zero', async () => {
    const id = await createEvent({ reward: 0 });
    await joinAs(id, member);

    await closeEvent(id, 'completed');

    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'event_completion'),
    ).toBe(false);
    const record = await h.repositories.community.participant(id, member);
    expect(record?.state).toBe('completed');
  });

  it('feeds the event_participation challenge metric', async () => {
    const eventId = await createEvent({ reward: 0 });
    await joinAs(eventId, member);
    await createChallenge({ metric: 'event_participation', target: 1, reward: 15 });
    await closeEvent(eventId, 'completed');

    await checkInOn(1);

    expect(
      h.repositories.rewards.events.some(
        (event) => event.kind === 'challenge_completion',
      ),
    ).toBe(true);
  });
});

/* ========================================================================== *
 * Achievements
 * ========================================================================== */

describe('achievement unlocks', () => {
  it('grants the named achievement and pays nothing extra for it', async () => {
    const id = await createEvent({ reward: 20, achievement: 'achievement.returned' });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.has('achievement.returned')).toBe(true);

    // One payment, for the event. The award itself is recognition only.
    expect(
      h.repositories.rewards.events.filter((event) => event.points > 0),
    ).toHaveLength(1);
    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'achievement_reward'),
    ).toBe(false);
  });

  it('grants nothing when no achievement is named', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const held = await h.repositories.awards.heldKeys(TEST_GUILD_ID, member);
    expect(held.size).toBe(0);
  });
});

/* ========================================================================== *
 * Security
 * ========================================================================== */

describe('authorisation', () => {
  it('refuses a moderator creating a challenge', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-create',
      actor: asModerator(),
      options: {
        strings: {
          title: 'Not allowed',
          description: 'Should never exist.',
          metric: 'check_ins',
        },
        integers: { target: 1, length_days: 1 },
      },
    });

    expect(result.responder.visibleText).toContain(
      'This command is available to the Bloom staff team.',
    );
    expect(h.repositories.community.activities).toHaveLength(0);
  });

  it('refuses a moderator creating or closing an event', async () => {
    const id = await createEvent();

    const create = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-create',
      actor: asModerator(),
      options: {
        strings: { title: 'Nope', description: 'Should never exist.' },
        integers: { length_days: 1 },
      },
    });
    expect(create.responder.visibleText).toContain('Bloom staff team');

    const close = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-close',
      actor: asModerator(),
      options: { strings: { id, outcome: 'completed' } },
    });
    expect(close.responder.visibleText).toContain('Bloom staff team');

    const activity = await h.repositories.community.byId(TEST_GUILD_ID, id);
    expect(activity?.status).toBe('open');
  });

  it('does not give moderators community management in the kernel', () => {
    /*
     * The least-privilege rule, asserted on the kernel rather than on a
     * refusal message. Creating an activity sets a payout the platform then
     * makes automatically, which is economic, not moderation — and the
     * Discord ModerateMembers bit must not be a route to it either.
     */
    expect(MODERATOR_STAFF_CAPABILITIES).not.toContain('staff.community.manage');
    expect(MODERATOR_STAFF_CAPABILITIES).not.toContain('staff.rewards.award');
  });

  it('lets an administrator read the lists with only rewards.read', async () => {
    await createEvent();
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-list',
      actor: asAdmin(),
      options: {},
    });
    expect(result.responder.visibleText).toContain('Garden hours');
  });

  it('scopes everything to the guild it was created in', async () => {
    const id = await createEvent();

    const elsewhere = await h.repositories.community.byId(
      '999999999999999999' as never,
      id,
    );
    expect(elsewhere).toBeNull();
  });

  it('refuses to close an event through the challenge command', async () => {
    const id = await createEvent();

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-close',
      actor: asAdmin(),
      options: { strings: { id, outcome: 'completed' } },
    });

    expect(result.responder.visibleText).toContain('Check that input');
    const activity = await h.repositories.community.byId(TEST_GUILD_ID, id);
    expect(activity?.status).toBe('open');
  });
});

/* ========================================================================== *
 * Validation and bounds
 * ========================================================================== */

describe('validation', () => {
  it('rejects a reward above the cap', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-create',
      actor: asAdmin(),
      options: {
        strings: { title: 'Too rich', description: 'Pays far too much.' },
        integers: { length_days: 1, reward: ACTIVITY_REWARD_LIMIT + 1 },
      },
    });

    expect(result.responder.visibleText).toContain('Check that input');
    expect(h.repositories.community.activities).toHaveLength(0);
  });

  it('rejects an empty title', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-create',
      actor: asAdmin(),
      options: {
        strings: { title: '  ', description: 'Has no name.' },
        integers: { length_days: 1 },
      },
    });

    expect(result.responder.visibleText).toContain('Check that input');
  });

  it('rejects a challenge with an unsupported metric', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'challenge-create',
      actor: asAdmin(),
      options: {
        strings: {
          title: 'Invented',
          description: 'Counts something imaginary.',
          metric: 'messages_sent',
        },
        integers: { target: 1, length_days: 1 },
      },
    });

    expect(result.responder.visibleText).toContain('Check that input');
    expect(h.repositories.community.activities).toHaveLength(0);
  });

  it('bounds the staff list and orders it deterministically', async () => {
    for (let index = 0; index < 5; index += 1) {
      await createEvent({ title: `Event ${String(index)}`, lengthDays: index + 1 });
    }

    const rows = await h.repositories.community.list(TEST_GUILD_ID, {
      kind: 'event',
      limit: 1000,
    });

    // Clamped to the hard ceiling, never unbounded.
    expect(rows.length).toBeLessThanOrEqual(25);

    const ends = rows.map((row) => row.endsAt.getTime());
    expect([...ends]).toEqual([...ends].sort((a, b) => b - a));
  });
});

/* ========================================================================== *
 * Reliability
 * ========================================================================== */

describe('reliability', () => {
  it('records the completion even when the payment fails, and leaves it payable', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);

    // The ledger is down for this close.
    const award = h.repositories.rewards.award.bind(h.repositories.rewards);
    h.repositories.rewards.award = () => Promise.reject(new Error('ledger unavailable'));

    const result = await closeEvent(id, 'completed');

    // Reported honestly rather than claimed as success.
    expect(result.responder.visibleText).toContain('Still owed');

    const record = await h.repositories.community.participant(id, member);
    expect(record?.state).toBe('completed');
    expect(record?.pointEventId).toBeNull();

    // And the payment can still be made, under the same key.
    h.repositories.rewards.award = award;
    const retry = await h.deps.rewards.awardActivity({
      guildId: TEST_GUILD_ID,
      userId: member,
      kind: 'event_completion',
      points: 20,
      idempotencyKey: completionIdempotencyKey('event', id, member),
    });
    expect(retry.kind).toBe('paid');
  });

  it('pays once even if the same key is presented twice', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const replay = await h.deps.rewards.awardActivity({
      guildId: TEST_GUILD_ID,
      userId: member,
      kind: 'event_completion',
      points: 20,
      idempotencyKey: completionIdempotencyKey('event', id, member),
    });

    expect(replay).toMatchObject({ kind: 'paid', alreadyPaid: true });
    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(1);
  });

  it('keeps the rest of the close going when one member cannot be paid', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await joinAs(id, other);

    let calls = 0;
    const award = h.repositories.rewards.award.bind(h.repositories.rewards);
    h.repositories.rewards.award = (input) => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('transient')) : award(input);
    };

    const result = await closeEvent(id, 'completed');

    // One paid, one owed — and both completions recorded.
    expect(result.responder.visibleText).toContain('Still owed');
    const counts = await h.repositories.community.counts(id);
    expect(counts.completed).toBe(2);
  });

  it('survives an achievement failure without losing the points', async () => {
    const id = await createEvent({ reward: 20, achievement: 'achievement.returned' });
    await joinAs(id, member);

    h.repositories.awards.grant = () => Promise.reject(new Error('awards down'));

    await closeEvent(id, 'completed');

    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(1);
  });
});

/* ========================================================================== *
 * Boundaries
 * ========================================================================== */

describe('boundaries', () => {
  it('keeps the community tables inside Companion', () => {
    expect(BOT_REPOSITORY_CAPABILITIES.companion).toContain('community');
    expect(BOT_REPOSITORY_CAPABILITIES.guardian).not.toContain('community');
    expect(BOT_REPOSITORY_CAPABILITIES.labs).not.toContain('community');
  });

  it('does not give Companion Guardian or Labs repositories', () => {
    for (const forbidden of ['identity', 'onboarding', 'moderation', 'cases', 'labs']) {
      expect(BOT_REPOSITORY_CAPABILITIES.companion).not.toContain(forbidden);
    }
  });

  it('records completions under the reserved point kinds and no new ones', () => {
    expect(completionIdempotencyKey('challenge', 'a', member)).toBe(
      `challenge:a:${member}`,
    );
    expect(completionIdempotencyKey('event', 'a', member)).toBe(`event:a:${member}`);
  });
});

/* -------------------------------------------------------------------------- */

async function joinAs(
  id: string,
  userId: UserId,
): Promise<Awaited<ReturnType<CompanionHarness['dispatch']>>> {
  return await h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'event',
    subcommand: 'join',
    actor: asMember(userId),
    options: { strings: { id } },
  });
}

async function closeEvent(
  id: string,
  outcome: 'completed' | 'cancelled',
): Promise<Awaited<ReturnType<CompanionHarness['dispatch']>>> {
  return await h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'admin',
    subcommand: 'event-close',
    actor: asAdmin(),
    options: { strings: { id, outcome } },
  });
}

/* ========================================================================== *
 * Recoverable payments
 * ========================================================================== */

describe('reconciling unpaid completions', () => {
  /** Close an event as completed with the ledger down, so payment fails. */
  async function closeWithLedgerDown(id: string): Promise<() => void> {
    const award = h.repositories.rewards.award.bind(h.repositories.rewards);
    h.repositories.rewards.award = () => Promise.reject(new Error('ledger unavailable'));
    await closeEvent(id, 'completed');
    return () => {
      h.repositories.rewards.award = award;
    };
  }

  async function retry(
    id: string,
  ): Promise<Awaited<ReturnType<CompanionHarness['dispatch']>>> {
    return await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-retry-payments',
      actor: asAdmin(),
      options: { strings: { id } },
    });
  }

  it('links the ledger row on a payment that works first time', async () => {
    /*
     * The regression guard for the whole feature. Until the link is written,
     * `point_event_id IS NULL` means "we never looked" rather than "owed",
     * and the reconcile query below cannot tell a paid member from an unpaid
     * one.
     */
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const record = await h.repositories.community.participant(id, member);
    expect(record?.pointEventId).not.toBeNull();
  });

  it('leaves a failed payment eligible for recovery', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    const restore = await closeWithLedgerDown(id);
    restore();

    const owed = await h.repositories.community.unpaidCompletions(TEST_GUILD_ID, id);
    expect(owed.map((row) => row.userId)).toEqual([member]);
  });

  it('pays the people it owes when staff retry', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await joinAs(id, other);
    const restore = await closeWithLedgerDown(id);
    restore();

    const result = await retry(id);

    expect(result.responder.visibleText).toContain('Paid now** 2');
    expect(result.responder.messages[0]?.ephemeral).toBe(true);

    const paid = h.repositories.rewards.events.filter(
      (event) => event.kind === 'event_completion',
    );
    expect(paid).toHaveLength(2);
    expect(paid.every((event) => event.points === 20)).toBe(true);

    // And nobody is owed any more.
    expect(
      await h.repositories.community.unpaidCompletions(TEST_GUILD_ID, id),
    ).toHaveLength(0);
  });

  it('pays once when retried twice', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    const restore = await closeWithLedgerDown(id);
    restore();

    await retry(id);
    const second = await retry(id);

    // Nothing left to do, so nothing done.
    expect(second.responder.visibleText).toContain('Eligible** 0');
    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(1);
  });

  it('pays once when two retries run at the same time', async () => {
    /*
     * Both runs read the same unpaid list before either has written, so both
     * present the same idempotency key. The ledger's unique index decides;
     * `markPaid` picks one winner for the link. Exactly one point event
     * either way.
     */
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await joinAs(id, other);
    const restore = await closeWithLedgerDown(id);
    restore();

    const [a, b] = await Promise.all([
      h.deps.community.reconcile({
        guildId: TEST_GUILD_ID,
        activityId: id,
        actorId: admin,
        correlationId: 'corr-a' as never,
      }),
      h.deps.community.reconcile({
        guildId: TEST_GUILD_ID,
        activityId: id,
        actorId: admin,
        correlationId: 'corr-b' as never,
      }),
    ]);

    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(2);

    // Between the two runs, each member was newly paid exactly once. The
    // other run saw the payment already in the ledger.
    expect(a.retried + b.retried).toBe(2);
    expect(a.stillFailed + b.stillFailed).toBe(0);
  });

  it('refuses to relabel a participant who is already linked to a payment', async () => {
    /*
     * The guard the concurrent case actually rests on. Two reconciles can
     * both believe they made the payment; only one may write the link, or
     * the record would name a ledger row that did not pay this member.
     * JavaScript cannot interleave the fake, so this asserts the rule
     * directly — `community.integration.test.ts` races it for real.
     */
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const linked = await h.repositories.community.markPaid({
      activityId: id,
      guildId: TEST_GUILD_ID,
      userId: member,
      pointEventId: 'some-other-ledger-row',
    });

    expect(linked).toBe(false);
    const record = await h.repositories.community.participant(id, member);
    expect(record?.pointEventId).not.toBe('some-other-ledger-row');
  });

  it('does not touch a participant who was already paid', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const before = await h.repositories.community.participant(id, member);

    const result = await retry(id);

    expect(result.responder.visibleText).toContain('Eligible** 0');
    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(1);

    const after = await h.repositories.community.participant(id, member);
    expect(after?.pointEventId).toBe(before?.pointEventId);
  });

  it('does not pay someone who withdrew before the close', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await joinAs(id, other);
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'leave',
      actor: asMember(),
      options: { strings: { id } },
    });
    const restore = await closeWithLedgerDown(id);
    restore();

    await retry(id);

    const paid = h.repositories.rewards.events.filter(
      (event) => event.kind === 'event_completion',
    );
    expect(paid).toHaveLength(1);
    expect(paid[0]?.userId).toBe(other);
  });

  it('refuses to retry an activity that is still open', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);

    const result = await retry(id);

    expect(result.responder.visibleText).toContain('Check that input');
    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'event_completion'),
    ).toBe(false);
  });

  it('refuses to retry a cancelled activity', async () => {
    // A cancellation deliberately paid nobody. Retrying it would invent a
    // debt rather than settle one.
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'cancelled');

    const result = await retry(id);

    expect(result.responder.visibleText).toContain('Check that input');
    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'event_completion'),
    ).toBe(false);
  });

  it('owes nothing for a free activity, however many took part', async () => {
    const id = await createEvent({ reward: 0 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    // No ledger row exists or ever will, so these must not look like a
    // backlog that can never be cleared.
    expect(
      await h.repositories.community.unpaidCompletions(TEST_GUILD_ID, id),
    ).toHaveLength(0);
  });

  it('refuses a moderator', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    const restore = await closeWithLedgerDown(id);
    restore();

    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-retry-payments',
      actor: asModerator(),
      options: { strings: { id } },
    });

    expect(result.responder.visibleText).toContain(
      'This command is available to the Bloom staff team.',
    );
    expect(
      h.repositories.rewards.events.some((event) => event.kind === 'event_completion'),
    ).toBe(false);
  });

  it('audits the run with what it found', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    const restore = await closeWithLedgerDown(id);
    restore();

    await retry(id);

    const audit = h.repositories.audit.events.find(
      (event) => event.event === 'community.reconciled',
    );
    expect(audit?.severity).toBe('warn');
    expect(audit?.actorId).toBe(admin);
    expect(audit?.details).toMatchObject({
      eligible: 1,
      retried: 1,
      already_paid: 0,
      still_failed: 0,
    });
  });

  it('reports what it still could not pay', async () => {
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    const restore = await closeWithLedgerDown(id);

    // Ledger still down during the retry.
    const result = await retry(id);
    restore();

    expect(result.responder.visibleText).toContain('Still failing** 1');
    expect(result.responder.visibleText).toContain('can be retried again');

    // Still recoverable afterwards.
    expect(
      await h.repositories.community.unpaidCompletions(TEST_GUILD_ID, id),
    ).toHaveLength(1);
  });

  it('links a payment whose link was lost, without paying again', async () => {
    /*
     * The in-between state: money reached the ledger but the link did not.
     * This is reachable in production because the two are separate
     * statements. The retry must repair the record and report it honestly
     * as already paid, not as a new payment.
     */
    const id = await createEvent({ reward: 20 });
    await joinAs(id, member);
    await closeEvent(id, 'completed');

    const record = await h.repositories.community.participant(id, member);
    expect(record?.pointEventId).not.toBeNull();
    // Simulate the link having been lost after the payment.
    h.repositories.community.records.set(`${id}:${member}`, {
      ...record!,
      pointEventId: null,
    });

    const result = await retry(id);

    expect(result.responder.visibleText).toContain('Already paid** 1');
    expect(result.responder.visibleText).toContain('No one was paid twice');
    expect(
      h.repositories.rewards.events.filter((event) => event.kind === 'event_completion'),
    ).toHaveLength(1);
    const after = await h.repositories.community.participant(id, member);
    expect(after?.pointEventId).not.toBeNull();
  });
});
