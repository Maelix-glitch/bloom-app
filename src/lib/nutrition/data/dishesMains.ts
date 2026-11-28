/**
 * The MAINS library (D2, dishes content) — hand-authored Indian main
 * dishes over the USDA reference foods: dals and legume mains,
 * paneer mains (their paneer lines cost the real paneer record, UK
 * CoFID cofid-12-495, since M-264; before that a cottage-cheese
 * stand-in), egg mains, chicken and fish mains, vegetable mains, and enriched
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
      "Rinse the 240 g arhar dal until the water runs almost clear, then soak in plenty of water for 30 minutes; drain.",
      "Pressure-cook the dal with about 800 ml water, the turmeric and half the salt for 3-4 whistles (or simmer 35-40 minutes) until completely soft, a grain should mash to paste between your fingers.",
      "Whisk the cooked dal briskly until creamy but not gluey; stir in a splash of hot water if it sits too thick, and keep it warm.",
      "Heat the 20 g mustard oil in a small pan until it just begins to smoke and turns paler; take it off the heat for a few seconds so it does not burn the spices.",
      "Return the pan to the heat, add the cumin seeds and let them crackle and darken a shade, about 10 seconds.",
      "Add the garlic, ginger and green chilli and fry until the garlic is golden at the edges; add the 100 g onion and cook, stirring, until deep golden, 6-8 minutes.",
      "Add the 100 g tomato and the cayenne and cook until the tomato melts and the oil glistens at the edges of the pan.",
      "Pour the tadka into the dal, stir, and simmer together for 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 240 g arhar dal until the water runs almost clear; drain.",
      "Pressure-cook the dal with about 800 ml water, the turmeric and half the salt for 3-4 whistles (or simmer 35-40 minutes) until completely soft; whisk smooth and keep warm.",
      "Pound or grind the coriander seeds coarsely, they should stay gritty, not turn to powder.",
      "Heat the 20 g ghee in a heavy pan until it shimmers; add the cumin seeds and let them crackle and darken a shade.",
      "Add the garlic, ginger and green chilli and fry until the garlic turns golden at the edges and smells nutty.",
      "Add the 150 g onion and fry, stirring often, until deep golden, 8-10 minutes, this colour is the dal fry's flavour.",
      "Add the 150 g tomato, ground coriander and cayenne and cook until the tomato collapses into a thick masala and the ghee glistens at the edges.",
      "Pour the cooked dal into the masala, simmer 5 minutes so the flavours marry, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 240 g moong dal until the water runs almost clear; drain, moong needs no soaking.",
      "Simmer the dal in about 800 ml water with the turmeric and half the salt for 20-25 minutes, skimming off any foam, until the grains are soft and the dal turns creamy.",
      "Heat the 20 g oil in a small pan; add the mustard seeds and wait until they finish popping, about 20 seconds.",
      "Add the cumin, garlic, ginger and green chilli and fry until the garlic is pale gold and fragrant.",
      "Add the 100 g onion and cook until golden at the edges, 5-6 minutes.",
      "Add the 100 g tomato and cook until it melts into the oil and the mixture thickens.",
      "Pour the tadka over the dal, stir, and simmer 2 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Rinse the 150 g moong dal and 250 g rice together until the water runs clearer, then soak for 20 minutes; drain.",
      "Dice the 100 g carrot into small cubes so it cooks through in the same time as the rice.",
      "Heat the 20 g ghee in a heavy pot; add the bay leaf and cumin and let the cumin sizzle and darken a shade.",
      "Add the ginger and stir for a few seconds until fragrant, then add the carrot and 100 g peas and stir-fry for 2 minutes.",
      "Tip in the drained dal and rice with the turmeric and salt; stir gently for a minute so the grains are glossed with ghee.",
      "Pour in about 900 ml hot water, bring to a boil, then cover and cook on the lowest heat for 18-20 minutes until the rice is soft and the khichdi porridge-like.",
      "Rest, covered and off the heat, for 5 minutes; stir once, it should slump softly off the spoon, and serve steaming.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Rinse the 240 g urad dal and soak in plenty of water for at least 1 hour; drain.",
      "Simmer the dal in about 900 ml water with the turmeric and half the salt for 40-45 minutes (or pressure-cook for 5 whistles) until the grains are tender and the dal turns creamy.",
      "Whisk the dal lightly, it should stay slightly coarse, with some grains still visible.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the cumin, garlic, ginger and green chilli and fry until the garlic colours at the edges.",
      "Add the 100 g onion and cook until golden, 6-8 minutes.",
      "Add the 100 g tomato and black pepper and cook until the tomato melts and the oil separates at the edges.",
      "Pour the tadka into the dal, simmer 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse all five dals together, 60 g masoor, 60 g moong, 60 g arhar, 40 g urad and 40 g chickpeas, and soak for 30 minutes; drain.",
      "Pressure-cook the dals with about 900 ml water, the turmeric and half the salt for 4 whistles (or simmer about 40 minutes) until every dal is soft; whisk lightly so the dal stays textured.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a small pan; add the mustard seeds and wait until they finish popping.",
      "Add the cumin, garlic, ginger and green chilli and fry until the garlic is pale gold.",
      "Add the 100 g onion and cook until golden, 6-8 minutes.",
      "Add the 100 g tomato, ground coriander and cayenne and cook until the tomato melts and the oil glistens at the edges.",
      "Pour the tadka into the dals, simmer 5 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 220 g masoor dal until the water runs almost clear; drain, masoor needs no soaking.",
      "Simmer the dal in about 750 ml water with the turmeric and half the salt for 18-20 minutes until the grains collapse and the dal is soft.",
      "Meanwhile wash the 300 g spinach well and chop it roughly, stalks and all.",
      "Heat the 20 g oil in a wide pan; add the cumin, garlic, ginger and green chilli and fry until fragrant and the garlic is pale gold.",
      "Add the 100 g onion and cook until golden at the edges, 5-6 minutes.",
      "Add the 100 g tomato and cook until it softens and melts into the oil.",
      "Add the spinach a handful at a time, stirring until each handful wilts before adding the next, about 3 minutes in all; it should stay bright green.",
      "Stir the spinach mixture into the dal and simmer 3 minutes; adjust the salt and finish off the heat with the lemon juice and coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Rinse the 200 g urad dal and 60 g rajma and soak together in plenty of water overnight; drain.",
      "Simmer the dals in about 1 litre water with half the salt for 50-60 minutes (or pressure-cook for 6-7 whistles) until completely soft, a bean should crush without resistance.",
      "Mash a ladleful of the dals against the side of the pot and stir it back in; this is what makes the makhani creamy.",
      "Pound or grind the coriander seeds coarsely.",
      "Melt the 30 g butter in a heavy pan; add the cumin and cardamom, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 6-8 minutes; add the 200 g tomato, ground coriander and cayenne and cook until dark, thick and glossy.",
      "Add the masala to the dals with the 150 ml milk and simmer on the lowest heat for 20 minutes, stirring now and then so it does not catch, until thick and creamy.",
      "Adjust the salt and finish with the coriander leaves; rest 5 minutes before serving, it thickens as it sits.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 280 g rajma and soak in plenty of water overnight; drain.",
      "Pressure-cook the rajma in about 900 ml water with half the salt for 6-7 whistles (or simmer 50-60 minutes) until soft enough to crush between your fingers; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala, until the oil glistens at the edges.",
      "Add the rajma with its cooking water and mash a few beans against the side of the pan to thicken the gravy.",
      "Simmer 15 minutes until the gravy clings to the beans; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 280 g chickpeas and soak in plenty of water overnight; drain.",
      "Pressure-cook the chickpeas in about 900 ml water with half the salt for 6-7 whistles (or simmer 50-60 minutes) until tender, one should squash easily between finger and thumb; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the cumin, cardamom and cinnamon and let them sizzle; add the garlic, ginger and green chilli and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a dark, thick masala.",
      "Add the chickpeas with their cooking water, mash a few to thicken, and simmer 15 minutes; finish off the heat with the lemon juice, salt to taste and the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 260 g black beans and soak in plenty of water overnight; drain.",
      "Pressure-cook the beans in about 900 ml water with half the salt for 5-6 whistles (or simmer 45-50 minutes) until tender; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the beans with their cooking water and mash a few against the side of the pan to thicken the gravy.",
      "Simmer 12 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 240 g lobia and soak for 4-6 hours; drain.",
      "Pressure-cook the lobia in about 800 ml water with half the salt for 3-4 whistles (or simmer 30-35 minutes) until tender but still holding its shape; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook until the tomato melts and the oil separates at the edges.",
      "Add the lobia with its cooking water and simmer 10 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 240 g pinto beans and soak in plenty of water overnight; drain.",
      "Pressure-cook the beans in about 900 ml water with half the salt for 5-6 whistles (or simmer about 45 minutes) until tender; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander and turmeric and cook into a thick masala.",
      "Add the beans with their cooking water, mash a few to thicken, and simmer 12 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 240 g white (navy) beans and soak in plenty of water overnight; drain.",
      "Pressure-cook the beans in about 900 ml water with half the salt for 5-6 whistles (or simmer about 45 minutes) until tender; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the beans with their cooking water, mash a few to thicken, and simmer 12 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 160 g arhar dal and pressure-cook in about 700 ml water with the turmeric and half the salt for 3-4 whistles until completely soft; whisk smooth.",
      "Soak the 30 g tamarind in 200 ml hot water for 10 minutes, squeeze out the pulp and strain the juice.",
      "Pound or grind the coriander seeds coarsely. Cut the carrot, green beans and eggplant into bite-size pieces.",
      "Simmer the carrot, green beans, eggplant, 50 g onion and 100 g tomato in about 400 ml water for 8-10 minutes until just tender, a knife should slide in without force.",
      "Add the tamarind water, ground coriander and cayenne to the vegetables and simmer 5 minutes so the sourness settles.",
      "Stir in the cooked dal and simmer together 5 minutes; the sambar should pour like a thin soup. Adjust the salt.",
      "Heat the 20 g sesame oil in a small pan; add the mustard seeds and fenugreek and let them crackle and darken, watch closely, fenugreek burns bitter.",
      "Pour the tempering over the sambar, cover for a minute, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 200 g soybeans and soak in plenty of water overnight; drain.",
      "Pressure-cook the soybeans in about 800 ml water with half the salt for 6-7 whistles (or simmer about 50 minutes) until tender; keep a little of the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the soybeans with a little of their cooking water and simmer 12 minutes so they drink in the masala; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 220 g whole lentils until the water runs clearer; drain.",
      "Simmer the lentils in about 850 ml water with the turmeric and half the salt for 30-35 minutes until tender but still holding their shape.",
      "Wash the 300 g spinach well and chop it roughly.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the cumin, garlic, ginger and green chilli and fry until the garlic colours at the edges.",
      "Add the 100 g onion and cook until golden, 5-6 minutes; add the 100 g tomato and cook until it softens into the oil.",
      "Add the spinach and cook, stirring, until it wilts right down, about 3 minutes.",
      "Stir everything into the lentils and simmer 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala, until the oil glistens at the edges.",
      "Add the 500 g peas with about 150 ml water and the salt; stir so every pea is coated in masala.",
      "Cover and simmer 10-12 minutes until the peas are tender and the gravy clings to them, taste one: it should squash softly, not crunch.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Soak the 220 g moong in water overnight; drain, tie in a clean cloth and leave in a warm place for 8-12 hours until short white sprouts appear.",
      "Heat the 20 g oil in a wide pan; add the mustard seeds and wait until they finish popping.",
      "Add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato and turmeric and cook until the tomato is soft and the oil glistens.",
      "Add the sprouted moong with about 200 ml water and the salt, cover, and simmer 10-12 minutes until just tender, the sprouts should keep a little bite, not turn mushy.",
      "Finish off the heat with the lemon juice and coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Rinse the 240 g whole lentils and soak for 1 hour; drain.",
      "Simmer the lentils in about 900 ml water with the turmeric and half the salt for 30-35 minutes until tender but still whole, they should give when pressed, not burst.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the cumin, garlic, ginger and green chilli and fry until the garlic colours at the edges.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 100 g tomato and black pepper and cook until the tomato melts and the oil separates at the edges.",
      "Pour the tadka into the lentils and simmer 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Rinse the 220 g masoor dal until the water runs almost clear; drain.",
      "Simmer the dal in about 750 ml water with the turmeric and half the salt for 18-20 minutes until soft and collapsing.",
      "Grate the 80 g coconut and blend it with about 150 ml warm water; squeeze through a cloth and strain to make a thin coconut milk.",
      "Heat the 15 g coconut oil in a pan; add the mustard seeds and wait until they finish popping.",
      "Add the garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes; add the 100 g tomato and cook until soft.",
      "Stir the masala and the coconut milk into the dal and simmer gently for 5 minutes, do not boil hard once the coconut milk is in, or it may split.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Rinse the 220 g arhar dal until the water runs almost clear; drain.",
      "Pressure-cook the dal with about 800 ml water, the turmeric and half the salt for 3-4 whistles until completely soft; whisk smooth.",
      "Heat the 20 g oil in a pan; add the mustard seeds and wait until they finish popping, then add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 50 g onion and cook until soft and translucent, 3-4 minutes.",
      "Add the 300 g tomato and cayenne and cook, stirring, until the tomato melts into a thick, tangy sauce and the oil glistens.",
      "Pour the tomato mixture into the dal and simmer 5 minutes so the tang settles into the dal.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  /* ------------------------------ paneer mains ---------------------------
   * Paneer lines cost the real paneer record (UK CoFID, cofid-12-495)
   * since M-264; before that they rode the cottage-cheese stand-in. */
  {
    id: "dish-matar-paneer",
    name: { en: "Matar Paneer", hindi: "मटर पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Cut the 400 g cottage cheese into bite-size cubes and set aside, it goes in at the end so it stays soft.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the 250 g peas with about 200 ml water and the salt; simmer 6-8 minutes until the peas are tender.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes, no longer, so they stay soft and do not turn rubbery.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-palak-paneer",
    name: { en: "Palak Paneer", hindi: "पालक पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 350 }, // paneer, from the CoFID record
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
      "Blanch the 600 g spinach in boiling water for 2 minutes until it wilts and turns bright green; drain and refresh in cold water to hold the colour.",
      "Squeeze the spinach lightly and blend to a coarse purée, leave some texture, do not make it a juice.",
      "Cut the 350 g cottage cheese into cubes. Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato, ground coriander and turmeric and cook until the tomato softens into the oil.",
      "Add the spinach purée and simmer 5 minutes until it darkens a shade and thickens.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-paneer-bhurji",
    name: { en: "Paneer Bhurji", hindi: "पनीर भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 450 }, // paneer, from the CoFID record
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
      "Crumble the 450 g cottage cheese coarsely with your fingers, pea-size pieces, not a paste.",
      "Pound or grind the coriander seeds coarsely.",
      "Melt the 15 g butter in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 5-6 minutes; add the 100 g capsicum and cook 3 minutes until it softens at the edges.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook until the tomato melts and the butter glistens at the edges.",
      "Add the crumbled cottage cheese and stir-fry gently for 3-4 minutes until everything is hot and coated, it should stay moist and soft, not fry dry.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kadai-paneer",
    name: { en: "Kadai Paneer", hindi: "कड़ाई पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Cut the 400 g cottage cheese into cubes. Cut the capsicums and half the onion into chunky pieces; chop the remaining onion finely.",
      "Crush the coriander seeds coarsely, this crushed coriander is the kadai masala; keep it gritty.",
      "Heat the 25 g oil in a kadai or heavy pan until it shimmers; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the finely chopped onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, crushed coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the capsicum and onion chunks and stir-fry on high heat for 3-4 minutes so they char slightly at the edges but stay crisp.",
      "Fold in the cottage-cheese cubes and toss for 2 minutes to coat them in the masala; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-paneer-butter-masala",
    name: { en: "Paneer Butter Masala", hindi: "पनीर बटर मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Soak the 30 g cashews in hot water for 15 minutes until softened.",
      "Blend the cashews with the 250 g tomato and 50 g onion to a completely smooth purée. Cut the 400 g cottage cheese into cubes.",
      "Melt the 30 g butter in a heavy pan; add the cardamom and cinnamon, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the tomato-cashew purée and the cayenne and cook, stirring often, for 8-10 minutes until thick and glossy and the butter glistens at the edges.",
      "Stir in the 100 ml milk and simmer 2 minutes to a silky gravy.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes, no longer, so they stay soft.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-paneer-tikka-masala",
    name: { en: "Paneer Tikka Masala", hindi: "पनीर टिक्का मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Cut the 400 g cottage cheese into large cubes.",
      "Mix half the Greek yogurt with half the turmeric, half the cayenne and a pinch of the salt; coat the cubes and marinate for 20 minutes.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat half the oil in a heavy pan and sear the marinated cubes until golden at the edges, 2-3 minutes; set aside.",
      "Heat the remaining oil; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes; add the 200 g tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Add the 100 g capsicum and cook 3 minutes until it softens at the edges; stir in the remaining Greek yogurt a spoonful at a time so it does not split.",
      "Return the seared cubes, simmer gently for 3 minutes, adjust the salt, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-shahi-paneer",
    name: { en: "Shahi Paneer", hindi: "शाही पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Soak the 40 g cashews in hot water for 15 minutes until softened.",
      "Blend the cashews with the 200 g tomato and 100 g onion to a completely smooth purée. Cut the 400 g cottage cheese into cubes.",
      "Melt the 20 g butter in a heavy pan; add the cardamom, cinnamon and cloves, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the purée and cayenne and cook, stirring often, for 8-10 minutes until thick and glossy.",
      "Stir in the 150 ml milk and simmer 3 minutes to a pale, silky gravy.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes so they stay soft.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-paneer-do-pyaza",
    name: { en: "Paneer Do Pyaza", hindi: "पनीर दो प्याज़ा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Cut the 400 g cottage cheese into cubes.",
      "Slice two-thirds of the 300 g onion finely and cut the rest into petals, the onion goes in twice, as the name promises.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the sliced onion and cook until deep golden, 8-10 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the 100 g capsicum and the onion petals and stir-fry 3 minutes so they soften but keep their shape.",
      "Fold in the cottage-cheese cubes and toss gently for 3 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-achari-paneer",
    name: { en: "Achari Paneer", hindi: "अचारी पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
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
      "Cut the 400 g cottage cheese into cubes.",
      "Crush the mustard, fennel, fenugreek and cumin seeds together coarsely, the achari (pickling) spice mix; keep it gritty.",
      "Heat the 25 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the crushed spices and let them crackle for a few seconds, they should smell sharp and nutty, not burnt.",
      "Add the garlic, ginger and green chilli, then the 100 g onion, and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, turmeric and cayenne and cook into a thick masala.",
      "Take the pan off the heat and whisk in the 100 g yogurt; return to a low heat and simmer 2 minutes without boiling hard, so the yogurt stays smooth.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Boil the 8 eggs for 9 minutes until hard; cool in cold water, peel, and prick each lightly with a fork so the gravy can reach in.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add about 250 ml water and the salt and simmer 5 minutes to a curry consistency, it should coat the back of a spoon.",
      "Add the eggs, spoon the gravy over them, and simmer gently for 5 minutes; finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Boil the 8 eggs for 9 minutes until hard; cool, peel, and halve lengthways.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes; add the 100 g capsicum and cook 3 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick, fairly dry masala.",
      "Lay the egg halves in the masala, spoon it over them, cover, and steam on low heat for 4 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Beat the 9 eggs with the salt until just combined, no need to whip them frothy.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden and sweet, 6-8 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook until the tomato softens and the oil glistens.",
      "Lower the heat, pour in the eggs, and stir slowly and continuously, scraping the pan, until they form soft, moist curds, 3-4 minutes, no more.",
      "Take off the heat while the eggs are still slightly glossy, they finish in the pan's warmth, and scatter over the coriander leaves.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Boil the 7 eggs for 9 minutes until hard; cool in cold water and peel.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the 250 g peas with about 200 ml water and the salt; simmer 6-8 minutes until the peas are tender.",
      "Add the eggs, spoon the gravy over them, and simmer gently for 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 600 g chicken into curry pieces and rub with half the salt and half the turmeric; rest 15 minutes.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a heavy pan; add the cumin, cardamom and cinnamon, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 200 g onion and cook until deep golden, 10-12 minutes, this is the base of the curry, so give it time.",
      "Add the 200 g tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook on medium heat for 12-15 minutes in its own juices until cooked through, the thickest piece should show no pink at the centre.",
      "Take the pan off the heat and whisk in the 100 g yogurt; return to the lowest heat for 2 minutes without boiling, so the gravy stays smooth.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 600 g chicken into tikka cubes.",
      "Mix half the Greek yogurt with half the turmeric, half the cayenne and a pinch of the salt; coat the chicken and marinate for at least 30 minutes.",
      "Pound or grind the coriander seeds coarsely.",
      "Grill the chicken or sear it in a dry heavy pan on high heat until charred at the edges and just cooked; set aside with its juices.",
      "Melt the 20 g butter in the same pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 6-8 minutes; add the 250 g tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Blend the masala smooth if you like, return it to the pan, and stir in the remaining Greek yogurt a spoonful at a time so it does not split.",
      "Add the chicken and its juices and simmer gently for 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Mince the 500 g chicken breast finely with a knife or in short pulses in a processor, keema texture, not paste.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes; add the 150 g tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the minced chicken and stir-fry on high heat, breaking up every lump with the spoon, until it loses its rawness and turns crumbly and opaque, about 8 minutes.",
      "Add the 200 g peas with a splash of water and the salt, cover, and simmer 6-8 minutes until the peas are tender.",
      "Finish off the heat with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 600 g chicken into curry pieces. Cut the capsicums and half the onion into chunky pieces; chop the remaining onion finely.",
      "Crush the coriander seeds coarsely, the kadai masala; keep it gritty.",
      "Heat the 25 g oil in a kadai or heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the finely chopped onion and cook until golden, 6-8 minutes; add the 150 g tomato, crushed coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 12-15 minutes until cooked through, no pink at the centre of the thickest piece.",
      "Add the capsicum and onion chunks and stir-fry on high heat for 3-4 minutes so they char slightly at the edges but stay crisp.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 600 g chicken into curry pieces.",
      "Dry-roast the black pepper, fennel, cumin, coriander seeds, cinnamon and cloves in a dry pan until fragrant, 1-2 minutes, do not let them smoke.",
      "Grind the roasted spices with the grated 50 g coconut to a coarse paste with a little water.",
      "Heat the 25 g sesame oil in a heavy pan; add the garlic, ginger and green chilli and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 150 g tomato, turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 10 minutes in its own juices.",
      "Add the ground coconut-spice paste with about 200 ml water and the salt; simmer 8-10 minutes until the chicken is cooked and the gravy is dark and aromatic. Finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Cut the 600 g chicken into tikka cubes.",
      "Mix half the Greek yogurt with half the cayenne and a pinch of the salt; coat the chicken and marinate for at least 30 minutes.",
      "Grill the chicken or sear it in a dry heavy pan on high heat until charred at the edges and just cooked; set aside.",
      "Simmer the 300 g tomato with about 200 ml water for 10 minutes until completely soft; blend smooth with the garlic, ginger and green chilli.",
      "Melt the 40 g butter in a heavy pan; add the cardamom and fenugreek seeds and let them sizzle for a few seconds.",
      "Add the tomato purée and the remaining cayenne and cook 8-10 minutes, stirring, until thick and glossy.",
      "Stir in the 100 ml milk and the remaining Greek yogurt and simmer 2 minutes to a silky, orange gravy, do not boil hard.",
      "Add the chicken and its juices and simmer gently for 5 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Cut the 600 g chicken into curry pieces.",
      "Soak the 40 g cashews in hot water for 15 minutes and blend to a smooth paste. Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cardamom, cinnamon and cloves, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the ground coriander, turmeric and black pepper and stir for a few seconds so the spices bloom in the oil.",
      "Add the chicken, stir to coat, cover, and cook for 10 minutes in its own juices.",
      "Take the pan off the heat and whisk in the 200 g yogurt a spoonful at a time; return to the lowest heat with the cashew paste and simmer gently for 8 minutes without boiling, until the chicken is cooked and the gravy is pale and silky.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Cut the 600 g chicken into curry pieces.",
      "Blanch the 500 g spinach in boiling water for 2 minutes until wilted and bright green; drain, refresh in cold water, and chop coarsely.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 6-8 minutes.",
      "Add the 100 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 10 minutes, stirring once or twice.",
      "Add the spinach and simmer 6-8 minutes until the chicken is cooked through and the saag is dark and thick; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the 500 g ground lamb and stir-fry on high heat, breaking up every lump, until it browns and its fat begins to glisten, about 10 minutes.",
      "Add the 200 g peas with a splash of water and the salt, cover, and simmer 8-10 minutes until the peas are tender and the keema is cooked through.",
      "Finish off the heat with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 600 g fish into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes.",
      "Soak the 30 g tamarind in 150 ml hot water for 10 minutes, squeeze out the pulp and strain the juice.",
      "Grate the 100 g coconut and blend with about 200 ml warm water; squeeze and strain to make coconut milk. Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g coconut oil in a wide pan; add the mustard seeds and wait until they finish popping, then add the garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato, ground coriander, cayenne and the remaining turmeric and cook until the tomato softens.",
      "Add the coconut milk and tamarind water and bring to the gentlest simmer, do not boil hard.",
      "Slide in the fish and poach for 6-8 minutes without stirring hard, until the fish flakes at a touch; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Cut the 600 g fish into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes.",
      "Grate the 120 g coconut and blend with about 250 ml warm water; squeeze and strain to make coconut milk.",
      "Heat the 20 g coconut oil in a wide pan; add the garlic, ginger and green chilli and stir until fragrant, do not let them colour.",
      "Add the 100 g onion and cook gently until soft and translucent, 4-5 minutes.",
      "Add the 100 g tomato, curry powder, black pepper and the remaining turmeric and cook 3 minutes until the tomato softens.",
      "Pour in the coconut milk and bring to the gentlest simmer; slide in the fish and poach 6-8 minutes until it flakes at a touch.",
      "Finish off the heat with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Cut the 600 g salmon into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds, then add the mustard seeds and wait until they finish popping.",
      "Add the garlic, ginger and green chilli, then the 100 g onion, and cook until golden, 5-6 minutes.",
      "Add the 200 g tomato, ground coriander, cayenne and the remaining turmeric with a splash of water and cook into a thick masala.",
      "Slide in the salmon, spoon the masala over it, cover, and cook on low heat for 7-9 minutes until it just flakes.",
      "Finish off the heat with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Peel and devein the 500 g prawns and rub with a pinch of the salt and half the turmeric; rest 10 minutes.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 200 g tomato, ground coriander, cayenne and the remaining turmeric and cook into a thick masala.",
      "Add the prawns and stir-fry on high heat for 3-4 minutes, just until they curl into a C and turn pink, no longer, or they toughen.",
      "Finish off the heat with the lemon juice, adjust the salt, and scatter over the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Drain the 400 g tuna and break it into large flakes; keep it chunky.",
      "Cut the 300 g potato into small cubes. Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the potato with about 250 ml water and the salt, cover, and simmer 12-15 minutes until the potato is tender.",
      "Fold in the tuna flakes gently and simmer 3 minutes to heat through; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
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
      "Roast the whole 900 g eggplants directly over a flame or under a hot grill, turning often, until the skins blacken and blister and the flesh collapses, 12-15 minutes.",
      "Cool until you can handle them, peel off the charred skin, and mash the smoky flesh coarsely with a fork.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds, then add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook until the oil separates at the edges.",
      "Add the 100 g peas and cook 3 minutes, then add the mashed eggplant and stir-fry for 6-8 minutes until the bharta thickens and smells smoky.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Wash the 700 g okra and dry it completely, wet okra turns sticky. Trim and cut into 2 cm pieces.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat half the oil in a wide pan and stir-fry the okra on high heat for 7-8 minutes until the stickiness disappears and the edges colour; set aside.",
      "Heat the remaining oil in the same pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Return the okra with the salt and toss to coat; cook 3-4 minutes until tender but still holding its shape.",
      "Finish off the heat with the lemon juice and scatter over the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 500 g potato into even cubes so they cook at the same rate.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the potato with about 300 ml water and the salt, cover, and simmer 10 minutes until nearly tender.",
      "Add the 250 g peas and simmer 6-8 minutes more until both are tender and the gravy clings; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 900 g cauliflower into even florets, not too small or they will mash.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the cauliflower and 100 g peas with a splash of water and the salt, cover, and cook on low heat for 12-15 minutes, stirring now and then, until tender but not mashed.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 300 g potato and 150 g carrot into cubes, the beans into short pieces and the capsicum into chunks, everything roughly the same size.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes; add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the potato and carrot with about 250 ml water and the salt, cover, and simmer 8 minutes.",
      "Add the beans, peas and capsicum and simmer 6-8 minutes more until everything is tender but the capsicum still has bite.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Quarter the 700 g mushrooms, halves if they are small, so they sear rather than steam.",
      "Soak the 30 g cashews in hot water for 10 minutes and blend to a smooth paste. Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric, cayenne and black pepper and cook into a thick masala.",
      "Add the mushrooms on high heat and stir-fry 5-6 minutes until they release their water, it dries off, and they brown lightly.",
      "Add the peas and 100 g capsicum and cook 3 minutes until the capsicum softens at the edges.",
      "Stir in the cashew paste and simmer 2 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Scrape the 600 g karela lightly, slice into thin rounds, rub with a third of the salt and rest 20 minutes.",
      "Squeeze out the bitter juice with your hands and rinse the slices. Cut the 300 g potato into thin wedges.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 30 g oil in a wide pan; add the cumin and fennel, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the karela and stir-fry on medium heat for 8-10 minutes until the edges brown, browning is what tames the bitterness.",
      "Add the potato and 200 g onion and stir to coat in the oil.",
      "Add the 100 g tomato with the ground coriander, turmeric and cayenne, cover, and cook on low heat for 12-15 minutes until everything is tender.",
      "Adjust the salt, the karela was salted at the start, so taste first, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 400 g potato into wedges and the 500 g eggplant into chunks; keep the eggplant in water until cooking so it does not brown.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds, then add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook until the oil separates at the edges.",
      "Add the potato with a splash of water and the salt, cover, and cook 8 minutes until nearly tender.",
      "Add the drained eggplant, cover, and cook 8-10 minutes more until both are tender and the eggplant is silky; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Shred the 700 g cabbage finely.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a wide pan; add the mustard seeds and wait until they finish popping, then add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until soft, 3-4 minutes.",
      "Add the 100 g tomato, ground coriander and turmeric and cook until the tomato softens.",
      "Add the cabbage and 200 g peas with the salt, toss well, cover, and cook on low heat for 10-12 minutes in the cabbage's own steam until just tender, it should still have a little bite.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 400 g beans into short pieces and the 200 g carrot into batons of a similar size.",
      "Grate the 60 g coconut.",
      "Heat the 20 g sesame oil in a wide pan; add the mustard seeds and wait until they finish popping, then add the garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until soft, 3-4 minutes.",
      "Add the carrot and beans with the turmeric, salt and about 150 ml water, cover, and cook 10-12 minutes until just tender.",
      "Stir in the grated coconut and cook 2 minutes so it coats the vegetables.",
      "Finish off the heat with the lemon juice and coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 700 g sweet potato into even cubes.",
      "Grate the 80 g coconut and blend with about 200 ml warm water; squeeze and strain to make coconut milk.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 15 g coconut oil in a heavy pan; add the mustard seeds and wait until they finish popping, then add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato, ground coriander and turmeric and cook until the tomato softens.",
      "Add the sweet potato with about 200 ml water and the salt, cover, and simmer 12-15 minutes until tender, a cube should yield to a spoon.",
      "Pour in the coconut milk and simmer gently for 3 minutes without boiling hard; finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
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
      "Cut the capsicums into chunky pieces.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the 400 g corn with a splash of water and the salt, cover, and cook 6-8 minutes until the kernels are tender and sweet.",
      "Add the capsicums and stir-fry 3 minutes so they soften at the edges but stay crisp; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
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
      "Cut the 500 g potato into cubes and chop the 500 g spinach coarsely.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds, then add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato, ground coriander, turmeric and cayenne and cook until the oil separates at the edges.",
      "Add the potato with about 200 ml water and the salt, cover, and cook 10 minutes until nearly tender.",
      "Add the spinach and cook 4-5 minutes until it wilts into the potato; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Quarter the 600 g mushrooms, halves if they are small.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g oil in a wide pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the mushrooms on high heat and stir-fry 5-6 minutes until they release their water, it dries off, and they brown lightly.",
      "Add the 200 g peas with a splash of water and the salt and cook 4-5 minutes until tender; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
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
      "Rinse the 180 g soybeans and soak in plenty of water overnight; drain.",
      "Pressure-cook the soybeans in about 700 ml water with half the salt for 6-7 whistles (or simmer about 50 minutes) until tender; keep a little of the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g oil in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 150 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the soybeans and 200 g peas with a little of the cooking water and simmer 8-10 minutes until the peas are tender; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
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
      { foodId: "cofid-12-495", grams: 150 }, // paneer, from the CoFID record
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
      "Rinse the 280 g chickpeas and soak in plenty of water overnight; drain. Cut the 150 g cottage cheese into cubes.",
      "Pressure-cook the chickpeas in about 900 ml water with half the salt for 6-7 whistles (or simmer 50-60 minutes) until tender; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g ghee in a heavy pan; add the cumin, cardamom and cinnamon, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a dark, thick masala.",
      "Add the chickpeas with their cooking water, mash a few to thicken, and simmer 12 minutes.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes; finish off the heat with the lemon juice, salt to taste and the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: true,
    enrichment: "Finished with ghee instead of oil and folded with 150 g cottage cheese (paneer) cubes, extra protein and richness over the everyday chole.",
    equipment: ["stove", "pressure_cooker"],
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
      "Rinse the 280 g rajma and soak in plenty of water overnight; drain.",
      "Pressure-cook the rajma in about 900 ml water with half the salt for 6-7 whistles (or simmer 50-60 minutes) until soft enough to crush between your fingers; keep the cooking water.",
      "Pound or grind the coriander seeds coarsely.",
      "Melt the 25 g butter in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until deep golden, 8-10 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the rajma with its cooking water, mash a few beans to thicken, and simmer 12 minutes.",
      "Take the pan off the heat and whisk in the 150 g Greek yogurt; warm through gently for 2 minutes without boiling. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: true,
    enrichment: "A butter tadka and 150 g Greek yogurt stirred in at the end, a creamier, higher-protein rajma than the everyday version.",
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-matar-paneer-enriched",
    name: { en: "Matar Paneer, Enriched", hindi: "मटर पनीर (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 550 }, // paneer, from the CoFID record
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
      "Cut the 550 g cottage cheese into cubes.",
      "Soak the 30 g cashews in hot water for 10 minutes and blend to a smooth paste. Pound or grind the coriander seeds coarsely.",
      "Heat the oil and 20 g butter together in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add the 250 g peas with about 200 ml water and the salt; simmer 6-8 minutes until tender.",
      "Stir in the cashew paste and simmer 2 minutes until the gravy turns silky.",
      "Fold in the cottage-cheese cubes and simmer gently for 3 minutes; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment: "Extra 150 g cottage cheese (paneer), a butter finish and cashew paste in the gravy, richer and higher in protein than the everyday matar paneer.",
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-palak-paneer-enriched",
    name: { en: "Palak Paneer, Enriched", hindi: "पालक पनीर (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 500 }, // paneer, from the CoFID record
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
      "Blanch the 600 g spinach in boiling water for 2 minutes until wilted and bright green; drain, refresh in cold water, and blend to a coarse purée.",
      "Cut the 500 g cottage cheese into cubes. Pound or grind the coriander seeds coarsely.",
      "Heat the oil and 25 g butter together in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato, ground coriander and turmeric and cook until the tomato softens into the oil.",
      "Add the spinach purée and simmer 5 minutes until it darkens a shade and thickens.",
      "Take the pan off the heat and whisk in the 100 g Greek yogurt; fold in the cottage-cheese cubes and warm through gently for 3 minutes without boiling.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: true,
    enrichment: "Extra 150 g cottage cheese (paneer) plus butter and Greek yogurt, a creamier, protein-boosted palak paneer.",
    equipment: ["stove", "mixer_grinder"],
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
      "Boil the 11 eggs for 9 minutes until hard; cool in cold water, peel, and prick each lightly with a fork so the gravy can reach in.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g ghee in a heavy pan; add the cumin, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook into a thick masala.",
      "Add about 250 ml water and the salt and simmer 5 minutes to a curry consistency, it should coat the back of a spoon.",
      "Add the eggs, spoon the gravy over them, and simmer gently for 5 minutes; finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment: "Three extra eggs and a ghee tadka instead of oil, more protein and a richer gravy than the everyday egg curry.",
    equipment: ["stove"],
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
      "Cut the 750 g chicken into curry pieces and rub with half the salt and half the turmeric; rest 15 minutes.",
      "Soak the 30 g cashews in hot water for 10 minutes and blend with the 150 g yogurt to a smooth sauce. Pound or grind the coriander seeds coarsely.",
      "Heat the 20 g ghee in a heavy pan; add the cumin, cardamom and cinnamon, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 200 g onion and cook until deep golden, 10-12 minutes.",
      "Add the 200 g tomato, ground coriander and the remaining turmeric and cayenne and cook into a thick masala.",
      "Add the chicken, stir to coat, cover, and cook for 12-15 minutes until cooked through, no pink at the centre of the thickest piece.",
      "Take the pan off the heat and whisk in the cashew-yogurt sauce; warm through gently for 3 minutes without boiling.",
      "Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: true,
    enrichment: "Extra 150 g chicken, a ghee finish and a cashew-yogurt gravy, richer and higher in protein than the everyday chicken curry.",
    equipment: ["stove", "mixer_grinder"],
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
      "Rinse the 200 g urad dal and 60 g rajma and soak together in plenty of water overnight; drain.",
      "Simmer the dals in about 1 litre water with half the salt for 50-60 minutes (or pressure-cook for 6-7 whistles) until completely soft; mash a ladleful against the side of the pot and stir it back in.",
      "Pound or grind the coriander seeds coarsely.",
      "Melt the 50 g butter in a heavy pan; add the cumin and cardamom, then the garlic, ginger and green chilli, and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 6-8 minutes.",
      "Add the 200 g tomato, ground coriander and cayenne and cook until dark and glossy.",
      "Add the masala to the dals with the 100 ml milk and simmer on the lowest heat for 20 minutes, stirring now and then, until thick and creamy.",
      "Take the pan off the heat and whisk in the 150 g Greek yogurt; warm through gently for 2 minutes without boiling. Adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: true,
    enrichment: "Double the butter of the everyday version, plus Greek yogurt and milk simmered in, a creamier, protein-boosted dal makhani.",
    equipment: ["stove", "pressure_cooker"],
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
      "Roast the whole 900 g eggplants directly over a flame or under a hot grill, turning often, until the skins blacken and the flesh collapses, 12-15 minutes.",
      "Cool until you can handle them, peel off the charred skin, and mash the smoky flesh coarsely.",
      "Roast the 40 g peanuts in a dry pan until spotted and nutty, then crush coarsely. Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g ghee in a wide pan; add the cumin, garlic, ginger and green chilli and fry until fragrant.",
      "Add the 150 g onion and cook until golden, 6-8 minutes.",
      "Add the 200 g tomato, ground coriander, turmeric and cayenne and cook until the oil separates at the edges.",
      "Add the 100 g peas and cook 3 minutes, then add the mashed eggplant and stir-fry for 6-8 minutes until thick and smoky.",
      "Take off the heat, swirl in the 100 g yogurt and scatter the crushed peanuts over the top; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: true,
    enrichment: "Ghee instead of oil, crushed roasted peanuts and a yogurt swirl, a richer, nuttier bharta with more protein than the everyday version.",
    equipment: ["stove"],
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
      { foodId: "cofid-12-495", grams: 150 }, // paneer, from the CoFID record
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
      "Rinse the 150 g moong dal and 250 g rice together and soak for 20 minutes; drain.",
      "Dice the 100 g carrot and cut the 150 g cottage cheese into small cubes.",
      "Heat the 30 g ghee in a heavy pot; add the bay leaf and cumin and let the cumin sizzle, then add the ginger and 20 g cashews and stir until the cashews colour lightly.",
      "Add the carrot and 100 g peas and stir for 2 minutes.",
      "Tip in the drained dal and rice with the turmeric and salt; stir gently so the grains are glossed with ghee.",
      "Pour in about 900 ml hot water, cover, and cook on the lowest heat for 18-20 minutes until soft and porridge-like.",
      "Fold in the cottage-cheese cubes, rest covered for 5 minutes so they warm through, and finish with the coriander leaves.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: true,
    enrichment: "Extra ghee, cottage cheese (paneer) cubes and cashews folded in, a protein- and energy-boosted khichdi.",
    equipment: ["stove"],
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
      "Cut the 700 g fish into large pieces and rub with a pinch of the salt and half the turmeric; rest 10 minutes.",
      "Soak the 30 g tamarind in 150 ml hot water for 10 minutes, squeeze out the pulp and strain the juice.",
      "Grate the 180 g coconut and blend with about 250 ml warm water; squeeze and strain to make a thick coconut milk. Pound or grind the coriander seeds coarsely.",
      "Heat the 25 g coconut oil in a wide pan; add the mustard seeds and wait until they finish popping, then add the garlic, ginger and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5-6 minutes.",
      "Add the 100 g tomato, ground coriander, cayenne and the remaining turmeric and cook until the tomato softens.",
      "Add the coconut milk and tamarind water and bring to the gentlest simmer.",
      "Slide in the fish and poach for 7-9 minutes without stirring hard, until the fish flakes at a touch; adjust the salt and finish with the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: true,
    enrichment: "Extra 100 g fish and nearly double the coconut of the everyday version, a richer, higher-protein Goan-style curry.",
    equipment: ["stove", "mixer_grinder"],
  },
];
