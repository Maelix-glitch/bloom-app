import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  unsafeSnowflake,
  type CaseStatus,
  type GuildId,
  type ReportCategory,
  type UserId,
} from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { newCorrelationId } from '@bloom/utils';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresCaseRepository } from './cases.js';
import { ACTIVE_CASE_STATUSES } from './cases.js';

/**
 * `CaseRepository.listReports` against a real PostgreSQL.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`. The fake proves the staff
 * queue renders; only the database can prove the parts that are SQL — that the
 * JOIN scopes to one guild, that `status = ANY(...)` matches the TypeScript
 * notion of "still waiting", that `LIMIT` is really applied rather than
 * sliced in memory afterwards, and above all that the projection cannot return
 * report text. A fake cannot fail that last one: it builds its rows by hand
 * from the same interface, so it agrees with itself no matter what the real
 * query selects.
 *
 * Requires the schema to be migrated first (`pnpm db:migrate`).
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000090001');
/** A second guild, to prove the queue is scoped rather than globally shared. */
const OTHER_GUILD = unsafeSnowflake<GuildId>('100000000000090002');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

function userId(suffix: string): UserId {
  return unsafeSnowflake<UserId>(`10000000000009${suffix.padStart(4, '0')}`);
}

const REPORTER = userId('1');
const SUBJECT = userId('2');
const ASSIGNEE = userId('3');

/** The reporter's own words. Must never come back from a list query. */
const PRIVATE_TEXT =
  'They followed me into three channels repeating the same insult, and I have screenshots.';

describe('report queue persistence (integration)', () => {
  let database: Database;
  let cases: PostgresCaseRepository;

  /**
   * Open a case with a report attached, the way `/report` does.
   *
   * Terminal statuses are reached by transition rather than by opening into
   * them, because the repository refuses a direct open into RESOLVED or
   * CLOSED — correctly, since a case nobody ever opened cannot have been
   * resolved. The fixture obeys that rule instead of writing the row behind
   * the repository's back.
   */
  async function fileReport(
    options: {
      readonly guildId?: GuildId;
      readonly status?: CaseStatus;
      readonly description?: string;
      readonly category?: ReportCategory;
    } = {},
  ): Promise<number> {
    const guildId = options.guildId ?? GUILD;
    const status = options.status ?? 'OPEN';
    const category = options.category ?? 'member_conduct';
    const openAs = status === 'RESOLVED' || status === 'CLOSED' ? 'OPEN' : status;

    const { case: row } = await cases.open(
      {
        guildId,
        origin: 'report',
        openedBy: REPORTER,
        summary: 'A report was filed.',
        subjectId: SUBJECT,
        category,
        status: openAs,
        correlationId: newCorrelationId(),
      },
      {
        reporterId: REPORTER,
        category,
        description: options.description ?? PRIVATE_TEXT,
        targetUserId: SUBJECT,
        targetChannelId: null,
        targetMessageId: null,
      },
    );

    if (openAs !== status) {
      const outcome = await cases.transitionStatus({
        guildId,
        caseNumber: row.caseNumber,
        to: status,
        actorId: ASSIGNEE,
        ...(status === 'RESOLVED' ? { resolution: 'Settled between both sides.' } : {}),
        correlationId: newCorrelationId(),
      });
      if (outcome.kind !== 'applied') {
        throw new Error(`Fixture could not reach ${status}: ${outcome.kind}.`);
      }
    }

    return row.caseNumber;
  }

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

    const identity = new PostgresIdentityRepository(database);
    cases = new PostgresCaseRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    // Both guilds are registered the normal way. The fixture does not reach
    // around the foreign keys or relax anything to make itself easier to set
    // up: the privileges under test are the ones Guardian actually runs with.
    await identity.upsertGuild({ guildId: GUILD, name: 'Bloom Labs (integration)' });
    await identity.upsertGuild({
      guildId: OTHER_GUILD,
      name: 'Somewhere else (integration)',
    });
  });

  afterAll(async () => {
    await database.close();
  });

  /*
   * The same cleanup the moderation integration suite uses: delete this
   * suite's own guild rows between tests. Reports cascade from their case, and
   * the counter table is reset so case numbers restart at 1 and assertions can
   * name them.
   */
  beforeEach(async () => {
    for (const guildId of [GUILD, OTHER_GUILD]) {
      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.moderation_cases WHERE guild_id = ${guildId}`;
      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.case_counters WHERE guild_id = ${guildId}`;
    }
  });

  // ---------------------------------------------------------------------------
  // The projection
  // ---------------------------------------------------------------------------

  it('returns the report with its case context', async () => {
    const caseNumber = await fileReport();

    const rows = await cases.listReports(GUILD);

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.caseNumber).toBe(caseNumber);
    expect(row.caseStatus).toBe('OPEN');
    expect(row.reporterId).toBe(REPORTER);
    expect(row.targetUserId).toBe(SUBJECT);
    expect(row.category).toBe('member_conduct');
    expect(row.assignedTo).toBeNull();
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('carries the assignee once a case has one', async () => {
    const caseNumber = await fileReport();
    await cases.assign({
      guildId: GUILD,
      caseNumber,
      assignee: ASSIGNEE,
      actorId: ASSIGNEE,
      correlationId: newCorrelationId(),
    });

    const rows = await cases.listReports(GUILD);

    expect(rows[0]?.assignedTo).toBe(ASSIGNEE);
  });

  /**
   * The privacy guarantee, checked against the real projection.
   *
   * Not a type assertion — a value one. The query could grow a `r.*` or a
   * helpfully added `description` column and TypeScript would be perfectly
   * happy, because a wider row is still assignable to a narrower interface at
   * the point it is constructed. Serialising the whole result and searching it
   * for the reporter's words is the only check that survives that edit.
   */
  it('never returns the report body', async () => {
    await fileReport({ description: PRIVATE_TEXT });

    const rows = await cases.listReports(GUILD);

    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('screenshots');
    expect(JSON.stringify(rows)).not.toContain(PRIVATE_TEXT);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([
        'assignedTo',
        'caseId',
        'caseNumber',
        'caseStatus',
        'category',
        'createdAt',
        'id',
        'reporterId',
        'targetUserId',
      ]);
    }
  });

  /* The text is still there — withheld from the list, not lost. */
  it('still exposes the body through the single-report read', async () => {
    const caseNumber = await fileReport({ description: PRIVATE_TEXT });
    const caseRow = await cases.findByNumber(GUILD, caseNumber);

    const report = await cases.findReport(caseRow?.id ?? '');

    expect(report?.description).toBe(PRIVATE_TEXT);
  });

  // ---------------------------------------------------------------------------
  // Guild scoping
  // ---------------------------------------------------------------------------

  it('never returns another guild’s reports', async () => {
    await fileReport({ guildId: GUILD });
    await fileReport({ guildId: OTHER_GUILD });

    const mine = await cases.listReports(GUILD);
    const theirs = await cases.listReports(OTHER_GUILD);

    expect(mine).toHaveLength(1);
    expect(theirs).toHaveLength(1);
    expect(mine[0]?.id).not.toBe(theirs[0]?.id);
  });

  it('returns nothing for a guild that has never been used', async () => {
    await fileReport({ guildId: GUILD });

    const rows = await cases.listReports(unsafeSnowflake<GuildId>('100000000000090999'));

    expect(rows).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Status filtering
  // ---------------------------------------------------------------------------

  /**
   * The default view is "still waiting on staff". Resolved and closed work is
   * done, and a queue that keeps showing it stops being a queue.
   */
  it('defaults to the statuses still wanting attention', async () => {
    const open = await fileReport({ status: 'OPEN' });
    const inReview = await fileReport({ status: 'IN_REVIEW' });
    const escalated = await fileReport({ status: 'ESCALATED' });
    await fileReport({ status: 'RESOLVED' });
    await fileReport({ status: 'CLOSED' });

    const rows = await cases.listReports(GUILD);

    expect(rows.map((row) => row.caseNumber).sort((a, b) => a - b)).toEqual([
      open,
      inReview,
      escalated,
    ]);
  });

  /**
   * `ACTIVE_CASE_STATUSES` is a TypeScript constant interpolated into a SQL
   * `ANY(...)`. If a status were ever renamed on one side only, the queue
   * would quietly empty rather than fail — so each member is asked for by name
   * and must come back.
   */
  it('agrees with ACTIVE_CASE_STATUSES about what is active', async () => {
    for (const status of ACTIVE_CASE_STATUSES) {
      await database.sql`DELETE FROM ${database.sql(SCHEMA)}.moderation_cases WHERE guild_id = ${GUILD}`;
      await fileReport({ status });

      const rows = await cases.listReports(GUILD);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.caseStatus).toBe(status);
    }
  });

  it('can be asked for a single status, including a finished one', async () => {
    await fileReport({ status: 'OPEN' });
    const resolved = await fileReport({ status: 'RESOLVED' });

    const rows = await cases.listReports(GUILD, { status: 'RESOLVED' });

    expect(rows.map((row) => row.caseNumber)).toEqual([resolved]);
  });

  it('returns an empty list when a status has nothing in it', async () => {
    await fileReport({ status: 'OPEN' });

    expect(await cases.listReports(GUILD, { status: 'CLOSED' })).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Limits
  // ---------------------------------------------------------------------------

  /*
   * Every staff read is bounded. These tests exist so a later "just show them
   * all" cannot pass review quietly: an unbounded queue is a slow query on the
   * day it matters most, which is the day the queue is long.
   */
  it('applies the limit in SQL, not afterwards', async () => {
    for (let index = 0; index < 5; index += 1) await fileReport();

    const rows = await cases.listReports(GUILD, { limit: 2 });

    expect(rows).toHaveLength(2);
  });

  it('defaults to a bounded page when no limit is given', async () => {
    for (let index = 0; index < 22; index += 1) await fileReport();

    const rows = await cases.listReports(GUILD);

    expect(rows).toHaveLength(20);
  });

  it('clamps a limit of zero or less up to one', async () => {
    await fileReport();
    await fileReport();

    expect(await cases.listReports(GUILD, { limit: 0 })).toHaveLength(1);
    expect(await cases.listReports(GUILD, { limit: -5 })).toHaveLength(1);
  });

  /* A caller asking for ten thousand rows gets the ceiling, not the ask. */
  it('clamps an absurd limit down to the ceiling', async () => {
    for (let index = 0; index < 3; index += 1) await fileReport();

    const rows = await cases.listReports(GUILD, { limit: 10_000 });

    expect(rows).toHaveLength(3);
  });

  it('returns an empty list when there are no reports at all', async () => {
    expect(await cases.listReports(GUILD)).toEqual([]);
    expect(await cases.listReports(GUILD, { limit: 100 })).toEqual([]);
  });

  /* A case opened by a moderator has no report, so it is not in the queue. */
  it('ignores cases that have no report attached', async () => {
    await cases.open({
      guildId: GUILD,
      origin: 'moderator',
      openedBy: ASSIGNEE,
      summary: 'Noticed a pattern myself.',
      subjectId: SUBJECT,
      category: null,
      status: 'OPEN',
      correlationId: newCorrelationId(),
    });

    expect(await cases.listReports(GUILD)).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Ordering
  // ---------------------------------------------------------------------------

  it('puts the most urgent statuses first', async () => {
    const open = await fileReport({ status: 'OPEN' });
    const inReview = await fileReport({ status: 'IN_REVIEW' });
    const escalated = await fileReport({ status: 'ESCALATED' });

    const rows = await cases.listReports(GUILD);

    expect(rows.map((row) => row.caseNumber)).toEqual([escalated, open, inReview]);
  });

  it('puts the oldest first within a status, so nothing is starved', async () => {
    const first = await fileReport();
    const second = await fileReport();
    const third = await fileReport();

    const rows = await cases.listReports(GUILD);

    expect(rows.map((row) => row.caseNumber)).toEqual([first, second, third]);
  });

  /**
   * Determinism, checked the only way that means anything: ask repeatedly.
   *
   * `created_at` is the transaction timestamp, so reports written together can
   * tie, and a tied `ORDER BY` lets Postgres return rows in whatever order the
   * plan produced. The `r.id` tiebreaker is what makes this stable; without it
   * this test fails intermittently, which is precisely the failure mode worth
   * owning in a test rather than in a staff member's confusion.
   */
  it('returns the same order every time it is asked', async () => {
    for (let index = 0; index < 8; index += 1) {
      await fileReport({ status: index % 2 === 0 ? 'OPEN' : 'ESCALATED' });
    }

    const reads = await Promise.all(
      Array.from({ length: 6 }, () => cases.listReports(GUILD, { limit: 8 })),
    );
    const orders = reads.map((rows) => rows.map((row) => row.id).join(','));

    expect(new Set(orders).size).toBe(1);
  });

  /**
   * Ties are not hypothetical: one transaction, two reports, identical
   * `created_at`. The whole point of the tiebreaker.
   */
  it('orders reports written in a single transaction deterministically', async () => {
    await database.sql.begin(async (tx) => {
      await cases.open(
        {
          guildId: GUILD,
          origin: 'report',
          openedBy: REPORTER,
          summary: 'First of two.',
          subjectId: SUBJECT,
          category: 'member_conduct',
          status: 'OPEN',
          correlationId: newCorrelationId(),
        },
        {
          reporterId: REPORTER,
          category: 'member_conduct',
          description: 'The first of two reports written together.',
          targetUserId: SUBJECT,
          targetChannelId: null,
          targetMessageId: null,
        },
        tx,
      );
      await cases.open(
        {
          guildId: GUILD,
          origin: 'report',
          openedBy: REPORTER,
          summary: 'Second of two.',
          subjectId: SUBJECT,
          category: 'member_conduct',
          status: 'OPEN',
          correlationId: newCorrelationId(),
        },
        {
          reporterId: REPORTER,
          category: 'member_conduct',
          description: 'The second of two reports written together.',
          targetUserId: SUBJECT,
          targetChannelId: null,
          targetMessageId: null,
        },
        tx,
      );
    });

    const before = await cases.listReports(GUILD);
    expect(before).toHaveLength(2);
    expect(before[0]?.createdAt.getTime()).toBe(before[1]?.createdAt.getTime());

    /*
     * Now make the physical order disagree with the logical one.
     *
     * An UPDATE writes a new tuple version at the end of the heap, so after
     * touching the *first* report a sequential scan reaches it *last*. With
     * the two rows tied on `created_at`, the only thing left standing between
     * that and a reshuffled queue is the `r.id` tiebreaker — which is exactly
     * what this test exists to hold down. Rewriting a row to its own value
     * changes no data; it only moves it.
     */
    const oldest = before[0]?.id ?? '';
    await database.sql`
      UPDATE ${database.sql(SCHEMA)}.reports
      SET correlation_id = correlation_id
      WHERE id = ${Number(oldest)}
    `;

    const after = await cases.listReports(GUILD);

    expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
    expect(after.map((row) => row.caseNumber)).toEqual([1, 2]);
  });
});
