/**
 * Bloom Story Templates — registry.
 *
 * One place knows every template: lookup, categories, natural-language
 * search, favourites and recents. Templates are pure data, so adding a
 * design never touches a component.
 */

import type { StoryDataMetric } from "@/lib/stories/types";
import { DAY_TEMPLATES } from "./library/days";
import { BODY_TEMPLATES } from "./library/body";
import { LIVING_TEMPLATES } from "./library/living";
import { STYLE_TEMPLATES } from "./library/style";
import { BOARD_TEMPLATES } from "./library/boards";
import { MORE_TEMPLATES } from "./library/more";
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

export const STORY_TEMPLATE_LIBRARY: StoryTemplateDef[] = [
  ...DAY_TEMPLATES,
  ...BODY_TEMPLATES,
  ...LIVING_TEMPLATES,
  ...STYLE_TEMPLATES,
  ...BOARD_TEMPLATES,
  ...MORE_TEMPLATES,
];

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
const INTENTS: { match: RegExp; tags: string[]; categories?: TemplateCategoryId[] }[] = [
  {
    match: /\b(work ?out|gym|exercise|run|training|fitness)\b/,
    tags: ["fitness", "movement", "strong"],
    categories: ["fitness"],
  },
  {
    match: /\b(cute|sweet|adorable|kawaii)\b/,
    tags: ["playful", "cute", "soft"],
    categories: ["playful"],
  },
  {
    match: /\b(dark|moody|night|evening|midnight)\b/,
    tags: ["dark", "night", "moody"],
    categories: ["night", "cinematic"],
  },
  {
    match: /\b(birthday|celebrat|party)\b/,
    tags: ["birthday", "celebrate", "party"],
    categories: ["seasonal"],
  },
  {
    match: /\b(mood|feeling|emotion)\b/,
    tags: ["mood", "feeling", "check in"],
    categories: ["mood"],
  },
  {
    match: /\b(travel|holiday|vacation|trip|beach)\b/,
    tags: ["travel", "beach", "memory"],
    categories: ["travel"],
  },
  {
    match: /\b(minimal|clean|simple|space)\b/,
    tags: ["minimal", "clean", "space"],
    categories: ["minimal"],
  },
  {
    match: /\b(romantic|love|partner|us|couple)\b/,
    tags: ["love", "romantic", "warm"],
    categories: ["love"],
  },
  {
    match: /\b(good ?night|sleep|bed|rest)\b/,
    tags: ["night", "sleep", "rest"],
    categories: ["night", "sleep"],
  },
  {
    match: /\b(morning|sunrise|coffee|wake)\b/,
    tags: ["morning", "coffee", "light"],
    categories: ["morning"],
  },
  { match: /\b(water|hydrat|drink)\b/, tags: ["hydration", "water"], categories: ["hydration"] },
  {
    match: /\b(habit|streak|consistent|routine)\b/,
    tags: ["habits", "streak", "consistency"],
    categories: ["habits"],
  },
  {
    match: /\b(goal|dream|plan|future)\b/,
    tags: ["goals", "plan", "growth"],
    categories: ["goals"],
  },
  {
    match: /\b(win|proud|achieve|done it)\b/,
    tags: ["win", "proud", "celebrate"],
    categories: ["wins"],
  },
  {
    match: /\b(study|focus|read|work|deep work)\b/,
    tags: ["study", "focus", "reading"],
    categories: ["study"],
  },
  {
    match: /\b(food|meal|eat|plate|treat|cook)\b/,
    tags: ["food", "plate", "treat"],
    categories: ["food"],
  },
  {
    match: /\b(grateful|thankful|gratitude)\b/,
    tags: ["gratitude", "thankful"],
    categories: ["gratitude"],
  },
  {
    match: /\b(nature|tree|ocean|sea|outside|green|sky|cloud)\b/,
    tags: ["nature", "green", "ocean"],
    categories: ["nature"],
  },
  {
    match: /\b(quote|words|saying|reminder)\b/,
    tags: ["quote", "typography"],
    categories: ["quotes"],
  },
  {
    match: /\b(scrapbook|polaroid|tape|paper|collage|dump)\b/,
    tags: ["scrapbook", "polaroid", "tape"],
    categories: ["scrapbook"],
  },
  {
    match: /\b(cinema|film|movie|scene|chapter)\b/,
    tags: ["cinematic", "film"],
    categories: ["cinematic"],
  },
  {
    match: /\b(self ?care|pamper|reset|me time)\b/,
    tags: ["self care", "reset", "gentle"],
    categories: ["selfcare"],
  },
  {
    match: /\b(wellness|health|healthy)\b/,
    tags: ["wellness", "healthy"],
    categories: ["wellness"],
  },
  { match: /\b(cycle|period|phase)\b/, tags: ["cycle", "phase", "body"], categories: ["cycle"] },
  {
    match: /\b(season|spring|summer|autumn|fall|winter|snow|rain|cozy)\b/,
    tags: ["seasonal"],
    categories: ["seasonal"],
  },
  {
    match: /\b(data|numbers|stats|tracker|logged)\b/,
    tags: ["data", "tracker"],
    categories: ["data"],
  },
  {
    match: /\b(memor|remember|moment|nostalg)\b/,
    tags: ["memories", "moment", "keepsake"],
    categories: ["memories"],
  },
  { match: /(\d+)\s*photo/, tags: ["__count__"] },
  { match: /\b(lots of space|empty|airy)\b/, tags: ["space", "minimal"] },
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
