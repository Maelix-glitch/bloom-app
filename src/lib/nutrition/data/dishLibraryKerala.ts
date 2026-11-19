/**
 * The dish library, Kerala wave (WAVE I-1 of the dishes expansion) —
 * 130+ authentic Kerala dishes, hand-authored on the D1 dish model
 * exactly like the earlier slices: every line names a USDA reference
 * food and a gram amount for the WHOLE recipe, and no nutrient value
 * appears anywhere in this file — a dish's numbers exist only as
 * `dishNutrients` computes them, and its patterns only as
 * `dishPatterns` derives them. Methods are written to the programme's
 * detailed standard: prep, tempering order, times, heat and doneness
 * cues, for a home cook.
 *
 * Authoring notes — what the reference set does and does not hold,
 * and how this wave stays honest about it:
 * - There are NO curry leaves in the set. Kerala tempering without
 *   them is poorer but real (plenty of homes run out); the methods
 *   below simply never claim them.
 * - There is NO jaggery in the set, so payasams, injipuli and the
 *   achars are sweetened with the set's granulated sugar — a
 *   substitution of the sweetener only, stated here, never hidden.
 * - There is NO kudampuli (Malabar tamarind), so the fish curries
 *   sour with the set's tamarind, as many Kerala homes do.
 * - There is NO banana leaf, so there is no meen pollichathu and no
 *   ela ada — dishes whose identity IS the leaf were dropped rather
 *   than faked; the masala fish fry (meen varuthathu) stands instead.
 * - There is NO raw (unripe) mango in the set — only mango as such —
 *   so there is no manga chammanthi or raw-mango pachadi; the mango
 *   dishes below are the ripe-mango ones Kerala actually makes
 *   (mambazha pachadi, mambazha pulissery, manga curry).
 * - The set's jackfruit does not distinguish unripe from ripe, so
 *   jackfruit appears only where the ripe fruit is correct —
 *   payasam, varattiyathu (preserve) and ottada. Chakka thoran and
 *   chakka puzhukku, which need the unripe fruit, were dropped.
 * - There are NO shallots in the set; the yellow onion stands in
 *   everywhere a Kerala recipe would slice shallots, at like weight.
 * - There are NO raisins, so the biryanis garnish with fried onion
 *   and cashew only. There is no pearl-spot fish (karimeen), no
 *   crab, no mussels, no anchovy, no coconut water, no rice flakes
 *   (aval), no vermicelli and no rice ada — so no karimeen fry, no
 *   njandu curry, no kallumakkaya, no elaneer payasam, no aval
 *   payasam and no palada payasam. Dropped, not faked.
 * - Elephant yam (chena), pumpkin (mathanga) and beetroot are absent
 *   too, so avial is built from the sadhya vegetables the set does
 *   hold, and there is no chena puzhukku or beetroot pachadi.
 * - Following the library's standing precedent, beef and pork —
 *   present as reference foods — are not used in dishes here.
 * - Water is never a line — it carries no nutrients and is not a
 *   reference food; the methods say where it goes.
 */

import type { Dish } from "../dishes";

export const KERALA_DISHES: Dish[] = [
  /* ------------------------- sadhya curries ------------------------- */
  {
    id: "dish-varutharacha-sambar",
    name: { en: "Varutharacha Sambar", hindi: "वरुथराचा सांभर" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-172436", grams: 150 }, // pigeon peas (toor dal)
      { foodId: "usda-170483", grams: 150 }, // drumstick pods
      { foodId: "usda-2346401", grams: 100 }, // potato
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the toor dal and pressure-cook with the turmeric and 600 ml water for 4 whistles, until completely soft; whisk smooth.",
      "Soak the tamarind in 200 ml warm water for 10 minutes; squeeze and strain the juice. Cut the drumstick into finger lengths, the potato and carrot into chunks.",
      "Dry-roast the coconut in a heavy pan on medium heat, stirring constantly, until deep golden-brown and nutty, 6–8 minutes; add the coriander seeds, red chillies and fenugreek for the last minute.",
      "Cool the roast slightly and grind to a smooth, fine paste with a little water — this varutharacha paste is the heart of the dish.",
      "Simmer the potato, carrot and drumstick in the tamarind water with half the salt for 8–10 minutes, until just tender; add the tomato and cook 3 minutes more.",
      "Stir in the cooked dal and the ground paste; simmer gently 5 minutes until the raw smell of the paste leaves and the sambar thickens slightly. Adjust the salt.",
      "Heat the coconut oil in a small pan; crackle the mustard seeds, then add the cumin and sliced garlic and fry until the garlic is pale gold.",
      "Pour the tempering over the sambar, scatter the coriander leaves, cover for 2 minutes, then serve over rice.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-murungakkai-sambar",
    name: { en: "Murungakkai Sambar", hindi: "मुरुंगक्कै सांभर" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-172436", grams: 150 }, // pigeon peas (toor dal)
      { foodId: "usda-170483", grams: 250 }, // drumstick pods
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Pressure-cook the rinsed toor dal with the turmeric and 600 ml water for 4 whistles until soft; whisk to a smooth, pourable dal.",
      "Dry-roast the coriander seeds, cumin and cayenne briefly until fragrant, then grind to a powder — the sambar powder for this pot.",
      "Soak the tamarind in 200 ml warm water 10 minutes; squeeze and strain. Cut the drumsticks into finger lengths and scrape the onion into wedges.",
      "Simmer the drumstick and onion in the tamarind water with half the salt for 8 minutes, until the drumstick flesh yields when pressed; add the tomato and cook 3 minutes.",
      "Pour in the dal and the ground powder; simmer 5 minutes so the drumstick takes up the dal's flavour. Adjust salt and sourness.",
      "Heat the coconut oil; crackle the mustard and fenugreek, add the red chillies and sliced garlic, and fry to pale gold.",
      "Pour the tempering over, scatter coriander leaves, rest covered 2 minutes, and serve hot over rice.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-kerala-parippu-curry",
    name: { en: "Parippu Curry", hindi: "परिप्पु करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174256", grams: 180 }, // mung beans (moong dal)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the moong dal and cook in 700 ml water with the turmeric and half the salt, skimming the foam, for 20–25 minutes until the grains are soft and falling apart.",
      "Grind the coconut with the cumin, green chilli and garlic to a smooth paste with a little water.",
      "Stir the paste into the dal and simmer on low heat 4–5 minutes, until the raw smell of coconut leaves; the curry should pour like thick cream. Adjust the salt.",
      "Slice the onion thinly. Heat the coconut oil in a small pan and crackle the mustard seeds.",
      "Add the onion and fry, stirring, until deep golden and crisp at the edges — this fried onion is the sadhya finish.",
      "Pour the tempering over the curry, cover for 2 minutes so the aroma settles, and serve as the first curry over rice, with ghee if you like.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-moru-curry",
    name: { en: "Moru Curry", hindi: "मोरु करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2259793", grams: 400 }, // yogurt (curd)
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-170169", grams: 50 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the cucumber into small cubes, keeping the peel. Cook it in 150 ml water with half the salt and half the turmeric for 5–6 minutes, until just tender but still holding its shape.",
      "Grind the coconut with the cumin, green chilli and ginger to a smooth paste with a little water.",
      "Stir the paste into the cucumber and simmer 2 minutes, until the raw smell leaves; take the pan off the heat.",
      "Whisk the curd smooth with the remaining turmeric and salt. Pour it into the warm — not boiling — cucumber mixture, stirring gently.",
      "Warm through on the lowest heat for 2 minutes, stirring; do not let it boil or the curd will split. Take off the heat.",
      "Heat the coconut oil; crackle the mustard and fenugreek seeds until the fenugreek darkens slightly, and pour the tempering over.",
      "Rest 5 minutes and serve over rice — moru curry should be pourable, gently sour and warm, never boiled.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kumbalanga-pulissery",
    name: { en: "Kumbalanga Pulissery", hindi: "कुम्बलंगा पुलिश्शेरी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170069", grams: 400 }, // waxgourd (ash gourd)
      { foodId: "usda-2259793", grams: 300 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the ash gourd, discard the seeds and cut the flesh into medium cubes.",
      "Cook the cubes in 200 ml water with the turmeric, green chilli and half the salt for 8–10 minutes, until translucent and tender.",
      "Grind the coconut and cumin to a smooth paste; stir it into the gourd and simmer 2–3 minutes until the raw smell leaves.",
      "Take the pan off the heat. Whisk the curd smooth and stir it in gently.",
      "Warm on the lowest heat for 2 minutes without boiling, stirring once or twice; adjust the salt.",
      "Heat the coconut oil; crackle the mustard and fenugreek, add the broken red chillies, and pour over the pulissery.",
      "Rest covered 5 minutes and serve with rice — the gravy should be pale gold, silky and just sour.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mambazha-pulissery",
    name: { en: "Mambazha Pulissery", hindi: "माम्बझा पुलिश्शेरी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169910", grams: 300 }, // mango
      { foodId: "usda-2259793", grams: 300 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Peel the ripe mangoes and cut the flesh into chunks, keeping any juice that runs out.",
      "Cook the mango in 150 ml water with the turmeric, green chilli, sugar and half the salt for 5 minutes, until soft and giving off its perfume.",
      "Grind the coconut and cumin smooth; stir into the mango and simmer 2 minutes, until the raw smell leaves.",
      "Off the heat, whisk the curd until smooth and stir it through gently.",
      "Warm 2 minutes on the lowest heat, never boiling, and adjust the balance — it should taste sweet first, then sour, then warm with chilli.",
      "Heat the coconut oil; crackle the mustard and fenugreek, add the red chillies, and pour the tempering over.",
      "Rest 5 minutes and serve with rice while the mango is still in soft chunks.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kerala-mutta-curry",
    name: { en: "Kerala Mutta Curry", hindi: "केरल मुट्टा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 330 }, // eggs (6)
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 10 minutes, cool in water, peel and score each one lightly with two shallow slits.",
      "Dry-roast the coriander seeds, fennel and black pepper until fragrant; grind to a powder.",
      "Heat the coconut oil, crackle the mustard seeds, and add the sliced onion; fry on medium heat 8–10 minutes until golden at the edges.",
      "Add the ginger, garlic and green chilli; fry 1 minute until the raw smell leaves. Add the tomato and turmeric and cook 4 minutes, until the tomato softens and the oil glistens.",
      "Add the ground spice powder and stir 30 seconds. Pour in the coconut milk and 100 ml water, add the salt, and bring to a gentle simmer.",
      "Slide in the eggs and simmer 5 minutes, spooning the gravy over them, until it thickens slightly and coats the eggs.",
      "Scatter the coriander leaves, rest 5 minutes, and serve with appam, idiyappam or rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mutta-roast",
    name: { en: "Mutta Roast", hindi: "मुट्टा रोस्ट" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 330 }, // eggs (6)
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs 10 minutes, cool, peel and halve them lengthways.",
      "Grind the coriander seeds, fennel and black pepper to a coarse powder.",
      "Heat the coconut oil and fry the sliced onion on medium heat for 12–15 minutes, stirring often, until deeply golden and sweet — the roast stands or falls on this onion.",
      "Add the ginger, garlic and green chilli; fry 1 minute. Add the tomato, turmeric, chilli powder and salt and cook 5 minutes, until the tomato melts into the onion and the oil separates.",
      "Stir in the ground spices and 3–4 tablespoons of water; cook 2 minutes into a thick, dark masala that leaves the sides of the pan.",
      "Lay the egg halves cut-side up in the masala and spoon it over them; roast gently 3–4 minutes, turning once, until the eggs take colour at the edges.",
      "Scatter coriander leaves and serve hot with appam, porotta or rice — the masala should cling, not pool.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kadala-curry",
    name: { en: "Kadala Curry", hindi: "कडाला करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 250 }, // chickpeas
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight in plenty of water. Drain, rinse and pressure-cook in fresh water with half the salt for 6–7 whistles, until soft enough to crush between fingers.",
      "Dry-roast the coconut on medium heat until evenly golden-brown, 5–6 minutes; add the coriander seeds, fennel, cinnamon and cloves for the last minute.",
      "Cool and grind the roast to a smooth paste with a little of the chickpea cooking water.",
      "Heat the coconut oil, crackle the mustard, and fry the sliced onion until golden, 8 minutes. Add ginger, garlic and green chilli; fry 1 minute.",
      "Add the tomato and turmeric and cook 4 minutes until soft and the oil glistens. Stir in the ground paste and fry 2 minutes until its raw smell leaves.",
      "Add the chickpeas with enough cooking water for a thick gravy; simmer 8–10 minutes so the masala enters the peas. Adjust the salt.",
      "Rest 5 minutes and serve with puttu — the classic partner — or appam and rice.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-kadala-curry-enriched",
    name: { en: "Kadala Curry (Enriched)", hindi: "कडाला करी (समृद्ध)" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 300 }, // chickpeas
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170172", grams: 100 }, // coconut milk
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight. Drain, rinse and pressure-cook in fresh water with half the salt for 6–7 whistles, until completely soft.",
      "Dry-roast the coconut until evenly golden-brown, 5–6 minutes; add the coriander seeds, fennel, cinnamon and cloves for the last minute, then grind smooth with a little cooking water.",
      "Heat the coconut oil, crackle the mustard, and fry the onion golden, 8 minutes. Add ginger, garlic and green chilli; fry 1 minute.",
      "Add the tomato and turmeric; cook 4 minutes until soft. Stir in the ground paste and fry 2 minutes until its raw smell leaves.",
      "Add the chickpeas with their cooking water and simmer 8 minutes.",
      "Stir in the coconut milk and simmer 2 more minutes — do not boil hard — until the gravy turns glossy and rich.",
      "Rest 5 minutes and serve with puttu or appam.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "50 g extra chickpeas and 100 g coconut milk stirred through the classic kadala curry — more protein per serving and a richer gravy.",
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-cherupayar-curry",
    name: { en: "Cherupayar Curry", hindi: "चेरुपायर करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174256", grams: 200 }, // mung beans (whole moong)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170169", grams: 40 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the whole moong and pressure-cook in 700 ml water with the turmeric and half the salt for 3 whistles, until soft but still holding shape.",
      "Heat the coconut oil, crackle the mustard and cumin, and fry the sliced onion until golden at the edges, 7–8 minutes.",
      "Add the garlic and green chilli; fry 1 minute. Add the tomato and cook 4 minutes until it softens and the oil glistens.",
      "Pour in the cooked moong with its water; simmer 6–8 minutes until the gravy thickens slightly and the beans take the masala.",
      "Stir in the grated coconut and simmer 2 minutes more — it should stay a loose curry, not a dry fry.",
      "Adjust the salt, scatter coriander leaves, and serve with rice or puttu.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-vanpayar-curry",
    name: { en: "Vanpayar Curry", hindi: "वनपायर करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-173758", grams: 220 }, // cowpeas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170169", grams: 50 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the cowpeas for 4–6 hours. Drain and pressure-cook in fresh water with half the salt for 3 whistles, until tender but not mushy.",
      "Dry-roast the coriander seeds until fragrant and grind to a powder.",
      "Heat the coconut oil, crackle the mustard, and fry the onion until golden, 8 minutes. Add the garlic and green chilli; fry 1 minute.",
      "Add the tomato, turmeric and the coriander powder; cook 4 minutes until the tomato melts and the oil separates.",
      "Add the cowpeas with enough cooking water for a curry; simmer 8 minutes so the peas absorb the masala.",
      "Stir in the grated coconut, simmer 2 minutes, adjust the salt, and serve with rice or kanji.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-vendakka-theeyal",
    name: { en: "Vendakka Theeyal", hindi: "वेंडक्का तीयल" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169260", grams: 400 }, // okra
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Wash the okra, dry it thoroughly and cut into 2 cm pieces — dry okra fries without turning slimy.",
      "Soak the tamarind in 200 ml warm water for 10 minutes; squeeze and strain.",
      "Dry-roast the coconut on medium heat, stirring, until deep brown and aromatic, 7–8 minutes; add the coriander seeds, red chillies and fenugreek for the last minute. Grind to a smooth paste with a little water.",
      "Heat half the coconut oil and fry the okra in a single layer for 6–7 minutes, until the edges colour and the stickiness disappears; set aside.",
      "In the same pan, fry the sliced onion in the remaining oil until golden; add the garlic for the last minute.",
      "Pour in the tamarind water and turmeric; simmer 3 minutes. Stir in the ground paste and simmer 4 minutes until the gravy darkens and thickens.",
      "Add the fried okra and salt; simmer 3 minutes so it drinks the gravy without going soft.",
      "Temper the mustard seeds in a teaspoon of the pan's oil if needed — or serve as is, rested 5 minutes, with rice. Theeyal should be dark, tangy and concentrated.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pavakka-theeyal",
    name: { en: "Pavakka Theeyal", hindi: "पावक्का तीयल" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168393", grams: 350 }, // bitter gourd
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Halve the bitter gourds, scrape out the seeds and slice thinly. Rub with a little of the salt and rest 15 minutes; squeeze out the bitter juice and rinse once.",
      "Soak the tamarind in 200 ml warm water 10 minutes; squeeze and strain.",
      "Dry-roast the coconut until deep brown, 7–8 minutes, adding the coriander seeds, red chillies and fenugreek at the end; grind to a smooth paste.",
      "Heat the coconut oil and fry the bitter gourd slices for 8–10 minutes, until they shrink and colour at the edges — frying tames the bitterness.",
      "Add the sliced onion and fry 5 minutes more, until golden.",
      "Pour in the tamarind water, turmeric and sugar; simmer 3 minutes. Stir in the ground paste and simmer 5 minutes until the gravy is dark and thick.",
      "Crackle the mustard seeds in the pan's oil at the edge, stir through, adjust salt and sourness, and rest 5 minutes.",
      "Serve with rice — theeyal keeps well and tastes deeper the next day.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ulli-theeyal",
    name: { en: "Ulli Theeyal", hindi: "उल्ली तीयल" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-790646", grams: 450 }, // onion
      { foodId: "usda-170169", grams: 90 }, // coconut (fresh)
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-170922", grams: 7 }, // coriander seeds
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the onions thinly and evenly — they are the whole dish.",
      "Soak the tamarind in 250 ml warm water 10 minutes; squeeze and strain.",
      "Dry-roast the coconut, stirring constantly, until a deep even brown, 8 minutes; add the coriander seeds, red chillies and fenugreek for the last minute. Grind very smooth with a little water.",
      "Heat the coconut oil and fry the onions on medium heat for 12–15 minutes, until they collapse, sweeten and turn golden-brown.",
      "Pour in the tamarind water, turmeric and sugar; simmer 4 minutes.",
      "Stir in the ground paste and simmer 5–6 minutes until the gravy is dark, thick and glossy with oil at the edges.",
      "Crackle the mustard seeds in a little of the oil, stir through, and adjust the salt — the balance is sour, sweet, bitter, hot.",
      "Rest 10 minutes and serve with rice; a little theeyal goes a long way.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chemmeen-theeyal",
    name: { en: "Chemmeen Theeyal", hindi: "चेम्मीन तीयल" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 400 }, // shrimp (prawns)
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel and devein the prawns; rinse, drain well and toss with a pinch of the salt and turmeric.",
      "Soak the tamarind in 150 ml warm water 10 minutes; squeeze and strain.",
      "Dry-roast the coconut until deep brown, 7 minutes, adding the coriander seeds and red chillies at the end; grind to a smooth paste.",
      "Heat the coconut oil, crackle the mustard, and fry the sliced onion until golden, 8 minutes. Add the ginger and garlic; fry 1 minute.",
      "Pour in the tamarind water and simmer 3 minutes. Stir in the ground paste and simmer 4 minutes until dark and thick.",
      "Add the prawns and cook 4–5 minutes only, until they curl and turn opaque — overcooked prawns go rubbery.",
      "Adjust the salt, rest 5 minutes, and serve with rice.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* --------------------------- fish & seafood --------------------------- */
  {
    id: "dish-nadan-meen-curry",
    name: { en: "Nadan Meen Curry", hindi: "नाडन मीन करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-167763", grams: 25 }, // tamarind
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Clean the mackerel and cut into thick steaks; rub with a pinch of the salt and turmeric and rest 10 minutes.",
      "Soak the tamarind in 250 ml warm water 10 minutes; squeeze and strain — this sour water is the curry's base.",
      "Grind the coriander seeds to a powder. Heat the coconut oil in a clay pot or heavy pan; crackle the mustard and fenugreek seeds.",
      "Add the sliced onion and fry until golden, 7–8 minutes. Add the crushed ginger, garlic and slit green chillies; fry 1 minute until fragrant.",
      "Lower the heat, add the chilli powder, coriander powder and remaining turmeric, and stir 30 seconds — the spices should sizzle, not scorch.",
      "Add the tomato and cook 4 minutes until it softens. Pour in the tamarind water and the salt; bring to a rolling boil and simmer 5 minutes until the raw tamarind smell leaves.",
      "Slide in the fish in one layer. Simmer on medium heat 7–8 minutes, swirling the pot instead of stirring, until the fish is just cooked and flakes at the bone.",
      "Rest 10 minutes off the heat — meen curry settles and deepens as it sits. Serve with rice or kappa.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mathi-curry",
    name: { en: "Mathi Curry", hindi: "मत्ति करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175139", grams: 400 }, // sardines (canned, drained)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Drain the sardines well and keep them whole — they are already cooked, so they need only warming through the gravy.",
      "Soak the tamarind in 200 ml warm water 10 minutes; squeeze and strain. Grind the coriander seeds to a powder.",
      "Heat the coconut oil; crackle the mustard and fenugreek. Fry the sliced onion until golden, 7 minutes.",
      "Add the crushed ginger, garlic and green chillies; fry 1 minute. Lower the heat and stir in the chilli powder, coriander powder and turmeric for 30 seconds.",
      "Add the tomato and cook 4 minutes until soft. Pour in the tamarind water and salt; boil 5 minutes until the raw smell leaves and the gravy turns a deep red.",
      "Lay the sardines gently into the gravy and simmer on the lowest heat 4–5 minutes, spooning gravy over them — do not stir or they will break.",
      "Rest 5 minutes and serve with rice; the sardines should be whole, glossy and soaked in the sour-hot gravy.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-thenga-aracha-meen-curry",
    name: { en: "Thenga Aracha Meen Curry", hindi: "थेंगा अराचा मीन करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // cod
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the fish into large chunks and rub with a pinch of the salt and turmeric; rest 10 minutes.",
      "Grind the coconut with the coriander seeds, cumin, green chilli, half the ginger and half the garlic to a very smooth paste — the aracha (ground) masala.",
      "Soak the tamarind in 150 ml warm water 10 minutes; squeeze and strain.",
      "Heat the coconut oil, crackle the mustard, and fry the sliced onion until golden, 7 minutes. Add the remaining ginger and garlic; fry 1 minute.",
      "Add the tomato, chilli powder and remaining turmeric; cook 3 minutes until the tomato softens.",
      "Stir in the ground coconut paste and the tamarind water with 150 ml more water; add the salt and bring to a gentle boil, simmering 4 minutes until the raw coconut smell leaves.",
      "Slide in the fish and poach at a bare simmer 6–7 minutes, until it flakes easily.",
      "Rest 5 minutes and serve with rice — the gravy should be thick, pale and coconut-rich.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-manga-meen-curry",
    name: { en: "Manga Meen Curry", hindi: "मांगा मीन करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-169910", grams: 150 }, // mango
      { foodId: "usda-170172", grams: 150 }, // coconut milk
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the mackerel into steaks and rub with a pinch of the salt and turmeric. Peel the mango and cut the flesh into thick slices.",
      "Grind the coriander seeds to a powder. Heat the coconut oil; crackle the mustard and fenugreek seeds.",
      "Fry the sliced onion until golden, 7 minutes. Add the crushed ginger, garlic and green chillies; fry 1 minute.",
      "Lower the heat; stir in the chilli powder, coriander powder and remaining turmeric for 30 seconds.",
      "Add 250 ml water and the salt; bring to a boil. Add the mango slices and simmer 3 minutes, until they soften at the edges and sour the gravy.",
      "Slide in the fish and simmer 6–7 minutes, swirling the pot, until just cooked through.",
      "Pour in the coconut milk and warm 2 minutes without boiling hard, until the gravy turns silky.",
      "Rest 10 minutes and serve with rice — sweet-sour mango against hot fish curry is the mango-season plate.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-meen-varuthathu",
    name: { en: "Meen Varuthathu", hindi: "मीन वरुथथु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-169714", grams: 15 }, // rice flour
      { foodId: "usda-330458", grams: 40 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the mackerel into steaks and score the thickest parts lightly.",
      "Grind the coriander seeds and black pepper; mix with the chilli powder, turmeric, salt, crushed garlic and ginger and the lemon juice into a thick paste, adding a spoon of water if needed.",
      "Coat the fish evenly with the paste, dust lightly with the rice flour, and rest 20 minutes — the marinade should cling, not drip.",
      "Heat the coconut oil in a wide heavy pan until shimmering. Lay the fish in a single layer without crowding.",
      "Fry on medium heat 4–5 minutes without moving, until a deep red-brown crust forms; turn once and fry 3–4 minutes more.",
      "Drain on a rack or paper for 2 minutes so the crust stays crisp.",
      "Serve at once with onion slices and lemon — the crust should crackle and the centre stay moist.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chemmeen-curry",
    name: { en: "Chemmeen Curry", hindi: "चेम्मीन करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 450 }, // shrimp (prawns)
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-167746", grams: 10 }, // lemon (for its juice)
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel and devein the prawns; rinse, drain and toss with a pinch of the salt and turmeric.",
      "Grind the coriander seeds and fennel to a powder. Heat the coconut oil and crackle the mustard seeds.",
      "Fry the sliced onion until golden, 8 minutes. Add the ginger, garlic and green chilli; fry 1 minute until fragrant.",
      "Lower the heat; stir in the chilli powder, spice powder and remaining turmeric for 30 seconds. Add the tomato and cook 4 minutes until it melts.",
      "Pour in the coconut milk and 100 ml water with the salt; bring to a gentle simmer and cook 3 minutes.",
      "Add the prawns and simmer 4–5 minutes, until they curl into C shapes and turn opaque — a tight O means overcooked.",
      "Finish with the lemon juice, rest 3 minutes, and serve with rice or appam.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chemmeen-roast",
    name: { en: "Chemmeen Roast", hindi: "चेम्मीन रोस्ट" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 450 }, // shrimp (prawns)
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-167746", grams: 10 }, // lemon (for its juice)
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Peel and devein the prawns; toss with half the chilli powder, the turmeric, a pinch of salt and the lemon juice; rest 15 minutes.",
      "Grind the coriander seeds, fennel and black pepper to a powder.",
      "Heat the coconut oil and fry the sliced onion on medium heat 12 minutes, until deep golden and sweet.",
      "Add the ginger, garlic and green chilli; fry 1 minute. Add the tomato and cook 5 minutes until it melts and the oil separates.",
      "Stir in the remaining chilli powder and the ground spices with 3 tablespoons of water; cook 2 minutes into a thick dark masala.",
      "Add the prawns and roast on medium-high heat 4–5 minutes, tossing, until they are coated, curled and just cooked, with the masala clinging and nearly dry.",
      "Scatter coriander leaves and serve hot with porotta or rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ------------------------------ chicken ------------------------------ */
  {
    id: "dish-nadan-kozhi-curry",
    name: { en: "Nadan Kozhi Curry", hindi: "नाडन कोझी करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces on the bone if you can; rub with a pinch of the salt and turmeric and rest 15 minutes.",
      "Dry-roast the coriander seeds, fennel, black pepper, cinnamon, cloves and cardamom until fragrant; grind to a powder — the garam masala for this curry.",
      "Heat the coconut oil and fry the sliced onion until golden, 9–10 minutes. Add the crushed ginger, garlic and green chillies; fry 1 minute.",
      "Add the tomato and cook 4 minutes until soft and the oil glistens. Lower the heat; stir in the chilli powder, remaining turmeric and the ground masala for 30 seconds.",
      "Add the chicken and toss well in the masala; cover and cook on low heat 10 minutes in its own juices, stirring once.",
      "Add 150 ml hot water and the salt; simmer 10–12 minutes more, until the chicken is tender and the gravy has body.",
      "Pour in the coconut milk and warm 3 minutes without a hard boil, until glossy. Scatter coriander leaves, rest 5 minutes, and serve with rice, appam or porotta.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kozhi-varutharacha-curry",
    name: { en: "Kozhi Varutharacha Curry", hindi: "कोझी वरुथराचा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 7 }, // coriander seeds
      { foodId: "usda-171323", grams: 3 }, // fennel seeds
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces; rub with a pinch of the salt and turmeric.",
      "Dry-roast the coconut on medium heat, stirring constantly, until deep golden-brown, 6–7 minutes; add the coriander seeds, fennel, black pepper, cinnamon, cloves and cardamom for the last minute.",
      "Cool slightly and grind to a smooth paste with a little warm water — the roasted coconut is what makes this curry dark and nutty.",
      "Heat the coconut oil and fry the onion until golden, 9 minutes. Add the ginger, garlic and green chillies; fry 1 minute.",
      "Add the tomato and remaining turmeric; cook 4 minutes until soft. Add the chicken and sear in the masala 5 minutes.",
      "Stir in the ground paste with 200 ml water and the salt; cover and simmer 15 minutes, until the chicken is tender and the gravy thick and dark.",
      "Rest 5 minutes, scatter coriander leaves, and serve with rice or porotta.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kerala-chicken-stew",
    name: { en: "Kerala Chicken Stew", hindi: "केरल चिकन स्टू" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into bite-size pieces. Peel and cube the potato and carrot into similar sizes so they cook together.",
      "Heat the coconut oil and bloom the cinnamon, cloves, cardamom and bay leaf for 30 seconds, until fragrant.",
      "Add the sliced onion, ginger, garlic and slit green chillies; fry gently 4–5 minutes until the onion is soft and translucent — a stew never browns its onion.",
      "Add the chicken and toss 3 minutes until it turns opaque. Add the potato, carrot, black pepper, salt and 200 ml water.",
      "Cover and simmer 12–15 minutes, until the chicken is cooked and the vegetables tender.",
      "Pour in the coconut milk and warm at a bare simmer 3–4 minutes — never boil, or the milk splits and the stew loses its silk.",
      "Rest 5 minutes and serve with appam — the classic partner — or idiyappam. The gravy should be pale, thin and fragrant.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kozhi-porichathu",
    name: { en: "Kozhi Porichathu", hindi: "कोझी पोरिचथु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-169714", grams: 20 }, // rice flour
      { foodId: "usda-330458", grams: 50 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into medium pieces and score the thick parts so the marinade enters.",
      "Grind the coriander seeds, fennel and black pepper; mix with the chilli powder, turmeric, salt, crushed garlic and ginger and the lemon juice into a thick paste.",
      "Rub the paste all over the chicken, dust with the rice flour, and marinate at least 30 minutes — overnight is better.",
      "Heat the coconut oil in a heavy pan until shimmering. Slice the onion into rings.",
      "Fry the chicken in a single layer on medium heat, 6–7 minutes a side, turning once, until deeply coloured, crisp at the edges and cooked through — juices should run clear.",
      "In the last 2 minutes, add the onion rings to the pan and let them catch the spiced oil and soften slightly.",
      "Drain briefly and serve hot with the onions over the top, with porotta or rice and a lemon wedge.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kozhi-perattu",
    name: { en: "Kozhi Perattu", hindi: "कोझी पेरट्टु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170931", grams: 4 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into small curry pieces. Grind the coriander seeds, fennel and black pepper to a powder.",
      "Toss the chicken with the turmeric, half the chilli powder and a pinch of salt; rest 15 minutes.",
      "Heat the coconut oil and fry the sliced onion slowly for 12–15 minutes, until deep golden and sweet — perattu is built on this onion.",
      "Add the ginger, garlic and green chillies; fry 1 minute. Add the tomato and cook 4 minutes until it melts into the onion.",
      "Add the chicken and the remaining spices; toss on high heat 3 minutes to coat and seal.",
      "Lower the heat, cover, and cook 15 minutes in the chicken's own juices, stirring now and then, until tender.",
      "Uncover and roast 5–7 minutes more, scraping the pan, until the masala darkens, dries and clings to every piece — that slow varattu finish is the dish.",
      "Scatter coriander leaves and serve with rice or porotta.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ------------------------- more vegetable mains ------------------------- */
  {
    id: "dish-koon-curry",
    name: { en: "Koon Curry", hindi: "कून करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-1750347", grams: 500 }, // mushrooms
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Wipe the mushrooms clean and halve or quarter them; do not soak — they drink water and steam instead of frying.",
      "Grind the coriander seeds, fennel and black pepper to a powder.",
      "Heat the coconut oil, crackle the mustard, and fry the onion until golden, 8 minutes. Add the ginger, garlic and green chilli; fry 1 minute.",
      "Add the tomato, turmeric and spice powder; cook 4 minutes until the tomato melts and the oil separates.",
      "Add the mushrooms and toss on high heat 4–5 minutes — they will release juice, then take the masala back up as it dries.",
      "Pour in the coconut milk and simmer 3 minutes until the gravy is glossy and coats the mushrooms.",
      "Adjust the salt and serve with rice, appam or chapathi.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-urulakizhangu-curry",
    name: { en: "Urulakizhangu Curry", hindi: "उरुलाकिझंगु करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the potatoes and cut into 2 cm cubes. Grind the coriander seeds to a powder.",
      "Heat the coconut oil, crackle the mustard, and fry the sliced onion until soft and pale gold, 6 minutes.",
      "Add the ginger, garlic and green chilli; fry 1 minute. Add the turmeric and coriander powder and stir 30 seconds.",
      "Add the potato, salt and 200 ml water; cover and simmer 12–15 minutes until the potato is tender and just starting to break at the edges.",
      "Lightly crush a few potato pieces against the side of the pan to thicken the gravy.",
      "Pour in the coconut milk and warm 3 minutes at a bare simmer until silky.",
      "Serve with poori, appam or rice — the appam-and-potato-curry plate is a Kerala breakfast classic.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kerala-veg-stew",
    name: { en: "Kerala Vegetable Stew", hindi: "केरल वेजिटेबल स्टू" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the potato and carrot into even batons and the beans into short lengths, so everything cooks at the same pace.",
      "Heat the coconut oil and bloom the cinnamon, cloves and cardamom for 30 seconds.",
      "Add the onion, ginger and green chillies; fry gently 4 minutes until soft, without colour.",
      "Add the potato, carrot, beans, peas, black pepper, salt and 200 ml water; cover and simmer 10–12 minutes until just tender.",
      "Pour in the coconut milk and warm at a bare simmer 3 minutes — never boil.",
      "Rest 5 minutes and serve with appam; the stew should be pale, mild and fragrant, the vegetables still distinct.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-thakkali-curry",
    name: { en: "Thakkali Curry", hindi: "थक्काली करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170457", grams: 500 }, // tomato
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Chop the tomatoes roughly. Grind the coconut with the cumin, coriander seeds and green chilli to a smooth paste.",
      "Heat the coconut oil, crackle the mustard, and fry the onion until golden at the edges, 7 minutes.",
      "Add the ginger and garlic; fry 1 minute. Add the tomatoes, turmeric and salt.",
      "Cook the tomatoes on medium heat 8–10 minutes, crushing them as they soften, until they collapse into a thick sauce and the oil glistens.",
      "Stir in the coconut paste and 100 ml water; simmer 4 minutes until the raw smell leaves and the gravy turns creamy.",
      "Rest 3 minutes and serve over rice — bright, tangy and coconut-soft.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kappa-curry",
    name: { en: "Kappa Curry", hindi: "कप्पा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169985", grams: 600 }, // cassava
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the cassava thickly, cut into chunks and remove the woody core. Boil in plenty of water for 15 minutes; drain and discard the water — cassava is always boiled and drained first.",
      "Refill with fresh water, add the turmeric and half the salt, and cook 10 more minutes until the chunks are soft through.",
      "Grind the coconut with the cumin, green chilli and garlic to a coarse paste.",
      "Stir the paste into the cassava with a little of its cooking water; simmer 4 minutes until the gravy turns creamy and coats the chunks.",
      "Heat the coconut oil in a small pan; crackle the mustard, add the sliced onion and red chillies, and fry until the onion is golden.",
      "Pour the tempering over, adjust the salt, and serve with meen curry — kappa and fish curry is the plate Kerala is proudest of.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chembu-curry",
    name: { en: "Chembu Curry", hindi: "चेम्बु करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169308", grams: 500 }, // taro
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the taro wearing gloves if your skin is sensitive, and cut into chunks. Boil in water 10 minutes until just tender; drain.",
      "Soak the tamarind in 150 ml warm water 10 minutes; squeeze and strain.",
      "Grind the coconut with the coriander seeds, green chilli and garlic to a smooth paste.",
      "Heat the coconut oil, crackle the mustard, and fry the onion until golden, 7 minutes.",
      "Add the taro, tamarind water, turmeric and salt; simmer 5 minutes — the tamarind keeps the taro from turning slimy.",
      "Stir in the coconut paste and simmer 4 minutes until the gravy is creamy and the raw smell leaves.",
      "Rest 3 minutes and serve with rice.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-murungakkai-curry",
    name: { en: "Murungakkai Curry", hindi: "मुरुंगक्कै करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170483", grams: 400 }, // drumstick pods
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Scrape the drumsticks lightly, cut into finger lengths and split any thick ones lengthways.",
      "Grind the coriander seeds and cumin to a powder.",
      "Heat the coconut oil, crackle the mustard, and fry the onion until soft and pale gold, 6 minutes. Add the garlic and green chilli; fry 1 minute.",
      "Add the tomato, turmeric and spice powder; cook 3 minutes until the tomato softens.",
      "Add the drumstick pieces, salt and 150 ml water; cover and simmer 8–10 minutes until the flesh inside the pods is soft when squeezed.",
      "Pour in the coconut milk and warm 3 minutes at a bare simmer.",
      "Serve with rice — eat by pulling the pod through your teeth to scrape out the soft, spiced flesh.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ulli-curry",
    name: { en: "Ulli Curry", hindi: "उल्ली करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-790646", grams: 500 }, // onion
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-171319", grams: 2 }, // chilli powder
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the onions thinly. Soak the tamarind in 100 ml warm water 10 minutes; squeeze and strain. Grind the coriander seeds to a powder.",
      "Heat the coconut oil, crackle the mustard, and fry the onions on medium heat 12–15 minutes, stirring often, until soft, sweet and golden.",
      "Add the ginger, garlic and green chilli; fry 1 minute. Lower the heat and stir in the turmeric, chilli powder and coriander powder for 30 seconds.",
      "Pour in the tamarind water and simmer 4 minutes until the onions melt further and the gravy turns tangy.",
      "Add the coconut milk and salt; warm 3 minutes at a bare simmer until glossy.",
      "Serve with appam, dosa or rice — a Malabar curry that turns the humblest ingredient into the main event.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kozhikode-pidi",
    name: { en: "Kozhikode Pidi", hindi: "कोझिकोड पिडी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Mix the rice flour with a pinch of the salt and enough boiling water to make a soft, smooth dough; cover and rest 10 minutes. Pinch off marble-size pieces and roll into small balls — the pidi.",
      "Grind the coriander seeds, fennel and black pepper to a powder. Cut the chicken into small pieces.",
      "Heat the coconut oil and fry the onion until golden, 8 minutes. Add the ginger, garlic and green chilli; fry 1 minute.",
      "Add the chicken, turmeric and spice powder; toss 3 minutes until the chicken turns opaque. Add 200 ml water and the salt; simmer 8 minutes.",
      "Pour in the coconut milk and bring to a gentle simmer.",
      "Drop the pidi balls in one by one, shaking the pan so they don't stick; simmer 6–8 minutes until they float, turn glossy and thicken the gravy.",
      "Rest 5 minutes, scatter coriander leaves, and serve in bowls — dumplings and chicken in one spiced coconut gravy.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-thakkali-rasam",
    name: { en: "Thakkali Rasam", hindi: "थक्काली रसम" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170931", grams: 4 }, // black pepper
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the tamarind in 200 ml warm water 10 minutes; squeeze and strain. Crush the black pepper, cumin and coriander seeds coarsely.",
      "Crush the tomatoes by hand into a litre of water with the turmeric and half the salt; bring to a boil and simmer 8 minutes until the tomatoes soften and the broth turns orange.",
      "Add the tamarind water and the crushed spice mix; simmer 3 minutes more.",
      "Crush the garlic cloves with their skins on — rasam garlic is crushed, never chopped fine.",
      "Heat the coconut oil in a small pan; crackle the mustard, add the red chillies and crushed garlic, and fry until the garlic is golden and aromatic.",
      "Pour the tempering into the rasam, add the coriander leaves, and cover at once for 3 minutes to trap the aroma.",
      "Serve poured over rice or in a glass as a peppery, sour soup — it should be thin, hot and sharp, never thick.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kurumulaku-rasam",
    name: { en: "Kurumulaku Rasam", hindi: "कुरुमुलाकु रसम" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170457", grams: 250 }, // tomato
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Soak the tamarind in 250 ml warm water 10 minutes; squeeze and strain.",
      "Crush the black pepper and cumin coarsely — the pepper is the lead spice here, so keep it chunky.",
      "Boil the chopped tomato in 800 ml water with the turmeric and half the salt for 8 minutes; crush it into the broth.",
      "Add the tamarind water and the pepper-cumin crush; simmer 3 minutes. The broth should taste sharply sour and pepper-hot.",
      "Heat the coconut oil; crackle the mustard, add the red chillies and the crushed garlic, and fry to golden.",
      "Pour the tempering over, add coriander leaves, cover 3 minutes, and serve over rice or as a warming drink — the pepper should tingle.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ sadhya sides ------------------------------ */
  {
    id: "dish-avial",
    name: { en: "Avial", hindi: "अवियाल" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2710818", grams: 200 }, // plantain (raw banana)
      { foodId: "usda-170483", grams: 150 }, // drumstick pods
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-170069", grams: 150 }, // waxgourd (ash gourd)
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-2259793", grams: 150 }, // yogurt (curd)
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut all the vegetables into even batons about 5 cm long — avial is a dish of batons, not dice. Cut the drumstick into finger lengths.",
      "Cook the vegetables in 200 ml water with the turmeric and salt, adding the firm ones first (plantain, potato, carrot, drumstick) and the softer ones (beans, ash gourd) after 5 minutes; cook 8–10 minutes until just tender, with almost no water left.",
      "Grind the coconut with the cumin and green chillies to a coarse paste — avial's crush stays coarse, never smooth.",
      "Fold the coconut paste through the vegetables and cook 2–3 minutes on low heat until the raw smell leaves; the mixture should be moist, not soupy.",
      "Take off the heat and fold in the whisked curd gently — do not boil after this point.",
      "Drizzle the raw coconut oil over the top, cover, and rest 5 minutes so the oil's aroma settles into the dish.",
      "Serve as the centrepiece of a sadhya, with rice — avial should hold together on the leaf, each vegetable distinct in its coconut coat.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-olan",
    name: { en: "Olan", hindi: "ओलन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170069", grams: 400 }, // waxgourd (ash gourd)
      { foodId: "usda-173758", grams: 100 }, // cowpeas
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the cowpeas for 4 hours, then cook in water until tender, 20 minutes; drain.",
      "Peel the ash gourd, remove the seeds and cut into thin slices.",
      "Cook the gourd in 150 ml water with the slit green chillies, julienned ginger and salt for 6–8 minutes, until translucent and soft.",
      "Add the cooked cowpeas and stir gently.",
      "Pour in the coconut milk and warm at a bare simmer for 3 minutes — olan is never boiled and never spiced beyond this gentleness.",
      "Drizzle the raw coconut oil over, cover, and rest 5 minutes.",
      "Serve with rice as sadhya's quietest dish — pale, milky and soothing between the fiery courses.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kalan",
    name: { en: "Kalan", hindi: "कालन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2710818", grams: 350 }, // plantain (raw banana)
      { foodId: "usda-2259793", grams: 300 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the plantain and cut into thick chunks. Cook in 200 ml water with the turmeric, black pepper and salt for 8–10 minutes, until tender.",
      "Mash a few chunks lightly in the pot to thicken the base — kalan is a thick curry, not a soup.",
      "Grind the coconut with the cumin and green chilli to a smooth paste; stir into the plantain and simmer 3 minutes.",
      "Whisk the curd until smooth. Lower the heat to minimum and stir the curd in gradually.",
      "Cook gently 4–5 minutes, stirring, until the curry thickens and the curd's raw sourness mellows — never let it boil.",
      "Heat the coconut oil; crackle the mustard and fenugreek, add the red chillies, and pour over.",
      "Rest 5 minutes and serve with rice — kalan should coat the spoon, sour and peppery.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kaya-erissery",
    name: { en: "Kaya Erissery", hindi: "काया एरिश्शेरी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2710818", grams: 400 }, // plantain (raw banana)
      { foodId: "usda-173758", grams: 120 }, // cowpeas
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the cowpeas 4 hours; cook in water until tender, 20 minutes, and drain.",
      "Peel the plantain, cut into chunks, and cook in 200 ml water with the turmeric and salt for 8–10 minutes until soft; mash about a third of it in the pot.",
      "Grind two-thirds of the coconut with the cumin, green chilli and garlic to a smooth paste.",
      "Stir the paste and the cowpeas into the plantain; simmer 4 minutes until thick and the raw smell leaves.",
      "Heat the coconut oil, crackle the mustard and red chillies, then add the remaining coconut and fry, stirring, until deep golden-brown and crisp — the erissery's signature garnish.",
      "Scatter the fried coconut over the dish, rest 3 minutes, and serve with rice.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-koottu-curry",
    name: { en: "Koottu Curry", hindi: "कूट्टु करी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 150 }, // chickpeas
      { foodId: "usda-2710818", grams: 250 }, // plantain (raw banana)
      { foodId: "usda-170169", grams: 90 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight; pressure-cook in fresh water for 6 whistles until soft. Drain, keeping a little cooking water.",
      "Peel the plantain, cut into chunks, and cook in 150 ml water with the turmeric and salt for 8 minutes until tender.",
      "Grind two-thirds of the coconut with the cumin and green chilli to a coarse paste.",
      "Combine the chickpeas and plantain in one pot with the paste, black pepper and sugar; simmer 5 minutes, mashing a few pieces to bind it into a thick, scoopable koottu.",
      "Heat the coconut oil, crackle the mustard and red chillies, and fry the remaining coconut until deep golden and crisp.",
      "Scatter the fried coconut over, rest 3 minutes, and serve as a sadhya side — sweet-edged, peppery and thick.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-kaya-thoran",
    name: { en: "Kaya Thoran", hindi: "काया तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2710818", grams: 450 }, // plantain (raw banana)
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the plantain and chop into small even cubes; drop them into water as you cut so they don't darken.",
      "Crush the coconut coarsely with the cumin, green chilli, garlic and turmeric — a thoran's crush is pulsed, never ground smooth.",
      "Heat the coconut oil, crackle the mustard and red chillies, and add the sliced onion; fry 3 minutes until soft.",
      "Add the drained plantain and salt with a splash of water; cover and cook on low heat 8–10 minutes, until tender, stirring once.",
      "Scatter the coconut crush over, fold through, and cook uncovered 3 minutes until dry and fragrant — thoran is always a dry dish.",
      "Serve with rice and a curry — the cubes should hold their shape, coated in spiced coconut.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-carrot-thoran",
    name: { en: "Carrot Thoran", hindi: "कैरट तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2258586", grams: 450 }, // carrot
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the carrots and chop into small even dice — small dice cook fast and stay sweet.",
      "Crush the coconut coarsely with the cumin, green chilli, garlic and turmeric.",
      "Heat the coconut oil, crackle the mustard, and fry the sliced onion 3 minutes until soft.",
      "Add the carrot and salt with 2 tablespoons of water; cover and cook on low heat 7–8 minutes until just tender, still with a little bite.",
      "Fold in the coconut crush and cook uncovered 3 minutes until dry and fragrant.",
      "Serve with rice — bright, sweet and coconut-flecked.",
    ],
    timeMinutes: 22,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-cheera-thoran",
    name: { en: "Cheera Thoran", hindi: "चीरा तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168462", grams: 400 }, // spinach
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-2512381", grams: 10 }, // white rice (for the crunchy tempering)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Wash the spinach well, drain thoroughly and chop finely — wet leaves make a soggy thoran.",
      "Crush the coconut coarsely with the cumin, green chilli, garlic and turmeric.",
      "Heat the coconut oil, crackle the mustard, and add the raw rice grains; fry until they puff and turn white — the old thoran crunch.",
      "Add the onion and fry 2 minutes. Add the spinach and salt and toss on high heat 3–4 minutes until it wilts and its water dries.",
      "Fold in the coconut crush and cook 2 minutes more until dry.",
      "Serve at once with rice — spinach thoran waits for no one.",
    ],
    timeMinutes: 18,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-muringa-ila-thoran",
    name: { en: "Muringa Ila Thoran", hindi: "मुरिंगा इला तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168416", grams: 300 }, // drumstick leaves
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-2512381", grams: 10 }, // white rice (for the crunchy tempering)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Strip the drumstick leaves from their stems, wash and drain well — this takes patience and is most of the work.",
      "Crush the coconut coarsely with the cumin, green chilli, garlic and turmeric.",
      "Heat the coconut oil, crackle the mustard, and fry the raw rice until it puffs white.",
      "Add the onion and fry 2 minutes. Add the leaves and salt and toss on medium heat 4–5 minutes, until the leaves wilt and darken — they cook down to a fraction of their volume.",
      "Fold in the coconut crush and cook 2–3 minutes until dry and fragrant.",
      "Serve with rice and dal — iron-rich leaves, coconut and crunch.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-vendakka-thoran",
    name: { en: "Vendakka Thoran", hindi: "वेंडक्का तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169260", grams: 450 }, // okra
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Wash the okra and dry it completely before slicing into thin rounds — dry okra never turns slimy.",
      "Crush the coconut coarsely with the cumin, green chilli, garlic and turmeric.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes.",
      "Add the okra and salt and fry on medium-high heat, uncovered, for 8–10 minutes, tossing now and then, until the pieces are tender and lightly crisped at the edges with no slime.",
      "Fold in the coconut crush and cook 2–3 minutes until dry.",
      "Serve with rice — crisp-edged okra in spiced coconut.",
    ],
    timeMinutes: 22,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chembu-thoran",
    name: { en: "Chembu Thoran", hindi: "चेम्बु तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169308", grams: 450 }, // taro
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the taro (gloves if your skin is sensitive), cut into small cubes, and boil in water for 8 minutes until just tender; drain well — pre-boiling removes the itch taro can carry.",
      "Crush the coconut coarsely with the cumin, green chilli, garlic and turmeric.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes until soft.",
      "Add the drained taro and salt; toss on medium heat 4–5 minutes until the cubes dry and catch a little colour.",
      "Fold in the coconut crush and cook 3 minutes until dry and fragrant.",
      "Serve with rice and a curry.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-cherupayar-thoran",
    name: { en: "Cherupayar Thoran", hindi: "चेरुपायर तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174256", grams: 200 }, // mung beans (whole moong)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
    ],
    method: [
      "Cook the whole moong in water with the turmeric and half the salt for 18–20 minutes, until soft but whole; drain off any excess water.",
      "Crush the coconut coarsely with the cumin, green chilli and garlic.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes until soft.",
      "Add the cooked moong and toss on medium heat 3 minutes to dry it slightly.",
      "Fold in the coconut crush and the remaining salt; cook 3 minutes until dry and fragrant.",
      "Scatter coriander leaves and serve with rice or kanji — a thoran with real substance.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-vanpayar-thoran",
    name: { en: "Vanpayar Thoran", hindi: "वनपायर तोरन" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-173758", grams: 220 }, // cowpeas
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the cowpeas 4 hours; cook in water with the turmeric and half the salt until tender, about 20 minutes; drain.",
      "Crush the coconut coarsely with the cumin, green chilli and garlic.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes.",
      "Add the cowpeas and toss 3 minutes on medium heat to dry.",
      "Fold in the coconut crush and remaining salt; cook 3 minutes until dry and fragrant.",
      "Serve with rice or kanji.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kappa-puzhukku",
    name: { en: "Kappa Puzhukku", hindi: "कप्पा पुझुक्कु" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169985", grams: 700 }, // cassava
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the cassava thickly, cut into chunks and pull out the woody core. Boil in plenty of water 15 minutes; drain and discard the water — cassava is always boiled and drained first.",
      "Refill with fresh water, add the turmeric and salt, and cook 12–15 minutes until the chunks are completely soft and splitting.",
      "Drain, keeping a little cooking water. Crush the coconut coarsely with the cumin, green chilli and garlic.",
      "Return the cassava to the pot with the coconut crush and mash roughly with a wooden spoon, adding splashes of the hot cooking water until it holds together in a coarse, steaming mash — puzhukku is mashed, never smooth.",
      "Heat the coconut oil in a small pan; crackle the mustard and red chillies and pour over the mash.",
      "Serve hot at once with meen curry poured alongside — the mash should be rough, coconut-flecked and cloud-soft inside.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chembu-puzhukku",
    name: { en: "Chembu Puzhukku", hindi: "चेम्बु पुझुक्कु" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169308", grams: 600 }, // taro
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the taro (gloves if needed) and cut into chunks. Boil in water with the turmeric and salt for 12–15 minutes, until completely soft; drain, keeping a little water.",
      "Crush the coconut coarsely with the cumin, green chilli and garlic.",
      "Mash the taro roughly in the pot with the coconut crush, adding splashes of hot cooking water until it binds into a coarse mash.",
      "Heat the coconut oil, crackle the mustard seeds, and pour the tempering over.",
      "Serve hot with a curry poured alongside — soft, earthy and coconut-rich.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pineapple-pachadi",
    name: { en: "Pineapple Pachadi", hindi: "पाइनएप्पल पच्चड़ी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169124", grams: 350 }, // pineapple
      { foodId: "usda-2259793", grams: 200 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 2 }, // red chilli
      { foodId: "usda-330458", grams: 10 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the pineapple into small pieces, discarding the hard core.",
      "Cook the pineapple in 100 ml water with the turmeric, sugar and salt for 6–8 minutes, until soft and syrupy — the sugar balances the fruit's sharpness.",
      "Grind the coconut with the cumin and green chilli to a smooth paste; stir it in and cook 2 minutes.",
      "Off the heat, fold in the whisked curd gently; warm through without boiling.",
      "Heat the coconut oil, crackle the mustard and red chillies, and pour over.",
      "Serve at room temperature as a sadhya side — sweet, sour and cool against the hot curries.",
    ],
    timeMinutes: 22,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mambazha-pachadi",
    name: { en: "Mambazha Pachadi", hindi: "माम्बझा पच्चड़ी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169910", grams: 350 }, // mango
      { foodId: "usda-2259793", grams: 200 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171319", grams: 1 }, // chilli powder
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 2 }, // red chilli
      { foodId: "usda-330458", grams: 10 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Peel the ripe mangoes and cut the flesh into small chunks.",
      "Cook the mango in 80 ml water with the turmeric, chilli powder and salt for 4–5 minutes, until soft but still in pieces.",
      "Grind the coconut with the cumin and green chilli smooth; stir in and cook 2 minutes.",
      "Off the heat, fold in the whisked curd; do not boil.",
      "Heat the coconut oil, crackle the mustard and red chillies, and pour over.",
      "Serve at room temperature — ripe mango's honeyed sweetness against sour curd and chilli heat.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-vellarikka-pachadi",
    name: { en: "Vellarikka Pachadi", hindi: "वेल्लरिक्का पच्चड़ी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2346406", grams: 350 }, // cucumber
      { foodId: "usda-2259793", grams: 200 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 50 }, // coconut (fresh)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 2 }, // red chilli
      { foodId: "usda-330458", grams: 10 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the cucumber into small cubes, keeping the peel for colour.",
      "Cook the cucumber in 80 ml water with the salt for 4–5 minutes, until just tender and still bright.",
      "Grind the coconut with the cumin and green chilli smooth; stir in and cook 2 minutes.",
      "Off the heat, fold in the whisked curd gently.",
      "Heat the coconut oil, crackle the mustard and red chillies, and pour over.",
      "Serve at room temperature as a cooling sadhya side.",
    ],
    timeMinutes: 18,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-vendakka-kichadi",
    name: { en: "Vendakka Kichadi", hindi: "वेंडक्का किच्चड़ी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169260", grams: 350 }, // okra
      { foodId: "usda-2259793", grams: 250 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 40 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 2 }, // red chilli
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Wash and thoroughly dry the okra; slice into thin rounds.",
      "Heat the coconut oil and fry the okra on medium-high heat for 8–10 minutes, until crisp at the edges and completely free of slime; season with the salt at the end.",
      "Grind the coconut with the green chilli to a smooth paste and whisk it into the curd.",
      "Fold the hot fried okra into the curd mixture — the okra should stay crisp, so kichadi is mixed at serving time, never cooked together.",
      "Crackle the mustard and red chillies in a teaspoon of hot oil and pour over.",
      "Serve at once as a sadhya side — crisp okra folded through cool, spiced curd.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pavakka-kichadi",
    name: { en: "Pavakka Kichadi", hindi: "पावक्का किच्चड़ी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168393", grams: 300 }, // bitter gourd
      { foodId: "usda-2259793", grams: 250 }, // yogurt (curd)
      { foodId: "usda-170169", grams: 40 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 2 }, // red chilli
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Halve the bitter gourds, scrape out the seeds and slice very thinly. Rub with a little of the salt, rest 15 minutes, squeeze and rinse.",
      "Heat the coconut oil and fry the slices for 8–10 minutes until crisp and deep golden — frying is what makes bitter gourd kichadi-friendly.",
      "Grind the coconut with the green chilli smooth and whisk into the curd with the sugar and remaining salt.",
      "Fold the crisp gourd into the curd at serving time so it keeps its crunch.",
      "Crackle the mustard and red chillies in a little hot oil and pour over.",
      "Serve as a sadhya side — bitter, crisp, cool and sour in one spoonful.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mathi-peera",
    name: { en: "Mathi Peera", hindi: "मत्ति पीरा" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175139", grams: 350 }, // sardines (canned, drained)
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Drain the sardines and break them into large flakes, keeping the pieces as whole as you can.",
      "Crush the coconut coarsely with the green chilli, ginger, garlic and turmeric — peera's coconut is a crush, not a paste.",
      "Soak the tamarind in 60 ml warm water 10 minutes; squeeze and strain.",
      "Heat the coconut oil, crackle the mustard, and fry the sliced onion 3 minutes until soft.",
      "Add the coconut crush and tamarind water; cook 3 minutes until the raw smell leaves and the mixture is nearly dry.",
      "Fold in the sardine flakes gently and warm through 2–3 minutes without stirring them to pieces.",
      "Serve with rice or kanji — peera should be moist, flaky and coconut-heavy.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ayala-peera",
    name: { en: "Ayala Peera", hindi: "अयला पीरा" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 450 }, // mackerel
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Poach the mackerel in salted water with the turmeric for 8 minutes, until just cooked. Cool, then flake the flesh off the bones in large pieces, checking carefully for stray bones.",
      "Crush the coconut coarsely with the green chilli, ginger and garlic.",
      "Soak the tamarind in 60 ml warm water 10 minutes; squeeze and strain.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes until soft.",
      "Add the coconut crush and tamarind water; cook 3 minutes until nearly dry and the raw smell leaves.",
      "Fold in the fish flakes and warm 2–3 minutes, keeping the flakes intact.",
      "Serve with rice — a peera is a dry, coconut-bound flake of fish, eaten in small spoonfuls.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-manga-curry",
    name: { en: "Manga Curry", hindi: "मांगा करी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169910", grams: 400 }, // mango
      { foodId: "usda-170169", grams: 70 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 2 }, // chilli powder
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Peel the ripe mangoes and cut the flesh into chunks.",
      "Cook the mango in 120 ml water with the turmeric, chilli powder, sugar and salt for 5 minutes, until soft and the juices run.",
      "Grind the coconut with the cumin, green chilli and ginger smooth; stir into the mango and simmer 3 minutes.",
      "Heat the coconut oil, crackle the mustard, fry the sliced onion until golden, and pour the tempering over.",
      "Rest 5 minutes and serve with rice — a sweet-sour curry that exists only while the mango season lasts.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-muringa-ila-curry",
    name: { en: "Muringa Ila Curry", hindi: "मुरिंगा इला करी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168416", grams: 250 }, // drumstick leaves
      { foodId: "usda-174256", grams: 80 }, // mung beans (moong dal)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Strip the drumstick leaves from their stems, wash and drain. Cook the moong dal in water until soft, 15 minutes.",
      "Grind the coconut with the cumin, green chilli and garlic to a smooth paste.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes.",
      "Add the leaves and toss 3–4 minutes until they wilt and darken.",
      "Add the cooked dal with a little of its water, the turmeric and salt; simmer 3 minutes.",
      "Stir in the coconut paste and simmer 2 minutes until creamy. Serve with rice.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kaya-varuthathu",
    name: { en: "Kaya Varuthathu", hindi: "काया वरुथथु" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2710818", grams: 500 }, // plantain (raw banana)
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the plantain and cut into thick half-moons; drop into water as you cut.",
      "Grind the coriander seeds and black pepper; toss the drained plantain with the chilli powder, turmeric, spice powder, crushed garlic and salt; rest 10 minutes.",
      "Heat the coconut oil and crackle the mustard seeds.",
      "Add the plantain in a single layer and fry on medium heat 10–12 minutes, turning now and then, until the pieces are tender inside with crisp, deep-golden edges.",
      "Drain briefly and serve hot as a side with rice and curry.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-urulakizhangu-mezhukkupuratti",
    name: { en: "Urulakizhangu Mezhukkupuratti", hindi: "उरुलाकिझंगु मेझुक्कुपुरट्टी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the potatoes and cut into small cubes; rinse and drain well.",
      "Heat the coconut oil, crackle the mustard, and add the broken red chillies and crushed garlic; fry 30 seconds.",
      "Add the sliced onion and fry 4 minutes until soft and golden at the edges.",
      "Add the potato, turmeric, black pepper and salt with 2 tablespoons of water; cover and cook on low heat 10 minutes until tender.",
      "Uncover and fry 4–5 minutes more, letting the cubes catch crisp, browned edges in the oil — mezhukkupuratti means 'smeared with oil', and the shine is the point.",
      "Serve with rice and a curry.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-carrot-mezhukkupuratti",
    name: { en: "Carrot Mezhukkupuratti", hindi: "कैरट मेझुक्कुपुरट्टी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2258586", grams: 500 }, // carrot
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 22 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the carrots and cut into short batons.",
      "Heat the coconut oil, crackle the mustard, and add the red chillies and crushed garlic; fry 30 seconds.",
      "Add the onion and fry 3 minutes until soft.",
      "Add the carrot, turmeric and salt with a splash of water; cover and cook 7–8 minutes until just tender.",
      "Uncover and fry 3–4 minutes until the batons gloss with oil and catch colour at the edges.",
      "Serve with rice — sweet carrot, hot chilli, coconut oil shine.",
    ],
    timeMinutes: 22,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kumbalanga-curry",
    name: { en: "Kumbalanga Curry", hindi: "कुम्बलंगा करी" },
    category: "side",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170069", grams: 500 }, // waxgourd (ash gourd)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the ash gourd, discard the seeds and cut into cubes.",
      "Grind the coconut with the coriander seeds, cumin, green chilli and ginger to a smooth paste.",
      "Heat the coconut oil, crackle the mustard, and fry the onion 3 minutes until soft.",
      "Add the gourd, turmeric, salt and 150 ml water; cover and cook 8–10 minutes until the cubes are translucent and tender.",
      "Stir in the coconut paste and simmer 3–4 minutes until the gravy turns creamy and the raw smell leaves.",
      "Serve with rice — a mild, everyday curry.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* --------------------------- chammanthi & achar --------------------------- */
  {
    id: "dish-thenga-chammanthi",
    name: { en: "Thenga Chammanthi", hindi: "थेंगा चम्मंथी" },
    category: "chutney",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170169", grams: 150 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-167763", grams: 12 }, // tamarind
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-170929", grams: 1 }, // mustard seeds
      { foodId: "usda-330458", grams: 8 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Dry-roast the red chillies in a pan for 1 minute until they darken slightly and smell smoky.",
      "Grind the coconut with the chillies, tamarind, ginger, onion and salt to a thick, coarse mass, adding water a spoon at a time — chammanthi is ground almost dry, never pourable like a chutney.",
      "Taste and adjust salt and sourness; the texture should hold together when pressed.",
      "Warm the coconut oil, crackle the mustard seeds, and fold the tempering through.",
      "Serve in small mounds with kanji, rice or dosa — a concentrated spoonful is a serving.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ulli-chammanthi",
    name: { en: "Ulli Chammanthi", hindi: "उल्ली चम्मंथी" },
    category: "chutney",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Slice the onions roughly. Dry-roast the red chillies for 1 minute until fragrant.",
      "Crush or grind the onion with the chillies, tamarind and salt to a coarse, juicy paste — a mortar gives the best texture, with the onion bruised rather than pureed.",
      "Stir in the raw coconut oil — its perfume against the raw onion is the whole dish.",
      "Rest 10 minutes for the flavours to bite into each other.",
      "Serve with dosa, idli or kanji — fiery, pungent and unapologetically raw.",
    ],
    timeMinutes: 12,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chuvanna-thenga-chammanthi",
    name: { en: "Chuvanna Thenga Chammanthi", hindi: "चुवन्ना थेंगा चम्मंथी" },
    category: "chutney",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170169", grams: 120 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-167763", grams: 8 }, // tamarind
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 10 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Dry-roast the red chillies until they darken and turn crisp, 1–2 minutes.",
      "Grind the coconut with the chillies, onion, ginger, tamarind and salt, adding just enough water for a thick, spreadable chutney — redder and wetter than chammanthi, drier than a dosa chutney.",
      "Heat the coconut oil, crackle the mustard seeds, and pour over.",
      "Serve with dosa or idli — the red coconut chutney of Kerala's breakfast tables.",
    ],
    timeMinutes: 12,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pudina-chammanthi",
    name: { en: "Pudina Chammanthi", hindi: "पुदीना चम्मंथी" },
    category: "chutney",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-173475", grams: 40 }, // spearmint (fresh mint)
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-167763", grams: 8 }, // tamarind
      { foodId: "usda-170929", grams: 1 }, // mustard seeds
      { foodId: "usda-330458", grams: 8 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pick the mint leaves off their stems and wash and drain them well.",
      "Grind the coconut with the mint, green chilli, ginger, tamarind and salt to a thick, coarse chammanthi, adding water by the spoon.",
      "Warm the coconut oil, crackle the mustard, and fold through.",
      "Serve with rice, biryani or dosa — green, cool and sharp.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mulaku-chammanthi",
    name: { en: "Mulaku Chammanthi", hindi: "मुलाकु चम्मंथी" },
    category: "chutney",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170106", grams: 30 }, // red chilli
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-167763", grams: 12 }, // tamarind
      { foodId: "usda-334247", grams: 3 }, // sugar
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Dry-roast the red chillies until crisp and dark at the edges, 2 minutes — open a window; this is potent work.",
      "Crush the chillies with the onion, tamarind, sugar and salt to a coarse, fiery paste.",
      "Stir in the coconut oil until the paste glistens.",
      "Rest 10 minutes. Serve in tiny amounts with kappa, kanji or rice — this is the chilli-lover's chammanthi, eaten by the half-teaspoon.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-naranga-achar",
    name: { en: "Naranga Achar", hindi: "नारंगा अचार" },
    category: "chutney",
    servings: 6,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-167746", grams: 400 }, // lemons
      { foodId: "usda-171016", grams: 40 }, // sesame oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-171324", grams: 2 }, // fenugreek seeds
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-173468", grams: 12 }, // salt
    ],
    method: [
      "Steam or boil the whole lemons for 8 minutes until soft; cool, then cut into small pieces, discarding the seeds.",
      "Toss the lemon pieces with the salt and sugar and rest 30 minutes to draw out the juice.",
      "Heat the sesame oil, crackle the mustard and fenugreek, and fry the sliced garlic and ginger until golden.",
      "Lower the heat right down; stir in the chilli powder, cayenne and turmeric for 20 seconds — burnt chilli powder ruins a pickle.",
      "Add the lemon pieces with all their juice; toss and cook 3–4 minutes until everything is coated and glossy.",
      "Cool completely and bottle. Rest at least 2 days before eating — the rind softens and the bitterness mellows into the spice.",
      "Serve a spoonful with rice and curd — Kerala's lemon pickle is hot, salty and intensely lemony.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-inji-achar",
    name: { en: "Inji Achar", hindi: "इंजी अचार" },
    category: "chutney",
    servings: 6,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169231", grams: 250 }, // ginger
      { foodId: "usda-171016", grams: 35 }, // sesame oil
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-173468", grams: 10 }, // salt
    ],
    method: [
      "Peel the ginger and slice it into thin juliennes.",
      "Soak the tamarind in 60 ml warm water 10 minutes; squeeze and strain.",
      "Heat the sesame oil and fry the ginger on medium heat 6–8 minutes, until it shrinks and turns golden and crisp at the edges; lift out.",
      "In the same oil, crackle the mustard and fenugreek and fry the sliced garlic to gold.",
      "Lower the heat; stir in the chilli powder and turmeric for 20 seconds. Add the tamarind juice, sugar and salt and simmer 2 minutes.",
      "Return the fried ginger and toss until every strand is coated and glossy.",
      "Cool and bottle; rest a day before serving with rice — sharp, hot and crunchy.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chammanthi-podi",
    name: { en: "Chammanthi Podi", hindi: "चम्मंथी पोड़ी" },
    category: "chutney",
    servings: 6,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-170169", grams: 150 }, // coconut (fresh)
      { foodId: "usda-174259", grams: 60 }, // mungo beans (urad dal)
      { foodId: "usda-170150", grams: 20 }, // sesame seeds
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-330458", grams: 5 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dry-roast the urad dal in the coconut oil until golden and nutty, 4–5 minutes; set aside.",
      "In the same dry pan, roast the grated coconut, stirring constantly, until deep golden-brown and crisp, 8–10 minutes — patience here is the whole recipe.",
      "Add the sesame seeds, red chillies, garlic and tamarind for the last 2 minutes of roasting.",
      "Cool everything completely — grinding warm makes paste, not podi.",
      "Grind with the salt to a coarse, sandy powder with a few crunchy bits left in.",
      "Store airtight; it keeps for weeks. Serve over hot rice with a little coconut oil or ghee, or as a dosa side — dry, roasted and intensely savoury.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* --------------------------- breakfast & breads --------------------------- */
  {
    id: "dish-appam",
    name: { en: "Appam", hindi: "अप्पम" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-2512381", grams: 40 }, // white rice (for the cooked kurukku)
      { foodId: "usda-170169", grams: 30 }, // coconut (fresh)
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the white rice in water until very soft; grind it with the coconut into a smooth paste — this kurukku feeds the ferment, the traditional way without yeast.",
      "Mix the rice flour with the kurukku, sugar, salt and enough warm water for a thick batter; cover and ferment in a warm place 8 hours or overnight, until risen and faintly sour-smelling.",
      "Stir in the coconut milk to a thin, pourable batter — it should coat the back of a spoon lightly.",
      "Heat an appam chatti (or small deep wok) until hot; pour in a ladle of batter and swirl once so a thin lacy skirt climbs the sides and a spongy pool settles in the centre.",
      "Cover and cook on medium heat 2–3 minutes, until the edges are crisp and golden-laced and the centre is soft, white and just set — appam is never flipped.",
      "Ease out with a spatula and repeat, stirring the batter each time. Serve hot with stew, mutta curry or sweetened coconut milk.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kallappam",
    name: { en: "Kallappam", hindi: "कल्लप्पम" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-2512381", grams: 40 }, // white rice (for the cooked kurukku)
      { foodId: "usda-334247", grams: 12 }, // sugar
      { foodId: "usda-170923", grams: 1 }, // cumin seeds
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the white rice soft and grind with half the coconut to a smooth kurukku paste.",
      "Mix the rice flour, kurukku, sugar, salt and warm water to a thick batter; ferment covered in a warm place 8 hours, until risen and bubbly — kallu (toddy) did this job traditionally; time and the kurukku do it here.",
      "Stir in the remaining grated coconut and the cumin.",
      "Heat a heavy dosa tawa; pour a small ladle of batter into a thick round — kallappam is poured thick and never swirled thin.",
      "Cover and cook on low-medium heat 3–4 minutes until the top sets with bubbles and the base is golden; flip and cook 1 minute more.",
      "Serve hot with stew or egg curry — spongy, coconut-rich and gently fermented.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-idiyappam",
    name: { en: "Idiyappam", hindi: "इडियप्पम" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-330458", grams: 5 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Dry-roast the rice flour in a pan on low heat for 5 minutes, stirring, until it feels light and smells faintly nutty — do not let it colour.",
      "Boil 400 ml water with the salt and coconut oil. Pour it gradually into the flour, mixing with a spoon, until a soft dough forms.",
      "Cover and rest 5 minutes, then knead while warm until smooth and pliable — the dough should not crack when pressed.",
      "Fill an idiyappam press with dough and press fine noodles in circles onto idli plates or a steamer tray, making small nests.",
      "Steam for 7–8 minutes, until the nests are set, glossy and springy.",
      "Serve hot with stew, mutta curry, or sugar and coconut milk — the strands should be soft, separate and cloud-light.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-puttu",
    name: { en: "Puttu", hindi: "पुट्टु" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Put the rice flour and salt in a wide bowl. Sprinkle warm water a little at a time, rubbing with your fingertips, until the flour resembles wet sand and holds together when squeezed but crumbles when poked — this moisture judgement is the whole art of puttu.",
      "Rest the damp flour 10 minutes, then break up any lumps by pulsing briefly or rubbing through your fingers.",
      "Layer the puttu kutti (cylinder) or a coconut shell: a spoon of grated coconut, then flour to a third, coconut again, flour, finishing with coconut. Do not press — loose layers steam through.",
      "Set over boiling water and steam 5–7 minutes, until steam pushes through the top layer strongly and the flour smells cooked.",
      "Push the puttu out gently so it stands in its cylinder shape with coconut layers showing.",
      "Serve hot with kadala curry, cherupayar, banana and sugar, or egg curry.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-gothambu-puttu",
    name: { en: "Gothambu Puttu", hindi: "गोथंबु पुट्टु" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168893", grams: 300 }, // whole wheat flour
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Sprinkle warm salted water into the wheat flour a little at a time, rubbing with your fingertips, until it feels like damp sand and holds when squeezed.",
      "Rest 10 minutes and break up the lumps — wheat flour clumps more than rice, so rub it well.",
      "Layer a puttu cylinder with grated coconut and flour alternately, loosely, finishing with coconut.",
      "Steam over boiling water 7–8 minutes, until steam bursts through the top and the puttu smells nutty and cooked.",
      "Push out gently and serve hot with banana, sugar, cherupayar curry or egg curry — denser and more rustic than rice puttu.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pazham-puttu",
    name: { en: "Pazham Puttu", hindi: "पझम पुट्टु" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 280 }, // rice flour
      { foodId: "usda-173944", grams: 150 }, // banana
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Mash the ripe banana with the sugar until pulpy.",
      "Dampen the rice flour with warm salted water to the wet-sand stage, rubbing out lumps.",
      "Fold the banana pulp through the damp flour until evenly flecked — the flour will turn pale gold.",
      "Layer a puttu cylinder with grated coconut and the banana flour alternately, loosely.",
      "Steam 6–7 minutes, until steam pushes through strongly and the banana perfume fills the kitchen.",
      "Push out and serve hot as it is — a sweet puttu that needs no partner.",
    ],
    timeMinutes: 22,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mutta-appam",
    name: { en: "Mutta Appam", hindi: "मुट्टा अप्पम" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 280 }, // rice flour
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-171287", grams: 220 }, // eggs (4)
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook a small kurukku from 2 tablespoons of the rice flour in water; cool. Mix the remaining flour with the kurukku, sugar, salt and warm water to a thick batter; ferment 8 hours until risen.",
      "Stir in the coconut milk to a thin batter.",
      "Heat an appam chatti; pour in a ladle of batter and swirl to lace the edges, leaving a soft pool in the centre.",
      "Crack an egg into the centre of each appam, cover, and cook 3 minutes on medium heat, until the white is just set and the yolk still trembles.",
      "Season the egg with a pinch of salt and pepper if you like, slide the appam out, and repeat for the rest.",
      "Serve at once — crisp lace, spongy appam and a runny yolk in the middle.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mutta-stew",
    name: { en: "Mutta Stew", hindi: "मुट्टा स्टू" },
    category: "breakfast",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 330 }, // eggs (6)
      { foodId: "usda-170172", grams: 350 }, // coconut milk
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the eggs 10 minutes, cool, peel and halve them.",
      "Heat the coconut oil and bloom the cinnamon and cloves for 30 seconds. Add the onion, ginger and green chilli; fry gently 4 minutes without colouring.",
      "Add the potato and carrot cubes with the salt and 150 ml water; cover and simmer 10 minutes until tender.",
      "Pour in the coconut milk and warm at a bare simmer 3 minutes.",
      "Lay the egg halves in the stew, spoon the gravy over, and warm 2 minutes more — never boil.",
      "Serve with appam or idiyappam — pale, gentle and made for scooping.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pazhankanji",
    name: { en: "Pazhankanji", hindi: "पझंकंजी" },
    category: "breakfast",
    servings: 2,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2512381", grams: 120 }, // white rice
      { foodId: "usda-2259793", grams: 100 }, // yogurt (curd)
      { foodId: "usda-790646", grams: 40 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the rice until soft — softer than for the table. Drain, spread in a wide vessel and pour over enough water to cover by 2 cm.",
      "Cover and leave at room temperature overnight, 8–12 hours, to ferment gently — by morning the water smells faintly tangy. (In a cool kitchen this is the tradition; refrigerate the soaked rice if your kitchen is very warm.)",
      "At serving, stir the rice in its own fermented water, breaking the grains lightly with your hand or a spoon.",
      "Mix in the curd, salt, finely chopped onion, green chilli and ginger.",
      "Serve in a bowl with the kanji water as its broth, with chammanthi or pickle alongside — Kerala's original fermented breakfast: cooling, sour and alive.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pathiri",
    name: { en: "Pathiri", hindi: "पत्तिरी" },
    category: "bread",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-330458", grams: 5 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Dry-roast the rice flour on low heat 5 minutes until light and aromatic; do not colour it.",
      "Boil 350 ml water with the salt and coconut oil. Add the flour all at once and stir vigorously until it gathers into a mass.",
      "Cover and rest 5 minutes, then knead while warm — oiled hands help — for 4–5 minutes until completely smooth and soft, like play dough.",
      "Divide into small balls and roll each into a paper-thin round, dusting with rice flour; trim to a neat circle if you like — pathiri should be thin enough to see light through.",
      "Cook on a hot dry tawa 30–40 seconds a side, until it puffs in places and gets faint golden freckles — no oil on the pan.",
      "Stack in a cloth-lined box to keep soft. Serve with chicken curry or mutta curry — Malabar's rice roti, soft as a handkerchief.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-orotti",
    name: { en: "Orotti", hindi: "ओरोट्टी" },
    category: "bread",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 300 }, // rice flour
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-330458", grams: 10 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Boil 300 ml water with the salt. Stir in the rice flour and grated coconut and mix to a rough mass.",
      "Cover, rest 5 minutes, then knead while warm until smooth and soft.",
      "Divide into balls and pat or roll each into a thick round about 5 mm — orotti is pathiri's sturdier country cousin.",
      "Cook on a hot tawa with a few drops of coconut oil, 1–2 minutes a side, pressing gently, until golden patches appear and the edges set.",
      "Serve hot with curry — thick, coconut-flecked and made for tearing and scooping.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kerala-parotta",
    name: { en: "Kerala Parotta", hindi: "केरल परोट्टा" },
    category: "bread",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // white flour (maida)
      { foodId: "usda-322892", grams: 100 }, // milk (whole)
      { foodId: "usda-171287", grams: 55 }, // egg (1)
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Mix the flour, sugar and salt. Rub in the beaten egg and warm milk and knead 10 minutes into a very soft, elastic dough — parotta dough is kneaded longer than any other in this library.",
      "Coat the dough with a little of the oil, cover, and rest at least 1 hour — the gluten must relax completely or the layers tear.",
      "Divide into balls, oil them, and rest 15 minutes more.",
      "On an oiled surface, stretch each ball by hand — lifting, swinging and slapping it down — until it is a huge, translucent sheet you can almost read through.",
      "Drizzle oil over the sheet, pleat it into a long ribbon, then coil the ribbon into a spiral; rest 10 minutes.",
      "Roll each spiral gently into a round, keeping the coil visible. Cook on a hot tawa with a little oil, 2 minutes a side, until golden and crisp in patches.",
      "While hot, stack two or three parottas and clap them between your hands from the sides to shatter the layers open. Serve at once with kozhi curry or mutta roast.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-poricha-pathiri",
    name: { en: "Poricha Pathiri", hindi: "पोरिचा पत्तिरी" },
    category: "bread",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 280 }, // rice flour
      { foodId: "usda-171287", grams: 55 }, // egg (1)
      { foodId: "usda-170172", grams: 100 }, // coconut milk
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-171323", grams: 1 }, // fennel seeds
      { foodId: "usda-330458", grams: 40 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make a pathiri dough: boil 280 ml salted water, stir in the rice flour, rest and knead warm until smooth.",
      "Roll the dough into thin rounds as for pathiri.",
      "Whisk the egg with the coconut milk, finely chopped onion, crushed fennel and a pinch of salt.",
      "Heat the coconut oil in a wide pan. Dip each pathiri in the egg mixture to coat both sides.",
      "Fry on medium heat 1–2 minutes a side, until golden and puffed with a lacy egg coat.",
      "Drain briefly and serve hot with chicken curry — Malabar's fried, egg-dipped pathiri.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- biryanis -------------------------------- */
  {
    id: "dish-thalassery-chicken-biryani",
    name: { en: "Thalassery Chicken Biryani", hindi: "थलश्शेरी चिकन बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2512381", grams: 400 }, // white rice
      { foodId: "usda-2646171", grams: 500 }, // chicken thigh
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-2259793", grams: 100 }, // yogurt (curd)
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-171323", grams: 3 }, // fennel seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-2515374", grams: 25 }, // cashew nuts
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173475", grams: 8 }, // spearmint (fresh mint)
    ],
    method: [
      "Grind the coriander seeds, fennel, cinnamon, cloves and cardamom to a powder — the biryani masala. Marinate the chicken 30 minutes with the curd, half the masala, the chilli powder, turmeric, lemon juice and half the salt.",
      "Fry the sliced onions in the oil and half the ghee until deep golden and crisp — birista. Drain, keeping the oil. Fry the cashews golden in the same fat.",
      "In a heavy pot, cook the marinated chicken in its marinade for 12–15 minutes, until tender and the gravy thick. Add the tomato and ginger-garlic-green chilli (crushed together) halfway through, and cook until the raw smell leaves.",
      "Meanwhile boil the rice in plenty of salted water with the bay leaf until just 70% cooked — a grain should break with a firm white core. Drain at once.",
      "Layer the rice over the chicken in the pot. Scatter the birista, cashews, coriander and mint leaves and the remaining masala; drizzle the remaining ghee and the onion oil over the top.",
      "Seal the pot with a tight lid (or dough) and dum-cook on the lowest heat 20 minutes; rest 10 minutes off the heat without opening.",
      "Open at the table and fold gently from the sides so the layers marble without breaking the grains. Serve with raita, pickle and pappad if you have them.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ney-choru",
    name: { en: "Ney Choru", hindi: "नेय चोरु" },
    category: "rice",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2512381", grams: 400 }, // white rice
      { foodId: "usda-171314", grams: 40 }, // ghee
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and soak 20 minutes; drain well.",
      "Heat the ghee and oil in a heavy pot. Fry the cashews until golden; lift out. Fry the sliced onion until deep golden and crisp; lift out, keeping the fat in the pot.",
      "In the same fat, bloom the cinnamon, cloves, cardamom and bay leaf for 30 seconds.",
      "Add the drained rice and fry gently for 2 minutes, until every grain glistens and turns translucent at the edges.",
      "Pour in 700 ml boiling water and the salt; stir once, cover, and cook on the lowest heat 12 minutes without opening.",
      "Rest 10 minutes off the heat, then fluff with a fork.",
      "Serve topped with the fried onion and cashews alongside any curry — Malabar's ghee rice, fragrant and separate-grained.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-meen-biryani",
    name: { en: "Meen Biryani", hindi: "मीन बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2512381", grams: 400 }, // white rice
      { foodId: "usda-175119", grams: 500 }, // mackerel
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-2259793", grams: 80 }, // yogurt (curd)
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173475", grams: 8 }, // spearmint (fresh mint)
    ],
    method: [
      "Marinate the mackerel steaks 20 minutes with half the chilli powder, the turmeric, lemon juice and a pinch of salt. Grind the coriander seeds and fennel to a powder.",
      "Fry the marinated fish in the oil for 2 minutes a side until just firm and coloured; set aside gently — it finishes in the dum.",
      "Fry the sliced onions in the same oil with the ghee until deep golden; lift out half as garnish.",
      "In the remaining onion, add the crushed ginger, garlic and green chillies; fry 1 minute. Add the tomato, curd, remaining spices and salt; cook 6 minutes into a thick masala.",
      "Boil the rice in salted water until 70% cooked; drain.",
      "Layer rice over the masala, lay the fish on top, and scatter the fried onion, coriander and mint. Seal and dum-cook on the lowest heat 15 minutes; rest 10 minutes.",
      "Open and serve the fish pieces over the rice, folding the masala through gently — fish biryani breaks if you bully it.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chemmeen-biryani",
    name: { en: "Chemmeen Biryani", hindi: "चेम्मीन बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2512381", grams: 400 }, // white rice
      { foodId: "usda-175179", grams: 450 }, // shrimp (prawns)
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-2259793", grams: 80 }, // yogurt (curd)
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 5 }, // coriander seeds
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173475", grams: 8 }, // spearmint (fresh mint)
    ],
    method: [
      "Peel and devein the prawns; marinate 15 minutes with the lemon juice, turmeric, half the chilli powder and a pinch of salt. Grind the coriander seeds and fennel to a powder.",
      "Fry the sliced onions in the oil and ghee until deep golden; lift out half as garnish.",
      "In the remaining onion, fry the crushed ginger, garlic and green chillies for 1 minute. Add the tomato, curd, remaining spices and salt; cook 5 minutes into a thick masala.",
      "Add the prawns and toss 3 minutes, until they just turn pink — they finish in the dum.",
      "Boil the rice in salted water until 70% cooked; drain and layer over the prawn masala.",
      "Scatter the fried onion, coriander and mint. Seal the pot and dum-cook on the lowest heat 15 minutes; rest 10 minutes.",
      "Open, fold gently, and serve with raita and pickle.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* --------------------------------- snacks --------------------------------- */
  {
    id: "dish-kozhi-cutlet",
    name: { en: "Kozhi Cutlet", hindi: "कोझी कटलेट" },
    category: "snack",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-171287", grams: 55 }, // egg (1, for coating)
      { foodId: "usda-168936", grams: 40 }, // white flour (for coating)
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
      { foodId: "usda-330458", grams: 40 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Boil the chicken with a pinch of salt and turmeric until cooked, 12 minutes; cool and shred or mince finely. Boil the potato and mash it dry.",
      "Heat a spoon of the coconut oil and fry the onion until golden; add the ginger, garlic and green chilli and fry 1 minute.",
      "Add the chicken, ground coriander, black pepper and salt; fry 3 minutes until dry and fragrant. Cool, then mix with the mashed potato and coriander leaves into a firm mixture.",
      "Shape into oval cutlets. Chill 20 minutes if you have time — they fry neater.",
      "Roll each cutlet in flour, dip in the beaten egg, and roll in flour again for a light crust.",
      "Shallow-fry in the remaining coconut oil on medium heat, 3 minutes a side, until deep golden and crisp.",
      "Serve hot with onion salad and ketchup or chutney — the bakery cutlet of every Kerala childhood.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-irachi-pathiri",
    name: { en: "Irachi Pathiri", hindi: "इराची पत्तिरी" },
    category: "snack",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 250 }, // rice flour
      { foodId: "usda-2646170", grams: 250 }, // chicken breast
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171287", grams: 55 }, // egg (1, for coating)
      { foodId: "usda-330458", grams: 45 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the chicken in salted water until tender; shred finely. Grind the coriander seeds, fennel and black pepper.",
      "Fry the onion in a spoon of the coconut oil until golden; add the ginger, garlic and green chilli and fry 1 minute. Add the chicken, spices, turmeric and salt; fry 4 minutes until completely dry — a wet filling bursts the pathiri.",
      "Make pathiri dough: boil 260 ml salted water, stir in the rice flour, rest, and knead warm until smooth. Roll into thin rounds.",
      "Place a spoon of filling on each round, fold into a half-moon and seal the edges firmly, crimping with your fingers.",
      "Dip each filled pathiri in the beaten egg.",
      "Shallow-fry in the remaining coconut oil on medium heat, 2–3 minutes a side, until golden and crisp.",
      "Serve hot — Malabar's chicken-stuffed fried pathiri, a Ramadan-table star.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kozhi-ada",
    name: { en: "Kozhi Ada", hindi: "कोझी अडा" },
    category: "snack",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 280 }, // rice flour
      { foodId: "usda-2646170", grams: 200 }, // chicken breast
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the chicken in salted water; shred finely. Grind the coriander seeds and black pepper.",
      "Fry the onion in the coconut oil until golden; add the ginger, garlic and green chilli, then the chicken, spices, turmeric and salt; fry until dry and fragrant, 4 minutes. Cool the filling.",
      "Boil 300 ml salted water, stir in the rice flour to a mass, rest 5 minutes, and knead warm into a smooth dough.",
      "Pat balls of dough into thin rounds on an oiled surface. Fill one half with the chicken mixture, fold over and seal the edges.",
      "Steam the ada for 12–15 minutes, until the shells are glossy and firm.",
      "Serve hot — the steamed cousin of irachi pathiri, soft where that one is crisp.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ammini-kozhukatta",
    name: { en: "Ammini Kozhukatta", hindi: "अम्मिणी कोझुकट्टा" },
    category: "snack",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 250 }, // rice flour
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-174259", grams: 20 }, // mungo beans (urad dal)
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Boil 300 ml salted water, stir in the rice flour to a mass, rest 5 minutes, and knead warm until smooth.",
      "Pinch the dough into small marble-size balls — ammini means tiny, and these are the miniature savoury kozhukatta.",
      "Steam the balls for 8–10 minutes, until glossy and firm.",
      "Heat the coconut oil; crackle the mustard, add the urad dal and fry until golden, then the red chillies.",
      "Add the steamed balls and the grated coconut; toss on medium heat 3–4 minutes until the balls are coated, glossy and lightly crisped in places.",
      "Scatter coriander leaves and serve warm as a tea-time snack.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------------- drinks --------------------------------- */
  {
    id: "dish-sambaram",
    name: { en: "Sambaram", hindi: "सांबारम" },
    category: "drink",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (curd)
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the curd with 500 ml cold water and the salt until thin and frothy — sambaram is a drink, not a dip.",
      "Crush the green chilli, ginger and onion lightly — bruised, not ground — and stir them in with the coriander leaves.",
      "Rest 10 minutes in the fridge so the aromatics bite into the buttermilk.",
      "Strain if you like it smooth, or serve as it is, ice-cold — Kerala's spiced buttermilk, poured at sadhya's end and on the hottest afternoons.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
];
