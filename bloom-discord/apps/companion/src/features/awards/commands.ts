import { bloomError, type GuildId } from '@bloom/shared-types';
import { requireBloomMember } from '@bloom/permissions';
import type { BloomMessage } from '@bloom/embeds';
import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { CompanionDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * Milestones and achievements, as a member sees their own.
 *
 * The staff reward commands used to live here too. They moved to
 * `../rewards/staff-commands.ts` when `revoke` joined `award`: the command
 * paths are unchanged, but a file called `awards` was no longer the obvious
 * place to look for the economy's staff surface.
 */

function requireGuild(invocation: CommandInvocation): GuildId {
  const id = invocation.guildId;
  if (!id) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'An awards command reached a handler without a guild id.',
    });
  }
  return id;
}

async function showMilestones(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const entries = await deps.awards.progress(
    requireGuild(invocation),
    invocation.actor.userId,
    'milestone',
  );
  return copy.milestonesMessage(entries);
}

async function showAchievements(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const entries = await deps.awards.progress(
    requireGuild(invocation),
    invocation.actor.userId,
    'achievement',
  );
  return copy.achievementsMessage(entries);
}

export const awardsSubcommands: readonly SubcommandContribution<CompanionDeps>[] = [
  {
    spec: {
      name: 'milestones',
      description: 'Show the milestones you have reached, and the ones ahead.',
    },
    policy: requireBloomMember(),
    execute: showMilestones,
  },
  {
    spec: {
      name: 'achievements',
      description: 'Show the achievements you have earned.',
    },
    policy: requireBloomMember(),
    execute: showAchievements,
  },
];
