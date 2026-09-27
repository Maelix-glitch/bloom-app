import { beforeEach, describe, expect, it } from 'vitest';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import { labsHarness, type LabsHarness } from '../../labs.harness.js';
import { DAILY_BUG_LIMIT, DAILY_FEEDBACK_LIMIT } from './service.js';

/**
 * Feedback and bug intake.
 *
 * The interesting cases are all about a submission surviving something: a
 * missing channel, a Discord outage, a member whose roles changed while the
 * form was open, or a second moderator closing the same bug.
 */

let h: LabsHarness;

const member = TEST_USER_IDS.member;
const moderator = TEST_USER_IDS.moderator;

const asMember = (userId = member) => testSubject({ userId, roles: ['bloomMember'] });
const asModerator = () => testSubject({ userId: moderator, roles: ['moderator'] });
const asNewcomer = () =>
  testSubject({ userId: TEST_USER_IDS.newcomer, roles: ['earlyBloom'] });

const FEEDBACK_ID = 'labs:feedback:submit:feature';
const BUG_ID = 'labs:bug:submit:app';

const feedbackFields = {
  summary: 'The check-in reminder arrives after I have gone to bed',
  detail: 'Nine in the evening would be better than eleven.',
};

const bugFields = {
  summary: 'Saving a check-in shows an error and loses the note',
  steps: '1. Open the app\n2. Tap Check in\n3. Type anything and save',
  expected: 'It should save.',
};

/** File a bug and return its number. */
async function fileBug(actor = asMember()): Promise<number> {
  await h.submit({ customId: BUG_ID, actor, fields: bugFields });
  const bug = h.repositories.labs.bugs.at(-1);
  if (!bug) throw new Error('no bug was filed');
  return bug.bugNumber;
}

beforeEach(() => {
  h = labsHarness();
});

describe('opening the forms', () => {
  it('shows a modal instead of deferring', async () => {
    const result = await h.dispatch({
      commandName: 'feedback',
      actor: asMember(),
      options: { strings: { category: 'feature' } },
    });

    // Discord accepts a modal only as the initial response. Deferring first
    // would make it impossible, which is why the namespace resolves `defer`
    // per branch rather than once.
    expect(result.responder.deferred).toBe(false);
    expect(result.responder.modals).toHaveLength(1);
  });

  it('carries the chosen category in the custom id', async () => {
    const result = await h.dispatch({
      commandName: 'feedback',
      actor: asMember(),
      options: { strings: { category: 'improvement' } },
    });

    // Rather than spending one of Discord's five modal fields on something the
    // member has already chosen from a validated list.
    expect(result.responder.modals[0]?.customId).toBe('labs:feedback:submit:improvement');
  });

  it('opens the bug form from the namespace without deferring', async () => {
    const result = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'bug',
      subcommand: 'report',
      actor: asMember(),
      options: { strings: { area: 'app' } },
    });

    expect(result.responder.deferred).toBe(false);
    expect(result.responder.modals[0]?.customId).toBe('labs:bug:submit:app');
  });

  it('still defers the branches that read the database', async () => {
    const result = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'bug',
      subcommand: 'show',
      actor: asMember(),
      options: { integers: { number: 1 } },
    });

    // The whole reason `defer` is resolved per invocation: one namespace, two
    // requirements.
    expect(result.responder.deferred).toBe(true);
  });

  it('refuses a member who has not finished onboarding', async () => {
    const result = await h.dispatch({
      commandName: 'feedback',
      actor: asNewcomer(),
      options: { strings: { category: 'feature' } },
    });

    expect(result.responder.modals).toHaveLength(0);
    expect(result.responder.visibleText).toContain('Not available to you');
  });
});

describe('submitting feedback', () => {
  it('records it and posts it', async () => {
    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: feedbackFields,
    });

    expect(result.responder.visibleText).toContain('Recorded');
    const entry = h.repositories.labs.feedback.at(-1);
    expect(entry?.category).toBe('feature');
    expect(entry?.summary).toBe(feedbackFields.summary);

    const posted = h.messaging.sent.find(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.feedback,
    );
    expect(JSON.stringify(posted?.message)).toContain('gone to bed');
  });

  it('says plainly that there is no status to check', async () => {
    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: feedbackFields,
    });

    // Feedback has no lifecycle, and the reply must not imply one. An inbox of
    // rows that all say NEW forever is a promise nobody made.
    expect(result.responder.visibleText).toContain('no status to check');
  });

  it('stores what the member wrote and escapes only on the way out', async () => {
    await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: { summary: 'The **check-in** reminder fires too late' },
    });

    /*
     * Escaping is a rendering concern for one renderer. A row saved as
     * `\*\*check\-in\*\*` is corrupted for every other reader — a SQL query,
     * an export, a dashboard — and grows another backslash each time it passes
     * through again.
     */
    expect(h.repositories.labs.feedback.at(-1)?.summary).toBe(
      'The **check-in** reminder fires too late',
    );

    const posted = h.messaging.sent.find(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.feedback,
    );
    expect(posted?.message.embeds?.[0]?.description).toContain(
      String.raw`The \*\*check\-in\*\* reminder`,
    );
  });

  it('defuses an attempt to make the bot ping the server', async () => {
    await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: { summary: 'Please tell @everyone about the new release' },
    });

    const posted = h.messaging.sent.find(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.feedback,
    );
    const rendered = JSON.stringify(posted?.message);
    expect(rendered).not.toContain('@everyone');
    expect(rendered).toContain('everyone');
  });

  it('stores the message id so the post can be found again', async () => {
    await h.submit({ customId: FEEDBACK_ID, actor: asMember(), fields: feedbackFields });

    expect(h.repositories.labs.feedback.at(-1)?.messageId).not.toBeNull();
  });

  it('records it even when there is no channel to announce it in', async () => {
    h = labsHarness({ feedbackChannel: null });

    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: feedbackFields,
    });

    // An operator who has not created #feedback must not cost a member their
    // submission.
    expect(h.repositories.labs.feedback).toHaveLength(1);
    expect(result.responder.visibleText).toContain('not posted');
  });

  it('keeps the submission when Discord refuses the post', async () => {
    h = labsHarness();
    // The bot can see #feedback but cannot post in it — a permission mistake
    // that is common and entirely invisible until someone tries.
    h.guild.unpostableChannels.add(TEST_CHANNEL_IDS.feedback);

    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: feedbackFields,
    });

    // Recorded first, announced second. The other order would lose the row.
    expect(h.repositories.labs.feedback).toHaveLength(1);
    expect(result.responder.visibleText).toContain('not posted');
  });

  it('treats an untouched optional field as absent, not as empty text', async () => {
    await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: { summary: feedbackFields.summary, detail: '   ' },
    });

    // Discord sends '' for an untouched optional field. Storing that would put
    // an empty section under a heading in the channel post.
    expect(h.repositories.labs.feedback.at(-1)?.detail).toBeNull();
  });

  it('refuses a summary too short to act on', async () => {
    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: { summary: 'broken' },
    });

    // Discord enforces the minimum client-side; this is what happens when that
    // is bypassed, which is the only reason to check it server-side.
    expect(h.repositories.labs.feedback).toHaveLength(0);
    expect(result.responder.visibleText).toContain('at least 8 characters');
  });

  it('re-checks authorization when the form is submitted', async () => {
    /*
     * A modal can be submitted up to fifteen minutes after it was opened, and
     * roles change in that window. Checking only at open time would let a
     * revoked member submit on a permission they no longer hold.
     */
    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asNewcomer(),
      fields: feedbackFields,
    });

    expect(h.repositories.labs.feedback).toHaveLength(0);
    expect(result.responder.visibleText).toContain('Not available to you');
  });

  it('audits the category and not the words', async () => {
    await h.submit({ customId: FEEDBACK_ID, actor: asMember(), fields: feedbackFields });

    const entry = h.repositories.audit.events.at(-1);
    expect(entry?.event).toBe('labs.feedback_submitted');
    expect(entry?.details).toEqual({ category: 'feature' });
    expect(JSON.stringify(entry)).not.toContain('gone to bed');
  });

  it('stops at the daily limit', async () => {
    for (let i = 0; i < DAILY_FEEDBACK_LIMIT; i += 1) {
      await h.submit({
        customId: FEEDBACK_ID,
        actor: asMember(),
        fields: feedbackFields,
      });
    }

    const result = await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(),
      fields: feedbackFields,
    });

    expect(h.repositories.labs.feedback).toHaveLength(DAILY_FEEDBACK_LIMIT);
    expect(result.responder.visibleText).toContain('which is the limit');
  });

  it('limits the member, not the server', async () => {
    for (let i = 0; i < DAILY_FEEDBACK_LIMIT; i += 1) {
      await h.submit({
        customId: FEEDBACK_ID,
        actor: asMember(),
        fields: feedbackFields,
      });
    }

    await h.submit({
      customId: FEEDBACK_ID,
      actor: asMember(TEST_USER_IDS.betaTester),
      fields: feedbackFields,
    });

    expect(h.repositories.labs.feedback).toHaveLength(DAILY_FEEDBACK_LIMIT + 1);
  });
});

describe('filing a bug', () => {
  it('allocates a number and quotes it back', async () => {
    const result = await h.submit({
      customId: BUG_ID,
      actor: asMember(),
      fields: bugFields,
    });

    expect(h.repositories.labs.bugs.at(-1)?.bugNumber).toBe(1);
    expect(result.responder.visibleText).toContain('bug 1');
  });

  it('counts up per guild', async () => {
    await fileBug();
    await fileBug();

    expect(h.repositories.labs.bugs.map((bug) => bug.bugNumber)).toEqual([1, 2]);
  });

  it('starts every bug as NEW with nobody assigned', async () => {
    await fileBug();

    const bug = h.repositories.labs.bugs.at(-1);
    expect(bug?.status).toBe('NEW');
    expect(bug?.triagedBy).toBeNull();
    expect(bug?.resolution).toBeNull();
  });

  it('records the filing in the history', async () => {
    await fileBug();

    const bug = h.repositories.labs.bugs.at(-1);
    const history = await h.repositories.labs.bugHistory(bug?.id ?? '');
    expect(history).toHaveLength(1);
    // Null means "did not exist before", which is what filing is.
    expect(history[0]?.fromStatus).toBeNull();
    expect(history[0]?.toStatus).toBe('NEW');
  });

  it('posts it with its number so people can refer to it', async () => {
    await fileBug();

    const posted = h.messaging.sent.find(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.bugReports,
    );
    expect(JSON.stringify(posted?.message)).toContain('Bug 1');
  });

  it('requires steps to reproduce', async () => {
    const result = await h.submit({
      customId: BUG_ID,
      actor: asMember(),
      fields: { summary: bugFields.summary, steps: 'broke' },
    });

    expect(h.repositories.labs.bugs).toHaveLength(0);
    expect(result.responder.visibleText).toContain('at least 8 characters');
  });

  it('stops at the daily limit', async () => {
    for (let i = 0; i < DAILY_BUG_LIMIT; i += 1) await fileBug();

    const result = await h.submit({
      customId: BUG_ID,
      actor: asMember(),
      fields: bugFields,
    });

    expect(h.repositories.labs.bugs).toHaveLength(DAILY_BUG_LIMIT);
    expect(result.responder.visibleText).toContain('which is the limit');
  });
});

describe('looking a bug up', () => {
  const show = (number: number, actor = asMember()) =>
    h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'bug',
      subcommand: 'show',
      actor,
      options: { integers: { number } },
    });

  it('shows the report to any member', async () => {
    const number = await fileBug();

    const result = await show(number, asMember(TEST_USER_IDS.betaTester));

    // Readable by anyone: it is already in a public channel, and "is this
    // known?" is the question that stops it being filed six times.
    expect(result.responder.visibleText).toContain('loses the note');
  });

  it('says so when there is no such bug', async () => {
    const result = await show(404);

    expect(result.responder.visibleText).toContain('no bug 404');
  });

  it('hides the triager from members and shows them to staff', async () => {
    const number = await fileBug();
    await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'triage',
      actor: asModerator(),
      options: { integers: { number }, strings: { status: 'TRIAGED' } },
    });

    const asSeenByMember = await show(number);
    const asSeenByStaff = await show(number, asModerator());

    // Not a secret — it is in the audit trail — but naming a moderator in the
    // reporter's reply sends the follow-up to that person's DMs.
    expect(asSeenByMember.responder.visibleText).not.toContain('Triaged by');
    expect(asSeenByStaff.responder.visibleText).toContain('Triaged by');
  });
});

describe('the triage queue', () => {
  const queue = (actor = asModerator(), status?: string) =>
    h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'bug',
      subcommand: 'queue',
      actor,
      options: status ? { strings: { status } } : {},
    });

  it('is staff only', async () => {
    const result = await queue(asMember());

    expect(result.responder.visibleText).toContain('Not available to you');
  });

  it('lists what is still open', async () => {
    await fileBug();

    const result = await queue();
    expect(result.responder.visibleText).toContain('loses the note');
  });

  it('leaves out anything already closed', async () => {
    const number = await fileBug();
    await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'triage',
      actor: asModerator(),
      options: {
        integers: { number },
        strings: { status: 'FIXED', resolution: 'Fixed in 1.4.2.' },
      },
    });

    const result = await queue();
    expect(result.responder.visibleText).toContain('Nothing is waiting');
  });

  it('says nothing is waiting without making it sound broken', async () => {
    const result = await queue();

    expect(result.responder.visibleText).toContain(
      'That is the good outcome, not an empty state',
    );
  });
});

describe('triage', () => {
  const triage = (
    number: number,
    status: string,
    extra: {
      readonly resolution?: string;
      readonly duplicateOf?: number;
      readonly actor?: ReturnType<typeof testSubject>;
    } = {},
  ) =>
    h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'triage',
      actor: extra.actor ?? asModerator(),
      options: {
        integers: {
          number,
          ...(extra.duplicateOf === undefined
            ? {}
            : { 'duplicate-of': extra.duplicateOf }),
        },
        strings: {
          status,
          ...(extra.resolution === undefined ? {} : { resolution: extra.resolution }),
        },
      },
    });

  it('moves a bug and records who moved it', async () => {
    const number = await fileBug();

    const result = await triage(number, 'TRIAGED');

    expect(result.responder.visibleText).toContain('New → **Triaged**');
    expect(h.repositories.labs.bugs.at(-1)?.triagedBy).toBe(moderator);
  });

  it('refuses a member', async () => {
    const number = await fileBug();

    const result = await triage(number, 'FIXED', {
      resolution: 'I fixed it myself',
      actor: asMember(),
    });

    expect(result.responder.visibleText).toContain('Not available to you');
    expect(h.repositories.labs.bugs.at(-1)?.status).toBe('NEW');
  });

  it('will not close a bug without saying why', async () => {
    const number = await fileBug();

    const result = await triage(number, 'FIXED');

    // The reporter is told what the resolution says, so it has to exist.
    expect(result.responder.visibleText).toContain('needs a reason');
    expect(h.repositories.labs.bugs.at(-1)?.status).toBe('NEW');
  });

  it('will not mark a duplicate without a target', async () => {
    const number = await fileBug();

    const result = await triage(number, 'DUPLICATE', { resolution: 'Same as before' });

    expect(result.responder.visibleText).toContain('needs the number');
    expect(h.repositories.labs.bugs.at(-1)?.status).toBe('NEW');
  });

  it('will not point a duplicate at a bug that does not exist', async () => {
    const number = await fileBug();

    const result = await triage(number, 'DUPLICATE', {
      resolution: 'Same as before',
      duplicateOf: 999,
    });

    expect(result.responder.visibleText).toContain('no bug 999');
    expect(h.repositories.labs.bugs.at(-1)?.status).toBe('NEW');
  });

  it('records the duplicate target when it does exist', async () => {
    const first = await fileBug();
    const second = await fileBug();

    await triage(second, 'DUPLICATE', {
      resolution: 'Already reported.',
      duplicateOf: first,
    });

    const bug = await h.repositories.labs.findBug(TEST_GUILD_ID, second);
    expect(bug?.duplicateOf).toBe(first);
  });

  it('tells the reporter when their bug is closed', async () => {
    const number = await fileBug();

    await triage(number, 'FIXED', { resolution: 'Fixed in 1.4.2.' });

    const dm = h.messaging.directMessages.at(-1);
    // A report that vanishes into a queue and is silently closed is why people
    // stop filing them.
    expect(dm?.userId).toBe(member);
    expect(JSON.stringify(dm?.message)).toContain('Fixed in 1.4.2.');
  });

  it('does not message the reporter for an interim move', async () => {
    const number = await fileBug();

    await triage(number, 'TRIAGED');

    // TRIAGED means "we have seen it", which is not news worth a DM.
    expect(h.messaging.directMessages).toHaveLength(0);
  });

  it('survives a reporter with closed direct messages', async () => {
    const number = await fileBug();
    h.messaging.dmBlocked.add(member);

    const result = await triage(number, 'FIXED', { resolution: 'Fixed in 1.4.2.' });

    // Most people have server DMs off. That must not fail the triage.
    expect(result.responder.visibleText).toContain('Fixed');
    expect(h.repositories.labs.bugs.at(-1)?.status).toBe('FIXED');
  });

  it('is idempotent when two moderators close the same bug', async () => {
    const number = await fileBug();
    await triage(number, 'FIXED', { resolution: 'Fixed in 1.4.2.' });

    const second = await triage(number, 'FIXED', { resolution: 'Fixed in 1.4.2.' });

    expect(second.responder.visibleText).toContain('already');
    // One transition, one DM. The reporter is not told twice.
    expect(h.messaging.directMessages).toHaveLength(1);
  });

  it('says so when the bug does not exist', async () => {
    const result = await triage(404, 'TRIAGED');

    expect(result.responder.visibleText).toContain('no bug 404');
  });

  it('keeps the full history of every move', async () => {
    const number = await fileBug();
    await triage(number, 'TRIAGED');
    await triage(number, 'FIXED', { resolution: 'Fixed in 1.4.2.' });

    const bug = await h.repositories.labs.findBug(TEST_GUILD_ID, number);
    const history = await h.repositories.labs.bugHistory(bug?.id ?? '');

    // The current status cannot answer "who closed this, and when".
    expect(history.map((event) => event.toStatus)).toEqual(['NEW', 'TRIAGED', 'FIXED']);
  });

  it('audits the move with both ends of it', async () => {
    const number = await fileBug();
    await triage(number, 'TRIAGED');

    const entry = h.repositories.audit.events.at(-1);
    expect(entry?.event).toBe('labs.bug_triaged');
    expect(entry?.actorId).toBe(moderator);
    expect(entry?.details).toMatchObject({ from: 'NEW', to: 'TRIAGED' });
  });
});
