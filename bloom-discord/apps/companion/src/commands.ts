import {
  assertNamespaceOwnership,
  namespaceCommand,
  type BloomCommand,
  type CommandSpec,
} from '@bloom/commands';
import { JOBS_GROUP_DESCRIPTION, jobSubcommands } from '@bloom/discord';
import { allOf, requireBloomMember } from '@bloom/permissions';
import type { CompanionDeps } from './deps.js';
import { awardsSubcommands } from './features/awards/commands.js';
import { rewardsCommands, rewardsSubcommands } from './features/rewards/commands.js';

/**
 * The `/companion` namespace.
 *
 * Assembled the same way `/guardian` is, and from the same shared contribution
 * for the `jobs` group — the brief forbids duplicated code between bots, and a
 * second copy of the job surface would drift the first time one bot gained a
 * field the other did not.
 *
 * ## Who can see it
 *
 * The namespace is gated at ❋ Bloom Member, not at Moderator. Most of what
 * `/companion` does is a member reading their own progress, and a namespace
 * that refused them would make the feature pointless.
 *
 * That widening is safe because every branch under `jobs` states its own floor
 * — Moderator to read, Administrator to change — and a contribution's policy is
 * evaluated after the namespace's, so it can only narrow. The operator surface
 * did not move when the member surface arrived.
 *
 * Bloom Member rather than "anyone": these commands read and write a member's
 * standing in the community, and onboarding is what makes someone a member of
 * it. Guardian's `/verify` is the way in, and it requires no roles at all.
 */
export const companionNamespaceCommand: BloomCommand<CompanionDeps> = namespaceCommand({
  bot: 'companion',
  name: 'companion',
  description: 'Bloom Companion: progress, rewards and administration.',
  /*
   * Deliberately no `defaultMemberPermissions`. This command is for members, so
   * hiding it by default would be wrong — and the client-side hint was never
   * the boundary in either direction. `policy`, and the per-branch policies
   * under it, are what actually decide.
   */
  policy: allOf(requireBloomMember()),
  groupDescriptions: {
    jobs: JOBS_GROUP_DESCRIPTION,
    admin: 'Staff actions that change a member’s standing. Always audited.',
  },
  contributions: [
    ...rewardsSubcommands,
    ...awardsSubcommands,
    ...jobSubcommands<CompanionDeps>(),
  ],
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
  ...rewardsCommands,
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
