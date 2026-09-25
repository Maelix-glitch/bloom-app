import { bloomError, type BotName } from '@bloom/shared-types';

/**
 * Who acts on what.
 *
 * All three bots sit in the same guild and will receive the same gateway
 * events. The brief is explicit that they must not duplicate actions: when a
 * member joins, Guardian owns the welcome; Companion must not also send one.
 *
 * "Just don't write that handler" is not a control — it is a convention that
 * survives exactly until the third person joins the project. So ownership is
 * declared here and enforced at registration: a bot that registers a handler
 * for an event it does not own fails at startup.
 */
export const GATEWAY_EVENTS = [
  'guildMemberAdd',
  'guildMemberRemove',
  'guildMemberUpdate',
  'guildBanAdd',
  'guildBanRemove',
  'guildCreate',
  'guildDelete',
  'roleUpdate',
  'roleDelete',
  'channelDelete',
  'interactionCreate',
  'clientReady',
  'error',
  'warn',
  'shardDisconnect',
  'shardReconnecting',
  'shardResume',
] as const;

export type GatewayEventName = (typeof GATEWAY_EVENTS)[number];

export interface EventOwnership {
  /** The bot permitted to take action. `null` means every bot handles it locally. */
  readonly owner: BotName | null;
  /** Bots allowed to observe without acting — telemetry, cache warming. */
  readonly observers: readonly BotName[];
  readonly rationale: string;
}

export const EVENT_OWNERSHIP: Readonly<Record<GatewayEventName, EventOwnership>> = {
  guildMemberAdd: {
    owner: 'guardian',
    observers: [],
    rationale:
      'Guardian owns onboarding end to end: it creates the member record, sets the initial state and posts the verification prompt. A second welcome from Companion would be the exact duplication the brief forbids. Companion greets members later, on onboarding completion, driven by a domain event rather than by the gateway.',
  },
  guildMemberRemove: {
    owner: 'guardian',
    observers: [],
    rationale:
      'Marks the member as departed and preserves their onboarding and moderation history, so leaving and rejoining does not reset either.',
  },
  guildMemberUpdate: {
    owner: 'guardian',
    observers: [],
    rationale:
      'Keeps the observed role cache current. Guardian is the only bot with the GuildMembers intent, so it is the only bot that receives this.',
  },
  guildBanAdd: {
    owner: 'guardian',
    observers: [],
    rationale:
      'Reconciles bans applied outside the bot — directly in the Discord client — into the audit trail, so the moderation history is complete rather than only covering actions taken through commands.',
  },
  guildBanRemove: {
    owner: 'guardian',
    observers: [],
    rationale: 'Same reconciliation, for unbans.',
  },
  guildCreate: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale:
      'Each bot records its own availability and runs its own configuration preflight when it becomes available in a guild. Local bookkeeping, no shared side effect.',
  },
  guildDelete: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale: 'Each bot notes that it lost access. Local bookkeeping.',
  },
  roleUpdate: {
    owner: 'guardian',
    observers: [],
    rationale:
      'Role positions moving is what silently breaks role assignment. Guardian re-runs its hierarchy audit and warns before a member hits the failure.',
  },
  roleDelete: {
    owner: 'guardian',
    observers: [],
    rationale:
      'A deleted configured role must be surfaced loudly — otherwise onboarding fails with ROLE_NOT_FOUND on the next join and nobody knows why.',
  },
  channelDelete: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale:
      'Each bot checks whether a channel it depends on has gone, and warns. A bot posting into a deleted channel fails silently otherwise.',
  },
  interactionCreate: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale:
      'Discord routes an interaction only to the application that owns the command, so there is no duplication to prevent here. Each bot handles its own.',
  },
  clientReady: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale:
      'Per-process lifecycle. Note the name: discord.js renamed "ready" to "clientReady", and "ready" is removed in the next major.',
  },
  error: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale: 'Per-process error reporting.',
  },
  warn: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale: 'Per-process library warnings.',
  },
  shardDisconnect: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale: 'Per-process connection state, surfaced in /health.',
  },
  shardReconnecting: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale: 'Per-process connection state.',
  },
  shardResume: {
    owner: null,
    observers: ['guardian', 'companion', 'labs'],
    rationale: 'Per-process connection state.',
  },
};

/**
 * Self-check on the map itself.
 *
 * An event with both an owner and observers is ambiguous — it reads as "one bot
 * acts" and "several bots act" simultaneously, and which one the dispatcher
 * enforces becomes an implementation detail. An event with neither can never be
 * handled by anyone, which is a silent hole. Both are caught by a test rather
 * than discovered in production.
 */
export function findOwnershipGaps(): readonly {
  event: GatewayEventName;
  problem: string;
}[] {
  const problems: { event: GatewayEventName; problem: string }[] = [];

  for (const event of GATEWAY_EVENTS) {
    const ownership = EVENT_OWNERSHIP[event];

    if (ownership.owner !== null && ownership.observers.length > 0) {
      problems.push({
        event,
        problem: `Has both an owner (${ownership.owner}) and observers; pick one model.`,
      });
    }

    if (ownership.owner === null && ownership.observers.length === 0) {
      problems.push({
        event,
        problem: 'Has neither an owner nor observers; nobody can handle it.',
      });
    }
  }

  return problems;
}

export function canHandle(bot: BotName, event: GatewayEventName): boolean {
  const ownership = EVENT_OWNERSHIP[event];
  if (ownership.owner === null) return ownership.observers.includes(bot);
  return ownership.owner === bot;
}

export function assertCanHandle(bot: BotName, event: GatewayEventName): void {
  if (canHandle(bot, event)) return;

  const ownership = EVENT_OWNERSHIP[event];
  throw bloomError('CONFIGURATION_ERROR', {
    operatorHint: `${bot} registered a handler for "${event}", which is owned by ${ownership.owner ?? 'nobody'}. ${ownership.rationale}`,
    details: { bot, event, owner: ownership.owner },
  });
}
