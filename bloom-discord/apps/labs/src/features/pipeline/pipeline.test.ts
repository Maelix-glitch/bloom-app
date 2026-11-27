import { beforeEach, describe, expect, it } from 'vitest';
import type { RecordingResponder } from '@bloom/testing';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import { labsHarness, type LabsHarness } from '../../labs.harness.js';

/**
 * The Labs pipeline, through the real dispatcher.
 *
 * The properties under test are the doctrine, not the plumbing: backing is
 * a toggle one member can never double, a shipped feature takes no backing,
 * cohort membership is a row and nothing else (no role moves, ever), staff
 * writers refuse members, and a published release is readable back as the
 * latest.
 */

const REFUSAL = 'Not available to you';

function expectRefused(responder: RecordingResponder): void {
  expect(responder.visibleText).toContain(REFUSAL);
}

let h: LabsHarness;

const MEMBER = TEST_USER_IDS.member;
const OTHER = TEST_USER_IDS.newcomer;
const MODERATOR = TEST_USER_IDS.moderator;

const asMember = (userId = MEMBER): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: MODERATOR, roles: ['moderator'] });

beforeEach(() => {
  h = labsHarness();
  h.guild.withMember(MEMBER, { roleIds: [TEST_ROLE_IDS.bloomMember] });
  h.guild.withMember(OTHER, { roleIds: [TEST_ROLE_IDS.bloomMember] });
  h.guild.withMember(MODERATOR, { roleIds: [TEST_ROLE_IDS.moderator] });
});

async function addFeature(name = 'Dark mode'): Promise<void> {
  const { responder } = await h.dispatch({
    commandName: 'labs',
    subcommandGroup: 'admin',
    subcommand: 'feature-add',
    actor: asModerator(),
    options: { strings: { name } },
  });
  expect(responder.visibleText).toContain('Feature added');
}

describe('feature pipeline', () => {
  it('starts empty and says so', async () => {
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'feature',
      subcommand: 'status',
      actor: asMember(),
    });
    expect(responder.visibleText).toContain('Nothing is on the pipeline yet');
  });

  it('refuses a member trying to add a feature', async () => {
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'feature-add',
      actor: asMember(),
      options: { strings: { name: 'Dark mode' } },
    });
    expectRefused(responder);
    expect(h.repositories.labs.features).toHaveLength(0);
  });

  it('adds a feature once; the second add reports the existing one', async () => {
    await addFeature();
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'feature-add',
      actor: asModerator(),
      options: { strings: { name: 'dark mode' } },
    });
    expect(responder.visibleText).toContain('Already on the pipeline');
    expect(h.repositories.labs.features).toHaveLength(1);
  });

  it('moves a feature along the pipeline', async () => {
    await addFeature();
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'feature-status',
      actor: asModerator(),
      options: { strings: { name: 'Dark mode', status: 'building' } },
    });
    expect(responder.visibleText).toContain('Building');
    expect(h.repositories.labs.features[0]?.status).toBe('building');
  });
});

describe('backing', () => {
  it('toggles: vote adds, vote again withdraws, counts stay honest', async () => {
    await addFeature();

    const first = await h.dispatch({
      commandName: 'labs',
      subcommand: 'vote',
      actor: asMember(),
      options: { strings: { feature: 'Dark mode' } },
    });
    expect(first.responder.visibleText).toContain('Backing recorded');
    expect(first.responder.visibleText).toContain('1 backing');

    const second = await h.dispatch({
      commandName: 'labs',
      subcommand: 'vote',
      actor: asMember(OTHER),
      options: { strings: { feature: 'dark mode' } },
    });
    expect(second.responder.visibleText).toContain('2 backing');

    const withdrawn = await h.dispatch({
      commandName: 'labs',
      subcommand: 'vote',
      actor: asMember(),
      options: { strings: { feature: 'Dark mode' } },
    });
    expect(withdrawn.responder.visibleText).toContain('Backing withdrawn');
    expect(withdrawn.responder.visibleText).toContain('1 backing');
    expect(h.repositories.labs.votes).toHaveLength(1);
  });

  it('refuses backing for a shipped feature', async () => {
    await addFeature();
    await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'feature-status',
      actor: asModerator(),
      options: { strings: { name: 'Dark mode', status: 'shipped' } },
    });

    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommand: 'vote',
      actor: asMember(),
      options: { strings: { feature: 'Dark mode' } },
    });
    expect(responder.visibleText).toContain('Backing is closed');
    expect(h.repositories.labs.votes).toHaveLength(0);
  });

  it('answers an unknown feature honestly', async () => {
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommand: 'vote',
      actor: asMember(),
      options: { strings: { feature: 'Teleportation' } },
    });
    expect(responder.visibleText).toContain('No feature by that name');
  });
});

describe('cohorts', () => {
  async function createCohort(closed = false): Promise<void> {
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'cohort-create',
      actor: asModerator(),
      options: {
        strings: { name: 'Sleep round 2' },
        booleans: closed ? { closed: true } : {},
      },
    });
    expect(responder.visibleText).toContain('Cohort created');
  }

  it('joins and leaves, counting members as it goes', async () => {
    await createCohort();

    const joined = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'cohort',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { name: 'Sleep round 2' } },
    });
    expect(joined.responder.visibleText).toContain('You are on the list');
    expect(joined.responder.visibleText).toContain('1 members');

    const again = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'cohort',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { name: 'sleep round 2' } },
    });
    expect(again.responder.visibleText).toContain('Already a member');

    const left = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'cohort',
      subcommand: 'leave',
      actor: asMember(),
      options: { strings: { name: 'Sleep round 2' } },
    });
    expect(left.responder.visibleText).toContain('You left the cohort');
    expect(h.repositories.labs.cohortMembers).toHaveLength(0);
  });

  it('refuses joins to a closed cohort but keeps existing members', async () => {
    await createCohort(true);
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'cohort',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { name: 'Sleep round 2' } },
    });
    expect(responder.visibleText).toContain('closed');
    expect(h.repositories.labs.cohortMembers).toHaveLength(0);
  });

  it('never touches a Discord role when a member joins', async () => {
    await createCohort();
    await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'cohort',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { name: 'Sleep round 2' } },
    });
    // Membership is a database row. The member's roles are exactly what
    // they were: Labs has no role service and this is the proof at the
    // surface a regression would show up on.
    const member = await h.guild.getMember(TEST_GUILD_ID, MEMBER);
    expect(member?.roleIds).toEqual([TEST_ROLE_IDS.bloomMember]);
  });
});

describe('release notes', () => {
  it('has an honest empty state', async () => {
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'release',
      subcommand: 'latest',
      actor: asMember(),
    });
    expect(responder.visibleText).toContain('No release notes yet');
  });

  it('publishes, announces, and reads back as the latest', async () => {
    const published = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'release-publish',
      actor: asModerator(),
      options: {
        strings: {
          version: '1.4.0',
          title: 'Cycle insights',
          notes: 'Cycle insights are live for everyone.',
        },
      },
    });
    expect(published.responder.visibleText).toContain('Release notes published');
    expect(
      h.messaging.sent.some(
        (message) => message.channelId === TEST_CHANNEL_IDS.releaseNotes,
      ),
    ).toBe(true);

    const latest = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'release',
      subcommand: 'latest',
      actor: asMember(),
    });
    expect(latest.responder.visibleText).toContain('1.4.0');
    expect(latest.responder.visibleText).toContain('Cycle insights');
  });

  it('refuses a member trying to publish', async () => {
    const { responder } = await h.dispatch({
      commandName: 'labs',
      subcommandGroup: 'admin',
      subcommand: 'release-publish',
      actor: asMember(),
      options: {
        strings: { version: '9.9.9', title: 'Nope', notes: 'Should not land.' },
      },
    });
    expectRefused(responder);
    expect(h.repositories.labs.releases).toHaveLength(0);
  });
});
