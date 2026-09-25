import {
  assertNamespaceOwnership,
  namespaceCommand,
  type BloomCommand,
  type CommandSpec,
} from '@bloom/commands';
import { allOf, requireModerator } from '@bloom/permissions';
import {
  onboardingCommands,
  onboardingSubcommands,
} from './features/onboarding/commands.js';
import {
  moderationCommands,
  moderationSubcommands,
  reportCommand,
} from './features/moderation/commands.js';
import { JOBS_GROUP_DESCRIPTION, jobSubcommands } from '@bloom/discord';
import type { GuardianDeps } from './deps.js';

/**
 * The `/guardian` namespace.
 *
 * Assembled from the subcommands each feature contributes, rather than owned by
 * any one of them. Onboarding brings `status`, `overview`, `onboarding …` and
 * `roles audit`; moderation brings `case …`, `member …` and `channel …`.
 *
 * Doing it this way means a feature never edits another feature's file to add a
 * branch, the published spec and the handler table are derived from one list so
 * they cannot drift, and two features contributing the same path throws at
 * import rather than silently shadowing.
 *
 * The single policy is deliberate. Every branch of `/guardian` is staff-facing,
 * and a per-subcommand policy is one somebody eventually forgets — inheritance
 * makes the safe thing the default. Individual handlers may still demand more:
 * `/ban` and `/purge` are Administrator-only on their own commands.
 */
export const guardianNamespaceCommand: BloomCommand<GuardianDeps> = namespaceCommand({
  bot: 'guardian',
  name: 'guardian',
  description: 'Bloom Guardian administration.',
  // A client-side hint only. An administrator can override it per role and per
  // channel, so `policy` below is the actual boundary.
  defaultMemberPermissions: 'none',
  policy: allOf(requireModerator()),
  groupDescriptions: {
    onboarding: 'Move members through the onboarding lifecycle.',
    roles: 'Role configuration diagnostics.',
    case: 'Open, work and close moderation cases.',
    member: 'A member’s moderation record.',
    channel: 'Slowmode and channel locking.',
    jobs: JOBS_GROUP_DESCRIPTION,
  },
  contributions: [
    ...onboardingSubcommands,
    ...moderationSubcommands,
    // Shared with Companion and Labs: one implementation of the job surface,
    // parameterised by deps, rather than a copy per bot.
    ...jobSubcommands<GuardianDeps>(),
  ],
});

/**
 * Guardian's complete command set.
 *
 * One list, consumed by two callers: the registry the dispatcher routes
 * through, and the registration script that tells Discord what exists. Sharing
 * the list is what keeps those two in step — a registered command with no
 * handler is a failed interaction with no explanation.
 */
export const guardianCommands = [
  ...onboardingCommands,
  ...moderationCommands,
  reportCommand,
  guardianNamespaceCommand,
] as const;

export const guardianCommandSpecs: readonly CommandSpec[] = guardianCommands.map(
  (command) => command.spec,
);

/**
 * Fail at import time if a name is not Guardian's to claim.
 *
 * `CommandRegistry` already checks this when the bot boots, but the
 * registration script never constructs a registry — it reads the specs and
 * talks to Discord. Without this, `pnpm commands:register` could publish a name
 * belonging to Companion, and the collision would only surface as two identical
 * entries in a member's command list.
 */
for (const spec of guardianCommandSpecs) {
  assertNamespaceOwnership('guardian', spec.name);
}
