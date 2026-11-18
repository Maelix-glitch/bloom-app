#!/usr/bin/env node
/**
 * Generate (or verify) the §10.4 preparation tags on every shipped dish.
 *
 *   npm run seed:dish-tags          pin the derived tags into the data files
 *   npm run seed:dish-tags:check    verify pins ↔ derivation (no writes)
 *
 * What this is, and the rules it lives by:
 *
 *   • **The tags are derived, never hand-written.** Each dish's
 *     `equipment` / `noCook` pins are a deterministic reading of its
 *     OWN method text by `deriveDishTags` (src/lib/nutrition/
 *     dishTags.ts) — the module carries the rules and the corpus
 *     evidence for their sharp edges. This script only writes what
 *     the derivation derives; --check fails on any dish whose pins
 *     disagree with a fresh derivation, so a hand-edit of a tag (or
 *     a method edit that changes what the method needs) is caught.
 *   • **Where the tags live.** The dish literals in the 14 data files
 *     under src/lib/nutrition/data/ are the library's source of
 *     truth (hand-authored, not generated), so the pins are written
 *     INTO those literals, as the last fields of each dish object.
 *     Re-running generation is idempotent: existing tag lines are
 *     replaced, never duplicated.
 *   • **Coverage is exact.** Every dish in the library is either
 *     pinned or counted method-less (a dish with no method steps
 *     stays untagged — `dishPreparationNeeds` answers conservatively
 *     for it). Generation fails loudly if a dish in a data module
 *     cannot be located in that module's file text.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

/** The library's parts: [data file, exported array name] — the same
 *  parts data/dishLibrary.ts assembles, in its order. */
const PARTS = [
  ["src/lib/nutrition/data/proofDishes.ts", "PROOF_DISHES"],
  ["src/lib/nutrition/data/dishesMains.ts", "DISHES_MAINS"],
  ["src/lib/nutrition/data/dishesRiceBread.ts", "DISHES_RICE_BREAD"],
  ["src/lib/nutrition/data/dishesSides.ts", "DISHES_SIDES"],
  ["src/lib/nutrition/data/dishLibraryKerala.ts", "KERALA_DISHES"],
  ["src/lib/nutrition/data/dishLibraryIntl1.ts", "INTL1_DISHES"],
  ["src/lib/nutrition/data/dishLibraryIntl2.ts", "INTL2_DISHES"],
  ["src/lib/nutrition/data/dishLibraryIntl3.ts", "INTL3_DISHES"],
  ["src/lib/nutrition/data/dishLibraryIntl4.ts", "INTL4_DISHES"],
  ["src/lib/nutrition/data/dishLibraryProteinIntl.ts", "PROTEIN_INTL_DISHES"],
  ["src/lib/nutrition/data/dishLibraryShakes.ts", "SHAKES_DISHES"],
  ["src/lib/nutrition/data/dishLibraryProteinBreakfasts.ts", "PW2_DISHES"],
  ["src/lib/nutrition/data/dishLibraryProteinIndia.ts", "PROTEIN_INDIA_DISHES"],
  ["src/lib/nutrition/data/dishLibraryIndia.ts", "INDIA_DISHES"],
];

const { deriveDishTags } = await load("src/lib/nutrition/dishTags.ts");

/* ------------------------------ file surgery ------------------------------ */

const TAG_LINE = /^\s*(?:equipment: \[.*\]|noCook: true),?\s*$/;

/**
 * Locate every dish literal in a data file's text. A dish object
 * opens with a bare `{` line whose next line is its `id:` field; the
 * block runs to the line where the brace depth returns to zero (the
 * literals' strings contain no braces — verified against the corpus
 * before this approach was chosen). Returns [{ id, start, end,
 * fieldIndent }] with line indexes into `lines`.
 */
function locateDishBlocks(lines) {
  const blocks = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!/^\s*\{\s*$/.test(lines[i])) continue;
    const idMatch = lines[i + 1].match(/^\s*id: "(dish-[^"]+)",/);
    if (!idMatch) continue;
    let depth = 0;
    let end = -1;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
      if (depth === 0) {
        end = j;
        break;
      }
    }
    if (end === -1) throw new Error(`dish ${idMatch[1]}: unterminated literal`);
    const fieldIndent = lines[i + 1].match(/^\s*/)[0];
    blocks.push({ id: idMatch[1], start: i, end, fieldIndent });
    i = end;
  }
  return blocks;
}

function tagLines(tags, indent) {
  const out = [`${indent}equipment: [${tags.equipment.map((e) => `"${e}"`).join(", ")}],`];
  if (tags.noCook) out.push(`${indent}noCook: true,`);
  return out;
}

/** The file's text with every dish's tag lines (re)pinned. */
function pinTags(text, tagsById) {
  const lines = text.split("\n");
  const blocks = locateDishBlocks(lines);
  /* Rewrite from the last block backwards so indexes stay valid. */
  for (const block of [...blocks].reverse()) {
    const tags = tagsById.get(block.id);
    if (!tags) throw new Error(`dish ${block.id}: located in text but not in its module`);
    const body = lines
      .slice(block.start + 1, block.end)
      .filter((line) => !TAG_LINE.test(line));
    lines.splice(
      block.start + 1,
      block.end - block.start - 1,
      ...body,
      ...tagLines(tags, block.fieldIndent),
    );
  }
  return { text: lines.join("\n"), blocks: blocks.length };
}

/* --------------------------------- driver --------------------------------- */

let total = 0;
let methodLess = 0;
let noCookCount = 0;
const perTag = new Map();
const problems = [];
const seen = new Set();

for (const [file, exportName] of PARTS) {
  const mod = await load(file);
  const dishes = mod[exportName];
  if (!Array.isArray(dishes)) throw new Error(`${file}: ${exportName} is not an array`);

  const tagsById = new Map();
  for (const dish of dishes) {
    if (seen.has(dish.id)) problems.push(`duplicate dish id ${dish.id}`);
    seen.add(dish.id);
    total++;
    if (!Array.isArray(dish.method) || dish.method.length === 0) {
      methodLess++;
      if (dish.equipment !== undefined || dish.noCook !== undefined) {
        problems.push(`${dish.id}: method-less but tagged (must stay untagged)`);
      }
      continue;
    }
    const derived = deriveDishTags(dish);
    tagsById.set(dish.id, derived);
    if (derived.noCook) noCookCount++;
    for (const item of derived.equipment) perTag.set(item, (perTag.get(item) ?? 0) + 1);

    if (CHECK) {
      const pinnedEquipment = dish.equipment === undefined ? null : [...dish.equipment];
      const derivedEquipment = [...derived.equipment];
      if (JSON.stringify(pinnedEquipment) !== JSON.stringify(derivedEquipment)) {
        problems.push(
          `${dish.id}: pinned equipment ${JSON.stringify(pinnedEquipment)} != derived ${JSON.stringify(derivedEquipment)}`,
        );
      }
      const pinnedNoCook = dish.noCook === true;
      if (pinnedNoCook !== derived.noCook) {
        problems.push(`${dish.id}: pinned noCook ${pinnedNoCook} != derived ${derived.noCook}`);
      }
    }
  }

  if (!CHECK) {
    const path = resolve(root, file);
    const { text, blocks } = pinTags(readFileSync(path, "utf8"), tagsById);
    if (blocks !== tagsById.size) {
      throw new Error(`${file}: located ${blocks} dish literals for ${tagsById.size} dishes`);
    }
    writeFileSync(path, text);
    console.log(`${file}: pinned ${blocks} dishes`);
  }
}

console.log(
  `dishes: ${total} · pinned: ${total - methodLess} · method-less (untagged): ${methodLess} · noCook: ${noCookCount}`,
);
for (const item of ["stove", "pressure_cooker", "oven", "microwave", "mixer_grinder", "fridge"]) {
  console.log(`  ${item}: ${perTag.get(item) ?? 0}`);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(CHECK ? "check OK: every pin matches its derivation" : "generation done");
