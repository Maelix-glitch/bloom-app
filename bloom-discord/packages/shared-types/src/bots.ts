/**
 * The three Bloom Labs applications.
 *
 * These are separate Discord applications with separate tokens, not three
 * modes of one bot. The identifiers here key configuration, logging, database
 * rows and the capability manifests.
 */
export const BOT_NAMES = ['guardian', 'companion', 'labs'] as const;

export type BotName = (typeof BOT_NAMES)[number];

export const BOT_DISPLAY_NAMES: Readonly<Record<BotName, string>> = {
  guardian: 'Bloom Guardian',
  companion: 'Bloom Companion',
  labs: 'Bloom Labs',
};

export function isBotName(value: unknown): value is BotName {
  return typeof value === 'string' && (BOT_NAMES as readonly string[]).includes(value);
}
