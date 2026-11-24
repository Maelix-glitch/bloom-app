/**
 * Nutrition — the Australian AFCD reference set generator (M-230).
 *
 *   npm run seed:afcd         download (cached) + regenerate the data file
 *   npm run seed:afcd:check   fail if the committed file drifts from the pins
 *
 * Bloom's reference library is not USDA-only (owner directive, 2026-11-23):
 * a food may ship from another genuine source when that source is honestly
 * labelled and licence-clean. M-230 is the second multi-source wave — ONLY
 * healthy, high-protein foods (owner directive, 2026-11-24): at least 10 g
 * protein per 100 g as eaten (drinks: at least 3 g/100 ml and
 * protein-forward by design), or protein providing at least 20% of the
 * food's energy; minimally processed; no added sugar; no processed meats;
 * nothing deep-fried. This generator ships the wave's Australian set from
 * the Australian Food Composition Database (AFCD), Release 3 — the
 * Australian national food-composition database, published by Food
 * Standards Australia New Zealand (FSANZ) under its Data User Licence
 * Agreement, modelled on CC BY-SA 3.0 AU (evidence catalogue source
 * `au-afcd-release-3`). FSANZ's licence requires this statement to travel
 * with the data: this data is based on Australian data, and Australian
 * data may not be appropriate for use in other countries.
 *
 * The rigour mirrors the USDA and CoFID generators:
 *   - every pick is pinned by Public Food Key AND exact source name AND
 *     Derivation "Analysed" AND exact values — a future AFCD release that
 *     renames a food, re-derives a row or changes a value stops the build
 *     instead of silently shipping new numbers;
 *   - only rows whose majority data come from Australian laboratory
 *     analysis ship. A field AFCD's own "Food details" sampling notes
 *     attribute to ANOTHER database is OMITTED, never shipped under an
 *     AFCD label: vitamin C is omitted for lupin splits (AFCD borrowed it
 *     from Kohajkova et al. 2011) and for broad beans (borrowed from USDA
 *     SR28) — see OMITTED below, where the workbook's value is pinned so
 *     a change stops the build for a human decision;
 *   - AFCD publishes energy in kilojoules only. Bloom's kcal is the
 *     pinned kJ divided by 4.184 and rounded — the kJ is pinned and
 *     re-derived at check time, so the conversion is auditable, and the
 *     shipped carbohydrate figure is AFCD's "available carbohydrate,
 *     without sugar alcohols", with total dietary fibre carried
 *     separately (the same convention as the CoFID set);
 *   - the shipped file carries a SHA-256 fingerprint over the
 *     canonicalised foods plus a version stamp, and `--check` re-derives
 *     both and compares every shipped value against the pins, so a
 *     hand-edit of the generated file is detectable without any network
 *     access.
 *
 * The workbook is a .xlsx; it is read with `unzip` + a small sheet-XML
 * reader (the dependency-free approach the CoFID generator uses). The
 * download is cached under the OS temp dir (override with AFCD_CACHE).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(root, "src/lib/nutrition/data/afcdReferenceData.ts");
const CHECK = process.argv.includes("--check");

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

/* ------------------------------- the source ------------------------------ */

const WORKBOOK_URL =
  "https://www.foodstandards.gov.au/sites/default/files/2025-12/AFCD%20Release%203%20-%20Nutrient%20profiles.xlsx";
const WORKBOOK_FILE = "AFCD Release 3 - Nutrient profiles.xlsx";
const SHEET_NAME = "All solids & liquids per 100 g";

const STAMP_DATASET = "Australian Food Composition Database (AFCD)";
const STAMP_LICENCE = "FSANZ Data User Licence (modelled on CC BY-SA 3.0 AU)";
const STAMP_RELEASES = "Release 3";

/* ------------------------------ the pick list ---------------------------- */

/**
 * The curation, pinned. `expect` is the food's exact name in the workbook;
 * `values` are the exact per-100 g values AFCD publishes for the fields
 * Bloom ships, plus `energyKj` — AFCD's own energy figure, from which
 * `kcal` is derived (kJ / 4.184, rounded). Generation fails if the
 * workbook disagrees with any of them. `omitted` names panel fields the
 * workbook DOES publish but Bloom does not ship, with the workbook value
 * pinned, because AFCD's sampling notes attribute that field to another
 * source — shipping it would put a borrowed value under an AFCD label.
 */
const PICKS = [
  {
    code: "F005249",
    expect: "Lupin, dehulled, splits, uncooked",
    values: {
      energyKj: 1320,
      proteinG: 37.5,
      carbsG: 10,
      fatG: 7.9,
      fibreG: 27.8,
      sodiumMg: 50,
      potassiumMg: 730,
      magnesiumMg: 189,
      calciumMg: 84,
      ironMg: 4.3,
    },
    /* Vitamin C borrowed from Kohajkova et al. 2011 (AFCD Food details). */
    omitted: { vitaminCMg: 2 },
  },
  {
    code: "F000416",
    expect: "Bean, broad, dried",
    values: {
      energyKj: 1300,
      proteinG: 24.3,
      carbsG: 37,
      fatG: 2.1,
      fibreG: 18.6,
      sodiumMg: 21,
      potassiumMg: 1062,
      magnesiumMg: 140,
      calciumMg: 108,
      ironMg: 3.7,
    },
    /* Vitamin C borrowed from USDA SR28 16052 (AFCD Food details). */
    omitted: { vitaminCMg: 1 },
  },
  {
    code: "F006543",
    expect: "Pea, split, dried",
    values: {
      energyKj: 1427,
      proteinG: 23,
      carbsG: 50.5,
      fatG: 2,
      fibreG: 10.1,
      sodiumMg: 7,
      potassiumMg: 930,
      magnesiumMg: 95,
      calciumMg: 42,
      ironMg: 3.8,
      vitaminCMg: 0,
    },
    omitted: {},
  },
  {
    code: "F000061",
    expect: "Amaranth, grain, whole, uncooked",
    values: {
      energyKj: 1527,
      proteinG: 15.2,
      carbsG: 55.6,
      fatG: 6.4,
      fibreG: 11.1,
      sodiumMg: 2,
      potassiumMg: 508,
      magnesiumMg: 237,
      calciumMg: 147,
      ironMg: 7,
      vitaminCMg: 4,
    },
    omitted: {},
  },
  {
    code: "F008209",
    expect: "Seed, chia, dried",
    values: {
      energyKj: 1825,
      proteinG: 23.8,
      carbsG: 3.1,
      fatG: 29.8,
      fibreG: 33.2,
      sodiumMg: 0,
      potassiumMg: 720,
      magnesiumMg: 380,
      calciumMg: 530,
      ironMg: 13,
      vitaminCMg: 0,
    },
    omitted: {},
  },
  {
    code: "F008210",
    expect: "Seed, linseed or flaxseed",
    values: {
      energyKj: 1883,
      proteinG: 21.6,
      carbsG: 2.8,
      fatG: 32.6,
      fibreG: 32.9,
      sodiumMg: 60,
      potassiumMg: 630,
      magnesiumMg: 330,
      calciumMg: 180,
      ironMg: 5.5,
      vitaminCMg: 0,
    },
    omitted: {},
  },
];

/** Classification pinned per food key — identity facts about the curated
 *  food, not values read from AFCD's tables (mirrors the USDA generator). */
const CLASSIFICATION = {
  F005249: { group: "pulses_legumes", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
  F000416: { group: "pulses_legumes", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
  F006543: { group: "pulses_legumes", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
  F000061: { group: "cereals_grains", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
  F008209: { group: "nuts_seeds", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
  F008210: { group: "nuts_seeds", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
};

/** Preparation basis pinned per food key: the state the values describe.
 *  Dry pulses and grains ship on their dry basis, like the library's other
 *  dry staples; the seeds are portioned as bought. */
const PREPARATION = {
  F005249: "raw",
  F000416: "raw",
  F006543: "raw",
  F000061: "raw",
  F008209: "as_purchased",
  F008210: "as_purchased",
};

/** Workbook column header (whitespace-normalised) → shipped field. */
const FIELD_SOURCES = [
  { header: "Energy with dietary fibre, equated (kJ)", field: "energyKj" },
  { header: "Protein (g)", field: "proteinG" },
  { header: "Available carbohydrate, without sugar alcohols (g)", field: "carbsG" },
  { header: "Fat, total (g)", field: "fatG" },
  { header: "Total dietary fibre (g)", field: "fibreG" },
  { header: "Sodium (Na) (mg)", field: "sodiumMg" },
  { header: "Potassium (K) (mg)", field: "potassiumMg" },
  { header: "Magnesium (Mg) (mg)", field: "magnesiumMg" },
  { header: "Calcium (Ca) (mg)", field: "calciumMg" },
  { header: "Iron (Fe) (mg)", field: "ironMg" },
  { header: "Vitamin C (mg)", field: "vitaminCMg" },
];

/** Shipped per-100 g field order (kcal first, the CoFID set's order). */
const SHIPPED_ORDER = [
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fibreG",
  "sodiumMg",
  "potassiumMg",
  "magnesiumMg",
  "calciumMg",
  "ironMg",
  "vitaminCMg",
];

const KJ_PER_KCAL = 4.184;
const kcalOf = (kj) => Math.round(kj / KJ_PER_KCAL);

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
    maxBuffer: 512 * 1024 * 1024,
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
    const rawName = sheet[0].match(/\bname="([^"]+)"/)?.[1];
    const name = rawName === undefined ? undefined : decodeXml(rawName);
    const rid = sheet[0].match(/\br:id="([^"]+)"/)?.[1];
    const target = rid ? targetById.get(rid) : undefined;
    if (name && target) paths.set(name, target.startsWith("xl/") ? target : `xl/${target}`);
  }
  return paths;
}

/** Parse one worksheet into rows of { columnLetter: rawString }. */
function sheetRows(xml, strings) {
  /* AFCD writes empty cells as self-closing <c .../>; left as-is, one
     would swallow the next real cell's body in the row regex below.
     Normalise them to open/close pairs first (they carry no value). */
  const normalised = xml.replace(/<c\b([^>]*?)\/>/g, "<c$1></c>");
  const rows = [];
  for (const rowMatch of normalised.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
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

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * The nutrient-profile sheet as a list of { normalisedHeader: rawString }
 * rows. The sheet opens with a title row and a blank row; the header row
 * is the one whose first column reads "Public Food Key".
 */
function profileRows(workbookPath, strings, paths) {
  const path = paths.get(SHEET_NAME);
  if (!path) throw new Error(`workbook has no sheet named "${SHEET_NAME}"`);
  const rows = sheetRows(unzipText(workbookPath, path), strings);
  const headerIdx = rows.findIndex((r) => norm(Object.values(r)[0]) === "Public Food Key" || norm(r.A) === "Public Food Key");
  if (headerIdx < 0) throw new Error(`sheet "${SHEET_NAME}" has no "Public Food Key" header row`);
  const header = rows[headerIdx];
  const headerByCol = {};
  for (const [col, value] of Object.entries(header)) headerByCol[col] = norm(value);
  return rows.slice(headerIdx + 1).map((row) => {
    const byHeader = {};
    for (const [col, value] of Object.entries(row)) {
      const headerText = headerByCol[col];
      if (headerText) byHeader[headerText] = value;
    }
    return byHeader;
  });
}

async function ensureWorkbook() {
  const cacheRoot = process.env.AFCD_CACHE ?? join(tmpdir(), "bloom-afcd-cache");
  const path = join(cacheRoot, WORKBOOK_FILE);
  if (existsSync(path)) return path;
  mkdirSync(cacheRoot, { recursive: true });
  const res = await fetch(WORKBOOK_URL, {
    headers: { "User-Agent": "bloom-afcd-seed/1.0 (reference data build)" },
  });
  if (!res.ok) throw new Error(`AFCD workbook download failed: HTTP ${res.status}`);
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

function extractFood(pick, rows) {
  const row = rows.find((r) => norm(r["Public Food Key"]) === pick.code);
  if (!row) throw new Error(`food key ${pick.code} not found in sheet "${SHEET_NAME}"`);
  const name = norm(row["Food Name"]);
  if (name !== pick.expect) {
    throw new Error(
      `pick ${pick.code}: workbook names it ${JSON.stringify(name)}, pinned as ${JSON.stringify(pick.expect)} — the source row has moved; a human must re-check this pick`,
    );
  }
  const derivation = norm(row["Derivation"]);
  if (derivation !== "Analysed") {
    throw new Error(
      `pick ${pick.code}: workbook Derivation is ${JSON.stringify(derivation)}, pinned as "Analysed" — only majority-analysed rows ship in this wave`,
    );
  }
  const read = {};
  for (const source of FIELD_SOURCES) {
    const raw = row[source.header];
    if (raw === undefined) continue;
    read[source.field] = asNumber(raw, `pick ${pick.code} ${source.field} ("${source.header}")`);
  }
  /* Omitted fields: the workbook value must still match its pin, so a
     source change stops the build — and the field never ships. */
  for (const [field, pinned] of Object.entries(pick.omitted)) {
    if (read[field] !== pinned) {
      throw new Error(
        `pick ${pick.code} ${field}: workbook reports ${read[field]}, pinned as the omitted (borrowed) value ${pinned} — the source changed this field; a human must re-check whether it may now ship`,
      );
    }
  }
  const per100g = {};
  for (const field of SHIPPED_ORDER) {
    if (field === "kcal") {
      if (read.energyKj !== pick.values.energyKj) {
        throw new Error(
          `pick ${pick.code} energyKj: workbook value ${read.energyKj} ≠ pinned ${pick.values.energyKj} — AFCD changed this value; a human must re-check this pick before the new value ships`,
        );
      }
      per100g.kcal = kcalOf(read.energyKj);
      continue;
    }
    if (field in pick.omitted) continue;
    const value = read[field];
    if (value !== pick.values[field]) {
      throw new Error(
        `pick ${pick.code} ${field}: workbook value ${value} ≠ pinned ${pick.values[field]} — AFCD changed this value; a human must re-check this pick before the new value ships`,
      );
    }
    per100g[field] = value;
  }
  const classification = CLASSIFICATION[pick.code];
  if (!classification) throw new Error(`pick ${pick.code} has no pinned classification`);
  const preparationState = PREPARATION[pick.code];
  if (!preparationState) throw new Error(`pick ${pick.code} has no pinned preparation basis`);
  return {
    id: `afcd-${pick.code}`,
    name,
    per100g,
    servings: [],
    provenance: {
      kind: "afcd",
      sourceId: pick.code,
      label: "Australian AFCD (FSANZ)",
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
  const rows = profileRows(workbookPath, strings, paths);
  const foods = PICKS.map((pick) => extractFood(pick, rows));

  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const fingerprint = createHash("sha256").update(canonicalise(foods), "utf8").digest("hex");
  const retrievedOn = new Date().toISOString().slice(0, 10);

  const lines = [
    "/**",
    " * GENERATED by scripts/nutrition-afcd-reference.mjs — do not edit by hand.",
    " * Regenerate with `npm run seed:afcd`; verify with `npm run seed:afcd:check`.",
    " *",
    " * Source: the Australian Food Composition Database (AFCD), Release 3 —",
    " * the Australian national food-composition database, published by Food",
    " * Standards Australia New Zealand (FSANZ). Licence: FSANZ Data User",
    " * Licence Agreement, modelled on CC BY-SA 3.0 AU (evidence catalogue",
    " * source `au-afcd-release-3`). This data is based on Australian data,",
    " * and Australian data may not be appropriate for use in other",
    " * countries. Every nutrient value below is a value AFCD published for",
    " * that food, per 100 g, from a row whose Derivation is 'Analysed';",
    " * fields AFCD's sampling notes attribute to another database appear",
    " * nowhere below — absent means not shipped from this source, never",
    " * zero. AFCD publishes energy in kilojoules only: each kcal figure",
    " * below is the food's pinned AFCD kJ value divided by 4.184 and",
    " * rounded, re-derived and checked by the generator.",
    " * Each entry also carries a food group + dietary-pattern classification",
    " * and its preparation basis, pinned per food key in the generator —",
    " * identity facts about the curated food, not values read from AFCD.",
    " */",
    "",
    `export const AFCD_REFERENCE_RETRIEVED_ON = ${JSON.stringify(retrievedOn)};`,
    "",
    "/** SHA-256 over the canonicalised foods array (see the generator). */",
    `export const AFCD_REFERENCE_FINGERPRINT = ${JSON.stringify(fingerprint)};`,
    "",
    "/** The dataset version stamp (audit #29): which dataset this set came",
    " *  from, under what licence, when Bloom retrieved it, and the fingerprint",
    " *  of the exact set shipped. `seed:afcd:check` fails if the stamp and",
    " *  the data disagree. */",
    "export const AFCD_REFERENCE_VERSION = {",
    `  dataset: ${JSON.stringify(STAMP_DATASET)},`,
    `  licence: ${JSON.stringify(STAMP_LICENCE)},`,
    `  releases: ${JSON.stringify(STAMP_RELEASES)},`,
    `  retrievedOn: ${JSON.stringify(retrievedOn)},`,
    `  fingerprint: ${JSON.stringify(fingerprint)},`,
    "} as const;",
    "",
    "/** The reference foods, raw — read them through `../afcdReference`,",
    " *  which parses every entry with the strict N1 parser. */",
    "export const AFCD_REFERENCE_FOODS_RAW: readonly unknown[] = [",
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
  const data = await load("src/lib/nutrition/data/afcdReferenceData.ts");
  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const raw = data.AFCD_REFERENCE_FOODS_RAW;
  if (raw.length !== PICKS.length) {
    fail(`data file holds ${raw.length} foods, the pick list has ${PICKS.length}`);
  }
  for (const pick of PICKS) {
    const food = raw.find((f) => f.id === `afcd-${pick.code}`);
    if (!food) fail(`pick ${pick.code} is missing from the data file`);
    if (food.name !== pick.expect) {
      fail(`${food.id} is named ${JSON.stringify(food.name)}, pinned as ${JSON.stringify(pick.expect)}`);
    }
    if (food.provenance?.kind !== "afcd" || food.provenance?.sourceId !== pick.code) {
      fail(`${food.id} does not carry the pinned afcd provenance`);
    }
    /* Every shipped value must equal the value recorded from the cited
       source — this is the drift check that keeps the entry honest. The
       kcal figure must equal the derivation from the pinned kJ. */
    for (const [field, pinned] of Object.entries(pick.values)) {
      if (field === "energyKj") {
        if (food.per100g?.kcal !== kcalOf(pinned)) {
          fail(`${food.id} kcal: ships ${food.per100g?.kcal}, the pinned ${pinned} kJ derives ${kcalOf(pinned)}`);
        }
        continue;
      }
      if (food.per100g?.[field] !== pinned) {
        fail(`${food.id} ${field}: ships ${food.per100g?.[field]}, the cited source records ${pinned}`);
      }
    }
    for (const field of Object.keys(pick.omitted)) {
      if (field in (food.per100g ?? {})) {
        fail(`${food.id} ships ${field}, which the cited source borrowed from another database`);
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
  if (fingerprint !== data.AFCD_REFERENCE_FINGERPRINT) {
    console.error("check failed: fingerprint mismatch — the data file was edited or is stale.");
    console.error(`  stored:   ${data.AFCD_REFERENCE_FINGERPRINT}`);
    console.error(`  computed: ${fingerprint}`);
    process.exit(1);
  }
  const stamp = data.AFCD_REFERENCE_VERSION;
  if (!stamp) fail("AFCD_REFERENCE_VERSION stamp is missing from the data file.");
  if (stamp.dataset !== STAMP_DATASET || stamp.licence !== STAMP_LICENCE || stamp.releases !== STAMP_RELEASES) {
    fail("version stamp names the wrong dataset, licence or releases.");
  }
  if (stamp.retrievedOn !== data.AFCD_REFERENCE_RETRIEVED_ON) {
    fail("version stamp retrievedOn disagrees with AFCD_REFERENCE_RETRIEVED_ON.");
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
