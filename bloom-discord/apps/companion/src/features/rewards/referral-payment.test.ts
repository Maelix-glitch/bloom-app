import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { REFERRAL_POINTS, unsafeSnowflake, type UserId } from '@bloom/shared-types';
import type { RecordReferralInput } from '@bloom/database';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import { ReferralConsumer } from './referral-consumer.js';

/**
 * Paying a qualified referral, exactly once.
 *
 * The property under test is not "a referral pays" — that is one test. It is
 * that no sequence of crashes, retries or racing workers can make it pay
 * twice, and that no failure can make it silently pay zero times.
 */

const INVITER = TEST_USER_IDS.member;
const REFERRED = TEST_USER_IDS.betaTester;

let h: CompanionHarness;
const NOW = new Date('2026-03-01T12:00:00.000Z');

beforeEach(() => {
  h = companionHarness({ now: () => NOW });
});

/** Put a qualified referral on the table, the way Guardian would have. */
async function qualifiedReferral(
  overrides: Partial<RecordReferralInput> = {},
): Promise<string> {
  const outcome = await h.repositories.referrals.record({
    guildId: TEST_GUILD_ID,
    referredUserId: REFERRED,
    inviterUserId: INVITER,
    inviteCode: 'aaa',
    source: 'invite_diff',
    idempotencyKey: `referral:${TEST_GUILD_ID}:${REFERRED}`,
    ...overrides,
  });

  await h.repositories.referrals.markQualified(outcome.trigger.id, NOW);
  return outcome.trigger.id;
}

describe('paying a referral', () => {
  it('pays the inviter exactly the configured amount', async () => {
    const id = await qualifiedReferral();

    const summary = await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(summary).toMatchObject({ claimed: 1, paid: 1, alreadyPaid: 0, failed: 0 });
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
    expect((await h.repositories.referrals.findById(id))?.state).toBe('paid');
  });

  it('writes exactly one ledger event, of kind referral, attributed to nobody', async () => {
    await qualifiedReferral();
    await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    const events = h.repositories.rewards.events.filter(
      (event) => event.userId === INVITER,
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('referral');
    expect(events[0]?.points).toBe(REFERRAL_POINTS);
    // An automatic kind may not name an actor; the schema enforces this too.
    expect(events[0]?.awardedBy).toBeNull();
  });

  it('pays nothing to the member who was invited', async () => {
    await qualifiedReferral();
    await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, REFERRED)).toBe(0);
  });

  it('links the trigger to the ledger row it produced', async () => {
    const id = await qualifiedReferral();
    await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    const row = await h.repositories.referrals.findById(id);
    const event = h.repositories.rewards.events.find((e) => e.userId === INVITER);

    expect(row?.pointEventId).toBe(event?.id);
    expect(row?.consumedAt).not.toBeNull();
  });

  it('audits the payment', async () => {
    await qualifiedReferral();
    await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    const audit = h.repositories.audit.events.find(
      (event) => event.event === 'rewards.referral',
    );

    expect(audit).toBeDefined();
    expect(audit?.targetId).toBe(INVITER);
    expect(audit?.details).toMatchObject({ points: REFERRAL_POINTS });
  });

  it('tells the inviter, privately', async () => {
    await qualifiedReferral();
    await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    const dm = h.messaging.directMessages.at(-1);
    expect(dm?.userId).toBe(INVITER);
    // The person they invited is not named: that is someone else's
    // membership to disclose.
    expect(JSON.stringify(dm)).not.toContain(REFERRED);
  });

  it('ignores a referral that has not qualified', async () => {
    await h.repositories.referrals.record({
      guildId: TEST_GUILD_ID,
      referredUserId: REFERRED,
      inviterUserId: INVITER,
      inviteCode: 'aaa',
      source: 'invite_diff',
      idempotencyKey: `referral:${TEST_GUILD_ID}:${REFERRED}`,
    });

    const summary = await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(summary.claimed).toBe(0);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(0);
  });

  it('ignores a rejected referral', async () => {
    const id = await qualifiedReferral();
    await h.repositories.referrals.markRejected(id, 'not_present');

    const summary = await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(summary.claimed).toBe(0);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Exactly once
// -----------------------------------------------------------------------------

describe('exactly once', () => {
  it('does not pay twice when the pass runs again', async () => {
    await qualifiedReferral();

    await h.deps.referralConsumer.consume(TEST_GUILD_ID);
    const second = await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(second.claimed).toBe(0);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
    expect(h.repositories.rewards.events).toHaveLength(1);
  });

  it('cannot be paid again once consumed', async () => {
    const id = await qualifiedReferral();
    await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    // Force the row back into the claimable set the way a buggy caller would.
    const settled = await h.repositories.referrals.markPaid({
      id,
      pointEventId: 'some-other-event',
      consumedAt: NOW,
    });

    expect(settled).toBe(false);
    expect(h.repositories.rewards.events).toHaveLength(1);
  });

  /**
   * Two workers, racing.
   *
   * Both call `consume` against the same table before either finishes. The
   * claim is what separates them: the second finds nothing to take, because
   * the first already holds it.
   */
  it('two racing consumers produce exactly one payment', async () => {
    await qualifiedReferral();

    const second = new ReferralConsumer({
      repositories: h.repositories,
      rewards: h.deps.rewards,
      messaging: h.messaging,
      logger: h.deps.logger,
      now: () => NOW,
      workerId: 'companion:second',
    });

    const [a, b] = await Promise.all([
      h.deps.referralConsumer.consume(TEST_GUILD_ID),
      second.consume(TEST_GUILD_ID),
    ]);

    expect(a.claimed + b.claimed).toBe(1);
    expect(a.paid + b.paid).toBe(1);
    expect(h.repositories.rewards.events).toHaveLength(1);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
  });

  /**
   * The crash window.
   *
   * A worker claims the row, pays it, and dies before marking it paid. The
   * claim goes stale, another worker picks it up — and must not pay again.
   * This is the case the idempotency key exists for, and the only one where
   * the claim alone is not enough.
   */
  it('a replayed payment after a crash does not double-pay', async () => {
    const id = await qualifiedReferral();

    // Pay, without settling: exactly what a crash mid-`pay` leaves behind.
    const trigger = await h.repositories.referrals.findById(id);
    await h.deps.rewards.awardReferral({
      guildId: TEST_GUILD_ID,
      inviterUserId: INVITER,
      referredUserId: REFERRED,
      referralId: id,
      idempotencyKey: trigger?.idempotencyKey ?? '',
    });

    // The claim has aged out; the next pass takes it.
    const summary = await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(summary.alreadyPaid).toBe(1);
    expect(summary.paid).toBe(0);
    expect(h.repositories.rewards.events).toHaveLength(1);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
    expect((await h.repositories.referrals.findById(id))?.state).toBe('paid');
  });
});

// -----------------------------------------------------------------------------
// Failure and retry
// -----------------------------------------------------------------------------

describe('when something fails', () => {
  it('releases the claim so the referral is retried', async () => {
    const id = await qualifiedReferral();

    const failing = new ReferralConsumer({
      repositories: h.repositories,
      rewards: {
        awardReferral: () => Promise.reject(new Error('connection terminated')),
      } as unknown as CompanionHarness['deps']['rewards'],
      messaging: h.messaging,
      logger: h.deps.logger,
      now: () => NOW,
      workerId: 'companion:failing',
    });

    const summary = await failing.consume(TEST_GUILD_ID);
    expect(summary.failed).toBe(1);

    const row = await h.repositories.referrals.findById(id);
    expect(row?.state).toBe('qualified');
    expect(row?.claimedAt).toBeNull();

    // The next healthy pass pays it.
    const retry = await h.deps.referralConsumer.consume(TEST_GUILD_ID);
    expect(retry.paid).toBe(1);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
  });

  it('still pays an inviter who has DMs closed', async () => {
    await qualifiedReferral();
    h.messaging.dmBlocked.add(INVITER);

    const summary = await h.deps.referralConsumer.consume(TEST_GUILD_ID);

    expect(summary.paid).toBe(1);
    expect(h.messaging.directMessages.at(-1)?.delivered).toBe(false);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
  });

  /*
   * Points are the payment; the DM is a courtesy. If Discord rejects the
   * message outright the referral must still be settled, or the next pass
   * finds it unpaid and the notification failure becomes a double payment.
   */
  it('settles the referral even when the DM throws', async () => {
    const id = await qualifiedReferral();

    const consumer = new ReferralConsumer({
      repositories: h.repositories,
      rewards: h.deps.rewards,
      messaging: {
        sendToChannel: () => Promise.reject(new Error('channel gone')),
        sendDirectMessage: () => Promise.reject(new Error('cannot send to this user')),
      },
      logger: h.deps.logger,
      now: () => NOW,
      workerId: 'companion:dm-failure',
    });

    const summary = await consumer.consume(TEST_GUILD_ID);

    expect(summary.paid).toBe(1);
    expect((await h.repositories.referrals.findById(id))?.state).toBe('paid');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, INVITER)).toBe(
      REFERRAL_POINTS,
    );
  });

  it('counts attempts, so a stuck referral is visible', async () => {
    const id = await qualifiedReferral();

    const failing = new ReferralConsumer({
      repositories: h.repositories,
      rewards: {
        awardReferral: () => Promise.reject(new Error('nope')),
      } as unknown as CompanionHarness['deps']['rewards'],
      messaging: h.messaging,
      logger: h.deps.logger,
      now: () => NOW,
      workerId: 'companion:failing',
    });

    await failing.consume(TEST_GUILD_ID);
    await failing.consume(TEST_GUILD_ID);

    expect((await h.repositories.referrals.findById(id))?.attempts).toBe(2);
  });
});

// -----------------------------------------------------------------------------
// The staff read
// -----------------------------------------------------------------------------

describe('/companion admin referrals', () => {
  const asAdmin = () =>
    testSubject({ userId: TEST_USER_IDS.administrator, roles: ['administrator'] });
  const asModerator = () =>
    testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] });
  const asMember = () =>
    testSubject({ userId: TEST_USER_IDS.member, roles: ['bloomMember'] });

  const dispatch = (actor: ReturnType<typeof testSubject>, options = {}) =>
    h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'referrals',
      actor,
      options,
    });

  it('shows activity to an administrator', async () => {
    await qualifiedReferral();

    const { responder } = await dispatch(asAdmin());

    expect(responder.visibleText).not.toContain('Not available to you');
    expect(responder.visibleText).toContain('Qualified');
  });

  it('refuses a moderator — rewards capabilities are not theirs', async () => {
    await qualifiedReferral();

    const { responder } = await dispatch(asModerator());

    expect(responder.visibleText).toContain('Not available to you');
  });

  it('refuses an ordinary member', async () => {
    const { responder } = await dispatch(asMember());

    expect(responder.visibleText).toContain('Not available to you');
  });

  it('is ephemeral', async () => {
    await qualifiedReferral();
    const { responder } = await dispatch(asAdmin());

    expect(responder.messages.at(-1)?.ephemeral).toBe(true);
  });

  it('explains why a referral was not paid', async () => {
    const id = await qualifiedReferral();
    await h.repositories.referrals.markRejected(id, 'account_too_new');

    const { responder } = await dispatch(asAdmin());

    expect(responder.visibleText).toContain('too new');
  });

  it('has an empty state that names the likeliest cause', async () => {
    const { responder } = await dispatch(asAdmin());

    expect(responder.visibleText).toContain('Manage Server');
  });

  it('bounds the list', async () => {
    for (let index = 0; index < 30; index += 1) {
      await h.repositories.referrals.record({
        guildId: TEST_GUILD_ID,
        referredUserId: unsafeSnowflake<UserId>(
          `9100000000000${String(index).padStart(5, '0')}`,
        ),
        inviterUserId: INVITER,
        inviteCode: 'aaa',
        source: 'invite_diff',
        idempotencyKey: `referral:${TEST_GUILD_ID}:bounded-${String(index)}`,
      });
    }

    expect(
      await h.repositories.referrals.listRecent(TEST_GUILD_ID, { limit: 10_000 }),
    ).toHaveLength(25);
  });
});

// -----------------------------------------------------------------------------
// Boundary
// -----------------------------------------------------------------------------

describe('Companion stays out of Guardian’s half', () => {
  const dir = import.meta.dirname;
  const sources = ['referral-consumer.ts', 'referral-job.ts'].map((name) => ({
    name,
    text: readFileSync(join(dir, name), 'utf8'),
  }));

  it('touches no Guardian repository', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(
        /\brepositories\.(identity|onboarding|moderation|cases|retention)\b/,
      );
    }
  });

  it('never imports Guardian or Labs', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/from\s+'[^']*(guardian|labs)[^']*'/i);
    }
  });

  /*
   * The amount is not the consumer's to decide. If a future change lets a
   * trigger carry its own payout, this fails — which is the point: a row
   * written by another process must never name its own price.
   */
  it('never names a points amount of its own', () => {
    const consumer = sources.find((file) => file.name === 'referral-consumer.ts');

    expect(consumer?.text).not.toMatch(/points:\s*\d/);
    expect(consumer?.text).not.toMatch(/trigger\.points/);
  });
});
