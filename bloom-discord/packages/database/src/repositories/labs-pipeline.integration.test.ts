import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { LABS_FEATURE_STATUSES, PostgresLabsRepository } from './labs.js';

/**
 * The Labs pipeline, against a real PostgreSQL.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`. Everything here is behaviour
 * a fake cannot prove because it lives in the database — the case-insensitive
 * name uniqueness from migration 0014, the vote toggle's insert-or-delete
 * under the composite primary key, and the cohort join outcomes under the
 * row lock.
 *
 * Requires the schema to be migrated first (`pnpm db:migrate`).
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000110001');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

function userId(suffix: string): UserId {
  return unsafeSnowflake<UserId>(`10000000000011${suffix.padStart(4, '0')}`);
}

const STAFF = userId('1');
const MEMBER = userId('2');
const OTHER = userId('3');

describe('labs pipeline persistence (integration)', () => {
  let database: Database;
  let labs: PostgresLabsRepository;

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
    labs = new PostgresLabsRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await identity.upsertGuild({ guildId: GUILD, name: 'Bloom Labs (integration)' });
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.labs_features WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.labs_cohorts WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.labs_release_notes WHERE guild_id = ${GUILD}`;
  });

  it('keeps the TypeScript union and the Postgres enum identical', async () => {
    const rows = await database.sql<{ label: string }[]>`
      SELECT e.enumlabel AS label
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'labs_feature_status' AND n.nspname = ${SCHEMA}
      ORDER BY e.enumsortorder
    `;
    expect(rows.map((row) => row.label)).toEqual([...LABS_FEATURE_STATUSES]);
  });

  it('finds a feature by name regardless of case', async () => {
    await labs.createFeature({ guildId: GUILD, name: 'Dark Mode', createdBy: STAFF });
    const found = await labs.findFeatureByName(GUILD, 'dark mode');
    expect(found?.name).toBe('Dark Mode');
  });

  it('toggles a vote at the database level', async () => {
    const feature = await labs.createFeature({
      guildId: GUILD,
      name: 'Offline mode',
      createdBy: STAFF,
    });

    const added = await labs.toggleVote(feature.id, MEMBER);
    expect(added?.voted).toBe(true);
    expect(added?.feature.votes).toBe(1);

    await labs.toggleVote(feature.id, OTHER);
    const withdrawn = await labs.toggleVote(feature.id, MEMBER);
    expect(withdrawn?.voted).toBe(false);
    expect(withdrawn?.feature.votes).toBe(1);
    expect(await labs.hasVoted(feature.id, MEMBER)).toBe(false);
    expect(await labs.hasVoted(feature.id, OTHER)).toBe(true);
  });

  it('runs the cohort join outcomes in order', async () => {
    await labs.createCohort({ guildId: GUILD, name: 'Round 1', createdBy: STAFF });

    const joined = await labs.joinCohort(GUILD, 'round 1', MEMBER);
    expect(joined.kind).toBe('joined');
    const again = await labs.joinCohort(GUILD, 'Round 1', MEMBER);
    expect(again.kind).toBe('already_member');

    const left = await labs.leaveCohort(GUILD, 'Round 1', MEMBER);
    expect(left.kind).toBe('left');
    const notMember = await labs.leaveCohort(GUILD, 'Round 1', MEMBER);
    expect(notMember.kind).toBe('not_member');

    const missing = await labs.joinCohort(GUILD, 'Nope', MEMBER);
    expect(missing.kind).toBe('not_found');
  });

  it('refuses joins to a closed cohort', async () => {
    await labs.createCohort({
      guildId: GUILD,
      name: 'Full round',
      joinable: false,
      createdBy: STAFF,
    });
    const outcome = await labs.joinCohort(GUILD, 'Full round', MEMBER);
    expect(outcome.kind).toBe('closed');
  });

  it('reads back the latest release', async () => {
    expect(await labs.latestRelease(GUILD)).toBeNull();
    await labs.publishRelease({
      guildId: GUILD,
      version: '1.0.0',
      title: 'First',
      body: 'The first notes.',
      publishedBy: STAFF,
    });
    const latest = await labs.latestRelease(GUILD);
    expect(latest?.version).toBe('1.0.0');
  });
});
