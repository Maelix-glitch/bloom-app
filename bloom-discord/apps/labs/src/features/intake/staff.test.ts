import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import type { RecordingResponder } from '@bloom/testing';
import { TEST_GUILD_ID, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { labsHarness, type LabsHarness } from '../../labs.harness.js';

/**
 * The Labs staff surface, through the real dispatcher.
 *
 * Labs is the third bot to be moved onto the staff kernel, and the point of
 * these tests is that it behaves like the other two: the capability is checked
 * at execution time, the Discord permission bit on its own grants nothing, and
 * the read surfaces are bounded, ordered and ephemeral.
 */

const REFUSAL = 'Not available to you';

function expectRefused(responder: RecordingResponder): void {
  expect(responder.visibleText).toContain(REFUSAL);
}

function expectAllowed(responder: RecordingResponder): void {
  expect(responder.visibleText).not.toContain(REFUSAL);
}

let h: LabsHarness;

const MEMBER = TEST_USER_IDS.member;
const MODERATOR = TEST_USER_IDS.moderator;
const ADMIN = TEST_USER_IDS.administrator;
const FOUNDER = TEST_USER_IDS.founder;
const BETA = TEST_USER_IDS.betaTester;

const asMember = (userId = MEMBER): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MODERATOR, roles: ['moderator'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: ADMIN, roles: ['administrator'] });
const asFounder = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: FOUNDER, roles: ['founder'] });
const asBetaTester = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: BETA, roles: ['betaTester'] });

const BUG_ID = 'labs:bug:submit:app';
const FEEDBACK_ID = 'labs:feedback:submit:feature';

const bugFields = {
  summary: 'Saving a check-in shows an error and loses the note',
  steps: '1. Open the app\n2. Tap Check in\n3. Type anything and save',
  expected: 'It should save.',
};

/**
 * A fresh reporter each time.
 *
 * Intake is rate limited per member — ten bugs and five feedback entries a
 * day — which is correct, and which would silently swallow the rest of any
 * fixture that needs more. Distinct reporters keep the limiter intact for the
 * tests that mean to exercise it.
 */
let reporterSeq = 0;
function nextReporter(): ReturnType<typeof testSubject> {
  reporterSeq += 1;
  /*
   * Built by concatenation, not arithmetic. A snowflake is an 18-digit
   * number, which is past Number.MAX_SAFE_INTEGER — adding to a literal of
   * that size silently returns the same value every time, and the "distinct"
   * reporters all collapse into one.
   */
  return asMember(
    unsafeSnowflake<UserId>(`9000000000000${String(reporterSeq).padStart(5, '0')}`),
  );
}

/** File a bug through the real modal path and return its number. */
async function fileBug(
  summary = bugFields.summary,
  actor = nextReporter(),
): Promise<number> {
  await h.submit({ customId: BUG_ID, actor, fields: { ...bugFields, summary } });
  const bugs = await h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 25 });
  return bugs.reduce((max, bug) => Math.max(max, bug.bugNumber), 0);
}

async function submitFeedback(summary: string): Promise<void> {
  await h.submit({
    customId: FEEDBACK_ID,
    actor: nextReporter(),
    fields: { summary, detail: 'A little more about it.' },
  });
}

function labs(
  group: string,
  subcommand: string,
  actor: ReturnType<typeof testSubject>,
  options: Record<string, unknown> = {},
): Parameters<LabsHarness['dispatch']>[0] {
  return { commandName: 'labs', subcommandGroup: group, subcommand, actor, options };
}

beforeEach(() => {
  reporterSeq = 0;
  h = labsHarness();
});

// -----------------------------------------------------------------------------
// /labs bug queue
// -----------------------------------------------------------------------------

describe('/labs bug queue', () => {
  it('lets a moderator read the queue', async () => {
    await fileBug();

    const { responder } = await h.dispatch(labs('bug', 'queue', asModerator()));

    expectAllowed(responder);
    expect(responder.visibleText).toContain('Triage queue');
  });

  it('lets an administrator and a founder read the queue', async () => {
    await fileBug();

    for (const actor of [asAdmin(), asFounder()]) {
      const { responder } = await h.dispatch(labs('bug', 'queue', actor));
      expectAllowed(responder);
    }
  });

  it('refuses an ordinary member', async () => {
    await fileBug();

    const { responder } = await h.dispatch(labs('bug', 'queue', asMember()));

    expectRefused(responder);
  });

  /* Beta Tester is testing access, not staff standing. */
  it('refuses a Beta Tester', async () => {
    await fileBug();

    const { responder } = await h.dispatch(labs('bug', 'queue', asBetaTester()));

    expectRefused(responder);
  });

  it('has a clear empty state', async () => {
    const { responder } = await h.dispatch(labs('bug', 'queue', asModerator()));

    expect(responder.visibleText).toContain('Nothing is waiting');
  });

  it('is ephemeral', async () => {
    await fileBug();

    const { responder } = await h.dispatch(labs('bug', 'queue', asModerator()));

    expect(responder.messages.at(-1)?.ephemeral).toBe(true);
  });

  it('filters by status', async () => {
    const first = await fileBug('First bug summary for the queue');
    await fileBug('Second bug summary for the queue');

    await h.dispatch(
      labs('admin', 'triage', asModerator(), {
        integers: { number: first },
        strings: { status: 'TRIAGED' },
      }),
    );

    const triaged = await h.dispatch(
      labs('bug', 'queue', asModerator(), { strings: { status: 'TRIAGED' } }),
    );
    expect(triaged.responder.visibleText).toContain(`**${String(first)}**`);

    const fixed = await h.dispatch(
      labs('bug', 'queue', asModerator(), { strings: { status: 'FIXED' } }),
    );
    expect(fixed.responder.visibleText).toContain('Nothing is waiting');
  });

  /*
   * Bounded at the repository, not by the caller's good manners. Asserted
   * through the fake because that is what every unit test reads through, and
   * the real SQL clamp is covered in the labs integration suite.
   */
  it('is bounded even when more exist than the page holds', async () => {
    for (let index = 0; index < 30; index += 1) {
      await fileBug(`Queue bound bug number ${String(index)} summary`);
    }
    expect(await h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 25 })).toHaveLength(
      25,
    );

    const bugs = await h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 10_000 });
    expect(bugs).toHaveLength(25);

    expect(await h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 0 })).toHaveLength(
      1,
    );
    expect(await h.repositories.labs.bugQueue(TEST_GUILD_ID)).toHaveLength(10);
  });

  it('orders oldest first, and the same way every time', async () => {
    const numbers = [
      await fileBug('Ordering bug one summary text'),
      await fileBug('Ordering bug two summary text'),
      await fileBug('Ordering bug three summary text'),
    ];

    const reads = await Promise.all([
      h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 25 }),
      h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 25 }),
      h.repositories.labs.bugQueue(TEST_GUILD_ID, { limit: 25 }),
    ]);

    for (const read of reads) {
      expect(read.map((bug) => bug.bugNumber)).toEqual(numbers);
    }
  });
});

// -----------------------------------------------------------------------------
// /labs bug show
// -----------------------------------------------------------------------------

describe('/labs bug show', () => {
  it('stays readable by any member — a bug is about the software', async () => {
    const number = await fileBug();

    const { responder } = await h.dispatch(
      labs('bug', 'show', asMember(), { integers: { number } }),
    );

    expectAllowed(responder);
    // `forDiscord` escapes markdown, hyphens included, so match a plain run.
    expect(responder.visibleText).toContain('shows an error and loses the note');
    expect(responder.visibleText).toContain('Steps');
  });

  it('reports a bug number that does not exist', async () => {
    const { responder } = await h.dispatch(
      labs('bug', 'show', asMember(), { integers: { number: 404 } }),
    );

    expect(responder.visibleText).toContain('no bug 404');
  });

  /*
   * The operational detail is the staff part: who triaged it, and the trail
   * of how it got there. A member sees the bug; staff see the handling.
   */
  it('shows the triager and the history to staff only', async () => {
    const number = await fileBug();
    await h.dispatch(
      labs('admin', 'triage', asModerator(), {
        integers: { number },
        strings: { status: 'TRIAGED' },
      }),
    );

    const staff = await h.dispatch(
      labs('bug', 'show', asModerator(), { integers: { number } }),
    );
    expect(staff.responder.visibleText).toContain('Triaged by');
    expect(staff.responder.visibleText).toContain('History');

    const plain = await h.dispatch(
      labs('bug', 'show', asMember(), { integers: { number } }),
    );
    expect(plain.responder.visibleText).not.toContain('Triaged by');
    expect(plain.responder.visibleText).not.toContain('History');
  });

  it('shows the resolution and duplicate target once set', async () => {
    const original = await fileBug('The original bug summary text here');
    const duplicate = await fileBug('The duplicate bug summary text here');

    await h.dispatch(
      labs('admin', 'triage', asModerator(), {
        integers: { number: duplicate, 'duplicate-of': original },
        strings: { status: 'DUPLICATE', resolution: 'Same as the earlier report.' },
      }),
    );

    const { responder } = await h.dispatch(
      labs('bug', 'show', asModerator(), { integers: { number: duplicate } }),
    );

    expect(responder.visibleText).toContain('Same as the earlier report.');
    expect(responder.visibleText).toContain(
      `Already reported as bug ${String(original)}`,
    );
  });
});

// -----------------------------------------------------------------------------
// /labs admin triage
// -----------------------------------------------------------------------------

describe('/labs admin triage', () => {
  async function triage(
    actor: ReturnType<typeof testSubject>,
    options: Record<string, unknown>,
  ): Promise<RecordingResponder> {
    const { responder } = await h.dispatch(labs('admin', 'triage', actor, options));
    return responder;
  }

  it('lets a moderator move a bug', async () => {
    const number = await fileBug();

    const responder = await triage(asModerator(), {
      integers: { number },
      strings: { status: 'TRIAGED' },
    });

    expectAllowed(responder);
    const bug = await h.repositories.labs.findBug(TEST_GUILD_ID, number);
    expect(bug?.status).toBe('TRIAGED');
  });

  it('lets an administrator and a founder move a bug', async () => {
    for (const actor of [asAdmin(), asFounder()]) {
      const number = await fileBug(`A bug for ${actor.userId} to triage here`);
      const responder = await triage(actor, {
        integers: { number },
        strings: { status: 'TRIAGED' },
      });
      expectAllowed(responder);
    }
  });

  it('refuses an ordinary member, and does not move the bug', async () => {
    const number = await fileBug();

    const responder = await triage(asMember(), {
      integers: { number },
      strings: { status: 'FIXED', resolution: 'I said so.' },
    });

    expectRefused(responder);
    const bug = await h.repositories.labs.findBug(TEST_GUILD_ID, number);
    expect(bug?.status).toBe('NEW');
  });

  it('refuses a Beta Tester', async () => {
    const number = await fileBug();

    const responder = await triage(asBetaTester(), {
      integers: { number },
      strings: { status: 'TRIAGED' },
    });

    expectRefused(responder);
    expect((await h.repositories.labs.findBug(TEST_GUILD_ID, number))?.status).toBe(
      'NEW',
    );
  });

  /* The service's rules, reached through the command. Not reimplemented. */
  it('requires a resolution for anything that closes the bug', async () => {
    const number = await fileBug();

    const responder = await triage(asModerator(), {
      integers: { number },
      strings: { status: 'FIXED' },
    });

    expect(responder.visibleText).toContain('needs a reason');
    expect((await h.repositories.labs.findBug(TEST_GUILD_ID, number))?.status).toBe(
      'NEW',
    );
  });

  it('requires a duplicate target when marking a duplicate', async () => {
    const number = await fileBug();

    const responder = await triage(asModerator(), {
      integers: { number },
      strings: { status: 'DUPLICATE', resolution: 'Seen before.' },
    });

    expect(responder.visibleText.toLowerCase()).toContain('duplicate');
    expect((await h.repositories.labs.findBug(TEST_GUILD_ID, number))?.status).toBe(
      'NEW',
    );
  });

  it('refuses a duplicate target that does not exist', async () => {
    const number = await fileBug();

    const responder = await triage(asModerator(), {
      integers: { number, 'duplicate-of': 9999 },
      strings: { status: 'DUPLICATE', resolution: 'Seen before.' },
    });

    expect(responder.visibleText).toContain('9999');
    expect((await h.repositories.labs.findBug(TEST_GUILD_ID, number))?.status).toBe(
      'NEW',
    );
  });

  it('reports a bug number that does not exist', async () => {
    const responder = await triage(asModerator(), {
      integers: { number: 4040 },
      strings: { status: 'TRIAGED' },
    });

    expect(responder.visibleText).toContain('4040');
  });

  /**
   * The terminal rule Labs actually has: closing needs a reason.
   *
   * Note what it is *not* — unlike a Guardian case, a bug can be moved back
   * out of a terminal state. That is defensible for bugs, which regress and
   * get reopened, and it is existing behaviour, so it is asserted here rather
   * than quietly changed. The reopen is recorded in the history either way,
   * which is what makes it reviewable.
   */
  it('requires a reason to close, and records a reopen rather than refusing it', async () => {
    const number = await fileBug();

    const closed = await triage(asModerator(), {
      integers: { number },
      strings: { status: 'FIXED', resolution: 'Shipped in 1.4.' },
    });
    expectAllowed(closed);
    expect((await h.repositories.labs.findBug(TEST_GUILD_ID, number))?.status).toBe(
      'FIXED',
    );

    await triage(asModerator(), {
      integers: { number },
      strings: { status: 'TRIAGED' },
    });

    const bug = await h.repositories.labs.findBug(TEST_GUILD_ID, number);
    expect(bug?.status).toBe('TRIAGED');

    const history = await h.repositories.labs.bugHistory(bug?.id ?? '');
    expect(history.map((event) => event.toStatus)).toEqual(['NEW', 'FIXED', 'TRIAGED']);
  });

  it('does nothing when the bug is already in that status', async () => {
    const number = await fileBug();
    await triage(asModerator(), {
      integers: { number },
      strings: { status: 'TRIAGED' },
    });

    const again = await triage(asModerator(), {
      integers: { number },
      strings: { status: 'TRIAGED' },
    });

    expectAllowed(again);
    const bug = await h.repositories.labs.findBug(TEST_GUILD_ID, number);
    // The filing event plus one move. The repeat added nothing.
    const history = await h.repositories.labs.bugHistory(bug?.id ?? '');
    expect(history).toHaveLength(2);
  });
});

// -----------------------------------------------------------------------------
// /labs admin feedback
// -----------------------------------------------------------------------------

describe('/labs admin feedback', () => {
  it('lets staff read recent feedback', async () => {
    await submitFeedback('The reminder arrives after I have gone to bed');

    const { responder } = await h.dispatch(labs('admin', 'feedback', asModerator()));

    expectAllowed(responder);
    expect(responder.visibleText).toContain('after I have gone to bed');
  });

  it('refuses an ordinary member and a Beta Tester', async () => {
    await submitFeedback('Something I would rather staff read, not the room');

    for (const actor of [asMember(), asBetaTester()]) {
      const { responder } = await h.dispatch(labs('admin', 'feedback', actor));
      expectRefused(responder);
      expect(responder.visibleText).not.toContain('rather staff read');
    }
  });

  it('is ephemeral — feedback is written to staff, not to the room', async () => {
    await submitFeedback('A private thought about the onboarding flow');

    const { responder } = await h.dispatch(labs('admin', 'feedback', asModerator()));

    expect(responder.messages.at(-1)?.ephemeral).toBe(true);
  });

  it('has a clear empty state', async () => {
    const { responder } = await h.dispatch(labs('admin', 'feedback', asModerator()));

    expect(responder.visibleText).toContain('No feedback has been submitted');
  });

  it('is newest first, and deterministic', async () => {
    for (let index = 0; index < 4; index += 1) {
      await submitFeedback(`Feedback entry number ${String(index)} summary`);
    }

    const reads = await Promise.all([
      h.repositories.labs.recentFeedback(TEST_GUILD_ID, 25),
      h.repositories.labs.recentFeedback(TEST_GUILD_ID, 25),
    ]);

    const [first, second] = reads;
    expect(first.map((entry) => entry.id)).toEqual(second.map((entry) => entry.id));
    const times = first.map((entry) => entry.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('is bounded', async () => {
    for (let index = 0; index < 30; index += 1) {
      await submitFeedback(`Bounded feedback entry ${String(index)} summary`);
    }

    expect(await h.repositories.labs.recentFeedback(TEST_GUILD_ID, 10_000)).toHaveLength(
      25,
    );
    expect(await h.repositories.labs.recentFeedback(TEST_GUILD_ID, 0)).toHaveLength(1);
  });

  it('does not print the long detail, only that it exists', async () => {
    await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: {
        summary: 'A short summary of the thing',
        detail: 'SENSITIVEPARAGRAPHTHATSHOULDNOTBEPASTED',
      },
    });

    const { responder } = await h.dispatch(labs('admin', 'feedback', asModerator()));

    expect(responder.visibleText).toContain('A short summary of the thing');
    expect(responder.visibleText).not.toContain(
      'SENSITIVEPARAGRAPHTHATSHOULDNOTBEPASTED',
    );
    expect(responder.visibleText).toContain('has detail');
  });
});

// -----------------------------------------------------------------------------
// Guild scoping
// -----------------------------------------------------------------------------

describe('guild scoping', () => {
  it('refuses a founder arriving from another guild', async () => {
    const elsewhere: GuildId = unsafeSnowflake<GuildId>('900000000000000777');

    const { responder } = await h.dispatch(
      labs('bug', 'queue', { ...asFounder(), guildId: elsewhere }),
    );

    expect(responder.visibleText).toContain('only available in the Bloom Labs server');
  });

  it('refuses a cross-guild triage before it can mutate anything', async () => {
    const elsewhere: GuildId = unsafeSnowflake<GuildId>('900000000000000777');
    const number = await fileBug();

    const { responder } = await h.dispatch(
      labs(
        'admin',
        'triage',
        { ...asFounder(), guildId: elsewhere },
        { integers: { number }, strings: { status: 'TRIAGED' } },
      ),
    );

    expect(responder.visibleText).toContain('only available in the Bloom Labs server');
    expect((await h.repositories.labs.findBug(TEST_GUILD_ID, number))?.status).toBe(
      'NEW',
    );
  });
});

// -----------------------------------------------------------------------------
// Architectural guards
// -----------------------------------------------------------------------------

describe('Labs stays inside its own boundary', () => {
  const dir = import.meta.dirname;
  const sources = readdirSync(dir)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

  it('has the sources it expects to check', () => {
    expect(sources.map((file) => file.name).sort()).toEqual([
      'commands.ts',
      'fields.ts',
      'handlers.ts',
      'messages.ts',
      'service.ts',
    ]);
  });

  it('imports nothing from Guardian or Companion', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(/from\s+'[^']*(?:guardian|companion)[^']*'/i);
    }
  });

  /*
   * Labs holds five repositories and must not reach for a sixth. Naming the
   * other bots' repositories here catches the import before the type error
   * does, and reads as the rule rather than as a compiler artefact.
   */
  it('touches no repository outside its manifest', () => {
    for (const file of sources) {
      expect(file.text).not.toMatch(
        /\brepositories\.(rewards|awards|cases|moderation|onboarding|roles)\b/,
      );
    }
  });

  /* Triage is the service's job; the command must not grow its own. */
  it('routes every bug mutation through the intake service', () => {
    const commands = sources.find((file) => file.name === 'commands.ts')?.text ?? '';

    expect(commands).not.toMatch(/repositories\.labs\.(triage|fileBug|submitFeedback)\b/);
    expect(commands).toContain('deps.intake.triage');
  });
});
