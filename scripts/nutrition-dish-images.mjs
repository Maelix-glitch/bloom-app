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
  ["dish-fruit-curd-bowl", "Lancaster, United States (Unsplash).jpg", "fruit-curd-bowl"],
  ["dish-enriched-fruit-curd-bowl", "Lancaster, United States (Unsplash).jpg", "enriched-fruit-curd-bowl"],
  ["dish-roasted-chana", "Roasted Chickpea Chana with Salt and Turmeric.jpg", "roasted-chana"],
  ["dish-sprouts-chaat", "Sprout chaat.jpg", "sprouts-chaat"],
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
  ["dish-sookha-chana", "DRY KALA CHANA MASALA.jpg", "sookha-chana"],
  ["dish-masala-corn", "Masala sweet corn.jpg", "masala-corn"],
  ["dish-shimla-mirch-masala", "Capsicum Masala.jpg", "shimla-mirch-masala"],
  ["dish-soya-masala", "Soya Chunks Masala.jpg", "soya-masala"],
  ["dish-corn-palak", "Corn spinach- makai malai palak.JPG", "corn-palak"],
  ["dish-vangi-masala", "Stuffed Brinjal Spicy Masala.JPG", "vangi-masala"],
  ["dish-aloo-matar-dry", "Aloo matar.jpg", "aloo-matar-dry"],
  ["dish-coconut-chutney", "Coconut Chutney - Home Made.JPG", "coconut-chutney"],
  ["dish-tomato-chutney", "Tomato Chatni.jpg", "tomato-chutney"],
  ["dish-peanut-chutney", "Coconut Peanut Chutney.jpg", "peanut-chutney"],
  ["dish-onion-chutney", "Onion chutney.jpg", "onion-chutney"],
  ["dish-lahsun-chutney", "Picture of south indian Garlic chutney.JPG", "lahsun-chutney"],
  ["dish-dhaniya-chutney", "Green Chutney.jpg", "dhaniya-chutney"],
  ["dish-pudina-dahi-dip", "Raita with cucumber and mint.jpg", "pudina-dahi-dip"],
  ["dish-shahi-coconut-chutney", "Coconut Chutney - Home Made.JPG", "shahi-coconut-chutney"],
  ["dish-boondi-raita", "Boondi Raita.JPG", "boondi-raita"],
  ["dish-mixed-veg-raita", "Vegetable Raita.jpg", "mixed-veg-raita"],
  ["dish-onion-tomato-raita", "Have \"Raita\" Cool Summer Mantra.jpg", "onion-tomato-raita"],
  ["dish-aloo-raita", "Aloo Ka Raita.JPG", "aloo-raita"],
  ["dish-pineapple-raita", "Pineapple Raita.JPG", "pineapple-raita"],
  ["dish-gajar-raita", "Carrot raita.JPG", "gajar-raita"],
  ["dish-fruit-salad-spiced-yogurt", "Fruktsallad (Fruit salad).jpg", "fruit-salad-spiced-yogurt"],
  ["dish-masala-chaas", "Masala chaas.JPG", "masala-chaas"],
  ["dish-sweet-lassi", "Lassi(sweet).JPG", "sweet-lassi"],
  ["dish-namkeen-lassi", "Chilli Garlic Chuntney and Namkeen Lassi.JPG", "namkeen-lassi"],
  ["dish-mango-lassi", "Tasty Mango lassi picture.JPG", "mango-lassi"],
  ["dish-badam-doodh", "Badam Milk Drink.jpg", "badam-doodh"],
  ["dish-pudina-chaas", "Mint masala chaas.JPG", "pudina-chaas"],
  ["dish-varutharacha-sambar", "Sambar 2.jpg", "varutharacha-sambar"],
  ["dish-murungakkai-sambar", "Sambar (drumstick).jpg", "murungakkai-sambar"],
  ["dish-kerala-parippu-curry", "Kerala-Style Parippu Curry – Traditional Lentil Curry of Kerala.jpg", "kerala-parippu-curry"],
  ["dish-moru-curry", "Butter milk curry closeup.jpg", "moru-curry"],
  ["dish-kumbalanga-pulissery", "Pulissery.jpg", "kumbalanga-pulissery"],
  ["dish-mambazha-pulissery", "Mambazha Pulisseri.jpg", "mambazha-pulissery"],
  ["dish-kerala-mutta-curry", "Egg curry - kerala style - 2576.JPG", "kerala-mutta-curry"],
  ["dish-mutta-roast", "Kerala style egg roast.JPG", "mutta-roast"],
  ["dish-kadala-curry", "Kadala curry.jpg", "kadala-curry"],
  ["dish-kadala-curry-enriched", "Kadala curry.jpg", "kadala-curry-enriched"],
  ["dish-pavakka-theeyal", "Bitter melon curry of Kerala.jpg", "pavakka-theeyal"],
  ["dish-nadan-meen-curry", "Fish Curry Kerala.jpg", "nadan-meen-curry"],
  ["dish-mathi-curry", "Mathi curry.JPG", "mathi-curry"],
  ["dish-thenga-aracha-meen-curry", "Meen curry (fish curry) from Kerala, traditionally prepared in earthern pot.jpg", "thenga-aracha-meen-curry"],
  ["dish-manga-meen-curry", "Fish Mango curry IMG20260606220805.jpg", "manga-meen-curry"],
  ["dish-meen-varuthathu", "Kerala Fish Fry.jpg", "meen-varuthathu"],
  ["dish-chemmeen-curry", "Kappa with Chemmeen curry.jpg", "chemmeen-curry"],
  ["dish-chemmeen-roast", "Shrimp roast.jpg", "chemmeen-roast"],
  ["dish-nadan-kozhi-curry", "Kerala (Naadan) Chicken Curry.jpg", "nadan-kozhi-curry"],
  ["dish-kozhi-varutharacha-curry", "Varutharacha Chicken Curry (15914732965).jpg", "kozhi-varutharacha-curry"],
  ["dish-kerala-chicken-stew", "Chicken Stew (1205814362).jpg", "kerala-chicken-stew"],
  ["dish-kozhi-porichathu", "Chicken fry of Kerala.jpg", "kozhi-porichathu"],
  ["dish-kerala-veg-stew", "Appam and stew.jpg", "kerala-veg-stew"],
  ["dish-thakkali-curry", "Thakkalikkary 02.jpg", "thakkali-curry"],
  ["dish-kozhikode-pidi", "Pidiyum Kozhiyum.jpg", "kozhikode-pidi"],
  ["dish-thakkali-rasam", "Tomato Rasam - Home Made.JPG", "thakkali-rasam"],
  ["dish-kurumulaku-rasam", "Tamarind Rasam with pepper.jpg", "kurumulaku-rasam"],
  ["dish-avial", "Aviyal,Kerala cuisine.jpg", "avial"],
  ["dish-olan", "Olan.jpg", "olan"],
  ["dish-kalan", "Kaalan Curry during Onam celebration1.JPG", "kalan"],
  ["dish-kaya-erissery", "Erisseri.jpg", "kaya-erissery"],
  ["dish-koottu-curry", "Traditional Koottu Curry of Kerala.JPG", "koottu-curry"],
  ["dish-carrot-thoran", "Carrot Thoran.jpg", "carrot-thoran"],
  ["dish-cheera-thoran", "Cheera Thoran India.jpg", "cheera-thoran"],
  ["dish-kappa-puzhukku", "Kappa Kuzhachathu.jpg", "kappa-puzhukku"],
  ["dish-vellarikka-pachadi", "Cucumber pachadi- My home Bangalore -Karnataka -pic 08.jpg", "vellarikka-pachadi"],
  ["dish-vendakka-kichadi", "Pachadi (ladies finger).jpg", "vendakka-kichadi"],
  ["dish-kaya-varuthathu", "Raw banana fry.JPG", "kaya-varuthathu"],
  ["dish-naranga-achar", "Lemon Pickle in Oil.JPG", "naranga-achar"],
  ["dish-appam", "Appam (Kerala dish).jpg", "appam"],
  ["dish-kallappam", "Topdown shot of Kallappam with pork curry.jpg", "kallappam"],
  ["dish-idiyappam", "Idiyappam.jpg", "idiyappam"],
  ["dish-puttu", "Puttu (Rice Flour steamed cake).jpg", "puttu"],
  ["dish-gothambu-puttu", "Wheat Puttu - Kerala - IMG 20210331 085016.jpg", "gothambu-puttu"],
  ["dish-mutta-appam", "Appam with egg.jpg", "mutta-appam"],
  ["dish-pathiri", "Patthiri.jpg", "pathiri"],
  ["dish-kerala-parotta", "Kerala Porotta.jpg", "kerala-parotta"],
  ["dish-thalassery-chicken-biryani", "Prepared Thalassery Biriyani.jpg", "thalassery-chicken-biryani"],
  ["dish-ney-choru", "Ghee Rice and Beef Kondattam.jpg", "ney-choru"],
  ["dish-meen-biryani", "Fish Biriyani.jpg", "meen-biryani"],
  ["dish-chemmeen-biryani", "Prawn Biriyani.jpg", "chemmeen-biryani"],
  ["dish-irachi-pathiri", "Chicken pathiri.jpg", "irachi-pathiri"],
  ["dish-sambaram", "Sambaram picture.JPG", "sambaram"],
  ["dish-amritsari-kulcha", "Amritsari Kulcha at Monu Kulcha Hut.JPG", "amritsari-kulcha"],
  ["dish-chicken-patiala", "Chicken Patiala.JPG", "chicken-patiala"],
  ["dish-galouti-kebab", "Tunday Kebab, Lucknow (8716416557).jpg", "galouti-kebab"],
  ["dish-gushtaba", "Gushtaba.JPG", "gushtaba"],
  ["dish-kashmiri-dum-aloo", "Dum Aloo Kashmiri.jpg", "kashmiri-dum-aloo"],
  ["dish-kashmiri-pulao", "Kashmiri Pulav.JPG", "kashmiri-pulao"],
  ["dish-rasedaar-aloo", "Aloo Rassa.jpg", "rasedaar-aloo"],
  ["dish-rogan-josh-style", "Rogan Josh.JPG", "rogan-josh-style"],
  ["dish-shami-kebab", "Shami kebabs.jpg", "shami-kebab"],
  ["dish-sheermal-style", "Sheermal a sweet flatbread.jpg", "sheermal-style"],
  ["dish-vegetable-tehri", "Veg Tahiri.JPG", "vegetable-tehri"],
  ["dish-siddu", "Siddu Ghee.JPG", "siddu"],
  ["dish-kulle-chaat", "Kulle or Kuliye ki chaat.jpg", "kulle-chaat"],
  ["dish-khandvi", "Khandvi, Gujarati snack.jpg", "khandvi"],
  ["dish-vegetable-handvo", "Handvo Gujarati Food.jpg", "vegetable-handvo"],
  ["dish-undhiyu-style", "Unhala nu Undhiyu ne Jowar ni Bhakri.jpg", "undhiyu-style"],
  ["dish-sev-tameta", "Sev Tameta Nu Shaak.jpg", "sev-tameta"],
  ["dish-dal-dhokli", "Gujarati Daal-Dhokli.jpg", "dal-dhokli"],
  ["dish-anda-ghotala", "Anda Ghotala.JPG", "anda-ghotala"],
  ["dish-pithla", "Pithla Bhakri NMM Soc Thane Maharashtra 01.jpg", "pithla"],
  ["dish-bharli-vangi", "Stuffed Eggplant curry.jpg", "bharli-vangi"],
  ["dish-thalipeeth", "Thalipeeth - Maharashtra.jpg", "thalipeeth"],
  ["dish-kothimbir-vadi", "Kothimbir vadi.JPG", "kothimbir-vadi"],
  ["dish-rava-mackerel-fry", "Bangude Rava Fry.jpg", "rava-mackerel-fry"],
  ["dish-chicken-cafreal", "Chicken Cafreal-panji-goa-003.jpg", "chicken-cafreal"],
  ["dish-chicken-xacuti", "Chicken Xacuti.jpg", "chicken-xacuti"],
  ["dish-chicken-vindaloo", "Home Indian Cooking- Chicken Vindaloo, Spinach Saag.jpg", "chicken-vindaloo"],
  ["dish-dal-baati", "Dal-Bati-Churma.jpg", "dal-baati"],
  ["dish-gatte-ki-sabzi", "Besan Gatta curry01.jpg", "gatte-ki-sabzi"],
  ["dish-laal-maas-style", "Lal Maas.jpg", "laal-maas-style"],
  ["dish-bajra-roti", "Bajre ki roti.jpg", "bajra-roti"],
  ["dish-sindhi-kadhi", "Sindhi Kadhi.JPG", "sindhi-kadhi"],
  ["dish-sai-bhaji", "Sindhi Sai Bhaji.JPG", "sai-bhaji"],
  ["dish-dhansak-style", "Dhansak.JPG", "dhansak-style"],
  ["dish-shorshe-machh", "Hilsha fish in mustard paste.jpg", "shorshe-machh"],
  ["dish-chingri-malakari", "Prawn Malai Curry.jpg", "chingri-malakari"],
  ["dish-kosha-lamb-style", "Mutton Kosha.jpg", "kosha-lamb-style"],
  ["dish-aloo-posto", "Aloo Posto.jpg", "aloo-posto"],
  ["dish-shukto", "Shukto (তেতো শুক্তো).jpg", "shukto"],
  ["dish-begun-bhaja", "Begun Bhaja.jpg", "begun-bhaja"],
  ["dish-ghugni", "Ghugni image.jpg", "ghugni"],
  ["dish-macher-jhol", "Rui macher jhol with potato, cuisine of West Bengal 20200202124934.jpg", "macher-jhol"],
  ["dish-dimer-dalna", "Hasher Dimer Dalna Lokaahar Restaurant (14).jpg", "dimer-dalna"],
  ["dish-dalma", "Dalma (Odia vegetables and pulses curry).jpg", "dalma"],
  ["dish-pakhala-bhata", "Pakhala Bhata ପଖାଳ ଭାତ 03.jpg", "pakhala-bhata"],
  ["dish-santula", "Santula Odia Cuisine.jpg", "santula"],
  ["dish-masor-tenga", "Fish curry with starfruit.jpg", "masor-tenga"],
  ["dish-litti-chokha", "Litti Chokha.jpg", "litti-chokha"],
  ["dish-sattu-sharbat", "Sattu Ghol.jpg", "sattu-sharbat"],
  ["dish-champaran-lamb-style", "Champaran meat.jpg", "champaran-lamb-style"],
  ["dish-jadoh-style", "Jadoh (Meghalaya.JPG", "jadoh-style"],
  ["dish-thukpa-style", "Chicken Thukpa.jpg", "thukpa-style"],
  ["dish-chicken-momos", "Chicken Steamed Momos.jpg", "chicken-momos"],
  ["dish-chettinad-lamb-style", "Mutton Chettinad.jpg", "chettinad-lamb-style"],
  ["dish-kathirikai-kuzhambu", "Brinjal tamarind kuzhambu.JPG", "kathirikai-kuzhambu"],
  ["dish-mor-kuzhambu", "Butter milk kuzhambu aka Moru curry.jpg", "mor-kuzhambu"],
  ["dish-kuzhi-paniyaram", "Paniyaram from Tamil Nadu JEG4568.jpg", "kuzhi-paniyaram"],
  ["dish-meen-kuzhambu", "Sheela Meen Kuzhambu.JPG", "meen-kuzhambu"],
  ["dish-idli-podi-style", "Idli Podi.jpg", "idli-podi-style"],
  ["dish-bagara-rice", "Bagara Khana.jpg", "bagara-rice"],
  ["dish-mirchi-ka-salan", "Hyderabadi Hari Mirchi Ka Salan.JPG", "mirchi-ka-salan"],
  ["dish-andhra-kodi-kura", "Andhra kodi kura (chicken gravy).JPG", "andhra-kodi-kura"],
  ["dish-gutti-vankaya", "Gutti Vankaya from Andhra Pradesh.jpg", "gutti-vankaya"],
  ["dish-pesarattu", "Pesarattu with ginger pickel.JPG", "pesarattu"],
  ["dish-royyala-vepudu", "Pepper Prawn Fry-Nellore-Andhra Pradesh-DED 005.jpg", "royyala-vepudu"],
  ["dish-haleem-style", "Hyderabadi Mutton Haleem.jpg", "haleem-style"],
  ["dish-khatti-dal", "Hyderabadi Khatti Dal.JPG", "khatti-dal"],
  ["dish-chepala-pulusu", "Nellore Fish Pulusu.jpg", "chepala-pulusu"],
  ["dish-bisi-bele-bath", "Mysore style bisibele bath.jpg", "bisi-bele-bath"],
  ["dish-neer-dosa", "Neer Dosa( Neer Tellavu).jpg", "neer-dosa"],
  ["dish-kori-rotti-style", "Kori Roti Gassi.jpg", "kori-rotti-style"],
  ["dish-chicken-ghee-roast-style", "Chicken Ghee Roast.jpg", "chicken-ghee-roast-style"],
  ["dish-rava-idli", "Rava Idli (6005015965).jpg", "rava-idli"],
  ["dish-jolada-rotti", "ಜೋಳದ ರೊಟ್ಟಿ Jōḷada roṭṭi.jpg", "jolada-rotti"],
  ["dish-akki-rotti", "Akki roti.jpg", "akki-rotti"],
  ["dish-pineapple-gojju", "Pineapple (Ananas) Gojju.jpg", "pineapple-gojju"],
  ["dish-intl-chicken-fajitas", "Chicken fajitas - La Hacienda - Sarah Stierch.jpg", "intl-chicken-fajitas"],
  ["dish-intl-jerk-chicken", "Jerk chicken plate.jpg", "intl-jerk-chicken"],
  ["dish-intl-ginger-chicken-stir-fry", "Kai phat khing.jpg", "intl-ginger-chicken-stir-fry"],
  ["dish-intl-chicken-caesar-salad", "Caesar salad with chicken, homemade - Massachusetts.jpg", "intl-chicken-caesar-salad"],
  ["dish-intl-chicken-vegetable-soup", "Chicken Vegetable Soup (8731954951).jpg", "intl-chicken-vegetable-soup"],
  ["dish-intl-chicken-satay", "Chicken Satay With Peanut Sauce.jpg", "intl-chicken-satay"],
  ["dish-intl-chicken-schnitzel", "Classic chicken schnitzel - Schnitzel & Co. 2026-05-16.jpg", "intl-chicken-schnitzel"],
  ["dish-intl-roast-chicken-vegetables", "Butterfly chicken with roasted vegetables - Massachusetts.jpg", "intl-roast-chicken-vegetables"],
  ["dish-intl-chicken-parmigiana", "Chicken parmigiana.jpg", "intl-chicken-parmigiana"],
  ["dish-intl-thai-green-chicken-curry", "Thai green chicken curry and roti.jpg", "intl-thai-green-chicken-curry"],
  ["dish-intl-chicken-enchilada-bake", "Chicken Enchilada (15891630965).jpg", "intl-chicken-enchilada-bake"],
  ["dish-intl-greek-chicken-souvlaki", "Chicken souvlaki at Hellenic 2.jpg", "intl-greek-chicken-souvlaki"],
  ["dish-intl-turkey-meatballs", "Spaghetti and turkey meatballs.jpg", "intl-turkey-meatballs"],
  ["dish-intl-turkey-burgers", "Mar-a-Lago Turkey Burger (4330642195).jpg", "intl-turkey-burgers"],
  ["dish-intl-turkey-kidney-bean-chili", "Turkey Chili.jpg", "intl-turkey-kidney-bean-chili"],
  ["dish-intl-garlic-herb-turkey-breast", "Cooked turkey breast - November 2023 - Sarah Stierch.jpg", "intl-garlic-herb-turkey-breast"],
  ["dish-intl-lamb-kofta", "Dinner 30 07 2019 Lamb Koftas with salad, a sourdough and linseed wrap with onion & garlic dip (48162583727).jpg", "intl-lamb-kofta"],
  ["dish-intl-shepherds-pie", "Shepherds pie - The Kew Greenhouse Cafe 2025-05-14.jpg", "intl-shepherds-pie"],
  ["dish-intl-grilled-salmon", "2021-02-23 20 32 58 Herb-grilled salmon, asparagus and broccoli at the Olive Garden in Fair Lakes, Fairfax County, Virginia.jpg", "intl-grilled-salmon"],
  ["dish-intl-salmon-green-beans-almonds", "Salmon, green beans, bok choy, leafy veg, mushrooms, avocado, mashed potato, baby corn - Massachusetts.jpg", "intl-salmon-green-beans-almonds"],
  ["dish-intl-blackened-salmon", "Blackened Salmon 2.jpg", "intl-blackened-salmon"],
  ["dish-intl-tuna-white-bean-salad", "Insalata di Fagioli e Tonno – Bohnensalat mit Thunfisch (7327273414).jpg", "intl-tuna-white-bean-salad"],
  ["dish-intl-tuna-melt", "Tuna melt - Massachusetts.jpg", "intl-tuna-melt"],
  ["dish-intl-tuna-egg-salad", "Salad of greens, carrots, tuna, and hard-boiled eggs, with dressing of olive oil, vinegar, salt, and black pepper - Massachusetts.jpg", "intl-tuna-egg-salad"],
  ["dish-intl-sardines-on-flatbread", "Sardines, celery, cornichons, chili pepper, carrot, cucumber, mustard, curry powder, black pepper on rye toast.jpg", "intl-sardines-on-flatbread"],
  ["dish-intl-grilled-mackerel", "Grilled mackerel on a BBQ.jpg", "intl-grilled-mackerel"],
  ["dish-intl-cod-corn-chowder", "Cod Chowder.jpg", "intl-cod-corn-chowder"],
  ["dish-intl-blackened-tilapia", "Blackened tilapia with Cajun spices, lemon and lime juice.jpg", "intl-blackened-tilapia"],
  ["dish-intl-tilapia-tacos", "Fish tacos food cabbage tortillas.jpg", "intl-tilapia-tacos"],
  ["dish-intl-mediterranean-fish-stew", "Cruet de peix a la Marina.jpg", "intl-mediterranean-fish-stew"],
  ["dish-intl-shrimp-scampi", "Shrimp scampi food.jpg", "intl-shrimp-scampi"],
  ["dish-intl-garlic-shrimp-broccoli", "HK SWH 西灣河 Sai Wan Ho SKW 筲箕灣道 33 Shau Kei Wan Road shop 麗灣大廈 Lai Wan Building 海寶漁港 Ocean Treasure Seafood Restaurant diner food 西蘭花大蝦仁 Stir-fry broccoli with peeled shrimp March 2026 N13P 03.jpg", "intl-garlic-shrimp-broccoli"],
  ["dish-intl-shrimp-fajitas", "2019 Shrimp Fajita 1.jpg", "intl-shrimp-fajitas"],
  ["dish-intl-shrimp-coconut-curry", "Shrimp curry made with coconut milk.jpg", "intl-shrimp-coconut-curry"],
  ["dish-intl-shrimp-egg-fried-rice", "Shrimp Fried Rice (Taiwan).jpg", "intl-shrimp-egg-fried-rice"],
  ["dish-intl-mixed-seafood-stew", "Cioppino.jpg", "intl-mixed-seafood-stew"],
  ["dish-intl-shakshuka", "Shakshuka Dish.jpg", "intl-shakshuka"],
  ["dish-intl-tuscan-white-bean-soup", "Tuscan kale and white bean soup in personalized bowls with spoons on a decorative tree cross cut (16085794138).jpg", "intl-tuscan-white-bean-soup"],
  ["dish-intl-overnight-oats", "Protein overnight oats.jpg", "intl-overnight-oats"],
  ["dish-intl-tofu-scramble", "Tofu Scramble in New Orleans.jpg", "intl-tofu-scramble"],
  ["dish-intl-herb-grilled-chicken", "Roasted Chicken Dinner Plate, Broccoli, Demi Glace.jpg", "intl-herb-grilled-chicken"],
  ["dish-intl-lemon-garlic-chicken", "Chicken breast with lemon sauce (17238222455).jpg", "intl-lemon-garlic-chicken"],
  ["dish-intl-creamy-garlic-chicken", "Creamy Mushroom Chicken with Mojitos.jpg", "intl-creamy-garlic-chicken"],
  ["dish-intl-honey-garlic-salmon", "Salmon Dinner (Hey, Honey! Salmon).jpg", "intl-honey-garlic-salmon"],
  ["dish-intl-salmon-quinoa-bowl", "Grilled wild salmon with vegtable quinoa, blistered broccolini, maple soy caramel, and citrus pea shoot salad. - 34966483954.jpg", "intl-salmon-quinoa-bowl"],
  ["dish-intl-tuna-quinoa-salad", "Close up of Tuna and Quinoa (1717881489).jpg", "intl-tuna-quinoa-salad"],
  ["dish-intl-baked-cod-tomatoes", "Cod in tomato sauce (Oslo).jpg", "intl-baked-cod-tomatoes"],
  ["dish-intl-spanish-potato-tortilla", "Tortilla Española (Spanish Potato Omelet) (27362763041).jpg", "intl-spanish-potato-tortilla"],
  ["dish-intl-menemen", "Turkish Menemen With White Cheese 11.11.2026.jpg", "intl-menemen"],
  ["dish-intl-tofu-coconut-curry", "Tofu curry with rice.jpg", "intl-tofu-coconut-curry"],
  ["dish-intl-tempeh-green-bean-stir-fry", "Sautéed Tempeh cropped.jpg", "intl-tempeh-green-bean-stir-fry"],
  ["dish-intl-mapo-style-tofu", "Authentic Mapo Tofu.jpg", "intl-mapo-style-tofu"],
  ["dish-intl-tempeh-burger-patties", "Potato and Marinated Tempeh Patties, New Orleans.jpg", "intl-tempeh-burger-patties"],
  ["dish-intl-pad-thai-style-tofu", "Pad Thai tofu and veg - Mint Thai AUD9.jpg", "intl-pad-thai-style-tofu"],
  ["dish-intl-chickpea-spinach-stew", "GarbanzosConEspinacas.jpg", "intl-chickpea-spinach-stew"],
  ["dish-intl-mediterranean-lentil-soup", "Red lentil soup bowl.jpg", "intl-mediterranean-lentil-soup"],
  ["dish-intl-black-eyed-pea-stew", "Black eyed Peas Curry and Pulav.JPG", "intl-black-eyed-pea-stew"],
  ["dish-intl-falafel-plate", "Falafel (49728839526).jpg", "intl-falafel-plate"],
  ["dish-intl-quinoa-black-bean-bowl", "Quinoa, Black Bean, and Mango Salad.png", "intl-quinoa-black-bean-bowl"],
  ["dish-intl-cottage-cheese-power-bowl", "Liat Portal for Foodie Disorder - Scrambled eggs with spinach avocado and vegetables.jpg", "intl-cottage-cheese-power-bowl"],
  ["dish-intl-broccoli-cheddar-soup", "Broccoli cheese soup 2.jpg", "intl-broccoli-cheddar-soup"],
  ["dish-intl-cauliflower-cheese-bake", "Cauliflower Au Gratin (4527747147).jpg", "intl-cauliflower-cheese-bake"],
  ["dish-intl-chicken-meatballs", "Keto Chicken Meatballs.png", "intl-chicken-meatballs"],
  ["dish-intl-chicken-pot-pie-stew", "Dumplings and chicken stew for lunch at Selebi Phikwe.jpg", "intl-chicken-pot-pie-stew"],
  ["dish-intl-lentil-walnut-meatballs", "Lentil meatballs.jpg", "intl-lentil-walnut-meatballs"],
  ["dish-intl-quinoa-chickpea-burgers", "Quinoa burger with sweet potato fries.jpg", "intl-quinoa-chickpea-burgers"],
  ["dish-intl-veggie-omelette", "Omlette-fold.jpg", "intl-veggie-omelette"],
  ["dish-intl-cottage-spinach-omelette", "Spinach omelette (3278835124).jpg", "intl-cottage-spinach-omelette"],
  ["dish-intl-cheese-scrambled-eggs", "Eggs with cheese, mushrooms, and basil.jpg", "intl-cheese-scrambled-eggs"],
  ["dish-intl-french-cheese-omelette", "Omelette Mont Saint-Michel.jpg", "intl-french-cheese-omelette"],
  ["dish-intl-cottage-egg-flatbread", "Scandinavian Kitchen, Fitzrovia, London (6346476387).jpg", "intl-cottage-egg-flatbread"],
  ["dish-intl-socca-egg-spinach", "Farinata (spinach base, roasted courgette & superstraccia) - Caccia and Tails 2025-04-24.jpg", "intl-socca-egg-spinach"],
  ["dish-intl-salmon-spinach-omelette", "Salmon omelette with potato, Florence, 82nd St.jpg", "intl-salmon-spinach-omelette"],
  ["dish-intl-egg-avocado-flatbread", "Avocado toast with eggs (28508171495).jpg", "intl-egg-avocado-flatbread"],
  ["dish-intl-breakfast-sandwich", "Egg and cheese breakfast sandwich.jpg", "intl-breakfast-sandwich"],
  ["dish-intl-salmon-egg-breakfast", "Irish Breakfast Salmon Scrambled Eggs.JPG", "intl-salmon-egg-breakfast"],
  ["dish-intl-protein-oatmeal", "Oatmeal porridge 1-minute with additional ingredients.jpg", "intl-protein-oatmeal"],
  ["dish-intl-oat-cottage-pancakes", "Cottage cheese pancakes with berries (KETO, LCHF, Low Carb, Gluten free, FIT) - 52774785114.jpg", "intl-oat-cottage-pancakes"],
  ["dish-avgolemono", "Avgolemono - Sarah Stierch.jpg", "avgolemono"],
  ["dish-chicken-souvlaki", "Chicken souvlaki at Hellenic 2.jpg", "chicken-souvlaki"],
  ["dish-grilled-sardines-lemon", "Sardines grilled.jpg", "grilled-sardines-lemon"],
  ["dish-fakes-lentil-soup", "Bowl of lentil soup with green and red lentils.jpg", "fakes-lentil-soup"],
  ["dish-fasolada", "Fasolada, 2006.jpg", "fasolada"],
  ["dish-gigantes-plaki", "Gigandes plaki.jpg", "gigantes-plaki"],
  ["dish-strapatsada-style-eggs", "Strapatsada.jpg", "strapatsada-style-eggs"],
  ["dish-greek-yogurt-power-bowl", "Flickr - cyclonebill - Græsk yoghurt med honning og valnødder.jpg", "greek-yogurt-power-bowl"],
  ["dish-mavromatika-fasolia", "Black eyed Peas Curry and Pulav.JPG", "mavromatika-fasolia"],
  ["dish-chicken-piccata", "Chicken piccata.jpg", "chicken-piccata"],
  ["dish-chicken-cacciatore", "Chicken cacciatore.jpg", "chicken-cacciatore"],
  ["dish-polpette-tacchino", "Polpette Al Sugo - Nanninella.jpg", "polpette-tacchino"],
  ["dish-risotto-salmone", "Risotto with salmon pepper & beer (6052247597).jpg", "risotto-salmone"],
  ["dish-frittata-spinach-mozzarella", "Frittata2.jpg", "frittata-spinach-mozzarella"],
  ["dish-frittata-patate", "Frittata di patate.jpg", "frittata-patate"],
  ["dish-ribollita", "Ribollita toscana.JPG", "ribollita"],
  ["dish-zuppa-lenticchie", "Lentil soup.JPG", "zuppa-lenticchie"],
  ["dish-stracciatella-soup", "Stracciatella soup example.jpg", "stracciatella-soup"],
  ["dish-gambas-ajillo", "Gambas Al Ajillo (Spanish Garlic Shrimp).jpg", "gambas-ajillo"],
  ["dish-cod-tomato-spanish", "Bacalao con salsa de tomate (España).jpg", "cod-tomato-spanish"],
  ["dish-lentejas-estofadas", "Lentejas 04.JPG", "lentejas-estofadas"],
  ["dish-garbanzos-espinacas", "GarbanzosConEspinacas.jpg", "garbanzos-espinacas"],
  ["dish-huevos-flamenca", "Huevos flamenquina o huevo al plato.jpg", "huevos-flamenca"],
  ["dish-atun-encebollado", "12-atun-encebollado1.jpg", "atun-encebollado"],
  ["dish-garbanzos-gambas", "Garbanzos con gambas.jpeg", "garbanzos-gambas"],
  ["dish-revuelto-setas", "Revuelto de huevo con setas-01.JPG", "revuelto-setas"],
  ["dish-pisto-huevo", "Pisto con huevos.jpg", "pisto-huevo"],
  ["dish-merluza-salsa-verde", "Merluza (salsa verde).jpg", "merluza-salsa-verde"],
  ["dish-pollo-chilindron", "Chilindrón - Pollo.jpg", "pollo-chilindron"],
  ["dish-poulet-basquaise", "Poulet basquaise.jpg", "poulet-basquaise"],
  ["dish-bouillabaisse-style", "Bouillabaisse SAM 5967.JPG", "bouillabaisse-style"],
  ["dish-chicken-fricassee", "Chicken fricassee-01.jpg", "chicken-fricassee"],
  ["dish-turkey-blanquette", "Blanquette seule.jpg", "turkey-blanquette"],
  ["dish-oeufs-cocotte", "Oeuf cocotte.jpg", "oeufs-cocotte"],
  ["dish-omelette-mushroom-mozzarella", "Cheese & Mushroom Omelette - The Bystander Cafe 2023-08-07.jpg", "omelette-mushroom-mozzarella"],
  ["dish-quiche-epinards", "Spinach quiche (4333163002).jpg", "quiche-epinards"],
  ["dish-brandade-style", "Brandade de morue.JPG", "brandade-style"],
  ["dish-soupe-de-poisson", "Soupe de poissons.jpg", "soupe-de-poisson"],
  ["dish-haricots-bretonne", "00956 Polish baked beans - a la bretonne -.png", "haricots-bretonne"],
  ["dish-poulet-chasseur", "Hunter's chicken (2).jpg", "poulet-chasseur"],
  ["dish-mercimek-corbasi", "Mercimek çorbası.jpg", "mercimek-corbasi"],
  ["dish-tavuk-sis", "Tavuk shish.jpg", "tavuk-sis"],
  ["dish-kuzu-kofte", "Turkish koftes.jpg", "kuzu-kofte"],
  ["dish-karniyarik", "Karnıyarık.JPG", "karniyarik"],
  ["dish-hunkar-begendi", "Hunkarbegendi.jpg", "hunkar-begendi"],
  ["dish-menemen", "Sahanda menemen in Ankara.jpg", "menemen"],
  ["dish-cilbir", "Чилбир јајца.jpg", "cilbir"],
  ["dish-karides-guvec", "Kiremitte karides.jpg", "karides-guvec"],
  ["dish-nohut-yemegi", "Nohut yahnisi (etsiz).jpg", "nohut-yemegi"],
  ["dish-kuru-fasulye", "Kuru fasulye (without meat).jpg", "kuru-fasulye"],
  ["dish-sardalya-tava", "Sardalya tava.jpg", "sardalya-tava"],
  ["dish-etli-nohut", "Nohut yahni.jpg", "etli-nohut"],
  ["dish-hummus-meal", "Lebanese style hummus.jpg", "hummus-meal"],
  ["dish-falafel-baked", "Falafel 1.JPG", "falafel-baked"],
  ["dish-shish-tawook", "Shish Taouk.JPG", "shish-tawook"],
  ["dish-chicken-shawarma-plate", "Chicken Shawarma Platter - Lavash 2025-02-10.jpg", "chicken-shawarma-plate"],
  ["dish-fatteh-hummus", "Fatethomos.JPG", "fatteh-hummus"],
  ["dish-mujadara", "Mujaddara.jpg", "mujadara"],
  ["dish-sayadieh", "Fish Sayadieh.jpg", "sayadieh"],
  ["dish-foul-style-beans", "Ful medames (arabic meal).jpg", "foul-style-beans"],
  ["dish-fatteh-batenjan", "فتة باذنجان.jpg", "fatteh-batenjan"],
  ["dish-kefta-mkaouara", "Tajine kefta (8348397161).jpg", "kefta-mkaouara"],
  ["dish-harira", "Harira.JPG", "harira"],
  ["dish-rfissa-style", "Rfissa marocaine.jpg", "rfissa-style"],
  ["dish-sardine-kefta", "Boulettes de sardine, Tunisie, avril 2014.jpg", "sardine-kefta"],
  ["dish-jp-salmon-shioyaki", "Grilled salmon at French restaurant in Tokyo.jpg", "jp-salmon-shioyaki"],
  ["dish-jp-mackerel-shioyaki", "Koshida-no-Saba 02.jpg", "jp-mackerel-shioyaki"],
  ["dish-jp-grilled-sardines", "Grilled sardines.jpg", "jp-grilled-sardines"],
  ["dish-jp-tamagoyaki", "Tamago yaki, Kappo Uosen, Nagaoka 01.jpg", "jp-tamagoyaki"],
  ["dish-jp-goya-champuru", "Goya Champuru 1.jpg", "jp-goya-champuru"],
  ["dish-jp-sesame-tofu-steak", "豆腐ステーキ (10725311003).jpg", "jp-sesame-tofu-steak"],
  ["dish-jp-japanese-chicken-curry", "Japanese style chicken curry with rice of Nakau.JPG", "jp-japanese-chicken-curry"],
  ["dish-jp-turkey-hambagu", "Hamburg steak1.jpg", "jp-turkey-hambagu"],
  ["dish-jp-ginger-chicken", "Chicken ginger sautee (41498537392).jpg", "jp-ginger-chicken"],
  ["dish-jp-eggplant-tofu-stirfry", "Pud Tofu Makhru - Little Thai Cafe.jpg", "jp-eggplant-tofu-stirfry"],
  ["dish-jp-breakfast-plate", "Japanese breakfast at a hotel by Jael in Kyoto.jpg", "jp-breakfast-plate"],
  ["dish-kr-chicken-bibimbap", "Chicken Bibimbob from Mr. Kimbob (2025-02-02).jpg", "kr-chicken-bibimbap"],
  ["dish-kr-tofu-bibimbap", "Tofu Bi Bim Bap - Korpan.jpg", "kr-tofu-bibimbap"],
  ["dish-kr-sundubu-jjigae", "Korean stew-Sundubu jjigae-05.jpg", "kr-sundubu-jjigae"],
  ["dish-kr-gyeran-mari", "Gyeran-mari 1.jpg", "kr-gyeran-mari"],
  ["dish-kr-dak-gomtang", "프레퍼스 다이어트 푸드 성신여대점 닭가슴살 곰탕&고추지.jpg", "kr-dak-gomtang"],
  ["dish-kr-haemul-pajeon", "Korean pancake-Haemul pajeon-03.jpg", "kr-haemul-pajeon"],
  ["dish-kr-dak-juk", "Dakjuk.jpg", "kr-dak-juk"],
  ["dish-kr-kong-guksu", "Kong-guksu made from Paju Jangdan Beans.jpg", "kr-kong-guksu"],
  ["dish-kr-steamed-egg-shrimp", "Gyeran-jjim.jpg", "kr-steamed-egg-shrimp"],
  ["dish-kr-spicy-chicken-stew", "Korean.food-Dakbokemtang-01.jpg", "kr-spicy-chicken-stew"],
  ["dish-kr-egg-fried-rice", "Korean style fried rice.jpg", "kr-egg-fried-rice"],
  ["dish-cn-white-cut-chicken", "White cut chicken at Xiaoshaoxing, Shanghai (20191113183809).jpg", "cn-white-cut-chicken"],
  ["dish-cn-tomato-egg-stirfry", "Hunan cuisine, stir-fried tomato with eggs.jpg", "cn-tomato-egg-stirfry"],
  ["dish-cn-hot-sour-soup", "Hot-and-Sour-Soup-Bowl.jpg", "cn-hot-sour-soup"],
  ["dish-cn-prawn-wontons", "Shrimp wonton noodle soup.jpg", "cn-prawn-wontons"],
  ["dish-cn-salt-pepper-shrimp", "Pepper salt prawns.jpeg", "cn-salt-pepper-shrimp"],
  ["dish-cn-home-style-tofu", "Hunan cuisine, Fried Tofu, Home Style.jpg", "cn-home-style-tofu"],
  ["dish-cn-steamed-egg-prawns", "Cuisine of Guangdong 6.jpg", "cn-steamed-egg-prawns"],
  ["dish-cn-hainanese-chicken-rice", "Hainanese chicken rice.jpg", "cn-hainanese-chicken-rice"],
  ["dish-cn-moo-goo-gai-pan", "Plate of moo goo gai pan.jpg", "cn-moo-goo-gai-pan"],
  ["dish-cn-egg-foo-young", "Egg Foo Young in Hong Kong.jpg", "cn-egg-foo-young"],
  ["dish-cn-gong-bao-chicken", "Kung Pao Chicken at Yujiayan Restaurant (20230510123120).jpg", "cn-gong-bao-chicken"],
  ["dish-cn-sesame-chilli-noodles", "Noodles With Sesame Sauce (麻醬麵).jpg", "cn-sesame-chilli-noodles"],
  ["dish-cn-chicken-congee", "Chicken congee at Psar Chaa Market in Siem Reap, Cambodia.jpg", "cn-chicken-congee"],
  ["dish-th-pad-thai", "Shrimp Pad Thai 2026-09-11 classic 01.jpg", "th-pad-thai"],
  ["dish-th-chicken-cashew", "Kai phat met mamuang himaphan 2.jpg", "th-chicken-cashew"],
  ["dish-th-chicken-larb", "Larb Gai with Rice - Mint Thai AUD12 (5799807438).jpg", "th-chicken-larb"],
  ["dish-th-gai-yang", "Gai yang Khuukam.JPG", "th-gai-yang"],
  ["dish-th-massaman-chicken", "Kaeng matsaman kai.JPG", "th-massaman-chicken"],
  ["dish-th-coconut-chicken-curry", "Kaeng kari kai.JPG", "th-coconut-chicken-curry"],
  ["dish-th-fish-cakes", "Thai Fish Cake.jpg", "th-fish-cakes"],
  ["dish-th-fried-fish-tamarind", "Snapper with Tamarindsauce (3677835199).jpg", "th-fried-fish-tamarind"],
  ["dish-th-shrimp-fried-rice", "DFC 5103 Shrimp fried rice served with lime sliced cucumber and a side of spicy chili sauce - a classic Thai comfort dish from Pattaya.jpg", "th-shrimp-fried-rice"],
  ["dish-th-kai-jeow", "Khai Jiao.jpg", "th-kai-jeow"],
  ["dish-th-sour-fish-curry", "Gaeng Som Pla Or Thai sour fish soup.jpg", "th-sour-fish-curry"],
  ["dish-th-pineapple-fried-rice", "Thai-style Fried Rice in Pineapple.jpg", "th-pineapple-fried-rice"],
  ["dish-th-pad-prik-king", "Pat Prik Gai, Sea Thai Restaurant, Ballys, Las Vegas, NV.jpg", "th-pad-prik-king"],
  ["dish-vn-pho-ga", "Pho ga (noodle soup with chicken), Hanoi (6945821707).jpg", "vn-pho-ga"],
  ["dish-vn-banh-xeo", "Crispy Vietnamese Pancake (Banh Xeo) - Xin Chao, Eastbourne 2026-08-14 (1).jpg", "vn-banh-xeo"],
  ["dish-vn-canh-chua", "Canh chua cá lóc ở Thủy Trúc Quán, đường Nguyễn Nhữ Lãm (3).jpg", "vn-canh-chua"],
  ["dish-vn-banh-cuon", "Banh Cuon 3.jpg", "vn-banh-cuon"],
  ["dish-id-chicken-rendang", "RENDANG AYAM.jpg", "id-chicken-rendang"],
  ["dish-id-nasi-lemak", "Nasi Lemak with Fried Chicken - Village Park Restaurant (4589845661).jpg", "id-nasi-lemak"],
  ["dish-id-gado-gado", "Gado gado jakarta.jpg", "id-gado-gado"],
  ["dish-id-soto-ayam", "Soto Ayam home-made.JPG", "id-soto-ayam"],
  ["dish-id-bakso-ayam", "Bakso Indonesian Meatball Soup from Solo.jpg", "id-bakso-ayam"],
  ["dish-id-tempeh-sambal", "Sambal goreng tempe.JPG", "id-tempeh-sambal"],
  ["dish-id-ikan-bakar", "Ikan Bakar 3.jpg", "id-ikan-bakar"],
  ["dish-id-sayur-lodeh", "Sayur lodeh.JPG", "id-sayur-lodeh"],
  ["dish-id-opor-ayam", "Opor Ayam Telur Pindang.JPG", "id-opor-ayam"],
  ["dish-id-nasi-goreng", "Nasi Goreng Udang Istimewa.JPG", "id-nasi-goreng"],
  ["dish-id-sambal-telur", "Sambal Tumis Telur.jpg", "id-sambal-telur"],
  ["dish-id-mie-goreng", "Mie Goreng in Bali.jpg", "id-mie-goreng"],
  ["dish-us-turkey-chilli", "Chili con carne (4431800858).jpg", "us-turkey-chilli"],
  ["dish-us-salmon-cakes", "Salmon cakes bento (5012941523).jpg", "us-salmon-cakes"],
  ["dish-us-yogurt-tuna-salad", "NorthOntarioMethodistChurchBazaarLunch.jpg", "us-yogurt-tuna-salad"],
  ["dish-us-breakfast-burrito", "Breakfast burrito (cropped).jpg", "us-breakfast-burrito"],
  ["dish-us-turkey-burgers", "Turkey burger with baked beans and potato salad.jpg", "us-turkey-burgers"],
  ["dish-us-chicken-pot-pie", "Chicken Pot Pie, cut open.jpg", "us-chicken-pot-pie"],
  ["dish-us-turkey-meatloaf", "Turkey Meatloaf.JPG", "us-turkey-meatloaf"],
  ["dish-us-shrimp-grits", "Shrimp & Grits at Patois, Uptown New Orleans.jpg", "us-shrimp-grits"],
  ["dish-us-jambalaya", "Jambalaya on plate.jpg", "us-jambalaya"],
  ["dish-us-chicken-gumbo", "Gumbo - Kate 2012.jpg", "us-chicken-gumbo"],
  ["dish-us-eggs-royale", "Eggs Royale.jpg", "us-eggs-royale"],
  ["dish-us-tuna-noodle-casserole", "Tuna Casserole2.jpg", "us-tuna-noodle-casserole"],
  ["dish-us-chicken-dumplings", "ChickenDumplings.jpg", "us-chicken-dumplings"],
  ["dish-us-denver-omelette", "Denver omelette.jpg", "us-denver-omelette"],
  ["dish-mx-chicken-tinga", "Tinga de pollo.JPG", "mx-chicken-tinga"],
  ["dish-mx-chicken-burrito-bowl", "Grilled Chicken Burrito Bowl 2 (28365029553).jpg", "mx-chicken-burrito-bowl"],
  ["dish-mx-huevos-rancheros", "Ela huevos rancheros.jpg", "mx-huevos-rancheros"],
  ["dish-mx-chilaquiles", "Portada-chilaquiles-rojos.jpg", "mx-chilaquiles"],
  ["dish-mx-chicken-enchiladas", "Enchiladas Desmenuzadas.jpg", "mx-chicken-enchiladas"],
  ["dish-mx-chicken-quesadillas", "Chicken quesadilla.jpg", "mx-chicken-quesadillas"],
  ["dish-mx-bean-cheese-burritos", "Bean and cheese burrito.jpg", "mx-bean-cheese-burritos"],
  ["dish-mx-pollo-guisado", "\"Rostit\",ajadas de pollo guisado con cebolla.jpg", "mx-pollo-guisado"],
  ["dish-mx-turkey-picadillo", "Picadillo and rice.jpg", "mx-turkey-picadillo"],
  ["dish-mx-shrimp-ceviche", "Ceviche de camarón El Peñol.jpg", "mx-shrimp-ceviche"],
  ["dish-mx-aguachile", "Aguachile de camarón, Sonora, México.jpg", "mx-aguachile"],
  ["dish-mx-turkey-empanadas", "Empanada de pollo El Bosque Yokohama 02.jpg", "mx-turkey-empanadas"],
  ["dish-mx-tamal-cazuela", "Tamal de cazuela.jpg", "mx-tamal-cazuela"],
  ["dish-mx-sopa-de-lima", "Sopa de lima.jpg", "mx-sopa-de-lima"],
  ["dish-mx-gallo-pinto", "CRI 07 2018 0120.jpg", "mx-gallo-pinto"],
  ["dish-mx-arepas-reina-pepiada", "Arepa-reina-pepiada-arepasdelgringo.jpg", "mx-arepas-reina-pepiada"],
  ["dish-mx-chicken-pozole", "Pozole blanco estilo Guerrero.jpg", "mx-chicken-pozole"],
  ["dish-pe-aji-de-gallina", "Ají de gallina.jpg", "pe-aji-de-gallina"],
  ["dish-pe-arroz-chaufa", "Arroz chaufa simple.JPG", "pe-arroz-chaufa"],
  ["dish-pe-seco-de-pollo", "Seco de pollo.jpg", "pe-seco-de-pollo"],
  ["dish-br-moqueca", "Moqueca- Ilha de Maré. Foto Tatiana Azeviche Setur (31969364150).jpg", "br-moqueca"],
  ["dish-malvani-chicken-curry", "Chicken preparation in Malvani style.jpg", "malvani-chicken-curry"],
  ["dish-poricha-pathiri", "Neypathiri.jpg", "poricha-pathiri"],
  ["dish-prawn-balchao-style", "Prawns Balchao.jpg", "prawn-balchao-style"],
  ["dish-cherupayar-curry", "Puttu made with Chembavari rice and green gram gravy.jpg", "cherupayar-curry"],
  ["dish-ammini-kozhukatta", "Mani Kozhukattai.jpg", "ammini-kozhukatta"],
  ["dish-urulakizhangu-mezhukkupuratti", "Potato mezhukkupuratty.jpg", "urulakizhangu-mezhukkupuratti"],
  ["dish-chana-madra", "White Chana Madra.jpg", "chana-madra"],
  ["dish-urulakizhangu-curry", "Ishtu Potato Stew (15728955899).jpg", "urulakizhangu-curry"],
  ["dish-muringa-ila-thoran", "Murungakai Keerai Poriyal.jpg", "muringa-ila-thoran"],
  ["dish-gb-ploughmans-style", "Covington Tea Ploughmans Lunch.jpg", "gb-ploughmans-style"],
  ["dish-jm-run-down-style", "Run down (stew).jpg", "jm-run-down-style"],
  ["dish-za-bunny-chow-style", "Bunny Chow with Lamb & Potato - African Chow 2023-07-27.jpg", "za-bunny-chow-style"],
  ["dish-sn-yassa", "Poulet yassa 01.jpg", "sn-yassa"],
  ["dish-de-huhnerfrikassee", "Hühnerfrikassee in Topf 2.jpg", "de-huhnerfrikassee"],
  ["dish-blk-cevapi-style", "Cevapcici Bosnia (10675837796).jpg", "blk-cevapi-style"],
  ["dish-uz-lagman-style", "Lagman Moscow 2023.jpg", "uz-lagman-style"],
  ["dish-se-janssons-style", "Janssons frestelse.jpg", "se-janssons-style"],
  ["dish-jm-stew-peas-style", "Jamaican stew peas.jpg", "jm-stew-peas-style"],
  ["dish-at-spinat-eier", "Spinat mit Spiegelei (51667939418).jpg", "at-spinat-eier"],
  ["dish-ar-parrilla-style", "Pollo a la parrilla asado con leña de anchico en Capioví, Misiones, Argentina.jpg", "ar-parrilla-style"],
  ["dish-ve-cachapas-style", "Cachapa con queso rallado.jpg", "ve-cachapas-style"],
  ["dish-hu-lecso", "Tojásos lecsó.jpg", "hu-lecso"],
  ["dish-fi-lohikeitto", "Lohikeitto dish.jpg", "fi-lohikeitto"],
  ["dish-cu-black-bean-soup", "Black bean soup.jpg", "cu-black-bean-soup"],
  ["dish-gb-coronation-chicken", "Coronation Chicken.jpg", "gb-coronation-chicken"],
  ["dish-et-chicken-tibs", "Siga Tibs.jpg", "et-tibs-style"],
  ["dish-am-khorovats-style", "Khorovats in Gyumri.jpg", "am-khorovats-style"],
  ["dish-se-kottbullar-style", "Köttbullar at IKEA Beijing Xihongmen Store (20190917183058).jpg", "se-kottbullar-style"],
  ["dish-gh-jollof", "Jollof rice with boiled egg and fried chicken.jpg", "ng-jollof-chicken"],
  ["dish-hu-gulyas-style", "02021 1020 (2) Goulash soup of Poland.jpg", "hu-gulyas-style"],
  ["dish-fi-kaalilaatikko-style", "Cabbage casserole or kaalilaatikko.jpg", "fi-kaalilaatikko-style"],
  ["dish-gh-red-red", "Gari and Beans with Red Red and Eg.jpg", "gh-red-red"],
  ["dish-no-lapskaus-style", "Lobscouse, Lobby, Scouse.jpg", "no-lapskaus-style"],
  ["dish-ke-pilau", "Pilau Food in Kenya.jpg", "ke-pilau"],
  ["dish-gb-potted-shrimp-style", "Morecambe potted shrimps July 25.jpg", "gb-potted-shrimp-style"],
  ["dish-ge-chakhokhbili", "Chakhokhbili Closeup.jpg", "ge-chakhokhbili"],
  ["dish-gb-fish-chips-style", "Fish and chips plate with peas.jpg", "gb-fish-chips-style"],
  ["dish-ge-shkmeruli", "Shkmeruli al Batumi València.jpg", "ge-shkmeruli"],
  ["dish-co-changua", "Changua Soup.jpg", "co-changua"],
  ["dish-uz-samsa", "Ouzbékistan-Samsas.jpg", "uz-samsa"],
  ["dish-no-sodd-style", "Sodd, Norwegian traditional food.jpg", "no-sodd-style"],
  ["dish-cl-charquican-style", "Charquican.jpg", "cl-charquican-style"],
  ["dish-jm-escovitch-fish", "Escovitch fish, fried plaintains, and vegetables on top of rice.jpg", "jm-escovitch-fish"],
  ["dish-de-linsensuppe", "20221217 lentil soup Katowice Panewniki.jpg", "de-linsensuppe"],
  ["dish-hu-babgulyas-style", "2013-06-22 19-12-22 WMF Dinner Budapest Bean Goulash 095.jpg", "hu-babgulyas-style"],
  ["dish-dk-smorrebrod", "Flickr - cyclonebill - Rejemad.jpg", "dk-smorrebrod"],
  ["dish-tt-fish-bake-style", "Bake and Shark with hot sauce and cabbage Natalie's famous Bake and Shark Maracas Bay Trinidad.jpg", "tt-fish-bake-style"],
  ["dish-pl-krupnik", "Zupa krupnik w Poznaniu - listopad 2018.jpg", "pl-krupnik"],
  ["dish-blk-prebranac", "Zapečen pasulj prebranac na slavsku trpezu u Srbiji.jpg", "blk-prebranac"],
  ["dish-pl-kotlety-mielone", "2023 Kotlety mielone.jpg", "pl-kotlety-mielone"],
  ["dish-cl-cazuela", "Cazuela de pollo.jpg", "cl-cazuela"],
  ["dish-gh-waakye", "Waakye with kelewele, spaghetti, salad, stew and shito.jpg", "gh-waakye-style"],
  ["dish-et-doro-wat", "Injera and doro wat.jpg", "et-doro-wat-style"],
  ["dish-tt-pelau", "MISC Pelau.jpg", "tt-pelau"],
  ["dish-blk-punjene-paprike", "Stuffed paprikas (Hercegovacke Punjene paprike).JPG", "blk-punjene-paprike"],
  ["dish-am-lahmacun-style", "Lahmacun.jpg", "am-lahmacun-style"],
  ["dish-ng-moi-moi", "Moi-moi with stew.jpg", "ng-moi-moi-egg"],
  ["dish-gb-kedgeree", "Kedgeree.jpg", "gb-kedgeree"],
  ["dish-ge-kharcho-style", "Kharcho meat soup.jpg", "ge-kharcho-style"],
  ["dish-kz-beshbarmak-style", "Beshbarmak photo.jpg", "kz-beshbarmak-style"],
  ["dish-de-konigsberger-klopse-style", "Königsberger Klopse Ketzin An der Fähre.jpg", "de-konigsberger-klopse-style"],
  ["dish-am-harisa-style", "Armenian Harisa.JPG", "am-harisa-style"],
  ["dish-gb-lancashire-hotpot-style", "Lancashire hotpot.jpg", "gb-lancashire-hotpot-style"],
  ["dish-zw-chicken-sadza-style", "Nyama nesadza.jpg", "zw-chicken-sadza-style"],
  ["dish-gh-groundnut-stew", "African Peanut Soup - 50909484748.jpg", "gh-groundnut-stew"],
  ["dish-ie-boxty-style", "Ansolas boxty 2.jpg", "ie-boxty-style"],
  ["dish-gb-mulligatawny-style", "Selfmade Mulligatawny with Chicken (Nov. 2008).jpg", "gb-mulligatawny-style"],
  ["dish-blk-raznjici", "Pilecin raznjici New (16456582880).jpg", "blk-raznjici"],
  ["dish-se-laxagg", "Hot smoked Salmon scrambled eggs & dill on sourdough - Malt Cafe 2026-03-23.jpg", "se-laxagg"],
  ["dish-ge-lobio", "Lobio with nuts.jpg", "ge-lobio"],
  ["dish-ar-pollo-crema", "Chicken fricassee-01.jpg", "ar-pollo-crema"],
  ["dish-cl-pastel-choclo-style", "Pastel de choclo casero.jpg", "cl-pastel-choclo-style"],
  ["dish-co-ajiaco-style", "Ajiaco-santafereño.colombia.jpg", "co-ajiaco-style"],
  ["dish-gb-chicken-mushroom-pie", "Chicken Pie.JPG", "gb-chicken-mushroom-pie"],
  ["dish-gb-cullen-skink-style", "Cullen Skink.JPG", "gb-cullen-skink-style"],
  ["dish-ie-seafood-chowder", "Seafood chowder with pieces of fish.JPG", "ie-seafood-chowder"],
  ["dish-se-sjomansbiff-style", "Swedish sjomansbiff.jpeg", "se-sjomansbiff-style"],
  ["dish-ve-perico", "Huevos pericos.jpg", "ve-perico"],
  ["dish-gb-scotch-eggs-style", "Texas folklife festival scotch 2013.jpg", "gb-scotch-eggs-style"],
  ["dish-pl-pierogi-ruskie-style", "Food in Lichen Stary (pierogi ruskie, dumplings).jpg", "pl-pierogi-ruskie-style"],
  ["dish-am-spas-style", "Armenian Spas Soup.jpg", "am-spas-style"],
  ["dish-ar-milanesa-style", "Milanesa.jpg", "ar-milanesa-style"],
  ["dish-uz-moshkichiri", "Moshkichra.jpg", "uz-moshkichiri"],
  ["dish-cu-moros", "Arroz Congrí.jpg", "cu-moros"],
  ["dish-ke-githeri", "Githeri Meal.jpg", "ke-githeri"],
  ["dish-kz-kespe-style", "Bowl of kesme 2.jpg", "kz-kespe-style"],
  ["dish-ng-egusi-style", "Pot of Egusi soup.jpg", "ng-egusi-style"],
  ["dish-uz-manti", "Manti 1.jpg", "uz-manti"],
  ["dish-cz-cesnecka", "Česnečka.jpeg", "cz-cesnecka"],
  ["dish-at-eiernockerl", "Eiernockerl.JPG", "at-eiernockerl"],
  ["dish-uz-plov", "Pilaf with chicken.jpg", "uz-plov"],
  ["dish-pl-zurek-style", "01144 Sanok-style Sour rye soups, 2011.jpg", "pl-zurek-style"],
  ["dish-no-fiskesuppe", "Kremowa zupa rybna Egona w Oslo.jpg", "no-fiskesuppe"],
  ["dish-gb-welsh-rarebit-style", "Welsh Rarebit.jpg", "gb-welsh-rarebit-style"],
  ["dish-gb-cawl-style", "Cawl in bowl.jpg", "gb-cawl-style"],
  ["dish-pl-golabki", "Gołąbki - 2024.11.12.jpg", "pl-golabki"],
  ["dish-jm-brown-stew-chicken", "Jamaican fricassee chicken.jpg", "jm-brown-stew-chicken"],
  ["dish-de-senfeier", "Hannover 2026 - Café Ausblick - Senfeier - by-RaBoe 006.jpg", "de-senfeier"],
  ["dish-uz-dimlama", "Dimlama (16425713838).jpg", "uz-dimlama"],
  ["dish-se-gravlax-style", "Gravlax 2.jpg", "se-gravlax-style"],
  ["dish-blk-grah", "Šareni pasulj (Cuisine of Serbia).jpg", "blk-grah"],
  ["dish-et-lentil-sambusa-style", "Samboosa.JPG", "et-lentil-sambusa-style"],
  ["dish-ar-locro-style", "Locro argentino (porción).jpg", "ar-locro-style"],
  ["dish-za-bobotie-style", "Bobotie South Africa.jpg", "za-bobotie-style"],
  ["dish-cu-arroz-con-pollo", "Arroz-con-Pollo.jpg", "cu-arroz-con-pollo"],
  ["dish-hu-ujhazi", "Újházy-tyúkhúsleves from Győr.png", "hu-ujhazi"],
  ["dish-ge-satsivi", "Satsivi (2).jpg", "ge-satsivi"],
  ["dish-hu-csirkepaprikas", "Paprikahuhn.jpg", "hu-csirkepaprikas"],
  ["dish-no-farikal-style", "Farikal.jpg", "no-farikal-style"],
  ["dish-co-sancocho", "Sancocho de gallina yopal.jpg", "co-sancocho"],
  ["dish-za-peri-peri", "Peri-Peri Chicken dish.jpg", "za-peri-peri"],
  ["dish-et-shiro-wat", "Taita and shiro.jpg", "et-shiro-wat"],
  ["dish-tt-doubles", "FOOD Doubles 2.jpg", "tt-doubles"],
  ["dish-gb-fish-pie", "Fish Pie.jpg", "gb-fish-pie"],
  ["dish-ge-khachapuri-style", "Lobiani - bean-filled bread.jpg", "ge-khachapuri-style"],
  ["dish-se-toast-skagen-style", "Toast Skagen at Lucy in the Sky.jpg", "se-toast-skagen-style"],
  ["dish-ve-pabellon-style", "Pabellón Criollo Venezolano.jpg", "ve-pabellon-style"],
  ["dish-cz-kulajda-style", "Kulajda-Suppe.JPG", "cz-kulajda-style"],
  ["dish-shake-greek-yogurt-banana", "Banana Smoothie.jpg", "shake-banana-smoothie"],
  ["dish-shake-milk-greek-yogurt-banana", "Banna Yogurt Smoothie.jpg", "shake-banana-yogurt-smoothie"],
  ["dish-shake-double-dairy-banana", "Banana Milkshake.jpg", "shake-banana-milkshake"],
  ["dish-shake-mixed-seed-banana", "Melon and banana vegan shake (7448919266).jpg", "shake-melon-banana"],
  ["dish-shake-sesame-banana-greek-yogurt", "Vegan Banana Lassi (348299818).jpg", "shake-banana-lassi"],
  ["dish-shake-cottage-cheese-oats-banana", "Banana smoothie with weetbix.jpeg", "shake-oat-banana-smoothie"],
  ["dish-shake-peanut-banana-greek-yogurt", "Fruit and peanut butter smoothie.jpg", "shake-peanut-butter-smoothie"],
  ["dish-shake-peanut-strawberry-greek-yogurt", "Fruit and peanut butter smoothie. 1.jpg", "shake-peanut-fruit-smoothie"],
  ["dish-shake-greek-yogurt-mango", "Mango Banana Smoothie.jpg", "shake-mango-banana-smoothie"],
  ["dish-shake-cottage-cheese-mango", "Fresh-mango-smoothie 01.jpg", "shake-mango-smoothie"],
  ["dish-shake-milk-greek-yogurt-mango", "Batido de mango.jpg", "shake-batido-de-mango"],
  ["dish-shake-oat-mango-greek-yogurt", "Mango smoothie homemade.jpg", "shake-mango-smoothie-bowl"],
  ["dish-shake-cashew-mango-greek-yogurt", "Mango Lassi .jpg", "shake-mango-lassi"],
  ["dish-shake-pumpkin-seed-mango", "Tasty Mango lassi picture.JPG", "shake-mango-lassi-bowl"],
  ["dish-shake-whey-mango-milk", "Mango Lassi and Butter Milk - Vel South Indian Kitchen + Bar.jpg", "shake-mango-lassi-bottles"],
  ["dish-shake-soy-milk-mango-pumpkin-seed", "Mango Chia Smoothie.jpg", "shake-mango-chia-smoothie"],
  ["dish-shake-greek-yogurt-strawberry", "Plain yoghurt and strawberry smoothie (5700145998).jpg", "shake-strawberry-yogurt-smoothie"],
  ["dish-shake-greek-yogurt-strawberry-banana", "Strawberry and banana smoothie 1 (14084474069).jpg", "shake-strawberry-banana-smoothie"],
  ["dish-shake-greek-yogurt-cottage-cheese-strawberry", "Strawberry and banana milkshake, May 2005.jpg", "shake-strawberry-banana-milkshake"],
  ["dish-shake-cottage-cheese-strawberry", "Glass of strawberry smoothie (6828826294).jpg", "shake-strawberry-smoothie-glass"],
  ["dish-shake-sunflower-strawberry", "Looking down at a strawberry-lemon smoothie (14266944557).jpg", "shake-strawberry-smoothie-top"],
  ["dish-shake-greek-yogurt-jackfruit", "Jackfruit Seed Shake Kerala 20190414 220040.jpg", "shake-jackfruit-shake"],
  ["dish-shake-greek-yogurt-orange-cardamom", "Apple orange smoothie (34365737850).jpg", "shake-orange-smoothie"],
  ["dish-shake-overnight-oat-banana", "Protein overnight oats.jpg", "shake-overnight-oats"],
  ["dish-shake-almond-banana-greek-yogurt", "Bapatla Badam Milk.jpg", "shake-badam-milk-cup"],
  ["dish-shake-almond-cardamom", "Badam Milk Drink.jpg", "shake-badam-milk"],
  ["dish-shake-spinach-banana-greek-yogurt", "Green Smoothie.jpg", "shake-green-smoothie-glass"],
  ["dish-shake-tofu-spinach-mango", "Green smoothie (8222465502).jpg", "shake-green-smoothie-lemon"],
  ["dish-shake-avocado-greek-yogurt-lemon", "Green smoothie.jpg", "shake-green-smoothie-herbs"],
  ["dish-shake-carrot-orange-greek-yogurt", "Carrot Smoothie.jpg", "shake-carrot-smoothie"],
  ["dish-shake-soy-milk-banana", "Soy milk (2).jpg", "shake-soy-milk"],
  ["dish-shake-whey-banana-milk", "Protein shake.jpg", "shake-protein-shake"],
  ["dish-shake-cottage-cheese-banana", "Banana Smoothie.jpg", "shake-banana-smoothie-cottage-cheese"],
  ["dish-shake-ricotta-banana", "Banana Smoothie.jpg", "shake-banana-smoothie-ricotta"],
  ["dish-shake-whey-cottage-cheese-banana", "Banana Milkshake.jpg", "shake-banana-milkshake-whey"],
  ["dish-shake-whey-oat-banana", "Banana Milkshake.jpg", "shake-banana-milkshake-oat"],
  ["dish-shake-walnut-banana-greek-yogurt", "Melon and banana vegan shake (7448919266).jpg", "shake-melon-banana-walnut"],
  ["dish-shake-coconut-banana-greek-yogurt", "Melon and banana vegan shake (7448919266).jpg", "shake-melon-banana-coconut"],
  ["dish-shake-oat-peanut-banana", "Banana smoothie with weetbix.jpeg", "shake-oat-banana-peanut"],
  ["dish-shake-soy-powder-banana-oat-peanut", "Banana smoothie with weetbix.jpeg", "shake-oat-banana-soy"],
  ["dish-shake-whey-peanut-banana", "Fruit and peanut butter smoothie.jpg", "shake-peanut-butter-whey"],
  ["dish-shake-soy-powder-mango-coconut", "Fresh-mango-smoothie 01.jpg", "shake-mango-smoothie-soy"],
  ["dish-shake-ricotta-strawberry", "Glass of strawberry smoothie (6828826294).jpg", "shake-strawberry-smoothie-ricotta"],
  ["dish-shake-whey-strawberry-greek-yogurt", "Plain yoghurt and strawberry smoothie (5700145998).jpg", "shake-strawberry-yogurt-whey"],
  ["dish-shake-soy-powder-strawberry-almond", "Looking down at a strawberry-lemon smoothie (14266944557).jpg", "shake-strawberry-smoothie-soy"],
  ["dish-shake-cottage-cheese-orange", "Apple orange smoothie (34365737850).jpg", "shake-orange-smoothie-cottage-cheese"],
  ["dish-pw2-baked-fish-fingers", "Fishfinger classic fried 1.jpg", "pw2-baked-fish-fingers"],
  ["dish-pw2-banh-mi-sandwich", "Bánh mì.jpg", "pw2-banh-mi-sandwich"],
  ["dish-pw2-bolon-verde", "Bolón de verde Santa cruz 2021-11-14.jpg", "pw2-bolon-verde"],
  ["dish-pw2-buckwheat-galette", "Buckwheat galette (46959860324).jpg", "pw2-buckwheat-galette"],
  ["dish-pw2-chicken-kari-dosa", "Chicken masala dosa.jpg", "pw2-chicken-kari-dosa"],
  ["dish-pw2-chicken-kathi-roll", "Chicken Kathi Roll (5646735923).jpg", "pw2-chicken-kathi-roll"],
  ["dish-pw2-corn-cottage-fritters", "Pelas Jagung in Bojonegoro.jpg", "pw2-corn-cottage-fritters"],
  ["dish-pw2-croque-madame", "Croque Madame, Paris July 6, 2011 (cropped).jpg", "pw2-croque-madame"],
  ["dish-pw2-dan-bing", "Dan Bing (Taiwanese egg crepe).jpg", "pw2-dan-bing"],
  ["dish-pw2-devilled-eggs", "Deviled Eggs on Plate.jpg", "pw2-devilled-eggs"],
  ["dish-pw2-gozleme", "GözlemeAusbacken.jpg", "pw2-gozleme"],
  ["dish-pw2-huevos-rotos", "Huevos rotos con patatas fritas.jpg", "pw2-huevos-rotos"],
  ["dish-pw2-kuku-sabzi", "Kookoo-sabzi.jpg", "pw2-kuku-sabzi"],
  ["dish-pw2-martabak-telur", "Martabak telur Palembang.jpg", "pw2-martabak-telur"],
  ["dish-pw2-masala-vada-patties", "Paruppu Vadai - Homemade- Chennai-TN.jpg", "pw2-masala-vada-patties"],
  ["dish-pw2-migas", "Migas.jpg", "pw2-migas"],
  ["dish-pw2-mozzarella-sticks", "Mozzarella 394.jpg", "pw2-mozzarella-sticks"],
  ["dish-pw2-mughlai-egg-paratha", "Mughlai Paratha.jpg", "pw2-mughlai-egg-paratha"],
  ["dish-pw2-nasi-uduk", "Nasi Uduk Betawi.jpg", "pw2-nasi-uduk"],
  ["dish-pw2-okonomiyaki", "FOOD Okonomiyaki.jpg", "pw2-okonomiyaki"],
  ["dish-pw2-paneer-pea-samosas", "Shingara 01.jpg", "pw2-paneer-pea-samosas"],
  ["dish-pw2-roti-john", "Roti John - served.jpg", "pw2-roti-john"],
  ["dish-pw2-ros-omelette", "Ros omelette.jpg", "pw2-ros-omelette"],
  ["dish-pw2-shrimp-cakes", "Shrimp Cakes.jpg", "pw2-shrimp-cakes"],
  ["dish-pw2-soboro-bowl", "Tori-soboro-don,seasoned-chicken-powder,japan.JPG", "pw2-soboro-bowl"],
  ["dish-pw2-strammer-max", "Strammer Max auf blauem Teller, Ausschnitt-2433.jpg", "pw2-strammer-max"],
  ["dish-pw2-stuffed-mushrooms", "Stuffed mushrooms.jpg", "pw2-stuffed-mushrooms"],
  ["dish-pw2-syrniki", "Syrniki with fruits.jpg", "pw2-syrniki"],
  ["dish-pw2-tamago-sando", "Tamago Sando elaborado en Argentina.jpg", "pw2-tamago-sando"],
  ["dish-pw2-tortang-talong", "Tortang talong.jpg", "pw2-tortang-talong"],
  ["dish-pw2-turkey-chorizo-eggs", "Scrambled eggs with chorizo, cannelini beans and cherry tomatoes.jpg", "pw2-turkey-chorizo-eggs"],
  ["dish-pw2-turkey-eggwhite-bake", "Frittata slice.jpg", "pw2-turkey-eggwhite-bake"],
  ["dish-pw2-turkey-loco-moco", "Loco moco (32605169782).jpg", "pw2-turkey-loco-moco"],
  ["dish-pw2-white-bean-dip-eggs", "White bean dip with garnish.jpg", "pw2-white-bean-dip-eggs"],
  ["dish-pw2-xoi-xeo", "Xôi xéo.jpg", "pw2-xoi-xeo"],
  ["dish-ayala-varutharacha-curry", "Ayala Meen Curry by Preeti Tamilarasan.jpg", "ayala-varutharacha-curry"],
  ["dish-ayala-mulakittathu", "MEEN MULAKITTATHU.jpg", "ayala-mulakittathu"],
  ["dish-mathi-pepper-fry", "Spicy fried sardines.jpg", "mathi-pepper-fry"],
  ["dish-vella-kadala-curry", "White Chana in a Ground Coconut Sauce Thengayaracha Vella Kadala Curry (15727675520).jpg", "vella-kadala-curry"],
  ["dish-mutta-thoran", "Mutta Thoran(Scrambled Egg with Spicy Coconut Masala) 01.JPG", "mutta-thoran"],
  ["dish-meen-mappas", "Fish Moilee Kerala Style.JPG", "meen-mappas"],
  ["dish-kozhi-mappas", "Chicken Mappas (15728728659).jpg", "kozhi-mappas"],
  ["dish-kozhi-thoran", "Chicken shallot thoran - kerala style.jpg", "kozhi-thoran"],
  ["dish-paneer-jalfrezi", "Paneer Jalfrezi.jpg", "paneer-jalfrezi"],
  ["dish-paneer-tikka", "Panir Tikka Indian cheese grilled.jpg", "paneer-tikka"],
  ["dish-mushroom-paneer-masala", "Paneer mushroom gravy.JPG", "mushroom-paneer-masala"],
  ["dish-egg-pepper-fry", "Pepper egg fries.jpg", "egg-pepper-fry"],
  ["dish-egg-poached-curry", "Egg drop curry - my home Bangalore - Karnataka -pic 11.jpg", "egg-poached-curry"],
  ["dish-egg-tadka-dal", "Egg tadka.jpg", "egg-tadka-dal"],
  ["dish-chole-palak", "Spinach-Chickpea Curry (3117324894).jpg", "chole-palak"],
  ["dish-chana-paneer", "Chole Paneer.jpg", "chana-paneer"],
  ["dish-kaju-masala", "Cashew Curry.JPG", "kaju-masala"],
  ["dish-kaju-paneer", "Cashew paneer.jpg", "kaju-paneer"],
  ["dish-chicken-do-pyaza", "Chicken do pyaza.JPG", "chicken-do-pyaza"],
  ["dish-chicken-kolhapuri", "Kolhapuri Chicken.JPG", "chicken-kolhapuri"],
  ["dish-chicken-rezala", "Chicken Rezala - Kolkata 2011-08-02 4546.JPG", "chicken-rezala"],
  ["dish-ph-chicken-adobo-style", "Chicken adobo.jpg", "ph-chicken-adobo-style"],  // CC BY 2.0; author: dbgg1979 on flickr
  ["dish-ph-tinola", "Chicken Tinola, Feb 2024.jpg", "ph-tinola"],  // CC BY-SA 4.0; author: Ralff Nestor Nacor
  ["dish-ph-sinigang-shrimp", "3615Sinigang na Hipon sa Sampalok at Tanglad 03.jpg", "ph-sinigang-shrimp"],  // CC0; author: Judgefloro
  ["dish-ph-ginataang-manok", "3146Ginataang Tinanglarang Manok 21.jpg", "ph-ginataang-manok"],  // CC0; author: Judgefloro
  ["dish-ph-monggo", "3778Ginisang monggo, sugpo at tokwa sa kamias 12.jpg", "ph-monggo"],  // CC0; author: Judgefloro
  ["dish-ph-tortang-talong", "Tortang Talong, Apr 2026.jpg", "ph-tortang-talong"],  // CC BY-SA 4.0; author: Ralff Nestor Nacor
  ["dish-ph-pinakbet-style", "Ginisang Pinakbet with Shrimp, Aug 2026.jpg", "ph-pinakbet-style"],  // CC BY-SA 4.0; author: Ralff Nestor Nacor
  ["dish-jp-oyakodon", "Golden chicken and egg bowl of Nakau.jpg", "jp-oyakodon"],  // CC0; author: 毒島みるく
  ["dish-jp-chikuzenni", "がめ煮（筑前煮）P1010424.jpg", "jp-chikuzenni"],  // CC BY-SA 4.0; author: 南無観自在
  ["dish-jp-mabo-nasu", "Ma-bonasu.jpg", "jp-mabo-nasu"],  // CC BY-SA 3.0; author: Hykw-a4
  ["dish-jp-nikujaga-style", "Nikujaga.jpg", "jp-nikujaga-style"],  // CC BY 4.0; author: ノボホショコロトソ
  ["dish-jp-teriyaki-style", "Chicken teriyaki, Fried chicken, Asian cuisine in Krasnoyarsk, Russia.jpg", "jp-teriyaki-style"],  // CC BY 4.0; author: Vyacheslav Argenberg
  ["dish-th-tom-kha-gai", "Thom Kha Gai Soup.jpg", "th-tom-kha-gai"],  // CC BY-SA 4.0; author: Christian Michelides
  ["dish-th-tom-yum-style", "Siam Garden Tom yum goong ac.jpg", "th-tom-yum-style"],  // CC BY-SA 4.0; author: Asturio Cantabrio
  ["dish-th-pad-kra-pao-style", "Kao Rad Pad Kra-pao with chicken and fried egg - Unithai 2025-07-30.jpg", "th-pad-kra-pao-style"],  // CC0; author: Andy Li
  ["dish-th-gaeng-pa", "Gang Pa Thai Jungle Curry close-up - Ying Thai Lygon AUD12.90 (2170431637).jpg", "th-gaeng-pa"],  // CC BY-SA 2.0; author: Alpha
  ["dish-th-pla-neung-manao-style", "Thai steamed fish with lime juice-2.jpg", "th-pla-neung-manao-style"],  // Public domain; author: Mattes (talk) *derivative work: an-d (talk)
  ["dish-vn-ca-kho-to-style", "Cá kho tộ, cá hú.jpg", "vn-ca-kho-to-style"],  // CC BY-SA 2.0; author: Charles Haynes
  ["dish-kh-fish-amok-style", "Fish Amok with Rice.jpg", "kh-fish-amok-style"],  // CC0; author: sharonang
  ["dish-kr-dak-yukgaejang", "Korean Yukgaejang.jpg", "kr-dak-yukgaejang"],  // CC BY 3.0; author: Shene81
  ["dish-kr-chicken-bulgogi-style", "Dak-bulgogi.jpg", "kr-chicken-bulgogi-style"],  // CC BY 2.0; author: Debbie Tingzon
  ["dish-id-sate-lilit", "Sate lilit.jpg", "id-sate-lilit"],  // CC BY-SA 4.0; author: lifestyle.okezone.com
  ["dish-id-ayam-betutu-style", "Ayam betutu khas Gilimanuk.jpg", "id-ayam-betutu-style"],  // CC BY-SA 4.0; author: Ezagren (bicara / talk)
  ["dish-id-pepes-tofu-tempeh", "Pèpès tahu 2.jpg", "id-pepes-tofu-tempeh"],  // CC BY-SA 4.0; author: User:Affandy Murad
  ["dish-cn-yu-xiang-eggplant", "Yuxiangqiezi.jpg", "cn-yu-xiang-eggplant"],  // CC BY-SA 2.0; author: Ewan-M of Flickr
  ["dish-cn-lions-head-style", "Lions head meatballs in brown sauce.jpg", "cn-lions-head-style"],  // CC BY-SA 4.0; author: Jpatokal
  ["dish-cn-chicken-black-bean", "Chicken with black bean sauce.JPG", "cn-chicken-black-bean"],  // CC BY-SA 3.0; author: BrokenSphere
  ["dish-cn-salt-pepper-tofu", "Salt and Pepper Tofu.jpg", "cn-salt-pepper-tofu"],  // CC BY 4.0; author: Neodymium+Nd
  ["dish-tw-sesame-oil-chicken", "Sesame oil chicken (4849352485).jpg", "tw-sesame-oil-chicken"],  // CC BY 2.0; author: jeffreyw
  ["dish-np-chicken-choila-style", "Chhwela.jpg", "np-chicken-choila-style"],  // CC BY-SA 4.0; author: Rajivkilanashrestha
  ["dish-pt-bacalhau-bras-style", "Bacalhau a Bras.jpg", "pt-bacalhau-bras-style"],  // CC BY-SA 3.0; author: Fpenteado at en.wikipedia
  ["dish-es-marmitako", "Marmitako de atún (España).jpg", "es-marmitako"],  // CC BY-SA 4.0; author: Juan Emilio Prades Bel
  ["dish-pt-arroz-de-marisco-style", "Arroz de marisco in Lisbon.jpg", "pt-arroz-de-marisco-style"],  // CC BY-SA 4.0; author: Kritzolina
  ["dish-pt-cataplana-style", "Seafood Cataplana at World Heritage Cuisine Summit & Food Festival 2018 (Day 2) - 20.jpg", "pt-cataplana-style"],  // CC BY-SA 4.0; author: Satdeep Gill
  ["dish-be-waterzooi", "Waterzooi, 2010.jpg", "be-waterzooi"],  // CC BY 2.0; author: Smabs Sputzer
  ["dish-al-tave-kosi-style", "TAVE KOSI- agnello allo yogurt albanese.jpg", "al-tave-kosi-style"],  // CC BY 2.0; author: fugzu
  ["dish-al-fergese-style", "Fërgesë me speca dhe gjizë.jpg", "al-fergese-style"],  // CC BY-SA 4.0; author: Rrezjaediellit
  ["dish-ro-ciorba-perisoare", "Ciorbă cu perișoare.jpg", "ro-ciorba-perisoare"],  // CC BY-SA 4.0; author: Sacha47
  ["dish-ba-begova-corba", "Begova Čorba (Baščaršija in Sarajevo, Bosnia).JPG", "ba-begova-corba"],  // CC BY-SA 4.0; author: BiHVolim
  ["dish-gr-turkey-stifado-style", "Stifado.JPG", "gr-turkey-stifado-style"],  // CC BY-SA 3.0; author: Fajardoalacant
  ["dish-ir-tahchin-style", "Making Tahchin.jpg", "ir-tahchin-style"],  // CC BY-SA 4.0; author: Roozitaa
  ["dish-ye-saltah-style", "Saltah.jpg", "ye-saltah-style"],  // CC BY-SA 4.0; author: Rania al-Bahara
  ["dish-dz-chorba-style", "Chorba frik algerienne.jpg", "dz-chorba-style"],  // CC BY-SA 4.0; author: Slothtysloth
  ["dish-il-gefilte-style", "Gefilte fish topped with slices of carrot.jpg", "il-gefilte-style"],  // CC BY-SA 4.0; author: Mushki Brichta
  ["dish-lb-shish-barak-style", "Shish barak.jpg", "lb-shish-barak-style"],  // CC BY-SA 4.0; author: Peteravivangel
  ["dish-eg-hawawshi-style", "Hawawshi Main 2 Mohamed Moheyeldin.jpg", "eg-hawawshi-style"],  // CC BY-SA 4.0; author: Mohamed Moheyeldin
  ["dish-ng-chicken-suya", "Suya chicken meat.jpg", "ng-chicken-suya"],  // CC BY-SA 4.0; author: MOIBARDE
  ["dish-ng-efo-riro-style", "Efo riro.jpg", "ng-efo-riro-style"],  // CC BY-SA 4.0; author: Bukky658
  ["dish-cm-ndole-style", "Ndole.jpg", "cm-ndole-style"],  // CC0; author: Adesolive
  ["dish-ci-kedjenou", "Kedjenou de Poulet.jpg", "ci-kedjenou"],  // CC BY-SA 4.0; author: Liliane.logbo
  ["dish-ug-matoke-turkey", "Matoke with stew.jpg", "ug-matoke-turkey"],  // CC BY-SA 4.0; author: Rokie7
  ["dish-ao-calulu-style", "Calulu.jpg", "ao-calulu-style"],  // CC BY 3.0; author: elingunnur
  ["dish-mz-zambeziana-style", "Frango a Zambeziana acompanhado de Salada e Batatas Fritas.jpg", "mz-zambeziana-style"],  // CC BY-SA 4.0; author: Nalikilal
  ["dish-gt-pepian", "Pepián Guatemala.jpg", "gt-pepian"],  // CC BY 2.0; author: Josué Goge from Guatemala
  ["dish-mx-chiles-nogada-style", "Chile en nogada in Mexico City.jpg", "mx-chiles-nogada-style"],  // CC BY-SA 4.0; author: Jj saezdeo
  ["dish-br-bobo-camarao", "Bobo a Dish from Brazil.JPG", "br-bobo-camarao"],  // CC BY-SA 3.0; author: Victorgrigas
  ["dish-pe-carapulcra-style", "2020-10-18 carapulcra.jpg", "pe-carapulcra-style"],  // CC BY-SA 4.0; author: MiguelAlanCS (finisher re-pin 2026-11-17: the original pin, "Carapulcra definitiva.jpg", carries a blog watermark in frame)
  ["dish-ge-lobiani-style", "Lobiani, Restaurant Aragvi.jpg", "ge-lobiani-style"],  // CC BY-SA 2.0; author: Sandra C from Canada
  ["dish-az-dovga-style", "Dovga e-citizen.JPG", "az-dovga-style"],  // CC BY-SA 3.0; author: Moonsun1981
  ["dish-lt-cepelinai-style", "Cepelinai 2019.jpg", "lt-cepelinai-style"],  // CC BY-SA 4.0; author: Bdx
  ["dish-kh-samlor-korko-style", "Samlor Korko Khmer at Peace Cafe.jpg", "kh-samlor-korko-style"],  // CC0; author: Mx. Granger
  ["dish-id-woku-style", "Woku rahang tuna.jpg", "id-woku-style"],  // CC0; author: NazlyBiya
  ["dish-cn-shui-zhu-style", "Shuizhufish.jpg", "cn-shui-zhu-style"],  // Public domain; author: Princevegetam at English Wikipedia
  ["dish-ir-gheymeh-style", "Gheyme.jpg", "ir-gheymeh-style"],  // CC BY-SA 4.0; author: Diako1971
  ["dish-tr-etli-bamya", "Etli bamya.jpg", "tr-etli-bamya"],  // CC BY-SA 4.0; author: E4024

  /* The Bulgarian wave (2026-11-26). Photographs verified by eye
     against the dish each names: sharp, well-lit, the dish itself —
     no collages, no preparation scenes, no watermarks, no branded
     trays, no crowd shots. */
  ["dish-bg-shopska-salata", "Chopska.jpg", "bulgarian-shopska-salata"],
  ["dish-bg-snezhanka", "Snezhanka.jpg", "bulgarian-snezhanka"],
  ["dish-bg-kartofena-salata", "Potato salad 3.jpg", "bulgarian-kartofena-salata"],
  ["dish-bg-pecheni-chushki", "Roasted peppers.JPG", "bulgarian-pecheni-chushki"],
  ["dish-bg-marinovani-gabi", "Pickled mushrooms 4.JPG", "bulgarian-marinovani-gabi"],
  ["dish-bg-przheni-patladzhani", "Afghan cuisine egg plant with yogurt.JPG", "bulgarian-przheni-patladzhani"],
  ["dish-bg-lyutenitsa", "Лутеница.jpg", "bulgarian-lyutenitsa"],
  ["dish-bg-kyopolou", "Kyopoolu bg.jpg", "bulgarian-kyopolou"],
  ["dish-bg-tarator", "TaratorBg.jpg", "bulgarian-tarator"],
  ["dish-bg-bob-chorba", "Bean soup with tomatoes and red peppers.jpeg", "bulgarian-bob-chorba"],
  ["dish-bg-kurban-chorba", "Ready kurban chorba.JPG", "bulgarian-kurban-chorba"],
  ["dish-bg-pileshka-supa", "Пилешка супа.jpg", "bulgarian-pileshka-supa"],
  ["dish-bg-supa-topcheta", "Meat ball soup.JPG", "bulgarian-supa-topcheta"],
  ["dish-bg-gyuvech", "Guvec.jpg", "bulgarian-gyuvech"],
  ["dish-bg-musaka", "Мусака од компири.jpg", "bulgarian-musaka"],
  ["dish-bg-zelevi-sarmi", "Sarma (Bosnian).jpg", "bulgarian-zelevi-sarmi"],
  ["dish-bg-plneni-chushki", "Stuffed Peppers.jpg", "bulgarian-plneni-chushki"],
  ["dish-bg-kyufte", "Bulgarian cuisine meatballs (kyufte) (2).jpg", "bulgarian-kyufte"],
  ["dish-bg-kebapche", "Kebapche bg.jpg", "bulgarian-kebapche"],
  ["dish-bg-karnache-style", "Карначе dulboka.jpg", "bulgarian-karnache"],
  ["dish-bg-tatarsko-kyufte", "Tatarsko kufte.JPG", "bulgarian-tatarsko-kyufte"],
  ["dish-bg-rulo-stefani", "Stefánia vagdalt.JPG", "bulgarian-rulo-stefani"],
  ["dish-bg-pile-s-oriz", "Rice and chicken.JPG", "bulgarian-pile-s-oriz"],
  ["dish-bg-sach", "Dinner in Nesebar 01.jpg", "bulgarian-sach"],
  ["dish-bg-drob-sarma-style", "Bulgarian drob sarma.jpg", "bulgarian-drob-sarma"],
  ["dish-bg-kachamak", "Качамак со кисело млеко и парче сирење.jpg", "bulgarian-kachamak"],
  ["dish-bg-skumriya-na-skara", "Grilled mackerel on a BBQ.jpg", "bulgarian-skumriya-na-skara"],
  ["dish-bg-mish-mash", "Cuisinebg mishmash.jpg", "bulgarian-mish-mash"],
  ["dish-bg-yaytsa-panagyurski", "Çılbır - Cafe Rust 2025-03-31.jpg", "bulgarian-yaytsa-po-panagyurski"],
  ["dish-bg-palachinki", "Palachinki pancake.jpg", "bulgarian-palachinki"],
  ["dish-bg-banitsa-sirene", "Banitsa and yogurt.jpg", "bulgarian-banitsa-sirene"],
  ["dish-bg-spanachnik", "Pastry with spinach and feta cheese.jpg", "bulgarian-spanachnik"],
  ["dish-bg-banitsa-praz-style", "Банички со праз.jpg", "bulgarian-banitsa-praz"],
  ["dish-bg-baklava-style", "Baklava and walnuts.jpg", "bulgarian-baklava"],
  ["dish-bg-kompot", "Kompot z suszonych sliwek.JPG", "bulgarian-kompot"],
  /* The Bulgarian wave 2 (2026-11-26): the everyday table widened —
     46 of its 86 dishes photographed, three of them on files shared
     with a visually identical sibling (see SHARED_FILES: the real
     pork-and-beef kebapche shares wave 1's kebapche photograph, the
     pork karnache shares wave 1's karnache plate, and the honeyed
     yogurt shares the Greek yogurt power bowl's photograph — in
     each case the photograph depicts exactly what both dishes are).
     The other 40 are recorded in PHOTOLESS with their hunted
     reasons; the bar was not lowered to raise the count. */
  ["dish-bg2-ruska-salata-style", "Olivier Russian salad made to the Hermitage restaurant recipe.jpg", "bulgarian2-ruska-salata"],
  ["dish-bg2-bobena-salata", "Colourful bean salad.jpg", "bulgarian2-bobena-salata"],
  ["dish-bg2-parzheni-kartofi", "Plate of chips at the Chalet Cafe, Cowfold, West Sussex, England.jpg", "bulgarian2-parzheni-kartofi"],
  ["dish-bg2-morkovena-salata", "Nest of Carrot Salad, by LadyofProcrastination.jpg", "bulgarian2-morkovena-salata"],
  ["dish-bg2-przheni-chushki", "Pepper and tomatoes sause.jpg", "bulgarian2-przheni-chushki"],
  ["dish-bg2-katak", "Катък.jpg", "bulgarian2-katak"],
  ["dish-bg2-zelenchukova-supa", "Зеленчукова супа2.jpg", "bulgarian2-zelenchukova-supa"],
  ["dish-bg2-kartofena-supa", "Bramboračka 022.jpg", "bulgarian2-kartofena-supa"],
  ["dish-bg2-domatena-supa", "07832 tomato rice soup, sanok.jpg", "bulgarian2-domatena-supa"],
  ["dish-bg2-spanachena-supa", "Bulgarian cuisine spinach and rice soup with yoghurt.jpg", "bulgarian2-spanachena-supa"],
  ["dish-bg2-patatnik", "Patatnik Ostrhodopen PD 2011.JPG", "bulgarian2-patatnik"],
  ["dish-bg2-imambayalda", "İmam bayıldı AvL.JPG", "bulgarian2-imambayalda"],
  ["dish-bg2-svinsko-s-zele", "Pork with sauerkraut.JPG", "bulgarian2-svinsko-s-zele"],
  ["dish-bg2-pile-na-furna", "Roasted Chicken, Butterflied, on Potatoes, Baking Pan 01.jpg", "bulgarian2-pile-na-furna"],
  ["dish-bg2-spanak-s-oriz", "Spanakorizo.jpg", "bulgarian2-spanak-s-oriz"],
  ["dish-bg2-plneni-chushki-postni", "Stuffed peppers with rice.jpg", "bulgarian2-plneni-chushki"],
  ["dish-bg2-patladzhanena-musaka", "Mousakas.jpg", "bulgarian2-patladzhanena-musaka"],
  ["dish-bg2-bamya", "Bamia-Ocras tomate (cropped).JPG", "bulgarian2-bamya"],
  ["dish-bg2-gabi-s-oriz", "Mushroom pilaf (2058676726).jpg", "bulgarian2-gabi-s-oriz"],
  ["dish-bg2-kebapche-skara", "Kebapche bg.jpg", "bulgarian2-kebapche"],
  ["dish-bg2-karnache-style", "Карначе dulboka.jpg", "bulgarian2-karnache"],
  ["dish-bg2-svinski-parzholi", "Grilled pork chops.jpg", "bulgarian2-svinski-parzholi"],
  ["dish-bg2-przheni-kyufteta", "Fried homemade meatballs.jpg", "bulgarian2-przheni-kyufteta"],
  ["dish-bg2-mekitsi", "Mekici.jpg", "bulgarian2-mekitsi"],
  ["dish-bg2-popara", "Попара (Popara).jpg", "bulgarian2-popara"],
  ["dish-bg2-omlet", "FoodOmelete.jpg", "bulgarian2-omlet"],
  ["dish-bg2-pogacha", "Bulgarian pogacha (bread).jpg", "bulgarian2-pogacha"],
  ["dish-bg2-pyrlenka", "Parlenka.webp", "bulgarian2-pyrlenka"],
  ["dish-bg2-gevrek-style", "Simit (rectangular).jpg", "bulgarian2-gevrek"],
  ["dish-bg2-prosenik", "Proja photo Moma SM.jpg", "bulgarian2-prosenik"],
  ["dish-bg2-chesnova-pitka", "Garlic knots.jpg", "bulgarian2-chesnova-pitka"],
  ["dish-bg2-revane", "Basboosa.jpg", "bulgarian2-revane"],
  ["dish-bg2-tolumbichki", "Толумби.jpg", "bulgarian2-tolumbichki"],
  ["dish-bg2-oriz-s-mlyako", "Sütlaç (Turkish rice pudding).jpeg", "bulgarian2-oriz-s-mlyako"],
  ["dish-bg2-krem-karamel", "Crème caramel 2.jpg", "bulgarian2-krem-karamel"],
  ["dish-bg2-ashure-style", "Aşure.jpg", "bulgarian2-ashure"],
  ["dish-bg2-gris-halva", "Irmik helva and çay.jpg", "bulgarian2-gris-halva"],
  ["dish-bg2-banitsa-yabalki", "Slice of strudel.jpg", "bulgarian2-banitsa-yabalki"],
  ["dish-bg2-kiselo-mlyako-med", "Flickr - cyclonebill - Græsk yoghurt med honning og valnødder.jpg", "bulgarian2-kiselo-mlyako-med"],
  ["dish-bg2-boza-style", "Boza bg.jpg", "bulgarian2-boza"],
  ["dish-bg2-chai-menta", "Mint-tea.jpg", "bulgarian2-chai-menta"],
  ["dish-bg2-limonada", "Lemonade 2.jpg", "bulgarian2-limonada"],
  ["dish-bg2-panirano-sirene", "Czech fried cheese.jpg", "bulgarian2-panirano-sirene"],
  ["dish-bg2-kartofeni-kyufteta", "Perkedel kentang.JPG", "bulgarian2-kartofeni-kyufteta"],
  ["dish-bg2-printsesa", "Princess Sandwich.jpg", "bulgarian2-printsesa"],
  ["dish-bg2-gabi-pane", "Breaded parasol mushroom.jpg", "bulgarian2-gabi-pane"],
  // Protein Wave A (2026-11-26): protein-rich and balanced dishes,
  // each photograph visually verified against the dish.
  ["dish-pwa-beef-kofta", "Arabic MixedGrill.JPG", "proteina-beef-kofta"],
  ["dish-pwa-ginger-salmon", "Grilled plated salmon fillet.jpg", "proteina-ginger-salmon"],
  ["dish-pwa-garlic-shrimp", "Buttered Garlic Shrimp Viand at Night.jpg", "proteina-garlic-shrimp"],
  ["dish-pwa-beef-black-bean-chilli", "Black bean chili (3263369585).jpg", "proteina-beef-black-bean-chilli"],
  ["dish-pwa-paneer-makhani", "Paneer Butter Masala 2.jpg", "proteina-paneer-makhani"],
  ["dish-pwa-prawn-coconut-curry", "Bangladeshi Prawn Curry.jpg", "proteina-prawn-coconut-curry"],
  ["dish-pwa-huevos-rancheros-style", "Huevos Rancheros (11494813583).jpg", "proteina-huevos-rancheros-style"],
  ["dish-pwa-yogurt-chia-parfait", "Chia jars with bleuberries (Unsplash).jpg", "proteina-yogurt-chia-parfait"],
  ["dish-pwa-tofu-scramble", "Cinnamon raisin vegan french toast and curry tofu scramble (3383908508).jpg", "proteina-tofu-scramble"],
  ["dish-pwa-beef-vegetable-stirfry", "2016-08-20 Stir fried beef slices with celery in a Beijing Restaurant anagoria.jpg", "proteina-beef-vegetable-stirfry"],
  ["dish-pwa-paneer-vegetable-skewers", "Paneer Tikka Shashlik PK012.jpg", "proteina-paneer-vegetable-skewers"],
  ["dish-pwa-tofu-egg-drop-soup", "Egg Drop Soup (蛋花湯）.jpg", "proteina-tofu-egg-drop-soup"],
  ["dish-pwa-peanut-oat-breakfast-bowl", "Tropical Fruit & Nut Overnight Oats Bowl.jpg", "proteina-peanut-oat-breakfast-bowl"],
  ["dish-pwa-fish-moilee-style", "FISH MOILEE - Mini MADRAS 2026-05-03.jpg", "proteina-fish-moilee-style"],
  ["dish-pwa-soya-pulao", "SoyaBiryani.jpg", "proteina-soya-pulao"],
  ["dish-pwa-rajma-paneer", "Caption Simple, Soulful Kashmiri Rajma Chawal.jpg", "proteina-rajma-paneer"],
  ["dish-pwa-lamb-couscous-plate", "Couscous and Lamb Chops.jpg", "proteina-lamb-couscous-plate"],
  ["dish-pwa-sardine-pasta", "Pasta con Sarde.jpg", "proteina-sardine-pasta"],
  ["dish-pwa-chicken-katsu-style", "Chicken Cutlet 001.jpg", "proteina-chicken-katsu-style"],
  ["dish-pwa-chicken-fajita-plate", "Chicken fajitas.jpg", "proteina-chicken-fajita-plate"],
  ["dish-pwa-tofu-peanut-noodles", "Spicy peanut tofu (3660634348).jpg", "proteina-tofu-peanut-noodles"],
  ["dish-pwa-anda-paneer-bhurji", "Homemade Paneer Bhurji.jpg", "proteina-anda-paneer-bhurji"],
  ["dish-pwa-cottage-cheese-pancakes", "RusSyrnikiKissel.JPG", "proteina-cottage-cheese-pancakes"],
  ["dish-pwa-besan-paneer-chilla", "Besan chilla.jpg", "proteina-besan-paneer-chilla"],
  ["dish-pwa-egg-white-frittata", "Фритата со спанаќ (01).jpg", "proteina-egg-white-frittata"],
  ["dish-pwa-soybean-keema", "Ghee Roast Soya Keema with Mini Parathas.jpg", "proteina-soybean-keema"],
  ["dish-pwa-besan-cottage-frittata", "Green Goddess Mushroom Fritata.jpg", "proteina-besan-cottage-frittata"],
  ["dish-pwa-turkey-meatloaf-style", "Hackbraten auf Holzbrett, aufgeschnitten.jpg", "proteina-turkey-meatloaf-style"],
  ["dish-pwa-cod-chowder", "Chowder.jpg", "proteina-cod-chowder"],
  ["dish-pwa-turkey-meatballs-marinara", "Liat Portal for Foodie Disorder - Spaghetti and meatballs.jpg", "proteina-turkey-meatballs-marinara"],
  ["dish-pwa-ful-with-eggs", "Ful Medames.JPG", "proteina-ful-with-eggs"],
  ["dish-pwa-kerala-egg-roast", "Egg roast ,Kerala cuisine.jpg", "proteina-kerala-egg-roast"],
  ["dish-pwa-pork-cabbage-noodles", "Yakisoba (fried noodles) with pork, onions, cabbage and carrot.jpg", "proteina-pork-cabbage-noodles"],
  ["dish-pwa-chicken-barley-soup", "Krupnik soup Poland.jpg", "proteina-chicken-barley-soup"],
  ["dish-pwa-chicken-pasta-primavera", "POLLO PESTO PRIMAVERA (27230443866).jpg", "proteina-chicken-pasta-primavera"],
  ["dish-pwa-lamb-rogan-style", "Mutton Rogan Josh - Mohali 2016-08-07 9110.JPG", "proteina-lamb-rogan-style"],
  ["dish-pwa-egg-pea-fried-rice", "Egg Fried Rice.jpg", "proteina-egg-pea-fried-rice"],
  ["dish-pwa-sardine-tomato-stew", "Cherry tomatoes, roasted, with sardines, on Taiwan noodles with soy sauce and black pepper - Massachusetts.jpg", "proteina-sardine-tomato-stew"],
  ["dish-pwa-peri-peri-chicken", "2018-02-03 Chicken Piri-Piri, Albufeira.JPG", "proteina-peri-peri-chicken"],
  ["dish-pwa-turkey-chilli", "Bowl of chili.jpg", "proteina-turkey-chilli"],
  ["dish-pwa-lupin-spinach-dal", "Dal Palak.jpg", "proteina-lupin-spinach-dal"],
  ["dish-pwa-turkey-buckwheat", "Gulasz indyczy w sosie z kaszą gryczaną - 2025.01.18.jpg", "proteina-turkey-buckwheat"],
  ["dish-pwa-salmon-barley-plate", "Acorn crust salmon.jpg", "proteina-salmon-barley-plate"],
  ["dish-pwa-lamb-seekh-kebab", "Seekh Kabab.JPG", "proteina-lamb-seekh-kebab"],
  ["dish-pwa-chickpea-quinoa-pilaf", "Chickpea quinoa pilaf (41367978140).jpg", "proteina-chickpea-quinoa-pilaf"],
  ["dish-pwa-mackerel-escabeche-style", "Pescado azul en escabeche, gastronomía tradicional de España.jpg", "proteina-mackerel-escabeche-style"],
  /* Protein wave B (2026-11-26): 45 of its 70 dishes photographed,
     each photograph visually verified against the dish. Two
     verified shots were refused because the same file already
     serves a sibling dish in the library (the hot and sour soup's
     shot serves dish-cn-hot-sour-soup; the bean soup's serves
     dish-bg-bob-chorba) — one photograph never illustrates two
     different dishes. The other 25 are recorded in PHOTOLESS with
     their hunted reasons; the bar was not lowered to raise the
     count. */
  ["dish-pwb-tandoori-chicken", "Tandoori chicken Indian.jpg", "proteinb-tandoori-chicken"],
  ["dish-pwb-beef-rendang", "Beef Rendang..JPG", "proteinb-beef-rendang"],
  ["dish-pwb-beef-stroganoff-style", "Beef stroganoff with pasta.jpg", "proteinb-beef-stroganoff"],
  ["dish-pwb-salisbury-steak-style", "Salisbury Steak.jpg", "proteinb-salisbury-steak"],
  ["dish-pwb-char-siu-pork", "Charsiu.jpg", "proteinb-char-siu"],
  ["dish-pwb-pork-sinigang-style", "Sinigang na Baboy.jpg", "proteinb-sinigang"],
  ["dish-pwb-pork-vindaloo", "Vindalho.jpg", "proteinb-vindaloo"],
  ["dish-pwb-pork-potstickers-style", "Dumplings on a blue plate.jpg", "proteinb-potstickers"],
  ["dish-pwb-hemp-salmon", "Liat Portal for Foodie Disorder - Salmon with garlic and herbs, crushed potatoes and peas.jpg", "proteinb-hemp-salmon"],
  ["dish-pwb-thai-fish-cakes-style", "Thanin market tod man pla.jpg", "proteinb-thai-fish-cakes"],
  ["dish-pwb-cod-chickpea-stew", "POTAJE DE GARBANZOS CON BACALAO.jpg", "proteinb-cod-chickpea"],
  ["dish-pwb-turkey-tetrazzini-style", "Turkey Tetrazzini.jpg", "proteinb-tetrazzini"],
  ["dish-pwb-chicken-alfredo-style", "Chicken fettuccine alfredo.JPG", "proteinb-chicken-alfredo"],
  ["dish-pwb-beef-bolognese", "Spaghetti Bolognese - Figaros, Brighton 2023-10-06.jpg", "proteinb-bolognese"],
  ["dish-pwb-carbonara-style", "Espaguetis carbonara.jpg", "proteinb-carbonara"],
  ["dish-pwb-shrimp-poke-bowl-style", "Shrimp poke bowl at Treffi Verkkosaari.jpg", "proteinb-poke-bowl"],
  ["dish-pwb-chicken-marsala-style", "Flickr preppybyday 4843102799--Chicken marsala.jpg", "proteinb-chicken-marsala"],
  ["dish-pwb-murgh-cholay", "Lahori Murgh Cholay.JPG", "proteinb-murgh-cholay"],
  ["dish-pwb-dahi-chicken", "Chicken yogurt curry (289438716).jpg", "proteinb-dahi-chicken"],
  ["dish-pwb-chicken-hariyali", "Chicken Hariyali kebab.jpg", "proteinb-hariyali"],
  ["dish-pwb-chicken-sukka-style", "Mangalorean country chicken curry ( Kori sukka).jpg", "proteinb-chicken-sukka"],
  ["dish-pwb-prawn-pepper-fry", "Deep fried prawns with garlic and pepper, Chung Borikan 2.jpg", "proteinb-prawn-pepper-fry"],
  ["dish-pwb-beef-coconut-fry-style", "Kerala Beef Fry.jpg", "proteinb-beef-fry"],
  ["dish-pwb-lamb-biryani-style", "Mutton biryani.JPG", "proteinb-lamb-biryani"],
  ["dish-pwb-irish-lamb-stew-style", "Traditional Irish Stew is made with Lamb in Ireland.jpg", "proteinb-irish-stew"],
  ["dish-pwb-turkey-waldorf-style", "Waldorfsalat.jpg", "proteinb-waldorf"],
  ["dish-pwb-tuna-melt-style", "Tuna melt sandwich with fries.jpg", "proteinb-tuna-melt"],
  ["dish-pwb-beef-egg-hash", "Hash (4106225932).jpg", "proteinb-beef-hash"],
  ["dish-pwb-quiche-lorraine-style", "Quiche lorraine 01.JPG", "proteinb-quiche-lorraine"],
  ["dish-pwb-green-shakshuka-style", "Liat Portal for Foodie Disorder - Green shakshuka with spinach and egg.jpg", "proteinb-green-shakshuka"],
  ["dish-pwb-quark-chia-pudding", "Chia Seed Pudding in a cup.jpg", "proteinb-chia-pudding"],
  ["dish-pwb-paneer-tikka-wrap-style", "Paneer kathi roll homemade.jpg", "proteinb-paneer-wrap"],
  ["dish-pwb-sorghum-mung-khichdi-style", "VegetableKhichdi Rayagada Odisha 0002.jpg", "proteinb-khichdi"],
  ["dish-pwb-oats-egg-upma-style", "UPMA..!!.jpg", "proteinb-upma"],
  ["dish-pwb-cauliflower-cheddar-soup", "Cauliflower soup at a sittning.jpg", "proteinb-cauliflower-soup"],
  ["dish-pwb-sweet-potato-lentil-soup", "Liat Portal for Foodie Disorder - Red lentil soup with vegetables and dumpling.jpg", "proteinb-lentil-soup"],
  ["dish-pwb-egg-yogurt-flatbreads", "Moglai Porota.jpg", "proteinb-moglai-porota"],
  ["dish-pwb-devilled-eggs", "Deviled Eggs - 3-23-08.jpg", "proteinb-devilled-eggs"],
  ["dish-pwb-masala-omelette-peas", "Indian Omelette Odisha.jpg", "proteinb-masala-omelette"],
  ["dish-pwb-corn-chowder", "Vegan Garden Corn Chowder with Chives (cropped).jpg", "proteinb-corn-chowder"],
  ["dish-pwb-pasta-fagioli", "Pasta e fagioli cannellini.jpg", "proteinb-pasta-fagioli"],
  ["dish-pwb-zuppa-toscana-style", "Zuppa Toscana (15403359844).jpg", "proteinb-zuppa-toscana"],
  ["dish-pwb-tofu-noodle-soup", "Tofu noodle soup (Phở chay) - Pho Hanoi Authentic 2024-12-01.jpg", "proteinb-tofu-noodle-soup"],
  ["dish-pwb-stracciatella-style", "Straciatella - bowl.JPG", "proteinb-stracciatella"],
  ["dish-pwb-pea-mint-soup", "Pea soup 2.jpg", "proteinb-pea-soup"],
  /* Protein wave C (2026-11-26): 53 of its 70 dishes photographed,
     each photograph visually verified against the dish. Two more
     verified shots were refused because the same file already
     serves a sibling dish in the library (the broccoli soup's
     shot serves dish-intl-broccoli-cheddar-soup; the roasted
     chickpeas' serves dish-roasted-chana), and those two wave
     dishes were themselves dropped as recipe duplicates of the
     siblings and replaced. The other 17 are recorded in
     PHOTOLESS with their hunted reasons; the bar was not lowered
     to raise the count. */
  ["dish-pwc-acorda-style", "Açorda à Alentejana.jpg", "proteinc-acorda"],
  ["dish-pwc-ash-reshteh-style", "Ash Reshteh.JPG", "proteinc-ash-reshteh"],
  ["dish-pwc-ayam-goreng", "Ayam goreng kalasan, sleman.jpg", "proteinc-ayam-goreng"],
  ["dish-pwc-beef-birria-style", "Plato de birria.jpg", "proteinc-birria"],
  ["dish-pwc-beef-lomo-saltado-style", "Lomo saltado 13012008.JPG", "proteinc-lomo-saltado"],
  ["dish-pwc-beef-spezzatino", "Polenta con carne.JPG", "proteinc-spezzatino"],
  ["dish-pwc-bissara", "Bissara (Moroccan Dip).JPG", "proteinc-bissara"],
  ["dish-pwc-brik-style", "Fried brik.jpg", "proteinc-brik"],
  ["dish-pwc-cassoulet-style", "Bowl of cassoulet.JPG", "proteinc-cassoulet"],
  ["dish-pwc-cauliflower-chickpea-curry", "Curried cauliflower and chickpea stew.jpg", "proteinc-cauliflower-chickpea-curry"],
  ["dish-pwc-causa-style", "Causa rellena 20100314.JPG", "proteinc-causa"],
  ["dish-pwc-chicken-kiev-style", "Chicken Kiev Flickr.jpg", "proteinc-chicken-kiev"],
  ["dish-pwc-chicken-manchurian-style", "Chicken manchurian 02.JPG", "proteinc-chicken-manchurian"],
  ["dish-pwc-chicken-pakora", "Chicken Pakora 6375.JPG", "proteinc-chicken-pakora"],
  ["dish-pwc-chicken-pastilla-style", "Pastilla marocaine recouverte de sucre glace.jpg", "proteinc-pastilla"],
  ["dish-pwc-chicken-yakitori-style", "Yakitori (Teriyaki Chicken Skewers).jpg", "proteinc-yakitori"],
  ["dish-pwc-cioppino-style", "Cioppino à l'italienne.jpg", "proteinc-cioppino"],
  ["dish-pwc-cocido-style", "Detalle Cocido Madrileño.jpg", "proteinc-cocido"],
  ["dish-pwc-ewa-agoyin-style", "Ewa agoyin.jpg", "proteinc-ewa-agoyin"],
  ["dish-pwc-farinata", "Socca a Nice.jpg", "proteinc-farinata"],
  ["dish-pwc-full-english-style", "Full English breakfast at the Chalet Cafe, Cowfold, West Sussex, England.jpg", "proteinc-full-english"],
  ["dish-pwc-ghormeh-sabzi-style", "חורשט סבזי.jpg", "proteinc-ghormeh-sabzi"],
  ["dish-pwc-kheer", "Kheer Special.JPG", "proteinc-kheer"],
  ["dish-pwc-kibbeh-style", "Kibbeh3.jpg", "proteinc-kibbeh"],
  ["dish-pwc-kung-pao-chicken", "Kung-pao-shanghai.jpg", "proteinc-kung-pao"],
  ["dish-pwc-lablabi", "Lablabi لبلابي.jpg", "proteinc-lablabi"],
  ["dish-pwc-lamb-navarin-style", "Navarin dagneau printanier (cropped).jpg", "proteinc-navarin"],
  ["dish-pwc-maultaschen-style", "Schwäbische Maultaschen (Ausschnitt).jpg", "proteinc-maultaschen"],
  ["dish-pwc-mirza-ghasemi", "Mirza-Qasemi dish.jpg", "proteinc-mirza-ghasemi"],
  ["dish-pwc-moin-moin-style", "Moin Moin.jpg", "proteinc-moin-moin"],
  ["dish-pwc-paella-style", "01 Paella Valenciana original.jpg", "proteinc-paella"],
  ["dish-pwc-paneer-kofta", "Paneer Kofta.JPG", "proteinc-paneer-kofta"],
  ["dish-pwc-paneer-pakora", "Pakoras in Jaipur.jpg", "proteinc-paneer-pakora"],
  ["dish-pwc-paneer-paratha", "Paratha is a dough fried flatbread native to India and Pakistan.jpg", "proteinc-paneer-paratha"],
  ["dish-pwc-peanut-seed-granola", "Vegan Granola in Melon (4954388104).jpg", "proteinc-granola"],
  ["dish-pwc-piperade-style", "Pipérade.jpg", "proteinc-piperade"],
  ["dish-pwc-porchetta-style", "Porchetta - One Kitchen.jpg", "proteinc-porchetta"],
  ["dish-pwc-pork-carnitas-style", "Tacos de Carnitas con nopales.jpg", "proteinc-carnitas"],
  ["dish-pwc-pork-menudo-style", "Pork Menudo.jpg", "proteinc-menudo"],
  ["dish-pwc-pork-tonkatsu", "Tonkatsu by ayustety in Tokyo.jpg", "proteinc-tonkatsu"],
  ["dish-pwc-pupusas", "Plain pupusas revueltas.jpg", "proteinc-pupusas"],
  ["dish-pwc-quinoa-tabouleh-style", "Vegan quinoa tabbouleh - Tabulé de quinoa (6916828023).jpg", "proteinc-quinoa-tabbouleh"],
  ["dish-pwc-salmorejo-style", "Salmorejo em Córdova.jpg", "proteinc-salmorejo"],
  ["dish-pwc-scotch-broth-style", "Lunch at Inveraray Castle - Scotch broth (14342541740).jpg", "proteinc-scotch-broth"],
  ["dish-pwc-shrikhand", "Shrikhand.JPG", "proteinc-shrikhand"],
  ["dish-pwc-shrimp-avocado-salad", "Shrimp and Avocado Salad (13329194373).jpg", "proteinc-shrimp-avocado-salad"],
  ["dish-pwc-shrimp-etouffee-style", "Mmm...Shrimp Etouffee.jpg", "proteinc-shrimp-etouffee"],
  ["dish-pwc-sweet-sour-pork", "菠萝咕噜肉.jpg", "proteinc-sweet-sour-pork"],
  ["dish-pwc-tilapia-veracruz-style", "Pescado blanco a la veracruzana.jpg", "proteinc-veracruz"],
  ["dish-pwc-toad-in-the-hole-style", "Toad in the hole.jpg", "proteinc-toad-in-the-hole"],
  ["dish-pwc-tortilla-espanola", "Tortilla de Patatas (Corte transversal).jpg", "proteinc-tortilla"],
  ["dish-pwc-turkey-tonnato-style", "Vitello tonnato (6977537544).jpg", "proteinc-tonnato"],
  ["dish-pwc-twice-cooked-pork", "Twice cooked pork of Gyoza-no-Manshu.jpg", "proteinc-twice-cooked-pork"],
];

/**
 * Commons titles pinned by MORE THAN ONE dish, with the dishes allowed
 * to share each: enriched variants of a photographed base dish, the
 * same dish carried in two library categories, and visually identical
 * siblings. Any other reuse of a title fails generation and check.
 */
const SHARED_FILES = [
  ["Grilled mackerel on a BBQ.jpg", ["dish-intl-grilled-mackerel", "dish-bg-skumriya-na-skara"]],
  /* Bulgarian wave 2 (2026-11-26): the real pork-and-beef grill
     classics the owner's decision restored are visually identical
     to wave 1's lamb adaptations — a grilled kebapche and a
     karnache spiral photograph exactly what both versions are. */
  ["Kebapche bg.jpg", ["dish-bg-kebapche", "dish-bg2-kebapche-skara"]],
  ["Карначе dulboka.jpg", ["dish-bg-karnache-style", "dish-bg2-karnache-style"]],
  /* The honeyed yogurt with walnuts is one served dish in two
     traditions; the photograph depicts both exactly. */
  ["Flickr - cyclonebill - Græsk yoghurt med honning og valnødder.jpg", ["dish-greek-yogurt-power-bowl", "dish-bg2-kiselo-mlyako-med"]],
  ["Chicken souvlaki at Hellenic 2.jpg", ["dish-chicken-souvlaki", "dish-intl-greek-chicken-souvlaki"]],
  ["GarbanzosConEspinacas.jpg", ["dish-garbanzos-espinacas", "dish-intl-chickpea-spinach-stew"]],
  ["Black eyed Peas Curry and Pulav.JPG", ["dish-intl-black-eyed-pea-stew", "dish-mavromatika-fasolia"]],
  ["Dal Makhani..JPG", ["dish-dal-makhani", "dish-dal-makhani-enriched"]],
  ["Rajma.jpg", ["dish-rajma-masala", "dish-rajma-enriched"]],
  ["Chole Masala India.jpg", ["dish-chole-masala", "dish-chole-enriched"]],
  ["Matar-Paneer.JPG", ["dish-matar-paneer", "dish-matar-paneer-enriched"]],
  ["Palak Paneer (Cottage cheese in spinach gravy).jpg", ["dish-palak-paneer", "dish-palak-paneer-enriched"]],
  ["Spicy Anda Curry.jpg", ["dish-egg-curry", "dish-egg-curry-enriched"]],
  ["Chicken curry Trivandrum.jpg", ["dish-chicken-curry", "dish-chicken-curry-enriched"]],
  ["Goan Fish Curry Rice (5905244921).jpg", ["dish-goan-fish-curry", "dish-goan-fish-curry-enriched"]],
  ["Baingan Ka Bharta.JPG", ["dish-baingan-bharta", "dish-baingan-bharta-enriched"]],
  ["Masala Khichadi.jpg", ["dish-khichdi-enriched", "dish-masala-khichdi"]],
  ["Vegetable biryani 03.JPG", ["dish-veg-biryani", "dish-enriched-veg-biryani"]],
  ["Lancaster, United States (Unsplash).jpg", ["dish-fruit-curd-bowl", "dish-enriched-fruit-curd-bowl"]],
  ["Coconut Chutney - Home Made.JPG", ["dish-coconut-chutney", "dish-shahi-coconut-chutney"]],
  ["Kadala curry.jpg", ["dish-kadala-curry", "dish-kadala-curry-enriched"]],
  ["Chicken fricassee-01.jpg", ["dish-ar-pollo-crema", "dish-chicken-fricassee"]],
  ["Banana Smoothie.jpg", ["dish-shake-cottage-cheese-banana", "dish-shake-greek-yogurt-banana", "dish-shake-ricotta-banana"]],
  ["Banana Milkshake.jpg", ["dish-shake-double-dairy-banana", "dish-shake-whey-cottage-cheese-banana", "dish-shake-whey-oat-banana"]],
  ["Melon and banana vegan shake (7448919266).jpg", ["dish-shake-coconut-banana-greek-yogurt", "dish-shake-mixed-seed-banana", "dish-shake-walnut-banana-greek-yogurt"]],
  ["Banana smoothie with weetbix.jpeg", ["dish-shake-cottage-cheese-oats-banana", "dish-shake-oat-peanut-banana", "dish-shake-soy-powder-banana-oat-peanut"]],
  ["Fruit and peanut butter smoothie.jpg", ["dish-shake-peanut-banana-greek-yogurt", "dish-shake-whey-peanut-banana"]],
  ["Fresh-mango-smoothie 01.jpg", ["dish-shake-cottage-cheese-mango", "dish-shake-soy-powder-mango-coconut"]],
  ["Glass of strawberry smoothie (6828826294).jpg", ["dish-shake-cottage-cheese-strawberry", "dish-shake-ricotta-strawberry"]],
  ["Plain yoghurt and strawberry smoothie (5700145998).jpg", ["dish-shake-greek-yogurt-strawberry", "dish-shake-whey-strawberry-greek-yogurt"]],
  ["Looking down at a strawberry-lemon smoothie (14266944557).jpg", ["dish-shake-soy-powder-strawberry-almond", "dish-shake-sunflower-strawberry"]],
  ["Apple orange smoothie (34365737850).jpg", ["dish-shake-cottage-cheese-orange", "dish-shake-greek-yogurt-orange-cardamom"]],
  ["Tasty Mango lassi picture.JPG", ["dish-mango-lassi", "dish-shake-pumpkin-seed-mango"]],
  ["Badam Milk Drink.jpg", ["dish-badam-doodh", "dish-shake-almond-cardamom"]],
  ["Protein overnight oats.jpg", ["dish-intl-overnight-oats", "dish-shake-overnight-oat-banana"]],
];

/**
 * Library dishes with NO suitable free photograph — recorded, with the
 * reason, never silently omitted and never given a substitute image.
 */
const PHOTOLESS = [
  ["dish-arhar-dal", "Commons search returns only the pigeon-pea plant and its fields, no photograph of the cooked dal under a free licence was found."],
  ["dish-black-bean-masala", "Every free-licence 'black bean curry' photograph on Commons proved to be lobia (black-eyed peas) on inspection, no verifiable black-bean curry photograph."],
  ["dish-pinto-bean-curry", "No free-licence photograph of a pinto bean curry was found on Commons."],
  ["dish-white-bean-curry", "No free-licence photograph verifiably depicting a white bean curry was found, the results were Thai curries and banana-leaf meals."],
  ["dish-soybean-curry", "The only free-licence candidate was a text-overlaid photo collage, no clean photograph of a soybean curry."],
  ["dish-matar-masala", "Commons offers keema matar (with meat) and dry masala peas (a snack) under free licences, but no photograph of a plain peas curry."],
  ["dish-sprouted-moong-curry", "The candidates were misal pav (a different, farsan-topped dish) and unrelated images, no photograph of a plain sprouted moong curry."],
  ["dish-tomato-dal", "No photograph verifiably showing tomato dal was found; the dal photographs available are generic tadka dals already pinned to other dishes."],
  ["dish-paneer-tikka-masala", "Every 'paneer tikka masala' result on Commons is actually a chicken tikka masala photograph, no verifiable paneer version under a free licence."],
  ["dish-chicken-saag", "Commons' saag photographs prove to be lamb saag or saag paneer on inspection, no verifiable chicken saag photograph under a free licence."],
  ["dish-salmon-masala-curry", "No free-licence photograph of a salmon curry was found; the results were other fish curries and composed salmon plates."],
  ["dish-gobi-masala", "Every free-licence candidate proved to be aloo gobi (with potato) or gobi manchurian on inspection, no potato-free gobi masala photograph."],
  ["dish-beans-carrot-coconut-curry", "The candidates were beans thoran (a dry stir-fry) and full meals, no photograph of the coconut curry itself."],
  ["dish-sweet-potato-coconut-curry", "The only candidate was a Thai meal table where the dish could not be isolated or verified."],
  ["dish-soya-matar", "Candidates show a soya curry and peas rice as separate halves of one thali, no photograph of soya chunks and peas cooked together."],
  ["dish-masala-paratha", "No free-licence photograph verifiably depicting a masala paratha was found."],
  ["dish-cottage-cheese-paratha", "The only stuffed-paratha candidate proved to be a meat keema paratha, no verifiable paneer paratha photograph."],
  ["dish-cottage-cheese-chilla", "Only plain besan chilla photographs exist under free licences (one is pinned to Besan Chilla), none shows the cottage-cheese variant."],
  ["dish-barley-porridge", "The candidates were harees (a wheat-and-meat porridge) and plain cooked barley grains, no photograph of a barley breakfast porridge."],
  ["dish-quinoa-upma", "No free-licence photograph of quinoa upma was found on Commons."],
  ["dish-vanpayar-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English, Malayalam and cowpea/payar searches plus the Kerala category-tree harvest): no photograph of a red-cowpea curry exists on Commons."],
  ["dish-vendakka-theeyal", "Hunted 2026-11-16 and re-hunted 2026-11-17 (title-prefix, intitle, Malayalam and category sweeps): the only theeyal photographs on Commons are breadfruit and bitter-melon (the bitter-melon one is pinned to Pavakka Theeyal), no okra theeyal."],
  ["dish-ulli-theeyal", "Hunted 2026-11-16 and re-hunted 2026-11-17 (title-prefix, intitle, Malayalam and category sweeps): the only theeyal photographs on Commons are breadfruit and bitter-melon, no onion/shallot theeyal."],
  ["dish-chemmeen-theeyal", "Hunted 2026-11-16 and re-hunted 2026-11-17 (title-prefix, intitle, Malayalam and category sweeps): the only theeyal photographs on Commons are breadfruit and bitter-melon, no prawn theeyal."],
  ["dish-kozhi-perattu", "Hunted 2026-11-16 and re-hunted 2026-11-17: the chicken-roast photographs are tandoori-grilled legs and char-grilled barbecue chicken, no verifiable dry pan-roasted Kerala chicken perattu."],
  ["dish-koon-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches, category harvest): mushroom photographs are wild specimens and foraging shots, no Kerala mushroom curry."],
  ["dish-kappa-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17: kappa photographs show boiled tapioca served with fish, prawn or crab curry, or kappa kuzhachathu (the mashed preparation), never kappa cooked as a curry itself."],
  ["dish-chembu-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17: Commons holds only colocasia plant and corm photographs (the one 'Appachembu' file is a steamer vessel), no cooked chembu curry."],
  ["dish-murungakkai-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17: drumstick-curry photographs are North-Indian masala styles or drumstick-with-dal, no Kerala coconut-milk drumstick curry."],
  ["dish-ulli-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches, category harvest): no photograph of a Kerala onion curry was found."],
  ["dish-kaya-thoran", "Hunted 2026-11-16 and re-hunted 2026-11-17: thoran photographs are of other vegetables (long beans, carrot, cabbage, cheera, banana stem, papaya, jackfruit), no raw-banana thoran; the kaya files are bajji, chips and unnakaya."],
  ["dish-vendakka-thoran", "Hunted 2026-11-16 and re-hunted 2026-11-17: 'Bhindi ularth.JPG' examined at full resolution fries the okra with onion and curry leaves but shows no grated coconut, thoran is defined by its coconut, so it would mislabel the dish; the other okra files are plant and flower photographs."],
  ["dish-chembu-thoran", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of a taro thoran was found."],
  ["dish-cherupayar-thoran", "Hunted 2026-11-16 and re-hunted 2026-11-17: payar-thoran photographs are long-bean thoran, a different payar, no whole-moong thoran."],
  ["dish-vanpayar-thoran", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of a cowpea thoran was found."],
  ["dish-chembu-puzhukku", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of a taro puzhukku was found."],
  ["dish-pineapple-pachadi", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches): pachadi photographs are beetroot, cucumber and raw-mango, plus one generic 'Kerala Pachadi' that cannot be verified as pineapple, no pineapple pachadi."],
  ["dish-mambazha-pachadi", "Hunted 2026-11-16 and re-hunted 2026-11-17: the mango pachadi photographs are the glossy raw-mango pachadi without curd; the ripe-mango curd curry photograph found is a pulissery and is pinned to Mambazha Pulissery, a different dish."],
  ["dish-pavakka-kichadi", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches, Kichadi category): the kichadi photographs are cucumber/ash-gourd or unverifiable, and the bitter-gourd file is a dry fry, no bitter-gourd kichadi."],
  ["dish-mathi-peera", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English, Malayalam and category sweeps): no photograph of a sardine peera exists on Commons."],
  ["dish-ayala-peera", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English, Malayalam and category sweeps): no photograph of a mackerel peera exists on Commons."],
  ["dish-manga-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17: the two 'Angamaly Mango curry' photographs are the canonical raw-mango curry, and the other mango-curry photographs are the curd-based pulissery or fish-mango curries. Bloom's Manga Curry is the ripe-mango coconut curry, and a raw-mango photograph would mislabel it."],
  ["dish-muringa-ila-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17: the one moringa-leaf dal photograph carries a phone-camera watermark and a title naming the pod curry, and shows a thin North-Indian dal, no Kerala drumstick-leaf coconut curry."],
  ["dish-carrot-mezhukkupuratti", "Hunted 2026-11-16 and re-hunted 2026-11-17: the carrot photograph is a thoran (pinned to Carrot Thoran) and the generic 'Mezhukkupuratti.jpg' is long beans, the oil-fried carrot mezhukkupuratti has no photograph of its own."],
  ["dish-kumbalanga-curry", "Hunted 2026-11-16 and re-hunted 2026-11-17: ash-gourd photographs are the olan and the pulissery (both pinned to those dishes) and the Tulu tamarind koddel, a red curry, no plain Kerala kumbalanga coconut curry."],
  ["dish-thenga-chammanthi", "Hunted 2026-11-16 and re-hunted 2026-11-17 (Malayalam and chutney-category sweeps): coconut-chutney photographs are the runny dosa accompaniment or unverifiable restaurant chutneys, the firm sadhya chammanthi has no photograph."],
  ["dish-ulli-chammanthi", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches): no photograph of an onion chammanthi was found."],
  ["dish-chuvanna-thenga-chammanthi", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of a red coconut chammanthi was found."],
  ["dish-pudina-chammanthi", "Hunted 2026-11-16 and re-hunted 2026-11-17: every mint-chutney photograph is the runny North-Indian/dosa style, no coarse mint-coconut chammanthi."],
  ["dish-mulaku-chammanthi", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of a chilli chammanthi was found (the mulaku files are chillies and bajji)."],
  ["dish-inji-achar", "Hunted 2026-11-16 and re-hunted 2026-11-17: the 'Pickles of Kerala' series are market stalls of mixed pickle tubs, none identifiable as ginger pickle, no Kerala ginger pickle photograph."],
  ["dish-chammanthi-podi", "Hunted 2026-11-16 and re-hunted 2026-11-17: the podi photographs are idli-style lentil podis and one unverifiable coarse powder with tamarind pieces, no verified roasted-coconut chammanthi podi."],
  ["dish-pazham-puttu", "Hunted 2026-11-16 and re-hunted 2026-11-17 (full Puttu category harvest): puttu-and-banana photographs show banana served alongside the puttu, never mashed into it as pazham puttu is."],
  ["dish-mutta-stew", "Hunted 2026-11-16 and re-hunted 2026-11-17: the appam-and-stew photographs are all vegetable stews with no boiled egg, and egg-stew searches return Filipino chicken stews, no Kerala egg stew in coconut milk."],
  ["dish-pazhankanji", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches): the only kanji-titled photograph is a banana-leaf meals plate, and the other is the sweet jaggery kanji, no pazhankanji."],
  ["dish-orotti", "Hunted 2026-11-16 and re-hunted 2026-11-17 (title-prefix, Malayalam and text searches): no photograph of an orotti exists on Commons."],
  ["dish-kozhi-cutlet", "Hunted 2026-11-16 and re-hunted 2026-11-17: cutlet photographs are Western, Polish, Japanese, vegetable, mutton, clam and mushroom cutlets, plus one bakery tray whose cutlets cannot be verified as chicken, no Kerala kozhi cutlet."],
  ["dish-kozhi-ada", "Hunted 2026-11-16 and re-hunted 2026-11-17 (English and Malayalam searches): the 'Chicken pathiri' bakery trays are a different named snack (that file is pinned to Irachi Pathiri), and 'Stuffed pathiri.jpg' shows the right half-moon form but its filling cannot be verified as chicken, no kozhi ada photograph."],
  ["dish-egg-chaat", "No free-licence photograph of egg chaat was found on Commons."],
  ["dish-masala-seed-mix", "The only candidate was sweet mukhwas (a mouth freshener), not a savoury masala seed and nut mix."],
  ["dish-palak-saag", "Commons' saag photographs prove to be sarson (mustard) saag on inspection, no verifiable spinach-only palak saag photograph."],
  ["dish-sookhi-gobi-masala", "The dry side version has no photograph of its own; the only cauliflower photographs on Commons are wet curries or aloo gobi."],
  ["dish-broccoli-masala", "The candidates proved to be broccoli-and-potato dishes or unrelated curries, no verifiable broccoli masala photograph."],
  ["dish-shakarkandi-masala", "The only candidate proved to be a regular potato curry (khatte mithe aloo), no verifiable sweet-potato masala photograph."],
  ["dish-lobia-usal", "The candidates were a fish curry and dal plates, no photograph of lobia usal under a free licence."],
  ["dish-onion-tomato-masala", "The only close candidate proved to be a chicken curry, no photograph of the plain onion-tomato masala base."],
  ["dish-shahi-mixed-veg", "The candidates were thalis and rice plates, no photograph isolating a shahi mixed vegetable curry."],
  ["dish-til-chutney", "The candidates were sesame-oil milling scenes and unrelated spice powders, no photograph of til (sesame) chutney."],
  ["dish-fruit-raita", "No candidate verifiably showed fruit in the raita, the results were plain and cucumber raitas."],
  ["dish-palak-raita", "The only candidate was a thali flat-lay, no photograph isolating a spinach raita."],
  ["dish-burhani-raita", "No free-licence photograph of burhani (burani) raita was found on Commons."],
  ["dish-greek-yogurt-raita", "No free-licence photograph specifically of a Greek-yogurt raita was found; it is left photo-less rather than borrowing another raita's photograph."],
  ["dish-corn-raita", "No free-licence photograph verifiably showing a corn raita was found."],
  ["dish-haldi-doodh", "The candidates were the turmeric plant, turmeric powder and a branded mix packet, no photograph of the drink itself under a free licence."],
  ["dish-intl-chicken-quinoa-bowl", "Hunted 2026-11-17: the only free-licence quinoa bowls on Commons are a beef bowl and a schnitzel-and-quinoa plate (breaded strips, not the grilled-chicken power bowl)."],
  ["dish-intl-chicken-black-bean-chili", "Hunted 2026-11-17: enchiladas, salads, market pots and la zi ji, but no chicken and black bean chili under a free licence."],
  ["dish-intl-buffalo-chicken-strips", "Hunted 2026-11-17: Commons' free buffalo-chicken photographs are all bone-in wings; no boneless strips or tenders photograph was found, and wings are a different form."],
  ["dish-intl-turkey-vegetable-stir-fry", "Hunted 2026-11-17: the only hit is a Brueghel painting ('Turkey' the country swamps the search); no food photograph of a turkey stir-fry exists on Commons."],
  ["dish-intl-turkey-taco-cups", "Hunted 2026-11-17: only USDA school-lunch tortilla wraps; no cabbage or lettuce cup photograph with a verifiable turkey filling."],
  ["dish-intl-turkey-stuffed-peppers", "Hunted 2026-11-17: Balkan stuffed peppers exist (Albanian speca, Macedonian polneti piperki) but their fillings are beef or lamb with rice; nothing verifiably turkey and quinoa."],
  ["dish-intl-tuna-stuffed-peppers", "Hunted 2026-11-17: the tuna-filled peppers on Commons are filled with guacamole or topped with anchovies (cold Catalan style); none is the baked tuna, quinoa and mozzarella pepper."],
  ["dish-intl-sardine-chickpea-salad", "Hunted 2026-11-17: several sardine salads under free licences, but chickpeas could not be verified in any of them."],
  ["dish-intl-mackerel-potato-salad", "Hunted 2026-11-17: apple salads, a whole smoked-mackerel platter and an ingredients flat-lay; no mackerel and potato salad."],
  ["dish-intl-oat-crusted-haddock", "Hunted 2026-11-17: only fish pies (a different dish, fish under mash or pastry); no crusted haddock fillet under a free licence."],
  ["dish-intl-crustless-quiche", "Hunted 2026-11-17: the only quiche photograph has a thick pastry crust, contradicting the dish's defining feature."],
  ["dish-intl-egg-quinoa-fried-rice", "Hunted 2026-11-17: pan-fried chicken with quinoa and astronaut space food; no quinoa fried rice under a free licence."],
  ["dish-intl-tofu-edamame-stir-fry", "Hunted 2026-11-17: bentos, plain edamame pods and a tofu Benedict; no tofu and edamame stir-fry."],
  ["dish-intl-tempeh-coconut-curry", "Hunted 2026-11-17: the 'tempeh curry' files mostly show raw tempeh blocks on boards; the two served shots are dim kitchen scenes that cannot be verified as a coconut curry."],
  ["dish-intl-tempeh-taco-cups", "Hunted 2026-11-17: tempeh tacos exist, but in tortillas; the dish's defining form is cabbage cups."],
  ["dish-intl-tempeh-bolognese", "Hunted 2026-11-17: no photograph of a tempeh bolognese was found on Commons under a free licence."],
  ["dish-intl-edamame-quinoa-bowl", "Hunted 2026-11-17: pods of edamame, an edamame noodle bowl (noodles are not in the dish) and a poke bowl; no edamame quinoa bowl."],
  ["dish-intl-soybean-tomato-chili", "Hunted 2026-11-17: raw soybeans, chili oil and dipping sauces; no soybean chili."],
  ["dish-intl-tofu-oat-meatballs", "Hunted 2026-11-17: tahu bakso, yen tafo noodle soup and pork pearl meatballs; no tofu meatballs in tomato sauce."],
  ["dish-intl-tofu-cabbage-cups", "Hunted 2026-11-17: bentos and one lettuce cup whose mince filling cannot be verified as tofu and mushroom."],
  ["dish-intl-black-bean-burrito-bowl", "Hunted 2026-11-17: partially eaten bowls, a lettuce-buried bowl, and bowls that contain chicken (not in the dish); none verifiably the black bean bowl."],
  ["dish-intl-lentil-bolognese", "Hunted 2026-11-17: no photograph of a lentil bolognese was found on Commons under a free licence."],
  ["dish-intl-three-bean-quinoa-chili", "Hunted 2026-11-17: a vegetable stew pot and an infographic; no three-bean chili under a free licence."],
  ["dish-intl-hummus-egg-plate", "Hunted 2026-11-17: sabich pitas and breakfast spreads; no plate of hummus with eggs."],
  ["dish-intl-warm-lentil-egg-salad", "Hunted 2026-11-17: only Indian dal-and-roti plates; no lentil and egg salad under a free licence."],
  ["dish-intl-peanut-chickpea-stew", "Hunted 2026-11-17: no photograph of a peanut and chickpea stew was found on Commons under a free licence."],
  ["dish-intl-spinach-ricotta-chicken", "Hunted 2026-11-17: no photograph of a spinach-stuffed chicken breast was found on Commons under a free licence."],
  ["dish-intl-cheesy-bean-bake", "Hunted 2026-11-17: BBQ trays where baked beans are a side, and a jacket potato with beans; no cheesy bean and tomato bake."],
  ["dish-intl-black-bean-burgers", "Hunted 2026-11-17: generic veggie burgers, several cheese-stacked; a black bean patty cannot be verified in any of them."],
  ["dish-intl-edamame-egg-fried-rice", "Hunted 2026-11-17: a peanut fried rice and set meals; no edamame fried rice."],
  ["dish-intl-turkey-rice-bowl", "Hunted 2026-11-17: Chiayi turkey rice (a distinct shredded-turkey dish) and a gravy-smothered turkey rice; neither is the turkey, broccoli and brown rice bowl."],
  ["dish-intl-egg-white-turkey-scramble", "Hunted 2026-11-17: no photograph of a turkey egg scramble was found on Commons under a free licence."],
  ["dish-intl-eggs-benedict-style", "Hunted 2026-11-17: every Commons benedict is the classic ham build on a muffin; this dish is turkey on flatbread, and the meat hides unverifiably under the hollandaise."],
  ["dish-intl-turkey-sweet-potato-hash", "Hunted 2026-11-17: a plain hash-browns-and-eggs skillet (turkey and sweet potato unverifiable) and military chow-line photographs."],
  ["dish-intl-greek-yogurt-power-bowl", "Hunted 2026-11-17: a smoothie and a tuna salad tub; parfait shot-glasses do not match a bowl built on yogurt, egg, nuts and seeds either."],
  ["dish-intl-tempeh-potato-hash", "Hunted 2026-11-17: tempeh bacon on toast and a toddler-meal mince; no tempeh and potato hash."],
  ["dish-intl-baked-egg-muffins", "Hunted 2026-11-17: on Commons 'egg muffins' are McDonald's McMuffins (branded sandwiches) and the baked-muffin photographs are flour muffins; no baked egg cups."],
  ["dish-intl-quinoa-breakfast-bowl", "Hunted 2026-11-17: the only candidate, across two hunts, is Chinese astronaut space food."],
  ["dish-intl-tempeh-strips-eggs", "Hunted 2026-11-17: Indonesian rice meals (nasi telor, nasi 3T) where tempeh and egg are sides to rice; no tempeh strips and eggs plate."],
  ["dish-intl-savoury-oatmeal", "Hunted 2026-11-17: no photograph of a savoury oatmeal was found on Commons under a free licence."],
  ["dish-intl-quinoa-porridge", "Hunted 2026-11-17: the only candidate is Chinese astronaut space food; no quinoa porridge under a free licence."],
  ["dish-intl-beans-eggs-skillet", "Hunted 2026-11-17: a pan bagnat sandwich and steamed skewers; no beans and eggs skillet."],
  ["dish-greek-lemon-chicken-potatoes", "No photograph of Greek lemon chicken roasted with potatoes found under a free licence."],
  ["dish-kotopoulo-kokkinisto", "No photograph of chicken braised in tomato (kokkinisto) found."],
  ["dish-psari-plaki", "Plaki searches returned Turkish bean pilaki and fish illustrations, no baked cod with tomato and onion."],
  ["dish-baked-mackerel-greek", "No photograph of mackerel baked with tomato and onion found."],
  ["dish-garides-kokkinistes", "The only saganaki photograph shows feta cubes, which this recipe does not contain."],
  ["dish-greek-lemon-chicken-rice", "No photograph found."],
  ["dish-turkey-souvlaki", "Souvlaki photographs name chicken in their titles; none shows turkey."],
  ["dish-greek-shrimp-quinoa", "Only a cold shrimp-quinoa salad and restaurant tartare plates; the dish is a warm tomato braise."],
  ["dish-greek-baked-tilapia", "Tilapia photographs are raw prep shots or tilapia with pasta."],
  ["dish-greek-herb-omelette", "Nargesi (a different named dish, fried egg on spinach) and a tomato-mushroom omelette both rejected."],
  ["dish-chicken-gyro-plate", "Every gyro-plate photograph found shows fries and dark spit meat, not chicken with yogurt sauce; wraps also rejected."],
  ["dish-kotopoulo-me-fasolia", "No photograph of Greek chicken and white-bean stew found."],
  ["dish-greek-turkey-keftedes", "Meatball photographs found are frying-in-progress, in other named dishes, or plant-based."],
  ["dish-greek-sardine-bake", "The only baked-sardines-with-tomato photograph (Albanian sardele tavë) carries branded tins in frame and olives the recipe lacks."],
  ["dish-pollo-sorrentina", "Searches return the Sorrento peninsula and gnocchi alla sorrentina, no baked chicken with mozzarella."],
  ["dish-turkey-involtini", "Involtini photographs are beef/veal roulades or mixed antipasti plates; none shows turkey rolls in tomato."],
  ["dish-risotto-tonno", "No photograph of a tuna risotto exists on Commons under a free licence."],
  ["dish-risotto-gamberi", "Shrimp-risotto photographs show peas and cheese, mixed shellfish, or restaurant branding, none matches this plain lemon risotto."],
  ["dish-chicken-orzotto", "The only orzotto photograph shows a plain barley bowl where neither chicken nor mushroom can be verified."],
  ["dish-uova-purgatorio", "No photograph under this dish's name exists; shakshuka-titled files cannot serve it under the title gate."],
  ["dish-minestrone-fagioli", "Every minestrone photograph checked contains pasta, corn or rice, none of which is in this recipe."],
  ["dish-pesce-acqua-pazza", "Candidates show olives or a mixed shellfish plate, not cod poached in tomato."],
  ["dish-insalata-di-mare", "Seafood-salad photographs are mixed shellfish or prawn salads with asparagus/avocado; none shows this shrimp, cucumber and pepper salad."],
  ["dish-pollo-diavola", "No photograph of chilli-grilled chicken alla diavola found under a free licence."],
  ["dish-gnocchi-turkey-ragu", "Gnocchi photographs name beef ragù or cream sauces; none shows a tomato turkey ragù."],
  ["dish-tilapia-livornese", "Livornese photographs are cacciucco (mixed fish stew) or name other fish."],
  ["dish-pollo-ajillo", "Every pollo al ajillo photograph is dominated by fries, rice or takeout packaging the recipe does not have."],
  ["dish-cod-galician", "No photograph of Galician cod with potatoes and peas found."],
  ["dish-pollo-pepitoria", "The only pepitoria photograph serves the chicken with a pile of fries the recipe does not have."],
  ["dish-albondigas-pavo-almendras", "No photograph of meatballs in almond sauce exists."],
  ["dish-albondigas-cordero", "The albóndigas tapa photograph is full of peas, which this recipe does not contain."],
  ["dish-salmon-pisto", "Griddled-salmon photographs come with fries or potatoes, never with pisto."],
  ["dish-salade-nicoise", "Every niçoise photograph includes olives (and usually anchovies); this recipe contains neither."],
  ["dish-haddock-meuniere", "The only meunière photograph plates the fish with rice and peppers; sole photographs name a different fish."],
  ["dish-salade-lentilles", "Lentil-salad photographs show no egg, and the egg is a defining component of this dish."],
  ["dish-mackerel-moutarde", "Mackerel photographs are raw fish or plain grills; none shows the mustard-yogurt sauce."],
  ["dish-chicken-provencal", "Photographs are roast chicken with herbes de Provence, not the tomato and pepper braise."],
  ["dish-turkey-escalope-lemon", "Turkey-escalope photographs are stove pans or distant table shots, none plated with lemon."],
  ["dish-salmon-herb-crust", "No photograph of mustard and herb-crusted salmon found."],
  ["dish-hindi-sis", "No photograph of turkey shish exists; chicken-titled photographs cannot serve it."],
  ["dish-hindi-kofte", "No photograph of turkey köfte exists."],
  ["dish-tavuk-guvec", "No chicken güveç photograph; generic güveç photographs show red meat."],
  ["dish-balik-bugulama", "No photograph of Turkish steamed fish with vegetables found."],
  ["dish-yogurtlu-tavuk", "No photograph of yogurt-sauced chicken found; only tirit photographs matched the words."],
  ["dish-mantarli-yumurta", "No photograph of Turkish mushroom eggs found."],
  ["dish-kofta-bi-tahini", "No photograph of kofta baked in tahini sauce exists on Commons."],
  ["dish-samkeh-harra", "No photograph of samkeh harra found."],
  ["dish-maghmour", "No photograph of Lebanese maghmour found."],
  ["dish-dajaj-mashwi", "Grilled-chicken photographs plate it with rice and vegetables the recipe does not contain, and none shows the garlic sauce."],
  ["dish-qaridis-bi-thoom", "The only garlic-shrimp sauté photograph shows a single prawn, not the dish."],
  ["dish-shorbet-adas", "No photograph titled for this soup exists; other lentil-soup photographs belong to their own named dishes."],
  ["dish-samak-bi-tahini", "No photograph of fish baked in tahini sauce found."],
  ["dish-chicken-tagine-lemon-onion", "Chicken-tagine photographs show olives or couscous service; this recipe has neither."],
  ["dish-lamb-tagine-chickpea", "The only lamb-tagine photograph is a sweet prune and raisin Eid tagine with a hand in frame."],
  ["dish-fish-tagine-chermoula", "Fish-tagine photographs are dressed with olives and preserved lemon; this recipe contains neither."],
  ["dish-shrimp-tagine-moroccan", "No photograph of a Moroccan shrimp tagine found."],
  ["dish-chickpea-tagine-spinach", "No photograph of a chickpea and spinach tagine found."],
  ["dish-turkey-tagine-quinoa", "No photograph of a turkey and quinoa tagine exists."],
  ["dish-chicken-almond-tagine", "No photograph of an almond chicken tagine found."],
  ["dish-chickpea-egg-tagine", "No photograph of a chickpea and egg tagine found."],
  ["dish-white-fish-tagine", "The same olive-dressed fish-tagine photographs are the only ones found."],
  ["dish-lamb-quinoa-pilaf", "No photograph of a lamb and quinoa pilaf found."],
  ["dish-jp-salmon-egg-rice-bowl", "Hunted (4 passes, Nov 2026): Commons holds salmon-soboro bentos without egg and a chicken-soboro don; no salmon-and-egg rice bowl photograph."],
  ["dish-jp-steamed-chicken-sesame", "Hunted (4 passes, Nov 2026): only chicken salads, sashimi plates and noodle bowls surfaced; no steamed chicken over sesame cabbage photograph."],
  ["dish-kr-grilled-mackerel-chilli", "Hunted (3 passes, Nov 2026): every grilled-mackerel photograph is plain godeungeo-gui without this dish's chilli-garlic glaze."],
  ["dish-cn-steamed-fish-ginger", "Hunted (3 passes, Nov 2026): Cantonese steamed fish on Commons is invariably photographed sitting in the soy dressing this recipe deliberately omits."],
  ["dish-cn-chicken-corn-soup", "Hunted (4 passes, Nov 2026): Commons holds slow-cooked whole-chicken soups and plain egg-drop soups, but no chicken-and-sweetcorn soup photograph."],
  ["dish-cn-clay-pot-chicken", "Hunted (3 passes, Nov 2026): results were steam-pot chicken soup and claypot rice (bo zai fan); no braised clay-pot chicken photograph."],
  ["dish-th-tofu-larb", "Hunted (4 passes, Nov 2026): Commons' larb photographs are all meat-based; no tofu or mushroom larb photograph."],
  ["dish-vn-ga-kho-gung", "Hunted (4 passes, Nov 2026): Commons' gà kho photographs are turmeric (kho nghệ) or lemongrass (kho sả) braises, plus beef and pork kho; no ginger braise (kho gừng) photograph."],
  ["dish-vn-goi-ga", "Hunted (3 passes, Nov 2026): no gỏi gà photograph on Commons; searches matched chicken-feet dishes and unrelated files."],
  ["dish-vn-turmeric-fish", "Every Commons turmeric-fish photograph is chả cá Lã Vọng, whose signature dill, absent from this recipe, dominates every frame (hunted Nov 2026)."],
  ["dish-vn-chicken-curry", "Hunted (3 passes, Nov 2026): Commons search returns only Indian chicken curries; no cà ri gà photograph found."],
  ["dish-id-spiced-baked-fish", "Hunted (2 passes, Nov 2026): Indonesian spiced-fish photographs on Commons are charcoal-grilled ikan bakar/panggang; none shows this dish's turmeric-coconut baked coating."],
  ["dish-us-white-chicken-chilli", "Hunted (3 passes, Nov 2026): no white chicken chilli photograph exists on Commons."],
  ["dish-us-bbq-chicken", "Hunted (3 passes incl. title search, Nov 2026): Commons' BBQ chicken photographs are bone-in grilled quarters and platters; no sauced chicken-breast plate."],
  ["dish-us-salmon-chowder", "The only chowder bowl on Commons is a mixed seafood chowder whose own title lists clams, scallops and shrimp, none in this recipe; the rest were a recipe clipping and packaged tubs (hunted Nov 2026)."],
  ["dish-us-cod-cakes", "Hunted (3 passes incl. title search, Nov 2026): no New England cod cake photograph on Commons; the Portuguese pastel de bacalhau is a different form (deep-fried salt-cod fritter)."],
  ["dish-us-southwest-scramble", "Hunted (2 passes, Nov 2026): results were English breakfasts, breakfast tacos and chilaquiles; no southwest egg scramble photograph."],
  ["dish-us-buffalo-chicken", "Hunted (2 passes, Nov 2026): Commons' buffalo chicken photographs are wings, this dish is breast, plus Buffalo, NY street scenes."],
  ["dish-mx-chicken-tacos-pastor", "Hunted (2 passes, Nov 2026): tacos al pastor on Commons are pork (the classic); no chicken al pastor photograph exists."],
  ["dish-mx-ropa-vieja-pollo", "Hunted (2 passes, Nov 2026): ropa vieja on Commons is beef; no shredded-chicken ropa vieja photograph."],
  ["dish-mx-arepas-beans-cheese", "Hunted (2 passes, Nov 2026): the only arepa photographs found are carne mechada (beef); no black-bean and cheese (dominó) arepa photograph on Commons."],
  ["dish-pe-pollo-saltado", "Hunted (2 passes, Nov 2026): Commons holds tallarín saltado (noodle) plates and chifa scenes, but no pollo saltado photograph."],
  ["dish-br-escondidinho", "Commons' escondidinho photographs are titled carne seca (beef) or camarão (shrimp), this is the chicken version, and the one generically-titled file is a sunset photograph (hunted Nov 2026)."],
  ["dish-pl-rosol", "Hunted 2026-11-17: every free-licence rosół photograph on Commons serves the broth with noodles, this recipe is a sliced-chicken and potato rosół with no noodles, so no photograph depicts it truthfully."],
  ["dish-pl-bigos-style", "Hunted 2026-11-17: Commons' bigos photographs are the classic sauerkraut version with kiełbasa and pork (sausage rounds visible in the closest candidates); this dish is a fresh-cabbage chicken adaptation with neither, and no photograph of that version exists under a free licence."],
  ["dish-de-bauernfruhstuck", "Hunted 2026-11-17: every Bauernfrühstück (and Hoppelpoppel) photograph on Commons is studded with the ham or bacon the classic is made with, this recipe is egg, potato and onion only, so none depicts it truthfully."],
  ["dish-hu-rakott-krumpli-style", "Hunted 2026-11-17: every rakott krumpli photograph carries the classic sausage or bacon layer (crisped szalonna strips cover the closest candidate); this layered potato, egg and yogurt version has no meat layer."],
  ["dish-cz-cockova", "Hunted 2026-11-17: Commons' čočková photographs are a series of the brown-lentil version with frankfurters, sausage slices throughout, this soup is red lentils with no sausage, and no photograph of it exists under a free licence."],
  ["dish-cz-kure-na-smetane-style", "Hunted 2026-11-17: no photograph of kuře na smetaně exists on Commons under any search language tried, and the English chicken-in-cream-sauce results are pasta dishes, left photo-less rather than given a different dish's picture."],
  ["dish-blk-kavarma", "Hunted 2026-11-17: the only true kavarma photograph on Commons is crowned with a baked egg this recipe does not have, and every other result under the name is Indian korma, a different dish."],
  ["dish-dk-honsesalat", "Hunted 2026-11-17: the only hønsesalat photographs crown the salad with a bacon rasher, this recipe has no bacon, or share the plate with a beef-tartar smørrebrød; no clean photograph of the salad itself exists."],
  ["dish-dk-aeggekage", "Hunted 2026-11-17: no photograph of the Danish egg cake exists on Commons, searches in several spellings return omelettes from other cuisines instead."],
  ["dish-is-plokkfiskur", "Hunted 2026-11-17: the only two plokkfiskur photographs on Commons show a cheese-crusted gratin; this recipe is an un-gratinated stovetop stew with no cheese, so neither depicts it."],
  ["dish-no-fiskegrateng", "Hunted 2026-11-17: no photograph of the Norwegian fish gratin exists on Commons under any spelling tried; the fish-gratin results are French dishes."],
  ["dish-dk-stegt-kylling", "Hunted 2026-11-17: no photograph of Danish roast chicken with cream sauce and cucumber salad exists on Commons, the searches return American fried chicken instead."],
  ["dish-gb-full-english-style", "Hunted 2026-11-17: every full-English photograph carries the bacon, sausage or black pudding this meat-free plate omits, and the closest vegetarian plate still includes a veggie sausage (confirmed at full resolution), left photo-less rather than show meats the dish does not contain."],
  ["dish-gb-skirlie-egg", "Hunted 2026-11-17: no photograph of skirlie, the Scottish oatmeal and onion dish, exists on Commons in any form tried."],
  ["dish-ie-dublin-coddle-style", "Hunted 2026-11-17: every Dublin coddle photograph centres the sausages and bacon of the classic; this version is turkey, potato and carrot only, so none depicts it truthfully."],
  ["dish-ge-chirbuli", "Hunted 2026-11-17 in Latin, Cyrillic and Georgian scripts: no photograph of chirbuli, eggs poached in walnut and tomato sauce, exists on Commons."],
  ["dish-et-misir-wat", "Hunted 2026-11-17: the only misir wot photograph on Commons shows the lentil stew as a small mound on a shared injera tray dominated by a meat dish; no photograph of the stew itself exists under a free licence."],
  ["dish-ng-pepper-soup", "Hunted 2026-11-17: Commons' pepper soups are goat, catfish and fish versions, and the single chicken pepper soup photograph carries a burned-in phone-camera watermark, left photo-less rather than use the wrong protein or a watermarked image."],
  ["dish-ke-nyama-choma-style", "Hunted 2026-11-17: every nyama choma photograph on Commons is a goat or beef roast, whole legs and red-meat chunks; this version is grilled turkey and no poultry choma photograph exists."],
  ["dish-za-chakalaka", "Hunted 2026-11-17: photographs show the chakalaka bean relish alone or served with beef sausage or beef stew; none shows it with grilled chicken, the protein headline of this dish."],
  ["dish-ng-shrimp-okra", "Hunted 2026-11-17: every okra soup photograph on Commons carries whole dried fish, snail or assorted meats in plain view; no shrimp okra soup photograph exists under a free licence."],
  ["dish-et-azifa", "Hunted 2026-11-17: no photograph of azifa, the Ethiopian green lentil salad, exists on Commons in any phrasing tried."],
  ["dish-tz-kuku-paka", "Hunted 2026-11-17: no photograph of kuku paka exists on Commons in any phrasing tried."],
  ["dish-jm-curry-chicken", "Hunted 2026-11-17 in three phrasings: Commons holds no photograph of Jamaican curry chicken, only a restaurant table spread in which it cannot be identified and a photograph of a restaurant building."],
  ["dish-cu-fricase-de-pollo", "Hunted 2026-11-17: every chicken fricassee photograph on Commons is the French cream style or a wine-braised plate; none is the Cuban tomato fricasé this recipe makes."],
  ["dish-tt-corn-soup", "Hunted 2026-11-17: no photograph of Trinidad corn soup, the split pea, corn and dumpling soup, exists on Commons; only generic blended corn soups and a photograph of a vendor beside his pot."],
  ["dish-co-frijoles-style", "Hunted 2026-11-17: frijoles antioqueños appear on Commons only as one component of full bandeja paisa platters carrying pork; no photograph of the beans with plantain themselves exists under a free licence."],
  ["dish-ar-carbonada-style", "Hunted 2026-11-17: Commons' carbonadas are the Chilean clear soup and the Belgian beer-braised carbonnade, neither is the Argentine squash-and-corn carbonada this recipe makes."],
  ["dish-langarwali-dal", "Hunted 2026-11-16 and re-hunted 2026-11-17: Commons holds langar-hall serving scenes and other named whole-urad dals (dal makhani, Daal Peshawari) pinned to their own dishes, but no photograph of the plain langarwali dal itself."],
  ["dish-chicken-yakhni", "Hunted 2026-11-16 and re-hunted 2026-11-17: the candidates remain yakhni pulao (a rice dish), 'Yakhni style chicken.jpg' (a dark masala chicken, not the pale yogurt gravy) and 'Yakhni from kashmir.jpg' (a pan of gravy whose single piece of meat cannot be verified as chicken), no verifiable chicken yakhni photograph."],
  ["dish-matar-nimona", "Hunted 2026-11-16 and re-hunted 2026-11-17 (nimona, hare matar and category-tree searches): the only pea-curry photographs on Commons are Bengali matar ghugni, a different dish, no photograph of the crushed-pea UP nimona."],
  ["dish-tudkiya-bhath", "Hunted 2026-11-16 and re-hunted 2026-11-17 (including the full Cuisine of Himachal Pradesh tree): no photograph of tudkiya bhath exists on Commons, the searches returned only Himachali brass cookware."],
  ["dish-aktori", "Hunted 2026-11-16 and re-hunted 2026-11-17 (aktori, Lahaul and buckwheat-pancake searches, Himachal tree): no photograph of aktori was found on Commons."],
  ["dish-palak-thepla", "Hunted 2026-11-16 and re-hunted 2026-11-17: Commons thepla photographs are methi or unspecified theplas, none could be verified as the palak (spinach) thepla, and a methi thepla photograph would mislabel the dish."],
  ["dish-recheado-mackerel", "Hunted 2026-11-16 and re-hunted 2026-11-17: 'Mackerel Recheado.jpg' depicts the dish exactly but carries a stylised blog signature watermark burned into the frame, and the Konkani-titled photograph is likewise watermarked, no clean free photograph."],
  ["dish-patra-style-fish", "Hunted 2026-11-16 and re-hunted 2026-11-17 (patra ni machhi, patrani and banana-leaf Parsi fish searches): no photograph of the dish exists on Commons, the results were books and documents only."],
  ["dish-sali-boti-style", "Hunted 2026-11-16 and re-hunted 2026-11-17 (sali boti and salli boti searches, Parsi cuisine tree): no photograph of sali boti was found on Commons."],
  ["dish-aloo-pitika", "Hunted 2026-11-16 and re-hunted 2026-11-17 (including the Cuisine of Assam tree): aloo pitika appears only as a small side mound within Assamese thalis and komal saul plates, no photograph of the pitika itself."],
  ["dish-dal-pithi", "Hunted 2026-11-16 and re-hunted 2026-11-17 (dal pithi and dal ki dulhan searches, Bihar tree): no photograph of dal pithi exists on Commons; dal dhokli, the Gujarati sibling, was not substituted."],
  ["dish-momo-chutney", "Hunted 2026-11-16 and re-hunted 2026-11-17: the tomato-sesame momo chutney appears only as a small dip bowl in momo plates, no photograph of the chutney itself."],
  ["dish-bhutte-ka-kees", "Hunted 2026-11-16 and re-hunted 2026-11-17 (bhutte ka kees, bhutta kees and Indore corn searches, Madhya Pradesh tree): bhutta photographs are roasted corn on the cob, no photograph of bhutte ka kees exists on Commons."],
  ["dish-bhopali-gosht-korma-style", "Hunted 2026-11-16 and re-hunted 2026-11-17: the gosht photographs are aloo gosht, arbi gosht, bhunna gosht and a generic kadhai gosht, no Bhopali gosht korma photograph on Commons."],
  ["dish-khopra-patties", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of Indore khopra patties was found on Commons (the khopra titles are a lizard and a Himalayan hill)."],
  ["dish-chhattisgarhi-fara", "Hunted 2026-11-16 and re-hunted 2026-11-17 (fara and chousela searches plus the Cuisine of Chhattisgarh tree): no photograph of Chhattisgarhi fara was found on Commons."],
  ["dish-chila", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of the Chhattisgarhi rice-flour chila was found on Commons (the chila photographs there are besan/moong chilas of other regions)."],
  ["dish-bafauri-style", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of bafauri was found on Commons."],
  ["dish-dubki-kadhi", "Hunted 2026-11-16 and re-hunted 2026-11-17: no photograph of dubki kadhi was found on Commons (the 'Dubki' files are a Russian village and its park)."],
  ["dish-vazhakkai-varuval", "Hunted 2026-11-16 and re-hunted 2026-11-17: the vazhakkai photographs on Commons are the batter-fried bajji and the finely diced poriyal, neither is the spice-roasted thick-round varuval, so the dish stays photo-less rather than borrow a sibling."],
  ["dish-ennegai", "Hunted 2026-11-16 and re-hunted 2026-11-17 (ennegai and badanekai searches): the only stuffed-brinjal photographs on Commons are already pinned to their own regional dishes (bharli vangi, gutti vankaya), no verifiable ennegai photograph."],
  ["dish-shake-boiled-egg-banana", "Hunted 2026-11-17: Commons has no photograph of a blended egg shake, searches surface plated egg dishes (eggs benedict, frittata) only, and a plated-egg photo would misrepresent a blended drink."],
  ["dish-shake-boiled-egg-mango", "Hunted 2026-11-17: Commons has no photograph of a blended egg shake, searches surface plated egg dishes (eggs benedict, frittata) only, and a plated-egg photo would misrepresent a blended drink."],
  ["dish-shake-egg-oat-breakfast", "Hunted 2026-11-17: Commons has no photograph of a blended egg shake, searches surface plated egg dishes (eggs benedict, frittata) only, and a plated-egg photo would misrepresent a blended drink."],
  ["dish-shake-egg-cottage-cheese-banana", "Hunted 2026-11-17: Commons has no photograph of a blended egg shake, searches surface plated egg dishes (eggs benedict, frittata) only, and a plated-egg photo would misrepresent a blended drink."],
  ["dish-shake-tofu-banana-peanut", "Hunted 2026-11-17: no Commons photograph depicts a tofu smoothie; the tofu photographs there are salads and plated dishes, which do not depict a blended drink."],
  ["dish-shake-tofu-mango-pumpkin-seed", "Hunted 2026-11-17: no Commons photograph depicts a tofu smoothie; the tofu photographs there are salads and plated dishes, which do not depict a blended drink."],
  ["dish-shake-tofu-strawberry-almond", "Hunted 2026-11-17: no Commons photograph depicts a tofu smoothie; the tofu photographs there are salads and plated dishes, which do not depict a blended drink."],
  ["dish-shake-tofu-oat-banana-peanut", "Hunted 2026-11-17: no Commons photograph depicts a tofu smoothie; the tofu photographs there are salads and plated dishes, which do not depict a blended drink."],
  ["dish-shake-tofu-pineapple-coconut", "Hunted 2026-11-17: one piña colada smoothie photograph exists (a vegan diner snapshot) but its blend could not be verified as tofu-based, so the shake stays photo-less rather than borrow an unverified photo."],
  ["dish-shake-tempeh-banana-peanut", "Hunted 2026-11-17: no Commons photograph of a tempeh smoothie exists, tempeh searches return plated tempeh dishes only."],
  ["dish-shake-tempeh-mango-oat", "Hunted 2026-11-17: no Commons photograph of a tempeh smoothie exists, tempeh searches return plated tempeh dishes only."],
  ["dish-shake-tempeh-strawberry-oat", "Hunted 2026-11-17: no Commons photograph of a tempeh smoothie exists, tempeh searches return plated tempeh dishes only."],
  ["dish-shake-edamame-tofu-banana", "Hunted 2026-11-17: no Commons photograph of an edamame smoothie exists."],
  ["dish-shake-edamame-tofu-mango-mint", "Hunted 2026-11-17: no Commons photograph of an edamame smoothie exists."],
  ["dish-shake-edamame-peanut-oat-banana", "Hunted 2026-11-17: no Commons photograph of an edamame smoothie exists."],
  ["dish-shake-quinoa-banana", "Hunted 2026-11-17: no Commons photograph of a quinoa smoothie exists."],
  ["dish-shake-quinoa-mango", "Hunted 2026-11-17: no Commons photograph of a quinoa smoothie exists."],
  ["dish-shake-sattu-banana", "Hunted 2026-11-17: the only Commons photograph of a sattu drink (Sattu Ghol) repeatedly refused download (HTTP 429) so it could not be eyeballed or licence-verified; sattu powder and sattu paratha photographs do not depict the shake."],
  ["dish-shake-sattu-mango", "Hunted 2026-11-17: the only Commons photograph of a sattu drink (Sattu Ghol) repeatedly refused download (HTTP 429) so it could not be eyeballed or licence-verified; sattu powder and sattu paratha photographs do not depict the shake."],
  ["dish-shake-sattu-oat", "Hunted 2026-11-17: the only Commons photograph of a sattu drink (Sattu Ghol) repeatedly refused download (HTTP 429) so it could not be eyeballed or licence-verified; sattu powder and sattu paratha photographs do not depict the shake."],
  ["dish-shake-sattu-tofu-banana", "Hunted 2026-11-17: the only Commons photograph of a sattu drink (Sattu Ghol) repeatedly refused download (HTTP 429) so it could not be eyeballed or licence-verified; sattu powder and sattu paratha photographs do not depict the shake."],
  ["dish-shake-sattu-cottage-cheese-banana", "Hunted 2026-11-17: the only Commons photograph of a sattu drink (Sattu Ghol) repeatedly refused download (HTTP 429) so it could not be eyeballed or licence-verified; sattu powder and sattu paratha photographs do not depict the shake."],
  ["dish-shake-turmeric-milk-greek-yogurt", "Hunted 2026-11-17: Commons golden-milk photographs are a branded product packet, a dessert ramekin, or turmeric powder spooned over milk, none depicts the finished blended shake."],
  ["dish-shake-greek-yogurt-watermelon-mint", "Hunted 2026-11-17: the only watermelon smoothie photograph shows a dark berry-coloured drink, which contradicts this pale pink watermelon-yogurt shake, so it was rejected on inspection."],
  ["dish-shake-greek-yogurt-apple-cinnamon", "Hunted 2026-11-17: Commons apple smoothie photographs are carrot-apple or apple-orange blends whose colour contradicts this pale apple-cinnamon shake."],
  ["dish-shake-oat-apple-greek-yogurt", "Hunted 2026-11-17: Commons apple smoothie photographs are carrot-apple or apple-orange blends whose colour contradicts this pale apple-oat shake."],
  ["dish-shake-greek-yogurt-pear-ginger", "Hunted 2026-11-17: no Commons photograph of a pear smoothie exists; generic fruit-preparation photographs do not depict the drink."],
  ["dish-shake-sweet-potato-greek-yogurt", "Hunted 2026-11-17: no Commons photograph of a sweet potato smoothie exists."],
  ["dish-shake-greek-yogurt-cottage-cheese-oat", "Hunted 2026-11-17: the only oatmeal-smoothie photograph on Commons shows a person drinking streetside with the drink itself barely visible, no photograph depicts the shake itself."],
  ["dish-pw2-bombay-masala-toast", "Hunted 2026-11-17: Commons results for masala toast are generic cheese toasts and full breakfast plates, none verifiably this egg-and-paneer masala toast."],
  ["dish-pw2-chakka-puzhukku-eggs", "Hunted 2026-11-17: no free-licence photograph of chakka puzhukku (mashed jackfruit) with eggs exists on Commons; results are raw jackfruit and jackfruit curries."],
  ["dish-pw2-chemmeen-mutta-thoran", "Hunted 2026-11-17: the only prawn-and-egg photographs on Commons are sauced omelettes and curries, none shows this dry Kerala thoran."],
  ["dish-pw2-chicken-egg-drop-soup", "Hunted 2026-11-17: Commons egg-drop soup photographs are plain sweetcorn soups without chicken, or restaurant bowls that could not be verified as this soup."],
  ["dish-pw2-chicken-kothu-parotta", "Hunted 2026-11-17: kothu parotta photographs on Commons are stall scenes and mutton kothu, no verifiable chicken kothu parotta plate under a free licence."],
  ["dish-pw2-chicken-reshmi-kebabs", "Hunted 2026-11-17: kebab photographs on Commons are seekh, tikka or doner, none verifiably reshmi kebabs."],
  ["dish-pw2-chicken-silog", "Hunted 2026-11-17: silog photographs on Commons are tapsilog/longsilog (different proteins) or plain garlic rice, no chicken silog plate."],
  ["dish-pw2-cottage-blintzes", "Hunted 2026-11-17: the only blintz photographs are a frozen packaged product being fried and dessert blintzes with jam, rejected as branded/sweet."],
  ["dish-pw2-cuscuz-nordestino", "Hunted 2026-11-17: Commons cuscuz photographs are Moroccan couscous dishes and cuscuz paulista, not the steamed cornmeal cuscuz nordestino with egg."],
  ["dish-pw2-dimer-chop", "Hunted 2026-11-17: no free-licence photograph of dimer chop (Bengali egg devil) was found; results are devilled eggs and unrelated chops."],
  ["dish-pw2-egg-bread-upma", "Hunted 2026-11-17: bread upma photographs on Commons could not be verified as the egg version; results are plain bread upma and poha."],
  ["dish-pw2-egg-tadka", "Hunted 2026-11-17: dhaba egg tadka photographs on Commons are dal tadka bowls without visible egg, none verifiably this dish."],
  ["dish-pw2-eggplant-cottage-rolls", "Hunted 2026-11-17: eggplant roll photographs on Commons are rollatini with ricotta in tomato sauce, a different dish from these paneer-stuffed rolls."],
  ["dish-pw2-garlic-shrimp-skewers", "Hunted 2026-11-17: shrimp skewer photographs on Commons are barbecue-grill scenes with mixed meats or raw product shots, no clean plate of garlic shrimp skewers."],
  ["dish-pw2-grechka-tofu", "Hunted 2026-11-17: grechka photographs on Commons are plain boiled groats (one result was a portrait, not food), none shows the tofu-and-egg bowl."],
  ["dish-pw2-khai-yat-sai", "Hunted 2026-11-17: no free-licence photograph of khai yat sai (Thai stuffed omelette) was found on Commons."],
  ["dish-pw2-khao-tom", "Hunted 2026-11-17: the only khao tom photograph on Commons is a plain rice soup without the chicken and egg, rejected as not this dish."],
  ["dish-pw2-kothu-idiyappam", "Hunted 2026-11-17: no free-licence photograph of kothu idiyappam (egg kothu string hoppers) was found on Commons."],
  ["dish-pw2-lentil-walnut-pate", "Hunted 2026-11-17: no free-licence photograph of a lentil-walnut pâté was found; results are meat pâtés and generic dips."],
  ["dish-pw2-mackerel-pate-toasts", "Hunted 2026-11-17: Commons offers whole smoked mackerel plates, but no photograph of mackerel pâté on toast."],
  ["dish-pw2-mamaliga", "Hunted 2026-11-17: mamaliga photographs on Commons are plain polenta mounds and full banquet plates, none shows this egg-and-cheese serving."],
  ["dish-pw2-masala-edamame-chaat", "Hunted 2026-11-17: edamame photographs on Commons are plain salted pods in restaurant bowls, none shows the masala chaat toss."],
  ["dish-pw2-masala-egg-idli", "Hunted 2026-11-17: idli photographs on Commons are plain steamed idli plates with sambar, none shows chopped masala-fried idli with egg."],
  ["dish-pw2-oats-cottage-patties", "Hunted 2026-11-17: no free-licence photograph of oat-and-cottage-cheese patties was found; results are oatcakes and veggie burgers."],
  ["dish-pw2-perkedel", "Hunted 2026-11-17: perkedel photographs on Commons are potato-only fritters or stall scenes, none verifiably the chicken-and-potato cakes."],
  ["dish-pw2-quinoa-black-bean-bites", "Hunted 2026-11-17: no free-licence photograph of quinoa black-bean bites was found; results are falafel and generic bean burgers."],
  ["dish-pw2-rajma-kebabs", "Hunted 2026-11-17: no free-licence photograph of rajma kebabs was found on Commons; results are rajma curries."],
  ["dish-pw2-roasted-soya-nuts", "Hunted 2026-11-17: roasted soybean photographs on Commons are raw/dried soybean product shots, none shows the spiced roasted snack served."],
  ["dish-pw2-roti-telur", "Hunted 2026-11-17: roti telur photographs on Commons are murtabak and roti canai shots, none verifiably the plain egg roti."],
  ["dish-pw2-sali-par-eedu", "Hunted 2026-11-17: no free-licence photograph of sali par eedu (Parsi eggs on potato straws) exists on Commons."],
  ["dish-pw2-salmon-crepe-rolls", "Hunted 2026-11-17: smoked salmon crepe photographs on Commons are dessert crepes and salmon platters, none shows these savoury rolls."],
  ["dish-pw2-sardine-egg-toasts", "Hunted 2026-11-17: sardine toast photographs on Commons are plain sardines on toast without egg, or tinned-product shots, rejected."],
  ["dish-pw2-soya-bean-kebabs", "Hunted 2026-11-17: soya kebab search results on Commons are doner and meat kebabs, no verifiable soya kebab photograph."],
  ["dish-pw2-tofu-peanut-congee", "Hunted 2026-11-17: congee photographs on Commons are topped with pork floss or century egg, none shows this vegan tofu-and-peanut congee."],
  ["dish-pw2-tofu-satay", "Hunted 2026-11-17: every satay photograph on Commons is chicken satay, no tofu satay under a free licence."],
  ["dish-pw2-tuna-egg-rice-bowl", "Hunted 2026-11-17: no free-licence photograph of a tuna-and-egg rice bowl was found; results are poke bowls and tuna salads."],
  ["dish-pw2-tuna-potato-kebabs", "Hunted 2026-11-17: tuna cutlet/kebab searches on Commons return only scanned cookbooks, no food photograph exists."],
  ["dish-pw2-turkey-biscuits-gravy", "Hunted 2026-11-17: biscuits-and-gravy photographs on Commons are pork-sausage versions in diners, none verifiably turkey."],
  ["dish-pw2-turkey-pinwheels", "Hunted 2026-11-17: pinwheel photographs on Commons are dessert swiss rolls and party platters with ham, none shows these turkey tortilla pinwheels."],
  ["dish-muringakka-meen-curry", "Hunted 2026-11-17: Kerala fish-curry photographs are plentiful, but none verifiably shows the drumstick pieces that define this curry, the dish stays photo-less rather than borrow a plain meen curry."],
  ["dish-chemmeen-thoran", "Hunted 2026-11-17: Commons' chemmeen photographs are curries, fries and mango curries, no prawn thoran with its crushed coconut under a free licence."],
  ["dish-chemmeen-mulakittathu", "Hunted 2026-11-17: the one Malabar prawn curry photograph carries a baked-in text overlay, and the other candidate is a coconut-milk prawn curry, neither is the fiery chilli mulakittathu."],
  ["dish-kozhi-pepper-fry", "Hunted 2026-11-17: the Kerala chicken-fry photographs are generic or battered fries, none shows the dry black-pepper coating of a pepper fry."],
  ["dish-erachi-varattiyathu", "Hunted 2026-11-17: the verifiable varattiyathu/ularthiyathu photographs are beef fry, a different meat from this lamb dish, so it stays photo-less rather than borrow beef."],
  ["dish-erachi-ishtu", "Hunted 2026-11-17: ishtu photographs on Commons are potato and chicken stews, no lamb ishtu under a free licence."],
  ["dish-kappa-erachi", "Hunted 2026-11-17: kappa-and-meat photographs are beef kappa biriyani, a different meat from this lamb preparation, so the dish stays photo-less."],
  ["dish-kadala-varutharacha-curry", "Hunted 2026-11-17: the verifiable kadala-curry photographs are already pinned to the library's kadala curry or show the pale coconut-milk style, none shows the dark roasted-coconut varutharacha gravy."],
  ["dish-kadala-thoran", "Hunted 2026-11-17: dry kadala photographs are roasts and fries without the grated coconut that defines a thoran."],
  ["dish-soya-varutharacha-curry", "Hunted 2026-11-17: every soya-curry photograph on Commons depicts TVP soya chunks; this dish cooks whole soybeans, and no whole-bean curry photograph was found."],
  ["dish-soya-pepper-fry-kerala", "Hunted 2026-11-17: soya-fry results are TVP-chunk dishes and unrelated plates, no whole-soybean pepper fry photograph."],
  ["dish-soya-thenga-pal-curry", "Hunted 2026-11-17: as with the other whole-soybean dishes, the only soya-curry photographs depict TVP chunks, not whole beans in coconut milk."],
  ["dish-cherupayar-puzhukku", "Hunted 2026-11-17: the only puzhukku photographs are Thiruvathira puzhukku, a mixed-tuber festival mash, a different dish from this green-gram puzhukku."],
  ["dish-mutta-varutharacha-curry", "Hunted 2026-11-17: Kerala egg-curry photographs show the standard onion-tomato masala served with idiyappam, none verifiably shows the roasted-coconut varutharacha gravy."],
  ["dish-kadala-mutta-curry", "Hunted 2026-11-17: kadala photographs are puttu plates with kadala curry alone, none shows the egg-and-kadala combination."],
  ["dish-mutta-mappas", "Hunted 2026-11-17: 'mappas' searches return cartography rather than food, and egg-molee variants found nothing, no photograph of mutta mappas under a free licence."],
  ["dish-choora-curry", "Hunted 2026-11-17: the one verifiable South-Indian tuna-curry photograph is already pinned to tuna-potato curry, a different dish; no other tuna curry photograph was found."],
  ["dish-paneer-korma", "Hunted 2026-11-17: the file titled 'Paneer Korma with Gravy' actually depicts a dry paneer starter with chutneys, and the 'Shahi Paneer Korma' shot is too blurred to verify, no truthful paneer korma photograph."],
  ["dish-paneer-chaman", "Hunted 2026-11-17: the methi paneer chaman file shows only its buffet serving pot, and the remaining 'Chaman' files are unrelated, no photograph of the dish itself."],
  ["dish-paneer-chettinad", "Hunted 2026-11-17: Chettinad results are chicken, fish and kadai paneer, no paneer Chettinad photograph under a free licence."],
  ["dish-paneer-kadhi", "Hunted 2026-11-17: kadhi photographs are the plain kadhi or the pakora kadhi, none shows paneer cubes in kadhi."],
  ["dish-paneer-makai-masala", "Hunted 2026-11-17: no corn-and-paneer curry photograph exists on Commons, the makai results were tortillas and thalis."],
  ["dish-egg-korma", "Hunted 2026-11-17: the egg kurma photographs show the potato variant in a thin yellow gravy, not this cashew-yogurt korma, so the dish stays photo-less."],
  ["dish-egg-keema-masala", "Hunted 2026-11-17: the candidates are meat-keema plates topped with whole eggs, a different dish from this grated-egg keema masala."],
  ["dish-egg-vindaloo", "Hunted 2026-11-17: the only vindaloo photograph found is a beef vindaloo, no egg vindaloo under a free licence."],
  ["dish-egg-pulusu", "Hunted 2026-11-17: the one egg-pulusu photograph is a bhagara-rice thali where the pulusu is a small side portion, no photograph of the pulusu itself."],
  ["dish-egg-masoor-dal", "Hunted 2026-11-17: no photograph of egg cooked with masoor dal was found, the plates found keep egg curry and dal as separate items."],
  ["dish-doi-dim", "Hunted 2026-11-17: no photograph of doi dim (egg in yogurt gravy) was found on Commons under a free licence."],
  ["dish-palak-egg-curry", "Hunted 2026-11-17: the one green egg curry photograph carries a photographer's signature watermark across the dish, rejected; no clean alternative was found."],
  ["dish-mushroom-egg-curry", "Hunted 2026-11-17: no photograph of a mushroom egg curry was found, the results were Thai night-market and unrelated plates."],
  ["dish-paneer-egg-bhurji", "Hunted 2026-11-17: bhurji photographs are paneer-cube masala or egg-only crumble, none shows the combined paneer-and-egg bhurji."],
  ["dish-tofu-masala", "Hunted 2026-11-17: tofu-curry photographs are Thai red curries or tofu tikka masala, none shows this onion-tomato masala."],
  ["dish-tofu-bhurji", "Hunted 2026-11-17: no photograph of tofu bhurji was found across repeated hunts, the scramble photographs are Western plates."],
  ["dish-palak-tofu", "Hunted 2026-11-17: the one file titled palak tofu is a meal-prep tub of rice and spinach with no tofu visible."],
  ["dish-mushroom-tofu-masala", "Hunted 2026-11-17: the one tofu-and-mushroom curry file is a rice don bowl where the curry is a sauce over rice, not this masala."],
  ["dish-tempeh-masala", "Hunted 2026-11-17: every file titled 'Tempeh curry' in the candidate set is a raw-tempeh preparation shot on a chopping board, no photograph of the cooked curry."],
  ["dish-tempeh-pepper-fry", "Hunted 2026-11-17: fried-tempeh photographs are plain fries with dipping sauces or a watermarked paprika stir-fry, no pepper fry."],
  ["dish-tempeh-palak", "Hunted 2026-11-17: no photograph of tempeh with spinach was found on Commons."],
  ["dish-edamame-masala", "Hunted 2026-11-17: no photograph of an edamame curry was found, the only hit was a sambar."],
  ["dish-edamame-paneer-masala", "Hunted 2026-11-17: no photograph of edamame with paneer was found on Commons."],
  ["dish-soya-palak", "Hunted 2026-11-17: no photograph of a whole-soybean and spinach curry was found; soya results depict TVP chunks."],
  ["dish-soya-chettinad", "Hunted 2026-11-17: no photograph of soya Chettinad was found on Commons."],
  ["dish-mushroom-soya-masala", "Hunted 2026-11-17: no photograph of a mushroom and whole-soybean masala was found on Commons."],
  ["dish-soya-egg-curry", "Hunted 2026-11-17: soya-egg results are Chinese soy-sauce eggs and noodle plates, no soya egg curry photograph."],
  ["dish-tofu-egg-bhurji", "Hunted 2026-11-17: the one tofu scramble photograph is a Western spinach scramble, not an Indian masala bhurji."],
  ["dish-paneer-soya-masala", "Hunted 2026-11-17: the one soya-with-paneer photograph is a dry granule salad tub, not this gravy masala."],
  ["dish-dal-amti", "Hunted 2026-11-17: amti appears on Commons only inside full Maharashtrian thali spreads, never as the dish itself."],
  ["dish-mangodi-ki-sabzi", "Hunted 2026-11-17: no photograph of mangodi ki sabzi was found, the one vadi file is a distant thali photograph."],
  ["dish-dal-paneer", "Hunted 2026-11-17: dal-and-paneer appears only as separate items inside thali spreads, no photograph of dal paneer itself."],
  ["dish-peanut-amti", "Hunted 2026-11-17: shengdana/peanut-curry searches return raw peanuts, plants and snacks, no photograph of the amti."],
  ["dish-peanut-paneer", "Hunted 2026-11-17: no photograph of peanut paneer was found, the results were peanut-butter sandwiches and unrelated plates."],
  ["dish-chana-egg-curry", "Hunted 2026-11-17: no photograph of a chickpea and egg curry was found on Commons."],
  ["dish-fish-korma", "Hunted 2026-11-17: no photograph of fish korma was found, the single hit was a doi machh, a different dish."],
  ["dish-doi-maach", "Hunted 2026-11-17: the one doi machh photograph shows a dark spiced fish curry served with rice, not the pale yogurt gravy that defines doi maach."],
  ["dish-lk-ambul-thiyal-style", "Hunted 2026-11-17 (ambul thiyal and intitle sweeps): Commons returns only unrelated 'ambul' files, a Lithuanian village, a German clinic seal, a flower, no photograph of the sour fish curry."],
  ["dish-az-buglama-style", "Hunted 2026-11-17 (buglama and buğlama, English and Azerbaijani spellings, intitle sweeps): no photograph of the dish exists on Commons under a free licence."],
  ["dish-id-rendang-eggs", "Hunted 2026-11-17: the candidates were nasi lemak and nasi padang plates where the egg rendang is a minor side, and randang talua, the crispy flattened-egg preparation, a different dish, no photograph of whole eggs in rendang sauce."],
  ["dish-id-tempeh-bacem", "Hunted 2026-11-17: every bacem photograph on Commons is tahu (tofu) bacem or a mixed restaurant spread, no verifiable tempeh bacem photograph under a free licence."],
  ["dish-cn-steamed-tofu-shrimp", "Hunted 2026-11-17: the candidates were dim-sum baskets, prawn cheung fun and kaiseki courses, no photograph of steamed tofu-egg custard with shrimp under a free licence."],
  ["dish-ke-maharagwe", "Hunted 2026-11-17 (maharagwe, maharagwe wa nazi, Kenyan coconut beans): Commons returns only bean plants, pods and seed photographs, no photograph of the cooked dish."],
  ["dish-gt-jocon-style", "Hunted 2026-11-17 (jocón and jocon de pollo): every result is the French commune of Joucou, no photograph of the Guatemalan green chicken stew exists on Commons."],
  ["dish-br-frango-quiabo", "Hunted 2026-11-17: the candidates were a restaurant table where the dish cannot be isolated, an American fried-chicken-and-okra plate and a live chicken, no verifiable frango com quiabo photograph."],
  ["dish-iq-tashreeb-style", "Hunted 2026-11-17: the only dish photographs are Foodista-watermarked or show tashreeb gus (red meat), no watermark-free photograph of a chicken tashreeb under a free licence."],
  ["dish-br-xinxim-style", "Hunted 2026-11-17 and re-checked at finishing: both free photographs of xinxim are restaurant scenes with branded items legible in frame (a Guaraná bottle label in one, a branded menu stand and sauce bottle in the other), no clean photograph of the dish under a free licence."],

  /* The Bulgarian wave (2026-11-26): hunted in English, transliterated
     and Cyrillic. Each reason names what the hunt actually found. */
  ["dish-steamed-rice", "Added as the plan's plain base dish (method 14, M-160) and shipped photo-less: no Commons photograph has been reviewed for it yet, and none is invented in the meantime."],
  ["dish-bg-ovcharska-salata", "Hunted 2026-11-26 (ovcharska, овчарска салата, shepherd's salad): no photograph of ovcharska exists on Commons. The shepherd's-salad photographs found are the Turkish çoban salata, which carries no cheese, egg or ham."],
  ["dish-bg-zeleva-salata", "Hunted 2026-11-26 (zeleva salata, зелева салата, cabbage salad): the cabbage-salad photographs found are mayonnaise coleslaws, a different salad from the oil-and-vinegar Bulgarian one."],
  ["dish-bg-shkembe-gabi-style", "Hunted 2026-11-26 (mushroom soup): the photographs found are a hand-held takeaway cup on a pavement and a plain cream soup with no mushroom visible. Neither shows this soup at the bar."],
  ["dish-bg-ribena-chorba", "Hunted 2026-11-26 (ribena chorba, рибена чорба): the only Bulgarian fish-soup photograph is a festival crowd scene. The fish-soup photographs found are Hungarian halászlé, a paprika-red soup unlike this clear broth."],
  ["dish-bg-leshta-supa", "Hunted 2026-11-26 (leshta, супа от леща, lentil soup): the photographs found are smooth blended mercimek and a quinoa-lentil stew. The Bulgarian soup keeps its red lentils whole."],
  ["dish-bg-lamb-kavarma", "Hunted 2026-11-26 (kavarma, каварма): the one Commons kavarma photograph finishes the clay pot with a baked egg, which this recipe does not use."],
  ["dish-bg-bob-yahniya", "Hunted 2026-11-26 (bob yahniya, боб яхния, bean stew): no photograph of a Bulgarian bean yahniya exists on Commons. The bean-stew photographs found carry chorizo and bacon, which this dish does not use."],
  ["dish-bg-smilyanski-fasul", "Hunted 2026-11-26 (Smilyan beans, смилянски фасул): Commons holds photographs of the raw beans and their museum in Smilyan, not of the cooked dish."],
  ["dish-bg-piperki-byurek", "Hunted 2026-11-26 (piperki byurek, chushki burek): the only Commons file is a six-panel preparation collage with hands. No photograph of the finished dish exists."],
  ["dish-bg-pile-frikase", "Hunted 2026-11-26 (chicken fricassee): the photographs found carry mushrooms or a dark wine braise on polenta. Neither is this dish's plain white sauce."],
  ["dish-bg-plnena-skumriya", "Hunted 2026-11-26 (stuffed mackerel): the photographs found are a watermarked Goan recheado mackerel, a different stuffing and a different tradition."],
  ["dish-bg-buhti", "Hunted 2026-11-26 (buhti, бухти): no photograph of buhti exists on Commons. The fried-dough photographs found are Austrian Buchteln and flat mekitsi, different shapes."],
  ["dish-bg-mlechna-banitsa", "Hunted 2026-11-26 (mlechna banitsa, млечна баница): no photograph of milk banitsa exists on Commons."],
  ["dish-bg-tikvenik-style", "Hunted 2026-11-26 (tikvenik, bundevara): the photographs found are a preparation scene with people and a soft-focus roll. Neither meets the bar."],
  ["dish-bg-riba-plakiya", "Hunted 2026-11-26 (riba plakiya, fish stew): the fish-stew photographs found are a Croatian fish paprikash and an okra stew. No photograph of a Bulgarian fish plakiya exists on Commons."],
  ["dish-bg-ayran", "Hunted 2026-11-26 (ayran): the glass-of-ayran photographs found sit on printed advertising placemats, and the remaining files show supermarket shelves of packaged ayran. No clean photograph of a glass of ayran exists on Commons."],
  ["dish-bg-tsatsa-style", "Hunted 2026-11-26 (tsatsa, parjena caca): Commons' one tsatsa photograph shows whole fried sprats. This dish fries tilapia strips in the same style, so the photograph would show a different fish."],
  /* The Bulgarian wave 2 (2026-11-26): hunted across three rounds —
     the Commons search in Bulgarian and English, the cuisine
     category tree and the dish categories. What each hunt found is
     recorded; a bad or wrong photograph was never taken to raise
     the count. */
  ["dish-bg2-turshiya", "Hunted 2026-11-26 (turshiya, туршия): the photographs found are market-stall trays of olives and pastes and jars of mustard piccalilli, a different pickle. No photograph of a served or jarred Bulgarian turshiya at the bar."],
  ["dish-bg2-ogretin", "Hunted 2026-11-26 (ogretin, огретен): the gratin photographs found are a Japanese restaurant gratin on a printed menu, a ham casserole in a cluttered kitchen and jacket potatoes. None shows the potato ogretin."],
  ["dish-bg2-zapecheni-gabi", "Hunted 2026-11-26 (zapecheni gabi, печени гъби с кашкавал): every search returns pizzas. No photograph of mushrooms baked under cheese exists on Commons."],
  ["dish-bg2-zelenchuci-na-skara", "Hunted 2026-11-26 (grilled vegetables): every platter found carries grilled meats, tikka or chaat. No photograph of a plain grilled-vegetable platter at the bar."],
  ["dish-bg2-lyuti-chushki", "Hunted 2026-11-26 (lyuti chushki, люти чушки): no photograph of pickled hot peppers was found; the jar photographs in the results are mustard piccalilli."],
  ["dish-bg2-lyutika", "Hunted 2026-11-26 (lyutika, лютика): no photograph of lyutika exists on Commons; the word searches return buttercup flowers and an Indian patvelia."],
  ["dish-bg2-agneshka-chorba", "Hunted 2026-11-26 (agneshka chorba, агнешка чорба): the lamb-soup photographs found are Scotch broth (barley, no liaison) and a rough snapshot of plain broth and bones on a metal tray. Neither is this chorba."],
  ["dish-bg2-gabena-supa", "Hunted 2026-11-26 (gabena supa, гъбена супа): the same wall wave 1 met. The photographs found are a hand-held takeaway cup on a pavement, cream-of-mushroom soups and a half-eaten restaurant bowl. This soup is a clear broth with a yogurt liaison; none of them shows it."],
  ["dish-bg2-zeleva-chorba", "Hunted 2026-11-26 (zeleva chorba, зелева чорба): the cabbage-soup photographs found carry meat (a Finnish meat and cabbage soup) or are a film-poster logo. No photograph of the meatless cabbage chorba."],
  ["dish-bg2-svinska-kavarma", "Hunted 2026-11-26 (svinska kavarma, свинска каварма): Commons' one kavarma photograph (Kavarma.jpeg) finishes the clay pot with a baked egg, which this recipe does not use. It is the same file wave 1 recorded against its lamb kavarma."],
  ["dish-bg2-teleshka-kavarma", "Hunted 2026-11-26 (teleshka kavarma, телешка каварма): no photograph of a beef kavarma exists on Commons."],
  ["dish-bg2-pileshka-kavarma", "Hunted 2026-11-26 (pileshka kavarma, пилешка каварма): no photograph of a chicken kavarma exists on Commons; the results are chicken korma, a different dish."],
  ["dish-bg2-gabena-kavarma", "Hunted 2026-11-26 (gabena kavarma, гъбена каварма): no photograph of a mushroom kavarma exists on Commons."],
  ["dish-bg2-sirene-po-shopski", "Hunted 2026-11-26 (sirene po shopski, сирене по шопски): no photograph of the baked cheese pot exists on Commons; the results are salad boards, earthenware pots on their own and a shrimp güveç."],
  ["dish-bg2-gyuveche", "Hunted 2026-11-26 (gyuveche, гювече): the one gyuvech photograph (Gjuvech 030.JPG) is a large vegetable pot under vine leaves, not the small individual pot with cheese and a set egg top."],
  ["dish-bg2-kapama-style", "Hunted 2026-11-26 (kapama, капама): the kapama photographs on Commons are the Turkish kuzu kapama, lamb shanks with greens, a different dish that shares the name. The Rhodope photographs found are kachamak."],
  ["dish-bg2-kyufte-chirpanski", "Hunted 2026-11-26 (kyufteta po chirpanski, кюфтета по чирпански): the meatball photographs found are chicken-ricotta meatballs and composed restaurant plates. None shows meatballs in the pepper and tomato sauce."],
  ["dish-bg2-pile-po-selski", "Hunted 2026-11-26 (pile po selski, пиле по селски): the chicken-stew photographs found are a clear chicken soup and composed plates with rice. None shows the pepper and tomato village stew."],
  ["dish-bg2-pile-s-zele", "Hunted 2026-11-26 (pile s zele, пиле с зеле): no photograph of chicken with cabbage was found; the results are Filipino Bulacan dishes matched on the word Baliuag."],
  ["dish-bg2-svinsko-s-oriz", "Hunted 2026-11-26 (svinsko s oriz, свинско с ориз): the pork-and-rice photographs found are Hong Kong tomato-and-cheese baked rice and a Valencian arròs al forn carrying blood sausage and chickpeas. Neither is this bake."],
  ["dish-bg2-svinski-sach", "Hunted 2026-11-26 (svinski sach, свински сач): the sach photographs found are a Nesebar plate of fried fish and a mixed grill of whole steaks and potatoes. Neither shows the pork sach."],
  ["dish-bg2-zelenchukov-sach", "Hunted 2026-11-26 (zelenchukov sach, зеленчуков сач): the same sach hunt as the pork sach. The one sizzling-pan photograph carries grilled steaks as its subject, not vegetables."],
  ["dish-bg2-bob-s-zele", "Hunted 2026-11-26 (bob s zele, боб с зеле): no photograph of beans with cabbage was found; the results are kimchi jjigae and Karnataka thalis."],
  ["dish-bg2-kromid-yahniya", "Hunted 2026-11-26 (kromid yahniya, кромид яхния): no photograph of an onion yahniya exists on Commons; the lecsó photographs found are pepper-first, a different balance from this onion stew."],
  ["dish-bg2-kyufte-skara", "Hunted 2026-11-26 (kyufte na skara, кюфтета на скара): the one photograph of grilled kyufte (Kyufte.jpg) carries a website watermark in the corner; the remaining files are raw mince and a bitten sandwich."],
  ["dish-bg2-pileshki-shishcheta", "Hunted 2026-11-26 (pileshki shishcheta, пилешки шишчета): the skewer photographs found are chicken wings and whole legs on sticks. None shows cubed chicken skewers."],
  ["dish-bg2-ribni-kyufteta", "Hunted 2026-11-26 (ribni kyufteta, рибни кюфтета): the fish-cake photographs found are market stalls, a shrimp and crab fast-food tray and vintage cookbook plates. None shows a plate of fish patties at the bar."],
  ["dish-bg2-parzena-riba", "Hunted 2026-11-26 (parzena riba, пържена риба): the fried-fish photographs found are whole fish under plastic wrap on a market counter, a bowl of fish heads and a Thai chilli-topped fish. None is a served plate of fried fish."],
  ["dish-bg2-milinki", "Hunted 2026-11-26 (milinki, милинки): the only milinki file on Commons is a Sofia bakery's shop sign listing them. No photograph of the rolls themselves."],
  ["dish-bg2-katmi", "Hunted 2026-11-26 (katmi, катми): no photograph of katmi exists on Commons; the katmer files are the Turkish pistachio pastry, a different dish that shares most of the name."],
  ["dish-bg2-przheni-filiyki", "Hunted 2026-11-26 (przheni filiyki, пържени филийки): the French-toast photographs found carry Nutella and café branding, or are a 597-pixel making-of frame. No clean photograph of plain eggy fried slices."],
  ["dish-bg2-zelnik", "Hunted 2026-11-26 (zelnik, зелник): no photograph of zelnik exists on Commons; the one greens-pie photograph is the spinach spanachnik already pinned in wave 1, a different filling."],
  ["dish-bg2-klin", "Hunted 2026-11-26 (klin, клин): no photograph of the rice banitsa exists on Commons."],
  ["dish-bg2-tutmanik", "Hunted 2026-11-26 (tutmanik, тутманик): no photograph of tutmanik exists on Commons."],
  ["dish-bg2-postna-musaka", "Hunted 2026-11-26 (postna musaka, постна мусака): Commons' one potato-musaka photograph (Мусака од компири.jpg) already serves wave 1's lamb and potato musaka and is not claimed twice; no second photograph of the Lenten potato musaka was found."],
  ["dish-bg2-pecheni-yabalki", "Hunted 2026-11-26 (pecheni yabalki, печени ябълки): the baked-apple photographs found are stuffing preparations and a vintage menu card. No photograph of a plated baked apple at the bar."],
  ["dish-bg2-maslenki", "Hunted 2026-11-26 (maslenki, масленки): the butter-cookie photographs found are Scottish shortbread fingers and brand-stamped biscuits with the maker's name pressed into them. Neither is a plate of maslenki."],
  ["dish-bg2-marinovana-skumriya", "Hunted 2026-11-26 (marinovana skumriya, маринована скумрия): the one marinated-mackerel photograph is a tray of masala-rubbed fish with curry leaves, a different marinade from the salt, sugar and vinegar cure."],
  ["dish-bg2-panirovani-pileshki", "Hunted 2026-11-26 (panirovani pileshki kasove, панирани пилешки късове): the nugget photographs found are a ketchup-covered bowl snapshot by a keyboard and a plate where fries are the subject. Neither meets the bar."],
  ["dish-bg2-byurek-kayma", "Hunted 2026-11-26 (byurek s kayma, бюрек с кайма): the one clean photograph of a mince burek wedge (Burek trokut 1.png) is CC BY-SA 2.5 with no author recorded on Commons, so it cannot be credited and the generator's attribution gate refuses it; the companion wedge photograph carries a branded yogurt cup in the frame."],
  ["dish-pwa-chicken-shawarma-plate", "Hunted 2026-11-26 (chicken shawarma plate): the shawarma photographs found are wraps in foil, meat shaved into a foam takeout tray, a watermarked meat close-up and the vertical spit at a street stall. None is a plated shawarma at the bar."],
  ["dish-pwa-pork-medallions", "Hunted 2026-11-26 (pork medallions): the medallion photographs found are bacon-wrapped medallions and medallions drowned in a cream sauce. Neither depicts these plainly seared medallions with mushrooms."],
  ["dish-pwa-cod-parmesan", "Hunted 2026-11-26 (cod parmesan): the cod photographs found are raw fillets, plain baked cod without the crust, and a baked pasta casserole. No photograph of cod under a parmesan crust was found."],
  ["dish-pwa-chicken-lentil-curry", "Hunted 2026-11-26 (chicken lentil curry): the photographs found serve chicken curry and dal as separate thali items, or are restaurant table scenes. No single photograph of chicken simmered with lentils was found."],
  ["dish-pwa-tuna-patties", "Hunted 2026-11-26 (tuna patties): the fish-cake photographs found are bakery display cakes, Thai fish cakes photographed out of focus, and coconut cakes topped with mince. No photograph of tuna patties at the bar."],
  ["dish-pwa-chana-paneer", "Hunted 2026-11-26 (chana paneer): the chole paneer photographs found are thali presentations where the paneer cannot be seen in the chickpeas, and one search result is a statue of a gold panner. No verifiable chana paneer photograph."],
  ["dish-pwa-tempeh-pepper-fry", "Hunted 2026-11-26 (tempeh pepper fry): the tempeh photographs found are plain fried slabs on banana leaves, undressed fried strips, and branded restaurant plates. None shows tempeh fried with peppers."],
  ["dish-pwa-split-pea-yogurt-dal", "Hunted 2026-11-26 (split pea yogurt dal): the photographs found are raw split peas, a matar paneer thali, and an egg study. No photograph of a cooked split pea dal was found."],
  ["dish-pwa-urad-dal-yogurt", "Hunted 2026-11-26 (urad dal yogurt): the photographs found are dahi bhalla chaat, urad sweets (laddu and imarti) and a tomato chutney. No photograph of a white urad dal in yogurt was found."],
  ["dish-pwa-pepper-chicken-fry", "Hunted 2026-11-26 (pepper chicken fry): the photographs found are a chicken burger meal with a branded sauce packet and Sichuan restaurant table scenes. No photograph of a dry pepper chicken fry was found."],
  ["dish-pwa-turkey-egg-cups", "Hunted 2026-11-26 (turkey egg cups): the photographs found are an egg muffin product shot in its foam box and cafe big-breakfast plates. No photograph of baked turkey and egg cups was found."],
  ["dish-pwa-quark-egg-bake", "Hunted 2026-11-26 (quark egg bake): the quark photographs found are ingredient still lifes and raw curd. No photograph of a baked quark and egg dish was found."],
  ["dish-pwa-chicken-rice-verde", "Hunted 2026-11-26 (chicken rice verde): the green rice photographs found are a soupy chicken rice bowl and a tomato-red rice with peas. No photograph of chicken on green herb rice was found."],
  ["dish-pwa-shrimp-millet-pilaf", "Hunted 2026-11-26 (shrimp millet pilaf): the one shrimp and grain photograph is a shrimp pilaf close-up carrying the photographer's watermark signature in the frame. No clean photograph was found."],
  ["dish-pwa-broad-bean-barley-stew", "Hunted 2026-11-26 (broad bean barley stew): the broad bean stew photographs found carry sausage in the bowl (a Dutch tuinbonen pot) or a yogurt topping this stew does not have (a Turkish bakla plate), and the bean and barley soup photographs are dry soup mixes. No photograph of this stew was found."],
  ["dish-pwa-bean-vegetable-soup", "Hunted 2026-11-26 (bean vegetable soup): the bean soup photographs found are minestrone with elbow pasta, which this barley soup does not contain, and a branded chickpea jar arrangement. No photograph of this bean and barley soup was found."],
  ["dish-pwa-lentil-shepherds-pie", "Hunted 2026-11-26 (lentil shepherds pie): the photographs found are a deli display case with price signs and a bean casserole. No photograph of a lentil shepherds pie at the bar."],
  ["dish-pwa-tofu-vegetable-curry", "Hunted 2026-11-26 (tofu vegetable curry): the curry photographs found are pork and chicken red curries and a cafe table scene. No photograph of a tofu curry was found."],
  ["dish-pwa-edamame-tofu-bowl", "Hunted 2026-11-26 (edamame tofu bowl): the only candidate is a rice bowl with minced topping, and the edamame photographs are plain bowls of pods. No photograph of a tofu and edamame bowl was found."],
  ["dish-pwa-mackerel-potato-plate", "Hunted 2026-11-26 (mackerel potato plate): the mackerel photographs found are whole grilled fish on their own and a mixed-fish restaurant plate. None shows mackerel served with potatoes."],
  ["dish-pwa-tempeh-rice-bowl", "Hunted 2026-11-26 (tempeh rice bowl): the only candidate is an Indonesian mixed table where tempeh is one small item among many, under a restaurant brand printed on the plate. No photograph of a tempeh rice bowl at the bar."],
  ["dish-pwa-amaranth-yogurt-porridge", "Hunted 2026-11-26 (amaranth yogurt porridge): the only candidate is a calabash of dark porridge on a tiled floor, and the other amaranth photographs are cooked leaves. No photograph of an amaranth porridge bowl was found."],
  ["dish-pwa-shrimp-quinoa-fry", "Hunted 2026-11-26 (shrimp quinoa fry): the quinoa and shrimp photographs found are a fine-dining shrimp tartare arrangement. No photograph of a shrimp and quinoa stir fry was found."],
  ["dish-pwa-kidney-bean-bake", "Hunted 2026-11-26 (kidney bean bake): the bean bake photographs found are a solar-cooker collage and army field-kitchen serving lines. No photograph of a kidney bean and cheese bake was found."],
  /* Protein wave B (2026-11-26): the 25 dishes no photograph
     cleared the bar for, each hunted on Commons the same day. */
  ["dish-pwb-lamb-bhuna-style", "Hunted 2026-11-26 (lamb bhuna): the one true bhuna gosht photograph carries its caption baked into the image, and the other results were a mutton curry of another style and, memorably, two live lambs in a field. No clean bhuna photograph."],
  ["dish-pwb-mung-paneer-salad", "Hunted 2026-11-26 (mung paneer salad): the mung salad photographs found are sprouted-mung salads with no paneer in the frame. No photograph of a mung and paneer salad."],
  ["dish-pwb-chickpea-tuna-salad", "Hunted 2026-11-26 (chickpea tuna salad): no free photograph of a chickpea and tuna salad was found; the tuna salad results are sandwiches and a sauced takeaway tub."],
  ["dish-pwb-beef-lentil-stew", "Hunted 2026-11-26 (beef lentil stew): the leading result is a charity kitchen's prep line, not the stew. No photograph of a beef and lentil stew at the bar."],
  ["dish-pwb-tempeh-rendang-style", "Hunted 2026-11-26 (tempeh rendang): the rendang plates found are nasi lemak mixed plates, one on a restaurant-branded plate, and the rendang on them is beef. No photograph of a tempeh rendang."],
  ["dish-pwb-seitan-pepper-stirfry", "Hunted 2026-11-26 (seitan pepper stir-fry): the seitan stir-fry found is a broccoli stir-fry served on mashed potato, not peppers. No photograph of a seitan and pepper stir-fry."],
  ["dish-pwb-black-bean-hemp-patties", "Hunted 2026-11-26 (black bean patties): the bean-patty results are a branded frozen meal and a fast-food bean sandwich. No photograph of plain black bean patties."],
  ["dish-pwb-moringa-toor-dal", "Hunted 2026-11-26 (moringa toor dal): no free photograph of a moringa-leaf dal was found; the results are sambar plates and temple scenes."],
  ["dish-pwb-split-pea-potato-soup", "Hunted 2026-11-26 (split pea potato soup): the candidates are a peanut-topped variant, a bowl carrying a restaurant's printed logo, and a smooth green soup that serves the pea and mint soup better. No photograph of a plain split pea and potato soup."],
  ["dish-pwb-lupin-pepper-stew", "Hunted 2026-11-26 (lupin pepper stew): Commons holds lupin plants, seeds and a museum dish, no cooked lupin stew photograph under a free licence."],
  ["dish-pwb-paneer-chimichurri-style", "Hunted 2026-11-26 (paneer chimichurri): the chimichurri photographs found are Argentine grill plates of sausage and steak; no grilled paneer with a herb sauce photograph."],
  ["dish-pwb-yogurt-hemp-bowl", "Hunted 2026-11-26 (yogurt hemp bowl): no photograph of a yogurt bowl with hemp seeds was found; the yogurt bowl results are granola and berry bowls of other dishes."],
  ["dish-pwb-turkey-egg-skillet", "Hunted 2026-11-26 (turkey egg skillet): the breakfast skillets found are a full-English plate and a spinach skillet-eggs pan; neither shows turkey. No photograph of a turkey and egg skillet."],
  ["dish-pwb-feijoada-style", "Hunted 2026-11-26 (feijoada): every feijoada photograph on Commons shows the traditional meat version with sausage slices in the frame; none depicts the bean-only stew this dish is."],
  ["dish-pwb-paneer-pea-fried-rice", "Hunted 2026-11-26 (paneer pea fried rice): the one paneer fried rice photograph is topped with boiled egg halves and shows no paneer. No verified photograph of the dish."],
  ["dish-pwb-quinoa-cottage-salad", "Hunted 2026-11-26 (quinoa cottage salad): the quinoa salad photographs found are dried-fruit and fruit salads; none shows a fresh vegetable quinoa salad with cottage cheese."],
  ["dish-pwb-cottage-apple-walnut-bowl", "Hunted 2026-11-26 (cottage apple walnut bowl): the results are century-old cookbook illustrations, no photograph of a cottage cheese, apple and walnut bowl."],
  ["dish-pwb-baked-potato-cottage", "Hunted 2026-11-26 (baked potato cottage cheese): the jacket potato photographs found carry chicken-mayo, brie or meatball fillings, none cottage cheese."],
  ["dish-pwb-black-rice-edamame-bowl", "Hunted 2026-11-26 (black rice edamame bowl): the edamame bowl photographs found are pods alone in a bowl and a fish rice plate; no black rice bowl photograph."],
  ["dish-pwb-millet-tempeh-bowl", "Hunted 2026-11-26 (millet tempeh bowl): no photograph of a millet and tempeh bowl was found on Commons under a free licence."],
  ["dish-pwb-fish-corn-soup", "Hunted 2026-11-26 (fish corn soup): the corn soup photographs found are plain corn soups and a Sichuan spicy fish; none shows the Cantonese fish and corn soup."],
  ["dish-pwb-tuna-pasta-bake", "Hunted 2026-11-26 (tuna pasta bake): the tuna pasta results are cold pasta salads and sandwiches; no photograph of a baked tuna pasta."],
  ["dish-pwb-sweet-potato-quesadillas", "Hunted 2026-11-26 (sweet potato quesadillas): the quesadilla photographs found are wedges on a paper plate and a combo plate with a beer bottle in the frame. No photograph at the bar."],
  ["dish-pwb-hot-sour-soup", "Hunted 2026-11-26 (hot and sour soup): the one verified Commons shot of this soup already serves the library's own dish-cn-hot-sour-soup, and one photograph never illustrates two dishes. No second verified shot was found."],
  ["dish-pwb-pepper-white-bean-soup", "Hunted 2026-11-26 (pepper white bean soup): the one verified bean, tomato and pepper soup photograph already serves the library's dish-bg-bob-chorba, and one photograph never illustrates two dishes. No second verified shot was found."],
  /* Protein wave C (2026-11-26): the 17 dishes no photograph
     cleared the bar for, each hunted on Commons the same day. */
  ["dish-pwc-akara", "Hunted 2026-11-26 (akara): Commons holds street and market scenes of the fritters frying, cooks and stalls rather than the dish, and no clean plate of akara at the bar."],
  ["dish-pwc-black-bean-plantain-stew", "Hunted 2026-11-26 (black bean and plantain stew): the one plated beans and plantain photograph carries a visible watermark across the dish and was refused; no clean alternative was found."],
  ["dish-pwc-buckwheat-tofu-salad", "Hunted 2026-11-26 (buckwheat tofu salad): the candidates were bento boxes and buffet trays, not this salad; no honest photograph exists."],
  ["dish-pwc-cabbage-paneer-stirfry", "Hunted 2026-11-26 (cabbage paneer stir-fry): the candidates were a sheet-music print, cabbage rolls and a meat and cabbage stir-fry with no paneer in the frame; none depicts the dish."],
  ["dish-pwc-egg-potato-salad", "Hunted 2026-11-26 (egg potato salad): every potato salad photograph found shows no egg, and the egg is this dish's defining ingredient; photo-less beats a misleading plate."],
  ["dish-pwc-fish-tikka", "Hunted 2026-11-26 (fish tikka): the candidates were paneer-style skewers, battered fried fish and a buffet tray; none shows tikka fish."],
  ["dish-pwc-greek-chickpea-egg-salad", "Hunted 2026-11-26 (Greek chickpea egg salad): every Greek salad on Commons carries feta and olives, which this dish does not have, and none shows chickpea or egg; the photographs would misdescribe the plate."],
  ["dish-pwc-kefir-chia-smoothie", "Hunted 2026-11-26 (kefir chia smoothie): no kefir smoothie photograph on Commons passes the licence and attribution gates."],
  ["dish-pwc-lupin-sweet-potato-curry", "Hunted 2026-11-26 (lupin sweet potato curry): no photograph of a lupin curry exists on Commons; the bean is too new to the archive for one to have been taken."],
  ["dish-pwc-malfatti", "Hunted 2026-11-26 (malfatti): no photograph of malfatti on Commons passes the licence and attribution gates."],
  ["dish-pwc-okro-soup-style", "Hunted 2026-11-26 (okro soup): the candidates were okra-grating process shots and one ambiguous red stew with no okra visible; none verifies as okro soup."],
  ["dish-pwc-paneer-chickpea-salad", "Hunted 2026-11-26 (paneer chickpea salad): the only candidate was a buffet serving line; no plated photograph of this salad exists on Commons."],
  ["dish-pwc-petit-sale-style", "Hunted 2026-11-26 (petit salé): Commons search returns sailing photographs for the name and no plate of the lentil dish at all."],
  ["dish-pwc-rolex", "Hunted 2026-11-26 (rolex): the candidates show chapati stacks and street vendors, never the egg wrap itself, and one vendor shot carries branded clothing."],
  ["dish-pwc-savoury-oat-bowl", "Hunted 2026-11-26 (savoury oat bowl): the oatmeal photographs found are plain sweet porridge bowls with no egg, spinach or cheese in the frame; none depicts this savoury bowl."],
  ["dish-pwc-shrimp-ojja", "Hunted 2026-11-26 (shrimp ojja): the only true ojja frame is a wide banquet table where the dish sits small among many plates, and the close plates offered are a different fish dish."],
  ["dish-pwc-tofu-edamame-peanut-curry", "Hunted 2026-11-26 (tofu edamame peanut curry): the curry bowls offered could not be verified as tofu, and verification is the bar."],
];

/* ------------------------------ Commons API ------------------------------ */

async function api(params, tries = 6) {
  for (let attempt = 0; attempt < tries; attempt++) {
    let res;
    try {
      res = await fetch(`${API}?${params}`, { headers: UA });
    } catch {
      /* Network-level failure (socket drop, DNS blip) — retry with the
         same backoff as a 429 instead of killing the run (2026-11-17). */
      if (attempt === tries - 1) throw new Error("Commons API unreachable after retries");
      await sleep(3000 * (attempt + 1));
      continue;
    }
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

/** The dish library, in library order (the data modules are
 *  type-only importers, so Node's type stripping loads them directly). */
async function dishLibrary() {
  const [proof, mains, riceBread, sides, kerala, intl1, intl2, intl3, intl4, india, shakes, proteinBreakfasts, proteinIndia, proteinIntl, bulgaria, bulgaria2, proteinWaveA, proteinWaveB, proteinWaveC] = await Promise.all([
    load("src/lib/nutrition/data/proofDishes.ts"),
    load("src/lib/nutrition/data/dishesMains.ts"),
    load("src/lib/nutrition/data/dishesRiceBread.ts"),
    load("src/lib/nutrition/data/dishesSides.ts"),
    load("src/lib/nutrition/data/dishLibraryKerala.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl1.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl2.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl3.ts"),
    load("src/lib/nutrition/data/dishLibraryIntl4.ts"),
    load("src/lib/nutrition/data/dishLibraryIndia.ts"),
    load("src/lib/nutrition/data/dishLibraryShakes.ts"),
    load("src/lib/nutrition/data/dishLibraryProteinBreakfasts.ts"),
    load("src/lib/nutrition/data/dishLibraryProteinIndia.ts"),
    load("src/lib/nutrition/data/dishLibraryProteinIntl.ts"),
    load("src/lib/nutrition/data/dishLibraryBulgaria.ts"),
    load("src/lib/nutrition/data/dishLibraryBulgaria2.ts"),
    load("src/lib/nutrition/data/dishLibraryProteinWaveA.ts"),
    load("src/lib/nutrition/data/dishLibraryProteinWaveB.ts"),
    load("src/lib/nutrition/data/dishLibraryProteinWaveC.ts"),
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
    ...intl4.INTL4_DISHES,
    ...india.INDIA_DISHES,
    ...shakes.SHAKES_DISHES,
    ...proteinBreakfasts.PW2_DISHES,
    ...proteinIndia.PROTEIN_INDIA_DISHES,
    ...proteinIntl.PROTEIN_INTL_DISHES,
    ...bulgaria.BULGARIA_DISHES,
    ...bulgaria2.BULGARIA2_DISHES,
    ...proteinWaveA.PROTEIN_WAVE_A_DISHES,
    ...proteinWaveA.BALANCED_WAVE_A_DISHES,
    ...proteinWaveB.PROTEIN_WAVE_B_DISHES,
    ...proteinWaveB.BALANCED_WAVE_B_DISHES,
    ...proteinWaveC.PROTEIN_WAVE_C_DISHES,
    ...proteinWaveC.BALANCED_WAVE_C_DISHES,
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
      /* Retry patience hardened 2026-11-17 (PW-1 shakes wave): Commons
         rate-limit windows repeatedly outlasted the old 5-attempt/~30 s
         grace and killed whole runs on a null buffer; 12 attempts with a
         longer backoff rides out a window without changing any pin,
         licence decision, or output. */
      for (let attempt = 0; attempt < 12 && !bytes; attempt++) {
        let res;
        try {
          res = await fetch(meta.thumburl, { headers: UA });
          if (res.status !== 429 && res.status !== 503 && res.ok)
            bytes = Buffer.from(await res.arrayBuffer());
        } catch {
          /* Network-level failure (socket drop, incl. mid-body) — same
             retry/backoff as a 429 rather than an uncaught exception
             (2026-11-17). */
          await sleep(5000 * (attempt + 1));
          continue;
        }
        if (bytes) break;
        if (res.status === 429 || res.status === 503) {
          await sleep(5000 * (attempt + 1));
          continue;
        }
        if (!res.ok) throw new Error(`download failed for "${pin.title}": HTTP ${res.status}`);
      }
      if (!bytes)
        throw new Error(
          `download did not complete for "${pin.title}" after 12 attempts (rate limit did not clear)`,
        );
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
