/**
 * The international high-protein wave (X-1) — dishes from outside India,
 * every one of them built to clear the owner's bar for outside-India
 * dishes: at least 25 g of protein in a serving, computed by
 * `dishNutrients` from the lines below, never asserted. The bar is
 * pinned by dishLibraryIntl1.test.ts, which recomputes every dish.
 *
 * Recipes are composed only from the USDA reference set — no beef, no
 * pork (a deliberate programme omission), no branded items, no protein
 * powder. Where a classic needs an ingredient the set does not carry
 * (feta, capers, soy sauce, breadcrumbs), the dish is either composed
 * truthfully without it or left out of this wave; the method never
 * names an ingredient that is not a line. Water is never a line — it
 * carries no nutrients and is not a reference food.
 */

import type { Dish } from "../dishes";

export const INTL1_DISHES: readonly Dish[] = [
  /* ------------------------------ chicken ------------------------------ */
  {
    id: "dish-intl-herb-grilled-chicken",
    name: { en: "Herb-Grilled Chicken with Broccoli", hindi: "हर्ब-ग्रिल्ड चिकन विथ ब्रोकली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-321900", grams: 400 }, // broccoli
      { foodId: "usda-171413", grams: 20 }, // olive oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pound the chicken breasts between two sheets of cling film to an even 2 cm thickness so they cook at the same rate; pat dry.",
      "Crush the garlic to a paste with the salt, black pepper, the juice of the lemon and half the olive oil; rub all over the chicken and rest for 20 minutes (or up to 4 hours in the fridge).",
      "Cut the broccoli into florets with their stems; toss with the remaining olive oil and a pinch of the marinade left in the bowl.",
      "Heat a grill pan or heavy skillet over high heat until it just begins to smoke; lay the chicken in without crowding.",
      "Grill for 5–6 minutes without moving it, until deep grill marks form and the edges turn opaque.",
      "Flip once and cook 4–5 minutes more, until the thickest part reaches 74°C and the juices run clear, not pink.",
      "Rest the chicken on a warm plate, loosely covered, for 5 minutes — the juices settle back into the meat.",
      "Meanwhile grill the broccoli in the same pan for 4–5 minutes, turning once, until charred at the edges but still bright green and crisp-tender.",
      "Slice the chicken across the grain, spoon over the resting juices, and serve with the broccoli and the lemon wedges from the squeezed lemon.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-lemon-garlic-chicken",
    name: { en: "Lemon Garlic Chicken with Spinach", hindi: "लेमन गार्लिक चिकन विथ स्पिनच" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-168462", grams: 200 }, // spinach
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice each chicken breast horizontally into two thin cutlets; season with the salt and black pepper on both sides.",
      "Melt half the butter in a large skillet over medium-high heat; sear the cutlets for 3–4 minutes per side until golden and cooked through (74°C at the centre). Set aside on a warm plate.",
      "Lower the heat to medium; add the remaining butter and the sliced garlic and cook for 1 minute, stirring, until fragrant and just turning gold at the edges — do not let it brown.",
      "Pour in 120 ml water and the juice of the lemon, scraping up the browned bits from the pan; simmer 2 minutes until slightly reduced and glossy.",
      "Return the chicken and any plate juices to the pan; simmer 1 minute, turning once to coat in the sauce.",
      "Pile the spinach over the chicken, cover, and cook 1–2 minutes until just wilted and bright green.",
      "Serve at once, spooning the lemon-garlic pan sauce over each portion.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chicken-fajitas",
    name: { en: "Chicken Fajitas", hindi: "चिकन फ़हीता" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-170427", grams: 200 }, // green sweet pepper
      { foodId: "usda-170108", grams: 200 }, // red sweet pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Grind the cumin seeds; mix with the chili powder, salt and half the oil. Slice the chicken into 1 cm strips and toss in the spice mix; rest 15 minutes.",
      "Slice the peppers and onion into strips of the same width as the chicken so everything cooks evenly.",
      "Heat a large heavy skillet or cast-iron pan over high heat until smoking; add the remaining oil.",
      "Cook the chicken in a single layer for 4–5 minutes, turning once, until charred at the edges and cooked through; remove to a warm plate.",
      "In the same pan, still on high heat, add the peppers and onion; cook 3–4 minutes, tossing, until blistered in spots but still crisp.",
      "Return the chicken and its juices to the pan; toss everything together for 1 minute over the heat.",
      "Squeeze the lemon juice over, toss once more, and serve straight from the pan while it still sizzles.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-intl-jerk-chicken",
    name: { en: "Jerk Chicken", hindi: "जर्क चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-170106", grams: 25 }, // hot red chilli
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blend the chillies, ginger, garlic, onion, vinegar, sugar, black pepper, cinnamon, salt, lemon juice and oil into a coarse, fiery paste.",
      "Slash the chicken thighs twice across the thickest part so the paste reaches the meat; rub the paste in well and marinate for at least 2 hours, ideally overnight.",
      "Heat the oven to 200°C (or a grill to medium-high); shake the excess paste off the chicken, keeping it for basting.",
      "Roast or grill the chicken for 30–35 minutes, turning once halfway, until the skin side is dark and crisp at the edges.",
      "Brush with the reserved paste in the last 5 minutes and cook until the thickest part reaches 74°C and the juices run clear.",
      "Rest 5–10 minutes before serving so the meat stays juicy; serve with the pan juices spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven", "mixer_grinder"],
  },
  {
    id: "dish-intl-ginger-chicken-stir-fry",
    name: { en: "Ginger Chicken Stir-Fry", hindi: "जिंजर चिकन स्टर-फ़्राई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-321900", grams: 300 }, // broccoli
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-2346400", grams: 150 }, // snap (green) beans
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Slice the chicken into thin strips against the grain; toss with half the sesame oil, half the salt and the cayenne; rest 10 minutes.",
      "Cut the broccoli into small florets, the carrots into thin batons and the beans into 4 cm lengths; slice the ginger into fine matchsticks and the garlic thinly.",
      "Heat a wok or large skillet over high heat until smoking; add half the remaining sesame oil and sear the chicken in a single layer for 3–4 minutes until golden and just cooked; remove.",
      "Add the rest of the oil; stir-fry the ginger and garlic for 20 seconds until fragrant.",
      "Add the carrots and beans; stir-fry 2 minutes. Add the broccoli and 3 tablespoons of water; cover for 1 minute so the broccoli steams bright green.",
      "Return the chicken with its juices; toss for 1 minute over high heat until everything is glossy and the chicken is cooked through.",
      "Scatter the sesame seeds over, adjust the salt, and serve immediately.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chicken-quinoa-bowl",
    name: { en: "Chicken Quinoa Power Bowl", hindi: "चिकन क्विनोआ पावर बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-168462", grams: 100 }, // spinach
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-2515380", grams: 20 }, // pumpkin seeds
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Rinse the quinoa under cold water; cook in 240 ml salted water, covered, on low heat for 15 minutes; rest off the heat for 5 minutes and fluff with a fork.",
      "Season the chicken with the salt and half the lemon juice; rest 10 minutes.",
      "Heat the olive oil in a skillet over medium-high heat; sear the chicken for 5–6 minutes per side until golden and cooked through (74°C).",
      "Rest the chicken 5 minutes, then slice across the grain.",
      "Wilt the spinach in the warm pan for 30 seconds with a squeeze of lemon, just until it collapses.",
      "Build the bowls: quinoa first, then spinach, sliced chicken and the avocado cut into slices.",
      "Finish with the pumpkin seeds, the remaining lemon juice and any chicken resting juices.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: true,
    enrichment: "Quinoa, avocado and pumpkin seeds join the chicken — a boosted bowl, not a plain grilled-chicken plate.",
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chicken-caesar-salad",
    name: { en: "Chicken Caesar-Style Salad", hindi: "चिकन सीज़र-स्टाइल सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt
      { foodId: "usda-325036", grams: 30 }, // parmesan
      { foodId: "usda-168462", grams: 100 }, // spinach
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Season the chicken with the salt and black pepper; heat the olive oil in a skillet over medium-high heat and sear for 5–6 minutes per side until golden and cooked through.",
      "Rest the chicken for 5 minutes, then slice across the grain.",
      "For the dressing, whisk the Greek yogurt with the crushed garlic, lemon juice, half the parmesan and 2–3 tablespoons of water until it pours like a Caesar dressing; season to taste.",
      "Wash and thoroughly dry the spinach leaves — a wet leaf sheds the dressing.",
      "Toss the spinach with two-thirds of the dressing until every leaf is coated.",
      "Top with the sliced chicken, the remaining dressing and the rest of the parmesan shaved or grated over.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chicken-vegetable-soup",
    name: { en: "Chicken & Vegetable Soup", hindi: "चिकन एंड वेजिटेबल सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 550 }, // chicken thigh
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-2346400", grams: 150 }, // snap (green) beans
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the olive oil in a large pot over medium heat; cook the chopped onion for 5 minutes until soft and translucent.",
      "Add the garlic, carrots and potatoes; cook 3 minutes, stirring, so the vegetables take on the oil.",
      "Add the chicken thighs whole, the bay leaf, black pepper, salt and 1.4 litres of water; bring to a boil, then lower to a gentle simmer.",
      "Simmer for 25 minutes, skimming any foam in the first 10 minutes, until the chicken is very tender.",
      "Lift out the chicken; shred the meat with two forks, discarding the skin and any gristle, and return the meat to the pot.",
      "Add the beans cut into short lengths; simmer 5 minutes more until the beans are tender and the potato is soft at the edges.",
      "Remove the bay leaf, adjust the salt, rest 5 minutes, and serve in deep bowls.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chicken-black-bean-chili",
    name: { en: "Chicken & Black Bean Chili", hindi: "चिकन एंड ब्लैक बीन चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-173734", grams: 200 }, // black beans, dry
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-170923", grams: 4 }, // cumin seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the black beans overnight in plenty of water; drain, cover with fresh water, and simmer for 45–55 minutes until tender; keep the cooking liquid.",
      "Cut the chicken into 2 cm cubes; season with the salt and half the chili powder.",
      "Heat the oil in a heavy pot over medium-high heat; sear the chicken for 4–5 minutes until browned in spots; remove.",
      "In the same pot, cook the onion and green pepper for 5 minutes until soft; add the garlic, ground cumin and remaining chili powder for 1 minute until fragrant.",
      "Add the chopped tomato and cook 5 minutes until it breaks down into a thick sauce.",
      "Add the beans with about 300 ml of their cooking liquid and the chicken; simmer gently for 15 minutes until the chili is thick and the chicken is cooked through.",
      "Rest 5 minutes — the chili thickens as it stands — adjust the salt, and serve.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-creamy-garlic-chicken",
    name: { en: "Creamy Garlic Chicken", hindi: "क्रीमी गार्लिक चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-1750347", grams: 250 }, // mushrooms
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-325036", grams: 20 }, // parmesan
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the chicken breasts into cutlets; season with the salt and black pepper.",
      "Melt the butter in a large skillet over medium-high heat; sear the cutlets 3–4 minutes per side until golden and cooked through; set aside.",
      "In the same pan, cook the sliced mushrooms for 5 minutes until golden and their liquid has evaporated.",
      "Add the minced garlic; cook 1 minute until fragrant.",
      "Pour in the milk and bring to a gentle simmer, scraping the pan; simmer 3–4 minutes until the sauce coats the back of a spoon.",
      "Stir in the parmesan until melted, then the spinach until just wilted.",
      "Return the chicken to the pan for 1 minute to warm through in the sauce; serve with the sauce spooned over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-buffalo-chicken-strips",
    name: { en: "Buffalo-Style Chicken Strips", hindi: "बफ़ेलो-स्टाइल चिकन स्ट्रिप्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 350 }, // chicken breast
      { foodId: "usda-168936", grams: 40 }, // white wheat flour
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the chicken into long strips about 2 cm wide; toss with the salt and the flour until every strip is lightly coated.",
      "Heat a large skillet over medium-high heat with a film of the butter; cook the strips in a single layer for 3–4 minutes per side until crisp, golden and cooked through.",
      "Meanwhile melt the remaining butter in a small pan; whisk in the cayenne, vinegar and crushed garlic; warm for 30 seconds — the sauce should smell sharp and buttery, not boil.",
      "Tip the hot strips into a warm bowl; pour the buffalo sauce over and toss until every strip is glazed.",
      "Rest the strips on a warm plate for 2 minutes — the glaze sets onto the coating instead of pooling under it.",
      "Serve immediately while the coating is still crisp.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chicken-satay",
    name: { en: "Chicken Satay with Peanut Sauce", hindi: "चिकन साते विथ पीनट सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-172430", grams: 80 }, // peanuts
      { foodId: "usda-170172", grams: 100 }, // coconut milk
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Grind the cumin and coriander seeds; mix with the turmeric, half the salt, the grated ginger and garlic and the sesame oil into a paste.",
      "Cut the chicken into long thin strips; coat in the paste and thread onto skewers (soak wooden skewers in water for 30 minutes first); rest 30 minutes.",
      "For the sauce, blend the peanuts to a coarse paste; warm the coconut milk in a small pan, whisk in the peanut paste, sugar, lemon juice and remaining salt; simmer 3 minutes, whisking, until it thickens to a pouring sauce. Add a little water if it seizes.",
      "Grill the skewers over high heat (or in a smoking grill pan) for 3–4 minutes per side, turning until charred at the edges and cooked through.",
      "In the last minute of grilling, brush the skewers with a thin layer of the peanut sauce for a glossy coat — watch closely, the sauce's sugars catch and burn fast.",
      "Rest the skewers for 3 minutes; serve with the warm peanut sauce for dipping and spooning over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-intl-chicken-schnitzel",
    name: { en: "Chicken Schnitzel", hindi: "चिकन श्नित्ज़ेल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-168936", grams: 50 }, // white wheat flour
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Butterfly each chicken breast and pound between cling film to an even 5 mm thickness; season with the salt and black pepper.",
      "Set up three shallow plates: the flour; the eggs beaten with a tablespoon of water; and a second portion of the flour for the outer coat (divide the flour between the two plates).",
      "Coat each cutlet in flour, then egg, then flour again, pressing the outer coat on firmly; rest on a rack for 10 minutes so the crust sets.",
      "Heat the oil in a large skillet over medium-high heat until it shimmers; fry the schnitzels one or two at a time for 3 minutes per side, spooning hot oil over the top, until deep golden and crisp.",
      "Drain briefly on a rack (not paper, which steams the crust); the centre should read 74°C.",
      "Serve at once with the lemon cut into wedges for squeezing over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-roast-chicken-vegetables",
    name: { en: "Herb Roast Chicken & Vegetables", hindi: "हर्ब रोस्ट चिकन एंड वेजिटेबल्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171413", grams: 25 }, // olive oil
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the oven to 210°C. Cut the potatoes into 3 cm chunks, the carrots into thick batons and the onion into wedges.",
      "Toss the vegetables with half the olive oil, half the salt and the unpeeled garlic cloves, lightly crushed, in a large roasting pan; spread in a single layer.",
      "Rub the chicken thighs with the remaining oil, salt and the black pepper; lay them skin-side up over the vegetables.",
      "Roast for 35–40 minutes, turning the vegetables once halfway, until the chicken skin is crisp and deep gold and the juices run clear (74°C at the thickest part).",
      "Rest the pan for 5–10 minutes; squeeze the soft roasted garlic from its skins over the vegetables and toss through the pan juices.",
      "Serve the chicken over the vegetables with the juices spooned over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-intl-chicken-parmigiana",
    name: { en: "Chicken Parmigiana", hindi: "चिकन पार्मिजियाना" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-329370", grams: 100 }, // mozzarella
      { foodId: "usda-325036", grams: 20 }, // parmesan
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-168936", grams: 30 }, // white wheat flour
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Simmer the chopped tomato with the garlic, a pinch of the salt and half the olive oil for 10 minutes into a thick sauce; set aside.",
      "Pound the chicken breasts to an even 1 cm thickness; season with the remaining salt and the black pepper.",
      "Coat each breast in the flour, then the beaten egg, then the flour again, pressing the coat on.",
      "Heat the remaining oil in an oven-safe skillet over medium-high heat; fry the chicken for 3 minutes per side until golden and just cooked through.",
      "Spoon the tomato sauce over each breast, cover with the mozzarella slices and the grated parmesan.",
      "Grill (broil) for 3–4 minutes until the cheese is melted, bubbling and spotted with gold.",
      "Rest 2 minutes and serve straight from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-thai-green-chicken-curry",
    name: { en: "Thai-Style Green Chicken Curry", hindi: "थाई-स्टाइल ग्रीन चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-170497", grams: 15 }, // green hot chilli
      { foodId: "usda-169997", grams: 20 }, // fresh coriander leaves
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-2346400", grams: 150 }, // snap (green) beans
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Blend the green chillies, coriander leaves (stalks and all), ginger, garlic and cumin with 3 tablespoons of the coconut milk into a green paste.",
      "Heat the oil in a wok or pot over medium-high heat; fry the paste for 2–3 minutes, stirring, until it darkens a shade and smells aromatic.",
      "Add the chicken sliced into strips; stir-fry for 3 minutes until coated and sealed.",
      "Pour in the remaining coconut milk, the sugar and the salt; bring to a gentle simmer — do not boil hard or the milk will split.",
      "Add the beans cut short and the sliced mushrooms; simmer 5–6 minutes until the chicken is cooked through and the beans are tender-crisp.",
      "Take off the heat; stir in the lemon juice, adjust the salt and sugar balance (it should taste hot, salty, faintly sweet, then sour), and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-intl-chicken-enchilada-bake",
    name: { en: "Chicken Enchilada Bake", hindi: "चिकन एन्चिलाडा बेक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-168936", grams: 150 }, // white wheat flour
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-328637", grams: 80 }, // cheddar
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Make the tortillas: knead the flour with half the salt and about 90 ml warm water into a soft dough; rest 20 minutes, divide into 8, roll into thin rounds and cook on a dry hot tawa/skillet for 1 minute per side until puffed in spots. Wrap in a cloth.",
      "Poach the chicken in salted water for 12 minutes until just cooked; shred with two forks and keep 200 ml of the poaching liquid.",
      "For the sauce, cook the onion in the oil for 5 minutes; add the garlic, ground cumin and chili powder for 1 minute; add the chopped tomato and the poaching liquid; simmer 10 minutes into a thick sauce; season with the remaining salt.",
      "Heat the oven to 190°C. Spread a ladle of sauce in a baking dish.",
      "Fill each tortilla with chicken and a little cheddar; roll up and lay seam-down in the dish.",
      "Pour the remaining sauce over, scatter the rest of the cheddar, and bake for 15–18 minutes until bubbling and golden at the edges.",
      "Rest 5 minutes before serving so the rolls hold together.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-greek-chicken-souvlaki",
    name: { en: "Greek Chicken Souvlaki with Tzatziki", hindi: "ग्रीक चिकन सूवलाकी विथ ज़ाज़ीकी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-330137", grams: 250 }, // Greek yogurt
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-171413", grams: 20 }, // olive oil
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into 3 cm cubes; marinate for at least 30 minutes in 100 g of the Greek yogurt, half the crushed garlic, half the lemon juice, the olive oil, salt and black pepper.",
      "For the tzatziki, grate the cucumber, salt it lightly, rest 10 minutes, then squeeze out as much water as you can — this keeps the sauce thick.",
      "Fold the cucumber into the remaining yogurt with the rest of the garlic and lemon juice; chill.",
      "Thread the chicken onto skewers (soak wooden skewers first), leaving small gaps so the heat circulates.",
      "Grill over high heat for 10–12 minutes, turning every 3 minutes, until charred at the edges and cooked through (74°C).",
      "Rest 5 minutes; serve the skewers with the tzatziki spooned over and alongside.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* --------------------------- turkey & lamb --------------------------- */
  {
    id: "dish-intl-turkey-meatballs",
    name: { en: "Turkey Meatballs in Tomato Sauce", hindi: "टर्की मीटबॉल्स इन टोमैटो सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-168936", grams: 30 }, // white wheat flour
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-325036", grams: 30 }, // parmesan
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Mix the ground turkey with the beaten egg, flour, half the parmesan, half the salt and the black pepper until just combined — overworking makes meatballs dense.",
      "With wet hands, roll into 16 balls of about 40 g each; chill for 15 minutes so they hold their shape.",
      "Heat the olive oil in a wide pan over medium-high heat; brown the meatballs for 5–6 minutes, turning, until coloured on most sides; remove.",
      "In the same pan, cook the finely chopped onion for 5 minutes until soft; add the garlic for 30 seconds.",
      "Add the chopped tomato and 100 ml water; simmer 8 minutes into a sauce; season with the remaining salt.",
      "Return the meatballs to the sauce; cover and simmer gently for 12 minutes until cooked through (74°C at the centre) and the sauce is thick.",
      "Scatter the remaining parmesan over and serve.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-turkey-burgers",
    name: { en: "Turkey Burgers", hindi: "टर्की बर्गर" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 350 }, // ground turkey
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-168462", grams: 40 }, // spinach (as the wrap)
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Grate the onion and squeeze it dry — wet onion makes burgers fall apart. Mix with the turkey, egg white, crushed garlic, chili powder and salt.",
      "Divide into 4 patties about 1.5 cm thick, pressing a shallow dimple into the centre of each so they cook flat.",
      "Chill the patties for 15 minutes to firm up.",
      "Heat the oil in a skillet over medium-high heat; cook the patties for 4–5 minutes per side until deeply browned and cooked through (74°C at the centre) — turkey must never be pink.",
      "Rest 3 minutes on a warm plate.",
      "Serve each patty wrapped in the large spinach leaves, with the pan juices spooned over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-turkey-kidney-bean-chili",
    name: { en: "Turkey & Kidney Bean Chili", hindi: "टर्की एंड किडनी बीन चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 500 }, // ground turkey
      { foodId: "usda-175193", grams: 200 }, // kidney beans, dry
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-170923", grams: 4 }, // cumin seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-328637", grams: 40 }, // cheddar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight; drain, cover with fresh water, and simmer 50–60 minutes until completely tender; keep the cooking liquid.",
      "Heat the oil in a heavy pot over medium-high heat; brown the ground turkey for 6–7 minutes, breaking it into small crumbles, until it catches colour.",
      "Add the onion and green pepper; cook 5 minutes until soft.",
      "Add the garlic, ground cumin and chili powder; cook 1 minute until the spices smell toasted.",
      "Add the chopped tomato and cook 5 minutes until it breaks down and darkens.",
      "Add the beans with about 300 ml of their liquid and the salt; simmer gently for 20 minutes until thick and stew-like.",
      "Rest 5 minutes, scatter the grated cheddar over each serving, and serve.",
    ],
    timeMinutes: 80,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-garlic-herb-turkey-breast",
    name: { en: "Garlic-Herb Roast Turkey Breast", hindi: "गार्लिक-हर्ब रोस्ट टर्की ब्रेस्ट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 700 }, // turkey breast
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Take the turkey breast out of the fridge 30 minutes before cooking; pat dry and rub with the salt, black pepper and olive oil.",
      "Mash the softened butter with the crushed garlic into a paste; spread it over the top of the breast.",
      "Heat the oven to 190°C; set the breast in a roasting pan with the lemon, halved, beside it and 100 ml water in the pan.",
      "Roast for 40–45 minutes, basting twice with the pan juices, until the top is golden and the thickest part reads 74°C.",
      "Rest, loosely covered, for a full 10 minutes — turkey breast dries out if sliced hot.",
      "Slice across the grain and serve with the garlicky pan juices and the roasted lemon squeezed over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["oven", "fridge"],
  },
  {
    id: "dish-intl-turkey-vegetable-stir-fry",
    name: { en: "Turkey & Vegetable Stir-Fry", hindi: "टर्की एंड वेजिटेबल स्टर-फ़्राई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 500 }, // turkey breast
      { foodId: "usda-321900", grams: 300 }, // broccoli
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-2346400", grams: 150 }, // snap (green) beans
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Slice the turkey breast into thin strips; toss with half the sesame oil and half the salt; rest 10 minutes.",
      "Cut the broccoli into small florets, the carrots into batons and the beans into short lengths; slice the ginger into matchsticks and the garlic thinly.",
      "Heat a wok over high heat until smoking; sear the turkey in a single layer for 3–4 minutes until golden and just cooked; remove.",
      "Add the remaining oil; stir-fry the ginger and garlic for 20 seconds.",
      "Add the carrots and beans for 2 minutes, then the broccoli with 3 tablespoons of water; cover 1 minute to steam bright green.",
      "Return the turkey and its juices; toss 1 minute over high heat until glossy and cooked through.",
      "Scatter the sesame seeds over and serve immediately.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-turkey-taco-cups",
    name: { en: "Turkey Taco Cabbage Cups", hindi: "टर्की टैको कैबेज कप्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 500 }, // ground turkey
      { foodId: "usda-2346407", grams: 200 }, // cabbage (the cups)
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-328637", grams: 60 }, // cheddar
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Separate the cabbage into 8 large whole leaves; blanch in boiling salted water for 1 minute, drain and pat dry — they should bend without cracking.",
      "Heat the oil in a skillet over medium-high heat; brown the turkey for 6 minutes, breaking it into crumbles.",
      "Add the onion and cook 3 minutes; add the ground cumin, chili powder and salt for 1 minute until fragrant.",
      "Add half the chopped tomato; cook 3 minutes until the mixture is moist but not wet.",
      "Stir the lemon juice into the Greek yogurt for the crema.",
      "Spoon the turkey into the cabbage leaves; top with the remaining fresh tomato, the grated cheddar and a spoonful of the yogurt crema.",
      "Serve the cups open, to be folded and eaten by hand.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-turkey-stuffed-peppers",
    name: { en: "Turkey & Quinoa Stuffed Peppers", hindi: "टर्की एंड क्विनोआ स्टफ़्ड पेपर्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-170108", grams: 300 }, // red sweet peppers (the shells)
      { foodId: "usda-2514747", grams: 300 }, // ground turkey
      { foodId: "usda-168874", grams: 80 }, // quinoa, dry
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-329370", grams: 40 }, // mozzarella
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the quinoa in 160 ml salted water, covered, for 15 minutes; rest 5 minutes and fluff.",
      "Halve the peppers lengthways and remove the seeds, keeping the stalks on so the shells hold their shape.",
      "Heat the olive oil in a skillet; cook the onion for 3 minutes, then the turkey for 5–6 minutes, breaking it up, until browned and cooked through.",
      "Add the garlic and chopped tomato; cook 3 minutes until thick; stir in the quinoa and salt; cool slightly.",
      "Heat the oven to 190°C. Fill the pepper shells generously with the turkey-quinoa mixture, mounding the top.",
      "Cover the dish with foil and bake 20 minutes; uncover, scatter the mozzarella over, and bake 8–10 minutes more until the peppers are tender and the cheese is golden.",
      "Rest 5 minutes before serving.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-lamb-kofta",
    name: { en: "Lamb Kofta with Yogurt Sauce", hindi: "लैम्ब कोफ़्ता विथ योगर्ट सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // ground lamb
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-173475", grams: 10 }, // fresh mint
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Grate the onion and squeeze it very dry; grind the cumin and coriander seeds.",
      "Mix the lamb with the onion, garlic, ground spices, chili powder and half the salt; knead for 2 minutes until the mixture turns slightly sticky — this is what makes kofta tender, not crumbly.",
      "Divide into 8 and shape into torpedoes around skewers (or as patties); chill 20 minutes.",
      "Stir the Greek yogurt with the lemon juice, remaining salt, finely diced cucumber and torn mint into a sauce; chill.",
      "Brush the kofta with the oil; grill over high heat for 8–10 minutes, turning every 2 minutes, until charred in spots and cooked through (74°C).",
      "Rest 5 minutes; serve with the yogurt sauce spooned over and alongside.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-intl-shepherds-pie",
    name: { en: "Shepherd's Pie", hindi: "शेफ़र्ड्स पाई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // ground lamb
      { foodId: "usda-2346401", grams: 700 }, // potatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the potatoes in salted water for 15–18 minutes until completely tender; drain, then mash with the warm milk, butter and half the salt until smooth.",
      "Meanwhile brown the lamb in a heavy pan over medium-high heat for 6–7 minutes, breaking it up; spoon off all but a spoonful of the fat.",
      "Add the onion and carrots; cook 5 minutes until softening. Add the garlic and black pepper for 30 seconds.",
      "Add the chopped tomato and 100 ml water; simmer 10 minutes into a thick, rich filling; stir in the peas and the remaining salt.",
      "Heat the oven to 200°C. Spread the filling in a baking dish; spoon the mash over and rough it up with a fork so the ridges crisp.",
      "Bake for 20–25 minutes until the top is golden in ridges and the filling bubbles at the edges.",
      "Rest 10 minutes before serving — the pie slices cleanly once it settles.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* ---------------------------- fish & shrimp --------------------------- */
  {
    id: "dish-intl-grilled-salmon",
    name: { en: "Grilled Salmon with Lemon & Broccoli", hindi: "ग्रिल्ड सैल्मन विथ लेमन एंड ब्रोकली" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 350 }, // Atlantic salmon
      { foodId: "usda-321900", grams: 200 }, // broccoli
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Pat the salmon fillets completely dry — dry skin is what crisps. Season with the salt and black pepper and rub with half the olive oil and the crushed garlic.",
      "Cut the broccoli into florets; toss with the remaining oil and a pinch of salt.",
      "Heat a grill pan over medium-high heat until hot; lay the salmon in skin-side down and press gently for 10 seconds so the skin makes full contact.",
      "Cook undisturbed for 5–6 minutes until the skin is crisp and releases easily and the flesh has turned opaque two-thirds of the way up.",
      "Flip once and cook 1–2 minutes more — the centre should still be deep pink and just flaking; salmon overcooks in seconds.",
      "Grill the broccoli alongside for 4–5 minutes until charred at the edges and crisp-tender.",
      "Serve with the lemon cut into wedges for squeezing over both the fish and the broccoli.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-honey-garlic-salmon",
    name: { en: "Honey Garlic Salmon", hindi: "हनी गार्लिक सैल्मन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 350 }, // Atlantic salmon
      { foodId: "usda-169640", grams: 25 }, // honey
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the honey with the lemon juice, grated ginger and half the salt into a glaze.",
      "Season the salmon fillets with the remaining salt; melt the butter in a skillet over medium-high heat.",
      "Sear the salmon skin-side down for 5 minutes until the skin crisps; flip and cook 1 minute.",
      "Add the minced garlic to the pan for 30 seconds until fragrant, then pour in the honey glaze.",
      "Simmer 1–2 minutes, spooning the glaze over the fish repeatedly, until it turns glossy and sticky and the salmon is just cooked through.",
      "Serve at once with every drop of the pan glaze spooned over.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-salmon-green-beans-almonds",
    name: { en: "Salmon with Green Beans & Almonds", hindi: "सैल्मन विथ ग्रीन बीन्स एंड आल्मंड्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 350 }, // Atlantic salmon
      { foodId: "usda-2346400", grams: 250 }, // snap (green) beans
      { foodId: "usda-2346393", grams: 30 }, // almonds
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Toast the slivered or roughly chopped almonds in a dry pan over medium heat for 2–3 minutes until golden and fragrant; set aside — they burn in seconds once hot.",
      "Season the salmon with the salt; sear skin-side down in the same pan for 5–6 minutes until the skin is crisp; flip for 1 minute and set aside to rest.",
      "Blanch the beans in boiling salted water for 3 minutes until bright green and crisp-tender; drain well.",
      "Melt the butter in the pan; add the sliced garlic for 30 seconds, then the beans; toss for 1–2 minutes until glossy.",
      "Squeeze in the lemon juice, toss once, and pile the beans onto plates.",
      "Lay the salmon over the beans and scatter the toasted almonds on top.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-salmon-quinoa-bowl",
    name: { en: "Salmon Quinoa Bowl", hindi: "सैल्मन क्विनोआ बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 300 }, // Atlantic salmon
      { foodId: "usda-168874", grams: 100 }, // quinoa, dry
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the quinoa in 200 ml salted water, covered, for 15 minutes; rest 5 minutes and fluff.",
      "Season the salmon with the salt; sear in the olive oil over medium-high heat, skin-side down for 5 minutes, then 1 minute on the other side, until just cooked and flaking.",
      "Rest the salmon 3 minutes, then break into large flakes, discarding the skin.",
      "Slice the avocado and cucumber; wash and dry the spinach.",
      "Build the bowls: quinoa, then spinach, cucumber and avocado in sections, with the salmon flakes in the centre.",
      "Finish with the sesame seeds and the lemon juice squeezed over everything.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-blackened-salmon",
    name: { en: "Blackened Salmon with Sweet Potato", hindi: "ब्लैकन्ड सैल्मन विथ स्वीट पोटैटो" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 350 }, // Atlantic salmon
      { foodId: "usda-2346404", grams: 300 }, // sweet potatoes
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Heat the oven to 200°C. Cut the sweet potatoes into wedges, toss with half the salt, and roast for 25–30 minutes, turning once, until caramelised at the edges.",
      "Mix the chili powder, cayenne, black pepper, crushed garlic and remaining salt into a dry rub; coat the top and sides of the salmon fillets thickly.",
      "Heat a cast-iron skillet over high heat until it smokes; add the butter — it will foam and brown at once.",
      "Lay the salmon in spice-side down; cook 3–4 minutes without moving it until the crust is nearly black — that char is the dish, not a mistake.",
      "Flip and cook 1–2 minutes more until the centre is just opaque.",
      "Serve over the sweet potato wedges with the lemon wedges alongside to cut the heat.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-tuna-white-bean-salad",
    name: { en: "Tuna & White Bean Salad", hindi: "ट्यूना एंड व्हाइट बीन सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 240 }, // canned tuna in water, drained
      { foodId: "usda-173745", grams: 120 }, // navy beans, dry
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the navy beans overnight; simmer in fresh water for 45–55 minutes until completely tender; drain and cool to warm.",
      "Slice the onion very thin and soak it in cold water for 10 minutes — this takes off the raw bite; drain.",
      "Whisk the olive oil with the lemon juice, salt and black pepper into a dressing.",
      "Fold the warm beans through two-thirds of the dressing and rest 10 minutes so they absorb it.",
      "Add the tuna in large flakes (do not mash it), the onion, diced cucumber and tomato; fold gently with the remaining dressing.",
      "Scatter the coriander leaves over and serve at room temperature.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tuna-melt",
    name: { en: "Tuna Melt on Flatbread", hindi: "ट्यूना मेल्ट ऑन फ़्लैटब्रेड" },
    category: "main",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 120 }, // canned tuna in water, drained
      { foodId: "usda-328637", grams: 40 }, // cheddar
      { foodId: "usda-168936", grams: 60 }, // white wheat flour
      { foodId: "usda-330137", grams: 50 }, // Greek yogurt
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbread: knead the flour with half the salt and about 40 ml warm water into a soft dough; rest 15 minutes; roll into one large thin round and cook on a dry hot tawa/skillet for 1–2 minutes per side until puffed and spotted.",
      "Flake the tuna and mix with the Greek yogurt, finely chopped onion, remaining salt and black pepper.",
      "Pile the tuna mixture over the warm flatbread, spreading it to the edges.",
      "Cover with the grated or thinly sliced cheddar.",
      "Grill (broil) for 3–4 minutes until the cheese is melted, bubbling and golden in patches.",
      "Rest 1 minute, cut into wedges, and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-tuna-stuffed-peppers",
    name: { en: "Tuna & Quinoa Stuffed Peppers", hindi: "ट्यूना एंड क्विनोआ स्टफ़्ड पेपर्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 240 }, // canned tuna in water, drained
      { foodId: "usda-170108", grams: 300 }, // red sweet peppers (the shells)
      { foodId: "usda-329370", grams: 60 }, // mozzarella
      { foodId: "usda-168874", grams: 60 }, // quinoa, dry
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the quinoa in 120 ml salted water for 15 minutes; rest and fluff.",
      "Halve the peppers lengthways, remove the seeds, and brush the shells with a little of the olive oil.",
      "Heat the oven to 190°C; roast the empty shells for 10 minutes to soften while you make the filling.",
      "Cook the onion in the remaining oil for 3 minutes; add the garlic for 30 seconds; take off the heat.",
      "Fold in the quinoa, the tuna in flakes and the salt; mix gently so the tuna stays in pieces.",
      "Fill the pepper shells, top with the mozzarella, and bake for 12–15 minutes until the peppers are tender and the cheese is golden.",
      "Rest 5 minutes before serving.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-intl-tuna-egg-salad",
    name: { en: "Tuna & Egg Salad", hindi: "ट्यूना एंड एग सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 200 }, // canned tuna in water, drained
      { foodId: "usda-171287", grams: 200 }, // egg, whole (4 eggs)
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170929", grams: 2 }, // mustard seed, ground
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Lower the eggs into boiling water; cook for 9 minutes for firm yolks; cool in cold water and peel.",
      "Chop the eggs roughly — large pieces, not a mash.",
      "Whisk the Greek yogurt with the ground mustard, lemon juice, salt and black pepper into a dressing.",
      "Flake the tuna into a bowl; add the eggs, finely diced cucumber and onion.",
      "Fold the dressing through gently so the egg and tuna stay in pieces.",
      "Chill for at least 15 minutes so the flavours settle; adjust the salt and lemon before serving.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-sardines-on-flatbread",
    name: { en: "Sardines on Flatbread with Tomato", hindi: "सार्डीन्स ऑन फ़्लैटब्रेड विथ टोमैटो" },
    category: "main",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-175139", grams: 120 }, // sardines, canned in oil, drained
      { foodId: "usda-168936", grams: 50 }, // white wheat flour
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171413", grams: 5 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbread: knead the flour with a pinch of the salt and about 35 ml warm water into a soft dough; rest 15 minutes; roll thin and cook on a dry hot tawa/skillet for 1–2 minutes per side until puffed and spotted; brush with the olive oil.",
      "Slice the tomato and onion thinly; season the tomato with the remaining salt and rest 5 minutes.",
      "Lay the tomato slices over the warm flatbread.",
      "Arrange the sardines over the tomato in whole fillets, breaking them as little as possible.",
      "Scatter the onion and coriander leaves over, grind the black pepper on top, and finish with a generous squeeze of lemon.",
      "Serve at once, while the flatbread is still warm.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-intl-sardine-chickpea-salad",
    name: { en: "Sardine & Chickpea Salad", hindi: "सार्डीन एंड चिकपी सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175139", grams: 200 }, // sardines, canned in oil, drained
      { foodId: "usda-2644282", grams: 120 }, // chickpeas, dry
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight; simmer in fresh water for 45–60 minutes until tender; drain and cool to warm.",
      "Whisk the olive oil with the lemon juice and salt into a dressing; fold half through the warm chickpeas and rest 10 minutes.",
      "Chop the tomato and cucumber into chunks; slice the onion thinly.",
      "Add the tomato, cucumber and onion to the chickpeas with the remaining dressing; toss.",
      "Lay the sardines over the top in whole fillets.",
      "Scatter the coriander leaves over and serve at room temperature with extra lemon if you like.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-grilled-mackerel",
    name: { en: "Grilled Mackerel with Lemon & Potatoes", hindi: "ग्रिल्ड मैकेरल विथ लेमन एंड पोटैटोज़" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 350 }, // Atlantic mackerel
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the potatoes into wedges; boil in salted water for 8 minutes until just tender at the edges; drain and steam dry.",
      "Score the mackerel skin twice on each side; rub with the crushed garlic, salt, black pepper and half the olive oil.",
      "Heat a grill pan over high heat; grill the potatoes for 4–5 minutes, turning, until crisp and golden; keep warm.",
      "Grill the mackerel skin-side down for 4–5 minutes until the skin is crisp and the flesh is nearly opaque.",
      "Flip carefully and cook 1–2 minutes more — mackerel is rich and dries out if overcooked.",
      "Serve with the potatoes and the lemon wedges, squeezing lemon over the fish at the table.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-mackerel-potato-salad",
    name: { en: "Mackerel & Potato Salad", hindi: "मैकेरल एंड पोटैटो सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 300 }, // Atlantic mackerel
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt
      { foodId: "usda-170929", grams: 3 }, // mustard seed, ground
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Boil the potatoes in their skins in salted water for 15–18 minutes until tender; drain, peel while warm, and cut into chunks.",
      "Boil the eggs for 9 minutes; cool, peel and cut into wedges.",
      "Grill or sear the mackerel for 4 minutes skin-side down and 1 minute on the other side until just cooked; rest, then flake into large pieces, discarding skin and bones.",
      "Whisk the Greek yogurt with the ground mustard, lemon juice and salt into a dressing; thin with a spoonful of the warm potato water if needed.",
      "Fold the dressing through the warm potatoes with the finely chopped onion and diced cucumber; rest 10 minutes so the potatoes absorb it.",
      "Fold in the mackerel flakes gently, top with the egg wedges, and serve warm or at room temperature.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-baked-cod-tomatoes",
    name: { en: "Baked Cod with Tomatoes", hindi: "बेक्ड कॉड विथ टोमैटोज़" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 400 }, // Atlantic cod
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Heat the oven to 200°C. Slice the onion thinly and lay it in a baking dish with the olive oil; bake for 8 minutes until it begins to soften.",
      "Add the chopped tomato, sliced garlic, half the salt and the black pepper; stir and bake 8 minutes more until the tomato slumps into a sauce.",
      "Pat the cod fillets dry; season with the remaining salt and nestle them into the tomato sauce, spooning sauce over the top.",
      "Cover the dish loosely with foil so the cod steams gently in the tomato juices instead of drying at the edges.",
      "Bake for 12–15 minutes, lifting the foil off halfway, until the cod flakes into large, opaque pieces at the touch of a fork — cod is done the moment it flakes.",
      "Rest 3 minutes; squeeze the lemon over and serve with the tomato sauce spooned around.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-cod-corn-chowder",
    name: { en: "Cod & Corn Chowder", hindi: "कॉड एंड कॉर्न चाउडर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 550 }, // Atlantic cod
      { foodId: "usda-322892", grams: 400 }, // whole milk
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-2710826", grams: 200 }, // sweet corn kernels
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-168936", grams: 20 }, // white wheat flour
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Melt the butter in a large pot over medium heat; cook the finely chopped onion for 5 minutes until soft and sweet.",
      "Stir in the flour and cook 1 minute, stirring, until it smells faintly nutty.",
      "Pour in 600 ml water a little at a time, whisking to a smooth base; add the potatoes cut into small cubes, the salt and black pepper.",
      "Simmer for 10–12 minutes until the potato is tender and beginning to thicken the soup at the edges.",
      "Add the corn and the milk; bring back to the barest simmer — do not boil once the milk is in.",
      "Lay the cod, cut into large chunks, into the soup; poach gently for 5–6 minutes until it flakes.",
      "Rest 5 minutes off the heat; break a few potato pieces against the side of the pot to thicken further, adjust the salt, and serve.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-blackened-tilapia",
    name: { en: "Blackened Tilapia with Brown Rice", hindi: "ब्लैकन्ड तिलापिया विथ ब्राउन राइस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 350 }, // tilapia
      { foodId: "usda-2512380", grams: 120 }, // brown rice, dry
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the brown rice in 300 ml salted water, covered, on low heat for 30 minutes; rest 10 minutes off the heat and fluff.",
      "Mix the chili powder, cayenne, crushed garlic and salt; pat the tilapia fillets dry and coat both sides thickly with the spice mix.",
      "Heat a cast-iron skillet over high heat until smoking; add the butter.",
      "Lay the fillets in and cook for 3 minutes without moving them, until the crust is dark and nearly black.",
      "Flip and cook 2 minutes more until the fish flakes easily and is opaque throughout.",
      "Serve over the brown rice with the lemon wedges and the pan butter spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tilapia-tacos",
    name: { en: "Tilapia Tacos with Cabbage", hindi: "तिलापिया टैकोज़ विथ कैबेज" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 300 }, // tilapia
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-168936", grams: 100 }, // white wheat flour
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make the tortillas: knead the flour with a pinch of the salt and about 65 ml warm water into a soft dough; rest 20 minutes; divide into 4, roll thin, and cook on a dry hot skillet for 1 minute per side until puffed in spots; wrap in a cloth.",
      "Shred the cabbage finely; toss with a pinch of salt and half the lemon juice; rest so it softens slightly.",
      "Mix the Greek yogurt with the remaining lemon juice into a crema.",
      "Coat the tilapia fillets with the chili powder and remaining salt; sear in the hot oil for 3 minutes per side until crisp-edged and flaking; break into large chunks.",
      "Fill each warm tortilla with cabbage, fish chunks and diced tomato.",
      "Drizzle the yogurt crema over and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-oat-crusted-haddock",
    name: { en: "Oat-Crusted Haddock", hindi: "ओट-क्रस्टेड हैडॉक" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-333374", grams: 350 }, // haddock
      { foodId: "usda-2346396", grams: 40 }, // rolled oats
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Blitz or crush the oats to a coarse crumb — not flour; a rough crumb is what crisps. Mix with the crushed garlic and half the salt.",
      "Pat the haddock fillets dry; season with the remaining salt.",
      "Dip each fillet in the beaten egg white, then press firmly into the oat crumbs until thickly coated on both sides; rest 10 minutes so the crust sets.",
      "Melt the butter in a skillet over medium heat until foaming; lay the fillets in.",
      "Cook for 3–4 minutes per side until the crust is deep golden and the fish flakes at the centre.",
      "Serve at once with the lemon wedges — the crust softens as it stands.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-mediterranean-fish-stew",
    name: { en: "Mediterranean Fish Stew", hindi: "मेडिटरेनियन फ़िश स्ट्यू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // Atlantic cod
      { foodId: "usda-173745", grams: 100 }, // navy beans, dry
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171413", grams: 20 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the navy beans overnight; simmer in fresh water for 45–55 minutes until tender; drain, keeping 300 ml of the cooking liquid.",
      "Heat the olive oil in a heavy pot; cook the onion for 5 minutes until soft; add the garlic and black pepper for 30 seconds.",
      "Add the chopped tomato and cook 6–8 minutes into a thick sauce.",
      "Add the potatoes cut into chunks, the beans and their liquid plus water to cover; simmer 12 minutes until the potato is nearly tender.",
      "Season with the salt; lay the cod in large chunks over the stew, spoon sauce over them, cover, and poach gently for 6–8 minutes — do not stir or the fish will break.",
      "Rest 5 minutes off the heat; serve in bowls with the fish in whole pieces and plenty of the broth.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-shrimp-scampi",
    name: { en: "Shrimp Scampi with Garlic Flatbread", hindi: "श्रिम्प स्कैम्पी विथ गार्लिक फ़्लैटब्रेड" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-168936", grams: 80 }, // white wheat flour
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make two flatbreads: knead the flour with a pinch of the salt and about 55 ml warm water into a soft dough; rest 15 minutes; roll thin and cook on a dry hot skillet for 1–2 minutes per side until puffed and spotted.",
      "Rub the hot flatbreads with a cut clove from the garlic and keep warm wrapped in a cloth.",
      "Pat the shrimp completely dry; season with the remaining salt and the black pepper.",
      "Melt the butter in a large skillet over medium-high heat; add the sliced garlic for 30 seconds until fragrant but not brown.",
      "Add the shrimp in a single layer; cook 1½–2 minutes per side until they curl into a C and turn pink and opaque — a tight O means they are overcooked.",
      "Take off the heat; add the lemon juice and swirl the pan so the butter and lemon form a sauce.",
      "Serve the shrimp and every drop of sauce with the garlic flatbreads for mopping up.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-garlic-shrimp-broccoli",
    name: { en: "Garlic Shrimp & Broccoli Stir-Fry", hindi: "गार्लिक श्रिम्प एंड ब्रोकली स्टर-फ़्राई" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-321900", grams: 250 }, // broccoli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Pat the shrimp dry; toss with half the salt and the cayenne.",
      "Cut the broccoli into small florets; slice the ginger and garlic thinly.",
      "Heat a wok over high heat until smoking; add half the sesame oil and sear the shrimp for 1½ minutes per side until pink and just curled; remove at once.",
      "Add the remaining oil; stir-fry the ginger and garlic for 20 seconds.",
      "Add the broccoli with 3 tablespoons of water; stir-fry 2–3 minutes until bright green and crisp-tender.",
      "Return the shrimp with its juices and the lemon juice; toss for 30 seconds over high heat.",
      "Scatter the sesame seeds over and serve immediately.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-shrimp-fajitas",
    name: { en: "Shrimp Fajitas", hindi: "श्रिम्प फ़हीता" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Toss the shrimp with half the chili powder, half the ground cumin and half the salt; rest 10 minutes.",
      "Slice the peppers and onion into strips.",
      "Heat a cast-iron pan over high heat until smoking; add half the oil and sear the shrimp for 1½ minutes per side until pink and curled; remove.",
      "Add the remaining oil; cook the peppers and onion on high heat for 3–4 minutes until blistered in spots but still crisp.",
      "Return the shrimp with the remaining chili powder and cumin; toss for 30 seconds.",
      "Squeeze the lemon over everything and serve straight from the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-shrimp-coconut-curry",
    name: { en: "Shrimp Coconut Curry", hindi: "श्रिम्प कोकोनट करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 500 }, // shrimp (prawns)
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-2346400", grams: 150 }, // snap (green) beans
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170924", grams: 6 }, // curry powder
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Heat the oil in a wok or pot over medium-high heat; fry the grated ginger and garlic for 30 seconds.",
      "Add the curry powder and fry for 30 seconds more until the oil colours.",
      "Pour in the coconut milk with the sugar and salt; bring to a gentle simmer — never a hard boil, which splits the milk.",
      "Add the red pepper strips and beans cut short; simmer 3 minutes until nearly tender.",
      "Add the shrimp; simmer gently for 2–3 minutes until they turn pink and curl into a C.",
      "Take off the heat at once — shrimp keep cooking in the hot curry — stir in the lemon juice, adjust the salt, and serve.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-shrimp-egg-fried-rice",
    name: { en: "Shrimp & Egg Fried Rice", hindi: "श्रिम्प एंड एग फ़्राइड राइस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 200 }, // shrimp (prawns)
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-2512381", grams: 120 }, // white rice, dry
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the rice in 220 ml salted water; spread it on a plate to cool and dry for at least 20 minutes — cold, dry rice is what fries without clumping (day-old rice is ideal).",
      "Beat the eggs with a pinch of the salt. Heat half the sesame oil in a wok over high heat; scramble the eggs in large soft curds for 1 minute; remove while still slightly runny.",
      "Add the remaining oil; sear the shrimp for 1½ minutes until pink; remove.",
      "Stir-fry the ginger, garlic, finely diced carrots and peas for 2 minutes.",
      "Add the rice; stir-fry for 3 minutes, pressing it against the hot wok, until the grains are separate and lightly toasted in spots.",
      "Return the eggs and shrimp with the remaining salt; toss for 1 minute, breaking the eggs into ribbons through the rice.",
      "Serve immediately, straight from the wok.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-mixed-seafood-stew",
    name: { en: "Mixed Seafood Stew", hindi: "मिक्स्ड सीफ़ूड स्ट्यू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 300 }, // Atlantic cod
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 18 }, // olive oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the olive oil in a heavy pot; cook the onion for 5 minutes until soft and golden at the edges.",
      "Add the garlic, chili powder and black pepper for 30 seconds.",
      "Add the chopped tomato and 200 ml water; simmer 10 minutes into a rich sauce; season with the salt.",
      "Cut the cod into large chunks; lay them into the sauce and poach gently, covered, for 4 minutes.",
      "Add the shrimp on top; cover and poach 2–3 minutes more until the shrimp are pink and the cod flakes — do not stir, shake the pot gently instead.",
      "Rest off the heat for 5 minutes; add the lemon juice and serve in bowls with plenty of broth.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tuna-quinoa-salad",
    name: { en: "Tuna, Egg & Quinoa Salad", hindi: "ट्यूना, एग एंड क्विनोआ सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 200 }, // canned tuna in water, drained
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-168874", grams: 100 }, // quinoa, dry
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the quinoa in 200 ml salted water for 15 minutes; rest 5 minutes, fluff, and cool to warm.",
      "Boil the eggs for 9 minutes; cool, peel and cut into wedges.",
      "Whisk the olive oil with the lemon juice and salt into a dressing; fold half through the warm quinoa.",
      "Add the diced cucumber, tomato and finely chopped onion to the quinoa; toss.",
      "Flake the tuna over the top in large pieces with the remaining dressing.",
      "Arrange the egg wedges over, and serve at room temperature.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ egg mains ----------------------------- */
  {
    id: "dish-intl-shakshuka",
    name: { en: "Shakshuka", hindi: "शकशुका" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole (6 eggs)
      { foodId: "usda-172183", grams: 132 }, // egg white (4 whites)
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Heat the olive oil in a wide skillet over medium heat; cook the onion and red pepper strips for 6–7 minutes until soft and sweet.",
      "Add the garlic, ground cumin and chili powder; cook 1 minute until fragrant.",
      "Add the chopped tomato and half the salt; simmer 10–12 minutes, crushing the tomato with a spoon, until the sauce is thick and dark red and the oil glistens at the edges.",
      "Whisk the egg whites lightly with the remaining salt — they stretch the eggs across the pan without thinning the dish.",
      "Make 6 wells in the sauce; crack a whole egg into each and spoon the whites around them.",
      "Cover and cook on low heat for 5–7 minutes until the whites are just set and the yolks are still runny and glossy.",
      "Rest 2 minutes off the heat and serve straight from the pan, scooping sauce and egg together.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-crustless-quiche",
    name: { en: "Crustless Spinach & Cheddar Quiche", hindi: "क्रस्टलेस स्पिनच एंड चेडर कीश" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 500 }, // egg, whole (10 eggs)
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-328637", grams: 120 }, // cheddar
      { foodId: "usda-168462", grams: 200 }, // spinach
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Heat the oven to 170°C. Wilt the spinach in a dry pan for 2 minutes; squeeze it very dry and chop roughly — wet spinach makes a soggy quiche.",
      "Cook the sliced mushrooms and onion in the same pan for 5 minutes until their liquid evaporates and they colour slightly; cool a little.",
      "Whisk the eggs with the milk, salt and black pepper until evenly combined.",
      "Scatter the spinach, mushrooms and onion in a greased baking dish; pour the egg mixture over; top with the grated cheddar.",
      "Bake for 30–35 minutes until the centre is just set with a slight wobble and the top is golden.",
      "Rest 10 minutes before cutting — the quiche finishes setting as it stands.",
      "Serve warm or at room temperature in thick wedges.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-egg-quinoa-fried-rice",
    name: { en: "Egg & Vegetable Quinoa Fried Rice", hindi: "एग एंड वेजिटेबल क्विनोआ फ़्राइड राइस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // egg, whole (4 eggs)
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-168410", grams: 100 }, // edamame
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the quinoa in 240 ml salted water for 15 minutes; spread on a plate to cool and dry for 15 minutes — dry grains fry, wet grains steam.",
      "Beat the eggs with a pinch of the salt. Heat half the sesame oil in a wok over high heat; scramble the eggs into large soft curds for 1 minute; remove.",
      "Add the remaining oil; stir-fry the ginger, garlic and finely diced carrots for 2 minutes.",
      "Add the edamame and peas; stir-fry 2 minutes until bright and hot.",
      "Add the quinoa; stir-fry 3 minutes, pressing it against the hot wok, until the grains are separate and toasty in spots.",
      "Return the eggs with the remaining salt; toss for 1 minute, breaking the eggs into ribbons.",
      "Serve immediately.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-spanish-potato-tortilla",
    name: { en: "Spanish Potato Tortilla", hindi: "स्पैनिश पोटैटो टॉर्टिया" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 500 }, // egg, whole (10 eggs)
      { foodId: "usda-172183", grams: 264 }, // egg white (8 whites)
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171413", grams: 30 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the potatoes thinly (3 mm) and the onion into half-moons.",
      "Warm the olive oil in a 24 cm non-stick skillet over medium-low heat; add the potatoes, onion and half the salt; cook gently for 18–20 minutes, turning occasionally, until the potatoes are completely tender and silky but not browned — they should poach in the oil, not fry.",
      "Drain the potato mixture through a sieve, keeping the oil; cool for 5 minutes.",
      "Whisk the eggs and egg whites with the remaining salt; fold in the warm potatoes and rest 10 minutes — the mixture should look like more potato than egg.",
      "Wipe the pan, add a film of the reserved oil, and heat over medium heat; pour in the mixture and shake the pan gently.",
      "Cook for 5–6 minutes until the edges are set and the centre is still wet on top; place a plate over the pan, flip the tortilla onto it in one confident motion, then slide it back into the pan uncooked-side down.",
      "Cook 3–4 minutes more until just set through with the faintest wobble in the centre.",
      "Slide onto a plate and rest 10 minutes; serve warm or at room temperature in wedges.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-menemen",
    name: { en: "Menemen with Mozzarella", hindi: "मेनेमेन विथ मोज़ेरेला" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 350 }, // egg, whole (7 eggs)
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-329370", grams: 40 }, // mozzarella
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Melt the butter in a wide pan over medium heat; cook the finely chopped onion and green pepper for 5–6 minutes until soft and sweet.",
      "Add the chili powder for 30 seconds, then the grated or finely chopped tomato and the salt.",
      "Simmer for 8–10 minutes, stirring now and then, until the tomato is thick, jammy and dark red — menemen fails when the tomato stays watery.",
      "Lower the heat; pour in the beaten eggs and stir slowly with a spoon, folding the sauce through the eggs.",
      "Cook 3–4 minutes, stirring gently, until the eggs are soft curds still glossy with sauce — they should look slightly underdone; they finish in the pan's heat.",
      "Scatter the mozzarella over, cover for 1 minute until it melts into strands, and serve straight from the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: true,
    enrichment: "Mozzarella melted over the top — a boosted menemen, not the plain egg-and-tomato pan.",
    equipment: ["stove"],
  },
  /* ------------------------- tofu, tempeh & soy ------------------------- */
  {
    id: "dish-intl-tofu-edamame-stir-fry",
    name: { en: "Tofu & Edamame Stir-Fry", hindi: "टोफ़ू एंड एडामामे स्टर-फ़्राई" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 400 }, // tofu, firm
      { foodId: "usda-168410", grams: 100 }, // edamame
      { foodId: "usda-321900", grams: 250 }, // broccoli
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-2346400", grams: 100 }, // snap (green) beans
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Press the tofu between plates with a weight for 15 minutes to drive out water — dry tofu browns, wet tofu steams. Cut into 2 cm cubes and toss with half the salt and the cayenne.",
      "Heat a wok over high heat; add half the sesame oil and sear the tofu in a single layer for 4–5 minutes, turning once or twice, until golden on most sides; remove.",
      "Add the remaining oil; stir-fry the ginger matchsticks and garlic for 20 seconds.",
      "Add the carrots and beans for 2 minutes, then the broccoli florets and edamame with 3 tablespoons of water; cover 1 minute to steam bright green.",
      "Return the tofu; toss for 1 minute over high heat until everything is glossy.",
      "Scatter the sesame seeds over and serve immediately.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tofu-coconut-curry",
    name: { en: "Tofu Coconut Curry", hindi: "टोफ़ू कोकोनट करी" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 500 }, // tofu, firm
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170924", grams: 6 }, // curry powder
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Press the tofu for 15 minutes, cut into 2 cm cubes, and sear in half the oil over medium-high heat for 4–5 minutes until golden on most sides; set aside.",
      "In the same pan, add the remaining oil; cook the onion for 4 minutes until soft; add the grated ginger and garlic for 30 seconds.",
      "Add the curry powder for 30 seconds until fragrant, then the chopped tomato; cook 4 minutes into a thick base.",
      "Pour in the coconut milk and the salt; bring to a gentle simmer — do not boil hard.",
      "Return the tofu; simmer 4 minutes so it drinks in the curry.",
      "Stir in the spinach until just wilted, about 1 minute; rest 2 minutes and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tempeh-green-bean-stir-fry",
    name: { en: "Tempeh & Green Bean Stir-Fry", hindi: "टेम्पेह एंड ग्रीन बीन स्टर-फ़्राई" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 300 }, // tempeh
      { foodId: "usda-2346400", grams: 200 }, // snap (green) beans
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the tempeh into thin triangles or batons about 5 mm thick — thin pieces crisp best.",
      "Heat half the sesame oil in a wok over medium-high heat; fry the tempeh for 4–5 minutes, turning, until deep golden and crisp at the edges; remove.",
      "Add the remaining oil; stir-fry the ginger and garlic for 20 seconds.",
      "Add the beans cut short with 2 tablespoons of water; stir-fry 3 minutes until bright green and crisp-tender.",
      "Return the tempeh with the cayenne, salt and lemon juice; toss for 1 minute until glossy.",
      "Scatter the sesame seeds over and serve at once.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tempeh-coconut-curry",
    name: { en: "Tempeh Coconut Curry", hindi: "टेम्पेह कोकोनट करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 500 }, // tempeh
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-2685573", grams: 300 }, // cauliflower
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-171411", grams: 15 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the tempeh into 2 cm cubes; fry in half the oil over medium-high heat for 5 minutes until golden on most sides; set aside.",
      "In the same pot, add the remaining oil; cook the onion for 5 minutes until soft and golden at the edges.",
      "Add the grated ginger and garlic for 30 seconds, then the curry powder for 30 seconds more.",
      "Pour in the coconut milk and 150 ml water with the salt; bring to a gentle simmer.",
      "Add the cauliflower florets; simmer 8 minutes until nearly tender.",
      "Return the tempeh; simmer 3 minutes so it absorbs the curry.",
      "Stir in the spinach until just wilted; rest 2 minutes and serve.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tempeh-taco-cups",
    name: { en: "Tempeh Taco Cabbage Cups", hindi: "टेम्पेह टैको कैबेज कप्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 300 }, // tempeh
      { foodId: "usda-2346407", grams: 150 }, // cabbage (the cups)
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-330137", grams: 60 }, // Greek yogurt
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Separate the cabbage into 4–6 large whole leaves; blanch in boiling salted water for 1 minute; drain and pat dry.",
      "Crumble the tempeh into small, mince-like pieces with your hands.",
      "Heat a dry skillet over medium-high heat; cook the tempeh crumbles for 5–6 minutes, stirring, until browned and crisp in spots — let them sit undisturbed between stirs so they colour.",
      "Add the ground cumin, chili powder and salt with 3 tablespoons of water; cook 2 minutes until the spices coat the crumbles and the pan is nearly dry.",
      "Stir the lemon juice into the Greek yogurt for the crema; dice the tomato and avocado.",
      "Spoon the tempeh into the cabbage leaves; top with tomato, avocado and the yogurt crema; serve to be folded and eaten by hand.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tempeh-bolognese",
    name: { en: "Tempeh Bolognese over Quinoa", hindi: "टेम्पेह बोलोनेज़ ओवर क्विनोआ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 500 }, // tempeh
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the quinoa in 240 ml salted water for 15 minutes; rest and fluff; keep warm.",
      "Crumble the tempeh into small pieces. Heat the olive oil in a heavy pot over medium-high heat; cook the tempeh for 6–7 minutes, stirring now and then, until browned in spots.",
      "Add the finely chopped onion and carrots; cook 5 minutes until soft.",
      "Add the garlic and black pepper for 30 seconds.",
      "Add the chopped tomato, salt and 100 ml water; simmer gently for 15 minutes, crushing the tomato, until the sauce is thick and rich and coats the tempeh like a ragù.",
      "Rest 5 minutes; serve spooned generously over the quinoa.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-edamame-quinoa-bowl",
    name: { en: "Edamame Quinoa Bowl", hindi: "एडामामे क्विनोआ बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 300 }, // edamame
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the quinoa in 240 ml salted water for 15 minutes; rest 5 minutes and fluff.",
      "Boil the edamame in salted water for 3–4 minutes until bright green and just tender; drain and refresh under cold water so they stay green.",
      "Whisk the sesame oil with the lemon juice and remaining salt into a dressing.",
      "Slice the avocado, dice the cucumber and cut the carrots into fine matchsticks.",
      "Build the bowls: quinoa first, then edamame, avocado, cucumber and carrot in sections.",
      "Drizzle the dressing over and finish with the sesame seeds.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-soybean-tomato-chili",
    name: { en: "Soybean & Tomato Chili", hindi: "सोयाबीन एंड टोमैटो चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174270", grams: 250 }, // soybeans, dry
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-170923", grams: 4 }, // cumin seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-328637", grams: 40 }, // cheddar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the soybeans overnight in plenty of water; drain, cover with fresh water, and simmer for 60–75 minutes until completely tender (soybeans take longer than other beans); keep 300 ml of the cooking liquid.",
      "Heat the oil in a heavy pot; cook the onion and green pepper for 5 minutes until soft.",
      "Add the garlic, ground cumin and chili powder; cook 1 minute until toasted and fragrant.",
      "Add the chopped tomato; cook 6 minutes until it breaks down and darkens.",
      "Add the soybeans with their liquid and the salt; simmer gently for 20 minutes until thick and stew-like.",
      "Rest 5 minutes; scatter the grated cheddar over each serving and serve.",
    ],
    timeMinutes: 95,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tofu-oat-meatballs",
    name: { en: "Tofu & Oat Meatballs in Tomato Sauce", hindi: "टोफ़ू एंड ओट मीटबॉल्स इन टोमैटो सॉस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 400 }, // tofu, firm
      { foodId: "usda-2346396", grams: 60 }, // rolled oats
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-325036", grams: 20 }, // parmesan
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Press the tofu for 20 minutes, then crumble it finely into a bowl.",
      "Mix with the oats, beaten egg, grated onion, garlic, parmesan and salt; rest 15 minutes so the oats absorb the moisture and bind the mixture.",
      "With wet hands, roll into 8 balls; chill 15 minutes.",
      "Simmer the chopped tomato with a pinch of salt and 100 ml water for 8 minutes into a sauce.",
      "Heat the olive oil in a skillet; brown the meatballs for 5–6 minutes, turning gently, until golden on most sides.",
      "Slide the meatballs into the tomato sauce; cover and simmer gently for 8 minutes until firm and cooked through.",
      "Serve with the sauce spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-mapo-style-tofu",
    name: { en: "Mapo-Style Tofu with Turkey", hindi: "मापो-स्टाइल टोफ़ू विथ टर्की" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 400 }, // tofu, firm
      { foodId: "usda-2514747", grams: 150 }, // ground turkey
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the tofu into 2 cm cubes; blanch in salted boiling water for 2 minutes and drain gently — this firms the cubes so they hold in the sauce.",
      "Heat the sesame oil in a wok over high heat; brown the ground turkey for 4–5 minutes, breaking it into small crumbles, until it catches colour.",
      "Add the grated ginger and garlic for 30 seconds, then the chili powder and cayenne for 30 seconds more until the oil turns red.",
      "Add 200 ml water and the salt; bring to a simmer.",
      "Slide the tofu cubes in gently; simmer 4 minutes, shaking the wok rather than stirring, so the tofu drinks in the sauce without breaking.",
      "Rest 2 minutes — the sauce clings better as it cools slightly — and serve.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tempeh-burger-patties",
    name: { en: "Tempeh Burger Patties", hindi: "टेम्पेह बर्गर पैटीज़" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 300 }, // tempeh
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-168936", grams: 20 }, // white wheat flour
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Steam or simmer the tempeh in water for 10 minutes — this removes its bitterness and softens it for mashing; drain and cool slightly.",
      "Mash the tempeh coarsely with a fork, leaving small chunks for texture.",
      "Mix with the egg white, flour, finely chopped onion, garlic, chili powder and salt until it holds together when squeezed.",
      "Shape into 4 patties about 1.5 cm thick; chill 20 minutes to firm.",
      "Heat the oil in a skillet over medium heat; cook the patties for 4 minutes per side until deep golden and crisp at the edges.",
      "Rest 2 minutes and serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-tofu-cabbage-cups",
    name: { en: "Tofu & Mushroom Cabbage Cups", hindi: "टोफ़ू एंड मशरूम कैबेज कप्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 400 }, // tofu, firm
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-2346407", grams: 150 }, // cabbage (the cups)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-172430", grams: 40 }, // peanuts
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Separate the cabbage into 4–6 large whole leaves; blanch in boiling salted water for 1 minute; drain and pat dry.",
      "Press the tofu for 15 minutes; crumble it into small pieces.",
      "Heat a wok over high heat with half the sesame oil; cook the tofu crumbles for 5 minutes, stirring now and then, until golden in spots; remove.",
      "Add the remaining oil; stir-fry the finely chopped mushrooms for 3 minutes until their liquid evaporates and they brown.",
      "Add the ginger, garlic and cayenne for 20 seconds; return the tofu with the salt and lemon juice; toss 1 minute.",
      "Spoon the mixture into the cabbage leaves, scatter the roughly crushed peanuts over, and serve to be folded and eaten by hand.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-pad-thai-style-tofu",
    name: { en: "Pad Thai-Style Noodles with Tofu & Egg", hindi: "पैड थाई-स्टाइल नूडल्स विथ टोफ़ू एंड एग" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-169714", grams: 100 }, // rice flour (for the noodle sheets)
      { foodId: "usda-172448", grams: 400 }, // tofu, firm
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-172430", grams: 40 }, // peanuts
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green hot chilli
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make the noodle sheets: whisk the rice flour with 220 ml water and a pinch of the salt into a thin batter; rest 15 minutes.",
      "Brush a flat plate or tray with a film of oil; pour in a thin layer of batter and steam over boiling water for 2–3 minutes until set and translucent; slide the sheet off, repeat with the remaining batter, then cut the stacked sheets into 1 cm ribbons.",
      "Soak the tamarind in 100 ml warm water for 10 minutes; squeeze and strain the pulp; stir in the sugar and remaining salt until dissolved.",
      "Press the tofu, cut into batons, and sear in half the oil over medium-high heat for 4 minutes until golden; remove.",
      "Add the remaining oil to the wok; scramble the beaten eggs into ribbons for 1 minute.",
      "Add the noodle ribbons and the tamarind sauce; toss over high heat for 1–2 minutes until the noodles are glossy and have drunk in the sauce.",
      "Return the tofu with the garlic and sliced green chilli; toss 30 seconds. Serve with the lemon wedges and the crushed peanuts scattered over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------- beans, lentils & grains ------------------------- */
  {
    id: "dish-intl-black-bean-burrito-bowl",
    name: { en: "Black Bean Burrito Bowl", hindi: "ब्लैक बीन बुरिटो बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 190 }, // black beans, dry
      { foodId: "usda-2512380", grams: 120 }, // brown rice, dry
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the black beans for 8 hours or overnight; drain, cover with fresh water, and simmer for 45–60 minutes until completely tender; keep them in their liquid.",
      "Cook the brown rice in 300 ml salted water for 35 minutes; rest 10 minutes and fluff.",
      "Stir the ground cumin, chili powder and salt into the beans with a ladle of their liquid; simmer 5 minutes until saucy.",
      "Dice the tomato and onion finely; slice the avocado.",
      "Build the bowls: rice first, then the beans with their sauce, tomato, onion and avocado in sections.",
      "Squeeze the lemon juice over and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-lentil-bolognese",
    name: { en: "Lentil Bolognese over Quinoa", hindi: "लेंटिल बोलोनेज़ ओवर क्विनोआ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 360 }, // lentils, dry
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-325036", grams: 40 }, // parmesan
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the quinoa in 240 ml salted water for 15 minutes; rest and fluff; keep warm.",
      "Simmer the lentils in plenty of water for 20–25 minutes until just tender; drain, keeping 200 ml of the cooking water.",
      "Heat the olive oil in a heavy pot; cook the finely chopped onion and carrots for 6 minutes until soft and sweet.",
      "Add the garlic for 30 seconds, then the chopped tomato and salt; cook 8 minutes into a sauce.",
      "Add the lentils with their cooking water; simmer 10 minutes, crushing some lentils against the side so the sauce turns thick and ragù-like.",
      "Rest 5 minutes; serve over the quinoa with the parmesan scattered over.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-chickpea-spinach-stew",
    name: { en: "Spanish Chickpea & Spinach Stew", hindi: "स्पैनिश चिकपी एंड स्पिनच स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 440 }, // chickpeas, dry
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171413", grams: 20 }, // olive oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-2346393", grams: 30 }, // almonds
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the chickpeas for 10–12 hours; drain, cover with fresh water, and simmer for 60–75 minutes until completely tender; keep 300 ml of the cooking liquid.",
      "Toast the almonds in a dry pan until golden; crush roughly.",
      "Heat the olive oil in a wide pot; cook the onion for 6 minutes until golden; add the garlic and ground cumin for 30 seconds.",
      "Add the spinach a handful at a time; cook 3 minutes until fully wilted.",
      "Add the chickpeas with their liquid and the salt; simmer 10 minutes, mashing a ladleful of chickpeas against the side to thicken the stew.",
      "Scatter the toasted almonds over and serve.",
    ],
    timeMinutes: 95,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-tuscan-white-bean-soup",
    name: { en: "Tuscan White Bean & Spinach Soup", hindi: "टस्कन व्हाइट बीन एंड स्पिनच सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 420 }, // navy beans, dry
      { foodId: "usda-168462", grams: 200 }, // spinach (kale is not in the reference set)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-325036", grams: 30 }, // parmesan
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the navy beans for 8 hours or overnight; drain and set aside.",
      "Heat the olive oil in a heavy pot; cook the onion and diced carrots for 6 minutes until soft.",
      "Add the garlic for 30 seconds, then the beans and 1.2 litres of water with the salt.",
      "Simmer gently for 50–60 minutes until the beans are completely tender.",
      "Mash a ladleful of beans against the side of the pot and stir back in — this makes the broth creamy without cream.",
      "Stir the spinach in a handful at a time; simmer 2 minutes until wilted and dark green.",
      "Rest 5 minutes; scatter the parmesan over each bowl and serve.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-three-bean-quinoa-chili",
    name: { en: "Three-Bean & Quinoa Chili", hindi: "थ्री-बीन एंड क्विनोआ चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 140 }, // kidney beans, dry
      { foodId: "usda-173734", grams: 120 }, // black beans, dry
      { foodId: "usda-175199", grams: 120 }, // pinto beans, dry
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the three beans together for 8 hours or overnight; drain, cover with fresh water, and simmer for 50–60 minutes until all are tender (kidney beans need a full rolling boil for the first 10 minutes); keep 300 ml of the liquid.",
      "Heat the oil in a heavy pot; cook the onion and red pepper for 6 minutes until soft.",
      "Add the garlic, ground cumin and chili powder; cook 1 minute until toasted.",
      "Add the chopped tomato; cook 6 minutes into a thick base.",
      "Add the beans with their liquid, the rinsed quinoa and the salt; simmer 20 minutes until the quinoa is cooked and the chili is thick and stew-like.",
      "Rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 95,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-mediterranean-lentil-soup",
    name: { en: "Mediterranean Red Lentil Soup", hindi: "मेडिटेरेनियन रेड लेंटिल सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174284", grams: 440 }, // red lentils, dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the red lentils until the water runs mostly clear.",
      "Heat the olive oil in a heavy pot; cook the onion and finely diced carrots for 6 minutes until soft and sweet.",
      "Add the garlic and ground cumin; cook 30 seconds until fragrant.",
      "Add the lentils and 1.2 litres of water with the salt; bring to a boil, skimming any foam.",
      "Simmer gently for 22–25 minutes, stirring now and then, until the lentils have collapsed into a thick, creamy soup.",
      "Whisk vigorously for 30 seconds to smooth it further; stir in the lemon juice.",
      "Rest 5 minutes; serve with an extra squeeze of lemon over each bowl.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-black-eyed-pea-stew",
    name: { en: "Black-Eyed Pea Stew with Brown Rice", hindi: "ब्लैक-आइड पी स्टू विथ ब्राउन राइस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 400 }, // cowpeas (black-eyed peas), dry
      { foodId: "usda-2512380", grams: 120 }, // brown rice, dry
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the black-eyed peas for 6–8 hours; drain, cover with fresh water, and simmer for 35–45 minutes until tender; keep 300 ml of the liquid.",
      "Cook the brown rice in 300 ml salted water for 35 minutes; rest and fluff.",
      "Heat the oil in a heavy pot; cook the onion and green pepper for 6 minutes until soft.",
      "Add the garlic and chili powder for 30 seconds, then the chopped tomato; cook 6 minutes into a base.",
      "Add the peas with their liquid and the salt; simmer 12 minutes, mashing a few peas to thicken.",
      "Serve the stew spooned over the brown rice.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-falafel-plate",
    name: { en: "Falafel Plate with Yogurt Sauce", hindi: "फ़लाफ़ेल प्लेट विथ योगर्ट सॉस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 200 }, // chickpeas, dry
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt
      { foodId: "usda-170150", grams: 30 }, // sesame seeds
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the chickpeas for 12 hours — falafel must start from soaked raw chickpeas, never cooked ones, or the balls fall apart.",
      "Drain very well; grind with the onion, garlic, coriander leaves, ground cumin and salt to a coarse, sandy crumb that holds when squeezed — not a paste.",
      "Stir in half the sesame seeds; rest the mixture 30 minutes in the fridge.",
      "Shape into 8 small patties with wet hands; press the remaining sesame seeds onto the tops.",
      "Heat the oil in a skillet over medium heat; fry the falafel for 3–4 minutes per side until deep golden and crisp.",
      "Whisk the Greek yogurt with the lemon juice and a pinch of salt into a sauce.",
      "Serve the falafel hot with the yogurt sauce for dipping.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-intl-hummus-egg-plate",
    name: { en: "Hummus & Egg Plate", hindi: "हुम्मुस एंड एग प्लेट" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 200 }, // chickpeas, dry
      { foodId: "usda-170150", grams: 40 }, // sesame seeds (tahini base)
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the chickpeas for 10–12 hours; drain, cover with fresh water, and simmer for 45–60 minutes until completely soft — overcooked chickpeas make the smoothest hummus.",
      "Toast the sesame seeds in a dry pan until golden and nutty; grind to a paste with 1 tablespoon of the olive oil (a quick tahini).",
      "Blend or mash the chickpeas with the sesame paste, garlic, lemon juice, salt and 4–6 tablespoons of the warm cooking liquid until silky and whipped.",
      "Soft-boil the eggs for 6½ minutes; cool in cold water and peel — the yolks should be just set and glossy.",
      "Swirl the hummus over two plates; drizzle the remaining olive oil and a crack of black pepper over.",
      "Halve the eggs and set them on the hummus; serve.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: true,
    enrichment: "Hummus built on a double measure of sesame paste and topped with soft eggs — a boosted plate, not plain hummus.",
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-intl-warm-lentil-egg-salad",
    name: { en: "Warm Lentil & Egg Salad", hindi: "वार्म लेंटिल एंड एग सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 170 }, // lentils, dry
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Simmer the lentils in salted water for 20–25 minutes until tender but holding their shape; drain.",
      "Soft-boil the eggs for 6½ minutes; cool in cold water, peel and halve.",
      "Soften the finely chopped onion and diced carrots in the olive oil over medium heat for 5 minutes until sweet.",
      "Add the warm lentils to the pan with the salt; toss for 2 minutes so they drink in the oil.",
      "Tip into bowls while still warm — the salad is at its best lukewarm, not cold.",
      "Top with the halved eggs and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-quinoa-black-bean-bowl",
    name: { en: "Quinoa & Black Bean Bowl", hindi: "क्विनोआ एंड ब्लैक बीन बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 120 }, // quinoa, dry
      { foodId: "usda-173734", grams: 160 }, // black beans, dry
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the black beans for 8 hours or overnight; drain, cover with fresh water, and simmer for 45–60 minutes until completely tender; keep a little of the liquid.",
      "Cook the quinoa in 240 ml salted water for 15 minutes; rest 5 minutes and fluff.",
      "Stir the ground cumin, chili powder and salt into the beans with a ladle of their liquid; simmer 5 minutes until saucy.",
      "Dice the tomato; slice the avocado.",
      "Build the bowls: quinoa first, then the beans, tomato and avocado in sections.",
      "Squeeze the lemon juice over and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-peanut-chickpea-stew",
    name: { en: "Peanut & Chickpea Stew", hindi: "पीनट एंड चिकपी स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172430", grams: 250 }, // peanuts
      { foodId: "usda-2644282", grams: 150 }, // chickpeas, dry
      { foodId: "usda-2346404", grams: 400 }, // sweet potato
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the chickpeas for 10–12 hours; drain, cover with fresh water, and simmer for 60 minutes until tender.",
      "Roast the peanuts in a dry pan until golden; grind half to a smooth paste with a little warm water and crush the rest roughly.",
      "Heat the oil in a heavy pot; cook the onion for 6 minutes until golden; add the grated ginger and garlic for 30 seconds.",
      "Add the chopped tomato; cook 6 minutes into a base.",
      "Stir in the peanut paste, the cayenne, the salt and 400 ml water; simmer 5 minutes, stirring, until the sauce is creamy.",
      "Add the chickpeas and the sweet potato cut in 2 cm cubes; simmer 15 minutes until the sweet potato is tender and the sauce is thick.",
      "Scatter the crushed peanuts over and serve.",
    ],
    timeMinutes: 95,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ------------------------- dairy-led & other mains ------------------------- */
  {
    id: "dish-intl-cottage-cheese-power-bowl",
    name: { en: "Cottage Cheese Power Bowl", hindi: "कॉटेज चीज़ पावर बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soft-boil the eggs for 6½ minutes; cool in cold water, peel and halve — glossy, just-set yolks.",
      "Slice the avocado; dice the cucumber and tomato.",
      "Spoon the cottage cheese into two bowls as the base — it is the protein of the dish, so be generous.",
      "Arrange the avocado, cucumber and tomato over and around it.",
      "Set the halved eggs on top; season with the salt and black pepper.",
      "Scatter the sesame seeds over and serve cold.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-spinach-ricotta-chicken",
    name: { en: "Spinach & Ricotta Stuffed Chicken", hindi: "स्पिनच एंड रिकोटा स्टफ़्ड चिकन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-323444", grams: 150 }, // ricotta
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Wilt the spinach in a dry pan for 2 minutes; squeeze it very dry and chop finely.",
      "Mix the spinach with the ricotta, garlic, half the salt and the black pepper.",
      "Cut a deep pocket into the side of each chicken breast; fill generously with the spinach-ricotta mixture and secure with toothpicks.",
      "Season the outside of the chicken with the remaining salt.",
      "Sear in the olive oil over medium-high heat for 3 minutes per side until golden.",
      "Cover, lower the heat, and cook 8–10 minutes more until the chicken is cooked through (74°C) and the filling is hot and set.",
      "Rest 5 minutes, remove the toothpicks, slice thickly so the green filling shows, and serve.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-cheesy-bean-bake",
    name: { en: "Cheesy Bean & Tomato Bake", hindi: "चीज़ी बीन एंड टोमैटो बेक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 300 }, // kidney beans, dry
      { foodId: "usda-329370", grams: 150 }, // mozzarella
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the kidney beans for 8 hours or overnight; drain, cover with fresh water, bring to a full rolling boil for 10 minutes, then simmer for 50–60 minutes until completely tender.",
      "Heat the oven to 190°C. Cook the onion in the olive oil for 5 minutes; add the garlic and chili powder for 30 seconds.",
      "Add the chopped tomato and salt; simmer 8 minutes into a sauce.",
      "Stir in the beans with a ladle of their liquid; simmer 5 minutes.",
      "Tip into a baking dish; tear the mozzarella over the top.",
      "Bake for 15–18 minutes until the cheese is melted, golden in spots and bubbling at the edges.",
      "Rest 5 minutes and serve.",
    ],
    timeMinutes: 95,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-broccoli-cheddar-soup",
    name: { en: "Broccoli Cheddar Soup", hindi: "ब्रोकली चेडर सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-321900", grams: 600 }, // broccoli
      { foodId: "usda-328637", grams: 300 }, // cheddar
      { foodId: "usda-322892", grams: 400 }, // whole milk
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the broccoli into small florets; finely chop the tender stems — they carry the soup's body.",
      "Melt the butter in a heavy pot; cook the onion for 5 minutes until soft; add the garlic for 30 seconds.",
      "Add the broccoli stems and 500 ml water with the salt; simmer 8 minutes.",
      "Add the florets; simmer 4 minutes more until everything is tender and bright green.",
      "Blend roughly — half smooth, half chunky — so the soup is creamy but still has texture.",
      "Return to low heat; stir in the milk and the grated cheddar a handful at a time until melted; do not boil or the cheese turns grainy.",
      "Off the heat, stir in the Greek yogurt and black pepper; rest 2 minutes and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment: "A double-cheese broccoli soup finished with Greek yogurt — richer and higher in protein than the standard bowl.",
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-intl-cauliflower-cheese-bake",
    name: { en: "Cauliflower Cheese Bake", hindi: "कॉलीफ़्लावर चीज़ बेक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685573", grams: 800 }, // cauliflower
      { foodId: "usda-328637", grams: 250 }, // cheddar
      { foodId: "usda-329370", grams: 100 }, // mozzarella
      { foodId: "usda-322892", grams: 300 }, // whole milk
      { foodId: "usda-168936", grams: 30 }, // white wheat flour
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Heat the oven to 190°C. Cut the cauliflower into florets; boil in salted water for 5 minutes until just tender; drain very well.",
      "Melt the butter in a saucepan; stir in the flour and cook 1 minute into a pale paste.",
      "Whisk in the milk gradually; simmer 3–4 minutes, whisking, until the sauce coats the back of a spoon.",
      "Off the heat, stir in two-thirds of the cheddar, the salt and the black pepper until melted.",
      "Fold the cauliflower through the sauce; tip into a baking dish.",
      "Scatter the remaining cheddar and the torn mozzarella over; bake for 18–20 minutes until golden and bubbling.",
      "Rest 5 minutes and serve.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-chicken-meatballs",
    name: { en: "Chicken Meatballs in Tomato Sauce", hindi: "चिकन मीटबॉल्स इन टोमैटो सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-2346396", grams: 40 }, // rolled oats
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-325036", grams: 30 }, // parmesan
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-171413", grams: 15 }, // olive oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Mince the chicken breast finely with a knife or pulse in short bursts — keep some texture, not a paste.",
      "Mix the chicken with the beaten egg, oats, grated onion, half the garlic, the parmesan and half the salt; rest 15 minutes so the oats bind the mixture.",
      "With wet hands, roll into 16 balls; chill 15 minutes.",
      "Simmer the chopped tomato with the remaining garlic, salt and 100 ml water for 10 minutes into a sauce.",
      "Brown the meatballs in the olive oil over medium-high heat for 5 minutes, turning, until golden on most sides.",
      "Slide them into the tomato sauce; cover and simmer gently for 10 minutes until cooked through (74°C at the centre).",
      "Serve with the sauce spooned over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-chicken-pot-pie-stew",
    name: { en: "Chicken Pot Pie Stew with Dumplings", hindi: "चिकन पॉट पाई स्टू विथ डम्पलिंग्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-168936", grams: 80 }, // white wheat flour (dumplings)
      { foodId: "usda-170419", grams: 150 }, // green peas
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Poach the chicken in 700 ml salted water for 12–14 minutes until just cooked; lift out, keep the broth, and shred the chicken into bite-size pieces.",
      "Melt the butter in the pot; cook the onion and diced carrots for 6 minutes until soft.",
      "Pour in the reserved broth and the milk; bring to a gentle simmer.",
      "Return the chicken with the peas, salt and black pepper; simmer 3 minutes.",
      "Mix the flour with 80 ml cold water and a pinch of salt into a soft, sticky dough; drop teaspoonfuls over the surface of the stew.",
      "Cover tightly and simmer on low heat for 12 minutes without lifting the lid — the dumplings steam, puff and set.",
      "Rest 5 minutes and serve straight from the pot.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-lentil-walnut-meatballs",
    name: { en: "Lentil & Walnut Meatballs", hindi: "लेंटिल एंड वॉलनट मीटबॉल्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 160 }, // lentils, dry
      { foodId: "usda-2346394", grams: 40 }, // walnuts
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-2346396", grams: 30 }, // rolled oats
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Simmer the lentils for 20 minutes until tender; drain very well and cool — dry lentils make firm meatballs.",
      "Mash half the lentils; mix with the rest, the finely chopped walnuts, oats, beaten egg, grated onion, garlic, ground cumin and salt; rest 15 minutes.",
      "With wet hands, roll into 8 balls; chill 15 minutes.",
      "Simmer the chopped tomato with a pinch of salt and 80 ml water for 8 minutes into a sauce.",
      "Brown the meatballs in the olive oil for 5–6 minutes, turning gently, until crisp and golden.",
      "Slide into the sauce; cover and simmer gently for 6 minutes until firm and hot through.",
      "Serve with the sauce spooned over.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-black-bean-burgers",
    name: { en: "Black Bean Burgers", hindi: "ब्लैक बीन बर्गर्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 160 }, // black beans, dry
      { foodId: "usda-2346396", grams: 50 }, // rolled oats
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-328637", grams: 30 }, // cheddar
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the black beans for 8 hours or overnight; drain, cover with fresh water, and simmer for 45–60 minutes until completely tender; drain very well and spread on a tray to steam dry for 10 minutes.",
      "Mash the beans coarsely with a fork — half crushed, half whole.",
      "Mix with the oats, beaten egg, grated cheddar, finely chopped onion, garlic, chili powder, ground cumin and salt; rest 15 minutes so the oats bind.",
      "Shape into 4 thick patties; chill 20 minutes.",
      "Heat the oil in a skillet over medium heat; cook the patties for 4–5 minutes per side until crisp and dark golden — flip once, gently.",
      "Rest 2 minutes and serve hot.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-quinoa-chickpea-burgers",
    name: { en: "Quinoa & Chickpea Burgers", hindi: "क्विनोआ एंड चिकपी बर्गर्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 100 }, // quinoa, dry
      { foodId: "usda-2644282", grams: 160 }, // chickpeas, dry
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the chickpeas for 10–12 hours; drain, cover with fresh water, and simmer for 60 minutes until completely tender; drain well.",
      "Cook the quinoa in 200 ml salted water for 15 minutes; spread on a plate to cool and dry.",
      "Mash the chickpeas coarsely; mix with the quinoa, beaten egg, finely chopped onion, garlic, ground cumin and salt until it holds when squeezed.",
      "Shape into 4 patties; chill 20 minutes to firm.",
      "Heat the oil in a skillet over medium heat; cook the patties for 4 minutes per side until deep golden and crisp at the edges.",
      "Rest 2 minutes and serve hot.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-edamame-egg-fried-rice",
    name: { en: "Edamame & Egg Fried Rice", hindi: "एडामामे एंड एग फ़्राइड राइस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 200 }, // edamame
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-2512380", grams: 120 }, // brown rice, dry
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the brown rice in 300 ml salted water for 35 minutes; spread on a plate to cool and dry — dry rice fries, wet rice steams.",
      "Beat the eggs with a pinch of the salt. Heat half the sesame oil in a wok over high heat; scramble the eggs into large soft curds for 1 minute; remove.",
      "Add the remaining oil; stir-fry the ginger and garlic for 20 seconds.",
      "Add the edamame and peas; stir-fry 2 minutes until bright and hot.",
      "Add the rice; stir-fry 3 minutes, pressing it against the hot wok, until the grains are separate and toasty in spots.",
      "Return the eggs with the remaining salt; toss 1 minute, breaking them into ribbons, and serve at once.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-turkey-rice-bowl",
    name: { en: "Turkey & Brown Rice Bowl", hindi: "टर्की एंड ब्राउन राइस बोल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 300 }, // turkey breast
      { foodId: "usda-2512380", grams: 120 }, // brown rice, dry
      { foodId: "usda-321900", grams: 200 }, // broccoli
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the brown rice in 300 ml salted water for 35 minutes; rest 10 minutes and fluff.",
      "Cut the turkey into thin strips; season with the salt and grated ginger.",
      "Heat the sesame oil in a wok over high heat; sear the turkey for 4–5 minutes until golden at the edges and cooked through (74°C); remove.",
      "Stir-fry the broccoli florets and carrot matchsticks in the same wok with 2 tablespoons of water for 3 minutes until bright and crisp-tender.",
      "Build the bowls: rice first, then the vegetables, then the turkey on top.",
      "Scatter the sesame seeds over and serve.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ breakfasts ------------------------------ */
  {
    id: "dish-intl-tofu-scramble",
    name: { en: "Tofu Scramble with Edamame", hindi: "टोफ़ू स्क्रैम्बल विथ एडामामे" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 450 }, // tofu, firm
      { foodId: "usda-168410", grams: 80 }, // edamame
      { foodId: "usda-168462", grams: 100 }, // spinach
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170922", grams: 2 }, // turmeric
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Press the tofu for 10 minutes, then crumble it into rough, egg-like curds with your hands.",
      "Heat the oil in a skillet over medium heat; cook the onion for 4 minutes until soft.",
      "Add the tofu crumbles with the turmeric and salt; cook 5–6 minutes, stirring now and then, until golden in spots — the turmeric gives the scramble its egg colour.",
      "Add the edamame and chopped tomato; cook 2 minutes until hot.",
      "Fold in the spinach until just wilted, about 1 minute.",
      "Serve hot, straight from the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-veggie-omelette",
    name: { en: "Loaded Veggie Omelette", hindi: "लोडेड वेजी ऑमलेट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-328637", grams: 20 }, // cheddar
      { foodId: "usda-1750347", grams: 60 }, // mushrooms
      { foodId: "usda-168462", grams: 40 }, // spinach
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-173410", grams: 5 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the eggs and egg whites with the salt until just combined.",
      "Melt the butter in a 20 cm non-stick pan over medium heat; cook the sliced mushrooms for 3 minutes until golden.",
      "Add the spinach and chopped tomato; cook 1 minute until the spinach wilts; spread everything evenly over the pan.",
      "Pour in the eggs; as they set at the edges, draw them to the centre with a spatula and tilt the pan so the runny egg flows out — repeat for 2 minutes.",
      "Scatter the cheddar over; when the top is just set but still glossy, fold the omelette in half.",
      "Slide onto a warm plate; rest 1 minute and serve.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-cottage-spinach-omelette",
    name: { en: "Cottage Cheese & Spinach Omelette", hindi: "कॉटेज चीज़ एंड स्पिनच ऑमलेट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-328841", grams: 80 }, // cottage cheese
      { foodId: "usda-168462", grams: 50 }, // spinach
      { foodId: "usda-173410", grams: 5 }, // butter
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Wilt the spinach in a dry pan for 1 minute; squeeze dry and chop.",
      "Whisk the eggs with the salt until just combined.",
      "Melt the butter in a 20 cm non-stick pan over medium heat; pour in the eggs and draw the setting edges to the centre for 2 minutes until softly set.",
      "Spoon the cottage cheese and spinach over one half; crack the black pepper over.",
      "Fold the omelette over the filling; cook 1 minute more until the cheese warms through.",
      "Slide onto a warm plate and serve.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-egg-white-turkey-scramble",
    name: { en: "Egg-White & Turkey Scramble", hindi: "एग-व्हाइट एंड टर्की स्क्रैम्बल" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172183", grams: 200 }, // egg white (6 whites)
      { foodId: "usda-2514747", grams: 40 }, // ground turkey
      { foodId: "usda-168462", grams: 50 }, // spinach
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-173410", grams: 5 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Brown the ground turkey in a dry non-stick pan over medium-high heat for 3–4 minutes, breaking it into small crumbles, until cooked through and catching colour.",
      "Add the butter, chopped tomato and spinach; cook 1 minute until the spinach wilts.",
      "Whisk the egg whites with the salt until just frothy.",
      "Pour the whites over the turkey mixture; lower the heat.",
      "Stir slowly with a spatula for 2–3 minutes, folding the pan's contents over itself, until the whites form soft, glossy curds — take them off slightly early; they finish in the pan's heat.",
      "Serve immediately.",
    ],
    timeMinutes: 12,
    budgetTier: 3,
    enriched: true,
    enrichment: "A lean egg-white scramble boosted with browned turkey — a deliberately protein-loaded breakfast.",
    equipment: ["stove"],
  },
  {
    id: "dish-intl-cheese-scrambled-eggs",
    name: { en: "Cheese Scrambled Eggs", hindi: "चीज़ स्क्रैम्बल्ड एग्स" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-328637", grams: 20 }, // cheddar
      { foodId: "usda-173410", grams: 8 }, // butter
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the eggs and egg whites with the salt until evenly combined.",
      "Melt the butter in a non-stick pan over low heat — scrambled eggs want patience, not heat.",
      "Pour in the eggs; stir slowly and continuously with a spatula, sweeping the base and sides.",
      "Cook 3–4 minutes until the eggs form soft, creamy curds that still look slightly wet.",
      "Fold in the grated cheddar; stir 30 seconds until it melts into the curds.",
      "Take off the heat at once, crack the black pepper over, and serve.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-eggs-benedict-style",
    name: { en: "Eggs Benedict-Style on Flatbread", hindi: "एग्स बेनेडिक्ट-स्टाइल ऑन फ़्लैटब्रेड" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-172184", grams: 34 }, // egg yolk (2 yolks, for the hollandaise)
      { foodId: "usda-171098", grams: 30 }, // turkey breast
      { foodId: "usda-168936", grams: 50 }, // white wheat flour (the flatbread)
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbread: knead the flour with about 30 ml warm water and a pinch of salt; rest 15 minutes; roll into a 16 cm round and cook on a dry hot pan for 1 minute per side.",
      "Sear the sliced turkey breast in a dry pan for 2 minutes until hot and lightly coloured; set on the flatbread.",
      "Poach the eggs: simmer a pan of water with a gentle swirl; slip in the eggs and poach for 3 minutes until the whites are set and the yolks runny; lift out with a slotted spoon.",
      "Make the hollandaise: whisk the egg yolks with the lemon juice and remaining salt in a bowl over simmering water for 2–3 minutes until pale and thickened; whisk in the melted butter in a thin stream until glossy — keep it warm, never hot, or it splits.",
      "Set the poached eggs on the turkey.",
      "Spoon the hollandaise generously over and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-french-cheese-omelette",
    name: { en: "French Cheese Omelette", hindi: "फ़्रेंच चीज़ ऑमलेट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-329370", grams: 30 }, // mozzarella
      { foodId: "usda-173410", grams: 8 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the eggs and egg whites with the salt until completely smooth and slightly frothy — a French omelette has no streaks.",
      "Melt the butter in a 20 cm non-stick pan over medium heat until it foams but does not brown.",
      "Pour in the eggs; stir in small circles with a spatula while shaking the pan, so the eggs form tiny, even curds.",
      "When the eggs are softly set but the top is still creamy (about 2 minutes), stop stirring and let the base set for 20 seconds — pale, never browned.",
      "Scatter the mozzarella down the centre; tilt the pan and roll the omelette onto itself in thirds.",
      "Turn it seam-side down onto a warm plate — smooth, pale and cigar-shaped — and serve at once.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-turkey-sweet-potato-hash",
    name: { en: "Turkey & Sweet Potato Hash with Eggs", hindi: "टर्की एंड स्वीट पोटैटो हैश विथ एग्स" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 200 }, // ground turkey
      { foodId: "usda-171287", grams: 200 }, // egg, whole (4 eggs)
      { foodId: "usda-2346404", grams: 300 }, // sweet potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170427", grams: 100 }, // green sweet pepper
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the sweet potato into 1 cm dice; boil in salted water for 6 minutes until just tender; drain and let steam dry.",
      "Heat the oil in a large skillet over medium-high heat; brown the ground turkey for 5 minutes, breaking it into crumbles.",
      "Add the onion and green pepper; cook 3 minutes until soft.",
      "Add the sweet potato dice with the chili powder and salt; press down and cook undisturbed for 4 minutes until a crust forms underneath; scrape and turn in sections; cook 3 minutes more.",
      "Make 4 wells in the hash; crack an egg into each.",
      "Cover and cook on low heat for 4–5 minutes until the whites are set and the yolks still runny; serve straight from the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-protein-oatmeal",
    name: { en: "Protein Oatmeal Bowl", hindi: "प्रोटीन ओटमील बोल" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 80 }, // rolled oats
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-2515380", grams: 15 }, // pumpkin seeds
      { foodId: "usda-327699", grams: 60 }, // strawberries
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg)
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Whisk the egg in a small bowl until smooth.",
      "Simmer the oats in the milk and 150 ml water with the salt for 4–5 minutes, stirring, until thick and creamy.",
      "Take the pan off the heat; whisk 2 spoonfuls of the hot oats into the egg to warm it, then whisk the egg mixture back into the oats and return to the lowest heat for 1 minute, stirring constantly, until the porridge turns glossy and custardy — do not boil or the egg scrambles.",
      "Spoon into a bowl; let stand 1 minute to thicken.",
      "Top with the Greek yogurt in a generous dollop, the strawberries and the pumpkin seeds.",
      "Serve warm.",
    ],
    timeMinutes: 12,
    budgetTier: 2,
    enriched: true,
    enrichment: "Oats enriched with an egg whisked in custard-style and a full Greek-yogurt topping — a protein-boosted bowl, not plain porridge.",
    equipment: ["stove"],
  },
  {
    id: "dish-intl-overnight-oats",
    name: { en: "Overnight Oats with Greek Yogurt", hindi: "ओवरनाइट ओट्स विथ ग्रीक योगर्ट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 70 }, // rolled oats
      { foodId: "usda-330137", grams: 170 }, // Greek yogurt
      { foodId: "usda-322892", grams: 80 }, // whole milk
      { foodId: "usda-327699", grams: 60 }, // strawberries
      { foodId: "usda-2346393", grams: 10 }, // almonds
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg, boiled, on the side)
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "The night before: stir the oats, Greek yogurt, milk and salt together in a jar or bowl until evenly combined.",
      "Fold in half the strawberries, lightly crushed.",
      "Cover and refrigerate for at least 6 hours — the oats soften and the mixture sets to a thick, spoonable pudding.",
      "In the morning, boil the egg for 8 minutes; cool, peel and halve.",
      "Stir the oats once; loosen with a spoonful of milk if they are thicker than you like.",
      "Top with the remaining strawberries and the chopped almonds; serve cold with the boiled egg alongside.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-greek-yogurt-power-bowl",
    name: { en: "Greek Yogurt Power Bowl", hindi: "ग्रीक योगर्ट पावर बोल" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 250 }, // Greek yogurt
      { foodId: "usda-2346393", grams: 20 }, // almonds
      { foodId: "usda-2515380", grams: 10 }, // pumpkin seeds
      { foodId: "usda-171287", grams: 50 }, // egg, whole (1 egg, boiled)
      { foodId: "usda-327699", grams: 60 }, // strawberries
      { foodId: "usda-169640", grams: 10 }, // honey
    ],
    method: [
      "Boil the egg for 8 minutes; cool in cold water, peel and halve.",
      "Spoon the Greek yogurt into a bowl and swirl the top with the back of the spoon.",
      "Scatter the strawberries over one side.",
      "Roughly chop the almonds; scatter them with the pumpkin seeds over the other side.",
      "Drizzle the honey in a thin thread over everything.",
      "Set the halved egg alongside and serve.",
    ],
    timeMinutes: 12,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-cottage-egg-flatbread",
    name: { en: "Cottage Cheese & Egg Flatbread", hindi: "कॉटेज चीज़ एंड एग फ़्लैटब्रेड" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 150 }, // cottage cheese
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-168936", grams: 50 }, // white wheat flour (the flatbread)
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbread: knead the flour with about 30 ml warm water and a pinch of salt into a soft dough; rest 15 minutes; roll into a 20 cm round and cook on a dry hot pan for 1 minute per side until puffed in spots.",
      "Scramble the eggs in a non-stick pan over low heat for 3 minutes into soft curds; season with the remaining salt.",
      "Warm the cottage cheese gently in a small pan for 1 minute — just to take the chill off, not to melt it.",
      "Spread the cottage cheese over the flatbread.",
      "Top with the scrambled eggs and the diced tomato.",
      "Fold or roll and serve warm.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-intl-tempeh-potato-hash",
    name: { en: "Tempeh & Potato Hash", hindi: "टेम्पेह एंड पोटैटो हैश" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 250 }, // tempeh
      { foodId: "usda-168410", grams: 80 }, // edamame
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the potatoes into 1 cm dice; boil in salted water for 6 minutes until just tender; drain and steam dry.",
      "Crumble the tempeh into small pieces.",
      "Heat the oil in a large skillet over medium-high heat; cook the tempeh crumbles for 5 minutes until golden and crisp in spots.",
      "Add the onion; cook 3 minutes until soft.",
      "Add the potato dice, edamame, chili powder and salt; press down and cook undisturbed for 4 minutes until a crust forms; scrape and turn in sections; cook 3 minutes more until crisp all over.",
      "Serve hot, straight from the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-baked-egg-muffins",
    name: { en: "Baked Egg Muffins", hindi: "बेक्ड एग मफ़िन्स" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole (6 eggs)
      { foodId: "usda-172183", grams: 99 }, // egg white (3 whites)
      { foodId: "usda-329370", grams: 50 }, // mozzarella
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-170108", grams: 60 }, // red sweet pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Heat the oven to 175°C; grease 6 cups of a muffin tin.",
      "Wilt the spinach for 1 minute; squeeze dry and chop. Dice the red pepper finely.",
      "Whisk the eggs and egg whites with the salt until evenly combined.",
      "Divide the spinach, pepper and torn mozzarella between the cups.",
      "Pour the egg mixture over, filling each cup to the top.",
      "Bake for 18–20 minutes until puffed, set in the centre and golden at the edges.",
      "Rest 5 minutes — they deflate slightly as they cool — then lift out and serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-quinoa-breakfast-bowl",
    name: { en: "Quinoa Breakfast Bowl with Egg & Avocado", hindi: "क्विनोआ ब्रेकफ़ास्ट बोल विथ एग एंड एवोकाडो" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 60 }, // quinoa, dry
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-171705", grams: 60 }, // avocado
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cook the quinoa in 120 ml salted water for 15 minutes; rest 5 minutes and fluff.",
      "Soft-boil the whole eggs for 6½ minutes; cool in cold water and peel.",
      "Scramble the egg whites in a non-stick pan over low heat for 2 minutes into soft curds; season with the remaining salt.",
      "Spoon the quinoa into a bowl; top with the scrambled whites.",
      "Halve the soft eggs and the avocado; arrange them over the bowl with the diced tomato.",
      "Serve warm.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-salmon-egg-breakfast",
    name: { en: "Salmon & Egg Breakfast Plate", hindi: "सैल्मन एंड एग ब्रेकफ़ास्ट प्लेट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 100 }, // Atlantic salmon
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-168936", grams: 40 }, // white wheat flour (the flatbread)
      { foodId: "usda-168462", grams: 50 }, // spinach
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbread: knead the flour with about 25 ml warm water and a pinch of salt; rest 15 minutes; roll into a 16 cm round and cook on a dry hot pan for 1 minute per side.",
      "Season the salmon with the remaining salt; sear skin-side down in a non-stick pan over medium-high heat for 4 minutes until the skin crisps; flip for 1 minute; flake into large pieces.",
      "Wilt the spinach in the same pan for 1 minute.",
      "Scramble the eggs over low heat for 3 minutes into soft curds.",
      "Build the plate: flatbread first, then the spinach, scrambled eggs and salmon flakes.",
      "Serve warm.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-breakfast-sandwich",
    name: { en: "Egg & Cheese Breakfast Sandwich", hindi: "एग एंड चीज़ ब्रेकफ़ास्ट सैंडविच" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-328637", grams: 30 }, // cheddar
      { foodId: "usda-168936", grams: 60 }, // white wheat flour (the roll)
      { foodId: "usda-170457", grams: 50 }, // tomato
      { foodId: "usda-173410", grams: 5 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the roll: knead the flour with about 35 ml warm water and a pinch of salt into a smooth dough; rest 15 minutes; shape into a round roll and bake at 190°C for 15 minutes until golden and hollow-sounding.",
      "Whisk the eggs and egg whites with the remaining salt.",
      "Melt the butter in a non-stick pan over low heat; cook the eggs for 3 minutes, folding them into a soft, thick omelette patty the size of the roll.",
      "Lay the cheddar over the eggs; cover for 30 seconds until it melts.",
      "Split the warm roll; set the egg-and-cheese patty inside with the tomato slices.",
      "Press gently, halve, and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-oat-cottage-pancakes",
    name: { en: "Oat & Cottage Cheese Pancakes", hindi: "ओट एंड कॉटेज चीज़ पैनकेक्स" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 60 }, // rolled oats
      { foodId: "usda-328841", grams: 120 }, // cottage cheese
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-327699", grams: 50 }, // strawberries
      { foodId: "usda-171025", grams: 5 }, // sunflower oil
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Blend or whisk the oats, cottage cheese, eggs and salt into a thick batter — a few oat flecks are fine; rest 10 minutes so the oats swell.",
      "Heat a non-stick pan over medium-low heat with a film of the oil.",
      "Drop 3–4 spoonfuls of batter into small pancakes about 8 cm wide.",
      "Cook for 2–3 minutes until bubbles appear on the surface and the edges look set; flip carefully.",
      "Cook 1–2 minutes more until golden and firm in the centre.",
      "Stack, scatter the strawberries over, and serve warm.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: true,
    enrichment: "Pancakes built on cottage cheese and eggs instead of a plain flour batter — a protein-enriched stack.",
    equipment: ["stove"],
  },
  {
    id: "dish-intl-socca-egg-spinach",
    name: { en: "Socca with Egg & Spinach", hindi: "सोक्का विथ एग एंड स्पिनच" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174288", grams: 60 }, // chickpea flour (besan)
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-171413", grams: 8 }, // olive oil
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the chickpea flour with 120 ml water, half the olive oil and half the salt into a smooth batter; rest 30 minutes — socca batter must rest or it tastes raw.",
      "Heat a cast-iron or oven-safe skillet under a hot grill (broiler) for 5 minutes until very hot.",
      "Swirl the remaining oil in the hot pan; pour in the batter; grill for 5–7 minutes until set, blistered and golden at the edges.",
      "Meanwhile wilt the spinach for 1 minute and fry the eggs in a non-stick pan for 3 minutes until the whites are set and the yolks runny.",
      "Slide the socca onto a plate; top with the spinach and fried eggs.",
      "Crack the black pepper and the remaining salt over; serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-intl-tempeh-strips-eggs",
    name: { en: "Tempeh Strips & Eggs", hindi: "टेम्पेह स्ट्रिप्स एंड एग्स" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 120 }, // tempeh
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-171025", grams: 8 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cut the tempeh into strips about 1 cm thick; toss with the chili powder and half the salt.",
      "Heat the oil in a skillet over medium-high heat; fry the tempeh strips for 3 minutes per side until deep golden and crisp at the edges, like breakfast rashers.",
      "Push the strips to one side of the pan; crack the eggs into the empty side.",
      "Fry the eggs for 3 minutes until the whites are set and the yolks still runny; season with the remaining salt.",
      "Tilt the pan and spoon the hot oil over the yolks for 20 seconds until they glaze — this sets the top of the white without flipping the eggs.",
      "Serve the eggs beside the tempeh strips, hot from the pan.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-savoury-oatmeal",
    name: { en: "Savoury Oatmeal with Egg & Cheddar", hindi: "सेवरी ओटमील विथ एग एंड चेडर" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 70 }, // rolled oats
      { foodId: "usda-171287", grams: 100 }, // egg, whole (2 eggs)
      { foodId: "usda-328637", grams: 25 }, // cheddar
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-168462", grams: 40 }, // spinach
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Simmer the oats in the milk and 150 ml water with the salt for 4–5 minutes until thick and creamy.",
      "Stir in the spinach until just wilted, about 1 minute.",
      "Meanwhile fry the eggs in a non-stick pan over medium heat for 3 minutes until the whites are set and the yolks runny.",
      "Spoon the oats into a bowl; stir half the grated cheddar through until melted.",
      "Top with the fried eggs and the remaining cheddar.",
      "Serve hot.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-quinoa-porridge",
    name: { en: "Quinoa Porridge with Yogurt & Walnuts", hindi: "क्विनोआ पॉरिज विथ योगर्ट एंड वॉलनट्स" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 70 }, // quinoa, dry
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-2346394", grams: 15 }, // walnuts
      { foodId: "usda-327699", grams: 50 }, // strawberries
      { foodId: "usda-169640", grams: 8 }, // honey
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Rinse the quinoa; simmer in the milk and 100 ml water with the salt for 15 minutes, stirring now and then, until the grains are tender and the porridge is thick.",
      "Rest 2 minutes off the heat — it thickens further as it stands.",
      "Meanwhile toast the roughly chopped walnuts in a dry pan for 2 minutes until fragrant and a shade darker.",
      "Spoon into a bowl; swirl the Greek yogurt over the top.",
      "Scatter the strawberries and roughly chopped walnuts over.",
      "Drizzle the honey in a thin thread and serve warm.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-beans-eggs-skillet",
    name: { en: "Beans & Eggs Skillet", hindi: "बीन्स एंड एग्स स्किलेट" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 100 }, // navy beans, dry
      { foodId: "usda-171287", grams: 250 }, // egg, whole (5 eggs)
      { foodId: "usda-328637", grams: 30 }, // cheddar
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the navy beans for 8 hours; simmer for 50–60 minutes until completely tender. (A small batch keeps 3 days in the fridge.)",
      "Heat the oil in a skillet over medium heat; cook the onion for 4 minutes until soft; add the chili powder for 30 seconds.",
      "Add the chopped tomato and salt; simmer 6 minutes into a sauce.",
      "Stir in the beans; simmer 3 minutes until hot and saucy.",
      "Make 5 wells in the beans; crack an egg into each.",
      "Cover and cook on low heat for 5–6 minutes until the whites are set and the yolks still runny; scatter the cheddar over for the last minute and serve from the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-salmon-spinach-omelette",
    name: { en: "Salmon & Spinach Omelette", hindi: "सैल्मन एंड स्पिनच ऑमलेट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 80 }, // Atlantic salmon
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-168462", grams: 50 }, // spinach
      { foodId: "usda-173410", grams: 5 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Season the salmon with a pinch of the salt; sear in a dry non-stick pan over medium-high heat for 3 minutes per side until just cooked; flake into large pieces.",
      "Wilt the spinach in the same pan for 1 minute; squeeze out any liquid.",
      "Whisk the eggs with the remaining salt.",
      "Melt the butter in a clean 20 cm non-stick pan over medium heat; pour in the eggs and draw the setting edges to the centre for 2 minutes until softly set.",
      "Scatter the salmon flakes and spinach over one half.",
      "Fold the omelette over the filling; cook 30 seconds more; slide onto a warm plate and serve.",
    ],
    timeMinutes: 18,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-intl-egg-avocado-flatbread",
    name: { en: "Egg & Avocado Flatbread", hindi: "एग एंड एवोकाडो फ़्लैटब्रेड" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 150 }, // egg, whole (3 eggs)
      { foodId: "usda-172183", grams: 66 }, // egg white (2 whites)
      { foodId: "usda-171705", grams: 80 }, // avocado
      { foodId: "usda-168936", grams: 50 }, // white wheat flour (the flatbread)
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbread: knead the flour with about 30 ml warm water and a pinch of salt into a soft dough; rest 15 minutes; roll into a 20 cm round and cook on a dry hot pan for 1 minute per side until puffed in spots.",
      "Whisk the eggs and egg whites with the salt; scramble over low heat for 3 minutes into soft, glossy curds.",
      "Mash the avocado roughly with a fork — chunky, not a purée.",
      "Spread the avocado over the warm flatbread.",
      "Top with the scrambled eggs and diced tomato; crack the black pepper over.",
      "Fold or cut into wedges and serve warm.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
];
