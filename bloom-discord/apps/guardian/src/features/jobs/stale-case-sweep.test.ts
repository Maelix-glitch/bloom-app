import { describe, expect, it } from 'vitest';
import { TEST_CHANNEL_IDS, TEST_GUILD_ID } from '@bloom/testing';
import type { UserId } from '@bloom/shared-types';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

const STAFF = '900000000000000001' as UserId;
const SUBJECT = '900000000000000002' as UserId;

const DAY = 86_400_000;

/**
 * Seed a case and backdate its last activity.
 *
 * The fake repository stamps `updatedAt` from its clock, so a test that wants a
 * stale case has to reach in and age it. Done through the stored row rather
 * than by moving the clock, because these tests also assert on *how* stale, and
 * a single shared clock would couple unrelated expectations together.
 */
async function seedCase(
  harness: GuardianHarness,
  options: {
    readonly idleDays: number;
    readonly status?: 'OPEN' | 'IN_REVIEW' | 'ESCALATED';
  },
): Promise<number> {
  const { case: row } = await harness.repositories.cases.open({
    guildId: TEST_GUILD_ID,
    origin: 'moderator',
    subjectId: SUBJECT,
    openedBy: STAFF,
    summary: 'Repeated off-topic posting in the garden channels.',
    ...(options.status ? { status: options.status } : {}),
  });

  const index = harness.repositories.cases.cases.findIndex(
    (entry) => entry.id === row.id,
  );
  const stored = harness.repositories.cases.cases[index];
  if (!stored) throw new Error('seed failed');
  harness.repositories.cases.cases[index] = {
    ...stored,
    updatedAt: new Date(Date.now() - options.idleDays * DAY),
  };

  return row.caseNumber;
}

function runJob(harness: GuardianHarness): Promise<void> {
  return harness.scheduler.runNow('guardian.cases.stale_sweep');
}

describe('guardian.cases.stale_sweep', () => {
  it('is registered with a schedule, a lease and an off switch', () => {
    const harness = guardianHarness();
    const job = harness.scheduler
      .status()
      .find((entry) => entry.key === 'guardian.cases.stale_sweep');

    expect(job).toBeDefined();
    expect(job?.enabled).toBe(true);
    expect(job?.schedule).toBe('0 9 * * *');
    expect(job?.nextRunAt).toBeInstanceOf(Date);
  });

  it('posts nothing when no case is stale', async () => {
    const harness = guardianHarness();
    await seedCase(harness, { idleDays: 0 });

    await runJob(harness);

    // Silence is the correct output. A daily "0 stale cases" post trains staff
    // to ignore the channel, which costs more than it gives.
    expect(harness.messaging.sent).toHaveLength(0);
    expect(harness.repositories.audit.events).toHaveLength(0);
  });

  it('posts nothing when there are no cases at all', async () => {
    const harness = guardianHarness();
    await runJob(harness);
    expect(harness.messaging.sent).toHaveLength(0);
  });

  it('reports a case idle past the threshold, to the moderation channel', async () => {
    const harness = guardianHarness();
    const number = await seedCase(harness, { idleDays: 5 });

    await runJob(harness);

    expect(harness.messaging.sent).toHaveLength(1);
    const sent = harness.messaging.sent[0];
    expect(sent?.channelId).toBe(TEST_CHANNEL_IDS.moderation);
    expect(JSON.stringify(sent?.message)).toContain(`Case #${String(number)}`);
  });

  it('ignores resolved and closed cases, which are not waiting on anyone', async () => {
    const harness = guardianHarness();
    const number = await seedCase(harness, { idleDays: 10 });
    await harness.repositories.cases.transitionStatus({
      guildId: TEST_GUILD_ID,
      caseNumber: number,
      to: 'RESOLVED',
      actorId: STAFF,
      resolution: 'Spoke with the member; no further action needed.',
    });

    await runJob(harness);

    expect(harness.messaging.sent).toHaveLength(0);
  });

  it('includes escalated cases, which are the most urgent thing to be idle', async () => {
    const harness = guardianHarness();
    await seedCase(harness, { idleDays: 4, status: 'ESCALATED' });

    await runJob(harness);

    expect(harness.messaging.sent).toHaveLength(1);
  });

  /*
   * Duplicate prevention. The schedule is not a guarantee: a redeploy, a
   * reclaimed lease or a manual trigger can all produce a second run on the
   * same day, and staff should not receive the same digest twice.
   */
  it('posts once per cooldown window, however many times it runs', async () => {
    const harness = guardianHarness();
    await seedCase(harness, { idleDays: 5 });

    await runJob(harness);
    await runJob(harness);
    await runJob(harness);

    expect(harness.messaging.sent).toHaveLength(1);
    expect(harness.logs.serialised()).toContain('jobs.stale_sweep.suppressed');
  });

  it('writes an audit row attributing the post to the job, not to a person', async () => {
    const harness = guardianHarness();
    await seedCase(harness, { idleDays: 5 });

    await runJob(harness);

    const event = harness.repositories.audit.events.find(
      (entry) => entry.event === 'jobs.stale_cases_reported',
    );
    expect(event).toBeDefined();
    expect(event?.actorId ?? null).toBeNull();
    expect(event?.source).toBe('guardian.cases.stale_sweep');
    expect(event?.details?.['stale_count']).toBe(1);
  });

  it('records a succeeded run against the lease', async () => {
    const harness = guardianHarness();
    await seedCase(harness, { idleDays: 5 });

    await runJob(harness);

    expect(harness.lock.runs.at(-1)?.status).toBe('succeeded');
  });

  it('is disabled, not broken, when the moderation channel is unconfigured', async () => {
    const harness = guardianHarness({ moderationChannel: null });
    const job = harness.scheduler
      .status()
      .find((entry) => entry.key === 'guardian.cases.stale_sweep');

    expect(job?.enabled).toBe(false);
    expect(job?.nextRunAt).toBeNull();

    // And if triggered manually anyway, it does nothing rather than failing
    // against a channel that does not exist.
    await seedCase(harness, { idleDays: 5 });
    await runJob(harness);
    expect(harness.messaging.sent).toHaveLength(0);
    expect(harness.lock.runs.at(-1)?.status).toBe('succeeded');
  });

  it('is registered but disabled when scheduled messages are globally off', () => {
    const harness = guardianHarness({ scheduledMessages: false });
    const job = harness.scheduler
      .status()
      .find((entry) => entry.key === 'guardian.cases.stale_sweep');

    // Registered, so an operator can see it exists and why it is not running.
    expect(job).toBeDefined();
    expect(job?.enabled).toBe(false);
  });

  it('caps the listing and says how many it left out', async () => {
    const harness = guardianHarness();
    for (let index = 0; index < 13; index += 1) {
      await seedCase(harness, { idleDays: 5 + index });
    }

    await runJob(harness);

    const payload = JSON.stringify(harness.messaging.sent[0]?.message);
    // Ten listed, three named only in the footer: an embed with 13 fields of
    // case detail is a wall of text nobody reads.
    expect(payload).toContain('3 more not shown');
  });

  it('orders the digest oldest first', async () => {
    const harness = guardianHarness();
    const recent = await seedCase(harness, { idleDays: 4 });
    const ancient = await seedCase(harness, { idleDays: 30 });

    await runJob(harness);

    const payload = JSON.stringify(harness.messaging.sent[0]?.message);
    expect(payload.indexOf(`Case #${String(ancient)}`)).toBeLessThan(
      payload.indexOf(`Case #${String(recent)}`),
    );
  });
});
