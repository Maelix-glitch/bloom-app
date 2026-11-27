/**
 * Protein Wave A (2026-11-26, owner directive: three waves adding
 * 200+ healthy, protein-rich or balanced dishes; this is wave one,
 * ~70 dishes). Two shelves, one file:
 *
 * PROTEIN_WAVE_A_DISHES — protein-rich mains and breakfasts. Every
 * dish computes to at least 25 g of protein per serving through
 * `dishNutrients`, pinned by dishLibraryProteinWaveA.test.ts, which
 * computes rather than asserts — the standing protein-wave bar
 * (PW-1..PW-4). These dishes join PROTEIN_WAVE_DISH_IDS where the
 * library is assembled.
 *
 * BALANCED_WAVE_A_DISHES — balanced plates: a real protein anchor,
 * vegetables and a grain or base on one plate, honestly portioned.
 * They compute below the 25 g bar and do NOT join the protein-wave
 * set; the wave test pins their shape (anchor + vegetable + base,
 * at least 12 g of protein a serving) instead of the bar.
 *
 * Composed only from the verified reference set (all 168 foods,
 * every source — the M-230 foods and the CoFID paneer included; no
 * new foods, no invented nutrients). Beef and pork appear where a
 * classic is built on them, per the owner's 2026-11-26 decision,
 * costed from the set's ground beef, ground pork and pork loin.
 * Paneer dishes cost the CoFID paneer record (cofid-12-495)
 * directly — the food is in the set now, so the old cottage-cheese
 * stand-in is not used for paneer here. No dish duplicates an
 * existing library dish by name or by recipe (checked against the
 * whole library, normalised — see the wave test).
 */

import type { Dish } from "../dishes";

export const PROTEIN_WAVE_A_DISHES: readonly Dish[] = [
  /* --------------------- international protein mains --------------------- */
  {
    id: "dish-pwa-peri-peri-chicken",
    name: { en: "Peri-Peri Grilled Chicken", hindi: "पेरी-पेरी ग्रिल्ड चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 640 }, // chicken breast
      { foodId: "usda-170108", grams: 240 }, // red peppers
      { foodId: "usda-1104647", grams: 24 }, // garlic
      { foodId: "usda-170106", grams: 12 }, // red chilli
      { foodId: "usda-167746", grams: 120 }, // lemon
      { foodId: "usda-171413", grams: 28 }, // olive oil
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the red peppers, garlic, chilli, lemon juice, olive oil and salt into the peri-peri marinade.",
      "Slash the chicken breasts twice across the thick end and coat them in half the marinade for 20 minutes.",
      "Heat a heavy ridged griddle until smoking and grill the chicken for about 6 minutes a side, until charred at the edges and cooked through.",
      "Soften the sliced onion in the griddle's juices for 3 minutes.",
      "Rest the chicken 5 minutes, slice it thickly and spoon the warm onion and the reserved marinade over.",
      "Serve at once, the marinade is the sauce, so nothing is wasted.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chicken-shawarma-plate",
    name: { en: "Chicken Shawarma Plate", hindi: "चिकन शावरमा प्लेट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt, for the marinade and sauce
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-170924", grams: 6 }, // curry powder, standing in for the shawarma spice blend
      { foodId: "usda-168936", grams: 160 }, // white flour, for the flatbreads
      { foodId: "usda-170457", grams: 240 }, // tomatoes, served raw
      { foodId: "usda-2346406", grams: 200 }, // cucumber, served raw
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Stir half the yogurt with the crushed garlic, cumin, curry powder and salt and coat the chicken thighs for 30 minutes.",
      "Knead the flour with warm water and a pinch of the salt into a soft dough, rest it, then roll and dry-toast four flatbreads.",
      "Grill the chicken on a heavy ridged griddle for about 7 minutes a side, until charred at the edges and cooked through.",
      "Rest 5 minutes, then slice the chicken into ribbons against the grain.",
      "Stir the remaining yogurt with a little water and salt into the garlic sauce.",
      "Serve the chicken over the flatbreads with the tomatoes, cucumber and garlic sauce spooned over.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-turkey-meatballs-marinara",
    name: { en: "Turkey and Oat Meatballs, Tomato Sauce", hindi: "टर्की ओट मीटबॉल टमाटर सॉस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-171287", grams: 100 }, // egg, as binder
      { foodId: "usda-325036", grams: 40 }, // parmesan, grated
      { foodId: "usda-170457", grams: 560 }, // tomatoes
      { foodId: "usda-1104647", grams: 18 }, // garlic
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Mix the turkey with the beaten egg, half the parmesan, salt and pepper and rest the mixture 10 minutes.",
      "Soften the onion and garlic in the olive oil for 5 minutes, add the chopped tomatoes and simmer into a sauce for 15 minutes.",
      "Roll the turkey mixture into 12 meatballs with wet hands.",
      "Brown the meatballs in a dry non-stick pan for 6 minutes, turning them.",
      "Slide the meatballs into the tomato sauce, cover and simmer gently for 15 minutes, until cooked through.",
      "Scatter the remaining parmesan over and serve with the sauce spooned generously over.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-beef-kofta",
    name: { en: "Beef Kofta Skewers", hindi: "बीफ़ कोफ़्ता" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 640 }, // ground beef
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-170922", grams: 4 }, // coriander seed, ground in the method
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171025", grams: 14 }, // sunflower oil, for the griddle
    ],
    method: [
      "Grate the onion, squeeze it dry and mix it into the beef with the chopped coriander leaves, cumin, ground coriander seed, chilli and salt.",
      "Knead the mixture for 2 minutes until it turns sticky, then rest it 15 minutes.",
      "With wet hands, mould the mixture around skewers into long kofta, or shape them as thick fingers.",
      "Brush a heavy ridged griddle with the sunflower oil and heat it until it shimmers.",
      "Grill the kofta for about 10 minutes, turning them a quarter at a time, until browned all around and cooked through.",
      "Rest 3 minutes and serve straight from the skewers.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-pork-medallions",
    name: { en: "Pork Loin Medallions with Mustard Crust", hindi: "पोर्क मेडैलियन सरसों क्रस्ट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin
      { foodId: "usda-170929", grams: 16 }, // mustard seed, crushed in the method
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171688", grams: 200 }, // apple, for the pan sauce
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Slice the pork loin into 8 medallions and season them with the salt and pepper.",
      "Crush the mustard seeds with the garlic into a coarse paste and press it over the medallions.",
      "Sear the medallions in a dry heavy pan for 4 minutes a side, until golden and just cooked through, then rest them.",
      "Melt the butter in the same pan and soften the sliced apple for 4 minutes in the pork juices.",
      "Add a splash of water and scrape the pan into a quick apple pan sauce.",
      "Serve the medallions with the apple sauce spooned over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-ginger-salmon",
    name: { en: "Ginger-Glazed Salmon with Green Beans", hindi: "अदरक ग्लेज़्ड सैल्मन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 640 }, // salmon
      { foodId: "usda-169231", grams: 30 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169640", grams: 24 }, // honey, for the glaze
      { foodId: "usda-173469", grams: 30 }, // cider vinegar, for the glaze
      { foodId: "usda-2346400", grams: 400 }, // green beans
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Stir the grated ginger and garlic with the honey, vinegar and salt into the glaze and coat the salmon for 15 minutes.",
      "Steam the green beans over boiling water for 5 minutes until just tender, then toss them in the sesame oil.",
      "Lift the salmon from the glaze and sear it skin-side down in a hot dry pan for 5 minutes.",
      "Turn the salmon, pour in the reserved glaze and cook 2 minutes more, until the glaze turns sticky and the fish flakes.",
      "Serve the salmon over the green beans with the pan glaze spooned over.",
      "Rest 2 minutes before serving so the glaze settles.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-garlic-shrimp",
    name: { en: "Garlic Shrimp with Peppers (Gambas-Style)", hindi: "लहसुन झींगा शिमला मिर्च" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 600 }, // shrimp
      { foodId: "usda-1104647", grams: 30 }, // garlic
      { foodId: "usda-170108", grams: 240 }, // red peppers
      { foodId: "usda-170106", grams: 8 }, // red chilli
      { foodId: "usda-171413", grams: 42 }, // olive oil
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pat the shrimp dry and season them with the salt.",
      "Warm the olive oil with the sliced garlic and chilli on the lowest heat for 3 minutes, until the garlic is golden but not brown.",
      "Add the sliced peppers and soften them in the garlic oil for 5 minutes.",
      "Raise the heat, add the shrimp and toss them for 3 to 4 minutes, until they curl and turn pink.",
      "Squeeze the lemon over, toss once more and take the pan straight off the heat.",
      "Serve in the pan's oil with the peppers, the shrimp are the dish and the oil is its sauce.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-sardine-tomato-stew",
    name: { en: "Sardines in Tomato and Onion Stew", hindi: "सार्डिन टमाटर प्याज़ स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175139", grams: 480 }, // sardines (canned, drained)
      { foodId: "usda-170457", grams: 480 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-170932", grams: 2 }, // cayenne pepper
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soften the sliced onion in the olive oil for 6 minutes until sweet.",
      "Add the garlic and cayenne for 1 minute, then the chopped tomatoes and salt.",
      "Simmer the tomatoes into a thick stew for 12 minutes.",
      "Lay the sardines over the stew, cover and warm them through gently for 5 minutes, without stirring, so they hold together.",
      "Rest 2 minutes and serve the sardines with the tomato stew spooned around them.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-cod-parmesan",
    name: { en: "Parmesan-Crusted Cod", hindi: "परमेसन क्रस्टेड कॉड" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 700 }, // cod
      { foodId: "usda-325036", grams: 50 }, // parmesan, grated
      { foodId: "usda-168936", grams: 40 }, // white flour, for the crust crumb
      { foodId: "usda-171287", grams: 50 }, // egg, beaten for the crust
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Heat the oven to 200°C and butter a baking tray.",
      "Mix the parmesan with the flour, salt and pepper on a plate.",
      "Dip each cod fillet in the beaten egg, then press it into the parmesan crumb until coated.",
      "Lay the fillets on the tray and bake for 12 to 14 minutes, until the crust is golden and the fish flakes.",
      "Squeeze the lemon over and serve at once, the crust stays crisp for minutes, not hours.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pwa-mackerel-escabeche-style",
    name: { en: "Mackerel Escabeche-Style", hindi: "मैकेरल एस्काबेचे-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 600 }, // mackerel
      { foodId: "usda-173469", grams: 120 }, // cider vinegar, for the marinade
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-171413", grams: 28 }, // olive oil
      { foodId: "usda-168936", grams: 30 }, // white flour, for dusting
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dust the mackerel fillets in the flour and salt and fry them in half the olive oil for 4 minutes a side, until crisp.",
      "Soften the sliced onion, carrot and garlic in the remaining oil for 6 minutes.",
      "Add the vinegar, bay leaf and 100 ml of water and simmer the marinade for 5 minutes.",
      "Pour the hot marinade over the fish in a shallow dish and leave it at least 30 minutes, the escabeche rest is the dish.",
      "Serve at room temperature with the pickled vegetables spooned over the fish.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-lamb-seekh-kebab",
    name: { en: "Lamb Seekh Kebab", hindi: "मटन सीख कबाब" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 700 }, // ground lamb
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-170497", grams: 12 }, // green chilli
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Grate the onion, squeeze it dry and mix it into the lamb with the grated ginger, chopped chilli and coriander leaves, cumin, chilli powder and salt.",
      "Knead for 2 minutes until the mixture turns sticky, then chill it for 20 minutes so it holds the skewers.",
      "With wet hands, mould the mixture around skewers into long seekh shapes.",
      "Grill on a heavy ridged griddle for about 10 minutes, turning them a quarter at a time, until charred at the edges and cooked through.",
      "Rest 3 minutes and slide the kebabs off the skewers to serve.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pwa-turkey-chilli",
    name: { en: "Turkey and Kidney Bean Chilli", hindi: "टर्की राजमा चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 500 }, // ground turkey
      { foodId: "usda-175193", grams: 240 }, // kidney beans, dry
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, then boil them in fresh water for about 45 minutes until tender and drain them.",
      "Brown the turkey in the sunflower oil for 6 minutes, breaking it into crumbles.",
      "Add the onion and garlic and soften for 5 minutes, then the chilli powder and cumin for 1 minute.",
      "Add the chopped tomatoes and salt and simmer for 10 minutes.",
      "Stir in the beans with a ladle of their cooking water and simmer 10 minutes more, until the chilli is thick.",
      "Rest 5 minutes and serve, chilli always tastes better for the rest.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-beef-black-bean-chilli",
    name: { en: "Beef and Black Bean Chilli", hindi: "बीफ़ काला राजमा चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 500 }, // ground beef
      { foodId: "usda-173734", grams: 240 }, // black beans, dry
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chilli powder
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then boil them in fresh water for about 40 minutes until tender and drain them.",
      "Brown the beef in the sunflower oil for 6 minutes, breaking it into crumbles.",
      "Add the onion, peppers and garlic and soften for 5 minutes, then the chilli powder and cumin for 1 minute.",
      "Add the chopped tomatoes and salt and simmer for 10 minutes.",
      "Stir in the beans with a ladle of their cooking water and simmer 10 minutes more, until thick.",
      "Rest 5 minutes and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chicken-lentil-curry",
    name: { en: "Chicken and Red Lentil Curry", hindi: "चिकन मसूर दाल करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 400 }, // chicken breast
      { foodId: "usda-174284", grams: 240 }, // red lentils, dry
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the sunflower oil for 6 minutes, then add the ginger, garlic and curry powder for 1 minute.",
      "Add the chopped tomatoes and cook into a masala for 6 minutes.",
      "Stir in the rinsed lentils with 700 ml of water, cover and simmer for 15 minutes.",
      "Add the chicken, cut into chunks, and simmer 10 minutes more, until the chicken is cooked through and the lentils have thickened the curry.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-tuna-patties",
    name: { en: "Tuna and Potato Patties", hindi: "टूना आलू पैटी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 560 }, // tuna, canned in water, drained
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-171287", grams: 100 }, // egg, as binder
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-169997", grams: 16 }, // coriander leaves
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171025", grams: 28 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the potatoes in their skins for about 20 minutes until tender, drain, peel and mash them roughly.",
      "Flake the tuna into the mash with the finely chopped onion, coriander leaves, salt and pepper.",
      "Mix in the beaten egg and rest the mixture 10 minutes.",
      "Shape 8 patties with wet hands.",
      "Fry the patties in the sunflower oil for 4 minutes a side, until crisp and golden.",
      "Drain on a rack for 2 minutes and serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chicken-katsu-style",
    name: { en: "Chicken Katsu-Style", hindi: "चिकन कात्सु-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-171287", grams: 100 }, // egg, for the crumb
      { foodId: "usda-168936", grams: 80 }, // white flour, for the crumb
      { foodId: "usda-2346407", grams: 320 }, // cabbage, shredded to serve
      { foodId: "usda-171025", grams: 42 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Butterfly the chicken breasts and beat them between sheets to an even 1.5 cm, then season with the salt and pepper.",
      "Coat each piece in flour, then beaten egg, then flour again. The verified set carries no panko, so a double flour crumb stands in and the dish is named for it.",
      "Fry the chicken in the sunflower oil for 4 to 5 minutes a side, until deep golden and cooked through.",
      "Rest on a rack for 3 minutes so the crumb stays crisp.",
      "Slice across the grain and serve over the shredded cabbage.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chicken-fajita-plate",
    name: { en: "Chicken Fajita Plate", hindi: "चिकन फहीता प्लेट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-170108", grams: 240 }, // red peppers
      { foodId: "usda-170427", grams: 160 }, // green peppers
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-168936", grams: 200 }, // white flour, for the tortillas
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a dough, rest it, then roll and dry-toast 8 tortillas.",
      "Slice the chicken into strips and toss it with the chilli powder, cumin and salt.",
      "Sear the chicken in the sunflower oil over high heat for 6 minutes, until charred at the edges and cooked through, then lift it out.",
      "Sear the peppers and onion in the same pan for 5 minutes, keeping their bite.",
      "Return the chicken, squeeze the lemon over and toss everything together.",
      "Serve sizzling with the warm tortillas for wrapping.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-shrimp-quinoa-fry",
    name: { en: "Shrimp and Quinoa Stir-Fry", hindi: "झींगा क्विनोआ स्टर-फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 480 }, // shrimp
      { foodId: "usda-168874", grams: 240 }, // quinoa, dry
      { foodId: "usda-171287", grams: 100 }, // egg, scrambled through
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the quinoa and simmer it in 480 ml of water for 15 minutes, then fork it loose and let it steam dry.",
      "Scramble the eggs in half the sesame oil into soft ribbons and lift them out.",
      "Sear the shrimp in the remaining oil with the garlic and ginger for 3 minutes, until pink.",
      "Add the diced carrot and peas and stir-fry for 3 minutes.",
      "Add the quinoa and toss over high heat for 3 minutes, until the grains toast at the edges.",
      "Fold the egg ribbons back in, season with the salt and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ----------------- vegetarian and eggetarian protein mains ----------------- */
  {
    id: "dish-pwa-paneer-makhani",
    name: { en: "Paneer Makhani", hindi: "पनीर मक्खनी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 480 }, // paneer
      { foodId: "usda-170457", grams: 480 }, // tomatoes
      { foodId: "usda-2515374", grams: 60 }, // cashew nuts, for the makhani body
      { foodId: "usda-173410", grams: 28 }, // butter
      { foodId: "usda-171314", grams: 14 }, // ghee
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170919", grams: 3 }, // cardamom
      { foodId: "usda-171319", grams: 4 }, // chilli powder
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the tomatoes with the cashews, ginger and garlic in 200 ml of water for 12 minutes, then blend them smooth.",
      "Melt the butter and ghee together and bloom the cardamom and chilli powder for 30 seconds.",
      "Pour in the tomato blend and cook the makhani sauce for 8 minutes, until the fat gloss appears at the edges.",
      "Cut the paneer into large cubes and warm them through the sauce for 4 minutes, the paneer is costed from the CoFID record in the set, not a stand-in.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwa-chana-paneer",
    name: { en: "Chickpea and Paneer Curry", hindi: "चना पनीर करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 280 }, // chickpeas, dry
      { foodId: "cofid-12-495", grams: 240 }, // paneer
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them in fresh water for about 50 minutes until tender and drain them, keeping a ladle of the water.",
      "Soften the onion in the sunflower oil for 6 minutes, then add the ginger, garlic and curry powder for 1 minute.",
      "Add the chopped tomatoes and cook into a masala for 6 minutes.",
      "Stir in the chickpeas with their ladle of water and simmer for 10 minutes.",
      "Fold in the paneer cubes and warm them through for 4 minutes.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-soybean-keema",
    name: { en: "Soybean Keema with Peas", hindi: "सोयाबीन कीमा मटर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 320 }, // soybeans, dry
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the soybeans overnight, then boil them for about 50 minutes until tender and drain them.",
      "Pulse the soybeans in a grinder to a coarse keema crumble, never a paste.",
      "Soften the onion in the sunflower oil for 6 minutes, then add the ginger, garlic and curry powder for 1 minute.",
      "Add the chopped tomatoes and cook into a masala for 6 minutes.",
      "Stir in the soybean keema and peas with 150 ml of water and simmer for 10 minutes, until the keema drinks the masala.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwa-tempeh-pepper-fry",
    name: { en: "Tempeh and Pepper Stir-Fry", hindi: "टेम्पेह शिमला मिर्च फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 560 }, // tempeh
      { foodId: "usda-170108", grams: 240 }, // red peppers
      { foodId: "usda-170427", grams: 160 }, // green peppers
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, for the tang the set's sauces would give
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the tempeh into fingers and steam them for 10 minutes, which firms them and takes off the raw edge.",
      "Sear the tempeh in the sesame oil for 6 minutes, until golden on all sides.",
      "Add the peppers and onion and stir-fry for 4 minutes, keeping their bite.",
      "Add the garlic and ginger for 1 minute.",
      "Splash in the vinegar and salt, toss for 1 minute more and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-tofu-peanut-noodles",
    name: { en: "Tofu and Peanut Rice Noodles", hindi: "टोफ़ू मूंगफली राइस नूडल्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 800 }, // tofu
      { foodId: "usda-172430", grams: 120 }, // peanuts
      { foodId: "usda-169714", grams: 240 }, // rice flour, for the noodles
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171410", grams: 14 }, // peanut oil
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the rice flour with hot water into a dough, roll it thin and cut it into noodles, then boil them for 3 minutes and drain.",
      "Grind the peanuts coarse and stir them with the lemon juice, salt and a splash of warm water into the peanut sauce.",
      "Press the tofu dry, cut it into slabs and sear them in the peanut oil for 6 minutes, until golden.",
      "Stir-fry the carrot and cabbage with the garlic for 3 minutes, keeping their bite.",
      "Toss the noodles and vegetables through the peanut sauce, lay the tofu over and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pwa-lupin-spinach-dal",
    name: { en: "Lupin Split and Spinach Dal", hindi: "ल्यूपिन पालक दाल" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "afcd-F005249", grams: 320 }, // lupin splits, dry
      { foodId: "usda-168462", grams: 240 }, // spinach
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171314", grams: 14 }, // ghee, for the tadka
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the lupin splits for 1 hour, then simmer them in fresh water for about 35 minutes until soft and drain them.",
      "Soften the onion in a dry pan's first film of the ghee for 5 minutes, reserving the rest for the tadka.",
      "Add the tomatoes and turmeric and cook into a masala for 6 minutes.",
      "Stir in the lupin splits with 200 ml of water and simmer for 10 minutes.",
      "Fold in the spinach until it wilts, about 2 minutes.",
      "Heat the remaining ghee with the cumin and garlic until the garlic goldens, pour the tadka over, season with the salt and serve.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-split-pea-yogurt-dal",
    name: { en: "Split Pea Dal with Yogurt", hindi: "मटर दाल दही के साथ" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "afcd-F006543", grams: 400 }, // split peas, dry
      { foodId: "usda-330137", grams: 240 }, // Greek yogurt, stirred through at the end
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170929", grams: 3 }, // mustard seed, for the tadka
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the split peas in 900 ml of water with the turmeric for about 40 minutes, until they collapse into a thick dal.",
      "Soften the onion in the sunflower oil for 5 minutes and stir it into the dal.",
      "Simmer 5 minutes more and season with the salt.",
      "Take the dal off the heat and stir the yogurt through in ribbons, never boiling it again.",
      "Bloom the mustard seed, cumin and garlic in a dry hot pan for 1 minute and pour the tadka over.",
      "Rest 3 minutes and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-ful-with-eggs",
    name: { en: "Ful Medames with Eggs (Broad Beans)", hindi: "फूल मेदामेस अंडे के साथ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F000416", grams: 360 }, // broad beans, dry
      { foodId: "usda-171287", grams: 300 }, // eggs, poached over the beans
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-171413", grams: 28 }, // olive oil
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the broad beans overnight, then simmer them in fresh water for about 60 minutes until they collapse at the edges and drain them, keeping some water.",
      "Soften the onion in half the olive oil for 6 minutes, then add the garlic and cumin for 1 minute.",
      "Add the tomatoes and cook into a sauce for 8 minutes.",
      "Stir in the beans with a ladle of their water and crush a third of them against the pan to thicken the ful.",
      "Make wells in the ful, crack the eggs in, cover and cook 6 minutes, until the whites set and the yolks still run.",
      "Dress with the remaining olive oil and the lemon, season with the salt and serve in the pan.",
    ],
    timeMinutes: 85,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-lentil-shepherds-pie",
    name: { en: "Lentil Shepherd's Pie", hindi: "मसूर शेफर्ड्स पाई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 400 }, // lentils, dry
      { foodId: "usda-2346401", grams: 600 }, // potatoes, for the topping
      { foodId: "usda-328637", grams: 80 }, // cheddar, for the topping
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the lentils in water for 25 minutes until tender and drain them, keeping a ladle of the water.",
      "Boil the potatoes for about 20 minutes until tender, drain and mash them with the salt.",
      "Soften the onion and carrot in the sunflower oil for 6 minutes, then add the garlic and tomatoes and cook for 6 minutes.",
      "Stir in the lentils with their ladle of water and simmer into a thick filling for 8 minutes.",
      "Spoon the filling into a baking dish, cover it with the mash and rough the top with a fork.",
      "Scatter the cheddar over and bake at 200°C for 20 minutes, until the top is golden and crisp at the peaks.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwa-edamame-tofu-bowl",
    name: { en: "Edamame, Tofu and Quinoa Bowl", hindi: "एडामामे टोफ़ू क्विनोआ बाउल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 480 }, // edamame (shelled)
      { foodId: "usda-172448", grams: 400 }, // tofu
      { foodId: "usda-168874", grams: 160 }, // quinoa, dry
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-2346406", grams: 160 }, // cucumber, served raw
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-170150", grams: 12 }, // sesame seeds
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the quinoa and simmer it in 320 ml of water for 15 minutes, then fork it loose.",
      "Press the tofu dry, cut it into cubes and sear them in the sesame oil for 6 minutes, until golden.",
      "Blanch the edamame in boiling water for 3 minutes and drain them.",
      "Stir the vinegar and salt through the warm quinoa.",
      "Bowl the quinoa with the tofu, edamame, grated carrot and cucumber in sections.",
      "Scatter the sesame seeds over and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-anda-paneer-bhurji",
    name: { en: "Anda Paneer Bhurji (Egg and Paneer Scramble)", hindi: "अंडा पनीर भुर्जी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 600 }, // eggs
      { foodId: "cofid-12-495", grams: 200 }, // paneer, crumbled
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-170427", grams: 120 }, // green peppers
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171314", grams: 14 }, // ghee
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion and green peppers in the ghee for 5 minutes.",
      "Add the ginger, chilli and turmeric for 1 minute, then the tomatoes and cook them down for 5 minutes.",
      "Crumble in the paneer and toss it through the masala for 2 minutes.",
      "Pour in the beaten eggs and scramble them gently over low heat for 4 minutes, until just set in soft curds.",
      "Season with the salt and serve at once, bhurji waits for no one.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-urad-dal-yogurt",
    name: { en: "Whole Urad Dal with Yogurt Liaison", hindi: "साबुत उड़द दाल दही के साथ" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174259", grams: 360 }, // black gram (urad dal), dry
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt, for the liaison
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the urad dal overnight, then simmer it in fresh water for about 50 minutes until it collapses into a dark, creamy dal.",
      "Soften the onion in the butter for 6 minutes, then add the ginger, garlic and cumin for 1 minute.",
      "Add the tomatoes and cook into a masala for 6 minutes, then stir it into the dal.",
      "Simmer together for 10 minutes and season with the salt.",
      "Take off the heat and stir the yogurt through in ribbons, the liaison that sets this dal apart from dal makhani, which it never claims to be.",
      "Rest 3 minutes and serve.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-besan-cottage-frittata",
    name: { en: "Besan and Cottage Cheese Frittata", hindi: "बेसन पनीर फ्रिटाटा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174288", grams: 340 }, // besan (chickpea flour)
      { foodId: "usda-328841", grams: 240 }, // cottage cheese
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 160 }, // tomatoes
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the besan with 400 ml of water, the cumin and the salt into a smooth batter and rest it 10 minutes.",
      "Soften the onion in the olive oil in an ovenproof pan for 5 minutes, then wilt the spinach through it.",
      "Fold the cottage cheese and chopped tomatoes into the batter.",
      "Pour the batter over the vegetables in the pan and cook on low heat for 5 minutes, until the edges set.",
      "Bake at 190°C for 15 minutes, until the frittata is set and golden.",
      "Rest 5 minutes, then cut it into wedges and serve.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* ----------------------- Indian and Kerala protein ----------------------- */
  {
    id: "dish-pwa-pepper-chicken-fry",
    name: { en: "Pepper Chicken Fry", hindi: "काली मिर्च चिकन फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646171", grams: 680 }, // chicken thigh
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170931", grams: 8 }, // black pepper, crushed coarse
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-171323", grams: 4 }, // fennel seeds
      { foodId: "usda-172337", grams: 14 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Crush the black pepper and fennel seeds coarse and rub them into the chicken with the salt for 15 minutes.",
      "Soften the sliced onion in the mustard oil for 7 minutes until it edges golden.",
      "Add the ginger and garlic for 1 minute.",
      "Add the chicken and fry it over high heat for 12 minutes, turning the pieces, until they are browned and cooked through with the pepper crust clinging.",
      "Splash in 3 tablespoons of water and scrape the pan's crust into the chicken.",
      "Rest 3 minutes and serve dry and peppery.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-fish-moilee-style",
    name: { en: "Fish Moilee-Style (Tilapia in Coconut Broth)", hindi: "फिश मोइली-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-2684442", grams: 640 }, // tilapia
      { foodId: "usda-170172", grams: 320 }, // coconut milk
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170457", grams: 160 }, // tomatoes
      { foodId: "usda-172336", grams: 12 }, // canola oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the canola oil for 5 minutes, then add the ginger and green chilli for 1 minute.",
      "Add the turmeric and tomatoes and cook for 4 minutes.",
      "Pour in the coconut milk with 150 ml of water and bring it to the gentlest simmer, a moilee never boils hard.",
      "Slide in the tilapia pieces and poach them for 7 minutes, until they flake.",
      "Season with the salt, rest 2 minutes and serve the fish in its golden broth.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-prawn-coconut-curry",
    name: { en: "Prawn and Coconut Curry", hindi: "झींगा नारियल करी" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 560 }, // shrimp (prawns)
      { foodId: "usda-170172", grams: 240 }, // coconut milk
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-167763", grams: 20 }, // tamarind pulp, for the souring
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-170924", grams: 7 }, // curry powder
      { foodId: "usda-172336", grams: 12 }, // canola oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the canola oil for 5 minutes, then add the ginger, garlic and curry powder for 1 minute.",
      "Add the tomatoes and cook into a masala for 6 minutes.",
      "Pour in the coconut milk and tamarind with 100 ml of water and simmer for 5 minutes.",
      "Add the prawns and poach them for 4 minutes, until they curl and turn pink.",
      "Season with the salt, rest 2 minutes and serve.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-kerala-egg-roast",
    name: { en: "Kerala Egg Roast (Mutta Roast)", hindi: "केरल अंडा रोस्ट" },
    category: "main",
    servings: 4,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-171287", grams: 800 }, // eggs, hard-boiled
      { foodId: "usda-790646", grams: 320 }, // onion
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-170922", grams: 4 }, // coriander seed, ground in the method
      { foodId: "usda-172337", grams: 16 }, // mustard oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool them, peel them and score each one twice.",
      "Soften the sliced onion in the mustard oil slowly for 10 minutes, until it turns deep gold.",
      "Add the ginger and garlic for 1 minute, then the chilli powder and ground coriander seed.",
      "Add the tomatoes and cook into a thick roast masala for 7 minutes.",
      "Roll the eggs through the masala over medium heat for 5 minutes, until they take the masala's colour at the scores.",
      "Season with the salt and serve the eggs glossed in their roast.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-lamb-rogan-style",
    name: { en: "Lamb Rogan-Style Curry", hindi: "मटन रोगन-स्टाइल करी" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174370", grams: 640 }, // ground lamb, in coarse chunks
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171319", grams: 5 }, // chilli powder
      { foodId: "usda-170919", grams: 3 }, // cardamom
      { foodId: "usda-171314", grams: 16 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Brown the lamb chunks in the ghee in batches for 8 minutes, until they crust, and lift them out.",
      "Soften the onion in the same pan for 6 minutes, then add the ginger, garlic, chilli powder and cardamom for 1 minute.",
      "Add the tomatoes and cook into a masala for 6 minutes.",
      "Return the lamb with 200 ml of water, cover and simmer gently for 35 minutes, until tender.",
      "Stir the yogurt through off the boil in spoonfuls, so it enriches without splitting.",
      "Season with the salt, rest 5 minutes and serve.",
    ],
    timeMinutes: 65,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-soya-pulao",
    name: { en: "Soybean Pulao", hindi: "सोयाबीन पुलाव" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 280 }, // soybeans, dry
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry
      { foodId: "usda-170419", grams: 120 }, // green peas
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-171314", grams: 14 }, // ghee
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the soybeans overnight, then boil them for about 50 minutes until tender and drain them.",
      "Soften the onion in the ghee with the bay leaf and cinnamon for 5 minutes.",
      "Add the rinsed rice and toast it in the ghee for 2 minutes.",
      "Add the soybeans, peas, salt and 480 ml of water, cover and cook on the lowest heat for 15 minutes.",
      "Rest the pulao, covered, for 10 minutes, then fork it loose.",
      "Serve the pulao fluffy, the soybeans carrying the protein the rice alone never could.",
    ],
    timeMinutes: 80,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-rajma-paneer",
    name: { en: "Rajma Paneer (Kidney Beans with Paneer)", hindi: "राजमा पनीर" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-175193", grams: 280 }, // kidney beans, dry
      { foodId: "cofid-12-495", grams: 200 }, // paneer
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-169231", grams: 16 }, // ginger
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170924", grams: 8 }, // curry powder
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight, then boil them in fresh water for about 50 minutes until tender and drain them, keeping a ladle of the water.",
      "Soften the onion in the sunflower oil for 6 minutes, then add the ginger, garlic and curry powder for 1 minute.",
      "Add the tomatoes and cook into a masala for 6 minutes.",
      "Stir in the beans with their ladle of water and simmer for 12 minutes, crushing a few beans to thicken.",
      "Fold in the paneer cubes and warm them through for 4 minutes.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------- protein breakfasts --------------------------- */
  {
    id: "dish-pwa-huevos-rancheros-style",
    name: { en: "Huevos Rancheros-Style (Eggs on Beans)", hindi: "अंडे राजमा टमाटर के साथ" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 600 }, // eggs, fried
      { foodId: "usda-173734", grams: 200 }, // black beans, dry
      { foodId: "usda-170457", grams: 400 }, // tomatoes, for the ranchero sauce
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170497", grams: 10 }, // green chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the black beans overnight, then boil them for about 40 minutes until tender, drain and crush them roughly with the salt.",
      "Soften the onion, chilli and garlic in half the sunflower oil for 5 minutes, add the tomatoes and cook into a loose ranchero sauce for 8 minutes.",
      "Warm the crushed beans through in a dry pan until they hold a spoon's trail.",
      "Fry the eggs in the remaining oil to your liking, crisp edges welcome.",
      "Plate the beans, lay the eggs over and spoon the warm ranchero sauce around them.",
      "Serve at once, the yolks are the second sauce.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-yogurt-chia-parfait",
    name: { en: "Greek Yogurt, Chia and Seed Parfait", hindi: "दही चिया परफ़े" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 800 }, // Greek yogurt
      { foodId: "afcd-F008209", grams: 60 }, // chia seeds
      { foodId: "usda-2515380", grams: 40 }, // pepitas (pumpkin seeds)
      { foodId: "usda-171688", grams: 240 }, // apple, diced
      { foodId: "usda-169640", grams: 24 }, // honey
      { foodId: "usda-171320", grams: 2 }, // cinnamon
    ],
    method: [
      "Stir the chia seeds through half the yogurt and rest it 15 minutes, until the chia swells and thickens it.",
      "Dice the apple small, keeping its skin for the crunch.",
      "Layer the chia yogurt, the plain yogurt and the diced apple in four glasses.",
      "Drizzle the honey over, scatter the pepitas and dust the cinnamon.",
      "Serve cold, straight from the glasses.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  {
    id: "dish-pwa-cottage-cheese-pancakes",
    name: { en: "Cottage Cheese and Oat Pancakes", hindi: "पनीर ओट पैनकेक" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 480 }, // cottage cheese
      { foodId: "usda-171287", grams: 300 }, // eggs
      { foodId: "usda-2346396", grams: 120 }, // rolled oats
      { foodId: "usda-169640", grams: 16 }, // honey, to serve
      { foodId: "usda-173410", grams: 14 }, // butter, for the pan
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Blitz the oats to a coarse flour, then whisk them with the cottage cheese, eggs and salt into a thick batter and rest it 10 minutes.",
      "Melt a little of the butter in a non-stick pan over medium heat.",
      "Ladle small pancakes and cook them for 3 minutes a side, until golden and set.",
      "Keep the finished pancakes warm while the rest cook.",
      "Serve with the honey drizzled over.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-turkey-egg-cups",
    name: { en: "Turkey and Egg Breakfast Cups", hindi: "टर्की अंडा कप" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 400 }, // ground turkey
      { foodId: "usda-171287", grams: 500 }, // eggs
      { foodId: "usda-168462", grams: 120 }, // spinach
      { foodId: "usda-328637", grams: 40 }, // cheddar, grated over
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the oven to 190°C.",
      "Brown the turkey in a dry pan for 6 minutes, breaking it fine, and season it with the salt and pepper.",
      "Wilt the spinach through the turkey for 1 minute and take the pan off the heat.",
      "Divide the turkey mixture between 8 cups of a muffin tin and crack an egg's worth of the beaten eggs over each.",
      "Scatter the cheddar over and bake for 14 minutes, until the eggs are just set.",
      "Rest 3 minutes, then lift the cups out and serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwa-tofu-scramble",
    name: { en: "Tofu Scramble with Peppers", hindi: "टोफ़ू स्क्रैम्बल" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 1000 }, // tofu
      { foodId: "usda-168410", grams: 80 }, // edamame, for the protein the smaller tofu block leaves
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-172231", grams: 4 }, // turmeric, for the scramble's colour
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Press the tofu dry for 10 minutes, then crumble it into rough curds with your hands.",
      "Soften the onion and peppers in the sesame oil for 5 minutes.",
      "Add the cumin and turmeric for 30 seconds.",
      "Add the tofu, edamame and peas and scramble over medium heat for 7 minutes, letting some curds catch golden edges.",
      "Season with the salt and serve at once.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-besan-paneer-chilla",
    name: { en: "Besan Paneer Chilla", hindi: "बेसन पनीर चीला" },
    category: "breakfast",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 280 }, // besan (chickpea flour)
      { foodId: "cofid-12-495", grams: 240 }, // paneer, grated into the batter
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomatoes
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171025", grams: 20 }, // sunflower oil, for the pan
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Whisk the besan with 380 ml of water, the cumin and the salt into a pouring batter and rest it 10 minutes.",
      "Fold the grated paneer, finely chopped onion, tomato, chilli and coriander leaves through the batter.",
      "Heat a flat pan and brush it with the sunflower oil.",
      "Ladle a chilla, spread it thin and cook for 3 minutes, until the edges crisp.",
      "Flip it and cook 2 minutes more, pressing gently.",
      "Serve the chillas hot, folded, as they come off the pan.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-quark-egg-bake",
    name: { en: "Quark and Egg Breakfast Bake", hindi: "क्वार्क अंडा बेक" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "cnf-6995", grams: 500 }, // quark
      { foodId: "usda-171287", grams: 500 }, // eggs
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170427", grams: 120 }, // green peppers
      { foodId: "usda-173410", grams: 10 }, // butter, for the dish
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Heat the oven to 180°C and butter a baking dish.",
      "Whisk the eggs with the quark, salt and pepper until smooth.",
      "Fold in the chopped tomatoes and peppers.",
      "Pour the mixture into the dish and bake for 25 minutes, until set with a slight wobble at the centre.",
      "Rest 5 minutes, then cut it into squares and serve warm.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pwa-egg-white-frittata",
    name: { en: "Egg White and Mozzarella Frittata", hindi: "अंडा सफ़ेदी फ्रिटाटा" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172183", grams: 600 }, // egg white
      { foodId: "usda-171287", grams: 200 }, // eggs, for body
      { foodId: "usda-329370", grams: 100 }, // mozzarella
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-170457", grams: 160 }, // tomatoes
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Whisk the egg whites and whole eggs with the salt and pepper until evenly combined.",
      "Wilt the spinach in the olive oil in an ovenproof pan for 2 minutes.",
      "Pour the eggs over, dot the mozzarella and tomato pieces through them.",
      "Cook on low heat for 5 minutes, until the edges set.",
      "Bake at 190°C for 10 minutes, until the frittata is set and the mozzarella melts into pools.",
      "Rest 3 minutes, then cut it into wedges and serve.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
];

export const BALANCED_WAVE_A_DISHES: readonly Dish[] = [
  /* ------------------------------ balanced plates ------------------------------ */
  {
    id: "dish-pwa-chicken-rice-verde",
    name: { en: "Chicken and Green Rice Plate", hindi: "चिकन हरा चावल प्लेट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 280 }, // chicken breast
      { foodId: "usda-2512381", grams: 280 }, // white rice, dry
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-168462", grams: 160 }, // spinach, for the green rice
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blitz the spinach with the garlic and 100 ml of water into the green cooking liquor.",
      "Soften the onion in the sunflower oil for 5 minutes, add the rinsed rice and toast it for 2 minutes.",
      "Pour in the green liquor with water to 560 ml in all, cover and cook on the lowest heat for 15 minutes.",
      "Grill the chicken on a heavy ridged griddle for about 6 minutes a side, until cooked through, then slice it.",
      "Fork the peas through the rice and rest it, covered, for 5 minutes.",
      "Serve the green rice with the sliced chicken laid over it.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-turkey-buckwheat",
    name: { en: "Turkey and Buckwheat with Mushrooms", hindi: "टर्की कुट्टू मशरूम" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 260 }, // turkey breast
      { foodId: "usda-2512378", grams: 240 }, // whole buckwheat, dry
      { foodId: "usda-1750347", grams: 240 }, // mushrooms
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Toast the buckwheat in a dry pan for 3 minutes, then simmer it in 480 ml of water for 15 minutes and rest it.",
      "Soften the onion in the butter for 5 minutes, add the mushrooms and fry them for 6 minutes, until they give up their water and brown.",
      "Slice the turkey into strips and sear them in the same pan for 6 minutes, until cooked through.",
      "Fold the buckwheat through the mushrooms and turkey with the salt and pepper.",
      "Rest 3 minutes and serve, the buckwheat's nuttiness is the plate's backbone.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-salmon-barley-plate",
    name: { en: "Salmon and Barley Plate", hindi: "सैल्मन जौ प्लेट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 320 }, // salmon
      { foodId: "usda-170284", grams: 240 }, // barley, dry
      { foodId: "usda-2346400", grams: 320 }, // green beans
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer the barley in plenty of water for about 35 minutes until tender, then drain it.",
      "Steam the green beans over boiling water for 5 minutes, until just tender.",
      "Sear the salmon in the olive oil, skin-side down, for 6 minutes, then turn it for 1 minute more, until it flakes.",
      "Dress the warm barley with the lemon juice and salt.",
      "Serve the salmon over the barley with the green beans alongside.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-pork-cabbage-noodles",
    name: { en: "Pork and Cabbage Noodles", hindi: "पोर्क पत्तागोभी नूडल्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 320 }, // pork loin
      { foodId: "usda-2346407", grams: 480 }, // cabbage
      { foodId: "usda-168936", grams: 200 }, // white flour, for the noodles
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the flour with warm water and a pinch of the salt into a stiff dough, rest it, roll it thin and cut it into noodles, then boil them for 4 minutes and drain.",
      "Slice the pork into thin strips and sear them in the sesame oil over high heat for 5 minutes.",
      "Add the garlic and ginger for 1 minute.",
      "Add the shredded cabbage and carrot and stir-fry for 5 minutes, until the cabbage wilts at the edges.",
      "Toss the noodles through with the remaining salt and a splash of their cooking water.",
      "Serve at once, straight from the pan.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-beef-vegetable-stirfry",
    name: { en: "Beef and Vegetable Stir-Fry with Rice", hindi: "बीफ़ सब्ज़ी चावल स्टर-फ्राई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 320 }, // ground beef, in coarse crumbles
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the rice in 400 ml of water for 12 minutes and rest it, covered.",
      "Brown the beef crumbles in the sesame oil over high heat for 5 minutes.",
      "Add the garlic and ginger for 1 minute.",
      "Add the peppers, green beans and onion and stir-fry for 5 minutes, keeping the vegetables' bite.",
      "Season with the salt and toss once more.",
      "Serve the stir-fry over the rice.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-shrimp-millet-pilaf",
    name: { en: "Shrimp and Millet Pilaf", hindi: "झींगा बाजरा पुलाव" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 320 }, // shrimp
      { foodId: "usda-2512379", grams: 240 }, // millet, dry
      { foodId: "usda-170419", grams: 120 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the sunflower oil for 5 minutes, then add the garlic and turmeric for 30 seconds.",
      "Add the rinsed millet and toast it for 2 minutes.",
      "Pour in 560 ml of water with the salt, cover and cook on the lowest heat for 18 minutes.",
      "Sear the shrimp in a dry hot pan for 3 minutes, until pink.",
      "Fork the peas and shrimp through the millet and rest it, covered, for 5 minutes.",
      "Serve the pilaf fluffy.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-lamb-couscous-plate",
    name: { en: "Lamb and Couscous Plate", hindi: "मटन कूसकूस प्लेट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 320 }, // ground lamb, in coarse chunks
      { foodId: "usda-168933", grams: 240 }, // semolina, for the couscous
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rub the semolina with the olive oil and salt, pour over 300 ml of boiling water, cover and let it swell for 10 minutes, then fork it loose.",
      "Brown the lamb chunks in a dry pan for 7 minutes, until they crust.",
      "Add the onion and carrot and soften for 6 minutes in the lamb fat.",
      "Add the cumin and cinnamon with a splash of water and simmer for 5 minutes.",
      "Serve the lamb and its vegetables over the couscous.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-tofu-vegetable-curry",
    name: { en: "Tofu and Vegetable Curry with Rice", hindi: "टोफ़ू सब्ज़ी करी चावल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 480 }, // tofu
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry
      { foodId: "usda-170172", grams: 200 }, // coconut milk
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170924", grams: 7 }, // curry powder
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the rice in 480 ml of water for 12 minutes and rest it, covered.",
      "Soften the onion in the sunflower oil for 5 minutes, then add the curry powder for 30 seconds.",
      "Add the coconut milk with 100 ml of water and bring it to a simmer.",
      "Add the carrot and green beans and simmer for 6 minutes.",
      "Add the tofu cubes and simmer 4 minutes more, until they drink the curry.",
      "Season with the salt and serve the curry over the rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    /* A lentil mujadara stood here in the first draft; the library
       already carries Mujadara (dish-mujadara, Intl2), and the strict
       name normaliser in the wave test caught the collision on the
       first full run. This broad bean and barley stew replaces it:
       a different dish, not a renamed duplicate. */
    id: "dish-pwa-broad-bean-barley-stew",
    name: { en: "Broad Bean and Barley Vegetable Stew", hindi: "ब्रॉड बीन बार्ली स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F000416", grams: 240 }, // broad beans, dry
      { foodId: "usda-170284", grams: 200 }, // barley, pearled
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-2346407", grams: 240 }, // cabbage
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-171413", grams: 24 }, // olive oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the broad beans overnight, then simmer them in fresh water for 40 minutes until tender and drain them, keeping a mug of the water.",
      "Soften the onion and carrot in the olive oil for 7 minutes, then add the garlic and cumin for 1 minute.",
      "Add the tomatoes and cook them down for 6 minutes, breaking them up with the spoon.",
      "Stir in the barley with 700 ml of water, cover and simmer for 25 minutes.",
      "Add the cabbage and the drained beans with a splash of their water and simmer 10 minutes more, until the barley is tender and the stew is thick.",
      "Season with the salt, rest 5 minutes and serve in deep bowls.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chickpea-quinoa-pilaf",
    name: { en: "Chickpea and Quinoa Pilaf", hindi: "चना क्विनोआ पुलाव" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644282", grams: 240 }, // chickpeas, dry
      { foodId: "usda-168874", grams: 200 }, // quinoa, dry
      { foodId: "usda-2258586", grams: 120 }, // carrots
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the chickpeas overnight, then boil them for about 50 minutes until tender and drain them.",
      "Soften the onion and carrot in the olive oil for 6 minutes, then add the cumin for 30 seconds.",
      "Add the rinsed quinoa and toast it for 2 minutes.",
      "Add the chickpeas, salt and 440 ml of water, cover and cook on the lowest heat for 15 minutes.",
      "Rest the pilaf, covered, for 10 minutes, then fork it loose and serve.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-egg-pea-fried-rice",
    name: { en: "Egg and Pea Fried Rice", hindi: "अंडा मटर फ्राइड राइस" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // eggs
      { foodId: "usda-2512381", grams: 280 }, // white rice, dry
      { foodId: "usda-170419", grams: 160 }, // green peas
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 14 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Simmer the rice in 560 ml of water for 12 minutes, then spread it on a tray to steam dry, fried rice wants dry grains.",
      "Scramble the eggs in half the sesame oil into soft ribbons and lift them out.",
      "Stir-fry the carrot and garlic in the remaining oil for 3 minutes.",
      "Add the rice and peas and fry over high heat for 4 minutes, until the grains toast at the edges.",
      "Fold the egg ribbons back in, season with the salt and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-paneer-vegetable-skewers",
    name: { en: "Paneer and Vegetable Skewers with Flatbread", hindi: "पनीर सब्ज़ी सीख रोटी के साथ" },
    category: "main",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "cofid-12-495", grams: 260 }, // paneer
      { foodId: "usda-168936", grams: 120 }, // white flour, for the flatbreads
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-790646", grams: 160 }, // onion
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt, for the marinade
      { foodId: "usda-170924", grams: 6 }, // curry powder
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Stir the yogurt with the curry powder and salt and coat the paneer cubes, peppers and onion wedges for 20 minutes.",
      "Knead the flour with warm water into a dough, rest it, then roll and dry-toast four flatbreads.",
      "Thread the paneer and vegetables onto skewers in turns.",
      "Grill the skewers on a heavy ridged griddle brushed with the sunflower oil for about 8 minutes, turning them, until the paneer chars at the edges.",
      "Serve the skewers over the flatbreads with the griddle juices spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-mackerel-potato-plate",
    name: { en: "Mackerel and Potato Plate", hindi: "मैकेरल आलू प्लेट" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 360 }, // mackerel
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-168462", grams: 200 }, // spinach
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the potatoes in their skins for about 20 minutes until tender, drain and halve them.",
      "Crisp the potato halves, cut-side down, in the olive oil for 6 minutes.",
      "Grill the mackerel fillets on a heavy ridged griddle for 4 minutes a side, until the skin crisps.",
      "Wilt the spinach in the potato pan for 2 minutes with the salt.",
      "Serve the mackerel over the potatoes and spinach with the lemon squeezed over.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chicken-barley-soup",
    name: { en: "Chicken and Barley Soup", hindi: "चिकन जौ सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 360 }, // chicken thigh
      { foodId: "usda-170284", grams: 200 }, // barley, dry
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-2346407", grams: 160 }, // cabbage
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soften the onion and carrot in the sunflower oil for 6 minutes, then add the garlic for 1 minute.",
      "Add the barley with 1.2 litres of water, cover and simmer for 25 minutes.",
      "Add the chicken pieces and simmer 15 minutes more, until the chicken is cooked through.",
      "Lift the chicken out, shred it and return it to the soup.",
      "Stir in the shredded cabbage and simmer 5 minutes, until it just wilts.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-turkey-meatloaf-style",
    name: { en: "Turkey Meatloaf-Style Bake", hindi: "टर्की मीटलोफ़-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 400 }, // ground turkey
      { foodId: "usda-2346396", grams: 80 }, // rolled oats, as the binder crumb
      { foodId: "usda-171287", grams: 100 }, // egg, as binder
      { foodId: "usda-170457", grams: 200 }, // tomatoes, for the glaze
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Heat the oven to 190°C.",
      "Mix the turkey with the oats, beaten egg, finely chopped onion, salt and pepper and rest the mixture 10 minutes.",
      "Press the mixture into a loaf shape on a baking tray.",
      "Simmer the tomatoes into a thick glaze for 8 minutes and spread half over the loaf.",
      "Bake for 35 minutes, spreading the remaining glaze over halfway, until the loaf is cooked through.",
      "Rest 10 minutes, then slice and serve.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwa-cod-chowder",
    name: { en: "Cod and Potato Chowder", hindi: "कॉड आलू चाउडर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 400 }, // cod
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173410", grams: 14 }, // butter
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the onion in the butter for 5 minutes.",
      "Add the diced potatoes with 400 ml of water, cover and simmer for 12 minutes, until the potatoes are tender.",
      "Pour in the milk and bring the chowder to the gentlest simmer.",
      "Lay the cod pieces over the top, cover and poach for 6 minutes, until the fish flakes.",
      "Break a few potato pieces against the pan to thicken the broth.",
      "Season with the salt and pepper, rest 2 minutes and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-bean-vegetable-soup",
    name: { en: "Bean, Barley and Vegetable Soup", hindi: "राजमा जौ सब्ज़ी सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 240 }, // navy beans, dry
      { foodId: "usda-170284", grams: 120 }, // barley, dry
      { foodId: "usda-2258586", grams: 160 }, // carrots
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-170457", grams: 240 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 7 }, // salt
    ],
    method: [
      "Soak the beans overnight, then boil them in fresh water for about 45 minutes until tender and drain them.",
      "Soften the onion and carrot in the olive oil for 6 minutes, then add the garlic for 1 minute.",
      "Add the barley with 1.1 litres of water, cover and simmer for 25 minutes.",
      "Add the beans, tomatoes and cabbage and simmer 12 minutes more.",
      "Crush a ladle of the beans against the pan to thicken the broth.",
      "Season with the salt, rest 3 minutes and serve.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-tempeh-rice-bowl",
    name: { en: "Tempeh and Rice Bowl", hindi: "टेम्पेह चावल बाउल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 320 }, // tempeh
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-2346406", grams: 160 }, // cucumber, served raw
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173469", grams: 16 }, // cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer the rice in 400 ml of water for 12 minutes and rest it, covered.",
      "Cut the tempeh into slabs and steam them for 10 minutes.",
      "Sear the tempeh in the sesame oil for 6 minutes, until golden on both sides.",
      "Stir the vinegar and salt through the warm rice.",
      "Bowl the rice with the tempeh, grated carrot and cucumber in sections and serve.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-tofu-egg-drop-soup",
    name: { en: "Tofu and Egg Drop Soup", hindi: "टोफ़ू अंडा सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 400 }, // tofu
      { foodId: "usda-171287", grams: 300 }, // eggs, dropped in ribbons
      { foodId: "usda-168462", grams: 120 }, // spinach
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Bring 1.1 litres of water to a simmer with the grated ginger and salt.",
      "Add the tofu, cut into small cubes, and simmer for 4 minutes.",
      "Stir the soup in one direction and pour the beaten eggs in a thin stream, so they set in ribbons.",
      "Fold in the spinach until it wilts, about 1 minute.",
      "Take off the heat, add the sesame oil and pepper and serve at once.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-chicken-pasta-primavera",
    name: { en: "Chicken Pasta Primavera", hindi: "चिकन पास्ता प्रिमावेरा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 250 }, // chicken breast
      { foodId: "usda-168933", grams: 240 }, // semolina, for the fresh pasta
      { foodId: "usda-170419", grams: 120 }, // green peas
      { foodId: "usda-170108", grams: 160 }, // red peppers
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Knead the semolina with warm water into a stiff dough, rest it, roll it thin and cut it into ribbons, then boil them for 3 minutes and drain, keeping a ladle of the water.",
      "Sear the chicken strips in the olive oil for 6 minutes, until cooked through, and lift them out.",
      "Soften the peppers, carrot and garlic in the same pan for 5 minutes, then add the peas for 2 minutes.",
      "Return the chicken and toss everything with the pasta and its ladle of water.",
      "Season with the salt and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-sardine-pasta",
    name: { en: "Sardine and Tomato Pasta", hindi: "सार्डिन टमाटर पास्ता" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175139", grams: 240 }, // sardines (canned, drained)
      { foodId: "usda-168933", grams: 240 }, // semolina, for the fresh pasta
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170932", grams: 2 }, // cayenne pepper
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the semolina with warm water into a stiff dough, rest it, roll it thin and cut it into ribbons, then boil them for 3 minutes and drain, keeping a ladle of the water.",
      "Warm the garlic and cayenne in the olive oil for 1 minute, then add the tomatoes and cook into a sauce for 8 minutes.",
      "Break the sardines into large flakes and fold them through the sauce off the heat.",
      "Toss the pasta through the sauce with its ladle of water.",
      "Squeeze the lemon over, season with the salt and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-kidney-bean-bake",
    name: { en: "Kidney Bean and Potato Bake", hindi: "राजमा आलू बेक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175193", grams: 280 }, // kidney beans, dry
      { foodId: "usda-2346401", grams: 480 }, // potatoes, sliced over the top
      { foodId: "usda-328637", grams: 60 }, // cheddar, grated over
      { foodId: "usda-170457", grams: 320 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the beans overnight, then boil them for about 50 minutes until tender and drain them.",
      "Soften the onion in the sunflower oil for 6 minutes, then add the garlic and tomatoes and cook into a sauce for 8 minutes.",
      "Stir the beans through the sauce with the salt and spoon them into a baking dish.",
      "Slice the potatoes thin and layer them over the beans.",
      "Scatter the cheddar over and bake at 200°C for 30 minutes, until the potatoes are tender and golden.",
      "Rest 5 minutes and serve.",
    ],
    timeMinutes: 95,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pwa-peanut-oat-breakfast-bowl",
    name: { en: "Peanut and Honey Oat Bowl", hindi: "मूंगफली शहद ओट बाउल" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 240 }, // rolled oats
      { foodId: "usda-172430", grams: 100 }, // peanuts, crushed over
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-169640", grams: 16 }, // honey
      { foodId: "usda-171320", grams: 2 }, // cinnamon
    ],
    method: [
      "Simmer the oats in the milk with 300 ml of water for 6 minutes, stirring, until they turn creamy.",
      "Rest the oats, covered, for 2 minutes.",
      "Spoon the oats into bowls and drizzle the honey over.",
      "Scatter the crushed peanuts and dust the cinnamon.",
      "Serve warm.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pwa-amaranth-yogurt-porridge",
    name: { en: "Amaranth and Yogurt Porridge", hindi: "चौलाई दही दलिया" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "afcd-F000061", grams: 200 }, // amaranth, dry
      { foodId: "usda-330137", grams: 480 }, // Greek yogurt, stirred through
      { foodId: "afcd-F008209", grams: 40 }, // chia seeds
      { foodId: "usda-171688", grams: 200 }, // apple, diced
      { foodId: "usda-169640", grams: 16 }, // honey
    ],
    method: [
      "Rinse the amaranth and simmer it in 500 ml of water for 20 minutes, until the grains turn translucent and the porridge thickens.",
      "Rest the porridge, covered, for 5 minutes.",
      "Stir half the yogurt through the warm porridge.",
      "Spoon it into bowls and top with the remaining yogurt, the diced apple and the chia seeds.",
      "Drizzle the honey over and serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
];
