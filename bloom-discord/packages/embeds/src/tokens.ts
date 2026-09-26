/**
 * Bloom visual identity.
 *
 * A small, muted palette used consistently. The brief asks for restraint, and
 * restraint in Discord means a narrow set of colours applied by *meaning*, not a
 * different colour per feature — a member should be able to tell at a glance
 * whether something succeeded or needs attention, without a rainbow.
 */
export const BloomColour = {
  /** Default. Soft sage — the resting state of almost every Bloom message. */
  bloom: 0x8fae87,
  /** Something completed. Deeper green, used sparingly. */
  success: 0x5f8f6a,
  /** Needs attention, nothing is broken. Warm sand. */
  notice: 0xc9a86b,
  /** Something failed. Muted clay, deliberately not a fire-engine red. */
  error: 0xb2705f,
  /** Staff-only and audit output. Slate, visually distinct from member-facing messages. */
  staff: 0x6b7689,
  /** Neutral, for informational panels. */
  neutral: 0x9aa39b,
} as const;

export type BloomColourName = keyof typeof BloomColour;

/**
 * Text style rules, encoded so they can be linted rather than remembered.
 *
 * Bloom is a wellbeing product. The voice is calm, short and adult. What that
 * rules out, concretely:
 */
export const TEXT_STYLE = {
  /** No exclamation marks in automated copy. "Welcome to Bloom Labs." not "Welcome!!!" */
  allowExclamation: false,
  /** No emoji in body text. The category glyphs in channel names are enough. */
  allowEmojiInBody: false,
  /** Descriptions stay short enough to read without scrolling. */
  maxDescriptionChars: 600,
  /** More than this many fields and it is a dashboard, not a message. */
  maxFields: 6,
} as const;
