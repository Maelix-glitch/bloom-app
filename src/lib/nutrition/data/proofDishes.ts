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
      "Rinse the masoor dal until the water runs clear, then pressure-cook with about 750 ml water, the turmeric and half the salt for 2 whistles (or simmer 20–25 minutes) until soft.",
      "Whisk the dal lightly so it turns creamy but still has body.",
      "For the tadka, heat the ghee in a small pan; add mustard seeds and let them crackle, then cumin, garlic, ginger and green chilli until the garlic turns golden.",
      "Add the onion and cook until soft and golden at the edges; add the tomato and cook until it melts into the oil.",
      "Pour the tadka over the dal, stir, simmer 2 minutes, adjust salt, and finish with the coriander leaves.",
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
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-171314", grams: 10 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain.",
      "Heat the ghee in a heavy pot, add the bay leaf and cumin seeds, and let the cumin sizzle and darken a shade.",
      "Add the rice and stir gently for a minute so each grain is glossed with ghee.",
      "Pour in about 550 ml hot water and the salt, cover, and cook on the lowest heat for 10 minutes.",
      "Rest, covered and off the heat, for 10 minutes; fluff with a fork before serving.",
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
      "Wash the coriander and mint well and shake off the water.",
      "Blend everything with the lemon juice and 2–3 spoonfuls of cold water to a bright green paste — blend in short bursts so the herbs stay green.",
      "Taste for salt and lemon; serve fresh, or refrigerate in a small jar for up to 3 days.",
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
    lines: [
      { foodId: "usda-2259793", grams: 400 }, // yogurt (dahi)
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (dry-roasted)
      { foodId: "usda-173475", grams: 5 }, // mint leaves
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Dry-roast the cumin seeds in a small pan until fragrant, then crush coarsely.",
      "Whisk the yogurt smooth with the salt.",
      "Grate or finely dice the cucumber, squeeze out the excess water with your hands, and fold it into the yogurt.",
      "Finish with the roasted cumin, torn mint leaves and black pepper; chill before serving.",
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
      "Cut the potato into wedges and the cauliflower into florets; grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, take it off the heat for a few seconds, then add cumin, ginger, garlic and green chilli.",
      "Add the onion and cook until golden; add the tomato, turmeric, ground coriander, cayenne and salt, and cook until the oil glistens at the edges.",
      "Add the potato and cauliflower with a splash of water, cover, and cook on low heat for 15–18 minutes, stirring now and then, until tender but not mashed.",
      "Rest 5 minutes, then finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
];
