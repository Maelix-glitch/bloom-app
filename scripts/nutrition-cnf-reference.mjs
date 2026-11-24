/**
 * Nutrition — the Canadian Nutrient File reference set generator (M-230).
 *
 *   npm run seed:cnf         download (cached) + regenerate the data file
 *   npm run seed:cnf:check   fail if the committed file drifts from the pins
 *
 * Bloom's reference library is not USDA-only (owner directive, 2026-11-23):
 * a food may ship from another genuine source when that source is honestly
 * labelled and licence-clean. M-230 is the second multi-source wave — ONLY
 * healthy, high-protein foods (owner directive, 2026-11-24): at least 10 g
 * protein per 100 g as eaten (drinks: at least 3 g/100 ml and
 * protein-forward by design), or protein providing at least 20% of the
 * food's energy; minimally processed; no added sugar; no processed meats;
 * nothing deep-fried. This generator ships the wave's Canadian set from
 * the Canadian Nutrient File (CNF) — Health Canada's national
 * food-composition database, published through the Government of Canada's
 * open data portal under the Open Government Licence – Canada v2.0
 * (evidence catalogue source `ca-cnf-2026`).
 *
 * The honesty pin that matters most here: the CNF republishes a large
 * share of its rows from the USDA (its Food Source Code 0 means "based on
 * data from USDA: no changes"). Shipping one of those rows as a Canadian
 * food would mislabel USDA values — the same failure as lifting IFCT
 * values through a republishing page. So every pick below is pinned to
 * Food Source Code 37, Health Canada's own CNF Sampling and Analysis
 * Program (SNAP-CAN), and generation fails if a pick's source code is
 * anything else. CNF rows for natto, lupins, amaranth, spirulina and
 * broad beans are all source 0 and were rejected for this wave on exactly
 * that ground.
 *
 * The rest of the rigour mirrors the USDA and CoFID generators:
 *   - every pick is pinned by food code AND exact source name AND exact
 *     values — a future CNF release that renames a food or changes a
 *     value stops the build instead of silently shipping new numbers;
 *   - nutrients the CNF does not report for a row are OMITTED — absent
 *     means not reported, never zero;
 *   - the shipped file carries a SHA-256 fingerprint over the
 *     canonicalised foods plus a version stamp, and `--check` re-derives
 *     both and compares every shipped value against the pins, so a
 *     hand-edit of the generated file is detectable without any network
 *     access.
 *
 * The CNF ships as CSV files; they are parsed with a small quoted-CSV
 * reader below. The downloads are cached under the OS temp dir (override
 * with CNF_CACHE).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(root, "src/lib/nutrition/data/cnfReferenceData.ts");
const CHECK = process.argv.includes("--check");

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

/* ------------------------------- the source ------------------------------ */

const FILES = [
  {
    file: "food_name.csv",
    url: "https://open.canada.ca/data/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109/resource/e1ffee62-58cb-4e3e-b359-115c658388ad/download/food_name.csv",
  },
  {
    file: "nutrient_amount.csv",
    url: "https://open.canada.ca/data/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109/resource/0ff718fc-1133-4154-80c5-3d619e6c63be/download/nutrient_amount.csv",
  },
];

/** CNF Food Source Code 37: "CNF Sampling and Analysis Program
 *  (SNAP-CAN)" — Health Canada's own analysed data. Pinned per pick. */
const PINNED_FOOD_SOURCE = "37";

const STAMP_DATASET = "Canadian Nutrient File (CNF)";
const STAMP_LICENCE = "Open Government Licence – Canada v2.0";
const STAMP_RELEASES = "2026 files (open.canada.ca)";

/* ------------------------------ the pick list ---------------------------- */

/**
 * The curation, pinned. `expect` is the food's exact English name in
 * food_name.csv; `values` are the exact per-100 g values the CNF
 * publishes in nutrient_amount.csv for the fields Bloom ships —
 * generation fails if the CNF disagrees with any of them.
 */
const PICKS = [
  {
    code: 6995,
    expect: "Yogourt (yogurt), fresh cheese-type (quark), fat free, plain, unsalted",
    values: {
      kcal: 64,
      proteinG: 11.23,
      carbsG: 3.49,
      fatG: 0.239,
      fibreG: 0,
      sodiumMg: 34,
      potassiumMg: 146,
      magnesiumMg: 11,
      calciumMg: 121,
      ironMg: 0.12,
      vitaminCMg: 0,
    },
  },
  {
    code: 6999,
    expect: "Kefir, plain, low fat (0.5-1.9% M.F.)",
    values: {
      kcal: 37,
      proteinG: 3.09,
      carbsG: 3,
      fatG: 1.42,
      fibreG: 0,
      sodiumMg: 38,
      potassiumMg: 154,
      magnesiumMg: 10,
      calciumMg: 107,
      ironMg: 0.09,
      vitaminCMg: 1.5,
    },
  },
  {
    code: 6330,
    expect:
      "Plant-based beverage, soy beverage, plain, unsweetened, fortified, refrigerated and/or shelf-stable",
    values: {
      kcal: 32,
      proteinG: 2.73,
      carbsG: 2.25,
      fatG: 1.39,
      fibreG: 0.6,
      sodiumMg: 26,
      potassiumMg: 131,
      magnesiumMg: 19,
      calciumMg: 113,
      ironMg: 0.53,
      vitaminCMg: 0.22,
    },
  },
];

/** Classification pinned per food code — identity facts about the curated
 *  food, not values read from the CNF's tables (mirrors the USDA
 *  generator). The soy beverage groups with the pulses, like tofu: it is
 *  a legume product, not a dairy food. */
const CLASSIFICATION = {
  6995: { group: "dairy", containsEgg: false, containsDairy: true, isFlesh: false, isFish: false },
  6999: { group: "dairy", containsEgg: false, containsDairy: true, isFlesh: false, isFish: false },
  6330: { group: "pulses_legumes", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
};

/** Preparation basis pinned per food code: the state the values describe. */
const PREPARATION = {
  6995: "as_purchased",
  6999: "as_purchased",
  6330: "as_purchased",
};

/** CNF nutrient code → shipped field. */
const NUTRIENT_FIELDS = {
  208: "kcal",
  203: "proteinG",
  205: "carbsG",
  204: "fatG",
  291: "fibreG",
  307: "sodiumMg",
  306: "potassiumMg",
  304: "magnesiumMg",
  301: "calciumMg",
  303: "ironMg",
  401: "vitaminCMg",
};

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

/* ------------------------------ CSV reading ------------------------------ */

/** Minimal RFC-4180 reader: quoted fields, embedded commas/quotes, CRLF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows[0];
  return rows.slice(1).map((cells) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    return obj;
  });
}

async function ensureFiles() {
  const cacheRoot = process.env.CNF_CACHE ?? join(tmpdir(), "bloom-cnf-cache");
  mkdirSync(cacheRoot, { recursive: true });
  const texts = {};
  for (const { file, url } of FILES) {
    const path = join(cacheRoot, file);
    if (!existsSync(path)) {
      const res = await fetch(url, {
        headers: { "User-Agent": "bloom-cnf-seed/1.0 (reference data build)" },
      });
      if (!res.ok) throw new Error(`CNF download failed for ${file}: HTTP ${res.status}`);
      writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    }
    texts[file] = readFileSync(path, "utf8");
  }
  return texts;
}

/* ------------------------------ extraction ------------------------------- */

function extractFood(pick, foodNames, amountsByFood) {
  const named = foodNames.get(pick.code);
  if (!named) throw new Error(`food code ${pick.code} not found in food_name.csv`);
  if (named.name !== pick.expect) {
    throw new Error(
      `pick ${pick.code}: CNF names it ${JSON.stringify(named.name)}, pinned as ${JSON.stringify(pick.expect)} — the source row has moved; a human must re-check this pick`,
    );
  }
  if (named.source !== PINNED_FOOD_SOURCE) {
    throw new Error(
      `pick ${pick.code}: CNF Food Source Code is ${JSON.stringify(named.source)}, pinned as "${PINNED_FOOD_SOURCE}" (SNAP-CAN, Health Canada's own analysis) — a row re-sourced to another database (code 0 is USDA data under a CNF label) must never ship as a Canadian food`,
    );
  }
  const amounts = amountsByFood.get(pick.code) ?? new Map();
  const per100g = {};
  for (const field of SHIPPED_ORDER) {
    const value = amounts.get(field);
    if (value !== pick.values[field]) {
      throw new Error(
        `pick ${pick.code} ${field}: CNF value ${value} ≠ pinned ${pick.values[field]} — the CNF changed this value; a human must re-check this pick before the new value ships`,
      );
    }
    per100g[field] = value;
  }
  const classification = CLASSIFICATION[pick.code];
  if (!classification) throw new Error(`pick ${pick.code} has no pinned classification`);
  const preparationState = PREPARATION[pick.code];
  if (!preparationState) throw new Error(`pick ${pick.code} has no pinned preparation basis`);
  return {
    id: `cnf-${pick.code}`,
    name: named.name,
    per100g,
    servings: [],
    provenance: {
      kind: "cnf",
      sourceId: String(pick.code),
      label: "Canadian Nutrient File (Health Canada)",
    },
    classification,
    preparation: { state: preparationState },
  };
}

/* ------------------------------ generation ------------------------------- */

async function generate() {
  const texts = await ensureFiles();
  const foodNames = new Map();
  for (const row of parseCsv(texts["food_name.csv"])) {
    foodNames.set(Number(row.Food_Code), {
      name: row.Food_Description_EN,
      source: row.Food_Source_Code,
    });
  }
  const amountsByFood = new Map();
  for (const row of parseCsv(texts["nutrient_amount.csv"])) {
    const field = NUTRIENT_FIELDS[row.Nutrient_Code];
    if (!field) continue;
    const code = Number(row.Food_Code);
    if (!amountsByFood.has(code)) amountsByFood.set(code, new Map());
    amountsByFood.get(code).set(field, Number(row.Nutrient_Amount));
  }
  const foods = PICKS.map((pick) => extractFood(pick, foodNames, amountsByFood));

  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const fingerprint = createHash("sha256").update(canonicalise(foods), "utf8").digest("hex");
  const retrievedOn = new Date().toISOString().slice(0, 10);

  const lines = [
    "/**",
    " * GENERATED by scripts/nutrition-cnf-reference.mjs — do not edit by hand.",
    " * Regenerate with `npm run seed:cnf`; verify with `npm run seed:cnf:check`.",
    " *",
    " * Source: the Canadian Nutrient File (CNF) — Health Canada's national",
    " * food-composition database, published through the Government of",
    " * Canada's open data portal. Licence: Open Government Licence –",
    " * Canada v2.0 (evidence catalogue source `ca-cnf-2026`). Every",
    " * nutrient value below is a value the CNF published for that food,",
    " * per 100 g, and every food carries CNF Food Source Code 37 — Health",
    " * Canada's own CNF Sampling and Analysis Program (SNAP-CAN). Rows the",
    " * CNF republishes from the USDA (its source code 0) are never shipped",
    " * from this set: a USDA value under a Canadian label would be a",
    " * mislabelled value. Nutrients the CNF does not report for a food",
    " * appear nowhere below — absent means not reported, never zero.",
    " * Each entry also carries a food group + dietary-pattern classification",
    " * and its preparation basis, pinned per food code in the generator —",
    " * identity facts about the curated food, not values read from the CNF.",
    " */",
    "",
    `export const CNF_REFERENCE_RETRIEVED_ON = ${JSON.stringify(retrievedOn)};`,
    "",
    "/** SHA-256 over the canonicalised foods array (see the generator). */",
    `export const CNF_REFERENCE_FINGERPRINT = ${JSON.stringify(fingerprint)};`,
    "",
    "/** The dataset version stamp (audit #29): which dataset this set came",
    " *  from, under what licence, when Bloom retrieved it, and the fingerprint",
    " *  of the exact set shipped. `seed:cnf:check` fails if the stamp and",
    " *  the data disagree. */",
    "export const CNF_REFERENCE_VERSION = {",
    `  dataset: ${JSON.stringify(STAMP_DATASET)},`,
    `  licence: ${JSON.stringify(STAMP_LICENCE)},`,
    `  releases: ${JSON.stringify(STAMP_RELEASES)},`,
    `  retrievedOn: ${JSON.stringify(retrievedOn)},`,
    `  fingerprint: ${JSON.stringify(fingerprint)},`,
    "} as const;",
    "",
    "/** The reference foods, raw — read them through `../cnfReference`,",
    " *  which parses every entry with the strict N1 parser. */",
    "export const CNF_REFERENCE_FOODS_RAW: readonly unknown[] = [",
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
  const data = await load("src/lib/nutrition/data/cnfReferenceData.ts");
  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const raw = data.CNF_REFERENCE_FOODS_RAW;
  if (raw.length !== PICKS.length) {
    fail(`data file holds ${raw.length} foods, the pick list has ${PICKS.length}`);
  }
  for (const pick of PICKS) {
    const food = raw.find((f) => f.id === `cnf-${pick.code}`);
    if (!food) fail(`pick ${pick.code} is missing from the data file`);
    if (food.name !== pick.expect) {
      fail(`${food.id} is named ${JSON.stringify(food.name)}, pinned as ${JSON.stringify(pick.expect)}`);
    }
    if (food.provenance?.kind !== "cnf" || food.provenance?.sourceId !== String(pick.code)) {
      fail(`${food.id} does not carry the pinned cnf provenance`);
    }
    /* Every shipped value must equal the value recorded from the cited
       source — this is the drift check that keeps the entry honest. */
    for (const [field, pinned] of Object.entries(pick.values)) {
      if (food.per100g?.[field] !== pinned) {
        fail(`${food.id} ${field}: ships ${food.per100g?.[field]}, the cited source records ${pinned}`);
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
  if (fingerprint !== data.CNF_REFERENCE_FINGERPRINT) {
    console.error("check failed: fingerprint mismatch — the data file was edited or is stale.");
    console.error(`  stored:   ${data.CNF_REFERENCE_FINGERPRINT}`);
    console.error(`  computed: ${fingerprint}`);
    process.exit(1);
  }
  const stamp = data.CNF_REFERENCE_VERSION;
  if (!stamp) fail("CNF_REFERENCE_VERSION stamp is missing from the data file.");
  if (stamp.dataset !== STAMP_DATASET || stamp.licence !== STAMP_LICENCE || stamp.releases !== STAMP_RELEASES) {
    fail("version stamp names the wrong dataset, licence or releases.");
  }
  if (stamp.retrievedOn !== data.CNF_REFERENCE_RETRIEVED_ON) {
    fail("version stamp retrievedOn disagrees with CNF_REFERENCE_RETRIEVED_ON.");
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
