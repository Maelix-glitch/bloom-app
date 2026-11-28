import { describe, expect, it } from 'vitest';
import { TEST_GUILD_ID, TEST_USER_IDS } from '@bloom/testing';
import { companionHarness } from '../../companion.harness.js';
import { createReferralPaymentJob } from './referral-job.js';

/**
 * The payment pass.
 *
 * The referral pipeline has no event-driven path: Guardian's job decides
 * qualification, this one pays. If it is misregistered — wrong cadence,
 * disabled, scoped to no guild — the feature silently never runs, which looks
 * exactly like "nobody has referred anyone yet".
 *
 * Guardian's half is asserted in Guardian's own suite. Reaching across the
 * app boundary to test it from here would be the very coupling the
 * architecture guards forbid.
 */

const NOW = new Date('2026-03-01T12:00:00.000Z');

const runContext = (jobKey: string, logger: unknown) => ({
  jobKey,
  guildId: TEST_GUILD_ID,
  runId: 'run-1',
  logger,
  scheduledFor: NOW,
});

describe('Companion’s payment job', () => {
  const job = () => createReferralPaymentJob(companionHarness({ now: () => NOW }).deps);

  it('uses a key namespaced to its own bot', () => {
    // The scheduler lease is taken on the key. A collision with Guardian's
    // pass would have one bot starving the other.
    expect(job().key.startsWith('companion.')).toBe(true);
  });

  it('carries a description a staff member could act on', () => {
    expect(job().description.length).toBeGreaterThan(20);
  });

  it('is registered enabled, every ten minutes, scoped to the guild', () => {
    const scheduled = job();

    expect(scheduled.key).toBe('companion.referrals.pay');
    expect(scheduled.enabled).toBe(true);
    expect(scheduled.guildId).toBe(TEST_GUILD_ID);
    expect(scheduled.schedule).toBe('*/10 * * * *');
  });

  it('leases long enough to finish a full batch', () => {
    const scheduled = job();

    expect(scheduled.leaseSeconds).toBe(120);
    // The lease must not outlive the interval, or a stalled worker blocks the
    // next pass instead of being reclaimed.
    expect(scheduled.leaseSeconds).toBeLessThanOrEqual(600);
  });

  it('pays a qualified referral when the pass runs', async () => {
    const h = companionHarness({ now: () => NOW });
    const outcome = await h.repositories.referrals.record({
      guildId: TEST_GUILD_ID,
      referredUserId: TEST_USER_IDS.betaTester,
      inviterUserId: TEST_USER_IDS.member,
      inviteCode: 'aaa',
      source: 'invite_diff',
      idempotencyKey: `referral:${TEST_GUILD_ID}:${TEST_USER_IDS.betaTester}`,
    });
    await h.repositories.referrals.markQualified(outcome.trigger.id, NOW);

    const scheduled = createReferralPaymentJob(h.deps);
    await scheduled.run(runContext(scheduled.key, h.deps.logger) as never);

    expect(
      await h.repositories.rewards.balance(TEST_GUILD_ID, TEST_USER_IDS.member),
    ).toBeGreaterThan(0);
  });

  it('does nothing, loudly or otherwise, when there is no work', async () => {
    const h = companionHarness({ now: () => NOW });
    const scheduled = createReferralPaymentJob(h.deps);

    await scheduled.run(runContext(scheduled.key, h.deps.logger) as never);

    expect(h.repositories.rewards.events).toHaveLength(0);
    expect(h.messaging.directMessages).toHaveLength(0);
  });
});
