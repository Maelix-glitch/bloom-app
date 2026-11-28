import { beforeEach, describe, expect, it } from 'vitest';
import {
  unsafeSnowflake,
  type CorrelationId,
  type MessageId,
  type UserId,
} from '@bloom/shared-types';
import { newCorrelationId } from '@bloom/utils';
import type { AutoModerationExecutionPayload } from '@bloom/events';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_ROLE_IDS,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import { guardianHarness, type GuardianHarness } from '../../guardian.harness.js';

/**
 * Auto-moderation (design note 001).
 *
 * The properties worth defending are the note's own: nothing happens while
 * the switch is off; nothing is punished without a configured policy; the
 * ceiling is a timeout; staff and exempt roles are never escalated; a
 * redelivered event counts once; and no code path stores message content.
 */

let h: GuardianHarness;
let correlationId: CorrelationId;

const MEMBER = TEST_USER_IDS.member;
const MODERATOR = TEST_USER_IDS.moderator;
const CHANNEL = TEST_CHANNEL_IDS.dailyCheckIn;
const RULE_ID = '800000000000000001';

let messageSeq = 0;

function payload(
  overrides: Partial<AutoModerationExecutionPayload> = {},
): AutoModerationExecutionPayload {
  messageSeq += 1;
  return {
    guildId: TEST_GUILD_ID,
    userId: MEMBER,
    channelId: CHANNEL,
    messageId: unsafeSnowflake<MessageId>(
      `700000000000000${String(messageSeq).padStart(3, '0')}`,
    ),
    ruleId: RULE_ID,
    triggerType: 'keyword',
    discordAction: 'BLOCK_MESSAGE',
    matchedKeyword: 'badword',
    ...overrides,
  };
}

async function enable(): Promise<void> {
  await h.repositories.settings.setBotSetting(
    TEST_GUILD_ID,
    'guardian',
    'automod.enabled',
    true,
    TEST_USER_IDS.founder,
  );
}

async function setPolicy(
  thresholdCount = 3,
  windowSeconds = 3600,
  timeoutSeconds = 600,
): Promise<void> {
  await h.deps.automod.setThreshold({
    guildId: TEST_GUILD_ID,
    triggerType: null,
    channelId: null,
    thresholdCount,
    windowSeconds,
    timeoutSeconds,
    updatedBy: MODERATOR,
  });
}

function timeoutCalls(): number {
  return h.moderation.calls.filter((call) => call.action === 'timeout').length;
}

function alertsPosted(): number {
  return h.messaging.sent.filter(
    (message) => message.channelId === TEST_CHANNEL_IDS.moderation,
  ).length;
}

beforeEach(() => {
  h = guardianHarness();
  correlationId = newCorrelationId();
  messageSeq = 0;
  h.guild.withMember(MEMBER, { roleIds: [TEST_ROLE_IDS.bloomMember] });
  h.guild.withMember(MODERATOR, { roleIds: [TEST_ROLE_IDS.moderator] });
});

describe('the switch', () => {
  it('ignores executions entirely while off — not even a record', async () => {
    await setPolicy();
    await h.deps.automod.handleExecution(payload(), correlationId);
    expect(h.repositories.automod.events).toHaveLength(0);
    expect(timeoutCalls()).toBe(0);
    expect(alertsPosted()).toBe(0);
  });
});

describe('without a policy', () => {
  it('records and alerts, but never punishes', async () => {
    await enable();
    await h.deps.automod.handleExecution(payload(), correlationId);

    expect(h.repositories.automod.events).toHaveLength(1);
    expect(alertsPosted()).toBe(1);
    expect(timeoutCalls()).toBe(0);
    expect(h.repositories.moderation.actions).toHaveLength(0);
    expect(h.repositories.cases.cases).toHaveLength(0);
  });
});

describe('the ladder', () => {
  it('counts below the threshold and times out at it', async () => {
    await enable();
    await setPolicy(3);

    await h.deps.automod.handleExecution(payload(), correlationId);
    await h.deps.automod.handleExecution(payload(), correlationId);
    expect(timeoutCalls()).toBe(0);

    await h.deps.automod.handleExecution(payload(), correlationId);
    expect(timeoutCalls()).toBe(1);

    const action = h.repositories.moderation.actions.find(
      (row) => row.action === 'timeout',
    );
    expect(action).toBeDefined();
    // The one deliberate difference from a human action: no actor.
    expect(action?.actorId).toBeNull();
    expect(action?.subjectId).toBe(MEMBER);
    expect(action?.durationSeconds).toBe(600);
    expect(action?.metadata['source']).toBe('automod');

    const event = h.repositories.automod.events[2];
    expect(event?.ladderStep).toBe(1);
    expect(event?.moderationActionId).toBe(action?.id);

    const caseRow = h.repositories.cases.cases[0];
    expect(caseRow?.origin).toBe('automation');
    expect(caseRow?.openedBy).toBeNull();
    expect(event?.caseId).toBe(caseRow?.id);
    expect(alertsPosted()).toBe(1);
  });

  it('reuses the open case for the next crossing instead of opening a second', async () => {
    await enable();
    await setPolicy(2);
    await h.deps.automod.handleExecution(payload(), correlationId);
    await h.deps.automod.handleExecution(payload(), correlationId);
    await h.deps.automod.handleExecution(payload(), correlationId);

    expect(timeoutCalls()).toBe(2);
    expect(h.repositories.cases.cases).toHaveLength(1);
    expect(h.repositories.automod.events[2]?.ladderStep).toBe(2);
  });

  it('stops counting at the window edge', async () => {
    let now = new Date('2026-01-01T12:00:00.000Z');
    h = guardianHarness({ now: () => now });
    h.guild.withMember(MEMBER, { roleIds: [TEST_ROLE_IDS.bloomMember] });
    await enable();
    await setPolicy(3, 3600);

    await h.deps.automod.handleExecution(payload(), correlationId);
    await h.deps.automod.handleExecution(payload(), correlationId);

    now = new Date('2026-01-01T14:00:01.000Z'); // two hours later
    await h.deps.automod.handleExecution(payload(), correlationId);
    expect(timeoutCalls()).toBe(0);
  });

  it('counts a redelivered event once', async () => {
    await enable();
    await setPolicy(2);
    const event = payload();
    await h.deps.automod.handleExecution(event, correlationId);
    await h.deps.automod.handleExecution(event, correlationId);
    await h.deps.automod.handleExecution(payload(), correlationId);

    expect(h.repositories.automod.events).toHaveLength(2);
    expect(timeoutCalls()).toBe(1);
  });

  it('does not act twice when Discord already timed the member out', async () => {
    await enable();
    await setPolicy(1);
    await h.deps.automod.handleExecution(
      payload({ discordAction: 'TIMEOUT' }),
      correlationId,
    );

    expect(timeoutCalls()).toBe(0);
    expect(h.repositories.moderation.actions).toHaveLength(0);
    expect(h.repositories.cases.cases).toHaveLength(1);
    expect(alertsPosted()).toBe(1);
  });

  it('alerts instead of acting when the member outranks the bot', async () => {
    await enable();
    await setPolicy(1);
    h.guild.withBotAtPosition(5); // below bloomMember (10)
    await h.deps.automod.handleExecution(payload(), correlationId);

    expect(timeoutCalls()).toBe(0);
    expect(h.repositories.moderation.actions).toHaveLength(0);
    expect(h.repositories.cases.cases).toHaveLength(1);
    expect(alertsPosted()).toBe(1);
  });

  it('retries a refused timeout once, then succeeds', async () => {
    await enable();
    await setPolicy(1);
    h.moderation.failNext = new Error('Discord hiccup');
    await h.deps.automod.handleExecution(payload(), correlationId);
    expect(timeoutCalls()).toBe(1);
  });

  it('alerts and opens a case when Discord refuses twice — and does not record a timeout that never happened', async () => {
    await enable();
    await setPolicy(1);
    h.moderation.failAlways = new Error('Discord is down');
    await h.deps.automod.handleExecution(payload(), correlationId);

    expect(timeoutCalls()).toBe(0);
    expect(h.repositories.moderation.actions).toHaveLength(0);
    expect(h.repositories.cases.cases).toHaveLength(1);
    expect(alertsPosted()).toBe(1);
  });
});

describe('exemptions', () => {
  it('never escalates a staff member, however often they trigger', async () => {
    await enable();
    await setPolicy(1);
    for (let i = 0; i < 3; i++) {
      await h.deps.automod.handleExecution(payload({ userId: MODERATOR }), correlationId);
    }
    expect(h.repositories.automod.events).toHaveLength(3);
    expect(timeoutCalls()).toBe(0);
    expect(alertsPosted()).toBe(0);
  });

  it('never escalates a member holding an exempt role', async () => {
    await enable();
    await setPolicy(1);
    const exemptUser: UserId = unsafeSnowflake<UserId>('900000000000001008');
    h.guild.withMember(exemptUser, { roleIds: [TEST_ROLE_IDS.betaTester] });
    await h.deps.automod.addExemptRole({
      guildId: TEST_GUILD_ID,
      roleId: TEST_ROLE_IDS.betaTester,
      updatedBy: MODERATOR,
    });

    await h.deps.automod.handleExecution(payload({ userId: exemptUser }), correlationId);
    expect(timeoutCalls()).toBe(0);
    expect(alertsPosted()).toBe(0);
  });
});

describe('review', () => {
  async function timedOutEventId(): Promise<string> {
    await enable();
    await setPolicy(1);
    await h.deps.automod.handleExecution(payload(), correlationId);
    const event = h.repositories.automod.events[0];
    if (!event) throw new Error('expected an event');
    return event.id;
  }

  function moderatorSubject() {
    return testSubject({ userId: MODERATOR, roles: ['moderator'] });
  }

  it('confirm records the decision and changes nothing else', async () => {
    const eventId = await timedOutEventId();
    const result = await h.deps.automod.review({
      eventId,
      decision: 'confirmed',
      reviewer: moderatorSubject(),
      correlationId,
    });
    expect(result.kind).toBe('recorded');
    expect(h.repositories.automod.events[0]?.reviewStatus).toBe('confirmed');
    expect(timeoutCalls()).toBe(1);
  });

  it('reverse lifts the timeout, revokes the record and tells the member', async () => {
    const eventId = await timedOutEventId();
    const result = await h.deps.automod.review({
      eventId,
      decision: 'reversed',
      reviewer: moderatorSubject(),
      correlationId,
    });
    expect(result.kind).toBe('recorded');
    expect(h.moderation.calls.filter((call) => call.action === 'untimeout')).toHaveLength(
      1,
    );
    const action = h.repositories.moderation.actions[0];
    expect(action?.revokedAt).not.toBeNull();
    expect(action?.revokedBy).toBe(MODERATOR);
    expect(
      h.messaging.directMessages.filter((dm) => dm.userId === MEMBER),
    ).not.toHaveLength(0);
    expect(h.repositories.automod.events[0]?.reviewStatus).toBe('reversed');
  });

  it('escalate marks the case for an administrator', async () => {
    const eventId = await timedOutEventId();
    const result = await h.deps.automod.review({
      eventId,
      decision: 'escalated',
      reviewer: moderatorSubject(),
      correlationId,
    });
    expect(result.kind).toBe('recorded');
    expect(h.repositories.cases.cases[0]?.status).toBe('ESCALATED');
  });

  it('a second review is refused — the first decision stands', async () => {
    const eventId = await timedOutEventId();
    await h.deps.automod.review({
      eventId,
      decision: 'confirmed',
      reviewer: moderatorSubject(),
      correlationId,
    });
    const second = await h.deps.automod.review({
      eventId,
      decision: 'reversed',
      reviewer: moderatorSubject(),
      correlationId,
    });
    expect(second.kind).toBe('already_reviewed');
    expect(h.repositories.automod.events[0]?.reviewStatus).toBe('confirmed');
    expect(h.moderation.calls.filter((call) => call.action === 'untimeout')).toHaveLength(
      0,
    );
  });
});

describe('privacy', () => {
  it('stores no message content, even when a payload is polluted with it', async () => {
    await enable();
    await setPolicy(1);
    const dirty = {
      ...payload(),
      content: 'the member typed this',
      matchedContent: 'and this',
    } as AutoModerationExecutionPayload;
    await h.deps.automod.handleExecution(dirty, correlationId);

    const event = h.repositories.automod.events[0];
    expect(event).toBeDefined();
    expect(JSON.stringify(event)).not.toContain('the member typed this');
    expect(JSON.stringify(event)).not.toContain('matchedContent');
    const action = h.repositories.moderation.actions[0];
    expect(JSON.stringify(action?.metadata ?? {})).not.toContain('the member typed this');
  });
});

describe('commands surface', () => {
  it('status reports the switch, volume and policies', async () => {
    await enable();
    await setPolicy(3);
    const status = await h.deps.automod.status(TEST_GUILD_ID);
    expect(status.enabled).toBe(true);
    expect(status.policies).toHaveLength(1);
    expect(status.policies[0]?.thresholdCount).toBe(3);
  });
});
