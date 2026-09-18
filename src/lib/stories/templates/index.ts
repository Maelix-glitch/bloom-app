/**
 * Bloom Story Templates — registry.
 *
 * One place knows every template: lookup, categories, natural-language
 * search, favourites and recents. Templates are pure data, so adding a
 * design never touches a component.
 */

import type { StoryDataMetric } from "@/lib/stories/types";
import {
  STORY_TEMPLATE_COLLECTION,
  TEMPLATE_COUNT,
  assertCollectionIsValid,
  validateCollection,
} from "./collection";
import {
  instantiate,
  templateMetrics,
  templatePhotoCount,
  TEMPLATE_CATEGORIES,
  type InstantiatedTemplate,
  type StoryTemplateDef,
  type TemplateCategoryId,
} from "./dsl";

export * from "./dsl";

/**
 * The production template library: exactly fifty curated designs.
 *
 * This array is the whole catalogue. There is no second list, no hidden
 * experimental shelf and no legacy set kept "just in case" — the collection
 * module is the only place templates are defined, and it asserts its own
 * count. `STORY_TEMPLATE_LIBRARY.length === 50` is checked in the test suite.
 */
export const STORY_TEMPLATE_LIBRARY: StoryTemplateDef[] = STORY_TEMPLATE_COLLECTION;

/** The number this library must always hold. */
export const STORY_TEMPLATE_COUNT = TEMPLATE_COUNT;

export { assertCollectionIsValid, validateCollection };

const BY_ID = new Map(STORY_TEMPLATE_LIBRARY.map((t) => [t.id, t]));

export function templateById(id: string | null | undefined): StoryTemplateDef | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function templatesByCategory(category: TemplateCategoryId): StoryTemplateDef[] {
  return STORY_TEMPLATE_LIBRARY.filter((t) => t.category === category);
}

/** Sections the browser shows, in order. */
export function templateSections(): {
  id: TemplateCategoryId;
  label: string;
  items: StoryTemplateDef[];
}[] {
  return TEMPLATE_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    items: templatesByCategory(c.id),
  })).filter((s) => s.items.length > 0);
}

/* --------------------------------- search -------------------------------- */

/** Phrases people actually type, mapped to what they mean here. */
/**
 * Phrases people actually type, mapped onto the seven collections.
 *
 * Kept deliberately small. Search over fifty templates does not need twenty-six
 * intent rules; it needs the handful of things someone says when they half know
 * what they want.
 */
const INTENTS: { match: RegExp; tags: string[]; categories?: TemplateCategoryId[] }[] = [
  {
    match: /\b(morning|sunrise|coffee|wake|today|daily|currently|weekend)\b/,
    tags: ["morning", "daily", "minimal"],
    categories: ["everyday"],
  },
  {
    match: /\b(night|evening|dark|late|sleep|rest|rested)\b/,
    tags: ["night", "dark", "sleep"],
    categories: ["everyday", "wellness"],
  },
  {
    match:
      /\b(memor|remember|moment|nostalg|archive|polaroid|scrapbook|collage|travel|trip|place|somewhere)\b/,
    tags: ["memory", "archive", "photo", "travel"],
    categories: ["memories"],
  },
  {
    match: /\b(mood|feeling|feel|emotion|energy|quiet|weather)\b/,
    tags: ["mood", "feeling", "quiet"],
    categories: ["mood"],
  },
  {
    match:
      /\b(win|proud|achieve|progress|habit|streak|step|goal|done it|kept going|milestone|showed up)\b/,
    tags: ["progress", "win", "habits"],
    categories: ["progress"],
  },
  {
    match: /\b(wellness|self ?care|health|hydrat|water|move|movement|work ?out|gym|better)\b/,
    tags: ["wellness", "self care", "movement", "hydration"],
    categories: ["wellness"],
  },
  {
    match: /\b(grateful|gratitude|thankful|learn|thought|reflect|journal|study|future me|taught)\b/,
    tags: ["reflection", "gratitude", "text"],
    categories: ["reflection"],
  },
  {
    match: /\b(celebrat|birthday|party|we did it|smile|joy|good day|special)\b/,
    tags: ["celebration", "joy"],
    categories: ["celebration"],
  },
  { match: /\b(minimal|clean|simple|space|quiet|empty|airy)\b/, tags: ["minimal", "clean"] },
  { match: /\b(photo|picture|image|camera)\b/, tags: ["photo"] },
  { match: /\b(text|quote|words|typing|type|write)\b/, tags: ["text", "typography"] },
  { match: /\b(editorial|poster|magazine)\b/, tags: ["editorial"] },
  { match: /\b(cinema|film|movie|cinematic)\b/, tags: ["cinematic", "dark"] },
  { match: /\b(data|numbers|stats|tracker|logged)\b/, tags: ["data"] },
  { match: /(\d+)\s*photo/, tags: ["__count__"] },
];

const countMatch = (query: string): number | null => {
  const m = /(\d+)\s*photo/.exec(query);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 && n <= 9 ? n : null;
  }
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    six: 6,
    nine: 9,
  };
  const w = /\b(one|two|three|four|six|nine)\b/.exec(query);
  return w ? (words[w[1] as keyof typeof words] ?? null) : null;
};

export interface TemplateSearchHit {
  template: StoryTemplateDef;
  score: number;
}

/**
 * Natural-language template search. Understands intent phrases ("something
 * for my workout"), slot counts ("three photos") and plain keywords.
 */
export function searchTemplates(query: string, limit = 24): StoryTemplateDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const wantedCount = countMatch(q);
  const hits: TemplateSearchHit[] = [];

  const intentTags = new Set<string>();
  const intentCategories = new Set<TemplateCategoryId>();
  for (const intent of INTENTS) {
    if (!intent.match.test(q)) continue;
    for (const tag of intent.tags) if (tag !== "__count__") intentTags.add(tag);
    for (const cat of intent.categories ?? []) intentCategories.add(cat);
  }

  const terms = q
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  for (const template of STORY_TEMPLATE_LIBRARY) {
    const photoCount = templatePhotoCount(template);
    let score = 0;

    if (wantedCount !== null) {
      if (photoCount === wantedCount) score += 6;
      else score -= 3;
    }
    if (intentCategories.has(template.category)) score += 4;

    const hay =
      `${template.name} ${template.hint} ${template.tags.join(" ")} ${template.category}`.toLowerCase();
    const tagSet = new Set(template.tags.map((t) => t.toLowerCase()));

    for (const tag of intentTags) {
      if (tagSet.has(tag.toLowerCase())) score += 3;
      else if (hay.includes(tag)) score += 1;
    }

    for (const term of terms) {
      if (template.name.toLowerCase().includes(term)) score += 4;
      else if (tagSet.has(term)) score += 3;
      else if (hay.includes(term)) score += 1;
      else score -= 2;
    }

    if (score > 0) hits.push({ template, score });
  }

  hits.sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
  return hits.slice(0, limit).map((h) => h.template);
}

const STOPWORDS = new Set([
  "the",
  "for",
  "and",
  "with",
  "something",
  "anything",
  "template",
  "templates",
  "that",
  "has",
  "have",
  "lots",
  "lot",
  "some",
  "one",
  "two",
  "three",
  "four",
  "six",
  "nine",
  "photo",
  "photos",
  "about",
  "into",
  "this",
  "from",
]);

/* --------------------------- favourites + recents ------------------------- */

const FAV_KEY = "bloom.story.templates.favorites.v1";
const RECENT_KEY = "bloom.story.templates.recent.v1";

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((v): v is string => typeof v === "string" && BY_ID.has(v))
      : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 40)));
  } catch {
    /* best-effort */
  }
}

export const TEMPLATES_CHANGED = "bloom:story-templates-changed";

export function favoriteTemplateIds(): string[] {
  return readIds(FAV_KEY);
}

export function recentTemplateIds(): string[] {
  return readIds(RECENT_KEY);
}

export function toggleTemplateFavorite(id: string): boolean {
  const list = readIds(FAV_KEY);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  writeIds(FAV_KEY, next);
  notify();
  return next.includes(id);
}

export function recordTemplateUse(id: string): void {
  if (!BY_ID.has(id)) return;
  writeIds(RECENT_KEY, [id, ...readIds(RECENT_KEY).filter((x) => x !== id)]);
  notify();
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TEMPLATES_CHANGED));
}

export function favoriteTemplates(): StoryTemplateDef[] {
  return readIds(FAV_KEY)
    .map((id) => BY_ID.get(id))
    .filter((t): t is StoryTemplateDef => Boolean(t));
}

export function recentTemplates(): StoryTemplateDef[] {
  return readIds(RECENT_KEY)
    .map((id) => BY_ID.get(id))
    .filter((t): t is StoryTemplateDef => Boolean(t));
}

/* -------------------------------- metadata ------------------------------- */

export interface TemplateMeta {
  photoSlots: number;
  metrics: StoryDataMetric[];
  hasText: boolean;
  hasStickers: boolean;
}

export function templateMeta(def: StoryTemplateDef): TemplateMeta {
  return {
    photoSlots: templatePhotoCount(def),
    metrics: templateMetrics(def),
    hasText: def.seeds.some((s) => s.kind === "text"),
    hasStickers: def.seeds.some((s) => s.kind === "sticker"),
  };
}

/** Build a live composition — used by the browser preview and the editor. */
export function instantiateTemplate(
  idOrDef: string | StoryTemplateDef,
): { def: StoryTemplateDef; composed: InstantiatedTemplate } | null {
  const def = typeof idOrDef === "string" ? templateById(idOrDef) : idOrDef;
  if (!def) return null;
  return { def, composed: instantiate(def) };
}
