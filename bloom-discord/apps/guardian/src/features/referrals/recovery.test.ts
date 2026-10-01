import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type UserId } from '@bloom/shared-types';
import { TEST_GUILD_ID, TEST_USER_IDS } from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';
import { inviteCreateHandler, inviteDeleteHandler } from './handlers.js';
import { recoverInviteBaseline } from './recovery.js';

/**
 * Surviving a restart.
 *
 * Attribution is a diff between two readings of the invite list, so it is
 * only as good as the baseline. The baseline lives in memory, which means
 * every restart, every deploy and every dropped gateway session starts from
 * nothing — and the failure mode is silent: joins quietly record
 * `unavailable` and nobody notices until someone asks why referrals stopped
 * paying.
 *
 * These tests cover the two halves of that: getting a baseline back quickly,
 * and refusing to use one that might be stale.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const INVITER = TEST_USER_IDS.member;
const OTHER = TEST_USER_IDS.betaTester;

let h: GuardianHarness;
let now: Date;

beforeEach(() => {
  now = new Date('2026-03-01T12:00:00.000Z');
  h = guardianHarness({ now: () => now });
});

/** A snowflake whose embedded timestamp is `ageDays` ago. */
function accountAged(ageDays: number): UserId {
  const created = BigInt(now.getTime() - ageDays * DAY_MS);
  return unsafeSnowflake<UserId>(
    (((created - 1_420_070_400_000n) << 22n) | 1n).toString(),
  );
}

const join = (userId: UserId) =>
  h.deps.referrals.recordJoin({
    guildId: TEST_GUILD_ID,
    userId,
    isBot: false,
    accountCreatedAt: new Date(now.getTime() - 90 * DAY_MS),
  });

const latest = () => h.repositories.referrals.triggers.at(-1);

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

describe('populating the cache at startup', () => {
  it('reads the invite list and reports a baseline', async () => {
    h.invites.setInvites([
      { code: 'aaa', uses: 4, inviterId: INVITER },
      { code: 'bbb', uses: 9, inviterId: OTHER },
    ]);

    const primed = await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    expect(primed).toBe(true);
    expect(h.invites.reads).toBe(1);
    expect(h.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(true);
  });

  /**
   * The regression this whole change exists for.
   *
   * Before startup priming, the first member through the door after every
   * deploy was unattributable, because the first join was also the first
   * read. One restart a day meant one lost referral a day.
   */
  it('attributes the very first join after startup', async () => {
    h.invites.setInvites([{ code: 'aaa', uses: 4, inviterId: INVITER }]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    h.invites.setInvites([{ code: 'aaa', uses: 5, inviterId: INVITER }]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBe(INVITER);
    expect(latest()?.source).toBe('invite_diff');
  });

  it('logs that the baseline is ready, with no invite codes in the line', async () => {
    h.invites.setInvites([{ code: 'secret-code', uses: 1, inviterId: INVITER }]);

    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    expect(h.logs.find('referrals.invite_baseline_ready')?.severity).toBe('info');
    // An invite code is a credential: anyone holding it can join the server.
    expect(h.logs.serialised()).not.toContain('secret-code');
  });

  it('starts with no baseline when the guild has no invites at all', async () => {
    h.invites.setInvites([]);

    const primed = await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    // The read succeeded, so this is not a failure — but an empty list is
    // also no baseline, and a join must not be attributed from nothing.
    expect(primed).toBe(true);
    expect(h.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(false);

    h.invites.setInvites([{ code: 'new', uses: 1, inviterId: INVITER }]);
    await join(accountAged(90));
    expect(latest()?.inviterUserId).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Failure
// -----------------------------------------------------------------------------

describe('when the invite read fails', () => {
  it('reports failure when Discord refuses the read', async () => {
    h.invites.snapshot = null;

    const primed = await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    expect(primed).toBe(false);
    expect(h.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(false);
  });

  it('reports failure when the read throws', async () => {
    h.invites.failure = new Error('socket hang up');

    const primed = await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    expect(primed).toBe(false);
  });

  it('names the missing permission, because that is the usual cause', async () => {
    h.invites.snapshot = null;
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    const warning = h.logs.find('referrals.invite_baseline_missing');
    expect(warning?.severity).toBe('warn');
    expect(warning?.message).toContain('Manage Server');
  });

  it('leaks no token or credential into the log', async () => {
    h.invites.failure = new Error('401 Unauthorized: Bot NDk4.aBcDeF.tOkEn-value');

    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    expect(h.logs.serialised()).not.toContain('NDk4.aBcDeF.tOkEn-value');
  });

  /*
   * Fail-closed: a failed read must not leave the previous baseline in place.
   * The previous baseline is from before an outage of unknown length, and
   * diffing against it is how a tracker confidently names the wrong person.
   */
  it('drops a baseline it could not refresh, rather than trusting it', async () => {
    h.invites.setInvites([{ code: 'aaa', uses: 4, inviterId: INVITER }]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');
    expect(h.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(true);

    h.invites.failure = new Error('gateway timeout');
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'resume');

    expect(h.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(false);
  });

  it('records a join as unattributed while there is no baseline', async () => {
    h.invites.snapshot = null;
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBeNull();
    expect(latest()?.source).toBe('unavailable');
  });

  it('recovers on the next successful read', async () => {
    h.invites.snapshot = null;
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    h.invites.failure = null;
    h.invites.setInvites([{ code: 'aaa', uses: 4, inviterId: INVITER }]);
    expect(await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'resume')).toBe(true);

    h.invites.setInvites([{ code: 'aaa', uses: 5, inviterId: INVITER }]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBe(INVITER);
  });

  it('never throws out of the recovery hook', async () => {
    h.invites.failure = new Error('boom');

    await expect(recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'resume')).resolves.toBe(
      false,
    );
  });
});

// -----------------------------------------------------------------------------
// Invite lifecycle
// -----------------------------------------------------------------------------

describe('keeping the cache current', () => {
  const created = (code: string, uses = 0) =>
    inviteCreateHandler.handle(
      { guildId: TEST_GUILD_ID, code, uses, inviterId: OTHER, inviterIsBot: false },
      h.deps,
    );

  const deleted = (code: string) =>
    inviteDeleteHandler.handle({ guildId: TEST_GUILD_ID, code }, h.deps);

  beforeEach(async () => {
    h.invites.setInvites([{ code: 'aaa', uses: 4, inviterId: INVITER }]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');
  });

  /**
   * Without this, creating an invite and sharing it costs you the referral on
   * its first use: the invite has no baseline, so `attributeJoin` counts it
   * as uncertainty and refuses the whole join.
   */
  it('attributes a join through an invite created since startup', async () => {
    await created('fresh');

    h.invites.setInvites([
      { code: 'aaa', uses: 4, inviterId: INVITER },
      { code: 'fresh', uses: 1, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBe(OTHER);
    expect(latest()?.inviteCode).toBe('fresh');
  });

  it('refuses the same join when the creation event was missed', async () => {
    // No inviteCreate handled — the invite simply appears at join time.
    h.invites.setInvites([
      { code: 'aaa', uses: 4, inviterId: INVITER },
      { code: 'fresh', uses: 1, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBeNull();
    expect(latest()?.source).toBe('ambiguous');
  });

  it('forgets a deleted invite', async () => {
    await created('temp');
    await deleted('temp');

    // The code is gone from the baseline, so if it reappears with uses on it
    // the join is uncertain again rather than silently attributed.
    h.invites.setInvites([
      { code: 'aaa', uses: 4, inviterId: INVITER },
      { code: 'temp', uses: 1, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBeNull();
  });

  it('ignores invite events for a guild with no baseline', async () => {
    h.deps.referrals.invalidateInviteCache(TEST_GUILD_ID);

    await created('fresh');

    /*
     * Seeding one known invite into an empty cache would make the next join
     * look like "exactly one invite advanced and nothing else moved", when in
     * truth every other invite in the guild is unknown.
     */
    expect(h.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(false);
  });

  it('handles a replayed create or delete without complaint', async () => {
    await created('fresh');
    await created('fresh');
    await deleted('gone');
    await deleted('gone');

    h.invites.setInvites([
      { code: 'aaa', uses: 4, inviterId: INVITER },
      { code: 'fresh', uses: 1, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBe(OTHER);
  });

  it('declares a dedupe key, since a resume replays these', () => {
    expect(
      inviteCreateHandler.dedupeKey?.({
        guildId: TEST_GUILD_ID,
        code: 'aaa',
        uses: 0,
        inviterId: OTHER,
        inviterIsBot: false,
      }),
    ).toBe(`invite-create:${TEST_GUILD_ID}:aaa`);

    expect(inviteDeleteHandler.dedupeKey?.({ guildId: TEST_GUILD_ID, code: 'aaa' })).toBe(
      `invite-delete:${TEST_GUILD_ID}:aaa`,
    );
  });

  it('is owned by Guardian, the only bot that reads invites', () => {
    expect(inviteCreateHandler.bot).toBe('guardian');
    expect(inviteDeleteHandler.bot).toBe('guardian');
  });
});

// -----------------------------------------------------------------------------
// Restart and resume
// -----------------------------------------------------------------------------

describe('restart and resume', () => {
  it('a fresh process has no baseline until it primes one', async () => {
    const restarted = guardianHarness({ now: () => now });

    expect(restarted.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(false);

    restarted.invites.setInvites([{ code: 'aaa', uses: 4, inviterId: INVITER }]);
    await recoverInviteBaseline(restarted.deps, TEST_GUILD_ID, 'startup');

    expect(restarted.deps.referrals.hasInviteBaseline(TEST_GUILD_ID)).toBe(true);
  });

  /**
   * The full restart story: a member joins, the process dies, a new process
   * starts and primes, and the next member is attributed normally. The point
   * is that the restart costs nothing — no lost attribution, and no wrong one.
   */
  it('attributes normally either side of a restart', async () => {
    h.invites.setInvites([{ code: 'aaa', uses: 1, inviterId: INVITER }]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    h.invites.setInvites([{ code: 'aaa', uses: 2, inviterId: INVITER }]);
    await join(accountAged(90));
    expect(latest()?.inviterUserId).toBe(INVITER);

    // …process restarts. New harness, same guild, invites where they were.
    const restarted = guardianHarness({ now: () => now });
    restarted.invites.setInvites([{ code: 'aaa', uses: 2, inviterId: INVITER }]);
    await recoverInviteBaseline(restarted.deps, TEST_GUILD_ID, 'startup');

    restarted.invites.setInvites([{ code: 'aaa', uses: 3, inviterId: INVITER }]);
    await restarted.deps.referrals.recordJoin({
      guildId: TEST_GUILD_ID,
      userId: accountAged(80),
      isBot: false,
      accountCreatedAt: new Date(now.getTime() - 80 * DAY_MS),
    });

    expect(restarted.repositories.referrals.triggers.at(-1)?.inviterUserId).toBe(INVITER);
  });

  /**
   * A resume rebuilds the baseline from Discord rather than carrying the
   * pre-outage one forward. Joins that happened while disconnected are lost
   * — their gateway events were never delivered — but the ones after it are
   * measured against a current reading.
   */
  it('re-reads the invite list on resume', async () => {
    h.invites.setInvites([{ code: 'aaa', uses: 1, inviterId: INVITER }]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');
    const readsAfterStartup = h.invites.reads;

    // Three joins happened during the outage, all through 'aaa'.
    h.invites.setInvites([{ code: 'aaa', uses: 4, inviterId: INVITER }]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'resume');

    expect(h.invites.reads).toBe(readsAfterStartup + 1);

    // The next real join is a clean +1 against the post-outage reading.
    h.invites.setInvites([{ code: 'aaa', uses: 5, inviterId: INVITER }]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBe(INVITER);
  });

  it('does not let a stale baseline attribute across an outage', async () => {
    h.invites.setInvites([
      { code: 'aaa', uses: 1, inviterId: INVITER },
      { code: 'bbb', uses: 1, inviterId: OTHER },
    ]);
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');

    // Outage. Both invites get used, and the resume read fails.
    h.invites.failure = new Error('service unavailable');
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'resume');

    h.invites.failure = null;
    h.invites.setInvites([
      { code: 'aaa', uses: 3, inviterId: INVITER },
      { code: 'bbb', uses: 2, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    // With the stale baseline retained this would have been "two invites
    // advanced" → ambiguous, or worse, one of them → a wrong inviter.
    expect(latest()?.inviterUserId).toBeNull();
    expect(latest()?.source).toBe('unavailable');
  });
});

// -----------------------------------------------------------------------------
// The guarantees recovery must not weaken
// -----------------------------------------------------------------------------

describe('recovery does not weaken attribution', () => {
  beforeEach(async () => {
    h.invites.setInvites(
      [
        { code: 'aaa', uses: 1, inviterId: INVITER },
        { code: 'bbb', uses: 1, inviterId: OTHER },
      ],
      0,
    );
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');
  });

  it('still refuses to pick when two invites advance together', async () => {
    h.invites.setInvites([
      { code: 'aaa', uses: 2, inviterId: INVITER },
      { code: 'bbb', uses: 2, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBeNull();
    expect(latest()?.source).toBe('ambiguous');
  });

  it('still refuses when a freshly created invite could account for the join', async () => {
    // Created, but the event was missed — so it is genuinely unknown.
    h.invites.setInvites([
      { code: 'aaa', uses: 2, inviterId: INVITER },
      { code: 'bbb', uses: 1, inviterId: OTHER },
      { code: 'ghost', uses: 1, inviterId: OTHER },
    ]);
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBeNull();
  });

  it('still refuses when the vanity URL moved too', async () => {
    h.invites.setInvites(
      [
        { code: 'aaa', uses: 2, inviterId: INVITER },
        { code: 'bbb', uses: 1, inviterId: OTHER },
      ],
      1,
    );
    await join(accountAged(90));

    expect(latest()?.inviterUserId).toBeNull();
  });

  it('still records one referral per member across a restart', async () => {
    const joiner = accountAged(90);

    h.invites.setInvites([
      { code: 'aaa', uses: 2, inviterId: INVITER },
      { code: 'bbb', uses: 1, inviterId: OTHER },
    ]);
    await join(joiner);
    expect(h.repositories.referrals.triggers).toHaveLength(1);

    // Rejoin after a restart: same member, primed cache, one more use.
    await recoverInviteBaseline(h.deps, TEST_GUILD_ID, 'startup');
    h.invites.setInvites([
      { code: 'aaa', uses: 3, inviterId: INVITER },
      { code: 'bbb', uses: 1, inviterId: OTHER },
    ]);
    await join(joiner);

    expect(h.repositories.referrals.triggers).toHaveLength(1);
  });

  it('still ignores bots joining', async () => {
    h.invites.setInvites([
      { code: 'aaa', uses: 2, inviterId: INVITER },
      { code: 'bbb', uses: 1, inviterId: OTHER },
    ]);
    await h.deps.referrals.recordJoin({
      guildId: TEST_GUILD_ID,
      userId: accountAged(90),
      isBot: true,
      accountCreatedAt: now,
    });

    expect(h.repositories.referrals.triggers).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// Wiring
// -----------------------------------------------------------------------------

describe('the recovery is actually wired up', () => {
  const mainSource = readFileSync(
    joinPath(import.meta.dirname, '..', '..', 'main.ts'),
    'utf8',
  );

  /*
   * The behaviour above is all tested through the service, which cannot
   * prove the lifecycle hooks call it. These read the wiring directly —
   * blunt, but the alternative is booting a real gateway client.
   */
  it('primes the baseline on startup', () => {
    expect(mainSource).toMatch(
      /onReady[\s\S]*recoverInviteBaseline\(deps, guildId, 'startup'\)/,
    );
  });

  it('rebuilds the baseline on resume', () => {
    expect(mainSource).toMatch(/onResume[\s\S]*recoverInviteBaseline\(/);
  });

  it('registers both invite handlers', () => {
    expect(mainSource).toContain('.register(inviteCreateHandler)');
    expect(mainSource).toContain('.register(inviteDeleteHandler)');
  });

  it('asks for no permission beyond the invite capability already granted', () => {
    // Manage Guild was approved for invite reading. Recovery re-reads the
    // same endpoint, so nothing new is needed — and nothing new appears.
    expect(mainSource).not.toMatch(/ManageGuild|MANAGE_GUILD|PermissionsBitField/);
  });
});
