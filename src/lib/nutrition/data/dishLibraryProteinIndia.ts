/**
 * The dish library, protein wave PW-3 — high-protein INDIAN and KERALA
 * MAINS, hand-authored on the D1 dish model exactly like the earlier
 * waves: every line names a USDA reference food and a gram amount for
 * the WHOLE recipe, and no nutrient value appears anywhere in this
 * file — a dish's numbers exist only as `dishNutrients` computes them,
 * and its patterns only as `dishPatterns` derives them.
 *
 * The wave's bar (the owner's protein mandate): EVERY dish computes
 * to at least 25 g of protein per serving, pinned dish-by-dish in
 * dishLibraryProteinIndia.test.ts. Vegetarian and eggetarian mains
 * dominate (56 of 75) — paneer, eggs, whole soybeans, tofu, tempeh,
 * dals and chickpeas — because that is where the library's protein
 * was thinnest; the remaining 19 are Kerala and Indian fish, prawn,
 * chicken and lamb classics for other patterns.
 *
 * Authoring notes — what the reference set does and does not hold,
 * and how this wave stays honest about it:
 * - There is NO paneer in the set; as in every earlier wave, the
 *   set's cottage cheese (usda-328841) is the paneer stand-in, at
 *   like weight and behaviour.
 * - There are NO curry leaves and NO kudampuli, so Kerala tempering
 *   never claims them and the fish curries sour with tamarind, as
 *   many Kerala homes do (the Kerala wave's standing handling).
 * - The set's chickpea serves for both brown kadala and kabuli
 *   preparations — USDA does not distinguish them and neither do we.
 * - The set's sardines are canned sardines; they stand as mathi, as
 *   the Kerala wave already used them. Tilapia stands in for the
 *   seer fish of meen mappas and the rui of doi maach, stated here.
 * - The soybean dishes cook WHOLE dry soybeans, soaked and simmered
 *   — the set holds no soya chunks (TVP), and no method below
 *   pretends otherwise.
 * - Mangodi are air-dried moong-dal dumplings (sun or low oven),
 *   toasted — never deep-fried — before the gravy, so the dish
 *   stays inside the owner's no-deep-fried-mains rule.
 * - Dal amti is traditionally kissed with jaggery; the set's amti
 *   omits the sweetener entirely rather than define the dish by it.
 * - Following the library's standing precedent, beef and pork —
 *   present as reference foods — are not used in dishes here.
 * - Water is never a line — it carries no nutrients and is not a
 *   reference food; the methods say where it goes.
 */

import type { Dish } from "../dishes";

export const PROTEIN_INDIA_DISHES: Dish[] = [
  /* ============================ KERALA ============================ */
  /* ------------------------- fish & prawn ------------------------- */
  {
    id: "dish-ayala-varutharacha-curry",
    name: { en: "Ayala Varutharacha Curry", hindi: "अयला वरुथराचा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-170922", grams: 8 }, // coriander seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the mackerel into 8 thick steaks, rub with half the turmeric and a pinch of salt, and rest 15 minutes. Soak the tamarind in 200 ml warm water for 10 minutes; squeeze and strain the juice.",
      "Dry-roast the coconut in a heavy pan on medium heat, stirring constantly, until deep golden-brown and nutty, 6–8 minutes; add the coriander seeds, red chillies and fenugreek for the last minute.",
      "Cool the roast slightly and grind to a smooth, fine paste with a little water — this varutharacha paste is the heart of the curry.",
      "Heat half the coconut oil in a clay pot or heavy pan; fry the onion until soft and golden at the edges, 6 minutes, then add the ginger and garlic for 1 minute.",
      "Add the tomato and cook down to a thick, oily masala, 5 minutes. Stir in the ground paste and fry 2 minutes until fragrant.",
      "Pour in the tamarind water and 300 ml water, add the remaining turmeric and the salt, and bring to a gentle boil.",
      "Slide in the mackerel steaks, cover and simmer on the lowest heat for 10–12 minutes, until the fish is just cooked and flakes at the touch — do not stir, shake the pot instead.",
      "Crackle the mustard seeds in the remaining coconut oil and pour the tempering over. Rest 10 minutes so the gravy settles, then serve with rice.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ayala-mulakittathu",
    name: { en: "Ayala Mulakittathu", hindi: "अयला मुलकिट्टथु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-167763", grams: 25 }, // tamarind
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Cut the mackerel into 8 steaks and rub with the turmeric and a pinch of salt. Soak the tamarind in 250 ml warm water for 10 minutes; squeeze and strain.",
      "Pound or grind the red chillies, ginger and garlic to a coarse paste with a splash of water — mulakittathu means 'chilli-crushed', and the paste should stay rough.",
      "Heat the coconut oil in a clay pot; crackle the mustard seeds, then fry the onion until deep golden, 8 minutes.",
      "Add the chilli paste and fry 2 minutes until the raw heat mellows, then add the tomato and cook to a thick, dark-red masala, 6 minutes.",
      "Pour in the tamarind water and 200 ml water, add the salt, and boil gently for 5 minutes so the gravy turns sharp and glossy.",
      "Lay in the mackerel steaks in one layer, spoon the gravy over, cover and simmer 10 minutes on low heat without stirring.",
      "Rest off the heat for 10 minutes — the fish drinks in the chilli gravy as it sits. Scatter the coriander leaves and serve with rice or kappa.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-meen-mappas",
    name: { en: "Meen Mappas", hindi: "मीन मप्पास" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2684442", grams: 560 }, // tilapia (stands in for seer fish)
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Cut the tilapia into 8 chunky pieces and rub with a pinch of salt and half the crushed black pepper. Soak the tamarind in 100 ml warm water; squeeze and strain.",
      "Crush the fennel seeds and the remaining pepper coarsely. Slice the onion thin, slit the green chillies, and julienne the ginger.",
      "Heat the coconut oil in a wide pan; fry the onion until soft and pale gold, 6 minutes, then add the ginger, garlic and green chillies for 1 minute.",
      "Add the tomato and cook to a soft, sweet masala, 5 minutes. Stir in the crushed fennel and pepper.",
      "Pour in the coconut milk and the tamarind water, add the salt, and bring to the gentlest simmer — never a hard boil, or the coconut milk splits.",
      "Slide in the fish, cover and poach 8–10 minutes, until the flesh is opaque and just flakes. Shake the pan rather than stirring.",
      "Rest 5 minutes, scatter the coriander leaves, and serve with appam or rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-muringakka-meen-curry",
    name: { en: "Muringakka Meen Curry", hindi: "मुरिंगक्का मीन करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-170483", grams: 200 }, // drumstick pods
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the mackerel into 8 steaks and rub with the turmeric and a pinch of salt. Cut the drumsticks into finger lengths and scrape the skin lightly. Soak the tamarind in 200 ml warm water; squeeze and strain.",
      "Grind the coconut with the red chillies and a little water to a smooth, thick paste.",
      "Heat the coconut oil in a clay pot; crackle the mustard seeds and fry the onion until golden, 6 minutes. Add the ginger and garlic for 1 minute.",
      "Add the tomato and cook down 4 minutes, then stir in the coconut paste and fry 2 minutes until it smells roasted.",
      "Pour in the tamarind water and 250 ml water, add the salt, and simmer the drumstick pieces for 8 minutes, until half-tender.",
      "Lay in the mackerel, cover and simmer 10 minutes on the lowest heat, until the fish flakes and the drumstick flesh yields to a squeeze.",
      "Rest 10 minutes off the heat and serve over rice, eating the drumstick by pulling the flesh from the fibre.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mathi-pepper-fry",
    name: { en: "Mathi Pepper Fry", hindi: "मथी पेपर फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175139", grams: 440 }, // sardines (canned, drained)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-167746", grams: 20 }, // lemon
    ],
    method: [
      "Drain the sardines well and pat them dry on a cloth — dry fish fries crisp instead of steaming. Crush the black pepper coarsely.",
      "Rub the sardines gently with the turmeric, half the pepper and a pinch of salt; rest 10 minutes.",
      "Heat the coconut oil in a wide iron pan until shimmering; crackle the mustard seeds, then fry the onion until deep golden and crisp at the edges, 8 minutes. Lift out half the onion.",
      "Add the ginger, garlic and green chillies to the pan for 1 minute, then lay the sardines in a single layer.",
      "Fry undisturbed for 3 minutes until the underside crisps, then turn once with a thin spatula and fry 2 minutes more — sardines are delicate, so move them as little as possible.",
      "Scatter the remaining pepper and the reserved crisp onion over the fish, squeeze the lemon across the pan, and rest 2 minutes.",
      "Serve straight from the pan with rice and a mild curry to cool the pepper heat.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-choora-curry",
    name: { en: "Choora Curry", hindi: "चूरा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-334194", grams: 560 }, // tuna (canned in water, drained)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Drain the tuna and break it into large chunks — small flakes disappear into the gravy. Soak the tamarind in 150 ml warm water; squeeze and strain.",
      "Grind the coconut with the red chillies and turmeric to a smooth paste with a little water.",
      "Heat the coconut oil in a clay pot; crackle the mustard seeds and fenugreek, then fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a thick masala, 5 minutes.",
      "Stir in the coconut paste and fry 2 minutes. Pour in the tamarind water and 200 ml water, add the salt, and simmer 5 minutes.",
      "Fold in the tuna chunks gently and simmer 5 minutes more, just to heat the fish through and marry it with the gravy — canned tuna is already cooked.",
      "Rest 5 minutes and serve with rice; the curry thickens slightly as it sits.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chemmeen-thoran",
    name: { en: "Chemmeen Thoran", hindi: "चेम्मीन थोरन" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 520 }, // shrimp (prawns)
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Peel and devein the prawns, rinse, and rub with the turmeric, the black pepper and a pinch of salt. Rest 10 minutes.",
      "Crush the coconut coarsely with the green chillies and garlic — a thoran's coconut stays rough, never a paste.",
      "Heat the coconut oil in a wide pan; crackle the mustard seeds and fry the onion until soft and sweet, 5 minutes. Add the ginger for 1 minute.",
      "Add the prawns in one layer and sear on high heat for 2 minutes, until they curl and turn pink at the edges.",
      "Scatter the crushed coconut over the prawns, add the salt, cover and cook on low heat for 3–4 minutes in the prawns' own steam — no water added.",
      "Uncover and toss for 1 minute so the coconut toasts lightly in the pan juices. Prawns are done when firm and C-shaped; an O means overcooked.",
      "Serve at once with rice, while the coconut is still fragrant.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chemmeen-mulakittathu",
    name: { en: "Chemmeen Mulakittathu", hindi: "चेम्मीन मुलकिट्टथु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 520 }, // shrimp (prawns)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Peel and devein the prawns and rub with the turmeric and a pinch of salt. Soak the tamarind in 200 ml warm water; squeeze and strain.",
      "Grind the red chillies, ginger and garlic to a coarse paste — mulakittathu is a crushed-chilli gravy, kept rough.",
      "Heat the coconut oil in a clay pot; crackle the mustard seeds and fry the onion until deep golden, 8 minutes.",
      "Add the chilli paste and fry 2 minutes, then the tomato, and cook to a dark, glossy masala, 6 minutes.",
      "Pour in the tamarind water, add the salt, and simmer 5 minutes until the gravy is sharp and thick enough to coat a spoon.",
      "Add the prawns and cook 3–4 minutes, stirring once, until they curl pink and are just opaque — they finish in the gravy's heat.",
      "Rest 5 minutes off the heat and serve with rice; the gravy should be fiery, so warn the table.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* --------------------- chicken & lamb --------------------- */
  {
    id: "dish-kozhi-mappas",
    name: { en: "Kozhi Mappas", hindi: "कोझी मप्पास" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646170", grams: 520 }, // chicken breast
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into large curry pieces and rub with a pinch of salt and half the crushed black pepper. Crush the fennel, cinnamon and cardamom coarsely.",
      "Heat the coconut oil in a heavy pan; fry the onion until soft and pale gold, 7 minutes. Add the ginger, garlic and green chillies for 1 minute.",
      "Add the crushed whole spices and the tomato; cook to a soft, sweet masala, 5 minutes.",
      "Add the chicken and sear on high heat for 4 minutes, turning until the pieces whiten and firm at the edges.",
      "Pour in the coconut milk and 100 ml water, add the salt, and bring to the gentlest simmer — do not boil hard, or the milk splits.",
      "Cover and cook 15–18 minutes, until the chicken is tender and the gravy coats the pieces in a pale, fragrant sauce.",
      "Rest 5 minutes, scatter the coriander leaves, and serve with appam or rice.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kozhi-thoran",
    name: { en: "Kozhi Thoran", hindi: "कोझी थोरन" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170931", grams: 4 }, // black pepper
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the chicken thighs into small bite-size pieces — a thoran cooks dry and quick, so small pieces matter. Rub with the turmeric, half the pepper and a pinch of salt.",
      "Crush the coconut coarsely with the green chillies and garlic; keep it rough.",
      "Heat the coconut oil in a wide pan; crackle the mustard seeds and fry the onion until golden at the edges, 7 minutes. Add the ginger for 1 minute.",
      "Add the chicken and stir-fry on high heat for 6–8 minutes, until the pieces firm, colour lightly and give up their juices.",
      "Lower the heat, add the salt, cover and cook 8 minutes in the chicken's own juices until tender.",
      "Scatter the crushed coconut and remaining pepper over, toss for 2 minutes until the coconut toasts and the pan is dry and fragrant.",
      "Serve hot with rice — a thoran should be moist, never wet.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kozhi-pepper-fry",
    name: { en: "Kozhi Pepper Fry", hindi: "कोझी पेपर फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2646170", grams: 520 }, // chicken breast
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-170931", grams: 8 }, // black pepper
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into medium curry pieces. Crush the black pepper coarsely — half fine, half cracked — and rub the chicken with half of it, the salt and a squeeze of the tomato's juice if handy. Rest 15 minutes.",
      "Heat the coconut oil in a heavy pan; crackle the mustard seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger, garlic and green chillies; fry 1 minute until fragrant.",
      "Add the tomato and cook down to a dark, jammy masala, 5 minutes.",
      "Add the chicken and stir-fry on high heat for 5 minutes until the pieces sear and firm.",
      "Lower the heat, cover and cook 10 minutes in the masala's juices until tender; then uncover and roast 3 minutes, tossing, until the masala clings dry and glossy.",
      "Finish with the remaining cracked pepper and the coriander leaves. Serve with rice or porotta.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-erachi-varattiyathu",
    name: { en: "Erachi Varattiyathu", hindi: "एराची वरट्टियथु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // lamb (ground)
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-171323", grams: 3 }, // fennel seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Crumble the minced lamb and mix with the turmeric, half the crushed pepper and a pinch of salt. Crush the fennel seeds coarsely.",
      "Pressure-cook the lamb with 150 ml water for 3 whistles (or simmer 35 minutes), until tender; reserve the stock. The mince should stay in soft crumbles, not a solid mass.",
      "Heat the coconut oil in a wide iron pan; crackle the mustard seeds and fry the onion until deep golden-brown, 10 minutes — varattiyathu lives on well-browned onion.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a dark masala, 6 minutes.",
      "Add the red chillies and fennel; stir in the cooked lamb with a ladle of its stock.",
      "Roast on medium heat for 12–15 minutes, stirring and scraping, until the stock dries, the fat glistens and the mince crisps at the edges — varattiyathu means roasted dry.",
      "Finish with the remaining pepper and the coriander leaves. Serve with rice or porotta.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-erachi-ishtu",
    name: { en: "Erachi Ishtu", hindi: "एराची इष्टु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // lamb (ground)
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Form the minced lamb into rough, loose crumbles — an ishtu is gentle, so the meat should stay soft, not browned hard. Cut the potato and carrot into chunks.",
      "Pressure-cook the lamb with the potato, carrot, half the salt and 300 ml water for 3 whistles, until everything is tender.",
      "Heat the coconut oil in a wide pan; add the cinnamon and cardamom, then fry the onion until soft and translucent — an ishtu's onion never browns.",
      "Add the ginger, garlic and green chillies for 1 minute, keeping the masala pale.",
      "Tip in the cooked lamb and vegetables with their stock; simmer 5 minutes so the flavours settle.",
      "Pour in the coconut milk, add the remaining salt and the crushed pepper, and warm through at the gentlest simmer for 3 minutes — never boil, or the milk splits.",
      "Rest 5 minutes and serve with appam, the pale gravy pooling around the meat and vegetables.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-kappa-erachi",
    name: { en: "Kappa Erachi", hindi: "कप्पा एराची" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // lamb (ground)
      { foodId: "usda-169985", grams: 600 }, // cassava (kappa/tapioca)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170106", grams: 5 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Peel the cassava, cut into chunks and boil in plenty of water for 15 minutes; drain and discard the water (this is the traditional safety boil), then boil again in fresh salted water until completely soft, 15 minutes. Drain and keep hot.",
      "Meanwhile pressure-cook the lamb with the turmeric, half the salt and 200 ml water for 3 whistles, until tender; reserve the stock.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until golden, 7 minutes. Add the ginger and garlic for 1 minute.",
      "Add the red chillies and the cooked lamb with its stock; simmer 8 minutes until the gravy thickens around the meat.",
      "Add the hot cassava and mash roughly with a wooden spoon, folding the meat through — kappa erachi is a coarse mash, not a puree.",
      "Stir in the coconut and crushed pepper, adjust the salt, and cook 3 minutes more until steaming and unified.",
      "Serve in mounds, with a spoon of the pan juices over each — no rice needed; the kappa is the meal's base.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  /* ----------------- chickpea, soya, moong & egg ----------------- */
  {
    id: "dish-kadala-varutharacha-curry",
    name: { en: "Kadala Varutharacha Curry", hindi: "कडाला वरुथराचा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // chickpeas (kadala)
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170922", grams: 8 }, // coriander seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight in plenty of water. Drain, rinse, and pressure-cook with fresh water and half the salt for 5 whistles, until a chickpea mashes easily between finger and thumb. Reserve the cooking liquor.",
      "Dry-roast the coconut in a heavy pan, stirring constantly, until deep golden-brown, 6–8 minutes; add the coriander seeds and red chillies for the last minute.",
      "Cool slightly and grind the roast to a smooth, fine paste with a little of the chickpea liquor.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until golden, 7 minutes. Add the ginger and garlic for 1 minute.",
      "Add the tomato and turmeric and cook to a thick masala, 5 minutes.",
      "Stir in the ground paste and fry 2 minutes, then add the chickpeas with enough liquor for a flowing gravy.",
      "Simmer 10 minutes so the chickpeas drink the roasted-coconut gravy; the curry should coat the back of a spoon.",
      "Rest 10 minutes and serve with puttu, appam or rice.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-vella-kadala-curry",
    name: { en: "Vella Kadala Curry", hindi: "वेल्ला कडाला करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // chickpeas (white kadala)
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
    ],
    method: [
      "Soak the chickpeas overnight. Drain and pressure-cook with fresh water and half the salt for 5 whistles, until completely soft. Reserve the liquor.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until soft and sweet, 6 minutes — this curry's base stays pale.",
      "Add the ginger, garlic and green chillies; fry 1 minute.",
      "Add the chickpeas with 300 ml of their liquor and simmer 8 minutes, lightly crushing a ladleful of chickpeas against the side to thicken the gravy.",
      "Pour in the coconut milk and the remaining salt; warm through at the gentlest simmer for 3 minutes — never boil, or the milk splits.",
      "Rest 5 minutes, scatter the coriander leaves, and serve with puttu or appam.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-kadala-thoran",
    name: { en: "Kadala Thoran", hindi: "कडाला थोरन" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // chickpeas (kadala)
      { foodId: "usda-170169", grams: 100 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-1104647", grams: 6 }, // garlic
    ],
    method: [
      "Soak the chickpeas overnight. Drain and pressure-cook with the turmeric, half the salt and just enough water to cover, for 4 whistles — the chickpeas should be soft but whole, never mushy. Drain off any excess water.",
      "Crush the coconut coarsely with the garlic and red chillies; a thoran's coconut is rough, not a paste.",
      "Heat the coconut oil in a wide pan; crackle the mustard seeds and fry the onion until soft and golden at the edges, 6 minutes.",
      "Add the cooked chickpeas and toss on medium heat for 3 minutes so they dry and warm through.",
      "Scatter the crushed coconut and the remaining salt over, cover and steam on low heat for 3 minutes.",
      "Uncover and toss for 1 minute until the coconut is fragrant and the pan is dry. Serve with rice as the protein heart of the meal.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-soya-varutharacha-curry",
    name: { en: "Soya Varutharacha Curry", hindi: "सोया वरुथराचा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174270", grams: 360 }, // soybeans (whole, dry)
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170922", grams: 8 }, // coriander seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the whole soybeans overnight — they swell hard, so use a big bowl. Drain, rinse, and pressure-cook with fresh water and half the salt for 6 whistles, until a bean mashes creamy between finger and thumb. Reserve the liquor.",
      "Dry-roast the coconut in a heavy pan, stirring constantly, until deep golden-brown, 6–8 minutes; add the coriander seeds and red chillies for the last minute.",
      "Cool slightly and grind the roast to a smooth paste with a little bean liquor.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until golden, 7 minutes. Add the ginger and garlic for 1 minute.",
      "Add the tomato and turmeric and cook to a thick masala, 5 minutes.",
      "Stir in the ground paste and fry 2 minutes, then add the soybeans with enough liquor for a flowing gravy.",
      "Simmer 10 minutes so the beans take on the roasted-coconut gravy. Rest 10 minutes and serve with rice.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-soya-pepper-fry-kerala",
    name: { en: "Soya Pepper Fry (Kerala)", hindi: "सोया पेपर फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174270", grams: 360 }, // soybeans (whole, dry)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water and half the salt for 6 whistles, until creamy-soft. Drain well — a dry bean fries, a wet one steams.",
      "Crush the black pepper coarsely. Heat the coconut oil in a wide iron pan; crackle the mustard seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger, garlic and green chillies; fry 1 minute.",
      "Add the tomato and cook to a dark, jammy masala, 5 minutes.",
      "Add the drained soybeans and the remaining salt; stir-fry on high heat for 5 minutes so the beans catch at the edges.",
      "Lower the heat and roast 5 minutes more, tossing, until the masala clings dry and the beans are glossy.",
      "Finish with the crushed pepper and coriander leaves. Serve with rice or porotta.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-soya-thenga-pal-curry",
    name: { en: "Soya Thenga Pal Curry", hindi: "सोया थेंगा पाल करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174270", grams: 360 }, // soybeans (whole, dry)
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water, the turmeric and half the salt for 6 whistles, until creamy-soft. Reserve 200 ml of the liquor.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until soft and sweet, 6 minutes.",
      "Add the ginger, garlic and green chillies; fry 1 minute. Add the tomato and cook to a soft masala, 5 minutes.",
      "Add the soybeans with the reserved liquor and simmer 8 minutes so the beans season through.",
      "Pour in the coconut milk and the remaining salt; warm at the gentlest simmer for 3 minutes — never boil, or the milk splits.",
      "Rest 5 minutes and serve with rice or appam, the gravy pale and mild around the beans.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-cherupayar-puzhukku",
    name: { en: "Cherupayar Puzhukku", hindi: "चेरुपायर पुझुक्कु" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174256", grams: 440 }, // mung beans (whole moong)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-172231", grams: 1 }, // turmeric
    ],
    method: [
      "Rinse the whole moong and soak for 4 hours (or overnight). Drain and pressure-cook with fresh water, the turmeric and half the salt for 3 whistles, until the beans are soft enough to mash.",
      "Crush the coconut coarsely with the green chillies, ginger and garlic.",
      "Open the cooker and mash roughly a third of the beans with the back of a ladle — a puzhukku is a coarse mash that still shows whole beans.",
      "Simmer uncovered for 5 minutes, stirring, until the mash thickens and pulls from the sides of the pot.",
      "Fold in the crushed coconut mixture and the remaining salt; cook 2 minutes.",
      "Crackle the mustard seeds in the coconut oil and pour the tempering over the top.",
      "Serve in mounds with rice or kanji — the puzhukku is the meal's protein base, eaten thick, not poured.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-mutta-thoran",
    name: { en: "Mutta Thoran", hindi: "मुट्टा थोरन" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg (about 16 large eggs)
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Beat the eggs with the turmeric, black pepper and salt until uniform. Crush the coconut coarsely with the green chillies and ginger.",
      "Heat the coconut oil in a wide pan; crackle the mustard seeds and fry the onion until soft and golden at the edges, 6 minutes.",
      "Pour in the beaten eggs and let them set for 30 seconds, then stir slowly with a spatula, lifting large soft curds — a thoran's eggs stay in moist folds, not fine crumbs.",
      "When the eggs are half-set, scatter the crushed coconut over and fold it through.",
      "Cook 2–3 minutes more, stirring gently, until the curds are just set and glossy — take the pan off early; the eggs finish in their own heat.",
      "Rest 2 minutes and serve at once with rice. Dry, rubbery eggs mean the pan was too hot or the rest too long.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mutta-varutharacha-curry",
    name: { en: "Mutta Varutharacha Curry", hindi: "मुट्टा वरुथराचा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg (about 16 large eggs)
      { foodId: "usda-170169", grams: 80 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170922", grams: 8 }, // coriander seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool in water, peel and halve them lengthways. Rub the cut sides with a pinch of turmeric and salt.",
      "Dry-roast the coconut in a heavy pan, stirring constantly, until deep golden-brown, 6–8 minutes; add the coriander seeds and red chillies for the last minute.",
      "Cool slightly and grind the roast to a smooth paste with a little water.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until golden, 7 minutes. Add the ginger and garlic for 1 minute.",
      "Add the tomato and cook to a thick masala, 5 minutes. Stir in the ground paste and fry 2 minutes.",
      "Pour in 300 ml water and the salt; simmer 5 minutes into a flowing roasted-coconut gravy.",
      "Lower the egg halves in, cut side up, spoon the gravy over, cover and simmer 5 minutes so the eggs take the gravy's colour.",
      "Rest 5 minutes and serve with rice or appam.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mutta-mappas",
    name: { en: "Mutta Mappas", hindi: "मुट्टा मप्पास" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg (about 16 large eggs)
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and halve lengthways. Crush the fennel and black pepper coarsely.",
      "Heat the coconut oil in a wide pan; add the cinnamon, then fry the onion until soft and pale gold, 7 minutes — a mappas stays mild and light-coloured.",
      "Add the ginger, garlic and green chillies for 1 minute, then the tomato, and cook to a soft masala, 5 minutes.",
      "Stir in the crushed fennel and pepper.",
      "Pour in the coconut milk and 100 ml water, add the salt, and bring to the gentlest simmer — never boil hard, or the milk splits.",
      "Lay the egg halves in, cut side up, spoon the sauce over, cover and poach 5 minutes until the eggs are heated through and the sauce coats them.",
      "Rest 5 minutes, scatter the coriander leaves, and serve with appam.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kadala-mutta-curry",
    name: { en: "Kadala Mutta Curry", hindi: "कडाला मुट्टा करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2644282", grams: 400 }, // chickpeas (kadala)
      { foodId: "usda-171287", grams: 400 }, // egg (about 8 large eggs)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170169", grams: 40 }, // coconut (fresh)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight. Drain and pressure-cook with fresh water and half the salt for 5 whistles, until soft. Reserve the liquor. Boil the eggs for 9 minutes, cool, peel and halve.",
      "Grind the coconut with the coriander seeds and red chillies to a smooth paste with a little water.",
      "Heat the coconut oil in a heavy pot; crackle the mustard seeds and fry the onion until golden, 7 minutes. Add the ginger and garlic for 1 minute.",
      "Add the tomato and turmeric; cook to a thick masala, 5 minutes.",
      "Stir in the coconut paste and fry 2 minutes, then add the chickpeas with enough liquor for a flowing gravy.",
      "Simmer 8 minutes, then lay the egg halves on top, spoon gravy over, cover and simmer 4 minutes more.",
      "Rest 10 minutes and serve with puttu or appam — the classic kadala-and-egg breakfast plate, at main-meal size.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  /* ============================= INDIA ============================ */
  /* ---------------------------- paneer ---------------------------- */
  {
    id: "dish-paneer-korma",
    name: { en: "Paneer Korma", hindi: "पनीर कोरमा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 800 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-330137", grams: 240 }, // Greek yogurt
      { foodId: "usda-2515374", grams: 40 }, // cashew nuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-322892", grams: 100 }, // milk
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the paneer into large cubes. Soak the cashews in warm water for 20 minutes, then grind to a smooth cream with a little of the soaking water.",
      "Fry the onion in the ghee until deep golden, 8 minutes; lift out and grind to a smooth paste with the ginger and garlic.",
      "Return the paste to the pan with the cardamom, cinnamon and black pepper; fry 2 minutes until fragrant.",
      "Take the pan off the heat, whisk in the yogurt a spoon at a time so it does not split, then return to low heat and cook 4 minutes, stirring, until the fat glistens.",
      "Stir in the cashew cream and the milk; simmer 3 minutes into a pale, rich korma gravy. Add the salt.",
      "Sear the paneer cubes in a dry non-stick pan for 1 minute a side until golden at the edges, then slide them into the gravy.",
      "Simmer 3 minutes — no longer, or the paneer toughens. Rest 5 minutes and serve with rice or naan.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-paneer-jalfrezi",
    name: { en: "Paneer Jalfrezi", hindi: "पनीर जलफ्रेज़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 920 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-170427", grams: 150 }, // capsicum (green pepper)
      { foodId: "usda-170108", grams: 100 }, // capsicum (red pepper)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the paneer into thick fingers. Slice the green and red capsicum and half the onion into petals; chop the rest of the onion fine. Crush the coriander seeds coarsely.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side until golden; set aside.",
      "Heat the sunflower oil in a wide pan; crackle the cumin seeds, then fry the finely chopped onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and crushed coriander; cook to a thick, glossy masala, 6 minutes.",
      "Add the capsicum and onion petals with the red chilli; stir-fry on high heat for 3 minutes — a jalfrezi's vegetables stay crisp and bright.",
      "Fold in the paneer and the salt, toss for 2 minutes until every piece is coated and heated through, adding a splash of water only if the pan dries.",
      "Serve at once with rice or rotis, the peppers still bright and crisp.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-paneer-tikka",
    name: { en: "Paneer Tikka", hindi: "पनीर टिक्का" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 920 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt
      { foodId: "usda-170427", grams: 120 }, // capsicum (green pepper)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-172337", grams: 15 }, // mustard oil
      { foodId: "usda-170932", grams: 4 }, // cayenne pepper
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-167746", grams: 15 }, // lemon
    ],
    method: [
      "Cut the paneer into large 4 cm cubes. Cut the capsicum and onion into petals the same size.",
      "Whisk the Greek yogurt with the mustard oil, ginger, garlic, cayenne, turmeric, ground cumin and coriander seeds, lemon juice and salt into a thick marinade — Greek yogurt clings where thin yogurt slides off.",
      "Coat the paneer, capsicum and onion in the marinade and rest at least 30 minutes (up to 4 hours in the fridge).",
      "Thread onto skewers, alternating paneer and vegetables, or spread in a single layer on a lined tray.",
      "Grill under a hot grill (or roast at 230°C) for 10–12 minutes, turning once, until the edges char in spots and the marinade sets — the char is the tikka's signature.",
      "Rest 3 minutes and squeeze lemon over.",
      "Serve as a main with rice and a dal alongside, or with rotis and a salad — at this size it is a full meal, not a starter.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven", "fridge"],
  },
  {
    id: "dish-paneer-chaman",
    name: { en: "Paneer Chaman (Kashmiri)", hindi: "पनीर चमन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 800 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-322892", grams: 200 }, // milk
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt
      { foodId: "usda-171323", grams: 4 }, // fennel seeds
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the paneer into thick slices. Grind the fennel seeds to a powder — fennel and cardamom, not garam masala, define a Kashmiri chaman.",
      "Shallow-fry the paneer in the ghee for 1–2 minutes a side until golden; lift out and soak the fried slices in warm salted water — the Kashmiri trick that keeps fried paneer soft.",
      "In the same ghee, add the cinnamon, cloves and cardamom and let them bloom for 30 seconds.",
      "Add the ginger, turmeric and fennel powder; fry 1 minute.",
      "Whisk the yogurt smooth and stir in the milk, yogurt and salt; simmer gently for 5 minutes into a fragrant, pale gravy — keep the heat low so the yogurt does not split.",
      "Drain the paneer, slide it in, and simmer 4 minutes so the slices drink the gravy.",
      "Rest 5 minutes and serve with rice — the gravy should stay light and aromatic, never heavy.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-paneer-chettinad",
    name: { en: "Paneer Chettinad", hindi: "पनीर चेट्टिनाड" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 920 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-170169", grams: 60 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-170931", grams: 5 }, // black pepper
      { foodId: "usda-171323", grams: 3 }, // fennel seeds
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Dry-roast the coriander seeds, black pepper, fennel, red chillies, cinnamon, turmeric and coconut until fragrant and golden, 3 minutes. Grind to a coarse Chettinad powder.",
      "Cut the paneer into cubes and sear in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the sesame oil in a heavy pan and fry the onion until deep golden, 8 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a dark, thick masala, 6 minutes.",
      "Stir in the Chettinad powder and fry 1 minute — the gravy turns nearly black and intensely aromatic.",
      "Pour in 250 ml water and the salt; simmer 5 minutes.",
      "Add the paneer and simmer 3 minutes, just to coat and heat through. Rest 5 minutes and serve with rice — warn the table: Chettinad heat is pepper heat, and it builds.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-paneer-kadhi",
    name: { en: "Paneer Kadhi", hindi: "पनीर कढ़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 240 }, // chickpea flour (besan)
      { foodId: "usda-328841", grams: 600 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-330137", grams: 300 }, // Greek yogurt
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the besan (chickpea flour) with the yogurt, turmeric, salt and 700 ml water until completely smooth — any lump now stays a lump forever.",
      "Cut the paneer into cubes and sear in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the ghee in a deep pot; crackle the mustard, cumin and fenugreek seeds, then fry the onion until soft and golden, 5 minutes. Add the ginger and green chillies for 1 minute.",
      "Pour in the yogurt mixture, stirring constantly in one direction, and bring slowly to a boil — a kadhi that is not stirred as it heats can split.",
      "Lower the heat and simmer 20 minutes, stirring now and then, until the kadhi loses its raw flour taste and turns silky and lightly thick.",
      "Add the paneer and simmer 4 minutes, until the cubes are heated through and the kadhi coats them.",
      "Serve over rice, poured generously — kadhi is a soup-curry, eaten wet.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-paneer-makai-masala",
    name: { en: "Paneer Makai Masala", hindi: "पनीर मकाई मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 800 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-2710826", grams: 400 }, // sweetcorn
      { foodId: "usda-170419", grams: 100 }, // peas (green)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the paneer into cubes. Grind a third of the sweetcorn to a coarse cream; keep the rest whole — the ground corn thickens the masala without flour or cream.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger, garlic and red chilli for 1 minute, then the tomato, turmeric and ground coriander, and cook to a thick masala, 6 minutes.",
      "Stir in the ground corn and cook 3 minutes until sweet and glossy, then add the whole kernels, the peas and 100 ml water.",
      "Add the paneer and the salt; simmer 4 minutes until the kernels are tender and the masala clings to the paneer.",
      "Serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mushroom-paneer-masala",
    name: { en: "Mushroom Paneer Masala", hindi: "मशरूम पनीर मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 720 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-1750347", grams: 400 }, // mushroom (white)
      { foodId: "usda-330137", grams: 160 }, // Greek yogurt
      { foodId: "usda-170419", grams: 100 }, // peas (green)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Quarter the mushrooms and cut the paneer into cubes. Sear the mushrooms in a dry hot pan for 3 minutes until they give up their water and brown — wet mushrooms boil instead of frying.",
      "Sear the paneer for 1 minute a side in the same pan; set both aside.",
      "Heat the sunflower oil; crackle the cumin seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and ground coriander, and cook to a dark, thick masala, 6 minutes.",
      "Off the heat, whisk in the yogurt; return to low heat and cook 3 minutes, stirring, until glossy.",
      "Add the mushrooms, paneer, peas and salt with 100 ml water; simmer 5 minutes until the gravy coats everything.",
      "Serve with rotis or rice.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ----------------------------- egg ------------------------------ */
  {
    id: "dish-egg-korma",
    name: { en: "Egg Korma", hindi: "अंडा कोरमा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg
      { foodId: "usda-330137", grams: 240 }, // Greek yogurt
      { foodId: "usda-2515374", grams: 40 }, // cashew nuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool in water, peel and halve lengthways. Soak the cashews in warm water for 20 minutes and grind to a smooth cream.",
      "Fry the onion in the ghee until deep golden, 8 minutes; grind to a paste with the ginger and garlic.",
      "Return the paste to the pan with the cardamom, cinnamon and black pepper; fry 2 minutes.",
      "Off the heat, whisk in the yogurt spoon by spoon; return to low heat and cook 4 minutes, stirring, until the fat glistens at the edges.",
      "Stir in the cashew cream and 150 ml water; simmer 3 minutes into a pale korma gravy and add the salt.",
      "Lay the egg halves in, cut side up, spoon the gravy over, cover and simmer 4 minutes so the yolks warm through without hardening further.",
      "Rest 5 minutes and serve with rice or naan.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-egg-pepper-fry",
    name: { en: "Egg Pepper Fry", hindi: "अंडा पेपर फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170931", grams: 8 }, // black pepper
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and halve. Crush the black pepper coarsely and rub the eggs with the turmeric, half the pepper and a pinch of salt.",
      "Sear the egg halves cut-side down in a dry non-stick pan for 2 minutes until the whites crisp golden at the edges; set aside.",
      "Heat the sesame oil in a wide pan; crackle the mustard seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger, garlic and green chillies; fry 1 minute until fragrant.",
      "Add the tomato and cook 3 minutes to a dark masala, then add the remaining pepper and cook 1 minute into a peppery glaze.",
      "Return the eggs, cut side up, and toss gently for 2 minutes until every half is lacquered with the onion-pepper masala.",
      "Scatter the coriander leaves and serve with rice and a cooling dal or raita alongside.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-egg-keema-masala",
    name: { en: "Egg Keema Masala", hindi: "अंडा कीमा मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg
      { foodId: "usda-170419", grams: 150 }, // peas (green)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Boil the eggs for 10 minutes — a keema egg wants a firm yolk. Cool, peel and grate on the coarse side of a grater into crumbles; that crumble is the 'keema'.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger, garlic and red chilli for 1 minute, then the tomato, turmeric and ground coriander, and cook to a dark, thick masala, 6 minutes.",
      "Add the peas and 100 ml water; simmer 4 minutes until the peas are tender and sweet.",
      "Fold in the grated egg and the salt; cook 3 minutes, stirring gently, until the egg crumbles drink the masala and the pan is nearly dry.",
      "Rest 3 minutes, scatter the coriander leaves generously, and serve with rotis or pav — spooned up, never sliced.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-egg-poached-curry",
    name: { en: "Egg Poached Curry", hindi: "अंडा पोच्ड करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-170172", grams: 150 }, // coconut milk
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Heat the sunflower oil in a wide, deep pan; crackle the cumin seeds and fry the onion until golden, 7 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, red chilli, ground coriander and salt, and cook to a thick, bright masala, 7 minutes.",
      "Pour in 250 ml water and the coconut milk and simmer 5 minutes into a flowing curry — wide and shallow is right, because the eggs poach in a single layer.",
      "Lower the heat to the barest simmer. Crack the eggs into a small bowl one at a time and slide them into the curry, spaced apart — 16 eggs need the widest pan you have, or two pans.",
      "Cover and poach 5–6 minutes, until the whites are set and opaque but the yolks still tremble when the pan is nudged.",
      "Rest 2 minutes and serve straight from the pan over rice, spooning an egg and its gravy together.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-egg-vindaloo",
    name: { en: "Egg Vindaloo", hindi: "अंडा विंडालू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-173469", grams: 30 }, // vinegar (cider)
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-170929", grams: 3 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soak the red chillies in warm water for 15 minutes. Grind them with the garlic, ginger, cumin, black pepper, ground mustard and the vinegar to a smooth vindaloo paste — the vinegar is the dish's sour backbone, and there is deliberately no sugar: a vindaloo is fiery and sharp, never sweet.",
      "Boil the eggs for 9 minutes, cool, peel and halve. Rub with the turmeric and a pinch of salt.",
      "Heat the sunflower oil in a heavy pot; fry the onion until deep golden-brown, 9 minutes — vindaloo onions go darker than most curries.",
      "Add the vindaloo paste and fry 3 minutes, stirring, until the oil glistens at the edges and the raw garlic smell is gone.",
      "Pour in 250 ml water and the salt; simmer 8 minutes into a thick, fiery gravy.",
      "Add the egg halves, spoon the gravy over, cover and simmer 4 minutes.",
      "Rest 10 minutes — a vindaloo is better after a rest, and better still the next day. Serve with rice.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-egg-pulusu",
    name: { en: "Egg Pulusu (Andhra)", hindi: "अंडा पुलुसु" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170150", grams: 15 }, // sesame seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171324", grams: 1 }, // fenugreek seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and make 2–3 shallow slits in each so the pulusu soaks in. Soak the tamarind in 300 ml warm water for 10 minutes; squeeze and strain.",
      "Sear the eggs in a dry non-stick pan for 2 minutes until the whites blister lightly; set aside.",
      "Heat the sesame oil in a heavy pot; crackle the mustard, cumin and fenugreek seeds and the red chillies, then fry the onion until golden, 7 minutes.",
      "Pound the sesame seeds to a coarse powder. Add the garlic for 1 minute, then the tomato and turmeric, and cook to a thick masala, 5 minutes.",
      "Stir in the sesame powder, pour in the tamarind water and the salt; boil 5 minutes until the gravy is sharp, tangy and slightly thickened — a pulusu is a sour gravy, never sweet.",
      "Add the eggs, cover and simmer 5 minutes so the slits drink the tamarind.",
      "Rest 5 minutes and serve with rice and a spoon — the gravy is the point.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-egg-masoor-dal",
    name: { en: "Egg Masoor Dal", hindi: "अंडा मसूर दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174284", grams: 320 }, // lentils (masoor dal)
      { foodId: "usda-171287", grams: 400 }, // egg (about 8 large eggs)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172337", grams: 15 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the masoor dal until the water runs clear — red lentils need no soaking. Boil the eggs for 9 minutes, cool, peel and halve.",
      "Simmer the dal in 900 ml water with the turmeric and half the salt for 15–18 minutes, until the lentils collapse into a soft, soupy puree; whisk briefly to smooth it.",
      "Heat the mustard oil in a pan until it just smokes, then lower the heat — mustard oil must be heated past its raw pungency.",
      "Crackle the cumin seeds and red chillies, fry the onion until golden, 6 minutes, then add the ginger and garlic for 1 minute.",
      "Add the tomato and cook to a thick masala, 5 minutes.",
      "Pour the masala into the dal, stir in the egg halves, and simmer 4 minutes so the eggs warm through and the dal takes the tempering.",
      "Rest 5 minutes, scatter the coriander leaves, and serve over rice — the dal should pour like a thick soup.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-egg-tadka-dal",
    name: { en: "Egg Tadka Dal (Dhaba-Style)", hindi: "अंडा तड़का दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 200 }, // mung beans (whole moong)
      { foodId: "usda-174259", grams: 120 }, // urad dal (whole)
      { foodId: "usda-171287", grams: 480 }, // egg (about 10 large eggs)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Soak the whole moong and urad together for 4 hours. Pressure-cook with the turmeric, half the salt and 800 ml water for 4 whistles, until both dals are soft; whisk to a coarse, creamy dal — a dhaba tadka dal is never fully smooth.",
      "Boil the eggs for 9 minutes, cool, peel and chop roughly into chunks.",
      "Heat the ghee in a heavy pan; crackle the cumin seeds and red chillies, then fry the onion until deep golden, 8 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a dark, glossy masala, 6 minutes.",
      "Fold the chopped egg through the masala for 2 minutes so the pieces catch the ghee and spices.",
      "Pour the hot dal over the egg masala, stir once, and simmer 3 minutes. The dal should be thick enough to hold a spoon's trail.",
      "Scatter the coriander leaves and serve with rotis or rice, dhaba-style, straight from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-doi-dim",
    name: { en: "Doi Dim (Egg in Yogurt Gravy)", hindi: "दोई डिम" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg (about 16 large eggs)
      { foodId: "usda-330137", grams: 300 }, // Greek yogurt
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and rub with the turmeric and a pinch of salt. Whisk the Greek yogurt smooth with the salt — smooth yogurt, added off the boil, is what keeps a doi gravy from splitting.",
      "Heat the mustard oil until it just smokes, lower the heat, and sear the eggs for 2 minutes until the whites blister golden; set aside.",
      "In the same oil, add the bay leaf, cinnamon and cardamom, then fry the onion until soft and pale gold, 7 minutes — a Bengali doi gravy stays light.",
      "Add the ginger, garlic and green chillies; fry 1 minute.",
      "Take the pan off the heat and stir in the yogurt with 100 ml water. Return to the lowest heat and cook 5 minutes, stirring, until the gravy turns glossy and coats a spoon.",
      "Return the eggs, cover and simmer 4 minutes so the gravy clings to the blistered whites.",
      "Rest 5 minutes and serve with rice — the gravy should be pale, tangy and aromatic, never brown.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-palak-egg-curry",
    name: { en: "Palak Egg Curry", hindi: "पालक अंडा करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg (about 16 large eggs)
      { foodId: "usda-168462", grams: 400 }, // spinach
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and halve. Blanch the spinach in boiling water for 1 minute, refresh in cold water, squeeze dry and chop roughly — blanching keeps the green vivid.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 5 minutes.",
      "Add the spinach and the salt; cook 3 minutes, stirring, until the spinach darkens and melds with the masala.",
      "Pour in 150 ml water and simmer 3 minutes into a coarse green gravy — palak for eggs stays textured, not pureed.",
      "Lay the egg halves in, cut side up, spoon the palak over, cover and simmer 4 minutes.",
      "Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mushroom-egg-curry",
    name: { en: "Mushroom Egg Curry", hindi: "मशरूम अंडा करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // egg (about 16 large eggs)
      { foodId: "usda-1750347", grams: 400 }, // mushroom (white)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel and halve. Quarter the mushrooms.",
      "Sear the mushrooms in a dry hot pan for 3 minutes until they give up their water and brown at the edges; set aside.",
      "Heat the sunflower oil in the same pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and ground coriander, and cook to a thick masala, 6 minutes.",
      "Pour in 200 ml water and the salt; simmer 4 minutes into a flowing gravy.",
      "Add the mushrooms and egg halves, cover and simmer 4 minutes so the mushrooms drink the gravy without going soft.",
      "Rest 3 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-paneer-egg-bhurji",
    name: { en: "Paneer Egg Bhurji", hindi: "पनीर अंडा भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 480 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-171287", grams: 480 }, // egg (about 10 large eggs)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-170427", grams: 80 }, // capsicum (green pepper)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Crumble the paneer coarsely with your fingers. Beat the eggs with the turmeric and salt until uniform.",
      "Heat the sunflower oil in a wide pan; crackle the cumin seeds and fry the onion until soft and golden at the edges, 5 minutes.",
      "Add the ginger, garlic, green chillies and capsicum; fry 2 minutes — the capsicum stays crisp.",
      "Add the tomato and cook 3 minutes until soft and jammy.",
      "Add the crumbled paneer and toss for 2 minutes to warm it through.",
      "Pour in the beaten eggs and stir slowly, lifting soft curds, for 2–3 minutes until just set and glossy — bhurji must stay moist, so take it off early.",
      "Scatter the coriander leaves and serve at once with rotis or pav.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------- tofu, tempeh, edamame --------------------- */
  {
    id: "dish-tofu-masala",
    name: { en: "Tofu Masala", hindi: "टोफू मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172448", grams: 1000 }, // tofu (firm)
      { foodId: "usda-172430", grams: 60 }, // peanuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Press the tofu between cloths under a weight for 20 minutes, then cut into large cubes — pressed tofu sears instead of steaming. Grind the peanuts to a smooth paste with a little water.",
      "Sear the tofu in a dry non-stick pan for 2 minutes a side until golden; set aside.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a dark, thick masala, 7 minutes.",
      "Stir in the peanut paste and 250 ml water; simmer 4 minutes into a rich, nutty gravy and add the salt.",
      "Add the tofu and simmer 5 minutes so the cubes drink the gravy — tofu takes flavour only when it simmers in it.",
      "Rest 5 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-tofu-bhurji",
    name: { en: "Tofu Bhurji", hindi: "टोफू भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172448", grams: 1040 }, // tofu (firm)
      { foodId: "usda-170419", grams: 200 }, // peas (green)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-170427", grams: 80 }, // capsicum (green pepper)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Press the tofu for 20 minutes, then crumble it coarsely with your fingers into bhurji-sized pieces.",
      "Heat the sunflower oil in a wide pan; crackle the cumin seeds and fry the onion until soft and golden at the edges, 5 minutes.",
      "Add the ginger, garlic, green chillies and capsicum; fry 2 minutes, keeping the capsicum crisp.",
      "Add the tomato and turmeric and cook 3 minutes until soft and jammy.",
      "Add the peas and 3 tablespoons of water; cook 3 minutes until the peas are tender and sweet.",
      "Add the crumbled tofu and the salt; toss on medium heat for 4 minutes until heated through and lightly golden in spots — tofu bhurji should stay soft, never rubbery.",
      "Scatter the coriander leaves and serve with rotis or pav.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-palak-tofu",
    name: { en: "Palak Tofu", hindi: "पालक टोफू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172448", grams: 1000 }, // tofu (firm)
      { foodId: "usda-168462", grams: 400 }, // spinach
      { foodId: "usda-172430", grams: 40 }, // peanuts
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Press the tofu for 20 minutes and cut into cubes; sear in a dry non-stick pan for 2 minutes a side until golden. Grind the peanuts to a paste with a little water.",
      "Blanch the spinach for 1 minute, refresh in cold water, squeeze dry and chop roughly.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and red chilli, and cook to a thick masala, 5 minutes.",
      "Add the spinach and cook 3 minutes, stirring, until it darkens and melds with the masala.",
      "Stir in the peanut paste and 150 ml water; simmer 3 minutes into a coarse green gravy and add the salt.",
      "Add the tofu, cover and simmer 4 minutes. Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-mushroom-tofu-masala",
    name: { en: "Mushroom Tofu Masala", hindi: "मशरूम टोफू मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172448", grams: 960 }, // tofu (firm)
      { foodId: "usda-1750347", grams: 400 }, // mushroom (white)
      { foodId: "usda-170419", grams: 120 }, // peas (green)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Press the tofu for 20 minutes and cut into cubes. Quarter the mushrooms.",
      "Sear the mushrooms in a dry hot pan for 3 minutes until browned; sear the tofu for 2 minutes a side in the same pan. Set both aside.",
      "Heat the sunflower oil; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and ground coriander, and cook to a thick masala, 6 minutes.",
      "Pour in 200 ml water and the salt; simmer 4 minutes into a flowing gravy.",
      "Add the mushrooms, tofu and peas; simmer 4 minutes until the peas are tender and everything is coated.",
      "Rest 3 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-tempeh-masala",
    name: { en: "Tempeh Masala Curry", hindi: "टेम्पेह मसाला करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174272", grams: 520 }, // tempeh
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Cut the tempeh into thick slices or cubes. Steam for 10 minutes first — steaming removes tempeh's slight bitterness and opens it to the masala.",
      "Sear the steamed tempeh in a dry non-stick pan for 2 minutes a side until golden and nutty; set aside.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a dark, thick masala, 6 minutes.",
      "Pour in 250 ml water and the salt; simmer 4 minutes into a flowing gravy.",
      "Add the tempeh and simmer 6 minutes — tempeh drinks gravy deeply, so give it the time.",
      "Scatter the coriander leaves and serve with rice or rotis.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-tempeh-pepper-fry",
    name: { en: "Tempeh Pepper Fry", hindi: "टेम्पेह पेपर फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174272", grams: 520 }, // tempeh
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the tempeh into bite-size cubes and steam for 10 minutes to remove any bitterness. Crush the black pepper coarsely.",
      "Rub the tempeh with the turmeric, half the pepper and a pinch of salt; sear in a dry non-stick pan for 2 minutes a side until golden.",
      "Heat the sesame oil in a wide pan; crackle the mustard seeds and fry the onion until deep golden, 8 minutes.",
      "Add the ginger, garlic and green chillies; fry 1 minute.",
      "Add the tomato and cook 3 minutes to a dark, jammy masala.",
      "Return the tempeh with the remaining pepper and the salt; toss on high heat for 3 minutes until the masala clings dry and glossy.",
      "Serve at once with rice and a mild dal alongside to cool the pepper heat.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-tempeh-palak",
    name: { en: "Tempeh Palak", hindi: "टेम्पेह पालक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174272", grams: 520 }, // tempeh
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the tempeh into cubes and steam for 10 minutes; sear in a dry non-stick pan for 2 minutes a side until golden.",
      "Blanch the spinach for 1 minute, refresh in cold water, squeeze dry and chop roughly.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato and turmeric, and cook to a thick masala, 5 minutes.",
      "Add the spinach and the salt; cook 3 minutes until it darkens and melds with the masala.",
      "Pour in 100 ml water, add the tempeh, cover and simmer 5 minutes so the cubes drink the green gravy.",
      "Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-edamame-masala",
    name: { en: "Edamame Masala Curry", hindi: "एडामामे मसाला करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168410", grams: 920 }, // edamame (shelled)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "If the edamame is in pods, blanch the pods for 3 minutes and pop the beans out; shelled beans go straight in. Edamame needs only minutes of cooking — it is a fresh bean, not a dry one.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Pour in 200 ml water and the salt; simmer 3 minutes into a flowing gravy.",
      "Add the edamame and simmer 4 minutes, until the beans are bright green and just tender — overcooked edamame turns grey and mealy.",
      "Rest 3 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-edamame-paneer-masala",
    name: { en: "Edamame Paneer Masala", hindi: "एडामामे पनीर मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168410", grams: 600 }, // edamame (shelled)
      { foodId: "usda-328841", grams: 400 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the paneer into cubes and sear in a dry non-stick pan for 1 minute a side; set aside. Shell the edamame if it is in pods (blanch pods 3 minutes and pop the beans out).",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and ground coriander, and cook to a thick masala, 6 minutes.",
      "Pour in 200 ml water and the salt; simmer 3 minutes.",
      "Add the edamame and simmer 3 minutes, until bright green and just tender.",
      "Fold in the paneer and simmer 2 minutes more, just to heat it through — long cooking toughens paneer and greys the edamame.",
      "Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ---------------------- whole soybean dishes ---------------------- */
  {
    id: "dish-soya-palak",
    name: { en: "Soya Palak", hindi: "सोया पालक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 360 }, // soybeans (whole, dry)
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water, the turmeric and half the salt for 6 whistles, until creamy-soft. Reserve 200 ml of the liquor.",
      "Blanch the spinach for 1 minute, refresh in cold water, squeeze dry and chop roughly.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato and red chilli, and cook to a thick masala, 5 minutes.",
      "Add the spinach and cook 3 minutes until it darkens and melds with the masala.",
      "Add the soybeans with the reserved liquor and simmer 6 minutes so the beans take the green gravy.",
      "Rest 5 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-soya-chettinad",
    name: { en: "Soya Chettinad", hindi: "सोया चेट्टिनाड" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 360 }, // soybeans (whole, dry)
      { foodId: "usda-170169", grams: 50 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-170931", grams: 5 }, // black pepper
      { foodId: "usda-171323", grams: 3 }, // fennel seeds
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water and half the salt for 6 whistles, until creamy-soft. Drain well.",
      "Dry-roast the coriander seeds, black pepper, fennel, red chillies, cinnamon, turmeric and coconut until fragrant and golden, 3 minutes. Grind to a coarse Chettinad powder.",
      "Heat the sesame oil in a heavy pan and fry the onion until deep golden, 8 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a dark, thick masala, 6 minutes.",
      "Stir in the Chettinad powder and fry 1 minute — the masala turns nearly black and intensely aromatic.",
      "Add the soybeans and 150 ml water with the remaining salt; simmer 8 minutes so the beans drink the peppery gravy.",
      "Rest 5 minutes and serve with rice — Chettinad heat is pepper heat, and it builds.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-mushroom-soya-masala",
    name: { en: "Mushroom Soya Masala", hindi: "मशरूम सोया मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 320 }, // soybeans (whole, dry)
      { foodId: "usda-1750347", grams: 300 }, // mushroom (white)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water and half the salt for 6 whistles, until creamy-soft. Quarter the mushrooms.",
      "Sear the mushrooms in a dry hot pan for 3 minutes until they give up their water and brown; set aside.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and ground coriander, and cook to a thick masala, 6 minutes.",
      "Add the soybeans with 150 ml of their liquor and the remaining salt; simmer 6 minutes.",
      "Add the mushrooms and simmer 3 minutes more, just until they are coated and heated through without going soft.",
      "Rest 3 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-soya-egg-curry",
    name: { en: "Soya Egg Curry", hindi: "सोया अंडा करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 240 }, // soybeans (whole, dry)
      { foodId: "usda-171287", grams: 400 }, // egg (about 8 large eggs)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water and half the salt for 6 whistles, until creamy-soft. Reserve the liquor. Boil the eggs for 9 minutes, cool, peel and halve.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 7 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Add the soybeans with enough liquor for a flowing gravy and the remaining salt; simmer 6 minutes.",
      "Lay the egg halves in, cut side up, spoon the gravy over, cover and simmer 4 minutes.",
      "Rest 5 minutes and serve with rice — bean and egg together make this the wave's quiet protein heavyweight.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-tofu-egg-bhurji",
    name: { en: "Tofu Egg Bhurji", hindi: "टोफू अंडा भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172448", grams: 600 }, // tofu (firm)
      { foodId: "usda-171287", grams: 480 }, // egg (about 10 large eggs)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170427", grams: 80 }, // capsicum (green pepper)
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Press the tofu for 20 minutes and crumble it coarsely. Beat the eggs with the turmeric and salt until uniform.",
      "Heat the sunflower oil in a wide pan; crackle the cumin seeds and fry the onion until soft and golden at the edges, 5 minutes.",
      "Add the ginger, garlic, green chillies and capsicum; fry 2 minutes, keeping the capsicum crisp.",
      "Add the tomato and cook 3 minutes until soft and jammy.",
      "Add the crumbled tofu and toss for 2 minutes to warm it through.",
      "Pour in the beaten eggs and stir slowly, lifting soft curds through the tofu, for 2–3 minutes until just set and glossy — take it off early; the curds finish in the pan's heat.",
      "Scatter the coriander leaves and serve at once with rotis or pav.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-paneer-soya-masala",
    name: { en: "Paneer Soya Masala", hindi: "पनीर सोया मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 480 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-174270", grams: 160 }, // soybeans (whole, dry)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the whole soybeans overnight. Drain and pressure-cook with fresh water and half the salt for 6 whistles, until creamy-soft. Cut the paneer into cubes.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric and ground coriander, and cook to a thick masala, 6 minutes.",
      "Add the soybeans with 150 ml of their liquor and the remaining salt; simmer 6 minutes.",
      "Fold in the paneer and simmer 3 minutes, just to coat and heat through.",
      "Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  /* -------------------- dals, chickpeas & nuts -------------------- */
  {
    id: "dish-dal-amti",
    name: { en: "Dal Amti (Maharashtrian Toor Dal)", hindi: "दाल आमटी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 480 }, // pigeon peas (toor dal)
      { foodId: "usda-172430", grams: 40 }, // peanuts
      { foodId: "usda-170169", grams: 30 }, // coconut (fresh)
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 6 }, // fresh coriander leaves
    ],
    method: [
      "Rinse the toor dal and pressure-cook with the turmeric, half the salt and 1 litre of water for 4 whistles, until completely soft. Whisk to a smooth, flowing dal. Soak the tamarind in 150 ml warm water; squeeze and strain.",
      "Grind the peanuts and coconut to a smooth paste with a little water — this paste is the amti's body.",
      "Heat the sunflower oil in a deep pot; crackle the mustard and cumin seeds and the red chillies, then fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute.",
      "Pour in the whisked dal and the tamarind water; simmer 5 minutes. (An amti is classically sweet-sour with jaggery and kokum; this one takes its sour from tamarind alone and adds no sweetener — the dal's own sweetness carries it.)",
      "Stir in the peanut-coconut paste and the remaining salt; simmer 4 minutes until the amti turns silky and lightly thick.",
      "Scatter the coriander leaves and serve over rice with a spoon — an amti pours, it does not sit in a mound.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-mangodi-ki-sabzi",
    name: { en: "Mangodi ki Sabzi (Moong Dal Vadi Curry)", hindi: "मंगोड़ी की सब्ज़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 440 }, // mung beans (whole moong)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Make the mangodi ahead: soak the moong for 4 hours, drain and grind to a thick, coarse batter with almost no water and a pinch of salt. Drop chickpea-size blobs onto a cloth and dry in the sun for a day (or a 70°C oven for 3–4 hours) until bone-dry and hard.",
      "Heat the mustard oil until it just smokes, then lower the heat. Toast the mangodi, stirring, for 3–4 minutes until golden all over — toasted in a film of oil, never deep-fried.",
      "Lift the mangodi out. In the same oil, crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Pour in 500 ml water and the salt; bring to a boil.",
      "Add the mangodi, cover and simmer 12–15 minutes, until the vadis swell, soften to the centre and drink the gravy — test one: it should yield completely, with no hard core.",
      "Scatter the coriander leaves and serve with rotis or rice.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven", "mixer_grinder"],
  },
  {
    id: "dish-chole-palak",
    name: { en: "Chole Palak", hindi: "छोले पालक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // chickpeas
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight. Drain and pressure-cook with fresh water and half the salt for 5 whistles, until soft. Reserve the liquor. Blanch the spinach for 1 minute, refresh, squeeze dry and chop roughly.",
      "Heat the sunflower oil in a heavy pot; crackle the cumin seeds and fry the onion until golden, 7 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Add the spinach and cook 3 minutes until it darkens and melds with the masala.",
      "Add the chickpeas with enough liquor for a flowing gravy and the remaining salt.",
      "Simmer 10 minutes, lightly crushing a ladleful of chickpeas against the side to thicken the gravy.",
      "Rest 5 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-chana-paneer",
    name: { en: "Chana Paneer", hindi: "चना पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 320 }, // chickpeas
      { foodId: "usda-328841", grams: 320 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight. Drain and pressure-cook with fresh water and half the salt for 5 whistles, until soft. Reserve the liquor. Cut the paneer into cubes.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the sunflower oil in a heavy pot; crackle the cumin seeds and fry the onion until golden, 7 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Add the chickpeas with enough liquor for a flowing gravy and the remaining salt; simmer 8 minutes.",
      "Fold in the paneer and simmer 3 minutes, just to coat and heat through.",
      "Rest 5 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-dal-paneer",
    name: { en: "Dal Paneer", hindi: "दाल पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 320 }, // mung beans (whole moong)
      { foodId: "usda-328841", grams: 320 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Soak the whole moong for 4 hours. Pressure-cook with the turmeric, half the salt and 800 ml water for 3 whistles, until soft; whisk to a coarse, creamy dal. Cut the paneer into cubes.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the ghee in a heavy pot; crackle the cumin seeds and red chillies, then fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a thick masala, 5 minutes.",
      "Pour the dal into the masala with the remaining salt; simmer 5 minutes.",
      "Fold in the paneer and simmer 3 minutes, until the cubes are heated through and the dal coats them.",
      "Scatter the coriander leaves and serve with rice or rotis.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-peanut-amti",
    name: { en: "Peanut Amti (Shengdana Curry)", hindi: "मूंगफली आमटी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172430", grams: 360 }, // peanuts
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the peanuts in a heavy pan for 6–8 minutes until golden and fragrant; rub off the skins and grind to a smooth paste with the green chillies, ginger, garlic and a little water.",
      "Whisk the Greek yogurt smooth with the turmeric and salt.",
      "Heat the sunflower oil in a deep pot; crackle the mustard and cumin seeds.",
      "Add the peanut paste and 600 ml water; bring to a gentle boil, stirring — peanut gravies catch at the base, so keep the spoon moving.",
      "Simmer 8 minutes until the amti thickens to a pouring cream and the raw peanut smell is gone.",
      "Off the heat, stir in the whisked yogurt; return to the lowest heat for 2 minutes to warm through without splitting.",
      "Scatter the coriander leaves and serve over rice — Maharashtra's fasting-day amti, at main-meal size.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kaju-masala",
    name: { en: "Kaju Masala (Cashew Curry)", hindi: "काजू मसाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2515374", grams: 480 }, // cashew nuts
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Split the cashews: grind a third to a smooth cream with a little water; keep the rest whole. Whisk the yogurt smooth.",
      "Toast the whole cashews in a dry pan for 3 minutes until pale gold; set aside.",
      "Heat the ghee in a heavy pan; add the cardamom and cinnamon, crackle the cumin seeds, and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato and turmeric, and cook to a thick masala, 5 minutes.",
      "Off the heat, whisk in the yogurt; return to low heat and cook 3 minutes, stirring, until glossy.",
      "Stir in the cashew cream and 150 ml water; simmer 3 minutes into a rich, pale gravy and add the salt.",
      "Fold in the toasted whole cashews, rest 3 minutes, and serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-peanut-paneer",
    name: { en: "Peanut Paneer", hindi: "मूंगफली पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 680 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-172430", grams: 120 }, // peanuts
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Dry-roast the peanuts for 6 minutes until golden; rub off the skins and grind to a smooth paste with a little water. Cut the paneer into cubes.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Stir in the peanut paste and 200 ml water; simmer 4 minutes into a rich, nutty gravy and add the salt.",
      "Fold in the paneer and simmer 3 minutes, just to coat and heat through.",
      "Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kaju-paneer",
    name: { en: "Kaju Paneer", hindi: "काजू पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 600 }, // cottage cheese (the set's paneer stand-in)
      { foodId: "usda-2515374", grams: 200 }, // cashew nuts
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Split the cashews: grind half to a smooth cream with a little water; toast the other half whole in a dry pan for 3 minutes until pale gold. Cut the paneer into cubes.",
      "Sear the paneer in a dry non-stick pan for 1 minute a side; set aside.",
      "Heat the ghee in a heavy pan; add the cardamom, crackle the cumin seeds, and fry the onion until golden, 6 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato and turmeric, and cook to a thick masala, 5 minutes.",
      "Stir in the cashew cream and 150 ml water; simmer 3 minutes into a rich, pale gravy and add the salt.",
      "Fold in the paneer and the toasted cashews; simmer 2 minutes, just to heat through.",
      "Rest 3 minutes and serve with rotis or rice.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chana-egg-curry",
    name: { en: "Chana Egg Curry", hindi: "चना अंडा करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 360 }, // chickpeas
      { foodId: "usda-171287", grams: 400 }, // egg (about 8 large eggs)
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight. Drain and pressure-cook with fresh water and half the salt for 5 whistles, until soft. Reserve the liquor. Boil the eggs for 9 minutes, cool, peel and halve.",
      "Heat the sunflower oil in a heavy pot; crackle the cumin seeds and fry the onion until golden, 7 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander and red chilli, and cook to a thick masala, 6 minutes.",
      "Add the chickpeas with enough liquor for a flowing gravy and the remaining salt; simmer 8 minutes.",
      "Lay the egg halves on top, spoon the gravy over, cover and simmer 4 minutes.",
      "Rest 5 minutes and serve with rice or rotis.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  /* --------------------- chicken & fish --------------------- */
  {
    id: "dish-chicken-do-pyaza",
    name: { en: "Chicken Do Pyaza", hindi: "चिकन दो प्याज़ा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 520 }, // chicken breast
      { foodId: "usda-790646", grams: 400 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Cut the chicken into curry pieces. Slice half the onion fine and cut the other half into thick petals — do pyaza means 'two onions': one melts into the gravy, one stays in pieces.",
      "Heat the sunflower oil in a heavy pan; crackle the cumin seeds and fry the finely sliced onion until deep golden, 9 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, turmeric, ground coriander, red chilli and black pepper, and cook to a dark masala, 6 minutes.",
      "Add the chicken and the salt; sear on high heat for 4 minutes until the pieces firm and whiten.",
      "Cover and cook on low heat for 12 minutes in the chicken's own juices, stirring once or twice.",
      "Add the onion petals and cook uncovered for 4 minutes, until the petals soften at the edges but still hold their shape.",
      "Scatter the coriander leaves and serve with rotis or rice.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chicken-kolhapuri",
    name: { en: "Chicken Kolhapuri", hindi: "चिकन कोल्हापुरी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170169", grams: 50 }, // coconut (fresh)
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170922", grams: 6 }, // coriander seeds
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171330", grams: 8 }, // poppy seeds
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Dry-roast the coriander seeds, red chillies, poppy seeds, sesame seeds and coconut until deep golden and fragrant, 4 minutes. Grind to a coarse Kolhapuri masala powder.",
      "Cut the chicken thighs into curry pieces and rub with the turmeric and a pinch of salt.",
      "Heat the sunflower oil in a heavy pan and fry the onion until deep golden-brown, 9 minutes.",
      "Add the ginger and garlic for 1 minute, then the tomato, and cook to a dark masala, 5 minutes.",
      "Add the chicken and sear on high heat for 5 minutes until the pieces firm and colour.",
      "Stir in the Kolhapuri masala and 200 ml water with the remaining salt; cover and simmer 15 minutes until the chicken is tender and the gravy is thick, dark and fiery.",
      "Rest 5 minutes and serve with rice or bhakri — warn the table: Kolhapuri heat is famous for a reason.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chicken-rezala",
    name: { en: "Chicken Rezala", hindi: "चिकन रेज़ाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 520 }, // chicken breast
      { foodId: "usda-330137", grams: 240 }, // Greek yogurt
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the chicken into large pieces. Whisk the Greek yogurt smooth with the ginger, garlic, crushed black pepper and salt, and marinate the chicken in it for at least 30 minutes.",
      "Fry the onion in the ghee until soft and pale gold, 7 minutes — a rezala is a white curry, so the onion must never brown. Grind the softened onion to a smooth paste.",
      "Return the paste to the pan with the bay leaf, cardamom, cinnamon and cloves; fry 1 minute.",
      "Add the chicken with all its marinade, cover and cook on the lowest heat for 18–20 minutes, stirring now and then, until the chicken is tender and the gravy is pale, silky and fragrant.",
      "Add the green chillies and simmer 2 minutes more. The gravy should coat the chicken in a thin white sauce — add a splash of hot water only if it thickens too far.",
      "Rest 5 minutes and serve with rice or naan. A rezala's heat is gentle pepper warmth, never chilli fire.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-fish-korma",
    name: { en: "Fish Korma (Tilapia)", hindi: "फिश कोरमा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt
      { foodId: "usda-2515374", grams: 40 }, // cashew nuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the tilapia into 8 large pieces and rub with a pinch of salt and the black pepper. Soak the cashews in warm water for 20 minutes and grind to a smooth cream. Whisk the yogurt smooth.",
      "Fry the onion in the ghee until deep golden, 8 minutes; grind to a paste with the ginger, garlic and green chillies.",
      "Return the paste to the pan with the cardamom and cinnamon; fry 2 minutes.",
      "Off the heat, whisk in the yogurt spoon by spoon; return to low heat and cook 4 minutes, stirring, until the fat glistens.",
      "Stir in the cashew cream and 150 ml water; simmer 3 minutes into a pale korma gravy and add the salt.",
      "Slide in the fish, cover and poach at the gentlest simmer for 7–8 minutes, until the flesh is opaque and just flakes — shake the pan, never stir.",
      "Rest 5 minutes and serve with rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-doi-maach",
    name: { en: "Doi Maach (Fish in Yogurt Gravy)", hindi: "दोई माछ" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia (stands in for rui)
      { foodId: "usda-330137", grams: 300 }, // Greek yogurt
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the tilapia into 8 large steaks and rub with the turmeric and a pinch of salt. (Bengal's doi maach is made with rui; tilapia is the reference set's stand-in, stated honestly.) Whisk the Greek yogurt smooth with the salt.",
      "Heat the mustard oil until it just smokes, lower the heat, and sear the fish for 1 minute a side until lightly golden; set aside.",
      "In the same oil, add the bay leaf, cinnamon and cardamom, then fry the onion until soft and pale gold, 6 minutes.",
      "Add the ginger, garlic and green chillies; fry 1 minute.",
      "Off the heat, stir in the yogurt with 100 ml water. Return to the lowest heat and cook 5 minutes, stirring, until the gravy is glossy and coats a spoon.",
      "Slide the fish back in, cover and poach 6–7 minutes at the gentlest simmer, until the flesh is opaque and just flakes.",
      "Rest 5 minutes and serve with rice — the gravy stays pale, tangy and aromatic.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
];
