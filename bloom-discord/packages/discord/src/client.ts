import { Client } from 'discord.js';
import type { BotName } from '@bloom/shared-types';
import { intentsFor, partialsFor } from './intents.js';

/**
 * Build the discord.js client for a bot.
 *
 * Separate from `BotRuntime` because of an ordering problem that would
 * otherwise be circular:
 *
 *   • The command dispatcher needs the feature dependencies.
 *   • The feature dependencies (role service, messaging) need a `Client`.
 *   • `BotRuntime` needs the dispatcher.
 *
 * Creating the client first breaks the cycle. Nothing connects here — a client
 * is inert until `login()` — so building one early costs nothing and lets the
 * services be constructed against it before the runtime exists.
 */
export function createBotClient(bot: BotName): Client {
  return new Client({
    intents: intentsFor(bot),
    partials: [...partialsFor(bot)],
    /*
     * No mentions, ever, at the client level.
     *
     * This is the outermost of two guards — the message adapter sets the same
     * thing per payload. A bot that can be made to type `@everyone` by echoing
     * member-supplied text is a bot that will eventually be made to do it.
     */
    allowedMentions: { parse: [] },
  });
}
