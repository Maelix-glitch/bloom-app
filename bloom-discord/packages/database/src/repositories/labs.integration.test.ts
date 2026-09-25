import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresLabsRepository } from './labs.js';

/**
 * Feedback and bug intake, against a real PostgreSQL.
 *
 * Three things here cannot be tested with a fake:
 *
 *   • **The bug number allocator under concurrency.** Ten members filing at
 *     once must receive ten distinct numbers with no gaps and no unique
 *     violation. `UPDATE … RETURNING` takes a row lock; `max(n)+1` would not.
 *   • **The CHECK constraints.** They are the last line of defence when a
 *     service is bypassed, and a fake that reimplements them in TypeScript
 *     proves only that the fake agrees with itself.
 *   • **The transaction boundary.** A bug and its first history row are written
 *     together or not at all, and a consumed number attached to nothing shows
 *     up forever as a gap in a sequence people read as a list.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000093001');
const MEMBER = unsafeSnowflake<UserId>('100000000000093002');
const STAFF = unsafeSnowflake<UserId>('100000000000093003');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

describe('labs intake (integration)', () => {
  let database: Database;
  let labs: PostgresLabsRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: SCHEMA,
      // Real parallel connections, not a queue: the allocator test needs them.
      maxConnections: 12,
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

    labs = new PostgresLabsRepository(database);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.bug_reports WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.feedback WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.bug_counters WHERE guild_id = ${GUILD}`;
  });

  const file = (summary = 'Saving a check-in shows an error') =>
    labs.fileBug({
      guildId: GUILD,
      reporterId: MEMBER,
      area: 'app',
      summary,
      steps: '1. Open the app 2. Tap Check in 3. Save',
    });

  describe('feedback', () => {
    it('stores what the member wrote, unmodified', async () => {
      const text = 'The **check-in** reminder fires too late for me';
      const entry = await labs.submitFeedback({
        guildId: GUILD,
        userId: MEMBER,
        category: 'improvement',
        summary: text,
      });

      // Escaping is a rendering concern. The row is the record.
      expect(entry.summary).toBe(text);
    });

    it('rejects a summary below the useful floor', async () => {
      await expect(
        labs.submitFeedback({
          guildId: GUILD,
          userId: MEMBER,
          category: 'other',
          summary: 'broken',
        }),
      ).rejects.toThrow();
    });

    it('rejects a summary that is only whitespace', async () => {
      // The CHECK uses btrim, so a field of spaces is not a way past it.
      await expect(
        labs.submitFeedback({
          guildId: GUILD,
          userId: MEMBER,
          category: 'other',
          summary: '              ',
        }),
      ).rejects.toThrow();
    });

    it('rejects a category outside the four that exist', async () => {
      await expect(
        labs.submitFeedback({
          guildId: GUILD,
          userId: MEMBER,
          category: 'urgent' as 'other',
          summary: 'This should not be stored',
        }),
      ).rejects.toThrow();
    });

    it('counts only this member’s submissions in the window', async () => {
      await labs.submitFeedback({
        guildId: GUILD,
        userId: MEMBER,
        category: 'other',
        summary: 'Something worth saying',
      });
      await labs.submitFeedback({
        guildId: GUILD,
        userId: STAFF,
        category: 'other',
        summary: 'Something else worth saying',
      });

      const since = new Date(Date.now() - 60_000);
      expect(await labs.countFeedbackSince(GUILD, MEMBER, since)).toBe(1);
    });

    it('excludes anything older than the window', async () => {
      await labs.submitFeedback({
        guildId: GUILD,
        userId: MEMBER,
        category: 'other',
        summary: 'Something worth saying',
      });

      const future = new Date(Date.now() + 60_000);
      expect(await labs.countFeedbackSince(GUILD, MEMBER, future)).toBe(0);
    });
  });

  describe('bug numbers', () => {
    it('starts at one and counts up', async () => {
      expect((await file()).bugNumber).toBe(1);
      expect((await file()).bugNumber).toBe(2);
    });

    it('gives ten concurrent filings ten distinct numbers', async () => {
      const filed = await Promise.all(Array.from({ length: 10 }, () => file()));

      const numbers = filed.map((bug) => bug.bugNumber).sort((a, b) => a - b);
      // No duplicates, no gaps, no unique violation. This is the whole reason
      // the counter is a locked row rather than `max(n) + 1`.
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('keeps one guild’s numbering out of another’s', async () => {
      const other = unsafeSnowflake<GuildId>('100000000000093009');
      await new PostgresIdentityRepository(database).upsertGuild({
        guildId: other,
        name: 'Another server',
      });

      await file();
      const elsewhere = await labs.fileBug({
        guildId: other,
        reporterId: MEMBER,
        area: 'app',
        summary: 'A different server’s first bug',
        steps: 'Steps that reproduce it',
      });

      // Staff quote these numbers out loud. "Bug 1" has to mean something.
      expect(elsewhere.bugNumber).toBe(1);

      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.bug_reports WHERE guild_id = ${other}`;
      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.bug_counters WHERE guild_id = ${other}`;
    });
  });

  describe('filing', () => {
    it('writes the bug and its first history row together', async () => {
      const bug = await file();

      const history = await labs.bugHistory(bug.id);
      expect(history).toHaveLength(1);
      expect(history[0]?.fromStatus).toBeNull();
      expect(history[0]?.toStatus).toBe('NEW');
    });

    it('rejects steps below the useful floor', async () => {
      await expect(
        labs.fileBug({
          guildId: GUILD,
          reporterId: MEMBER,
          area: 'app',
          summary: 'Something is broken here',
          steps: 'broke',
        }),
      ).rejects.toThrow();
    });

    it('rejects an area outside the four that exist', async () => {
      await expect(
        labs.fileBug({
          guildId: GUILD,
          reporterId: MEMBER,
          area: 'website' as 'app',
          summary: 'Something is broken here',
          steps: 'Steps that reproduce it',
        }),
      ).rejects.toThrow();
    });
  });

  describe('triage', () => {
    it('moves a bug and appends the transition', async () => {
      const bug = await file();

      const outcome = await labs.triage({
        guildId: GUILD,
        bugNumber: bug.bugNumber,
        status: 'TRIAGED',
        actorId: STAFF,
      });

      expect(outcome.kind).toBe('moved');
      const history = await labs.bugHistory(bug.id);
      expect(history.map((event) => event.toStatus)).toEqual(['NEW', 'TRIAGED']);
    });

    it('reports a repeat of the same move as unchanged', async () => {
      const bug = await file();
      await labs.triage({
        guildId: GUILD,
        bugNumber: bug.bugNumber,
        status: 'TRIAGED',
        actorId: STAFF,
      });

      const second = await labs.triage({
        guildId: GUILD,
        bugNumber: bug.bugNumber,
        status: 'TRIAGED',
        actorId: STAFF,
      });

      // Two moderators, one minute, one bug. The reporter must not be told
      // twice and the history must not claim it happened twice.
      expect(second.kind).toBe('unchanged');
      expect(await labs.bugHistory(bug.id)).toHaveLength(2);
    });

    it('produces one transition when two triages race', async () => {
      const bug = await file();

      const outcomes = await Promise.all([
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'TRIAGED',
          actorId: STAFF,
        }),
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'TRIAGED',
          actorId: MEMBER,
        }),
      ]);

      // `FOR UPDATE` serialises them, so the loser reads the already-moved row
      // rather than writing a second identical transition.
      expect(outcomes.filter((outcome) => outcome.kind === 'moved')).toHaveLength(1);
      expect(await labs.bugHistory(bug.id)).toHaveLength(2);
    });

    it('reports a missing bug rather than inventing one', async () => {
      const outcome = await labs.triage({
        guildId: GUILD,
        bugNumber: 4040,
        status: 'TRIAGED',
        actorId: STAFF,
      });

      expect(outcome.kind).toBe('not_found');
    });

    it('refuses a terminal state with no resolution', async () => {
      const bug = await file();

      // The constraint, not the service. This is what holds when someone runs
      // an UPDATE by hand at two in the morning.
      await expect(
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'FIXED',
          actorId: STAFF,
        }),
      ).rejects.toThrow();
    });

    it('refuses a resolution that is only whitespace', async () => {
      const bug = await file();

      await expect(
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'WONT_FIX',
          actorId: STAFF,
          resolution: '     ',
        }),
      ).rejects.toThrow();
    });

    it('refuses DUPLICATE without a target, and a target without DUPLICATE', async () => {
      const bug = await file();

      await expect(
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'DUPLICATE',
          actorId: STAFF,
          resolution: 'Already reported',
        }),
      ).rejects.toThrow();

      await expect(
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'FIXED',
          actorId: STAFF,
          resolution: 'Fixed in 1.4.2',
          duplicateOf: 1,
        }),
      ).rejects.toThrow();
    });

    it('refuses a bug that is a duplicate of itself', async () => {
      const bug = await file();

      await expect(
        labs.triage({
          guildId: GUILD,
          bugNumber: bug.bugNumber,
          status: 'DUPLICATE',
          actorId: STAFF,
          resolution: 'Already reported',
          duplicateOf: bug.bugNumber,
        }),
      ).rejects.toThrow();
    });

    it('records who moved it and when', async () => {
      const bug = await file();

      await labs.triage({
        guildId: GUILD,
        bugNumber: bug.bugNumber,
        status: 'FIXED',
        actorId: STAFF,
        resolution: 'Fixed in 1.4.2',
      });

      const moved = await labs.findBug(GUILD, bug.bugNumber);
      expect(moved?.triagedBy).toBe(STAFF);
      expect(moved?.triagedAt).not.toBeNull();
    });
  });

  describe('the queue', () => {
    it('shows only what is still open, oldest first', async () => {
      const first = await file('The oldest thing still waiting');
      await file('Something newer');
      const closed = await file('Something already dealt with');

      await labs.triage({
        guildId: GUILD,
        bugNumber: closed.bugNumber,
        status: 'FIXED',
        actorId: STAFF,
        resolution: 'Fixed in 1.4.2',
      });

      const queue = await labs.bugQueue(GUILD);
      expect(queue).toHaveLength(2);
      expect(queue[0]?.bugNumber).toBe(first.bugNumber);
    });

    it('can be narrowed to one status, including a closed one', async () => {
      const bug = await file();
      await labs.triage({
        guildId: GUILD,
        bugNumber: bug.bugNumber,
        status: 'WONT_FIX',
        actorId: STAFF,
        resolution: 'Working as intended',
      });

      expect(await labs.bugQueue(GUILD, { status: 'WONT_FIX' })).toHaveLength(1);
      expect(await labs.bugQueue(GUILD)).toHaveLength(0);
    });
  });
});
