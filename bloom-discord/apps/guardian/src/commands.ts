import { assertNamespaceOwnership, type CommandSpec } from '@bloom/commands';
import { onboardingCommands } from './features/onboarding/commands.js';

/**
 * Guardian's complete command set.
 *
 * One list, assembled from the feature modules, consumed by two callers: the
 * registry the dispatcher routes through, and the registration script that
 * tells Discord what exists. Sharing the list is what keeps those two in step —
 * a registered command with no handler is a failed interaction with no
 * explanation, and it is entirely avoidable.
 */
export const guardianCommands = [...onboardingCommands] as const;

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
