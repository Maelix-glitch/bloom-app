/**
 * Wave X-4 — international high-protein dishes: Central & Eastern
 * Europe, the Nordics, Britain & Ireland, Central Asia & the
 * Caucasus, Africa, the Caribbean, and the Latin cuisines X-3 did
 * not reach (Argentina, Chile, Colombia, Venezuela).
 *
 * The owner's rule for outside-India dishes is a hard bar, not a
 * mood: EVERY dish here computes to at least 25 g of protein per
 * serving through `dishNutrients` — pinned by
 * dishLibraryIntl4.test.ts, which computes rather than asserts. A
 * dish that could not clear the bar honestly was dropped, not
 * padded.
 *
 * Honesty rules, same as the rest of the library: lines name only
 * the 142 USDA-verified reference foods; nutrition exists only as
 * `dishNutrients` computes it; no beef and no pork anywhere (a
 * deliberate programme omission — the ground meats here are turkey
 * and lamb). Where a classic ingredient is absent from the verified
 * set — sauerkraut, kielbasa, breadcrumbs, capers, feta, paprika,
 * olives, raisins, smoked fish, teff — the dish is either a classic
 * that is genuinely composed without it, an honestly named
 * "-Style" adaptation whose method states the substitution, or not
 * here at all. No method ever names an ingredient no line carries.
 *
 * Every dish carries cuisine: "international" and a Devanagari
 * transliteration of its name in name.hindi.
 */

import type { Dish } from "../dishes";

export const INTL4_DISHES: readonly Dish[] = [
  /* ------------------------------- Polish ------------------------------- */
  {
    id: "dish-pl-rosol",
    name: { en: "Polish Chicken Soup (Rosół)", hindi: "पोलिश चिकन सूप (रोसूल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169997", grams: 20 }, // coriander leaves, standing in for parsley
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cover the chicken breast with 2 litres of cold water and bring slowly to the barest simmer over 25 minutes — a rolling boil clouds a rosół, which should stay golden and clear.",
      "Skim the foam that rises in the first 10 minutes, then add the salt and black pepper and simmer gently for 30 minutes.",
      "Add the carrots in thick coins, the onion halved, and the potatoes in large chunks; simmer 20 minutes more, until the potato is tender at the point of a knife.",
      "Lift out the chicken, rest it 5 minutes, then slice it thickly across the grain — it should be just cooked through with no pink at the centre.",
      "Taste the broth and adjust the salt; a rosół is seasoned delicately, never aggressively.",
      "Return the chicken slices to the pot, scatter over the coriander leaves, and serve at once in deep bowls.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pl-kotlety-mielone",
    name: { en: "Polish Minced Turkey Cutlets (Kotlety Mielone)", hindi: "पोलिश टर्की कटलेट (कोतलेती)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-171287", grams: 100 }, // egg, binder
      { foodId: "usda-168936", grams: 40 }, // flour, for dusting
      { foodId: "usda-790646", grams: 150 }, // onion, grated
      { foodId: "usda-322892", grams: 60 }, // milk, to soften the mix
      { foodId: "usda-171025", grams: 40 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Mix the ground turkey with the grated onion, the beaten egg, the milk, salt and black pepper until just combined — overworking makes kotlety dense.",
      "Rest the mixture 15 minutes in the fridge so it firms up and shapes cleanly.",
      "With wet hands, form 8 oval cutlets about 2 cm thick and dust each lightly in the flour, shaking off the excess.",
      "Heat the sunflower oil in a wide pan over medium heat until it shimmers, then lay in the cutlets without crowding.",
      "Fry 5–6 minutes per side until deeply golden and the centre reaches piping hot with clear juices — cut one open to check there is no pink.",
      "Rest 3 minutes on a rack so the crust stays crisp, then serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pl-bigos-style",
    name: { en: "Polish Cabbage and Chicken Stew (Bigos-Style)", hindi: "पोलिश पत्तागोभी चिकन स्टू (बिगोस-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-2346407", grams: 800 }, // cabbage
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "A true bigos is built on sauerkraut and kielbasa, neither of which is in the verified set — this version uses fresh cabbage and chicken, and is named for the style, not the original.",
      "Brown the chicken thigh pieces in the sunflower oil over high heat for 6–8 minutes until well coloured; set aside.",
      "In the same pot, soften the onion for 5 minutes, then add the mushrooms and cook 4 minutes until their liquid evaporates.",
      "Add the shredded cabbage, tomatoes, bay leaf, salt and black pepper with a splash of water; cover and braise on low heat for 30 minutes, stirring twice.",
      "Return the chicken and any juices, cover and braise 25 minutes more, until the cabbage is silky and the chicken pulls apart at the touch of a spoon.",
      "Rest off the heat for 10 minutes — like the original, it tastes better reheated the next day.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pl-golabki",
    name: { en: "Polish Cabbage Rolls with Turkey and Rice (Gołąbki)", hindi: "पोलिश पत्तागोभी रोल (गोवोंबकी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 560 }, // ground turkey
      { foodId: "usda-2512381", grams: 240 }, // white rice, raw weight
      { foodId: "usda-2346407", grams: 600 }, // cabbage leaves
      { foodId: "usda-170457", grams: 400 }, // tomatoes, for the sauce
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, binder
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the rice in salted water for 10 minutes until half cooked, then drain — it finishes inside the rolls.",
      "Blanch the cabbage leaves in boiling water for 2–3 minutes until pliable, then drain and trim the thick central rib flat.",
      "Mix the ground turkey with the rice, grated onion, beaten egg and salt until evenly combined.",
      "Place a mound of filling on each leaf, fold in the sides and roll up firmly; pack the rolls seam-side down in a wide pot, snug against each other.",
      "Pour over the chopped tomatoes loosened with a little water, drizzle with the sunflower oil, cover and simmer on the lowest heat for 45 minutes.",
      "Rest 10 minutes before serving — the rolls should hold their shape when lifted and the filling should be steaming and fully set.",
    ],
    timeMinutes: 90,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pl-pierogi-ruskie-style",
    name: { en: "Pierogi with Cottage Cheese and Potato (Pierogi Ruskie-Style)", hindi: "पिएरोगी कॉटेज चीज़ आलू (रुस्की-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 360 }, // flour, for the dough
      { foodId: "usda-328841", grams: 600 }, // cottage cheese, standing in for twaróg
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-171287", grams: 50 }, // egg, for the dough
      { foodId: "usda-790646", grams: 150 }, // onion, fried for the top
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pierogi ruskie are filled with twaróg, a fresh curd cheese outside the verified set — cottage cheese, Bloom's sanctioned stand-in, fills them here and the name says so.",
      "Boil the potatoes until completely tender, drain well and mash dry; stir in the cottage cheese and salt and cool the filling fully.",
      "Knead the flour, egg and about 150 ml warm water into a smooth dough, 8 minutes by hand; rest it covered for 30 minutes.",
      "Roll the dough 2 mm thin, cut 8 cm rounds, place a teaspoon of filling on each, fold into half-moons and pinch the edges hard to seal.",
      "Boil in batches in salted water — they are done 2 minutes after they float to the surface, about 5 minutes in all.",
      "Meanwhile fry the onion in the butter until deep golden, 8 minutes; spoon it over the drained pierogi and serve at once.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-pl-zurek-style",
    name: { en: "Polish Sour Rye and Turkey Soup (Żurek-Style)", hindi: "पोलिश खट्टा राई सूप (ज़ुरेक-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 320 }, // turkey breast
      { foodId: "usda-168886", grams: 160 }, // rye flour, for the sour base
      { foodId: "usda-171287", grams: 300 }, // eggs, halved on top
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "The day before, whisk the rye flour with 400 ml warm water in a jar, cover with cloth and leave at room temperature 24 hours to sour — this ferment is the soul of żurek.",
      "Simmer the turkey breast in 1.5 litres of water with the bay leaf and onion for 25 minutes; lift out, slice, and keep the broth.",
      "Add the potato chunks to the broth and simmer 15 minutes until tender.",
      "Whisk the soured rye liquid smooth, stir it into the soup and simmer 5 minutes, stirring, until it thickens slightly and turns opaque.",
      "Crush the garlic into the soup with the salt, return the turkey slices and simmer 2 minutes more; the soup should taste distinctly, pleasantly sour.",
      "Serve with the boiled eggs halved on top, added just before eating so the yolks stay bright.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pl-krupnik",
    name: { en: "Polish Barley and Chicken Soup (Krupnik)", hindi: "पोलिश जौ चिकन सूप (क्रुपनिक)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 560 }, // chicken thigh
      { foodId: "usda-170284", grams: 240 }, // pearled barley
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rinse the barley, cover the chicken thigh with 1.8 litres of water and bring both to a gentle simmer; skim the first foam.",
      "Simmer 25 minutes, then lift out the chicken, pull the meat from the bones in coarse pieces and return the meat to the pot.",
      "Add the potatoes, carrots, onion and mushrooms with the salt and simmer 20 minutes more.",
      "The barley should be tender with a slight chew and the broth lightly thickened by its starch — if it stands too thick, loosen with a little hot water.",
      "Taste for salt and rest 5 minutes off the heat.",
      "Serve steaming, with the chicken pieces distributed through every bowl.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------- German ------------------------------- */
  {
    id: "dish-de-huhnerfrikassee",
    name: { en: "German Chicken Fricassee", hindi: "जर्मन चिकन फ्रिकासी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-322892", grams: 400 }, // milk, for the sauce
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-168936", grams: 40 }, // flour, to thicken
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-167746", grams: 30 }, // lemon, to sharpen
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken breast gently in salted water for 18 minutes until just cooked through; reserve 400 ml of the poaching liquid and slice the chicken thickly.",
      "Melt the butter, whisk in the flour and cook 1 minute without colouring, then whisk in the milk and reserved liquid a little at a time.",
      "Simmer the sauce 5 minutes, stirring, until it coats the back of a spoon.",
      "Add the mushrooms and cook 5 minutes, then the peas for 2 minutes, keeping them bright.",
      "Fold in the chicken slices and warm through for 3 minutes without boiling, so the meat stays tender.",
      "Sharpen with the lemon juice, adjust the salt, and serve the fricassee glossy and pale, as it should be.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-de-konigsberger-klopse-style",
    name: { en: "German Turkey Meatballs in Lemon Cream Sauce (Königsberger Klopse-Style)", hindi: "जर्मन टर्की मीटबॉल नींबू सॉस (कोनिग्सबर्गर-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-322892", grams: 300 }, // milk, for the sauce
      { foodId: "usda-171287", grams: 100 }, // egg, binder
      { foodId: "usda-168936", grams: 60 }, // flour, binder and sauce
      { foodId: "usda-167746", grams: 60 }, // lemon, standing in for capers
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-790646", grams: 100 }, // onion, grated
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "The classic sauce is sharpened with capers, which are not in the verified set — lemon does that work here, and the name says the dish is a style, not the original.",
      "Mix the ground turkey with the grated onion, beaten egg, half the flour and the salt; rest 15 minutes, then roll into 12 walnut-sized balls.",
      "Poach the balls in gently simmering salted water for 12 minutes — a bare simmer, so they stay round and tender; reserve the poaching liquid.",
      "Melt the butter, whisk in the remaining flour, cook 1 minute, then whisk in the milk and 300 ml of the poaching liquid.",
      "Simmer the sauce 5 minutes until it coats a spoon, then add the lemon juice a spoonful at a time, tasting — it should be bright, not sour.",
      "Return the meatballs to the sauce for 3 minutes to warm through and serve at once.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-de-linsensuppe",
    name: { en: "German Lentil Soup (Linsensuppe)", hindi: "जर्मन दाल सूप (लिन्सेनसुप्पे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 480 }, // lentils, dry weight
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 30 }, // cider vinegar, the classic finish
      { foodId: "usda-170929", grams: 8 }, // mustard seed, ground
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the sunflower oil for 5 minutes, then stir in the ground mustard seed for 30 seconds until fragrant.",
      "Add the lentils, carrots and 1.6 litres of water; simmer 25 minutes, skimming once.",
      "Add the potato cubes and salt and simmer 15 minutes more, until the lentils are collapsing and the potato is tender.",
      "Mash a ladleful of the soup against the side of the pot and stir it back in — the soup should be thick but still spoonable.",
      "Take off the heat and stir in the cider vinegar; the classic German finish is a distinct, gentle sourness.",
      "Rest 5 minutes and serve steaming.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-de-senfeier",
    name: { en: "German Eggs in Mustard Sauce (Senfeier)", hindi: "जर्मन अंडे सरसों सॉस (सेन्फ़आयर)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-322892", grams: 200 }, // milk, for the sauce
      { foodId: "usda-170929", grams: 16 }, // mustard seed, ground
      { foodId: "usda-168936", grams: 20 }, // flour, to thicken
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Boil the potatoes in salted water for 18 minutes until tender; keep them warm.",
      "Boil the eggs for 8 minutes so the yolks are just set, cool briefly in cold water and peel.",
      "Melt the butter, whisk in the flour and cook 1 minute, then whisk in the milk gradually and simmer 3 minutes into a smooth sauce.",
      "Stir in the ground mustard seed and salt and simmer 1 minute more — the sauce should taste warmly of mustard without catching the throat.",
      "Halve the eggs and nestle them into the sauce for 2 minutes to warm through, keeping the yolks intact.",
      "Serve the eggs and sauce spooned over the potatoes.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-de-bauernfruhstuck",
    name: { en: "German Farmer's Breakfast (Bauernfrühstück)", hindi: "जर्मन किसान नाश्ता (बाउर्नफ्रूश्टुक)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Boil the potatoes whole the night before or for 20 minutes until tender; cool and cut into thick slices — cold potatoes crisp far better than fresh ones.",
      "Fry the potato slices in the sunflower oil over medium-high heat for 8–10 minutes, turning once, until golden and crisp at the edges.",
      "Add the onion and fry 3 minutes more until softened and sweet.",
      "Beat the eggs with the salt and black pepper and pour evenly over the pan.",
      "Draw the eggs gently across the pan for 2–3 minutes, then let them set into a loose, just-firm omelette around the potatoes.",
      "Slide onto warm plates and serve immediately, while the eggs are still glossy.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------ Austrian ------------------------------ */
  {
    id: "dish-at-eiernockerl",
    name: { en: "Austrian Egg Dumplings (Eiernockerl)", hindi: "ऑस्ट्रियाई अंडा डम्पलिंग (आयरनॉकेर्ल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-168936", grams: 200 }, // flour, for the dumpling batter
      { foodId: "usda-168462", grams: 200 }, // spinach, wilted alongside
      { foodId: "usda-322892", grams: 100 }, // milk, for the batter
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Whisk the flour, milk, a third of the eggs and the salt into a thick batter; rest 15 minutes so the flour hydrates.",
      "Push small spoonfuls of batter from a wet spoon into gently boiling salted water; the dumplings are done 1 minute after they float, about 4 minutes in all.",
      "Drain the dumplings well — water clinging to them dilutes the egg coating.",
      "Melt the butter in a wide pan, add the dumplings and toss for 1 minute until they glisten.",
      "Pour in the remaining beaten eggs and stir over low heat for 2 minutes, until the egg just sets in soft ribbons around the dumplings — never let it brown.",
      "Wilt the spinach in the pan's residual heat for the final minute and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-at-spinat-eier",
    name: { en: "Austrian Creamed Spinach with Fried Eggs", hindi: "ऑस्ट्रियाई पालक और तले अंडे" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-168462", grams: 500 }, // spinach
      { foodId: "usda-322892", grams: 100 }, // milk
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Wilt the spinach in a dry pot over medium heat for 3–4 minutes, in batches, until completely collapsed; squeeze it dry and chop it.",
      "Melt half the butter, soften the crushed garlic for 1 minute without colouring, then add the spinach and milk.",
      "Simmer 3 minutes, stirring, until the spinach is creamy and holds a spoon's trail; season with the salt.",
      "Fry the eggs in the remaining butter over medium heat for 3 minutes, until the whites are set and crisp-edged and the yolks still run.",
      "Spoon the spinach into warm bowls and lay the fried eggs on top.",
      "Serve at once, breaking the yolks over the spinach at the table.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------ Hungarian ------------------------------ */
  {
    id: "dish-hu-csirkepaprikas",
    name: { en: "Hungarian Chicken Paprikash (Csirkepaprikás)", hindi: "हंगेरियन चिकन पाप्रिकाश (चिर्केपाप्रिकाश)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 720 }, // chicken thigh
      { foodId: "usda-330137", grams: 240 }, // Greek yogurt, standing in for sour cream
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-171319", grams: 12 }, // chili powder, standing in for sweet paprika
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Hungarian sweet paprika is not in the verified set — a smaller measure of chili powder gives the colour and warmth here, and the dish is seasoned to stay gentle, not hot.",
      "Soften the onion in the sunflower oil over low heat for 10 minutes until translucent and sweet, never browned.",
      "Take the pot off the heat, stir in the chili powder for 30 seconds, then add the chicken pieces and return to the heat — paprika-family spices scorch and turn bitter if they fry dry.",
      "Add the red pepper and a splash of water, cover and braise on low heat for 35 minutes, until the chicken is tender and the sauce brick-red.",
      "Take off the heat for 2 minutes, then stir in the Greek yogurt a spoonful at a time so it does not split; the sauce should turn salmon-pink and glossy.",
      "Warm through gently for 2 minutes without boiling, adjust the salt, and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-hu-gulyas-style",
    name: { en: "Hungarian Turkey Goulash-Style Stew (Gulyás)", hindi: "हंगेरियन टर्की गुलाश-स्टाइल (गुयाश)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 600 }, // turkey breast
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-171319", grams: 12 }, // chili powder, standing in for paprika
      { foodId: "usda-170923", grams: 4 }, // cumin seed
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Gulyás is traditionally beef, and its paprika is not in the verified set — this turkey version with chili powder is named a style, and the method keeps the soup-stew character of the original.",
      "Soften the onion in the sunflower oil for 8 minutes, stir in the chili powder and cumin off the heat, then add the turkey cubes and coat them in the spiced onion.",
      "Add the tomatoes and enough water to make a soup rather than a stew — gulyás is eaten with a spoon.",
      "Simmer 25 minutes, then add the potato cubes and green pepper and simmer 20 minutes more, until the potato is tender and the turkey cooked through.",
      "The broth should be deep red and brothy, the potato just beginning to thicken it at the edges.",
      "Rest 5 minutes, adjust the salt, and serve in bowls.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-hu-babgulyas-style",
    name: { en: "Hungarian Bean and Turkey Soup (Babgulyás-Style)", hindi: "हंगेरियन बीन्स टर्की सूप (बाबगुयाश-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 400 }, // kidney beans, dry weight
      { foodId: "usda-171098", grams: 240 }, // turkey breast
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171319", grams: 10 }, // chili powder, standing in for paprika
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, drain, cover with fresh water and simmer 45 minutes until nearly tender — the soup finishes them.",
      "Soften the onion and carrots in the sunflower oil for 6 minutes, stir in the chili powder off the heat, then add the turkey cubes and sear for 3 minutes.",
      "Add the beans with their cooking liquid and the potato cubes; simmer 20 minutes, until the beans are completely soft and the potato tender.",
      "The soup should be thick enough to coat a spoon, its broth coloured deep red by the spice.",
      "Adjust the salt — beans drink salt, so taste after they have simmered, not before.",
      "Rest 5 minutes and serve steaming.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-hu-lecso",
    name: { en: "Hungarian Pepper Stew with Eggs (Lecsó)", hindi: "हंगेरियन शिमला मिर्च अंडा स्टू (लेचो)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-170427", grams: 400 }, // green peppers
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soften the onion in the sunflower oil for 5 minutes, then add both peppers in strips and cook 8 minutes until they slump.",
      "Add the chopped tomatoes and salt and simmer 12 minutes, until the tomatoes collapse into a thick, sweet sauce and the peppers are silky.",
      "Taste the base before the eggs go in — a lecsó should be sweet from the peppers, seasoned but not sharp.",
      "Beat the eggs and pour them over the stew, stirring gently for 2–3 minutes until they set in soft, glossy folds through the peppers.",
      "Take off the heat while the eggs are still slightly loose — they finish in the pan's heat.",
      "Serve at once, straight from the pan.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-hu-rakott-krumpli-style",
    name: { en: "Hungarian Layered Potato and Egg Bake (Rakott Krumpli-Style)", hindi: "हंगेरियन आलू अंडा बेक (राकॉट क्रुम्पली-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 600 }, // eggs
      { foodId: "usda-2346401", grams: 800 }, // potatoes
      { foodId: "usda-330137", grams: 300 }, // Greek yogurt, standing in for sour cream
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171319", grams: 6 }, // chili powder, standing in for paprika
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rakott krumpli is traditionally layered with sausage; this egg-forward version omits it and says so in its name.",
      "Boil the potatoes whole until just tender, 20 minutes; cool, peel and slice 5 mm thick. Boil the eggs 9 minutes and slice them too.",
      "Soften the onion in a little of the sunflower oil for 5 minutes.",
      "Layer potatoes, egg slices and onion in an oiled baking dish, seasoning each layer with salt and a dusting of chili powder, and finish with a potato layer.",
      "Spoon the Greek yogurt over the top, drizzle with the remaining oil and bake at 190°C for 30 minutes, until bubbling at the edges and golden on top.",
      "Rest 10 minutes so the layers set, then serve in squares.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-hu-ujhazi",
    name: { en: "Hungarian Chicken Soup (Újházi Tyúkhúsleves)", hindi: "हंगेरियन चिकन सूप (उयहाज़ी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-2685573", grams: 200 }, // cauliflower
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-168936", grams: 80 }, // flour, for small dumplings
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cover the chicken breast with 2 litres of cold water, bring to the barest simmer and cook 25 minutes, skimming; lift out and slice the chicken.",
      "Add the carrots and cauliflower to the broth and simmer 10 minutes.",
      "Add the mushrooms and peas and simmer 5 minutes more, keeping the peas green.",
      "Pinch tiny dumplings from the flour mixed with a little water and salt straight into the soup; they are done 2 minutes after they float.",
      "Return the chicken slices and warm through for 2 minutes without boiling.",
      "The broth should be clear and golden, the vegetables distinct — serve at once.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
  },
  /* -------------------------------- Czech -------------------------------- */
  {
    id: "dish-cz-cesnecka",
    name: { en: "Czech Garlic Soup with Egg and Cheese (Česnečka)", hindi: "चेक लहसुन सूप (चेस्नेच्का)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-328637", grams: 80 }, // cheddar, standing in for eidam
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-168886", grams: 40 }, // rye flour, for small dumplings
      { foodId: "usda-1104647", grams: 30 }, // garlic
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Simmer the potato cubes in 900 ml salted water for 12 minutes until tender.",
      "Crush the garlic with the salt to a paste and stir it into the soup off the boil — česnečka's garlic is raw and pungent, never fried.",
      "Pinch small dumplings from the rye flour and a little water into the soup; they cook in 3 minutes.",
      "Beat the eggs and swirl them through the hot soup in a thin stream, stirring once, so they set in fine ribbons.",
      "Divide between bowls and scatter the grated cheddar over each so it melts into the broth.",
      "Dot with the butter and serve immediately, while the garlic is at its fiercest.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cz-cockova",
    name: { en: "Czech Red Lentil Soup (Čočková Polévka)", hindi: "चेक लाल दाल सूप (चोचकोवा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174284", grams: 480 }, // red lentils, dry weight
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, the classic finish
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion and carrots in the sunflower oil for 6 minutes, then add the garlic for the final minute.",
      "Add the red lentils, potato cubes and 1.6 litres of water; simmer 25 minutes, until the lentils have collapsed into the broth.",
      "The soup should be thick and rust-coloured, the potato tender — mash a few cubes against the pot side to thicken it further if needed.",
      "Stir in the cider vinegar and salt off the heat; the vinegar is the Czech finish and should lift, not dominate.",
      "Rest 5 minutes so the flavours settle.",
      "Serve steaming in deep bowls.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-cz-kulajda-style",
    name: { en: "Czech Mushroom and Egg Soup (Kulajda-Style)", hindi: "चेक मशरूम अंडा सूप (कुलायदा-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-172183", grams: 200 }, // egg whites, extra protein for the poach
      { foodId: "usda-1750347", grams: 400 }, // mushrooms
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-322892", grams: 200 }, // milk
      { foodId: "usda-168936", grams: 30 }, // flour, to thicken
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173469", grams: 15 }, // cider vinegar
      { foodId: "usda-171323", grams: 3 }, // fennel seed, standing in for dill
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Kulajda is defined by fresh dill, which is not in the verified set — a little fennel seed gives a gentle anise note in its place, and the name says the dish is a style.",
      "Simmer the potato cubes in 800 ml salted water for 10 minutes; add the mushrooms and simmer 5 minutes more.",
      "Melt the butter, whisk in the flour, cook 1 minute, then whisk in the milk and a ladle of the soup liquid until smooth; stir back into the pot.",
      "Simmer 3 minutes until the soup turns creamy, then add the cider vinegar and crushed fennel seed.",
      "Poach the eggs and the extra whites directly in the soup for 3 minutes, until the whites are set and the yolks still soft.",
      "Serve each bowl with a poached egg on top, the sauce spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cz-kure-na-smetane-style",
    name: { en: "Czech Chicken in Cream Sauce (Kuře na Smetaně-Style)", hindi: "चेक चिकन क्रीम सॉस (कुरे ना स्मेताने-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-322892", grams: 300 }, // milk, for the sauce
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-168936", grams: 40 }, // flour, to thicken
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken breast with the carrots in salted water for 18 minutes; reserve the liquid and slice the chicken.",
      "Melt the butter, whisk in the flour and cook 1 minute without colouring.",
      "Whisk in the milk and 300 ml of the poaching liquid gradually and simmer 5 minutes into a smooth, pale sauce.",
      "Blend or finely grate the poached carrots into the sauce — they give the Czech original its faint sweetness and colour.",
      "Return the chicken slices and warm through for 3 minutes without boiling.",
      "Sharpen with the lemon juice, adjust the salt, and serve the sauce glossy over the chicken.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------- Balkan ------------------------------- */
  {
    id: "dish-blk-punjene-paprike",
    name: { en: "Balkan Stuffed Peppers with Turkey (Punjene Paprike)", hindi: "बाल्कन भरी शिमला मिर्च (पुनेने पाप्रिके)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 560 }, // ground turkey
      { foodId: "usda-170427", grams: 800 }, // green peppers, for stuffing
      { foodId: "usda-170457", grams: 400 }, // tomatoes, for the sauce
      { foodId: "usda-2512381", grams: 200 }, // white rice, raw weight
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, binder
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Mix the ground turkey with the raw rice, grated onion, beaten egg and salt — the rice cooks inside the peppers and drinks their juices.",
      "Cut the tops from the peppers, scoop out the seeds and membranes, and fill each pepper loosely to the rim; the filling swells as the rice cooks.",
      "Stand the peppers upright in a pot where they fit snugly, so they hold each other up.",
      "Pour the chopped tomatoes around them with a little water, drizzle with the sunflower oil, cover and simmer on low heat for 45 minutes.",
      "The peppers should be tender and slightly collapsed, the rice inside fully cooked — pierce one to check.",
      "Rest 10 minutes and serve with the tomato sauce spooned over.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-blk-grah",
    name: { en: "Bosnian White Bean Soup (Grah)", hindi: "बोस्नियाई सफ़ेद बीन्स सूप (ग्राह)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 480 }, // navy beans, dry weight
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171319", grams: 8 }, // chili powder, standing in for paprika
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Grah is traditionally enriched with smoked meat, which is not in the verified set — this is the bean-forward version, and it stands on its own.",
      "Soak the navy beans overnight, drain, cover with fresh water and simmer 50 minutes until tender.",
      "Soften the onion and carrots in the sunflower oil for 6 minutes, stir in the chili powder off the heat, then add a ladle of bean liquid to make a roux-like base.",
      "Stir the base into the beans with the potato cubes and simmer 20 minutes, until the soup thickens from the beans themselves.",
      "Season with the salt only at the end — salting early toughens the bean skins.",
      "Rest 5 minutes and serve thick and steaming.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-blk-raznjici",
    name: { en: "Balkan Grilled Chicken Skewers (Ražnjići)", hindi: "बाल्कन ग्रिल्ड चिकन सीख (राज़निची)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 640 }, // chicken breast
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171413", grams: 40 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the chicken breast into 3 cm cubes and rub with the olive oil, salt and black pepper; rest at least 30 minutes, or overnight.",
      "Thread the chicken onto skewers alternating with chunks of red pepper and onion, packing them snugly — snug pieces baste each other.",
      "Grill over high heat or under a hot grill for 10–12 minutes, turning every few minutes, until charred at the edges.",
      "The chicken is done when the thickest cube is opaque and firm with clear juices — rest the skewers 3 minutes before serving.",
      "Slide the meat and vegetables off the skewers onto warm plates.",
      "Serve at once, while the edges are still crisp from the grill.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-blk-cevapi-style",
    name: { en: "Balkan Turkey Ćevapi-Style with Flatbread", hindi: "बाल्कन टर्की चेवापी-स्टाइल रोटी के साथ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 680 }, // ground turkey
      { foodId: "usda-168936", grams: 240 }, // flour, for flatbreads
      { foodId: "usda-2259793", grams: 200 }, // yogurt, for the sauce
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Ćevapi are traditionally beef, pork or lamb; this turkey version keeps their shape and grilling, and the name says it is a style.",
      "Work the ground turkey with the crushed garlic, salt and black pepper for 2 minutes until slightly sticky, then rest 30 minutes in the fridge.",
      "Shape into short, thick fingers about 8 cm long — wet hands stop the meat sticking.",
      "Knead the flour with warm water and a pinch of the salt into a soft dough, rest 20 minutes, roll into 4 rounds and cook on a dry hot pan for 2 minutes per side until puffed and spotted.",
      "Grill the ćevapi over high heat for 8–10 minutes, turning, until browned all over and cooked through.",
      "Serve on the warm flatbreads with the raw onion, cucumber and the yogurt spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-blk-prebranac",
    name: { en: "Serbian Baked Beans (Prebranac)", hindi: "सर्बियाई बेक्ड बीन्स (प्रेब्रानात्स)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 480 }, // navy beans, dry weight
      { foodId: "usda-790646", grams: 400 }, // onion, in quantity — the point of the dish
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-171319", grams: 10 }, // chili powder, standing in for paprika
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the navy beans overnight, drain, and simmer with the bay leaf for 50 minutes until completely tender; reserve a cup of the cooking liquid.",
      "Meanwhile soften the sliced onions in the sunflower oil over low heat for 20 minutes, until deep golden and sweet — this slow onion is prebranac's flavour.",
      "Stir the chili powder into the onions off the heat.",
      "Layer the beans and onions in a baking dish, finishing with onions, and moisten with the reserved liquid so the top stays juicy.",
      "Bake at 180°C for 30 minutes, until bubbling and bronzed at the edges.",
      "Rest 10 minutes — prebranac is served warm, never piping hot, and improves overnight.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-blk-kavarma",
    name: { en: "Bulgarian Chicken Kavarma", hindi: "बुल्गारियाई चिकन कवार्मा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-170108", grams: 300 }, // red peppers
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Brown the chicken thigh pieces in the sunflower oil over high heat for 6 minutes; set aside with their juices.",
      "In the same pot, cook the onion and both peppers for 6 minutes until softened at the edges.",
      "Add the mushrooms and cook 4 minutes, until their liquid evaporates and they take colour.",
      "Add the tomatoes and salt, return the chicken, cover and braise on low heat for 25 minutes.",
      "Uncover and simmer 5 minutes more to thicken the sauce to a glossy stew — kavarma is traditionally finished in clay pots in the oven, and a 180°C oven for this stage works the same way.",
      "Rest 5 minutes and serve straight from the pot.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------- Nordic ------------------------------- */
  {
    id: "dish-se-kottbullar-style",
    name: { en: "Swedish Turkey Meatballs in Cream Sauce (Köttbullar-Style)", hindi: "स्वीडिश टर्की मीटबॉल क्रीम सॉस (शॉटबुलार-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-322892", grams: 400 }, // milk, binder and sauce
      { foodId: "usda-171287", grams: 100 }, // egg, binder
      { foodId: "usda-168936", grams: 40 }, // flour, binder and sauce
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-790646", grams: 150 }, // onion, grated
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Köttbullar are traditionally beef and pork — this is the turkey version, named a style; breadcrumbs are also outside the verified set, so a little flour binds the mix instead.",
      "Soak the flour in a splash of the milk for 5 minutes, then mix with the ground turkey, grated onion, beaten egg, salt and black pepper until just combined.",
      "Roll into small balls of about 25 g — Swedish meatballs are deliberately small — and chill 15 minutes.",
      "Fry in the butter over medium heat in batches for 8 minutes, shaking the pan so they brown evenly and stay round.",
      "Pour in the remaining milk and simmer 5 minutes, stirring, until the pan juices thicken into a pale cream sauce around the balls.",
      "Rest 2 minutes and serve in their sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-fi-lohikeitto",
    name: { en: "Finnish Salmon Soup (Lohikeitto)", hindi: "फ़िनिश सैल्मन सूप (लोहिकेइत्तो)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 600 }, // salmon
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Melt the butter and soften the onion for 5 minutes without colouring.",
      "Add the potatoes and carrots with 800 ml water and the salt; simmer 12 minutes until the potato is nearly tender.",
      "Pour in the milk and bring back to the barest simmer — never a boil, which would split the soup.",
      "Add the salmon in large chunks and poach 5 minutes, until the fish is just opaque and flakes in layers.",
      "Rest off the heat for 3 minutes so the salmon finishes gently.",
      "Serve the soup creamy and pale pink, with plenty of fish in every bowl.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-no-fiskesuppe",
    name: { en: "Norwegian Cod and Shrimp Soup", hindi: "नॉर्वेजियन कॉड झींगा सूप (फिस्केसुप्पे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 480 }, // cod
      { foodId: "usda-175179", grams: 240 }, // shrimp
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-322892", grams: 300 }, // milk
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-168936", grams: 30 }, // flour, to thicken
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Melt the butter, whisk in the flour and cook 1 minute, then whisk in 700 ml water and the milk gradually.",
      "Simmer 5 minutes into a smooth base, then add the potato cubes and carrots and simmer 12 minutes until tender.",
      "Add the cod in large chunks and poach 5 minutes at a bare simmer.",
      "Add the shrimp for the final 2 minutes — they are done the moment they curl and turn pink.",
      "Adjust the salt and rest 3 minutes off the heat.",
      "Serve with the fish in generous pieces, not broken up — a fiskesuppe is chunkily honest.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-dk-smorrebrod",
    name: { en: "Danish Shrimp and Egg Open Sandwich (Smørrebrød-Style)", hindi: "डेनिश झींगा अंडा सैंडविच (स्मोरेब्रोड-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 260 }, // shrimp
      { foodId: "usda-168886", grams: 120 }, // rye flour, for the rugbrød base
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Mix the rye flour with warm water and the salt into a stiff dough, press it into a small lined tin and bake at 180°C for 35 minutes into a dense rugbrød; cool completely before slicing — it cuts cleanly only when cold.",
      "Boil the egg for 8 minutes, cool, peel and slice.",
      "Poach the shrimp in barely simmering salted water for 2 minutes until pink and curled; drain and cool.",
      "Butter two thick slices of the rye bread generously, edge to edge — on smørrebrød the butter is a layer, not a smear.",
      "Arrange the egg slices and cucumber over the butter, then pile the shrimp high in the centre, as the Danish style demands.",
      "Finish with lemon juice squeezed over at the table and eat with knife and fork, never folded.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-dk-honsesalat",
    name: { en: "Danish Chicken Salad (Hønsesalat)", hindi: "डेनिश चिकन सलाद (होन्सेसलाद)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 280 }, // chicken breast
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt, for the dressing
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-171688", grams: 100 }, // apple
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Poach the chicken breast gently in salted water for 16 minutes until just cooked; cool in the liquid so it stays moist, then cut into neat cubes.",
      "Boil the egg for 8 minutes, cool, peel and chop.",
      "Slice the mushrooms and cook them dry in a hot pan for 4 minutes until golden and their liquid has evaporated; cool.",
      "Whisk the Greek yogurt with the lemon juice and salt into a dressing.",
      "Fold the chicken, egg, mushrooms and diced apple through the dressing gently, keeping the pieces distinct.",
      "Chill at least 20 minutes before serving — hønsesalat is always served cold, the flavours melded.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-dk-aeggekage",
    name: { en: "Danish Egg Cake (Æggekage)", hindi: "डेनिश अंडा केक (एगेकागे)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 500 }, // eggs
      { foodId: "usda-322892", grams: 100 }, // milk
      { foodId: "usda-170457", grams: 200 }, // tomatoes, on top
      { foodId: "usda-168936", grams: 30 }, // flour, to set the cake
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Whisk the eggs with the milk, flour and salt until completely smooth — the flour is what lets an æggekage rise into a cake rather than an omelette.",
      "Melt the butter in an ovenproof pan over low heat and pour in the egg mixture.",
      "Cook undisturbed on the lowest heat for 8 minutes, until the base is set but the top still trembles.",
      "Finish under a hot grill or in a 200°C oven for 3–4 minutes, until puffed and just golden — it should wobble slightly in the centre.",
      "Lay the sliced tomatoes over the top for the final minute to warm through.",
      "Serve straight from the pan, cut in wedges, before it settles.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-is-plokkfiskur",
    name: { en: "Icelandic Fish and Potato Stew (Plokkfiskur)", hindi: "आइसलैंडिक मछली आलू स्टू (प्लोकफिस्कुर)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-333374", grams: 720 }, // haddock
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-322892", grams: 300 }, // milk
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-168936", grams: 40 }, // flour, to thicken
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the haddock in salted water for 8 minutes until it flakes; reserve the liquid, and flake the fish in large pieces, removing any bones.",
      "Boil the potatoes until tender and cut them into rough chunks.",
      "Soften the onion in the butter for 6 minutes, whisk in the flour and cook 1 minute.",
      "Whisk in the milk and 300 ml of the poaching liquid and simmer 4 minutes into a smooth sauce.",
      "Fold in the potatoes and fish and warm through for 3 minutes, stirring gently so the flakes stay large — plokkfiskur is mashed by tradition only at the edges.",
      "Rest 3 minutes and serve thick and steaming.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-se-gravlax-style",
    name: { en: "Cured Salmon, Scandinavian Style (Gravlax-Style)", hindi: "स्कैंडिनेवियाई क्योर्ड सैल्मन (ग्रावलैक्स-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 280 }, // salmon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil, for the sauce
      { foodId: "usda-334247", grams: 20 }, // sugar, for the cure
      { foodId: "usda-173468", grams: 12 }, // salt, for the cure
      { foodId: "usda-170929", grams: 10 }, // mustard seed, ground, for the sauce
      { foodId: "usda-167746", grams: 30 }, // lemon
    ],
    method: [
      "Gravlax is classically cured with dill, which is not in the verified set — this cure is salt, sugar and time alone, and the name says it is a style.",
      "Mix the salt and sugar and rub it over every surface of the salmon; wrap tightly and refrigerate under a light weight for 24 hours, turning once.",
      "Brush off the cure and pat the fish completely dry — the flesh should feel firm and look translucent and deep orange.",
      "Whisk the ground mustard seed with the sunflower oil and lemon juice into a sharp, thin sauce.",
      "Slice the salmon on a long diagonal, as thinly as your knife allows, leaving the skin behind.",
      "Serve the slices fanned, with the mustard sauce spooned over.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-no-farikal-style",
    name: { en: "Norwegian Lamb and Cabbage Stew (Fårikål-Style)", hindi: "नॉर्वेजियन भेड़ पत्तागोभी स्टू (फ़ोरिकोल-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 800 }, // ground lamb
      { foodId: "usda-2346407", grams: 800 }, // cabbage
      { foodId: "usda-168936", grams: 30 }, // flour, light thickening
      { foodId: "usda-170931", grams: 4 }, // black pepper, whole crushed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Fårikål is lamb pieces layered with cabbage; the verified set carries ground lamb, so the meat is formed into coarse hand-pressed chunks, and the name says the dish is a style.",
      "Season the ground lamb with the salt and half the black pepper and press it into rough walnut-sized chunks — do not pack them tight.",
      "Layer the lamb chunks and cabbage wedges alternately in a heavy pot, sprinkling the flour and remaining pepper between the layers.",
      "Add water to barely reach the top layer, cover and simmer on the lowest heat for 90 minutes without stirring — the layers must stay distinct.",
      "The cabbage should be silky and sweet, the lamb tender, and the little broth glossy.",
      "Rest 10 minutes and serve straight from the pot, layers intact.",
    ],
    timeMinutes: 105,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-no-lapskaus-style",
    name: { en: "Norwegian Chicken and Root Vegetable Stew (Lapskaus-Style)", hindi: "नॉर्वेजियन चिकन सब्ज़ी स्टू (लाप्सकाउस-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170284", grams: 120 }, // barley
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cover the chicken thigh with water, simmer 25 minutes, then lift out, cut the meat into coarse pieces and return it to its broth.",
      "Add the barley and simmer 15 minutes.",
      "Add the potatoes, carrots and onion with the salt and simmer 20 minutes more.",
      "Stir well — a lapskaus thickens as the potato edges break down into the broth, and a few strokes with the spoon help it.",
      "The stew should be thick enough to eat with a fork as much as a spoon.",
      "Rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-se-janssons-style",
    name: { en: "Swedish Potato and Sardine Bake (Janssons Frestelse-Style)", hindi: "स्वीडिश आलू सार्डिन बेक (यान्सन्स-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 800 }, // potatoes
      { foodId: "usda-175139", grams: 440 }, // sardines, standing in for sprats
      { foodId: "usda-322892", grams: 300 }, // milk
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Jansson's temptation is made with cured sprats, which are not in the verified set — sardines give the same salty, oily depth, and the name says the dish is a style.",
      "Cut the potatoes into thin matchsticks — the fine cut is what makes the bake creamy rather than chunky.",
      "Soften the onion in half the butter for 8 minutes until sweet and golden.",
      "Layer potatoes, onion and sardines in a buttered dish, finishing with potato; season lightly, as the sardines are salty.",
      "Pour over the milk, dot with the remaining butter and bake at 180°C for 45 minutes, until the top is bronzed and the potatoes yield to a knife.",
      "Rest 10 minutes before serving — the bake sets as it stands.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-se-laxagg",
    name: { en: "Swedish Scrambled Eggs with Salmon", hindi: "स्वीडिश सैल्मन अंडा भुर्जी" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-2684441", grams: 200 }, // salmon
      { foodId: "usda-322892", grams: 60 }, // milk
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the salmon into bite-size pieces and season with a little of the salt.",
      "Sear the salmon in half the butter over medium-high heat for 2 minutes until just opaque at the edges; set aside.",
      "Whisk the eggs with the milk and remaining salt.",
      "Melt the remaining butter on low heat, add the eggs and stir slowly for 3–4 minutes into soft, large curds.",
      "Fold the salmon through for the final 30 seconds, just to warm it — the eggs should still be glossy and slightly loose.",
      "Serve immediately, before the curds firm up.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-se-toast-skagen-style",
    name: { en: "Swedish Shrimp Toast (Toast Skagen-Style)", hindi: "स्वीडिश झींगा टोस्ट (टोस्ट स्कागेन-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 260 }, // shrimp
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt, for the dressing
      { foodId: "usda-168936", grams: 100 }, // flour, for the toast loaf
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Toast Skagen is dressed with dill, which is not in the verified set — lemon and yogurt keep this version bright, and the name says it is a style.",
      "Knead the flour with warm water and a pinch of the salt into a dough, shape a small loaf and bake at 190°C for 25 minutes; cool, then cut two thick slices and toast them in the butter until golden.",
      "Poach the shrimp in barely simmering salted water for 2 minutes until pink; drain and cool completely.",
      "Stir the Greek yogurt with the lemon juice and remaining salt into a dressing and fold through the cold shrimp.",
      "Pile the shrimp high on the warm toasts — a skagen is generous to the point of collapse.",
      "Serve with the cucumber alongside and eat at once, before the toast softens.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-fi-kaalilaatikko-style",
    name: { en: "Finnish Cabbage and Turkey Casserole (Kaalilaatikko-Style)", hindi: "फ़िनिश पत्तागोभी टर्की कैसरोल (कालिलातिक्को-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 560 }, // ground turkey
      { foodId: "usda-2346407", grams: 800 }, // cabbage
      { foodId: "usda-2512381", grams: 240 }, // white rice, raw weight
      { foodId: "usda-322892", grams: 200 }, // milk
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-169640", grams: 20 }, // honey, for the traditional syrup sweetness
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the rice until half cooked, 8 minutes; drain.",
      "Wilt the shredded cabbage in a dry pot for 8 minutes, stirring, until it collapses and sweetens.",
      "Brown the ground turkey with the onion for 6 minutes, breaking it into coarse crumbs.",
      "Combine cabbage, turkey, rice, milk, honey and salt in a baking dish — the honey stands in for the syrup a Finnish casserole is sweetened with.",
      "Bake at 175°C for 60 minutes, until the top is deep golden and the rice is tender through.",
      "Rest 10 minutes; the casserole should slice cleanly and steam gently.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-no-sodd-style",
    name: { en: "Norwegian Lamb Meatball Soup (Sodd-Style)", hindi: "नॉर्वेजियन भेड़ मीटबॉल सूप (सॉड-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // ground lamb
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-2346407", grams: 300 }, // cabbage
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-171287", grams: 50 }, // egg, binder
      { foodId: "usda-169231", grams: 10 }, // ginger, the traditional warmth
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Work the ground lamb with the beaten egg, grated ginger and salt until slightly sticky; roll into small balls and chill 15 minutes.",
      "Bring 1.8 litres of water to the barest simmer and poach the balls for 10 minutes, skimming — sodd's broth is kept clear and delicate.",
      "Add the potato cubes and carrots and simmer 12 minutes.",
      "Add the cabbage in wedges and simmer 6 minutes more, until just tender and still green.",
      "Taste the broth and adjust the salt — it should be mild, letting the lamb and ginger speak.",
      "Serve with several meatballs in every bowl.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-no-fiskegrateng",
    name: { en: "Norwegian Fish Gratin (Fiskegrateng)", hindi: "नॉर्वेजियन मछली ग्राटिन (फिस्केग्राटेंग)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 600 }, // cod
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-322892", grams: 300 }, // milk
      { foodId: "usda-329370", grams: 120 }, // mozzarella, for the gratin top
      { foodId: "usda-168936", grams: 60 }, // flour, for the sauce
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "A fiskegrateng traditionally folds in macaroni, which is not in the verified set — this version keeps the fish, eggs and gratin top and leaves the pasta out, plainly.",
      "Poach the cod in salted water for 8 minutes; flake it in large pieces and reserve 200 ml of the liquid.",
      "Melt the butter, whisk in the flour, cook 1 minute, then whisk in the milk and poaching liquid; simmer 4 minutes into a smooth sauce.",
      "Off the heat, whisk in the beaten eggs one at a time so they thicken rather than scramble, then fold in the cod.",
      "Turn into a buttered dish, scatter the mozzarella over and bake at 190°C for 25 minutes, until puffed and golden.",
      "Rest 5 minutes — the gratin should be set at the edges and just creamy in the centre.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-dk-stegt-kylling",
    name: { en: "Danish Roast Chicken with Cream Sauce and Cucumber", hindi: "डेनिश रोस्ट चिकन क्रीम सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 720 }, // chicken thigh
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-322892", grams: 300 }, // milk, for the sauce
      { foodId: "usda-2346406", grams: 300 }, // cucumber, for the salad
      { foodId: "usda-168936", grams: 30 }, // flour, for the sauce
      { foodId: "usda-169997", grams: 20 }, // coriander leaves, standing in for parsley
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, for the cucumber
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Slice the cucumber thinly, salt it and leave 20 minutes, then squeeze dry and dress with the cider vinegar — the Danish agurkesalat should be sharp and crisp.",
      "Roast the chicken thigh pieces at 200°C for 35 minutes, until the skin is crisp and the juices run clear.",
      "Boil the potatoes until tender, 18 minutes.",
      "Pour off all but a spoonful of the roasting juices, whisk in the flour on the heat for 1 minute, then whisk in the milk and simmer 4 minutes into a cream sauce.",
      "Stir the coriander leaves through the sauce — they stand in for the parsley a Danish sauce would carry.",
      "Serve the chicken with the sauce spooned over, the potatoes and the cold cucumber alongside.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-se-sjomansbiff-style",
    name: { en: "Swedish Sailor's Turkey and Potato Bake (Sjömansbiff-Style)", hindi: "स्वीडिश टर्की आलू बेक (शोमैन्सबिफ़-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 560 }, // turkey breast
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170929", grams: 6 }, // mustard seed, ground
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Sjömansbiff is a sailor's beef bake; this turkey version keeps the layered, slow-cooked character and says so in its name.",
      "Slice the turkey breast into thin escalopes and season with the salt, black pepper and ground mustard seed.",
      "Brown the escalopes quickly in the butter, 1 minute per side — they finish in the bake.",
      "Layer potato slices, onion and turkey in a heavy pot, finishing with potato, and pour in water to barely cover.",
      "Cover and cook on the lowest heat, or in a 170°C oven, for 60 minutes, until the potatoes are completely tender and the juices have thickened.",
      "Rest 10 minutes and serve straight from the pot.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  /* ---------------------------- British & Irish ---------------------------- */
  {
    id: "dish-gb-full-english-style",
    name: { en: "English Breakfast-Style Eggs, Beans and Mushrooms", hindi: "इंग्लिश नाश्ता अंडे बीन्स मशरूम (स्टाइल)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-173745", grams: 160 }, // navy beans, dry weight
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-1750347", grams: 160 }, // mushrooms
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "A full English is built on bacon and sausage, neither of which is in the verified set — this plate keeps the eggs, beans, mushrooms, tomato and potatoes, and its name says it is a style.",
      "Soak the navy beans overnight, then simmer in fresh water for 45 minutes until tender; season with the salt and keep warm in their liquid.",
      "Fry the potato slices in half the sunflower oil for 10 minutes until golden and crisp at the edges.",
      "In the same pan, sear the mushrooms and halved tomatoes in the remaining oil for 5 minutes, until the mushrooms are browned and the tomatoes slumped.",
      "Fry or scramble the eggs to your liking in the pan's last heat — 3 minutes for set whites and running yolks.",
      "Assemble everything hot on warm plates, beans spooned alongside, and eat at once.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-cullen-skink-style",
    name: { en: "Scottish Haddock and Potato Soup (Cullen Skink-Style)", hindi: "स्कॉटिश हैडॉक आलू सूप (कलन स्किंक-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-333374", grams: 680 }, // haddock
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cullen skink is made with smoked haddock, which is not in the verified set — fresh haddock gives a cleaner, milder soup, and the name says the dish is a style.",
      "Poach the haddock in 600 ml salted water for 8 minutes; lift out, flake in large pieces and reserve the liquid.",
      "Soften the onion in the butter for 6 minutes without colouring.",
      "Add the potato cubes and the poaching liquid and simmer 12 minutes until the potatoes are tender; crush a few against the pot to thicken the soup.",
      "Pour in the milk, return the haddock and warm through for 3 minutes at a bare simmer — boiling would break the fish and split the milk.",
      "Adjust the salt and serve thick, with flakes of fish in every spoonful.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-lancashire-hotpot-style",
    name: { en: "Lamb and Potato Hotpot (Lancashire Hotpot-Style)", hindi: "भेड़ आलू हॉटपॉट (लंकाशायर-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // ground lamb
      { foodId: "usda-2346401", grams: 700 }, // potatoes
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-168936", grams: 30 }, // flour, light thickening
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "A hotpot is lamb chops under potato; the verified set carries ground lamb, so the meat is pressed into coarse chunks, and the name says the dish is a style.",
      "Season the ground lamb with the salt and black pepper and press into rough chunks; brown them in the butter for 5 minutes.",
      "Layer lamb, onion, carrots and potato slices in a heavy dish, sprinkling the flour between layers and finishing with an overlapping potato roof.",
      "Pour in hot water to come halfway up, cover and bake at 170°C for 90 minutes.",
      "Uncover for the final 20 minutes so the potato roof crisps and browns at the edges.",
      "Rest 10 minutes — the gravy should be thin, rich and glossy, never a thick sauce.",
    ],
    timeMinutes: 105,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-fish-pie",
    name: { en: "British Fish Pie with Salmon and Cod", hindi: "ब्रिटिश मछली पाई सैल्मन कॉड" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 400 }, // cod
      { foodId: "usda-2684441", grams: 240 }, // salmon
      { foodId: "usda-2346401", grams: 600 }, // potatoes, for the mash top
      { foodId: "usda-322892", grams: 300 }, // milk
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-171287", grams: 100 }, // egg, quartered into the pie
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-168936", grams: 30 }, // flour, for the sauce
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the cod and salmon in the milk for 8 minutes; lift out, flake in large pieces and keep the milk.",
      "Boil the potatoes until tender and mash with half the butter and a splash of the poaching milk.",
      "Melt the remaining butter, whisk in the flour, cook 1 minute, then whisk in the poaching milk and simmer 4 minutes into a sauce.",
      "Fold the fish, peas and quartered boiled egg through the sauce and turn into a baking dish.",
      "Cover with the mash, roughing the surface with a fork so it crisps, and bake at 190°C for 25 minutes until golden and bubbling at the edges.",
      "Rest 5 minutes before serving — the sauce should be creamy, the flakes of fish large.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-kedgeree",
    name: { en: "Kedgeree (Spiced Rice with Haddock and Egg)", hindi: "केजरी (मसाला चावल हैडॉक अंडा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-333374", grams: 480 }, // haddock
      { foodId: "usda-2512381", grams: 320 }, // white rice, raw weight
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170924", grams: 10 }, // curry powder
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the haddock in salted water for 8 minutes; flake in large pieces and keep warm.",
      "Boil the eggs for 8 minutes, cool, peel and quarter.",
      "Cook the rice in salted water until just tender, about 12 minutes; drain and steam dry for 2 minutes.",
      "Soften the onion in the butter for 6 minutes, stir in the curry powder for 30 seconds, then fold through the rice until every grain is tinted.",
      "Fold in the haddock gently, keeping the flakes large, and warm through for 2 minutes.",
      "Serve topped with the egg quarters, coriander leaves and lemon to squeeze over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-scotch-eggs-style",
    name: { en: "Scotch Eggs with Turkey (Scotch Egg-Style)", hindi: "स्कॉच अंडे टर्की (स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 220 }, // ground turkey
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-168936", grams: 60 }, // flour, for the crust
      { foodId: "usda-170929", grams: 4 }, // mustard seed, ground
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "A scotch egg is sausage meat around an egg, crumbed and fried; sausage meat and breadcrumbs are outside the verified set, so seasoned turkey and a flour crust do the work, and the name says it is a style.",
      "Boil the eggs for 7 minutes so the yolks stay just soft, cool in cold water and peel carefully.",
      "Season the ground turkey with the ground mustard seed and salt and divide it into two thin patties.",
      "Wrap each egg completely in a turkey patty, sealing the joins with damp fingers so no egg shows.",
      "Roll the wrapped eggs in the flour, pressing it on evenly.",
      "Fry in the sunflower oil over medium heat for 8–10 minutes, turning, until deep golden all over and the turkey is cooked through; rest 3 minutes before halving.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-chicken-mushroom-pie",
    name: { en: "Chicken and Mushroom Pie", hindi: "चिकन मशरूम पाई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-168936", grams: 240 }, // flour, pastry and sauce
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-322892", grams: 200 }, // milk
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Make a pastry from two-thirds of the flour, half the butter and cold water; rest it 30 minutes in the fridge.",
      "Poach the chicken breast in salted water for 16 minutes; slice it and reserve 200 ml of the liquid.",
      "Cook the mushrooms and onion in the remaining butter for 6 minutes until golden, whisk in the rest of the flour, then the milk and poaching liquid, and simmer 4 minutes into a sauce.",
      "Fold in the chicken, season with the salt, and cool the filling — a hot filling makes a soggy base.",
      "Fill a pie dish, cover with the rolled pastry, crimp and cut a steam hole.",
      "Bake at 190°C for 30 minutes until the pastry is deep golden and the filling bubbles at the vent.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-coronation-chicken",
    name: { en: "Coronation Chicken", hindi: "कोरोनेशन चिकन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 280 }, // chicken breast
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt, for the sauce
      { foodId: "usda-174683", grams: 100 }, // grapes, standing in for sultanas and apricot
      { foodId: "usda-2346393", grams: 30 }, // almonds, toasted
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Poach the chicken breast gently in salted water for 16 minutes; cool in the liquid, then cut into bite-size pieces.",
      "Toast the almonds in a dry pan for 3 minutes until fragrant and golden; chop roughly.",
      "Whisk the Greek yogurt with the curry powder, lemon juice and salt — coronation sauce should be gently spiced and golden, never fiery.",
      "Fold the chicken and halved grapes through the sauce; the grapes stand in for the sultanas and apricot of the 1953 original, neither of which is in the verified set.",
      "Chill at least 30 minutes so the sauce coats and the flavours settle.",
      "Serve cold, scattered with the toasted almonds.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-welsh-rarebit-style",
    name: { en: "Welsh Rarebit-Style (Cheddar and Egg Toast)", hindi: "वेल्श रेयरबिट-स्टाइल (चेडर अंडा टोस्ट)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-328637", grams: 160 }, // cheddar
      { foodId: "usda-168936", grams: 120 }, // flour, for the bread base
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-322892", grams: 100 }, // milk
      { foodId: "usda-170929", grams: 6 }, // mustard seed, ground
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a dough, shape two thick rounds and bake at 190°C for 18 minutes into simple bread bases; split and toast them.",
      "Melt the butter, whisk in a spoonful of the remaining flour, then the milk, and simmer 2 minutes into a thick base.",
      "Take off the heat and stir in the grated cheddar and ground mustard seed until the cheese melts into a smooth, thick paste.",
      "Beat in the egg yolk-rich egg quickly so it enriches without scrambling.",
      "Pile the cheese mixture thickly onto the toasts, right to the edges.",
      "Grill for 2–3 minutes until bubbling and bronzed in spots, and eat immediately.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-gb-ploughmans-style",
    name: { en: "Ploughman's-Style Cheese, Egg and Bread Plate", hindi: "प्लाउमैन्स-स्टाइल चीज़ अंडा प्लेट" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-328637", grams: 160 }, // cheddar
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-168936", grams: 80 }, // flour, for a crusty roll
      { foodId: "usda-171688", grams: 150 }, // apple
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the flour with warm water and the salt into a dough, shape a small crusty roll and bake at 200°C for 20 minutes; cool on a rack so the crust stays crisp.",
      "Boil the eggs for 9 minutes, cool, peel and halve.",
      "Cut the cheddar into two thick wedges — a ploughman's cheese is cut boldly, never sliced thin.",
      "Arrange the cheese, eggs, torn roll, apple wedges, cucumber and onion on a board or plate, each in its own pile.",
      "Dot the roll with the butter.",
      "Serve at room temperature, composing each bite as you go — that is the pleasure of the plate.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ie-seafood-chowder",
    name: { en: "Irish Seafood Chowder", hindi: "आयरिश सीफ़ूड चाउडर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 400 }, // cod
      { foodId: "usda-175179", grams: 240 }, // shrimp
      { foodId: "usda-2346401", grams: 500 }, // potatoes
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-168936", grams: 30 }, // flour, to thicken
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion and carrots in the butter for 6 minutes without colouring.",
      "Whisk in the flour, cook 1 minute, then add 500 ml water and the potato cubes; simmer 12 minutes until tender.",
      "Pour in the milk and bring to the barest simmer.",
      "Add the cod in large chunks and poach 5 minutes, then the shrimp for 2 minutes, until they curl pink.",
      "Crush a few potato cubes into the chowder to body it, keeping most of the fish in pieces.",
      "Adjust the salt and serve at once, steaming and creamy.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ie-boxty-style",
    name: { en: "Irish Potato Pancakes with Eggs (Boxty-Style)", hindi: "आयरिश आलू पैनकेक अंडे (बॉक्सटी-स्टाइल)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-168936", grams: 80 }, // flour
      { foodId: "usda-322892", grams: 80 }, // milk
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Grate half the potatoes raw and squeeze them dry in a cloth; mash the other half smoothly — the two textures together are boxty's secret.",
      "Stir the grated and mashed potato together with the flour, milk, salt and one of the eggs beaten in, into a thick batter.",
      "Fry ladles of batter in the butter over medium heat for 3–4 minutes per side, until deep golden and crisp at the edges.",
      "Keep the pancakes warm while you fry the remaining eggs in the same pan, 3 minutes, whites set and yolks running.",
      "Stack the pancakes with a fried egg on each.",
      "Serve immediately, while the edges are still crisp.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-fish-chips-style",
    name: { en: "Battered Cod with Potato Wedges (Fish and Chips-Style)", hindi: "बैटर्ड कॉड आलू वेज (फिश एंड चिप्स-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 340 }, // cod
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-168936", grams: 100 }, // flour, for the batter
      { foodId: "usda-170419", grams: 150 }, // green peas, for mushy peas
      { foodId: "usda-171287", grams: 50 }, // egg, for the batter
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, to serve
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "A chip-shop batter is beer-lifted; beer is not in the verified set, so this batter is flour and egg, fried thin and crisp — the name says the dish is a style.",
      "Cut the potatoes into thick wedges, toss in half the sunflower oil and the salt, and roast at 200°C for 30 minutes until crisp.",
      "Whisk the flour, egg and a little cold water into a batter the thickness of cream; rest 10 minutes.",
      "Pat the cod completely dry, dip in the batter and fry in the remaining oil over medium-high heat for 5–6 minutes, until deep golden and crisp — the fish inside should flake at a touch.",
      "Simmer the peas for 5 minutes and crush roughly with a fork into mushy peas.",
      "Serve the fish on the wedges with the peas alongside and cider vinegar to shake over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-cawl-style",
    name: { en: "Welsh Lamb and Vegetable Soup (Cawl-Style)", hindi: "वेल्श भेड़ सब्ज़ी सूप (काउल-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 680 }, // ground lamb
      { foodId: "usda-2346401", grams: 500 }, // potatoes
      { foodId: "usda-2346407", grams: 300 }, // cabbage
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170284", grams: 120 }, // barley
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cawl is defined by leeks, which are not in the verified set, and by lamb on the bone; here onion carries the allium sweetness and ground lamb is pressed into coarse chunks — the name says it is a style.",
      "Press the ground lamb into rough chunks and brown them in a dry heavy pot for 5 minutes; drain off the excess fat.",
      "Add 1.8 litres of water and the barley and simmer 25 minutes, skimming once.",
      "Add the potatoes, carrots and onion and simmer 20 minutes.",
      "Add the cabbage and simmer 8 minutes more, until just tender and still green.",
      "Season with the salt, rest 5 minutes, and serve the broth clear with the lamb and vegetables in every bowl.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-mulligatawny-style",
    name: { en: "Mulligatawny-Style Chicken and Lentil Soup", hindi: "मुलिगटॉनी-स्टाइल चिकन दाल सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 480 }, // chicken breast
      { foodId: "usda-174284", grams: 240 }, // red lentils, dry weight
      { foodId: "usda-2512381", grams: 160 }, // white rice, raw weight
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171688", grams: 100 }, // apple
      { foodId: "usda-170924", grams: 10 }, // curry powder
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken breast in 1.4 litres of salted water for 16 minutes; lift out, shred coarsely and reserve the liquid.",
      "Simmer the red lentils and rice in the poaching liquid for 20 minutes, until both collapse into the broth.",
      "Soften the onion in a dry pan for 5 minutes, stir in the curry powder for 30 seconds, then add it to the soup with the diced apple.",
      "Simmer 5 minutes, then stir in the coconut milk and the shredded chicken and warm through without boiling.",
      "The soup should be thick, golden and gently spiced, the apple softened into it.",
      "Sharpen with the lemon juice, adjust the salt, and serve.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-potted-shrimp-style",
    name: { en: "Potted Shrimp with Toast", hindi: "पॉटेड झींगा टोस्ट के साथ" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 280 }, // shrimp
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-168936", grams: 100 }, // flour, for the toast loaf
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170929", grams: 3 }, // mustard seed, ground
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a dough, shape a small loaf and bake at 190°C for 25 minutes; cool, slice thickly and toast.",
      "Poach the shrimp in barely simmering salted water for 2 minutes until pink; drain well and pat dry — wet shrimp make cloudy butter.",
      "Melt the butter gently with the ground mustard seed and remaining salt until it foams, then take off the heat.",
      "Pack the shrimp into two small pots or ramekins and pour the spiced butter over to cover.",
      "Chill at least 1 hour, until the butter is set and opaque.",
      "Serve the pots with the warm toast, cucumber and lemon, spreading the shrimp and their butter thickly.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gb-skirlie-egg",
    name: { en: "Scottish Oat Skirlie with Fried Eggs", hindi: "स्कॉटिश ओट स्किर्ली तले अंडे" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-2346396", grams: 160 }, // rolled oats
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Melt the butter and soften the onion for 6 minutes until sweet and golden at the edges.",
      "Add the rolled oats and fry, stirring, for 5–6 minutes, until they drink the butter, toast nutty and separate into coarse crumbs — that toasted crumb is skirlie.",
      "Season the skirlie with the salt and black pepper and keep it warm.",
      "Fry the eggs in the same pan's residue for 3 minutes, whites set and yolks running.",
      "Spoon the skirlie onto warm plates and top with the fried eggs.",
      "Serve at once, breaking the yolks into the oats.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ie-dublin-coddle-style",
    name: { en: "Dublin Coddle-Style Turkey and Potato Stew", hindi: "डबलिन कॉडल-स्टाइल टर्की आलू स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 600 }, // turkey breast
      { foodId: "usda-2346401", grams: 700 }, // potatoes
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-168936", grams: 20 }, // flour, light thickening
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "A coddle is sausages and bacon poached with potato; neither meat is in the verified set, so turkey breast poaches in their place, and the name says the dish is a style.",
      "Cut the turkey breast into thick chunks and season with the salt and black pepper.",
      "Layer onion, potato slices, carrots and turkey in a heavy pot, sprinkling the flour between the layers.",
      "Pour in water to just cover, bring to the barest simmer and cook, covered, for 50 minutes without boiling — a coddle is poached, never rushed.",
      "The potatoes should be collapsing at the edges and the broth milky and savoury.",
      "Rest 5 minutes and serve in deep bowls with plenty of the broth.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------- Central Asia & Caucasus ------------------------- */
  {
    id: "dish-uz-plov",
    name: { en: "Uzbek Chicken Plov", hindi: "उज़्बेक चिकन प्लोव" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-2512381", grams: 340 }, // white rice, raw weight
      { foodId: "usda-2258586", grams: 400 }, // carrots, in matchsticks
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170923", grams: 8 }, // cumin seed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rinse the rice until the water runs clear and soak it in warm salted water for 30 minutes — plov rice must stay separate, never sticky.",
      "Heat the sunflower oil in a heavy cauldron-style pot until shimmering and brown the chicken pieces for 8 minutes.",
      "Add the onion and cook 5 minutes, then the carrot matchsticks and cumin and cook 8 minutes, until the carrots soften into the oil — this spiced base is the zirvak.",
      "Pour in water to cover by 2 cm, add the salt and simmer the zirvak 20 minutes, until rich and orange.",
      "Drain the rice and lay it over the zirvak in an even layer without stirring; add water to just cover the rice and boil until it is absorbed and craters appear.",
      "Cover, turn to the lowest heat and steam 25 minutes; rest 10 minutes, then turn out onto a platter so the chicken and carrots crown the rice.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-uz-lagman-style",
    name: { en: "Uzbek Hand-Pulled Noodle Soup with Chicken (Lagman-Style)", hindi: "उज़्बेक हाथ-खिंचे नूडल चिकन सूप (लागमान-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 560 }, // chicken thigh
      { foodId: "usda-168936", grams: 280 }, // flour, for hand-pulled noodles
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170923", grams: 6 }, // cumin seed
      { foodId: "usda-171411", grams: 40 }, // soybean oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with salted water into a firm dough, rest 30 minutes, then pull and stretch it by hand into long noodles, oiling them lightly so they do not stick — lagman noodles are pulled, never cut.",
      "Brown the chicken pieces in the soybean oil for 6 minutes; add the onion and garlic and cook 3 minutes.",
      "Add both peppers and the cabbage and stir-fry 4 minutes, keeping them bright.",
      "Add the tomatoes and cumin with water to make a soup and simmer 15 minutes, until the sauce is rich and the chicken tender.",
      "Boil the pulled noodles separately for 3–4 minutes until just chewy, then drain into bowls.",
      "Ladle the chicken and vegetable soup over the noodles and serve at once.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kz-beshbarmak-style",
    name: { en: "Kazakh Chicken and Flat Noodles (Beshbarmak-Style)", hindi: "कज़ाख चिकन चपटे नूडल (बेशबारमाक-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-168936", grams: 240 }, // flour, for flat noodles
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-790646", grams: 400 }, // onion, in rings over the top
      { foodId: "usda-171287", grams: 50 }, // egg, for the noodle dough
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Beshbarmak is traditionally boiled beef or lamb; this chicken version keeps the flat noodles and onion-topped platter, and the name says it is a style.",
      "Simmer the chicken in salted water for 35 minutes until tender; lift out and keep the broth — everything else cooks in it.",
      "Knead the flour, egg and a little water into a stiff dough, rest 20 minutes, roll very thin and cut into wide squares.",
      "Boil the potatoes in the broth until tender; lift out, then boil the noodle squares in the same broth for 3 minutes until supple.",
      "Soften the onion rings in a ladle of hot broth for 3 minutes until just wilted and sweet.",
      "Lay the noodles on a platter, top with the chicken pieces and potatoes, spoon the onions and their broth over, and finish with black pepper — the dish is eaten communally, with the hands by tradition.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ge-khachapuri-style",
    name: { en: "Georgian Cheese Boat (Khachapuri-Style, Adjaruli)", hindi: "जॉर्जियाई चीज़ बोट (खाचापुरी-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 180 }, // flour, for the dough
      { foodId: "usda-329370", grams: 120 }, // mozzarella, standing in for sulguni
      { foodId: "usda-328841", grams: 80 }, // cottage cheese, standing in for imeruli
      { foodId: "usda-171287", grams: 100 }, // egg, one yolk-rich egg per boat
      { foodId: "usda-322892", grams: 60 }, // milk, for the dough
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Khachapuri's sulguni and imeruli cheeses are not in the verified set — mozzarella and cottage cheese, Bloom's sanctioned stand-in pairing, fill the boat here, and the name says it is a style.",
      "Knead the flour, milk, salt and a little warm water into a soft dough; rest 30 minutes until supple.",
      "Mash the mozzarella and cottage cheese together with a pinch of the salt into a moist filling.",
      "Roll the dough into two ovals, roll the long edges inwards to form boats, pinch the ends, and fill the centres generously with the cheese.",
      "Bake at 220°C for 12–14 minutes, until the crust is golden and the cheese bubbling.",
      "Make a well in each boat's cheese, add an egg and a knob of butter, and bake 2 minutes more — the yolk must stay liquid, to be stirred into the hot cheese at the table.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ge-chakhokhbili",
    name: { en: "Georgian Chicken Stew with Tomato and Herbs (Chakhokhbili)", hindi: "जॉर्जियाई चिकन टमाटर स्टू (चाखोखबिली)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 720 }, // chicken thigh
      { foodId: "usda-170457", grams: 600 }, // tomatoes
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-169997", grams: 40 }, // coriander leaves
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Brown the chicken pieces in a dry heavy pot over high heat for 8 minutes — chakhokhbili starts without oil, the chicken rendering its own fat.",
      "Add the onion and cook 6 minutes in the chicken fat until softened.",
      "Add the tomatoes, garlic, chili powder and salt, cover and braise on low heat for 30 minutes, until the chicken is tender and the tomatoes have become the sauce.",
      "The stew should be thick and brick-red, the chicken falling from the bone.",
      "Stir in most of the coriander leaves and rest 5 minutes off the heat.",
      "Serve scattered with the remaining leaves, with the sauce spooned over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ge-kharcho-style",
    name: { en: "Georgian Chicken and Walnut Soup (Kharcho-Style)", hindi: "जॉर्जियाई चिकन अखरोट सूप (खारचो-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-2512381", grams: 200 }, // white rice, raw weight
      { foodId: "usda-2346394", grams: 80 }, // walnuts, ground
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon, standing in for tkemali sour plum
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Kharcho is a beef soup sharpened with tkemali, a sour plum sauce outside the verified set — chicken and lemon make this version, and the name says it is a style.",
      "Simmer the chicken breast in 1.6 litres of salted water for 18 minutes; lift out, slice thickly and reserve the broth.",
      "Add the rice to the broth and simmer 15 minutes.",
      "Soften the onion for 6 minutes, add the tomatoes, garlic, chili powder and ground coriander seed and cook 8 minutes into a thick base; stir it into the soup.",
      "Pound the walnuts to a paste with a little hot broth and stir them in — the soup turns opaque and rich.",
      "Return the chicken, simmer 3 minutes, then sharpen with the lemon juice and adjust the salt; the soup should be sour, hot and nutty in balance.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ge-lobio",
    name: { en: "Georgian Bean Stew with Walnuts (Lobio)", hindi: "जॉर्जियाई बीन्स अखरोट स्टू (लोबियो)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 480 }, // kidney beans, dry weight
      { foodId: "usda-2346394", grams: 60 }, // walnuts
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169997", grams: 30 }, // coriander leaves
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, drain, cover with fresh water and simmer 50 minutes until completely tender; reserve their liquid.",
      "Soften the onion in the sunflower oil for 8 minutes until golden.",
      "Pound the walnuts with the garlic and a little bean liquid into a paste.",
      "Add the beans to the onion with enough liquid to make a thick stew and simmer 10 minutes, crushing a third of the beans against the pot so the stew bodies itself.",
      "Stir in the walnut paste and simmer 3 minutes — the stew turns creamy and aromatic.",
      "Off the heat, add the cider vinegar, salt and coriander leaves; rest 5 minutes and serve warm.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-am-harisa-style",
    name: { en: "Armenian Chicken and Barley Porridge (Harisa-Style)", hindi: "आर्मेनियाई चिकन जौ दलिया (हरिसा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170284", grams: 240 }, // pearled barley, standing in for wheat berries
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-170923", grams: 4 }, // cumin seed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Harisa is whole wheat berries beaten with chicken into a porridge; wheat berries are not in the verified set, so pearled barley — which breaks down the same way — makes this version, and the name says it is a style.",
      "Cover the chicken and barley with 1.8 litres of water and the salt and bring to a simmer, skimming once.",
      "Cook on the lowest heat for 2 hours, stirring every 20 minutes, topping up with water so it stays porridge-loose.",
      "Lift out the chicken, shred the meat finely and return it to the pot, discarding the bones.",
      "Beat the porridge vigorously with a wooden spoon for 5 minutes — harisa is defined by this beating, which turns it smooth, pale and elastic.",
      "Serve in bowls with a well of melted butter and a dusting of cumin in the centre.",
    ],
    timeMinutes: 120,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-uz-manti",
    name: { en: "Central Asian Steamed Chicken Dumplings (Manti)", hindi: "मध्य एशियाई चिकन मोमोज़ (मान्ती)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 520 }, // chicken thigh, minced
      { foodId: "usda-168936", grams: 320 }, // flour, for the wrappers
      { foodId: "usda-790646", grams: 300 }, // onion, finely chopped
      { foodId: "usda-2259793", grams: 200 }, // yogurt, to serve
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-170923", grams: 6 }, // cumin seed
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Knead the flour with salted water into a firm dough; rest 30 minutes.",
      "Mince the chicken thigh finely with a knife — manti filling is chopped, never puréed — and mix with the onion, cumin, salt and black pepper.",
      "Roll the dough thin and cut 10 cm squares; place a spoonful of filling in the centre of each.",
      "Fold the corners to the centre and pinch the seams firmly, then pinch the side seams into the classic manti parcel shape.",
      "Steam over boiling water on oiled trays for 25 minutes, until the wrappers are supple and the filling cooked through and juicy.",
      "Serve at once with the yogurt spooned over.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ge-satsivi",
    name: { en: "Georgian Chicken in Walnut Sauce (Satsivi)", hindi: "जॉर्जियाई चिकन अखरोट सॉस (सात्सिवी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-2346394", grams: 120 }, // walnuts
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-171324", grams: 4 }, // fenugreek seed
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken breast in salted water for 18 minutes; cool in the liquid, then cut into large pieces and reserve the broth.",
      "Soften the grated onion in a dry pan for 8 minutes until sweet and translucent.",
      "Pound the walnuts with the garlic, coriander seed, fenugreek and chili powder to a fine paste, then loosen it with hot broth into a pouring sauce.",
      "Combine the sauce with the onion and 400 ml of broth and simmer 8 minutes, stirring — satsivi sauce should be the thickness of cream and smell of walnut and spice.",
      "Add the chicken pieces and simmer 3 minutes to coat, then take off the heat and stir in the cider vinegar.",
      "Cool to room temperature and chill at least 2 hours — satsivi is served cold, the sauce set softly around the chicken.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ge-chirbuli",
    name: { en: "Georgian Eggs in Walnut and Tomato Sauce (Chirbuli)", hindi: "जॉर्जियाई अंडे अखरोट टमाटर सॉस (चिरबुली)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-2346394", grams: 50 }, // walnuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soften the onion in the butter for 6 minutes, then add the tomatoes and garlic and simmer 10 minutes into a thick sauce.",
      "Pound the walnuts to a coarse paste with a little of the hot sauce and stir them back in — the sauce turns creamy and nutty.",
      "Season with the salt and simmer 2 minutes more.",
      "Crack the eggs directly into the sauce, cover and cook on low heat for 5 minutes, until the whites are set and the yolks still soft.",
      "Scatter the coriander leaves over the top.",
      "Serve straight from the pan, spooning sauce over each egg.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-am-lahmacun-style",
    name: { en: "Armenian Turkey Flatbread (Lahmacun-Style)", hindi: "आर्मेनियाई टर्की फ्लैटब्रेड (लाहमाजुन-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 480 }, // ground turkey
      { foodId: "usda-168936", grams: 280 }, // flour, for the flatbreads
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-167746", grams: 40 }, // lemon, to serve
      { foodId: "usda-169997", grams: 30 }, // coriander leaves, to serve
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Lahmacun is traditionally minced beef or lamb spread paper-thin on dough; this turkey version keeps the format, and the name says it is a style.",
      "Knead the flour with salted water into a soft dough and rest 30 minutes.",
      "Blitz or finely chop the tomato, onion, red pepper and garlic together, then mix with the ground turkey, chili powder and salt into a loose, spreadable paste.",
      "Roll pieces of dough into very thin 20 cm rounds — thinness is the whole point of lahmacun.",
      "Spread a thin layer of the meat mixture edge to edge on each round and bake at the oven's hottest setting for 6–8 minutes, until the edges crisp and the meat is cooked and juicy.",
      "Serve rolled up with coriander leaves and a squeeze of lemon.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-uz-dimlama",
    name: { en: "Uzbek Chicken and Vegetable Stew (Dimlama)", hindi: "उज़्बेक चिकन सब्ज़ी स्टू (दिमलामा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-2346401", grams: 500 }, // potatoes
      { foodId: "usda-2346407", grams: 400 }, // cabbage
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170923", grams: 6 }, // cumin seed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Dimlama is a layered steam-stew: everything goes into one pot and cooks in its own vapour, with almost no added water.",
      "Layer the chicken pieces at the bottom of a heavy pot and season with the salt and cumin.",
      "Layer over them, in order, the onion, carrots, potatoes, green pepper and tomatoes, finishing with cabbage leaves laid over the top as a lid.",
      "Cover tightly and cook on the lowest heat for 60 minutes without lifting the lid — the vegetables steam in the chicken's juices.",
      "The chicken should be falling from the bone and the vegetables tender, sitting in a shallow, rich broth of their own making.",
      "Serve by turning the pot's layers out onto a platter, broth spooned over.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-am-khorovats-style",
    name: { en: "Armenian Grilled Chicken Skewers (Khorovats-Style)", hindi: "आर्मेनियाई ग्रिल्ड चिकन सीख (खोरोवात्स-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 640 }, // chicken breast
      { foodId: "usda-790646", grams: 300 }, // onion, for the marinade and grilling
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Khorovats is Armenia's barbecue — usually pork or lamb; this chicken version marinates the same way, and the name says it is a style.",
      "Cut the chicken into large chunks and rub with the sunflower oil, chili powder, salt and half the onion, grated; marinate at least 1 hour, or overnight.",
      "Thread the chicken onto skewers with pieces of red pepper and the remaining onion between them.",
      "Grill over high heat for 12–14 minutes, turning often, until charred at the edges and cooked through — khorovats should taste of the fire.",
      "Rest the skewers 3 minutes, then squeeze the lemon over them.",
      "Serve the skewers piled on a platter with the grilled vegetables tumbled over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-uz-samsa",
    name: { en: "Uzbek Baked Chicken Pastries (Samsa)", hindi: "उज़्बेक चिकन पेस्ट्री (समसा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 480 }, // chicken thigh, finely chopped
      { foodId: "usda-168936", grams: 280 }, // flour, for the pastry
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, for the glaze
      { foodId: "usda-173410", grams: 30 }, // butter, for the pastry
      { foodId: "usda-170150", grams: 20 }, // sesame seeds, on top
      { foodId: "usda-170923", grams: 6 }, // cumin seed
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Knead the flour with salted water into a firm dough, roll it thin, brush with the melted butter, roll it up and chill 30 minutes — this gives samsa their flaky layers.",
      "Chop the chicken thigh finely and mix with the onion, cumin, salt and black pepper; the filling goes in raw and cooks in the pastry.",
      "Cut the dough roll into pieces, roll each into a round and place a spoonful of filling in the centre.",
      "Fold into triangles, pinching the seams hard to seal in the juices.",
      "Brush with the beaten egg, scatter the sesame seeds and bake at 200°C for 25 minutes, until deep golden and crisp.",
      "Rest 5 minutes — the filling is juicy and very hot — and serve warm.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-uz-moshkichiri",
    name: { en: "Uzbek Mung Bean and Rice Mash (Moshkichiri)", hindi: "उज़्बेक मूंग दाल चावल खिचड़ी (मोशकिचिरी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174256", grams: 480 }, // mung beans, dry weight
      { foodId: "usda-2512381", grams: 200 }, // white rice, raw weight
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the mung beans for 4 hours or overnight and drain.",
      "Soften the onion and carrots in the sunflower oil for 6 minutes, then stir in the cumin until fragrant.",
      "Add the mung beans and 1.4 litres of water and simmer 25 minutes, until the beans begin to split.",
      "Add the rice and salt and simmer 18 minutes more, stirring often, until both collapse into a thick, porridge-like mash.",
      "The moshkichiri should be soft and spoonable, neither soup nor pilaf — loosen with hot water if it stands too firm.",
      "Rest 5 minutes and serve in bowls, steaming and golden-green.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ge-shkmeruli",
    name: { en: "Georgian Chicken in Garlic Milk Sauce (Shkmeruli)", hindi: "जॉर्जियाई चिकन लहसुन दूध सॉस (श्कमेरुली)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-322892", grams: 300 }, // milk
      { foodId: "usda-1104647", grams: 40 }, // garlic, in quantity — the point of the dish
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Season the chicken pieces with the salt and roast or pan-fry them in half the butter for 25 minutes, until the skin is crisp and golden and the meat cooked through.",
      "Crush the garlic with a pinch of the salt to a rough paste.",
      "Take the chicken out of the pan; pour off the fat, add the remaining butter and the milk and bring to a simmer, scraping up the browned bits.",
      "Stir in the garlic paste and simmer 2 minutes — the sauce should be fiercely garlicky but mellowed by the milk.",
      "Return the chicken to the pan and baste it in the sauce for 3 minutes.",
      "Serve the chicken swimming in its garlic sauce, straight from the pan.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kz-kespe-style",
    name: { en: "Kazakh Chicken Noodle Soup (Kespe-Style)", hindi: "कज़ाख चिकन नूडल सूप (केस्पे-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 560 }, // chicken thigh
      { foodId: "usda-168936", grams: 240 }, // flour, for noodles
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, for the noodle dough
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the chicken in 1.8 litres of salted water for 25 minutes; lift out, cut the meat into pieces and return it to the broth.",
      "Knead the flour, egg and a little water into a stiff dough, rest 20 minutes, roll thin and cut into short flat noodles.",
      "Add the potatoes and carrots to the broth and simmer 12 minutes.",
      "Drop in the noodles and simmer 4 minutes, until they are supple and just tender.",
      "Add the onion, sliced thin, for the final 2 minutes so it stays sweet and distinct.",
      "Serve the soup generously brothed, with noodles and chicken in every bowl.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-am-spas-style",
    name: { en: "Armenian Yogurt and Egg Soup (Spas-Style)", hindi: "आर्मेनियाई दही अंडा सूप (स्पास-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 400 }, // Greek yogurt, standing in for matsun
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-170284", grams: 80 }, // barley, standing in for wheat
      { foodId: "usda-168936", grams: 20 }, // flour, stabiliser
      { foodId: "usda-173475", grams: 10 }, // spearmint, standing in for the traditional herbs
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Spas is built on matsun, Armenia's set yogurt, which is not in the verified set — Greek yogurt takes its place, and the name says the dish is a style.",
      "Simmer the barley in 600 ml water for 25 minutes until tender; keep it in its liquid.",
      "Whisk the Greek yogurt with the flour and one egg until completely smooth — this mixture is what keeps the yogurt from splitting.",
      "Stir the yogurt mixture into the barley liquid gradually, then heat slowly, stirring constantly in one direction, until it just reaches a simmer; never let it boil.",
      "Poach the remaining egg in the soup for 3 minutes, or beat it in as ribbons, as you prefer.",
      "Serve warm or chilled, dotted with the butter and scattered with the spearmint.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  /* -------------------------------- African -------------------------------- */
  {
    id: "dish-et-doro-wat",
    name: { en: "Ethiopian Chicken Stew (Doro Wat)", hindi: "इथियोपियाई चिकन स्टू (डोरो वाट)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-171287", grams: 200 }, // eggs, boiled in the sauce
      { foodId: "usda-790646", grams: 500 }, // onion, in quantity — the base of the wat
      { foodId: "usda-171319", grams: 16 }, // chili powder, the backbone of the berbere-style blend
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170919", grams: 4 }, // cardamom, part of the blend
      { foodId: "usda-171324", grams: 4 }, // fenugreek seed, part of the blend
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Berbere, the Ethiopian spice blend, is not in the verified set — chili powder warmed with cardamom and fenugreek approximates its heat and perfume here, and the dish is seasoned boldly, as a wat should be.",
      "Cook the finely chopped onion in a dry pot over low heat for 20 minutes, stirring often, until it collapses into a deep, sweet paste — this slow onion base defines doro wat.",
      "Add the butter, garlic and ginger and cook 3 minutes, then stir in the chili powder, cardamom and fenugreek and cook 2 minutes more.",
      "Add the chicken pieces and salt with a little water and braise, covered, for 35 minutes, until the chicken is tender and the sauce thick, dark red and glossy with butter.",
      "Score the peeled boiled eggs, add them to the sauce and simmer 8 minutes so they stain red and drink the spice.",
      "Rest 5 minutes and serve the wat with an egg in every portion.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-et-misir-wat",
    name: { en: "Ethiopian Spiced Red Lentils (Misir Wat)", hindi: "इथियोपियाई मसाला लाल दाल (मिसिर वाट)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174284", grams: 480 }, // red lentils, dry weight
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-171319", grams: 12 }, // chili powder, berbere-style heat
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cook the onion in a dry pot over low heat for 15 minutes, stirring, until it collapses into a sweet paste — the wat technique of building flavour before any fat.",
      "Add the sunflower oil, garlic and ginger and cook 3 minutes, then stir in the chili powder for 1 minute.",
      "Add the rinsed red lentils and 1.2 litres of water and simmer 25 minutes, stirring often.",
      "The lentils should collapse into a thick, brick-red stew that holds a spoon's trail; loosen with water if it stands too firm.",
      "Season with the salt only near the end, once the lentils are completely soft.",
      "Rest 5 minutes and serve steaming.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-et-shiro-wat",
    name: { en: "Ethiopian Chickpea Flour Stew (Shiro Wat)", hindi: "इथियोपियाई बेसन स्टू (शिरो वाट)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174288", grams: 500 }, // chickpea flour (besan) — shiro is a flour stew
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-171319", grams: 10 }, // chili powder
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the chickpea flour with 1 litre of cold water until completely smooth — shiro lumps if the flour meets hot water first.",
      "Soften the onion in the sunflower oil for 8 minutes, then add the tomatoes and garlic and cook 8 minutes into a thick base.",
      "Stir in the chili powder for 30 seconds.",
      "Pour in the flour mixture in a slow stream, whisking constantly, and simmer 12 minutes, whisking often, until the stew thickens to a smooth, slow-bubbling porridge.",
      "Season with the salt; the shiro should coat a spoon thickly and taste of chickpea and spice, never of raw flour.",
      "Serve at once, while it is glossy and flowing.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-et-chicken-tibs",
    name: { en: "Ethiopian Sautéed Chicken (Chicken Tibs)", hindi: "इथियोपियाई भुना चिकन (चिकन टिब्स)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken breast into bite-size cubes and season with the salt.",
      "Sear the chicken in half the butter over high heat for 5 minutes until browned at the edges; set aside.",
      "In the same pan, cook the onion in the remaining butter for 6 minutes, then add the garlic and ginger for 1 minute.",
      "Add the green pepper and tomatoes and cook 5 minutes, until the tomatoes soften into a light sauce.",
      "Return the chicken, stir in the chili powder and cook 3 minutes more, until the chicken is cooked through and glossy with butter and spice.",
      "Serve immediately, straight from the pan — tibs waits for no one.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gh-groundnut-stew",
    name: { en: "Ghanaian Peanut Stew with Chicken (Groundnut Stew)", hindi: "घानाई मूंगफली चिकन स्टू (ग्राउंडनट स्टू)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 480 }, // chicken breast
      { foodId: "usda-172430", grams: 160 }, // peanuts, ground to a paste
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-2346404", grams: 300 }, // sweet potatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pound or blend the peanuts with a little water into a smooth, thick paste — the stew's body and richness come entirely from it.",
      "Brown the chicken pieces in a dry heavy pot for 6 minutes; set aside.",
      "Soften the onion in the chicken fat for 5 minutes, then add the tomatoes and ginger and cook 8 minutes into a thick base.",
      "Stir in the peanut paste with 600 ml water a little at a time, keeping the sauce smooth, and simmer 15 minutes, stirring often — peanut sauces catch on the base.",
      "Return the chicken with the sweet potato cubes and simmer 15 minutes more, until the chicken is tender, the sweet potato soft and the sauce glossy with peanut oil rising at the edges.",
      "Stir in the chili powder, adjust the salt, rest 5 minutes and serve.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gh-waakye",
    name: { en: "Ghanaian Rice and Cowpeas (Waakye)", hindi: "घानाई चावल लोबिया (वाक्ये)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 400 }, // cowpeas, dry weight
      { foodId: "usda-2512381", grams: 320 }, // white rice, raw weight
      { foodId: "usda-170172", grams: 100 }, // coconut milk
      { foodId: "usda-2512379", grams: 40 }, // millet, standing in for the waakye leaves' grain bed
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Waakye takes its reddish colour from sorghum leaves boiled with the pot, which are not in the verified set — this version cooks plainly and is honest about the paler result.",
      "Soak the cowpeas for 4 hours or overnight, drain, cover with fresh water and simmer 30 minutes until half tender.",
      "Add the millet and simmer 10 minutes — a little whole grain under the rice is an old market-cook's trick for texture.",
      "Add the rinsed rice and the salt with water to cover by 1 cm and cook on low heat, covered, for 18 minutes.",
      "Pour the coconut milk over the surface, cover and steam off the heat for 10 minutes.",
      "Fluff with a fork — the grains should be separate, the cowpeas tender and distinct — and serve hot.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-gh-jollof",
    name: { en: "Ghanaian Jollof Rice with Chicken", hindi: "घानाई जोलोफ़ चावल चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 560 }, // chicken thigh
      { foodId: "usda-2512381", grams: 360 }, // white rice, raw weight
      { foodId: "usda-170457", grams: 500 }, // tomatoes, the base of the stew
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Season the chicken with the salt and brown it in the sunflower oil for 8 minutes; set aside and keep the oil.",
      "Blend or finely chop the tomatoes, red pepper and half the onion into a base; slice the remaining onion.",
      "Fry the sliced onion in the chicken oil for 5 minutes, add the tomato base and cook 15 minutes, stirring, until the oil rises and the base tastes sweet and concentrated, not raw.",
      "Stir in the curry powder and chili powder, add the rinsed rice and water to barely cover, and lay the chicken pieces on top.",
      "Cover tightly and cook on the lowest heat for 25 minutes without stirring — jollof steams, and the bottom should catch slightly into the prized crisp layer.",
      "Rest 10 minutes, fluff the rice around the chicken, and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ng-egusi-style",
    name: { en: "Nigerian Melon-Seed-Style Soup with Chicken (Egusi-Style)", hindi: "नाइजीरियाई खरबूजा-बीज-स्टाइल सूप चिकन (एगुसी-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2515380", grams: 240 }, // pumpkin seeds (pepitas), standing in for egusi melon seeds
      { foodId: "usda-2646171", grams: 320 }, // chicken thigh
      { foodId: "usda-168462", grams: 300 }, // spinach, standing in for bitter leaf
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171410", grams: 40 }, // peanut oil
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Egusi soup is thickened with ground melon seeds, which are not in the verified set — pumpkin seeds, a recognised stand-in used by Nigerian cooks abroad, do the same work here, and the name says the dish is a style.",
      "Grind the pumpkin seeds to a fine powder.",
      "Brown the chicken pieces in the peanut oil for 6 minutes; add the onion and cook 4 minutes.",
      "Add water to make a soup and simmer 15 minutes, until the chicken is nearly tender.",
      "Stir in the ground seeds in a slow rain, stirring constantly, and simmer 10 minutes — the soup thickens and turns pale and rich as the seeds cook.",
      "Add the spinach and chili powder and simmer 3 minutes, until the leaves wilt; adjust the salt and serve thick.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ng-pepper-soup",
    name: { en: "Nigerian Chicken Pepper Soup", hindi: "नाइजीरियाई चिकन पेपर सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170106", grams: 40 }, // red hot chili peppers
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170931", grams: 4 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pepper soup's spice blend — grains of paradise, calabash nutmeg and more — is not in the verified set; black pepper, ginger and fresh chili build a simpler, honest heat here.",
      "Cover the chicken pieces with 1.6 litres of water and the salt and simmer 20 minutes, skimming once.",
      "Pound the red chilies, ginger and garlic to a paste and stir it into the broth with the onion and black pepper.",
      "Simmer 12 minutes more, until the chicken is tender and the broth fiercely aromatic.",
      "Taste carefully — pepper soup should be hot enough to make the forehead glow, but the chicken's flavour must still come through.",
      "Serve the broth clear and steaming, with plenty of chicken in every bowl.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ng-moi-moi",
    name: { en: "Nigerian Steamed Cowpea Pudding (Moi Moi)", hindi: "नाइजीरियाई लोबिया पुडिंग (मोई मोई)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 480 }, // cowpeas, dry weight
      { foodId: "usda-171287", grams: 200 }, // eggs, folded in and on top
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171410", grams: 40 }, // peanut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the cowpeas for 1 hour, then rub them between your palms in water to slip off the skins — moi moi is made with peeled beans, and the skins float away.",
      "Blend the peeled cowpeas with the red pepper, onion and a little water into a smooth, thick batter, the consistency of cake mix.",
      "Whisk in the peanut oil, the salt and the beaten eggs until the batter is glossy and holds soft peaks.",
      "Pour into oiled ramekins or a lined dish, set a halved boiled egg's worth of the remaining egg slices on top of each, and cover tightly.",
      "Steam over simmering water for 45 minutes, until the puddings are set, springy and cooked through to the centre.",
      "Rest 5 minutes, unmould and serve warm — moi moi should slice cleanly and taste richly of beans and pepper.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ke-githeri",
    name: { en: "Kenyan Beans and Corn (Githeri)", hindi: "केन्याई बीन्स मक्का (गिथेरी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 440 }, // kidney beans, dry weight
      { foodId: "usda-2710826", grams: 400 }, // corn kernels
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-171705", grams: 200 }, // avocado, served on top
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, drain, cover with fresh water and simmer 45 minutes until nearly tender.",
      "Add the potato cubes and simmer 15 minutes.",
      "Soften the onion for 5 minutes in a dry pan, add the tomatoes and cook 8 minutes into a sauce; stir it into the beans.",
      "Add the corn kernels and simmer 8 minutes more, until everything is tender and the pot is thick but still brothy.",
      "Season with the salt — beans and corn both ask for it.",
      "Serve with the avocado sliced over each bowl, the way githeri is eaten across Kenya.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ke-nyama-choma-style",
    name: { en: "Kenyan Grilled Chicken (Nyama Choma-Style)", hindi: "केन्याई ग्रिल्ड चिकन (न्यामा चोमा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 640 }, // chicken breast
      { foodId: "usda-170457", grams: 300 }, // tomatoes, for kachumbari
      { foodId: "usda-790646", grams: 200 }, // onion, for kachumbari
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-170497", grams: 30 }, // green hot chili peppers
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Nyama choma is Kenya's roast meat — classically goat or beef, neither of which anchors this wave; chicken grills in their place, and the name says it is a style.",
      "Rub the chicken with the salt and rest at least 30 minutes.",
      "Make the kachumbari: toss the finely chopped tomato and onion with the lemon juice, sliced green chilies and a pinch of the salt; rest so the juices run.",
      "Grill the chicken over high heat for 14–16 minutes, turning, until charred at the edges and cooked through — choma is about fire and patience.",
      "Rest the meat 5 minutes, then chop it into bite-size pieces on a board, as it is served in Kenya.",
      "Serve the chicken piled with the kachumbari and its juices spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-za-bobotie-style",
    name: { en: "South African Turkey Bobotie-Style", hindi: "दक्षिण अफ़्रीकी टर्की बोबोटी-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-171287", grams: 150 }, // eggs, binder and custard top
      { foodId: "usda-322892", grams: 200 }, // milk, for the custard
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-174683", grams: 80 }, // grapes, standing in for raisins
      { foodId: "usda-2346393", grams: 40 }, // almonds
      { foodId: "usda-170924", grams: 10 }, // curry powder
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Bobotie is South Africa's curried mince bake, traditionally beef; this turkey version keeps the custard top and sweet-sour spice, and the name says it is a style.",
      "Soften the onion for 6 minutes, add the ground turkey and brown for 8 minutes, breaking it into fine crumbs.",
      "Stir in the curry powder, turmeric, salt and chopped grapes — grapes stand in for the raisins of the original, which are not in the verified set — and simmer 5 minutes.",
      "Beat one of the eggs into the mince to bind it, then pack the mixture into a baking dish.",
      "Whisk the remaining egg with the milk and pour it over the top; lay the bay leaf in the centre and scatter the almonds.",
      "Bake at 180°C for 30 minutes, until the custard is set and golden; rest 10 minutes before serving.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-za-chakalaka",
    name: { en: "South African Spicy Beans (Chakalaka)", hindi: "दक्षिण अफ़्रीकी मसाला बीन्स (चकालाका)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 480 }, // navy beans, dry weight
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots, grated
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170924", grams: 10 }, // curry powder
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the navy beans overnight, drain and simmer in fresh water for 50 minutes until tender.",
      "Soften the onion and both peppers in the sunflower oil for 8 minutes.",
      "Add the grated carrots and cook 5 minutes, then the tomatoes, curry powder and chili powder and cook 8 minutes into a thick, bright sauce.",
      "Stir in the beans with a little of their cooking liquid and simmer 10 minutes, so the beans drink the spice.",
      "Season with the salt and rest 5 minutes — chakalaka is served warm or at room temperature, never bland.",
      "Serve the beans glossy and generously spiced.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-za-peri-peri",
    name: { en: "Peri Peri Chicken", hindi: "पेरी पेरी चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-170106", grams: 60 }, // red hot chili peppers, the peri peri heat
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-171413", grams: 40 }, // olive oil
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pound the red chilies with the garlic, salt and black pepper to a paste, then whisk in the olive oil and lemon juice — this is the peri peri marinade, fiery and sharp.",
      "Rub the marinade all over the chicken and rest at least 1 hour, or overnight for real depth.",
      "Grill over high heat for 14–16 minutes, turning and basting with the leftover marinade, until charred at the edges.",
      "The chicken is done when the thickest part is opaque and the juices run clear — rest it 5 minutes.",
      "Slice the chicken thickly and spoon any pan juices over.",
      "Serve with the remaining lemon squeezed over at the table.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-gh-red-red",
    name: { en: "Ghanaian Cowpea Stew with Fried Plantain (Red Red)", hindi: "घानाई लोबिया स्टू केला (रेड रेड)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 480 }, // cowpeas, dry weight
      { foodId: "usda-2710818", grams: 400 }, // plantains
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171410", grams: 50 }, // peanut oil
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the cowpeas for 4 hours or overnight, drain and simmer in fresh water for 45 minutes until tender.",
      "Soften the onion in half the peanut oil for 6 minutes, add the tomatoes and chili powder and cook 10 minutes into a deep red sauce — the first red of the name.",
      "Stir the sauce into the cowpeas and simmer 10 minutes, crushing a few beans to thicken.",
      "Fry the plantain slices in the remaining peanut oil for 3–4 minutes per side, until caramelised and deep golden — the second red.",
      "Season the stew with the salt and rest 3 minutes.",
      "Serve the beans with the fried plantain laid over, still glistening.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-ng-shrimp-okra",
    name: { en: "Nigerian Shrimp and Okra Soup", hindi: "नाइजीरियाई झींगा भिंडी सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 560 }, // shrimp
      { foodId: "usda-169260", grams: 400 }, // okra
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171410", grams: 40 }, // peanut oil
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice half the okra into rounds and chop the other half finely — the fine chop releases the mucilage that gives the soup its draw.",
      "Soften the onion in the peanut oil for 5 minutes, then add the tomatoes and cook 6 minutes.",
      "Add the okra with 500 ml water and simmer 8 minutes, stirring, until the soup turns glossy and draws in threads from the spoon.",
      "Stir in the chili powder and salt.",
      "Add the shrimp and cook 3 minutes, until they curl pink and are just opaque.",
      "Serve at once — okra soup waits for no one and thickens as it stands.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ke-pilau",
    name: { en: "Kenyan Chicken Pilau", hindi: "केन्याई चिकन पिलाउ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 560 }, // chicken thigh
      { foodId: "usda-2512381", grams: 360 }, // white rice, raw weight
      { foodId: "usda-790646", grams: 250 }, // onion, deeply browned — the pilau signature
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-170923", grams: 6 }, // cumin seed
      { foodId: "usda-170919", grams: 3 }, // cardamom
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Fry the onions in the sunflower oil over medium heat for 12–15 minutes, stirring, until deep mahogany — pilau's colour and sweetness come from this browning, and it cannot be rushed.",
      "Add the garlic, cumin, cardamom and cinnamon and stir for 30 seconds.",
      "Add the chicken pieces and brown for 6 minutes in the spiced onion.",
      "Add the potato cubes, the rinsed rice and water to cover by 1 cm, with the salt.",
      "Cover and cook on the lowest heat for 22 minutes without stirring, then rest off the heat for 10 minutes.",
      "Fluff the rice around the chicken — the grains should be separate, amber and fragrant — and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-et-azifa",
    name: { en: "Ethiopian Lentil Salad (Azifa)", hindi: "इथियोपियाई दाल सलाद (अज़ीफ़ा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 480 }, // lentils, dry weight
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170497", grams: 40 }, // green hot chili peppers
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170929", grams: 6 }, // mustard seed, ground
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the lentils in water for 20 minutes until just tender but still holding their shape — azifa lentils must never collapse.",
      "Drain well and spread on a tray to cool and steam dry for 10 minutes.",
      "Whisk the sunflower oil with the lemon juice, ground mustard seed and salt into a sharp dressing.",
      "Toss the warm lentils with the dressing, the finely chopped onion and the sliced green chilies.",
      "Rest at least 30 minutes so the lentils drink the dressing — azifa is made ahead, never at the last minute.",
      "Serve at room temperature or chilled, bright with lemon and heat.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-za-bunny-chow-style",
    name: { en: "Durban Chicken Curry in a Bread Bowl (Bunny Chow-Style)", hindi: "डरबन चिकन करी ब्रेड बाउल (बनी चाउ-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 240 }, // chicken breast
      { foodId: "usda-168936", grams: 160 }, // flour, for the loaf
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170924", grams: 10 }, // curry powder
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a dough, shape a small round loaf and bake at 190°C for 30 minutes; cool — a bunny chow needs a crust that can hold curry.",
      "Soften the onion in the sunflower oil for 5 minutes, stir in the curry powder for 30 seconds, then add the tomatoes and cook 8 minutes into a sauce.",
      "Add the chicken cubes and potato cubes with a little water and simmer 15 minutes, until the chicken is cooked and the potato tender.",
      "The curry should be thick — a watery curry collapses the bread.",
      "Cut the top from the loaf, hollow out the centre and fill generously with the curry, letting it soak into the crumb.",
      "Serve the filled loaf with its lid alongside, to be torn and dipped — a bunny chow is eaten with the hands.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-et-lentil-sambusa-style",
    name: { en: "Ethiopian Lentil Sambusa-Style Pastries", hindi: "इथियोपियाई दाल पेस्ट्री (साम्बुसा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 400 }, // lentils, dry weight
      { foodId: "usda-168936", grams: 240 }, // flour, for the wrappers
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-170497", grams: 30 }, // green hot chili peppers
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer the lentils for 18 minutes until just tender; drain very well — a wet filling makes soggy sambusa.",
      "Soften the onion in a spoonful of the sunflower oil for 6 minutes, add the cumin and green chilies for 1 minute, then stir in the lentils and salt and cook 3 minutes; cool the filling completely.",
      "Knead the flour with salted water into a firm dough, rest 20 minutes, roll very thin and cut into strips or rounds.",
      "Fill each piece with a spoonful of lentils, fold into triangles and seal the edges with water, pinching firmly.",
      "Fry in the remaining sunflower oil over medium heat for 3–4 minutes per side, until deep golden and crisp.",
      "Drain on a rack and serve hot, while the pastry shatters.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sn-yassa",
    name: { en: "Senegalese Chicken Yassa", hindi: "सेनेगाली चिकन यासा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-790646", grams: 600 }, // onion, in quantity — yassa is an onion dish
      { foodId: "usda-167746", grams: 120 }, // lemons, for the marinade
      { foodId: "usda-171413", grams: 40 }, // olive oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170929", grams: 10 }, // mustard seed, ground
      { foodId: "usda-170106", grams: 20 }, // red hot chili peppers
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Yassa is often finished with olives, which are not in the verified set — the lemon and onion carry it here, undiminished.",
      "Marinate the chicken in the lemon juice, ground mustard seed, crushed garlic, salt and half the olive oil for at least 1 hour, or overnight.",
      "Lift the chicken from the marinade and grill or sear it in a hot pan for 8 minutes until well browned; set aside and keep the marinade.",
      "Cook the sliced onions in the remaining olive oil over low heat for 15 minutes, until soft, sweet and golden at the edges.",
      "Add the reserved marinade and the red chilies and simmer 5 minutes — the onions should be bathed in a sharp, lemony sauce.",
      "Return the chicken to the onions and simmer 10 minutes, until cooked through and coated; serve the onions spooned generously over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-tz-kuku-paka",
    name: { en: "Tanzanian Chicken in Coconut Sauce (Kuku Paka)", hindi: "तंज़ानियाई चिकन नारियल सॉस (कुकु पाका)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Grill or sear the chicken pieces in the coconut oil for 8 minutes until well browned — kuku paka's chicken meets fire before it meets coconut.",
      "Soften the onion in the same pot for 5 minutes, then add the tomatoes, ginger, curry powder and turmeric and cook 8 minutes into a base.",
      "Pour in the coconut milk and simmer gently for 5 minutes without boiling hard.",
      "Return the chicken and simmer 15 minutes, until tender and the sauce is thick and fragrant.",
      "Sharpen with the lemon juice and adjust the salt.",
      "Serve the chicken glossy in its coconut sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-zw-chicken-sadza-style",
    name: { en: "Zimbabwean Chicken Stew with Cornmeal (Sadza-Style)", hindi: "ज़िम्बाब्वे चिकन स्टू मक्का (साद्ज़ा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-168867", grams: 280 }, // cornmeal, for the sadza
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-168462", grams: 300 }, // spinach, standing in for covo leaves
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171410", grams: 30 }, // peanut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Brown the chicken pieces in the peanut oil for 8 minutes; add the onion and cook 5 minutes.",
      "Add the tomatoes and a little water and braise, covered, for 25 minutes, until the chicken is tender and the sauce rich.",
      "Stir the spinach into the stew for the final 3 minutes, until wilted — it stands in for the covo leaves a Zimbabwean stew would carry.",
      "Meanwhile make the sadza: whisk the cornmeal into 1 litre of boiling salted water, then cook on low heat for 15 minutes, stirring hard, until it pulls away from the pot in a smooth, stiff mass.",
      "Wet a bowl, pack the sadza in and turn it out in a smooth mound.",
      "Serve the chicken stew around the sadza, to be pinched and dipped by hand.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------- Caribbean ------------------------------- */
  {
    id: "dish-jm-curry-chicken",
    name: { en: "Jamaican Curry Chicken", hindi: "जमैकाई करी चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170924", grams: 14 }, // curry powder
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Season the chicken with half the curry powder, the salt and the garlic and rest at least 30 minutes — Jamaican curry chicken is marinated in its spice.",
      "Heat the sunflower oil and fry the remaining curry powder and the chili powder for 30 seconds until dark and fragrant — burning the curry, as Jamaican cooks call it, is the foundation.",
      "Add the chicken and brown for 8 minutes in the spiced oil.",
      "Add the onion, carrots and potato with water to barely cover and simmer 25 minutes.",
      "The sauce should thicken from the potato and coat the chicken; the chicken should be falling from the bone.",
      "Rest 5 minutes and serve the curry deep yellow and generously sauced.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jm-brown-stew-chicken",
    name: { en: "Jamaican Brown Stew Chicken", hindi: "जमैकाई ब्राउन स्टू चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-334247", grams: 12 }, // sugar, for the browning
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Season the chicken with the salt and garlic and rest 30 minutes.",
      "Heat the sunflower oil, sprinkle in the sugar and let it melt to a deep amber — this browning gives the stew its colour and name; watch it closely, as it turns in seconds.",
      "Add the chicken at once and brown for 8 minutes in the caramelised oil, turning to coat every piece.",
      "Add the onion, both peppers, carrots and tomatoes with a little water, cover and braise on low heat for 30 minutes.",
      "Uncover and simmer 5 minutes more to thicken the sauce to a dark, glossy gravy.",
      "Rest 5 minutes and serve the chicken mahogany-brown in its sauce.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jm-stew-peas-style",
    name: { en: "Jamaican Stewed Peas with Coconut (Stew Peas-Style)", hindi: "जमैकाई बीन्स नारियल स्टू (स्टू पीज़-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 480 }, // kidney beans, dry weight
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-168936", grams: 120 }, // flour, for spinner dumplings
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Stew peas is traditionally enriched with salted pork or beef, neither of which is in the verified set — coconut milk carries the richness here, and the name says the dish is a style.",
      "Soak the kidney beans overnight, drain and simmer in fresh water for 45 minutes until nearly tender.",
      "Stir in the coconut milk, onion, garlic and chili powder and simmer 15 minutes.",
      "Knead the flour with a little water into a firm dough and roll small pieces between your palms into thin spinners; drop them into the stew.",
      "Simmer 10 minutes more, until the spinners are cooked through and the stew is thick and creamy — it should coat a spoon heavily.",
      "Season with the salt, rest 5 minutes and serve thick.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jm-escovitch-fish",
    name: { en: "Jamaican Pickled Fish (Escovitch Fish)", hindi: "जमैकाई अचारी मछली (एस्कोविच)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 360 }, // cod
      { foodId: "usda-173469", grams: 100 }, // cider vinegar, for the pickle
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 100 }, // green pepper
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-170106", grams: 15 }, // red hot chili peppers
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Season the cod with the salt, pat it dry and fry in the sunflower oil over high heat for 4 minutes per side, until crisp and golden — escovitch fish is fried hard before it is pickled.",
      "In the same pan, soften the onion, both peppers and carrots for 4 minutes, keeping their crunch.",
      "Add the cider vinegar and sliced red chilies and bring to a boil for 1 minute — the pickle should be fiercely sharp.",
      "Pour the hot pickle and vegetables over the fried fish.",
      "Rest at least 30 minutes, or overnight — escovitch improves as the fish drinks the vinegar.",
      "Serve at room temperature, the vegetables piled over the fish.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cu-fricase-de-pollo",
    name: { en: "Cuban Chicken Fricassee (Fricasé de Pollo)", hindi: "क्यूबाई चिकन फ्रिकासी (फ्रिकासे दे पोयो)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-173469", grams: 30 }, // cider vinegar, with lemon for the sour-orange note
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "A Cuban fricasé is sharpened with sour orange and finished with olives and capers, none of which are in the verified set — cider vinegar and lemon give the brightness here, plainly and without disguise.",
      "Marinate the chicken in the lemon juice, cider vinegar, garlic and salt for at least 30 minutes.",
      "Brown the chicken in the sunflower oil for 8 minutes; set aside and keep the marinade.",
      "Soften the onion and green pepper in the same pot for 6 minutes, then add the tomatoes and cook 8 minutes into a sofrito.",
      "Return the chicken with its marinade and the potato chunks, add a little water, cover and braise 25 minutes, until the chicken is tender and the potatoes soft.",
      "Rest 5 minutes and serve the fricassee in its bright, tomatoey sauce.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cu-arroz-con-pollo",
    name: { en: "Cuban Chicken and Rice (Arroz con Pollo)", hindi: "क्यूबाई चिकन चावल (अरोज़ कॉन पोयो)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2512381", grams: 360 }, // white rice, raw weight
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-172231", grams: 5 }, // turmeric, for the golden colour
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "The golden colour of arroz con pollo comes from bijol or saffron, neither in the verified set — turmeric does the tinting here, honestly and well.",
      "Brown the chicken pieces in the sunflower oil for 8 minutes; set aside.",
      "Soften the onion, red pepper and garlic in the same pot for 6 minutes, then add the tomatoes and cook 6 minutes into a sofrito.",
      "Stir in the turmeric and the rinsed rice, coating every grain, then add water to cover by 1 cm and the salt.",
      "Lay the chicken on top, cover and cook on the lowest heat for 22 minutes without stirring.",
      "Scatter the peas over, cover and rest off the heat for 10 minutes; fluff the rice around the chicken and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cu-picadillo-style",
    name: { en: "Cuban Turkey Picadillo-Style", hindi: "क्यूबाई टर्की पिकाडियो-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 640 }, // ground turkey
      { foodId: "usda-2346401", grams: 300 }, // potatoes, diced small
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-174683", grams: 100 }, // grapes, standing in for raisins
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Picadillo is ground beef with olives and raisins; beef is outside this wave and olives and raisins are outside the verified set — turkey and grapes carry this version, and the name says it is a style.",
      "Brown the ground turkey in the sunflower oil for 8 minutes, breaking it into small crumbs.",
      "Add the onion, green pepper and garlic and cook 6 minutes, then the cumin for 30 seconds.",
      "Add the tomatoes, potato dice and cider vinegar and simmer 15 minutes, until the potato is tender and the sauce thick.",
      "Stir in the halved grapes and simmer 2 minutes — they should stay distinct, little bursts of sweetness in the savoury mince.",
      "Adjust the salt and serve the picadillo glossy and richly spiced.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cu-moros",
    name: { en: "Cuban Black Beans and Rice (Moros y Cristianos)", hindi: "क्यूबाई काली बीन्स चावल (मोरोस)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 400 }, // black beans, dry weight
      { foodId: "usda-2512381", grams: 280 }, // white rice, raw weight
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the black beans overnight, drain and simmer in fresh water with the bay leaf for 45 minutes until tender; reserve the black cooking liquid — it colours the rice, which is the whole point of moros.",
      "Soften the onion, green pepper and garlic in the sunflower oil for 6 minutes, then stir in the cumin for 30 seconds.",
      "Add the rinsed rice and stir to coat in the sofrito.",
      "Add the beans with enough of their black liquid to cover the rice by 1 cm, add the salt, cover and cook on the lowest heat for 20 minutes.",
      "Rest off the heat for 10 minutes without lifting the lid.",
      "Fluff with a fork — the rice should be dark, separate and savoury, the beans whole — and serve.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-tt-pelau",
    name: { en: "Trinidadian Chicken and Pigeon Pea Rice (Pelau)", hindi: "त्रिनिदादी चिकन कबूतर मटर चावल (पेलाउ)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 520 }, // chicken thigh
      { foodId: "usda-2512381", grams: 240 }, // white rice, raw weight
      { foodId: "usda-172436", grams: 200 }, // pigeon peas, dry weight
      { foodId: "usda-170172", grams: 120 }, // coconut milk
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-334247", grams: 15 }, // sugar, for the caramelised base
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the pigeon peas for 4 hours or overnight, drain and simmer in fresh water for 30 minutes until half tender.",
      "Heat the sunflower oil, sprinkle in the sugar and let it melt to a dark caramel — pelau begins with burnt sugar, and the chicken colours in it.",
      "Add the chicken pieces at once and brown for 8 minutes, coating them in the caramel.",
      "Add the onion and red pepper and cook 4 minutes, then the rice, pigeon peas and coconut milk with water to barely cover, and the salt.",
      "Cover and cook on the lowest heat for 25 minutes without stirring, then rest 10 minutes.",
      "Fluff the rice around the chicken — pelau should be bronzed, savoury-sweet and just moist — and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-tt-doubles",
    name: { en: "Trinidadian Chickpea Curry with Flatbread (Doubles)", hindi: "त्रिनिदादी छोले करी रोटी (डबल्स)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 400 }, // chickpeas, dry weight
      { foodId: "usda-168936", grams: 240 }, // flour, for the bara flatbreads
      { foodId: "usda-2346406", grams: 200 }, // cucumber, for the topping
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-172231", grams: 6 }, // turmeric
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170106", grams: 15 }, // red hot chili peppers
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, drain and simmer in fresh water for 45 minutes until completely tender.",
      "Soften the onion in a little of the sunflower oil for 6 minutes, add the garlic, curry powder, turmeric and cumin and stir for 30 seconds, then add the chickpeas with some of their liquid and simmer 15 minutes, crushing a few to thicken the curry.",
      "Knead the flour with the salt and warm water into a soft dough; rest 20 minutes.",
      "Roll the dough into thin 12 cm rounds and fry in the remaining sunflower oil for 1 minute per side, until puffed and golden — these are the bara.",
      "Season the chickpeas with the salt and stir in the sliced red chilies.",
      "Serve two bara overlapped with the chickpea curry spooned over and the grated cucumber on top — doubles are eaten folded, with the hands.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-tt-fish-bake-style",
    name: { en: "Trinidadian Fried Fish and Bake (Shark and Bake-Style)", hindi: "त्रिनिदादी तली मछली बेक (शार्क एंड बेक-स्टाइल)" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 300 }, // tilapia, standing in for shark
      { foodId: "usda-168936", grams: 120 }, // flour, for the bake
      { foodId: "usda-2346407", grams: 150 }, // cabbage, for the slaw
      { foodId: "usda-170457", grams: 100 }, // tomatoes
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Shark and bake is Trinidad's beach icon; shark is not in the verified set, so tilapia fries in its place, and the name says the dish is a style.",
      "Knead the flour with salted water into a soft dough, rest 20 minutes, roll into two thick rounds and fry in half the sunflower oil for 3 minutes per side, until puffed and golden — these are the bakes.",
      "Season the tilapia with the salt and lemon juice and rest 10 minutes.",
      "Fry the fish in the remaining oil over high heat for 4 minutes per side, until crisp and flaking.",
      "Toss the shredded cabbage, tomato and cucumber with a pinch of the salt and a squeeze of the lemon into a quick slaw.",
      "Split the warm bakes, fill with the fried fish and slaw, and eat at once, while the bake is still crisp.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jm-run-down-style",
    name: { en: "Jamaican Fish in Coconut Sauce (Run Down-Style)", hindi: "जमैकाई मछली नारियल सॉस (रन डाउन-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Run down is mackerel poached in a coconut sauce that is cooked until it begins to split and custard — the name describes the sauce running down.",
      "Soften the onion and green pepper in the coconut oil for 6 minutes.",
      "Add the tomatoes and garlic and cook 6 minutes, then pour in the coconut milk.",
      "Simmer the sauce gently for 12 minutes, until it thickens and oil beads at the edges — do not rush this reduction.",
      "Lay the mackerel pieces into the sauce, add the chili powder and salt, cover and poach 8 minutes, until the fish flakes.",
      "Rest 3 minutes and serve the fish bathed in the thick coconut sauce.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cu-black-bean-soup",
    name: { en: "Cuban Black Bean Soup with Egg", hindi: "क्यूबाई काली बीन्स सूप अंडा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 480 }, // black beans, dry weight
      { foodId: "usda-171287", grams: 200 }, // eggs, chopped on top
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-170923", grams: 6 }, // cumin seed
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the black beans overnight, drain and simmer in fresh water for 50 minutes until completely tender.",
      "Soften the onion, green pepper and garlic in the sunflower oil for 7 minutes, then stir in the cumin for 30 seconds — this sofrito is the soup's base.",
      "Add the sofrito to the beans and simmer 15 minutes, crushing a ladleful of beans against the pot to thicken the soup to a rich, dark broth.",
      "Boil the eggs for 9 minutes, cool, peel and chop.",
      "Take the soup off the heat, stir in the cider vinegar and the salt — the vinegar is added last so it stays bright.",
      "Serve the soup with the chopped egg scattered over each bowl.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-tt-corn-soup",
    name: { en: "Trinidadian Corn and Chicken Soup", hindi: "त्रिनिदादी मक्का चिकन सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 520 }, // chicken thigh
      { foodId: "usda-2710826", grams: 400 }, // corn kernels
      { foodId: "usda-168936", grams: 160 }, // flour, for dumplings
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cover the chicken with 1.6 litres of water and the salt and simmer 22 minutes; lift out, cut the meat into pieces and return it to the broth.",
      "Add the potato cubes and carrots and simmer 10 minutes.",
      "Add the corn kernels and simmer 5 minutes.",
      "Knead the flour with a little water into a firm dough, roll it into small logs and drop them into the soup; simmer 5 minutes until the dumplings are cooked through.",
      "Stir in the coconut milk and warm through for 2 minutes without boiling — the soup turns creamy and golden from the corn.",
      "Serve generously, with dumplings and chicken in every bowl.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  /* --------------------------- Remaining Latin --------------------------- */
  {
    id: "dish-ar-milanesa-style",
    name: { en: "Argentinian Chicken Milanesa-Style", hindi: "अर्जेंटीनाई चिकन मिलानेसा-स्टाइल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-171287", grams: 100 }, // egg, for the coating
      { foodId: "usda-168936", grams: 60 }, // flour, for the coating
      { foodId: "usda-167746", grams: 40 }, // lemon, to serve
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "A milanesa is defined by its breadcrumb crust, and breadcrumbs are not in the verified set — a flour-and-egg crust fries up crisp and golden in their place, and the name says the dish is a style.",
      "Slice the chicken breast into two escalopes and pound them between sheets to an even 5 mm — even thickness is what makes a milanesa cook in minutes.",
      "Rub the chicken with the crushed garlic and salt and rest 15 minutes.",
      "Dip each escalope in the flour, then the beaten egg, then the flour again, pressing the coating on.",
      "Fry in the sunflower oil over medium-high heat for 3–4 minutes per side, until deep golden and crisp and the chicken just cooked through.",
      "Serve at once with the lemon squeezed over — milanesa waits for no one.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ar-pollo-crema",
    name: { en: "Argentinian Chicken in Cream Sauce (Pollo a la Crema)", hindi: "अर्जेंटीनाई चिकन क्रीम सॉस (पोयो आ ला क्रेमा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-322892", grams: 300 }, // milk, for the sauce
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-168936", grams: 30 }, // flour, to thicken
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Sear the chicken pieces in the butter over high heat for 6 minutes until golden; set aside.",
      "Cook the mushrooms and onion in the same pan for 6 minutes, until the mushrooms brown and their liquid evaporates.",
      "Whisk in the flour and cook 1 minute, then whisk in the milk gradually.",
      "Simmer the sauce 4 minutes until it coats a spoon.",
      "Return the chicken and simmer 5 minutes more, until cooked through and bathed in the sauce.",
      "Adjust the salt and serve the chicken glossy in its cream sauce.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ar-locro-style",
    name: { en: "Argentinian Bean, Corn and Potato Stew (Locro-Style)", hindi: "अर्जेंटीनाई बीन्स मक्का स्टू (लोक्रो-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 440 }, // navy beans, dry weight
      { foodId: "usda-2710826", grams: 320 }, // corn kernels
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Locro is Argentina's national stew of beans, corn and squash with meats; the squash and the mixed meats are outside this wave's set, so beans, corn and potato carry a plainer version, and the name says it is a style.",
      "Soak the navy beans overnight, drain and simmer in fresh water for 45 minutes until nearly tender.",
      "Add the potato cubes and simmer 15 minutes.",
      "Soften the onion in the sunflower oil for 6 minutes, stir in the chili powder off the heat, then add a ladle of the bean liquid and stir it into the pot.",
      "Add the corn and simmer 10 minutes more, crushing a few beans and potatoes so the stew turns thick and creamy.",
      "Season with the salt, rest 5 minutes and serve steaming.",
    ],
    timeMinutes: 65,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-cl-cazuela",
    name: { en: "Chilean Chicken Soup (Cazuela de Ave)", hindi: "चिलेई चिकन सूप (कासुएला)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-2710826", grams: 300 }, // corn kernels
      { foodId: "usda-2512381", grams: 160 }, // white rice, raw weight
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "A cazuela is served with a piece of corn on the cob and a wedge of pumpkin in every bowl; cob corn and pumpkin are not in the verified set, so kernels and extra potato stand in, plainly.",
      "Cover the chicken with 1.8 litres of water and the salt and simmer 25 minutes, skimming once.",
      "Add the potatoes, carrots, onion and green pepper and simmer 12 minutes.",
      "Add the rice and simmer 12 minutes more, until the grains are tender in the broth.",
      "Add the corn kernels for the final 5 minutes, keeping them sweet and distinct.",
      "Serve each bowl with a chicken piece, potato and a ladle of the golden broth.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cl-pastel-choclo-style",
    name: { en: "Chilean Corn and Chicken Pie (Pastel de Choclo-Style)", hindi: "चिलेई मक्का चिकन पाई (पास्तेल दे चोक्लो-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2710826", grams: 800 }, // corn kernels, for the topping
      { foodId: "usda-2646170", grams: 520 }, // chicken breast
      { foodId: "usda-171287", grams: 200 }, // eggs, in the filling
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-322892", grams: 100 }, // milk, for the corn paste
      { foodId: "usda-174683", grams: 60 }, // grapes, standing in for raisins
      { foodId: "usda-170923", grams: 4 }, // cumin seed
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pastel de choclo's filling is beef with olives and raisins; beef is outside this wave and olives and raisins outside the verified set — chicken and grapes fill it here, and the name says it is a style.",
      "Poach the chicken in salted water for 16 minutes; shred it coarsely. Boil the eggs for 9 minutes and slice them.",
      "Soften the onion for 6 minutes, add the shredded chicken, cumin and halved grapes and cook 4 minutes into the filling; season with the salt.",
      "Blend the corn kernels with the milk into a thick, coarse paste — it should hold a spoon's trail.",
      "Fill a baking dish with the chicken mixture, lay the egg slices over it and cover completely with the corn paste.",
      "Bake at 190°C for 30 minutes, until the corn top is golden and set at the edges; rest 10 minutes before serving.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cl-charquican-style",
    name: { en: "Chilean Turkey and Vegetable Mash (Charquicán-Style)", hindi: "चिलेई टर्की सब्ज़ी मैश (चार्किकान-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-171287", grams: 200 }, // eggs, fried on top
      { foodId: "usda-2710826", grams: 200 }, // corn kernels
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Charquicán is a beef and vegetable mash named for charqui, dried meat; ground turkey makes this version, and the name says it is a style.",
      "Boil the potatoes until completely tender, about 20 minutes; keep a cup of their water.",
      "Brown the ground turkey with the onion for 8 minutes, breaking it into coarse crumbs.",
      "Add the corn and green beans with a splash of the potato water and simmer 8 minutes.",
      "Mash the potatoes roughly — charquicán is a rustic mash, never a purée — and fold them through the turkey and vegetables with enough potato water to make it moist.",
      "Fry the eggs for 3 minutes and serve the mash topped with a fried egg each, as it is eaten in Chile.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-co-ajiaco-style",
    name: { en: "Colombian Chicken and Potato Soup (Ajiaco-Style)", hindi: "कोलंबियाई चिकन आलू सूप (अखियाको-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-2710826", grams: 300 }, // corn kernels
      { foodId: "usda-322892", grams: 200 }, // milk, swirled in at the end
      { foodId: "usda-171705", grams: 200 }, // avocado, served on top
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Ajiaco santafereño is defined by three potatoes and guascas, a herb not in the verified set, and is finished with capers and cream — this version keeps the chicken, potato and corn heart of it and says so in its name.",
      "Cover the chicken with 1.8 litres of water and the salt and simmer 20 minutes; lift out, shred coarsely and reserve the broth.",
      "Add the potatoes to the broth and simmer 20 minutes, until some begin to collapse and thicken the soup — ajiaco is bodied by its potatoes.",
      "Add the corn and simmer 5 minutes.",
      "Return the shredded chicken and warm through for 3 minutes.",
      "Serve with the milk swirled into each bowl and the avocado sliced over — the contrasts of hot soup, cool milk and avocado are the dish.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-co-frijoles-style",
    name: { en: "Colombian Red Beans with Plantain (Frijoles Antioqueños-Style)", hindi: "कोलंबियाई लाल बीन्स केला (फ्रिहोलेस-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 480 }, // kidney beans, dry weight
      { foodId: "usda-2710818", grams: 300 }, // plantains
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Antioqueño beans are enriched with pork, which is not in the verified set — plantain, cooked into the beans in the Colombian way, carries this version, and the name says it is a style.",
      "Soak the kidney beans overnight, drain and simmer in fresh water for 45 minutes until nearly tender.",
      "Add the plantain chunks and simmer 15 minutes, until they are soft and the beans completely tender.",
      "Soften the onion, carrots, tomatoes and garlic in the sunflower oil for 10 minutes into a thick hogao-style sauce.",
      "Stir the sauce into the beans and simmer 10 minutes, crushing a few beans so the pot turns thick and rich.",
      "Season with the salt, rest 5 minutes and serve steaming.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-co-sancocho",
    name: { en: "Colombian Chicken Soup with Roots (Sancocho de Gallina)", hindi: "कोलंबियाई चिकन सूप जड़ें (सान्कोचो)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-169985", grams: 400 }, // cassava
      { foodId: "usda-2710818", grams: 300 }, // plantains
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2710826", grams: 200 }, // corn kernels
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169997", grams: 30 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cover the chicken with 2 litres of water and the salt and simmer 25 minutes, skimming once.",
      "Add the cassava and potatoes and simmer 15 minutes.",
      "Add the plantain chunks and corn and simmer 12 minutes more, until every root is tender — a sancocho is judged by its roots being cooked to the same softness.",
      "Add the onion, sliced, for the final 5 minutes so it stays distinct.",
      "The broth should be golden and lightly thickened by the cassava.",
      "Serve in deep bowls with a chicken piece and a share of every root, scattered with the coriander leaves.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ve-pabellon-style",
    name: { en: "Venezuelan Chicken Pabellón-Style", hindi: "वेनेज़ुएलाई चिकन पाबेयोन-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 480 }, // chicken breast, shredded
      { foodId: "usda-173734", grams: 240 }, // black beans, dry weight
      { foodId: "usda-2512381", grams: 200 }, // white rice, raw weight
      { foodId: "usda-2710818", grams: 300 }, // plantains, fried
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pabellón criollo is shredded beef with black beans, rice and fried plantain; chicken — a recognised Venezuelan variant — takes the beef's place here, and the name says it is a style.",
      "Soak the black beans overnight, drain and simmer for 45 minutes until tender; season them with half the salt.",
      "Poach the chicken in salted water for 16 minutes, shred it finely, then stew it for 8 minutes with the softened onion, red pepper and garlic in half the sunflower oil.",
      "Cook the rice in salted water until tender and fluffy, about 15 minutes.",
      "Fry the plantain slices in the remaining oil for 3 minutes per side, until caramelised and golden.",
      "Compose each plate in pabellón's stripes — beans, rice, shredded chicken and plantain side by side — and serve.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ve-perico",
    name: { en: "Venezuelan Scrambled Eggs (Perico)", hindi: "वेनेज़ुएलाई अंडा भुर्जी (पेरिको)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 440 }, // eggs
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170108", grams: 100 }, // red pepper
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soften the onion and red pepper in the sunflower oil for 6 minutes until sweet.",
      "Add the tomatoes and cook 5 minutes, until they collapse into a juicy sofrito — perico's eggs cook in this, not in a dry pan.",
      "Season the sofrito with the salt.",
      "Pour in the beaten eggs and stir slowly over low heat for 3 minutes, until they set in soft, moist folds through the vegetables.",
      "Take off the heat while the eggs are still glossy — they finish in the pan's warmth.",
      "Serve immediately, piled high.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ar-parrilla-style",
    name: { en: "Argentinian Grilled Chicken with Coriander Chimichurri-Style", hindi: "अर्जेंटीनाई ग्रिल्ड चिकन चिमिचुरी-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 720 }, // chicken thigh
      { foodId: "usda-169997", grams: 60 }, // coriander leaves, standing in for parsley
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-171413", grams: 40 }, // olive oil
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173469", grams: 30 }, // cider vinegar
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Chimichurri is parsley and oregano, neither of which is in the verified set — coriander leaves make a brighter, different sauce in the same spirit, and the name says it is a style.",
      "Chop the coriander leaves and garlic finely and stir them with the olive oil, cider vinegar, lemon juice, chili powder and a pinch of the salt; rest the sauce at least 30 minutes so the flavours marry.",
      "Rub the chicken with the remaining salt and rest 20 minutes.",
      "Grill over high heat for 16–18 minutes, turning, until the skin is crisp and charred at the edges and the juices run clear — parrilla chicken is cooked over real fire or the hottest grill you have.",
      "Rest the chicken 5 minutes.",
      "Slice it thickly and spoon the chimichurri generously over, serving the rest alongside.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-co-changua",
    name: { en: "Colombian Milk and Egg Soup (Changua)", hindi: "कोलंबियाई दूध अंडा सूप (चांगुआ)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-322892", grams: 600 }, // milk
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Bring the milk to the barest simmer with the onion and salt — changua must never boil hard, or the milk splits.",
      "Crack the eggs directly into the simmering milk, two per bowl's worth, and poach for 3–4 minutes, until the whites are set and the yolks still soft.",
      "The broth should taste of warm milk and gentle onion, comforting and plain by design — this is Bogotá's breakfast for cold mornings.",
      "Divide the milk between bowls and slide two poached eggs into each.",
      "Scatter the coriander leaves over the top.",
      "Serve immediately, while the yolks are still ready to break into the broth.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ar-carbonada-style",
    name: { en: "Argentinian Turkey and Corn Stew (Carbonada-Style)", hindi: "अर्जेंटीनाई टर्की मक्का स्टू (कार्बोनादा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-2710826", grams: 300 }, // corn kernels
      { foodId: "usda-2346404", grams: 300 }, // sweet potatoes
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-174683", grams: 80 }, // grapes, standing in for dried apricots and peaches
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Carbonada is a beef stew sweetened with dried fruit and corn; ground turkey and fresh grapes make this version, and the name says it is a style.",
      "Brown the ground turkey with the onion for 8 minutes, breaking it into coarse crumbs.",
      "Add the tomatoes and cook 6 minutes into a base.",
      "Add the potato and sweet potato cubes with water to barely cover and simmer 18 minutes.",
      "Add the corn and halved grapes and simmer 5 minutes more — the grapes should soften but stay distinct, giving the stew its sweet-savoury character.",
      "Season with the salt, rest 5 minutes and serve the stew thick and gently sweet.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-ve-cachapas-style",
    name: { en: "Venezuelan Corn Pancakes with Cheese (Cachapas-Style)", hindi: "वेनेज़ुएलाई मक्का पैनकेक चीज़ (काचापास-स्टाइल)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2710826", grams: 300 }, // corn kernels
      { foodId: "usda-329370", grams: 180 }, // mozzarella, standing in for queso de mano
      { foodId: "usda-168867", grams: 60 }, // cornmeal, to bind the batter
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-322892", grams: 80 }, // milk
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cachapas are folded around queso de mano, a Venezuelan hand cheese outside the verified set — mozzarella melts in its place, and the name says the dish is a style.",
      "Blend the corn kernels with the milk, egg and salt into a coarse, thick batter — it should keep some kernel texture, never a smooth purée.",
      "Stir in the cornmeal and rest the batter 10 minutes to thicken.",
      "Cook ladles of batter in the butter over medium heat for 3 minutes per side, until deep golden and set at the edges.",
      "Lay the mozzarella over each hot pancake and fold it in half; return to the pan for 1 minute so the cheese melts and pulls.",
      "Serve at once, while the cheese stretches.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
];
