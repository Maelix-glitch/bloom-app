import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import {
  createDatabase,
  PostgresIdentityRepository,
  PostgresSettingsRepository,
  type Database,
} from '@bloom/database';
import { DatabaseJobGate, JobSettingsService, jobSettingKey } from './settings.js';

/**
 * The per-guild job switch, against a real PostgreSQL.
 *
 * Worth an integration test for one specific reason: `bot_settings.key` has a
 * CHECK constraint (`^[a-z][a-z0-9_.]{0,62}$`) that a fake does not enforce. A
 * job key that produces an invalid setting key would pass every unit test and
 * then fail the first time an administrator ran `jobs disable` in production —
 * on the command whose entire purpose is to stop something going wrong.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`, schema already migrated.
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000091001');
const ADMIN = unsafeSnowflake<UserId>('100000000000091002');
const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';

describe('per-guild job settings (integration)', () => {
  let database: Database;
  let settings: JobSettingsService;
  let gate: DatabaseJobGate;

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
      name: 'Bloom Labs (integration)',
    });

    settings = new JobSettingsService(
      new PostgresSettingsRepository(database),
      'companion',
    );
    gate = new DatabaseJobGate(settings);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.sql`DELETE FROM ${database.sql(SCHEMA)}.bot_settings WHERE guild_id = ${GUILD}`;
  });

  it('accepts the setting key a real job key produces', async () => {
    // The CHECK constraint is the thing under test. If `job.` + a job key is
    // ever rejected, this is where it must fail.
    await settings.write(GUILD, 'companion.checkin.daily_prompt', false, ADMIN);

    const [row] = await database.sql<{ key: string }[]>`
      SELECT key FROM ${database.sql(SCHEMA)}.bot_settings WHERE guild_id = ${GUILD}
    `;
    expect(row?.key).toBe('job.companion.checkin.daily_prompt');
  });

  it('round-trips a disable and an enable', async () => {
    const key = 'companion.checkin.daily_prompt';
    expect(await settings.read(GUILD, key)).toEqual({ enabled: null });

    await settings.write(GUILD, key, false, ADMIN);
    expect(await settings.read(GUILD, key)).toEqual({ enabled: false });

    await settings.write(GUILD, key, true, ADMIN);
    expect(await settings.read(GUILD, key)).toEqual({ enabled: true });
  });

  it('overwrites rather than accumulating rows', async () => {
    const key = 'companion.checkin.daily_prompt';
    await settings.write(GUILD, key, false, ADMIN);
    await settings.write(GUILD, key, true, ADMIN);

    const rows = await database.sql<{ key: string }[]>`
      SELECT key FROM ${database.sql(SCHEMA)}.bot_settings WHERE guild_id = ${GUILD}
    `;
    // The primary key is (guild_id, bot_name, key), so a second write must be
    // an update. Two rows would mean the read order decides the answer.
    expect(rows).toHaveLength(1);
  });

  it('records who made the change', async () => {
    await settings.write(GUILD, 'companion.checkin.daily_prompt', false, ADMIN);

    const [row] = await database.sql<{ updated_by: string }[]>`
      SELECT updated_by FROM ${database.sql(SCHEMA)}.bot_settings WHERE guild_id = ${GUILD}
    `;
    // "Who turned the check-in prompt off" is a question worth being able to
    // answer three weeks later.
    expect(row?.updated_by).toBe(ADMIN);
  });

  it('keeps one bot’s switch out of another’s', async () => {
    const guardianSettings = new JobSettingsService(
      new PostgresSettingsRepository(database),
      'guardian',
    );

    await settings.write(GUILD, 'shared.key.name', false, ADMIN);

    // Same guild, same job key, different bot: the primary key includes
    // bot_name, so Guardian must not see Companion's decision.
    expect(await guardianSettings.read(GUILD, 'shared.key.name')).toEqual({
      enabled: null,
    });
  });

  it('gate refuses a disabled job and allows everything else', async () => {
    const key = 'companion.checkin.daily_prompt';

    expect(await gate.isEnabled({ key, guildId: GUILD })).toEqual({ enabled: true });

    await settings.write(GUILD, key, false, ADMIN);
    const decision = await gate.isEnabled({ key, guildId: GUILD });
    expect(decision.enabled).toBe(false);
    expect(decision.reason).toContain('administrator');
  });

  it('gate allows a global job, which has no guild to be disabled in', async () => {
    expect(await gate.isEnabled({ key: 'platform.global.job', guildId: null })).toEqual({
      enabled: true,
    });
  });

  it('refuses a job key too long to store, rather than truncating it', () => {
    // A silently shortened key would collide with another job's setting, and
    // two jobs sharing one off switch is only discovered by disabling one and
    // watching the other stop.
    const tooLong = `companion.${'x'.repeat(60)}`;
    expect(() => jobSettingKey(tooLong)).toThrow(/too long/i);
  });
});
