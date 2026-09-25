import {
  CHANNEL_ENV_KEYS,
  ROLE_ENV_KEYS,
  type BotName,
  type ChannelKey,
  type RoleKey,
} from '@bloom/shared-types';

/**
 * What each bot must have configured before it is allowed to boot.
 *
 * Deliberately per-bot rather than global. Companion should not refuse to start
 * because `CHANNEL_REPORTS` is unset — it has no business reading that channel
 * and requiring it would push operators toward filling in placeholder ids just
 * to get past a validation error, which is worse than the gap it prevents.
 *
 * Entries are added as the phase that needs them lands. Phase 0 ships the
 * structure and Guardian's onboarding requirements; the rest are empty because
 * nothing reads them yet, and requiring configuration for code that does not
 * exist is how a checklist becomes noise.
 */
export interface BotRequirements {
  readonly roles: readonly RoleKey[];
  readonly channels: readonly ChannelKey[];
}

export const BOT_REQUIREMENTS: Readonly<Record<BotName, BotRequirements>> = {
  /**
   * Guardian needs the full role set: the staff roles to authorize commands
   * against, the managed roles to write, and its own bot role to compare
   * hierarchy positions before every write.
   */
  guardian: {
    roles: [
      'founder',
      'administrator',
      'moderator',
      'bloomBot',
      'earlyBloom',
      'bloomMember',
    ],
    // Populated in Phase 1 (#welcome, #getting-started) and Phase 2
    // (#moderation, #reports) as those features land.
    channels: [],
  },

  /** Phase 3 adds #daily-check-in, #small-wins, #introductions. */
  companion: {
    roles: [],
    channels: [],
  },

  /** Phase 5 adds #beta-testing, #feedback, #voting, #feature-status. */
  labs: {
    roles: [],
    channels: [],
  },
};

export function requiredEnvKeysFor(bot: BotName): readonly string[] {
  const requirements = BOT_REQUIREMENTS[bot];
  return [
    ...requirements.roles.map((role) => ROLE_ENV_KEYS[role]),
    ...requirements.channels.map((channel) => CHANNEL_ENV_KEYS[channel]),
  ];
}
