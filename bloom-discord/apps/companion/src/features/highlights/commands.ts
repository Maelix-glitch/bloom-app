import type { CommandInvocation, SubcommandContribution } from '@bloom/commands';
import type { BloomMessage } from '@bloom/embeds';
import { requireBloomMember, requireStaffCapability } from '@bloom/permissions';
import { bloomError, type GuildId } from '@bloom/shared-types';
import type { CompanionDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * The community's read surfaces.
 *
 * Two member subcommands and one staff one. All three are ephemeral, all
 * three are reads, and none of them takes an argument that names another
 * member — there is no `/companion community highlights member:@someone`,
 * because a command that reports on a person you chose is a different feature
 * with a different consent question.
 *
 * ## Why `community` is its own group
 *
 * `/companion event` already exists for the verbs a member performs on one
 * event — join, leave, info. These are not verbs on an activity; they are
 * views of the whole place. Putting `highlights` under `event` would have
 * made it read as something you do to an event, and putting it at top level
 * would have spent two of the namespace's scarce root names on views.
 *
 * One level of nesting, as Discord requires: `/companion community highlights`
 * is command → group → subcommand, which is exactly the maximum.
 */

function requireGuild(invocation: CommandInvocation): GuildId {
  const guildId = invocation.guildId;
  if (!guildId) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'Community views are only available in a server.',
    });
  }
  return guildId;
}

async function showHighlights(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const view = await deps.highlights.highlights(requireGuild(invocation));
  return copy.highlightsMessage(view);
}

async function showStatus(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const view = await deps.highlights.status(requireGuild(invocation));
  return copy.statusMessage(view);
}

/**
 * The staff read.
 *
 * `staff.rewards.read`, not `staff.community.manage`. The capability that
 * creates and closes activities is the one that moves points, and this
 * command moves nothing — gating a read behind a mutation capability teaches
 * operators that the two are interchangeable, which is exactly the habit that
 * makes a later over-grant feel reasonable.
 *
 * Neither capability reaches a moderator, so this is Founder and
 * Administrator in practice. That is the right floor: the overview states the
 * guild's economic totals, which is not information a moderator needs to do
 * moderation.
 */
async function showStaffOverview(
  invocation: CommandInvocation,
  deps: CompanionDeps,
): Promise<BloomMessage> {
  const overview = await deps.highlights.staffOverview(requireGuild(invocation));
  return copy.staffOverviewMessage(overview);
}

export const highlightsMemberSubcommands: readonly SubcommandContribution<CompanionDeps>[] =
  [
    {
      group: 'community',
      policy: requireBloomMember(),
      spec: {
        name: 'highlights',
        description: 'Who has been doing what, lately.',
      },
      execute: showHighlights,
    },
    {
      group: 'community',
      policy: requireBloomMember(),
      spec: {
        name: 'status',
        description: 'What is running right now, and how the week is going.',
      },
      execute: showStatus,
    },
  ];

export const highlightsStaffSubcommands: readonly SubcommandContribution<CompanionDeps>[] =
  [
    {
      group: 'admin',
      policy: requireStaffCapability('staff.rewards.read'),
      spec: {
        name: 'community-overview',
        description: 'Activities, participation and totals. Read-only.',
      },
      execute: showStaffOverview,
    },
  ];

export const HIGHLIGHTS_GROUP_DESCRIPTION =
  'How the community is doing: what is running, and who has been part of it.';
