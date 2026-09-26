import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresLabsRepository } from './labs.js';
import {
  ERASURE_TOMBSTONE,
  PRUNABLE_TABLES,
  PostgresRetentionRepository,
} from './retention.js';

/**
 * Retention and erasure, against a real PostgreSQL.
 *
 * Nothing here can be tested with a fake, because every claim is about what
 * PostgreSQL does to rows:
 *
 *   • Deletes remove exactly the rows past their window and nothing inside it.
 *     An off-by-one in a cutoff silently deletes a day of audit history.
 *   • Batches are bounded, and a run that hits the cap says so, so a backlog
 *     is visible instead of looking like a clean night forever.
 *   • Erasure redacts member prose while leaving structure intact — and the
 *     redacted values still satisfy the table's own CHECK constraints, which
 *     is precisely what a TypeScript fake cannot prove.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000094001');
const MEMBER = unsafeSnowflake<UserId>('100000000000094002');
const OTHER = unsafeSnowflake<UserId>('100000000000094003');
const STAFF = unsafeSnowflake<UserId>('100000000000094004');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

const DAY = 86_400_000;

describe('retention (integration)', () => {
  let database: Database;
  let retention: PostgresRetentionRepository;
  let labs: PostgresLabsRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: SCHEMA,
      maxConnections: 4,
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
      name: 'Bloom retention (integration)',
    });

    retention = new PostgresRetentionRepository(database);
    labs = new PostgresLabsRepository(database);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    const sql = database.sql;
    await sql`DELETE FROM ${sql(SCHEMA)}.bug_reports WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.bug_counters WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.audit_events WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.command_usage WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.verification_attempts WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.message_cooldowns WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.point_events WHERE guild_id = ${GUILD}`;
    await sql`DELETE FROM ${sql(SCHEMA)}.idempotency_keys WHERE guild_id = ${GUILD}`;
  });

  /** An audit row aged by inserting an explicit `created_at`. */
  async function seedAudit(ageDays: number, count = 1): Promise<void> {
    const sql = database.sql;
    const createdAt = new Date(Date.now() - ageDays * DAY);
    for (let index = 0; index < count; index += 1) {
      await sql`
        INSERT INTO ${sql(SCHEMA)}.audit_events
          (guild_id, bot_name, event, severity, details, created_at)
        VALUES (${GUILD}, 'guardian', 'test.seeded', 'info', ${sql.json({})}, ${createdAt})
      `;
    }
  }

  async function auditCount(): Promise<number> {
    const sql = database.sql;
    const rows = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM ${sql(SCHEMA)}.audit_events
      WHERE guild_id = ${GUILD}
    `;
    return Number(rows[0]?.count ?? '0');
  }

  describe('prune', () => {
    it('deletes audit rows past the window and keeps everything inside it', async () => {
      await seedAudit(800, 3); // past the 730-day window
      await seedAudit(700, 2); // inside it

      const result = await retention.prune();

      expect(result.deleted.audit_events).toBe(3);
      expect(await auditCount()).toBe(2);
    });

    it('keeps a row that is one day short of the window', async () => {
      await seedAudit(729);

      await retention.prune();

      // An off-by-one here silently deletes a day of moderation history, and
      // nothing would ever report that it had.
      expect(await auditCount()).toBe(1);
    });

    it('honours a policy that overrides the default window', async () => {
      await seedAudit(10, 2);

      const result = await retention.prune({
        policy: {
          jobRunDays: 90,
          commandUsageDays: 90,
          verificationAttemptDays: 180,
          auditEventDays: 5,
        },
      });

      expect(result.deleted.audit_events).toBe(2);
      expect(await auditCount()).toBe(0);
    });

    it('deletes expired idempotency keys and leaves live ones alone', async () => {
      const sql = database.sql;
      await sql`
        INSERT INTO ${sql(SCHEMA)}.idempotency_keys (key, bot_name, guild_id, operation, expires_at)
        VALUES
          ('expired-key-00000001', 'guardian', ${GUILD}, 'test.op', now() - interval '1 hour'),
          ('live-key-0000000001', 'guardian', ${GUILD}, 'test.op', now() + interval '1 day')
      `;

      const result = await retention.prune();

      expect(result.deleted.idempotency_keys).toBe(1);
      const rows = await sql<{ key: string }[]>`
        SELECT key FROM ${sql(SCHEMA)}.idempotency_keys WHERE guild_id = ${GUILD}
      `;
      expect(rows.map((row) => row.key)).toEqual(['live-key-0000000001']);
    });

    it('gives a just-expired cooldown a day of grace', async () => {
      const sql = database.sql;
      await sql`
        INSERT INTO ${sql(SCHEMA)}.message_cooldowns (guild_id, scope, subject, expires_at)
        VALUES
          (${GUILD}, 'test', 'recent', now() - interval '1 hour'),
          (${GUILD}, 'test', 'ancient', now() - interval '3 days')
      `;

      const result = await retention.prune();

      // The recently expired row is still evidence for "why did this not fire".
      expect(result.deleted.message_cooldowns).toBe(1);
      const rows = await sql<{ subject: string }[]>`
        SELECT subject FROM ${sql(SCHEMA)}.message_cooldowns WHERE guild_id = ${GUILD}
      `;
      expect(rows.map((row) => row.subject)).toEqual(['recent']);
    });

    it('caps a run at the batch size and reports that more remains', async () => {
      await seedAudit(800, 5);

      const result = await retention.prune({ batchSize: 2 });

      expect(result.deleted.audit_events).toBe(2);
      // Without `more`, a permanent backlog looks exactly like a clean night.
      expect(result.more).toBe(true);
      expect(await auditCount()).toBe(3);
    });

    it('reports more as false when everything fitted in one run', async () => {
      await seedAudit(800, 2);

      const result = await retention.prune({ batchSize: 100 });

      expect(result.more).toBe(false);
    });

    it('catches up across successive runs', async () => {
      await seedAudit(800, 5);

      await retention.prune({ batchSize: 2 });
      await retention.prune({ batchSize: 2 });
      const third = await retention.prune({ batchSize: 2 });

      expect(await auditCount()).toBe(0);
      expect(third.more).toBe(false);
    });

    it('reports a count for every prunable table, even when zero', async () => {
      const result = await retention.prune();

      // An operator reading the audit row should see the whole surface, so a
      // table that silently stopped being pruned is visible as a zero rather
      // than as a missing key.
      for (const table of PRUNABLE_TABLES) {
        expect(result.deleted[table]).toBeTypeOf('number');
      }
      expect(Object.keys(result.deleted)).toHaveLength(PRUNABLE_TABLES.length);
    });

    it('never touches the member record', async () => {
      const sql = database.sql;

      await labs.submitFeedback({
        guildId: GUILD,
        userId: MEMBER,
        category: 'feature',
        summary: 'A summary that is comfortably long enough.',
        detail: null,
        correlationId: null,
      });
      await sql`
        INSERT INTO ${sql(SCHEMA)}.point_events
          (guild_id, user_id, kind, points, idempotency_key, created_at)
        VALUES (${GUILD}, ${MEMBER}, 'check_in', 5, 'prune-test-key-01', now() - interval '900 days')
      `;

      await retention.prune({
        policy: {
          jobRunDays: 0,
          commandUsageDays: 0,
          verificationAttemptDays: 0,
          auditEventDays: 0,
        },
      });

      // Even with every window set to zero, the ledger and the submissions are
      // untouched: they are not on the allowlist, and nothing can put them
      // there by getting a policy number wrong.
      const points = await sql<{ count: string }[]>`
        SELECT count(*)::text AS count FROM ${sql(SCHEMA)}.point_events WHERE guild_id = ${GUILD}
      `;
      const feedback = await sql<{ count: string }[]>`
        SELECT count(*)::text AS count FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${GUILD}
      `;
      expect(points[0]?.count).toBe('1');
      expect(feedback[0]?.count).toBe('1');
    });
  });

  describe('eraseMember', () => {
    it('redacts feedback the member wrote', async () => {
      await labs.submitFeedback({
        guildId: GUILD,
        userId: MEMBER,
        category: 'feature',
        summary: 'The check-in reminder arrives too late to be useful.',
        detail: 'I usually check in before work and it lands at nine.',
        correlationId: null,
      });

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.feedbackRedacted).toBe(1);
      const sql = database.sql;
      const rows = await sql<{ summary: string; detail: string | null }[]>`
        SELECT summary, detail FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${GUILD}
      `;
      expect(rows[0]?.summary).toBe(ERASURE_TOMBSTONE);
      expect(rows[0]?.detail).toBeNull();
    });

    it('leaves another member\u2019s feedback alone', async () => {
      await labs.submitFeedback({
        guildId: GUILD,
        userId: OTHER,
        category: 'feature',
        summary: 'Somebody else wrote this and did not ask for anything.',
        detail: null,
        correlationId: null,
      });

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.feedbackRedacted).toBe(0);
      const sql = database.sql;
      const rows = await sql<{ summary: string }[]>`
        SELECT summary FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${GUILD}
      `;
      expect(rows[0]?.summary).toContain('Somebody else');
    });

    it('redacts a bug report but keeps its number, status and history', async () => {
      const bug = await labs.fileBug({
        guildId: GUILD,
        reporterId: MEMBER,
        area: 'app',
        summary: 'Saving a check-in shows an error and loses the note.',
        steps: 'Open the app, write a note, press save, watch it vanish.',
        expected: 'The note is saved.',
        correlationId: null,
      });

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.bugReportsRedacted).toBe(1);

      const stored = await labs.findBug(GUILD, bug.bugNumber);
      // The number is quoted in channels and referenced by duplicates. Deleting
      // the row would turn every one of those references into a dangling
      // number and quietly change what the team believes about its backlog.
      expect(stored?.bugNumber).toBe(bug.bugNumber);
      expect(stored?.status).toBe('NEW');
      expect(stored?.summary).toBe(ERASURE_TOMBSTONE);
      expect(stored?.steps).toBe(ERASURE_TOMBSTONE);
      expect(stored?.expected).toBeNull();

      const history = await labs.bugHistory(bug.id);
      expect(history).toHaveLength(1);
    });

    it('writes a tombstone that satisfies the table\u2019s own CHECK constraints', async () => {
      // The bug summary and steps columns require 8..200 and 8..2000 non-blank
      // characters. An erasure that wrote an empty string would fail at the
      // moment it mattered most, on a member's request, in production.
      await labs.fileBug({
        guildId: GUILD,
        reporterId: MEMBER,
        area: 'discord',
        summary: 'A summary long enough to pass the floor.',
        steps: 'Steps long enough to pass the floor as well.',
        expected: null,
        correlationId: null,
      });

      await expect(retention.eraseMember(GUILD, MEMBER)).resolves.toBeDefined();
      expect(ERASURE_TOMBSTONE.trim().length).toBeGreaterThanOrEqual(8);
    });

    it('redacts check-in and small-win notes but keeps the points', async () => {
      const sql = database.sql;
      await sql`
        INSERT INTO ${sql(SCHEMA)}.point_events
          (guild_id, user_id, kind, points, reason, idempotency_key)
        VALUES
          (${GUILD}, ${MEMBER}, 'check_in', 5, 'felt rough today', 'erase-test-key-01'),
          (${GUILD}, ${MEMBER}, 'small_win', 10, 'finally called the doctor', 'erase-test-key-02')
      `;

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.ledgerNotesRedacted).toBe(2);
      const rows = await sql<{ points: number; reason: string | null }[]>`
        SELECT points, reason FROM ${sql(SCHEMA)}.point_events
        WHERE guild_id = ${GUILD} ORDER BY points
      `;
      // The balance has already been shown to the member and to everyone who
      // saw a leaderboard. The words go; the arithmetic stays.
      expect(rows.map((row) => row.points)).toEqual([5, 10]);
      expect(rows.every((row) => row.reason === null)).toBe(true);
    });

    it('keeps a staff-authored award reason, which is not the member\u2019s to erase', async () => {
      const sql = database.sql;
      await sql`
        INSERT INTO ${sql(SCHEMA)}.point_events
          (guild_id, user_id, kind, points, reason, awarded_by, idempotency_key)
        VALUES (${GUILD}, ${MEMBER}, 'manual_award', 25, 'ran the March challenge', ${STAFF}, 'erase-test-key-03')
      `;

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.ledgerNotesRedacted).toBe(0);
      const rows = await sql<{ reason: string | null }[]>`
        SELECT reason FROM ${sql(SCHEMA)}.point_events
        WHERE guild_id = ${GUILD} AND kind = 'manual_award'
      `;
      // A CHECK requires manual awards to keep a non-blank reason, and the
      // reason is staff writing down why they moved someone's points.
      expect(rows[0]?.reason).toBe('ran the March challenge');
    });

    it('is idempotent, so a repeated request is not an error', async () => {
      await labs.submitFeedback({
        guildId: GUILD,
        userId: MEMBER,
        category: 'other',
        summary: 'Something worth saying at least eight characters long.',
        detail: null,
        correlationId: null,
      });

      const first = await retention.eraseMember(GUILD, MEMBER);
      const second = await retention.eraseMember(GUILD, MEMBER);

      expect(first.feedbackRedacted).toBe(1);
      // Already-tombstoned rows are excluded, so the second pass reports zero
      // rather than redacting the tombstone again and inflating the count.
      expect(second.feedbackRedacted).toBe(0);
      expect(second.total).toBe(0);
    });

    it('reports how many audit rows name the member, without touching them', async () => {
      const sql = database.sql;
      await sql`
        INSERT INTO ${sql(SCHEMA)}.audit_events
          (guild_id, bot_name, event, severity, actor_id, details)
        VALUES (${GUILD}, 'guardian', 'test.seeded', 'info', ${MEMBER}, ${sql.json({})})
      `;

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.auditActorRows).toBe(1);
      // Audit rows hold ids, event names and counts — never prose — which is
      // why they can be kept for two years and survive an erasure.
      expect(await auditCount()).toBe(1);
    });

    it('is scoped to one guild', async () => {
      const otherGuild = unsafeSnowflake<GuildId>('100000000000094009');
      await new PostgresIdentityRepository(database).upsertGuild({
        guildId: otherGuild,
        name: 'Another guild',
      });

      const sql = database.sql;
      await sql`DELETE FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${otherGuild}`;
      await labs.submitFeedback({
        guildId: otherGuild,
        userId: MEMBER,
        category: 'other',
        summary: 'The same person, somewhere else entirely.',
        detail: null,
        correlationId: null,
      });

      const result = await retention.eraseMember(GUILD, MEMBER);

      expect(result.feedbackRedacted).toBe(0);
      const rows = await sql<{ summary: string }[]>`
        SELECT summary FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${otherGuild}
      `;
      expect(rows[0]?.summary).toContain('somewhere else');
      await sql`DELETE FROM ${sql(SCHEMA)}.feedback WHERE guild_id = ${otherGuild}`;
    });
  });
});
