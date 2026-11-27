import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MANUAL_AWARD_LIMIT,
  POINT_KINDS,
  MANUAL_POINT_KINDS,
  AUTOMATIC_POINT_KINDS,
  isPointKind,
  isManualPointKind,
  type UserId,
} from '@bloom/shared-types';
import type { RecordingResponder } from '@bloom/testing';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import {
  UnconfiguredBloomRewardsPort,
  type BloomRewardsPort,
} from './bloom-rewards-port.js';

/**
 * The staff side of Bloom Rewards, through the real dispatcher.
 *
 * Authorization lives on the contribution, so every test dispatches rather
 * than calling a handler. A test that called `execute` directly would prove
 * the rendering works and nothing at all about who may reach it — which is the
 * whole question for a command that moves points.
 */

const REFUSAL = 'Not available to you';

function expectRefused(responder: RecordingResponder): void {
  expect(responder.visibleText).toContain(REFUSAL);
}

function expectAllowed(responder: RecordingResponder): void {
  expect(responder.visibleText).not.toContain(REFUSAL);
}

let h: CompanionHarness;
const now = new Date('2026-03-12T14:00:00.000Z');

const MEMBER = TEST_USER_IDS.member;
const MODERATOR = TEST_USER_IDS.moderator;
const ADMIN = TEST_USER_IDS.administrator;
const FOUNDER = TEST_USER_IDS.founder;

const asMember = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MEMBER, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MODERATOR, roles: ['moderator'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: ADMIN, roles: ['administrator'] });
const asFounder = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: FOUNDER, roles: ['founder'] });

function user(id: UserId): { id: UserId; username: string; isBot: boolean } {
  return { id, username: `member-${id.slice(-4)}`, isBot: false };
}

/** Options for award/revoke, which share a shape. */
function pointOptions(
  points: number,
  reason: string,
  target: UserId = MEMBER,
): Record<string, unknown> {
  return {
    users: { member: user(target) },
    integers: { points },
    strings: { reason },
  };
}

function admin(
  subcommand: string,
  actor: ReturnType<typeof testSubject>,
  options: Record<string, unknown> = {},
): Parameters<CompanionHarness['dispatch']>[0] {
  return {
    commandName: 'companion',
    subcommandGroup: 'admin',
    subcommand,
    actor,
    options,
  };
}

beforeEach(() => {
  h = companionHarness({ now: () => now });
});

// -----------------------------------------------------------------------------
// Phase A1 — the staff member view
// -----------------------------------------------------------------------------

describe('/companion admin member', () => {
  it('shows an administrator a member’s standing', async () => {
    const { responder } = await h.dispatch(
      admin('member', asAdmin(), { users: { member: user(MEMBER) } }),
    );

    expectAllowed(responder);
    expect(responder.visibleText).toContain('Balance');
    expect(responder.visibleText).toContain('Rank');
    expect(responder.visibleText).toContain('Streak');
    expect(responder.visibleText).toContain('Progression');
  });

  it('shows a founder the same view', async () => {
    const { responder } = await h.dispatch(
      admin('member', asFounder(), { users: { member: user(MEMBER) } }),
    );

    expectAllowed(responder);
  });

  it('refuses an ordinary member', async () => {
    const { responder } = await h.dispatch(
      admin('member', asMember(), { users: { member: user(MODERATOR) } }),
    );

    expectRefused(responder);
  });

  /*
   * Least privilege, deliberately kept. A moderator can time someone out but
   * cannot read their balance: the economy is not a moderation surface, and
   * the staff kernel grants moderators no rewards capability at all.
   */
  it('refuses a moderator — they hold no rewards capability', async () => {
    const { responder } = await h.dispatch(
      admin('member', asModerator(), { users: { member: user(MEMBER) } }),
    );

    expectRefused(responder);
  });

  it('is ephemeral', async () => {
    const { responder } = await h.dispatch(
      admin('member', asAdmin(), { users: { member: user(MEMBER) } }),
    );

    expect(responder.messages.at(-1)?.ephemeral).toBe(true);
  });

  it('reflects real ledger activity rather than a placeholder', async () => {
    await h.dispatch(admin('award', asAdmin(), pointOptions(60, 'hosted the call')));

    const { responder } = await h.dispatch(
      admin('member', asAdmin(), { users: { member: user(MEMBER) } }),
    );

    expect(responder.visibleText).toContain('60');
    expect(responder.visibleText).toContain('Staff award');
  });

  it('says plainly when rewards are switched off', async () => {
    const off = companionHarness({ now: () => now, rewards: false });

    const { responder } = await off.dispatch(
      admin('member', asAdmin(), { users: { member: user(MEMBER) } }),
    );

    expect(responder.visibleText).toContain('OFF');
  });

  /* Phase B: progression is read through AwardsService, not reinvented. */
  it('reports milestone and achievement progress', async () => {
    const { responder } = await h.dispatch(
      admin('member', asAdmin(), { users: { member: user(MEMBER) } }),
    );

    expect(responder.visibleText).toMatch(/Milestones\*\* \d+ of \d+/);
    expect(responder.visibleText).toMatch(/Achievements\*\* \d+ of \d+/);
  });
});

// -----------------------------------------------------------------------------
// Phase A2 — award
// -----------------------------------------------------------------------------

describe('/companion admin award', () => {
  it('lets an administrator award points', async () => {
    const { responder } = await h.dispatch(
      admin('award', asAdmin(), pointOptions(40, 'ran the welcome thread')),
    );

    expectAllowed(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(40);
    expect(h.repositories.rewards.events.at(-1)?.kind).toBe('manual_award');
  });

  it('lets a founder award points', async () => {
    const { responder } = await h.dispatch(
      admin('award', asFounder(), pointOptions(25, 'helped a newcomer')),
    );

    expectAllowed(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(25);
  });

  it('refuses a moderator', async () => {
    const { responder } = await h.dispatch(
      admin('award', asModerator(), pointOptions(40, 'felt generous')),
    );

    expectRefused(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(0);
  });

  it('refuses an ordinary member', async () => {
    const { responder } = await h.dispatch(
      admin('award', asMember(), pointOptions(40, 'for me')),
    );

    expectRefused(responder);
    expect(h.repositories.rewards.events).toHaveLength(0);
  });

  it('rejects an empty reason', async () => {
    const { responder } = await h.dispatch(
      admin('award', asAdmin(), pointOptions(40, '   ')),
    );

    expect(responder.visibleText).toContain('Give a reason');
    expect(h.repositories.rewards.events).toHaveLength(0);
  });

  it('rejects zero and negative amounts — removal is its own command', async () => {
    for (const points of [0, -40]) {
      const { responder } = await h.dispatch(
        admin('award', asAdmin(), pointOptions(points, 'wrong direction')),
      );
      expect(responder.visibleText).toContain('positive');
    }

    expect(h.repositories.rewards.events).toHaveLength(0);
  });

  it('refuses an amount beyond the single-adjustment cap', async () => {
    const { responder } = await h.dispatch(
      admin('award', asAdmin(), pointOptions(MANUAL_AWARD_LIMIT + 1, 'mistyped zero')),
    );

    expect(responder.visibleText).toContain('capped');
    expect(h.repositories.rewards.events).toHaveLength(0);
  });

  /*
   * Discord retries interactions. The ledger's idempotency key is built from
   * the interaction id, so a retry must land as one row, not two.
   */
  it('is idempotent across a repeated interaction', async () => {
    const options = pointOptions(40, 'ran the welcome thread');
    const first = await h.dispatch(admin('award', asAdmin(), options));
    const interactionId = first.invocation.interactionId;

    await h.dispatch({
      ...admin('award', asAdmin(), options),
      interactionId,
    });

    expect(h.repositories.rewards.events).toHaveLength(1);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(40);
  });

  it('writes an audit row at warn severity with the actor, target and amount', async () => {
    await h.dispatch(
      admin('award', asAdmin(), pointOptions(40, 'ran the welcome thread')),
    );

    const events = await h.repositories.audit.listRecent(TEST_GUILD_ID, 20);
    const row = events.find((event) => event.event === 'rewards.manual_award');

    expect(row).toBeDefined();
    expect(row?.severity).toBe('warn');
    expect(row?.actorId).toBe(ADMIN);
    expect(row?.targetId).toBe(MEMBER);
    expect(row?.details['points']).toBe(40);
    expect(row?.details['reason']).toBe('ran the welcome thread');
  });

  it('writes no audit row and no ledger row when refused', async () => {
    await h.dispatch(admin('award', asModerator(), pointOptions(40, 'felt generous')));

    const events = await h.repositories.audit.listRecent(TEST_GUILD_ID, 20);
    expect(events.filter((event) => event.event.startsWith('rewards.'))).toHaveLength(0);
    expect(h.repositories.rewards.events).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// Phase A3 — revoke
// -----------------------------------------------------------------------------

describe('/companion admin revoke', () => {
  async function give(points: number): Promise<void> {
    await h.dispatch(admin('award', asAdmin(), pointOptions(points, 'setup')));
  }

  it('lets an administrator remove points, as an adjustment', async () => {
    await give(100);

    const { responder } = await h.dispatch(
      admin('revoke', asAdmin(), pointOptions(40, 'awarded twice by mistake')),
    );

    expectAllowed(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(60);
    expect(h.repositories.rewards.events.at(-1)?.kind).toBe('adjustment');
    expect(h.repositories.rewards.events.at(-1)?.points).toBe(-40);
  });

  it('lets a founder remove points', async () => {
    await give(100);

    const { responder } = await h.dispatch(
      admin('revoke', asFounder(), pointOptions(10, 'duplicate award')),
    );

    expectAllowed(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(90);
  });

  it('refuses a moderator', async () => {
    await give(100);

    const { responder } = await h.dispatch(
      admin('revoke', asModerator(), pointOptions(40, 'disagreed with them')),
    );

    expectRefused(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(100);
  });

  it('refuses an ordinary member', async () => {
    await give(100);

    const { responder } = await h.dispatch(
      admin('revoke', asMember(), pointOptions(40, 'no')),
    );

    expectRefused(responder);
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(100);
  });

  it('requires a reason', async () => {
    await give(100);

    const { responder } = await h.dispatch(
      admin('revoke', asAdmin(), pointOptions(40, '')),
    );

    expect(responder.visibleText).toContain('Give a reason');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(100);
  });

  it('takes a positive amount, not a negative one', async () => {
    await give(100);

    const { responder } = await h.dispatch(
      admin('revoke', asAdmin(), pointOptions(-40, 'double negative')),
    );

    expect(responder.visibleText).toContain('positive');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(100);
  });

  /* The service's rule, not a new one invented in the handler. */
  it('refuses to take a balance below zero', async () => {
    await give(10);

    const { responder } = await h.dispatch(
      admin('revoke', asAdmin(), pointOptions(40, 'more than they have')),
    );

    expect(responder.visibleText).toContain('below zero');
    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(10);
  });

  it('is idempotent across a repeated interaction', async () => {
    await give(100);
    const options = pointOptions(40, 'awarded twice by mistake');

    const first = await h.dispatch(admin('revoke', asAdmin(), options));
    await h.dispatch({
      ...admin('revoke', asAdmin(), options),
      interactionId: first.invocation.interactionId,
    });

    expect(await h.repositories.rewards.balance(TEST_GUILD_ID, MEMBER)).toBe(60);
  });

  it('audits the removal at warn severity', async () => {
    await give(100);
    await h.dispatch(admin('revoke', asAdmin(), pointOptions(40, 'awarded twice')));

    const events = await h.repositories.audit.listRecent(TEST_GUILD_ID, 20);
    const row = events.find((event) => event.event === 'rewards.adjustment');

    expect(row).toBeDefined();
    expect(row?.severity).toBe('warn');
    expect(row?.actorId).toBe(ADMIN);
    expect(row?.targetId).toBe(MEMBER);
    expect(row?.details['points']).toBe(-40);
  });
});

// -----------------------------------------------------------------------------
// Phase A4 — leaderboard
// -----------------------------------------------------------------------------

describe('/companion admin leaderboard', () => {
  async function seedBoard(count: number): Promise<void> {
    for (let index = 0; index < count; index += 1) {
      const target = `90000000000001${String(index).padStart(3, '0')}` as UserId;
      await h.dispatch(
        admin('award', asAdmin(), pointOptions((index + 1) * 10, 'seed', target)),
      );
    }
  }

  it('shows the board to an administrator', async () => {
    await seedBoard(3);

    const { responder } = await h.dispatch(admin('leaderboard', asAdmin()));

    expectAllowed(responder);
    expect(responder.visibleText).toContain('points');
    expect(responder.visibleText).toContain('events');
  });

  it('refuses a moderator and an ordinary member', async () => {
    for (const actor of [asModerator(), asMember()]) {
      const { responder } = await h.dispatch(admin('leaderboard', actor));
      expectRefused(responder);
    }
  });

  it('has a useful empty state', async () => {
    const { responder } = await h.dispatch(admin('leaderboard', asAdmin()));

    expect(responder.visibleText).toContain('No points have been earned');
  });

  /* Bounded: the board is never "everyone". */
  it('shows at most the requested bound', async () => {
    await seedBoard(14);

    const ten = await h.dispatch(
      admin('leaderboard', asAdmin(), { integers: { limit: 10 } }),
    );
    expect(ten.responder.visibleText.match(/points · /g)).toHaveLength(10);

    const twentyFive = await h.dispatch(
      admin('leaderboard', asAdmin(), { integers: { limit: 25 } }),
    );
    expect(twentyFive.responder.visibleText.match(/points · /g)).toHaveLength(14);
  });

  it('defaults to ten and ignores an out-of-range limit', async () => {
    await seedBoard(14);

    const fallback = await h.dispatch(
      admin('leaderboard', asAdmin(), { integers: { limit: 10_000 } }),
    );

    expect(fallback.responder.visibleText.match(/points · /g)).toHaveLength(10);
  });

  it('orders deterministically, highest first', async () => {
    await seedBoard(4);

    const reads = await Promise.all([
      h.dispatch(admin('leaderboard', asAdmin())),
      h.dispatch(admin('leaderboard', asAdmin())),
      h.dispatch(admin('leaderboard', asAdmin())),
    ]);
    const orders = reads.map((read) => read.responder.visibleText);

    expect(new Set(orders).size).toBe(1);
    const points = [...(orders[0] ?? '').matchAll(/· (\d+) points/g)].map((match) =>
      Number(match[1]),
    );
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });
});

// -----------------------------------------------------------------------------
// Phase D — the ledger vocabulary
// -----------------------------------------------------------------------------

describe('point event kinds', () => {
  /**
   * The vocabulary is pinned by name and order.
   *
   * Both matter. The names are mirrored by a CHECK constraint in migrations
   * 0006 and 0009, so a rename on one side is a runtime insert failure on the
   * other; the order is pinned because this list is read by humans comparing
   * it to the migration.
   */
  it('is the closed set the migrations allow', () => {
    expect([...POINT_KINDS]).toEqual([
      'check_in',
      'small_win',
      'manual_award',
      'adjustment',
      'referral',
      'event_completion',
      'challenge_completion',
      'achievement_reward',
    ]);
  });

  it('recognises its own members and nothing else', () => {
    for (const kind of POINT_KINDS) expect(isPointKind(kind)).toBe(true);
    for (const invented of ['bonus_event', 'points', '', 'CHECK_IN']) {
      expect(isPointKind(invented)).toBe(false);
    }
  });

  /*
   * Mirrors `point_events_actor_matches_kind`. Exactly these two carry an
   * actor; every other kind must not, which is what stops a hand-made grant
   * being laundered through a system kind.
   */
  it('keeps exactly two manual kinds, and the rest automatic', () => {
    expect([...MANUAL_POINT_KINDS]).toEqual(['manual_award', 'adjustment']);
    expect(isManualPointKind('manual_award')).toBe(true);
    expect(isManualPointKind('referral')).toBe(false);

    expect([...AUTOMATIC_POINT_KINDS]).toEqual([
      'check_in',
      'small_win',
      'referral',
      'event_completion',
      'challenge_completion',
      'achievement_reward',
    ]);
    expect(
      AUTOMATIC_POINT_KINDS.filter((kind) =>
        (MANUAL_POINT_KINDS as readonly string[]).includes(kind),
      ),
    ).toEqual([]);
  });

  /* Reserved, not live: an unpriced kind cannot be awarded by accident. */
  it('prices none of the reserved kinds', async () => {
    const { POINT_AWARDS } = await import('@bloom/shared-types');
    expect(Object.keys(POINT_AWARDS).sort()).toEqual(['check_in', 'small_win']);
  });
});

// -----------------------------------------------------------------------------
// Phase E — the integration boundary
// -----------------------------------------------------------------------------

describe('BloomRewardsPort', () => {
  it('is honest that nothing is connected', async () => {
    const port: BloomRewardsPort = new UnconfiguredBloomRewardsPort();

    const recorded = await port.recordRewardEvent({
      guildId: TEST_GUILD_ID,
      userId: MEMBER,
      kind: 'check_in',
      points: 5,
      idempotencyKey: 'check_in:1:2:2026-03-12',
      occurredAt: now,
      correlationId: '11111111-1111-4111-8111-111111111111' as never,
    });
    const summary = await port.getMemberRewardSummary(TEST_GUILD_ID, MEMBER);
    const reconciled = await port.reconcileRewardEvent('check_in:1:2:2026-03-12');

    for (const result of [recorded, summary, reconciled]) {
      expect(result.kind).toBe('unavailable');
    }
    expect(recorded.kind === 'unavailable' && recorded.reason).toContain(
      'not configured',
    );
  });

  /*
   * The port must not become a back door into the ledger. It can report what
   * already happened and read a summary; it cannot set a balance or add
   * points, and the absence is checked in the source because an interface
   * grows by someone adding one convenient method.
   */
  it('offers no mutation path into the economy', () => {
    const source = readFileSync(
      join(import.meta.dirname, 'bloom-rewards-port.ts'),
      'utf8',
    );

    for (const forbidden of [
      'setBalance',
      'addPoints',
      'adjustBalance',
      'grantPoints',
      'writeBalance',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  /* No transport, no credentials, no product schema — by inspection. */
  it('names no external transport or credential', () => {
    const source = readFileSync(
      join(import.meta.dirname, 'bloom-rewards-port.ts'),
      'utf8',
    );

    for (const forbidden of [
      'supabase',
      'SUPABASE',
      'service_role',
      'apiKey',
      'fetch(',
      'process.env',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

// -----------------------------------------------------------------------------
// Architectural guards
// -----------------------------------------------------------------------------

describe('the staff reward surface stays inside Companion', () => {
  const dir = import.meta.dirname;
  const sources = readdirSync(dir)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

  it('has the sources it expects to check', () => {
    expect(sources.map((file) => file.name).sort()).toEqual([
      'bloom-rewards-port.ts',
      'commands.ts',
      'messages.ts',
      'referral-consumer.ts',
      'referral-job.ts',
      'service.ts',
      'staff-commands.ts',
      'staff-messages.ts',
    ]);
  });

  it('imports nothing from Guardian or Labs', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/from\s+'[^']*(?:guardian|labs)[^']*'/i);
      expect(file.text).not.toMatch(
        /\brepositories\.(cases|moderation|onboarding|identity)\b/,
      );
    }
  });

  /*
   * The point of the whole phase: staff commands are a surface over
   * `RewardsService`, not a second implementation of it. A handler reaching
   * the rewards repository directly would be the first step to a second
   * ledger with its own idea of what a balance is.
   */
  it('never touches the rewards repository directly from a command handler', () => {
    const staff = sources.find((file) => file.name === 'staff-commands.ts');

    expect(staff?.text).not.toMatch(/repositories\.rewards\./);
    expect(staff?.text).not.toMatch(/repositories\.awards\./);
    expect(staff?.text).toContain('deps.rewards.manualAward');
  });

  it('has exactly one balance-mutating call, shared by award and revoke', () => {
    const staff = sources.find((file) => file.name === 'staff-commands.ts')?.text ?? '';
    const mutations = [...staff.matchAll(/deps\.rewards\.manualAward\(/g)];

    expect(mutations).toHaveLength(1);
  });
});
