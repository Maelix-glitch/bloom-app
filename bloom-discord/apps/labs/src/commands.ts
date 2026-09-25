import {
  assertNamespaceOwnership,
  namespaceCommand,
  type BloomCommand,
  type CommandSpec,
} from '@bloom/commands';
import { allOf, requireBloomMember } from '@bloom/permissions';
import type { LabsDeps } from './deps.js';
import { intakeCommands, intakeSubcommands } from './features/intake/commands.js';

/**
 * The `/labs` namespace.
 *
 * Gated at ❋ Bloom Member, like `/companion`, and for the same reason: most of
 * what it does is a member telling the team something or checking what happened
 * to what they told them. The staff branches state their own floor and a
 * contribution's policy can only narrow the namespace's, so `bug queue` and
 * `admin triage` stay at Moderator regardless.
 *
 * Not gated at ◌ Beta Tester. That role is testing *access* — it opens
 * channels — and requiring it to file a bug would mean the members most likely
 * to hit one in the shipped product are the ones who cannot report it.
 */
export const labsNamespaceCommand: BloomCommand<LabsDeps> = namespaceCommand({
  bot: 'labs',
  name: 'labs',
  description: 'Bloom Labs: bugs, feedback and what the team is working on.',
  policy: allOf(requireBloomMember()),
  groupDescriptions: {
    bug: 'Report a defect, or look one up.',
    admin: 'Staff actions on submissions. Always audited.',
  },
  contributions: [...intakeSubcommands],
});

/**
 * Labs' complete command set.
 *
 * One list, shared by the registry the dispatcher routes through and the
 * registration script that tells Discord what exists — so a registered command
 * can never lack a handler.
 */
export const labsCommands: readonly BloomCommand<LabsDeps>[] = [
  labsNamespaceCommand,
  ...intakeCommands,
];

export const labsCommandSpecs: readonly CommandSpec[] = labsCommands.map(
  (command) => command.spec,
);

for (const spec of labsCommandSpecs) {
  assertNamespaceOwnership('labs', spec.name);
}
