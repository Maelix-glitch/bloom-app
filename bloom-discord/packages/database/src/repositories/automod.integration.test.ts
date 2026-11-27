import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AUTOMOD_REVIEW_STATUSES,
  AUTOMOD_TRIGGER_TYPES,
  unsafeSnowflake,
  type GuildId,
  type MessageId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresAutomodRepository } from './automod.js';

/**
 * Auto-moderation persistence, against a real PostgreSQL.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`. Everything here is behaviour
 * a fake cannot prove because it lives in the database — the partial unique
 * index that makes a redelivered execution a no-op, the expression unique
 * index that keeps one policy per scope, the threshold-completeness CHECK,
 * and the review-completeness CHECK from migration 0013.
 *
 * Requires the schema to be migrated first (`pnpm db:migrate`).
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000090001');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

function userId(suffix: string): UserId {
  return unsafeSnowflake<UserId>(`10000000000009${suffix.padStart(4, '0')}`);
}

const MEMBER = userId('2');
const STAFF = userId('3');

describe('automod persistence (integration)', () => {
  let database: Database;
  let automod: PostgresAutomodRepository;

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
    automod = new PostgresAutomodRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await identity.upsertGuild({ guildId: GUILD, name: 'Bloom Labs (integration)' });
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.automod_events WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.automod_policies WHERE guild_id = ${GUILD}`;
  });

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

    expect(await enumValues('automod_trigger_type')).toEqual([...AUTOMOD_TRIGGER_TYPES]);
    expect(await enumValues('automod_review_status')).toEqual([
      ...AUTOMOD_REVIEW_STATUSES,
    ]);
  });

  it('has no column that could hold message content', async () => {
    const rows = await database.sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ${SCHEMA} AND table_name = 'automod_events'
    `;
    const names = rows.map((row) => row.column_name);
    expect(names).not.toContain('content');
    expect(names).not.toContain('matched_content');
    expect(names.some((name) => name.includes('content'))).toBe(false);
  });

  it('records an execution and reports a redelivery as a duplicate', async () => {
    const input = {
      guildId: GUILD,
      userId: MEMBER,
      messageId: unsafeSnowflake<MessageId>('100000000000095001'),
      ruleId: '100000000000096001',
      triggerType: 'keyword' as const,
      matchedKeyword: 'badword',
      discordAction: 'BLOCK_MESSAGE',
    };

    const first = await automod.recordEvent(input);
    expect(first.duplicate).toBe(false);

    const second = await automod.recordEvent(input);
    expect(second.duplicate).toBe(true);
    expect(second.event.id).toBe(first.event.id);

    const count = await automod.countEventsInWindow(
      GUILD,
      MEMBER,
      'keyword',
      new Date(Date.now() - 60_000),
    );
    expect(count).toBe(1);
  });

  it('resolves thresholds most-specific-first and never invents one', async () => {
    expect(await automod.resolveThresholds(GUILD, null, 'keyword')).toBeNull();

    await automod.upsertPolicy({
      guildId: GUILD,
      thresholdCount: 5,
      windowSeconds: 3600,
      timeoutSeconds: 600,
      updatedBy: STAFF,
    });
    await automod.upsertPolicy({
      guildId: GUILD,
      triggerType: 'keyword',
      thresholdCount: 3,
      windowSeconds: 3600,
      timeoutSeconds: 600,
      updatedBy: STAFF,
    });

    const resolved = await automod.resolveThresholds(GUILD, null, 'keyword');
    expect(resolved?.thresholdCount).toBe(3);
    const fallback = await automod.resolveThresholds(GUILD, null, 'spam');
    expect(fallback?.thresholdCount).toBe(5);
  });

  it('unions exemptions across scopes', async () => {
    const roleA = unsafeSnowflake<RoleId>('100000000000097001');
    const roleB = unsafeSnowflake<RoleId>('100000000000097002');
    await automod.upsertPolicy({
      guildId: GUILD,
      exemptRoleIds: [roleA],
      updatedBy: STAFF,
    });
    await automod.upsertPolicy({
      guildId: GUILD,
      triggerType: 'spam',
      exemptRoleIds: [roleB],
      updatedBy: STAFF,
    });

    const forSpam = await automod.exemptRoleIds(GUILD, null, 'spam');
    expect(forSpam).toContain(roleA);
    expect(forSpam).toContain(roleB);
    const forKeyword = await automod.exemptRoleIds(GUILD, null, 'keyword');
    expect(forKeyword).toContain(roleA);
    expect(forKeyword).not.toContain(roleB);
  });

  it('reviews an event exactly once', async () => {
    const { event } = await automod.recordEvent({
      guildId: GUILD,
      userId: MEMBER,
      ruleId: '100000000000096002',
      triggerType: 'spam',
      discordAction: 'BLOCK_MESSAGE',
    });

    const reviewed = await automod.setReview(event.id, 'confirmed', STAFF, new Date());
    expect(reviewed?.reviewStatus).toBe('confirmed');

    const again = await automod.setReview(event.id, 'reversed', STAFF, new Date());
    expect(again).toBeNull();
  });
});
