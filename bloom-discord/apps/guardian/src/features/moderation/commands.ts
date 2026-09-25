import {
  bloomError,
  isCaseStatus,
  isReportCategory,
  REPORT_CATEGORY_LABELS,
  type CaseStatus,
  type ChannelId,
  type GuildId,
  type MessageId,
  type ReportCategory,
  type UserId,
} from '@bloom/shared-types';
import {
  allOf,
  requireAdministrator,
  requireModerator,
  type AuthorizationPolicy,
} from '@bloom/permissions';
import type { BloomMessage } from '@bloom/embeds';
import { rateLimitError } from '@bloom/security';
import { parseDuration } from '@bloom/utils';
import type {
  BloomCommand,
  CommandInvocation,
  SubcommandContribution,
} from '@bloom/commands';
import type { GuardianDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * Moderation commands.
 *
 * ## Why some are bare and some are namespaced
 *
 * The brief warns against eighty top-level commands, and `/guardian …` is the
 * default. Six moderation verbs are exempt: `/warn`, `/timeout`, `/untimeout`,
 * `/kick`, `/ban`, `/purge`.
 *
 * The reason is the situation they are used in. During an active incident a
 * moderator is typing while something is still happening, and
 * `/guardian moderation timeout` costs real seconds against
 * `/timeout`. Everything that is review rather than response — cases, notes,
 * history, unbans, channel settings — is namespaced, because nobody needs to
 * reach those in a hurry.
 *
 * `/unban` is namespaced despite pairing with `/ban` for exactly this reason:
 * the person is not in the server and nothing is on fire.
 *
 * ## Authorization
 *
 * Two layers, and both are required.
 *
 *   • The `policy` here decides whether the actor may run the command.
 *   • `checkModerationTarget`, inside the service, decides whether they may use
 *     it on that person. It is not called from these handlers, so no future
 *     command can forget it.
 */

const moderatorOnly: AuthorizationPolicy = allOf(requireModerator());
const administratorOnly: AuthorizationPolicy = allOf(requireAdministrator());

function guildOf(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'A moderation command reached a handler without a guild id.',
    });
  }
  return id;
}

function requiredUser(invocation: CommandInvocation, option = 'member'): UserId {
  const user = invocation.options.getUser(option);
  if (!user) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Choose a member.' });
  }
  if (user.isBot) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'Bots are not moderated through Bloom.',
      operatorHint:
        'Remove a misbehaving integration from Server Settings → Integrations instead.',
    });
  }
  return user.id;
}

function requiredReason(invocation: CommandInvocation): string {
  const reason = invocation.options.getString('reason');
  if (!reason || reason.trim().length === 0) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'A reason is required.',
    });
  }
  return reason;
}

function optionalCaseNumber(invocation: CommandInvocation): number | null {
  return invocation.options.getInteger('case');
}

function channelOf(invocation: CommandInvocation): ChannelId {
  const explicit = invocation.options.getChannel('channel');
  if (explicit) return explicit.id;

  const current = invocation.channelId;
  if (!current) {
    throw bloomError('CHANNEL_NOT_FOUND', {
      userMessage: 'Run this in the channel you want to change, or name one.',
    });
  }
  return current;
}

/**
 * Spend the moderator's action budget.
 *
 * A durable limiter, not an in-process one. The thing it guards against is a
 * compromised or panicking staff account running destructive commands in a
 * loop, and an in-memory bucket would reset on the restart that such an
 * incident tends to cause.
 */
async function spendBudget(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<void> {
  const decision = await deps.moderationLimiter.consume(invocation.actor.userId);
  const limited = rateLimitError(decision);
  if (!limited.ok) throw limited.error;
}

const REASON_OPTION = {
  name: 'reason',
  description: 'Why. The member sees this, and it goes in the audit log.',
  type: 'string',
  required: true,
  minLength: 3,
  maxLength: 480,
} as const;

const CASE_OPTION = {
  name: 'case',
  description: 'Attach this action to an existing case number.',
  type: 'integer',
  required: false,
  minValue: 1,
} as const;

// -----------------------------------------------------------------------------
// /warn
// -----------------------------------------------------------------------------

export const warnCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  policy: moderatorOnly,
  spec: {
    name: 'warn',
    description: 'Record a warning against a member.',
    guildOnly: true,
    defaultMemberPermissions: 'none',
    options: [
      { name: 'member', description: 'Who to warn.', type: 'user', required: true },
      REASON_OPTION,
      CASE_OPTION,
    ],
  },
  async execute(invocation, deps): Promise<BloomMessage> {
    await spendBudget(invocation, deps);
    const outcome = await deps.moderation.warn({
      guildId: guildOf(invocation),
      actor: invocation.actor,
      targetId: requiredUser(invocation),
      reason: requiredReason(invocation),
      caseNumber: optionalCaseNumber(invocation),
      correlationId: invocation.correlationId,
    });

    return copy.actionConfirmed({
      action: 'warn',
      targetId: outcome.record.subjectId ?? requiredUser(invocation),
      reason: outcome.record.reason,
      memberNotified: outcome.memberNotified,
      ...(outcome.activeWarnings === undefined
        ? {}
        : { activeWarnings: outcome.activeWarnings }),
      caseNumber: optionalCaseNumber(invocation),
    });
  },
};

// -----------------------------------------------------------------------------
// /timeout and /untimeout
// -----------------------------------------------------------------------------

export const timeoutCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  policy: moderatorOnly,
  spec: {
    name: 'timeout',
    description: 'Temporarily stop a member from posting.',
    guildOnly: true,
    defaultMemberPermissions: 'none',
    options: [
      { name: 'member', description: 'Who to time out.', type: 'user', required: true },
      {
        name: 'duration',
        description: 'How long, e.g. 10m, 2h, 7d. Discord’s maximum is 28 days.',
        type: 'string',
        required: true,
        maxLength: 16,
      },
      REASON_OPTION,
      CASE_OPTION,
    ],
  },
  async execute(invocation, deps): Promise<BloomMessage> {
    await spendBudget(invocation, deps);

    const raw = invocation.options.getString('duration') ?? '';
    const parsed = parseDuration(raw);
    if (!parsed.ok) throw parsed.error;

    const targetId = requiredUser(invocation);
    const outcome = await deps.moderation.timeout({
      guildId: guildOf(invocation),
      actor: invocation.actor,
      targetId,
      reason: requiredReason(invocation),
      durationMs: parsed.value,
      caseNumber: optionalCaseNumber(invocation),
      correlationId: invocation.correlationId,
    });

    return copy.actionConfirmed({
      action: 'timeout',
      targetId,
      reason: outcome.record.reason,
      memberNotified: outcome.memberNotified,
      caseNumber: optionalCaseNumber(invocation),
      ...(outcome.record.expiresAt
        ? { extra: copy.until(outcome.record.expiresAt) }
        : {}),
    });
  },
};

export const untimeoutCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  policy: moderatorOnly,
  spec: {
    name: 'untimeout',
    description: 'Lift a member’s timeout early.',
    guildOnly: true,
    defaultMemberPermissions: 'none',
    options: [
      { name: 'member', description: 'Who to release.', type: 'user', required: true },
      REASON_OPTION,
    ],
  },
  async execute(invocation, deps): Promise<BloomMessage> {
    const targetId = requiredUser(invocation);
    const outcome = await deps.moderation.removeTimeout({
      guildId: guildOf(invocation),
      actor: invocation.actor,
      targetId,
      reason: requiredReason(invocation),
      correlationId: invocation.correlationId,
    });

    return copy.actionConfirmed({
      action: 'untimeout',
      targetId,
      reason: outcome.record.reason,
      memberNotified: outcome.memberNotified,
    });
  },
};

// -----------------------------------------------------------------------------
// /kick and /ban
// -----------------------------------------------------------------------------

export const kickCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  policy: moderatorOnly,
  spec: {
    name: 'kick',
    description: 'Remove a member from the server.',
    guildOnly: true,
    defaultMemberPermissions: 'none',
    options: [
      { name: 'member', description: 'Who to remove.', type: 'user', required: true },
      REASON_OPTION,
      CASE_OPTION,
    ],
  },
  async execute(invocation, deps): Promise<BloomMessage> {
    await spendBudget(invocation, deps);
    const targetId = requiredUser(invocation);

    const outcome = await deps.moderation.kick({
      guildId: guildOf(invocation),
      actor: invocation.actor,
      targetId,
      reason: requiredReason(invocation),
      caseNumber: optionalCaseNumber(invocation),
      correlationId: invocation.correlationId,
    });

    return copy.actionConfirmed({
      action: 'kick',
      targetId,
      reason: outcome.record.reason,
      memberNotified: outcome.memberNotified,
      caseNumber: optionalCaseNumber(invocation),
    });
  },
};

/**
 * `/ban` is Administrator-only.
 *
 * Every other action here is reversible or time-bounded. A ban with message
 * deletion is neither: the messages are gone and the member cannot return
 * without staff intervention. Moderators escalate a case instead, which is what
 * `ESCALATED` is for.
 */
export const banCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  policy: administratorOnly,
  spec: {
    name: 'ban',
    description: 'Ban a member or a user id from the server.',
    guildOnly: true,
    defaultMemberPermissions: 'none',
    options: [
      { name: 'member', description: 'Who to ban.', type: 'user', required: true },
      REASON_OPTION,
      {
        name: 'delete-hours',
        description: 'Hours of their recent messages to delete. 0 keeps everything.',
        type: 'integer',
        required: false,
        minValue: 0,
        maxValue: 168,
      },
      CASE_OPTION,
    ],
  },
  async execute(invocation, deps): Promise<BloomMessage> {
    await spendBudget(invocation, deps);
    const targetId = requiredUser(invocation);
    const deleteHours = invocation.options.getInteger('delete-hours') ?? 0;

    const outcome = await deps.moderation.ban({
      guildId: guildOf(invocation),
      actor: invocation.actor,
      targetId,
      reason: requiredReason(invocation),
      deleteMessageSeconds: deleteHours * 3600,
      caseNumber: optionalCaseNumber(invocation),
      correlationId: invocation.correlationId,
    });

    return copy.actionConfirmed({
      action: 'ban',
      targetId,
      reason: outcome.record.reason,
      memberNotified: outcome.memberNotified,
      caseNumber: optionalCaseNumber(invocation),
      ...(deleteHours > 0
        ? { extra: `**Messages deleted** — the last ${String(deleteHours)} hour(s).` }
        : {}),
    });
  },
};

// -----------------------------------------------------------------------------
// /purge
// -----------------------------------------------------------------------------

export const purgeCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  policy: administratorOnly,
  spec: {
    name: 'purge',
    description: 'Bulk-delete recent messages in this channel.',
    guildOnly: true,
    defaultMemberPermissions: 'none',
    options: [
      {
        name: 'count',
        description: 'How many messages to remove, 1–100.',
        type: 'integer',
        required: true,
        minValue: 1,
        maxValue: 100,
      },
      REASON_OPTION,
      {
        name: 'member',
        description: 'Only delete messages from this member.',
        type: 'user',
        required: false,
      },
    ],
  },
  async execute(invocation, deps): Promise<BloomMessage> {
    await spendBudget(invocation, deps);

    const count = invocation.options.getInteger('count');
    if (count === null) {
      throw bloomError('INVALID_INPUT', { userMessage: 'Say how many messages.' });
    }

    const channelId = channelOf(invocation);
    const author = invocation.options.getUser('member');

    const { result } = await deps.moderation.purge({
      guildId: guildOf(invocation),
      actor: invocation.actor,
      channelId,
      limit: count,
      authorId: author?.id ?? null,
      reason: requiredReason(invocation),
      correlationId: invocation.correlationId,
    });

    return copy.purgeResult({
      channelId,
      deleted: result.deleted,
      requested: result.requested,
      skippedTooOld: result.skippedTooOld,
      authorId: author?.id ?? null,
    });
  },
};

export const moderationCommands: readonly BloomCommand<GuardianDeps>[] = [
  warnCommand,
  timeoutCommand,
  untimeoutCommand,
  kickCommand,
  banCommand,
  purgeCommand,
];

// -----------------------------------------------------------------------------
// /report — the one member-facing command in this feature
// -----------------------------------------------------------------------------

const REPORT_CATEGORY_CHOICES = (
  Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[]
).map((value) => ({ name: REPORT_CATEGORY_LABELS[value], value }));

export const reportCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  defer: true,
  ephemeral: true,
  // Any member may report, including one who is only part-way through
  // onboarding. Requiring a role would silence exactly the people most likely
  // to be targeted — new arrivals.
  policy: () => ({ ok: true, value: undefined }),
  spec: {
    name: 'report',
    description: 'Privately report a member or a message to the moderators.',
    guildOnly: true,
    options: [
      {
        name: 'category',
        description: 'What kind of problem this is.',
        type: 'string',
        required: true,
        choices: REPORT_CATEGORY_CHOICES,
      },
      {
        name: 'description',
        description: 'What happened, in your own words.',
        type: 'string',
        required: true,
        minLength: 10,
        maxLength: 1800,
      },
      {
        name: 'member',
        description: 'The member this is about, if there is one.',
        type: 'user',
        required: false,
      },
      {
        name: 'message-link',
        description: 'Link to a specific message, if there is one.',
        type: 'string',
        required: false,
        maxLength: 120,
      },
    ],
  },

  async execute(invocation, deps): Promise<BloomMessage> {
    /*
     * Rate limited harder than staff commands.
     *
     * `/report` is reachable by anyone including a brand-new account, which
     * makes it the obvious way to flood the staff queue. The budget is small
     * and durable.
     */
    const decision = await deps.reportLimiter.consume(invocation.actor.userId);
    const limited = rateLimitError(decision);
    if (!limited.ok) throw limited.error;

    const category = invocation.options.getString('category');
    if (!isReportCategory(category)) {
      throw bloomError('INVALID_INPUT', { userMessage: 'Choose a category.' });
    }

    const description = invocation.options.getString('description') ?? '';
    const target = invocation.options.getUser('member');
    const link = invocation.options.getString('message-link');
    const reference = link ? parseMessageLink(link) : null;

    if (link && !reference) {
      throw bloomError('INVALID_INPUT', {
        userMessage:
          'That does not look like a Discord message link. Right-click a message and choose Copy Message Link.',
      });
    }

    const guildId = guildOf(invocation);
    if (reference && reference.guildId !== guildId) {
      throw bloomError('INVALID_INPUT', {
        userMessage:
          'That message link points at a different server. Bloom moderators can only act on messages posted here.',
        details: { link_guild_id: reference.guildId },
      });
    }

    const result = await deps.cases.submitReport({
      guildId,
      reporter: invocation.actor,
      category,
      description,
      targetUserId: target?.id ?? null,
      targetChannelId: reference?.channelId ?? null,
      targetMessageId: reference?.messageId ?? null,
      correlationId: invocation.correlationId,
    });

    return copy.reportFiled(result.caseNumber, result.status, result.staffNotified);
  },
};

/**
 * Parse a Discord message link into its ids.
 *
 * Validated with a strict pattern rather than string splitting: this is
 * untrusted input that becomes a database reference, and the ids are what a
 * moderator will later click. A malformed link is refused, not stored.
 *
 * The guild id is returned rather than discarded so the caller can reject a
 * link from somewhere else. Discord links carry their origin, and a report
 * referencing a message in another server would send staff chasing a channel
 * that does not exist here.
 */
export interface ParsedMessageLink {
  readonly guildId: GuildId;
  readonly channelId: ChannelId;
  readonly messageId: MessageId;
}

const MESSAGE_LINK =
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d{17,20})\/(\d{17,20})\/(\d{17,20})$/;

export function parseMessageLink(link: string): ParsedMessageLink | null {
  const match = MESSAGE_LINK.exec(link.trim());
  if (!match) return null;

  const guildId = match[1];
  const channelId = match[2];
  const messageId = match[3];
  if (!guildId || !channelId || !messageId) return null;

  return {
    guildId: guildId as GuildId,
    channelId: channelId as ChannelId,
    messageId: messageId as MessageId,
  };
}

// -----------------------------------------------------------------------------
// /guardian contributions
// -----------------------------------------------------------------------------

export const moderationSubcommands: readonly SubcommandContribution<GuardianDeps>[] = [
  {
    group: 'case',
    spec: {
      name: 'view',
      description: 'Show a case in full.',
      options: [
        {
          name: 'number',
          description: 'The case number.',
          type: 'integer',
          required: true,
          minValue: 1,
        },
      ],
    },
    execute: viewCase,
  },
  {
    group: 'case',
    spec: {
      name: 'list',
      description: 'List cases, most urgent first.',
      options: [
        {
          name: 'status',
          description: 'Only show cases in this status.',
          type: 'string',
          required: false,
          choices: [
            { name: 'Open', value: 'OPEN' },
            { name: 'In review', value: 'IN_REVIEW' },
            { name: 'Escalated', value: 'ESCALATED' },
            { name: 'Resolved', value: 'RESOLVED' },
            { name: 'Closed', value: 'CLOSED' },
          ],
        },
      ],
    },
    execute: listCases,
  },
  {
    group: 'case',
    spec: {
      name: 'open',
      description: 'Open a case without a report.',
      options: [
        {
          name: 'summary',
          description: 'One line describing the case.',
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 280,
        },
        {
          name: 'member',
          description: 'The member the case concerns, if there is one.',
          type: 'user',
          required: false,
        },
      ],
    },
    execute: openCase,
  },
  {
    group: 'case',
    spec: {
      name: 'assign',
      description: 'Assign a case, or clear the assignment.',
      options: [
        {
          name: 'number',
          description: 'The case number.',
          type: 'integer',
          required: true,
          minValue: 1,
        },
        {
          name: 'member',
          description: 'Who owns it. Leave empty to unassign.',
          type: 'user',
          required: false,
        },
      ],
    },
    execute: assignCase,
  },
  {
    group: 'case',
    spec: {
      name: 'status',
      description: 'Move a case to another status.',
      options: [
        {
          name: 'number',
          description: 'The case number.',
          type: 'integer',
          required: true,
          minValue: 1,
        },
        {
          name: 'to',
          description: 'The new status.',
          type: 'string',
          required: true,
          choices: [
            { name: 'In review', value: 'IN_REVIEW' },
            { name: 'Escalated', value: 'ESCALATED' },
            { name: 'Resolved', value: 'RESOLVED' },
            { name: 'Closed', value: 'CLOSED' },
          ],
        },
        {
          name: 'note',
          description: 'What was decided. Required when resolving.',
          type: 'string',
          required: false,
          maxLength: 1000,
        },
      ],
    },
    execute: changeCaseStatus,
  },
  {
    group: 'case',
    spec: {
      name: 'note',
      description: 'Add a note to a case.',
      options: [
        {
          name: 'number',
          description: 'The case number.',
          type: 'integer',
          required: true,
          minValue: 1,
        },
        {
          name: 'note',
          description: 'The note.',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 1900,
        },
      ],
    },
    execute: addCaseNote,
  },
  {
    group: 'member',
    spec: {
      name: 'history',
      description: 'Show a member’s moderation history.',
      options: [
        { name: 'member', description: 'Who.', type: 'user', required: true },
      ],
    },
    execute: memberHistory,
  },
  {
    group: 'member',
    spec: {
      name: 'note',
      description: 'Record a private note about a member. They are not told.',
      options: [
        { name: 'member', description: 'Who.', type: 'user', required: true },
        {
          name: 'note',
          description: 'The note. Staff-visible only.',
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 480,
        },
      ],
    },
    execute: addMemberNote,
  },
  {
    group: 'member',
    spec: {
      name: 'clear-warnings',
      description: 'Clear a member’s active warnings. The history is kept.',
      options: [
        { name: 'member', description: 'Who.', type: 'user', required: true },
        REASON_OPTION,
      ],
    },
    execute: clearWarnings,
  },
  {
    group: 'member',
    spec: {
      name: 'unban',
      description: 'Lift a ban by user id.',
      options: [
        {
          name: 'user-id',
          description: 'The banned account’s id.',
          type: 'string',
          required: true,
          minLength: 17,
          maxLength: 20,
        },
        REASON_OPTION,
      ],
    },
    execute: unban,
  },
  {
    group: 'channel',
    spec: {
      name: 'slowmode',
      description: 'Set how often members may post in a channel.',
      options: [
        {
          name: 'seconds',
          description: 'Seconds between messages. 0 turns it off.',
          type: 'integer',
          required: true,
          minValue: 0,
          maxValue: 21600,
        },
        {
          name: 'channel',
          description: 'Which channel. Defaults to this one.',
          type: 'channel',
          required: false,
        },
      ],
    },
    execute: setSlowmode,
  },
  {
    group: 'channel',
    spec: {
      name: 'lock',
      description: 'Stop members posting in a channel.',
      options: [
        REASON_OPTION,
        {
          name: 'channel',
          description: 'Which channel. Defaults to this one.',
          type: 'channel',
          required: false,
        },
      ],
    },
    execute: lockChannel,
  },
  {
    group: 'channel',
    spec: {
      name: 'unlock',
      description: 'Restore posting in a locked channel.',
      options: [
        REASON_OPTION,
        {
          name: 'channel',
          description: 'Which channel. Defaults to this one.',
          type: 'channel',
          required: false,
        },
      ],
    },
    execute: unlockChannel,
  },
];

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

function caseNumberOf(invocation: CommandInvocation): number {
  const number = invocation.options.getInteger('number');
  if (number === null) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Give a case number.' });
  }
  return number;
}

async function viewCase(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guildId = guildOf(invocation);
  const number = caseNumberOf(invocation);

  const detail = await deps.cases.detail(guildId, number);
  if (!detail) return copy.caseNotFound(number);

  const actions = await deps.repositories.moderation.listForCase(detail.case.id);

  return copy.caseDetail({
    case: detail.case,
    events: detail.events,
    report: detail.report,
    actions,
  });
}

async function listCases(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guildId = guildOf(invocation);
  const raw = invocation.options.getString('status');
  const status: CaseStatus | null = isCaseStatus(raw) ? raw : null;

  const [cases, counts] = await Promise.all([
    deps.cases.list(guildId, { status }),
    deps.cases.counts(guildId),
  ]);

  return copy.caseList(cases, counts);
}

async function openCase(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const summary = invocation.options.getString('summary') ?? '';
  const member = invocation.options.getUser('member');

  const caseRow = await deps.cases.openCase({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    summary,
    subjectId: member?.id ?? null,
    correlationId: invocation.correlationId,
  });

  return copy.caseDetail({
    case: caseRow,
    events: [],
    report: null,
    actions: [],
  });
}

async function assignCase(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const number = caseNumberOf(invocation);
  const member = invocation.options.getUser('member');

  const updated = await deps.cases.assign({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    caseNumber: number,
    assignee: member?.id ?? null,
    correlationId: invocation.correlationId,
  });

  if (!updated) return copy.caseNotFound(number);
  return copy.caseAssigned(number, updated.assignedTo);
}

async function changeCaseStatus(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const number = caseNumberOf(invocation);
  const raw = invocation.options.getString('to');
  if (!isCaseStatus(raw)) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Choose a status.' });
  }

  const note = invocation.options.getString('note');
  if (raw === 'RESOLVED' && (!note || note.trim().length === 0)) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'Say what was decided when resolving a case.',
    });
  }

  const outcome = await deps.cases.changeStatus({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    caseNumber: number,
    to: raw,
    note,
    correlationId: invocation.correlationId,
  });

  switch (outcome.kind) {
    case 'applied':
      return copy.caseStatusChanged(number, outcome.from, outcome.to);
    case 'not_found':
      return copy.caseNotFound(number);
    default:
      return copy.caseStatusRefused(number, outcome);
  }
}

async function addCaseNote(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const number = caseNumberOf(invocation);
  const added = await deps.cases.addNote({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    caseNumber: number,
    body: invocation.options.getString('note') ?? '',
    correlationId: invocation.correlationId,
  });

  return added ? copy.noteAdded(number) : copy.caseNotFound(number);
}

async function memberHistory(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guildId = guildOf(invocation);
  const targetId = requiredUser(invocation);

  const [actions, summary] = await Promise.all([
    deps.repositories.moderation.listForSubject(guildId, targetId, { limit: 10 }),
    deps.repositories.moderation.summarise(guildId, targetId),
  ]);

  return copy.memberHistory({ targetId, actions, summary });
}

async function addMemberNote(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const targetId = requiredUser(invocation);
  const outcome = await deps.moderation.note({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    targetId,
    reason: invocation.options.getString('note') ?? '',
    correlationId: invocation.correlationId,
  });

  return copy.actionConfirmed({
    action: 'note',
    targetId,
    reason: outcome.record.reason,
    memberNotified: false,
  });
}

async function clearWarnings(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const targetId = requiredUser(invocation);
  const outcome = await deps.moderation.clearWarnings({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    targetId,
    reason: requiredReason(invocation),
    correlationId: invocation.correlationId,
  });

  return copy.warningsCleared(targetId, outcome.cleared);
}

async function unban(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const raw = invocation.options.getString('user-id') ?? '';
  if (!/^\d{17,20}$/.test(raw)) {
    throw bloomError('INVALID_INPUT', {
      userMessage: 'That is not a user id. Enable Developer Mode and copy the id.',
    });
  }

  const targetId = raw as UserId;
  const outcome = await deps.moderation.unban({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    targetId,
    reason: requiredReason(invocation),
    correlationId: invocation.correlationId,
  });

  return copy.actionConfirmed({
    action: 'unban',
    targetId,
    reason: outcome.record.reason,
    memberNotified: false,
    ...(outcome.wasBanned
      ? {}
      : { extra: 'That user was not banned, so nothing changed. The check is recorded.' }),
  });
}

async function setSlowmode(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const seconds = invocation.options.getInteger('seconds');
  if (seconds === null) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Give a number of seconds.' });
  }

  const channelId = channelOf(invocation);
  await deps.moderation.slowmode({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    channelId,
    seconds,
    reason: `Slowmode set to ${String(seconds)}s`,
    correlationId: invocation.correlationId,
  });

  return copy.slowmodeSet(channelId, seconds);
}

async function lockChannel(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const channelId = channelOf(invocation);
  const outcome = await deps.moderation.setLock({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    channelId,
    locked: true,
    reason: requiredReason(invocation),
    correlationId: invocation.correlationId,
  });

  return copy.lockChanged({ channelId, locked: true, changed: outcome.changed });
}

async function unlockChannel(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const channelId = channelOf(invocation);
  const outcome = await deps.moderation.setLock({
    guildId: guildOf(invocation),
    actor: invocation.actor,
    channelId,
    locked: false,
    reason: requiredReason(invocation),
    correlationId: invocation.correlationId,
  });

  const restored = outcome.record.metadata['restored_to'];
  return copy.lockChanged({
    channelId,
    locked: false,
    changed: outcome.changed,
    ...(typeof restored === 'string' ? { restoredTo: restored } : {}),
  });
}
