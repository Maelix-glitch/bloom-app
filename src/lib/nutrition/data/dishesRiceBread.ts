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
      "Rinse the 300 g rice until the water runs clearer and soak for 20 minutes; drain.",
      "Dice the 100 g carrot and cut the beans into short pieces so everything cooks in the same time.",
      "Heat the 15 g ghee in a heavy pot; add the bay leaf, cardamom, cloves and cumin and let them sizzle for a few seconds until fragrant.",
      "Add the 100 g onion and cook until golden, 5–6 minutes.",
      "Add the carrot, beans and 100 g peas and stir for 2 minutes.",
      "Add the rice and salt with about 550 ml hot water; bring to a boil, then cover and cook on the lowest heat for 10 minutes without lifting the lid.",
      "Rest, covered, for 10 minutes, then fluff with a fork — the grains should stand separate.",
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
      "Rinse the 300 g rice and soak for 20 minutes; drain.",
      "Heat the 12 g ghee in a heavy pot; add the bay leaf and cumin and let the cumin darken a shade.",
      "Add the 80 g onion and cook until soft and golden at the edges, 4–5 minutes.",
      "Add the 150 g peas, rice and salt with about 550 ml hot water; bring to a boil.",
      "Cover and cook on the lowest heat for 10 minutes without lifting the lid.",
      "Rest 10 minutes, covered, and fluff with a fork before serving.",
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
      "Rinse the 300 g rice and soak for 20 minutes; drain. Slice the 250 g mushrooms thickly.",
      "Heat the 15 g oil in a heavy pot; sear the mushrooms on high heat until they colour and their water dries off, 4–5 minutes; set aside.",
      "In the same pot, add the cumin, garlic, ginger and 100 g onion and cook until the onion is golden.",
      "Add the rice, 80 g peas and salt with about 550 ml hot water; bring to a boil.",
      "Cover and cook on the lowest heat for 10 minutes without lifting the lid.",
      "Fold the mushrooms back in over the rice.",
      "Rest 10 minutes covered, then finish with the black pepper and coriander leaves.",
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
      "Rinse the 200 g rice and 150 g moong dal together until the water runs clear; soak 20 minutes and drain.",
      "Put them in a pressure cooker with about 900 ml water, the turmeric, ginger and salt; cook for 3 whistles (or simmer about 25 minutes) until very soft.",
      "Whisk lightly so the khichdi turns creamy and porridge-like; add hot water a little at a time if it is too thick — it should slump off the spoon.",
      "Heat the 12 g ghee in a small pan and sizzle the cumin until it darkens a shade.",
      "Pour the tempering over the khichdi and stir it in.",
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
      "Rinse the 200 g rice and 120 g moong dal together; soak 20 minutes and drain. Dice the 150 g potato and 80 g carrot.",
      "Pound or grind the coriander seeds coarsely.",
      "Heat the 15 g mustard oil until it just smokes and turns paler; take it off the heat briefly, then add the cumin, ginger and garlic and fry until fragrant.",
      "Add the 80 g onion and cook until golden, 5–6 minutes.",
      "Add the 100 g tomato, turmeric, ground coriander, cayenne and salt and cook until the oil glistens at the edges.",
      "Add the potato, carrot, 80 g peas, rice and dal with about 900 ml water; pressure-cook for 3 whistles (or simmer about 25 minutes) until everything is soft.",
      "Whisk lightly to a creamy porridge.",
      "Rest 5 minutes and finish with the coriander leaves.",
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
      "Rinse the 300 g rice and soak for 30 minutes; drain. Dice the 150 g potato and 100 g carrot and cut the beans into short pieces.",
      "Whisk the 150 g yogurt with the turmeric, curry powder and half the salt; stir in the potato, carrot, beans and 80 g peas and leave to marinate for 15 minutes.",
      "Boil the rice in plenty of salted water with the bay leaf, cardamom, cinnamon and cloves until just underdone — about 70% cooked, with a firm core; drain.",
      "Heat the 20 g ghee in a heavy pot; fry the 150 g onion until deep golden, 8–10 minutes.",
      "Add the ginger, garlic and green chilli, then the marinated vegetables with all their yogurt; cook 8–10 minutes until the potato is nearly tender.",
      "Layer the rice evenly over the vegetables; scatter the mint, coriander leaves and lemon juice on top.",
      "Cover tightly — seal the lid edge if it is loose — and cook on the lowest heat (dum) for 15 minutes.",
      "Rest 10 minutes before opening; fluff the layers together gently from the side so the grains stay whole.",
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
      "Boil the 6 eggs for 9 minutes until hard; cool, peel and halve lengthways.",
      "Rinse the 300 g rice and soak for 30 minutes; drain.",
      "Boil the rice in salted water with the bay leaf and cardamom until just underdone — a grain should still have a firm core; drain.",
      "Heat the 20 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Fry the 150 g onion until deep golden, 8–10 minutes, then add the ginger, garlic and green chilli and fry until fragrant.",
      "Add the 100 g tomato, turmeric, curry powder and salt and cook until the oil glistens; stir in the 100 g yogurt and cook 3 minutes into a thick masala.",
      "Nestle the egg halves into the masala and layer the rice evenly over; scatter the mint and coriander leaves on top.",
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
      "Marinate the 400 g chicken for at least 30 minutes in the 150 g yogurt with the turmeric, curry powder, half the ginger and garlic, and half the salt.",
      "Rinse the 300 g rice and soak for 30 minutes; drain.",
      "Boil the rice in salted water with the bay leaf, cardamom, cinnamon and cloves until just underdone — a grain should still have a firm core; drain.",
      "Heat the 20 g ghee in a heavy pot; fry the 200 g onion until deep golden, 10–12 minutes.",
      "Add the remaining ginger and garlic and the green chilli, then the 100 g tomato; cook until the oil glistens.",
      "Add the chicken with all its marinade; cook on high heat 8–10 minutes until the masala thickens and the chicken is nearly done.",
      "Layer the rice evenly over the chicken; scatter the mint, coriander leaves and lemon juice on top.",
      "Cover tightly and cook on the lowest heat (dum) for 15 minutes; rest 10 minutes before opening, then fluff gently from the side.",
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
      "Rinse the 300 g rice and soak for 20 minutes; drain.",
      "Cut the 300 g chicken into bite-size pieces and stir it into the 100 g yogurt with half the salt; rest 15 minutes.",
      "Heat the 15 g oil in a heavy pot; add the bay leaf, cardamom and cumin and let them sizzle for a few seconds.",
      "Add the 150 g onion and cook until golden, 6–8 minutes.",
      "Add the ginger, garlic and green chilli, then the chicken with its marinade; cook on high heat for 6–8 minutes until the chicken is opaque and the yogurt thickens around it.",
      "Add the rice and about 550 ml hot water with the remaining salt; cover and cook on the lowest heat for 12 minutes.",
      "Rest 10 minutes covered, fluff with a fork, and finish with the coriander leaves.",
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
      "Cook the 300 g rice in salted water until just done; drain, spread on a tray and let it cool completely so the grains stay separate.",
      "Heat the 20 g oil in a wide pan; fry the 25 g peanuts until golden and crisp, then lift them out.",
      "In the same oil, sizzle the mustard seeds until they finish popping, then add the cumin, green chilli and ginger for a few seconds.",
      "Take the pan off the heat and stir in the turmeric — off the heat so it colours without burning.",
      "Pour the tempering over the rice with the lemon juice and salt.",
      "Fold gently with a fork until every grain is yellow, taking care not to break the grains.",
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
      "Cook the 300 g rice until just done; drain, spread on a tray and cool so the grains stay separate.",
      "Soak the 40 g tamarind in 150 ml warm water for 15 minutes; squeeze out the pulp and strain.",
      "Heat the 20 g sesame oil in a wide pan; fry the 25 g peanuts until crisp and lift them out.",
      "In the same oil, sizzle the mustard seeds, cumin and red chillies until the seeds finish popping.",
      "Add the tamarind pulp, turmeric, cayenne and salt; simmer 6–8 minutes until thick, dark and glossy.",
      "Fold the tamarind paste through the rice with the 10 g sesame seeds until every grain is coated.",
      "Rest 10 minutes so the flavour settles, then scatter the peanuts and coriander leaves over.",
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
      "Cook the 250 g rice softer than usual — a few minutes past done; while hot, mash lightly with the back of a spoon.",
      "Stir in the 100 ml milk and let the rice cool to warm, not hot, so the yogurt will not split.",
      "Fold in the 400 g yogurt and the salt until creamy.",
      "Dice the 100 g cucumber finely and fold it in.",
      "Heat the 10 g oil in a small pan; sizzle the mustard seeds and cumin until the seeds finish popping.",
      "Add the ginger and green chilli for a few seconds and pour the tempering over the rice; stir it through.",
      "Finish with the coriander leaves; serve at room temperature or lightly chilled.",
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
      "Rinse the 300 g rice and soak for 20 minutes; drain. Chop the 300 g tomatoes roughly.",
      "Heat the 15 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Sizzle the mustard seeds and cumin until the seeds finish popping, then add the ginger, garlic and green chilli and fry until fragrant.",
      "Add the 100 g onion and cook until golden, 5–6 minutes.",
      "Add the tomatoes, turmeric and salt and cook until the tomatoes melt completely and the oil glistens.",
      "Add the rice and about 520 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Rest 10 minutes covered, fluff with a fork, and finish with the coriander leaves.",
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
      "Cook the 300 g rice until just done; drain, spread on a tray and cool slightly so the grains stay separate.",
      "Grate the 80 g coconut.",
      "Heat the 15 g coconut oil in a wide pan; fry the 20 g peanuts until crisp and lift them out.",
      "Sizzle the mustard seeds and cumin in the same oil until the seeds finish popping; add the green chilli and ginger for a few seconds.",
      "Add the grated coconut and stir on low heat for 2 minutes until it smells toasted but has not browned.",
      "Fold everything through the rice with the salt, gently so the grains stay whole.",
      "Scatter the peanuts and coriander leaves over and serve warm.",
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
      "Rinse the 300 g rice and soak for 20 minutes; drain.",
      "Heat the 12 g ghee in a heavy pot; add the bay leaf, cinnamon and cumin and let the cumin sizzle and darken a shade.",
      "Add the 80 g onion and cook until golden at the edges, 4–5 minutes.",
      "Add the 120 g peas, rice and salt with about 550 ml hot water; bring to a boil.",
      "Cover and cook on the lowest heat for 10 minutes without lifting the lid.",
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
      "Dry-roast the 100 g moong dal in a pan, stirring, until it smells nutty and turns a shade darker; rinse it together with the 200 g rice.",
      "Pressure-cook the rice and dal with about 900 ml water, the ginger and salt for 4 whistles (or simmer about 30 minutes) until completely soft.",
      "Mash lightly to a creamy porridge; add hot water if too thick — it should slump softly off the spoon.",
      "Crush the black pepper coarsely.",
      "Heat the 20 g ghee in a small pan; fry the 15 g cashews until golden and lift them out.",
      "In the same ghee, sizzle the cumin and crushed pepper for a few seconds until fragrant.",
      "Pour the tempering and cashews over the pongal, stir, and serve hot.",
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
      "Soak the 100 g soybeans overnight; boil in fresh water until tender (about 30 minutes) and drain.",
      "Rinse the 250 g rice and soak for 20 minutes; drain. Dice the 80 g carrot.",
      "Heat the 15 g oil in a heavy pot; add the bay leaf and cumin and let them sizzle for a few seconds.",
      "Add the 100 g onion and cook until golden, 5–6 minutes.",
      "Add the ginger, turmeric, carrot and 80 g peas; stir for 2 minutes.",
      "Add the cooked soybeans, rice and salt with about 500 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Rest 10 minutes covered and fluff with a fork before serving.",
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
      "Rinse the 200 g millet and 100 g moong dal together; soak for 30 minutes and drain. Dice the 80 g carrot.",
      "Pressure-cook the millet and dal with about 900 ml water, the turmeric, ginger and salt for 4 whistles (or simmer about 35 minutes) until soft.",
      "Stir in the carrot and 60 g peas and simmer 5 more minutes until the vegetables are tender.",
      "Check the consistency — it should be a soft porridge; loosen with hot water if it sits too thick.",
      "Heat the 12 g ghee in a small pan, sizzle the cumin until it darkens a shade, and pour over the khichdi.",
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
      "Cook the 300 g rice until just done; drain, spread on a tray and cool completely — cold rice fries best.",
      "Heat half the oil in a wide pan or wok until hot; pour in the beaten eggs and scramble into large soft curds, about a minute; set aside.",
      "Add the remaining oil; stir-fry the garlic, 80 g onion, carrot, beans and cabbage on high heat for 3–4 minutes, keeping the vegetables crisp.",
      "Add the rice with the salt and black pepper.",
      "Toss on high heat for 2–3 minutes until the grains are glossy, separate and steaming hot.",
      "Fold the egg back in.",
      "Splash the vinegar around the edge of the hot pan, toss once more, and serve at once.",
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
      "Rinse the 300 g rice and soak for 20 minutes; drain. Crumble the 200 g cottage cheese into coarse pieces.",
      "Dice the 80 g carrot small so it cooks in the rice's time.",
      "Heat the 15 g ghee in a heavy pot; add the bay leaf, cardamom and cumin and let them sizzle for a few seconds.",
      "Add the 100 g onion and cook until golden, 5–6 minutes; add the carrot and 80 g peas and stir for 2 minutes.",
      "Add the rice and salt with about 550 ml hot water; cover and cook on the lowest heat for 10 minutes.",
      "Fold the cottage cheese gently through the hot rice.",
      "Rest 5 minutes covered and finish with the coriander leaves.",
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
      "Rinse the 300 g rice and soak for 30 minutes; drain. Dice the 100 g potato.",
      "Whisk the 150 g yogurt with the turmeric, curry powder and half the salt; marinate the potato and 80 g peas in it for 15 minutes.",
      "Boil the rice in salted water with the bay leaf and cardamom until just underdone — a grain should still have a firm core; drain.",
      "Heat the 25 g ghee in a heavy pot; fry the 30 g cashews until golden and lift them out.",
      "Fry the 150 g onion in the same ghee until deep golden, 8–10 minutes; add the ginger, garlic and green chilli and fry until fragrant.",
      "Add the marinated vegetables with all their yogurt and cook 8–10 minutes until the potato is nearly tender; crumble in the cottage cheese for the last 2 minutes.",
      "Layer the rice evenly over the vegetables; scatter the mint, coriander leaves and fried cashews on top.",
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
      "Knead the 240 g atta and salt with about 150 ml warm water, added a little at a time, into a soft, smooth dough — it should feel as soft as an earlobe.",
      "Rest the dough, covered with a damp cloth, for 20 minutes.",
      "Divide into 8 balls and roll each into a thin disc about 15 cm across, dusting lightly with atta.",
      "Cook each disc on a hot dry tawa until small spots appear, about 30 seconds; flip and cook the second side until the spots deepen.",
      "Hold the roti directly over a flame with tongs (or press it gently with a folded cloth on the tawa) until it puffs up like a balloon.",
      "Brush lightly with ghee and keep wrapped in a cloth until serving so they stay soft.",
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
      "Knead the 280 g atta and salt with about 170 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls.",
      "Roll each ball into a disc, brush with ghee, fold into a triangle, and roll again to a triangle about 15 cm across.",
      "Cook on a hot tawa until spots appear; flip, brush the top with ghee, and press the edges with a spatula so it puffs in places.",
      "Flip once more with ghee and cook until both sides carry deep golden spots and the edges are crisp.",
      "Serve hot, stacked and covered so they stay soft.",
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
      "Boil the 300 g potatoes until completely tender; peel and mash while warm, with no lumps.",
      "Knead a soft atta dough with half the salt and about 150 ml warm water; rest it, covered, for 20 minutes.",
      "Crush the cumin and coriander seeds coarsely.",
      "Mix the potato with the finely chopped 60 g onion, green chilli, crushed seeds, turmeric, remaining salt and coriander leaves; cool the filling completely — warm filling tears the dough.",
      "Divide the dough into 8 balls; roll one into a small disc, place a ball of filling in the centre, gather the edges up and seal.",
      "Roll gently into a paratha about 15 cm across, dusting with atta and pressing from the centre out so the filling spreads without bursting.",
      "Cook on a hot tawa with ghee on both sides until golden and crisp at the edges; serve hot — with plain yogurt alongside if you like (not counted in the lines).",
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
      "Grate the 300 g cauliflower, sprinkle with a little of the salt, rest 10 minutes, then squeeze out as much water as you can — dry filling is what keeps the paratha from tearing.",
      "Mix the cauliflower with the grated ginger, green chilli, crushed cumin, turmeric, remaining salt and coriander leaves.",
      "Knead a soft atta dough with about 150 ml warm water and rest, covered, for 20 minutes.",
      "Divide into 8 balls; roll one into a disc, place the filling in the centre, seal, and roll gently into a paratha.",
      "Cook on a hot tawa, flipping once, until golden spots appear on both sides.",
      "Brush with ghee and cook a few seconds more until crisp at the edges; serve hot.",
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
      "Knead the 240 g atta, 20 g semolina and salt with about 130 ml water into a STIFF dough — stiffer than roti dough, or the pooris will drink oil.",
      "Rest the dough, covered, for 15 minutes.",
      "Divide into 12 small balls and roll each into a disc about 10 cm across, without flour if you can — a drop of oil on the board helps.",
      "Heat the 40 g oil in a kadhai until very hot — a small piece of dough should sizzle and rise at once.",
      "Slide in one poori at a time and press gently with a slotted spoon until it puffs up like a balloon.",
      "Flip, cook a few seconds more until pale gold, drain on paper, and serve at once.",
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
      "Knead the 240 g maida, 20 g semolina, sugar and salt with the 100 g yogurt and a little warm water into a soft dough.",
      "Rest, covered, for at least 2 hours, until the dough looks puffy and feels light.",
      "Divide into 8 balls and roll each into an oval about 15 cm long.",
      "Heat the 40 g oil in a kadhai until very hot — a small piece of dough should sizzle and rise at once.",
      "Slide in one bhatura at a time and press gently with a slotted spoon until it balloons.",
      "Flip once, cook until pale gold with light spots, drain, and serve hot.",
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
      "Knead the 280 g maida, sugar and salt with the 80 g yogurt and 50 ml warm milk into a soft, slightly sticky dough.",
      "Rest, covered, for 2 hours, until risen and puffy.",
      "Divide into 8 balls; roll each into a teardrop or oval about 18 cm long.",
      "Wet one side of the naan and lay it wet-side down on a very hot tawa; cook until bubbles appear on the surface, about a minute.",
      "Invert the tawa over a direct flame (or turn the naan onto the flame) until charred spots appear.",
      "Brush with ghee and serve at once, wrapped in a cloth to stay soft.",
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
      "Knead the 280 g maida, sugar and salt with the 80 g yogurt and a little warm water into a soft dough; rest, covered, for 2 hours until risen.",
      "Finely mince the 25 g garlic and chop the coriander leaves.",
      "Divide the dough into 8 balls; roll each into an oval about 18 cm long.",
      "Scatter the garlic and coriander leaves over each naan and roll once more to press them in.",
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
      "Knead the 280 g maida, sugar and salt with the 80 g yogurt and 50 ml warm milk into a soft dough; rest, covered, for 2 hours until risen.",
      "Grate the 120 g mozzarella.",
      "Divide the dough into 8 balls; roll each into a disc, place a mound of mozzarella in the centre, and seal the edges well so no cheese escapes.",
      "Roll gently into an oval, taking care not to tear the dough.",
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
      "Mix the 120 g besan and 120 g atta with the crushed cumin and coriander seeds, turmeric and salt.",
      "Add the finely chopped 60 g onion, green chilli and coriander leaves.",
      "Knead with about 120 ml warm water, a little at a time, into a firm dough; rest 15 minutes.",
      "Divide into 8 balls and roll each into a disc about 13 cm across, dusting with atta — besan dough is sticky.",
      "Cook on a hot tawa until spots appear; flip and cook the other side.",
      "Brush both sides lightly with ghee and cook a few seconds more until golden; serve hot.",
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
      "Knead the 280 g cornmeal and salt with warm water, a little at a time, into a soft but firm dough — it should hold together when squeezed.",
      "Rest the dough, covered, for 10 minutes.",
      "Divide into 8 balls.",
      "Pat each ball out between wet palms (or roll gently between sheets of plastic) into a disc about 12 cm across — cornmeal cracks at the edges, so be patient and press the cracks back together.",
      "Cook on a hot tawa until the underside firms and spots appear; flip carefully and cook until golden spots appear on both sides.",
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
      "Crush the cumin and coriander seeds coarsely.",
      "Mix the crushed seeds into the 280 g atta with the cayenne, turmeric, black pepper and salt.",
      "Knead with about 170 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls; roll each out, brush with ghee, fold, and roll again.",
      "Cook on a hot tawa, pressing the edges with a spatula, until golden spots appear.",
      "Brush with the remaining ghee and cook until crisp at the edges; serve hot.",
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
      "Blanch the 150 g spinach in boiling water for 1 minute; drain, cool, and squeeze completely dry.",
      "Chop the spinach finely (or blend it coarse with the ginger and green chilli).",
      "Knead the 260 g atta and salt with the spinach mixture, the cumin and just enough warm water to make a soft green dough; rest 20 minutes.",
      "Divide into 8 balls and roll each into a disc about 15 cm across.",
      "Cook on a hot tawa until spots appear; flip, brush with ghee, and cook the other side.",
      "Brush with a little more ghee and serve hot, while the green is still bright.",
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
      "Knead the 280 g atta and salt with about 170 ml warm water into a soft dough; rest, covered, for 20 minutes.",
      "Divide into 8 balls; roll each as thin as you can without tearing.",
      "Brush the whole surface with ghee and pleat the sheet like a fan, back and forth.",
      "Coil the pleated strip into a spiral, tuck the end under, and rest 10 minutes.",
      "Roll each spiral gently into a disc, keeping the layers intact — do not press hard.",
      "Cook on a hot tawa with the remaining ghee until crisp and golden on both sides; crush lightly between your palms to open the layers before serving.",
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
      "Knead a soft atta dough with about 150 ml warm water and rest, covered, for 20 minutes.",
      "Crush the cumin and coriander seeds coarsely.",
      "Just before filling — salt draws water out of onion — mix the finely chopped 200 g onion with the green chilli, crushed seeds, salt and coriander leaves.",
      "Divide the dough into 8 balls; roll one into a disc, place a mound of onion filling in the centre, gather the edges up and seal.",
      "Roll gently into a paratha, pressing from the centre out.",
      "Cook on a hot tawa with ghee on both sides until golden and crisp; serve at once.",
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
      "Knead a soft atta dough with about 150 ml warm water and rest, covered, for 20 minutes.",
      "Crumble the 200 g cottage cheese into a bowl.",
      "Mix in the finely chopped 60 g onion, green chilli, crushed cumin, salt and coriander leaves.",
      "Divide the dough into 8 balls; roll one into a disc, place a generous mound of filling in the centre, gather the edges up and seal.",
      "Roll gently into a paratha about 15 cm across.",
      "Cook on a hot tawa with ghee on both sides until golden and crisp at the edges; serve hot.",
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
      "Dry-roast the 200 g semolina in a dry pan, stirring constantly, until it smells nutty and turns very pale gold, 3–4 minutes; tip it out.",
      "Heat the 15 g oil in the same pan; sizzle the mustard seeds and cumin until the seeds finish popping.",
      "Add the ginger, green chilli and 80 g onion and cook until the onion softens, 3–4 minutes.",
      "Add the 50 g carrot and 50 g peas with about 600 ml water and the salt; bring to a rolling boil.",
      "Rain in the semolina in a thin stream, stirring constantly so no lumps form.",
      "Cover and cook on low heat for 3 minutes until all the water is absorbed and the upma is soft and fluffy.",
      "Rest 5 minutes, fluff with a fork, and finish with the coriander leaves and lemon juice.",
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
      "Dry-roast the 200 g semolina until it smells nutty and turns very pale gold; tip it out. Chop all the vegetables small.",
      "Heat the 15 g coconut oil in a wide pan; sizzle the mustard seeds and cumin until the seeds finish popping.",
      "Add the ginger, green chilli and 80 g onion and cook until the onion softens.",
      "Add the carrot, beans, peas and capsicum with a splash of water; cover and cook 4 minutes until just tender.",
      "Add about 550 ml water and the salt; bring to a rolling boil.",
      "Rain in the semolina, stirring constantly so no lumps form; cover and cook on low heat for 3 minutes until the water is absorbed.",
      "Rest 5 minutes, fluff with a fork, and finish with the coriander leaves.",
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
      "Soak the 100 g urad dal with the fenugreek seeds for 5–6 hours; drain, keeping the soaking water.",
      "Grind the urad to a smooth, fluffy batter with a little of its soaking water — it should ribbon off the spoon.",
      "Stir in the 200 g rice flour and enough water to make a thick pouring batter.",
      "Cover and ferment in a warm place for 8–12 hours, until risen, bubbly and lightly sour; stir in the salt gently so you do not knock out the air.",
      "Pour the batter into idli moulds, filling them three-quarters full.",
      "Steam for 10–12 minutes until a skewer comes out clean; rest 5 minutes before unmoulding — they should be soft and spongy.",
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
      "Soak the 80 g urad dal with the fenugreek seeds for 5–6 hours; drain.",
      "Grind the urad to a smooth batter and stir in the 200 g rice flour and enough water to a pouring consistency — thinner than idli batter.",
      "Cover and ferment in a warm place for 8–12 hours until risen; stir in the salt.",
      "Heat a cast-iron tawa until very hot; sprinkle water on it — it should sizzle and steam off at once — then wipe it clean.",
      "Pour a ladle of batter in the centre and spiral it outward with the back of the ladle into a thin circle.",
      "Drizzle oil around the edges and cook until crisp and golden underneath, about 2 minutes — a dosa is not flipped.",
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
      "Make the dosa batter: soak the 80 g urad for 5–6 hours, grind smooth, stir in the 200 g rice flour and water to a pouring batter, ferment 8–12 hours, then stir in half the salt.",
      "Boil the 300 g potatoes until tender; peel and crumble roughly — not mashed smooth.",
      "Heat a little of the oil in a pan; sizzle the mustard seeds and cumin until the seeds finish popping.",
      "Add the ginger, green chilli and 100 g onion and cook until soft, 3–4 minutes.",
      "Add the turmeric, potato and remaining salt and toss for 2 minutes until the potato is yellow and evenly coated; finish the filling with the coriander leaves.",
      "Spread a ladle of batter thin on a hot tawa, drizzle the remaining oil around the edges, and cook until crisp and golden underneath.",
      "Place a mound of potato masala in the centre of the dosa.",
      "Fold the dosa over the filling and serve at once.",
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
      "Make the batter as for dosa: soak the 80 g urad for 5–6 hours, grind smooth, stir in the 200 g rice flour, ferment 8–12 hours, and stir in the salt — keep it slightly thicker than dosa batter.",
      "Finely chop the 150 g onion, 100 g tomato, green chilli and coriander leaves and mix them together.",
      "Heat a tawa and brush it with oil.",
      "Pour a thick ladle of batter on and spread it into a thick disc — do not spread it thin like a dosa.",
      "Scatter the onion mixture generously over the top and drizzle oil around the edges.",
      "Cook on medium heat until the base is golden and the top looks set, 2–3 minutes.",
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
      "Soak the 60 g moong, 40 g urad and 40 g masoor dals together for 4–5 hours; drain.",
      "Grind the dals coarsely with the ginger and green chilli and a little water — the batter should stay grainy, not smooth.",
      "Stir in the 100 g rice flour, cumin and salt to a thick pouring batter. No fermentation needed.",
      "Rest the batter for 20 minutes.",
      "Spread a ladle of batter on a hot oiled tawa into a thick-ish disc; drizzle oil around the edges.",
      "Cook until crisp and golden underneath, 2–3 minutes; flip for 30 seconds and serve hot.",
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
      "Whisk the 120 g besan with about 150 ml water, the turmeric and salt into a smooth, lump-free batter; rest 10 minutes.",
      "Fold in the finely chopped 60 g onion, 60 g tomato, green chilli, crushed cumin and coriander leaves.",
      "Heat a tawa and brush it with oil.",
      "Pour a ladle of batter and spread into a thin disc.",
      "Cook until the edges crisp and the top sets, about 2 minutes; drizzle oil around the edges, flip, and cook 1 minute more until golden underneath.",
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
      "Soak the 200 g moong dal for 4–5 hours; drain.",
      "Grind the dal with the ginger, green chilli and 60 g spinach and just enough water to make a smooth pouring batter.",
      "Stir in the cumin, turmeric and salt.",
      "Heat a tawa and brush it with oil; pour a ladle of batter and spread into a thin disc.",
      "Cook until crisp at the edges and set on top, about 2 minutes; drizzle oil around, flip, and cook 1 minute more.",
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
      "Whisk the 120 g besan with about 150 ml water and the salt into a smooth batter; rest 10 minutes.",
      "Crumble the 100 g cottage cheese and chop the 50 g spinach.",
      "Fold the cottage cheese, spinach, 60 g onion, 60 g tomato, green chilli and coriander leaves into the batter.",
      "Heat a tawa and brush it with oil; pour a ladle of batter and spread into a disc — it will be thicker than a plain chilla.",
      "Cook until set and golden underneath, about 3 minutes; drizzle oil around, flip carefully, and cook 1–2 minutes more.",
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
      "Put the 160 g oats and 400 ml milk in a pan with about 200 ml water.",
      "Bring to a gentle simmer, stirring so the oats do not catch on the base.",
      "Cook for 5–6 minutes, stirring often, until thick and creamy — it should ribbon off the spoon.",
      "Slice the 150 g banana and chop the 20 g almonds.",
      "Spoon the porridge into bowls and top with the banana and almonds.",
      "Dust with the cinnamon and drizzle the honey over; serve hot.",
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
      "Cook the 160 g oats in the 200 ml milk with about 150 ml water for 5–6 minutes until thick and creamy.",
      "Take the pan off the heat and let it cool for 2 minutes.",
      "Stir the 200 g Greek yogurt through until glossy — off the heat, so it does not split.",
      "Slice the 100 g banana and roughly chop the 20 g almonds.",
      "Spoon into bowls and top with the banana and almonds.",
      "Scatter the pumpkin seeds over and serve warm.",
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
      "Heat the 10 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Sizzle the cumin, then add the ginger, green chilli and 60 g onion and cook until soft, 3–4 minutes.",
      "Add the 80 g tomato, turmeric and salt; cook until the tomato melts.",
      "Add the 60 g carrot, 60 g peas and about 650 ml water; simmer 3 minutes until the carrot is nearly tender.",
      "Stir in the 160 g oats and cook 4–5 minutes, stirring, until thick like a soft khichdi.",
      "Finish with the coriander leaves and serve hot.",
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
      "Mash half the banana in a jar or bowl with a fork.",
      "Stir in the 100 g oats, 200 g Greek yogurt, 100 ml skimmed milk, honey and cinnamon until evenly mixed.",
      "Cover and refrigerate overnight (at least 6 hours), until the oats are soft and the mixture is thick.",
      "In the morning, stir well; loosen with a splash of water if it is too thick.",
      "Slice the remaining banana and roughly chop the 15 g walnuts.",
      "Top with the banana and walnuts and serve cold.",
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
      "Rinse the 160 g barley and soak for 30 minutes (overnight is better); drain.",
      "Simmer the barley in about 700 ml water for 25–30 minutes until tender and chewy-soft (or pressure-cook for 5 whistles).",
      "Crush the cardamom pods lightly and drop them in.",
      "Stir in the 300 ml milk and 20 g sugar; simmer 5 more minutes until creamy.",
      "Sliver the 15 g almonds.",
      "Serve hot, topped with the slivered almonds.",
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
      "Rinse the 160 g quinoa very well under running water, rubbing it with your fingers — this removes its bitterness.",
      "Heat the 12 g oil in a pan; sizzle the mustard seeds and cumin until the seeds finish popping.",
      "Add the ginger, green chilli and 60 g onion and cook until soft, 3–4 minutes.",
      "Add the 50 g carrot and 50 g peas, the quinoa, salt and about 380 ml water; stir once.",
      "Cover and simmer on low heat for 15 minutes until the quinoa spirals unfurl and the water is absorbed.",
      "Rest 5 minutes, fluff with a fork, and finish with the coriander leaves and lemon juice.",
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
      "Lower the 4 eggs into boiling water and cook for 8–9 minutes for just-set yolks.",
      "Cool under running water until you can handle them.",
      "Peel carefully and halve the eggs lengthways.",
      "Slice the 100 g tomato and 100 g cucumber and arrange them alongside.",
      "Season the eggs with the salt and plenty of freshly crushed black pepper.",
      "Serve at once, while the yolks are still slightly soft.",
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
      "Beat the 4 eggs with the salt and turmeric until frothy.",
      "Fold in the finely chopped 60 g onion, 60 g tomato, green chilli and coriander leaves.",
      "Melt the 10 g butter in a pan on medium heat until it foams.",
      "Pour in the egg mixture and swirl to cover the base; draw the edges in with a spatula once or twice so the centre sets evenly.",
      "Cook until mostly set but still slightly soft on top, about 2 minutes.",
      "Fold in half, slide onto a plate, and serve at once.",
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
      "Beat the 4 eggs lightly with the salt.",
      "Heat the 15 g oil in a wide pan; sizzle the cumin, then add the ginger, green chilli and 100 g onion and cook until golden, 5–6 minutes.",
      "Add the 100 g tomato and turmeric; cook until the tomato melts and the oil glistens.",
      "Pour in the eggs and let them set for 20 seconds without stirring.",
      "Stir gently into large, soft curds and cook just until softly set — bhurji dries out fast, so stop while it still looks moist.",
      "Finish with the coriander leaves and serve at once.",
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
      "Soak the 120 g moong for 8 hours; drain, tie in a damp cloth, and leave in a warm place for 12–24 hours until white sprouts appear.",
      "Steam the sprouts for 3–4 minutes until just tender but still crunchy (or serve raw if the sprouts are fresh and well rinsed).",
      "Tip the sprouts into a bowl and let them cool a little.",
      "Toss with the finely chopped 60 g onion, 60 g tomato, 80 g cucumber and green chilli.",
      "Dry-roast the cumin, crush it coarsely, and sprinkle it over with the salt.",
      "Finish with the lemon juice and coriander leaves; serve fresh.",
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
      "Whisk the 300 g yogurt smooth and chill it well.",
      "Chop the 120 g banana and 100 g apple into bite-size pieces.",
      "Halve the 80 g grapes and roughly chop the 15 g almonds.",
      "Fold the fruit through the yogurt just before serving, so the apple does not brown.",
      "Drizzle the honey over the top.",
      "Scatter the almonds over and serve cold.",
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
      "Whisk the 250 g Greek yogurt smooth and chill it well.",
      "Slice the 100 g banana and 100 g strawberries.",
      "Halve the 80 g grapes and roughly chop the 20 g walnuts.",
      "Fold the fruit through the yogurt just before serving.",
      "Top with the walnuts and pumpkin seeds.",
      "Drizzle the honey over and serve cold.",
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
      "Boil the 400 g sweet potatoes in their skins until tender right through, 20–25 minutes (or roast them whole); cool slightly.",
      "Peel and cut into chunky cubes.",
      "Dry-roast the cumin in a small dry pan until fragrant and crush it coarsely.",
      "Toss the warm cubes with the crushed cumin, cayenne, black pepper and salt.",
      "Finish with the lemon juice and coriander leaves.",
      "Serve warm.",
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
      "Soak the 120 g chickpeas overnight; boil until tender, then drain.",
      "Dry the chickpeas thoroughly on a cloth — dry chickpeas roast crisp, wet ones steam.",
      "Spread them in a heavy pan or on a tray in a single layer.",
      "Roast on medium heat, stirring often, for 20–25 minutes until deep golden and crunchy — one should crackle when you bite it.",
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
      "Soak the 100 g moong for 8 hours; drain, tie in a damp cloth, and leave in a warm place for 12–24 hours until white sprouts appear.",
      "Steam the sprouts for 3–4 minutes until just tender but still crunchy.",
      "Finely chop the 60 g onion, 60 g tomato, 60 g cucumber and green chilli.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Toss the sprouts with the chopped vegetables, crushed cumin, salt and lemon juice.",
      "Finish with the coriander leaves and serve at once, before the vegetables weep.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Boil the 500 g potatoes until tender; peel and mash while warm, then cool completely — warm mash makes sticky tikkis.",
      "Lightly crush the 80 g peas.",
      "Mix the peas, 60 g onion, green chilli, ginger, crushed cumin and coriander seeds, cayenne, salt and coriander leaves into the potato.",
      "Shape into 8 flat patties with oiled palms.",
      "Shallow-fry in the 30 g oil on medium heat until deeply golden and crisp on both sides, 3–4 minutes a side.",
      "Drain on paper and serve hot.",
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
      "Boil the 400 g potato until tender; steam or boil the 100 g carrot, 100 g beans and 80 g peas until just tender and chop small. Drain everything very well.",
      "Mash the potato while warm.",
      "Mix in the vegetables, 60 g onion, green chilli, ginger, crushed cumin and coriander seeds, turmeric, salt, coriander leaves and the 50 g besan to bind.",
      "Shape into 8 oval cutlets; rest in the fridge for 20 minutes if you have time — they fry cleaner.",
      "Shallow-fry in the 30 g oil until deeply golden and crisp on both sides.",
      "Drain on paper and serve hot.",
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
      "Whisk the 200 g besan with the 100 g yogurt, turmeric, sugar, salt and about 150 ml water into a smooth, thick batter.",
      "Fold in the grated ginger and chopped green chilli.",
      "Rest the batter for 30 minutes, whisking once or twice — rested, well-beaten batter steams up lightest (this version uses no soda or fruit salt).",
      "Pour into a shallow steel plate set in a steamer; steam for 15–18 minutes until a skewer comes out clean.",
      "Heat the 15 g sesame oil; sizzle the mustard seeds and sesame seeds until the mustard pops.",
      "Pour the tempering over the dhokla with a splash of the steaming water.",
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
      "Boil or steam the 300 g corn kernels for 4–5 minutes until tender; drain well.",
      "Toss the hot corn with the 10 g butter until it melts and coats the kernels.",
      "Finely chop the 60 g onion and 60 g tomato and fold them in.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Season with the lemon juice, crushed cumin, cayenne, black pepper, salt and coriander leaves.",
      "Serve warm.",
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
      "Boil the 120 g peanuts in salted water for 15–20 minutes until tender but not soft (or roast them dry for a crunchier chaat).",
      "Drain and let them cool a little.",
      "Finely chop the 60 g onion, 60 g tomato, 60 g cucumber and green chilli and toss them with the warm peanuts.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Season with the lemon juice, crushed cumin, salt and coriander leaves.",
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
      "Chop the 150 g apple and 120 g banana into bite-size pieces.",
      "Halve the 100 g grapes.",
      "Segment the 120 g orange and cut each segment in two.",
      "Toss everything together gently.",
      "Season with the lemon juice, a pinch of salt and freshly crushed black pepper — the chaat seasoning is what makes it more than a fruit salad.",
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
      "Boil the 4 eggs for 9 minutes.",
      "Cool, peel and cut into wedges.",
      "Finely chop the 60 g onion, 60 g tomato and green chilli.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Toss the warm eggs gently with the onion, tomato and chilli, the lemon juice, crushed cumin, cayenne, salt and coriander leaves.",
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
      "Soak the 200 g chickpeas overnight; boil until tender and drain.",
      "Boil the 150 g potato and cut into cubes.",
      "Finely chop the 80 g onion, 80 g tomato, 80 g cucumber and green chilli.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Toss the chickpeas and potato with the chopped vegetables, lemon juice, crushed cumin, salt and coriander leaves.",
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
      "Soak the 120 g lobia for 6–8 hours; boil until tender but holding its shape, then drain.",
      "Finely chop the 60 g onion, 60 g tomato, 60 g cucumber and green chilli.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Toss the warm lobia with the chopped vegetables.",
      "Season with the lemon juice, crushed cumin, salt and coriander leaves.",
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
      "Soak the 100 g moong for 6–8 hours; boil until just tender — it should hold its shape — and drain well.",
      "Heat the 8 g coconut oil in a pan; sizzle the mustard seeds and cumin until the mustard pops.",
      "Add the ginger and green chilli for a few seconds until fragrant.",
      "Add the moong, turmeric and salt; toss on medium heat for 2–3 minutes.",
      "Fold in the grated coconut and take off the heat.",
      "Finish with the lemon juice and coriander leaves; serve warm.",
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
      "Soak the 120 g chickpeas overnight; boil until tender and drain well.",
      "Heat the 8 g coconut oil; sizzle the mustard seeds and cumin until the mustard pops.",
      "Add the dried red chilli and ginger for a few seconds until fragrant.",
      "Add the chickpeas, turmeric and salt; toss on medium heat for 3–4 minutes.",
      "Fold in the grated coconut and take off the heat.",
      "Finish with the lemon juice and coriander leaves; serve warm.",
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
      "Soak the 20 g tamarind in 60 ml warm water for 15 minutes; squeeze out the pulp and strain to a thick chutney.",
      "Boil the 300 g potatoes until just tender; peel and cube.",
      "Shallow-fry the cubes in the 15 g oil until crisp and golden at the edges.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Toss the hot potatoes with the finely chopped 60 g onion and green chilli, salt, crushed cumin and cayenne.",
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
      "Boil or roast the 350 g sweet potatoes until tender right through.",
      "Cool slightly, peel, and cut into chunky cubes.",
      "Dry-roast the cumin until fragrant and crush it coarsely.",
      "Toss the warm sweet potato with the cumin, cayenne, black pepper and salt.",
      "Finish with lemon juice and coriander leaves.",
      "Serve warm.",
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
      "Dry-roast the 60 g peanuts in a heavy pan until the skins crackle; rub off the skins if you like.",
      "Add the 40 g pumpkin seeds and 40 g sunflower seeds and roast, stirring, until they puff and colour lightly.",
      "Add the 20 g sesame seeds and roast 1 minute more — sesame browns fast.",
      "Add the 5 g oil, crushed cumin, cayenne, turmeric and salt.",
      "Toss on the heat for 1 minute so the spices coat everything.",
      "Cool completely and store in an airtight jar — it keeps for two weeks.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
];
