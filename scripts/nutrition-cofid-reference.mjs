/**
 * Nutrition — the UK CoFID reference set generator (M-229).
 *
 *   npm run seed:cofid         download (cached) + regenerate the data file
 *   npm run seed:cofid:check   fail if the committed file drifts from the pins
 *
 * Bloom's reference library is not USDA-only (owner directive, 2026-11-23):
 * a food may ship from another genuine source when that source is honestly
 * labelled and licence-clean. This generator ships exactly one such food —
 * paneer — from McCance and Widdowson's Composition of Foods Integrated
 * Dataset (CoFID), the UK national food-composition database, published by
 * Public Health England under the Open Government Licence v3.0 (evidence
 * catalogue source `uk-cofid-2021`).
 *
 * Why CoFID for paneer: USDA FoodData Central carries no paneer entry, and
 * the Indian IFCT paneer row is licence-restricted — Bloom's written
 * permission request to ICMR-NIN is still unanswered, so IFCT/INDB values
 * must not ship, not even republished through a third-party page. CoFID's
 * row (food code 12-495, "Cheese, Paneer") is a laboratory analysis (its
 * own data reference: "LGC, Nutrient analysis of cheese, 1999"; 9 samples,
 * sampled in spring and autumn) published under a licence that allows
 * commercial reuse with attribution.
 *
 * The rigour mirrors the USDA generator (scripts/nutrition-usda-reference.mjs):
 *   - the pick is pinned by food code AND exact source name AND exact
 *     values — if a future CoFID release renames the food or changes a
 *     value, generation stops rather than silently shipping new numbers;
 *   - nutrients the source reports only as a trace ("Tr") or not at all
 *     ("N") are OMITTED from the shipped food — absent means not reported,
 *     never zero (iron and vitamin C for this row);
 *   - the shipped file carries a SHA-256 fingerprint over the canonicalised
 *     foods plus a version stamp, and `--check` re-derives both and
 *     compares every shipped value against the pins, so a hand-edit of the
 *     generated file is detectable without any network access.
 *
 * The workbook is a .xlsx; it is read with `unzip` + a small sheet-XML
 * reader (the same dependency-free approach the USDA generator uses for
 * its bulk zips). The download is cached under the OS temp dir
 * (override with COFID_CACHE).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(root, "src/lib/nutrition/data/cofidReferenceData.ts");
const CHECK = process.argv.includes("--check");

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

/* ------------------------------- the source ------------------------------ */

const WORKBOOK_URL =
  "https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx";
const WORKBOOK_FILE = "McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021.xlsx";

const STAMP_DATASET = "McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID)";
const STAMP_LICENCE = "Open Government Licence v3.0";
const STAMP_RELEASES = "2021 update (19 March 2021)";

/* ------------------------------ the pick list ---------------------------- */

/**
 * The curation, pinned. `expect` is the food's exact name in the workbook;
 * `values` are the exact per-100 g values CoFID publishes for the fields
 * Bloom ships — generation fails if the workbook disagrees with any of
 * them. `trace` names the panel fields CoFID reports only as "Tr" (trace):
 * they are pinned so a future release that starts quantifying them stops
 * the build for a human decision, and they are never shipped as numbers.
 */
const PICKS = [
  {
    code: "12-495",
    expect: "Cheese, Paneer",
    values: {
      kcal: 328,
      proteinG: 26,
      carbsG: 0.9,
      fatG: 24.5,
      fibreG: 0,
      sodiumMg: 19,
      potassiumMg: 69,
      magnesiumMg: 23,
      calciumMg: 537,
    },
    trace: { ironMg: "Tr", vitaminCMg: "Tr" },
  },
];

/** Classification pinned per food code — identity facts about the curated
 *  food, not values read from CoFID's tables (mirrors the USDA generator). */
const CLASSIFICATION = {
  "12-495": {
    group: "dairy",
    containsEgg: false,
    containsDairy: true,
    isFlesh: false,
    isFish: false,
  },
};

/** Preparation basis pinned per food code: the state the values describe. */
const PREPARATION = {
  "12-495": "as_purchased",
};

/** Which workbook sheet + column header carries each shipped field. */
const FIELD_SOURCES = [
  { sheet: "1.3 Proximates", header: "Energy (kcal) (kcal)", field: "kcal" },
  { sheet: "1.3 Proximates", header: "Protein (g)", field: "proteinG" },
  { sheet: "1.3 Proximates", header: "Carbohydrate (g)", field: "carbsG" },
  { sheet: "1.3 Proximates", header: "Fat (g)", field: "fatG" },
  { sheet: "1.3 Proximates", header: "AOAC fibre (g)", field: "fibreG" },
  { sheet: "1.4 Inorganics", header: "Sodium (mg)", field: "sodiumMg" },
  { sheet: "1.4 Inorganics", header: "Potassium (mg)", field: "potassiumMg" },
  { sheet: "1.4 Inorganics", header: "Magnesium (mg)", field: "magnesiumMg" },
  { sheet: "1.4 Inorganics", header: "Calcium (mg)", field: "calciumMg" },
  { sheet: "1.4 Inorganics", header: "Iron (mg)", field: "ironMg", traceOnly: true },
  { sheet: "1.5 Vitamins", header: "Vitamin C (mg)", field: "vitaminCMg", traceOnly: true },
];

/* --------------------------- workbook reading ---------------------------- */

function decodeXml(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function unzipText(workbookPath, entry) {
  return execFileSync("unzip", ["-p", workbookPath, entry], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sharedStrings(workbookPath) {
  const xml = unzipText(workbookPath, "xl/sharedStrings.xml");
  const strings = [];
  for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...si[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => decodeXml(m[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

/** Sheet name → worksheet XML path, resolved through workbook.xml + rels. */
function sheetPaths(workbookPath) {
  const workbook = unzipText(workbookPath, "xl/workbook.xml");
  const rels = unzipText(workbookPath, "xl/_rels/workbook.xml.rels");
  const targetById = new Map();
  for (const rel of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = rel[0].match(/\bId="([^"]+)"/)?.[1];
    const target = rel[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) targetById.set(id, target);
  }
  const paths = new Map();
  for (const sheet of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = sheet[0].match(/\bname="([^"]+)"/)?.[1];
    const rid = sheet[0].match(/\br:id="([^"]+)"/)?.[1];
    const target = rid ? targetById.get(rid) : undefined;
    if (name && target) paths.set(name, target.startsWith("xl/") ? target : `xl/${target}`);
  }
  return paths;
}

/** Parse one worksheet into rows of { columnLetter: rawString }. */
function sheetRows(xml, strings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {};
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = cell[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;
      const type = cell[1].match(/\bt="([^"]+)"/)?.[1];
      const body = cell[2];
      if (type === "s") {
        const idx = Number(body.match(/<v>([^<]*)<\/v>/)?.[1]);
        row[ref] = strings[idx] ?? "";
      } else if (type === "inlineStr") {
        row[ref] = [...body.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
      } else {
        const v = body.match(/<v>([^<]*)<\/v>/)?.[1];
        if (v !== undefined) row[ref] = decodeXml(v);
      }
    }
    rows.push(row);
  }
  return rows;
}

/** The row for a food code in one sheet, as { headerText: rawString }. */
function foodRowByHeader(workbookPath, strings, paths, sheetName, code) {
  const path = paths.get(sheetName);
  if (!path) throw new Error(`workbook has no sheet named "${sheetName}"`);
  const rows = sheetRows(unzipText(workbookPath, path), strings);
  if (rows.length < 2) throw new Error(`sheet "${sheetName}" is unexpectedly short`);
  const header = rows[0];
  const codeColumn = Object.keys(header).find((col) => header[col] === "Food Code") ?? "A";
  const target = rows.find((r) => r[codeColumn] === code);
  if (!target) throw new Error(`food code ${code} not found in sheet "${sheetName}"`);
  const byHeader = {};
  for (const [col, value] of Object.entries(target)) {
    const headerText = header[col];
    if (headerText) byHeader[headerText] = value;
  }
  return byHeader;
}

async function ensureWorkbook() {
  const cacheRoot = process.env.COFID_CACHE ?? join(tmpdir(), "bloom-cofid-cache");
  const path = join(cacheRoot, WORKBOOK_FILE);
  if (existsSync(path)) return path;
  mkdirSync(cacheRoot, { recursive: true });
  const res = await fetch(WORKBOOK_URL, {
    headers: { "User-Agent": "bloom-cofid-seed/1.0 (reference data build)" },
  });
  if (!res.ok) throw new Error(`CoFID workbook download failed: HTTP ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

/* ------------------------------ extraction ------------------------------- */

function asNumber(raw, what) {
  const n = Number(raw);
  if (raw === undefined || raw === "" || !Number.isFinite(n)) {
    throw new Error(`${what}: expected a number in the workbook, found ${JSON.stringify(raw)}`);
  }
  return n;
}

function extractFood(pick, workbookPath, strings, paths) {
  const per100g = {};
  let name = null;
  for (const source of FIELD_SOURCES) {
    const row = foodRowByHeader(workbookPath, strings, paths, source.sheet, pick.code);
    if (name === null) {
      name = row["Food Name"];
      if (name !== pick.expect) {
        throw new Error(
          `pick ${pick.code}: workbook names it ${JSON.stringify(name)}, pinned as ${JSON.stringify(pick.expect)} — the source row has moved; a human must re-check this pick`,
        );
      }
    }
    const raw = row[source.header];
    if (source.traceOnly) {
      const pinnedTrace = pick.trace[source.field];
      if (raw !== pinnedTrace) {
        throw new Error(
          `pick ${pick.code} ${source.field}: workbook reports ${JSON.stringify(raw)}, pinned as trace ${JSON.stringify(pinnedTrace)} — the source now quantifies it (or reports it differently); a human must decide before it ships`,
        );
      }
      continue; // trace-only: never shipped as a number
    }
    const value = asNumber(raw, `pick ${pick.code} ${source.field} (${source.sheet} "${source.header}")`);
    if (value !== pick.values[source.field]) {
      throw new Error(
        `pick ${pick.code} ${source.field}: workbook value ${value} ≠ pinned ${pick.values[source.field]} — CoFID changed this value; a human must re-check this pick before the new value ships`,
      );
    }
    per100g[source.field] = value;
  }
  const classification = CLASSIFICATION[pick.code];
  if (!classification) throw new Error(`pick ${pick.code} has no pinned classification`);
  const preparationState = PREPARATION[pick.code];
  if (!preparationState) throw new Error(`pick ${pick.code} has no pinned preparation basis`);
  return {
    id: `cofid-${pick.code}`,
    name,
    per100g,
    servings: [],
    provenance: {
      kind: "cofid",
      sourceId: pick.code,
      label: "UK CoFID (McCance and Widdowson)",
    },
    classification,
    preparation: { state: preparationState },
  };
}

/* ------------------------------ generation ------------------------------- */

async function generate() {
  const workbookPath = await ensureWorkbook();
  const strings = sharedStrings(workbookPath);
  const paths = sheetPaths(workbookPath);
  const foods = PICKS.map((pick) => extractFood(pick, workbookPath, strings, paths));

  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const fingerprint = createHash("sha256").update(canonicalise(foods), "utf8").digest("hex");
  const retrievedOn = new Date().toISOString().slice(0, 10);

  const lines = [
    "/**",
    " * GENERATED by scripts/nutrition-cofid-reference.mjs — do not edit by hand.",
    " * Regenerate with `npm run seed:cofid`; verify with `npm run seed:cofid:check`.",
    " *",
    " * Source: McCance and Widdowson's Composition of Foods Integrated",
    " * Dataset (CoFID), 2021 update — the UK national food-composition",
    " * database, published by Public Health England on GOV.UK. Licence:",
    " * Open Government Licence v3.0 (evidence catalogue source",
    " * `uk-cofid-2021`). Every nutrient value below is a value CoFID",
    " * published for that food, per 100 g; nutrients CoFID reports only",
    " * as a trace (\"Tr\") or not at all appear nowhere below — absent",
    " * means not reported, never zero.",
    " * Each entry also carries a food group + dietary-pattern classification",
    " * and its preparation basis, pinned per food code in the generator —",
    " * identity facts about the curated food, not values read from CoFID.",
    " */",
    "",
    `export const COFID_REFERENCE_RETRIEVED_ON = ${JSON.stringify(retrievedOn)};`,
    "",
    "/** SHA-256 over the canonicalised foods array (see the generator). */",
    `export const COFID_REFERENCE_FINGERPRINT = ${JSON.stringify(fingerprint)};`,
    "",
    "/** The dataset version stamp (audit #29): which dataset this set came",
    " *  from, under what licence, when Bloom retrieved it, and the fingerprint",
    " *  of the exact set shipped. `seed:cofid:check` fails if the stamp and",
    " *  the data disagree. */",
    "export const COFID_REFERENCE_VERSION = {",
    `  dataset: ${JSON.stringify(STAMP_DATASET)},`,
    `  licence: ${JSON.stringify(STAMP_LICENCE)},`,
    `  releases: ${JSON.stringify(STAMP_RELEASES)},`,
    `  retrievedOn: ${JSON.stringify(retrievedOn)},`,
    `  fingerprint: ${JSON.stringify(fingerprint)},`,
    "} as const;",
    "",
    "/** The reference foods, raw — read them through `../cofidReference`,",
    " *  which parses every entry with the strict N1 parser. */",
    "export const COFID_REFERENCE_FOODS_RAW: readonly unknown[] = [",
    ...foods.map((food) => `  ${JSON.stringify(food)},`),
    "];",
    "",
  ];
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, lines.join("\n"));
  console.log(`wrote ${OUT_FILE}`);
  console.log(`foods: ${foods.length}  fingerprint: sha256:${fingerprint}`);
}

/* -------------------------------- check ---------------------------------- */

async function check() {
  const fail = (msg) => {
    console.error(`check failed: ${msg}`);
    process.exit(1);
  };
  const data = await load("src/lib/nutrition/data/cofidReferenceData.ts");
  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const raw = data.COFID_REFERENCE_FOODS_RAW;
  if (raw.length !== PICKS.length) {
    fail(`data file holds ${raw.length} foods, the pick list has ${PICKS.length}`);
  }
  for (const pick of PICKS) {
    const food = raw.find((f) => f.id === `cofid-${pick.code}`);
    if (!food) fail(`pick ${pick.code} is missing from the data file`);
    if (food.name !== pick.expect) {
      fail(`${food.id} is named ${JSON.stringify(food.name)}, pinned as ${JSON.stringify(pick.expect)}`);
    }
    if (food.provenance?.kind !== "cofid" || food.provenance?.sourceId !== pick.code) {
      fail(`${food.id} does not carry the pinned cofid provenance`);
    }
    /* Every shipped value must equal the value recorded from the cited
       source — this is the drift check that keeps the entry honest. */
    for (const [field, pinned] of Object.entries(pick.values)) {
      if (food.per100g?.[field] !== pinned) {
        fail(`${food.id} ${field}: ships ${food.per100g?.[field]}, the cited source records ${pinned}`);
      }
    }
    for (const field of Object.keys(pick.trace)) {
      if (field in (food.per100g ?? {})) {
        fail(`${food.id} ships ${field}, which the cited source reports only as a trace`);
      }
    }
    const classification = CLASSIFICATION[pick.code];
    if (JSON.stringify(food.classification) !== JSON.stringify(classification)) {
      fail(`${food.id} classification differs from its pin`);
    }
    if (food.preparation?.state !== PREPARATION[pick.code]) {
      fail(`${food.id} ships with preparation basis "${food.preparation?.state}", pinned as "${PREPARATION[pick.code]}"`);
    }
  }
  const fingerprint = createHash("sha256").update(canonicalise(raw), "utf8").digest("hex");
  if (fingerprint !== data.COFID_REFERENCE_FINGERPRINT) {
    console.error("check failed: fingerprint mismatch — the data file was edited or is stale.");
    console.error(`  stored:   ${data.COFID_REFERENCE_FINGERPRINT}`);
    console.error(`  computed: ${fingerprint}`);
    process.exit(1);
  }
  const stamp = data.COFID_REFERENCE_VERSION;
  if (!stamp) fail("COFID_REFERENCE_VERSION stamp is missing from the data file.");
  if (stamp.dataset !== STAMP_DATASET || stamp.licence !== STAMP_LICENCE || stamp.releases !== STAMP_RELEASES) {
    fail("version stamp names the wrong dataset, licence or releases.");
  }
  if (stamp.retrievedOn !== data.COFID_REFERENCE_RETRIEVED_ON) {
    fail("version stamp retrievedOn disagrees with COFID_REFERENCE_RETRIEVED_ON.");
  }
  if (stamp.fingerprint !== fingerprint) {
    fail("version stamp fingerprint disagrees with the shipped foods.");
  }
  console.log(
    `check ok: ${raw.length} foods, fingerprint sha256:${fingerprint}, stamp ${stamp.dataset} · retrieved ${stamp.retrievedOn}`,
  );
}

if (CHECK) await check();
else await generate();
