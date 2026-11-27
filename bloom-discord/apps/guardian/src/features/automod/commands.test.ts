import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordingResponder } from '@bloom/testing';
import { TEST_GUILD_ID, TEST_ROLE_IDS, TEST_USER_IDS, testSubject } from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

/**
 * `/guardian automod …`, through the real dispatcher.
 *
 * Authorization is the point of this layer, so the tests dispatch rather
 * than calling handlers: a member must be refused by the policy, not by
 * the handler remembering to check.
 */

const REFUSAL = 'Not available to you';

function expectRefused(responder: RecordingResponder): void {
  expect(responder.visibleText).toContain(REFUSAL);
}

function expectAllowed(responder: RecordingResponder): void {
  expect(responder.visibleText).not.toContain(REFUSAL);
}

let h: GuardianHarness;

const MEMBER = TEST_USER_IDS.member;
const MODERATOR = TEST_USER_IDS.moderator;

const asMember = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MEMBER, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MODERATOR, roles: ['moderator'] });

beforeEach(() => {
  h = guardianHarness();
  h.guild.withMember(MEMBER, { roleIds: [TEST_ROLE_IDS.bloomMember] });
  h.guild.withMember(MODERATOR, { roleIds: [TEST_ROLE_IDS.moderator] });
});

describe('/guardian automod status', () => {
  it('refuses a member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'status',
      actor: asMember(),
    });
    expectRefused(responder);
  });

  it('reports the switch honestly when it is off', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'status',
      actor: asModerator(),
    });
    expectAllowed(responder);
    expect(responder.visibleText).toContain('off');
  });
});

describe('/guardian automod threshold', () => {
  it('saves a policy that the service then enforces', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'threshold',
      actor: asModerator(),
      options: {
        strings: { rule: 'keyword', window: '1h', duration: '10m' },
        integers: { count: 3 },
      },
    });
    expectAllowed(responder);

    const status = await h.deps.automod.status(TEST_GUILD_ID);
    expect(status.policies).toHaveLength(1);
    expect(status.policies[0]?.triggerType).toBe('keyword');
    expect(status.policies[0]?.thresholdCount).toBe(3);
    expect(status.policies[0]?.windowSeconds).toBe(3600);
    expect(status.policies[0]?.timeoutSeconds).toBe(600);
  });

  it('refuses a member', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'threshold',
      actor: asMember(),
      options: {
        strings: { rule: 'all', window: '1h' },
        integers: { count: 3 },
      },
    });
    expectRefused(responder);
    expect(h.repositories.automod.policies).toHaveLength(0);
  });

  it('refuses a window longer than a week', async () => {
    const { responder } = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'threshold',
      actor: asModerator(),
      options: {
        strings: { rule: 'all', window: '30d' },
        integers: { count: 3 },
      },
    });
    expect(responder.visibleText).toContain('between');
    expect(h.repositories.automod.policies).toHaveLength(0);
  });
});

describe('/guardian automod exempt', () => {
  it('exempts a role, and says so plainly the second time', async () => {
    const role = {
      id: TEST_ROLE_IDS.betaTester,
      name: 'Beta',
      position: 30,
      managed: false,
    };
    const first = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'exempt',
      actor: asModerator(),
      options: { roles: { role } },
    });
    expectAllowed(first.responder);
    expect(first.responder.visibleText).toContain('now exempt');

    const second = await h.dispatch({
      commandName: 'guardian',
      subcommandGroup: 'automod',
      subcommand: 'exempt',
      actor: asModerator(),
      options: { roles: { role } },
    });
    expect(second.responder.visibleText).toContain('already exempt');
  });
});
