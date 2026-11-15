/**
 * The v2 collection — exactly fourteen templates.
 *
 * This module is the single source of truth for what ships. The v1 library
 * held fifty templates, but the 2026-11-10 deep-dive found they collapsed
 * into about five repeated compositions, half had no photo slot, and only
 * five surfaced real Bloom data. v2 replaces breadth with depth: fourteen
 * archetypes, twelve photo-first, eleven built around live data (habits,
 * points, streak, mood, sleep, movement, energy), two genuinely
 * typographic, all in the official reskin palette. An assertion at the
 * bottom fails loudly if that ever stops being true.
 *
 * Counts per shelf:
 *   everyday 3 · progress 3 · mood 2 · wellness 2
 *   memories 2 · reflection 1 · celebration 1   = 14
 */

import type { StoryTemplateDef } from "../dsl";
import { EVERYDAY_TEMPLATES } from "./everyday";
import { MEMORIES_TEMPLATES } from "./memories";
import { MOOD_TEMPLATES } from "./mood";
import { PROGRESS_TEMPLATES } from "./progress";
import { WELLNESS_TEMPLATES } from "./wellness";
import { REFLECTION_TEMPLATES } from "./reflection";
import { CELEBRATION_TEMPLATES } from "./celebration";

/** How many templates each shelf holds. Checked below against the real arrays. */
export const COLLECTION_SIZES = {
  everyday: 3,
  memories: 2,
  mood: 2,
  progress: 3,
  wellness: 2,
  reflection: 1,
  celebration: 1,
} as const;

/** The whole production library, in shelf order. */
export const STORY_TEMPLATE_COLLECTION: StoryTemplateDef[] = [
  ...EVERYDAY_TEMPLATES,
  ...MEMORIES_TEMPLATES,
  ...MOOD_TEMPLATES,
  ...PROGRESS_TEMPLATES,
  ...WELLNESS_TEMPLATES,
  ...REFLECTION_TEMPLATES,
  ...CELEBRATION_TEMPLATES,
];

/** The number the production library must always equal. */
export const TEMPLATE_COUNT = 14;

/**
 * Validate the collection. Returns a list of problems — empty when the
 * library is healthy.
 *
 * Runs in tests and on demand; deliberately cheap enough to call anywhere.
 */
export function validateCollection(): string[] {
  const problems: string[] = [];

  if (STORY_TEMPLATE_COLLECTION.length !== TEMPLATE_COUNT) {
    problems.push(
      `library holds ${STORY_TEMPLATE_COLLECTION.length} templates, must be exactly ${TEMPLATE_COUNT}`,
    );
  }

  const ids = new Map<string, number>();
  const names = new Map<string, number>();
  for (const t of STORY_TEMPLATE_COLLECTION) {
    ids.set(t.id, (ids.get(t.id) ?? 0) + 1);
    names.set(t.name, (names.get(t.name) ?? 0) + 1);
    if (t.seeds.length === 0) problems.push(`${t.id}: no seeds`);
    if (!t.name || t.name.length < 2) problems.push(`${t.id}: name too short`);
    if (!t.hint || t.hint.length < 4) problems.push(`${t.id}: hint too short`);
    if (t.tags.length === 0) problems.push(`${t.id}: no tags`);
    // "Template 04" / "Modern 2" style names are banned by the brief.
    if (/^(template|layout|design|modern|gradient)\s*\d*$/i.test(t.name)) {
      problems.push(`${t.id}: technical name "${t.name}"`);
    }
  }
  for (const [id, n] of ids) if (n > 1) problems.push(`duplicate id: ${id} ×${n}`);
  for (const [name, n] of names) if (n > 1) problems.push(`duplicate name: ${name} ×${n}`);

  for (const [shelf, expected] of Object.entries(COLLECTION_SIZES)) {
    const actual = STORY_TEMPLATE_COLLECTION.filter((t) => t.category === shelf).length;
    if (actual !== expected) {
      problems.push(`${shelf} holds ${actual}, expected ${expected}`);
    }
  }

  return problems;
}

/**
 * Throws when the collection is not exactly fourteen healthy templates.
 *
 * Called from the test suite, so a bad count fails the build rather than
 * shipping quietly.
 */
export function assertCollectionIsValid(): void {
  const problems = validateCollection();
  if (problems.length > 0) {
    throw new Error(`Story template collection is invalid:\n  - ${problems.join("\n  - ")}`);
  }
}
