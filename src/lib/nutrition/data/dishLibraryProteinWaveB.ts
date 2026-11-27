/**
 * Protein Wave B (2026-11-26, owner directive: three waves adding
 * 200+ healthy, protein-rich or balanced dishes; this is wave two,
 * ~70 dishes, after wave A's 70). Two shelves, one file, exactly
 * wave A's shape:
 *
 * PROTEIN_WAVE_B_DISHES, protein-rich mains and breakfasts. Every
 * dish computes to at least 25 g of protein per serving through
 * `dishNutrients`, pinned by dishLibraryProteinWaveB.test.ts, which
 * computes rather than asserts, the standing protein-wave bar
 * (PW-1..PW-4). These dishes join PROTEIN_WAVE_DISH_IDS where the
 * library is assembled.
 *
 * BALANCED_WAVE_B_DISHES, balanced plates: a real protein anchor,
 * vegetables and a grain or base on one plate, honestly portioned.
 * They compute below the 25 g bar and do NOT join the protein-wave
 * set; the wave test pins their shape (anchor + vegetable + base,
 * at least 12 g of protein a serving) instead of the bar.
 *
 * Composed only from the verified reference set (all 168 foods,
 * every source, the M-230 foods and the CoFID paneer included; no
 * new foods, no invented nutrients, no protein powders). Beef and
 * pork appear where a classic is built on them, per the owner's
 * 2026-11-26 decision, costed from the set's ground beef, ground
 * pork and pork loin. Paneer dishes cost the CoFID paneer record
 * (cofid-12-495) directly, the food is in the set now, so the old
 * cottage-cheese stand-in is not used for paneer here. No dish
 * duplicates an existing library dish by name or by recipe
 * (checked against the whole library, normalised, see the wave
 * test; wave A's mujadara and chana-paneer catches are the lesson
 * this file was written under).
 */

import type { Dish } from "../dishes";

export const PROTEIN_WAVE_B_DISHES: readonly Dish[] = [
  /* --------------------- international protein mains --------------------- */
  {
    id: "dish-pwb-tandoori-chicken",
    name: { en: "Tandoori-Style Chicken", hindi: "तंदूरी चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 680 }, // chicken breast
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt, for the marinade
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-171319", grams: 8 }, // chilli powder
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the yogurt with the garlic, ginger, chilli powder, cumin, turmeric, lemon juice and salt into the tandoori marinade.",
      "Slash the chicken breasts twice across the thick end and coat them in the marinade for at least 30 minutes.",
      "Heat the oven to its hottest setting with a heavy tray inside, or heat a ridged griddle until smoking.",
      "Lift the chicken from the marinade, brush it with the oil and cook for about 10 minutes a side, until charred at the edges and cooked through.",
      "Rest the chicken for 5 minutes so the juices settle.",
      "Slice thickly and serve with the lemon wedges and any pan juices spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwb-beef-rendang",
    name: { en: "Beef Rendang (Minced Beef, Dry Curry)", hindi: "बीफ़ रेनडांग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 640 }, // ground beef
      { foodId: "usda-170172", grams: 240 }, // coconut milk
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-169231", grams: 24 }, // ginger
      { foodId: "usda-171319", grams: 8 }, // chilli powder
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-170922", grams: 6 }, // coriander seed, ground in the method
      { foodId: "usda-167765", grams: 24 }, // tamarind
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the onion, garlic, ginger, chilli powder, turmeric and ground coriander seed with a splash of water into the rendang paste.",
      "Fry the paste in the oil for 5 minutes, until it darkens and the oil rises at the edges.",
      "Add the beef and fry for 8 minutes, breaking it up, until it browns and takes the paste.",
      "Pour in the coconut milk and tamarind, season with the salt and bring to a bare simmer.",
      "Cook uncovered for about 35 minutes, stirring now and then, until the sauce dries down and clings to the beef in a dark, oily coat. This slow drying is what makes it rendang, a minced-beef version of the classic.",
      "Rest 5 minutes and serve with the sauce scraped over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-beef-stroganoff-style",
    name: { en: "Beef Stroganoff-Style (Beef and Mushrooms in Yogurt Sauce)", hindi: "बीफ़ स्ट्रोगानॉफ़" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 600 }, // ground beef
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170903", grams: 200 }, // Greek yogurt, lowfat, standing in for the sour cream
      { foodId: "usda-170929", grams: 12 }, // mustard seed, ground in the method
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Brown the beef in the olive oil in a wide pan for 8 minutes, breaking it up, until it colours deeply.",
      "Lift the beef out and soften the onion and mushrooms in the same pan for 8 minutes, until the mushrooms give up their liquid and brown.",
      "Stir in the garlic and ground mustard seed and cook for 1 minute.",
      "Return the beef with a splash of water, season with the salt and pepper and simmer for 5 minutes.",
      "Take the pan off the heat and stir the yogurt through in spoonfuls so it warms without splitting, yogurt stands in for the classic sour cream, and the name says so.",
      "Serve at once, the sauce spooned generously over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-salisbury-steak-style",
    name: { en: "Salisbury Steak-Style (Beef Patties in Mushroom Sauce)", hindi: "सैलिसबरी स्टेक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 640 }, // ground beef
      { foodId: "usda-171287", grams: 50 }, // egg, as binder
      { foodId: "usda-1750347", grams: 240 }, // mushrooms
      { foodId: "usda-790646", grams: 240 }, // onion
      { foodId: "usda-168936", grams: 20 }, // white flour, to thicken the sauce
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Mix the beef with the beaten egg, half the finely chopped onion, the salt and pepper, and rest the mixture for 10 minutes.",
      "Shape the mixture into 4 thick oval patties.",
      "Sear the patties in the oil in a heavy pan for 5 minutes a side, until browned and cooked through, then lift them out to rest.",
      "Soften the remaining onion and the mushrooms in the same pan for 6 minutes, stir in the garlic and flour and cook for 1 minute.",
      "Pour in 300 ml of water slowly, stirring, and simmer into a mushroom sauce for 4 minutes.",
      "Return the patties to the sauce for 2 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-char-siu-pork",
    name: { en: "Char Siu-Style Pork Loin", hindi: "चार सिउ पोर्क" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 640 }, // pork loin
      { foodId: "usda-169640", grams: 32 }, // honey, for the glaze
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171320", grams: 2 }, // cinnamon, with the cloves standing in for five-spice
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-173469", grams: 15 }, // cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Stir the honey with the crushed garlic, grated ginger, cinnamon, cloves, vinegar and salt into the char siu marinade, cinnamon and clove stand in for the five-spice the set does not carry.",
      "Coat the pork loin in the marinade and leave it for at least 1 hour, turning it once.",
      "Heat the oven to 200°C and set the pork on a rack over a tray with a little water in it.",
      "Roast for about 30 minutes, brushing with the marinade twice, until the edges char and the pork is cooked through.",
      "Rest the pork for 10 minutes under foil.",
      "Slice it thickly across the grain and spoon the tray juices over.",
    ],
    timeMinutes: 110,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwb-pork-sinigang-style",
    name: { en: "Pork Sinigang-Style (Pork in Tamarind Soup)", hindi: "पोर्क सिनिगांग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 560 }, // pork loin, cubed
      { foodId: "usda-167765", grams: 120 }, // tamarind, for the sour broth
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-169308", grams: 200 }, // taro
      { foodId: "usda-168462", grams: 160 }, // spinach, standing in for the kangkong
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the pork in 1.2 litres of water for 25 minutes, skimming the surface, until it turns tender.",
      "Soak the tamarind in a cup of the hot broth, squeeze it out and strain the sour liquor back into the pot.",
      "Add the onion, tomatoes and taro and simmer for 10 minutes, until the taro softens at the edges.",
      "Add the green chilli and simmer for 2 minutes, then stir the spinach through until it wilts. The spinach stands in for the kangkong the set does not carry.",
      "Season with the salt and taste for sourness, the broth should be frankly sour, as sinigang is.",
      "Serve in deep bowls with plenty of the broth.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-pork-vindaloo",
    name: { en: "Goan Pork Vindaloo", hindi: "गोवन पोर्क विंदालू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin, cubed
      { foodId: "usda-173469", grams: 45 }, // cider vinegar, for the marinade and sauce
      { foodId: "usda-1104647", grams: 30 }, // garlic
      { foodId: "usda-171319", grams: 10 }, // chilli powder
      { foodId: "usda-170929", grams: 8 }, // mustard seed
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-172337", grams: 14 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the garlic with the chilli powder, mustard seed, cumin, turmeric, salt and half the vinegar into the vindaloo paste.",
      "Coat the pork in the paste and leave it for at least 1 hour, overnight is the Goan way.",
      "Soften the onion in the mustard oil for 8 minutes, until it turns deep gold.",
      "Add the pork with all its marinade and fry for 8 minutes, until it browns and the paste darkens.",
      "Pour in 250 ml of water and the remaining vinegar, add the potato and simmer gently for 30 minutes, until the pork is tender and the sauce is thick and sharp.",
      "Rest 10 minutes, vindaloo is better for the rest, and serve.",
    ],
    timeMinutes: 120,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-pork-potstickers-style",
    name: { en: "Pork and Cabbage Potstickers-Style", hindi: "पोर्क पॉटस्टिकर्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 560 }, // ground pork
      { foodId: "usda-168936", grams: 240 }, // white flour, for the wrappers
      { foodId: "usda-2346407", grams: 300 }, // cabbage
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-171025", grams: 14 }, // sunflower oil, for the pan
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a smooth dough, cover and rest it for 30 minutes.",
      "Salt the shredded cabbage, leave it 10 minutes, then squeeze it dry and mix it into the pork with the ginger, garlic, sesame oil and remaining salt.",
      "Roll the dough thin and cut 20 rounds; fill each with a spoonful of the pork mixture, pleat the edges and press them shut.",
      "Set the potstickers flat-side down in the sunflower oil in a wide lidded pan and fry for 3 minutes, until the bases crisp.",
      "Pour in 120 ml of water, cover at once and steam for 6 minutes, until the wrappers turn translucent and the pork is cooked through.",
      "Uncover, let the bases crisp again for 1 minute and serve straight from the pan.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-hemp-salmon",
    name: { en: "Hemp-Crusted Salmon", hindi: "हेम्प क्रस्टेड सैल्मन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 600 }, // salmon
      { foodId: "usda-170148", grams: 60 }, // hemp seeds, for the crust
      { foodId: "usda-170150", grams: 12 }, // sesame seeds, in the crust
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-2346400", grams: 300 }, // green beans
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Season the salmon with the salt and pepper and press the hemp and sesame seeds over the flesh side in an even crust.",
      "Steam the green beans over boiling water for 5 minutes, until just tender, then toss them in the sesame oil.",
      "Set the salmon crust-side up in a hot dry non-stick pan and cook for 6 minutes without moving it.",
      "Turn it once, carefully, and cook for 2 minutes more, until the crust is golden and the fish flakes.",
      "Squeeze the lemon over the fish.",
      "Serve the salmon over the green beans at once, while the crust is crisp.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-thai-fish-cakes-style",
    name: { en: "Thai Fish Cakes-Style (Tod Mun Pla)", hindi: "थाई फ़िश केक्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-171287", grams: 50 }, // egg, as binder
      { foodId: "usda-2346400", grams: 160 }, // green beans, cut fine
      { foodId: "usda-170924", grams: 10 }, // curry powder, standing in for the red curry paste
      { foodId: "usda-169714", grams: 40 }, // rice flour, to firm the cakes
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-171410", grams: 21 }, // peanut oil, for shallow frying
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blitz the tilapia with the egg, curry powder, chilli and salt into a sticky paste, curry powder stands in for the red curry paste the set does not carry, and the name says the cakes are a style.",
      "Rest the paste for 15 minutes in the fridge so it firms.",
      "Stir the rice flour and the finely cut green beans through the paste.",
      "With wet hands, shape the paste into 12 small flat cakes.",
      "Shallow-fry the cakes in the peanut oil for about 3 minutes a side, until golden and springy.",
      "Drain on paper for a minute and serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwb-cod-chickpea-stew",
    name: { en: "Cod and Chickpea Stew", hindi: "कॉड छोले स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 560 }, // cod
      { foodId: "usda-2644282", grams: 200 }, // chickpeas, dry weight
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-171319", grams: 4 }, // chilli powder, for warmth in place of smoked paprika
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then simmer them in fresh water for about 45 minutes, until tender, and drain them, keeping a cup of their liquid.",
      "Soften the onion and garlic in the olive oil for 6 minutes, stir in the chilli powder and cook for 1 minute.",
      "Add the tomatoes and simmer for 10 minutes into a thick sauce.",
      "Stir in the chickpeas with a splash of their liquid and simmer for 5 minutes so they take the sauce.",
      "Lay the cod over the chickpeas, cover and cook gently for 8 minutes, until the fish flakes.",
      "Fold the spinach through until it wilts and serve in deep bowls.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-tuna-pasta-bake",
    name: { en: "Tuna and Cheddar Pasta Bake", hindi: "ट्यूना पास्ता बेक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 440 }, // canned tuna in water, drained
      { foodId: "usda-168933", grams: 280 }, // semolina, milled into the pasta
      { foodId: "usda-328637", grams: 120 }, // cheddar
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-168936", grams: 20 }, // white flour, for the sauce
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the semolina with warm water into a stiff pasta dough, rest it, then roll it and cut it into short tubes; boil them for 3 minutes and drain.",
      "Melt the butter, stir in the flour and cook for 1 minute, then pour in the milk slowly, stirring, and simmer into a smooth sauce.",
      "Take the sauce off the heat and stir in two-thirds of the cheddar, the salt and pepper.",
      "Fold the pasta, tuna and peas through the sauce and tip it all into a baking dish.",
      "Scatter the remaining cheddar over and bake at 200°C for 20 minutes, until the top is golden and bubbling.",
      "Rest 5 minutes before serving so the bake settles.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwb-turkey-tetrazzini-style",
    name: { en: "Turkey Tetrazzini-Style (Turkey and Mushroom Pasta Bake)", hindi: "टर्की टेट्राज़िनी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 520 }, // turkey breast
      { foodId: "usda-168933", grams: 240 }, // semolina, milled into the pasta
      { foodId: "usda-1750347", grams: 240 }, // mushrooms
      { foodId: "usda-325036", grams: 60 }, // parmesan
      { foodId: "usda-322892", grams: 160 }, // whole milk
      { foodId: "usda-168936", grams: 20 }, // white flour, for the sauce
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Poach the turkey breast in salted water for 15 minutes, until cooked through, then rest it and slice it thickly, keeping the poaching liquid.",
      "Knead the semolina with warm water into a stiff pasta dough, rest it, roll and cut it into ribbons; boil them for 3 minutes and drain.",
      "Melt the butter and soften the mushrooms and garlic for 6 minutes; stir in the flour and cook for 1 minute.",
      "Pour in the milk and a ladle of the poaching liquid slowly, stirring, and simmer into a smooth sauce; stir in half the parmesan, the salt and pepper.",
      "Fold the pasta and turkey through the sauce, tip it into a baking dish and scatter the remaining parmesan over.",
      "Bake at 200°C for 18 minutes, until golden at the edges, and rest 5 minutes before serving.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwb-chicken-alfredo-style",
    name: { en: "Chicken Alfredo-Style Pasta", hindi: "चिकन अल्फ्रेडो पास्ता" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-168933", grams: 280 }, // semolina, milled into the pasta
      { foodId: "usda-325036", grams: 80 }, // parmesan
      { foodId: "usda-322892", grams: 160 }, // whole milk
      { foodId: "usda-173410", grams: 21 }, // butter
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the semolina with warm water into a stiff pasta dough, rest it, then roll it and cut it into wide ribbons; boil them for 3 minutes and drain, keeping a cup of the pasta water.",
      "Season the chicken with the salt and pepper and sear it in half the butter in a heavy pan for about 6 minutes a side, until golden and cooked through; rest it and slice it thickly.",
      "Melt the remaining butter in the same pan and soften the garlic for 1 minute without colouring it.",
      "Pour in the milk and a splash of pasta water and simmer for 2 minutes, then stir in the parmesan until the sauce turns glossy, milk lightens the classic cream sauce, and the name says it is a style.",
      "Fold the pasta through the sauce with another splash of pasta water until every ribbon is coated.",
      "Serve the pasta in bowls with the sliced chicken laid over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-beef-bolognese",
    name: { en: "Beef Bolognese with Pasta", hindi: "बीफ़ बोलोग्नीज़ पास्ता" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 560 }, // ground beef
      { foodId: "usda-168933", grams: 280 }, // semolina, milled into the pasta
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-325036", grams: 40 }, // parmesan, to serve
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Brown the beef in the olive oil in a heavy pot for 10 minutes, breaking it up, until it colours deeply and the pan dries.",
      "Add the finely chopped onion, carrot and garlic and cook for 6 minutes, until soft.",
      "Pour in the tomatoes with a splash of water, season with the salt and pepper and bring to a bare simmer.",
      "Cook the bolognese gently for 40 minutes, stirring now and then, until it turns thick, dark and rich.",
      "Knead the semolina with warm water into a stiff pasta dough, rest it, roll and cut it into ribbons; boil them for 3 minutes and drain.",
      "Fold the pasta through the sauce and serve with the parmesan scattered over.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-carbonara-style",
    name: { en: "Carbonara-Style Pasta (Egg, Pork and Parmesan)", hindi: "कार्बोनारा पास्ता" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 320 }, // pork loin, cut into lardons
      { foodId: "usda-171287", grams: 150 }, // egg, for the sauce
      { foodId: "usda-325036", grams: 80 }, // parmesan
      { foodId: "usda-168933", grams: 280 }, // semolina, milled into the pasta
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170931", grams: 4 }, // black pepper, plenty of it
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the semolina with warm water into a stiff pasta dough, rest it, then roll it and cut it into long ribbons; boil them in salted water for 3 minutes and drain, keeping a cup of the pasta water.",
      "Fry the pork lardons in a dry heavy pan for 8 minutes, until crisp at the edges and their fat has rendered; add the garlic for the last minute.",
      "Whisk the eggs with the parmesan, the black pepper and a pinch of the salt into a thick sauce.",
      "Take the pan off the heat, add the pasta with a splash of its water and toss it through the pork.",
      "Pour the egg sauce over and toss quickly for 1 minute, off the heat, until it turns glossy and clings, the pan's warmth cooks it; direct heat would scramble it.",
      "Serve at once with more black pepper ground over.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-shrimp-poke-bowl-style",
    name: { en: "Shrimp Poke Bowl-Style", hindi: "झींगा पोके बाउल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 480 }, // shrimp, cooked for the bowl
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry weight
      { foodId: "usda-168410", grams: 160 }, // edamame
      { foodId: "usda-2346406", grams: 240 }, // cucumber
      { foodId: "usda-170150", grams: 12 }, // sesame seeds
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, to season the rice
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Simmer the rice in salted water until tender, rest it covered for 10 minutes, then fold the vinegar and salt through it while it is warm.",
      "Poach the shrimp in salted water for 3 minutes, until they turn pink and curl, then drain and cool them, the bowl is built on cooked shrimp, not raw fish.",
      "Steam the edamame for 4 minutes and pop the beans from their pods.",
      "Slice the cucumber into thin half-moons.",
      "Divide the rice between four bowls and arrange the shrimp, edamame and cucumber over it in sections.",
      "Drizzle the sesame oil over and scatter the sesame seeds to finish.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-chicken-marsala-style",
    name: { en: "Chicken Marsala-Style (Chicken in Mushroom Sauce)", hindi: "चिकन मार्साला" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast, sliced into cutlets
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-168936", grams: 40 }, // white flour, for dusting
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173469", grams: 16 }, // cider vinegar, standing in for the Marsala wine
      { foodId: "usda-169640", grams: 8 }, // honey, for the wine's sweetness
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Slice the chicken breasts into thin cutlets, season them with the salt and black pepper and dust them lightly in the flour.",
      "Sear the cutlets in the butter and olive oil in a wide pan for about 4 minutes a side, until golden and cooked through; lift them out.",
      "Fry the mushrooms in the same pan for 6 minutes, until they give up their liquid and brown.",
      "Add the garlic and cook for 1 minute.",
      "Pour in the vinegar with the honey and 150 ml of water and simmer for 3 minutes, scraping the pan, until the sauce turns glossy, vinegar and honey stand in for the Marsala wine the set does not carry, and the name says it is a style.",
      "Return the chicken to the pan and simmer for 3 minutes, turning it in the sauce, and serve with the mushrooms spooned over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-murgh-cholay",
    name: { en: "Chicken and Chickpea Curry (Murgh Cholay)", hindi: "मुर्ग़ छोले" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 480 }, // chicken thigh
      { foodId: "usda-2644282", grams: 200 }, // chickpeas, dry weight
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171025", grams: 21 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then simmer them in fresh water for about 45 minutes, until tender, and drain them, keeping a cup of their liquid.",
      "Soften the onion in the oil for 8 minutes, until golden, then add the garlic and ginger and cook for 1 minute.",
      "Stir in the curry powder and turmeric, add the tomatoes and cook for 8 minutes into a thick masala.",
      "Add the chicken and fry for 8 minutes, until it colours and takes the masala.",
      "Add the chickpeas with a splash of their liquid, season with the salt and simmer for 15 minutes, until the chicken is tender and the gravy coats both. This is Lahore's murgh cholay, chicken and chickpeas in one pot.",
      "Rest 5 minutes and serve.",
    ],
    timeMinutes: 80,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-dahi-chicken",
    name: { en: "Dahi Chicken (Chicken in Spiced Yogurt)", hindi: "दही चिकन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast, cubed
      { foodId: "usda-170903", grams: 240 }, // Greek yogurt, lowfat
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-170922", grams: 4 }, // coriander seed, ground in the method
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-171314", grams: 14 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the yogurt with the garlic, ginger, cumin, ground coriander seed, chilli powder and salt and coat the chicken in it for 30 minutes.",
      "Soften the onion in the ghee for 8 minutes, until deep gold.",
      "Add the chicken with all its marinade and fry for 8 minutes, stirring, until the yogurt starts to thicken around it.",
      "Cover and cook gently for 15 minutes, until the chicken is tender and the sauce clings, keep the heat low so the yogurt does not split.",
      "Rest 5 minutes so the sauce settles.",
      "Serve with the sauce spooned generously over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-chicken-hariyali",
    name: { en: "Chicken Hariyali (Coriander and Mint Chicken)", hindi: "चिकन हरियाली" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast, cubed
      { foodId: "usda-169997", grams: 60 }, // coriander leaves
      { foodId: "usda-173475", grams: 30 }, // spearmint leaves
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt, for the marinade
      { foodId: "usda-170497", grams: 12 }, // green chilli
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the coriander leaves, mint, green chilli, garlic, ginger, lemon juice and yogurt into the green hariyali marinade.",
      "Coat the chicken in the marinade and leave it for 30 minutes.",
      "Heat the oil in a heavy pan until it shimmers and add the chicken with all its marinade.",
      "Fry for about 12 minutes, turning the pieces, until the chicken is cooked through and the green sauce dries down and clings.",
      "Rest the chicken for 3 minutes.",
      "Serve at once, while the sauce is at its greenest.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-chicken-sukka-style",
    name: { en: "Chicken Sukka-Style (Mangalorean Dry Chicken)", hindi: "चिकन सुक्का" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170169", grams: 120 }, // coconut meat, grated in the method
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171319", grams: 8 }, // chilli powder
      { foodId: "usda-170922", grams: 6 }, // coriander seed, ground in the method
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-330458", grams: 14 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Dry-roast the grated coconut in a pan for 4 minutes, until it turns deep gold, and set it aside.",
      "Soften the onion in the coconut oil for 8 minutes, then add the garlic and ginger and cook for 1 minute.",
      "Stir in the chilli powder, ground coriander seed and turmeric and cook for 1 minute.",
      "Add the chicken and salt and fry for 10 minutes, until it colours.",
      "Cover and cook gently for 12 minutes in its own juices, until tender.",
      "Uncover, stir the roasted coconut through and fry for 3 minutes, until the masala is dry and clings, sukka means dry, and the name says this is the Mangalorean style.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-prawn-pepper-fry",
    name: { en: "Prawn Pepper Fry", hindi: "झींगा काली मिर्च फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 600 }, // shrimp (prawns)
      { foodId: "usda-170931", grams: 8 }, // black pepper, crushed coarse
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171323", grams: 3 }, // fennel seed, crushed in the method
      { foodId: "usda-330458", grams: 21 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Crush the black pepper and fennel seed together coarsely.",
      "Soften the onion in the coconut oil for 6 minutes, until it turns gold at the edges.",
      "Add the garlic and ginger and cook for 1 minute.",
      "Add the prawns with the turmeric and salt and fry on a high heat for 4 minutes, until they turn pink and curl.",
      "Scatter the crushed pepper and fennel over and fry for 1 minute more, until the spices cling and the pan is nearly dry.",
      "Serve at once, straight from the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-beef-coconut-fry-style",
    name: { en: "Beef and Coconut Fry (Ularthiyathu-Style)", hindi: "बीफ़ नारियल फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-168608", grams: 600 }, // ground beef
      { foodId: "usda-170169", grams: 100 }, // coconut meat, cut into small pieces
      { foodId: "usda-790646", grams: 240 }, // onion
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-170931", grams: 6 }, // black pepper
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-330458", grams: 21 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cook the beef in a heavy pot with the turmeric, salt and a splash of water for 20 minutes, until tender and its liquid dries.",
      "Soften the onion in the coconut oil in a wide pan for 10 minutes, until deep gold.",
      "Add the garlic and ginger and cook for 1 minute, then stir in the chilli powder and black pepper.",
      "Add the cooked beef and the coconut pieces and fry on a medium heat for 12 minutes, stirring, until the beef darkens and crisps at the edges. This slow frying is the ularthu.",
      "Rest 3 minutes so the fry settles.",
      "Serve hot, with the coconut pieces scattered through.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-lamb-biryani-style",
    name: { en: "Hyderabadi Lamb Biryani-Style", hindi: "हैदराबादी मटन बिरयानी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 560 }, // ground lamb
      { foodId: "usda-2512381", grams: 280 }, // white rice, dry weight
      { foodId: "usda-170903", grams: 160 }, // Greek yogurt, lowfat, for the marinade
      { foodId: "usda-790646", grams: 240 }, // onion, fried crisp for the layers
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 18 }, // ginger
      { foodId: "usda-170924", grams: 8 }, // curry powder, standing in for the biryani masala
      { foodId: "usda-173475", grams: 16 }, // spearmint leaves
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
      { foodId: "usda-171314", grams: 21 }, // ghee
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Coat the lamb in the yogurt with the garlic, ginger, curry powder and half the salt and leave it for 30 minutes, curry powder stands in for the biryani masala the set does not carry, and the name says it is a style.",
      "Fry the sliced onion in the ghee for 10 minutes, until crisp and deep gold, and lift half of it out for the top.",
      "Parboil the rice in salted water for 6 minutes, until it is just soft at the edges, and drain it.",
      "Spread the lamb and all its marinade in the pot over the remaining onion, then layer the rice over it.",
      "Scatter the mint, coriander and reserved crisp onion over, cover tightly and cook on the lowest heat for 30 minutes, until the lamb is tender and the rice is cooked through in the steam.",
      "Rest, covered, for 10 minutes, then fold the layers together gently and serve.",
    ],
    timeMinutes: 90,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-irish-lamb-stew-style",
    name: { en: "Irish Lamb Stew-Style", hindi: "आयरिश मटन स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 560 }, // ground lamb, shaped into rough chunks in the method
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-170284", grams: 80 }, // barley
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Shape the lamb into rough bite-sized chunks with wet hands, the set carries ground lamb, so the stew's chunks are formed, not cut.",
      "Brown the lamb chunks in a heavy pot in their own fat for 8 minutes, until they colour well.",
      "Add the onion and cook for 4 minutes in the lamb fat.",
      "Pour in 900 ml of water and add the barley, bay leaf, salt and pepper; bring to a bare simmer.",
      "Add the potato and carrot and simmer gently for 35 minutes, until the lamb is tender and the barley thickens the broth.",
      "Rest 5 minutes, lift out the bay leaf and serve in deep bowls.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-lamb-bhuna-style",
    name: { en: "Lamb Bhuna-Style", hindi: "मटन भुना" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // ground lamb
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-170427", grams: 160 }, // green peppers
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-170922", grams: 5 }, // coriander seed, ground in the method
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-171314", grams: 21 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the ghee for 12 minutes, until it turns deep gold, the bhuna's base is a well-fried onion.",
      "Add the garlic and ginger and cook for 1 minute, then stir in the ground coriander seed, cumin and chilli powder.",
      "Add the lamb and fry on a high heat for 10 minutes, breaking it up, until it browns and the fat rises.",
      "Add the tomatoes and salt and cook for 12 minutes, stirring, until the sauce dries down and clings to the lamb.",
      "Add the green peppers and fry for 4 minutes more, until they soften at the edges but keep their bite.",
      "Rest 3 minutes and serve with the masala glossy and thick.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-mung-paneer-salad",
    name: { en: "Warm Mung Bean and Paneer Salad", hindi: "मूंग पनीर सलाद" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 280 }, // mung beans, dry weight
      { foodId: "cofid-12-495", grams: 200 }, // paneer, from the CoFID record
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-170923", grams: 3 }, // cumin, toasted in the method
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer the mung beans in water for about 25 minutes, until tender but still holding their shape, then drain them.",
      "Sear the paneer cubes in the oil in a hot pan for 4 minutes, until golden on two sides.",
      "Toast the cumin in a dry pan for 1 minute and crush it coarsely.",
      "Chop the cucumber, tomatoes and onion into small dice.",
      "Fold the warm mung beans, paneer and vegetables together with the lemon juice, cumin and salt.",
      "Serve warm, while the paneer is still soft from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-chickpea-tuna-salad",
    name: { en: "Chickpea and Tuna Salad", hindi: "छोले ट्यूना सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 360 }, // canned tuna in water, drained
      { foodId: "usda-2644282", grams: 240 }, // chickpeas, dry weight
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171413", grams: 21 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soak the chickpeas overnight, then simmer them in fresh water for about 45 minutes, until tender, and drain and cool them.",
      "Slice the onion thin and dice the red pepper.",
      "Flake the tuna into a wide bowl in large pieces.",
      "Add the chickpeas, onion and pepper to the tuna.",
      "Dress with the lemon juice, olive oil, salt and black pepper and fold everything together gently so the tuna stays in flakes.",
      "Rest 10 minutes for the dressing to settle and serve.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-turkey-waldorf-style",
    name: { en: "Turkey Waldorf-Style Salad", hindi: "टर्की वाल्डोर्फ़ सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 480 }, // turkey breast
      { foodId: "usda-171688", grams: 240 }, // apple
      { foodId: "usda-2346394", grams: 60 }, // walnuts
      { foodId: "usda-330137", grams: 160 }, // Greek yogurt, for the dressing
      { foodId: "usda-2346406", grams: 160 }, // cucumber, standing in for the celery
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Poach the turkey breast in salted water for 15 minutes, until cooked through, then rest it and cut it into bite-sized cubes.",
      "Whisk the yogurt with the lemon juice, salt and pepper into the dressing, yogurt stands in for the classic mayonnaise.",
      "Dice the apple and cucumber, cucumber stands in for the celery the set does not carry, and roughly chop the walnuts.",
      "Fold the turkey, apple and cucumber through the dressing.",
      "Rest the salad for 10 minutes in the fridge so the flavours settle.",
      "Serve with the walnuts scattered over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwb-tuna-melt-style",
    name: { en: "Tuna and Cheddar Melt-Style", hindi: "ट्यूना चीज़ मेल्ट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 360 }, // canned tuna in water, drained
      { foodId: "usda-328637", grams: 120 }, // cheddar
      { foodId: "usda-168936", grams: 200 }, // white flour, for the flatbreads
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt, for the tuna mixture
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a soft dough, rest it, then roll and dry-toast four flatbreads.",
      "Flake the tuna and fold it with the yogurt, finely chopped onion, salt and pepper.",
      "Slice the tomatoes.",
      "Pile the tuna mixture over the warm flatbreads and lay the tomato slices over it.",
      "Scatter the grated cheddar over the top.",
      "Grill or bake at 200°C for 6 minutes, until the cheddar melts and bubbles at the edges, and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwb-beef-lentil-stew",
    name: { en: "Beef and Lentil Stew", hindi: "बीफ़ दाल स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 480 }, // ground beef
      { foodId: "usda-2644283", grams: 200 }, // lentils, dry weight
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Brown the beef in the olive oil in a heavy pot for 8 minutes, breaking it up, until it colours well.",
      "Add the onion and carrot and cook for 5 minutes in the beef fat.",
      "Stir in the garlic and cumin and cook for 1 minute.",
      "Add the lentils, tomatoes and 700 ml of water, season with the salt and pepper and bring to a simmer.",
      "Cook gently for 30 minutes, until the lentils are tender and the stew thickens.",
      "Rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-beef-egg-hash",
    name: { en: "Beef, Potato and Egg Hash", hindi: "बीफ़ आलू अंडा हैश" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 480 }, // ground beef
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170427", grams: 160 }, // green peppers
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Cut the potato into small cubes and parboil them in salted water for 6 minutes, then drain them well.",
      "Brown the beef in the oil in a wide heavy pan for 8 minutes, breaking it up, until it colours and crisps at the edges.",
      "Add the onion and peppers and cook for 5 minutes.",
      "Add the potato and garlic and fry for 8 minutes, pressing the hash down and turning it in sections, until the potato crisps.",
      "Make four wells in the hash, crack an egg into each, cover and cook for 4 minutes, until the whites set and the yolks stay soft.",
      "Season with the salt and plenty of black pepper and serve straight from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------- plant and dairy protein --------------------- */
  {
    id: "dish-pwb-tempeh-rendang-style",
    name: { en: "Tempeh Rendang-Style", hindi: "टेम्पे रेनडांग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 520 }, // tempeh
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-171319", grams: 7 }, // chilli powder
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170922", grams: 5 }, // coriander seed, ground in the method
      { foodId: "usda-167765", grams: 20 }, // tamarind
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blitz the onion, garlic, ginger, chilli powder, turmeric and ground coriander seed with a splash of water into the rendang paste.",
      "Cut the tempeh into thick slices and fry them in the oil for 6 minutes, until golden on both sides; lift them out.",
      "Fry the paste in the same pan for 5 minutes, until it darkens and the oil rises at the edges.",
      "Pour in the coconut milk and tamarind, season with the salt and bring to a bare simmer.",
      "Return the tempeh and cook uncovered for 20 minutes, turning it once, until the sauce dries down and clings in a dark coat, the beef rendang's slow drying, done with tempeh.",
      "Rest 5 minutes and serve with the sauce scraped over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-seitan-pepper-stirfry",
    name: { en: "Seitan and Pepper Stir-Fry", hindi: "सीतान शिमला मिर्च फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168147", grams: 160 }, // vital wheat gluten, for the seitan
      { foodId: "usda-174288", grams: 40 }, // besan, worked into the seitan dough
      { foodId: "usda-170108", grams: 300 }, // red peppers
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-171410", grams: 14 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the vital wheat gluten and besan with 220 ml of water and a pinch of the salt into a firm, elastic seitan dough and rest it for 20 minutes.",
      "Simmer the dough in salted water with half the ginger for 25 minutes, until it firms into seitan, then drain it and slice it into strips.",
      "Sear the seitan strips in the peanut oil in a smoking-hot wok for 5 minutes, until they colour at the edges; lift them out.",
      "Stir-fry the onion and peppers in the same wok for 4 minutes, until they soften at the edges.",
      "Add the garlic and remaining ginger and stir-fry for 30 seconds.",
      "Return the seitan, season with the salt and black pepper, drizzle the sesame oil over and toss for 1 minute before serving.",
    ],
    timeMinutes: 65,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-black-bean-hemp-patties",
    name: { en: "Black Bean and Hemp Patties", hindi: "काला राजमा हेम्प पैटी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 360 }, // black beans, dry weight
      { foodId: "usda-170148", grams: 60 }, // hemp seeds
      { foodId: "usda-2346396", grams: 80 }, // rolled oats, to bind
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then simmer them in fresh water for about 50 minutes, until completely tender, and drain them well.",
      "Mash the beans coarsely with a fork, leaving some whole for texture.",
      "Stir in the hemp seeds, oats, finely chopped onion, garlic, cumin, chilli powder and salt and rest the mixture for 15 minutes so the oats bind it.",
      "Shape the mixture into 8 patties with wet hands.",
      "Fry the patties in the oil in a heavy pan for about 5 minutes a side, until a dark crust forms and they hold together.",
      "Rest 3 minutes so the patties firm, and serve hot.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-moringa-toor-dal",
    name: { en: "Moringa Leaf and Toor Dal", hindi: "सहजन पत्ती तूर दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 400 }, // pigeon peas (toor dal), dry weight
      { foodId: "usda-168416", grams: 200 }, // drumstick (moringa) leaves
      { foodId: "usda-170457", grams: 160 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170929", grams: 3 }, // mustard seed, for the tempering
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the toor dal in water with the turmeric for about 35 minutes, until it falls apart, then whisk it smooth.",
      "Strip the moringa leaves from their stems and wash them well.",
      "Soften the onion in the oil for 6 minutes, then add the garlic and tomato and cook for 5 minutes into a masala.",
      "Pour the dal into the masala, season with the salt and simmer for 8 minutes.",
      "Stir the moringa leaves through and cook for 3 minutes, until they wilt and turn dark green. The leaves carry real protein of their own, which is the point of this dal.",
      "Sizzle the mustard seed and cumin in a spoon of the dal's surface oil in a small pan and pour the tempering over before serving.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-split-pea-potato-soup",
    name: { en: "Split Pea and Potato Soup (Erbsensuppe-Style)", hindi: "मटर आलू सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F006543", grams: 440 }, // split peas, dry weight
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the onion and carrot in the olive oil in a heavy pot for 6 minutes.",
      "Add the split peas, bay leaf and 1.1 litres of water and bring to a simmer.",
      "Cook gently for 40 minutes, stirring now and then, until the peas begin to fall apart.",
      "Add the potato cubes and cook for 15 minutes more, until tender.",
      "Season with the salt and pepper and mash a ladle of the soup against the pot's side to thicken it, the German erbsensuppe is a thick, spoon-standing soup, and the name says this is its style.",
      "Lift out the bay leaf, rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-lupin-pepper-stew",
    name: { en: "Lupin and Pepper Stew", hindi: "ल्यूपिन शिमला मिर्च स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F005249", grams: 280 }, // lupin splits, dry weight
      { foodId: "usda-170108", grams: 300 }, // red peppers
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the lupin splits overnight, then simmer them in fresh water for about 40 minutes, until tender, and drain them, keeping a cup of their liquid.",
      "Soften the onion in the olive oil for 6 minutes, then add the garlic and chilli powder and cook for 1 minute.",
      "Add the peppers and cook for 6 minutes, until they soften and sweeten.",
      "Add the tomatoes and simmer for 8 minutes into a sauce.",
      "Stir in the lupins with a splash of their liquid, season with the salt and simmer for 10 minutes so they take the sauce, lupin splits carry more protein than any other pulse in the set.",
      "Rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-feijoada-style",
    name: { en: "Black Bean Feijoada-Style (Brazilian Black Bean Stew)", hindi: "काला राजमा फेजोआडा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 480 }, // black beans, dry weight
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then simmer them in fresh water with the bay leaf for about 50 minutes, until completely tender, and keep them in their dark liquid.",
      "Soften the onion and peppers in the olive oil in a heavy pot for 8 minutes, until sweet and golden at the edges.",
      "Add the garlic, cumin and chilli powder and cook for 1 minute.",
      "Add the tomatoes and cook for 6 minutes into a sauce.",
      "Ladle the beans with plenty of their liquid into the sauce, season with the salt and simmer for 15 minutes, mashing a ladleful of beans against the pot's side so the stew turns creamy, Brazil's feijoada is a meat stew by tradition, and this is its bean-hearted style, built on the beans alone.",
      "Lift out the bay leaf, rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-paneer-chimichurri-style",
    name: { en: "Grilled Paneer with Herb Chimichurri-Style Sauce", hindi: "ग्रिल्ड पनीर हर्ब सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "cofid-12-495", grams: 480 }, // paneer, from the CoFID record
      { foodId: "usda-169997", grams: 60 }, // coriander leaves, for the sauce
      { foodId: "usda-173475", grams: 20 }, // spearmint leaves, in the sauce
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, for the sauce
      { foodId: "usda-171413", grams: 28 }, // olive oil, half for the sauce
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Chop the coriander leaves, mint, garlic and chilli finely and stir them with the vinegar, half the olive oil and a pinch of the salt into the chimichurri, coriander and mint stand in for the parsley and oregano the set does not carry.",
      "Cut the paneer into 8 thick slabs and season them with the remaining salt.",
      "Sear the paneer in the remaining olive oil in a hot heavy pan for about 3 minutes a side, until deep gold with crisp edges.",
      "Rest the paneer for 2 minutes.",
      "Lay the paneer on plates and spoon the chimichurri generously over each slab.",
      "Serve at once, while the paneer is warm and the sauce is raw and sharp.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-quark-chia-pudding",
    name: { en: "Quark and Chia Breakfast Pudding", hindi: "क्वार्क चिया पुडिंग" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "cnf-6995", grams: 720 }, // quark
      { foodId: "afcd-F008209", grams: 100 }, // chia seeds
      { foodId: "usda-327699", grams: 240 }, // strawberries
      { foodId: "usda-169640", grams: 16 }, // honey
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Stir the chia seeds through the quark with the cinnamon until evenly mixed.",
      "Cover and rest the mixture in the fridge for at least 2 hours, until the chia swells and the pudding sets, overnight is easiest.",
      "Hull and slice the strawberries.",
      "Stir the pudding once more and spoon it into bowls.",
      "Top with the strawberries and drizzle the honey over.",
      "Serve cold, straight from the fridge.",
    ],
    timeMinutes: 130,
    budgetTier: 2,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-pwb-yogurt-hemp-bowl",
    name: { en: "Greek Yogurt, Hemp and Apple Bowl", hindi: "दही हेम्प सेब बाउल" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 800 }, // Greek yogurt
      { foodId: "usda-170148", grams: 80 }, // hemp seeds
      { foodId: "usda-171688", grams: 200 }, // apple
      { foodId: "usda-169640", grams: 16 }, // honey
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Divide the yogurt between four bowls.",
      "Dice the apple, skin on, into small cubes.",
      "Scatter the apple over the yogurt.",
      "Scatter the hemp seeds generously over each bowl.",
      "Dust the cinnamon over and drizzle the honey across the top.",
      "Serve at once, before the apple browns.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  {
    id: "dish-pwb-turkey-egg-skillet",
    name: { en: "Turkey, Egg and Pepper Breakfast Skillet", hindi: "टर्की अंडा स्किलेट" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 400 }, // turkey breast, cut into strips
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the potato into small cubes and parboil them in salted water for 6 minutes, then drain them well.",
      "Sear the turkey strips in the oil in a wide heavy pan for 6 minutes, until golden and cooked through; lift them out.",
      "Fry the potato, onion and peppers in the same pan for 8 minutes, until the potato crisps at the edges.",
      "Return the turkey to the pan and season with the salt and black pepper.",
      "Make four wells in the skillet, crack an egg into each, cover and cook for 4 minutes, until the whites set.",
      "Serve straight from the pan.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-quiche-lorraine-style",
    name: { en: "Quiche Lorraine-Style", hindi: "कीश लॉरेन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-2646168", grams: 240 }, // pork loin, diced small
      { foodId: "usda-328637", grams: 120 }, // cheddar, standing in for the gruyère
      { foodId: "usda-168936", grams: 160 }, // white flour, for the crust
      { foodId: "usda-322892", grams: 120 }, // whole milk
      { foodId: "usda-173410", grams: 28 }, // butter, for the crust
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Rub the butter into the flour with a pinch of the salt, bring it together with cold water into a pastry, rest it for 20 minutes, then roll it and line a pie dish.",
      "Bake the empty crust at 200°C for 12 minutes, until it sets and dries.",
      "Fry the diced pork in a dry pan for 6 minutes, until it colours and renders a little fat.",
      "Whisk the eggs with the milk, the remaining salt and the pepper and stir in the grated cheddar, cheddar stands in for the gruyère the set does not carry.",
      "Scatter the pork over the crust, pour the egg mixture over it.",
      "Bake at 180°C for 30 minutes, until the filling is just set with a slight wobble, and rest 10 minutes before slicing.",
    ],
    timeMinutes: 85,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwb-green-shakshuka-style",
    name: { en: "Green Shakshuka-Style (Spinach, Peas and Eggs)", hindi: "हरी शकशुका" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 480 }, // egg
      { foodId: "usda-328637", grams: 120 }, // cheddar, crumbled over in place of feta
      { foodId: "usda-170419", grams: 240 }, // green peas
      { foodId: "usda-168462", grams: 240 }, // spinach
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion in the olive oil in a wide lidded pan for 6 minutes, then add the garlic and cumin and cook for 1 minute.",
      "Add the peas and a splash of water and cook for 3 minutes, until bright green.",
      "Wilt the spinach through in handfuls for 2 minutes and season with the salt. This green base, not tomato, is what makes it a green shakshuka.",
      "Make eight wells in the greens and crack an egg into each.",
      "Cover and cook gently for 6 minutes, until the whites set and the yolks stay soft.",
      "Scatter the cheddar over and serve straight from the pan. The cheddar stands in for the feta the set does not carry.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
];

export const BALANCED_WAVE_B_DISHES: readonly Dish[] = [
  /* ------------------------- balanced dishes ------------------------- */
  {
    id: "dish-pwb-paneer-pea-fried-rice",
    name: { en: "Paneer and Pea Fried Rice", hindi: "पनीर मटर फ्राइड राइस" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 240 }, // paneer, from the CoFID record
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry weight
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171025", grams: 21 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer the rice in salted water until just tender, drain it and spread it out to steam dry, dry rice fries without turning soft.",
      "Sear the paneer cubes in the oil in a wide pan for 4 minutes, until golden, and lift them out.",
      "Fry the onion, carrot and ginger in the same pan for 4 minutes.",
      "Add the peas and cumin and fry for 2 minutes.",
      "Add the rice and salt and toss on a high heat for 4 minutes, until the grains separate and catch at the edges.",
      "Fold the paneer back through, rest 2 minutes and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-quinoa-cottage-salad",
    name: { en: "Quinoa and Cottage Cheese Salad", hindi: "क्विनोआ कॉटेज सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346384", grams: 400 }, // cottage cheese, full fat
      { foodId: "usda-168874", grams: 160 }, // quinoa, dry weight
      { foodId: "usda-2346406", grams: 240 }, // cucumber
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170108", grams: 120 }, // red peppers
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rinse the quinoa and simmer it in salted water for 15 minutes, until the spirals unfurl, then drain and cool it.",
      "Chop the cucumber, tomatoes and pepper into small dice.",
      "Fold the quinoa and vegetables together with the lemon juice, olive oil and salt.",
      "Rest the salad for 10 minutes so the quinoa drinks the dressing.",
      "Spoon the cottage cheese over in soft mounds.",
      "Serve at room temperature, folding the cottage cheese through at the table.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-sorghum-mung-khichdi-style",
    name: { en: "Sorghum and Mung Khichdi-Style", hindi: "ज्वार मूंग खिचड़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710842", grams: 240 }, // sorghum (jowar), dry weight
      { foodId: "usda-174256", grams: 160 }, // mung beans, dry weight
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the sorghum for at least 4 hours, or overnight, so it cooks tender.",
      "Sizzle the cumin in the oil in a heavy pot, then add the ginger and turmeric and cook for 30 seconds.",
      "Add the drained sorghum and mung beans with 900 ml of water and the salt and bring to a simmer.",
      "Cook gently for about 35 minutes, until both grains are soft and the khichdi turns porridgy.",
      "Stir the peas and carrot through and cook for 8 minutes more.",
      "Rest 5 minutes and serve soft and steaming, a khichdi built on jowar instead of rice.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-oats-egg-upma-style",
    name: { en: "Oats, Egg and Pea Upma-Style", hindi: "ओट्स अंडा उपमा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 240 }, // egg
      { foodId: "usda-2346396", grams: 200 }, // rolled oats
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170929", grams: 3 }, // mustard seed, for the tempering
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dry-roast the oats in a pan for 3 minutes, until they smell nutty, and set them aside.",
      "Sizzle the mustard seed in the oil, then soften the onion and green chilli for 4 minutes.",
      "Add the peas, turmeric and salt with 400 ml of water and simmer for 3 minutes.",
      "Stir the oats in and cook for 4 minutes, until they drink the water and turn soft and separate.",
      "Push the upma to one side, scramble the beaten eggs in the cleared space for 2 minutes, then fold them through, an upma with the egg cooked in, not served on top.",
      "Rest 2 minutes and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-cottage-apple-walnut-bowl",
    name: { en: "Cottage Cheese, Apple and Walnut Bowl", hindi: "कॉटेज चीज़ सेब अखरोट बाउल" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346384", grams: 600 }, // cottage cheese, full fat
      { foodId: "usda-171688", grams: 240 }, // apple
      { foodId: "usda-2346394", grams: 60 }, // walnuts
      { foodId: "usda-167746", grams: 20 }, // lemon, to keep the apple fresh
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-169640", grams: 12 }, // honey
    ],
    method: [
      "Dice the apple, skin on, and toss it with the lemon juice so it stays fresh.",
      "Spoon the cottage cheese into four bowls.",
      "Scatter the apple over the cottage cheese.",
      "Roughly chop the walnuts and scatter them over.",
      "Dust the cinnamon across the top and drizzle the honey over.",
      "Serve at once, cold and crunchy.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  {
    id: "dish-pwb-cauliflower-cheddar-soup",
    name: { en: "Cauliflower and Cheddar Soup", hindi: "फूलगोभी चीज़ सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-328637", grams: 200 }, // cheddar
      { foodId: "usda-2685573", grams: 600 }, // cauliflower
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the onion in the butter in a heavy pot for 6 minutes, then add the garlic and cook for 1 minute.",
      "Add the cauliflower florets and potato cubes with 600 ml of water and bring to a simmer.",
      "Cook for 18 minutes, until both are completely tender.",
      "Blend the soup smooth with the milk.",
      "Stir the grated cheddar through off the boil until it melts into the soup, keep it off the boil so the cheese stays smooth.",
      "Season with the salt and pepper, rest 3 minutes and serve.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwb-sweet-potato-lentil-soup",
    name: { en: "Sweet Potato and Lentil Soup", hindi: "शकरकंद दाल सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174284", grams: 240 }, // red lentils, dry weight
      { foodId: "usda-2346404", grams: 400 }, // sweet potato
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the olive oil in a heavy pot for 6 minutes, then add the ginger, cumin and chilli powder and cook for 1 minute.",
      "Add the red lentils and 900 ml of water and bring to a simmer.",
      "Add the sweet potato cubes and cook for 20 minutes, until the lentils fall apart and the sweet potato is tender.",
      "Blend half the soup and stir it back in, so it is thick with some texture left.",
      "Season with the salt and rest 5 minutes.",
      "Serve in deep bowls, steaming.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwb-egg-yogurt-flatbreads",
    name: { en: "Egg and Yogurt Flatbreads", hindi: "अंडा दही पराठा" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 240 }, // egg
      { foodId: "usda-168936", grams: 200 }, // white flour
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt, half for the dough, half to serve
      { foodId: "usda-170419", grams: 120 }, // green peas, in the filling
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with half the yogurt, warm water and a pinch of the salt into a soft dough and rest it for 20 minutes.",
      "Soften the onion in the oil, add the peas and cumin and cook for 3 minutes, then scramble the beaten eggs through for 2 minutes and season with the remaining salt.",
      "Divide the dough into four, roll each piece out thin.",
      "Spoon a quarter of the egg filling onto each round, fold it over and seal the edges.",
      "Cook the flatbreads in a dry hot pan for about 3 minutes a side, until they puff and spot with gold.",
      "Serve hot with the remaining yogurt alongside.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-devilled-eggs",
    name: { en: "Devilled Eggs with Yogurt and Paprika-Style Spice", hindi: "डेविल्ड अंडे" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173424", grams: 480 }, // boiled egg
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt, for the filling
      { foodId: "usda-171319", grams: 3 }, // chilli powder, dusted over in place of paprika
      { foodId: "usda-173469", grams: 8 }, // cider vinegar, for the filling
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170931", grams: 1 }, // black pepper
    ],
    method: [
      "Halve the boiled eggs lengthways and pop the yolks into a bowl.",
      "Mash the yolks with the yogurt, vinegar, salt and pepper until smooth and pipeable, yogurt stands in for the classic mayonnaise.",
      "Spoon or pipe the filling back into the white halves, mounding it up.",
      "Dust the chilli powder over the tops. It stands in for the paprika the set does not carry, bringing the same red colour and a little more heat.",
      "Chill the eggs for 20 minutes so the filling firms.",
      "Serve cold, two halves to a portion as a snack or starter.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwb-masala-omelette-peas",
    name: { en: "Masala Omelette with Peas", hindi: "मसाला आमलेट मटर" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // egg
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomatoes
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion, tomato and green chilli in the oil in a wide pan for 5 minutes.",
      "Add the peas and turmeric and cook for 3 minutes, until the peas are tender.",
      "Beat the eggs with the salt and pour them evenly over the vegetables.",
      "Cook on a low heat for 4 minutes, tilting the pan so the egg sets in a sheet around the vegetables.",
      "Fold the omelette in half and cook for 1 minute more, until just set in the middle.",
      "Slide it onto a warm plate, cut it into four and serve at once.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-corn-chowder",
    name: { en: "Corn, Potato and Cheddar Chowder", hindi: "मकई आलू चाउडर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-328637", grams: 160 }, // cheddar
      { foodId: "usda-2710826", grams: 400 }, // sweet corn
      { foodId: "usda-2346401", grams: 300 }, // potato
      { foodId: "usda-322892", grams: 240 }, // whole milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the onion in the butter in a heavy pot for 5 minutes.",
      "Add the potato cubes and 500 ml of water and simmer for 12 minutes, until the potato is nearly tender.",
      "Add the corn and simmer for 5 minutes more.",
      "Mash a ladle of the potato and corn against the pot's side and stir it back in to thicken the chowder.",
      "Stir in the milk and the grated cheddar off the boil until the cheese melts.",
      "Season with the salt and pepper, rest 3 minutes and serve in deep bowls.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-hot-sour-soup",
    name: { en: "Hot and Sour Tofu and Egg Soup", hindi: "हॉट एंड सावर सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-174290", grams: 300 }, // tofu, extra firm
      { foodId: "usda-2258586", grams: 160 }, // carrots, cut into matchsticks
      { foodId: "usda-173469", grams: 32 }, // cider vinegar, for the sour
      { foodId: "usda-170931", grams: 4 }, // black pepper, for the heat
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Bring 1 litre of water to a simmer with the ginger, salt and black pepper, the pepper, not chilli, is this soup's heat.",
      "Add the carrot matchsticks and simmer for 4 minutes.",
      "Cut the tofu into small cubes and slide them into the soup; simmer for 3 minutes without stirring hard.",
      "Stir the soup in one direction and drizzle the beaten eggs in slowly, so they set in fine ribbons.",
      "Take the soup off the heat and stir in the vinegar and sesame oil, the vinegar goes in last so its sourness stays bright.",
      "Rest 2 minutes and serve at once, steaming and sharp.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-pasta-fagioli",
    name: { en: "Pasta e Fagioli (Pasta and Bean Soup)", hindi: "पास्ता बीन सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 240 }, // navy beans, dry weight
      { foodId: "usda-168933", grams: 120 }, // semolina, for the small pasta made in the method
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the navy beans overnight, then simmer them in fresh water for about 50 minutes, until completely tender, and keep them in their liquid.",
      "Knead the semolina with warm water into a stiff pasta dough, rest it for 20 minutes, then pinch off small short pieces, the set carries no dried pasta, so the soup's pasta is made here.",
      "Soften the onion and carrot in the olive oil for 6 minutes, then add the garlic and cook for 1 minute.",
      "Add the tomatoes and cook for 6 minutes into a sauce.",
      "Add the beans with their liquid and 300 ml of water, season with the salt and simmer for 10 minutes.",
      "Drop the pasta pieces in and cook for 4 minutes, until tender, then rest 3 minutes and serve thick.",
    ],
    timeMinutes: 85,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-zuppa-toscana-style",
    name: { en: "Zuppa Toscana-Style (Pork, Potato and Greens Soup)", hindi: "ज़ुप्पा तोस्काना" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 240 }, // ground pork
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-168462", grams: 240 }, // spinach, standing in for the kale
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Brown the ground pork in a heavy pot in its own fat for 8 minutes, breaking it up, until it colours well.",
      "Add the onion and cook for 4 minutes in the pork fat, then the garlic and chilli powder for 1 minute.",
      "Add the potato slices and 700 ml of water, season with the salt and simmer for 15 minutes, until the potato is tender.",
      "Stir the spinach through and cook for 2 minutes, until it wilts. The spinach stands in for the kale the set does not carry.",
      "Stir in the milk and warm the soup through without boiling.",
      "Rest 3 minutes and serve in deep bowls.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-baked-potato-cottage",
    name: { en: "Baked Potato with Cottage Cheese and Herbs", hindi: "बेक्ड आलू कॉटेज चीज़" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346384", grams: 480 }, // cottage cheese, full fat
      { foodId: "usda-2346401", grams: 800 }, // potato, baked whole
      { foodId: "usda-169997", grams: 16 }, // coriander leaves, standing in for the chives
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Scrub the potatoes, prick them and rub them with a little of the salt.",
      "Bake the potatoes at 200°C for about 60 minutes, until the skins are crisp and the middles give when squeezed.",
      "Split each potato open and fluff the flesh with a fork.",
      "Divide the butter between the potatoes and let it melt into the flesh.",
      "Spoon the cottage cheese generously into each potato.",
      "Scatter the chopped coriander over, season with the pepper and serve at once. The coriander stands in for the chives the set does not carry.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pwb-black-rice-edamame-bowl",
    name: { en: "Black Rice and Edamame Bowl", hindi: "काला चावल एडामामे बाउल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 240 }, // edamame
      { foodId: "usda-2710825", grams: 240 }, // black rice, dry weight
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-2346406", grams: 160 }, // cucumber
      { foodId: "usda-170150", grams: 16 }, // sesame seeds
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Simmer the black rice in salted water for about 35 minutes, until tender with a slight chew, then drain and rest it.",
      "Steam the edamame for 4 minutes and pop the beans from their pods.",
      "Cut the carrot into matchsticks and the cucumber into thin half-moons.",
      "Whisk the sesame oil with the grated ginger and a pinch of the salt into the dressing.",
      "Divide the rice between four bowls and arrange the edamame, carrot and cucumber over it in sections.",
      "Drizzle the dressing over and scatter the sesame seeds to finish.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-millet-tempeh-bowl",
    name: { en: "Millet and Tempeh Bowl", hindi: "बाजरा टेम्पे बाउल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 280 }, // tempeh
      { foodId: "usda-2512379", grams: 200 }, // millet, dry weight
      { foodId: "usda-2346404", grams: 240 }, // sweet potato
      { foodId: "usda-168462", grams: 120 }, // spinach
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer the millet in salted water for about 20 minutes, until the grains are tender and fluffy, then rest it covered.",
      "Roast the sweet potato cubes at 200°C for 25 minutes, until tender and caramelised at the edges.",
      "Cut the tempeh into slices and fry them in the oil with the grated ginger for 6 minutes, until golden on both sides.",
      "Wilt the spinach in the hot pan for 1 minute.",
      "Divide the millet between four bowls and arrange the tempeh, sweet potato and spinach over it.",
      "Season with the salt and serve warm.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-fish-corn-soup",
    name: { en: "Fish and Sweet Corn Soup", hindi: "मछली कॉर्न सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 280 }, // tilapia, cut into small pieces
      { foodId: "usda-2710826", grams: 320 }, // sweet corn
      { foodId: "usda-171287", grams: 100 }, // egg, for the ribbons
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Bring 1 litre of salted water to a bare simmer with the ginger.",
      "Blend a third of the corn with a ladle of the hot water and stir it back in, this is what makes the soup creamy without cream.",
      "Add the remaining corn and the finely diced carrot and simmer for 6 minutes.",
      "Slide the tilapia pieces in and poach them gently for 4 minutes, until they turn opaque and flake, the Cantonese fish soup cooks its fish in the broth, never before it.",
      "Season with the salt and black pepper, then stir the soup in one direction and drizzle the beaten egg in slowly, so it sets in fine ribbons.",
      "Drizzle the sesame oil over, rest 2 minutes and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwb-tofu-noodle-soup",
    name: { en: "Tofu and Vegetable Noodle Soup", hindi: "टोफू नूडल सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174290", grams: 320 }, // tofu, extra firm
      { foodId: "usda-168933", grams: 160 }, // semolina, for the noodles made in the method
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the semolina with warm water into a stiff dough, rest it for 20 minutes, roll it thin and cut it into noodles, the set carries no dried noodles, so they are made here.",
      "Bring 1.1 litres of water to a simmer with the ginger, garlic and salt.",
      "Add the carrot matchsticks and simmer for 4 minutes.",
      "Add the tofu cubes and the noodles and cook for 4 minutes, until the noodles are tender.",
      "Stir the spinach through and cook for 1 minute, until it wilts.",
      "Drizzle the sesame oil over, rest 2 minutes and serve at once.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-stracciatella-style",
    name: { en: "Stracciatella-Style Spinach and Egg Soup", hindi: "पालक अंडा सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 320 }, // egg
      { foodId: "usda-325036", grams: 80 }, // parmesan, whisked into the eggs
      { foodId: "usda-168462", grams: 240 }, // spinach
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Bring 1.1 litres of water to a bare simmer with the garlic and salt.",
      "Whisk the eggs with the grated parmesan and black pepper in a bowl.",
      "Stir the simmering broth in one direction so it swirls.",
      "Drizzle the egg mixture in slowly, so it sets in soft ragged ribbons, stracciatella means little rags, and the name says this is the style.",
      "Stir the spinach through and cook for 1 minute, until it wilts into the ribbons.",
      "Drizzle the olive oil over, rest 2 minutes and serve at once.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-pepper-white-bean-soup",
    name: { en: "Pepper, Tomato and White Bean Soup", hindi: "शिमला मिर्च बीन सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 240 }, // navy beans, dry weight
      { foodId: "usda-170108", grams: 300 }, // red peppers
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the navy beans overnight, then simmer them in fresh water for about 50 minutes, until completely tender, and drain them, keeping a cup of their liquid.",
      "Soften the onion in the olive oil for 6 minutes, then add the garlic and cumin and cook for 1 minute.",
      "Add the peppers and cook for 6 minutes, until they soften and sweeten.",
      "Add the tomatoes and simmer for 8 minutes into a sauce.",
      "Stir in the beans with a splash of their liquid, season with the salt and simmer for 8 minutes so they take the sauce.",
      "Rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-pea-mint-soup",
    name: { en: "Pea and Mint Soup with Yogurt", hindi: "मटर पुदीना सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170419", grams: 480 }, // green peas
      { foodId: "usda-330137", grams: 280 }, // Greek yogurt, stirred through at the end
      { foodId: "usda-173475", grams: 20 }, // spearmint leaves
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion in the butter in a heavy pot for 5 minutes, then add the garlic and cook for 1 minute.",
      "Add the peas and 600 ml of water and simmer for 8 minutes, until the peas are completely tender.",
      "Add the mint leaves and blend the soup smooth.",
      "Season with the salt and let the soup cool for 3 minutes, until it is off the boil.",
      "Stir the yogurt through until the soup turns pale green, off the boil, so the yogurt stays smooth.",
      "Serve warm, with a few mint leaves torn over.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwb-paneer-tikka-wrap-style",
    name: { en: "Paneer Tikka Wrap-Style", hindi: "पनीर टिक्का रैप" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 200 }, // paneer, from the CoFID record
      { foodId: "usda-168936", grams: 160 }, // white flour, for the wraps
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt, half for the marinade, half to serve
      { foodId: "usda-170457", grams: 120 }, // tomatoes
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Coat the paneer cubes in half the yogurt with the chilli powder, cumin, turmeric and salt and leave them for 20 minutes.",
      "Knead the flour with warm water into a soft dough, rest it, then roll and dry-toast four thin wraps.",
      "Sear the paneer in the oil in a hot pan for 5 minutes, until charred at the edges.",
      "Slice the onion and tomatoes.",
      "Lay the paneer down the middle of each wrap with the onion and tomato over it.",
      "Spoon the remaining yogurt over, roll the wraps up tightly and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwb-sweet-potato-quesadillas",
    name: { en: "Sweet Potato and Black Bean Quesadillas", hindi: "शकरकंद बीन क्वेसाडिला" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 160 }, // black beans, dry weight
      { foodId: "usda-328637", grams: 100 }, // cheddar
      { foodId: "usda-2346404", grams: 320 }, // sweet potato
      { foodId: "usda-168936", grams: 160 }, // white flour, for the tortillas
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then simmer them in fresh water for about 50 minutes, until tender, and drain them.",
      "Knead the flour with warm water and a pinch of the salt into a soft dough, rest it, then roll and dry-toast four tortillas.",
      "Roast the sweet potato cubes at 200°C for 25 minutes, until tender, then mash them roughly with the cumin, chilli powder and remaining salt.",
      "Mash half the black beans and stir the rest through whole.",
      "Spread the sweet potato over half of each tortilla, spoon the beans over and scatter the grated cheddar on top, then fold them in half.",
      "Toast the folded quesadillas in the oil in a heavy pan for about 3 minutes a side, until crisp and the cheddar melts, and serve cut in wedges.",
    ],
    timeMinutes: 85,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
];
