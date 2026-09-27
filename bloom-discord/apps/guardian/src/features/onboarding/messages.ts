import {
  ONBOARDING_STATE_LABELS,
  type OnboardingState,
  type UserId,
} from '@bloom/shared-types';
import {
  bloomEmbed,
  noticeEmbed,
  successEmbed,
  staffEmbed,
  type BloomMessage,
} from '@bloom/embeds';

/**
 * Everything a member reads during onboarding.
 *
 * Kept in one file, apart from the logic, for two reasons. The obvious one is
 * that copy changes far more often than behaviour. The less obvious one is that
 * tone is a requirement here, and tone is only reviewable when the words sit
 * together where someone can read them in one pass.
 *
 * The register is calm and plain. No exclamation marks, no emoji confetti, no
 * "HEY!!! WELCOME!!!" — the brief rules that out explicitly, and a wellbeing
 * community is the last place that belongs. Sentences are short. Nothing is
 * congratulated that was not an achievement.
 */

/** Posted to the welcome channel when someone joins. */
export function joinNotice(userId: UserId): BloomMessage {
  return {
    // The mention is in `content` so the member is actually notified; embeds do
    // not trigger notifications. `allowedMentions` still suppresses the ping's
    // ability to reach anyone else.
    content: `<@${userId}>`,
    embeds: [
      bloomEmbed({
        title: 'Welcome to Bloom Labs',
        description: [
          'Take your time looking around.',
          '',
          'When you are ready, run `/verify` to get access to the rest of the server.',
          'It takes a moment and nothing else is required of you.',
        ].join('\n'),
      }),
    ],
  };
}

/** The reply to a successful `/verify`. */
export function verifiedMessage(): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({
        title: 'You are verified',
        description: [
          'You now have the ✧ Early Bloom role and can see the rest of the server.',
          '',
          'Early Bloom means your onboarding is still in progress — it is not an access tier,',
          'and there is nothing you are missing out on. A moderator moves you to ❋ Bloom Member',
          'once you have settled in.',
        ].join('\n'),
      }),
    ],
  };
}

/** Someone ran `/verify` when they were already past it. */
export function alreadyVerifiedMessage(state: OnboardingState): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      noticeEmbed({
        title: 'Already verified',
        description: `Your current status is: ${ONBOARDING_STATE_LABELS[state]}. There is nothing further to do.`,
      }),
    ],
  };
}

/**
 * `/verify` from someone whose access was withdrawn.
 *
 * Deliberately says nothing about why, and offers no self-service route back.
 * Explaining a revocation in an automated reply either leaks a moderation
 * decision or invites an argument with a bot. A human handles this.
 */
export function revokedMessage(): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      noticeEmbed({
        title: 'Verification unavailable',
        description:
          'Verification is not available for your account. If you think this is a mistake, contact a moderator.',
      }),
    ],
  };
}

/** Confirmation that a member completed onboarding. */
export function onboardingCompleteMessage(userId: UserId): BloomMessage {
  return {
    ephemeral: true,
    embeds: [
      successEmbed({
        title: 'Onboarding complete',
        description: `<@${userId}> now holds ❋ Bloom Member.`,
      }),
    ],
  };
}

/** The member's own view of where they are. */
export function memberStatusMessage(input: {
  readonly userId: UserId;
  readonly state: OnboardingState;
  readonly joinedAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly completedAt: Date | null;
  readonly self: boolean;
}): BloomMessage {
  const fields = [
    { name: 'Status', value: ONBOARDING_STATE_LABELS[input.state] },
    { name: 'Joined', value: timestamp(input.joinedAt), inline: true },
    { name: 'Verified', value: timestamp(input.verifiedAt), inline: true },
  ];

  if (input.completedAt) {
    fields.push({ name: 'Onboarded', value: timestamp(input.completedAt), inline: true });
  }

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: input.self ? 'Your status' : 'Member status',
        ...(input.self ? {} : { description: `<@${input.userId}>` }),
        fields,
      }),
    ],
  };
}

/** Staff view: population counts by lifecycle state. */
export function onboardingOverviewMessage(
  counts: Readonly<Record<OnboardingState, number>>,
): BloomMessage {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Onboarding overview',
        description: `${String(total)} member(s) currently in the server.`,
        fields: [
          {
            name: 'Not yet verified',
            value: String(counts.unverified),
            inline: true,
          },
          { name: '✧ Early Bloom', value: String(counts.early_bloom), inline: true },
          { name: '❋ Bloom Member', value: String(counts.bloom_member), inline: true },
          { name: 'Access withdrawn', value: String(counts.revoked), inline: true },
        ],
        footer: 'Counts exclude members who have left.',
      }),
    ],
  };
}

/**
 * Discord renders `<t:seconds:F>` in each reader's own timezone.
 *
 * Every scheduled or timestamped thing in this platform has to be timezone
 * aware; for anything a member reads, handing the rendering to Discord is
 * strictly better than picking a timezone on their behalf.
 */
function timestamp(value: Date | null): string {
  if (!value) return '—';
  return `<t:${String(Math.floor(value.getTime() / 1000))}:F>`;
}
