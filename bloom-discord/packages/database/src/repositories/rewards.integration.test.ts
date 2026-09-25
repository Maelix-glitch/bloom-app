import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { parseLocalDate } from '@bloom/utils';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresRewardsRepository } from './rewards.js';

/**
 * The Bloom Rewards ledger, against a real PostgreSQL.
 *
 * Everything asserted here is enforced by the schema rather than by the
 * repository, which is exactly why a fake cannot prove any of it:
 *
 *   • the unique index that makes a replayed award a no-op,
 *   • the primary key that makes a second check-in on one day impossible,
 *   • the CHECK constraints that tie an actor to a manual award,
 *   • and the advisory lock that stops two concurrent corrections overdrawing
 *     a balance that is a SUM and therefore has no row to lock.
 *
 * The last one is the reason this file exists. It is a genuine race, it cannot
 * be reproduced in memory, and it is the kind of bug that surfaces as "a member
 * has minus forty points" six months after release.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000091001');
const MEMBER = unsafeSnowflake<UserId>('100000000000091002');
const OTHER = unsafeSnowflake<UserId>('100000000000091003');
const STAFF = unsafeSnowflake<UserId>('100000000000091004');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

describe('rewards ledger (integration)', () => {
  let database: Database;
  let rewards: PostgresRewardsRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: SCHEMA,
      // The concurrency tests need real parallel connections, not a queue.
      maxConnections: 8,
      idleTimeoutSeconds: 5,
      connectTimeoutSeconds: 10,
      applicationName: 'bloom-integration-test',
      logger: createLogger({
        botName: 'platform',
        environment: 'development',
        version: '0.0.0-test',
        level: 'error',
        sink: new JsonLogSink(),
      }),
    });

    rewards = new PostgresRewardsRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await new PostgresIdentityRepository(database).upsertGuild({
      guildId: GUILD,
      name: 'Bloom Labs (integration)',
    });
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.check_ins WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.point_events WHERE guild_id = ${GUILD}`;
  });

  it('requires an idempotency key long enough to be meaningful', async () => {
    /*
     * The CHECK demands 8–200 characters. A one-character key is almost always
     * a caller that has not thought about what makes this operation unique, and
     * the collisions it produces would be silent — two unrelated awards sharing
     * the key `a` would look like a correctly-prevented duplicate.
     */
    await expect(
      rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'check_in',
        points: 5,
        idempotencyKey: 'a',
      }),
    ).rejects.toThrow();
  });

  it('sums the ledger rather than trusting a stored total', async () => {
    await rewards.award({
      guildId: GUILD,
      userId: MEMBER,
      kind: 'check_in',
      points: 5,
      idempotencyKey: 'award-one',
    });
    await rewards.award({
      guildId: GUILD,
      userId: MEMBER,
      kind: 'small_win',
      points: 10,
      idempotencyKey: 'award-two',
    });

    expect(await rewards.balance(GUILD, MEMBER)).toBe(15);
  });

  it('pays once when the same award is replayed', async () => {
    const first = await rewards.award({
      guildId: GUILD,
      userId: MEMBER,
      kind: 'small_win',
      points: 10,
      idempotencyKey: 'replayed',
    });
    const second = await rewards.award({
      guildId: GUILD,
      userId: MEMBER,
      kind: 'small_win',
      points: 10,
      idempotencyKey: 'replayed',
    });

    expect(first.kind).toBe('recorded');
    expect(second.kind).toBe('duplicate');
    // The original is handed back, so the caller can say what already happened.
    if (second.kind !== 'duplicate') throw new Error('unreachable');
    expect(second.event.id).toBe(first.kind === 'recorded' ? first.event.id : '');
    expect(await rewards.balance(GUILD, MEMBER)).toBe(10);
  });

  it('pays once when ten workers replay the same award at the same moment', async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 10 }, () =>
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'small_win',
          points: 10,
          idempotencyKey: 'stampede',
        }),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.kind === 'recorded')).toHaveLength(1);
    expect(await rewards.balance(GUILD, MEMBER)).toBe(10);
  });

  it('scopes the duplicate guard to one guild', async () => {
    const otherGuild = unsafeSnowflake<GuildId>('100000000000091999');
    await new PostgresIdentityRepository(database).upsertGuild({
      guildId: otherGuild,
      name: 'Another community',
    });

    try {
      await rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'check_in',
        points: 5,
        idempotencyKey: 'shared-key',
      });
      const elsewhere = await rewards.award({
        guildId: otherGuild,
        userId: MEMBER,
        kind: 'check_in',
        points: 5,
        idempotencyKey: 'shared-key',
      });

      // The same logical action in two communities is two events.
      expect(elsewhere.kind).toBe('recorded');
    } finally {
      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.point_events WHERE guild_id = ${otherGuild}`;
    }
  });

  describe('the constraints the fake cannot enforce', () => {
    it('refuses an automatic award that names an actor', async () => {
      await expect(
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'check_in',
          points: 5,
          awardedBy: STAFF,
          idempotencyKey: 'bad-actor',
        }),
      ).rejects.toThrow();
    });

    it('refuses a manual award with no actor', async () => {
      await expect(
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'manual_award',
          points: 50,
          reason: 'helped a newcomer',
          idempotencyKey: 'no-actor',
        }),
      ).rejects.toThrow();
    });

    it('refuses a manual award with no reason', async () => {
      await expect(
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'manual_award',
          points: 50,
          awardedBy: STAFF,
          idempotencyKey: 'no-reason',
        }),
      ).rejects.toThrow();
    });

    it('refuses a zero-point entry', async () => {
      await expect(
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'adjustment',
          points: 0,
          reason: 'nothing',
          awardedBy: STAFF,
          idempotencyKey: 'zero-entry',
        }),
      ).rejects.toThrow();
    });

    it('accepts a manual award that is fully attributed', async () => {
      const outcome = await rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'manual_award',
        points: 50,
        reason: 'ran the community call',
        awardedBy: STAFF,
        idempotencyKey: 'good-manual',
      });

      expect(outcome.kind).toBe('recorded');
      if (outcome.kind !== 'recorded') throw new Error('unreachable');
      expect(outcome.event.awardedBy).toBe(STAFF);
      expect(outcome.event.reason).toBe('ran the community call');
    });
  });

  describe('corrections', () => {
    beforeEach(async () => {
      await rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'manual_award',
        points: 60,
        reason: 'starting balance',
        awardedBy: STAFF,
        idempotencyKey: 'seed-balance',
      });
    });

    it('applies a negative adjustment', async () => {
      const outcome = await rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'adjustment',
        points: -20,
        reason: 'awarded twice by mistake',
        awardedBy: STAFF,
        idempotencyKey: 'correction-1',
      });

      expect(outcome.kind).toBe('recorded');
      expect(await rewards.balance(GUILD, MEMBER)).toBe(40);
    });

    it('refuses a correction that would overdraw', async () => {
      const outcome = await rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'adjustment',
        points: -100,
        reason: 'too much',
        awardedBy: STAFF,
        idempotencyKey: 'correction-2',
      });

      expect(outcome.kind).toBe('insufficient');
      expect(await rewards.balance(GUILD, MEMBER)).toBe(60);
    });

    it('serialises two concurrent corrections rather than overdrawing', async () => {
      /*
       * Both read a balance of 60 and both want -50. Without the advisory lock
       * they both pass the check and commit, leaving -40: a negative balance
       * that no constraint can express, because the balance is a SUM.
       */
      const [first, second] = await Promise.all([
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'adjustment',
          points: -50,
          reason: 'correction a',
          awardedBy: STAFF,
          idempotencyKey: 'race-key-a',
        }),
        rewards.award({
          guildId: GUILD,
          userId: MEMBER,
          kind: 'adjustment',
          points: -50,
          reason: 'correction b',
          awardedBy: STAFF,
          idempotencyKey: 'race-key-b',
        }),
      ]);

      const applied = [first, second].filter((outcome) => outcome.kind === 'recorded');
      expect(applied).toHaveLength(1);
      expect(await rewards.balance(GUILD, MEMBER)).toBe(10);
    });

    it('keeps a corrected member off the leaderboard rather than showing a negative', async () => {
      await rewards.award({
        guildId: GUILD,
        userId: MEMBER,
        kind: 'adjustment',
        points: -60,
        reason: 'reversed entirely',
        awardedBy: STAFF,
        idempotencyKey: 'correction-3',
      });
      await rewards.award({
        guildId: GUILD,
        userId: OTHER,
        kind: 'check_in',
        points: 5,
        idempotencyKey: 'other-member-1',
      });

      const board = await rewards.leaderboard(GUILD, { limit: 10 });
      // A private correction must not become a public ranking.
      expect(board.map((entry) => entry.userId)).toEqual([OTHER]);
    });
  });

  describe('check-ins', () => {
    const today = parseLocalDate('2026-03-12');
    const tomorrow = parseLocalDate('2026-03-13');

    it('records the day and its award atomically', async () => {
      const outcome = await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: today,
        points: 5,
      });

      expect(outcome.kind).toBe('recorded');
      if (outcome.kind !== 'recorded') throw new Error('unreachable');
      expect(outcome.event?.kind).toBe('check_in');
      expect(outcome.balance).toBe(5);

      const rows = await database.sql<{ point_event_id: string | null }[]>`
        SELECT point_event_id FROM ${database.sql(SCHEMA)}.check_ins
        WHERE guild_id = ${GUILD} AND user_id = ${MEMBER}
      `;
      // The check-in points at the award it produced, so neither can be
      // orphaned by a later question about where the points came from.
      expect(rows[0]?.point_event_id).toBe(outcome.event?.id);
    });

    it('refuses a second check-in on the same local day', async () => {
      await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: today,
        points: 5,
      });
      const second = await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: today,
        points: 5,
      });

      expect(second.kind).toBe('already_today');
      expect(await rewards.balance(GUILD, MEMBER)).toBe(5);
    });

    it('lets exactly one of two simultaneous check-ins through', async () => {
      const [first, second] = await Promise.all([
        rewards.recordCheckIn({
          guildId: GUILD,
          userId: MEMBER,
          localDate: today,
          points: 5,
        }),
        rewards.recordCheckIn({
          guildId: GUILD,
          userId: MEMBER,
          localDate: today,
          points: 5,
        }),
      ]);

      expect([first.kind, second.kind].sort()).toEqual(['already_today', 'recorded']);
      expect(await rewards.balance(GUILD, MEMBER)).toBe(5);
    });

    it('records the check-in with no award when rewards are off', async () => {
      const outcome = await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: today,
        points: 0,
      });

      expect(outcome.kind).toBe('recorded');
      if (outcome.kind !== 'recorded') throw new Error('unreachable');
      // A real state, not an error: the participation happened and earned
      // nothing, and back-filling points for it later would invent history.
      expect(outcome.event).toBeNull();
      expect(await rewards.balance(GUILD, MEMBER)).toBe(0);
    });

    it('returns dates newest first, for the streak', async () => {
      await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: today,
        points: 5,
      });
      await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: tomorrow,
        points: 5,
      });

      const dates = await rewards.checkInDates(
        GUILD,
        MEMBER,
        parseLocalDate('2026-03-01'),
      );
      expect(dates).toEqual(['2026-03-13', '2026-03-12']);
    });
  });
});
