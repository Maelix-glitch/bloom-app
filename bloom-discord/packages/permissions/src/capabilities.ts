import {
  BOT_CAPABILITIES,
  BOT_DISPLAY_NAMES,
  bloomError,
  err,
  hasCapability,
  ok,
  type BloomError,
  type BotName,
  type Capability,
  type Result,
} from '@bloom/shared-types';

/**
 * Capability enforcement.
 *
 * The brief's hard rules — only Guardian may modify roles, Companion and Labs
 * never moderate — are enforced in three independent places. This is the second
 * one: the OAuth2 invite is the first, and command authorization is the third.
 *
 * Defence in depth matters here because the first layer is a URL somebody pastes
 * into a browser. If Labs were ever invited with Manage Roles by accident, this
 * check is what still stops it from using the permission.
 */
export function checkCapability(
  bot: BotName,
  capability: Capability,
): Result<void, BloomError> {
  if (hasCapability(bot, capability)) return ok(undefined);

  return err(
    bloomError('CAPABILITY_DENIED', {
      operatorHint: `${BOT_DISPLAY_NAMES[bot]} attempted "${capability}", which is not in its capability manifest (${BOT_CAPABILITIES[bot].join(', ')}). This is a wiring bug: the operation was routed to the wrong bot. Move the feature to the bot that owns it rather than widening the manifest.`,
      details: { bot, capability, manifest: [...BOT_CAPABILITIES[bot]] },
    }),
  );
}

/**
 * Assert a capability at construction time.
 *
 * Called by service constructors rather than by each method, so a
 * mis-wired service fails at boot with a clear message instead of failing
 * halfway through a member's interaction.
 */
export function assertCapability(bot: BotName, capability: Capability): void {
  const result = checkCapability(bot, capability);
  if (!result.ok) throw result.error;
}
