import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import type { GuildId, UserId } from '@bloom/shared-types';
import {
  companionHarness,
  type CompanionHarness,
} from '../apps/companion/src/companion.harness.js';

/**
 * Adversarial cases that belong to no single feature.
 *
 * Each feature suite asks "does my feature behave". These ask the question
 * that only makes sense across features: what happens when the platform is
 * treated badly — the same interaction arriving twice, two workers waking at
 * once, the database going away halfway through paying someone.
 *
 * Several of these would pass trivially against a system that simply lost
 * the second request. That is not the property being tested. The property is
 * that the *first* one still took effect exactly once and the system is still
 * usable afterwards, which is what distinguishes idempotency from dropping
 * work on the floor.
 */

const member = TEST_USER_IDS.member;
const other = TEST_USER_IDS.newcomer;
const admin = TEST_USER_IDS.administrator;

let h: CompanionHarness;
let now = new Date('2026-03-12T09:00:00.000Z');

const asMember = (userId: UserId = member): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: admin, roles: ['administrator'] });

/** A resolved user option, as Discord would hand one to the dispatcher. */
const user = (id: UserId): { id: UserId; username: string; isBot: boolean } => ({
  id,
  username: 'tester',
  isBot: false,
});

beforeEach(() => {
  now = new Date('2026-03-12T09:00:00.000Z');
  h = companionHarness({ now: () => now });
});

const ledger = (): readonly { points: number; kind: string }[] =>
  h.repositories.rewards.events.filter((event) => event.guildId === TEST_GUILD_ID);

// -----------------------------------------------------------------------------
// Duplicate delivery
// -----------------------------------------------------------------------------

describe('duplicate interaction delivery', () => {
  it('pays once when the same check-in arrives twice', async () => {
    /*
     * Discord does not normally redeliver an interaction, but a gateway
     * resume can replay events and a retried HTTP interaction is possible.
     * Nothing in the dispatcher deduplicates by interaction id — the defence
     * is one layer down, where every mutating operation carries an
     * idempotency key. This asserts that the defence is real rather than
     * theoretical, because the dispatcher-level guard people assume exists
     * does not.
     */
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(ledger().filter((event) => event.kind === 'check_in')).toHaveLength(1);
  });

  it('pays once when two identical check-ins race', async () => {
    await Promise.all([
      h.dispatch({ commandName: 'checkin', actor: asMember() }),
      h.dispatch({ commandName: 'checkin', actor: asMember() }),
    ]);

    expect(ledger().filter((event) => event.kind === 'check_in')).toHaveLength(1);
  });

  it('still serves a different member normally', async () => {
    // The guard must be keyed to the member, not a global lock that would
    // make the first check-in of the day exclusive across the server.
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    await h.dispatch({ commandName: 'checkin', actor: asMember(other) });

    expect(ledger().filter((event) => event.kind === 'check_in')).toHaveLength(2);
  });
});

// -----------------------------------------------------------------------------
// Infrastructure failure
// -----------------------------------------------------------------------------

describe('the database going away', () => {
  it('refuses the command rather than reporting a reward it did not pay', async () => {
    /*
     * The failure that matters is not the error — it is a member being told
     * "+5 points" when the ledger write failed. A reward the system claims
     * but cannot evidence is the "fake rewards" the brief forbids.
     */
    const award = h.repositories.rewards.award.bind(h.repositories.rewards);
    h.repositories.rewards.award = () => Promise.reject(new Error('connection lost'));

    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(result.responder.visibleText).not.toContain('+5');
    expect(ledger()).toHaveLength(0);

    // And the platform recovers: the same member can check in once the
    // database is back, and is paid exactly once.
    h.repositories.rewards.award = award;
    await h.dispatch({ commandName: 'checkin', actor: asMember() });
    expect(ledger().filter((event) => event.kind === 'check_in')).toHaveLength(1);
  });

  it('surfaces no internal detail to the member when infrastructure fails', async () => {
    h.repositories.rewards.award = () =>
      Promise.reject(
        new Error('postgres://bloom_companion:hunter2@db.internal:5432 refused'),
      );

    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });
    const text = result.responder.visibleText;

    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('postgres://');
    expect(text).not.toContain('db.internal');
    expect(text).not.toContain('at Object.');
  });
});

describe('Discord being unreachable', () => {
  it('does not lose a reward because the announcement failed', async () => {
    /*
     * Earning and announcing are separate effects with separate failure
     * modes. A member who earns a milestone while Discord is rate-limiting
     * must still hold the milestone afterwards.
     */
    h.messaging.sendToChannel = () => Promise.reject(new Error('503 from Discord'));

    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const held = await h.repositories.awards.list(TEST_GUILD_ID, member);
    expect(held.map((award) => award.awardKey)).toContain('milestone.checkins.1');
    expect(ledger().filter((event) => event.kind === 'check_in')).toHaveLength(1);
  });

  it('leaves the announcement to be retried rather than marking it done', async () => {
    h.messaging.sendToChannel = () => Promise.reject(new Error('503 from Discord'));
    await h.dispatch({ commandName: 'checkin', actor: asMember() });

    const held = await h.repositories.awards.list(TEST_GUILD_ID, member);
    const milestone = held.find((award) => award.awardKey === 'milestone.checkins.1');
    expect(milestone?.announced).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Scheduler
// -----------------------------------------------------------------------------

describe('scheduler overlap', () => {
  it('posts once when the same job is triggered concurrently', async () => {
    await Promise.all([
      h.scheduler.runNow('companion.checkin.daily_prompt'),
      h.scheduler.runNow('companion.checkin.daily_prompt'),
      h.scheduler.runNow('companion.checkin.daily_prompt'),
    ]);

    expect(h.messaging.sent).toHaveLength(1);
  });

  it('does not let a failed run block the next one forever', async () => {
    /*
     * A job that fails must release its lease. The alternative — a lease
     * held by a dead run — is an outage that looks like silence, and it is
     * the single most common way a scheduler stops working without anyone
     * noticing.
     */
    h.messaging.sendToChannel = () => Promise.reject(new Error('down'));
    await h.scheduler.runNow('companion.checkin.daily_prompt');

    const runs = h.lock.runs.filter(
      (run) => run.jobKey === 'companion.checkin.daily_prompt',
    );
    expect(runs[0]?.status).toBe('failed');

    // The lock is free: a second run is admitted rather than refused.
    await h.scheduler.runNow('companion.checkin.daily_prompt');
    expect(
      h.lock.runs.filter((run) => run.jobKey === 'companion.checkin.daily_prompt'),
    ).toHaveLength(2);
  });
});

// -----------------------------------------------------------------------------
// Authorization under pressure
// -----------------------------------------------------------------------------

describe('authorization does not soften under load or repetition', () => {
  it('refuses an unauthorized staff action however many times it is tried', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        h.dispatch({
          commandName: 'companion',
          subcommandGroup: 'admin',
          subcommand: 'award',
          actor: asMember(),
          options: {
            users: { member: user(other) },
            integers: { points: 100 },
            strings: { reason: 'please' },
          },
        }),
      ),
    );

    for (const attempt of attempts) {
      expect(attempt.responder.visibleText).toContain(
        'This command is available to the Bloom staff team.',
      );
    }
    expect(ledger()).toHaveLength(0);
  });

  it('refuses a staff action from another guild even with a valid actor', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'award',
      actor: { ...asAdmin(), guildId: '123456789012345678' as GuildId },
      options: {
        users: { member: user(other) },
        integers: { points: 100 },
        strings: { reason: 'from elsewhere' },
      },
    });

    expect(result.responder.visibleText).toContain(
      'only available in the Bloom Labs server',
    );
    expect(ledger()).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// Malformed state
// -----------------------------------------------------------------------------

describe('malformed activity state', () => {
  it('refuses to join an activity that does not exist', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { id: 'activity-does-not-exist' } },
    });

    expect(result.responder.visibleText).toBeTruthy();
    expect(h.repositories.community.records.size).toBe(0);
  });

  it('refuses a staff close of an activity that does not exist', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-close',
      actor: asAdmin(),
      options: { strings: { id: 'activity-nope', outcome: 'completed' } },
    });

    expect(result.responder.visibleText).toBeTruthy();
    expect(ledger()).toHaveLength(0);
  });

  it('pays nobody when an event is cancelled rather than completed', async () => {
    // The explicit outcome is the whole point of staff-closed events: a
    // cancelled event must not pay, however many people joined it.
    const created = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-create',
      actor: asAdmin(),
      options: {
        strings: { title: 'Called off', description: 'Not happening after all.' },
        integers: { length_days: 7, reward: 20 },
      },
    });
    const id = /activity-\d+/u.exec(created.responder.visibleText)?.[0];
    expect(id).toBeDefined();

    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { id: id! } },
    });

    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-close',
      actor: asAdmin(),
      options: { strings: { id: id!, outcome: 'cancelled' } },
    });

    expect(ledger().filter((event) => event.kind === 'event_reward')).toHaveLength(0);
  });
});
