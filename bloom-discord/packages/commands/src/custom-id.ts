import { BloomError, isBotName, type BotName } from '@bloom/shared-types';

/**
 * Custom ids for buttons, select menus and modals.
 *
 * Discord hands a custom id back verbatim when a component is used, and it is
 * the only routing information the interaction carries. Two consequences shape
 * this module:
 *
 *   1. **It is attacker-controllable in practice.** Not because a member can
 *      type one — they cannot — but because a component posted by any bot in
 *      the server arrives through the same gateway event. Routing on an
 *      unvalidated string is how one bot ends up executing another's handler.
 *      Every id is parsed and validated on the way in, and a malformed one is
 *      refused rather than best-guessed.
 *   2. **It is 100 characters, hard.** Discord rejects the message, not the
 *      component, so an id that grows past the limit takes the whole reply down
 *      with it. The cap is enforced at encode time, where the failure is a
 *      developer's problem, instead of at send time where it is a member's.
 *
 * The shape is `bot:feature:action` with an optional `:argument`, which is what
 * the commands reference has documented since Phase 0.
 */

export const CUSTOM_ID_MAX_LENGTH = 100;
const SEPARATOR = ':';

/** Segments are lowercase identifiers. No separator, no surprises. */
const SEGMENT_PATTERN = /^[a-z][a-z0-9_-]{0,30}$/;

/**
 * Arguments are looser — they carry ids and keys — but still constrained.
 *
 * Deliberately excludes the separator, so an argument cannot forge extra
 * segments and make `feedback` route to `admin`.
 */
const ARGUMENT_PATTERN = /^[A-Za-z0-9_.-]{1,60}$/;

export interface CustomId {
  readonly bot: BotName;
  /** The feature that owns the handler, e.g. `feedback`. */
  readonly feature: string;
  /** What to do, e.g. `submit`. */
  readonly action: string;
  /** Optional payload: a bug id, a cohort key. Never member-authored text. */
  readonly argument: string | null;
}

/** The `bot:feature:action` prefix a handler registers under. */
export function customIdRoute(id: Pick<CustomId, 'bot' | 'feature' | 'action'>): string {
  return [id.bot, id.feature, id.action].join(SEPARATOR);
}

/**
 * Build a custom id, or throw.
 *
 * Throwing rather than truncating is deliberate. A truncated id still looks
 * like an id, routes to the wrong handler or to none, and turns a typo into a
 * button that silently does nothing.
 */
export function encodeCustomId(input: {
  readonly bot: BotName;
  readonly feature: string;
  readonly action: string;
  readonly argument?: string | null;
}): string {
  for (const [name, value] of [
    ['feature', input.feature],
    ['action', input.action],
  ] as const) {
    if (!SEGMENT_PATTERN.test(value)) {
      throw new BloomError('INVALID_INPUT', {
        operatorHint: `Custom id ${name} "${value}" must be a lowercase identifier.`,
      });
    }
  }

  const argument = input.argument ?? null;
  if (argument !== null && !ARGUMENT_PATTERN.test(argument)) {
    throw new BloomError('INVALID_INPUT', {
      operatorHint: `Custom id argument "${argument}" contains unsupported characters.`,
    });
  }

  const encoded = [
    input.bot,
    input.feature,
    input.action,
    ...(argument ? [argument] : []),
  ].join(SEPARATOR);

  if (encoded.length > CUSTOM_ID_MAX_LENGTH) {
    throw new BloomError('INVALID_INPUT', {
      operatorHint:
        `Custom id "${encoded}" is ${String(encoded.length)} characters; ` +
        `Discord allows ${String(CUSTOM_ID_MAX_LENGTH)}.`,
    });
  }

  return encoded;
}

/**
 * Parse a custom id that arrived from Discord.
 *
 * Returns `null` rather than throwing. An unrecognised id is routine — another
 * application's component in a shared channel produces one on every click — and
 * it is not an error worth a log line at error severity, let alone an error
 * message shown to whoever pressed the button.
 */
export function parseCustomId(raw: string): CustomId | null {
  if (raw.length > CUSTOM_ID_MAX_LENGTH) return null;

  const parts = raw.split(SEPARATOR);
  if (parts.length < 3 || parts.length > 4) return null;

  const [bot, feature, action, argument] = parts;
  if (bot === undefined || feature === undefined || action === undefined) return null;
  if (!isBotName(bot)) return null;
  if (!SEGMENT_PATTERN.test(feature) || !SEGMENT_PATTERN.test(action)) return null;
  if (argument !== undefined && !ARGUMENT_PATTERN.test(argument)) return null;

  return { bot, feature, action, argument: argument ?? null };
}
