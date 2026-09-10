/**
 * Bloom Rewards — shared types for the reward ecosystem.
 *
 * The ecosystem is deliberately built from two layers:
 *
 *   1. A CURATED catalog of components and collections (catalog.ts). Admins
 *      and future seasons extend this file (or a database copy of it) — the
 *      engine, store and UI adapt automatically because everything is derived.
 *   2. A DETERMINISTIC selection engine (engine.ts) that maps
 *      (user, day window, catalog version) → a stable "Today's Bloom" and a
 *      stable "Featured Drop". Nothing is random per render; nothing has a
 *      final day.
 */

/** The wellness domains Bloom rewards. Health & fitness lead; rest and care are equal citizens. */
export type RewardDomain =
  | "fitness"
  | "health"
  | "movement"
  | "sleep"
  | "hydration"
  | "recovery"
  | "energy"
  | "habits"
  | "mood"
  | "mindfulness"
  | "study"
  | "self-care"
  | "cycle"
  | "customization";

export const REWARD_DOMAINS: RewardDomain[] = [
  "fitness",
  "health",
  "movement",
  "sleep",
  "hydration",
  "recovery",
  "energy",
  "habits",
  "mood",
  "mindfulness",
  "study",
  "self-care",
  "cycle",
  "customization",
];

/** Domain labels used across the page. */
export const DOMAIN_LABELS: Record<RewardDomain, string> = {
  fitness: "Fitness",
  health: "Health",
  movement: "Movement",
  sleep: "Sleep",
  hydration: "Hydration",
  recovery: "Recovery",
  energy: "Energy",
  habits: "Habits",
  mood: "Mood",
  mindfulness: "Mindfulness",
  study: "Study",
  "self-care": "Self-care",
  cycle: "Cycle",
  customization: "Customization",
};

/** What a component changes in Bloom. Only kinds with a real surface effect are sold as singles. */
export type ComponentKind =
  | "theme"
  | "palette"
  | "wallpaper"
  | "profileFrame"
  | "effect";

export const COMPONENT_KIND_LABELS: Record<ComponentKind, string> = {
  theme: "Theme",
  palette: "Palette",
  wallpaper: "Wallpaper",
  profileFrame: "Profile frame",
  effect: "Effect",
};

/**
 * Rarity ladder — small to legendary. A reward's rarity is metadata; its
 * value is what it actually contains.
 */
export type RewardRarity = "everyday" | "standard" | "premium" | "special" | "signature";

export const RARITY_LABELS: Record<RewardRarity, string> = {
  everyday: "Everyday",
  standard: "Standard",
  premium: "Premium",
  special: "Special",
  signature: "Signature",
};

/** Which Bloom surfaces a reward genuinely touches. */
export type BloomSurface =
  | "Every Bloom surface"
  | "Today"
  | "Rewards"
  | "Profile"
  | "Rail"
  | "Unlock moments";

/** A purchasable / collectible building block. */
export interface ComponentDef {
  id: string;
  kind: ComponentKind;
  title: string;
  /** What the piece is for — shown as the reward's purpose line. */
  intent: string;
  domain: RewardDomain;
  rarity: RewardRarity;
  /** Single price in Bloom Points. */
  points: number;
  /** Artwork key — public asset under /rewards/art/. Null renders a tone treatment. */
  art: string | null;
  /** Signature tone (css color) used for chips, gradients and previews. */
  tone: string;
  /** Real surfaces this component changes once equipped. */
  surfaces: BloomSurface[];
  /** Copy shown in the detail sheet, under "What it does". */
  detail: string;
}

/** A curated set — several components sold as one harmonious configuration. */
export interface CollectionDef {
  id: string;
  title: string;
  /** Short editorial line for cards. */
  intent: string;
  description: string;
  domain: RewardDomain;
  rarity: RewardRarity;
  /** List price in Bloom Points (a bundle is cheaper than its parts). */
  points: number;
  art: string;
  tone: string;
  componentIds: string[];
  /** Line in the detail sheet explaining what the whole configuration does. */
  includes: string;
  surfaces: BloomSurface[];
}

export interface Catalog {
  version: number;
  components: ComponentDef[];
  collections: CollectionDef[];
}

/** One thing the user can own: a component or a complete collection. */
export type OwnedOfferKind = "component" | "collection" | "seal";

export interface OwnedEntry {
  id: string;
  kind: OwnedOfferKind;
  /** Points actually paid (0 for gifts and seals). */
  paid: number;
  /** ISO timestamp. */
  ownedAt: string;
  /** Why it was obtained. */
  source: "unlock" | "gift" | "collection" | "set-complete" | "legacy";
}

/**
 * The equipped customization profile. Fields only exist when a component of
 * that kind is equipped; Bloom Default clears the whole profile.
 */
export interface EquippedProfile {
  themeId?: string;
  paletteId?: string;
  wallpaperId?: string;
  profileFrameId?: string;
  effectId?: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  offerId: string;
  offerTitle: string;
  points: number;
  /** ISO timestamp. */
  date: string;
}

export interface DailyHistoryEntry {
  /** Local date string (yyyy-mm-dd) the entry was for. */
  date: string;
  offerId: string;
  seen: boolean;
  /** true when this day's reward was a free gift. */
  gift: boolean;
}

export interface RewardsStoreState {
  /** Component/collection ids the user owns, in unlock order. */
  owned: OwnedEntry[];
  favorites: string[];
  spent: LedgerEntry[];
  /** Equipped customization (what "Bloom Default" resets). */
  equipped: EquippedProfile;
  /** Recent daily discoveries (rolling, newest last). */
  dailyHistory: DailyHistoryEntry[];
  /** Last featured rotation window indexes per collection (anti-repetition). */
  featuredSeen: { window: number; collectionId: string }[];
}
