/**
 * The rice, breads, breakfast and snacks library (D2, part B).
 *
 * Hand-authored recipes over the USDA reference foods, in exactly the
 * shape of the D1 proof dishes: every line names a reference food and a
 * gram amount for the WHOLE recipe, and no nutrient value appears
 * anywhere in this file — a dish's numbers exist only as `dishNutrients`
 * computes them from its lines. Patterns are likewise never stated
 * here; they are derived by `dishPatterns` from the ingredient lines.
 *
 * Coverage notes (honest absences): there is no flattened rice in the
 * reference set, so there is no poha; there is no cracked wheat, so the
 * porridge is barley; bajra and jowar exist only as whole grains, not
 * flours, so there are no bajra/jowar rotis (makki di roti uses the
 * cornmeal that IS in the set); methi exists only as seed, so the
 * parathas are spiced, not methi thepla. Urad (mungo beans) IS in the
 * set, so the idli and dosa batters are genuine rice-flour + urad.
 */

import type { Dish } from "../dishes";

export const DISHES_RICE_BREAD: Dish[] = [
  /* ------------------------------- RICE ------------------------------- */
  {
    id: "dish-veg-pulao",
    name: { en: "Vegetable Pulao", hindi: "सब्ज़ी पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain.",
      "Heat the ghee in a heavy pot; add bay leaf, cardamom, cloves and cumin and let them sizzle for a few seconds.",
      "Add the onion and cook until golden; add the carrot, beans and peas and stir for 2 minutes.",
      "Add the rice, salt and about 550 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Rest, covered, for 10 minutes, then fluff with a fork.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-matar-pulao",
    name: { en: "Peas Pulao", hindi: "मटर पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170419", grams: 150 }, // green peas
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171314", grams: 12 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain.",
      "Heat the ghee, add the bay leaf and cumin, and let the cumin darken a shade.",
      "Add the onion and cook until soft and golden at the edges.",
      "Add the peas, rice, salt and about 550 ml hot water; cover and cook on low heat for 10 minutes.",
      "Rest 10 minutes, covered, and fluff before serving.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-mushroom-pulao",
    name: { en: "Mushroom Pulao", hindi: "मशरूम पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-1750347", grams: 250 }, // button mushrooms
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain. Slice the mushrooms thickly.",
      "Heat the oil in a heavy pot; sear the mushrooms on high heat until they colour, then set aside.",
      "In the same pot add cumin, garlic, ginger and onion; cook until the onion is golden.",
      "Add the rice, peas, salt and about 550 ml hot water; cover and cook on low heat for 10 minutes.",
      "Fold the mushrooms back in, rest 10 minutes covered, and finish with black pepper and coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-moong-dal-khichdi",
    name: { en: "Moong Dal Khichdi", hindi: "मूंग दाल खिचड़ी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-174256", grams: 150 }, // mung beans (moong dal), dry
      { foodId: "usda-171314", grams: 12 }, // ghee
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and moong dal together until the water runs clear; soak 20 minutes and drain.",
      "Put them in a pressure cooker with about 900 ml water, the turmeric, ginger and salt; cook for 3 whistles (or simmer 25 minutes) until very soft.",
      "Whisk lightly so the khichdi turns creamy and porridge-like; add hot water if it is too thick.",
      "Heat the ghee in a small pan, sizzle the cumin until it darkens a shade, and pour over the khichdi.",
      "Rest 5 minutes and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-masala-khichdi",
    name: { en: "Masala Khichdi", hindi: "मसाला खिचड़ी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-174256", grams: 120 }, // mung beans (moong dal), dry
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 15 }, // mustard oil
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the rice and moong dal together; soak 20 minutes and drain. Grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes, take it off the heat briefly, then add cumin, ginger and garlic.",
      "Add the onion and cook until golden; add the tomato, turmeric, ground coriander, cayenne and salt and cook until the oil glistens.",
      "Add the potato, carrot, peas, rice and dal with about 900 ml water; pressure-cook for 3 whistles (or simmer 25 minutes) until soft.",
      "Whisk lightly to a creamy porridge, rest 5 minutes, and finish with coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-veg-biryani",
    name: { en: "Vegetable Biryani", hindi: "सब्ज़ी बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-2259793", grams: 150 }, // yogurt (dahi)
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170924", grams: 4 }, // curry powder
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173475", grams: 10 }, // mint leaves
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Rinse and soak the rice for 30 minutes. Whisk the yogurt with the turmeric, curry powder and half the salt; stir in the potato, carrot, beans and peas and leave to marinate.",
      "Boil the rice in plenty of salted water with the bay leaf, cardamom, cinnamon and cloves until just underdone (about 70%); drain.",
      "Heat the ghee; fry the onion until deep golden. Add ginger, garlic and green chilli, then the marinated vegetables with their yogurt; cook 8–10 minutes until the potato is nearly tender.",
      "Layer the rice over the vegetables; scatter mint, coriander leaves and lemon juice on top.",
      "Cover tightly and cook on the lowest heat (dum) for 15 minutes; rest 10 minutes before opening.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-egg-biryani",
    name: { en: "Egg Biryani", hindi: "अंडा बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-171287", grams: 300 }, // eggs (6 large)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170924", grams: 4 }, // curry powder
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173475", grams: 10 }, // mint leaves
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and halve. Rinse and soak the rice for 30 minutes.",
      "Boil the rice in salted water with the bay leaf and cardamom until just underdone; drain.",
      "Heat the mustard oil until it just smokes; fry the onion until deep golden, then add ginger, garlic and green chilli.",
      "Add the tomato, turmeric, curry powder and salt; cook until the oil glistens. Stir in the yogurt and cook 3 minutes into a thick masala.",
      "Nestle the eggs into the masala, layer the rice over, and scatter mint and coriander leaves.",
      "Cover tightly and cook on the lowest heat for 12 minutes; rest 10 minutes before opening.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-chicken-biryani",
    name: { en: "Chicken Biryani", hindi: "चिकन बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-2646171", grams: 400 }, // chicken thigh, boneless
      { foodId: "usda-2259793", grams: 150 }, // yogurt (dahi)
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170924", grams: 5 }, // curry powder
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173475", grams: 10 }, // mint leaves
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Marinate the chicken for at least 30 minutes in the yogurt with the turmeric, curry powder, half the ginger and garlic, and half the salt.",
      "Rinse and soak the rice for 30 minutes; boil in salted water with the bay leaf, cardamom, cinnamon and cloves until just underdone; drain.",
      "Heat the ghee; fry the onion until deep golden. Add the remaining ginger, garlic and the green chilli, then the tomato; cook until the oil glistens.",
      "Add the chicken with its marinade; cook on high heat 8–10 minutes until the masala thickens and the chicken is nearly done.",
      "Layer the rice over the chicken; scatter mint, coriander leaves and lemon juice.",
      "Cover tightly and cook on the lowest heat (dum) for 15 minutes; rest 10 minutes before opening.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-chicken-pulao",
    name: { en: "Chicken Pulao", hindi: "चिकन पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-2646170", grams: 300 }, // chicken breast, boneless
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse and soak the rice for 20 minutes. Cut the chicken into bite-size pieces and stir it into the yogurt with half the salt; rest 15 minutes.",
      "Heat the oil in a heavy pot; add bay leaf, cardamom and cumin, then the onion; cook until golden.",
      "Add ginger, garlic and green chilli; add the chicken with its marinade and cook on high heat for 6–8 minutes.",
      "Add the rice and about 550 ml hot water; cover and cook on the lowest heat for 12 minutes.",
      "Rest 10 minutes covered, fluff, and finish with coriander leaves.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-lemon-rice",
    name: { en: "Lemon Rice", hindi: "नींबू चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-171410", grams: 20 }, // peanut (groundnut) oil
      { foodId: "usda-172430", grams: 25 }, // peanuts
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-167746", grams: 60 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cook the rice in salted water until just done; drain, spread on a tray and let it cool completely so the grains stay separate.",
      "Heat the oil; fry the peanuts until golden and crisp, then lift them out.",
      "In the same oil, sizzle the mustard seeds until they pop, then the cumin, green chilli and ginger; take off the heat and stir in the turmeric.",
      "Pour the tempering over the rice with the lemon juice and salt; fold gently until every grain is yellow.",
      "Scatter the peanuts and coriander leaves over and serve warm or at room temperature.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-tamarind-rice",
    name: { en: "Tamarind Rice (Puliyodharai)", hindi: "इमली चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-167763", grams: 40 }, // tamarind
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-172430", grams: 25 }, // peanuts
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
    ],
    method: [
      "Cook the rice until just done; drain, spread and cool so the grains stay separate.",
      "Soak the tamarind in 150 ml warm water for 15 minutes; squeeze out the pulp and strain.",
      "Heat the sesame oil; fry the peanuts until crisp and lift out. Sizzle the mustard seeds, cumin and red chilli in the same oil.",
      "Add the tamarind pulp, turmeric, cayenne and salt; simmer 6–8 minutes until thick and glossy.",
      "Fold the tamarind paste through the rice with the sesame seeds; rest 10 minutes so the flavour settles, then scatter peanuts and coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-curd-rice",
    name: { en: "Curd Rice", hindi: "दही चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 250 }, // white rice, dry
      { foodId: "usda-2259793", grams: 400 }, // yogurt (dahi)
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
    ],
    method: [
      "Cook the rice softer than usual; while hot, mash lightly with the back of a spoon.",
      "Stir in the milk and let the rice cool to warm, then fold in the yogurt and salt.",
      "Fold in the finely diced cucumber.",
      "Heat the oil; sizzle the mustard seeds and cumin, add ginger and green chilli for a few seconds, and pour the tempering over the rice.",
      "Finish with coriander leaves; serve at room temperature or lightly chilled.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-tomato-rice",
    name: { en: "Tomato Rice", hindi: "टमाटर चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-172337", grams: 15 }, // mustard oil
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain. Chop the tomatoes roughly.",
      "Heat the mustard oil until it just smokes; sizzle the mustard seeds and cumin, then add ginger, garlic and green chilli.",
      "Add the onion and cook until golden; add the tomatoes, turmeric and salt and cook until the tomatoes melt and the oil glistens.",
      "Add the rice and about 520 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Rest 10 minutes covered, fluff, and finish with coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-coconut-rice",
    name: { en: "Coconut Rice", hindi: "नारियल चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170169", grams: 80 }, // fresh coconut
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-172430", grams: 20 }, // peanuts
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cook the rice until just done; drain, spread and cool slightly so the grains stay separate. Grate the coconut.",
      "Heat the coconut oil; fry the peanuts until crisp and lift out.",
      "Sizzle the mustard seeds and cumin in the same oil; add green chilli and ginger for a few seconds.",
      "Add the grated coconut and stir on low heat for 2 minutes until it smells toasted but has not browned.",
      "Fold everything through the rice with the salt; scatter the peanuts and coriander leaves over.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-jeera-matar-rice",
    name: { en: "Jeera Matar Rice", hindi: "जीरा मटर चावल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170419", grams: 120 }, // green peas
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171314", grams: 12 }, // ghee
      { foodId: "usda-170923", grams: 4 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain.",
      "Heat the ghee; add bay leaf, cinnamon and the cumin and let the cumin sizzle and darken a shade.",
      "Add the onion and cook until golden at the edges.",
      "Add the peas, rice, salt and about 550 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Rest 10 minutes covered and fluff with a fork.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-ven-pongal",
    name: { en: "Ven Pongal", hindi: "वेन पोंगल" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-174256", grams: 100 }, // mung beans (moong dal), dry
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-2515374", grams: 15 }, // cashew nuts
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dry-roast the moong dal in a pan until it smells nutty; rinse it with the rice.",
      "Pressure-cook the rice and dal with about 900 ml water, the ginger and salt for 4 whistles (or simmer 30 minutes) until completely soft.",
      "Mash lightly to a creamy porridge; add hot water if too thick. Crush the black pepper coarsely.",
      "Heat the ghee; fry the cashews until golden, then sizzle the cumin and crushed pepper for a few seconds.",
      "Pour the tempering over the pongal, stir, and serve hot with extra ghee at the table if you like.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-soya-pulao",
    name: { en: "Soya Pulao", hindi: "सोया पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 250 }, // white rice, dry
      { foodId: "usda-174270", grams: 100 }, // soybeans, dry
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the soybeans overnight; boil until tender (about 30 minutes) and drain. Rinse and soak the rice for 20 minutes.",
      "Heat the oil in a heavy pot; add bay leaf and cumin, then the onion; cook until golden.",
      "Add ginger, turmeric, carrot and peas; stir for 2 minutes.",
      "Add the cooked soybeans, rice, salt and about 500 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Rest 10 minutes covered and fluff before serving.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-millet-khichdi",
    name: { en: "Millet Khichdi", hindi: "बाजरा खिचड़ी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512379", grams: 200 }, // millet, whole grain
      { foodId: "usda-174256", grams: 100 }, // mung beans (moong dal), dry
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-170419", grams: 60 }, // green peas
      { foodId: "usda-171314", grams: 12 }, // ghee
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the millet and moong dal together; soak for 30 minutes and drain.",
      "Pressure-cook with about 900 ml water, the turmeric, ginger and salt for 4 whistles (or simmer 35 minutes) until soft.",
      "Stir in the carrot and peas and simmer 5 more minutes until the vegetables are tender.",
      "Heat the ghee, sizzle the cumin until it darkens a shade, and pour over the khichdi.",
      "Rest 5 minutes and serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-egg-fried-rice",
    name: { en: "Egg Fried Rice", hindi: "अंडा फ्राइड राइस" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-171287", grams: 200 }, // eggs (4 large)
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-2346407", grams: 100 }, // cabbage
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171411", grams: 20 }, // soybean oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cook the rice until just done; drain, spread and cool completely — cold rice fries best.",
      "Heat half the oil in a wide pan; scramble the eggs in large soft curds and set aside.",
      "Add the remaining oil; stir-fry the garlic, onion, carrot, beans and cabbage on high heat for 3–4 minutes, keeping them crisp.",
      "Add the rice, salt and black pepper; toss on high heat for 2–3 minutes until the grains are glossy and hot.",
      "Fold the egg back in, splash the vinegar around the edge of the pan, toss once more and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-cottage-cheese-pulao",
    name: { en: "Cottage Cheese Pulao", hindi: "कॉटेज चीज़ पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-328841", grams: 200 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain. Crumble the cottage cheese into coarse pieces.",
      "Heat the ghee in a heavy pot; add bay leaf, cardamom and cumin and let them sizzle.",
      "Add the onion and cook until golden; add the carrot and peas and stir for 2 minutes.",
      "Add the rice, salt and about 550 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Fold the cottage cheese gently through the hot rice, rest 5 minutes covered, and finish with coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: true,
    enrichment: "Cottage cheese crumbled through the rice plus peas and carrot, over the plain jeera-style pulao",
  },
  {
    id: "dish-enriched-veg-biryani",
    name: { en: "Enriched Vegetable Biryani", hindi: "खास सब्ज़ी बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-328841", grams: 150 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-2259793", grams: 150 }, // yogurt (dahi)
      { foodId: "usda-2346401", grams: 100 }, // potato
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170924", grams: 4 }, // curry powder
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173475", grams: 10 }, // mint leaves
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rinse and soak the rice for 30 minutes. Whisk the yogurt with the turmeric, curry powder and half the salt; marinate the potato and peas in it.",
      "Boil the rice in salted water with the bay leaf and cardamom until just underdone; drain.",
      "Heat the ghee; fry the cashews until golden and lift out. Fry the onion in the same ghee until deep golden; add ginger, garlic and green chilli.",
      "Add the marinated vegetables and cook 8–10 minutes; crumble in the cottage cheese for the last 2 minutes.",
      "Layer the rice over the vegetables; scatter mint, coriander leaves and the fried cashews.",
      "Cover tightly and cook on the lowest heat (dum) for 15 minutes; rest 10 minutes before opening.",
    ],
    timeMinutes: 65,
    budgetTier: 2,
    enriched: true,
    enrichment: "Cashews and cottage cheese layered through, with extra ghee, over the standard vegetable biryani",
  },
  /* ------------------------------ BREADS ------------------------------ */
  {
    id: "dish-phulka-roti",
    name: { en: "Phulka (Roti)", hindi: "फुल्का रोटी" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour (atta)
      { foodId: "usda-171314", grams: 4 }, // ghee, for brushing
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the atta and salt with about 150 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls and roll each into a thin disc about 15 cm across.",
      "Cook each disc on a hot tawa until spots appear, flip, then hold it over a direct flame (or press with a cloth on the tawa) until it puffs.",
      "Brush lightly with ghee and keep wrapped in a cloth until serving.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-whole-wheat-paratha",
    name: { en: "Whole Wheat Paratha", hindi: "गेहूं का पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 280 }, // whole wheat flour (atta)
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the atta and salt with about 170 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls; roll each out, brush with ghee, fold into a triangle, and roll again.",
      "Cook on a hot tawa, pressing the edges with a spatula and brushing both sides with the remaining ghee, until golden spots appear.",
      "Serve hot, stacked and covered.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-aloo-paratha",
    name: { en: "Aloo Paratha", hindi: "आलू पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour (atta)
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the potatoes until tender; peel and mash while warm. Knead a soft atta dough with half the salt and rest it 20 minutes.",
      "Mix the potato with the finely chopped onion, green chilli, crushed cumin and coriander seeds, turmeric, remaining salt and coriander leaves; cool completely.",
      "Roll a dough ball into a small disc, place a ball of filling in the centre, seal, and roll gently into a paratha.",
      "Cook on a hot tawa with ghee on both sides until golden and crisp at the edges.",
      "Serve hot — with plain yogurt alongside if you like (not counted in the lines).",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-gobi-paratha",
    name: { en: "Gobi Paratha", hindi: "गोबी पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour (atta)
      { foodId: "usda-2685573", grams: 300 }, // cauliflower
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Grate the cauliflower, sprinkle with a little of the salt, rest 10 minutes, then squeeze out as much water as you can.",
      "Mix the cauliflower with the grated ginger, green chilli, crushed cumin, turmeric, remaining salt and coriander leaves.",
      "Knead a soft atta dough and rest 20 minutes; roll a ball into a disc, fill, seal and roll gently into a paratha.",
      "Cook on a hot tawa with ghee on both sides until golden spots appear.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-poori",
    name: { en: "Poori", hindi: "पूरी" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour (atta)
      { foodId: "usda-168933", grams: 20 }, // semolina (sooji), for crispness
      { foodId: "usda-171025", grams: 40 }, // sunflower oil, for deep frying
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the atta, semolina and salt with about 130 ml water into a STIFF dough; rest, covered, for 15 minutes.",
      "Divide into 12 small balls and roll each into a disc about 10 cm across, without flour if you can (a drop of oil on the board helps).",
      "Heat the oil in a kadhai until very hot; slide in one poori at a time and press gently with a slotted spoon until it puffs.",
      "Flip, cook a few seconds more until pale gold, and drain on paper. Serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-bhatura",
    name: { en: "Bhatura", hindi: "भटूरा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 240 }, // refined wheat flour (maida)
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-168933", grams: 20 }, // semolina (sooji)
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-171025", grams: 40 }, // sunflower oil, for deep frying
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the maida, semolina, sugar and salt with the yogurt and a little warm water into a soft dough; rest, covered, for at least 2 hours until puffy.",
      "Divide into 8 balls and roll each into an oval about 15 cm long.",
      "Heat the oil in a kadhai until very hot; slide in one bhatura at a time and press gently until it balloons.",
      "Flip once, cook until pale gold with light spots, drain and serve hot.",
    ],
    timeMinutes: 150,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-naan",
    name: { en: "Naan", hindi: "नान" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 280 }, // refined wheat flour (maida)
      { foodId: "usda-2259793", grams: 80 }, // yogurt (dahi)
      { foodId: "usda-322892", grams: 50 }, // whole milk
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-171314", grams: 15 }, // ghee, for brushing
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the maida, sugar and salt with the yogurt and warm milk into a soft, slightly sticky dough; rest, covered, for 2 hours until risen.",
      "Divide into 8 balls; roll each into a teardrop or oval about 18 cm long.",
      "Cook on a very hot tawa: lay the naan wet-side down, cook until bubbles appear, then flip onto a direct flame (or invert the tawa over the flame) until charred spots appear.",
      "Brush with ghee and serve at once, wrapped in a cloth.",
    ],
    timeMinutes: 150,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-garlic-naan",
    name: { en: "Garlic Naan", hindi: "लहसुन नान" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 280 }, // refined wheat flour (maida)
      { foodId: "usda-1104647", grams: 25 }, // garlic
      { foodId: "usda-2259793", grams: 80 }, // yogurt (dahi)
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Knead the maida, sugar and salt with the yogurt and a little warm water into a soft dough; rest, covered, for 2 hours. Finely mince the garlic.",
      "Divide into 8 balls; roll each into an oval, scatter garlic and coriander leaves over, and roll once more to press them in.",
      "Cook on a very hot tawa until bubbles appear, then finish over a direct flame until charred spots appear.",
      "Brush generously with ghee and serve at once.",
    ],
    timeMinutes: 150,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-cheese-naan",
    name: { en: "Cheese Naan", hindi: "चीज़ नान" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 280 }, // refined wheat flour (maida)
      { foodId: "usda-329370", grams: 120 }, // mozzarella
      { foodId: "usda-2259793", grams: 80 }, // yogurt (dahi)
      { foodId: "usda-322892", grams: 50 }, // whole milk
      { foodId: "usda-171314", grams: 15 }, // ghee, for brushing
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the maida, sugar and salt with the yogurt and warm milk into a soft dough; rest, covered, for 2 hours. Grate the mozzarella.",
      "Divide into 8 balls; roll each into a disc, place a mound of mozzarella in the centre, seal well, and roll gently into an oval.",
      "Cook on a very hot tawa until bubbles appear, then finish over a direct flame until charred spots appear and the cheese melts inside.",
      "Brush with ghee and serve at once, while the cheese is still pulling.",
    ],
    timeMinutes: 150,
    budgetTier: 1,
    enriched: true,
    enrichment: "Mozzarella stuffed inside the naan, over the plain naan's yogurt-and-milk dough",
  },
  {
    id: "dish-missi-roti",
    name: { en: "Missi Roti", hindi: "मिस्सी रोटी" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 120 }, // chickpea flour (besan)
      { foodId: "usda-168893", grams: 120 }, // whole wheat flour (atta)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 10 }, // ghee
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Mix the besan and atta with the crushed cumin and coriander seeds, turmeric and salt.",
      "Knead with the finely chopped onion, green chilli, coriander leaves and about 120 ml warm water into a firm dough; rest 15 minutes.",
      "Divide into 8 balls and roll each into a disc about 13 cm across.",
      "Cook on a hot tawa with a little ghee on both sides until golden spots appear.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-makki-di-roti",
    name: { en: "Makki di Roti", hindi: "मक्की दी रोटी" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168867", grams: 280 }, // cornmeal (makki ka atta)
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the cornmeal and salt with warm water, a little at a time, into a soft but firm dough; rest 10 minutes.",
      "Divide into 8 balls; pat each out between wet palms (or roll gently between sheets of plastic) into a disc about 12 cm across — cornmeal cracks, so be patient.",
      "Cook on a hot tawa until the underside firms, flip, and cook until golden spots appear on both sides.",
      "Brush with ghee and serve hot, traditionally with sarson-style greens.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-masala-paratha",
    name: { en: "Masala Paratha", hindi: "मसाला पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 280 }, // whole wheat flour (atta)
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Crush the cumin and coriander seeds coarsely; mix into the atta with the cayenne, turmeric, black pepper and salt.",
      "Knead with about 170 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls; roll each out, brush with ghee, fold, and roll again.",
      "Cook on a hot tawa with the remaining ghee until golden and crisp at the edges.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-palak-paratha",
    name: { en: "Spinach Paratha (Palak Paratha)", hindi: "पालक पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 260 }, // whole wheat flour (atta)
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Blanch the spinach in boiling water for 1 minute; drain, cool, squeeze dry and chop finely (or blend coarse with the ginger and green chilli).",
      "Knead the atta and salt with the spinach mixture and just enough warm water to make a soft green dough; rest 20 minutes.",
      "Divide into 8 balls and roll each into a disc about 15 cm across.",
      "Cook on a hot tawa with ghee on both sides until golden spots appear.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-lachha-paratha",
    name: { en: "Lachha Paratha", hindi: "लच्छा पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 280 }, // whole wheat flour (atta)
      { foodId: "usda-171314", grams: 40 }, // ghee
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the atta and salt with about 170 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls; roll each as thin as you can, brush the whole surface with ghee, and pleat it like a fan; coil the pleated strip into a spiral and rest 10 minutes.",
      "Roll each spiral gently into a disc, keeping the layers intact.",
      "Cook on a hot tawa with the remaining ghee until crisp and golden; crush lightly between your palms to open the layers before serving.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-pyaaz-paratha",
    name: { en: "Onion Paratha (Pyaaz Paratha)", hindi: "प्याज़ पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour (atta)
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Finely chop the onion; mix with the green chilli, crushed cumin and coriander seeds, salt and coriander leaves just before filling (salt draws water).",
      "Knead a soft atta dough and rest 20 minutes.",
      "Roll a dough ball into a disc, place a mound of onion filling in the centre, seal, and roll gently into a paratha.",
      "Cook on a hot tawa with ghee on both sides until golden and crisp.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-cottage-cheese-paratha",
    name: { en: "Cottage Cheese Paratha", hindi: "कॉटेज चीज़ पराठा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour (atta)
      { foodId: "usda-328841", grams: 200 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Crumble the cottage cheese; mix with the finely chopped onion, green chilli, crushed cumin, salt and coriander leaves.",
      "Knead a soft atta dough and rest 20 minutes.",
      "Roll a dough ball into a disc, place a generous mound of filling in the centre, seal, and roll gently into a paratha.",
      "Cook on a hot tawa with ghee on both sides until golden and crisp at the edges.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: true,
    enrichment: "A full cottage cheese filling with coriander, over the plain whole wheat paratha",
  },
  /* ----------------------------- BREAKFAST ----------------------------- */
  {
    id: "dish-rava-upma",
    name: { en: "Rava Upma", hindi: "रवा उपमा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168933", grams: 200 }, // semolina (sooji)
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170419", grams: 50 }, // green peas
      { foodId: "usda-2258586", grams: 50 }, // carrot
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Dry-roast the semolina in a pan, stirring, until it smells nutty and turns very pale gold; tip it out.",
      "Heat the oil; sizzle the mustard seeds and cumin, then add ginger, green chilli and onion and cook until the onion softens.",
      "Add the carrot and peas with about 600 ml water and the salt; bring to a boil.",
      "Rain in the semolina, stirring constantly so no lumps form; cover and cook on low heat for 3 minutes until the water is absorbed.",
      "Rest 5 minutes, fluff with a fork, and finish with coriander leaves and lemon juice.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-veg-upma",
    name: { en: "Vegetable Upma", hindi: "सब्ज़ी उपमा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168933", grams: 200 }, // semolina (sooji)
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-2346400", grams: 80 }, // green beans
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-170427", grams: 60 }, // green bell pepper (capsicum)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the semolina until it smells nutty; tip it out. Chop all the vegetables small.",
      "Heat the coconut oil; sizzle the mustard seeds and cumin, then add ginger, green chilli and onion.",
      "Add the carrot, beans, peas and capsicum with a splash of water; cover and cook 4 minutes until just tender.",
      "Add about 550 ml water and the salt; bring to a boil, then rain in the semolina, stirring constantly.",
      "Cover and cook on low heat for 3 minutes; rest 5 minutes, fluff, and finish with coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-idli",
    name: { en: "Idli", hindi: "इडली" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 200 }, // rice flour
      { foodId: "usda-174259", grams: 100 }, // black gram (urad dal), dry
      { foodId: "usda-171324", grams: 3 }, // fenugreek seeds (methi)
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the urad dal with the fenugreek seeds for 5–6 hours; drain, keeping the soaking water.",
      "Grind the urad to a smooth, fluffy batter with a little of its soaking water; stir in the rice flour and enough water to make a thick pouring batter.",
      "Cover and ferment in a warm place for 8–12 hours, until risen and lightly sour; stir in the salt gently.",
      "Pour the batter into greased idli moulds, filling them three-quarters full.",
      "Steam for 10–12 minutes until a skewer comes out clean; rest 5 minutes before unmoulding.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-dosa",
    name: { en: "Dosa", hindi: "डोसा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 200 }, // rice flour
      { foodId: "usda-174259", grams: 80 }, // black gram (urad dal), dry
      { foodId: "usda-171324", grams: 2 }, // fenugreek seeds (methi)
      { foodId: "usda-171025", grams: 20 }, // sunflower oil, for roasting
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the urad dal with the fenugreek seeds for 5–6 hours; grind to a smooth batter and stir in the rice flour and water to a pouring consistency.",
      "Ferment in a warm place for 8–12 hours until risen; stir in the salt.",
      "Heat a cast-iron tawa until very hot; sprinkle water to cool it slightly, wipe, and pour a ladle of batter in the centre.",
      "Spiral the batter outward into a thin circle, drizzle oil around the edges, and cook until crisp and golden underneath.",
      "Fold and serve at once — dosas wait for no one.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-masala-dosa",
    name: { en: "Masala Dosa", hindi: "मसाला डोसा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 200 }, // rice flour
      { foodId: "usda-174259", grams: 80 }, // black gram (urad dal), dry
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Make the dosa batter as for plain dosa: soak and grind the urad, stir in the rice flour, ferment 8–12 hours, and salt it.",
      "Boil the potatoes until tender; peel and crumble roughly.",
      "Heat a little of the oil; sizzle the mustard seeds and cumin, add ginger, green chilli and onion and cook until soft; add turmeric, potato and salt and toss for 2 minutes. Finish with coriander leaves.",
      "Spread a dosa thin on a hot tawa with the remaining oil until crisp and golden.",
      "Place a mound of potato masala in the centre, fold the dosa over it, and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-onion-uttapam",
    name: { en: "Onion Uttapam", hindi: "प्याज़ उत्तपम" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 200 }, // rice flour
      { foodId: "usda-174259", grams: 80 }, // black gram (urad dal), dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
    ],
    method: [
      "Make the batter as for dosa: soak and grind the urad, stir in the rice flour, ferment 8–12 hours, and salt it — keep it slightly thicker than dosa batter.",
      "Finely chop the onion, tomato, green chilli and coriander leaves and mix them together.",
      "Pour a thick ladle of batter onto a hot oiled tawa and spread it into a thick disc — do not spread it thin.",
      "Scatter the onion mixture over the top, drizzle oil around the edges, and cook on medium heat until the base is golden.",
      "Flip carefully and cook 1 minute more until the onions caramelise lightly; serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-adai-dosa",
    name: { en: "Adai-Style Mixed Dal Dosa", hindi: "अदाई डोसा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 100 }, // rice flour
      { foodId: "usda-174256", grams: 60 }, // mung beans (moong dal), dry
      { foodId: "usda-174259", grams: 40 }, // black gram (urad dal), dry
      { foodId: "usda-174284", grams: 40 }, // red lentils (masoor dal), dry
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the moong, urad and masoor dals together for 4–5 hours; drain.",
      "Grind the dals coarsely with the ginger and green chilli and a little water; stir in the rice flour, cumin and salt to a thick pouring batter. No fermentation needed.",
      "Rest the batter for 20 minutes.",
      "Spread a ladle of batter on a hot oiled tawa into a thick-ish disc; drizzle oil around the edges.",
      "Cook until crisp and golden underneath, flip for 30 seconds, and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-besan-chilla",
    name: { en: "Besan Chilla", hindi: "बेसन चीला" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 120 }, // chickpea flour (besan)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Whisk the besan with about 150 ml water, the turmeric and salt into a smooth, lump-free batter; rest 10 minutes.",
      "Fold in the finely chopped onion, tomato, green chilli, crushed cumin and coriander leaves.",
      "Heat a tawa and brush with oil; pour a ladle of batter and spread into a thin disc.",
      "Cook until the edges crisp and the top sets, drizzle oil around, flip, and cook 1 minute more.",
      "Serve hot, folded in half.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-moong-dal-chilla",
    name: { en: "Moong Dal Chilla", hindi: "मूंग दाल चीला" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 200 }, // mung beans (moong dal), dry
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the moong dal for 4–5 hours; drain.",
      "Grind the dal with the ginger, green chilli and spinach and just enough water to make a smooth pouring batter; stir in the cumin, turmeric and salt.",
      "Heat a tawa and brush with oil; pour a ladle of batter and spread into a thin disc.",
      "Cook until crisp at the edges, drizzle oil around, flip, and cook 1 minute more.",
      "Serve hot, folded in half.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-cottage-cheese-chilla",
    name: { en: "Cottage Cheese Besan Chilla", hindi: "कॉटेज चीज़ बेसन चीला" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 120 }, // chickpea flour (besan)
      { foodId: "usda-328841", grams: 100 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-168462", grams: 50 }, // spinach
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Whisk the besan with about 150 ml water and the salt into a smooth batter; rest 10 minutes.",
      "Fold in the crumbled cottage cheese, chopped spinach, onion, tomato, green chilli and coriander leaves.",
      "Heat a tawa and brush with oil; pour a ladle of batter and spread into a disc — it will be thicker than a plain chilla.",
      "Cook until set and golden underneath, drizzle oil around, flip carefully, and cook 1–2 minutes more.",
      "Serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: true,
    enrichment: "Cottage cheese and spinach folded into the batter, over the plain besan chilla",
  },
  {
    id: "dish-oats-porridge",
    name: { en: "Oats Porridge with Banana", hindi: "ओट्स पोरिज" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346396", grams: 160 }, // rolled oats
      { foodId: "usda-322892", grams: 400 }, // whole milk
      { foodId: "usda-173944", grams: 150 }, // banana
      { foodId: "usda-169640", grams: 20 }, // honey
      { foodId: "usda-2346393", grams: 20 }, // almonds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Put the oats and milk in a pan with about 200 ml water; bring to a gentle simmer.",
      "Cook for 5–6 minutes, stirring often, until thick and creamy.",
      "Slice the banana; chop the almonds.",
      "Serve the porridge topped with banana and almonds, a dusting of cinnamon and the honey drizzled over.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-protein-oats",
    name: { en: "Enriched Protein Oats", hindi: "प्रोटीन ओट्स" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346396", grams: 160 }, // rolled oats
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt (hung curd)
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-173944", grams: 100 }, // banana
      { foodId: "usda-2346393", grams: 20 }, // almonds
      { foodId: "usda-2515380", grams: 20 }, // pumpkin seeds (pepitas)
    ],
    method: [
      "Cook the oats in the milk with about 150 ml water for 5–6 minutes until thick and creamy; take off the heat and let it cool for 2 minutes.",
      "Stir the Greek yogurt through until glossy — off the heat, so it does not split.",
      "Slice the banana; roughly chop the almonds.",
      "Serve topped with banana, almonds and pumpkin seeds.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: true,
    enrichment: "Greek yogurt stirred through, plus almonds and pumpkin seeds on top, over the plain milk porridge",
  },
  {
    id: "dish-masala-oats",
    name: { en: "Masala Oats", hindi: "मसाला ओट्स" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346396", grams: 160 }, // rolled oats
      { foodId: "usda-170419", grams: 60 }, // green peas
      { foodId: "usda-2258586", grams: 60 }, // carrot
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-172337", grams: 10 }, // mustard oil
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Heat the mustard oil until it just smokes; sizzle the cumin, then add ginger, green chilli and onion and cook until soft.",
      "Add the tomato, turmeric and salt; cook until the tomato melts.",
      "Add the carrot, peas and about 650 ml water; simmer 3 minutes.",
      "Stir in the oats and cook 4–5 minutes, stirring, until thick like a soft khichdi.",
      "Finish with coriander leaves and serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-overnight-oats",
    name: { en: "Overnight Oats", hindi: "रात भर भिगोए ओट्स" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346396", grams: 100 }, // rolled oats
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt (hung curd)
      { foodId: "usda-322559", grams: 100 }, // skimmed milk
      { foodId: "usda-173944", grams: 100 }, // banana
      { foodId: "usda-169640", grams: 15 }, // honey
      { foodId: "usda-2346394", grams: 15 }, // walnuts
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Mash half the banana in a jar or bowl; stir in the oats, Greek yogurt, skimmed milk, honey and cinnamon.",
      "Cover and refrigerate overnight (at least 6 hours), until the oats are soft and the mixture is thick.",
      "In the morning, stir well and loosen with a splash of water if needed.",
      "Top with the remaining banana, sliced, and the chopped walnuts.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-barley-porridge",
    name: { en: "Barley Porridge", hindi: "जौ का दलिया" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170284", grams: 160 }, // barley
      { foodId: "usda-322892", grams: 300 }, // whole milk
      { foodId: "usda-334247", grams: 20 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 15 }, // almonds
    ],
    method: [
      "Rinse the barley and soak for 30 minutes (overnight is better); drain.",
      "Simmer the barley in about 700 ml water for 25–30 minutes until tender and chewy-soft (or pressure-cook for 5 whistles).",
      "Stir in the milk, sugar and crushed cardamom; simmer 5 more minutes until creamy.",
      "Serve hot, topped with slivered almonds.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-quinoa-upma",
    name: { en: "Quinoa Upma", hindi: "किनोआ उपमा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168874", grams: 160 }, // quinoa
      { foodId: "usda-170419", grams: 50 }, // green peas
      { foodId: "usda-2258586", grams: 50 }, // carrot
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the quinoa very well under running water to remove its bitterness.",
      "Heat the oil; sizzle the mustard seeds and cumin, then add ginger, green chilli and onion and cook until soft.",
      "Add the carrot and peas, the quinoa, salt and about 380 ml water; cover and simmer on low heat for 15 minutes.",
      "Rest 5 minutes, fluff with a fork, and finish with coriander leaves and lemon juice.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-boiled-egg-plate",
    name: { en: "Boiled Egg Breakfast Plate", hindi: "उबले अंडे का नाश्ता" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs (4 large)
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Lower the eggs into boiling water and cook for 8–9 minutes for just-set yolks.",
      "Cool under running water, peel, and halve the eggs.",
      "Slice the tomato and cucumber and arrange alongside.",
      "Season the eggs with salt and plenty of freshly crushed black pepper; serve at once.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-masala-omelette",
    name: { en: "Masala Omelette", hindi: "मसाला ऑमलेट" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs (4 large)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Beat the eggs with the salt and turmeric until frothy.",
      "Fold in the finely chopped onion, tomato, green chilli and coriander leaves.",
      "Melt the butter in a pan on medium heat; pour in the egg mixture and swirl to cover the base.",
      "Cook until mostly set, fold in half, and slide onto a plate. Serve at once.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-egg-bhurji",
    name: { en: "Egg Bhurji", hindi: "अंडा भुर्जी" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs (4 large)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Heat the oil; sizzle the cumin, then add ginger, green chilli and onion and cook until golden.",
      "Add the tomato, turmeric and salt; cook until the tomato melts and the oil glistens.",
      "Beat the eggs lightly and pour them in; let them set for 20 seconds, then stir in large, soft curds.",
      "Cook just until the eggs are softly set — bhurji dries out fast — and finish with coriander leaves.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sprouted-moong-bowl",
    name: { en: "Sprouted Moong Bowl", hindi: "अंकुरित मूंग कटोरा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 120 }, // mung beans (moong dal), dry, for sprouting
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-2346406", grams: 80 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 1 }, // cumin seeds
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the moong for 8 hours; drain, tie in a damp cloth, and leave in a warm place for 12–24 hours until sprouts appear.",
      "Steam the sprouts for 3–4 minutes until just tender but still crunchy (or serve raw if the sprouts are fresh and well rinsed).",
      "Toss with the finely chopped onion, tomato, cucumber and green chilli.",
      "Season with lemon juice, crushed roasted cumin, salt and coriander leaves; serve fresh.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-fruit-curd-bowl",
    name: { en: "Fruit and Curd Bowl", hindi: "फल दही कटोरा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (dahi)
      { foodId: "usda-173944", grams: 120 }, // banana
      { foodId: "usda-171688", grams: 100 }, // apple
      { foodId: "usda-174683", grams: 80 }, // grapes
      { foodId: "usda-169640", grams: 15 }, // honey
      { foodId: "usda-2346393", grams: 15 }, // almonds
    ],
    method: [
      "Whisk the yogurt smooth and chill it well.",
      "Chop the banana and apple; halve the grapes; roughly chop the almonds.",
      "Fold the fruit through the yogurt just before serving, so the apple does not brown.",
      "Drizzle the honey over and scatter the almonds on top.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-enriched-fruit-curd-bowl",
    name: { en: "Enriched Fruit and Curd Bowl", hindi: "खास फल दही कटोरा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-330137", grams: 250 }, // Greek yogurt (hung curd)
      { foodId: "usda-173944", grams: 100 }, // banana
      { foodId: "usda-327699", grams: 100 }, // strawberries
      { foodId: "usda-174683", grams: 80 }, // grapes
      { foodId: "usda-2346394", grams: 20 }, // walnuts
      { foodId: "usda-2515380", grams: 15 }, // pumpkin seeds (pepitas)
      { foodId: "usda-169640", grams: 10 }, // honey
    ],
    method: [
      "Whisk the Greek yogurt smooth and chill it well.",
      "Slice the banana and strawberries; halve the grapes; roughly chop the walnuts.",
      "Fold the fruit through the yogurt just before serving.",
      "Top with walnuts and pumpkin seeds and drizzle the honey over.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: true,
    enrichment: "Greek yogurt instead of plain curd, plus walnuts and pumpkin seeds, over the plain fruit and curd bowl",
  },
  {
    id: "dish-masala-sweet-potato",
    name: { en: "Masala Sweet Potato", hindi: "मसाला शकरकंद" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346404", grams: 400 }, // sweet potato
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil or roast the sweet potatoes until tender right through; cool slightly and peel.",
      "Cut into chunky cubes.",
      "Dry-roast the cumin and crush it coarsely; toss the sweet potato with the cumin, cayenne, black pepper and salt.",
      "Finish with lemon juice and coriander leaves; serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  /* ------------------------------ SNACKS ------------------------------ */
  {
    id: "dish-roasted-chana",
    name: { en: "Roasted Chana", hindi: "भुना चना" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 120 }, // chickpeas (kabuli chana), dry
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight; boil until tender, then drain and dry them thoroughly on a cloth — dry chickpeas roast crisp, wet ones steam.",
      "Spread on a heavy pan or tray and roast on medium heat, stirring often, for 20–25 minutes until deep golden and crunchy.",
      "While hot, toss with the crushed roasted cumin, cayenne and salt.",
      "Cool completely before storing in an airtight jar; they crisp further as they cool.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-sprouts-chaat",
    name: { en: "Sprouts Chaat", hindi: "अंकुरित मूंग चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 100 }, // mung beans (moong dal), dry, for sprouting
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-2346406", grams: 60 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the moong for 8 hours; drain, tie in a damp cloth, and leave in a warm place for 12–24 hours until sprouts appear.",
      "Steam the sprouts for 3–4 minutes until just tender but still crunchy.",
      "Toss with the finely chopped onion, tomato, cucumber and green chilli.",
      "Season with lemon juice, crushed roasted cumin, salt and coriander leaves; serve at once, before the vegetables weep.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-besan-pakora",
    name: { en: "Besan Pakora", hindi: "बेसन पकोड़ा" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 150 }, // chickpea flour (besan)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-171025", grams: 50 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Slice the onion thinly; mix with the green chilli, crushed cumin and coriander seeds, turmeric, salt and coriander leaves.",
      "Fold in the besan with just enough water to make a thick batter that coats the onion — too much water makes soggy pakoras.",
      "Heat the oil in a kadhai; drop rough spoonfuls of batter in and fry on medium heat, turning, until deep golden and crisp.",
      "Drain on paper and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-onion-pakora",
    name: { en: "Onion Pakora (Kanda Bhaji)", hindi: "प्याज़ पकोड़ा" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-790646", grams: 400 }, // onion
      { foodId: "usda-174288", grams: 120 }, // chickpea flour (besan)
      { foodId: "usda-169714", grams: 30 }, // rice flour, for crispness
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-171025", grams: 50 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Slice the onions very thinly and separate the layers; sprinkle with the salt and rest 10 minutes so they release their water.",
      "Mix in the green chilli, crushed cumin and coriander seeds and turmeric, then fold in the besan and rice flour, using the onion's own water — add at most a spoonful more.",
      "Heat the oil in a kadhai; drop rough clusters of the mixture in and fry on medium heat until deep golden and crisp at the edges.",
      "Drain on paper and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-cottage-cheese-pakora",
    name: { en: "Cottage Cheese Pakora", hindi: "कॉटेज चीज़ पकोड़ा" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 120 }, // chickpea flour (besan)
      { foodId: "usda-328841", grams: 200 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 40 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the cottage cheese into chunky cubes; finely slice the onion.",
      "Whisk the besan with the turmeric, crushed cumin, salt and about 120 ml water into a thick batter; fold in the onion and green chilli.",
      "Heat the oil in a kadhai; dip the cottage cheese cubes in the batter and lower them in.",
      "Fry on medium heat, turning, until deep golden; drain on paper and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: true,
    enrichment: "Cottage cheese chunks fried in the batter, over the plain onion pakora",
  },
  {
    id: "dish-aloo-tikki",
    name: { en: "Aloo Tikki", hindi: "आलू टिक्की" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171025", grams: 30 }, // sunflower oil, for shallow frying
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the potatoes until tender; peel and mash while warm, then cool completely — warm mash makes sticky tikkis.",
      "Mix in the peas (lightly crushed), onion, green chilli, ginger, crushed cumin and coriander seeds, cayenne, salt and coriander leaves.",
      "Shape into 8 flat patties with oiled palms.",
      "Shallow-fry in the oil on medium heat until deeply golden and crisp on both sides; drain on paper and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-veg-cutlet",
    name: { en: "Vegetable Cutlet", hindi: "सब्ज़ी कटलेट" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-174288", grams: 50 }, // chickpea flour (besan), as binder
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 30 }, // sunflower oil, for shallow frying
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the potato until tender; steam or boil the carrot, beans and peas until just tender and chop small. Drain everything very well.",
      "Mash the potato; mix in the vegetables, onion, green chilli, ginger, spices, salt, coriander leaves and the besan to bind.",
      "Shape into 8 oval cutlets; rest in the fridge for 20 minutes if you have time — they fry cleaner.",
      "Shallow-fry in the oil until deeply golden and crisp on both sides; drain on paper and serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-besan-dhokla",
    name: { en: "Steamed Besan Dhokla-Style", hindi: "बेसन ढोकला" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 200 }, // chickpea flour (besan)
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-171016", grams: 15 }, // sesame oil, for tempering
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170150", grams: 5 }, // sesame seeds
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Whisk the besan with the yogurt, turmeric, sugar, salt and about 150 ml water into a smooth, thick batter; fold in the grated ginger and chopped green chilli.",
      "Rest the batter for 30 minutes, whisking once or twice — rested, well-beaten batter steams up lightest (this version uses no soda or fruit salt).",
      "Pour into a greased, shallow steel plate set in a steamer; steam for 15–18 minutes until a skewer comes out clean.",
      "Heat the sesame oil; sizzle the mustard seeds and sesame seeds and pour over the dhokla with a splash of the steaming water.",
      "Rest 5 minutes, cut into diamonds, and finish with coriander leaves.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-corn-chaat",
    name: { en: "Corn Chaat", hindi: "मकई चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710826", grams: 300 }, // sweet corn kernels
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil or steam the corn kernels for 4–5 minutes until tender; drain well.",
      "Toss the hot corn with the butter until it melts and coats the kernels.",
      "Fold in the finely chopped onion and tomato.",
      "Season with lemon juice, crushed roasted cumin, cayenne, black pepper, salt and coriander leaves; serve warm.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-peanut-chaat",
    name: { en: "Peanut Chaat", hindi: "मूंगफली चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-172430", grams: 120 }, // peanuts
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-2346406", grams: 60 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the peanuts in their shells or shelled in salted water for 15–20 minutes until tender but not soft (or roast them dry for a crunchier chaat).",
      "Toss the warm peanuts with the finely chopped onion, tomato, cucumber and green chilli.",
      "Season with lemon juice, crushed roasted cumin, salt and coriander leaves.",
      "Serve at once, in paper cones if you want the full street feel.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-fruit-chaat",
    name: { en: "Fruit Chaat", hindi: "फलों की चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171688", grams: 150 }, // apple
      { foodId: "usda-173944", grams: 120 }, // banana
      { foodId: "usda-174683", grams: 100 }, // grapes
      { foodId: "usda-746771", grams: 120 }, // orange
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Chop the apple and banana into bite-size pieces; halve the grapes; segment the orange and cut each segment in two.",
      "Toss everything together gently.",
      "Season with lemon juice, a pinch of salt and freshly crushed black pepper — the chaat seasoning is what makes it more than a fruit salad.",
      "Serve at once, before the banana browns.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-egg-chaat",
    name: { en: "Egg Chaat", hindi: "अंडा चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs (4 large)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes; cool, peel and cut into wedges.",
      "Toss the warm eggs gently with the finely chopped onion, tomato and green chilli.",
      "Season with lemon juice, crushed roasted cumin, cayenne, salt and coriander leaves.",
      "Serve warm or at room temperature.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-chana-chaat",
    name: { en: "Chana Chaat", hindi: "चना चाट" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 200 }, // chickpeas (kabuli chana), dry
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-2346406", grams: 80 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the chickpeas overnight; boil until tender and drain. Boil the potato and cut into cubes.",
      "Toss the chickpeas and potato with the finely chopped onion, tomato, cucumber and green chilli.",
      "Season with lemon juice, crushed roasted cumin, salt and coriander leaves.",
      "Rest 10 minutes so the flavours settle, then serve.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-lobia-chaat",
    name: { en: "Lobia Chaat", hindi: "लोबिया चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-173758", grams: 120 }, // cowpeas (lobia), dry
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-2346406", grams: 60 }, // cucumber
      { foodId: "usda-167746", grams: 25 }, // lemon
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the lobia for 6–8 hours; boil until tender but holding its shape, then drain.",
      "Toss the warm lobia with the finely chopped onion, tomato, cucumber and green chilli.",
      "Season with lemon juice, crushed roasted cumin, salt and coriander leaves.",
      "Rest 10 minutes and serve warm or at room temperature.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-moong-sundal",
    name: { en: "Moong Sundal", hindi: "मूंग सुंडल" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 100 }, // mung beans (moong dal), dry
      { foodId: "usda-170169", grams: 25 }, // fresh coconut
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 1 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-330458", grams: 8 }, // coconut oil
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
    ],
    method: [
      "Soak the moong for 6–8 hours; boil until just tender — it should hold its shape — and drain well.",
      "Heat the coconut oil; sizzle the mustard seeds and cumin, then add ginger and green chilli for a few seconds.",
      "Add the moong, turmeric and salt; toss on medium heat for 2–3 minutes.",
      "Fold in the grated coconut, take off the heat, and finish with lemon juice and coriander leaves.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-chana-sundal",
    name: { en: "Chana Sundal", hindi: "चना सुंडल" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 120 }, // chickpeas (kabuli chana), dry
      { foodId: "usda-170169", grams: 25 }, // fresh coconut
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 1 }, // cumin seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-330458", grams: 8 }, // coconut oil
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
    ],
    method: [
      "Soak the chickpeas overnight; boil until tender and drain well.",
      "Heat the coconut oil; sizzle the mustard seeds and cumin, add the red chilli and ginger for a few seconds.",
      "Add the chickpeas, turmeric and salt; toss on medium heat for 3–4 minutes.",
      "Fold in the grated coconut, take off the heat, and finish with lemon juice and coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-aloo-chaat",
    name: { en: "Aloo Chaat", hindi: "आलू चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-2259793", grams: 100 }, // yogurt (dahi)
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for crisping
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the tamarind in 60 ml warm water for 15 minutes; squeeze out the pulp and strain to a thick chutney.",
      "Boil the potatoes until just tender; peel, cube, and shallow-fry in the oil until crisp and golden at the edges.",
      "Toss the hot potatoes with the finely chopped onion and green chilli, salt, crushed roasted cumin and cayenne.",
      "Serve topped with whisked yogurt, tamarind chutney and coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-shakarkandi-chaat",
    name: { en: "Shakarkandi Chaat (Sweet Potato)", hindi: "शकरकंद चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346404", grams: 350 }, // sweet potato
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil or roast the sweet potatoes until tender; cool slightly, peel, and cut into chunky cubes.",
      "Dry-roast the cumin and crush it coarsely.",
      "Toss the warm sweet potato with the cumin, cayenne, black pepper and salt.",
      "Finish with lemon juice and coriander leaves; serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-masala-seed-mix",
    name: { en: "Masala Seed and Nut Mix", hindi: "मसाला बीज मिश्रण" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2515380", grams: 40 }, // pumpkin seeds (pepitas)
      { foodId: "usda-2515381", grams: 40 }, // sunflower seeds
      { foodId: "usda-172430", grams: 60 }, // peanuts
      { foodId: "usda-170150", grams: 20 }, // sesame seeds
      { foodId: "usda-171025", grams: 5 }, // sunflower oil
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Dry-roast the peanuts in a heavy pan until the skins crackle; rub off the skins if you like.",
      "Add the pumpkin and sunflower seeds and roast, stirring, until they puff and colour lightly.",
      "Add the sesame seeds, oil, crushed cumin, cayenne, turmeric and salt; toss on the heat for 1 minute so the spices coat everything.",
      "Cool completely and store in an airtight jar — it keeps for two weeks.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
];
