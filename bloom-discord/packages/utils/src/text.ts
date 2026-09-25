/**
 * Text handling for user-supplied content that is about to be rendered in
 * Discord.
 *
 * Everything a member types can contain markdown, mentions and control
 * characters. A moderation reason of `@everyone **URGENT**` should appear in the
 * staff log as those literal characters, not ping the server.
 */

/** Discord's hard limits, so callers truncate before the API rejects the payload. */
export const DISCORD_LIMITS = {
  messageContent: 2000,
  embedTitle: 256,
  embedDescription: 4096,
  embedFieldName: 256,
  embedFieldValue: 1024,
  embedFooter: 2048,
  embedAuthorName: 256,
  embedTotal: 6000,
  embedFields: 25,
  /** Applies to both moderation audit-log reasons and our own reason columns. */
  auditLogReason: 512,
} as const;

const MARKDOWN_SPECIALS = /([\\*_~`|>#\-[\]()])/g;

/** Escape markdown so user text renders literally. */
export function escapeMarkdown(input: string): string {
  return input.replace(MARKDOWN_SPECIALS, '\\$1');
}

/**
 * Neutralise mass mentions.
 *
 * A zero-width space inside `@everyone` keeps the text readable while making it
 * inert. Note this is defence in depth: the messaging adapter also sends
 * `allowed_mentions` with nothing enabled, which is the real control. Relying on
 * string munging alone would be a mistake.
 */
export function neutraliseMentions(input: string): string {
  return (
    input
      .replace(/@(everyone|here)/g, '@\u200b$1')
      // Covers user (`<@id>`), legacy nickname (`<@!id>`) and role (`<@&id>`)
      // mentions in one pass. A quoted report that contains a role mention must
      // not ping that role when staff read it back.
      .replace(/<@([!&]?)(\d{17,20})>/g, '<@\u200b$1$2>')
  );
}

/** Strip control characters that break log parsing and Discord rendering. */
export function stripControlCharacters(input: string): string {
  // eslint-disable-next-line no-control-regex -- deliberately targeting control chars
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

/**
 * Full sanitisation pass for free-text input that will be displayed.
 *
 * Order matters: strip control characters first so an escaped sequence cannot
 * hide one, then neutralise mentions, then escape markdown, then trim to length.
 */
export function sanitiseUserText(input: string, maxLength: number): string {
  const cleaned = escapeMarkdown(
    neutraliseMentions(stripControlCharacters(input)),
  ).trim();
  return truncate(cleaned, maxLength);
}

/** Truncate on a character budget, with an ellipsis that fits inside it. */
export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  if (maxLength <= 1) return input.slice(0, maxLength);
  return `${input.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Locale-independent pluralisation for counts in operator output. */
export function pluralise(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${String(count)} ${count === 1 ? singular : plural}`;
}
