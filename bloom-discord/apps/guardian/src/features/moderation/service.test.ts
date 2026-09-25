import { beforeEach, describe, expect, it } from 'vitest';
import {
  BloomError,
  unsafeSnowflake,
  type CorrelationId,
  type UserId,
} from '@bloom/shared-types';
import { newCorrelationId } from '@bloom/utils';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

/**
 * Moderation actions.
 *
 * The properties worth defending here are the ones that are invisible when they
 * break: that an action which touched Discord is always recorded, that an
 * action which was refused touched nothing at all, and that unlocking restores
 * what was actually there rather than what we would like to have been there.
 */

let h: GuardianHarness;
let correlationId: CorrelationId;

const MODERATOR = TEST_USER_IDS.moderator;
const MEMBER = TEST_USER_IDS.member;
/** A second moderator, for the equal-rank case. */
const PEER: UserId = unsafeSnowflake<UserId>('900000000000001007');
const CHANNEL = TEST_CHANNEL_IDS.support;

beforeEach(() => {
  h = guardianHarness();
  correlationId = newCorrelationId();
  h.guild.withMember(MEMBER);
  h.guild.withMember(MODERATOR, { roleIds: [TEST_ROLE_IDS.moderator] });
});

function moderator(): ReturnType<typeof testSubject> {
  return testSubject({ userId: MODERATOR, roles: ['moderator'] });
}

describe('warn', () => {
  it('records the warning and counts it', async () => {
    const outcome = await h.deps.moderation.warn({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Repeated off-topic posting.',
      correlationId,
    });

    expect(outcome.action).toBe('warn');
    expect(outcome.activeWarnings).toBe(1);
    expect(outcome.record.subjectId).toBe(MEMBER);
    expect(outcome.record.reason).toBe('Repeated off-topic posting.');
  });

  /**
   * A warning is a database action with no Discord counterpart. If the code
   * ever started routing it through the moderation port — because "warn" got
   * folded into a generic action path — the member would get timed out by a
   * command that promises not to.
   */
  it('does not touch Discord', async () => {
    await h.deps.moderation.warn({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'First warning.',
      correlationId,
    });

    expect(h.moderation.calls).toHaveLength(0);
  });

  it('accumulates, so the second warning reports two', async () => {
    for (const reason of ['First.', 'Second.']) {
      await h.deps.moderation.warn({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MEMBER,
        reason,
        correlationId,
      });
    }

    const latest = await h.deps.moderation.warn({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Third.',
      correlationId,
    });
    expect(latest.activeWarnings).toBe(3);
  });

  /**
   * `/warn @someone "stop pinging @everyone"` must not itself ping everyone.
   *
   * Asserted on the DM rather than the stored row, because that is where the
   * risk actually is: the row is plain text nobody renders, while the notice is
   * a real Discord message. Storing the escaped form instead would corrupt
   * every export and every audit-log entry to defend a place that does not need
   * defending.
   */
  it('neutralises mentions where the reason is rendered', async () => {
    await h.deps.moderation.warn({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Stop pinging @everyone and @here.',
      correlationId,
    });

    const dm = JSON.stringify(h.messaging.directMessages[0]?.message);
    expect(dm).not.toContain('@everyone');
    expect(dm).not.toContain('@here');
  });

  /**
   * The flip side: what lands in the database is what the moderator typed.
   * A markdown-escaped reason reads as `off\-topic` in every export and in
   * Discord's own audit-log header, which is plain text.
   */
  it('stores the reason unescaped, for exports and the audit log', async () => {
    const outcome = await h.deps.moderation.warn({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Repeated off-topic posting in #general.',
      correlationId,
    });

    expect(outcome.record.reason).toBe('Repeated off-topic posting in #general.');
  });

  it('refuses an empty reason rather than recording a blank one', async () => {
    await expect(
      h.deps.moderation.warn({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MEMBER,
        reason: '   ',
        correlationId,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'));
  });

  it('refuses a case number that does not exist', async () => {
    await expect(
      h.deps.moderation.warn({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MEMBER,
        reason: 'Attached to nothing.',
        correlationId,
        caseNumber: 4242,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'));
  });
});

describe('target protection', () => {
  it('refuses a moderator acting on themselves', async () => {
    await expect(
      h.deps.moderation.warn({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MODERATOR,
        reason: 'Self-inflicted.',
        correlationId,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'SELF_ACTION_BLOCKED'));
  });

  /**
   * Equal rank is the case people get wrong. Discord's own hierarchy check
   * refuses it, so allowing it here would produce a recorded action that never
   * happened — the worst of both outcomes.
   */
  it('refuses a peer of equal rank', async () => {
    h.guild.withMember(PEER, { roleIds: [TEST_ROLE_IDS.moderator] });

    await expect(
      h.deps.moderation.timeout({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: PEER,
        reason: 'Disagreement.',
        correlationId,
        durationMs: 60_000,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'TARGET_PROTECTED'));

    expect(h.moderation.calls).toHaveLength(0);
  });

  it('refuses when a protected target would otherwise be actioned', async () => {
    const admin = TEST_USER_IDS.administrator;
    h.guild.withMember(admin, { roleIds: [TEST_ROLE_IDS.administrator] });

    await expect(
      h.deps.moderation.kick({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: admin,
        reason: 'Overreach.',
        correlationId,
      }),
    ).rejects.toBeInstanceOf(BloomError);
    expect(h.moderation.calls).toHaveLength(0);
  });

  /**
   * A refused action must leave no trace. A moderation row for something that
   * did not happen is worse than no row: it is a record staff will later act
   * on.
   */
  it('records nothing when the action is refused', async () => {
    await h.deps.moderation
      .warn({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MODERATOR,
        reason: 'Self.',
        correlationId,
      })
      .catch(() => undefined);

    const history = await h.repositories.moderation.listForSubject(
      TEST_GUILD_ID,
      MODERATOR,
    );
    expect(history).toHaveLength(0);
  });
});

describe('timeout', () => {
  it('applies the timeout and records the expiry', async () => {
    const outcome = await h.deps.moderation.timeout({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Cooling off.',
      correlationId,
      durationMs: 10 * 60_000,
    });

    expect(h.moderation.calls.map((c) => c.action)).toEqual(['timeout']);
    expect(outcome.record.durationSeconds).toBe(600);
    expect(outcome.record.expiresAt).toBeInstanceOf(Date);
  });

  /**
   * DM before the enforcement, for kick especially: once the member is gone
   * Bloom no longer shares a guild with them and Discord refuses the DM. An
   * unexplained removal is the difference between moderation and disappearance.
   */
  it('notifies the member before removing them', async () => {
    await h.deps.moderation.kick({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Repeatedly ignored staff.',
      correlationId,
    });

    expect(h.messaging.directMessages).toHaveLength(1);
    expect(h.moderation.calls.map((c) => c.action)).toEqual(['kick']);
  });

  /**
   * Most members have server DMs closed. Treating that as a failure would make
   * routine moderation look broken and, worse, might abort the action itself.
   */
  it('still acts when the member has DMs closed', async () => {
    h.messaging.dmBlocked.add(MEMBER);

    const outcome = await h.deps.moderation.timeout({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Cooling off.',
      correlationId,
      durationMs: 60_000,
    });

    expect(outcome.memberNotified).toBe(false);
    expect(h.moderation.calls.map((c) => c.action)).toEqual(['timeout']);
  });

  /**
   * Discord first, database second. A record claiming a ban that never landed
   * misleads every moderator who reads it afterwards; a missing record harms
   * nobody by comparison.
   */
  it('records nothing when Discord rejects the action', async () => {
    h.moderation.failNext = new Error('Missing Permissions');

    await expect(
      h.deps.moderation.timeout({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MEMBER,
        reason: 'Cooling off.',
        correlationId,
        durationMs: 60_000,
      }),
    ).rejects.toBeInstanceOf(Error);

    const history = await h.repositories.moderation.listForSubject(TEST_GUILD_ID, MEMBER);
    expect(history).toHaveLength(0);
  });
});

describe('ban and unban', () => {
  /**
   * Banning someone who was never in the guild is a normal, intentional
   * operation — pre-emptively blocking a known raider. Requiring a member
   * snapshot would break exactly the case where speed matters.
   */
  it('bans a user who is not a member', async () => {
    const stranger = TEST_USER_IDS.newcomer;

    const outcome = await h.deps.moderation.ban({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: stranger,
      reason: 'Known raid account.',
      correlationId,
    });

    expect(outcome.record.action).toBe('ban');
    expect(h.moderation.bans).toContain(stranger);
  });

  /**
   * Unbanning someone who is not banned reports truthfully rather than
   * pretending. A moderator who is told "done" when nothing happened will not
   * go looking for the real ban.
   */
  it('reports honestly when the user was not banned', async () => {
    const outcome = await h.deps.moderation.unban({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: TEST_USER_IDS.newcomer,
      reason: 'Appeal granted.',
      correlationId,
    });

    expect(outcome.wasBanned).toBe(false);
    expect(outcome.record.metadata['was_banned']).toBe(false);
  });
});

describe('clear warnings', () => {
  it('revokes the active warnings and reports the count', async () => {
    for (const reason of ['One.', 'Two.']) {
      await h.deps.moderation.warn({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        targetId: MEMBER,
        reason,
        correlationId,
      });
    }

    const outcome = await h.deps.moderation.clearWarnings({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Six months clean.',
      correlationId,
    });

    expect(outcome.cleared).toBe(2);
    expect(
      await h.repositories.moderation.countActiveWarnings(TEST_GUILD_ID, MEMBER),
    ).toBe(0);
  });

  /**
   * Clearing warnings is itself a moderator action on a member's record, so it
   * is recorded even when it cleared nothing. "A moderator ran this and there
   * was nothing there" is information.
   */
  it('records the attempt even when there was nothing to clear', async () => {
    const outcome = await h.deps.moderation.clearWarnings({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Housekeeping.',
      correlationId,
    });

    expect(outcome.cleared).toBe(0);
    const history = await h.repositories.moderation.listForSubject(TEST_GUILD_ID, MEMBER);
    expect(history.map((row) => row.action)).toContain('clear_warnings');
  });

  /**
   * Revoked warnings stay on the record. Deleting them would erase the history
   * a future moderator needs — "cleared" means "no longer counts", not "never
   * happened".
   */
  it('keeps revoked warnings visible in the history', async () => {
    await h.deps.moderation.warn({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Old warning.',
      correlationId,
    });
    await h.deps.moderation.clearWarnings({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      targetId: MEMBER,
      reason: 'Expired.',
      correlationId,
    });

    const history = await h.repositories.moderation.listForSubject(TEST_GUILD_ID, MEMBER);
    const warning = history.find((row) => row.action === 'warn');
    expect(warning?.revokedAt).not.toBeNull();
  });
});

describe('channel locking', () => {
  it('locks a channel and remembers what it was before', async () => {
    const channelId = CHANNEL;
    h.channels.sendPermission.set(channelId, 'allowed');

    const outcome = await h.deps.moderation.setLock({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      channelId,
      locked: true,
      reason: 'Raid in progress.',
      correlationId,
    });

    expect(outcome.changed).toBe(true);
    expect(h.channels.sendPermission.get(channelId)).toBe('denied');
    expect(outcome.record.metadata['previous']).toBe('allowed');
  });

  /**
   * The bug this exists to prevent: unlock naively setting "allowed" would
   * silently open a channel that was previously restricted to a role. That is
   * a permission escalation dressed up as a convenience, and nothing else in
   * the system would flag it.
   */
  it('restores the prior state on unlock instead of assuming "allowed"', async () => {
    const channelId = CHANNEL;
    h.channels.sendPermission.set(channelId, 'denied');

    // A channel that was already restricted, then locked, then unlocked.
    await h.deps.moderation.setLock({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      channelId,
      locked: true,
      reason: 'Raid.',
      correlationId,
    });
    await h.deps.moderation.setLock({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      channelId,
      locked: false,
      reason: 'Over.',
      correlationId,
    });

    expect(h.channels.sendPermission.get(channelId)).toBe('denied');
  });

  /**
   * With no lock on record we cannot know what the channel looked like.
   * `inherited` is the safe answer: it removes the explicit deny and lets the
   * category decide, rather than inventing an explicit allow.
   */
  it('falls back to inherited when there is no lock history', async () => {
    const channelId = CHANNEL;

    await h.deps.moderation.setLock({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      channelId,
      locked: false,
      reason: 'Unlock a channel we never locked.',
      correlationId,
    });

    expect(h.channels.sendPermission.get(channelId)).toBe('inherited');
  });

  it('is a no-op when locking an already-locked channel, and says so', async () => {
    const channelId = CHANNEL;
    h.channels.sendPermission.set(channelId, 'denied');

    const outcome = await h.deps.moderation.setLock({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      channelId,
      locked: true,
      reason: 'Again.',
      correlationId,
    });

    expect(outcome.changed).toBe(false);
    expect(outcome.record.metadata['noop']).toBe(true);
  });
});

describe('purge', () => {
  it('reports what was actually deleted, including the 14-day shortfall', async () => {
    const channelId = CHANNEL;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    h.channels.messages = [
      // 18 recent, 12 past Discord's 14-day bulk-delete cutoff.
      ...Array.from({ length: 18 }, () => ({
        authorId: MEMBER,
        createdAt: new Date(now - day),
      })),
      ...Array.from({ length: 12 }, () => ({
        authorId: MEMBER,
        createdAt: new Date(now - 20 * day),
      })),
    ];

    const { result, record } = await h.deps.moderation.purge({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      channelId,
      limit: 30,
      reason: 'Spam wave.',
      correlationId,
    });

    expect(result.requested).toBe(30);
    expect(result.deleted).toBe(18);
    expect(result.skippedTooOld).toBe(12);
    // The honest number reaches the record, not the requested one.
    expect(record.metadata['deleted']).toBe(18);
    expect(record.metadata['skipped_too_old']).toBe(12);
  });
});
