#!/usr/bin/env node
/**
 * Generate (or verify) the real-food-photograph set for Nutrition (P3-R).
 *
 *   npm run seed:food-images          regenerate assets + manifest
 *   npm run seed:food-images:check    verify manifest ↔ pins ↔ assets (no network)
 *
 * What this is, and the rules it lives by:
 *
 *   • **Real photographs only.** The owner rejected generated imagery
 *     outright. Every picture is a real photograph of the ingredient
 *     itself, sourced from Wikimedia Commons. Nothing is generated,
 *     stock-watermarked or borrowed from another food.
 *   • **Free licences only.** CC0, Public domain, CC BY, CC BY-SA (any
 *     version). The licence is read from Commons' own metadata at
 *     generation time and generation FAILS LOUDLY on anything else —
 *     GFDL-only, fair use, NC and ND never ship.
 *   • **Pinned, reviewed depictions.** Each reference food pins ONE
 *     Commons file title below. Every pin was eyeballed against the
 *     food before pinning: the ingredient in its raw/dry form, not a
 *     finished dish, not a branded product shot, not packaging. Where
 *     no truthful free photograph exists, the food is recorded in
 *     PHOTOLESS with the reason — never given a substitute image.
 *   • **Attribution is never hand-typed.** Author and licence come from
 *     the file's Commons extmetadata at generation time. A CC BY /
 *     BY-SA file whose metadata names no author fails generation,
 *     because it cannot be attributed; a public-domain / CC0 file with
 *     no recorded author is credited to its licence.
 *   • **Assets.** The ~512px Commons thumbnail is converted to WebP
 *     (max 512px wide, quality 80) at src/assets/foods/<slug>.webp —
 *     small enough for a 48px row thumbnail, large enough to stay
 *     honest on a credits sheet.
 *   • **Fingerprint.** The manifest carries a SHA-256 over the
 *     canonicalised attribution records, so any hand-edit of the
 *     generated file is detectable by `--check` and by the test suite.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(root, "src/lib/nutrition/data/foodImagesData.ts");
const ASSETS_DIR = resolve(root, "src/assets/foods");
const CHECK = process.argv.includes("--check");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = { "User-Agent": "BloomFoodImages/1.0 (food photo manifest generator for the Bloom app)" };

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The free licences Bloom may ship — the same allowlist the tests enforce. */
const FREE_LICENCE = /^(CC0|Public domain|CC BY( \d\.\d( [a-z]{2})?)?|CC BY-SA( \d\.\d( [a-z]{2})?)?)$/;

/* ------------------------------- the pins -------------------------------- */
/**
 * FDC id → the pinned Commons file (title without the "File:" prefix)
 * and the asset slug. One photograph per food, reviewed by eye against
 * the food before pinning (see the slice report for the review notes).
 */
const PINS = [
  [2512381, "Uncooked ST25 rice on bamboo surface.jpg", "white-rice"],
  [2512380, "Brown Rice.jpg", "brown-rice"],
  [2710825, "Black rice (20240221).jpg", "black-rice"],
  [2346396, "Rolled oats 2.jpg", "rolled-oats"],
  [2346397, "Bowl of dry steel-cut oats with full spoon.jpeg", "steel-cut-oats"],
  [2512379, "MILLET grains India.jpg", "millet"],
  [2710842, "A closeup of white sorghum.JPG", "sorghum"],
  [2512378, "Buckwheat and products from it 01.jpg", "buckwheat"],
  [168874, "Quinoa closeup.jpg", "quinoa"],
  [170284, "Graupen lose 26022015 8674.jpg", "pearl-barley"],
  [168893, "Whole wheat grain flour being scooped.jpg", "whole-wheat-flour"],
  [168936, "All-Purpose Flour (4107895947).jpg", "white-flour"],
  [168867, "Polenta uncooked.jpg", "cornmeal"],
  [168886, "Rye Flour (5811761026).jpg", "rye-flour"],
  [2644283, "Brown lentils.JPG", "lentils"],
  [174284, "Split Red Lentil.jpg", "red-lentils"],
  [2644282, "Dried chickpeas for sale - market in Israel.jpg", "chickpeas"],
  [173734, "Black Turtle Bean.jpg", "black-beans"],
  [175193, "Kidney beans (Phaseolus vulgaris) marketed Baubau.jpg", "kidney-beans"],
  [173745, "Phaseolus vulgaris white beans, witte boon.jpg", "navy-beans"],
  [175199, "Pinto Beans Seeds.jpg", "pinto-beans"],
  [174270, "Dried soybeans.jpg", "soybeans"],
  [172436, "Pigeon peas dried (cropped).jpg", "pigeon-peas"],
  [174256, "Mung beans (Vigna radiata).jpg", "mung-beans"],
  [174259, "Black gram.jpg", "mungo-beans"],
  [170419, "Green pea pods.jpg", "green-peas"],
  [322892, "Milk-bottle.jpg", "whole-milk"],
  [322559, "Skim milk poured into cereal bowl.jpg", "skim-milk"],
  [2259793, "Joghurt.jpg", "yogurt"],
  [330137, "Turkish strained yogurt.jpg", "greek-yogurt"],
  [328637, "White cheddar cheese.jpg", "cheddar"],
  [329370, "Mozzarella cheese.jpg", "mozzarella"],
  [325036, "2019-11-16 02 59 40 A small pile of Giant Real Grated Parmesan Cheese in the Dulles section of Sterling, Loudoun County, Virginia.jpg", "parmesan"],
  [328841, "Cottagecheese200px.jpg", "cottage-cheese"],
  [323444, "Ricotta fresca (Wiki Loves Sicilia).jpg", "ricotta"],
  [173410, "2019-11-28 14 27 10 A stick of butter laid out for Thanksgiving Dinner in the Parkway Village section of Ewing Township, Mercer County, New Jersey.jpg", "butter"],
  [171314, "Butterschmalz-3.jpg", "ghee"],
  [171287, "6-Pack-Chicken-Eggs.jpg", "egg-whole"],
  [172183, "Bowl of egg whites.jpg", "egg-white"],
  [172184, "Yolks.jpg", "egg-yolk"],
  [2646170, "Raw chicken slices.jpg", "chicken-breast"],
  [2646171, "Raw chicken thighs.jpg", "chicken-thigh"],
  [168608, "Minced Beef.jpg", "ground-beef"],
  [2514745, "Pork mince.jpg", "ground-pork"],
  [2646168, "Pork loin scored (5647068755).jpg", "pork-loin"],
  [2684441, "Raw salmon fillets.jpg", "salmon"],
  [2684444, "Morue (Gadus morhua) sur une table (Ifremer 00533-64440).jpg", "cod"],
  [2684442, "Liat Portal for Foodie Disorder - Raw Tilapia Prepared for Baking.jpg", "tilapia"],
  [333374, "Melanogrammus aeglefinus (FDA 113).jpg", "haddock"],
  [175179, "Raw shrimp.jpg", "shrimp"],
  [171413, "Bottle of olive oil.jpg", "olive-oil"],
  [330458, "Coconut oil 2.jpg", "coconut-oil"],
  [172336, "Huile de colza.JPG", "canola-oil"],
  [171411, "שמן סויה.jpg", "soybean-oil"],
  [171410, "Peanut oil bottle.jpg", "peanut-oil"],
  [171025, "Sunflower oil.jpg", "sunflower-oil"],
  [171016, "Sesamöl-1.jpg", "sesame-oil"],
  [2346401, "Russet potato.jpg", "potato"],
  [2346404, "Kumara (orange) - Harbourside Market, Wellington, New Zealand - DSC09840.jpg", "sweet-potato"],
  [790646, "Yellow onions vegetables.jpg", "onion"],
  [170457, "Ripe Red Tomatoes.jpg", "tomato"],
  [2258586, "Bunch of carrots.jpg", "carrot"],
  [321900, "Fire-Tuscarora Organic Growers - Broccoli head.jpg", "broccoli"],
  [2685573, "Stack of cauliflower heads.jpg", "cauliflower"],
  [2346407, "Cabbage on farm.jpg", "cabbage"],
  [2346406, "Fresh cucumbers in bulk.jpg", "cucumber"],
  [2710826, "Corn on the cob (sweet corn).jpg", "sweet-corn"],
  [168462, "Fresh Spinach leaves.jpg", "spinach"],
  [170427, "Green capsicum, sweet bell pepper.jpg", "green-pepper"],
  [170108, "Red bell pepper.jpg", "red-pepper"],
  [1750347, "Button Mushrooms.jpg", "mushrooms"],
  [2346400, "Green beans 169clue.jpg", "green-beans"],
  [1104647, "Garlic bulbs and cloves.jpg", "garlic"],
  [169231, "Fresh Ginger.JPG", "ginger"],
  [2685577, "Solanum melongena 24 08 2012 (1).JPG", "eggplant"],
  [173944, "Bunch of bananas on sale.jpg", "banana"],
  [171688, "Red Apple.jpg", "apple"],
  [746771, "Navel orange sectioned.jpg", "orange"],
  [169910, "Mangos - single and halved.jpg", "mango"],
  [327699, "Garden strawberry (Fragaria × ananassa) single2.jpg", "strawberries"],
  [174683, "2019-02-25 23 37 31 A bunch of green seedless table grapes from Peru in the Franklin Farm section of Oak Hill, Fairfax County, Virginia.jpg", "grapes"],
  [171705, "Avocado Hass - single and halved.jpg", "avocado"],
  [167746, "Lemon - whole and split.jpg", "lemon"],
  [167765, "Watermelon-garden.jpg", "watermelon"],
  [169124, "Pineapple fruit 2.jpg", "pineapple"],
  [746773, "Organic Bartlett Pears.jpg", "pear"],
  [2346393, "Liat Portal for Foodie Disorder - Raw almonds in a bowl.jpg", "almonds"],
  [2346394, "Walnut Brains.jpg", "walnuts"],
  [2515374, "CASHEW NUTS.jpg", "cashews"],
  [172430, "Peanuts (Arachis hypogaea) - in shell, shell cracked open, shelled, peeled.jpg", "peanuts"],
  [2515381, "Sunflower seed whole and kernel.jpg", "sunflower-seeds"],
  [169640, "Runny hunny.jpg", "honey"],
  [173468, "Table salt fine grain V1.jpg", "salt"],
  [334247, "A Bowl of Sugar 2.jpg", "sugar"],
  [173469, "Apple Cider Vinegar (4108653248).jpg", "apple-cider-vinegar"],
  /* Photo wave 2 (2026-11): the D1 and dishes-expansion foods, hunted
     on Commons under the same rules — see the wave report. */
  [172231, "Turmeric Powder on a Spoon - Black Background.jpg", "turmeric"],
  [170923, "Dried cumin seeds.jpg", "cumin-seed"],
  [170922, "Coriander Seeds.jpg", "coriander-seed"],
  [171319, "Red Chili Powder (Lall Mirch) (49695826571).jpg", "chili-powder"],
  [170924, "Nahrungsmittel 2012-07-08-9517.jpg", "curry-powder"],
  [171324, "Fenugreek seeds(মেথি).JPG", "fenugreek-seed"],
  [170919, "Cardamom Pods (4157454523).jpg", "cardamom"],
  [171320, "Cinnamon powder.jpg", "cinnamon"],
  [170917, "Dried bay leaves (20240502).jpg", "bay-leaf"],
  [171323, "Fennel seeds 01.jpg", "fennel-seed"],
  [170931, "Ground black pepper.jpg", "black-pepper"],
  [171330, "Poppy seeds.jpg", "poppy-seed"],
  [171321, "Groundcloves.jpg", "cloves"],
  [169997, "Coriander Leaves.jpg", "cilantro"],
  [173475, "Mint leaves (Mentha spicata).jpg", "spearmint"],
  [170497, "Green chili peppers.jpg", "green-chili"],
  [170106, "Red Hot Chili harvest.jpg", "red-chili"],
  [169260, "Bucket of raw okra pods.jpg", "okra"],
  [168393, "Bitter Melons.jpg", "bitter-gourd"],
  [174288, "Gram flour AvL.jpg", "besan"],
  [169714, "Rice Flour (Pitha Guri).jpg", "rice-flour"],
  [168933, "Semolina 300260.jpg", "semolina"],
  [173758, "BlackEyedPeas.JPG", "cowpeas"],
  [170150, "Sa white sesame seeds.jpg", "sesame-seeds"],
  [170169, "Fresh coconut flesh.jpg", "coconut-meat"],
  [167763, "Tamarind pods.JPG", "tamarind"],
  [172337, "Mustard Oil & Seeds - Kolkata 2003-10-31 00537.JPG", "mustard-oil"],
  [169985, "PeeLawPeeNam Cassava root Yuca Manioc.jpg", "cassava"],
  [2710818, "Green Plantains (Unsplash).jpg", "plantains"],
  [174687, "Jackfruit Flesh.jpg", "jackfruit"],
  [170172, "Cononut milk.JPG", "coconut-milk"],
  [169308, "Taro sold in supermarkets.jpg", "taro"],
  [170069, "Large wax gourd in supermarket.jpg", "wax-gourd"],
  [170483, "Moringa oleifera drumstick pods.JPG", "drumstick-pods"],
  [168416, "Moringa Leaves Farm Philippines 2018.jpg", "drumstick-leaves"],
  [172448, "Japanese SilkyTofu (Kinugoshi Tofu).JPG", "tofu"],
  [174272, "Tempeh 003.jpg", "tempeh"],
  [168410, "Shelled edamame beans.jpg", "edamame"],
  [175119, "Atlantic mackerel (Scomber scombrus).jpg", "atlantic-mackerel"],
];

/**
 * Reference foods with NO suitable free photograph — recorded, with the
 * reason, never silently omitted and never given a substitute image.
 */
const PHOTOLESS = [
  [174370, "No photograph verifiably depicting raw ground lamb exists on Wikimedia Commons under a free licence — searches (including a 2026-11 re-hunt) found only cooked lamb dishes, a garnished kibbeh nayyeh plate, generic ground-meat graphics and packaged mince."],
  [334194, "Only branded cans, supermarket-shelf packaging and prepared tuna dishes exist under free licences — packaging is not the food, so no photograph is pinned. (Re-hunted 2026-11.)"],
  [2514747, "The only free-licence depictions are ground turkey already browning in a skillet and photographs of live turkeys — no verifiable photograph of raw ground turkey. (Re-hunted 2026-11.)"],
  [2515380, "Free-licence photographs show pumpkin seeds in their hulls, or the hulled kernels roasted and salted — the raw hulled pepita kernel itself is not verifiably depicted. (Re-hunted 2026-11.)"],
  /* Photo wave 2 (2026-11) hunted the D1 and dishes-expansion foods;
     most were pinned (see PINS). The entries below were hunted hard
     and stay photo-less for the reasons given. */
  [170929, "Hunted 2026-11 (English, French, German, Dutch, Italian and Polish searches, plus title searches): ground mustard seed appears under free licences only in vintage branded tins and pharmacy jars — packaging — or as whole seeds; no photograph of the ground spice itself."],
  [170932, "Hunted 2026-11 (including the Cayenne pepper category and multilingual searches): ground cayenne appears only in branded jars and packets and in multi-powder scenes; every other depiction is the whole fresh or dried pepper, a different form."],
  [171098, "Hunted 2026-11 (English, German, French, Italian and Spanish searches): turkey breast appears under free licences only cooked, roasted, in sandwiches and wraps, or as packaged retail product — no verifiable photograph of the raw breast meat itself."],
  [175139, "Hunted 2026-11 (multilingual and category searches): canned sardines appear only as closed branded tins or restaurant servings — no open, unbranded depiction of the fish themselves under a free licence."],
  /* Protein-wave foundation (PW-1): the two generic protein powders.
     Hunted 2026-11-17 — Commons' protein-powder photography is
     branded tubs and product containers almost without exception, and
     the few unbranded frames show a flavoured product or a closed
     container: packaging, not the food. A scoop of one powder is also
     visually indistinguishable from another, so no photograph could
     truthfully depict either record. */
  [173177, "Hunted 2026-11-17: whey protein powder isolate appears on Commons only as branded tubs and product containers — packaging is not the food — and an unbranded scoop of powder cannot be told apart from any other protein powder, so no photograph can truthfully depict this record."],
  [173181, "Hunted 2026-11-17: soy-based protein powder appears on Commons only as branded tubs and product containers — packaging is not the food — and an unbranded scoop of powder cannot be told apart from any other protein powder, so no photograph can truthfully depict this record."],
];

/* ------------------------------ Commons API ------------------------------ */

async function api(params, tries = 6) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(`${API}?${params}`, { headers: UA });
    if (res.status === 429 || res.status === 503) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Commons API HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("Commons API rate limit did not clear");
}

/** Strip Commons' HTML / wikitext from a metadata value, keeping the name. */
function cleanAttribution(raw) {
  let s = (raw ?? "")
    /* Talk-page superscripts ("(talk)") are navigation, not the name. */
    .replace(/<sup>[\s\S]*?<\/sup>/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    /* Block separators become spaces; inline formatting vanishes so a
       name styled letter-by-letter ("F" + "ASTILY") stays one word. */
    .replace(/<(?:br|p|div|li|tr)[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s*\(\s*talk\s*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  /* Some Artist fields drag the whole licence boilerplate behind the
     name — the name is what attribution needs; cut the boilerplate. */
  for (const marker of ["This file is licensed", "http://", "https://"]) {
    const at = s.indexOf(marker);
    if (at > 0) s = s.slice(0, at).trim();
  }
  return s.replace(/[.\s]+$/, "").trim();
}

async function fetchImageInfo(titles) {
  const info = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await api(
      new URLSearchParams({
        action: "query",
        format: "json",
        prop: "imageinfo",
        iiprop: "url|extmetadata|size",
        iiurlwidth: "512",
        titles: batch.map((t) => `File:${t}`).join("|"),
      }),
    );
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      info.set(page.title.replace(/^File:/, ""), {
        license: ii.extmetadata?.LicenseShortName?.value ?? "",
        artist: cleanAttribution(ii.extmetadata?.Artist?.value ?? ""),
        credit: cleanAttribution(ii.extmetadata?.Credit?.value ?? ""),
        thumburl: ii.thumburl ?? ii.url,
      });
    }
    await sleep(600);
  }
  return info;
}

/* --------------------------- WebP conversion ----------------------------- */

let sharpFn = null;
try {
  const { createRequire } = await import("node:module");
  sharpFn = createRequire(import.meta.url)("sharp");
} catch {
  sharpFn = null;
}

async function toWebp(inputPath, outputPath) {
  if (sharpFn) {
    await sharpFn(inputPath)
      .resize({ width: 512, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);
    return;
  }
  execFileSync("python3", [
    "-c",
    `
from PIL import Image
import sys
im = Image.open(sys.argv[1]).convert("RGB")
if im.width > 512:
    im = im.resize((512, round(im.height * 512 / im.width)), Image.LANCZOS)
im.save(sys.argv[2], "WEBP", quality=80)
`,
    inputPath,
    outputPath,
  ]);
}

/* ------------------------------ generation ------------------------------- */

async function referenceFoods() {
  const data = await load("src/lib/nutrition/data/usdaReferenceData.ts");
  return data.USDA_REFERENCE_FOODS_RAW.map((f) => ({
    foodId: f.id,
    fdc: Number(f.id.replace(/^usda-/, "")),
    foodName: f.name,
  }));
}

function assertCoverage(foods) {
  const pinned = new Set(PINS.map(([fdc]) => fdc));
  const photoless = new Set(PHOTOLESS.map(([fdc]) => fdc));
  if (pinned.size !== PINS.length) throw new Error("duplicate FDC id in PINS");
  if (new Set(PINS.map(([, , slug]) => slug)).size !== PINS.length)
    throw new Error("duplicate slug in PINS");
  if (new Set(PINS.map(([, title]) => title)).size !== PINS.length)
    throw new Error("duplicate Commons title in PINS");
  for (const fdc of pinned)
    if (photoless.has(fdc)) throw new Error(`FDC ${fdc} is both pinned and photo-less`);
  for (const food of foods)
    if (!pinned.has(food.fdc) && !photoless.has(food.fdc))
      throw new Error(`reference food ${food.foodId} (${food.foodName}) has neither a pin nor a photo-less record`);
  for (const fdc of [...pinned, ...photoless])
    if (!foods.some((f) => f.fdc === fdc))
      throw new Error(`pin/photo-less entry for FDC ${fdc}, which is not a reference food`);
}

const ident = (slug) => slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

async function generate() {
  const foods = await referenceFoods();
  assertCoverage(foods);
  const pinByFdc = new Map(PINS.map(([fdc, title, slug]) => [fdc, { title, slug }]));
  const photolessByFdc = new Map(PHOTOLESS.map(([fdc, reason]) => [fdc, reason]));

  const info = await fetchImageInfo(PINS.map(([, title]) => title));

  mkdirSync(ASSETS_DIR, { recursive: true });
  const photos = [];
  const photoless = [];
  for (const food of foods) {
    const pin = pinByFdc.get(food.fdc);
    if (!pin) {
      photoless.push({ foodId: food.foodId, foodName: food.foodName, reason: photolessByFdc.get(food.fdc) });
      continue;
    }
    const meta = info.get(pin.title);
    if (!meta) throw new Error(`no Commons imageinfo for pinned file "${pin.title}" (${food.foodId})`);
    if (!FREE_LICENCE.test(meta.license))
      throw new Error(`licence gate: "${pin.title}" is "${meta.license}", not a free licence — refusing to ship it`);
    let author = meta.artist || meta.credit;
    if (!author) {
      if (meta.license === "Public domain") author = "Public domain";
      else if (meta.license === "CC0") author = "CC0";
      else
        throw new Error(
          `attribution gate: "${pin.title}" is ${meta.license} but Commons records no author — it cannot be attributed, refusing to ship it`,
        );
    }
    /* Download the ~512px thumbnail and convert it to WebP. */
    const tmp = join(tmpdir(), `bloom-food-${food.fdc}.bin`);
    let bytes = null;
    for (let attempt = 0; attempt < 5 && !bytes; attempt++) {
      const res = await fetch(meta.thumburl, { headers: UA });
      if (res.status === 429 || res.status === 503) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`download failed for "${pin.title}": HTTP ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
    }
    writeFileSync(tmp, bytes);
    const assetPath = join(ASSETS_DIR, `${pin.slug}.webp`);
    await toWebp(tmp, assetPath);
    const { size } = statSync(assetPath);
    if (size <= 2048 || size >= 153600)
      throw new Error(`asset size out of bounds for ${pin.slug}.webp: ${size} bytes`);
    photos.push({
      foodId: food.foodId,
      foodName: food.foodName,
      slug: pin.slug,
      commonsTitle: `File:${pin.title}`,
      author,
      license: meta.license,
      pageUrl: `https://commons.wikimedia.org/wiki/File:${pin.title.replace(/ /g, "_")}`,
    });
    console.log(`photo ${food.foodId}  ${pin.slug}.webp  ${size} B  ${meta.license}  ${author}`);
    await sleep(200);
  }

  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const fingerprint = createHash("sha256")
    .update(canonicalise({ photos, photoless }), "utf8")
    .digest("hex");
  const retrievedOn = new Date().toISOString().slice(0, 10);

  const q = (v) => JSON.stringify(v);
  const lines = [
    "/**",
    " * GENERATED by scripts/nutrition-food-images.mjs — do not edit by hand.",
    " * Regenerate with `npm run seed:food-images`; verify with `npm run seed:food-images:check`.",
    " *",
    " * Source: Wikimedia Commons (commons.wikimedia.org) — one real",
    " * photograph per USDA reference food, pinned by Commons file title",
    " * in the generator and reviewed against the food before pinning.",
    " * Licences: CC0, public domain, CC BY or CC BY-SA only; author and",
    " * licence below are read from each file's Commons metadata at",
    " * generation time, never hand-typed. Foods with no suitable free",
    " * photograph are listed in FOOD_IMAGE_PHOTOLESS, with the reason.",
    " */",
    "",
    ...photos.map((p) => `import ${ident(p.slug)} from "../../../assets/foods/${p.slug}.webp";`),
    "",
    `export const FOOD_IMAGES_RETRIEVED_ON = ${q(retrievedOn)};`,
    "",
    "/** SHA-256 over the canonicalised attribution records (see the generator). */",
    `export const FOOD_IMAGES_FINGERPRINT = ${q(fingerprint)};`,
    "",
    "export interface FoodImageRaw {",
    "  foodId: string;",
    "  foodName: string;",
    "  slug: string;",
    "  src: string;",
    "  commonsTitle: string;",
    "  author: string;",
    "  license: string;",
    "  pageUrl: string;",
    "}",
    "",
    "/** Every photographed reference food, in reference-set order. */",
    "export const FOOD_IMAGES_RAW: readonly FoodImageRaw[] = [",
    ...photos.map(
      (p) =>
        `  { "foodId": ${q(p.foodId)}, "foodName": ${q(p.foodName)}, "slug": ${q(p.slug)}, "src": ${ident(p.slug)}, "commonsTitle": ${q(p.commonsTitle)}, "author": ${q(p.author)}, "license": ${q(p.license)}, "pageUrl": ${q(p.pageUrl)} },`,
    ),
    "];",
    "",
    "export interface FoodImagePhotoless {",
    "  foodId: string;",
    "  foodName: string;",
    "  reason: string;",
    "}",
    "",
    "/** Reference foods with no suitable free photograph, and why. */",
    "export const FOOD_IMAGE_PHOTOLESS: readonly FoodImagePhotoless[] = [",
    ...photoless.map(
      (p) => `  { "foodId": ${q(p.foodId)}, "foodName": ${q(p.foodName)}, "reason": ${q(p.reason)} },`,
    ),
    "];",
    "",
  ];
  writeFileSync(OUT_FILE, lines.join("\n"));
  console.log(`wrote ${OUT_FILE}`);
  console.log(`photos: ${photos.length}  photo-less: ${photoless.length}  fingerprint: sha256:${fingerprint}`);
}

/* -------------------------------- check ---------------------------------- */

function parseManifest(text) {
  const photos = [];
  const photoless = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{ "foodId":')) continue;
    const json = trimmed.replace(/,$/, "").replace(/"src": ([A-Za-z0-9_]+)/, '"src": "$1"');
    const entry = JSON.parse(json);
    if ("reason" in entry) photoless.push(entry);
    else photos.push(entry);
  }
  return { photos, photoless };
}

async function check() {
  const fail = (msg) => {
    console.error(`check failed: ${msg}`);
    process.exit(1);
  };
  if (!existsSync(OUT_FILE)) fail(`manifest missing: ${OUT_FILE}`);
  const text = readFileSync(OUT_FILE, "utf8");
  const { photos, photoless } = parseManifest(text);
  const stored = text.match(/FOOD_IMAGES_FINGERPRINT = "([0-9a-f]{64})"/)?.[1];
  if (!stored) fail("manifest carries no fingerprint");

  const foods = await referenceFoods();
  assertCoverage(foods);
  const pinByFdc = new Map(PINS.map(([fdc, title, slug]) => [fdc, { title, slug }]));
  const photolessByFdc = new Map(PHOTOLESS.map(([fdc, reason]) => [fdc, reason]));

  if (photos.length !== PINS.length) fail(`manifest holds ${photos.length} photos, the pin list has ${PINS.length}`);
  if (photoless.length !== PHOTOLESS.length)
    fail(`manifest holds ${photoless.length} photo-less records, the table has ${PHOTOLESS.length}`);

  const seenAssets = new Set();
  for (const photo of photos) {
    const fdc = Number(photo.foodId.replace(/^usda-/, ""));
    const pin = pinByFdc.get(fdc);
    if (!pin) fail(`${photo.foodId} is in the manifest but not in the pin list`);
    if (pin.slug !== photo.slug) fail(`${photo.foodId}: manifest slug ${photo.slug} ≠ pin slug ${pin.slug}`);
    if (photo.commonsTitle !== `File:${pin.title}`)
      fail(`${photo.foodId}: manifest title "${photo.commonsTitle}" ≠ pin "File:${pin.title}"`);
    if (!FREE_LICENCE.test(photo.license)) fail(`${photo.foodId}: licence "${photo.license}" is not free`);
    if (!photo.author?.trim()) fail(`${photo.foodId}: no author recorded`);
    const asset = join(ASSETS_DIR, `${photo.slug}.webp`);
    if (!existsSync(asset)) fail(`${photo.foodId}: asset missing: ${asset}`);
    const { size } = statSync(asset);
    if (size <= 2048 || size >= 153600) fail(`${photo.foodId}: asset size out of bounds: ${size} bytes`);
    seenAssets.add(`${photo.slug}.webp`);
  }
  for (const entry of photoless) {
    const fdc = Number(entry.foodId.replace(/^usda-/, ""));
    if (photolessByFdc.get(fdc) !== entry.reason)
      fail(`${entry.foodId}: photo-less reason in manifest ≠ generator table`);
  }
  for (const file of readdirSync(ASSETS_DIR)) {
    if (file.endsWith(".webp") && !seenAssets.has(file))
      fail(`asset ${file} is in the tree but not in the manifest`);
  }

  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const photosForHash = photos.map(({ src, ...keep }) => keep);
  const fingerprint = createHash("sha256")
    .update(canonicalise({ photos: photosForHash, photoless }), "utf8")
    .digest("hex");
  if (fingerprint !== stored) {
    console.error("check failed: fingerprint mismatch — the manifest was edited or is stale.");
    console.error(`  stored:   ${stored}`);
    console.error(`  computed: ${fingerprint}`);
    process.exit(1);
  }
  console.log(`check ok: ${photos.length} photos, ${photoless.length} photo-less, fingerprint sha256:${fingerprint}`);
}

if (CHECK) await check();
else await generate();
