import {
  assertNamespaceOwnership,
  namespaceCommand,
  type BloomCommand,
  type CommandSpec,
} from '@bloom/commands';
import { JOBS_GROUP_DESCRIPTION, jobSubcommands } from '@bloom/discord';
import { allOf, requireModerator } from '@bloom/permissions';
import type { CompanionDeps } from './deps.js';

/**
 * The `/companion` namespace.
 *
 * Assembled the same way `/guardian` is, and from the same shared contribution
 * for the `jobs` group — the brief forbids duplicated code between bots, and a
 * second copy of the job surface would drift the first time one bot gained a
 * field the other did not.
 *
 * Staff-facing for now. Companion's member-facing surface arrives with the
 * features that need it; a namespace gated at Moderator is the safe default to
 * grow from, since widening a policy later is a deliberate act and narrowing
 * one is a breaking change nobody notices.
 */
export const companionNamespaceCommand: BloomCommand<CompanionDeps> = namespaceCommand({
  bot: 'companion',
  name: 'companion',
  description: 'Bloom Companion administration.',
  // A client-side hint only. An administrator can override it per role and per
  // channel, so `policy` below is the actual boundary.
  defaultMemberPermissions: 'none',
  policy: allOf(requireModerator()),
  groupDescriptions: {
    jobs: JOBS_GROUP_DESCRIPTION,
  },
  contributions: [...jobSubcommands<CompanionDeps>()],
});

/**
 * Companion's complete command set.
 *
 * One list, consumed by the registry the dispatcher routes through and by the
 * registration script that tells Discord what exists. Sharing the list is what
 * keeps those two in step — a registered command with no handler is a failed
 * interaction with no explanation.
 */
export const companionCommands: readonly BloomCommand<CompanionDeps>[] = [
  companionNamespaceCommand,
];

export const companionCommandSpecs: readonly CommandSpec[] = companionCommands.map(
  (command) => command.spec,
);

/*
 * Every published name belongs to Companion.
 *
 * Checked at import, because the registration script never constructs a
 * registry — it reads the specs and talks to Discord. Without this,
 * `pnpm commands:register` could publish a name belonging to Guardian, and the
 * collision would surface only as two identical entries in a member's command
 * list.
 */
for (const spec of companionCommandSpecs) {
  assertNamespaceOwnership('companion', spec.name);
}
