import { beforeEach, describe, expect, it } from 'vitest';
import {
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_USER_IDS,
  testSubject,
  type RecordingResponder,
} from '@bloom/testing';
import { isSlashCommandSpec } from '@bloom/commands';
import { companionHarness, type CompanionHarness } from './companion.harness.js';
import { companionCommandSpecs } from './commands.js';

/**
 * Companion's command surface.
 *
 * Two things are under test here. The first is that the *shared* job commands
 * work when mounted on a second bot — that is the claim the extraction makes,
 * and a surface that only ever ran inside Guardian would not have proven it.
 * The second is Companion's boundary: it must not have acquired any command it
 * has no business owning.
 */

const REFUSAL = 'Not available to you';
const JOB_KEY = 'companion.checkin.daily_prompt';

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

let h: CompanionHarness;

beforeEach(() => {
  h = companionHarness();
  h.guild.withMember(TEST_USER_IDS.member);
  h.guild.withMember(TEST_USER_IDS.moderator, { roleIds: [TEST_ROLE_IDS.moderator] });
  h.guild.withMember(TEST_USER_IDS.administrator, {
    roleIds: [TEST_ROLE_IDS.administrator],
  });
});

describe('Companion’s namespace', () => {
  it('publishes three top-level commands, and no more', () => {
    /*
     * Three bots in one server must not produce a wall of commands. Companion
     * earns top-level names by need: `/checkin` and `/win` are things a member
     * does most days, and typing `/companion checkin` every morning is the kind
     * of friction that quietly kills a habit feature. Everything else lives
     * under the namespace.
     */
    expect(companionCommandSpecs.map((spec) => spec.name).sort()).toEqual([
      'checkin',
      'companion',
      'win',
    ]);
  });

  it('owns no moderation or role command', () => {
    const everySubcommand = companionCommandSpecs.flatMap((spec) => {
      // A context-menu entry has neither, and narrowing is how the compiler
      // knows that — `?? []` on a union reads as defensive but types as `any`.
      if (!isSlashCommandSpec(spec)) return [];
      return [
        ...(spec.subcommands ?? []).map((sub) => sub.name),
        ...(spec.groups ?? []).map((group) => group.name),
      ];
    });

    // The boundary, asserted rather than assumed. Companion has no role service
    // and no moderation service in its deps, so these could not be implemented
    // — but a stray command that *looks* like it can moderate is its own harm.
    for (const forbidden of [
      'warn',
      'timeout',
      'kick',
      'ban',
      'purge',
      'roles',
      'case',
    ]) {
      expect(everySubcommand).not.toContain(forbidden);
    }
  });
});

describe('/companion jobs — the shared surface on a second bot', () => {
  it('lists Companion’s own job, not Guardian’s', async () => {
    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asModerator(),
    });

    expectAllowed(responder);
    expect(responder.visibleText).toContain(JOB_KEY);
    expect(responder.visibleText).not.toContain('guardian.');
  });

  it('refuses a plain member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asMember(),
    });

    expectRefused(responder);
  });

  it('lets an administrator trigger the prompt', async () => {
    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    expectAllowed(responder);
    expect(h.messaging.sent).toHaveLength(1);
  });

  it('refuses a moderator on run', async () => {
    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asModerator(),
      options: { strings: { job: JOB_KEY } },
    });

    expectRefused(responder);
    expect(h.messaging.sent).toHaveLength(0);
  });
});

describe('/companion jobs disable', () => {
  it('stops the job actually running', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'disable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    await h.scheduler.runNow(JOB_KEY);

    // The assertion that matters: not that a row was written, but that the
    // switch has the effect it claims.
    expect(h.messaging.sent).toHaveLength(0);
  });

  it('refuses a moderator — silencing a community-facing job is an admin act', async () => {
    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'disable',
      actor: asModerator(),
      options: { strings: { job: JOB_KEY } },
    });

    expectRefused(responder);
    expect(await h.jobSettings.read(TEST_GUILD_ID, JOB_KEY)).toEqual({ enabled: null });
  });

  it('records who disabled it', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'disable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    const event = h.repositories.audit.events.find(
      (entry) => entry.event === 'jobs.disabled',
    );
    expect(event?.actorId).toBe(TEST_USER_IDS.administrator);
    expect(event?.details?.['job_key']).toBe(JOB_KEY);

    // And on the setting row itself, which is what someone reads three weeks
    // later when asking why the prompt stopped.
    expect(h.repositories.settings.writes.at(-1)?.updatedBy).toBe(
      TEST_USER_IDS.administrator,
    );
  });

  it('shows as switched off in the listing, not as missing', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'disable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'list',
      actor: asModerator(),
    });

    // A job that vanished when switched off would leave an operator unable to
    // tell "disabled on purpose" from "not deployed".
    expect(responder.visibleText).toContain(JOB_KEY);
    expect(responder.visibleText).toContain('switched off for this server');
  });

  it('reports a skipped run rather than pretending a manual trigger worked', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'disable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'run',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    expect(responder.visibleText).toContain('skipped');
    expect(h.messaging.sent).toHaveLength(0);
  });
});

describe('/companion jobs enable', () => {
  it('lets the job run again', async () => {
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'disable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'enable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    await h.scheduler.runNow(JOB_KEY);

    expect(h.messaging.sent).toHaveLength(1);
  });

  /*
   * Two switches sit above the per-guild one. Reporting a plain "enabled" while
   * the job still cannot run would be precisely the fake status the brief
   * forbids.
   */
  it('admits when the global switch still blocks it', async () => {
    h = companionHarness({ scheduledMessages: false });
    h.guild.withMember(TEST_USER_IDS.administrator, {
      roleIds: [TEST_ROLE_IDS.administrator],
    });

    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'enable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    expect(responder.visibleText).toContain('FEATURE_SCHEDULED_MESSAGES is off');
  });

  it('admits when the job is disabled by configuration', async () => {
    h = companionHarness({ checkInChannel: null });
    h.guild.withMember(TEST_USER_IDS.administrator, {
      roleIds: [TEST_ROLE_IDS.administrator],
    });

    const { responder } = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'jobs',
      subcommand: 'enable',
      actor: asAdmin(),
      options: { strings: { job: JOB_KEY } },
    });

    expect(responder.visibleText).toContain('disabled by configuration');
  });
});
