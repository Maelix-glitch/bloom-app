import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  BloomError,
  unsafeSnowflake,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import { createLogger, JsonLogSink } from '@bloom/logging';
import { createDatabase, type Database } from '../client.js';
import { PostgresIdentityRepository } from './identity.js';
import { PostgresOnboardingRepository } from './onboarding.js';

/**
 * Onboarding transitions, against a real PostgreSQL.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1 pnpm test`. Everything here is behaviour
 * that unit tests with fakes cannot prove, because it lives in the database —
 * the CHECK constraints from migration 0002, `FOR UPDATE` row locking, the
 * conditional UPDATE, and the foreign key from the history table.
 *
 * Requires the schema to be migrated first (`pnpm db:migrate`).
 */

const GUILD = unsafeSnowflake<GuildId>('100000000000070001');

function userId(suffix: string): UserId {
  return unsafeSnowflake<UserId>(`10000000000007${suffix.padStart(4, '0')}`);
}

describe('PostgresOnboardingRepository (integration)', () => {
  let database: Database;
  let identity: PostgresIdentityRepository;
  let onboarding: PostgresOnboardingRepository;

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL must be set for integration tests.');

    database = createDatabase({
      url,
      schema: process.env['DATABASE_SCHEMA'] ?? 'bloom_discord',
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

    identity = new PostgresIdentityRepository(database);
    onboarding = new PostgresOnboardingRepository(database);

    const ping = await database.ping();
    if (!ping.ok) throw ping.error ?? new Error('Database unreachable.');

    await identity.upsertGuild({ guildId: GUILD, name: 'Bloom Labs (integration)' });
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    // Cascades to onboarding_transitions via the foreign key.
    await database.sql`DELETE FROM bloom_discord.guild_members WHERE guild_id = ${GUILD}`;
    await database.sql`DELETE FROM bloom_discord.verification_attempts WHERE guild_id = ${GUILD}`;
  });

  async function seedMember(id: UserId): Promise<void> {
    await identity.ensureMember({
      guildId: GUILD,
      userId: id,
      username: `integration-${id.slice(-4)}`,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  it('applies unverified -> early_bloom and sets verified_at', async () => {
    const user = userId('1');
    await seedMember(user);

    const outcome = await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
      actorId: user,
      reason: 'Verified via /verify',
      source: 'command:/verify',
    });

    expect(outcome).toEqual({ kind: 'applied', from: 'unverified', to: 'early_bloom' });

    const member = await identity.findMember(GUILD, user);
    expect(member?.onboardingState).toBe('early_bloom');
    // The CHECK constraint in 0002 requires this; proving it is set here is
    // what stops a future edit from tripping the constraint in production.
    expect(member?.verifiedAt).toBeInstanceOf(Date);
    expect(member?.onboardingCompletedAt).toBeNull();
  });

  it('preserves the original verified_at across re-verification', async () => {
    const user = userId('2');
    await seedMember(user);

    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
    });
    const first = await identity.findMember(GUILD, user);

    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'early_bloom',
      to: 'bloom_member',
      trigger: 'staff_action',
    });
    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'bloom_member',
      to: 'early_bloom',
      trigger: 'staff_action',
      reason: 'Re-verification requested',
    });

    const after = await identity.findMember(GUILD, user);
    expect(after?.verifiedAt?.getTime()).toBe(first?.verifiedAt?.getTime());
  });

  it('sets onboarding_completed_at when reaching bloom_member', async () => {
    const user = userId('3');
    await seedMember(user);

    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
    });
    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'early_bloom',
      to: 'bloom_member',
      trigger: 'staff_action',
    });

    const member = await identity.findMember(GUILD, user);
    expect(member?.onboardingState).toBe('bloom_member');
    expect(member?.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it('reports already_in_state for a replayed transition, writing no history', async () => {
    const user = userId('4');
    await seedMember(user);

    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
    });

    const replay = await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
    });

    expect(replay).toEqual({ kind: 'already_in_state', state: 'early_bloom' });
    expect(await onboarding.listTransitions(GUILD, user)).toHaveLength(1);
  });

  it('reports a conflict when the caller view is stale', async () => {
    const user = userId('5');
    await seedMember(user);

    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
    });

    const stale = await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'revoked',
      trigger: 'staff_action',
    });

    expect(stale).toEqual({
      kind: 'conflict',
      actual: 'early_bloom',
      expected: 'unverified',
    });
  });

  it('refuses an illegal transition before touching the database', async () => {
    const user = userId('6');
    await seedMember(user);

    await expect(
      onboarding.transition({
        guildId: GUILD,
        userId: user,
        // early_bloom -> unverified is not in the transition table.
        expectedFrom: 'early_bloom',
        to: 'unverified',
        trigger: 'staff_action',
      }),
    ).rejects.toSatisfy(
      (error: unknown) => BloomError.isCode(error, 'INVALID_INPUT'),
      'expected INVALID_INPUT',
    );

    const member = await identity.findMember(GUILD, user);
    expect(member?.onboardingState).toBe('unverified');
  });

  it('reports member_missing rather than creating a row', async () => {
    const outcome = await onboarding.transition({
      guildId: GUILD,
      userId: userId('7'),
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'join',
    });

    expect(outcome).toEqual({ kind: 'member_missing' });
  });

  it('serialises concurrent transitions so exactly one wins', async () => {
    const user = userId('8');
    await seedMember(user);

    /*
     * The real double-click. Both callers read `unverified` and both believe
     * the transition is legal; `FOR UPDATE` is what makes the loser observe
     * the winner's committed state instead of overwriting it.
     */
    const [a, b] = await Promise.all([
      onboarding.transition({
        guildId: GUILD,
        userId: user,
        expectedFrom: 'unverified',
        to: 'early_bloom',
        trigger: 'self_verify',
      }),
      onboarding.transition({
        guildId: GUILD,
        userId: user,
        expectedFrom: 'unverified',
        to: 'early_bloom',
        trigger: 'self_verify',
      }),
    ]);

    const kinds = [a.kind, b.kind].sort();
    expect(kinds).toEqual(['already_in_state', 'applied']);

    // Exactly one history row, so the audit trail does not double-count.
    expect(await onboarding.listTransitions(GUILD, user)).toHaveLength(1);
  });

  it('records history newest-first with actor and trigger', async () => {
    const user = userId('9');
    const staff = userId('99');
    await seedMember(user);

    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
      actorId: user,
      source: 'command:/verify',
    });
    await onboarding.transition({
      guildId: GUILD,
      userId: user,
      expectedFrom: 'early_bloom',
      to: 'bloom_member',
      trigger: 'staff_action',
      actorId: staff,
      reason: 'Onboarding complete',
      source: 'command:/guardian onboarding complete',
    });

    const history = await onboarding.listTransitions(GUILD, user);
    expect(history).toHaveLength(2);
    expect(history[0]?.toState).toBe('bloom_member');
    expect(history[0]?.trigger).toBe('staff_action');
    expect(history[0]?.actorId).toBe(staff);
    expect(history[0]?.reason).toBe('Onboarding complete');
    expect(history[1]?.toState).toBe('early_bloom');
  });

  it('counts members by state, including the zeroes', async () => {
    await seedMember(userId('10'));
    await seedMember(userId('11'));
    await onboarding.transition({
      guildId: GUILD,
      userId: userId('11'),
      expectedFrom: 'unverified',
      to: 'early_bloom',
      trigger: 'self_verify',
    });

    expect(await onboarding.countByState(GUILD)).toEqual({
      unverified: 1,
      early_bloom: 1,
      bloom_member: 0,
      revoked: 0,
    });
  });

  it('records verification attempts including refusals', async () => {
    const user = userId('12');
    await seedMember(user);

    await onboarding.recordVerificationAttempt({
      guildId: GUILD,
      userId: user,
      outcome: 'granted',
    });
    await onboarding.recordVerificationAttempt({
      guildId: GUILD,
      userId: user,
      outcome: 'RATE_LIMITED',
    });

    expect(await onboarding.countRecentAttempts(GUILD, user, 60)).toBe(2);
    // A window that excludes them proves the interval arithmetic is real.
    expect(await onboarding.countRecentAttempts(GUILD, user, 0)).toBe(0);
  });
});
