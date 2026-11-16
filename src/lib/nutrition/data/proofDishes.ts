/**
 * The five D1 proof dishes — hand-authored to exercise the dish model
 * end to end (parsing, pattern derivation, the budget heuristic, and
 * computed nutrients pinned against hand-summation in dishes.test.ts).
 * They are proofs, not the dish library; the library is the next slice.
 *
 * Every line names a USDA reference food and a gram amount for the
 * WHOLE recipe. Water is never a line — it carries no nutrients and is
 * not a reference food; the method says where it goes. No nutrient
 * value appears anywhere in this file: a dish's numbers exist only as
 * `dishNutrients` computes them.
 */

import type { Dish } from "../dishes";

export const PROOF_DISHES: readonly Dish[] = [
  {
    id: "dish-masoor-dal-tadka",
    name: { en: "Masoor Dal Tadka", hindi: "मसूर दाल तड़का" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174284", grams: 200 }, // red lentils (masoor dal), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the 200 g masoor dal until the water runs clear; drain — masoor needs no soaking.",
      "Pressure-cook the dal with about 750 ml water, the turmeric and half the salt for 2 whistles (or simmer 20–25 minutes) until completely soft.",
      "Whisk the dal lightly so it turns creamy but still has body; loosen with a splash of hot water if it sits too thick.",
      "Heat the 15 g ghee in a small pan until it shimmers; add the mustard seeds and wait until they finish popping.",
      "Add the cumin, garlic, ginger and green chilli and fry until the garlic turns golden at the edges.",
      "Add the 100 g onion and cook until soft and golden at the edges, 5–6 minutes.",
      "Add the 100 g tomato and cook until it melts into the oil.",
      "Pour the tadka over the dal, stir, and simmer 2 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-jeera-rice",
    name: { en: "Jeera Rice", hindi: "जीरा चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-171314", grams: 10 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rinse the 300 g rice until the water runs clearer, then soak for 20 minutes; drain well.",
      "Heat the 10 g ghee in a heavy pot; add the bay leaf and cumin seeds and let the cumin sizzle and darken a shade.",
      "Add the drained rice and stir gently for a minute so each grain is glossed with ghee.",
      "Pour in about 550 ml hot water and the salt and bring to a boil.",
      "Cover, turn the heat to the lowest, and cook for 10 minutes without lifting the lid.",
      "Rest, covered and off the heat, for 10 minutes; fluff with a fork — the grains should stand separate — before serving.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-mint-coriander-chutney",
    name: { en: "Mint-Coriander Chutney", hindi: "पुदीना-धनिया चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169997", grams: 50 }, // fresh coriander leaves
      { foodId: "usda-173475", grams: 25 }, // mint leaves
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-167746", grams: 30 }, // lemon (for its juice)
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Wash the 50 g coriander and 25 g mint well and shake off the water — grit hides in the stalks.",
      "Roughly chop the herbs, stalks and all; the stalks carry flavour.",
      "Put the herbs in a blender with the green chilli, ginger, cumin, salt and the juice of the lemon.",
      "Blend with 2–3 spoonfuls of cold water to a bright green paste, in short bursts so the herbs stay green — keep it slightly coarse, not a juice.",
      "Taste for salt and lemon and adjust — it should be sharp, herby and fresh.",
      "Serve fresh, or refrigerate in a small jar for up to 3 days.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-cucumber-raita",
    name: { en: "Cucumber Raita", hindi: "खीरे का रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 400 }, // yogurt (dahi)
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (dry-roasted)
      { foodId: "usda-173475", grams: 5 }, // mint leaves
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Dry-roast the cumin seeds in a small dry pan until fragrant and a shade darker, about a minute; crush coarsely.",
      "Whisk the 400 g yogurt smooth with the salt until it pours like thick cream.",
      "Grate or finely dice the 200 g cucumber.",
      "Squeeze the cucumber hard with your hands to press out its excess water — this keeps the raita from turning watery.",
      "Fold the cucumber into the yogurt.",
      "Finish with the roasted cumin, torn mint leaves and black pepper; chill for at least 15 minutes before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-aloo-gobi",
    name: { en: "Aloo Gobi", hindi: "आलू गोबी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-2685573", grams: 400 }, // cauliflower
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 400 g potato into wedges and the 400 g cauliflower into florets of a similar size.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds, then add the cumin, ginger, garlic and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5–6 minutes.",
      "Add the 100 g tomato, turmeric, ground coriander, cayenne and salt and cook until the oil glistens at the edges.",
      "Add the potato and cauliflower with a splash of water, cover, and cook on low heat for 15–18 minutes, stirring now and then, until tender but not mashed.",
      "Rest 5 minutes, then finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
];
