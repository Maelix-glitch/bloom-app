import {
  bloomError,
  AUTOMOD_TRIGGER_LABELS,
  AUTOMOD_TRIGGER_TYPES,
  isAutomodTriggerType,
  type AutomodTriggerType,
  type GuildId,
} from '@bloom/shared-types';
import { requireStaffCapability } from '@bloom/permissions';
import type { SubcommandContribution } from '@bloom/commands';
import { parseDuration } from '@bloom/utils';
import type { GuardianDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * `/guardian automod …` — the tuning surface for design note 001.
 *
 * Three commands, matching the note: status, threshold, exempt. Thresholds
 * are read at runtime, so nothing here restarts anything; a change applies
 * to the next execution. The namespace floor is moderator-only, and these
 * branches narrow further: reading takes `staff.cases.read` (the same tier
 * that reads the case queue), changing enforcement takes
 * `staff.moderation.execute` (the tier that runs `/timeout` — the note's
 * first open question, decided for the tier that already holds the power
 * being tuned).
 */

export const AUTOMOD_GROUP_DESCRIPTION = 'Auto-moderation policy and review.';

function guildOf(invocation: { readonly guildId: GuildId | null }): GuildId {
  if (!invocation.guildId) {
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'An automod command reached a handler without a guild id.',
    });
  }
  return invocation.guildId;
}

function durationSeconds(
  invocation: { readonly options: { getString(name: string): string | null } },
  option: string,
  fallbackSeconds: number,
  bounds: { readonly min: number; readonly max: number; readonly label: string },
): number {
  const raw = invocation.options.getString(option);
  if (raw === null) return fallbackSeconds;
  const parsed = parseDuration(raw);
  if (!parsed.ok) throw parsed.error;
  const seconds = Math.round(parsed.value / 1000);
  if (seconds < bounds.min || seconds > bounds.max) {
    throw bloomError('INVALID_INPUT', {
      userMessage: `${bounds.label} must be between ${String(bounds.min)}s and ${String(bounds.max)}s.`,
    });
  }
  return seconds;
}

export const automodSubcommands: readonly SubcommandContribution<GuardianDeps>[] = [
  {
    group: 'automod',
    policy: requireStaffCapability('staff.cases.read'),
    spec: {
      name: 'status',
      description: 'Show the auto-moderation switch, recent volume and policies.',
      options: [],
    },
    async execute(invocation, deps) {
      const status = await deps.automod.status(guildOf(invocation));
      return copy.statusMessage(status);
    },
  },
  {
    group: 'automod',
    policy: requireStaffCapability('staff.moderation.execute'),
    spec: {
      name: 'threshold',
      description: 'Set how many triggers inside a window earn an automatic timeout.',
      options: [
        {
          name: 'rule',
          description: 'Which rule type this threshold governs.',
          type: 'string',
          required: true,
          choices: [
            { name: 'Every rule', value: 'all' },
            ...AUTOMOD_TRIGGER_TYPES.map((trigger) => ({
              name: AUTOMOD_TRIGGER_LABELS[trigger],
              value: trigger,
            })),
          ],
        },
        {
          name: 'count',
          description: 'Triggers inside the window that earn the timeout.',
          type: 'integer',
          required: true,
          minValue: 1,
          maxValue: 100,
        },
        {
          name: 'window',
          description: 'The counting window, like `1h` or `24h`.',
          type: 'string',
          required: true,
        },
        {
          name: 'duration',
          description: 'Timeout length, like `10m` or `1h`. Defaults to 10m.',
          type: 'string',
          required: false,
        },
        {
          name: 'channel',
          description: 'Limit this policy to one channel. Omit for the whole server.',
          type: 'channel',
          required: false,
        },
      ],
    },
    async execute(invocation, deps) {
      const rule = invocation.options.getString('rule');
      const triggerType: AutomodTriggerType | null =
        rule === 'all' || rule === null
          ? null
          : isAutomodTriggerType(rule)
            ? rule
            : (() => {
                throw bloomError('INVALID_INPUT', {
                  userMessage: 'Choose a rule type.',
                });
              })();

      const count = invocation.options.getInteger('count');
      if (count === null) {
        throw bloomError('INVALID_INPUT', { userMessage: 'Give a trigger count.' });
      }

      const windowSeconds = durationSeconds(invocation, 'window', 3600, {
        min: 60,
        max: 604800,
        label: 'The window',
      });
      const timeoutSeconds = durationSeconds(invocation, 'duration', 600, {
        min: 60,
        max: 2419200,
        label: 'The timeout',
      });

      const channel = invocation.options.getChannel('channel');

      const policy = await deps.automod.setThreshold({
        guildId: guildOf(invocation),
        triggerType,
        channelId: channel?.id ?? null,
        thresholdCount: count,
        windowSeconds,
        timeoutSeconds,
        updatedBy: invocation.actor.userId,
      });
      return copy.thresholdSetMessage(policy);
    },
  },
  {
    group: 'automod',
    policy: requireStaffCapability('staff.moderation.execute'),
    spec: {
      name: 'exempt',
      description: 'Exempt a role from automatic escalation.',
      options: [
        {
          name: 'role',
          description: 'The role whose members are never timed out automatically.',
          type: 'role',
          required: true,
        },
      ],
    },
    async execute(invocation, deps) {
      const role = invocation.options.getRole('role');
      if (!role) {
        throw bloomError('INVALID_INPUT', { userMessage: 'Choose a role.' });
      }
      const result = await deps.automod.addExemptRole({
        guildId: guildOf(invocation),
        roleId: role.id,
        updatedBy: invocation.actor.userId,
      });
      return copy.exemptAddedMessage(role.id, !result.added);
    },
  },
];
