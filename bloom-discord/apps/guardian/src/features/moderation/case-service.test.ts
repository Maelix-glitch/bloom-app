import { beforeEach, describe, expect, it } from 'vitest';
import { BloomError, type CorrelationId } from '@bloom/shared-types';
import { newCorrelationId } from '@bloom/utils';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

/**
 * Reports and cases.
 *
 * Two things are load-bearing here and neither is obvious from the happy path:
 * that a report's description never escapes the reports channel into logs or
 * audit rows, and that a status transition racing another moderator resolves to
 * a describable outcome rather than the last write winning.
 */

let h: GuardianHarness;
let correlationId: CorrelationId;

const REPORTER = TEST_USER_IDS.member;
const ACCUSED = TEST_USER_IDS.newcomer;
const MODERATOR = TEST_USER_IDS.moderator;

const PRIVATE_DETAIL = 'They sent me a photograph of my home address at 3am.';

beforeEach(() => {
  h = guardianHarness();
  correlationId = newCorrelationId();
  h.guild.withMember(REPORTER);
  h.guild.withMember(ACCUSED);
});

function reporter(): ReturnType<typeof testSubject> {
  return testSubject({ userId: REPORTER });
}

function moderator(): ReturnType<typeof testSubject> {
  return testSubject({ userId: MODERATOR, roles: ['moderator'] });
}

async function fileReport(
  overrides: Partial<Parameters<typeof h.deps.cases.submitReport>[0]> = {},
): Promise<Awaited<ReturnType<typeof h.deps.cases.submitReport>>> {
  return h.deps.cases.submitReport({
    guildId: TEST_GUILD_ID,
    reporter: reporter(),
    category: 'member_conduct',
    description: PRIVATE_DETAIL,
    targetUserId: ACCUSED,
    correlationId,
    ...overrides,
  });
}

describe('submitReport', () => {
  it('opens a numbered case and posts it to the staff channel', async () => {
    const result = await fileReport();

    expect(result.caseNumber).toBe(1);
    expect(result.status).toBe('OPEN');
    expect(result.staffNotified).toBe(true);
    expect(h.messaging.sent).toHaveLength(1);
  });

  it('numbers cases sequentially per guild', async () => {
    const first = await fileReport();
    const second = await fileReport();

    expect(first.caseNumber).toBe(1);
    expect(second.caseNumber).toBe(2);
  });

  /**
   * A safety report opened as OPEN sits behind whatever else is in the queue.
   * That ordering is the difference between a fast response and a post-mortem,
   * so the category decides the starting status rather than a moderator
   * noticing.
   */
  it('escalates safety reports immediately', async () => {
    const result = await fileReport({ category: 'user_safety' });
    expect(result.status).toBe('ESCALATED');
  });

  /**
   * The single most consequential privacy rule in the feature. A report
   * description is written by someone describing harassment, and it must reach
   * the private reports channel and nowhere else — not the audit trail, which
   * is read far more widely, and not the logs, which are shipped off-box.
   */
  it('keeps the description out of the audit trail and the logs', async () => {
    await fileReport();

    const audit = await h.repositories.audit.listRecent(TEST_GUILD_ID);
    expect(audit.length).toBeGreaterThan(0); // the assertion below must not be vacuous
    expect(JSON.stringify(audit)).not.toContain('home address');

    expect(h.logs.serialised()).not.toContain('home address');
  });

  it('still records the description where staff can read it', async () => {
    await fileReport();
    expect(JSON.stringify(h.messaging.sent)).toContain('home address');
  });

  /**
   * "Recorded, but nobody was told" is a materially different outcome from
   * "reported". Saying thank-you for a report no one will read is the kind of
   * fake success the brief rules out.
   */
  it('reports honestly when there is no reports channel configured', async () => {
    const h2 = guardianHarness({ reportsChannel: null });
    h2.guild.withMember(REPORTER);
    h2.guild.withMember(ACCUSED);

    const result = await h2.deps.cases.submitReport({
      guildId: TEST_GUILD_ID,
      reporter: reporter(),
      category: 'member_conduct',
      description: PRIVATE_DETAIL,
      targetUserId: ACCUSED,
      correlationId,
    });

    expect(result.staffNotified).toBe(false);
    // Still stored, so staff can find it later.
    expect(result.caseNumber).toBe(1);
  });

  it('refuses a report that names nobody and points at nothing', async () => {
    await expect(
      fileReport({ targetUserId: null, targetMessageId: null }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'));
  });

  it('refuses a one-word description', async () => {
    await expect(fileReport({ description: 'bad' })).rejects.toSatisfy(
      (e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'),
    );
  });

  it('refuses a self-report, which is almost always a mis-click', async () => {
    await expect(fileReport({ targetUserId: REPORTER })).rejects.toSatisfy(
      (e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'),
    );
  });
});

describe('status transitions', () => {
  it('applies a transition and records where it came from', async () => {
    const { caseNumber } = await fileReport();

    const outcome = await h.deps.cases.changeStatus({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      caseNumber,
      to: 'IN_REVIEW',
      correlationId,
    });

    expect(outcome.kind).toBe('applied');
    if (outcome.kind === 'applied') {
      expect(outcome.from).toBe('OPEN');
      expect(outcome.to).toBe('IN_REVIEW');
    }
  });

  /**
   * Two moderators opening the same case and both clicking "in review" is the
   * normal case, not the exotic one. The second must be told it was already
   * done rather than getting an error that suggests something is broken.
   */
  it('distinguishes "already in that state" from a real conflict', async () => {
    const { caseNumber } = await fileReport();
    const change = (to: 'IN_REVIEW'): Promise<{ kind: string }> =>
      h.deps.cases.changeStatus({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        caseNumber,
        to,
        correlationId,
      });

    expect((await change('IN_REVIEW')).kind).toBe('applied');
    expect((await change('IN_REVIEW')).kind).toBe('already_in_state');
  });

  it('reports a missing case rather than throwing', async () => {
    const outcome = await h.deps.cases.changeStatus({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      caseNumber: 999,
      to: 'IN_REVIEW',
      correlationId,
    });

    expect(outcome.kind).toBe('not_found');
  });

  /**
   * A closed case is closed. Allowing a silent reopen would let a case be
   * resolved twice with two different outcomes and no record of which one the
   * team stands behind.
   */
  it('refuses to move a terminal case', async () => {
    const { caseNumber } = await fileReport();
    const move = (to: 'RESOLVED' | 'CLOSED' | 'IN_REVIEW'): Promise<{ kind: string }> =>
      h.deps.cases.changeStatus({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        caseNumber,
        to,
        note: 'Handled.',
        correlationId,
      });

    await move('IN_REVIEW');
    await move('RESOLVED');
    await move('CLOSED');

    expect((await move('IN_REVIEW')).kind).toBe('terminal');
  });

  /**
   * The database has a CHECK constraint requiring a resolution on RESOLVED.
   * Passing the moderator's note through as the resolution is what keeps the
   * command usable — otherwise the constraint surfaces as an opaque database
   * error at the moment someone is trying to close out work.
   */
  it('carries the note through as the resolution', async () => {
    const { caseNumber } = await fileReport();
    await h.deps.cases.changeStatus({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      caseNumber,
      to: 'RESOLVED',
      note: 'Warned and the member apologised.',
      correlationId,
    });

    const detail = await h.deps.cases.detail(TEST_GUILD_ID, caseNumber);
    expect(detail?.case.resolution).toBe('Warned and the member apologised.');
    expect(detail?.case.resolvedAt).not.toBeNull();
  });
});

describe('case history', () => {
  /**
   * The case history is the record of who did what. A note, an assignment and
   * a status change all have to land in it — a gap means an action nobody can
   * account for later.
   */
  it('accumulates every action as an event', async () => {
    const { caseNumber } = await fileReport();

    await h.deps.cases.assign({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      caseNumber,
      assignee: MODERATOR,
      correlationId,
    });
    await h.deps.cases.addNote({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      caseNumber,
      body: 'Spoke to both parties.',
      correlationId,
    });
    await h.deps.cases.changeStatus({
      guildId: TEST_GUILD_ID,
      actor: moderator(),
      caseNumber,
      to: 'IN_REVIEW',
      correlationId,
    });

    const detail = await h.deps.cases.detail(TEST_GUILD_ID, caseNumber);
    const types = detail?.events.map((event) => event.eventType) ?? [];

    expect(types).toContain('assigned');
    expect(types).toContain('note');
    expect(types).toContain('status_changed');
  });

  it('reports a missing case as null rather than an empty case', async () => {
    expect(await h.deps.cases.detail(TEST_GUILD_ID, 404)).toBeNull();
  });

  it('refuses an empty note instead of recording a blank event', async () => {
    const { caseNumber } = await fileReport();
    await expect(
      h.deps.cases.addNote({
        guildId: TEST_GUILD_ID,
        actor: moderator(),
        caseNumber,
        body: '   ',
        correlationId,
      }),
    ).rejects.toSatisfy((e: unknown) => BloomError.isCode(e, 'INVALID_INPUT'));
  });
});

describe('listing', () => {
  it('counts by status so staff can see the queue depth', async () => {
    await fileReport();
    await fileReport({ category: 'user_safety' });

    const counts = await h.deps.cases.counts(TEST_GUILD_ID);
    expect(counts.OPEN).toBe(1);
    expect(counts.ESCALATED).toBe(1);
    expect(counts.CLOSED).toBe(0);
  });

  it('filters by status', async () => {
    await fileReport();
    await fileReport({ category: 'user_safety' });

    const escalated = await h.deps.cases.list(TEST_GUILD_ID, { status: 'ESCALATED' });
    expect(escalated).toHaveLength(1);
    expect(escalated[0]?.status).toBe('ESCALATED');
  });
});
