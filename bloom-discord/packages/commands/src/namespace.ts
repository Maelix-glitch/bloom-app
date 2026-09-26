import { bloomError, type BotName } from '@bloom/shared-types';

/**
 * Command namespacing.
 *
 * Three applications in one server share a single `/` autocomplete list. The
 * brief asks for namespacing without "80 top-level commands", which means two
 * tiers:
 *
 *   • A small set of **verbs** that members use constantly and should be able to
 *     type without a prefix: /verify, /checkin, /report, /feedback.
 *   • Everything else grouped under the owning bot: /guardian …, /companion …,
 *     /labs …, using subcommands and subcommand groups.
 *
 * Discord's own limits push the same way: 100 top-level commands per app, but
 * only 25 subcommands per group, so the grouping has to be deliberate rather
 * than a dumping ground.
 */

/** Top-level names each bot may claim outside its own namespace. */
export const RESERVED_TOP_LEVEL: Readonly<Record<BotName, readonly string[]>> = {
  guardian: [
    'guardian',
    'verify',
    'reverify',
    'onboarding',
    'member-status',
    'warn',
    'warnings',
    'timeout',
    'untimeout',
    'kick',
    'ban',
    'unban',
    'purge',
    'slowmode',
    'lock',
    'unlock',
    'report',
    'incident',
  ],
  companion: [
    'companion',
    'checkin',
    'win',
    'achievement',
    'milestone',
    'challenge',
    'rewards',
  ],
  labs: ['labs', 'beta', 'test', 'feedback', 'feature', 'experiment', 'release'],
};

/**
 * Names that must never be claimed by more than one bot.
 *
 * Computed rather than hand-maintained, because a hand-maintained list of
 * conflicts is a list that goes stale the first time someone adds a command.
 */
export function findNamespaceCollisions(): readonly {
  name: string;
  bots: readonly BotName[];
}[] {
  const owners = new Map<string, BotName[]>();
  for (const [bot, names] of Object.entries(RESERVED_TOP_LEVEL) as [
    BotName,
    readonly string[],
  ][]) {
    for (const name of names) {
      const list = owners.get(name) ?? [];
      list.push(bot);
      owners.set(name, list);
    }
  }
  return [...owners.entries()]
    .filter(([, bots]) => bots.length > 1)
    .map(([name, bots]) => ({ name, bots }));
}

/** Discord's rules for a slash command name. Checked before registration, not after. */
const COMMAND_NAME_PATTERN = /^[-_a-z0-9]{1,32}$/;

export function assertValidCommandName(name: string): void {
  if (!COMMAND_NAME_PATTERN.test(name)) {
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint: `Command name "${name}" is invalid. Discord requires 1–32 characters, lowercase, using only letters, digits, hyphen and underscore.`,
      details: { command: name },
    });
  }
}

/** Is this bot allowed to own this top-level name? */
export function assertNamespaceOwnership(bot: BotName, name: string): void {
  assertValidCommandName(name);

  const owner = (
    Object.entries(RESERVED_TOP_LEVEL) as [BotName, readonly string[]][]
  ).find(([, names]) => names.includes(name));

  if (!owner) {
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint: `"/${name}" is not in any bot's reserved namespace. Add it to RESERVED_TOP_LEVEL for ${bot} — the list is the record of who owns which name, and skipping it is how two bots end up claiming the same command.`,
      details: { command: name, bot },
    });
  }

  if (owner[0] !== bot) {
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint: `"/${name}" is reserved for ${owner[0]}, but ${bot} tried to register it. Two applications registering the same command name in one guild gives members two identical entries with no way to tell them apart.`,
      details: { command: name, bot, owner: owner[0] },
    });
  }
}
