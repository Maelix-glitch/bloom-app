import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { parseLocalDate } from '@bloom/utils';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresAwardsRepository } from './awards.js';
import { PostgresRewardsRepository } from './rewards.js';

/**
 * Milestones and achievements, against a real PostgreSQL.
 *
 * Two things here cannot be tested any other way:
 *
 *   • **Granted once, under a race.** A check-in and a shared win seconds apart
 *     both trigger an evaluation. If both see the same fresh count and both
 *     insert, the member gets two rows and two announcements for one milestone.
 *     The primary key is what prevents that, and only a real database has one.
 *   • **The participation query.** Every count an award is granted on comes out
 *     of a single CTE involving a window function, a date subtraction and a
 *     timezone conversion. A fake reimplements it in TypeScript and therefore
 *     proves nothing about the SQL that actually runs.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000092001');
const MEMBER = unsafeSnowflake<UserId>('100000000000092002');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

/** Sydney: UTC+11 in March, so a late-evening UTC instant is already tomorrow. */
const SYDNEY = 'Australia/Sydney';

describe('member awards (integration)', () => {
  let database: Database;
  let awards: PostgresAwardsRepository;
  let rewards: PostgresRewardsRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: SCHEMA,
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

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await new PostgresIdentityRepository(database).upsertGuild({
      guildId: GUILD,
      name: 'Bloom Labs (integration)',
    });

    awards = new PostgresAwardsRepository(database);
    rewards = new PostgresRewardsRepository(database);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.member_awards WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.check_ins WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.point_events WHERE guild_id = ${GUILD}`;
  });

  const grant = (awardKey: string, evidence = { checkIns: 1 }) =>
    awards.grant({
      guildId: GUILD,
      userId: MEMBER,
      awardKey,
      kind: 'milestone',
      evidence,
    });

  describe('granting', () => {
    it('grants an award and reports it as new', async () => {
      const outcome = await grant('milestone.checkins.1');

      expect(outcome.kind).toBe('granted');
      expect(outcome.award.announced).toBe(false);
      expect(outcome.award.evidence).toEqual({ checkIns: 1 });
    });

    it('reports a second grant as already held, with the original evidence', async () => {
      await grant('milestone.checkins.1', { checkIns: 1 });
      const second = await grant('milestone.checkins.1', { checkIns: 99 });

      expect(second.kind).toBe('already_held');
      // The first grant's evidence stands. An award records the moment it was
      // earned, not the last time something recounted.
      expect(second.award.evidence).toEqual({ checkIns: 1 });
    });

    it('grants once when two evaluations race', async () => {
      const outcomes = await Promise.all([
        grant('milestone.checkins.10'),
        grant('milestone.checkins.10'),
        grant('milestone.checkins.10'),
      ]);

      // Exactly one caller may announce. This is the property the whole
      // announce-once design rests on.
      expect(outcomes.filter((outcome) => outcome.kind === 'granted')).toHaveLength(1);
      expect(await awards.list(GUILD, MEMBER)).toHaveLength(1);
    });

    it('rejects a key the schema considers malformed', async () => {
      // Keys are identifiers that end up in audit rows and dashboards. Letting
      // `Milestone 1!` through would make them unqueryable a year from now.
      for (const bad of ['Milestone.1', 'ab', 'milestone 1', '1.milestone']) {
        await expect(grant(bad)).rejects.toThrow();
      }
    });

    it('rejects a kind outside the two that exist', async () => {
      await expect(
        awards.grant({
          guildId: GUILD,
          userId: MEMBER,
          awardKey: 'milestone.checkins.1',
          // Deliberately invalid: the CHECK is the last line of defence if a
          // definition ever acquires a third kind without a migration.
          kind: 'trophy' as 'milestone',
        }),
      ).rejects.toThrow();
    });
  });

  describe('announcing', () => {
    it('marks an award announced without touching when it was earned', async () => {
      const granted = await grant('milestone.checkins.1');
      await awards.markAnnounced(GUILD, MEMBER, 'milestone.checkins.1');

      const [award] = await awards.list(GUILD, MEMBER);
      expect(award?.announced).toBe(true);
      expect(award?.earnedAt.getTime()).toBe(granted.award.earnedAt.getTime());
    });

    it('is silent about an award that does not exist', async () => {
      // A retry after a partial failure must not blow up the announce path.
      await expect(
        awards.markAnnounced(GUILD, MEMBER, 'milestone.checkins.250'),
      ).resolves.toBeUndefined();
    });
  });

  describe('reading', () => {
    it('lists newest first', async () => {
      await grant('milestone.checkins.1');
      await grant('milestone.checkins.10');

      const list = await awards.list(GUILD, MEMBER);
      expect(list.map((award) => award.awardKey)).toEqual([
        'milestone.checkins.10',
        'milestone.checkins.1',
      ]);
    });

    it('returns held keys as a set for cheap skipping', async () => {
      await grant('milestone.checkins.1');

      const held = await awards.heldKeys(GUILD, MEMBER);
      expect(held.has('milestone.checkins.1')).toBe(true);
      expect(held.has('milestone.checkins.10')).toBe(false);
    });

    it('keeps one member out of another member\u2019s awards', async () => {
      const other = unsafeSnowflake<UserId>('100000000000092003');
      await grant('milestone.checkins.1');

      expect(await awards.list(GUILD, other)).toHaveLength(0);
    });
  });

  describe('the participation counts awards are granted on', () => {
    const checkInOn = async (date: string): Promise<void> => {
      await rewards.recordCheckIn({
        guildId: GUILD,
        userId: MEMBER,
        localDate: parseLocalDate(date),
        points: 5,
      });
    };

    const winAt = async (iso: string, index: number): Promise<void> => {
      await database.sql`
        INSERT INTO ${database.sql(SCHEMA)}.point_events
          (guild_id, user_id, kind, points, idempotency_key, created_at)
        VALUES (${GUILD}, ${MEMBER}, 'small_win', 10,
                ${`win-fixture-${String(index)}`}, ${new Date(iso)})
      `;
    };

    it('is all zeroes for someone who has done nothing', async () => {
      expect(await rewards.participation(GUILD, MEMBER, SYDNEY)).toEqual({
        checkIns: 0,
        wins: 0,
        months: 0,
        daysWithBoth: 0,
        longestGapDays: 0,
      });
    });

    it('counts check-ins and wins separately', async () => {
      await checkInOn('2026-03-01');
      await checkInOn('2026-03-02');
      await winAt('2026-03-01T10:00:00.000Z', 1);

      const summary = await rewards.participation(GUILD, MEMBER, SYDNEY);
      expect(summary.checkIns).toBe(2);
      expect(summary.wins).toBe(1);
    });

    it('counts distinct calendar months, not elapsed ones', async () => {
      await checkInOn('2026-01-31');
      await checkInOn('2026-02-01');
      await checkInOn('2026-02-28');

      // Three check-ins, two months. Someone who checked in twice on either
      // side of a month boundary has not been around for three months.
      expect((await rewards.participation(GUILD, MEMBER, SYDNEY)).months).toBe(2);
    });

    it('measures the longest gap between consecutive check-ins', async () => {
      await checkInOn('2026-01-05');
      await checkInOn('2026-01-06');
      await checkInOn('2026-03-01');

      // 54 days away, then back. This is what `achievement.returned` reads.
      expect((await rewards.participation(GUILD, MEMBER, SYDNEY)).longestGapDays).toBe(
        54,
      );
    });

    it('reports no gap for a single check-in', async () => {
      await checkInOn('2026-01-05');

      // lag() over one row is NULL. A first-time member has not been away.
      expect((await rewards.participation(GUILD, MEMBER, SYDNEY)).longestGapDays).toBe(0);
    });

    it('pairs a win with a check-in using the community timezone', async () => {
      await checkInOn('2026-03-02');
      // 22:00 UTC on the 1st is 09:00 on the 2nd in Sydney. Counting in UTC
      // would file this win under the wrong day and lose the pairing.
      await winAt('2026-03-01T22:00:00.000Z', 2);

      expect((await rewards.participation(GUILD, MEMBER, SYDNEY)).daysWithBoth).toBe(1);
    });

    it('does not pair a win with a day that has no check-in', async () => {
      await checkInOn('2026-03-05');
      await winAt('2026-03-01T10:00:00.000Z', 3);

      expect((await rewards.participation(GUILD, MEMBER, SYDNEY)).daysWithBoth).toBe(0);
    });

    it('counts a day with two wins once', async () => {
      await checkInOn('2026-03-02');
      await winAt('2026-03-02T01:00:00.000Z', 4);
      await winAt('2026-03-02T02:00:00.000Z', 5);

      const summary = await rewards.participation(GUILD, MEMBER, SYDNEY);
      // Two wins, one day that had both. The achievement counts days.
      expect(summary.wins).toBe(2);
      expect(summary.daysWithBoth).toBe(1);
    });

    it('ignores another member\u2019s participation', async () => {
      const other = unsafeSnowflake<UserId>('100000000000092004');
      await checkInOn('2026-03-01');

      expect((await rewards.participation(GUILD, other, SYDNEY)).checkIns).toBe(0);
    });
  });
});
