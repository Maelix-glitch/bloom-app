import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { BloomMessage } from '@bloom/embeds';
import { requireStaffCapability } from '@bloom/permissions';
import {
  bloomError,
  type CorrelationId,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import {
  ACTIVITY_KINDS,
  CHALLENGE_METRICS,
  type ActivityKind,
  type ChallengeMetric,
  type CommunityActivity,
} from '@bloom/database';
import { sanitiseUserText } from '@bloom/utils';
import type { CompanionDeps } from '../../deps.js';
import { ACTIVITY_MAX_DAYS, ACTIVITY_REWARD_LIMIT } from './rules.js';
import * as copy from './messages.js';

/**
 * Challenges and events, as commands.
 *
 * ## Why these are `admin challenge-create` and not `admin challenge create`
 *
 * Discord supports exactly one level of nesting inside a subcommand group:
 * `command → group → subcommand`, and nothing deeper. `/companion admin
 * challenge create` would be four levels and cannot be registered at all.
 *
 * The alternatives were a new top-level `challenge` group — which would have
 * moved economic mutations out of `admin`, where every other audited staff
 * action lives, and collided `/companion event list` between the staff view
 * and the member view — or one `community` subcommand with a `type` option,
 * which makes every other option conditionally meaningful and unvalidatable
 * by Discord. Hyphenating inside `admin` keeps the staff surface in one
 * place and leaves the member group free.
 *
 * ## What these handlers are allowed to do
 *
 * Read options, reject nonsense with a sentence, and call `CommunityService`.
 * Nothing here writes a balance, a participant row or an audit event
 * directly — the service owns completion, payment and the audit trail,
 * because a second place that pays points is a second place that can forget
 * to record why.
 */

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 1000;
const MINUTES_PER_DAY = 1440;

const ID_OPTION = {
  name: 'id',
  description: 'The activity id, shown when it was created.',
  type: 'string',
  required: true,
  maxLength: 64,
} as const;

const OUTCOME_OPTION = {
  name: 'outcome',
  description: 'Completed pays the people who joined. Cancelled pays nobody.',
  type: 'string',
  required: true,
  choices: [
    { name: 'Completed — it happened', value: 'completed' },
    { name: 'Cancelled — it did not', value: 'cancelled' },
  ],
} as const;

function requireGuild(invocation: CommandInvocation): GuildId {
  const guildId = invocation.guildId;
  if (!guildId) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'Community commands are only available in a server.',
    });
  }
  return guildId;
}

/**
 * Read a title or description from a member-supplied option.
 *
 * Sanitised before it goes anywhere near an embed, because an activity
 * description is the one free-text field in this feature that gets posted
 * publicly, and `@everyone` in a title would otherwise be a staff command
 * that pings the server.
 */
function readText(invocation: CommandInvocation, name: string, max: number): string {
  const raw = invocation.options.getString(name) ?? '';
  const text = sanitiseUserText(raw, max);
  if (text.trim().length < 3) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: `\`${name}\` must be at least 3 characters.`,
    });
  }
  return text;
}

/**
 * Resolve the window from "starts in N minutes, runs for M days".
 *
 * Relative offsets rather than a date string on purpose. A staff member in
 * Thiruvananthapuram typing `2026-03-01 19:00` means something different to
 * the server than to the database, and every timezone bug this platform
 * could have starts with parsing a human date. Offsets from the platform
 * clock have one interpretation.
 */
function readWindow(
  invocation: CommandInvocation,
  now: Date,
): { startsAt: Date; endsAt: Date } {
  const startsInMinutes = invocation.options.getInteger('starts_in_minutes') ?? 0;
  const lengthDays = invocation.options.getInteger('length_days') ?? 7;

  if (lengthDays < 1 || lengthDays > ACTIVITY_MAX_DAYS) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: `Length must be between 1 and ${String(ACTIVITY_MAX_DAYS)} days.`,
    });
  }

  const startsAt = new Date(now.getTime() + startsInMinutes * 60_000);
  const endsAt = new Date(startsAt.getTime() + lengthDays * MINUTES_PER_DAY * 60_000);
  return { startsAt, endsAt };
}

function isChallengeMetric(value: string | null): value is ChallengeMetric {
  return value !== null && (CHALLENGE_METRICS as readonly string[]).includes(value);
}

function isActivityKind(value: string): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- *
 * Staff
 * -------------------------------------------------------------------------- */

async function createActivity(
  invocation: CommandInvocation,
  deps: CompanionDeps,
  kind: ActivityKind,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const now = deps.community.clock();
  const { startsAt, endsAt } = readWindow(invocation, now);

  const metric = invocation.options.getString('metric');
  if (kind === 'challenge' && !isChallengeMetric(metric)) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: 'Pick one of the supported challenge metrics.',
    });
  }

  const activity = await deps.community.create({
    guildId,
    kind,
    title: readText(invocation, 'title', TITLE_MAX),
    description: readText(invocation, 'description', DESCRIPTION_MAX),
    startsAt,
    endsAt,
    targetMetric: kind === 'challenge' && isChallengeMetric(metric) ? metric : null,
    targetAmount: kind === 'challenge' ? invocation.options.getInteger('target') : null,
    capacity: kind === 'event' ? invocation.options.getInteger('capacity') : null,
    rewardPoints: invocation.options.getInteger('reward') ?? 0,
    achievementKey: invocation.options.getString('achievement'),
    actorId: invocation.actor.userId,
    correlationId: invocation.correlationId,
  });

  return copy.created(activity);
}

async function listActivities(
  invocation: CommandInvocation,
  deps: CompanionDeps,
  kind: ActivityKind,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const limit = invocation.options.getInteger('limit') ?? undefined;

  const activities = await deps.repositories.community.list(guildId, {
    kind,
    ...(limit === undefined ? {} : { limit }),
  });

  /*
   * Counts are fetched per activity rather than in one aggregate query. The
   * list is hard-capped at 25 by the repository, so this is at most 25 small
   * indexed reads — and a JOIN with a GROUP BY would have had to be correct
   * about withdrawn rows in two places instead of one.
   */
  const entries = await Promise.all(
    activities.map(async (activity) => ({
      activity,
      counts: await deps.repositories.community.counts(activity.id),
    })),
  );

  return copy.staffList(entries, kind);
}

async function closeActivity(
  invocation: CommandInvocation,
  deps: CompanionDeps,
  kind: ActivityKind,
): Promise<BloomMessage> {
  const guildId = requireGuild(invocation);
  const activityId = invocation.options.getString('id') ?? '';
  const outcome = invocation.options.getString('outcome');

  if (outcome !== 'completed' && outcome !== 'cancelled') {
    throw bloomError('INVALID_INPUT', {
      operatorHint: 'Outcome must be completed or cancelled.',
    });
  }

  /*
   * Checked before closing so that `/companion admin event-close` cannot
   * close a challenge by id. Without it the two commands would be
   * interchangeable, and the capability a staff member was granted for one
   * would silently cover the other.
   */
  const existing = await deps.repositories.community.byId(guildId, activityId);
  if (existing?.kind !== kind) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: `No ${kind} with id ${activityId} in this server.`,
    });
  }

  const result = await deps.community.close({
    guildId,
    activityId,
    outcome,
    actorId: invocation.actor.userId,
    correlationId: invocation.correlationId,
  });

  return copy.closedResult(result);
}

/* -------------------------------------------------------------------------- *
 * Members
 * -------------------------------------------------------------------------- */

async function memberEventList(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const entries = await deps.community.listForMember(
    requireGuild(invocation),
    invocation.actor.userId,
    'event',
  );
  return copy.eventList(entries);
}

async function memberEventInfo(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const info = await deps.community.info(
    requireGuild(invocation),
    invocation.options.getString('id') ?? '',
    invocation.actor.userId,
  );
  return info === null ? copy.notFound() : copy.eventInfo(info);
}

async function memberEventJoin(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const result = await deps.community.join({
    guildId: requireGuild(invocation),
    activityId: invocation.options.getString('id') ?? '',
    userId: invocation.actor.userId,
    correlationId: invocation.correlationId,
  });

  switch (result.kind) {
    case 'joined':
      return copy.joined(result.activity);
    case 'already_joined':
      return copy.alreadyJoined(result.activity);
    case 'full':
      return copy.full(result.activity);
    case 'closed':
      return copy.closed(result.activity);
    case 'not_found':
      return copy.notFound();
  }
}

async function memberEventLeave(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const result = await deps.community.leave({
    guildId: requireGuild(invocation),
    activityId: invocation.options.getString('id') ?? '',
    userId: invocation.actor.userId,
  });

  switch (result.kind) {
    case 'withdrawn':
      return copy.left(result.activity);
    case 'not_joined':
      return copy.notJoined(result.activity);
    case 'closed':
      return copy.closed(result.activity);
    case 'not_found':
      return copy.notFound();
  }
}

async function memberChallenges(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const entries = await deps.community.challengeProgress(
    requireGuild(invocation),
    invocation.actor.userId,
  );
  return copy.challengeList(entries);
}

/* -------------------------------------------------------------------------- *
 * Option sets
 * -------------------------------------------------------------------------- */

const SHARED_CREATE_OPTIONS = [
  {
    name: 'title',
    description: 'Short name, shown in the announcement.',
    type: 'string',
    required: true,
    maxLength: TITLE_MAX,
  },
  {
    name: 'description',
    description: 'What it is, in a sentence or two.',
    type: 'string',
    required: true,
    maxLength: DESCRIPTION_MAX,
  },
] as const;

const SHARED_SCHEDULE_OPTIONS = [
  {
    name: 'length_days',
    description: `How many days it runs. 1 to ${String(ACTIVITY_MAX_DAYS)}.`,
    type: 'integer',
    required: true,
    minValue: 1,
    maxValue: ACTIVITY_MAX_DAYS,
  },
  {
    name: 'starts_in_minutes',
    description: 'Delay before it starts. 0 for right now.',
    type: 'integer',
    required: false,
    minValue: 0,
    maxValue: ACTIVITY_MAX_DAYS * MINUTES_PER_DAY,
  },
  {
    name: 'reward',
    description: `Points for finishing. 0 for none. Up to ${String(ACTIVITY_REWARD_LIMIT)}.`,
    type: 'integer',
    required: false,
    minValue: 0,
    maxValue: ACTIVITY_REWARD_LIMIT,
  },
  {
    name: 'achievement',
    description: 'An achievement key to unlock. Recognition only, pays nothing.',
    type: 'string',
    required: false,
    maxLength: 61,
  },
] as const;

const LIMIT_OPTION = {
  name: 'limit',
  description: 'How many to show. Up to 25.',
  type: 'integer',
  required: false,
  minValue: 1,
  maxValue: 25,
} as const;

/**
 * Pay anyone a completed activity still owes.
 *
 * Under `staff.community.manage` rather than `staff.rewards.award`: this
 * settles a debt the activity already committed to when staff created it,
 * and the amount is not the operator's to choose. Someone who may run an
 * activity may finish paying for it. It is still the narrowest fit — a
 * moderator holds neither capability.
 */
async function retryPayments(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const result = await deps.community.reconcile({
    guildId: requireGuild(invocation),
    activityId: invocation.options.getString('id') ?? '',
    actorId: invocation.actor.userId,
    correlationId: invocation.correlationId,
  });

  return copy.reconciled(result);
}

export const communityStaffSubcommands: readonly SubcommandContribution<CompanionDeps>[] =
  [
    {
      group: 'admin',
      /*
       * `staff.community.manage` — Founder and Administrator only. Moderators
       * do not hold it, and that is deliberate: creating an activity sets a
       * payout that the platform then makes automatically, which is an
       * economic act rather than a moderation one. The kernel also means the
       * Discord `ModerateMembers` bit grants nothing here.
       */
      policy: requireStaffCapability('staff.community.manage'),
      spec: {
        name: 'challenge-create',
        description: 'Create a community challenge. Announced once, always audited.',
        options: [
          ...SHARED_CREATE_OPTIONS,
          {
            name: 'metric',
            description: 'What it counts.',
            type: 'string',
            required: true,
            choices: [
              { name: 'Check-ins', value: 'check_ins' },
              { name: 'People invited who stayed', value: 'qualified_referrals' },
              { name: 'Events completed', value: 'event_participation' },
            ],
          },
          {
            name: 'target',
            description: 'How many are needed to finish.',
            type: 'integer',
            required: true,
            minValue: 1,
            maxValue: 10_000,
          },
          ...SHARED_SCHEDULE_OPTIONS,
        ],
      },
      execute: (invocation, deps) => createActivity(invocation, deps, 'challenge'),
    },
    {
      group: 'admin',
      policy: requireStaffCapability('staff.rewards.read'),
      spec: {
        name: 'challenge-list',
        description: 'Challenges in this server, with participation.',
        options: [LIMIT_OPTION],
      },
      execute: (invocation, deps) => listActivities(invocation, deps, 'challenge'),
    },
    {
      group: 'admin',
      policy: requireStaffCapability('staff.community.manage'),
      spec: {
        name: 'challenge-close',
        description: 'Close a challenge. Always audited.',
        options: [ID_OPTION, OUTCOME_OPTION],
      },
      execute: (invocation, deps) => closeActivity(invocation, deps, 'challenge'),
    },
    {
      group: 'admin',
      policy: requireStaffCapability('staff.community.manage'),
      spec: {
        name: 'event-create',
        description: 'Create a community event. Announced once, always audited.',
        options: [
          ...SHARED_CREATE_OPTIONS,
          ...SHARED_SCHEDULE_OPTIONS,
          {
            name: 'capacity',
            description: 'Places available. Leave unset for no limit.',
            type: 'integer',
            required: false,
            minValue: 1,
            maxValue: 1000,
          },
        ],
      },
      execute: (invocation, deps) => createActivity(invocation, deps, 'event'),
    },
    {
      group: 'admin',
      policy: requireStaffCapability('staff.rewards.read'),
      spec: {
        name: 'event-list',
        description: 'Events in this server, with sign-ups and completions.',
        options: [LIMIT_OPTION],
      },
      execute: (invocation, deps) => listActivities(invocation, deps, 'event'),
    },
    {
      group: 'admin',
      policy: requireStaffCapability('staff.community.manage'),
      spec: {
        name: 'event-close',
        description: 'Close an event. Completing it pays everyone who joined.',
        options: [ID_OPTION, OUTCOME_OPTION],
      },
      execute: (invocation, deps) => closeActivity(invocation, deps, 'event'),
    },
    {
      group: 'admin',
      policy: requireStaffCapability('staff.community.manage'),
      spec: {
        name: 'event-retry-payments',
        description: 'Pay anyone a completed event still owes. Safe to run twice.',
        options: [ID_OPTION],
      },
      execute: retryPayments,
    },
  ];

export const communityMemberSubcommands: readonly SubcommandContribution<CompanionDeps>[] =
  [
    {
      group: 'event',
      spec: { name: 'list', description: 'Events you can join.' },
      execute: memberEventList,
    },
    {
      group: 'event',
      spec: {
        name: 'info',
        description: 'Details of one event.',
        options: [ID_OPTION],
      },
      execute: memberEventInfo,
    },
    {
      group: 'event',
      spec: {
        name: 'join',
        description: 'Put your name down for an event.',
        options: [ID_OPTION],
      },
      execute: memberEventJoin,
    },
    {
      group: 'event',
      spec: {
        name: 'leave',
        description: 'Take your name off an event.',
        options: [ID_OPTION],
      },
      execute: memberEventLeave,
    },
    {
      /*
       * Top level, alongside `/companion milestones` and
       * `/companion achievements`, because a challenge has nothing to join
       * and so has no verbs to group. Without this the feature would be
       * invisible to the people it is for.
       */
      spec: {
        name: 'challenges',
        description: 'Challenges running now, and how far along you are.',
      },
      execute: memberChallenges,
    },
  ];

export const COMMUNITY_GROUP_DESCRIPTION = 'Community events: see them, join them.';

/** Exported for the architecture tests, which assert the surface is closed. */
export const COMMUNITY_ACTIVITY_KINDS = ACTIVITY_KINDS;
export type { ActivityKind, CommunityActivity, UserId, CorrelationId };
export { isActivityKind };
