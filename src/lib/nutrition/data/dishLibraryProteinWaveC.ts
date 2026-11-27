/**
 * Protein Wave C (2026-11-26, owner directive: three waves adding
 * 200+ healthy, protein-rich or balanced dishes; this is wave
 * three, the final one, ~70 dishes after wave A's 70 and wave B's
 * 70, so the programme lands at 210). Two shelves, one file,
 * exactly waves A and B's shape:
 *
 * PROTEIN_WAVE_C_DISHES, protein-rich mains, breakfasts and
 * snacks. Every dish computes to at least 25 g of protein per
 * serving through `dishNutrients`, pinned by
 * dishLibraryProteinWaveC.test.ts, which computes rather than
 * asserts, the standing protein-wave bar (PW-1..PW-4). These
 * dishes join PROTEIN_WAVE_DISH_IDS where the library is
 * assembled.
 *
 * BALANCED_WAVE_C_DISHES, balanced plates: a real protein anchor,
 * vegetables and a grain or base on one plate, honestly portioned.
 * They compute below the 25 g bar and do NOT join the
 * protein-wave set; the wave test pins their shape (anchor +
 * vegetable + base, at least 12 g of protein a serving) instead
 * of the bar.
 *
 * Composed only from the verified reference set (all 168 foods,
 * every source, the M-230 foods and the CoFID paneer included; no
 * new foods, no invented nutrients, no protein powders). Beef and
 * pork appear where a classic is built on them, per the owner's
 * 2026-11-26 decision, costed from the set's ground beef, ground
 * pork and pork loin. Paneer dishes cost the CoFID paneer record
 * (cofid-12-495) directly, never the cottage-cheese stand-in. No
 * dish duplicates an existing library dish by name or by recipe
 * (checked against the whole library, normalised, see the wave
 * test; wave A's mujadara and chana-paneer catches and wave B's
 * strict-normaliser discipline are the lessons this file was
 * written under).
 *
 * Fresh ground, stated plainly: waves A and B took peri-peri
 * chicken, kofta and seekh kebab, rendang, stroganoff, carbonara,
 * vindaloo, tandoori and shakshuka. This wave's ground is the
 * grill and the skewer (yakitori, fish tikka), the Iberian bean
 * pots (cassoulet, cocido, petit salé), the Cajun and Creole
 * shelf (étouffée, cioppino), the Levantine and Persian pots
 * (kibbeh, lablabi, ghormeh sabzi), West African cowpea cooking
 * (akara, moin moin, okro soup) and the stuffed and wrapped
 * shelf (pupusas, maultaschen, brik, pastilla).
 *
 * Stand-ins, stated once here and in the methods where they bite:
 * the verified set carries no soy sauce, so the East Asian
 * glazes (yakitori, kung pao, manchurian) are built on tamarind,
 * cider vinegar and salt, and those dishes wear the -Style
 * suffix. Kibbeh's shell is semolina, the set carrying no
 * bulgur. The pastries for pastilla, brik and açorda's bread are
 * rolled from the set's wheat flour, there being no filo, malsouka
 * or ready bread in the set. Turkey stands in for veal in the
 * tonnato. Pork loin stands in for salt pork in the petit salé,
 * and ground pork and turkey stand in for the confit and sausage
 * in the cassoulet. The ghormeh sabzi herb pot is spinach,
 * coriander leaves and drumstick leaves, with lemon where the
 * classic uses dried lime. Mozzarella stands in for quesillo in
 * the pupusas. Moin moin's pepper sauce is fried in peanut oil,
 * the set carrying no palm oil. Lomo saltado is built on the
 * set's ground beef, stated in its name, where the classic
 * stir-fries strips.
 */

import type { Dish } from "../dishes";

export const PROTEIN_WAVE_C_DISHES: readonly Dish[] = [
  /* --------------------- international protein mains --------------------- */
  {
    id: "dish-pwc-chicken-yakitori-style",
    name: { en: "Chicken Yakitori-Style (Grilled Skewers, Tamarind Glaze)", hindi: "चिकन याकितोरी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-169640", grams: 30 }, // honey, for the glaze
      { foodId: "usda-167765", grams: 24 }, // tamarind, the glaze's sour base (no soy sauce in the set)
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the tamarind in warm water for 15 minutes, squeeze out the pulp and strain the sour juice.",
      "Simmer the tamarind juice with the honey, grated ginger, garlic and salt for 5 minutes, until it thickens into a dark glaze.",
      "Cut the chicken into bite-size pieces and thread them tightly onto skewers.",
      "Grill the skewers on a hot griddle for about 10 minutes, turning often, until the edges char lightly.",
      "Brush the glaze over the skewers for the last 3 minutes, turning so it lacquers every side without burning.",
      "Rest 2 minutes, brush once more with glaze and serve straight from the skewers.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-kung-pao-chicken",
    name: { en: "Kung Pao Chicken (Chicken with Peanuts and Dried Chillies)", hindi: "कुंग पाओ चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-172430", grams: 100 }, // peanuts
      { foodId: "usda-170106", grams: 10 }, // hot chilli, red
      { foodId: "usda-170427", grams: 150 }, // sweet pepper, green
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-173469", grams: 15 }, // cider vinegar, for the sauce (no soy sauce in the set)
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into cubes, season with the salt and leave for 10 minutes.",
      "Stir the vinegar, sugar and a splash of water into the kung pao sauce and set it by the stove.",
      "Heat the oil until smoking and fry the dried chillies for 30 seconds, until they darken and perfume the oil.",
      "Add the chicken and stir-fry for 6 minutes, until it colours and cooks through.",
      "Add the pepper, onion, garlic and ginger and stir-fry 3 minutes more, keeping the vegetables crisp.",
      "Pour in the sauce, toss for 1 minute until it glosses the chicken, scatter the peanuts over and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-chicken-manchurian-style",
    name: { en: "Chicken Manchurian-Style (Battered Chicken in Garlic Sauce)", hindi: "चिकन मंचूरियन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-174288", grams: 120 }, // chickpea flour (besan), for the batter
      { foodId: "usda-171287", grams: 50 }, // egg, for the batter
      { foodId: "usda-170457", grams: 200 }, // tomatoes, for the sauce
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 100 }, // sweet pepper, green
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // hot chilli, green
      { foodId: "usda-173469", grams: 15 }, // cider vinegar (no soy sauce in the set)
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the besan, egg, salt and a little water into a thick batter and coat the chicken cubes in it.",
      "Fry the battered chicken in the oil for about 8 minutes, turning, until crisp and golden, then lift it out.",
      "Blitz the tomatoes into a rough purée for the sauce.",
      "Fry the garlic, ginger and green chilli in the same pan for 1 minute, then add the onion and pepper for 3 minutes.",
      "Pour in the tomato purée and vinegar, season, and simmer 5 minutes into a glossy sauce.",
      "Return the chicken, toss for 2 minutes so every piece is coated, and serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwc-chicken-kiev-style",
    name: { en: "Chicken Kiev-Style (Garlic Butter Chicken, Crumb Coated)", hindi: "चिकन कीव" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 560 }, // chicken breast
      { foodId: "usda-173410", grams: 60 }, // butter, for the garlic butter
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-168936", grams: 80 }, // wheat flour, for the crumb
      { foodId: "usda-171287", grams: 50 }, // egg, for the crumb
      { foodId: "usda-169997", grams: 15 }, // coriander leaves, in the butter
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Mash the butter with the crushed garlic, chopped coriander leaves and a pinch of salt, roll it into a log and chill it in the fridge until firm.",
      "Cut a deep pocket into the thick side of each chicken breast and push a quarter of the garlic butter inside.",
      "Coat each breast in flour, then beaten egg, then flour again, pressing the crumb on well.",
      "Chill the coated chicken in the fridge for 20 minutes so the crumb sets and the butter stays put.",
      "Heat the oven to 200°C and bake the chicken on an oiled tray for about 25 minutes, until the crumb is crisp and the juices run clear.",
      "Rest 5 minutes so the butter settles, then serve whole so it spills at the table.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven", "fridge"],
  },
  {
    id: "dish-pwc-ayam-goreng",
    name: { en: "Ayam Goreng (Indonesian Turmeric Fried Chicken)", hindi: "आयाम गोरेंग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 640 }, // chicken thigh
      { foodId: "usda-169714", grams: 60 }, // rice flour, for the light crust
      { foodId: "usda-172231", grams: 6 }, // turmeric
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170922", grams: 6 }, // coriander seed, ground in the method
      { foodId: "usda-330458", grams: 28 }, // coconut oil, for frying
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Blitz the garlic, ginger, turmeric, ground coriander seed and salt with a splash of water into the marinade paste.",
      "Coat the chicken thighs in the paste and leave them for at least 30 minutes.",
      "Simmer the chicken in its marinade with a little water for 15 minutes, until just cooked and the liquid dries down.",
      "Dust the pieces lightly with the rice flour so the skin crisps.",
      "Fry in the coconut oil for about 8 minutes, turning, until deep golden and crisp at the edges.",
      "Drain on a rack for 2 minutes and serve with the crisped marinade bits scattered over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-chicken-pastilla-style",
    name: { en: "Chicken Pastilla-Style (Moroccan Chicken and Almond Pie)", hindi: "चिकन पेस्टिला" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 480 }, // chicken breast
      { foodId: "usda-171287", grams: 200 }, // eggs, folded through the filling
      { foodId: "usda-2346393", grams: 80 }, // almonds, toasted and crushed
      { foodId: "usda-168936", grams: 160 }, // wheat flour, rolled into the pastry sheets
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171320", grams: 4 }, // cinnamon
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173410", grams: 30 }, // butter, for the pastry
      { foodId: "usda-334247", grams: 12 }, // sugar, the classic sweet dusting
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Roll the flour into very thin pastry sheets with a little water and salt, and keep them under a cloth.",
      "Simmer the chicken with the onion, ginger, cinnamon and salt for 20 minutes, until tender, then shred it and reduce the liquor.",
      "Stir the beaten eggs into the hot liquor off the boil, stirring until they set into soft, savoury curds.",
      "Layer pastry in an oiled dish, then the chicken, the egg curds and the crushed almonds, and fold the pastry over the top.",
      "Brush with the butter and bake in the oven at 190°C for about 25 minutes, until the pastry is crisp and deep golden.",
      "Dust with the sugar and a little more cinnamon, rest 5 minutes and serve in wedges.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwc-pork-tonkatsu",
    name: { en: "Pork Tonkatsu (Breaded Pork Cutlets with Cabbage)", hindi: "पोर्क टोंकात्सु" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin
      { foodId: "usda-168936", grams: 90 }, // wheat flour, for the crumb
      { foodId: "usda-171287", grams: 50 }, // egg, for the crumb
      { foodId: "usda-2346407", grams: 200 }, // cabbage, shredded to serve
      { foodId: "usda-167746", grams: 40 }, // lemon, to serve
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Slice the pork loin into four cutlets, flatten them slightly and season with the salt and pepper.",
      "Coat each cutlet in flour, then beaten egg, then flour again, pressing so the crumb holds.",
      "Rest the coated cutlets for 10 minutes so the crumb sets.",
      "Fry in the oil for about 5 minutes a side, until the crust is deep golden and the pork is cooked through.",
      "Rest on a rack for 3 minutes so the crust stays crisp, then slice each cutlet into strips.",
      "Serve over the shredded cabbage with the lemon wedges.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-pork-menudo-style",
    name: { en: "Pork Menudo-Style (Filipino Pork, Chickpea and Potato Stew)", hindi: "पोर्क मेनूडो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 500 }, // ground pork
      { foodId: "usda-2644282", grams: 150 }, // chickpeas, dry
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170419", grams: 100 }, // peas, green
      { foodId: "usda-170108", grams: 100 }, // sweet pepper, red
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 45 minutes, until tender, and drain.",
      "Brown the pork in the oil for 8 minutes, breaking it up, until it colours.",
      "Add the garlic, onion and pepper and fry 4 minutes, until softened.",
      "Add the tomatoes and a splash of water and simmer 10 minutes into a sauce.",
      "Stir in the chickpeas, potato cubes and peas, season with the salt and simmer about 15 minutes, until the potato is tender.",
      "Rest 5 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-sweet-sour-pork",
    name: { en: "Sweet and Sour Pork (Pork with Pineapple and Peppers)", hindi: "स्वीट एंड सावर पोर्क" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 560 }, // pork loin
      { foodId: "usda-168936", grams: 60 }, // wheat flour, for the light coat
      { foodId: "usda-169124", grams: 200 }, // pineapple
      { foodId: "usda-170427", grams: 100 }, // sweet pepper, green
      { foodId: "usda-170108", grams: 100 }, // sweet pepper, red
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomatoes, for the sauce
      { foodId: "usda-173469", grams: 30 }, // cider vinegar
      { foodId: "usda-334247", grams: 30 }, // sugar
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the pork into cubes, season with the salt and coat lightly in the flour.",
      "Fry the pork in the oil for about 8 minutes, until crisp at the edges and cooked through, then lift it out.",
      "Blitz the tomatoes and stir them with the vinegar and sugar into the sweet and sour sauce.",
      "Stir-fry the peppers and onion in the same pan for 3 minutes, keeping them crisp.",
      "Add the pineapple and the sauce and simmer 3 minutes, until glossy.",
      "Return the pork, toss for 1 minute so it shines in the sauce, and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-pork-carnitas-style",
    name: { en: "Pork Carnitas-Style (Slow Pork, Crisped at the Edges)", hindi: "पोर्क कार्निटास" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 640 }, // pork loin
      { foodId: "usda-746771", grams: 150 }, // oranges, for the braise
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Cut the pork into large chunks and season them with the salt and cumin.",
      "Pack the pork into a heavy pot with the onion, garlic, bay leaf and the squeezed orange halves, and add water to barely cover.",
      "Simmer gently for about 1 hour, until the pork is very tender and the liquid has nearly dried away.",
      "Lift the pork out and shred it into rough pieces with two forks.",
      "Crisp the shredded pork in the oil in a wide pan for 6 minutes, pressing it down, until the edges catch and caramelise.",
      "Serve with the pan juices and crisped bits spooned over.",
    ],
    timeMinutes: 80,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-twice-cooked-pork",
    name: { en: "Twice-Cooked Pork (Hui Guo Rou-Style, Pork with Peppers)", hindi: "ट्वाइस-कुक्ड पोर्क" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 560 }, // pork loin
      { foodId: "usda-170427", grams: 200 }, // sweet pepper, green
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // hot chilli, green
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the whole pork loin in salted water for about 20 minutes, until just cooked through, then cool it and slice it thin.",
      "Heat the oil until smoking and fry the pork slices for 4 minutes, until their edges curl and crisp.",
      "Add the garlic, ginger and chilli and fry for 1 minute.",
      "Add the peppers and cabbage and stir-fry 4 minutes, until they wilt at the edges but stay bright.",
      "Season with the salt, toss everything together for 1 minute.",
      "Serve at once, straight from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-porchetta-style",
    name: { en: "Porchetta-Style Roast Pork (Fennel and Garlic Pork Loin)", hindi: "पोर्केटा रोस्ट पोर्क" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 640 }, // pork loin
      { foodId: "usda-171323", grams: 8 }, // fennel seed, crushed for the rub
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-170932", grams: 3 }, // cayenne pepper
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 8 }, // salt
    ],
    method: [
      "Crush the fennel seed with the garlic, cayenne and salt into the porchetta rub.",
      "Score the pork loin, rub the paste deep into the cuts and leave it for at least 1 hour.",
      "Heat the oven to 200°C and roast the pork for 20 minutes, until the outside starts to crisp.",
      "Lower the oven to 170°C and roast about 35 minutes more, until the pork is cooked through and juicy.",
      "Rest the joint for 10 minutes so the juices settle.",
      "Slice thickly and serve with the resting juices spooned over.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pwc-beef-birria-style",
    name: { en: "Beef Birria-Style (Mexican Chilli Beef Stew)", hindi: "बीफ़ बिरिया" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 640 }, // ground beef
      { foodId: "usda-170457", grams: 300 }, // tomatoes, for the chilli broth
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171319", grams: 10 }, // chilli powder
      { foodId: "usda-170923", grams: 5 }, // cumin seed
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Blitz the tomatoes, half the onion, the garlic, chilli powder, cumin and cinnamon into the birria sauce.",
      "Brown the beef in the oil for 8 minutes, breaking it up, until it colours deeply.",
      "Pour in the sauce and vinegar, season with the salt and add water to make a broth.",
      "Simmer gently for about 35 minutes, until the beef is tender and the broth turns dark red and rich.",
      "Rest 5 minutes and skim any fat from the surface.",
      "Serve the beef in its broth with the rest of the onion, chopped, scattered over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-beef-lomo-saltado-style",
    name: { en: "Beef Lomo Saltado-Style (Peruvian Beef and Potato Stir-Fry)", hindi: "लोमो साल्टाडो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 560 }, // ground beef, the set's beef (the classic stir-fries strips)
      { foodId: "usda-2346401", grams: 400 }, // potatoes, cut as chips
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-169997", grams: 15 }, // coriander leaves, to finish
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Fry the potato chips in half the oil for about 12 minutes, until golden and tender, then lift them out.",
      "Stir-fry the beef in the rest of the oil over the highest heat for 5 minutes, until it browns and its juices reduce.",
      "Add the onion wedges and fry 2 minutes, keeping them crisp at the edges.",
      "Add the tomatoes and vinegar and toss for 2 minutes, until the tomatoes soften into a juicy sauce.",
      "Fold the chips back through so they drink up the sauce.",
      "Scatter the coriander leaves over and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-beef-spezzatino",
    name: { en: "Beef Spezzatino (Italian Beef, Potato and Pea Stew)", hindi: "बीफ़ स्पेज़ातीनो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 600 }, // ground beef
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-170419", grams: 150 }, // peas, green
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Brown the beef in the olive oil for 8 minutes, breaking it up, until it colours.",
      "Add the onion, garlic and carrots and fry 4 minutes, until softened.",
      "Add the tomatoes and a splash of water and simmer 10 minutes into a sauce.",
      "Stir in the potato cubes, season with the salt and simmer about 18 minutes, until tender.",
      "Add the peas and simmer 4 minutes more, until they are bright and cooked.",
      "Rest 5 minutes and serve with the sauce spooned over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-ghormeh-sabzi-style",
    name: { en: "Ghormeh Sabzi-Style (Herb Stew with Beef and Kidney Beans)", hindi: "घोरमेह सब्ज़ी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 400 }, // ground beef
      { foodId: "usda-175193", grams: 250 }, // kidney beans, dry
      { foodId: "usda-168462", grams: 300 }, // spinach, the herb pot's base
      { foodId: "usda-169997", grams: 50 }, // coriander leaves
      { foodId: "usda-168416", grams: 50 }, // drumstick leaves, for the bitter herb note
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-167746", grams: 60 }, // lemon, where the classic uses dried lime
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, then boil them in fresh water for about 45 minutes, until tender, and drain.",
      "Fry the chopped spinach, coriander leaves and drumstick leaves in the oil for about 10 minutes, until they darken and dry out, which is where the stew's depth comes from.",
      "Brown the beef with the onion and turmeric in the same pot for 8 minutes.",
      "Add the beans and water to cover and simmer gently for about 30 minutes.",
      "Season with the salt and lemon juice and simmer 5 minutes more, until the stew is dark green and rich.",
      "Rest 5 minutes and serve with the herb sauce spooned over.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-kibbeh-style",
    name: { en: "Kibbeh-Style (Stuffed Semolina and Beef Croquettes)", hindi: "किब्बेह" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 420 }, // ground beef, split between shell and filling
      { foodId: "usda-168933", grams: 260 }, // semolina, for the shell (the set carries no bulgur)
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173475", grams: 10 }, // spearmint, in the filling
      { foodId: "usda-170923", grams: 4 }, // cumin seed
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the semolina in warm salted water for 20 minutes, then knead it with a third of the raw beef into a smooth, pliable shell paste.",
      "Fry the rest of the beef with the onion, cumin and spearmint for 8 minutes, until dry and crumbly, and cool the filling.",
      "Wet your hands and roll the shell paste into balls, hollowing each one with a thumb.",
      "Fill each shell with the beef mixture and seal it into a pointed oval.",
      "Fry the kibbeh in the oil for about 8 minutes, turning, until deep golden and crisp.",
      "Drain for 2 minutes and serve hot.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-lamb-navarin-style",
    name: { en: "Lamb Navarin-Style (Lamb Stew with Spring Vegetables)", hindi: "लैम्ब नवारिन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // ground lamb
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-170419", grams: 150 }, // peas, green
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Brown the lamb in the olive oil for 8 minutes, breaking it up, until it colours.",
      "Add the onion and garlic and fry 3 minutes, until softened.",
      "Add the tomatoes and water to cover and simmer 15 minutes into a light stew.",
      "Add the potatoes and carrots, season with the salt and simmer about 15 minutes, until tender.",
      "Add the green beans and peas and simmer 5 minutes more, until bright and just cooked.",
      "Rest 5 minutes and serve with the vegetables spooned over the lamb.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-scotch-broth-style",
    name: { en: "Scotch Broth-Style (Lamb and Barley Soup)", hindi: "स्कॉच ब्रॉथ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 500 }, // ground lamb
      { foodId: "usda-170284", grams: 200 }, // barley, pearled
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-2346407", grams: 150 }, // cabbage
      { foodId: "usda-170419", grams: 100 }, // peas, green
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173468", grams: 7 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Brown the lamb in a heavy pot for 8 minutes, breaking it up, and skim the fat.",
      "Add the barley and plenty of water and bring to a simmer.",
      "Add the onion and carrots and simmer gently for about 35 minutes, until the barley swells and softens.",
      "Add the cabbage and peas and simmer 8 minutes more.",
      "Season with the salt and pepper and rest 5 minutes.",
      "Serve in deep bowls with the broth ladled over.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-cassoulet-style",
    name: { en: "Cassoulet-Style (White Beans with Pork and Turkey)", hindi: "कैसूले" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 300 }, // navy beans, dry
      { foodId: "usda-2514745", grams: 300 }, // ground pork, standing in for the sausage
      { foodId: "usda-171098", grams: 200 }, // turkey breast, standing in for the confit
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the navy beans overnight, then boil them in fresh water for about 45 minutes, until just tender, and drain, keeping the liquor.",
      "Brown the pork and the turkey pieces in the olive oil for 8 minutes, until coloured.",
      "Add the onion, garlic and tomatoes and fry 5 minutes into a sauce.",
      "Tip in the beans with enough of their liquor to cover, season with the salt and stir together.",
      "Bake in the oven at 170°C for about 45 minutes, until a golden crust forms on the beans.",
      "Rest 10 minutes and serve straight from the pot.",
    ],
    timeMinutes: 105,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwc-cocido-style",
    name: { en: "Cocido-Style (Madrid Chickpea Stew with Beef and Pork)", hindi: "कोसीदो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 300 }, // chickpeas, dry
      { foodId: "usda-168608", grams: 250 }, // ground beef
      { foodId: "usda-2514745", grams: 200 }, // ground pork
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 50 minutes, until tender, and drain, keeping the broth.",
      "Brown the beef and pork in the olive oil for 8 minutes, breaking them up.",
      "Add the garlic, carrots and potato chunks and fry 3 minutes.",
      "Add the chickpeas and their broth to cover and simmer gently for about 25 minutes.",
      "Add the cabbage, season with the salt and simmer 8 minutes more, until it wilts into the stew.",
      "Rest 5 minutes and serve the meats, chickpeas and vegetables together in the broth.",
    ],
    timeMinutes: 90,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-petit-sale-style",
    name: { en: "Petit Salé-Style (Pork with Lentils)", hindi: "पेटिट साले" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 500 }, // pork loin, standing in for the salt pork
      { foodId: "usda-2644283", grams: 250 }, // lentils, dry
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the pork loin in water with the bay leaf for about 30 minutes, until tender, then lift it out and keep the broth.",
      "Add the lentils, carrots, onion and garlic to the broth and simmer about 25 minutes, until the lentils are soft.",
      "Slice the pork thickly.",
      "Return the pork slices to the lentils and simmer 5 minutes so they take the broth.",
      "Season with the salt, tasting first, as the dish wants a light hand.",
      "Serve the pork over the lentils with the broth spooned over.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-fish-tikka",
    name: { en: "Fish Tikka (Spiced Grilled Tilapia in Yogurt Marinade)", hindi: "फिश टिक्का" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-170903", grams: 150 }, // Greek yogurt, lowfat, for the marinade
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170923", grams: 4 }, // cumin seed, ground in the method
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-172337", grams: 14 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Stir the yogurt with the chilli powder, turmeric, ground cumin, crushed garlic, lemon juice and salt into the tikka marinade.",
      "Cut the tilapia into large chunks and coat them in the marinade for at least 20 minutes.",
      "Thread the fish onto skewers, leaving a little space between the chunks.",
      "Grill on a hot, oiled griddle for about 4 minutes a side, until the edges char and the fish flakes.",
      "Brush with the mustard oil as it comes off the heat.",
      "Rest 2 minutes and serve with the lemon wedges.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-tilapia-veracruz-style",
    name: { en: "Tilapia Veracruz-Style (Fish in Tomato and Pepper Sauce)", hindi: "तिलापिया वेराक्रूज़" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // sweet pepper, green
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz half the tomatoes into a purée and chop the rest.",
      "Soften the onion, pepper and garlic in the olive oil for 6 minutes.",
      "Add the tomato purée and chopped tomatoes, season with the salt and simmer 8 minutes into the Veracruz sauce.",
      "Lay the tilapia fillets into the sauce, cover and simmer gently for about 8 minutes, until the fish flakes.",
      "Squeeze the lemon over and rest 2 minutes.",
      "Serve the fish with the sauce spooned generously over.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwc-paella-style",
    name: { en: "Chicken and Shrimp Paella-Style (Saffron-Free, Turmeric Rice)", hindi: "पाएया" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 400 }, // chicken thigh
      { foodId: "usda-175179", grams: 300 }, // shrimp
      { foodId: "usda-2512381", grams: 300 }, // rice, white
      { foodId: "usda-170419", grams: 150 }, // peas, green
      { foodId: "usda-170108", grams: 150 }, // sweet pepper, red
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-172231", grams: 3 }, // turmeric, for the golden rice (the set carries no saffron)
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Brown the chicken pieces in the olive oil in a wide, shallow pan for 8 minutes, then lift them out.",
      "Fry the pepper, garlic and grated tomato in the same pan for 5 minutes into a sofrito.",
      "Stir in the rice and turmeric, then pour in hot water, season with the salt and spread the rice level.",
      "Lay the chicken back over the rice and simmer without stirring for about 15 minutes.",
      "Scatter the shrimp and peas over the top and cook 5 minutes more, until the rice is tender and the shrimp are pink.",
      "Rest off the heat for 5 minutes and serve straight from the pan.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-shrimp-etouffee-style",
    name: { en: "Shrimp Étouffée-Style (Cajun Shrimp in a Brown Roux, over Rice)", hindi: "श्रिम्प एटूफ़े" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 560 }, // shrimp
      { foodId: "usda-168936", grams: 60 }, // wheat flour, for the roux
      { foodId: "usda-173410", grams: 40 }, // butter, for the roux
      { foodId: "usda-2512381", grams: 200 }, // rice, white, to serve
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 100 }, // sweet pepper, green
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170932", grams: 3 }, // cayenne pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the rice in salted water until tender, drain and keep warm.",
      "Melt the butter, stir in the flour and cook the roux, stirring, for about 8 minutes, until it turns the colour of milk chocolate.",
      "Add the onion, pepper and garlic and fry 4 minutes in the roux.",
      "Pour in water a little at a time, stirring, until a rich sauce forms, and season with the cayenne and salt.",
      "Add the shrimp and simmer gently for about 5 minutes, until they curl and turn pink.",
      "Serve the étouffée ladled over the rice.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-cioppino-style",
    name: { en: "Cioppino-Style (Tomato Seafood Stew with Cod and Shrimp)", hindi: "चोपीनो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 300 }, // cod
      { foodId: "usda-175179", grams: 350 }, // shrimp
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171323", grams: 4 }, // fennel seed
      { foodId: "usda-170932", grams: 2 }, // cayenne pepper
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Blitz the tomatoes into a purée.",
      "Soften the onion, garlic and fennel seed in the olive oil for 6 minutes.",
      "Pour in the tomato purée, season with the cayenne and salt and simmer 10 minutes into the stew base.",
      "Add the cod chunks and simmer gently for 5 minutes.",
      "Add the shrimp and simmer about 4 minutes more, until they turn pink and the cod flakes.",
      "Rest 2 minutes and serve in deep bowls with the broth ladled over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwc-shrimp-ojja",
    name: { en: "Shrimp Ojja (Tunisian Eggs with Shrimp in Tomato Sauce)", hindi: "श्रिम्प ओज्जा" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 350 }, // shrimp
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170427", grams: 100 }, // sweet pepper, green
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin seed, ground in the method
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the tomatoes into a rough purée.",
      "Fry the garlic and pepper in the olive oil for 3 minutes.",
      "Pour in the tomatoes, season with the ground cumin and salt and simmer 8 minutes, until the sauce thickens.",
      "Add the shrimp and simmer 3 minutes, until they turn pink.",
      "Crack the eggs over the sauce, cover and cook gently for about 5 minutes, until the whites set and the yolks stay soft.",
      "Serve straight from the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwc-acorda-style",
    name: { en: "Açorda-Style (Portuguese Bread Soup with Shrimp and Egg)", hindi: "असोर्डा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 350 }, // shrimp
      { foodId: "usda-171287", grams: 150 }, // eggs, stirred through at the end
      { foodId: "usda-168936", grams: 200 }, // wheat flour, baked into the bread the soup is built on
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-171413", grams: 21 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Bake a simple loaf from the flour, water and a pinch of salt in the oven at 200°C for about 25 minutes, and tear it into chunks once cool.",
      "Simmer the shrimp in salted water for 3 minutes, lift them out and keep the broth.",
      "Fry the garlic gently in the olive oil until golden, without letting it burn.",
      "Add the bread chunks and ladle the hot broth over, stirring, until the bread collapses into a thick, porridge-like soup.",
      "Stir in the beaten eggs off the boil so they thicken the soup without scrambling, and fold the shrimp back through.",
      "Scatter the coriander leaves over and serve at once.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwc-turkey-tonnato-style",
    name: { en: "Turkey Tonnato-Style (Sliced Turkey in Tuna Sauce)", hindi: "टर्की टोनाटो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171496", grams: 400 }, // turkey breast, cooked, roasted
      { foodId: "usda-334194", grams: 150 }, // tuna, canned in water, for the sauce
      { foodId: "usda-330137", grams: 150 }, // Greek yogurt, nonfat, for the sauce
      { foodId: "usda-172184", grams: 34 }, // egg yolk, for the sauce
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Blitz the tuna, yogurt, egg yolk, lemon juice and olive oil into the smooth tonnato sauce and season it with the salt and pepper.",
      "Slice the roasted turkey breast as thinly as you can.",
      "Lay the turkey slices overlapping on a cold plate.",
      "Spoon the sauce over the turkey so every slice is coated.",
      "Chill in the fridge for 20 minutes so the flavours marry.",
      "Serve cold, straight from the fridge.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-pwc-paneer-kofta",
    name: { en: "Paneer Kofta in Tomato Sauce", hindi: "पनीर कोफ़्ता" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 400 }, // paneer, from the CoFID record
      { foodId: "usda-2346401", grams: 200 }, // potatoes, to bind the kofta
      { foodId: "usda-174288", grams: 60 }, // chickpea flour (besan), to bind
      { foodId: "usda-170457", grams: 300 }, // tomatoes, for the sauce
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170903", grams: 100 }, // Greek yogurt, lowfat, for the sauce
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts, ground into the sauce
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170924", grams: 6 }, // curry powder
      { foodId: "usda-171314", grams: 14 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the potatoes until tender, mash them and knead with the grated paneer, besan and half the salt into a soft kofta mixture.",
      "Roll the mixture into balls and fry them in the ghee for about 6 minutes, turning, until golden all over, then lift them out.",
      "Blitz the tomatoes, onion, garlic, ginger and cashews into the sauce base.",
      "Fry the sauce base in the same pan for 8 minutes, until it darkens and thickens.",
      "Stir in the curry powder, yogurt and a splash of water and simmer 5 minutes into a smooth sauce, seasoning with the rest of the salt.",
      "Slide the kofta into the sauce, simmer 2 minutes so they drink it up, and serve.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-paneer-pakora",
    name: { en: "Paneer Pakora (Besan-Battered Paneer Fritters)", hindi: "पनीर पकोड़ा" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 450 }, // paneer, from the CoFID record
      { foodId: "usda-174288", grams: 130 }, // chickpea flour (besan), for the batter
      { foodId: "usda-169714", grams: 30 }, // rice flour, for crispness
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170923", grams: 4 }, // cumin seed
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the paneer into thick fingers and season them with the salt and chilli powder.",
      "Whisk the besan, rice flour, turmeric and cumin with water into a thick batter that coats the back of a spoon.",
      "Rest the batter for 10 minutes so the flours hydrate.",
      "Dip each paneer finger in the batter so it is fully coated.",
      "Fry in the hot oil for about 5 minutes, turning, until deep golden and crisp.",
      "Drain for 2 minutes and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-paneer-paratha",
    name: { en: "Paneer Paratha (Paneer-Stuffed Whole Wheat Flatbread)", hindi: "पनीर पराठा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 350 }, // paneer, from the CoFID record
      { foodId: "usda-168893", grams: 300 }, // wheat flour, whole-grain
      { foodId: "usda-170497", grams: 10 }, // hot chilli, green
      { foodId: "usda-169997", grams: 15 }, // coriander leaves
      { foodId: "usda-170923", grams: 3 }, // cumin seed
      { foodId: "usda-171314", grams: 14 }, // ghee, for the pan
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with water and half the salt into a soft dough and rest it for 20 minutes.",
      "Crumble the paneer and mix it with the chopped green chilli, coriander leaves, cumin and the rest of the salt.",
      "Roll a dough ball out, place a quarter of the paneer in the centre and seal the dough over it.",
      "Roll the stuffed ball gently into a paratha, keeping the filling inside.",
      "Cook on a hot griddle with a little ghee for about 3 minutes a side, until golden spots appear.",
      "Serve hot, straight from the griddle.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-malfatti",
    name: { en: "Malfatti (Spinach and Ricotta Dumplings in Tomato Sauce)", hindi: "मालफ़ात्ती" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-323444", grams: 550 }, // ricotta
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-325036", grams: 100 }, // parmesan, grated
      { foodId: "usda-171287", grams: 100 }, // eggs, to bind
      { foodId: "usda-168936", grams: 100 }, // wheat flour, to bind and dust
      { foodId: "usda-170457", grams: 300 }, // tomatoes, for the sauce
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Wilt the spinach in a dry pan for 3 minutes, squeeze it completely dry and chop it fine.",
      "Mix the ricotta, spinach, parmesan, eggs, flour and salt into a soft dumpling mixture and chill it in the fridge for 20 minutes.",
      "Blitz the tomatoes with the garlic and simmer them in the olive oil for 10 minutes into a sauce.",
      "Roll the mixture into walnut-size dumplings with floured hands.",
      "Poach the dumplings in gently simmering water for about 4 minutes, until they float and feel firm.",
      "Lift them into the tomato sauce, toss gently and serve with the sauce spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwc-chicken-pakora",
    name: { en: "Chicken Pakora (Besan-Battered Chicken Fritters)", hindi: "चिकन पकोड़ा" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 450 }, // chicken breast
      { foodId: "usda-174288", grams: 150 }, // chickpea flour (besan), for the batter
      { foodId: "usda-169714", grams: 30 }, // rice flour, for crispness
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the chicken into bite-size pieces and rub them with the garlic, ginger, chilli powder, turmeric and salt.",
      "Whisk the besan and rice flour with water into a thick batter.",
      "Fold the chicken through the batter so every piece is coated.",
      "Rest for 10 minutes so the batter clings.",
      "Fry in the hot oil for about 7 minutes, turning, until deep golden, crisp and cooked through.",
      "Drain for 2 minutes and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-brik-style",
    name: { en: "Brik-Style (Tunisian Tuna and Egg Pastry)", hindi: "ब्रिक" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 280 }, // tuna, canned in water
      { foodId: "usda-171287", grams: 250 }, // eggs, one folded into each pastry
      { foodId: "usda-168936", grams: 180 }, // wheat flour, rolled into the pastry sheets
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 28 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Roll the flour into paper-thin pastry sheets with a little water and salt.",
      "Flake the tuna and mix it with the chopped onion, coriander leaves, lemon juice and salt.",
      "Lay a quarter of the tuna in the centre of a pastry sheet and crack an egg over it.",
      "Fold the pastry into a sealed triangle, pinching the edges hard.",
      "Fry in the hot oil for about 3 minutes a side, until blistered and golden, keeping the yolk soft.",
      "Serve at once with the lemon wedges.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-akara",
    name: { en: "Akara (Nigerian Cowpea Fritters)", hindi: "अकारा" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 450 }, // cowpeas (black-eyed peas), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170106", grams: 10 }, // hot chilli, red
      { foodId: "usda-171410", grams: 28 }, // peanut oil, for frying
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the cowpeas for 1 hour, rub off their skins and rinse until the water runs clear.",
      "Blitz the skinned cowpeas with the onion, chilli and a little water into a thick, airy batter.",
      "Whisk the batter for 2 minutes to beat in air, which is what makes the fritters light, and season with the salt.",
      "Drop spoonfuls of batter into the hot oil.",
      "Fry for about 5 minutes, turning, until deep golden and crisp outside and fluffy inside.",
      "Drain for 2 minutes and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-moin-moin-style",
    name: { en: "Moin Moin-Style (Steamed Cowpea Pudding with Egg)", hindi: "मोइन मोइन" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 400 }, // cowpeas (black-eyed peas), dry
      { foodId: "usda-171287", grams: 100 }, // eggs, set into the pudding
      { foodId: "usda-170108", grams: 100 }, // sweet pepper, red
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171410", grams: 14 }, // peanut oil (the classic palm oil is not in the set)
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the cowpeas for 1 hour, rub off their skins and rinse them clean.",
      "Blitz the cowpeas with the pepper, onion and a little water into a smooth batter.",
      "Stir in the oil and salt and whisk the batter until it lightens.",
      "Pour the batter into small oiled cups and press a quarter of a boiled egg into each.",
      "Steam the cups over simmering water for about 35 minutes, until the puddings are set and firm.",
      "Rest 5 minutes, unmould and serve warm.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-tofu-edamame-peanut-curry",
    name: { en: "Tofu and Edamame Peanut Curry", hindi: "टोफ़ू एडामामे पीनट करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174290", grams: 500 }, // tofu, extra firm
      { foodId: "usda-168411", grams: 250 }, // edamame, prepared
      { foodId: "usda-172430", grams: 80 }, // peanuts, ground into the sauce
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-330458", grams: 14 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Grind the peanuts into a rough paste with a little water.",
      "Fry the tofu cubes in the coconut oil for about 6 minutes, until golden at the edges, then lift them out.",
      "Fry the garlic, ginger and curry powder in the same pan for 1 minute.",
      "Pour in the coconut milk and peanut paste, season with the salt and simmer 5 minutes into the curry sauce.",
      "Return the tofu with the edamame and simmer 4 minutes, until everything is hot through.",
      "Fold the spinach through until it wilts and serve.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwc-lupin-sweet-potato-curry",
    name: { en: "Lupin and Sweet Potato Curry", hindi: "ल्यूपिन शकरकंद करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F005249", grams: 280 }, // lupin splits
      { foodId: "usda-2346404", grams: 400 }, // sweet potatoes
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-330458", grams: 14 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the lupin splits for 1 hour, then boil them in fresh water for about 30 minutes, until tender, and drain.",
      "Fry the onion and garlic in the coconut oil for 4 minutes, until softened.",
      "Add the curry powder and fry for 1 minute, until fragrant.",
      "Add the sweet potato cubes and coconut milk and simmer about 12 minutes, until the potato is tender.",
      "Stir in the lupin splits, season with the salt and simmer 5 minutes so they take the sauce.",
      "Fold the spinach through until it wilts and serve.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-pupusas",
    name: { en: "Pupusas (Salvadoran Stuffed Corn Cakes with Curtido)", hindi: "पुपुसास" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 300 }, // cornmeal, for the cakes
      { foodId: "usda-329370", grams: 250 }, // mozzarella, for the filling (the set carries no quesillo)
      { foodId: "usda-173734", grams: 200 }, // black beans, dry, for the filling
      { foodId: "usda-2346407", grams: 150 }, // cabbage, for the curtido
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, for the curtido
      { foodId: "usda-2258586", grams: 60 }, // carrots, for the curtido
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the black beans in salted water for about 40 minutes, until soft, then mash half of them into a thick filling and stir the rest through.",
      "Shred the cabbage and carrots, toss them with the vinegar and a pinch of salt and leave the curtido to pickle.",
      "Knead the cornmeal with warm water and the rest of the salt into a soft dough and rest it for 10 minutes.",
      "Flatten a dough ball in your palm, fill it with the beans and mozzarella and seal it into a thick cake.",
      "Cook the pupusas on a hot, oiled griddle for about 4 minutes a side, until golden spots appear and the cheese melts.",
      "Serve hot with the curtido piled alongside.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-maultaschen-style",
    name: { en: "Maultaschen-Style (Swabian Beef and Spinach Dumplings)", hindi: "माउल्टाशेन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 400 }, // ground beef
      { foodId: "usda-168936", grams: 260 }, // wheat flour, for the dumpling dough
      { foodId: "usda-171287", grams: 50 }, // egg, for the dough
      { foodId: "usda-168462", grams: 200 }, // spinach, in the filling
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour, egg and a little water into a firm dumpling dough and rest it for 20 minutes.",
      "Wilt the spinach, squeeze it dry and chop it fine.",
      "Mix the beef with the spinach, grated onion, salt and pepper into the filling.",
      "Roll the dough thin, place spoonfuls of filling along it, fold the dough over and cut it into large ravioli-like dumplings, sealing the edges.",
      "Poach the dumplings in gently simmering salted water for about 10 minutes, until the filling is cooked through.",
      "Serve in their poaching broth or drained with the broth alongside.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-full-english-style",
    name: { en: "Full English-Style Breakfast (Grilled Turkey, Eggs and Tomato Beans)", hindi: "फुल इंग्लिश ब्रेकफ़ास्ट" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 200 }, // turkey breast, grilled in place of bacon
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-173745", grams: 200 }, // navy beans, dry, for the tomato beans
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-168936", grams: 60 }, // wheat flour, baked as the toast loaf
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the navy beans in salted water for about 40 minutes, until tender, then simmer them in the blitzed tomatoes for 10 minutes into baked-bean-style tomato beans.",
      "Bake a small loaf from the flour and water in the oven at 200°C for about 20 minutes, and slice it for toast.",
      "Grill the turkey slices on a hot griddle for about 4 minutes a side, until they take char lines.",
      "Fry the mushrooms in half the butter for 5 minutes, until golden.",
      "Fry the eggs in the rest of the butter to your liking.",
      "Serve everything together on warm plates with the toast.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwc-toad-in-the-hole-style",
    name: { en: "Toad-in-the-Hole-Style (Turkey Meatballs Baked in Batter)", hindi: "टोड इन द होल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 450 }, // ground turkey, rolled into meatballs (the set carries no sausage)
      { foodId: "usda-168936", grams: 200 }, // wheat flour, for the batter
      { foodId: "usda-171287", grams: 150 }, // eggs, for the batter
      { foodId: "usda-322559", grams: 200 }, // skim milk, for the batter
      { foodId: "usda-790646", grams: 80 }, // onion, in the meatballs
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Season the turkey with the salt and grated onion and roll it into small meatballs.",
      "Whisk the flour, eggs and milk into a smooth batter and rest it for 15 minutes.",
      "Heat the oven to 220°C with the oil in a baking dish inside, until the oil is smoking hot.",
      "Drop the meatballs into the hot dish and pour the batter over them at once.",
      "Bake for about 25 minutes without opening the oven, until the batter has puffed up golden around the meatballs.",
      "Serve straight from the dish.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pwc-lablabi",
    name: { en: "Lablabi (Tunisian Chickpea Soup with Egg and Flatbread)", hindi: "लब्लाबी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 350 }, // chickpeas, dry
      { foodId: "usda-171287", grams: 200 }, // eggs, poached over the soup
      { foodId: "usda-168936", grams: 100 }, // wheat flour, baked as the flatbread torn into the bowls
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 5 }, // cumin seed, ground in the method
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 50 minutes, until very soft, and keep the broth.",
      "Bake a flatbread from the flour and water in the oven at 220°C for about 10 minutes, and tear it into the bottom of four bowls.",
      "Season the chickpeas and their broth with the crushed garlic, ground cumin and salt and simmer 5 minutes.",
      "Poach the eggs in the simmering chickpea broth for about 4 minutes, until the whites set.",
      "Ladle the chickpeas and broth over the bread in each bowl and top with a poached egg.",
      "Finish with the olive oil and lemon juice and serve at once.",
    ],
    timeMinutes: 65,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwc-okro-soup-style",
    name: { en: "Okro Soup-Style (Okra with Shrimp and Turkey)", hindi: "ओक्रो सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp
      { foodId: "usda-2514747", grams: 250 }, // ground turkey
      { foodId: "usda-169260", grams: 300 }, // okra
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170106", grams: 8 }, // hot chilli, red
      { foodId: "usda-171410", grams: 14 }, // peanut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the tomatoes, onion and chilli into the soup base.",
      "Brown the turkey in the peanut oil for 6 minutes, breaking it up.",
      "Pour in the tomato base and simmer 8 minutes into a sauce.",
      "Add the sliced okra and a little water and simmer about 8 minutes, stirring, until the soup turns silky and draws threads.",
      "Add the shrimp, season with the salt and simmer 3 minutes, until they turn pink.",
      "Serve hot in deep bowls.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
];

export const BALANCED_WAVE_C_DISHES: readonly Dish[] = [
  /* --------------------- balanced plates --------------------- */
  {
    id: "dish-pwc-rolex",
    name: { en: "Ugandan Rolex (Egg and Vegetable Flatbread Wrap)", hindi: "रॉलेक्स रैप" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 250 }, // eggs, one omelette per wrap
      { foodId: "usda-168893", grams: 200 }, // wheat flour, whole-grain, for the flatbreads
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-2346407", grams: 100 }, // cabbage
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the flour with water and half the salt into a soft dough, rest it for 15 minutes and roll it into four thin flatbreads.",
      "Cook the flatbreads on a hot, dry griddle for about 2 minutes a side, until they puff and spot, and keep them warm.",
      "Beat the eggs with the rest of the salt and pour a quarter into an oiled pan with some of the onion, tomato and cabbage.",
      "Cook the omelette for about 3 minutes, until just set, and lay it over a warm flatbread.",
      "Roll the flatbread tightly around the omelette.",
      "Repeat for the other three and serve the rolex wraps hot.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-salmorejo-style",
    name: { en: "Salmorejo-Style (Tomato and Bread Soup with Egg)", hindi: "सालमोरेजो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170457", grams: 600 }, // tomatoes
      { foodId: "usda-168936", grams: 220 }, // wheat flour, baked into the bread the soup is built on
      { foodId: "usda-171287", grams: 200 }, // eggs, boiled and chopped over the top
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171413", grams: 21 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Bake a simple loaf from the flour, water and a pinch of salt in the oven at 200°C for about 25 minutes, and tear the crumb into pieces once cool.",
      "Boil the eggs for 9 minutes, cool them and chop them.",
      "Blitz the tomatoes and garlic into a smooth purée.",
      "Add the bread pieces and blitz again, pouring in the olive oil, until the soup turns thick, smooth and pale orange.",
      "Season with the salt and chill the soup in the fridge for at least 30 minutes.",
      "Serve cold with the chopped egg scattered over.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-pwc-tortilla-espanola",
    name: { en: "Tortilla Española (Spanish Potato and Egg Omelette)", hindi: "टॉर्टिया एस्पान्योला" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 350 }, // eggs
      { foodId: "usda-2346401", grams: 500 }, // potatoes
      { foodId: "usda-329370", grams: 80 }, // mozzarella, melted through the middle
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-171413", grams: 21 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Slice the potatoes and onion thinly and cook them gently in the olive oil for about 15 minutes, until soft but not browned.",
      "Beat the eggs with the salt and stir the warm potatoes and onion through them.",
      "Pour half the mixture into a hot, oiled pan, scatter the mozzarella over and cover with the rest.",
      "Cook gently for about 6 minutes, until the base sets and the top is nearly set.",
      "Slide the tortilla onto a plate, flip it back into the pan and cook 3 minutes more.",
      "Rest 5 minutes and serve in wedges, warm or at room temperature.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-piperade-style",
    name: { en: "Piperade-Style (Basque Peppers with Egg and Turkey)", hindi: "पिपेराद" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-171098", grams: 150 }, // turkey breast, in place of the classic ham
      { foodId: "usda-170427", grams: 200 }, // sweet pepper, green
      { foodId: "usda-170108", grams: 150 }, // sweet pepper, red
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion and peppers in the olive oil for about 10 minutes, until sweet and silky.",
      "Add the tomatoes and simmer 6 minutes, until the piperade thickens.",
      "Stir in the turkey strips and cook 4 minutes, until they are cooked through.",
      "Pour in the beaten eggs, season with the salt and stir gently over a low heat.",
      "Cook for about 3 minutes, until the eggs set softly in ribbons through the peppers.",
      "Serve at once, straight from the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-mirza-ghasemi",
    name: { en: "Mirza Ghasemi (Charred Eggplant with Egg and Tomato)", hindi: "मिर्ज़ा घासेमी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2685577", grams: 500 }, // eggplant
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Char the whole eggplants directly over a flame or under a hot grill, turning, until their skins blacken and the flesh collapses.",
      "Cool, peel off the skins and mash the smoky flesh.",
      "Fry the garlic and turmeric in the oil for 1 minute, then add the blitzed tomatoes and simmer 8 minutes into a sauce.",
      "Stir the eggplant flesh through the sauce and simmer 5 minutes.",
      "Pour in the beaten eggs, season with the salt and stir gently until they set in soft curds through the eggplant.",
      "Serve warm with the sauce glossy over the top.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-ash-reshteh-style",
    name: { en: "Ash Reshteh-Style (Herb, Bean and Noodle Soup)", hindi: "आश रेशतेह" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 180 }, // kidney beans, dry
      { foodId: "usda-2644282", grams: 120 }, // chickpeas, dry
      { foodId: "usda-168936", grams: 150 }, // wheat flour, rolled into the soup noodles
      { foodId: "usda-168462", grams: 200 }, // spinach, the herb pot
      { foodId: "usda-169997", grams: 40 }, // coriander leaves
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171411", grams: 14 }, // soybean oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the kidney beans and chickpeas overnight, then boil them in fresh water for about 45 minutes, until tender, and keep the broth.",
      "Roll the flour with water into a dough, cut it into thin noodles and dust them with flour.",
      "Fry the onion and turmeric in the oil for 4 minutes, until golden.",
      "Add the beans, chickpeas and their broth and simmer 10 minutes.",
      "Add the noodles and chopped herbs and simmer about 8 minutes, until the noodles are tender and the soup thickens.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-bissara",
    name: { en: "Bissara (Moroccan Broad Bean Soup)", hindi: "बिस्सारा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F000416", grams: 350 }, // broad beans, dried
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 5 }, // cumin seed, ground in the method
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the broad beans overnight, then boil them in fresh water for about 45 minutes, until they collapse.",
      "Add the garlic for the last 10 minutes of cooking.",
      "Blitz the beans with enough of their liquor to make a thick, smooth soup.",
      "Season with the ground cumin, salt and lemon juice and simmer 5 minutes.",
      "Rest 3 minutes so the soup thickens a little more.",
      "Serve with the olive oil swirled over the top.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-causa-style",
    name: { en: "Causa-Style (Peruvian Layered Potato with Tuna and Egg)", hindi: "काउसा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-334194", grams: 250 }, // tuna, canned in water
      { foodId: "usda-171287", grams: 100 }, // eggs, boiled and sliced
      { foodId: "usda-171705", grams: 150 }, // avocado
      { foodId: "usda-167746", grams: 50 }, // lemon (the classic uses lime)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-172231", grams: 2 }, // turmeric, for the golden potato
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the potatoes until tender, mash them smooth with the lemon juice, turmeric and half the salt and cool the mash.",
      "Boil the eggs for 9 minutes, cool and slice them.",
      "Flake the tuna and mix it with the finely chopped onion and the rest of the salt.",
      "Press half the potato into a dish, layer the tuna over it, then the avocado and egg slices.",
      "Cover with the rest of the potato, smooth the top and chill in the fridge for 30 minutes.",
      "Slice and serve cold.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwc-ewa-agoyin-style",
    name: { en: "Ewa Agoyin-Style (Mashed Cowpeas with Pepper Sauce)", hindi: "एवा अगोयिन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173758", grams: 380 }, // cowpeas (black-eyed peas), dry
      { foodId: "usda-170108", grams: 150 }, // sweet pepper, red, for the sauce
      { foodId: "usda-170106", grams: 12 }, // hot chilli, red
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-171410", grams: 21 }, // peanut oil, for the sauce
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Boil the cowpeas in plenty of water for about 40 minutes, until very soft.",
      "Mash the cowpeas roughly with a little of their liquor into a thick, coarse purée and season with half the salt.",
      "Blitz the peppers, chilli and onion into the sauce base.",
      "Fry the sauce base in the peanut oil for about 12 minutes, stirring, until it darkens, dries out and turns smoky-sweet.",
      "Season the sauce with the rest of the salt.",
      "Serve the mashed cowpeas with the dark pepper sauce spooned generously over.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwc-paneer-chickpea-salad",
    name: { en: "Paneer and Chickpea Salad with Lemon and Mint", hindi: "पनीर चना सलाद" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 190 }, // paneer, from the CoFID record
      { foodId: "usda-2644282", grams: 190 }, // chickpeas, dry
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173475", grams: 10 }, // spearmint
      { foodId: "usda-170923", grams: 3 }, // cumin seed, dry-roasted for the dressing
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 45 minutes, until tender, drain and cool them completely.",
      "Dry-roast the cumin seed in a dry pan for 1 minute and crush it.",
      "Cut the paneer into cubes and the cucumber, tomatoes and onion into a fine dice.",
      "Toss the chickpeas, paneer and vegetables together in a wide bowl.",
      "Dress with the lemon juice, crushed cumin, chopped spearmint and salt.",
      "Rest 10 minutes so the flavours marry and serve at room temperature.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-cabbage-paneer-stirfry",
    name: { en: "Cabbage and Paneer Stir-Fry with Peas", hindi: "पत्ता गोभी पनीर सब्ज़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 250 }, // paneer, from the CoFID record
      { foodId: "usda-2346407", grams: 300 }, // cabbage
      { foodId: "usda-170419", grams: 100 }, // peas, green
      { foodId: "usda-170929", grams: 3 }, // mustard seed, ground in the method
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170497", grams: 8 }, // hot chilli, green
      { foodId: "usda-172337", grams: 14 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the paneer into cubes and shred the cabbage finely.",
      "Heat the mustard oil, add the ground mustard seed and green chilli and fry for 30 seconds.",
      "Add the paneer cubes and fry for 3 minutes, until they take golden edges, then lift them out.",
      "Add the cabbage, peas and turmeric to the same pan and stir-fry for about 6 minutes, until the cabbage wilts but stays bright.",
      "Return the paneer, season with the salt and toss for 1 minute.",
      "Serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-egg-potato-salad",
    name: { en: "Egg and Potato Salad with Yogurt and Mustard", hindi: "अंडा आलू सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 350 }, // eggs
      { foodId: "usda-2346401", grams: 500 }, // potatoes
      { foodId: "usda-170903", grams: 150 }, // Greek yogurt, lowfat, for the dressing
      { foodId: "usda-170929", grams: 4 }, // mustard seed, ground for the dressing
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the potatoes in their skins until tender, cool them and cut them into chunks.",
      "Boil the eggs for 9 minutes, cool, peel and cut them into quarters.",
      "Stir the yogurt with the ground mustard seed, lemon juice and salt into the dressing.",
      "Fold the dressing through the warm potato chunks so they drink it up.",
      "Fold in the cucumber dice and the egg quarters gently, keeping the eggs in pieces.",
      "Chill in the fridge for 20 minutes and serve cold.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwc-shrimp-avocado-salad",
    name: { en: "Shrimp and Avocado Salad with Corn and Lemon", hindi: "झींगा एवोकाडो सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp
      { foodId: "usda-171705", grams: 200 }, // avocado
      { foodId: "usda-2710826", grams: 150 }, // corn, sweet
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the shrimp in simmering salted water for about 3 minutes, until they turn pink, then drain and cool them.",
      "Boil the corn kernels for 3 minutes, drain and cool them.",
      "Cut the avocado and cucumber into chunks.",
      "Toss the shrimp, corn, avocado and cucumber together in a wide bowl.",
      "Dress with the lemon juice, olive oil and salt.",
      "Rest 5 minutes and serve at room temperature.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-buckwheat-tofu-salad",
    name: { en: "Buckwheat and Tofu Salad with Edamame and Sesame", hindi: "कुट्टू टोफ़ू सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512378", grams: 250 }, // buckwheat
      { foodId: "usda-174290", grams: 250 }, // tofu, extra firm
      { foodId: "usda-168411", grams: 100 }, // edamame, prepared
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-173469", grams: 15 }, // cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the buckwheat in salted water for about 12 minutes, until tender, drain and cool it completely.",
      "Cut the tofu into cubes and fry them in a dry, hot pan for 5 minutes, until golden on the edges.",
      "Cut the carrots into fine matchsticks.",
      "Toss the buckwheat, tofu, edamame and carrots together in a wide bowl.",
      "Dress with the sesame oil, vinegar and salt and scatter the sesame seeds over.",
      "Rest 10 minutes and serve at room temperature.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-savoury-oat-bowl",
    name: { en: "Savoury Oat Bowl with Egg, Spinach and Cheddar", hindi: "नमकीन ओट्स कटोरा" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 200 }, // oats, rolled
      { foodId: "usda-171287", grams: 250 }, // eggs, fried on top
      { foodId: "usda-328637", grams: 60 }, // cheddar
      { foodId: "usda-168462", grams: 100 }, // spinach
      { foodId: "usda-322559", grams: 200 }, // skim milk
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171025", grams: 7 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion in the sunflower oil for 3 minutes.",
      "Add the oats, milk and an equal measure of water and cook, stirring, for about 5 minutes, until thick and creamy.",
      "Stir the spinach through the hot oats and let it wilt for 1 minute, then season with the salt and black pepper.",
      "Fold the grated cheddar through the oats until it melts.",
      "Fry the eggs in a clean pan until the whites set and the yolks stay soft.",
      "Serve the oats in bowls with a fried egg on each.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-black-bean-plantain-stew",
    name: { en: "Black Bean and Plantain Stew", hindi: "काला बीन केला स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173734", grams: 300 }, // black beans, dry
      { foodId: "usda-2710818", grams: 300 }, // plantains, underripe
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170427", grams: 100 }, // sweet pepper, green
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin seed
      { foodId: "usda-171410", grams: 14 }, // peanut oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then boil them in fresh water for about 45 minutes, until tender, and keep the liquor.",
      "Fry the onion, pepper and garlic in the peanut oil for 4 minutes.",
      "Add the tomatoes and cumin and fry 5 minutes into a sauce.",
      "Add the beans with some of their liquor and simmer 10 minutes.",
      "Add the plantain chunks, season with the salt and simmer about 12 minutes, until the plantain is tender and sweet against the beans.",
      "Rest 5 minutes and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-cauliflower-chickpea-curry",
    name: { en: "Cauliflower and Chickpea Curry", hindi: "गोभी चना करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 300 }, // chickpeas, dry
      { foodId: "usda-2685573", grams: 400 }, // cauliflower
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-330458", grams: 14 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 45 minutes, until tender, and drain.",
      "Fry the onion, garlic and ginger in the coconut oil for 4 minutes.",
      "Add the curry powder and fry for 1 minute, until fragrant.",
      "Add the tomatoes and simmer 6 minutes into a sauce.",
      "Add the cauliflower florets and a splash of water, cover and cook about 10 minutes, until tender.",
      "Stir in the chickpeas, season with the salt, simmer 3 minutes and serve.",
    ],
    timeMinutes: 65,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-farinata",
    name: { en: "Farinata (Chickpea Flour Flatbread with Black Pepper)", hindi: "फ़ारिनाटा" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174288", grams: 300 }, // chickpea flour (besan)
      { foodId: "usda-171413", grams: 21 }, // olive oil
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the besan with water and the salt into a thin batter and rest it for at least 1 hour, skimming the foam.",
      "Heat the oven to 220°C with an oiled, shallow pan inside until it is very hot.",
      "Whisk half the olive oil through the batter.",
      "Pour the batter into the hot pan in a thin layer.",
      "Bake for about 15 minutes, until the farinata sets, blisters and turns golden at the edges.",
      "Rest 3 minutes, grind the black pepper over and serve in wedges.",
    ],
    timeMinutes: 80,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven", "mixer_grinder"],
  },
  {
    id: "dish-pwc-greek-chickpea-egg-salad",
    name: { en: "Greek-Style Chickpea and Egg Salad", hindi: "ग्रीक चना अंडा सलाद" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 200 }, // chickpeas, dry
      { foodId: "usda-171287", grams: 200 }, // eggs, boiled and quartered over the top
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170427", grams: 100 }, // sweet pepper, green
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 45 minutes, until tender, drain and cool them completely.",
      "Boil the eggs for 9 minutes, cool, peel and quarter them.",
      "Cut the cucumber, tomatoes and pepper into chunks and slice the onion thinly.",
      "Toss the chickpeas and vegetables together in a wide bowl.",
      "Dress with the lemon juice, olive oil and salt and toss again.",
      "Lay the egg quarters over the top and serve at room temperature.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-peanut-seed-granola",
    name: { en: "Peanut, Pumpkin Seed and Oat Granola", hindi: "मूंगफली ग्रेनोला" },
    category: "snack",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 300 }, // oats, rolled
      { foodId: "usda-172430", grams: 150 }, // peanuts
      { foodId: "usda-2515380", grams: 100 }, // pumpkin seeds
      { foodId: "usda-170148", grams: 50 }, // hemp seeds
      { foodId: "usda-334247", grams: 30 }, // sugar
      { foodId: "usda-330458", grams: 21 }, // coconut oil
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Heat the oven to 160°C.",
      "Melt the coconut oil with the sugar and cinnamon and stir it through the oats, peanuts and pumpkin seeds with the salt.",
      "Spread the mixture in a thin, even layer on a lined tray.",
      "Bake for about 25 minutes, stirring once halfway, until golden and dry.",
      "Cool completely on the tray so the clusters set, then stir the hemp seeds through.",
      "Serve in small handfuls or over yogurt.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pwc-shrikhand",
    name: { en: "Shrikhand (Cardamom Greek Yogurt Dessert with Almonds)", hindi: "श्रीखंड" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-330137", grams: 600 }, // Greek yogurt, nonfat
      { foodId: "usda-169640", grams: 40 }, // honey
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-2346393", grams: 40 }, // almonds, slivered over the top
      { foodId: "usda-172231", grams: 1 }, // turmeric, a pinch for the classic golden colour
    ],
    method: [
      "Stir the yogurt with the honey, ground cardamom and turmeric until smooth and pale gold.",
      "Taste and add a little more honey if your yogurt is very sharp.",
      "Cover and chill in the fridge for at least 1 hour so it thickens and the cardamom blooms.",
      "Toast the almond slivers in a dry pan for 2 minutes, until golden.",
      "Spoon the shrikhand into small bowls.",
      "Scatter the almonds over and serve cold.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwc-kheer",
    name: { en: "Kheer (Cardamom Rice Pudding with Almonds)", hindi: "खीर" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-322559", grams: 900 }, // skim milk
      { foodId: "usda-172195", grams: 60 }, // dry nonfat milk, stirred in for the slow-cooked richness
      { foodId: "usda-2512381", grams: 90 }, // rice, white
      { foodId: "usda-334247", grams: 40 }, // sugar
      { foodId: "usda-2346393", grams: 30 }, // almonds
      { foodId: "usda-170919", grams: 2 }, // cardamom
    ],
    method: [
      "Rinse the rice and simmer it in the skim milk over the lowest heat for about 35 minutes, stirring often, until the grains collapse and the milk thickens.",
      "Stir in the dry milk and sugar and simmer 5 minutes more.",
      "Crush the cardamom and stir it through.",
      "Toast the almond slivers in a dry pan for 2 minutes, until golden.",
      "Pour the kheer into bowls and rest 10 minutes.",
      "Scatter the almonds over and serve warm or cold.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwc-kefir-chia-smoothie",
    name: { en: "Kefir and Chia Berry Smoothie", hindi: "केफ़िर चिया स्मूदी" },
    category: "drink",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "cnf-6999", grams: 800 }, // kefir, plain, low fat
      { foodId: "afcd-F008209", grams: 100 }, // chia seeds
      { foodId: "usda-172195", grams: 60 }, // dry nonfat milk, whisked in for body
      { foodId: "usda-327699", grams: 200 }, // strawberries
      { foodId: "usda-173944", grams: 100 }, // banana
    ],
    method: [
      "Whisk the dry milk into the kefir until smooth, then stir in the chia seeds and leave for 15 minutes, until they swell and thicken it.",
      "Hull the strawberries and peel the banana.",
      "Blitz the kefir and chia with the strawberries and banana until completely smooth.",
      "Rest 2 minutes so the smoothie settles and thickens a little more.",
      "Pour into four glasses.",
      "Serve cold, straight away.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  {
    id: "dish-pwc-quinoa-tabouleh-style",
    name: { en: "Quinoa Tabbouleh-Style with Chickpeas, Tomato and Mint", hindi: "किनोआ तबूले" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 200 }, // quinoa
      { foodId: "usda-2644282", grams: 150 }, // chickpeas, dry
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-173475", grams: 15 }, // spearmint
      { foodId: "usda-169997", grams: 20 }, // coriander leaves (the classic uses parsley, not in the set)
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 45 minutes, until tender, drain and cool them.",
      "Boil the quinoa in salted water for about 12 minutes, until the grains sprout their tails, drain and cool it completely.",
      "Dice the tomatoes and cucumber finely and chop the spearmint and coriander leaves.",
      "Toss the quinoa, chickpeas and vegetables together in a wide bowl.",
      "Dress with the lemon juice, olive oil and salt.",
      "Rest 15 minutes so the grains drink the dressing and serve at room temperature.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
];
