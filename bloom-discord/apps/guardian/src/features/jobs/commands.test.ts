import { beforeEach, describe, expect, it } from 'vitest';
import {
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_USER_IDS,
  testSubject,
  type RecordingResponder,
} from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

/**
 * `/guardian jobs …`, through the real dispatcher.
 *
 * Dispatching rather than calling the handlers means the namespace policy and
 * the per-subcommand policy are both genuinely applied — the point of
 * `jobs run` being Administrator-only is worth nothing if the test bypasses the
 * layer that enforces it.
 */

const REFUSAL = 'Not available to you';
const JOB_KEY = 'guardian.cases.stale_sweep';

const expectRefused = (responder: RecordingResponder): void => {
  expect(responder.visibleText).toContain(REFUSAL);
};
const expectAllowed = (responder: RecordingResponder): void => {
  expect(responder.visibleText).not.toContain(REFUSAL);
};

const asMember = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: TEST_USER_IDS.member, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: TEST_USER_IDS.moderator, roles: ['moderator'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: TEST_USER_IDS.administrator, roles: ['administrator'] });

let h: GuardianHarness;

beforeEach(() => {
  h = guardianHarness();
  h.guild.withMember(TEST_USER_IDS.member);
  h.guild.withMember(TEST_USER_IDS.moderator, { roleIds: [TEST_ROLE_IDS.moderator] });
  h.guild.withMember(TEST_USER_IDS.administrator, {
    roleIds: [TEST_ROLE_IDS.administrator],
  });
});

describe('/guardian jobs list', () => {
  it('lists the jobs actually registered, with their schedule', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asModerator(),
    });

    expectAllowed(responder);
    expect(responder.visibleText).toContain(JOB_KEY);
    expect(responder.visibleText).toContain('0 9 * * *');
  });

  it('names the timezone schedules are evaluated in', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asModerator(),
    });

    // Not cosmetic: "09:00" means nothing without it, and a job firing an hour
    // early after a daylight-saving change is the classic scheduler bug.
    expect(responder.visibleText).toContain('Europe/London');
  });

  it('says plainly when the global switch is off', async () => {
    h = guardianHarness({ scheduledMessages: false });
    h.guild.withMember(TEST_USER_IDS.moderator, { roleIds: [TEST_ROLE_IDS.moderator] });

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asModerator(),
    });

    expect(responder.visibleText).toContain('FEATURE_SCHEDULED_MESSAGES is off');
  });

  it('refuses a plain member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asMember(),
    });

    expectRefused(responder);
  });
});

describe('/guardian jobs history', () => {
  it('reports honestly that a job has never run', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'history',
      actor: asModerator(),
      options: { strings: { job: JOB_KEY } },
    });

    expect(responder.visibleText).toContain('No recorded run');
  });

  it('reads the durable record, not this process’s memory', async () => {
    /*
     * Written straight to the repository, with no scheduler involved: this is
     * what a run from a previous deployment looks like. If the command read the
     * in-memory scheduler it would wrongly say "never run".
     */
    const lease = await h.repositories.jobs.acquire({
      jobKey: JOB_KEY,
      botName: 'guardian',
      guildId: TEST_GUILD_ID,
      runnerId: 'host-from-last-week:41',
      leaseSeconds: 120,
    });
    await h.repositories.jobs.complete(lease?.runId ?? '', 'succeeded');

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'history',
      actor: asModerator(),
      options: { strings: { job: JOB_KEY } },
    });

    expect(responder.visibleText).toContain('succeeded');
    expect(responder.visibleText).toContain('host-from-last-week:41');
  });

  it('shows the operator hint for a failure, so staff can act on it', async () => {
    const lease = await h.repositories.jobs.acquire({
      jobKey: JOB_KEY,
      botName: 'guardian',
      guildId: TEST_GUILD_ID,
      runnerId: 'runner-1',
      leaseSeconds: 120,
    });
    await h.repositories.jobs.complete(lease?.runId ?? '', 'failed', {
      errorCode: 'CHANNEL_NOT_FOUND',
      errorMessage: 'CHANNEL_MODERATION is set to a channel that no longer exists.',
    });

    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'history',
      actor: asModerator(),
      options: { strings: { job: JOB_KEY } },
    });

    expect(responder.visibleText).toContain('CHANNEL_NOT_FOUND');
    expect(responder.visibleText).toContain('no longer exists');
  });

  it('refuses an unknown job without listing internals to a non-staff caller', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'history',
      actor: asModerator(),
      options: { strings: { job: 'guardian.not_a_job' } },
    });

    expect(responder.visibleText).toContain('does not exist');
    // The operator hint names the registered jobs; the reply must not.
    expect(responder.visibleText).not.toContain('Registered:');
  });
});

describe('/guardian jobs run', () => {
  it('refuses a moderator — triggering the bot to post is an admin capability', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asModerator(),
      options: { strings: { job: JOB_KEY } },
    });

    expectRefused(responder);
    // And nothing ran.
    expect(h.lock.runs).toHaveLength(0);
  });

  it('lets an administrator trigger a job', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    expectAllowed(responder);
    expect(h.lock.runs).toHaveLength(1);
    expect(h.lock.runs[0]?.status).toBe('succeeded');
  });

  it('audits the manual trigger against the administrator who asked', async () => {
    await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    const event = h.repositories.audit.events.find(
      (entry) => entry.event === 'jobs.manual_run',
    );
    expect(event).toBeDefined();
    expect(event?.actorId).toBe(TEST_USER_IDS.administrator);
    expect(event?.details?.['job_key']).toBe(JOB_KEY);
  });

  it('refuses an unknown job', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asAdmin(),
      options: { strings: { job: 'guardian.nope' } },
    });

    expect(responder.visibleText).toContain('does not exist');
    expect(h.lock.runs).toHaveLength(0);
  });

  it('does not let a manual trigger defeat the job’s duplicate suppression', async () => {
    /*
     * The scheduler's lock stops two *concurrent* runs. It cannot stop two
     * sequential ones — only the job's own cooldown does that. This is the test
     * that would catch someone "fixing" a quiet digest by removing it.
     */
    await h.repositories.cases.open({
      guildId: TEST_GUILD_ID,
      origin: 'moderator',
      openedBy: TEST_USER_IDS.moderator,
      summary: 'Something that has been sitting for a while.',
    });
    const stored = h.repositories.cases.cases[0];
    if (!stored) throw new Error('seed failed');
    h.repositories.cases.cases[0] = {
      ...stored,
      updatedAt: new Date(Date.now() - 9 * 86_400_000),
    };

    const options = {
      commandName: 'guardian',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    } as const;

    await h.dispatch(options);
    await h.dispatch(options);

    expect(h.lock.runs).toHaveLength(2);
    expect(h.messaging.sent).toHaveLength(1);
  });
});
