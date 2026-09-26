import { BloomError, type BloomErrorCode } from '@bloom/shared-types';
import { DISCORD_LIMITS, truncate } from '@bloom/utils';
import { BloomColour, TEXT_STYLE } from './tokens.js';
import type { BloomEmbed, BloomEmbedField, BloomMessage } from './message.js';

export interface EmbedInput {
  readonly title?: string;
  readonly description?: string;
  readonly fields?: readonly BloomEmbedField[];
  readonly footer?: string;
  readonly timestamp?: Date;
  readonly url?: string;
}

/**
 * Build an embed, enforcing Discord's limits and Bloom's style.
 *
 * Truncation happens here rather than at the API boundary because a rejected
 * payload gives the member "This interaction failed" with no explanation, while
 * a truncated one gives them a slightly shortened message. The former is a bug
 * report; the latter is fine.
 */
function build(colour: number, input: EmbedInput): BloomEmbed {
  const fields = (input.fields ?? []).slice(0, TEXT_STYLE.maxFields).map((field) => ({
    name: truncate(field.name, DISCORD_LIMITS.embedFieldName),
    value: truncate(field.value, DISCORD_LIMITS.embedFieldValue),
    ...(field.inline === undefined ? {} : { inline: field.inline }),
  }));

  return {
    colour,
    ...(input.title ? { title: truncate(input.title, DISCORD_LIMITS.embedTitle) } : {}),
    ...(input.description
      ? { description: truncate(input.description, DISCORD_LIMITS.embedDescription) }
      : {}),
    ...(fields.length > 0 ? { fields } : {}),
    ...(input.footer
      ? { footer: truncate(input.footer, DISCORD_LIMITS.embedFooter) }
      : {}),
    ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    ...(input.url ? { url: input.url } : {}),
  };
}

/** The default Bloom embed. Use this unless the message means something else. */
export function bloomEmbed(input: EmbedInput): BloomEmbed {
  return build(BloomColour.bloom, input);
}

export function successEmbed(input: EmbedInput): BloomEmbed {
  return build(BloomColour.success, input);
}

export function noticeEmbed(input: EmbedInput): BloomEmbed {
  return build(BloomColour.notice, input);
}

export function errorEmbed(input: EmbedInput): BloomEmbed {
  return build(BloomColour.error, input);
}

/** Staff-facing output: moderation logs, audit summaries, health panels. */
export function staffEmbed(input: EmbedInput): BloomEmbed {
  return build(BloomColour.staff, input);
}

export function neutralEmbed(input: EmbedInput): BloomEmbed {
  return build(BloomColour.neutral, input);
}

/**
 * The member-facing rendering of a failure.
 *
 * This function is the single reason a stack trace can never reach Discord: it
 * reads `userMessage`, which is written for members, and never touches
 * `operatorHint`, `stack`, `details` or `cause`. The correlation id is included
 * so that support can find the matching log line without the member having to
 * describe what happened.
 */
export function errorMessage(
  error: unknown,
  options: { readonly correlationId?: string | null } = {},
): BloomMessage {
  const bloom = BloomError.is(error) ? error : BloomError.from(error);

  const fields: BloomEmbedField[] = [];
  if (options.correlationId) {
    fields.push({ name: 'Reference', value: `\`${options.correlationId.slice(0, 8)}\`` });
  }

  return {
    embeds: [
      errorEmbed({
        title: titleForCode(bloom.code),
        description: bloom.userMessage,
        ...(fields.length > 0 ? { fields } : {}),
      }),
    ],
    ephemeral: true,
  };
}

/**
 * Short, calm headings. No "Error!", no "Oops", no emoji.
 *
 * A member who cannot use a command does not need to be told that something
 * went wrong in alarming terms; they need to know whether it is their problem
 * or ours.
 */
function titleForCode(code: BloomErrorCode): string {
  switch (code) {
    case 'UNAUTHORIZED':
    case 'INSUFFICIENT_PERMISSION':
    case 'TARGET_PROTECTED':
    case 'SELF_ACTION_BLOCKED':
      return 'Not available to you';
    case 'CHANNEL_RESTRICTED':
      return 'Wrong channel';
    case 'GUILD_MISMATCH':
      return 'Bloom Labs only';
    case 'INVALID_INPUT':
      return 'Check that input';
    case 'RATE_LIMITED':
      return 'One moment';
    case 'DUPLICATE_OPERATION':
      return 'Already done';
    case 'NOT_IMPLEMENTED':
      return 'Not available yet';
    case 'MEMBER_NOT_FOUND':
      return 'Member not found';
    case 'TIMEOUT':
    case 'DATABASE_UNAVAILABLE':
    case 'DISCORD_API_ERROR':
      return 'Temporarily unavailable';
    default:
      return 'Something went wrong';
  }
}

/** A plain ephemeral acknowledgement. Used far more often than an embed. */
export function ephemeralText(content: string): BloomMessage {
  return { content: truncate(content, DISCORD_LIMITS.messageContent), ephemeral: true };
}
