import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresReferralRepository } from './referrals.js';
import { PostgresRewardsRepository } from './rewards.js';

/**
 * The referral handoff, against a real PostgreSQL.
 *
 * Guardian writes a row; Companion pays it. Nothing in that sentence is safe
 * unless the database enforces it, and none of it can be proved by a fake:
 *
 *   • the partial unique index that stops one member being referred twice,
 *   • `FOR UPDATE SKIP LOCKED`, which is what actually separates two workers
 *     reaching for the same batch,
 *   • the state guards in each UPDATE's WHERE clause, which are the only
 *     reason a lost race cannot pay twice,
 *   • the CHECK constraints that refuse a self-referral or a terminal state
 *     without its timestamp,
 *   • and the foreign key to `point_events`, which makes "paid" mean a ledger
 *     row genuinely exists.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000095001');
const INVITER = unsafeSnowflake<UserId>('100000000000095002');
const REFERRED = unsafeSnowflake<UserId>('100000000000095003');
const OTHER = unsafeSnowflake<UserId>('100000000000095004');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

const AT = (iso: string): Date => new Date(iso);
const NOW = AT('2026-03-01T12:00:00.000Z');
const LONG_AGO = AT('2020-01-01T00:00:00.000Z');

describe('referral handoff (integration)', () => {
  let database: Database;
  let referrals: PostgresReferralRepository;
  let rewards: PostgresRewardsRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: SCHEMA,
      // The claim race needs real parallel connections, not a queue.
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

    referrals = new PostgresReferralRepository(database);
    rewards = new PostgresRewardsRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await new PostgresIdentityRepository(database).upsertGuild({
      guildId: GUILD,
      name: 'Bloom Labs (integration)',
    });
  });

  afterAll(async () => {
    /*
     * Leave nothing behind. A paid referral holds a reference to a ledger
     * row, so a leftover from this suite turns another suite's cleanup into a
     * foreign-key failure — which is exactly how this guild block was found
     * to collide with retention's in the first place.
     */
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.referral_triggers WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.point_events WHERE guild_id = ${GUILD}`;
    await database.close();
  });

  beforeEach(async () => {
    // FK order: the trigger points at the ledger row.
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.referral_triggers WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.point_events WHERE guild_id = ${GUILD}`;
  });

  const record = (overrides: Record<string, unknown> = {}) =>
    referrals.record({
      guildId: GUILD,
      referredUserId: REFERRED,
      inviterUserId: INVITER,
      inviteCode: 'bloom01',
      source: 'invite_diff',
      idempotencyKey: `referral:${GUILD}:${REFERRED}`,
      ...overrides,
    });

  // ---------------------------------------------------------------------------
  // What the schema refuses
  // ---------------------------------------------------------------------------

  describe('constraints', () => {
    it('stores a referral and reports it as newly created', async () => {
      const outcome = await record();

      expect(outcome.kind).toBe('recorded');
      expect(outcome.trigger.state).toBe('pending');
      expect(outcome.trigger.attempts).toBe(0);
      expect(outcome.trigger.claimedAt).toBeNull();
    });

    /*
     * A member leaving and rejoining must not mint a second referral. The
     * partial unique index is on (guild_id, referred_user_id) for non-rejected
     * rows, so this is the database refusing, not the repository checking.
     */
    it('refuses a second referral for the same member', async () => {
      await record();
      const second = await record({ inviterUserId: OTHER });

      expect(second.kind).toBe('already_referred');
      expect(second.trigger.inviterUserId).toBe(INVITER);

      const counted = await database.sql<{ count: string }[]>`
        SELECT count(*)::text AS count
        FROM ${database.sql(SCHEMA)}.referral_triggers
        WHERE guild_id = ${GUILD} AND referred_user_id = ${REFERRED}
      `;
      expect(counted[0]?.count).toBe('1');
    });

    /*
     * A rejected referral is not a second chance.
     *
     * The unique index is unconditional, so a member who was turned away —
     * for a too-new account, or for leaving before qualifying — cannot be
     * referred again by rejoining. This is the anti-farming rule in its
     * strongest form: cycling an account through the server produces one row
     * on the first join and conflicts forever after.
     */
    it('does not offer a second chance after a rejection', async () => {
      const first = await record();
      await referrals.markRejected(first.trigger.id, 'account_too_new');

      const second = await record({
        idempotencyKey: `referral:${GUILD}:${REFERRED}:2`,
      });

      expect(second.kind).toBe('already_referred');
      expect(second.trigger.id).toBe(first.trigger.id);
      expect(second.trigger.state).toBe('rejected');
    });

    it('refuses a member referring themselves', async () => {
      await expect(record({ inviterUserId: REFERRED })).rejects.toThrow();
    });

    it('refuses an idempotency key too short to be unique', async () => {
      await expect(record({ idempotencyKey: 'a' })).rejects.toThrow();
    });

    it('refuses an unknown source', async () => {
      await expect(record({ source: 'telepathy' })).rejects.toThrow();
    });

    /*
     * An unattributed referral is allowed — recording "somebody joined and we
     * do not know who invited them" is the whole point of the honest path.
     */
    it('accepts a referral with no inviter', async () => {
      const outcome = await record({ inviterUserId: null, source: 'unavailable' });

      expect(outcome.kind).toBe('recorded');
      expect(outcome.trigger.inviterUserId).toBeNull();
    });

    it('refuses a rejected row with no reason recorded', async () => {
      const { trigger } = await record();

      await expect(
        database.sql`
          UPDATE ${database.sql(SCHEMA)}.referral_triggers
          SET state = 'rejected', rejected_reason = NULL
          WHERE id = ${trigger.id}
        `,
      ).rejects.toThrow();
    });

    it('refuses a paid row with no ledger entry behind it', async () => {
      const { trigger } = await record();

      await expect(
        database.sql`
          UPDATE ${database.sql(SCHEMA)}.referral_triggers
          SET state = 'paid', point_event_id = NULL, consumed_at = now()
          WHERE id = ${trigger.id}
        `,
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // The state machine
  // ---------------------------------------------------------------------------

  describe('state transitions', () => {
    it('moves pending to qualified exactly once', async () => {
      const { trigger } = await record();

      expect(await referrals.markQualified(trigger.id, NOW)).toBe(true);
      expect(await referrals.markQualified(trigger.id, NOW)).toBe(false);

      const row = await referrals.findById(trigger.id);
      expect(row?.state).toBe('qualified');
      expect(row?.qualifiedAt).not.toBeNull();
    });

    it('will not qualify a rejected referral', async () => {
      const { trigger } = await record();
      await referrals.markRejected(trigger.id, 'left_before_qualifying');

      expect(await referrals.markQualified(trigger.id, NOW)).toBe(false);
      expect((await referrals.findById(trigger.id))?.state).toBe('rejected');
    });

    it('will not reject a referral that has already been paid', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);
      const eventId = await payLedger(trigger.idempotencyKey);
      await referrals.markPaid({
        id: trigger.id,
        pointEventId: eventId,
        consumedAt: NOW,
      });

      expect(await referrals.markRejected(trigger.id, 'not_present')).toBe(false);
      expect((await referrals.findById(trigger.id))?.state).toBe('paid');
    });

    it('only lists pending referrals older than the cutoff', async () => {
      const old = await record();
      await database.sql`
        UPDATE ${database.sql(SCHEMA)}.referral_triggers
        SET created_at = ${LONG_AGO}
        WHERE id = ${old.trigger.id}
      `;
      await record({
        referredUserId: OTHER,
        idempotencyKey: `referral:${GUILD}:${OTHER}`,
      });

      const pending = await referrals.listPending(GUILD, AT('2021-01-01T00:00:00.000Z'));

      expect(pending.map((row) => row.id)).toEqual([old.trigger.id]);
    });
  });

  // ---------------------------------------------------------------------------
  // The claim — the part a fake cannot prove
  // ---------------------------------------------------------------------------

  describe('claiming', () => {
    const claim = (workerId: string, limit = 25) =>
      referrals.claim({
        guildId: GUILD,
        workerId,
        limit,
        now: NOW,
        staleClaimsBefore: AT('2026-03-01T11:55:00.000Z'),
      });

    it('claims only qualified, attributed referrals', async () => {
      const pending = await record();
      const unattributed = await record({
        referredUserId: OTHER,
        inviterUserId: null,
        source: 'unavailable',
        idempotencyKey: `referral:${GUILD}:${OTHER}`,
      });
      await referrals.markQualified(unattributed.trigger.id, NOW);

      const claimed = await claim('worker-a');

      expect(claimed).toHaveLength(0);
      expect((await referrals.findById(pending.trigger.id))?.state).toBe('pending');
    });

    it('stamps the worker and counts the attempt', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);

      const [claimed] = await claim('worker-a');

      expect(claimed?.claimedBy).toBe('worker-a');
      expect(claimed?.attempts).toBe(1);
      expect(claimed?.inviterUserId).toBe(INVITER);
    });

    /**
     * Two workers reaching for the same row at the same moment.
     *
     * `FOR UPDATE SKIP LOCKED` is the whole mechanism: the loser does not
     * block and does not error, it simply finds nothing. Anything else here —
     * both claiming, or one deadlocking — is a double payment or a stall.
     */
    it('hands one row to exactly one of two racing workers', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);

      const [a, b] = await Promise.all([claim('worker-a'), claim('worker-b')]);

      expect(a.length + b.length).toBe(1);
      expect((await referrals.findById(trigger.id))?.attempts).toBe(1);
    });

    it('splits a batch between workers without overlap', async () => {
      for (let index = 0; index < 10; index += 1) {
        const userId = unsafeSnowflake<UserId>(
          `1000000000000951${String(index).padStart(2, '0')}`,
        );
        const { trigger } = await record({
          referredUserId: userId,
          idempotencyKey: `referral:${GUILD}:${userId}`,
        });
        await referrals.markQualified(trigger.id, NOW);
      }

      const [a, b] = await Promise.all([claim('worker-a', 5), claim('worker-b', 5)]);
      const ids = [...a, ...b].map((row) => row.id);

      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(10);
    });

    it('does not re-claim a row another worker still holds', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);

      await claim('worker-a');
      const second = await claim('worker-b');

      expect(second).toHaveLength(0);
    });

    /*
     * A worker that died holding a claim must not strand the referral. The
     * stale cutoff is what gets it moving again.
     */
    it('reclaims a stale claim from a dead worker', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);
      await claim('worker-a');

      const later = await referrals.claim({
        guildId: GUILD,
        workerId: 'worker-b',
        limit: 25,
        now: AT('2026-03-01T12:30:00.000Z'),
        staleClaimsBefore: AT('2026-03-01T12:25:00.000Z'),
      });

      expect(later).toHaveLength(1);
      expect(later[0]?.attempts).toBe(2);
    });

    it('releases a claim so the next pass takes it', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);
      await claim('worker-a');

      expect(await referrals.releaseClaim(trigger.id)).toBe(true);

      const retry = await claim('worker-b');
      expect(retry).toHaveLength(1);
    });

    it('never claims another guild’s referrals', async () => {
      const elsewhere = unsafeSnowflake<GuildId>('100000000000095999');
      await new PostgresIdentityRepository(database).upsertGuild({
        guildId: elsewhere,
        name: 'Elsewhere',
      });
      const { trigger } = await referrals.record({
        guildId: elsewhere,
        referredUserId: REFERRED,
        inviterUserId: INVITER,
        inviteCode: 'other01',
        source: 'invite_diff',
        idempotencyKey: `referral:${elsewhere}:${REFERRED}`,
      });
      await referrals.markQualified(trigger.id, NOW);

      expect(await claim('worker-a')).toHaveLength(0);

      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.referral_triggers WHERE guild_id = ${elsewhere}`;
    });
  });

  // ---------------------------------------------------------------------------
  // Payment
  // ---------------------------------------------------------------------------

  /** Write the ledger row Companion would write, returning its id. */
  async function payLedger(idempotencyKey: string): Promise<string> {
    const outcome = await rewards.award({
      guildId: GUILD,
      userId: INVITER,
      kind: 'referral',
      points: 25,
      idempotencyKey,
    });
    if (outcome.kind !== 'recorded') {
      throw new Error(`Expected a ledger row, got ${outcome.kind}.`);
    }
    return outcome.event.id;
  }

  describe('payment', () => {
    it('settles a claimed referral against a real ledger row', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);
      await referrals.claim({
        guildId: GUILD,
        workerId: 'worker-a',
        limit: 25,
        now: NOW,
        staleClaimsBefore: AT('2026-03-01T11:55:00.000Z'),
      });

      const eventId = await payLedger(trigger.idempotencyKey);
      const settled = await referrals.markPaid({
        id: trigger.id,
        pointEventId: eventId,
        consumedAt: NOW,
      });

      expect(settled).toBe(true);
      const row = await referrals.findById(trigger.id);
      expect(row?.state).toBe('paid');
      expect(row?.pointEventId).toBe(eventId);
      expect(await rewards.balance(GUILD, INVITER)).toBe(25);
    });

    it('cannot settle the same referral twice', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);
      const eventId = await payLedger(trigger.idempotencyKey);

      expect(
        await referrals.markPaid({
          id: trigger.id,
          pointEventId: eventId,
          consumedAt: NOW,
        }),
      ).toBe(true);
      expect(
        await referrals.markPaid({
          id: trigger.id,
          pointEventId: eventId,
          consumedAt: NOW,
        }),
      ).toBe(false);
    });

    /**
     * The crash window, for real.
     *
     * The ledger write and the state change are two statements. If the
     * process dies between them the referral looks unpaid, and the only thing
     * standing between the inviter and a second 25 points is the unique index
     * on the idempotency key — which the trigger and the award deliberately
     * share.
     */
    it('a replayed award after a crash is a no-op on the balance', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);

      await payLedger(trigger.idempotencyKey);
      // …crash here, before markPaid. The retry re-awards:
      const replay = await rewards.award({
        guildId: GUILD,
        userId: INVITER,
        kind: 'referral',
        points: 25,
        idempotencyKey: trigger.idempotencyKey,
      });

      expect(replay.kind).toBe('duplicate');
      expect(await rewards.balance(GUILD, INVITER)).toBe(25);
    });

    it('refuses to point a referral at a ledger row that does not exist', async () => {
      const { trigger } = await record();
      await referrals.markQualified(trigger.id, NOW);

      await expect(
        referrals.markPaid({
          id: trigger.id,
          pointEventId: '00000000-0000-4000-8000-000000000000',
          consumedAt: NOW,
        }),
      ).rejects.toThrow();
    });

    it('counts what an inviter has actually been paid', async () => {
      for (let index = 0; index < 3; index += 1) {
        const userId = unsafeSnowflake<UserId>(
          `1000000000000952${String(index).padStart(2, '0')}`,
        );
        const { trigger } = await record({
          referredUserId: userId,
          idempotencyKey: `referral:${GUILD}:${userId}`,
        });
        await referrals.markQualified(trigger.id, NOW);
        if (index < 2) {
          const eventId = await payLedger(trigger.idempotencyKey);
          await referrals.markPaid({
            id: trigger.id,
            pointEventId: eventId,
            consumedAt: NOW,
          });
        }
      }

      expect(await referrals.countPaidForInviter(GUILD, INVITER)).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // The staff read
  // ---------------------------------------------------------------------------

  describe('listRecent', () => {
    it('orders deterministically and caps the page', async () => {
      for (let index = 0; index < 30; index += 1) {
        const userId = unsafeSnowflake<UserId>(
          `1000000000000953${String(index).padStart(2, '0')}`,
        );
        await record({
          referredUserId: userId,
          idempotencyKey: `referral:${GUILD}:${userId}`,
        });
      }

      const first = await referrals.listRecent(GUILD, { limit: 10_000 });
      const second = await referrals.listRecent(GUILD, { limit: 10_000 });

      expect(first).toHaveLength(25);
      expect(first.map((row) => row.id)).toEqual(second.map((row) => row.id));
    });

    /*
     * Rows written inside one transaction can share a created_at to the
     * microsecond. Without the id tiebreaker the page order is whatever the
     * planner feels like, and a staff member paging through sees duplicates.
     */
    it('is stable when timestamps collide exactly', async () => {
      const ids: string[] = [];
      for (let index = 0; index < 5; index += 1) {
        const userId = unsafeSnowflake<UserId>(
          `1000000000000954${String(index).padStart(2, '0')}`,
        );
        const { trigger } = await record({
          referredUserId: userId,
          idempotencyKey: `referral:${GUILD}:${userId}`,
        });
        ids.push(trigger.id);
      }
      await database.sql`
        UPDATE ${database.sql(SCHEMA)}.referral_triggers
        SET created_at = ${NOW}
        WHERE guild_id = ${GUILD}
      `;

      const ordered = await referrals.listRecent(GUILD, { limit: 25 });
      const expected = [...ids].sort((a, b) => b.localeCompare(a));

      expect(ordered.map((row) => row.id)).toEqual(expected);
    });

    it('filters by state', async () => {
      const paid = await record();
      await referrals.markQualified(paid.trigger.id, NOW);
      const eventId = await payLedger(paid.trigger.idempotencyKey);
      await referrals.markPaid({
        id: paid.trigger.id,
        pointEventId: eventId,
        consumedAt: NOW,
      });
      await record({
        referredUserId: OTHER,
        idempotencyKey: `referral:${GUILD}:${OTHER}`,
      });

      const pending = await referrals.listRecent(GUILD, { limit: 25, state: 'pending' });

      expect(pending).toHaveLength(1);
      expect(pending[0]?.referredUserId).toBe(OTHER);
    });
  });

  // ---------------------------------------------------------------------------
  // The referral board
  // ---------------------------------------------------------------------------

  describe('the qualified board', () => {
    /** A qualified referral from one inviter, at a chosen instant. */
    async function qualified(
      inviter: UserId,
      referred: UserId,
      qualifiedAt: Date,
    ): Promise<void> {
      const { trigger } = await record({
        inviterUserId: inviter,
        referredUserId: referred,
        idempotencyKey: `referral:${GUILD}:${referred}`,
      });
      await referrals.markQualified(trigger.id, qualifiedAt);
    }

    const member = (index: number): UserId =>
      unsafeSnowflake<UserId>(`9000000000000951${String(index).padStart(2, '0')}`);

    it('ranks inviters by how many they brought who stayed', async () => {
      await qualified(INVITER, member(1), AT('2026-02-20T00:00:00.000Z'));
      await qualified(INVITER, member(2), AT('2026-02-21T00:00:00.000Z'));
      await qualified(OTHER, member(3), AT('2026-02-22T00:00:00.000Z'));

      const board = await referrals.qualifiedLeaderboard(GUILD);

      expect(board.map((row) => [row.userId, row.count])).toEqual([
        [INVITER, 2],
        [OTHER, 1],
      ]);
    });

    it('counts a referral that has been paid as well as one merely qualified', async () => {
      /*
       * Payment is Companion catching up, not the member doing more. A board
       * that dropped someone the moment they were paid would count down.
       */
      await qualified(INVITER, member(4), AT('2026-02-20T00:00:00.000Z'));
      const rows = await database.sql<{ id: string }[]>`
        SELECT id FROM ${database.sql(SCHEMA)}.referral_triggers
        WHERE guild_id = ${GUILD} AND referred_user_id = ${member(4)}
      `;
      const id = rows[0]?.id;
      if (!id) throw new Error('no referral to pay');

      const outcome = await rewards.award({
        guildId: GUILD,
        userId: INVITER,
        kind: 'referral',
        points: 50,
        idempotencyKey: `referral:pay:${id}`,
      });
      if (outcome.kind === 'insufficient') throw new Error('unreachable');

      await referrals.claim({
        guildId: GUILD,
        limit: 1,
        workerId: 'test',
        now: NOW,
        staleClaimsBefore: LONG_AGO,
      });
      await referrals.markPaid({
        id,
        pointEventId: outcome.event.id,
        consumedAt: NOW,
      });

      const board = await referrals.qualifiedLeaderboard(GUILD);
      expect(board).toEqual([{ userId: INVITER, count: 1 }]);
    });

    it('ignores a pending or rejected referral', async () => {
      // Pending may still be rejected, so crediting it would recognise an
      // invite that never qualified.
      await record({ referredUserId: member(5), idempotencyKey: `r:${member(5)}` });

      const { trigger } = await record({
        referredUserId: member(6),
        idempotencyKey: `r:${member(6)}`,
      });
      await referrals.markRejected(trigger.id, 'left_before_qualifying');

      expect(await referrals.qualifiedLeaderboard(GUILD)).toHaveLength(0);
    });

    it('dates a referral by when it qualified, not when it was created', async () => {
      /*
       * The join and the qualification are days apart by design. Dating by
       * creation would file a referral under the week the newcomer arrived
       * rather than the week they proved they stayed.
       */
      await qualified(INVITER, member(7), AT('2026-03-01T00:00:00.000Z'));

      const recent = await referrals.qualifiedLeaderboard(GUILD, {
        since: AT('2026-02-25T00:00:00.000Z'),
      });
      expect(recent).toHaveLength(1);

      const beforeQualification = await referrals.qualifiedLeaderboard(GUILD, {
        since: AT('2026-03-02T00:00:00.000Z'),
      });
      expect(beforeQualification).toHaveLength(0);
    });

    it('breaks ties by earliest qualification, then by inviter id', async () => {
      const at = AT('2026-02-20T00:00:00.000Z');
      await qualified(INVITER, member(8), at);
      await qualified(OTHER, member(9), at);

      const first = await referrals.qualifiedLeaderboard(GUILD);
      const again = await referrals.qualifiedLeaderboard(GUILD);

      expect(again).toEqual(first);
      const ids = first.map((row) => row.userId);
      expect(ids).toEqual([...ids].toSorted((a, b) => a.localeCompare(b)));
    });

    it('bounds the board and the window count', async () => {
      for (let index = 10; index < 40; index += 1) {
        await qualified(
          unsafeSnowflake<UserId>(`9000000000000952${String(index)}`),
          member(index),
          AT('2026-02-20T00:00:00.000Z'),
        );
      }

      const board = await referrals.qualifiedLeaderboard(GUILD, { limit: 10_000 });
      expect(board).toHaveLength(25);

      const counted = await referrals.countQualifiedInWindow(
        GUILD,
        AT('2026-02-01T00:00:00.000Z'),
        null,
      );
      expect(counted).toBe(30);
    });

    it('counts only this guild', async () => {
      await qualified(INVITER, member(41), AT('2026-02-20T00:00:00.000Z'));

      const elsewhere = unsafeSnowflake<GuildId>('100000000000095999');
      expect(await referrals.qualifiedLeaderboard(elsewhere)).toHaveLength(0);
      expect(await referrals.countQualifiedInWindow(elsewhere, LONG_AGO, null)).toBe(0);
    });
  });
});
