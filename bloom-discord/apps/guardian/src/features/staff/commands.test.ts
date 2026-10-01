import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import type { RecordingResponder } from '@bloom/testing';
import { newCorrelationId } from '@bloom/utils';
import { TEST_GUILD_ID, TEST_ROLE_IDS, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

/**
 * The staff console, through the real dispatcher.
 *
 * Every test here dispatches rather than calling a handler, because the
 * capability policy lives on the contribution and the dispatcher is what
 * evaluates it. Calling `execute` directly would prove the rendering works and
 * nothing at all about who may reach it.
 */

const REFUSAL = 'Not available to you';

function expectRefused(responder: RecordingResponder): void {
  expect(responder.visibleText).toContain(REFUSAL);
}

function expectAllowed(responder: RecordingResponder): void {
  expect(responder.visibleText).not.toContain(REFUSAL);
}

function user(
  id: UserId,
  isBot = false,
): { id: UserId; username: string; isBot: boolean } {
  return { id, username: `member-${id.slice(-4)}`, isBot };
}

let h: GuardianHarness;

const MEMBER = TEST_USER_IDS.member;
const MODERATOR = TEST_USER_IDS.moderator;
const ADMIN = TEST_USER_IDS.administrator;
const FOUNDER = TEST_USER_IDS.founder;
const BETA = TEST_USER_IDS.betaTester;

beforeEach(() => {
  reporterSeq = 0;
  h = guardianHarness();
  h.guild.withMember(MEMBER);
  h.guild.withMember(MODERATOR, { roleIds: [TEST_ROLE_IDS.moderator] });
  h.guild.withMember(ADMIN, { roleIds: [TEST_ROLE_IDS.administrator] });
  h.guild.withMember(FOUNDER, { roleIds: [TEST_ROLE_IDS.founder] });
  h.guild.withMember(BETA, { roleIds: [TEST_ROLE_IDS.betaTester] });
});

const asMember = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MEMBER, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MODERATOR, roles: ['moderator'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: ADMIN, roles: ['administrator'] });
const asFounder = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: FOUNDER, roles: ['founder'] });
const asBetaTester = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: BETA, roles: ['betaTester'] });

const staff = (
  subcommand: string,
  actor: ReturnType<typeof testSubject>,
  options: Record<string, unknown> = {},
): Parameters<GuardianHarness['dispatch']>[0] => ({
  commandName: 'guardian',
  subcommandGroup: 'staff',
  subcommand,
  actor,
  options,
});

/**
 * File a report the way a member actually does — through `/report` — so the
 * fixture exercises the real path rather than a hand-built row that could
 * drift from it.
 */
let reporterSeq = 0;

function nextReporter(): UserId {
  reporterSeq += 1;
  return unsafeSnowflake<UserId>(String(900000000000002000 + reporterSeq));
}

/**
 * File a report through the real `CaseService`.
 *
 * Deliberately the service rather than `/report`: the command is rate limited
 * per guild, so a fixture needing two reports would have the second one
 * swallowed by the limiter and the test would silently assert nothing. Going
 * one layer in keeps the limiter intact for the tests that mean to exercise it
 * while still writing cases the way production writes them.
 */
async function seedReport(
  options: { readonly target?: UserId; readonly description?: string } = {},
): Promise<number> {
  const result = await h.deps.cases.submitReport({
    guildId: TEST_GUILD_ID,
    reporter: testSubject({ userId: nextReporter(), roles: [] }),
    category: 'member_conduct',
    description: options.description ?? 'A private account of what happened here.',
    targetUserId: options.target ?? MEMBER,
    targetChannelId: null,
    targetMessageId: null,
    correlationId: newCorrelationId(),
  });

  return result.caseNumber;
}

// -----------------------------------------------------------------------------
// /guardian staff member
// -----------------------------------------------------------------------------

describe('/guardian staff member', () => {
  it('lets a moderator look a member up', async () => {
    const { responder } = await h.dispatch(
      staff('member', asModerator(), { users: { user: user(MEMBER) } }),
    );

    expectAllowed(responder);
    expect(responder.visibleText).toContain(MEMBER);
  });

  it('lets an administrator and a founder look a member up', async () => {
    for (const actor of [asAdmin(), asFounder()]) {
      const { responder } = await h.dispatch(
        staff('member', actor, { users: { user: user(MEMBER) } }),
      );
      expectAllowed(responder);
    }
  });

  it('refuses an ordinary member', async () => {
    const { responder } = await h.dispatch(
      staff('member', asMember(), { users: { user: user(MODERATOR) } }),
    );

    expectRefused(responder);
  });

  it('refuses a Beta Tester — testing access is not staff power', async () => {
    const { responder } = await h.dispatch(
      staff('member', asBetaTester(), { users: { user: user(MEMBER) } }),
    );

    expectRefused(responder);
  });

  it('shows the moderation record and case counts', async () => {
    await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: { users: { member: user(MEMBER) }, strings: { reason: 'Off-topic.' } },
    });

    const { responder } = await h.dispatch(
      staff('member', asModerator(), { users: { user: user(MEMBER) } }),
    );

    expect(responder.visibleText).toContain('Active warnings');
    expect(responder.visibleText).toContain('Cases');
    expect(responder.visibleText).toContain('Onboarding');
  });

  it('is ephemeral, like every staff surface', async () => {
    const { responder } = await h.dispatch(
      staff('member', asModerator(), { users: { user: user(MEMBER) } }),
    );

    expect(responder.messages.at(-1)?.ephemeral).toBe(true);
  });

  /*
   * The read model is Guardian-only by construction. If someone later reaches
   * for Companion's economy here, the deps object will not have it — but the
   * profile also states the absence explicitly so a reviewer sees the boundary
   * rather than assuming the data was forgotten.
   */
  it('says plainly that rewards are not read here', async () => {
    const { responder } = await h.dispatch(
      staff('member', asModerator(), { users: { user: user(MEMBER) } }),
    );

    expect(responder.visibleText.toLowerCase()).toContain('companion');
  });
});

// -----------------------------------------------------------------------------
// /guardian staff reports
// -----------------------------------------------------------------------------

describe('/guardian staff reports', () => {
  it('lists waiting reports for a moderator', async () => {
    const number = await seedReport({ target: MEMBER });

    const { responder } = await h.dispatch(staff('reports', asModerator()));

    expectAllowed(responder);
    expect(responder.visibleText).toContain(`#${String(number)}`);
  });

  it('refuses an ordinary member', async () => {
    await seedReport();
    const { responder } = await h.dispatch(staff('reports', asMember()));

    expectRefused(responder);
  });

  /*
   * The queue must not carry report text. This is enforced by the row type —
   * `ReportSummaryRow` has no description field — and asserted here because it
   * is the kind of guarantee that quietly regresses when someone "improves"
   * the view.
   */
  it('never shows report text in the queue', async () => {
    await seedReport({ description: 'SECRETACCOUNTOFEVENTS' });

    const { responder } = await h.dispatch(staff('reports', asModerator()));

    expect(responder.visibleText).not.toContain('SECRETACCOUNTOFEVENTS');
  });

  it('has a useful empty state', async () => {
    const { responder } = await h.dispatch(staff('reports', asModerator()));

    expect(responder.visibleText.toLowerCase()).toContain('no reports');
  });
});

// -----------------------------------------------------------------------------
// /guardian staff report
// -----------------------------------------------------------------------------

describe('/guardian staff report', () => {
  it('shows the full report to a moderator', async () => {
    const number = await seedReport({ description: 'SECRETACCOUNTOFEVENTS' });

    const { responder } = await h.dispatch(
      staff('report', asModerator(), { integers: { number } }),
    );

    expectAllowed(responder);
    expect(responder.visibleText).toContain('SECRETACCOUNTOFEVENTS');
    expect(responder.messages.at(-1)?.ephemeral).toBe(true);
  });

  it('refuses an ordinary member', async () => {
    const number = await seedReport({ description: 'SECRETACCOUNTOFEVENTS' });

    const { responder } = await h.dispatch(
      staff('report', asMember(), { integers: { number } }),
    );

    expectRefused(responder);
    expect(responder.visibleText).not.toContain('SECRETACCOUNTOFEVENTS');
  });

  it('handles a case number that does not exist', async () => {
    const { responder } = await h.dispatch(
      staff('report', asModerator(), { integers: { number: 4040 } }),
    );

    expect(responder.visibleText).toContain('4040');
    expect(responder.visibleText.toLowerCase()).toContain('no report');
  });

  it('handles a case with no report attached', async () => {
    const opened = await h.deps.cases.openCase({
      guildId: TEST_GUILD_ID,
      actor: asModerator(),
      summary: 'Opened by hand, no report.',
      subjectId: null,
      correlationId: '11111111-1111-4111-8111-111111111111' as never,
    });

    const { responder } = await h.dispatch(
      staff('report', asModerator(), { integers: { number: opened.caseNumber } }),
    );

    expect(responder.visibleText.toLowerCase()).toContain('no report');
  });

  /*
   * Reading private text is itself an event worth recording: "who saw this"
   * is asked during appeals, and the only honest answer comes from having
   * written it down at the time.
   */
  it('records the view in the audit trail, without the text', async () => {
    const number = await seedReport({ description: 'SECRETACCOUNTOFEVENTS' });

    await h.dispatch(staff('report', asModerator(), { integers: { number } }));

    const events = await h.repositories.audit.listRecent(TEST_GUILD_ID, 50);
    const viewed = events.find((event) => event.event === 'staff.report.viewed');

    expect(viewed).toBeDefined();
    expect(viewed?.actorId).toBe(MODERATOR);
    expect(JSON.stringify(viewed?.details)).not.toContain('SECRETACCOUNTOFEVENTS');
    expect(viewed?.details['case_number']).toBe(number);
  });

  it('writes no audit row when the reader was refused', async () => {
    const number = await seedReport();

    await h.dispatch(staff('report', asMember(), { integers: { number } }));

    const events = await h.repositories.audit.listRecent(TEST_GUILD_ID, 50);
    expect(events.filter((event) => event.event === 'staff.report.viewed')).toHaveLength(
      0,
    );
  });
});

// -----------------------------------------------------------------------------
// /guardian staff audit
// -----------------------------------------------------------------------------

describe('/guardian staff audit', () => {
  it('shows recent events to a moderator', async () => {
    await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: { users: { member: user(MEMBER) }, strings: { reason: 'Off-topic.' } },
    });

    const { responder } = await h.dispatch(staff('audit', asModerator()));

    expectAllowed(responder);
    expect(responder.visibleText).toContain('moderation.warn');
  });

  it('filters to one member when asked', async () => {
    await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: { users: { member: user(MEMBER) }, strings: { reason: 'Off-topic.' } },
    });

    const { responder } = await h.dispatch(
      staff('audit', asAdmin(), { users: { member: user(MEMBER) } }),
    );

    expectAllowed(responder);
    expect(responder.visibleText).toContain('member');
  });

  it('refuses an ordinary member', async () => {
    const { responder } = await h.dispatch(staff('audit', asMember()));

    expectRefused(responder);
  });

  it('has a useful empty state', async () => {
    const { responder } = await h.dispatch(staff('audit', asFounder()));

    expect(responder.visibleText.toLowerCase()).toContain('no audit events');
  });
});

// -----------------------------------------------------------------------------
// Guild scoping
// -----------------------------------------------------------------------------

describe('guild scoping', () => {
  /*
   * A subject whose guild is not the configured one must fail, and must fail
   * before any capability is granted. The staff kernel checks the guild itself
   * for exactly this reason, so the refusal holds even though the namespace
   * policy would also catch it.
   */
  it('refuses a founder arriving from another guild', async () => {
    const elsewhere: GuildId = unsafeSnowflake<GuildId>('900000000000000999');

    const { responder } = await h.dispatch(
      staff(
        'member',
        { ...asFounder(), guildId: elsewhere },
        {
          users: { user: user(MEMBER) },
        },
      ),
    );

    // `requireConfiguredGuild` runs first and refuses on the guild alone, so
    // the staff capability check never has the chance to grant anything.
    expect(responder.visibleText).toContain('only available in the Bloom Labs server');
  });
});

// -----------------------------------------------------------------------------
// The re-gated case and member commands
// -----------------------------------------------------------------------------

describe('existing case commands, now on the staff kernel', () => {
  it('still lets a moderator view and list cases', async () => {
    const number = await seedReport();

    for (const [subcommand, options] of [
      ['view', { integers: { number } }],
      ['list', {}],
    ] as const) {
      const { responder } = await h.dispatch({
        commandName: 'guardian',
        subcommandGroup: 'case',
        subcommand,
        actor: asModerator(),
        options,
      });
      expectAllowed(responder);
    }
  });

  it('still refuses an ordinary member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'list',
      actor: asMember(),
      options: {},
    });

    expectRefused(responder);
  });

  it('refuses assigning a case to someone who is not staff', async () => {
    const number = await seedReport();

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'assign',
      actor: asAdmin(),
      options: { integers: { number }, users: { member: user(MEMBER) } },
    });

    expect(responder.visibleText.toLowerCase()).toContain('staff team');

    const row = await h.repositories.cases.findByNumber(TEST_GUILD_ID, number);
    expect(row?.assignedTo).toBeNull();
  });

  it('allows assigning a case to a moderator', async () => {
    const number = await seedReport();

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'assign',
      actor: asAdmin(),
      options: { integers: { number }, users: { member: user(MODERATOR) } },
    });

    expectAllowed(responder);
    const row = await h.repositories.cases.findByNumber(TEST_GUILD_ID, number);
    expect(row?.assignedTo).toBe(MODERATOR);
  });

  it('still allows unassigning', async () => {
    const number = await seedReport();
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'assign',
      actor: asAdmin(),
      options: { integers: { number }, users: { member: user(MODERATOR) } },
    });

    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'assign',
      actor: asAdmin(),
      options: { integers: { number } },
    });

    const row = await h.repositories.cases.findByNumber(TEST_GUILD_ID, number);
    expect(row?.assignedTo).toBeNull();
  });

  it('refuses an invalid status transition and keeps the case where it was', async () => {
    const number = await seedReport();
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'status',
      actor: asModerator(),
      options: { integers: { number }, strings: { to: 'CLOSED' } },
    });

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'status',
      actor: asModerator(),
      options: {
        integers: { number },
        strings: { to: 'RESOLVED', note: 'Trying to resolve a closed case.' },
      },
    });

    expect(responder.visibleText.toLowerCase()).toContain('closed');
    const row = await h.repositories.cases.findByNumber(TEST_GUILD_ID, number);
    expect(row?.status).toBe('CLOSED');
  });

  it('audits who resolved a case', async () => {
    const number = await seedReport();

    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'status',
      actor: asModerator(),
      options: {
        integers: { number },
        strings: { to: 'RESOLVED', note: 'Spoke to both sides; settled.' },
      },
    });

    const events = await h.repositories.audit.listRecent(TEST_GUILD_ID, 50);
    const resolved = events.find(
      (event) => event.event === 'moderation.case_status_changed',
    );

    expect(resolved).toBeDefined();
    expect(resolved?.actorId).toBe(MODERATOR);
  });

  it('reports a missing case rather than throwing', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'view',
      actor: asModerator(),
      options: { integers: { number: 909 } },
    });

    expect(responder.visibleText.toLowerCase()).toContain('no case');
  });
});

// -----------------------------------------------------------------------------
// Destructive actions keep every existing guard
// -----------------------------------------------------------------------------

describe('existing protections are untouched', () => {
  it('still refuses a moderator targeting another staff member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'warn',
      actor: asModerator(),
      options: { users: { member: user(ADMIN) }, strings: { reason: 'Disagreement.' } },
    });

    expect(responder.visibleText).not.toContain('Warned');
    const history = await h.repositories.moderation.listForSubject(TEST_GUILD_ID, ADMIN);
    expect(history).toHaveLength(0);
  });

  it('still keeps /ban above the moderator line', async () => {
    const { responder } = await h.dispatch({
      commandName: 'ban',
      actor: asModerator(),
      options: { users: { member: user(MEMBER) }, strings: { reason: 'Enough.' } },
    });

    expectRefused(responder);
    expect(h.moderation.calls).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// The report read model
// -----------------------------------------------------------------------------

describe('the report list read model', () => {
  /*
   * The strongest version of "the queue cannot leak report text" is that the
   * row type has nowhere to put it. Asserted at runtime too, because a future
   * `SELECT r.*` would satisfy the compiler and quietly widen the result.
   */
  it('returns rows that carry no report text at all', async () => {
    await seedReport({ description: 'SECRETACCOUNTOFEVENTS' });

    const rows = await h.repositories.cases.listReports(TEST_GUILD_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('description');
    expect(JSON.stringify(rows)).not.toContain('SECRETACCOUNTOFEVENTS');
  });

  it('shows only cases still wanting attention', async () => {
    const first = await seedReport();
    await seedReport();

    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'status',
      actor: asModerator(),
      options: {
        integers: { number: first },
        strings: { to: 'RESOLVED', note: 'Handled and explained.' },
      },
    });

    const active = await h.repositories.cases.listReports(TEST_GUILD_ID);
    expect(active.map((row) => row.caseNumber)).not.toContain(first);

    const resolved = await h.repositories.cases.listReports(TEST_GUILD_ID, {
      status: 'RESOLVED',
    });
    expect(resolved.map((row) => row.caseNumber)).toContain(first);
  });

  it('puts escalated reports first', async () => {
    const ordinary = await seedReport();
    const urgent = await seedReport();

    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'status',
      actor: asModerator(),
      options: { integers: { number: urgent }, strings: { to: 'ESCALATED' } },
    });

    const rows = await h.repositories.cases.listReports(TEST_GUILD_ID);
    expect(rows.map((row) => row.caseNumber)).toEqual([urgent, ordinary]);
  });

  /* A case opened by hand has no report, so it is not a report. */
  it('ignores cases with no report attached', async () => {
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'open',
      actor: asModerator(),
      options: { strings: { summary: 'Noticed a pattern myself.' } },
    });

    expect(await h.repositories.cases.listReports(TEST_GUILD_ID)).toHaveLength(0);
  });

  /*
   * Limit boundaries, in the fake. The same boundaries are asserted against
   * real SQL in `cases.integration.test.ts`; both exist because the fake is
   * what every unit test reads through, and a fake that clamps differently
   * from the database is a lie that only surfaces in production.
   */
  it('clamps a limit of zero or less up to one', async () => {
    await seedReport();
    await seedReport();

    expect(
      await h.repositories.cases.listReports(TEST_GUILD_ID, { limit: 0 }),
    ).toHaveLength(1);
    expect(
      await h.repositories.cases.listReports(TEST_GUILD_ID, { limit: -5 }),
    ).toHaveLength(1);
  });

  it('defaults to a bounded page rather than everything', async () => {
    for (let index = 0; index < 22; index += 1) await seedReport();

    expect(await h.repositories.cases.listReports(TEST_GUILD_ID)).toHaveLength(20);
  });

  it('refuses to return more than the ceiling, however much is asked for', async () => {
    for (let index = 0; index < 105; index += 1) await seedReport();

    expect(
      await h.repositories.cases.listReports(TEST_GUILD_ID, { limit: 10_000 }),
    ).toHaveLength(100);
  });

  it('returns an empty list, not a null, when nothing is waiting', async () => {
    expect(await h.repositories.cases.listReports(TEST_GUILD_ID)).toEqual([]);
    expect(
      await h.repositories.cases.listReports(TEST_GUILD_ID, { status: 'CLOSED' }),
    ).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// /guardian case list — assignment filters
// -----------------------------------------------------------------------------

describe('/guardian case list, by assignment', () => {
  async function listWith(assignment?: string): Promise<string> {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'list',
      actor: asModerator(),
      options: assignment === undefined ? {} : { strings: { assignment } },
    });
    return responder.visibleText;
  }

  beforeEach(async () => {
    const assigned = await seedReport();
    await seedReport(); // left unassigned
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'assign',
      actor: asAdmin(),
      options: { integers: { number: assigned }, users: { member: user(MODERATOR) } },
    });
  });

  it('shows everything when no filter is given', async () => {
    const text = await listWith();
    expect(text).toContain('#1');
    expect(text).toContain('#2');
  });

  /*
   * The case `assignedTo: null` cannot express: "nobody owns this". It is the
   * question triage is actually made of, which is why it got its own filter
   * rather than an overloaded field.
   */
  it('finds the cases nobody owns', async () => {
    const text = await listWith('unassigned');
    expect(text).toContain('#2');
    expect(text).not.toContain('#1');
  });

  it('finds the cases someone owns', async () => {
    const text = await listWith('assigned');
    expect(text).toContain('#1');
    expect(text).not.toContain('#2');
  });

  it('resolves "mine" against the caller, not a user option', async () => {
    expect(await listWith('mine')).toContain('#1');

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'list',
      actor: asAdmin(),
      options: { strings: { assignment: 'mine' } },
    });
    expect(responder.visibleText).not.toContain('#1');
  });
});

// -----------------------------------------------------------------------------
// Boundaries
// -----------------------------------------------------------------------------

describe('the staff console stays inside Guardian', () => {
  const sources = readdirSync(import.meta.dirname)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({
      name,
      text: readFileSync(join(import.meta.dirname, name), 'utf8'),
    }));

  it('has sources to check', () => {
    expect(sources.map((file) => file.name).sort()).toEqual([
      'commands.ts',
      'index.ts',
      'member-profile.ts',
      'messages.ts',
    ]);
  });

  /*
   * A staff console is exactly where cross-bot reads get smuggled in — "it's
   * only reading points". Guardian's dependency container cannot supply a
   * Companion repository, but an import would be the first visible step, so
   * the source is checked directly rather than waiting for the type error.
   */
  it('imports nothing from Companion or Labs', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/from\s+'[^']*(?:companion|labs)[^']*'/i);
      expect(file.text).not.toMatch(
        /\brepositories\.(rewards|points|cohorts|feedback)\b/,
      );
    }
  });

  /*
   * The point of this phase was a new surface over existing services, not a
   * second implementation of them. A staff-only moderation path would be the
   * failure mode, and it would start with the Discord moderation adapter.
   */
  it('performs no moderation of its own', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/\bdiscordModeration\b|\bchannelModeration\b/);
      expect(file.text).not.toMatch(/\bdeps\.roles\b/);
    }
  });

  /* One write, and it is the audit row for reading a report. */
  it('writes nothing but that one audit row', () => {
    const writes = sources.flatMap((file) =>
      [
        ...file.text.matchAll(
          /repositories\.(\w+)\.(append|open|assign|transitionStatus|create|update|delete)\b/g,
        ),
      ].map((match) => `${match[1] ?? ''}.${match[2] ?? ''}`),
    );

    expect(writes).toEqual(['audit.append']);
  });
});
