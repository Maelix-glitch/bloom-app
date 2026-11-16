/**
 * The MAINS library (D2, dishes content) — hand-authored Indian main
 * dishes over the USDA reference foods: dals and legume mains,
 * paneer-style mains (the cottage-cheese stand-in the data layer uses
 * for paneer — the dish keeps its name, the line shows the ingredient),
 * egg mains, chicken and fish mains, vegetable mains, and enriched
 * variants of popular dishes.
 *
 * Like the proof dishes, every line names a USDA reference food and a
 * gram amount for the WHOLE recipe; water is never a line. A dish
 * carries NO nutrient values of its own — its numbers exist only as
 * `dishNutrients` computes them, its patterns only as `dishPatterns`
 * derives them, and its budget tier is the `computeBudgetTier`
 * heuristic's output, stored so `validateDish` can flag drift.
 * Ingredients the reference set does not carry (paneer itself, garam
 * masala, curry leaves, chana dal, bottle gourd…) are never invented —
 * dishes that would need them are simply not in this file.
 */

import type { Dish } from "../dishes";

export const DISHES_MAINS: Dish[] = [
  /* ------------------------- dals & legume mains ------------------------ */
  {
    id: "dish-arhar-dal",
    name: { en: "Arhar Dal", hindi: "अरहर दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 240 }, // pigeon peas (arhar dal), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the arhar dal and soak for 30 minutes; drain.",
      "Pressure-cook the dal with about 800 ml water, the turmeric and half the salt for 3–4 whistles (or simmer 35–40 minutes) until completely soft; whisk to a creamy consistency.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin and let it crackle.",
      "Add the garlic, ginger and green chilli; when the garlic colours, add the onion and cook until golden.",
      "Add the tomato and cayenne and cook until the oil glistens at the edges; pour this tadka into the dal.",
      "Simmer together 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-dal-fry",
    name: { en: "Dal Fry", hindi: "दाल फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 240 }, // pigeon peas (arhar dal), dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the arhar dal and pressure-cook with about 800 ml water, the turmeric and half the salt for 3–4 whistles until soft; whisk smooth.",
      "Grind the coriander seeds coarsely.",
      "Heat the ghee, add the cumin and let it crackle, then add the garlic, ginger and green chilli until the garlic turns golden.",
      "Add the onion and fry until deep golden; add the tomato, ground coriander and cayenne and cook into a thick masala.",
      "Pour the cooked dal into the masala, simmer 5 minutes so the flavours marry, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-moong-dal-tadka",
    name: { en: "Moong Dal Tadka", hindi: "मूंग दाल तड़का" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 240 }, // mung beans (moong dal), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the moong dal and simmer in about 800 ml water with the turmeric and half the salt for 20–25 minutes until soft and creamy.",
      "Heat the oil; add the mustard seeds and let them pop, then the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato and cook until it melts into the oil.",
      "Pour the tadka over the dal, simmer 2 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-moong-khichdi",
    name: { en: "Moong Dal Khichdi", hindi: "मूंग दाल खिचड़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 150 }, // mung beans (moong dal), dry
      { foodId: "usda-2512381", grams: 250 }, // white rice, dry
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the moong dal and rice together and soak for 20 minutes; drain. Dice the carrot.",
      "Heat the ghee, add the bay leaf and cumin and let the cumin sizzle; add the ginger and stir for a few seconds.",
      "Add the carrot and peas and stir for 2 minutes, then add the drained dal and rice, the turmeric and the salt.",
      "Pour in about 900 ml hot water, cover, and cook on the lowest heat for 18–20 minutes until soft and porridge-like.",
      "Rest, covered, for 5 minutes; stir once and serve soft and steaming.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-urad-dal",
    name: { en: "Urad Dal", hindi: "उड़द दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174259", grams: 240 }, // black gram (urad dal), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the urad dal and soak for at least 1 hour; drain.",
      "Simmer the dal in about 900 ml water with the turmeric and half the salt for 40–45 minutes (or pressure-cook 5 whistles) until tender and creamy.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato and black pepper and cook until the oil separates.",
      "Pour the tadka into the dal, simmer 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-panchmel-dal",
    name: { en: "Panchmel Dal", hindi: "पंचमेल दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174284", grams: 60 }, // red lentils (masoor dal), dry
      { foodId: "usda-174256", grams: 60 }, // mung beans (moong dal), dry
      { foodId: "usda-172436", grams: 60 }, // pigeon peas (arhar dal), dry
      { foodId: "usda-174259", grams: 40 }, // black gram (urad dal), dry
      { foodId: "usda-2644282", grams: 40 }, // chickpeas, dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse all five dals together and soak for 30 minutes; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the dals with about 900 ml water, the turmeric and half the salt for 4 whistles (or simmer 40 minutes) until soft; whisk lightly.",
      "Heat the oil; add the mustard seeds and let them pop, then the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander and cayenne and cook until the oil glistens.",
      "Pour the tadka into the dals, simmer 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-masoor-palak-dal",
    name: { en: "Masoor Palak Dal", hindi: "मसूर पालक दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174284", grams: 220 }, // red lentils (masoor dal), dry
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-167746", grams: 30 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the masoor dal and simmer in about 750 ml water with the turmeric and half the salt for 18–20 minutes until soft.",
      "Heat the oil; add the cumin, garlic, ginger and green chilli and stir until fragrant.",
      "Add the onion and cook until golden; add the tomato and cook until it softens into the oil.",
      "Add the spinach a handful at a time and cook until it wilts down, about 3 minutes.",
      "Stir the spinach mixture into the dal, simmer 3 minutes, adjust the salt, and finish with the lemon juice and coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-dal-makhani",
    name: { en: "Dal Makhani", hindi: "दाल मखनी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174259", grams: 200 }, // black gram (urad dal), dry
      { foodId: "usda-175193", grams: 60 }, // kidney beans (rajma), dry
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-322892", grams: 150 }, // whole milk
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the urad dal and rajma and soak together overnight; drain. Grind the coriander seeds coarsely.",
      "Simmer the dals in about 1 litre water with half the salt for 50–60 minutes (or pressure-cook 6–7 whistles) until completely soft; mash a ladleful against the side of the pot.",
      "Melt the butter, add the cumin and cardamom, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and cayenne and cook until dark and glossy.",
      "Add the masala to the dals with the milk and simmer on the lowest heat for 20 minutes, stirring now and then, until thick and creamy.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-rajma-masala",
    name: { en: "Rajma Masala", hindi: "राजमा मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175193", grams: 280 }, // kidney beans (rajma), dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the rajma and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the rajma in about 900 ml water with half the salt for 6–7 whistles (or simmer 50–60 minutes) until soft enough to crush between fingers.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the rajma with its cooking water, mash a few beans to thicken, and simmer 15 minutes.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-chole-masala",
    name: { en: "Chole Masala", hindi: "छोले मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 280 }, // chickpeas, dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the chickpeas and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the chickpeas in about 900 ml water with half the salt for 6–7 whistles (or simmer 50–60 minutes) until tender.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, cardamom and cinnamon.",
      "Add the garlic, ginger and green chilli, then the onion, and cook until deep golden.",
      "Add the tomato, ground coriander, turmeric and cayenne and cook into a dark, thick masala.",
      "Add the chickpeas with their cooking water, mash a few to thicken, and simmer 15 minutes; finish with the lemon juice, salt to taste and coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-black-bean-masala",
    name: { en: "Black Bean Masala", hindi: "ब्लैक बीन मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-173734", grams: 260 }, // black beans, dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the black beans and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the beans in about 900 ml water with half the salt for 5–6 whistles (or simmer 45–50 minutes) until tender.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the beans with their cooking water, mash a few to thicken, and simmer 12 minutes.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-lobia-masala",
    name: { en: "Lobia Masala", hindi: "लोबिया मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-173758", grams: 240 }, // cowpeas (lobia), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the lobia and soak for 4–6 hours; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the lobia in about 800 ml water with half the salt for 3–4 whistles (or simmer 30–35 minutes) until tender but holding shape.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook until the oil separates.",
      "Add the lobia with its cooking water and simmer 10 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-pinto-bean-curry",
    name: { en: "Pinto Bean Curry", hindi: "पिंटो बीन करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175199", grams: 240 }, // pinto beans, dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the pinto beans and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the beans in about 900 ml water with half the salt for 5–6 whistles (or simmer 45 minutes) until tender.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and turmeric and cook into a thick masala.",
      "Add the beans with their cooking water, mash a few to thicken, and simmer 12 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-white-bean-curry",
    name: { en: "White Bean Curry", hindi: "सफ़ेद राजमा करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-173745", grams: 240 }, // navy beans, dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the white beans and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the beans in about 900 ml water with half the salt for 5–6 whistles (or simmer 45 minutes) until tender.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the beans with their cooking water, mash a few to thicken, and simmer 12 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sambar",
    name: { en: "Sambar", hindi: "सांभर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 160 }, // pigeon peas (arhar dal), dry
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-2685577", grams: 100 }, // eggplant (brinjal)
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the arhar dal and pressure-cook in about 700 ml water with the turmeric and half the salt for 3–4 whistles until completely soft; whisk smooth.",
      "Soak the tamarind in 200 ml hot water for 10 minutes, squeeze out the pulp and strain. Grind the coriander seeds coarsely.",
      "Simmer the carrot, green beans, eggplant, onion and tomato in about 400 ml water for 8–10 minutes until just tender.",
      "Add the tamarind water, ground coriander and cayenne to the vegetables and simmer 5 minutes.",
      "Stir in the cooked dal and simmer together 5 minutes; adjust the salt.",
      "Heat the sesame oil, add the mustard seeds and fenugreek and let them crackle and darken, pour over the sambar, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-soybean-curry",
    name: { en: "Soybean Curry", hindi: "सोयाबीन करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 200 }, // soybeans, dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the soybeans and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the soybeans in about 800 ml water with half the salt for 6–7 whistles (or simmer 50 minutes) until tender.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the soybeans with a little of their cooking water and simmer 12 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-dal-palak",
    name: { en: "Dal Palak", hindi: "दाल पालक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644283", grams: 220 }, // whole lentils, dry
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the whole lentils and simmer in about 850 ml water with the turmeric and half the salt for 30–35 minutes until tender.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato and cook until it softens into the oil.",
      "Add the spinach and cook until it wilts down, about 3 minutes.",
      "Stir everything into the lentils, simmer 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-matar-masala",
    name: { en: "Matar Masala", hindi: "मटर मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170419", grams: 500 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the peas with about 150 ml water, cover, and simmer 10–12 minutes until the peas are tender and the gravy clings to them.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sprouted-moong-curry",
    name: { en: "Sprouted Moong Curry", hindi: "अंकुरित मूंग करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 220 }, // mung beans (moong dal), dry, sprouted in the method
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-167746", grams: 30 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
    ],
    method: [
      "Soak the moong in water overnight, drain, tie in a cloth and leave in a warm place for 8–12 hours until short sprouts appear.",
      "Heat the oil; add the mustard seeds and let them pop, then the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato and turmeric and cook until soft.",
      "Add the sprouted moong with about 200 ml water and the salt, cover, and simmer 10–12 minutes until just tender — the sprouts should keep a little bite.",
      "Finish with the lemon juice and coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sabut-masoor",
    name: { en: "Sabut Masoor", hindi: "साबुत मसूर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644283", grams: 240 }, // whole lentils, dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the whole lentils and soak for 1 hour; drain.",
      "Simmer the lentils in about 900 ml water with the turmeric and half the salt for 30–35 minutes until tender but whole.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until deep golden; add the tomato and black pepper and cook until the oil separates.",
      "Pour the tadka into the lentils, simmer 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-coconut-lentil-curry",
    name: { en: "Coconut Lentil Curry", hindi: "नारियल दाल करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174284", grams: 220 }, // red lentils (masoor dal), dry
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the masoor dal and simmer in about 750 ml water with the turmeric and half the salt for 18–20 minutes until soft.",
      "Grate the coconut and blend it with about 150 ml warm water; squeeze and strain to make a thin coconut milk.",
      "Heat the coconut oil; add the mustard seeds and let them pop, then the garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato and cook until soft.",
      "Stir the masala and the coconut milk into the dal and simmer 5 minutes — do not boil hard once the coconut is in. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-tomato-dal",
    name: { en: "Tomato Dal", hindi: "टमाटर दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 220 }, // pigeon peas (arhar dal), dry
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the arhar dal and pressure-cook with about 800 ml water, the turmeric and half the salt for 3–4 whistles until completely soft; whisk smooth.",
      "Heat the oil; add the mustard seeds and let them pop, then the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until soft, then add the tomato and cayenne and cook until the tomato melts into a thick, tangy sauce.",
      "Pour the tomato mixture into the dal and simmer 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  /* --------------------------- paneer-style mains ------------------------
   * Paneer itself is not a reference food; the cottage-cheese line is the
   * data layer's stand-in, and it shows honestly in the ingredient list. */
  {
    id: "dish-matar-paneer",
    name: { en: "Matar Paneer", hindi: "मटर पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-170419", grams: 250 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cottage cheese into cubes. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the peas with about 200 ml water and simmer 6–8 minutes until tender.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes — no longer, so they stay soft. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-palak-paneer",
    name: { en: "Palak Paneer", hindi: "पालक पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 350 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-168462", grams: 600 }, // spinach
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Blanch the spinach in boiling water for 2 minutes, drain, refresh in cold water, and blend to a coarse purée. Cut the cottage cheese into cubes. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and turmeric and cook until soft.",
      "Add the spinach purée and simmer 5 minutes until it darkens and thickens.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-paneer-bhurji",
    name: { en: "Paneer Bhurji", hindi: "पनीर भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 450 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170427", grams: 100 }, // green bell pepper (capsicum)
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
    ],
    method: [
      "Crumble the cottage cheese coarsely with your fingers. Grind the coriander seeds coarsely.",
      "Melt the butter; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the capsicum and cook 3 minutes until it softens at the edges.",
      "Add the tomato, ground coriander, turmeric and cayenne and cook until the oil glistens.",
      "Add the crumbled cottage cheese and stir-fry gently for 3–4 minutes until everything is hot and coated. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-kadai-paneer",
    name: { en: "Kadai Paneer", hindi: "कड़ाई पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170427", grams: 150 }, // green bell pepper (capsicum)
      { foodId: "usda-170108", grams: 100 }, // red bell pepper
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cottage cheese into cubes and the capsicums and half the onion into chunks. Crush the coriander seeds coarsely — this is the kadai masala.",
      "Heat the oil in a kadai or heavy pan; add the cumin, then the garlic, ginger and green chilli.",
      "Add the finely chopped onion and cook until golden; add the tomato, crushed coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the capsicum and onion chunks and stir-fry on high heat for 3–4 minutes so they char slightly at the edges but stay crisp.",
      "Fold in the cottage-cheese cubes, toss for 2 minutes to coat, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-paneer-butter-masala",
    name: { en: "Paneer Butter Masala", hindi: "पनीर बटर मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-170457", grams: 250 }, // tomato
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the cashews in hot water for 15 minutes; blend with the tomato and onion to a smooth purée. Cut the cottage cheese into cubes.",
      "Melt the butter; add the cardamom and cinnamon, then the garlic, ginger and green chilli until fragrant.",
      "Add the tomato-cashew purée and the cayenne and cook, stirring, for 8–10 minutes until thick and glossy and the butter glistens at the edges.",
      "Stir in the milk and simmer 2 minutes to a silky gravy.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-paneer-tikka-masala",
    name: { en: "Paneer Tikka Masala", hindi: "पनीर टिक्का मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt (hung curd)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-170427", grams: 100 }, // green bell pepper (capsicum)
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cottage cheese into large cubes. Mix half the Greek yogurt with half the turmeric, half the cayenne and a pinch of the salt; coat the cubes and marinate for 20 minutes. Grind the coriander seeds coarsely.",
      "Heat half the oil in a heavy pan and sear the marinated cubes until golden at the edges; set aside.",
      "Heat the remaining oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Add the capsicum and cook 3 minutes; stir in the remaining Greek yogurt a spoonful at a time so it does not split.",
      "Return the seared cubes, simmer gently for 3 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-shahi-paneer",
    name: { en: "Shahi Paneer", hindi: "शाही पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-2515374", grams: 40 }, // cashew nuts
      { foodId: "usda-322892", grams: 150 }, // whole milk
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the cashews in hot water for 15 minutes; blend with the tomato and onion to a smooth purée. Cut the cottage cheese into cubes.",
      "Melt the butter; add the cardamom, cinnamon and cloves, then the garlic, ginger and green chilli until fragrant.",
      "Add the purée and cayenne and cook for 8–10 minutes until thick and glossy.",
      "Stir in the milk and simmer 3 minutes to a pale, silky gravy.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-paneer-do-pyaza",
    name: { en: "Paneer Do Pyaza", hindi: "पनीर दो प्याज़ा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-790646", grams: 300 }, // onion — twice over, as the name promises
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170427", grams: 100 }, // green bell pepper (capsicum)
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cottage cheese into cubes. Slice two-thirds of the onion finely and cut the rest into petals. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the sliced onion and cook until deep golden; add the tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the capsicum and onion petals and stir-fry 3 minutes so they soften but keep their shape.",
      "Fold in the cottage-cheese cubes, toss gently for 3 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-achari-paneer",
    name: { en: "Achari Paneer", hindi: "अचारी पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cottage cheese into cubes. Crush the mustard, fennel, fenugreek and cumin seeds together coarsely — the achari (pickling) spice mix.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the crushed spices and let them crackle.",
      "Add the garlic, ginger and green chilli, then the onion, and cook until golden.",
      "Add the tomato, turmeric and cayenne and cook into a thick masala.",
      "Take the pan off the heat, whisk in the yogurt, return to a low heat and simmer 2 minutes without boiling hard.",
      "Fold in the cottage-cheese cubes, simmer gently for 3 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  /* ------------------------------- egg mains ----------------------------- */
  {
    id: "dish-egg-curry",
    name: { en: "Egg Curry", hindi: "अंडा करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs (8 large)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes, cool in water, peel, and prick each lightly with a fork. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add about 250 ml water and the salt and simmer 5 minutes to a curry consistency.",
      "Add the eggs, spoon the gravy over them, and simmer gently for 5 minutes. Finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-egg-masala",
    name: { en: "Egg Masala", hindi: "अंडा मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs (8 large)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170427", grams: 100 }, // green bell pepper (capsicum)
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel, and halve lengthways. Grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until deep golden; add the capsicum and cook 3 minutes.",
      "Add the tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick, dry-ish masala.",
      "Lay the egg halves in the masala, spoon it over them, cover, and steam on low heat for 4 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-anda-bhurji",
    name: { en: "Anda Bhurji", hindi: "अंडा भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 450 }, // eggs (9 large)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
    ],
    method: [
      "Beat the eggs with the salt until just combined. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden and sweet; add the tomato, ground coriander, turmeric and cayenne and cook until the tomato softens and the oil glistens.",
      "Lower the heat, pour in the eggs, and stir slowly and continuously, scraping the pan, until they form soft, moist curds — 3–4 minutes, no more.",
      "Take off the heat while still slightly glossy and finish with the coriander leaves.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-anda-matar-curry",
    name: { en: "Anda Matar Curry", hindi: "अंडा मटर करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 350 }, // eggs (7 large)
      { foodId: "usda-170419", grams: 250 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes, cool in water, and peel. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the peas with about 200 ml water and simmer 6–8 minutes until tender.",
      "Add the eggs, spoon the gravy over them, and simmer gently for 5 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  /* ----------------------------- chicken mains --------------------------- */
  {
    id: "dish-chicken-curry",
    name: { en: "Chicken Curry", hindi: "चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces and rub with half the salt and half the turmeric; rest 15 minutes. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, cardamom and cinnamon, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden — this is the base of the curry, so give it time.",
      "Add the tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook on medium heat for 12–15 minutes in its own juices until cooked through.",
      "Take off the heat, whisk in the yogurt, return to the lowest heat for 2 minutes without boiling, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-chicken-tikka-masala",
    name: { en: "Chicken Tikka Masala", hindi: "चिकन टिक्का मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt (hung curd)
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-170457", grams: 250 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into tikka cubes. Mix half the Greek yogurt with half the turmeric, half the cayenne and a pinch of the salt; coat the chicken and marinate for at least 30 minutes. Grind the coriander seeds coarsely.",
      "Grill or sear the chicken in a dry heavy pan on high heat until charred at the edges and just cooked; set aside with its juices.",
      "Melt the butter; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Blend the masala smooth if you like, return to the pan, and stir in the remaining Greek yogurt a spoonful at a time.",
      "Add the chicken and its juices, simmer gently for 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-chicken-keema-matar",
    name: { en: "Chicken Keema Matar", hindi: "चिकन कीमा मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast, minced in the method
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Mince the chicken breast finely with a knife or in short pulses in a processor — keema texture, not paste. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the minced chicken and stir-fry on high heat, breaking up every lump, until it loses its rawness and turns crumbly, about 8 minutes.",
      "Add the peas with a splash of water, cover, and simmer 6–8 minutes until the peas are tender.",
      "Finish with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kadai-chicken",
    name: { en: "Kadai Chicken", hindi: "कड़ाई चिकन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170427", grams: 150 }, // green bell pepper (capsicum)
      { foodId: "usda-170108", grams: 100 }, // red bell pepper
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces and the capsicums and half the onion into chunks. Crush the coriander seeds coarsely — the kadai masala.",
      "Heat the oil in a kadai or heavy pan; add the cumin, then the garlic, ginger and green chilli.",
      "Add the finely chopped onion and cook until golden; add the tomato, crushed coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 12–15 minutes until cooked through.",
      "Add the capsicum and onion chunks and stir-fry on high heat for 3–4 minutes so they char slightly but stay crisp. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-chicken-chettinad",
    name: { en: "Chicken Chettinad", hindi: "चिकन चेट्टिनाड" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170169", grams: 50 }, // coconut (fresh)
      { foodId: "usda-171016", grams: 25 }, // sesame oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces. Dry-roast the black pepper, fennel, cumin, coriander seeds, cinnamon and cloves until fragrant, then grind with the grated coconut to a coarse paste with a little water.",
      "Heat the sesame oil; add the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden; add the tomato and turmeric and cayenne and cook into a thick masala.",
      "Add the chicken and stir to coat; cover and cook for 10 minutes in its own juices.",
      "Add the ground coconut-spice paste with about 200 ml water and simmer 8–10 minutes until the chicken is cooked and the gravy is dark and aromatic. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-butter-chicken",
    name: { en: "Butter Chicken", hindi: "बटर चिकन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt (hung curd)
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into tikka cubes. Mix half the Greek yogurt with half the cayenne and a pinch of the salt; coat the chicken and marinate for at least 30 minutes.",
      "Grill or sear the chicken in a dry heavy pan on high heat until charred at the edges and just cooked; set aside.",
      "Simmer the tomato with about 200 ml water for 10 minutes until soft; blend smooth with the garlic, ginger and green chilli.",
      "Melt the butter; add the cardamom and fenugreek seeds and let them sizzle, then add the tomato purée and the remaining cayenne and cook 8–10 minutes until glossy.",
      "Stir in the milk and the remaining Greek yogurt and simmer 2 minutes to a silky, orange gravy.",
      "Add the chicken and its juices, simmer gently for 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-chicken-korma",
    name: { en: "Chicken Korma", hindi: "चिकन कोरमा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2259793", grams: 200 }, // yogurt (dahi)
      { foodId: "usda-2515374", grams: 40 }, // cashew nuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces. Soak the cashews in hot water for 15 minutes and blend to a smooth paste. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cardamom, cinnamon and cloves, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden; add the ground coriander, turmeric and black pepper and stir for a few seconds.",
      "Add the chicken, stir to coat, cover, and cook for 10 minutes in its own juices.",
      "Take off the heat and whisk in the yogurt a spoonful at a time; return to the lowest heat with the cashew paste and simmer gently for 8 minutes without boiling, until the chicken is cooked and the gravy is pale and silky.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-chicken-saag",
    name: { en: "Chicken Saag", hindi: "चिकन साग" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-168462", grams: 500 }, // spinach
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces. Blanch the spinach in boiling water for 2 minutes, drain, and chop coarsely. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 10 minutes.",
      "Add the spinach and simmer 6–8 minutes until the chicken is cooked through and the saag is dark and thick. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------ lamb & fish/seafood mains -------------------- */
  {
    id: "dish-mutton-keema-matar",
    name: { en: "Mutton Keema Matar", hindi: "मटन कीमा मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 500 }, // ground lamb (mutton keema)
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden; add the tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the ground lamb and stir-fry on high heat, breaking up every lump, until it browns and its fat begins to glisten, about 10 minutes.",
      "Add the peas with a splash of water, cover, and simmer 8–10 minutes until the peas are tender and the keema is cooked through.",
      "Finish with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-goan-fish-curry",
    name: { en: "Goan Fish Curry", hindi: "गोवा फिश करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the fish into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes. Soak the tamarind in 150 ml hot water, squeeze out the pulp and strain. Grind the coriander seeds coarsely.",
      "Grate the coconut and blend with about 200 ml warm water; squeeze and strain to make coconut milk.",
      "Heat the coconut oil; add the mustard seeds and let them pop, then the garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander, cayenne and the remaining turmeric and cook until soft.",
      "Add the coconut milk and tamarind water, bring to a gentle simmer, and slide in the fish; poach for 6–8 minutes without stirring hard, until the fish flakes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-fish-moilee",
    name: { en: "Fish Moilee", hindi: "फिश मोइली" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // cod
      { foodId: "usda-170169", grams: 120 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170924", grams: 3 }, // curry powder
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the fish into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes.",
      "Grate the coconut and blend with about 250 ml warm water; squeeze and strain to make coconut milk.",
      "Heat the coconut oil; add the garlic, ginger and green chilli and stir until fragrant — do not let them colour.",
      "Add the onion and cook gently until soft and translucent; add the tomato, curry powder, black pepper and the remaining turmeric and cook 3 minutes.",
      "Pour in the coconut milk, bring to the gentlest simmer, and slide in the fish; poach 6–8 minutes until it flakes. Finish with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-salmon-masala-curry",
    name: { en: "Salmon Masala Curry", hindi: "सैल्मन मसाला करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684441", grams: 600 }, // salmon
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the salmon into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes. Grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the mustard seeds and let them pop.",
      "Add the garlic, ginger and green chilli, then the onion, and cook until golden.",
      "Add the tomato, ground coriander, cayenne and the remaining turmeric and cook into a thick masala with a splash of water.",
      "Slide in the salmon, spoon the masala over it, cover, and cook on low heat for 7–9 minutes until it just flakes. Finish with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-prawn-masala",
    name: { en: "Prawn Masala", hindi: "झींगा मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175179", grams: 500 }, // shrimp (prawns)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Peel and devein the prawns and rub with a pinch of the salt and half the turmeric; rest 10 minutes. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden; add the tomato, ground coriander, cayenne and the remaining turmeric and cook into a thick masala.",
      "Add the prawns and stir-fry on high heat for 3–4 minutes, just until they curl and turn pink — no longer, or they toughen.",
      "Finish with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-tuna-potato-curry",
    name: { en: "Tuna Potato Curry", hindi: "टूना आलू करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-334194", grams: 400 }, // tuna (canned, drained)
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Drain the tuna and break it into large flakes. Cut the potato into small cubes. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the potato with about 250 ml water, cover, and simmer 12–15 minutes until tender.",
      "Fold in the tuna flakes gently and simmer 3 minutes to heat through. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  /* ---------------------------- vegetable mains -------------------------- */
  {
    id: "dish-baingan-bharta",
    name: { en: "Baingan Bharta", hindi: "बैंगन का भरता" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 900 }, // eggplant (brinjal)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
    ],
    method: [
      "Roast the whole eggplants directly over a flame or under a hot grill, turning, until the skins blacken and the flesh collapses, 12–15 minutes. Cool, peel, and mash the smoky flesh coarsely. Grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook until the oil separates.",
      "Add the peas and cook 3 minutes, then add the mashed eggplant and stir-fry for 6–8 minutes until the bharta thickens and smells smoky.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-bhindi-masala",
    name: { en: "Bhindi Masala", hindi: "भिंडी मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169260", grams: 700 }, // okra (bhindi)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Wash the okra and dry it completely — wet okra turns sticky. Trim and cut into 2 cm pieces. Grind the coriander seeds coarsely.",
      "Heat half the oil and stir-fry the okra on high heat for 7–8 minutes until the stickiness disappears and the edges colour; set aside.",
      "Heat the remaining oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Return the okra, toss to coat, and cook 3–4 minutes. Finish with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-aloo-matar",
    name: { en: "Aloo Matar", hindi: "आलू मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-170419", grams: 250 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the potato into cubes. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the potato with about 300 ml water, cover, and simmer 10 minutes.",
      "Add the peas and simmer 6–8 minutes more until both are tender and the gravy clings. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-gobi-masala",
    name: { en: "Gobi Masala", hindi: "गोबी मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685573", grams: 900 }, // cauliflower
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cauliflower into florets. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the cauliflower and peas with a splash of water, cover, and cook on low heat for 12–15 minutes, stirring now and then, until tender but not mashed.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-mixed-veg-curry",
    name: { en: "Mixed Vegetable Curry", hindi: "मिक्स वेज करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-170419", grams: 150 }, // green peas
      { foodId: "usda-170427", grams: 100 }, // green bell pepper (capsicum)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the potato and carrot into cubes, the beans into short pieces and the capsicum into chunks. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the potato and carrot with about 250 ml water, cover, and simmer 8 minutes.",
      "Add the beans, peas and capsicum and simmer 6–8 minutes more until everything is tender. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-mushroom-masala",
    name: { en: "Mushroom Masala", hindi: "मशरूम मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-1750347", grams: 700 }, // button mushrooms
      { foodId: "usda-170419", grams: 150 }, // green peas
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170427", grams: 100 }, // green bell pepper (capsicum)
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Quarter the mushrooms. Soak the cashews in hot water for 10 minutes and blend to a smooth paste. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the mushrooms on high heat and stir-fry 5–6 minutes until they release their water and it dries off.",
      "Add the peas and capsicum and cook 3 minutes; stir in the cashew paste and simmer 2 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-karela-aloo",
    name: { en: "Karela Aloo", hindi: "करेला आलू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168393", grams: 600 }, // bitter gourd (karela)
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 6 }, // salt — a little extra works on the karela first
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Scrape the karela lightly, slice into thin rounds, rub with a third of the salt and rest 20 minutes; squeeze out the bitter juice and rinse. Cut the potato into thin wedges. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin and fennel, then the garlic, ginger and green chilli.",
      "Add the karela and stir-fry on medium heat for 8–10 minutes until the edges brown.",
      "Add the potato, onion and tomato with the ground coriander, turmeric and cayenne, cover, and cook on low heat for 12–15 minutes until everything is tender.",
      "Adjust the salt — the karela was salted, so taste first — and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-aloo-baingan",
    name: { en: "Aloo Baingan", hindi: "आलू बैंगन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-2685577", grams: 500 }, // eggplant (brinjal)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the potato into wedges and the eggplant into chunks; keep the eggplant in water until cooking so it does not brown. Grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook until the oil separates.",
      "Add the potato with a splash of water, cover, and cook 8 minutes.",
      "Add the drained eggplant, cover, and cook 8–10 minutes more until both are tender. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-band-gobhi-matar",
    name: { en: "Band Gobhi Matar", hindi: "बंद गोबी मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346407", grams: 700 }, // cabbage
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Shred the cabbage finely. Grind the coriander seeds coarsely.",
      "Heat the oil; add the mustard seeds and let them pop, then the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until soft; add the tomato, ground coriander and turmeric and cook until the tomato softens.",
      "Add the cabbage and peas with the salt, toss well, cover, and cook on low heat for 10–12 minutes in the cabbage's own steam until just tender.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-beans-carrot-coconut-curry",
    name: { en: "Beans Carrot Coconut Curry", hindi: "बीन्स गाजर नारियल करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346400", grams: 400 }, // green beans
      { foodId: "usda-2258586", grams: 200 }, // carrot
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the beans into short pieces and the carrot into batons. Grate the coconut.",
      "Heat the sesame oil; add the mustard seeds and let them pop, then the garlic, ginger and green chilli.",
      "Add the onion and cook until soft.",
      "Add the carrot and beans with the turmeric, salt and about 150 ml water, cover, and cook 10–12 minutes until just tender.",
      "Stir in the grated coconut and cook 2 minutes. Finish with the lemon juice and coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sweet-potato-coconut-curry",
    name: { en: "Sweet Potato Coconut Curry", hindi: "शकरकंद नारियल करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346404", grams: 700 }, // sweet potato
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the sweet potato into cubes. Grate the coconut and blend with about 200 ml warm water; squeeze and strain to make coconut milk. Grind the coriander seeds coarsely.",
      "Heat the coconut oil; add the mustard seeds and let them pop, then the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander and turmeric and cook until soft.",
      "Add the sweet potato with about 200 ml water and the salt, cover, and simmer 12–15 minutes until tender.",
      "Pour in the coconut milk and simmer gently for 3 minutes without boiling hard. Finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-corn-capsicum-masala",
    name: { en: "Corn Capsicum Masala", hindi: "मकई शिमला मिर्च मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710826", grams: 400 }, // sweet corn
      { foodId: "usda-170427", grams: 200 }, // green bell pepper (capsicum)
      { foodId: "usda-170108", grams: 100 }, // red bell pepper
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the capsicums into chunks. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the corn with a splash of water, cover, and cook 6–8 minutes until tender.",
      "Add the capsicums and stir-fry 3 minutes so they stay crisp. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-aloo-palak",
    name: { en: "Aloo Palak", hindi: "आलू पालक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-168462", grams: 500 }, // spinach
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the potato into cubes and chop the spinach coarsely. Grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, cool a few seconds, then add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook until the oil separates.",
      "Add the potato with about 200 ml water, cover, and cook 10 minutes until nearly tender.",
      "Add the spinach and cook 4–5 minutes until it wilts into the potato. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-mushroom-matar",
    name: { en: "Mushroom Matar", hindi: "मशरूम मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-1750347", grams: 600 }, // button mushrooms
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Quarter the mushrooms. Grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the mushrooms on high heat and stir-fry 5–6 minutes until they release their water and it dries off.",
      "Add the peas with a splash of water and cook 4–5 minutes until tender. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-soya-matar",
    name: { en: "Soya Matar", hindi: "सोया मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 180 }, // soybeans, dry
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the soybeans and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the soybeans in about 700 ml water with half the salt for 6–7 whistles (or simmer 50 minutes) until tender.",
      "Heat the oil; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the soybeans and peas with a little of the cooking water and simmer 8–10 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
  },
  /* ------------------------- enriched variants ---------------------------
   * Deliberately boosted versions of popular dishes above; the boost is
   * stated in `enrichment` and visible in the lines themselves. */
  {
    id: "dish-chole-enriched",
    name: { en: "Chole Masala, Enriched", hindi: "छोले मसाला (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 280 }, // chickpeas, dry
      { foodId: "usda-328841", grams: 150 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the chickpeas and soak overnight; drain. Cut the cottage cheese into cubes. Grind the coriander seeds coarsely.",
      "Pressure-cook the chickpeas in about 900 ml water with half the salt for 6–7 whistles (or simmer 50–60 minutes) until tender.",
      "Heat the ghee; add the cumin, cardamom and cinnamon, then the garlic, ginger and green chilli.",
      "Add the onion and cook until deep golden; add the tomato, ground coriander, turmeric and cayenne and cook into a dark, thick masala.",
      "Add the chickpeas with their cooking water, mash a few to thicken, and simmer 12 minutes.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes. Finish with the lemon juice, salt to taste and coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: true,
    enrichment: "Finished with ghee instead of oil and folded with 150 g cottage cheese (paneer) cubes — extra protein and richness over the everyday chole.",
  },
  {
    id: "dish-rajma-enriched",
    name: { en: "Rajma Masala, Enriched", hindi: "राजमा मसाला (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175193", grams: 280 }, // kidney beans (rajma), dry
      { foodId: "usda-173410", grams: 25 }, // butter
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt (hung curd)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the rajma and soak overnight; drain. Grind the coriander seeds coarsely.",
      "Pressure-cook the rajma in about 900 ml water with half the salt for 6–7 whistles (or simmer 50–60 minutes) until soft enough to crush between fingers.",
      "Melt the butter; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the rajma with its cooking water, mash a few beans to thicken, and simmer 12 minutes.",
      "Take off the heat and whisk in the Greek yogurt; warm through gently for 2 minutes without boiling. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: true,
    enrichment: "A butter tadka and 150 g Greek yogurt stirred in at the end — a creamier, higher-protein rajma than the everyday version.",
  },
  {
    id: "dish-matar-paneer-enriched",
    name: { en: "Matar Paneer, Enriched", hindi: "मटर पनीर (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 550 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-170419", grams: 250 }, // green peas
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the cottage cheese into cubes. Soak the cashews in hot water for 10 minutes and blend to a smooth paste. Grind the coriander seeds coarsely.",
      "Heat the oil and butter together; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the peas with about 200 ml water and simmer 6–8 minutes until tender; stir in the cashew paste and simmer 2 minutes.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment: "Extra 150 g cottage cheese (paneer), a butter finish and cashew paste in the gravy — richer and higher in protein than the everyday matar paneer.",
  },
  {
    id: "dish-palak-paneer-enriched",
    name: { en: "Palak Paneer, Enriched", hindi: "पालक पनीर (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 500 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-168462", grams: 600 }, // spinach
      { foodId: "usda-173410", grams: 25 }, // butter
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt (hung curd)
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Blanch the spinach in boiling water for 2 minutes, drain, refresh in cold water, and blend to a coarse purée. Cut the cottage cheese into cubes. Grind the coriander seeds coarsely.",
      "Heat the oil and butter together; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and turmeric and cook until soft.",
      "Add the spinach purée and simmer 5 minutes until it darkens and thickens.",
      "Take off the heat, whisk in the Greek yogurt, fold in the cottage-cheese cubes, and warm through gently for 3 minutes without boiling. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: true,
    enrichment: "Extra 150 g cottage cheese (paneer) plus butter and Greek yogurt — a creamier, protein-boosted palak paneer.",
  },
  {
    id: "dish-egg-curry-enriched",
    name: { en: "Egg Curry, Enriched", hindi: "अंडा करी (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 550 }, // eggs (11 large)
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes, cool in water, peel, and prick each lightly with a fork. Grind the coriander seeds coarsely.",
      "Heat the ghee; add the cumin, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add about 250 ml water and the salt and simmer 5 minutes to a curry consistency.",
      "Add the eggs, spoon the gravy over them, and simmer gently for 5 minutes. Finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment: "Three extra eggs and a ghee tadka instead of oil — more protein and a richer gravy than the everyday egg curry.",
  },
  {
    id: "dish-chicken-curry-enriched",
    name: { en: "Chicken Curry, Enriched", hindi: "चिकन करी (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 750 }, // chicken breast
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-2259793", grams: 150 }, // yogurt (dahi)
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces and rub with half the salt and half the turmeric; rest 15 minutes. Soak the cashews in hot water for 10 minutes and blend with the yogurt to a smooth sauce. Grind the coriander seeds coarsely.",
      "Heat the ghee; add the cumin, cardamom and cinnamon, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until deep golden.",
      "Add the tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 12–15 minutes until cooked through.",
      "Take off the heat, whisk in the cashew-yogurt sauce, and warm through gently for 3 minutes without boiling. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: true,
    enrichment: "Extra 150 g chicken, a ghee finish and a cashew-yogurt gravy — richer and higher in protein than the everyday chicken curry.",
  },
  {
    id: "dish-dal-makhani-enriched",
    name: { en: "Dal Makhani, Enriched", hindi: "दाल मखनी (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174259", grams: 200 }, // black gram (urad dal), dry
      { foodId: "usda-175193", grams: 60 }, // kidney beans (rajma), dry
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt (hung curd)
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the urad dal and rajma and soak together overnight; drain. Grind the coriander seeds coarsely.",
      "Simmer the dals in about 1 litre water with half the salt for 50–60 minutes (or pressure-cook 6–7 whistles) until completely soft; mash a ladleful against the side of the pot.",
      "Melt the butter; add the cumin and cardamom, then the garlic, ginger and green chilli until fragrant.",
      "Add the onion and cook until golden; add the tomato, ground coriander and cayenne and cook until dark and glossy.",
      "Add the masala to the dals with the milk and simmer on the lowest heat for 20 minutes, stirring now and then, until thick and creamy.",
      "Take off the heat and whisk in the Greek yogurt; warm through gently for 2 minutes without boiling. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: true,
    enrichment: "Double the butter of the everyday version, plus Greek yogurt and milk simmered in — a creamier, protein-boosted dal makhani.",
  },
  {
    id: "dish-baingan-bharta-enriched",
    name: { en: "Baingan Bharta, Enriched", hindi: "बैंगन का भरता (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 900 }, // eggplant (brinjal)
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-172430", grams: 40 }, // peanuts (groundnuts)
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
    ],
    method: [
      "Roast the whole eggplants directly over a flame or under a hot grill, turning, until the skins blacken and the flesh collapses, 12–15 minutes. Cool, peel, and mash the smoky flesh coarsely. Roast the peanuts in a dry pan and crush coarsely. Grind the coriander seeds coarsely.",
      "Heat the ghee; add the cumin, garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander, turmeric and cayenne and cook until the oil separates.",
      "Add the peas and cook 3 minutes, then add the mashed eggplant and stir-fry for 6–8 minutes until thick and smoky.",
      "Take off the heat, swirl in the yogurt and scatter the crushed peanuts over the top. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: true,
    enrichment: "Ghee instead of oil, crushed roasted peanuts and a yogurt swirl — a richer, nuttier bharta with more protein than the everyday version.",
  },
  {
    id: "dish-khichdi-enriched",
    name: { en: "Khichdi, Enriched", hindi: "खिचड़ी (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 150 }, // mung beans (moong dal), dry
      { foodId: "usda-2512381", grams: 250 }, // white rice, dry
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-328841", grams: 150 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2515374", grams: 20 }, // cashew nuts
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the moong dal and rice together and soak for 20 minutes; drain. Dice the carrot and cut the cottage cheese into small cubes.",
      "Heat the ghee; add the bay leaf and cumin and let the cumin sizzle, then add the ginger and cashews and stir until the cashews colour lightly.",
      "Add the carrot and peas and stir for 2 minutes, then add the drained dal and rice, the turmeric and the salt.",
      "Pour in about 900 ml hot water, cover, and cook on the lowest heat for 18–20 minutes until soft and porridge-like.",
      "Fold in the cottage-cheese cubes, rest covered for 5 minutes so they warm through, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: true,
    enrichment: "Extra ghee, cottage cheese (paneer) cubes and cashews folded in — a protein- and energy-boosted khichdi.",
  },
  {
    id: "dish-goan-fish-curry-enriched",
    name: { en: "Goan Fish Curry, Enriched", hindi: "गोवा फिश करी (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 700 }, // tilapia
      { foodId: "usda-170169", grams: 180 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the fish into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes. Soak the tamarind in 150 ml hot water, squeeze out the pulp and strain. Grind the coriander seeds coarsely.",
      "Grate the coconut and blend with about 250 ml warm water; squeeze and strain to make a thick coconut milk.",
      "Heat the coconut oil; add the mustard seeds and let them pop, then the garlic, ginger and green chilli.",
      "Add the onion and cook until golden; add the tomato, ground coriander, cayenne and the remaining turmeric and cook until soft.",
      "Add the coconut milk and tamarind water, bring to a gentle simmer, and slide in the fish; poach for 7–9 minutes without stirring hard, until the fish flakes. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: true,
    enrichment: "Extra 100 g fish and nearly double the coconut of the everyday version — a richer, higher-protein Goan-style curry.",
  },
];
