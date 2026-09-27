/**
 * Message DTOs.
 *
 * These are plain data, not discord.js builders. Two reasons:
 *
 *   1. It keeps the discord.js boundary intact — presentation logic is testable
 *      by asserting on objects, with no library and no mocking.
 *   2. Builder APIs churn between Discord library majors. A DTO does not, so a
 *      library upgrade touches one adapter file instead of every feature.
 */

export interface BloomEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline?: boolean;
}

export interface BloomEmbed {
  readonly title?: string;
  readonly description?: string;
  readonly colour?: number;
  readonly fields?: readonly BloomEmbedField[];
  readonly footer?: string;
  /** Only where the reader genuinely needs it — not on every message. */
  readonly timestamp?: Date;
  readonly url?: string;
}

export type ButtonStyle = 'primary' | 'secondary' | 'success' | 'danger' | 'link';

export interface BloomButton {
  readonly kind: 'button';
  /** Routed back to a handler. Namespaced `bot:feature:action[:arg]`. */
  readonly customId?: string;
  readonly url?: string;
  readonly label: string;
  readonly style: ButtonStyle;
  readonly disabled?: boolean;
}

export interface BloomSelectOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly default?: boolean;
}

export interface BloomSelectMenu {
  readonly kind: 'select';
  readonly customId: string;
  readonly placeholder?: string;
  readonly options: readonly BloomSelectOption[];
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly disabled?: boolean;
}

export type BloomComponent = BloomButton | BloomSelectMenu;

export interface BloomActionRow {
  readonly components: readonly BloomComponent[];
}

export interface BloomModalField {
  readonly customId: string;
  readonly label: string;
  readonly style: 'short' | 'paragraph';
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
}

export interface BloomModal {
  readonly customId: string;
  readonly title: string;
  readonly fields: readonly BloomModalField[];
}

export interface BloomMessage {
  readonly content?: string;
  readonly embeds?: readonly BloomEmbed[];
  readonly rows?: readonly BloomActionRow[];
  /**
   * Only the invoking user sees this.
   *
   * The default for anything that is an answer to one person, anything
   * staff-facing, and every error. A public reply is a deliberate choice.
   */
  readonly ephemeral?: boolean;
}
