import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  REFERRAL_QUALIFICATION,
  unsafeSnowflake,
  type UserId,
} from '@bloom/shared-types';
import { TEST_GUILD_ID, TEST_USER_IDS } from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';
import { attributeJoin, toUsageCache } from './attribution.js';
import { createReferralQualificationJob } from './qualification-job.js';

/**
 * Referral attribution and qualification.
 *
 * The thing under test is a refusal to guess. Most of these cases are
 * situations where a naive invite tracker would happily name an inviter, and
 * the assertion is that Bloom does not.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const INVITER = TEST_USER_IDS.member;
const OTHER = TEST_USER_IDS.betaTester;

/** A snowflake whose embedded timestamp is `ageDays` ago. */
function accountAged(ageDays: number, now: Date): UserId {
  const created = BigInt(now.getTime() - ageDays * DAY_MS);
  const snowflake = ((created - 1_420_070_400_000n) << 22n) | 1n;
  return unsafeSnowflake<UserId>(snowflake.toString());
}

// -----------------------------------------------------------------------------
// The diff, as a pure function
// -----------------------------------------------------------------------------

describe('attributeJoin', () => {
  const invite = (code: string, uses: number, inviterId: UserId | null = INVITER) => ({
    code,
    uses,
    inviterId,
    inviterIsBot: false,
  });

  it('names the inviter when exactly one invite advanced', () => {
    const result = attributeJoin({
      previous: new Map([
        ['aaa', 3],
        ['bbb', 7],
      ]),
      current: { invites: [invite('aaa', 4), invite('bbb', 7, OTHER)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result).toEqual({
      inviterId: INVITER,
      inviteCode: 'aaa',
      source: 'invite_diff',
      inviterIsBot: false,
    });
  });

  it('refuses to choose when two invites advanced at once', () => {
    const result = attributeJoin({
      previous: new Map([
        ['aaa', 3],
        ['bbb', 7],
      ]),
      current: { invites: [invite('aaa', 4), invite('bbb', 8, OTHER)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result.inviterId).toBeNull();
    expect(result.source).toBe('ambiguous');
  });

  /*
   * The restart case. An empty cache is no information, and must not be read
   * as "every invite is new".
   */
  it('reports unavailable when there is no baseline', () => {
    const result = attributeJoin({
      previous: new Map(),
      current: { invites: [invite('aaa', 9)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result.inviterId).toBeNull();
    expect(result.source).toBe('unavailable');
  });

  it('reports unavailable when the invite read failed', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: null,
      previousVanityUses: null,
    });

    expect(result.source).toBe('unavailable');
  });

  /*
   * An invite created since the last reading has no baseline, so its use
   * count proves nothing. A tracker that assumed `uses === 1` meant "this one"
   * would misattribute every join that races an invite creation.
   */
  it('refuses when an unseen invite could account for the join', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: { invites: [invite('aaa', 4), invite('zzz', 1, OTHER)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result.inviterId).toBeNull();
    expect(result.source).toBe('ambiguous');
  });

  it('ignores an unseen invite that has never been used', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: { invites: [invite('aaa', 4), invite('zzz', 0, OTHER)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result.inviterId).toBe(INVITER);
  });

  it('recognises a vanity-URL join as a real answer with no inviter', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: { invites: [invite('aaa', 3)], vanityUses: 51 },
      previousVanityUses: 50,
    });

    expect(result.source).toBe('vanity');
    expect(result.inviterId).toBeNull();
  });

  it('refuses when both the vanity URL and an invite advanced', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: { invites: [invite('aaa', 4)], vanityUses: 51 },
      previousVanityUses: 50,
    });

    expect(result.source).toBe('ambiguous');
  });

  it('refuses an invite with no identifiable creator', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: { invites: [invite('aaa', 4, null)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result.inviterId).toBeNull();
    expect(result.source).toBe('ambiguous');
  });

  it('reports unavailable when nothing moved at all', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: { invites: [invite('aaa', 3)], vanityUses: null },
      previousVanityUses: null,
    });

    expect(result.source).toBe('unavailable');
  });

  it('carries the bot flag through for the caller to refuse', () => {
    const result = attributeJoin({
      previous: new Map([['aaa', 3]]),
      current: {
        invites: [{ code: 'aaa', uses: 4, inviterId: INVITER, inviterIsBot: true }],
        vanityUses: null,
      },
      previousVanityUses: null,
    });

    expect(result.inviterIsBot).toBe(true);
  });

  it('folds a reading into a cache', () => {
    const cache = toUsageCache({
      invites: [invite('aaa', 4), invite('bbb', 0)],
      vanityUses: null,
    });

    expect(cache.get('aaa')).toBe(4);
    expect(cache.get('bbb')).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// The service, through the harness
// -----------------------------------------------------------------------------

describe('ReferralService', () => {
  let h: GuardianHarness;
  let now: Date;

  beforeEach(() => {
    now = new Date('2026-03-01T12:00:00.000Z');
    h = guardianHarness({ now: () => now });
  });

  /** Prime the cache, then advance one invite and record a join. */
  async function joinVia(options: {
    readonly joiner: UserId;
    readonly inviter?: UserId | null;
    readonly inviterIsBot?: boolean;
  }): Promise<void> {
    h.invites.setInvites([
      { code: 'aaa', uses: 1, inviterId: options.inviter ?? INVITER },
    ]);
    await h.deps.referrals.primeInviteCache(TEST_GUILD_ID);

    h.invites.setInvites([
      {
        code: 'aaa',
        uses: 2,
        inviterId: options.inviter ?? INVITER,
        ...(options.inviterIsBot === undefined
          ? {}
          : { inviterIsBot: options.inviterIsBot }),
      },
    ]);

    await h.deps.referrals.recordJoin({
      guildId: TEST_GUILD_ID,
      userId: options.joiner,
      isBot: false,
      accountCreatedAt: new Date(now.getTime() - 90 * DAY_MS),
    });
  }

  it('records an attributed join', async () => {
    const joiner = accountAged(90, now);
    await joinVia({ joiner });

    const [row] = h.repositories.referrals.triggers;
    expect(row?.referredUserId).toBe(joiner);
    expect(row?.inviterUserId).toBe(INVITER);
    expect(row?.source).toBe('invite_diff');
    expect(row?.state).toBe('pending');
  });

  it('records an unattributed join rather than dropping it', async () => {
    h.invites.snapshot = null;

    await h.deps.referrals.recordJoin({
      guildId: TEST_GUILD_ID,
      userId: accountAged(90, now),
      isBot: false,
      accountCreatedAt: new Date(now.getTime() - 90 * DAY_MS),
    });

    const [row] = h.repositories.referrals.triggers;
    expect(row?.inviterUserId).toBeNull();
    expect(row?.source).toBe('unavailable');
  });

  it('ignores a bot joining', async () => {
    await h.deps.referrals.recordJoin({
      guildId: TEST_GUILD_ID,
      userId: accountAged(90, now),
      isBot: true,
      accountCreatedAt: now,
    });

    expect(h.repositories.referrals.triggers).toHaveLength(0);
  });

  it('refuses a referral created by an application', async () => {
    await joinVia({ joiner: accountAged(90, now), inviterIsBot: true });

    const [row] = h.repositories.referrals.triggers;
    expect(row?.state).toBe('rejected');
    expect(row?.rejectedReason).toBe('inviter_is_bot');
  });

  it('does not create a second referral when a member rejoins', async () => {
    const joiner = accountAged(90, now);
    await joinVia({ joiner });
    await joinVia({ joiner });
    await joinVia({ joiner });

    expect(h.repositories.referrals.triggers).toHaveLength(1);
  });

  it('never attributes a member to themselves', async () => {
    const joiner = accountAged(90, now);
    await joinVia({ joiner, inviter: joiner });

    const [row] = h.repositories.referrals.triggers;
    expect(row?.inviterUserId).toBeNull();
  });

  it('does not let an attribution failure break the join', async () => {
    const joiner = accountAged(90, now);
    h.invites.setInvites([{ code: 'aaa', uses: 1, inviterId: INVITER }]);
    await h.deps.referrals.primeInviteCache(TEST_GUILD_ID);

    // Make the write fail the way a database outage would.
    h.repositories.referrals.record = () =>
      Promise.reject(new Error('connection terminated'));

    await expect(
      h.deps.referrals.recordJoin({
        guildId: TEST_GUILD_ID,
        userId: joiner,
        isBot: false,
        accountCreatedAt: now,
      }),
    ).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Qualification
  // ---------------------------------------------------------------------------

  describe('qualification', () => {
    /** Record a join and move the clock forward. */
    async function pendingReferral(options: {
      readonly accountAgeDays: number;
      readonly waitDays: number;
      readonly present?: boolean;
    }): Promise<void> {
      const joiner = accountAged(options.accountAgeDays, now);
      await joinVia({ joiner });

      if (options.present !== false) {
        h.guild.withMember(joiner);
      }

      now = new Date(now.getTime() + options.waitDays * DAY_MS);
    }

    it('pays nothing on the day someone joins', async () => {
      await pendingReferral({ accountAgeDays: 90, waitDays: 0 });

      const summary = await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      expect(summary.qualified).toBe(0);
      expect(h.repositories.referrals.triggers[0]?.state).toBe('pending');
    });

    it('still waits the day before the threshold', async () => {
      await pendingReferral({
        accountAgeDays: 90,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays - 1,
      });

      const summary = await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      expect(summary.qualified).toBe(0);
      expect(h.repositories.referrals.triggers[0]?.state).toBe('pending');
    });

    it('qualifies on the day the threshold is reached', async () => {
      await pendingReferral({
        accountAgeDays: 90,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
      });

      const summary = await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      expect(summary.qualified).toBe(1);
      const row = h.repositories.referrals.triggers[0];
      expect(row?.state).toBe('qualified');
      expect(row?.qualifiedAt).not.toBeNull();
    });

    it('refuses an account younger than the floor', async () => {
      await pendingReferral({
        accountAgeDays: 2,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
      });

      await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      const row = h.repositories.referrals.triggers[0];
      expect(row?.state).toBe('rejected');
      expect(row?.rejectedReason).toBe('account_too_new');
    });

    /*
     * An account that was too new at join time but has since aged past the
     * floor is accepted. The rule is about bulk-registered accounts, and a
     * month of real elapsed time is exactly what it asks for.
     */
    it('accepts an account that aged past the floor while waiting', async () => {
      await pendingReferral({
        accountAgeDays: REFERRAL_QUALIFICATION.minAccountAgeDays - 3,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
      });

      await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      expect(h.repositories.referrals.triggers[0]?.state).toBe('qualified');
    });

    it('refuses someone who is no longer in the server', async () => {
      await pendingReferral({
        accountAgeDays: 90,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
        present: false,
      });

      await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      const row = h.repositories.referrals.triggers[0];
      expect(row?.state).toBe('rejected');
      expect(row?.rejectedReason).toBe('not_present');
    });

    it('refuses a referral with no identified inviter', async () => {
      h.invites.snapshot = null;
      await h.deps.referrals.recordJoin({
        guildId: TEST_GUILD_ID,
        userId: accountAged(90, now),
        isBot: false,
        accountCreatedAt: now,
      });
      now = new Date(now.getTime() + 30 * DAY_MS);

      await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      const row = h.repositories.referrals.triggers[0];
      expect(row?.state).toBe('rejected');
      expect(row?.rejectedReason).toBe('no_inviter');
    });

    it('rejects a pending referral when the member leaves', async () => {
      const joiner = accountAged(90, now);
      await joinVia({ joiner });

      await h.deps.referrals.recordLeave(TEST_GUILD_ID, joiner);

      const row = h.repositories.referrals.triggers[0];
      expect(row?.state).toBe('rejected');
      expect(row?.rejectedReason).toBe('left_before_qualifying');
    });

    it('pays an inviter who has since left', async () => {
      await pendingReferral({
        accountAgeDays: 90,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
      });
      // The inviter is not in the guild fixture at all, which is what "left"
      // looks like to `getMember`.

      const summary = await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      expect(summary.qualified).toBe(1);
    });

    it('writes an audit entry when a referral qualifies', async () => {
      await pendingReferral({
        accountAgeDays: 90,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
      });

      await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      const events = h.repositories.audit.events.map((event) => event.event);
      expect(events).toContain('referral.qualified');
    });

    it('is idempotent across repeated passes', async () => {
      await pendingReferral({
        accountAgeDays: 90,
        waitDays: REFERRAL_QUALIFICATION.minMembershipDays,
      });

      await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);
      const second = await h.deps.referrals.runQualificationPass(TEST_GUILD_ID);

      expect(second.qualified).toBe(0);
      expect(
        h.repositories.audit.events.filter((e) => e.event === 'referral.qualified'),
      ).toHaveLength(1);
    });
  });
});

// -----------------------------------------------------------------------------
// Boundary
// -----------------------------------------------------------------------------

describe('Guardian stays out of the economy', () => {
  const dir = import.meta.dirname;
  const sources = ['attribution.ts', 'service.ts', 'qualification-job.ts'].map(
    (name) => ({
      name,
      text: readFileSync(join(dir, name), 'utf8'),
    }),
  );

  it('never reaches for the rewards or awards repositories', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/\brepositories\.(rewards|awards)\b/);
    }
  });

  it('never imports the Companion application', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/from\s+'[^']*companion[^']*'/i);
    }
  });

  /*
   * Guardian knows what a referral is worth only because the constant is
   * shared for display. It must not be the thing that writes a ledger row.
   */
  it('contains no points arithmetic', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/\bpoints\s*[:=]/);
      expect(file.text).not.toMatch(/\baward\(/);
    }
  });
});

// -----------------------------------------------------------------------------
// The scheduled pass
// -----------------------------------------------------------------------------

const JOB_NOW = new Date('2026-03-01T12:00:00.000Z');

const runContext = (jobKey: string, logger: unknown) => ({
  jobKey,
  guildId: TEST_GUILD_ID,
  runId: 'run-1',
  logger,
  scheduledFor: JOB_NOW,
});

describe('Guardian’s qualification job', () => {
  const job = () =>
    createReferralQualificationJob(guardianHarness({ now: () => JOB_NOW }).deps);

  it('is registered enabled, hourly, and scoped to the guild', () => {
    const scheduled = job();

    expect(scheduled.key).toBe('guardian.referrals.qualify');
    expect(scheduled.enabled).toBe(true);
    expect(scheduled.guildId).toBe(TEST_GUILD_ID);
    // Offset off the hour: every other hourly job in the platform fires at
    // :00, and a thundering herd on one connection pool is avoidable.
    expect(scheduled.schedule).toBe('7 * * * *');
    expect(scheduled.schedule).not.toMatch(/^0 /);
  });

  it('holds a lease shorter than its own interval', () => {
    const scheduled = job();

    expect(scheduled.leaseSeconds).toBeGreaterThan(0);
    expect(scheduled.leaseSeconds).toBeLessThan(3600);
  });

  it('uses a key namespaced to its own bot', () => {
    expect(job().key.startsWith('guardian.')).toBe(true);
  });

  it('carries a description a staff member could act on', () => {
    expect(job().description.length).toBeGreaterThan(20);
  });

  it('runs a pass without posting anything', async () => {
    const h = guardianHarness({ now: () => JOB_NOW });
    const scheduled = createReferralQualificationJob(h.deps);

    await scheduled.run(runContext(scheduled.key, h.deps.logger) as never);

    // Qualification is bookkeeping. Announcing it would tell a channel that
    // somebody's invitee stayed, which is nobody else's business.
    expect(h.messaging.sent).toHaveLength(0);
  });
});
