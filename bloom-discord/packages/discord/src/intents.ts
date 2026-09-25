import { GatewayIntentBits, IntentsBitField, type Partials } from 'discord.js';
import type { BotName } from '@bloom/shared-types';

/**
 * Gateway intents, per bot, with a written reason for each.
 *
 * Verified against the current Discord documentation: exactly three intents are
 * privileged — GUILD_PRESENCES, GUILD_MEMBERS and MESSAGE_CONTENT. Passing a
 * privileged intent that is not enabled in the Developer Portal closes the
 * gateway connection with code 4014, so an intent listed here must also be
 * toggled on for that application.
 *
 * The rule applied below is the brief's: request the minimum, and justify every
 * one. An intent with no named feature behind it does not appear.
 */
export interface IntentDeclaration {
  readonly intent: keyof typeof GatewayIntentBits;
  readonly privileged: boolean;
  readonly reason: string;
}

export const BOT_INTENTS: Readonly<Record<BotName, readonly IntentDeclaration[]>> = {
  guardian: [
    {
      intent: 'Guilds',
      privileged: false,
      reason:
        'Guild, role and channel state. Required to resolve configured channel ids and to read live role positions before every role write — the hierarchy check depends on it.',
    },
    {
      intent: 'GuildMembers',
      privileged: true,
      reason:
        'PRIVILEGED. guildMemberAdd is what starts onboarding, and guildMemberUpdate keeps the observed role cache current. There is no non-privileged substitute: without it the bot never learns that someone joined. Guardian is the only bot granted this.',
    },
    {
      intent: 'GuildModeration',
      privileged: false,
      reason:
        'guildBanAdd / guildBanRemove. Lets bans applied directly in the Discord client be reconciled into the audit trail, so moderation history is complete rather than only covering bot-issued actions.',
    },
  ],

  companion: [
    {
      intent: 'Guilds',
      privileged: false,
      reason:
        'Channel resolution for scheduled prompts and command responses. Nothing else is needed: Companion reads onboarding and cohort state from the database, which Guardian writes.',
    },
  ],

  labs: [
    {
      intent: 'Guilds',
      privileged: false,
      reason:
        'Channel resolution only. Beta cohorts are database queries, not member-list scans.',
    },
  ],
};

/**
 * MESSAGE_CONTENT is not requested by any bot, and this is where that decision
 * is recorded.
 *
 * Every feature in the brief is driven by slash commands, buttons, select menus,
 * modals and context-menu commands. If a future feature looks like it needs to
 * read arbitrary messages, the first design step is a **message context-menu
 * command**, which hands the bot the content of the targeted message without
 * the intent and without ambient access to everything else anyone types.
 */
export const MESSAGE_CONTENT_RATIONALE =
  'Not requested. All features are interaction-driven; message context-menu commands cover the cases that would otherwise need it.';

export function intentsFor(bot: BotName): IntentsBitField {
  const bits = new IntentsBitField();
  for (const declaration of BOT_INTENTS[bot]) {
    bits.add(GatewayIntentBits[declaration.intent]);
  }
  return bits;
}

export function privilegedIntentsFor(bot: BotName): readonly IntentDeclaration[] {
  return BOT_INTENTS[bot].filter((declaration) => declaration.privileged);
}

/**
 * Partials.
 *
 * None. Partials exist so a bot can react to events about objects it has not
 * cached; every Bloom feature works from ids it resolves explicitly, so
 * enabling them would only add a class of "this field might be missing" bugs.
 */
export function partialsFor(_bot: BotName): readonly Partials[] {
  return [];
}
