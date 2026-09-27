import {
  CHANNEL_DISPLAY_NAMES,
  CHANNEL_ENV_KEYS,
  ROLE_DISPLAY_NAMES,
  ROLE_ENV_KEYS,
  bloomError,
  err,
  ok,
  type BloomError,
  type ChannelId,
  type ChannelKey,
  type Result,
  type RoleId,
  type RoleKey,
} from '@bloom/shared-types';
import type { PlatformConfig } from './types.js';

/**
 * Resolve a configured role id.
 *
 * Returns a `Result` rather than throwing. A missing channel or role is an
 * operational problem that should produce a clear staff-facing message, not a
 * crashed interaction handler — and the error already carries the exact env key
 * to set.
 */
export function getRoleId(
  config: PlatformConfig,
  key: RoleKey,
): Result<RoleId, BloomError> {
  const id = config.roles[key];
  if (!id) {
    return err(
      bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Role "${ROLE_DISPLAY_NAMES[key]}" is not configured. Set ${ROLE_ENV_KEYS[key]} to the role id.`,
        details: { role_key: key, env_key: ROLE_ENV_KEYS[key] },
      }),
    );
  }
  return ok(id);
}

export function getChannelId(
  config: PlatformConfig,
  key: ChannelKey,
): Result<ChannelId, BloomError> {
  const id = config.channels[key];
  if (!id) {
    return err(
      bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Channel "${CHANNEL_DISPLAY_NAMES[key]}" is not configured. Set ${CHANNEL_ENV_KEYS[key]} to the channel id.`,
        details: { channel_key: key, env_key: CHANNEL_ENV_KEYS[key] },
      }),
    );
  }
  return ok(id);
}

/**
 * Reverse lookup: which configured role does this id correspond to?
 *
 * This is the server-side half of "never trust client-supplied role ids". A
 * command that accepts a role option resolves the supplied id back to a known
 * key here; anything that does not map is rejected, so a crafted interaction
 * cannot point the bot at an arbitrary role.
 */
export function roleKeyForId(config: PlatformConfig, id: string): RoleKey | null {
  for (const [key, configured] of Object.entries(config.roles) as [
    RoleKey,
    RoleId | null,
  ][]) {
    if (configured && configured === id) return key;
  }
  return null;
}

export function channelKeyForId(config: PlatformConfig, id: string): ChannelKey | null {
  for (const [key, configured] of Object.entries(config.channels) as [
    ChannelKey,
    ChannelId | null,
  ][]) {
    if (configured && configured === id) return key;
  }
  return null;
}

/** Role ids for a set of keys, skipping any that are unconfigured. */
export function configuredRoleIds(
  config: PlatformConfig,
  keys: readonly RoleKey[],
): readonly RoleId[] {
  return keys.map((key) => config.roles[key]).filter((id): id is RoleId => id !== null);
}
