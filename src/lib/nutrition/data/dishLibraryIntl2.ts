/**
 * International dishes, wave X-2 — Mediterranean, European and Middle
 * Eastern (Greek, Italian, Spanish, French, Turkish, Levantine,
 * Moroccan-style), every one built to the wave's high-protein bar:
 * at least 25 g of protein per serving AS COMPUTED by dishNutrients
 * (pinned by dishesIntl2.test.ts — the number is a computation over
 * the lines below, never a claim typed beside them).
 *
 * Lines name only USDA reference foods, in whole-recipe grams; no
 * nutrient value appears in this file. Beef and pork are deliberately
 * absent (a programme decision), as are ingredients the verified set
 * does not carry — olives, capers, feta, anchovies, saffron, wine —
 * so a few classics appear in an honestly-named adapted form, and
 * some (spanakopita, salade niçoise with anchovy, coq au vin) are not
 * here at all; the wave report lists them.
 */

import type { Dish } from "../dishes";

export const INTL2_DISHES: readonly Dish[] = [
  {
    id: "dish-avgolemono",
    name: { en: "Avgolemono (Greek Lemon-Egg Chicken Soup)", hindi: "अवगोलेमोनो (ग्रीक लेमन-एग चिकन सूप)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // Chicken, breast
      { foodId: "usda-171287", grams: 150 }, // Egg, whole
      { foodId: "usda-2512381", grams: 120 }, // Rice, white
      { foodId: "usda-167746", grams: 120 }, // Lemons, raw
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Simmer the chicken breasts in about 1.5 litres of lightly salted water for 18-20 minutes, skimming any foam, until just cooked through; lift out and shred into bite-size pieces.",
      "Add the rinsed rice to the hot broth and simmer for 12-14 minutes until tender; stir in the shredded chicken and the finely sliced onion and cook 3 minutes more.",
      "Whisk the eggs in a deep bowl until pale and frothy, then whisk in the lemon juice until smooth.",
      "Temper the egg mixture: ladle in a cup of hot broth in a slow stream, whisking constantly, then a second cup — the mixture should feel warm, never scrambled.",
      "Take the soup off the heat and stir the tempered eggs through in a slow stream; the soup will turn pale, silky and slightly thickened.",
      "Warm through on the lowest heat for 2 minutes without boiling (boiling curdles the eggs), drizzle with the olive oil, rest 5 minutes and serve with extra lemon at the table.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-souvlaki",
    name: { en: "Chicken Souvlaki with Yogurt Marinade", hindi: "चिकन सूवलाकी विथ योगर्ट मैरिनेड" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // Chicken, breast
      { foodId: "usda-330137", grams: 200 }, // Yogurt, Greek
      { foodId: "usda-170427", grams: 200 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Cut the chicken into 3 cm cubes. Stir the yogurt with half the olive oil, the lemon juice, crushed garlic, salt and black pepper to make the marinade.",
      "Coat the chicken in the marinade, cover and chill for at least 1 hour (up to overnight); thread onto skewers alternating with chunks of pepper and onion.",
      "Heat a grill or heavy griddle pan until very hot; brush the skewers with the remaining oil.",
      "Grill for 10-12 minutes, turning every 2-3 minutes, until the edges char lightly and the chicken is cooked through with no pink remaining.",
      "Rest the skewers for 5 minutes so the juices settle; the yogurt marinade will have formed a tangy, golden crust.",
      "Serve straight from the skewers with lemon wedges and any remaining yogurt spooned alongside as a sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-lemon-chicken-potatoes",
    name: { en: "Greek Lemon Chicken with Potatoes", hindi: "ग्रीक लेमन चिकन विथ पोटैटोज़" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-2346401", grams: 600 }, // Potatoes, russet
      { foodId: "usda-167746", grams: 80 }, // Lemons, raw
      { foodId: "usda-171413", grams: 40 }, // Oil, olive
      { foodId: "usda-1104647", grams: 15 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Cut the potatoes into chunky wedges and toss in a roasting tray with half the olive oil, salt and the juice of one lemon.",
      "Crush the garlic to a paste and rub it over the chicken thighs with the remaining oil, salt and plenty of black pepper.",
      "Nestle the chicken skin-side up among the potatoes, pour over 150 ml hot water and the rest of the lemon juice, and scatter lemon slices on top.",
      "Roast for 40-45 minutes, basting once halfway, until the chicken skin is deep golden and the potatoes are crisp at the edges and soft inside.",
      "Check the chicken is cooked through (juices run clear) and the sauce in the tray has reduced to a lemony glaze.",
      "Rest 5 minutes in the tray so the potatoes soak up the juices, then serve family-style.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-kotopoulo-kokkinisto",
    name: { en: "Kotopoulo Kokkinisto (Chicken in Tomato Sauce)", hindi: "कोटोपूलो कोकिनिस्तो (चिकन इन टोमैटो सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-170457", grams: 500 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-171320", grams: 2 }, // Spices, cinnamon
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Pat the chicken dry, season with salt and pepper, and brown in the olive oil in a heavy pot for 4-5 minutes per side until golden; set aside.",
      "In the same oil, soften the sliced onion for 6-8 minutes until sweet and golden at the edges; add the crushed garlic for the last minute.",
      "Add the chopped tomatoes, cinnamon stick (or ground cinnamon), salt and 200 ml water; simmer 10 minutes until the sauce starts to thicken.",
      "Return the chicken and its juices to the pot, cover and braise on low heat for 25-30 minutes until the meat is tender and the sauce glossy.",
      "Uncover for the last 5 minutes if the sauce needs reducing — it should coat the back of a spoon.",
      "Rest 5 minutes off the heat and serve with the sauce spooned generously over the chicken.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-psari-plaki",
    name: { en: "Psari Plaki (Baked Cod with Tomato and Onion)", hindi: "सारी प्लाकी (बेक्ड कॉड विथ टोमैटो एंड अनियन)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 700 }, // Fish, cod
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 300 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 190°C. Soften the sliced onions in half the olive oil for 8-10 minutes until sweet and translucent, adding the garlic for the last minute.",
      "Add the chopped tomatoes and salt, and simmer 8 minutes until the sauce thickens slightly and the oil glistens at the edges.",
      "Tip half the sauce into a baking dish, lay the cod fillets on top in a single layer and season them well.",
      "Cover with the remaining sauce and drizzle with the rest of the olive oil.",
      "Bake for 18-22 minutes until the cod flakes easily at the thickest part and the sauce bubbles at the edges.",
      "Rest 5 minutes and serve straight from the dish with lemon wedges.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-grilled-sardines-lemon",
    name: { en: "Grilled Sardines with Lemon (Sardeles Psites)", hindi: "ग्रिल्ड सार्डिन्स विथ लेमन (सार्डेलेस सीतेस)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-175139", grams: 300 }, // Fish, sardine
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Drain the sardines and pat them very dry with paper towel — dry skin is what crisps on the grill; season with salt.",
      "Heat a grill or cast-iron griddle until smoking hot and brush the sardines lightly with olive oil.",
      "Lay the sardines down in a single layer and grill undisturbed for 3-4 minutes until the underside is crisp and releases easily.",
      "Turn once with a thin spatula and grill 2-3 minutes more until the flesh is opaque and the skin blistered.",
      "Squeeze over plenty of lemon juice and drizzle with the remaining raw olive oil.",
      "Serve immediately, while the skin is still crisp, with extra lemon at the table.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-baked-mackerel-greek",
    name: { en: "Baked Mackerel with Tomato and Onion", hindi: "बेक्ड मैकरल विथ टोमैटो एंड अनियन" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175119", grams: 650 }, // Fish, mackerel
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Lay the sliced onions in a baking dish, drizzle with half the oil and season.",
      "Pat the mackerel fillets dry and season them well on both sides — mackerel's rich flesh takes seasoning boldly.",
      "Sit the mackerel fillets on the onions, scatter the chopped tomatoes and garlic around them.",
      "Drizzle with the remaining olive oil and pour 100 ml water around (not over) the fish.",
      "Bake for 20-25 minutes until the mackerel flakes under gentle pressure and the tomatoes have collapsed into a sauce.",
      "Rest 5 minutes so the fish firms up, then serve with the pan juices spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-garides-kokkinistes",
    name: { en: "Garides Kokkinistes (Shrimp in Tomato Sauce)", hindi: "गैरीदेस कोकिनिस्तेस (श्रिम्प इन टोमैटो सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175179", grams: 600 }, // Crustaceans, shrimp
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170106", grams: 5 }, // Peppers, hot chili
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the finely chopped onion in the olive oil for 5-6 minutes until translucent; add the garlic and chilli for the last minute.",
      "Add the chopped tomatoes and salt and simmer briskly for 8-10 minutes until thick and glossy, with the oil rising at the edges.",
      "Pat the shrimp dry and season; lay them into the sauce in a single layer.",
      "Cook 2 minutes, turn each shrimp once, and cook 2 minutes more until they curl into a C and turn pink and opaque.",
      "Take off the heat at once — shrimp toughen if left in the hot sauce — and rest 2 minutes.",
      "Serve with lemon wedges and bread or rice to catch the sauce.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-fakes-lentil-soup",
    name: { en: "Fakes (Greek Lentil Soup)", hindi: "फाकेस (ग्रीक लेंटिल सूप)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644283", grams: 440 }, // Lentils, dry
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170917", grams: 1 }, // Spices, bay leaf
      { foodId: "usda-173469", grams: 15 }, // Vinegar, cider
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Rinse the lentils and put them in a pot with about 1.4 litres of water; bring to the boil, skim, then simmer 10 minutes.",
      "Add the chopped onion, carrot, garlic, bay leaf and chopped tomato; simmer 20-25 minutes until the lentils are soft and the soup has body.",
      "Season with salt and stir through the vinegar — the traditional Greek finish that lifts the whole pot.",
      "Simmer 3 minutes more; the soup should be thick enough to coat a spoon but still pourable. Add a splash of water if it is too dense.",
      "Rest off the heat for 5 minutes, remove the bay leaf.",
      "Serve each bowl with a generous drizzle of raw olive oil on top.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-fasolada",
    name: { en: "Fasolada (Greek White Bean Soup)", hindi: "फासोलादा (ग्रीक व्हाइट बीन सूप)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-173745", grams: 480 }, // Beans, navy
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight in plenty of water; drain, cover with fresh water, boil 10 minutes and drain again (the traditional Greek double-boil for tender skins).",
      "Return the beans to the pot with about 1.5 litres fresh water and simmer gently for 45 minutes until nearly tender.",
      "Add the chopped onion, carrot, garlic and tomato with half the olive oil; simmer 25-30 minutes more until the beans are completely soft and the broth creamy.",
      "Season with salt only at the end — salting early toughens bean skins.",
      "Rest 10 minutes off the heat; the soup will thicken as it stands.",
      "Serve with the remaining raw olive oil drizzled over each bowl and crusty bread alongside.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-gigantes-plaki",
    name: { en: "Gigantes-Style Baked Beans (Plaki)", hindi: "जिगांतेस-स्टाइल बेक्ड बीन्स (प्लाकी)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175193", grams: 480 }, // Beans, kidney
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 40 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight; drain, boil in fresh water for 40-50 minutes until just tender, and reserve a cup of the cooking liquid.",
      "Heat the oven to 180°C. Soften the sliced onion in half the olive oil for 8 minutes; add garlic for the last minute.",
      "Stir in the chopped tomatoes and salt and simmer 10 minutes into a thick sauce.",
      "Combine beans, sauce and a splash of bean liquid in a wide baking dish; drizzle with the remaining oil.",
      "Bake for 35-40 minutes until the top is lightly caramelised at the edges and the sauce clings to the beans.",
      "Rest 10 minutes — plaki is traditionally served warm or at room temperature, never piping hot.",
    ],
    timeMinutes: 100,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-strapatsada-style-eggs",
    name: { en: "Strapatsada-Style Tomato Eggs with Mozzarella", hindi: "स्त्रापात्सादा-स्टाइल टोमैटो एग्स विथ मोज़ेरेला" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 200 }, // Egg, whole
      { foodId: "usda-172183", grams: 200 }, // Egg, white
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-329370", grams: 40 }, // Cheese, mozzarella
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Cook the chopped tomatoes in the olive oil over medium heat for 8-10 minutes, crushing them with a spoon, until almost all their water has evaporated and the oil separates.",
      "Season well with salt and pepper — the tomato base should taste fully seasoned before the eggs go in.",
      "Whisk the eggs and egg whites together and pour into the pan, lowering the heat.",
      "Stir slowly with a spatula, folding the setting egg into the tomato, for 3-4 minutes until softly scrambled and still glossy.",
      "Scatter the mozzarella over, cover for 1 minute to melt it into the eggs, and take off the heat while still slightly runny — it firms as it rests.",
      "Serve at once on toast or with warm bread.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-yogurt-power-bowl",
    name: { en: "Greek Yogurt Bowl with Walnuts, Honey and Pumpkin Seeds", hindi: "ग्रीक योगर्ट बाउल विथ वॉलनट्स, हनी एंड पंपकिन सीड्स" },
    category: "breakfast",
    servings: 1,
    lines: [
      { foodId: "usda-330137", grams: 300 }, // Yogurt, Greek
      { foodId: "usda-2346394", grams: 20 }, // Nuts, walnuts
      { foodId: "usda-2515380", grams: 15 }, // Seeds, pumpkin seeds (pepitas)
      { foodId: "usda-169640", grams: 15 }, // Honey
    ],
    method: [
      "Toast the walnuts and pumpkin seeds in a dry pan over medium heat for 2-3 minutes, shaking often, until the seeds pop and the walnuts smell nutty.",
      "Spoon the Greek yogurt into a wide bowl and smooth the top with the back of the spoon.",
      "Chill the bowl for 5 minutes if the yogurt has warmed — the contrast with the warm seeds is the pleasure of the dish.",
      "Scatter the warm nuts and seeds over the yogurt in a generous layer.",
      "Drizzle the honey over in a thin stream — a little goes a long way against the tang of the yogurt.",
      "Serve immediately, while the seeds are still warm and crisp against the cold yogurt.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-lemon-chicken-rice",
    name: { en: "Greek Lemon Chicken with Rice", hindi: "ग्रीक लेमन चिकन विथ राइस" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // Chicken, breast
      { foodId: "usda-2512381", grams: 240 }, // Rice, white
      { foodId: "usda-167746", grams: 80 }, // Lemons, raw
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Season the chicken and sear in the olive oil in a wide pot for 4 minutes per side until golden; set aside.",
      "Soften the chopped onion in the same pot for 5 minutes; add the garlic for the last minute.",
      "Stir in the rinsed rice until every grain is glossed, then pour in 600 ml hot water, the lemon juice and salt.",
      "Nestle the chicken back into the rice, cover and cook on the lowest heat for 18 minutes without lifting the lid.",
      "Rest, covered and off the heat, for 10 minutes — the rice finishes steaming and absorbs the lemony juices.",
      "Fluff the rice around the chicken, check the chicken is cooked through, and serve with lemon wedges.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-turkey-souvlaki",
    name: { en: "Turkey Souvlaki with Garlic Yogurt", hindi: "टर्की सूवलाकी विथ गार्लिक योगर्ट" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-171098", grams: 600 }, // Turkey, whole
      { foodId: "usda-330137", grams: 200 }, // Yogurt, Greek
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Cut the turkey breast into 3 cm cubes. Mix half the yogurt with the lemon juice, half the garlic, salt, pepper and a drizzle of oil; coat the turkey and chill at least 1 hour.",
      "Thread the turkey onto skewers alternating with pepper and onion chunks.",
      "Stir the remaining yogurt with the rest of the garlic and a pinch of salt for the sauce; chill until serving.",
      "Grill the skewers on a very hot grill or griddle for 10-12 minutes, turning every few minutes, until charred at the edges and cooked through.",
      "Rest 5 minutes — turkey dries fast, so the rest matters.",
      "Serve with the cold garlic yogurt spooned over the hot skewers.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-shrimp-quinoa",
    name: { en: "Shrimp with Quinoa and Tomato (Garides me Quinoa)", hindi: "श्रिम्प विथ क्विनोआ एंड टोमैटो (गैरीदेस मे क्विनोआ)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175179", grams: 550 }, // Crustaceans, shrimp
      { foodId: "usda-168874", grams: 200 }, // Quinoa, uncooked
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Rinse the quinoa well and cook in 400 ml salted water for 15 minutes until the spirals unfurl; rest covered 5 minutes and fluff.",
      "Meanwhile soften the onion in the olive oil for 5 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 8 minutes into a loose sauce.",
      "Lay the shrimp into the sauce and cook 2 minutes per side until pink, curled and just opaque.",
      "Fold the shrimp and sauce through the quinoa with the lemon juice; warm 1 minute so the grains drink up the sauce.",
      "Rest 2 minutes and serve with extra lemon.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-baked-tilapia",
    name: { en: "Greek-Style Baked Tilapia with Tomatoes", hindi: "ग्रीक-स्टाइल बेक्ड तिलापिया विथ टोमैटोज़" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684442", grams: 650 }, // Fish, tilapia
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Scatter the sliced onion over the base of a baking dish and drizzle with half the oil.",
      "Pat the tilapia fillets dry so the tomato sauce clings rather than slides off.",
      "Lay the tilapia fillets over the onion in a single layer and season well.",
      "Cover with the chopped tomatoes and garlic, drizzle with the remaining oil and squeeze over the lemon.",
      "Bake for 18-20 minutes until the fish flakes easily and the tomatoes have slumped into a sauce.",
      "Rest 3 minutes and serve with the tomato-onion sauce spooned over each fillet.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-herb-omelette",
    name: { en: "Greek Herb Omelette with Cottage Cheese", hindi: "ग्रीक हर्ब ऑमलेट विथ कॉटेज चीज़" },
    category: "breakfast",
    servings: 1,
    lines: [
      { foodId: "usda-171287", grams: 150 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-328841", grams: 80 }, // Cheese, cottage
      { foodId: "usda-168462", grams: 60 }, // Spinach, raw
      { foodId: "usda-171413", grams: 8 }, // Oil, olive
      { foodId: "usda-173475", grams: 5 }, // Spearmint, fresh
      { foodId: "usda-173468", grams: 2 }, // Salt, table
    ],
    method: [
      "Wilt the spinach in a dry non-stick pan for 1-2 minutes until just collapsed; squeeze dry and chop roughly.",
      "Whisk the eggs and egg whites with the salt until evenly yellow and slightly frothy.",
      "Heat the olive oil in the pan over medium heat until it shimmers; pour in the eggs and swirl to coat the base.",
      "As the eggs begin to set at the edges (about 1 minute), draw them gently toward the centre with a spatula, letting runny egg fill the gaps.",
      "When the top is still slightly glossy, scatter the spinach, cottage cheese and torn mint over one half.",
      "Fold the omelette over the filling, slide onto a warm plate and rest 1 minute — the centre should be soft and creamy, not dry.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-gyro-plate",
    name: { en: "Chicken Gyro Plate with Yogurt Sauce and Flatbread", hindi: "चिकन जायरो प्लेट विथ योगर्ट सॉस एंड फ्लैटब्रेड" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // Chicken, thigh
      { foodId: "usda-330137", grams: 250 }, // Yogurt, Greek
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-2346406", grams: 200 }, // Cucumber, with peel
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-168936", grams: 120 }, // Wheat flour, white
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Mix the flour with a pinch of salt and about 70 ml warm water into a soft dough; knead 5 minutes, rest 20 minutes, then roll into 4 thin rounds.",
      "Cook the flatbreads in a dry hot pan for 1-2 minutes per side until puffed and spotted; wrap in a cloth to keep soft.",
      "Slice the chicken thinly, season boldly with salt, pepper and garlic, and sear in the olive oil in batches for 6-8 minutes until crisp at the edges and cooked through.",
      "Stir the yogurt with lemon juice and a pinch of salt for the sauce.",
      "Slice the tomato, onion and cucumber into a rough salad and season lightly.",
      "Serve the chicken over the warm flatbreads with the salad and yogurt sauce spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-mavromatika-fasolia",
    name: { en: "Mavromatika Fasolia (Greek Black-Eyed Pea Stew)", hindi: "मावरोमाटिका फासोलिया (ग्रीक ब्लैक-आइड पी स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-173758", grams: 460 }, // Cowpeas, common (blackeyes
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-2258586", grams: 100 }, // Carrots, mature
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the black-eyed peas for 6-8 hours (they need less soaking than other beans); drain and cover with fresh water.",
      "Simmer for 25-30 minutes until nearly tender; drain, reserving a cup of the cooking liquid.",
      "Soften the onion and carrot in the olive oil for 7-8 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and cook 8 minutes into a sauce; stir in the peas and enough reserved liquid to just cover.",
      "Simmer gently for 15-20 minutes until the peas are completely tender and the stew is thick and glossy.",
      "Season, rest 5 minutes, and serve with a final drizzle of raw olive oil.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-kotopoulo-me-fasolia",
    name: { en: "Kotopoulo me Fasolia (Greek Chicken and Bean Stew)", hindi: "कोटोपूलो मे फासोलिया (ग्रीक चिकन एंड बीन स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 450 }, // Chicken, breast
      { foodId: "usda-173745", grams: 300 }, // Beans, navy
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight; drain, cover with fresh water and simmer 35-40 minutes until nearly tender; reserve the liquid.",
      "Brown the chicken pieces in the olive oil in a heavy pot for 4 minutes per side; set aside.",
      "Soften the onion in the same pot for 6 minutes; add the garlic and then the chopped tomatoes and cook 8 minutes into a sauce.",
      "Add the beans with enough of their liquid to cover, nestle the chicken back in, and season.",
      "Cover and braise on low heat for 25 minutes until the chicken is cooked through and the beans are creamy.",
      "Rest 5 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-turkey-keftedes",
    name: { en: "Greek Turkey Meatballs with Yogurt (Keftedes-Style)", hindi: "ग्रीक टर्की मीटबॉल्स विथ योगर्ट (केफ्तेदेस-स्टाइल)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2514747", grams: 550 }, // Turkey, ground
      { foodId: "usda-330137", grams: 150 }, // Yogurt, Greek
      { foodId: "usda-171287", grams: 50 }, // Egg, whole
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-173475", grams: 10 }, // Spearmint, fresh
      { foodId: "usda-168893", grams: 30 }, // Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Grate the onion and squeeze out its juice; mix with the ground turkey, beaten egg, flour, crushed garlic, chopped mint, salt and pepper until just combined.",
      "Chill the mixture for 20 minutes — cold mixture shapes cleanly and holds together in the pan.",
      "Roll into walnut-sized balls (about 20) with wet hands.",
      "Fry in the olive oil in batches for 8-10 minutes, turning often, until browned all over and cooked through to the centre.",
      "Drain briefly on paper towel while you stir the yogurt with a pinch of salt and a squeeze of lemon if you have it.",
      "Serve the hot keftedes with the cool yogurt for dipping.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-greek-sardine-bake",
    name: { en: "Greek Baked Sardines with Tomato and Lemon", hindi: "ग्रीक बेक्ड सार्डिन्स विथ टोमैटो एंड लेमन" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-175139", grams: 300 }, // Fish, sardine
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Lay the sliced onion in a small baking dish and drizzle with half the oil.",
      "Drain the sardines well and pat them dry so they roast rather than steam.",
      "Arrange the sardines over the onion in a single snug layer and season well.",
      "Scatter the chopped tomato and garlic over the fish and drizzle with the remaining oil.",
      "Bake for 15-18 minutes until the sardines are firm, the tomato has collapsed and the juices bubble.",
      "Squeeze over the lemon juice, rest 2 minutes, and serve straight from the dish with bread to mop up the juices.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-piccata",
    name: { en: "Chicken Piccata with Lemon-Butter Sauce", hindi: "चिकन पिकाटा विथ लेमन-बटर सॉस" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // Chicken, breast
      { foodId: "usda-168936", grams: 40 }, // Wheat flour, white
      { foodId: "usda-173410", grams: 30 }, // Butter, salted
      { foodId: "usda-167746", grams: 100 }, // Lemons, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Slice each chicken breast horizontally into two thin cutlets; dust lightly with the flour and season with salt and pepper.",
      "Sear in the olive oil over medium-high heat for 3-4 minutes per side until golden and just cooked through; set aside to rest.",
      "Lower the heat and melt the butter in the same pan, scraping up the browned bits — they carry the flavour of the sauce.",
      "Add the lemon juice and 100 ml water and simmer 2-3 minutes until the sauce turns glossy and slightly thickened.",
      "Return the chicken and any resting juices to the pan and turn once in the sauce to coat.",
      "Serve at once with the lemon-butter sauce spooned over — piccata waits for no one.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-cacciatore",
    name: { en: "Chicken Cacciatore", hindi: "चिकन काचियातोरे" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-170457", grams: 500 }, // Tomatoes, red
      { foodId: "usda-170108", grams: 200 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-1750347", grams: 150 }, // Mushrooms, white button
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Brown the seasoned chicken thighs in the olive oil in a heavy pot, 5 minutes per side, until deep golden; set aside.",
      "Soften the onion and peppers in the same oil for 7-8 minutes; add the mushrooms and cook 4 minutes until they give up their liquid.",
      "Add the garlic for 1 minute, then the chopped tomatoes and salt; simmer 10 minutes into a thick sauce.",
      "Return the chicken and its juices, cover and braise on low heat for 30 minutes until the meat pulls easily from the bone.",
      "Uncover for the last 5 minutes to let the sauce reduce and gloss.",
      "Rest 5 minutes and serve with the vegetables and sauce spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pollo-sorrentina",
    name: { en: "Pollo alla Sorrentina (Baked Chicken with Mozzarella and Tomato)", hindi: "पोलो आला सोरेंटीना (बेक्ड चिकन विथ मोज़ेरेला एंड टोमैटो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // Chicken, breast
      { foodId: "usda-329370", grams: 150 }, // Cheese, mozzarella
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Simmer the chopped tomatoes with the garlic, half the oil and salt for 10 minutes into a loose sauce.",
      "Sear the seasoned chicken breasts in the remaining oil for 3 minutes per side until golden but not cooked through.",
      "Spread half the tomato sauce in a baking dish, lay the chicken on top and cover with the rest of the sauce.",
      "Lay the mozzarella slices over each breast.",
      "Bake for 15-18 minutes until the chicken is cooked through and the mozzarella is melted, bubbling and spotted golden.",
      "Rest 3 minutes and serve with the sauce from the dish.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-polpette-tacchino",
    name: { en: "Italian Turkey Meatballs (Polpette di Tacchino)", hindi: "इटैलियन टर्की मीटबॉल्स (पोलपेते दी ताकीनो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // Turkey, ground
      { foodId: "usda-171287", grams: 100 }, // Egg, whole
      { foodId: "usda-329370", grams: 80 }, // Cheese, mozzarella
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Mix the ground turkey with the beaten eggs, grated onion, half the garlic, salt and pepper; chill 20 minutes, then roll into about 16 balls.",
      "Brown the meatballs in the olive oil in batches for 6-8 minutes, turning until coloured all over; set aside (they finish in the sauce).",
      "Soften the remaining onion and garlic in the same pan for 4 minutes; add the chopped tomatoes and salt and simmer 10 minutes.",
      "Return the meatballs to the sauce, cover and simmer gently for 15 minutes until cooked through to the centre.",
      "Scatter the mozzarella over the top, cover for 2 minutes until it melts into the sauce.",
      "Rest 5 minutes and serve with crusty bread or rice to catch the sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-turkey-involtini",
    name: { en: "Turkey Involtini with Spinach and Mozzarella", hindi: "टर्की इनवोल्टीनी विथ स्पिनच एंड मोज़ेरेला" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-171098", grams: 550 }, // Turkey, whole
      { foodId: "usda-329370", grams: 120 }, // Cheese, mozzarella
      { foodId: "usda-168462", grams: 200 }, // Spinach, raw
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Wilt the spinach in a dry pan for 2 minutes, squeeze very dry and chop — wet spinach makes soggy rolls.",
      "Cut the turkey breast into 8 thin escalopes and lay each between sheets of film; flatten gently with a rolling pin to an even 5 mm.",
      "Season each escalope, spread with spinach and lay mozzarella along one end; roll up tightly and secure with a cocktail stick.",
      "Sear the rolls in the olive oil for 5-6 minutes, turning, until golden all over.",
      "Add the chopped tomatoes, garlic and salt around the rolls, cover and braise 12-15 minutes until the turkey is cooked through.",
      "Rest 3 minutes, remove the sticks, slice each roll in half to show the spiral, and serve with the tomato sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-risotto-tonno",
    name: { en: "Tuna Risotto (Risotto al Tonno)", hindi: "टूना रिसोट्टो (रिसोट्टो अल तोनो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-334194", grams: 450 }, // Fish, tuna
      { foodId: "usda-2512381", grams: 280 }, // Rice, white
      { foodId: "usda-170419", grams: 150 }, // Peas, green
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the finely chopped onion in the olive oil for 5 minutes without colouring.",
      "Add the rice and stir for 1-2 minutes until the grains are translucent at the edges and glossed with oil (the tostatura).",
      "Add hot water a ladle at a time (about 900 ml in total), stirring often and letting each addition absorb before the next, for 16-18 minutes.",
      "When the rice is nearly tender, stir in the peas and cook 3 minutes more.",
      "Fold in the drained tuna in large flakes with the lemon juice; warm 1 minute — the tuna only needs heating through.",
      "Rest off the heat for 2 minutes; the risotto should flow like a wave (all'onda) when the plate is shaken. Serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-risotto-salmone",
    name: { en: "Salmon Risotto (Risotto al Salmone)", hindi: "सैल्मन रिसोट्टो (रिसोट्टो अल सालमोने)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684441", grams: 500 }, // Fish, salmon
      { foodId: "usda-2512381", grams: 280 }, // Rice, white
      { foodId: "usda-170419", grams: 100 }, // Peas, green
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-173410", grams: 20 }, // Butter, salted
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Cut the salmon into 2 cm chunks and season. Sear quickly in half the butter for 2 minutes until just golden outside; set aside (it finishes in the rice).",
      "Soften the onion in the remaining butter for 5 minutes; add the rice and toast 1-2 minutes until translucent at the edges.",
      "Add hot water a ladle at a time (about 900 ml), stirring often, for 16-18 minutes until the rice is creamy and just tender.",
      "Stir in the peas for the last 3 minutes of cooking.",
      "Fold the salmon gently through with the lemon juice and warm 1-2 minutes until the fish is just opaque — overcooking dries it.",
      "Rest 2 minutes off the heat and serve in warm bowls while the risotto still flows.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-risotto-gamberi",
    name: { en: "Shrimp Risotto (Risotto ai Gamberi)", hindi: "श्रिम्प रिसोट्टो (रिसोट्टो आई गामबेरी)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175179", grams: 550 }, // Crustaceans, shrimp
      { foodId: "usda-2512381", grams: 280 }, // Rice, white
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the onion in the olive oil for 5 minutes; add the garlic for the last minute.",
      "Add the rice and toast 1-2 minutes, stirring, until the grains glisten and turn translucent at the edges.",
      "Add hot water a ladle at a time (about 900 ml), stirring often and letting each addition absorb, for 16-18 minutes.",
      "Meanwhile season the shrimp; in the last 4 minutes of the rice's cooking, lay them on top of the risotto, cover, and let them steam until pink.",
      "Fold the shrimp through with the lemon juice; check the rice is creamy with a slight bite at the centre of each grain.",
      "Rest 2 minutes and serve immediately in warm bowls.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-orzotto",
    name: { en: "Chicken and Mushroom Orzotto (Barley Risotto)", hindi: "चिकन एंड मशरूम ओर्ज़ोट्टो (बार्ली रिसोट्टो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 450 }, // Chicken, breast
      { foodId: "usda-170284", grams: 260 }, // Barley, pearled
      { foodId: "usda-1750347", grams: 200 }, // Mushrooms, white button
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Sear the seasoned chicken pieces in the olive oil for 4-5 minutes until golden; set aside.",
      "Cook the mushrooms in the same pot for 5-6 minutes until they release their liquid and brown; add the onion and garlic for 3 minutes more.",
      "Stir in the rinsed barley until coated, then pour in about 900 ml hot water and season.",
      "Simmer gently for 30-35 minutes, stirring now and then and topping up with water if it dries, until the barley is tender with a pleasant chew.",
      "Return the chicken and its juices for the last 8 minutes to cook through and flavour the grains.",
      "Rest 5 minutes off the heat — orzotto thickens as it stands — and serve in warm bowls.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-frittata-spinach-mozzarella",
    name: { en: "Spinach and Mozzarella Frittata", hindi: "स्पिनच एंड मोज़ेरेला फ्रिटाटा" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 250 }, // Egg, whole
      { foodId: "usda-172183", grams: 150 }, // Egg, white
      { foodId: "usda-329370", grams: 80 }, // Cheese, mozzarella
      { foodId: "usda-168462", grams: 150 }, // Spinach, raw
      { foodId: "usda-790646", grams: 80 }, // Onions, yellow
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Wilt the spinach in a dry ovenproof pan for 2 minutes; squeeze dry and chop roughly.",
      "Soften the sliced onion in the olive oil in the same pan for 5 minutes until sweet.",
      "Whisk the eggs and whites with the salt; stir in the spinach and onion.",
      "Pour the mixture back into the hot pan and cook on low heat for 6-8 minutes, lifting the edges once or twice, until the base is set and golden.",
      "Scatter the mozzarella over the top and place under a hot grill for 2-3 minutes until the top is just set and the cheese bubbles.",
      "Rest 2 minutes, then slide onto a board and cut into wedges; frittata is as good warm as at room temperature.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-frittata-patate",
    name: { en: "Potato Frittata (Frittata di Patate)", hindi: "पोटैटो फ्रिटाटा (फ्रिटाटा दी पाताते)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 250 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-2346401", grams: 300 }, // Potatoes, russet
      { foodId: "usda-329370", grams: 60 }, // Cheese, mozzarella
      { foodId: "usda-790646", grams: 80 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Slice the potatoes thinly (about 3 mm) and cook in the olive oil over medium heat for 12-15 minutes, turning occasionally, until tender and golden at the edges; add the onion for the last 5 minutes.",
      "Whisk the eggs and whites with the salt and pour evenly over the potatoes.",
      "Cook on the lowest heat for 8-10 minutes, shaking the pan gently, until the edges are set and the centre is just slightly loose.",
      "Scatter the mozzarella over, cover the pan for 2 minutes to set the top and melt the cheese.",
      "Rest 2 minutes, loosen the edges with a spatula and slide onto a plate.",
      "Cut into wedges and serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-uova-purgatorio",
    name: { en: "Uova in Purgatorio (Eggs in Tomato Sauce)", hindi: "वोवा इन पुर्गातोरियो (एग्स इन टोमैटो सॉस)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 200 }, // Egg, whole
      { foodId: "usda-172183", grams: 150 }, // Egg, white
      { foodId: "usda-329370", grams: 60 }, // Cheese, mozzarella
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-170106", grams: 4 }, // Peppers, hot chili
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Soften the garlic and chilli in the olive oil for 1 minute until fragrant but not browned.",
      "Add the chopped tomatoes and salt and simmer 10-12 minutes until thick, sweet and glossy.",
      "Make 4 wells in the sauce and crack a whole egg into each; spoon the egg whites around the edges of the pan.",
      "Cover and cook on low heat for 5-7 minutes until the whites are set and the yolks are still runny and glossy.",
      "Scatter the mozzarella over, cover for 1 minute more to melt.",
      "Serve straight from the pan with bread for the yolks and sauce.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-minestrone-fagioli",
    name: { en: "Minestrone with Kidney Beans", hindi: "मिनेस्त्रोने विथ किडनी बीन्स" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175193", grams: 420 }, // Beans, kidney
      { foodId: "usda-2346401", grams: 200 }, // Potatoes, russet
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-2346407", grams: 200 }, // Cabbage, green
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-2346400", grams: 150 }, // Beans, snap
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the kidney beans overnight; drain, cover with fresh water, boil 10 minutes, then simmer 35 minutes until nearly tender.",
      "Add the chopped onion, carrot, potato and garlic with about 1.2 litres of water; simmer 15 minutes.",
      "Add the cabbage, green beans and chopped tomatoes; simmer 15-20 minutes more until every vegetable is tender and the broth is flavourful.",
      "Season well — minestrone needs confident salting — and simmer 3 minutes.",
      "Rest 10 minutes off the heat; the soup thickens and the flavours marry.",
      "Serve with a drizzle of raw olive oil over each bowl.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-ribollita",
    name: { en: "Ribollita (Tuscan Bean and Vegetable Soup)", hindi: "रिबोलिता (टस्कन बीन एंड वेजिटेबल सूप)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-173745", grams: 460 }, // Beans, navy
      { foodId: "usda-2346407", grams: 300 }, // Cabbage, green
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-2346401", grams: 200 }, // Potatoes, russet
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight; drain, cover with fresh water and simmer 40 minutes until tender; reserve the liquid and blend a ladleful of beans into it for body.",
      "Soften the onion and carrot in half the olive oil for 8 minutes; add the garlic for the last minute.",
      "Add the potato, cabbage and tomatoes with the bean liquid; simmer 25 minutes until the vegetables are soft.",
      "Stir in the remaining whole beans and simmer 10 minutes more — ribollita should be thick enough to stand a spoon in.",
      "Season, rest 10 minutes off the heat (it is traditionally reheated — 'ribollita' means reboiled — and is better for it).",
      "Serve with the remaining raw olive oil drizzled over.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-zuppa-lenticchie",
    name: { en: "Italian Lentil Soup (Zuppa di Lenticchie)", hindi: "इटैलियन लेंटिल सूप (ज़ुपा दी लेंटिकिए)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644283", grams: 440 }, // Lentils, dry
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soften the finely chopped onion and carrot in the olive oil for 7-8 minutes until sweet; add the garlic for the last minute.",
      "Add the rinsed lentils and about 1.3 litres of water; bring to a simmer, skim, and cook 20 minutes.",
      "Add the chopped tomatoes and salt and simmer 10-15 minutes more until the lentils are completely tender and the soup has body.",
      "Check the seasoning — lentils drink salt, and the soup should taste fully savoury before it rests.",
      "For a creamier texture, blend one ladleful and stir it back in.",
      "Rest 5 minutes, taste for salt, and serve with a thread of raw olive oil on each bowl.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pesce-acqua-pazza",
    name: { en: "Pesce all'Acqua Pazza (Cod Poached in Tomato)", hindi: "पेशे आल'आक्वा पात्सा (कॉड पोच्ड इन टोमैटो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 700 }, // Fish, cod
      { foodId: "usda-170457", grams: 500 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 12 }, // Garlic, raw
      { foodId: "usda-170106", grams: 10 }, // Peppers, hot chili
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the olive oil in a wide pan and sizzle the sliced garlic and chilli for 1 minute until fragrant.",
      "Add the chopped tomatoes, salt and 200 ml water; simmer briskly for 10 minutes — the 'crazy water' should be brothy and bright.",
      "Season the cod and lay the fillets into the simmering sauce in a single layer.",
      "Cover and poach gently for 8-10 minutes until the fish is opaque and flakes at the thickest part; do not boil hard or the fish toughens.",
      "Rest 2 minutes off the heat.",
      "Serve the fish with plenty of the tomato broth spooned over and bread for mopping.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-insalata-di-mare",
    name: { en: "Insalata di Mare (Warm Shrimp Salad with Lemon)", hindi: "इंसालाता दी मारे (वॉर्म श्रिम्प सैलड विथ लेमन)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-175179", grams: 350 }, // Crustaceans, shrimp
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-2346406", grams: 150 }, // Cucumber, with peel
      { foodId: "usda-170108", grams: 100 }, // Peppers, sweet
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Bring a pan of salted water to a gentle simmer with the garlic; poach the shrimp for 2-3 minutes until just pink and curled; drain and cool slightly.",
      "Slice the cucumber and pepper into thin strips and lay on a platter.",
      "Whisk the lemon juice with the olive oil and salt into a dressing.",
      "Arrange the warm shrimp over the vegetables — warm seafood drinks up the dressing in a way cold never does.",
      "Pour the dressing over and rest 5 minutes so the flavours settle.",
      "Serve warm or at room temperature with lemon wedges.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pollo-diavola",
    name: { en: "Pollo alla Diavola (Chilli-Grilled Chicken)", hindi: "पोलो आला दियावोला (चिली-ग्रिल्ड चिकन)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-170932", grams: 3 }, // Spices, pepper
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Crush the garlic with the salt, cayenne and half the olive oil into a fiery paste; rub all over the chicken and leave for at least 30 minutes.",
      "Heat a grill or heavy griddle until very hot; brush the chicken with the remaining oil.",
      "Grill the thighs for 7-8 minutes per side, pressing them flat with a spatula, until charred at the edges and cooked through.",
      "Squeeze the lemon juice over the chicken in the last minute of cooking — it will hiss and glaze.",
      "Rest 5 minutes under foil so the juices return into the meat.",
      "Serve with extra lemon wedges; the heat should be bold but balanced by the lemon.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-gnocchi-turkey-ragu",
    name: { en: "Gnocchi with Turkey Ragù", hindi: "नोकी विथ टर्की रागू" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2514747", grams: 500 }, // Turkey, ground
      { foodId: "usda-2346401", grams: 600 }, // Potatoes, russet
      { foodId: "usda-168936", grams: 150 }, // Wheat flour, white
      { foodId: "usda-171287", grams: 50 }, // Egg, whole
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "For the ragù: soften the onion in the olive oil for 6 minutes, add the garlic, then the ground turkey; cook 8-10 minutes, breaking it up, until browned.",
      "Add the chopped tomatoes and salt and simmer gently for 30 minutes into a thick, rich sauce.",
      "Meanwhile boil the potatoes in their skins until completely tender (about 25 minutes); peel while hot and press through a ricer or mash until smooth and dry.",
      "Work the flour and beaten egg into the warm potato with a light hand into a soft dough — overworking makes gnocchi tough.",
      "Roll the dough into ropes, cut into 2 cm pieces and press each lightly with a fork; boil in salted water until they float, plus 30 seconds.",
      "Lift the gnocchi straight into the ragù with a splash of their cooking water, toss gently for 1 minute, rest 2 minutes and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-stracciatella-soup",
    name: { en: "Stracciatella-Style Egg and Spinach Soup", hindi: "स्त्राचियातेला-स्टाइल एग एंड स्पिनच सूप" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 150 }, // Egg, whole
      { foodId: "usda-172183", grams: 150 }, // Egg, white
      { foodId: "usda-329370", grams: 50 }, // Cheese, mozzarella
      { foodId: "usda-168462", grams: 100 }, // Spinach, raw
      { foodId: "usda-168933", grams: 20 }, // Semolina, unenriched
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Bring about 900 ml of well-seasoned water (or light stock) to a gentle boil; whisk in the semolina in a thin stream and simmer 3 minutes to lightly thicken the broth.",
      "Add the chopped spinach and cook 1 minute until wilted.",
      "Whisk the eggs and whites with the finely grated mozzarella and a pinch of salt.",
      "Stir the soup in one direction to make a slow whirlpool and drizzle the egg mixture in a thin stream — it will set into delicate ribbons ('stracciatella' means little rags).",
      "Simmer 1 minute more without stirring hard, just until the ribbons are set.",
      "Rest 1 minute and serve immediately in warm bowls.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-tilapia-livornese",
    name: { en: "Tilapia alla Livornese (Fish in Tomato Sauce)", hindi: "तिलापिया आला लिवोरनेसे (फिश इन टोमैटो सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684442", grams: 650 }, // Fish, tilapia
      { foodId: "usda-170457", grams: 450 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170106", grams: 5 }, // Peppers, hot chili
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the onion in the olive oil for 6 minutes; add the garlic and chilli for the last minute.",
      "Add the chopped tomatoes and salt and simmer 12 minutes into a rich sauce.",
      "Season the tilapia fillets and lay them into the sauce in a single layer.",
      "Cover and simmer gently for 8-10 minutes until the fish is opaque and flakes easily — do not stir, shake the pan instead.",
      "Rest 2 minutes off the heat.",
      "Serve each fillet with plenty of sauce and bread alongside.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-gambas-ajillo",
    name: { en: "Gambas al Ajillo (Garlic Shrimp)", hindi: "गामबास अल आहीयो (गार्लिक श्रिम्प)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-175179", grams: 320 }, // Crustaceans, shrimp
      { foodId: "usda-171413", grams: 40 }, // Oil, olive
      { foodId: "usda-1104647", grams: 20 }, // Garlic, raw
      { foodId: "usda-170106", grams: 10 }, // Peppers, hot chili
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Slice the garlic thinly — never crush it for this dish; the slices toast into golden chips.",
      "Heat the olive oil in a small heavy pan (traditionally a clay cazuela) until shimmering; add the garlic slices and chilli.",
      "Cook 1 minute until the garlic is pale gold at the edges — it burns in seconds, so watch it closely.",
      "Add the shrimp and salt in a single layer; cook 1-2 minutes per side until pink, curled and just opaque.",
      "Take off the heat while the oil still bubbles furiously and serve immediately in the hot pan.",
      "Serve with bread to chase every drop of the garlic oil.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pollo-ajillo",
    name: { en: "Pollo al Ajillo (Spanish Garlic Chicken)", hindi: "पोयो अल आहीयो (स्पैनिश गार्लिक चिकन)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-1104647", grams: 25 }, // Garlic, raw
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Season the chicken pieces well. Brown in the olive oil in a wide pan for 5-6 minutes per side until deep golden; set aside.",
      "Lower the heat and add the sliced garlic to the chicken oil; cook 1-2 minutes until pale gold and fragrant.",
      "Return the chicken with any juices and 100 ml water; cover and simmer 15 minutes until cooked through.",
      "Uncover and reduce the juices for 3-4 minutes into a glossy garlic glaze.",
      "Squeeze the lemon over at the very end so it stays bright.",
      "Rest 3 minutes and serve with the garlic chips and juices spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-cod-galician",
    name: { en: "Galician-Style Cod with Potatoes and Peas", hindi: "गैलिशियन-स्टाइल कॉड विथ पोटैटोज़ एंड पीज़" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 650 }, // Fish, cod
      { foodId: "usda-2346401", grams: 500 }, // Potatoes, russet
      { foodId: "usda-170419", grams: 150 }, // Peas, green
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-170932", grams: 2 }, // Spices, pepper
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Simmer the sliced potatoes and onion in salted water for 12-15 minutes until just tender; add the peas for the last 3 minutes. Reserve a cup of the cooking water.",
      "Lay the cod fillets over the potatoes, cover and steam-poach on the lowest heat for 8-10 minutes until the fish flakes.",
      "Meanwhile make the ajada: heat the olive oil gently and sizzle the sliced garlic until pale gold; take off the heat and stir in the cayenne.",
      "Drain the fish and vegetables, keeping a little cooking water to loosen.",
      "Arrange on a warm platter, spoon the hot garlic oil over everything — it should sizzle on contact.",
      "Rest 2 minutes and serve immediately.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-cod-tomato-spanish",
    name: { en: "Cod with Tomato (Bacalao con Tomate)", hindi: "कॉड विथ टोमैटो (बाकालाओ कोन तोमाते)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 650 }, // Fish, cod
      { foodId: "usda-170457", grams: 500 }, // Tomatoes, red
      { foodId: "usda-170427", grams: 200 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the onion and green pepper in the olive oil for 8-10 minutes until sweet; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 15 minutes into a thick, rich sauce — the oil should glisten at the edges.",
      "Dust the cod fillets lightly with flour if you like a firmer crust (optional) and season well.",
      "Lay the cod into the sauce, cover and simmer gently for 8-10 minutes until opaque and flaking.",
      "Rest 2 minutes off the heat so the fish firms in the sauce.",
      "Serve with plenty of sauce and bread or potatoes alongside.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-lentejas-estofadas",
    name: { en: "Lentejas Estofadas (Spanish Lentil Stew)", hindi: "लेंतेहास एस्तोफादास (स्पैनिश लेंटिल स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644283", grams: 440 }, // Lentils, dry
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-2346401", grams: 200 }, // Potatoes, russet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170917", grams: 1 }, // Spices, bay leaf
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soften the chopped onion and carrot in the olive oil for 7-8 minutes; add the garlic and bay for the last minute.",
      "Add the rinsed lentils, diced potato, chopped tomato and about 1.3 litres of water.",
      "Simmer gently for 30-35 minutes, stirring occasionally, until the lentils are tender and the stew has thickened.",
      "Season with salt only once the lentils are soft.",
      "Rest 5 minutes off the heat — the stew thickens as it stands.",
      "Serve with a thread of raw olive oil and a splash of vinegar at the table if you like it sharp.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-garbanzos-espinacas",
    name: { en: "Garbanzos con Espinacas (Chickpeas with Spinach)", hindi: "गारबांसोस कोन एस्पिनाकास (चिकपीज़ विथ स्पिनच)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-168462", grams: 300 }, // Spinach, raw
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 12 }, // Garlic, raw
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until completely tender; reserve a cup of the cooking liquid.",
      "Fry the sliced garlic in the olive oil until golden; lift out half for the top.",
      "Add the chopped tomato to the garlic oil and cook 8 minutes into a sauce; stir in the cumin.",
      "Add the chickpeas with a splash of their liquid and simmer 10 minutes so they take on the sauce.",
      "Fold in the spinach a handful at a time and cook 3-4 minutes until just wilted and bright.",
      "Rest 3 minutes, scatter the reserved garlic over, and serve.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-huevos-flamenca",
    name: { en: "Huevos a la Flamenca (Baked Eggs with Tomato and Peas)", hindi: "वेवोस आ ला फ्लामेंका (बेक्ड एग्स विथ टोमैटो एंड पीज़)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 200 }, // Egg, whole
      { foodId: "usda-172183", grams: 200 }, // Egg, white
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-170419", grams: 150 }, // Peas, green
      { foodId: "usda-170108", grams: 100 }, // Peppers, sweet
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Soften the pepper in the olive oil for 5 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 10 minutes into a thick sauce; stir in the peas and cook 2 minutes.",
      "Divide the sauce between two small oven dishes (or one wide one).",
      "Make wells and crack the eggs in; spoon the egg whites around to fill the dishes evenly.",
      "Bake for 8-11 minutes until the whites are just set and the yolks still runny and glossy.",
      "Rest 1 minute and serve straight from the dishes with toast.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-atun-encebollado",
    name: { en: "Atún Encebollado (Tuna with Caramelised Onions)", hindi: "आतून एंथेबोयादो (टूना विथ कैरामेलाइज़्ड अनियन्स)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-334194", grams: 300 }, // Fish, tuna
      { foodId: "usda-790646", grams: 300 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-173469", grams: 15 }, // Vinegar, cider
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Slice the onions thinly and cook in the olive oil over medium-low heat for 20-25 minutes, stirring often, until deep golden and sweet — patience is the whole recipe.",
      "Add the sliced garlic for the last 2 minutes.",
      "Splash in the vinegar and let it bubble away almost completely, loosening the caramel from the pan.",
      "Drain the tuna and break into large flakes; lay over the onions.",
      "Cover and warm on the lowest heat for 3-4 minutes — the tuna only heats through; cooking it hard dries it out.",
      "Rest 2 minutes and serve with the onions piled over the tuna.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pollo-pepitoria",
    name: { en: "Pollo en Pepitoria (Chicken in Almond and Egg Sauce)", hindi: "पोयो एन पेपितोरिया (चिकन इन आलमंड एंड एग सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // Chicken, thigh
      { foodId: "usda-2346393", grams: 60 }, // Nuts, almonds
      { foodId: "usda-172184", grams: 50 }, // Egg, yolk
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Brown the seasoned chicken in the olive oil for 5 minutes per side; set aside.",
      "Soften the onion in the same oil for 7 minutes; add the garlic for the last minute, then 500 ml water; simmer 10 minutes.",
      "Pound or blend the almonds to a coarse paste with a splash of the cooking liquid.",
      "Return the chicken to the pan, stir in the almond paste and simmer gently for 15-20 minutes until the chicken is tender and the sauce creamy.",
      "Beat the egg yolks with a ladle of hot sauce, then stir back into the pan off the boil — cook 2 minutes without boiling, or the yolks will scramble.",
      "Rest 3 minutes and serve with the sauce spooned over; pepitoria should be pale, rich and silky.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-garbanzos-gambas",
    name: { en: "Garbanzos con Gambas (Chickpeas with Shrimp)", hindi: "गारबांसोस कोन गामबास (चिकपीज़ विथ श्रिम्प)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175179", grams: 400 }, // Crustaceans, shrimp
      { foodId: "usda-2644282", grams: 300 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-171319", grams: 3 }, // Spices, chili powder
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until tender; reserve the liquid.",
      "Soften the onion in the olive oil for 6 minutes; add the garlic and chilli powder for the last minute.",
      "Add the chopped tomatoes and cook 10 minutes into a sauce; stir in the chickpeas with a cup of their liquid and simmer 10 minutes.",
      "Pat the shrimp dry, season, and lay them into the stew; cook 3-4 minutes, turning once, until pink and just opaque.",
      "Rest 2 minutes off the heat — the shrimp finish gently in the residual warmth.",
      "Serve in shallow bowls with lemon if you like it bright.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-albondigas-pavo-almendras",
    name: { en: "Albóndigas de Pavo en Salsa de Almendras (Turkey Meatballs in Almond Sauce)", hindi: "आल्बोंदिगास दे पावो एन साल्सा दे अलमेंद्रास (टर्की मीटबॉल्स इन आलमंड सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2514747", grams: 550 }, // Turkey, ground
      { foodId: "usda-2346393", grams: 70 }, // Nuts, almonds
      { foodId: "usda-171287", grams: 50 }, // Egg, whole
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Mix the ground turkey with the beaten egg, half the grated onion, salt and pepper; chill 20 minutes and roll into about 16 balls.",
      "Brown the meatballs in the olive oil in batches for 6-8 minutes until coloured all over; set aside.",
      "Soften the remaining onion in the same pan for 6 minutes; add the garlic for the last minute.",
      "Blend the almonds with 400 ml hot water into a milky sauce and pour into the pan; simmer 5 minutes.",
      "Return the meatballs and simmer gently for 12-15 minutes until cooked through and the almond sauce has thickened.",
      "Rest 5 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-revuelto-setas",
    name: { en: "Revuelto de Setas (Mushroom Scrambled Eggs)", hindi: "रेवुएल्तो दे सेतास (मशरूम स्क्रैम्बल्ड एग्स)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 250 }, // Egg, whole
      { foodId: "usda-172183", grams: 150 }, // Egg, white
      { foodId: "usda-1750347", grams: 250 }, // Mushrooms, white button
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Cook the sliced mushrooms in the olive oil over high heat for 5-6 minutes, undisturbed at first, until they release their liquid and turn golden; add the garlic for the last minute.",
      "Lower the heat to the minimum and season the mushrooms.",
      "Whisk the eggs and whites with the salt and pour over the mushrooms.",
      "Stir slowly and continuously with a spatula, folding the eggs as they set, for 3-4 minutes — a revuelto is creamy and soft, never dry or browned.",
      "Take off the heat while still slightly runny; the eggs finish in the pan's warmth.",
      "Serve immediately on warm plates or toast.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pisto-huevo",
    name: { en: "Pisto con Huevo (Vegetable Stew with Eggs)", hindi: "पिस्तो कोन वेवो (वेजिटेबल स्टू विथ एग्स)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 250 }, // Egg, whole
      { foodId: "usda-172183", grams: 150 }, // Egg, white
      { foodId: "usda-2685577", grams: 200 }, // Eggplant, raw
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Cook the diced eggplant in half the olive oil for 8-10 minutes until soft and golden; set aside.",
      "Soften the onion and green pepper in the remaining oil for 8 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 12-15 minutes into a thick pisto; fold the eggplant back in.",
      "Make wells in the stew and crack in the eggs; spoon the whites around the wells.",
      "Cover and cook on low heat for 6-8 minutes until the whites are set and the yolks glossy and runny.",
      "Serve straight from the pan with bread.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-merluza-salsa-verde",
    name: { en: "Cod in Green Sauce (Merluza en Salsa Verde)", hindi: "कॉड इन ग्रीन सॉस (मेर्लूसा एन साल्सा वेर्दे)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 650 }, // Fish, cod
      { foodId: "usda-170419", grams: 150 }, // Peas, green
      { foodId: "usda-169997", grams: 40 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-1104647", grams: 15 }, // Garlic, raw
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-168936", grams: 15 }, // Wheat flour, white
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Sizzle the sliced garlic in the olive oil for 1 minute until pale gold; stir in the flour and cook 1 minute.",
      "Pour in 400 ml hot water slowly, whisking to a smooth, thin sauce; simmer 5 minutes.",
      "Season the cod and lay the fillets into the sauce; cover and poach gently for 8 minutes.",
      "Add the peas and cook 3 minutes more until the fish flakes and the peas are bright.",
      "Take off the heat and swirl the pan so the sauce emulsifies and glosses.",
      "Scatter generously with the chopped coriander leaves (the green of the salsa verde) and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-pollo-chilindron",
    name: { en: "Pollo al Chilindrón (Chicken with Peppers and Tomato)", hindi: "पोयो अल चिलिंद्रोन (चिकन विथ पेपर्स एंड टोमैटो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // Chicken, thigh
      { foodId: "usda-170108", grams: 250 }, // Peppers, sweet
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Brown the seasoned chicken in the olive oil for 5 minutes per side until golden; set aside.",
      "Soften the onion and red pepper strips in the same oil for 8-10 minutes until sweet and soft.",
      "Add the garlic for 1 minute, then the chopped tomatoes and salt; simmer 12 minutes into a thick sauce.",
      "Return the chicken and its juices, cover and braise on low heat for 20-25 minutes until tender.",
      "Uncover for the last 5 minutes to reduce the sauce until it clings to the chicken.",
      "Rest 5 minutes and serve with the peppers and sauce spooned over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-albondigas-cordero",
    name: { en: "Albóndigas de Cordero (Spanish Lamb Meatballs in Tomato Sauce)", hindi: "आल्बोंदिगास दे कोर्देरो (स्पैनिश लैम्ब मीटबॉल्स इन टोमैटो सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 600 }, // Lamb, ground
      { foodId: "usda-171287", grams: 50 }, // Egg, whole
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Mix the ground lamb with the beaten egg, half the grated onion, cumin, salt and pepper; chill 20 minutes and roll into about 16 balls.",
      "Brown the meatballs in the olive oil in batches for 6-8 minutes until coloured all over; set aside.",
      "Soften the remaining onion in the same pan for 6 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 12 minutes into a thick sauce.",
      "Return the meatballs, cover and simmer gently for 15 minutes until cooked through to the centre.",
      "Rest 5 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-salmon-pisto",
    name: { en: "Salmón a la Plancha con Pisto (Griddled Salmon with Vegetable Stew)", hindi: "साल्मोन आ ला प्लांचा कोन पिस्तो (ग्रिडल्ड सैल्मन विथ वेजिटेबल स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684441", grams: 600 }, // Fish, salmon
      { foodId: "usda-2685577", grams: 200 }, // Eggplant, raw
      { foodId: "usda-170108", grams: 150 }, // Peppers, sweet
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "For the pisto: soften the onion and pepper in half the olive oil for 8 minutes; add the eggplant and cook 8 minutes until soft.",
      "Add the chopped tomatoes, garlic and salt and simmer 12 minutes into a thick, sweet stew; keep warm.",
      "Pat the salmon very dry and season; heat a griddle until smoking and brush the fish with the remaining oil.",
      "Griddle skin-side down (or presentation-side down) for 4-5 minutes until crisp and mostly cooked through.",
      "Turn once and cook 1-2 minutes more — the centre should stay just translucent and juicy.",
      "Rest 2 minutes and serve the salmon over the warm pisto with lemon if you like.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-poulet-basquaise",
    name: { en: "Poulet Basquaise (Basque Chicken with Peppers)", hindi: "पूले बास्केज़ (बास्क चिकन विथ पेपर्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-170108", grams: 250 }, // Peppers, sweet
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Brown the seasoned chicken in the olive oil in a heavy pot for 5 minutes per side until golden; set aside.",
      "Soften the onion and pepper strips in the same oil for 10 minutes until sweet and collapsing.",
      "Add the garlic for 1 minute, then the chopped tomatoes and salt; simmer 12 minutes into a thick sauce.",
      "Return the chicken and its juices, cover and braise on low heat for 25-30 minutes until the meat is tender.",
      "Uncover for the last 5 minutes to reduce the sauce until glossy.",
      "Rest 5 minutes and serve with the peppers and sauce spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-salade-nicoise",
    name: { en: "Salade Niçoise (Tuna, Egg and Green Bean Salad)", hindi: "सालाद नीस्वाज़ (टूना, एग एंड ग्रीन बीन सैलड)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-334194", grams: 240 }, // Fish, tuna
      { foodId: "usda-171287", grams: 100 }, // Egg, whole
      { foodId: "usda-2346400", grams: 150 }, // Beans, snap
      { foodId: "usda-2346401", grams: 200 }, // Potatoes, russet
      { foodId: "usda-170457", grams: 150 }, // Tomatoes, red
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-167746", grams: 30 }, // Lemons, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Boil the potatoes in their skins until tender (about 20 minutes); peel and slice while warm and dress with a little of the lemon and oil so they drink it up.",
      "Boil the eggs for 8 minutes until the yolks are just set and golden; cool in cold water, peel and quarter.",
      "Blanch the green beans in salted water for 3-4 minutes until bright and just tender; drain and refresh in cold water.",
      "Drain the tuna and break into large flakes.",
      "Arrange the potatoes, beans, tomatoes and tuna on a wide platter in generous sections — a niçoise is composed, never tossed.",
      "Set the egg quarters on top, whisk the remaining lemon and oil with the salt into a dressing, pour over and serve at room temperature.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-bouillabaisse-style",
    name: { en: "Marseille-Style Fish Soup (Bouillabaisse-Style)", hindi: "मार्सेय-स्टाइल फिश सूप (बूयाबेस-स्टाइल)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 350 }, // Fish, cod
      { foodId: "usda-2684441", grams: 250 }, // Fish, salmon
      { foodId: "usda-175179", grams: 250 }, // Crustaceans, shrimp
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 12 }, // Garlic, raw
      { foodId: "usda-171323", grams: 2 }, // Spices, fennel seed
      { foodId: "usda-746771", grams: 60 }, // Oranges, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soften the onion in the olive oil for 8 minutes; add the garlic, fennel seed and a strip of orange zest (use the orange line for its zest and a squeeze of juice) for the last minute.",
      "Add the chopped tomatoes and about 1 litre of hot water; simmer 15 minutes to make a rich, aromatic broth.",
      "Add the cod and salmon in large chunks and poach gently for 6-8 minutes — never a rolling boil, or the fish breaks and toughens.",
      "Add the shrimp for the last 3 minutes until pink and just opaque.",
      "Season boldly, rest 2 minutes, and lift the fish into warm bowls with a slotted spoon.",
      "Ladle the broth over and serve with bread; a true bouillabaisse serves broth and fish in two acts, but one bowl is honest home cooking.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-haddock-meuniere",
    name: { en: "Haddock Meunière with Lemon Butter", hindi: "हैडॉक म्यूनियेर विथ लेमन बटर" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-333374", grams: 340 }, // Fish, haddock
      { foodId: "usda-168936", grams: 30 }, // Wheat flour, white
      { foodId: "usda-173410", grams: 25 }, // Butter, salted
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Pat the haddock fillets very dry — dry fish takes a crisp, golden crust — season, and dust lightly with flour, shaking off the excess.",
      "Heat the butter in a wide pan until it foams and smells nutty.",
      "Lay the fillets in away from you and cook 3-4 minutes without moving until the underside is deep golden.",
      "Turn once and cook 2-3 minutes more until the fish flakes at the thickest part.",
      "Lift the fish onto warm plates; add the lemon juice to the pan butter and swirl for 30 seconds as it foams.",
      "Spoon the lemon butter over the fish and serve immediately.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-fricassee",
    name: { en: "Chicken Fricassée with Mushrooms", hindi: "चिकन फ्रिकासे विथ मशरूम्स" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // Chicken, breast
      { foodId: "usda-1750347", grams: 250 }, // Mushrooms, white button
      { foodId: "usda-322892", grams: 200 }, // Milk, whole
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-173410", grams: 20 }, // Butter, salted
      { foodId: "usda-168936", grams: 20 }, // Wheat flour, white
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Season the chicken and colour it lightly in the butter in a heavy pot for 3-4 minutes per side — a fricassée stays pale, so no deep browning; set aside.",
      "Cook the mushrooms in the same pot for 5 minutes until golden; add the onion for 3 minutes more.",
      "Stir in the flour and cook 1 minute; pour in the milk slowly, stirring to a smooth sauce, then 200 ml water.",
      "Return the chicken and simmer gently, covered, for 20-25 minutes until cooked through and the sauce is creamy.",
      "Season, rest 5 minutes — the sauce will thicken a little more as it stands.",
      "Serve with rice or potatoes to catch the mushroom sauce.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-turkey-blanquette",
    name: { en: "Turkey Blanquette (Blanquette de Dinde)", hindi: "टर्की ब्लांकेत (ब्लांकेत दे दांद)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-171098", grams: 550 }, // Turkey, whole
      { foodId: "usda-2258586", grams: 200 }, // Carrots, mature
      { foodId: "usda-1750347", grams: 200 }, // Mushrooms, white button
      { foodId: "usda-322892", grams: 200 }, // Milk, whole
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-173410", grams: 20 }, // Butter, salted
      { foodId: "usda-168936", grams: 25 }, // Wheat flour, white
      { foodId: "usda-167746", grams: 20 }, // Lemons, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Cover the turkey pieces with cold water, bring slowly to a simmer, skim well, and cook gently for 20 minutes; lift out the turkey and strain the broth — a blanquette's sauce is only as clean as its broth.",
      "Melt the butter, stir in the flour and cook 1 minute without colouring (a blond roux).",
      "Whisk in 500 ml of the strained broth and the milk; simmer 5 minutes into a smooth, pale sauce.",
      "Add the sliced carrot and mushrooms to the sauce and simmer 10 minutes until tender.",
      "Return the turkey and warm through for 5 minutes until hot and coated; do not boil hard.",
      "Finish with the lemon juice, season, rest 3 minutes and serve with rice.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-salade-lentilles",
    name: { en: "French Lentil Salad with Egg (Salade de Lentilles)", hindi: "फ्रेंच लेंटिल सैलड विथ एग (सालाद दे लांतिय)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-2644283", grams: 220 }, // Lentils, dry
      { foodId: "usda-171287", grams: 100 }, // Egg, whole
      { foodId: "usda-2258586", grams: 80 }, // Carrots, mature
      { foodId: "usda-790646", grams: 60 }, // Onions, yellow
      { foodId: "usda-170929", grams: 5 }, // Spices, mustard seed
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-173469", grams: 15 }, // Vinegar, cider
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Simmer the lentils in plenty of water for 20-25 minutes until tender but still holding their shape; drain well.",
      "Boil the eggs for 8 minutes; cool, peel and chop roughly.",
      "Grind the mustard seed and whisk with the vinegar, olive oil and salt into a sharp dressing.",
      "Fold the warm lentils with the finely diced carrot and onion and pour the dressing over — warm lentils absorb it deeply.",
      "Rest 15 minutes so the flavours settle; taste and sharpen with more vinegar if needed.",
      "Fold in the chopped egg and serve warm or at room temperature.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-mackerel-moutarde",
    name: { en: "Grilled Mackerel with Mustard-Yogurt Sauce (Maquereaux à la Moutarde)", hindi: "ग्रिल्ड मैकरल विथ मस्टर्ड-योगर्ट सॉस (माकेरो आ ला मूतार्द)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175119", grams: 650 }, // Fish, mackerel
      { foodId: "usda-170929", grams: 15 }, // Spices, mustard seed
      { foodId: "usda-330137", grams: 100 }, // Yogurt, Greek
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Grind the mustard seed coarsely and stir into the yogurt with the lemon juice and a pinch of salt; chill — this is the sauce, made first so the mustard blooms.",
      "Pat the mackerel fillets dry, season and brush with the olive oil.",
      "Heat a grill or griddle until very hot; lay the fillets skin-side down and cook 4-5 minutes without moving, until the skin is crisp.",
      "Turn once and cook 1-2 minutes more until the flesh is just opaque.",
      "Rest 2 minutes — mackerel is oily and rich, and a short rest settles it.",
      "Serve the hot fish with the cold mustard-yogurt sauce spooned alongside.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-oeufs-cocotte",
    name: { en: "Œufs en Cocotte with Spinach and Mozzarella", hindi: "उफ़ आं कोकोत विथ स्पिनच एंड मोज़ेरेला" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 200 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-329370", grams: 60 }, // Cheese, mozzarella
      { foodId: "usda-168462", grams: 100 }, // Spinach, raw
      { foodId: "usda-322892", grams: 60 }, // Milk, whole
      { foodId: "usda-173410", grams: 8 }, // Butter, salted
      { foodId: "usda-173468", grams: 2 }, // Salt, table
    ],
    method: [
      "Heat the oven to 190°C and put a kettle on. Wilt the spinach in a dry pan for 1-2 minutes, squeeze dry and chop.",
      "Butter two ramekins generously. Divide the spinach and mozzarella between them.",
      "Crack two eggs into each ramekin and spoon the egg whites and a spoonful of milk around them; season.",
      "Set the ramekins in a deep tray and pour in boiling water to halfway up their sides (the bain-marie keeps the eggs silky).",
      "Bake for 10-13 minutes until the whites are just set and the yolks still tremble when the ramekin is nudged.",
      "Rest 1 minute and serve in the ramekins with toast soldiers.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-omelette-mushroom-mozzarella",
    name: { en: "Mushroom and Mozzarella Omelette", hindi: "मशरूम एंड मोज़ेरेला ऑमलेट" },
    category: "breakfast",
    servings: 1,
    lines: [
      { foodId: "usda-171287", grams: 150 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-329370", grams: 50 }, // Cheese, mozzarella
      { foodId: "usda-1750347", grams: 100 }, // Mushrooms, white button
      { foodId: "usda-173410", grams: 10 }, // Butter, salted
      { foodId: "usda-173468", grams: 2 }, // Salt, table
    ],
    method: [
      "Cook the sliced mushrooms in half the butter over high heat for 4-5 minutes until golden and dry; season and set aside.",
      "Whisk the eggs and whites with the salt until just combined and slightly frothy — over-whisking makes a spongy omelette.",
      "Melt the remaining butter in a non-stick pan over medium heat until foaming; pour in the eggs and swirl.",
      "As the eggs set at the edges, draw them gently to the centre with a spatula, tilting the pan so runny egg fills the gaps, for about 1 minute.",
      "When the top is still soft and glossy, scatter the mushrooms and mozzarella over one half.",
      "Fold the omelette over the filling, slide onto a warm plate and rest 1 minute — the centre should be creamy (baveuse), never dry.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-quiche-epinards",
    name: { en: "Spinach Quiche", hindi: "स्पिनच कीश" },
    category: "breakfast",
    servings: 3,
    lines: [
      { foodId: "usda-168936", grams: 120 }, // Wheat flour, white
      { foodId: "usda-173410", grams: 50 }, // Butter, salted
      { foodId: "usda-171287", grams: 250 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-329370", grams: 80 }, // Cheese, mozzarella
      { foodId: "usda-322892", grams: 120 }, // Milk, whole
      { foodId: "usda-168462", grams: 150 }, // Spinach, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Rub the butter into the flour with a pinch of salt until it resembles crumbs; add 2-3 spoonfuls of cold water to bring it together, then chill the pastry for 20 minutes.",
      "Roll out and line a 20 cm tart tin; prick the base, chill again briefly, then bake blind at 190°C for 12 minutes until set and pale gold.",
      "Wilt the spinach, squeeze very dry and chop — wet spinach is the ruin of quiche.",
      "Whisk the eggs, whites and milk with the salt; stir in the spinach and mozzarella.",
      "Pour the filling into the hot pastry case and bake at 180°C for 25-30 minutes until just set with a slight wobble at the centre.",
      "Rest 10 minutes before slicing — the filling firms and the slices cut cleanly.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-provencal",
    name: { en: "Chicken Provençal", hindi: "चिकन प्रोवांसाल" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // Chicken, breast
      { foodId: "usda-170457", grams: 500 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-1104647", grams: 15 }, // Garlic, raw
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Brown the seasoned chicken in the olive oil for 4-5 minutes per side until golden; set aside.",
      "Soften the onion and pepper in the same oil for 8 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 12 minutes into a rich sauce.",
      "Return the chicken and its juices, cover and braise on low heat for 20-25 minutes until cooked through.",
      "Uncover for the last 5 minutes so the sauce reduces and glosses.",
      "Rest 5 minutes and serve with the sauce spooned over — in Provence this is eaten with rice or crusty bread.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-brandade-style",
    name: { en: "Brandade-Style Cod and Potato", hindi: "ब्रांदाद-स्टाइल कॉड एंड पोटैटो" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // Fish, cod
      { foodId: "usda-2346401", grams: 500 }, // Potatoes, russet
      { foodId: "usda-322892", grams: 150 }, // Milk, whole
      { foodId: "usda-171413", grams: 40 }, // Oil, olive
      { foodId: "usda-1104647", grams: 12 }, // Garlic, raw
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Poach the cod gently in the milk plus enough water to cover, for 8-10 minutes, until it flakes; lift out, reserving the poaching liquid, and remove any skin and bones.",
      "Boil the potatoes until completely tender; drain and mash until smooth and dry.",
      "Flake the cod finely and beat it into the hot potato a little at a time.",
      "Warm the olive oil with the crushed garlic until fragrant (do not brown), then beat it into the cod mixture in a stream.",
      "Loosen with splashes of the warm poaching liquid until the brandade is soft, fluffy and spoonable; season — it should taste boldly of fish and garlic.",
      "Serve warm, spread on toast or with potatoes, with lemon alongside.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-soupe-de-poisson",
    name: { en: "Provençal Fish Soup with Shrimp (Soupe de Poisson-Style)", hindi: "प्रोवांसाल फिश सूप विथ श्रिम्प (सूप दे प्वासों-स्टाइल)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-333374", grams: 400 }, // Fish, haddock
      { foodId: "usda-175179", grams: 300 }, // Crustaceans, shrimp
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 12 }, // Garlic, raw
      { foodId: "usda-171323", grams: 3 }, // Spices, fennel seed
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the onion in the olive oil for 8 minutes; add the garlic and fennel seed for the last minute.",
      "Add the chopped tomatoes and about 900 ml hot water; simmer 15 minutes.",
      "Add the haddock in chunks and poach gently for 8 minutes; lift half the fish out and keep warm.",
      "Blend the soup (fish and all) until smooth, then pass through a sieve, pressing hard — a soupe de poisson is defined by this smooth, intense broth.",
      "Return the soup to the heat with the reserved fish and the shrimp; cook 3 minutes until the shrimp are pink.",
      "Season, rest 2 minutes, and serve in warm bowls with bread.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-turkey-escalope-lemon",
    name: { en: "Turkey Escalope with Lemon and Herbs", hindi: "टर्की एस्कालोप विथ लेमन एंड हर्ब्स" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-171098", grams: 550 }, // Turkey, whole
      { foodId: "usda-168936", grams: 30 }, // Wheat flour, white
      { foodId: "usda-173410", grams: 20 }, // Butter, salted
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Cut the turkey breast into 8 escalopes and flatten gently between sheets of film to an even 5 mm — even thickness means even cooking.",
      "Season and dust lightly with flour, shaking off the excess.",
      "Sear in the olive oil and butter over medium-high heat for 2-3 minutes per side until golden and just cooked through; work in batches so the pan stays hot.",
      "Set the escalopes aside to rest; add the lemon juice and 80 ml water to the pan and simmer 1-2 minutes, scraping up the golden bits, into a glossy sauce.",
      "Return the turkey briefly to coat in the sauce.",
      "Serve at once with the lemon sauce spooned over.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-salmon-herb-crust",
    name: { en: "Salmon with Mustard and Herb Crust", hindi: "सैल्मन विथ मस्टर्ड एंड हर्ब क्रस्ट" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684441", grams: 600 }, // Fish, salmon
      { foodId: "usda-170929", grams: 10 }, // Spices, mustard seed
      { foodId: "usda-168893", grams: 30 }, // Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-169997", grams: 10 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Grind the mustard seed coarsely and mix with the wholemeal flour, chopped coriander leaves, salt and pepper into a crumb.",
      "Brush the salmon fillets with a little olive oil and press the crumb firmly onto the top of each fillet.",
      "Lay the fillets on an oiled baking tray, crumb-side up.",
      "Bake for 12-15 minutes until the crust is golden and crisp and the salmon is just opaque in the centre — it should still look juicy when flaked.",
      "Rest 2 minutes so the crust sets and does not slide off when served.",
      "Serve with lemon wedges to cut the richness.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-haricots-bretonne",
    name: { en: "Haricots Blancs à la Bretonne (Breton Bean Stew)", hindi: "आरिको ब्लां आ ला ब्रेतोन (ब्रेटन बीन स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-173745", grams: 480 }, // Beans, navy
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-2258586", grams: 100 }, // Carrots, mature
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170917", grams: 1 }, // Spices, bay leaf
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight; drain, cover with fresh water, boil 10 minutes and drain again.",
      "Return the beans to the pot with fresh water and the bay leaf; simmer gently for 45 minutes until nearly tender.",
      "Soften the onion and carrot in the olive oil for 8 minutes; add the garlic and tomato and cook 8 minutes into a sauce.",
      "Stir the sauce into the beans and simmer 20-25 minutes more until the beans are completely soft and the stew creamy.",
      "Season at the end, remove the bay leaf, and rest 10 minutes.",
      "Serve in deep bowls — in Brittany this is a main course, not a side.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-poulet-chasseur",
    name: { en: "Poulet Chasseur (Hunter's Chicken with Mushrooms)", hindi: "पूले शासौर (हंटर्स चिकन विथ मशरूम्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // Chicken, thigh
      { foodId: "usda-1750347", grams: 250 }, // Mushrooms, white button
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-173410", grams: 15 }, // Butter, salted
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Brown the seasoned chicken in the butter and oil for 5 minutes per side until golden; set aside.",
      "Cook the mushrooms in the same pot over high heat for 5-6 minutes until well browned; add the onion for 3 minutes more.",
      "Add the garlic for 1 minute, then the chopped tomatoes and salt; simmer 10 minutes into a sauce.",
      "Return the chicken and its juices, cover and braise on low heat for 25 minutes until tender.",
      "Uncover for the last 5 minutes to reduce the sauce until it coats the chicken.",
      "Rest 5 minutes and serve with the mushrooms and sauce spooned over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-mercimek-corbasi",
    name: { en: "Mercimek Çorbası (Turkish Red Lentil Soup)", hindi: "मेर्जिमेक चोरबासी (टर्किश रेड लेंटिल सूप)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174284", grams: 440 }, // Lentils, pink or red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-2258586", grams: 100 }, // Carrots, mature
      { foodId: "usda-2346401", grams: 100 }, // Potatoes, russet
      { foodId: "usda-173410", grams: 20 }, // Butter, salted
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-173475", grams: 5 }, // Spearmint, fresh
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soften the chopped onion, carrot and potato in half the butter for 6-7 minutes without browning.",
      "Add the rinsed red lentils, cumin and about 1.4 litres of water; simmer 25 minutes until the lentils have completely fallen apart.",
      "Blend until silky smooth — mercimek çorbası is never chunky — and return to the heat.",
      "Season with salt and simmer 3 minutes; the soup should pour like thin cream. Loosen with water if it thickens too much.",
      "Melt the remaining butter until foaming and stir in the dried mint; it will sizzle and smell sweet.",
      "Serve the soup with the mint butter spooned over each bowl and lemon wedges for squeezing.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-tavuk-sis",
    name: { en: "Tavuk Şiş (Turkish Chicken Shish Kebab)", hindi: "तावुक शीश (टर्किश चिकन शीश कबाब)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // Chicken, breast
      { foodId: "usda-330137", grams: 150 }, // Yogurt, Greek
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-171319", grams: 3 }, // Spices, chili powder
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Cut the chicken into 3 cm cubes. Stir the yogurt with the olive oil, chilli powder, salt and pepper; coat the chicken and chill for at least 2 hours (overnight is better).",
      "Thread the chicken onto skewers alternating with chunks of pepper, onion and tomato.",
      "Heat a grill or heavy griddle until smoking hot.",
      "Grill the skewers for 12-14 minutes, turning every 3 minutes, until charred in spots and cooked through with no pink at the centre.",
      "Rest 5 minutes under foil — kebabs dry out if served straight from the fiercest heat.",
      "Serve on warm flatbread or rice with lemon and a spoonful of yogurt.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-hindi-sis",
    name: { en: "Hindi Şiş (Turkey Shish with Yogurt Marinade)", hindi: "हिंदी शीश (टर्की शीश विथ योगर्ट मैरिनेड)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-171098", grams: 600 }, // Turkey, whole
      { foodId: "usda-330137", grams: 150 }, // Yogurt, Greek
      { foodId: "usda-170108", grams: 150 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Cut the turkey breast into 3 cm cubes. Mix the yogurt with the olive oil, crushed garlic, salt and pepper; coat the turkey and chill at least 2 hours.",
      "Soak wooden skewers in water for 20 minutes if you are using them, so they do not scorch on the grill.",
      "Thread onto skewers alternating with red pepper and onion chunks.",
      "Grill on a very hot grill or griddle for 11-13 minutes, turning every few minutes, until the edges char and the centre is just cooked — turkey overcooks in a blink, so watch the last minutes.",
      "Rest 5 minutes under foil to keep the juices in.",
      "Serve with lemon wedges and any remaining yogurt as a cool sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-kuzu-kofte",
    name: { en: "Kuzu Köfte (Turkish Lamb Kofta)", hindi: "कुज़ु क्योफ्ते (टर्किश लैम्ब कोफ्ता)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 640 }, // Lamb, ground
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-169997", grams: 20 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-170923", grams: 4 }, // Spices, cumin seed
      { foodId: "usda-168893", grams: 30 }, // Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Grate the onion and squeeze it very dry; mix with the lamb, cumin, chopped coriander leaves, flour, salt and plenty of black pepper, kneading for 2 minutes until the mixture turns sticky — this is what makes kofta springy, not crumbly.",
      "Chill for at least 30 minutes; cold kofta mixture shapes cleanly.",
      "With wet hands, mould the mixture into 12 oval kofta around skewers or as patties.",
      "Grill or fry in the olive oil for 10-12 minutes, turning every few minutes, until browned all over and cooked through but still juicy.",
      "Rest 5 minutes under foil.",
      "Serve with flatbread, sliced onion and lemon.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-hindi-kofte",
    name: { en: "Hindi Köfte (Turkish Turkey Kofta)", hindi: "हिंदी क्योफ्ते (टर्किश टर्की कोफ्ता)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // Turkey, ground
      { foodId: "usda-171287", grams: 50 }, // Egg, whole
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-169997", grams: 20 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Grate the onion and squeeze dry; mix with the ground turkey, beaten egg, cumin, chopped coriander leaves, salt and pepper until just combined — turkey kofta toughens if overworked.",
      "Wet your hands before shaping — the mixture is soft and sticks less to damp palms.",
      "Chill for 30 minutes, then shape into 12 ovals with wet hands.",
      "Fry in the olive oil for 10-12 minutes, turning often, until golden all over and cooked through to the centre (cut one open to check — it should be steaming and white throughout).",
      "Rest 5 minutes under foil.",
      "Serve with flatbread, tomato and a spoonful of yogurt.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-karniyarik",
    name: { en: "Karnıyarık (Eggplant Stuffed with Lamb)", hindi: "कार्नीयारिक (एगप्लांट स्टफ्ड विथ लैम्ब)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 600 }, // Lamb, ground
      { foodId: "usda-2685577", grams: 600 }, // Eggplant, raw
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-170427", grams: 100 }, // Peppers, sweet
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Halve the eggplants lengthways, score the flesh, brush with half the oil and roast cut-side up for 25 minutes until soft and collapsing.",
      "Meanwhile soften the onion and pepper in the remaining oil for 7 minutes; add the lamb and cook 8-10 minutes, breaking it up, until browned.",
      "Add the garlic, half the chopped tomato, salt and pepper; simmer 8 minutes into a rich filling.",
      "Press the roasted eggplant flesh down with a spoon to make a hollow and pile the lamb filling generously into each half.",
      "Top with the remaining tomato, pour 100 ml water around the dish and bake 15-20 minutes until bubbling and bronzed.",
      "Rest 5 minutes and serve warm.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-hunkar-begendi",
    name: { en: "Hünkâr Beğendi (Lamb Stew over Eggplant Purée)", hindi: "हुंकार बेगेंदी (लैम्ब स्टू ओवर एगप्लांट प्यूरी)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 600 }, // Lamb, ground
      { foodId: "usda-2685577", grams: 600 }, // Eggplant, raw
      { foodId: "usda-322892", grams: 150 }, // Milk, whole
      { foodId: "usda-329370", grams: 40 }, // Cheese, mozzarella
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-173410", grams: 15 }, // Butter, salted
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Roast the whole eggplants directly over a flame or under a hot grill for 15-20 minutes, turning, until blackened and completely soft — the char is the flavour of beğendi.",
      "For the stew: soften the onion in the olive oil for 6 minutes, add the lamb and brown for 8 minutes; add the tomato and 200 ml water and braise gently for 25-30 minutes until tender.",
      "Halve the eggplants and scoop the smoky flesh into a pan, discarding the skins; mash with a fork.",
      "Warm the butter and milk into the eggplant and beat until a smooth, pale purée forms; stir in the grated mozzarella (the kaşar-style cheese of the dish) until melted and stretchy.",
      "Season the purée boldly — it must stand up to the rich stew.",
      "Serve the purée in a wide pool with the lamb stew spooned into the centre.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-menemen",
    name: { en: "Menemen (Turkish Eggs with Tomato and Peppers)", hindi: "मेनेमेन (टर्किश एग्स विथ टोमैटो एंड पेपर्स)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 300 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Soften the onion and green pepper in the olive oil over medium heat for 7-8 minutes until sweet and soft.",
      "Add the chopped tomatoes and salt and cook 8-10 minutes, crushing with a spoon, until thick and jammy with almost no free liquid.",
      "Whisk the eggs and whites loosely — menemen eggs are barely beaten.",
      "Pour the eggs into the tomato mixture and cook on low heat, stirring gently and folding, for 3-4 minutes until the eggs are softly set and creamy within the sauce.",
      "Take off the heat while still slightly loose; the eggs finish in the pan's warmth.",
      "Serve straight from the pan with bread for scooping.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-cilbir",
    name: { en: "Çılbır (Poached Eggs in Garlic Yogurt)", hindi: "चिलबिर (पोच्ड एग्स इन गार्लिक योगर्ट)" },
    category: "breakfast",
    servings: 1,
    lines: [
      { foodId: "usda-171287", grams: 150 }, // Egg, whole
      { foodId: "usda-330137", grams: 220 }, // Yogurt, Greek
      { foodId: "usda-173410", grams: 12 }, // Butter, salted
      { foodId: "usda-170932", grams: 1 }, // Spices, pepper
      { foodId: "usda-1104647", grams: 5 }, // Garlic, raw
      { foodId: "usda-173468", grams: 2 }, // Salt, table
    ],
    method: [
      "Stir the crushed garlic and a pinch of salt into the yogurt and spread it in a wide, shallow bowl; let it come to room temperature — ice-cold yogurt under hot eggs is a shock, not a pleasure.",
      "Bring a pan of water to the barest simmer with a splash of vinegar if you have it; swirl the water and slip in the eggs.",
      "Poach for 3 minutes until the whites are set and the yolks still runny; lift out with a slotted spoon and drain briefly on a cloth.",
      "Melt the butter until foaming, take off the heat and stir in the cayenne — it will bloom into a rust-red oil.",
      "Set the poached eggs on the yogurt and spoon the hot chilli butter over them so it pools in the yogurt.",
      "Serve at once with warm bread for the yolks.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-karides-guvec",
    name: { en: "Karides Güveç (Baked Shrimp with Tomato and Mozzarella)", hindi: "कारिदेस ग्युवेच (बेक्ड श्रिम्प विथ टोमैटो एंड मोज़ेरेला)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175179", grams: 550 }, // Crustaceans, shrimp
      { foodId: "usda-329370", grams: 100 }, // Cheese, mozzarella
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 220°C — a güveç goes into a fierce oven and comes out bubbling.",
      "Soften the onion and pepper in the olive oil for 6 minutes; add the garlic and chopped tomatoes and cook 8 minutes into a sauce.",
      "Season the sauce well and tip into a wide oven dish (or four small güveç dishes).",
      "Press the shrimp down into the hot sauce in a single layer.",
      "Scatter the mozzarella over and bake for 8-10 minutes until the shrimp are pink and the cheese is melted and bronzed in spots.",
      "Serve bubbling, straight from the dish, with bread for the sauce.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-tavuk-guvec",
    name: { en: "Tavuk Güveç (Chicken and Vegetable Casserole)", hindi: "तावुक ग्युवेच (चिकन एंड वेजिटेबल कैसरोल)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // Chicken, thigh
      { foodId: "usda-2346401", grams: 300 }, // Potatoes, russet
      { foodId: "usda-2685577", grams: 200 }, // Eggplant, raw
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Brown the chicken pieces in the olive oil in an ovenproof pot for 4-5 minutes per side; set aside.",
      "In the same pot, colour the potato and eggplant chunks for 5-6 minutes, adding the pepper and onion for the last 3 minutes.",
      "Add the garlic and chopped tomatoes with 150 ml water; season and bring to a simmer.",
      "Nestle the chicken back among the vegetables, cover and transfer to the oven for 30 minutes.",
      "Uncover for the last 10 minutes so the top browns and the sauce thickens.",
      "Rest 5 minutes and serve straight from the pot.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-nohut-yemegi",
    name: { en: "Nohut Yemeği (Turkish Chickpea Stew)", hindi: "नोहुत येमेगी (टर्किश चिकपी स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-170457", grams: 250 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until completely tender; reserve a cup of the liquid.",
      "Soften the onion in the olive oil for 7 minutes until golden; add the garlic and cumin for the last minute.",
      "Add the chopped tomato and cook 8 minutes into a sauce.",
      "Stir in the chickpeas with enough of their liquid to make a stew; simmer 15 minutes so the flavours marry.",
      "Mash a few chickpeas against the side of the pot and stir them back in — the traditional way to give the stew body.",
      "Season, rest 5 minutes, and serve with rice or bread and lemon at the table.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-kuru-fasulye",
    name: { en: "Kuru Fasulye (Turkish White Bean Stew)", hindi: "कुरु फासुल्ये (टर्किश व्हाइट बीन स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-173745", grams: 480 }, // Beans, navy
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170427", grams: 100 }, // Peppers, sweet
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight; drain, cover with fresh water, boil 10 minutes and drain again — the Turkish way for a clean, creamy broth.",
      "Return the beans to the pot with fresh water and simmer gently for 45 minutes until nearly tender.",
      "Soften the onion and pepper in the olive oil for 7 minutes; add the garlic and tomato and cook 8 minutes into a sauce.",
      "Stir the sauce into the beans and simmer 20-25 minutes more until the beans are completely soft and the stew has body.",
      "Season at the end and rest 10 minutes off the heat.",
      "Serve with rice — in Turkey kuru fasulye and pilav are inseparable.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-balik-bugulama",
    name: { en: "Balık Buğulama (Steamed Mackerel with Vegetables)", hindi: "बालिक बुगुलामा (स्टीम्ड मैकरल विथ वेजिटेबल्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175119", grams: 600 }, // Fish, mackerel
      { foodId: "usda-2346401", grams: 300 }, // Potatoes, russet
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Layer the sliced potatoes and onions in a wide, lidded pan with half the olive oil and a pinch of salt; add 100 ml water, cover and steam for 12 minutes until the potatoes are nearly tender.",
      "Lay the tomato slices over the vegetables.",
      "Season the mackerel fillets and lay them on top, skin-side up; drizzle with the remaining oil and the lemon juice.",
      "Cover and steam gently for 10-12 minutes until the fish is opaque and flakes easily — buğulama means 'steamed', and the fish must never boil.",
      "Rest, covered, for 3 minutes so the juices settle into the vegetables.",
      "Serve straight from the pan with lemon wedges.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-sardalya-tava",
    name: { en: "Sardalya Tava (Crispy Pan-Fried Sardines)", hindi: "सार्दाल्या तावा (क्रिस्पी पैन-फ्राइड सार्डिन्स)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-175139", grams: 300 }, // Fish, sardine
      { foodId: "usda-168867", grams: 40 }, // Cornmeal, degermed
      { foodId: "usda-171025", grams: 20 }, // Oil, sunflower
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Drain the sardines and pat completely dry — moisture is the enemy of a crisp tava.",
      "Season the cornmeal with the salt and coat each sardine lightly, shaking off the excess.",
      "Heat the oil in a wide pan until shimmering and lay the sardines in a circle, tails to the centre, in a single layer.",
      "Fry undisturbed for 3-4 minutes until the underside is crisp and golden.",
      "Slide a plate over the pan, invert the whole circle in one confident motion, and slide it back to crisp the other side for 2-3 minutes.",
      "Serve immediately with lemon wedges, while the crust still crackles.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-yogurtlu-tavuk",
    name: { en: "Yoğurtlu Tavuk (Chicken in Yogurt Sauce)", hindi: "योगुर्तलू तावुक (चिकन इन योगर्ट सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // Chicken, breast
      { foodId: "usda-330137", grams: 250 }, // Yogurt, Greek
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173475", grams: 5 }, // Spearmint, fresh
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Season the chicken and sear in the olive oil in a wide pot for 4-5 minutes per side until golden; set aside.",
      "Soften the onion in the same pot for 6 minutes; add the garlic for the last minute, then 150 ml water, scraping up the browned bits.",
      "Return the chicken, cover and simmer gently for 15 minutes until cooked through; lift the chicken out and keep warm.",
      "Take the pot off the heat and whisk the yogurt into the cooking juices a spoonful at a time — off the boil, yogurt stays silky; boiled, it splits.",
      "Warm the sauce through for 2 minutes without boiling, season, and stir in the mint.",
      "Serve the chicken with the warm yogurt sauce poured over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-etli-nohut",
    name: { en: "Etli Nohut (Lamb and Chickpea Stew)", hindi: "एतली नोहुत (लैम्ब एंड चिकपी स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 450 }, // Lamb, ground
      { foodId: "usda-2644282", grams: 300 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-170457", grams: 250 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain and set aside.",
      "Brown the lamb in the olive oil in a heavy pot for 8 minutes until well coloured; set aside.",
      "Soften the onion in the same pot for 7 minutes; add the garlic and cumin for the last minute.",
      "Return the lamb with the chickpeas, chopped tomato and enough water to cover by 2 cm.",
      "Simmer gently, covered, for 60-70 minutes until the lamb is tender and the chickpeas completely soft.",
      "Season, rest 10 minutes, and serve with rice or bread.",
    ],
    timeMinutes: 90,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-mantarli-yumurta",
    name: { en: "Mantarlı Yumurta (Eggs with Mushrooms)", hindi: "मांतारली युमुर्ता (एग्स विथ मशरूम्स)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 250 }, // Egg, whole
      { foodId: "usda-172183", grams: 100 }, // Egg, white
      { foodId: "usda-1750347", grams: 200 }, // Mushrooms, white button
      { foodId: "usda-329370", grams: 40 }, // Cheese, mozzarella
      { foodId: "usda-173410", grams: 12 }, // Butter, salted
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Cook the sliced mushrooms in the butter over high heat for 5-6 minutes until they release their liquid and turn golden; season well.",
      "Lower the heat. Whisk the eggs and whites with the salt and pour over the mushrooms.",
      "Stir gently with a spatula, folding the setting eggs through the mushrooms, for 3 minutes until softly set.",
      "Scatter the mozzarella over the top, cover for 1 minute to melt.",
      "Take off the heat while the eggs are still glossy and slightly loose.",
      "Serve immediately with warm bread.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-hummus-meal",
    name: { en: "Hummus (Chickpea and Sesame Purée, Meal Portion)", hindi: "हुम्मुस (चिकपी एंड सेसमे प्यूरी, मील पोर्शन)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-2644282", grams: 280 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-170150", grams: 50 }, // Seeds, sesame seeds
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight with a pinch of the salt; drain, cover with fresh water and simmer 50-60 minutes until they collapse when squeezed — overcooked is correct for hummus.",
      "Toast the sesame seeds in a dry pan for 2-3 minutes until golden and fragrant, then grind to a thick paste (the tahini of the dish) with a splash of chickpea liquid.",
      "Blend the hot chickpeas with the sesame paste, garlic, cumin, salt and lemon juice, adding chickpea liquid a little at a time.",
      "Keep blending for a full 3-4 minutes — the long blend is the difference between grainy and silken hummus.",
      "Taste and adjust: it should be bright with lemon and rich with sesame; the flavour dulls as it chills, so season a touch boldly.",
      "Spoon into a wide bowl, swirl the top with the back of a spoon, and fill the swirl with the olive oil. Serve with warm flatbread.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-falafel-baked",
    name: { en: "Falafel (Baked Chickpea Patties)", hindi: "फलाफेल (बेक्ड चिकपी पैटीज़)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-2644282", grams: 280 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-790646", grams: 80 }, // Onions, yellow
      { foodId: "usda-169997", grams: 30 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-174288", grams: 30 }, // Chickpea flour (besan)
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-170150", grams: 15 }, // Seeds, sesame seeds
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas for 24 hours (falafel is made from soaked, never cooked, chickpeas — cooked ones make mush); drain and pat dry.",
      "Blitz the chickpeas with the onion, coriander leaves, cumin and salt to a coarse, sandy crumb that holds when squeezed — stop before it becomes a paste.",
      "Stir in the besan and sesame seeds; rest the mixture for 30 minutes so it firms.",
      "Heat the oven to 210°C and oil a baking tray generously with the olive oil.",
      "Shape the mixture into 12 small patties with wet hands and lay them on the hot oiled tray; brush the tops with more oil.",
      "Bake for 12 minutes, turn carefully, and bake 10-12 minutes more until deep golden and crisp outside with a soft, green-flecked centre. Serve hot with yogurt or tahini-style sesame sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-shish-tawook",
    name: { en: "Shish Tawook with Garlic Sauce (Toum)", hindi: "शीश तावूक विथ गार्लिक सॉस (तूम)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // Chicken, breast
      { foodId: "usda-330137", grams: 150 }, // Yogurt, Greek
      { foodId: "usda-172183", grams: 60 }, // Egg, white
      { foodId: "usda-1104647", grams: 20 }, // Garlic, raw
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 40 }, // Oil, olive
      { foodId: "usda-170457", grams: 150 }, // Tomatoes, red
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Cut the chicken into 3 cm cubes. Mix the yogurt with the lemon juice, half the garlic, salt and pepper; coat the chicken and chill at least 2 hours.",
      "For the toum: blend the egg whites with the remaining garlic and a pinch of salt, then drizzle in the olive oil in the thinnest stream, as for mayonnaise, until it stands in soft, snowy peaks.",
      "Thread the chicken onto skewers with chunks of tomato between the pieces.",
      "Grill on a very hot grill for 11-13 minutes, turning every few minutes, until charred at the edges and cooked through.",
      "Rest the skewers for 5 minutes.",
      "Serve with the toum in a separate bowl — it is fiercely garlicky and meant to be taken a little at a time.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-shawarma-plate",
    name: { en: "Chicken Shawarma Plate with Flatbread", hindi: "चिकन शावर्मा प्लेट विथ फ्लैटब्रेड" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // Chicken, thigh
      { foodId: "usda-330137", grams: 200 }, // Yogurt, Greek
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-2346406", grams: 200 }, // Cucumber, with peel
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-168936", grams: 120 }, // Wheat flour, white
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-170922", grams: 3 }, // Spices, coriander seed
      { foodId: "usda-172231", grams: 2 }, // Spices, turmeric
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Mix the flour with a pinch of salt and about 70 ml warm water into a soft dough; knead 5 minutes, rest 20 minutes, roll into 4 thin rounds and cook in a dry hot pan 1-2 minutes per side until puffed and spotted.",
      "Slice the chicken thinly and toss with the cumin, ground coriander, turmeric, salt and pepper — shawarma seasoning should be bold.",
      "Sear the chicken in the olive oil in a wide pan in two batches for 6-8 minutes each until crisp and caramelised at the edges and cooked through.",
      "Stir the yogurt with a pinch of salt and a squeeze of lemon if you have it, for the sauce.",
      "Slice the tomato, onion and cucumber into a salad and season lightly.",
      "Serve the chicken over the warm flatbreads with the salad and yogurt sauce.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-kofta-bi-tahini",
    name: { en: "Kofta bi Tahini (Lamb Kofta Baked with Sesame Sauce and Potato)", hindi: "कोफ्ता बी तहीनी (लैम्ब कोफ्ता बेक्ड विथ सेसमे सॉस एंड पोटैटो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 600 }, // Lamb, ground
      { foodId: "usda-170150", grams: 60 }, // Seeds, sesame seeds
      { foodId: "usda-2346401", grams: 300 }, // Potatoes, russet
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-169997", grams: 15 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Mix the lamb with half the finely grated onion, chopped coriander leaves, salt and pepper; knead 2 minutes until sticky, then shape into 12 ovals.",
      "Brown the kofta in the olive oil for 5-6 minutes, turning, until coloured all over; set aside.",
      "Heat the oven to 200°C. Slice the potatoes and remaining onion and layer in a baking dish with a pinch of salt.",
      "Whisk the ground sesame (grind the seeds to a paste first) with the lemon juice, salt and about 250 ml water into a pourable tahini sauce — it will look thin and split; that is correct, it sets in the oven.",
      "Lay the kofta over the potatoes, pour the sesame sauce over everything, and bake for 25-30 minutes until the potatoes are tender and the sauce has thickened and bronzed.",
      "Rest 5 minutes and serve straight from the dish with lemon.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-fatteh-hummus",
    name: { en: "Fatteh Hummus (Chickpeas with Yogurt and Crisp Flatbread)", hindi: "फत्तेह हुम्मुस (चिकपीज़ विथ योगर्ट एंड क्रिस्प फ्लैटब्रेड)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-2644282", grams: 240 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-330137", grams: 300 }, // Yogurt, Greek
      { foodId: "usda-168936", grams: 60 }, // Wheat flour, white
      { foodId: "usda-171413", grams: 15 }, // Oil, olive
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-2346393", grams: 15 }, // Nuts, almonds
      { foodId: "usda-1104647", grams: 5 }, // Garlic, raw
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until completely tender; keep them hot in their liquid with the cumin and salt.",
      "Mix the flour with a pinch of salt and about 35 ml warm water into a dough; roll into 2 very thin rounds and cook in a dry hot pan until crisp and spotted; break into rough shards.",
      "Warm the yogurt gently with the crushed garlic — it should be warm, never boiled, or it will split.",
      "Toast the slivered almonds in the olive oil until golden and watch them closely; they burn in seconds.",
      "Layer in warm bowls: flatbread shards first, then the hot chickpeas with a little of their liquid to soften the bread, then the warm yogurt.",
      "Finish with the almonds and their oil and serve immediately, before the bread loses its crisp edges.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-mujadara",
    name: { en: "Mujadara (Lentils and Rice with Crispy Onions)", hindi: "मुजद्दरा (लेंटिल्स एंड राइस विथ क्रिस्पी अनियन्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644283", grams: 440 }, // Lentils, dry
      { foodId: "usda-2512380", grams: 200 }, // Rice, brown
      { foodId: "usda-790646", grams: 300 }, // Onions, yellow
      { foodId: "usda-171413", grams: 40 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Simmer the rinsed lentils in plenty of water for 15 minutes until half-tender; drain, reserving the cooking liquid — it is dark and flavourful and cooks the rice.",
      "Meanwhile slice the onions thinly and cook in the olive oil over medium heat for 20-25 minutes, stirring often, until deep mahogany and crisp at the edges; drain on paper and salt lightly.",
      "Measure the lentil liquid and make it up to about 600 ml; bring to the boil with the rinsed rice, lentils, cumin and salt.",
      "Cover and cook on the lowest heat for 18 minutes without lifting the lid.",
      "Rest, covered, for 10 minutes, then fluff with a fork — the grains and lentils should be separate and tender.",
      "Serve piled high with the crispy onions scattered generously over the top.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-sayadieh",
    name: { en: "Sayadieh (Spiced Fish with Rice and Almonds)", hindi: "सयादियेह (स्पाइस्ड फिश विथ राइस एंड आलमंड्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // Fish, cod
      { foodId: "usda-2512381", grams: 280 }, // Rice, white
      { foodId: "usda-790646", grams: 250 }, // Onions, yellow
      { foodId: "usda-2346393", grams: 30 }, // Nuts, almonds
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-172231", grams: 2 }, // Spices, turmeric
      { foodId: "usda-170922", grams: 2 }, // Spices, coriander seed
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soften the sliced onions in the olive oil for 15-20 minutes until deep golden — they colour and flavour the rice, so take them dark.",
      "Stir in the cumin, ground coriander and turmeric for 1 minute; add the rinsed rice and stir until glossed.",
      "Pour in 550 ml hot water and the salt, cover and cook on the lowest heat for 15 minutes; rest 10 minutes off the heat.",
      "Meanwhile season the cod and sear in a separate pan with a film of oil for 4-5 minutes per side until golden and flaking (or bake at 200°C for 12-15 minutes).",
      "Toast the slivered almonds in a dry pan until golden.",
      "Serve the spiced rice in a wide dish, lay the fish over it, and scatter the almonds on top.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-samkeh-harra",
    name: { en: "Samkeh Harra (Spicy Baked Fish with Sesame-Walnut Sauce)", hindi: "समकेह हर्रा (स्पाइसी बेक्ड फिश विथ सेसमे-वॉलनट सॉस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // Fish, tilapia
      { foodId: "usda-170150", grams: 50 }, // Seeds, sesame seeds
      { foodId: "usda-2346394", grams: 40 }, // Nuts, walnuts
      { foodId: "usda-169997", grams: 30 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-170106", grams: 10 }, // Peppers, hot chili
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Toast the sesame seeds in a dry pan until golden and grind to a paste; pound or finely chop the walnuts.",
      "Stir the sesame paste, walnuts, chopped coriander leaves, garlic, chilli, lemon juice and salt with 100 ml water into a loose, fiery sauce.",
      "Season the tilapia fillets and lay in an oiled baking dish.",
      "Spoon the sauce generously over each fillet and drizzle with the olive oil.",
      "Bake for 15-18 minutes until the fish flakes easily and the sauce has set into a crust at the edges.",
      "Rest 3 minutes and serve with lemon wedges and rice or bread.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-maghmour",
    name: { en: "Maghmour (Eggplant and Chickpea Stew)", hindi: "मग़मूर (एगप्लांट एंड चिकपी स्टू)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644282", grams: 460 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-2685577", grams: 500 }, // Eggplant, raw
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-1104647", grams: 12 }, // Garlic, raw
      { foodId: "usda-173475", grams: 5 }, // Spearmint, fresh
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until tender; reserve a cup of the liquid.",
      "Cube the eggplant and cook in half the olive oil for 10-12 minutes until golden and soft; set aside.",
      "Soften the onion in the remaining oil for 7 minutes; add the garlic and chopped tomatoes and cook 12 minutes into a thick sauce.",
      "Add the chickpeas with a splash of their liquid and simmer 10 minutes.",
      "Fold the eggplant back in with the mint and simmer gently for 8-10 minutes until the stew is rich and the eggplant silky — stir gently so it does not break up completely.",
      "Rest 5 minutes; maghmour is served warm or at room temperature, with bread.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-dajaj-mashwi",
    name: { en: "Dajaj Mashwi (Grilled Chicken with Garlic Sauce and Potato)", hindi: "दजाज मशवी (ग्रिल्ड चिकन विथ गार्लिक सॉस एंड पोटैटो)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // Chicken, breast
      { foodId: "usda-172183", grams: 50 }, // Egg, white
      { foodId: "usda-1104647", grams: 15 }, // Garlic, raw
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-171413", grams: 35 }, // Oil, olive
      { foodId: "usda-2346401", grams: 300 }, // Potatoes, russet
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "For the toum: blend the egg whites with the crushed garlic and a pinch of salt, then drizzle in 25 ml of the olive oil in the thinnest stream until it stands in soft peaks; chill.",
      "Cut the potatoes into chunky wedges, toss with the remaining oil and salt, and roast at 210°C for 30-35 minutes until crisp and golden, turning once.",
      "Season the chicken breasts boldly and grill on a very hot grill or griddle for 6-7 minutes per side until charred at the edges and cooked through.",
      "Squeeze the lemon over the chicken as it comes off the grill.",
      "Rest the chicken for 5 minutes, then slice thickly.",
      "Serve the chicken over the potato wedges with the toum spooned alongside.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-foul-style-beans",
    name: { en: "Levantine Spiced Beans with Egg (Foul-Style)", hindi: "लेवांताइन स्पाइस्ड बीन्स विथ एग (फूल-स्टाइल)" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-175193", grams: 260 }, // Beans, kidney
      { foodId: "usda-171287", grams: 100 }, // Egg, whole
      { foodId: "usda-170457", grams: 150 }, // Tomatoes, red
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Soak the beans overnight; drain, cover with fresh water and simmer 40-50 minutes until completely tender and beginning to collapse.",
      "Boil the eggs for 8 minutes; cool, peel and halve.",
      "Crush a ladleful of the beans in the pot to thicken the liquid into a sauce.",
      "Stir in the chopped tomato, garlic, cumin and salt and simmer 8 minutes until the tomato melts in.",
      "Take off the heat and stir in the lemon juice and olive oil — foul is finished with raw oil and lemon, and it should taste bright.",
      "Serve in shallow bowls with the halved eggs on top and warm flatbread alongside.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-qaridis-bi-thoom",
    name: { en: "Qaridis bi Thoom (Garlic-Lemon Shrimp)", hindi: "क़रीदिस बी थूम (गार्लिक-लेमन श्रिम्प)" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-175179", grams: 320 }, // Crustaceans, shrimp
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 15 }, // Garlic, raw
      { foodId: "usda-167746", grams: 50 }, // Lemons, raw
      { foodId: "usda-169997", grams: 15 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-170106", grams: 5 }, // Peppers, hot chili
      { foodId: "usda-173468", grams: 3 }, // Salt, table
    ],
    method: [
      "Pat the shrimp completely dry and season them — wet shrimp steam in the pan instead of searing.",
      "Sizzle the sliced garlic and chilli in the olive oil for 1 minute until the garlic is pale gold.",
      "Add the shrimp in a single layer and cook 2 minutes; turn and cook 1-2 minutes more until pink and just opaque.",
      "Take the pan off the heat and add the lemon juice — it will sizzle and form a bright sauce with the oil.",
      "Scatter the chopped coriander leaves over.",
      "Rest 1 minute and serve immediately with bread to catch the lemony garlic oil.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-shorbet-adas",
    name: { en: "Shorbet Adas (Levantine Lentil Soup with Rice)", hindi: "शोरबत अदस (लेवांताइन लेंटिल सूप विथ राइस)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174284", grams: 420 }, // Lentils, pink or red
      { foodId: "usda-2512381", grams: 60 }, // Rice, white
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-167746", grams: 40 }, // Lemons, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soften the chopped onion in the olive oil for 6-7 minutes without browning.",
      "Add the rinsed red lentils, rice and about 1.4 litres of water; simmer 25 minutes until the lentils have fallen apart and the rice is tender.",
      "Stir in the cumin and salt and simmer 3 minutes.",
      "Blend roughly — shorbet adas is smooth but not baby food; a few pulses leave it with body.",
      "Rest 5 minutes; the soup thickens as it stands, so loosen with water if needed.",
      "Serve with the lemon squeezed over each bowl and a thread of olive oil if you like.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-samak-bi-tahini",
    name: { en: "Samak bi Tahini (Baked Cod with Sesame Sauce and Onions)", hindi: "समक बी तहीनी (बेक्ड कॉड विथ सेसमे सॉस एंड अनियन्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 650 }, // Fish, cod
      { foodId: "usda-170150", grams: 60 }, // Seeds, sesame seeds
      { foodId: "usda-790646", grams: 250 }, // Onions, yellow
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-169997", grams: 20 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Heat the oven to 200°C. Soften the sliced onions in the olive oil for 12-15 minutes until sweet and golden; spread in a baking dish.",
      "Grind the sesame seeds to a paste and whisk with the lemon juice, salt and about 200 ml water into a pourable sauce — it will look thin; it thickens in the oven.",
      "Season the cod fillets and lay them over the onions.",
      "Pour the sesame sauce over the fish to coat it completely.",
      "Bake for 18-20 minutes until the fish flakes and the sauce has set into a pale, bronzed blanket.",
      "Scatter the coriander leaves over, rest 3 minutes, and serve with lemon.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-fatteh-batenjan",
    name: { en: "Fatteh Batenjan (Eggplant and Lamb Fatteh with Yogurt)", hindi: "फत्तेह बातिंजान (एगप्लांट एंड लैम्ब फत्तेह विथ योगर्ट)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 400 }, // Lamb, ground
      { foodId: "usda-330137", grams: 250 }, // Yogurt, Greek
      { foodId: "usda-2685577", grams: 400 }, // Eggplant, raw
      { foodId: "usda-168936", grams: 60 }, // Wheat flour, white
      { foodId: "usda-170150", grams: 30 }, // Seeds, sesame seeds
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-1104647", grams: 6 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Mix the flour with a pinch of salt and about 35 ml warm water into a dough; roll into 2 thin rounds and cook in a dry hot pan until crisp; break into shards.",
      "Cube the eggplant and cook in half the olive oil for 10-12 minutes until golden and soft; set aside.",
      "Brown the lamb in the remaining oil for 8 minutes; add the chopped tomato and salt and simmer 10 minutes into a rich sauce.",
      "Warm the yogurt gently with the crushed garlic — warm, never boiled.",
      "Toast the sesame seeds in a dry pan until golden.",
      "Layer in a wide dish: flatbread shards, eggplant, the lamb sauce, then the warm yogurt; scatter the sesame seeds over and serve at once.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-tagine-lemon-onion",
    name: { en: "Moroccan Chicken Tagine with Lemon and Onions", hindi: "मोरक्कन चिकन तागीन विथ लेमन एंड अनियन्स" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // Chicken, thigh
      { foodId: "usda-790646", grams: 300 }, // Onions, yellow
      { foodId: "usda-167746", grams: 80 }, // Lemons, raw
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-169231", grams: 10 }, // Ginger root, raw
      { foodId: "usda-172231", grams: 3 }, // Spices, turmeric
      { foodId: "usda-169997", grams: 15 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Rub the chicken with the turmeric, ginger, salt and pepper and leave for 20 minutes while you slice the onions.",
      "Lay half the onions in a heavy pot (or tagine), set the chicken over them and cover with the remaining onions.",
      "Add the olive oil, the lemon juice and 200 ml water; bring to a gentle simmer.",
      "Cover and cook on the lowest heat for 40-45 minutes, turning the chicken once, until the meat is tender and the onions have melted into a sauce.",
      "Uncover for the last 10 minutes to reduce the sauce until it is thick and glossy.",
      "Scatter the coriander leaves over, rest 5 minutes, and serve with bread to catch the sauce — a tagine is eaten from the dish it cooked in.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-lamb-tagine-chickpea",
    name: { en: "Moroccan Lamb and Chickpea Tagine", hindi: "मोरक्कन लैम्ब एंड चिकपी तागीन" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 500 }, // Lamb, ground
      { foodId: "usda-2644282", grams: 300 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-171320", grams: 2 }, // Spices, cinnamon
      { foodId: "usda-169231", grams: 8 }, // Ginger root, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain and set aside.",
      "Brown the lamb in the olive oil in a heavy pot for 8-10 minutes until well coloured.",
      "Add the sliced onion and cook 6 minutes; add the ginger, cinnamon, chopped tomato and salt.",
      "Add the chickpeas and enough water to cover; bring to a simmer.",
      "Cover and cook on the lowest heat for 60-70 minutes, topping up with water if needed, until the lamb is tender and the chickpeas soft.",
      "Uncover for the last 10 minutes to reduce the sauce until it coats the lamb; rest 5 minutes and serve.",
    ],
    timeMinutes: 95,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-kefta-mkaouara",
    name: { en: "Kefta Mkaouara (Lamb Meatballs in Tomato Sauce with Eggs)", hindi: "केफ्ता मकावारा (लैम्ब मीटबॉल्स इन टोमैटो सॉस विथ एग्स)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 550 }, // Lamb, ground
      { foodId: "usda-171287", grams: 150 }, // Egg, whole
      { foodId: "usda-170457", grams: 500 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-171319", grams: 2 }, // Spices, chili powder
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Mix the lamb with half the grated onion, cumin, chilli powder, salt and pepper; roll into about 20 small balls and chill for 20 minutes.",
      "Soften the remaining onion in the olive oil in a wide tagine or pan for 7 minutes; add the garlic for the last minute.",
      "Add the chopped tomatoes and salt and simmer 15 minutes into a thick sauce.",
      "Lay the kefta into the sauce, cover and simmer gently for 15 minutes, turning once, until cooked through.",
      "Make wells in the sauce and crack the eggs into them; spoon a little sauce over the whites.",
      "Cover and cook 5-7 minutes until the whites are set and the yolks still runny; serve straight from the tagine with bread.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-harira",
    name: { en: "Harira (Moroccan Lamb, Lentil and Chickpea Soup)", hindi: "हरीरा (मोरक्कन लैम्ब, लेंटिल एंड चिकपी सूप)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 350 }, // Lamb, ground
      { foodId: "usda-2644283", grams: 200 }, // Lentils, dry
      { foodId: "usda-2644282", grams: 200 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-168936", grams: 20 }, // Wheat flour, white
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-169997", grams: 20 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-169231", grams: 5 }, // Ginger root, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain and set aside.",
      "Brown the lamb in the olive oil in a heavy pot for 6-8 minutes; add the onion and cook 5 minutes more.",
      "Add the chopped tomatoes, ginger, cumin and about 1.4 litres of water; simmer 20 minutes.",
      "Add the chickpeas and lentils and simmer 35-40 minutes until both are completely tender.",
      "Whisk the flour with a ladle of the soup into a slurry (the tedouira) and stir it back in; simmer 5 minutes, stirring, until the soup turns silky and lightly thickened.",
      "Season, stir in the coriander leaves, rest 5 minutes and serve with lemon and dates if you have them — the traditional harira pairing.",
    ],
    timeMinutes: 80,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-fish-tagine-chermoula",
    name: { en: "Fish Tagine with Chermoula (Mackerel)", hindi: "फिश तागीन विथ शर्मूला (मैकरल)" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175119", grams: 600 }, // Fish, mackerel
      { foodId: "usda-169997", grams: 40 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-1104647", grams: 15 }, // Garlic, raw
      { foodId: "usda-167746", grams: 60 }, // Lemons, raw
      { foodId: "usda-171413", grams: 30 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-170457", grams: 200 }, // Tomatoes, red
      { foodId: "usda-2346401", grams: 300 }, // Potatoes, russet
      { foodId: "usda-171319", grams: 2 }, // Spices, chili powder
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Make the chermoula: pound or blend the coriander leaves, garlic, cumin, chilli powder, lemon juice, salt and half the olive oil into a coarse, vivid paste.",
      "Coat the mackerel fillets in half the chermoula and leave for 20 minutes (no longer — the lemon starts to 'cook' the fish).",
      "Layer the sliced potatoes and tomatoes in a tagine or heavy pot with the remaining oil and a splash of water; season.",
      "Cover and cook on low heat for 15 minutes until the potatoes are nearly tender.",
      "Lay the fish over the vegetables, spoon the remaining chermoula on top, cover and cook gently for 12-15 minutes until the fish flakes.",
      "Rest 5 minutes and serve straight from the tagine.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-shrimp-tagine-moroccan",
    name: { en: "Moroccan Shrimp Tagine", hindi: "मोरक्कन श्रिम्प तागीन" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175179", grams: 550 }, // Crustaceans, shrimp
      { foodId: "usda-170457", grams: 400 }, // Tomatoes, red
      { foodId: "usda-170427", grams: 150 }, // Peppers, sweet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-1104647", grams: 10 }, // Garlic, raw
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-171319", grams: 2 }, // Spices, chili powder
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Soften the onion and pepper in the olive oil in a tagine or wide pan for 7-8 minutes.",
      "Add the garlic, cumin and chilli powder for 1 minute until fragrant.",
      "Add the chopped tomatoes and salt and simmer 12 minutes into a thick sauce.",
      "Lay the shrimp into the sauce in a single layer; cover and cook 3-4 minutes, turning once, until pink and just opaque.",
      "Rest 2 minutes off the heat — the shrimp finish in the sauce's warmth.",
      "Serve straight from the tagine with bread and lemon.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-rfissa-style",
    name: { en: "Rfissa-Style Chicken with Lentils and Fenugreek", hindi: "रफ़ीसा-स्टाइल चिकन विथ लेंटिल्स एंड फेनुग्रीक" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // Chicken, thigh
      { foodId: "usda-2644283", grams: 300 }, // Lentils, dry
      { foodId: "usda-171324", grams: 8 }, // Spices, fenugreek seed
      { foodId: "usda-790646", grams: 250 }, // Onions, yellow
      { foodId: "usda-168936", grams: 150 }, // Wheat flour, white
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-172231", grams: 3 }, // Spices, turmeric
      { foodId: "usda-169231", grams: 8 }, // Ginger root, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the fenugreek seeds overnight (this tames their bitterness); drain.",
      "Mix the flour with a pinch of salt and about 85 ml warm water into a dough; knead 5 minutes, rest 30 minutes, then roll into 3 large thin rounds and cook in a dry pan 2 minutes per side until supple and spotted — these are the msemen-style breads the stew is served over.",
      "Brown the chicken in the olive oil for 5 minutes per side; add the sliced onions and cook 8 minutes until golden.",
      "Add the lentils, fenugreek, turmeric, ginger, salt and about 800 ml water; simmer gently for 40-45 minutes until the chicken is tender and the lentils have thickened the broth.",
      "Tear the warm breads into pieces and lay them in a wide serving dish.",
      "Ladle the chicken, lentils and plenty of the broth over the bread so it soaks and softens; rest 5 minutes and serve family-style.",
    ],
    timeMinutes: 80,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chickpea-tagine-spinach",
    name: { en: "Moroccan Chickpea and Spinach Tagine", hindi: "मोरक्कन चिकपी एंड स्पिनच तागीन" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2644282", grams: 480 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-168462", grams: 250 }, // Spinach, raw
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-171319", grams: 2 }, // Spices, chili powder
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until completely tender; reserve a cup of the liquid.",
      "Soften the onion in the olive oil for 7 minutes; add the garlic, cumin and chilli powder for the last minute.",
      "Add the chopped tomatoes and cook 10 minutes into a sauce.",
      "Stir in the chickpeas with a splash of their liquid and simmer 10 minutes.",
      "Fold in the spinach a handful at a time and cook 3-4 minutes until just wilted and still bright.",
      "Season, rest 3 minutes, and serve with bread or couscous-style quinoa if you have it.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-sardine-kefta",
    name: { en: "Moroccan Sardine Kefta with Rice", hindi: "मोरक्कन सार्डिन केफ्ता विथ राइस" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-175139", grams: 450 }, // Fish, sardine
      { foodId: "usda-2512381", grams: 120 }, // Rice, white
      { foodId: "usda-171287", grams: 50 }, // Egg, whole
      { foodId: "usda-169997", grams: 25 }, // Coriander (cilantro) leaves, raw
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-170923", grams: 3 }, // Spices, cumin seed
      { foodId: "usda-168936", grams: 20 }, // Wheat flour, white
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Cook the rice until tender; drain and cool slightly. Drain the sardines and mash them with a fork, picking out any large bones.",
      "Mix the sardines with the rice, beaten egg, grated onion, chopped coriander leaves, cumin, garlic, flour, salt and pepper into a firm mixture.",
      "Chill for 20 minutes, then shape into 12 small patties with wet hands.",
      "Fry in the olive oil for 4-5 minutes per side until crisp, deep golden and cooked through.",
      "Drain briefly on paper towel and rest 2 minutes.",
      "Serve hot with lemon wedges and a tomato salad.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-turkey-tagine-quinoa",
    name: { en: "Moroccan Turkey Tagine with Quinoa", hindi: "मोरक्कन टर्की तागीन विथ क्विनोआ" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-171098", grams: 550 }, // Turkey, whole
      { foodId: "usda-168874", grams: 200 }, // Quinoa, uncooked
      { foodId: "usda-2258586", grams: 200 }, // Carrots, mature
      { foodId: "usda-790646", grams: 200 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-171320", grams: 2 }, // Spices, cinnamon
      { foodId: "usda-169231", grams: 8 }, // Ginger root, raw
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Rub the turkey cubes with the cinnamon, ginger, salt and pepper.",
      "Brown the turkey in the olive oil in a tagine or heavy pot for 5-6 minutes until coloured; set aside.",
      "Soften the onion and carrot in the same pot for 7-8 minutes.",
      "Rinse the quinoa well and stir it into the vegetables with about 500 ml hot water.",
      "Return the turkey and its juices, cover and cook on the lowest heat for 25 minutes until the quinoa is tender and the turkey cooked through.",
      "Rest, covered, for 10 minutes, then fluff with a fork and serve straight from the pot.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chicken-almond-tagine",
    name: { en: "Moroccan Chicken Tagine with Almonds", hindi: "मोरक्कन चिकन तागीन विथ आलमंड्स" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // Chicken, thigh
      { foodId: "usda-2346393", grams: 60 }, // Nuts, almonds
      { foodId: "usda-790646", grams: 250 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-171320", grams: 2 }, // Spices, cinnamon
      { foodId: "usda-169231", grams: 8 }, // Ginger root, raw
      { foodId: "usda-169640", grams: 15 }, // Honey
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Toast the almonds in a dry pan for 3-4 minutes until golden; set aside.",
      "Brown the chicken in the olive oil for 5 minutes per side; set aside.",
      "Cook the sliced onions in the same pot over medium-low heat for 15-20 minutes, stirring often, until deep golden and sweet.",
      "Stir in the ginger, cinnamon and honey, then return the chicken with 200 ml water.",
      "Cover and braise on low heat for 25-30 minutes until the chicken is tender and the onion sauce is thick and glossy.",
      "Scatter the toasted almonds over, rest 5 minutes, and serve with bread or rice.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-chickpea-egg-tagine",
    name: { en: "Moroccan Chickpea and Egg Tagine", hindi: "मोरक्कन चिकपी एंड एग तागीन" },
    category: "breakfast",
    servings: 2,
    lines: [
      { foodId: "usda-2644282", grams: 240 }, // Chickpeas, (garbanzo beans
      { foodId: "usda-171287", grams: 200 }, // Egg, whole
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-790646", grams: 100 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-171319", grams: 2 }, // Spices, chili powder
      { foodId: "usda-173468", grams: 4 }, // Salt, table
    ],
    method: [
      "Soak the chickpeas overnight; drain, cover with fresh water and simmer 45-60 minutes until completely tender (or use chickpeas cooked ahead).",
      "Soften the onion in the olive oil in a tagine or wide pan for 7 minutes.",
      "Add the chopped tomatoes, cumin, chilli powder and salt and simmer 12 minutes into a thick sauce.",
      "Stir in the chickpeas and simmer 5 minutes so they heat through and take on the sauce.",
      "Make wells and crack the eggs into them; cover and cook on low heat for 6-8 minutes until the whites are set and the yolks still runny.",
      "Serve straight from the tagine with warm bread.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-white-fish-tagine",
    name: { en: "White Fish Tagine with Peppers and Tomato", hindi: "व्हाइट फिश तागीन विथ पेपर्स एंड टोमैटो" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-2684444", grams: 650 }, // Fish, cod
      { foodId: "usda-170108", grams: 200 }, // Peppers, sweet
      { foodId: "usda-170457", grams: 300 }, // Tomatoes, red
      { foodId: "usda-2346401", grams: 200 }, // Potatoes, russet
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 25 }, // Oil, olive
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-1104647", grams: 8 }, // Garlic, raw
      { foodId: "usda-173468", grams: 5 }, // Salt, table
    ],
    method: [
      "Layer the sliced potatoes and onions in a tagine or heavy pot with half the olive oil; add 100 ml water, cover and cook on low heat for 12 minutes until nearly tender.",
      "Lay the sliced peppers and tomatoes over the vegetables and season.",
      "Season the cod fillets and lay them on top; drizzle with the remaining oil and scatter the garlic and cumin over.",
      "Cover and cook gently for 12-15 minutes until the fish is opaque and flakes easily.",
      "Rest, covered, for 3 minutes so the juices settle.",
      "Serve straight from the tagine with lemon and bread.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
  {
    id: "dish-lamb-quinoa-pilaf",
    name: { en: "Moroccan Lamb and Quinoa Pilaf", hindi: "मोरक्कन लैम्ब एंड क्विनोआ पिलाफ" },
    category: "main",
    servings: 4,
    lines: [
      { foodId: "usda-174370", grams: 550 }, // Lamb, ground
      { foodId: "usda-168874", grams: 220 }, // Quinoa, uncooked
      { foodId: "usda-2258586", grams: 150 }, // Carrots, mature
      { foodId: "usda-790646", grams: 150 }, // Onions, yellow
      { foodId: "usda-171413", grams: 20 }, // Oil, olive
      { foodId: "usda-171320", grams: 2 }, // Spices, cinnamon
      { foodId: "usda-170923", grams: 2 }, // Spices, cumin seed
      { foodId: "usda-173468", grams: 6 }, // Salt, table
    ],
    method: [
      "Brown the lamb in the olive oil in a heavy pot for 8 minutes until well coloured; set aside.",
      "Soften the onion and carrot in the same pot for 7 minutes; stir in the cinnamon and cumin for the last minute.",
      "Rinse the quinoa well and add it to the pot with about 550 ml hot water and the salt.",
      "Return the lamb and its juices, cover and cook on the lowest heat for 20 minutes.",
      "Rest, covered and off the heat, for 10 minutes — the quinoa finishes steaming and drinks up the lamb juices.",
      "Fluff with a fork, check the lamb is tender, and serve straight from the pot.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    cuisine: "international",
  },
];
