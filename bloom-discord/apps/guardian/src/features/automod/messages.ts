import type { AutomodEventRow, AutomodPolicyRow } from '@bloom/database';
import { AUTOMOD_TRIGGER_LABELS } from '@bloom/shared-types';
import {
  neutralEmbed,
  noticeEmbed,
  staffEmbed,
  successEmbed,
  type BloomMessage,
} from '@bloom/embeds';
import type { AutomodTriggerType, ChannelId, RoleId, UserId } from '@bloom/shared-types';
import { encodeCustomId } from '@bloom/commands';
import { discordTimestamp, formatDuration, pluralise } from '@bloom/utils';

/**
 * Every string auto-moderation shows anyone.
 *
 * Kept to the moderation copy rules: calm, plain, and honest about what
 * happened. Two audiences, kept apart on purpose:
 *
 *   • **Staff copy** (the alert post, the command replies) may carry the
 *     matched keyword — it is the staff-configured pattern, and staff need
 *     it to judge whether the rule behaved.
 *   • **Member copy** (the timeout and reversal notices) never does. A
 *     member is told which rule type fired and how often, not the pattern,
 *     because handing out the pattern is handing out the evasion guide.
 */

const mention = (userId: UserId): string => `<@${userId}>`;
const roleMention = (roleId: RoleId): string => `<@&${roleId}>`;
const channelMention = (channelId: ChannelId): string => `<#${channelId}>`;

/** What Guardian did about one execution, as the alert post reports it. */
export type AutomodAlertOutcome =
  | {
      readonly kind: 'timeout';
      readonly timeoutSeconds: number;
      readonly caseNumber: number;
    }
  | { readonly kind: 'discord_timeout'; readonly caseNumber: number }
  | { readonly kind: 'hierarchy_blocked'; readonly caseNumber: number }
  | { readonly kind: 'timeout_failed'; readonly caseNumber: number }
  | { readonly kind: 'alert_only' };

export function reviewButtonId(
  action: 'confirm' | 'reverse' | 'escalate',
  eventId: string,
): string {
  return encodeCustomId({
    bot: 'guardian',
    feature: 'automod',
    action,
    argument: eventId,
  });
}

/**
 * The staff alert post in the moderation channel.
 *
 * It links to the Discord message rather than quoting it — Bloom never
 * received the content, so there is nothing to quote. The buttons are the
 * review: Confirm, Reverse, Escalate. Reverse is one click by design; an
 * automated action that is hard to undo is a worse failure than one that
 * never fired.
 */
export function alertMessage(input: {
  readonly event: AutomodEventRow;
  readonly outcome: AutomodAlertOutcome;
  readonly windowCount?: number;
  readonly windowSeconds?: number;
}): BloomMessage {
  const { event, outcome } = input;
  const lines = [
    `**Member** — ${mention(event.userId)}`,
    `**Rule** — ${AUTOMOD_TRIGGER_LABELS[event.triggerType]}`,
  ];
  if (event.matchedKeyword) {
    lines.push(`**Matched pattern** — \`${event.matchedKeyword}\``);
  }
  if (event.channelId) {
    lines.push(`**Channel** — ${channelMention(event.channelId)}`);
  }
  if (input.windowCount !== undefined && input.windowSeconds !== undefined) {
    lines.push(
      `**Count** — ${pluralise(input.windowCount, 'trigger', 'triggers')} in ${formatDuration(input.windowSeconds * 1000)}`,
    );
  }

  switch (outcome.kind) {
    case 'timeout':
      lines.push(
        '',
        `Guardian timed the member out for ${formatDuration(outcome.timeoutSeconds * 1000)}. Case #${String(outcome.caseNumber)}.`,
      );
      break;
    case 'discord_timeout':
      lines.push(
        '',
        `Discord's own rule already timed the member out; Guardian recorded it and opened case #${String(outcome.caseNumber)} rather than timing them out twice.`,
      );
      break;
    case 'hierarchy_blocked':
      lines.push(
        '',
        `Guardian could not time this member out — their highest role is at or above the bot's. Case #${String(outcome.caseNumber)} is open for a human decision.`,
      );
      break;
    case 'timeout_failed':
      lines.push(
        '',
        `Guardian tried to time the member out and Discord refused twice. Case #${String(outcome.caseNumber)} is open; the member is **not** timed out.`,
      );
      break;
    case 'alert_only':
      lines.push(
        '',
        'No escalation policy covers this rule yet, so Guardian took no action. Set one with `/guardian automod threshold`.',
      );
      break;
  }

  return {
    embeds: [
      staffEmbed({
        title: 'Auto-moderation',
        description: lines.join('\n'),
        timestamp: event.createdAt,
      }),
    ],
    rows: [
      {
        components: [
          {
            kind: 'button',
            customId: reviewButtonId('confirm', event.id),
            label: 'Confirm',
            style: 'success',
          },
          {
            kind: 'button',
            customId: reviewButtonId('reverse', event.id),
            label: 'Reverse',
            style: 'danger',
          },
          {
            kind: 'button',
            customId: reviewButtonId('escalate', event.id),
            label: 'Escalate',
            style: 'secondary',
          },
        ],
      },
    ],
  };
}

// -----------------------------------------------------------------------------
// Member-facing notices
// -----------------------------------------------------------------------------

export function timeoutReason(input: {
  readonly triggerType: AutomodTriggerType;
  readonly count: number;
  readonly windowSeconds: number;
}): string {
  return `Automatic timeout — the ${AUTOMOD_TRIGGER_LABELS[input.triggerType].toLowerCase()} rule triggered ${pluralise(input.count, 'time', 'times')} in ${formatDuration(input.windowSeconds * 1000)}.`;
}

export function reversalNotice(guildName: string): BloomMessage {
  return {
    embeds: [
      noticeEmbed({
        title: guildName,
        description:
          'A moderator reviewed the automatic timeout on your account and reversed it. Your timeout has been lifted. Sorry for the interruption — the review exists because automated actions can be wrong, and this one was judged to be.',
      }),
    ],
  };
}

// -----------------------------------------------------------------------------
// Command replies (staff, ephemeral)
// -----------------------------------------------------------------------------

export function statusMessage(input: {
  readonly enabled: boolean;
  readonly policies: readonly AutomodPolicyRow[];
  readonly volume24h: ReadonlyMap<AutomodTriggerType, number>;
  readonly volume7d: ReadonlyMap<AutomodTriggerType, number>;
}): BloomMessage {
  const lines = [
    input.enabled
      ? '**State** — on. Guardian is reacting to Auto Moderation events.'
      : '**State** — off. Guardian is ignoring Auto Moderation events. Turn it on in the bot settings (`automod.enabled`).',
    '',
    '**Volume**',
    ...summariseVolume('Last 24 hours', input.volume24h),
    ...summariseVolume('Last 7 days', input.volume7d),
    '',
    '**Policies**',
  ];

  if (input.policies.length === 0) {
    lines.push(
      '_None configured. Until one is, every event is alert only — no member is ever timed out by an unconfigured rule._',
    );
  } else {
    for (const policy of input.policies) {
      lines.push(describePolicy(policy));
    }
  }

  return { ephemeral: true, embeds: [staffEmbed({ description: lines.join('\n') })] };
}

function summariseVolume(
  label: string,
  volume: ReadonlyMap<AutomodTriggerType, number>,
): string[] {
  const total = [...volume.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [`${label}: no executions.`];
  const parts = [...volume.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([trigger, count]) => `${AUTOMOD_TRIGGER_LABELS[trigger]} ${String(count)}`);
  return [
    `${label}: ${pluralise(total, 'execution', 'executions')} — ${parts.join(' · ')}`,
  ];
}

function describePolicy(policy: AutomodPolicyRow): string {
  const scope = [
    policy.channelId ? channelMention(policy.channelId) : 'every channel',
    policy.triggerType ? AUTOMOD_TRIGGER_LABELS[policy.triggerType] : 'every rule',
  ].join(' · ');
  const parts = [`**${scope}**`];
  if (
    policy.thresholdCount !== null &&
    policy.windowSeconds !== null &&
    policy.timeoutSeconds !== null
  ) {
    parts.push(
      `${pluralise(policy.thresholdCount, 'trigger', 'triggers')} in ${formatDuration(policy.windowSeconds * 1000)} → timeout ${formatDuration(policy.timeoutSeconds * 1000)}`,
    );
  } else {
    parts.push('exemptions only, no threshold');
  }
  if (policy.exemptRoleIds.length > 0) {
    parts.push(`exempt: ${policy.exemptRoleIds.map(roleMention).join(' ')}`);
  }
  return parts.join(' — ');
}

export function thresholdSetMessage(policy: AutomodPolicyRow): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({
        description: `Policy saved. ${describePolicy(policy)}\n\nIt applies from the next execution — thresholds are read at runtime, so there is nothing to restart.`,
      }),
    ],
  };
}

export function exemptAddedMessage(roleId: RoleId, already: boolean): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      already
        ? neutralEmbed({
            description: `${roleMention(roleId)} was already exempt from auto-moderation escalation. Nothing changed.`,
          })
        : successEmbed({
            description: `${roleMention(roleId)} is now exempt from auto-moderation escalation. Members holding it are still counted, but never timed out automatically. Staff roles are always exempt, with or without this list.`,
          }),
    ],
  };
}

export function reviewRecordedMessage(input: {
  readonly decision: 'confirmed' | 'reversed' | 'escalated';
  readonly event: AutomodEventRow;
  readonly caseNumber?: number | null;
}): BloomMessage {
  const who = mention(input.event.userId);
  const descriptions = {
    confirmed: `Confirmed. The action against ${who} stands, and the review is recorded.`,
    reversed: `Reversed. Any timeout Guardian applied to ${who} has been lifted, the record is marked reversed, and the member has been told.`,
    escalated: `Escalated.${input.caseNumber ? ` Case #${String(input.caseNumber)}` : ' The case'} is now marked for an administrator, and the review is recorded.`,
  } as const;
  return {
    ephemeral: true,
    embeds: [successEmbed({ description: descriptions[input.decision] })],
  };
}

export function alreadyReviewedMessage(event: AutomodEventRow): BloomMessage {
  const when = event.reviewedAt ? discordTimestamp(event.reviewedAt, 'R') : '';
  return {
    ephemeral: true,
    embeds: [
      neutralEmbed({
        description: `This action was already reviewed — marked **${event.reviewStatus}**${event.reviewedBy ? ` by ${mention(event.reviewedBy)}` : ''} ${when}. The first decision stands; if it was wrong, the case is where that gets argued.`,
      }),
    ],
  };
}
