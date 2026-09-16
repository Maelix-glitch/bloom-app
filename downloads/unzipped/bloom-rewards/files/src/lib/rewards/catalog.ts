/**
 * Bloom Rewards — curated catalog (catalog version 1).
 *
 * Admins curate the building blocks; the engine generates configurations.
 * Content here is the *seed* catalog: adding one palette or one wallpaper in a
 * later version automatically expands every rotation below — no frontend
 * rewrite is needed, because all selection code is derived from this data.
 *
 * Economy notes: a typical habit tick earns 10–40 Bloom Points and most people
 * tick 2–6 habits a day, so a "premium" theme at 850 points represents roughly
 * two weeks of steady, gentle consistency — and major collections (1,200+)
 * are the aspirational lane. Prices therefore start small (150) and only the
 * most substantial configurations cross 1,000.
 */

import type {
  Catalog,
  CollectionDef,
  ComponentDef,
  ComponentKind,
  RewardRarity,
} from "./types";

/** Artwork lives under /public/rewards/art — one coherent campaign. */
export const REWARD_ART = {
  "serenity-strength": "/rewards/art/serenity-strength.jpg",
  "wellness-morning": "/rewards/art/wellness-morning.jpg",
  "deep-rest": "/rewards/art/deep-rest.jpg",
  "soft-reset": "/rewards/art/soft-reset.jpg",
  "quiet-focus": "/rewards/art/quiet-focus.jpg",
  "moonlit-garden": "/rewards/art/moonlit-garden.jpg",
  "move-breathe": "/rewards/art/move-breathe.jpg",
  "golden-hour": "/rewards/art/golden-hour.jpg",
  "recovery-season": "/rewards/art/recovery-season.jpg",
  "hydration-mist": "/rewards/art/hydration-mist.jpg",
} as const;

export type RewardArtKey = keyof typeof REWARD_ART;

function component(
  id: string,
  kind: ComponentKind,
  title: string,
  intent: string,
  domain: ComponentDef["domain"],
  rarity: RewardRarity,
  points: number,
  tone: string,
  detail: string,
  art: string | null,
  surfaces: ComponentDef["surfaces"],
): ComponentDef {
  return { id, kind, title, intent, domain, rarity, points, tone, detail, art, surfaces };
}

/* ------------------------------- themes ---------------------------------- */
/* A theme is a full, dark, contrast-safe restyle of Bloom's shared surface   */
/* tokens — it genuinely applies to every page that uses them.               */

const THEMES: ComponentDef[] = [
  component(
    "th-velvet-night",
    "theme",
    "Velvet Night",
    "A deep indigo evening for Bloom.",
    "customization",
    "premium",
    850,
    "#b8a5e8",
    "Bloom settles into deep indigo-violet: calmer surfaces, lavender highlights and a quieter midnight feel on every page.",
    REWARD_ART["deep-rest"],
    ["Every Bloom surface"],
  ),
  component(
    "th-honey-hour",
    "theme",
    "Honey Hour",
    "Warm golden light across Bloom.",
    "customization",
    "premium",
    850,
    "#e3c187",
    "A warm amber cast with honeyed highlights — Bloom feels like late afternoon sun through linen curtains.",
    REWARD_ART["golden-hour"],
    ["Every Bloom surface"],
  ),
  component(
    "th-moss-rest",
    "theme",
    "Moss Rest",
    "Quiet sage woodland tones.",
    "customization",
    "premium",
    850,
    "#9ec3a1",
    "Soft sage greens cool the surfaces while keeping the depth — a restful, botanical Bloom.",
    REWARD_ART["serenity-strength"],
    ["Every Bloom surface"],
  ),
  component(
    "th-dusk-rose",
    "theme",
    "Dusk Rose",
    "Dusty rose warmth for quiet evenings.",
    "customization",
    "premium",
    850,
    "#e2a5b8",
    "Muted rose and clay tones with warm charcoal shadows — tender, calm and intimate.",
    REWARD_ART["soft-reset"],
    ["Every Bloom surface"],
  ),
  component(
    "th-midnight-tide",
    "theme",
    "Midnight Tide",
    "Deep blue water at night.",
    "customization",
    "premium",
    850,
    "#9fc3de",
    "Ink-blue surfaces with a cool moonlit highlight — deep, clear and steady.",
    REWARD_ART["hydration-mist"],
    ["Every Bloom surface"],
  ),
  component(
    "th-ink-serenity",
    "theme",
    "Ink Serenity",
    "Minimal charcoal with a breath of sky.",
    "customization",
    "premium",
    850,
    "#a8c6de",
    "Near-neutral charcoal keeps everything quiet while a soft sky accent lifts focus where it matters.",
    REWARD_ART["quiet-focus"],
    ["Every Bloom surface"],
  ),
];

/* ------------------------------- palettes -------------------------------- */
/* A palette restyles Bloom's accent (primary highlights, active marks).     */

const PALETTES: ComponentDef[] = [
  component(
    "pl-lavender-mist",
    "palette",
    "Lavender Mist",
    "Bloom's violet, softened to lavender.",
    "customization",
    "everyday",
    150,
    "#b8a5e8",
    "Shifts Bloom's accent to a gentle lavender — the closest cousin of the Bloom default.",
    null,
    ["Every Bloom surface"],
  ),
  component(
    "pl-honey-light",
    "palette",
    "Honey Light",
    "A warm gold accent.",
    "customization",
    "everyday",
    150,
    "#e3c187",
    "Warm honey replaces the accent — highlights feel like candlelight.",
    null,
    ["Every Bloom surface"],
  ),
  component(
    "pl-sage-glow",
    "palette",
    "Sage Glow",
    "A living green accent.",
    "customization",
    "everyday",
    150,
    "#9ec3a1",
    "Fresh sage green for active marks and highlights — growth, not pressure.",
    null,
    ["Every Bloom surface"],
  ),
  component(
    "pl-rose-dawn",
    "palette",
    "Rose Dawn",
    "A tender dusty-rose accent.",
    "customization",
    "everyday",
    150,
    "#e2a5b8",
    "Soft rose for Bloom's highlights — warm and gentle.",
    null,
    ["Every Bloom surface"],
  ),
  component(
    "pl-mist-blue",
    "palette",
    "Mist Blue",
    "A clear sky accent.",
    "customization",
    "everyday",
    150,
    "#a8c6de",
    "A calm, clear blue — like morning sky through mist.",
    null,
    ["Every Bloom surface"],
  ),
];

/* ------------------------------ wallpapers ------------------------------- */
/* A wallpaper is the ambient artwork behind Bloom's home and rewards.       */

const WALLPAPERS: ComponentDef[] = [
  component(
    "wp-moonlit-garden",
    "wallpaper",
    "Moonlit Garden",
    "A garden that glows after dark.",
    "sleep",
    "standard",
    300,
    "#b8a5e8",
    "Luminous flowers and silver moonlight — the home ambience turns into a night garden.",
    REWARD_ART["moonlit-garden"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-first-light",
    "wallpaper",
    "First Light",
    "A calm morning table by the window.",
    "health",
    "standard",
    300,
    "#e3c187",
    "Soft morning light on linen and citrus — a fresh, unhurried start to the day.",
    REWARD_ART["wellness-morning"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-hushed-dawn",
    "wallpaper",
    "Hushed Dawn",
    "Gentle movement at sunrise.",
    "movement",
    "standard",
    300,
    "#9ec3a1",
    "Quiet early-morning stretch and light — movement as a kindness, not a chore.",
    REWARD_ART["serenity-strength"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-coastal-mist",
    "wallpaper",
    "Coastal Mist",
    "A slow walk through morning fog.",
    "movement",
    "standard",
    300,
    "#a8c6de",
    "Pearl mist over a morning path — breathing room for the day ahead.",
    REWARD_ART["move-breathe"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-rain-glass",
    "wallpaper",
    "Rain Glass",
    "Rain tracing the window at dusk.",
    "mindfulness",
    "standard",
    300,
    "#9fc3de",
    "Rain-streaked glass and lamplight — an invitation to slow down and stay in.",
    REWARD_ART["recovery-season"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-candle-glow",
    "wallpaper",
    "Candle Glow",
    "Evening tea by warm light.",
    "self-care",
    "standard",
    300,
    "#e2a5b8",
    "Candlelight, steam and folded linen — the ambience of an evening given back to you.",
    REWARD_ART["soft-reset"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-still-water",
    "wallpaper",
    "Still Water",
    "A clear glass in cool light.",
    "hydration",
    "standard",
    300,
    "#a8c6de",
    "Cool clarity and fine mist — a reminder that water is care.",
    REWARD_ART["hydration-mist"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-night-sky",
    "wallpaper",
    "Night Sky",
    "A moonlit room at rest.",
    "sleep",
    "standard",
    300,
    "#b8a5e8",
    "Silver-blue moonlight across quiet linen — rest as the day's real finish line.",
    REWARD_ART["deep-rest"],
    ["Today", "Rewards"],
  ),
  component(
    "wp-golden-dusk",
    "wallpaper",
    "Golden Dusk",
    "Wild grass in the last light.",
    "energy",
    "standard",
    300,
    "#e3c187",
    "Honey light through tall grass at the edge of night — a soft landing for a full day.",
    REWARD_ART["golden-hour"],
    ["Today", "Rewards"],
  ),
];

/* ----------------------------- profile frames ---------------------------- */
/* A frame is the identity ring around your Bloom profile mark.             */

const FRAMES: ComponentDef[] = [
  component(
    "fr-crescent",
    "profileFrame",
    "Crescent",
    "A quiet silver-crescent ring.",
    "customization",
    "standard",
    250,
    "#c9c2e8",
    "A slender moonlit crescent rings your profile mark wherever Bloom shows it.",
    null,
    ["Profile", "Rail"],
  ),
  component(
    "fr-laurel",
    "profileFrame",
    "Laurel",
    "A soft botanical ring.",
    "customization",
    "standard",
    250,
    "#9ec3a1",
    "Fine leaves in sage and gold circle your profile mark like a quiet wreath.",
    null,
    ["Profile", "Rail"],
  ),
  component(
    "fr-gold-line",
    "profileFrame",
    "Gold Line",
    "A precise hairline of gold.",
    "customization",
    "standard",
    250,
    "#e3c187",
    "One unbroken line of warm gold — minimal, precise, unmistakably yours.",
    null,
    ["Profile", "Rail"],
  ),
  component(
    "fr-soft-bloom",
    "profileFrame",
    "Soft Bloom",
    "A gentle double ring.",
    "customization",
    "standard",
    250,
    "#e2a5b8",
    "Two fine rings — one light, one luminous — like the first petals opening.",
    null,
    ["Profile", "Rail"],
  ),
  component(
    "fr-halo",
    "profileFrame",
    "Halo",
    "A breath of light around the mark.",
    "customization",
    "standard",
    250,
    "#a8c6de",
    "A soft halo of light rather than a hard line — calm and open.",
    null,
    ["Profile", "Rail"],
  ),
];

/* -------------------------------- effects -------------------------------- */
/* An effect is the visual character of Bloom's reward moments — unlock      */
/* celebrations and the ambient bloom that follows them.                     */

const EFFECTS: ComponentDef[] = [
  component(
    "fx-petals",
    "effect",
    "Petals",
    "Soft petals drift on unlock.",
    "customization",
    "standard",
    350,
    "#e2a5b8",
    "A few petals catch the light and drift away when a reward is yours — never more than a breath.",
    null,
    ["Unlock moments"],
  ),
  component(
    "fx-ember-light",
    "effect",
    "Ember Light",
    "Warm embers rise and fade.",
    "customization",
    "standard",
    350,
    "#e3c187",
    "Tiny warm embers rise from the artwork and fade — a quiet firework for one.",
    null,
    ["Unlock moments"],
  ),
  component(
    "fx-rain-spark",
    "effect",
    "Rain Spark",
    "Cool sparks like rain on glass.",
    "customization",
    "standard",
    350,
    "#a8c6de",
    "Fine cool sparks, like droplets catching light, settle as the reward appears.",
    null,
    ["Unlock moments"],
  ),
  component(
    "fx-starlight",
    "effect",
    "Starlight",
    "Slow silver stars fade in.",
    "customization",
    "standard",
    350,
    "#c9c2e8",
    "A scatter of slow stars blooms once, then rests — the quietest celebration.",
    null,
    ["Unlock moments"],
  ),
  component(
    "fx-mist",
    "effect",
    "Morning Mist",
    "Soft mist rolls across the art.",
    "customization",
    "standard",
    350,
    "#9ec3a1",
    "A gentle veil of mist crosses the artwork as it reveals itself.",
    null,
    ["Unlock moments"],
  ),
];

/* ------------------------------ collections ------------------------------ */
/* Each collection is one harmonious configuration of the building blocks —  */
/* the "featured drop" surface. Every piece inside is also sold individually.*/

const COLLECTIONS: CollectionDef[] = [
  {
    id: "set-serenity-strength",
    title: "Serenity & Strength",
    intent: "Mindful movement and quiet power.",
    description:
      "A collection for the days you move because you care for yourself — gentle morning light, steady breath and the quiet strength that grows from consistency, never punishment.",
    domain: "fitness",
    rarity: "special",
    points: 1200,
    art: REWARD_ART["serenity-strength"],
    tone: "#9ec3a1",
    componentIds: ["th-moss-rest", "pl-sage-glow", "wp-hushed-dawn", "fr-soft-bloom", "fx-ember-light"],
    includes:
      "One complete look: the Moss Rest theme, Sage Glow palette, Hushed Dawn wallpaper, Soft Bloom profile frame and Ember Light unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-wellness-morning",
    title: "Wellness Morning",
    intent: "A bright, gentle start for body and mind.",
    description:
      "Hydration, nourishment and unhurried morning ritual — wrapped in honeyed light. For the health routines that are really small acts of self-respect.",
    domain: "health",
    rarity: "premium",
    points: 950,
    art: REWARD_ART["wellness-morning"],
    tone: "#e3c187",
    componentIds: ["th-honey-hour", "pl-honey-light", "wp-first-light", "fr-laurel", "fx-petals"],
    includes:
      "One complete look: the Honey Hour theme, Honey Light palette, First Light wallpaper, Laurel profile frame and Petals unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-deep-rest",
    title: "Deep Rest",
    intent: "An evening Bloom that protects your sleep.",
    description:
      "The day ends when you say it does. Deep indigo, moonlit linen and the quietest of celebrations — a collection for people who treat rest as a practice.",
    domain: "sleep",
    rarity: "special",
    points: 1500,
    art: REWARD_ART["deep-rest"],
    tone: "#b8a5e8",
    componentIds: ["th-velvet-night", "pl-lavender-mist", "wp-night-sky", "fr-crescent", "fx-starlight"],
    includes:
      "One complete look: the Velvet Night theme, Lavender Mist palette, Night Sky wallpaper, Crescent profile frame and Starlight unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-soft-reset",
    title: "Soft Reset",
    intent: "An evening given back to yourself.",
    description:
      "Tea, candlelight and nothing on the list. Soft Reset wraps Bloom in dusty rose warmth for the self-care evenings that let the next day begin well.",
    domain: "self-care",
    rarity: "special",
    points: 1150,
    art: REWARD_ART["soft-reset"],
    tone: "#e2a5b8",
    componentIds: ["th-dusk-rose", "pl-rose-dawn", "wp-candle-glow", "fr-halo", "fx-mist"],
    includes:
      "One complete look: the Dusk Rose theme, Rose Dawn palette, Candle Glow wallpaper, Halo profile frame and Morning Mist unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-quiet-focus",
    title: "Quiet Focus",
    intent: "Charcoal calm for deep study.",
    description:
      "A desk at dusk, rain on glass and one thing at a time. Quiet Focus lowers the visual temperature so your attention has somewhere to land.",
    domain: "study",
    rarity: "premium",
    points: 1000,
    art: REWARD_ART["quiet-focus"],
    tone: "#a8c6de",
    componentIds: ["th-ink-serenity", "pl-mist-blue", "wp-rain-glass", "fr-gold-line", "fx-rain-spark"],
    includes:
      "One complete look: the Ink Serenity theme, Mist Blue palette, Rain Glass wallpaper, Gold Line profile frame and Rain Spark unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-moonlit-garden",
    title: "Moonlit Garden",
    intent: "Bloom becomes a garden that never sleeps.",
    description:
      "Luminous flowers, midnight tide and petals that fall like slow thoughts — for night owls whose best hours begin after the world quiets.",
    domain: "sleep",
    rarity: "special",
    points: 1300,
    art: REWARD_ART["moonlit-garden"],
    tone: "#b8a5e8",
    componentIds: ["th-midnight-tide", "pl-lavender-mist", "wp-moonlit-garden", "fr-soft-bloom", "fx-petals"],
    includes:
      "One complete look: the Midnight Tide theme, Lavender Mist palette, Moonlit Garden wallpaper, Soft Bloom profile frame and Petals unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-move-breathe",
    title: "Move & Breathe",
    intent: "A daily walk, beautifully framed.",
    description:
      "Movement needs no gym and no scoreboard — a slow walk in mist, breath by breath. Move & Breathe is Bloom's gentlest fitness collection.",
    domain: "movement",
    rarity: "premium",
    points: 850,
    art: REWARD_ART["move-breathe"],
    tone: "#9ec3a1",
    componentIds: ["th-moss-rest", "pl-sage-glow", "wp-coastal-mist", "fr-halo", "fx-mist"],
    includes:
      "One complete look: the Moss Rest theme, Sage Glow palette, Coastal Mist wallpaper, Halo profile frame and Morning Mist unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-golden-hour",
    title: "Golden Hour",
    intent: "Energy that ends gently.",
    description:
      "For the bright, full days — movement, mood, momentum — finished off in honeyed dusk instead of glare. Warmth without the edge.",
    domain: "energy",
    rarity: "special",
    points: 1350,
    art: REWARD_ART["golden-hour"],
    tone: "#e3c187",
    componentIds: ["th-honey-hour", "pl-honey-light", "wp-golden-dusk", "fr-gold-line", "fx-ember-light"],
    includes:
      "One complete look: the Honey Hour theme, Honey Light palette, Golden Dusk wallpaper, Gold Line profile frame and Ember Light unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-still-and-clear",
    title: "Still & Clear",
    intent: "Hydration as a form of calm.",
    description:
      "Cool water, clear light, steady habits. Still & Clear keeps Bloom fresh and uncluttered — the collection for people who hydrate like it matters, because it does.",
    domain: "hydration",
    rarity: "premium",
    points: 1050,
    art: REWARD_ART["hydration-mist"],
    tone: "#a8c6de",
    componentIds: ["th-midnight-tide", "pl-mist-blue", "wp-still-water", "fr-crescent", "fx-rain-spark"],
    includes:
      "One complete look: the Midnight Tide theme, Mist Blue palette, Still Water wallpaper, Crescent profile frame and Rain Spark unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
  {
    id: "set-recovery-season",
    title: "Recovery Season",
    intent: "A whole season for coming back to yourself.",
    description:
      "Rest is not the absence of progress — it is progress of a different kind. Recovery Season wraps Bloom in rose and candlelight for the weeks you rebuild.",
    domain: "recovery",
    rarity: "signature",
    points: 1750,
    art: REWARD_ART["recovery-season"],
    tone: "#e2a5b8",
    componentIds: ["th-dusk-rose", "pl-rose-dawn", "wp-candle-glow", "fr-laurel", "fx-starlight"],
    includes:
      "One complete look: the Dusk Rose theme, Rose Dawn palette, Candle Glow wallpaper, Laurel profile frame and Starlight unlock effect.",
    surfaces: ["Every Bloom surface", "Today", "Rewards", "Profile", "Rail"],
  },
];

export const CATALOG: Catalog = {
  version: 1,
  components: [...THEMES, ...PALETTES, ...WALLPAPERS, ...FRAMES, ...EFFECTS],
  collections: COLLECTIONS,
};

/** Fast lookups. */
export const componentsById = new Map<string, ComponentDef>(
  CATALOG.components.map((c) => [c.id, c]),
);
export const collectionsById = new Map<string, CollectionDef>(
  CATALOG.collections.map((c) => [c.id, c]),
);

/** Every purchasable offer: all components (singles) + collections. */
export interface Offer {
  id: string;
  type: "single" | "collection";
  title: string;
  intent: string;
  domain: CollectionDef["domain"];
  rarity: RewardRarity;
  points: number;
  art: string | null;
  tone: string;
  surfaces: string[];
  detail: string;
  componentIds: string[];
  /** true when the single is also inside a collection. */
  inCollection?: boolean;
}

export const ALL_OFFERS: Offer[] = [
  ...CATALOG.components.map((c) => ({
    id: c.id,
    type: "single" as const,
    title: c.title,
    intent: c.intent,
    domain: c.domain,
    rarity: c.rarity,
    points: c.points,
    art: c.art,
    tone: c.tone,
    surfaces: c.surfaces,
    detail: c.detail,
    componentIds: [c.id],
  })),
  ...CATALOG.collections.map((c) => ({
    id: c.id,
    type: "collection" as const,
    title: c.title,
    intent: c.intent,
    domain: c.domain,
    rarity: c.rarity,
    points: c.points,
    art: c.art,
    tone: c.tone,
    surfaces: c.surfaces,
    detail: c.description,
    componentIds: c.componentIds,
  })),
];

export const offerById = new Map<string, Offer>(ALL_OFFERS.map((o) => [o.id, o]));

/** Components that belong to at least one collection (singles sold alongside). */
const inCollection = new Set<string>(COLLECTIONS.flatMap((c) => c.componentIds));
for (const o of ALL_OFFERS) {
  if (o.type === "single") o.inCollection = inCollection.has(o.id);
}

/** Kind labels for the component list inside a collection detail. */
export const KIND_GLYPH: Record<ComponentKind, string> = {
  theme: "Theme",
  palette: "Palette",
  wallpaper: "Wallpaper",
  profileFrame: "Frame",
  effect: "Effect",
};

/** One-line daily ritual of care copy shown next to domain tiles. */
export const DOMAIN_RITUALS: Partial<Record<CollectionDef["domain"], string>> = {
  fitness: "Move because you care for yourself.",
  health: "Small daily acts of self-respect.",
  movement: "A walk counts. A stretch counts.",
  sleep: "Rest is a practice, not a reward for exhaustion.",
  hydration: "Water is care you can hold.",
  recovery: "Rebuilding is progress too.",
  energy: "End gently, begin fresh.",
  habits: "Small steps. Beautiful rewards.",
  mood: "Feelings are data, not verdicts.",
  mindfulness: "A minute of attention is enough.",
  study: "Deep focus, kindly paced.",
  "self-care": "An evening given back to yourself.",
  cycle: "Live with your rhythm, not against it.",
  customization: "Make Bloom yours.",
};
