#!/usr/bin/env node
/**
 * Generate (or verify) the real-dish-photograph set for Nutrition (D3).
 *
 *   npm run seed:dish-images          regenerate assets + manifest
 *   npm run seed:dish-images:check    verify manifest ↔ pins ↔ assets (no network)
 *
 * What this is, and the rules it lives by:
 *
 *   • **Real photographs only.** The owner rejected generated imagery
 *     outright. Every picture is a real photograph of the prepared dish
 *     itself, plated or served, sourced from Wikimedia Commons. Nothing
 *     is generated, stock-watermarked or borrowed from another dish.
 *   • **Free licences only.** CC0, Public domain, CC BY, CC BY-SA (any
 *     version). The licence is read from Commons' own metadata at
 *     generation time and generation FAILS LOUDLY on anything else —
 *     GFDL-only, fair use, NC and ND never ship.
 *   • **Pinned, reviewed depictions.** Each dish pins ONE Commons file
 *     title below. Every pin was eyeballed against the dish before
 *     pinning, and the file's Commons title was checked against the
 *     dish as a second gate: searches for Indian dishes are full of
 *     near-misses (an "egg biryani" that is shrimp biryani, a "paneer
 *     tikka masala" that is chicken), and any pin whose title or image
 *     contradicted the dish was rejected. Where no truthful free
 *     photograph exists, the dish is recorded in PHOTOLESS with the
 *     reason — never given a substitute image.
 *   • **Shared photographs.** A variant whose plating is visually
 *     identical to another dish's — an enriched version of the same
 *     dish, the same dish listed in two categories, a regional sibling
 *     with the same defining ingredient — may pin the same Commons
 *     file. Every such sharing is listed in SHARED_FILES; a Commons
 *     title used by dishes outside that table fails generation/check.
 *   • **Attribution is never hand-typed.** Author and licence come from
 *     the file's Commons extmetadata at generation time. A CC BY /
 *     BY-SA file whose metadata names no author fails generation,
 *     because it cannot be attributed; a public-domain / CC0 file with
 *     no recorded author is credited to its licence.
 *   • **Assets.** A ~1280px Commons thumbnail is converted to WebP
 *     (max dimension 896px, quality 80) at src/assets/dishes/<slug>.webp
 *     — large enough for the dish detail view, small enough to ship.
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
const OUT_FILE = resolve(root, "src/lib/nutrition/data/dishImagesData.ts");
const ASSETS_DIR = resolve(root, "src/assets/dishes");
const CHECK = process.argv.includes("--check");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = { "User-Agent": "BloomDishImages/1.0 (dish photo manifest generator for the Bloom app)" };

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The free licences Bloom may ship — the same allowlist the tests enforce. */
const FREE_LICENCE = /^(CC0|Public domain|CC BY( \d\.\d( [a-z]{2})?)?|CC BY-SA( \d\.\d( [a-z]{2})?)?)$/;

/* ------------------------------- the pins -------------------------------- */
/**
 * Dish id → the pinned Commons file (title without the "File:" prefix)
 * and the asset slug. One photograph per dish, reviewed by eye against
 * the dish (and against the file's title) before pinning.
 */
const PINS = [
  ["dish-masoor-dal-tadka", "Tadka Dal.jpg", "masoor-dal-tadka"],
  ["dish-jeera-rice", "Jeera Rice India.jpg", "jeera-rice"],
  ["dish-mint-coriander-chutney", "Coriander mint chutney.JPG", "mint-coriander-chutney"],
  ["dish-cucumber-raita", "Cucumber-raita.jpg", "cucumber-raita"],
  ["dish-aloo-gobi", "Aloo gobi (3085447892).jpg", "aloo-gobi"],
  ["dish-dal-fry", "Daal after Tadka Pulse Soup India.jpg", "dal-fry"],
  ["dish-moong-dal-tadka", "Dal Tadaka1.jpg", "moong-dal-tadka"],
  ["dish-moong-khichdi", "MoongDal Khichdi.jpg", "moong-khichdi"],
  ["dish-urad-dal", "Urad dal.JPG", "urad-dal"],
  ["dish-panchmel-dal", "Dal Panchmel.jpg", "panchmel-dal"],
  ["dish-masoor-palak-dal", "Lal Masoor Dal and Palak.JPG", "masoor-palak-dal"],
  ["dish-dal-makhani", "Dal Makhani..JPG", "dal-makhani"],
  ["dish-rajma-masala", "Rajma.jpg", "rajma-masala"],
  ["dish-chole-masala", "Chole Masala India.jpg", "chole-masala"],
  ["dish-lobia-masala", "Lobia Masala.jpg", "lobia-masala"],
  ["dish-sambar", "Sambar Curry.JPG", "sambar"],
  ["dish-dal-palak", "Dal Palak Spinach and lentil curry (15914333462).jpg", "dal-palak"],
  ["dish-sabut-masoor", "Kali Masoor Ki Dal Ka Salan.JPG", "sabut-masoor"],
  ["dish-coconut-lentil-curry", "Molakootal.JPG", "coconut-lentil-curry"],
  ["dish-matar-paneer", "Matar-Paneer.JPG", "matar-paneer"],
  ["dish-palak-paneer", "Palak Paneer (Cottage cheese in spinach gravy).jpg", "palak-paneer"],
  ["dish-paneer-bhurji", "Paneer burji.jpg", "paneer-bhurji"],
  ["dish-kadai-paneer", "Kadai Paneer (15913018051).jpg", "kadai-paneer"],
  ["dish-paneer-butter-masala", "Paneer butter masala 2.jpg", "paneer-butter-masala"],
  ["dish-shahi-paneer", "Shahi Paneer with mint.jpg", "shahi-paneer"],
  ["dish-paneer-do-pyaza", "Paneer Do-Pyaza.jpg", "paneer-do-pyaza"],
  ["dish-achari-paneer", "Achari paneer.JPG", "achari-paneer"],
  ["dish-egg-curry", "Spicy Anda Curry.jpg", "egg-curry"],
  ["dish-egg-masala", "Egg curry.jpg", "egg-masala"],
  ["dish-anda-bhurji", "Anda bujiya.jpg", "anda-bhurji"],
  ["dish-anda-matar-curry", "Egg gravy with peas.jpg", "anda-matar-curry"],
  ["dish-chicken-curry", "Chicken curry Trivandrum.jpg", "chicken-curry"],
  ["dish-chicken-tikka-masala", "Chicken Tikka Masala KellySue.JPG", "chicken-tikka-masala"],
  ["dish-chicken-keema-matar", "Chicken Keema Matar.jpg", "chicken-keema-matar"],
  ["dish-kadai-chicken", "Kadai chicken.jpg", "kadai-chicken"],
  ["dish-chicken-chettinad", "ChickenChettinad.JPG", "chicken-chettinad"],
  ["dish-butter-chicken", "Chicken makhani.jpg", "butter-chicken"],
  ["dish-chicken-korma", "Chicken White Qorma (Korma).JPG", "chicken-korma"],
  ["dish-mutton-keema-matar", "Keema Matar Salan.jpg", "mutton-keema-matar"],
  ["dish-goan-fish-curry", "Goan Fish Curry Rice (5905244921).jpg", "goan-fish-curry"],
  ["dish-fish-moilee", "Fish moilee moily molee.jpg", "fish-moilee"],
  ["dish-prawn-masala", "Prawn masala.jpeg", "prawn-masala"],
  ["dish-tuna-potato-curry", "Tuna Fish curry South Indian Style.jpg", "tuna-potato-curry"],
  ["dish-baingan-bharta", "Baingan Ka Bharta.JPG", "baingan-bharta"],
  ["dish-bhindi-masala", "Bhindi Masala.jpg", "bhindi-masala"],
  ["dish-aloo-matar", "Aloo Matar.JPG", "aloo-matar"],
  ["dish-mixed-veg-curry", "Mixed Vegetable Curry.JPG", "mixed-veg-curry"],
  ["dish-mushroom-masala", "Mushroom Masala by Dr. Raju Kasambe IMG 20190701 (5).jpg", "mushroom-masala"],
  ["dish-karela-aloo", "Aloo Karela Bhaaji from India.jpg", "karela-aloo"],
  ["dish-aloo-baingan", "Aloo aur Baingan ki sabzi.jpg", "aloo-baingan"],
  ["dish-band-gobhi-matar", "Band Gobhi Ki Bhujia.JPG", "band-gobhi-matar"],
  ["dish-corn-capsicum-masala", "Corn capsicum masala.jpg", "corn-capsicum-masala"],
  ["dish-aloo-palak", "Aloo Palak (Spinach with Potatoes).JPG", "aloo-palak"],
  ["dish-mushroom-matar", "Matar mushroom.jpg", "mushroom-matar"],
  ["dish-chole-enriched", "Chole Masala India.jpg", "chole-enriched"],
  ["dish-rajma-enriched", "Rajma.jpg", "rajma-enriched"],
  ["dish-matar-paneer-enriched", "Matar-Paneer.JPG", "matar-paneer-enriched"],
  ["dish-palak-paneer-enriched", "Palak Paneer (Cottage cheese in spinach gravy).jpg", "palak-paneer-enriched"],
  ["dish-egg-curry-enriched", "Spicy Anda Curry.jpg", "egg-curry-enriched"],
  ["dish-chicken-curry-enriched", "Chicken curry Trivandrum.jpg", "chicken-curry-enriched"],
  ["dish-dal-makhani-enriched", "Dal Makhani..JPG", "dal-makhani-enriched"],
  ["dish-baingan-bharta-enriched", "Baingan Ka Bharta.JPG", "baingan-bharta-enriched"],
  ["dish-khichdi-enriched", "Masala Khichadi.jpg", "khichdi-enriched"],
  ["dish-goan-fish-curry-enriched", "Goan Fish Curry Rice (5905244921).jpg", "goan-fish-curry-enriched"],
  ["dish-veg-pulao", "VEGETABLE PULAO ~ An Indian cuisine made from fried rice mixed with fried vegetables.jpg", "veg-pulao"],
  ["dish-matar-pulao", "Mattar Pulao (Peas Pullao).JPG", "matar-pulao"],
  ["dish-mushroom-pulao", "Mushroom pulao.jpg", "mushroom-pulao"],
  ["dish-moong-dal-khichdi", "MoongDal Khichdi.jpg", "moong-dal-khichdi"],
  ["dish-masala-khichdi", "Masala Khichadi.jpg", "masala-khichdi"],
  ["dish-veg-biryani", "Vegetable biryani 03.JPG", "veg-biryani"],
  ["dish-egg-biryani", "Egg Biryani.JPG", "egg-biryani"],
  ["dish-chicken-biryani", "Chicken Hyderabadi Biryani.JPG", "chicken-biryani"],
  ["dish-chicken-pulao", "Chicken Pulao.jpg", "chicken-pulao"],
  ["dish-lemon-rice", "Lemon Rice in Kerala.jpg", "lemon-rice"],
  ["dish-tamarind-rice", "A background of tamarind rice ~ A specialitate of South India.jpg", "tamarind-rice"],
  ["dish-curd-rice", "Curd Rice.jpg", "curd-rice"],
  ["dish-tomato-rice", "Tomato Rice up-close (1862224148).jpg", "tomato-rice"],
  ["dish-coconut-rice", "Coconut rice with crispies.jpg", "coconut-rice"],
  ["dish-jeera-matar-rice", "Jeera rice with peas.JPG", "jeera-matar-rice"],
  ["dish-ven-pongal", "Pongalpot.jpg", "ven-pongal"],
  ["dish-soya-pulao", "Pulav with vegetables and soya chunks.jpg", "soya-pulao"],
  ["dish-millet-khichdi", "Kodo millet khichdi.jpg", "millet-khichdi"],
  ["dish-egg-fried-rice", "Fried rice with egg.jpg", "egg-fried-rice"],
  ["dish-cottage-cheese-pulao", "Panner Pulao.JPG", "cottage-cheese-pulao"],
  ["dish-enriched-veg-biryani", "Vegetable biryani 03.JPG", "enriched-veg-biryani"],
  ["dish-phulka-roti", "Chapati-1.jpg", "phulka-roti"],
  ["dish-whole-wheat-paratha", "Paratha and Lassi-Chennai-Tamilnadu-IMG 1796.jpg", "whole-wheat-paratha"],
  ["dish-aloo-paratha", "Aloo Paratha North Indian.jpg", "aloo-paratha"],
  ["dish-gobi-paratha", "Picture of tasty Gobi paratha.JPG", "gobi-paratha"],
  ["dish-poori", "Puri.jpg", "poori"],
  ["dish-bhatura", "Bhatura.jpg", "bhatura"],
  ["dish-naan", "Naan 2.jpg", "naan"],
  ["dish-garlic-naan", "Garlic Butter Naan Food by Ms Ujwala Kasambe DSCN1136 (1).jpg", "garlic-naan"],
  ["dish-cheese-naan", "Cheese naan and Curry 03.jpg", "cheese-naan"],
  ["dish-missi-roti", "Missi Roti.jpg", "missi-roti"],
  ["dish-makki-di-roti", "Makki ki roti 2015.jpg", "makki-di-roti"],
  ["dish-palak-paratha", "Palak parantha.JPG", "palak-paratha"],
  ["dish-lachha-paratha", "Lachha-paratha.jpg", "lachha-paratha"],
  ["dish-pyaaz-paratha", "Onion Corriander Paratha.JPG", "pyaaz-paratha"],
  ["dish-rava-upma", "Rava Upma (Suji or Semolina Upma).JPG", "rava-upma"],
  ["dish-veg-upma", "Vegetable Upma.JPG", "veg-upma"],
  ["dish-idli", "Idli Sambar.JPG", "idli"],
  ["dish-dosa", "Dosa and ghee.jpg", "dosa"],
  ["dish-masala-dosa", "Masala Dosa in Banana Leaf with Chutney.jpg", "masala-dosa"],
  ["dish-onion-uttapam", "Uttapam-garnishing.jpg", "onion-uttapam"],
  ["dish-adai-dosa", "Adai Dosai with Chutney 01.jpg", "adai-dosa"],
  ["dish-besan-chilla", "Gram flour Chilla (Besan ka Cheela).JPG", "besan-chilla"],
  ["dish-moong-dal-chilla", "Pesarattu.jpg", "moong-dal-chilla"],
  ["dish-oats-porridge", "Banana oatmeal 2.jpg", "oats-porridge"],
  ["dish-protein-oats", "Banana Oatmeal Breakfast Bowl (44302857265).jpg", "protein-oats"],
  ["dish-masala-oats", "Masala Oats by Dr. Raju Kasambe DSCN7840 (8).jpg", "masala-oats"],
  ["dish-overnight-oats", "-2019-02-07 Overnight Oats, Cromer.JPG", "overnight-oats"],
  ["dish-boiled-egg-plate", "-2019-12-06 Boiled egg with toasted soliders, Trimingham.JPG", "boiled-egg-plate"],
  ["dish-masala-omelette", "Masala Cheese Omlette.jpg", "masala-omelette"],
  ["dish-egg-bhurji", "Spicy egg bhurji @ the eggfactory.jpg", "egg-bhurji"],
  ["dish-sprouted-moong-bowl", "Sprouted Moong Salad.JPG", "sprouted-moong-bowl"],
  ["dish-fruit-curd-bowl", "Lancaster, United States (Unsplash).jpg", "fruit-curd-bowl"],
  ["dish-enriched-fruit-curd-bowl", "Lancaster, United States (Unsplash).jpg", "enriched-fruit-curd-bowl"],
  ["dish-masala-sweet-potato", "Roasted Shakarkand Chaat, Gun Hill Chaat Centre, Mussoorie, Uttarakhand.jpg", "masala-sweet-potato"],
  ["dish-roasted-chana", "Roasted Chickpea Chana with Salt and Turmeric.jpg", "roasted-chana"],
  ["dish-sprouts-chaat", "Sprout chaat.jpg", "sprouts-chaat"],
  ["dish-besan-pakora", "Pakoras besan ke.JPG", "besan-pakora"],
  ["dish-onion-pakora", "Kanda Bhaji.JPG", "onion-pakora"],
  ["dish-cottage-cheese-pakora", "Paneer Pakora - Cottage Cheese Fritters.jpg", "cottage-cheese-pakora"],
  ["dish-aloo-tikki", "Aloo Tikki served with chutneys.jpg", "aloo-tikki"],
  ["dish-veg-cutlet", "Vegetable Cutlet.jpg", "veg-cutlet"],
  ["dish-besan-dhokla", "Dhokla on Gujrart.jpg", "besan-dhokla"],
  ["dish-corn-chaat", "Spicy.JPG", "corn-chaat"],
  ["dish-peanut-chaat", "Peanut Salad.jpg", "peanut-chaat"],
  ["dish-fruit-chaat", "Fruit Chaat.jpg", "fruit-chaat"],
  ["dish-chana-chaat", "Punjabi Chana Chaat.JPG", "chana-chaat"],
  ["dish-lobia-chaat", "JazzyBlackEyedPeaSalad-0927.jpg", "lobia-chaat"],
  ["dish-moong-sundal", "Sundal having mango.JPG", "moong-sundal"],
  ["dish-chana-sundal", "Chana usuli or kadale kaalu usuli.jpg", "chana-sundal"],
  ["dish-aloo-chaat", "Aloo Chaat.jpg", "aloo-chaat"],
  ["dish-shakarkandi-chaat", "Shakarkandi Chaat- Homemade-Indian Subcontinent-Image no. 2.jpg", "shakarkandi-chaat"],
  ["dish-bhindi-fry", "Karari bhindi !!!.jpg", "bhindi-fry"],
  ["dish-baingan-masala", "Brinjal Curry 1.jpg", "baingan-masala"],
  ["dish-gajar-matar", "Carrot and Peas Bhaji.jpg", "gajar-matar"],
  ["dish-beans-poriyal", "Beans and carrot poriyal.JPG", "beans-poriyal"],
  ["dish-cabbage-poriyal", "Cabbage and Carrot Poriyal.jpg", "cabbage-poriyal"],
  ["dish-aloo-beans", "Sem Ki Phalli aur Aloo.JPG", "aloo-beans"],
  ["dish-karela-fry", "Fried Bitter Gourd in Mango Sauce.jpg", "karela-fry"],
  ["dish-mixed-veg-dry", "Mix veg Bhaja.jpg", "mixed-veg-dry"],
  ["dish-aloo-fry", "Potato fry Andhra Style.jpg", "aloo-fry"],
  ["dish-mushroom-pepper-fry", "Ghee Pepper Mushroom Fry.jpg", "mushroom-pepper-fry"],
  ["dish-sprouted-moong", "Spicy Sprouted Moong.JPG", "sprouted-moong"],
  ["dish-sookha-chana", "DRY KALA CHANA MASALA.jpg", "sookha-chana"],
  ["dish-masala-corn", "Masala sweet corn.jpg", "masala-corn"],
  ["dish-shimla-mirch-masala", "Capsicum Masala.jpg", "shimla-mirch-masala"],
  ["dish-soya-masala", "Soya Chunks Masala.jpg", "soya-masala"],
  ["dish-corn-palak", "Corn spinach- makai malai palak.JPG", "corn-palak"],
  ["dish-vangi-masala", "Stuffed Brinjal Spicy Masala.JPG", "vangi-masala"],
  ["dish-aloo-matar-dry", "Aloo matar.jpg", "aloo-matar-dry"],
  ["dish-shahi-paneer-style", "Shahi Paneer with mint.jpg", "shahi-paneer-style"],
  ["dish-coconut-chutney", "Coconut Chutney - Home Made.JPG", "coconut-chutney"],
  ["dish-tomato-chutney", "Tomato Chatni.jpg", "tomato-chutney"],
  ["dish-peanut-chutney", "Coconut Peanut Chutney.jpg", "peanut-chutney"],
  ["dish-imli-chutney", "Meetha chutney tamarind dates chutney.JPG", "imli-chutney"],
  ["dish-onion-chutney", "Onion chutney.jpg", "onion-chutney"],
  ["dish-lahsun-chutney", "Picture of south indian Garlic chutney.JPG", "lahsun-chutney"],
  ["dish-dhaniya-chutney", "Green Chutney.jpg", "dhaniya-chutney"],
  ["dish-pudina-dahi-dip", "Raita with cucumber and mint.jpg", "pudina-dahi-dip"],
  ["dish-chilli-garlic-oil", "Chilioil.jpg", "chilli-garlic-oil"],
  ["dish-mango-chutney", "Unripe Mango Chutney - Kolkata 2011-02-23 1714.JPG", "mango-chutney"],
  ["dish-shahi-coconut-chutney", "Coconut Chutney - Home Made.JPG", "shahi-coconut-chutney"],
  ["dish-boondi-raita", "Boondi Raita.JPG", "boondi-raita"],
  ["dish-mixed-veg-raita", "Vegetable Raita.jpg", "mixed-veg-raita"],
  ["dish-onion-tomato-raita", "Have \"Raita\" Cool Summer Mantra.jpg", "onion-tomato-raita"],
  ["dish-aloo-raita", "Aloo Ka Raita.JPG", "aloo-raita"],
  ["dish-pineapple-raita", "Pineapple Raita.JPG", "pineapple-raita"],
  ["dish-gajar-raita", "Carrot raita.JPG", "gajar-raita"],
  ["dish-rice-kheer", "Rice Kheer or Rice Pudding.JPG", "rice-kheer"],
  ["dish-sooji-halwa", "Sooji Halwa.JPG", "sooji-halwa"],
  ["dish-gajar-halwa", "Gajjar ka halwa (carrot halwa).JPG", "gajar-halwa"],
  ["dish-moong-dal-halwa", "Moong Dal Halwa.JPG", "moong-dal-halwa"],
  ["dish-fruit-salad-spiced-yogurt", "Fruktsallad (Fruit salad).jpg", "fruit-salad-spiced-yogurt"],
  ["dish-besan-ladoo", "Besan Laddoo Sweets India.jpg", "besan-ladoo"],
  ["dish-coconut-ladoo", "Coconut ladoo, Assam.jpg", "coconut-ladoo"],
  ["dish-shrikhand", "Shrikhand.JPG", "shrikhand"],
  ["dish-atta-halwa", "Picture of yummy Atta halwa.JPG", "atta-halwa"],
  ["dish-shahi-kheer", "Shahi Kheer.jpg", "shahi-kheer"],
  ["dish-masala-chaas", "Masala chaas.JPG", "masala-chaas"],
  ["dish-sweet-lassi", "Lassi(sweet).JPG", "sweet-lassi"],
  ["dish-namkeen-lassi", "Chilli Garlic Chuntney and Namkeen Lassi.JPG", "namkeen-lassi"],
  ["dish-mango-lassi", "Tasty Mango lassi picture.JPG", "mango-lassi"],
  ["dish-shikanji", "Fresh Lime.JPG", "shikanji"],
  ["dish-jeera-shikanji", "Fresh Lime.JPG", "jeera-shikanji"],
  ["dish-badam-doodh", "Badam Milk Drink.jpg", "badam-doodh"],
  ["dish-pudina-chaas", "Mint masala chaas.JPG", "pudina-chaas"],
  ["dish-tarbooz-sharbat", "Water Pump Ka Sharbat e Tarbooz.JPG", "tarbooz-sharbat"],
];

/**
 * Commons titles pinned by MORE THAN ONE dish, with the dishes allowed
 * to share each: enriched variants of a photographed base dish, the
 * same dish carried in two library categories, and visually identical
 * siblings. Any other reuse of a title fails generation and check.
 */
const SHARED_FILES = [
  ["MoongDal Khichdi.jpg", ["dish-moong-khichdi", "dish-moong-dal-khichdi"]],
  ["Dal Makhani..JPG", ["dish-dal-makhani", "dish-dal-makhani-enriched"]],
  ["Rajma.jpg", ["dish-rajma-masala", "dish-rajma-enriched"]],
  ["Chole Masala India.jpg", ["dish-chole-masala", "dish-chole-enriched"]],
  ["Matar-Paneer.JPG", ["dish-matar-paneer", "dish-matar-paneer-enriched"]],
  ["Palak Paneer (Cottage cheese in spinach gravy).jpg", ["dish-palak-paneer", "dish-palak-paneer-enriched"]],
  ["Shahi Paneer with mint.jpg", ["dish-shahi-paneer", "dish-shahi-paneer-style"]],
  ["Spicy Anda Curry.jpg", ["dish-egg-curry", "dish-egg-curry-enriched"]],
  ["Chicken curry Trivandrum.jpg", ["dish-chicken-curry", "dish-chicken-curry-enriched"]],
  ["Goan Fish Curry Rice (5905244921).jpg", ["dish-goan-fish-curry", "dish-goan-fish-curry-enriched"]],
  ["Baingan Ka Bharta.JPG", ["dish-baingan-bharta", "dish-baingan-bharta-enriched"]],
  ["Masala Khichadi.jpg", ["dish-khichdi-enriched", "dish-masala-khichdi"]],
  ["Vegetable biryani 03.JPG", ["dish-veg-biryani", "dish-enriched-veg-biryani"]],
  ["Lancaster, United States (Unsplash).jpg", ["dish-fruit-curd-bowl", "dish-enriched-fruit-curd-bowl"]],
  ["Coconut Chutney - Home Made.JPG", ["dish-coconut-chutney", "dish-shahi-coconut-chutney"]],
  ["Fresh Lime.JPG", ["dish-shikanji", "dish-jeera-shikanji"]],
];

/**
 * Library dishes with NO suitable free photograph — recorded, with the
 * reason, never silently omitted and never given a substitute image.
 */
const PHOTOLESS = [
  ["dish-arhar-dal", "Commons search returns only the pigeon-pea plant and its fields — no photograph of the cooked dal under a free licence was found."],
  ["dish-black-bean-masala", "Every free-licence 'black bean curry' photograph on Commons proved to be lobia (black-eyed peas) on inspection — no verifiable black-bean curry photograph."],
  ["dish-pinto-bean-curry", "No free-licence photograph of a pinto bean curry was found on Commons."],
  ["dish-white-bean-curry", "No free-licence photograph verifiably depicting a white bean curry was found — the results were Thai curries and banana-leaf meals."],
  ["dish-soybean-curry", "The only free-licence candidate was a text-overlaid photo collage — no clean photograph of a soybean curry."],
  ["dish-matar-masala", "Commons offers keema matar (with meat) and dry masala peas (a snack) under free licences, but no photograph of a plain peas curry."],
  ["dish-sprouted-moong-curry", "The candidates were misal pav (a different, farsan-topped dish) and unrelated images — no photograph of a plain sprouted moong curry."],
  ["dish-tomato-dal", "No photograph verifiably showing tomato dal was found; the dal photographs available are generic tadka dals already pinned to other dishes."],
  ["dish-paneer-tikka-masala", "Every 'paneer tikka masala' result on Commons is actually a chicken tikka masala photograph — no verifiable paneer version under a free licence."],
  ["dish-chicken-saag", "Commons' saag photographs prove to be lamb saag or saag paneer on inspection — no verifiable chicken saag photograph under a free licence."],
  ["dish-salmon-masala-curry", "No free-licence photograph of a salmon curry was found; the results were other fish curries and composed salmon plates."],
  ["dish-gobi-masala", "Every free-licence candidate proved to be aloo gobi (with potato) or gobi manchurian on inspection — no potato-free gobi masala photograph."],
  ["dish-beans-carrot-coconut-curry", "The candidates were beans thoran (a dry stir-fry) and full meals — no photograph of the coconut curry itself."],
  ["dish-sweet-potato-coconut-curry", "The only candidate was a Thai meal table where the dish could not be isolated or verified."],
  ["dish-soya-matar", "Candidates show a soya curry and peas rice as separate halves of one thali — no photograph of soya chunks and peas cooked together."],
  ["dish-masala-paratha", "No free-licence photograph verifiably depicting a masala paratha was found."],
  ["dish-cottage-cheese-paratha", "The only stuffed-paratha candidate proved to be a meat keema paratha — no verifiable paneer paratha photograph."],
  ["dish-cottage-cheese-chilla", "Only plain besan chilla photographs exist under free licences (one is pinned to Besan Chilla) — none shows the cottage-cheese variant."],
  ["dish-barley-porridge", "The candidates were harees (a wheat-and-meat porridge) and plain cooked barley grains — no photograph of a barley breakfast porridge."],
  ["dish-quinoa-upma", "No free-licence photograph of quinoa upma was found on Commons."],
  ["dish-varutharacha-sambar", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-murungakkai-sambar", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kerala-parippu-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-moru-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kumbalanga-pulissery", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mambazha-pulissery", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kerala-mutta-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mutta-roast", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kadala-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kadala-curry-enriched", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-cherupayar-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vanpayar-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vendakka-theeyal", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pavakka-theeyal", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ulli-theeyal", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chemmeen-theeyal", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-nadan-meen-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mathi-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-thenga-aracha-meen-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-manga-meen-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-meen-varuthathu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chemmeen-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chemmeen-roast", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-nadan-kozhi-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhi-varutharacha-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kerala-chicken-stew", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhi-porichathu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhi-perattu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-koon-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-urulakizhangu-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kerala-veg-stew", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-thakkali-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kappa-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chembu-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-murungakkai-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ulli-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhikode-pidi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-thakkali-rasam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kurumulaku-rasam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-avial", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-olan", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kalan", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kaya-erissery", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-koottu-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kaya-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-carrot-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-cheera-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-muringa-ila-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vendakka-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chembu-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-cherupayar-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vanpayar-thoran", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kappa-puzhukku", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chembu-puzhukku", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pineapple-pachadi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mambazha-pachadi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vellarikka-pachadi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vendakka-kichadi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pavakka-kichadi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mathi-peera", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ayala-peera", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-manga-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-muringa-ila-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kaya-varuthathu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-urulakizhangu-mezhukkupuratti", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-carrot-mezhukkupuratti", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kumbalanga-curry", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-thenga-chammanthi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ulli-chammanthi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chuvanna-thenga-chammanthi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pudina-chammanthi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mulaku-chammanthi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-injipuli", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-naranga-achar", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-inji-achar", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chammanthi-podi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-appam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kallappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-idiyappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-puttu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-gothambu-puttu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pazham-puttu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mutta-appam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mutta-stew", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pazhankanji", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pathiri", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-orotti", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kerala-parotta", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-poricha-pathiri", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-thalassery-chicken-biryani", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ney-choru", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-meen-biryani", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chemmeen-biryani", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vattayappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kinnathappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhukatta", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ottada", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chakka-ottada", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-unniyappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pazham-pori", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-uzhunnu-vada", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-parippu-vada", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-sukhiyan", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mutta-bajji", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-vazhakkai-bajji", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhi-cutlet", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-irachi-pathiri", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kozhi-ada", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-achappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kuzhalappam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kaya-upperi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pavakka-upperi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kappa-upperi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-diamond-cuts", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-avalose-podi", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kerala-mixture", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-ammini-kozhukatta", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-unnakkaya", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-parippu-payasam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chakka-payasam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pazham-payasam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-kadala-payasam", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pazham-halwa", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chakka-varattiyathu", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-mutta-mala", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-chatti-pathiri", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-sambaram", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-inji-naranga-juice", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-pineapple-sarbath", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-munthiri-juice", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-orange-sarbath", "New in the Kerala wave — no photograph has been hunted for this dish yet; it is recorded photo-less rather than given a picture of a different dish."],
  ["dish-egg-chaat", "No free-licence photograph of egg chaat was found on Commons."],
  ["dish-masala-seed-mix", "The only candidate was sweet mukhwas (a mouth freshener), not a savoury masala seed and nut mix."],
  ["dish-palak-saag", "Commons' saag photographs prove to be sarson (mustard) saag on inspection — no verifiable spinach-only palak saag photograph."],
  ["dish-sookhi-gobi-masala", "The dry side version has no photograph of its own; the only cauliflower photographs on Commons are wet curries or aloo gobi."],
  ["dish-broccoli-masala", "The candidates proved to be broccoli-and-potato dishes or unrelated curries — no verifiable broccoli masala photograph."],
  ["dish-shakarkandi-masala", "The only candidate proved to be a regular potato curry (khatte mithe aloo) — no verifiable sweet-potato masala photograph."],
  ["dish-lobia-usal", "The candidates were a fish curry and dal plates — no photograph of lobia usal under a free licence."],
  ["dish-onion-tomato-masala", "The only close candidate proved to be a chicken curry — no photograph of the plain onion-tomato masala base."],
  ["dish-shahi-mixed-veg", "The candidates were thalis and rice plates — no photograph isolating a shahi mixed vegetable curry."],
  ["dish-til-chutney", "The candidates were sesame-oil milling scenes and unrelated spice powders — no photograph of til (sesame) chutney."],
  ["dish-magaj-chutney", "No free-licence photograph of a sunflower-seed (magaj) chutney was found on Commons."],
  ["dish-fruit-raita", "No candidate verifiably showed fruit in the raita — the results were plain and cucumber raitas."],
  ["dish-palak-raita", "The only candidate was a thali flat-lay — no photograph isolating a spinach raita."],
  ["dish-burhani-raita", "No free-licence photograph of burhani (burani) raita was found on Commons."],
  ["dish-greek-yogurt-raita", "No free-licence photograph specifically of a Greek-yogurt raita was found; it is left photo-less rather than borrowing another raita's photograph."],
  ["dish-corn-raita", "No free-licence photograph verifiably showing a corn raita was found."],
  ["dish-oats-kheer", "No free-licence photograph of oats kheer (payasam) was found on Commons."],
  ["dish-haldi-doodh", "The candidates were the turmeric plant, turmeric powder and a branded mix packet — no photograph of the drink itself under a free licence."],
  ["dish-intl-herb-grilled-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-lemon-garlic-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-fajitas", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-shawarma", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-jerk-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-peri-peri-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-ginger-chicken-stir-fry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-quinoa-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-caesar-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-vegetable-soup", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-black-bean-chili", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-cacciatore", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-creamy-garlic-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-buffalo-chicken-strips", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-satay", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-schnitzel", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-roast-chicken-vegetables", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-spanish-chicken-rice", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-parmigiana", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-thai-green-chicken-curry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-enchilada-bake", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-greek-chicken-souvlaki", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-meatballs", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-burgers", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-kidney-bean-chili", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-garlic-herb-turkey-breast", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-vegetable-stir-fry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-meatloaf", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-taco-cups", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-stuffed-peppers", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-lamb-kofta", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-shepherds-pie", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-grilled-salmon", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-honey-garlic-salmon", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-salmon-cakes", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-salmon-green-beans-almonds", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-salmon-quinoa-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-blackened-salmon", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tuna-white-bean-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tuna-melt", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tuna-stuffed-peppers", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tuna-egg-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-sardines-on-flatbread", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-sardine-chickpea-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-grilled-mackerel", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-mackerel-potato-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-baked-cod-tomatoes", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cod-corn-chowder", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-blackened-tilapia", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tilapia-tacos", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-oat-crusted-haddock", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-mediterranean-fish-stew", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-shrimp-scampi", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-garlic-shrimp-broccoli", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-shrimp-fajitas", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-shrimp-coconut-curry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-shrimp-egg-fried-rice", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-mixed-seafood-stew", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tuna-quinoa-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-shakshuka", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-spinach-cheese-frittata", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-crustless-quiche", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-egg-quinoa-fried-rice", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-spanish-potato-tortilla", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-menemen", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tofu-edamame-stir-fry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tofu-coconut-curry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-green-bean-stir-fry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-coconut-curry", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-taco-cups", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-bolognese", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-edamame-quinoa-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-soybean-tomato-chili", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tofu-oat-meatballs", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-mapo-style-tofu", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-burger-patties", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tofu-cabbage-cups", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-pad-thai-style-tofu", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-black-bean-burrito-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-lentil-bolognese", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chickpea-spinach-stew", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tuscan-white-bean-soup", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-three-bean-quinoa-chili", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-mediterranean-lentil-soup", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-black-eyed-pea-stew", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-falafel-plate", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-hummus-egg-plate", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-warm-lentil-egg-salad", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-quinoa-black-bean-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-peanut-chickpea-stew", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cottage-cheese-power-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tomato-mozzarella-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-spinach-ricotta-chicken", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cheesy-bean-bake", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-broccoli-cheddar-soup", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cauliflower-cheese-bake", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-meatballs", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-chicken-pot-pie-stew", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-lentil-walnut-meatballs", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-black-bean-burgers", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-quinoa-chickpea-burgers", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-edamame-egg-fried-rice", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-rice-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tofu-scramble", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-veggie-omelette", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-denver-turkey-omelette", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cottage-spinach-omelette", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-egg-white-turkey-scramble", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cheese-scrambled-eggs", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-breakfast-burrito", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-eggs-benedict-style", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-french-cheese-omelette", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-turkey-sweet-potato-hash", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-protein-oatmeal", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-overnight-oats", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-greek-yogurt-power-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cottage-egg-flatbread", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-potato-hash", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-baked-egg-muffins", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-quinoa-breakfast-bowl", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-salmon-egg-breakfast", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-huevos-rancheros", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-breakfast-sandwich", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-oat-cottage-pancakes", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-socca-egg-spinach", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-cilbir", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-tempeh-strips-eggs", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-savoury-oatmeal", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-quinoa-porridge", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-beans-eggs-skillet", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-salmon-spinach-omelette", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-intl-egg-avocado-flatbread", "Added in the international high-protein expansion wave (2026-11); no photograph has been sourced for this dish yet — it stays photo-less until a real, free-licence photograph of the dish is reviewed and pinned."],
  ["dish-avgolemono", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-souvlaki", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-lemon-chicken-potatoes", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-kotopoulo-kokkinisto", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-psari-plaki", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-grilled-sardines-lemon", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-baked-mackerel-greek", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-garides-kokkinistes", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-fakes-lentil-soup", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-fasolada", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-gigantes-plaki", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-strapatsada-style-eggs", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-yogurt-power-bowl", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-lemon-chicken-rice", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-turkey-souvlaki", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-shrimp-quinoa", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-baked-tilapia", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-herb-omelette", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-gyro-plate", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-mavromatika-fasolia", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-kotopoulo-me-fasolia", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-turkey-keftedes", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-greek-sardine-bake", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-piccata", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-cacciatore", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pollo-sorrentina", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-polpette-tacchino", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-turkey-involtini", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-risotto-tonno", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-risotto-salmone", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-risotto-gamberi", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-orzotto", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-frittata-spinach-mozzarella", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-frittata-patate", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-uova-purgatorio", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-tonno-fagioli", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-minestrone-fagioli", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-ribollita", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-zuppa-lenticchie", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pesce-acqua-pazza", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-insalata-di-mare", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pollo-diavola", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-gnocchi-turkey-ragu", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-stracciatella-soup", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-sardine-bake-italian", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-tilapia-livornese", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-tortilla-espanola", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-gambas-ajillo", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pollo-ajillo", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-cod-galician", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-cod-tomato-spanish", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-lentejas-estofadas", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-garbanzos-espinacas", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-huevos-flamenca", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-atun-encebollado", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pollo-pepitoria", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-garbanzos-gambas", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-albondigas-pavo-almendras", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-revuelto-setas", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pisto-huevo", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-alubias-blancas", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-merluza-salsa-verde", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-pollo-chilindron", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-albondigas-cordero", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-salmon-pisto", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-poulet-basquaise", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-salade-nicoise", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-bouillabaisse-style", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-haddock-meuniere", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-fricassee", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-turkey-blanquette", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-salade-lentilles", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-mackerel-moutarde", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-oeufs-cocotte", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-omelette-mushroom-mozzarella", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-quiche-epinards", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-provencal", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-brandade-style", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-soupe-de-poisson", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-turkey-escalope-lemon", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-salmon-herb-crust", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-haricots-bretonne", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-poulet-chasseur", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-mercimek-corbasi", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-tavuk-sis", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-hindi-sis", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-kuzu-kofte", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-hindi-kofte", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-karniyarik", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-hunkar-begendi", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-menemen", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-cilbir", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-karides-guvec", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-tavuk-guvec", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-nohut-yemegi", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-kuru-fasulye", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-balik-bugulama", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-sardalya-tava", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-yogurtlu-tavuk", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-etli-nohut", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-mantarli-yumurta", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-hummus-meal", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-falafel-baked", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-shish-tawook", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-shawarma-plate", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-kofta-bi-tahini", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-shakshuka", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-fatteh-hummus", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-mujadara", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-sayadieh", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-samkeh-harra", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-maghmour", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-dajaj-mashwi", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-foul-style-beans", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-qaridis-bi-thoom", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-shorbet-adas", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-samak-bi-tahini", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-fatteh-batenjan", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-tagine-lemon-onion", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-lamb-tagine-chickpea", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-kefta-mkaouara", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-harira", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-fish-tagine-chermoula", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-shrimp-tagine-moroccan", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-rfissa-style", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chickpea-tagine-spinach", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-sardine-kefta", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-turkey-tagine-quinoa", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chicken-almond-tagine", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-chickpea-egg-tagine", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-white-fish-tagine", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-lamb-quinoa-pilaf", "Added in the international X-2 wave (Mediterranean / European / Middle Eastern); no photograph of this dish has been reviewed and pinned yet, so it ships photo-less rather than with an unreviewed or borrowed image."],
  ["dish-jp-salmon-shioyaki", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-mackerel-shioyaki", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-grilled-sardines", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-chicken-shio-karaage", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-tamagoyaki", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-goya-champuru", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-sesame-tofu-steak", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-japanese-chicken-curry", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-turkey-hambagu", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-ginger-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-salmon-egg-rice-bowl", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-eggplant-tofu-stirfry", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-steamed-chicken-sesame", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-breakfast-plate", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-jp-shrimp-tempura", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-chicken-bibimbap", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-tofu-bibimbap", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-sundubu-jjigae", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-gyeran-mari", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-dak-gomtang", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-haemul-pajeon", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-dak-juk", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-kong-guksu", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-crispy-fried-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-steamed-egg-shrimp", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-spicy-chicken-stew", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-grilled-mackerel-chilli", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-kr-egg-fried-rice", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-white-cut-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-tomato-egg-stirfry", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-steamed-fish-ginger", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-shrimp-egg-fried-rice", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-hot-sour-soup", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-chicken-corn-soup", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-prawn-wontons", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-salt-pepper-shrimp", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-home-style-tofu", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-steamed-egg-prawns", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-hainanese-chicken-rice", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-cashew-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-moo-goo-gai-pan", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-egg-foo-young", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-gong-bao-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-sesame-chilli-noodles", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-clay-pot-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-cn-chicken-congee", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-pad-thai", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-chicken-cashew", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-chicken-larb", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-tofu-larb", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-gai-yang", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-massaman-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-coconut-chicken-curry", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-fish-cakes", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-fried-fish-tamarind", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-shrimp-fried-rice", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-kai-jeow", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-sour-fish-curry", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-pineapple-fried-rice", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-th-pad-prik-king", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-pho-ga", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-banh-xeo", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-canh-chua", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-ga-kho-gung", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-goi-ga", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-turmeric-fish", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-banh-cuon", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-vn-chicken-curry", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-chicken-rendang", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-nasi-lemak", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-chicken-satay", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-gado-gado", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-soto-ayam", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-bakso-ayam", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-tempeh-sambal", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-tahu-isi", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-ikan-bakar", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-ayam-goreng", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-sayur-lodeh", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-opor-ayam", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-nasi-goreng", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-sambal-telur", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-mie-goreng", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-id-spiced-baked-fish", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-herb-grilled-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-turkey-chilli", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-white-chicken-chilli", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-salmon-cakes", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-yogurt-tuna-salad", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-breakfast-burrito", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-turkey-burgers", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-bbq-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-salmon-chowder", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-cod-cakes", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-chicken-pot-pie", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-turkey-meatloaf", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-shrimp-grits", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-jambalaya", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-chicken-gumbo", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-blackened-tilapia", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-eggs-royale", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-southwest-scramble", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-tuna-noodle-casserole", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-chicken-dumplings", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-buffalo-chicken", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-us-denver-omelette", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chicken-tinga", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chicken-burrito-bowl", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chicken-tacos-pastor", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-fish-tacos", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-huevos-rancheros", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chilaquiles", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chicken-enchiladas", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chicken-quesadillas", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-bean-cheese-burritos", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-arroz-con-pollo", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-pollo-guisado", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-ropa-vieja-pollo", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-turkey-picadillo", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-shrimp-ceviche", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-aguachile", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-turkey-empanadas", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-tamal-cazuela", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-sopa-de-lima", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-gallo-pinto", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-arepas-reina-pepiada", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-arepas-beans-cheese", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-mx-chicken-pozole", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-pe-pollo-saltado", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-pe-aji-de-gallina", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-pe-arroz-chaufa", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-pe-seco-de-pollo", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-br-moqueca", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-br-coxinha", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
  ["dish-br-escondidinho", "Authored in the X-3 international high-protein wave; no Commons photograph hunt has been run for this dish yet — left photo-less rather than given a substitute image."],
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
        iiurlwidth: "1280",
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
      .resize({ width: 896, height: 896, fit: "inside", withoutEnlargement: true })
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
im.thumbnail((896, 896), Image.LANCZOS)
im.save(sys.argv[2], "WEBP", quality=80)
`,
    inputPath,
    outputPath,
  ]);
}

/* ------------------------------ generation ------------------------------- */

/** The dish library, in library order (the five data modules are
 *  type-only importers, so Node's type stripping loads them directly). */
async function dishLibrary() {
  const [proof, mains, riceBread, sides, kerala, intl1, intl2, intl3] = await Promise.all([
    load("src/lib/nutrition/data/proofDishes.ts"),
    load("src/lib/nutrition/data/dishesMains.ts"),
    load("src/lib/nutrition/data/dishesRiceBread.ts"),
    load("src/lib/nutrition/data/dishesSides.ts"),
    load("src/lib/nutrition/data/dishLibraryKerala.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl1.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl2.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl3.ts"),
  ]);
  return [
    ...proof.PROOF_DISHES,
    ...mains.DISHES_MAINS,
    ...riceBread.DISHES_RICE_BREAD,
    ...sides.DISHES_SIDES,
    ...kerala.KERALA_DISHES,
    ...intl1.INTL1_DISHES,
    ...intl2.INTL2_DISHES,
    ...intl3.INTL3_DISHES,
  ].map((d) => ({ dishId: d.id, dishName: d.name.en }));
}

function assertCoverage(dishes) {
  const pinned = new Set(PINS.map(([dishId]) => dishId));
  const photoless = new Set(PHOTOLESS.map(([dishId]) => dishId));
  if (pinned.size !== PINS.length) throw new Error("duplicate dish id in PINS");
  if (new Set(PINS.map(([, , slug]) => slug)).size !== PINS.length)
    throw new Error("duplicate slug in PINS");
  /* A Commons title may serve several dishes ONLY where SHARED_FILES
     records the sharing — an unrecorded reuse fails here. */
  const byTitle = new Map();
  for (const [dishId, title] of PINS) {
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push(dishId);
  }
  const shared = new Map(SHARED_FILES.map(([title, ids]) => [title, [...ids].sort().join("|")]));
  for (const [title, ids] of byTitle) {
    if (ids.length > 1 && shared.get(title) !== [...ids].sort().join("|"))
      throw new Error(`Commons title "${title}" is pinned by ${ids.join(", ")} but SHARED_FILES does not record exactly that sharing`);
  }
  for (const title of shared.keys())
    if (!byTitle.has(title)) throw new Error(`SHARED_FILES lists "${title}", which no pin uses`);
  for (const dishId of pinned)
    if (photoless.has(dishId)) throw new Error(`${dishId} is both pinned and photo-less`);
  for (const dish of dishes)
    if (!pinned.has(dish.dishId) && !photoless.has(dish.dishId))
      throw new Error(`library dish ${dish.dishId} (${dish.dishName}) has neither a pin nor a photo-less record`);
  for (const dishId of [...pinned, ...photoless])
    if (!dishes.some((d) => d.dishId === dishId))
      throw new Error(`pin/photo-less entry for ${dishId}, which is not a library dish`);
}

const ident = (slug) => slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

async function generate() {
  const dishes = await dishLibrary();
  assertCoverage(dishes);
  const pinByDish = new Map(PINS.map(([dishId, title, slug]) => [dishId, { title, slug }]));
  const photolessByDish = new Map(PHOTOLESS.map(([dishId, reason]) => [dishId, reason]));

  const info = await fetchImageInfo([...new Set(PINS.map(([, title]) => title))]);

  mkdirSync(ASSETS_DIR, { recursive: true });
  const photos = [];
  const photoless = [];
  const downloaded = new Map();
  for (const dish of dishes) {
    const pin = pinByDish.get(dish.dishId);
    if (!pin) {
      photoless.push({ dishId: dish.dishId, dishName: dish.dishName, reason: photolessByDish.get(dish.dishId) });
      continue;
    }
    const meta = info.get(pin.title);
    if (!meta) throw new Error(`no Commons imageinfo for pinned file "${pin.title}" (${dish.dishId})`);
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
    /* Download the ~1280px thumbnail once per Commons file, convert per dish. */
    if (!downloaded.has(pin.title)) {
      const tmp = join(tmpdir(), `bloom-dish-${createHash("sha256").update(pin.title).digest("hex").slice(0, 12)}.bin`);
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
      downloaded.set(pin.title, tmp);
      await sleep(200);
    }
    const assetPath = join(ASSETS_DIR, `${pin.slug}.webp`);
    await toWebp(downloaded.get(pin.title), assetPath);
    const { size } = statSync(assetPath);
    if (size <= 4096 || size >= 512000)
      throw new Error(`asset size out of bounds for ${pin.slug}.webp: ${size} bytes`);
    photos.push({
      dishId: dish.dishId,
      dishName: dish.dishName,
      slug: pin.slug,
      commonsTitle: `File:${pin.title}`,
      author,
      license: meta.license,
      pageUrl: `https://commons.wikimedia.org/wiki/File:${pin.title.replace(/ /g, "_")}`,
    });
    console.log(`photo ${dish.dishId}  ${pin.slug}.webp  ${size} B  ${meta.license}  ${author}`);
  }

  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const fingerprint = createHash("sha256")
    .update(canonicalise({ photos, photoless }), "utf8")
    .digest("hex");
  const retrievedOn = new Date().toISOString().slice(0, 10);

  const q = (v) => JSON.stringify(v);
  const lines = [
    "/**",
    " * GENERATED by scripts/nutrition-dish-images.mjs — do not edit by hand.",
    " * Regenerate with `npm run seed:dish-images`; verify with `npm run seed:dish-images:check`.",
    " *",
    " * Source: Wikimedia Commons (commons.wikimedia.org) — one real",
    " * photograph per library dish, pinned by Commons file title in the",
    " * generator and reviewed against the dish (image and title) before",
    " * pinning. Licences: CC0, public domain, CC BY or CC BY-SA only;",
    " * author and licence below are read from each file's Commons",
    " * metadata at generation time, never hand-typed. Dishes with no",
    " * suitable free photograph are listed in DISH_IMAGE_PHOTOLESS,",
    " * with the reason.",
    " */",
    "",
    ...photos.map((p) => `import ${ident(p.slug)} from "../../../assets/dishes/${p.slug}.webp";`),
    "",
    `export const DISH_IMAGES_RETRIEVED_ON = ${q(retrievedOn)};`,
    "",
    "/** SHA-256 over the canonicalised attribution records (see the generator). */",
    `export const DISH_IMAGES_FINGERPRINT = ${q(fingerprint)};`,
    "",
    "export interface DishImageRaw {",
    "  dishId: string;",
    "  dishName: string;",
    "  slug: string;",
    "  src: string;",
    "  commonsTitle: string;",
    "  author: string;",
    "  license: string;",
    "  pageUrl: string;",
    "}",
    "",
    "/** Every photographed library dish, in library order. */",
    "export const DISH_IMAGES_RAW: readonly DishImageRaw[] = [",
    ...photos.map(
      (p) =>
        `  { "dishId": ${q(p.dishId)}, "dishName": ${q(p.dishName)}, "slug": ${q(p.slug)}, "src": ${ident(p.slug)}, "commonsTitle": ${q(p.commonsTitle)}, "author": ${q(p.author)}, "license": ${q(p.license)}, "pageUrl": ${q(p.pageUrl)} },`,
    ),
    "];",
    "",
    "export interface DishImagePhotoless {",
    "  dishId: string;",
    "  dishName: string;",
    "  reason: string;",
    "}",
    "",
    "/** Library dishes with no suitable free photograph, and why. */",
    "export const DISH_IMAGE_PHOTOLESS: readonly DishImagePhotoless[] = [",
    ...photoless.map(
      (p) => `  { "dishId": ${q(p.dishId)}, "dishName": ${q(p.dishName)}, "reason": ${q(p.reason)} },`,
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
    if (!trimmed.startsWith('{ "dishId":')) continue;
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
  const stored = text.match(/DISH_IMAGES_FINGERPRINT = "([0-9a-f]{64})"/)?.[1];
  if (!stored) fail("manifest carries no fingerprint");

  const dishes = await dishLibrary();
  assertCoverage(dishes);
  const pinByDish = new Map(PINS.map(([dishId, title, slug]) => [dishId, { title, slug }]));
  const photolessByDish = new Map(PHOTOLESS.map(([dishId, reason]) => [dishId, reason]));

  if (photos.length !== PINS.length) fail(`manifest holds ${photos.length} photos, the pin list has ${PINS.length}`);
  if (photoless.length !== PHOTOLESS.length)
    fail(`manifest holds ${photoless.length} photo-less records, the table has ${PHOTOLESS.length}`);

  const seenAssets = new Set();
  for (const photo of photos) {
    const pin = pinByDish.get(photo.dishId);
    if (!pin) fail(`${photo.dishId} is in the manifest but not in the pin list`);
    if (pin.slug !== photo.slug) fail(`${photo.dishId}: manifest slug ${photo.slug} ≠ pin slug ${pin.slug}`);
    if (photo.commonsTitle !== `File:${pin.title}`)
      fail(`${photo.dishId}: manifest title "${photo.commonsTitle}" ≠ pin "File:${pin.title}"`);
    if (!FREE_LICENCE.test(photo.license)) fail(`${photo.dishId}: licence "${photo.license}" is not free`);
    if (!photo.author?.trim()) fail(`${photo.dishId}: no author recorded`);
    const asset = join(ASSETS_DIR, `${photo.slug}.webp`);
    if (!existsSync(asset)) fail(`${photo.dishId}: asset missing: ${asset}`);
    const { size } = statSync(asset);
    if (size <= 4096 || size >= 512000) fail(`${photo.dishId}: asset size out of bounds: ${size} bytes`);
    seenAssets.add(`${photo.slug}.webp`);
  }
  for (const entry of photoless) {
    if (photolessByDish.get(entry.dishId) !== entry.reason)
      fail(`${entry.dishId}: photo-less reason in manifest ≠ generator table`);
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
