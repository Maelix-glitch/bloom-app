/**
 * The dish library, India wave (dishes expansion — India coverage) —
 * 142 dishes carrying Indian coverage past 500: the regions the
 * original 229 pan-Indian dishes and the 131-dish Kerala wave did not
 * reach. North (Punjabi, Kashmiri, Awadhi/UP, Himachali, Delhi), West
 * (Gujarati, Maharashtrian, Goan, Rajasthani, Sindhi, Parsi), East
 * (Bengali, Odia, Assamese, Bihari, North-East), Central (Madhya
 * Pradesh, Chhattisgarh) and the South beyond Kerala (Tamil,
 * Andhra/Telangana incl. Hyderabadi, Karnataka).
 *
 * Built exactly like the earlier waves: every line names one of the
 * 142 USDA-verified reference foods and a gram amount for the WHOLE
 * recipe; no nutrient value appears anywhere in this file — a dish's
 * numbers exist only as `dishNutrients` computes them, its patterns
 * only as `dishPatterns` derives them, and its budget tier only as
 * the stated heuristic computes it. Methods are written to the
 * programme's detailed standard: quantities, times, heat and
 * doneness cues, for a home cook.
 *
 * Authoring notes — what the reference set does and does not hold,
 * and how this wave stays honest about it:
 * - There is NO chana dal in the set. Dishes whose classic pulse is
 *   chana dal (shami kebab, dal pakwan, sai bhaji, puran poli, idli
 *   podi) say so in their methods and build on the set's whole
 *   chickpeas, toor dal or besan instead — never silently.
 * - There is NO jaggery in the set, so sukhdi, puran poli, thekua,
 *   athirasam, ariselu and til pitha are sweetened with the set's
 *   granulated sugar — a substitution of the sweetener only, stated
 *   in each method, never hidden.
 * - There is NO garam masala, no curry leaves, no asafoetida, no
 *   saffron and no shallots in the set. Spice blends (xacuti, malvani,
 *   chettinad, bisi bele bath, dhansak) are built from the set's
 *   whole spices and named for what they are; methods never claim
 *   the absent leaves or saffron.
 * - There is NO paneer in the set; the set's cottage cheese stands
 *   in, and dishes may be named "Paneer …" with the ingredient line
 *   honestly showing cottage cheese (the library's standing rule).
 * - There is NO hilsa, no lotus stem, no banana leaf, no bamboo
 *   shoot, no raw mango, no kokum, no gongura and no sago in the
 *   set — so no shorshe ilish (mackerel stands in, stated), no nadru
 *   yakhni, no patra ni machhi in leaf (steamed without it, stated),
 *   no sol kadhi, no avakaya and no sabudana dishes. Dropped or
 *   honestly adapted, never faked.
 * - Beef and pork — present as reference foods — are not used, per
 *   the programme's standing omission. Goan vindaloo and jadoh are
 *   therefore their real chicken variants, and the lamb dishes whose
 *   classic cut is chunks (rogan josh, kosha mangsho, laal maas,
 *   champaran, sali boti, bhopali korma) are built on the set's
 *   ground lamb and named "-Style" where the cut changes the dish.
 * - Water is never a line — it carries no nutrients and is not a
 *   reference food; the methods say where it goes.
 */

import type { Dish } from "../dishes";

export const INDIA_DISHES: Dish[] = [
  /* ============================ PUNJABI ============================ */
  {
    id: "dish-amritsari-kulcha",
    name: { en: "Amritsari Kulcha", hindi: "अमृतसरी कुलचा" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 300 }, // white flour
      { foodId: "usda-2346401", grams: 250 }, // potato
      { foodId: "usda-2259793", grams: 60 }, // yogurt, for the dough
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-170923", grams: 3 }, // cumin seed
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-171314", grams: 20 }, // ghee, to brush
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the flour with the yogurt, half the salt and about 150 ml warm water into a soft dough; cover and rest 1 hour until puffy and supple.",
      "Boil the potatoes until a knife slides in easily, drain well and mash rough — dry mash makes a kulcha that does not weep.",
      "Fold the onion, green chilli, ginger, coriander leaves, cumin, cayenne and the remaining salt through the mash; cool the filling completely.",
      "Divide the dough into 8 balls. Flatten each, cup it, fill with a heaped spoon of potato, pleat the edges together and pinch shut.",
      "Roll each stuffed ball gently to a 12 cm round, keeping the filling sealed inside; a torn kulcha leaks and burns.",
      "Cook on a screaming-hot tawa or cast-iron pan 1–2 minutes a side until blistered with brown spots and puffed at the edges.",
      "Brush generously with ghee the moment each kulcha leaves the pan and serve at once, with dal or chole.",
    ],
    timeMinutes: 90,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-langarwali-dal",
    name: { en: "Langarwali Dal (Whole Urad)", hindi: "लंगरवाली दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174259", grams: 250 }, // mungo beans (whole urad)
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-173410", grams: 25 }, // butter
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the whole urad overnight, drain, and pressure-cook with the turmeric and 900 ml water for 6–7 whistles, until the skins split and the dal is creamy.",
      "Mash a ladleful of dal against the side of the pot and stir it back in — the langar body comes from the dal itself, not flour.",
      "Cook the tomato with the ginger and garlic in the oil for 6–8 minutes until the tomato breaks down and the oil glistens at the edges.",
      "Add the tomato masala to the dal with the salt and simmer gently 15 minutes, topping up with hot water to a pouring consistency.",
      "Stir in the milk and simmer 3 minutes more; the dal should be glossy and just thick enough to coat rice.",
      "Temper the cumin and red chillies in half the butter until the cumin crackles and pour over the dal.",
      "Finish with the remaining butter melting on top and serve with rice or roti, as it is served in the langar hall.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-chicken-patiala",
    name: { en: "Chicken Patiala", hindi: "चिकन पटियाला" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-171287", grams: 100 }, // egg, for the omelette wrap
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-2259793", grams: 100 }, // yogurt
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-171314", grams: 10 }, // ghee
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Marinate the chicken thigh pieces with the yogurt, half the chili powder, turmeric and salt for 30 minutes.",
      "Brown the sliced onion in the oil over medium heat for 10 minutes until deep golden; add the ginger, garlic and green chilli and cook 2 minutes.",
      "Add the tomato, coriander seed, cumin and remaining chili powder; cook 8 minutes until the masala is thick and the oil separates.",
      "Add the chicken with its marinade and sear 5 minutes, then cover and simmer 15 minutes until the chicken is tender and the gravy clings.",
      "Beat the eggs with a pinch of salt and cook a thin, lacy omelette in the ghee in a wide pan, 1–2 minutes, without browning it hard.",
      "Spoon the chicken down the centre of the omelette and fold it over like a parcel — the Patiala signature is the egg wrapping the curry.",
      "Rest 2 minutes, scatter coriander leaves, and serve with naan to tear through the omelette into the gravy.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ============================ KASHMIRI ============================ */
  {
    id: "dish-rogan-josh-style",
    name: { en: "Rogan Josh-Style (Minced Lamb)", hindi: "रोगन जोश" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // lamb, ground
      { foodId: "usda-2259793", grams: 150 }, // yogurt
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171323", grams: 4 }, // fennel seed
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170932", grams: 4 }, // cayenne
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-172337", grams: 35 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "The classic rogan josh braises chunks of lamb; Bloom's verified set carries lamb ground, so this is the minced-lamb reading of the dish — the spicing, colour and method are Kashmiri, the cut is stated, not hidden.",
      "Heat the mustard oil until it just smokes, cool it a breath, then fry the onion 10 minutes to a deep, even brown.",
      "Add the ginger and garlic, cook 1 minute, then the lamb; sear hard for 6–8 minutes, breaking it up, until it browns and its fat renders.",
      "Grind the fennel, cardamom, cinnamon and cloves; add with the cayenne, turmeric, bay and salt, and fry 2 minutes until the spices darken the oil red.",
      "Lower the heat and whisk in the yogurt a spoon at a time, letting each spoonful absorb before the next, so the gravy stays smooth.",
      "Add 250 ml hot water, cover and simmer 25 minutes, until the lamb is tender and the oil — the rogan — rises in red pools on top.",
      "Rest 10 minutes off the heat; serve over rice with the red oil spooned over each portion.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chicken-yakhni",
    name: { en: "Chicken Yakhni (Kashmiri Yogurt Chicken)", hindi: "चिकन यखनी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2259793", grams: 300 }, // yogurt
      { foodId: "usda-171323", grams: 5 }, // fennel seed
      { foodId: "usda-170919", grams: 3 }, // cardamom
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the yogurt until completely smooth and bring it to room temperature — cold, lumpy yogurt is what splits a yakhni.",
      "Melt the ghee and bloom the cinnamon, cardamom, cloves and bay for 30 seconds until fragrant; add the chicken and sear 5 minutes to seal, not brown hard.",
      "Grind the fennel to a powder and stir it in with the ginger, black pepper and salt; cook 1 minute.",
      "Lower the heat to its gentlest and stir in the yogurt a ladle at a time, stirring constantly, letting the gravy come back to a bare simmer between additions.",
      "Simmer uncovered 15–18 minutes, stirring often, until the chicken is tender and the pale gravy coats it in a thin, glossy layer.",
      "The yakhni should stay ivory — no turmeric, no tomato, no browning of the gravy; adjust the salt at the end.",
      "Serve over plain rice, spooning the fennel-scented gravy generously over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kashmiri-pulao",
    name: { en: "Kashmiri Pulao", hindi: "कश्मीरी पुलाव" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-171688", grams: 100 }, // apple
      { foodId: "usda-174683", grams: 80 }, // grapes
      { foodId: "usda-2515374", grams: 30 }, // cashews
      { foodId: "usda-2346393", grams: 20 }, // almonds
      { foodId: "usda-790646", grams: 60 }, // onion, fried crisp
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rinse the rice and soak 20 minutes. Kashmiri pulao is classically saffron-tinted; saffron is not in Bloom's verified set, so this pulao is cooked in milk and left its natural ivory — stated, not faked.",
      "Fry the sliced onion in half the ghee for 8 minutes until crisp and amber; lift out. Fry the cashews and almonds in the same ghee until golden and lift out.",
      "Add the remaining ghee, bloom the cinnamon, cardamom and bay, then add the drained rice and toss 1 minute until the grains glisten.",
      "Pour in the milk and 250 ml hot water with the sugar and salt; bring to a boil, cover, and cook on the lowest heat 12 minutes.",
      "Rest covered 10 minutes, then fluff with a fork, lifting from the edges so the grains stay whole.",
      "Fold through the apple pieces and grapes at the very end — they should warm, not cook, and stay distinct against the rice.",
      "Crown with the fried onion and nuts and serve as the sweet, festive counterpoint to a hot curry.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kashmiri-dum-aloo",
    name: { en: "Kashmiri Dum Aloo", hindi: "कश्मीरी दम आलू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 600 }, // potato
      { foodId: "usda-2259793", grams: 250 }, // yogurt
      { foodId: "usda-171323", grams: 4 }, // fennel seed
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170932", grams: 4 }, // cayenne
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the potatoes in their skins until just tender, cool, peel and prick each all over with a fork — the holes are how the gravy gets in.",
      "Fry the potatoes in the mustard oil over medium heat for 8–10 minutes, turning, until evenly golden and crisp-skinned; drain.",
      "Whisk the yogurt smooth; grind the fennel, cardamom, cinnamon and cloves to a powder.",
      "In the same oil, lower the heat and stir in the yogurt gradually with the ginger, cayenne, turmeric and salt, stirring until it comes to a gentle simmer without splitting.",
      "Add the ground spices and 200 ml hot water; slide the potatoes back in.",
      "Cover and cook on the lowest heat — the dum — for 15 minutes, until the potatoes have drunk the gravy deep and the oil rims the pan.",
      "Rest 5 minutes and serve with rice; each potato should be gravy-soaked to its centre when cut.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-gushtaba",
    name: { en: "Gushtaba (Lamb Meatballs in Yakhni Gravy)", hindi: "गुश्ताबा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 550 }, // lamb, ground
      { foodId: "usda-2259793", grams: 300 }, // yogurt
      { foodId: "usda-171323", grams: 4 }, // fennel seed
      { foodId: "usda-170919", grams: 3 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-173475", grams: 6 }, // mint
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pound or process the ground lamb with the garlic, half the salt and half the ground cardamom until it turns pale and sticky — gushtaba are beaten, not just mixed.",
      "With wet hands, roll the lamb into smooth balls the size of a lime; chill 20 minutes so they hold in the gravy.",
      "Whisk the yogurt smooth. Melt the ghee, bloom the cinnamon, then stir in the yogurt gradually with the fennel, ginger, black pepper and remaining cardamom and salt.",
      "Bring the yakhni gravy to the gentlest simmer — never a boil, or the yogurt splits and the balls toughen.",
      "Lower the meatballs in one by one and poach 18–20 minutes, turning once, until firm, pale and cooked through.",
      "Rest 5 minutes in the gravy; the balls should be springy and white-gold, the gravy ivory and fennel-sweet.",
      "Scatter mint and serve over rice — gushtaba is the ceremonial last dish of a wazwan, served with ceremony.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* ========================== AWADHI / UP ========================== */
  {
    id: "dish-galouti-kebab",
    name: { en: "Galouti Kebab", hindi: "गलौटी कबाब" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 500 }, // lamb, ground
      { foodId: "usda-171330", grams: 15 }, // poppy seed
      { foodId: "usda-790646", grams: 100 }, // onion, fried crisp
      { foodId: "usda-174288", grams: 20 }, // besan, binder
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171314", grams: 30 }, // ghee, for shallow frying
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Galouti were made for a nawab who could not chew: the mince is pounded to a paste. Process the lamb with the ginger, garlic and salt until it is a smooth, sticky pâté. The classic raw-papaya tenderiser is not in Bloom's set; the long pounding and rest do the work, stated openly.",
      "Fry the sliced onion in a spoon of the ghee until crisp and deep brown; cool and grind to a paste.",
      "Soak the poppy seeds 30 minutes and grind to a paste; grind the cardamom, cinnamon and cloves.",
      "Work the onion paste, poppy paste, ground spices, cayenne, black pepper and besan through the lamb until completely uniform; rest at least 2 hours, or overnight.",
      "With wet hands, shape into 12 flat, thin patties — galouti are wide and delicate, never thick.",
      "Shallow-fry in the remaining ghee over medium-low heat, 2–3 minutes a side, handling them once and gently; they should colour, not crust hard.",
      "Serve at once on small rotis or as they are — a true galouti dissolves on the tongue before it needs chewing.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-vegetable-tehri",
    name: { en: "Vegetable Tehri", hindi: "वेजिटेबल तहरी" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2685573", grams: 120 }, // cauliflower
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and soak 20 minutes; drain. Tehri is UP's turmeric-yellow one-pot rice — a pulao's plainer, heartier cousin.",
      "Melt the ghee and bloom the bay, cloves, cardamom and cumin for 30 seconds; fry the onion 6 minutes to golden.",
      "Add the ginger, green chilli and turmeric; fry 1 minute until the raw turmeric smell turns earthy.",
      "Add the potato, cauliflower and carrot with the salt and toss 3 minutes so the vegetables take the yellow oil.",
      "Add the rice and 600 ml hot water; bring to a boil, cover, and cook on the lowest heat 12 minutes.",
      "Scatter the peas over the top without stirring, cover again and rest 10 minutes off the heat.",
      "Fluff gently, lifting the peas through, and serve with raita — tehri should be moist and separate, never a biryani's perfume.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-rasedaar-aloo",
    name: { en: "Rasedaar Aloo", hindi: "रसेदार आलू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the potatoes until just tender, cool, and break them by hand into rough chunks — rasedaar potatoes are crushed, never knife-cut, so their edges thicken the gravy.",
      "Heat the mustard oil until it just smokes; crackle the cumin, then add the ginger and green chilli for 30 seconds.",
      "Add the tomato, turmeric, ground coriander seed, cayenne and salt; cook 6–8 minutes until the tomato is a thick, oily masala.",
      "Add the potatoes and toss 2 minutes to coat every rough edge.",
      "Pour in 500 ml hot water — rasedaar means 'with gravy', and this one stays proudly thin — and simmer 8 minutes.",
      "Crush a few potato pieces into the gravy with the back of the spoon to body it slightly; adjust the salt.",
      "Scatter coriander leaves and serve runny, with bedmi pooris to chase the gravy around the plate.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-sheermal-style",
    name: { en: "Sheermal-Style Milk Bread", hindi: "शीरमाल" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 300 }, // white flour
      { foodId: "usda-322892", grams: 180 }, // whole milk
      { foodId: "usda-172184", grams: 34 }, // egg yolk
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-334247", grams: 25 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Sheermal is Lucknow's saffron-milk bread; saffron is not in Bloom's verified set, so this is the milk-and-cardamom reading of it, named -Style and stated openly.",
      "Warm the milk to hand-hot and stir in the sugar and half the ghee until melted.",
      "Knead the flour with the milk mixture, egg yolks, cardamom and salt for 8 minutes into a soft, supple dough; rest 1 hour.",
      "Divide into 8 balls and roll each to a 12 cm disc, slightly thicker than a roti.",
      "Prick each disc all over with a fork so it bakes flat rather than puffing.",
      "Bake on a hot tawa or in a 220°C oven 3–4 minutes a side until set with pale golden freckles — sheermal stays soft and blond, never crisp.",
      "Brush with the remaining melted ghee the moment they come off the heat and stack under a cloth; serve warm with kebabs or korma.",
    ],
    timeMinutes: 90,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-shami-kebab",
    name: { en: "Shami Kebab", hindi: "शामी कबाब" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 400 }, // lamb, ground
      { foodId: "usda-2644282", grams: 120 }, // chickpeas
      { foodId: "usda-171287", grams: 50 }, // egg, binder
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-171314", grams: 25 }, // ghee, for frying
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173475", grams: 6 }, // mint
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "The classic shami pulse is chana dal, which is not in Bloom's verified set; whole chickpeas from the set are cooked soft and ground fine in its place, stated here rather than hidden.",
      "Pressure-cook the chickpeas until completely soft; drain, reserving the liquor.",
      "Cook the lamb with the onion, ginger, garlic, green chilli, whole spices and salt in just enough chickpea liquor to cover, 20 minutes, until the meat is tender and the pan nearly dry.",
      "Grind the meat and chickpeas together to a smooth, dry, mouldable paste; cool completely.",
      "Work in the beaten egg, coriander and mint; rest 30 minutes. The mixture should hold a shape without sticking to the palm.",
      "Shape into 12 flat patties and shallow-fry in ghee over medium heat, 3 minutes a side, until a deep, even crust forms.",
      "Serve hot with mint chutney and sliced onion — crisp outside, melting inside, is the whole point of a shami.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-matar-nimona",
    name: { en: "Matar Nimona", hindi: "मटर निमोना" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170419", grams: 400 }, // green peas
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Grind three-quarters of the peas to a coarse paste with a splash of water; keep the rest whole — nimona is a pea curry built on peas ground and peas whole.",
      "Fry the potato cubes in the mustard oil until golden at the edges; lift out.",
      "In the same oil crackle the cumin, then fry the onion 6 minutes to golden; add the ginger and garlic for 1 minute.",
      "Add the tomato, ground coriander, turmeric, cayenne and salt; cook 5 minutes to a thick masala.",
      "Stir in the ground peas and cook 4 minutes, stirring, until the paste darkens slightly and smells roasted.",
      "Add 400 ml hot water, the whole peas and the potatoes; simmer 8 minutes until the nimona is a thick, spoonable green gravy.",
      "Scatter coriander leaves and serve with rice — a winter UP dish that tastes of the pea harvest itself.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* =========================== HIMACHALI =========================== */
  {
    id: "dish-siddu",
    name: { en: "Siddu (Himachali Steamed Bread)", hindi: "सिड्डू" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 300 }, // whole wheat flour
      { foodId: "usda-2346394", grams: 60 }, // walnuts
      { foodId: "usda-171330", grams: 20 }, // poppy seed
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171314", grams: 15 }, // ghee, to serve
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with the salt and about 170 ml warm water into a soft dough; rest 1 hour until risen and pillowy.",
      "Grind the walnuts and poppy seeds coarse; stir in the finely chopped onion, green chilli, coriander and cumin with a pinch of salt — the siddu filling is savoury and nutty.",
      "Divide the dough into 8; roll each to a small disc, place a spoon of filling in the centre, and fold and pinch into a half-moon, sealing every edge.",
      "Flatten each half-moon gently with your palm so the filling spreads inside without tearing the skin.",
      "Steam over boiling water in a greased steamer for 15–18 minutes, until the siddus are puffed, matte and springy to a fingertip.",
      "Rest 2 minutes in the steamer with the lid ajar so they do not collapse.",
      "Serve hot, torn open and flooded with melted ghee — siddu is Himachal's winter bread, eaten against the cold.",
    ],
    timeMinutes: 90,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chana-madra",
    name: { en: "Chana Madra", hindi: "चना मदड़ा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 250 }, // chickpeas
      { foodId: "usda-2259793", grams: 300 }, // yogurt
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight and pressure-cook until completely soft, 5–6 whistles; drain, keeping a cup of the liquor.",
      "Whisk the yogurt smooth with the turmeric and ground coriander so it will not split in the pan.",
      "Melt the ghee and bloom the cinnamon, cardamom and cloves for 30 seconds.",
      "Lower the heat and stir in the yogurt gradually, stirring constantly until it reaches a gentle simmer and turns glossy.",
      "Add the chickpeas, ginger, cayenne and salt with a splash of their liquor; simmer 12–15 minutes until the gravy is thick and coats each chickpea.",
      "Madra has no onion and no tomato — its richness is yogurt, ghee and whole spice alone; adjust the salt and rest 5 minutes.",
      "Serve with rice as it is served at a Himachali dhaam feast.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-tudkiya-bhath",
    name: { en: "Tudkiya Bhath", hindi: "तुड़किया भात" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 280 }, // white rice
      { foodId: "usda-2644283", grams: 60 }, // lentils, dry
      { foodId: "usda-2346401", grams: 120 }, // potato
      { foodId: "usda-2259793", grams: 100 }, // yogurt
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and lentils together and soak 20 minutes; drain. Tudkiya bhath is Kangra's spiced rice-and-lentil pot, finished with yogurt.",
      "Melt the ghee and bloom the cinnamon, cardamom and bay; fry the onion 6 minutes to golden.",
      "Add the ginger, garlic and cayenne; fry 1 minute, then add the potato and toss 3 minutes.",
      "Add the rice and lentils with 550 ml hot water and the salt; boil, cover, and cook on the lowest heat 12 minutes.",
      "Whisk the yogurt smooth and fold it gently through the hot rice off the heat — it should marble the grains, not drown them.",
      "Cover and rest 10 minutes so the yogurt sets into the rice.",
      "Serve hot with a spoon of ghee on top; the grains should be separate, the lentils soft, the whole pot gently sour.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-aktori",
    name: { en: "Aktori (Buckwheat Pancakes)", hindi: "अक्टोरी" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512378", grams: 200 }, // buckwheat
      { foodId: "usda-168936", grams: 50 }, // white flour
      { foodId: "usda-322892", grams: 150 }, // whole milk
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-334247", grams: 30 }, // sugar
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Aktori are Spiti's buckwheat pancakes. Bloom's set carries buckwheat as a whole grain, so grind it dry to a flour first — the method states it, the line stays the verified grain.",
      "Whisk the buckwheat flour and white flour with the milk, beaten egg, sugar, cardamom and salt into a pourable batter; rest 20 minutes.",
      "The batter should ribbon off the whisk; thin with a spoon of milk if it sits in a mound.",
      "Heat a heavy pan and grease it lightly with ghee; pour a ladle of batter and spread it thin like a crepe.",
      "Cook 2 minutes until the top sets and the edges brown and crisp, then flip and cook 1 minute more.",
      "Repeat with the remaining batter, greasing the pan between pancakes and keeping the finished ones warm under a cloth.",
      "Serve hot with butter or honey — in Spiti they are breakfast against a mountain morning.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ============================= DELHI ============================= */
  {
    id: "dish-kulle-chaat",
    name: { en: "Kulle Chaat (Stuffed Fruit Cups)", hindi: "कुल्ले चाट" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171688", grams: 300 }, // apple
      { foodId: "usda-746773", grams: 200 }, // pear
      { foodId: "usda-2644282", grams: 100 }, // chickpeas
      { foodId: "usda-167746", grams: 25 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight and boil until tender; drain and cool. Kulle are Old Delhi's fruit cups — fruit hollowed and filled with spiced chickpeas.",
      "Halve the apples and pears and scoop out a deep cup from each half with a spoon, leaving a firm wall; brush the cut flesh with lemon so it does not brown.",
      "Chop the scooped fruit flesh fine and fold it through the chickpeas.",
      "Season the filling with the lemon juice, roasted and ground cumin, cayenne, salt and coriander leaves; it should be sharp, salty and hot against the sweet fruit.",
      "Pack the filling firmly into the fruit cups, mounding it slightly.",
      "Chill 20 minutes so the cups are cold and crisp.",
      "Serve two halves per person, eaten with a spoon straight from the fruit — no plate dressing, this is street food at its most elegant.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* =========================== GUJARATI =========================== */
  {
    id: "dish-khandvi",
    name: { en: "Khandvi", hindi: "खांडवी" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 120 }, // besan
      { foodId: "usda-2259793", grams: 250 }, // yogurt
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170150", grams: 5 }, // sesame seeds
      { foodId: "usda-170169", grams: 20 }, // coconut meat
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Whisk the besan with the yogurt, 250 ml water, turmeric, ginger-green chilli paste and salt until completely smooth — khandvi forgives no lump.",
      "Cook the batter in a heavy pan over medium heat, stirring constantly with a flat spoon, 8–10 minutes, until it turns glossy, leaves the sides and holds a ribbon.",
      "Working fast while it is hot, spread the batter in the thinnest possible sheets over the backs of greased plates or a steel counter.",
      "Let the sheets set 5 minutes, then cut into 4 cm strips and roll each strip into a tight spiral.",
      "Arrange the rolls in a dish; they should be silky, pale gold and just set — never rubbery.",
      "Temper the mustard and sesame seeds in the oil until the mustard crackles and pour over the rolls.",
      "Scatter grated coconut and coriander leaves and serve at room temperature with green chutney.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-vegetable-handvo",
    name: { en: "Vegetable Handvo", hindi: "वेजिटेबल हांडवो" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 150 }, // rice flour
      { foodId: "usda-174288", grams: 60 }, // besan
      { foodId: "usda-2259793", grams: 150 }, // yogurt
      { foodId: "usda-2346407", grams: 120 }, // cabbage
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-170419", grams: 60 }, // green peas
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Handvo is Gujarat's savoury vegetable cake, classically grated with bottle gourd; bottle gourd is not in Bloom's verified set, so cabbage and carrot carry it here — stated, and the crumb is none the worse.",
      "Stir the rice flour and besan with the yogurt and about 100 ml water into a thick batter; rest 30 minutes.",
      "Fold in the shredded cabbage, grated carrot, peas, ginger, green chilli, turmeric and salt; the batter should be a dropping consistency, heavy with vegetables.",
      "Heat the oil in a heavy, lidded pan; crackle the mustard and sesame seeds.",
      "Pour in the batter, level it, cover, and cook on the lowest heat 18–20 minutes, until the base is deep golden and crisp and the top has set.",
      "Slide onto a plate, invert back into the pan, and cook 8 minutes more to crust the second side.",
      "Rest 5 minutes and cut into wedges — crisp crust, soft vegetable crumb — and serve with chutney.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-palak-thepla",
    name: { en: "Palak Thepla", hindi: "पालक थेपला" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 250 }, // whole wheat flour
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-2259793", grams: 60 }, // yogurt
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170150", grams: 5 }, // sesame seeds
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "The thepla everyone knows is methi; fenugreek leaves are not in Bloom's verified set, so this is the palak thepla Gujarati homes make just as often — spinach kneaded right into the dough.",
      "Blanch the spinach 1 minute, squeeze completely dry and chop fine — wet spinach makes a dough that never rolls thin.",
      "Knead the flour with the spinach, yogurt, ginger, green chilli, turmeric, cumin, sesame, salt and a spoon of the oil, adding water a little at a time, into a firm, green dough; rest 30 minutes.",
      "Divide into 12 balls and roll each as thin as a handkerchief, dusting lightly with flour.",
      "Cook on a hot tawa, brushing each side with a little oil, pressing with a cloth until brown spots appear and the thepla is supple, not crisp.",
      "Stack under a cloth as they cook; a thepla should bend without cracking.",
      "Serve warm with pickle or yogurt — and know that thepla are travel food: they keep three days and improve the journey.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-undhiyu-style",
    name: { en: "Undhiyu-Style Mixed Vegetable", hindi: "उंधियू" },
    category: "main",
    servings: 6,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710818", grams: 200 }, // plantain (raw banana)
      { foodId: "usda-2346404", grams: 200 }, // sweet potato
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2685577", grams: 150 }, // eggplant
      { foodId: "usda-2346400", grams: 120 }, // green beans
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-174288", grams: 60 }, // besan, for the muthia
      { foodId: "usda-170169", grams: 50 }, // coconut meat
      { foodId: "usda-172430", grams: 30 }, // peanuts
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169997", grams: 15 }, // coriander leaves
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 3 }, // cumin seed
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Undhiyu is Surat's winter festival pot. The full Surti cast — papdi, kand, methi for the muthia — is not in Bloom's verified set, so this -Style version builds the same architecture from the set's vegetables and a plain besan muthia, stated openly.",
      "Make the muthia: knead the besan with half the ginger-chilli paste, a pinch of turmeric and salt and a little water into a stiff dough; shape into small ovals and fry in a little oil until golden; set aside.",
      "Grind the coconut, peanuts, sesame, coriander leaves and the remaining ginger, garlic and green chilli to a coarse green paste.",
      "Cut the plantain, sweet potato, potato and eggplant into large chunks and the beans into lengths; rub half the green paste through them with the turmeric, cumin, sugar, lemon and salt.",
      "Heat the oil in a heavy pot, add the root vegetables first with a splash of water, cover and cook 10 minutes on low heat.",
      "Layer in the eggplant, beans and peas with the remaining paste; cover and cook 12–15 minutes more, shaking the pot rather than stirring, until everything is tender.",
      "Crown with the muthia, cover 3 minutes to steam them soft, and serve with puris — undhiyu is cooked upside-down and turned out, vegetables glossed and whole.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-sev-tameta",
    name: { en: "Sev Tameta nu Shaak", hindi: "सेव टमेटा नु शाक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170457", grams: 500 }, // tomato
      { foodId: "usda-174288", grams: 60 }, // besan, for the sev
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Make the sev first: knead the besan with a pinch of turmeric, cayenne, salt and just enough water into a stiff dough.",
      "Press the dough through a sev press or coarse grater straight into oil at 170°C; fry 1–2 minutes until crisp and pale gold; drain and cool — the sev must be brittle.",
      "Heat the remaining oil and crackle the mustard and cumin; fry the onion 5 minutes to golden.",
      "Add the ginger and garlic for 1 minute, then the chopped tomato, turmeric, cayenne, sugar and salt.",
      "Cook the tomato down 10 minutes, stirring, until it is a thick, sweet-sour sauce with the oil at the edges.",
      "Add 150 ml hot water and simmer 3 minutes to a pouring gravy; taste — it should be boldly sweet, sour and hot.",
      "Serve the gravy in bowls and shower the sev over at the table, never before: sev tameta is eaten in the minute the sev is still crisp against the hot tomato.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-dal-dhokli",
    name: { en: "Dal Dhokli", hindi: "दाल ढोकली" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 180 }, // pigeon peas (toor dal)
      { foodId: "usda-168893", grams: 150 }, // whole wheat flour, for the dhokli
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172430", grams: 30 }, // peanuts
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-167746", grams: 15 }, // lemon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pressure-cook the toor dal with the turmeric and peanuts in 800 ml water for 4 whistles until soft; whisk to a smooth, thin dal.",
      "The classic sweetener is jaggery, which is not in Bloom's verified set; the set's sugar stands in, stated here. Stir in the tomato, sugar, lemon, ginger, cayenne and salt and simmer 10 minutes — the dal should be sweet, sour and thin.",
      "Knead the flour with a pinch of salt and turmeric and about 80 ml water into a firm dough; rest 20 minutes.",
      "Roll the dough thin and cut into diamonds or squares — the dhokli.",
      "Temper the mustard, cumin, cinnamon and cloves in the oil and pour into the dal.",
      "Drop the dhokli pieces into the simmering dal one by one, stirring so they do not clump; cook 8–10 minutes until the pasta is tender and the dal has thickened around it.",
      "Rest 5 minutes and serve in bowls with coriander leaves — a complete meal in a bowl, Gujarat's pasta-and-dal in one pot.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-anda-ghotala",
    name: { en: "Anda Ghotala (Surat Egg Curry)", hindi: "अंडा घोटाला" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 80 }, // green pepper
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173410", grams: 25 }, // butter
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Ghotala is Surat's street-side scramble: eggs mashed — ghotala means a muddle — into a fiery tomato masala, with grated boiled egg folded in.",
      "Boil 2 of the eggs hard, cool, peel and grate them coarsely; set aside.",
      "Melt the butter with the oil and fry the onion 7 minutes to golden; add the green pepper, ginger, garlic and green chilli for 2 minutes.",
      "Add the tomato, chili powder, turmeric and salt; cook 7 minutes to a thick, oily, deep-red masala.",
      "Beat the remaining raw eggs and pour them into the masala, scrambling continuously over medium heat into soft, creamy curds, 2–3 minutes.",
      "Fold in the grated boiled egg and cook 1 minute more — the two textures, creamy curd and firm grate, are the dish.",
      "Scatter coriander leaves and serve at once with buttered bread or pav-style rolls, straight from the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ========================= MAHARASHTRIAN ========================= */
  {
    id: "dish-pithla",
    name: { en: "Pithla", hindi: "पिठलं" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 120 }, // besan
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171410", grams: 25 }, // peanut oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Whisk the besan with 600 ml water, the turmeric and salt into a smooth, thin batter — pithla is Maharashtra's farmer curry, made in minutes from almost nothing.",
      "Heat the oil and crackle the mustard and cumin; add the onion and fry 6 minutes to a deep golden.",
      "Add the garlic and green chilli and fry 1 minute until the garlic smells sweet.",
      "Pour in the besan batter in a stream, stirring constantly and scraping the bottom, and bring to a boil.",
      "Simmer 6–8 minutes, stirring, until the pithla thickens to a soft, flowing porridge that mounds briefly on the spoon; it firms as it stands, so keep it loose.",
      "Taste for salt — pithla should be boldly seasoned, garlicky and hot.",
      "Scatter coriander leaves and serve at once over bhakri or rice, before it sets.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bharli-vangi",
    name: { en: "Bharli Vangi (Stuffed Eggplant)", hindi: "भरली वांगी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 500 }, // eggplant
      { foodId: "usda-170169", grams: 60 }, // coconut meat
      { foodId: "usda-172430", grams: 50 }, // peanuts
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-171410", grams: 30 }, // peanut oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Bharli vangi's masala is goda masala country; Bloom's set carries no goda blend, so the stuffing is built from the set's coconut, peanut, sesame and whole spices — the dish's real architecture, stated openly.",
      "Roast the peanuts, sesame and coconut until golden and grind coarse with the ginger, garlic, chili powder, turmeric, ground coriander and cumin, sugar and salt into a crumbly stuffing.",
      "Slit each small eggplant into quarters from the base, keeping the stem end joined, and pack the stuffing deep into the cuts.",
      "Fry the chopped onion in the oil 6 minutes to golden; lay the stuffed eggplants in a single layer.",
      "Add the tamarind juice and 150 ml hot water, cover, and cook on low heat 18–20 minutes, turning once, until the eggplants are completely tender and the gravy is thick.",
      "The eggplants should slump when prodded and the stuffing should have melted into the sauce at the edges.",
      "Scatter coriander leaves and serve with bhakri or rice — sweet, sour, hot and nutty in one bite.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-thalipeeth",
    name: { en: "Thalipeeth", hindi: "थालीपीठ" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 100 }, // whole wheat flour
      { foodId: "usda-174288", grams: 60 }, // besan
      { foodId: "usda-169714", grams: 60 }, // rice flour
      { foodId: "usda-2710842", grams: 40 }, // sorghum
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170150", grams: 5 }, // sesame seeds
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Thalipeeth is Maharashtra's multigrain pancake, its flour a household blend. Bloom's set carries sorghum as a grain, so grind it dry to flour first — stated in the open, like every substitution in this wave.",
      "Mix the wheat flour, besan, rice flour and sorghum flour with the turmeric, cumin, sesame and salt.",
      "Knead in the finely chopped onion, green chilli and coriander with just enough warm water for a soft, slightly sticky dough; rest 15 minutes.",
      "Pat a ball of dough out on a greased sheet or banana-leaf substitute — use a piece of parchment — into a 12 cm disc, wetting your fingers so it does not stick; poke 4 holes in it.",
      "Slide the disc onto a hot, oiled tawa, drizzle oil into the holes and around the edges, and cover.",
      "Cook 3 minutes until the base is crisp and spotted, flip and cook 2 minutes more.",
      "Serve hot with butter or yogurt — crisp-edged, soft-centred, and different at every house, as thalipeeth should be.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kothimbir-vadi",
    name: { en: "Kothimbir Vadi", hindi: "कोथिंबीर वडी" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169997", grams: 150 }, // coriander leaves
      { foodId: "usda-174288", grams: 120 }, // besan
      { foodId: "usda-169714", grams: 30 }, // rice flour
      { foodId: "usda-172430", grams: 30 }, // peanuts
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170150", grams: 5 }, // sesame seeds
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Chop the coriander leaves — stems and all — fine; kothimbir vadi is a coriander cake with just enough besan to hold it, never the reverse.",
      "Stir the besan and rice flour with the peanuts (crushed coarse), ginger, garlic, green chilli, turmeric, cumin, sesame and salt through the coriander with only a splash of water — the leaves' own moisture makes the batter.",
      "Spread the mixture 2 cm thick in a greased steaming tray and steam 15 minutes, until a knife comes out clean.",
      "Cool completely, then cut into squares or diamonds; a warm vadi crumbles, a cool one slices clean.",
      "Shallow-fry the pieces in oil over medium heat 2–3 minutes a side until the edges are crisp and deep green-gold.",
      "Drain briefly and serve hot with chutney — crisp shell, soft herbed centre.",
      "The steamed squares keep a day and fry up fresh; in Maharashtra they are tiffin and tea-time both.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-malvani-chicken-curry",
    name: { en: "Malvani Chicken Curry", hindi: "मालवणी चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170169", grams: 100 }, // coconut meat
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Malvani masala is a roasted blend; Bloom's set carries no ready blend, so roast the coriander seed, cumin, cinnamon, cloves and black pepper dry until dark and fragrant and grind them — the blend is built, not borrowed.",
      "Roast the coconut in a dry pan until deep golden and grind to a paste with a little water.",
      "Fry the onion in the coconut oil for 10 minutes to a deep brown; add the ginger and garlic for 1 minute.",
      "Add the tomato, chili powder, turmeric and salt; cook 6 minutes to a thick masala.",
      "Add the chicken and sear 5 minutes; pour in 250 ml hot water, cover and simmer 15 minutes until tender.",
      "Stir in the coconut paste and the ground roasted spices; simmer 5 minutes until the gravy is dark, rich and clinging.",
      "Scatter coriander leaves and serve with rice or vade — this is the Konkan coast's Sunday chicken.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-rava-mackerel-fry",
    name: { en: "Rava Mackerel Fry", hindi: "रवा मॅकरेल फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175119", grams: 500 }, // mackerel
      { foodId: "usda-168933", grams: 60 }, // semolina (rava)
      { foodId: "usda-169714", grams: 20 }, // rice flour
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-330458", grams: 40 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the mackerel into thick steaks, wash and pat very dry — the rava crust needs a dry surface to grip.",
      "Rub the fish with the lemon, garlic paste, turmeric, chili powder, cayenne and salt; rest 20 minutes.",
      "Mix the semolina and rice flour on a plate with a pinch of salt.",
      "Press each steak firmly into the rava on both sides so a thick, even crust coats it; rest 5 minutes to set the crust.",
      "Heat the coconut oil in a wide pan until shimmering and lay the fish in without crowding.",
      "Fry 4 minutes a side, turning once, until the crust is deep golden and crackling and the flesh flakes at the bone.",
      "Serve at once with lemon and rice — the crust must reach the table still crackling.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ============================== GOAN ============================== */
  {
    id: "dish-chicken-cafreal",
    name: { en: "Chicken Cafreal", hindi: "चिकन कॅफ्रियाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // chicken thigh
      { foodId: "usda-169997", grams: 60 }, // coriander leaves
      { foodId: "usda-173475", grams: 20 }, // mint
      { foodId: "usda-170497", grams: 15 }, // green chilli
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173469", grams: 30 }, // vinegar, cider
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Grind the coriander leaves, mint, green chillies, ginger, garlic, cumin, cinnamon, cloves, black pepper, turmeric, sugar and salt with the vinegar into a thick, dark-green paste — cafreal's whole identity is this paste.",
      "Score the chicken pieces and rub the paste deep into them; marinate at least 2 hours, or overnight.",
      "Heat the oil in a heavy, lidded pan and lay the chicken in with all its marinade.",
      "Sear 5 minutes, then cover and cook on low heat 20 minutes, turning once, letting the chicken braise in its own green juices.",
      "Uncover for the last 5 minutes and reduce the gravy until it clings dark and glossy to the chicken and the oil rims the pan.",
      "The chicken should be tender to the bone, the masala almost dry, green-black and fiery.",
      "Serve with bread or rice and lemon — cafreal is Goa's African-Portuguese inheritance, and it should taste like it.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chicken-xacuti",
    name: { en: "Chicken Xacuti", hindi: "चिकन शागोती" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170169", grams: 120 }, // coconut meat
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171330", grams: 10 }, // poppy seed
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Xacuti's masala is roasted in two parts. Dry-roast the coriander seed, cumin, cinnamon, cloves, cardamom, poppy seed and chili powder until dark and aromatic; grind fine.",
      "Roast the coconut separately until deep golden-brown and grind to a paste with a little water — this roasted coconut is xacuti's body.",
      "Fry the onion in the coconut oil for 10 minutes to a deep brown; add the ginger and garlic for 1 minute.",
      "Add the chicken, turmeric and salt; sear 5 minutes.",
      "Stir in the ground roasted spices and the coconut paste with 250 ml hot water and the tamarind juice; cover and simmer 18 minutes until the chicken is tender.",
      "The gravy should be dark, thick and intensely aromatic, with the oil just beginning to separate.",
      "Rest 10 minutes and serve with rice or bread — xacuti deepens as it sits and is better still the next day.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chicken-vindaloo",
    name: { en: "Chicken Vindaloo", hindi: "चिकन विंदालू" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-173469", grams: 45 }, // vinegar, cider
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170932", grams: 5 }, // cayenne
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Vindaloo's classic meat is pork, which this programme deliberately does not use; chicken vindaloo is a real Goan table dish in its own right, and it is named for exactly what it is.",
      "Grind the garlic, ginger, cayenne, chili powder, cumin, mustard seed, cinnamon, cloves and turmeric with the vinegar into a smooth paste.",
      "Rub the paste into the chicken with the salt and marinate at least 2 hours — vindaloo is a marinade that becomes a gravy, and it needs the time.",
      "Fry the onion in the mustard oil for 10 minutes until deep golden-brown.",
      "Add the chicken with all its marinade and the sugar; sear 5 minutes.",
      "Add 200 ml hot water, cover and simmer 20 minutes until the chicken is tender and the gravy is brick-red and sharp.",
      "Rest at least 15 minutes — vindaloo is famously better the next day, when the vinegar and chilli settle into the meat. Serve with rice.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-prawn-balchao-style",
    name: { en: "Prawn Balchao-Style", hindi: "प्रॉन बालचाओ" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175179", grams: 450 }, // shrimp
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-173469", grams: 40 }, // vinegar, cider
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170932", grams: 4 }, // cayenne
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 1 }, // mustard seed
      { foodId: "usda-330458", grams: 35 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Balchao is Goa's fiery prawn pickle-curry, built to keep; this -Style version is cooked to eat fresh, with the same vinegar-chilli architecture.",
      "Marinate the prawns with the turmeric and half the salt for 15 minutes; sear them in a spoon of the coconut oil for 1 minute a side and lift out — they finish in the sauce.",
      "Grind the garlic, ginger, cayenne, chili powder, cumin and mustard seed with the vinegar into a paste.",
      "Fry the onion in the remaining oil for 10 minutes until deep golden; add the tomato and cook 5 minutes to a pulp.",
      "Add the spice paste and the sugar and fry 3 minutes until the raw vinegar edge softens and the oil separates.",
      "Return the prawns with any juices and cook 3 minutes, just until they curl and turn opaque — a minute longer and they toughen.",
      "Rest 10 minutes and serve with rice; balchao should be hot, sour and sweet in equal argument.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-recheado-mackerel",
    name: { en: "Recheado Mackerel", hindi: "रेशाद मॅकरेल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175119", grams: 550 }, // mackerel
      { foodId: "usda-170932", grams: 6 }, // cayenne
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-173469", grams: 30 }, // vinegar, cider
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-330458", grams: 35 }, // coconut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Recheado is Goa's red stuffing masala. Grind the cayenne, chili powder, turmeric, garlic, ginger, sugar and salt with the vinegar into a thick, brick-red paste.",
      "Fry the finely chopped onion in a spoon of the oil until golden, stir it through the paste, and cool — the onion sweetens the stuffing.",
      "Clean the mackerel and slit each along one side to make a deep pocket, keeping the fish whole.",
      "Pack the recheado paste generously into the pockets and smear the rest over the skin; rest 30 minutes.",
      "Heat the remaining coconut oil in a wide pan and lay the fish in gently, stuffed side up.",
      "Fry 5 minutes, turn once with care, and fry 4 minutes more until the skin is crisp and the flesh flakes at the thickest part.",
      "Serve whole, with lemon and rice — each fish carries its own sauce inside it.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ========================== RAJASTHANI ========================== */
  {
    id: "dish-dal-baati",
    name: { en: "Dal Baati", hindi: "दाल बाटी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 300 }, // whole wheat flour, for the baati
      { foodId: "usda-172436", grams: 120 }, // pigeon peas (toor dal)
      { foodId: "usda-174256", grams: 60 }, // mung beans
      { foodId: "usda-171314", grams: 50 }, // ghee
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with half the salt, 20 g of the ghee rubbed in, and about 150 ml water into a stiff dough; rest 30 minutes.",
      "Roll the dough into 8 smooth balls, press a thumbprint into each, and bake at 200°C for 25–30 minutes, turning once, until hard, golden and cracked — a baati should sound hollow when tapped.",
      "Pressure-cook the toor and moong dals with the turmeric and 700 ml water for 4 whistles until soft; whisk lightly, keeping some texture.",
      "Temper the cumin in a spoon of ghee; fry the onion 6 minutes, add the ginger and garlic for 1 minute, then the tomato, cayenne and ground coriander; cook 5 minutes to a masala.",
      "Pour the masala into the dal with the remaining salt and the lemon; simmer 8 minutes to a flowing consistency.",
      "Crack each hot baati open with your thumbs and dunk it whole into the remaining melted ghee for a few seconds — this is not optional, it is the dish.",
      "Serve the ghee-soaked baati drowned in dal, with more ghee and dal at the table; eat with your hands, breaking and dipping.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "oven"],
  },
  {
    id: "dish-gatte-ki-sabzi",
    name: { en: "Gatte ki Sabzi", hindi: "गट्टे की सब्ज़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 200 }, // besan, for the gatte
      { foodId: "usda-2259793", grams: 250 }, // yogurt
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the besan with half the turmeric, cayenne, cumin and salt, a spoon of oil and just enough water into a stiff dough; rest 15 minutes.",
      "Roll the dough into cylinders the thickness of a finger, then poach them in boiling water for 10 minutes until they float and feel firm; lift out and keep the poaching water — it becomes the gravy.",
      "Cool the cylinders and cut into 2 cm pieces — the gatte.",
      "Whisk the yogurt smooth with the remaining turmeric, cayenne and ground coriander.",
      "Fry the onion in the remaining oil 6 minutes to golden; add the ginger and garlic for 1 minute.",
      "Lower the heat and stir in the yogurt gradually until it simmers without splitting; add the gatte and enough poaching water for a flowing gravy.",
      "Simmer 8 minutes until the gatte are tender and the gravy glossy; scatter coriander and serve with roti or rice — Rajasthan's answer to a land without vegetables.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-laal-maas-style",
    name: { en: "Laal Maas-Style (Minced Lamb)", hindi: "लाल मांस" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // lamb, ground
      { foodId: "usda-2259793", grams: 150 }, // yogurt
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170932", grams: 6 }, // cayenne
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-172337", grams: 35 }, // mustard oil
      { foodId: "usda-171314", grams: 10 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Laal maas is Mewar's scarlet lamb curry, classically made with chunks of mutton and Mathania chillies. Bloom's verified set carries lamb ground, so this is the minced reading — the colour, heat and method are the dish's own, the cut is stated.",
      "Marinate the lamb with the yogurt, half the cayenne and chili powder and the salt for 1 hour.",
      "Heat the mustard oil until it just smokes; fry the onion for 10 minutes to a deep, even brown — the colour of the curry begins here.",
      "Add the garlic and ginger for 1 minute, then the lamb with its marinade; sear hard 8 minutes until browned and its fat renders.",
      "Add the remaining cayenne and chili powder, the ground coriander and cumin, cardamom, cinnamon and cloves; fry 2 minutes until the oil turns brick-red.",
      "Add 250 ml hot water, cover and simmer 25 minutes until the lamb is tender and the gravy is thick with red oil floating — laal means red, and the dish must earn it.",
      "Finish with the ghee, rest 10 minutes, and serve with bajra roti or rice and a warning: this is meant to be hot.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bajra-roti",
    name: { en: "Bajra Roti", hindi: "बाजरा रोटी" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512379", grams: 250 }, // millet (bajra)
      { foodId: "usda-168893", grams: 30 }, // whole wheat flour, for binding
      { foodId: "usda-171314", grams: 10 }, // ghee, to serve
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Bajra is pearl millet, and Bloom's verified set carries it as a whole grain, so grind it dry to a flour first — the method states it, as with every grain flour in this wave.",
      "Stir the bajra flour with the wheat flour and salt; the wheat is a binder — bajra has no gluten and a pure bajra dough tears.",
      "Knead with warm water, a little at a time, into a soft dough; bajra dough is kneaded fresh for each roti and never rested long.",
      "Take a ball of dough and pat it out between wet palms, or on a wet cloth, into a 12 cm disc — bajra roti is patted, not rolled.",
      "Slide it onto a hot tawa and cook 1–2 minutes until the surface dries and spots; flip and cook the second side.",
      "Hold the roti directly over a flame for a few seconds to blister and puff it, as it is done in Rajasthan.",
      "Brush with ghee and serve at once with laal maas or dal — bajra roti hardens as it cools, so it goes from tawa to plate without pause.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ============================= SINDHI ============================= */
  {
    id: "dish-sindhi-kadhi",
    name: { en: "Sindhi Kadhi", hindi: "सिंधी कढ़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 60 }, // besan
      { foodId: "usda-170483", grams: 120 }, // drumstick pods
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-169260", grams: 120 }, // okra
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-2685577", grams: 100 }, // eggplant
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Sindhi kadhi is the kadhi with no yogurt in it at all — a roasted-besan gravy soured with tamarind, full of vegetables. Roast the besan in the oil, stirring, for 5 minutes until it darkens and smells nutty.",
      "Crackle the mustard, cumin and fenugreek in the same oil; add the ginger and green chilli for 30 seconds.",
      "Whisk in 800 ml hot water a little at a time so no lumps form; bring to a boil — the roasted besan will thicken it to a thin sauce.",
      "Add the potato, drumstick and beans with the turmeric, cayenne and salt; simmer 8 minutes.",
      "Add the okra, eggplant and tomato and simmer 8 minutes more, until every vegetable is tender and the okra has not slimed the gravy — it goes in late for that reason.",
      "Stir in the tamarind juice and simmer 2 minutes; the kadhi should be boldly sour, hot and thin enough to pour over rice.",
      "Scatter coriander leaves and serve over rice with something fried alongside, as Sindhi Sundays demand.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-sai-bhaji",
    name: { en: "Sai Bhaji", hindi: "साई भाजी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168462", grams: 300 }, // spinach
      { foodId: "usda-2644283", grams: 120 }, // lentils, dry
      { foodId: "usda-2346401", grams: 100 }, // potato
      { foodId: "usda-2685577", grams: 100 }, // eggplant
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Sai bhaji — 'green dish' — is Sindh's spinach-and-dal pot. The classic dal is chana dal, which is not in Bloom's verified set; the set's lentils cook into it in its place, stated openly.",
      "Rinse the lentils and soak 30 minutes. Chop the spinach roughly, stems and all.",
      "Heat the oil, crackle the cumin, and fry the onion 5 minutes to golden; add the ginger, garlic and green chilli for 1 minute.",
      "Add the lentils, potato, eggplant, tomato, turmeric and salt with 500 ml water; pressure-cook 3 whistles until the lentils are soft.",
      "Stir in the spinach and cook uncovered 6–8 minutes, until it wilts into the dal and the pot turns deep green.",
      "Mash lightly with the back of a spoon so the bhaji is half-smooth, half-chunky; adjust the salt.",
      "Serve with rice or roti and a spoon of ghee — sai bhaji is the Sindhi everyday pot, greens and dal in one.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  /* ============================= PARSI ============================= */
  {
    id: "dish-dhansak-style",
    name: { en: "Parsi Dhansak-Style", hindi: "पारसी धनसाक" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 400 }, // lamb, ground
      { foodId: "usda-172436", grams: 80 }, // pigeon peas (toor dal)
      { foodId: "usda-174256", grams: 50 }, // mung beans
      { foodId: "usda-174284", grams: 50 }, // red lentils (masoor)
      { foodId: "usda-2346401", grams: 100 }, // potato
      { foodId: "usda-2685577", grams: 100 }, // eggplant
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-173475", grams: 8 }, // mint
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Dhansak is the Parsi Sunday institution: meat and three dals and vegetables cooked into one amber gravy, served with browned rice. Dhansak masala is a family blend; this one is built from the set's whole spices, and the set's ground lamb stands in for the classic chunks — both stated.",
      "Pressure-cook the toor, moong and masoor dals with the potato, eggplant, turmeric and 700 ml water for 4 whistles until completely soft; mash to a smooth, thick base.",
      "Fry the onion in the ghee for 10 minutes to a deep brown; add the ginger and garlic for 1 minute.",
      "Add the tomato, chili powder, ground coriander, cumin, cinnamon and cardamom; cook 6 minutes to a dark masala.",
      "Add the lamb and sear hard for 8 minutes, breaking it up, until browned and its fat renders.",
      "Pour in the mashed dal base with enough hot water for a thick, flowing gravy; simmer 15 minutes until the lamb is tender and the whole pot is one deep amber.",
      "Finish with lemon and mint and serve with rice — dhansak is mournful and festive at once, and always eaten at lunch.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-patra-style-fish",
    name: { en: "Patra-Style Fish (Green Chutney Fish)", hindi: "पात्रा मच्छी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 500 }, // tilapia
      { foodId: "usda-169997", grams: 60 }, // coriander leaves
      { foodId: "usda-173475", grams: 20 }, // mint
      { foodId: "usda-170169", grams: 50 }, // coconut meat
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-167746", grams: 25 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Patra ni machhi is fish in green chutney steamed inside a banana leaf. There is no banana leaf in Bloom's verified set, so the fish is steamed in a covered parcel of parchment instead — the chutney, the fish and the steaming are the dish; the leaf's absence is stated, not hidden.",
      "Grind the coriander, mint, coconut, green chilli, garlic, cumin, sugar, salt and lemon juice into a thick, vivid-green chutney.",
      "Cut the tilapia into thick pieces and coat every surface generously with the chutney; rest 30 minutes.",
      "Wrap each portion in parchment, folding the edges tight so the steam stays in.",
      "Steam the parcels over boiling water for 12–15 minutes, until the fish is opaque and flakes at a touch.",
      "Rest 2 minutes, then open the parcels at the table so the green, lemony steam escapes in front of the eater.",
      "Serve with rice — the fish should be silky, the chutney still bright green and sharp.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-sali-boti-style",
    name: { en: "Sali Boti-Style (Lamb with Potato Straws)", hindi: "साली बोटी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 500 }, // lamb, ground
      { foodId: "usda-2346401", grams: 200 }, // potato, for the sali straws
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173469", grams: 20 }, // vinegar, cider
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Sali boti is the Parsi sweet-sour lamb under a crown of crisp potato straws — the sali. The classic boti are chunks; Bloom's set carries lamb ground, so this is the minced reading, stated in the open.",
      "Cut the potato into fine straws, rinse until the water runs clear, dry thoroughly, and fry in half the oil until crisp and golden; drain and salt lightly — these must stay crisp until the moment of serving.",
      "Fry the onion in the remaining oil for 10 minutes to a deep brown; add the ginger and garlic for 1 minute.",
      "Add the lamb and sear hard for 8 minutes, breaking it up, until well browned.",
      "Add the tomato, chili powder, turmeric, cinnamon, cardamom, cloves and salt; cook 6 minutes to a thick masala.",
      "Stir in the vinegar and sugar with 150 ml hot water and simmer 12 minutes until the lamb is tender and the gravy is glossy, sweet-sour and just clinging.",
      "Serve the lamb in a dish crowned completely with the potato straws, coriander over, and eat before the sali softens — the crunch against the gravy is the dish.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ============================ BENGALI ============================ */
  {
    id: "dish-shorshe-machh",
    name: { en: "Shorshe Machh (Mustard Fish)", hindi: "शोरशे माछ" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175119", grams: 550 }, // mackerel
      { foodId: "usda-170929", grams: 25 }, // mustard seed, ground
      { foodId: "usda-170497", grams: 12 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Shorshe ilish is Bengal's anthem, but hilsa is not in Bloom's verified set; oily mackerel carries the mustard gravy here, and the substitution is stated, not hidden.",
      "Rub the mackerel steaks with the turmeric, lemon and half the salt; rest 15 minutes.",
      "Soak the ground mustard in 100 ml warm water for 10 minutes, then whisk it smooth with the remaining salt — soaking takes the raw bite out of the mustard.",
      "Heat the mustard oil until it just smokes and loses its raw smell; sear the fish 2 minutes a side and lift out.",
      "Slit the green chillies and drop them into the same oil for 30 seconds.",
      "Lower the heat, pour in the mustard mixture, and stir constantly for 2 minutes at the barest simmer — mustard sauce must never boil hard or it turns bitter.",
      "Slide the fish back in, spoon the sauce over, cover and simmer 5 minutes until the fish flakes and the gravy is pungent, golden and just clinging. Serve with plain rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chingri-malakari",
    name: { en: "Chingri Malakari (Prawn Coconut Curry)", hindi: "चिंगड़ी मालाइकारी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175179", grams: 450 }, // shrimp
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Marinate the prawns with the turmeric and half the salt for 15 minutes.",
      "Sear the prawns in the mustard oil for 1 minute a side, just until they blush; lift out — they will finish in the curry and must not toughen.",
      "In the same oil, bloom the bay, cinnamon and cardamom; fry the onion paste — grated or ground — for 6 minutes to a pale gold.",
      "Add the ginger and garlic and cook 1 minute; the malakari masala stays gentle — no tomato, no heavy browning.",
      "Pour in the coconut milk with the cayenne, sugar and remaining salt; bring to the gentlest simmer and cook 5 minutes until it thickens slightly and smells sweet.",
      "Return the prawns with the green chillies and simmer 3 minutes, until the prawns are just opaque and curled.",
      "Rest 5 minutes and serve with rice — the gravy should be ivory, mild and rich, the prawns the colour of sunset.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kosha-lamb-style",
    name: { en: "Kosha Mangsho-Style (Slow Lamb Curry)", hindi: "कोशा मंगशो" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // lamb, ground
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-2259793", grams: 100 }, // yogurt
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-172337", grams: 35 }, // mustard oil
      { foodId: "usda-171314", grams: 10 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Kosha mangsho is Bengal's slow, dark lamb curry, classically made with chunks of goat. Bloom's verified set carries lamb ground, so this is the minced reading — the kosha method of patient frying is the dish, and the cut is stated.",
      "Marinate the lamb with the yogurt, turmeric, half the chili powder and salt for 1 hour.",
      "Heat the mustard oil until it just smokes; add the sugar and let it caramelise to amber — this is the kosha colour secret.",
      "Add the bay, cinnamon, cardamom and cloves, then the onion; fry 12–15 minutes, stirring, to a deep, even brown.",
      "Add the ginger and garlic for 2 minutes, then the lamb with its marinade; fry hard — the kosha stage — for 12 minutes, scraping the pan, until the meat browns and the oil separates in dark pools.",
      "Add the remaining chili powder, ground coriander and cumin with 200 ml hot water; cover and simmer 20 minutes until the lamb is tender and the gravy is nearly dry and clinging.",
      "Finish with the ghee, rest 10 minutes, and serve with luchi or rice — kosha should be dark as mahogany and rich enough to coat the spoon.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-aloo-posto",
    name: { en: "Aloo Posto", hindi: "आलू पोस्तो" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-171330", grams: 40 }, // poppy seed
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-334247", grams: 3 }, // sugar
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the poppy seeds in warm water for 30 minutes, then grind with a green chilli and a little of the soaking water to a smooth, white paste — posto must be ground fine or it stays gritty.",
      "Cut the potatoes into small cubes and fry in the mustard oil over medium heat for 8 minutes, until golden at the edges and nearly tender.",
      "Add the turmeric, salt and sugar and toss for 1 minute.",
      "Pour in the poppy paste with 100 ml water and stir gently to coat every cube.",
      "Cover and simmer 5 minutes, until the potatoes are completely tender and the posto clings in a pale, nutty coat.",
      "Slit the remaining green chillies over the top and rest 2 minutes off the heat.",
      "Serve with rice and dal — aloo posto is Bengal's quiet masterpiece, and it should taste of poppy and mustard oil and almost nothing else.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shukto",
    name: { en: "Shukto", hindi: "शुक्तो" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168393", grams: 120 }, // bitter gourd
      { foodId: "usda-2710818", grams: 120 }, // plantain
      { foodId: "usda-2346401", grams: 120 }, // potato
      { foodId: "usda-2685577", grams: 120 }, // eggplant
      { foodId: "usda-170483", grams: 80 }, // drumstick pods
      { foodId: "usda-2346400", grams: 80 }, // green beans
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Shukto opens a Bengali meal: a medley of vegetables in a mild, milky gravy with one deliberate note of bitter. Cut all the vegetables into even lengths and pieces.",
      "Fry the bitter gourd slices in the mustard oil until golden at the edges; lift out — frying first keeps its bitterness gentle.",
      "In the same oil, crackle the mustard, fenugreek and bay; add the ginger for 30 seconds.",
      "Add the potato, plantain and drumstick with the turmeric and salt and 300 ml water; cover and simmer 8 minutes.",
      "Add the eggplant and beans and simmer 5 minutes more, until everything is just tender — shukto vegetables keep their shapes.",
      "Return the bitter gourd, pour in the milk and the sugar, and simmer at the barest bubble for 3 minutes; never boil hard once the milk is in.",
      "Rest 5 minutes and serve warm, first, before the richer courses — the bitter should be a whisper, not a shout.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-begun-bhaja",
    name: { en: "Begun Bhaja", hindi: "बेगुन भाजा" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 450 }, // eggplant
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-334247", grams: 2 }, // sugar
      { foodId: "usda-172337", grams: 35 }, // mustard oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the eggplant into thick rounds, 1.5 cm — thin slices dry out; begun bhaja should be custardy inside its crust.",
      "Rub the rounds with the turmeric, cayenne, sugar and salt and rest 15 minutes; blot the moisture that beads on the surface.",
      "Heat the mustard oil in a wide pan until it just smokes, then lower the heat a little.",
      "Lay the rounds in a single layer and fry 3–4 minutes a side, without moving them, until deep golden-brown and crisp at the edges.",
      "The centre should be completely soft and silky when pressed; fry in batches rather than crowding, topping up the oil if needed.",
      "Drain briefly on a rack and serve at once with rice and dal — begun bhaja waits for nobody and wilts if it stands.",
      "A squeeze of lemon at the table is the only garnish it ever needs.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-ghugni",
    name: { en: "Ghugni (Chickpea Curry)", hindi: "घुगनी" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 250 }, // chickpeas
      { foodId: "usda-2346401", grams: 100 }, // potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Ghugni is Kolkata's street-corner chickpea curry, sold from great brass pots. Soak the chickpeas overnight and pressure-cook until tender, keeping their liquor.",
      "Fry the onion in the mustard oil for 7 minutes to golden; add the ginger and garlic for 1 minute.",
      "Add the potato and fry 3 minutes; add the tomato, turmeric, cayenne, ground coriander and cumin and cook 5 minutes to a masala.",
      "Add the chickpeas with enough of their liquor for a thick, spoonable gravy; simmer 10 minutes.",
      "Crush a few chickpeas into the gravy to thicken it; the consistency should be that of a heavy stew, never a soup.",
      "Finish with lemon and salt — ghugni should be sharp and hot.",
      "Serve in bowls with chopped onion and coriander over, and bread or luchi alongside; in Kolkata it is eaten standing, from a leaf cup.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-macher-jhol",
    name: { en: "Macher Jhol", hindi: "माछेर झोल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 500 }, // tilapia
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-2685573", grams: 150 }, // cauliflower
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin seed
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Macher jhol is Bengal's everyday fish curry — a thin, turmeric-gold broth with vegetables, nothing like the richness of kosha. Rub the tilapia with half the turmeric and salt; rest 10 minutes.",
      "Sear the fish in the mustard oil 2 minutes a side until lightly golden; lift out.",
      "Fry the potato wedges and cauliflower in the same oil until golden at the edges; lift out.",
      "Crackle the cumin and bay in the oil; add the ginger, tomato, remaining turmeric, cayenne and ground coriander; cook 5 minutes to a loose masala.",
      "Pour in 600 ml hot water and bring to a boil — a jhol is a broth, and it should look like one.",
      "Add the vegetables and simmer 6 minutes until tender; slide the fish back in with the green chillies and simmer 4 minutes more.",
      "Scatter coriander leaves and serve over rice with plenty of the broth — this is the curry Bengal eats when it is unwell, and when it is well.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-dimer-dalna",
    name: { en: "Dimer Dalna (Egg and Potato Curry)", hindi: "डिमेर डालना" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-2346401", grams: 250 }, // potato
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-334247", grams: 3 }, // sugar
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the eggs 9 minutes, cool, peel, and score each lightly with a knife; rub with a pinch of turmeric and salt.",
      "Fry the eggs whole in the mustard oil, turning, until their skins blister golden all over; lift out — the blistered skin is dalna's signature.",
      "Fry the potato pieces in the same oil until golden at the edges; lift out.",
      "Add the bay, cinnamon and cardamom to the oil; fry the onion 8 minutes to golden, then the ginger and garlic for 1 minute.",
      "Add the tomato, chili powder, turmeric, ground coriander and cumin, sugar and salt; cook 6 minutes to a thick masala.",
      "Add 400 ml hot water and the potatoes; simmer 8 minutes until tender, then slide the eggs in and simmer 4 minutes so they drink the gravy.",
      "Rest 5 minutes and serve with rice — the eggs should be bronzed outside and the gravy sweet, hot and just thick.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ============================= ODIA ============================= */
  {
    id: "dish-dalma",
    name: { en: "Dalma", hindi: "दालमा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 180 }, // pigeon peas (toor dal)
      { foodId: "usda-2346401", grams: 120 }, // potato
      { foodId: "usda-2710818", grams: 100 }, // plantain
      { foodId: "usda-2685577", grams: 100 }, // eggplant
      { foodId: "usda-2346404", grams: 100 }, // sweet potato
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170923", grams: 3 }, // cumin seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dalma is Odisha's temple pot: dal and vegetables cooked together, finished with roasted cumin. Pumpkin is a classic dalma vegetable and is not in Bloom's set; sweet potato stands in its place here, stated openly.",
      "Pressure-cook the toor dal with the turmeric and 700 ml water for 3 whistles until just soft.",
      "Add the potato, plantain and sweet potato in chunks and cook 6 minutes; add the eggplant and cook 4 minutes more, until every vegetable is tender but holding its shape.",
      "Stir in the grated coconut and salt and simmer 2 minutes — dalma stays brothy, never a thick dal.",
      "Dry-roast the cumin until dark and grind it coarse.",
      "Temper the bay and cayenne in the ghee, pour over the dalma, and shower the roasted cumin on top.",
      "Rest 5 minutes and serve with rice — in Puri this is mahaprasad, cooked in earthen pots and eaten as a blessing.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-pakhala-bhata",
    name: { en: "Pakhala Bhata", hindi: "पखाला भात" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice
      { foodId: "usda-2259793", grams: 200 }, // yogurt
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pakhala is Odisha's fermented rice — yesterday's rice soaked overnight in water, eaten cool against the summer heat. Cook the rice, spread it in a wide bowl, and cover with water; leave overnight at room temperature to ferment lightly.",
      "By morning the water — the torani — will be faintly sour and the rice soft and swollen; this gentle fermentation is the dish, and it cannot be rushed.",
      "Drain off most of the torani, reserving some to loosen the bowl.",
      "Whisk the yogurt with a little torani and fold it through the rice with the salt and lemon.",
      "Crackle the mustard and cumin in a drop of oil — or use them raw, as many homes do — and stir through with the ginger and green chilli.",
      "Scatter coriander leaves and serve cool, in bowls, with fried vegetables or fish alongside.",
      "Pakhala is eaten with the hands, the rice squeezed into balls; it should taste cool, sour and alive.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-santula",
    name: { en: "Santula", hindi: "संतुला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2685577", grams: 120 }, // eggplant
      { foodId: "usda-2710818", grams: 100 }, // plantain
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-322892", grams: 80 }, // whole milk
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Santula is Odisha's gentle boiled-vegetable dish, tempered and finished with a splash of milk — food for the convalescent and the everyday table alike.",
      "Cut all the vegetables into even pieces and boil them in just enough salted water to cover, 10 minutes, until tender; keep the cooking water — it is the sauce.",
      "Heat the oil and crackle the mustard, cumin and fenugreek; add the garlic and ginger for 30 seconds until fragrant, not browned.",
      "Pour the tempering over the vegetables with their water and the turmeric.",
      "Simmer 3 minutes so the flavours marry.",
      "Stir in the milk and warm through at the barest simmer for 1 minute — boiling will split it.",
      "Serve hot with rice and dal; santula should be mild, brothy and clean-tasting.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* =========================== ASSAMESE =========================== */
  {
    id: "dish-masor-tenga",
    name: { en: "Masor Tenga (Tangy Fish Curry)", hindi: "मासोर तेंगा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 500 }, // tilapia
      { foodId: "usda-170457", grams: 250 }, // tomato
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Masor tenga is Assam's beloved sour fish curry — tenga means sour, and the curry should be bright with it. Rub the tilapia with half the turmeric and salt; rest 10 minutes.",
      "Sear the fish in the mustard oil 2 minutes a side until lightly crusted; lift out.",
      "Crackle the mustard and fenugreek in the same oil — fenugreek is the tenga tempering's signature.",
      "Add the chopped tomato and cook 6 minutes until it collapses into a loose pulp.",
      "Pour in 500 ml hot water, the remaining turmeric, salt and green chillies; boil 3 minutes into a thin, golden broth.",
      "Slide the fish back in and simmer 5 minutes; stir in the lemon juice off the heat — lemon boiled loses its brightness.",
      "Scatter coriander leaves and serve over rice with plenty of broth; tenga should be light, sour and cleansing.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-aloo-pitika",
    name: { en: "Aloo Pitika", hindi: "आलू पिटिका" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 500 }, // potato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172337", grams: 15 }, // mustard oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pitika is Assam's mash — the humblest dish on the thali and the one everyone reaches for first. Boil the potatoes in their skins until completely tender.",
      "Peel while warm and mash rough with a fork — pitika is never a purée; it should hold lumps and texture.",
      "Fold in the finely chopped raw onion and green chilli — their rawness against the warm potato is the point.",
      "Pour the mustard oil over raw — in Assam the oil is not cooked for pitika, and its pungency is the seasoning.",
      "Add the salt and coriander leaves and mix with your fingers, as it is done at home, tasting as you go.",
      "Shape into a mound and serve with rice and dal, warm or at room temperature.",
      "Everything on an Assamese thali is judged against the pitika; it should be pungent, salty and soft.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* ============================= BIHARI ============================= */
  {
    id: "dish-litti-chokha",
    name: { en: "Litti Chokha", hindi: "लिट्टी चोखा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 300 }, // whole wheat flour
      { foodId: "usda-174288", grams: 120 }, // besan (sattu)
      { foodId: "usda-2685577", grams: 250 }, // eggplant, for the chokha
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-171314", grams: 25 }, // ghee, to dunk
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-167746", grams: 15 }, // lemon
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Make the sattu filling: stir the besan with the ginger, garlic, green chilli, cumin, cayenne, lemon, half the mustard oil and salt and a sprinkle of water until it is a damp, crumbly mixture that holds when squeezed.",
      "Knead the flour with a pinch of salt and about 160 ml water into a firm dough; rest 30 minutes.",
      "Divide into 8 balls; cup each, fill generously with sattu, pleat shut and roll smooth — a litti should feel heavy with filling.",
      "Bake the littis at 200°C for 25–30 minutes, turning every 10 minutes, until hard, browned and cracked; traditionally they roast in embers until the shells char in spots.",
      "Meanwhile char the eggplant and tomato directly over a flame until blackened and collapsed; boil the potato. Peel and mash all three together with the raw onion, green chilli, salt, lemon, coriander and the remaining mustard oil, raw — this is the chokha, and it must taste smoky and sharp.",
      "Crack each hot litti and dunk it in the melted ghee.",
      "Serve the ghee-soaked littis with a mound of chokha; eat by breaking the litti into the chokha with your fingers.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-sattu-sharbat",
    name: { en: "Sattu Sharbat", hindi: "सत्तू शरबत" },
    category: "drink",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 80 }, // besan (sattu)
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-173475", grams: 6 }, // mint
      { foodId: "usda-170497", grams: 2 }, // green chilli
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Sattu is roasted gram flour, and Bihar's summer drink is built on it. Dry-roast the besan in a pan for 5 minutes, stirring, until it smells deeply nutty — this roasting is what makes besan into sattu; cool completely.",
      "Dry-roast the cumin and grind it.",
      "Whisk the sattu with a little cold water into a smooth slurry, making sure no lump survives — a lumpy sharbat is the only way to ruin it.",
      "Whisk in 800 ml cold water, the lemon juice, roasted cumin, salt and the finely chopped mint and green chilli.",
      "Rest 5 minutes; the sattu will settle slightly — stir before pouring.",
      "Serve in tall glasses, cold, with the sediment stirred up into every sip.",
      "This is the drink Bihar's farmers and rickshaw-pullers run on: protein, salt, lemon and cold water against the heat.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-dal-pithi",
    name: { en: "Dal Pithi", hindi: "दाल पीठी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 180 }, // pigeon peas (toor dal)
      { foodId: "usda-168893", grams: 150 }, // whole wheat flour, for the pithi
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-171314", grams: 15 }, // ghee
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dal pithi is Bihar's hand-shaped wheat dumplings poached in dal — the same family as dal dhokli, but the pithi are pinched into little flowers by hand, not rolled and cut.",
      "Pressure-cook the toor dal with the turmeric and 700 ml water for 4 whistles until soft; whisk smooth and thin.",
      "Add the tomato, ginger, cayenne and salt and simmer 8 minutes into a savoury, flowing dal.",
      "Knead the flour with a pinch of salt and about 80 ml water into a firm dough; rest 20 minutes.",
      "Roll the dough into ropes, pinch off small pieces, and press each between thumb and finger into a little cup or flower — the pithi.",
      "Drop the pithi into the simmering dal one handful at a time, stirring gently; cook 10 minutes until the dumplings are tender and the dal has thickened around them.",
      "Temper the cumin and garlic in the ghee until the garlic is golden, pour over, scatter coriander, and serve in bowls.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-champaran-lamb-style",
    name: { en: "Champaran-Style Lamb Curry", hindi: "चंपारण मटन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // lamb, ground
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-1104647", grams: 40 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-172337", grams: 40 }, // mustard oil
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Champaran mutton — ahuna mutton — is Bihar's sealed-pot curry: everything raw goes into one handi with mustard oil and whole garlic, the lid is sealed with dough, and it cooks undisturbed. The classic cut is chunks; Bloom's set carries lamb ground, so this is the minced reading, stated openly.",
      "Mix the lamb with the sliced onion, the whole garlic cloves (the classic uses whole heads; the set's garlic is weighed peeled), ginger, green chillies and all the spices and salt.",
      "Pour the mustard oil over and work everything together with your hands until uniformly combined; rest 1 hour.",
      "Pack the mixture into a heavy, lidded pot — a handi if you have one — and seal the lid's rim with a rope of dough, or foil pressed tight under the lid.",
      "Cook on the lowest possible heat for 60–75 minutes without opening, shaking the pot once or twice so nothing catches; the lamb cooks in its own juices and the oil.",
      "Rest 10 minutes, then break the seal at the table — the steam that escapes is the whole theatre of the dish.",
      "Serve with rice; the gravy should be dark, the garlic melted to sweetness, the mustard oil rich through everything.",
    ],
    timeMinutes: 105,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ========================== NORTH-EAST ========================== */
  {
    id: "dish-jadoh-style",
    name: { en: "Jadoh-Style (Chicken Rice)", hindi: "जादोह" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice
      { foodId: "usda-2646171", grams: 400 }, // chicken thigh
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Jadoh is the Khasi rice of Meghalaya, classically cooked with pork — which this programme deliberately does not use — and often with the meat's blood, which no recipe here will pretend to. This is the chicken jadoh cooked in Shillong's ja stalls, named -Style and stated.",
      "Rinse the rice and soak 20 minutes; drain.",
      "Heat the oil and bloom the bay; fry the onion 5 minutes to golden, then the ginger and garlic for 1 minute.",
      "Add the chicken pieces, turmeric, black pepper and salt; sear 6 minutes until the chicken colours and its juices run.",
      "Add the rice and toss 2 minutes so every grain is glossed with the turmeric oil.",
      "Pour in 550 ml hot water, boil, cover and cook on the lowest heat 12 minutes.",
      "Rest 10 minutes, fluff, and serve — jadoh is a complete meal in one pot, the rice stained gold and rich with the chicken's juices.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-thukpa-style",
    name: { en: "Thukpa-Style (Handmade Noodle Soup)", hindi: "थुकपा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 200 }, // white flour, for the noodles
      { foodId: "usda-2646170", grams: 250 }, // chicken breast
      { foodId: "usda-2346407", grams: 100 }, // cabbage
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-2346400", grams: 60 }, // green beans
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Thukpa is the Himalayan noodle soup of Arunachal and the high hills. No dried noodle is in Bloom's verified set, so the noodles are made by hand from the set's flour, as they are in a thukpa kitchen — the method is the honesty.",
      "Knead the flour with a pinch of salt and about 110 ml water into a firm dough; rest 30 minutes. Roll it very thin and cut into ribbons, or pull strands by hand; dust with flour and set aside.",
      "Heat the oil and fry the onion, ginger, garlic and green chilli for 3 minutes until fragrant.",
      "Add the chicken strips and sear 4 minutes; add 1 litre hot water and the salt and simmer 8 minutes into a light broth.",
      "Add the carrot, beans and cabbage and simmer 3 minutes, keeping the vegetables bright.",
      "Drop the noodles into the broth and cook 3–4 minutes, until they float and are tender with a slight bite; the broth will thicken faintly from their flour.",
      "Finish with lemon and coriander leaves and serve in deep bowls, steaming — thukpa is mountain weather food, eaten against the cold.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chicken-momos",
    name: { en: "Chicken Momos", hindi: "चिकन मोमोज़" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 250 }, // white flour
      { foodId: "usda-2646170", grams: 300 }, // chicken breast
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with a pinch of salt and about 130 ml water into a smooth, firm dough; rest 30 minutes under a damp cloth.",
      "Mince the chicken breast fine with a knife — a food processor makes it pasty; momos want a chopped, juicy mince.",
      "Mix the chicken with the finely chopped onion, ginger, garlic, green chilli, coriander, black pepper, oil and salt until evenly combined; the filling should be moist.",
      "Roll the dough into a thin sheet and cut 8 cm rounds, or roll small balls out individually, keeping the edges thinner than the centres.",
      "Place a spoon of filling in each round, pleat the edge up and pinch it closed into a half-moon or a round purse, sealing every gap — a leaking momo steams dry.",
      "Steam over boiling water in a greased steamer for 10–12 minutes, until the wrappers turn glossy and translucent and the chicken is cooked through.",
      "Serve at once with momo chutney — momos wait for no one and toughen as they cool.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-momo-chutney",
    name: { en: "Momo Chutney (Tomato-Sesame)", hindi: "मोमो चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170457", grams: 300 }, // tomato
      { foodId: "usda-170150", grams: 25 }, // sesame seeds
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170106", grams: 6 }, // red chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-167746", grams: 8 }, // lemon
      { foodId: "usda-171025", grams: 8 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Char the tomatoes directly over a flame or under a grill until their skins blacken and split; cool and peel — the char is the chutney's depth.",
      "Dry-roast the sesame until it pops and smells nutty; cool.",
      "Grind the sesame coarse, then add the tomatoes, garlic, red chillies, ginger, lemon and salt and grind to a thick, rust-red chutney — never a smooth sauce; it should keep texture.",
      "Heat the oil until hot and pour it over the chutney, stirring it through.",
      "Rest 15 minutes for the sesame to swell and the flavours to marry.",
      "Serve with momos, generously — the chutney should be fiery, smoky and nutty, and there should always be more of it than seems polite.",
      "It keeps three days refrigerated and is just as good with pakoras and rice.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ======================== MADHYA PRADESH ======================== */
  {
    id: "dish-bhutte-ka-kees",
    name: { en: "Bhutte ka Kees", hindi: "भुट्टे का कीस" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710826", grams: 500 }, // corn
      { foodId: "usda-322892", grams: 150 }, // whole milk
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-167746", grams: 15 }, // lemon
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-170169", grams: 15 }, // coconut meat, to garnish
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Bhutte ka kees is Indore's grated-corn curry from the Sarafa bazaar. Grate the corn kernels off the cobs on the coarse side of a grater, or pulse them in a processor to a coarse, milky mash — never a purée.",
      "Melt the ghee and crackle the mustard and cumin; add the ginger and green chilli for 30 seconds.",
      "Add the corn mash with the turmeric, cayenne and salt and cook over medium heat, stirring constantly, for 8 minutes — corn catches and burns if left alone.",
      "Pour in the milk and keep cooking and stirring 6–8 minutes more, until the kees thickens to a soft, spoonable mass that leaves the sides of the pan.",
      "The corn should taste cooked and sweet, with no raw starchiness; add a splash more milk if it tightens too far.",
      "Finish with the lemon juice off the heat.",
      "Serve in bowls showered with grated coconut and coriander leaves, with lemon at the side — soft, sweet, hot and sour in every spoon.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bhopali-gosht-korma-style",
    name: { en: "Bhopali Gosht Korma-Style", hindi: "भोपाली गोश्त कोरमा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 550 }, // lamb, ground
      { foodId: "usda-2259793", grams: 200 }, // yogurt
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-2346393", grams: 15 }, // almonds
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Bhopal's korma is a Nawabi yogurt gravy, pale and aromatic rather than red. The classic cut is chunks of mutton; Bloom's verified set carries lamb ground, so this is the minced reading, stated in the open.",
      "Marinate the lamb with the yogurt, turmeric and salt for 1 hour.",
      "Fry the onion in the ghee for 12 minutes to a deep, even brown; lift out half and grind it to a paste with a little water — the browned onion is the korma's body.",
      "Add the ginger and garlic to the pan for 1 minute, then the lamb with its marinade; sear hard 8 minutes, breaking it up, until browned.",
      "Add the ground coriander, cumin, cardamom, cinnamon, cloves and cayenne and fry 2 minutes.",
      "Stir in the onion paste and 200 ml hot water; cover and simmer 25 minutes until the lamb is tender and the gravy is thick, pale-brown and glossy.",
      "Scatter slivered almonds and serve with sheermal or rice — a korma should be rich and fragrant, never fiery.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-khopra-patties",
    name: { en: "Khopra Patties (Indore Coconut-Potato)", hindi: "खोपरा पैटीज़" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-170169", grams: 120 }, // coconut meat
      { foodId: "usda-169714", grams: 30 }, // rice flour
      { foodId: "usda-172430", grams: 30 }, // peanuts
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-167746", grams: 12 }, // lemon
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-171025", grams: 45 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Khopra patties are Indore's coconut-hearted potato cakes. Boil the potatoes until tender, drain well and mash smooth while warm; cool.",
      "Mix the grated coconut with the crushed peanuts, green chilli, ginger, lemon, sugar, coriander and a pinch of salt — the filling should be sweet, sour and hot.",
      "Stir the rice flour and salt through the potato; divide into 10 portions.",
      "Cup each portion in your palm, fill with a spoon of the coconut mixture, and seal it into a smooth, round patty with the coconut completely hidden.",
      "Chill the patties 20 minutes so they firm — a warm patty bursts in the pan.",
      "Shallow-fry in the oil over medium heat 3 minutes a side, until deep golden and crisp all over.",
      "Serve hot with green chutney — crisp potato, then the sudden sweet coconut centre, is the whole surprise.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* ========================= CHHATTISGARH ========================= */
  {
    id: "dish-chhattisgarhi-fara",
    name: { en: "Fara (Chhattisgarhi Rice Dumplings)", hindi: "फरा" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 250 }, // rice flour
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Fara are Chhattisgarh's steamed rice-flour dumplings — the state's answer to the momo, seasoned inside and out. Boil 250 ml water with the salt and a spoon of the oil.",
      "Rain in the rice flour, stir hard, cover and rest off the heat 5 minutes; knead the warm dough until smooth.",
      "Roll the dough into ropes and cut into small pieces; shape each into a little cylinder or crescent with your fingers.",
      "Steam over boiling water for 10–12 minutes, until the fara turn glossy and feel firm and springy.",
      "Heat the remaining oil and crackle the cumin and sesame; add the ginger and green chilli for 30 seconds.",
      "Toss the steamed fara through the tempering for 2 minutes until they pick up the spices and gloss.",
      "Scatter coriander leaves and serve hot with chutney — soft, chewy and savoury, fara are also the classic way leftover rice is reborn.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-chila",
    name: { en: "Chila (Rice Flour Crepe)", hindi: "चीला" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 200 }, // rice flour
      { foodId: "usda-174288", grams: 40 }, // besan
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Chila is Chhattisgarh's rice-flour crepe — not the besan chilla of the north, but a thinner, crisper rice pancake. Whisk the rice flour and besan with the turmeric, cumin and salt.",
      "Whisk in about 350 ml water to a thin, pourable batter; rest 15 minutes. The besan is the binder that keeps the rice crepe from cracking.",
      "Stir in the finely chopped onion, green chilli, ginger and coriander.",
      "Heat a cast-iron tawa until hot and grease it lightly; pour a ladle of batter and swirl it thin, as for a dosa.",
      "Drizzle oil around the edges and cook 2 minutes, until the base is golden and crisp and the top has set.",
      "Flip and cook 30 seconds more; fold and serve. Repeat with the remaining batter, stirring it each time — rice flour settles.",
      "Serve with chutney for breakfast; a good chila is lacy at the edges and soft in the middle.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bafauri-style",
    name: { en: "Bafauri-Style (Steamed Besan Dumplings)", hindi: "बफौरी" },
    category: "snack",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 200 }, // besan
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170150", grams: 5 }, // sesame seeds
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Bafauri is Chhattisgarh's steamed pakora — all the pleasure of a fritter with none of the frying. The classic batter is ground chana dal, which is not in Bloom's verified set; besan, its own flour, carries it here and is stated.",
      "Stir the besan with the turmeric, cumin, sesame and salt and just enough water to make a thick, dropping batter — it should hold a spoon's shape.",
      "Fold in the finely chopped onion, ginger, garlic, green chilli and coriander.",
      "Rest the batter 15 minutes so the besan hydrates fully; a rested batter steams lighter.",
      "Drop spoonfuls into a greased steamer, leaving room between them, and steam 12–15 minutes until firm, risen and dry to a fingertip.",
      "Rest 2 minutes, then lift out gently — steamed bafauri are delicate while hot.",
      "Serve with lemon and chutney; they should be soft, spongy and savoury, with the sesame crackling faintly on top.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-dubki-kadhi",
    name: { en: "Dubki Kadhi", hindi: "डुबकी कढ़ी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 400 }, // yogurt
      { foodId: "usda-174288", grams: 100 }, // besan
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dubki kadhi is Chhattisgarh's kadhi with besan dumplings — dubki — poached directly in the gravy instead of fried. Whisk the yogurt with 40 g of the besan, the turmeric and 700 ml water until smooth.",
      "Bring the mixture to a boil over medium heat, stirring constantly so it does not split, then simmer 15 minutes until the raw besan smell leaves.",
      "Stir the remaining besan with the finely chopped onion, ginger, green chilli and a pinch of salt and just enough water into a thick, dropping batter.",
      "Drop small spoonfuls of the batter directly into the simmering kadhi — the dubki — and cook 8 minutes without stirring hard, until they float and are cooked through.",
      "The dumplings should be soft all the way to the centre; cut one open to check — no raw core.",
      "Temper the mustard, cumin, fenugreek, red chillies and garlic in the oil until the garlic is golden and pour over the kadhi.",
      "Scatter coriander leaves and serve with rice; dubki kadhi is gentler than its fried cousins and made for sick days and Sundays alike.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* ============================= TAMIL ============================= */
  {
    id: "dish-chettinad-lamb-style",
    name: { en: "Chettinad Lamb Curry-Style", hindi: "चेट्टिनाड मटन करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 550 }, // lamb, ground
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-170169", grams: 60 }, // coconut meat
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171323", grams: 3 }, // fennel seed
      { foodId: "usda-170931", grams: 4 }, // black pepper
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-171016", grams: 30 }, // sesame oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Chettinad cooking is built on freshly ground masala and black pepper. The classic mutton is chunks; Bloom's set carries lamb ground, so this is the minced reading of the method — stated, with the spicing untouched. Curry leaves, a signature, are not in the set and are not claimed.",
      "Dry-roast the coriander seed, fennel, cumin, black pepper, cinnamon, cardamom and cloves until dark and fragrant; grind fine.",
      "Grind the coconut to a smooth paste with a little water.",
      "Heat the sesame oil and fry the onion for 9 minutes to a deep gold; add the ginger and garlic for 1 minute.",
      "Add the tomato, turmeric, chili powder and salt; cook 6 minutes to a thick masala.",
      "Add the lamb and sear hard for 8 minutes, breaking it up, until browned and its fat renders.",
      "Stir in the ground masala and coconut paste with 200 ml hot water; simmer 15 minutes until the lamb is tender and the gravy dark and clinging. Scatter coriander and serve with rice or dosa.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-vazhakkai-varuval",
    name: { en: "Vazhakkai Varuval (Plantain Fry)", hindi: "वझक्काई वरुवल" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710818", grams: 450 }, // plantain (raw banana)
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-330458", grams: 30 }, // coconut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Peel the raw plantains — oil your hands first; the sap stains — and cut into thick rounds. Keep them in water until cooking so they do not darken.",
      "Drain and toss the rounds with the turmeric, chili powder, cayenne and salt; rest 10 minutes.",
      "Heat the coconut oil and crackle the mustard and cumin; add the crushed garlic for 30 seconds.",
      "Lay the plantain rounds in a single layer and fry over medium heat 4 minutes, without disturbing, until the undersides are crisp and golden.",
      "Turn each round and fry 3–4 minutes more, until tender all the way through — a knife should slide in without resistance.",
      "Raise the heat for the last minute to crisp the edges properly.",
      "Serve hot with rice and sambar; varuval should be crisp outside, soft and sweet inside, and eaten the moment it leaves the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kathirikai-kuzhambu",
    name: { en: "Kathirikai Kara Kuzhambu", hindi: "कत्तिरिक्काई कारा कुझम्बु" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 400 }, // eggplant
      { foodId: "usda-167763", grams: 25 }, // tamarind
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-171016", grams: 30 }, // sesame oil
      { foodId: "usda-334247", grams: 3 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Kara kuzhambu is Tamil Nadu's hot, sour tamarind curry. Soak the tamarind in 300 ml warm water for 10 minutes, squeeze and strain the juice.",
      "Quarter the eggplants lengthwise, keeping them joined at the stem if small, and soak in salted water so they do not darken.",
      "Heat the sesame oil and crackle the mustard, fenugreek and cumin; fry the onion 6 minutes to golden, then the garlic for 1 minute.",
      "Add the tomato, chili powder, ground coriander, turmeric and salt; cook 5 minutes to a thick masala.",
      "Pour in the tamarind juice and boil 5 minutes until the raw tamarind smell turns mellow and the gravy thickens slightly.",
      "Add the eggplant and simmer 10 minutes, until completely tender and silky and the oil rises at the edges.",
      "Stir in the sugar to round the sourness, rest 5 minutes, and serve over rice — kara kuzhambu is famously better the next day.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mor-kuzhambu",
    name: { en: "Mor Kuzhambu", hindi: "मोर कुझम्बु" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170069", grams: 350 }, // waxgourd
      { foodId: "usda-2259793", grams: 300 }, // yogurt
      { foodId: "usda-170169", grams: 50 }, // coconut meat
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Mor kuzhambu is Tamil Nadu's yogurt curry, pale and gentle, classically made with ash gourd — which is the set's waxgourd itself. Peel it, remove the seeds and cut into large cubes.",
      "Boil the waxgourd in salted water for 8 minutes until just tender and translucent; drain, keeping a little of the water.",
      "Grind the coconut with the green chillies, ginger, cumin and turmeric to a smooth paste.",
      "Whisk the yogurt completely smooth and stir in the coconut paste and the salt.",
      "Pour the yogurt mixture into the pan with the waxgourd and a splash of its water; heat gently, stirring, until it steams and thickens slightly — never let it boil, or it will split.",
      "Temper the mustard, fenugreek and red chillies in the coconut oil until the mustard crackles and pour over.",
      "Scatter coriander leaves and serve with rice; mor kuzhambu should be ivory, mild and soothing against a hot curry beside it.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-kuzhi-paniyaram",
    name: { en: "Kuzhi Paniyaram", hindi: "कुझी पनियारम" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 180 }, // rice flour
      { foodId: "usda-174259", grams: 60 }, // mungo beans (urad)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Paniyaram are Tamil Nadu's spherical dumplings, cooked in a dimpled pan from fermented batter. Soak the urad 3 hours, grind to a fluffy batter, and stir in the rice flour and salt with enough water for a thick pouring batter; ferment overnight until risen and faintly sour.",
      "Fold in the finely chopped onion, green chilli, ginger and coriander.",
      "Temper the mustard and cumin in a spoon of the coconut oil and stir the tempering through the batter.",
      "Heat the paniyaram pan (an appe pan or aebleskiver pan) and grease each dimple with coconut oil.",
      "Fill each dimple three-quarters full, cover, and cook on medium heat 3 minutes, until the bases are golden and the tops have set.",
      "Turn each ball with a skewer and cook 2 minutes more, until crisp and golden all over.",
      "Serve hot with coconut chutney — crisp shell, soft fermented centre, eaten by the dozen.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-meen-kuzhambu",
    name: { en: "Meen Kuzhambu (Tamil Fish Curry)", hindi: "मीन कुझम्बु" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2684442", grams: 500 }, // tilapia
      { foodId: "usda-167763", grams: 25 }, // tamarind
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-171016", grams: 30 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Meen kuzhambu is Tamil Nadu's tamarind fish curry, always better the day after it is made. Soak the tamarind in 350 ml warm water for 10 minutes, squeeze and strain.",
      "Rub the tilapia pieces with a pinch of turmeric and salt; rest 10 minutes. The fish goes in raw — kuzhambu poaches its fish, never fries it.",
      "Heat the sesame oil and crackle the mustard, fenugreek and cumin; fry the onion 6 minutes to golden, then the garlic for 1 minute.",
      "Add the tomato, chili powder, ground coriander, turmeric and salt; cook 5 minutes to a masala.",
      "Pour in the tamarind juice and boil 6 minutes, until the raw sourness mellows and the gravy thickens a little.",
      "Lower the heat, slide in the fish and green chillies, and simmer 6–7 minutes without stirring hard, until the fish is just cooked and flakes.",
      "Rest at least 20 minutes — or overnight, as every Tamil cook will tell you — and serve over rice.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-idli-podi-style",
    name: { en: "Idli Podi-Style (Gunpowder)", hindi: "इडली पोड़ी" },
    category: "chutney",
    servings: 6,
    cuisine: "india",
    lines: [
      { foodId: "usda-174259", grams: 50 }, // mungo beans (urad)
      { foodId: "usda-2644282", grams: 40 }, // chickpeas
      { foodId: "usda-170150", grams: 30 }, // sesame seeds
      { foodId: "usda-170106", grams: 10 }, // red chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171025", grams: 5 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Idli podi — gunpowder — is the dry chutney powder every Tamil table keeps. The classic grinds chana dal with the urad; chana dal is not in Bloom's verified set, so whole chickpeas are roasted and ground in its place, stated openly.",
      "Dry-roast the urad in a heavy pan, stirring, until golden and nutty; tip out.",
      "Dry-roast the chickpeas until they deepen and smell roasted; tip out with the urad.",
      "Roast the sesame until it pops; roast the red chillies in the oil until they darken and crisp.",
      "Cool everything completely — grinding warm makes a paste, not a powder.",
      "Grind everything with the garlic and salt to a coarse, gritty powder; podi should never be flour-fine.",
      "Store airtight for a month. Serve a spoonful with a pool of sesame oil beside idlis and dosas, to be mixed and scooped at the table.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ===================== ANDHRA / TELANGANA ===================== */
  {
    id: "dish-bagara-rice",
    name: { en: "Bagara Rice", hindi: "बगारा राइस" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-173475", grams: 10 }, // mint
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-170919", grams: 2 }, // cardamom
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170917", grams: 1 }, // bay leaf
      { foodId: "usda-2515374", grams: 15 }, // cashews
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Bagara rice is Hyderabad's tempered rice, the biryani's everyday sibling. Rinse the rice and soak 20 minutes; drain.",
      "Melt the ghee and bloom the cinnamon, cardamom, cloves and bay for 30 seconds.",
      "Fry the sliced onion for 8 minutes to a deep gold; add the ginger, garlic and green chillies for 1 minute.",
      "Add the rice and toss 1 minute until every grain glistens.",
      "Pour in 560 ml hot water with the salt; boil, cover, and cook on the lowest heat 12 minutes.",
      "Rest covered 10 minutes, then fluff and fold in the mint, coriander and lemon.",
      "Scatter the fried cashews and serve with mirchi ka salan or a korma — bagara should be fragrant and separate, each grain whole.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mirchi-ka-salan",
    name: { en: "Mirchi ka Salan", hindi: "मिर्ची का सालन" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170427", grams: 250 }, // green pepper
      { foodId: "usda-170497", grams: 30 }, // green chilli
      { foodId: "usda-172430", grams: 50 }, // peanuts
      { foodId: "usda-170150", grams: 25 }, // sesame seeds
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Mirchi ka salan is Hyderabad's peanut-sesame chilli curry, the biryani's inseparable partner. Slit the peppers and chillies, keeping them whole, and remove some seeds if you want heat with mercy.",
      "Dry-roast the peanuts, sesame and coconut until golden and grind to a smooth paste with a little water.",
      "Fry the onion in the oil for 9 minutes to golden; add the ginger and garlic for 1 minute.",
      "Add the ground paste, chili powder, ground coriander, turmeric and salt; fry 5 minutes, stirring, until the oil separates — the salan masala must be cooked out fully or it tastes raw.",
      "Pour in the tamarind juice and 250 ml hot water; simmer 8 minutes into a thick, flowing gravy.",
      "Crackle the mustard and cumin in a spoon of oil and add with the peppers and chillies; cover and simmer 8 minutes, until the peppers are tender but still whole and green.",
      "Rest 5 minutes and serve with bagara rice or biryani — the gravy should be nutty, sour and hot, the chillies soft enough to eat whole.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-andhra-kodi-kura",
    name: { en: "Andhra Kodi Kura (Chicken Curry)", hindi: "आंध्र कोड़ी कूरा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171330", grams: 8 }, // poppy seed
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Kodi kura is Andhra's village chicken curry — fiery, with a poppy-seed and coconut body. Soak the poppy seeds 30 minutes and grind with the coconut to a smooth paste.",
      "Marinate the chicken with the turmeric, half the chili powder and salt for 30 minutes.",
      "Fry the onion in the oil for 9 minutes to golden; add the ginger and garlic for 1 minute.",
      "Add the tomato, remaining chili powder, cayenne, ground coriander and cumin, cinnamon and cardamom; cook 6 minutes to a thick, dark masala.",
      "Add the chicken and sear 6 minutes; pour in 250 ml hot water, cover and simmer 15 minutes until tender.",
      "Stir in the poppy-coconut paste and simmer 5 minutes, until the gravy thickens and turns glossy.",
      "Scatter coriander leaves and serve with rice — Andhra heat is not a garnish; the curry should make its presence known.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-gutti-vankaya",
    name: { en: "Gutti Vankaya Kura", hindi: "गुट्टी वंकाया कूरा" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 450 }, // eggplant
      { foodId: "usda-172430", grams: 50 }, // peanuts
      { foodId: "usda-170150", grams: 25 }, // sesame seeds
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Gutti vankaya is Andhra's stuffed baby eggplant in a peanut-sesame gravy. Slit each small eggplant into quarters from the base, keeping the stem joined, and soak in salted water.",
      "Dry-roast the peanuts, sesame and coconut until golden and grind with the ginger, garlic, chili powder, ground coriander, cumin, turmeric and salt into a crumbly stuffing.",
      "Pack the stuffing deep into the slits of each eggplant, reserving any that spills — it belongs in the gravy.",
      "Fry the onion in the oil for 7 minutes to golden; lay the stuffed eggplants in a single layer.",
      "Add the tamarind juice, any reserved stuffing and 150 ml hot water; crackle the mustard seeds in a spoon of oil and add.",
      "Cover and cook on low heat 18–20 minutes, turning once, until the eggplants are completely tender and the gravy is thick and nutty.",
      "Serve with rice — the eggplants should slump, saturated with the masala, stems still holding them together.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pesarattu",
    name: { en: "Pesarattu", hindi: "पेसरट्टु" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 250 }, // mung beans (whole green moong)
      { foodId: "usda-169714", grams: 30 }, // rice flour
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-790646", grams: 80 }, // onion, for the topping
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pesarattu is Andhra's green moong crepe, ground from whole soaked moong — no fermentation, which is its difference from a dosa. Soak the moong 6 hours or overnight.",
      "Grind the moong with the ginger, green chillies and cumin and a little water to a smooth, pourable batter; stir in the rice flour and salt. The batter is used fresh, never fermented.",
      "Rest the batter 15 minutes; it should ribbon off the ladle.",
      "Heat a cast-iron tawa until very hot and grease it lightly; pour a ladle of batter and spread it in a spiral into a thin crepe.",
      "Scatter finely chopped onion over the wet surface and drizzle oil around the edges.",
      "Cook 2 minutes until the base is golden and crisp and the top has set; pesarattu are not flipped — fold in half.",
      "Serve at once with ginger chutney or upma, as it is eaten in Andhra — green, crisp and protein-rich before the day begins.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-royyala-vepudu",
    name: { en: "Royyala Vepudu (Andhra Prawn Fry)", hindi: "रोय्याला वेपुडु" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175179", grams: 450 }, // shrimp
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-167746", grams: 12 }, // lemon
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Vepudu means a dry fry, and royyala vepudu is Andhra's prawn version — no gravy, all masala clinging to the prawns. Marinate the prawns with the turmeric, half the chili powder and salt for 15 minutes.",
      "Heat the oil and fry the sliced onion for 9 minutes until deep golden and crisp at the edges.",
      "Add the ginger, garlic and green chillies and fry 1 minute.",
      "Add the remaining chili powder, ground coriander and cumin and fry 30 seconds — the masala should darken, not burn.",
      "Add the prawns in a single layer and cook on high heat 3–4 minutes, tossing, until they curl, turn opaque and take the masala onto every surface.",
      "The pan should end nearly dry, the prawns glossed with spice and onion.",
      "Finish with lemon and coriander leaves and serve with rice — a vepudu is eaten as the hot, dry counterpoint to a wet curry.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-haleem-style",
    name: { en: "Haleem-Style (Lamb and Grain Porridge)", hindi: "हलीम" },
    category: "main",
    servings: 6,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 400 }, // lamb, ground
      { foodId: "usda-170284", grams: 80 }, // barley
      { foodId: "usda-168893", grams: 40 }, // whole wheat flour
      { foodId: "usda-174284", grams: 50 }, // red lentils (masoor)
      { foodId: "usda-174256", grams: 40 }, // mung beans
      { foodId: "usda-172436", grams: 40 }, // pigeon peas (toor dal)
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-2259793", grams: 100 }, // yogurt
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171314", grams: 35 }, // ghee
      { foodId: "usda-167746", grams: 15 }, // lemon
      { foodId: "usda-173475", grams: 8 }, // mint
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Hyderabadi haleem pounds meat, wheat and dals into one silky porridge. The classic grain is broken wheat, which is not in Bloom's verified set; barley and a little whole wheat flour carry the body here, and the set's ground lamb stands in for the pounded meat — both stated.",
      "Soak the barley and dals together for 2 hours; pressure-cook in 1 litre water for 5 whistles until completely soft, then whisk to a coarse purée.",
      "Fry the onion in half the ghee for 12 minutes to a deep brown; lift out half for the garnish.",
      "Add the ginger and garlic to the pan for 1 minute, then the lamb; sear hard 10 minutes, breaking it up, until browned.",
      "Add the yogurt, chili powder, turmeric, ground coriander, cumin, cardamom, cinnamon and salt; cook 8 minutes.",
      "Pour in the grain-and-dal purée and simmer on the lowest heat 30 minutes, stirring and mashing constantly, until the haleem turns gluey, glossy and pulls from the spoon in ribbons — this pounding simmer is the dish.",
      "Serve in bowls with the remaining ghee melted over, the fried onions, mint and lemon — haleem should be eaten with a spoon, slowly.",
    ],
    timeMinutes: 120,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-khatti-dal",
    name: { en: "Khatti Dal (Hyderabadi)", hindi: "खट्टी दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172436", grams: 200 }, // pigeon peas (toor dal)
      { foodId: "usda-167763", grams: 25 }, // tamarind
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Khatti dal is Hyderabad's sour toor dal, the everyday partner of bagara rice. Pressure-cook the dal with the turmeric and 600 ml water for 4 whistles until soft; whisk smooth.",
      "Soak the tamarind in 150 ml warm water for 10 minutes, squeeze and strain the juice.",
      "Add the tomato, green chillies and salt to the dal and simmer 8 minutes until the tomato melts in.",
      "Pour in the tamarind juice and simmer 3 minutes — the dal should be boldly, refreshingly sour.",
      "Temper the mustard, cumin, red chillies and garlic in the oil until the garlic turns golden and pour over the dal.",
      "Scatter coriander leaves and rest 2 minutes.",
      "Serve over bagara rice or plain rice; khatti dal is thin, hot and sour, and meant to be poured generously.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-chepala-pulusu",
    name: { en: "Chepala Pulusu (Fish Tamarind Curry)", hindi: "चेपाला पुलुसु" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175119", grams: 500 }, // mackerel
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-171324", grams: 1 }, // fenugreek seed
      { foodId: "usda-171016", grams: 30 }, // sesame oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pulusu is Andhra's tamarind gravy, and chepala pulusu its fish curry — always cooked a day ahead in Andhra homes. Soak the tamarind in 350 ml warm water for 10 minutes, squeeze and strain.",
      "Rub the mackerel pieces with a pinch of turmeric and salt; rest 10 minutes.",
      "Heat the sesame oil and crackle the mustard, fenugreek and cumin; fry the onion 8 minutes to golden, then the ginger and garlic for 1 minute.",
      "Add the tomato, chili powder, ground coriander, turmeric and salt; cook 5 minutes to a masala.",
      "Pour in the tamarind juice and boil 7 minutes, until the raw tamarind edge mellows and the gravy thickens slightly.",
      "Slide in the fish and simmer 7 minutes, shaking the pan rather than stirring, until the fish is cooked and flakes.",
      "Rest — overnight if you can, as Andhra insists — and serve over rice, the fish soaked through with the sour, hot gravy.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* =========================== KARNATAKA =========================== */
  {
    id: "dish-bisi-bele-bath",
    name: { en: "Bisi Bele Bath", hindi: "बिसी बेले भात" },
    category: "rice",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 250 }, // white rice
      { foodId: "usda-172436", grams: 120 }, // pigeon peas (toor dal)
      { foodId: "usda-2346401", grams: 100 }, // potato
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-2346400", grams: 80 }, // green beans
      { foodId: "usda-170419", grams: 60 }, // green peas
      { foodId: "usda-2685577", grams: 80 }, // eggplant
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-2515374", grams: 15 }, // cashews
      { foodId: "usda-171314", grams: 25 }, // ghee
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Bisi bele bath — 'hot lentil rice' — is Karnataka's great one-pot. Its spice powder is a family recipe; this one is built from the set's whole spices, roasted and ground, and stated as such.",
      "Roast the coriander seed, cumin, cinnamon, cloves and cardamom dry until fragrant and grind with the chili powder and coconut — the bath powder.",
      "Pressure-cook the toor dal with the turmeric and 500 ml water for 4 whistles until soft.",
      "Cook the rice separately until just tender; keep it hot.",
      "Boil the vegetables in the tamarind water with the salt for 8 minutes, until tender; add the tomato for the last 2 minutes.",
      "Combine the rice, dal and vegetables in one pot with the ground powder; simmer 8 minutes, stirring, until it becomes a thick, flowing porridge — bisi bele bath is always served loose, never dry.",
      "Temper the mustard and cashews in the ghee until the cashews are gold and pour over. Serve in bowls with extra ghee — the name promises it hot, and it should arrive steaming.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-neer-dosa",
    name: { en: "Neer Dosa", hindi: "नीर डोसा" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 250 }, // rice flour
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-330458", grams: 10 }, // coconut oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Neer dosa — 'water dosa' — is Mangalore's lacy rice crepe, its batter thin as milk. Whisk the rice flour with the finely grated coconut and salt.",
      "Whisk in about 600 ml water to a batter the consistency of thin milk; it should pour off the ladle in a stream. Rest 15 minutes.",
      "Stir the batter before every dosa — the flour settles to the bottom between pours.",
      "Heat a cast-iron tawa until very hot and wipe it with a film of coconut oil.",
      "Pour a ladle of batter from a height, swirling the pan so the batter coats it in a thin, lacy sheet with holes — do not spread it with the ladle as for a dosa.",
      "Cover and cook 1–2 minutes until the edges lift and the surface is set and white; neer dosa are never flipped and never browned.",
      "Fold into quarters and serve soft and steaming with chicken curry or chutney — they should be white, lacy and supple as cloth.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-kori-rotti-style",
    name: { en: "Kori Rotti-Style Chicken Curry", hindi: "कोरी रोट्टी चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-170169", grams: 40 }, // coconut meat, for the roasted paste
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171319", grams: 5 }, // chili powder
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-330458", grams: 25 }, // coconut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Kori rotti is Mangalore's chicken curry served over crisp rice wafers that soften in the gravy. The wafers themselves are a specialist's art and are not in Bloom's set, so this is the curry in full, named -Style, to serve over rice — the curry is the dish's soul and nothing in it is substituted.",
      "Dry-roast the coriander seed, cumin, cinnamon, cloves and the coconut meat until deep golden; grind to a paste with the garlic, ginger and a little water.",
      "Fry the onion in the coconut oil for 9 minutes to golden.",
      "Add the chili powder, turmeric and salt and fry 30 seconds; add the chicken and sear 6 minutes.",
      "Stir in the roasted paste with 200 ml hot water and the tamarind juice; cover and simmer 15 minutes until the chicken is tender.",
      "Pour in the coconut milk and simmer at the gentlest bubble for 4 minutes, until the gravy is rich and just thickened — never boil coconut milk hard.",
      "Rest 5 minutes and serve over rice, spooning the red, coconut-rich gravy generously over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-chicken-ghee-roast-style",
    name: { en: "Chicken Ghee Roast-Style", hindi: "चिकन घी रोस्ट" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2259793", grams: 80 }, // yogurt
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-167746", grams: 10 }, // lemon
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-171314", grams: 45 }, // ghee
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Mangalore's ghee roast is chicken burnished in a dry, fiery masala and an extravagant amount of ghee. The classic roasts whole Byadagi chillies into the paste; Bloom's set carries chili powder and cayenne, which carry the heat here — the ghee, the method and the burnish are the dish's own.",
      "Marinate the chicken with the yogurt, turmeric, lemon and salt for 1 hour.",
      "Grind the garlic and ginger with the chili powder, cayenne, tamarind and sugar into a thick paste with a spoon of water.",
      "Melt half the ghee in a heavy pan and sear the chicken pieces for 6 minutes until they take colour; lift out.",
      "Add the remaining ghee and fry the paste for 4 minutes, stirring, until it darkens to brick red and the ghee separates, fragrant and fierce.",
      "Return the chicken with any juices and roast on medium heat for 12–15 minutes, turning and basting, until the masala clings dry and glossy and the chicken is tender.",
      "Scatter coriander leaves and serve with neer dosa or rice — the chicken should gleam with ghee and taste of chilli first and everything else after.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-rava-idli",
    name: { en: "Rava Idli", hindi: "रवा इडली" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168933", grams: 250 }, // semolina (rava)
      { foodId: "usda-2259793", grams: 250 }, // yogurt
      { foodId: "usda-2258586", grams: 50 }, // carrot
      { foodId: "usda-170419", grams: 40 }, // green peas
      { foodId: "usda-2515374", grams: 15 }, // cashews
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rava idli is Bengaluru's instant idli, born — the story goes — in the MTR kitchens when rice was scarce. Dry-roast the semolina for 4 minutes until it smells nutty; cool.",
      "Temper the mustard and cumin in the oil; add the ginger, green chilli and cashews and fry until the cashews are gold.",
      "Stir the tempering, grated carrot, peas and coriander through the semolina.",
      "Whisk in the yogurt and enough water for a thick, pouring batter; season with salt and rest 20 minutes — the semolina will drink the liquid and thicken.",
      "The batter should drop heavily from a spoon; loosen with a spoon of water if it stands in a mound.",
      "Pour into greased idli moulds and steam 10–12 minutes, until a skewer comes out clean and the idlis are risen and spongy.",
      "Rest 2 minutes, unmould, and serve hot with chutney and sambar — rava idli are softer and more golden than their rice cousins.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-jolada-rotti",
    name: { en: "Jolada Rotti (Sorghum Flatbread)", hindi: "जोलादा रोट्टी" },
    category: "bread",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710842", grams: 250 }, // sorghum (jowar)
      { foodId: "usda-171025", grams: 5 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Jolada rotti is North Karnataka's sorghum flatbread, the centre of the khanavali meal. Bloom's verified set carries sorghum as a whole grain, so grind it dry to a flour first — stated in the open, as with every grain flour in this wave.",
      "Stir the sorghum flour with the salt and pour in about 200 ml boiling water, mixing with a spoon into a shaggy dough.",
      "When cool enough to handle, knead for 5 minutes until smooth and pliable — hot-water dough is the whole technique of a gluten-free rotti.",
      "Divide into 6 balls. Pat each out on a damp cloth or parchment, wetting your fingers, into a thin 15 cm disc — rotti are patted, never rolled.",
      "Invert the cloth onto a hot tawa, peel the cloth away, and cook 1 minute until the surface dries.",
      "Wet the top lightly, flip, and cook 1 minute more; then hold it over a direct flame for a few seconds to puff and blister.",
      "Brush with a drop of oil and serve at once with ennegai — jolada rotti go leathery as they cool, so they are made to order, one by one.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-ennegai",
    name: { en: "Ennegai (Stuffed Eggplant)", hindi: "एण्णेगाई" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 450 }, // eggplant
      { foodId: "usda-172430", grams: 45 }, // peanuts
      { foodId: "usda-170150", grams: 20 }, // sesame seeds
      { foodId: "usda-170169", grams: 50 }, // coconut meat
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-171319", grams: 3 }, // chili powder
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170922", grams: 3 }, // coriander seed
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Ennegai is North Karnataka's stuffed eggplant, the obligatory partner of jolada rotti. Slit each small eggplant into quarters from the base, keeping the stem joined, and soak in salted water.",
      "Dry-roast the peanuts, sesame and coconut until golden and grind with the chili powder, ground coriander, cumin, turmeric, sugar and salt into a crumbly stuffing.",
      "Pack the stuffing deep into the slits of each eggplant; reserve the excess for the gravy.",
      "Fry the onion in the oil for 7 minutes to golden; crackle the mustard seeds.",
      "Lay the stuffed eggplants in a single layer, add the tamarind juice, the reserved stuffing and 120 ml hot water.",
      "Cover and cook on low heat 18–20 minutes, turning once, until the eggplants are completely tender and the gravy is thick, dark and nutty.",
      "Scatter coriander leaves and serve with jolada rotti — the eggplants should collapse at a touch, saturated with the masala.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-akki-rotti",
    name: { en: "Akki Rotti", hindi: "अक्की रोट्टी" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 250 }, // rice flour
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-2258586", grams: 60 }, // carrot
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-170923", grams: 2 }, // cumin seed
      { foodId: "usda-170169", grams: 30 }, // coconut meat
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Akki rotti is Karnataka's rice-flour breakfast flatbread, patted by hand and crisped on the tawa. Stir the rice flour with the salt and cumin.",
      "Knead in the finely chopped onion, grated carrot, green chilli, ginger, coriander and coconut with warm water, a little at a time, into a soft, pliable dough; rest 10 minutes.",
      "Divide into 6 balls. Pat each out on a greased parchment or banana-leaf substitute into a 14 cm disc, wetting your fingers — akki rotti are never rolled.",
      "Invert the parchment onto a hot, oiled tawa and peel it away.",
      "Drizzle oil around the edges and cook 2–3 minutes until the base is crisp and golden in spots.",
      "Flip and cook 1 minute more; the rotti should be crisp at the rim and supple in the middle.",
      "Serve hot with chutney or pickle — in Bengaluru homes akki rotti is breakfast, made one at a time and eaten as it lands.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pineapple-gojju",
    name: { en: "Pineapple Gojju", hindi: "अनानास गोज्जु" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169124", grams: 350 }, // pineapple
      { foodId: "usda-170150", grams: 15 }, // sesame seeds
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170923", grams: 1 }, // cumin seed
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Gojju is Karnataka's sweet-sour-hot curry, and pineapple is its most loved fruit. Cut the pineapple into bite-size pieces, keeping every drop of juice.",
      "Dry-roast the sesame and coconut until golden and grind with the red chillies to a coarse paste.",
      "Heat the oil and crackle the mustard and cumin.",
      "Add the pineapple with its juice, the tamarind juice, sugar, turmeric and salt; simmer 6 minutes until the fruit softens at the edges and the gravy turns syrupy.",
      "Stir in the sesame-coconut paste and simmer 3 minutes more, until the gojju is thick, glossy and amber.",
      "Taste and balance — it should be sweet first, then sour, then hot, all in one spoon.",
      "Serve with rice as the bright course in a Karnataka meal; gojju keeps two days and deepens.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
];
