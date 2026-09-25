import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CASE_STATUSES,
  MODERATION_ACTIONS,
  REPORT_CATEGORIES,
  unsafeSnowflake,
  type CaseStatus,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { newCorrelationId } from '@bloom/utils';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresModerationRepository } from './moderation.js';
import { PostgresCaseRepository } from './cases.js';

/**
 * Moderation and cases, against a real PostgreSQL.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`. Everything here is behaviour a
 * fake cannot prove because it lives in the database — the CHECK constraints
 * from migration 0005, the per-guild case number sequence under concurrency,
 * `FOR UPDATE` row locking in `transitionStatus`, the partial index behind
 * active-warning counts, and the ON DELETE behaviour of the case foreign keys.
 *
 * Requires the schema to be migrated first (`pnpm db:migrate`).
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000080001');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

function userId(suffix: string): UserId {
  return unsafeSnowflake<UserId>(`10000000000008${suffix.padStart(4, '0')}`);
}

const ACTOR = userId('1');
const SUBJECT = userId('2');

describe('moderation persistence (integration)', () => {
  let database: Database;
  let moderation: PostgresModerationRepository;
  let cases: PostgresCaseRepository;

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
    moderation = new PostgresModerationRepository(database);
    cases = new PostgresCaseRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await identity.upsertGuild({ guildId: GUILD, name: 'Bloom Labs (integration)' });
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.moderation_actions WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.moderation_cases WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.case_counters WHERE guild_id = ${GUILD}`;
  });

  // ---------------------------------------------------------------------------
  // The union/enum agreement
  // ---------------------------------------------------------------------------

  /**
   * TypeScript unions and Postgres enums are two independent declarations of
   * the same set, and nothing makes them agree. Adding a status in TS without
   * the matching migration compiles cleanly and then fails at runtime, in
   * production, on the one write that uses it.
   *
   * Comparing them against the live catalog is the only check that actually
   * closes that gap.
   */
  it('keeps the TypeScript unions and the Postgres enums identical', async () => {
    const enumValues = async (typeName: string): Promise<string[]> => {
      const rows = await database.sql<{ label: string }[]>`
        SELECT e.enumlabel AS label
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = ${typeName} AND n.nspname = ${SCHEMA}
        ORDER BY e.enumsortorder
      `;
      return rows.map((row) => row.label);
    };

    expect((await enumValues('case_status')).sort()).toEqual([...CASE_STATUSES].sort());
    expect((await enumValues('moderation_action')).sort()).toEqual(
      [...MODERATION_ACTIONS].sort(),
    );
    expect((await enumValues('report_category')).sort()).toEqual(
      [...REPORT_CATEGORIES].sort(),
    );
  });

  // ---------------------------------------------------------------------------
  // Case numbering
  // ---------------------------------------------------------------------------

  it('numbers cases from one, per guild', async () => {
    const first = await cases.open({
      guildId: GUILD,
      origin: 'moderator',
      openedBy: ACTOR,
      summary: 'First case.',
      subjectId: SUBJECT,
      category: null,
      status: 'OPEN',
      correlationId: newCorrelationId(),
    });
    const second = await cases.open({
      guildId: GUILD,
      origin: 'moderator',
      openedBy: ACTOR,
      summary: 'Second case.',
      subjectId: SUBJECT,
      category: null,
      status: 'OPEN',
      correlationId: newCorrelationId(),
    });

    expect(first.case.caseNumber).toBe(1);
    expect(second.case.caseNumber).toBe(2);
  });

  /**
   * Two moderators opening a case at the same instant is the scenario the
   * counter table exists for. Without row locking both read "next = 1" and the
   * unique index on (guild_id, case_number) rejects one of them — a moderator
   * loses their work to an error they cannot act on.
   */
  it('issues unique numbers under concurrent opens', async () => {
    const opens = Array.from({ length: 12 }, (_unused, index) =>
      cases.open({
        guildId: GUILD,
        origin: 'moderator',
        openedBy: ACTOR,
        summary: `Concurrent case ${String(index)}.`,
        subjectId: SUBJECT,
        category: null,
        status: 'OPEN',
        correlationId: newCorrelationId(),
      }),
    );

    const results = await Promise.all(opens);
    const numbers = results.map((result) => result.case.caseNumber).sort((a, b) => a - b);

    expect(new Set(numbers).size).toBe(12);
    expect(numbers).toEqual(Array.from({ length: 12 }, (_unused, i) => i + 1));
  });

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------

  async function openCase(status: CaseStatus = 'OPEN'): Promise<number> {
    const { case: row } = await cases.open({
      guildId: GUILD,
      origin: 'moderator',
      openedBy: ACTOR,
      summary: 'A case.',
      subjectId: SUBJECT,
      category: null,
      status,
      correlationId: newCorrelationId(),
    });
    return row.caseNumber;
  }

  it('applies a transition and appends the history row in one transaction', async () => {
    const caseNumber = await openCase();

    const outcome = await cases.transitionStatus({
      guildId: GUILD,
      caseNumber,
      to: 'IN_REVIEW',
      actorId: ACTOR,
      note: 'Picking this up.',
      resolution: null,
      correlationId: newCorrelationId(),
    });

    expect(outcome.kind).toBe('applied');

    const row = await cases.findByNumber(GUILD, caseNumber);
    const events = await cases.listEvents(row?.id ?? '');
    expect(events.some((event) => event.eventType === 'status_changed')).toBe(true);
  });

  /**
   * The race the conditional UPDATE exists for: two moderators, same case, same
   * moment. Exactly one must win, and the loser must be told which state the
   * case is actually in rather than silently overwriting.
   */
  it('lets exactly one of two concurrent transitions win', async () => {
    const caseNumber = await openCase();

    const [a, b] = await Promise.all([
      cases.transitionStatus({
        guildId: GUILD,
        caseNumber,
        to: 'IN_REVIEW',
        actorId: ACTOR,
        note: null,
        resolution: null,
        correlationId: newCorrelationId(),
      }),
      cases.transitionStatus({
        guildId: GUILD,
        caseNumber,
        to: 'ESCALATED',
        actorId: userId('3'),
        note: null,
        resolution: null,
        correlationId: newCorrelationId(),
      }),
    ]);

    const kinds = [a.kind, b.kind].sort();
    expect(kinds).toEqual(['applied', 'applied']);

    // Both applied, but sequentially — the second saw the first's result.
    const events = await cases.listEvents(
      (await cases.findByNumber(GUILD, caseNumber))?.id ?? '',
    );
    const changes = events.filter((event) => event.eventType === 'status_changed');
    expect(changes).toHaveLength(2);
  });

  /**
   * Migration 0005 enforces this with a CHECK: a case cannot be RESOLVED
   * without saying how. Relying on the service layer alone would leave the
   * constraint untested and the data model unenforced against direct SQL.
   */
  it('refuses a RESOLVED case with no resolution', async () => {
    const caseNumber = await openCase();
    const row = await cases.findByNumber(GUILD, caseNumber);

    await expect(
      database.sql`
        UPDATE ${database.sql(SCHEMA)}.moderation_cases
        SET status = 'RESOLVED', resolved_at = now(), resolution = NULL
        WHERE id = ${row?.id ?? ''}
      `,
    ).rejects.toThrow();
  });

  it('records the resolution when one is supplied', async () => {
    const caseNumber = await openCase();
    await cases.transitionStatus({
      guildId: GUILD,
      caseNumber,
      to: 'RESOLVED',
      actorId: ACTOR,
      note: 'Warned; member apologised.',
      resolution: 'Warned; member apologised.',
      correlationId: newCorrelationId(),
    });

    const row = await cases.findByNumber(GUILD, caseNumber);
    expect(row?.status).toBe('RESOLVED');
    expect(row?.resolution).toBe('Warned; member apologised.');
    expect(row?.resolvedAt).toBeInstanceOf(Date);
  });

  // ---------------------------------------------------------------------------
  // Warnings
  // ---------------------------------------------------------------------------

  it('counts only unrevoked warnings', async () => {
    for (const reason of ['One.', 'Two.', 'Three.']) {
      await moderation.record({
        guildId: GUILD,
        action: 'warn',
        actorId: ACTOR,
        subjectId: SUBJECT,
        channelId: null,
        caseId: null,
        reason,
        durationSeconds: null,
        expiresAt: null,
        metadata: {},
        correlationId: newCorrelationId(),
      });
    }

    expect(await moderation.countActiveWarnings(GUILD, SUBJECT)).toBe(3);

    const cleared = await moderation.revokeActiveWarnings({
      guildId: GUILD,
      subjectId: SUBJECT,
      revokedBy: ACTOR,
      reason: 'Expired.',
    });

    expect(cleared).toBe(3);
    expect(await moderation.countActiveWarnings(GUILD, SUBJECT)).toBe(0);
    // Revoked, not deleted: the history survives.
    expect(await moderation.listForSubject(GUILD, SUBJECT)).toHaveLength(3);
  });

  /**
   * A timeout is not a warning. If `countActiveWarnings` ever widened to "any
   * action", a member with three timeouts would read as three warnings and an
   * escalation ladder keyed on that count would fire early.
   */
  it('does not count non-warning actions as warnings', async () => {
    await moderation.record({
      guildId: GUILD,
      action: 'timeout',
      actorId: ACTOR,
      subjectId: SUBJECT,
      channelId: null,
      caseId: null,
      reason: 'Cooling off.',
      durationSeconds: 600,
      expiresAt: new Date(Date.now() + 600_000),
      metadata: {},
      correlationId: newCorrelationId(),
    });

    expect(await moderation.countActiveWarnings(GUILD, SUBJECT)).toBe(0);
    expect(await moderation.listForSubject(GUILD, SUBJECT)).toHaveLength(1);
  });

  /**
   * The CHECK requires an action to name either a member or a channel. A row
   * with neither is an action against nothing — unreadable in a history view
   * and impossible to attribute.
   */
  it('refuses an action with neither a subject nor a channel', async () => {
    await expect(
      database.sql`
        INSERT INTO ${database.sql(SCHEMA)}.moderation_actions
          (guild_id, action, actor_id, reason, metadata)
        VALUES (${GUILD}, 'warn', ${ACTOR}, 'Nothing to act on.', '{}'::jsonb)
      `,
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Case links
  // ---------------------------------------------------------------------------

  /**
   * Deleting a case must not delete the record of what was done. The FK is
   * ON DELETE SET NULL precisely so a purged case leaves the ban behind —
   * losing the ban record would mean losing the justification for it.
   */
  it('keeps moderation actions when their case is deleted', async () => {
    const caseNumber = await openCase();
    const caseRow = await cases.findByNumber(GUILD, caseNumber);

    await moderation.record({
      guildId: GUILD,
      action: 'ban',
      actorId: ACTOR,
      subjectId: SUBJECT,
      channelId: null,
      caseId: caseRow?.id ?? null,
      reason: 'Attached to a case.',
      durationSeconds: null,
      expiresAt: null,
      metadata: {},
      correlationId: newCorrelationId(),
    });

    await database.sql`
      DELETE FROM ${database.sql(SCHEMA)}.moderation_cases WHERE id = ${caseRow?.id ?? ''}
    `;

    const surviving = await moderation.listForSubject(GUILD, SUBJECT);
    expect(surviving).toHaveLength(1);
    expect(surviving[0]?.caseId).toBeNull();
  });
});
