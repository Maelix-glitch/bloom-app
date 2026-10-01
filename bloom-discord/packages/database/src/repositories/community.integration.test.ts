import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GuildId, UserId } from '@bloom/shared-types';
import { createDatabase, type Database } from '../client.js';
import { PostgresCommunityRepository, type CommunityRepository } from './community.js';

/**
 * Challenges and events against real Postgres.
 *
 * The fake repository proves the service composes correctly. Only this file
 * can prove the things the *database* is responsible for: that the CHECK
 * constraints make a malformed activity unrepresentable, and that the
 * advisory lock in `join` actually serialises concurrent transactions — which
 * a single-threaded fake can only simulate.
 */

const RUN = process.env['BLOOM_INTEGRATION_TESTS'] === '1';
const suite = RUN ? describe : describe.skip;

// Guild block for this suite, following the convention in the other files.
const GUILD = '900000000000096001' as GuildId;
const ACTOR = '900000000000096100' as UserId;

function member(index: number): UserId {
  // String concatenation, never arithmetic: 18-digit ids exceed
  // Number.MAX_SAFE_INTEGER and would collapse to one value.
  return `9000000000000962${String(index).padStart(2, '0')}` as UserId;
}

suite('community repository (integration)', () => {
  let database: Database;
  let repository: CommunityRepository;

  const future = (days: number): Date =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  beforeAll(() => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is required for integration tests.');

    database = createDatabase({
      url,
      schema: process.env['DATABASE_SCHEMA'] ?? 'bloom_discord',
      maxConnections: 8,
      idleTimeoutSeconds: 10,
      connectTimeoutSeconds: 10,
      applicationName: 'bloom-integration-test',
    });
    repository = new PostgresCommunityRepository(database);
  });

  beforeEach(async () => {
    // FK order: participants reference activities.
    await database.sql`DELETE FROM ${database.sql(database.schema)}.community_participants WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(database.schema)}.community_activities WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(database.schema)}.point_events WHERE guild_id = ${GUILD}`;
  });

  afterAll(async () => {
    await database.sql`DELETE FROM ${database.sql(database.schema)}.community_participants WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(database.schema)}.community_activities WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(database.schema)}.point_events WHERE guild_id = ${GUILD}`;
    await database.close();
  });

  let ledgerRowCounter = 0;

  /** A real ledger row, so the participant FK has something to point at. */
  async function aPointEvent(): Promise<string> {
    ledgerRowCounter += 1;
    const rows = await database.sql<{ id: string }[]>`
      INSERT INTO ${database.sql(database.schema)}.point_events
        (guild_id, user_id, kind, points, idempotency_key)
      VALUES (${GUILD}, ${member(20)}, 'event_completion', 20,
              ${`event:recon:${String(ledgerRowCounter)}`})
      RETURNING id
    `;
    const row = rows[0];
    if (!row) throw new Error('could not insert a point event');
    return row.id;
  }

  async function anEvent(capacity: number | null): Promise<string> {
    const activity = await repository.create({
      guildId: GUILD,
      kind: 'event',
      title: 'Garden hours',
      description: 'An hour together.',
      startsAt: future(1),
      endsAt: future(2),
      capacity,
      rewardPoints: 20,
      createdBy: ACTOR,
    });
    return activity.id;
  }

  describe('constraints', () => {
    it('refuses a window that ends before it starts', async () => {
      await expect(
        repository.create({
          guildId: GUILD,
          kind: 'event',
          title: 'Backwards',
          description: 'Ends before it starts.',
          startsAt: future(5),
          endsAt: future(1),
          rewardPoints: 0,
          createdBy: ACTOR,
        }),
      ).rejects.toThrow();
    });

    it('refuses a challenge with no target', async () => {
      await expect(
        repository.create({
          guildId: GUILD,
          kind: 'challenge',
          title: 'Aimless',
          description: 'Counts nothing.',
          startsAt: future(1),
          endsAt: future(2),
          rewardPoints: 0,
          createdBy: ACTOR,
        }),
      ).rejects.toThrow();
    });

    it('refuses a challenge that borrows an event capacity', async () => {
      await expect(
        repository.create({
          guildId: GUILD,
          kind: 'challenge',
          title: 'Confused',
          description: 'Has a capacity.',
          startsAt: future(1),
          endsAt: future(2),
          targetMetric: 'check_ins',
          targetAmount: 3,
          capacity: 10,
          rewardPoints: 0,
          createdBy: ACTOR,
        }),
      ).rejects.toThrow();
    });

    it('refuses an event that borrows a challenge target', async () => {
      await expect(
        repository.create({
          guildId: GUILD,
          kind: 'event',
          title: 'Confused',
          description: 'Has a target.',
          startsAt: future(1),
          endsAt: future(2),
          targetMetric: 'check_ins',
          targetAmount: 3,
          rewardPoints: 0,
          createdBy: ACTOR,
        }),
      ).rejects.toThrow();
    });

    it('refuses a reward above the cap', async () => {
      await expect(
        repository.create({
          guildId: GUILD,
          kind: 'event',
          title: 'Too rich',
          description: 'Pays far too much.',
          startsAt: future(1),
          endsAt: future(2),
          rewardPoints: 10_000,
          createdBy: ACTOR,
        }),
      ).rejects.toThrow();
    });

    it('refuses an achievement key that could never exist', async () => {
      await expect(
        repository.create({
          guildId: GUILD,
          kind: 'event',
          title: 'Bad key',
          description: 'Names an impossible award.',
          startsAt: future(1),
          endsAt: future(2),
          rewardPoints: 0,
          achievementKey: 'Not A Key!',
          createdBy: ACTOR,
        }),
      ).rejects.toThrow();
    });
  });

  describe('participation', () => {
    it('joins once, however many times it is asked', async () => {
      const id = await anEvent(null);

      const first = await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(1),
        capacity: null,
        joinedAt: new Date(),
      });
      const second = await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(1),
        capacity: null,
        joinedAt: new Date(),
      });

      expect(first.kind).toBe('joined');
      expect(second.kind).toBe('already_joined');
      expect((await repository.counts(id)).joined).toBe(1);
    });

    it('frees the place on leaving and lets the member return', async () => {
      const id = await anEvent(1);
      await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(1),
        capacity: 1,
        joinedAt: new Date(),
      });

      expect(await repository.leave(id, GUILD, member(1))).toBe('withdrawn');
      expect((await repository.counts(id)).joined).toBe(0);

      const back = await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(1),
        capacity: 1,
        joinedAt: new Date(),
      });
      expect(back.kind).toBe('already_joined');
      expect((await repository.counts(id)).joined).toBe(1);
    });

    it('holds capacity under genuinely concurrent joins', async () => {
      /*
       * The reason the advisory lock exists, proved against real
       * transactions rather than a simulation. Twelve separate connections
       * race for four places. Without the lock each would read the same seat
       * count inside its own snapshot and every one would be admitted.
       */
      const id = await anEvent(4);

      const results = await Promise.all(
        Array.from({ length: 12 }, (_unused, index) =>
          repository.join({
            activityId: id,
            guildId: GUILD,
            userId: member(index + 10),
            capacity: 4,
            joinedAt: new Date(),
          }),
        ),
      );

      expect(results.filter((result) => result.kind === 'joined')).toHaveLength(4);
      expect(results.filter((result) => result.kind === 'full')).toHaveLength(8);
      expect((await repository.counts(id)).joined).toBe(4);
    });

    it('completes exactly once under concurrent completion', async () => {
      const id = await anEvent(null);
      await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(1),
        capacity: null,
        joinedAt: new Date(),
      });

      const outcomes = await Promise.all(
        Array.from({ length: 6 }, () =>
          repository.complete({
            activityId: id,
            guildId: GUILD,
            userId: member(1),
            progress: null,
          }),
        ),
      );

      expect(outcomes.filter((o) => o.kind === 'completed')).toHaveLength(1);
      expect(outcomes.filter((o) => o.kind === 'already_completed')).toHaveLength(5);
    });

    it('completes a challenge exactly once without a join', async () => {
      const challenge = await repository.create({
        guildId: GUILD,
        kind: 'challenge',
        title: 'Three mornings',
        description: 'Check in three times.',
        startsAt: future(-1),
        endsAt: future(2),
        targetMetric: 'check_ins',
        targetAmount: 3,
        rewardPoints: 10,
        createdBy: ACTOR,
      });

      const outcomes = await Promise.all(
        Array.from({ length: 6 }, () =>
          repository.completeDirect({
            activityId: challenge.id,
            guildId: GUILD,
            userId: member(2),
            progress: 3,
          }),
        ),
      );

      expect(outcomes.filter((o) => o.kind === 'completed')).toHaveLength(1);
      expect((await repository.counts(challenge.id)).completed).toBe(1);
    });

    it('refuses to withdraw a completed participation', async () => {
      const id = await anEvent(null);
      await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(3),
        capacity: null,
        joinedAt: new Date(),
      });
      await repository.complete({
        activityId: id,
        guildId: GUILD,
        userId: member(3),
        progress: null,
      });

      expect(await repository.leave(id, GUILD, member(3))).toBe('not_joined');
    });
  });

  describe('recovering unpaid completions', () => {
    async function completedEventWith(reward: number): Promise<string> {
      const activity = await repository.create({
        guildId: GUILD,
        kind: 'event',
        title: 'Garden hours',
        description: 'An hour together.',
        startsAt: future(-2),
        endsAt: future(-1),
        rewardPoints: reward,
        createdBy: ACTOR,
      });
      await repository.join({
        activityId: activity.id,
        guildId: GUILD,
        userId: member(20),
        capacity: null,
        joinedAt: new Date(),
      });
      await repository.complete({
        activityId: activity.id,
        guildId: GUILD,
        userId: member(20),
        progress: null,
      });
      await repository.close({
        guildId: GUILD,
        activityId: activity.id,
        status: 'completed',
        closedBy: ACTOR,
        closedAt: new Date(),
      });
      return activity.id;
    }

    it('finds a completion that was never paid', async () => {
      const id = await completedEventWith(20);
      const owed = await repository.unpaidCompletions(GUILD, id);
      expect(owed.map((row) => row.userId)).toEqual([member(20)]);
    });

    it('finds nothing for a free activity', async () => {
      // No ledger row exists or ever will, so these must never look like a
      // backlog that cannot be cleared.
      const id = await completedEventWith(0);
      expect(await repository.unpaidCompletions(GUILD, id)).toHaveLength(0);
    });

    it('finds nothing while the activity is still open', async () => {
      const activity = await repository.create({
        guildId: GUILD,
        kind: 'event',
        title: 'Still running',
        description: 'Not closed yet.',
        startsAt: future(-1),
        endsAt: future(1),
        rewardPoints: 20,
        createdBy: ACTOR,
      });
      await repository.join({
        activityId: activity.id,
        guildId: GUILD,
        userId: member(21),
        capacity: null,
        joinedAt: new Date(),
      });
      await repository.complete({
        activityId: activity.id,
        guildId: GUILD,
        userId: member(21),
        progress: null,
      });

      expect(await repository.unpaidCompletions(GUILD, activity.id)).toHaveLength(0);
    });

    it('links the payment exactly once under concurrent repair', async () => {
      /*
       * Six connections racing to write the same link. The
       * `point_event_id IS NULL` guard means exactly one succeeds — which
       * is what stops two concurrent reconciles from disagreeing about
       * which ledger row paid this member.
       */
      const id = await completedEventWith(20);
      const ledgerRow = await aPointEvent();

      const results = await Promise.all(
        Array.from({ length: 6 }, () =>
          repository.markPaid({
            activityId: id,
            guildId: GUILD,
            userId: member(20),
            pointEventId: ledgerRow,
          }),
        ),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await repository.unpaidCompletions(GUILD, id)).toHaveLength(0);
    });

    it('refuses to link a payment to a participant who withdrew', async () => {
      const activity = await repository.create({
        guildId: GUILD,
        kind: 'event',
        title: 'Left early',
        description: 'Withdrew before the close.',
        startsAt: future(-2),
        endsAt: future(-1),
        rewardPoints: 20,
        createdBy: ACTOR,
      });
      await repository.join({
        activityId: activity.id,
        guildId: GUILD,
        userId: member(22),
        capacity: null,
        joinedAt: new Date(),
      });
      await repository.leave(activity.id, GUILD, member(22));

      const ledgerRow = await aPointEvent();
      expect(
        await repository.markPaid({
          activityId: activity.id,
          guildId: GUILD,
          userId: member(22),
          pointEventId: ledgerRow,
        }),
      ).toBe(false);
    });

    it('refuses a link to a ledger row that does not exist', async () => {
      // The FK is the guarantee that `point_event_id` always names a real
      // payment, so a bookkeeping bug cannot fabricate one.
      const id = await completedEventWith(20);
      await expect(
        repository.markPaid({
          activityId: id,
          guildId: GUILD,
          userId: member(20),
          pointEventId: '00000000-0000-0000-0000-000000000000',
        }),
      ).rejects.toThrow();
    });
  });

  describe('lifecycle', () => {
    it('closes once, and tells the second caller nothing happened', async () => {
      const id = await anEvent(null);

      const first = await repository.close({
        guildId: GUILD,
        activityId: id,
        status: 'completed',
        closedBy: ACTOR,
        closedAt: new Date(),
      });
      const second = await repository.close({
        guildId: GUILD,
        activityId: id,
        status: 'cancelled',
        closedBy: ACTOR,
        closedAt: new Date(),
      });

      expect(first?.status).toBe('completed');
      // The first closer's decision and name survive.
      expect(second).toBeNull();
    });

    it('scopes reads to the guild', async () => {
      const id = await anEvent(null);
      expect(await repository.byId('900000000000096999' as GuildId, id)).toBeNull();
      expect(await repository.byId(GUILD, id)).not.toBeNull();
    });

    it('orders the list deterministically and bounds it', async () => {
      for (let index = 0; index < 6; index += 1) {
        await repository.create({
          guildId: GUILD,
          kind: 'event',
          title: `Event ${String(index)}`,
          description: 'One of several.',
          startsAt: future(1),
          // Identical end times, so only the id tiebreak can order them.
          endsAt: future(9),
          rewardPoints: 0,
          createdBy: ACTOR,
        });
      }

      const first = await repository.list(GUILD, { kind: 'event', limit: 1000 });
      const again = await repository.list(GUILD, { kind: 'event', limit: 1000 });

      expect(first.length).toBeLessThanOrEqual(25);
      expect(first.map((row) => row.id)).toEqual(again.map((row) => row.id));
    });

    it('finds only activities whose window contains the moment', async () => {
      await repository.create({
        guildId: GUILD,
        kind: 'challenge',
        title: 'Running now',
        description: 'Open window.',
        startsAt: future(-1),
        endsAt: future(1),
        targetMetric: 'check_ins',
        targetAmount: 1,
        rewardPoints: 0,
        createdBy: ACTOR,
      });
      await repository.create({
        guildId: GUILD,
        kind: 'challenge',
        title: 'Not yet',
        description: 'Starts tomorrow.',
        startsAt: future(1),
        endsAt: future(3),
        targetMetric: 'check_ins',
        targetAmount: 1,
        rewardPoints: 0,
        createdBy: ACTOR,
      });

      const open = await repository.openAt(GUILD, 'challenge', new Date());
      expect(open.map((row) => row.title)).toEqual(['Running now']);
    });

    it('cascades participants when an activity is deleted', async () => {
      const id = await anEvent(null);
      await repository.join({
        activityId: id,
        guildId: GUILD,
        userId: member(4),
        capacity: null,
        joinedAt: new Date(),
      });

      await database.sql`DELETE FROM ${database.sql(database.schema)}.community_activities WHERE id = ${id}`;

      expect(await repository.participant(id, member(4))).toBeNull();
    });
  });

  describe('boards and totals', () => {
    /**
     * A completed participation on a given activity at a given instant.
     *
     * Built through the repository rather than by INSERT, so the rows these
     * aggregates read are the rows the rest of the system writes.
     */
    async function completionAt(
      activityId: string,
      userId: UserId,
      at: Date,
    ): Promise<void> {
      await repository.join({
        activityId,
        guildId: GUILD,
        userId,
        capacity: null,
        joinedAt: at,
      });
      await repository.complete({
        activityId,
        guildId: GUILD,
        userId,
        progress: null,
      });
      await database.sql`
        UPDATE ${database.sql(database.schema)}.community_participants
        SET completed_at = ${at}
        WHERE activity_id = ${activityId} AND user_id = ${userId}
      `;
    }

    async function activityOfKind(
      kind: 'challenge' | 'event',
      title: string,
    ): Promise<string> {
      const activity = await repository.create({
        guildId: GUILD,
        kind,
        title,
        description: 'For the boards.',
        startsAt: future(-3),
        endsAt: future(3),
        ...(kind === 'challenge'
          ? { targetMetric: 'check_ins' as const, targetAmount: 1 }
          : {}),
        rewardPoints: 10,
        createdBy: ACTOR,
      });
      return activity.id;
    }

    it('ranks members by completions of one kind', async () => {
      const challenge = await activityOfKind('challenge', 'Mornings');
      const event = await activityOfKind('event', 'Garden hours');

      await completionAt(challenge, member(30), future(-2));
      await completionAt(event, member(30), future(-2));
      await completionAt(event, member(31), future(-1));

      const events = await repository.completionLeaderboard(GUILD, { kind: 'event' });
      expect(events.map((row) => [row.userId, row.count])).toEqual([
        [member(30), 1],
        [member(31), 1],
      ]);

      // The kind filter is the whole point: the challenge completion must not
      // appear on the event board.
      const challenges = await repository.completionLeaderboard(GUILD, {
        kind: 'challenge',
      });
      expect(challenges).toHaveLength(1);
      expect(challenges[0]?.userId).toBe(member(30));
    });

    it('orders by count, then earliest completion, then id', async () => {
      const event = await activityOfKind('event', 'Ordering');
      const second = await activityOfKind('event', 'Ordering again');

      // member(33) has two; the other two have one each, at different times.
      await completionAt(event, member(33), future(-2));
      await completionAt(second, member(33), future(-2));
      await completionAt(event, member(32), future(-1));
      await completionAt(second, member(34), future(-2));

      const rows = await repository.completionLeaderboard(GUILD, { kind: 'event' });

      expect(rows.map((row) => row.userId)).toEqual([
        member(33), // two completions
        member(34), // one, completed earlier
        member(32), // one, completed later
      ]);
    });

    it('is stable across repeated reads when everything ties', async () => {
      const event = await activityOfKind('event', 'All tied');
      const at = future(-2);
      for (const index of [40, 41, 42, 43]) {
        await completionAt(event, member(index), at);
      }

      const first = await repository.completionLeaderboard(GUILD, { kind: 'event' });
      const again = await repository.completionLeaderboard(GUILD, { kind: 'event' });

      expect(again.map((row) => row.userId)).toEqual(first.map((row) => row.userId));
      // user_id ascending is the documented final tiebreak.
      const ids = first.map((row) => row.userId);
      expect(ids).toEqual([...ids].toSorted((a, b) => a.localeCompare(b)));
    });

    it('bounds the board however many members qualify', async () => {
      const event = await activityOfKind('event', 'Crowded');
      for (let index = 0; index < 30; index += 1) {
        await completionAt(event, member(100 + index), future(-2));
      }

      const asked = await repository.completionLeaderboard(GUILD, {
        kind: 'event',
        limit: 10_000,
      });
      expect(asked).toHaveLength(25);
    });

    it('honours the window', async () => {
      const event = await activityOfKind('event', 'Windowed');
      await completionAt(event, member(50), future(-2));

      const recent = await repository.completionLeaderboard(GUILD, {
        kind: 'event',
        since: future(-1),
      });
      expect(recent).toHaveLength(0);

      const wider = await repository.completionLeaderboard(GUILD, {
        kind: 'event',
        since: future(-3),
      });
      expect(wider).toHaveLength(1);
    });

    it('excludes a cancelled activity from boards and totals', async () => {
      const event = await activityOfKind('event', 'Called off');
      await completionAt(event, member(60), future(-2));
      await repository.close({
        guildId: GUILD,
        activityId: event,
        status: 'cancelled',
        closedBy: ACTOR,
        closedAt: new Date(),
      });

      expect(
        await repository.completionLeaderboard(GUILD, { kind: 'event' }),
      ).toHaveLength(0);
      const totals = await repository.completionTotals(GUILD, 'event', future(-5), null);
      expect(totals.completions).toBe(0);
    });

    it('counts completions and distinct members separately', async () => {
      const a = await activityOfKind('event', 'One');
      const b = await activityOfKind('event', 'Two');
      await completionAt(a, member(70), future(-2));
      await completionAt(b, member(70), future(-2));
      await completionAt(a, member(71), future(-2));

      const totals = await repository.completionTotals(GUILD, 'event', future(-5), null);

      // Three completions, two people. Summing members across activities would
      // have said three.
      expect(totals).toEqual({ completions: 3, members: 2 });
    });

    it('treats a null upper bound as "and everything since"', async () => {
      const event = await activityOfKind('event', 'Open ended');
      const at = new Date();
      await completionAt(event, member(80), at);

      // Bounded at the same instant, the half-open window excludes it...
      const bounded = await repository.completionTotals(GUILD, 'event', future(-1), at);
      expect(bounded.completions).toBe(0);

      // ...which is why a live view passes null instead.
      const live = await repository.completionTotals(GUILD, 'event', future(-1), null);
      expect(live.completions).toBe(1);
    });

    it('lists upcoming activities soonest first', async () => {
      const soon = await repository.create({
        guildId: GUILD,
        kind: 'event',
        title: 'Soon',
        description: 'Starts shortly.',
        startsAt: future(1),
        endsAt: future(2),
        rewardPoints: 0,
        createdBy: ACTOR,
      });
      const later = await repository.create({
        guildId: GUILD,
        kind: 'event',
        title: 'Later',
        description: 'Starts later.',
        startsAt: future(5),
        endsAt: future(6),
        rewardPoints: 0,
        createdBy: ACTOR,
      });

      const upcoming = await repository.upcomingAfter(GUILD, 'event', new Date());

      expect(upcoming.map((row) => row.id)).toEqual([soon.id, later.id]);
      // An activity already running is not "upcoming".
      expect(upcoming.map((row) => row.title)).not.toContain('Running now');
    });

    it('counts only this guild', async () => {
      const event = await activityOfKind('event', 'Ours');
      await completionAt(event, member(90), future(-2));

      const elsewhere = '100000000000096999' as GuildId;
      expect(
        await repository.completionLeaderboard(elsewhere, { kind: 'event' }),
      ).toHaveLength(0);
      expect(
        (await repository.completionTotals(elsewhere, 'event', future(-5), null))
          .completions,
      ).toBe(0);
    });
  });
});
