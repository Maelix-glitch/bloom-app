/**
 * Wave PW-4 — protein wave: international high-protein mains from the
 * cuisines and preparations the X-1..X-4 waves did not reach:
 * Filipino, Japanese and Thai mains beyond the covered set, Cambodian,
 * Indonesian regional classics, Balkan, Iberian, West and East
 * African, Andean and Central American dishes, and the Levantine and
 * Central Asian gaps — each checked against the full library by name
 * and by recipe so nothing here re-authors an existing dish.
 *
 * The owner's rule is a hard bar, not a mood: EVERY dish here
 * computes to at least 25 g of protein per serving through
 * `dishNutrients` — pinned by dishLibraryProteinIntl.test.ts, which
 * computes rather than asserts. A dish that could not clear the bar
 * honestly was dropped, not padded.
 *
 * Honesty rules, same as the rest of the library: lines name only
 * the 142 USDA-verified reference foods; nutrition exists only as
 * `dishNutrients` computes it; no beef and no pork anywhere (a
 * deliberate programme omission — the ground meats here are turkey
 * and lamb). Where a classic ingredient is absent from the verified
 * set — soy sauce, fish sauce, lemongrass, miso, dashi — the dish is
 * either a classic that is genuinely composed without it, an
 * honestly named "-Style" adaptation whose method states the
 * substitution, or not here at all. No method ever names an
 * ingredient no line carries.
 *
 * Every dish carries cuisine: "international", category: "main", and
 * a Devanagari transliteration of its name in name.hindi.
 */

import type { Dish } from "../dishes";

export const PROTEIN_INTL_DISHES: readonly Dish[] = [
  /* ------------------------------- Filipino ------------------------------ */
  {
    id: "dish-ph-chicken-adobo-style",
    name: { en: "Chicken Adobo-Style", hindi: "चिकन अडोबो-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-173469", grams: 120 }, // cider vinegar
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-170931", grams: 4 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-172336", grams: 20 }, // canola oil
    ],
    method: [
      "Combine the chicken thighs with the vinegar, crushed garlic, bay leaves, black pepper and salt in a bowl and marinate for 20 minutes, the vinegar is the dish, so do not shorten this.",
      "Lift the chicken out and pat it dry, reserving every drop of the marinade for the sauce.",
      "Heat the oil in a heavy pan over medium-high heat and sear the chicken for 4 to 5 minutes per side, until deeply golden at the edges.",
      "Add the onion, sliced, and cook for 3 minutes in the chicken fat until it softens and picks up the colour.",
      "Pour in the reserved marinade with 250 ml of water, bring to a simmer, cover and cook for 20 minutes.",
      "Uncover and simmer 5 to 8 minutes more, until the chicken is tender and cooked through with no pink at the bone and the sauce has reduced by about a third.",
      "Classic adobo is built on soy sauce, which sits outside Bloom's verified set, here salt alone carries the seasoning and the vinegar stays the loud note, exactly as it should be. Rest 5 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ph-tinola",
    name: { en: "Tinolang Manok (Chicken Ginger Soup with Greens)", hindi: "तिनोलांग मानोक (चिकन जिंजर सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-169231", grams: 40 }, // ginger
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-168416", grams: 60 }, // drumstick leaves (malunggay)
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Heat the oil in a large pot and sauté the ginger, cut in matchsticks, with the garlic and onion for 3 to 4 minutes, until the onion is translucent and the ginger smells sharp and warm.",
      "Add the chicken breast in large chunks and cook for 4 minutes, turning once, until the outside loses its raw look, it finishes in the broth.",
      "Pour in 1.4 litres of water, add the salt and black pepper, and simmer gently for 15 minutes, skimming any foam.",
      "Tinola's classic green papaya sits outside the verified set, so cabbage wedges stand in, they keep the same gentle sweetness. Add them and simmer 8 minutes, until just tender.",
      "Stir in the spinach and drumstick leaves and cook only 2 minutes more, until the greens wilt deep green.",
      "Check the chicken is cooked through, white at the centre, juices clear, then taste and adjust the salt.",
      "Serve at once in deep bowls, broth first, with the chicken and greens lifted over it.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ph-sinigang-shrimp",
    name: { en: "Sinigang na Hipon (Shrimp in Tamarind Soup)", hindi: "सिनिगांग ना हिपोन (झींगा इमली सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 600 }, // shrimp
      { foodId: "usda-167763", grams: 80 }, // tamarind
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169260", grams: 200 }, // okra
      { foodId: "usda-2685577", grams: 200 }, // eggplant
      { foodId: "usda-2346400", grams: 160 }, // green beans
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cover the tamarind with 300 ml of hot water for 10 minutes, then squeeze and work the pulp with your fingers and strain, this sour liquor is the soul of the soup.",
      "Bring 1.2 litres of water to the boil with the tomatoes, quartered, and the onion in wedges; simmer 8 minutes, pressing the tomatoes so they collapse into the broth.",
      "Stir in the tamarind liquor and the salt. Fish sauce seasons the classic and sits outside the verified set, so salt carries it here, the sourness must stay in front.",
      "Add the eggplant in chunks, the okra whole and the green beans; simmer 6 minutes, until the eggplant is silky and the beans still have bite.",
      "Add the shrimp last and cook 3 to 4 minutes only, until they curl and turn fully pink, a minute longer and they toughen.",
      "Taste: the broth should be brightly, almost aggressively sour, then savoury. Adjust salt, never sugar.",
      "Serve immediately, while the shrimp are still tender, with the vegetables spooned over.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ph-ginataang-manok",
    name: { en: "Ginataang Manok (Chicken in Coconut Milk)", hindi: "गिनातांग मानोक (नारियल दूध चिकन)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-169231", grams: 30 }, // ginger
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Heat the oil and sauté the ginger in matchsticks, the garlic and the onion for 3 minutes, until soft and fragrant.",
      "Add the chicken thighs and sear 5 minutes, turning once, so the edges take colour before the coconut milk goes in.",
      "Pour in half the coconut milk with 200 ml of water and the salt; simmer gently, uncovered, for 20 minutes, a hard boil splits coconut milk, so keep it lazy.",
      "Add the remaining coconut milk and the red chilli, sliced, and simmer 5 minutes more, until the chicken is tender and cooked through.",
      "Fold in the spinach and cook 2 minutes, just until it wilts into the sauce.",
      "The sauce should be glossy and lightly thick, coating the back of a spoon. Taste and adjust the salt.",
      "Rest off the heat for 5 minutes and serve with the sauce pooled around the chicken.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ph-monggo",
    name: { en: "Ginisang Monggo (Mung Bean Stew with Shrimp)", hindi: "गिनिसांग मोंगो (मूंग दाल झींगा स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174256", grams: 320 }, // mung beans, dry
      { foodId: "usda-175179", grams: 240 }, // shrimp
      { foodId: "usda-168416", grams: 80 }, // drumstick leaves (malunggay)
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rinse the mung beans, cover with 1.2 litres of water and simmer for 30 to 35 minutes, until the beans burst and the pot turns thick and porridge-like. Skim the foam early on.",
      "Meanwhile heat the oil in a wide pan and sauté the garlic, onion and tomatoes for 5 to 6 minutes, until the tomatoes collapse into a rough sauce.",
      "Tip the sauté into the mung beans with the salt and simmer together for 8 minutes, so the flavours marry and the stew thickens further.",
      "Add the shrimp and cook 3 to 4 minutes, until they turn pink and curl, they poach gently in the stew rather than fry.",
      "Stir in the drumstick leaves and cook 1 minute, just until they wilt dark green.",
      "The stew should be thick enough to mound on a spoon, loosened only with a splash of water if it catches. Taste and adjust the salt.",
      "Serve hot, making sure each bowl gets its share of shrimp over the mung.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ph-tortang-talong",
    name: { en: "Tortang Talong (Eggplant Omelette with Turkey)", hindi: "तोरतांग तालोंग (बैंगन ऑमलेट टर्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 600 }, // eggplant
      { foodId: "usda-2514747", grams: 480 }, // ground turkey
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Char the whole eggplants directly over a flame or under a fierce grill for 10 to 12 minutes, turning, until the skins blacken and the flesh collapses soft. Cool, then peel, keeping the stems on.",
      "Flatten each eggplant gently with a fork into a fan, keeping the stem as a handle, and season with a pinch of the salt.",
      "Heat a third of the oil and sauté the garlic, onion and tomato for 3 minutes; add the ground turkey and cook 7 to 8 minutes, breaking it fine, until cooked through and its liquid has dried.",
      "Beat the eggs with the remaining salt until uniform. Lay an eggplant fan in the egg, spoon a quarter of the turkey over it and fold egg over the top.",
      "Slide each topped eggplant into hot oil in a wide pan and fry 3 minutes per side, until the egg is set, puffed and golden at the edges.",
      "Drain briefly on a rack, not paper, which steams the crust, and repeat with the remaining eggplants.",
      "Serve at once, one whole stuffed omelette per plate, cut open to show the smoky eggplant inside.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ph-pinakbet-style",
    name: { en: "Pinakbet-Style (Ilocano Vegetables with Shrimp)", hindi: "पिनाकबेट-स्टाइल (झींगा सब्ज़ी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 520 }, // shrimp
      { foodId: "usda-168393", grams: 200 }, // bitter gourd
      { foodId: "usda-169260", grams: 200 }, // okra
      { foodId: "usda-2685577", grams: 240 }, // eggplant
      { foodId: "usda-2346400", grams: 160 }, // green beans
      { foodId: "usda-2346404", grams: 240 }, // sweet potato, standing in for kalabasa squash
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Heat the oil and sauté the garlic, onion and tomatoes for 6 minutes, pressing the tomatoes down until they collapse into a rough, jammy base.",
      "Pinakbet is layered, never stirred. Lay the sweet potato in first, it stands in for the classic kalabasa squash, which sits outside the verified set, cover and cook 8 minutes in the tomato steam.",
      "Layer the eggplant, okra, green beans and bitter gourd over the top in that order, cover and cook 8 minutes more, shaking the pot rather than stirring so the vegetables keep their shape.",
      "Season with the salt. The classic seasoning, fermented shrimp paste, sits outside the verified set, here the shrimp themselves, added next, carry that savour.",
      "Lay the shrimp over the vegetables, cover and cook 4 minutes, until they turn pink and just curl.",
      "Rest off the heat for 5 minutes; the vegetables finish in the residual steam and the juices settle into a light sauce.",
      "Serve straight from the pot, lifting portions so each plate gets every layer and its share of shrimp.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Japanese ------------------------------ */
  {
    id: "dish-jp-oyakodon",
    name: { en: "Oyakodon (Chicken & Egg Rice Bowl)", hindi: "ओयाकोडोन (चिकन अंडा राइस बाउल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 480 }, // chicken thigh
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry
      { foodId: "usda-790646", grams: 240 }, // onion
      { foodId: "usda-334247", grams: 16 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
    ],
    method: [
      "Cook the rice in 360 ml of water until tender, then rest it covered for 10 minutes, the bowls are built on hot, just-cooked rice.",
      "Simmer 400 ml of water with the salt and sugar. Dashi, soy sauce and mirin build the classic broth and all sit outside the verified set; salt and a little sugar honestly rebuild its sweet-savoury balance.",
      "Add the onion in thin wedges to the broth and simmer 5 minutes, until it softens and turns translucent at the edges.",
      "Add the chicken thigh, cut in bite-size slices, and simmer 5 to 6 minutes, until cooked through and opaque to the centre.",
      "Beat the eggs loosely, streaks of white should remain. Drizzle two-thirds over the chicken in a slow spiral, cover and cook 1 minute.",
      "Add the remaining egg, cover again for 30 to 60 seconds, then take off the heat: the egg should be just set and still glossy, never firm or browned.",
      "Slide a quarter of the chicken-and-egg, with its broth, over each bowl of rice and serve immediately.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-jp-chikuzenni",
    name: { en: "Chikuzenni (Chicken & Root Vegetable Stew)", hindi: "चिकुज़ेन्नी (चिकन सब्ज़ी स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-169308", grams: 240 }, // taro
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-2346400", grams: 160 }, // green beans
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-334247", grams: 12 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the oil in a heavy pot and sear the chicken thigh chunks for 4 to 5 minutes, until they take pale gold colour on most sides.",
      "Add the taro and carrots in chunks and stir for 2 minutes to coat them in the chicken fat.",
      "Pour in 700 ml of water with the salt and sugar, they stand in for the dashi and soy sauce of the classic, which sit outside the verified set, and simmer 15 minutes.",
      "Add the mushrooms, halved, and simmer 6 minutes more, until the taro is tender at the point of a knife and the chicken is cooked through.",
      "Add the green beans and simmer 3 minutes, keeping their colour bright.",
      "Grate the ginger over the pot and stir once; let the stew stand 5 minutes off the heat so the liquid turns lightly glossy as it cools a fraction.",
      "Serve in deep bowls with more broth than a curry and less than a soup, that balance is the dish.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-jp-mabo-nasu",
    name: { en: "Mabo Nasu (Eggplant with Spiced Turkey)", hindi: "माबो नासु (बैंगन मसालेदार टर्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2685577", grams: 600 }, // eggplant
      { foodId: "usda-169231", grams: 24 }, // ginger
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-171016", grams: 24 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-790646", grams: 120 }, // onion
    ],
    method: [
      "Cut the eggplant in chunky batons, toss with half the salt and rest 10 minutes; pat dry, this keeps it silky rather than greasy in the pan.",
      "Heat half the sesame oil until shimmering and sear the eggplant in a single layer for 5 to 6 minutes, until golden at the edges and softening. Lift out.",
      "Add the remaining sesame oil and fry the garlic, ginger and red chilli for 1 minute, until the oil smells hot and fragrant.",
      "Add the ground turkey and onion and stir-fry 6 to 7 minutes, breaking the turkey fine, until cooked through and starting to crisp at the edges.",
      "Stir in the chilli powder and the remaining salt. Chilli bean paste drives the classic and sits outside the verified set; dried chilli, chilli powder and salt honestly rebuild its heat and savour.",
      "Return the eggplant with 150 ml of water and simmer 5 minutes, until the eggplant is completely silky and the sauce clings rather than pools.",
      "Rest 2 minutes and serve, the eggplant should slump into the spiced turkey, not sit beside it.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-jp-nikujaga-style",
    name: { en: "Turkey Nikujaga-Style (Simmered Turkey & Potatoes)", hindi: "टर्की निकुजागा-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 240 }, // onion
      { foodId: "usda-2346400", grams: 160 }, // green beans
      { foodId: "usda-334247", grams: 16 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
    ],
    method: [
      "Nikujaga is a beef dish in Japan; Bloom's programme carries no beef, so ground turkey takes its place, the sweet-savoury potato simmer is unchanged in spirit.",
      "Heat the oil and cook the turkey for 5 minutes, breaking it into coarse crumbles, until it loses its raw colour.",
      "Add the onion in wedges and cook 3 minutes, until the edges soften.",
      "Add the potatoes and carrots in chunks with 600 ml of water, the salt and the sugar, standing in for the soy sauce and mirin outside the verified set, and simmer 15 minutes.",
      "Check the potatoes: they should be tender and just starting to break at the edges, thickening the broth slightly. The turkey must be cooked through.",
      "Add the green beans and simmer 4 minutes more, until bright and just tender.",
      "Rest 5 minutes off the heat, nikujaga is always better after its short rest, and serve with the broth spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-jp-teriyaki-style",
    name: { en: "Teriyaki-Style Glazed Chicken", hindi: "तेरियाकी-स्टाइल ग्लेज़्ड चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-169640", grams: 40 }, // honey
      { foodId: "usda-173469", grams: 30 }, // cider vinegar
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171016", grams: 16 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-2346400", grams: 200 }, // green beans
    ],
    method: [
      "Teriyaki's classic glaze is soy sauce and mirin, both outside the verified set, here honey, vinegar, garlic, ginger and salt are simmered into the same kind of glossy, sweet-sharp glaze, honestly rebuilt.",
      "Season the chicken thighs with the salt. Heat the sesame oil in a wide pan and sear them for 6 to 7 minutes per side, until cooked through and well browned.",
      "Lift the chicken out. Blanch the green beans in the same pan with a splash of water for 3 to 4 minutes, until bright and just tender; set aside.",
      "Add the honey, vinegar, grated ginger and garlic to the pan with 60 ml of water and simmer 3 to 4 minutes, until the glaze turns syrupy and coats a spoon.",
      "Return the chicken to the pan and turn it in the glaze for 1 to 2 minutes, until every surface shines and the edges catch slightly.",
      "Rest the chicken 5 minutes, then slice it thickly across the grain.",
      "Serve the slices fanned over the beans with the remaining glaze spooned over the top.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------------- Thai -------------------------------- */
  {
    id: "dish-th-tom-kha-gai",
    name: { en: "Tom Kha Gai (Chicken Coconut Soup)", hindi: "तोम खा गाई (चिकन नारियल सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-170172", grams: 480 }, // coconut milk
      { foodId: "usda-1750347", grams: 240 }, // mushrooms
      { foodId: "usda-169231", grams: 40 }, // ginger, standing in for galangal and lemongrass
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Warm the coconut milk with 300 ml of water and the ginger, sliced thick, over medium heat until it steams, never let it boil hard or it will split.",
      "Galangal and lemongrass perfume the classic and both sit outside the verified set; ginger carries the aromatic role here, with lemon for the citrus top note.",
      "Add the chicken breast in thin strips and poach gently for 6 to 7 minutes, until just cooked through and opaque.",
      "Add the mushrooms, halved, and simmer 3 minutes, until they soften into the broth.",
      "Take the pot off the heat and stir in the lemon juice and the salt, fish sauce seasons the classic and sits outside the verified set, so salt carries it, added last so the lemon stays bright.",
      "Bruise the red chilli, slice it and float it over the soup; it should perfume more than it burns.",
      "Serve at once, pale and fragrant, with the chicken strips lifted over the mushrooms.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-th-tom-yum-style",
    name: { en: "Tom Yum-Style Hot & Sour Shrimp Soup", hindi: "तोम यम-स्टाइल झींगा सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 600 }, // shrimp
      { foodId: "usda-1750347", grams: 240 }, // mushrooms
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 30 }, // ginger, standing in for lemongrass and galangal
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Bring 1.4 litres of water to the boil with the ginger in thick slices, the red chilli bruised and the onion in wedges; simmer 8 minutes to build the aromatic broth.",
      "Lemongrass and galangal are the classic aromatics and sit outside the verified set, ginger stands in for both, and lemon at the end gives the citrus lift.",
      "Add the tomatoes in wedges and the mushrooms, halved, and simmer 4 minutes, until the tomato edges collapse.",
      "Add the shrimp and cook 3 minutes only, until they curl and turn fully pink.",
      "Off the heat, stir in the lemon juice and the salt, fish sauce is the classic seasoning and sits outside the verified set, so salt carries it; add the lemon last so it stays vivid.",
      "Taste and balance: hot first, then sour, then salty. The broth should be clear and fiery, never cloudy.",
      "Serve immediately in small bowls, shrimp and mushrooms spooned over the broth.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-th-pad-kra-pao-style",
    name: { en: "Thai Chilli Chicken Stir-Fry (Pad Kra Pao-Style)", hindi: "थाई चिली चिकन स्टर-फ्राई (पाड क्रा पाओ-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh, diced
      { foodId: "usda-2346400", grams: 240 }, // green beans
      { foodId: "usda-170106", grams: 16 }, // red chilli
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-173475", grams: 20 }, // spearmint, standing in for holy basil
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-171410", grams: 24 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-334247", grams: 8 }, // sugar
    ],
    method: [
      "Pound the garlic and red chilli together to a rough paste, this paste, fried first, is the engine of the dish.",
      "Heat the peanut oil in a wok until it just smokes and fry the paste for 30 seconds, until it hits the back of your throat.",
      "Add the chicken thigh, diced small, and stir-fry hard for 5 to 6 minutes, letting pieces sit undisturbed long enough to char at the edges, until cooked through.",
      "Add the green beans, cut short, with the salt and sugar, they stand in for the fish sauce and soy sauce of the classic, which sit outside the verified set, and stir-fry 3 minutes, until the beans are bright and just tender.",
      "Take the wok off the heat. Holy basil is the classic herb and sits outside the verified set; spearmint and coriander leaves together stand in, stir them through until just wilted.",
      "The chicken should be glossy, fiery and dry-ish, never swimming in sauce. Taste and adjust the salt.",
      "Serve at once, while the herbs are still vivid.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-th-gaeng-pa",
    name: { en: "Gaeng Pa (Thai Jungle Curry with Chicken)", hindi: "गेंग पा (थाई जंगल करी चिकन)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2685577", grams: 240 }, // eggplant
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-170106", grams: 16 }, // red chilli
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171410", grams: 16 }, // peanut oil
    ],
    method: [
      "Pound the red chilli, garlic, ginger and turmeric with half the salt to a coarse, fiery paste, a jungle curry paste is rough, not smooth.",
      "Heat the peanut oil and fry the paste for 2 minutes, until it darkens a shade and the raw edge leaves the chilli.",
      "Add the chicken breast in strips and stir-fry 3 minutes to coat it in the paste.",
      "Pour in 700 ml of water. A jungle curry carries no coconut milk at all, it is a thin, fierce, broth-like curry by design, and simmer for 8 minutes.",
      "Add the eggplant in chunks, the green beans and the red peppers and simmer 7 to 8 minutes, until the eggplant is tender and the chicken cooked through.",
      "Season with the remaining salt, fish sauce is the classic seasoning and sits outside the verified set. The curry should taste hot, salty and wild, never sweet.",
      "Serve in bowls with plenty of the thin broth ladled over.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-th-pla-neung-manao-style",
    name: { en: "Pla Neung Manao-Style (Steamed Fish with Chilli & Lime)", hindi: "प्ला नेउंग मनाओ-स्टाइल (मिर्च नींबू मछली)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 680 }, // tilapia
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-167746", grams: 80 }, // lemon
      { foodId: "usda-169997", grams: 24 }, // coriander leaves
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-2346407", grams: 200 }, // cabbage, as the steaming bed
    ],
    method: [
      "Line a heatproof plate with the cabbage leaves, they are the steaming bed that keeps the fish off the plate and catches its juices.",
      "Lay the tilapia over the cabbage, scatter the ginger in matchsticks over it and season with half the salt.",
      "Steam over boiling water for 10 to 12 minutes, until the flesh flakes at the thickest part and is opaque to the bone.",
      "While it steams, pound the garlic and red chilli roughly and stir them into 100 ml of hot water with the lemon juice and remaining salt, fish sauce seasons the classic dressing and sits outside the verified set, so salt carries it.",
      "Warm the dressing through for 1 minute only; it must stay raw and bright, never cooked dull.",
      "Pour the hot dressing over the fish the moment it leaves the steamer and scatter the coriander leaves over the top.",
      "Serve at once, spooning the chilli-lemon juices from the plate over each portion.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ Vietnamese ----------------------------- */
  {
    id: "dish-vn-ca-kho-to-style",
    name: { en: "Vietnamese Caramel Fish (Ca Kho To-Style)", hindi: "वियतनामी कैरामेल फिश (का खो तो-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 680 }, // tilapia
      { foodId: "usda-334247", grams: 20 }, // sugar, for the caramel
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-172336", grams: 12 }, // canola oil
    ],
    method: [
      "Heat the sugar in a heavy pan over medium heat and let it melt and turn a deep amber caramel, 3 to 4 minutes, this caramel, not sweetness, is the dish's colour and bitter depth.",
      "Carefully add 200 ml of hot water (it will spit), the salt and the garlic; fish sauce seasons the classic and sits outside the verified set, so salt carries the savour under the caramel.",
      "Add the onion in wedges and simmer 3 minutes to soften it in the caramel liquor.",
      "Lay the tilapia pieces in a single layer, spoon the liquor over them, cover and braise gently for 12 minutes.",
      "Turn the fish once, scatter the red chilli and black pepper, and braise 5 minutes more, until the flesh is opaque, flaky and lacquered mahogany.",
      "Uncover and reduce the liquor for 2 minutes if it is thin, it should coat the fish like a glaze.",
      "Serve straight from the pan, sauce spooned over, the caramel bitter first and the salt behind it.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ Cambodian ------------------------------ */
  {
    id: "dish-kh-fish-amok-style",
    name: { en: "Cambodian Fish Amok-Style", hindi: "कंबोडियन फिश अमोक-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 720 }, // cod
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-170172", grams: 320 }, // coconut milk
      { foodId: "usda-172231", grams: 6 }, // turmeric
      { foodId: "usda-169231", grams: 24 }, // ginger, standing in for the kroeung aromatics
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-2346407", grams: 160 }, // cabbage leaves, standing in for banana leaf cups
    ],
    method: [
      "Pound the ginger, garlic, red chilli and turmeric with the salt to a fine paste, this stands in for kroeung, whose lemongrass and galangal sit outside the verified set; ginger carries the aromatic heat.",
      "Whisk the coconut milk with the eggs until smooth, then whisk in the paste until the custard is evenly golden.",
      "Fold the cod, cut in large chunks, through the custard and rest 10 minutes so the fish takes the seasoning.",
      "Line four small heatproof bowls with cabbage leaves, banana leaf cups hold the classic and sit outside the verified set; cabbage leaves honestly do the same work.",
      "Divide the fish and custard between the bowls and steam over boiling water for 15 to 18 minutes, until the custard is just set with a gentle wobble and the fish is opaque.",
      "Rest 3 minutes; the custard firms slightly as it stands and the fish stays silky.",
      "Serve in the bowls, leaves and all, with the set custard spooned over the fish.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Korean ------------------------------- */
  {
    id: "dish-kr-dak-yukgaejang",
    name: { en: "Dak Yukgaejang (Spicy Shredded Chicken Soup)", hindi: "डाक युकगेजांग (मसालेदार चिकन सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-2346407", grams: 240 }, // cabbage, standing in for fernbrake and sprouts
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-171319", grams: 8 }, // chilli powder
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken breast in 1.5 litres of salted water for 15 minutes, until cooked through; lift it out, keep the broth, and shred the meat coarsely with two forks.",
      "Heat the sesame oil in the pot and fry the garlic, red chilli and chilli powder for 1 minute, until the oil turns brick-red and smells toasted.",
      "Add the shredded chicken and toss for 2 minutes so every strand takes the chilli oil.",
      "Pour back the broth and add the mushrooms, sliced, and the cabbage in ribbons, they stand in for the fernbrake and bean sprouts of the classic, which sit outside the verified set, and simmer 12 minutes.",
      "Beat the eggs and drizzle them in a thin stream, stirring once, so they set in soft ribbons through the soup.",
      "Taste and adjust the salt; the soup should be fiery, deep and brothy, with the sesame oil floating in red beads.",
      "Serve steaming, making sure each bowl gets chicken, vegetables and egg ribbons in balance.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kr-chicken-bulgogi-style",
    name: { en: "Chicken Bulgogi-Style (Korean Marinated Grilled Chicken)", hindi: "चिकन बुलगोगी-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-746773", grams: 200 }, // pear, for the marinade
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-171016", grams: 24 }, // sesame oil
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-334247", grams: 12 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170150", grams: 12 }, // sesame seeds
    ],
    method: [
      "Grate the pear and stir it with the garlic, crushed, the sugar, the salt and half the sesame oil, the pear's enzymes and sweetness are the classic bulgogi marinade, and salt stands in for the soy sauce outside the verified set.",
      "Slice the chicken breast thinly across the grain, coat it in the marinade and rest at least 30 minutes, or up to 4 hours in the fridge.",
      "Heat a heavy pan or grill plate until very hot and sear the chicken in a single layer, in batches, for 3 to 4 minutes per side, crowding boils it instead of charring it.",
      "Between batches, wipe the pan: the pear sugars burn fast and bitter if they build up.",
      "In the last batch, add the onion in wedges and the carrots in matchsticks and cook 3 minutes in the chicken's juices, until just softened and glossy.",
      "Check the chicken is cooked through, white to the centre, with charred, caramelised edges.",
      "Pile everything onto a warm plate, drizzle the remaining sesame oil, scatter the sesame seeds and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* ------------------------------ Indonesian ----------------------------- */
  {
    id: "dish-id-sate-lilit",
    name: { en: "Balinese Fish Satay (Sate Lilit)", hindi: "बालीनीज़ फिश साते (साते लिलित)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 640 }, // tilapia, minced
      { foodId: "usda-170169", grams: 120 }, // coconut meat, grated
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-170106", grams: 10 }, // red chilli
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Pound the garlic, ginger, red chilli and turmeric with the salt to a fine, wet paste.",
      "Mince the tilapia finely with a knife, a processor turns it to glue, until it just holds together, then work in the paste and the grated coconut meat with your hand until evenly mixed.",
      "Chill the mixture for 20 minutes; cold paste moulds cleanly and holds on the skewer.",
      "With wet hands, mould a sausage of the mixture around the thick end of each skewer, squeezing gently so it grips, lilit means wrapped, and the paste, not a marinade, is the point.",
      "Grill over medium-high heat for 8 to 10 minutes, turning every 2 minutes, until the satay is firm, cooked through and charred in stripes.",
      "Rest 2 minutes, then squeeze the lemon over them, the acid lifts the coconut and turmeric.",
      "Serve straight off the grill, several skewers per plate, while the edges are still crisp.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-id-ayam-betutu-style",
    name: { en: "Balinese Spiced Chicken (Ayam Betutu-Style)", hindi: "बालीनीज़ मसालेदार चिकन (आयाम बेतुतु-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-172231", grams: 6 }, // turmeric
      { foodId: "usda-169231", grams: 30 }, // ginger
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-330458", grams: 24 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-2346407", grams: 200 }, // cabbage leaves, standing in for banana leaf
    ],
    method: [
      "Pound the onion, garlic, ginger, red chilli, turmeric and coriander seed with the salt to a coarse, intensely fragrant paste, this base is the whole dish.",
      "Heat the coconut oil and fry the paste for 4 to 5 minutes, until it darkens, the oil separates and the raw onion smell turns sweet.",
      "Rub the fried paste all over the chicken thighs, working it into every fold, and rest 20 minutes.",
      "Wrap the chicken in parcels of cabbage leaves, banana leaf wraps the classic and sits outside the verified set; cabbage leaves honestly do the same steaming work.",
      "Place the parcels in a heavy pot with 100 ml of water, cover tightly and cook on the lowest heat for 55 to 60 minutes, until the chicken is falling-apart tender and cooked through.",
      "Open the parcels at the table if you can, the steam that escapes carries the whole spice paste with it.",
      "Serve the chicken in its leaves with the dark, oily juices spooned over.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-id-pepes-tofu-tempeh",
    name: { en: "Pepes-Style Steamed Tofu & Tempeh", hindi: "पेपेस-स्टाइल टोफू टेम्पेह" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 600 }, // tofu
      { foodId: "usda-174272", grams: 320 }, // tempeh
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170106", grams: 10 }, // red chilli
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-2346407", grams: 240 }, // cabbage leaves, standing in for banana leaf
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pound the garlic, red chilli and turmeric with the salt to a paste.",
      "Crumble the tofu and tempeh into a bowl in coarse, uneven pieces, pepes is rustic, never a smooth purée, and fold in the paste, the tomatoes in small dice and the coriander leaves, chopped.",
      "Rest the mixture for 10 minutes so the tempeh drinks in the spice.",
      "Blanch the cabbage leaves for 1 minute until pliable, they stand in for the banana leaves of the classic, which sit outside the verified set, and pat dry.",
      "Spoon a quarter of the mixture onto each leaf, fold into a firm parcel and secure with a toothpick or a fold tucked underneath.",
      "Steam the parcels for 20 minutes, until the filling is set, steaming hot and fragrant through the leaf.",
      "Serve the parcels unopened; each diner opens their own and eats the tofu and tempeh straight from the leaf.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-id-rendang-eggs",
    name: { en: "Rendang Eggs (Eggs in Rendang Sauce)", hindi: "रेंडांग एग्स (रेंडांग सॉस में अंडे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 880 }, // eggs
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-169231", grams: 24 }, // ginger
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool in cold water and peel them carefully, a rendang egg should be smooth, with the white unbroken.",
      "Pound the onion, garlic, ginger, red chilli, turmeric and coriander seed with the salt to a fine paste.",
      "Heat the coconut oil and fry the paste for 4 minutes, until it darkens and smells toasted rather than raw.",
      "Add the coconut milk and simmer gently, stirring often, for 20 to 25 minutes, a rendang is patience: the sauce reduces, darkens and finally beads with its own oil. Lemongrass perfumes the classic and sits outside the verified set; ginger carries the aromatics here.",
      "Add the peeled eggs and roll them in the sauce for 5 minutes, until every egg is lacquered deep mahogany and the sauce clings thickly.",
      "Rest 5 minutes off the heat; the sauce tightens further as it cools a fraction.",
      "Serve the eggs halved or whole, with the dark sauce spooned over and around them.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-id-tempeh-bacem",
    name: { en: "Tempeh Bacem (Javanese Braised Tempeh)", hindi: "टेम्पेह बासेम (जावानीज़ टेम्पेह)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 600 }, // tempeh
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-169640", grams: 24 }, // honey, standing in for palm sugar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-330458", grams: 16 }, // coconut oil
      { foodId: "usda-170917", grams: 2 }, // bay leaf
    ],
    method: [
      "Cut the tempeh into thick slabs, about 2 cm, thin pieces dry out in the braise and break at the sear.",
      "Soak the tamarind in 100 ml of hot water for 10 minutes, squeeze out the pulp and strain the liquor.",
      "Bring 500 ml of water to a simmer with the tamarind liquor, honey, garlic crushed, coriander seed, bay leaves and salt. Palm sugar sweetens the classic bacem and sits outside the verified set; honey honestly stands in.",
      "Lay the tempeh slabs in the liquor in a single layer, cover and braise gently for 25 minutes, turning once, until nearly all the liquid is absorbed and the tempeh is stained deep amber.",
      "Lift the slabs out and pat them dry, the sear only works on a dry surface.",
      "Heat the coconut oil and sear the slabs for 2 to 3 minutes per side, until the edges caramelise dark and crisp. This brief sear is bacem's finish, not deep-frying.",
      "Serve warm, glossy and sweet-sour, with any braising liquor reduced and spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Chinese ------------------------------ */
  {
    id: "dish-cn-yu-xiang-eggplant",
    name: { en: "Fish-Fragrant Eggplant with Turkey (Yu Xiang Qie Zi)", hindi: "फिश-फ्रेगरेंट बैंगन टर्की (यू शियांग)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2685577", grams: 600 }, // eggplant
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-170106", grams: 10 }, // red chilli
      { foodId: "usda-173469", grams: 24 }, // cider vinegar
      { foodId: "usda-334247", grams: 12 }, // sugar
      { foodId: "usda-171410", grams: 24 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Despite the name, no fish ever touches this dish, 'fish-fragrant' is the Sichuan name for the sweet-sour-hot sauce once used for fish. Cut the eggplant in batons and salt them for 10 minutes; pat dry.",
      "Heat the peanut oil until shimmering and sear the eggplant in batches for 4 to 5 minutes, until golden and silky-soft. Lift out.",
      "In the same pan, cook the ground turkey with the garlic, ginger and red chilli for 6 to 7 minutes, breaking it fine, until cooked through and crisping at the edges.",
      "Stir in the vinegar, sugar and salt with 120 ml of water, chilli bean paste anchors the classic sauce and sits outside the verified set; fresh chilli, vinegar and salt honestly rebuild its profile.",
      "Return the eggplant and toss gently for 2 to 3 minutes, until it drinks in the sauce and turns glossy.",
      "The sauce should be scant and clinging, balanced hot, sour and just sweet. Taste and adjust the vinegar before the salt.",
      "Serve at once, while the eggplant is still silky and the sauce shines.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-cn-lions-head-style",
    name: { en: "Turkey Lion's Head Meatballs with Cabbage", hindi: "टर्की लायन्स हेड मीटबॉल पत्तागोभी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 680 }, // ground turkey
      { foodId: "usda-2346407", grams: 480 }, // cabbage
      { foodId: "usda-171287", grams: 100 }, // egg, as binder
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-168936", grams: 20 }, // white flour
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-171016", grams: 16 }, // sesame oil
    ],
    method: [
      "The classic is pork; Bloom's programme carries no pork, so turkey takes its place. Stir the ground turkey with the beaten egg, flour, grated ginger, garlic and salt in one direction only, for 2 minutes, until the mixture turns sticky and pale.",
      "With wet hands, form eight large meatballs, about the size of a small fist, lion's heads are proudly oversized.",
      "Heat the sesame oil in a heavy pot and sear the meatballs for 2 minutes per side, just to set a golden crust; they finish in the braise.",
      "Line the pot with the cabbage in thick ribbons, sit the meatballs on top and add 400 ml of hot water.",
      "Cover and braise on the lowest heat for 25 to 30 minutes, until the meatballs are cooked through to the centre and the cabbage has collapsed silkily underneath.",
      "Lift the meatballs onto the cabbage and reduce the braising liquid for 3 minutes if it is thin, it should be light and savoury, not a gravy.",
      "Serve two meatballs per plate over their cabbage, with the broth spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-cn-steamed-tofu-shrimp",
    name: { en: "Cantonese Steamed Tofu with Shrimp & Egg", hindi: "कैंटोनीज़ टोफू झींगा अंडा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 800 }, // tofu
      { foodId: "usda-175179", grams: 240 }, // shrimp
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Blend the tofu with the eggs and salt until completely smooth and pourable, this is a steamed custard, and lumps would ruin its silk.",
      "Pour the mixture into a wide, shallow heatproof dish and let it settle for 2 minutes; skim any foam bubbles from the surface.",
      "Arrange the shrimp over the top in a single layer and scatter the ginger, cut in fine matchsticks, over them.",
      "Steam over gently boiling water for 12 to 15 minutes, until the custard is just set, it should tremble when the dish is nudged and the shrimp should be pink and curled.",
      "Rest 2 minutes; the custard firms a fraction and a little clear liquor gathers at the edges, that liquor is prized, not drained.",
      "Drizzle the sesame oil over the surface and scatter the coriander leaves. A soy drizzle finishes the classic and sits outside the verified set; the salt is in the custard itself here.",
      "Serve at once, spooning deep so every portion gets custard, shrimp and liquor together.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-cn-chicken-black-bean",
    name: { en: "Chicken with Black Bean & Garlic Sauce", hindi: "चिकन ब्लैक बीन लहसुन सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-173734", grams: 160 }, // black beans, dry
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171410", grams: 20 }, // peanut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then simmer in fresh water for 30 to 35 minutes, until tender. Drain, keeping a cup of their liquor.",
      "Fermented black beans drive the classic sauce and sit outside the verified set, so mash a third of the cooked beans with the garlic into a coarse paste; it honestly rebuilds that deep, savoury base.",
      "Heat the peanut oil in a wok until smoking and sear the chicken breast, cut in strips, for 4 to 5 minutes, until golden and just cooked. Lift out.",
      "Stir-fry the onion in wedges and the red peppers in chunks for 3 minutes, keeping their bite.",
      "Add the bean-garlic paste and the ginger and fry for 1 minute, until the paste darkens and smells intensely savoury.",
      "Return the chicken and the whole beans with a splash of bean liquor and the salt; toss for 2 minutes, until everything is coated in the dark sauce and the chicken is cooked through.",
      "Serve immediately, glossy and pungent, with the beans scattered through rather than sauced away.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-cn-salt-pepper-tofu",
    name: { en: "Salt & Pepper Tofu with Edamame", hindi: "साल्ट एंड पेपर टोफू एडामामे" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 1000 }, // tofu
      { foodId: "usda-168410", grams: 200 }, // edamame
      { foodId: "usda-168936", grams: 40 }, // white flour
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170931", grams: 3 }, // black pepper, standing in for Sichuan pepper
      { foodId: "usda-171410", grams: 30 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Press the tofu under a weight for 15 minutes, then cut it in large cubes, dry tofu is the whole secret of a crisp crust.",
      "Toss the cubes in the flour, salt and black pepper until every face is dusted. Sichuan pepper gives the classic its tingle and sits outside the verified set; black pepper honestly carries the heat.",
      "Heat the peanut oil in a wide pan and pan-fry the tofu in a single layer, in batches, for 6 to 8 minutes, turning until every face is deep golden and crisp, shallow pan-frying, never deep-frying.",
      "Lift the tofu onto a rack. In the same pan, fry the garlic and red chilli for 30 seconds until fragrant and just golden.",
      "Add the edamame and toss for 2 minutes, until hot through and bright green.",
      "Return the tofu and toss everything together for 30 seconds so the garlic and chilli cling to the crust.",
      "Serve immediately, while the crust still crackles against the soft centre.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-tw-sesame-oil-chicken",
    name: { en: "Taiwanese Sesame Oil Chicken Soup (Ma You Ji)", hindi: "ताइवानी तिल तेल चिकन सूप (मा यू जी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-171016", grams: 40 }, // sesame oil
      { foodId: "usda-169231", grams: 60 }, // ginger
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
    ],
    method: [
      "Warm the sesame oil over the lowest heat, sesame oil scorches fast and turns bitter, and patience here is the whole technique.",
      "Fry the ginger, sliced thick, for 4 to 5 minutes, until the slices curl and their edges turn golden; the oil should smell deeply nutty.",
      "Raise the heat, add the chicken thigh chunks and sear for 5 minutes, until they take colour in the ginger oil.",
      "Pour in 900 ml of water and the salt and simmer gently for 20 minutes. Rice wine simmers in the classic and sits outside the verified set; here the broth stays clean and ginger-led without it.",
      "Check the chicken is cooked through and tender; the broth should be light, golden and fragrant rather than thick.",
      "Rest 3 minutes off the heat so the oil settles into beads on the surface.",
      "Serve in bowls with the coriander leaves scattered over, drinking the broth as you go.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ----------------------------- Sri Lankan ------------------------------ */
  {
    id: "dish-lk-ambul-thiyal-style",
    name: { en: "Sri Lankan Sour Fish (Ambul Thiyal-Style)", hindi: "श्रीलंकन खट्टी मछली (अंबुल थियाल-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 640 }, // mackerel
      { foodId: "usda-167763", grams: 60 }, // tamarind, standing in for goraka
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170924", grams: 4 }, // curry powder
    ],
    method: [
      "Soak the tamarind in 120 ml of hot water for 10 minutes and strain the sour liquor, it stands in for goraka, the souring fruit of the classic, which sits outside the verified set.",
      "Pound the garlic, red chilli, black pepper, turmeric and curry powder with the salt and stir them into the tamarind liquor to make a thick, dark paste.",
      "Coat the mackerel pieces completely in the paste and rest them for 15 minutes, this is a dry curry, and the paste is all the sauce there will be.",
      "Lay the onion, sliced, in the base of a heavy pan, sit the fish over it and add 3 tablespoons of water only.",
      "Cover and cook on the lowest heat for 18 to 20 minutes, shaking the pan occasionally, until the fish is firm, opaque and the liquor has almost entirely dried into the paste.",
      "Do not stir, the pieces must stay whole, stained deep amber and intensely sour.",
      "Serve the fish with its clinging paste and the softened onion from beneath it.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Nepali -------------------------------- */
  {
    id: "dish-np-chicken-choila-style",
    name: { en: "Nepali Chicken Choila-Style", hindi: "नेपाली चिकन चोइला-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-172337", grams: 24 }, // mustard oil
      { foodId: "usda-171324", grams: 3 }, // fenugreek seed
      { foodId: "usda-170106", grams: 10 }, // red chilli
      { foodId: "usda-169231", grams: 24 }, // ginger
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Grill or sear the chicken breast hard for 6 to 7 minutes per side, until cooked through with genuinely charred edges, choila begins with fire, not a pan simmer.",
      "Rest the chicken 5 minutes, then chop it into rough bite-size pieces, charred edges and all.",
      "Heat the mustard oil until it just smokes, take it off the heat and drop in the fenugreek seeds for 20 seconds, until they darken, this tempering is the dish's signature pungency.",
      "In a wide bowl, combine the raw onion in fine slices, the tomatoes in dice, the ginger in matchsticks, the garlic crushed and the red chilli, sliced, with the lemon juice and salt.",
      "Add the warm chopped chicken and pour the hot fenugreek oil over everything; toss thoroughly with your hands or two spoons. Choila is never cooked after this point, the heat of the chicken and oil just wilts the onion.",
      "Rest 10 minutes so the chicken drinks in the lemon and mustard oil.",
      "Scatter the coriander leaves and serve at room temperature, sharp and smoky.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Iberian ------------------------------- */
  {
    id: "dish-pt-bacalhau-bras-style",
    name: { en: "Bacalhau à Brás-Style (Cod with Potato & Egg)", hindi: "बाकाल्याऊ आ ब्रास-स्टाइल (कॉड आलू अंडा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // cod, fresh in place of salt cod
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2346401", grams: 480 }, // potatoes
      { foodId: "usda-790646", grams: 240 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 30 }, // olive oil
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "The classic is salt cod; Bloom cooks it with fresh cod and the salt in the pan, honestly stated, the texture and the egg finish are the dish. Poach the cod in simmering water for 7 minutes, then flake it coarsely, discarding skin and bones.",
      "Cut the potatoes into true matchsticks and rinse off their starch; pat very dry.",
      "Pan-fry the matchsticks in half the olive oil, in batches, for 5 to 6 minutes, until crisp and golden, a shallow pan-fry in the Lisbon style, not a deep-fry, and drain on a rack.",
      "Soften the onion in long slices with the garlic in the remaining olive oil for 6 minutes, until sweet and translucent.",
      "Add the flaked cod and toss for 2 minutes to warm it through the onion.",
      "Beat the eggs with the salt and black pepper, pour them over the cod off the fiercest heat and stir gently for 1 to 2 minutes, folding the potato matchsticks through at the last moment, the egg must stay soft and creamy, never scrambled dry.",
      "Serve immediately, piled high, while the potatoes still crackle against the soft egg.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-es-marmitako",
    name: { en: "Basque Tuna & Potato Stew (Marmitako)", hindi: "बास्क टूना आलू स्टू (मार्मिताको)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 640 }, // canned tuna
      { foodId: "usda-2346401", grams: 480 }, // potatoes
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-170427", grams: 160 }, // green peppers
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171413", grams: 24 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion and both peppers, cut in rough chunks, in the olive oil for 8 minutes, until sweet and collapsing at the edges, this sofrito is the stew's base.",
      "Add the garlic and the tomatoes, grated or finely chopped, and cook 5 minutes, until the tomato darkens and the oil separates.",
      "Break the potatoes in with a knife, cracking each chunk off rather than slicing it, the rough, cracked edges release the starch that thickens a marmitako.",
      "Cover with 800 ml of water, add the salt and simmer 20 minutes, until the potatoes are tender and the broth has body.",
      "Drain the tuna and add it in large chunks off the boil; cover and rest 5 minutes. Tuna poached in the residual heat stays moist, boiled, it turns to wool.",
      "Check the tuna is warmed through and the potatoes creamy at the edges; adjust the salt.",
      "Serve in earthenware bowls with plenty of the broth, as the Basque fishing crews ate it.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pt-arroz-de-marisco-style",
    name: { en: "Portuguese Seafood Rice (Arroz de Marisco-Style)", hindi: "पुर्तगाली सीफूड राइस (अरोज़ दे मारिस्को-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 480 }, // shrimp
      { foodId: "usda-2684442", grams: 240 }, // tilapia
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171413", grams: 24 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
    ],
    method: [
      "Soften the onion and red peppers in the olive oil for 6 minutes; add the garlic and tomatoes and cook 5 minutes more, until the base is dark, sweet and jammy.",
      "Stir in the rice to coat it in the base, then pour in 1 litre of hot water with the salt, this is a brothy rice, almost a soup, never a dry pilaf.",
      "Simmer for 12 minutes, stirring twice, until the rice is nearly tender and the broth still flows around it.",
      "Lay the tilapia in chunks and the shrimp over the rice, cover and cook 4 to 5 minutes, until the shrimp are pink and the fish flakes.",
      "Rest off the heat for 3 minutes; the rice drinks a little broth but must stay loose and shining.",
      "Scatter the coriander leaves and bring the pot to the table.",
      "Serve in deep bowls, ladling rice, seafood and broth together in every portion.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pt-cataplana-style",
    name: { en: "Algarve Seafood Cataplana-Style", hindi: "अलगार्वे सीफूड कैटाप्लाना-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 400 }, // shrimp
      { foodId: "usda-2684442", grams: 320 }, // tilapia
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171413", grams: 24 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "A cataplana is a sealed copper clamshell; a heavy lidded pan honestly does the same work. Oil its base and layer the potatoes, sliced thin, across the bottom with a pinch of the salt.",
      "Layer the onion in rings, the red peppers in strips and the tomatoes in slices over the potatoes, seasoning lightly as you go.",
      "Lay the tilapia in chunks and the shrimp over the top, scatter the garlic, drizzle the remaining olive oil and add 100 ml of water.",
      "Clamp the lid on and cook over medium heat for 15 minutes without opening, the seafood steams in the vegetables' juices, which is the entire point of the vessel.",
      "Check once, quickly: the potatoes should be tender, the shrimp pink and curled and the fish opaque.",
      "Carry the pan to the table still closed and open it there, so the first breath of steam reaches the diners, not the kitchen.",
      "Serve straight from the pan, layering potato, vegetables and seafood onto each plate with the juices.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Belgian ------------------------------- */
  {
    id: "dish-be-waterzooi",
    name: { en: "Ghent Chicken Waterzooi", hindi: "गेन्ट चिकन वॉटरज़ूई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-2346401", grams: 320 }, // potatoes
      { foodId: "usda-172184", grams: 68 }, // egg yolks, for the liaison
      { foodId: "usda-322892", grams: 200 }, // milk, standing in for cream
      { foodId: "usda-790646", grams: 120 }, // onion, standing in for leek
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
    ],
    method: [
      "Poach the chicken breast gently in 1 litre of salted water for 15 minutes, until just cooked through; lift it out and keep the broth, a waterzooi is built on its own poaching liquor.",
      "Melt the butter and soften the onion in fine slices for 5 minutes. Leeks are the classic allium and sit outside the verified set; onion honestly stands in, cooked sweeter to compensate.",
      "Add the carrots in matchsticks and the potatoes in small chunks with the broth, and simmer 15 minutes, until tender.",
      "Slice the chicken thickly and return it to the pot to warm through for 3 minutes.",
      "Whisk the egg yolks with the milk, milk stands in for the classic cream, and temper the mixture with a ladle of hot broth, whisking constantly.",
      "Stir the liaison into the pot off the heat and warm it gently for 2 minutes, never letting it boil, until the broth turns velvet and pale gold. A boil here curdles it beyond rescue.",
      "Serve in deep bowls with the coriander leaves scattered over, the broth rich and the chicken in thick slices.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Albanian ------------------------------ */
  {
    id: "dish-al-tave-kosi-style",
    name: { en: "Tavë Kosi-Style (Lamb Baked in Yogurt & Egg)", hindi: "तावे कोसी-स्टाइल (मेमना दही अंडा बेक)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // ground lamb
      { foodId: "usda-330137", grams: 320 }, // Greek yogurt
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-2512381", grams: 120 }, // white rice, dry
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173410", grams: 16 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cook the rice in 240 ml of water until just tender and spread it over the base of a buttered baking dish, it is the bed the lamb and custard bake on.",
      "Brown the ground lamb with the onion in a dry pan for 8 minutes, breaking it coarse, until cooked through and its fat has rendered and mostly dried; season with half the salt.",
      "Spread the lamb evenly over the rice.",
      "Whisk the Greek yogurt with the eggs and remaining salt until completely smooth, any lump now stays a lump in the oven.",
      "Pour the yogurt custard over the lamb, dot the surface with the butter and rest 5 minutes so the custard settles into the meat.",
      "Bake at 180°C for 28 to 32 minutes, until the top is set, puffed and patched with deep gold, the centre should tremble only slightly.",
      "Rest 10 minutes before cutting; the custard slices cleanly and the lamb stays juicy beneath it.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-al-fergese-style",
    name: { en: "Fergesë-Style (Pepper & Cottage Cheese Bake)", hindi: "फेर्गेसे-स्टाइल (शिमला मिर्च कॉटेज चीज़ बेक)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 800 }, // cottage cheese, standing in for gjizë
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-170108", grams: 320 }, // red peppers
      { foodId: "usda-170427", grams: 200 }, // green peppers
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 24 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Char the peppers whole over a flame or under a grill for 8 minutes, turning, until blistered black in patches; rest them in a covered bowl, then rub off the skins and cut them in strips.",
      "Soften the onion in the olive oil for 5 minutes, add the garlic and the tomatoes, chopped, and cook 6 minutes, until the tomato collapses into a thick sauce.",
      "Stir the pepper strips through the tomato and cook 2 minutes more.",
      "Fold in the cottage cheese, it stands in for Albania's salted gjizë, which sits outside the verified set, and the salt, and warm through for 2 minutes without boiling.",
      "Beat the eggs and fold them through the cheese mixture, then tip everything into a wide baking dish.",
      "Bake at 180°C for 15 to 18 minutes, until the edges are set and golden and the centre is still soft and spoonable.",
      "Serve straight from the dish, scooped rather than sliced, with the peppers showing through the cheese.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* ------------------------------- Romanian ------------------------------ */
  {
    id: "dish-ro-ciorba-perisoare",
    name: { en: "Ciorbă de Perișoare (Turkey Meatball Sour Soup)", hindi: "चोर्बा दे पेरिशोआरे (टर्की मीटबॉल सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2512381", grams: 120 }, // white rice, dry, in the meatballs
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-167746", grams: 50 }, // lemon, for the souring
      { foodId: "usda-169997", grams: 16 }, // coriander leaves, standing in for lovage
      { foodId: "usda-171287", grams: 100 }, // egg, as binder
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Mix the ground turkey with the raw rice, the beaten egg, half the onion grated and half the salt; rest 15 minutes, then roll into walnut-sized meatballs with wet hands.",
      "Soften the remaining onion and the carrots, finely diced, in the sunflower oil for 5 minutes.",
      "Add the tomatoes, chopped, and 1.5 litres of water; simmer 10 minutes to build the soup base.",
      "Lower the meatballs in one by one and poach gently for 20 minutes, a rolling boil breaks them, until the rice inside is tender and the meat cooked through.",
      "Stir in the lemon juice off the heat: a ciorbă is defined by its souring, borș in the classic, and lemon honestly carries it here since borș sits outside the verified set.",
      "Taste: sour first, then savoury, the broth light and red. Adjust salt after the lemon, never before.",
      "Serve with the coriander leaves, standing in for the classic lovage, scattered over each bowl.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Bosnian ------------------------------ */
  {
    id: "dish-ba-begova-corba",
    name: { en: "Begova Čorba (Chicken & Okra Soup)", hindi: "बेगोवा चोर्बा (चिकन भिंडी सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-169260", grams: 240 }, // okra
      { foodId: "usda-2512381", grams: 120 }, // white rice, dry
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-172184", grams: 34 }, // egg yolk, for the liaison
      { foodId: "usda-168936", grams: 16 }, // white flour
      { foodId: "usda-173410", grams: 16 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Simmer the chicken thighs in 1.4 litres of salted water for 20 minutes, until cooked through; lift them out, keep the broth, and cut the meat in small pieces.",
      "Return the broth to the boil and add the rice, the carrots in fine dice and the onion, finely chopped; simmer 12 minutes.",
      "Add the okra, trimmed whole, and simmer 6 minutes more, okra added late stays whole and silky rather than dissolving.",
      "Meanwhile melt the butter, stir in the flour and cook the roux for 2 minutes until it smells nutty; whisk in a ladle of broth until smooth, then stir it into the soup.",
      "Whisk the egg yolk with the lemon juice and temper it with hot soup, then stir it in off the heat, the bey's soup is finished like this, velvet and pale, and it must never boil again.",
      "Return the chicken pieces and warm through for 2 minutes; check the seasoning.",
      "Serve in small bowls, rich and silky, with the okra whole in the golden broth.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------------- Greek ------------------------------- */
  {
    id: "dish-gr-turkey-stifado-style",
    name: { en: "Turkey Stifado-Style (Greek Onion & Tomato Stew)", hindi: "टर्की स्टिफ़ाडो-स्टाइल (प्याज़ टमाटर स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 600 }, // turkey breast
      { foodId: "usda-790646", grams: 800 }, // onions, the soul of the dish
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-173469", grams: 40 }, // cider vinegar
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171413", grams: 24 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-334247", grams: 8 }, // sugar
    ],
    method: [
      "Stifado is a beef stew in Greece; Bloom's programme carries no beef, so turkey breast takes its place, the mountain of onions, cinnamon and vinegar is unchanged.",
      "Brown the turkey, cut in large chunks, in half the olive oil for 5 to 6 minutes, until golden on most sides; lift it out.",
      "Add the remaining oil and all the onions, cut in thick wedges, and cook slowly for 12 minutes, until they soften and sweeten without colouring hard.",
      "Add the garlic, the tomatoes, chopped, the vinegar, cinnamon, bay leaves, sugar and salt with 300 ml of water.",
      "Return the turkey, cover and braise on the lowest heat for 40 to 45 minutes, until the turkey is tender and the onions have melted into a thick, sweet-sour sauce.",
      "Rest 10 minutes off the heat; a stifado's sauce settles and darkens as it stands.",
      "Serve the turkey buried in its onions, with the sauce spooned over, the onions are not a garnish, they are half the dish.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Persian ------------------------------ */
  {
    id: "dish-ir-tahchin-style",
    name: { en: "Tahchin-Style Baked Yogurt Rice with Chicken", hindi: "ताहचिन-स्टाइल बेक्ड दही चावल चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 520 }, // chicken breast
      { foodId: "usda-2512381", grams: 280 }, // white rice, dry
      { foodId: "usda-330137", grams: 300 }, // Greek yogurt
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-172231", grams: 4 }, // turmeric, standing in for saffron's colour
      { foodId: "usda-171025", grams: 24 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken breast with the onion, halved, and half the salt in water for 15 minutes, until cooked through; lift it out and shred it coarsely. Keep it moist in a little of its liquor.",
      "Parboil the rice in salted water for 6 minutes, until the grains are tender at the edges and chalky at the core; drain.",
      "Whisk the Greek yogurt with the eggs, the turmeric and the remaining salt. Saffron colours the classic and sits outside the verified set; turmeric honestly gives the gold, though the aroma is its own.",
      "Fold half the parboiled rice through the yogurt mixture until every grain is coated.",
      "Oil a heavy pot or cake tin generously, press the yogurt rice in as an even base, layer the shredded chicken over it and cover with the remaining plain rice, pressing gently.",
      "Cover and bake at 180°C (or steam on the lowest hob heat) for 40 minutes, until the base is set and the crust, the tahdig, is deep golden and crisp.",
      "Rest 10 minutes, then invert the whole tahchin onto a plate in one piece and cut it in wedges, crust side up.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* -------------------------------- Yemeni ------------------------------- */
  {
    id: "dish-ye-saltah-style",
    name: { en: "Saltah-Style Turkey & Fenugreek Stew", hindi: "साल्ताह-स्टाइल टर्की मेथी स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-2346401", grams: 320 }, // potatoes
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-171324", grams: 8 }, // fenugreek seed, for the hulba froth
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
    ],
    method: [
      "Soak the ground fenugreek seed in 100 ml of water for at least 1 hour, this becomes the hulba froth that crowns the dish, and it cannot be rushed.",
      "Brown the ground turkey in the sunflower oil for 7 to 8 minutes, breaking it coarse, until cooked through and taking colour.",
      "Add the onion, garlic and cumin and cook 3 minutes; add the tomatoes, chopped, and the red chilli and cook 5 minutes into a rough sauce.",
      "Add the potatoes in small cubes with 500 ml of water and the salt; simmer 15 minutes, until the potatoes are tender and the stew has body.",
      "Drain the fenugreek, keeping its soaking water, and whisk the swollen seeds vigorously for 3 to 4 minutes, adding spoonfuls of the soaking water, until they whip into a pale, stable froth.",
      "Bring the stew back to a fierce, bubbling boil in its heaviest pot, saltah is served still bubbling, traditionally in stone.",
      "Spoon the hulba froth over the top, scatter the coriander leaves and carry it to the table immediately, froth collapsing as it goes.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Algerian ------------------------------ */
  {
    id: "dish-dz-chorba-style",
    name: { en: "Algerian Chorba-Style (Turkey, Barley & Chickpea Soup)", hindi: "अल्जीरियन चोर्बा-स्टाइल (टर्की जौ चना सूप)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 480 }, // ground turkey
      { foodId: "usda-2644282", grams: 120 }, // chickpeas, dry
      { foodId: "usda-170284", grams: 120 }, // barley, standing in for freekeh
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
      { foodId: "usda-173475", grams: 8 }, // spearmint
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight and drain. Brown the ground turkey in the sunflower oil with the onion for 6 to 7 minutes, until cooked through and coloured.",
      "Add the tomatoes, grated or finely chopped, and cook 5 minutes, until the base turns dark red and the oil separates.",
      "Add the chickpeas, the barley and 1.5 litres of water with the salt, barley stands in for the freekeh of the classic, which sits outside the verified set, and simmer 35 to 40 minutes.",
      "Add the carrots in fine dice for the last 15 minutes, so they sweeten the broth without dissolving.",
      "Check the chickpeas: they should crush softly between finger and thumb, and the barley should be tender and swollen, thickening the soup.",
      "Stir in the coriander leaves and spearmint off the heat, a chorba is finished with fresh herbs, never cooked in them.",
      "Serve in bowls, brothy and red, with the herbs vivid on the surface.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Jewish ------------------------------- */
  {
    id: "dish-il-gefilte-style",
    name: { en: "Gefilte-Style Fish Cakes in Broth", hindi: "गेफ़िल्टे-स्टाइल फिश केक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 480 }, // cod
      { foodId: "usda-333374", grams: 240 }, // haddock
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-168936", grams: 24 }, // white flour, standing in for matzo meal
      { foodId: "usda-334247", grams: 4 }, // sugar
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Mince the cod and haddock finely with a knife, or pulse briefly, the mixture should be fine but never a paste.",
      "Work in the grated onion, the beaten egg, the flour, the sugar, the salt and the black pepper until evenly bound. Matzo meal binds the classic and sits outside the verified set; a little flour honestly does the same work.",
      "Chill the mixture for 20 minutes, cold mixture shapes cleanly and poaches without breaking.",
      "Bring 1.2 litres of water to a bare simmer with the carrots, sliced in coins, and the remaining onion flavour from the pot.",
      "With wet hands, shape the fish mixture into eight smooth ovals and lower them gently into the simmering water.",
      "Poach at the barest simmer for 28 to 30 minutes, never a boil, until the cakes are firm, pale and cooked through.",
      "Serve warm or chilled, two cakes per plate, with the carrots and a spoonful of their poaching liquor over them.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* ------------------------------ Levantine ------------------------------ */
  {
    id: "dish-lb-shish-barak-style",
    name: { en: "Shish Barak-Style (Turkey Dumplings in Garlic Yogurt)", hindi: "शीश बाराक-स्टाइल (टर्की डंपलिंग दही)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 560 }, // ground turkey
      { foodId: "usda-168936", grams: 240 }, // white flour, for the wrappers
      { foodId: "usda-330137", grams: 400 }, // Greek yogurt
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
      { foodId: "usda-173475", grams: 8 }, // spearmint
      { foodId: "usda-173410", grams: 16 }, // butter
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the flour with 120 ml of water and a pinch of the salt into a smooth dough; rest it, covered, for 30 minutes.",
      "Brown the ground turkey with the onion, finely chopped, for 7 to 8 minutes, until cooked through and dry; season with half the salt and cool completely, a warm filling melts the wrappers.",
      "Roll the dough very thin and cut small circles, about 5 cm. Fill each with a teaspoon of turkey, fold into a half-moon and pinch the corners together into the classic little hat shape.",
      "Whisk the Greek yogurt with 200 ml of water and the remaining salt and warm it gently in a wide pot, stirring, until it steams, yogurt sauce scorches and splits if rushed.",
      "Lower the dumplings into the yogurt and poach gently for 8 to 10 minutes, until they float and the wrappers are tender.",
      "Melt the butter and fry the garlic, crushed, with the coriander leaves and spearmint for 1 minute, until the garlic is golden; pour this sizzling drizzle over the pot.",
      "Serve in shallow bowls, dumplings and yogurt sauce together, the garlic butter still fragrant on top.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Egyptian ------------------------------ */
  {
    id: "dish-eg-hawawshi-style",
    name: { en: "Hawawshi-Style Spiced Turkey Flatbread", hindi: "हवावशी-स्टाइल टर्की फ्लैटब्रेड" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour, for the flatbread
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-170457", grams: 160 }, // tomatoes
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the flour with 140 ml of warm water and a pinch of the salt into a soft dough; rest 30 minutes. This whole wheat flatbread stands in for Egypt's baladi bread.",
      "Grate the onion and squeeze it dry; finely chop the red peppers and the tomatoes, squeezing out their seeds and juice, a wet filling steams the bread soggy.",
      "Mix the raw ground turkey with the onion, peppers, tomato, garlic, cumin, chilli powder and remaining salt until evenly seasoned.",
      "Divide the dough in four, roll each piece into a thin round and spread a quarter of the turkey mixture over it in an even layer, leaving a rim.",
      "Fold each round over into a half-moon and press the edges firmly to seal, or lay a second thin round on top and crimp, Cairo style.",
      "Brush the parcels with the sunflower oil and bake at 200°C for 15 to 18 minutes, until the bread is crisp and blistered and the turkey inside is cooked through.",
      "Rest 3 minutes, cut in wedges and serve hot, the spiced juices soaking into the bread's underside.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* ---------------------------- West African ----------------------------- */
  {
    id: "dish-ng-chicken-suya",
    name: { en: "Nigerian Chicken Suya", hindi: "नाइजीरियन चिकन सूया" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-172430", grams: 80 }, // peanuts, ground for the yaji rub
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-790646", grams: 200 }, // onion, served raw
      { foodId: "usda-2346406", grams: 200 }, // cucumber, served raw
      { foodId: "usda-170457", grams: 160 }, // tomatoes, served raw
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-171410", grams: 12 }, // peanut oil
    ],
    method: [
      "Grind the peanuts to a coarse powder with the ginger, chilli powder and salt, this is yaji, the suya spice; ground too fine it turns to paste, so stop while it is still sandy.",
      "Slice the chicken breast into long, thin strips, toss them in the peanut oil, then press the yaji rub all over them until every surface is coated.",
      "Rest the chicken for at least 30 minutes so the rub sets into a crust; thread the strips onto skewers in loose waves.",
      "Grill over the highest heat for 4 to 5 minutes per side, until the chicken is cooked through and the peanut crust is charred in spots, suya is smoky at the edges by design.",
      "Rest the skewers for 3 minutes; the crust firms as it stands.",
      "Slice the onion, cucumber and tomatoes and arrange them raw alongside, their cool crunch against the hot, fiery chicken is half the experience.",
      "Serve the skewers over the salad with any remaining yaji dusted over the top.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ng-efo-riro-style",
    name: { en: "Efo Riro-Style Spinach Stew with Turkey & Shrimp", hindi: "एफ़ो रिरो-स्टाइल पालक स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 400 }, // ground turkey
      { foodId: "usda-175179", grams: 240 }, // shrimp
      { foodId: "usda-168462", grams: 480 }, // spinach
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-171410", grams: 30 }, // peanut oil, standing in for palm oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170106", grams: 10 }, // red chilli
    ],
    method: [
      "Blend the red peppers, tomatoes, red chilli and half the onion to a coarse purée, efo riro's base is rough, never smooth.",
      "Heat the peanut oil, it stands in for the palm oil of the classic, which sits outside the verified set, and fry the remaining onion, sliced, for 3 minutes.",
      "Add the pepper purée and fry for 10 minutes, stirring, until it thickens, darkens and the oil rises to the surface in beads.",
      "Add the ground turkey and the salt and cook 7 to 8 minutes, breaking the turkey through the sauce, until cooked through.",
      "Add the shrimp and cook 3 minutes, until they turn pink.",
      "Fold in the spinach in three batches, letting each wilt before the next, and cook 2 minutes only, the greens must stay vivid, not stew to khaki.",
      "Serve the stew thick and glossy, the spinach green against the red pepper base.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-cm-ndole-style",
    name: { en: "Cameroonian Ndole-Style (Greens, Peanuts, Shrimp & Turkey)", hindi: "कैमरून न्डोले-स्टाइल (साग मूंगफली झींगा टर्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 320 }, // shrimp
      { foodId: "usda-2514747", grams: 320 }, // ground turkey
      { foodId: "usda-172430", grams: 120 }, // peanuts
      { foodId: "usda-168462", grams: 400 }, // spinach, standing in for bitterleaf
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171410", grams: 20 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the peanuts in water for 10 minutes to soften them, then blend with 300 ml of their cooking water into a smooth, creamy sauce.",
      "Brown the ground turkey in half the peanut oil for 6 to 7 minutes, until cooked through and coloured; season with the salt.",
      "Pour the peanut cream over the turkey and simmer gently for 10 minutes, until it thickens to a sauce that coats a spoon.",
      "Fold in the spinach in batches, it stands in for ndole's bitterleaf, which sits outside the verified set, and cook 3 minutes, until wilted deep green through the cream.",
      "In a small pan, heat the remaining peanut oil and fry the onion in slices with the garlic for 3 minutes, until golden at the edges.",
      "Lay the shrimp over the stew, cover and cook 3 minutes, until they turn pink, then pour the onion-garlic oil over everything.",
      "Serve the ndole glossy and pale gold, the greens and shrimp showing through the peanut cream.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ci-kedjenou",
    name: { en: "Ivorian Kedjenou (Slow-Cooked Chicken)", hindi: "आइवोरियन केजेनू (धीमा पका चिकन)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 240 }, // onion
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-169231", grams: 24 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-171025", grams: 8 }, // sunflower oil
    ],
    method: [
      "Kedjenou cooks in a sealed pot with no added water, the chicken and vegetables make their own sauce. Oil the base of a heavy pot with a tight lid.",
      "Layer the chicken thighs in first, then the onion in thick slices, the red peppers in strips, the tomatoes in wedges, the ginger grated, the garlic and the red chilli, with the salt scattered through.",
      "Clamp the lid on, a ring of dough seals the classic canari pot; a tight lid and low heat honestly do the same work, and set over the lowest heat.",
      "Cook for 50 minutes without opening. Shake the whole pot firmly every 15 minutes to move the contents without breaking the seal; never stir.",
      "Open and check: the chicken should be falling tender and cooked through, sitting in a concentrated sauce the vegetables gave up.",
      "If the sauce is thin, boil it uncovered for 3 minutes, but it rarely is; the seal keeps everything in.",
      "Serve straight from the pot, chicken and vegetables spooned over with their own juices.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ---------------------------- East African ----------------------------- */
  {
    id: "dish-ug-matoke-turkey",
    name: { en: "Ugandan Matoke with Turkey (Green Banana Stew)", hindi: "युगांडन माटोके टर्की (केला स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2710818", grams: 800 }, // plantains, standing in for matoke bananas
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170924", grams: 4 }, // curry powder
    ],
    method: [
      "Matoke are Uganda's cooking bananas; the plantains in the verified set are their close kin and cook the same way. Peel them with a knife, the skin does not come by hand, and cut in thick chunks into water so they do not darken.",
      "Brown the ground turkey in the sunflower oil with the onion for 7 minutes, until cooked through and coloured; add the garlic and curry powder for the last minute.",
      "Add the tomatoes, chopped, and the red peppers and cook 5 minutes into a rough sauce.",
      "Lay the plantain chunks into the sauce, add 400 ml of water and the salt, cover and simmer for 22 to 25 minutes.",
      "Check the plantain: it should be completely tender and starting to melt at the edges, thickening the stew to a soft, spoonable mass.",
      "Rest 5 minutes; the stew settles and the sauce clings.",
      "Serve in deep bowls, the turkey stewed through the golden plantain, not beside it.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ao-calulu-style",
    name: { en: "Angolan Calulu-Style Fish & Greens Stew", hindi: "अंगोलन कालुलु-स्टाइल मछली साग स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-169260", grams: 200 }, // okra
      { foodId: "usda-168462", grams: 240 }, // spinach
      { foodId: "usda-2685577", grams: 240 }, // eggplant
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-2346404", grams: 200 }, // sweet potato
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171025", grams: 20 }, // sunflower oil, standing in for palm oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the sunflower oil, it stands in for the palm oil of the classic, which sits outside the verified set, and soften the onion and garlic for 4 minutes.",
      "Add the tomatoes, chopped, and cook 5 minutes into a base sauce; season with the salt.",
      "Layer the sweet potato in chunks and the eggplant over the base, add 300 ml of water, cover and simmer 10 minutes.",
      "Lay the tilapia in large chunks over the vegetables and scatter the okra, trimmed whole, around it; cover and simmer 8 minutes without stirring.",
      "Fold the spinach over the top and cook 3 minutes more, until it wilts and the fish flakes at a touch.",
      "Rest 3 minutes off the heat; the okra's silk thickens the sauce slightly as it stands.",
      "Serve in bowls, lifting portions so fish, vegetables and greens come up together with the sauce.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ke-maharagwe",
    name: { en: "Kenyan Red Beans in Coconut (Maharagwe)", hindi: "केन्यन लाल राजमा नारियल (महाराग्वे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 480 }, // kidney beans, dry
      { foodId: "usda-170172", grams: 320 }, // coconut milk
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-330458", grams: 16 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, drain, cover with fresh water and simmer for 40 to 45 minutes, until completely tender, a maharagwe bean must crush to cream between finger and thumb.",
      "Heat the coconut oil in a wide pan and soften the onion for 5 minutes; add the garlic and turmeric for the last minute.",
      "Add the tomatoes, chopped, and cook 6 minutes, until they collapse and the oil separates at the edges.",
      "Drain the beans, keeping a cup of their liquor, and add them to the tomato base with the salt.",
      "Pour in the coconut milk and simmer gently for 10 minutes, stirring now and then, until the sauce turns creamy and coats the beans, add bean liquor if it thickens too far.",
      "Mash a spoonful of beans against the side of the pan and stir them back in; the sauce gains body without any flour.",
      "Serve in deep bowls, the beans glossy in their coconut sauce.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ----------------------------- Mozambican ------------------------------ */
  {
    id: "dish-mz-zambeziana-style",
    name: { en: "Mozambican Grilled Coconut Chicken (Zambeziana-Style)", hindi: "मोज़ाम्बिकन ग्रिल्ड नारियल चिकन (ज़ाम्बेज़ियाना-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-170172", grams: 240 }, // coconut milk, for the marinade and sauce
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-170106", grams: 10 }, // red chilli
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-330458", grams: 16 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
    ],
    method: [
      "Stir the coconut milk with the lemon juice, the garlic crushed, the red chilli finely sliced and the salt, this is both marinade and, later, the sauce, so keep it clean and cold.",
      "Coat the chicken thighs in two-thirds of the marinade and rest for at least 1 hour, or overnight in the fridge; keep the remaining third aside, untouched by raw chicken.",
      "Heat the coconut oil in a grill pan until very hot. Lift the chicken out of its marinade, letting the excess drip off, and grill for 7 to 8 minutes per side.",
      "Baste twice with the cooked-down pan juices as it grills; the coconut sugars should char in dark, sticky patches and the chicken must be cooked through.",
      "Meanwhile bring the reserved marinade to a full boil for 2 minutes, it must boil properly to be served as a sauce, and simmer until it thickens slightly.",
      "Rest the chicken 5 minutes, then slice it thickly.",
      "Serve the slices with the hot coconut sauce spooned over and the coriander leaves scattered on top.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* ----------------------------- Guatemalan ------------------------------ */
  {
    id: "dish-gt-pepian",
    name: { en: "Guatemalan Pepián de Pollo", hindi: "ग्वाटेमालन पेपियान दे पोलो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2515380", grams: 60 }, // pepitas (pumpkin seeds)
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170150", grams: 24 }, // sesame seeds
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken thighs in 800 ml of salted water for 18 minutes, until cooked through; lift them out and keep the broth, the sauce is built on it.",
      "Toast the pepitas and sesame seeds in a dry pan for 3 to 4 minutes, until they puff, pop and turn golden; grind them finely while warm.",
      "Char the tomatoes, onion and garlic in the same dry pan for 8 minutes, turning, until blackened in patches, a pepián's depth is char, not just spice.",
      "Blend the charred vegetables with the ground seeds, the red chilli, the cinnamon and 400 ml of the chicken broth into a thick, dark sauce.",
      "Heat the sunflower oil, pour in the sauce and fry it for 5 minutes, stirring, until it darkens and thickens, this frying step is what makes it a pepián and not a soup.",
      "Return the chicken to the sauce and simmer 10 minutes, until the sauce clings thickly and the chicken is heated through.",
      "Serve the chicken buried in its mahogany sauce, with extra sauce spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-gt-jocon-style",
    name: { en: "Guatemalan Jocón-Style Green Chicken Stew", hindi: "ग्वाटेमालन जोकोन-स्टाइल हरा चिकन स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-170427", grams: 320 }, // green peppers, standing in for tomatillos
      { foodId: "usda-168462", grams: 200 }, // spinach, for the green sauce
      { foodId: "usda-169997", grams: 40 }, // coriander leaves
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-2515380", grams: 40 }, // pepitas, ground for body
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken breast in 800 ml of salted water for 15 minutes, until cooked through; lift it out, keep the broth, and cut the chicken in large pieces.",
      "Blend the green peppers, spinach, coriander leaves, onion and garlic with 300 ml of the broth into a vivid green sauce, tomatillos give the classic its green tartness and sit outside the verified set; green peppers and coriander honestly carry the colour and freshness.",
      "Grind the pepitas finely and whisk them into the sauce; they give a jocón its body.",
      "Heat the sunflower oil, pour in the green sauce and fry it for 5 minutes, stirring, until it deepens from bright green to a cooked, olive green and thickens.",
      "Return the chicken pieces with enough broth to make a stew and simmer 10 minutes, until the sauce clings and the chicken is hot through.",
      "Taste and adjust the salt; the sauce should be herbaceous and gently thick, never watery.",
      "Serve in bowls with the green sauce ladled generously over the chicken.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* -------------------------------- Mexican ------------------------------ */
  {
    id: "dish-mx-chiles-nogada-style",
    name: { en: "Chiles en Nogada-Style (Stuffed Peppers in Walnut Sauce)", hindi: "चिलेस एन नोगाडा-स्टाइल (अखरोट सॉस भरवां मिर्च)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 560 }, // ground turkey
      { foodId: "usda-170108", grams: 480 }, // red peppers, standing in for poblanos
      { foodId: "usda-2346394", grams: 100 }, // walnuts, for the nogada sauce
      { foodId: "usda-322892", grams: 160 }, // milk
      { foodId: "usda-328841", grams: 80 }, // cottage cheese, for the sauce's body
      { foodId: "usda-174683", grams: 60 }, // grapes, standing in for raisins
      { foodId: "usda-171688", grams: 120 }, // apple
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Char the red peppers whole until blistered, rest them covered for 10 minutes, then peel, slit and deseed them, keeping them whole, they stand in for poblanos, which sit outside the verified set.",
      "Brown the ground turkey with the onion and garlic for 7 to 8 minutes, until cooked through; season with the salt and cinnamon.",
      "Stir in the apple in small dice and the grapes, halved, grapes stand in for the classic raisins, outside the verified set, and cook 3 minutes, until the fruit just softens into the picadillo.",
      "Blend the walnuts with the milk and cottage cheese into a smooth, pouring sauce; the cottage cheese gives the body the classic's fresh cheese provides. Season lightly.",
      "Fill each pepper generously with the warm picadillo and arrange them on a platter.",
      "Warm the walnut sauce gently for 2 minutes, it must never boil or it will grain, and spoon it generously over the peppers, coating them completely.",
      "Serve at room temperature, as the dish is eaten in Puebla: warm filling, cool white sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ------------------------------- Brazilian ----------------------------- */
  {
    id: "dish-br-bobo-camarao",
    name: { en: "Brazilian Bobó de Camarão (Shrimp & Cassava Purée)", hindi: "ब्राज़ीलियन बोबो दे कामाराओ (झींगा कसावा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 600 }, // shrimp
      { foodId: "usda-169985", grams: 480 }, // cassava
      { foodId: "usda-170172", grams: 320 }, // coconut milk
      { foodId: "usda-170457", grams: 160 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170108", grams: 120 }, // red peppers
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-330458", grams: 20 }, // coconut oil, standing in for dendê
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
    ],
    method: [
      "Boil the cassava in salted water for 20 to 25 minutes, until it yields completely to a knife; drain, pull out the fibrous cores and mash it while hot.",
      "Whisk the coconut milk into the hot cassava a little at a time, until it becomes a smooth, flowing purée, this purée is the bobó itself.",
      "Soften the onion and red peppers in the coconut oil for 5 minutes, coconut oil stands in for dendê, the red palm oil of Bahia, which sits outside the verified set, then add the garlic and tomatoes and cook 4 minutes.",
      "Add the shrimp and cook 3 minutes, until they turn pink and curl.",
      "Fold the cassava purée through the shrimp until everything is one glossy, orange-flecked mass; simmer 2 minutes to marry.",
      "Check the seasoning and the consistency: a bobó should pour slowly, like thick lava, never sit in a stiff mound.",
      "Serve with the coriander leaves scattered over, straight from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-br-xinxim-style",
    name: { en: "Xinxim-Style Chicken & Shrimp in Peanut-Coconut Sauce", hindi: "शिनशिम-स्टाइल चिकन झींगा मूंगफली नारियल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 400 }, // chicken thigh
      { foodId: "usda-175179", grams: 240 }, // shrimp
      { foodId: "usda-172430", grams: 80 }, // peanuts
      { foodId: "usda-170172", grams: 240 }, // coconut milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-330458", grams: 16 }, // coconut oil, standing in for dendê
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
    ],
    method: [
      "Grind the peanuts finely, they thicken and enrich the sauce, so no grit should survive.",
      "Brown the chicken thigh pieces in the coconut oil for 6 minutes, until golden; coconut oil stands in for the dendê of Bahia, which sits outside the verified set.",
      "Add the onion, garlic and ginger and cook 3 minutes, until softened and fragrant.",
      "Pour in the coconut milk, stir in the ground peanuts and the salt and simmer gently for 12 minutes, until the chicken is cooked through and the sauce has thickened to a coating consistency.",
      "Add the shrimp and cook 3 minutes, until they turn pink and curl into the sauce.",
      "Rest 3 minutes off the heat; the peanut continues to thicken the sauce as it stands.",
      "Serve with the coriander leaves scattered over, the sauce glossy and the shrimp just-cooked.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-br-frango-quiabo",
    name: { en: "Brazilian Chicken with Okra (Frango com Quiabo)", hindi: "ब्राज़ीलियन चिकन भिंडी (फ्रांगो कॉम क्वियाबो)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-169260", grams: 320 }, // okra
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Brown the chicken thighs hard in the sunflower oil for 8 minutes, until deeply golden on all sides, frango com quiabo begins with a proper sear, not a simmer.",
      "Lift the chicken out and soften the onion in the same pan for 4 minutes, scraping up the browned base.",
      "Add the garlic and the tomatoes, chopped, and cook 5 minutes into a rough sauce; season with the salt.",
      "Return the chicken with 200 ml of water, cover and braise for 15 minutes, until nearly tender.",
      "Lay the okra, trimmed and left in large pieces, over the top, splash the vinegar over it, the acid keeps the okra's silk in check, the old Minas Gerais trick, cover and cook 10 minutes without stirring.",
      "Check the chicken is cooked through and falling tender and the okra is soft but whole.",
      "Serve the chicken and okra together with the tomato sauce spooned over, straight from the pan.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Peruvian ----------------------------- */
  {
    id: "dish-pe-carapulcra-style",
    name: { en: "Peruvian Carapulcra-Style (Chicken, Potato & Peanut Stew)", hindi: "पेरूवियन कारापुलक्रा-स्टाइल (चिकन आलू मूंगफली स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 560 }, // chicken thigh
      { foodId: "usda-172430", grams: 80 }, // peanuts
      { foodId: "usda-2346401", grams: 400 }, // potatoes, fresh in place of papa seca
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Toast the peanuts in a dry pan for 4 minutes, until golden and fragrant, then grind them to a coarse powder.",
      "Brown the chicken thigh pieces in the sunflower oil for 6 to 7 minutes, until golden; lift them out.",
      "In the same pan, cook the onion, garlic, cumin and chilli powder for 4 minutes, this aderezo, fried until sweet, is the stew's foundation.",
      "Add the potatoes in cubes with 600 ml of water and the salt and simmer 10 minutes. Carapulcra is built on papa seca, sun-dried potato, which sits outside the verified set; fresh potato honestly takes its place, cooked a little less long.",
      "Stir in the ground peanuts and return the chicken; simmer 12 to 15 minutes, until the potatoes are tender, the chicken cooked through and the sauce thick and peanut-rich.",
      "Rest 5 minutes; the sauce thickens further as the peanut swells.",
      "Serve in deep bowls, the stew dark and glossy, spooned thickly over the chicken and potato.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ------------------------------ Azerbaijani ---------------------------- */
  {
    id: "dish-az-buglama-style",
    name: { en: "Azerbaijani Buglama-Style Lamb & Vegetable Stew", hindi: "अज़रबैजानी बुगलामा-स्टाइल मेमना सब्ज़ी स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // ground lamb, in chunks of mince
      { foodId: "usda-170108", grams: 240 }, // red peppers
      { foodId: "usda-170427", grams: 200 }, // green peppers
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2346401", grams: 320 }, // potatoes
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-171025", grams: 8 }, // sunflower oil
    ],
    method: [
      "Buglama means 'steamed', the dish cooks in its own vapour with almost no added liquid. Oil the base of a heavy, tight-lidded pot.",
      "Form the ground lamb into coarse, walnut-sized chunks with your hands, do not pack them tight, and layer them over the base with half the salt.",
      "Layer the potatoes in slices, then the onion in rings, then both peppers in strips and finally the tomatoes in thick slices, scattering the remaining salt through the layers.",
      "Add just 60 ml of water, clamp the lid on and set over the lowest heat for 45 to 50 minutes. Do not open and do not stir; the layers must steam, not stew.",
      "Check at the end: the lamb should be tender and cooked through, the potatoes soft and the tomatoes collapsed into a scant, intense sauce.",
      "Rest 5 minutes with the lid on; the juices settle into the layers.",
      "Scatter the coriander leaves and serve straight from the pot, lifting portions down through all the layers.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-az-dovga-style",
    name: { en: "Azerbaijani Yogurt Soup with Chickpeas & Greens (Dovga-Style)", hindi: "अज़रबैजानी दही सूप चना साग (दोवगा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 800 }, // Greek yogurt
      { foodId: "usda-2644282", grams: 160 }, // chickpeas, dry
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-2512381", grams: 120 }, // white rice, dry
      { foodId: "usda-168462", grams: 200 }, // spinach
      { foodId: "usda-169997", grams: 24 }, // coriander leaves
      { foodId: "usda-173475", grams: 12 }, // spearmint
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then simmer in fresh water for 35 to 40 minutes, until tender; drain. Cook the rice separately until just tender and drain.",
      "Whisk the Greek yogurt with the eggs and 400 ml of water in a large pot until completely smooth, the egg is the dovga's insurance against splitting.",
      "Set the pot over medium heat and stir constantly, in one direction, for 10 to 12 minutes, until the yogurt steams and thickens slightly. It must never boil, and the stirring must never stop; this is the whole craft of the dish.",
      "Add the cooked rice and chickpeas and stir for 3 minutes more, keeping it below a simmer.",
      "Fold in the spinach in ribbons, the coriander leaves and the spearmint and cook 2 minutes, until the greens wilt into the yogurt.",
      "Season with the salt at the end, salt added early can grain the yogurt.",
      "Serve warm or at room temperature, pale and herb-flecked, in shallow bowls.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------------- Iraqi ------------------------------- */
  {
    id: "dish-iq-tashreeb-style",
    name: { en: "Iraqi Chicken Tashreeb-Style (Chicken over Broth-Soaked Flatbread)", hindi: "इराकी चिकन तशरीब-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-168893", grams: 200 }, // whole wheat flour, for the flatbread
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-167746", grams: 30 }, // lemon, standing in for dried lime
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with 120 ml of water and a pinch of the salt into a smooth dough; rest 20 minutes, then roll four thin rounds and toast them in a dry pan for 2 minutes per side, until blistered and stiff. Set aside.",
      "Brown the chicken thighs in the sunflower oil for 6 minutes, until golden; lift them out.",
      "Soften the onion in the same pan for 4 minutes; add the garlic, turmeric and cumin for 1 minute, then the tomatoes, chopped, and cook 5 minutes into a sauce.",
      "Return the chicken with 800 ml of water and the remaining salt and simmer 20 minutes, until the chicken is cooked through and tender and the broth is rich and red.",
      "Stir in the lemon juice, it stands in for the dried lime of the classic, which sits outside the verified set, and check the seasoning.",
      "Tear the flatbreads into large pieces in a wide serving dish and ladle a third of the hot broth over them; rest 2 minutes so the bread drinks it in and softens.",
      "Lay the chicken over the soaked bread, ladle the remaining broth and tomatoes over everything and serve at once, eating bread and chicken together in each bite.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- Georgian ------------------------------ */
  {
    id: "dish-ge-lobiani-style",
    name: { en: "Georgian Bean-Stuffed Flatbread (Lobiani-Style)", hindi: "जॉर्जियन राजमा भरवां फ्लैटब्रेड (लोबियानी-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 400 }, // kidney beans, dry
      { foodId: "usda-168893", grams: 240 }, // whole wheat flour
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, then simmer in fresh water for 45 to 50 minutes, until they collapse at a touch; drain, keeping a little of their liquor.",
      "Knead the flour with 150 ml of warm water and a pinch of the salt into a soft dough; rest, covered, for 30 minutes.",
      "Fry the onion in half the sunflower oil for 6 minutes, until deep golden and sweet; add the garlic and coriander seed for the last minute.",
      "Mash the beans coarsely with the fried onion mixture and the remaining salt, adding spoonfuls of bean liquor until the filling is soft but holds its shape, it should taste fully seasoned on its own.",
      "Divide the dough in four, roll each piece into a round, mound a quarter of the bean filling in the centre, gather the edges up and seal, then roll gently back out to a thick filled disc.",
      "Cook the lobiani in a dry heavy pan for 4 to 5 minutes per side, until blistered and crisp, then brush with the remaining sunflower oil.",
      "Rest 3 minutes and cut in wedges; the bean filling should be steaming, soft and rich against the crisp bread.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ Lithuanian ----------------------------- */
  {
    id: "dish-lt-cepelinai-style",
    name: { en: "Lithuanian Cepelinai-Style (Potato Dumplings with Cottage Cheese)", hindi: "लिथुआनियन सेपेलिनाई-स्टाइल (आलू डंपलिंग कॉटेज चीज़)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 800 }, // potatoes
      { foodId: "usda-328841", grams: 680 }, // cottage cheese
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt, for the sauce
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173410", grams: 16 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-168936", grams: 20 }, // white flour, to bind the potato mass
    ],
    method: [
      "Grate the potatoes very finely and squeeze them hard in a cloth, in batches, until almost dry, a wet potato mass makes dumplings that dissolve in the pot. This squeezing is the dish.",
      "Stir the squeezed potato with the flour, the beaten egg and the salt into a pliable mass; the flour helps bind where the classic relies on the potatoes' own starch alone.",
      "Season the cottage cheese with a pinch of the salt and half the onion, very finely chopped and squeezed dry.",
      "With wet hands, take a palmful of potato mass, flatten it, mound cottage cheese in the centre and mould the potato around it into a smooth zeppelin, sealing every seam.",
      "Lower the cepelinai into a large pot of salted water at the barest simmer and poach for 20 to 25 minutes, until they float and feel firm, a boil will burst them.",
      "Meanwhile melt the butter and fry the remaining onion until golden; stir it, off the heat, into the Greek yogurt for the sauce, it honestly replaces the classic fried-bacon sauce, which Bloom's programme does not carry.",
      "Lift the dumplings out with a slotted spoon, rest 2 minutes and serve two per plate with the yogurt-onion sauce spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ Cambodian ------------------------------ */
  {
    id: "dish-kh-samlor-korko-style",
    name: { en: "Cambodian Samlor Korko-Style (Chicken & Vegetable Soup-Stew)", hindi: "कंबोडियन सामलोर कोर्को-स्टाइल (चिकन सब्ज़ी सूप-स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2685577", grams: 240 }, // eggplant
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-2346404", grams: 240 }, // sweet potato, standing in for pumpkin
      { foodId: "usda-2512381", grams: 60 }, // white rice, ground as the thickener
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
    ],
    method: [
      "Pound the garlic, ginger, turmeric and red chilli with half the salt to a paste. Samlor korko means 'stirring pot', the cook stirs it constantly as it builds.",
      "Heat the sunflower oil and fry the paste for 2 minutes; add the chicken thigh pieces and stir-fry 4 minutes to coat them.",
      "Pour in 1.1 litres of water and bring to a simmer. Pound the raw rice to a coarse powder and stir it in, ground rice is the classic thickener, swelling as the soup cooks.",
      "Add the sweet potato in chunks, it stands in for the pumpkin of the classic, which sits outside the verified set, and simmer 10 minutes, stirring often so the rice does not catch.",
      "Add the eggplant in chunks and the green beans and simmer 8 minutes more, until every vegetable is tender and the chicken cooked through.",
      "Season with the remaining salt, fermented prahok salts the classic and sits outside the verified set, so salt carries it plainly here.",
      "Serve in bowls with the coriander leaves scattered over, the soup thick enough to coat the vegetables it carries.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ Indonesian ----------------------------- */
  {
    id: "dish-id-woku-style",
    name: { en: "Indonesian Woku-Style Fish in Turmeric-Chilli Sauce", hindi: "इंडोनेशियन वोकू-स्टाइल मछली हल्दी मिर्च सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 640 }, // mackerel
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-169231", grams: 30 }, // ginger
      { foodId: "usda-172231", grams: 6 }, // turmeric
      { foodId: "usda-170106", grams: 14 }, // red chilli
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-173475", grams: 12 }, // spearmint, standing in for lemon basil
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Pound the ginger, garlic, red chilli and turmeric with the salt to a coarse, wet paste, a woku paste stays rough and fiercely aromatic.",
      "Heat the sunflower oil and fry the paste for 3 minutes, until it turns deep golden-orange and the oil colours.",
      "Add the tomatoes, chopped, and cook 4 minutes, until they collapse into the paste.",
      "Add 250 ml of water and bring to a simmer, a woku sauce is wet and loose, never a thick curry and never coconut-based.",
      "Lay the mackerel pieces into the sauce, cover and simmer gently for 10 to 12 minutes, until the fish is opaque and flakes at a touch.",
      "Take off the heat and stir in the lemon juice, the spearmint and the coriander leaves, lemon basil perfumes the classic and sits outside the verified set; spearmint and coriander honestly stand in.",
      "Serve at once, the fish vivid in its turmeric-chilli sauce with the herbs still bright.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Chinese ------------------------------ */
  {
    id: "dish-cn-shui-zhu-style",
    name: { en: "Sichuan-Style Poached Fish with Chillies (Shui Zhu Yu-Style)", hindi: "सिचुआन-स्टाइल मछली मिर्च (शुई झू यू-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 720 }, // cod
      { foodId: "usda-2346407", grams: 320 }, // cabbage
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-171410", grams: 30 }, // peanut oil, for the sizzling finish
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blanch the cabbage in ribbons and the green beans in boiling salted water for 3 minutes, until just tender; drain and pile them into a wide serving bowl as the bed.",
      "Slice the cod into thick pieces and season with half the salt.",
      "Bring 800 ml of water to a gentle simmer with the remaining salt and poach the cod for 3 to 4 minutes, until just opaque, 'water-boiled' is the name, but a bare simmer keeps the fish silky.",
      "Lift the fish over the vegetables with a slotted spoon and ladle a little of the poaching liquor over it.",
      "Scatter the garlic, sliced red chilli and chilli powder in a mound over the centre of the fish.",
      "Heat the peanut oil until it just smokes and pour it over the garlic and chilli in one go, it should sizzle violently and bloom the aromatics. This is a lighter finish than the classic's ladle of oil, honestly stated, and it is enough.",
      "Serve immediately, at the table, while the oil is still crackling.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Persian ------------------------------ */
  {
    id: "dish-ir-gheymeh-style",
    name: { en: "Persian Split-Lentil & Lamb Stew (Gheymeh-Style)", hindi: "फारसी दाल मेमना स्टू (घेयमेह-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 480 }, // ground lamb
      { foodId: "usda-174284", grams: 200 }, // red lentils, standing in for split peas
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2346401", grams: 240 }, // potatoes, for the crisp topping
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-167746", grams: 40 }, // lemon, standing in for dried lime
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Brown the ground lamb in half the sunflower oil with the onion for 8 minutes, until cooked through and coloured at the edges.",
      "Add the tomatoes, chopped, the turmeric and the cinnamon and cook 5 minutes, until the base turns dark red and thick.",
      "Add the red lentils, they stand in for the split peas of the classic, which sit outside the verified set, and they cook faster, so watch them, with 700 ml of water and the salt; simmer 22 to 25 minutes, until the lentils are tender but not dissolved and the lamb is rich in its sauce.",
      "Stir in the lemon juice, dried limes sour the classic and sit outside the verified set; lemon honestly carries the sourness, and check the seasoning.",
      "Cut the potatoes into fine matchsticks and pan-fry them in the remaining oil for 5 to 6 minutes, until crisp and golden, a shallow pan-fry, in the spirit of the classic's fried topping.",
      "Rest the stew 5 minutes; it thickens as it stands.",
      "Serve the stew with the crisp potato matchsticks piled over each bowl, as gheymeh is always served.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* -------------------------------- Turkish ------------------------------ */
  {
    id: "dish-tr-etli-bamya",
    name: { en: "Turkish Lamb & Okra Stew (Etli Bamya)", hindi: "तुर्की मेमना भिंडी स्टू (एतली बाम्या)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // ground lamb, in coarse chunks
      { foodId: "usda-169260", grams: 320 }, // okra
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171413", grams: 16 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Form the ground lamb into coarse chunks and brown them in the olive oil for 7 to 8 minutes, until well coloured and cooked most of the way through; lift them out.",
      "Soften the onion in the lamb fat for 5 minutes; add the garlic for the last minute.",
      "Add the tomatoes, chopped, and cook 5 minutes into a sauce; return the lamb with 300 ml of water and the salt and braise gently for 20 minutes.",
      "Trim the okra's caps in a cone shape, keeping the pods whole, cut flat, they leak their silk into the stew.",
      "Lay the okra over the lamb, add the lemon juice, its acid keeps the okra whole and the sauce bright, cover and cook 12 to 15 minutes, shaking the pot rather than stirring, until the okra is tender.",
      "Rest 5 minutes off the heat; the sauce settles and the okra stays intact.",
      "Serve the lamb and okra together, the pods whole in their tomato sauce.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
];
