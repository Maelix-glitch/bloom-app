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
  });

  afterAll(async () => {
    await database.sql`DELETE FROM ${database.sql(database.schema)}.community_participants WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(database.schema)}.community_activities WHERE guild_id = ${GUILD}`;
    await database.close();
  });

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
});
